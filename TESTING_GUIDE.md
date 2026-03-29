# LifeOS — Testing Guide

This guide walks you through testing all three interfaces: the **Web GUI**, the **Terminal (TUI)**, and the **macOS native app**. No programming knowledge required.

---

## What You Need Before Starting

- A Mac running macOS 13 or later
- [Homebrew](https://brew.sh) installed (the Mac package manager)
- [Go](https://go.dev/dl/) installed (version 1.22+)
- Terminal.app (already on your Mac — find it in Applications → Utilities)

### Check that Go is installed

Open Terminal and type:
```
go version
```
You should see something like `go version go1.22.0 darwin/arm64`. If you get "command not found", [install Go first](https://go.dev/dl/).

---

## Step 1 — Build the LifeOS Binary

This turns the source code into an app you can run.

1. Open **Terminal**
2. Navigate to the project folder:
   ```
   cd ~/Documents/PersonalRepos/ClaudeCodeProjects/raibis-lifeos/raibis-go
   ```
3. Build the binary:
   ```
   go build -o lifeos ./cmd/lifeos/
   ```
4. Confirm it worked:
   ```
   ./lifeos
   ```
   You should see:
   ```
   Usage: lifeos <server|tui> [flags]
     server    Start the HTTP API server
     tui       Launch the terminal UI
   ```

---

## Interface 1 — Web GUI

The web GUI is a browser-based dashboard for managing your tasks, goals, and projects.

### Start the server

In Terminal (from the `raibis-go` folder):
```
./lifeos server --port 3344
```

You should see a log line like:
```
lifeos server on unix:/Users/<you>/.local/share/raibis/lifeos.sock  (db: ...)
also serving TCP :3344
```

Leave this Terminal window open. The server runs in the foreground.

### Open the web app

1. Open **Safari** or **Chrome**
2. Go to: `http://localhost:3344`
3. You should see the LifeOS dashboard

### Things to try

**Create a task:**
1. Click the **Tasks** section
2. Click **+ New Task** (or the add button)
3. Enter a title like "Test my first task"
4. Press Enter or click Save
5. Your task should appear in the list

**Create a goal:**
1. Click the **Goals** section
2. Click **+ New Goal**
3. Enter a title like "Learn something new"
4. Click Save
5. The goal appears in the list

**Create a note:**
1. Click **Notes**
2. Click **+ New Note**
3. Enter a title and some body text
4. Click Save
5. The note is saved — it also creates a `.md` file in your vault folder (`~/LifeOS_Vault/notes/`)

**Verify the vault file was created:**
In a new Terminal window:
```
ls ~/LifeOS_Vault/notes/
```
You should see a `.md` file named after your note.

### Stop the server

Press `Control + C` in the Terminal window running the server.

---

## Interface 2 — Terminal UI (TUI)

The TUI is a full-screen terminal interface — like a text-based app inside your Terminal window.

### Prerequisites

The server does **not** need to be running for the TUI. The TUI connects directly to the database.

### Launch the TUI

In Terminal (from the `raibis-go` folder):
```
./lifeos tui
```

The screen will transform into a full-screen interface.

### Navigating the TUI

| Key | Action |
|-----|--------|
| `↑` / `↓` arrow keys | Move up/down through the list |
| `Tab` | Switch between sections (Tasks, Goals, Projects, Notes) |
| `n` | Create a new item |
| `Enter` | Open/select the highlighted item |
| `d` or `Delete` | Delete the highlighted item |
| `q` | Quit the TUI |

### Things to try

1. Press `Tab` to switch to the **Tasks** view
2. Press `n` to create a new task
3. Type a title and press `Enter`
4. Your task appears in the list
5. Use arrow keys to highlight it
6. Press `Enter` to open it and see details
7. Press `q` to quit back to the main Terminal prompt

---

## Interface 3 — macOS Native App

> **Note:** The macOS app (Increment 2) is an Xcode project. You need Xcode installed from the Mac App Store to build and run it.

### Prerequisites

1. Install **Xcode** from the Mac App Store (free, ~7 GB)
2. Build the ARM64 Go binary that the app will embed:
   ```
   cd ~/Documents/PersonalRepos/ClaudeCodeProjects/raibis-lifeos/raibis-go
   GOARCH=arm64 GOOS=darwin go build -o lifeos ./cmd/lifeos/
   cp lifeos ../LifeOS-macOS/lifeos
   ```

### Open and run the Xcode project

1. Open **Finder**
2. Navigate to: `~/Documents/PersonalRepos/ClaudeCodeProjects/raibis-lifeos/LifeOS-macOS/`
3. Double-click `LifeOS-macOS.xcodeproj` — Xcode opens
4. In the top toolbar, make sure the target is set to **"My Mac"** (not a simulator)
5. Press the **Play button** (▶) or press `Command + R`
6. The app builds and launches

### What you should see

- A small icon appears in your macOS **menu bar** (top-right area of your screen)
- Click the icon — a small window shows a status dot
- The dot turns **green** when the Go server has started successfully (this takes 1–2 seconds)

### Verify the server started

In Terminal:
```
curl --unix-socket "$TMPDIR/lifeos.sock" http://localhost/api/tasks
```
You should see a JSON response like `[]` (empty array) or a list of your existing tasks.

### Quit the app

- Click the menu bar icon
- Choose **Quit LifeOS**

This sends a shutdown signal to the Go server and removes the socket file cleanly.

---

## Interface Compatibility Check

All three interfaces share the **same database** (`~/.local/share/raibis/lifeos.db`). Changes made in one interface appear in all others.

### Cross-interface test

1. **Start the server** (Web GUI mode):
   ```
   ./lifeos server --port 3344
   ```

2. **Open the Web GUI** at `http://localhost:3344` and create a task called "Cross-interface test"

3. **In a new Terminal window**, launch the TUI:
   ```
   ./lifeos tui
   ```
   You should see "Cross-interface test" in the task list immediately.

4. **Stop the TUI** (`q`) and **query the API** directly:
   ```
   curl --unix-socket ~/.local/share/raibis/lifeos.sock \
     http://localhost/api/tasks
   ```
   Your task should appear in the JSON output.

---

## Troubleshooting

### "go: command not found"
Go is not installed. Download and install it from https://go.dev/dl/ then restart Terminal.

### "permission denied" when running `./lifeos`
Make the binary executable:
```
chmod +x ./lifeos
```

### Web page won't load at `http://localhost:3344`
- Make sure the server is still running in the other Terminal window
- Make sure you typed `--port 3344` when starting the server
- Try refreshing the page

### TUI looks garbled or has display issues
- Make sure your Terminal window is at least 80 characters wide
- Try resizing the Terminal window and pressing `q` then restarting the TUI

### "address already in use" error when starting the server
A previous server process may still be running. Find and stop it:
```
lsof -i :3344
```
If you see a process listed, note its PID (number in the second column) and run:
```
kill <PID>
```
Then try starting the server again.

### Socket file error
If you see a "bind: address already in use" error for the socket:
```
rm ~/.local/share/raibis/lifeos.sock
```
Then try starting the server again.

---

## File Locations

| Item | Location |
|------|----------|
| Database | `~/.local/share/raibis/lifeos.db` |
| Unix socket | `~/.local/share/raibis/lifeos.sock` |
| Vault (Markdown notes) | `~/LifeOS_Vault/notes/` |
| Go binary | `raibis-go/lifeos` (after building) |
