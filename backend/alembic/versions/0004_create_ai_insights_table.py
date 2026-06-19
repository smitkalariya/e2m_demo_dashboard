"""create ai_insights table

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-18

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ai_insight_status = sa.Enum("pending", "completed", "failed", name="ai_insight_status")
ai_insight_sentiment = sa.Enum("positive", "neutral", "negative", name="ai_insight_sentiment")


def upgrade() -> None:
    op.create_table(
        "ai_insights",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "interaction_id",
            sa.Uuid(),
            sa.ForeignKey("interactions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", ai_insight_status, nullable=False, server_default="pending"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("sentiment", ai_insight_sentiment, nullable=True),
        sa.Column("action_items", sa.JSON(), nullable=True),
        sa.Column("risks", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_ai_insights_interaction_id", "ai_insights", ["interaction_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_ai_insights_interaction_id", table_name="ai_insights")
    op.drop_table("ai_insights")
    ai_insight_sentiment.drop(op.get_bind(), checkfirst=True)
    ai_insight_status.drop(op.get_bind(), checkfirst=True)
