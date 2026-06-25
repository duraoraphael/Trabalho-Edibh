================================================================================
GUIA COMPLETO DE DEPLOYMENT - PROMPT MASTER
================================================================================

Seu projeto está pronto para a internet! Escolha uma das opções abaixo:

================================================================================
OPÇÃO 1: RAILWAY.APP (Recomendado - Gratuito com $5/mês crédito)
================================================================================

Railway é perfeito para projetos pequenos/médios. Suporta Docker nativamente.

PASSO 1: Criar conta
- Acesse: https://railway.app
- Faça login com GitHub/Google
- Crie um novo projeto

PASSO 2: Conectar repositório
- Clique em "New Project"
- Selecione "Deploy from GitHub"
- Autorize sua conta GitHub
- Selecione o repositório

PASSO 3: Configurar backend
- Clique em "Add Service"
- Selecione "Docker"
- Configure as variáveis de ambiente:
  JWT_SECRET=sua-chave-secreta-aqui
  ENVIRONMENT=production
  FRONTEND_URL=https://seu-app.railway.app

PASSO 4: Configurar frontend
- Adicione outro serviço Docker
- Configure:
  REACT_APP_API_URL=https://seu-backend.up.railway.app/api

CUSTO: Gratuito (até $5/mês de crédito)
TEMPO: 5-10 minutos
URL: seu-app.railway.app

================================================================================
OPÇÃO 2: RENDER.COM (Gratuito, melhor performance)
================================================================================

Render é mais rápido e suporta deploys automáticos.

PASSO 1: Criar conta
- Acesse: https://render.com
- Faça login com GitHub

PASSO 2: Deployar backend
- Clique em "New +"
- Selecione "Web Service"
- Conecte seu repositório GitHub
- Configurações:
  - Name: prompt-master-backend
  - Environment: Docker
  - Branch: main
  - Build Command: (deixe em branco)
  - Start Command: (deixe em branco)

PASSO 3: Configurar variáveis de ambiente
- Acesse "Environment"
- Adicione:
  JWT_SECRET=sua-chave-secreta-aqui
  ENVIRONMENT=production
  FRONTEND_URL=https://seu-frontend.onrender.com

PASSO 4: Deployar frontend
- Novo Web Service
- Repository: seu repositório
- Build Command: npm install && npm run build
- Start Command: npm start
- Environment: Node
- Variáveis:
  REACT_APP_API_URL=https://seu-backend.onrender.com/api

CUSTO: Gratuito (com sleep de 15 min sem uso)
TEMPO: 10-15 minutos
URL: seu-app.onrender.com

================================================================================
OPÇÃO 3: VERCEL (FRONTEND) + RAILWAY (BACKEND)
================================================================================

Melhor performance: React no Vercel (CDN global) + Backend no Railway.

FRONTEND NO VERCEL:
1. Acesse: https://vercel.com
2. Clique em "New Project"
3. Selecione seu repositório
4. Selecione pasta: ./frontend
5. Variáveis de ambiente:
   REACT_APP_API_URL=https://seu-backend.railway.app/api
6. Deploy

BACKEND NO RAILWAY:
(Segue passos da OPÇÃO 1 acima)

CUSTO: Gratuito
TEMPO: 10 minutos
URL: seu-app.vercel.app (frontend)

================================================================================
OPÇÃO 4: DOCKER LOCAL COM DOCKER COMPOSE
================================================================================

Execute tudo localmente em containers:

PASSO 1: Instalar Docker Desktop
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Inicie o Docker Desktop

PASSO 2: Executar
Abra PowerShell na pasta do projeto e execute:

cd c:\Users\durao\Documents\Trabalho edibhh
docker-compose up

PASSO 3: Acessar
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Docs: http://localhost:8000/docs

Parar:
docker-compose down

CUSTO: Gratuito (seu computador)
TEMPO: 2 minutos
URL: localhost:3000

================================================================================
PASSO A PASSO RECOMENDADO PARA DEPLOY RÁPIDO
================================================================================

Se você quer começar AGORA com mínimo esforço:

1. OPÇÃO MAIS RÁPIDA (5 minutos):
   - Use Docker local (Opção 4)
   - Teste tudo funcionando
   - Depois suba para Railway (Opção 1)

2. PARA PRODUÇÃO (15 minutos):
   - Frontend: Vercel (Opção 3)
   - Backend: Railway (Opção 1)
   - Resultado: app rápido globalmente

3. SE USAR RAILWAY PARA TUDO:
   - Tudo em um lugar
   - Gerenciamento simplificado
   - $5/mês suficiente para começar

================================================================================
CHECKLIST PRÉ-DEPLOYMENT
================================================================================

BACKEND:
☐ JWT_SECRET não é "dev-secret"
☐ ENVIRONMENT = "production"
☐ CORS configurado para domain correto
☐ Banco de dados configurado (JSON ou real)

FRONTEND:
☐ API_URL aponta para backend correto
☐ Environment production configurado
☐ Build test: npm run build (sem erros)

AMBOS:
☐ Docker: docker-compose up (sem erros)
☐ Health check: GET /api/health retorna OK
☐ Formulário submete com sucesso

================================================================================
APÓS FAZER DEPLOY
================================================================================

1. TESTE TUDO:
   - Acesse https://seu-app.vercel.app (ou seu domain)
   - Preencha formulário
   - Verifique se salva
   - Verifique dashboard
   - Teste histórico

2. CONFIGURE DOMÍNIO (Opcional):
   - Railway/Render permitem domínios customizados
   - Vercel tem 1 domínio .vercel.app gratuito
   - Para .com/.com.br, compre em Namecheap/GoDaddy

3. MONITORE:
   - Railway: /dashboard > Metrics
   - Render: /dashboard > Logs
   - Vercel: /dashboard > Analytics

4. ATUALIZAÇÕES:
   - Git push para main
   - Deployment automático em 1-2 minutos

================================================================================
PRÓXIMAS ETAPAS
================================================================================

Após deploy:
1. Corrigir bugs críticos da auditoria
2. Implementar autenticação real (não anônimo)
3. Configurar banco de dados persistente
4. Adicionar monitoramento e logging
5. Configurar backups

Quer que eu prepare o projeto para Railway agora?
================================================================================
