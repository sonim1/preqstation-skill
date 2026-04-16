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

## What changed here

This repository no longer ships a Claude-specific local dispatcher.

That means:

- do not expect Claude plugin updates here to start a background dispatcher
- do not replace your current `preqstation-openclaw` install with this repository
- keep treating OpenClaw dispatch as a separate setup today

## Planned direction

If the dispatcher merge ever lands, this document should be updated with:

- the replacement install path
- the replacement startup command
- how local project mappings move over
- how to verify that the new dispatcher is consuming the right queued tasks

Until then, treat this document as a hold marker rather than a migration checklist.
