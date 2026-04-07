TAURI_BINS := ../raibis-tauri/src-tauri/binaries

.PHONY: build-sidecar build-sidecar-intel build-sidecar-universal dev

## Build Go sidecar for Apple Silicon (arm64)
build-sidecar:
	mkdir -p $(TAURI_BINS)
	GOOS=darwin GOARCH=arm64 go build -o $(TAURI_BINS)/lifeos-aarch64-apple-darwin ./cmd/lifeos
	@echo "✓ Sidecar built: $(TAURI_BINS)/lifeos-aarch64-apple-darwin"

## Build Go sidecar for Intel Mac (x86_64)
build-sidecar-intel:
	mkdir -p $(TAURI_BINS)
	GOOS=darwin GOARCH=amd64 go build -o $(TAURI_BINS)/lifeos-x86_64-apple-darwin ./cmd/lifeos
	@echo "✓ Sidecar built: $(TAURI_BINS)/lifeos-x86_64-apple-darwin"

## Build universal sidecar (arm64 + x86_64 via lipo)
build-sidecar-universal: build-sidecar build-sidecar-intel
	lipo -create -output $(TAURI_BINS)/lifeos-universal-apple-darwin \
		$(TAURI_BINS)/lifeos-aarch64-apple-darwin \
		$(TAURI_BINS)/lifeos-x86_64-apple-darwin
	@echo "✓ Universal sidecar built"

## Run Go server directly (for browser-based dev)
dev:
	go run ./cmd/lifeos
