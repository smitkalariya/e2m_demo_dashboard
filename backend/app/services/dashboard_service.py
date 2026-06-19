from app.cache.cache_service import CacheService
from app.cache.keys import DASHBOARD_METRICS_KEY
from app.core.config import get_settings
from app.repositories.dashboard import DashboardRepository
from app.schemas.dashboard import DashboardMetrics, RecentInteraction


class DashboardService:
    def __init__(self, repository: DashboardRepository, cache: CacheService):
        self.repository = repository
        self.cache = cache
        self.settings = get_settings()

    async def get_metrics(self) -> DashboardMetrics:
        cached = await self.cache.get_json(DASHBOARD_METRICS_KEY)
        if cached is not None:
            return DashboardMetrics.model_validate(cached)

        metrics = await self._compute_metrics()
        await self.cache.set_json(
            DASHBOARD_METRICS_KEY,
            metrics.model_dump(mode="json"),
            self.settings.dashboard_cache_ttl_seconds,
        )
        return metrics

    async def _compute_metrics(self) -> DashboardMetrics:
        total_customers = await self.repository.count_customers()
        total_interactions = await self.repository.count_interactions()
        sentiment_breakdown = await self.repository.sentiment_breakdown()
        recent = await self.repository.recent_interactions()

        return DashboardMetrics(
            total_customers=total_customers,
            total_interactions=total_interactions,
            sentiment_breakdown=sentiment_breakdown,
            recent_interactions=[
                RecentInteraction(
                    id=interaction.id,
                    title=interaction.title,
                    customer_id=interaction.customer_id,
                    company_name=company_name,
                    meeting_date=interaction.meeting_date,
                )
                for interaction, company_name in recent
            ],
        )
