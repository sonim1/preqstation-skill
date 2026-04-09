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

test('emitQueuedTaskEvents also emits explicit queued dispatch requests', async () => {
  const calls = [];

  const count = await emitQueuedTaskEvents({
    mcp: {
      server: {
        async notification(payload) {
          calls.push(payload);
        },
      },
    },
    tasks: [],
    requests: [
      {
        id: 'request-1',
        scope: 'project',
        objective: 'insight',
        project_key: 'PROJ',
        engine: 'claude-code',
        state: 'queued',
        dispatch_target: 'claude-code-channel',
        prompt_metadata: {
          insightPromptB64: 'cHJvbXB0LWJhc2U2NA==',
        },
      },
    ],
    inflightTaskKeys: new Set(),
  });

  assert.equal(count, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'notifications/claude/channel');
  assert.match(calls[0].params.content, /Dispatch queued PREQ request request-1/);
  assert.match(calls[0].params.content, /action="insight"/);
});

test('emitQueuedTaskEvents prefers explicit task requests over legacy queued task events', async () => {
  const calls = [];

  const count = await emitQueuedTaskEvents({
    mcp: {
      server: {
        async notification(payload) {
          calls.push(payload);
        },
      },
    },
    tasks: [
      {
        task_key: 'PROJ-328',
        status: 'todo',
        run_state: 'queued',
        dispatch_target: 'claude-code-channel',
      },
    ],
    requests: [
      {
        id: 'request-ask-1',
        scope: 'task',
        objective: 'ask',
        task_key: 'PROJ-328',
        project_key: 'PROJ',
        engine: 'claude-code',
        state: 'queued',
        dispatch_target: 'claude-code-channel',
        prompt_metadata: {
          askHint: '중복 없이 다시 정리해줘',
        },
      },
    ],
    inflightTaskKeys: new Set(),
  });

  assert.equal(count, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].params.content, /Dispatch queued PREQ request request-ask-1/);
  assert.doesNotMatch(calls[0].params.content, /Dispatch queued PREQ task PROJ-328/);
});
