# OpenClaw Migration Status

`preqstation-openclaw` is still the current production dispatcher for OpenClaw and Telegram-driven PREQ dispatch.

## Today

Use:

- `preqstation-skill` for worker-side PREQ skill and MCP setup
- `preqstation-openclaw` for the installed OpenClaw dispatcher

Stay on `preqstation-openclaw` today if you rely on:

- the production OpenClaw or Telegram ingress path
- a non-experimental dispatcher setup
- existing OpenClaw startup commands that are already deployed in your workflow

## Planned direction

The intended direction is to absorb the OpenClaw dispatcher into `preqstation-skill` so this repository becomes the main local PREQ client for:

- worker skill execution
- Claude plugin packaging
- Claude Channels dispatch
- shared PREQ `/mcp` OAuth client logic

## What this means right now

- Do not remove your current `preqstation-openclaw` install yet.
- New users should still treat OpenClaw dispatch as a separate setup today.
- This repository now contains an experimental dispatch channel runtime for local testing, but the full production migration is not complete yet.

Migration is only ready when this document is updated with:

- a replacement install path
- a replacement startup command
- a verified state migration path for local mappings and OAuth cache

## Migration guidance

When the dispatcher merge lands, this document should be updated to include:

- the new install path
- how to move project path mappings
- how to replace old OpenClaw startup commands
- how to verify that Claude Channels dispatch is consuming the right queued tasks

Until then, treat this document as a hold marker rather than a migration checklist.
