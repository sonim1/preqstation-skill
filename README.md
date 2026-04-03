# preqstation-skill

PREQSTATION worker skill, Claude plugin, and local Claude dispatch runtime.

This repository currently covers four surfaces:

- the core `preqstation` worker skill
- remote PREQ `/mcp` setup for Claude Code, Codex, and Gemini CLI
- a Claude plugin with setup/status helpers
- an experimental Claude-only dispatch channel runtime

For existing OpenClaw users, the current production dispatcher still lives in `preqstation-openclaw`. Keep using that path until the migration guide says otherwise: [docs/migrate-openclaw.md](docs/migrate-openclaw.md).

## Support Status

- worker skill + remote PREQ MCP: stable
- Claude plugin setup helpers: supported for Claude Code
- Claude dispatch channel: experimental
- shell helper mode: fallback
- OpenClaw migration docs: legacy

## Choose Your Setup

- Claude plugin: [docs/install-claude-plugin.md](docs/install-claude-plugin.md)
- Claude Code worker: [docs/install-claude-code.md](docs/install-claude-code.md)
- Codex or Gemini CLI worker: [docs/install-codex-gemini.md](docs/install-codex-gemini.md)
- Experimental Claude dispatch channel: [docs/install-dispatch-channel.md](docs/install-dispatch-channel.md)
- Shell helper fallback: [docs/install-shell-helper.md](docs/install-shell-helper.md)

## Project Docs

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security: [SECURITY.md](SECURITY.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- License: [LICENSE](LICENSE)

## Prerequisites

- Claude plugin and dispatch runtime users need a local `node` binary on PATH
- Claude plugin users still register the remote PREQ MCP server separately

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |
| `preq-dispatch-channel` | local stdio MCP | experimental Claude-only dispatch runtime bundled by the plugin | optional |

## Quick Start

### Claude Code

Install the worker skill:

```bash
npx skills add sonim1/preqstation-skill -g -a claude-code
```

Install the plugin:

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
```

Register the remote PREQ MCP server:

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

Then start Claude and run:

```text
/preqstation:setup
```

`/preqstation:setup` verifies the `preqstation` MCP connection, fetches projects when `preq_list_projects` is available, lets you choose auto-scan or manual mapping, and saves repo mappings in `~/.preqstation-dispatch/projects.json`.

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

Gemini CLI uses the worker + remote MCP path only.

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

Start the experimental Claude dispatch runtime:

```bash
claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
```

Debug the dispatch runtime:

```bash
PREQSTATION_DEBUG_QUEUE=1 claude --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
```

During the current Claude Channels research preview, do not add `--channels plugin:preqstation@preqstation` to the dispatch runtime command above.

## Authentication

OAuth starts when the client first makes a real request to `/mcp`.

- Codex often starts login during `mcp add` because it probes the server immediately.
- Claude Code usually stores the server first and starts OAuth on first real use.
- The local dispatch runtime keeps its own OAuth cache in `~/.preqstation-dispatch/oauth.json` and opens the PREQ OAuth page in your browser automatically when it needs a dispatch-specific token.
- If the dispatcher cannot resolve the PREQ MCP URL from Claude config, start it with an explicit override such as `PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation`.

## Release Model

The GitHub marketplace source currently tracks rolling Git source from `main`. Plugin updates pull the current repository state from that source.

This repository does not publish a separate stable plugin channel yet. Use [docs/install-claude-plugin.md](docs/install-claude-plugin.md) for the current install and update contract, and [docs/install-dispatch-channel.md](docs/install-dispatch-channel.md) for the experimental dispatch runtime details.
