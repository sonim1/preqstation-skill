# preqstation-skill

PREQSTATION agent package with both:

- Skill instructions for direct REST usage
- MCP plugin server for Codex/Claude Code

## Install Skill (optional)

```bash
npx skills add sonim1/preqstation-skill -g
```

Platform-specific:

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
npx skills add sonim1/preqstation-skill -g -a codex
```

## Required Environment Variables

```bash
export PREQSTATION_API_URL="https://your-preqstation-domain.vercel.app"
export PREQSTATION_TOKEN="preq_xxxxxxxxxxxxxxxxx"
```

## MCP Plugin Setup (Codex / Claude Code)

Add an MCP server entry that launches:

```bash
node /ABSOLUTE/PATH/TO/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

Example MCP server config:

```json
{
  "mcpServers": {
    "preqstation": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/preqstation-skill/scripts/preqstation-mcp-server.mjs"],
      "env": {
        "PREQSTATION_API_URL": "https://your-preqstation-domain.vercel.app",
        "PREQSTATION_TOKEN": "preq_xxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Exposed MCP Tools

- `preq_list_tasks`: todo/in_progress/review/done/blocked filter (`projectKey` optional)
- `preq_get_task`: fetch single ticket detail by ticket number
- `preq_plan_task`: improve an existing task with generated plan markdown and request `todo` status in a specific project key
- `preq_create_task`: create a new task in Inbox (internal status) via `/api/tasks`
- `preq_start_task`: move ticket to `in_progress`
- `preq_complete_task`: upload result payload and mark `review` (In Review)
- `preq_block_task`: mark `blocked` with reason

`preq_complete_task` writes `result` to PREQSTATION API, and PREQSTATION stores it in work logs so execution results can be verified in the app.
`preq_create_task` omits `status` on create so the server stores it as internal `inbox` (API task view may appear as `todo` due mapping).
`preq_plan_task` is intended for the Inbox -> Todo planning workflow: user drops short card in Inbox, agent builds plan from local code context, then updates the existing task with that plan and requests `todo`.

## Files

- `SKILL.md`: main skill instructions
- `scripts/preqstation-api.sh`: shell helper wrappers for task APIs
- `scripts/preqstation-mcp-server.mjs`: MCP stdio server for Codex/Claude Code

## Claude Code MCP Add Command

Register PREQSTATION MCP server with env vars:

```bash
claude mcp add -s user \
  --env='PREQSTATION_API_URL=https://<your-domain>' \
  --env='PREQSTATION_TOKEN=preq_xxxxx' \
  preqstation -- \
  node /Users/kendrick/projects/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

If already registered, remove and re-add:

```bash
claude mcp remove -s user preqstation
```

Check registration:

```bash
claude mcp list
claude mcp get preqstation
```

## Codex MCP Add Command

Register PREQSTATION MCP server with env vars:

```bash
codex mcp add preqstation \
  --env='PREQSTATION_API_URL=https://<your-domain>' \
  --env='PREQSTATION_TOKEN=preq_xxxxx' \
  -- node /Users/kendrick/projects/preqstation-skill/scripts/preqstation-mcp-server.mjs
```

If already registered, remove and re-add:

```bash
codex mcp remove preqstation
```

Check registration:

```bash
codex mcp list
codex mcp get preqstation
```
