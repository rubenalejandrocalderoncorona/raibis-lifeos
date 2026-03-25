"""
raibis.db.database
──────────────────
SQLite connection and CRUD helpers for all entities.
Uses the standard library sqlite3 — no ORM, no magic.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

_SCHEMA = Path(__file__).parent / "schema.sql"


def _get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db(db_path: str) -> sqlite3.Connection:
    """Create tables if they don't exist. Returns an open connection."""
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = _get_conn(db_path)
    conn.executescript(_SCHEMA.read_text())
    conn.commit()
    return conn


@contextmanager
def get_db(db_path: str):
    conn = _get_conn(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─────────────────────────────────────────
# Generic helpers
# ─────────────────────────────────────────

def fetchall(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    return conn.execute(sql, params).fetchall()


def fetchone(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> sqlite3.Row | None:
    return conn.execute(sql, params).fetchone()


def execute(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    """Returns lastrowid."""
    cur = conn.execute(sql, params)
    return cur.lastrowid


# ─────────────────────────────────────────
# Goals
# ─────────────────────────────────────────

def create_goal(conn, title: str, description: str = "") -> int:
    return execute(conn, "INSERT INTO goals (title, description) VALUES (?, ?)", (title, description))


def get_goals(conn, status: str = "active") -> list:
    return fetchall(conn, "SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC", (status,))


def get_goal(conn, goal_id: int):
    return fetchone(conn, "SELECT * FROM goals WHERE id = ?", (goal_id,))


def update_goal(conn, goal_id: int, **fields) -> None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    execute(conn, f"UPDATE goals SET {sets} WHERE id = ?", (*fields.values(), goal_id))


# ─────────────────────────────────────────
# Projects
# ─────────────────────────────────────────

def create_project(conn, title: str, goal_id: int | None = None, description: str = "") -> int:
    return execute(conn,
        "INSERT INTO projects (title, goal_id, description) VALUES (?, ?, ?)",
        (title, goal_id, description))


def get_projects(conn, status: str = "active") -> list:
    return fetchall(conn,
        "SELECT p.*, g.title as goal_title FROM projects p "
        "LEFT JOIN goals g ON p.goal_id = g.id "
        "WHERE p.status = ? ORDER BY p.created_at DESC", (status,))


def get_project(conn, project_id: int):
    return fetchone(conn, "SELECT * FROM projects WHERE id = ?", (project_id,))


def update_project(conn, project_id: int, **fields) -> None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    execute(conn, f"UPDATE projects SET {sets} WHERE id = ?", (*fields.values(), project_id))


# ─────────────────────────────────────────
# Sprints
# ─────────────────────────────────────────

def create_sprint(conn, project_id: int, title: str, start_date: str = None, end_date: str = None) -> int:
    return execute(conn,
        "INSERT INTO sprints (project_id, title, start_date, end_date) VALUES (?, ?, ?, ?)",
        (project_id, title, start_date, end_date))


def get_sprints(conn, project_id: int) -> list:
    return fetchall(conn, "SELECT * FROM sprints WHERE project_id = ? ORDER BY created_at DESC", (project_id,))


def get_active_sprint(conn, project_id: int):
    return fetchone(conn, "SELECT * FROM sprints WHERE project_id = ? AND status = 'active'", (project_id,))


def update_sprint(conn, sprint_id: int, **fields) -> None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    execute(conn, f"UPDATE sprints SET {sets} WHERE id = ?", (*fields.values(), sprint_id))


# ─────────────────────────────────────────
# Tasks
# ─────────────────────────────────────────

def create_task(conn, title: str, project_id: int = None, sprint_id: int = None,
                parent_task_id: int = None, priority: str = "medium",
                due_date: str = None, description: str = "") -> int:
    return execute(conn,
        "INSERT INTO tasks (title, project_id, sprint_id, parent_task_id, priority, due_date, description) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (title, project_id, sprint_id, parent_task_id, priority, due_date, description))


def get_tasks(conn, project_id: int = None, sprint_id: int = None,
              status: str = None, parent_task_id: int | None = -1) -> list:
    """
    parent_task_id=-1 (default) = top-level tasks only
    parent_task_id=None         = all tasks (including subtasks)
    parent_task_id=N            = subtasks of task N
    """
    clauses, params = [], []
    if project_id is not None:
        clauses.append("project_id = ?"); params.append(project_id)
    if sprint_id is not None:
        clauses.append("sprint_id = ?"); params.append(sprint_id)
    if status is not None:
        clauses.append("status = ?"); params.append(status)
    if parent_task_id == -1:
        clauses.append("parent_task_id IS NULL")
    elif parent_task_id is not None:
        clauses.append("parent_task_id = ?"); params.append(parent_task_id)

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return fetchall(conn, f"SELECT * FROM tasks {where} ORDER BY priority DESC, due_date ASC", tuple(params))


def get_task(conn, task_id: int):
    return fetchone(conn, "SELECT * FROM tasks WHERE id = ?", (task_id,))


def update_task(conn, task_id: int, **fields) -> None:
    fields["updated_at"] = "datetime('now')"
    # separate literal expressions from values
    sets = ", ".join(
        f"{k} = {v}" if k == "updated_at" else f"{k} = ?"
        for k, v in fields.items()
    )
    values = tuple(v for k, v in fields.items() if k != "updated_at")
    execute(conn, f"UPDATE tasks SET {sets} WHERE id = ?", (*values, task_id))


def get_kanban(conn, project_id: int) -> dict[str, list]:
    """Returns tasks grouped by status for the kanban board."""
    tasks = get_tasks(conn, project_id=project_id, parent_task_id=None)
    board: dict[str, list] = {"todo": [], "in_progress": [], "blocked": [], "done": []}
    for t in tasks:
        board.setdefault(t["status"], []).append(t)
    return board


# ─────────────────────────────────────────
# Progress calculation
# ─────────────────────────────────────────

def project_progress(conn, project_id: int) -> tuple[int, int, int]:
    """Returns (done, total, pct) for all top-level tasks in a project."""
    tasks = get_tasks(conn, project_id=project_id, parent_task_id=None)
    total = len(tasks)
    done = sum(1 for t in tasks if t["status"] == "done")
    pct = int(done / total * 100) if total else 0
    return done, total, pct


def goal_progress(conn, goal_id: int) -> tuple[int, int, int]:
    """Returns (done, total, pct) across all tasks in all projects under this goal."""
    projects = fetchall(conn, "SELECT id FROM projects WHERE goal_id = ?", (goal_id,))
    total, done = 0, 0
    for p in projects:
        d, t, _ = project_progress(conn, p["id"])
        done += d
        total += t
    pct = int(done / total * 100) if total else 0
    return done, total, pct


def progress_bar(pct: int, width: int = 20) -> str:
    """Return a text progress bar string, e.g. '████████░░░░ 40%'"""
    filled = int(width * pct / 100)
    bar = "█" * filled + "░" * (width - filled)
    return f"{bar} {pct}%"


# ─────────────────────────────────────────
# Notes
# ─────────────────────────────────────────

def create_note(conn, body: str, title: str = "", task_id: int = None, project_id: int = None) -> int:
    return execute(conn,
        "INSERT INTO notes (title, body, task_id, project_id) VALUES (?, ?, ?, ?)",
        (title, body, task_id, project_id))


def get_notes(conn, task_id: int = None, project_id: int = None) -> list:
    if task_id:
        return fetchall(conn, "SELECT * FROM notes WHERE task_id = ? ORDER BY updated_at DESC", (task_id,))
    if project_id:
        return fetchall(conn, "SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC", (project_id,))
    return fetchall(conn, "SELECT * FROM notes ORDER BY updated_at DESC")


# ─────────────────────────────────────────
# Resources
# ─────────────────────────────────────────

def create_resource(conn, title: str, url: str = None, file_path: str = None,
                    resource_type: str = "note", body: str = None,
                    goal_id: int = None, task_id: int = None, project_id: int = None) -> int:
    return execute(conn,
        "INSERT INTO resources (title, url, file_path, resource_type, body, goal_id, task_id, project_id) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (title, url, file_path, resource_type, body, goal_id, task_id, project_id))


def get_resources(conn, goal_id: int = None, task_id: int = None, project_id: int = None) -> list:
    if task_id:
        return fetchall(conn, "SELECT * FROM resources WHERE task_id = ? ORDER BY updated_at DESC", (task_id,))
    if project_id:
        return fetchall(conn, "SELECT * FROM resources WHERE project_id = ? ORDER BY updated_at DESC", (project_id,))
    if goal_id:
        return fetchall(conn, "SELECT * FROM resources WHERE goal_id = ? ORDER BY updated_at DESC", (goal_id,))
    return fetchall(conn, "SELECT * FROM resources ORDER BY updated_at DESC")


# ─────────────────────────────────────────
# Pomodoro
# ─────────────────────────────────────────

def log_pomodoro(conn, task_id: int, duration_mins: int = 25, completed: bool = True) -> int:
    rowid = execute(conn,
        "INSERT INTO pomodoro_sessions (task_id, duration_mins, completed) VALUES (?, ?, ?)",
        (task_id, duration_mins, int(completed)))
    # update logged_mins on task
    execute(conn,
        "UPDATE tasks SET logged_mins = logged_mins + ?, updated_at = datetime('now') WHERE id = ?",
        (duration_mins if completed else 0, task_id))
    return rowid


# ─────────────────────────────────────────
# Tags
# ─────────────────────────────────────────

def get_or_create_tag(conn, name: str, color: str = "blue") -> int:
    """Return tag id, creating it if it doesn't exist."""
    name = name.strip().lower()
    row = fetchone(conn, "SELECT id FROM tags WHERE name = ?", (name,))
    if row:
        return row["id"]
    return execute(conn, "INSERT INTO tags (name, color) VALUES (?, ?)", (name, color))


def get_all_tags(conn) -> list:
    return fetchall(conn, "SELECT * FROM tags ORDER BY name")


def add_tags(conn, entity_type: str, entity_id: int, tag_names: list[str]) -> None:
    """Attach tags (by name) to any entity. Creates tags that don't exist yet."""
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        tag_id = get_or_create_tag(conn, name)
        # INSERT OR IGNORE handles duplicates gracefully
        conn.execute(
            "INSERT OR IGNORE INTO entity_tags (tag_id, entity_type, entity_id) VALUES (?, ?, ?)",
            (tag_id, entity_type, entity_id),
        )


def remove_tag(conn, entity_type: str, entity_id: int, tag_id: int) -> None:
    execute(conn,
        "DELETE FROM entity_tags WHERE tag_id=? AND entity_type=? AND entity_id=?",
        (tag_id, entity_type, entity_id))


def get_tags(conn, entity_type: str, entity_id: int) -> list:
    """Return list of tag rows for a given entity."""
    return fetchall(conn,
        "SELECT t.id, t.name, t.color FROM tags t "
        "JOIN entity_tags et ON et.tag_id = t.id "
        "WHERE et.entity_type = ? AND et.entity_id = ? "
        "ORDER BY t.name",
        (entity_type, entity_id))


def get_tag_string(conn, entity_type: str, entity_id: int) -> str:
    """Return comma-separated tag names for display."""
    tags = get_tags(conn, entity_type, entity_id)
    return ", ".join(t["name"] for t in tags)
