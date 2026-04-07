# Raibis LifeOS — Packaging & Distribution Guide

## Project Layout

```
raibis-lifeos/
├── raibis-go/                  ← Go backend (server, domain, storage)
│   ├── cmd/lifeos/             ← Main entrypoint (lifeos server --port 3344)
│   ├── internal/               ← Domain, storage, service, GUI embedding
│   └── Makefile                ← build-sidecar, dev targets
│
├── raibis-tauri/               ← Tauri native macOS shell
│   ├── package.json
│   └── src-tauri/
│       ├── src/main.rs         ← Tray, hotkey, HUD, sidecar spawn
│       ├── tauri.conf.json     ← App config (identifier, window, bundle)
│       ├── Cargo.toml
│       ├── capabilities/       ← Tauri v2 permission grants
│       ├── icons/              ← App icons (PNG, ICNS, ICO)
│       ├── binaries/           ← Compiled Go sidecar (gitignored)
│       └── target/             ← Rust build output (gitignored)
│
└── raibis/gui/public/          ← Frontend (vanilla JS/CSS SPA)
    ├── app.js
    └── style.css
```

The GUI (`app.js`, `style.css`) is served by the Go backend at runtime.
Tauri renders it in WKWebView — no separate frontend build step needed.

---

## Working on the GUI

You can edit the frontend completely independently of the Tauri shell:

- Edit `raibis/gui/public/app.js` or `style.css` freely
- Changes are live on next page refresh (or `npm run dev` restart)
- The Tauri shell is invisible to the frontend; it just points a WebView at `localhost:3344`

Only touch `src-tauri/src/main.rs` for native shell features: tray menu,
hotkeys, HUD window behavior, etc.

---

## Prerequisites (any build machine)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Go (1.21+)
brew install go

# Node.js (18+)
brew install node
```

---

## First-Time Setup on a New Machine

```bash
git clone <your-repo> raibis-lifeos
cd raibis-lifeos

# 1. Build the Go sidecar
cd raibis-go
make build-sidecar
# → raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin

# 2. Install npm deps
cd ../raibis-tauri
npm install
```

---

## After Making Modifications — Rebuild & Repackage

```bash
# If you changed Go code (backend / API):
cd raibis-go
make build-sidecar          # recompile sidecar for current arch

# Build .app and .dmg
cd ../raibis-tauri
source "$HOME/.cargo/env"   # if cargo not in PATH
npm run build
```

Output:
- `src-tauri/target/release/bundle/macos/Raibis LifeOS.app`
- `src-tauri/target/release/bundle/dmg/Raibis LifeOS_<version>_aarch64.dmg`

---

## Distributing to Another Person

Send the `.dmg` file:

```
src-tauri/target/release/bundle/dmg/Raibis LifeOS_<version>_aarch64.dmg
```

The recipient double-clicks, drags to `/Applications`, and launches the app.
Everything — Go server, GUI assets — is self-contained inside the `.app` bundle.
User data lives at `~/.local/share/raibis/lifeos.db`.

---

## Bumping the Version

Edit these two files before running `npm run build`:

| File | Field |
|---|---|
| `raibis-tauri/src-tauri/tauri.conf.json` | `"version": "x.x.x"` |
| `raibis-tauri/src-tauri/Cargo.toml` | `version = "x.x.x"` |

---

## What to Gitignore

```gitignore
# Tauri build artifacts
raibis-tauri/src-tauri/target/
raibis-tauri/node_modules/

# Compiled sidecar (architecture-specific, rebuilt per machine)
raibis-tauri/src-tauri/binaries/
```

The sidecar binary is not committed — each machine builds it from source via
`make build-sidecar`. This is required because the binary is architecture-specific
(`aarch64` for Apple Silicon, `x86_64` for Intel).
