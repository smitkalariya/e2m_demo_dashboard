import uuid

import pytest
from fastapi import Request

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import create_access_token
from app.dependencies.auth import _extract_access_token, get_current_user, require_roles
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from tests.conftest import TestSessionLocal

REGISTER_PAYLOAD = {"name": "Ada Lovelace", "email": "ada-deps@example.com", "password": "supersecret123"}


def _request_with(cookies: dict | None = None, headers: dict | None = None) -> Request:
    scope = {
        "type": "http",
        "headers": [
            (k.lower().encode(), v.encode()) for k, v in (headers or {}).items()
        ],
    }
    request = Request(scope)
    if cookies:
        # Request.cookies parses from the Cookie header; build it directly.
        cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
        scope["headers"].append((b"cookie", cookie_header.encode()))
        request = Request(scope)
    return request


# --- Unit tests: _extract_access_token ---------------------------------------------


def test_extract_access_token_prefers_cookie():
    request = _request_with(cookies={"access_token": "cookie-token"})
    assert _extract_access_token(request) == "cookie-token"


def test_extract_access_token_falls_back_to_bearer_header():
    request = _request_with(headers={"Authorization": "Bearer header-token"})
    assert _extract_access_token(request) == "header-token"


def test_extract_access_token_raises_without_any_credentials():
    request = _request_with()
    with pytest.raises(UnauthorizedError):
        _extract_access_token(request)


def test_extract_access_token_ignores_non_bearer_scheme():
    request = _request_with(headers={"Authorization": "Basic somecreds"})
    with pytest.raises(UnauthorizedError):
        _extract_access_token(request)


# --- Unit tests: get_current_user ---------------------------------------------------


async def test_get_current_user_rejects_garbage_token():
    request = _request_with(cookies={"access_token": "not-a-real-jwt"})
    async with TestSessionLocal() as session:
        with pytest.raises(UnauthorizedError, match="Invalid or expired access token"):
            await get_current_user(request, session)


async def test_get_current_user_rejects_refresh_token_used_as_access():
    from app.core.security import create_refresh_token

    refresh_token, _ = create_refresh_token(uuid.uuid4(), "user")
    request = _request_with(cookies={"access_token": refresh_token})
    async with TestSessionLocal() as session:
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            await get_current_user(request, session)


async def test_get_current_user_rejects_token_for_unknown_user():
    token = create_access_token(uuid.uuid4(), "user")
    request = _request_with(cookies={"access_token": token})
    async with TestSessionLocal() as session:
        with pytest.raises(UnauthorizedError, match="User no longer active"):
            await get_current_user(request, session)


async def test_get_current_user_rejects_token_for_deactivated_user():
    async with TestSessionLocal() as session:
        repo = UserRepository(session)
        user = User(
            name="Deactivated Dan",
            email="deactivated@example.com",
            password_hash="irrelevant",
            is_active=False,
        )
        user = await repo.create(user)
        await session.commit()
        user_id = user.id

    token = create_access_token(user_id, "user")
    request = _request_with(cookies={"access_token": token})
    async with TestSessionLocal() as session:
        with pytest.raises(UnauthorizedError, match="User no longer active"):
            await get_current_user(request, session)


async def test_get_current_user_succeeds_with_valid_access_token():
    async with TestSessionLocal() as session:
        repo = UserRepository(session)
        user = User(name="Active Annie", email="active-annie@example.com", password_hash="irrelevant")
        user = await repo.create(user)
        await session.commit()
        user_id = user.id

    token = create_access_token(user_id, "user")
    request = _request_with(cookies={"access_token": token})
    async with TestSessionLocal() as session:
        current = await get_current_user(request, session)
        assert current.id == user_id
        assert current.email == "active-annie@example.com"


# --- Unit tests: require_roles -------------------------------------------------------


async def test_require_roles_allows_matching_role():
    dependency = require_roles(UserRole.ADMIN, UserRole.MANAGER)
    user = User(name="M", email="m@example.com", password_hash="x", role=UserRole.MANAGER)
    result = await dependency(current_user=user)
    assert result is user


async def test_require_roles_raises_forbidden_for_mismatched_role():
    dependency = require_roles(UserRole.ADMIN, UserRole.MANAGER)
    user = User(name="U", email="u@example.com", password_hash="x", role=UserRole.USER)
    with pytest.raises(ForbiddenError):
        await dependency(current_user=user)


# --- Integration: Authorization header works end-to-end through the real API ------


async def test_bearer_header_authenticates_request(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    access_token = login_resp.cookies["access_token"]

    # Drop cookies and rely solely on the Authorization header.
    client.cookies.clear()
    response = await client.get(
        "/api/v1/auth/profile", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == REGISTER_PAYLOAD["email"]
