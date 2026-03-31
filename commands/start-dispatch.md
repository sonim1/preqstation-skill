---
description: "Explain how to start the local PREQ dispatch channel"
---

Help the user start the experimental local PREQ dispatch runtime from this repository.

Required prerequisites:

- Claude Code is installed
- the user has a PREQ web app domain with `/mcp`
- `PREQSTATION_MCP_URL` is set in the shell environment

Recommended launch flow:

1. Confirm the user is inside this repository.
2. Confirm dependencies are installed with `npm install`.
3. Explain that `mcp-dev.json` defines `preq-dispatch-channel` for direct bare-server testing.
4. Tell them to export `PREQSTATION_MCP_URL=https://<your-domain>/mcp`.
5. Start Claude Code with:
   `claude --mcp-config /absolute/path/to/mcp-dev.json --dangerously-load-development-channels server:preq-dispatch-channel`

Note that this runtime now emits queued PREQ channel events and exposes the `dispatch_task` launcher tool inside the same channel server.

Be explicit that this is still the experimental dispatch runtime in this repository, not the final production migration.
