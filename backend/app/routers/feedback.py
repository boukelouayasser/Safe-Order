"""
Safe Order — Feedback Router (Safe Review)
Post-delivery feedback, Trust Score calculation, and return analysis.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Order, Feedback, User, MerchantProfile, ReturnAnalysis,
    OrderStatus, UserRole,
)
from app.schemas.feedback import (
    SubmitFeedbackRequest, FeedbackResponse, TrustScoreResponse,
)
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()


# ──────────────────────────────────────────────
# Trust Score Calculation
# ──────────────────────────────────────────────

def calculate_trust_score(db: Session, user_id: str, role: UserRole) -> dict:
    """
    Calculate Trust Score (0-100) based on:
    - Delivery rate (40% weight)
    - Average rating (30% weight)
    - Order volume (15% weight)
    - Safe Pay usage (15% weight)
    """
    if role == UserRole.MERCHANT:
        profile = db.query(MerchantProfile).filter(
            MerchantProfile.user_id == user_id
        ).first()

        if not profile or profile.total_orders == 0:
            return {
                "score": 50.0,
                "level": "bronze",
                "total_orders": 0,
                "delivery_rate": 0,
                "avg_rating": 0,
                "components": {
                    "delivery_rate_score": 0,
                    "rating_score": 0,
                    "volume_score": 0,
                    "safe_pay_score": 0,
                },
            }

        # Delivery rate
        delivery_rate = (profile.total_delivered / max(profile.total_orders, 1)) * 100
        delivery_score = min(delivery_rate / 100 * 40, 40)

        # Average rating
        avg_rating = db.query(func.coalesce(func.avg(Feedback.rating), 0)).filter(
            Feedback.merchant_id == user_id
        ).scalar()
        rating_score = (float(avg_rating) / 5) * 30

        # Volume bonus (max at 100+ orders)
        volume_score = min(profile.total_orders / 100 * 15, 15)

        # Safe Pay usage
        from app.models import Payment, PaymentStatus, PaymentType
        safe_pay_count = db.query(func.count(Payment.id)).join(Order).filter(
            Order.merchant_id == user_id,
            Payment.payment_type == PaymentType.DEPOSIT,
            Payment.status == PaymentStatus.CONFIRMED,
        ).scalar() or 0
        safe_pay_rate = (safe_pay_count / max(profile.total_orders, 1)) * 100
        safe_pay_score = min(safe_pay_rate / 100 * 15, 15)

        total_score = round(delivery_score + rating_score + volume_score + safe_pay_score, 1)

        # Level
        if total_score >= 85:
            level = "platinum"
        elif total_score >= 70:
            level = "gold"
        elif total_score >= 50:
            level = "silver"
        else:
            level = "bronze"

        return {
            "score": total_score,
            "level": level,
            "total_orders": profile.total_orders,
            "delivery_rate": round(delivery_rate, 1),
            "avg_rating": round(float(avg_rating), 1),
            "components": {
                "delivery_rate_score": round(delivery_score, 1),
                "rating_score": round(rating_score, 1),
                "volume_score": round(volume_score, 1),
                "safe_pay_score": round(safe_pay_score, 1),
            },
        }
    else:
        # Customer trust score — simpler
        total_orders = db.query(func.count(Order.id)).filter(
            Order.customer_id == user_id
        ).scalar() or 0

        delivered = db.query(func.count(Order.id)).filter(
            Order.customer_id == user_id,
            Order.status == OrderStatus.DELIVERED,
        ).scalar() or 0

        returned = db.query(func.count(Order.id)).filter(
            Order.customer_id == user_id,
            Order.status == OrderStatus.RETURN_PROCESSED,
        ).scalar() or 0

        if total_orders == 0:
            score = 50.0
        else:
            pickup_rate = delivered / max(total_orders, 1)
            score = round(pickup_rate * 100, 1)

        level = "platinum" if score >= 85 else "gold" if score >= 70 else "silver" if score >= 50 else "bronze"

        return {
            "score": score,
            "level": level,
            "total_orders": total_orders,
            "delivery_rate": round((delivered / max(total_orders, 1)) * 100, 1),
            "avg_rating": 0,
            "components": {
                "pickup_rate": round((delivered / max(total_orders, 1)) * 100, 1),
                "return_rate": round((returned / max(total_orders, 1)) * 100, 1),
            },
        }


# ──────────────────────────────────────────────
# Submit Feedback
# ──────────────────────────────────────────────

@router.post("/submit", response_model=FeedbackResponse, status_code=201)
def submit_feedback(
    req: SubmitFeedbackRequest,
    db: Session = Depends(get_db),
):
    """
    Customer submits post-delivery feedback.
    No auth required — identified by order.
    """
    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=400,
            detail="Le feedback n'est possible qu'après la livraison",
        )

    # Check existing feedback
    existing = db.query(Feedback).filter(Feedback.order_id == order.id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Un avis a déjà été donné pour cette commande",
        )

    if not order.customer_id:
        raise HTTPException(
            status_code=400,
            detail="Cette commande n'a pas de client identifié",
        )

    feedback = Feedback(
        order_id=order.id,
        customer_id=order.customer_id,
        merchant_id=order.merchant_id,
        rating=req.rating,
        criteria=req.criteria,
        comment=req.comment,
    )
    db.add(feedback)

    # Update merchant Trust Score
    trust_data = calculate_trust_score(db, order.merchant_id, UserRole.MERCHANT)
    merchant = db.query(User).filter(User.id == order.merchant_id).first()
    if merchant:
        merchant.trust_score = trust_data["score"]

    # Update customer Trust Score
    if order.customer_id:
        cust_trust = calculate_trust_score(db, order.customer_id, UserRole.CUSTOMER)
        customer = db.query(User).filter(User.id == order.customer_id).first()
        if customer:
            customer.trust_score = cust_trust["score"]

    db.commit()
    db.refresh(feedback)

    return FeedbackResponse.model_validate(feedback)


@router.get("/order/{order_id}", response_model=FeedbackResponse)
def get_order_feedback(order_id: str, db: Session = Depends(get_db)):
    """Get feedback for a specific order."""
    feedback = db.query(Feedback).filter(Feedback.order_id == order_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Aucun avis pour cette commande")
    return FeedbackResponse.model_validate(feedback)


@router.get("/merchant/{merchant_id}", response_model=list[FeedbackResponse])
def get_merchant_feedbacks(merchant_id: str, db: Session = Depends(get_db)):
    """Get all feedbacks for a merchant."""
    feedbacks = db.query(Feedback).filter(
        Feedback.merchant_id == merchant_id
    ).order_by(Feedback.created_at.desc()).all()
    return [FeedbackResponse.model_validate(f) for f in feedbacks]


@router.get("/trust-score/{user_id}", response_model=TrustScoreResponse)
def get_trust_score(user_id: str, db: Session = Depends(get_db)):
    """Get the Trust Score for any user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    result = calculate_trust_score(db, user.id, user.role)
    return TrustScoreResponse(**result)


# ──────────────────────────────────────────────
# Return Analysis (Safe Insights)
# ──────────────────────────────────────────────

@router.post("/analyze-return/{order_id}")
def analyze_return_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger AI analysis for a returned order.
    Creates a ReturnAnalysis record with cause + recommendation.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.status != OrderStatus.RETURN_PROCESSED:
        raise HTTPException(
            status_code=400,
            detail="L'analyse n'est disponible que pour les commandes retournées",
        )

    # Check existing analysis
    existing = db.query(ReturnAnalysis).filter(ReturnAnalysis.order_id == order.id).first()
    if existing:
        return {
            "id": existing.id,
            "cause": existing.cause,
            "cause_label_fr": existing.cause_label_fr,
            "cause_label_en": existing.cause_label_en,
            "cause_label_ar": existing.cause_label_ar,
            "recommendation_fr": existing.recommendation_fr,
            "recommendation_en": existing.recommendation_en,
            "recommendation_ar": existing.recommendation_ar,
            "confidence": existing.confidence,
        }

    # Run AI analysis
    from models.return_analyzer import analyze_return

    order_data = {
        "customer_phone": order.customer_phone,
        "safe_pay_amount": order.safe_pay_amount,
        "product_price": order.product_price,
        "delivery_company": order.delivery_company,
        "customer_wilaya": order.customer_wilaya,
    }

    feedback = db.query(Feedback).filter(Feedback.order_id == order.id).first()
    feedback_data = None
    if feedback:
        feedback_data = {
            "rating": feedback.rating,
            "criteria": feedback.criteria,
            "comment": feedback.comment,
        }

    result = analyze_return(order_data, feedback_data)

    analysis = ReturnAnalysis(
        order_id=order.id,
        cause=result["cause"],
        cause_label_fr=result["cause_label_fr"],
        cause_label_en=result["cause_label_en"],
        cause_label_ar=result["cause_label_ar"],
        recommendation_fr=result["recommendation_fr"],
        recommendation_en=result["recommendation_en"],
        recommendation_ar=result["recommendation_ar"],
        confidence=result["confidence"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "cause": analysis.cause,
        "cause_label_fr": analysis.cause_label_fr,
        "cause_label_en": analysis.cause_label_en,
        "cause_label_ar": analysis.cause_label_ar,
        "recommendation_fr": analysis.recommendation_fr,
        "recommendation_en": analysis.recommendation_en,
        "recommendation_ar": analysis.recommendation_ar,
        "confidence": analysis.confidence,
    }
