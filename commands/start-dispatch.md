---
description: "Explain how to start the local PREQ dispatch channel"
---

Help the user start the experimental local PREQ dispatch runtime from this repository.

Required prerequisites:

- Claude Code is installed
- the user has a PREQ web app domain with `/mcp`
- Claude already has the remote `preqstation` MCP server configured, or `PREQSTATION_MCP_URL` is set as an override

Recommended launch flow:

1. Be explicit that `/preqstation:start-dispatch` is only a helper and the real dispatch entrypoint is a terminal command.
2. Prefer installed plugin mode for end users. Tell them to start Claude Code with:
   `claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation`
3. If PREQ MCP URL discovery fails, give the explicit override form:
   `PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation`

Note that this runtime now emits queued PREQ channel events and exposes the `dispatch_task` launcher tool inside the same channel server.

During the Claude Channels research preview, do not combine the plugin launch command above with
`--channels plugin:preqstation@preqstation`. The development-flag bypass is per entry, and the
official Claude docs say the bypass does not extend to `--channels` entries.

Be explicit that this is still the experimental dispatch runtime in this repository, not the final production migration.
