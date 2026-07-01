import base64
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

CONFIG_PATH = Path(__file__).resolve().parent.parent / "data" / "sharepoint_config.json"

if not CONFIG_PATH.exists():
    CONFIG_PATH.write_text(json.dumps({"config": {}, "logs": []}), encoding="utf-8")


def _get_fernet() -> Fernet:
    key_source = (settings.CONFIG_ENCRYPTION_KEY or settings.JWT_SECRET).encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(key_source).digest())
    return Fernet(key)


def _encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt(value: str) -> str:
    try:
        return _get_fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return ""


class SharePointConfigService:
    def _read(self) -> dict[str, Any]:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

    def _write(self, data: dict[str, Any]) -> None:
        CONFIG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _add_log(self, data: dict[str, Any], action: str, message: str) -> None:
        logs = data.get("logs", [])
        logs.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "message": message,
        })
        data["logs"] = logs[-50:]
        self._write(data)

    def get_masked_config(self) -> dict[str, Any]:
        data = self._read()
        config = dict(data.get("config", {}))
        config["client_secret_set"] = bool(config.pop("client_secret_encrypted", None))
        config["status"] = data.get("status", "offline")
        config["last_sync"] = data.get("last_sync")
        return config

    def save_config(self, payload: dict[str, Any], user_email: str) -> dict[str, Any]:
        data = self._read()
        config = data.get("config", {})
        config.update({
            "url_sharepoint": payload["url_sharepoint"],
            "tenant_id": payload["tenant_id"],
            "client_id": payload["client_id"],
            "list_name": payload["list_name"],
            "library_name": payload["library_name"],
            "graph_api_url": payload["graph_api_url"],
        })
        if payload.get("client_secret"):
            config["client_secret_encrypted"] = _encrypt(payload["client_secret"])
        data["config"] = config
        data["updated_by"] = user_email
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._add_log(data, "config_saved", f"Configuração atualizada por {user_email}.")
        return self.get_masked_config()

    def get_logs(self) -> list[dict[str, Any]]:
        data = self._read()
        return list(reversed(data.get("logs", [])))

    def test_connection(self, user_email: str) -> dict[str, Any]:
        data = self._read()
        config = data.get("config", {})
        tenant_id = config.get("tenant_id")
        client_id = config.get("client_id")
        client_secret_encrypted = config.get("client_secret_encrypted")

        if not (tenant_id and client_id and client_secret_encrypted):
            data["status"] = "offline"
            self._add_log(data, "test_connection", "Configuração incompleta.")
            return {"status": "offline", "message": "Configuração incompleta. Preencha e salve antes de testar."}

        client_secret = _decrypt(client_secret_encrypted)
        try:
            response = httpx.post(
                f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials",
                },
                timeout=15,
            )
            response.raise_for_status()
            data["status"] = "online"
            data["last_sync"] = datetime.now(timezone.utc).isoformat()
            self._add_log(data, "test_connection", f"Conexão bem-sucedida (testado por {user_email}).")
            return {"status": "online", "message": "Conexão estabelecida com sucesso.", "last_sync": data["last_sync"]}
        except Exception:
            data["status"] = "offline"
            self._add_log(data, "test_connection", f"Falha na conexão (testado por {user_email}).")
            return {"status": "offline", "message": "Falha ao conectar ao Microsoft Graph. Verifique as credenciais."}
