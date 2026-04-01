# Shell Helper Mode

Use this only when MCP is unavailable. Prefer MCP tools whenever possible.

Source `scripts/preqstation-api.sh`, then use these helpers:

| Function | Signature |
| --- | --- |
| `preq_list_projects` | `preq_list_projects` |
| `preq_get_tasks` | `preq_get_tasks [status] [label]` |
| `preq_get_task` | `preq_get_task <task_id>` |
| `preq_get_project_settings` | `preq_get_project_settings <project_key>` |
| `preq_update_qa_run` | `preq_update_qa_run <run_id> [status] [target_url] [report_markdown] [summary_json]` |
| `preq_create_task` | `preq_create_task '<json_payload>'` |
| `preq_patch_task` | `preq_patch_task <task_id> '<json_payload>'` |
| `preq_start_task` | `preq_start_task <task_id> [engine]` |
| `preq_update_task_status` | `preq_update_task_status <task_id> <status> [engine]` |
| `preq_plan_task` | `preq_plan_task <task_id> <plan_markdown> [engine]` |
| `preq_complete_task` | `preq_complete_task <task_id> <summary> [engine] [pr_url] [tests] [notes] [branch_name]` |
| `preq_review_task` | `preq_review_task <task_id> [engine] [test_cmd] [build_cmd] [lint_cmd]` |
| `preq_block_task` | `preq_block_task <task_id> <reason> [engine]` |
| `preq_delete_task` | `preq_delete_task <task_id>` |
| `preq_resolve_branch_name` | `preq_resolve_branch_name <task_id> [fallback_branch]` |

Notes:

- `preq_plan_task`, `preq_complete_task`, `preq_review_task`, and `preq_block_task` require `jq`.
- `preq_update_qa_run` also requires `jq` for payload construction.
- For curl payload examples, see `docs/curl-examples.md`.
