import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.ai_insight import AIInsightStatus, Sentiment


class AIInsightPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interaction_id: uuid.UUID
    status: AIInsightStatus
    summary: str | None
    sentiment: Sentiment | None
    action_items: list[str] | None
    risks: list[str] | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
