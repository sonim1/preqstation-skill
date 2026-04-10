import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('skill docs tell plan runs how to recover a bootstrap repository', async () => {
  const [canonicalSkill, packagedSkill] = await Promise.all([
    fs.readFile(new URL('../../SKILL.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../skills/preqstation/SKILL.md', import.meta.url), 'utf8'),
  ]);

  for (const doc of [canonicalSkill, packagedSkill]) {
    assert.match(doc, /bootstrap repo/i);
    assert.match(doc, /git remote add origin/i);
    assert.match(doc, /origin\/main/i);
    assert.match(doc, /recreate or refresh the worktree/i);
  }
});
