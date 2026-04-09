import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';

import {
  buildEngineLaunchSpec,
  defaultBranchName,
  ensureWorktree,
  normalizeRepoUrl,
  parseWorktreeList,
  renderDispatchPrompt,
  slugifyBranchName,
  writeClaudeChildMcpConfig,
} from '../../src/dispatch/dispatch-runtime.mjs';

const execFileAsync = promisify(execFile);

async function runGit(cwd, args) {
  return execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: 1024 * 1024 });
}

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
      'Read and execute instructions from ./.preqstation-prompt.txt in the current workspace. Treat that file as the source of truth. If that file is missing, stop immediately. If a Task ID is present there, call preq_get_task first, then preq_start_task before substantive work. If User Objective is ask, rewrite the task note only, use preq_update_task_note, and clear run_state with preq_update_task_status using the current workflow status. If User Objective is qa, use QA Run ID and QA Task Keys from that file, scope QA to those Ready tasks, and report through the PREQSTATION skill.',
    ],
    env: {},
  });

  assert.deepEqual(buildEngineLaunchSpec('codex'), {
    command: 'codex',
    args: [
      'exec',
      '--dangerously-bypass-approvals-and-sandbox',
      'Read and execute instructions from ./.preqstation-prompt.txt in the current workspace. Treat that file as the source of truth. If that file is missing, stop immediately. If a Task ID is present there, call preq_get_task first, then preq_start_task before substantive work. If User Objective is ask, rewrite the task note only, use preq_update_task_note, and clear run_state with preq_update_task_status using the current workflow status. If User Objective is qa, use QA Run ID and QA Task Keys from that file, scope QA to those Ready tasks, and report through the PREQSTATION skill.',
    ],
    env: {},
  });
});

test('renderDispatchPrompt matches the shared PREQ dispatch contract', () => {
  const prompt = renderDispatchPrompt({
    taskKey: 'PROJ-295',
    projectKey: 'PROJ',
    branchName: 'task/proj-295/mobile-view-skeleton',
    engine: 'claude-code',
    objective: 'plan',
    worktreePath: '/tmp/preqstation-dispatch-worktrees/PROJ/task-proj-295-mobile-view-skeleton',
    projectPath: '/Users/example/projects/proj',
  });

  assert.match(prompt, /Task ID: PROJ-295/);
  assert.match(prompt, /User Objective: plan/);
  assert.match(prompt, /QA Run ID: N\/A/);
  assert.match(prompt, /QA Task Keys: N\/A/);
  assert.match(prompt, /your first lifecycle action must be preq_get_task\("PROJ-295"\)/);
  assert.match(prompt, /call preq_start_task\("PROJ-295", "claude-code"\) immediately/);
  assert.match(prompt, /If User Objective starts with plan, do not run tests, build, lint/);
  assert.match(prompt, /git -C \/Users\/example\/projects\/proj worktree remove \/tmp\/preqstation-dispatch-worktrees\/PROJ\/task-proj-295-mobile-view-skeleton --force/);
});

test('renderDispatchPrompt includes ask-specific note rewrite rules', () => {
  const prompt = renderDispatchPrompt({
    taskKey: 'PROJ-328',
    projectKey: 'PROJ',
    branchName: 'task/proj-328/edit-task-isyu',
    engine: 'codex',
    objective: 'ask',
    worktreePath: '/tmp/preqstation-dispatch-worktrees/PROJ/task-proj-328-edit-task-isyu',
    projectPath: '/Users/example/projects/proj',
  });

  assert.match(prompt, /User Objective: ask/);
  assert.match(prompt, /rewrite the task note only/);
  assert.match(prompt, /preq_update_task_note/);
  assert.match(prompt, /preq_update_task_status/);
  assert.match(prompt, /workflow status unchanged/);
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

test('ensureWorktree prunes stale missing worktrees before reusing a branch path', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'preqstation-worktree-test-'));
  const projectPath = path.join(root, 'repo');
  const worktreeRoot = path.join(root, 'worktrees');

  await mkdir(projectPath, { recursive: true });
  await writeFile(path.join(projectPath, 'README.md'), 'dispatch runtime test\n');

  await runGit(projectPath, ['init']);
  await runGit(projectPath, ['config', 'user.name', 'Dispatch Test']);
  await runGit(projectPath, ['config', 'user.email', 'dispatch@example.com']);
  await runGit(projectPath, ['add', 'README.md']);
  await runGit(projectPath, ['commit', '-m', 'init']);

  const branchName = 'task/proj-312/add-the-copy-button-on-the-qa-runs';
  const firstWorktreePath = await ensureWorktree({
    projectPath,
    projectKey: 'PROJ',
    branchName,
    worktreeRoot,
  });

  await rm(firstWorktreePath, { recursive: true, force: true });

  const secondWorktreePath = await ensureWorktree({
    projectPath,
    projectKey: 'PROJ',
    branchName,
    worktreeRoot,
  });

  const gitDir = path.join(secondWorktreePath, '.git');
  const readmePath = path.join(secondWorktreePath, 'README.md');
  await readFile(gitDir, 'utf8');
  await readFile(readmePath, 'utf8');
});
