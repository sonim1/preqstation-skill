import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchTaskViaMcp,
  fetchTodoTasksViaMcp,
  readTaskFromPreqGetTaskResult,
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

test('fetchTodoTasksViaMcp queries inbox and todo tasks for every PREQ engine and merges duplicates', async () => {
  const calls = [];
  const tasks = await fetchTodoTasksViaMcp({
    callTool: async ({ name, arguments: args }) => {
      calls.push({ name, args });

      const byEngineAndStatus = {
        'claude-code:inbox': [
          { task_key: 'PROJ-1', status: 'inbox', run_state: 'queued', engine: 'claude-code' },
        ],
        'claude-code:todo': [],
        'codex:inbox': [],
        'codex:todo': [
          { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
        ],
        'gemini-cli:inbox': [
          { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
        ],
        'gemini-cli:todo': [
          { task_key: 'PROJ-3', status: 'todo', run_state: 'working', engine: 'gemini-cli' },
        ],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              tasks: byEngineAndStatus[`${args.engine}:${args.status}`] || [],
            }),
          },
        ],
      };
    },
  });

  assert.deepEqual(calls, [
    {
      name: 'preq_list_tasks',
      args: { status: 'inbox', engine: 'claude-code', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'todo', engine: 'claude-code', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'inbox', engine: 'codex', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'todo', engine: 'codex', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'inbox', engine: 'gemini-cli', limit: 200 },
    },
    {
      name: 'preq_list_tasks',
      args: { status: 'todo', engine: 'gemini-cli', limit: 200 },
    },
  ]);

  assert.deepEqual(tasks, [
    { task_key: 'PROJ-1', status: 'inbox', run_state: 'queued', engine: 'claude-code' },
    { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
    { task_key: 'PROJ-3', status: 'todo', run_state: 'working', engine: 'gemini-cli' },
  ]);
});

test('readTaskFromPreqGetTaskResult unwraps detailed task payloads', () => {
  const result = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          task: {
            task_key: 'PROJ-9',
            repo: 'https://github.com/acme/example',
            branch: 'task/proj-9/fix-auth',
          },
        }),
      },
    ],
  };

  assert.deepEqual(readTaskFromPreqGetTaskResult(result), {
    task_key: 'PROJ-9',
    repo: 'https://github.com/acme/example',
    branch: 'task/proj-9/fix-auth',
  });
});

test('fetchTaskViaMcp queries preq_get_task and returns the task payload', async () => {
  const calls = [];
  const task = await fetchTaskViaMcp({
    taskId: 'PROJ-11',
    callTool: async ({ name, arguments: args }) => {
      calls.push({ name, args });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              task: {
                task_key: 'PROJ-11',
                repo: 'https://github.com/acme/repo',
              },
            }),
          },
        ],
      };
    },
  });

  assert.deepEqual(calls, [
    {
      name: 'preq_get_task',
      args: { taskId: 'PROJ-11' },
    },
  ]);
  assert.deepEqual(task, {
    task_key: 'PROJ-11',
    repo: 'https://github.com/acme/repo',
  });
});
