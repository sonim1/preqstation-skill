---
description: "Explain how to start the local PREQ dispatch channel"
---

Help the user start the experimental local PREQ dispatch runtime from this repository.

Required prerequisites:

- Claude Code is installed
- the user has a PREQ web app domain with `/mcp`
- Claude already has the remote `preqstation` MCP server configured, or `PREQSTATION_MCP_URL` is set as an override

Recommended launch flow:

1. Confirm the user is inside this repository.
2. Confirm dependencies are installed with `npm install`.
3. Be explicit that `/preqstation:start-dispatch` is only a helper and the real dispatch entrypoint is a terminal command.
4. If the plugin is already installed, tell them to start Claude Code with:
   `claude --dangerously-skip-permissions --channels plugin:preqstation@preqstation --dangerously-load-development-channels plugin:preqstation@preqstation`
5. If they want direct repo development mode instead, explain that `mcp-dev.json` defines `preq-dispatch-channel` for bare-server testing and tell them to export `PREQSTATION_SKILL_ROOT=/absolute/path/to/preqstation-skill`.
6. Then start Claude Code with:
   `claude --mcp-config /absolute/path/to/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel`

Note that this runtime now emits queued PREQ channel events and exposes the `dispatch_task` launcher tool inside the same channel server.

Be explicit that this is still the experimental dispatch runtime in this repository, not the final production migration.
