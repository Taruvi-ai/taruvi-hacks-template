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

## Step 0 — Look before you ask

Don't ask for credentials the user has already provided somewhere. Run:

```bash
python3 scripts/mcp_scope.py
```

| Exit | Situation | Do this |
|---|---|---|
| 1 | nothing usable anywhere | Continue to Step 1 — this is the normal first-run path. |
| 0 | one usable workspace server | Say which tenant/app it points at, and confirm they want to replace it before overwriting. |
| 2 | usable servers exist, but not chosen for this workspace | **Ask first** — see below. |

Exit 2 is the clone-and-connect case: Kiro merges MCP config `user < workspace`, so a template with
no usable workspace config inherits a server from `~/.kiro/settings/mcp.json` and appears connected
to *someone else's* app. Present the options rather than either silently reusing it or steamrolling
it with a fresh setup:

> I went through the MCP configs. This workspace has no Taruvi connection of its own, and your
> user-level config (`~/.kiro/settings/mcp.json`) has:
>
> 1. `taruvi` → `other.taruvi.cloud`, app `someone-else`
>
> Two options:
>
> - **Reuse that connection** — I'll copy it into `.kiro/settings/mcp.json` so it's recorded for
>   this workspace. Pick this only if this repo really is that app; every schema change and write
>   goes to that tenant.
> - **Set up this app's own connection** — I'll ask for the Connect page values and write a fresh
>   workspace config.
>
> Which do you want?

Wait for an answer, then:

- **Reuse an inherited server** → copy that entry into `.kiro/settings/mcp.json` verbatim (same
  hygiene rules as Path B below) and derive `.env` from its `url` + `X-App-Slug`. You still need the
  key value for `.env`, so ask for it if the inherited config stores it as a `${VAR}`.
- **Set up a new connection** → **go to Step 1 and send its message.** Do not write your own
  credential questions.

> **Do not improvise the credential ask.** Asking "what's your tenant subdomain, API key, and app
> slug?" as three open questions is a regression, even though it names the right three values. It
> makes the user hunt for them, and it skips **Generate API Key** — so they paste
> `<your-api-key>`, nothing authenticates, and setup restarts. Step 1 exists because all three
> values sit in one copyable block on the Connect page. Send that message instead.

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

## Step 4 — Reconnect, then verify (writing the config is not connecting)

**Kiro binds MCP servers when the session starts.** A config written mid-session is inert until the
servers are reconnected — tools keep answering from the server bound earlier, which on a fresh
clone is an inherited user-level one. The symptom is nasty because nothing looks broken: the config
on disk is correct, and tools return real data *from the wrong app*.

So a config write is never the last step.

1. Check the files agree, before touching the connection:

   ```bash
   python3 scripts/check-taruvi-setup.py   # .env + MCP config agree, nothing leaked to git
   python3 scripts/mcp_scope.py            # expect exit 0 naming the app you just configured
   ```

   Exit 2 means the workspace entry still isn't usable and Kiro would fall back to inherited config
   — recheck the key and `X-App-Slug`. Exit 0 with an `Unverified:` line is expected here: the
   config is right, it just hasn't been checked against live tools yet.

2. **Reconnect.** Tell the user to do one of these, and say why:

   - **Reconnect the `taruvi` server** from the **MCP Server** view in the Kiro feature panel —
     fastest, keeps the session.
   - **Restart the Kiro session** — needed if you just exported shell variables, since Kiro reads
     the environment at launch.

   You cannot do this yourself. `kiro-cli mcp` only manages config (`add`/`remove`/`list`/`import`/
   `status`) — it has no reconnect. `kiro-cli restart` restarts the whole desktop app and would kill
   the in-flight session, so don't call it on the user's behalf. Ask, then wait.

3. Approve the `taruvi` (and optional `context7`) servers when prompted. Frequently used read-only
   tools can go in `autoApprove`.

4. **Verify against live tools, then record it.** Ask for the app's datatables and confirm the
   result matches the app you just configured — not another tenant. Table names from a different
   project are the tell.

   ```bash
   python3 scripts/mcp_scope.py --record   # only after tools returned the right app's data
   ```

   Recording without checking recreates the exact false green this step exists to catch. After
   recording, `python3 scripts/mcp_scope.py` exits 0 and stops warning.

5. Verify the app: restart the dev server and confirm it boots without an env error.

| Symptom | Likely cause |
|---|---|
| Missing app context | `TARUVI_APP_SLUG` / `X-App-Slug` |
| Auth / 401 | API key or tenant |
| URL contains a literal `${TARUVI_TENANT}` | Variable not approved, or not exported |
| Server not listed | Wrong config path, or needs reconnect |
| Tools work but return **another app's** tables | Inherited user-level server — run `python3 scripts/mcp_scope.py` |
| `context7` won't start | `npx` unavailable, or bad Context7 key |
| App: "Missing required environment variable" | `.env` absent or incomplete |
| App still failing after `.env` fix | Dev server not restarted |

Check **Output → "Kiro - MCP Logs"** for connection errors.
