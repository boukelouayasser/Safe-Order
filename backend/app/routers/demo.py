"""
Safe Order — Demo Shortcuts Router
Provides testing utilities when DEMO_MODE=True.
These endpoints bypass normal flows for jury presentation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, MerchantProfile, Order, UserRole, OrderStatus
from app.services.auth_service import create_token_pair
from app.config import settings

router = APIRouter()


@router.get("/accounts")
def list_demo_accounts(db: Session = Depends(get_db)):
    """List all demo accounts with their credentials."""
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    return {
        "demo_mode": True,
        "otp_code": settings.DEMO_OTP_CODE,
        "accounts": [
            {
                "role": "merchant",
                "label": "Test Account (recommended for testing)",
                "email": "test@safeorder.dz",
                "password": "Test1234!",
                "phone": "0555000000",
                "store": "Safe Order Test Store",
            },
            {
                "role": "admin",
                "email": "admin@safeorder.dz",
                "password": "Admin123!",
                "phone": "0550000000",
            },
            {
                "role": "merchant",
                "email": "merchant@safeorder.dz",
                "password": "Merchant123!",
                "phone": "0551111111",
                "store": "TechStore DZ",
            },
            {
                "role": "merchant",
                "email": "karim@safeorder.dz",
                "password": "Merchant123!",
                "phone": "0553333333",
                "store": "Fashion Oran",
            },
            {
                "role": "customer",
                "phone": "0552222222",
                "note": "No password — use OTP 123456",
            },
        ],
    }


@router.post("/quick-login/{role}")
def quick_login(role: str, db: Session = Depends(get_db)):
    """
    Instantly log in as a demo account without credentials.
    Roles: admin, merchant, merchant2, customer
    """
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    role_map = {
        "admin": "demo-admin-001",
        "merchant": "demo-merchant-001",
        "merchant2": "demo-merchant-002",
        "customer": "demo-customer-001",
        "test": "demo-test-001",
    }

    user_id = role_map.get(role)
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail=f"Rôle invalide. Utilisez: {', '.join(role_map.keys())}",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Compte démo non trouvé")

    tokens = create_token_pair(user.id, user.role.value)
    return {
        "message": f"Connecté en tant que {user.first_name} {user.last_name} ({user.role.value})",
        **tokens,
    }


@router.post("/advance-order/{order_id}")
def advance_order_status(order_id: str, db: Session = Depends(get_db)):
    """
    Advance an order to the next status in the pipeline.
    Useful for demoing the tracking flow without waiting.
    """
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    status_flow = [
        OrderStatus.CONFIRMATION,
        OrderStatus.PREPARATION,
        OrderStatus.DISPATCH,
        OrderStatus.DELIVERY,
        OrderStatus.DELIVERED,
    ]

    try:
        current_idx = status_flow.index(order.status)
        if current_idx < len(status_flow) - 1:
            order.status = status_flow[current_idx + 1]
            db.commit()
            return {
                "message": f"Commande avancée à: {order.status.value}",
                "tracking_code": order.tracking_code,
                "new_status": order.status.value,
            }
        else:
            return {"message": "La commande est déjà au statut final (livrée)"}
    except ValueError:
        return {"message": f"Statut actuel non avançable: {order.status.value}"}


@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """Reset demo data to initial state. WARNING: Drops and recreates all data."""
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    from app.database import Base, engine
    from app.seed import seed_initial_data, seed_demo_data

    # Recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Re-seed
    new_db = db
    seed_initial_data(new_db)
    seed_demo_data(new_db)

    return {"message": "Données de démonstration réinitialisées avec succès"}


@router.get("/ping")
def ping():
    return {
        "message": "Demo router active",
        "demo_mode": settings.DEMO_MODE,
    }
