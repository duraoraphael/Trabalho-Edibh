from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl


class Settings(BaseSettings):
    APP_NAME: str = "Fluxo de equipamentos"
    ENVIRONMENT: str = "development"
    JWT_SECRET: str = "dev-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SHAREPOINT_SITE_ID: Optional[str] = None
    SHAREPOINT_ONE_DRIVE_ID: Optional[str] = None
    SHAREPOINT_LIST_NAME: str = "RelatoriosTecnicos"
    SHAREPOINT_USER_LIST_NAME: str = "Usuarios"
    SHAREPOINT_LIBRARY_ID: Optional[str] = None
    GRAPH_TENANT_ID: Optional[str] = None
    GRAPH_CLIENT_ID: Optional[str] = None
    GRAPH_CLIENT_SECRET: Optional[str] = None
    GRAPH_SCOPE: str = "https://graph.microsoft.com/.default"
    FRONTEND_URL: AnyHttpUrl = "http://localhost:5173"
    PASSWORD_SALT_ROUNDS: int = 12
    RATE_LIMIT_PER_MINUTE: int = 120
    CONFIG_ENCRYPTION_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **data):
        super().__init__(**data)
        if self.ENVIRONMENT == "production" and self.JWT_SECRET == "dev-secret":
            raise ValueError("JWT_SECRET deve ser definido via variável de ambiente em produção")
        if self.ENVIRONMENT == "production" and not self.CONFIG_ENCRYPTION_KEY:
            raise ValueError("CONFIG_ENCRYPTION_KEY deve ser definida em produção")


settings = Settings()
