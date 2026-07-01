from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "Fluxo de equipamentos"
    ENVIRONMENT: str = "development"
    JWT_SECRET: str = "dev-secret"
    DATABASE_URL: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SHAREPOINT_SITE_ID: Optional[str] = None
    SHAREPOINT_ONE_DRIVE_ID: Optional[str] = None
    SHAREPOINT_LIST_NAME: str = "RelatoriosTecnicos"
    SHAREPOINT_USER_LIST_NAME: str = "Usuarios"
    SHAREPOINT_LIBRARY_ID: Optional[str] = None
    GRAPH_TENANT_ID: Optional[str] = None
    GRAPH_CLIENT_ID: Optional[str] = None
    GRAPH_CLIENT_SECRET: Optional[str] = None
    GRAPH_SCOPE: str = "https://graph.microsoft.com/.default"
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_TENANT_ID: str = "common"
    FRONTEND_URL: AnyHttpUrl = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"
    PASSWORD_SALT_ROUNDS: int = 12
    RATE_LIMIT_PER_MINUTE: int = 120
    CONFIG_ENCRYPTION_KEY: Optional[str] = None
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_TLS: bool = True
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM: Optional[str] = None
    UPLOAD_ROOT: str = "uploads"
    UPLOAD_DOCUMENTS_DIR: str = "documentos"
    UPLOAD_IMAGES_DIR: str = "imagens"
    UPLOAD_PDF_DIR: str = "pdf"
    UPLOAD_REPORTS_DIR: str = "relatorios"
    UPLOAD_TEMP_DIR: str = "temp"
    UPLOAD_LOGS_DIR: str = "logs"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def __init__(self, **data):
        super().__init__(**data)
        if self.ENVIRONMENT == "production" and self.JWT_SECRET == "dev-secret":
            raise ValueError("JWT_SECRET deve ser definido via variável de ambiente em produção")
        if self.ENVIRONMENT == "production" and not self.CONFIG_ENCRYPTION_KEY:
            raise ValueError("CONFIG_ENCRYPTION_KEY deve ser definida em produção")
        if self.ENVIRONMENT == "production" and not (self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY):
            raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem ser definidos em produção")

    @property
    def PROJECT_ROOT(self) -> Path:
        return Path(__file__).resolve().parents[2]

    @property
    def upload_root_path(self) -> Path:
        return self.PROJECT_ROOT / self.UPLOAD_ROOT

    @property
    def upload_documents_path(self) -> Path:
        return self.upload_root_path / self.UPLOAD_DOCUMENTS_DIR

    @property
    def upload_images_path(self) -> Path:
        return self.upload_root_path / self.UPLOAD_IMAGES_DIR

    @property
    def upload_pdf_path(self) -> Path:
        return self.upload_root_path / self.UPLOAD_PDF_DIR

    @property
    def upload_reports_path(self) -> Path:
        return self.upload_root_path / self.UPLOAD_REPORTS_DIR

    @property
    def upload_temp_path(self) -> Path:
        return self.upload_root_path / self.UPLOAD_TEMP_DIR

    @property
    def upload_logs_path(self) -> Path:
        return self.upload_root_path / self.UPLOAD_LOGS_DIR

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        frontend_origin = str(self.FRONTEND_URL).strip().rstrip("/")
        if frontend_origin and frontend_origin not in origins:
            origins.append(frontend_origin)
        # Em desenvolvimento, aceita qualquer porta de localhost automaticamente
        if self.ENVIRONMENT != "production":
            for port in range(3000, 3010):
                for host in ("http://localhost", "http://127.0.0.1"):
                    o = f"{host}:{port}"
                    if o not in origins:
                        origins.append(o)
        return origins


settings = Settings()
