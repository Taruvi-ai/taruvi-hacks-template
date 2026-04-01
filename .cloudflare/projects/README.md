# Cloudflare Projects

This directory contains Cloudflare Pages and Workers projects that are deployed via GitHub Actions.

## 📁 Structure

Each project should have:
- `package.json` - Dependencies and build scripts
- `wrangler.toml` - Cloudflare configuration (optional)
- Source code (HTML, React, Workers, etc.)

## 🚀 Creating New Projects

### Option 1: Use Scaffold Workflow (Recommended)
1. Go to Actions → "Cloudflare Scaffold - Create Project"
2. Fill in project details
3. Workflow creates PR with boilerplate code
4. Merge PR → auto-deploys to staging

### Option 2: Manual Creation
1. Create folder: `projects/my-project/`
2. Add `package.json` with `build` script
3. Add source code
4. Push to repo → auto-deploys

## 🔄 Deployment

### Auto-Deploy
- Push to `main` → deploys to production
- Push to `dev/staging` → deploys to staging
- Only changed projects are deployed

### Manual Deploy
- Go to Actions → "Cloudflare Deploy"
- Select project and environment
- Click "Run workflow"

## 📦 Project Types

### Pages (Static Sites)
- React, Vue, HTML, Docusaurus, etc.
- Must have `build` script that outputs to `build/` or `dist/`
- Deployed to `*.pages.dev`

### Workers (Serverless Functions)
- JavaScript/TypeScript functions
- Must have `wrangler.toml`
- Deployed to `*.workers.dev`

## 🌐 Custom Domains

⚠️ **Custom domains must be configured manually in Cloudflare dashboard.**

**Steps:**
1. Deploy your project first
2. Go to Cloudflare dashboard → Pages → Your Project
3. Settings → Custom domains → Add domain
4. Configure DNS as instructed
5. Wait for verification

The workflow accepts `custom_domain` parameter for documentation only - it does NOT automatically configure domains.

## 📚 Examples

See individual project folders for examples of:
- React apps
- Static HTML sites
- Cloudflare Workers
- Docusaurus documentation sites
