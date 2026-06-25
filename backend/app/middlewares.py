from starlette.middleware.sessions import SessionMiddleware
from app.config import settings


def get_middlewares():
    return [
        SessionMiddleware(secret_key=settings.JWT_SECRET),
    ]
