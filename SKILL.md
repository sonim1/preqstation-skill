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
| `preq_list_tasks`    | Filter tasks by `engine`                                          |
| `preq_get_task`      | Read-only, no engine needed                                       |
| `preq_plan_task`     | Assign `engine` when planning task → todo                         |
| `preq_create_task`   | Assign `engine` to new inbox task                                 |
| `preq_start_task`    | Record `engine` starting the work → in_progress                   |
| `preq_update_task_status` | Record `engine` while updating status-only endpoint (`/api/tasks/:id/status`) |
| `preq_complete_task` | Record `engine` in work log result → review (fallback to task's existing engine) |
| `preq_review_task`   | Record `engine` running verification (tests, build, lint) → done  |
| `preq_block_task`    | Record `engine` reporting the block → blocked                     |

This gives deterministic task-id based execution and result upload.

## Shell Helper Mode

If MCP is not available, source `scripts/preqstation-api.sh` and use shell functions.
All mutation helpers accept an `engine` parameter:

| Function              | Signature                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `preq_get_tasks`      | `preq_get_tasks [status] [engine] [label]`                       |
| `preq_get_task`       | `preq_get_task <task_id>`                                        |
| `preq_create_task`    | `preq_create_task '<json_payload>'` (include `engine` in JSON)   |
| `preq_patch_task`     | `preq_patch_task <task_id> '<json_payload>'` (generic PATCH)     |
| `preq_start_task`     | `preq_start_task <task_id> [engine]`                             |
| `preq_update_task_status` | `preq_update_task_status <task_id> <status> [engine]` (`status`: `inbox`/`todo`/`in_progress`/`in_review`/`done`/`archived`, supports `review` alias) |
| `preq_plan_task`      | `preq_plan_task <task_id> <plan_markdown> [engine]`              |
| `preq_complete_task`  | `preq_complete_task <task_id> <summary> [engine] [pr_url] [tests] [notes]` |
| `preq_review_task`    | `preq_review_task <task_id> [engine] [test_cmd] [build_cmd] [lint_cmd]` |
| `preq_block_task`     | `preq_block_task <task_id> <reason> [engine]`                    |
| `preq_delete_task`    | `preq_delete_task <task_id>`                                     |

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
3. Create a feature branch from `main` (e.g. `preq/<task-id>`).
4. Implement code changes according to acceptance criteria.
5. Run tests/verification locally on the feature branch.
6. **Push the feature branch to origin and verify** — this step is mandatory before moving to review.
   ```bash
   git add -A
   git commit -m "preq/<task-id>: <short summary>"
   git push origin preq/<task-id>
   # Verify the push succeeded — never skip this
   git log --oneline origin/preq/<task-id> -1
   ```
   **WARNING**: Do NOT mark the task as review until `git push` succeeds and `origin/preq/<task-id>` is confirmed. Work that only exists in the local worktree will be lost.
7. Push `status=review` (In Review) and `result` back to PREQSTATION with your `engine` and the same ticket number.
8. Run `preq_review_task` to verify the work (E2E/unit tests, build, lint). On success, move status to `done`.
9. Confirm result appears in PREQSTATION work logs.

`preq_complete_task` must be used only after the task is moved to `in_progress`.
`preq_review_task` must be used only after the task is in `review` status (i.e. after `preq_complete_task`).

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
```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"review",
    "engine":"claude",
    "result":{
      "summary":"Implemented rate limiting for login endpoint",
      "engine":"claude",
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
