# External Repo Deployment Trigger Template

Copy this workflow to external repos (like taruvi-desk) to enable auto-deploy via taruvi-platform.

## Setup Instructions

1. **Create workflow file** in external repo:
   ```
   .github/workflows/deploy.yml
   ```

2. **Add this content:**

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, refine/desk]  # Adjust branches as needed

jobs:
  trigger-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deployment in taruvi-platform
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.PLATFORM_DEPLOY_TOKEN }}
          repository: Taruvi-ai/taruvi-platform  # Or your org/repo
          event-type: deploy-external-project
          client-payload: |
            {
              "project_name": "taruvi-desk",
              "project_type": "pages",
              "environment": "production",
              "repository": "${{ github.repository }}",
              "branch": "${{ github.ref_name }}",
              "custom_domain": "desk.taruvi.space",
              "build_directory": "build",
              "root_directory": "desk"
            }
```

3. **Create PAT token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` and `workflow` scopes
   - Add as secret `PLATFORM_DEPLOY_TOKEN` in external repo

4. **Customize payload:**
   - `project_name`: Cloudflare project name
   - `project_type`: `pages` or `workers`
   - `environment`: `production` or `staging`
   - `custom_domain`: Your custom domain (optional)
   - `build_directory`: Output folder (`build`, `dist`, `out`)
   - `root_directory`: If project is in subfolder (optional)

## How It Works

1. Push to external repo (e.g., taruvi-desk)
2. Workflow triggers `repository_dispatch` event in taruvi-platform
3. taruvi-platform's cloudflare-deploy.yml receives event
4. Checks out external repo and deploys to Cloudflare
5. Configures custom domain if provided

## Example for taruvi-desk

```yaml
name: Deploy Desk

on:
  push:
    branches: [refine/desk]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.PLATFORM_DEPLOY_TOKEN }}
          repository: Taruvi-ai/taruvi-platform
          event-type: deploy-external-project
          client-payload: |
            {
              "project_name": "taruvi-desk",
              "project_type": "pages",
              "environment": "production",
              "repository": "Taruvi-ai/taruvi-desk",
              "branch": "refine/desk",
              "custom_domain": "desk.taruvi.space",
              "build_directory": "build",
              "root_directory": "desk"
            }
```

## Testing

1. Push to external repo
2. Check Actions tab in taruvi-platform
3. Should see "Cloudflare Deploy" workflow running
4. Deployment completes and custom domain is configured

## Troubleshooting

- **Workflow not triggering:** Check PAT token has correct permissions
- **Deployment fails:** Check build_directory and root_directory are correct
- **Custom domain not working:** Verify domain DNS is pointed to Cloudflare
