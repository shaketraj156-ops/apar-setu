class Role:
    STUDENT = 'student'
    INSTITUTION_STAFF = 'institution_staff'
    INSTITUTION_ADMIN = 'institution_admin'
    AICTE_OFFICER = 'aicte_officer'
    VERIFIER = 'verifier'
    AUDITOR = 'auditor'
    SYSTEM_ADMIN = 'system_admin'


INSTITUTION_ROLES = frozenset({Role.INSTITUTION_STAFF, Role.INSTITUTION_ADMIN})
NATIONAL_ROLES = frozenset({Role.AICTE_OFFICER, Role.AUDITOR, Role.SYSTEM_ADMIN})
STAFF_ROLES = INSTITUTION_ROLES | NATIONAL_ROLES
NATIONAL_WRITE_ROLES = frozenset({Role.AICTE_OFFICER, Role.SYSTEM_ADMIN})
ALL_ROLES = STAFF_ROLES | {Role.STUDENT, Role.VERIFIER}
