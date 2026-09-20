import random
import string
from datetime import datetime, timedelta
from app.database import supabase_admin


def generate_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def create_verification_code(email: str, purpose: str = 'signup') -> str:
    # Delete any existing unused codes for this email + purpose
    supabase_admin.table("verification_codes") \
        .delete() \
        .eq("email", email) \
        .eq("purpose", purpose) \
        .eq("used", False) \
        .execute()

    code = generate_code()
    expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()

    supabase_admin.table("verification_codes").insert({
        "email": email,
        "code": code,
        "purpose": purpose,
        "expires_at": expires_at,
    }).execute()

    return code


def verify_code(email: str, code: str, purpose: str = 'signup') -> bool:
    res = supabase_admin.table("verification_codes") \
        .select("*") \
        .eq("email", email) \
        .eq("code", code) \
        .eq("purpose", purpose) \
        .eq("used", False) \
        .execute()

    if not res.data:
        return False

    row = res.data[0]
    expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))

    if expires_at < datetime.now(expires_at.tzinfo):
        return False

    # Mark as used
    supabase_admin.table("verification_codes") \
        .update({"used": True}) \
        .eq("id", row["id"]) \
        .execute()

    return True

def delete_codes_for_email(email: str, purpose: str = 'signup'):
    supabase_admin.table("verification_codes") \
        .delete() \
        .eq("email", email) \
        .eq("purpose", purpose) \
        .execute()