TAURI_BINS  := ../raibis-tauri/src-tauri/binaries
GUI_SRC     := ../raibis/gui/public
GUI_EMBED   := internal/gui/public
GUI_FILES   := app.js style.css index.html animations.js design-system.css
APP_BUNDLE  := /Applications/Raibis LifeOS.app
APP_BIN     := $(APP_BUNDLE)/Contents/MacOS/lifeos
SIDECAR     := $(TAURI_BINS)/lifeos-aarch64-apple-darwin

PORT        ?= 3344
STUDYTRACK_URL ?= http://localhost:3333

.PHONY: build-sidecar build-sidecar-intel build-sidecar-universal \
        dev sync-gui dev-gui deploy-app \
        serve serve-bg stop status health test-api \
        web app tui

## ── Quick start ───────────────────────────────────────────────────────────────

## Sync GUI and start the web server, then open the browser
web: sync-gui
	@echo "→ Starting web UI on http://localhost:$(PORT)"
	@open http://localhost:$(PORT) &
	go run ./cmd/lifeos server --port $(PORT)

## Build sidecar, inject into /Applications, re-sign, and launch the macOS app
app: deploy-app

## Start the terminal UI
tui:
	go run ./cmd/lifeos tui

## ── Development ───────────────────────────────────────────────────────────────

## Sync GUI files from raibis/gui/public → internal/gui/public (required before build/run)
sync-gui:
	@for f in $(GUI_FILES); do cp $(GUI_SRC)/$$f $(GUI_EMBED)/$$f && echo "  synced $$f"; done
	@echo "✓ GUI synced"

## Sync GUI then run dev server (browser)
dev-gui: sync-gui
	go run ./cmd/lifeos server --port $(PORT)

## Run Go server directly (no GUI sync — fast restart)
dev:
	go run ./cmd/lifeos server --port $(PORT)

## ── Deployment ────────────────────────────────────────────────────────────────

## Build the API server binary
build:
	@echo "→ Building raibis-go server..."
	go build -o bin/raibis-server ./cmd/server
	@echo "✓ Binary: bin/raibis-server"

## Build + start the API server in the foreground (Ctrl-C to stop)
serve: build
	@echo "→ Starting raibis-go on port $(PORT)  (db: $$LIFEOS_DB)"
	@echo "   Export STUDYTRACK_URL=$(STUDYTRACK_URL) to link StudyTrack habits"
	STUDYTRACK_URL=$(STUDYTRACK_URL) LIFEOS_PORT=$(PORT) ./bin/raibis-server

## Build + start the API server in the background (logs → /tmp/raibis-server.log)
serve-bg: build
	@echo "→ Starting raibis-go in background on port $(PORT)..."
	STUDYTRACK_URL=$(STUDYTRACK_URL) LIFEOS_PORT=$(PORT) \
	    nohup ./bin/raibis-server > /tmp/raibis-server.log 2>&1 & \
	    echo $$! > /tmp/raibis-server.pid
	@sleep 1
	@echo "✓ PID $$(cat /tmp/raibis-server.pid) — logs: /tmp/raibis-server.log"

## Stop a background server started with serve-bg
stop:
	@if [ -f /tmp/raibis-server.pid ]; then \
	    kill $$(cat /tmp/raibis-server.pid) 2>/dev/null && echo "✓ Stopped" || echo "Process not running"; \
	    rm -f /tmp/raibis-server.pid; \
	else \
	    echo "No PID file found — server may not be running"; \
	fi

## Check if the server is responding
status:
	@curl -sf http://localhost:$(PORT)/api/dashboard > /dev/null \
	    && echo "✓ raibis-go is UP on port $(PORT)" \
	    || echo "✗ raibis-go is DOWN on port $(PORT)"

## ── Smoke tests ───────────────────────────────────────────────────────────────

## Run a full API smoke test against the running server
test-api:
	@echo "=== raibis-go API smoke tests (port $(PORT)) ==="
	@BASE=http://localhost:$(PORT); \
	PASS=0; FAIL=0; \
	_check() { \
	    STATUS=$$(curl -s -o /dev/null -w "%{http_code}" "$$1"); \
	    if [ "$$STATUS" = "$$2" ]; then \
	        echo "  ✓ $$3  [$$STATUS]"; PASS=$$((PASS+1)); \
	    else \
	        echo "  ✗ $$3  [got $$STATUS, want $$2]"; FAIL=$$((FAIL+1)); \
	    fi; \
	}; \
	_check "$$BASE/api/dashboard"       200 "GET  /api/dashboard"; \
	_check "$$BASE/api/tasks"           200 "GET  /api/tasks"; \
	_check "$$BASE/api/goals"           200 "GET  /api/goals"; \
	_check "$$BASE/api/projects"        200 "GET  /api/projects"; \
	_check "$$BASE/api/sprints"         200 "GET  /api/sprints"; \
	_check "$$BASE/api/categories"      200 "GET  /api/categories"; \
	_check "$$BASE/api/tags"            200 "GET  /api/tags"; \
	_check "$$BASE/api/habits"          200 "GET  /api/habits"; \
	_check "$$BASE/api/notes"           200 "GET  /api/notes"; \
	_check "$$BASE/api/kanban"          200 "GET  /api/kanban"; \
	_check "$$BASE/api/tasks/9999"      404 "GET  /api/tasks/9999 (not found)"; \
	_check "$$BASE/api/habits/9999"     404 "GET  /api/habits/9999 (not found)"; \
	HABIT_ID=$$(curl -s -X POST $$BASE/api/habits \
	    -H 'Content-Type: application/json' \
	    -d '{"title":"Test habit","type":"general"}' | sed -n 's/.*"id":\([0-9]*\).*/\1/p'); \
	if [ -n "$$HABIT_ID" ]; then \
	    echo "  ✓ POST /api/habits  [created id=$$HABIT_ID]"; PASS=$$((PASS+1)); \
	    STATUS=$$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $$BASE/api/habits/$$HABIT_ID); \
	    if [ "$$STATUS" = "200" ]; then echo "  ✓ DELETE /api/habits/$$HABIT_ID  [200]"; PASS=$$((PASS+1)); \
	    else echo "  ✗ DELETE /api/habits/$$HABIT_ID  [$$STATUS]"; FAIL=$$((FAIL+1)); fi; \
	else \
	    echo "  ✗ POST /api/habits  [no id returned]"; FAIL=$$((FAIL+1)); \
	fi; \
	echo ""; \
	echo "=== Results: $$PASS passed, $$FAIL failed ==="; \
	[ "$$FAIL" = "0" ]

## ── Tauri / macOS app targets (unchanged) ────────────────────────────────────

## Build Go sidecar for Apple Silicon (arm64) — includes latest GUI
build-sidecar: sync-gui
	mkdir -p $(TAURI_BINS)
	GOOS=darwin GOARCH=arm64 go build -o $(SIDECAR) ./cmd/lifeos
	@echo "✓ Sidecar built: $(SIDECAR)"

## Build Go sidecar for Intel Mac (x86_64)
build-sidecar-intel: sync-gui
	mkdir -p $(TAURI_BINS)
	GOOS=darwin GOARCH=amd64 go build -o $(TAURI_BINS)/lifeos-x86_64-apple-darwin ./cmd/lifeos
	@echo "✓ Sidecar built: $(TAURI_BINS)/lifeos-x86_64-apple-darwin"

## Build universal sidecar (arm64 + x86_64 via lipo)
build-sidecar-universal: build-sidecar build-sidecar-intel
	lipo -create -output $(TAURI_BINS)/lifeos-universal-apple-darwin \
		$(SIDECAR) \
		$(TAURI_BINS)/lifeos-x86_64-apple-darwin
	@echo "✓ Universal sidecar built"

## Build sidecar, inject into /Applications/Raibis LifeOS.app, re-sign, and relaunch
deploy-app: build-sidecar
	@echo "→ Deploying to $(APP_BUNDLE)..."
	@chown $(USER) "$(APP_BIN)" 2>/dev/null || true
	cp -f $(SIDECAR) "$(APP_BIN)"
	codesign --force --deep --sign - "$(APP_BUNDLE)"
	@echo "✓ Deployed and re-signed"
	pkill -f "Raibis LifeOS" 2>/dev/null || true
	sleep 1
	open "$(APP_BUNDLE)"
	@echo "✓ Launched"

## ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "raibis-go targets:"
	@echo "  make web          — sync GUI + start web server + open browser  (PORT=3344)"
	@echo "  make app          — build sidecar + inject into macOS .app + launch"
	@echo "  make tui          — launch the terminal UI"
	@echo "  make build        — compile binary to bin/raibis-server"
	@echo "  make serve        — build + run server in foreground  (PORT=3344)"
	@echo "  make serve-bg     — build + run server in background"
	@echo "  make stop         — stop background server"
	@echo "  make status       — ping /api/dashboard to check liveness"
	@echo "  make test-api     — smoke-test all API endpoints"
	@echo "  make dev          — go run (no binary, fast iteration)"
	@echo "  make deploy-app   — build sidecar + inject into macOS .app"
	@echo ""

