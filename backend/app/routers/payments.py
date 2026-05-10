"""
Safe Order — Payments Router
Simulated payment gateway for CIB, Dahabia, and BaridiMob.
In demo mode, all payments succeed instantly.
"""
import uuid
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Order, Payment, User,
    PaymentMethod, PaymentStatus, PaymentType, OrderBadge, UserRole, OrderStatus,
)
from app.schemas.payments import (
    ProcessPaymentRequest, PaymentResponse, WalletSummaryResponse,
)
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()


# ──────────────────────────────────────────────
# Payment Processing (Simulated)
# ──────────────────────────────────────────────

def simulate_payment(method: PaymentMethod, card_number: str = None) -> dict:
    """
    Simulate a payment transaction.
    In demo mode, always succeeds.
    Returns transaction reference and status.
    """
    prefix_map = {
        PaymentMethod.CIB: "CIB",
        PaymentMethod.DAHABIA: "DAH",
        PaymentMethod.BARIDIMOB: "BM",
    }
    prefix = prefix_map.get(method, "PAY")
    transaction_ref = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

    if settings.DEMO_PAYMENT_SUCCESS:
        return {
            "success": True,
            "transaction_ref": transaction_ref,
            "message": "Paiement accepté",
        }
    else:
        return {
            "success": False,
            "transaction_ref": None,
            "message": "Paiement refusé — vérifiez vos informations",
        }


@router.post("/process", response_model=PaymentResponse, status_code=201)
def process_payment(
    req: ProcessPaymentRequest,
    db: Session = Depends(get_db),
):
    """
    Process a Safe Pay deposit payment.
    Simulates CIB/Dahabia/BaridiMob gateway.
    """
    # Get the order
    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.safe_pay_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Cette commande ne nécessite pas de Safe Pay",
        )

    if not order.customer_id:
        raise HTTPException(
            status_code=400,
            detail="Le client doit d'abord remplir ses informations de livraison",
        )

    # Check if already paid
    existing = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.payment_type == PaymentType.DEPOSIT,
        Payment.status == PaymentStatus.CONFIRMED,
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Le dépôt Safe Pay a déjà été payé pour cette commande",
        )

    # Simulate payment
    result = simulate_payment(
        method=PaymentMethod(req.method.value),
        card_number=req.card_number,
    )

    payment_status = PaymentStatus.CONFIRMED if result["success"] else PaymentStatus.FAILED

    payment = Payment(
        order_id=order.id,
        customer_id=order.customer_id,
        amount=order.safe_pay_amount,
        method=PaymentMethod(req.method.value),
        status=payment_status,
        payment_type=PaymentType.DEPOSIT,
        transaction_ref=result["transaction_ref"],
        confirmed_at=datetime.utcnow() if result["success"] else None,
    )
    db.add(payment)

    if result["success"]:
        # Update order badge to SAFE_PAY
        order.badge = OrderBadge.SAFE_PAY

    db.commit()
    db.refresh(payment)

    if not result["success"]:
        raise HTTPException(
            status_code=402,
            detail=result["message"],
        )

    return PaymentResponse.model_validate(payment)


@router.get("/order/{order_id}", response_model=list[PaymentResponse])
def get_order_payments(
    order_id: str,
    db: Session = Depends(get_db),
):
    """Get all payments for an order."""
    payments = db.query(Payment).filter(
        Payment.order_id == order_id
    ).order_by(Payment.created_at.desc()).all()
    return [PaymentResponse.model_validate(p) for p in payments]


@router.get("/wallet/{phone}", response_model=WalletSummaryResponse)
def get_wallet(
    phone: str,
    db: Session = Depends(get_db),
):
    """Get wallet summary for a customer (by phone)."""
    # Find customer
    customer = db.query(User).filter(
        User.phone == phone,
        User.role == UserRole.CUSTOMER,
    ).first()

    if not customer:
        return WalletSummaryResponse()

    # Calculate totals
    total_deposits = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.customer_id == customer.id,
        Payment.payment_type == PaymentType.DEPOSIT,
        Payment.status == PaymentStatus.CONFIRMED,
    ).scalar()

    total_refunded = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.customer_id == customer.id,
        Payment.payment_type == PaymentType.REFUND,
        Payment.status == PaymentStatus.CONFIRMED,
    ).scalar()

    order_count = db.query(func.count(Order.id)).filter(
        Order.customer_id == customer.id,
    ).scalar()

    return WalletSummaryResponse(
        total_deposits=float(total_deposits),
        total_refunded=float(total_refunded),
        active_deposits=float(total_deposits) - float(total_refunded),
        order_count=order_count or 0,
    )


@router.get("/wallet/{phone}/history")
def get_wallet_history(
    phone: str,
    period: str = Query("monthly", pattern="^(weekly|monthly)$"),
    db: Session = Depends(get_db),
):
    """F10 — Cart + Wallet weekly/monthly breakdown.

    Groups the customer's orders by week or month, summing prices, the Safe Pay
    deposit, and the remaining-to-pay-at-delivery amount. Returns one bucket per
    period, each with the per-order rows so the frontend can render an expandable
    list.
    """
    customer = db.query(User).filter(
        User.phone == phone,
        User.role == UserRole.CUSTOMER,
    ).first()

    customer_id = customer.id if customer else None

    orders = db.query(Order).filter(
        (Order.customer_id == customer_id) if customer_id else (Order.customer_phone == phone),
    ).order_by(Order.created_at.desc()).all()

    def bucket_key(d: datetime) -> tuple[str, str, str]:
        """Returns (key, label, sort_key)."""
        if period == "weekly":
            iso = d.isocalendar()
            start = (d - timedelta(days=d.weekday())).date()
            end = start + timedelta(days=6)
            return (
                f"{iso.year}-W{iso.week:02d}",
                f"{start.strftime('%d %b')} → {end.strftime('%d %b %Y')}",
                f"{iso.year}{iso.week:02d}",
            )
        return (
            f"{d.year}-{d.month:02d}",
            d.strftime("%B %Y"),
            f"{d.year}{d.month:02d}",
        )

    buckets: dict[str, dict] = {}
    for o in orders:
        key, label, sort_key = bucket_key(o.created_at)
        b = buckets.setdefault(key, {
            "key": key,
            "label": label,
            "sort_key": sort_key,
            "total_price": 0.0,
            "total_deposit": 0.0,
            "total_remaining": 0.0,
            "delivery_fees": 0.0,
            "order_count": 0,
            "delivered": 0,
            "returned": 0,
            "orders": [],
        })
        b["total_price"] += o.product_price or 0
        b["total_deposit"] += o.safe_pay_amount or 0
        b["total_remaining"] += o.remaining_amount or 0
        b["delivery_fees"] += o.delivery_fee or 0
        b["order_count"] += 1
        if o.status == OrderStatus.DELIVERED:
            b["delivered"] += 1
        elif o.status == OrderStatus.RETURN_PROCESSED:
            b["returned"] += 1
        b["orders"].append({
            "id": o.id,
            "tracking_code": o.tracking_code,
            "product_name": o.product_name,
            "product_price": o.product_price,
            "delivery_fee": o.delivery_fee,
            "safe_pay_amount": o.safe_pay_amount,
            "remaining_amount": o.remaining_amount,
            "status": o.status.value,
            "created_at": o.created_at.isoformat(),
        })

    # Round + sort newest first
    series = sorted(buckets.values(), key=lambda b: b["sort_key"], reverse=True)
    for b in series:
        for k in ("total_price", "total_deposit", "total_remaining", "delivery_fees"):
            b[k] = round(b[k], 2)
        b.pop("sort_key", None)

    return {
        "phone": phone,
        "period": period,
        "buckets": series,
    }


@router.post("/refund/{order_id}", response_model=PaymentResponse)
def refund_deposit(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Refund the Safe Pay deposit for a returned order.
    Only merchants/admins can initiate refunds.
    """
    if current_user.role not in [UserRole.MERCHANT, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    # Find the original deposit
    deposit = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.payment_type == PaymentType.DEPOSIT,
        Payment.status == PaymentStatus.CONFIRMED,
    ).first()

    if not deposit:
        raise HTTPException(
            status_code=400,
            detail="Aucun dépôt confirmé trouvé pour cette commande",
        )

    # Check for existing refund
    existing_refund = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.payment_type == PaymentType.REFUND,
    ).first()

    if existing_refund:
        raise HTTPException(
            status_code=400,
            detail="Un remboursement a déjà été effectué",
        )

    # Create refund
    refund = Payment(
        order_id=order.id,
        customer_id=deposit.customer_id,
        amount=deposit.amount,
        method=deposit.method,
        status=PaymentStatus.CONFIRMED,
        payment_type=PaymentType.REFUND,
        transaction_ref=f"REF-{deposit.transaction_ref}",
        confirmed_at=datetime.utcnow(),
    )
    db.add(refund)

    # Update original deposit status
    deposit.status = PaymentStatus.REFUNDED

    db.commit()
    db.refresh(refund)

    return PaymentResponse.model_validate(refund)
