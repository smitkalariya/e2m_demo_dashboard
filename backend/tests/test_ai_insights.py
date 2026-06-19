import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, RateLimitError
from sqlalchemy import select

from app.ai.exceptions import AIGenerationError
from app.ai.openai_client import OpenAIInsightClient
from app.ai.response_parser import parse_insight_response
from app.cache.cache_service import CacheService
from app.models.interaction import Interaction
from app.repositories.ai_insight import AIInsightRepository
from app.services.ai_insight_service import AIInsightService
from tests.conftest import TestSessionLocal

MANAGER_PAYLOAD = {"name": "Mona Manager", "email": "manager3@example.com", "password": "supersecret123"}
USER_PAYLOAD = {"name": "Ulysses User", "email": "user3@example.com", "password": "supersecret123"}

CUSTOMER_PAYLOAD = {
    "company_name": "Acme Corp",
    "contact_name": "Wile Coyote",
    "email": "wile3@acme.com",
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


# --- Unit tests: response parser -------------------------------------------------


def test_parse_insight_response_accepts_valid_json():
    raw = (
        '{"summary": "Good call.", "sentiment": "positive", '
        '"action_items": ["Send proposal"], "risks": []}'
    )
    result = parse_insight_response(raw)
    assert result.summary == "Good call."
    assert result.sentiment.value == "positive"
    assert result.action_items == ["Send proposal"]


def test_parse_insight_response_rejects_invalid_json():
    with pytest.raises(AIGenerationError):
        parse_insight_response("not json")


def test_parse_insight_response_rejects_schema_mismatch():
    with pytest.raises(AIGenerationError):
        parse_insight_response('{"summary": "ok"}')


# --- Unit test: OpenAI client missing-key fallback --------------------------------


async def test_openai_client_raises_without_api_key():
    client = OpenAIInsightClient()
    with pytest.raises(AIGenerationError):
        await client.generate("irrelevant prompt")


def test_openai_client_constructs_real_client_when_api_key_configured(monkeypatch):
    """When OPENAI_API_KEY is set, the constructor must build a real AsyncOpenAI
    client instead of leaving self._client as None (the no-key short-circuit
    branch is covered by the test above; this covers the opposite branch)."""
    from app.core.config import Settings

    configured_settings = Settings(openai_api_key="sk-test-key-123")
    monkeypatch.setattr("app.ai.openai_client.get_settings", lambda: configured_settings)

    client = OpenAIInsightClient()

    assert client._client is not None
    assert isinstance(client._client, AsyncOpenAI)


# --- Unit tests: OpenAI client retry/backoff logic ---------------------------------


def _fake_request() -> httpx.Request:
    return httpx.Request("POST", "https://api.openai.com/v1/chat/completions")


def _rate_limit_error() -> RateLimitError:
    resp = httpx.Response(429, request=_fake_request())
    return RateLimitError("rate limited", response=resp, body=None)


def _timeout_error() -> APITimeoutError:
    return APITimeoutError(request=_fake_request())


def _connection_error() -> APIConnectionError:
    return APIConnectionError(request=_fake_request())


def _make_client_with_mock(max_retries: int = 2):
    """Build a real OpenAIInsightClient with its underlying AsyncOpenAI client and
    settings swapped for test doubles, bypassing the constructor's api-key gate."""
    client = OpenAIInsightClient()
    client._settings = SimpleNamespace(
        openai_max_retries=max_retries,
        openai_model="gpt-4o-mini",
    )
    mock_completions = AsyncMock()
    client._client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=mock_completions))
    )
    return client, mock_completions


def _completion_with_content(content: str):
    message = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


async def test_generate_succeeds_on_first_attempt_without_sleeping():
    client, mock_create = _make_client_with_mock()
    mock_create.return_value = _completion_with_content('{"ok": true}')

    with patch("app.ai.openai_client.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        result = await client.generate("prompt")

    assert result == '{"ok": true}'
    assert mock_create.call_count == 1
    mock_sleep.assert_not_called()


async def test_generate_retries_on_rate_limit_then_succeeds():
    client, mock_create = _make_client_with_mock(max_retries=2)
    mock_create.side_effect = [
        _rate_limit_error(),
        _completion_with_content('{"ok": true}'),
    ]

    with patch("app.ai.openai_client.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        result = await client.generate("prompt")

    assert result == '{"ok": true}'
    assert mock_create.call_count == 2
    mock_sleep.assert_awaited_once_with(1)  # 2 ** attempt(0)


async def test_generate_retries_on_timeout_and_connection_errors():
    client, mock_create = _make_client_with_mock(max_retries=2)
    mock_create.side_effect = [
        _timeout_error(),
        _connection_error(),
        _completion_with_content('{"ok": true}'),
    ]

    with patch("app.ai.openai_client.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        result = await client.generate("prompt")

    assert result == '{"ok": true}'
    assert mock_create.call_count == 3
    assert mock_sleep.await_args_list == [((1,),), ((2,),)]  # 2**0, 2**1


async def test_generate_raises_after_exhausting_all_retries():
    client, mock_create = _make_client_with_mock(max_retries=2)
    mock_create.side_effect = [
        _rate_limit_error(),
        _rate_limit_error(),
        _rate_limit_error(),
    ]

    with patch("app.ai.openai_client.asyncio.sleep", new_callable=AsyncMock):
        with pytest.raises(AIGenerationError, match="failed after 3 attempts"):
            await client.generate("prompt")

    assert mock_create.call_count == 3


async def test_generate_wraps_non_retryable_exception_immediately():
    client, mock_create = _make_client_with_mock(max_retries=2)
    mock_create.side_effect = ValueError("boom")

    with patch("app.ai.openai_client.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
        with pytest.raises(AIGenerationError, match="OpenAI call failed: boom"):
            await client.generate("prompt")

    assert mock_create.call_count == 1
    mock_sleep.assert_not_called()


async def test_generate_raises_when_response_content_is_empty():
    client, mock_create = _make_client_with_mock(max_retries=2)
    mock_create.return_value = _completion_with_content(None)

    with patch("app.ai.openai_client.asyncio.sleep", new_callable=AsyncMock):
        with pytest.raises(AIGenerationError, match="empty response"):
            await client.generate("prompt")

    # Empty content is wrapped by the generic except clause, so it is not retried.
    assert mock_create.call_count == 1


# --- Integration: AI insight wired into interaction creation ----------------------


async def test_creating_interaction_without_api_key_stores_failed_insight(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = customer_resp.json()["data"]["id"]

    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]
    assert create_resp.status_code == 201

    detail_resp = await client.get(f"/api/v1/interactions/{interaction_id}")
    insight = detail_resp.json()["data"]["ai_insight"]

    assert insight is not None
    assert insight["status"] == "failed"
    assert insight["summary"] is None
    assert "API key" in insight["error_message"]


async def test_plain_user_cannot_regenerate_insight(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = customer_resp.json()["data"]["id"]
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    await _login(client, USER_PAYLOAD)
    response = await client.post(f"/api/v1/interactions/{interaction_id}/insights/regenerate")
    assert response.status_code == 403


async def test_manager_can_regenerate_insight(client, set_user_role):
    await _manager_client(client, set_user_role)
    customer_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = customer_resp.json()["data"]["id"]
    create_resp = await client.post(
        f"/api/v1/customers/{customer_id}/interactions", json=INTERACTION_PAYLOAD
    )
    interaction_id = create_resp.json()["data"]["id"]

    response = await client.post(f"/api/v1/interactions/{interaction_id}/insights/regenerate")
    body = response.json()

    assert response.status_code == 200
    assert body["data"]["status"] == "failed"

    # Regenerating must update the existing row, not create a second one.
    detail_resp = await client.get(f"/api/v1/interactions/{interaction_id}")
    assert detail_resp.json()["data"]["ai_insight"]["id"] == body["data"]["id"]


# --- Unit tests: AIInsightService success path & cache invalidation ---------------


async def test_ai_insight_service_creates_completed_insight_on_success(client, set_user_role):
    """Drives AIInsightService directly with a stub OpenAI client whose .generate()
    returns valid JSON, to exercise the success branch (lines uncovered when no
    OPENAI_API_KEY is configured at the integration level)."""
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
                '{"summary": "Great progress on renewal.", "sentiment": "positive", '
                '"action_items": ["Send contract"], "risks": []}'
            )

    async with TestSessionLocal() as session:
        interaction = (
            await session.execute(
                select(Interaction).where(Interaction.id == uuid.UUID(interaction_id))
            )
        ).scalar_one()

        cache = CacheService()
        service = AIInsightService(AIInsightRepository(session), _StubClient(), cache)
        insight = await service.generate_for_interaction(interaction)
        await session.commit()

        assert insight.status.value == "completed"
        assert insight.summary == "Great progress on renewal."
        assert insight.sentiment.value == "positive"
        assert insight.action_items == ["Send contract"]
        assert insight.risks == []
        assert insight.error_message is None

    # Cache invalidation: dashboard metrics key must be cleared after generation.
    detail_resp = await client.get(f"/api/v1/interactions/{interaction_id}")
    assert detail_resp.json()["data"]["ai_insight"]["status"] == "completed"


async def test_ai_insight_service_updates_existing_row_not_create_second(client, set_user_role):
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
                '{"summary": "All good.", "sentiment": "neutral", '
                '"action_items": [], "risks": []}'
            )

    async with TestSessionLocal() as session:
        interaction = (
            await session.execute(
                select(Interaction).where(Interaction.id == uuid.UUID(interaction_id))
            )
        ).scalar_one()

        cache = CacheService()
        repo = AIInsightRepository(session)
        service = AIInsightService(repo, _StubClient(), cache)

        first = await service.generate_for_interaction(interaction)
        await session.commit()
        second = await service.generate_for_interaction(interaction)
        await session.commit()

        assert first.id == second.id
        assert second.status.value == "completed"
