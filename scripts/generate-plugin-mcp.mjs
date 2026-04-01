import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { serializePluginMcpConfig } from '../src/dispatch/plugin-mcp-config.mjs';

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPluginRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const pluginRoot = path.resolve(readOption(args, '--plugin-root') || defaultPluginRoot);
const outputPath = path.resolve(
  readOption(args, '--output') || path.join(pluginRoot, '.claude-plugin', 'mcp.json'),
);

const content = serializePluginMcpConfig({
  pluginRoot,
  callbackPort: process.env.PREQSTATION_OAUTH_CALLBACK_PORT || '45451',
  pollIntervalMs: process.env.PREQ_POLL_INTERVAL_MS || '5000',
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, content, 'utf8');
