"""
Safe Order — Payment Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PaymentMethodEnum(str, Enum):
    CIB = "cib"
    DAHABIA = "dahabia"
    BARIDIMOB = "baridimob"


class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REFUNDED = "refunded"
    FAILED = "failed"


class ProcessPaymentRequest(BaseModel):
    """Customer submits a payment for Safe Pay deposit."""
    order_id: str
    method: PaymentMethodEnum
    # Simulated card info (for demo)
    card_number: Optional[str] = None  # e.g. "4111111111111111"
    card_holder: Optional[str] = None
    expiry: Optional[str] = None  # MM/YY
    cvv: Optional[str] = None


class PaymentResponse(BaseModel):
    id: str
    order_id: str
    customer_id: str
    amount: float
    method: PaymentMethodEnum
    status: PaymentStatusEnum
    payment_type: str
    transaction_ref: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WalletSummaryResponse(BaseModel):
    """Customer's financial summary."""
    total_deposits: float = 0.0
    total_paid_at_delivery: float = 0.0
    total_refunded: float = 0.0
    active_deposits: float = 0.0
    order_count: int = 0
