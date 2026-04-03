# Install for Claude Code (Worker-Only Mode)

Use this path only when you want Claude Code to run the `preqstation` worker skill without the Claude plugin helpers.
Most Claude Code users should use [install-claude-plugin.md](install-claude-plugin.md) instead.

## 1. Install the skill

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
```

This installs the core `preqstation` worker skill for Claude Code only.

## 2. Register the PREQ MCP server

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

Replace `<your-domain>` with your PREQ web app domain.

## 3. Complete OAuth

OAuth usually starts the first time Claude Code makes a real request to the PREQ MCP server.

Common triggers:

- the first PREQ task run that uses MCP tools
- `claude mcp get preqstation`

If Claude Code shows `Needs authentication`, that is expected before the first real connection.

## 4. Verify

You should be able to:

- see `preqstation` in `claude mcp list`
- use the `preqstation` skill in Claude Code
- complete the browser login flow when prompted

## Notes

- Prefer MCP mode over shell helper mode.
- This path does not include `/preqstation:setup`, `/preqstation:status`, or the experimental Claude dispatch runtime.
- If you want the recommended Claude Code plugin experience, use [install-claude-plugin.md](install-claude-plugin.md).
- The Claude Channels dispatcher migration into this repository is planned, but not yet the default production path.
