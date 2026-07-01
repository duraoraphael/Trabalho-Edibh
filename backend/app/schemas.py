from datetime import date
from pydantic import BaseModel, EmailStr, Field
from typing import Any, List, Optional


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
    id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MicrosoftLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=20)


class ReportBase(BaseModel):
    instalacao: str = Field(..., title="Instalação")
    sistema: str = Field(..., title="Sistema")
    equipamento: str = Field(..., title="Equipamento")
    data: date = Field(..., title="Data")
    gerencia: str = Field(..., title="Gerência")
    situacao_identificada: str = Field(..., title="Situação Identificada")
    status: str = Field(default="Em análise", title="Status")
    custom_fields: Optional[dict[str, Any]] = Field(default_factory=dict)


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    instalacao: Optional[str] = None
    sistema: Optional[str] = None
    equipamento: Optional[str] = None
    data: Optional[date] = None
    gerencia: Optional[str] = None
    situacao_identificada: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[dict[str, Any]] = None
    motivo_edicao: Optional[str] = None
    descricao_alteracao: Optional[str] = None


class ReportStatusUpdate(BaseModel):
    status: str
    descricao: str = Field(..., min_length=5, title="Descrição da atualização")


class EvidenceItem(BaseModel):
    id: str
    name: str
    web_url: str
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None


class ReportResponse(ReportBase):
    id: int
    usuario_criacao: Optional[str]
    data_criacao: Optional[str]
    usuario_alteracao: Optional[str]
    data_alteracao: Optional[str]
    motivo_edicao: Optional[str] = None
    descricao_status: Optional[str] = None
    historico_alteracoes: Optional[List[Any]] = []
    evidencias: Optional[List[EvidenceItem]] = []


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    telefone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8)


class UserAdminResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool
    telefone: Optional[str] = None
    foto_url: Optional[str] = None
    last_access: Optional[str] = None
    created_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    telefone: Optional[str] = None
    foto_url: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=8)


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    telefone: Optional[str] = None
    foto_url: Optional[str] = None
    last_access: Optional[str] = None


class FormFieldOption(BaseModel):
    label: str
    value: str


class FormFieldConfig(BaseModel):
    id: str
    label: str
    type: str
    placeholder: Optional[str] = ""
    required: bool = False
    readonly: bool = False
    order: int = 0
    options: List[FormFieldOption] = Field(default_factory=list)
    validations: dict[str, Any] = Field(default_factory=dict)
    visible_roles: List[str] = Field(default_factory=list)
    editable_roles: List[str] = Field(default_factory=list)


class FormConfigPayload(BaseModel):
    fields: List[FormFieldConfig]


class EmailSendRequest(BaseModel):
    to: List[str] = Field(..., min_length=1)
    cc: List[str] = Field(default_factory=list)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    attach_evidencias: bool = False
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None


class FileUploadResponse(BaseModel):
    file_id: str
    file_name: str
    web_url: str


class FileUploadBatchResponse(BaseModel):
    uploaded: List[EvidenceItem]
    total: int


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
