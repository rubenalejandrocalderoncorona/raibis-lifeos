# Raibis LifeOS → Obsidian Mapping

This document describes how every entity in raibis-lifeos is represented as
an Obsidian Markdown file.  The goal is a fully navigable, Dataview-queryable
knowledge graph inside Obsidian that stays in sync with the live database.

---

## Vault folder layout

```
<obsidian_vault>/
  Goals/
    <slug>-<id>.md          ← one file per Goal
  Projects/
    <slug>-<id>.md          ← one file per Project
  Sprints/
    <slug>-<id>.md          ← one file per Sprint
  Tasks/
    <slug>-<id>.md          ← one file per Task (incl. subtasks)
  Notes/
    <slug>-<id>.md          ← one file per Note
  Resources/
    <slug>-<id>.md          ← one file per Resource (link/document)
```

Every file starts with a YAML frontmatter block and is followed by an
optional Markdown body.  Cross-entity links use Obsidian `[[wikilink]]`
notation so the Obsidian Graph View renders the full hierarchy.

---

## Hierarchy

```
Goal  (Goals/)
 └── Project  (Projects/)
       └── Sprint  (Sprints/)
             └── Task  (Tasks/)
                   └── Subtask  (Tasks/, parent_task_id set)
```

Notes and Resources can be attached to any level (Goal, Project, Task).

---

## Entity → File mapping

### Goal

```yaml
---
raibis_id: 7
raibis_type: goal
title: Learn Spanish
status: active          # active | completed | archived | on_hold
type: 12 Months         # 12 Weeks | 12 Months | 3 Years | 5 Years | ""
year: 2026
start_date: 2026-01-01
due_date: 2026-12-31
target: 100
current_value: 23
tags: [language, personal-growth]
---

Description of the goal (optional freeform Markdown body).
```

**Fields:**

| Frontmatter key | Source field | Notes |
|---|---|---|
| `raibis_id` | `goals.id` | Integer PK — use for Dataview JOINs |
| `raibis_type` | literal `"goal"` | Identifies the entity type |
| `title` | `goals.title` | |
| `status` | `goals.status` | `active \| completed \| archived \| on_hold` |
| `type` | `goals.type` | Time-horizon bucket |
| `year` | `goals.year` | `2025 \| 2026 \| 2027 \| Multiyear` |
| `start_date` | `goals.start_date` | ISO 8601 |
| `due_date` | `goals.due_date` | ISO 8601 |
| `target` | `goals.target` | Numeric target value |
| `current_value` | `goals.current_value` | Current progress value |
| `tags` | `entity_tags` join | YAML list |

---

### Project

```yaml
---
raibis_id: 12
raibis_type: project
title: Spanish Vocabulary App
status: active
goal_id: 7              # foreign key → Goals/<slug>-7.md
macro_area: Output      # Soul | Output | Growth | Body
kanban_col: Sprint      # Backlog | Maintenance | Sprint
tags: [spanish, coding]
---

**Goal:** [[learn-spanish-7]]

Project description.
```

**Body links:**
- `[[goal-<goal_id>]]` — wikilink to parent Goal (matches `[[<slug>-<id>]]` pattern)

**Fields:**

| Frontmatter key | Source field |
|---|---|
| `raibis_id` | `projects.id` |
| `raibis_type` | `"project"` |
| `title` | `projects.title` |
| `status` | `projects.status` |
| `goal_id` | `projects.goal_id` (nullable) |
| `macro_area` | `projects.macro_area` |
| `kanban_col` | `projects.kanban_col` |
| `tags` | `entity_tags` join |

---

### Sprint

```yaml
---
raibis_id: 4
raibis_type: sprint
title: Week 1 — Core Vocab
status: active
project_id: 12
start_date: 2026-05-12
end_date: 2026-05-18
sprint_goal: Learn 200 core words
---

**Project:** [[spanish-vocabulary-app-12]]

**Sprint Goal:** Learn 200 core words
```

**Fields:**

| Frontmatter key | Source field |
|---|---|
| `raibis_id` | `sprints.id` |
| `raibis_type` | `"sprint"` |
| `title` | `sprints.title` |
| `status` | `sprints.status` |
| `project_id` | `sprints.project_id` |
| `start_date` | `sprints.start_date` |
| `end_date` | `sprints.end_date` |
| `sprint_goal` | `sprints.goal` |

---

### Task

```yaml
---
raibis_id: 55
raibis_type: task
title: Build flashcard deck
status: in_progress     # todo | in_progress | blocked | done
priority: high          # low | medium | high | urgent
project_id: 12
sprint_id: 4
due_date: 2026-05-15
focus_block: 2026-05-15
story_points: 3
estimated_mins: 90
logged_mins: 45
tags: [coding, spanish]
---

- [ ] Build flashcard deck

**Project:** [[spanish-vocabulary-app-12]]
**Sprint:** [[week-1-core-vocab-4]]

Task description / notes go here.
```

**Notes on the body:**

- The first line is a Markdown task checkbox (`- [x]` when done, `- [ ]` otherwise).
  This is compatible with the **Obsidian Tasks** community plugin — you can
  query all uncompleted tasks across the vault with:
  ```dataview
  TASK WHERE !completed
  ```
- Wikilinks for Project, Goal, Sprint, and Parent Task are emitted only when set.

**Fields:**

| Frontmatter key | Source field |
|---|---|
| `raibis_id` | `tasks.id` |
| `raibis_type` | `"task"` |
| `title` | `tasks.title` |
| `status` | `tasks.status` |
| `priority` | `tasks.priority` |
| `project_id` | `tasks.project_id` |
| `goal_id` | `tasks.goal_id` |
| `sprint_id` | `tasks.sprint_id` |
| `parent_task_id` | `tasks.parent_task_id` |
| `due_date` | `tasks.due_date` |
| `focus_block` | `tasks.focus_block` |
| `story_points` | `tasks.story_points` (>0 only) |
| `estimated_mins` | `tasks.estimated_mins` (>0 only) |
| `logged_mins` | `tasks.logged_mins` (>0 only) |
| `recur_interval` + `recur_unit` | `tasks.recur_interval/recur_unit` (>0 only) |
| `tags` | `entity_tags` join |

---

### Note

```yaml
---
raibis_id: 88
raibis_type: note
title: Vocab cheat-sheet
note_date: 2026-05-14
project_id: 12
tags: [reference]
---

**Project:** [[spanish-vocabulary-app-12]]

## Words

| Spanish | English |
|---|---|
| hablar | to speak |
| escuchar | to listen |
```

**Fields:**

| Frontmatter key | Source field |
|---|---|
| `raibis_id` | `notes.id` |
| `raibis_type` | `"note"` |
| `title` | `notes.title` |
| `note_date` | `notes.note_date` |
| `goal_id` | `notes.goal_id` (nullable) |
| `project_id` | `notes.project_id` (nullable) |
| `task_id` | `notes.task_id` (nullable) |
| `tags` | `entity_tags` join |

---

## Sync behaviour

### Direction

Currently **store → disk only** (raibis is the source of truth).

Disk edits in Obsidian will **not** overwrite the database automatically.
This is intentional: the risk of data loss from accidental edits is high.
A future bidirectional sync feature can be enabled per-vault.

### Triggers

| Event | Action |
|---|---|
| Server startup with `--obsidian-vault <path>` | Full export of all entities |
| `POST /api/obsidian/sync` | Manual full re-export |
| Create/update Task via API | Re-export that Task file |
| Create/update Goal via API | Re-export that Goal file |
| Create/update Project via API | Re-export that Project file |
| Create/update Sprint via API | Re-export that Sprint file |
| Create/update Note via API | Re-export that Note file |
| Delete Task/Goal/Project/Sprint/Note | Delete the corresponding `.md` file |

All sync operations are non-blocking (run in a background goroutine).

---

## Configuration

### Server flag

```bash
./lifeos server --port 3344 --obsidian-vault /path/to/your/ObsidianVault
```

### Persistent config (saved to `~/.raibis/obsidian.json`)

Via API:
```bash
# Save vault path
curl -X PUT http://localhost:3344/api/obsidian/config \
  -H 'Content-Type: application/json' \
  -d '{"vault_path": "/Users/you/ObsidianVault"}'

# Check current config
curl http://localhost:3344/api/obsidian/config

# Trigger manual full sync
curl -X POST http://localhost:3344/api/obsidian/sync
```

Via UI: **Settings → Obsidian Sync** tab.

---

## Dataview queries

Once synced, you can query your data inside Obsidian using the
[Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin.

### All active tasks due this week

```dataview
TABLE title, priority, due_date, sprint_id
FROM "Tasks"
WHERE raibis_type = "task"
  AND status != "done"
  AND due_date <= date(today) + dur(7 days)
SORT due_date ASC
```

### Tasks by project

```dataview
TABLE title, status, story_points
FROM "Tasks"
WHERE raibis_type = "task" AND project_id = 12
SORT status ASC
```

### Sprint progress (checklist)

```dataview
TASK FROM "Tasks"
WHERE sprint_id = 4
```

### All active goals with progress

```dataview
TABLE title, type, year, current_value, target
FROM "Goals"
WHERE raibis_type = "goal" AND status = "active"
SORT year ASC
```

### Notes linked to a project

```dataview
LIST
FROM "Notes"
WHERE raibis_type = "note" AND project_id = 12
```

### High-priority tasks not yet started

```dataview
TABLE title, project_id, due_date
FROM "Tasks"
WHERE raibis_type = "task"
  AND status = "todo"
  AND (priority = "high" OR priority = "urgent")
SORT due_date ASC
```

---

## Graph view

The Obsidian Graph View will show links between entities because every
cross-reference in the file body is a `[[wikilink]]`.  For example:

- A Task with `project_id: 12` will have `**Project:** [[spanish-vocabulary-app-12]]`
  in its body, creating a visible edge in the graph.
- A Sprint will link to its parent Project.
- A Project will link to its parent Goal.

This gives you a full visual hierarchy: Goal → Project → Sprint → Task chain.

---

## File naming

Files are named `<slug>-<id>.md` where:
- `<slug>` = lowercase title, non-alphanumeric chars replaced by `-`, max 40 chars
- `<id>` = integer primary key from the database

Examples:
- `Goals/learn-spanish-7.md`
- `Projects/spanish-vocabulary-app-12.md`
- `Tasks/build-flashcard-deck-55.md`

The `<id>` suffix ensures uniqueness even when titles collide.

---

## Extending the mapping

To map additional entities (Habits, Resources, Comments) or add custom
frontmatter fields, edit:

```
raibis-go/internal/obsidian/sync.go
```

The renderer functions (`renderGoal`, `renderTask`, etc.) build a
`map[string]string` of frontmatter keys, which is serialised to YAML by
`renderFrontmatter`.  Adding a field is as simple as:

```go
f["my_custom_field"] = someValue
```

The key will appear in the frontmatter and is immediately queryable via
Dataview.
