import os
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import require_role
from app.config import settings
from app.services.audit_service import AuditService

router = APIRouter()
audit = AuditService()

LOG_FILE_PATH = settings.upload_logs_path / "backend.log"


@router.get("/records")
def get_audit_records(user: dict = Depends(require_role("Administrador"))):
    try:
        with open(LOG_FILE_PATH, "r", encoding="utf-8") as handler:
            lines = handler.readlines()
    except FileNotFoundError:
        lines = []

    records = []
    for line in lines[-200:]:
        records.append({"entry": line.strip()})
    audit.log_event(user["email"], "view_audit", {"record_count": str(len(records))})
    return {"records": records}
