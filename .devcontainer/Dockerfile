FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bullseye

# Pre-install Codex CLI so postCreateCommand only needs to npm install the project.
# This layer is cached — rebuilds only when the RUN line changes.
RUN npm install -g @openai/codex
