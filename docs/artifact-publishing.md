# Artifact Publishing

PREQ artifact publishing is optional. The baseline contract is:

- `ask` still updates the task note
- prototype-style asks may create local artifacts
- `qa` may reference screenshots, videos, and documents
- automatic publishing must follow `private-or-skip`
- if Fast.io is already authenticated in the current agent session, treat it as an available provider and attempt publication

## Fast.io

Fast.io is the first supported optional provider when agent access is already configured.

Setup examples:

```bash
claude mcp add -s user --transport http fastio https://mcp.fast.io/mcp
codex mcp add fastio --url https://mcp.fast.io/mcp
```

If the current agent already has an authenticated Fast.io MCP session, treat Fast.io as already available and attempt publication for prototype-style ask artifacts or QA artifacts without waiting for extra provider instructions.

Fast.io is not required. If it is missing, unauthenticated, or cannot create an authenticated workspace/share target, the worker should skip publishing and still finish the note or QA report update.

## Privacy

Automatic publishing must use `private-or-skip`.

- publish only when the provider can create an authenticated private URL
- acceptable Fast.io targets include workspace-private storage, member-restricted shares, and registered-account shares
- skip `anyone with the link`, `quickshare`, or other unauthenticated public-link-only modes
- keep the run successful even when publishing is skipped

## PREQ UI

The PREQ UI should show artifact metadata cards and use a secure external open flow instead of assuming private inline embeds will work.

Recommended reviewer action:

- click `Open in Fast.io` or the equivalent provider link
- authenticate with the private provider if needed
- review the asset there
