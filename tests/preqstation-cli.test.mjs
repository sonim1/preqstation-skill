import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEngineLaunch,
  parseCliArgs,
  renderPrompt,
} from '../scripts/preqstation-cli.mjs';

test('parseCliArgs maps task objective with default codex engine', () => {
  const parsed = parseCliArgs(['plan', 'PROJ-123']);

  assert.deepEqual(parsed, {
    objective: 'plan',
    taskId: 'PROJ-123',
    projectKey: 'PROJ',
    branchName: null,
    qaRunId: null,
    engine: 'codex',
    cwd: process.cwd(),
    writePromptOnly: false,
  });
});

test('parseCliArgs requires qa run metadata', () => {
  assert.throws(
    () => parseCliArgs(['qa', 'PROJ', '--branch', 'main']),
    /--run-id is required for qa/,
  );
});

test('renderPrompt includes QA fields and dogfood preference', () => {
  const prompt = renderPrompt({
    objective: 'qa',
    taskId: null,
    projectKey: 'PROJ',
    branchName: 'main',
    qaRunId: 'run-123',
    engine: 'codex',
    cwd: '/tmp/preqstation',
    writePromptOnly: false,
  });

  assert.match(prompt, /Task ID: N\/A/);
  assert.match(prompt, /Project Key: PROJ/);
  assert.match(prompt, /QA Run ID: run-123/);
  assert.match(prompt, /User Objective: qa/);
  assert.match(prompt, /dogfood` skill/);
});

test('buildEngineLaunch returns codex exec bootstrap', () => {
  const launch = buildEngineLaunch({
    objective: 'implement',
    taskId: 'PROJ-123',
    projectKey: 'PROJ',
    branchName: null,
    qaRunId: null,
    engine: 'codex',
    cwd: '/tmp/preqstation',
    writePromptOnly: false,
  });

  assert.equal(launch.command, 'codex');
  assert.deepEqual(launch.args.slice(0, 2), ['exec', '--dangerously-bypass-approvals-and-sandbox']);
  assert.match(launch.args.at(-1), /Read and execute instructions from \.\/\.preqstation-prompt\.txt/);
});
