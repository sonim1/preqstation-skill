# Authentication

OAuth starts when the client first makes a real request to `/mcp`.

- Codex often starts login during `mcp add` because it probes the server immediately.
- Claude Code usually stores the server first and starts OAuth on first real use.
- If Claude keeps asking you to authenticate `preqstation` after restarts, check for multiple local or project-scoped `preqstation` entries and prefer a single user-scoped registration.
