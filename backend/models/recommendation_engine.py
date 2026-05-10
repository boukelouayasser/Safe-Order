"""
Safe Order — Recommendation Engine
Generates personalized recommendations for merchants based on their order history,
return patterns, feedback trends, and Trust Score.
Used by the Safe Insights dashboard.
"""
from typing import List


def generate_merchant_recommendations(
    total_orders: int,
    total_delivered: int,
    total_returned: int,
    avg_rating: float,
    return_causes: List[str],
    delivery_companies: List[str],
    trust_score: float,
    language: str = "fr",
) -> List[dict]:
    """
    Generate actionable recommendations for a merchant.

    In production, this would use collaborative filtering and historical patterns.
    For the demo, it uses rule-based logic.

    Returns:
        List of recommendation dicts with title, description, priority, and icon.
    """
    recommendations = []
    return_rate = (total_returned / max(total_orders, 1)) * 100
    delivery_rate = (total_delivered / max(total_orders, 1)) * 100

    # ── Return rate analysis ──
    if return_rate > 30:
        recommendations.append({
            "title": {
                "fr": "⚠️ Taux de retour critique",
                "en": "⚠️ Critical return rate",
                "ar": "⚠️ نسبة مرتجعات حرجة",
            }[language],
            "description": {
                "fr": f"Votre taux de retour est de {return_rate:.0f}%. La moyenne du marché est de 35%. Activez Safe Pay pour réduire les commandes non sérieuses.",
                "en": f"Your return rate is {return_rate:.0f}%. The market average is 35%. Enable Safe Pay to reduce non-serious orders.",
                "ar": f"نسبة المرتجعات لديك {return_rate:.0f}%. متوسط السوق 35%. فعّل Safe Pay لتقليل الطلبات غير الجدية.",
            }[language],
            "priority": "high",
            "category": "returns",
        })
    elif return_rate > 15:
        recommendations.append({
            "title": {
                "fr": "📊 Taux de retour à surveiller",
                "en": "📊 Return rate to monitor",
                "ar": "📊 نسبة مرتجعات تحتاج مراقبة",
            }[language],
            "description": {
                "fr": f"Votre taux de retour est de {return_rate:.0f}%. Identifiez les causes principales dans Safe Insights.",
                "en": f"Your return rate is {return_rate:.0f}%. Identify main causes in Safe Insights.",
                "ar": f"نسبة المرتجعات لديك {return_rate:.0f}%. حدد الأسباب الرئيسية في Safe Insights.",
            }[language],
            "priority": "medium",
            "category": "returns",
        })

    # ── Delivery rate ──
    if delivery_rate > 85:
        recommendations.append({
            "title": {
                "fr": "✅ Excellent taux de livraison",
                "en": "✅ Excellent delivery rate",
                "ar": "✅ نسبة توصيل ممتازة",
            }[language],
            "description": {
                "fr": f"Votre taux de livraison est de {delivery_rate:.0f}%. Continuez comme ça !",
                "en": f"Your delivery rate is {delivery_rate:.0f}%. Keep it up!",
                "ar": f"نسبة التوصيل لديك {delivery_rate:.0f}%. واصل هكذا!",
            }[language],
            "priority": "low",
            "category": "performance",
        })

    # ── Rating analysis ──
    if avg_rating < 3.0:
        recommendations.append({
            "title": {
                "fr": "⭐ Améliorez vos avis clients",
                "en": "⭐ Improve your customer reviews",
                "ar": "⭐ حسّن تقييمات العملاء",
            }[language],
            "description": {
                "fr": "Votre note moyenne est inférieure à 3/5. Vérifiez la conformité des produits et améliorez l'emballage.",
                "en": "Your average rating is below 3/5. Check product conformity and improve packaging.",
                "ar": "متوسط تقييمك أقل من 3/5. تحقق من مطابقة المنتجات وحسّن التغليف.",
            }[language],
            "priority": "high",
            "category": "quality",
        })

    # ── Common return causes ──
    if "late_delivery" in return_causes:
        recommendations.append({
            "title": {
                "fr": "🚚 Optimisez vos délais de livraison",
                "en": "🚚 Optimize your delivery times",
                "ar": "🚚 حسّن مواعيد التوصيل",
            }[language],
            "description": {
                "fr": "Plusieurs retours sont liés aux délais. Comparez les performances de vos sociétés de livraison par wilaya.",
                "en": "Several returns are due to delays. Compare your delivery companies' performance by wilaya.",
                "ar": "عدة مرتجعات مرتبطة بالتأخير. قارن أداء شركات التوصيل حسب الولاية.",
            }[language],
            "priority": "medium",
            "category": "delivery",
        })

    if "poor_packaging" in return_causes:
        recommendations.append({
            "title": {
                "fr": "📦 Améliorez votre emballage",
                "en": "📦 Improve your packaging",
                "ar": "📦 حسّن التغليف",
            }[language],
            "description": {
                "fr": "Des retours sont causés par un emballage insuffisant. Investissez dans du papier bulle et des cartons renforcés.",
                "en": "Returns are caused by poor packaging. Invest in bubble wrap and reinforced boxes.",
                "ar": "بعض المرتجعات ناتجة عن تغليف ضعيف. استثمر في غلاف الفقاعات وصناديق مقوّاة.",
            }[language],
            "priority": "medium",
            "category": "packaging",
        })

    # ── Trust Score ──
    if trust_score < 50:
        recommendations.append({
            "title": {
                "fr": "🔒 Améliorez votre Trust Score",
                "en": "🔒 Improve your Trust Score",
                "ar": "🔒 حسّن نقاط الثقة",
            }[language],
            "description": {
                "fr": f"Votre Trust Score est de {trust_score:.0f}/100. Livrez plus de commandes avec Safe Pay et collectez des avis positifs.",
                "en": f"Your Trust Score is {trust_score:.0f}/100. Deliver more orders with Safe Pay and collect positive reviews.",
                "ar": f"نقاط الثقة لديك {trust_score:.0f}/100. أوصل طلبات أكثر مع Safe Pay واجمع تقييمات إيجابية.",
            }[language],
            "priority": "high",
            "category": "trust",
        })

    # ── General tips ──
    if total_orders < 10:
        recommendations.append({
            "title": {
                "fr": "🚀 Vous débutez — nos conseils",
                "en": "🚀 Getting started — our tips",
                "ar": "🚀 أنت في البداية — نصائحنا",
            }[language],
            "description": {
                "fr": "Activez Safe Pay, utilisez Safe Standards pour toutes vos fiches produit, et répondez rapidement aux commandes.",
                "en": "Enable Safe Pay, use Safe Standards for all your product sheets, and respond quickly to orders.",
                "ar": "فعّل Safe Pay، استخدم Safe Standards لجميع صفحات المنتجات، واستجب بسرعة للطلبات.",
            }[language],
            "priority": "medium",
            "category": "onboarding",
        })

    return recommendations
