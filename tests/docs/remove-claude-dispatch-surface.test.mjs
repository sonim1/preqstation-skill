import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('repository no longer ships Claude custom dispatch files or scripts', async () => {
  const packageManifest = JSON.parse(
    await fs.readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );

  assert.equal(packageManifest.scripts['build:dispatch-bundle'], undefined);
  assert.equal(packageManifest.scripts['start:dispatch-channel'], undefined);
  assert.doesNotMatch(packageManifest.description, /dispatch runtime/i);

  await assert.rejects(
    fs.access(new URL('../../mcp-dev.json', import.meta.url)),
    /ENOENT/,
  );
  await assert.rejects(
    fs.access(new URL('../../docs/install-dispatch-channel.md', import.meta.url)),
    /ENOENT/,
  );
  await assert.rejects(
    fs.access(new URL('../../dist/preq-dispatch-channel-server.mjs', import.meta.url)),
    /ENOENT/,
  );
});

test('public docs and helper commands do not mention the removed Claude dispatch surface', async () => {
  const [readme, pluginDoc, helpDoc, setupDoc, statusDoc, updateDoc] = await Promise.all([
    fs.readFile(new URL('../../README.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/install-claude-plugin.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../commands/help.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../commands/setup.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../commands/status.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../commands/update.md', import.meta.url), 'utf8'),
  ]);

  for (const doc of [readme, pluginDoc, helpDoc, setupDoc, statusDoc, updateDoc]) {
    assert.doesNotMatch(doc, /Hand off test/i);
    assert.doesNotMatch(doc, /install-dispatch-channel\.md/i);
    assert.doesNotMatch(doc, /mcp-dev\.json/i);
    assert.doesNotMatch(doc, /preq-dispatch-channel/i);
    assert.doesNotMatch(doc, /dangerously-load-development-channels/i);
    assert.doesNotMatch(doc, /PREQSTATION_SKILL_ROOT/i);
    assert.doesNotMatch(doc, /pkill -f preq-dispatch-channel-server/i);
  }
});
