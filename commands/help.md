---
description: "Explain the available PREQSTATION setup and runtime paths"
---

Help the user choose the right PREQSTATION path for the current environment.

Default to a short command-oriented overview instead of a long installation essay.

Explain the current helper commands first:

- `/preqstation:setup`: configure or refresh local project path mappings
- `/preqstation:status`: summarize what this repository currently supports
- `/preqstation:update`: show how to update the Claude plugin or the separate OpenClaw runtime

Then route by intent:

- Claude Code plugin setup:
  - use `docs/install-claude-plugin.md`
  - mention that this is the recommended Claude Code path
- Claude Code worker-only mode:
  - use `docs/install-claude-code.md`
- Codex or Gemini worker mode:
  - use `docs/install-codex-gemini.md`
- Experimental Claude dispatch runtime:
  - describe this as the `Hand off test` flow
  - show the real terminal command
  - preferred launch:
    `claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation`
  - if PREQ MCP URL discovery fails:
    `PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation`
  - point to `docs/install-dispatch-channel.md` for details
- Shell helper fallback:
  - use `docs/install-shell-helper.md`
- OpenClaw migration or production dispatcher questions:
  - use `docs/migrate-openclaw.md`

Rules:

- Do not present `/preqstation:help` as a replacement for the actual dispatch runtime entrypoint.
- Do not send users to `/preqstation:start-dispatch`; that helper no longer exists.
- Be explicit that OpenClaw production dispatch is still separate today.
