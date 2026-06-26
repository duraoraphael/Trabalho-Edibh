from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.config import settings


class FileStorageService:
    """Store uploaded files in organized directories based on extension."""

    IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
    PDF_EXTENSIONS = {".pdf"}
    DOCUMENT_EXTENSIONS = {
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
        ".csv",
        ".odt",
        ".ods",
    }

    def ensure_structure(self) -> None:
        for folder in (
            settings.upload_root_path,
            settings.upload_documents_path,
            settings.upload_images_path,
            settings.upload_pdf_path,
            settings.upload_reports_path,
            settings.upload_temp_path,
            settings.upload_logs_path,
        ):
            folder.mkdir(parents=True, exist_ok=True)

    def _resolve_target_dir(self, filename: str) -> Path:
        extension = Path(filename).suffix.lower()
        if extension in self.IMAGE_EXTENSIONS:
            return settings.upload_images_path
        if extension in self.PDF_EXTENSIONS:
            return settings.upload_pdf_path
        if extension in self.DOCUMENT_EXTENSIONS:
            return settings.upload_documents_path
        return settings.upload_temp_path

    def save_upload(self, filename: str, content: bytes) -> dict[str, str]:
        self.ensure_structure()
        target_dir = self._resolve_target_dir(filename)
        extension = Path(filename).suffix.lower()
        safe_name = f"{uuid4().hex}{extension}" if extension else uuid4().hex
        absolute_path = target_dir / safe_name
        absolute_path.write_bytes(content)

        relative_path = absolute_path.relative_to(settings.PROJECT_ROOT).as_posix()
        category = target_dir.name
        return {
            "id": safe_name,
            "name": filename,
            "category": category,
            "path": relative_path,
            "webUrl": f"/{relative_path}",
        }
