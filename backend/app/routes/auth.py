from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.services.user_service import UserService
from app.auth.token import create_access_token, create_refresh_token, verify_token
from app.auth.dependencies import require_role, get_current_user
from app.services.audit_service import AuditService

router = APIRouter()
user_service = UserService()
audit = AuditService()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = user_service.authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    access_token = create_access_token(user["email"])
    refresh_token = create_refresh_token(user["email"])
    audit.log_event(user["email"], "login", {"status": "success"})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token: str):
    try:
        payload = verify_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido") from exc
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de atualização inválido")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    access_token = create_access_token(email)
    refresh_token = create_refresh_token(email)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/users", response_model=UserResponse)
def create_user(payload: UserCreate, user: dict = Depends(require_role("Administrador"))):
    existing_user = user_service.get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuário já existe")

    result = user_service.create_user({
        "name": payload.name,
        "email": payload.email,
        "password": payload.password,
        "role": payload.role,
        "is_active": payload.is_active,
    })
    audit.log_event(user["email"], "create_user", {"created_user": payload.email})
    return {
        "id": result.get("id", 0),
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "is_active": payload.is_active,
    }


@router.post("/register", response_model=UserResponse)
def register_user(payload: UserCreate):
    existing_user = user_service.get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuário já existe")

    result = user_service.create_user({
        "name": payload.name,
        "email": payload.email,
        "password": payload.password,
        "role": payload.role or "Operador",
        "is_active": payload.is_active,
    })
    audit.log_event(payload.email, "register_user", {"created_user": payload.email})
    return {
        "id": result.get("id", 0),
        "name": payload.name,
        "email": payload.email,
        "role": payload.role or "Operador",
        "is_active": payload.is_active,
    }


@router.post("/password/forgot")
def forgot_password(email: str):
    user = user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    audit.log_event(email, "forgot_password", {"email": email})
    return {"message": "Instruções de recuperação foram enviadas para o e-mail cadastrado."}


@router.post("/password/reset")
def reset_password(email: str, new_password: str, token: str):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Redefinição de senha ainda não implementada.",
    )


@router.post("/logout")
def logout(user: dict = Depends(get_current_user)):
    audit.log_event(user["email"], "logout", {"status": "success"})
    return {"message": "Logout realizado com sucesso."}
