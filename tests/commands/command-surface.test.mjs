import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('command surface uses help and update instead of start-dispatch', async () => {
  const commandsDir = new URL('../../commands/', import.meta.url);
  const commandFiles = await fs.readdir(commandsDir);

  assert.ok(commandFiles.includes('help.md'));
  assert.ok(commandFiles.includes('update.md'));
  assert.ok(!commandFiles.includes('start-dispatch.md'));
});

test('Claude plugin install guide lists the current helper commands', async () => {
  const installDoc = await fs.readFile(
    new URL('../../docs/install-claude-plugin.md', import.meta.url),
    'utf8',
  );

  assert.match(installDoc, /\/preqstation:setup/);
  assert.match(installDoc, /\/preqstation:status/);
  assert.match(installDoc, /\/preqstation:update/);
  assert.match(installDoc, /\/preqstation:help/);
  assert.doesNotMatch(installDoc, /\/preqstation:start-dispatch/);
});
