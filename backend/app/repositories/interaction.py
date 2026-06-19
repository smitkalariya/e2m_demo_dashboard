import uuid
from datetime import datetime, timezone

from sqlalchemy import func, update

from app.models.interaction import Interaction
from app.repositories.base import BaseRepository


class InteractionRepository(BaseRepository[Interaction]):
    model = Interaction

    async def list_paginated(
        self,
        *,
        customer_id: uuid.UUID | None,
        date_from: datetime | None,
        date_to: datetime | None,
        page: int,
        page_size: int,
        sort_by: str,
        sort_order: str,
    ) -> tuple[list[Interaction], int]:
        query = self._base_query()

        if customer_id is not None:
            query = query.where(Interaction.customer_id == customer_id)
        if date_from is not None:
            query = query.where(Interaction.meeting_date >= date_from)
        if date_to is not None:
            query = query.where(Interaction.meeting_date <= date_to)

        count_result = await self.session.execute(
            query.with_only_columns(func.count()).order_by(None)
        )
        total = count_result.scalar_one()

        sort_column = getattr(Interaction, sort_by)
        query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def soft_delete_by_customer(self, customer_id: uuid.UUID) -> None:
        await self.session.execute(
            update(Interaction)
            .where(Interaction.customer_id == customer_id, Interaction.deleted_at.is_(None))
            .values(deleted_at=datetime.now(timezone.utc))
        )
