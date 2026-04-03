import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSerializedPollRunner,
  createChannelInstructions,
  describeDispatchChannelError,
  emitQueuedTaskEvents,
  isCallbackPortInUseError,
  readClaudeConfiguredPreqMcpUrl,
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

test('readClaudeConfiguredPreqMcpUrl prefers the nearest Claude project MCP server config', () => {
  const configPath = new URL('../fixtures/claude-config.json', import.meta.url);
  const configuredUrl = readClaudeConfiguredPreqMcpUrl({
    cwd: '/Users/example/projects/app/packages/web',
    configPath,
  });

  assert.equal(configuredUrl, 'https://pm.example.com/mcp');
});

test('readClaudeConfiguredPreqMcpUrl falls back to a single discovered project URL', () => {
  const configPath = new URL('../fixtures/claude-config-single-project.json', import.meta.url);
  const configuredUrl = readClaudeConfiguredPreqMcpUrl({
    cwd: '/Users/example/other-repo',
    configPath,
  });

  assert.equal(configuredUrl, 'https://pm.single.example.com/mcp');
});

test('emitQueuedTaskEvents removes the current task from inflight when channel notification fails', async () => {
  const inflightTaskKeys = new Set();
  const calls = [];

  await assert.rejects(
    emitQueuedTaskEvents({
      mcp: {
        server: {
          async notification(payload) {
            calls.push(payload);
            throw new Error('channel transport failed');
          },
        },
      },
      tasks: [
        {
          task_key: 'PROJ-312',
          run_state: 'queued',
          dispatch_target: 'claude-code-channel',
        },
      ],
      inflightTaskKeys,
    }),
    /channel transport failed/i,
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(inflightTaskKeys), []);
});
