"""
Safe Order — SQLAlchemy ORM Models
All database tables for the platform.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Enum, JSON, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    MERCHANT = "merchant"
    ADMIN = "admin"


class Language(str, enum.Enum):
    FR = "fr"
    EN = "en"
    AR = "ar"


class OrderStatus(str, enum.Enum):
    CONFIRMATION = "confirmation"
    PREPARATION = "preparation"
    DISPATCH = "dispatch"
    DELIVERY = "delivery"
    DELIVERED = "delivered"
    RETURN_PROCESSED = "return_processed"


class OrderBadge(str, enum.Enum):
    SAFE_PAY = "safe_pay"
    NEW = "new"
    LOYAL = "loyal"
    RISK = "risk"


class PaymentMethod(str, enum.Enum):
    CIB = "cib"
    DAHABIA = "dahabia"
    BARIDIMOB = "baridimob"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REFUNDED = "refunded"
    FAILED = "failed"


class PaymentType(str, enum.Enum):
    DEPOSIT = "deposit"
    DELIVERY = "delivery"
    REFUND = "refund"


class DeliveryMode(str, enum.Enum):
    HOME = "home"
    PICKUP = "pickup"


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────

def generate_uuid():
    return str(uuid.uuid4())


def generate_tracking_code():
    """Generate a short tracking code like SO-A3F8K2."""
    short = uuid.uuid4().hex[:6].upper()
    return f"SO-{short}"


# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    role = Column(Enum(UserRole), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True, unique=True)
    password_hash = Column(String(255), nullable=True)  # NULL for customers (OTP-only)
    wilaya = Column(String(100), nullable=True)
    municipality = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    language = Column(Enum(Language), default=Language.FR)
    trust_score = Column(Float, default=50.0)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    merchant_profile = relationship("MerchantProfile", back_populates="user", uselist=False)
    orders_as_merchant = relationship("Order", back_populates="merchant", foreign_keys="Order.merchant_id")
    orders_as_customer = relationship("Order", back_populates="customer", foreign_keys="Order.customer_id")
    payments = relationship("Payment", back_populates="customer")
    feedbacks_given = relationship("Feedback", back_populates="customer", foreign_keys="Feedback.customer_id")
    feedbacks_received = relationship("Feedback", back_populates="merchant", foreign_keys="Feedback.merchant_id")

    __table_args__ = (
        CheckConstraint("trust_score >= 0 AND trust_score <= 100", name="check_trust_score_range"),
    )


class MerchantProfile(Base):
    __tablename__ = "merchant_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    store_name = Column(String(200), nullable=False)
    delivery_companies = Column(JSON, default=list)  # List of company slugs
    safe_standards_accepted = Column(Boolean, default=False)
    safe_standards_accepted_at = Column(DateTime, nullable=True)
    total_orders = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_returned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="merchant_profile")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    tracking_code = Column(String(20), unique=True, default=generate_tracking_code, index=True)
    order_link_token = Column(String(64), unique=True, default=lambda: uuid.uuid4().hex)

    # Product info
    product_name = Column(String(300), nullable=False)
    product_description = Column(Text, nullable=True)
    product_photos = Column(JSON, default=list)  # List of photo URLs
    product_price = Column(Float, nullable=False)

    # Delivery info
    delivery_company = Column(String(100), nullable=True)
    delivery_mode = Column(Enum(DeliveryMode), nullable=True)
    delivery_fee = Column(Float, default=0.0)
    customer_wilaya = Column(String(100), nullable=True)
    customer_municipality = Column(String(100), nullable=True)
    customer_address = Column(Text, nullable=True)
    customer_phone = Column(String(20), nullable=True)
    customer_first_name = Column(String(100), nullable=True)
    customer_last_name = Column(String(100), nullable=True)
    customer_remark = Column(Text, nullable=True)

    # Financial
    safe_pay_amount = Column(Float, default=0.0)  # Deposit amount
    remaining_amount = Column(Float, default=0.0)  # Price - deposit + delivery fee

    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.CONFIRMATION)
    badge = Column(Enum(OrderBadge), nullable=True)
    risk_score = Column(Float, default=0.0)  # 0-100, used for Risk Flag

    # Timestamps
    confirmed_at = Column(DateTime, nullable=True)
    prepared_at = Column(DateTime, nullable=True)
    dispatched_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    merchant = relationship("User", back_populates="orders_as_merchant", foreign_keys=[merchant_id])
    customer = relationship("User", back_populates="orders_as_customer", foreign_keys=[customer_id])
    payments = relationship("Payment", back_populates="order")
    tracking_events = relationship("TrackingEvent", back_populates="order", order_by="TrackingEvent.created_at")
    feedback = relationship("Feedback", back_populates="order", uselist=False)
    return_analysis = relationship("ReturnAnalysis", back_populates="order", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_type = Column(Enum(PaymentType), default=PaymentType.DEPOSIT)
    transaction_ref = Column(String(100), nullable=True)  # Simulated reference
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    # Relationships
    order = relationship("Order", back_populates="payments")
    customer = relationship("User", back_populates="payments")


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(OrderStatus), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="tracking_events")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True)
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    merchant_id = Column(String, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1–5
    criteria = Column(JSON, default=list)  # e.g. ["conforming", "fast_delivery", "good_packaging"]
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="feedback")
    customer = relationship("User", back_populates="feedbacks_given", foreign_keys=[customer_id])
    merchant = relationship("User", back_populates="feedbacks_received", foreign_keys=[merchant_id])

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
    )


class ReturnAnalysis(Base):
    """AI-generated analysis for returned orders."""
    __tablename__ = "return_analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True)
    cause = Column(String(200), nullable=False)  # e.g. "late_delivery", "wrong_product", "poor_packaging"
    cause_label_fr = Column(String(300), nullable=True)
    cause_label_en = Column(String(300), nullable=True)
    cause_label_ar = Column(String(300), nullable=True)
    recommendation = Column(Text, nullable=True)
    recommendation_fr = Column(Text, nullable=True)
    recommendation_en = Column(Text, nullable=True)
    recommendation_ar = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)  # 0.0–1.0
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="return_analysis")


class OTPCode(Base):
    """Stores OTP codes for phone verification."""
    __tablename__ = "otp_codes"

    id = Column(String, primary_key=True, default=generate_uuid)
    phone = Column(String(20), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    purpose = Column(String(50), default="registration")  # registration, login, verification
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DeliveryCompany(Base):
    """Reference table for Algerian delivery companies."""
    __tablename__ = "delivery_companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    logo_url = Column(String(500), nullable=True)
    has_api = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    wilayas_covered = Column(JSON, default=list)  # List of wilaya codes
    created_at = Column(DateTime, default=datetime.utcnow)
