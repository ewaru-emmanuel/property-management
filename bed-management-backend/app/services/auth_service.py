import logging
from app.database import supabase, supabase_admin
from app.services import verification_service
from app.services.email_service import get_email_service

logger = logging.getLogger(__name__)


def login(email: str, password: str):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
    except Exception as e:
        raise Exception(f"Login failed: {str(e)}")

    if not res.user or not res.session:
        raise Exception("Login failed: no user or session returned")

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "user": {
            "id": res.user.id,
            "email": res.user.email,
        },
    }


def signup(email: str, password: str, full_name: str = None, phone: str = None):
    # ---------- 1. Check if a user already exists with this email ----------
    existing = None
    try:
        all_users = supabase_admin.auth.admin.list_users()
        existing = next((u for u in all_users if u.email == email), None)
    except Exception as e:
        raise Exception(f"Could not check existing users: {str(e)}")

    # If user exists AND is confirmed → block
    if existing and existing.email_confirmed_at:
        raise Exception("This email is already registered and verified. Please log in.")

    # If user exists but NOT confirmed → delete so we can restart cleanly
    if existing and not existing.email_confirmed_at:
        try:
            supabase_admin.auth.admin.delete_user(existing.id)
            supabase_admin.table("profiles").delete().eq("id", existing.id).execute()
        except Exception as e:
            raise Exception(f"Could not reset unverified user: {str(e)}")

    # ---------- 2. Create the fresh user ----------
    try:
        res = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": False,
            "user_metadata": {"full_name": full_name},
        })
    except Exception as e:
        raise Exception(f"Failed to create user: {str(e)}")

    user = res.user
    if not user:
        raise Exception("Signup failed: no user returned")

    # ---------- 3. Insert profile ----------
    try:
        supabase_admin.table("profiles").insert({
            "id": user.id,
            "full_name": full_name,
            "phone": phone,
            "currency": "USD",
        }).execute()
    except Exception as e:
        print(f"⚠️ Profile insert failed: {e}")

    # ---------- 4. Generate + send code ----------
    code = verification_service.create_verification_code(email, "signup")
    email_service = get_email_service()
    sent = email_service.send_verification_code(email, code, full_name or "there")

    # ---------- 5. Rollback if send fails ----------
    if not sent:
        try:
            supabase_admin.table("profiles").delete().eq("id", user.id).execute()
            supabase_admin.auth.admin.delete_user(user.id)
            verification_service.delete_codes_for_email(email, "signup")
        except Exception as cleanup_err:
            print(f"⚠️ Cleanup failed: {cleanup_err}")

        raise Exception("Verification email could not be sent. Please try again.")

    # ---------- 6. Only now is signup 'complete' ----------
    return {
        "user_id": user.id,
        "email": user.email,
        "message": "Verification code sent",
    }


def verify_otp(email: str, token: str):
    # 1. Validate our own code
    if not verification_service.verify_code(email, token, "signup"):
        raise Exception("Invalid or expired code")

    # 2. Confirm user in Supabase
    try:
        users = supabase_admin.auth.admin.list_users()
        target = next((u for u in users if u.email == email), None)
        if not target:
            raise Exception("User not found")

        supabase_admin.auth.admin.update_user_by_id(
            target.id, {"email_confirm": True}
        )
    except Exception as e:
        raise Exception(f"Failed to confirm: {str(e)}")

    return {"verified": True, "email": email, "message": "Email verified. Please log in."}


def request_password_reset(email: str):
    # 1. Look up the user
    users = supabase_admin.auth.admin.list_users()
    target = next((u for u in users if u.email == email), None)

    # 2. If the user doesn't exist, return the SAME success message
    if not target:
        logger.info(f"Password reset requested for unknown email: {email}")
        return {
            "message": "If that email exists, a reset code has been sent.",
            "email": email,
        }

    # 3. Get profile name (optional)
    profile = None
    try:
        res = supabase_admin.table("profiles").select("full_name").eq("id", target.id).execute()
        profile = res.data[0] if res.data else None
    except Exception:
        pass
    full_name = (profile or {}).get("full_name") or "there"

    # 4. Generate reset code
    code = verification_service.create_verification_code(email, "reset")

    # 5. Send via Brevo
    email_service = get_email_service()
    sent = email_service.send_password_reset_code(email, code, full_name)

    if not sent:
        verification_service.delete_codes_for_email(email, "reset")
        logger.error(f"Failed to send reset email to {email}")

    return {
        "message": "If that email exists, a reset code has been sent.",
        "email": email,
    }


def reset_password(email: str, token: str, new_password: str):
    if not verification_service.verify_code(email, token, "reset"):
        raise Exception("Invalid or expired code")

    users = supabase_admin.auth.admin.list_users()
    target = next((u for u in users if u.email == email), None)
    if not target:
        raise Exception("User not found")

    try:
        supabase_admin.auth.admin.update_user_by_id(
            target.id, {"password": new_password}
        )
    except Exception as e:
        raise Exception(f"Failed to reset password: {str(e)}")

    return {"message": "Password reset successfully", "email": email}


def get_profile(user_id: str):
    res = supabase_admin.table("profiles").select("*").eq("id", user_id).execute()

    if res.data:
        return res.data[0]

    # Auto-create blank profile if missing
    try:
        insert = supabase_admin.table("profiles").insert({
            "id": user_id,
            "full_name": "",
            "phone": "",
            "currency": "USD",
        }).execute()
        return insert.data[0] if insert.data else None
    except Exception as e:
        print(f"⚠️ Could not auto-create profile for {user_id}: {e}")
        return None


def update_profile(user_id: str, full_name: str = None, phone: str = None, currency: str = None):
    update = {}
    if full_name is not None:
        update["full_name"] = full_name
    if phone is not None:
        update["phone"] = phone
    if currency is not None:
        update["currency"] = currency

    if not update:
        return {"message": "Nothing to update"}

    res = (
        supabase_admin.table("profiles")
        .update(update)
        .eq("id", user_id)
        .execute()
    )
    return res.data[0] if res.data else {"message": "Updated"} 

def change_password(user_id: str, new_password: str):
    if len(new_password) < 6:
        raise Exception("Password must be at least 6 characters")

    try:
        supabase_admin.auth.admin.update_user_by_id(
            user_id, {"password": new_password}
        )
    except Exception as e:
        raise Exception(f"Failed to update password: {str(e)}")

    return {"message": "Password updated successfully"}