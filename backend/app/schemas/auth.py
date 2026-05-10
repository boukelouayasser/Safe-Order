"""
Safe Order — Authentication Schemas
Pydantic models for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class RoleEnum(str, Enum):
    CUSTOMER = "customer"
    MERCHANT = "merchant"
    ADMIN = "admin"


class LanguageEnum(str, Enum):
    FR = "fr"
    EN = "en"
    AR = "ar"


# ──────────────────────────────────────────────
# Auth Requests
# ──────────────────────────────────────────────

class MerchantRegisterRequest(BaseModel):
    """Merchant registration form — FR-02."""
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    store_name: str = Field(..., min_length=2, max_length=200)
    wilaya: str = Field(..., max_length=100)
    municipality: str = Field(..., max_length=100)
    address: Optional[str] = None
    delivery_companies: List[str] = Field(default_factory=list)
    language: LanguageEnum = LanguageEnum.FR


class CustomerIdentifyRequest(BaseModel):
    """Customer identification by phone — no account, no password."""
    phone: str = Field(..., min_length=10, max_length=20)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language: LanguageEnum = LanguageEnum.FR


class LoginRequest(BaseModel):
    """Merchant/Admin login with email + password."""
    email: EmailStr
    password: str


class SendOTPRequest(BaseModel):
    """Request to send OTP to a phone number."""
    phone: str = Field(..., min_length=10, max_length=20)
    purpose: str = "registration"  # registration, login, verification


class VerifyOTPRequest(BaseModel):
    """Verify an OTP code.

    For customer signup, ``first_name`` / ``last_name`` are required when
    no user exists yet. They are ignored for already-registered phones.
    """
    phone: str = Field(..., min_length=10, max_length=20)
    code: str = Field(..., min_length=6, max_length=6)
    purpose: str = "registration"
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language: Optional[LanguageEnum] = None


class RefreshTokenRequest(BaseModel):
    """Request a new access token using a refresh token."""
    refresh_token: str


class SafeStandardsRequest(BaseModel):
    """Accept Safe Standards — 3 conditions."""
    authentic_photos: bool = True
    complete_description: bool = True
    careful_packaging: bool = True


class UpdateProfileRequest(BaseModel):
    """Update user profile."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    wilaya: Optional[str] = None
    municipality: Optional[str] = None
    address: Optional[str] = None
    language: Optional[LanguageEnum] = None


class UpdateMerchantProfileRequest(BaseModel):
    """Update merchant-specific profile."""
    store_name: Optional[str] = None
    delivery_companies: Optional[List[str]] = None


# ──────────────────────────────────────────────
# Auth Responses
# ──────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: str
    role: RoleEnum
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None
    wilaya: Optional[str] = None
    municipality: Optional[str] = None
    address: Optional[str] = None
    language: LanguageEnum
    trust_score: float
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MerchantProfileResponse(BaseModel):
    id: str
    store_name: str
    delivery_companies: List[str]
    safe_standards_accepted: bool
    safe_standards_accepted_at: Optional[datetime] = None
    total_orders: int
    total_delivered: int
    total_returned: int

    class Config:
        from_attributes = True


class MerchantFullResponse(BaseModel):
    user: UserResponse
    profile: MerchantProfileResponse


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class OTPResponse(BaseModel):
    message: str
    phone: str
    expires_in: int  # seconds
    demo_code: Optional[str] = None  # Only in demo mode
