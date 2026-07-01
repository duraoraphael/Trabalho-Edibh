from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Annotated, Optional
from app.services.user_service import UserService
from app.supabase_client import get_supabase_admin

security = HTTPBearer(auto_error=False)


def get_current_user(credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = credentials.credentials
    try:
        auth_user = get_supabase_admin().auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado") from exc
    email = auth_user.user.email if auth_user and auth_user.user else None
    if not email:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = UserService().get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Usuário inativo")
    return user


def require_role(*allowed_roles: str):
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permissão negada")
        return user
    return role_checker
