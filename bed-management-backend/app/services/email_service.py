import logging
import requests
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailService:
    """Brevo API Email Service (uses port 443)"""

    def __init__(self):
        self.API_URL = "https://api.brevo.com/v3/smtp/email"
        self.API_KEY = settings.BREVO_API_KEY
        self.FROM_EMAIL = settings.BREVO_FROM_EMAIL or "no-reply@yourdomain.com"
        self.FROM_NAME = settings.BREVO_FROM_NAME
        self.FRONTEND_URL = settings.FRONTEND_URL

        if not self.API_KEY:
            logger.error("❌ BREVO_API_KEY environment variable is required")
            raise ValueError("BREVO_API_KEY environment variable is required")

        logger.info("✅ EmailService initialized with Brevo API")

    # ---------------------------------------------------
    # Core send
    # ---------------------------------------------------
    def send_email(self, to_email: str, subject: str, html_body: str, text_body: str = None):
        try:
            payload = {
                "sender": {"name": self.FROM_NAME, "email": self.FROM_EMAIL},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body,
            }
            if text_body:
                payload["textContent"] = text_body

            headers = {
                "accept": "application/json",
                "api-key": self.API_KEY,
                "content-type": "application/json",
            }

            response = requests.post(self.API_URL, json=payload, headers=headers, timeout=30)

            if response.status_code == 201:
                logger.info(f"✅ Email sent to {to_email}")
                return True
            else:
                logger.error(f"❌ API error {response.status_code}: {response.text}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"❌ Timeout sending email to {to_email}")
            return False
        except requests.exceptions.ConnectionError:
            logger.error(f"❌ Connection error sending email to {to_email}")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False

    # ---------------------------------------------------
    # Verification CODE email (6-digit OTP)
    # ---------------------------------------------------
    def send_verification_code(self, to_email: str, code: str, full_name: str = "there"):
        subject = "Your Bed Management System verification code"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; }}
                .code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6; background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="header"><h1>🛏️ Bed Management System</h1></div>
            <div class="content">
                <h2>Welcome, {full_name}!</h2>
                <p>Your verification code is:</p>
                <div class="code">{code}</div>
                <p>Enter this code in the app to verify your email.</p>
                <p><strong>This code expires in 15 minutes.</strong></p>
            </div>
            <div class="footer"><p>Bed Management System</p></div>
        </body>
        </html>
        """

        text_body = f"""
        Bed Management System - Verification Code

        Hi {full_name},

        Your verification code is: {code}

        This code expires in 15 minutes.
        """

        return self.send_email(to_email, subject, html_body, text_body)

    # ---------------------------------------------------
    # Verification LINK email (legacy)
    # ---------------------------------------------------
    def send_verification_email(self, to_email: str, verification_link: str):
        subject = "Verify your Bed Management System account"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body>
            <h1>🛏️ Bed Management System</h1>
            <h2>Verify Your Email</h2>
            <p>Click to verify: <a href="{verification_link}">{verification_link}</a></p>
        </body>
        </html>
        """

        text_body = f"Verify your email: {verification_link}"

        return self.send_email(to_email, subject, html_body, text_body)

    # ---------------------------------------------------
    # Password reset email
    # ---------------------------------------------------
    def send_password_reset_code(self, to_email: str, code: str, full_name: str = "there"):
        subject = "Reset your Bed Management System password"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; }}
                .code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ef4444; background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="header"><h1>Password Reset</h1></div>
            <div class="content">
                <h2>Hello {full_name},</h2>
                <p>Use this code to reset your password:</p>
                <div class="code">{code}</div>
                <p>Enter this code in the app along with your new password.</p>
                <p><strong>This code expires in 15 minutes.</strong></p>
                <p>If you didn't request this, ignore this email.</p>
            </div>
            <div class="footer"><p>Bed Management System</p></div>
        </body>
        </html>
        """

        text_body = f"""
        Bed Management System - Password Reset

        Hi {full_name},

        Your password reset code is: {code}

        This code expires in 15 minutes.
        """

        return self.send_email(to_email, subject, html_body, text_body)


# Global singleton
email_service = None


def get_email_service():
    global email_service
    if email_service is None:
        email_service = EmailService()
    return email_service