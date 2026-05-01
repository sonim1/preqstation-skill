# Install for Codex or Gemini CLI

Use this path when Codex or Gemini CLI will execute PREQ tasks as the worker.

Codex is supported on the worker + remote MCP path.
Gemini CLI works on the same worker + remote MCP path when your installed Gemini CLI supports remote HTTP MCP.

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

### 2. Register the PREQ MCP server

```bash
gemini mcp add --scope user --transport http preqstation https://<your-domain>/mcp
```

### 3. Verify the MCP registration

```bash
gemini mcp list
```

If the list still shows `preqstation` as `Disconnected`, open Gemini and complete OAuth there:

```text
/mcp auth preqstation
```

### 4. Run Gemini

```bash
gemini
# or
gemini -p "Read and execute the PREQSTATION task instructions from this workspace."
```

## Engine Mapping

PREQ task `engine` values must match the worker:

- Claude Code -> `claude-code`
- Codex -> `codex`
- Gemini CLI -> `gemini-cli`

## Notes

- Install the skill only on the runtimes that should own PREQ execution.
- Prefer MCP mode when available.
- Gemini CLI may require a separate in-session `/mcp auth preqstation` step even after `gemini mcp add ...`.
- If your installed Gemini CLI does not expose remote HTTP MCP, use the shell helper fallback instead.
- Codex and Gemini CLI do not need a Claude-style dispatch server here. Keep using the worker + MCP flow unless you are explicitly testing Claude Code dispatch.
