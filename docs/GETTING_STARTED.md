# Getting Started

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running (Windows, Mac, or Linux)
- Git

That's it. No need to install Node.js, npm, or codex — everything is inside the Docker image.

---

## Quick Start

### 1. Clone the project

```bash
git clone <your-repo-url>
cd taruvi-refine-template
```

### 2. Start the environment

```bash
npm run go
```

Or if npm is not installed locally, run Docker directly:

```bash
docker run --rm -it -v .:/app -p 5173:5173 repo.eoxvantage.com/hackathon/environment
```


This single command will:
1. Mount your project into the container
2. Install npm dependencies (first run only)
3. Start the dev server at **http://localhost:5173**
4. Launch **Codex** in your terminal

### 3. Open the app

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Commands

All commands are run from the project root.

| Command | Description |
|---------|-------------|
| `npm run go` | Start dev server + Codex (via Docker) |
| `npm run deploy` | Build, zip, and deploy to Taruvi cloud |
| `npm run dev` | Start dev server only (requires local Node.js) |
| `npm run build` | Production build (requires local Node.js) |

---

## Deploying

```bash
npm run deploy
```

You will be prompted for:
- **Site name** — your Taruvi site (e.g., `appbuild`, `mysite`)

The script will:
1. Run `npm run build`
2. Zip the `dist/` folder
3. Upload to `https://api.taruvi.cloud/sites/<site-name>/api/cloud/frontend_workers/`

The API key and app name are read from your `.env` file.

---

## Using Codex

Codex launches automatically when you run `npm run go`. It is an AI coding assistant that runs in your terminal.

### Common Codex usage

- Ask Codex to generate code, fix bugs, or explain logic
- Codex has access to your project files inside the container
- Your auth is pre-configured — no setup needed

### Running Codex separately

If the dev server is already running and you want a second Codex session:

```bash
docker run --rm -it -v .:/app repo.eoxvantage.com/hackathon/environment codex
```


---

## Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
TARUVI_SITE_URL=https://playground.taruvi.cloud
TARUVI_API_KEY=your-api-key
TARUVI_APP_SLUG=your-app-slug
TARUVI_APP_TITLE=Your App Title
```

---

## Docker Reference

**Image:** `repo.eoxvantage.com/hackathon/environment`

**What's inside:**
- Node.js 22
- npm 10.9.4
- @openai/codex (globally installed)
- Codex auth pre-configured
- git, curl

**Pull the latest image:**
```bash
docker pull repo.eoxvantage.com/hackathon/environment
```

**Run dev server only (no Codex):**
```bash
docker run --rm -it -v .:/app -p 5173:5173 repo.eoxvantage.com/hackathon/environment bash -c "cd /app && npm install && npm run dev -- --host 0.0.0.0"
```

**Run a shell inside the container:**
```bash
docker run --rm -it -v .:/app -p 5173:5173 repo.eoxvantage.com/hackathon/environment bash
```

---

## Troubleshooting

### Port 5173 already in use
Stop any other dev servers, or change the port:
```bash
docker run --rm -it -v .:/app -p 3000:5173 repo.eoxvantage.com/hackathon/environment
```
Then visit http://localhost:3000

### node_modules issues
Delete `node_modules` and restart — the container will reinstall:
```bash
rm -rf node_modules
npm run go
```

### Docker not found
Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and make sure it is running.
