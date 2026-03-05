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
| `preq_get_project_settings` | Read-only, no engine needed (fetch project deploy settings by key) |
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
| `preq_get_project_settings` | `preq_get_project_settings <project_key>` (read-only, deploy settings by key) |
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

For curl examples, see `docs/curl-examples.md`.

## Deployment Strategy Contract (required)

Before any git action, resolve deployment strategy through MCP:

1. Call `preq_get_task <task_id>`.
2. Read `task.deploy_strategy` from the response.
3. If missing, call `preq_get_project_settings <project_key>` and resolve from:
   - `settings.deploy_strategy`
   - `settings.deploy_default_branch`
   - `settings.deploy_auto_pr`
   - `settings.deploy_commit_on_review`

Expected values from PREQSTATION backend:

- `strategy`: `direct_commit` | `feature_branch` | `none`
- `default_branch`: string (usually `main`)
- `auto_pr`: boolean
- `commit_on_review`: boolean

Default when absent/invalid:

- `strategy=none`
- `default_branch=main`
- `auto_pr=false`
- `commit_on_review=true`

Behavior by `strategy`:

- `none`: do not run git commit/push/PR. Only code changes + task update result.
- `direct_commit`: commit directly on `default_branch` and push `origin <default_branch>`. Do not create PR.
- `feature_branch`: use task `branch` (or fallback branch), push `origin <branch>`, and create PR only when `auto_pr=true`.

Rule for `commit_on_review`:

- if `true` and strategy is `direct_commit` or `feature_branch`, do not move task to `review` until remote push is verified.
- if `false`, review transition is allowed without mandatory remote push.

## Execution Flow

1. `preq_get_task` — fetch task details, current status, and acceptance criteria.
2. `preq_get_project_settings` — resolve deployment strategy.
3. Based on current task status:

   **inbox** — plan only:
   - `preq_plan_task` with plan markdown and acceptance criteria.
   - Stop. Do not implement.

   **todo** — full execution:
   - `preq_start_task`
   - Implement code changes and run tests.
   - Execute git flow per deployment strategy contract above.
   - `preq_complete_task` with summary, branch, pr_url.

   **in_progress** — continue execution:
   - Continue implementation and run tests.
   - Execute git flow per deployment strategy contract above.
   - `preq_complete_task` with summary, branch, pr_url.

   **review** — verification only:
   - Run verification (tests, build, lint).
   - `preq_review_task` on success.

4. On any failure: `preq_block_task` with reason.

`preq_complete_task` must be used only after the task is in `in_progress`.
`preq_review_task` must be used only after the task is in `review` (i.e. after `preq_complete_task`).

## Inbox → Todo Plan Flow

1. User adds short task card to Inbox (optionally specifying `engine`).
2. Agent loads candidate tasks with `preq_list_tasks` (use `projectKey` + `status=inbox` + own `engine` filter).
3. Agent reads local source code and generates implementation plan.
4. Agent calls `preq_plan_task` with `projectKey`, `taskId`, `planMarkdown`, `engine`, and optional `acceptanceCriteria`.
5. Backend uploads plan to task description and moves the card to `status=todo`.
