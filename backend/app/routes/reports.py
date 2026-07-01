import json
from pathlib import Path
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from app.schemas import ReportCreate, ReportUpdate, ReportResponse, FileUploadBatchResponse, ReportStatusUpdate, EmailSendRequest
from app.services.report_service import ReportService
from app.services.audit_service import AuditService
from app.auth.dependencies import get_current_user, require_role

router = APIRouter()
service = ReportService()
audit = AuditService()

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES_PER_REPORT = 20


def _load_evidence_entries(raw_value: str | list | None) -> list[dict]:
    if raw_value in (None, ""):
        return []
    parsed = raw_value
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
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
        "motivo_edicao": fields.get("MotivoEdicao", ""),
        "historico_alteracoes": json.loads(fields.get("HistoricoAlteracoes", "[]") or "[]"),
        "evidencias": evidencias,
    }


@router.post("/", response_model=ReportResponse)
def create_report(payload: ReportCreate, request: Request, user: dict = Depends(get_current_user)):
    fields = {
        "Instalacao": payload.instalacao,
        "Sistema": payload.sistema,
        "Equipamento": payload.equipamento,
        "Data": payload.data.isoformat(),
        "Gerencia": payload.gerencia,
        "SituacaoIdentificada": payload.situacao_identificada,
        "Status": payload.status,
        "CamposCustomizados": payload.custom_fields or {},
    }
    result = service.create_report(fields, user["email"])
    audit.log_event(user["email"], "create_report", {"report_id": str(result.get("id", ""))}, request)
    return serialize_report(result)


@router.get("/{item_id}", response_model=ReportResponse)
def get_report(item_id: int, user: dict = Depends(get_current_user)):
    item = service.get_report(item_id)
    return serialize_report(item)


VALID_STATUSES = {"Em análise", "Aprovado", "Reprovado", "Pendente"}


def _build_historico_entry(user_email: str, status_anterior: str, novo_status: str, descricao: str, campos_alterados: list[str]) -> dict:
    from datetime import datetime, timezone
    return {
        "usuario": user_email,
        "data_hora": datetime.now(timezone.utc).isoformat(),
        "status_anterior": status_anterior,
        "novo_status": novo_status,
        "descricao": descricao,
        "campos_alterados": campos_alterados,
    }


@router.put("/{item_id}", response_model=ReportResponse)
def update_report(item_id: int, payload: ReportUpdate, request: Request, user: dict = Depends(require_role("Administrador"))):
    existing = service.get_report(item_id)
    status_anterior = existing.get("fields", {}).get("Status", "Em análise")

    data = payload.model_dump()
    descricao = str(data.pop("descricao_alteracao") or "").strip()
    motivo_raw = str(data.pop("motivo_edicao") or "").strip()
    descricao_final = descricao or motivo_raw
    if not descricao_final:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Descrição da alteração é obrigatória.")

    fields: dict = {}
    campos_alterados: list[str] = []
    mapping = {
        "instalacao": "Instalacao", "sistema": "Sistema", "equipamento": "Equipamento",
        "gerencia": "Gerencia", "situacao_identificada": "SituacaoIdentificada",
    }
    for py_key, sp_key in mapping.items():
        if data.get(py_key) is not None:
            fields[sp_key] = data[py_key]
            campos_alterados.append(py_key)
    if data.get("data") is not None:
        v = data["data"]
        fields["Data"] = v.isoformat() if isinstance(v, date) else str(v)
        campos_alterados.append("data")
    if data.get("status") is not None:
        if data["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status inválido.")
        fields["Status"] = data["status"]
        campos_alterados.append("status")
    if data.get("custom_fields") is not None:
        fields["CamposCustomizados"] = data["custom_fields"]
        campos_alterados.append("custom_fields")

    fields["MotivoEdicao"] = descricao_final
    fields["HistoricoEntrada"] = _build_historico_entry(
        user["email"], status_anterior, fields.get("Status", status_anterior), descricao_final, campos_alterados
    )

    item = service.update_report(item_id, fields, user["email"])
    audit.log_event(user["email"], "update_report", {
        "report_id": str(item_id),
        "campos": campos_alterados,
        "descricao": descricao_final,
        "status_anterior": status_anterior,
        "novo_status": fields.get("Status", status_anterior),
    }, request)
    return serialize_report(item)


@router.patch("/{item_id}/status", response_model=ReportResponse)
def update_report_status(item_id: int, payload: ReportStatusUpdate, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") not in {"Administrador", "Gerente", "Supervisor"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão para alterar status.")
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status inválido. Use: {', '.join(VALID_STATUSES)}")

    existing = service.get_report(item_id)
    status_anterior = existing.get("fields", {}).get("Status", "Em análise")
    fields = {
        "Status": payload.status,
        "MotivoEdicao": f"[Status] {status_anterior} → {payload.status} | {payload.descricao}",
        "HistoricoEntrada": _build_historico_entry(
            user["email"], status_anterior, payload.status, payload.descricao, ["status"]
        ),
    }
    result = service.update_report(item_id, fields, user["email"])
    audit.log_event(user["email"], "update_status", {
        "report_id": str(item_id), "status_anterior": status_anterior,
        "novo_status": payload.status, "descricao": payload.descricao,
    }, request)
    return serialize_report(result)


@router.delete("/{item_id}")
def delete_report(item_id: int, request: Request, user: dict = Depends(require_role("Administrador"))):
    service.delete_report(item_id, user["email"])
    audit.log_event(user["email"], "delete_report", {"report_id": str(item_id)}, request)
    return {"message": "Registro excluído com sucesso."}


@router.post("/{item_id}/evidence", response_model=FileUploadBatchResponse)
def upload_evidence(item_id: int, files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    report = service.get_report(item_id)
    fields = report.get("fields", {})
    existing = _load_evidence_entries(fields.get("Evidencias", "[]"))

    if len(existing) + len(files) > MAX_FILES_PER_REPORT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Máximo de 20 arquivos por registro.",
        )

    uploaded_entries = []
    for upload in files:
        extension = Path(upload.filename or "").suffix.lower()
        content_type = (upload.content_type or "").lower()
        if extension not in ALLOWED_EXTENSIONS or content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de arquivo inválido: {upload.filename}",
            )

        content = upload.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo maior que 10MB: {upload.filename}",
            )

        try:
            asset = service.upload_evidence(upload.filename, content, user["email"])
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

        uploaded_entries.append(
            {
                "id": asset.get("id", ""),
                "name": asset.get("name", upload.filename or "arquivo"),
                "web_url": asset.get("webUrl", ""),
                "size_bytes": len(content),
                "mime_type": content_type,
            }
        )

    updated_evidences = existing + uploaded_entries
    service.update_report(item_id, {"Evidencias": json.dumps(updated_evidences, ensure_ascii=False)}, user["email"])

    return {"uploaded": uploaded_entries, "total": len(updated_evidences)}


@router.post("/{item_id}/send-email")
def send_report_email(
    item_id: int,
    payload: EmailSendRequest,
    request: Request,
    user: dict = Depends(require_role("Administrador")),
):
    import tempfile
    import httpx
    from pathlib import Path as FilePath
    from app.services.email_service import send_email
    from app.config import settings

    if not settings.RESEND_API_KEY and not settings.SMTP_HOST:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Envio de e-mail não configurado. Defina RESEND_API_KEY ou SMTP_HOST no .env.",
        )

    # Download evidence files from Supabase Storage (public URLs) into temp files
    attachments: list[FilePath] = []
    tmp_files: list[FilePath] = []
    if payload.attach_evidencias:
        report = service.get_report(item_id)
        evidencias = _load_evidence_entries(report.get("fields", {}).get("Evidencias", "[]"))
        for ev in evidencias:
            web_url: str = ev.get("web_url") or ""
            if not web_url:
                continue
            try:
                resp = httpx.get(web_url, timeout=15, follow_redirects=True)
                resp.raise_for_status()
                ext = FilePath(ev.get("name") or web_url).suffix or ".bin"
                tmp = FilePath(tempfile.mktemp(suffix=ext))
                tmp.write_bytes(resp.content)
                tmp.rename(tmp.parent / f"{ev.get('name', tmp.name)}")
                named = tmp.parent / f"{ev.get('name', tmp.name)}"
                attachments.append(named)
                tmp_files.append(named)
            except Exception:
                continue

    try:
        send_email(
            to=payload.to,
            subject=payload.subject,
            body_html=payload.body,
            cc=payload.cc or [],
            attachments=attachments,
            sender_name=payload.sender_name or user.get("name") or user["email"],
            sender_email=payload.sender_email or user["email"],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao enviar e-mail: {str(exc)}",
        ) from exc
    finally:
        for f in tmp_files:
            try: f.unlink(missing_ok=True)
            except Exception: pass

    all_recipients = payload.to + (payload.cc or [])
    audit.log_event(user["email"], "send_email", {
        "report_id": str(item_id),
        "to": payload.to,
        "cc": payload.cc,
        "subject": payload.subject,
        "anexos": len(attachments),
    }, request)
    return {"message": f"E-mail enviado para {', '.join(all_recipients)} com sucesso."}


@router.get("/{item_id}/pdf")
def generate_report_pdf(item_id: int, user: dict = Depends(get_current_user)):
    from app.services.pdf_service import PDFService

    report = service.get_report(item_id)
    fields = report.get("fields", {})
    evidence_entries = _load_evidence_entries(fields.get("Evidencias", "[]"))

    pdf_content = PDFService().generate_report_pdf(fields, evidence_entries)
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{item_id}.pdf"},
    )
