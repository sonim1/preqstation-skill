import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSerializedPollRunner,
  createChannelInstructions,
  describeDispatchChannelError,
  isCallbackPortInUseError,
} from '../../src/dispatch/preq-dispatch-channel-server.mjs';

test('createChannelInstructions describes the dispatch runtime in generic terms', () => {
  const instructions = createChannelInstructions();

  assert.match(instructions, /dispatch runtime/i);
  assert.match(instructions, /dispatch_task/i);
  assert.match(instructions, /exactly once/i);
  assert.doesNotMatch(instructions, /OpenClaw/i);
});

test('isCallbackPortInUseError detects OAuth callback port conflicts', () => {
  assert.equal(
    isCallbackPortInUseError(new Error('listen EADDRINUSE: address already in use 127.0.0.1:45451')),
    true,
  );
  assert.equal(isCallbackPortInUseError(new Error('network timeout')), false);
});

test('describeDispatchChannelError explains callback port conflicts clearly', () => {
  const message = describeDispatchChannelError(
    new Error('listen EADDRINUSE: address already in use 127.0.0.1:45451'),
    45451,
  );

  assert.match(message, /45451/);
  assert.match(message, /another PREQ dispatch session/i);
  assert.match(message, /PREQSTATION_OAUTH_CALLBACK_PORT/);
});

test('createSerializedPollRunner prevents overlapping polls', async () => {
  let resolvePoll;
  let calls = 0;
  const active = [];

  const runPoll = createSerializedPollRunner(
    async () => {
      calls += 1;
      active.push(calls);
      await new Promise((resolve) => {
        resolvePoll = resolve;
      });
      return calls;
    },
    () => {},
  );

  const first = runPoll();
  const second = runPoll();

  assert.equal(calls, 1);
  assert.equal(first, second);

  resolvePoll();
  const result = await first;

  assert.equal(result, 1);
  assert.deepEqual(active, [1]);
});
