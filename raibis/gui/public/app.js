'use strict';

// ── State ─────────────────────────────────────────────────────────
let currentView = 'dashboard';
let pomodoroState = { running: false, mode: 'work', secsLeft: 25*60, taskId: null, taskTitle: null, interval: null };

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupTheme();
  setupModal();
  loadView('dashboard');
});

// ── Navigation ────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const v = a.dataset.view;
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      closeSidebar();
      loadView(v);
    });
  });

  const mobBtn = document.getElementById('mob-menu-btn');
  if (mobBtn) mobBtn.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// ── Theme ─────────────────────────────────────────────────────────
function setupTheme() {
  const saved = localStorage.getItem('raibis-theme') || 'dark';
  setTheme(saved);
  ['theme-btn', 'mob-theme-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  });
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('raibis-theme', t);
  const icon = t === 'dark' ? '☀' : '☾';
  document.querySelectorAll('.theme-btn').forEach(b => b.innerHTML = icon);
}

// ── Modal ─────────────────────────────────────────────────────────
function setupModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
}

function openModal(title, bodyHtml, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-backdrop').classList.add('open');
  const modal = document.getElementById('modal');
  modal.classList.add('open');
  // focus first input
  setTimeout(() => { const f = modal.querySelector('input,select,textarea'); if (f) f.focus(); }, 60);
  if (onSubmit) {
    const form = modal.querySelector('form');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); onSubmit(form); });
    const saveBtn = modal.querySelector('.modal-save');
    if (saveBtn) saveBtn.addEventListener('click', () => { if (form) onSubmit(form); else onSubmit(); });
  }
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-backdrop').classList.remove('open');
}

// ── API ───────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
const GET  = path => api('GET', path);
const POST = (path, b) => api('POST', path, b);
const PATCH = (path, b) => api('PATCH', path, b);
const DEL  = path => api('DELETE', path);

// ── View loader ───────────────────────────────────────────────────
function loadView(view) {
  currentView = view;
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="loading">Loading…</div>`;
  ({
    dashboard: renderDashboard,
    goals:     renderGoals,
    projects:  renderProjects,
    kanban:    renderKanban,
    sprint:    renderSprint,
    resources: renderResources,
    pomodoro:  renderPomodoro,
  }[view] || renderDashboard)();
}

// ── Helpers ───────────────────────────────────────────────────────
function x(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function statusBadge(s) {
  const map = { todo:'badge-todo', in_progress:'badge-progress', blocked:'badge-badge-blocked', done:'badge-done', blocked:'badge-blocked' };
  const label = s.replace('_',' ');
  return `<span class="badge ${map[s]||'badge-todo'}">${x(label)}</span>`;
}

function priBadge(p) {
  const map = { low:'badge-low', medium:'badge-medium', high:'badge-high', urgent:'badge-urgent' };
  return `<span class="badge ${map[p]||'badge-medium'}">${x(p)}</span>`;
}

function progressBar(done, total) {
  const pct = total ? Math.round(done/total*100) : 0;
  return `<div class="progress-wrap">
    <div class="progress-label"><span>${done}/${total} tasks</span><span>${pct}%</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  </div>`;
}

function tagsHtml(tags) {
  if (!tags || !tags.length) return '';
  return `<div class="tags">${tags.map(t => `<span class="tag">${x(t)}</span>`).join('')}</div>`;
}

function fmtDate(d) { return d ? d.slice(0,10) : '—'; }

// ── Dashboard ─────────────────────────────────────────────────────
async function renderDashboard() {
  const d = await GET('/dashboard');
  const sprintHtml = d.active_sprint
    ? `<div class="card">
        <div class="flex-between">
          <span class="card-title">⚡ Active Sprint: ${x(d.active_sprint.title)}</span>
          <span class="badge badge-progress">active</span>
        </div>
        <div class="card-meta">Project: ${x(d.active_sprint.project_title)} · ${fmtDate(d.active_sprint.start_date)} → ${fmtDate(d.active_sprint.end_date)}</div>
      </div>`
    : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No active sprint</div></div>`;

  const todayHtml = d.today_tasks.length
    ? d.today_tasks.map(t => `<tr>
        <td>${x(t.title)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${priBadge(t.priority)}</td>
        <td class="mono text-muted">${x(t.project_title||'—')}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:20px">No tasks due today</td></tr>`;

  const recentHtml = d.recent_tasks.length
    ? d.recent_tasks.map(t => `<tr>
        <td>${x(t.title)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${priBadge(t.priority)}</td>
        <td class="mono text-muted">${x(t.project_title||'—')}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:20px">No active tasks</td></tr>`;

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div>
        <div class="view-title">Dashboard</div>
        <div class="view-subtitle">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <button class="btn btn-primary" id="new-task-btn">+ New Task</button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value text-accent">${d.goals_count}</div>
        <div class="stat-label">Active Goals</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-accent">${d.projects_count}</div>
        <div class="stat-label">Active Projects</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent)">${d.in_progress}</div>
        <div class="stat-label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${d.overdue>0?'var(--danger)':'var(--success)'}">${d.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>

    <div class="mb-16">${sprintHtml}</div>

    <div class="mb-16">
      <div class="flex-between mb-16">
        <div class="mono text-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em">Today's Tasks</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Project</th></tr></thead>
          <tbody>${todayHtml}</tbody>
        </table>
      </div>
    </div>

    <div>
      <div class="flex-between mb-16">
        <div class="mono text-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em">Recent Active Tasks</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Project</th></tr></thead>
          <tbody>${recentHtml}</tbody>
        </table>
      </div>
    </div>
  </div>`;

  document.getElementById('new-task-btn').addEventListener('click', () => showNewTaskModal());
}

// ── Goals ─────────────────────────────────────────────────────────
async function renderGoals() {
  const goals = await GET('/goals');

  const cards = goals.length
    ? goals.map(g => `<div class="card">
        <div class="flex-between">
          <div class="card-title">◈ ${x(g.title)}</div>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" onclick="archiveGoal(${g.id})">Archive</button>
          </div>
        </div>
        ${g.description ? `<div class="card-meta mt-4">${x(g.description)}</div>` : ''}
        ${progressBar(g.progress.done, g.progress.total)}
        ${tagsHtml(g.tags)}
        <div class="card-meta">${fmtDate(g.created_at)}</div>
      </div>`).join('')
    : `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals yet. Create one to get started.</div></div>`;

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div>
        <div class="view-title">Goals</div>
        <div class="view-subtitle">${goals.length} active</div>
      </div>
      <button class="btn btn-primary" id="new-goal-btn">+ New Goal</button>
    </div>
    ${cards}
  </div>`;

  document.getElementById('new-goal-btn').addEventListener('click', showNewGoalModal);
}

async function archiveGoal(id) {
  if (!confirm('Archive this goal?')) return;
  await PATCH(`/goals/${id}`, { status: 'archived' });
  renderGoals();
}

function showNewGoalModal() {
  openModal('New Goal', `
    <form id="goal-form">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" name="title" required placeholder="My goal…" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea name="description" placeholder="What do you want to achieve?"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`, async (form) => {
    const data = Object.fromEntries(new FormData(form));
    await POST('/goals', data);
    closeModal();
    renderGoals();
  });
}

// ── Projects ──────────────────────────────────────────────────────
async function renderProjects(goalFilter) {
  const [projects, goals] = await Promise.all([
    GET('/projects' + (goalFilter ? `?goal_id=${goalFilter}` : '')),
    GET('/goals'),
  ]);

  const goalOpts = `<option value="">All Goals</option>` + goals.map(g => `<option value="${g.id}" ${goalFilter==g.id?'selected':''}>${x(g.title)}</option>`).join('');

  const cards = projects.length
    ? projects.map(p => `<div class="card">
        <div class="flex-between">
          <div class="card-title">◆ ${x(p.title)}</div>
          <div class="flex gap-8">
            ${statusBadge(p.status)}
          </div>
        </div>
        ${p.description ? `<div class="card-meta">${x(p.description)}</div>` : ''}
        ${progressBar(p.progress.done, p.progress.total)}
        <div class="card-meta">Goal: ${x(p.goal_title||'—')}</div>
        ${p.active_tasks.length ? `<div class="card-meta">In progress: ${p.active_tasks.map(x).join(' · ')}</div>` : ''}
        ${tagsHtml(p.tags)}
      </div>`).join('')
    : `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found.</div></div>`;

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div>
        <div class="view-title">Projects</div>
        <div class="view-subtitle">${projects.length} active</div>
      </div>
      <button class="btn btn-primary" id="new-proj-btn">+ New Project</button>
    </div>
    <div class="filter-row">
      <select id="goal-filter">${goalOpts}</select>
    </div>
    ${cards}
  </div>`;

  document.getElementById('goal-filter').addEventListener('change', e => renderProjects(e.target.value || undefined));
  document.getElementById('new-proj-btn').addEventListener('click', () => showNewProjectModal(goals));
}

function showNewProjectModal(goals) {
  const goalOpts = `<option value="">— none —</option>` + goals.map(g => `<option value="${g.id}">${x(g.title)}</option>`).join('');
  openModal('New Project', `
    <form id="proj-form">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" name="title" required placeholder="Project name…" />
      </div>
      <div class="form-group">
        <label class="form-label">Goal</label>
        <select name="goal_id">${goalOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea name="description"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`, async (form) => {
    const data = Object.fromEntries(new FormData(form));
    if (!data.goal_id) delete data.goal_id;
    await POST('/projects', data);
    closeModal();
    renderProjects();
  });
}

// ── Kanban ────────────────────────────────────────────────────────
async function renderKanban(projectFilter) {
  const [board, projects] = await Promise.all([
    GET('/kanban' + (projectFilter ? `?project_id=${projectFilter}` : '')),
    GET('/projects'),
  ]);

  const projOpts = `<option value="">All Projects</option>` + projects.map(p => `<option value="${p.id}" ${projectFilter==p.id?'selected':''}>${x(p.title)}</option>`).join('');

  const cols = [
    { key: 'todo', label: 'Todo', cls: 'kanban-col-todo' },
    { key: 'in_progress', label: 'In Progress', cls: 'kanban-col-progress' },
    { key: 'blocked', label: 'Blocked', cls: 'kanban-col-blocked' },
    { key: 'done', label: 'Done', cls: 'kanban-col-done' },
  ];

  const colsHtml = cols.map(c => {
    const tasks = board[c.key] || [];
    const cards = tasks.map(t => `
      <div class="kanban-card" data-id="${t.id}">
        <div class="kanban-card-title">${x(t.title)}</div>
        <div class="flex gap-8 mt-4">
          ${priBadge(t.priority)}
          ${t.due_date ? `<span class="badge badge-todo mono">${fmtDate(t.due_date)}</span>` : ''}
        </div>
        ${tagsHtml(t.tags)}
        ${t.project_title ? `<div class="kanban-card-meta mt-4">${x(t.project_title)}</div>` : ''}
      </div>`).join('');

    return `<div class="kanban-col ${c.cls}">
      <div class="kanban-col-header">
        <span class="kanban-col-title">${c.label}</span>
        <span class="kanban-count">${tasks.length}</span>
      </div>
      ${cards || `<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px">Empty</div>`}
    </div>`;
  }).join('');

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div class="view-title">Kanban Board</div>
      <button class="btn btn-primary" id="new-task-btn">+ New Task</button>
    </div>
    <div class="filter-row">
      <select id="proj-filter">${projOpts}</select>
    </div>
    <div class="kanban-board">${colsHtml}</div>
  </div>`;

  document.getElementById('proj-filter').addEventListener('change', e => renderKanban(e.target.value || undefined));

  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => showTaskDetailModal(card.dataset.id));
  });

  document.getElementById('new-task-btn').addEventListener('click', () => showNewTaskModal(projects, projectFilter));
}

async function showTaskDetailModal(taskId) {
  const [tasks, projects] = await Promise.all([GET('/tasks'), GET('/projects')]);
  const t = tasks.find(t => String(t.id) === String(taskId));
  if (!t) return;

  const projOpts = `<option value="">— none —</option>` + projects.map(p => `<option value="${p.id}" ${p.id==t.project_id?'selected':''}>${x(p.title)}</option>`).join('');

  openModal(`Edit Task`, `
    <form id="task-form">
      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" name="title" value="${x(t.title)}" required />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select name="status">
            ${['todo','in_progress','blocked','done'].map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select name="priority">
            ${['low','medium','high','urgent'].map(p => `<option value="${p}" ${t.priority===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Project</label>
        <select name="project_id">${projOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Due Date</label>
        <input type="date" name="due_date" value="${t.due_date||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea name="description">${x(t.description||'')}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Delete</button>
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`, async (form) => {
    const data = Object.fromEntries(new FormData(form));
    if (!data.project_id) data.project_id = null;
    if (!data.due_date) data.due_date = null;
    await PATCH(`/tasks/${taskId}`, data);
    closeModal();
    loadView(currentView);
  });
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await DEL(`/tasks/${id}`);
  closeModal();
  loadView(currentView);
}

// ── Sprint ────────────────────────────────────────────────────────
async function renderSprint(projectFilter) {
  const [sprints, projects] = await Promise.all([
    GET('/sprints' + (projectFilter ? `?project_id=${projectFilter}` : '')),
    GET('/projects'),
  ]);

  const projOpts = `<option value="">All Projects</option>` + projects.map(p => `<option value="${p.id}" ${projectFilter==p.id?'selected':''}>${x(p.title)}</option>`).join('');

  const rows = sprints.length
    ? sprints.map(s => `<tr>
        <td class="mono">${x(s.title)}</td>
        <td>${x(s.project_title||'—')}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="mono text-muted">${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</td>
        <td>
          <div class="progress-label" style="margin:0"><span>${s.progress.done}/${s.progress.total}</span><span>${s.progress.pct}%</span></div>
          <div class="progress-track" style="width:100px"><div class="progress-fill" style="width:${s.progress.pct}%"></div></div>
        </td>
        <td>
          ${s.status === 'planned' ? `<button class="btn btn-ghost btn-sm" onclick="updateSprint(${s.id},'active')">Start</button>` : ''}
          ${s.status === 'active' ? `<button class="btn btn-ghost btn-sm" onclick="updateSprint(${s.id},'completed')">Complete</button>` : ''}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="text-muted" style="text-align:center;padding:30px">No sprints found</td></tr>`;

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div class="view-title">Sprints</div>
      <button class="btn btn-primary" id="new-sprint-btn">+ New Sprint</button>
    </div>
    <div class="filter-row">
      <select id="sprint-proj-filter">${projOpts}</select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Sprint</th><th>Project</th><th>Status</th><th>Dates</th><th>Progress</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;

  document.getElementById('sprint-proj-filter').addEventListener('change', e => renderSprint(e.target.value || undefined));
  document.getElementById('new-sprint-btn').addEventListener('click', () => showNewSprintModal(projects));
}

async function updateSprint(id, status) {
  await PATCH(`/sprints/${id}`, { status });
  renderSprint();
}

function showNewSprintModal(projects) {
  const projOpts = projects.map(p => `<option value="${p.id}">${x(p.title)}</option>`).join('');
  openModal('New Sprint', `
    <form id="sprint-form">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" name="title" required placeholder="Sprint 1…" />
      </div>
      <div class="form-group">
        <label class="form-label">Project *</label>
        <select name="project_id" required>${projOpts}</select>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input type="date" name="start_date" />
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input type="date" name="end_date" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`, async (form) => {
    const data = Object.fromEntries(new FormData(form));
    if (!data.start_date) delete data.start_date;
    if (!data.end_date) delete data.end_date;
    await POST('/sprints', data);
    closeModal();
    renderSprint();
  });
}

// ── Resources ─────────────────────────────────────────────────────
const RESOURCE_TYPES = ['note','idea','link','file','doc','reference','video'];
const TYPE_COLORS = { note:'badge-todo', idea:'badge-progress', link:'badge-medium', file:'badge-low', doc:'badge-done', reference:'badge-done', video:'badge-medium' };

async function renderResources(typeFilter, linkFilter) {
  let qs = [];
  if (typeFilter) qs.push(`resource_type=${typeFilter}`);
  if (linkFilter) {
    const [kind, id] = linkFilter.split(':');
    if (kind && id) qs.push(`${kind}_id=${id}`);
  }
  const [resources, goals, projects] = await Promise.all([
    GET('/resources' + (qs.length ? `?${qs.join('&')}` : '')),
    GET('/goals'),
    GET('/projects'),
  ]);

  const typeOpts = `<option value="">All Types</option>` + RESOURCE_TYPES.map(t => `<option value="${t}" ${typeFilter===t?'selected':''}>${t}</option>`).join('');

  const linkOpts = `<option value="">All Items</option>` +
    goals.map(g => `<option value="goal:${g.id}" ${linkFilter===`goal:${g.id}`?'selected':''}>Goal: ${x(g.title)}</option>`).join('') +
    projects.map(p => `<option value="project:${p.id}" ${linkFilter===`project:${p.id}`?'selected':''}>Project: ${x(p.title)}</option>`).join('');

  const rows = resources.length
    ? resources.map(r => {
        const linked = r.task_title ? `task: ${r.task_title}` : r.project_title ? `project: ${r.project_title}` : r.goal_title ? `goal: ${r.goal_title}` : '—';
        const typeClass = TYPE_COLORS[r.resource_type] || 'badge-todo';
        return `<tr>
          <td><span class="badge ${typeClass}">${x(r.resource_type)}</span></td>
          <td>
            ${r.url ? `<a href="${x(r.url)}" target="_blank" rel="noopener">${x(r.title)}</a>` : x(r.title)}
          </td>
          <td class="text-muted">${x(linked)}</td>
          <td>${tagsHtml(r.tags)}</td>
          <td class="mono text-muted">${fmtDate(r.created_at)}</td>
          <td><button class="btn btn-ghost btn-sm btn-icon" onclick="deleteResource(${r.id})">✕</button></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="6" class="text-muted" style="text-align:center;padding:30px">No resources found</td></tr>`;

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div class="view-title">Resources</div>
      <button class="btn btn-primary" id="new-res-btn">+ New Resource</button>
    </div>
    <div class="filter-row">
      <select id="type-filter">${typeOpts}</select>
      <select id="link-filter">${linkOpts}</select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Type</th><th>Title</th><th>Linked To</th><th>Tags</th><th>Created</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;

  document.getElementById('type-filter').addEventListener('change', e => renderResources(e.target.value||undefined, linkFilter));
  document.getElementById('link-filter').addEventListener('change', e => renderResources(typeFilter, e.target.value||undefined));
  document.getElementById('new-res-btn').addEventListener('click', () => showNewResourceModal(goals, projects));
}

async function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  await DEL(`/resources/${id}`);
  renderResources();
}

function showNewResourceModal(goals, projects) {
  const typeOpts = RESOURCE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  const linkOpts = `<option value="">— none —</option>` +
    goals.map(g => `<option value="goal:${g.id}">Goal: ${x(g.title)}</option>`).join('') +
    projects.map(p => `<option value="project:${p.id}">Project: ${x(p.title)}</option>`).join('');

  openModal('New Resource', `
    <form id="res-form">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" name="title" required placeholder="Resource title…" />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select name="resource_type">${typeOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Linked To</label>
          <select name="link_to" id="link-to-sel">${linkOpts}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">URL</label>
        <input type="url" name="url" placeholder="https://…" />
      </div>
      <div class="form-group">
        <label class="form-label">Body / Notes</label>
        <textarea name="body" placeholder="Optional notes or content…"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`, async (form) => {
    const data = Object.fromEntries(new FormData(form));
    const linkTo = data.link_to || '';
    delete data.link_to;
    if (linkTo.startsWith('goal:')) data.goal_id = linkTo.split(':')[1];
    else if (linkTo.startsWith('project:')) data.project_id = linkTo.split(':')[1];
    if (!data.url) delete data.url;
    if (!data.body) delete data.body;
    await POST('/resources', data);
    closeModal();
    renderResources();
  });
}

// ── New Task Modal ─────────────────────────────────────────────────
async function showNewTaskModal(projects, projectFilter) {
  if (!projects) projects = await GET('/projects');
  const projOpts = `<option value="">— none —</option>` + projects.map(p => `<option value="${p.id}" ${projectFilter==p.id?'selected':''}>${x(p.title)}</option>`).join('');

  openModal('New Task', `
    <form id="task-form">
      <div class="form-group">
        <label class="form-label">Title *</label>
        <input type="text" name="title" required placeholder="Task title…" />
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select name="priority">
            <option value="low">low</option>
            <option value="medium" selected>medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <input type="date" name="due_date" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Project</label>
        <select name="project_id">${projOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea name="description"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`, async (form) => {
    const data = Object.fromEntries(new FormData(form));
    if (!data.project_id) delete data.project_id;
    if (!data.due_date) delete data.due_date;
    if (!data.description) delete data.description;
    await POST('/tasks', data);
    closeModal();
    loadView(currentView);
  });
}

// ── Pomodoro ──────────────────────────────────────────────────────
async function renderPomodoro() {
  const tasks = await GET('/tasks?status=in_progress').catch(() => []);

  const taskOpts = `<option value="">— pick a task —</option>` + tasks.map(t => `<option value="${t.id}">${x(t.title)}</option>`).join('');
  const { secsLeft, mode, running, taskTitle } = pomodoroState;
  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const secs = String(secsLeft % 60).padStart(2, '0');
  const modeLabel = mode === 'work' ? 'Focus' : 'Break';
  const ringClass = running ? (mode === 'work' ? 'active' : 'break') : '';

  document.getElementById('main-content').innerHTML = `
  <div class="view">
    <div class="view-header">
      <div class="view-title">Pomodoro</div>
    </div>
    <div class="pomodoro-wrap">
      <div class="pomodoro-ring ${ringClass}" id="pomo-ring">
        <div class="pomodoro-time" id="pomo-time">${mins}:${secs}</div>
        <div class="pomodoro-label" id="pomo-label">${modeLabel}</div>
      </div>

      <div class="pomodoro-task-name" id="pomo-task-name">
        ${taskTitle ? `Working on: <span>${x(taskTitle)}</span>` : 'Select a task to start'}
      </div>

      <div class="form-group" style="min-width:300px">
        <label class="form-label">Task</label>
        <select id="pomo-task-sel">${taskOpts}</select>
      </div>

      <div class="filter-row" style="justify-content:center">
        <label class="form-label" style="align-self:center">Duration:</label>
        <button class="btn btn-ghost btn-sm" onclick="setPomoMins(25)">25 min</button>
        <button class="btn btn-ghost btn-sm" onclick="setPomoMins(50)">50 min</button>
        <button class="btn btn-ghost btn-sm" onclick="setPomoMins(90)">90 min</button>
      </div>

      <div class="pomodoro-controls">
        <button class="btn btn-ghost" id="pomo-reset-btn">Reset</button>
        <button class="btn btn-primary" id="pomo-start-btn">${running ? 'Pause' : 'Start'}</button>
      </div>
    </div>
  </div>`;

  if (pomodoroState.taskId) {
    const sel = document.getElementById('pomo-task-sel');
    if (sel) sel.value = pomodoroState.taskId;
  }

  document.getElementById('pomo-task-sel').addEventListener('change', e => {
    const sel = e.target;
    pomodoroState.taskId = sel.value || null;
    pomodoroState.taskTitle = sel.options[sel.selectedIndex]?.text || null;
    document.getElementById('pomo-task-name').innerHTML = pomodoroState.taskTitle
      ? `Working on: <span>${x(pomodoroState.taskTitle)}</span>` : 'Select a task to start';
  });

  document.getElementById('pomo-start-btn').addEventListener('click', togglePomodoro);
  document.getElementById('pomo-reset-btn').addEventListener('click', resetPomodoro);
}

function setPomoMins(m) {
  if (pomodoroState.running) return;
  pomodoroState.secsLeft = m * 60;
  updatePomoDisplay();
}

function updatePomoDisplay() {
  const { secsLeft, mode, running } = pomodoroState;
  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const secs = String(secsLeft % 60).padStart(2, '0');
  const timeEl = document.getElementById('pomo-time');
  const labelEl = document.getElementById('pomo-label');
  const startBtn = document.getElementById('pomo-start-btn');
  const ring = document.getElementById('pomo-ring');
  if (timeEl) timeEl.textContent = `${mins}:${secs}`;
  if (labelEl) labelEl.textContent = mode === 'work' ? 'Focus' : 'Break';
  if (startBtn) startBtn.textContent = running ? 'Pause' : 'Start';
  if (ring) {
    ring.className = 'pomodoro-ring' + (running ? (mode === 'work' ? ' active' : ' break') : '');
  }
  // update page title
  document.title = running ? `${mins}:${secs} — raibis` : 'raibis — LifeOS';
}

function togglePomodoro() {
  if (pomodoroState.running) {
    clearInterval(pomodoroState.interval);
    pomodoroState.running = false;
  } else {
    pomodoroState.running = true;
    pomodoroState.interval = setInterval(tickPomodoro, 1000);
  }
  updatePomoDisplay();
}

function tickPomodoro() {
  pomodoroState.secsLeft--;
  if (pomodoroState.secsLeft <= 0) {
    clearInterval(pomodoroState.interval);
    pomodoroState.running = false;
    if (pomodoroState.mode === 'work') {
      if (pomodoroState.taskId) {
        const mins = 25; // default
        POST('/pomodoro', { task_id: parseInt(pomodoroState.taskId), duration_mins: mins, completed: true }).catch(()=>{});
      }
      pomodoroState.mode = 'break';
      pomodoroState.secsLeft = 5 * 60;
    } else {
      pomodoroState.mode = 'work';
      pomodoroState.secsLeft = 25 * 60;
    }
  }
  updatePomoDisplay();
}

function resetPomodoro() {
  clearInterval(pomodoroState.interval);
  pomodoroState.running = false;
  pomodoroState.mode = 'work';
  pomodoroState.secsLeft = 25 * 60;
  updatePomoDisplay();
}
