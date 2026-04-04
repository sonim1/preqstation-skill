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

## Completion flow comparison

OpenClaw dispatch and Claude Code dispatch currently follow almost the same task-completion contract.

| Area | Claude Code dispatch in `preqstation-skill` | OpenClaw dispatch in `preqstation-openclaw` |
| --- | --- | --- |
| Task lifecycle | Uses the shared `preqstation` lifecycle skill for `preq_get_task`, `preq_start_task`, `preq_complete_task`, `preq_review_task`, and `preq_block_task`. | Uses the same `preqstation` lifecycle skill as the source of truth for task lifecycle and deploy handling. |
| Commit and push | Controlled by `deploy_strategy`, not by the dispatcher. `none` skips git, `direct_commit` merges into the primary checkout and pushes, `feature_branch` pushes the worktree branch and may open a PR. | Same lifecycle contract. Commit and push behavior depends on `deploy_strategy`, not on OpenClaw itself. |
| Worktree usage | The local dispatch runtime resolves the repo path, creates or reuses an auxiliary worktree, symlinks runtime env files, and launches the child engine in that worktree. | The OpenClaw dispatcher creates an auxiliary worktree, keeps agent execution inside that worktree, and symlinks runtime env files from the primary checkout. |
| Worktree cleanup | The worker is instructed to run `git worktree remove --force` and `git worktree prune` after finishing. | The worker is instructed to run the same `git worktree remove --force` and `git worktree prune` cleanup steps. |
| Extra completion signal | No extra host notification beyond PREQ lifecycle updates and the dispatched agent's own output. | Sends `openclaw system event --text "Done: <brief summary>" --mode now` after completion so the OpenClaw host wakes up immediately. |

Operationally, this means both dispatchers should leave you with the same PREQ task state and the same deploy result for a given task. The main differences are the launcher implementation and the extra OpenClaw completion event.

Both paths currently rely on worker-driven worktree cleanup. If a dispatched agent exits before running the cleanup commands, the worktree may remain until the next manual or automated prune pass.

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
