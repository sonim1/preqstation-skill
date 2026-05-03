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
    assert.match(doc, /best-effort|mandatory to attempt/i);
    assert.match(doc, /private-or-skip/i);
    assert.match(doc, /artifact provider/i);
    assert.match(doc, /Fast\.io/i);
    assert.match(doc, /authenticated Fast\.io MCP session|authenticated provider/i);
    assert.match(doc, /HTML prototype|HTML mockup/i);
    assert.match(doc, /screenshot/i);
    assert.match(doc, /structured `artifacts` field|artifacts` field|artifacts` array/i);
    assert.match(doc, /preq_update_task_note\(noteMarkdown=\.\.\., artifacts=\[\.\.\.\]\)/);
    assert.match(doc, /preq_update_qa_run/i);
    assert.match(doc, /not (?:the )?markdown report body/i);
    assert.match(doc, /7-day|one week|1 week|604800/i);
    assert.match(doc, /access=quickshare/i);
    assert.match(doc, /expires=/i);
    assert.match(doc, /registered-account share|registered account share/i);
    assert.match(doc, /publish(?:ing)? result or skip reason|skip reason/i);
    assert.match(doc, /localhost|127\.0\.0\.1/i);
    assert.match(doc, /screenshots, videos, and documents/i);
  }
});

test('artifact publishing guide documents Fast.io setup and secure open behavior', async () => {
  const [readme, artifactDoc] = await Promise.all([
    fs.readFile(new URL('../../README.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/artifact-publishing.md', import.meta.url), 'utf8'),
  ]);

  assert.match(readme, /docs\/artifact-publishing\.md/);
  assert.match(artifactDoc, /https:\/\/mcp\.fast\.io\/mcp/);
  assert.match(artifactDoc, /private-or-skip/i);
  assert.match(artifactDoc, /artifact provider/i);
  assert.match(artifactDoc, /authenticated Fast\.io MCP session|already authenticated/i);
  assert.match(artifactDoc, /registered-account share|registered account share/i);
  assert.match(artifactDoc, /anyone with the link/i);
  assert.match(artifactDoc, /quickshare/i);
  assert.match(artifactDoc, /7-day|one week|1 week|604800/i);
  assert.match(artifactDoc, /access=quickshare/i);
  assert.match(artifactDoc, /expires=/i);
  assert.match(artifactDoc, /preq_update_task_note|preq_complete_task|preq_update_qa_run/i);
  assert.match(artifactDoc, /structured `artifacts` arrays|`artifacts` array/i);
  assert.match(artifactDoc, /publish(?:ing)? result or skip reason|skip reason/i);
  assert.match(artifactDoc, /localPath/i);
  assert.match(artifactDoc, /localhost|127\.0\.0\.1/i);
  assert.match(artifactDoc, /Open in Fast\.io|secure external open/i);
});
