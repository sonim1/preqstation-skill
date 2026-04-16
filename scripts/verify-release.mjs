import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const packageManifestPath = path.join(repoRoot, 'package.json');
const packageLockPath = path.join(repoRoot, 'package-lock.json');
const pluginManifestPath = path.join(repoRoot, '.claude-plugin', 'plugin.json');
const canonicalSkillPath = path.join(repoRoot, 'SKILL.md');
const packagedSkillPath = path.join(repoRoot, 'skills', 'preqstation', 'SKILL.md');

function readJson(filePath) {
  return fs.readFile(filePath, 'utf8').then((raw) => JSON.parse(raw));
}

function fail(message) {
  throw new Error(message);
}

const packageManifest = await readJson(packageManifestPath);
const packageLock = await readJson(packageLockPath);
const pluginManifest = await readJson(pluginManifestPath);
const canonicalSkill = await fs.readFile(canonicalSkillPath, 'utf8');
const packagedSkill = await fs.readFile(packagedSkillPath, 'utf8');

const packageLockVersion = packageLock?.version;
const packageLockRootVersion = packageLock?.packages?.['']?.version;

const expectedVersion = packageManifest.version;

if (pluginManifest.version !== expectedVersion) {
  fail(
    `plugin.json version ${pluginManifest.version} does not match package.json version ${expectedVersion}.`,
  );
}

if (packageLockVersion !== expectedVersion || packageLockRootVersion !== expectedVersion) {
  fail(
    `package-lock.json version ${packageLockVersion}/${packageLockRootVersion} does not match package.json version ${expectedVersion}.`,
  );
}

if (canonicalSkill !== packagedSkill) {
  fail('skills/preqstation/SKILL.md is out of sync with the canonical root SKILL.md.');
}

console.log(`release verification passed for ${expectedVersion}`);
