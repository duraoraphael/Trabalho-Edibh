import json
from pathlib import Path
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from app.schemas import ReportCreate, ReportUpdate, ReportResponse, FileUploadBatchResponse
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


@router.put("/{item_id}", response_model=ReportResponse)
def update_report(item_id: int, payload: ReportUpdate, request: Request, user: dict = Depends(get_current_user)):
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "data" in fields and isinstance(fields["data"], date):
        fields["Data"] = fields.pop("data").isoformat()
    if "instalacao" in fields:
        fields["Instalacao"] = fields.pop("instalacao")
    if "sistema" in fields:
        fields["Sistema"] = fields.pop("sistema")
    if "equipamento" in fields:
        fields["Equipamento"] = fields.pop("equipamento")
    if "gerencia" in fields:
        fields["Gerencia"] = fields.pop("gerencia")
    if "situacao_identificada" in fields:
        fields["SituacaoIdentificada"] = fields.pop("situacao_identificada")
    if "status" in fields:
        if user.get("role") not in {"Administrador", "Gerente", "Supervisor"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão para alterar status.")
        fields["Status"] = fields.pop("status")
    if "custom_fields" in fields:
        fields["CamposCustomizados"] = fields.pop("custom_fields")
    if "motivo_edicao" in fields:
        motivo = str(fields.pop("motivo_edicao") or "").strip()
        if not motivo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Motivo da edição é obrigatório.")
        fields["MotivoEdicao"] = motivo

    if any(key in fields for key in ("Instalacao", "Sistema", "Equipamento", "Data", "Gerencia", "SituacaoIdentificada", "Status", "CamposCustomizados")):
        if "MotivoEdicao" not in fields:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Motivo da edição é obrigatório.")

    item = service.update_report(item_id, fields, user["email"])
    changes = {k: str(v)[:120] for k, v in fields.items() if k not in {"CamposCustomizados"}}
    if "CamposCustomizados" in fields:
        changes["CamposCustomizados"] = "updated"
    audit.log_event(user["email"], "update_report", {"report_id": str(item_id), "changes": json.dumps(changes, ensure_ascii=False)}, request)
    return serialize_report(item)


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
