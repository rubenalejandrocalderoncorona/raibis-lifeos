# Raibis LifeOS — Troubleshooting Guide

Solutions to real problems encountered during development. Keep this updated.

---

## 1. Finding the Correct Repository

**Problem:** Multiple `raibis*` directories exist locally and remotely and it's unclear which is canonical.

**Answer:** The canonical repo is `raibis-lifeos/`. The others are:

| Directory | Status | Notes |
|-----------|--------|-------|
| `raibis-lifeos/` | ✅ **Active** | Monorepo — Go backend + Web GUI + Tauri macOS app |
| `raibis/` (standalone) | ❌ Stale copy | Frozen at Mar 24, no remote, superseded |
| `raibis-go/` (standalone) | ❌ Stale copy | Not a git repo, superseded by `raibis-lifeos/raibis-go/` |

**Remote repos to keep:** `rubenalejandrocalderoncorona/raibis-lifeos` (origin).  
**Remote repos to archive/delete:** `rubenalejandrocalderoncorona/lifeos-raibis` (older generation).

**Cleanup:**
```bash
rm -rf ~/Documents/PersonalRepos/ClaudeCodeProjects/raibis
rm -rf ~/Documents/PersonalRepos/ClaudeCodeProjects/raibis-go
```

---

## 2. Running the Web GUI

**Problem:** Running `go run ./cmd/lifeos` fails — no output or wrong usage shown.

**Root cause:** The server requires the `server` subcommand and `--port` flag.

**Fix:**
```bash
cd ~/Documents/PersonalRepos/ClaudeCodeProjects/raibis-lifeos/raibis-go
make dev-gui          # syncs GUI files then starts server
```

Or manually:
```bash
go run ./cmd/lifeos server --port 3344
```

Then open **http://localhost:3344** in your browser.

---

## 3. Browser Showing Old / Cached Version

**Problem:** Browser shows an outdated version of the app at `localhost:3344`, switching between old and new on reload.

**Root causes:**
1. The Go binary was compiled before GUI files were synced — so it embeds old HTML/JS/CSS.
2. Browser cache is serving stale assets.

**Fix — always use `go run` for development (recompiles every time):**
```bash
cd raibis-lifeos/raibis-go
make dev-gui    # syncs files first, then go run (always fresh)
```

**Fix — hard-refresh the browser:**
- `Cmd+Shift+R` (macOS) forces a full cache bypass.

**Why this happens:** The Go server uses `//go:embed` to bake the frontend files into the binary at compile time. There are **two copies** of the GUI files:
- `raibis/gui/public/` — the source you edit
- `raibis-go/internal/gui/public/` — what gets embedded into the binary

`make sync-gui` (or `make dev-gui`) copies from source → embed before compiling.

**Never run a pre-built binary for dev** — it will serve whatever was embedded when it was last built.

---

## 4. macOS App Showing Old Version

**Problem:** The installed `/Applications/Raibis LifeOS.app` shows an outdated version of the app after making changes.

**Root cause:** The `.app` bundle contains a compiled Go binary with the GUI embedded at build time. Editing source files does not update the installed app automatically.

**Fix — one command:**
```bash
cd ~/Documents/PersonalRepos/ClaudeCodeProjects/raibis-lifeos/raibis-go
make deploy-app
```

This does everything in sequence:
1. Syncs GUI source files → embed directory
2. Compiles a new Go binary (arm64)
3. Takes ownership of the binary inside `.app` (avoids permission errors)
4. Copies the new binary into `/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos`
5. Re-signs the app bundle (`codesign --force --deep --sign -`)
6. Kills any running instance and relaunches

**Manual steps (if make fails):**
```bash
# 1. Sync GUI
make sync-gui

# 2. Build binary
make build-sidecar

# 3. Take ownership and replace
chown $USER "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos"
cp -f ../raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin \
      "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos"

# 4. Re-sign (required after replacing binary)
codesign --force --deep --sign - "/Applications/Raibis LifeOS.app"

# 5. Relaunch
pkill -f "Raibis LifeOS"; sleep 1
open "/Applications/Raibis LifeOS.app"
```

**Why re-signing is required:** macOS Gatekeeper validates the code signature. Replacing the binary invalidates it, causing "app is damaged" errors or silent launch failure.

---

## 5. macOS App Won't Build (Rust/Cargo Not Found)

**Problem:** `npm run dev` or `npm run build` inside `raibis-tauri/` fails with:
```
failed to run 'cargo metadata' command... No such file or directory
```

**Root cause:** Rust and Cargo are not installed. Tauri requires them to compile the Rust wrapper.

**Options:**

**Option A — Install Rust (enables full Tauri dev/build):**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
cd raibis-tauri && npm run dev
```

**Option B — Update the existing installed .app directly (no Rust needed):**
```bash
cd raibis-go
make deploy-app
```
This bypasses Tauri entirely and replaces just the Go binary inside the already-installed `.app`.

**Option B is the recommended workflow** until a full release build is needed.

---

## 6. File Structure Reference

```
raibis-lifeos/
├── raibis/
│   └── gui/
│       └── public/          ← SOURCE OF TRUTH — edit files here
│           ├── app.js
│           ├── style.css
│           ├── index.html
│           ├── animations.js
│           └── design-system.css
├── raibis-go/
│   ├── Makefile              ← build/sync/deploy targets
│   ├── cmd/lifeos/           ← Go server entry point
│   └── internal/
│       └── gui/
│           └── public/       ← EMBED DIR — auto-synced copy, do not edit directly
├── raibis-tauri/
│   └── src-tauri/
│       └── binaries/
│           └── lifeos-aarch64-apple-darwin  ← compiled sidecar (gitignored)
└── TROUBLESHOOTING.md        ← this file
```

---

## 8. macOS App Shows Blank White Screen

**Problem:** The installed `/Applications/Raibis LifeOS.app` opens but shows only a blank white screen.

**Root cause A — `visible: false` baked into the Rust binary:**
`tauri.conf.json` had `"visible": false` with a Rust `wait_for_server()` + `show()` pattern.
If the Rust binary was built before this was corrected (or if `show()` fails silently), the window
opens but never becomes visible.

**Fix:** Change `tauri.conf.json` window to `"visible": true`, then **recompile the Rust binary**:
```bash
# One-time Rust install (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Recompile Tauri (required — config is baked into the Rust binary)
cd raibis-lifeos/raibis-tauri
npm install   # first time only
npm run build
```
Output: `src-tauri/target/release/bundle/macos/Raibis LifeOS.app`
Copy/install that `.app` to `/Applications/`.

---

**Root cause B — Port 3344 already in use (sidecar fails silently):**
If a previous `lifeos` process is still running, the new sidecar tries to bind port 3344 and fails
with `bind: address already in use`. The WebView has nothing to load → blank screen.

**Symptoms:**
```
WARN: ... bind: address already in use
```
or the app window opens but the WebView shows a "connection refused" / blank page.

**Fix — kill lingering processes before launching:**
```bash
pkill -9 -f lifeos      # kill all lifeos processes
pkill -9 -f "Raibis LifeOS"
sleep 1
open "/Applications/Raibis LifeOS.app"
```

**`deploy-app` already does this automatically** (pkill step is built in).

---

**Root cause C — Go sidecar binary is stale / not re-signed:**
If the binary was replaced without re-signing, macOS Gatekeeper silently blocks it.

**Fix:**
```bash
cd raibis-lifeos/raibis-go
make deploy-app   # builds, replaces, re-signs, relaunches — one command
```

---

**Verification checklist:**
```bash
# Confirm port 3344 is free before launch
lsof -i :3344   # should return nothing

# Confirm sidecar binary exists and is the right arch
file "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos"
# → Mach-O 64-bit executable arm64

# Confirm app signature is valid
codesign --verify --deep --strict "/Applications/Raibis LifeOS.app"
# → no output = valid
```

---

## 7. Daily Development Workflow

### Browser dev (fastest iteration):
```bash
cd raibis-lifeos/raibis-go
make dev-gui        # sync + go run; hard-refresh browser after changes
```
> Re-run `make dev-gui` any time you change `app.js`, `style.css`, or `index.html`.

### macOS app dev:
```bash
cd raibis-lifeos/raibis-go
make deploy-app     # sync + build + inject into .app + relaunch
```

### Verify what's embedded in a binary:
```bash
strings /path/to/lifeos | grep 'someRecentFunction'
# If 0 matches → binary is stale, rebuild
```

### Verify app bundle has the right binary:
```bash
md5 "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos"
md5 raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin
# Both hashes must match
```
