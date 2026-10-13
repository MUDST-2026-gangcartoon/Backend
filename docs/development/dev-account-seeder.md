# Dev Account Seeder

Only with Spring profile `dev` (and **not** `prod`) the application creates three local testing accounts on startup.

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@example` | `11111111` |
| STAFF | `staff@example` | `11111111` |
| USER | `user@example` | `11111111` |

## Start locally

From `backend/`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

The existing `application-dev.yml` uses a file-based H2 database at `backend/data/eventhub` (relative to the process working directory). The seed runs at application startup after Spring initializes JPA.

## Safety and repeatability

- The component uses `@Profile("dev & !prod")` and is absent in the default, `test`, and `prod` profiles.
- It inserts **only missing** emails, and does not reset an existing account's role or password.
- Passwords are **BCrypt hashed** via the existing `PasswordEncoder` bean, never stored as plaintext.
- Passwords are deliberately weak demo credentials: never enable the `dev` profile against a public or production database.
- For an existing account with one of these emails, use that account's existing credentials (the seeder will not overwrite it).
- The default `application.yaml` does not set an active profile: **you must explicitly select `dev`**.

## Tests

```powershell
cd backend
.\mvnw.cmd "-Dtest=DevAccountSeederTests" test
.\mvnw.cmd "-Dtest=DevAccountSeederIT" test
.\mvnw.cmd clean verify
```

The integration test uses a **temporary in-memory H2 database** even though the active profile is `dev`, to avoid touching local file-backed data.

For authenticated API calls, first GET `/api/auth/csrf`, then POST `/api/auth/login` with session cookie and CSRF token; refresh CSRF after login.
