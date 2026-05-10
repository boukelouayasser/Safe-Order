"""
Safe Order — Admin Router
Platform administration: user management, moderation, global stats.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User, MerchantProfile, Order, Payment, Feedback,
    UserRole, OrderStatus, PaymentStatus, PaymentType,
)
from app.dependencies import get_current_admin

router = APIRouter()


@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Global platform dashboard for administrators."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_merchants = db.query(func.count(User.id)).filter(User.role == UserRole.MERCHANT).scalar() or 0
    total_customers = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_delivered = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.DELIVERED).scalar() or 0
    total_returned = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.RETURN_PROCESSED).scalar() or 0

    total_revenue = db.query(func.coalesce(func.sum(Order.product_price), 0)).filter(
        Order.status == OrderStatus.DELIVERED
    ).scalar()

    total_safe_pay = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_type == PaymentType.DEPOSIT,
        Payment.status == PaymentStatus.CONFIRMED,
    ).scalar()

    avg_trust = db.query(func.coalesce(func.avg(User.trust_score), 0)).filter(
        User.role == UserRole.MERCHANT
    ).scalar()

    return {
        "users": {
            "total": total_users,
            "merchants": total_merchants,
            "customers": total_customers,
        },
        "orders": {
            "total": total_orders,
            "delivered": total_delivered,
            "returned": total_returned,
            "delivery_rate": round((total_delivered / max(total_orders, 1)) * 100, 1),
            "return_rate": round((total_returned / max(total_orders, 1)) * 100, 1),
        },
        "financial": {
            "total_revenue": float(total_revenue),
            "total_safe_pay_collected": float(total_safe_pay),
        },
        "platform": {
            "avg_merchant_trust_score": round(float(avg_trust), 1),
        },
    }


@router.get("/users")
def list_users(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    role: str = None,
):
    """List all users, optionally filtered by role."""
    query = db.query(User)
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Rôle invalide: {role}")

    users = query.order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "role": u.role.value,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "phone": u.phone,
            "email": u.email,
            "wilaya": u.wilaya,
            "trust_score": u.trust_score,
            "is_verified": u.is_verified,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Activate or deactivate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    user.is_active = not user.is_active
    db.commit()

    return {
        "message": f"Utilisateur {'activé' if user.is_active else 'désactivé'}",
        "user_id": user.id,
        "is_active": user.is_active,
    }


@router.get("/orders")
def admin_list_orders(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    status: str = None,
):
    """List all orders across the platform."""
    query = db.query(Order)
    if status:
        try:
            query = query.filter(Order.status == OrderStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Statut invalide: {status}")

    orders = query.order_by(Order.created_at.desc()).limit(100).all()
    return [
        {
            "id": o.id,
            "tracking_code": o.tracking_code,
            "product_name": o.product_name,
            "product_price": o.product_price,
            "status": o.status.value,
            "badge": o.badge.value if o.badge else None,
            "merchant_id": o.merchant_id,
            "customer_phone": o.customer_phone,
            "safe_pay_amount": o.safe_pay_amount,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]


@router.get("/merchants")
def admin_list_merchants(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all merchants with their profiles."""
    merchants = db.query(User).filter(User.role == UserRole.MERCHANT).all()
    result = []
    for m in merchants:
        profile = db.query(MerchantProfile).filter(MerchantProfile.user_id == m.id).first()
        result.append({
            "id": m.id,
            "first_name": m.first_name,
            "last_name": m.last_name,
            "phone": m.phone,
            "email": m.email,
            "store_name": profile.store_name if profile else None,
            "safe_standards_accepted": profile.safe_standards_accepted if profile else False,
            "total_orders": profile.total_orders if profile else 0,
            "total_delivered": profile.total_delivered if profile else 0,
            "total_returned": profile.total_returned if profile else 0,
            "trust_score": m.trust_score,
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat(),
        })
    return result
