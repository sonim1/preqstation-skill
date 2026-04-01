import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPluginMcpConfig,
  resolveDispatchChannelEntrypoint,
  serializePluginMcpConfig,
} from '../../src/dispatch/plugin-mcp-config.mjs';

test('resolveDispatchChannelEntrypoint builds an absolute path from the plugin root', () => {
  const entrypoint = resolveDispatchChannelEntrypoint('/Users/example/preqstation-skill');

  assert.equal(
    entrypoint,
    '/Users/example/preqstation-skill/src/dispatch/preq-dispatch-channel-server.mjs',
  );
});

test('buildPluginMcpConfig emits an absolute dispatch entrypoint path', () => {
  const config = buildPluginMcpConfig({
    pluginRoot: '/Users/example/preqstation-skill',
    callbackPort: '46000',
    pollIntervalMs: '7000',
  });

  assert.deepEqual(config, {
    mcpServers: {
      'preq-dispatch-channel': {
        command: 'node',
        args: ['/Users/example/preqstation-skill/src/dispatch/preq-dispatch-channel-server.mjs'],
        env: {
          PREQSTATION_OAUTH_CALLBACK_PORT: '46000',
          PREQ_POLL_INTERVAL_MS: '7000',
        },
      },
    },
  });
});

test('serializePluginMcpConfig returns formatted JSON with a trailing newline', () => {
  const content = serializePluginMcpConfig({
    pluginRoot: '/Users/example/preqstation-skill',
  });

  assert.match(
    content,
    /"args": \[\n\s+"\/Users\/example\/preqstation-skill\/src\/dispatch\/preq-dispatch-channel-server\.mjs"\n\s+\]/,
  );
  assert.match(content, /"PREQSTATION_OAUTH_CALLBACK_PORT": "45451"/);
  assert.match(content, /"PREQ_POLL_INTERVAL_MS": "5000"/);
  assert.equal(content.endsWith('\n'), true);
});
