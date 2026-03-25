# raibis

Personal LifeOS — tasks, projects, sprints, notes and AI, all in your terminal.

## Features (MVP)
- **Goals → Projects → Sprints → Tasks** (with subtasks)
- **Notes** and **Resources** linked to tasks/projects
- **Kanban board**, **Sprint board**, **Pomodoro timer**
- **AI sidebar** powered by any vendor (Anthropic, OpenAI, Google, Ollama)

## Setup

```bash
# 1. Clone and install
git clone <repo>
cd raibis
pip install -e .

# 2. Configure
cp .env.example .env
# Edit .env — add your AI API key

# 3. Run
raibis
```

## AI Providers

| Provider | Key in .env | Notes |
|---|---|---|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | Default |
| OpenAI (GPT) | `OPENAI_API_KEY` | |
| Google (Gemini) | `GOOGLE_API_KEY` | |
| Ollama | `OLLAMA_BASE_URL` | Runs locally, no key needed |

Switch providers by changing `AI_PROVIDER=` in `.env`.

## Keyboard shortcuts (TUI)

| Key | Action |
|---|---|
| `1` | Dashboard |
| `2` | Kanban |
| `3` | Sprint board |
| `4` | Pomodoro |
| `Ctrl+A` | Toggle AI sidebar |
| `n` | New item (context-sensitive) |
| `q` | Quit |
