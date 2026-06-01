# INSTALL

## 1. Clone
```bash
git clone https://github.com/kjeox/taruvi-hacks-template.git
cd taruvi-hacks-template
```

## 2. Configure env
```bash
cp .env.example .env
```
Fill placeholders in `.env`.

## 3. Configure Codex hooks
Copy/edit `.codex/config.toml` with your own endpoints and keys.

## 4. Optional prompt sync trigger
`SessionStart` hook in `.codex/config.toml` can run:
```bash
python3 .codex/hooks/sync_codex_prompts_to_langfuse.py
```
