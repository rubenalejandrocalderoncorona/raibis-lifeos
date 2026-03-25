# raibis-lifeos

A personal LifeOS task manager with two interoperable interfaces that share the same SQLite database:

| Sub-project | Stack | What it is |
|---|---|---|
| `raibis/` | Python 3.11 + Textual | Original TUI — full-featured terminal app with AI sidebar |
| `raibis-go/` | Go 1.22 + Bubble Tea | Go rewrite — fast TUI **plus** HTTP REST server (Tauri sidecar ready) |

Both read/write `~/.local/share/raibis/lifeos.db` so you can run them simultaneously on the same data.

---

## Architecture

```
Goals → Projects → Sprints → Tasks (subtasks)
                              ↳ Notes, Resources, Pomodoro sessions
```

The Go server (`raibis-go/cmd/server`) also serves the web GUI from `raibis/gui/public/` — one binary gives you a browser UI at `localhost:3344` **and** full REST API for a future Tauri desktop app.

---

## raibis/ — Python TUI

### Prerequisites

- Python 3.11+ (`brew install python@3.11` on macOS)
- SQLite (bundled with Python)

### Setup

```bash
cd raibis

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment config
cp .env.example .env
# Edit .env — set your AI_PROVIDER and API key if using the AI sidebar
```

### Run

```bash
# Terminal UI
cd raibis
source .venv/bin/activate
python -m raibis.tui.app
```

### Key bindings

| Key | Action |
|---|---|
| `1` | Dashboard |
| `2` | Kanban |
| `3` | Sprint |
| `4` | Pomodoro |
| `Ctrl+A` | AI sidebar |
| `n` | New task |
| `q` | Quit |

### AI providers

Set `AI_PROVIDER` in `.env` to one of: `anthropic` | `openai` | `google` | `ollama`

---

## raibis-go/ — Go TUI + REST Server

### Prerequisites

- Go 1.22+ (`brew install go` on macOS)
- No CGo, no C toolchain needed — uses `modernc.org/sqlite` (pure Go)

### Setup

```bash
cd raibis-go

# Download dependencies
go mod tidy
```

### Run the TUI

```bash
go run ./cmd/tui
```

### Run the REST server (+ web GUI)

```bash
go run ./cmd/server
# → GUI:  http://localhost:3344
# → API:  http://localhost:3344/api/...
```

The server auto-discovers the web GUI from `raibis/gui/public/`. If you move things around, set:

```bash
RAIBIS_GUI=/absolute/path/to/raibis/gui/public go run ./cmd/server
```

### Build binaries

```bash
go build -o raibis-tui    ./cmd/tui
go build -o raibis-server ./cmd/server
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `LIFEOS_DB` | `~/.local/share/raibis/lifeos.db` | Path to SQLite database |
| `LIFEOS_PORT` | `3344` | HTTP server port |
| `RAIBIS_GUI` | auto-detected | Path to web GUI static files |

### TUI key bindings

| Key | Action |
|---|---|
| `1`–`6` | Switch views (Dashboard / Kanban / Goals / Projects / Sprint / Resources) |
| `space` or `:` | Quick Capture overlay |
| `j` / `k` | Navigate down / up |
| `h` / `l` | Navigate left / right (Kanban columns) |
| `q` | Quit |

### Quick Capture syntax

```
Fix login bug #high @my-project !2026-04-30
           ↑          ↑              ↑
        priority   project         due date
        (low/medium/high/urgent)  (fuzzy match)  (YYYY-MM-DD)
```

### REST API

```
GET  /api/dashboard
GET  /api/tasks          POST /api/tasks
GET  /api/tasks/:id      PATCH /api/tasks/:id    DELETE /api/tasks/:id
GET  /api/goals          POST /api/goals
PATCH /api/goals/:id
GET  /api/projects       POST /api/projects
GET  /api/kanban?project_id=
GET  /api/sprints        POST /api/sprints
PATCH /api/sprints/:id
GET  /api/resources      POST /api/resources
DELETE /api/resources/:id
POST /api/quick-capture  { "input": "Title #priority @project !date" }
POST /api/pomodoro       { "task_id": 1, "duration_mins": 25, "completed": true }
```

---

## Running both simultaneously

```bash
# Terminal 1 — Go server (web GUI + REST)
cd raibis-go && go run ./cmd/server

# Terminal 2 — Go TUI
cd raibis-go && go run ./cmd/tui

# Terminal 3 — Python TUI (optional, same DB)
cd raibis && source .venv/bin/activate && python -m raibis.tui.app
```

All three read/write the same `~/.local/share/raibis/lifeos.db`.

---

## Database

The schema is embedded in the Go binary (`raibis-go/internal/storage/schema.sql`) and applied idempotently on startup (`CREATE TABLE IF NOT EXISTS`). The Python project uses the identical schema at `raibis/raibis/db/schema.sql`.

To use a custom database path:

```bash
LIFEOS_DB=~/my-custom.db go run ./raibis-go/cmd/server
```

---

## Project structure

```
raibis-lifeos/
├── README.md                     ← you are here
├── raibis/                       ← Python TUI
│   ├── raibis/
│   │   ├── tui/app.py            ← Textual entry point
│   │   ├── db/schema.sql         ← SQLite schema
│   │   ├── db/database.py        ← CRUD helpers
│   │   ├── models/__init__.py    ← dataclass models
│   │   └── ai/                   ← AI provider abstractions
│   ├── gui/public/               ← Web GUI (served by Go server)
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── pyproject.toml
└── raibis-go/                    ← Go TUI + REST server
    ├── cmd/
    │   ├── tui/main.go           ← Bubble Tea entry point
    │   └── server/main.go        ← HTTP REST server
    ├── internal/
    │   ├── domain/               ← Types: Task, Goal, Project, Sprint
    │   ├── storage/              ← SQLite storage layer
    │   ├── service/              ← Business logic + QuickCapture parser
    │   └── tui/                  ← Views, styles, key bindings, overlay
    ├── go.mod
    └── ui-tauri/README.md        ← Tauri sidecar setup instructions
```
