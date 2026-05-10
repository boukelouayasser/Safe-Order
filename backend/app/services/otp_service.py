"""
Safe Order — OTP Service
Handles OTP generation, storage, and verification.
In demo mode, always accepts code 123456.
"""
from datetime import datetime, timedelta
import random
import string
from sqlalchemy.orm import Session
from app.models import OTPCode
from app.config import settings


def generate_otp_code() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))


def send_otp(db: Session, phone: str, purpose: str = "registration") -> dict:
    """
    Generate and 'send' an OTP code.
    In demo mode, the code is always 123456 and is returned in the response.
    In production, this would call Twilio SMS API.
    """
    # Invalidate any existing unused OTPs for this phone + purpose
    db.query(OTPCode).filter(
        OTPCode.phone == phone,
        OTPCode.purpose == purpose,
        OTPCode.is_used == False,
    ).update({"is_used": True})

    # Generate code
    code = settings.DEMO_OTP_CODE if settings.DEMO_MODE else generate_otp_code()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp = OTPCode(
        phone=phone,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
    )
    db.add(otp)
    db.commit()

    # In production: send via Twilio
    # if not settings.DEMO_MODE:
    #     twilio_client.messages.create(
    #         body=f"Votre code Safe Order: {code}",
    #         from_=settings.TWILIO_PHONE_NUMBER,
    #         to=phone,
    #     )

    result = {
        "message": "Code OTP envoyé",
        "phone": phone,
        "expires_in": 300,
    }

    if settings.DEMO_MODE:
        result["demo_code"] = code

    return result


def verify_otp(db: Session, phone: str, code: str, purpose: str = "registration") -> bool:
    """
    Verify an OTP code.
    In demo mode, code 123456 is always accepted.
    """
    # Demo shortcut
    if settings.DEMO_MODE and code == settings.DEMO_OTP_CODE:
        return True

    # Find valid OTP
    otp = db.query(OTPCode).filter(
        OTPCode.phone == phone,
        OTPCode.code == code,
        OTPCode.purpose == purpose,
        OTPCode.is_used == False,
        OTPCode.expires_at > datetime.utcnow(),
    ).first()

    if not otp:
        return False

    # Mark as used
    otp.is_used = True
    db.commit()
    return True
