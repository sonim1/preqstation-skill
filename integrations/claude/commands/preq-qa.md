---
description: Run PREQSTATION branch-level QA flow for the current workspace
argument-hint: <PROJECT_KEY> --branch <name> --run-id <id>
---

Prepare the standard PREQSTATION prompt file for objective `qa` in the current workspace.

!`test -n "$ARGUMENTS" || { echo "Usage: /preq-qa <PROJECT_KEY> --branch <name> --run-id <id>" >&2; exit 1; }; node "__PREQSTATION_CLI_PATH__" qa $ARGUMENTS --engine claude-code --cwd "$PWD" --write-prompt-only`

Then read @.preqstation-prompt.txt and execute it exactly.
Prefer MCP `preq_*` tools and the installed `preqstation` skill instructions when they are available.
If the current agent has access to the `dogfood` skill, use it as the default QA workflow for browser testing and report generation.
Update the QA run through `preq_update_qa_run` instead of inventing task lifecycle transitions.
