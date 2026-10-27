# File: backend/app/schemas/common.py
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    total: int = Field(..., description="Total count of records")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Records per page")
    items: list[T] = Field(..., description="List of items")
    students: Optional[list[T]] = Field(None, description="Alias for items (frontend compatibility)")

    def model_post_init(self, __context):
        if self.students is None:
            self.students = self.items
