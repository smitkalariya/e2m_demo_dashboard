import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.openai_client import OpenAIInsightClient
from app.cache.cache_service import CacheService
from app.core.responses import success_response
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.repositories.ai_insight import AIInsightRepository
from app.repositories.customer import CustomerRepository
from app.repositories.interaction import InteractionRepository
from app.schemas.ai_insight import AIInsightPublic
from app.schemas.common import PaginatedResponse
from app.schemas.interaction import (
    InteractionCreate,
    InteractionDetail,
    InteractionListQuery,
    InteractionPublic,
    InteractionUpdate,
)
from app.services.ai_insight_service import AIInsightService
from app.services.interaction_service import InteractionService

router = APIRouter(tags=["interactions"])


async def get_interaction_service(session: AsyncSession = Depends(get_db)) -> InteractionService:
    cache = CacheService()
    ai_insight_service = AIInsightService(AIInsightRepository(session), OpenAIInsightClient(), cache)
    return InteractionService(
        InteractionRepository(session), CustomerRepository(session), ai_insight_service, cache
    )


@router.post("/customers/{customer_id}/interactions", status_code=201)
async def create_interaction(
    customer_id: uuid.UUID,
    data: InteractionCreate,
    current_user: User = Depends(get_current_user),
    service: InteractionService = Depends(get_interaction_service),
):
    interaction = await service.create(customer_id, data, current_user)
    return success_response(
        data=InteractionPublic.model_validate(interaction).model_dump(mode="json"),
        message="Interaction created",
        status_code=201,
    )


@router.get("/interactions")
async def list_interactions(
    query: Annotated[InteractionListQuery, Query()],
    _: User = Depends(get_current_user),
    service: InteractionService = Depends(get_interaction_service),
):
    interactions, total = await service.list(query)
    payload = PaginatedResponse[InteractionPublic](
        items=[InteractionPublic.model_validate(i) for i in interactions],
        total=total,
        page=query.page,
        page_size=query.page_size,
        total_pages=(total + query.page_size - 1) // query.page_size if total else 0,
    )
    return success_response(data=payload.model_dump(mode="json"))


@router.get("/interactions/{interaction_id}")
async def get_interaction(
    interaction_id: uuid.UUID,
    _: User = Depends(get_current_user),
    service: InteractionService = Depends(get_interaction_service),
):
    interaction = await service.get(interaction_id)
    insight = await service.ai_insight_service.get_for_interaction(interaction_id)
    detail = InteractionDetail(
        **InteractionPublic.model_validate(interaction).model_dump(),
        ai_insight=AIInsightPublic.model_validate(insight) if insight else None,
    )
    return success_response(data=detail.model_dump(mode="json"))


@router.patch("/interactions/{interaction_id}")
async def update_interaction(
    interaction_id: uuid.UUID,
    data: InteractionUpdate,
    _: User = Depends(get_current_user),
    service: InteractionService = Depends(get_interaction_service),
):
    interaction = await service.update(interaction_id, data)
    return success_response(
        data=InteractionPublic.model_validate(interaction).model_dump(mode="json"),
        message="Interaction updated",
    )


@router.delete("/interactions/{interaction_id}")
async def delete_interaction(
    interaction_id: uuid.UUID,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
    service: InteractionService = Depends(get_interaction_service),
):
    await service.delete(interaction_id)
    return success_response(message="Interaction deleted")


@router.post("/interactions/{interaction_id}/insights/regenerate")
async def regenerate_insight(
    interaction_id: uuid.UUID,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
    service: InteractionService = Depends(get_interaction_service),
):
    insight = await service.regenerate_insight(interaction_id)
    return success_response(
        data=AIInsightPublic.model_validate(insight).model_dump(mode="json"),
        message="Insight regeneration complete",
    )
