from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Client autenticado com a service_role key (uso restrito ao backend)."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados.")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def get_supabase_anon() -> Client:
    """Client com a anon key, usado para sign-in/refresh em nome do usuário final."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configurados.")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
