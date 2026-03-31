# Install the Experimental Dispatch Channel

Use this path when you want to test the local Claude dispatch channel that now lives in this repository.

This path is for Claude Code only. Codex and Gemini CLI do not use this local channel runtime.

This is an experimental migration path. The current production OpenClaw dispatcher still lives in `preqstation-openclaw`.

You can run this channel in two ways:

- plugin-install mode with `claude plugin marketplace add https://github.com/sonim1/preqstation-skill` then `claude plugin install preqstation`
- development mode from the repo with `--mcp-config`

## 1. Install dependencies

```bash
cd /path/to/preqstation-skill
npm install
```

## 2. Configure the PREQ MCP URL

Preferred path:

```bash
claude mcp add --transport http preqstation https://<your-domain>/mcp
```

The dispatch channel will reuse that Claude MCP URL automatically.

Optional override:

```bash
export PREQSTATION_MCP_URL="https://<your-domain>/mcp"
```

Optional:

```bash
export PREQ_POLL_INTERVAL_MS="5000"
export PREQSTATION_OAUTH_CALLBACK_PORT="45451"
export PREQSTATION_REPO_ROOTS="$HOME/projects:$HOME/work"
```

If your repos are not under `~/projects`, either set `PREQSTATION_REPO_ROOTS` or create `~/.preqstation-dispatch/projects.json`:

```json
{
  "projects": {
    "PROJ": "/absolute/path/to/local/repo"
  }
}
```

## 3. Start Claude Code with the local channel

### Option A: direct repo development mode

```bash
claude --mcp-config /path/to/preqstation-skill/.mcp.json --dangerously-load-development-channels server:preq-dispatch-channel
```

### Option B: installed plugin mode

If you want to test the same install surface as `/plugin install`, first follow [install-claude-plugin.md](install-claude-plugin.md) to install `preqstation`, then start Claude with:

```bash
claude --channels plugin:preqstation@preqstation --dangerously-load-development-channels plugin:preqstation@preqstation
```

If you run that command from inside this repository, Claude will also auto-load the local project [`.mcp.json`](/Users/kendrick/projects/preqstation-skill/.mcp.json). That can cause the plugin copy of `preq-dispatch-channel` to be skipped as a duplicate. In that case, either:

```bash
claude --setting-sources user --channels plugin:preqstation@preqstation --dangerously-load-development-channels plugin:preqstation@preqstation
```

or run the plugin command from outside this repository.

## 4. Complete OAuth

The first real PREQ MCP connection will open the normal browser OAuth flow.

## 5. Verify

You should be able to:

- run `claude mcp list` and see `preq-dispatch-channel`
- see queued-task poll logs in the Claude terminal
- receive emitted channel events for PREQ tasks where `status=todo` and `run_state=queued`
- see Claude call the built-in `dispatch_task` tool when those events arrive in a Claude dispatch session
- when using plugin-install mode, verify `claude plugin list` includes `preqstation@preqstation`

## Current scope

This runtime currently does these things:

- connects to PREQ `/mcp` with OAuth
- calls `preq_list_tasks` across `claude-code`, `codex`, and `gemini-cli`
- filters queued todo tasks
- emits Claude channel events into the current dispatcher session
- exposes a `dispatch_task` tool so the Claude dispatcher session can create an isolated worktree and launch the requested engine as a child process

It does not yet replace the full production OpenClaw runtime by itself.
