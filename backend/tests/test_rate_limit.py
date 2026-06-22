from app.core.config import Settings


async def test_auth_endpoint_returns_429_after_exceeding_limit(client, monkeypatch):
    low_limit_settings = Settings(auth_rate_limit_per_minute=2, rate_limit_per_minute=50)
    monkeypatch.setattr("app.middleware.rate_limit.get_settings", lambda: low_limit_settings)

    for _ in range(2):
        response = await client.get("/api/v1/auth/profile")
        assert response.status_code == 401

    blocked = await client.get("/api/v1/auth/profile")
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["success"] is False
    assert "too many requests" in body["message"].lower()


async def test_non_auth_endpoint_uses_global_limit_independently_of_auth_limit(client, monkeypatch):
    low_limit_settings = Settings(auth_rate_limit_per_minute=1, rate_limit_per_minute=2)
    monkeypatch.setattr("app.middleware.rate_limit.get_settings", lambda: low_limit_settings)

    for _ in range(2):
        response = await client.get("/api/v1/customers")
        assert response.status_code == 401

    blocked = await client.get("/api/v1/customers")
    assert blocked.status_code == 429


async def test_health_endpoint_is_exempt_from_rate_limiting(client, monkeypatch):
    zero_limit_settings = Settings(auth_rate_limit_per_minute=0, rate_limit_per_minute=0)
    monkeypatch.setattr("app.middleware.rate_limit.get_settings", lambda: zero_limit_settings)

    for _ in range(5):
        response = await client.get("/health")
        assert response.status_code == 200
