import json
import csv
from io import StringIO
from datetime import datetime, timezone
from datetime import date
from urllib.parse import quote
from typing import List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from app.schemas import ReportResponse
from app.services.report_service import ReportService
from app.auth.dependencies import get_current_user
from app.services.pdf_service import PDFService

router = APIRouter()
service = ReportService()


def _load_evidence_entries(raw_value: str | list | None) -> list[dict]:
    if raw_value in (None, ""):
        return []
    parsed = raw_value
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value) if raw_value else []
        except json.JSONDecodeError:
            return []
    if not isinstance(parsed, list):
        return []

    normalized: list[dict] = []
    for item in parsed:
        if isinstance(item, str):
            name = item.rsplit("/", 1)[-1] if "/" in item else item
            normalized.append(
                {
                    "id": name,
                    "name": name,
                    "web_url": item,
                    "size_bytes": None,
                    "mime_type": "application/octet-stream",
                }
            )
            continue
        if isinstance(item, dict):
            web_url = item.get("web_url") or item.get("webUrl") or ""
            name = item.get("name") or (web_url.rsplit("/", 1)[-1] if web_url else "arquivo")
            normalized.append(
                {
                    "id": item.get("id") or name,
                    "name": name,
                    "web_url": web_url,
                    "size_bytes": item.get("size_bytes"),
                    "mime_type": item.get("mime_type") or item.get("mimeType"),
                }
            )
    return normalized


def serialize_report(item: dict) -> dict:
    fields = item.get("fields", {})
    evidencias = _load_evidence_entries(fields.get("Evidencias", "[]"))

    return {
        "id": item.get("id"),
        "instalacao": fields.get("Instalacao", ""),
        "sistema": fields.get("Sistema", ""),
        "equipamento": fields.get("Equipamento", ""),
        "data": fields.get("Data", ""),
        "gerencia": fields.get("Gerencia", ""),
        "situacao_identificada": fields.get("SituacaoIdentificada", ""),
        "status": fields.get("Status", "Em análise"),
        "custom_fields": json.loads(fields.get("CamposCustomizados", "{}") or "{}") if isinstance(fields.get("CamposCustomizados", "{}"), str) else (fields.get("CamposCustomizados") or {}),
        "usuario_criacao": fields.get("UsuarioCriacao", ""),
        "data_criacao": fields.get("DataCriacao", ""),
        "usuario_alteracao": fields.get("UsuarioAlteracao", ""),
        "data_alteracao": fields.get("DataAlteracao", ""),
        "evidencias": evidencias,
    }


def _get_filtered_history(
    gerencia: str | None,
    start_date: date | None,
    end_date: date | None,
    search: str | None,
    sort_by: str,
    sort_dir: str,
) -> list[dict]:
    filters: dict[str, str] = {}
    if gerencia:
        filters["gerencia"] = gerencia
    if start_date:
        filters["start_date"] = start_date.isoformat()
    if end_date:
        filters["end_date"] = end_date.isoformat()
    if search:
        filters["search"] = search

    raw = service.list_reports(filters)
    items = [serialize_report(item) for item in raw.get("value", [])]

    allowed_sort_fields = {"data", "instalacao", "gerencia", "equipamento", "usuario_criacao", "data_criacao"}
    normalized_sort_by = sort_by if sort_by in allowed_sort_fields else "data"
    reverse = sort_dir != "asc"
    return sorted(items, key=lambda item: str(item.get(normalized_sort_by, "")).lower(), reverse=reverse)


@router.get("/", response_model=List[ReportResponse])
def list_history(
    gerencia: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort_by: str = Query(default="data"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    user: dict = Depends(get_current_user),
):
    return _get_filtered_history(gerencia, start_date, end_date, search, sort_by, sort_dir)


@router.get("/export/csv")
def export_history_csv(
    gerencia: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort_by: str = Query(default="data"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    user: dict = Depends(get_current_user),
):
    items = _get_filtered_history(gerencia, start_date, end_date, search, sort_by, sort_dir)

    output = StringIO(newline="")
    writer = csv.writer(output, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
    writer.writerow(
        [
            "Instalação",
            "Sistema",
            "Equipamento",
            "Gerência",
            "Data",
            "Situação Identificada",
            "Status",
            "Usuário",
            "Data de Criação",
            "Data de Alteração",
        ]
    )

    for item in items:
        writer.writerow(
            [
                item.get("instalacao", ""),
                item.get("sistema", ""),
                item.get("equipamento", ""),
                item.get("gerencia", ""),
                item.get("data", ""),
                item.get("situacao_identificada", ""),
                item.get("status", ""),
                item.get("usuario_criacao", ""),
                item.get("data_criacao", ""),
                item.get("data_alteracao", ""),
            ]
        )

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = quote(f"historico_{timestamp}.csv")
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )


@router.get("/export/pdf")
def export_history_pdf(
    gerencia: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort_by: str = Query(default="data"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    user: dict = Depends(get_current_user),
):
    items = _get_filtered_history(gerencia, start_date, end_date, search, sort_by, sort_dir)
    generated_at = datetime.now(timezone.utc).isoformat()
    pdf_content = PDFService().generate_history_pdf(items, user.get("email", ""), generated_at)
    filename = quote(f"historico_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf")
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )
