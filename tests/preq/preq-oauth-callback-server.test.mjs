import test from 'node:test';
import assert from 'node:assert/strict';

import { waitForOAuthAuthorizationCode } from '../../src/preq/preq-oauth-callback-server.mjs';

test('waitForOAuthAuthorizationCode rejects when aborted', async () => {
  const controller = new AbortController();
  const wait = waitForOAuthAuthorizationCode({
    port: 45489,
    signal: controller.signal,
    logger: { error() {} },
  });

  controller.abort();

  await assert.rejects(wait, (error) => {
    assert.equal(error?.name, 'AbortError');
    assert.match(String(error?.message), /cancelled/i);
    return true;
  });
});
