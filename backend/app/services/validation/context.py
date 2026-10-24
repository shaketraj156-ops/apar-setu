import uuid
from dataclasses import dataclass, field

@dataclass
class ValidationContext:
    institution_id: uuid.UUID
    programme_id: uuid.UUID
    academic_year: str
    approved_intake: int
    supernumerary_quota: int
    nri_quota: int
    oci_quota: int
    fn_quota: int

    enrolled_count: int = 0
    supernumerary_count: int = 0
    nri_count: int = 0
    oci_count: int = 0
    fn_count: int = 0

    existing_roll_numbers: set[str] = field(default_factory=set)
    existing_apaar_ids: set[str] = field(default_factory=set)
