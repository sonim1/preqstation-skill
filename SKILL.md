---
name: preqstation
description: >
  Fetch tasks from PREQSTATION, execute work, and push updates/results back to PREQSTATION APIs.
  Use when asked to run a PREQ task, fetch todo tasks, or update execution status.
  Requires PREQSTATION_API_URL and PREQSTATION_TOKEN environment variables.
  Tasks carry an `engine` field (`claude` | `codex` | `gemini`) indicating which AI agent should execute them.
---

## Environment

- `PREQSTATION_API_URL`: PREQSTATION API base URL (example: `https://mypreqstation.vercel.app`)
- `PREQSTATION_TOKEN`: PREQSTATION Bearer token (generated in PREQSTATION `/api-keys`)

## Agent Identity & Engine Mapping

Each agent must identify itself and use the corresponding `engine` value in all task operations (list, create, plan, etc.):

| If you are...        | Use `engine=` |
| -------------------- | ------------- |
| Claude (Anthropic)   | `claude`      |
| GPT / Codex (OpenAI) | `codex`       |
| Gemini (Google)      | `gemini`      |

Always include your `engine` value when listing or creating tasks.

## MCP Plugin Mode (Recommended)

If MCP is available, prefer `scripts/preqstation-mcp-server.mjs` tools:

- `preq_list_tasks` — always pass your `engine` value to filter tasks assigned to you
- `preq_get_task`
- `preq_plan_task`
- `preq_create_task` — pass `engine` to assign the executing agent
- `preq_start_task`
- `preq_complete_task`
- `preq_block_task`

This gives deterministic task-id based execution and result upload.

## List Todo Tasks

List todo tasks assigned to your engine:

```bash
# Replace ENGINE with your engine value (claude, codex, or gemini)
curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  "$PREQSTATION_API_URL/api/tasks?status=todo&engine=ENGINE" | jq .
```

## Fetch Task Detail

```bash
TASK_ID="<task-id>"
curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Recommended Execution Flow

1. Fetch the task detail from PREQSTATION (verify `engine` matches your identity).
2. Move status to `in_progress`.
3. Implement code changes according to acceptance criteria.
4. Run tests/verification.
5. Push `status=review` (In Review) and `result` back to PREQSTATION with the same ticket number.
6. Confirm result appears in PREQSTATION work logs.

`preq_complete_task` must be used only after the task is moved to `in_progress`.

## Inbox -> Todo Plan Flow

1. User adds short task card to Inbox (optionally specifying `engine`).
2. Agent loads candidate tasks with `preq_list_tasks` (use `projectKey` + `status=todo` + own `engine` filter).
3. Agent reads local source code and generates implementation plan with LLM.
4. Agent calls `preq_plan_task` with `projectKey`, `taskId`, `planMarkdown`, and optional `acceptanceCriteria`.
5. MCP uploads plan to task description and moves the card to `status=todo`.

## Create Task with Engine

```bash
curl -s -X POST \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Implement rate limiting",
    "engine":"claude",
    "projectKey":"MY_PROJECT"
  }' \
  "$PREQSTATION_API_URL/api/tasks" | jq .
```

## Mark In Progress

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Submit In Review Result

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"review",
    "result":{
      "summary":"Implemented rate limiting for login endpoint",
      "pr_url":"https://github.com/org/repo/pull/123",
      "tests":"npm run test"
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Blocked Update

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"blocked",
    "result":{
      "reason":"Missing required Redis environment variables"
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```
