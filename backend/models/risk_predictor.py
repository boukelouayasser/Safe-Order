"""
Safe Order — Risk Predictor
Predicts non-pickup risk for an order before shipping.
Displayed as the Risk Flag badge on orders.
"""
from typing import Optional


def predict_risk(
    customer_phone: str,
    customer_wilaya: Optional[str],
    customer_order_count: int,
    customer_pickup_count: int,
    customer_return_count: int,
    has_safe_pay: bool,
    safe_pay_amount: float,
    product_price: float,
    delivery_company: Optional[str],
    customer_remark: Optional[str] = None,
) -> dict:
    """
    Predict the probability of non-pickup for an order.

    In production, this would be a trained classification model (XGBoost/LightGBM)
    on historical order data. For the demo, we use weighted heuristics.

    Args:
        customer_phone: Customer phone number
        customer_wilaya: Delivery wilaya
        customer_order_count: How many orders this customer has placed
        customer_pickup_count: How many orders were picked up
        customer_return_count: How many orders were returned
        has_safe_pay: Whether Safe Pay deposit was paid
        safe_pay_amount: Amount of the deposit
        product_price: Total product price
        delivery_company: Delivery company slug
        customer_remark: Any remark from the customer

    Returns:
        dict with risk_score (0-100), risk_level, and factors
    """
    score = 50.0  # Base risk
    factors = []

    # ── Customer history ──
    if customer_order_count == 0:
        score += 15
        factors.append({
            "fr": "Nouveau client — aucun historique",
            "en": "New customer — no history",
            "ar": "عميل جديد — بدون سجل",
        })
    elif customer_return_count > 0:
        return_ratio = customer_return_count / max(customer_order_count, 1)
        if return_ratio > 0.5:
            score += 25
            factors.append({
                "fr": f"Client à risque — {customer_return_count} retours sur {customer_order_count} commandes",
                "en": f"Risky customer — {customer_return_count} returns out of {customer_order_count} orders",
                "ar": f"عميل محفوف بالمخاطر — {customer_return_count} مرتجع من {customer_order_count} طلب",
            })
        elif return_ratio > 0.3:
            score += 15
            factors.append({
                "fr": f"Taux de retour élevé ({return_ratio*100:.0f}%)",
                "en": f"High return rate ({return_ratio*100:.0f}%)",
                "ar": f"نسبة مرتجعات مرتفعة ({return_ratio*100:.0f}%)",
            })
    else:
        # Loyal customer
        score -= 20
        factors.append({
            "fr": f"Client fidèle — {customer_pickup_count} commandes livrées",
            "en": f"Loyal customer — {customer_pickup_count} delivered orders",
            "ar": f"عميل وفي — {customer_pickup_count} طلب تم توصيله",
        })

    # ── Safe Pay impact ──
    if has_safe_pay:
        deposit_ratio = safe_pay_amount / max(product_price, 1)
        if deposit_ratio >= 0.2:
            score -= 20
            factors.append({
                "fr": f"Safe Pay activé ({safe_pay_amount:.0f} DZD — {deposit_ratio*100:.0f}% du prix)",
                "en": f"Safe Pay active ({safe_pay_amount:.0f} DZD — {deposit_ratio*100:.0f}% of price)",
                "ar": f"Safe Pay مفعّل ({safe_pay_amount:.0f} دج — {deposit_ratio*100:.0f}% من السعر)",
            })
        else:
            score -= 10
            factors.append({
                "fr": "Safe Pay activé (montant faible)",
                "en": "Safe Pay active (low amount)",
                "ar": "Safe Pay مفعّل (مبلغ قليل)",
            })
    else:
        score += 15
        factors.append({
            "fr": "Pas de Safe Pay — aucun engagement financier",
            "en": "No Safe Pay — no financial commitment",
            "ar": "بدون Safe Pay — لا التزام مالي",
        })

    # ── Remark analysis ──
    if customer_remark:
        remark_lower = customer_remark.lower()
        suspicious_keywords = ["peut-être", "maybe", "je sais pas", "hésit", "incertain"]
        if any(kw in remark_lower for kw in suspicious_keywords):
            score += 10
            factors.append({
                "fr": "Remarque client indiquant une hésitation",
                "en": "Customer remark indicates hesitation",
                "ar": "ملاحظة العميل تشير إلى تردد",
            })

    # Clamp
    score = max(0, min(100, score))

    # Risk level
    if score >= 70:
        level = "high"
    elif score >= 40:
        level = "medium"
    else:
        level = "low"

    return {
        "risk_score": round(score, 1),
        "risk_level": level,
        "factors": factors,
    }
