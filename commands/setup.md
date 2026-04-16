---
description: "Configure PREQSTATION project path mappings for the current environment"
---

Help the user configure local PREQ project path mappings in the current environment.

Default to local project path mapping.
Do not start by asking the user to choose between setup paths when they run `/preqstation:setup` with no extra qualifier or when they ask for path setup.

Rules:

- Treat `/preqstation:setup` as the path-mapping entrypoint for the current runtime, not a generic installation chooser.
- Ask only for the information needed to complete project mapping in the current environment.
- Prefer remote PREQ `/mcp` with OAuth over shell helper mode.
- For Claude Code, prefer the plugin install path unless the user explicitly wants worker-only mode without plugin helpers.
- Treat `~/.preqstation-dispatch/projects.json` as the canonical local project mapping store for current local PREQ tooling.
- Do not store project path mappings inside this repository, `.claude-plugin`, or `.claude/settings.local.json`.
- If the user wants the current production OpenClaw dispatcher, direct them to the migration guidance and explain that `preqstation-openclaw` is still the active dispatcher today.
- Only redirect into other install docs when the user explicitly asks for installation help or when required prerequisites are clearly missing.
- Even if mappings already exist, allow the user to refresh or replace them. Treat `/preqstation:setup` as rerunnable update flow, not one-time bootstrap.

Default flow:

1. Assume the user wants to configure local repo paths for PREQ projects in this environment.
2. Confirm or configure the runtime MCP prerequisite only if needed.
   - For Claude Code, prefer a single user-scoped PREQ MCP registration to avoid duplicate local or project entries.
   - Claude preferred path: `claude mcp add -s user --transport http preqstation https://<your-domain>/mcp`
   - Reuse an existing MCP config when already present.
   - If `preqstation` is missing, ask only for the PREQ domain you need and then run the add command.
   - If the user reports repeated `preqstation` auth prompts and multiple local or project-scoped `preqstation` entries exist, explain that duplicate scope is a likely cause and prefer consolidating to one user-scoped registration.
3. Explain where local project mappings are stored:
   - `~/.preqstation-dispatch/projects.json`
   - JSON shape: `{ "projects": { "PROJ": "/absolute/path/to/repo" } }`
4. Prefer fetching PREQ projects with `preq_list_projects`.
5. If existing mappings are present, show the current saved paths briefly and ask whether to rescan, replace selected entries, or keep the unchanged ones.
6. Ask only about mapping mode:
   - auto scan local repos by `repoUrl`
   - manually choose paths per project
7. In auto-scan mode:
   - inspect local repos under `PREQSTATION_REPO_ROOTS` when set
   - otherwise default to `~/projects`
   - match local git remotes against PREQ project `repoUrl`
   - update existing matches when they changed, not only missing ones
   - save successful matches and ask only about any unmatched projects
8. In manual mode:
   - list PREQ projects
   - collect absolute local repo paths only for the projects the user wants mapped
   - overwrite or refresh the chosen entries in `~/.preqstation-dispatch/projects.json`
9. If `preq_list_projects` is unavailable, explain that the connected PREQ service is missing project-list support and fall back to manual project-key mapping only if the user still wants to continue.

Explicit install-help redirects:

- Claude Code plugin install: `docs/install-claude-plugin.md`
- Claude Code worker-only install: `docs/install-claude-code.md`
- Codex or Gemini worker install: `docs/install-codex-gemini.md`
- Shell helper fallback: `docs/install-shell-helper.md`
- OpenClaw migration: `docs/migrate-openclaw.md`
