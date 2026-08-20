# Taruvi Plugin for Kiro — install & test

How to install this plugin into a Taruvi hacks template repo and verify it works.

For the multi-host overview see the [repo README](../README.md); for the package layout see
[`README.md`](README.md).

---

## What this plugin adds

| Piece | Path in project | Purpose |
|---|---|---|
| Steering | `.kiro/steering/` | Always-on + conditional guidance (Kiro-native) |
| Hooks | `.kiro/hooks/` | Event-driven checks (Kiro-native) |
| `kiro-setup` skill | `.kiro/skills/kiro-setup/` | Interactive credential setup |
| Product skills | `.kiro/skills/` | `taruvi-app-developer`, `taruvi-refine-providers` |
| MCP template | `mcp.json` | Server shape with `${VAR}` placeholders |

Steering and hooks are the reason a Kiro package differs from the Claude/Cursor/Codex ones —
those hosts have no equivalent.

---

## What a pristine template already ships

Check before installing, because it changes what you do:

```bash
find .kiro | sort
ls -la .kiro          # note: skills is a symlink
```

A stock hacks template has:

- `.kiro/settings/mcp.json` — **tracked in git, often with a real API key committed**
- `.kiro/skills` — a symlink to `../.codex/skills`
- no `steering/`, no `hooks/`, no `.env`

---

## 1. Prepare the repo

```bash
git clone <hacks-template-repo> taruvi-kiro-test
cd taruvi-kiro-test
npm install
```

### Deal with the committed MCP config first

```bash
echo '{ "mcpServers": {} }' > .kiro/settings/mcp.json
printf '\n# Kiro local MCP config (contains API keys)\n.kiro/settings/mcp.json\n' >> .gitignore
git rm --cached .kiro/settings/mcp.json
```

`git rm --cached` matters: the file is already tracked, so a `.gitignore` entry alone will not
stop it being committed.

If the clone contained a real key, **rotate that key** — it is in git history.

---

## 2. Install the plugin

```bash
PLUGIN=/path/to/taruvi-plugin/kiro

mkdir -p .kiro/steering .kiro/hooks
cp -a "$PLUGIN/steering/." .kiro/steering/
cp -a "$PLUGIN/hooks/."    .kiro/hooks/
```

### Skills need a symlink swap

`.kiro/skills` is a symlink to `.codex/skills`, so `kiro-setup` has nowhere to live. Replace the
single symlink with a real directory holding per-skill links:

```bash
rm .kiro/skills
mkdir -p .kiro/skills
ln -s ../../.agents/skills/taruvi-app-developer     .kiro/skills/taruvi-app-developer
ln -s ../../.agents/skills/taruvi-refine-providers  .kiro/skills/taruvi-refine-providers
ln -s ../../.codex/skills/context7-mcp              .kiro/skills/context7-mcp
cp -a "$PLUGIN/skills/kiro-setup" .kiro/skills/
```

This keeps shared skills de-duplicated while giving Kiro-specific skills a home.

Verify every skill resolves:

```bash
for s in taruvi-app-developer taruvi-refine-providers context7-mcp kiro-setup; do
  test -f ".kiro/skills/$s/SKILL.md" && echo "OK  $s" || echo "BROKEN $s"
done
```

---

## 3. Open as its own workspace

Open the project as the **workspace root**, not as a folder inside a larger multi-root workspace.
Steering and MCP config resolve per workspace, and a parent workspace's already-loaded config will
mask whether the fresh install works.

Steering loads at session start, so start a new session after installing.

---

## 4. Configure credentials

Say:

> setup taruvi

The `kiro-setup` skill asks once, in a single message:

1. Go to the app's **Connect** page — Console → org → site → app → **Settings → Connect**
2. Click **Generate API Key** (without it the key renders as `<your-api-key>`)
3. Copy the **Environment** tab block and paste all three lines back:

   ```bash
   TARUVI_SITE_URL=https://<tenant>.taruvi.cloud
   TARUVI_APP_SLUG=<app-slug>
   TARUVI_API_KEY=<generated-key>
   ```

4. Optionally a Context7 key (`skip` is fine)

The skill derives the MCP tenant from `TARUVI_SITE_URL`, so you never type the subdomain separately.

### Setup produces two files, not one

| File | Connects | Read by |
|---|---|---|
| `.kiro/settings/mcp.json` | the agent → platform | Kiro MCP client |
| `.env` | the running app → platform | `vite.config.ts` → `__TARUVI_*__` globals |

Only doing the first is the most common mistake. Without `.env`, `src/taruviClient.ts` throws
"Missing required environment variable" and every page fails.

Note the format difference: `.env` wants `TARUVI_SITE_URL` as a **full URL**
(`https://<tenant>.taruvi.cloud`); MCP config wants the **bare subdomain**.

### Storing the API key

Two options, both supported by the skill:

- **Env vars** — `mcp.json` keeps `${TARUVI_API_KEY}` etc., values exported in your shell. Kiro
  only expands variables on an approved allowlist: settings → **"Mcp Approved Env Vars"**. Skip
  that step and the placeholder stays literal and auth fails.
- **Written into the config** — simpler, works immediately. Requires the file be gitignored and
  `chmod 600`.

`.env` needs real values either way, since Vite reads the file at build time.

---

## 5. Connect and verify

```bash
ls -l .env .kiro/settings/mcp.json          # expect -rw------- on both
git status --porcelain | grep -E '\.env|mcp\.json'   # expect no output
```

Then:

1. Reconnect `taruvi` from the **MCP Server** view in the Kiro feature panel. Kiro reconnects on
   config change without a restart — but a restart *is* needed if you just exported new shell
   variables.
2. Ask: "List the datatables in this app."
3. Restart the dev server so Vite picks up `.env`. Hot reload will not.

---

## Test matrix

Each row tests a distinct mechanism. Run them in order.

| # | Action | Pass looks like |
|---|---|---|
| 1 | In a fresh session, before running setup, ask for a feature (e.g. "add a list page for one of my datatables") | The agent notices `.env` is missing and stops, instead of writing code against an unconfigured app |
| 2 | "setup taruvi" | One ask covering all three values + Generate API Key; keys echoed masked; **both** `mcp.json` and `.env` written |
| 3 | "List the datatables in this app" | Real schema returns for your app slug |
| 4 | Edit any `.tsx` file with v4 hook syntax (`const { data } = useList(...)`) | The `refine-v5-review` hook flags it with the v5 replacement |
| 5 | Edit a `.md` file | Secret guard does **not** fire (it is scoped to config paths only) |
| 6 | Restart dev server | App boots without an env error |

Test 1 is the important one — it verifies always-on steering, which covers the case where nobody
invokes the setup skill. Tests 2 onward verify the skill and hooks.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Missing app context | app slug / `X-App-Slug` |
| Auth / 401 | API key or tenant |
| URL contains a literal `${TARUVI_TENANT}` | Variable not on the approved list, or not exported |
| Server not listed | Wrong config path, or needs reconnect |
| `context7` won't start | `npx` unavailable, or bad Context7 key |
| App: "Missing required environment variable" | `.env` absent or incomplete |
| App still failing after fixing `.env` | Dev server not restarted |
| Steering rules not applied | Session started before install — start a new one |
| A skill won't load | Broken symlink; re-run the resolve check in step 2 |

Connection errors are logged under **Output → "Kiro - MCP Logs"**.

---

## Known limits

- **The `~/.kiro/plugins/local/` route is unverified.** `.kiro-plugin/plugin.json` exists and its
  key names were inferred by analogy with the Codex manifest, but no local-plugin loader has been
  confirmed to consume it. The copy-into-`.kiro/` path in step 2 does not depend on it, which is
  why it is the documented route.
- **Hook latency.** `refine-v5-review` runs on every `.ts`/`.tsx` save. On a large refactor that
  is chatty; disable it from the Agent Hooks view in the explorer if it gets in the way.
- **Two copies of the key.** With the config-file path, the API key lives in both `.env` and
  `mcp.json`. The env-var path removes it from `mcp.json` only.
