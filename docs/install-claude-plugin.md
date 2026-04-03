# Install the Claude Plugin

Use this path when you want Claude Code to load the PREQSTATION plugin and its helper commands.
For most Claude Code users, this is the recommended install path.

This plugin requires Node 18+ on PATH because the bundled dispatch runtime is launched with `node`.

Codex and Gemini CLI do not use this plugin surface. They stay on the worker + remote MCP path.

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |
| `preq-dispatch-channel` | local stdio MCP | experimental Claude-only dispatch runtime bundled by this plugin | optional |

## What the plugin provides

- plugin metadata through `.claude-plugin/plugin.json`
- the packaged `preqstation` worker skill
- helper commands:
  - `/preqstation:setup`
  - `/preqstation:status`
  - `/preqstation:start-dispatch`
- an experimental Claude dispatch channel runtime

`/preqstation:start-dispatch` is a helper that explains the terminal launch command. It is not the runtime entrypoint by itself.
The plugin already includes the packaged `preqstation` skill for Claude Code, so you do not need a separate `npx skills add ... -a claude-code` install in the normal plugin flow.

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

## Configure PREQ MCP

The plugin does not replace PREQ MCP registration. Add the remote MCP server separately:

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

Claude starts OAuth on the first real PREQ request.

## Run Setup

After the plugin is installed, start Claude and run:

```text
/preqstation:setup
```

This command:

- verifies the `preqstation` MCP connection
- fetches PREQ projects when `preq_list_projects` is available
- offers auto-scan or manual repo mapping
- saves project mappings in `~/.preqstation-dispatch/projects.json`

## Experimental Dispatch Runtime

The plugin includes an experimental Claude-only dispatch runtime.

Start it with:

```bash
claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
```

For debug logging:

```bash
claude --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
tail -f /tmp/preqstation-dispatch-debug.log
```

During the current Claude Channels research preview, do not add `--channels plugin:preqstation@preqstation` to that command.

If the dispatcher cannot discover the PREQ MCP URL from Claude config, provide it explicitly:

```bash
PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
```

For deeper dispatch details, use [install-dispatch-channel.md](install-dispatch-channel.md).
If you are developing this repository itself, keep local `--plugin-dir` and repo-driven workflows in [../CONTRIBUTING.md](../CONTRIBUTING.md) instead of this end-user guide.

## Current Scope

Today this plugin is the right surface for:

- Claude Code setup helpers
- packaging the worker-side `preqstation` skill for Claude Code
- local testing of the experimental Claude dispatch channel runtime

It does not replace the current production OpenClaw dispatcher. For that migration status, see [migrate-openclaw.md](migrate-openclaw.md).
