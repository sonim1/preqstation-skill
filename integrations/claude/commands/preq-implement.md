---
description: Run PREQSTATION implementation flow for a task in the current workspace
argument-hint: <TASK_ID>
---

Prepare the standard PREQSTATION prompt file for objective `implement` in the current workspace.

!`test -n "$ARGUMENTS" || { echo "Usage: /preq-implement <TASK_ID>" >&2; exit 1; }; node "__PREQSTATION_CLI_PATH__" implement "$ARGUMENTS" --engine claude-code --cwd "$PWD" --write-prompt-only`

Then read @.preqstation-prompt.txt and execute it exactly.
Prefer MCP `preq_*` tools and the installed `preqstation` skill instructions when they are available.
Call `preq_get_task` first, then `preq_start_task`, before substantive work when the task is active.
