import uuid

from sqlalchemy import select

from app.cache.cache_service import CacheService
from app.models.user import User
from app.repositories.customer import CustomerRepository
from app.repositories.interaction import InteractionRepository
from app.schemas.interaction import InteractionCreate
from app.services.interaction_service import InteractionService
from tests.conftest import TestSessionLocal

MANAGER_PAYLOAD = {"name": "Mona Manager", "email": "manager2@example.com", "password": "supersecret123"}
USER_PAYLOAD = {"name": "Ulysses User", "email": "user2@example.com", "password": "supersecret123"}

CUSTOMER_PAYLOAD = {
    "company_name": "Acme Corp",
    "contact_name": "Wile Coyote",
    "email": "wile2@acme.com",
}

INTERACTION_PAYLOAD = {
    "title": "Quarterly check-in",
    "notes": "Discussed renewal and onboarding blockers.",
    "meeting_date": "2026-05-01T10:00:00Z",
}


async def _login(client, payload):
    await client.post("/api/v1/auth/register", json=payload)
    return await client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]}
    )


async def _manager_client(client, set_user_role):
    await _login(client, MANAGER_PAYLOAD)
    await set_user_role(MANAGER_PAYLOAD["email"], "manager")
    await client.post(
        "/api/v1/auth/login",
        json={"email": MANAGER_PAYLOAD["email"], "password": MANAGER_PAYLOAD["password"]},
    )
    return client


async def _create_customer(client) -> str:
    response = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    return response.json()["data"]["id"]


async def test_create_interaction_requires_authentication(client):
    response = await client.post(
        "/api/v1/customers/00000000-0000-0000-0000-000000000000/interactions",
        json=INTERACTION_PAYLOAD,
    )
    assert response.status_code == 401


async def test_create_interaction_unknown_customer_404(client, set_user_role):
    await _manager_client(client, set_user_role)
    response = await client.post(
        "/api/v1/customers/00000000-0000-0000-0000-000000000000/interactions",
        json=INTERACTION_PAYLOAD,
    )
    assert response.status_code == 404


async def test_plain_user_can_create_interaction(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_id = await _create_customer(client)

    await _login(client, USER_PAYLOAD)
    response = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )

    assert response.status_code == 201
    assert response.json()["data"]["title"] == INTERACTION_PAYLOAD["title"]


async def test_plain_user_cannot_delete_interaction(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_id = await _create_customer(client)
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    await _login(client, USER_PAYLOAD)
    response = await client.delete(f"/api/v1/interactions/{interaction_id}")
    assert response.status_code == 403


async def test_manager_can_update_and_delete_interaction(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_id = await _create_customer(client)
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    update_resp = await client.patch(
        f"/api/v1/interactions/{interaction_id}", json={"title": "Renewal call"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["title"] == "Renewal call"

    delete_resp = await client.delete(f"/api/v1/interactions/{interaction_id}")
    assert delete_resp.status_code == 200

    get_resp = await client.get(f"/api/v1/interactions/{interaction_id}")
    assert get_resp.status_code == 404


async def test_list_interactions_filters_by_customer_and_date_range(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_a = await _create_customer(client)
    customer_b_resp = await client.post(
        "/api/v1/customers",
        json={**CUSTOMER_PAYLOAD, "company_name": "Globex Inc", "email": "hank2@globex.com"},
    )
    customer_b = customer_b_resp.json()["data"]["id"]

    await client.post(
        f"/api/v1/customers/{customer_a}/interactions",
        json={**INTERACTION_PAYLOAD, "meeting_date": "2026-01-01T10:00:00Z"},
    )
    await client.post(
        f"/api/v1/customers/{customer_b}/interactions",
        json={**INTERACTION_PAYLOAD, "meeting_date": "2026-06-01T10:00:00Z"},
    )

    by_customer = await client.get("/api/v1/interactions", params={"customer_id": customer_a})
    assert by_customer.json()["data"]["total"] == 1

    by_date = await client.get(
        "/api/v1/interactions",
        params={"date_from": "2026-05-01T00:00:00Z", "date_to": "2026-07-01T00:00:00Z"},
    )
    assert by_date.json()["data"]["total"] == 1
    assert by_date.json()["data"]["items"][0]["customer_id"] == customer_b


async def test_deleting_customer_cascades_soft_delete_to_interactions(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_id = await _create_customer(client)
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    delete_resp = await client.delete(f"/api/v1/customers/{customer_id}")
    assert delete_resp.status_code == 200

    get_resp = await client.get(f"/api/v1/interactions/{interaction_id}")
    assert get_resp.status_code == 404

    list_resp = await client.get("/api/v1/interactions", params={"customer_id": customer_id})
    assert list_resp.json()["data"]["total"] == 0


async def test_get_update_delete_regenerate_unknown_interaction_404(client, set_user_role):
    await _manager_client(client, set_user_role)
    unknown_id = "00000000-0000-0000-0000-000000000000"

    assert (await client.get(f"/api/v1/interactions/{unknown_id}")).status_code == 404
    assert (
        await client.patch(f"/api/v1/interactions/{unknown_id}", json={"title": "x"})
    ).status_code == 404
    assert (await client.delete(f"/api/v1/interactions/{unknown_id}")).status_code == 404
    assert (
        await client.post(f"/api/v1/interactions/{unknown_id}/insights/regenerate")
    ).status_code == 404


class _RaisingAIInsightService:
    """Stand-in whose generate_for_interaction raises something other than
    AIGenerationError, simulating an unexpected bug in the AI layer."""

    async def generate_for_interaction(self, interaction):
        raise RuntimeError("unexpected bug in ai client")


async def test_create_interaction_survives_unexpected_ai_insight_exception(client, set_user_role):
    """interaction_service.create() must swallow *any* exception from AI insight
    generation (not just AIGenerationError) and still return the created
    interaction — a bug in the AI integration must never block interaction
    creation."""
    await _manager_client(client, set_user_role)
    customer_id = await _create_customer(client)

    async with TestSessionLocal() as session:
        cache = CacheService()
        service = InteractionService(
            InteractionRepository(session),
            CustomerRepository(session),
            _RaisingAIInsightService(),
            cache,
        )
        interaction = await service.create(
            uuid.UUID(customer_id),
            InteractionCreate(**INTERACTION_PAYLOAD),
            created_by=(
                await session.execute(
                    select(User).where(User.email == MANAGER_PAYLOAD["email"])
                )
            ).scalar_one(),
        )
        await session.commit()

        assert interaction.id is not None
        assert interaction.title == INTERACTION_PAYLOAD["title"]
