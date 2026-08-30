"""
LMPC Compliance System — FastAPI Dependencies

Shared dependencies for route handlers: current user extraction,
database session, role-based access control guards.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.db.models.models import User, UserRole

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_PREFIX}/auth/token",
    auto_error=False,
)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Extract and validate the current user from the JWT bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str | None = payload.get("sub")
    if username is None:
        raise credentials_exception

    result = await db.execute(
        select(User).where(
            (User.username == username) | (User.email == username) | (User.unique_login_id == username),
            User.is_active == True
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the current user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


def require_role(*roles: UserRole):
    """Dependency factory — restrict endpoint to specific user roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN))])
    """
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        # SUPER_ADMIN or ADMIN has broad access if either is included
        allowed_roles = set(roles)
        if UserRole.ADMIN in allowed_roles:
            allowed_roles.add(UserRole.SUPER_ADMIN)
        if UserRole.SUPER_ADMIN in allowed_roles:
            allowed_roles.add(UserRole.ADMIN)

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Requires role: {', '.join(r.value for r in roles)}",
            )
        return current_user

    return role_checker


# Convenient shorthands
require_super_admin = require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
require_inspector = require_role(UserRole.INSPECTOR, UserRole.SUPER_ADMIN, UserRole.ADMIN)
