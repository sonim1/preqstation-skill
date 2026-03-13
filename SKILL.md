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

| Tool                        | engine usage                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `preq_list_tasks`           | Read-only, no engine needed                                                                                          |
| `preq_get_task`             | Read-only, no engine needed                                                                                          |
| `preq_get_project_settings` | Read-only, no engine needed (fetch project deploy settings by key)                                                   |
| `preq_plan_task`            | Assign `engine`, send lifecycle action `plan`, backend moves inbox task to `todo` and clears `run_state`             |
| `preq_create_task`          | Assign `engine` to new inbox task                                                                                    |
| `preq_start_task`           | Record `engine` claiming the task; backend marks `run_state=working`                                                 |
| `preq_update_task_status`   | Record `engine` while updating workflow status-only endpoint (`/api/tasks/:id/status`)                               |
| `preq_complete_task`        | Record `engine` in work log result, send lifecycle action `complete`; backend moves → `ready` and clears `run_state` |
| `preq_review_task`          | Record `engine` running verification, send lifecycle action `review`; backend moves → `done` and clears `run_state`  |
| `preq_block_task`           | Record `engine` reporting the block, send lifecycle action `block`; backend moves → `hold` and clears `run_state`    |
| `preq_delete_task`          | Permanently delete a task by ticket number or UUID                                                                   |

This gives deterministic task-id based execution and result upload.

## Execution Flow (Mandatory)

You must follow this execution flow exactly.
Do not skip, reorder, combine, or substitute lifecycle actions.

1. Load the `preqstation-prompt.txt` in this worktree/branch

2. Resolve the initial workflow

- Call `preq_get_task` once at the start to fetch task details, acceptance criteria, workflow status, `run_state`, and the initial engine.
- Call `preq_start_task`

3. Execute the user objective
   user objective is in the `preqstation-prompt.txt`

- If user objective start with `plan`:
  - Start to plan using the local code.
  - Call `preq_plan_task` with plan markdown and implementation checklist.
  - Planning means plan generation only. You may inspect local code, but you must not implement product changes, run deploy steps,
- Else If user objective start with `implement` or `resume`:
  - Implement code changes and run task-level tests.
  - Resolve deploy strategy via the Deployment Strategy Contract.
  - Perform the required git/deploy steps for `direct_commit`, `feature_branch`, or `none`. Follow the `Deployment Strategy Contract` section.
- Else If user objective start with `review`:
  - Run verification (`tests`, `build`, `lint`).
  - Call `preq_review_task` with review notes.

On any failure in an active branch, call `preq_block_task` with the blocking reason and stop.

4. On success, call `preq_complete_task` with summary, branch, and `pr_url` when applicable.

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

## Shell Helper Mode (Optional)

If MCP is unavailable, source `scripts/preqstation-api.sh` and use the shell helpers documented in `docs/shell-helper-mode.md`.
Keep SKILL.md focused on lifecycle rules; use the helper reference doc for function signatures and `jq`/curl notes.
