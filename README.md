<p align="center">
  <a href="https://preqstation.com">
    <img src="https://raw.githubusercontent.com/sonim1/preqstation-landingpage/main/apps/landing/public/brand/logo.webp" alt="PreqStation" width="96" />
  </a>
</p>

<h1 align="center">PreqStation Worker Skill</h1>

<p align="center">
  <strong>Worker/runtime integration for Claude Code, Codex, and Gemini via PREQ MCP.</strong>
</p>

<p align="center">
  <a href="https://preqstation.com">Website</a> ·
  <a href="https://preqstation.com/guide">Guide</a> ·
  <a href="https://github.com/sonim1/preqstation">Core App</a> ·
  <a href="https://github.com/sonim1/preqstation-dispatcher">PREQ CLI</a> ·
  <a href="https://github.com/sonim1/preqstation-skill">Worker Skill</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg" /></a>
</p>

---

## What this repo owns

`preqstation-skill` packages the worker-side PreqStation integration for coding agents. It helps Claude Code, Codex, and Gemini connect to the remote PREQ `/mcp` server, claim tasks, execute work, and report results back to the PreqStation core app.

This repository covers three surfaces:

- the core `preqstation` worker skill
- remote PREQ `/mcp` setup for Claude Code, Codex, and Gemini CLI
- a Claude Code plugin with setup/status/update/help commands

Operator-host setup and production dispatch live in the separate [`preqstation-dispatcher`](https://github.com/sonim1/preqstation-dispatcher) repository. This repository no longer ships a Claude-specific local dispatcher.

Important naming note:
- the durable public dispatcher repo name is `preqstation-dispatcher`
- some package, plugin, or config identifiers in older docs or runtimes may still mention `preqstation-openclaw`
- treat `preqstation-openclaw` as a technical legacy identifier unless a command explicitly requires it

## Support Status

- worker skill + remote PREQ MCP: stable for Claude Code and Codex
- Gemini CLI worker path: supported when the local Gemini CLI exposes remote HTTP MCP
- Claude plugin setup helpers: supported for Claude Code
- shell helper mode: fallback
- OpenClaw migration docs: legacy

## Choose Your Setup

- Claude Code plugin (recommended worker setup): [docs/install-claude-plugin.md](docs/install-claude-plugin.md)
- Claude Code worker-only mode: [docs/install-claude-code.md](docs/install-claude-code.md)
- Codex: [docs/install-codex-gemini.md](docs/install-codex-gemini.md)
- Gemini CLI: [docs/install-codex-gemini.md](docs/install-codex-gemini.md)
- Shell helper fallback: [docs/install-shell-helper.md](docs/install-shell-helper.md)

## Project Docs

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Artifact publishing: [docs/artifact-publishing.md](docs/artifact-publishing.md)
- Security: [SECURITY.md](SECURITY.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- License: [LICENSE](LICENSE)
- OpenClaw migration status: [docs/migrate-openclaw.md](docs/migrate-openclaw.md)

## Prerequisites

- Claude plugin users need the remote PREQ MCP server, but `/preqstation:setup` can add or verify it for you

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |

## Quick Start

### Claude Code

Install the plugin:

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
```

The plugin already includes the packaged `preqstation` skill for Claude Code, so you do not need a separate `npx skills add ... -a claude-code` install unless you intentionally want worker-only mode without the plugin helpers.

Then start Claude and run:

```text
/preqstation:setup
```

`/preqstation:setup` can add or verify the user-scoped `preqstation` MCP connection, fetch projects when `preq_list_projects` is available, lets you choose auto-scan or manual mapping, and saves repo mappings in `~/.preqstation-dispatch/projects.json`.

If you prefer to register the PREQ MCP server yourself first, use:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

Useful plugin helper commands:

- `/preqstation:setup` to configure or refresh project path mappings
- `/preqstation:update` to see the current plugin update command
- `/preqstation:help` to see the available Claude plugin, worker-only, and OpenClaw paths

For worker-only Claude Code mode without the plugin helpers, use [docs/install-claude-code.md](docs/install-claude-code.md).

### Codex

```bash
npx skills add sonim1/preqstation-skill -g -a codex
codex mcp add preqstation --url https://<your-domain>/mcp
```

Codex uses the worker + remote MCP path only. It does not use the Claude plugin.

### Gemini CLI

```bash
npx skills add sonim1/preqstation-skill -g -a gemini-cli
gemini mcp add --scope user --transport http preqstation https://<your-domain>/mcp
gemini mcp list
```

If `gemini mcp list` shows `preqstation` as `Disconnected`, finish OAuth inside an interactive Gemini session:

```text
/mcp auth preqstation
```

Gemini CLI uses the same worker + remote MCP path when the local CLI exposes remote HTTP MCP. If it does not, fall back to the shell helper path.

## Update Existing Install

If PREQSTATION already works in one of your runtimes and you only want the latest skill or plugin changes, use the matching update path below.

### Claude Code Plugin

```bash
claude plugin marketplace update preqstation
claude plugin update preqstation@preqstation
claude plugin list
```

Then open Claude and refresh setup if needed:

```text
/preqstation:setup
```

This is the recommended Claude Code path. The plugin already bundles the `preqstation` worker skill, so you do not need a separate `npx skills add ... -a claude-code` step unless you intentionally use worker-only mode.

### Claude Code Worker-Only Mode

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
claude mcp list
```

If the PREQ MCP server is missing, add it again:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

### Codex

```bash
npx skills add sonim1/preqstation-skill -g -a codex
codex mcp list
```

If the PREQ MCP server is missing, add it again:

```bash
codex mcp add preqstation --url https://<your-domain>/mcp
```

### OpenClaw

OpenClaw production dispatch currently lives in the separate `preqstation-dispatcher` repository.

If you use that path, update the linked plugin there:

```bash
openclaw plugins install --link --dangerously-force-unsafe-install /Users/kendrick/projects/preqstation-dispatcher
openclaw gateway restart
openclaw plugins inspect preqstation-dispatcher
```

After the restart, refresh project mappings if needed with the copied `/preqsetup auto ...` command from Projects or run `/preqsetup status` in OpenClaw to verify mappings.

## Canonical Claude Commands

Install:

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
```

Update:

```bash
claude plugin marketplace update preqstation
claude plugin update preqstation@preqstation
```

## Authentication

OAuth starts when the client first makes a real request to `/mcp`.

- Codex often starts login during `mcp add` because it probes the server immediately.
- Claude Code usually stores the server first and starts OAuth on first real use.
- If Claude keeps asking you to authenticate `preqstation` after restarts, check for multiple local or project-scoped `preqstation` entries and prefer a single user-scoped registration.

## Release Model

The GitHub marketplace source currently tracks rolling Git source from `main`. Plugin updates pull the current repository state from that source.

This repository does not publish a separate stable plugin channel yet. Use [docs/install-claude-plugin.md](docs/install-claude-plugin.md) for the current install and update contract.
