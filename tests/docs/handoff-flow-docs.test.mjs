import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('public docs define the Hand off test flow consistently', async () => {
  const [readme, dispatchDoc, migrationDoc] = await Promise.all([
    fs.readFile(new URL('../../README.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/install-dispatch-channel.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/migrate-openclaw.md', import.meta.url), 'utf8'),
  ]);

  assert.match(readme, /Hand off test/i);
  assert.match(dispatchDoc, /Hand off test/i);
  assert.match(migrationDoc, /Hand off test/i);
});
