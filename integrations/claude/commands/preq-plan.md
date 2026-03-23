---
description: Run PREQSTATION planning flow for a task in the current workspace
argument-hint: <TASK_ID>
---

Prepare the standard PREQSTATION prompt file for objective `plan` in the current workspace.

!`test -n "$ARGUMENTS" || { echo "Usage: /preq-plan <TASK_ID>" >&2; exit 1; }; node "__PREQSTATION_CLI_PATH__" plan "$ARGUMENTS" --engine claude-code --cwd "$PWD" --write-prompt-only`

Then read @.preqstation-prompt.txt and execute it exactly.
Prefer MCP `preq_*` tools and the installed `preqstation` skill instructions when they are available.
Do not ask the user to restate the task if `preq_get_task` is available.
Keep this run non-interactive and stop after `preq_plan_task`.
