# Artifact Publishing Design

Date: 2026-04-09
Status: Draft for review

## Summary

PREQSTATION currently exposes task work through text note updates. That works for ask-style rewrites, but it does not let reviewers inspect visual or file-based outputs such as HTML prototypes, screenshots, videos, or generated documents inside the PREQ UI.

This design adds an optional artifact publishing contract without introducing a new task objective. Instead, the existing `ask` objective remains the user-facing entry point for prototype requests, and QA or dogfood runs can publish review artifacts through the same shared contract.

The core rule is:

- note updates remain mandatory
- artifact publishing is optional
- if no safe publisher is available, the run must quietly skip publishing and still complete the note update

## Assumptions

- We should not introduce a new `prototype` objective or new workflow status for the first version.
- `ask` may create local artifacts when the ask content clearly requests a prototype or other reviewable output.
- QA and dogfood flows may attach screenshots, recordings, and documents through the same artifact contract.
- The first supported provider target is Fast.io when it is available and can publish private artifacts.
- Public-link-only publication is not acceptable for automatic publishing.

## Goals

- Let PREQ reviewers inspect prototypes and QA artifacts from the PREQ UI.
- Preserve the current PREQ lifecycle and dispatch model.
- Keep the system useful even when no artifact publisher is configured.
- Support the first artifact types with a minimal contract:
  - `image`
  - `video`
  - `document`

## Non-Goals

- No new PREQ task objective such as `prototype`.
- No mandatory Fast.io dependency.
- No new backend artifact table in the first version.
- No guaranteed inline preview for private assets inside PREQ UI.
- No attempt to publish if the provider cannot satisfy the privacy policy.

## Proposed Behavior

## 1. Shared Artifact Concept

Introduce a shared `artifact` concept used by:

- `ask` runs that generate prototypes or reviewable files
- `qa` runs
- `dogfood`-style browser testing when available

An artifact is a reviewer-facing output that may be referenced from the PREQ note. First-version artifact types:

- `image`
- `video`
- `document`

Examples:

- HTML prototype screenshot
- walkthrough recording
- QA report document
- generated PDF or notes

## 2. Ask Behavior

The existing `ask` objective remains the entry point. Its behavior changes from "note only" to "note always, artifacts when requested."

Default ask behavior:

- rewrite or update the task note
- do not change workflow status
- clear `run_state` with `preq_update_task_status` using the current workflow status

Extended ask behavior for prototype-style asks:

- local artifact generation is allowed when the ask content clearly requests a prototype or other reviewable output
- note update remains mandatory
- artifact publishing is optional

Examples of asks that should allow local artifact generation:

- "prototype 만들어줘"
- "html로 시안 만들어줘"
- "스크린샷으로 공유해줘"
- "영상으로 보여줘"

## 3. QA and Dogfood Behavior

QA and dogfood outputs may use the same artifact contract.

If a QA run generates useful reviewer assets such as screenshots, recordings, or documents:

- the run may publish them through an optional artifact publisher
- the final QA markdown report may include the resulting artifact references
- if publishing is unavailable, the run still reports findings normally

This keeps ask and QA aligned around one artifact contract instead of separate provider-specific logic.

## 4. Note Format

Use a human-readable note plus a structured `Artifacts` block in markdown.

Recommendation:

- keep the existing task note content intact
- append or refresh a dedicated section near the bottom
- prefer updating the current `## Prototype` or `## Artifacts` section instead of endlessly appending duplicates

Suggested shape:

```md
## Prototype

Created a lightweight HTML prototype for the requested inbox flow.

What changed:
- Added an HTML prototype for the review path
- Included one screenshot for quick inspection

How to review:
- Open the private artifact link if present
- If no URL is present, use the local artifact summary below

Artifacts:
- [image] Inbox screenshot | provider=fastio | access=private | url=https://...
- [video] Walkthrough recording | provider=fastio | access=private | url=https://...
- [document] QA notes | provider=fastio | access=private | url=https://...
```

This format gives:

- readable text for humans
- stable parsing targets for the PREQ UI
- enough metadata for badges and future embed behavior

## 5. UI Behavior

The PREQ UI should parse the structured `Artifacts` lines from the note and render compact artifact cards.

First-version card fields:

- artifact type
- title or label
- provider
- access level
- URL
- optional expiration

Recommended first-version rendering:

- show a card or list row for each artifact
- show `Private` or equivalent access badge
- provide an `Open` action that opens the provider URL in a new tab

Important constraint:

- do not assume private Fast.io assets can be embedded directly in PREQ UI

Reason:

- private provider assets typically require authenticated access
- inline iframe or direct embed may fail due to auth or browser restrictions

First version should therefore prefer:

- secure external open flow
- metadata card in PREQ UI

Later versions may add authenticated preview if PREQ owns that integration end to end.

## 6. Privacy and Security Policy

Default publication policy is:

- `private-or-skip`

Meaning:

- publish only when the provider can create a private or member-restricted artifact URL
- skip publishing if the provider only offers public or link-anyone access
- never fail the ask or QA run solely because publishing is unavailable

Minimum acceptable publication levels:

- specific-member access
- workspace-member access
- equivalent authenticated private access

Not acceptable for automatic publication:

- `anyone with the link`
- quick public shares
- unauthenticated public links

The note may still record that artifacts were generated locally even when no private publish path exists.

## 7. Fast.io as the First Provider

Fast.io is a strong first provider candidate because it supports:

- workspace and member-based access control
- share-oriented distribution
- password and expiration options on some share modes
- preview support for common asset types

PREQ should treat Fast.io as:

- first supported provider target
- optional dependency
- never a hard requirement

Recommended first-version Fast.io policy:

- use Fast.io only when agent access is already configured
- publish only when the target share is private or member-restricted
- skip when only public-style sharing is available

Recommended operator setup:

- create a dedicated workspace for PREQ artifacts
- keep workspace membership minimal
- prefer share or workspace scopes that are private to the reviewer set

## 8. Execution Contract Changes

### PREQ lifecycle skill updates

Update `ask` guidance from:

- rewrite the existing task note only

To:

- rewrite or update the existing task note
- when the ask clearly requests a prototype or reviewable artifact, local artifact generation is allowed
- optional artifact publishing is allowed when a safe provider is available
- note update remains mandatory regardless of publisher availability

Update `qa` guidance to allow optional artifact publishing for screenshots, videos, and documents generated during scoped QA.

### Dispatch contract

No new dispatch action is required.

The existing action set remains:

- `plan`
- `implement`
- `review`
- `ask`
- `qa`

The semantic change lives inside `ask` and `qa`, not in dispatch.

## 9. Failure Handling

Artifact publishing must never become a hard blocker in the first version.

Failure policy:

- if no provider is configured, skip publishing
- if provider auth is unavailable, skip publishing
- if provider cannot satisfy privacy policy, skip publishing
- if provider upload fails, continue with note/report update unless the user explicitly required publishing

The run should only hard-fail on artifact publication when publication itself was the explicitly requested primary outcome and no fallback is acceptable.

## 10. Recommended Implementation Order

1. Update the PREQ skill documentation for `ask` and `qa`
2. Define a stable markdown artifact line format for the note
3. Teach ask flows how to append or refresh `## Prototype` or `Artifacts` sections
4. Teach QA flows how to include artifact lines in final reports
5. Add optional Fast.io publisher integration behind privacy checks
6. Update PREQ UI to parse artifact lines and render secure artifact cards

## Open Questions

- Should the first note parser support both `## Prototype` and `## Artifacts`, or normalize to one heading only?
- Should local-only artifacts be listed in the note without URLs, or omitted unless successfully published?
- Do we want the UI to render artifacts only from the latest matching section, or aggregate all valid artifact lines across the note?

## Recommendation

Implement the first version with the smallest stable contract:

- keep `ask` as the prototype entry point
- add shared optional artifact publishing for `ask` and `qa`
- use markdown note parsing instead of new backend schema
- treat Fast.io as the first optional provider
- enforce `private-or-skip`
- render PREQ UI artifact cards as secure external links before attempting inline private embeds
