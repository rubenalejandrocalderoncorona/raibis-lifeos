# raibis-go — LifeOS Task Manager

A headless Go task manager with a Bubble Tea TUI and an HTTP REST server
designed to run as a Tauri sidecar for a desktop GUI.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  cmd/tui          Bubble Tea terminal UI                │
│  cmd/server       HTTP REST server (Tauri sidecar)      │
│         │                    │                          │
│         └────────────────────┘                          │
│                      │                                  │
│              internal/service                           │
│              TaskService interface                      │
│                      │                                  │
│              internal/storage                           │
│              Storage interface → SQLite (WAL)           │
│                      │                                  │
│              ~/.local/share/raibis/lifeos.db            │
└─────────────────────────────────────────────────────────┘
```

## Quick start

```bash
# 1. Install Go (once)
brew install go          # macOS
# or: https://go.dev/dl/

# 2. Download dependencies
cd raibis-go
go mod tidy

# 3. Run the TUI
go run ./cmd/tui
# → press space, type "Fix login bug #high @myproject !2026-04-30", Enter

# 4. Run the REST server (separate terminal)
go run ./cmd/server
# → listening on http://localhost:3344
```

## Quick Capture mini-syntax

Press `space` or `:` anywhere in the TUI to open the capture bar:

```
Fix login bug  #high  @myproject  !2026-04-30
^^^^^^^^^^^^^  ^^^^^  ^^^^^^^^^^  ^^^^^^^^^^^
title          pri    @project    !due date
```

| Token | Meaning |
|-------|---------|
| `#low` / `#medium` / `#high` / `#urgent` | Priority |
| `@partialname` | Fuzzy-match a project (case-insensitive `contains`) |
| `!YYYY-MM-DD` | Due date |
| Everything else | Task title |

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | List tasks (`?project_id=`, `?status=`, `?sprint_id=`, `?all=1`) |
| `POST` | `/api/tasks` | Create task (JSON body) |
| `GET` | `/api/tasks/:id` | Get task |
| `PATCH` | `/api/tasks/:id` | Update task fields |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `GET` | `/api/goals` | List active goals |
| `POST` | `/api/goals` | Create goal |
| `GET` | `/api/projects` | List active projects |
| `POST` | `/api/projects` | Create project |
| `POST` | `/api/quick-capture` | `{"input":"Fix bug #high"}` → creates task |
| `GET` | `/api/dashboard` | Stats + today's tasks |

```bash
# Examples
curl localhost:3344/api/tasks

curl -X POST localhost:3344/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Write tests","priority":"high","due_date":"2026-04-01"}'

curl -X POST localhost:3344/api/quick-capture \
  -H 'Content-Type: application/json' \
  -d '{"input":"Deploy to prod #urgent !2026-03-31"}'

curl -X PATCH localhost:3344/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"done"}'
```

## Keyboard shortcuts (TUI)

| Key | Action |
|-----|--------|
| `1` – `6` | Switch views (Dashboard / Kanban / Goals / Projects / Sprint / Resources) |
| `j` / `k` or `↑` / `↓` | Move up/down |
| `h` / `l` or `←` / `→` | Move left/right (Kanban columns) |
| `space` or `:` | Open Quick Capture |
| `Enter` | Confirm capture |
| `Esc` | Cancel |
| `q` | Quit |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LIFEOS_DB` | `~/.local/share/raibis/lifeos.db` | SQLite database path |
| `LIFEOS_PORT` | `3344` | HTTP server port |

## Building a release binary

```bash
go build -ldflags="-s -w" -o raibis-tui    ./cmd/tui
go build -ldflags="-s -w" -o raibis-server ./cmd/server
```

Both binaries are fully self-contained — no Go runtime needed on the target machine.

## Tauri sidecar

See [`ui-tauri/README.md`](ui-tauri/README.md) for complete instructions on
bundling `raibis-server` inside a Tauri desktop application.

## Database compatibility

`lifeos.db` uses the same schema as the Python TUI (`raibis/`).
Both projects can read/write the same file — schema uses
`CREATE TABLE IF NOT EXISTS` so it is safe to open with either tool.

## License

MIT
