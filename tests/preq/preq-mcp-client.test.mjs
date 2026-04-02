import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchDispatchTasksViaMcp,
  fetchProjectsViaMcp,
  fetchTaskViaMcp,
  readProjectsFromPreqListProjectsResult,
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

test('readProjectsFromPreqListProjectsResult parses JSON text content from preq_list_projects', () => {
  const result = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          count: 2,
          projects: [
            { key: 'PROJ', name: 'Project One', repoUrl: 'https://github.com/acme/proj' },
            { key: 'OPS', name: 'Operations', repoUrl: null },
          ],
        }),
      },
    ],
  };

  assert.deepEqual(readProjectsFromPreqListProjectsResult(result), [
    { key: 'PROJ', name: 'Project One', repoUrl: 'https://github.com/acme/proj' },
    { key: 'OPS', name: 'Operations', repoUrl: null },
  ]);
});

test('fetchDispatchTasksViaMcp queries all tasks for every PREQ engine and merges duplicates', async () => {
  const calls = [];
  const tasks = await fetchDispatchTasksViaMcp({
    callTool: async ({ name, arguments: args }) => {
      calls.push({ name, args });

      const byEngine = {
        'claude-code': [
          { task_key: 'PROJ-1', status: 'inbox', run_state: 'queued', engine: 'claude-code' },
          { task_key: 'PROJ-4', status: 'hold', run_state: 'queued', engine: 'claude-code' },
        ],
        codex: [
          { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
        ],
        'gemini-cli': [
          { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
          { task_key: 'PROJ-3', status: 'ready', run_state: 'working', engine: 'gemini-cli' },
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
      args: {
        engine: 'claude-code',
        runState: 'queued',
        dispatchTarget: 'claude-code-channel',
        limit: 200,
      },
    },
    {
      name: 'preq_list_tasks',
      args: {
        engine: 'codex',
        runState: 'queued',
        dispatchTarget: 'claude-code-channel',
        limit: 200,
      },
    },
    {
      name: 'preq_list_tasks',
      args: {
        engine: 'gemini-cli',
        runState: 'queued',
        dispatchTarget: 'claude-code-channel',
        limit: 200,
      },
    },
  ]);

  assert.deepEqual(tasks, [
    { task_key: 'PROJ-1', status: 'inbox', run_state: 'queued', engine: 'claude-code' },
    { task_key: 'PROJ-4', status: 'hold', run_state: 'queued', engine: 'claude-code' },
    { task_key: 'PROJ-2', status: 'todo', run_state: 'queued', engine: 'codex' },
    { task_key: 'PROJ-3', status: 'ready', run_state: 'working', engine: 'gemini-cli' },
  ]);
});

test('fetchProjectsViaMcp queries preq_list_projects and returns the project list payload', async () => {
  const calls = [];
  const projects = await fetchProjectsViaMcp({
    callTool: async ({ name, arguments: args }) => {
      calls.push({ name, args });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              projects: [
                { key: 'PROJ', name: 'Project One', repoUrl: 'https://github.com/acme/proj' },
                { key: 'OPS', name: 'Operations', repoUrl: null },
              ],
            }),
          },
        ],
      };
    },
  });

  assert.deepEqual(calls, [
    {
      name: 'preq_list_projects',
      args: {},
    },
  ]);
  assert.deepEqual(projects, [
    { key: 'PROJ', name: 'Project One', repoUrl: 'https://github.com/acme/proj' },
    { key: 'OPS', name: 'Operations', repoUrl: null },
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
