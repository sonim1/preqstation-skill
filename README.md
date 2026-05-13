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

## Quick Start

Claude Code plugin users:

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
```

Then start Claude and run:

```text
/preqstation:setup
```

`/preqstation:setup` can add or verify the user-scoped `preqstation` MCP registration for you. The canonical Claude MCP command is:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

Codex and Gemini users can install the worker skill and register the remote PREQ MCP server; see [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Documentation

- [Installation](docs/INSTALLATION.md) — setup chooser, prerequisites, quick starts, and update paths
- [MCP Surfaces](docs/MCP_SURFACES.md) — remote PREQ MCP server contract
- [Canonical Claude Commands](docs/CANONICAL_CLAUDE_COMMANDS.md) — install/update command snippets
- [Authentication](docs/AUTHENTICATION.md) — OAuth behavior and duplicate MCP entry guidance
- [Release Model](docs/RELEASE_MODEL.md) — marketplace source and update contract
- [Contributing](CONTRIBUTING.md)
- [Artifact Publishing](docs/artifact-publishing.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [OpenClaw migration status](docs/migrate-openclaw.md)
