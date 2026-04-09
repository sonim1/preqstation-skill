import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDispatchRequestChannelEvent,
  buildQueuedTaskChannelEvent,
  collectReservedTaskKeysFromDispatchRequests,
  selectQueuedDispatchRequests,
  selectQueuedTasks,
  summarizeQueuedDispatchRequestSelection,
  summarizeQueuedTaskSelection,
} from '../../src/dispatch/channel-helpers.mjs';

test('selectQueuedTasks ignores status and only requires queued run_state plus Claude dispatch target', () => {
  const tasks = [
    {
      task_key: 'PROJ-1',
      status: 'inbox',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      task_key: 'PROJ-2',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      task_key: 'PROJ-3',
      status: 'ready',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    { task_key: 'PROJ-4', status: 'todo', run_state: 'working' },
    {
      task_key: 'PROJ-5',
      status: 'hold',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      task_key: 'PROJ-6',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'telegram',
    },
    {
      task_key: 'PROJ-7',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
  ];

  const selected = selectQueuedTasks(tasks, new Set(['PROJ-7']));

  assert.deepEqual(selected, [
    {
      task_key: 'PROJ-1',
      status: 'inbox',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      task_key: 'PROJ-2',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      task_key: 'PROJ-3',
      status: 'ready',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      task_key: 'PROJ-5',
      status: 'hold',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
  ]);
});

test('buildQueuedTaskChannelEvent creates dispatch content and normalized metadata', () => {
  const event = buildQueuedTaskChannelEvent({
    task_key: 'PROJ-123',
    status: 'todo',
    run_state: 'queued',
    engine: 'codex',
    branch_name: 'task/proj-123/fix-auth',
  });

  assert.match(event.content, /Dispatch queued PREQ task PROJ-123\./);
  assert.match(event.content, /Call dispatch_task exactly once/i);
  assert.match(event.content, /task_key="PROJ-123"/);
  assert.match(event.content, /project_key="PROJ"/);
  assert.match(event.content, /engine="codex"/);
  assert.match(event.content, /branch_name="task\/proj-123\/fix-auth"/);
  assert.deepEqual(event.meta, {
    scope: 'task',
    task_key: 'PROJ-123',
    project_key: 'PROJ',
    action: 'implement',
    engine: 'codex',
    branch_name: 'task/proj-123/fix-auth',
    source: 'preq_dispatch_channel',
  });
});

test('summarizeQueuedTaskSelection explains why tasks were skipped', () => {
  const summary = summarizeQueuedTaskSelection(
    [
      {
        task_key: 'PROJ-1',
        status: 'inbox',
        run_state: 'queued',
        dispatch_target: 'claude-code-channel',
      },
      {
        task_key: 'PROJ-2',
        status: 'todo',
        run_state: 'working',
        dispatch_target: 'claude-code-channel',
      },
      {
        task_key: 'PROJ-3',
        status: 'todo',
        run_state: 'queued',
        dispatch_target: 'telegram',
      },
    ],
    new Set(['PROJ-1']),
  );

  assert.deepEqual(summary, [
    { taskKey: 'PROJ-1', eligible: false, reason: 'already-inflight' },
    { taskKey: 'PROJ-2', eligible: false, reason: 'run_state=working' },
    { taskKey: 'PROJ-3', eligible: false, reason: 'dispatch_target=telegram' },
  ]);
});

test('selectQueuedDispatchRequests keeps only queued Claude dispatch requests', () => {
  const requests = [
    {
      id: 'request-1',
      scope: 'task',
      objective: 'ask',
      state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      id: 'request-2',
      scope: 'project',
      objective: 'insight',
      state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      id: 'request-3',
      scope: 'project',
      objective: 'insight',
      state: 'failed',
      dispatch_target: 'claude-code-channel',
    },
    {
      id: 'request-4',
      scope: 'task',
      objective: 'ask',
      state: 'queued',
      dispatch_target: 'telegram',
    },
  ];

  const selected = selectQueuedDispatchRequests(requests, new Set(['dispatch-request:request-2']));

  assert.deepEqual(selected, [
    {
      id: 'request-1',
      scope: 'task',
      objective: 'ask',
      state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
  ]);
});

test('buildDispatchRequestChannelEvent preserves explicit ask objective metadata', () => {
  const event = buildDispatchRequestChannelEvent({
    id: 'request-1',
    scope: 'task',
    objective: 'ask',
    task_key: 'PROJ-328',
    project_key: 'PROJ',
    engine: 'claude-code',
    prompt_metadata: {
      askHint: 'Acceptance criteria 중심으로 정리해줘',
    },
  });

  assert.match(event.content, /Dispatch queued PREQ request request-1\./);
  assert.match(event.content, /dispatch_request_id="request-1"/);
  assert.match(event.content, /action="ask"/);
  assert.match(event.content, /ask_hint="Acceptance criteria 중심으로 정리해줘"/);
  assert.deepEqual(event.meta, {
    scope: 'task',
    dispatch_request_id: 'request-1',
    task_key: 'PROJ-328',
    project_key: 'PROJ',
    action: 'ask',
    engine: 'claude-code',
    branch_name: null,
    ask_hint: 'Acceptance criteria 중심으로 정리해줘',
    insight_prompt_b64: null,
    source: 'preq_dispatch_channel',
  });
});

test('summarizeQueuedDispatchRequestSelection explains why requests were skipped', () => {
  const summary = summarizeQueuedDispatchRequestSelection(
    [
      {
        id: 'request-1',
        state: 'queued',
        dispatch_target: 'claude-code-channel',
      },
      {
        id: 'request-2',
        state: 'dispatched',
        dispatch_target: 'claude-code-channel',
      },
      {
        id: 'request-3',
        state: 'queued',
        dispatch_target: 'telegram',
      },
    ],
    new Set(['dispatch-request:request-1']),
  );

  assert.deepEqual(summary, [
    { requestId: 'request-1', eligible: false, reason: 'already-inflight' },
    { requestId: 'request-2', eligible: false, reason: 'state=dispatched' },
    { requestId: 'request-3', eligible: false, reason: 'dispatch_target=telegram' },
  ]);
});

test('collectReservedTaskKeysFromDispatchRequests shadows legacy task dispatch for queued ask requests', () => {
  const reserved = collectReservedTaskKeysFromDispatchRequests([
    {
      id: 'request-1',
      scope: 'task',
      objective: 'ask',
      task_key: 'PROJ-328',
      state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    {
      id: 'request-2',
      scope: 'project',
      objective: 'insight',
      project_key: 'PROJ',
      state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
  ]);

  assert.deepEqual(Array.from(reserved), ['PROJ-328']);
});

test('selectQueuedTasks skips tasks covered by explicit queued dispatch requests', () => {
  const reservedTaskKeys = new Set(['PROJ-328']);
  const selected = selectQueuedTasks(
    [
      {
        task_key: 'PROJ-328',
        status: 'todo',
        run_state: 'queued',
        dispatch_target: 'claude-code-channel',
      },
      {
        task_key: 'PROJ-329',
        status: 'todo',
        run_state: 'queued',
        dispatch_target: 'claude-code-channel',
      },
    ],
    new Set(),
    reservedTaskKeys,
  );

  assert.deepEqual(selected, [
    {
      task_key: 'PROJ-329',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
  ]);
});
