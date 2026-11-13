#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: deploy.sh REGISTRY_PREFIX RELEASE HOST ACME_EMAIL" >&2
  exit 2
fi
prefix=$1
release=$2
host=$3
email=$4
[[ "$prefix" =~ ^[a-z0-9./_-]+$ && "$release" =~ ^[a-zA-Z0-9._-]+$ ]]
[[ "$host" =~ ^[a-zA-Z0-9.-]+$ && "$email" =~ ^[a-zA-Z0-9._%+@-]+$ ]]

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -R "$(dirname "$0")/." "$work/"
if [[ "${EVENTHUB_INTERNAL_ONLY:-false}" == true ]]; then
  sed -i '/^  - edge.yaml$/d' "$work/kustomization.yaml"
else
  sed -i "s/EVENTHUB_HOST/$host/g; s/EVENTHUB_ACME_EMAIL/$email/g" "$work/edge.yaml"
fi
cat >> "$work/kustomization.yaml" <<EOF
images:
  - name: eventhub-backend
    newName: ${prefix}-backend
    newTag: ${release}
  - name: eventhub-frontend
    newName: ${prefix}-frontend
    newTag: ${release}
EOF

kubectl=(k3s kubectl)
"${kubectl[@]}" apply -f "$work/namespace.yaml"
"${kubectl[@]}" -n eventhub get secret eventhub-runtime eventhub-grafana >/dev/null
"${kubectl[@]}" apply -k "$work"
for deployment in eventhub-backend eventhub-frontend mailpit prometheus loki tempo alloy grafana; do
  "${kubectl[@]}" -n eventhub rollout status "deployment/$deployment" --timeout=240s
done
if [[ "${EVENTHUB_INTERNAL_ONLY:-false}" != true ]]; then
  "${kubectl[@]}" -n eventhub wait --for=condition=Ready certificate/eventhub-tls --timeout=300s
fi
echo EVENTHUB_DEPLOY_OK
