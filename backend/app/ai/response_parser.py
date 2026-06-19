import json

from pydantic import BaseModel, ValidationError

from app.ai.exceptions import AIGenerationError
from app.models.ai_insight import Sentiment


class AIInsightResult(BaseModel):
    summary: str
    sentiment: Sentiment
    action_items: list[str]
    risks: list[str]


def parse_insight_response(raw_content: str) -> AIInsightResult:
    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise AIGenerationError(f"Model response was not valid JSON: {exc}") from exc

    try:
        return AIInsightResult.model_validate(data)
    except ValidationError as exc:
        raise AIGenerationError(f"Model response did not match the expected schema: {exc}") from exc
