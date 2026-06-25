from typing import Any
from app.data.local_storage import read_json, write_json, REPORTS_PATH


class SharePointService:
    def list_reports(self, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        return {"value": reports}

    def create_report(self, fields: dict[str, Any]) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        next_id = max((item.get("id", 0) for item in reports), default=0) + 1

        new_report = {"id": next_id, "fields": fields}
        reports.append(new_report)
        write_json(REPORTS_PATH, reports)
        return new_report

    def update_report(self, item_id: int, fields: dict[str, Any]) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        for report in reports:
            if report.get("id") == item_id:
                report["fields"].update(fields)
                write_json(REPORTS_PATH, reports)
                return report
        raise ValueError("Registro não encontrado")

    def delete_report(self, item_id: int) -> None:
        reports = read_json(REPORTS_PATH)
        reports = [report for report in reports if report.get("id") != item_id]
        write_json(REPORTS_PATH, reports)

    def get_report(self, item_id: int) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        for report in reports:
            if report.get("id") == item_id:
                return report
        raise ValueError("Registro não encontrado")

    def upload_file(self, file_name: str, content: bytes) -> dict[str, Any]:
        return {"id": file_name, "webUrl": f"file://{file_name}", "name": file_name}

    def get_file_metadata(self, item_id: str) -> dict[str, Any]:
        return {"id": item_id, "name": item_id}
