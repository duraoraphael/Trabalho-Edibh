@echo off
REM Script para iniciar projeto Prompt Master localmente com Docker Compose
REM Windows PowerShell/CMD

echo ========================================
echo PROMPT MASTER - DOCKER LAUNCHER
echo ========================================
echo.

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker nao esta instalado!
    echo Baixe em: https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

echo [1/4] Docker encontrado: OK
echo.

REM Verificar Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose nao esta instalado!
    echo (Docker Desktop inclui Docker Compose automaticamente)
    pause
    exit /b 1
)

echo [2/4] Docker Compose encontrado: OK
echo.

REM Criar arquivo .env se nao existir
if not exist ".env" (
    echo [3/4] Criando arquivo .env...
    copy ".env.example" ".env"
    echo Arquivo .env criado. Configure as variaveis se necessario.
) else (
    echo [3/4] Arquivo .env ja existe
)
echo.

REM Iniciar containers
echo [4/4] Iniciando containers...
echo.
docker-compose up --build

pause
