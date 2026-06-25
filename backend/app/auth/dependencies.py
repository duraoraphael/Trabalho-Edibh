from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Annotated, Optional
from app.auth.token import verify_token
from app.services.user_service import UserService

security = HTTPBearer(auto_error=False)


def get_current_user(credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = credentials.credentials
    try:
        payload = verify_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado") from exc
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = UserService().get_user_by_email(username)
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
