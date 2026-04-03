# Install for Codex or Gemini CLI

Use this path when Codex or Gemini CLI will execute PREQ tasks as the worker.

Codex is supported on the worker + remote MCP path.
Gemini CLI support is partial and depends on whether your Gemini environment supports remote PREQ MCP.

## Codex

### 1. Install the skill

```bash
npx skills add sonim1/preqstation-skill -g -a codex
```

### 2. Register the PREQ MCP server

```bash
codex mcp add preqstation --url https://<your-domain>/mcp
```

### 3. Complete OAuth

Codex often probes the MCP server during `mcp add`, so browser login may start immediately.

## Gemini CLI

### 1. Install the skill

```bash
npx skills add sonim1/preqstation-skill -g -a gemini-cli
```

### 2. Configure MCP only if your Gemini setup supports remote PREQ MCP

This repository keeps the PREQ worker skill instructions here, but MCP registration details may depend on your Gemini CLI environment and how that runtime handles remote MCP servers.
If your Gemini environment does not support remote PREQ MCP, use the shell helper fallback instead of treating this as a fully supported path.

Use the same PREQ endpoint:

```text
https://<your-domain>/mcp
```

## Engine Mapping

PREQ task `engine` values must match the worker:

- Claude Code -> `claude-code`
- Codex -> `codex`
- Gemini CLI -> `gemini-cli`

## Notes

- Install the skill only on the runtimes that should own PREQ execution.
- Prefer MCP mode when available.
- If remote MCP is not available in your Gemini environment, use the shell helper fallback instead.
- Codex does not need a Claude-style dispatch server here. Keep using the worker + MCP flow unless you are explicitly testing Claude Code dispatch.
