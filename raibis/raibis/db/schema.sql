-- Raibis LifeOS — SQLite Schema
-- All tables use INTEGER PRIMARY KEY (rowid alias) for performance

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─────────────────────────────────────────
-- Goals — top-level intentions / objectives
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    status      TEXT    NOT NULL DEFAULT 'active',  -- active | completed | archived
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Projects — belong to a goal
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id     INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    title       TEXT    NOT NULL,
    description TEXT,
    status      TEXT    NOT NULL DEFAULT 'active',  -- active | completed | archived | on_hold
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
    status      TEXT    NOT NULL DEFAULT 'planned',  -- planned | active | completed
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Tasks — core work items
--   parent_task_id = NULL → top-level task
--   parent_task_id = N    → subtask of task N
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id       INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
    parent_task_id  INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT,
    status          TEXT    NOT NULL DEFAULT 'todo',    -- todo | in_progress | blocked | done
    priority        TEXT    NOT NULL DEFAULT 'medium',  -- low | medium | high | urgent
    due_date        DATE,
    estimated_mins  INTEGER,
    logged_mins     INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Notes — freeform text linked to tasks/projects
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT,
    body        TEXT,
    task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Resources — URLs / files linked to tasks/projects
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    url             TEXT,
    file_path       TEXT,
    resource_type   TEXT    NOT NULL DEFAULT 'note',  -- note | idea | link | file | doc | video | reference
    body            TEXT,                              -- inline text/markdown content
    goal_id         INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    task_id         INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Pomodoro sessions — logged against a task
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    duration_mins INTEGER NOT NULL DEFAULT 25,
    completed   INTEGER NOT NULL DEFAULT 1,  -- 1=completed, 0=interrupted
    started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- Tags — reusable labels for any entity
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT 'blue'  -- blue | green | red | yellow | purple | cyan
);

-- Many-to-many: tag ↔ any entity via entity_type + entity_id
CREATE TABLE IF NOT EXISTS entity_tags (
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type TEXT    NOT NULL,  -- task | project | goal | note | resource
    entity_id   INTEGER NOT NULL,
    PRIMARY KEY (tag_id, entity_type, entity_id)
);

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_project   ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint    ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent    ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_notes_task      ON notes(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_project   ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_resources_task  ON resources(task_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags     ON entity_tags(entity_type, entity_id);
