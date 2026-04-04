import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('/preqstation:setup defaults to project path mapping instead of install-path triage', async () => {
  const commandDoc = await fs.readFile(
    new URL('../../commands/setup.md', import.meta.url),
    'utf8',
  );

  assert.match(commandDoc, /default to local project path mapping/i);
  assert.match(commandDoc, /do not start by asking the user to choose between setup paths/i);
  assert.match(commandDoc, /even if mappings already exist, allow the user to refresh or replace them/i);
  assert.doesNotMatch(commandDoc, /Use the matching documentation path:/);
});
