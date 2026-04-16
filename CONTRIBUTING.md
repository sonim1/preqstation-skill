# Contributing

Thanks for contributing to `preqstation-skill`.

## Development Setup

```bash
npm install
```

Useful commands:

```bash
npm test
npm run sync:skills
npm run verify:release
```

## Repository Rules

- Keep behavior changes small and explicit.
- Treat root `SKILL.md` as the canonical skill source.
- Generate `skills/preqstation/SKILL.md` from the canonical copy instead of editing both manually.
- `.claude-plugin/plugin.json` is the shipping plugin version. `package.json` mirrors it for local tooling.
- This repository is not intended to be published as a general npm package.

## Docs and Packaging

When you change install, update, or setup behavior:

- update `README.md`
- update the matching install doc under `docs/`
- update the related command doc under `commands/`

## Contributor-Only Claude Workflows

These flows are for contributors working inside this repository. They are not the public install path.

Local plugin loading:

```bash
claude --plugin-dir /absolute/path/to/preqstation-skill
```

## Version Bumps

When preparing a release:

- bump `.claude-plugin/plugin.json`
- bump `package.json`
- update `package-lock.json`
- run `npm run sync:skills`
- run `npm run verify:release`
- update `CHANGELOG.md`

## Pull Requests

Good pull requests are:

- focused on one behavior change
- tested locally
- clear about whether they change stable, experimental, fallback, or legacy surfaces
