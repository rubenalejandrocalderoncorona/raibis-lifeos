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

---

## Increment 8 — iOS App & External Calendar/Task Sync (Roadmap)

> **Status:** Not started. Decisions below came out of a scoping discussion
> with the user on 2026-08-01, before any code was written. This section
> is the brief for whichever increment picks this up next — read it fully
> before starting, since several of the architectural choices here
> (why WKWebView-first, why Obsidian writes never move off the Go server)
> are load-bearing and shouldn't be silently revisited mid-implementation.

### Context: why the Go server stays the single source of truth

The Obsidian vault-write logic (`internal/vault/`, the `*FM` frontmatter
builders in `cmd/lifeos/server.go`) is centralized in the Go server and
has been hardened over many rounds of bug fixes (tags/category never
syncing, frontmatter corruption on property writes, custom-entity parity
gaps — see git log on this file's era). **No new client — iOS or
otherwise — should reimplement vault writes.** Every sync path (mobile
app, Google Calendar, Apple Reminders, etc.) must go through the existing
REST API so a single, tested code path owns "what does this look like in
Obsidian."

This has a direct consequence for the vault itself: the machine running
`lifeos server --vault <path>` needs filesystem access to it. A
self-hosted Obsidian setup means that server process — reachable from
wherever the user's other clients live (phone, other computers) over the
network (LAN, Tailscale, or a reverse proxy with auth) — not a separate
per-device vault writer.

### Part A — iOS App

**Decision: ship a WKWebView wrapper first, not a native rewrite.**

| | Native SwiftUI | WKWebView wrapper (chosen first step) |
|---|---|---|
| Time to first usable build | Weeks (new codebase reproducing the web UI) | Days (reuses `raibis/gui/public/` as-is) |
| Feel | True native | Feels like the web app in a shell |
| Apple Reminders (EventKit) | Works directly | **Still needs a small native bridge regardless** — EventKit is only reachable from native Apple code, never from a web view or the headless Go server |
| Obsidian vault writes | Routed through the Go server's API either way | Same |
| Maintenance | Second codebase to keep in sync with the web app forever | One codebase; iOS gets every desktop feature for free |

Rationale: EventKit's native-only constraint means *some* Swift code is
unavoidable no matter which path is chosen for the main UI — so there's
no version of this where "go native" avoids writing Swift entirely. Given
that, start with the cheap option (wrapper) to get mobile access fast,
and revisit a full native rewrite only once real usage data shows it's
worth the multi-week investment (which parts of mobile use matter, how
often the phone is really the primary device vs. a quick-glance client).

**Tasks (not yet started):**
1. New Xcode target (separate from the existing `LifeOS-macOS` SwiftUI
   sidecar-embedding app — iOS cannot embed/spawn the Go binary as a
   subprocess the way macOS does; the sandbox doesn't allow it). This
   target is a thin WKWebView shell pointed at the user's self-hosted
   server URL (configurable in-app, not hardcoded).
2. Handle auth/reachability: does the self-hosted server sit behind a
   VPN (Tailscale), a reverse proxy with its own auth, or plain LAN-only?
   This decides whether the iOS app needs its own login screen or just a
   server-URL field. **Needs a decision from the user before this task
   starts.**
3. Small native EventKit bridge (separate small module, not the whole
   app) — see Part B, Apple Reminders, for what it needs to do.

### Part B — External Sync (Google Calendar → Google Tasks → Apple Reminders → Outlook later)

**Decisions already made:**
- Two-way sync (changes in raibis and the external service both propagate).
- Priority order: Google Calendar, then Google Tasks, then Apple
  Reminders. Outlook explicitly deprioritized — revisit after the above
  three are working.
- Every synced change must also land in Obsidian — i.e., the sync engine
  writes through the *same* create/update paths (`/api/tasks`,
  `/api/properties` for schedule-type props, etc.) that already trigger
  vault writes, rather than a separate side-channel that could drift out
  of sync with what's on disk.

**Not yet decided — needed before implementation starts:**
- **Conflict rule.** Starting proposal: last-write-wins by timestamp.
  Simple, no merge UI needed, but silently drops one side's edit on a
  genuine simultaneous conflict (rare in practice for a single-user tool).
  Revisit if that turns out to matter.
- **Identity mapping.** Need a new table (e.g. `external_sync_links`:
  `raibis_entity_type, raibis_entity_id, provider, external_id,
  last_synced_at`) so a sync pass can tell "this task already has a
  Google Calendar event" instead of creating duplicates every run.
- **Sync trigger.** Polling (simple, works through NAT/behind a
  firewall, works for a self-hosted box with no public HTTPS endpoint)
  vs. provider push/webhooks (instant, but Google's push notifications
  require a publicly reachable HTTPS callback — likely not available for
  a self-hosted setup unless the user already exposes one). **Default to
  polling** unless the user has a public endpoint already.

**Blocker before any Google work starts:** the user needs to create a
Google Cloud project, enable the Calendar API (and later Tasks API), and
generate an OAuth client ID/secret. This is tied to their Google account
— it cannot be done on their behalf. Offer to write up the exact
click-by-click steps when this increment is picked up.

**Proposed implementation shape (Google Calendar, first target):**
1. New Go package `internal/sync/googlecal/` — OAuth token exchange +
   refresh, calendar event CRUD against Google's API.
2. New `external_sync_links` table + migration.
3. A sync-loop goroutine (polling interval configurable, default
   something like 5 minutes) that: fetches raibis-side changes since
   last sync (tasks/schedule-props with `updated_at` newer than
   `last_synced_at`), pushes them to Google; fetches Google-side changes
   via their `updated`/sync-token mechanism, applies them through
   raibis's own API handlers (so vault writes happen automatically).
4. New `/api/integrations/google-calendar/*` endpoints: OAuth
   start/callback, connection status, manual "sync now", disconnect.
5. Settings UI in `raibis/gui/public/app.js` (a new panel, likely under
   the existing "Connected apps" area referenced in the sidebar) to
   connect/disconnect and see last-sync status.
6. Google Tasks reuses steps 1-5's shape against a different Google API
   surface once Calendar is working end-to-end.
7. Apple Reminders depends on Part A's native EventKit bridge existing
   first — the bridge reads/writes Reminders locally on-device and talks
   to the same `/api/integrations/*` pattern as the other two, just from
   Swift instead of a Go goroutine.
