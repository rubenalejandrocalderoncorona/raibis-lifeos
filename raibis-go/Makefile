TAURI_BINS  := ../raibis-tauri/src-tauri/binaries
GUI_SRC     := ../raibis/gui/public
GUI_EMBED   := internal/gui/public
GUI_FILES   := app.js style.css index.html animations.js design-system.css
APP_BUNDLE  := /Applications/Raibis LifeOS.app
APP_BIN     := $(APP_BUNDLE)/Contents/MacOS/lifeos
SIDECAR     := $(TAURI_BINS)/lifeos-aarch64-apple-darwin

.PHONY: build-sidecar build-sidecar-intel build-sidecar-universal dev sync-gui dev-gui deploy-app

## Sync GUI files from raibis/gui/public → internal/gui/public (required before build/run)
sync-gui:
	@for f in $(GUI_FILES); do cp $(GUI_SRC)/$$f $(GUI_EMBED)/$$f && echo "  synced $$f"; done
	@echo "✓ GUI synced"

## Sync GUI then run dev server (browser)
dev-gui: sync-gui
	go run ./cmd/lifeos server --port 3344

## Run Go server directly (no GUI sync — fast restart)
dev:
	go run ./cmd/lifeos server --port 3344

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
