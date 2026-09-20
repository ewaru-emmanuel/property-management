import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ---------- Supabase ----------
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # ---------- URLs ----------
    # Where the frontend lives (used in email links, redirects, etc.)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Comma-separated list of origins allowed to hit this API (CORS)
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )

    # ---------- Brevo (email) ----------
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_FROM_EMAIL: str = os.getenv("BREVO_FROM_EMAIL", "")
    BREVO_FROM_NAME: str = os.getenv("BREVO_FROM_NAME", "Bed Management System")

    # ---------- App ----------
    APP_NAME: str = os.getenv("APP_NAME", "Bed Management System API")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")

    # ---------- Derived ----------
    @property
    def is_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()