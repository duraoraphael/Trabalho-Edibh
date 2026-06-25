import json
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from app.schemas import ReportCreate, ReportUpdate, ReportResponse, FileUploadResponse
from app.services.report_service import ReportService
from app.services.audit_service import AuditService
from app.auth.dependencies import get_current_user, require_role

router = APIRouter()
service = ReportService()
audit = AuditService()


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
        "usuario_alteracao": fields.get("UsuarioAlteracao", ""),
        "data_alteracao": fields.get("DataAlteracao", ""),
        "evidencias": json.loads(fields.get("Evidencias", "[]")) if fields.get("Evidencias") else [],
    }


@router.post("/", response_model=ReportResponse)
def create_report(payload: ReportCreate, user: dict = Depends(get_current_user)):
    fields = {
        "Instalacao": payload.instalacao,
        "Sistema": payload.sistema,
        "Equipamento": payload.equipamento,
        "Data": payload.data.isoformat(),
        "Gerencia": payload.gerencia,
        "SituacaoIdentificada": payload.situacao_identificada,
    }
    result = service.create_report(fields, user["email"])
    return serialize_report(result)


@router.get("/{item_id}", response_model=ReportResponse)
def get_report(item_id: int, user: dict = Depends(get_current_user)):
    item = service.get_report(item_id)
    return serialize_report(item)


@router.put("/{item_id}", response_model=ReportResponse)
def update_report(item_id: int, payload: ReportUpdate, user: dict = Depends(get_current_user)):
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

    item = service.update_report(item_id, fields, user["email"])
    return serialize_report(item)


@router.delete("/{item_id}")
def delete_report(item_id: int, user: dict = Depends(require_role("Administrador", "Gerente", "Supervisor"))):
    service.delete_report(item_id, user["email"])
    return {"message": "Registro excluído com sucesso."}


@router.post("/{item_id}/evidence", response_model=FileUploadResponse)
def upload_evidence(item_id: int, files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    if len(files) > 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Máximo de 20 arquivos por registro.")

    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"}
    evidence_urls = []
    for upload in files:
        if upload.content_type not in allowed_types:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipo de arquivo inválido: {upload.filename}")
        content = upload.file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Arquivo maior que 10MB: {upload.filename}")
        asset = service.upload_evidence(upload.filename, content, user["email"])
        evidence_urls.append(asset.get("webUrl", ""))

    report = service.get_report(item_id)
    fields = report.get("fields", {})
    existing = []
    if fields.get("Evidencias"):
        try:
            existing = json.loads(fields["Evidencias"])
        except Exception:
            existing = []

    updated_evidences = existing + evidence_urls
    service.update_report(item_id, {"Evidencias": json.dumps(updated_evidences)}, user["email"])
    return {"file_id": asset.get("id", ""), "file_name": upload.filename, "web_url": asset.get("webUrl", "")}


@router.get("/{item_id}/pdf")
def generate_report_pdf(item_id: int, user: dict = Depends(get_current_user)):
    from app.services.pdf_service import PDFService

    report = service.get_report(item_id)
    fields = report.get("fields", {})
    evidence_urls = []
    if fields.get("Evidencias"):
        try:
            evidence_urls = json.loads(fields["Evidencias"])
        except Exception:
            evidence_urls = []

    pdf_content = PDFService().generate_report_pdf(fields, evidence_urls)
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{item_id}.pdf"},
    )
