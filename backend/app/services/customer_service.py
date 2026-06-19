import hashlib
import uuid
from typing import Any

from app.cache.cache_service import CacheService
from app.cache.keys import CUSTOMER_LIST_PATTERN, CUSTOMER_LIST_PREFIX, DASHBOARD_METRICS_KEY
from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.models.customer import Customer
from app.models.user import User
from app.repositories.customer import CustomerRepository
from app.repositories.interaction import InteractionRepository
from app.schemas.customer import CustomerCreate, CustomerListQuery, CustomerPublic, CustomerUpdate


class CustomerService:
    def __init__(
        self,
        repository: CustomerRepository,
        interaction_repository: InteractionRepository,
        cache: CacheService,
    ):
        self.repository = repository
        self.interaction_repository = interaction_repository
        self.cache = cache
        self.settings = get_settings()

    async def _invalidate_caches(self) -> None:
        await self.cache.delete(DASHBOARD_METRICS_KEY)
        await self.cache.delete_pattern(CUSTOMER_LIST_PATTERN)

    async def create(self, data: CustomerCreate, created_by: User) -> Customer:
        customer = Customer(**data.model_dump(), created_by_id=created_by.id)
        customer = await self.repository.create(customer)
        await self._invalidate_caches()
        return customer

    async def get(self, customer_id: uuid.UUID) -> Customer:
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        return customer

    async def update(self, customer_id: uuid.UUID, data: CustomerUpdate) -> Customer:
        customer = await self.get(customer_id)
        updates = data.model_dump(exclude_unset=True)
        customer = await self.repository.update(customer, **updates)
        await self._invalidate_caches()
        return customer

    async def delete(self, customer_id: uuid.UUID) -> None:
        customer = await self.get(customer_id)
        await self.repository.soft_delete(customer)
        # Soft-deleting a customer must take its interactions with it — orphaned
        # interactions pointing at a deleted customer would otherwise still surface
        # in list/detail views.
        await self.interaction_repository.soft_delete_by_customer(customer_id)
        await self._invalidate_caches()

    async def list(self, query: CustomerListQuery) -> dict[str, Any]:
        cache_key = CUSTOMER_LIST_PREFIX + hashlib.sha256(
            query.model_dump_json().encode()
        ).hexdigest()

        cached = await self.cache.get_json(cache_key)
        if cached is not None:
            return cached

        customers, total = await self.repository.list_paginated(
            search=query.search,
            status=query.status,
            page=query.page,
            page_size=query.page_size,
            sort_by=query.sort_by,
            sort_order=query.sort_order,
        )
        payload = {
            "items": [CustomerPublic.model_validate(c).model_dump(mode="json") for c in customers],
            "total": total,
            "page": query.page,
            "page_size": query.page_size,
            "total_pages": (total + query.page_size - 1) // query.page_size if total else 0,
        }
        await self.cache.set_json(cache_key, payload, self.settings.customer_list_cache_ttl_seconds)
        return payload
