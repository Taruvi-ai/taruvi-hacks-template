# Webhook Auto-Deploy Flow Documentation

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK AUTO-DEPLOY FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. Developer pushes to external repo (taruvi-desk)
   │
   ├─ Commit: "feat: add new feature"
   ├─ Branch: refine/desk
   └─ Repo: Taruvi-ai/taruvi-desk

2. GitHub sends webhook to Worker
   │
   ├─ URL: https://taruvi-webhook-handler.vijay2267.workers.dev
   ├─ Event: push
   ├─ Signature: HMAC-SHA256 (validated)
   └─ Payload: { repository, ref, commits, ... }

3. Worker receives and processes
   │
   ├─ ✅ Verify webhook signature
   ├─ ✅ Extract: repo="taruvi-desk", branch="refine/desk"
   ├─ ✅ Fetch projects.yml from taruvi-platform
   ├─ ✅ Check: Is "taruvi-desk" configured?
   ├─ ✅ Check: Does branch match "refine/desk"?
   └─ ✅ All checks passed!

4. Worker triggers taruvi-platform workflow
   │
   ├─ API: POST /repos/Taruvi-ai/taruvi-platform/dispatches
   ├─ Event: deploy-cloudflare
   ├─ Payload: { project_name: "taruvi-desk" }
   └─ Response: 204 No Content (success)

5. GitHub Actions workflow starts
   │
   ├─ Workflow: cloudflare-deploy.yml
   ├─ Trigger: repository_dispatch
   ├─ Run name: "🤖 Auto-Deploy: taruvi-desk @ webhook"
   └─ Job: deploy-manual

6. Workflow prepares deployment
   │
   ├─ Load config from projects.yml
   ├─ Repository: Taruvi-ai/taruvi-desk
   ├─ Branch: refine/desk
   ├─ Build dir: dist
   └─ Domain: desk.taruvi.space

7. Workflow checks out external repo
   │
   ├─ Clone: Taruvi-ai/taruvi-desk
   ├─ Checkout: refine/desk
   └─ Using: CLOUDFLARE_PAT token

8. Workflow builds project
   │
   ├─ Install: npm ci
   ├─ Build: npm run build
   ├─ Output: dist/
   └─ Duration: ~2-3 minutes

9. Workflow deploys to Cloudflare Pages
   │
   ├─ Project: taruvi-desk
   ├─ Environment: production
   ├─ Domain: desk.taruvi.space
   └─ Status: ✅ Deployed

10. ✨ Live at https://desk.taruvi.space
```

---

## 📊 Deployment Types Comparison

### 🤖 Auto-Deploy (Webhook)
```
Trigger: Push to external repo
Run name: "🤖 Auto-Deploy: taruvi-desk @ webhook"
Initiated by: Webhook (repository_dispatch)
Visibility: GitHub Actions shows "Repository dispatch triggered by prateekshetty-eox"
```

### 👤 Manual Deploy
```
Trigger: Manual workflow run
Run name: "👤 Manual Deploy: taruvi-desk"
Initiated by: User (workflow_dispatch)
Visibility: GitHub Actions shows "Manually run by prateekshetty-eox"
```

### 📦 Internal Deploy
```
Trigger: Push to .cloudflare/projects/
Run name: "📦 Internal: master"
Initiated by: Push event
Visibility: GitHub Actions shows commit message
```

---

## 🔍 How to Identify Deployment Type

### In GitHub Actions UI:

**Auto-Deploy (Webhook):**
- Run name starts with 🤖
- Event type: `repository_dispatch`
- Triggered by: webhook from external repo
- Job name: `taruvi-desk @ refine/desk`

**Manual Deploy:**
- Run name starts with 👤
- Event type: `workflow_dispatch`
- Triggered by: user clicking "Run workflow"
- Job name: `taruvi-desk @ refine/desk`

**Internal Deploy:**
- Run name starts with 📦
- Event type: `push`
- Triggered by: commit to taruvi-platform
- Job name: project name from .cloudflare/projects/

---

## 🎯 Branch Filtering Logic

The webhook only triggers deployment when:

1. **Repository matches** `projects.yml`
   ```yaml
   repository: Taruvi-ai/taruvi-desk  # Must match exactly
   ```

2. **Branch matches** `projects.yml`
   ```yaml
   branch: refine/desk  # Must match exactly
   ```

### Example Scenarios:

| Push Event | Configured Branch | Result |
|------------|-------------------|--------|
| `refine/desk` | `refine/desk` | ✅ Deploys |
| `dev` | `refine/desk` | ❌ Ignored (branch mismatch) |
| `main` | `refine/desk` | ❌ Ignored (branch mismatch) |
| `refine/desk` | `main` | ❌ Ignored (branch mismatch) |

**Worker logs show:**
```
✅ Triggering deploy for taruvi-desk  (if match)
⚠️  Branch dev != refine/desk - ignoring  (if mismatch)
```

---

## 🔐 Security Flow

```
1. GitHub signs webhook with secret
   ↓
2. Worker receives request
   ↓
3. Worker verifies HMAC-SHA256 signature
   ├─ Valid → Continue
   └─ Invalid → Return 401 Unauthorized
   ↓
4. Worker checks projects.yml allowlist
   ├─ Configured → Continue
   └─ Not configured → Return 200 (ignored)
   ↓
5. Worker triggers workflow with GitHub PAT
   ├─ Valid token → Workflow starts
   └─ Invalid token → Return 500
```

---

## 📝 Adding New Projects

### Step 1: Add to projects.yml
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

### Step 2: Push to my-new-project
```bash
git push origin main
```

### Step 3: Auto-deploys! ✨
- Webhook fires
- Worker checks projects.yml
- Finds "my-new-project"
- Triggers deployment
- Live at my-project.taruvi.space

**No workflow files needed in my-new-project repo!**

---

## 🐛 Debugging Guide

### Check 1: Webhook Delivery
**Location:** https://github.com/organizations/Taruvi-ai/settings/hooks

**Look for:**
- Recent delivery with timestamp
- Status: 200 OK (success)
- Response body: `{"success":true,"project":"taruvi-desk",...}`

**If failed:**
- Status 401: Signature mismatch (check WEBHOOK_SECRET)
- Status 500: Worker error (check Worker logs)

### Check 2: Worker Logs
**Location:** Cloudflare Dashboard → Workers → taruvi-webhook-handler → Logs

**Or via CLI:**
```bash
cd .cloudflare/webhook-handler
npx wrangler tail
```

**Look for:**
```
📦 Push: Taruvi-ai/taruvi-desk @ refine/desk by prateekshetty-eox
✅ Triggering deploy for taruvi-desk
🚀 Deploy triggered for taruvi-desk
```

**If errors:**
```
❌ Failed to fetch projects.yml: 401  (check GITHUB_TOKEN)
⚠️  taruvi-desk not in projects.yml  (add to projects.yml)
⚠️  Branch dev != refine/desk  (wrong branch pushed)
```

### Check 3: GitHub Actions
**Location:** https://github.com/Taruvi-ai/taruvi-platform/actions

**Look for:**
- New workflow run with 🤖 icon
- Run name: "🤖 Auto-Deploy: taruvi-desk @ webhook"
- Status: In progress / Success / Failed

**If not triggered:**
- Check webhook delivery (Step 1)
- Check Worker logs (Step 2)
- Verify GITHUB_TOKEN has `repo` scope

---

## 💡 Tips & Best Practices

### 1. Test with Empty Commits
```bash
git commit --allow-empty -m "test: webhook"
git push
```
No code changes, just tests the webhook flow.

### 2. Monitor First Few Deploys
Watch all three places:
- Webhook deliveries
- Worker logs
- GitHub Actions

### 3. Use Descriptive Commit Messages
The commit message appears in GitHub Actions, helps identify what triggered the deploy.

### 4. Branch Protection
Consider protecting `refine/desk` branch to prevent accidental pushes that trigger deploys.

### 5. Webhook Secret Rotation
If compromised, regenerate:
```bash
openssl rand -hex 32  # Generate new secret
npx wrangler secret put WEBHOOK_SECRET  # Update Worker
# Update GitHub webhook secret in org settings
```

---

## 🎉 Success Indicators

### ✅ Everything Working:
1. Push to taruvi-desk
2. Webhook delivery shows 200 OK within 1 second
3. Worker logs show "Deploy triggered"
4. GitHub Actions starts within 5 seconds
5. Deployment completes in 2-3 minutes
6. Site live at desk.taruvi.space

### ❌ Something Wrong:
1. Webhook delivery fails (not 200)
2. Worker logs show errors
3. GitHub Actions doesn't start
4. Deployment fails

**Check the debugging guide above!**

---

## 📞 Quick Reference

**Webhook URL:**
```
https://taruvi-webhook-handler.vijay2267.workers.dev
```

**Worker Logs:**
```bash
cd .cloudflare/webhook-handler && npx wrangler tail
```

**GitHub Actions:**
```
https://github.com/Taruvi-ai/taruvi-platform/actions
```

**Webhook Deliveries:**
```
https://github.com/organizations/Taruvi-ai/settings/hooks
```

**Projects Config:**
```
.cloudflare/projects.yml
```

---

## 🚀 What's Next?

1. **Add more projects** - Just add to projects.yml
2. **Monitor deployments** - Check GitHub Actions
3. **Optimize builds** - Improve build times
4. **Add notifications** - Slack/Discord webhooks
5. **Scale infinitely** - Works for unlimited repos!

**Zero files in external repos. Just push and deploy!** ✨
