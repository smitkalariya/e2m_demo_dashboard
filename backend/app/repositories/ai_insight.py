import uuid

from sqlalchemy import select

from app.models.ai_insight import AIInsight
from app.repositories.base import BaseRepository


class AIInsightRepository(BaseRepository[AIInsight]):
    model = AIInsight

    async def get_by_interaction_id(self, interaction_id: uuid.UUID) -> AIInsight | None:
        result = await self.session.execute(
            select(AIInsight).where(AIInsight.interaction_id == interaction_id)
        )
        return result.scalar_one_or_none()
