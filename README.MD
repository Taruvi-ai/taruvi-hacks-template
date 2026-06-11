# Taruvi Hackathon Template (Refine v5)

This repository is the official starter template for Taruvi hackathons.

It includes:
- A Refine v5 + React app scaffold
- GitHub Codespaces-ready devcontainer setup
- Guided Codex startup flow for required Taruvi environment variables
- MCP configuration for Taruvi + helpful developer tools

## Who This Is For

- **Participants**: use this template to start building quickly in Codespaces.
- **Organizers/Mentors**: use this for standardized onboarding across teams.

## Hackathon Flow

### Organizer-side (Advanced setup)
1. Sign up for GitHub Codespaces in Advanced.
2. Create sites for each group based on color coding in Advanced.
3. Ensure participants accept their Taruvi Console invite.

### Participant-side setup
0. In Taruvi Console, create your app and collect:
   - `TARUVI_SITE_URL` (site URL)
   - `TARUVI_API_KEY`
   - `TARUVI_APP_SLUG`
1. Open this repo when the hackathon starts:
   - https://github.com/Taruvi-ai/taruvi-hacks-template
2. Create a GitHub Codespace (first load is usually ~2.5 minutes).
3. Open `.env`, paste your `TARUVI_SITE_URL`, `TARUVI_APP_SLUG`, and `TARUVI_API_KEY`, then save.

## Codespaces Behavior (Important)

When Codex starts in the devcontainer:
- It verifies required Taruvi env vars are present.
- If missing, it asks you to update `.env` with `TARUVI_SITE_URL`, `TARUVI_APP_SLUG`, and `TARUVI_API_KEY`.
- It writes `.codex/config.toml` with resolved Taruvi values.
- It attempts to install the Codex VS Code extension.
- It launches Codex after setup is complete.

## Updating Config Later

If you change your Taruvi site, app slug, or API key later:
1. Edit `.env`
2. Update `TARUVI_SITE_URL`, `TARUVI_APP_SLUG`, or `TARUVI_API_KEY`
3. Run `npm run codex:refresh`
4. Restart Codex if needed

## Security Notes

- `OPENAI_API_KEY` is injected via GitHub Codespaces secrets and must **never be committed** to the repository.
- If a key was ever committed accidentally, rotate/revoke it immediately in the OpenAI dashboard.

## Local Commands

```bash
npm run dev
npm run build
npm run start
```

## Tech Stack

- [Refine](https://refine.dev)
- React + TypeScript
- MUI
- Taruvi Providers + Taruvi MCP integration

## Learn More

- [Refine Docs](https://refine.dev/docs)
- [Refine Data Provider Docs](https://refine.dev/docs/core/providers/data-provider/#overview)
- [Refine MUI Docs](https://refine.dev/docs/ui-frameworks/mui/tutorial/)

## License

MIT
