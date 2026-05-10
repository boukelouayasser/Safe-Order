"""
Safe Order — Orders Router
Core business logic: order creation, pipeline management, status transitions,
customer link system, and Smart Badges.
"""
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User, MerchantProfile, Order, TrackingEvent, Payment,
    UserRole, OrderStatus, OrderBadge, PaymentStatus, DeliveryMode,
    generate_tracking_code,
)
from app.schemas.orders import (
    CreateOrderRequest, CustomerFillOrderRequest, UpdateOrderStatusRequest,
    UpdateOrderRequest,
    OrderResponse, OrderSummaryResponse, OrderLinkResponse,
    TrackingEventResponse, PipelineCountsResponse,
)
from app.dependencies import get_current_user, get_current_merchant
from app.config import settings
from app.services.pdf_service import generate_tracking_label
from app.services.remark_dates import extract_delivery_date, is_d_minus_one

router = APIRouter()


# ──────────────────────────────────────────────
# Badge Logic
# ──────────────────────────────────────────────

def compute_badge(order: Order, db: Session) -> Optional[OrderBadge]:
    """
    Compute the Smart Badge for an order.
    - SAFE_PAY: deposit confirmed
    - LOYAL: customer has 3+ previous delivered orders
    - RISK: risk_score >= 60
    - NEW: first order from this customer (call required)
    """
    # Check Safe Pay
    has_safe_pay = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.status == PaymentStatus.CONFIRMED,
    ).first() is not None

    if has_safe_pay:
        return OrderBadge.SAFE_PAY

    # Check risk
    if order.risk_score >= 60:
        return OrderBadge.RISK

    # Check loyalty (customer has 3+ delivered orders with this merchant)
    if order.customer_id:
        delivered_count = db.query(func.count(Order.id)).filter(
            Order.customer_id == order.customer_id,
            Order.merchant_id == order.merchant_id,
            Order.status == OrderStatus.DELIVERED,
            Order.id != order.id,
        ).scalar() or 0

        if delivered_count >= 3:
            return OrderBadge.LOYAL

    # Default: NEW
    return OrderBadge.NEW


# ──────────────────────────────────────────────
# Merchant: Create Order
# ──────────────────────────────────────────────

@router.post("/", response_model=OrderLinkResponse, status_code=201)
def create_order(
    req: CreateOrderRequest,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Merchant creates a new order (product info only).
    Returns a unique link for the customer to fill delivery info.
    """
    # Check Safe Standards
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if not profile or not profile.safe_standards_accepted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous devez accepter les Safe Standards avant de créer des commandes",
        )

    # Calculate Safe Pay deposit
    safe_pay_amount = round(req.product_price * (req.safe_pay_percentage / 100), 2)

    order = Order(
        merchant_id=current_user.id,
        product_name=req.product_name,
        product_description=req.product_description,
        product_photos=req.product_photos,
        product_price=req.product_price,
        delivery_fee=req.delivery_fee,
        safe_pay_amount=safe_pay_amount,
        remaining_amount=round(req.product_price + req.delivery_fee - safe_pay_amount, 2),
        status=OrderStatus.CONFIRMATION,
        badge=OrderBadge.NEW,
    )
    db.add(order)
    db.flush()

    # Add initial tracking event
    event = TrackingEvent(
        order_id=order.id,
        status=OrderStatus.CONFIRMATION,
        note="Commande créée par le marchand",
    )
    db.add(event)

    # Update merchant stats
    profile.total_orders += 1
    db.commit()
    db.refresh(order)

    # Build customer link
    base_url = settings.FRONTEND_URL
    customer_link = f"{base_url}/order/{order.order_link_token}"

    return OrderLinkResponse(
        order=OrderResponse.model_validate(order),
        customer_link=customer_link,
    )


# ──────────────────────────────────────────────
# Customer: Access Order via Link
# ──────────────────────────────────────────────

@router.get("/link/{token}", response_model=OrderResponse)
def get_order_by_link(token: str, db: Session = Depends(get_db)):
    """
    Customer accesses an order via unique link token.
    No authentication required — the link IS the access.
    """
    order = db.query(Order).filter(Order.order_link_token == token).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lien de commande invalide ou expiré",
        )
    return OrderResponse.model_validate(order)


@router.post("/link/{token}/fill", response_model=OrderResponse)
def customer_fill_order(
    token: str,
    req: CustomerFillOrderRequest,
    db: Session = Depends(get_db),
):
    """
    Customer fills their delivery info via the order link.
    This confirms the order and assigns the customer.
    """
    order = db.query(Order).filter(Order.order_link_token == token).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lien de commande invalide")

    if order.customer_id and order.status != OrderStatus.CONFIRMATION:
        raise HTTPException(
            status_code=400,
            detail="Cette commande a déjà été remplie",
        )

    # Find or create customer.
    # The User.phone column has a UNIQUE constraint, so before creating a
    # CUSTOMER row we must make sure no other-role user (merchant/admin) is
    # already squatting on this phone — otherwise the INSERT would 500.
    customer = db.query(User).filter(
        User.phone == req.phone,
        User.role == UserRole.CUSTOMER,
    ).first()

    if not customer:
        clash = db.query(User).filter(
            User.phone == req.phone,
            User.role != UserRole.CUSTOMER,
        ).first()
        if clash:
            raise HTTPException(
                status_code=400,
                detail="Ce numéro de téléphone est déjà utilisé par un compte non-client",
            )
        customer = User(
            role=UserRole.CUSTOMER,
            first_name=req.first_name,
            last_name=req.last_name,
            phone=req.phone,
            wilaya=req.wilaya,
            municipality=req.municipality,
            address=req.address,
            is_verified=settings.DEMO_MODE,
        )
        db.add(customer)
        db.flush()
    else:
        # Update last-known info for the recurring customer
        customer.first_name = req.first_name or customer.first_name
        customer.last_name = req.last_name or customer.last_name
        customer.wilaya = req.wilaya or customer.wilaya
        customer.municipality = req.municipality or customer.municipality
        customer.address = req.address or customer.address

    # Fill order
    order.customer_id = customer.id
    order.customer_first_name = req.first_name
    order.customer_last_name = req.last_name
    order.customer_phone = req.phone
    order.delivery_company = req.delivery_company
    order.delivery_mode = DeliveryMode(req.delivery_mode.value)
    order.customer_wilaya = req.wilaya
    order.customer_municipality = req.municipality
    order.customer_address = req.address
    # Preserve a previously-saved remark when the re-fill payload omits it
    # (the frontend re-renders the form from the saved order, but a partial
    # client could still POST a fill without the remark field).
    if req.remark is not None:
        order.customer_remark = req.remark
    order.confirmed_at = datetime.utcnow()

    # Compute risk and badge
    from models.risk_predictor import predict_risk

    # Count customer history
    customer_order_count = db.query(func.count(Order.id)).filter(
        Order.customer_id == customer.id,
        Order.id != order.id,
    ).scalar() or 0

    customer_delivered = db.query(func.count(Order.id)).filter(
        Order.customer_id == customer.id,
        Order.status == OrderStatus.DELIVERED,
    ).scalar() or 0

    customer_returned = db.query(func.count(Order.id)).filter(
        Order.customer_id == customer.id,
        Order.status == OrderStatus.RETURN_PROCESSED,
    ).scalar() or 0

    risk_result = predict_risk(
        customer_phone=req.phone,
        customer_wilaya=req.wilaya,
        customer_order_count=customer_order_count,
        customer_pickup_count=customer_delivered,
        customer_return_count=customer_returned,
        has_safe_pay=False,  # Not paid yet at this point
        safe_pay_amount=order.safe_pay_amount,
        product_price=order.product_price,
        delivery_company=req.delivery_company,
        customer_remark=req.remark,
    )

    order.risk_score = risk_result["risk_score"]
    order.badge = compute_badge(order, db)

    # Add tracking event
    event = TrackingEvent(
        order_id=order.id,
        status=OrderStatus.CONFIRMATION,
        note=f"Informations de livraison remplies par {req.first_name} {req.last_name}",
    )
    db.add(event)

    db.commit()
    db.refresh(order)

    return OrderResponse.model_validate(order)


# ──────────────────────────────────────────────
# Merchant: Pipeline & Order Management
# ──────────────────────────────────────────────

@router.get("/pipeline/counts", response_model=PipelineCountsResponse)
def get_pipeline_counts(
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """Get count of orders per pipeline stage for the current merchant."""
    counts = {}
    for s in OrderStatus:
        count = db.query(func.count(Order.id)).filter(
            Order.merchant_id == current_user.id,
            Order.status == s,
        ).scalar() or 0
        counts[s.value] = count

    total = sum(counts.values())
    return PipelineCountsResponse(
        confirmation=counts.get("confirmation", 0),
        preparation=counts.get("preparation", 0),
        dispatch=counts.get("dispatch", 0),
        delivery=counts.get("delivery", 0),
        delivered=counts.get("delivered", 0),
        return_processed=counts.get("return_processed", 0),
        total=total,
    )


@router.get("/pipeline/{status_filter}", response_model=list[OrderSummaryResponse])
def get_orders_by_status(
    status_filter: str,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Get orders filtered by pipeline status for the current merchant."""
    try:
        order_status = OrderStatus(status_filter)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Statut invalide: {status_filter}")

    orders = db.query(Order).filter(
        Order.merchant_id == current_user.id,
        Order.status == order_status,
    ).order_by(Order.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return [OrderSummaryResponse.model_validate(o) for o in orders]


@router.get("/all", response_model=list[OrderSummaryResponse])
def get_all_orders(
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    """Get all orders for the current merchant."""
    orders = db.query(Order).filter(
        Order.merchant_id == current_user.id,
    ).order_by(Order.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return [OrderSummaryResponse.model_validate(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full order details. Accessible by the merchant owner or the customer."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Access control
    if current_user.role == UserRole.MERCHANT and order.merchant_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    if current_user.role == UserRole.CUSTOMER and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    return OrderResponse.model_validate(order)


@router.get("/{order_id}/tracking", response_model=list[TrackingEventResponse])
def get_order_tracking(
    order_id: str,
    db: Session = Depends(get_db),
):
    """Get tracking events for an order. Public endpoint (accessible via tracking code too)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    events = db.query(TrackingEvent).filter(
        TrackingEvent.order_id == order_id
    ).order_by(TrackingEvent.created_at.asc()).all()

    return [TrackingEventResponse.model_validate(e) for e in events]


@router.get("/track/{tracking_code}", response_model=OrderResponse)
def get_order_by_tracking_code(
    tracking_code: str,
    db: Session = Depends(get_db),
):
    """Public: get order by tracking code (for Safe Track)."""
    order = db.query(Order).filter(Order.tracking_code == tracking_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Code de suivi invalide")
    return OrderResponse.model_validate(order)


# ──────────────────────────────────────────────
# Merchant: Modify & Delete Orders
# ──────────────────────────────────────────────

EDITABLE_STATUSES = {OrderStatus.CONFIRMATION, OrderStatus.PREPARATION}


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    req: UpdateOrderRequest,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Merchant modifies an order (product info, pricing).
    Only allowed while order is in Confirmation or Preparation stage.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.merchant_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Modification impossible — la commande est en '{order.status.value}'. "
                   f"Seules les commandes en confirmation ou préparation peuvent être modifiées.",
        )

    if req.product_name is not None:
        order.product_name = req.product_name
    if req.product_description is not None:
        order.product_description = req.product_description
    if req.product_price is not None:
        order.product_price = req.product_price
    if req.delivery_fee is not None:
        order.delivery_fee = req.delivery_fee
    if req.safe_pay_percentage is not None:
        order.safe_pay_amount = round(order.product_price * (req.safe_pay_percentage / 100), 2)

    # Recalculate remaining
    order.remaining_amount = round(
        order.product_price + order.delivery_fee - order.safe_pay_amount, 2
    )
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return OrderResponse.model_validate(order)


@router.delete("/{order_id}")
def delete_order(
    order_id: str,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Merchant deletes an order.
    Only allowed while order is in Confirmation or Preparation stage.
    Deletes tracking events and payments too (cascade).
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.merchant_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Suppression impossible — la commande est en '{order.status.value}'. "
                   f"Seules les commandes en confirmation ou préparation peuvent être supprimées.",
        )

    # Update merchant stats
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()
    if profile and profile.total_orders > 0:
        profile.total_orders -= 1

    # Delete related records
    db.query(TrackingEvent).filter(TrackingEvent.order_id == order_id).delete()
    db.query(Payment).filter(Payment.order_id == order_id).delete()
    db.delete(order)
    db.commit()

    return {"message": "Commande supprimée avec succès", "order_id": order_id}


# ──────────────────────────────────────────────
# Status Transitions
# ──────────────────────────────────────────────

VALID_TRANSITIONS = {
    OrderStatus.CONFIRMATION: [OrderStatus.PREPARATION],
    OrderStatus.PREPARATION: [OrderStatus.DISPATCH],
    OrderStatus.DISPATCH: [OrderStatus.DELIVERY],
    OrderStatus.DELIVERY: [OrderStatus.DELIVERED, OrderStatus.RETURN_PROCESSED],
    OrderStatus.DELIVERED: [],  # Final
    OrderStatus.RETURN_PROCESSED: [],  # Final
}

STATUS_TIMESTAMPS = {
    OrderStatus.CONFIRMATION: "confirmed_at",
    OrderStatus.PREPARATION: "prepared_at",
    OrderStatus.DISPATCH: "dispatched_at",
    OrderStatus.DELIVERY: None,  # No specific timestamp
    OrderStatus.DELIVERED: "delivered_at",
    OrderStatus.RETURN_PROCESSED: "returned_at",
}


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    req: UpdateOrderStatusRequest,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Advance an order to the next pipeline stage.
    Validates transition rules.
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.merchant_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Validate transition
    new_status = OrderStatus(req.status.value)
    valid_next = VALID_TRANSITIONS.get(order.status, [])

    if new_status not in valid_next:
        raise HTTPException(
            status_code=400,
            detail=f"Transition invalide: {order.status.value} → {new_status.value}. "
                   f"Transitions possibles: {[s.value for s in valid_next]}",
        )

    # Update status
    order.status = new_status

    # Set timestamp
    ts_field = STATUS_TIMESTAMPS.get(new_status)
    if ts_field:
        setattr(order, ts_field, datetime.utcnow())

    # Add tracking event
    event = TrackingEvent(
        order_id=order.id,
        status=new_status,
        note=req.note,
    )
    db.add(event)

    # Update merchant stats on final statuses
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if new_status == OrderStatus.DELIVERED and profile:
        profile.total_delivered += 1
    elif new_status == OrderStatus.RETURN_PROCESSED and profile:
        profile.total_returned += 1

    # Recompute badge
    order.badge = compute_badge(order, db)

    db.commit()
    db.refresh(order)

    return OrderResponse.model_validate(order)


# ──────────────────────────────────────────────
# Customer: My Orders
# ──────────────────────────────────────────────

@router.get("/customer/my-orders", response_model=list[OrderSummaryResponse])
def get_customer_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all orders for the current customer (identified by phone)."""
    orders = db.query(Order).filter(
        Order.customer_phone == current_user.phone,
    ).order_by(Order.created_at.desc()).all()

    return [OrderSummaryResponse.model_validate(o) for o in orders]


@router.get("/customer/by-phone/{phone}", response_model=list[OrderSummaryResponse])
def get_orders_by_phone(
    phone: str,
    db: Session = Depends(get_db),
):
    """
    Get all orders for a phone number.
    Public endpoint — customers don't have accounts, they identify by phone.
    """
    orders = db.query(Order).filter(
        Order.customer_phone == phone,
    ).order_by(Order.created_at.desc()).all()

    return [OrderSummaryResponse.model_validate(o) for o in orders]


# ──────────────────────────────────────────────
# F06 — Tracking label PDF + D-1 remark alerts
# ──────────────────────────────────────────────

@router.get("/{order_id}/label", response_class=Response)
def get_tracking_label(
    order_id: str,
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """Generate the PDF tracking slip for an order owned by this merchant."""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.merchant_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    if not order.customer_first_name:
        raise HTTPException(
            status_code=400,
            detail="Le client doit d'abord remplir ses informations avant l'impression",
        )

    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id,
    ).first()
    store_name = profile.store_name if profile else None

    pdf_bytes = generate_tracking_label(order, current_user, store_name=store_name)
    filename = f"safeorder-{order.tracking_code}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/alerts/d-minus-1")
def list_d_minus_1_alerts(
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Return active orders whose customer remark mentions a date.
    A flag ``is_d_minus_1`` is set when that date is exactly tomorrow.
    """
    active_statuses = (
        OrderStatus.CONFIRMATION,
        OrderStatus.PREPARATION,
        OrderStatus.DISPATCH,
        OrderStatus.DELIVERY,
    )
    rows = db.query(Order).filter(
        Order.merchant_id == current_user.id,
        Order.status.in_(active_statuses),
        Order.customer_remark.isnot(None),
    ).all()

    today = date.today()
    out = []
    for o in rows:
        target = extract_delivery_date(o.customer_remark, today=today)
        if not target:
            continue
        out.append({
            "order_id": o.id,
            "tracking_code": o.tracking_code,
            "product_name": o.product_name,
            "customer_name": f"{o.customer_first_name or ''} {o.customer_last_name or ''}".strip(),
            "customer_phone": o.customer_phone,
            "remark": o.customer_remark,
            "delivery_date": target.isoformat(),
            "days_until": (target - today).days,
            "is_d_minus_1": is_d_minus_one(target, today=today),
        })

    out.sort(key=lambda r: r["delivery_date"])
    return {"today": today.isoformat(), "alerts": out}
