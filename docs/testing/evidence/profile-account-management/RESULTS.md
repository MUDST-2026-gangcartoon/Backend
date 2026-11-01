# Profile / Password Management — QA RED

- Date: 2026-11-02 (Asia/Bangkok)
- Base: `feat/backend-profile-account-management`, commit `3666964` (Skeleton)
- QA branch: `test/profile-account-management`
- Runtime: Eclipse Temurin JDK 21.0.10; Spring profile `test`; H2
- Added `ProfileIT.java` from the QA package; source matches the supplied MANIFEST SHA-256 after normalizing line endings.
- Production code and existing tests are unchanged. No tests are disabled.

## Result

**ASSERTION_RED — exit code 1.** Production and test compilation passed. ProfileIT ran 7 cases: 1 passed, 6 failures, 0 errors, 0 skipped.

| Scenario | Result |
| --- | --- |
| Profile update: USER, STAFF, ADMIN | 3 failures: expected 200, received 500 |
| Wrong profile current password | Failure: expected 400, received 500 |
| Password change | Failure: expected 200, received 500 |
| Password validation | Failure: expected 400, received 500 |
| Authentication and CSRF | Passed |

These results are from the Skeleton commit. Tests with multiple assertions stop at their first failure, so later checks within failed methods have not yet been verified. No GREEN or full-regression claim is made.

## Reproduction

Run from `backend/` with JDK 21:

```sh
sh ./mvnw clean verify -Duser.timezone=Asia/Bangkok \
  -Dtest=__NoSelectedUnitTests__ -Dit.test=ProfileIT \
  -Dsurefire.failIfNoSpecifiedTests=false \
  -Dfailsafe.failIfNoSpecifiedTests=false
```

## Evidence and remaining work

- [Maven output](qa-red-output.txt)
- [ProfileIT failure report](ProfileIT-results.txt)
- [Requirement coverage and gaps](COVERAGE.md)
- [Original QA test-case list](PAYLOAD_TEST_CASES.md)

The supplied test-case list uses different PROF numbering from the repository requirements; COVERAGE.md maps the actual methods to the authoritative requirement IDs. Invalid-name boundaries, empty/oversized email and real CSRF rotation remain gaps in the supplied tests.

After Backend implementation, rerun ProfileIT and then `sh ./mvnw clean verify -Duser.timezone=Asia/Bangkok` for full regression. Resolve the documented coverage gaps before claiming all requirements verified.
