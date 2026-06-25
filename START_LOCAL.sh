#!/bin/bash

# Script para iniciar projeto Prompt Master localmente com Docker Compose
# Linux/macOS

echo "========================================"
echo "PROMPT MASTER - DOCKER LAUNCHER"
echo "========================================"
echo ""

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker não está instalado!"
    echo "Baixe em: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "[1/4] Docker encontrado: OK"
echo ""

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose não está instalado!"
    exit 1
fi

echo "[2/4] Docker Compose encontrado: OK"
echo ""

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "[3/4] Criando arquivo .env..."
    cp ".env.example" ".env"
    echo "Arquivo .env criado. Configure as variáveis se necessário."
else
    echo "[3/4] Arquivo .env já existe"
fi
echo ""

# Iniciar containers
echo "[4/4] Iniciando containers..."
echo ""
docker-compose up --build
