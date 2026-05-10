"""
Safe Order — Return Analyzer
Identifies the root cause of order returns from order data and customer feedback.
Used by the Safe Insights dashboard.
"""
from typing import Optional


# Possible return causes with labels in FR/EN/AR
RETURN_CAUSES = {
    "customer_absent": {
        "fr": "Client absent lors de la livraison",
        "en": "Customer absent during delivery",
        "ar": "العميل غائب أثناء التوصيل",
    },
    "wrong_product": {
        "fr": "Produit non conforme à la description",
        "en": "Product does not match description",
        "ar": "المنتج لا يتطابق مع الوصف",
    },
    "damaged_product": {
        "fr": "Produit endommagé à la réception",
        "en": "Product damaged upon receipt",
        "ar": "المنتج تالف عند الاستلام",
    },
    "late_delivery": {
        "fr": "Délai de livraison trop long",
        "en": "Delivery took too long",
        "ar": "التوصيل استغرق وقتًا طويلاً",
    },
    "wrong_size_color": {
        "fr": "Taille ou couleur différente",
        "en": "Wrong size or color",
        "ar": "المقاس أو اللون مختلف",
    },
    "poor_packaging": {
        "fr": "Emballage insuffisant ou négligé",
        "en": "Poor or careless packaging",
        "ar": "التغليف ضعيف أو مهمل",
    },
    "changed_mind": {
        "fr": "Le client a changé d'avis",
        "en": "Customer changed their mind",
        "ar": "العميل غيّر رأيه",
    },
    "price_dispute": {
        "fr": "Désaccord sur le prix à la livraison",
        "en": "Price dispute at delivery",
        "ar": "خلاف حول السعر عند التوصيل",
    },
    "duplicate_order": {
        "fr": "Commande en double",
        "en": "Duplicate order",
        "ar": "طلب مكرر",
    },
    "fake_order": {
        "fr": "Commande non sérieuse (faux numéro, fausse adresse)",
        "en": "Fake order (wrong phone or address)",
        "ar": "طلب وهمي (رقم أو عنوان خاطئ)",
    },
}

# Recommendations per cause
RECOMMENDATIONS = {
    "customer_absent": {
        "fr": "Contactez le client par téléphone avant l'expédition pour confirmer sa disponibilité. Proposez un point relais comme alternative.",
        "en": "Contact the customer by phone before shipping to confirm availability. Offer a pickup point as an alternative.",
        "ar": "اتصل بالعميل هاتفيًا قبل الشحن لتأكيد توفره. اقترح نقطة استلام كبديل.",
    },
    "wrong_product": {
        "fr": "Vérifiez que les photos et descriptions correspondent exactement au produit envoyé. Utilisez Safe Standards systématiquement.",
        "en": "Ensure photos and descriptions exactly match the product sent. Use Safe Standards consistently.",
        "ar": "تأكد أن الصور والأوصاف تتطابق تمامًا مع المنتج المرسل. استخدم معايير Safe Standards باستمرار.",
    },
    "damaged_product": {
        "fr": "Améliorez l'emballage : utilisez du papier bulle et un carton rigide. Vérifiez le colis avant la remise au livreur.",
        "en": "Improve packaging: use bubble wrap and rigid boxes. Inspect the package before handing to the courier.",
        "ar": "حسّن التغليف: استخدم غلاف الفقاعات وصناديق صلبة. افحص الطرد قبل تسليمه للناقل.",
    },
    "late_delivery": {
        "fr": "Envisagez de changer de société de livraison pour cette wilaya. Yalidine et ZR Express ont les meilleurs délais vers cette zone.",
        "en": "Consider switching delivery companies for this wilaya. Yalidine and ZR Express have the best times for this area.",
        "ar": "فكر في تغيير شركة التوصيل لهذه الولاية. ياليدين و ZR Express لديهم أفضل المواعيد لهذه المنطقة.",
    },
    "wrong_size_color": {
        "fr": "Ajoutez un tableau des tailles et des photos de chaque couleur disponible. Confirmez la taille/couleur par téléphone avant l'envoi.",
        "en": "Add a size chart and photos of each available color. Confirm size/color by phone before shipping.",
        "ar": "أضف جدول مقاسات وصور لكل لون متاح. أكّد المقاس/اللون هاتفيًا قبل الشحن.",
    },
    "poor_packaging": {
        "fr": "Investissez dans un emballage professionnel. Un colis bien emballé réduit les retours de 25%.",
        "en": "Invest in professional packaging. Well-packaged orders reduce returns by 25%.",
        "ar": "استثمر في تغليف احترافي. الطرود المغلفة جيدًا تقلل المرتجعات بنسبة 25%.",
    },
    "changed_mind": {
        "fr": "Activez Safe Pay pour dissuader les commandes non sérieuses. Le dépôt engage financièrement le client.",
        "en": "Enable Safe Pay to discourage non-serious orders. The deposit financially commits the customer.",
        "ar": "فعّل Safe Pay لردع الطلبات غير الجدية. الدفعة المقدمة تلزم العميل ماليًا.",
    },
    "price_dispute": {
        "fr": "Affichez clairement le prix total (produit + livraison) sur la fiche commande. Aucune surprise à la réception.",
        "en": "Clearly display the total price (product + delivery) on the order sheet. No surprises at delivery.",
        "ar": "اعرض السعر الإجمالي (المنتج + التوصيل) بوضوح في صفحة الطلب. لا مفاجآت عند التوصيل.",
    },
    "duplicate_order": {
        "fr": "Vérifiez les commandes en double (même téléphone + même produit) avant la préparation.",
        "en": "Check for duplicate orders (same phone + same product) before preparation.",
        "ar": "تحقق من الطلبات المكررة (نفس الهاتف + نفس المنتج) قبل التحضير.",
    },
    "fake_order": {
        "fr": "Activez Safe Pay systématiquement pour les nouveaux clients. Vérifiez le numéro de téléphone avant l'envoi.",
        "en": "Always enable Safe Pay for new customers. Verify the phone number before shipping.",
        "ar": "فعّل Safe Pay دائمًا للعملاء الجدد. تحقق من رقم الهاتف قبل الشحن.",
    },
}


def analyze_return(
    order_data: dict,
    feedback_data: Optional[dict] = None,
) -> dict:
    """
    Analyze a returned order and determine the most likely cause.

    In production, this would use ML models trained on historical data.
    For the demo, we use rule-based heuristics.

    Args:
        order_data: Order information (status, timestamps, delivery info)
        feedback_data: Optional customer feedback (rating, criteria, comment)

    Returns:
        dict with cause, labels, recommendation, and confidence score
    """
    cause = "changed_mind"  # Default
    confidence = 0.6

    # Rule-based analysis
    if feedback_data:
        criteria = feedback_data.get("criteria", [])
        comment = (feedback_data.get("comment", "") or "").lower()

        if "damaged" in criteria or "endommagé" in comment or "cassé" in comment:
            cause = "damaged_product"
            confidence = 0.92
        elif "different_color" in criteria or "couleur" in comment or "taille" in comment:
            cause = "wrong_size_color"
            confidence = 0.88
        elif "non_conforming" in criteria or "conforme" in comment:
            cause = "wrong_product"
            confidence = 0.90
        elif "slow_delivery" in criteria or "retard" in comment or "long" in comment:
            cause = "late_delivery"
            confidence = 0.85
        elif "packaging" in criteria or "emballage" in comment:
            cause = "poor_packaging"
            confidence = 0.87
    else:
        # No feedback — infer from order data
        if order_data.get("customer_phone") and order_data.get("customer_phone", "").startswith("000"):
            cause = "fake_order"
            confidence = 0.95
        elif order_data.get("safe_pay_amount", 0) == 0:
            cause = "changed_mind"
            confidence = 0.70
        else:
            cause = "customer_absent"
            confidence = 0.75

    cause_labels = RETURN_CAUSES.get(cause, RETURN_CAUSES["changed_mind"])
    recommendation = RECOMMENDATIONS.get(cause, RECOMMENDATIONS["changed_mind"])

    return {
        "cause": cause,
        "cause_label_fr": cause_labels["fr"],
        "cause_label_en": cause_labels["en"],
        "cause_label_ar": cause_labels["ar"],
        "recommendation_fr": recommendation["fr"],
        "recommendation_en": recommendation["en"],
        "recommendation_ar": recommendation["ar"],
        "confidence": confidence,
    }
