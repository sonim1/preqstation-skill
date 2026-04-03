# Contributing

Thanks for contributing to `preqstation-skill`.

## Development Setup

```bash
npm install
```

Useful commands:

```bash
npm test
npm run build:dispatch-bundle
npm run sync:skills
npm run verify:release
```

## Repository Rules

- Keep behavior changes small and explicit.
- Treat root `SKILL.md` as the canonical skill source.
- Generate `skills/preqstation/SKILL.md` from the canonical copy instead of editing both manually.
- Keep `dist/preq-dispatch-channel-server.mjs` committed. It is an intentional plugin distribution artifact.
- `.claude-plugin/plugin.json` is the shipping plugin version. `package.json` mirrors it for local tooling.
- This repository is not intended to be published as a general npm package.

## Docs and Packaging

When you change install, update, setup, or dispatch behavior:

- update `README.md`
- update the matching install doc under `docs/`
- update the related command doc under `commands/`

When you change the dispatch runtime:

- run `npm test`
- rebuild the bundle with `npm run build:dispatch-bundle`
- confirm the committed `dist/` artifact matches the new source
- run `npm run verify:release`

## Contributor-Only Claude Workflows

These flows are for contributors working inside this repository. They are not the public install path.

Local plugin loading:

```bash
claude --plugin-dir /absolute/path/to/preqstation-skill
```

Direct repo dispatch-channel development:

```bash
export PREQSTATION_SKILL_ROOT="/absolute/path/to/preqstation-skill"
export PREQ_POLL_INTERVAL_MS="5000"
export PREQSTATION_OAUTH_CALLBACK_PORT="45451"
claude --mcp-config /absolute/path/to/preqstation-skill/mcp-dev.json --dangerously-skip-permissions --dangerously-load-development-channels server:preq-dispatch-channel
```

## Version Bumps

When preparing a release:

- bump `.claude-plugin/plugin.json`
- bump `package.json`
- update `package-lock.json`
- bump the runtime version constant in `src/dispatch/preq-dispatch-channel-server.mjs`
- run `npm run sync:skills`
- rebuild `dist/preq-dispatch-channel-server.mjs`
- run `npm run verify:release`
- update `CHANGELOG.md`

## Pull Requests

Good pull requests are:

- focused on one behavior change
- tested locally
- clear about whether they change stable, experimental, fallback, or legacy surfaces
