ROOT      := $(shell pwd)
GO_DIR    := $(ROOT)/raibis-go
TAURI_DIR := $(ROOT)/raibis-tauri/src-tauri
PORT      ?= 3344

.PHONY: web app tui stop restart-web restart-app hard

MODE ?= web
mode ?= $(MODE)

# ── Start ──────────────────────────────────────────────────────────────────────

## Start the web UI (syncs GUI, starts server, opens browser)
web:
	@echo "→ Syncing GUI files..."
	@cd $(GO_DIR) && for f in app.js style.css index.html animations.js design-system.css; do \
	    cp ../raibis/gui/public/$$f internal/gui/public/$$f && echo "  synced $$f"; \
	done
	@echo "→ Starting web UI on http://localhost:$(PORT)  (Ctrl-C to stop)"
	@sleep 1 && open http://localhost:$(PORT) &
	@cd $(GO_DIR) && go run ./cmd/lifeos server --port $(PORT)

## Build Go sidecar + Tauri shell, inject both into /Applications/Raibis LifeOS.app, and launch
app:
	@echo "→ Killing any running instance..."
	@pkill -f "Raibis LifeOS" 2>/dev/null || true
	@pkill -f "lifeos server" 2>/dev/null || true
	@lsof -ti tcp:$(PORT) | xargs kill -9 2>/dev/null || true
	@sleep 2
	@echo "→ Building Go sidecar..."
	@cd $(GO_DIR) && for f in app.js style.css index.html animations.js design-system.css; do \
	    cp ../raibis/gui/public/$$f internal/gui/public/$$f 2>/dev/null || true; \
	done
	@cd $(GO_DIR) && GOOS=darwin GOARCH=arm64 \
	    go build -o ../raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin ./cmd/lifeos
	@echo "→ Building Tauri shell..."
	@cargo build --manifest-path $(TAURI_DIR)/Cargo.toml 2>&1 | tail -2
	@echo "→ Injecting into /Applications/Raibis LifeOS.app..."
	@chown $(USER) "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos" 2>/dev/null || true
	@chown $(USER) "/Applications/Raibis LifeOS.app/Contents/MacOS/raibis-lifeos" 2>/dev/null || true
	@cp -f "$(GO_DIR)/../raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin" \
	    "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos"
	@cp -f "$(TAURI_DIR)/target/debug/raibis-lifeos" \
	    "/Applications/Raibis LifeOS.app/Contents/MacOS/raibis-lifeos"
	@codesign --force --deep --sign - "/Applications/Raibis LifeOS.app"
	@echo "→ Launching app..."
	@open "/Applications/Raibis LifeOS.app"
	@sleep 3
	@osascript -e 'tell application "Raibis LifeOS" to quit' 2>/dev/null || true
	@sleep 1
	@open "/Applications/Raibis LifeOS.app"
	@echo "✓ Done"

## Launch the terminal UI
tui:
	@cd $(GO_DIR) && go run ./cmd/lifeos tui

# ── Stop / Restart ─────────────────────────────────────────────────────────────

## Stop all running Raibis processes (web server, macOS app, sidecar)
stop:
	@echo "→ Stopping Raibis LifeOS..."
	@pkill -f "Raibis LifeOS" 2>/dev/null || true
	@pkill -f "lifeos server" 2>/dev/null || true
	@pkill -f "cmd/lifeos" 2>/dev/null || true
	@lsof -ti tcp:$(PORT) | xargs kill -9 2>/dev/null || true
	@echo "✓ Stopped"

## Restart the web UI (stop server, re-sync GUI, restart)
restart-web: stop
	@sleep 1
	@$(MAKE) web

## Restart the macOS app (stop everything, rebuild, relaunch)
restart-app: stop
	@sleep 1
	@$(MAKE) app

# ── Hard refresh ───────────────────────────────────────────────────────────────

## Sync + rebuild and reload.  Default: web browser.  Pass mode=app for macOS app.
##   make hard          → kills server, syncs GUI, rebuilds Go, restarts + opens browser
##   make hard mode=app → kills app, syncs GUI, rebuilds Go sidecar, reinjects bundle, relaunches
hard:
	@echo "→ Killing running instance..."
	@pkill -f "Raibis LifeOS" 2>/dev/null || true
	@pkill -f "lifeos server" 2>/dev/null || true
	@pkill -f "cmd/lifeos" 2>/dev/null || true
	@lsof -ti tcp:$(PORT) | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "→ Syncing GUI files..."
	@cd $(GO_DIR) && for f in app.js style.css index.html animations.js design-system.css; do \
	    cp ../raibis/gui/public/$$f internal/gui/public/$$f && echo "  synced $$f"; \
	done
	@echo "→ Rebuilding Go binary..."
ifeq ($(or $(mode),$(MODE)),app)
	@cd $(GO_DIR) && GOOS=darwin GOARCH=arm64 \
	    go build -o ../raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin ./cmd/lifeos
	@echo "→ Injecting sidecar into /Applications/Raibis LifeOS.app..."
	@chown $(USER) "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos" 2>/dev/null || true
	@cp -f "$(GO_DIR)/../raibis-tauri/src-tauri/binaries/lifeos-aarch64-apple-darwin" \
	    "/Applications/Raibis LifeOS.app/Contents/MacOS/lifeos"
	@codesign --force --deep --sign - "/Applications/Raibis LifeOS.app"
	@echo "→ Launching app..."
	@open "/Applications/Raibis LifeOS.app"
	@sleep 3
	@osascript -e 'tell application "Raibis LifeOS" to quit' 2>/dev/null || true
	@sleep 1
	@open "/Applications/Raibis LifeOS.app"
	@echo "✓ Done — hard-refreshed (app)"
else
	@cd $(GO_DIR) && go build -o bin/lifeos ./cmd/lifeos
	@echo "→ Restarting server on http://localhost:$(PORT)..."
	@cd $(GO_DIR) && bin/lifeos server --port $(PORT) &
	@sleep 1 && open http://localhost:$(PORT) &
	@echo "✓ Done — hard-refreshed (web)"
endif
