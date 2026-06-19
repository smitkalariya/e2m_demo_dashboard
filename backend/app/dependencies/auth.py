import uuid

import jwt
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import TokenType, decode_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.user import UserRepository


def _extract_access_token(request: Request) -> str:
    token = request.cookies.get("access_token")
    if token:
        return token

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()

    raise UnauthorizedError("Not authenticated")


async def get_current_user(
    request: Request, session: AsyncSession = Depends(get_db)
) -> User:
    token = _extract_access_token(request)

    try:
        payload = decode_token(token)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc

    if payload.get("type") != TokenType.ACCESS.value:
        raise UnauthorizedError("Invalid token type")

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(uuid.UUID(payload["sub"]))
    if not user or not user.is_active:
        raise UnauthorizedError("User no longer active")

    return user


def require_roles(*roles: UserRole):
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError("You do not have permission to perform this action")
        return current_user

    return dependency
