import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('plugin manifest declares the dispatch MCP server inline', async () => {
  const raw = await fs.readFile(new URL('../../.claude-plugin/plugin.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(raw);

  assert.deepEqual(manifest.mcpServers, {
    'preq-dispatch-channel': {
      command: 'node',
      args: ['${CLAUDE_PLUGIN_ROOT}/dist/preq-dispatch-channel-server.mjs'],
      env: {
        PREQSTATION_OAUTH_CALLBACK_PORT: '45451',
        PREQ_POLL_INTERVAL_MS: '5000',
      },
    },
  });
});
