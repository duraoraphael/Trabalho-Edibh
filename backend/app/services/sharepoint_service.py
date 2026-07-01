from typing import Any

from app.config import settings
from app.db import sharepoint_client


class SharePointService:
    def upload_file(self, file_name: str, content: bytes) -> dict[str, Any]:
        if not (settings.SHAREPOINT_SITE_ID and settings.SHAREPOINT_LIBRARY_ID):
            raise ValueError("SharePoint não está configurado para armazenamento de evidências.")

        safe_name = file_name.replace(" ", "_")
        upload_path = f"/sites/{settings.SHAREPOINT_SITE_ID}/drives/{settings.SHAREPOINT_LIBRARY_ID}/root:/{safe_name}:/content"
        response = sharepoint_client.put(
            upload_path,
            data=content,
            headers={"Content-Type": "application/octet-stream"},
        )
        response.raise_for_status()
        payload = response.json()
        return {
            "id": payload.get("id", safe_name),
            "webUrl": payload.get("webUrl", ""),
            "name": payload.get("name", safe_name),
        }

    def get_file_metadata(self, item_id: str) -> dict[str, Any]:
        if not (settings.SHAREPOINT_SITE_ID and settings.SHAREPOINT_LIBRARY_ID):
            raise ValueError("SharePoint não está configurado para consultar arquivos.")

        response = sharepoint_client.get(f"/sites/{settings.SHAREPOINT_SITE_ID}/drives/{settings.SHAREPOINT_LIBRARY_ID}/items/{item_id}")
        response.raise_for_status()
        payload = response.json()
        return {
            "id": payload.get("id", item_id),
            "name": payload.get("name", item_id),
            "webUrl": payload.get("webUrl", ""),
        }
