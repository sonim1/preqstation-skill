---
description: "Help install PREQSTATION for the current runtime"
---

Help the user set up PREQSTATION in the current environment.

Use the matching documentation path:

- Claude plugin: `docs/install-claude-plugin.md`
- Claude Code worker: `docs/install-claude-code.md`
- Codex or Gemini CLI worker: `docs/install-codex-gemini.md`
- Shell helper fallback: `docs/install-shell-helper.md`
- Existing OpenClaw users: `docs/migrate-openclaw.md`

Rules:

- Ask only for the information needed to complete the selected setup.
- Prefer remote PREQ `/mcp` with OAuth over shell helper mode.
- Do not claim that Claude dispatch has already migrated into this repository.
- If the user wants the current production OpenClaw dispatcher, direct them to the migration guidance and explain that `preqstation-openclaw` is still the active dispatcher today.
