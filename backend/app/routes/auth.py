from fastapi import APIRouter, Depends, HTTPException, Request, status
import secrets

from app.auth.dependencies import get_current_user, require_role
from app.auth.microsoft import MicrosoftAuthError, MicrosoftTokenVerifier, extract_user_profile
from app.config import settings
from app.supabase_client import get_supabase_admin, get_supabase_anon
from app.schemas import (
    LoginRequest,
    MicrosoftLoginRequest,
    ProfileResponse,
    ProfileUpdateRequest,
    TokenResponse,
    UserAdminResponse,
    UserCreate,
    UserResponse,
    UserUpdateRequest,
)
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter()
user_service = UserService()
audit = AuditService()
ms_verifier = MicrosoftTokenVerifier()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request):
    user = user_service.authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    audit.log_event(user["email"], "login", {"status": "success"}, request)
    return {
        "access_token": user["access_token"],
        "refresh_token": user["refresh_token"],
        "token_type": "bearer",
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token: str):
    try:
        session = get_supabase_anon().auth.refresh_session(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido") from exc
    if not session or not session.session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    return {
        "access_token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "token_type": "bearer",
    }


@router.post("/microsoft/login", response_model=TokenResponse)
def login_with_microsoft(payload: MicrosoftLoginRequest, request: Request):
    if not settings.MICROSOFT_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Login Microsoft não configurado.")

    try:
        claims = ms_verifier.verify_id_token(payload.id_token)
        profile = extract_user_profile(claims)
    except MicrosoftAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user = user_service.get_user_by_email(profile["email"])
    ms_password = secrets.token_urlsafe(24)
    if not user:
        user = user_service.create_user(
            {
                "name": profile["name"],
                "email": profile["email"],
                "password": ms_password,
                "role": "Operador",
                "is_active": True,
            }
        )
    else:
        get_supabase_admin().auth.admin.update_user_by_id(user["id"], {"password": ms_password})

    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    session = get_supabase_anon().auth.sign_in_with_password({"email": user["email"], "password": ms_password})
    audit.log_event(user["email"], "login_microsoft", {"status": "success"}, request)
    return {
        "access_token": session.session.access_token,
        "refresh_token": session.session.refresh_token,
        "token_type": "bearer",
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
    }


@router.post("/users", response_model=UserResponse)
def create_user(payload: UserCreate, request: Request, user: dict = Depends(require_role("Administrador"))):
    existing_user = user_service.get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuário já existe")

    try:
        result = user_service.create_user(
            {
                "name": payload.name,
                "email": payload.email,
                "password": payload.password,
                "role": payload.role,
                "is_active": payload.is_active,
            }
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    audit.log_event(user["email"], "create_user", {"created_user": payload.email}, request)
    return {
        "id": result.get("id", ""),
        "name": payload.name,
        "email": payload.email,
        "role": result.get("role", "Operador"),
        "is_active": payload.is_active,
    }


@router.get("/users", response_model=list[UserAdminResponse])
def list_users(
    role: str | None = None,
    search: str | None = None,
    is_active: bool | None = None,
    user: dict = Depends(require_role("Administrador")),
):
    _ = user
    items = user_service.list_users({"role": role, "search": search, "is_active": is_active})
    return [
        {
            "id": item.get("id", ""),
            "name": item.get("name", ""),
            "email": item.get("email", ""),
            "role": item.get("role", "Operador"),
            "is_active": bool(item.get("is_active", True)),
            "telefone": item.get("telefone"),
            "foto_url": item.get("foto_url"),
            "last_access": item.get("last_access"),
            "created_at": item.get("created_at"),
        }
        for item in items
    ]


@router.put("/users/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    request: Request,
    current_user: dict = Depends(require_role("Administrador")),
):
    target = user_service.get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    result = user_service.update_user(user_id, updates)
    audit.log_event(current_user["email"], "update_user", {"target_user": str(user_id), "changes": str(list(updates.keys()))}, request)
    return {
        "id": result.get("id", ""),
        "name": result.get("name", ""),
        "email": result.get("email", ""),
        "role": result.get("role", "Operador"),
        "is_active": bool(result.get("is_active", True)),
        "telefone": result.get("telefone"),
        "foto_url": result.get("foto_url"),
        "last_access": result.get("last_access"),
    }


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    new_password: str,
    request: Request,
    current_user: dict = Depends(require_role("Administrador")),
):
    target = user_service.get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user_service.update_user(user_id, {"password": new_password})
    audit.log_event(current_user["email"], "reset_user_password", {"target_user": str(user_id)}, request)
    return {"message": "Senha redefinida com sucesso."}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, request: Request, current_user: dict = Depends(require_role("Administrador"))):
    target = user_service.get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    user_service.delete_user(user_id)
    audit.log_event(current_user["email"], "delete_user", {"target_user": str(user_id)}, request)
    return {"message": "Usuário removido."}


@router.post("/register", response_model=UserResponse)
def register_user(payload: UserCreate, request: Request):
    existing_user = user_service.get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuário já existe")

    try:
        result = user_service.create_user(
            {
                "name": payload.name,
                "email": payload.email,
                "password": payload.password,
                "role": "Operador",
                "is_active": payload.is_active,
            }
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception as exc:
        # Conta pode ter sido criada no Supabase Auth mesmo com erro posterior
        # Retorna sucesso com dados mínimos para não confundir o usuário
        audit.log_event(payload.email, "register_user", {"created_user": payload.email, "warn": str(exc)}, request)
        return {
            "id": "pending",
            "name": payload.name,
            "email": payload.email,
            "role": "Operador",
            "is_active": payload.is_active,
        }

    audit.log_event(payload.email, "register_user", {"created_user": payload.email}, request)
    return {
        "id": str(result.get("id", "")),
        "name": payload.name,
        "email": payload.email,
        "role": str(result.get("role", "Operador")),
        "is_active": bool(payload.is_active),
    }


@router.post("/password/forgot")
def forgot_password(email: str, request: Request):
    user = user_service.get_user_by_email(email)
    if not user:
        # Retorna sucesso mesmo sem usuário para não revelar quais e-mails existem
        return {"message": "Se o e-mail estiver cadastrado, você receberá as instruções."}

    try:
        from app.config import settings
        redirect_url = f"{str(settings.FRONTEND_URL).rstrip('/')}/reset-password"
        get_supabase_admin().auth.admin.generate_link({
            "type": "recovery",
            "email": email,
            "options": {"redirect_to": redirect_url},
        })
    except Exception:
        pass  # Falha silenciosa — não expor detalhes

    audit.log_event(email, "forgot_password", {"email": email}, request)
    return {"message": "Se o e-mail estiver cadastrado, você receberá as instruções."}


@router.post("/password/reset")
def reset_password(email: str, new_password: str, token: str):
    _ = (email, new_password, token)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Redefinição de senha ainda não implementada.",
    )


@router.get("/me", response_model=ProfileResponse)
def get_profile(user: dict = Depends(get_current_user)):
    current = user_service.get_user_by_email(user["email"])
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return {
        "id": current.get("id", ""),
        "name": current.get("name", ""),
        "email": current.get("email", ""),
        "role": current.get("role", "Operador"),
        "telefone": current.get("telefone"),
        "foto_url": current.get("foto_url"),
        "last_access": current.get("last_access"),
    }


@router.put("/me", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdateRequest, request: Request, user: dict = Depends(get_current_user)):
    current = user_service.get_user_by_email(user["email"])
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None and k not in {"current_password", "new_password"}}
    if payload.new_password:
        if not payload.current_password or not user_service.authenticate_user(user["email"], payload.current_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual inválida")
        updates["password"] = payload.new_password

    updated = user_service.update_user(current["id"], updates)
    audit.log_event(user["email"], "update_profile", {"changes": str(list(updates.keys()))}, request)
    return {
        "id": updated.get("id", ""),
        "name": updated.get("name", ""),
        "email": updated.get("email", ""),
        "role": updated.get("role", "Operador"),
        "telefone": updated.get("telefone"),
        "foto_url": updated.get("foto_url"),
        "last_access": updated.get("last_access"),
    }


@router.post("/logout")
def logout(request: Request, user: dict = Depends(get_current_user)):
    audit.log_event(user["email"], "logout", {"status": "success"}, request)
    return {"message": "Logout realizado com sucesso."}
