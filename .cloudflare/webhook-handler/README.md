# Webhook Auto-Deploy Setup

This Worker enables automatic deployments when you push to external repos (taruvi-desk, grainix, etc.) without needing workflow files in those repos.

## 🎯 How It Works

```
Push to taruvi-desk
  ↓
GitHub org webhook fires
  ↓
Worker receives event
  ↓
Checks projects.yml
  ↓
Triggers taruvi-platform workflow
  ↓
Deploys to Cloudflare Pages
```

**Zero files needed in external repos!**

---

## 🚀 One-Time Setup (15 minutes)

### Step 1: Generate Secrets

#### 1.1 GitHub Personal Access Token (PAT)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `Taruvi Webhook Handler`
4. Scopes: Check `repo` (full control)
5. Generate and **copy the token** (you won't see it again!)

#### 1.2 Webhook Secret

Generate a random secret:
```bash
openssl rand -hex 32
```
Copy this value.

---

### Step 2: Deploy the Worker

```bash
cd .cloudflare/webhook-handler

# Login to Cloudflare (if not already)
npx wrangler login

# Deploy the Worker
npx wrangler deploy

# Note the Worker URL (e.g., https://taruvi-webhook-handler.your-subdomain.workers.dev)
```

---

### Step 3: Add Secrets to Worker

```bash
# Add GitHub token
npx wrangler secret put GITHUB_TOKEN
# Paste your GitHub PAT when prompted

# Add webhook secret
npx wrangler secret put WEBHOOK_SECRET
# Paste your random secret when prompted
```

---

### Step 4: Configure GitHub Org Webhook

1. Go to: https://github.com/organizations/Taruvi-ai/settings/hooks
2. Click "Add webhook"
3. Fill in:
   - **Payload URL**: `https://taruvi-webhook-handler.your-subdomain.workers.dev`
   - **Content type**: `application/json`
   - **Secret**: Paste the webhook secret from Step 1.2
   - **Which events**: Select "Just the push event"
   - **Active**: ✅ Check this
4. Click "Add webhook"

---

### Step 5: Test It!

1. Add a project to `projects.yml` (if not already there):
   ```yaml
   external_projects:
     taruvi-desk:
       repository: Taruvi-ai/taruvi-desk
       branch: refine/desk
       root_directory: .
       build_directory: dist
       custom_domain: desk.taruvi.space
       project_type: pages
       environment: production
   ```

2. Push a commit to taruvi-desk repo

3. Check:
   - GitHub webhook deliveries: https://github.com/organizations/Taruvi-ai/settings/hooks
   - Worker logs: Cloudflare dashboard → Workers → taruvi-webhook-handler → Logs
   - GitHub Actions: https://github.com/Taruvi-ai/taruvi-platform/actions

---

## 📋 Adding New Projects

Just add to `projects.yml`:

```yaml
external_projects:
  my-new-project:
    repository: Taruvi-ai/my-new-project
    branch: main
    root_directory: .
    build_directory: dist
    custom_domain: my-project.taruvi.space
    project_type: pages
    environment: production
```

Push to `my-new-project` → auto-deploys! ✨

**No workflow files needed in the external repo!**

---

## 🎛️ Auto-Deploy Control

### Enable Auto-Deploy
Add project to `projects.yml` with the branch you want to auto-deploy:
```yaml
taruvi-desk:
  branch: refine/desk  # Only this branch auto-deploys
```

### Disable Auto-Deploy
Remove or comment out from `projects.yml`:
```yaml
# taruvi-desk:  # Commented = no auto-deploy, manual only
#   repository: Taruvi-ai/taruvi-desk
```

### Multiple Branches (Same Repo)
```yaml
taruvi-desk-prod:
  repository: Taruvi-ai/taruvi-desk
  branch: main
  custom_domain: desk.taruvi.space

taruvi-desk-staging:
  repository: Taruvi-ai/taruvi-desk
  branch: dev
  custom_domain: staging-desk.taruvi.space
```

**Flexibility:**
- ✅ Per-project control
- ✅ Per-branch control
- ✅ Easy enable/disable
- ✅ Manual deploy always available

---

## 🔍 Debugging

### Check Worker Logs

1. Go to Cloudflare dashboard
2. Workers & Pages → taruvi-webhook-handler
3. Click "Logs" tab
4. See real-time webhook events

### Check GitHub Webhook Deliveries

1. Go to: https://github.com/organizations/Taruvi-ai/settings/hooks
2. Click on your webhook
3. Click "Recent Deliveries"
4. Click on a delivery to see details
5. **Click "Response" tab** to see Worker's response

**Response Examples:**

**✅ Deploy Triggered:**
```json
{
  "success": true,
  "project": "taruvi-desk",
  "branch": "refine/desk",
  "message": "Deploy triggered"
}
```

**❌ Branch Mismatch (Wrong Branch):**
```json
{
  "success": false,
  "reason": "branch_mismatch",
  "message": "Branch 'dev' does not match configured branch 'refine/desk'",
  "repo": "taruvi-desk",
  "pushed_branch": "dev",
  "configured_branch": "refine/desk"
}
```

**❌ Not Configured:**
```json
{
  "success": false,
  "reason": "not_configured",
  "message": "Repository 'my-repo' not found in projects.yml",
  "repo": "my-repo",
  "branch": "main"
}
```

**💡 Pro Tip:** Check the Response tab in webhook deliveries - no need to check Cloudflare logs for most cases!

### Common Issues

**Webhook shows "Invalid signature"**
- Worker's `WEBHOOK_SECRET` doesn't match GitHub webhook secret
- Re-add the secret: `npx wrangler secret put WEBHOOK_SECRET`

**"Repo not configured"**
- Project not in `projects.yml`
- Add it and push again

**"Branch mismatch"**
- Pushed to wrong branch
- Update `branch` in `projects.yml` or push to correct branch

**"Failed to trigger workflow"**
- GitHub token expired or lacks permissions
- Regenerate PAT and update: `npx wrangler secret put GITHUB_TOKEN`

---

## 🛠️ Updating the Worker

If you need to change Worker code:

```bash
cd .cloudflare/webhook-handler

# Make your changes to worker.js

# Deploy
npx wrangler deploy
```

**Note:** Secrets persist across deployments (no need to re-add them)

---

## 🔐 Security

- ✅ Webhook signature validation (prevents unauthorized requests)
- ✅ Only processes repos in `projects.yml` (explicit allowlist)
- ✅ Only processes configured branches
- ✅ GitHub token stored securely in Worker secrets
- ✅ No secrets in external repos

---

## 🎉 Benefits

### Before (with workflow files):
- ❌ Need workflow file in each external repo
- ❌ Need `PLATFORM_DEPLOY_TOKEN` secret in each repo
- ❌ Update 15 files if logic changes
- ❌ Setup burden for new repos

### After (with webhook):
- ✅ Zero files in external repos
- ✅ Zero secrets in external repos
- ✅ One place to change logic (Worker)
- ✅ Add to `projects.yml` = auto-deploy enabled

---

## 📊 Monitoring

### Worker Metrics

Cloudflare dashboard shows:
- Request count
- Success rate
- Error rate
- Response time

### GitHub Actions

All deploys visible in:
https://github.com/Taruvi-ai/taruvi-platform/actions

---

## 🔄 Rollback Plan

If webhook approach doesn't work:

1. Delete GitHub org webhook
2. Add workflow files to external repos (use template in `.cloudflare/templates/`)
3. Add `PLATFORM_DEPLOY_TOKEN` secret to each repo
4. Push to trigger

Worker can stay deployed (won't do anything without webhook configured).

---

## 💡 Tips

- **Test with one repo first** (taruvi-desk) before adding more
- **Check Worker logs** if deploy doesn't trigger
- **Webhook secret** can be any random string (keep it safe!)
- **GitHub token** needs `repo` scope (full control of private repos)
- **Worker is free** (100k requests/day on free tier)

---

## 📞 Troubleshooting Checklist

Deploy not triggering? Check:

- [ ] Project in `projects.yml`?
- [ ] Branch matches `projects.yml`?
- [ ] Repository name matches `projects.yml`?
- [ ] Webhook shows successful delivery in GitHub?
- [ ] Worker logs show the event?
- [ ] GitHub token has `repo` permissions?
- [ ] Webhook secret matches in both places?

---

## 🎯 Quick Reference

**Deploy Worker:**
```bash
cd .cloudflare/webhook-handler && npx wrangler deploy
```

**Update Secret:**
```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

**View Logs:**
```bash
npx wrangler tail
```

**Test Webhook:**
Push to any configured repo and watch the magic! ✨
