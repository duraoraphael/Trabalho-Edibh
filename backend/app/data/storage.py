from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from app.auth.password import hash_password, verify_password
from app.config import settings
from app.data.local_storage import FORM_FIELDS_PATH, REPORTS_PATH, USERS_PATH, read_json, write_json
from app.supabase_client import get_supabase_admin, get_supabase_anon


class LocalStore:
    def initialize(self) -> None:
        return None

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        users = read_json(USERS_PATH)
        for user in users:
            if user.get("email") == email:
                return user
        return None

    def create_user(self, user_data: dict[str, Any]) -> dict[str, Any]:
        users = read_json(USERS_PATH)
        next_id = max((user.get("id", 0) for user in users), default=0) + 1
        new_user = {
            "id": next_id,
            "name": user_data["name"],
            "email": user_data["email"],
            "role": user_data.get("role", "Operador"),
            "is_active": user_data.get("is_active", True),
            "telefone": user_data.get("telefone", ""),
            "foto_url": user_data.get("foto_url", ""),
            "last_access": user_data.get("last_access", ""),
            "password_hash": hash_password(user_data["password"]),
        }
        users.append(new_user)
        write_json(USERS_PATH, users)
        return new_user

    def authenticate_user(self, email: str, password: str) -> dict[str, Any] | None:
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.get("password_hash", "")):
            return None
        users = read_json(USERS_PATH)
        for item in users:
            if item.get("email") == email:
                item["last_access"] = datetime.now(timezone.utc).isoformat()
                write_json(USERS_PATH, users)
                user["last_access"] = item["last_access"]
                break
        return user

    def list_users(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        users = read_json(USERS_PATH)
        role = (filters or {}).get("role")
        search = ((filters or {}).get("search") or "").strip().lower()
        active = (filters or {}).get("is_active")
        result = []
        for user in users:
            if role and user.get("role") != role:
                continue
            if active is not None and bool(user.get("is_active", True)) != bool(active):
                continue
            haystack = f"{user.get('name', '')} {user.get('email', '')}".lower()
            if search and search not in haystack:
                continue
            result.append(user)
        return result

    def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        for user in read_json(USERS_PATH):
            if user.get("id") == user_id:
                return user
        return None

    def update_user(self, user_id: int, updates: dict[str, Any]) -> dict[str, Any]:
        users = read_json(USERS_PATH)
        for user in users:
            if user.get("id") == user_id:
                if updates.get("password"):
                    user["password_hash"] = hash_password(updates["password"])
                for key in ("name", "role", "is_active", "telefone", "foto_url", "last_access"):
                    if key in updates and updates[key] is not None:
                        user[key] = updates[key]
                write_json(USERS_PATH, users)
                return user
        raise ValueError("Usuário não encontrado")

    def delete_user(self, user_id: int) -> None:
        users = read_json(USERS_PATH)
        users = [u for u in users if u.get("id") != user_id]
        write_json(USERS_PATH, users)

    def get_form_config(self) -> dict[str, Any]:
        try:
            raw = FORM_FIELDS_PATH.read_text(encoding="utf-8")
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and isinstance(parsed.get("fields"), list):
                return parsed
        except Exception:
            pass
        return {"fields": []}

    def save_form_config(self, payload: dict[str, Any]) -> dict[str, Any]:
        FORM_FIELDS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return payload

    def list_reports(self, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        if not filters:
            return {"value": reports}

        gerencia = (filters.get("gerencia") or "").strip().lower()
        search = (filters.get("search") or "").strip().lower()
        start_date = filters.get("start_date")
        end_date = filters.get("end_date")

        def _in_date_range(item_date: str) -> bool:
            if not item_date:
                return False
            day = item_date[:10]
            if start_date and day < start_date:
                return False
            if end_date and day > end_date:
                return False
            return True

        filtered = []
        for item in reports:
            fields = item.get("fields", {})
            item_gerencia = str(fields.get("Gerencia", "")).strip().lower()
            item_date = str(fields.get("Data", "")).strip()
            item_instalacao = str(fields.get("Instalacao", "")).lower()
            item_sistema = str(fields.get("Sistema", "")).lower()
            item_equipamento = str(fields.get("Equipamento", "")).lower()

            if gerencia and item_gerencia != gerencia:
                continue
            if (start_date or end_date) and not _in_date_range(item_date):
                continue
            if search and search not in item_instalacao and search not in item_sistema and search not in item_equipamento:
                continue
            filtered.append(item)

        return {"value": filtered}

    def create_report(self, fields: dict[str, Any]) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        next_id = max((item.get("id", 0) for item in reports), default=0) + 1
        new_report = {"id": next_id, "fields": fields}
        reports.append(new_report)
        write_json(REPORTS_PATH, reports)
        return new_report

    def update_report(self, item_id: int, fields: dict[str, Any]) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        for report in reports:
            if report.get("id") == item_id:
                report["fields"].update(fields)
                write_json(REPORTS_PATH, reports)
                return report
        raise ValueError("Registro não encontrado")

    def delete_report(self, item_id: int) -> None:
        reports = read_json(REPORTS_PATH)
        reports = [report for report in reports if report.get("id") != item_id]
        write_json(REPORTS_PATH, reports)

    def get_report(self, item_id: int) -> dict[str, Any]:
        reports = read_json(REPORTS_PATH)
        for report in reports:
            if report.get("id") == item_id:
                return report
        raise ValueError("Registro não encontrado")


class PostgresStore:
    def __init__(self, database_url: str) -> None:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as exc:  # pragma: no cover - depends on environment
            raise RuntimeError(
                "psycopg não está instalado. Adicione a dependência e execute pip install antes de usar PostgreSQL."
            ) from exc

        self._psycopg = psycopg
        self._dict_row = dict_row
        self._database_url = database_url
        self._supabase_admin = get_supabase_admin()
        self._supabase_anon = get_supabase_anon()

    def _connect(self):
        return self._psycopg.connect(self._database_url, row_factory=self._dict_row)

    def _execute(self, query: str, params: dict[str, Any] | None = None, fetch_one: bool = False, fetch_all: bool = False):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params or {})
                if fetch_one:
                    return cursor.fetchone()
                if fetch_all:
                    return cursor.fetchall()
                connection.commit()
                return None

    def initialize(self) -> None:
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL DEFAULT 'Operador',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                telefone TEXT,
                foto_url TEXT,
                last_access TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        self._execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id BIGSERIAL PRIMARY KEY,
                instalacao TEXT NOT NULL,
                sistema TEXT NOT NULL,
                equipamento TEXT NOT NULL,
                data DATE NOT NULL,
                gerencia TEXT NOT NULL,
                situacao_identificada TEXT NOT NULL,
                usuario_criacao TEXT,
                data_criacao TIMESTAMPTZ,
                usuario_alteracao TEXT,
                data_alteracao TIMESTAMPTZ,
                status TEXT NOT NULL DEFAULT 'Em análise',
                motivo_edicao TEXT,
                campos_customizados TEXT NOT NULL DEFAULT '{}',
                evidencias TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        self._execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Em análise'")
        self._execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS motivo_edicao TEXT")
        self._execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS campos_customizados TEXT NOT NULL DEFAULT '{}'")
        self._execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS historico_alteracoes TEXT NOT NULL DEFAULT '[]'")
        self._execute("CREATE INDEX IF NOT EXISTS idx_reports_data ON reports (data)")
        self._execute("CREATE INDEX IF NOT EXISTS idx_reports_gerencia ON reports (gerencia)")
        self._execute("CREATE INDEX IF NOT EXISTS idx_reports_instalacao_lower ON reports ((LOWER(instalacao)))")
        self._execute("CREATE INDEX IF NOT EXISTS idx_reports_sistema_lower ON reports ((LOWER(sistema)))")
        self._execute("CREATE INDEX IF NOT EXISTS idx_reports_equipamento_lower ON reports ((LOWER(equipamento)))")
        self._seed_users_from_json()
        self._seed_reports_from_json()

    def _seed_users_from_json(self) -> None:
        existing = self._execute("SELECT COUNT(*) AS count FROM profiles", fetch_one=True)
        if existing and existing.get("count", 0):
            return
        users = read_json(USERS_PATH)
        for user in users:
            if not user.get("email"):
                continue
            try:
                self.create_user(
                    {
                        "name": user.get("name", user["email"]),
                        "email": user["email"],
                        "password": secrets.token_urlsafe(16),
                        "role": user.get("role", "Operador"),
                        "is_active": user.get("is_active", True),
                    }
                )
            except Exception:
                continue

    def _seed_reports_from_json(self) -> None:
        existing = self._execute("SELECT COUNT(*) AS count FROM reports", fetch_one=True)
        if existing and existing.get("count", 0):
            return
        reports = read_json(REPORTS_PATH)
        for report in reports:
            fields = report.get("fields", {})
            self._execute(
                """
                INSERT INTO reports (
                    id, instalacao, sistema, equipamento, data, gerencia, situacao_identificada,
                    usuario_criacao, data_criacao, usuario_alteracao, data_alteracao, evidencias
                ) VALUES (
                    %(id)s, %(instalacao)s, %(sistema)s, %(equipamento)s, %(data)s, %(gerencia)s, %(situacao_identificada)s,
                    %(usuario_criacao)s, %(data_criacao)s, %(usuario_alteracao)s, %(data_alteracao)s, %(evidencias)s
                )
                ON CONFLICT (id) DO NOTHING
                """,
                {
                    "id": report.get("id"),
                    "instalacao": fields.get("Instalacao", ""),
                    "sistema": fields.get("Sistema", ""),
                    "equipamento": fields.get("Equipamento", ""),
                    "data": fields.get("Data") or datetime.now(timezone.utc).date().isoformat(),
                    "gerencia": fields.get("Gerencia", ""),
                    "situacao_identificada": fields.get("SituacaoIdentificada", ""),
                    "usuario_criacao": fields.get("UsuarioCriacao"),
                    "data_criacao": fields.get("DataCriacao"),
                    "usuario_alteracao": fields.get("UsuarioAlteracao"),
                    "data_alteracao": fields.get("DataAlteracao"),
                    "status": fields.get("Status", "Em análise"),
                    "motivo_edicao": fields.get("MotivoEdicao", ""),
                    "campos_customizados": fields.get("CamposCustomizados", "{}"),
                    "evidencias": fields.get("Evidencias", "[]"),
                },
            )
        self._execute(
            "SELECT setval(pg_get_serial_sequence('reports', 'id'), COALESCE((SELECT MAX(id) FROM reports), 1), true)"
        )

    @staticmethod
    def _report_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "fields": {
                "Instalacao": row["instalacao"],
                "Sistema": row["sistema"],
                "Equipamento": row["equipamento"],
                "Data": row["data"].isoformat() if hasattr(row["data"], "isoformat") else row["data"],
                "Gerencia": row["gerencia"],
                "SituacaoIdentificada": row["situacao_identificada"],
                "UsuarioCriacao": row["usuario_criacao"] or "",
                "DataCriacao": row["data_criacao"].isoformat() if row["data_criacao"] and hasattr(row["data_criacao"], "isoformat") else row["data_criacao"] or "",
                "UsuarioAlteracao": row["usuario_alteracao"] or "",
                "DataAlteracao": row["data_alteracao"].isoformat() if row["data_alteracao"] and hasattr(row["data_alteracao"], "isoformat") else row["data_alteracao"] or "",
                "Status": row.get("status") or "Em análise",
                "MotivoEdicao": row.get("motivo_edicao") or "",
                "CamposCustomizados": row.get("campos_customizados") or "{}",
                "Evidencias": row["evidencias"] or "[]",
                "HistoricoAlteracoes": row.get("historico_alteracoes") or "[]",
            },
        }

    @staticmethod
    def _normalize_evidences(value: Any) -> str:
        if value in (None, ""):
            return "[]"
        if isinstance(value, str):
            return value
        return json.dumps(value, ensure_ascii=False)

    def _user_row(self, row: Any) -> dict[str, Any]:
        d = dict(row)
        if "id" in d and d["id"] is not None:
            d["id"] = str(d["id"])
        return d

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        row = self._execute("SELECT * FROM profiles WHERE email = %(email)s LIMIT 1", {"email": email}, fetch_one=True)
        if not row:
            return None
        return self._user_row(row)

    def create_user(self, user_data: dict[str, Any]) -> dict[str, Any]:
        try:
            auth_user = self._supabase_admin.auth.admin.create_user(
                {
                    "email": user_data["email"],
                    "password": user_data["password"],
                    "email_confirm": True,
                }
            )
        except Exception as exc:
            raise ValueError("Usuário já existe") from exc
        # Força confirmação do e-mail via update (garante que funciona independente das configurações do Supabase)
        try:
            self._supabase_admin.auth.admin.update_user_by_id(
                str(auth_user.user.id),
                {"email_confirm": True},
            )
        except Exception:
            pass
        user_id = str(auth_user.user.id)
        row = self._execute(
            """
            INSERT INTO profiles (id, name, email, role, is_active)
            VALUES (%(id)s, %(name)s, %(email)s, %(role)s, %(is_active)s)
            RETURNING id, name, email, role, is_active, telefone, foto_url, last_access
            """,
            {
                "id": user_id,
                "name": user_data["name"],
                "email": user_data["email"],
                "role": user_data.get("role", "Operador"),
                "is_active": user_data.get("is_active", True),
            },
            fetch_one=True,
        )
        if not row:
            return {"id": user_id, "name": user_data["name"], "email": user_data["email"],
                    "role": user_data.get("role", "Operador"), "is_active": user_data.get("is_active", True)}
        result = dict(row)
        result["id"] = str(result["id"])
        return result

    def authenticate_user(self, email: str, password: str) -> dict[str, Any] | None:
        try:
            session = self._supabase_anon.auth.sign_in_with_password({"email": email, "password": password})
        except Exception:
            return None
        if not session or not session.session:
            return None
        user = self.get_user_by_email(email)
        if not user:
            return None
        self._execute("UPDATE profiles SET last_access = NOW() WHERE id = %(id)s", {"id": user["id"]})
        user["last_access"] = datetime.now(timezone.utc).isoformat()
        user["access_token"] = session.session.access_token
        user["refresh_token"] = session.session.refresh_token
        return user

    def list_users(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        query = "SELECT id, name, email, role, is_active, telefone, foto_url, last_access, created_at FROM profiles"
        conditions: list[str] = []
        params: dict[str, Any] = {}
        if filters:
            if filters.get("role"):
                conditions.append("role = %(role)s")
                params["role"] = filters["role"]
            if filters.get("is_active") is not None:
                conditions.append("is_active = %(is_active)s")
                params["is_active"] = bool(filters["is_active"])
            if filters.get("search"):
                conditions.append("(LOWER(name) LIKE %(search)s OR LOWER(email) LIKE %(search)s)")
                params["search"] = f"%{str(filters['search']).lower()}%"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC"
        rows = self._execute(query, params, fetch_all=True) or []
        return [self._user_row(row) for row in rows]

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        row = self._execute("SELECT * FROM profiles WHERE id = %(id)s LIMIT 1", {"id": user_id}, fetch_one=True)
        return self._user_row(row) if row else None

    def update_user(self, user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        target = self.get_user_by_id(user_id)
        if not target:
            raise ValueError("Usuário não encontrado")
        payload = {
            "id": user_id,
            "name": updates.get("name", target.get("name")),
            "role": updates.get("role", target.get("role")),
            "is_active": updates.get("is_active", target.get("is_active", True)),
            "telefone": updates.get("telefone", target.get("telefone")),
            "foto_url": updates.get("foto_url", target.get("foto_url")),
        }
        self._execute(
            """
            UPDATE profiles
            SET name=%(name)s, role=%(role)s, is_active=%(is_active)s, telefone=%(telefone)s, foto_url=%(foto_url)s
            WHERE id=%(id)s
            """,
            payload,
        )
        if updates.get("password"):
            self._supabase_admin.auth.admin.update_user_by_id(user_id, {"password": updates["password"]})
        updated = self.get_user_by_id(user_id)
        return updated or {"id": str(user_id)}

    def delete_user(self, user_id: str) -> None:
        self._supabase_admin.auth.admin.delete_user(user_id)
        self._execute("DELETE FROM profiles WHERE id = %(id)s", {"id": user_id})

    def get_form_config(self) -> dict[str, Any]:
        try:
            raw = FORM_FIELDS_PATH.read_text(encoding="utf-8")
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and isinstance(parsed.get("fields"), list):
                return parsed
        except Exception:
            pass
        return {"fields": []}

    def save_form_config(self, payload: dict[str, Any]) -> dict[str, Any]:
        FORM_FIELDS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return payload

    def list_reports(self, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        query = "SELECT * FROM reports"
        conditions: list[str] = []
        params: dict[str, Any] = {}
        limit = 500
        offset = 0

        if filters:
            gerencia = (filters.get("gerencia") or "").strip()
            search = (filters.get("search") or "").strip()
            start_date = filters.get("start_date")
            end_date = filters.get("end_date")

            if gerencia:
                conditions.append("LOWER(gerencia) = LOWER(%(gerencia)s)")
                params["gerencia"] = gerencia
            if start_date:
                conditions.append("data >= %(start_date)s::date")
                params["start_date"] = start_date
            if end_date:
                conditions.append("data <= %(end_date)s::date")
                params["end_date"] = end_date
            if search:
                conditions.append(
                    "(LOWER(instalacao) LIKE %(search)s OR LOWER(sistema) LIKE %(search)s OR LOWER(equipamento) LIKE %(search)s)"
                )
                params["search"] = f"%{search.lower()}%"
            raw_limit = filters.get("limit")
            raw_offset = filters.get("offset")
            if raw_limit is not None:
                try:
                    limit = min(max(int(raw_limit), 1), 1000)
                except (TypeError, ValueError):
                    limit = 500
            if raw_offset is not None:
                try:
                    offset = max(int(raw_offset), 0)
                except (TypeError, ValueError):
                    offset = 0

        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY id DESC LIMIT %(limit)s OFFSET %(offset)s"
        params["limit"] = limit
        params["offset"] = offset

        rows = self._execute(query, params, fetch_all=True) or []
        return {"value": [self._report_row_to_dict(dict(row)) for row in rows]}

    def create_report(self, fields: dict[str, Any]) -> dict[str, Any]:
        row = self._execute(
            """
            INSERT INTO reports (
                instalacao, sistema, equipamento, data, gerencia, situacao_identificada,
                usuario_criacao, data_criacao, status, motivo_edicao, campos_customizados, evidencias
            ) VALUES (
                %(instalacao)s, %(sistema)s, %(equipamento)s, %(data)s::date, %(gerencia)s, %(situacao_identificada)s,
                %(usuario_criacao)s, %(data_criacao)s, %(status)s, %(motivo_edicao)s, %(campos_customizados)s, %(evidencias)s
            )
            RETURNING *
            """,
            {
                "instalacao": fields["Instalacao"],
                "sistema": fields["Sistema"],
                "equipamento": fields["Equipamento"],
                "data": fields["Data"],
                "gerencia": fields["Gerencia"],
                "situacao_identificada": fields["SituacaoIdentificada"],
                "usuario_criacao": fields.get("UsuarioCriacao"),
                "data_criacao": fields.get("DataCriacao"),
                "status": fields.get("Status", "Em análise"),
                "motivo_edicao": fields.get("MotivoEdicao", ""),
                "campos_customizados": json.dumps(fields.get("CamposCustomizados", {}), ensure_ascii=False)
                if not isinstance(fields.get("CamposCustomizados", "{}"), str)
                else fields.get("CamposCustomizados", "{}"),
                "evidencias": self._normalize_evidences(fields.get("Evidencias", [])),
            },
            fetch_one=True,
        )
        return self._report_row_to_dict(dict(row)) if row else {}

    def update_report(self, item_id: int, fields: dict[str, Any]) -> dict[str, Any]:
        existing = self.get_report(item_id)
        if not existing:
            raise ValueError("Registro não encontrado")

        current_fields = existing.get("fields", {})
        updates = {
            "instalacao": fields.get("Instalacao", current_fields.get("Instalacao", "")),
            "sistema": fields.get("Sistema", current_fields.get("Sistema", "")),
            "equipamento": fields.get("Equipamento", current_fields.get("Equipamento", "")),
            "data": fields.get("Data", current_fields.get("Data", "")),
            "gerencia": fields.get("Gerencia", current_fields.get("Gerencia", "")),
            "situacao_identificada": fields.get("SituacaoIdentificada", current_fields.get("SituacaoIdentificada", "")),
            "usuario_alteracao": fields.get("UsuarioAlteracao"),
            "data_alteracao": fields.get("DataAlteracao"),
            "status": fields.get("Status", current_fields.get("Status", "Em análise")),
            "motivo_edicao": fields.get("MotivoEdicao", current_fields.get("MotivoEdicao", "")),
            "campos_customizados": fields.get("CamposCustomizados", current_fields.get("CamposCustomizados", "{}")),
            "evidencias": self._normalize_evidences(fields.get("Evidencias", current_fields.get("Evidencias", "[]"))),
        }
        if not isinstance(updates["campos_customizados"], str):
            updates["campos_customizados"] = json.dumps(updates["campos_customizados"], ensure_ascii=False)

        # Append to historico_alteracoes if a historico entry is provided
        raw_hist = current_fields.get("HistoricoAlteracoes", "[]") or "[]"
        try:
            historico = json.loads(raw_hist) if isinstance(raw_hist, str) else raw_hist
            if not isinstance(historico, list):
                historico = []
        except Exception:
            historico = []
        if fields.get("HistoricoEntrada"):
            historico.insert(0, fields["HistoricoEntrada"])
        updates["historico_alteracoes"] = json.dumps(historico, ensure_ascii=False)

        row = self._execute(
            """
            UPDATE reports
            SET
                instalacao = %(instalacao)s,
                sistema = %(sistema)s,
                equipamento = %(equipamento)s,
                data = %(data)s::date,
                gerencia = %(gerencia)s,
                situacao_identificada = %(situacao_identificada)s,
                usuario_alteracao = %(usuario_alteracao)s,
                data_alteracao = %(data_alteracao)s,
                status = %(status)s,
                motivo_edicao = %(motivo_edicao)s,
                campos_customizados = %(campos_customizados)s,
                evidencias = %(evidencias)s,
                historico_alteracoes = %(historico_alteracoes)s
            WHERE id = %(id)s
            RETURNING *
            """,
            {"id": item_id, **updates},
            fetch_one=True,
        )
        if not row:
            raise ValueError("Registro não encontrado")
        return self._report_row_to_dict(dict(row))

    def delete_report(self, item_id: int) -> None:
        self._execute("DELETE FROM reports WHERE id = %(id)s", {"id": item_id})

    def get_report(self, item_id: int) -> dict[str, Any]:
        row = self._execute("SELECT * FROM reports WHERE id = %(id)s LIMIT 1", {"id": item_id}, fetch_one=True)
        if not row:
            raise ValueError("Registro não encontrado")
        return self._report_row_to_dict(dict(row))


@lru_cache(maxsize=1)
def get_store() -> LocalStore | PostgresStore:
    if settings.DATABASE_URL:
        return PostgresStore(settings.DATABASE_URL)
    return LocalStore()
