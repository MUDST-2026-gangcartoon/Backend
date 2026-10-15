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
minikube status >/dev/null 2>&1 || minikube start

eecho "==> Enabling Ingress addon..."
minikube addons enable ingress

# รอให้ ingress controller พร้อมใช้งาน และลบ validating webhook
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=120s || true
kubectl delete -A ValidatingWebhookConfiguration ingress-nginx-admission --ignore-not-found=true || true

echo "==> Applying Kubernetes manifests..."
kubectl apply -f "$MANIFEST_DIR/eventhub-namespace.yaml"
kubectl apply -f "$MANIFEST_DIR/eventhub-backend-env.yaml"

# Auto-create dummy tls secret if missing for CI/E2E test environment
if ! kubectl get secret eventhub-local-tls -n "$NAMESPACE" >/dev/null 2>&1; then
  kubectl create secret tls eventhub-local-tls \
    --cert=/dev/null --key=/dev/null \
    -n "$NAMESPACE" || true
fi

kubectl apply -f "$MANIFEST_DIR/eventhub-backend-deployment.yaml"

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
