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

preq_get_project_settings() {
  local project_key="$1"
  curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" "$PREQSTATION_API_URL/api/projects/$project_key/settings"
}

preq_update_qa_run() {
  local run_id="$1"
  local status="${2:-}"
  local target_url="${3:-}"
  local report_markdown="${4:-}"
  local summary_json="${5:-}"
  local payload
  payload=$(jq -n \
    --arg status "$status" \
    --arg target_url "$target_url" \
    --arg report_markdown "$report_markdown" \
    --argjson summary "${summary_json:-null}" \
    '(if $status != "" then {status: $status} else {} end)
      + (if $target_url != "" then {target_url: $target_url} else {} end)
      + (if $report_markdown != "" then {report_markdown: $report_markdown} else {} end)
      + (if $summary != null then {summary: $summary} else {} end)')
  curl -s -X PATCH \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$PREQSTATION_API_URL/api/qa-runs/$run_id"
}

preq_resolve_branch_name() {
  local task_id="$1"
  local fallback="${2:-preq/$task_id}"
  local branch_name
  branch_name=$(preq_get_task "$task_id" | jq -r '.task.branch // .branch // empty')
  if [[ -n "$branch_name" ]]; then
    echo "$branch_name"
  else
    echo "$fallback"
  fi
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
  local payload='{"lifecycle_action":"start"'
  if [[ -n "$engine" ]]; then
    payload="$payload,\"engine\":\"$engine\""
  fi
  payload="$payload}"
  preq_patch_task "$task_id" "$payload"
}

preq_update_task_status() {
  local task_id="$1"
  local status="$2"
  local engine="${3:-}"
  local payload
  payload=$(jq -n \
    --arg status "$status" \
    --arg engine "$engine" \
    '{status: $status} + (if $engine != "" then {engine: $engine} else {} end)'
  )
  curl -s -X PATCH \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$PREQSTATION_API_URL/api/tasks/$task_id/status"
}

preq_plan_task() {
  local task_id="$1"
  local plan_markdown="$2"
  local engine="${3:-}"
  local payload
  payload=$(jq -n \
    --arg plan "$plan_markdown" \
    --arg action "plan" \
    --arg engine "$engine" \
    '{lifecycle_action: $action, planMarkdown: $plan} + (if $engine != "" then {engine: $engine} else {} end)'
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
  local branch_name="${7:-}"
  local payload
  payload=$(jq -n \
    --arg summary "$summary" \
    --arg action "complete" \
    --arg engine "$engine" \
    --arg pr_url "$pr_url" \
    --arg tests "$tests" \
    --arg notes "$notes" \
    --arg branch "$branch_name" \
    --arg completed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      lifecycle_action: $action,
      result: {
        summary: $summary,
        tests: $tests,
        pr_url: $pr_url,
        notes: $notes
      } + (if $branch != "" then {branch: $branch} else {} end) + {
        completed_at: $completed_at
      } + (if $engine != "" then {engine: $engine} else {} end)
    } + (if $branch != "" then {branch: $branch} else {} end) + (if $engine != "" then {engine: $engine} else {} end)'
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
    --arg action "block" \
    --arg engine "$engine" \
    --arg blocked_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      lifecycle_action: $action,
      result: {
        reason: $reason,
        blocked_at: $blocked_at
      } + (if $engine != "" then {engine: $engine} else {} end)
    } + (if $engine != "" then {engine: $engine} else {} end)'
  )
  preq_patch_task "$task_id" "$payload"
}

preq_review_task() {
  local task_id="$1"
  local engine="${2:-}"
  local test_cmd="${3:-}"
  local build_cmd="${4:-}"
  local lint_cmd="${5:-}"

  local checks_json='{}'
  local all_passed=true

  if [[ -n "$test_cmd" ]]; then
    if eval "$test_cmd" >/dev/null 2>&1; then
      checks_json=$(echo "$checks_json" | jq '. + {tests: "pass"}')
    else
      checks_json=$(echo "$checks_json" | jq '. + {tests: "fail"}')
      all_passed=false
    fi
  fi

  if [[ -n "$build_cmd" ]]; then
    if eval "$build_cmd" >/dev/null 2>&1; then
      checks_json=$(echo "$checks_json" | jq '. + {build: "pass"}')
    else
      checks_json=$(echo "$checks_json" | jq '. + {build: "fail"}')
      all_passed=false
    fi
  fi

  if [[ -n "$lint_cmd" ]]; then
    if eval "$lint_cmd" >/dev/null 2>&1; then
      checks_json=$(echo "$checks_json" | jq '. + {lint: "pass"}')
    else
      checks_json=$(echo "$checks_json" | jq '. + {lint: "fail"}')
      all_passed=false
    fi
  fi

  if [[ "$all_passed" == "true" ]]; then
    local payload
    payload=$(jq -n \
      --arg action "review" \
      --arg engine "$engine" \
      --arg verified_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --argjson checks "$checks_json" \
      '{
        lifecycle_action: $action,
        result: {
          summary: "All checks passed",
          verified_at: $verified_at,
          checks: $checks
        } + (if $engine != "" then {engine: $engine} else {} end)
      } + (if $engine != "" then {engine: $engine} else {} end)'
    )
    preq_patch_task "$task_id" "$payload"
  else
    local failed_checks
    failed_checks=$(echo "$checks_json" | jq -r 'to_entries | map(select(.value == "fail")) | map(.key) | join(", ")')
    local payload
    payload=$(jq -n \
      --arg action "block" \
      --arg engine "$engine" \
      --arg blocked_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg reason "Verification failed: $failed_checks" \
      --argjson checks "$checks_json" \
      '{
        lifecycle_action: $action,
        result: {
          reason: $reason,
          blocked_at: $blocked_at,
          checks: $checks
        } + (if $engine != "" then {engine: $engine} else {} end)
      } + (if $engine != "" then {engine: $engine} else {} end)'
    )
    preq_patch_task "$task_id" "$payload"
  fi
}

preq_delete_task() {
  local task_id="$1"
  curl -s -X DELETE \
    -H "Authorization: Bearer $PREQSTATION_TOKEN" \
    "$PREQSTATION_API_URL/api/tasks/$task_id"
}
