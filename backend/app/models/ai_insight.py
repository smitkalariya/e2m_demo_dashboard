import enum
import uuid

from sqlalchemy import JSON, Enum, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampedMixin


class AIInsightStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class Sentiment(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class AIInsight(TimestampedMixin, Base):
    __tablename__ = "ai_insights"

    interaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("interactions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[AIInsightStatus] = mapped_column(
        Enum(AIInsightStatus, name="ai_insight_status"),
        default=AIInsightStatus.PENDING,
        nullable=False,
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    sentiment: Mapped[Sentiment | None] = mapped_column(
        Enum(Sentiment, name="ai_insight_sentiment"), nullable=True
    )
    action_items: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    risks: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
