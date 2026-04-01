# Quick Start - Webhook Auto-Deploy

## ⚡ TL;DR

1. **Deploy Worker** (one-time):
   ```bash
   cd .cloudflare/webhook-handler
   npx wrangler login
   npx wrangler deploy
   ```

2. **Add Secrets** (one-time):
   ```bash
   npx wrangler secret put GITHUB_TOKEN    # Your GitHub PAT
   npx wrangler secret put WEBHOOK_SECRET  # Random string
   ```

3. **Setup GitHub Webhook** (one-time):
   - URL: `https://taruvi-webhook-handler.YOUR-SUBDOMAIN.workers.dev`
   - Secret: Same as `WEBHOOK_SECRET`
   - Event: Push only
   - Location: https://github.com/organizations/Taruvi-ai/settings/hooks

4. **Add Projects**:
   Edit `.cloudflare/projects.yml`:
   ```yaml
   external_projects:
     my-project:
       repository: Taruvi-ai/my-project
       branch: main
       root_directory: .
       build_directory: dist
       custom_domain: my-project.taruvi.space
       project_type: pages
       environment: production
   ```

5. **Push to external repo** → Auto-deploys! 🎉

---

## 🔑 Generate Secrets

**GitHub PAT:**
- https://github.com/settings/tokens
- Scope: `repo`

**Webhook Secret:**
```bash
openssl rand -hex 32
```

---

## 🐛 Debug

**Worker Logs:**
```bash
npx wrangler tail
```

**GitHub Webhook Deliveries:**
https://github.com/organizations/Taruvi-ai/settings/hooks

---

## 📖 Full Documentation

See [README.md](./README.md) for complete setup guide.
