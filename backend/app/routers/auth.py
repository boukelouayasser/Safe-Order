"""
Safe Order — Authentication Router
Handles registration, login, OTP, token refresh, profile, and Safe Standards.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from app.database import get_db
from app.models import User, MerchantProfile, UserRole, Language
from app.schemas.auth import (
    MerchantRegisterRequest, CustomerIdentifyRequest, LoginRequest,
    SendOTPRequest, VerifyOTPRequest, RefreshTokenRequest,
    SafeStandardsRequest, UpdateProfileRequest, UpdateMerchantProfileRequest,
    TokenResponse, UserResponse, MerchantProfileResponse, MerchantFullResponse,
    MessageResponse, OTPResponse,
)
from app.services.auth_service import create_token_pair, verify_token
from app.services.otp_service import send_otp, verify_otp
from app.dependencies import get_current_user, get_current_merchant
from app.config import settings

router = APIRouter()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# ──────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────

@router.post("/register/merchant", response_model=TokenResponse, status_code=201)
def register_merchant(req: MerchantRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new merchant account.
    In demo mode, email verification is skipped.
    """
    # Check existing email
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet email est déjà utilisé",
        )

    # Check existing phone
    if db.query(User).filter(User.phone == req.phone).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce numéro de téléphone est déjà utilisé",
        )

    # Create user
    user = User(
        role=UserRole.MERCHANT,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
        email=req.email,
        password_hash=hash_password(req.password),
        wilaya=req.wilaya,
        municipality=req.municipality,
        address=req.address,
        language=Language(req.language.value),
        is_verified=settings.DEMO_MODE,  # Auto-verify in demo
    )
    db.add(user)
    db.flush()

    # Create merchant profile
    profile = MerchantProfile(
        user_id=user.id,
        store_name=req.store_name,
        delivery_companies=req.delivery_companies,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    # Generate tokens
    tokens = create_token_pair(user.id, user.role.value)
    return TokenResponse(**tokens)


@router.post("/register/customer", response_model=TokenResponse, status_code=201)
def register_customer(req: CustomerIdentifyRequest, db: Session = Depends(get_db)):
    """
    Identify or create a customer by phone number.
    Customers don't have passwords — they use OTP.
    If the phone already exists, return tokens for that user.
    """
    # Check if customer already exists
    user = db.query(User).filter(User.phone == req.phone, User.role == UserRole.CUSTOMER).first()

    if user:
        # Existing customer — update info if provided
        if req.first_name:
            user.first_name = req.first_name
        if req.last_name:
            user.last_name = req.last_name
        if req.language:
            user.language = Language(req.language.value)
        db.commit()
    else:
        # New customer
        user = User(
            role=UserRole.CUSTOMER,
            first_name=req.first_name or "Client",
            last_name=req.last_name or "",
            phone=req.phone,
            language=Language(req.language.value),
            is_verified=settings.DEMO_MODE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    tokens = create_token_pair(user.id, user.role.value)
    return TokenResponse(**tokens)


# ──────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email + password (merchants and admins only).
    """
    user = db.query(User).filter(User.email == req.email).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé",
        )

    tokens = create_token_pair(user.id, user.role.value)
    return TokenResponse(**tokens)


# ──────────────────────────────────────────────
# OTP
# ──────────────────────────────────────────────

@router.get("/customer/exists/{phone}")
def customer_exists(phone: str, db: Session = Depends(get_db)):
    """Public lookup: does a customer account exist for this phone?

    Used by the customer login page to decide whether to ask for a name
    (signup) or skip straight to OTP entry (login).
    """
    user = db.query(User).filter(
        User.phone == phone,
        User.role == UserRole.CUSTOMER,
    ).first()
    return {
        "exists": user is not None,
        "first_name": user.first_name if user else None,
    }


@router.post("/otp/send", response_model=OTPResponse)
def request_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    """
    Send an OTP code to a phone number.
    In demo mode, the code is always 123456 and returned in the response.
    """
    result = send_otp(db, req.phone, req.purpose)
    return OTPResponse(**result)


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp_code(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verify an OTP code and return tokens.
    Used for customer login and merchant phone verification.
    """
    if not verify_otp(db, req.phone, req.code, req.purpose):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code OTP invalide ou expiré",
        )

    # Find or create user
    user = db.query(User).filter(User.phone == req.phone).first()

    if not user:
        # Customer signup — names are required.
        if not req.first_name or not req.last_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prénom et nom requis pour créer un compte client",
            )
        user = User(
            role=UserRole.CUSTOMER,
            first_name=req.first_name.strip(),
            last_name=req.last_name.strip(),
            phone=req.phone,
            language=Language(req.language.value) if req.language else Language.FR,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Existing user: mark verified, optionally update profile names.
        if not user.is_verified:
            user.is_verified = True
        if req.first_name and user.role == UserRole.CUSTOMER:
            user.first_name = req.first_name.strip()
        if req.last_name and user.role == UserRole.CUSTOMER:
            user.last_name = req.last_name.strip()
        if req.language and user.role == UserRole.CUSTOMER:
            user.language = Language(req.language.value)
        db.commit()

    tokens = create_token_pair(user.id, user.role.value)
    return TokenResponse(**tokens)


# ──────────────────────────────────────────────
# Token Refresh
# ──────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new token pair."""
    payload = verify_token(req.refresh_token, expected_type="refresh")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé ou désactivé",
        )

    tokens = create_token_pair(user.id, user.role.value)
    return TokenResponse(**tokens)


# ──────────────────────────────────────────────
# Current User
# ──────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.get("/me/merchant", response_model=MerchantFullResponse)
def get_me_merchant(current_user: User = Depends(get_current_merchant), db: Session = Depends(get_db)):
    """Get the current merchant's full profile (user + merchant profile)."""
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil marchand non trouvé",
        )

    return MerchantFullResponse(
        user=UserResponse.model_validate(current_user),
        profile=MerchantProfileResponse.model_validate(profile),
    )


@router.put("/me", response_model=UserResponse)
def update_me(req: UpdateProfileRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update the current user's profile."""
    if req.first_name is not None:
        current_user.first_name = req.first_name
    if req.last_name is not None:
        current_user.last_name = req.last_name
    if req.wilaya is not None:
        current_user.wilaya = req.wilaya
    if req.municipality is not None:
        current_user.municipality = req.municipality
    if req.address is not None:
        current_user.address = req.address
    if req.language is not None:
        current_user.language = Language(req.language.value)

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me/merchant", response_model=MerchantProfileResponse)
def update_merchant_profile(
    req: UpdateMerchantProfileRequest,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """Update merchant-specific profile fields."""
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand non trouvé")

    if req.store_name is not None:
        profile.store_name = req.store_name
    if req.delivery_companies is not None:
        profile.delivery_companies = req.delivery_companies

    db.commit()
    db.refresh(profile)
    return MerchantProfileResponse.model_validate(profile)


# ──────────────────────────────────────────────
# Safe Standards
# ──────────────────────────────────────────────

@router.post("/safe-standards", response_model=MessageResponse)
def accept_safe_standards(
    req: SafeStandardsRequest,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Accept Safe Standards — 3 mandatory conditions.
    Dashboard is locked until all 3 are accepted.
    """
    if not (req.authentic_photos and req.complete_description and req.careful_packaging):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les 3 conditions Safe Standards doivent être acceptées",
        )

    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand non trouvé")

    profile.safe_standards_accepted = True
    profile.safe_standards_accepted_at = datetime.utcnow()
    db.commit()

    return MessageResponse(
        message="Safe Standards acceptés — votre dashboard est déverrouillé",
        detail="Vous pouvez maintenant accéder à toutes les fonctionnalités Safe Order",
    )


@router.get("/safe-standards/status", response_model=dict)
def get_safe_standards_status(
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """Check if the merchant has accepted Safe Standards."""
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    return {
        "accepted": profile.safe_standards_accepted if profile else False,
        "accepted_at": profile.safe_standards_accepted_at if profile else None,
    }


# ──────────────────────────────────────────────
# Delivery Companies (public)
# ──────────────────────────────────────────────

@router.get("/delivery-companies", response_model=list)
def get_delivery_companies(db: Session = Depends(get_db)):
    """Get all active delivery companies (for registration form)."""
    from app.models import DeliveryCompany
    companies = db.query(DeliveryCompany).filter(
        DeliveryCompany.is_active == True
    ).all()
    return [
        {
            "name": c.name,
            "slug": c.slug,
            "has_api": c.has_api,
        }
        for c in companies
    ]


# ──────────────────────────────────────────────
# Wilayas (public)
# ──────────────────────────────────────────────

@router.get("/wilayas", response_model=list)
def get_wilayas():
    """Get all 58 Algerian wilayas (for forms)."""
    from app.seed import WILAYAS
    return WILAYAS
