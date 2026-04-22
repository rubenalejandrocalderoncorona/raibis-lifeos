# Raibis LifeOS — Quick Setup

Run all commands from the **project root** (`raibis-lifeos/`).

---

## Prerequisites

- Go 1.22+
- macOS (for the native app)
- **Raibis LifeOS.app** installed in `/Applications/` (for `make app`)

---

## Start

| Command | What it does |
|---|---|
| `make web` | Syncs the GUI, starts the Go server on port 3344, and opens `http://localhost:3344` in your browser. Press **Ctrl-C** to stop. |
| `make app` | Builds the Go sidecar and Tauri shell, injects both into `/Applications/Raibis LifeOS.app`, re-signs the bundle, and launches the native macOS app (~25 s). |
| `make tui` | Launches the terminal UI (no server needed). |

---

## Stop / Restart

| Command | What it does |
|---|---|
| `make stop` | Kills the web server, the macOS app, and any `lifeos` sidecar process. Frees port 3344. |
| `make restart-web` | Stops everything, re-syncs GUI files, and starts the web UI again. |
| `make restart-app` | Stops everything, rebuilds the sidecar, and relaunches the macOS app. |

---

## Notes

- The default port is **3344**. Override with `make web PORT=4000`.
- `make app` always rebuilds the binary from source before injecting — your latest code changes are always included.
- `make restart-web` is useful after editing frontend files (`app.js`, `style.css`, etc.) without rebuilding the binary.
- `make restart-app` is the full rebuild cycle for the macOS app.
