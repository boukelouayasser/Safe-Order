"""
Safe Order — Statistics Router
Merchant dashboard statistics and Safe Insights.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models import (
    User, MerchantProfile, Order, Feedback, ReturnAnalysis, Payment,
    OrderStatus, UserRole, PaymentType, PaymentStatus,
)
from app.dependencies import get_current_merchant, get_current_user
from app.config import settings

router = APIRouter()


@router.get("/dashboard")
def get_dashboard_stats(
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Complete merchant dashboard statistics.
    FR-07: Delivery rate, return rate, Trust Score, best sellers, feedbacks.
    """
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand non trouvé")

    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    two_months_ago = now - timedelta(days=60)

    # ── Current month stats ──
    current_month_orders = db.query(func.count(Order.id)).filter(
        Order.merchant_id == current_user.id,
        Order.created_at >= month_ago,
    ).scalar() or 0

    current_month_delivered = db.query(func.count(Order.id)).filter(
        Order.merchant_id == current_user.id,
        Order.status == OrderStatus.DELIVERED,
        Order.delivered_at >= month_ago,
    ).scalar() or 0

    current_month_returned = db.query(func.count(Order.id)).filter(
        Order.merchant_id == current_user.id,
        Order.status == OrderStatus.RETURN_PROCESSED,
        Order.returned_at >= month_ago,
    ).scalar() or 0

    # ── Previous month stats (for comparison) ──
    prev_month_orders = db.query(func.count(Order.id)).filter(
        Order.merchant_id == current_user.id,
        Order.created_at >= two_months_ago,
        Order.created_at < month_ago,
    ).scalar() or 0

    prev_month_returned = db.query(func.count(Order.id)).filter(
        Order.merchant_id == current_user.id,
        Order.status == OrderStatus.RETURN_PROCESSED,
        Order.returned_at >= two_months_ago,
        Order.returned_at < month_ago,
    ).scalar() or 0

    # ── Rates ──
    delivery_rate = round(
        (profile.total_delivered / max(profile.total_orders, 1)) * 100, 1
    )
    return_rate = round(
        (profile.total_returned / max(profile.total_orders, 1)) * 100, 1
    )

    prev_return_rate = round(
        (prev_month_returned / max(prev_month_orders, 1)) * 100, 1
    ) if prev_month_orders > 0 else 0

    return_rate_change = round(return_rate - prev_return_rate, 1)

    # ── Average rating ──
    avg_rating = db.query(func.coalesce(func.avg(Feedback.rating), 0)).filter(
        Feedback.merchant_id == current_user.id
    ).scalar()

    feedback_count = db.query(func.count(Feedback.id)).filter(
        Feedback.merchant_id == current_user.id
    ).scalar() or 0

    # ── Best sellers (top 5 products by order count) ──
    best_sellers = db.query(
        Order.product_name,
        func.count(Order.id).label("count"),
        func.sum(Order.product_price).label("revenue"),
    ).filter(
        Order.merchant_id == current_user.id,
    ).group_by(Order.product_name).order_by(
        func.count(Order.id).desc()
    ).limit(5).all()

    # ── Wilaya breakdown ──
    wilaya_stats = db.query(
        Order.customer_wilaya,
        func.count(Order.id).label("count"),
    ).filter(
        Order.merchant_id == current_user.id,
        Order.customer_wilaya.isnot(None),
    ).group_by(Order.customer_wilaya).order_by(
        func.count(Order.id).desc()
    ).limit(10).all()

    # ── Revenue ──
    total_revenue = db.query(func.coalesce(func.sum(Order.product_price), 0)).filter(
        Order.merchant_id == current_user.id,
        Order.status == OrderStatus.DELIVERED,
    ).scalar()

    total_safe_pay = db.query(func.coalesce(func.sum(Payment.amount), 0)).join(Order).filter(
        Order.merchant_id == current_user.id,
        Payment.payment_type == PaymentType.DEPOSIT,
        Payment.status == PaymentStatus.CONFIRMED,
    ).scalar()

    # ── Recent feedbacks ──
    recent_feedbacks = db.query(Feedback).filter(
        Feedback.merchant_id == current_user.id
    ).order_by(Feedback.created_at.desc()).limit(5).all()

    # ── Monthly evolution (last 6 months) ──
    six_months_ago = (now.replace(day=1) - timedelta(days=180)).replace(day=1)
    raw_orders = db.query(Order.created_at, Order.status, Order.product_price).filter(
        Order.merchant_id == current_user.id,
        Order.created_at >= six_months_ago,
    ).all()

    monthly_buckets: dict[str, dict] = {}
    for created_at, st, price in raw_orders:
        key = f"{created_at.year}-{created_at.month:02d}"
        b = monthly_buckets.setdefault(key, {
            "key": key,
            "label": created_at.strftime("%b %Y"),
            "orders": 0, "delivered": 0, "returned": 0, "revenue": 0.0,
        })
        b["orders"] += 1
        if st == OrderStatus.DELIVERED:
            b["delivered"] += 1
            b["revenue"] += float(price or 0)
        elif st == OrderStatus.RETURN_PROCESSED:
            b["returned"] += 1

    # Fill missing months with zeros so the chart looks continuous.
    monthly_evolution = []
    cursor = six_months_ago
    while cursor <= now:
        key = f"{cursor.year}-{cursor.month:02d}"
        if key in monthly_buckets:
            monthly_evolution.append(monthly_buckets[key])
        else:
            monthly_evolution.append({
                "key": key,
                "label": cursor.strftime("%b %Y"),
                "orders": 0, "delivered": 0, "returned": 0, "revenue": 0.0,
            })
        # Advance one month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    return {
        "overview": {
            "total_orders": profile.total_orders,
            "total_delivered": profile.total_delivered,
            "total_returned": profile.total_returned,
            "delivery_rate": delivery_rate,
            "return_rate": return_rate,
            "return_rate_change": return_rate_change,
            "trust_score": current_user.trust_score,
            "avg_rating": round(float(avg_rating), 1),
            "feedback_count": feedback_count,
        },
        "current_month": {
            "orders": current_month_orders,
            "delivered": current_month_delivered,
            "returned": current_month_returned,
        },
        "revenue": {
            "total": float(total_revenue),
            "safe_pay_collected": float(total_safe_pay),
        },
        "best_sellers": [
            {
                "product_name": bs[0],
                "order_count": bs[1],
                "revenue": float(bs[2]) if bs[2] else 0,
            }
            for bs in best_sellers
        ],
        "wilaya_breakdown": [
            {"wilaya": ws[0], "count": ws[1]}
            for ws in wilaya_stats
        ],
        "recent_feedbacks": [
            {
                "id": f.id,
                "rating": f.rating,
                "criteria": f.criteria,
                "comment": f.comment,
                "created_at": f.created_at.isoformat(),
            }
            for f in recent_feedbacks
        ],
        "monthly_evolution": monthly_evolution,
    }


@router.get("/insights")
def get_safe_insights(
    current_user: User = Depends(get_current_merchant),
    db: Session = Depends(get_db),
):
    """
    Safe Insights — AI-powered analysis dashboard.
    FR-08: return causes, recommendations, risk analysis.
    Available from 10+ orders.
    """
    profile = db.query(MerchantProfile).filter(
        MerchantProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil marchand non trouvé")

    if profile.total_orders < 10 and not settings.DEMO_MODE:
        return {
            "available": False,
            "message": f"Safe Insights est disponible à partir de 10 commandes. Vous en avez {profile.total_orders}.",
            "orders_needed": 10 - profile.total_orders,
        }

    # ── Return cause breakdown ──
    return_analyses = db.query(ReturnAnalysis).join(Order).filter(
        Order.merchant_id == current_user.id,
    ).all()

    cause_counts = {}
    for ra in return_analyses:
        cause = ra.cause
        if cause not in cause_counts:
            cause_counts[cause] = {
                "count": 0,
                "label_fr": ra.cause_label_fr,
                "label_en": ra.cause_label_en,
                "label_ar": ra.cause_label_ar,
            }
        cause_counts[cause]["count"] += 1

    # Sort by count
    cause_breakdown = sorted(
        [{"cause": k, **v} for k, v in cause_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    # ── Recommendations ──
    from models.recommendation_engine import generate_merchant_recommendations

    avg_rating = db.query(func.coalesce(func.avg(Feedback.rating), 0)).filter(
        Feedback.merchant_id == current_user.id
    ).scalar()

    recommendations = generate_merchant_recommendations(
        total_orders=profile.total_orders,
        total_delivered=profile.total_delivered,
        total_returned=profile.total_returned,
        avg_rating=float(avg_rating),
        return_causes=[ra.cause for ra in return_analyses],
        delivery_companies=profile.delivery_companies or [],
        trust_score=current_user.trust_score,
        language=current_user.language.value if current_user.language else "fr",
    )

    return {
        "available": True,
        "cause_breakdown": cause_breakdown,
        "recommendations": recommendations,
        "total_returns_analyzed": len(return_analyses),
        "trust_score": current_user.trust_score,
    }
