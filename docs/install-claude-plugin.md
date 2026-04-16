# Install the Claude Plugin

Use this path when you want Claude Code to load the PREQSTATION plugin and its helper commands.
For most Claude Code users, this is the recommended install path.

The default plugin path does not start a local dispatch watcher. The optional manual dispatch runtime still requires Node 18+ on PATH.

Codex and Gemini CLI do not use this plugin surface. They stay on the worker + remote MCP path.

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |
| `preq-dispatch-channel` | local stdio MCP | experimental Claude-only dispatch runtime, manual only | optional |

## What the plugin provides

- plugin metadata through `.claude-plugin/plugin.json`
- the packaged `preqstation` worker skill
- helper commands:
  - `/preqstation:setup`
  - `/preqstation:status`
  - `/preqstation:update`
  - `/preqstation:help`
- a manual experimental Claude dispatch channel runtime source for contributors

The plugin already includes the packaged `preqstation` skill for Claude Code, so you do not need a separate `npx skills add ... -a claude-code` install in the normal plugin flow.

The installed plugin intentionally does not declare `preq-dispatch-channel` as a default MCP server. Enabling or updating the plugin should not create a background poller.

## Marketplace Install

This is the canonical end-user path.

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
claude plugin list
```

To update an existing install:

```bash
claude plugin marketplace update preqstation
claude plugin update preqstation@preqstation
claude plugin list
```

The GitHub marketplace source currently tracks rolling Git source from `main`. `claude plugin update` pulls the current repository state from that source.

If you previously tested the old experimental watcher and still see repeated `preq_list_tasks` or `preq_list_dispatch_requests` logs, stop the stale process once:

```bash
pkill -f preq-dispatch-channel-server.mjs
```

If you want the plugin to remind you of these commands from inside Claude, run:

```text
/preqstation:update
```

## Configure PREQ MCP

The plugin still needs the remote PREQ MCP server, but `/preqstation:setup` can add or verify it for you after install.

If you want to add it manually first, prefer a single user-scoped entry:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

Claude starts OAuth on the first real PREQ request.

## Run Setup

After the plugin is installed, start Claude and run:

```text
/preqstation:setup
```

This command:

- adds or verifies the user-scoped `preqstation` MCP connection
- fetches PREQ projects when `preq_list_projects` is available
- offers auto-scan or manual repo mapping
- saves project mappings in `~/.preqstation-dispatch/projects.json`

If Claude keeps asking you to authenticate `preqstation` after restarts, check for multiple local or project-scoped `preqstation` entries and consolidate to one user-scoped registration.

For a quick overview of the available PREQSTATION paths and commands inside Claude, run:

```text
/preqstation:help
```

## Experimental Dispatch Runtime

The repository still contains the experimental Claude-only dispatch runtime, but the installed plugin does not auto-register or auto-start it.

For production dispatch, keep using the separate OpenClaw dispatcher until the migration guide changes.

For contributor-only manual testing from a local checkout:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

For debug logging:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
tail -f /tmp/preqstation-dispatch-debug.log
```

During the current Claude Channels research preview, do not add `--channels plugin:preqstation@preqstation` to that command.

If the dispatcher cannot discover the PREQ MCP URL from Claude config, provide it explicitly:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

For deeper dispatch details, use [install-dispatch-channel.md](install-dispatch-channel.md).
If you are developing this repository itself, keep local `--plugin-dir` and repo-driven workflows in [../CONTRIBUTING.md](../CONTRIBUTING.md) instead of this end-user guide.

## Current Scope

Today this plugin is the right surface for:

- Claude Code setup helpers
- packaging the worker-side `preqstation` skill for Claude Code
- manual local testing of the experimental Claude dispatch channel runtime

It does not replace the current production OpenClaw dispatcher. For that migration status, see [migrate-openclaw.md](migrate-openclaw.md).
