import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.cache_service import CacheService
from app.core.responses import success_response
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.repositories.customer import CustomerRepository
from app.repositories.interaction import InteractionRepository
from app.schemas.customer import CustomerCreate, CustomerListQuery, CustomerPublic, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])


async def get_customer_service(session: AsyncSession = Depends(get_db)) -> CustomerService:
    return CustomerService(
        CustomerRepository(session), InteractionRepository(session), CacheService()
    )


@router.post("", status_code=201)
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
    service: CustomerService = Depends(get_customer_service),
):
    customer = await service.create(data, current_user)
    return success_response(
        data=CustomerPublic.model_validate(customer).model_dump(mode="json"),
        message="Customer created",
        status_code=201,
    )


@router.get("")
async def list_customers(
    query: Annotated[CustomerListQuery, Query()],
    _: User = Depends(get_current_user),
    service: CustomerService = Depends(get_customer_service),
):
    payload = await service.list(query)
    return success_response(data=payload)


@router.get("/{customer_id}")
async def get_customer(
    customer_id: uuid.UUID,
    _: User = Depends(get_current_user),
    service: CustomerService = Depends(get_customer_service),
):
    customer = await service.get(customer_id)
    return success_response(data=CustomerPublic.model_validate(customer).model_dump(mode="json"))


@router.patch("/{customer_id}")
async def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
    service: CustomerService = Depends(get_customer_service),
):
    customer = await service.update(customer_id, data)
    return success_response(
        data=CustomerPublic.model_validate(customer).model_dump(mode="json"),
        message="Customer updated",
    )


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: uuid.UUID,
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
    service: CustomerService = Depends(get_customer_service),
):
    await service.delete(customer_id)
    return success_response(message="Customer deleted")
