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
  local label="${3:-}"
  local url="$PREQSTATION_API_URL/api/tasks"
  local sep="?"
  if [[ -n "$status" ]]; then
    url="$url${sep}status=$status"
    sep="&"
  fi
  if [[ -n "$engine" ]]; then
    url="$url${sep}engine=$engine"
    sep="&"
  fi
  if [[ -n "$label" ]]; then
    url="$url${sep}label=$label"
  fi
  curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" "$url"
}

preq_get_task() {
  local task_id="$1"
  curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" "$PREQSTATION_API_URL/api/tasks/$task_id"
}

preq_create_task() {
  local json_payload="$1"
  curl -s -X POST \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$json_payload" \
    "$PREQSTATION_API_URL/api/tasks"
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

preq_start_task() {
  local task_id="$1"
  local engine="${2:-}"
  local payload='{"status":"in_progress"'
  if [[ -n "$engine" ]]; then
    payload="$payload,\"engine\":\"$engine\""
  fi
  payload="$payload}"
  preq_patch_task "$task_id" "$payload"
}

preq_plan_task() {
  local task_id="$1"
  local plan_markdown="$2"
  local engine="${3:-}"
  local payload
  payload=$(jq -n \
    --arg desc "$plan_markdown" \
    --arg status "todo" \
    --arg engine "$engine" \
    '{description: $desc, status: $status} + (if $engine != "" then {engine: $engine} else {} end)'
  )
  preq_patch_task "$task_id" "$payload"
}

preq_complete_task() {
  local task_id="$1"
  local summary="$2"
  local engine="${3:-}"
  local pr_url="${4:-}"
  local tests="${5:-}"
  local notes="${6:-}"
  local payload
  payload=$(jq -n \
    --arg summary "$summary" \
    --arg engine "$engine" \
    --arg pr_url "$pr_url" \
    --arg tests "$tests" \
    --arg notes "$notes" \
    --arg completed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      status: "review",
      result: {
        summary: $summary,
        tests: $tests,
        pr_url: $pr_url,
        notes: $notes,
        completed_at: $completed_at
      } + (if $engine != "" then {engine: $engine} else {} end)
    } + (if $engine != "" then {engine: $engine} else {} end)'
  )
  preq_patch_task "$task_id" "$payload"
}

preq_block_task() {
  local task_id="$1"
  local reason="$2"
  local engine="${3:-}"
  local payload
  payload=$(jq -n \
    --arg reason "$reason" \
    --arg engine "$engine" \
    --arg blocked_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      status: "blocked",
      result: {
        reason: $reason,
        blocked_at: $blocked_at
      } + (if $engine != "" then {engine: $engine} else {} end)
    } + (if $engine != "" then {engine: $engine} else {} end)'
  )
  preq_patch_task "$task_id" "$payload"
}

preq_delete_task() {
  local task_id="$1"
  curl -s -X DELETE \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    "$PREQSTATION_API_URL/api/tasks/$task_id"
}
