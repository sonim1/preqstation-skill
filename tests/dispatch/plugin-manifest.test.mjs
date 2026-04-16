import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('plugin manifest does not auto-start the dispatch channel', async () => {
  const raw = await fs.readFile(new URL('../../.claude-plugin/plugin.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.mcpServers, undefined);
});
