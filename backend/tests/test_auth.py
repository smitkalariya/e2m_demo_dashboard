import uuid

from sqlalchemy import update

from app.core.security import create_refresh_token
from app.models.user import User
from tests.conftest import TestSessionLocal

REGISTER_PAYLOAD = {"name": "Ada Lovelace", "email": "ada@example.com", "password": "supersecret123"}


async def _register_and_login(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    return response


async def test_register_creates_user(client):
    response = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    body = response.json()

    assert response.status_code == 201
    assert body["success"] is True
    assert body["data"]["email"] == REGISTER_PAYLOAD["email"]
    assert body["data"]["role"] == "user"
    assert "password" not in body["data"]


async def test_register_duplicate_email_conflicts(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["success"] is False


async def test_login_sets_auth_cookies(client):
    response = await _register_and_login(client)

    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


async def test_login_wrong_password_unauthorized(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = await client.post(
        "/api/v1/auth/login", json={"email": REGISTER_PAYLOAD["email"], "password": "wrong-password"}
    )

    assert response.status_code == 401


async def test_login_nonexistent_email_unauthorized(client):
    response = await client.post(
        "/api/v1/auth/login", json={"email": "ghost@example.com", "password": "whatever123"}
    )

    assert response.status_code == 401
    assert response.json()["success"] is False


async def test_login_deactivated_account_unauthorized(client):
    """Correct credentials but a deactivated account must still be rejected —
    this is a distinct branch from a bad password (different message, same
    status code), and is only reachable after the password check passes."""
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    async with TestSessionLocal() as session:
        await session.execute(
            update(User).where(User.email == REGISTER_PAYLOAD["email"]).values(is_active=False)
        )
        await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )

    assert response.status_code == 401
    assert "deactivated" in response.json()["message"].lower()


async def test_profile_requires_authentication(client):
    response = await client.get("/api/v1/auth/profile")
    assert response.status_code == 401


async def test_profile_returns_current_user_when_authenticated(client):
    await _register_and_login(client)
    response = await client.get("/api/v1/auth/profile")

    assert response.status_code == 200
    assert response.json()["data"]["email"] == REGISTER_PAYLOAD["email"]


async def test_refresh_rotates_tokens(client):
    login_response = await _register_and_login(client)
    old_refresh_cookie = login_response.cookies["refresh_token"]

    refresh_response = await client.post("/api/v1/auth/refresh")

    assert refresh_response.status_code == 200
    assert refresh_response.cookies["refresh_token"] != old_refresh_cookie


async def test_logout_revokes_refresh_token(client):
    await _register_and_login(client)
    await client.post("/api/v1/auth/logout")

    refresh_response = await client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401


async def test_refresh_without_cookie_unauthorized(client):
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


async def test_refresh_with_garbage_token_unauthorized(client):
    response = await client.post(
        "/api/v1/auth/refresh", headers={"Cookie": "refresh_token=not-a-real-jwt"}
    )
    assert response.status_code == 401


async def test_refresh_with_access_token_type_rejected(client):
    """An access token presented as a refresh token must be rejected — the
    `type` claim distinguishes them, not just signature validity."""
    login_response = await _register_and_login(client)
    access_cookie = login_response.cookies["access_token"]

    response = await client.post(
        "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={access_cookie}"}
    )
    assert response.status_code == 401


async def test_refresh_reusing_rotated_token_is_revoked(client):
    """Refresh tokens are single-use: once rotated, the original (pre-refresh)
    refresh token must be rejected if replayed — it was blocklisted by the first
    refresh call."""
    login_response = await _register_and_login(client)
    original_refresh_token = login_response.cookies["refresh_token"]

    # First refresh succeeds and rotates the cookie jar to a new token.
    first_refresh = await client.post("/api/v1/auth/refresh")
    assert first_refresh.status_code == 200
    assert first_refresh.cookies["refresh_token"] != original_refresh_token

    # Replaying the original, now-rotated-away-from token must be rejected.
    replay_attempt = await client.post(
        "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={original_refresh_token}"}
    )
    assert replay_attempt.status_code == 401


async def test_refresh_token_rejected_after_user_deactivated(client):
    """A refresh token for a user whose account was deactivated after issuance
    must be rejected even though the JWT signature/expiry are still valid."""
    login_response = await _register_and_login(client)
    assert login_response.status_code == 200

    async with TestSessionLocal() as session:
        await session.execute(
            update(User).where(User.email == REGISTER_PAYLOAD["email"]).values(is_active=False)
        )
        await session.commit()

    refresh_response = await client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401


async def test_refresh_token_rejected_for_deleted_user(client):
    """decode succeeds but the user no longer exists in the DB -> 401, not a 500."""
    fake_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    bogus_refresh, _ = create_refresh_token(fake_user_id, "user")

    response = await client.post(
        "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={bogus_refresh}"}
    )
    assert response.status_code == 401


async def test_logout_without_cookie_is_a_noop(client):
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["success"] is True


async def test_logout_with_garbage_token_is_a_noop(client):
    """logout() swallows PyJWTError for an undecodable token rather than 500ing."""
    response = await client.post(
        "/api/v1/auth/logout", headers={"Cookie": "refresh_token=not-a-real-jwt"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
