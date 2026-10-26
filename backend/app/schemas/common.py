# File: backend/app/schemas/common.py
from typing import Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    total: int = Field(..., description="Total count of records")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Records per page")
    items: list[T] = Field(..., description="List of items")
    students: list[T] | None = Field(default=None, description="Alias for items (frontend compatibility)")
