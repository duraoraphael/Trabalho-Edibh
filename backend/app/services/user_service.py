from typing import Any
from app.data.storage import get_store


store = get_store()


class UserService:
    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        return store.get_user_by_email(email)

    def create_user(self, user_data: dict[str, Any]) -> dict[str, Any]:
        return store.create_user(user_data)

    def authenticate_user(self, email: str, password: str) -> dict[str, Any] | None:
        return store.authenticate_user(email, password)

    def list_users(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        return store.list_users(filters)

    def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        return store.get_user_by_id(user_id)

    def update_user(self, user_id: int, updates: dict[str, Any]) -> dict[str, Any]:
        return store.update_user(user_id, updates)

    def delete_user(self, user_id: int) -> None:
        store.delete_user(user_id)

    def get_form_config(self) -> dict[str, Any]:
        return store.get_form_config()

    def save_form_config(self, payload: dict[str, Any]) -> dict[str, Any]:
        return store.save_form_config(payload)
