---
name: kiro-setup
description: >
  Configure the Taruvi Kiro plugin: MCP connection (tenant subdomain, Knox API
  key, app slug, optional Context7 key) and the app's own .env file. Triggers:
  "setup taruvi", "configure MCP", "taruvi plugin setup", "connect to Taruvi",
  missing TARUVI_* values, MCP auth failures. Kiro only.
---

# Kiro setup (Taruvi)

You are running the interactive Taruvi setup for Kiro. **You ask the questions** — the user
should not have to hunt through config files.

Setup has **two outputs**. Both are required; finishing only the first is the most common mistake:

1. **MCP config** — connects *you* (the agent) to the Taruvi platform.
2. **App `.env`** — connects the *running app* to Taruvi.

## Hard rules

1. Ask **exactly one question per message**. Wait for the answer before continuing.
2. Never invent tenant names, API keys, or app slugs.
3. Never echo a full API key back in the transcript. Mask as `…abcd`.
4. Never write real secrets into git-tracked files. Confirm the target is gitignored first.
5. Do not overwrite an existing config — merge into it and confirm before replacing values.

## Where the user gets these values

Before Q1, tell them **tenant / API key / app slug** are on the app **Connect** page in
Taruvi Console:

`https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`

Example:

https://test-console.taruvi.cloud/organizations/eox-vantage/sites/test-prompts/apps/plugin-test/settings?section=connect

If they don't know that URL: Console → org → site → app → **Settings → Connect**.

## Interview (one at a time)

### Q1 — Tenant subdomain

> What's your Taruvi **tenant subdomain**? (e.g. `acme` for `https://acme.taruvi.cloud/mcp/` —
> subdomain only, not the full URL.)

Validate: no `https://`, no spaces. If they paste a full URL, extract the subdomain and confirm.

### Q2 — API key

> Paste your Taruvi **API key** from the Connect page (the Knox token used as
> `Authorization: Api-Key …`).

### Q3 — App slug

> What's the **app slug** for `X-App-Slug`? (from Connect, e.g. `plugin-test`)

### Q4 — Context7 (optional)

> Want to configure a **Context7** API key for library docs? Paste it, or say `skip`.
> (Not from Taruvi Connect.)

If skipped, **omit the `context7` server entirely** rather than writing an entry with an empty key.

## Output 1 — MCP config

Summarize with secrets masked, then pick a storage path.

### Path A (recommended) — environment variables

Kiro expands `${VAR}` in MCP config files, so secrets stay out of the repo.

1. User exports the values in their shell profile:

   ```bash
   export TARUVI_TENANT=<tenant>
   export TARUVI_API_KEY=<paste>
   export TARUVI_APP_SLUG=<slug>
   export CONTEXT7_API_KEY=<paste>   # omit if skipped
   ```

2. **Approve the variables** — mandatory and easy to miss. Kiro only expands variables on an
   approved allowlist:

   - Kiro settings → search **"Mcp Approved Env Vars"** → add `TARUVI_TENANT`,
     `TARUVI_API_KEY`, `TARUVI_APP_SLUG`, `CONTEXT7_API_KEY`.
   - Or approve them from the security popup Kiro shows when it first sees unapproved variables.

   Unapproved variables don't expand, and the server fails to authenticate.

3. Kiro must be launched from a shell where those variables are exported.

### Path B (fallback) — values written into a local config

| Scope | Path |
|---|---|
| Workspace | `.kiro/settings/mcp.json` |
| User | `~/.kiro/settings/mcp.json` |

Kiro merges these `user < workspace`.

Before writing, confirm the file is gitignored; add it if not:

```
.kiro/settings/mcp.json
```

Then restrict permissions:

```bash
chmod 600 .kiro/settings/mcp.json
```

If the file was ever committed with a real key, tell the user to rotate it — it's in git history.

HTTP server shape:

```json
{
  "mcpServers": {
    "taruvi": {
      "url": "https://<tenant>.taruvi.cloud/mcp/",
      "headers": {
        "Authorization": "Api-Key <key>",
        "X-App-Slug": "<slug>"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Output 2 — app `.env` (do not skip)

MCP config only connects *you*. The **app** reads its own credentials from `.env`. Symptom of
skipping this: the app throws "Missing required environment variable" from `src/taruviClient.ts`
on startup.

```bash
cp .env.example .env
chmod 600 .env
```

Watch the naming — it differs from the MCP config:

| `.env` key | Value | Note |
|---|---|---|
| `TARUVI_SITE_URL` | `https://<tenant>.taruvi.cloud` | **Full URL**, not the bare subdomain |
| `TARUVI_APP_SLUG` | app slug | same as `X-App-Slug` |
| `TARUVI_API_KEY` | Knox key | same key as MCP |

Leave AI-provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) alone — the environment injects
those.

Confirm `.env` is gitignored. `vite.config.ts` reads these into the `__TARUVI_*__` globals via
`loadEnv`, and Vite bakes them in at build time — so **restart the dev server** after changing
`.env`. Hot reload will not pick it up.

If the repo ships an interactive `setup-env.js` (`npm run setup`), that script writes `.env` and
`.mcp.json` together and is a fine alternative to editing by hand. Don't run both paths and end
up with conflicting values.

## Connect and verify

1. Reconnect from the **MCP Server** view in the Kiro feature panel. Kiro reconnects on config
   change; no restart needed. (A restart *is* needed if you just exported new shell variables.)
2. Approve the `taruvi` (and optional `context7`) servers when prompted. Frequently used
   read-only tools can go in `autoApprove`.
3. Verify MCP: "List the datatables in this app."
4. Verify the app: restart the dev server and confirm it boots without an env error.

| Symptom | Likely cause |
|---|---|
| Missing app context | `TARUVI_APP_SLUG` / `X-App-Slug` |
| Auth / 401 | API key or tenant |
| URL contains a literal `${TARUVI_TENANT}` | Variable not approved, or not exported |
| Server not listed | Wrong config path, or needs reconnect |
| `context7` won't start | `npx` unavailable, or bad Context7 key |
| App: "Missing required environment variable" | `.env` absent or incomplete |
| App still failing after `.env` fix | Dev server not restarted |

Check **Output → "Kiro - MCP Logs"** for connection errors.
