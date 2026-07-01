# Prompt Master — Documentação do Projeto

Este projeto é um sistema corporativo de gestão de ordens de serviço e relatórios técnicos, com backend em Python/FastAPI e frontend em React/TypeScript.

## O que estamos usando

### Backend
- Python 3.12+ (recomendado)
- FastAPI para a API REST
- Uvicorn como servidor ASGI
- Pydantic / pydantic-settings para validação de configuração e dados
- python-jose para geração e validação de JWT
- passlib para hash de senhas
- reportlab para gerar PDFs
- python-dotenv para carregar variáveis de ambiente
- requests para chamadas HTTP internas ou testes
- python-multipart para suporte a upload de arquivos

### Frontend
- React 18
- TypeScript
- React Router Dom v6 para navegação de rotas
- Axios para requisições HTTP
- React Scripts para desenvolvimento e build

### Arquitetura
- `backend/`
  - `app/main.py` — ponto de entrada do backend FastAPI
  - `app/config.py` — gerenciamento de configuração via `BaseSettings`
  - `app/routes/` — rotas da API organizadas por domínio
  - `app/services/` — lógica de negócio e integração com armazenamento local / SharePoint
  - `app/schemas.py` — modelos de dados Pydantic
  - `app/auth/` — autenticação, geração de token e dependências de segurança
  - `app/data/` — armazenamento local JSON para testes rápidos
  - `app/audit.log` — registro de auditoria de eventos

- `frontend/`
  - `src/App.tsx` — configuração das rotas do aplicativo
  - `src/pages/` — páginas principais: formulário de relatório, dashboard, histórico e executivo
  - `src/components/` — componentes reutilizáveis como o `Footer`
  - `src/styles.css` — estilos globais do frontend
  - `public/Imagens/` — logos e arquivos estáticos

## Principais funcionalidades implementadas

### Backend
- Autenticação JWT com refresh token
- Cadastro e login de usuários
- Criação de relatórios técnicos
- Histórico de relatórios
- Resumo de dashboard gerencial e executivo
- Registro de auditoria de ações
- Geração de PDF para relatórios
- Fallback local via JSON para desenvolvimento sem SharePoint

### Frontend
- Formulário de relatório como homepage
- Navegação entre telas: Dashboard, Histórico, Executivo
- Footer com logos exibidas em layout responsivo
- Estilo responsivo para mobile, tablet e desktop
- Uso de rotas protegidas / navegação condicional

## Como executar

### Backend
1. Abra o terminal em `backend/`
2. Ative o ambiente virtual:
```powershell
cd "c:\Users\durao\Documents\Trabalho edibhh\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
3. Instale as dependências:
```powershell
pip install -r requirements.txt
```
4. Configure variáveis de ambiente em `.env`
5. Execute:
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
1. Abra o terminal em `frontend/`
2. Instale dependências:
```powershell
cd "c:\Users\durao\Documents\Trabalho edibhh\frontend"
npm install
```
3. Execute:
```powershell
npm start
```

## Rotas importantes do backend

- `GET /api/health` — health check
- `POST /api/auth/register` — registrar usuário
- `POST /api/auth/login` — login
- `POST /api/auth/refresh` — renovar token
- `POST /api/reports` — criar relatório
- `GET /api/reports` — listar relatórios
- `GET /api/reports/{id}` — obter relatório por ID
- `PUT /api/reports/{id}` — atualizar relatório
- `DELETE /api/reports/{id}` — excluir relatório
- `GET /api/dashboard/summary` — dados do dashboard gerencial
- `GET /api/dashboard/executive` — dados do dashboard executivo
- `GET /api/history` — histórico de relatórios
- `GET /api/audit/records` — registros de auditoria

## Como o projeto está organizado

### Backend
- `app/main.py` — cria o app FastAPI, configura CORS e registra routers
- `app/config.py` — define `Settings` com variáveis de ambiente e valores padrão
- `app/routes/` — separa endpoints por domínio de negócio
- `app/services/` — contém lógica de relatórios, usuários, PDF e integração local/SharePoint
- `app/schemas.py` — valida e modela entradas e saídas da API
- `app/auth/` — gerencia autenticação, payloads e dependências de segurança
- `app/data/local_storage.py` — leitura e escrita em JSON local

### Frontend
- `src/App.tsx` — rota principal e inclusão do `Footer`
- `src/pages/ReportFormPage.tsx` — formulário de cadastro de relatório
- `src/pages/DashboardPage.tsx` — dashboard gerencial
- `src/pages/HistoryPage.tsx` — tela de histórico
- `src/pages/ExecutiveDashboardPage.tsx` — dashboard executivo
- `src/components/Footer.tsx` — footer com imagens
- `src/styles.css` — responsividade e estilo global

## Observações importantes

- O projeto usa `pydantic-settings` no backend para configuração, então a variável `BaseSettings` está migrada para esse pacote.
- A persistência local em `app/data/` permite testar sem precisar do SharePoint configurado.
- O frontend usa `react-router-dom` para navegação de páginas sem recarga.
- O footer foi implementado com logos estáticas em `public/Imagens/`.

## Melhorias futuras

- Adicionar testes automatizados (backend e frontend)
- Finalizar integração completa com SharePoint / Microsoft Graph
- Implementar upload de evidências com pré-visualização no frontend
- Adicionar controle de autorização por perfil de usuário
- Melhorar UX de formulários e mensagens de erro

---

Essa documentação resume o que estamos usando e como o projeto está organizado hoje.