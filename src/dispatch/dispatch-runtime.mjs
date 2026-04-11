import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const DEFAULT_PROJECT_MAP_PATH = path.join(
  os.homedir(),
  '.preqstation-dispatch',
  'projects.json',
);
export const DEFAULT_WORKTREE_ROOT = path.join(os.tmpdir(), 'preqstation-dispatch-worktrees');
export const DEFAULT_REPO_ROOTS = [path.join(os.homedir(), 'projects')];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function decodePromptMetadata(value) {
  const normalized = normalizeString(value);
  if (!normalized) return '';

  try {
    return Buffer.from(normalized, 'base64').toString('utf8').trim();
  } catch {
    return normalized;
  }
}

function toProjectKey(value) {
  return normalizeString(value).toUpperCase();
}

export function slugifyBranchName(branchName) {
  return normalizeString(branchName)
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function defaultBranchName({ projectKey, taskKey }) {
  const normalizedProjectKey = toProjectKey(projectKey).toLowerCase();
  const normalizedTaskKey = normalizeString(taskKey).toLowerCase();
  if (normalizedTaskKey) {
    return `preqstation/${normalizedProjectKey}/${normalizedTaskKey}`;
  }
  return `preqstation/${normalizedProjectKey}`;
}

export function normalizeRepoUrl(repoUrl) {
  const value = normalizeString(repoUrl);
  if (!value) return '';

  return value
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//i, 'https://github.com/')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function readRepoRoots(raw) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((entry) => path.resolve(entry)).filter(Boolean);
  }

  const normalized = normalizeString(raw);
  if (!normalized) {
    return DEFAULT_REPO_ROOTS;
  }

  return normalized
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

async function runCommand(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    const stdout = normalizeString(error?.stdout);
    const stderr = normalizeString(error?.stderr);
    const message = stderr || stdout || normalizeString(error?.message) || `Command failed: ${command}`;
    throw new Error(message);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function loadProjectMappings(mappingPath = DEFAULT_PROJECT_MAP_PATH) {
  try {
    const raw = await readFile(mappingPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    if (parsed.projects && typeof parsed.projects === 'object') {
      return parsed.projects;
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function saveProjectMappings(mappings, mappingPath = DEFAULT_PROJECT_MAP_PATH) {
  await mkdir(path.dirname(mappingPath), { recursive: true });
  await writeFile(mappingPath, JSON.stringify({ projects: mappings }, null, 2));
}

async function isGitRepo(dirPath) {
  return pathExists(path.join(dirPath, '.git'));
}

async function walkRepoCandidates(rootPath, depth = 0, maxDepth = 2) {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  if (await isGitRepo(rootPath)) {
    return [rootPath];
  }

  if (depth >= maxDepth) {
    return [];
  }

  const entries = await readdir(rootPath, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const nestedPath = path.join(rootPath, entry.name);
    const nestedCandidates = await walkRepoCandidates(nestedPath, depth + 1, maxDepth);
    candidates.push(...nestedCandidates);
  }
  return candidates;
}

async function findProjectPathByRepo(repoUrl, repoRoots) {
  const normalizedTarget = normalizeRepoUrl(repoUrl);
  for (const rootPath of repoRoots) {
    const candidates = await walkRepoCandidates(rootPath);
    for (const candidate of candidates) {
      try {
        const { stdout } = await runCommand('git', ['-C', candidate, 'remote', 'get-url', 'origin']);
        if (normalizeRepoUrl(stdout) === normalizedTarget) {
          return candidate;
        }
      } catch {}
    }
  }
  return null;
}

export async function resolveProjectPath({
  projectKey,
  repoUrl,
  mappingPath = DEFAULT_PROJECT_MAP_PATH,
  repoRoots = DEFAULT_REPO_ROOTS,
}) {
  const normalizedProjectKey = toProjectKey(projectKey);
  const mappings = await loadProjectMappings(mappingPath);
  const mappedPath = normalizeString(mappings[normalizedProjectKey]);

  if (mappedPath) {
    return path.resolve(mappedPath);
  }

  const discoveredPath = await findProjectPathByRepo(repoUrl, readRepoRoots(repoRoots));
  if (discoveredPath) {
    mappings[normalizedProjectKey] = discoveredPath;
    await saveProjectMappings(mappings, mappingPath);
    return discoveredPath;
  }

  throw new Error(
    `No local project path mapping found for ${normalizedProjectKey}. Add it to ${mappingPath} or make sure ${repoUrl || 'the repo URL'} exists under ${readRepoRoots(repoRoots).join(', ')}.`,
  );
}

export function parseWorktreeList(stdout) {
  const lines = normalizeString(stdout).split('\n');
  const worktrees = [];
  let current = null;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('worktree ')) {
      if (current) worktrees.push(current);
      current = {
        path: line.slice('worktree '.length).trim(),
        branch: null,
        detached: false,
      };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).trim();
      continue;
    }
    if (line === 'detached') {
      current.detached = true;
    }
  }

  if (current) worktrees.push(current);
  return worktrees;
}

async function ensureCommandAvailable(command) {
  await runCommand('which', [command]);
}

async function localBranchExists(projectPath, branchName) {
  try {
    await runCommand('git', ['-C', projectPath, 'show-ref', '--verify', '--quiet', `refs/heads/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

export async function ensureWorktree({
  projectPath,
  projectKey,
  branchName,
  worktreeRoot = DEFAULT_WORKTREE_ROOT,
}) {
  const normalizedBranchName = normalizeString(branchName);
  if (!normalizedBranchName || normalizedBranchName.includes('..') || normalizedBranchName.startsWith('/')) {
    throw new Error(`Unsafe branch name: ${branchName}`);
  }

  const targetPath = path.join(worktreeRoot, toProjectKey(projectKey), slugifyBranchName(normalizedBranchName));
  await mkdir(path.dirname(targetPath), { recursive: true });

  const { stdout } = await runCommand('git', ['-C', projectPath, 'worktree', 'list', '--porcelain']);
  let worktrees = parseWorktreeList(stdout);
  const branchRef = `refs/heads/${normalizedBranchName}`;

  const reusable = worktrees.find(
    (worktree) => worktree.path !== projectPath && (worktree.path === targetPath || worktree.branch === branchRef),
  );
  if (reusable) {
    if (await pathExists(reusable.path)) {
      return reusable.path;
    }

    await runCommand('git', ['-C', projectPath, 'worktree', 'prune']);
    const refreshed = await runCommand('git', ['-C', projectPath, 'worktree', 'list', '--porcelain']);
    worktrees = parseWorktreeList(refreshed.stdout);

    const refreshedReusable = worktrees.find(
      (worktree) =>
        worktree.path !== projectPath && (worktree.path === targetPath || worktree.branch === branchRef),
    );
    if (refreshedReusable && (await pathExists(refreshedReusable.path))) {
      return refreshedReusable.path;
    }
  }

  const branchInPrimaryCheckout = worktrees.some(
    (worktree) => worktree.path === projectPath && worktree.branch === branchRef,
  );

  if (branchInPrimaryCheckout) {
    await runCommand('git', ['-C', projectPath, 'worktree', 'add', '--detach', targetPath, normalizedBranchName]);
  } else if (await localBranchExists(projectPath, normalizedBranchName)) {
    await runCommand('git', ['-C', projectPath, 'worktree', 'add', targetPath, normalizedBranchName]);
  } else {
    await runCommand('git', ['-C', projectPath, 'worktree', 'add', '-b', normalizedBranchName, targetPath, 'HEAD']);
  }

  if (!(await pathExists(targetPath)) || path.resolve(targetPath) === path.resolve(projectPath)) {
    throw new Error(`Failed to prepare auxiliary worktree for ${normalizedBranchName}.`);
  }

  return targetPath;
}

function isLocalEnvFile(filename) {
  if (filename === '.env' || filename === '.env.local') {
    return true;
  }
  if (!filename.startsWith('.env.')) {
    return false;
  }
  if (filename.endsWith('.example') || filename.endsWith('.sample') || filename.endsWith('.template')) {
    return false;
  }
  return filename.endsWith('.local');
}

export async function syncLocalEnvFiles(projectPath, worktreePath) {
  const entries = await readdir(projectPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!isLocalEnvFile(entry.name)) continue;

    const sourcePath = path.join(projectPath, entry.name);
    const targetPath = path.join(worktreePath, entry.name);

    if (await pathExists(targetPath)) {
      const stats = await lstat(targetPath);
      if (!stats.isSymbolicLink()) {
        throw new Error(`Refusing to overwrite existing env file at ${targetPath}.`);
      }
      await rm(targetPath, { force: true });
    }

    await symlink(sourcePath, targetPath);
  }
}

export function renderDispatchPrompt({
  taskKey,
  projectKey,
  branchName,
  engine,
  objective,
  worktreePath,
  projectPath,
  qaRunId,
  qaTaskKeys,
  askHint,
  insightPrompt,
}) {
  const qaTaskKeysValue = Array.isArray(qaTaskKeys)
    ? qaTaskKeys.map((taskId) => normalizeString(taskId)).filter(Boolean).join(', ')
    : '';
  return [
    `Task ID: ${taskKey || 'N/A'}`,
    `Project Key: ${projectKey || 'N/A'}`,
    `Branch Name: ${branchName || 'N/A'}`,
    `QA Run ID: ${qaRunId || 'N/A'}`,
    `QA Task Keys: ${qaTaskKeysValue || 'N/A'}`,
    `Ask Hint: ${askHint || 'N/A'}`,
    `Insight Prompt: ${insightPrompt || 'N/A'}`,
    `Lifecycle Skill: preqstation (use preq_* MCP tools for task lifecycle)`,
    `User Objective: ${objective || 'implement'}`,
    '',
    'Execution Requirements:',
    `1) Work only inside ${worktreePath || 'the current workspace'}.`,
    `2) Use branch ${branchName || 'N/A'} for commits and pushes when provided.`,
    `3) If Task ID is present, your first lifecycle action must be preq_get_task("${taskKey}") before asking the user for task text, before planning, and before implementation. Use the fetched task as the source of truth for title, description, acceptance criteria, and status.`,
    `4) If the fetched task is active (inbox, todo, hold, or ready), call preq_start_task("${taskKey}", "${engine}") immediately after preq_get_task and before any planning, implementation, or verification so PREQSTATION records run_state=working.`,
    '5) Treat workflow status and execution state separately. Valid workflow statuses are inbox, todo, hold, ready, done, and archived. Valid run_state values are queued, working, and null. Do not emit legacy workflow statuses.',
    '6) Must follow the Execution Flow in the PREQSTATION MCP skill.',
    `7) Do not ask the user to paste the task card text or preq_get_task output when preq_get_task("${taskKey}") is available. Ask only if the tool call itself fails or PREQ tools are unavailable.`,
    '8) Use the preqstation lifecycle skill as the single source of truth for PREQ task rules, status transitions, deploy handling, and preq_* tool usage.',
    '9) If User Objective starts with plan, do not run tests, build, lint, or other verification commands. Read local code only enough to produce the plan and stop after preq_plan_task.',
    '10) If a plan run finds a bootstrap repo state in the worktree, such as only .gitignore being tracked, inspect the primary checkout before blocking. If the primary checkout is the intended repo and already contains the real app files, treat this as repo recovery rather than missing code.',
    '11) During that bootstrap repo recovery, ensure origin exists and matches the PREQ repo URL. If origin is missing and the repo URL is known, add it with git remote add origin <repo_url>, commit the baseline files on main, push origin/main, recreate or refresh the worktree, and then continue planning.',
    '12) Block the plan run only when the primary checkout is the wrong repo, the repo URL is unavailable or mismatched, or the bootstrap recovery push to origin/main fails.',
    '13) If User Objective starts with ask, update the task note, keep the workflow status unchanged, persist the final markdown with preq_update_task_note, and clear run_state by calling preq_update_task_status with the current workflow status from preq_get_task.',
    '14) Prototype-style asks may generate local artifacts. If an authenticated artifact provider is already available, attempt publication and keep private-or-skip by using authenticated workspace/share targets when possible. Fast.io is one supported provider; authenticated workspace storage, member-restricted shares, and registered-account shares are acceptable. If share or quickshare-style temporary external links are available, create 7-day expiring reviewer links, record them with access=quickshare and expires=..., and do not create non-expiring anyone-with-the-link URLs. If the artifact is an HTML prototype or HTML mockup, generate at least one screenshot PNG and attempt to publish both the HTML source and screenshot. Record published links under an Artifacts: markdown block and record the artifact publishing result or skip reason in the note; localhost URLs are local-only and must not be presented as the only review link. Exclude any temporary trailing Ask: helper block from the final saved note and treat it only as optional rewrite guidance.',
    '15) If User Objective starts with insight, Task ID may be N/A. In that branch, inspect the local project, call preq_list_tasks(projectKey=..., detail=full), avoid obvious duplicates in inbox/todo/hold/ready, and create multiple inbox tasks with preq_create_task.',
    '16) If User Objective starts with insight, do not mutate existing tasks, do not write a long-form implementation plan, and use Insight Prompt only as task-generation guidance.',
    '17) If User Objective starts with qa, Task ID may be N/A. In that branch, use QA Run ID as the external reporting handle, update it through the PREQSTATION skill, and do not invent a task lifecycle transition.',
    '18) If User Objective starts with qa and QA Task Keys is present, call preq_get_task for each listed task key before browser testing. Treat those tasks as the QA scope and keep QA limited to that scope. QA reports may include optional artifact references for screenshots, videos, and documents.',
    '19) If the current agent has access to the dogfood skill, use it as the default QA workflow for browser testing and report generation.',
    '20) If ./.preqstation-prompt.txt is missing in the current workspace, stop and report a dispatch failure instead of improvising from another directory.',
    `21) Worktree cleanup after all work:\n    git -C ${projectPath || '<project_cwd>'} worktree remove ${worktreePath || '<cwd>'} --force\n    git -C ${projectPath || '<project_cwd>'} worktree prune`,
  ].join('\n');
}

export async function writeClaudeChildMcpConfig({
  worktreePath,
  mcpUrl,
}) {
  const mcpConfigPath = path.join(worktreePath, '.preqstation-mcp.json');
  await writeFile(
    mcpConfigPath,
    JSON.stringify(
      {
        mcpServers: {
          preqstation: {
            type: 'http',
            url: mcpUrl,
          },
        },
      },
      null,
      2,
    ),
  );
  return mcpConfigPath;
}

export function buildEngineLaunchSpec(engine, options = {}) {
  const bootstrapPrompt = [
    'Read and execute instructions from ./.preqstation-prompt.txt in the current workspace.',
    'Treat that file as the source of truth.',
    'If that file is missing, stop immediately.',
    'If a Task ID is present there, call preq_get_task first, then preq_start_task before substantive work.',
    'If User Objective is ask, update the task note, use preq_update_task_note, keep the workflow status unchanged, and clear run_state with preq_update_task_status using the current workflow status.',
    'Prototype-style asks may generate local artifacts. If an authenticated artifact provider is already available, attempt publication and keep private-or-skip by using authenticated workspace/share targets when possible. Fast.io is one supported provider; authenticated workspace storage, member-restricted shares, and registered-account shares are acceptable. If share or quickshare-style temporary external links are available, create 7-day expiring reviewer links, record them with access=quickshare and expires=..., and do not create non-expiring anyone-with-the-link URLs. If the artifact is an HTML prototype or HTML mockup, generate at least one screenshot PNG and attempt to publish both the HTML source and screenshot. Record published links under an Artifacts: markdown block and record the artifact publishing result or skip reason in the note; localhost URLs are local-only and must not be presented as the only review link.',
    'If User Objective is insight, inspect the current project, use preq_list_tasks with the current project key to avoid duplicates, and create Inbox tasks with preq_create_task.',
    'If User Objective is qa, use QA Run ID and QA Task Keys from that file, scope QA to those Ready tasks, and report through the PREQSTATION skill. QA reports may include optional artifact references for screenshots, videos, and documents.',
  ].join(' ');

  switch (normalizeString(engine).toLowerCase()) {
    case 'claude-code': {
      const mcpConfigPath = normalizeString(options.mcpConfigPath);
      const args = [
        '--setting-sources',
        'project,local',
      ];
      if (mcpConfigPath) {
        args.push('--mcp-config', mcpConfigPath);
      }
      args.push('--dangerously-skip-permissions', '-p', bootstrapPrompt);
      return {
        command: 'claude',
        args,
        env: {},
      };
    }
    case 'codex':
      return {
        command: 'codex',
        args: ['exec', '--dangerously-bypass-approvals-and-sandbox', bootstrapPrompt],
        env: {},
      };
    case 'gemini-cli':
      return {
        command: 'gemini',
        args: ['-p', bootstrapPrompt],
        env: { GEMINI_SANDBOX: 'false' },
      };
    default:
      throw new Error(`Unsupported engine: ${engine}`);
  }
}

export async function launchDispatchProcess({
  engine,
  worktreePath,
  promptText,
  mcpUrl,
}) {
  const promptPath = path.join(worktreePath, '.preqstation-prompt.txt');
  await writeFile(promptPath, promptText);

  const logPath = path.join(worktreePath, `.preqstation-dispatch-${Date.now()}.log`);
  const mcpConfigPath =
    normalizeString(engine).toLowerCase() === 'claude-code' && normalizeString(mcpUrl)
      ? await writeClaudeChildMcpConfig({ worktreePath, mcpUrl })
      : null;
  const { command, args, env } = buildEngineLaunchSpec(engine, { mcpConfigPath });
  await ensureCommandAvailable(command);

  const stdoutFd = openSync(logPath, 'a');
  const stderrFd = openSync(logPath, 'a');
  const child = spawn(command, args, {
    cwd: worktreePath,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
  });
  child.unref();

  return {
    pid: child.pid,
    logPath,
    promptPath,
    mcpConfigPath,
  };
}

export async function dispatchTask({
  taskClient,
  taskKey,
  projectKey,
  action,
  engine,
  branchName,
  askHint,
  insightPromptB64,
  mcpUrl,
  mappingPath = DEFAULT_PROJECT_MAP_PATH,
  repoRoots = DEFAULT_REPO_ROOTS,
  worktreeRoot = DEFAULT_WORKTREE_ROOT,
}) {
  const normalizedTaskKey = toProjectKey(taskKey || '');
  const task = normalizedTaskKey ? await taskClient.getTask(normalizedTaskKey) : null;
  const resolvedProjectKey = toProjectKey(projectKey || task?.task_key?.split('-')[0] || '');
  const resolvedEngine = normalizeString(engine || task?.engine || 'claude-code').toLowerCase();
  const resolvedBranchName =
    normalizeString(branchName) ||
    normalizeString(task?.branch_name) ||
    normalizeString(task?.branch) ||
    defaultBranchName({ projectKey: resolvedProjectKey, taskKey: normalizedTaskKey });

  const resolvedRepoUrl =
    normalizeString(task?.repo || task?.project?.repoUrl) ||
    normalizeString(
      (await taskClient.listProjects()).find(
        (project) => toProjectKey(project?.key || project?.projectKey || '') === resolvedProjectKey,
      )?.repoUrl,
    );

  const projectPath = await resolveProjectPath({
    projectKey: resolvedProjectKey,
    repoUrl: resolvedRepoUrl,
    mappingPath,
    repoRoots,
  });

  const worktreePath = await ensureWorktree({
    projectPath,
    projectKey: resolvedProjectKey,
    branchName: resolvedBranchName,
    worktreeRoot,
  });

  await syncLocalEnvFiles(projectPath, worktreePath);

  const promptText = renderDispatchPrompt({
    taskKey: normalizedTaskKey,
    projectKey: resolvedProjectKey,
    branchName: resolvedBranchName,
    engine: resolvedEngine,
    objective: action || 'implement',
    worktreePath,
    projectPath,
    askHint: normalizeString(askHint),
    insightPrompt: decodePromptMetadata(insightPromptB64),
  });

  const launch = await launchDispatchProcess({
    engine: resolvedEngine,
    worktreePath,
    promptText,
    mcpUrl: normalizeString(mcpUrl || taskClient?.mcpUrl),
  });

  return {
    ok: true,
    task_key: normalizedTaskKey || null,
    project_key: resolvedProjectKey,
    engine: resolvedEngine,
    action: action || 'implement',
    project_path: projectPath,
    worktree_path: worktreePath,
    branch_name: resolvedBranchName,
    pid: launch.pid,
    prompt_path: launch.promptPath,
    log_path: launch.logPath,
    mcp_config_path: launch.mcpConfigPath,
  };
}
