import os
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import require_role
from app.services.audit_service import AuditService

router = APIRouter()
audit = AuditService()

LOG_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "audit.log")


@router.get("/records")
def get_audit_records(user: dict = Depends(require_role("Administrador"))):
    try:
        with open(os.path.abspath(LOG_FILE_PATH), "r", encoding="utf-8") as handler:
            lines = handler.readlines()
    except FileNotFoundError:
        lines = []

    records = []
    for line in lines[-200:]:
        records.append({"entry": line.strip()})
    audit.log_event(user["email"], "view_audit", {"record_count": str(len(records))})
    return {"records": records}
