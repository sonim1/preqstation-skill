# Install as a Local Claude Plugin

Use this path when you want Claude Code to load this repository as a local plugin.

Do not use this path for Codex or Gemini CLI. Their PREQ setup stays on the worker + remote MCP path only.

## What this gives you today

- plugin metadata through `.claude-plugin/plugin.json`
- the `preqstation` worker skill under `skills/preqstation/SKILL.md`
- helper commands under `commands/`

This is currently a local plugin skeleton for development and early testing.

You have two valid local test modes:

- fastest development loop: `claude --plugin-dir /path/to/preqstation-skill`
- official install UX smoke test: local marketplace + `claude plugin install preqstation@preqstation-local`

## 1. Fastest local test: load the plugin from the repository

```bash
cd /path/to/preqstation-skill
claude --plugin-dir /path/to/preqstation-skill
```

## 2. Official install UX test: install from a local marketplace

Create a local marketplace that points at this repository:

```bash
mkdir -p /tmp/preqstation-local-marketplace/.claude-plugin
mkdir -p /tmp/preqstation-local-marketplace/plugins
ln -sfn /path/to/preqstation-skill /tmp/preqstation-local-marketplace/plugins/preqstation
cat > /tmp/preqstation-local-marketplace/.claude-plugin/marketplace.json <<'EOF'
{
  "name": "preqstation-local",
  "owner": {
    "name": "PREQSTATION"
  },
  "plugins": [
    {
      "name": "preqstation",
      "source": "./plugins/preqstation",
      "description": "PREQSTATION worker skill and Claude dispatch plugin"
    }
  ]
}
EOF
```

Validate and install:

```bash
claude plugin validate /tmp/preqstation-local-marketplace
claude plugin marketplace add /tmp/preqstation-local-marketplace
claude plugin install preqstation@preqstation-local
claude plugin list
```

## 3. Use plugin-provided commands

After Claude Code starts with the plugin loaded, you can use:

- `/preqstation:setup`
- `/preqstation:status`
- `/preqstation:start-dispatch`

## 4. Configure PREQ MCP access

The plugin skeleton does not replace PREQ MCP setup.
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
claude --channels plugin:preqstation@preqstation-local --dangerously-load-development-channels plugin:preqstation@preqstation-local
```

## Current limitation

This plugin skeleton does not yet include the production Claude dispatch runtime from `preqstation-openclaw`.

Today it is useful for:

- local plugin development
- local plugin discovery through `--plugin-dir`
- packaging the worker-side `preqstation` skill for Claude Code
- hosting the experimental local dispatch channel files and docs

For the current production OpenClaw dispatcher path, see [docs/migrate-openclaw.md](migrate-openclaw.md).
