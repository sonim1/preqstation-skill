import test from 'node:test';
import assert from 'node:assert/strict';

import { createChannelInstructions } from '../../src/dispatch/preq-dispatch-channel-server.mjs';

test('createChannelInstructions describes the dispatch runtime in generic terms', () => {
  const instructions = createChannelInstructions();

  assert.match(instructions, /dispatch runtime/i);
  assert.match(instructions, /preqstation-dispatch/i);
  assert.doesNotMatch(instructions, /OpenClaw/i);
});
