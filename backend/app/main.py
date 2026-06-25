from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, reports, history, dashboard, audit, sharepoint_config
from app.config import settings
from app.services.audit_service import AuditService
import logging
from logging.handlers import RotatingFileHandler
import os

log_file_path = os.path.join(os.path.dirname(__file__), "../audit.log")
handler = RotatingFileHandler(log_file_path, maxBytes=5_000_000, backupCount=2, encoding="utf-8")
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))

logger = logging.getLogger("prompt_master")
logger.setLevel(logging.INFO)
logger.addHandler(handler)

app = FastAPI(
    title=settings.APP_NAME,
    description="Sistema corporativo de gestão de ordens de serviço e relatórios técnicos com SharePoint",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth, prefix="/api/auth", tags=["auth"])
app.include_router(reports, prefix="/api/reports", tags=["reports"])
app.include_router(history, prefix="/api/history", tags=["history"])
app.include_router(dashboard, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(audit, prefix="/api/audit", tags=["audit"])
app.include_router(sharepoint_config, prefix="/api/settings", tags=["settings"])

@app.on_event("startup")
def startup_event() -> None:
    logger.info("Starting Prompt Master backend")
    AuditService().log_system_event("startup", "Backend service initialized")

@app.get("/api/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "message": "Prompt Master backend is running"}
