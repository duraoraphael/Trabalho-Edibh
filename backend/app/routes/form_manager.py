from fastapi import APIRouter, Depends, Request

from app.auth.dependencies import require_role
from app.schemas import FormConfigPayload
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter()
user_service = UserService()
audit = AuditService()


@router.get("/form-fields")
def get_form_fields(user: dict = Depends(require_role("Administrador", "Gerente", "Supervisor", "Operador", "Visualizador"))):
    _ = user
    return user_service.get_form_config()


@router.put("/form-fields")
def save_form_fields(payload: FormConfigPayload, request: Request, user: dict = Depends(require_role("Administrador"))):
    saved = user_service.save_form_config(payload.model_dump())
    audit.log_event(user["email"], "update_form_fields", {"fields": str(len(saved.get('fields', [])))}, request)
    return saved
