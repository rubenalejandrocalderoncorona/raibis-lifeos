# Using Go Binary as a Tauri Sidecar

## What is a sidecar?
Tauri sidecars are external binaries bundled inside your Tauri app. When your desktop app launches, Tauri starts the sidecar process in the background and communicates with it (here: via HTTP REST).

## Step 1 — Build the Go server binary

```bash
# Build for your current machine (macOS arm64)
cd /path/to/raibis-go
go build -o raibis-server ./cmd/server

# Cross-compile for Tauri target triples:
# macOS Intel
GOOS=darwin GOARCH=amd64 go build -o raibis-server-x86_64-apple-darwin ./cmd/server
# macOS Apple Silicon
GOOS=darwin GOARCH=arm64 go build -o raibis-server-aarch64-apple-darwin ./cmd/server
# Windows x64
GOOS=windows GOARCH=amd64 go build -o raibis-server-x86_64-pc-windows-msvc.exe ./cmd/server
# Linux x64
GOOS=linux GOARCH=amd64 go build -o raibis-server-x86_64-unknown-linux-gnu ./cmd/server
```

Note: modernc.org/sqlite is pure Go — zero CGo — so cross-compilation works natively without a C toolchain.

## Step 2 — Add the sidecar to Tauri

In `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "externalBin": ["binaries/raibis-server"]
  }
}
```

Copy the compiled binary to `src-tauri/binaries/raibis-server-<target-triple>`.

## Step 3 — Launch sidecar from Rust

In `src-tauri/src/main.rs`:
```rust
use tauri::api::process::Command;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let (mut rx, _child) = Command::new_sidecar("raibis-server")
                .expect("raibis-server sidecar not found")
                .spawn()
                .expect("failed to spawn raibis-server");

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    println!("sidecar: {:?}", event);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Step 4 — Point your frontend at the sidecar

The Go server listens on `http://localhost:3344` by default.
In your React/Vue/Svelte frontend, use `fetch("http://localhost:3344/api/tasks")`.

To make the port configurable, set `LIFEOS_PORT` before spawning the sidecar
or pass it as an environment variable from the Tauri `setup` hook.

## Why pure Go works perfectly here

- **Single binary**: `go build` produces one self-contained executable. No Node.js, no Python runtime to bundle.
- **Cross-compilation**: `GOOS=darwin GOARCH=arm64 go build` — done. No native addon nightmares.
- **modernc.org/sqlite**: Pure Go SQLite driver — no C compiler required at build time on any platform.
- **Startup time**: ~50ms. The Tauri window opens before the user notices the sidecar is even starting.
- **Memory**: ~15MB RSS at idle. Stays open 24/7 without impacting battery.
