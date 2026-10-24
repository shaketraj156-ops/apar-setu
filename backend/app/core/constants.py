
class RecordStatus:
    DRAFT = 'draft'
    VALIDATED = 'validated'      
    FLAGGED = 'flagged'     
    SUBMITTED = 'submitted'
    VERIFIED = 'verified'



ACTIVE_RECORD_STATUSES = (RecordStatus.SUBMITTED, RecordStatus.VERIFIED)


class BatchStatus:
    UPLOADED = 'uploaded'
    VALIDATED = 'validated'              
    NEEDS_CORRECTION = 'needs_correction'
    SUBMITTED = 'submitted'


class Severity:
    ERROR = 'ERROR'
    WARNING = 'WARNING'
    REVIEW = 'REVIEW'


class EnrollmentStatus:
    ACTIVE = 'active'
    WITHDRAWN = 'withdrawn'
    TRANSFERRED = 'transferred'
    COMPLETED = 'completed'


ENROLLMENT_STATUSES = {'active', 'withdrawn', 'transferred', 'completed'}
GENDERS = {'MALE', 'FEMALE', 'OTHER'}
ADMISSION_CATEGORIES = {
    'GENERAL', 'SC', 'ST', 'OBC', 'EWS', 'PWD', 'MANAGEMENT',
    'NRI', 'OCI', 'FOREIGN_NATIONAL', 'FN',
}


REQUIRED_COLUMNS = [
    'apaar_id', 'student_institution_id', 'full_name', 'gender', 'dob',
    'admission_date', 'programme_code', 'admission_category',
]
OPTIONAL_COLUMNS = [
    'is_supernumerary', 'nri_status', 'oci_status', 'foreign_national',
    'enrollment_status',
]
