# Profile requirement coverage

Requirement IDs refer to `docs/testing/profile-account-management-requirements.md`. The supplied `PAYLOAD_TEST_CASES.md` uses different numbering; use this table for requirement traceability.

| Requirement | ProfileIT method / coverage |
| --- | --- |
| PROF-001, PROF-002 | `everyRoleCanEditOwnProfileWithoutChangingIdentityOrRole` — USER, STAFF, ADMIN; normalize email |
| PROF-003, PROF-004 | `rejectsWrongPasswordDuplicateEmailAndInvalidEmailWithoutChangingAccount` |
| PROF-005 | Same method: invalid email format covered; empty and >254 character boundaries remain uncovered |
| PROF-006 | Gap: invalid name boundaries are not in the supplied tests |
| PROF-007 | `everyRoleCanEditOwnProfileWithoutChangingIdentityOrRole` — ID, role and registration owner |
| PROF-008, PROF-010 | `passwordChangePreservesCurrentSessionAndExpiresOtherSessions` |
| PROF-009 | `passwordValidationRejectsWrongOldSameShortAndOversizedUtf8Passwords` — wrong old, same, short, 75-byte UTF-8 password; verifies old password still matches, but does not compare exact hash |
| PROF-011 | `everyRoleCanEditOwnProfileWithoutChangingIdentityOrRole` — current and old-email sessions |
| PROF-012, PROF-013 | `profileRequiresLoginAndCsrf` — both endpoints; verifies HTTP status |
| PROF-014 | Gap: real CSRF token rotation is not in the supplied tests; `.with(csrf())` does not prove rotation |

The supplied ProfileIT source is preserved without weakening assertions or disabling tests. The gaps above must be resolved before claiming full requirement coverage. Password changes currently run for USER; profile updates run for all three roles.
