#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PROMPT_FILENAME = '.preqstation-prompt.txt';
const OBJECTIVES = new Set(['plan', 'implement', 'review', 'qa']);
const ENGINES = new Set(['claude-code', 'codex', 'gemini-cli']);
const BOOTSTRAP_PROMPT =
  'Read and execute instructions from ./.preqstation-prompt.txt in the current workspace. Treat that file as the source of truth. If that file is missing, stop. If a Task ID is present there, call preq_get_task first, then preq_start_task before substantive work.';

function parseFlagValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function assertDirectory(cwd) {
  const stats = statSync(cwd, { throwIfNoEntry: false });
  if (!stats || !stats.isDirectory()) {
    throw new Error(`--cwd does not exist or is not a directory: ${cwd}`);
  }
}

function deriveProjectKey(taskId) {
  const match = /^([A-Za-z0-9]+)-\d+$/.exec(taskId);
  if (!match) {
    throw new Error(`Task ID must look like PROJ-123: ${taskId}`);
  }

  return match[1];
}

export function parseCliArgs(argv, { cwd = process.cwd() } = {}) {
  const [objective, identifier, ...rest] = argv;

  if (!objective || !OBJECTIVES.has(objective)) {
    throw new Error('Usage: preqstation <plan|implement|review|qa> <task-or-project> [options]');
  }

  if (!identifier) {
    throw new Error(`Missing task or project identifier for objective: ${objective}`);
  }

  let branchName = null;
  let qaRunId = null;
  let engine = 'codex';
  let resolvedCwd = cwd;
  let writePromptOnly = false;

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    switch (token) {
      case '--branch':
        branchName = parseFlagValue(rest, index, '--branch');
        index += 1;
        break;
      case '--run-id':
        qaRunId = parseFlagValue(rest, index, '--run-id');
        index += 1;
        break;
      case '--engine':
        engine = parseFlagValue(rest, index, '--engine');
        index += 1;
        break;
      case '--cwd':
        resolvedCwd = path.resolve(parseFlagValue(rest, index, '--cwd'));
        index += 1;
        break;
      case '--write-prompt-only':
        writePromptOnly = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!ENGINES.has(engine)) {
    throw new Error(`--engine must be one of: ${Array.from(ENGINES).join(', ')}`);
  }

  assertDirectory(resolvedCwd);

  if (objective === 'qa') {
    if (!branchName) {
      throw new Error('--branch is required for qa');
    }

    if (!qaRunId) {
      throw new Error('--run-id is required for qa');
    }

    return {
      objective,
      taskId: null,
      projectKey: identifier,
      branchName,
      qaRunId,
      engine,
      cwd: resolvedCwd,
      writePromptOnly,
    };
  }

  return {
    objective,
    taskId: identifier,
    projectKey: deriveProjectKey(identifier),
    branchName,
    qaRunId,
    engine,
    cwd: resolvedCwd,
    writePromptOnly,
  };
}

export function renderPrompt({
  objective,
  taskId,
  projectKey,
  branchName,
  qaRunId,
  engine,
  cwd,
}) {
  return `Task ID: ${taskId ?? 'N/A'}
Project Key: ${projectKey}
Branch Name: ${branchName ?? 'N/A'}
QA Run ID: ${qaRunId ?? 'N/A'}
Requested Engine: ${engine}
Lifecycle Skill: preqstation (prefer MCP \`preq_*\` tools; CLI is a secondary launcher)
User Objective: ${objective}

Execution Requirements:
1) Work only inside ${cwd}.
2) If Task ID is present, call \`preq_get_task("<task_id>")\` first and then \`preq_start_task("<task_id>")\` before substantive work when the task is active.
3) Use the PREQSTATION MCP skill as the source of truth for lifecycle actions, deploy handling, and QA reporting whenever MCP is available.
4) If User Objective starts with \`plan\`, read local code only enough to produce the plan and stop after \`preq_plan_task\`. Do not run tests, build, lint, deploy, or implementation steps.
5) If User Objective starts with \`qa\`, use \`QA Run ID\` as the external reporting handle, do not invent task lifecycle transitions, and if the current agent has access to the \`dogfood\` skill, use it as the default QA workflow for browser testing and report generation.
6) If ${PROMPT_FILENAME} is missing in the current workspace, stop and report the launch failure instead of improvising from another directory.
`;
}

export function buildEngineLaunch({ engine }) {
  switch (engine) {
    case 'claude-code':
      return {
        command: 'claude',
        args: ['--dangerously-skip-permissions', BOOTSTRAP_PROMPT],
        env: {},
      };
    case 'codex':
      return {
        command: 'codex',
        args: ['exec', '--dangerously-bypass-approvals-and-sandbox', BOOTSTRAP_PROMPT],
        env: {},
      };
    case 'gemini-cli':
      return {
        command: 'gemini',
        args: ['-p', BOOTSTRAP_PROMPT],
        env: { GEMINI_SANDBOX: 'false' },
      };
    default:
      throw new Error(`Unsupported engine: ${engine}`);
  }
}

export function writePrompt(config) {
  const promptPath = path.join(config.cwd, PROMPT_FILENAME);
  writeFileSync(promptPath, renderPrompt(config), 'utf8');
  return promptPath;
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseCliArgs(argv);
  const promptPath = writePrompt(config);

  if (config.writePromptOnly) {
    process.stdout.write(`${promptPath}\n`);
    return 0;
  }

  const launch = buildEngineLaunch(config);
  const result = spawnSync(launch.command, launch.args, {
    cwd: config.cwd,
    stdio: 'inherit',
    env: { ...process.env, ...launch.env },
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 0;
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
