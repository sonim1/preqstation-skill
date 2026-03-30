# Install as a Local Claude Plugin

Use this path when you want Claude Code to load this repository as a local plugin.

Do not use this path for Codex or Gemini CLI. Their PREQ setup stays on the worker + remote MCP path only.

## What this gives you today

- plugin metadata through `.claude-plugin/plugin.json`
- the `preqstation` worker skill under `skills/preqstation/SKILL.md`
- helper commands under `commands/`

This is currently a local plugin skeleton for development and early testing.

## 1. Load the plugin from the repository

```bash
cd /path/to/preqstation-skill
claude --plugin-dir /path/to/preqstation-skill
```

## 2. Use plugin-provided commands

After Claude Code starts with the plugin loaded, you can use:

- `/preqstation:setup`
- `/preqstation:status`
- `/preqstation:start-dispatch`

## 3. Configure PREQ MCP access

The plugin skeleton does not replace PREQ MCP setup.
You should still register the remote PREQ MCP endpoint:

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

Then complete the browser OAuth flow on first real use.

## Current limitation

This plugin skeleton does not yet include the production Claude dispatch runtime from `preqstation-openclaw`.

Today it is useful for:

- local plugin development
- local plugin discovery through `--plugin-dir`
- packaging the worker-side `preqstation` skill for Claude Code
- hosting the experimental local dispatch channel files and docs

For the current production OpenClaw dispatcher path, see [docs/migrate-openclaw.md](migrate-openclaw.md).
