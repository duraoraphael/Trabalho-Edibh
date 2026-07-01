import logging
import time
import traceback
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, reports, history, dashboard, audit, sharepoint_config, exports, form_manager
from app.config import settings
from app.services.audit_service import AuditService
from app.data.storage import get_store
from app.services.file_storage_service import FileStorageService


def _configure_logging() -> logging.Logger:
    settings.upload_logs_path.mkdir(parents=True, exist_ok=True)
    log_file = settings.upload_logs_path / "backend.log"

    logger_instance = logging.getLogger("prompt_master")
    logger_instance.setLevel(logging.INFO)
    if not logger_instance.handlers:
        handler = RotatingFileHandler(log_file, maxBytes=5_000_000, backupCount=5, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        logger_instance.addHandler(handler)
    return logger_instance


logger = _configure_logging()

app = FastAPI(
    title=settings.APP_NAME,
    description="Sistema corporativo de gestão de ordens de serviço e relatórios técnicos com SharePoint",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT != "production" else settings.cors_origins_list,
    allow_credentials=False if settings.ENVIRONMENT != "production" else True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=0,
)

app.include_router(auth, prefix="/api/auth", tags=["auth"])
app.include_router(reports, prefix="/api/reports", tags=["reports"])
app.include_router(history, prefix="/api/history", tags=["history"])
app.include_router(dashboard, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(audit, prefix="/api/audit", tags=["audit"])
app.include_router(sharepoint_config, prefix="/api/settings", tags=["settings"])
app.include_router(exports, prefix="/api/exports", tags=["exports"])
app.include_router(form_manager, prefix="/api/admin", tags=["admin"])
# Uploads agora servidos pelo Supabase Storage — static mount removido


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            {
                "event": "request",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "ip": request.client.host if request.client else "unknown",
                "duration_ms": duration_ms,
            }
        )
        return response
    except Exception as exc:  # pragma: no cover
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.exception(
            {
                "event": "request_exception",
                "method": request.method,
                "path": request.url.path,
                "ip": request.client.host if request.client else "unknown",
                "duration_ms": duration_ms,
                "error": str(exc),
                "stack_trace": traceback.format_exc(),
            }
        )
        return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor."})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        {
            "event": "unhandled_exception",
            "path": request.url.path,
            "ip": request.client.host if request.client else "unknown",
            "error": str(exc),
            "stack_trace": traceback.format_exc(),
        }
    )
    return JSONResponse(status_code=500, content={"detail": "Erro interno inesperado."})

@app.on_event("startup")
def startup_event() -> None:
    FileStorageService().ensure_structure()
    get_store().initialize()
    logger.info("Starting Fluxo de equipamentos backend")
    AuditService().log_system_event("startup", "Backend service initialized")

@app.get("/api/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "message": "Fluxo de equipamentos backend is running"}


@app.get("/", tags=["health"])
def root() -> dict:
    return {
        "status": "ok",
        "message": "Fluxo de equipamentos backend is running",
        "docs": "/docs",
        "health": "/api/health",
    }
