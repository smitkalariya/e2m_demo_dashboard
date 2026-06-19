import uuid
from datetime import datetime, timezone

import jwt

from app.cache.token_blocklist import blocklist_token, is_blocklisted
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserLogin, UserRegister


class TokenPair:
    def __init__(self, access_token: str, refresh_token: str):
        self.access_token = access_token
        self.refresh_token = refresh_token


def _remaining_seconds(exp_timestamp: int) -> int:
    return max(0, exp_timestamp - int(datetime.now(timezone.utc).timestamp()))


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, data: UserRegister) -> User:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise ConflictError("A user with this email already exists")

        user = User(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
        )
        return await self.user_repo.create(user)

    async def authenticate(self, data: UserLogin) -> User:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("This account has been deactivated")
        return user

    def issue_tokens(self, user: User) -> TokenPair:
        access_token = create_access_token(user.id, user.role.value)
        refresh_token, _ = create_refresh_token(user.id, user.role.value)
        return TokenPair(access_token, refresh_token)

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            payload = decode_token(refresh_token)
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Invalid or expired refresh token") from exc

        if payload.get("type") != TokenType.REFRESH.value:
            raise UnauthorizedError("Invalid token type")

        jti = payload["jti"]
        if await is_blocklisted(jti):
            raise UnauthorizedError("Refresh token has been revoked")

        user = await self.user_repo.get_by_id(uuid.UUID(payload["sub"]))
        if not user or not user.is_active:
            raise UnauthorizedError("User no longer active")

        await blocklist_token(jti, _remaining_seconds(payload["exp"]))
        return self.issue_tokens(user)

    async def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
        except jwt.PyJWTError:
            return
        await blocklist_token(payload["jti"], _remaining_seconds(payload["exp"]))
