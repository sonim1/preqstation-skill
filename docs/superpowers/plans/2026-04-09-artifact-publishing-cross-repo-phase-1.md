# Artifact Publishing Cross-Repo Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first end-to-end artifact publishing slice across `preqstation-skill`, `preqstation-openclaw`, and `projects-manager` so optional private artifact links can be produced by ask/qa flows and rendered in the PREQ UI.

**Architecture:** Treat this as three coordinated but bounded changes. `preqstation-skill` defines the worker contract and optional Fast.io policy, `preqstation-openclaw` keeps the detached dispatch prompt aligned with that contract, and `projects-manager` parses structured `Artifacts:` lines from markdown and renders artifact cards in both task notes and QA run reports. Keep the privacy rule `private-or-skip`, keep `ask` as the prototype entry point, and avoid any new task objective or backend schema in this phase.

**Tech Stack:** Markdown skills/docs, Node.js ESM, Next.js 16, React 19, Mantine 8, `node:test`, Vitest

---

### Task 1: Update the worker contract in `preqstation-skill`

**Files:**
- Create: `/Users/kendrick/projects/preqstation-skill/tests/docs/artifact-publishing-docs.test.mjs`
- Modify: `/Users/kendrick/projects/preqstation-skill/tests/dispatch/dispatch-runtime.test.mjs`
- Modify: `/Users/kendrick/projects/preqstation-skill/SKILL.md`
- Modify: `/Users/kendrick/projects/preqstation-skill/skills/preqstation/SKILL.md`
- Modify: `/Users/kendrick/projects/preqstation-skill/src/dispatch/dispatch-runtime.mjs`
- Modify: `/Users/kendrick/projects/preqstation-skill/dist/preq-dispatch-channel-server.mjs`
- Create: `/Users/kendrick/projects/preqstation-skill/docs/artifact-publishing.md`
- Modify: `/Users/kendrick/projects/preqstation-skill/README.md`

- [ ] Write failing tests that assert `ask` may generate local prototype artifacts, `qa` may reference screenshots/videos/documents, Fast.io is optional, and the policy is `private-or-skip`.
- [ ] Run `node --test /Users/kendrick/projects/preqstation-skill/tests/docs/artifact-publishing-docs.test.mjs /Users/kendrick/projects/preqstation-skill/tests/dispatch/dispatch-runtime.test.mjs` and confirm failure.
- [ ] Update `SKILL.md` and sync `skills/preqstation/SKILL.md` with `npm --prefix /Users/kendrick/projects/preqstation-skill run sync:skills`.
- [ ] Update `src/dispatch/dispatch-runtime.mjs` so the bootstrap prompt and rendered prompt no longer say `ask` is note-only.
- [ ] Add the operator-facing Fast.io setup guide and README link.
- [ ] Rebuild the bundle with `npm --prefix /Users/kendrick/projects/preqstation-skill run build:dispatch-bundle`.
- [ ] Re-run the targeted tests and confirm green.

### Task 2: Align detached OpenClaw dispatch prompts in `preqstation-openclaw`

**Files:**
- Modify: `/Users/kendrick/projects/preqstation-openclaw/src/prompt-template.mjs`
- Modify: `/Users/kendrick/projects/preqstation-openclaw/src/detached-launch.mjs`
- Modify: `/Users/kendrick/projects/preqstation-openclaw/SKILL.md`
- Modify: `/Users/kendrick/projects/preqstation-openclaw/README.md`
- Modify: `/Users/kendrick/projects/preqstation-openclaw/tests/prompt-template.test.mjs`

- [ ] Add failing prompt-template assertions for prototype-style ask behavior, optional safe provider publishing, and `private-or-skip`.
- [ ] Run `npm --prefix /Users/kendrick/projects/preqstation-openclaw test -- /Users/kendrick/projects/preqstation-openclaw/tests/prompt-template.test.mjs` if supported, otherwise `node --test /Users/kendrick/projects/preqstation-openclaw/tests/prompt-template.test.mjs`, and confirm failure.
- [ ] Update OpenClaw prompt text and docs to match the skill contract without inventing a new objective.
- [ ] Re-run the targeted OpenClaw tests and confirm green.

### Task 3: Render artifact cards in `projects-manager`

**Files:**
- Modify: `/Users/kendrick/projects/projects-manager/lib/markdown.ts`
- Modify: `/Users/kendrick/projects/projects-manager/app/components/markdown-viewer.tsx`
- Modify: `/Users/kendrick/projects/projects-manager/app/components/task-edit-form.tsx`
- Modify: `/Users/kendrick/projects/projects-manager/app/components/ready-qa-actions.tsx`
- Create: `/Users/kendrick/projects/projects-manager/tests/lib-artifact-markdown.test.ts`
- Modify: `/Users/kendrick/projects/projects-manager/tests/lib-markdown.test.ts`
- Modify: `/Users/kendrick/projects/projects-manager/tests/ready-qa-actions.test.tsx`
- Modify: `/Users/kendrick/projects/projects-manager/tests/task-edit-form-answer-selection.test.tsx`

- [ ] Write failing tests for parsing artifact lines from markdown.
- [ ] Write failing component tests that verify:
- [ ] Task notes show an `Artifacts` area near the lower part of the notes card when valid URLs exist.
- [ ] QA run accordion panels show artifact cards between `Target URL` and `Report`.
- [ ] Public markdown still renders normally when there are no artifact lines.
- [ ] Keep the parser narrow: only render cards for artifacts that include a valid `url=` and type metadata, and treat local-only entries as plain text.
- [ ] Implement the minimal parser and card renderer in `lib/markdown.ts` and `MarkdownViewer`.
- [ ] Use one shared artifact rendering path so task notes, QA reports, work logs, and other markdown surfaces stay consistent by default.
- [ ] Re-run the targeted Vitest files and confirm green.

### Task 4: Cross-repo verification

**Files:**
- Modify only if verification requires a tiny fix

- [ ] Run targeted verification:
- [ ] `node --test /Users/kendrick/projects/preqstation-skill/tests/docs/artifact-publishing-docs.test.mjs /Users/kendrick/projects/preqstation-skill/tests/dispatch/dispatch-runtime.test.mjs`
- [ ] `node --test /Users/kendrick/projects/preqstation-openclaw/tests/prompt-template.test.mjs`
- [ ] `npm --prefix /Users/kendrick/projects/projects-manager run test:unit -- tests/lib-markdown.test.ts tests/ready-qa-actions.test.tsx tests/task-edit-form-answer-selection.test.tsx`
- [ ] Run broader safety nets where practical:
- [ ] `npm --prefix /Users/kendrick/projects/preqstation-skill test`
- [ ] `npm --prefix /Users/kendrick/projects/preqstation-openclaw test`
- [ ] `npm --prefix /Users/kendrick/projects/projects-manager run test:unit`
- [ ] Review diffs in all three repos and ensure no unrelated local changes were reverted.

## UI Placement Decisions

- Task note view: render artifact cards inside the Notes card, near the lower-left area under the markdown content.
- QA runs modal: render artifact cards inside each accordion panel, below `Target URL` and above `Report`.
- Artifact cards only appear when a parsed artifact has a valid URL.
- Cards must show type, provider, access badge, title, and an external open action.

## Out of Scope for This Phase

- New database tables or API schema for artifacts
- Guaranteed inline private embeds
- Upload provider implementation inside `projects-manager`
- Automatic artifact publishing beyond worker guidance and docs
