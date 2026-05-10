"""
Safe Order — Seed Data
Populates reference data (delivery companies, wilayas) and demo accounts.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    User, MerchantProfile, DeliveryCompany, Order, Payment, TrackingEvent,
    Feedback, ReturnAnalysis, OTPCode,
    UserRole, Language, OrderStatus, OrderBadge, PaymentMethod, PaymentStatus,
    PaymentType, DeliveryMode, generate_uuid, generate_tracking_code,
)
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ──────────────────────────────────────────────
# Algerian Wilayas (58)
# ──────────────────────────────────────────────

WILAYAS = [
    "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi",
    "05 - Batna", "06 - Béjaïa", "07 - Biskra", "08 - Béchar",
    "09 - Blida", "10 - Bouira", "11 - Tamanrasset", "12 - Tébessa",
    "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou", "16 - Alger",
    "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
    "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma",
    "25 - Constantine", "26 - Médéa", "27 - Mostaganem", "28 - M'sila",
    "29 - Mascara", "30 - Ouargla", "31 - Oran", "32 - El Bayadh",
    "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès",
    "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued",
    "40 - Khenchela", "41 - Souk Ahras", "42 - Tipaza", "43 - Mila",
    "44 - Aïn Defla", "45 - Naâma", "46 - Aïn Témouchent",
    "47 - Ghardaïa", "48 - Relizane", "49 - El M'Ghair", "50 - El Meniaa",
    "51 - Ouled Djellal", "52 - Bordj Badji Mokhtar", "53 - Béni Abbès",
    "54 - Timimoun", "55 - Touggourt", "56 - Djanet", "57 - In Salah",
    "58 - In Guezzam",
]


# ──────────────────────────────────────────────
# Algerian Delivery Companies
# ──────────────────────────────────────────────

DELIVERY_COMPANIES = [
    {"name": "Yalidine", "slug": "yalidine", "has_api": True},
    {"name": "ZR Express", "slug": "zr_express", "has_api": True},
    {"name": "Maystro Delivery", "slug": "maystro", "has_api": True},
    {"name": "EcoTrack", "slug": "ecotrack", "has_api": False},
    {"name": "Guepex", "slug": "guepex", "has_api": False},
    {"name": "Procolis", "slug": "procolis", "has_api": False},
    {"name": "E-Com Delivery", "slug": "ecom_delivery", "has_api": False},
    {"name": "SAL Express", "slug": "sal_express", "has_api": False},
    {"name": "NovaLogistic", "slug": "novalogistic", "has_api": False},
    {"name": "Dhad Logistic", "slug": "dhad_logistic", "has_api": False},
    {"name": "JumpToDoor", "slug": "jumptodoor", "has_api": False},
    {"name": "Rapid Déliv", "slug": "rapid_deliv", "has_api": False},
    {"name": "Flash Delivery", "slug": "flash_delivery", "has_api": False},
    {"name": "Colis-DZ", "slug": "colis_dz", "has_api": False},
    {"name": "Speedex", "slug": "speedex", "has_api": False},
]


def seed_initial_data(db: Session):
    """Seed delivery companies if they don't exist."""
    existing = db.query(DeliveryCompany).first()
    if existing:
        return  # Already seeded

    for company in DELIVERY_COMPANIES:
        db.add(DeliveryCompany(
            name=company["name"],
            slug=company["slug"],
            has_api=company["has_api"],
            is_active=True,
        ))
    db.commit()
    print(f"[SEED] Inserted {len(DELIVERY_COMPANIES)} delivery companies")


def seed_demo_data(db: Session):
    """Seed demo accounts and sample orders for jury presentation.

    Idempotent: if the canonical demo merchant already exists, this returns
    immediately. The dedicated test account `test@safeorder.dz` is always
    ensured (see end of function) so users can log in without hunting through
    the database for credentials.
    """
    # Check if demo data already exists
    admin_exists = db.query(User).filter(User.email == "admin@safeorder.dz").first()
    if admin_exists:
        _ensure_test_account(db)
        return  # Already seeded

    # ── Admin account ──
    admin = User(
        id="demo-admin-001",
        role=UserRole.ADMIN,
        first_name="Admin",
        last_name="SafeOrder",
        phone="0550000000",
        email="admin@safeorder.dz",
        password_hash=hash_password("Admin123!"),
        wilaya="16 - Alger",
        municipality="Bab Ezzouar",
        language=Language.FR,
        trust_score=100.0,
        is_verified=True,
    )

    # ── Merchant account ──
    merchant = User(
        id="demo-merchant-001",
        role=UserRole.MERCHANT,
        first_name="Yassine",
        last_name="Boudjema",
        phone="0551111111",
        email="merchant@safeorder.dz",
        password_hash=hash_password("Merchant123!"),
        wilaya="16 - Alger",
        municipality="Hydra",
        address="12 Rue Didouche Mourad",
        language=Language.FR,
        trust_score=78.5,
        is_verified=True,
    )

    merchant_profile = MerchantProfile(
        id="demo-mp-001",
        user_id="demo-merchant-001",
        store_name="TechStore DZ",
        delivery_companies=["yalidine", "zr_express", "maystro"],
        safe_standards_accepted=True,
        safe_standards_accepted_at=datetime.utcnow() - timedelta(days=30),
        total_orders=47,
        total_delivered=38,
        total_returned=9,
    )

    # ── Customer account ──
    customer = User(
        id="demo-customer-001",
        role=UserRole.CUSTOMER,
        first_name="Amina",
        last_name="Khelifi",
        phone="0552222222",
        email=None,
        wilaya="25 - Constantine",
        municipality="El Khroub",
        address="Cité 500 logements, Bloc B",
        language=Language.FR,
        trust_score=65.0,
        is_verified=True,
    )

    # ── Second merchant ──
    merchant2 = User(
        id="demo-merchant-002",
        role=UserRole.MERCHANT,
        first_name="Karim",
        last_name="Mebarki",
        phone="0553333333",
        email="karim@safeorder.dz",
        password_hash=hash_password("Merchant123!"),
        wilaya="31 - Oran",
        municipality="Bir El Djir",
        address="Rue Ahmed Ben Bella",
        language=Language.FR,
        trust_score=92.0,
        is_verified=True,
    )

    merchant_profile2 = MerchantProfile(
        id="demo-mp-002",
        user_id="demo-merchant-002",
        store_name="Fashion Oran",
        delivery_companies=["yalidine", "guepex", "ecotrack"],
        safe_standards_accepted=True,
        safe_standards_accepted_at=datetime.utcnow() - timedelta(days=60),
        total_orders=123,
        total_delivered=108,
        total_returned=15,
    )

    db.add_all([admin, merchant, merchant_profile, customer, merchant2, merchant_profile2])
    db.flush()

    # ── Sample Orders ──
    now = datetime.utcnow()

    orders_data = [
        # Order 1: Delivered with Safe Pay
        {
            "id": "demo-order-001",
            "merchant_id": "demo-merchant-001",
            "customer_id": "demo-customer-001",
            "tracking_code": "SO-A1B2C3",
            "product_name": "Écouteurs Bluetooth TWS Pro",
            "product_description": "Écouteurs sans fil avec réduction de bruit active, autonomie 8h, étui de charge",
            "product_price": 4500.0,
            "delivery_company": "yalidine",
            "delivery_mode": DeliveryMode.HOME,
            "delivery_fee": 600.0,
            "customer_wilaya": "25 - Constantine",
            "customer_municipality": "El Khroub",
            "customer_address": "Cité 500 logements, Bloc B",
            "customer_phone": "0552222222",
            "customer_first_name": "Amina",
            "customer_last_name": "Khelifi",
            "safe_pay_amount": 900.0,
            "remaining_amount": 4200.0,
            "status": OrderStatus.DELIVERED,
            "badge": OrderBadge.SAFE_PAY,
            "confirmed_at": now - timedelta(days=5),
            "prepared_at": now - timedelta(days=4),
            "dispatched_at": now - timedelta(days=3),
            "delivered_at": now - timedelta(days=1),
            "created_at": now - timedelta(days=5),
        },
        # Order 2: In delivery
        {
            "id": "demo-order-002",
            "merchant_id": "demo-merchant-001",
            "customer_id": "demo-customer-001",
            "tracking_code": "SO-D4E5F6",
            "product_name": "Coque Samsung Galaxy A54",
            "product_description": "Coque antichoc transparente, protection militaire, compatible charge sans fil",
            "product_price": 1200.0,
            "delivery_company": "zr_express",
            "delivery_mode": DeliveryMode.HOME,
            "delivery_fee": 500.0,
            "customer_wilaya": "25 - Constantine",
            "customer_municipality": "El Khroub",
            "customer_address": "Cité 500 logements, Bloc B",
            "customer_phone": "0552222222",
            "customer_first_name": "Amina",
            "customer_last_name": "Khelifi",
            "safe_pay_amount": 250.0,
            "remaining_amount": 1450.0,
            "status": OrderStatus.DELIVERY,
            "badge": OrderBadge.LOYAL,
            "confirmed_at": now - timedelta(days=2),
            "prepared_at": now - timedelta(days=1),
            "dispatched_at": now - timedelta(hours=12),
            "created_at": now - timedelta(days=2),
        },
        # Order 3: In confirmation (new customer)
        {
            "id": "demo-order-003",
            "merchant_id": "demo-merchant-001",
            "customer_id": None,
            "tracking_code": "SO-G7H8I9",
            "product_name": "Power Bank 20000mAh",
            "product_description": "Batterie externe charge rapide 65W, 3 ports USB, affichage LED",
            "product_price": 3800.0,
            "delivery_company": None,
            "delivery_fee": 0.0,
            "safe_pay_amount": 0.0,
            "remaining_amount": 3800.0,
            "status": OrderStatus.CONFIRMATION,
            "badge": OrderBadge.NEW,
            "created_at": now - timedelta(hours=3),
        },
        # Order 4: Returned
        {
            "id": "demo-order-004",
            "merchant_id": "demo-merchant-001",
            "customer_id": "demo-customer-001",
            "tracking_code": "SO-J1K2L3",
            "product_name": "Montre Connectée FitPro",
            "product_description": "Montre connectée avec suivi cardiaque, GPS, étanche IP68",
            "product_price": 6500.0,
            "delivery_company": "yalidine",
            "delivery_mode": DeliveryMode.PICKUP,
            "delivery_fee": 400.0,
            "customer_wilaya": "25 - Constantine",
            "customer_municipality": "El Khroub",
            "customer_address": "Cité 500 logements, Bloc B",
            "customer_phone": "0552222222",
            "customer_first_name": "Amina",
            "customer_last_name": "Khelifi",
            "safe_pay_amount": 1300.0,
            "remaining_amount": 5600.0,
            "status": OrderStatus.RETURN_PROCESSED,
            "badge": OrderBadge.RISK,
            "risk_score": 72.0,
            "confirmed_at": now - timedelta(days=10),
            "prepared_at": now - timedelta(days=9),
            "dispatched_at": now - timedelta(days=8),
            "returned_at": now - timedelta(days=3),
            "created_at": now - timedelta(days=10),
        },
        # Order 5: In preparation
        {
            "id": "demo-order-005",
            "merchant_id": "demo-merchant-001",
            "customer_id": "demo-customer-001",
            "tracking_code": "SO-M4N5O6",
            "product_name": "Câble USB-C Tressé 2m",
            "product_description": "Câble USB-C vers USB-C, charge rapide 100W, nylon tressé",
            "product_price": 800.0,
            "delivery_company": "maystro",
            "delivery_mode": DeliveryMode.HOME,
            "delivery_fee": 500.0,
            "customer_wilaya": "25 - Constantine",
            "customer_municipality": "El Khroub",
            "customer_address": "Cité 500 logements, Bloc B",
            "customer_phone": "0552222222",
            "customer_first_name": "Amina",
            "customer_last_name": "Khelifi",
            "safe_pay_amount": 200.0,
            "remaining_amount": 1100.0,
            "status": OrderStatus.PREPARATION,
            "badge": OrderBadge.SAFE_PAY,
            "confirmed_at": now - timedelta(hours=6),
            "prepared_at": now - timedelta(hours=2),
            "created_at": now - timedelta(hours=6),
        },
    ]

    for order_data in orders_data:
        db.add(Order(**order_data))

    # ── Tracking Events ──
    tracking_events = [
        # Order 1 — full journey
        {"order_id": "demo-order-001", "status": OrderStatus.CONFIRMATION, "note": "Commande confirmée", "created_at": now - timedelta(days=5)},
        {"order_id": "demo-order-001", "status": OrderStatus.PREPARATION, "note": "Colis en préparation", "created_at": now - timedelta(days=4)},
        {"order_id": "demo-order-001", "status": OrderStatus.DISPATCH, "note": "Remis au livreur Yalidine", "created_at": now - timedelta(days=3)},
        {"order_id": "demo-order-001", "status": OrderStatus.DELIVERY, "note": "En cours de livraison — Constantine", "created_at": now - timedelta(days=2)},
        {"order_id": "demo-order-001", "status": OrderStatus.DELIVERED, "note": "Livré avec succès", "created_at": now - timedelta(days=1)},
        # Order 2 — in delivery
        {"order_id": "demo-order-002", "status": OrderStatus.CONFIRMATION, "note": "Commande confirmée", "created_at": now - timedelta(days=2)},
        {"order_id": "demo-order-002", "status": OrderStatus.PREPARATION, "note": "Colis en préparation", "created_at": now - timedelta(days=1)},
        {"order_id": "demo-order-002", "status": OrderStatus.DISPATCH, "note": "Remis au livreur ZR Express", "created_at": now - timedelta(hours=12)},
        {"order_id": "demo-order-002", "status": OrderStatus.DELIVERY, "note": "En cours de livraison", "created_at": now - timedelta(hours=4)},
        # Order 4 — returned
        {"order_id": "demo-order-004", "status": OrderStatus.CONFIRMATION, "created_at": now - timedelta(days=10)},
        {"order_id": "demo-order-004", "status": OrderStatus.PREPARATION, "created_at": now - timedelta(days=9)},
        {"order_id": "demo-order-004", "status": OrderStatus.DISPATCH, "created_at": now - timedelta(days=8)},
        {"order_id": "demo-order-004", "status": OrderStatus.DELIVERY, "created_at": now - timedelta(days=6)},
        {"order_id": "demo-order-004", "status": OrderStatus.RETURN_PROCESSED, "note": "Client absent — non récupéré", "created_at": now - timedelta(days=3)},
        # Order 5 — in preparation
        {"order_id": "demo-order-005", "status": OrderStatus.CONFIRMATION, "created_at": now - timedelta(hours=6)},
        {"order_id": "demo-order-005", "status": OrderStatus.PREPARATION, "note": "Colis en cours d'emballage", "created_at": now - timedelta(hours=2)},
    ]

    for evt in tracking_events:
        db.add(TrackingEvent(**evt))

    # ── Payments ──
    payments = [
        {
            "order_id": "demo-order-001",
            "customer_id": "demo-customer-001",
            "amount": 900.0,
            "method": PaymentMethod.CIB,
            "status": PaymentStatus.CONFIRMED,
            "payment_type": PaymentType.DEPOSIT,
            "transaction_ref": "CIB-DEMO-001",
            "confirmed_at": now - timedelta(days=5),
        },
        {
            "order_id": "demo-order-002",
            "customer_id": "demo-customer-001",
            "amount": 250.0,
            "method": PaymentMethod.DAHABIA,
            "status": PaymentStatus.CONFIRMED,
            "payment_type": PaymentType.DEPOSIT,
            "transaction_ref": "DAH-DEMO-002",
            "confirmed_at": now - timedelta(days=2),
        },
        {
            "order_id": "demo-order-004",
            "customer_id": "demo-customer-001",
            "amount": 1300.0,
            "method": PaymentMethod.BARIDIMOB,
            "status": PaymentStatus.CONFIRMED,
            "payment_type": PaymentType.DEPOSIT,
            "transaction_ref": "BM-DEMO-004",
            "confirmed_at": now - timedelta(days=10),
        },
        {
            "order_id": "demo-order-005",
            "customer_id": "demo-customer-001",
            "amount": 200.0,
            "method": PaymentMethod.CIB,
            "status": PaymentStatus.CONFIRMED,
            "payment_type": PaymentType.DEPOSIT,
            "transaction_ref": "CIB-DEMO-005",
            "confirmed_at": now - timedelta(hours=6),
        },
    ]

    for pmt in payments:
        db.add(Payment(**pmt))

    # ── Feedback for delivered order ──
    feedback = Feedback(
        order_id="demo-order-001",
        customer_id="demo-customer-001",
        merchant_id="demo-merchant-001",
        rating=4,
        criteria=["conforming", "fast_delivery", "good_packaging"],
        comment="Produit conforme, livraison rapide. Merci !",
    )
    db.add(feedback)

    # ── Return Analysis for returned order ──
    analysis = ReturnAnalysis(
        order_id="demo-order-004",
        cause="customer_absent",
        cause_label_fr="Client absent lors de la livraison",
        cause_label_en="Customer absent during delivery",
        cause_label_ar="العميل غائب أثناء التوصيل",
        recommendation="Contactez le client par téléphone avant l'expédition pour confirmer sa disponibilité. Proposez un point relais comme alternative.",
        recommendation_fr="Contactez le client par téléphone avant l'expédition pour confirmer sa disponibilité. Proposez un point relais comme alternative.",
        recommendation_en="Contact the customer by phone before shipping to confirm availability. Offer a pickup point as an alternative.",
        recommendation_ar="اتصل بالعميل هاتفيًا قبل الشحن لتأكيد توفره. اقترح نقطة استلام كبديل.",
        confidence=0.87,
    )
    db.add(analysis)

    db.commit()
    print("[SEED] Demo data inserted: 1 admin, 2 merchants, 1 customer, 5 orders, tracking events, payments, feedback, analysis")

    _ensure_test_account(db)


def _ensure_test_account(db: Session):
    """Create a dedicated 'test@safeorder.dz' merchant account for QA / hosting tests.

    Credentials:
        email:    test@safeorder.dz
        password: Test1234!
        phone:    0555000000
        store:    Safe Order Test Store
    """
    existing = db.query(User).filter(User.email == "test@safeorder.dz").first()
    if existing:
        return

    test_user = User(
        id="demo-test-001",
        role=UserRole.MERCHANT,
        first_name="Test",
        last_name="Account",
        phone="0555000000",
        email="test@safeorder.dz",
        password_hash=hash_password("Test1234!"),
        wilaya="16 - Alger",
        municipality="Centre",
        address="Test address",
        language=Language.FR,
        trust_score=75.0,
        is_verified=True,
    )

    test_profile = MerchantProfile(
        id="demo-test-mp-001",
        user_id="demo-test-001",
        store_name="Safe Order Test Store",
        delivery_companies=["yalidine", "zr_express"],
        safe_standards_accepted=True,
        safe_standards_accepted_at=datetime.utcnow(),
        total_orders=0,
        total_delivered=0,
        total_returned=0,
    )

    db.add_all([test_user, test_profile])
    db.commit()
    print("[SEED] Test account ensured: test@safeorder.dz / Test1234!")
