---
description: "Show how to update the PREQSTATION Claude plugin or OpenClaw runtime"
---

Help the user update the installed PREQSTATION surface they are actually using.

Default to the Claude Code plugin path unless the user clearly says they are on OpenClaw.

For Claude Code plugin users, show:

```bash
claude plugin marketplace update preqstation
claude plugin update preqstation@preqstation
```

Explain that this updates the marketplace source and then refreshes the installed plugin from that source.

If the user asks how to confirm the installed version, suggest:

```bash
claude plugin list
```

For OpenClaw users, explain that this repository does not update the OpenClaw runtime through `claude plugin update`.
Show the separate repo/runtime update flow instead:

```bash
cd /path/to/preqstation-openclaw
git pull origin main
npm install
```

Then remind the user to restart the OpenClaw dispatch host or session.

If the user is unsure which path they are on:

- Claude Code plugin users use `preqstation@preqstation`
- OpenClaw users update the separate `preqstation-openclaw` checkout
