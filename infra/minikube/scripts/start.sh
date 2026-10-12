#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../../" && pwd)"
MANIFEST_DIR="$ROOT_DIR/infra/minikube/e2e"
NAMESPACE="eventhub-e2e"

command -v minikube >/dev/null 2>&1 || {
  echo "ERROR: minikube is not installed."
  exit 1
}
command -v kubectl >/dev/null 2>&1 || {
  echo "ERROR: kubectl is not installed."
  exit 1
}

echo "==> Starting Minikube..."
minikube start

echo "==> Enabling Ingress addon..."
minikube addons enable ingress

echo "==> Applying Kubernetes manifests..."
kubectl apply -f "$MANIFEST_DIR/eventhub-namespace.yaml"
kubectl apply -f "$MANIFEST_DIR/eventhub-backend-env.yaml"

for secret in eventhub-backend-secret eventhub-local-tls; do
  if ! kubectl get secret "$secret" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo "ERROR: Secret '$secret' is missing in namespace '$NAMESPACE'."
    echo "Create the required Secret before starting the application."
    exit 1
  fi
done

kubectl apply -f "$MANIFEST_DIR/eventhub-backend-deployment.yaml"
kubectl apply -f "$MANIFEST_DIR/eventhub-backend-service.yaml"
kubectl apply -f "$MANIFEST_DIR/eventhub-frontend-deployment.yaml"
kubectl apply -f "$MANIFEST_DIR/eventhub-frontend-service.yaml"
kubectl apply -f "$MANIFEST_DIR/eventhub-ingress.yaml"

echo "==> Waiting for application deployments..."
kubectl rollout status deployment/eventhub-backend \
  -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/eventhub-frontend \
  -n "$NAMESPACE" --timeout=180s

echo
echo "==> Current resources"
kubectl get pods,services,ingress -n "$NAMESPACE"
echo
echo "Open https://eventhub.local after configuring /etc/hosts."
echo "For Minikube LoadBalancer access, keep 'minikube tunnel' running in another terminal."
