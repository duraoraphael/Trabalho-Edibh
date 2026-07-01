from __future__ import annotations

import mimetypes
from pathlib import Path
from uuid import uuid4

from app.supabase_client import get_supabase_admin

BUCKET = "uploads"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
PDF_EXTENSIONS = {".pdf"}


def _ensure_bucket() -> None:
    client = get_supabase_admin()
    existing = [b.name for b in client.storage.list_buckets()]
    if BUCKET not in existing:
        client.storage.create_bucket(BUCKET, options={"public": True})


def _folder(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        return "imagens"
    if ext in PDF_EXTENSIONS:
        return "pdf"
    return "documentos"


class FileStorageService:
    def ensure_structure(self) -> None:
        _ensure_bucket()

    def save_upload(self, filename: str, content: bytes) -> dict:
        _ensure_bucket()
        ext = Path(filename).suffix.lower()
        safe_name = f"{_folder(filename)}/{uuid4().hex}{ext}"
        mime, _ = mimetypes.guess_type(filename)
        mime = mime or "application/octet-stream"

        client = get_supabase_admin()
        client.storage.from_(BUCKET).upload(
            path=safe_name,
            file=content,
            file_options={"content-type": mime, "upsert": "true"},
        )

        public_url = client.storage.from_(BUCKET).get_public_url(safe_name)

        return {
            "id": safe_name,
            "name": filename,
            "category": _folder(filename),
            "path": safe_name,
            "webUrl": public_url,
        }
