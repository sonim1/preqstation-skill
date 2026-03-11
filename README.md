# preqstation-skill

PREQSTATION agent package with both:

- Skill instructions for direct REST usage
- MCP plugin server for Codex/Claude Code

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

## Required Environment Variables

```bash
export PREQSTATION_API_URL="https://your-preqstation-domain.vercel.app"
export PREQSTATION_TOKEN="preq_xxxxxxxxxxxxxxxxx"
```

Optional (when client name auto-detection is unavailable):

```bash
export PREQSTATION_ENGINE="codex" # claude-code | codex | gemini-cli
```

## MCP Plugin Setup (Codex / Claude Code)

Add an MCP server entry that launches:

```bash
node /ABSOLUTE/PATH/TO/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

Example MCP server config:

```json
{
  "mcpServers": {
    "preqstation": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/preqstation-skill/scripts/preqstation-mcp-server.mjs"],
      "env": {
        "PREQSTATION_API_URL": "https://your-preqstation-domain.vercel.app",
        "PREQSTATION_TOKEN": "preq_xxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Exposed MCP Tools

- `preq_list_tasks`: workflow status filter (`inbox`/`todo`/`hold`/`ready`/`done`/`archived`, `projectKey` optional)
- `preq_get_task`: fetch single ticket detail by ticket number
- `preq_get_project_settings`: fetch project settings by key (`/api/projects/:key/settings`)
- `preq_sync_projects`: verify local project directories and upload one batch sync result to `/api/projects/sync`
- `preq_plan_task`: improve an existing task with generated plan markdown and move the card to `todo` in a specific project key
- `preq_create_task`: create a new task in Inbox (internal status) via `/api/tasks`
- `preq_start_task`: mark `run_state=working` for an active task as soon as an engine claims it
- `preq_update_task_status`: workflow status-only update (`inbox`/`todo`/`hold`/`ready`/`done`/`archived`) via `/api/tasks/:id/status`
- `preq_complete_task`: from active execution, upload result payload, mark `ready`, and clear `run_state`
- `preq_review_task`: from `ready`, run verification, mark `done`, and clear `run_state`
- `preq_block_task`: move task to `hold` with reason and clear `run_state`
- `preq_delete_task`: permanently delete a task by ticket number or UUID

Engine is always attached by MCP mutation tools (`create/plan/start/update_status/complete/review/block`) using this priority:
1. Explicit `engine` argument
2. Existing task `engine` (for plan/complete flows)
3. MCP client `initialize.clientInfo.name` auto-detection
4. `PREQSTATION_ENGINE` env var (if set)
5. Fallback: `codex`

PREQ workflow status is separate from execution state. Canonical workflow statuses are `inbox`, `todo`, `hold`, `ready`, `done`, and `archived`. Canonical `run_state` values are `queued`, `working`, and `null`.
Telegram/OpenClaw dispatch can set `run_state=queued` before an engine picks the task up. The engine must then call `preq_start_task` immediately after `preq_get_task` so PREQSTATION records `run_state=working` before any substantive work begins.
`preq_complete_task` writes `result`, moves the task to `ready`, and clears `run_state`. After `preq_complete_task`, the current run should stop. `preq_review_task` is for a later run that starts with task status `ready`.
`preq_create_task` omits `status` on create so the server stores it as internal `inbox`, and `preq_get_task` now returns that state as `inbox`.
`preq_plan_task` is intended for the Inbox -> Todo planning workflow: user drops short card in Inbox, agent claims execution (`working`), builds the plan from local code context, then updates the existing task with that plan, moves it to `todo`, and clears `run_state`.

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
- `scripts/preqstation-mcp-server.mjs`: MCP stdio server for Codex/Claude Code

## Claude Code MCP Add Command

Register PREQSTATION MCP server with env vars:

```bash
claude mcp add -s user \
  --env='PREQSTATION_API_URL=https://<your-domain>' \
  --env='PREQSTATION_TOKEN=preq_xxxxx' \
  preqstation -- \
  node /Users/kendrick/projects/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

If already registered, remove and re-add:

```bash
claude mcp remove -s user preqstation
```

Check registration:

```bash
claude mcp list
claude mcp get preqstation
```

## Codex MCP Add Command

Register PREQSTATION MCP server with env vars:

```bash
codex mcp add preqstation \
  --env='PREQSTATION_API_URL=https://<your-domain>' \
  --env='PREQSTATION_TOKEN=preq_xxxxx' \
  -- node /Users/kendrick/projects/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

If already registered, remove and re-add:

```bash
codex mcp remove preqstation
```

Check registration:

```bash
codex mcp list
codex mcp get preqstation
```
