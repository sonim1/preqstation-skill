# Changelog

All notable changes to this project are documented in this file.

## 0.1.35 - 2026-04-16

- Removed the experimental Claude-specific local dispatch runtime, bundle, and contributor-only watcher config from this repository.
- Simplified the package back to the worker skill, Claude helper plugin, and OpenClaw migration guidance only.

## 0.1.34 - 2026-04-15

- Removed the default Claude plugin dispatch-channel MCP server so installing or updating the plugin no longer starts a background PREQ queue poller.
- Updated Claude dispatch docs to present the local watcher as a manual experimental path and documented stale watcher cleanup after old installs.

## 0.1.33 - 2026-04-11

- Generalized ask artifact publishing guidance beyond Fast.io so any authenticated artifact provider can be used.
- Added reviewer-friendly HTML prototype screenshot guidance and 7-day expiring share/quickshare link metadata.

## 0.1.32 - 2026-04-10

- Clarified the ask artifact publishing contract so authenticated Fast.io sessions are treated as an available publish target.
- Explicitly allowed authenticated workspace, member-restricted share, and registered-account Fast.io share targets while rejecting `anyone with the link` and `quickshare` for automatic publishing.

## 0.1.31 - 2026-04-09

- Fixed dispatch queue recovery when a Claude channel notification fails before launch.
- Clarified the recommended Claude install path and marked Gemini CLI support as partial.
- Added explicit release verification and Node 18+ runtime requirements.

## 0.1.26 - 2026-04-03

- Fixed dispatch queue recovery when channel notification delivery fails.
- Tightened package and release metadata around the shipped Claude plugin runtime.
- Simplified public install docs so Claude plugin setup is the recommended path.

## 0.1.25 - 2026-04-03

- Trimmed public docs to focus on end-user install and dispatch flows.
- Kept contributor-only local plugin and `mcp-dev.json` workflows in `CONTRIBUTING.md`.

## 0.1.24 - 2026-04-02

- Fixed stale dispatch worktree reuse by pruning invalid reusable worktrees before reuse.
- Kept the bundled Claude dispatch server aligned with the plugin manifest.

## 0.1.23 - 2026-04-02

- Opened the PREQ OAuth browser flow automatically for the local dispatch runtime.
- Updated install guidance for the Claude development channel preview behavior.
