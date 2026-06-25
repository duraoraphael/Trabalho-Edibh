from datetime import date
from typing import List
from fastapi import APIRouter, Depends
from app.schemas import ReportResponse
from app.services.report_service import ReportService
from app.auth.dependencies import get_current_user

router = APIRouter()
service = ReportService()


def serialize_report(item: dict) -> dict:
    fields = item.get("fields", {})
    return {
        "id": item.get("id"),
        "instalacao": fields.get("Instalacao", ""),
        "sistema": fields.get("Sistema", ""),
        "equipamento": fields.get("Equipamento", ""),
        "data": fields.get("Data", ""),
        "gerencia": fields.get("Gerencia", ""),
        "situacao_identificada": fields.get("SituacaoIdentificada", ""),
        "usuario_criacao": fields.get("UsuarioCriacao", ""),
        "data_criacao": fields.get("DataCriacao", ""),
        "evidencias": fields.get("Evidencias", "[]"),
    }


@router.get("/", response_model=List[ReportResponse])
def list_history(
    gerencia: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    user: dict = Depends(get_current_user),
):
    filters = {}
    if gerencia:
        filters["$filter"] = f"fields/Gerencia eq '{gerencia}'"
    if start_date and end_date:
        date_filter = f"fields/Data ge '{start_date.isoformat()}' and fields/Data le '{end_date.isoformat()}'"
        filters["$filter"] = (filters.get("$filter", "") + f" and {date_filter}").strip()
    if search:
        search_filter = f"contains(fields/Instalacao,'{search}') or contains(fields/Sistema,'{search}') or contains(fields/Equipamento,'{search}')"
        filters["$filter"] = (filters.get("$filter", "") + f" and {search_filter}").strip()

    raw = service.list_reports(filters)
    items = raw.get("value", [])
    ordered = sorted(items, key=lambda item: item.get("id", 0), reverse=True)
    return [serialize_report(item) for item in ordered]
