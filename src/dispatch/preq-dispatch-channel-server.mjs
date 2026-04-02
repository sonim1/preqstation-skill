#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  buildQueuedTaskChannelEvent,
  selectQueuedTasks,
  summarizeQueuedTaskSelection,
} from './channel-helpers.mjs';
import {
  DEFAULT_PROJECT_MAP_PATH,
  DEFAULT_REPO_ROOTS,
  DEFAULT_WORKTREE_ROOT,
  dispatchTask as launchDispatchTask,
} from './dispatch-runtime.mjs';
import {
  createPreqMcpTaskClient,
  DEFAULT_MCP_CALLBACK_PORT,
  PREQ_ENGINES,
  resolvePreqMcpUrl,
} from '../preq/preq-mcp-client.mjs';

const PREQ_CHANNEL_SERVER_VERSION = '0.1.19';
const DEFAULT_CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude.json');

function readPollIntervalMs() {
  const raw = process.env.PREQ_POLL_INTERVAL_MS?.trim();
  const value = raw ? Number.parseInt(raw, 10) : 5000;
  return Number.isFinite(value) && value > 0 ? value : 5000;
}

function readCallbackPort() {
  const raw = process.env.PREQSTATION_OAUTH_CALLBACK_PORT?.trim();
  const value = raw ? Number.parseInt(raw, 10) : DEFAULT_MCP_CALLBACK_PORT;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MCP_CALLBACK_PORT;
}

function shouldDebugQueueSelection() {
  return normalizeString(process.env.PREQSTATION_DEBUG_QUEUE).toLowerCase() === '1';
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readConfiguredHttpUrl(serverConfig) {
  if (!serverConfig || typeof serverConfig !== 'object') {
    return '';
  }

  if (serverConfig.type === 'http' && typeof serverConfig.url === 'string') {
    return normalizeString(serverConfig.url);
  }

  if (typeof serverConfig.url === 'string') {
    return normalizeString(serverConfig.url);
  }

  return '';
}

function parentPaths(startPath) {
  const resolved = path.resolve(startPath);
  const paths = [];
  let current = resolved;

  while (true) {
    paths.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      return paths;
    }
    current = parent;
  }
}

export function readClaudeConfiguredPreqMcpUrl({
  cwd = process.cwd(),
  configPath = DEFAULT_CLAUDE_CONFIG_PATH,
  serverName = 'preqstation',
} = {}) {
  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    const projectConfigs =
      parsed?.projects && typeof parsed.projects === 'object' ? parsed.projects : {};

    for (const candidatePath of parentPaths(cwd)) {
      const projectConfig = projectConfigs[candidatePath];
      const projectUrl = readConfiguredHttpUrl(projectConfig?.mcpServers?.[serverName]);
      if (projectUrl) {
        return projectUrl;
      }
    }

    const rootUrl = readConfiguredHttpUrl(parsed?.mcpServers?.[serverName]);
    if (rootUrl) {
      return rootUrl;
    }

    const discoveredUrls = new Set();
    for (const projectConfig of Object.values(projectConfigs)) {
      const url = readConfiguredHttpUrl(projectConfig?.mcpServers?.[serverName]);
      if (url) {
        discoveredUrls.add(url);
      }
    }

    if (discoveredUrls.size === 1) {
      return Array.from(discoveredUrls)[0];
    }
  } catch {}

  return '';
}

function resolveMcpUrl() {
  const explicit = normalizeString(process.env.PREQSTATION_MCP_URL);
  if (explicit) {
    return resolvePreqMcpUrl(explicit);
  }

  const configured = readClaudeConfiguredPreqMcpUrl();
  if (configured) {
    return resolvePreqMcpUrl(configured);
  }

  const legacyApiUrl = normalizeString(process.env.PREQSTATION_API_URL);
  if (legacyApiUrl) {
    return resolvePreqMcpUrl(`${legacyApiUrl.replace(/\/$/, '')}/mcp`);
  }

  throw new Error(
    'PREQSTATION_MCP_URL is required unless Claude already has a preqstation MCP server configured.',
  );
}

export function createChannelInstructions() {
  return [
    'Messages arrive as <channel source="preq_dispatch_channel" ...>.',
    'These events represent PREQ tasks that were queued for dispatch from the web app.',
    'This session acts only as a dispatch runtime.',
    'Do not implement work in this dispatcher session.',
    'When a preq_dispatch_channel event arrives, call dispatch_task exactly once using the event metadata.',
    'The dispatch_task tool prepares the isolated worktree and launches the requested engine.',
    'Treat task_key, project_key, action, engine, and branch_name as the source of truth.',
    'No reply is expected from this one-way channel.',
  ].join(' ');
}

export function isCallbackPortInUseError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /EADDRINUSE/i.test(message);
}

export function describeDispatchChannelError(error, oauthCallbackPort) {
  if (isCallbackPortInUseError(error)) {
    return [
      `OAuth callback port ${oauthCallbackPort} is already in use.`,
      'Another PREQ dispatch session is probably running.',
      'Stop the other process or set PREQSTATION_OAUTH_CALLBACK_PORT to a free port.',
    ].join(' ');
  }

  return error instanceof Error ? error.message : String(error ?? '');
}

export function createSerializedPollRunner(pollOnce, onError) {
  let activePoll = null;

  return function runPoll() {
    if (activePoll) {
      return activePoll;
    }

    activePoll = (async () => {
      try {
        return await pollOnce();
      } catch (error) {
        onError(error);
        throw error;
      } finally {
        activePoll = null;
      }
    })();

    return activePoll;
  };
}

export async function emitQueuedTaskEvents({
  mcp,
  tasks,
  inflightTaskKeys,
}) {
  const queuedTasks = selectQueuedTasks(tasks, inflightTaskKeys);

  for (const task of queuedTasks) {
    const taskKey = task.task_key || task.taskKey || task.id;
    inflightTaskKeys.add(taskKey);
    await mcp.server.notification({
      method: 'notifications/claude/channel',
      params: buildQueuedTaskChannelEvent(task),
    });
  }

  return queuedTasks.length;
}

export async function createPreqChannelServer({
  mcpUrl = resolveMcpUrl(),
  preqTaskClient,
  oauthCachePath = process.env.PREQSTATION_OAUTH_CACHE_PATH?.trim() || undefined,
  oauthCallbackPort = readCallbackPort(),
  pollIntervalMs = readPollIntervalMs(),
  dispatchTaskImpl = launchDispatchTask,
  logger = console,
} = {}) {
  const inflightTaskKeys = new Set();
  const launchedTaskKeys = new Set();
  const taskClient =
    preqTaskClient ||
    createPreqMcpTaskClient({
      mcpUrl,
      oauthCachePath,
      callbackPort: oauthCallbackPort,
      logger,
    });
  const mcp = new McpServer(
    { name: 'preqstation-dispatch-channel', version: PREQ_CHANNEL_SERVER_VERSION },
    {
      capabilities: { tools: {}, experimental: { 'claude/channel': {} } },
      instructions: createChannelInstructions(),
    },
  );

  mcp.registerTool(
    'dispatch_task',
    {
      title: 'Dispatch PREQSTATION task',
      description:
        'Prepare an isolated worktree and launch the requested engine for a queued PREQSTATION task.',
      inputSchema: {
        task_key: z.string().trim().min(1),
        project_key: z.string().trim().min(1).optional(),
        action: z.string().trim().min(1).optional(),
        engine: z.enum(PREQ_ENGINES).optional(),
        branch_name: z.string().trim().min(1).optional(),
      },
    },
    async ({ task_key, project_key, action, engine, branch_name }) => {
      const taskKey = task_key.trim().toUpperCase();

      if (launchedTaskKeys.has(taskKey)) {
        const message = `Task ${taskKey} was already dispatched in this session.`;
        logger.error(`[preq-dispatch-channel] ${message}`);
        return {
          content: [{ type: 'text', text: message }],
        };
      }

      try {
        const result = await dispatchTaskImpl({
          taskClient,
          taskKey,
          projectKey: project_key,
          action,
          engine,
          branchName: branch_name,
          mcpUrl,
          mappingPath:
            process.env.PREQSTATION_PROJECT_MAP_PATH?.trim() || DEFAULT_PROJECT_MAP_PATH,
          repoRoots: process.env.PREQSTATION_REPO_ROOTS?.trim() || DEFAULT_REPO_ROOTS,
          worktreeRoot:
            process.env.PREQSTATION_WORKTREE_ROOT?.trim() || DEFAULT_WORKTREE_ROOT,
        });

        launchedTaskKeys.add(taskKey);
        logger.error(
          `[preq-dispatch-channel] launched ${result.engine} for ${result.task_key} in ${result.worktree_path} (pid ${result.pid})`,
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        inflightTaskKeys.delete(taskKey);
        const message = error instanceof Error ? error.message : String(error ?? 'Dispatch failed.');
        logger.error(`[preq-dispatch-channel] dispatch failed for ${taskKey}: ${message}`);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );

  await mcp.connect(new StdioServerTransport());
  logger.error(`[preq-dispatch-channel] connected to ${mcpUrl}`);

  let pollingStopped = false;

  const handlePollError = (error) => {
    logger.error(`[preq-dispatch-channel] ${describeDispatchChannelError(error, oauthCallbackPort)}`);

    if (pollingStopped || !isCallbackPortInUseError(error)) {
      return;
    }

    pollingStopped = true;
    clearInterval(interval);
    logger.error(
      '[preq-dispatch-channel] polling stopped until the callback port conflict is resolved',
    );
  };

  const pollOnce = async () => {
    const tasks = await taskClient.listDispatchTasks();
    if (shouldDebugQueueSelection()) {
      const summary = summarizeQueuedTaskSelection(tasks, inflightTaskKeys)
        .map(({ taskKey, reason }) => `${taskKey || 'unknown'}:${reason}`)
        .join(', ');
      logger.error(
        `[preq-dispatch-channel] polled ${tasks.length} task(s); queue selection => ${summary || 'none'}`,
      );
    }
    const count = await emitQueuedTaskEvents({ mcp, tasks, inflightTaskKeys });
    if (count > 0) {
      logger.error(`[preq-dispatch-channel] emitted ${count} queued task event(s)`);
    }
    return count;
  };

  const runPoll = createSerializedPollRunner(pollOnce, handlePollError);

  const interval = setInterval(() => {
    runPoll().catch(() => {});
  }, pollIntervalMs);

  interval.unref?.();

  runPoll()
    .then((count) => {
      if (count === 0) {
        logger.error('[preq-dispatch-channel] watching for queued Claude Code dispatch tasks');
      }
    })
    .catch(() => {});

  return {
    mcp,
    pollOnce: runPoll,
    async close() {
      clearInterval(interval);
      await Promise.allSettled([mcp.close(), taskClient.close?.()]);
    },
  };
}

export async function main() {
  const server = await createPreqChannelServer();
  let shuttingDown = false;

  const shutdown = (signal) => {
    const exitCode = signal === 'SIGINT' ? 130 : 143;

    if (shuttingDown) {
      process.exit(exitCode);
    }

    shuttingDown = true;
    console.error(`[preq-dispatch-channel] shutting down (${signal})`);

    const forceExitTimer = setTimeout(() => {
      console.error('[preq-dispatch-channel] forcing exit');
      process.exit(exitCode);
    }, 1000);
    forceExitTimer.unref?.();

    void server.close().finally(() => {
      clearTimeout(forceExitTimer);
      process.exit(exitCode);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

const isMainModule = import.meta.url === new URL(process.argv[1], 'file://').href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
