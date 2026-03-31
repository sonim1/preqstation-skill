#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { buildQueuedTaskChannelEvent, selectQueuedTasks } from './channel-helpers.mjs';
import {
  createPreqMcpTaskClient,
  DEFAULT_MCP_CALLBACK_PORT,
  resolvePreqMcpUrl,
} from '../preq/preq-mcp-client.mjs';

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

function resolveMcpUrl() {
  const explicit = process.env.PREQSTATION_MCP_URL?.trim();
  if (explicit) {
    return resolvePreqMcpUrl(explicit);
  }

  const legacyApiUrl = process.env.PREQSTATION_API_URL?.trim();
  if (legacyApiUrl) {
    return resolvePreqMcpUrl(`${legacyApiUrl.replace(/\/$/, '')}/mcp`);
  }

  throw new Error('PREQSTATION_MCP_URL is required.');
}

export function createChannelInstructions() {
  return [
    'Messages arrive as <channel source="preq_dispatch_channel" ...>.',
    'These events represent PREQ tasks that were queued for dispatch from the web app.',
    'This session acts only as a dispatch runtime.',
    'Do not implement work in this dispatcher session.',
    'Use the preqstation-dispatch skill or your dispatcher workflow to launch the requested engine in an isolated worktree.',
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

export async function emitQueuedTaskEvents({
  mcp,
  tasks,
  inflightTaskKeys,
}) {
  const queuedTasks = selectQueuedTasks(tasks, inflightTaskKeys);

  for (const task of queuedTasks) {
    const taskKey = task.task_key || task.taskKey || task.id;
    inflightTaskKeys.add(taskKey);
    await mcp.notification({
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
  logger = console,
} = {}) {
  const inflightTaskKeys = new Set();
  const taskClient =
    preqTaskClient ||
    createPreqMcpTaskClient({
      mcpUrl,
      oauthCachePath,
      callbackPort: oauthCallbackPort,
      logger,
    });
  const mcp = new Server(
    { name: 'preqstation-dispatch-channel', version: '0.1.0' },
    {
      capabilities: { experimental: { 'claude/channel': {} } },
      instructions: createChannelInstructions(),
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
    const tasks = await taskClient.listTodoTasks();
    const count = await emitQueuedTaskEvents({ mcp, tasks, inflightTaskKeys });
    if (count > 0) {
      logger.error(`[preq-dispatch-channel] emitted ${count} queued task event(s)`);
    }
    return count;
  };

  const interval = setInterval(() => {
    pollOnce().catch(handlePollError);
  }, pollIntervalMs);

  interval.unref?.();

  pollOnce()
    .then((count) => {
      if (count === 0) {
        logger.error('[preq-dispatch-channel] watching for queued Claude Code dispatch tasks');
      }
    })
    .catch(handlePollError);

  return {
    mcp,
    pollOnce,
    async close() {
      clearInterval(interval);
      await taskClient.close?.();
    },
  };
}

export async function main() {
  const server = await createPreqChannelServer();
  const shutdown = () => {
    void server.close();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const isMainModule = import.meta.url === new URL(process.argv[1], 'file://').href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
