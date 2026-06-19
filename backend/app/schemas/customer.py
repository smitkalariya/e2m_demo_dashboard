import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.customer import CustomerStatus

CustomerSortField = Literal["company_name", "created_at", "status"]
SortOrder = Literal["asc", "desc"]


class CustomerCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    contact_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    status: CustomerStatus = CustomerStatus.PROSPECT


class CustomerUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    contact_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    status: CustomerStatus | None = None


class CustomerPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str | None
    status: CustomerStatus
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CustomerListQuery(BaseModel):
    search: str | None = None
    status: CustomerStatus | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: CustomerSortField = "created_at"
    sort_order: SortOrder = "desc"
