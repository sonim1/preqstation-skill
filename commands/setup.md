---
description: "Help install PREQSTATION for the current runtime"
---

Help the user set up PREQSTATION in the current environment.

Use the matching documentation path:

- Claude plugin: `docs/install-claude-plugin.md`
- Claude Code worker: `docs/install-claude-code.md`
- Codex or Gemini CLI worker: `docs/install-codex-gemini.md`
- Shell helper fallback: `docs/install-shell-helper.md`
- Existing OpenClaw users: `docs/migrate-openclaw.md`

Rules:

- Ask only for the information needed to complete the selected setup.
- Prefer remote PREQ `/mcp` with OAuth over shell helper mode.
- For Claude plugin or Claude dispatch setup, treat `~/.preqstation-dispatch/projects.json` as the canonical local project mapping store.
- Do not store project path mappings inside this repository, `.claude-plugin`, or `.claude/settings.local.json`.
- Do not claim that Claude dispatch has already migrated into this repository.
- If the user wants the current production OpenClaw dispatcher, direct them to the migration guidance and explain that `preqstation-openclaw` is still the active dispatcher today.

If the user wants Claude plugin setup for local dispatch work:

1. Confirm or configure the Claude `preqstation` MCP server first.
   - Preferred path: `claude mcp add --transport http preqstation https://<your-domain>/mcp`
   - Reuse an existing Claude MCP config when already present.
2. Explain where local project mappings are stored:
   - `~/.preqstation-dispatch/projects.json`
   - JSON shape: `{ "projects": { "PROJ": "/absolute/path/to/repo" } }`
3. Prefer fetching PREQ projects with `preq_list_projects`.
4. Ask the user which mapping mode they want:
   - auto scan local repos by `repoUrl`
   - manually choose paths per project
5. In auto-scan mode:
   - inspect local repos under `PREQSTATION_REPO_ROOTS` when set
   - otherwise default to `~/projects`
   - match local git remotes against PREQ project `repoUrl`
   - save successful matches and ask only about any unmatched projects
6. In manual mode:
   - list PREQ projects
   - collect absolute local repo paths only for the projects the user wants mapped
   - save them into `~/.preqstation-dispatch/projects.json`
7. If `preq_list_projects` is unavailable, explain that the connected PREQ service is missing project-list support and fall back to manual project-key mapping only if the user still wants to continue.
