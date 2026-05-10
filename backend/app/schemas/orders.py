"""
Safe Order — Order Schemas
Pydantic models for order-related request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrderStatusEnum(str, Enum):
    CONFIRMATION = "confirmation"
    PREPARATION = "preparation"
    DISPATCH = "dispatch"
    DELIVERY = "delivery"
    DELIVERED = "delivered"
    RETURN_PROCESSED = "return_processed"


class OrderBadgeEnum(str, Enum):
    SAFE_PAY = "safe_pay"
    NEW = "new"
    LOYAL = "loyal"
    RISK = "risk"


class DeliveryModeEnum(str, Enum):
    HOME = "home"
    PICKUP = "pickup"


class PaymentMethodEnum(str, Enum):
    CIB = "cib"
    DAHABIA = "dahabia"
    BARIDIMOB = "baridimob"


# ──────────────────────────────────────────────
# Order Requests
# ──────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    """Merchant creates an order (product info only — customer fills rest via link)."""
    product_name: str = Field(..., min_length=2, max_length=300)
    product_description: Optional[str] = None
    product_photos: List[str] = Field(default_factory=list)
    product_price: float = Field(..., gt=0)
    delivery_fee: float = Field(default=0.0, ge=0)
    safe_pay_percentage: float = Field(default=20.0, ge=0, le=100)  # % of price as deposit


class CustomerFillOrderRequest(BaseModel):
    """Customer fills their delivery info via the order link."""
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    delivery_company: str = Field(..., max_length=100)
    delivery_mode: DeliveryModeEnum
    wilaya: str = Field(..., max_length=100)
    municipality: str = Field(..., max_length=100)
    address: str = Field(..., max_length=500)
    remark: Optional[str] = None


class UpdateOrderStatusRequest(BaseModel):
    """Merchant or system updates order status."""
    status: OrderStatusEnum
    note: Optional[str] = None


class UpdateOrderRequest(BaseModel):
    """Merchant updates order product/delivery info (only before dispatch)."""
    product_name: Optional[str] = Field(None, min_length=2, max_length=300)
    product_description: Optional[str] = None
    product_price: Optional[float] = Field(None, gt=0)
    delivery_fee: Optional[float] = Field(None, ge=0)
    safe_pay_percentage: Optional[float] = Field(None, ge=0, le=100)


# ──────────────────────────────────────────────
# Order Responses
# ──────────────────────────────────────────────

class OrderResponse(BaseModel):
    id: str
    merchant_id: str
    customer_id: Optional[str] = None
    tracking_code: str
    order_link_token: str

    product_name: str
    product_description: Optional[str] = None
    product_photos: List[str] = []
    product_price: float

    delivery_company: Optional[str] = None
    delivery_mode: Optional[DeliveryModeEnum] = None
    delivery_fee: float = 0.0
    customer_wilaya: Optional[str] = None
    customer_municipality: Optional[str] = None
    customer_address: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_first_name: Optional[str] = None
    customer_last_name: Optional[str] = None
    customer_remark: Optional[str] = None

    safe_pay_amount: float = 0.0
    remaining_amount: float = 0.0

    status: OrderStatusEnum
    badge: Optional[OrderBadgeEnum] = None
    risk_score: float = 0.0

    confirmed_at: Optional[datetime] = None
    prepared_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderSummaryResponse(BaseModel):
    """Lightweight order for lists."""
    id: str
    tracking_code: str
    product_name: str
    product_price: float
    status: OrderStatusEnum
    badge: Optional[OrderBadgeEnum] = None
    customer_first_name: Optional[str] = None
    customer_last_name: Optional[str] = None
    customer_wilaya: Optional[str] = None
    safe_pay_amount: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class OrderLinkResponse(BaseModel):
    """Response when merchant creates an order — includes the customer link."""
    order: OrderResponse
    customer_link: str  # Full URL for the customer


class TrackingEventResponse(BaseModel):
    id: str
    status: OrderStatusEnum
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PipelineCountsResponse(BaseModel):
    """Count of orders per pipeline stage."""
    confirmation: int = 0
    preparation: int = 0
    dispatch: int = 0
    delivery: int = 0
    delivered: int = 0
    return_processed: int = 0
    total: int = 0
