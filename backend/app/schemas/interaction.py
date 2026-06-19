import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ai_insight import AIInsightPublic

InteractionSortField = Literal["meeting_date", "created_at"]
SortOrder = Literal["asc", "desc"]


class InteractionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    notes: str = Field(min_length=1)
    meeting_date: datetime


class InteractionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = Field(default=None, min_length=1)
    meeting_date: datetime | None = None


class InteractionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    title: str
    notes: str
    meeting_date: datetime
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class InteractionDetail(InteractionPublic):
    ai_insight: AIInsightPublic | None = None


class InteractionListQuery(BaseModel):
    customer_id: uuid.UUID | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: InteractionSortField = "meeting_date"
    sort_order: SortOrder = "desc"
