---
name: preqstation
description: >
  Fetch tasks from PREQSTATION, execute work, and push updates/results back to PREQSTATION APIs.
  Use when asked to run a PREQ task, fetch todo tasks, or update execution status.
  Requires PREQSTATION_API_URL and PREQSTATION_TOKEN environment variables.
  Tasks carry an `engine` field (`claude` | `codex` | `gemini`) indicating which AI agent should execute them.
---

## Environment

- `PREQSTATION_API_URL`: PREQSTATION API base URL (example: `https://mypreqstation.vercel.app`)
- `PREQSTATION_TOKEN`: PREQSTATION Bearer token (generated in PREQSTATION `/api-keys`)
- `PREQSTATION_ENGINE` (optional): fallback engine (`claude` | `codex` | `gemini`) when client auto-detection is unavailable

## Agent Identity & Engine Mapping

Each agent must identify itself and use the corresponding `engine` value in **all** task operations (list, create, plan, start, update status, complete, review, block):

| If you are...        | Use `engine=` |
| -------------------- | ------------- |
| Claude (Anthropic)   | `claude`      |
| GPT / Codex (OpenAI) | `codex`       |
| Gemini (Google)      | `gemini`      |

Always include your `engine` value when listing, creating, planning, starting, completing, reviewing, or blocking tasks.

## MCP Plugin Mode (Recommended)

If MCP is available, prefer `scripts/preqstation-mcp-server.mjs` tools.
All mutation tools accept an optional `engine` parameter and always send an engine value using this order:
1. explicit tool arg
2. existing task engine (when available)
3. MCP `initialize.clientInfo.name` auto-detection
4. `PREQSTATION_ENGINE`
5. `codex` fallback

| Tool                 | engine usage                                                      |
| -------------------- | ----------------------------------------------------------------- |
| `preq_list_tasks`    | Read-only, no engine needed                                       |
| `preq_get_task`      | Read-only, no engine needed                                       |
| `preq_sync_projects` | Read-only, no engine needed (uploads project sync batch to backend) |
| `preq_plan_task`     | Assign `engine` when planning task → todo                         |
| `preq_create_task`   | Assign `engine` to new inbox task                                 |
| `preq_start_task`    | Record `engine` starting the work → in_progress                   |
| `preq_update_task_status` | Record `engine` while updating status-only endpoint (`/api/tasks/:id/status`) |
| `preq_complete_task` | Record `engine` in work log result → review (fallback to task's existing engine) |
| `preq_review_task`   | Record `engine` running verification (tests, build, lint) → done  |
| `preq_block_task`    | Record `engine` reporting the block → blocked                     |
| `preq_delete_task`   | Permanently delete a task by ticket number or UUID                |

This gives deterministic task-id based execution and result upload.

## Shell Helper Mode

If MCP is not available, source `scripts/preqstation-api.sh` and use shell functions.
All mutation helpers accept an `engine` parameter:

| Function              | Signature                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `preq_get_tasks`      | `preq_get_tasks [status] [label]` (read-only, no engine needed)  |
| `preq_get_task`       | `preq_get_task <task_id>` (read-only, no engine needed)          |
| `preq_sync_projects`  | `preq_sync_projects '<json_payload>'` (project sync batch upload) |
| `preq_create_task`    | `preq_create_task '<json_payload>'` (include `engine` in JSON)   |
| `preq_patch_task`     | `preq_patch_task <task_id> '<json_payload>'` (generic PATCH)     |
| `preq_start_task`     | `preq_start_task <task_id> [engine]`                             |
| `preq_update_task_status` | `preq_update_task_status <task_id> <status> [engine]` (`status`: `inbox`/`todo`/`in_progress`/`in_review`/`done`/`archived`, supports `review` alias) |
| `preq_plan_task`      | `preq_plan_task <task_id> <plan_markdown> [engine]`              |
| `preq_complete_task`  | `preq_complete_task <task_id> <summary> [engine] [pr_url] [tests] [notes] [branch_name]` |
| `preq_review_task`    | `preq_review_task <task_id> [engine] [test_cmd] [build_cmd] [lint_cmd]` |
| `preq_block_task`     | `preq_block_task <task_id> <reason> [engine]`                    |
| `preq_delete_task`    | `preq_delete_task <task_id>`                                     |
| `preq_resolve_branch_name` | `preq_resolve_branch_name <task_id> [fallback_branch]`      |

Requires `jq` for JSON construction in plan/complete/review/block helpers.

## List Todo Tasks

List todo tasks assigned to your engine:
```bash
# Replace ENGINE with your engine value (claude, codex, or gemini)
curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  "$PREQSTATION_API_URL/api/tasks?status=todo&engine=ENGINE" | jq .
```

## Fetch Task Detail
```bash
TASK_ID="<task-id>"
curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Recommended Execution Flow

1. Fetch the task detail from PREQSTATION (verify `engine` matches your identity).
2. Move status to `in_progress` with your `engine`.
3. Resolve `branch_name` from task detail (`task.branch` / `branch`). If empty, fallback to `preq/<task-id>`.
   ```bash
   BRANCH_NAME=$(preq_resolve_branch_name "$TASK_ID")
   git checkout -B "$BRANCH_NAME" main
   ```
4. Implement code changes according to acceptance criteria.
5. Run tests/verification locally on the feature branch.
6. **Push the feature branch to origin — HARD REQUIREMENT**.
   No task may transition to `review` or `done` without a verified remote push.
   ```bash
   git add -A
   git commit -m "$BRANCH_NAME: <short summary>"
   git push -u origin "$BRANCH_NAME"
   ```
   After pushing, **you must verify the remote branch exists**:
   ```bash
   git ls-remote --heads origin "$BRANCH_NAME"
   ```
   If `git ls-remote` returns empty, the push failed. Retry or block the task — do NOT proceed.

   > **CRITICAL**: A local-only commit is equivalent to no work done.
   > If changes exist only in the worktree or local branch and are not
   > pushed to origin, they WILL be lost. Never report a task as complete
   > unless `git ls-remote` confirms the branch on origin.

7. Push `status=review` (In Review) and `result` back to PREQSTATION with your `engine` and the same ticket number. Include `branch_name` in both task `branch` and result payload:
8. Run `preq_review_task` to verify the work (E2E/unit tests, build, lint). On success, move status to `done`.
9. Confirm result appears in PREQSTATION work logs.

`preq_complete_task` must be used only after the task is moved to `in_progress`.
`preq_review_task` must be used only after the task is in `review` status (i.e. after `preq_complete_task`).

## Project Sync Flow

Use this flow when user triggers "preqstation sync" from OpenClaw:

1. Build project list as `{ projectKey, localPath }` pairs from the caller context (for example OpenClaw `MEMORY.md` mappings).
2. Check each `localPath` exists as a directory.
3. Submit **one batch** sync payload to PREQSTATION with `preq_sync_projects`.
4. Backend records sync status per project; Projects view shows synced/not-synced state.

## Inbox → Todo Plan Flow

1. User adds short task card to Inbox (optionally specifying `engine`).
2. Agent loads candidate tasks with `preq_list_tasks` (use `projectKey` + `status=todo` + own `engine` filter).
3. Agent reads local source code and generates implementation plan with LLM.
4. Agent calls `preq_plan_task` with `projectKey`, `taskId`, `planMarkdown`, `engine`, and optional `acceptanceCriteria`.
5. MCP uploads plan to task description and moves the card to `status=todo`.

## Create Task with Engine
```bash
curl -s -X POST \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Implement rate limiting",
    "engine":"claude",
    "projectKey":"MY_PROJECT"
  }' \
  "$PREQSTATION_API_URL/api/tasks" | jq .
```

## Mark In Progress (with Engine)
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","engine":"claude"}' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Update Status Only (with Engine)
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","engine":"claude"}' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID/status" | jq .
```

## Submit In Review Result (with Engine)

Before submitting, verify the feature branch exists on origin:
```bash
git ls-remote --heads origin "$BRANCH_NAME"
# If empty, push failed — do NOT proceed
```

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"review",
    "engine":"claude",
    "branch":"<branch_name>",
    "result":{
      "summary":"Implemented rate limiting for login endpoint",
      "engine":"claude",
      "branch":"<branch_name>",
      "pr_url":"https://github.com/org/repo/pull/123",
      "tests":"npm run test",
      "completed_at":"2025-02-24T12:00:00Z"
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Review Task (with Engine)

Runs verification steps (E2E tests, unit tests, build, lint) against the completed work.
On all checks passing, moves the task status from `review` to `done`.
On failure, moves the task status to `blocked` with failure details.

```bash
# MCP mode
# preq_review_task automatically runs verification and transitions status

# Shell mode
preq_review_task "$TASK_ID" "claude" "npm run test" "npm run build" "npm run lint"

# Manual curl equivalent
# 1. Run verification commands locally
npm run test && npm run build && npm run lint

# 2. On success, move to done
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"done",
    "engine":"claude",
    "result":{
      "summary":"All checks passed: tests, build, lint",
      "engine":"claude",
      "verified_at":"2025-02-24T12:30:00Z",
      "checks":{
        "tests":"pass",
        "build":"pass",
        "lint":"pass"
      }
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .

# 3. On failure, block with details
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"blocked",
    "engine":"claude",
    "result":{
      "reason":"Unit tests failed: 3 failures in auth.test.js",
      "engine":"claude",
      "blocked_at":"2025-02-24T12:30:00Z",
      "checks":{
        "tests":"fail",
        "build":"pass",
        "lint":"pass"
      }
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Blocked Update (with Engine)
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"blocked",
    "engine":"claude",
    "result":{
      "reason":"Missing required Redis environment variables",
      "engine":"claude",
      "blocked_at":"2025-02-24T12:00:00Z"
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Plan Task (with Engine)
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"todo",
    "engine":"claude",
    "description":"## Plan\n\n1. Add middleware...\n2. Write tests..."
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```
