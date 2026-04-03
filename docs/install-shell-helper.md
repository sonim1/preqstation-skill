# Shell Helper Fallback

Use this only when MCP is unavailable.

Prefer the remote PREQ `/mcp` endpoint with OAuth whenever your agent supports it.

This mode assumes you have a local checkout of this repository because the helper lives in `scripts/preqstation-api.sh`.

```bash
git clone https://github.com/sonim1/preqstation-skill.git
cd preqstation-skill
```

## Environment variables

```bash
export PREQSTATION_API_URL="https://your-preqstation-domain.vercel.app"
export PREQSTATION_TOKEN="preq_xxxxxxxxxxxxxxxxx"
```

Optional fallback when client auto-detection is unavailable:

```bash
export PREQSTATION_ENGINE="codex" # claude-code | codex | gemini-cli
```

## Load the helper

```bash
source scripts/preqstation-api.sh
```

## Helper reference

See [docs/shell-helper-mode.md](shell-helper-mode.md) for function signatures and [docs/curl-examples.md](curl-examples.md) for direct REST examples.

## When to use this mode

Use shell helper mode only when:

- the runtime cannot reach the remote MCP server
- OAuth is unavailable in the current environment
- you need direct REST access for debugging or recovery
