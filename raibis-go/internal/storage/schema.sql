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

-- ─────────────────────────────────────────
-- Comments — threaded notes on any entity
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT    NOT NULL,
    entity_id   INTEGER NOT NULL,
    author      TEXT    NOT NULL DEFAULT 'me',
    body        TEXT    NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

-- ─────────────────────────────────────────
-- Pages — universal content unit (Notion-style)
-- type: "page" | "database"
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
    id          TEXT    PRIMARY KEY,
    type        TEXT    NOT NULL DEFAULT 'page',
    title       TEXT    NOT NULL DEFAULT '',
    icon        TEXT,
    cover       TEXT,
    body        TEXT,
    database_id TEXT    REFERENCES pages(id) ON DELETE SET NULL,
    parent_id   TEXT    REFERENCES pages(id) ON DELETE SET NULL,
    archived    INTEGER NOT NULL DEFAULT 0,
    position    REAL    NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pages_database ON pages(database_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent   ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_type     ON pages(type);

-- ─────────────────────────────────────────
-- Page properties — typed key-value store per page
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_properties (
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    key     TEXT NOT NULL,
    value   TEXT,
    PRIMARY KEY (page_id, key)
);

-- ─────────────────────────────────────────
-- Schema columns — typed columns for database pages
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_columns (
    database_id TEXT    NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    key         TEXT    NOT NULL,
    label       TEXT    NOT NULL DEFAULT '',
    data_type   TEXT    NOT NULL DEFAULT 'text',
    options     TEXT    NOT NULL DEFAULT '[]',
    required    INTEGER NOT NULL DEFAULT 0,
    position    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (database_id, key)
);
CREATE INDEX IF NOT EXISTS idx_schema_db ON schema_columns(database_id);

-- ─────────────────────────────────────────
-- Page relations — directed edges between pages
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_relations (
    from_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    to_page_id   TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    key          TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (from_page_id, to_page_id, key)
);
CREATE INDEX IF NOT EXISTS idx_relations_from ON page_relations(from_page_id);
CREATE INDEX IF NOT EXISTS idx_relations_to   ON page_relations(to_page_id);

-- ─────────────────────────────────────────
-- Obsidian vaults — configured vault paths for sync
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obsidian_vaults (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL DEFAULT '',
    path      TEXT    NOT NULL,
    active    INTEGER NOT NULL DEFAULT 1,
    last_sync DATETIME
);

-- ─────────────────────────────────────────
-- Settings — global key-value app settings
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- page_id column on comments (for page-based comments)
-- Added as ALTER TABLE here so existing DBs get it via applyMigrations
-- The column is NOT NULL-safe via COALESCE in queries

-- ─────────────────────────────────────────
-- prop_schema — typed column definitions per entity type
-- Replaces localStorage customPropDefs_* — now durable in SQLite
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prop_schema (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    entity     TEXT    NOT NULL,
    key        TEXT    NOT NULL,
    label      TEXT    NOT NULL,
    type       TEXT    NOT NULL DEFAULT 'text',
    options    TEXT    NOT NULL DEFAULT '[]',
    position   INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(entity, key)
);
CREATE INDEX IF NOT EXISTS idx_prop_schema_entity ON prop_schema(entity);

-- ─────────────────────────────────────────
-- prop_values — per-record typed property values
-- Replaces localStorage customPropVals_*_* — now durable in SQLite
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prop_values (
    entity    TEXT    NOT NULL,
    record_id INTEGER NOT NULL,
    key       TEXT    NOT NULL,
    value     TEXT    NOT NULL DEFAULT '',
    PRIMARY KEY (entity, record_id, key)
);
CREATE INDEX IF NOT EXISTS idx_prop_values_record ON prop_values(entity, record_id);

-- ─────────────────────────────────────────
-- prop_relations — typed relation definitions between entity types
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prop_relations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity TEXT NOT NULL,
    from_key    TEXT NOT NULL,
    to_entity   TEXT NOT NULL,
    to_key      TEXT,
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(from_entity, from_key)
);

-- ─────────────────────────────────────────
-- prop_relation_links — actual many-to-many relation records
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prop_relation_links (
    from_entity TEXT    NOT NULL,
    from_id     INTEGER NOT NULL,
    from_key    TEXT    NOT NULL,
    to_entity   TEXT    NOT NULL,
    to_id       INTEGER NOT NULL,
    PRIMARY KEY (from_entity, from_id, from_key, to_entity, to_id)
);
CREATE INDEX IF NOT EXISTS idx_prl_from ON prop_relation_links(from_entity, from_id, from_key);
CREATE INDEX IF NOT EXISTS idx_prl_to   ON prop_relation_links(to_entity, to_id);
