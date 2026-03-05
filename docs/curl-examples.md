# PREQSTATION API — curl Examples

Reference for direct REST API usage when MCP and shell helpers are unavailable.

All requests require: `Authorization: Bearer $PREQSTATION_TOKEN`

## List Todo Tasks

```bash
curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  "$PREQSTATION_API_URL/api/tasks?status=todo&engine=claude" | jq .
```

## Fetch Task Detail

```bash
curl -s -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Create Task

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

## Plan Task (inbox → todo)

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"todo",
    "engine":"claude",
    "description":"## Plan\n\n1. Add middleware...\n2. Write tests..."
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Mark In Progress

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","engine":"claude"}' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Update Status Only

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","engine":"claude"}' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID/status" | jq .
```

## Submit In Review Result

Before submitting, verify the feature branch exists on origin:
```bash
git ls-remote --heads origin "$BRANCH_NAME"
# If empty, push failed — do NOT proceed
```

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"review",
    "engine":"claude",
    "branch":"<branch_name>",
    "result":{
      "summary":"Implemented rate limiting for login endpoint",
      "engine":"claude",
      "branch":"<branch_name>",
      "pr_url":"https://github.com/org/repo/pull/123",
      "tests":"npm run test",
      "completed_at":"2025-02-24T12:00:00Z"
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Review Task

Runs verification steps (E2E tests, unit tests, build, lint) against the completed work.
On all checks passing, moves the task status from `review` to `done`.
On failure, moves the task status to `blocked` with failure details.

```bash
# On success, move to done
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"done",
    "engine":"claude",
    "result":{
      "summary":"All checks passed: tests, build, lint",
      "engine":"claude",
      "verified_at":"2025-02-24T12:30:00Z",
      "checks":{
        "tests":"pass",
        "build":"pass",
        "lint":"pass"
      }
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .

# On failure, block with details
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"blocked",
    "engine":"claude",
    "result":{
      "reason":"Unit tests failed: 3 failures in auth.test.js",
      "engine":"claude",
      "blocked_at":"2025-02-24T12:30:00Z",
      "checks":{
        "tests":"fail",
        "build":"pass",
        "lint":"pass"
      }
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```

## Block Task

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $PREQSTATION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"blocked",
    "engine":"claude",
    "result":{
      "reason":"Missing required Redis environment variables",
      "engine":"claude",
      "blocked_at":"2025-02-24T12:00:00Z"
    }
  }' \
  "$PREQSTATION_API_URL/api/tasks/$TASK_ID" | jq .
```
