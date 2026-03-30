import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchTodoTasksViaMcp,
  readTasksFromPreqListTasksResult,
} from '../../src/preq/preq-mcp-client.mjs';

test('readTasksFromPreqListTasksResult parses JSON text content from preq_list_tasks', () => {
  const result = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          count: 1,
          tasks: [{ task_key: 'PROJ-1', status: 'todo', run_state: 'queued' }],
        }),
      },
    ],
  };

  assert.deepEqual(readTasksFromPreqListTasksResult(result), [
    { task_key: 'PROJ-1', status: 'todo', run_state: 'queued' },
  ]);
});

test('fetchTodoTasksViaMcp queries every PREQ engine and merges duplicate tasks', async () => {
  const calls = [];
  const tasks = await fetchTodoTasksViaMcp({
    callTool: async ({ name, arguments: args }) => {
      calls.push({ name, args });

      const byEngine = {
        'claude-code': [
          { task_key: 'PROJ-1', status: 'todo', run_state: 'queued', engine: 'claude-code' },
        ],
        codex: [
          { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
        ],
        'gemini-cli': [
          { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
          { task_key: 'PROJ-3', status: 'todo', run_state: 'working', engine: 'gemini-cli' },
        ],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              tasks: byEngine[args.engine] || [],
            }),
          },
        ],
      };
    },
  });

  assert.deepEqual(calls, [
    {
      name: 'preq_list_tasks',
      args: { status: 'todo', engine: 'claude-code', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'todo', engine: 'codex', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'todo', engine: 'gemini-cli', limit: 200 },
    },
  ]);

  assert.deepEqual(tasks, [
    { task_key: 'PROJ-1', status: 'todo', run_state: 'queued', engine: 'claude-code' },
    { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
    { task_key: 'PROJ-3', status: 'todo', run_state: 'working', engine: 'gemini-cli' },
  ]);
});
