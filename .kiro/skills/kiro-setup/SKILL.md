---
name: kiro-setup
description: >
  Configure the Taruvi Kiro plugin: MCP connection (tenant subdomain, Knox API
  key, app slug, optional Context7 key) and the app's own .env file. Triggers:
  "setup taruvi", "configure MCP", "taruvi plugin setup", "connect to Taruvi",
  missing TARUVI_* values, MCP auth failures. Kiro only.
---

# Kiro setup (Taruvi)

You are running the interactive Taruvi setup for Kiro. **You ask** — the user should not have to
hunt through config files. One ask, one paste, then you do the rest.

Setup has **two outputs**. Both are required; finishing only the first is the most common mistake:

1. **MCP config** — connects *you* (the agent) to the Taruvi platform.
2. **App `.env`** — connects the *running app* to Taruvi.

## Hard rules

1. Collect **all three Taruvi values in one message**. Don't drip-feed one question per turn.
2. Never invent tenant names, API keys, or app slugs.
3. Never echo a full API key back in the transcript. Mask as `…abcd`.
4. Never write real secrets into git-tracked files. Confirm the target is gitignored first.
5. Do not overwrite an existing config — merge into it and confirm before replacing values.

## Step 1 — Ask for the connection details (single message)

Send one message with the whole ask. All three values sit in one copyable block on the app's
**Connect** page, so there's nothing to gain from asking separately.

Build the URL from the user's own org / site / app:

`https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`

If you don't know those slugs yet, give the pattern and tell them: Console → org → site → app →
**Settings → Connect**. Don't guess slugs to produce a clickable link.

Message to send:

> Open your app's **Connect** page in Taruvi Console:
>
> `https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`
>
> On that page:
>
> 1. Click **Generate API Key** — the banner reads "Generate an API key to unlock MCP Server,
>    REST API, and SDK connections." Without this the key shows as `<your-api-key>` and nothing
>    will authenticate.
> 2. Open the **Environment** tab and copy the whole block (the copy icon is top-right). It looks
>    like:
>
>    ```bash
>    TARUVI_SITE_URL=https://<tenant>.taruvi.cloud
>    TARUVI_APP_SLUG=<app-slug>
>    TARUVI_API_KEY=<generated-key>
>    ```
>
> 3. Paste all three lines back here.
>
> Optional: if you want **Context7** for library docs, paste its API key too, or say `skip`.
> (Context7 is unrelated to Taruvi Connect.)

## Step 2 — Parse and confirm

From the pasted block:

| Parsed | Use |
|---|---|
| `TARUVI_SITE_URL` | `.env` as-is; strip `https://` and `.taruvi.cloud` for the MCP tenant |
| `TARUVI_APP_SLUG` | `.env` + `X-App-Slug` |
| `TARUVI_API_KEY` | `.env` + `Authorization: Api-Key …` |

Deriving the tenant from `TARUVI_SITE_URL` is what keeps the two formats consistent — the app
wants the full URL, MCP wants the bare subdomain.

Reject and re-ask only when something is actually missing or unusable:

- `TARUVI_API_KEY=<your-api-key>` (literal placeholder) → they skipped **Generate API Key**
- fewer than three values pasted → ask for the missing ones by name, in one message
- a bare subdomain instead of a URL → accept it, expand to `https://<tenant>.taruvi.cloud`, confirm

Then echo a summary with the key masked before writing anything.

If Context7 was skipped, **omit the `context7` server entirely** rather than writing an entry with
an empty key.

## Step 3, output 1 — MCP config

Pick a storage path. Tenant here is the subdomain derived from `TARUVI_SITE_URL`.

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

## Step 3, output 2 — app `.env` (do not skip)

MCP config only connects *you*. The **app** reads its own credentials from `.env`. Symptom of
skipping this: the app throws "Missing required environment variable" from `src/taruviClient.ts`
on startup.

```bash
cp .env.example .env
chmod 600 .env
```

The Connect page block is already in `.env` format, so paste the three lines in verbatim:

| `.env` key | Value | Note |
|---|---|---|
| `TARUVI_SITE_URL` | `https://<tenant>.taruvi.cloud` | **Full URL** — the MCP config uses the bare subdomain of this |
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

## Step 4 — Connect and verify

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
