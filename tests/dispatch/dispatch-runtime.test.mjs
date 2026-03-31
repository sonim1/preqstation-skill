import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import {
  buildEngineLaunchSpec,
  defaultBranchName,
  normalizeRepoUrl,
  parseWorktreeList,
  slugifyBranchName,
  writeClaudeChildMcpConfig,
} from '../../src/dispatch/dispatch-runtime.mjs';

test('normalizeRepoUrl normalizes GitHub SSH and HTTPS remotes', () => {
  assert.equal(
    normalizeRepoUrl('git@github.com:Acme/Example.git'),
    'https://github.com/acme/example',
  );
  assert.equal(
    normalizeRepoUrl('ssh://git@github.com/Acme/Example/'),
    'https://github.com/acme/example',
  );
  assert.equal(
    normalizeRepoUrl('https://github.com/Acme/Example.git'),
    'https://github.com/acme/example',
  );
});

test('slugifyBranchName and defaultBranchName create stable worktree names', () => {
  assert.equal(slugifyBranchName('task/proj-123/fix auth'), 'task-proj-123-fix-auth');
  assert.equal(
    defaultBranchName({ projectKey: 'PROJ', taskKey: 'PROJ-123' }),
    'preqstation/proj/proj-123',
  );
});

test('parseWorktreeList extracts worktree paths and branch refs', () => {
  const stdout = [
    'worktree /Users/example/projects/repo',
    'HEAD 1234567890abcdef',
    'branch refs/heads/main',
    '',
    'worktree /tmp/preqstation-dispatch-worktrees/PROJ/task-proj-1-fix-auth',
    'HEAD abcdef1234567890',
    'branch refs/heads/task/proj-1/fix-auth',
    '',
  ].join('\n');

  assert.deepEqual(parseWorktreeList(stdout), [
    {
      path: '/Users/example/projects/repo',
      branch: 'refs/heads/main',
      detached: false,
    },
    {
      path: '/tmp/preqstation-dispatch-worktrees/PROJ/task-proj-1-fix-auth',
      branch: 'refs/heads/task/proj-1/fix-auth',
      detached: false,
    },
  ]);
});

test('buildEngineLaunchSpec uses non-interactive launch commands', () => {
  assert.deepEqual(buildEngineLaunchSpec('claude-code', { mcpConfigPath: '/tmp/preqstation-mcp.json' }), {
    command: 'claude',
    args: [
      '--setting-sources',
      'project,local',
      '--mcp-config',
      '/tmp/preqstation-mcp.json',
      '--dangerously-skip-permissions',
      '-p',
      'Read and execute instructions from ./.preqstation-prompt.txt in the current workspace. Treat that file as the source of truth. If that file is missing, stop immediately.',
    ],
    env: {},
  });

  assert.deepEqual(buildEngineLaunchSpec('codex'), {
    command: 'codex',
    args: [
      'exec',
      '--dangerously-bypass-approvals-and-sandbox',
      'Read and execute instructions from ./.preqstation-prompt.txt in the current workspace. Treat that file as the source of truth. If that file is missing, stop immediately.',
    ],
    env: {},
  });
});

test('writeClaudeChildMcpConfig writes a project-local PREQ MCP config', async () => {
  const worktreePath = await mkdtemp(path.join(os.tmpdir(), 'preqstation-dispatch-test-'));
  const mcpConfigPath = await writeClaudeChildMcpConfig({
    worktreePath,
    mcpUrl: 'https://pm.example.com/mcp',
  });

  assert.equal(mcpConfigPath, path.join(worktreePath, '.preqstation-mcp.json'));

  const raw = await readFile(mcpConfigPath, 'utf8');
  assert.deepEqual(JSON.parse(raw), {
    mcpServers: {
      preqstation: {
        type: 'http',
        url: 'https://pm.example.com/mcp',
      },
    },
  });
});
