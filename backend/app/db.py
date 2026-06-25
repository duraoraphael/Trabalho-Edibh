from typing import Any
import httpx
from app.config import settings


class SharePointClient:
    def __init__(self) -> None:
        self.token = None
        self.base_url = "https://graph.microsoft.com/v1.0"

    def _get_headers(self) -> dict[str, str]:
        if not self.token:
            self.authenticate()
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }

    def authenticate(self) -> None:
        url = f"https://login.microsoftonline.com/{settings.GRAPH_TENANT_ID}/oauth2/v2.0/token"
        payload = {
            "client_id": settings.GRAPH_CLIENT_ID,
            "client_secret": settings.GRAPH_CLIENT_SECRET,
            "scope": settings.GRAPH_SCOPE,
            "grant_type": "client_credentials",
        }
        response = httpx.post(url, data=payload, timeout=30)
        response.raise_for_status()
        self.token = response.json().get("access_token")

    def get(self, path: str, params: dict[str, Any] | None = None) -> httpx.Response:
        return httpx.get(f"{self.base_url}{path}", headers=self._get_headers(), params=params, timeout=30)

    def post(self, path: str, json: dict[str, Any] | None = None, data: Any = None, headers: dict[str, str] | None = None) -> httpx.Response:
        merged_headers = self._get_headers()
        if headers:
            merged_headers.update(headers)
        return httpx.post(f"{self.base_url}{path}", headers=merged_headers, json=json, data=data, timeout=60)

    def patch(self, path: str, json: dict[str, Any]) -> httpx.Response:
        return httpx.patch(f"{self.base_url}{path}", headers=self._get_headers(), json=json, timeout=30)

    def put(self, path: str, data: Any, headers: dict[str, str] | None = None) -> httpx.Response:
        merged_headers = self._get_headers()
        if headers:
            merged_headers.update(headers)
        return httpx.put(f"{self.base_url}{path}", headers=merged_headers, content=data, timeout=120)

    def delete(self, path: str) -> httpx.Response:
        return httpx.delete(f"{self.base_url}{path}", headers=self._get_headers(), timeout=30)


sharepoint_client = SharePointClient()
