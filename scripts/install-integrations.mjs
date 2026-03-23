#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function parseInstallArgs(argv) {
  let targetDir = path.join(homedir(), '.claude', 'commands', 'preqstation');

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case '--target-dir': {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error('--target-dir requires a value');
        }

        targetDir = path.resolve(value);
        index += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return { targetDir };
}

export function renderClaudeCommand(template, { cliPath }) {
  return template.replaceAll('__PREQSTATION_CLI_PATH__', cliPath);
}

export function installClaudeCommands({
  sourceDir,
  targetDir,
  cliPath,
} = {}) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..');
  const resolvedSourceDir = sourceDir ?? path.join(repoRoot, 'integrations', 'claude', 'commands');
  const resolvedTargetDir =
    targetDir ?? path.join(homedir(), '.claude', 'commands', 'preqstation');
  const resolvedCliPath = cliPath ?? path.join(repoRoot, 'scripts', 'preqstation-cli.mjs');

  mkdirSync(resolvedTargetDir, { recursive: true });

  const writtenPaths = [];

  for (const entry of readdirSync(resolvedSourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    const sourcePath = path.join(resolvedSourceDir, entry.name);
    const targetPath = path.join(resolvedTargetDir, entry.name);
    const template = readFileSync(sourcePath, 'utf8');
    const rendered = renderClaudeCommand(template, { cliPath: resolvedCliPath });
    writeFileSync(targetPath, rendered, 'utf8');
    writtenPaths.push(targetPath);
  }

  return writtenPaths;
}

export function runInstaller(argv = process.argv.slice(2)) {
  const { targetDir } = parseInstallArgs(argv);
  const writtenPaths = installClaudeCommands({ targetDir });
  process.stdout.write(`Installed ${writtenPaths.length} Claude commands to ${targetDir}\n`);

  for (const writtenPath of writtenPaths) {
    process.stdout.write(`${writtenPath}\n`);
  }

  return 0;
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  try {
    process.exitCode = runInstaller();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
