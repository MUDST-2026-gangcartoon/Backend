# EventHub E2E Infrastructure

## Overview

Local Kubernetes infrastructure for EventHub E2E testing on Minikube.

Components:
- Backend: Spring Boot using the e2e profile and in-memory H2 database
- Frontend: React application served by Nginx
- Ingress: HTTPS access through https://eventhub.local

Namespace: eventhub-e2e

## Prerequisites

Install Docker, Minikube, kubectl, and OpenSSL.

The required local images must exist:
- eventhub-backend:e2e
- eventhub-frontend:e2e

Required Kubernetes Secrets in namespace eventhub-e2e:
- eventhub-backend-secret with APP_E2E_SEED_PASSWORD
- eventhub-local-tls with the local TLS certificate

Never commit Secret values, private keys, or credentials.

## Start

Run from the repository root:

    bash infra/minikube/scripts/start.sh

Configure local hostname resolution so eventhub.local points to the Minikube Ingress address.

Check the Minikube IP:

    minikube ip

Open https://eventhub.local

The local TLS certificate may be self-signed. Use curl -k only for local testing.

## Verify

Check Kubernetes resources:

    kubectl get pods,services,ingress -n eventhub-e2e

Check Backend health:

    curl -k https://eventhub.local/actuator/health
    curl -k https://eventhub.local/actuator/health/liveness
    curl -k https://eventhub.local/actuator/health/readiness

Expected: HTTP 200 with status UP.

Check Events API:

    curl -k https://eventhub.local/api/events

Expected baseline:
- 2 E2E events
- 3 registrations
- 1 checked-in registration

## Reset E2E data

The Backend uses an in-memory H2 database. Restarting the Backend process recreates the database and runs the E2E data seeder.

Before resetting:
- Confirm QA is not running tests.
- Confirm current test data may be discarded.

Run:

    bash infra/minikube/scripts/reset.sh

Type RESET when prompted.

The script restarts only the Backend Deployment and waits for it to become ready. It does not intentionally delete the Frontend, Services, or Ingress.

Verify Backend readiness and baseline data after resetting.

## Stop

Run:

    bash infra/minikube/scripts/stop.sh

This stops Minikube. Kubernetes resources and Secrets are preserved.

## QA handoff

Infrastructure provides the local environment, health endpoints, and repeatable Backend data reset.

QA owns E2E scenarios and test execution. Coordinate resets with QA. Do not reset during an active test run.

See docs/development/e2e-database-contract.md for the E2E seed data and reset contract.
