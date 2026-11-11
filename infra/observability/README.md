# EventHub local observability demo

This disposable stack runs the backend with the `e2e`, `metrics`, and `tracing` profiles. It uses an in-memory H2 database and demo seed data; it is not a production deployment. Docker Engine/Compose v2 and a Unix-compatible shell are required. Docker Desktop with Linux containers supplies the Docker socket on Windows. The first build downloads dependencies and images.

From the repository root:

```sh
docker compose -f infra/observability/compose.yaml up --build -d
```

Open http://localhost:3000 and sign in with `admin` / `local-demo-only`. Generate traffic with `curl http://localhost:8080/api/events`. Open the EventHub dashboard for system and business metrics. In Explore select Loki and query `{service_name="eventhub"} |= "HTTP request completed"`. Expand a request log and use its TraceID link to open Tempo. From a trace, use the span's logs link to find matching Loki lines. Alternatively select Tempo in Explore and search by trace ID. Metrics are scraped every five seconds; allow time for startup, scraping, and trace export.

Stop and remove containers with `docker compose -f infra/observability/compose.yaml down`. Data is disposable. To run the automated stack check on Linux, run `bash infra/observability/smoke.sh`; it builds and starts the stack, queries Grafana and its datasource proxies, then tears the stack down. It checks dashboard provisioning, Prometheus target, request and business metric series, and a request's shared trace ID in Loki and Tempo. It creates a free guest booking and waits for the business order count to increase. On failure it prints container logs.

Only Grafana and the backend are published, both on loopback. Prometheus, Loki, Tempo, Alloy, and the management port remain on the Compose network. The demo password, 100% tracing sample rate and H2 data are for local use only. Alloy reads the Docker socket to discover only containers with `eventhub.logs=true`; access to the Docker socket is privileged, even when mounted read-only. Do not use this configuration with sensitive data or an untrusted Docker host. Avoid exposing the demo ports or deploying this stack to production. The request completion log deliberately omits URLs, query strings and bodies; application logs and trace attributes may still contain sensitive information.

The backend's default configuration disables trace exporting; the `tracing` profile enables OTLP/HTTP and request completion logs for this demo. The `metrics` profile is separately opt-in. Loki and Tempo hold local ephemeral data. See [Spring Boot tracing](https://docs.spring.io/spring-boot/reference/actuator/tracing.html), [Grafana Alloy Docker logs](https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/), and [Grafana trace-to-logs configuration](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/) for configuration details.
