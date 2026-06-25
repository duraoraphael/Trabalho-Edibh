from typing import Any
from app.auth.password import hash_password, verify_password
from app.config import settings
from app.data.local_storage import read_json, write_json, USERS_PATH


class UserService:
    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        users = read_json(USERS_PATH)
        for user in users:
            if user.get("email") == email:
                return user
        return None

    def create_user(self, user_data: dict[str, Any]) -> dict[str, Any]:
        users = read_json(USERS_PATH)
        next_id = max((user.get("id", 0) for user in users), default=0) + 1
        hashed_password = hash_password(user_data["password"])
        new_user = {
            "id": next_id,
            "name": user_data["name"],
            "email": user_data["email"],
            "role": user_data.get("role", "Operador"),
            "is_active": user_data.get("is_active", True),
            "password_hash": hashed_password,
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
        return user
