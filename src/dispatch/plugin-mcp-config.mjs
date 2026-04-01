import path from 'node:path';

const DEFAULT_CALLBACK_PORT = '45451';
const DEFAULT_POLL_INTERVAL_MS = '5000';

export function resolveDispatchChannelEntrypoint(pluginRoot) {
  return path.join(
    path.resolve(pluginRoot),
    'src',
    'dispatch',
    'preq-dispatch-channel-server.mjs',
  );
}

export function buildPluginMcpConfig({
  pluginRoot,
  callbackPort = DEFAULT_CALLBACK_PORT,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}) {
  return {
    mcpServers: {
      'preq-dispatch-channel': {
        command: 'node',
        args: [resolveDispatchChannelEntrypoint(pluginRoot)],
        env: {
          PREQSTATION_OAUTH_CALLBACK_PORT: String(callbackPort),
          PREQ_POLL_INTERVAL_MS: String(pollIntervalMs),
        },
      },
    },
  };
}

export function serializePluginMcpConfig(options) {
  return `${JSON.stringify(buildPluginMcpConfig(options), null, 2)}\n`;
}
