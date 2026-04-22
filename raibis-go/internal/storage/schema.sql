-- Raibis LifeOS — SQLite Schema
-- All tables use INTEGER PRIMARY KEY (rowid alias) for performance
-- Schema version: 3

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─────────────────────────────────────────
-- Categories — unified taxonomy entity
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    color TEXT    NOT NULL DEFAULT 'blue'
);

-- ─────────────────────────────────────────
-- Tags — reusable labels for any entity
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT 'blue'
);

-- Many-to-many: tag ↔ any entity via polymorphic join
CREATE TABLE IF NOT EXISTS entity_tags (
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type TEXT    NOT NULL,  -- task | project | goal | note | resource
    entity_id   INTEGER NOT NULL,
    PRIMARY KEY (tag_id, entity_type, entity_id)
);

-- ─────────────────────────────────────────
-- Goals — top-level intentions / objectives
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    description   TEXT,
    status        TEXT    NOT NULL DEFAULT 'active',
    type          TEXT,
    year          TEXT,
    start_date    DATE,
    due_date      DATE,
    start_value   REAL,
    current_value REAL,
    target        REAL,
    category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Projects — optionally belong to a goal
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id     INTEGER REFERENCES goals(id) ON DELETE SET NULL,  -- nullable
    title       TEXT    NOT NULL,
    description TEXT,
    status      TEXT    NOT NULL DEFAULT 'active',
    macro_area  TEXT,
    kanban_col  TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Sprints — time-boxed iterations inside a project
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sprints (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    goal        TEXT,
    start_date  DATE,
    end_date    DATE,
    status      TEXT    NOT NULL DEFAULT 'planned',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Tasks — core work items
--
--   Hierarchy (all nullable — tasks can exist standalone):
--     goal_id        → directly linked to a goal (orphan task on goal)
--     project_id     → belongs to a project
--     parent_task_id → subtask of another task
--
--   A task with goal_id=NULL, project_id=NULL, parent_task_id=NULL
--   is a valid standalone free-floating task.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id             INTEGER REFERENCES goals(id)    ON DELETE SET NULL,
    project_id          INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id           INTEGER REFERENCES sprints(id)  ON DELETE SET NULL,
    parent_task_id      INTEGER REFERENCES tasks(id)    ON DELETE CASCADE,
    title               TEXT    NOT NULL,
    description         TEXT,
    status              TEXT    NOT NULL DEFAULT 'todo',
    priority            TEXT    NOT NULL DEFAULT 'medium',
    due_date            DATE,
    estimated_mins      INTEGER,
    logged_mins         INTEGER NOT NULL DEFAULT 0,
    category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    focus_block         DATE,
    recur_interval      INTEGER,
    recur_unit          TEXT,
    story_points        INTEGER,
    pomodoros_planned   INTEGER,
    pomodoros_finished  INTEGER,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Notes — freeform text
--   Linked to at most one parent entity (app-enforced).
--   goal_id | project_id | task_id → which one is populated determines parent.
--   All three NULL = standalone note.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT,
    body        TEXT,
    goal_id     INTEGER REFERENCES goals(id)    ON DELETE SET NULL,
    project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    task_id     INTEGER REFERENCES tasks(id)    ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    archived    INTEGER NOT NULL DEFAULT 0,
    note_date   DATE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Resources — URLs / files
--   Same polymorphic-by-nullable-FK pattern as notes.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    url           TEXT,
    file_path     TEXT,
    resource_type TEXT    NOT NULL DEFAULT 'link',
    body          TEXT,
    goal_id       INTEGER REFERENCES goals(id)    ON DELETE SET NULL,
    project_id    INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    task_id       INTEGER REFERENCES tasks(id)    ON DELETE SET NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Pomodoro sessions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id       INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    duration_mins INTEGER NOT NULL DEFAULT 25,
    completed     INTEGER NOT NULL DEFAULT 1,
    started_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Indexes (only columns present in initial schema)
-- goal_id / file_path indexes are added by applyMigrations after those columns exist
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_project   ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint    ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent    ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_notes_task      ON notes(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_project   ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_resources_task  ON resources(task_id);
CREATE INDEX IF NOT EXISTS idx_resources_proj  ON resources(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags     ON entity_tags(entity_type, entity_id);
-- category/taxonomy indexes added by applyMigrations after FK columns exist

-- ─────────────────────────────────────────
-- Habits — trackable behaviours
--
--   type        : e.g. "learning", "fitness", "meditation"
--   reference_id: external ID linking to another service (e.g. StudyTrack
--                 objective ID for type="learning"). Validated on creation.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    type         TEXT    NOT NULL DEFAULT 'general',
    reference_id TEXT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
