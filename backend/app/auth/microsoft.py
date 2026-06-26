from __future__ import annotations

from typing import Any

import httpx
from jose import JWTError, jwt

from app.config import settings


class MicrosoftAuthError(Exception):
    pass


class MicrosoftTokenVerifier:
    def __init__(self) -> None:
        self._jwks_cache: list[dict[str, Any]] = []

    @property
    def _jwks_url(self) -> str:
        tenant = settings.MICROSOFT_TENANT_ID or "common"
        return f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"

    def _get_jwks(self) -> list[dict[str, Any]]:
        if self._jwks_cache:
            return self._jwks_cache
        response = httpx.get(self._jwks_url, timeout=15)
        response.raise_for_status()
        self._jwks_cache = response.json().get("keys", [])
        return self._jwks_cache

    def verify_id_token(self, id_token: str) -> dict[str, Any]:
        if not settings.MICROSOFT_CLIENT_ID:
            raise MicrosoftAuthError("MICROSOFT_CLIENT_ID não configurado no backend.")

        try:
            header = jwt.get_unverified_header(id_token)
        except JWTError as exc:
            raise MicrosoftAuthError("Token Microsoft inválido.") from exc

        kid = header.get("kid")
        if not kid:
            raise MicrosoftAuthError("Token Microsoft sem chave identificadora (kid).")

        keys = self._get_jwks()
        signing_key = next((key for key in keys if key.get("kid") == kid), None)
        if not signing_key:
            self._jwks_cache = []
            keys = self._get_jwks()
            signing_key = next((key for key in keys if key.get("kid") == kid), None)
        if not signing_key:
            raise MicrosoftAuthError("Não foi possível validar a assinatura do token Microsoft.")

        tenant = settings.MICROSOFT_TENANT_ID or "common"
        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "audience": settings.MICROSOFT_CLIENT_ID,
            "options": {"verify_iss": tenant not in {"common", "organizations", "consumers"}},
        }
        if decode_kwargs["options"]["verify_iss"]:
            decode_kwargs["issuer"] = f"https://login.microsoftonline.com/{tenant}/v2.0"

        try:
            return jwt.decode(id_token, signing_key, **decode_kwargs)
        except JWTError as exc:
            raise MicrosoftAuthError("Falha ao validar token Microsoft.") from exc


def extract_user_profile(payload: dict[str, Any]) -> dict[str, str]:
    email = (
        payload.get("preferred_username")
        or payload.get("email")
        or payload.get("upn")
        or ""
    ).strip().lower()
    if not email:
        raise MicrosoftAuthError("Token Microsoft sem e-mail válido.")

    name = (payload.get("name") or email.split("@")[0]).strip()
    return {"email": email, "name": name}
