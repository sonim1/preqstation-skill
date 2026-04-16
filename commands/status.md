---
description: "Summarize what this repository currently provides"
---

Explain the current scope of the `preqstation` local agent package.

Be explicit about the split between what is implemented today and what is still planned.

Current repository responsibilities:

- worker-side PREQ skill instructions
- remote PREQ `/mcp` setup guidance
- shell helper fallback
- Claude plugin setup helpers and marketplace install path

Current support status:

- worker skill + remote PREQ MCP: stable for Claude Code and Codex
- Gemini CLI worker path: partial and depends on Gemini remote MCP support
- Claude plugin setup helpers: supported for Claude Code
- shell helper mode: fallback
- OpenClaw migration docs: legacy

Still planned, not fully migrated here yet:

- the OpenClaw dispatcher merge from `preqstation-openclaw`

When relevant, point the user to:

- `README.md`
- `docs/install-claude-plugin.md`
- `commands/help.md`
- `commands/update.md`
- `docs/install-claude-code.md`
- `docs/migrate-openclaw.md`
