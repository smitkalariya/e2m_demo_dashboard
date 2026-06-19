import uuid
from datetime import datetime, timezone
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Shared CRUD operations. All queries exclude soft-deleted rows by default."""

    model: type[ModelType]

    def __init__(self, session: AsyncSession):
        self.session = session

    def _base_query(self):
        return select(self.model).where(self.model.deleted_at.is_(None))

    async def get_by_id(self, id_: uuid.UUID) -> ModelType | None:
        result = await self.session.execute(self._base_query().where(self.model.id == id_))
        return result.scalar_one_or_none()

    async def create(self, instance: ModelType) -> ModelType:
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, instance: ModelType, **fields) -> ModelType:
        for key, value in fields.items():
            setattr(instance, key, value)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def soft_delete(self, instance: ModelType) -> None:
        instance.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()
