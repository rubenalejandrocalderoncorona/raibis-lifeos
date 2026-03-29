# LifeOS — Remaining Architecture Increments

> **Status:** Increments 1 & 2 are complete.
> This document is the authoritative brief for AI coding agents continuing this work.
> Each increment is self-contained. Read the **Context** section before starting any increment.

---

## Project Overview

**Stack:**
- Go binary (`cmd/lifeos`) — SQLite metadata store + Markdown vault (Obsidian-compatible) + HTTP REST API
- The server listens on a **Unix Domain Socket** (UDS) by default; optional `--port` flag for TCP (web GUI)
- SwiftUI macOS app — embeds the Go binary as a sidecar subprocess
- Bubble Tea TUI — full-screen terminal interface
- Web GUI — HTML/CSS/JS at `raibis/gui/public/`, served by the Go server

**Key paths:**
```
raibis-lifeos/
├── raibis-go/                 Go module (github.com/raibis/raibis-go)
│   ├── cmd/lifeos/            Unified binary entry point
│   │   ├── main.go            Subcommand dispatch (server | tui)
│   │   ├── server.go          HTTP handlers, UDS listener, graceful shutdown
│   │   └── tui.go             Bubble Tea launcher
│   ├── internal/
│   │   ├── cmdutil/paths.go   DefaultDBPath / DefaultSocketPath / DefaultVaultPath
│   │   ├── domain/            Go structs (Task, Goal, Project, Note, Sprint…)
│   │   ├── service/           Business logic layer
│   │   ├── storage/           SQLite via modernc.org/sqlite, WAL mode
│   │   └── vault/             Atomic file I/O for Markdown notes
│   └── go.mod
├── raibis/gui/public/         Web GUI (app.js, style.css, index.html)
└── LifeOS-macOS/              Xcode project (SwiftUI) — created in Increment 2
    ├── LifeOS/
    │   ├── LifeOSApp.swift
    │   ├── SidecarManager.swift
    │   └── ContentView.swift
    └── lifeos                 ARM64 Go binary embedded in bundle
```

**Database:** `~/.local/share/raibis/lifeos.db` (SQLite, WAL mode)
**Vault:** `~/LifeOS_Vault/` (Markdown files, Obsidian-compatible)
**UDS socket:** `$TMPDIR/lifeos.sock` (from SwiftUI app) or `~/.local/share/raibis/lifeos.sock` (from CLI)

---

## Increment 3 — Sandbox & Vault Bookmarks (Swift)

### Objective
Allow the user to select their Obsidian vault folder via a macOS file picker, persist a **Security-Scoped Bookmark**, and pass the resolved path to the Go sidecar at startup. After this increment the SwiftUI app can write `.md` files inside a sandboxed vault folder without macOS throwing a permissions error.

### Context
- `SidecarManager.swift` already exists and launches `lifeos server --socket <path> --db <path> --vault <path>`
- The `--vault` flag is the only thing that needs the bookmark path
- Go `vault.New(root)` accepts any absolute path — no Go changes needed

### Tasks

**1. Add entitlements to `LifeOS.entitlements`:**
```xml
<key>com.apple.security.files.user-selected.read-write</key><true/>
<key>com.apple.security.files.bookmarks.app-scope</key><true/>
```

**2. Create `VaultBookmarkManager.swift`:**
- `func requestVaultAccess()` — presents `NSOpenPanel` (canChooseDirectories: true, canChooseFiles: false)
- On user selection: call `url.startAccessingSecurityScopedResource()`, create a security-scoped bookmark with `url.bookmarkData(options: .withSecurityScope)`, persist to `UserDefaults` key `"vaultBookmark"`
- `func resolvedVaultURL() -> URL?` — loads bookmark from `UserDefaults`, calls `URL(resolvingBookmarkData:options:.withSecurityScope:...)`, calls `startAccessingSecurityScopedResource()`
- `func stopAccess(url: URL)` — calls `url.stopAccessingSecurityScopedResource()`
- On app launch: call `resolvedVaultURL()` first; if nil, show the picker

**3. Update `SidecarManager.start(vaultPath: String)`** — accept the resolved vault path as a parameter instead of hardcoding `~/LifeOS_Vault`

**4. Update `LifeOSApp.swift`:**
- Instantiate `VaultBookmarkManager` as `@StateObject`
- In `.onAppear`: resolve bookmark → if found start sidecar with that path; else show a sheet with a "Choose Vault" button
- Add a settings sheet/window with a "Change Vault Folder" button

**5. Write a test `.md` file through the Go API:**
```bash
curl --unix-socket "$TMPDIR/lifeos.sock" \
  -X POST http://localhost/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Sandbox Test","body":"# Hello from LifeOS\n\nThis file was written by the Go sidecar."}'
```
Verify the file appears in the chosen vault folder.

### Acceptance Criteria
- [ ] First launch shows vault picker if no bookmark saved
- [ ] Subsequent launches resolve bookmark silently (no picker)
- [ ] Go sidecar receives the correct vault path via `--vault`
- [ ] A note created via API creates a `.md` file inside the chosen folder
- [ ] No macOS sandbox permission error in Console.app

---

## Increment 4 — Swift API Client & Native Task List (SwiftUI)

### Objective
Write a Swift `APIClient` that communicates with the Go sidecar **over the Unix socket** using `URLSession`, and render a live, native SwiftUI task list.

### Context
- The Go API is fully REST/JSON: `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`
- Task JSON shape (from `domain/task.go`):
```json
{
  "id": 1,
  "title": "My task",
  "status": "todo",
  "priority": "medium",
  "goal_id": null,
  "project_id": 2,
  "due_date": "2026-04-01",
  "tags": [{"id": 1, "name": "work", "color": "blue"}],
  "sub_task_count": 3
}
```
- `SidecarManager.socketPath` exposes the UDS path

### Tasks

**1. `UnixSocketURLSessionDelegate.swift`** — custom `URLProtocol` (or `URLSessionStreamTask`) that routes HTTP over a Unix socket:
```swift
// Use URLSession with a custom URLProtocol subclass OR
// use Network.framework NWConnection with .unix(path:) endpoint.
// Network.framework is the recommended modern approach.
```

**2. `APIClient.swift`:**
- Property: `socketPath: String` (from `SidecarManager.socketPath`)
- `func fetchTasks() async throws -> [Task]` — `GET /api/tasks`
- `func createTask(title: String, projectID: Int64?) async throws -> Task` — `POST /api/tasks`
- `func updateTaskStatus(id: Int64, status: String) async throws` — `PATCH /api/tasks/:id`
- `func deleteTask(id: Int64) async throws` — `DELETE /api/tasks/:id`
- All methods use `Network.framework` `NWConnection` with `.unix(path: socketPath)` to send raw HTTP/1.1 requests and parse responses

> **Implementation note:** `URLSession` does not natively support Unix sockets on macOS. Use `Network.framework`:
> ```swift
> let endpoint = NWEndpoint.unix(path: socketPath)
> let connection = NWConnection(to: endpoint, using: .tcp)
> ```
> Send a raw HTTP/1.1 request string and parse the response body as JSON.

**3. `TasksViewModel.swift`** (`@MainActor ObservableObject`):
- `@Published var tasks: [Task] = []`
- `@Published var isLoading = false`
- `func load() async` — calls `APIClient.fetchTasks()`
- `func toggleDone(_ task: Task) async` — PATCH status between "todo" ↔ "done"
- `func delete(_ task: Task) async` — DELETE + remove from array

**4. `TasksView.swift`** (SwiftUI):
- `List` of tasks with checkmark toggle, title, priority badge, due date
- Swipe-to-delete
- Toolbar "+" button → sheet with title field → calls `createTask`
- `.task { await viewModel.load() }` on appear
- Empty state: "No tasks yet — add one with +"

**5. Update `ContentView.swift`** to show `TasksView` (not just the status dot)

### Acceptance Criteria
- [ ] Tasks created via TUI appear in the SwiftUI list within 1 second of `.task` refresh
- [ ] Checking a task in SwiftUI updates its status in the DB (verified via `curl` or TUI)
- [ ] Swipe-to-delete removes from both UI and DB
- [ ] App works offline (no internet required — all local)

---

## Increment 5 — Dashboard & Deep-Dive Views (SwiftUI)

### Objective
Build the native equivalent of the web dashboard: stats bar, Goals list, Projects list with progress rings, and a Goal detail deep-dive.

### Tasks

**1. `DashboardViewModel.swift`** — fetches `GET /api/dashboard`:
```json
{
  "goals_count": 3, "projects_count": 2, "in_progress": 4, "overdue": 1,
  "today_tasks": [...], "urgent_tasks": [...],
  "active_projects": [{"project": {...}, "progress": {"done": 3, "total": 10, "pct": 30}}],
  "active_sprint": {"id": 1, "title": "Sprint 1", "pct": 60}
}
```

**2. `StatsBarView.swift`** — horizontal row of 4 stat tiles (Goals, Projects, In Progress, Overdue)

**3. `ProjectRowView.swift`** — title, goal name, circular progress ring (`Circle` + trim), active task pills

**4. `GoalDetailView.swift`** — fetched from `GET /api/goals/:id`:
- Breadcrumb header
- Metric progress bar (start_value → current_value → target)
- List of linked projects with progress
- List of direct tasks (goal_id set, no project)
- List of notes (body hydrated from vault)

**5. `NoteDetailView.swift`** — renders note body as Markdown using `AttributedString(markdown:)`

**6. Navigation:** `NavigationSplitView` with sidebar (Dashboard / Tasks / Goals / Projects) and detail pane

### Acceptance Criteria
- [ ] Dashboard stats match values from `curl http://localhost/api/dashboard`
- [ ] Tapping a goal opens `GoalDetailView` with correct linked projects and tasks
- [ ] Note body renders as formatted Markdown (bold, lists, headers)

---

## Increment 6 — Markdown Editor & Vault Sync (SwiftUI)

### Objective
Replace the read-only note view with a live Markdown editor that writes directly to the vault file through the Go API, keeping Obsidian in sync.

### Tasks

**1. `NoteEditorView.swift`:**
- `TextEditor` bound to note body string
- Auto-save on 1-second debounce: `PATCH /api/notes/:id` with `{"body": "..."}`
- Toolbar: title field, tag picker, done button
- "Open in Obsidian" button: `NSWorkspace.shared.open(URL(string: "obsidian://open?path=\(encodedPath)")!)`

**2. `FileWatcher.swift`** — optional: use `DispatchSource.makeFileSystemObjectSource` to watch the vault directory for external changes (Obsidian edits), trigger a re-fetch of the note body

**3. Quick-capture global shortcut:** `NSEvent.addGlobalMonitorForEvents` for a hotkey (e.g. ⌘⇧Space) → opens a floating `NSPanel` with a single text field → `POST /api/quick-capture {"input": "..."}` → dismisses

### Acceptance Criteria
- [ ] Editing a note in SwiftUI creates/updates the `.md` file in the vault (verify with `cat ~/LifeOS_Vault/notes/*.md`)
- [ ] Editing the same `.md` in Obsidian, then switching back to the app, shows the updated content
- [ ] Quick-capture hotkey works system-wide (app in background)

---

## Increment 7 — Distribution & Hardened Runtime

### Objective
Prepare the app for notarization and distribution outside the App Store.

### Tasks

1. **Hardened Runtime** — enable in Signing & Capabilities; add `com.apple.security.cs.allow-unsigned-executable-memory` if needed by modernc SQLite
2. **Code-sign the embedded Go binary** — the `lifeos` binary must be signed with the same Developer ID as the app:
   ```bash
   codesign --force --sign "Developer ID Application: <name>" \
     --options runtime \
     --entitlements LifeOS/LifeOS.entitlements \
     LifeOS-macOS/lifeos
   ```
3. **Notarize** with `notarytool`
4. **Auto-update** — integrate `Sparkle` framework for over-the-air updates of the `.app`; Go binary is updated inside the bundle

---

## API Reference (for agent context)

All endpoints respond with `application/json`. Base URL over UDS: `http://localhost` (socket path injected at connection level).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Stats, today/urgent tasks, active projects, active sprint |
| GET/POST | `/api/tasks` | List (filter: `?project_id=`, `?status=`, `?all=1`) / Create |
| GET/PATCH/DELETE | `/api/tasks/:id` | Task detail (includes subtasks, notes, resources, breadcrumbs) |
| GET/POST | `/api/goals` | List active goals with progress / Create |
| GET/PATCH/DELETE | `/api/goals/:id` | Goal detail (projects, tasks, notes, resources) |
| GET/POST | `/api/projects` | List active projects with progress / Create |
| GET/PATCH/DELETE | `/api/projects/:id` | Project detail (tasks, notes, resources) |
| GET/POST | `/api/notes` | List (filter: `?goal_id=`, `?task_id=`, `?project_id=`) / Create |
| GET/PATCH/DELETE | `/api/notes/:id` | Note detail (body hydrated from vault file) |
| GET/POST | `/api/resources` | List / Create |
| GET/POST | `/api/sprints` | List / Create |
| GET/POST | `/api/tags` | List / Create |
| GET/POST | `/api/categories` | List / Create |
| POST | `/api/quick-capture` | `{"input": "Title #high @ProjectName !2026-04-01"}` |
| GET | `/api/export/:entity/:id` | Full JSON bundle (goal/project/task/note with hydrated bodies) |
| PUT | `/api/:type/:id/tags` | `{"tag_ids": [1, 2]}` — replace tag set |
