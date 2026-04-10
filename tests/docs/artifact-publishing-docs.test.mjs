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
    assert.match(doc, /Fast\.io/i);
    assert.match(doc, /authenticated Fast\.io MCP session|already available and attempt publication/i);
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
  assert.match(artifactDoc, /authenticated Fast\.io MCP session|already authenticated/i);
  assert.match(artifactDoc, /registered-account share|registered account share/i);
  assert.match(artifactDoc, /anyone with the link/i);
  assert.match(artifactDoc, /quickshare/i);
  assert.match(artifactDoc, /publish(?:ing)? result or skip reason|skip reason/i);
  assert.match(artifactDoc, /localhost|127\.0\.0\.1/i);
  assert.match(artifactDoc, /Open in Fast\.io|secure external open/i);
});
