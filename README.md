# preqstation-skill

PREQSTATION worker skill, Claude plugin, and optional local Claude dispatch runtime source.

This repository currently covers four surfaces:

- the core `preqstation` worker skill
- remote PREQ `/mcp` setup for Claude Code and Codex, plus a partial Gemini CLI path
- a Claude plugin with setup/status helpers
- optional experimental Claude-only dispatch channel runtime source for Hand off tests

For existing OpenClaw users, the current production dispatcher still lives in `preqstation-openclaw`. Keep using that path until the migration guide says otherwise: [docs/migrate-openclaw.md](docs/migrate-openclaw.md). That guide also documents how OpenClaw dispatch and Claude Code dispatch compare after work completes.

## Support Status

- worker skill + remote PREQ MCP: stable for Claude Code and Codex
- Gemini CLI worker path: partial and depends on Gemini remote MCP support
- Claude plugin setup helpers: supported for Claude Code
- Claude dispatch channel: experimental, manual, and not auto-started by the default plugin
- shell helper mode: fallback
- OpenClaw migration docs: legacy

In this repository, a `Hand off test` means PREQ prepares an isolated auxiliary worktree on the requested branch and hands execution off to the target engine inside that worktree.

## Choose Your Setup

- Claude Code plugin (recommended): [docs/install-claude-plugin.md](docs/install-claude-plugin.md)
- Claude Code worker-only mode: [docs/install-claude-code.md](docs/install-claude-code.md)
- Codex: [docs/install-codex-gemini.md](docs/install-codex-gemini.md)
- Gemini CLI (partial): [docs/install-codex-gemini.md](docs/install-codex-gemini.md)
- Experimental Claude dispatch channel (manual): [docs/install-dispatch-channel.md](docs/install-dispatch-channel.md)
- Shell helper fallback: [docs/install-shell-helper.md](docs/install-shell-helper.md)

## Project Docs

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Artifact publishing: [docs/artifact-publishing.md](docs/artifact-publishing.md)
- Security: [SECURITY.md](SECURITY.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- License: [LICENSE](LICENSE)

## Prerequisites

- Manual dispatch runtime users need Node 18+ on PATH
- Claude plugin users need the remote PREQ MCP server, but `/preqstation:setup` can add or verify it for you

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |
| `preq-dispatch-channel` | local stdio MCP | experimental Claude-only dispatch runtime, manual only | optional |

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

`/preqstation:setup` can add or verify the user-scoped `preqstation` MCP connection, fetches projects when `preq_list_projects` is available, lets you choose auto-scan or manual mapping, and saves repo mappings in `~/.preqstation-dispatch/projects.json`.

If you prefer to register the PREQ MCP server yourself first, use:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

Useful plugin helper commands:

- `/preqstation:setup` to configure or refresh project path mappings
- `/preqstation:update` to see the current plugin update command
- `/preqstation:help` to see the available Claude plugin, dispatch, worker-only, and OpenClaw paths

For worker-only Claude Code mode without the plugin helpers, use [docs/install-claude-code.md](docs/install-claude-code.md).

### Codex

```bash
npx skills add sonim1/preqstation-skill -g -a codex
codex mcp add preqstation --url https://<your-domain>/mcp
```

Codex uses the worker + remote MCP path only. It does not use the Claude plugin or the Claude dispatch channel.

### Gemini CLI

```bash
npx skills add sonim1/preqstation-skill -g -a gemini-cli
```

Gemini CLI support is partial. Use it only if your Gemini environment already supports remote PREQ MCP, otherwise fall back to the shell helper path.

## Update Existing Install

If PREQSTATION already works in one of your runtimes and you only want the latest skill or plugin changes, use the matching update path below.

### Claude Code Plugin

```bash
claude plugin marketplace update preqstation
claude plugin update preqstation@preqstation
claude plugin list
```

Starting in `0.1.34`, the default Claude plugin no longer auto-registers the experimental dispatch watcher. If you previously ran the old watcher and still see repeated `preq_list_tasks` or `preq_list_dispatch_requests` logs, stop the stale local process once:

```bash
pkill -f preq-dispatch-channel-server.mjs
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

Codex stays on the worker + remote MCP path only. It does not use the Claude plugin or Claude dispatch channel.

### OpenClaw

OpenClaw dispatch currently lives in the separate `preqstation-openclaw` repository.

If you use that path, update the linked plugin there:

```bash
openclaw plugins install --link --dangerously-force-unsafe-install /Users/kendrick/projects/preqstation-openclaw
openclaw gateway restart
openclaw plugins inspect preqstation-openclaw
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

The public Claude plugin does not auto-start the experimental dispatch runtime. For production dispatch, use the separate OpenClaw path for now.

For contributor-only manual testing of the local Claude dispatch runtime:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

Debug the dispatch runtime:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
PREQSTATION_DEBUG_QUEUE=1 claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

During the current Claude Channels research preview, do not add `--channels plugin:preqstation@preqstation` to the dispatch runtime command above.

## Authentication

OAuth starts when the client first makes a real request to `/mcp`.

- Codex often starts login during `mcp add` because it probes the server immediately.
- Claude Code usually stores the server first and starts OAuth on first real use.
- If Claude keeps asking you to authenticate `preqstation` after restarts, check for multiple local or project-scoped `preqstation` entries and prefer a single user-scoped registration.
- The manual local dispatch runtime keeps its own OAuth cache in `~/.preqstation-dispatch/oauth.json` and opens the PREQ OAuth page in your browser automatically when it needs a dispatch-specific token.
- If the dispatcher cannot resolve the PREQ MCP URL from Claude config, start it with `PREQSTATION_MCP_URL=https://<your-domain>/mcp` in the environment.

## Release Model

The GitHub marketplace source currently tracks rolling Git source from `main`. Plugin updates pull the current repository state from that source.

This repository does not publish a separate stable plugin channel yet. Use [docs/install-claude-plugin.md](docs/install-claude-plugin.md) for the current install and update contract, and [docs/install-dispatch-channel.md](docs/install-dispatch-channel.md) for the experimental dispatch runtime details.
