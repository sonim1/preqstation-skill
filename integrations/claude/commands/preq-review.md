---
description: Run PREQSTATION review flow for a task in the current workspace
argument-hint: <TASK_ID>
---

Prepare the standard PREQSTATION prompt file for objective `review` in the current workspace.

!`test -n "$ARGUMENTS" || { echo "Usage: /preq-review <TASK_ID>" >&2; exit 1; }; node "__PREQSTATION_CLI_PATH__" review "$ARGUMENTS" --engine claude-code --cwd "$PWD" --write-prompt-only`

Then read @.preqstation-prompt.txt and execute it exactly.
Prefer MCP `preq_*` tools and the installed `preqstation` skill instructions when they are available.
Run verification and stop after `preq_review_task`.
