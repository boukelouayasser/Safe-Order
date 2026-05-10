"""
Safe Order — Feedback Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SubmitFeedbackRequest(BaseModel):
    """Customer submits post-delivery feedback."""
    order_id: str
    rating: int = Field(..., ge=1, le=5)
    criteria: List[str] = Field(default_factory=list)
    # Valid criteria: conforming, fast_delivery, good_packaging,
    # different_color, damaged, non_conforming, slow_delivery
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    order_id: str
    customer_id: str
    merchant_id: str
    rating: int
    criteria: List[str]
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrustScoreResponse(BaseModel):
    """Trust Score details."""
    score: float
    level: str  # "bronze", "silver", "gold", "platinum"
    total_orders: int
    delivery_rate: float
    avg_rating: float
    components: dict  # Breakdown of score components
