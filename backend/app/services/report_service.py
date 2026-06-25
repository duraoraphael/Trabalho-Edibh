from datetime import datetime
from typing import Any
from app.services.sharepoint_service import SharePointService
from app.services.audit_service import AuditService
from app.config import settings


class ReportService:
    def __init__(self) -> None:
        self.sharepoint = SharePointService()
        self.audit = AuditService()

    def create_report(self, fields: dict[str, Any], user: str) -> dict[str, Any]:
        fields.update({
            "UsuarioCriacao": user,
            "DataCriacao": datetime.utcnow().isoformat(),
        })
        report = self.sharepoint.create_report(fields)
        self.audit.log_event(user, "create_report", {"report_id": str(report.get("id"))})
        return report

    def update_report(self, item_id: int, fields: dict[str, Any], user: str) -> dict[str, Any]:
        fields.update({
            "UsuarioAlteracao": user,
            "DataAlteracao": datetime.utcnow().isoformat(),
        })
        report = self.sharepoint.update_report(item_id, fields)
        self.audit.log_event(user, "update_report", {"report_id": str(item_id)})
        return report

    def delete_report(self, item_id: int, user: str) -> None:
        self.sharepoint.delete_report(item_id)
        self.audit.log_event(user, "delete_report", {"report_id": str(item_id)})

    def get_report(self, item_id: int) -> dict[str, Any]:
        return self.sharepoint.get_report(item_id)

    def list_reports(self, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.sharepoint.list_reports(filters)

    def upload_evidence(self, file_name: str, content: bytes, user: str) -> dict[str, Any]:
        asset = self.sharepoint.upload_file(file_name, content)
        self.audit.log_event(user, "upload_evidence", {"file_name": file_name, "item_id": asset.get("id")})
        return asset
