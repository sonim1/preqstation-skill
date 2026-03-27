# preqstation-skill

PREQSTATION agent package with:

- Skill instructions for task lifecycle execution
- Remote MCP installation guidance for Codex/Claude Code
- Optional shell helper for direct REST usage

This repository owns the core agent-side skill name `preqstation`. The OpenClaw launcher skill is separate and should use `preqstation-dispatch`.

## Install Skill (recommended per agent)

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
npx skills add sonim1/preqstation-skill -g -a codex
npx skills add sonim1/preqstation-skill -g -a gemini-cli
```

Install only on the agents that should own the core `preqstation` skill. Avoid bare `-g` installs if you do not want OpenClaw linked through the shared skills store.

PREQ engine values match the skill install target keys:

- `claude-code`
- `codex`
- `gemini-cli`

## Recommended MCP Setup (HTTP + OAuth)

The MCP runtime now lives in the `projects-manager` service at `/mcp`.
Register the remote endpoint and let Claude Code or Codex handle the browser login flow.

### Claude Code

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

### Codex

```bash
codex mcp add preqstation --url https://<your-domain>/mcp
```

When the client first connects, it should open the service login page and complete OAuth automatically.

## Shell Helper Environment Variables (Optional)

If MCP is unavailable and you need direct REST access through `scripts/preqstation-api.sh`, set:

```bash
export PREQSTATION_API_URL="https://your-preqstation-domain.vercel.app"
export PREQSTATION_TOKEN="preq_xxxxxxxxxxxxxxxxx"
```

Optional (when client name auto-detection is unavailable):

```bash
export PREQSTATION_ENGINE="codex" # claude-code | codex | gemini-cli
```

## Legacy Stdio MCP Server (Deprecated)

The local stdio bridge remains in this repository temporarily for compatibility, but new installs should use the remote `/mcp` endpoint above.

Legacy launch command:

```bash
node /ABSOLUTE/PATH/TO/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

Legacy config example:

```json
{
  "mcpServers": {
    "preqstation": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/preqstation-skill/scripts/preqstation-mcp-server.mjs"
      ],
      "env": {
        "PREQSTATION_API_URL": "https://your-preqstation-domain.vercel.app",
        "PREQSTATION_TOKEN": "preq_xxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

This mode still requires `PREQSTATION_API_URL` and `PREQSTATION_TOKEN` because it proxies REST calls directly from the local machine.

## Exposed MCP Tools

- `preq_list_tasks`: workflow status filter (`inbox`/`todo`/`hold`/`ready`/`done`/`archived`, `projectKey` optional)
- `preq_get_task`: fetch single ticket detail by ticket number
- `preq_get_project_settings`: fetch project settings by key (`/api/projects/:key/settings`)
- `preq_update_qa_run`: update branch-level QA status/target/report via `/api/qa-runs/:id`
- `preq_plan_task`: assign `engine`, send lifecycle action `plan`, promote `inbox -> todo`, and clear `run_state`
- `preq_create_task`: create a new task in Inbox (internal status) via `/api/tasks`
- `preq_start_task`: record `engine` claiming the task and send lifecycle action `start` so backend marks `run_state=working`
- `preq_update_task_status`: workflow status-only update (`inbox`/`todo`/`hold`/`ready`/`done`/`archived`) via `/api/tasks/:id/status`
- `preq_complete_task`: record `engine`, upload result payload, send lifecycle action `complete`, move task to `ready`, and clear `run_state`
- `preq_review_task`: record `engine`, run verification from `ready`, send lifecycle action `review`, move task to `done`, and clear `run_state`
- `preq_block_task`: record `engine`, send lifecycle action `block`, move task to `hold`, and clear `run_state`
- `preq_delete_task`: permanently delete a task by ticket number or UUID

Engine is always attached by MCP mutation tools (`create/plan/start/update_status/complete/review/block`) using this priority:

1. Explicit `engine` argument
2. Existing task `engine` (for plan/complete flows)
3. MCP client `initialize.clientInfo.name` auto-detection
4. `PREQSTATION_ENGINE` env var (if set)
5. Fallback: `codex`

Normal PREQ runs must use semantic lifecycle actions. `preq_update_task_status` is manual override only, and agents should not send workflow status or `run_state` literals directly in the normal lifecycle flow.

Workflow status and execution state are separate:

- workflow status: `inbox`, `todo`, `hold`, `ready`, `done`, `archived`
- `run_state`: `queued`, `working`, `null`

Telegram/OpenClaw dispatch can set `run_state=queued` before an engine picks the task up. The engine must then call `preq_start_task` immediately after `preq_get_task` so backend records `run_state=working` before any substantive work begins.

## Execution Flow (Mandatory)

Follow the PREQ lifecycle exactly. Do not skip, reorder, combine, or substitute lifecycle actions.

1. When Task ID is present, call `preq_get_task` once at the start to fetch task details, acceptance criteria, workflow status, `run_state`, and the initial engine.
2. Resolve the initial workflow status once and execute exactly one matching branch below. Do not chain lifecycle branches in a single run.

If user objective is `plan`:

- Call order: `preq_get_task` → `preq_start_task` → read local code → `preq_plan_task`
- Call `preq_plan_task` with plan markdown and acceptance criteria
- Planning means plan generation only. Do not run tests, build, lint, implement, deploy, or continue into another branch in the same run
- Stop after backend moves the task to `todo` and clears `run_state`

If user objective is `qa`:

- Task ID may be absent. Do not invent a task or force task lifecycle transitions for branch-level QA runs.
- If `.preqstation-prompt.txt` includes `QA Task Keys`, call `preq_get_task` for each listed Ready task first and use those task details as the QA scope.
- If the current agent has access to the `dogfood` skill, use it as the default QA workflow for browser testing and report generation.
- Call order: inspect `.preqstation-prompt.txt` → start local app in current worktree → `preq_update_qa_run(status=running)` → browser QA → `preq_update_qa_run(status=passed|failed)`
- Limit QA to the scoped Ready tasks and the minimal navigation or sanity checks needed to verify them. Do not broaden into unrelated full-app exploratory QA unless an unrelated issue blocks the scoped checks or prevents the app from starting.
- Upload markdown report, summary counts, and `target_url` to the QA run
- Stop after the QA run is finalized

If user objective is `implement` or `resume`:

- Call order: `preq_get_task` → `preq_start_task` → implement/test/deploy → `preq_complete_task`
- Implement code changes and run task-level tests
- Resolve deploy strategy before git actions
- Stop after backend moves the task to `ready` and clears `run_state`

If user objective is `review`:

- Call order: `preq_get_task` → `preq_start_task` → verify → `preq_review_task`
- Run verification (`tests`, `build`, `lint`)
- Stop after backend moves the task to `done`

On any failure in an active task branch, call `preq_block_task` with the blocking reason and stop.
On any failure in a QA branch, update the QA run to `failed` with a concise markdown report and stop.

Branch handling:

- Use task `branch` as canonical `branch_name` for git push/PR when present.
- `preq_complete_task` now supports optional branch propagation:
  - MCP: `branchName` input
  - Shell helper: 7th argument `[branch_name]`

Deployment strategy handling (required before git actions):

- Resolve strategy from `preq_get_task` response: `deploy_strategy.strategy/default_branch/auto_pr/commit_on_review`.
- If missing in task payload, fetch `preq_get_project_settings <projectKey>` and use `settings.deploy_*`.
- Execute git flow by strategy:
  - `none`: no git commit/push/PR
  - `direct_commit`: commit/push `default_branch`
  - `feature_branch`: push feature branch, create PR only when `auto_pr=true`

## Files

- `SKILL.md`: main skill instructions
- `scripts/preqstation-api.sh`: shell helper wrappers for task APIs
- `scripts/preqstation-mcp-server.mjs`: deprecated local MCP stdio bridge
