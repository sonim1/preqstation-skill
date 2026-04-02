import test from 'node:test';
import assert from 'node:assert/strict';

import {
  openAuthorizationUrlInBrowser,
} from '../../src/preq/preq-oauth-provider.mjs';

test('openAuthorizationUrlInBrowser launches open on macOS', async () => {
  const calls = [];
  const opened = await openAuthorizationUrlInBrowser('https://example.com/auth', {
    platform: 'darwin',
    spawnImpl(command, args, options) {
      calls.push({ command, args, options });
      return {
        on() {},
        unref() {},
      };
    },
  });

  assert.equal(opened, true);
  assert.deepEqual(calls, [
    {
      command: 'open',
      args: ['https://example.com/auth'],
      options: { detached: true, stdio: 'ignore' },
    },
  ]);
});

test('openAuthorizationUrlInBrowser launches xdg-open on linux', async () => {
  const calls = [];
  const opened = await openAuthorizationUrlInBrowser('https://example.com/auth', {
    platform: 'linux',
    spawnImpl(command, args, options) {
      calls.push({ command, args, options });
      return {
        on() {},
        unref() {},
      };
    },
  });

  assert.equal(opened, true);
  assert.deepEqual(calls, [
    {
      command: 'xdg-open',
      args: ['https://example.com/auth'],
      options: { detached: true, stdio: 'ignore' },
    },
  ]);
});

test('openAuthorizationUrlInBrowser launches start on Windows', async () => {
  const calls = [];
  const opened = await openAuthorizationUrlInBrowser('https://example.com/auth', {
    platform: 'win32',
    spawnImpl(command, args, options) {
      calls.push({ command, args, options });
      return {
        on() {},
        unref() {},
      };
    },
  });

  assert.equal(opened, true);
  assert.deepEqual(calls, [
    {
      command: 'cmd',
      args: ['/c', 'start', '', 'https://example.com/auth'],
      options: { detached: true, stdio: 'ignore' },
    },
  ]);
});

test('openAuthorizationUrlInBrowser returns false on unsupported platforms', async () => {
  const calls = [];
  const opened = await openAuthorizationUrlInBrowser('https://example.com/auth', {
    platform: 'freebsd',
    spawnImpl(command, args, options) {
      calls.push({ command, args, options });
      return {
        on() {},
        unref() {},
      };
    },
  });

  assert.equal(opened, false);
  assert.deepEqual(calls, []);
});
