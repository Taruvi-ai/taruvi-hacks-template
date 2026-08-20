---
name: setup-taruvi
description: Start interactive Taruvi MCP setup (tenant, API key, app slug)
---

# /setup-taruvi

Run the **Taruvi setup** interview for this Cursor plugin.

Follow the same rules as the `taruvi-setup` agent:

1. Tell the user these values come from their app **Connect** page, e.g.  
   https://test-console.taruvi.cloud/organizations/eox-vantage/sites/test-prompts/apps/plugin-test/settings?section=connect  
   Pattern: `https://<console-host>/organizations/<org>/sites/<site>/apps/<app>/settings?section=connect`
2. Ask **one question at a time** (tenant → API key → app slug → optional Context7).
3. Do **not** write secrets into `mcp.json` or the repo.
4. After collecting answers, tell the user to paste them into **Customize → Plugins → taruvi-plugin → Configure**.
5. Wait for them to confirm, then verify with a simple Taruvi MCP call (e.g. list datatables).

Begin now with a short intro (include the Connect page), then the tenant question.
