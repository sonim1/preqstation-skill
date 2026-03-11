---
name: preqstation
description: >
  Fetch tasks from PREQSTATION, execute work, and push updates/results back to PREQSTATION APIs.
  Use when asked to run a PREQ task, fetch todo tasks, or update execution status.
  Requires PREQSTATION_API_URL and PREQSTATION_TOKEN environment variables.
  Tasks carry an `engine` field (`claude-code` | `codex` | `gemini-cli`) indicating which AI agent should execute them.
---

This is the agent-side lifecycle skill. The OpenClaw launcher skill is separate and should be named `preqstation-dispatch`.

## Environment

- `PREQSTATION_API_URL`: PREQSTATION API base URL (example: `https://mypreqstation.vercel.app`)
- `PREQSTATION_TOKEN`: PREQSTATION Bearer token (generated in PREQSTATION `/api-keys`)
- `PREQSTATION_ENGINE` (optional): fallback engine (`claude-code` | `codex` | `gemini-cli`) when client auto-detection is unavailable

## Agent Identity & Engine Mapping

Each agent must identify itself and use the corresponding `engine` value in **all** task operations (list, create, plan, start, update status, complete, review, block):

| If you are...        | Use `engine=` |
| -------------------- | ------------- |
| Claude (Anthropic)   | `claude-code` |
| GPT / Codex (OpenAI) | `codex`       |
| Gemini (Google)      | `gemini-cli`  |

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
| `preq_plan_task`     | Assign `engine`, move inbox task to `todo`, and clear `run_state` |
| `preq_create_task`   | Assign `engine` to new inbox task                                 |
| `preq_start_task`    | Record `engine` claiming the task and set `run_state=working`     |
| `preq_update_task_status` | Record `engine` while updating workflow status-only endpoint (`/api/tasks/:id/status`) |
| `preq_complete_task` | Record `engine` in work log result → `ready`, clear `run_state`   |
| `preq_review_task`   | Record `engine` running verification → `done`, clear `run_state`  |
| `preq_block_task`    | Record `engine` reporting the block → `hold`, clear `run_state`   |
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
| `preq_update_task_status` | `preq_update_task_status <task_id> <status> [engine]` (`status`: `inbox`/`todo`/`hold`/`ready`/`done`/`archived`) |
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
   - `settings.deploy_squash_merge`

Expected values from PREQSTATION backend:

- `strategy`: `direct_commit` | `feature_branch` | `none`
- `default_branch`: string (usually `main`)
- `auto_pr`: boolean (feature_branch only)
- `commit_on_review`: boolean
- `squash_merge`: boolean (direct_commit only)

Default when absent/invalid:

- `strategy=none`
- `default_branch=main`
- `auto_pr=false`
- `commit_on_review=true`
- `squash_merge=true`

Behavior by `strategy`:

- `none`: do not run git commit/push/PR. Only code changes + task update result.

- `direct_commit`: merge worktree commits into `default_branch` and push. No PR.
  After completing work in the worktree:
  ```bash
  # In primary checkout: update and merge
  git -C <project_cwd> checkout <default_branch>
  git -C <project_cwd> pull origin <default_branch>

  # squash_merge=true (default): single commit
  git -C <project_cwd> merge --squash <worktree_branch>
  git -C <project_cwd> commit -m "<task_id>: <summary>"

  # squash_merge=false: regular merge
  git -C <project_cwd> merge <worktree_branch>

  # Push to remote
  git -C <project_cwd> push origin <default_branch>
  ```

- `feature_branch`: push worktree branch to remote. Create PR only when `auto_pr=true` (requires GitHub MCP on the agent).
  ```bash
  git -C <project_cwd> push origin <worktree_branch>
  # if auto_pr=true: create PR via GitHub MCP or gh CLI
  ```

Rule for `commit_on_review`:

- if `true` and strategy is `direct_commit` or `feature_branch`, do not move task to `ready` until remote push is verified.
- if `false`, ready transition is allowed without mandatory remote push.

## Execution Flow

1. Call `preq_get_task` once at the start to fetch task details, acceptance criteria, workflow status, `run_state`, and the initial engine.
2. If the task is active (`inbox`, `todo`, `hold`, or `ready`), call `preq_start_task` immediately after `preq_get_task` and before any planning, implementation, or verification. This claims the task for the current engine and changes `run_state` from `queued` to `working`.
3. Resolve the initial workflow status once and execute exactly one matching branch below. Do not chain lifecycle branches in a single run.

   **inbox** — plan only:
   - Read local code and prepare the implementation plan.
   - Call `preq_plan_task` with plan markdown and acceptance criteria.
   - Stop after backend moves the task to `todo` and clears `run_state`. Do not implement.

   **todo** — execute:
   - Implement code changes and run task-level tests.
   - Resolve deploy strategy via the Deployment Strategy Contract.
   - Perform the required git/deploy steps for `direct_commit`, `feature_branch`, or `none`.
   - Call `preq_complete_task` with summary, branch, and `pr_url` when applicable.
   - Stop after backend moves the task to `ready` and clears `run_state`. Do not call `preq_review_task` in the same run.

   **hold** — resume from pause/block:
   - Investigate the blocker, continue implementation, and run task-level tests.
   - Resolve deploy strategy via the Deployment Strategy Contract.
   - Perform the required git/deploy steps for `direct_commit`, `feature_branch`, or `none`.
   - If the blocker is resolved, call `preq_complete_task` with summary, branch, and `pr_url` when applicable.
   - If the task is still blocked, call `preq_block_task` again with the updated blocking reason.
   - Stop after backend moves the task to `ready` or keeps it in `hold`. Do not call `preq_review_task` in the same run.

   **ready** — verification only:
   - Run verification (`tests`, `build`, `lint`).
   - Call `preq_review_task` on success.
   - Stop after backend moves the task to `done`.

4. On any failure in an active branch, call `preq_block_task` with the blocking reason and stop.

`preq_plan_task`, `preq_start_task`, `preq_complete_task`, `preq_review_task`, and `preq_block_task` are semantic lifecycle actions. Backend owns the actual status transition and must validate the current status for each action.
`preq_update_task_status` is an escape hatch for manual operations, not part of the normal lifecycle flow.
Workflow status and execution state are separate. Valid workflow statuses are `inbox`, `todo`, `hold`, `ready`, `done`, and `archived`. Valid `run_state` values are `queued`, `working`, and `null`.
`preq_start_task` is the execution-claim action. It must mark `run_state=working` before any substantive work, but it does not recreate an `in_progress` workflow column.
`preq_complete_task` must be used only after work is actively claimed and must move the task to `ready`.
`preq_review_task` must be used only after the task is in `ready`.

## Inbox → Todo Plan Flow

1. User adds short task card to Inbox (optionally specifying `engine`).
2. Agent loads candidate tasks with `preq_list_tasks` (use `projectKey` + `status=inbox` + own `engine` filter).
3. Agent reads local source code and generates implementation plan.
4. Agent calls `preq_plan_task` with `projectKey`, `taskId`, `planMarkdown`, `engine`, and optional `acceptanceCriteria`.
5. Backend uploads plan to task description and moves the card to `status=todo`.
