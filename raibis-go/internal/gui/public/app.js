'use strict';

/* ─── Constants ─────────────────────────────────────────────────────── */
const API = 'http://localhost:3344';
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_CATEGORIES = ['Work-Process','Work-Tickets','Birthdays','Finance','Organization','Hobbies','Study','Travel','Personal','Health','Work-Task'];
const RECUR_UNITS = ['Day(s)','Week(s)','Month(s)','Year(s)'];
const GOAL_TYPES = ['12 Weeks','12 Months','3 Years','5 Years'];
const GOAL_YEARS = ['2025','2026','2027','Multiyear'];
const MACRO_AREAS = ['Soul (Connection & Restoration)','Output (Deep Work & Career)','Growth (Input & Optimization)','Body (Physicality)'];
const KANBAN_COLS = ['Backlog','Maintenance','Sprint'];
const COLOR_OPTIONS = ['blue','green','red','yellow','purple','cyan','orange','pink'];
const COLOR_HEX = {blue:'#378ADD',green:'#6dcc8a',red:'#e07070',yellow:'#d4a84b',purple:'#a78bfa',cyan:'#22d3ee',orange:'#fb923c',pink:'#f472b6'};

/* ─── State ──────────────────────────────────────────────────────────── */
let currentView = 'dashboard';
let allTags = [];
let allCategories = [];

/* ─── Utilities ──────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return d.getTime() === today.getTime();
}

function statusBadge(status) {
  const map = { todo: 'badge-todo', in_progress: 'badge-progress', blocked: 'badge-blocked', done: 'badge-done' };
  const label = (status || 'todo').replace('_', ' ');
  return `<span class="badge ${map[status] || 'badge-todo'}">${label}</span>`;
}

function priorityBadge(priority) {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };
  return `<span class="badge ${map[priority] || 'badge-low'}">${priority || 'low'}</span>`;
}

function tagHtml(tag) {
  const hex = tag.color ? (COLOR_HEX[tag.color] || tag.color) : '#378ADD';
  return `<span class="tag" style="color:${hex};border-color:${hex}22;background:${hex}18">${tag.name}</span>`;
}

function dueBadgeHtml(dateStr) {
  if (!dateStr) return '';
  let cls = '';
  if (isOverdue(dateStr)) cls = 'overdue';
  else if (isToday(dateStr)) cls = 'today';
  return `<span class="task-due ${cls}">${fmtDate(dateStr)}</span>`;
}

function taskRowHtml(task, showProject) {
  const done = task.status === 'done';
  const titleCls = done ? 'task-title-text done' : 'task-title-text';
  const projBadge = showProject && task.project_title
    ? `<span class="task-project">${task.project_title}</span>` : '';
  const dueBadge = dueBadgeHtml(task.due_date);
  const subtaskBadge = task.subtask_count > 0
    ? `<span class="task-subtask-count">⊞ ${task.subtask_count}</span>` : '';
  const pBadge = priorityBadge(task.priority);
  const tagChips = (task.tags || []).slice(0, 2).map(t => tagHtml(t)).join('');

  return `<li class="task-row" data-task-id="${task.id}">
    <div class="task-check ${done ? 'done' : ''}" data-check-id="${task.id}">${done ? '✓' : ''}</div>
    <div class="task-content">
      <div class="${titleCls}">${task.title}</div>
      <div class="task-meta-row">${projBadge}${dueBadge}${subtaskBadge}${pBadge}${tagChips}</div>
    </div>
  </li>`;
}

function colorSelect(name, selected) {
  const opts = COLOR_OPTIONS.map(c =>
    `<option value="${c}" ${selected === c ? 'selected' : ''}>${c}</option>`
  ).join('');
  return `<select name="${name}" id="${name}">${opts}</select>`;
}

function categoryOptions(selected, includeBlank) {
  const blank = includeBlank ? '<option value="">— none —</option>' : '';
  return blank + allCategories.map(c =>
    `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${c.name}</option>`
  ).join('');
}

/* ─── Modal ──────────────────────────────────────────────────────────── */
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
  const saveBtn = document.getElementById('modal-save-btn');
  if (saveBtn && onSave) {
    saveBtn.onclick = onSave;
  }
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-backdrop').classList.remove('open');
}

/* ─── Slideover ──────────────────────────────────────────────────────── */
function openSlideover(title, bodyHTML) {
  document.getElementById('slideover-title').textContent = title;
  document.getElementById('slideover-body').innerHTML = bodyHTML;
  document.getElementById('slideover').classList.add('open');
}

function closeSlideover() {
  document.getElementById('slideover').classList.remove('open');
}

/* ─── View Dispatcher ────────────────────────────────────────────────── */
function renderView(view, params) {
  currentView = view;
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="view"><div class="loading">Loading…</div></div>`;
  switch (view) {
    case 'dashboard':       renderDashboard(); break;
    case 'tasks':           renderTasks(); break;
    case 'projects':        renderProjects(); break;
    case 'project-detail':  renderProjectDetail(params); break;
    case 'goals':           renderGoals(); break;
    case 'goal-detail':     renderGoalDetail(params); break;
    case 'notes':           renderNotes(); break;
    case 'sprints':         renderSprints(); break;
    case 'resources':       renderResources(); break;
    case 'categories':      renderCategories(); break;
    case 'tags':            renderTags(); break;
    default:
      main.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-icon">?</div><div class="empty-state-text">Unknown view</div></div></div>`;
  }
}

/* ─── Dashboard ──────────────────────────────────────────────────────── */
async function renderDashboard() {
  let data;
  try { data = await api('GET', '/api/dashboard'); } catch(e) { data = {}; }

  const goalsCount = data.goals_count || 0;
  const projectsCount = data.projects_count || 0;
  const inProgressCount = data.in_progress || 0;
  const overdueCount = data.overdue || 0;
  const sprint = data.active_sprint || null;
  const projects = data.active_projects || [];
  const todayTasks = data.today_tasks || [];
  const urgentTasks = data.urgent_tasks || [];

  const sprintPct = sprint && sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;

  const sprintWidget = sprint ? `
    <div class="sprint-name">${sprint.title}</div>
    <div class="sprint-dates">${fmtDate(sprint.start_date)} → ${fmtDate(sprint.end_date)}</div>
    <div class="sprint-progress-bar"><div class="sprint-progress-fill" style="width:${sprintPct}%"></div></div>
    <div class="sprint-stats">${sprint.done || 0}/${sprint.total || 0} tasks · ${sprintPct}%</div>
  ` : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No active sprint</div></div>`;

  const projRows = projects.slice(0, 5).map(p => {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    return `<div class="proj-row" data-proj-id="${p.id}" style="cursor:pointer">
      <span class="proj-name">${p.title}</span>
      <div class="proj-bar-wrap"><div class="proj-bar"><div class="proj-bar-fill" style="width:${pct}%"></div></div></div>
      <span class="proj-pct">${pct}%</span>
    </div>`;
  }).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No active projects</div></div>`;

  const todayRows = todayTasks.map(t => taskRowHtml(t, true)).join('')
    || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">Nothing due today</div></div>`;

  const urgentSection = urgentTasks.length > 0 ? `
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Urgent / High Priority</span></div>
        <ul class="task-list">${urgentTasks.slice(0,5).map(t => taskRowHtml(t, true)).join('')}</ul>
      </div>
    </div>` : '';

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Command Center</h1>
      <button class="btn btn-primary" id="dash-quick-task">+ Quick Task</button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${goalsCount}</div><div class="stat-label">Goals</div></div>
      <div class="stat-card"><div class="stat-value">${projectsCount}</div><div class="stat-label">Projects</div></div>
      <div class="stat-card"><div class="stat-value">${inProgressCount}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${overdueCount}</div><div class="stat-label">Overdue</div></div>
    </div>
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Active Sprint</span></div>
        ${sprintWidget}
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Active Projects</span></div>
        ${projRows}
      </div>
    </div>
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Today's Tasks</span>
          <button class="btn btn-sm btn-ghost widget-action" id="dash-add-task">+ Add Task</button>
        </div>
        <ul class="task-list">${todayRows}</ul>
      </div>
    </div>
    ${urgentSection}
  </div>`;

  document.getElementById('dash-quick-task').onclick = () => showNewTaskModal({});
  document.getElementById('dash-add-task').onclick = () => showNewTaskModal({});
  bindTaskListEvents();
  document.querySelectorAll('.proj-row').forEach(el => {
    el.onclick = () => renderView('project-detail', el.dataset.projId);
  });
}

/* ─── Tasks View ─────────────────────────────────────────────────────── */
async function renderTasks() {
  let tasks = [], projects = [];
  try { [tasks, projects] = await Promise.all([api('GET', '/api/tasks'), api('GET', '/api/projects')]); } catch(e) {}

  const statusOpts = ['', ...TASK_STATUSES].map(s =>
    `<option value="${s}">${s ? s.replace('_',' ') : 'All Statuses'}</option>`).join('');
  const projOpts = '<option value="">All Projects</option>' + projects.map(p =>
    `<option value="${p.id}">${p.title}</option>`).join('');

  function buildTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;
    const rows = list.map(t => `<tr>
      <td><span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-task-id="${t.id}">${t.title}</span></td>
      <td>${t.project_title ? `<span class="badge badge-todo">${t.project_title}</span>` : '—'}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td class="${isOverdue(t.due_date) ? 'task-due overdue' : isToday(t.due_date) ? 'task-due today' : ''}">${fmtDate(t.due_date) || '—'}</td>
      <td>${t.category_name || '—'}</td>
      <td>
        <button class="btn btn-sm btn-ghost task-edit-btn" data-task-id="${t.id}">Edit</button>
        <button class="btn btn-sm btn-danger task-del-btn" data-task-id="${t.id}">Delete</button>
      </td>
    </tr>`).join('');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Title</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th><th>Category</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Tasks</h1>
      <button class="btn btn-primary" id="new-task-btn">+ New Task</button>
    </div>
    <div class="filter-row">
      <select id="task-filter-status">${statusOpts}</select>
      <select id="task-filter-proj">${projOpts}</select>
      <input type="text" id="task-filter-search" placeholder="Search tasks…" />
    </div>
    <div id="tasks-table">${buildTable(tasks)}</div>
  </div>`;

  function applyFilters() {
    const status = document.getElementById('task-filter-status').value;
    const proj = document.getElementById('task-filter-proj').value;
    const q = document.getElementById('task-filter-search').value.toLowerCase();
    const filtered = tasks.filter(t => {
      if (status && t.status !== status) return false;
      if (proj && String(t.project_id) !== proj) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
    document.getElementById('tasks-table').innerHTML = buildTable(filtered);
    bindTaskTableEvents();
  }

  document.getElementById('new-task-btn').onclick = () => showNewTaskModal({});
  document.getElementById('task-filter-status').onchange = applyFilters;
  document.getElementById('task-filter-proj').onchange = applyFilters;
  document.getElementById('task-filter-search').oninput = applyFilters;
  bindTaskTableEvents();

  function bindTaskTableEvents() {
    document.querySelectorAll('.task-title-link').forEach(el => {
      el.onclick = () => showTaskSlideover(el.dataset.taskId);
    });
    document.querySelectorAll('.task-edit-btn').forEach(el => {
      el.onclick = async () => {
        const t = await api('GET', `/api/tasks/${el.dataset.taskId}`);
        showEditTaskModal(t);
      };
    });
    document.querySelectorAll('.task-del-btn').forEach(el => {
      el.onclick = async () => {
        if (!confirm('Delete this task?')) return;
        await api('DELETE', `/api/tasks/${el.dataset.taskId}`);
        renderTasks();
      };
    });
  }
}

/* ─── Projects View ──────────────────────────────────────────────────── */
async function renderProjects() {
  let projects = [], goals = [];
  try { [projects, goals] = await Promise.all([api('GET', '/api/projects'), api('GET', '/api/goals')]); } catch(e) {}

  const cards = projects.map(p => {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    const activeTasks = (p.active_tasks || []).slice(0, 3).map(t =>
      `<div style="font-size:12px;color:var(--text-muted);padding:2px 0">• ${t}</div>`
    ).join('');
    return `<div class="card detail-nav" data-proj-id="${p.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title proj-title-link" data-proj-id="${p.id}">${p.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-edit-btn" data-proj-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-danger proj-del-btn" data-proj-id="${p.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${statusBadge(p.status)}
        ${p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
        ${p.kanban_col ? `<span class="badge badge-progress">${p.kanban_col}</span>` : ''}
      </div>
      ${p.goal_title ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Goal: ${p.goal_title}</div>` : ''}
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${activeTasks ? `<div style="margin-top:8px">${activeTasks}</div>` : ''}
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects yet</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Projects</h1>
      <button class="btn btn-primary" id="new-proj-btn">+ New Project</button>
    </div>
    <div id="proj-list">${cards}</div>
  </div>`;

  document.getElementById('new-proj-btn').onclick = () => showProjectModal(null, goals);
  document.querySelectorAll('.detail-nav').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('.proj-edit-btn, .proj-del-btn')) return;
      renderView('project-detail', el.dataset.projId);
    };
  });
  document.querySelectorAll('.proj-edit-btn').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      const p = projects.find(x => String(x.id) === el.dataset.projId);
      showProjectModal(p, goals);
    };
  });
  document.querySelectorAll('.proj-del-btn').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this project?')) return;
      await api('DELETE', `/api/projects/${el.dataset.projId}`);
      renderProjects();
    };
  });
}

/* ─── Goals View ─────────────────────────────────────────────────────── */
async function renderGoals() {
  let goals = [];
  try { goals = await api('GET', '/api/goals'); } catch(e) {}

  const cards = goals.map(g => {
    const prog = g.progress || {};
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    return `<div class="card detail-nav-goal" data-goal-id="${g.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title">${g.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-edit-btn" data-goal-id="${g.id}">Edit</button>
          <button class="btn btn-sm btn-danger goal-del-btn" data-goal-id="${g.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
        ${g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        ${statusBadge(g.status)}
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0} tasks</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals yet</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Goals</h1>
      <button class="btn btn-primary" id="new-goal-btn">+ New Goal</button>
    </div>
    <div id="goal-list">${cards}</div>
  </div>`;

  document.getElementById('new-goal-btn').onclick = () => showGoalModal(null);
  document.querySelectorAll('.detail-nav-goal').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('.goal-edit-btn, .goal-del-btn')) return;
      renderView('goal-detail', el.dataset.goalId);
    };
  });
  document.querySelectorAll('.goal-edit-btn').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const g = goals.find(x => String(x.id) === el.dataset.goalId);
      showGoalModal(g);
    };
  });
  document.querySelectorAll('.goal-del-btn').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this goal?')) return;
      await api('DELETE', `/api/goals/${el.dataset.goalId}`);
      renderGoals();
    };
  });
}

/* ─── Notes View ─────────────────────────────────────────────────────── */
async function renderNotes() {
  let notes = [];
  try { notes = await api('GET', '/api/notes'); } catch(e) {}

  const catOpts = '<option value="">All Categories</option>' +
    allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes yet</div></div>`;
    return list.map(n => `<div class="note-card" data-note-id="${n.id}">
      <div class="flex-between gap-8">
        <div class="note-title">${n.title || 'Untitled'}</div>
        <button class="btn btn-sm btn-danger note-del-btn" data-note-id="${n.id}">Delete</button>
      </div>
      <div class="note-body-preview">${n.body || ''}</div>
      <div class="note-meta">${fmtDate(n.note_date) || ''}${n.category_name ? ' · ' + n.category_name : ''}</div>
    </div>`).join('');
  }

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Notes</h1>
      <button class="btn btn-primary" id="new-note-btn">+ New Note</button>
    </div>
    <div class="filter-row">
      <select id="note-filter-cat">${catOpts}</select>
    </div>
    <div id="notes-list">${buildCards(notes)}</div>
  </div>`;

  function applyFilter() {
    const cat = document.getElementById('note-filter-cat').value;
    const filtered = notes.filter(n => !cat || String(n.category_id) === cat);
    document.getElementById('notes-list').innerHTML = buildCards(filtered);
    bindNoteEvents();
  }

  document.getElementById('new-note-btn').onclick = () => showNoteModal(null);
  document.getElementById('note-filter-cat').onchange = applyFilter;
  bindNoteEvents();

  function bindNoteEvents() {
    document.querySelectorAll('.note-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.classList.contains('note-del-btn')) return;
        const n = notes.find(x => String(x.id) === el.dataset.noteId);
        if (n) showNoteModal(n);
      };
    });
    document.querySelectorAll('.note-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this note?')) return;
        await api('DELETE', `/api/notes/${el.dataset.noteId}`);
        renderNotes();
      };
    });
  }
}

/* ─── Sprints View ───────────────────────────────────────────────────── */
async function renderSprints() {
  let sprints = [], projects = [];
  try { [sprints, projects] = await Promise.all([api('GET', '/api/sprints'), api('GET', '/api/projects')]); } catch(e) {}

  const projOpts = '<option value="">All Projects</option>' +
    projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints yet</div></div>`;
    return list.map(s => {
      const prog = s.progress || {};
      const pct = prog.pct || 0;
      const nextStatus = s.status === 'planned' ? 'active' : s.status === 'active' ? 'completed' : null;
      const nextLabel = s.status === 'planned' ? 'Start' : s.status === 'active' ? 'Complete' : null;
      return `<div class="card">
        <div class="flex-between gap-8" style="margin-bottom:6px">
          <span class="card-title">${s.title}</span>
          <div class="flex gap-8">
            ${nextStatus ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="${nextStatus}">${nextLabel}</button>` : ''}
            <button class="btn btn-sm btn-danger sprint-del-btn" data-sprint-id="${s.id}">Delete</button>
          </div>
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
          ${statusBadge(s.status)}
          ${s.project_title ? `<span class="badge badge-todo">${s.project_title}</span>` : ''}
        </div>
        <div class="card-meta">${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</div>
        <div class="progress-wrap">
          <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Sprints</h1>
      <button class="btn btn-primary" id="new-sprint-btn">+ New Sprint</button>
    </div>
    <div class="filter-row">
      <select id="sprint-filter-proj">${projOpts}</select>
    </div>
    <div id="sprints-list">${buildCards(sprints)}</div>
  </div>`;

  function applyFilter() {
    const proj = document.getElementById('sprint-filter-proj').value;
    const filtered = sprints.filter(s => !proj || String(s.project_id) === proj);
    document.getElementById('sprints-list').innerHTML = buildCards(filtered);
    bindSprintEvents();
  }

  document.getElementById('new-sprint-btn').onclick = () => showSprintModal(projects);
  document.getElementById('sprint-filter-proj').onchange = applyFilter;
  bindSprintEvents();

  function bindSprintEvents() {
    document.querySelectorAll('.sprint-status-btn').forEach(el => {
      el.onclick = async () => {
        await api('PATCH', `/api/sprints/${el.dataset.sprintId}`, { status: el.dataset.next });
        renderSprints();
      };
    });
    document.querySelectorAll('.sprint-del-btn').forEach(el => {
      el.onclick = async () => {
        if (!confirm('Delete this sprint?')) return;
        await api('DELETE', `/api/sprints/${el.dataset.sprintId}`);
        renderSprints();
      };
    });
  }
}

/* ─── Resources View ─────────────────────────────────────────────────── */
async function renderResources() {
  let resources = [];
  try { resources = await api('GET', '/api/resources'); } catch(e) {}

  const types = [...new Set(resources.map(r => r.resource_type).filter(Boolean))];
  const typeOpts = '<option value="">All Types</option>' +
    types.map(t => `<option value="${t}">${t}</option>`).join('');

  function buildTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    const rows = list.map(r => {
      const rawUrl = r.url || '';
      const link = rawUrl
        ? `<a href="${rawUrl}" target="_blank" rel="noopener">${rawUrl.length > 40 ? rawUrl.slice(0,40) + '…' : rawUrl}</a>`
        : (r.body ? r.body.slice(0,60) + '…' : '—');
      const linked = r.goal_title || r.project_title || r.task_title || '—';
      return `<tr>
        <td>${r.title}</td>
        <td>${r.resource_type || '—'}</td>
        <td>${linked}</td>
        <td>${link}</td>
        <td>
          <button class="btn btn-sm btn-ghost res-edit-btn" data-res-id="${r.id}">Edit</button>
          <button class="btn btn-sm btn-danger res-del-btn" data-res-id="${r.id}">Delete</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Title</th><th>Type</th><th>Linked</th><th>URL / Preview</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Resources</h1>
      <button class="btn btn-primary" id="new-res-btn">+ New Resource</button>
    </div>
    <div class="filter-row">
      <select id="res-filter-type">${typeOpts}</select>
    </div>
    <div id="res-table">${buildTable(resources)}</div>
  </div>`;

  function applyFilter() {
    const t = document.getElementById('res-filter-type').value;
    const filtered = resources.filter(r => !t || r.resource_type === t);
    document.getElementById('res-table').innerHTML = buildTable(filtered);
    bindResEvents();
  }

  document.getElementById('new-res-btn').onclick = () => showResourceModal(null);
  document.getElementById('res-filter-type').onchange = applyFilter;
  bindResEvents();

  function bindResEvents() {
    document.querySelectorAll('.res-edit-btn').forEach(el => {
      el.onclick = async () => {
        const r = resources.find(x => String(x.id) === el.dataset.resId);
        showResourceModal(r);
      };
    });
    document.querySelectorAll('.res-del-btn').forEach(el => {
      el.onclick = async () => {
        if (!confirm('Delete this resource?')) return;
        await api('DELETE', `/api/resources/${el.dataset.resId}`);
        renderResources();
      };
    });
  }
}

/* ─── Categories View ────────────────────────────────────────────────── */
async function renderCategories() {
  let cats = [];
  try { cats = await api('GET', '/api/categories'); allCategories = cats; } catch(e) {}

  const chips = cats.map(c => {
    const hex = COLOR_HEX[c.color] || c.color || '#378ADD';
    return `<div class="taxonomy-chip">
      <div class="taxonomy-chip-color" style="background:${hex}"></div>
      <span class="taxonomy-chip-name">${c.name}</span>
      <div class="taxonomy-chip-actions">
        <button class="btn btn-sm btn-ghost cat-edit-btn" data-cat-id="${c.id}">Edit</button>
        <button class="btn btn-sm btn-danger cat-del-btn" data-cat-id="${c.id}">Del</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">◉</div><div class="empty-state-text">No categories yet</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Categories</h1>
      <button class="btn btn-primary" id="new-cat-btn">+ New Category</button>
    </div>
    <div class="taxonomy-grid">${chips}</div>
  </div>`;

  document.getElementById('new-cat-btn').onclick = () => showCategoryModal(null);
  document.querySelectorAll('.cat-edit-btn').forEach(el => {
    el.onclick = () => {
      const c = cats.find(x => String(x.id) === el.dataset.catId);
      showCategoryModal(c);
    };
  });
  document.querySelectorAll('.cat-del-btn').forEach(el => {
    el.onclick = async () => {
      if (!confirm('Delete this category?')) return;
      await api('DELETE', `/api/categories/${el.dataset.catId}`);
      renderCategories();
    };
  });
}

/* ─── Tags View ──────────────────────────────────────────────────────── */
async function renderTags() {
  let tags = [];
  try { tags = await api('GET', '/api/tags'); allTags = tags; } catch(e) {}

  const chips = tags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    return `<div class="taxonomy-chip">
      <div class="taxonomy-chip-color" style="background:${hex}"></div>
      <span class="taxonomy-chip-name">${t.name}</span>
      <div class="taxonomy-chip-actions">
        <button class="btn btn-sm btn-ghost tag-edit-btn" data-tag-id="${t.id}">Edit</button>
        <button class="btn btn-sm btn-danger tag-del-btn" data-tag-id="${t.id}">Del</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">⬖</div><div class="empty-state-text">No tags yet</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Tags</h1>
      <button class="btn btn-primary" id="new-tag-btn">+ New Tag</button>
    </div>
    <div class="taxonomy-grid">${chips}</div>
  </div>`;

  document.getElementById('new-tag-btn').onclick = () => showTagModal(null);
  document.querySelectorAll('.tag-edit-btn').forEach(el => {
    el.onclick = () => {
      const t = tags.find(x => String(x.id) === el.dataset.tagId);
      showTagModal(t);
    };
  });
  document.querySelectorAll('.tag-del-btn').forEach(el => {
    el.onclick = async () => {
      if (!confirm('Delete this tag?')) return;
      await api('DELETE', `/api/tags/${el.dataset.tagId}`);
      renderTags();
    };
  });
}

/* ─── Project Detail View ─────────────────────────────────────────────── */
async function renderProjectDetail(projectId) {
  let p;
  try { p = await api('GET', `/api/projects/${projectId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Project not found</div></div></div>`;
    return;
  }

  const tasks = p.tasks || [];
  const notes = p.notes || [];
  const resources = p.resources || [];

  const taskRows = tasks.map(t => taskRowHtml(t, false)).join('')
    || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks</div></div>`;

  const noteCards = notes.map(n => `<div class="note-card">
    <div class="note-title">${n.title || 'Untitled'}</div>
    <div class="note-body-preview">${n.body || ''}</div>
    <div class="note-meta">${fmtDate(n.note_date) || ''}</div>
  </div>`).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No notes</div></div>`;

  const resRows = resources.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
    <span class="badge badge-todo">${r.resource_type || 'link'}</span>
    <span style="flex:1">${r.title}</span>
    ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">↗ Open</a>` : ''}
  </div>`).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No resources</div></div>`;

  const goalLink = p.goal_title
    ? `<span class="bc-crumb bc-goal" style="cursor:pointer" data-goal-id="${p.goal_id}">◈ ${p.goal_title}</span>`
    : '';

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        ${goalLink ? `<div class="breadcrumb" style="margin-bottom:6px">${goalLink}</div>` : ''}
        <h1 class="view-title">${p.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(p.status)}
          ${p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
          ${p.kanban_col ? `<span class="badge badge-progress">${p.kanban_col}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="pd-back-btn">← Back</button>
        <button class="btn btn-primary" id="pd-add-task-btn">+ Task</button>
        <button class="btn btn-ghost" id="pd-add-note-btn">+ Note</button>
      </div>
    </div>
    ${p.description ? `<div class="card" style="margin-bottom:16px"><p style="color:var(--text-muted)">${p.description}</p></div>` : ''}
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Tasks (${tasks.length})</span></div>
        <ul class="task-list" id="pd-task-list">${taskRows}</ul>
      </div>
    </div>
    <div class="cc-grid" style="margin-top:16px">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Notes (${notes.length})</span></div>
        <div>${noteCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Resources (${resources.length})</span></div>
        <div>${resRows}</div>
      </div>
    </div>
  </div>`;

  document.getElementById('pd-back-btn').onclick = () => renderView('projects');
  document.getElementById('pd-add-task-btn').onclick = () => showNewTaskModal({ project_id: parseInt(projectId) });
  document.getElementById('pd-add-note-btn').onclick = () => showNoteModal({ project_id: parseInt(projectId) });
  if (goalLink) {
    document.querySelectorAll('.bc-goal').forEach(el => {
      el.onclick = () => renderView('goal-detail', el.dataset.goalId);
    });
  }
  bindTaskListEvents();
}

/* ─── Goal Detail View ────────────────────────────────────────────────── */
async function renderGoalDetail(goalId) {
  let g;
  try { g = await api('GET', `/api/goals/${goalId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Goal not found</div></div></div>`;
    return;
  }

  const projects = g.projects || [];
  const tasks = g.tasks || [];
  const notes = g.notes || [];
  const resources = g.resources || [];

  const projCards = projects.map(p => {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    return `<div class="card detail-nav" data-proj-id="${p.id}" style="cursor:pointer;margin-bottom:8px">
      <div class="flex-between gap-8">
        <span class="card-title">${p.title}</span>
        ${statusBadge(p.status)}
      </div>
      <div class="progress-wrap" style="margin-top:8px">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No projects</div></div>`;

  const taskRows = tasks.map(t => taskRowHtml(t, false)).join('')
    || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No direct tasks</div></div>`;

  const noteCards = notes.map(n => `<div class="note-card">
    <div class="note-title">${n.title || 'Untitled'}</div>
    <div class="note-body-preview">${n.body || ''}</div>
    <div class="note-meta">${fmtDate(n.note_date) || ''}</div>
  </div>`).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No notes</div></div>`;

  // Metrics row
  const metricsHtml = (g.start_value != null || g.target != null) ? `
    <div class="stats-row" style="margin-bottom:16px">
      ${g.start_value != null ? `<div class="stat-card"><div class="stat-value">${g.start_value}</div><div class="stat-label">Start</div></div>` : ''}
      ${g.current_value != null ? `<div class="stat-card"><div class="stat-value">${g.current_value}</div><div class="stat-label">Current</div></div>` : ''}
      ${g.target != null ? `<div class="stat-card"><div class="stat-value">${g.target}</div><div class="stat-label">Target</div></div>` : ''}
    </div>` : '';

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        <h1 class="view-title">${g.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(g.status)}
          ${g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
          ${g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="gd-back-btn">← Back</button>
        <button class="btn btn-primary" id="gd-add-task-btn">+ Task</button>
        <button class="btn btn-ghost" id="gd-add-note-btn">+ Note</button>
      </div>
    </div>
    ${g.description ? `<div class="card" style="margin-bottom:16px"><p style="color:var(--text-muted)">${g.description}</p></div>` : ''}
    ${metricsHtml}
    <div class="cc-grid" style="margin-bottom:16px">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Projects (${projects.length})</span></div>
        <div id="gd-proj-list">${projCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Direct Tasks (${tasks.length})</span></div>
        <ul class="task-list" id="gd-task-list">${taskRows}</ul>
      </div>
    </div>
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Notes (${notes.length})</span></div>
        <div>${noteCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Resources (${resources.length})</span></div>
        <div>${resources.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="badge badge-todo">${r.resource_type || 'link'}</span>
          <span style="flex:1">${r.title}</span>
          ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">↗</a>` : ''}
        </div>`).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No resources</div></div>'}</div>
      </div>
    </div>
  </div>`;

  document.getElementById('gd-back-btn').onclick = () => renderView('goals');
  document.getElementById('gd-add-task-btn').onclick = () => showNewTaskModal({ goal_id: parseInt(goalId) });
  document.getElementById('gd-add-note-btn').onclick = () => showNoteModal({ goal_id: parseInt(goalId) });
  document.querySelectorAll('#gd-proj-list .detail-nav').forEach(el => {
    el.onclick = () => renderView('project-detail', el.dataset.projId);
  });
  bindTaskListEvents();
}

/* ─── Task Slideover ─────────────────────────────────────────────────── */
async function showTaskSlideover(taskId) {
  openSlideover('Task Detail', '<div class="loading">Loading…</div>');

  let task;
  try { task = await api('GET', `/api/tasks/${taskId}`); } catch(e) { return; }

  const subtasks = task.sub_tasks || [];
  const tags = task.tags || [];
  const selectedTagIds = tags.map(t => t.id);

  // Breadcrumb
  const bcParts = [];
  if (task.goal_title) bcParts.push(`<span class="bc-crumb bc-goal" style="cursor:pointer" data-goal-id="${task.goal_id}">${task.goal_title}</span>`);
  if (task.project_title) bcParts.push(`<span class="bc-crumb bc-proj" style="cursor:pointer" data-proj-id="${task.project_id}">${task.project_title}</span>`);
  if (task.parent_task_title) bcParts.push(`<span class="bc-crumb" style="cursor:pointer" data-parent-id="${task.parent_task_id}">${task.parent_task_title}</span>`);
  const breadcrumb = bcParts.length ? `<div class="breadcrumb">${bcParts.join('<span class="bc-sep">›</span>')}</div>` : '';

  const catOpts = categoryOptions(task.category_id, true);
  const statusOpts = TASK_STATUSES.map(s =>
    `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('');
  const prioOpts = TASK_PRIORITIES.map(p =>
    `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('');

  const pomPlanned = task.pomodoros_planned || 0;
  const pomDone = task.pomodoros_finished || 0;
  const dotCount = Math.max(pomPlanned, pomDone, 1);
  const pomDots = Array.from({length: dotCount}, (_, i) =>
    `<div class="pom-dot ${i < pomDone ? 'done' : ''}"></div>`
  ).join('');

  const subtaskRows = subtasks.map(st => `<li class="subtask-row">
    <div class="task-check ${st.status === 'done' ? 'done' : ''}" data-subtask-id="${st.id}" style="cursor:pointer">${st.status === 'done' ? '✓' : ''}</div>
    <span class="subtask-title">${st.title}</span>
    ${statusBadge(st.status)}
  </li>`).join('');

  const tagPicker = allTags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    const sel = selectedTagIds.includes(t.id) ? 'selected' : '';
    return `<span class="tag-chip ${sel}" data-tag-id="${t.id}" style="color:${hex}">${t.name}</span>`;
  }).join('');

  const notesHtml = (task.notes || []).map(n =>
    `<div class="note-card" style="margin-bottom:8px">
      <div class="note-title">${n.title || 'Note'}</div>
      <div class="note-body-preview">${n.body || ''}</div>
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:13px">No linked notes</div>';

  const resourcesHtml = (task.resources || []).map(r =>
    `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--accent)">${r.resource_type || 'link'}</span>
      <span>${r.title}</span>
      ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" style="font-size:12px;color:var(--text-muted)">↗</a>` : ''}
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:13px">No linked resources</div>';

  const body = `
    ${breadcrumb}
    <input class="detail-title-input" id="detail-title" value="${(task.title || '').replace(/"/g, '&quot;')}" />
    <div class="detail-grid">
      <div class="detail-field">
        <label>Status</label>
        <select id="detail-status">${statusOpts}</select>
      </div>
      <div class="detail-field">
        <label>Priority</label>
        <select id="detail-priority">${prioOpts}</select>
      </div>
      <div class="detail-field">
        <label>Due Date</label>
        <input type="date" id="detail-due" value="${task.due_date || ''}" />
      </div>
      <div class="detail-field">
        <label>Focus Block</label>
        <input type="date" id="detail-focus" value="${task.focus_block || ''}" />
      </div>
      <div class="detail-field">
        <label>Category</label>
        <select id="detail-category">${catOpts}</select>
      </div>
      <div class="detail-field">
        <label>Story Points</label>
        <input type="number" id="detail-points" value="${task.story_points || ''}" min="0" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="detail-desc" style="width:100%;min-height:80px">${task.description || ''}</textarea>
    </div>
    <div class="subtask-section">
      <div class="subtask-section-title"><span>Subtasks (${subtasks.length})</span></div>
      <ul class="subtask-list" id="subtask-list">${subtaskRows}</ul>
      <div class="add-subtask-row">
        <input type="text" id="new-subtask-input" placeholder="Add subtask… (Enter to save)" />
      </div>
    </div>
    <div class="form-group" style="margin-top:20px">
      <label class="form-label">Tags</label>
      <div class="tag-picker" id="tag-picker">${tagPicker || '<span style="font-size:12px;color:var(--text-muted)">No tags available</span>'}</div>
    </div>
    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Pomodoros · ${pomDone}/${pomPlanned}</span>
        <button class="btn btn-sm btn-ghost" id="log-pom-btn">+ Log Pomodoro</button>
      </div>
      <div class="pomodoro-track">${pomDots}</div>
    </div>
    <div class="subtask-section" style="margin-top:20px">
      <div class="subtask-section-title"><span>Notes (${(task.notes||[]).length})</span>
        <button class="btn btn-sm btn-ghost" id="add-note-to-task-btn">+ Add</button>
      </div>
      <div>${notesHtml}</div>
    </div>
    <div class="subtask-section" style="margin-top:20px">
      <div class="subtask-section-title"><span>Resources (${(task.resources||[]).length})</span></div>
      <div>${resourcesHtml}</div>
    </div>
  `;

  openSlideover(task.title, body);

  async function patchTask(data) {
    try { await api('PATCH', `/api/tasks/${taskId}`, data); } catch(e) {}
  }

  document.getElementById('detail-title').onblur = (e) => patchTask({ title: e.target.value });
  document.getElementById('detail-status').onchange = (e) => patchTask({ status: e.target.value });
  document.getElementById('detail-priority').onchange = (e) => patchTask({ priority: e.target.value });
  document.getElementById('detail-due').onchange = (e) => patchTask({ due_date: e.target.value || null });
  document.getElementById('detail-focus').onchange = (e) => patchTask({ focus_block: e.target.value || null });
  document.getElementById('detail-category').onchange = (e) => patchTask({ category_id: e.target.value ? parseInt(e.target.value) : null });
  document.getElementById('detail-points').onchange = (e) => patchTask({ story_points: parseInt(e.target.value) || 0 });
  document.getElementById('detail-desc').onblur = (e) => patchTask({ description: e.target.value });

  document.getElementById('new-subtask-input').onkeydown = async (e) => {
    if (e.key !== 'Enter') return;
    const val = e.target.value.trim();
    if (!val) return;
    try {
      await api('POST', '/api/tasks', { title: val, parent_task_id: parseInt(taskId), status: 'todo', priority: 'medium' });
      e.target.value = '';
      showTaskSlideover(taskId);
    } catch(err) {}
  };

  document.querySelectorAll('.subtask-row .task-check').forEach(el => {
    el.onclick = async () => {
      const stId = el.dataset.subtaskId;
      const isDone = el.classList.contains('done');
      await api('PATCH', `/api/tasks/${stId}`, { status: isDone ? 'todo' : 'done' });
      showTaskSlideover(taskId);
    };
  });

  document.querySelectorAll('.tag-chip').forEach(chip => {
    chip.onclick = async () => {
      chip.classList.toggle('selected');
      const pickedIds = [...document.querySelectorAll('.tag-chip.selected')].map(c => parseInt(c.dataset.tagId));
      try { await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: pickedIds }); } catch(err) {}
    };
  });

  document.getElementById('log-pom-btn').onclick = async () => {
    await patchTask({ pomodoros_finished: pomDone + 1 });
    showTaskSlideover(taskId);
  };

  document.getElementById('add-note-to-task-btn').onclick = () => {
    closeSlideover();
    showNoteModal({ task_id: parseInt(taskId) });
  };

  document.querySelectorAll('.bc-goal').forEach(el => {
    el.onclick = () => { closeSlideover(); renderView('goal-detail', el.dataset.goalId); };
  });
  document.querySelectorAll('.bc-proj').forEach(el => {
    el.onclick = () => { closeSlideover(); renderView('project-detail', el.dataset.projId); };
  });
  document.querySelectorAll('[data-parent-id]').forEach(el => {
    el.onclick = () => showTaskSlideover(el.dataset.parentId);
  });
}

/* ─── Dashboard task list bindings ──────────────────────────────────── */
function bindTaskListEvents() {
  document.querySelectorAll('.task-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.classList.contains('task-check') || e.target.dataset.checkId) return;
      showTaskSlideover(row.dataset.taskId);
    };
  });
  document.querySelectorAll('.task-check').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      const id = el.dataset.checkId;
      const isDone = el.classList.contains('done');
      try { await api('PATCH', `/api/tasks/${id}`, { status: isDone ? 'todo' : 'done' }); } catch(err) {}
      renderDashboard();
    };
  });
}

/* ─── Task Modal helpers ─────────────────────────────────────────────── */
async function getTaskModalResources() {
  let projects = [], sprints = [], tasks = [], goals = [];
  try { [projects, sprints, tasks, goals] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/sprints'), api('GET', '/api/tasks'), api('GET', '/api/goals')
  ]); } catch(e) {}
  return { projects, sprints, tasks, goals };
}

function taskModalBody(task, resources) {
  const { projects, sprints, tasks, goals } = resources;
  const v = task || {};
  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id) === String(v.goal_id) ? 'selected' : ''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id) === String(v.project_id) ? 'selected' : ''}>${p.title}</option>`).join('');
  const sprintOpts = '<option value="">— none —</option>' + sprints.map(s =>
    `<option value="${s.id}" ${String(s.id) === String(v.sprint_id) ? 'selected' : ''}>${s.title}</option>`).join('');
  const parentOpts = '<option value="">— none —</option>' + tasks.filter(t => t.id !== v.id).map(t =>
    `<option value="${t.id}" ${String(t.id) === String(v.parent_task_id) ? 'selected' : ''}>${t.title}</option>`).join('');
  const statusOpts = TASK_STATUSES.map(s =>
    `<option value="${s}" ${v.status === s ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('');
  const prioOpts = TASK_PRIORITIES.map(p =>
    `<option value="${p}" ${v.priority === p ? 'selected' : ''}>${p}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  return `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="t-title" value="${(v.title||'').replace(/"/g,'&quot;')}" placeholder="Task title" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="t-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Status</label><select id="t-status">${statusOpts}</select></div>
      <div class="form-group"><label class="form-label">Priority</label><select id="t-priority">${prioOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" id="t-due" value="${v.due_date||''}" /></div>
      <div class="form-group"><label class="form-label">Focus Block</label><input type="date" id="t-focus" value="${v.focus_block||''}" /></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="t-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Project</label><select id="t-project">${projOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Sprint</label><select id="t-sprint">${sprintOpts}</select></div>
      <div class="form-group"><label class="form-label">Parent Task</label><select id="t-parent">${parentOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="t-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label">Story Points</label><input type="number" id="t-points" value="${v.story_points||''}" min="0" /></div>
    </div>
    <div class="form-group"><label class="form-label">Pomodoros Planned</label><input type="number" id="t-poms" value="${v.pomodoros_planned||''}" min="0" /></div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;
}

function collectTaskForm() {
  return {
    title: document.getElementById('t-title').value.trim(),
    description: document.getElementById('t-desc').value,
    status: document.getElementById('t-status').value,
    priority: document.getElementById('t-priority').value,
    due_date: document.getElementById('t-due').value || null,
    focus_block: document.getElementById('t-focus').value || null,
    goal_id: document.getElementById('t-goal').value ? parseInt(document.getElementById('t-goal').value) : null,
    project_id: document.getElementById('t-project').value ? parseInt(document.getElementById('t-project').value) : null,
    sprint_id: document.getElementById('t-sprint').value ? parseInt(document.getElementById('t-sprint').value) : null,
    parent_task_id: document.getElementById('t-parent').value ? parseInt(document.getElementById('t-parent').value) : null,
    category_id: document.getElementById('t-category').value ? parseInt(document.getElementById('t-category').value) : null,
    story_points: parseInt(document.getElementById('t-points').value) || 0,
    pomodoros_planned: parseInt(document.getElementById('t-poms').value) || 0,
  };
}

async function showNewTaskModal(presets) {
  const resources = await getTaskModalResources();
  const fake = { status: 'todo', priority: 'medium', ...presets };
  openModal('New Task', taskModalBody(fake, resources), null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { alert('Title is required'); return; }
    await api('POST', '/api/tasks', data);
    closeModal();
    renderView(currentView);
  };
}

async function showEditTaskModal(task) {
  const resources = await getTaskModalResources();
  openModal('Edit Task', taskModalBody(task, resources), null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { alert('Title is required'); return; }
    await api('PATCH', `/api/tasks/${task.id}`, data);
    closeModal();
    renderView(currentView);
  };
  document.getElementById('modal-delete-btn').onclick = async () => {
    if (!confirm('Delete this task?')) return;
    await api('DELETE', `/api/tasks/${task.id}`);
    closeModal();
    renderView(currentView);
  };
}

/* ─── Goal Modal ─────────────────────────────────────────────────────── */
function showGoalModal(goal) {
  const v = goal || {};
  const typeOpts = GOAL_TYPES.map(t => `<option value="${t}" ${v.type===t?'selected':''}>${t}</option>`).join('');
  const yearOpts = GOAL_YEARS.map(y => `<option value="${y}" ${v.year===y?'selected':''}>${y}</option>`).join('');
  const statusOpts = ['todo','in_progress','done'].map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="g-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="g-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Type</label><select id="g-type">${typeOpts}</select></div>
      <div class="form-group"><label class="form-label">Year</label><select id="g-year">${yearOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Status</label><select id="g-status">${statusOpts}</select></div>
      <div class="form-group"><label class="form-label">Category</label><select id="g-category">${catOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="g-start" value="${v.start_date||''}" /></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" id="g-due" value="${v.due_date||''}" /></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Value</label><input type="number" id="g-sv" value="${v.start_value||''}" /></div>
      <div class="form-group"><label class="form-label">Current Value</label><input type="number" id="g-cv" value="${v.current_value||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Target Value</label>
      <input type="number" id="g-target" value="${v.target||''}" /></div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Goal' : 'New Goal', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('g-title').value.trim(),
      description: document.getElementById('g-desc').value,
      type: document.getElementById('g-type').value,
      year: document.getElementById('g-year').value,
      status: document.getElementById('g-status').value,
      category_id: document.getElementById('g-category').value ? parseInt(document.getElementById('g-category').value) : null,
      start_date: document.getElementById('g-start').value || null,
      due_date: document.getElementById('g-due').value || null,
      start_value: parseFloat(document.getElementById('g-sv').value) || 0,
      current_value: parseFloat(document.getElementById('g-cv').value) || 0,
      target: parseFloat(document.getElementById('g-target').value) || 0,
    };
    if (!data.title) { alert('Title is required'); return; }
    if (v.id) await api('PATCH', `/api/goals/${v.id}`, data);
    else await api('POST', '/api/goals', data);
    closeModal();
    renderGoals();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this goal?')) return;
      await api('DELETE', `/api/goals/${v.id}`);
      closeModal();
      renderGoals();
    };
  }
}

/* ─── Project Modal ──────────────────────────────────────────────────── */
function showProjectModal(project, goals) {
  const v = project || {};
  const goalOpts = '<option value="">— none —</option>' + (goals||[]).map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const statusOpts = ['active','on_hold','completed','archived'].map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const macroOpts = '<option value="">— none —</option>' + MACRO_AREAS.map(m =>
    `<option value="${m}" ${v.macro_area===m?'selected':''}>${m}</option>`).join('');
  const kanbanOpts = '<option value="">— none —</option>' + KANBAN_COLS.map(k =>
    `<option value="${k}" ${v.kanban_col===k?'selected':''}>${k}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="p-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="p-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="p-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Status</label><select id="p-status">${statusOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Macro Area</label><select id="p-macro">${macroOpts}</select></div>
      <div class="form-group"><label class="form-label">Kanban Column</label><select id="p-kanban">${kanbanOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="p-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label" style="margin-top:20px;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="p-archived" ${v.archived?'checked':''} style="width:auto" /> Archived
      </label></div>
    </div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Project' : 'New Project', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('p-title').value.trim(),
      description: document.getElementById('p-desc').value,
      goal_id: document.getElementById('p-goal').value ? parseInt(document.getElementById('p-goal').value) : null,
      status: document.getElementById('p-status').value,
      macro_area: document.getElementById('p-macro').value || null,
      kanban_col: document.getElementById('p-kanban').value || null,
      category_id: document.getElementById('p-category').value ? parseInt(document.getElementById('p-category').value) : null,
      archived: document.getElementById('p-archived').checked,
    };
    if (!data.title) { alert('Title is required'); return; }
    if (v.id) await api('PATCH', `/api/projects/${v.id}`, data);
    else await api('POST', '/api/projects', data);
    closeModal();
    renderProjects();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this project?')) return;
      await api('DELETE', `/api/projects/${v.id}`);
      closeModal();
      renderProjects();
    };
  }
}

/* ─── Note Modal ─────────────────────────────────────────────────────── */
async function showNoteModal(note) {
  const v = note || {};
  let projects = [], tasks = [], goals = [];
  try { [projects, tasks, goals] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/tasks'), api('GET', '/api/goals')
  ]); } catch(e) {}

  const catOpts = categoryOptions(v.category_id, true);
  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id)===String(v.project_id)?'selected':''}>${p.title}</option>`).join('');
  const taskOpts = '<option value="">— none —</option>' + tasks.map(t =>
    `<option value="${t.id}" ${String(t.id)===String(v.task_id)?'selected':''}>${t.title}</option>`).join('');

  const body = `
    <div class="form-group"><label class="form-label">Title</label>
      <input type="text" id="n-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Body</label>
      <textarea id="n-body" style="min-height:160px">${v.body||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="n-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label">Note Date</label><input type="date" id="n-date" value="${v.note_date||''}" /></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="n-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Project</label><select id="n-project">${projOpts}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Task</label><select id="n-task">${taskOpts}</select></div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Note' : 'New Note', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('n-title').value.trim(),
      body: document.getElementById('n-body').value,
      category_id: document.getElementById('n-category').value ? parseInt(document.getElementById('n-category').value) : null,
      note_date: document.getElementById('n-date').value || null,
      goal_id: document.getElementById('n-goal').value ? parseInt(document.getElementById('n-goal').value) : null,
      project_id: document.getElementById('n-project').value ? parseInt(document.getElementById('n-project').value) : null,
      task_id: document.getElementById('n-task').value ? parseInt(document.getElementById('n-task').value) : null,
    };
    if (v.id) await api('PATCH', `/api/notes/${v.id}`, data);
    else await api('POST', '/api/notes', data);
    closeModal();
    renderNotes();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this note?')) return;
      await api('DELETE', `/api/notes/${v.id}`);
      closeModal();
      renderNotes();
    };
  }
}

/* ─── Sprint Modal ───────────────────────────────────────────────────── */
function showSprintModal(projects) {
  const projOpts = '<option value="">— none —</option>' + (projects||[]).map(p =>
    `<option value="${p.id}">${p.title}</option>`).join('');

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="sp-title" placeholder="Sprint name" /></div>
    <div class="form-group"><label class="form-label">Project</label>
      <select id="sp-project">${projOpts}</select></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="sp-start" /></div>
      <div class="form-group"><label class="form-label">End Date</label><input type="date" id="sp-end" /></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Create</button>
    </div>`;

  openModal('New Sprint', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('sp-title').value.trim(),
      project_id: document.getElementById('sp-project').value ? parseInt(document.getElementById('sp-project').value) : null,
      start_date: document.getElementById('sp-start').value || null,
      end_date: document.getElementById('sp-end').value || null,
      status: 'planned',
    };
    if (!data.title) { alert('Title is required'); return; }
    await api('POST', '/api/sprints', data);
    closeModal();
    renderSprints();
  };
}

/* ─── Resource Modal ─────────────────────────────────────────────────── */
async function showResourceModal(resource) {
  const v = resource || {};
  let projects = [], tasks = [], notes = [];
  try { [projects, tasks, notes] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/tasks'), api('GET', '/api/notes')
  ]); } catch(e) {}

  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id)===String(v.project_id)?'selected':''}>${p.title}</option>`).join('');
  const taskOpts = '<option value="">— none —</option>' + tasks.map(t =>
    `<option value="${t.id}" ${String(t.id)===String(v.task_id)?'selected':''}>${t.title}</option>`).join('');
  const noteOpts = '<option value="">— none —</option>' + notes.map(n =>
    `<option value="${n.id}" ${String(n.id)===String(v.note_id)?'selected':''}>${n.title||'Untitled'}</option>`).join('');

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="r-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Type</label>
      <input type="text" id="r-type" value="${v.type||''}" placeholder="e.g. link, book, tool…" /></div>
    <div class="form-group"><label class="form-label">URL</label>
      <input type="url" id="r-url" value="${v.url||''}" /></div>
    <div class="form-group"><label class="form-label">Body / Notes</label>
      <textarea id="r-body">${v.body||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Project</label><select id="r-project">${projOpts}</select></div>
      <div class="form-group"><label class="form-label">Task</label><select id="r-task">${taskOpts}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Note</label><select id="r-note">${noteOpts}</select></div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Resource' : 'New Resource', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('r-title').value.trim(),
      type: document.getElementById('r-type').value,
      url: document.getElementById('r-url').value || null,
      body: document.getElementById('r-body').value,
      project_id: document.getElementById('r-project').value ? parseInt(document.getElementById('r-project').value) : null,
      task_id: document.getElementById('r-task').value ? parseInt(document.getElementById('r-task').value) : null,
      note_id: document.getElementById('r-note').value ? parseInt(document.getElementById('r-note').value) : null,
    };
    if (!data.title) { alert('Title is required'); return; }
    if (v.id) await api('PATCH', `/api/resources/${v.id}`, data);
    else await api('POST', '/api/resources', data);
    closeModal();
    renderResources();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this resource?')) return;
      await api('DELETE', `/api/resources/${v.id}`);
      closeModal();
      renderResources();
    };
  }
}

/* ─── Category Modal ─────────────────────────────────────────────────── */
function showCategoryModal(cat) {
  const v = cat || {};
  const body = `
    <div class="form-group"><label class="form-label">Name *</label>
      <input type="text" id="c-name" value="${(v.name||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Color</label>
      ${colorSelect('c-color', v.color || 'blue')}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Category' : 'New Category', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      name: document.getElementById('c-name').value.trim(),
      color: document.getElementById('c-color').value,
    };
    if (!data.name) { alert('Name is required'); return; }
    if (v.id) await api('PATCH', `/api/categories/${v.id}`, data);
    else await api('POST', '/api/categories', data);
    closeModal();
    try { allCategories = await api('GET', '/api/categories'); } catch(e) {}
    renderCategories();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this category?')) return;
      await api('DELETE', `/api/categories/${v.id}`);
      closeModal();
      renderCategories();
    };
  }
}

/* ─── Tag Modal ──────────────────────────────────────────────────────── */
function showTagModal(tag) {
  const v = tag || {};
  const body = `
    <div class="form-group"><label class="form-label">Name *</label>
      <input type="text" id="tg-name" value="${(v.name||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Color</label>
      ${colorSelect('tg-color', v.color || 'blue')}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Tag' : 'New Tag', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      name: document.getElementById('tg-name').value.trim(),
      color: document.getElementById('tg-color').value,
    };
    if (!data.name) { alert('Name is required'); return; }
    if (v.id) await api('PATCH', `/api/tags/${v.id}`, data);
    else await api('POST', '/api/tags', data);
    closeModal();
    try { allTags = await api('GET', '/api/tags'); } catch(e) {}
    renderTags();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this tag?')) return;
      await api('DELETE', `/api/tags/${v.id}`);
      closeModal();
      renderTags();
    };
  }
}

/* ─── Theme Toggle ───────────────────────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
}

/* ─── Init ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Nav click handlers
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`[data-view="${view}"]`).forEach(l => l.classList.add('active'));
      renderView(view);
    });
  });

  // Modal close
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-backdrop').onclick = closeModal;

  // Slideover close
  document.getElementById('slideover-close').onclick = closeSlideover;

  // Theme toggles
  document.getElementById('theme-btn').onclick = toggleTheme;
  document.getElementById('mob-theme-btn').onclick = toggleTheme;

  // Mobile menu toggle
  const mobMenuBtn = document.getElementById('mob-menu-btn');
  const sidebar = document.getElementById('sidebar');
  if (mobMenuBtn && sidebar) {
    mobMenuBtn.onclick = () => sidebar.classList.toggle('open');
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !mobMenuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Load taxonomy data
  try {
    [allTags, allCategories] = await Promise.all([
      api('GET', '/api/tags'),
      api('GET', '/api/categories'),
    ]);
  } catch(e) {
    allTags = [];
    allCategories = [];
  }

  renderView('dashboard');
});
