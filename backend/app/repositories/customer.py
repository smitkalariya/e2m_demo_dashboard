from sqlalchemy import func, or_

from app.models.customer import Customer, CustomerStatus
from app.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    model = Customer

    async def list_paginated(
        self,
        *,
        search: str | None,
        status: CustomerStatus | None,
        page: int,
        page_size: int,
        sort_by: str,
        sort_order: str,
    ) -> tuple[list[Customer], int]:
        query = self._base_query()

        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(Customer.company_name.ilike(pattern), Customer.contact_name.ilike(pattern), Customer.email.ilike(pattern))
            )
        if status is not None:
            query = query.where(Customer.status == status)

        count_result = await self.session.execute(
            query.with_only_columns(func.count()).order_by(None)
        )
        total = count_result.scalar_one()

        sort_column = getattr(Customer, sort_by)
        query = query.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        return list(result.scalars().all()), total
