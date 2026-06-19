import uuid
from datetime import datetime

from pydantic import BaseModel


class RecentInteraction(BaseModel):
    id: uuid.UUID
    title: str
    customer_id: uuid.UUID
    company_name: str
    meeting_date: datetime


class DashboardMetrics(BaseModel):
    total_customers: int
    total_interactions: int
    sentiment_breakdown: dict[str, int]
    recent_interactions: list[RecentInteraction]
