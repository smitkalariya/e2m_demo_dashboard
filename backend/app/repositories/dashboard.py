from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_insight import AIInsight, AIInsightStatus, Sentiment
from app.models.customer import Customer
from app.models.interaction import Interaction

RECENT_INTERACTIONS_LIMIT = 5


class DashboardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def count_customers(self) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Customer).where(Customer.deleted_at.is_(None))
        )
        return result.scalar_one()

    async def count_interactions(self) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(Interaction).where(Interaction.deleted_at.is_(None))
        )
        return result.scalar_one()

    async def sentiment_breakdown(self) -> dict[str, int]:
        result = await self.session.execute(
            select(AIInsight.sentiment, func.count())
            .join(Interaction, Interaction.id == AIInsight.interaction_id)
            .where(
                AIInsight.status == AIInsightStatus.COMPLETED,
                Interaction.deleted_at.is_(None),
            )
            .group_by(AIInsight.sentiment)
        )
        breakdown = {sentiment.value: 0 for sentiment in Sentiment}
        for sentiment, count in result.all():
            if sentiment is not None:
                breakdown[sentiment.value] = count
        return breakdown

    async def recent_interactions(self) -> list[tuple[Interaction, str]]:
        result = await self.session.execute(
            select(Interaction, Customer.company_name)
            .join(Customer, Customer.id == Interaction.customer_id)
            .where(Interaction.deleted_at.is_(None))
            .order_by(Interaction.meeting_date.desc())
            .limit(RECENT_INTERACTIONS_LIMIT)
        )
        return [(row[0], row[1]) for row in result.all()]
