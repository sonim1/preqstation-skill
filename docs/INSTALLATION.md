# Installation

- Claude Code plugin (recommended worker setup): [install-claude-plugin.md](install-claude-plugin.md)
- Claude Code worker-only mode: [install-claude-code.md](install-claude-code.md)
- Codex: [install-codex-gemini.md](install-codex-gemini.md)
- Gemini CLI: [install-codex-gemini.md](install-codex-gemini.md)
- Shell helper fallback: [install-shell-helper.md](install-shell-helper.md)

## Prerequisites

- Claude plugin users need the remote PREQ MCP server, but `/preqstation:setup` can add or verify it for you

## Quick Start

### Claude Code

Install the plugin:

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
```

The plugin already includes the packaged `preqstation` skill for Claude Code, so you do not need a separate `npx skills add ... -a claude-code` install unless you intentionally want worker-only mode without the plugin helpers.

Then start Claude and run:

```text
/preqstation:setup
```

`/preqstation:setup` can add or verify the user-scoped `preqstation` MCP connection, fetch projects when `preq_list_projects` is available, lets you choose auto-scan or manual mapping, and saves repo mappings in `~/.preqstation-dispatch/projects.json`.

If you prefer to register the PREQ MCP server yourself first, use:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

Useful plugin helper commands:

- `/preqstation:setup` to configure or refresh project path mappings
- `/preqstation:update` to see the current plugin update command
- `/preqstation:help` to see the available Claude plugin, worker-only, and OpenClaw paths

For worker-only Claude Code mode without the plugin helpers, use [install-claude-code.md](install-claude-code.md).

### Codex

```bash
npx skills add sonim1/preqstation-skill -g -a codex
codex mcp add preqstation --url https://<your-domain>/mcp
```

Codex uses the worker + remote MCP path only. It does not use the Claude plugin.

### Gemini CLI

```bash
npx skills add sonim1/preqstation-skill -g -a gemini-cli
gemini mcp add --scope user --transport http preqstation https://<your-domain>/mcp
gemini mcp list
```

If `gemini mcp list` shows `preqstation` as `Disconnected`, finish OAuth inside an interactive Gemini session:

```text
/mcp auth preqstation
```

Gemini CLI uses the same worker + remote MCP path when the local CLI exposes remote HTTP MCP. If it does not, fall back to the shell helper path.

## Update Existing Install

If PREQSTATION already works in one of your runtimes and you only want the latest skill or plugin changes, use the matching update path below.

### Claude Code Plugin

```bash
claude plugin marketplace update preqstation
claude plugin update preqstation@preqstation
claude plugin list
```

Then open Claude and refresh setup if needed:

```text
/preqstation:setup
```

This is the recommended Claude Code path. The plugin already bundles the `preqstation` worker skill, so you do not need a separate `npx skills add ... -a claude-code` step unless you intentionally use worker-only mode.

### Claude Code Worker-Only Mode

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
claude mcp list
```

If the PREQ MCP server is missing, add it again:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

### Codex

```bash
npx skills add sonim1/preqstation-skill -g -a codex
codex mcp list
```

If the PREQ MCP server is missing, add it again:

```bash
codex mcp add preqstation --url https://<your-domain>/mcp
```

### OpenClaw

OpenClaw production dispatch currently lives in the separate `preqstation-dispatcher` repository.

If you use that path, update the linked plugin there:

```bash
openclaw plugins install --link --dangerously-force-unsafe-install /Users/kendrick/projects/preqstation-dispatcher
openclaw gateway restart
openclaw plugins inspect preqstation-dispatcher
```

After the restart, refresh project mappings if needed with the copied `/preqsetup auto ...` command from Projects or run `/preqsetup status` in OpenClaw to verify mappings.
