# preqstation-skill

PREQSTATION local agent package.

Today this repository provides:

- the core `preqstation` worker skill
- remote PREQ `/mcp` setup guidance for Claude Code, Codex, and Gemini CLI
- a local Claude plugin plus an experimental Claude dispatch channel runtime
- an optional shell-helper fallback for direct REST usage

This is also the planned home for the unified local PREQ client after the OpenClaw dispatcher is absorbed here. Until that migration lands, existing OpenClaw users should keep using their current `preqstation-openclaw` setup.

## Choose Your Setup

Use the path that matches your environment:

- Claude plugin setup: [docs/install-claude-plugin.md](docs/install-claude-plugin.md)
- Claude Code worker setup: [docs/install-claude-code.md](docs/install-claude-code.md)
- Codex or Gemini CLI worker setup: [docs/install-codex-gemini.md](docs/install-codex-gemini.md)
- Experimental dispatch channel setup: [docs/install-dispatch-channel.md](docs/install-dispatch-channel.md)
- Shell helper fallback: [docs/install-shell-helper.md](docs/install-shell-helper.md)
- Existing OpenClaw users: [docs/migrate-openclaw.md](docs/migrate-openclaw.md)

## Runtime Support

Use this quick rule before installing:

- Claude Code: worker skill + remote PREQ MCP, with optional local plugin and experimental Claude-only dispatch channel
- Codex: worker skill + remote PREQ MCP only; no Claude-style Channels or Dispatch layer is required here
- Gemini CLI: worker skill + remote PREQ MCP where supported; no Claude-style Channels or Dispatch layer is involved
- Telegram/OpenClaw: legacy dispatch ingress that still lives in `preqstation-openclaw`

## Claude Plugin Install Modes

Use one of these two Claude-only paths:

- no local clone install path: `claude plugin marketplace add https://github.com/sonim1/preqstation-skill` then `claude plugin install preqstation`
- fastest local development loop: `claude --plugin-dir /path/to/preqstation-skill`

The first path is the closest match to the official marketplace install UX. The second path is best while developing the plugin itself.

## Quick Start

### Claude Code

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

### Codex

```bash
npx skills add sonim1/preqstation-skill -g -a codex
codex mcp add preqstation --url https://<your-domain>/mcp
```

Codex continues to use the worker path only. It does not need the Claude plugin or the Claude dispatch channel.

### Gemini CLI

```bash
npx skills add sonim1/preqstation-skill -g -a gemini-cli
```

PREQ engine values match the install target keys:

- `claude-code`
- `codex`
- `gemini-cli`

Install only on the agents that should own the core `preqstation` skill. Avoid bare `-g` installs if you do not want legacy OpenClaw-linked behavior through a shared skills store.

## Authentication Notes

OAuth starts when the client first makes a real request to `/mcp`.

- Codex often starts login during `mcp add` because it probes the server immediately.
- Claude Code usually stores the server first and may show `Needs authentication` until first use.
- In Claude Code, authentication commonly starts when the agent first uses PREQ tools or when you run `claude mcp get preqstation`.
- The local dispatch channel now reuses the Claude `preqstation` MCP URL from `~/.claude.json` when available, so `PREQSTATION_MCP_URL` is only needed as an override.

## Current Repository Scope

Use this repository today for:

- a local Claude plugin for `--plugin-dir` or marketplace installs
- a Claude plugin package that can be installed directly from the GitHub repo through Claude plugin marketplaces
- worker-side task execution through the `preqstation` skill
- remote PREQ MCP access over HTTP + OAuth
- an experimental local Claude dispatch channel runtime with a built-in `dispatch_task` launcher tool
- shell helper fallback when MCP is unavailable

For Claude local dispatch setup, project key to local repo mappings live in `~/.preqstation-dispatch/projects.json`. `/preqstation:setup` should use that file as the canonical local mapping store.

The local plugin and dispatch runtime are Claude-specific. Codex and Gemini still use the worker/MCP path and do not have a Claude-style channel or dispatch surface here.

The current production OpenClaw dispatcher still lives in `preqstation-openclaw`. This repository now includes an experimental dispatch channel for local development and early migration work, but the full production migration is not complete yet.

## Exposed MCP Tools

- `preq_list_projects`: list PREQ projects for setup and local repo mapping flows
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
- [docs/install-claude-plugin.md](docs/install-claude-plugin.md): local Claude plugin setup
- [docs/install-dispatch-channel.md](docs/install-dispatch-channel.md): experimental dispatch channel setup
- `scripts/preqstation-api.sh`: shell helper wrappers for task APIs
- [docs/install-claude-code.md](docs/install-claude-code.md): Claude Code install path
- [docs/install-codex-gemini.md](docs/install-codex-gemini.md): Codex and Gemini CLI install paths
- [docs/install-shell-helper.md](docs/install-shell-helper.md): shell-helper fallback setup
- [docs/migrate-openclaw.md](docs/migrate-openclaw.md): current OpenClaw migration guidance
