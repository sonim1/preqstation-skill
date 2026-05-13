# MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task, project, and activity tools with OAuth-backed `/mcp` access | yes |

## Read-only project sync tools

- `preq_list_projects`: lists PREQ projects for setup and local repo mapping.
- `preq_list_tasks`: lists the current task board snapshot with status/project filters.
- `preq_list_project_activity`: lists task, comment, and work-log activity over an ISO date range. Use this for cron/sync consumers that need recent project changes without relying on status-limited board snapshots.

For recurring sync jobs, query with an overlapping window such as `from = last_successful_sync_at - 2h` or `from = now - 30h`, `to = now`, and deduplicate by event id.
