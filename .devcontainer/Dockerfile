FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bullseye

# Pre-install Codex CLI so postCreateCommand doesn't have to.
# This layer is cached by Docker — rebuilds only when this line changes.
RUN npm install -g @openai/codex
