import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';

import { waitForOAuthAuthorizationCode } from './preq-oauth-callback-server.mjs';
import { DEFAULT_OAUTH_CACHE_PATH, FileOAuthClientProvider } from './preq-oauth-provider.mjs';

export const PREQ_ENGINES = ['claude-code', 'codex', 'gemini-cli'];
export const DEFAULT_MCP_CALLBACK_HOST = '127.0.0.1';
export const DEFAULT_MCP_CALLBACK_PORT = 45451;
export const DEFAULT_MCP_CALLBACK_PATH = '/callback';

function taskIdentity(task) {
  return task?.task_key || task?.taskKey || task?.id || null;
}

function firstTextContent(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  const firstText = content.find((item) => item?.type === 'text' && typeof item.text === 'string');
  if (!firstText?.text) {
    throw new Error('preq_list_tasks returned no text content.');
  }
  return firstText.text;
}

export function createOAuthRedirectUrl({
  host = DEFAULT_MCP_CALLBACK_HOST,
  port = DEFAULT_MCP_CALLBACK_PORT,
  pathname = DEFAULT_MCP_CALLBACK_PATH,
} = {}) {
  return new URL(`http://${host}:${port}${pathname}`);
}

export function resolvePreqMcpUrl(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value) {
    throw new Error('PREQSTATION_MCP_URL is required.');
  }
  return new URL(value).toString();
}

export function readTasksFromPreqListTasksResult(result) {
  const payload = JSON.parse(firstTextContent(result));
  return Array.isArray(payload?.tasks) ? payload.tasks : [];
}

export async function fetchTodoTasksViaMcp({
  callTool,
  engines = PREQ_ENGINES,
  limit = 200,
}) {
  const merged = new Map();

  for (const engine of engines) {
    const result = await callTool({
      name: 'preq_list_tasks',
      arguments: {
        status: 'todo',
        engine,
        limit,
      },
    });

    for (const task of readTasksFromPreqListTasksResult(result)) {
      const identity = taskIdentity(task);
      if (!identity || merged.has(identity)) continue;
      merged.set(identity, task);
    }
  }

  return Array.from(merged.values());
}

async function connectClientWithOAuth({
  client,
  mcpUrl,
  authProvider,
  callbackHost,
  callbackPort,
  callbackPath,
  logger,
}) {
  let transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    authProvider,
  });

  try {
    await client.connect(transport);
    return transport;
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      throw error;
    }
  }

  const authorizationCode = await waitForOAuthAuthorizationCode({
    host: callbackHost,
    port: callbackPort,
    pathname: callbackPath,
    logger,
  });

  await transport.finishAuth(authorizationCode);
  transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    authProvider,
  });
  await client.connect(transport);
  return transport;
}

export function createPreqMcpTaskClient({
  mcpUrl,
  authProvider,
  oauthCachePath = DEFAULT_OAUTH_CACHE_PATH,
  callbackHost = DEFAULT_MCP_CALLBACK_HOST,
  callbackPort = DEFAULT_MCP_CALLBACK_PORT,
  callbackPath = DEFAULT_MCP_CALLBACK_PATH,
  logger = console,
} = {}) {
  const resolvedMcpUrl = resolvePreqMcpUrl(mcpUrl);
  const provider =
    authProvider ||
    new FileOAuthClientProvider({
      cachePath: oauthCachePath,
      redirectUrl: createOAuthRedirectUrl({
        host: callbackHost,
        port: callbackPort,
        pathname: callbackPath,
      }),
      logger,
    });

  let client = null;
  let transport = null;

  async function ensureConnection(forceReconnect = false) {
    if (forceReconnect && transport) {
      try {
        await transport.close();
      } catch {}
      client = null;
      transport = null;
    }

    if (client && transport) {
      return { client, transport };
    }

    client = new Client(
      {
        name: 'preqstation-dispatch-channel',
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    );

    transport = await connectClientWithOAuth({
      client,
      mcpUrl: resolvedMcpUrl,
      authProvider: provider,
      callbackHost,
      callbackPort,
      callbackPath,
      logger,
    });

    return { client, transport };
  }

  async function callTool(params) {
    const connection = await ensureConnection();

    try {
      return await connection.client.callTool(params);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        throw error;
      }

      logger.error('[preq-dispatch-channel] OAuth session expired. Reconnecting.');
      const refreshedConnection = await ensureConnection(true);
      return refreshedConnection.client.callTool(params);
    }
  }

  return {
    listTodoTasks() {
      return fetchTodoTasksViaMcp({ callTool });
    },
    async close() {
      if (!transport) return;
      try {
        await transport.close();
      } finally {
        client = null;
        transport = null;
      }
    },
  };
}
