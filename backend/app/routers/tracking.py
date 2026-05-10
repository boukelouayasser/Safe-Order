"""
Safe Order — Tracking Router (Safe Track)
Real-time order tracking, customer remarks, and timeline.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Order, TrackingEvent, OrderStatus
from app.schemas.orders import OrderResponse, TrackingEventResponse

router = APIRouter()


class AddRemarkRequest(BaseModel):
    remark: str
    phone: str  # Customer identifies by phone


class TrackingDetailResponse(BaseModel):
    order: OrderResponse
    events: list[TrackingEventResponse]
    estimated_delivery: Optional[str] = None


# ──────────────────────────────────────────────
# Public Tracking (Safe Track)
# ──────────────────────────────────────────────

@router.get("/track/{tracking_code}", response_model=TrackingDetailResponse)
def track_order(tracking_code: str, db: Session = Depends(get_db)):
    """
    Public tracking page — anyone with the tracking code can view status.
    Returns order details + full timeline.
    """
    order = db.query(Order).filter(
        Order.tracking_code == tracking_code.upper()
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Code de suivi invalide")

    events = db.query(TrackingEvent).filter(
        TrackingEvent.order_id == order.id
    ).order_by(TrackingEvent.created_at.asc()).all()

    # Estimate delivery based on status
    estimated = None
    if order.status in [OrderStatus.DISPATCH, OrderStatus.DELIVERY]:
        estimated = "24-48h"
    elif order.status == OrderStatus.PREPARATION:
        estimated = "2-3 jours"

    return TrackingDetailResponse(
        order=OrderResponse.model_validate(order),
        events=[TrackingEventResponse.model_validate(e) for e in events],
        estimated_delivery=estimated,
    )


@router.post("/track/{tracking_code}/remark")
def add_customer_remark(
    tracking_code: str,
    req: AddRemarkRequest,
    db: Session = Depends(get_db),
):
    """
    Customer adds a free remark to their order.
    Identified by phone number — no auth required.
    """
    order = db.query(Order).filter(
        Order.tracking_code == tracking_code.upper()
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Code de suivi invalide")

    # Verify phone matches
    if order.customer_phone != req.phone:
        raise HTTPException(
            status_code=403,
            detail="Ce numéro ne correspond pas à la commande",
        )

    # Update remark on order
    order.customer_remark = req.remark
    order.updated_at = datetime.utcnow()

    # Add tracking event
    event = TrackingEvent(
        order_id=order.id,
        status=order.status,
        note=f"Remarque client: {req.remark}",
    )
    db.add(event)
    db.commit()

    # Check for date-based alert (D-1 remark)
    import re
    date_pattern = r'\d{1,2}[/\-]\d{1,2}[/\-]?\d{0,4}'
    if re.search(date_pattern, req.remark):
        return {
            "message": "Remarque enregistrée",
            "alert": "⚠️ Date détectée dans la remarque — alerte D-1 programmée pour le marchand",
        }

    return {"message": "Remarque enregistrée avec succès"}


@router.get("/by-phone/{phone}", response_model=list[OrderResponse])
def get_orders_by_phone(phone: str, db: Session = Depends(get_db)):
    """
    Get all orders for a phone number — customer's order history.
    No auth required, phone is the identifier.
    """
    orders = db.query(Order).filter(
        Order.customer_phone == phone
    ).order_by(Order.created_at.desc()).all()

    return [OrderResponse.model_validate(o) for o in orders]
