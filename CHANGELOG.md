# Changelog

## dev — current version: v1.0.4

| Version | Branch | Date | Notes |
|---|---|---|---|
| v1.0.4 | dev | 2026-04-06 | Native macOS Tauri app, focus_block_start, emoji expansion |

---

## v1.0.4 — 2026-04-06

### Added
- Native macOS app via Tauri v2 (WKWebView shell + Go sidecar)
- System tray icon with Open / Quick HUD / Quit menu
- Global hotkey ⌘⇧Space → floating HUD window (always-on-top, no decorations)
- Hide-on-close: closing the main window keeps the server alive in the tray
- `focus_block_start` field — tasks now store a date range (start → end) for the Focus chip
- Expanded emoji picker: 500+ emojis across 10 groups (up from 79 in 3 groups)
- Styled "+ Add Subtask" inline button in dashboard and detail views
- `.chip-empty` CSS state for the Focus chip when no date is set
- `raibis-go/Makefile` with `build-sidecar`, `build-sidecar-intel`, and `dev` targets
- `raibis-tauri/PACKAGING.md` — guide for building, packaging, and distributing the app

---

## main — current version: v1.0.2-alpha.5

| Version | Branch | Date | Notes |
|---|---|---|---|
| v1.0.2-alpha.5 | v.0.0.1.beta | 2026-04-01 | Merged to main |

---

## v1.0.2-alpha.5 — 2026-04-01
Merged from `v.0.0.1.beta` (commit `66b3a31`).

### Added
- **Custom properties system** — polymorphic `entity_properties` table; SET/DELETE/LIST API endpoints (`/api/properties`); properties widget in task slideover, project detail, and goal detail views
- **Sprint detail view** — clicking a sprint opens a detail with task tree, progress bar, Start/Complete buttons, and +Task action
- **Calendar multi-day spanning bars** — ranged events (tasks, goals, projects, sprints) render as continuous horizontal bars spanning across day cells using CSS grid-column; each entity type has its own color; lane assignment prevents bar overlap

### Fixed
- Table view toggle arrow: removed inline style overrides; arrow hidden for leaf tasks, visible on hover, correctly toggles subtask rows
- Project/goal detail toggle arrows: `sub_task_count` now computed client-side (detail API omits it); toggle reveals inline "Add subtask" row
- Goal detail properties widget binding (missing `bindPropertiesWidget` call)
- Goals, projects, and sprints with start+end dates now emit ranged events on the calendar

---

## v1.0.2-alpha.4 — (previous)
Commit `3efc8aa` — fix notes scan error, toggle redesign, object relations.

## v1.0.2-alpha.3
Commit `fce28cf` — bug fixes: patchTask re-render, sprint persist, toggle redesign, sidebar sync.

## v1.0.2-alpha.2
Commit `48b0718` — relations fix, calendar expand, col picker, subtask buttons, breadcrumb.

## v1.0.1-alpha.2
Commit `8c3cedc` — fix dates, relations, backdrop close, AI panel, daily notes, table toggles.
