# Install for Claude Code

Use this path when Claude Code is the worker that will execute PREQ tasks.

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
- This repository is the worker-side setup for Claude Code today.
- If you want to load this repository as a local Claude plugin, see [docs/install-claude-plugin.md](install-claude-plugin.md).
- The Claude Channels dispatcher migration into this repository is planned, but not yet the default production path.
