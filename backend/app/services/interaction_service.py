import uuid

from app.cache.cache_service import CacheService
from app.cache.keys import DASHBOARD_METRICS_KEY
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.interaction import Interaction
from app.models.user import User
from app.repositories.customer import CustomerRepository
from app.repositories.interaction import InteractionRepository
from app.schemas.interaction import InteractionCreate, InteractionListQuery, InteractionUpdate
from app.services.ai_insight_service import AIInsightService

logger = get_logger(__name__)


class InteractionService:
    def __init__(
        self,
        repository: InteractionRepository,
        customer_repository: CustomerRepository,
        ai_insight_service: AIInsightService,
        cache: CacheService,
    ):
        self.repository = repository
        self.customer_repository = customer_repository
        self.ai_insight_service = ai_insight_service
        self.cache = cache

    async def _ensure_customer_exists(self, customer_id: uuid.UUID) -> None:
        customer = await self.customer_repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")

    async def create(
        self, customer_id: uuid.UUID, data: InteractionCreate, created_by: User
    ) -> Interaction:
        await self._ensure_customer_exists(customer_id)
        interaction = Interaction(
            **data.model_dump(), customer_id=customer_id, created_by_id=created_by.id
        )
        interaction = await self.repository.create(interaction)
        await self.cache.delete(DASHBOARD_METRICS_KEY)

        # AI insight generation must never block interaction creation — any failure
        # (missing key, timeout, bad JSON, or an unexpected bug in the client) is
        # logged and surfaces later as a `failed` AIInsight row instead.
        try:
            await self.ai_insight_service.generate_for_interaction(interaction)
        except Exception as exc:  # noqa: BLE001 - deliberate fallback boundary
            logger.error("Unexpected error generating AI insight for %s: %s", interaction.id, exc)

        return interaction

    async def get(self, interaction_id: uuid.UUID) -> Interaction:
        interaction = await self.repository.get_by_id(interaction_id)
        if not interaction:
            raise NotFoundError("Interaction not found")
        return interaction

    async def update(self, interaction_id: uuid.UUID, data: InteractionUpdate) -> Interaction:
        interaction = await self.get(interaction_id)
        updates = data.model_dump(exclude_unset=True)
        interaction = await self.repository.update(interaction, **updates)
        await self.cache.delete(DASHBOARD_METRICS_KEY)
        return interaction

    async def delete(self, interaction_id: uuid.UUID) -> None:
        interaction = await self.get(interaction_id)
        await self.repository.soft_delete(interaction)
        await self.cache.delete(DASHBOARD_METRICS_KEY)

    async def regenerate_insight(self, interaction_id: uuid.UUID):
        interaction = await self.get(interaction_id)
        return await self.ai_insight_service.generate_for_interaction(interaction)

    async def list(self, query: InteractionListQuery) -> tuple[list[Interaction], int]:
        return await self.repository.list_paginated(
            customer_id=query.customer_id,
            date_from=query.date_from,
            date_to=query.date_to,
            page=query.page,
            page_size=query.page_size,
            sort_by=query.sort_by,
            sort_order=query.sort_order,
        )
