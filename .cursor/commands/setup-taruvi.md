---
name: setup-taruvi
description: Start interactive Taruvi MCP setup (tenant, API key, app slug)
---

# /setup-taruvi

Run the **Taruvi setup** interview for this Cursor plugin.

Follow the same rules as the `taruvi-setup` agent:

1. Point the user at their app **Connect** page, built from their own org / site / app:  
   `https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`  
   Don't guess slugs to make it clickable — give the pattern, or Console → org → site → app → **Settings → Connect**.
2. Ask for **all three values in one message**: tell them to click **Generate API Key**, then copy
   the **Environment** tab block (`TARUVI_SITE_URL`, `TARUVI_APP_SLUG`, `TARUVI_API_KEY`) and paste
   all three lines back. Optional Context7 key, or `skip`.
3. Do **not** write secrets into `mcp.json` or the repo.
4. After the paste, tell the user to enter the values in **Customize → Plugins → taruvi-plugin → Configure** (`TARUVI_TENANT` is the subdomain of `TARUVI_SITE_URL`).
5. Wait for them to confirm, then verify with a simple Taruvi MCP call (e.g. list datatables).

Begin now with a short intro and that single ask.
