"""
Safe Order — Auth Dependencies
FastAPI dependencies for extracting current user and enforcing role-based access.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole
from app.services.auth_service import verify_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract and validate the current user from the Authorization header.
    Raises 401 if token is invalid or user not found.
    """
    token = credentials.credentials
    payload = verify_token(token, expected_type="access")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé",
        )

    return user


async def get_current_merchant(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require the current user to be a merchant."""
    if current_user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux marchands",
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require the current user to be an admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user


async def get_current_customer(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require the current user to be a customer."""
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux clients",
        )
    return current_user


def require_role(*roles: UserRole):
    """
    Factory for role-based access control.
    Usage: Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN))
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès réservé aux rôles: {', '.join(r.value for r in roles)}",
            )
        return current_user
    return role_checker
