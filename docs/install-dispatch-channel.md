# Install the Experimental Dispatch Channel

Use this path when you want to test the local Claude dispatch channel that lives in this repository.

In this repository, a `Hand off test` means the dispatcher creates or reuses an auxiliary worktree on the requested branch, links local runtime env files into that worktree when needed, and hands the task off to the requested engine there.

This runtime requires Node 18+ on PATH because the bundled server is launched with `node`.

This runtime is Claude Code only. Codex and Gemini CLI do not run the local Claude channel server.
The Claude dispatcher can still launch queued tasks whose requested engine is `codex` or `gemini-cli`.

Current status:

- Claude dispatch channel: experimental
- OpenClaw production dispatcher: still separate in `preqstation-openclaw`

## MCP Surfaces

| Server | Transport | Purpose | Required |
| --- | --- | --- | --- |
| `preqstation` | remote HTTP MCP | PREQ task tools and OAuth-backed `/mcp` access | yes |
| `preq-dispatch-channel` | local stdio MCP | experimental Claude-only dispatch runtime | yes for this flow |

## Shared Prerequisite: register PREQ MCP

Register the remote PREQ MCP server first:

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

The dispatch runtime tries to reuse Claude's configured PREQ MCP URL automatically.
That works when it can resolve a project-level or root-level `preqstation` entry from Claude config, or when Claude only has a single discoverable PREQ MCP URL.
If not, set `PREQSTATION_MCP_URL` explicitly.

Optional overrides:

```bash
export PREQSTATION_MCP_URL="https://<your-domain>/mcp"
export PREQSTATION_REPO_ROOTS="$HOME/projects:$HOME/work"
```

Installed plugin mode already provides default poll interval and callback port values from the plugin manifest.

If your repos are not under the default roots, either set `PREQSTATION_REPO_ROOTS` or create `~/.preqstation-dispatch/projects.json` manually:

```json
{
  "projects": {
    "PROJ": "/absolute/path/to/local/repo"
  }
}
```

If the plugin is installed, `/preqstation:setup` can manage this mapping file for you.

## Installed Plugin Mode

Install the plugin first:

```bash
claude plugin marketplace add https://github.com/sonim1/preqstation-skill
claude plugin install preqstation@preqstation
```

Then start the dispatcher session for a Hand off test:

```bash
claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
```

Debug mode:

```bash
claude --debug mcp --debug-file /tmp/preqstation-dispatch-debug.log --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
tail -f /tmp/preqstation-dispatch-debug.log
```

During the current Claude Channels research preview, do not add `--channels plugin:preqstation@preqstation` here.

If URL discovery fails, launch with an explicit override:

```bash
PREQSTATION_MCP_URL=https://<your-domain>/mcp claude --dangerously-skip-permissions --dangerously-load-development-channels plugin:preqstation@preqstation
```

For contributor-only repo development mode, keep the `mcp-dev.json` flow in [../CONTRIBUTING.md](../CONTRIBUTING.md) rather than this user guide.

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
