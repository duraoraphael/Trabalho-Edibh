================================================================================
DEPLOY RÁPIDO NO RAILWAY - 10 MINUTOS
================================================================================

Railway é a plataforma MAIS FÁCIL para colocar seu app na internet.

PASSO 1: PREPARAR SEU REPOSITÓRIO GITHUB
================================================================================

1.1) Instale Git (se não tiver):
   - Windows: https://git-scm.com/download/win
   - Linux/Mac: brew install git

1.2) Crie conta no GitHub:
   - https://github.com/signup
   - Confirme email

1.3) Crie repositório:
   - Clique em "New"
   - Nome: prompt-master
   - Descrição: "Sistema de gestão de ordens de serviço"
   - Selecione "Public"
   - Clique "Create repository"

1.4) Faça push do seu código:
   Abra PowerShell na pasta do projeto e execute:

   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/prompt-master.git
   git push -u origin main

   (Substitua "seu-usuario" pelo seu username do GitHub)

PASSO 2: CRIAR CONTA NO RAILWAY
================================================================================

2.1) Acesse: https://railway.app
2.2) Clique "Continue with GitHub"
2.3) Autorize Railway a acessar sua conta
2.4) Preencha informações básicas
2.5) Clique "Create Account"

PASSO 3: CONFIGURAR BACKEND (FastAPI)
================================================================================

3.1) No painel do Railway, clique em "+ New Project"

3.2) Selecione "Deploy from GitHub"

3.3) Selecione repositório "prompt-master"

3.4) Railway automaticamente detectará Dockerfile
    (Observe se mostra "Build: Dockerfile" e "Start: uvicorn...")

3.5) Clique em "Deploy"
    Aguarde 2-3 minutos enquanto Railway faz build

3.6) Vá para abas "Variables" (abaixo de "Deployments")

3.7) Clique "New Variable" e adicione:
    
    VARIÁVEL 1:
    Name: JWT_SECRET
    Value: gerar-chave-secreta-aleatoria-aqui-32-caracteres-minimo
    
    VARIÁVEL 2:
    Name: ENVIRONMENT
    Value: production
    
    VARIÁVEL 3:
    Name: FRONTEND_URL
    Value: https://prompt-master-frontend.railway.app
    (Você mudará isso depois de deployar frontend)

3.8) Após adicionar variáveis, Railway faz re-deploy automaticamente

3.9) Vá para aba "Networking"
    
    Você verá uma URL como:
    https://railway.app/project/xxx/service/backend
    
    Copie a URL pública (próxima a "Public Domain")

3.10) SALVE ESSA URL! Você usará no frontend.
     Exemplo: https://prompt-master-backend-production.up.railway.app

TESTE BACKEND:
- Acesse: https://sua-url-backend/api/health
- Deve retornar: {"status": "ok", "message": "..."}

PASSO 4: CONFIGURAR FRONTEND (React)
================================================================================

4.1) De volta no painel Railway, clique "+ New Service"

4.2) Selecione "GitHub"

4.3) Mesmo repositório "prompt-master"

4.4) Configure:
   - Name: frontend
   - Root Directory: ./frontend
   - Build Command: npm install && npm run build
   - Start Command: npm start

4.5) Clique "Create Service"

4.6) Aguarde build (2-3 minutos)

4.7) Vá para "Variables" e adicione:

   VARIÁVEL:
   Name: REACT_APP_API_URL
   Value: https://sua-url-backend-do-passo-3.10/api
   
   Exemplo:
   https://prompt-master-backend-production.up.railway.app/api

4.8) Railway refaz deploy automaticamente

4.9) Vá para "Networking"
    Copie a URL pública do frontend
    Exemplo: https://prompt-master-frontend-production.up.railway.app

4.10) VOLTE PARA BACKEND:
    - Edite a variável FRONTEND_URL
    - Mude para a URL do frontend do passo 4.9
    - Railway faz re-deploy automaticamente

PASSO 5: TESTAR TUDO
================================================================================

5.1) Acesse seu app:
   https://prompt-master-frontend-production.up.railway.app

5.2) Teste funcionalidades:
   - Preencha formulário "Nova Ordem de Serviço"
   - Clique em "Dashboard"
   - Clique em "Histórico"
   - Clique em "Executivo"

5.3) Verifique se tudo funciona:
   ✓ Formulário salva ordem
   ✓ Dashboard mostra dados
   ✓ Histórico lista registros

PASSO 6: CONFIGURAR DOMÍNIO CUSTOMIZADO (Opcional)
================================================================================

Se quer seu-app.com em vez de railway.app:

6.1) Compre domínio:
   - Namecheap: https://www.namecheap.com
   - GoDaddy: https://www.godaddy.com
   - Locaweb: https://www.locaweb.com.br

6.2) No Railway, vá para "Networking" de cada serviço

6.3) Clique "Add Custom Domain"

6.4) Digite seu domínio (ex: app.seudominio.com)

6.5) Railway mostrará registros DNS

6.6) Configure DNS no provedor (nameservers apontam para Railway)

6.7) Aguarde 24-48 horas para propagar

================================================================================
CHECKLIST FINAL
================================================================================

✓ GitHub criado com código
✓ Railway backend deployado
✓ Railway frontend deployado
✓ Variáveis de ambiente configuradas
✓ URLs backend <-> frontend conectadas
✓ Testado formulário funciona
✓ Testado dashboard funciona
✓ App na internet em: https://seu-dominio-aqui.railway.app

================================================================================
PRÓXIMOS PASSOS
================================================================================

Após deploy bem-sucedido:

1. CORRIGIR BUGS DA AUDITORIA
   - Remover campo numero_ordem
   - Adicionar rotas /login e /register
   - Implementar autenticação real

2. BANCO DE DADOS
   - Migrar de JSON local para PostgreSQL
   - Railway fornece PostgreSQL grátis

3. MONITORAMENTO
   - Railway > Logs
   - Verificar erros de API

4. BACKUPS
   - Configurar backup automático do banco

5. PERFORMANCE
   - Adicionar cache
   - Otimizar queries

================================================================================
DÚVIDAS?
================================================================================

Se algo não funcionar:

1. BACKEND NÃO SOBE:
   - Verifique no Railway > Logs
   - Procure por erros Python
   - Verifique JWT_SECRET está configurado

2. FRONTEND NÃO CONECTA AO BACKEND:
   - Verifique REACT_APP_API_URL está correto
   - Verifique URL do backend está acessível
   - Abra DevTools (F12) > Network, procure erros

3. ERRO DE CORS:
   - Verifique FRONTEND_URL no backend
   - Deve ser exatamente igual à URL do frontend

================================================================================
