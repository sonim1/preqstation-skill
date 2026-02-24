#!/usr/bin/env bash
set -euo pipefail

: "${PREQSTATION_API_URL:?PREQSTATION_API_URL is required}"
: "${PREQSTATION_TOKEN:?PREQSTATION_TOKEN is required}"

# Security: require TLS for remote endpoints. Allow plain HTTP only for localhost development.
case "$PREQSTATION_API_URL" in
  https://*|http://localhost*|http://127.0.0.1*)
    ;;
  *)
    echo "PREQSTATION_API_URL must use https:// (or http://localhost for local development)." >&2
    exit 1
    ;;
esac

PREQSTATION_API_URL="${PREQSTATION_API_URL%/}"

preq_get_tasks() {
  local status="${1:-}"
  local engine="${2:-}"
  local url="$PREQSTATION_API_URL/api/tasks"
  local sep="?"
  if [[ -n "$status" ]]; then
    url="$url${sep}status=$status"
    sep="&"
  fi
  if [[ -n "$engine" ]]; then
    url="$url${sep}engine=$engine"
  fi
  curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" "$url"
}

preq_get_task() {
  local task_id="$1"
  curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" "$PREQSTATION_API_URL/api/tasks/$task_id"
}

preq_patch_task() {
  local task_id="$1"
  local json_payload="$2"
  curl -s -X PATCH \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$json_payload" \
    "$PREQSTATION_API_URL/api/tasks/$task_id"
}

preq_create_task() {
  local json_payload="$1"
  curl -s -X POST \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$json_payload" \
    "$PREQSTATION_API_URL/api/tasks"
}

preq_delete_task() {
  local task_id="$1"
  curl -s -X DELETE \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    "$PREQSTATION_API_URL/api/tasks/$task_id"
}
