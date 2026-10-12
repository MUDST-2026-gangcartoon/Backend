#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="eventhub-e2e"
DEPLOYMENT="eventhub-backend"

echo "WARNING: This restarts the Backend and resets its in-memory E2E database."
echo "The Backend must use the e2e profile and an H2 in-memory database."
echo "Do not run while QA tests are in progress."
read -r -p "Type RESET to continue: " confirmation

if [[ "$confirmation" != "RESET" ]]; then
  echo "Reset cancelled."
  exit 0
fi

command -v kubectl >/dev/null 2>&1 || {
  echo "ERROR: kubectl is not installed."
  exit 1
}

if ! kubectl get deployment "$DEPLOYMENT" \
  -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "ERROR: Backend Deployment '$DEPLOYMENT' was not found."
  echo "Start the environment before resetting."
  exit 1
fi

if ! kubectl get configmap eventhub-backend-config \
  -n "$NAMESPACE" \
  -o jsonpath='{.data.SPRING_PROFILES_ACTIVE}' | grep -qx 'e2e'; then
  echo "ERROR: Backend is not configured with the e2e profile."
  exit 1
fi

if ! kubectl get secret eventhub-backend-secret \
  -n "$NAMESPACE" \
  -o jsonpath='{.data.APP_E2E_SEED_PASSWORD}' | grep -q .; then
  echo "ERROR: APP_E2E_SEED_PASSWORD is missing."
  exit 1
fi

echo "==> Restarting Backend to recreate the in-memory database..."
kubectl rollout restart deployment/"$DEPLOYMENT" -n "$NAMESPACE"

echo "==> Waiting for Backend to become ready..."
kubectl rollout status deployment/"$DEPLOYMENT" \
  -n "$NAMESPACE" --timeout=180s

echo "==> Backend Pod status"
kubectl get pods -n "$NAMESPACE" -l app=eventhub-backend

echo "Reset completed. Verify the E2E fixtures before running tests."
