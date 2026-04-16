# Install the Experimental Dispatch Channel

Use this contributor-only path when you want to test the local Claude dispatch channel that lives in this repository.

In this repository, a `Hand off test` means the dispatcher creates or reuses an auxiliary worktree on the requested branch, links local runtime env files into that worktree when needed, and hands the task off to the requested engine there.

This runtime requires Node 18+ on PATH because the bundled server is launched with `node`.

This runtime is Claude Code only. Codex and Gemini CLI do not run the local Claude channel server.
The Claude dispatcher can still launch queued tasks whose requested engine is `codex` or `gemini-cli`.

The default installed Claude plugin does not auto-register this runtime as an MCP server. That keeps normal plugin installs from running a background `/mcp` poller.

Current status:

- Claude dispatch channel: experimental
- OpenClaw production dispatcher: still separate in `preqstation-openclaw`

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |
| `preq-dispatch-channel` | local stdio MCP | experimental Claude-only dispatch runtime | yes for this flow |

## Shared Prerequisite: register PREQ MCP

Register the remote PREQ MCP server first. Prefer a single user-scoped entry so the dispatcher and normal Claude sessions reuse the same PREQ config:

```bash
claude mcp add -s user --transport http preqstation https://<your-domain>/mcp
```

The dispatch runtime tries to reuse Claude's configured PREQ MCP URL automatically.
That works when it can resolve a project-level or root-level `preqstation` entry from Claude config, or when Claude only has a single discoverable PREQ MCP URL.
If not, set `PREQSTATION_MCP_URL` explicitly.

Optional overrides:

```bash
export PREQSTATION_MCP_URL="https://<your-domain>/mcp"
export PREQSTATION_REPO_ROOTS="$HOME/projects:$HOME/work"
```

The checked-in `mcp-dev.json` provides default poll interval and callback port values for manual testing.

If your repos are not under the default roots, either set `PREQSTATION_REPO_ROOTS` or create `~/.preqstation-dispatch/projects.json` manually:

```json
{
  "projects": {
    "PROJ": "/absolute/path/to/local/repo"
  }
}
```

If the plugin is installed, `/preqstation:setup` can add or verify the PREQ MCP entry for you and manage this mapping file.

## Manual Local Checkout Mode

Clone or update this repository, then start a dedicated dispatcher session from the local checkout:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

Debug mode:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
tail -f /tmp/preqstation-dispatch-debug.log
```

During the current Claude Channels research preview, do not add `--channels plugin:preqstation@preqstation` here.

If URL discovery fails, launch with an explicit override:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

Stop stale watcher processes after manual tests:

```bash
pkill -f preq-dispatch-channel-server.mjs
```

Production OpenClaw dispatch still lives in the separate `preqstation-openclaw` repository.

## OAuth

The first real PREQ request opens the PREQ OAuth flow in the browser.

The dispatch runtime keeps its own OAuth cache in `~/.preqstation-dispatch/oauth.json`.

## Verify

When the dispatch runtime is healthy for a Hand off test:

- `claude mcp list` shows the configured PREQ MCP server
- the Claude dispatcher session connects to PREQ `/mcp`
- queued tasks with `run_state=queued` and `dispatch_target=claude-code-channel` are emitted into the dispatcher session
- Claude calls the built-in `dispatch_task` tool when those events arrive and prepares the branch-scoped worktree handoff

## Current Scope

This runtime currently does all of the following:

- connects to PREQ `/mcp` over OAuth
- polls queued PREQ dispatch tasks targeting the Claude dispatch channel
- emits channel events into the active Claude dispatcher session
- exposes `dispatch_task` so Claude can run a Hand off test by creating an isolated worktree and launching the requested engine

It does not replace the full production OpenClaw dispatcher yet.
