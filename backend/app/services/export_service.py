import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import settings
from app.data.storage import PostgresStore, get_store


class ExportService:
    """Export users and reports to JSON files."""

    def __init__(self) -> None:
        self.export_dir = settings.upload_reports_path
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def _get_all_users(self) -> list[dict[str, Any]]:
        store = get_store()
        if not isinstance(store, PostgresStore):
            return []
        with store._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, email, role, is_active, created_at FROM profiles ORDER BY created_at")
                return [dict(row) for row in cur.fetchall()]

    def _get_all_reports(self) -> list[dict[str, Any]]:
        store = get_store()
        if not isinstance(store, PostgresStore):
            return []
        with store._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, instalacao, sistema, equipamento, data, gerencia,
                           situacao_identificada, usuario_criacao, data_criacao,
                           usuario_alteracao, data_alteracao, evidencias
                    FROM reports
                    ORDER BY id DESC
                    """
                )
                return [dict(row) for row in cur.fetchall()]

    def export_all_data_json(self) -> Path:
        payload = {
            "exported_at": datetime.now().isoformat(),
            "users": self._get_all_users(),
            "reports": self._get_all_reports(),
        }
        filename = f"all_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        target = self.export_dir / filename
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
        return target

    def list_exports(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for file in sorted(self.export_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            items.append(
                {
                    "filename": file.name,
                    "size_kb": round(file.stat().st_size / 1024, 2),
                    "created_at": datetime.fromtimestamp(file.stat().st_mtime).isoformat(),
                }
            )
        return items

    def get_export_path(self, filename: str) -> Path:
        return self.export_dir / filename
