# Install the Experimental Dispatch Channel

Use this path when you want to test the local Claude dispatch channel that now lives in this repository.

This path is for Claude Code only. Codex and Gemini CLI do not use this local channel runtime.

This is an experimental migration path. The current production OpenClaw dispatcher still lives in `preqstation-openclaw`.

## 1. Install dependencies

```bash
cd /path/to/preqstation-skill
npm install
```

## 2. Set the PREQ MCP URL

```bash
export PREQSTATION_MCP_URL="https://<your-domain>/mcp"
```

Optional:

```bash
export PREQ_POLL_INTERVAL_MS="5000"
export PREQSTATION_OAUTH_CALLBACK_PORT="45451"
```

## 3. Start Claude Code with the local channel

```bash
claude --mcp-config /path/to/preqstation-skill/.mcp.json --dangerously-load-development-channels server:preq-dispatch-channel
```

## 4. Complete OAuth

The first real PREQ MCP connection will open the normal browser OAuth flow.

## 5. Verify

You should be able to:

- run `claude mcp list` and see `preq-dispatch-channel`
- see queued-task poll logs in the Claude terminal
- receive emitted channel events for PREQ tasks where `status=todo` and `run_state=queued`

## Current scope

This runtime currently does these things:

- connects to PREQ `/mcp` with OAuth
- calls `preq_list_tasks` across `claude-code`, `codex`, and `gemini-cli`
- filters queued todo tasks
- emits Claude channel events into the current dispatcher session

It does not yet replace the full production OpenClaw runtime by itself.
