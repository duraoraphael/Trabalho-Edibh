# 📊 Pasta de Exportações de Dados

Esta pasta armazena todas as exportações de dados criados no banco de dados da aplicação **Fluxo de equipamentos**.

## 📁 Conteúdo

Os arquivos nesta pasta são gerados automaticamente quando você solicita uma exportação através da API:

- **Format**: JSON
- **Padrão de nome**: `all_data_YYYYMMDD_HHMMSS.json`, `users_YYYYMMDD_HHMMSS.json`, `reports_YYYYMMDD_HHMMSS.json`
- **Atualização**: Novos arquivos são criados automaticamente a cada exportação

## 🔗 Endpoints de Exportação

### 1. **Exportar todos os dados em JSON**
```
GET /api/exports/json
```
Faz o download de um arquivo JSON contendo todos os usuários e relatórios criados.

### 2. **Listar todas as exportações**
```
GET /api/exports/list
```
Retorna uma lista de todos os arquivos de exportação disponíveis com informações de:
- Nome do arquivo
- Tamanho (em KB)
- Data de criação

### 3. **Baixar uma exportação específica**
```
GET /api/exports/download/{filename}
```
Faz o download de um arquivo de exportação específico pelo nome.

## 📝 Exemplo de JSON Exportado

```json
{
  "exported_at": "2026-06-26T11:30:45.123456",
  "users": [
    {
      "id": 1,
      "name": "Teste",
      "email": "teste@example.com",
      "role": "Operador"
    }
  ],
  "reports": [
    {
      "id": 1,
      "instalacao": "Plataforma A",
      "usuario_criacao": "teste@example.com",
      "data": "2026-06-26"
    }
  ]
}
```

## 🚀 Como Usar

1. **Navegar pelo navegador**: `http://localhost:8000/api/exports/json`
2. **Via terminal**:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8000/api/exports/json" -OutFile "export.json"
   ```
3. **Via cURL**:
   ```bash
   curl http://localhost:8000/api/exports/json -o export.json
   ```

## ⚙️ Configuração Automática

A pasta `exports/` é criada automaticamente na raiz do projeto quando o backend é inicializado. Você não precisa fazer nada manualmente.

---

✅ **Pronto para usar!** Todos os dados criados no banco de dados podem ser exportados automaticamente.
