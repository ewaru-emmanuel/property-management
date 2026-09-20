from supabase import create_client, Client
from app.config import settings

if not settings.is_configured:
    raise RuntimeError("Supabase is not configured. Check your .env file.")

# Respects RLS — good for user-scoped queries
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY,
)

# Bypasses RLS — use sparingly (admin operations, migrations)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)