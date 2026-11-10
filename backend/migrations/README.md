# EventHub Backend schema upgrades

For an existing H2 database with the schema used before Phase 2, run
`2026-11-10-guest-phase2-h2.sql` before starting this release with
`spring.jpa.hibernate.ddl-auto=validate`. Stop application writers and back
up the database first. Use the matching H2 version with the deployment's
JDBC URL and database credentials. H2 DDL commits individual changes, so
inspect any error before restarting the application. The script can be
rerun on the same schema. It preserves member registrations and payments.

The script expects the existing EventHub tables, including `registrations`
and `mock_payment_orders`. Fresh development and test schemas are created
by Hibernate. This SQL is specific to H2.

### Guest email proof

Configure `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT` (commonly `587`), `SPRING_MAIL_USERNAME`,
`SPRING_MAIL_PASSWORD`, and `APP_GUEST_VERIFICATION_FROM` using the deployment's secret store.
SMTP authentication and required STARTTLS default to enabled. For a trusted local SMTP test sink,
the `APP_GUEST_SMTP_AUTH`, `APP_GUEST_SMTP_STARTTLS_ENABLE`, and
`APP_GUEST_SMTP_STARTTLS_REQUIRED` switches can be disabled. For an implicit TLS server set
`SPRING_MAIL_SSL_ENABLED=true` and turn off both STARTTLS switches.

Without a configured SMTP sender, the proof request returns 503. A code expires after 10 minutes,
can be requested again after 60 seconds, and allows five invalid attempts. Successful verification
authorizes claim for the current account email for 10 minutes. Claim preserves the registrations
and ticket codes in authenticated history and revokes access through the original guest session.
