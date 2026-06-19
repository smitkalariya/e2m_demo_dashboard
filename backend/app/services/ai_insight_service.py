from app.ai.exceptions import AIGenerationError
from app.ai.openai_client import OpenAIInsightClient
from app.ai.prompt_builder import build_insight_prompt
from app.ai.response_parser import parse_insight_response
from app.cache.cache_service import CacheService
from app.cache.keys import DASHBOARD_METRICS_KEY
from app.core.logging import get_logger
from app.models.ai_insight import AIInsight, AIInsightStatus
from app.models.interaction import Interaction
from app.repositories.ai_insight import AIInsightRepository

logger = get_logger(__name__)


class AIInsightService:
    def __init__(self, repository: AIInsightRepository, client: OpenAIInsightClient, cache: CacheService):
        self.repository = repository
        self.client = client
        self.cache = cache

    async def get_for_interaction(self, interaction_id) -> AIInsight | None:
        return await self.repository.get_by_interaction_id(interaction_id)

    async def generate_for_interaction(self, interaction: Interaction) -> AIInsight:
        existing = await self.repository.get_by_interaction_id(interaction.id)

        try:
            prompt = build_insight_prompt(interaction.title, interaction.notes)
            raw_content = await self.client.generate(prompt)
            result = parse_insight_response(raw_content)
            fields = {
                "status": AIInsightStatus.COMPLETED,
                "summary": result.summary,
                "sentiment": result.sentiment,
                "action_items": result.action_items,
                "risks": result.risks,
                "error_message": None,
            }
        except AIGenerationError as exc:
            logger.warning("AI insight generation failed for interaction %s: %s", interaction.id, exc)
            fields = {
                "status": AIInsightStatus.FAILED,
                "summary": None,
                "sentiment": None,
                "action_items": None,
                "risks": None,
                "error_message": str(exc),
            }

        if existing:
            insight = await self.repository.update(existing, **fields)
        else:
            insight = await self.repository.create(AIInsight(interaction_id=interaction.id, **fields))

        # Sentiment breakdown on the dashboard is derived from insight status/sentiment,
        # so any generation/regeneration must bust the cached metrics.
        await self.cache.delete(DASHBOARD_METRICS_KEY)
        return insight
