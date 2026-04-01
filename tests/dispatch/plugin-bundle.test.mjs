import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

test('bundled dispatch entrypoint starts without installed node_modules', async () => {
  const bundlePath = fileURLToPath(
    new URL('../../dist/preq-dispatch-channel-server.mjs', import.meta.url),
  );
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preqstation-bundle-home-'));

  await assert.rejects(
    execFileAsync('node', [bundlePath], {
      cwd: homeDir,
      env: {
        ...process.env,
        HOME: homeDir,
      },
      timeout: 5000,
    }),
    (error) => {
      assert.equal(typeof error.stderr, 'string');
      assert.match(
        error.stderr,
        /PREQSTATION_MCP_URL is required unless Claude already has a preqstation MCP server configured\./,
      );
      assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND/);
      assert.doesNotMatch(error.stderr, /Cannot find package '@modelcontextprotocol\/sdk'/);
      return true;
    },
  );
});
