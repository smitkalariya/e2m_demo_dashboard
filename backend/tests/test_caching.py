import uuid

from sqlalchemy import select

from app.cache.cache_service import CacheService
from app.models.customer import Customer
from app.models.interaction import Interaction
from app.models.user import User
from app.repositories.ai_insight import AIInsightRepository
from app.services.ai_insight_service import AIInsightService
from tests.conftest import TestSessionLocal

MANAGER_PAYLOAD = {
    "name": "Mona Manager",
    "email": "manager4@example.com",
    "password": "supersecret123",
}

CUSTOMER_PAYLOAD = {
    "company_name": "Acme Corp",
    "contact_name": "Wile Coyote",
    "email": "wile4@acme.com",
}

INTERACTION_PAYLOAD = {
    "title": "Quarterly check-in",
    "notes": "Discussed renewal and onboarding blockers.",
    "meeting_date": "2026-05-01T10:00:00Z",
}


async def _manager_client(client, set_user_role):
    await client.post("/api/v1/auth/register", json=MANAGER_PAYLOAD)
    await client.post(
        "/api/v1/auth/login",
        json={"email": MANAGER_PAYLOAD["email"], "password": MANAGER_PAYLOAD["password"]},
    )
    await set_user_role(MANAGER_PAYLOAD["email"], "manager")
    await client.post(
        "/api/v1/auth/login",
        json={"email": MANAGER_PAYLOAD["email"], "password": MANAGER_PAYLOAD["password"]},
    )
    return client


async def test_dashboard_metrics_requires_authentication(client):
    response = await client.get("/api/v1/dashboard/metrics")
    assert response.status_code == 401


async def test_dashboard_metrics_reflects_created_data(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = customer_resp.json()["data"]["id"]
    await client.post(f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD)

    response = await client.get("/api/v1/dashboard/metrics")
    data = response.json()["data"]

    assert response.status_code == 200
    assert data["total_customers"] == 1
    assert data["total_interactions"] == 1
    assert len(data["recent_interactions"]) == 1
    assert data["sentiment_breakdown"] == {"positive": 0, "neutral": 0, "negative": 0}


async def test_dashboard_metrics_invalidated_after_customer_create(client, set_user_role):
    await _manager_client(client, set_user_role)

    empty = await client.get("/api/v1/dashboard/metrics")
    assert empty.json()["data"]["total_customers"] == 0

    await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)

    refreshed = await client.get("/api/v1/dashboard/metrics")
    assert refreshed.json()["data"]["total_customers"] == 1


async def test_dashboard_metrics_second_read_is_served_from_cache(client, set_user_role):
    """The first GET computes and caches metrics; a direct DB write that bypasses
    the service layer must not be visible on the second GET, proving the cached
    branch (not a fresh _compute_metrics() call) served the response."""
    await _manager_client(client, set_user_role)

    first = await client.get("/api/v1/dashboard/metrics")
    assert first.json()["data"]["total_customers"] == 0

    async with TestSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.email == MANAGER_PAYLOAD["email"]))
        ).scalar_one()
        session.add(
            Customer(
                company_name="Bypassed Co",
                contact_name="Direct Insert",
                email="bypassed@example.com",
                created_by_id=user.id,
            )
        )
        await session.commit()

    second = await client.get("/api/v1/dashboard/metrics")
    assert second.json()["data"]["total_customers"] == 0  # still cached, not recomputed


async def test_dashboard_sentiment_breakdown_counts_completed_insights(client, set_user_role):
    """Drives a completed AI insight through AIInsightService (bypassing the real
    OpenAI client, which isn't configured in tests) so the dashboard's sentiment
    aggregation query has a non-null sentiment row to count."""
    await _manager_client(client, set_user_role)
    customer_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = customer_resp.json()["data"]["id"]
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    class _StubClient:
        async def generate(self, prompt: str) -> str:
            return (
                '{"summary": "Strong renewal signal.", "sentiment": "positive", '
                '"action_items": [], "risks": []}'
            )

    async with TestSessionLocal() as session:
        interaction = (
            await session.execute(
                select(Interaction).where(Interaction.id == uuid.UUID(interaction_id))
            )
        ).scalar_one()
        service = AIInsightService(AIInsightRepository(session), _StubClient(), CacheService())
        await service.generate_for_interaction(interaction)
        await session.commit()

    response = await client.get("/api/v1/dashboard/metrics")
    breakdown = response.json()["data"]["sentiment_breakdown"]
    assert breakdown == {"positive": 1, "neutral": 0, "negative": 0}


async def test_dashboard_sentiment_breakdown_excludes_soft_deleted_interactions(
    client, set_user_role
):
    """Regression test: deleting a customer soft-deletes its interactions but
    leaves the AIInsight row in place (soft-delete, not a DB cascade). The
    sentiment aggregation must join against Interaction.deleted_at so a
    deleted interaction's insight stops being counted forever."""
    await _manager_client(client, set_user_role)
    customer_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = customer_resp.json()["data"]["id"]
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    class _StubClient:
        async def generate(self, prompt: str) -> str:
            return (
                '{"summary": "Strong renewal signal.", "sentiment": "positive", '
                '"action_items": [], "risks": []}'
            )

    async with TestSessionLocal() as session:
        interaction = (
            await session.execute(
                select(Interaction).where(Interaction.id == uuid.UUID(interaction_id))
            )
        ).scalar_one()
        service = AIInsightService(AIInsightRepository(session), _StubClient(), CacheService())
        await service.generate_for_interaction(interaction)
        await session.commit()

    before = await client.get("/api/v1/dashboard/metrics")
    assert before.json()["data"]["sentiment_breakdown"] == {
        "positive": 1,
        "neutral": 0,
        "negative": 0,
    }

    await client.delete(f"/api/v1/customers/{customer_id}")

    after = await client.get("/api/v1/dashboard/metrics")
    assert after.json()["data"]["sentiment_breakdown"] == {
        "positive": 0,
        "neutral": 0,
        "negative": 0,
    }


async def test_customer_list_cache_is_stale_until_a_write_invalidates_it(
    client, set_user_role, insert_customer_directly
):
    await _manager_client(client, set_user_role)
    await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)

    first = await client.get("/api/v1/customers")
    assert first.json()["data"]["total"] == 1

    # Bypasses CustomerService entirely, so no cache invalidation fires.
    await insert_customer_directly("Globex Inc", MANAGER_PAYLOAD["email"])

    stale = await client.get("/api/v1/customers")
    assert stale.json()["data"]["total"] == 1

    # A real write through the service busts the cache for subsequent reads.
    await client.post(
        "/api/v1/customers",
        json={**CUSTOMER_PAYLOAD, "company_name": "Initech", "email": "initech@example.com"},
    )

    fresh = await client.get("/api/v1/customers")
    assert fresh.json()["data"]["total"] == 3
