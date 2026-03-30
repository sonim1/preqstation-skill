import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQueuedTaskChannelEvent,
  selectQueuedTasks,
} from '../../src/dispatch/channel-helpers.mjs';

test('selectQueuedTasks returns todo tasks with queued run_state that are not inflight', () => {
  const tasks = [
    {
      task_key: 'PROJ-1',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
    { task_key: 'PROJ-2', status: 'todo', run_state: 'working' },
    { task_key: 'PROJ-3', status: 'hold', run_state: 'queued', dispatch_target: 'claude-code-channel' },
    { task_key: 'PROJ-4', status: 'todo', run_state: 'queued', dispatch_target: 'telegram' },
    {
      task_key: 'PROJ-5',
      status: 'todo',
      run_state: 'queued',
      dispatch_target: 'claude-code-channel',
    },
  ];

  const selected = selectQueuedTasks(tasks, new Set(['PROJ-5']));

  assert.deepEqual(selected, [
    {
      task_key: 'PROJ-1',
      status: 'todo',
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

  assert.equal(event.content, 'Dispatch queued PREQ task PROJ-123.');
  assert.deepEqual(event.meta, {
    task_key: 'PROJ-123',
    project_key: 'PROJ',
    action: 'implement',
    engine: 'codex',
    branch_name: 'task/proj-123/fix-auth',
    source: 'preq_dispatch_channel',
  });
});
