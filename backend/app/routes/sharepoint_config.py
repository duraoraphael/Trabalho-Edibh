from fastapi import APIRouter, Depends
from app.schemas import SharePointConfigRequest
from app.services.sharepoint_config_service import SharePointConfigService
from app.services.audit_service import AuditService
from app.auth.dependencies import require_role

router = APIRouter()
service = SharePointConfigService()
audit = AuditService()


@router.get("/sharepoint")
def get_sharepoint_config(user: dict = Depends(require_role("Administrador"))):
    return service.get_masked_config()


@router.put("/sharepoint")
def update_sharepoint_config(payload: SharePointConfigRequest, user: dict = Depends(require_role("Administrador"))):
    result = service.save_config(payload.model_dump(), user["email"])
    audit.log_event(user["email"], "update_sharepoint_config", {"fields": ",".join(payload.model_dump().keys())})
    return result


@router.post("/sharepoint/test")
def test_sharepoint_connection(user: dict = Depends(require_role("Administrador"))):
    result = service.test_connection(user["email"])
    audit.log_event(user["email"], "test_sharepoint_connection", {"status": result["status"]})
    return result


@router.get("/sharepoint/logs")
def get_sharepoint_logs(user: dict = Depends(require_role("Administrador"))):
    return {"logs": service.get_logs()}
