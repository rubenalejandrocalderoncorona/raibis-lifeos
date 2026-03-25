'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const PORT = 3344;
const DB_PATH = path.join(__dirname, '..', 'data', 'raibis.db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DB helpers ────────────────────────────────────────────────────
// sql.js works in-memory. We load from file, run queries, save back.
// For read-only endpoints we just load; for writes we load+modify+save.

let SQL = null;

async function getSql() {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

function loadDb() {
  const fileBuffer = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  const SQL_local = SQL; // already initialised at boot
  if (fileBuffer) return new SQL_local.Database(fileBuffer);
  return new SQL_local.Database();
}

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function withDb(write, fn) {
  const db = loadDb();
  try {
    const result = fn(db);
    if (write) saveDb(db);
    return result;
  } finally {
    db.close();
  }
}

// Helpers
function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function one(db, sql, params = []) {
  const rows = all(db, sql, params);
  return rows[0] || null;
}

function run(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  const id = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
  stmt.free();
  return id;
}

function tags(db, entityType, entityId) {
  return all(db,
    'SELECT t.name, t.color FROM tags t ' +
    'JOIN entity_tags et ON et.tag_id = t.id ' +
    'WHERE et.entity_type = ? AND et.entity_id = ? ORDER BY t.name',
    [entityType, entityId]
  ).map(r => r.name);
}

// ── Boot: initialise sql.js before accepting requests ────────────
let ready = false;
getSql().then(() => {
  ready = true;
  console.log('sql.js ready');
  app.listen(PORT, () => console.log(`raibis GUI running at http://localhost:${PORT}`));
});

app.use((req, res, next) => {
  if (!ready) return res.status(503).json({ error: 'starting up' });
  next();
});

// ── Goals ─────────────────────────────────────────────────────────
app.get('/api/goals', (req, res) => {
  const result = withDb(false, db => {
    const goals = all(db, "SELECT * FROM goals WHERE status='active' ORDER BY created_at DESC");
    return goals.map(g => {
      const projects = all(db, "SELECT id FROM projects WHERE goal_id=?", [g.id]);
      let done = 0, total = 0;
      for (const p of projects) {
        const tasks = all(db, "SELECT status FROM tasks WHERE project_id=? AND parent_task_id IS NULL", [p.id]);
        total += tasks.length;
        done += tasks.filter(t => t.status === 'done').length;
      }
      return { ...g, tags: tags(db, 'goal', g.id), progress: { done, total, pct: total ? Math.round(done/total*100) : 0 } };
    });
  });
  res.json(result);
});

app.post('/api/goals', (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = withDb(true, db => run(db, "INSERT INTO goals (title, description) VALUES (?,?)", [title, description||'']));
  res.json({ id });
});

app.patch('/api/goals/:id', (req, res) => {
  withDb(true, db => {
    const { title, description, status } = req.body;
    if (title !== undefined) run(db, "UPDATE goals SET title=? WHERE id=?", [title, req.params.id]);
    if (description !== undefined) run(db, "UPDATE goals SET description=? WHERE id=?", [description, req.params.id]);
    if (status !== undefined) run(db, "UPDATE goals SET status=? WHERE id=?", [status, req.params.id]);
  });
  res.json({ ok: true });
});

app.delete('/api/goals/:id', (req, res) => {
  withDb(true, db => run(db, "UPDATE goals SET status='archived' WHERE id=?", [req.params.id]));
  res.json({ ok: true });
});

// ── Projects ──────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  const result = withDb(false, db => {
    const filter = req.query.goal_id ? "WHERE p.status='active' AND p.goal_id=?" : "WHERE p.status='active'";
    const params = req.query.goal_id ? [req.query.goal_id] : [];
    const projects = all(db,
      `SELECT p.*, g.title as goal_title FROM projects p LEFT JOIN goals g ON p.goal_id=g.id ${filter} ORDER BY p.created_at DESC`,
      params
    );
    return projects.map(p => {
      const tasks = all(db, "SELECT status FROM tasks WHERE project_id=? AND parent_task_id IS NULL", [p.id]);
      const done = tasks.filter(t => t.status === 'done').length;
      const total = tasks.length;
      const active = all(db, "SELECT title FROM tasks WHERE project_id=? AND status='in_progress' LIMIT 3", [p.id]).map(t => t.title);
      return { ...p, tags: tags(db, 'project', p.id), progress: { done, total, pct: total ? Math.round(done/total*100) : 0 }, active_tasks: active };
    });
  });
  res.json(result);
});

app.post('/api/projects', (req, res) => {
  const { title, goal_id, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = withDb(true, db => run(db, "INSERT INTO projects (title, goal_id, description) VALUES (?,?,?)", [title, goal_id||null, description||'']));
  res.json({ id });
});

app.patch('/api/projects/:id', (req, res) => {
  withDb(true, db => {
    const { title, status } = req.body;
    if (title !== undefined) run(db, "UPDATE projects SET title=? WHERE id=?", [title, req.params.id]);
    if (status !== undefined) run(db, "UPDATE projects SET status=? WHERE id=?", [status, req.params.id]);
  });
  res.json({ ok: true });
});

// ── Tasks ─────────────────────────────────────────────────────────
app.get('/api/tasks', (req, res) => {
  const result = withDb(false, db => {
    let sql = "SELECT * FROM tasks WHERE parent_task_id IS NULL";
    const params = [];
    if (req.query.project_id) { sql += " AND project_id=?"; params.push(req.query.project_id); }
    if (req.query.sprint_id) { sql += " AND sprint_id=?"; params.push(req.query.sprint_id); }
    if (req.query.status) { sql += " AND status=?"; params.push(req.query.status); }
    sql += " ORDER BY priority DESC, due_date ASC";
    return all(db, sql, params).map(t => ({ ...t, tags: tags(db, 'task', t.id) }));
  });
  res.json(result);
});

app.post('/api/tasks', (req, res) => {
  const { title, project_id, sprint_id, priority, due_date, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = withDb(true, db => run(db,
    "INSERT INTO tasks (title, project_id, sprint_id, priority, due_date, description) VALUES (?,?,?,?,?,?)",
    [title, project_id||null, sprint_id||null, priority||'medium', due_date||null, description||'']
  ));
  res.json({ id });
});

app.patch('/api/tasks/:id', (req, res) => {
  withDb(true, db => {
    const allowed = ['title','status','priority','due_date','description','sprint_id'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        run(db, `UPDATE tasks SET ${key}=?, updated_at=datetime('now') WHERE id=?`, [req.body[key], req.params.id]);
      }
    }
  });
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  withDb(true, db => run(db, "DELETE FROM tasks WHERE id=?", [req.params.id]));
  res.json({ ok: true });
});

// ── Kanban ────────────────────────────────────────────────────────
app.get('/api/kanban', (req, res) => {
  const result = withDb(false, db => {
    const project_id = req.query.project_id;
    const tasks = project_id
      ? all(db, "SELECT * FROM tasks WHERE project_id=? ORDER BY priority DESC", [project_id])
      : all(db, "SELECT t.*, p.title as project_title FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE t.parent_task_id IS NULL ORDER BY t.priority DESC");
    const board = { todo: [], in_progress: [], blocked: [], done: [] };
    for (const t of tasks) {
      const col = board[t.status] || board.todo;
      col.push({ ...t, tags: tags(db, 'task', t.id) });
    }
    return board;
  });
  res.json(result);
});

// ── Sprints ───────────────────────────────────────────────────────
app.get('/api/sprints', (req, res) => {
  const result = withDb(false, db => {
    const sprints = req.query.project_id
      ? all(db, "SELECT s.*, p.title as project_title FROM sprints s JOIN projects p ON s.project_id=p.id WHERE s.project_id=? ORDER BY s.created_at DESC", [req.query.project_id])
      : all(db, "SELECT s.*, p.title as project_title FROM sprints s JOIN projects p ON s.project_id=p.id ORDER BY s.created_at DESC");
    return sprints.map(s => {
      const tasks = all(db, "SELECT status FROM tasks WHERE sprint_id=?", [s.id]);
      const done = tasks.filter(t => t.status === 'done').length;
      return { ...s, progress: { done, total: tasks.length, pct: tasks.length ? Math.round(done/tasks.length*100) : 0 } };
    });
  });
  res.json(result);
});

app.post('/api/sprints', (req, res) => {
  const { project_id, title, start_date, end_date } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'title and project_id required' });
  const id = withDb(true, db => run(db,
    "INSERT INTO sprints (project_id, title, start_date, end_date) VALUES (?,?,?,?)",
    [project_id, title, start_date||null, end_date||null]
  ));
  res.json({ id });
});

app.patch('/api/sprints/:id', (req, res) => {
  const { status } = req.body;
  if (status) withDb(true, db => run(db, "UPDATE sprints SET status=? WHERE id=?", [status, req.params.id]));
  res.json({ ok: true });
});

// ── Resources ─────────────────────────────────────────────────────
app.get('/api/resources', (req, res) => {
  const result = withDb(false, db => {
    let sql = "SELECT r.*, g.title as goal_title, p.title as project_title, t.title as task_title FROM resources r LEFT JOIN goals g ON r.goal_id=g.id LEFT JOIN projects p ON r.project_id=p.id LEFT JOIN tasks t ON r.task_id=t.id WHERE 1=1";
    const params = [];
    if (req.query.resource_type) { sql += " AND r.resource_type=?"; params.push(req.query.resource_type); }
    if (req.query.goal_id) { sql += " AND r.goal_id=?"; params.push(req.query.goal_id); }
    if (req.query.project_id) { sql += " AND r.project_id=?"; params.push(req.query.project_id); }
    if (req.query.task_id) { sql += " AND r.task_id=?"; params.push(req.query.task_id); }
    sql += " ORDER BY r.updated_at DESC";
    return all(db, sql, params).map(r => ({ ...r, tags: tags(db, 'resource', r.id) }));
  });
  res.json(result);
});

app.post('/api/resources', (req, res) => {
  const { title, url, file_path, resource_type, body, goal_id, task_id, project_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = withDb(true, db => run(db,
    "INSERT INTO resources (title, url, file_path, resource_type, body, goal_id, task_id, project_id) VALUES (?,?,?,?,?,?,?,?)",
    [title, url||null, file_path||null, resource_type||'note', body||null, goal_id||null, task_id||null, project_id||null]
  ));
  res.json({ id });
});

app.delete('/api/resources/:id', (req, res) => {
  withDb(true, db => run(db, "DELETE FROM resources WHERE id=?", [req.params.id]));
  res.json({ ok: true });
});

// ── Tags ──────────────────────────────────────────────────────────
app.post('/api/tags', (req, res) => {
  const { entity_type, entity_id, name } = req.body;
  withDb(true, db => {
    let tag = one(db, "SELECT id FROM tags WHERE name=?", [name.trim().toLowerCase()]);
    if (!tag) tag = { id: run(db, "INSERT INTO tags (name) VALUES (?)", [name.trim().toLowerCase()]) };
    run(db, "INSERT OR IGNORE INTO entity_tags (tag_id, entity_type, entity_id) VALUES (?,?,?)", [tag.id, entity_type, entity_id]);
  });
  res.json({ ok: true });
});

// ── Dashboard ─────────────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  const result = withDb(false, db => {
    const today = new Date().toISOString().split('T')[0];
    const overdue = one(db, "SELECT COUNT(*) as n FROM tasks WHERE due_date < ? AND status != 'done'", [today])?.n || 0;
    const in_progress = one(db, "SELECT COUNT(*) as n FROM tasks WHERE status='in_progress'")?.n || 0;
    const today_tasks = all(db, "SELECT t.*, p.title as project_title FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE t.due_date=? AND t.status!='done' ORDER BY t.priority DESC LIMIT 10", [today]);
    const active_sprint = one(db, "SELECT s.*, p.title as project_title FROM sprints s JOIN projects p ON s.project_id=p.id WHERE s.status='active' ORDER BY s.start_date DESC LIMIT 1");
    const recent_tasks = all(db, "SELECT t.*, p.title as project_title FROM tasks t LEFT JOIN projects p ON t.project_id=p.id WHERE t.status IN ('todo','in_progress') ORDER BY t.updated_at DESC LIMIT 8");
    const goals_count = one(db, "SELECT COUNT(*) as n FROM goals WHERE status='active'")?.n || 0;
    const projects_count = one(db, "SELECT COUNT(*) as n FROM projects WHERE status='active'")?.n || 0;
    return { overdue, in_progress, today_tasks, active_sprint, recent_tasks, goals_count, projects_count };
  });
  res.json(result);
});

// ── Pomodoro ──────────────────────────────────────────────────────
app.post('/api/pomodoro', (req, res) => {
  const { task_id, duration_mins, completed } = req.body;
  withDb(true, db => {
    run(db, "INSERT INTO pomodoro_sessions (task_id, duration_mins, completed) VALUES (?,?,?)", [task_id, duration_mins||25, completed?1:0]);
    if (completed) run(db, "UPDATE tasks SET logged_mins=logged_mins+?, updated_at=datetime('now') WHERE id=?", [duration_mins||25, task_id]);
  });
  res.json({ ok: true });
});

app.get('/api/pomodoro/sessions', (req, res) => {
  const result = withDb(false, db =>
    all(db, "SELECT ps.*, t.title as task_title FROM pomodoro_sessions ps LEFT JOIN tasks t ON ps.task_id=t.id ORDER BY ps.started_at DESC LIMIT 20")
  );
  res.json(result);
});
