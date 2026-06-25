from datetime import datetime, timezone
import logging
from fastapi import Request

logger = logging.getLogger("prompt_master.audit")


class AuditService:
    def log_event(self, user: str, action: str, details: dict[str, str], request: Request | None = None) -> None:
        event = {
            "user": user,
            "action": action,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if request is not None:
            event.update({
                "ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown"),
                "path": request.url.path,
            })
        logger.info(event)

    def log_system_event(self, action: str, details: str) -> None:
        logger.info({"system_action": action, "details": details, "timestamp": datetime.now(timezone.utc).isoformat()})
