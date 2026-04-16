import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const USER_SCOPE_COMMAND =
  /claude mcp add -s user --transport http preqstation https:\/\/<your-domain>\/mcp/;

test('Claude-facing docs standardize on a single user-scoped preqstation MCP command', async () => {
  const [readme, pluginDoc, workerDoc, canonicalSkill] = await Promise.all([
    fs.readFile(new URL('../../README.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/install-claude-plugin.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/install-claude-code.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../SKILL.md', import.meta.url), 'utf8'),
  ]);

  assert.match(readme, USER_SCOPE_COMMAND);
  assert.match(pluginDoc, USER_SCOPE_COMMAND);
  assert.match(workerDoc, USER_SCOPE_COMMAND);
  assert.match(canonicalSkill, USER_SCOPE_COMMAND);
});

test('plugin install docs route MCP registration through /preqstation:setup and mention duplicate-scope auth issues', async () => {
  const [readme, pluginDoc, setupCommand] = await Promise.all([
    fs.readFile(new URL('../../README.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../docs/install-claude-plugin.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../commands/setup.md', import.meta.url), 'utf8'),
  ]);

  assert.match(pluginDoc, /\/preqstation:setup[\s\S]*add or verify/i);
  assert.match(readme, /\/preqstation:setup[\s\S]*add or verify/i);
  assert.match(pluginDoc, /multiple local or project-scoped `preqstation` entries/i);
  assert.match(setupCommand, /prefer a single user-scoped PREQ MCP registration/i);
});

test('Gemini docs and skill include a concrete MCP install path', async () => {
  const [geminiDoc, canonicalSkill] = await Promise.all([
    fs.readFile(new URL('../../docs/install-codex-gemini.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../SKILL.md', import.meta.url), 'utf8'),
  ]);

  assert.match(
    geminiDoc,
    /gemini mcp add --scope user --transport http preqstation https:\/\/<your-domain>\/mcp/,
  );
  assert.match(geminiDoc, /gemini mcp list/);
  assert.match(
    canonicalSkill,
    /Gemini CLI: `gemini mcp add --scope user --transport http preqstation https:\/\/<your-domain>\/mcp`/,
  );
});
