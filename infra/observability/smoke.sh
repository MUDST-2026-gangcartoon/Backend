#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
compose=(docker compose -f compose.yaml)
cleanup() {
  status=$?
  if (( status != 0 )); then "${compose[@]}" logs --no-color >&2 || true; fi
  "${compose[@]}" down --remove-orphans || true
  exit "$status"
}
trap cleanup EXIT
"${compose[@]}" up --build -d
python3 smoke.py
