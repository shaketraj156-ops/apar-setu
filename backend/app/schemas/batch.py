import uuid
from datetime import datetime
from pydantic import BaseModel

class FindingRead(BaseModel):
    id: uuid.UUID
    row_number: int | None = None
    rule_code: str
    severity: str
    message: str
    evidence: dict | None = None
    recommended_action: str | None = None
    is_resolved: bool
    class Config:
        from_attributes = True

class UploadBatchRead(BaseModel):
    id: uuid.UUID
    institution_id: uuid.UUID
    file_name: str
    status: str
    total_rows: int
    valid_rows: int
    error_rows: int
    warning_rows: int
    created_at: datetime
    findings: list[FindingRead] = []
    class Config:
        from_attributes = True
