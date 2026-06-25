from datetime import date
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str


class UserCreate(BaseModel):
    name: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Optional[str] = None
    is_active: bool = True


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ReportBase(BaseModel):
    instalacao: str = Field(..., title="Instalação")
    sistema: str = Field(..., title="Sistema")
    equipamento: str = Field(..., title="Equipamento")
    data: date = Field(..., title="Data")
    gerencia: str = Field(..., title="Gerência")
    situacao_identificada: str = Field(..., min_length=50, title="Situação Identificada")


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    instalacao: Optional[str]
    sistema: Optional[str]
    equipamento: Optional[str]
    data: Optional[date]
    gerencia: Optional[str]
    situacao_identificada: Optional[str]


class ReportResponse(ReportBase):
    id: int
    usuario_criacao: Optional[str]
    data_criacao: Optional[str]
    usuario_alteracao: Optional[str]
    data_alteracao: Optional[str]
    evidencias: Optional[List[str]] = []


class FileUploadResponse(BaseModel):
    file_id: str
    file_name: str
    web_url: str


class SharePointConfigRequest(BaseModel):
    url_sharepoint: str = Field(..., title="URL SharePoint")
    tenant_id: str = Field(..., title="Tenant ID")
    client_id: str = Field(..., title="Client ID")
    client_secret: Optional[str] = Field(None, title="Client Secret")
    list_name: str = Field(..., title="Nome da Lista")
    library_name: str = Field(..., title="Nome da Biblioteca")
    graph_api_url: str = Field(..., title="URL Graph API")


class AuditRecord(BaseModel):
    user: str
    action: str
    timestamp: str
    ip: Optional[str]
    user_agent: Optional[str]
    details: dict
