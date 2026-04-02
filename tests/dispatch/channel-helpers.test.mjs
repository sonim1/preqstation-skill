import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQueuedTaskChannelEvent,
  selectQueuedTasks,
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
