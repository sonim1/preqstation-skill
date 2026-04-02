# Install as a Local Claude Plugin

Use this path when you want Claude Code to load this repository as a local plugin.

Do not use this path for Codex or Gemini CLI. Their PREQ setup stays on the worker + remote MCP path only.

## What this gives you today

- plugin metadata through `.claude-plugin/plugin.json`
- the `preqstation` worker skill under `skills/preqstation/SKILL.md`
- helper commands under `commands/`

This is currently a local Claude plugin for development, marketplace-style installs, and early dispatch testing.

You have two valid local test modes:

- preferred install path: GitHub marketplace source + `claude plugin install preqstation`
- fastest development loop: `claude --plugin-dir /path/to/preqstation-skill`

## 1. Preferred install path: install from the GitHub repository

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation
claude plugin list
```

If you need to be explicit about the marketplace name, use:

```bash
claude plugin install preqstation@preqstation
```

## 2. Development path: load the plugin from the repository

Use this while iterating on local changes before you push them:

```bash
cd /path/to/preqstation-skill
claude --plugin-dir /path/to/preqstation-skill
```

## 3. Use plugin-provided commands

After Claude Code starts with the plugin loaded, you can use:

- `/preqstation:setup`
- `/preqstation:status`
- `/preqstation:start-dispatch`

`/preqstation:setup` should verify PREQ MCP connectivity and manage local project mappings in `~/.preqstation-dispatch/projects.json`.

## 4. Configure PREQ MCP access

The plugin does not replace PREQ MCP setup.
You should still register the remote PREQ MCP endpoint:

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

Then complete the browser OAuth flow on first real use.

## 5. Channels note

The plugin can also be used as a Claude Channels source during local testing.

When testing a locally installed marketplace plugin, use:

```bash
export PREQSTATION_MCP_URL="https://<your-domain>/mcp"
claude --dangerously-skip-permissions --channels plugin:preqstation@preqstation
```

If Claude already has `preqstation` configured via `claude mcp add --transport http preqstation https://<your-domain>/mcp`, the dispatch channel will reuse that URL automatically and the export is optional.

The plugin now ships its own bundled MCP config, separate from the repo's direct development config. That means plugin testing and bare-server testing no longer need to share the same root `.mcp.json`.

If you want to see whether the installed plugin actually emitted and consumed a queued task, run the dispatcher session with a debug log:

```bash
claude --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --channels plugin:preqstation@preqstation
```

Then inspect:

```bash
tail -f /tmp/preqstation-dispatch-debug.log
```

## Current limitation

This plugin now includes the experimental Claude dispatch runtime, but it still does not replace every production behavior from `preqstation-openclaw`.

Today it is useful for:

- local plugin development
- local plugin discovery through `--plugin-dir`
- packaging the worker-side `preqstation` skill for Claude Code
- hosting the experimental local dispatch channel runtime, launcher tool, and docs

For the current production OpenClaw dispatcher path, see [docs/migrate-openclaw.md](migrate-openclaw.md).
