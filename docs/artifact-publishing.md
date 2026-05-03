# Artifact Publishing

PREQ artifact publishing is best-effort. The baseline contract is:

- `ask` still updates the task note
- prototype-style asks may create local artifacts
- `qa` may reference screenshots, videos, and documents
- automatic publishing must follow `private-or-skip`
- if a safe artifact provider is already authenticated in the current agent session, treat it as available and attempt publication
- Fast.io is one supported provider, not the only valid target
- if the provider can create temporary external share or quickshare links, create 7-day expiring reviewer links and record `access=quickshare` plus `expires=...`
- HTML prototype or HTML mockup artifacts should also get at least one screenshot PNG so reviewers can open a visual artifact
- task note and QA report bodies should stay clean; record artifact links, local paths, and skip reasons in structured `artifacts` arrays

## Fast.io

Fast.io is one supported optional provider when agent access is already configured.

Setup examples:

```bash
claude mcp add -s user --transport http fastio https://mcp.fast.io/mcp
codex mcp add fastio --url https://mcp.fast.io/mcp
```

If the current agent already has an authenticated Fast.io MCP session, treat Fast.io as already available and attempt publication for prototype-style ask artifacts or QA artifacts without waiting for extra provider instructions.

Fast.io is not required. If it is missing, unauthenticated, or cannot create an authenticated workspace/share target, the worker should skip publishing and still finish the note or QA report update. In that case, include a concise skip reason so reviewers know why a private link is absent.

For HTML prototypes and mockups, upload the HTML source plus at least one screenshot PNG when an authenticated provider is available. Pass reviewer links through the `artifacts` array on `preq_update_task_note`, `preq_complete_task`, or `preq_update_qa_run`:

```json
[
  {
    "type": "image",
    "title": "Desktop screenshot",
    "provider": "fastio",
    "access": "quickshare",
    "expires": "2026-04-18T00:00:00Z",
    "url": "https://..."
  },
  {
    "type": "document",
    "title": "HTML prototype",
    "provider": "fastio",
    "access": "private-workspace",
    "url": "https://..."
  }
]
```

If publishing is skipped, still include a structured artifact record with `localPath` and `reason` instead of appending an `Artifacts:` markdown block to the note or QA report.

## Privacy

Durable artifact links must use `private-or-skip`.

- publish durable links only when the provider can create an authenticated private URL
- acceptable targets include workspace-private storage, member-restricted shares, and registered-account shares
- skip non-expiring `anyone with the link` URLs or other public-link-only modes
- if the provider can create temporary external share or quickshare links, create 7-day expiring reviewer links; mark `access=quickshare` or the provider's equivalent and include `expires=...`
- keep the run successful even when publishing is skipped
- treat `localhost` and `127.0.0.1` URLs as local-only diagnostics, not reviewer-accessible artifact links

## PREQ UI

The PREQ UI should show artifact metadata cards and use a secure external open flow instead of assuming private inline embeds will work.

Recommended reviewer action:

- click `Open in Fast.io` or the equivalent provider link
- authenticate with the private provider if needed
- review the asset there
