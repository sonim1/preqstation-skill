import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const canonicalSkillPath = path.join(repoRoot, 'SKILL.md');
const packagedSkillPath = path.join(repoRoot, 'skills', 'preqstation', 'SKILL.md');

const canonicalSkill = await fs.readFile(canonicalSkillPath, 'utf8');
await fs.writeFile(packagedSkillPath, canonicalSkill);
