#!/usr/bin/env bash
set -euo pipefail

echo "==> Stopping Minikube..."
minikube stop

echo "Minikube stopped. Kubernetes resources and Secrets are preserved."
echo "If 'minikube tunnel' is running in another terminal, stop it with Ctrl+C."
