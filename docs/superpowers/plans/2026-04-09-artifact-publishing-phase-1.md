# Artifact Publishing Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `preqstation-skill` so `ask` and `qa` runs can describe optional private artifact publishing, mention Fast.io as the first supported provider, and stop contradicting that behavior in dispatch prompts.

**Architecture:** This phase is intentionally repo-local. It updates the worker skill contract, packaged skill copy, dispatch bootstrap text, and operator-facing docs in this repository; it does not implement PREQ UI parsing or rendering because that code does not live here. The runtime remains `ask`/`qa`-based, with `private-or-skip` artifact publishing guidance and no new task objective.

**Tech Stack:** Markdown skill/docs, Node.js ESM, `node:test`, esbuild bundle generation

---

### Task 1: Lock the artifact-capable worker contract in tests

**Files:**
- Create: `tests/docs/artifact-publishing-docs.test.mjs`
- Modify: `tests/dispatch/dispatch-runtime.test.mjs`
- Modify: `SKILL.md`
- Modify: `skills/preqstation/SKILL.md`
- Modify: `src/dispatch/dispatch-runtime.mjs`
- Modify: `dist/preq-dispatch-channel-server.mjs`

- [ ] **Step 1: Write the failing docs test for the new `ask`/`qa` contract**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('skill docs allow private artifact publishing for ask and qa', async () => {
  const [canonicalSkill, packagedSkill] = await Promise.all([
    fs.readFile(new URL('../../SKILL.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../skills/preqstation/SKILL.md', import.meta.url), 'utf8'),
  ]);

  for (const doc of [canonicalSkill, packagedSkill]) {
    assert.match(doc, /prototype or reviewable artifact/i);
    assert.match(doc, /optional artifact publishing/i);
    assert.match(doc, /private-or-skip/i);
    assert.match(doc, /Fast\\.io/i);
    assert.match(doc, /screenshots, videos, and documents/i);
  }
});
```

- [ ] **Step 2: Run the docs test and verify it fails**

Run: `node --test tests/docs/artifact-publishing-docs.test.mjs`

Expected: FAIL because the current skill still says `ask` rewrites the note only and does not mention artifact publishing or Fast.io.

- [ ] **Step 3: Write the failing dispatch prompt assertions**

Add assertions to `tests/dispatch/dispatch-runtime.test.mjs` that the bootstrap prompt and rendered `ask` prompt mention:

- `ask` always updates the note
- prototype-style asks may generate local artifacts
- safe providers may publish artifacts
- `qa` may report artifact references

Example assertion block:

```js
assert.match(prompt, /prototype-style asks may generate local artifacts/i);
assert.match(prompt, /safe provider/i);
assert.match(prompt, /private-or-skip/i);
```

- [ ] **Step 4: Run the dispatch runtime test file and verify it fails**

Run: `node --test tests/dispatch/dispatch-runtime.test.mjs`

Expected: FAIL because `src/dispatch/dispatch-runtime.mjs` still says `rewrite the task note only`.

- [ ] **Step 5: Update the canonical skill contract**

Modify `SKILL.md` so the `ask` and `qa` sections reflect the approved spec:

- `ask` still updates the note and preserves workflow status
- prototype-style asks may generate local artifacts
- optional artifact publishing is allowed only when a safe provider is available
- Fast.io is the first supported provider when available
- default artifact policy is `private-or-skip`
- `qa` may include screenshots, videos, and documents through the same optional artifact contract

Use wording that is explicit enough for agents to follow without inventing a new `prototype` objective.

- [ ] **Step 6: Sync the packaged skill copy**

Run: `npm run sync:skills`

Expected: `skills/preqstation/SKILL.md` matches `SKILL.md` exactly.

- [ ] **Step 7: Update the dispatch prompt and bootstrap text**

Modify `src/dispatch/dispatch-runtime.mjs` so both `renderDispatchPrompt()` and `buildEngineLaunchSpec()` stop telling workers that `ask` is note-only.

Replace the old guidance with language like:

```js
'10) If User Objective starts with ask, update the task note, keep the workflow status unchanged, and clear run_state by calling preq_update_task_status with the current workflow status from preq_get_task.',
'11) Prototype-style asks may generate local artifacts and may publish them only through a safe private provider using a private-or-skip policy.',
'12) If User Objective starts with qa, QA reports may include optional artifact references for screenshots, videos, and documents.',
```

Keep the rest of the lifecycle contract unchanged.

- [ ] **Step 8: Rebuild the bundled dispatch server**

Run: `npm run build:dispatch-bundle`

Expected: `dist/preq-dispatch-channel-server.mjs` updates to match the new source strings.

- [ ] **Step 9: Run the targeted tests and verify they pass**

Run:

```bash
node --test tests/docs/artifact-publishing-docs.test.mjs
node --test tests/dispatch/dispatch-runtime.test.mjs
```

Expected: PASS

- [ ] **Step 10: Commit the contract update**

```bash
git add SKILL.md skills/preqstation/SKILL.md src/dispatch/dispatch-runtime.mjs dist/preq-dispatch-channel-server.mjs tests/docs/artifact-publishing-docs.test.mjs tests/dispatch/dispatch-runtime.test.mjs
git commit -m "feat: add artifact publishing guidance to ask and qa"
```

### Task 2: Document optional Fast.io setup and note-format expectations

**Files:**
- Create: `docs/artifact-publishing.md`
- Modify: `README.md`
- Modify: `tests/docs/handoff-flow-docs.test.mjs`

- [ ] **Step 1: Write the failing docs coverage for the new operator guide**

Extend or replace `tests/docs/handoff-flow-docs.test.mjs` coverage so it also checks that:

- `README.md` links to `docs/artifact-publishing.md`
- the new doc mentions `https://mcp.fast.io/mcp`
- the new doc explains `private-or-skip`
- the new doc describes PREQ UI as metadata cards plus secure external open, not guaranteed inline embed

Example assertion shape:

```js
assert.match(readme, /docs\/artifact-publishing\.md/);
assert.match(artifactDoc, /https:\/\/mcp\.fast\.io\/mcp/);
assert.match(artifactDoc, /private-or-skip/);
assert.match(artifactDoc, /Open in Fast\\.io|secure external open/i);
```

- [ ] **Step 2: Run the docs test and verify it fails**

Run: `node --test tests/docs/handoff-flow-docs.test.mjs`

Expected: FAIL because the repo does not yet include `docs/artifact-publishing.md` or the README link.

- [ ] **Step 3: Write the operator guide**

Create `docs/artifact-publishing.md` with four short sections:

1. What artifact publishing does in PREQ
2. Fast.io as the first optional provider
3. Setup examples for supported workers
4. How private artifacts appear in PREQ UI

Include exact setup examples:

```bash
claude mcp add -s user --transport http fastio https://mcp.fast.io/mcp
codex mcp add fastio --url https://mcp.fast.io/mcp
```

Document the policy clearly:

- Fast.io is optional
- automatic publishing must be `private-or-skip`
- public-link-only shares must be skipped
- reviewers should expect a PREQ note section plus artifact cards that open the private provider URL

- [ ] **Step 4: Link the guide from the README**

Add a short link under `Project Docs` or another high-signal section in `README.md`:

```md
- Artifact publishing: [docs/artifact-publishing.md](docs/artifact-publishing.md)
```

Do not expand the README into a long tutorial; keep the detailed setup in the new guide.

- [ ] **Step 5: Run the targeted docs test and verify it passes**

Run: `node --test tests/docs/handoff-flow-docs.test.mjs`

Expected: PASS

- [ ] **Step 6: Commit the docs**

```bash
git add README.md docs/artifact-publishing.md tests/docs/handoff-flow-docs.test.mjs
git commit -m "docs: add optional Fast.io artifact publishing guide"
```

### Task 3: Full verification and execution handoff cleanup

**Files:**
- Modify: `docs/superpowers/plans/2026-04-09-artifact-publishing-phase-1.md`

- [ ] **Step 1: Run the full repository test suite**

Run: `npm test`

Expected: PASS

- [ ] **Step 2: Sanity-check the built bundle and changed docs**

Run:

```bash
git diff --stat
git diff -- SKILL.md src/dispatch/dispatch-runtime.mjs README.md docs/artifact-publishing.md
```

Expected:

- only intended artifact-publishing files changed
- no unrelated user changes were reverted
- the dispatch prompt language matches the skill guidance

- [ ] **Step 3: Update this plan with any execution notes if the implementation diverged**

If the codebase forces a slightly different file list or test path, edit this plan file with a short `Execution Notes` section before handoff. If implementation matched the plan exactly, skip this step.

- [ ] **Step 4: Final commit for any leftover verification-only changes**

Only if Step 3 changed this plan or if verification surfaced a tiny follow-up edit:

```bash
git add docs/superpowers/plans/2026-04-09-artifact-publishing-phase-1.md
git commit -m "chore: record artifact publishing plan execution notes"
```

Otherwise, do not create an extra commit.

## Out-of-Repo Follow-Up

The approved spec also describes PREQ UI artifact cards and note parsing, but that work is not implementable from this repository. Once this repo lands Phase 1, open a separate plan in the PREQ app/UI repository for:

- parsing structured `Artifacts:` lines from notes
- rendering private artifact cards
- deciding whether only the newest artifact section or all valid sections should be shown
