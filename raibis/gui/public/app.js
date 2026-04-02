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
let currentParams = null;
let navHistory = []; // [{view, params, label}]
let allTags = [];
let allCategories = [];
let allTasksCache = [];
let expandedTasks = new Set();
let tasksViewMode = localStorage.getItem('tasksViewMode') || 'list';
let projectsViewMode = localStorage.getItem('projectsViewMode') || 'cards';
let goalsViewMode = localStorage.getItem('goalsViewMode') || 'cards';
let notesViewMode = localStorage.getItem('notesViewMode') || 'cards';
let resourcesViewMode = localStorage.getItem('resourcesViewMode') || 'table';
let sprintsViewMode = localStorage.getItem('sprintsViewMode') || 'cards';
let pomTimer = null;
let pomState = { running: false, seconds: 25*60, mode: 'work', taskId: null, taskTitle: '', finished: [] };
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calScope = localStorage.getItem('calScope') || 'month'; // 'month'|'week'|'3day'|'day'
let calAnchorDate = new Date(); // anchor for week/3day/day views
let globalSearchDebounce = null;

// Column visibility for table views
const TASK_TABLE_COLS = ['title','project','status','priority','due','tags'];
let taskTableCols = JSON.parse(localStorage.getItem('taskTableCols') || 'null') || [...TASK_TABLE_COLS];
const CAL_EVENT_TYPES = ['task','goal','project','sprint'];
let calEventTypes = JSON.parse(localStorage.getItem('calEventTypes') || 'null') || [...CAL_EVENT_TYPES];

/* ─── Utilities ──────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function stripDate(dateStr) {
  if (!dateStr) return '';
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const s = stripDate(dateStr);
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(stripDate(dateStr) + 'T00:00:00');
  return d < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(stripDate(dateStr) + 'T00:00:00');
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

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Parse query string like "status:todo priority:high due:before:2025-12-31 text" */
function parseQueryFilter(query) {
  const tokens = query.trim().split(/\s+/);
  const filters = {};
  const textParts = [];
  for (const tok of tokens) {
    if (!tok) continue;
    const m = tok.match(/^(\w+):(.+)$/);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].toLowerCase();
      filters[key] = val;
    } else {
      textParts.push(tok.toLowerCase());
    }
  }
  filters._text = textParts.join(' ');
  return filters;
}

function applyQueryFilter(items, query, fieldMap) {
  if (!query.trim()) return items;
  const f = parseQueryFilter(query);
  return items.filter(item => {
    for (const [key, val] of Object.entries(f)) {
      if (key === '_text') {
        if (!val) continue;
        const text = (fieldMap.text ? fieldMap.text(item) : item.title || '').toLowerCase();
        if (!text.includes(val)) return false;
        continue;
      }
      const getter = fieldMap[key];
      if (!getter) continue;
      const itemVal = String(getter(item) || '').toLowerCase();
      if (val.startsWith('before:')) {
        if (!itemVal || itemVal >= val.slice(7)) return false;
      } else if (val.startsWith('after:')) {
        if (!itemVal || itemVal <= val.slice(6)) return false;
      } else {
        if (!itemVal.includes(val)) return false;
      }
    }
    return true;
  });
}

function queryFilterHtml(placeholder) {
  return `<div class="query-filter-wrap">
    <input type="text" class="query-filter-input" placeholder="${placeholder||'Filter: status:todo priority:high …'}" autocomplete="off" />
    <div class="query-filter-hint">Fields: <code>status</code> <code>priority</code> <code>project</code> <code>goal</code> <code>tag</code> <code>due:before:DATE</code></div>
  </div>`;
}

/* Custom styled select dropdown */
function customSelectHtml(id, options, value, placeholder) {
  const opts = options.map(o => `<div class="csel-option${String(o.value)===String(value)?' selected':''}" data-value="${o.value}">${o.label}</div>`).join('');
  const selected = options.find(o => String(o.value) === String(value));
  return `<div class="csel" id="${id}" data-value="${value||''}">
    <div class="csel-trigger">
      <span class="csel-label">${selected ? selected.label : (placeholder||'Select…')}</span>
      <span class="csel-arrow">▾</span>
    </div>
    <div class="csel-dropdown">${opts}</div>
  </div>`;
}

function bindCustomSelects(container, onChange) {
  (container || document).querySelectorAll('.csel').forEach(csel => {
    const trigger = csel.querySelector('.csel-trigger');
    const dropdown = csel.querySelector('.csel-dropdown');
    trigger.onclick = (e) => {
      e.stopPropagation();
      // Close others
      document.querySelectorAll('.csel.open').forEach(c => { if (c !== csel) c.classList.remove('open'); });
      csel.classList.toggle('open');
    };
    csel.querySelectorAll('.csel-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        csel.dataset.value = val;
        csel.querySelector('.csel-label').textContent = opt.textContent;
        csel.querySelectorAll('.csel-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        csel.classList.remove('open');
        if (onChange) onChange(csel.id, val);
      };
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.csel.open').forEach(c => c.classList.remove('open'));
  }, { capture: false });
}

function viewToggleHtml(modes, current, storageKey) {
  const icons = { cards: '⊟', table: '⊞', list: '≡', dashboard: '▦', calendar: '◫' };
  return `<div class="view-toggle">${modes.map(m =>
    `<button class="view-toggle-btn ${current===m.key?'active':''}" data-mode="${m.key}" title="${m.label}">${icons[m.key] || m.label}</button>`
  ).join('')}</div>`;
}

function bindViewToggle(modes, getCurrent, onSwitch) {
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.onclick = () => {
      onSwitch(btn.dataset.mode);
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
}

function tagFilterRowHtml() {
  if (!allTags.length) return '';
  const chips = allTags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    return `<span class="tag-chip tag-filter-chip" data-tag-id="${t.id}" style="color:${hex}">${t.name}</span>`;
  }).join('');
  return `<div class="tag-filter-row">${chips}</div>`;
}

/* ─── Notion-style filter bar ─────────────────────────────────────── */
// filterDefs: [{key, label, options:[{value,label}], multi:bool}]
// sortDefs: [{key, label}]
// state: { filters:{key:Set|value}, sort:{key, dir:'asc'|'desc'} }
function notionFilterBar(containerId, filterDefs, sortDefs, state, onChange) {
  function chipHtml() {
    let chips = '';
    for (const fd of filterDefs) {
      const active = state.filters[fd.key];
      if (fd.multi) {
        if (active && active.size > 0) {
          const vals = [...active].map(v => {
            const opt = fd.options.find(o => String(o.value) === String(v));
            return opt ? opt.label : v;
          }).join(', ');
          chips += `<span class="filter-chip" data-filter-key="${fd.key}">
            <span class="filter-chip-label">${fd.label}:</span>
            <span class="filter-chip-value">${vals}</span>
            <span class="filter-chip-remove" data-remove-filter="${fd.key}" title="Remove filter">×</span>
          </span>`;
        }
      } else {
        if (active) {
          const opt = fd.options.find(o => String(o.value) === String(active));
          const val = opt ? opt.label : active;
          chips += `<span class="filter-chip" data-filter-key="${fd.key}">
            <span class="filter-chip-label">${fd.label}:</span>
            <span class="filter-chip-value">${val}</span>
            <span class="filter-chip-remove" data-remove-filter="${fd.key}" title="Remove filter">×</span>
          </span>`;
        }
      }
    }
    return chips;
  }

  function sortChipHtml() {
    const { key, dir } = state.sort || {};
    if (!key) return '';
    const sd = sortDefs.find(s => s.key === key);
    if (!sd) return '';
    const arrow = dir === 'desc' ? '↓' : '↑';
    return `<span class="filter-chip" data-sort-chip>
      <span class="filter-chip-label">Sort:</span>
      <span class="filter-chip-value">${sd.label} ${arrow}</span>
      <span class="filter-chip-remove" data-remove-sort title="Remove sort">×</span>
    </span>`;
  }

  const barHtml = `<div class="notion-filter-bar" id="${containerId}-filter-bar">
    <div class="filter-bar-wrap" style="position:relative">
      <button class="filter-sort-btn${(state.sort && state.sort.key) ? ' active' : ''}" id="${containerId}-sort-btn">↑↓ Sort</button>
      <div class="sort-dropdown hidden" id="${containerId}-sort-dropdown">
        ${sortDefs.map(sd => {
          const isActive = state.sort && state.sort.key === sd.key;
          const dir = isActive ? state.sort.dir : null;
          return `<div class="sort-dropdown-row" data-sort-key="${sd.key}">
            <span>${sd.label}</span>
            <span style="display:flex;gap:4px">
              <button class="sort-asc-btn${dir==='asc'?' active':''}" data-sort-key="${sd.key}" data-sort-dir="asc">↑</button>
              <button class="sort-desc-btn${dir==='desc'?' active':''}" data-sort-key="${sd.key}" data-sort-dir="desc">↓</button>
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="filter-bar-wrap" style="position:relative">
      <button class="filter-add-btn" id="${containerId}-filter-add-btn">+ Filter</button>
      <div class="filter-dropdown hidden" id="${containerId}-filter-dropdown">
        ${filterDefs.map(fd => `
          <div class="filter-dropdown-section">
            <span class="filter-dropdown-label">${fd.label}</span>
            ${fd.options.map(opt => {
              const checked = fd.multi
                ? (state.filters[fd.key] && state.filters[fd.key].has(String(opt.value)))
                : String(state.filters[fd.key]) === String(opt.value);
              return `<div class="filter-dropdown-opt">
                <input type="checkbox" data-filter-key="${fd.key}" data-filter-val="${opt.value}" data-filter-multi="${fd.multi?'1':'0'}" ${checked?'checked':''} />
                <span>${opt.label}</span>
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </div>
    <span class="filter-chip-separator" style="flex:0"></span>
    ${chipHtml()}
    ${sortChipHtml()}
    <input type="text" id="${containerId}-search" placeholder="Search…" style="flex:1;min-width:140px;max-width:280px;font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:var(--text)" autocomplete="off" value="${state.searchText||''}" />
  </div>`;

  const container = document.getElementById(containerId);
  if (container) {
    container.insertAdjacentHTML('afterbegin', barHtml);
  }

  function refreshChips() {
    const bar = document.getElementById(`${containerId}-filter-bar`);
    if (!bar) return;
    // Remove old chips (between separator and search input)
    bar.querySelectorAll('.filter-chip').forEach(c => c.remove());
    // Insert new chips before the search input
    const search = document.getElementById(`${containerId}-search`);
    const newChips = chipHtml() + sortChipHtml();
    if (newChips && search) {
      search.insertAdjacentHTML('beforebegin', newChips);
    }
    // Re-bind remove buttons
    bar.querySelectorAll('[data-remove-filter]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); delete state.filters[el.dataset.removeFilter]; refreshChips(); onChange(); };
    });
    bar.querySelectorAll('[data-remove-sort]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); state.sort = {}; refreshChips(); onChange(); };
    });
    // Update sort button active state
    const sortBtn2 = document.getElementById(`${containerId}-sort-btn`);
    if (sortBtn2) sortBtn2.classList.toggle('active', !!(state.sort && state.sort.key));
  }

  // Bind sort button
  const sortBtn = document.getElementById(`${containerId}-sort-btn`);
  const sortDrop = document.getElementById(`${containerId}-sort-dropdown`);
  if (sortBtn && sortDrop) {
    sortBtn.onclick = (e) => { e.stopPropagation(); sortDrop.classList.toggle('hidden'); document.getElementById(`${containerId}-filter-dropdown`)?.classList.add('hidden'); };
    sortDrop.querySelectorAll('[data-sort-dir]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        state.sort = { key: btn.dataset.sortKey, dir: btn.dataset.sortDir };
        sortDrop.classList.add('hidden');
        refreshChips();
        onChange();
      };
    });
  }

  // Bind filter add button
  const filterAddBtn = document.getElementById(`${containerId}-filter-add-btn`);
  const filterDrop = document.getElementById(`${containerId}-filter-dropdown`);
  if (filterAddBtn && filterDrop) {
    filterAddBtn.onclick = (e) => { e.stopPropagation(); filterDrop.classList.toggle('hidden'); sortDrop?.classList.add('hidden'); };
    filterDrop.querySelectorAll('input[data-filter-key]').forEach(chk => {
      chk.onchange = (e) => {
        e.stopPropagation();
        const key = chk.dataset.filterKey;
        const val = chk.dataset.filterVal;
        const isMulti = chk.dataset.filterMulti === '1';
        if (isMulti) {
          if (!state.filters[key]) state.filters[key] = new Set();
          if (chk.checked) state.filters[key].add(val);
          else state.filters[key].delete(val);
          if (state.filters[key].size === 0) delete state.filters[key];
        } else {
          if (chk.checked) state.filters[key] = val;
          else delete state.filters[key];
        }
        refreshChips();
        onChange();
      };
    });
  }

  // Bind remove chip buttons (initial)
  const bar = document.getElementById(`${containerId}-filter-bar`);
  if (bar) {
    bar.querySelectorAll('[data-remove-filter]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); delete state.filters[el.dataset.removeFilter]; refreshChips(); onChange(); };
    });
    bar.querySelectorAll('[data-remove-sort]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); state.sort = {}; refreshChips(); onChange(); };
    });
    const search = document.getElementById(`${containerId}-search`);
    if (search) {
      search.oninput = () => { state.searchText = search.value; onChange(); };
    }
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    sortDrop?.classList.add('hidden');
    filterDrop?.classList.add('hidden');
  }, { capture: false });
}

function applySortFilter(list, state, fieldMap) {
  let result = [...list];
  // Apply filters
  for (const [key, val] of Object.entries(state.filters || {})) {
    const getter = fieldMap[key];
    if (!getter) continue;
    if (val instanceof Set) {
      if (val.size > 0) result = result.filter(item => val.has(String(getter(item) || '')));
    } else if (val) {
      result = result.filter(item => String(getter(item) || '').toLowerCase().includes(String(val).toLowerCase()));
    }
  }
  // Apply search text
  if (state.searchText && state.searchText.trim()) {
    const q = state.searchText.toLowerCase();
    const textGetter = fieldMap._text || (item => item.title || '');
    result = result.filter(item => String(textGetter(item) || '').toLowerCase().includes(q));
  }
  // Apply sort
  const { key, dir } = state.sort || {};
  if (key && fieldMap[key]) {
    result.sort((a, b) => {
      const av = String(fieldMap[key](a) || '');
      const bv = String(fieldMap[key](b) || '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return result;
}

function tagPickerHtml(selectedIds) {
  if (!allTags.length) return '<span style="font-size:12px;color:var(--text-muted)">No tags available</span>';
  return allTags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    const sel = (selectedIds || []).includes(t.id) ? 'selected' : '';
    return `<span class="tag-chip ${sel}" data-tag-id="${t.id}" style="color:${hex}">${t.name}</span>`;
  }).join('');
}

function bindTagPicker() {
  document.querySelectorAll('.modal-body .tag-chip, #form-slideover-body .tag-chip').forEach(chip => {
    chip.onclick = () => chip.classList.toggle('selected');
  });
}

function getSelectedTagIds() {
  return [...document.querySelectorAll('.modal-body .tag-chip.selected, #form-slideover-body .tag-chip.selected')].map(c => parseInt(c.dataset.tagId));
}

function taskRowHtml(task, showProject, indent) {
  const done = task.status === 'done';
  const titleCls = done ? 'task-title-text done' : 'task-title-text';
  const projBadge = showProject && task.project_title
    ? `<span class="task-project">${task.project_title}</span>` : '';
  const dueBadge = dueBadgeHtml(task.due_date);
  const hasChildren = (task.sub_task_count || task.subtask_count || 0) > 0;
  const isExpanded = expandedTasks.has(String(task.id));
  const toggleArrow = hasChildren
    ? `<span class="task-toggle-arrow ${isExpanded ? 'expanded' : ''}" data-toggle-id="${task.id}" title="Toggle subtasks">▶</span>`
    : `<span class="task-add-sub-btn" data-add-sub-id="${task.id}" title="Add subtask">▶</span>`;
  const tagChips = (task.tags || []).slice(0, 2).map(t => tagHtml(t)).join('');
  const recurBadge = task.recur_interval > 0 ? `<span class="task-recur-badge" title="Repeats every ${task.recur_interval} ${task.recur_unit||'days'}">↺</span>` : '';
  const indentStyle = indent ? `padding-left:${indent * 24 + 12}px` : '';

  // Category color dot
  let catColor = '';
  if (task.category_id) {
    const cat = allCategories.find(c => c.id === task.category_id);
    catColor = cat ? (COLOR_HEX[cat.color] || cat.color || '') : '';
  }
  const catDot = catColor ? `<span class="cat-dot" style="background:${catColor}" title="${task.category||''}"></span>` : '';

  return `<li class="task-row ${indent ? 'task-row-sub' : ''}" data-task-id="${task.id}" style="${indentStyle}">
    ${toggleArrow}
    <div class="task-check ${done ? 'done' : ''}" data-check-id="${task.id}">${done ? '✓' : ''}</div>
    ${catDot}
    <div class="task-content">
      <div class="${titleCls}">${task.title} ${recurBadge}</div>
      <div class="task-meta-row">${projBadge}${dueBadge}${tagChips}</div>
    </div>
    <span class="task-row-due-right">${task.due_date ? fmtDate(task.due_date) : ''}</span>
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
  if (!document.getElementById('slideover').classList.contains('open') &&
      !document.getElementById('form-slideover').classList.contains('open')) {
    document.getElementById('modal-backdrop').classList.remove('open');
  }
}

/* ─── Slideover ──────────────────────────────────────────────────────── */
function openSlideover(title, bodyHTML) {
  document.getElementById('slideover-title').textContent = title;
  document.getElementById('slideover-body').innerHTML = bodyHTML;
  document.getElementById('slideover').classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
}

function closeSlideover() {
  document.getElementById('slideover').classList.remove('open');
  // Only remove backdrop if form-slideover is also closed
  if (!document.getElementById('form-slideover').classList.contains('open')) {
    document.getElementById('modal-backdrop').classList.remove('open');
  }
}

/* ─── Form Slideover (for create/edit forms) ─────────────────────────── */
function openFormSlideover(title, bodyHTML) {
  document.getElementById('form-slideover-title').textContent = title;
  document.getElementById('form-slideover-body').innerHTML = bodyHTML;
  document.getElementById('form-slideover').classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
}

function closeFormSlideover() {
  document.getElementById('form-slideover').classList.remove('open');
  // Only remove backdrop if task slideover is also closed
  if (!document.getElementById('slideover').classList.contains('open') &&
      !document.getElementById('modal').classList.contains('open')) {
    document.getElementById('modal-backdrop').classList.remove('open');
  }
}

/* ─── View Dispatcher ────────────────────────────────────────────────── */
const VIEW_LABELS = {
  dashboard: 'Dashboard', tasks: 'Tasks', projects: 'Projects', goals: 'Goals',
  notes: 'Notes', resources: 'Resources', sprints: 'Sprints', calendar: 'Calendar',
  pomodoro: 'Pomodoro', categories: 'Categories', tags: 'Tags',
};

function updateBreadcrumb(view, params, detailLabel) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;

  // Build crumb list
  const crumbs = [];

  // Top-level detail views get a parent crumb
  const parentMap = { 'project-detail': 'projects', 'goal-detail': 'goals', 'sprint-detail': 'sprints' };
  if (parentMap[view]) {
    crumbs.push({ label: VIEW_LABELS[parentMap[view]], view: parentMap[view] });
  } else if (view !== 'dashboard') {
    // Add Dashboard as root only if not already dashboard
  }

  const label = detailLabel || VIEW_LABELS[view] || view;
  crumbs.push({ label, view, params, current: true });

  if (crumbs.length <= 1 && view === 'dashboard') {
    bc.innerHTML = '';
    return;
  }

  bc.innerHTML = crumbs.map((c, i) => {
    const sep = i > 0 ? `<span class="bc-sep">›</span>` : '';
    if (c.current) return `${sep}<span class="bc-item"><span>${c.label}</span></span>`;
    return `${sep}<span class="bc-item"><a class="bc-link" data-bc-view="${c.view}" ${c.params ? `data-bc-params="${c.params}"` : ''}>${c.label}</a></span>`;
  }).join('');

  bc.querySelectorAll('.bc-link').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); renderView(a.dataset.bcView, a.dataset.bcParams); };
  });
}

function renderView(view, params) {
  currentView = view;
  currentParams = params || null;
  closeSlideover();

  // Sync sidebar active state: detail views highlight their parent nav item
  const sidebarView = { 'project-detail': 'projects', 'goal-detail': 'goals' }[view] || view;
  document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`[data-view="${sidebarView}"]`).forEach(l => l.classList.add('active'));

  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="view"><div class="loading">Loading…</div></div>`;
  updateBreadcrumb(view, params);
  switch (view) {
    case 'dashboard':       renderDashboard(); break;
    case 'tasks':           renderTasks(); break;
    case 'projects':        renderProjects(); break;
    case 'project-detail':  renderProjectDetail(params); break;
    case 'goals':           renderGoals(); break;
    case 'goal-detail':     renderGoalDetail(params); break;
    case 'notes':           renderNotes(); break;
    case 'sprints':         renderSprints(); break;
    case 'sprint-detail':  renderSprintDetail(params); break;
    case 'resources':       renderResources(); break;
    case 'categories':      renderCategories(); break;
    case 'tags':            renderTags(); break;
    case 'pomodoro':        renderPomodoro(); break;
    case 'calendar':        renderCalendarView(); break;
    default:
      main.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-icon">?</div><div class="empty-state-text">Unknown view</div></div></div>`;
  }
}

/* ─── Dashboard ──────────────────────────────────────────────────────── */
let dashboardMode = localStorage.getItem('dashboardMode') || 'tables';

async function renderDashboard() {
  let data = {}, goals = [], notes = [], resources = [], allTasks = [];
  let apiError = null;
  try {
    [data, goals, notes, resources, allTasks] = await Promise.all([
      api('GET', '/api/dashboard'),
      api('GET', '/api/goals'),
      api('GET', '/api/notes'),
      api('GET', '/api/resources'),
      api('GET', '/api/tasks'),
    ]);
  } catch(e) { data = {}; apiError = e.message || String(e); }
  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server at <b>localhost:3344</b>. Start the Go server:
        <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px">cd raibis-go && go run ./cmd/server/main.go</code>
        <br><small style="color:var(--text-muted)">${apiError}</small>
      </div>
    </div>`;
    return;
  }

  const goalsCount = data.goals_count || 0;
  const projectsCount = data.projects_count || 0;
  const inProgressCount = data.in_progress || 0;
  const overdueCount = data.overdue || 0;
  const sprint = data.active_sprint || null;
  const projects = data.active_projects || [];
  const todayTasks = data.today_tasks || [];
  const urgentTasks = data.urgent_tasks || [];
  // Active tasks = all non-done tasks for the "All Tasks" section
  const activeTasks = (allTasks || []).filter(t => t.status !== 'done' && !t.parent_task_id);

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

  // Goals section
  const goalsSection = goals.length > 0 ? `
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Goals (${goals.length})</span>
          <button class="btn btn-sm btn-ghost" onclick="renderView('goals')">View all →</button>
        </div>
        <div class="notion-table-wrap"><table class="notion-table">
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>${goals.slice(0,5).map(g => `<tr style="cursor:pointer" onclick="renderView('goal-detail','${g.id}')">
            <td>${g.title}</td><td>${g.type||'—'}</td><td>${statusBadge(g.status)}</td>
            <td style="font-size:11px;color:var(--text-muted)">${fmtDate(g.due_date)||'—'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${goals.length > 5 ? `<div style="padding:8px 0;text-align:center"><button class="btn btn-sm btn-ghost dash-show-more" data-type="goals">Show ${goals.length-5} more…</button></div>` : ''}
      </div>
    </div>` : '';

  // Notes section
  const notesSection = notes.length > 0 ? `
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Recent Notes (${notes.length})</span>
          <button class="btn btn-sm btn-ghost" onclick="renderView('notes')">View all →</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">${notes.slice(0,4).map(n => `
          <div class="note-card" style="flex:1;min-width:180px;max-width:260px">
            <div class="note-title">${n.title || 'Untitled'}</div>
            <div class="note-body-preview">${(n.body||'').slice(0,80)}${n.body&&n.body.length>80?'…':''}</div>
          </div>`).join('')}</div>
        ${notes.length > 4 ? `<div style="padding:8px 0;text-align:center"><button class="btn btn-sm btn-ghost" onclick="renderView('notes')">Show more notes →</button></div>` : ''}
      </div>
    </div>` : '';

  // Stats mode bars
  const taskStatusCounts = {};
  TASK_STATUSES.forEach(s => taskStatusCounts[s] = 0);
  todayTasks.concat(urgentTasks).forEach(t => { if (taskStatusCounts[t.status]!==undefined) taskStatusCounts[t.status]++; });
  const maxCount = Math.max(...Object.values(taskStatusCounts), 1);
  const statsSection = `
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Tasks by Status</span></div>
        ${TASK_STATUSES.map(s => {
          const c = taskStatusCounts[s];
          const pct = Math.round((c / maxCount) * 100);
          return `<div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>${s.replace('_',' ')}</span><span>${c}</span></div>
            <div style="height:6px;background:var(--border);border-radius:3px"><div style="height:100%;background:var(--accent);border-radius:3px;width:${pct}%"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Goal Progress</span></div>
        ${goals.slice(0,6).map(g => {
          const pct = g.progress?.pct || 0;
          return `<div style="margin-bottom:8px;cursor:pointer" onclick="renderView('goal-detail','${g.id}')">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>${g.title.slice(0,30)}</span><span>${pct}%</span></div>
            <div style="height:5px;background:var(--border);border-radius:3px"><div style="height:100%;background:var(--success);border-radius:3px;width:${pct}%"></div></div>
          </div>`;
        }).join('') || '<div class="empty-state" style="padding:16px"><div class="empty-state-text">No goals</div></div>'}
      </div>
    </div>`;

  const tablesContent = `
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
          <span class="widget-title">All Tasks</span>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="dash-task-status-filter" style="font-size:11px;padding:2px 6px">
              <option value="">All statuses</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
            </select>
            <button class="btn btn-sm btn-ghost widget-action" id="dash-add-task">+ Add Task</button>
          </div>
        </div>
        <ul class="task-list" id="dash-all-tasks-list">${activeTasks.map(t => taskRowHtml(t, true)).join('') || '<li style="padding:12px;color:var(--text-muted);font-size:13px">No open tasks</li>'}</ul>
      </div>
    </div>
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Today's Tasks</span>
        </div>
        <ul class="task-list">${todayRows}</ul>
      </div>
    </div>
    ${urgentSection}
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Daily Notes</span>
          <span style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace" id="daily-note-date"></span>
        </div>
        <textarea id="daily-note-input" placeholder="Write your thoughts for today… (auto-saved as a note at end of day)" style="width:100%;min-height:80px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:13px;padding:10px 12px;resize:vertical;font-family:'DM Sans',sans-serif;box-sizing:border-box">${localStorage.getItem('daily_note_draft')||''}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-sm btn-primary" id="daily-note-save-btn">Save as Note</button>
          <button class="btn btn-sm btn-ghost" id="daily-note-clear-btn">Clear</button>
        </div>
      </div>
    </div>
    ${goalsSection}
    ${notesSection}`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Command Center</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="text" id="dash-global-search" placeholder="Filter tasks…" style="width:200px" />
        <div class="view-toggle">
          <button class="view-toggle-btn ${dashboardMode==='tables'?'active':''}" data-dash-mode="tables" title="Tables">⊞</button>
          <button class="view-toggle-btn ${dashboardMode==='stats'?'active':''}" data-dash-mode="stats" title="Stats">◉</button>
        </div>
        <button class="btn btn-primary" id="dash-quick-task">+ Quick Task</button>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${goalsCount}</div><div class="stat-label">Goals</div></div>
      <div class="stat-card"><div class="stat-value">${projectsCount}</div><div class="stat-label">Projects</div></div>
      <div class="stat-card"><div class="stat-value">${inProgressCount}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${overdueCount}</div><div class="stat-label">Overdue</div></div>
    </div>
    <div id="dash-content">${dashboardMode === 'stats' ? statsSection : tablesContent}</div>
  </div>`;

  document.getElementById('dash-quick-task').onclick = () => showNewTaskModal({});
  const dashAddTaskBtn = document.getElementById('dash-add-task');
  if (dashAddTaskBtn) dashAddTaskBtn.onclick = () => showNewTaskModal({});
  document.getElementById('dash-global-search').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.task-row').forEach(row => {
      const title = row.querySelector('.task-title-text')?.textContent?.toLowerCase() || '';
      row.style.display = (!q || title.includes(q)) ? '' : 'none';
    });
  };
  document.querySelectorAll('[data-dash-mode]').forEach(btn => {
    btn.onclick = () => {
      dashboardMode = btn.dataset.dashMode;
      localStorage.setItem('dashboardMode', dashboardMode);
      renderDashboard();
    };
  });
  bindTaskListEvents();
  document.querySelectorAll('.proj-row').forEach(el => {
    el.onclick = () => renderView('project-detail', el.dataset.projId);
  });

  // All Tasks status filter
  const taskStatusFilter = document.getElementById('dash-task-status-filter');
  if (taskStatusFilter) {
    taskStatusFilter.onchange = () => {
      const status = taskStatusFilter.value;
      const list = document.getElementById('dash-all-tasks-list');
      if (!list) return;
      const filtered = status ? activeTasks.filter(t => t.status === status) : activeTasks;
      list.innerHTML = filtered.map(t => taskRowHtml(t, true)).join('') || '<li style="padding:12px;color:var(--text-muted);font-size:13px">No tasks</li>';
      bindTaskListEvents();
    };
  }

  // Daily notes widget
  const dailyNoteDateEl = document.getElementById('daily-note-date');
  if (dailyNoteDateEl) {
    const today = new Date();
    dailyNoteDateEl.textContent = today.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  }
  const dailyInput = document.getElementById('daily-note-input');
  if (dailyInput) {
    dailyInput.oninput = () => localStorage.setItem('daily_note_draft', dailyInput.value);
    document.getElementById('daily-note-save-btn').onclick = async () => {
      const text = dailyInput.value.trim();
      if (!text) { alert('Write something first'); return; }
      const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
      await api('POST', '/api/notes', { title: `Daily Note — ${dateStr}`, body: text });
      localStorage.removeItem('daily_note_draft');
      dailyInput.value = '';
      alert('Note saved!');
      renderDashboard();
    };
    document.getElementById('daily-note-clear-btn').onclick = () => {
      dailyInput.value = '';
      localStorage.removeItem('daily_note_draft');
    };
  }
}

/* ─── Tasks View ─────────────────────────────────────────────────────── */
async function renderTasks() {
  let tasks = [], projects = [], allTasksFull = [];
  let apiError = null;
  try {
    [tasks, projects, allTasksFull] = await Promise.all([
      api('GET', '/api/tasks'),
      api('GET', '/api/projects'),
      api('GET', '/api/tasks?all=1'),
    ]);
    allTasksCache = allTasksFull;
  } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const topLevel = tasks; // already top-level-only from server default

  const taskFilterState = { filters: {}, sort: {}, searchText: '' };

  const viewToggle = `<div class="view-toggle">
    <button class="view-toggle-btn ${tasksViewMode==='list'?'active':''}" data-mode="list" title="List">≡</button>
    <button class="view-toggle-btn ${tasksViewMode==='table'?'active':''}" data-mode="table" title="Table">⊞</button>
    <button class="view-toggle-btn ${tasksViewMode==='dashboard'?'active':''}" data-mode="dashboard" title="Dashboard">▦</button>
  </div>`;

  const colPickerHtml = `<div class="col-picker-wrap" style="position:relative">
    <button class="btn btn-sm btn-ghost" id="col-picker-btn" title="Show/hide columns">⊟ Columns</button>
    <div class="col-picker-dropdown hidden" id="col-picker-dropdown">
      ${TASK_TABLE_COLS.map(col => `<label class="col-picker-item"><input type="checkbox" class="col-picker-check" data-col="${col}" ${taskTableCols.includes(col)?'checked':''}> ${col}</label>`).join('')}
    </div>
  </div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Tasks</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${viewToggle}
        ${colPickerHtml}
        <button class="btn btn-primary" id="new-task-btn">+ New Task</button>
      </div>
    </div>
    <div id="tasks-content"></div>
  </div>`;

  document.getElementById('new-task-btn').onclick = () => showNewTaskModal({});

  // Column picker
  const colPickerBtn = document.getElementById('col-picker-btn');
  const colPickerDrop = document.getElementById('col-picker-dropdown');
  if (colPickerBtn) {
    colPickerBtn.onclick = (e) => { e.stopPropagation(); colPickerDrop.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => {
      if (!colPickerBtn.contains(e.target)) colPickerDrop.classList.add('hidden');
    }, { once: false, capture: false });
    document.querySelectorAll('.col-picker-check').forEach(chk => {
      chk.onchange = () => {
        taskTableCols = [...document.querySelectorAll('.col-picker-check:checked')].map(c => c.dataset.col);
        if (!taskTableCols.length) taskTableCols = ['title']; // always keep title
        localStorage.setItem('taskTableCols', JSON.stringify(taskTableCols));
        render();
      };
    });
  }

  // View toggle
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.onclick = () => {
      tasksViewMode = btn.dataset.mode;
      localStorage.setItem('tasksViewMode', tasksViewMode);
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    };
  });

  function getFiltered() {
    return applySortFilter(topLevel, taskFilterState, {
      status: t => t.status,
      priority: t => t.priority,
      project: t => String(t.project_id || ''),
      _text: t => t.title + ' ' + (t.description || '') + ' ' + (t.project_title || ''),
      title: t => t.title,
      due: t => t.due_date || '',
    });
  }

  function buildTaskTreeRows(tasks, allTasks, depth, showProject) {
    let html = '';
    for (const t of tasks) {
      html += taskRowHtml(t, showProject && depth === 0, depth);
      const isExpanded = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExpanded && children.length > 0) {
        html += buildTaskTreeRows(children, allTasks, depth + 1, false);
        // Show add subtask button only when expanded, at end of subtask list
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px;opacity:0.6">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  function buildListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;
    return '<ul class="task-list">' + buildTaskTreeRows(list, allTasksFull, 0, true) + '</ul>';
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;

    const cols = taskTableCols.length ? taskTableCols : TASK_TABLE_COLS;
    const colDef = {
      title:    { header: 'Title',    cell: (t, depth, toggleBtn) => `<td style="${depth>0?`padding-left:${depth*20}px`:''}>${toggleBtn}<span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-task-id="${t.id}">${t.title}${t.recur_interval>0?` <span class="task-recur-badge">↺</span>`:''}</span></td>` },
      project:  { header: 'Project',  cell: (t) => `<td>${t.project_title ? `<span class="badge badge-todo">${t.project_title}</span>` : '—'}</td>` },
      status:   { header: 'Status',   cell: (t) => { const sopts = TASK_STATUSES.map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join(''); return `<td><select class="inline-status-select" data-task-id="${t.id}" style="font-size:11px;padding:2px 6px;border-radius:3px">${sopts}</select></td>`; } },
      priority: { header: 'Priority', cell: (t) => `<td>${priorityBadge(t.priority)}</td>` },
      due:      { header: 'Due',      cell: (t) => `<td class="${isOverdue(t.due_date)?'task-due overdue':isToday(t.due_date)?'task-due today':''}">${fmtDate(t.due_date)||'—'}</td>` },
      tags:     { header: 'Tags',     cell: (t) => `<td>${(t.tags||[]).map(tg=>tagHtml(tg)).join('')}</td>` },
    };

    function tableRows(tasks, depth) {
      let html = '';
      tasks.forEach(t => {
        const children = allTasksFull.filter(c => c.parent_task_id && String(c.parent_task_id) === String(t.id));
        const hasChildren = children.length > 0;
        const isExpanded = expandedTasks.has(String(t.id));
        const toggleBtn = hasChildren
          ? `<span class="task-toggle-arrow ${isExpanded ? 'expanded' : ''}" data-toggle-id="${t.id}" title="Toggle subtasks">▶</span>`
          : `<span class="task-add-sub-btn" data-add-sub-id="${t.id}" title="Add subtask">▶</span>`;
        html += `<tr class="task-table-row" data-task-id="${t.id}" style="position:relative">
          ${cols.map(c => colDef[c] ? (c === 'title' ? colDef.title.cell(t, depth, toggleBtn) : colDef[c].cell(t)) : '').join('')}
          <td><button class="btn btn-sm btn-danger task-del-btn" data-task-id="${t.id}">×</button></td>
        </tr>`;
        if (isExpanded && hasChildren) {
          html += tableRows(children, depth + 1);
        }
      });
      return html;
    }

    const headers = cols.map(c => colDef[c] ? `<th>${colDef[c].header}</th>` : '').join('') + '<th></th>';
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${tableRows(list, 0)}</tbody></table></div>`;
  }

  function buildDashboardView(list) {
    const total = list.length;
    const todo = list.filter(t => t.status === 'todo').length;
    const inprog = list.filter(t => t.status === 'in_progress').length;
    const done = list.filter(t => t.status === 'done').length;
    const overdue = list.filter(t => isOverdue(t.due_date) && t.status !== 'done').length;
    const byPriority = { urgent:0, high:0, medium:0, low:0 };
    list.forEach(t => { if (byPriority[t.priority] !== undefined) byPriority[t.priority]++; });
    const maxPrio = Math.max(...Object.values(byPriority), 1);
    const prioBar = (label, count, cls) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="width:60px;font-size:11px;color:var(--text-muted)">${label}</span>
      <div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden">
        <div style="width:${Math.round((count/maxPrio)*100)}%;height:100%;background:var(--accent);border-radius:5px"></div>
      </div>
      <span style="width:24px;text-align:right;font-size:11px;font-family:DM Mono,monospace">${count}</span>
    </div>`;
    return `<div class="stats-row" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-value">${todo}</div><div class="stat-label">Todo</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${inprog}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${done}</div><div class="stat-label">Done</div></div>
    </div>
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">By Priority</span></div>
        ${prioBar('Urgent', byPriority.urgent, 'danger')}
        ${prioBar('High', byPriority.high, 'high')}
        ${prioBar('Medium', byPriority.medium, 'medium')}
        ${prioBar('Low', byPriority.low, 'low')}
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Overdue</span></div>
        <div class="stat-value" style="font-size:36px;color:${overdue>0?'var(--danger)':'var(--success)'}">${overdue}</div>
        <div class="stat-label" style="margin-top:4px">${overdue > 0 ? 'tasks past due' : 'all on track'}</div>
      </div>
    </div>
    <div class="widget" style="margin-top:0">
      <div class="widget-header"><span class="widget-title">In Progress</span></div>
      <ul class="task-list">${list.filter(t=>t.status==='in_progress').map(t=>taskRowHtml(t,true)).join('')||'<li style="padding:12px;color:var(--text-muted);font-size:13px">None in progress</li>'}</ul>
    </div>`;
  }


  let filterBarInitialized = false;
  function render() {
    const filtered = getFiltered();
    let content = '';
    if (tasksViewMode === 'list') content = buildListView(filtered);
    else if (tasksViewMode === 'table') content = buildTableView(filtered);
    else if (tasksViewMode === 'dashboard') content = buildDashboardView(filtered);
    document.getElementById('tasks-content').innerHTML = content;
    // Initialize filter bar once after content container is in DOM
    if (!filterBarInitialized) {
      filterBarInitialized = true;
      const taskFilterDefs = [
        { key: 'status', label: 'Status', multi: true, options: TASK_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })) },
        { key: 'priority', label: 'Priority', multi: true, options: TASK_PRIORITIES.map(p => ({ value: p, label: p })) },
        { key: 'project', label: 'Project', multi: false, options: [{ value: '', label: 'All' }, ...projects.map(p => ({ value: String(p.id), label: p.title }))] },
      ];
      const taskSortDefs = [
        { key: 'title', label: 'Title' },
        { key: 'due', label: 'Due Date' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
      ];
      const viewEl = document.querySelector('#main-content .view');
      if (viewEl) {
        const headerEl = viewEl.querySelector('.view-header');
        const barDiv = document.createElement('div');
        barDiv.id = 'tasks-filter-bar-container';
        if (headerEl) headerEl.after(barDiv);
        notionFilterBar('tasks-filter-bar-container', taskFilterDefs, taskSortDefs, taskFilterState, render);
      }
    }
    bindTasksContentEvents();
  }

  render();

  function bindTasksContentEvents() {
    // Toggle arrows (tasks with subtasks)
    document.querySelectorAll('.task-toggle-arrow').forEach(arrow => {
      arrow.onclick = async (e) => {
        e.stopPropagation();
        const id = String(arrow.dataset.toggleId);
        if (expandedTasks.has(id)) expandedTasks.delete(id);
        else expandedTasks.add(id);
        render();
      };
    });

    // Add-subtask hover button (tasks without subtasks) → inline input row
    document.querySelectorAll('.task-add-sub-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const parentId = parseInt(btn.dataset.addSubId);
        const row = btn.closest('.task-row, .task-table-row');
        if (!row) return;
        // Toggle .open class (rotates arrow)
        const alreadyOpen = btn.classList.contains('open');
        // Remove any existing inline input rows for this parent
        document.querySelectorAll(`.inline-task-input-row[data-parent-id="${parentId}"]`).forEach(r => r.remove());
        if (alreadyOpen) {
          btn.classList.remove('open');
          return;
        }
        btn.classList.add('open');
        // Build inline input row
        const isTableRow = row.tagName === 'TR';
        if (isTableRow) {
          const colCount = row.querySelectorAll('td').length || 5;
          const inputRow = document.createElement('tr');
          inputRow.className = 'inline-task-input-row';
          inputRow.dataset.parentId = parentId;
          inputRow.innerHTML = `<td colspan="${colCount}" style="padding:6px 12px">
            <div style="display:flex;align-items:center;gap:8px">
              <input type="text" class="inline-task-title-input" placeholder="New subtask title…" style="flex:1;padding:4px 8px;font-size:13px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text)" autofocus />
              <button class="btn btn-sm btn-primary inline-task-save-btn">Add</button>
              <button class="btn btn-sm btn-ghost inline-cancel-btn">Cancel</button>
            </div>
          </td>`;
          row.after(inputRow);
          inputRow.querySelector('.inline-task-title-input').focus();
          inputRow.querySelector('.inline-cancel-btn').onclick = (e) => { e.stopPropagation(); inputRow.remove(); btn.classList.remove('open'); };
          const saveInline = async () => {
            const title = inputRow.querySelector('.inline-task-title-input').value.trim();
            if (!title) return;
            try {
              await api('POST', '/api/tasks', { title, parent_task_id: parentId, status: 'todo', priority: 'medium' });
              allTasksFull = await api('GET', '/api/tasks?all=1');
              allTasksCache = allTasksFull;
              const parent = topLevel.find(t => t.id === parentId);
              if (parent) parent.sub_task_count = (parent.sub_task_count || 0) + 1;
              expandedTasks.add(String(parentId));
              render();
            } catch(err) { alert('Error creating subtask: ' + err.message); }
          };
          inputRow.querySelector('.inline-task-save-btn').onclick = (e) => { e.stopPropagation(); saveInline(); };
          inputRow.querySelector('.inline-task-title-input').onkeydown = (e) => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') { inputRow.remove(); btn.classList.remove('open'); } };
        } else {
          // List row
          const indentStyle = row.style.paddingLeft || '12px';
          const inputRow = document.createElement('li');
          inputRow.className = 'inline-task-input-row';
          inputRow.dataset.parentId = parentId;
          inputRow.style.paddingLeft = indentStyle;
          inputRow.innerHTML = `
            <input type="text" class="inline-task-title-input" placeholder="New subtask title…" autofocus />
            <button class="btn btn-sm btn-primary inline-task-save-btn">Add</button>
            <button class="btn btn-sm btn-ghost inline-cancel-btn">Cancel</button>`;
          row.after(inputRow);
          inputRow.querySelector('.inline-task-title-input').focus();
          inputRow.querySelector('.inline-cancel-btn').onclick = (e) => { e.stopPropagation(); inputRow.remove(); btn.classList.remove('open'); };
          const saveInline = async () => {
            const title = inputRow.querySelector('.inline-task-title-input').value.trim();
            if (!title) return;
            try {
              await api('POST', '/api/tasks', { title, parent_task_id: parentId, status: 'todo', priority: 'medium' });
              allTasksFull = await api('GET', '/api/tasks?all=1');
              allTasksCache = allTasksFull;
              const parent = topLevel.find(t => t.id === parentId);
              if (parent) parent.sub_task_count = (parent.sub_task_count || 0) + 1;
              expandedTasks.add(String(parentId));
              render();
            } catch(err) { alert('Error creating subtask: ' + err.message); }
          };
          inputRow.querySelector('.inline-task-save-btn').onclick = (e) => { e.stopPropagation(); saveInline(); };
          inputRow.querySelector('.inline-task-title-input').onkeydown = (e) => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') { inputRow.remove(); btn.classList.remove('open'); } };
        }
      };
    });

    // Inline subtask add button
    document.querySelectorAll('.add-subtask-inline-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const parentId = parseInt(btn.dataset.parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
          allTasksFull = await api('GET', '/api/tasks?all=1');
          allTasksCache = allTasksFull;
          const parent = topLevel.find(t => t.id === parentId);
          if (parent) parent.sub_task_count = (parent.sub_task_count || 0) + 1;
          render();
        });
      };
    });

    // Task row click → slideover
    document.querySelectorAll('.task-row').forEach(row => {
      row.onclick = (e) => {
        if (e.target.classList.contains('task-toggle-arrow') ||
            e.target.classList.contains('task-add-sub-btn') ||
            e.target.classList.contains('task-check') ||
            e.target.dataset.checkId ||
            e.target.closest('.task-toggle-arrow, .task-add-sub-btn, .inline-subtask-input')) return;
        showTaskSlideover(row.dataset.taskId);
      };
    });

    // Title links (table view)
    document.querySelectorAll('.task-title-link').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); showTaskSlideover(el.dataset.taskId); };
    });

    // Inline status change (table view)
    document.querySelectorAll('.inline-status-select').forEach(sel => {
      sel.onchange = async (e) => {
        e.stopPropagation();
        const id = sel.dataset.taskId;
        const newStatus = sel.value;
        try { await api('PATCH', `/api/tasks/${id}`, { status: newStatus }); } catch(err) {}
        const t = topLevel.find(x => String(x.id) === String(id));
        if (t) t.status = newStatus;
        // Handle recurring
        if (newStatus === 'done' && t && t.recur_interval > 0) {
          const interval = t.recur_interval;
          const unit = (t.recur_unit || 'days').toLowerCase();
          let nextDue = null;
          if (t.due_date) {
            const d = new Date(stripDate(t.due_date) + 'T00:00:00');
            if (unit.startsWith('day')) d.setDate(d.getDate() + interval);
            else if (unit.startsWith('week')) d.setDate(d.getDate() + interval * 7);
            else if (unit.startsWith('month')) d.setMonth(d.getMonth() + interval);
            else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + interval);
            nextDue = d.toISOString().split('T')[0];
          }
          try { await api('POST', '/api/tasks', { ...t, id: undefined, status: 'todo', due_date: nextDue, pomodoros_finished: 0 }); } catch(e) {}
        }
      };
    });

    // Checkboxes
    document.querySelectorAll('.task-check').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const id = el.dataset.checkId;
        const isDone = el.classList.contains('done');
        const newStatus = isDone ? 'todo' : 'done';
        try { await api('PATCH', `/api/tasks/${id}`, { status: newStatus }); } catch(err) {}
        // Handle recurring: if marking done and task has recur_interval, create next occurrence
        if (!isDone) {
          const t = topLevel.find(x => String(x.id) === String(id)) || allTasksFull.find(x => String(x.id) === String(id));
          if (t && t.recur_interval > 0) {
            const interval = t.recur_interval;
            const unit = (t.recur_unit || 'days').toLowerCase();
            let nextDue = null;
            if (t.due_date) {
              const d = new Date(stripDate(t.due_date) + 'T00:00:00');
              if (unit.startsWith('day')) d.setDate(d.getDate() + interval);
              else if (unit.startsWith('week')) d.setDate(d.getDate() + interval * 7);
              else if (unit.startsWith('month')) d.setMonth(d.getMonth() + interval);
              else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + interval);
              nextDue = d.toISOString().split('T')[0];
            }
            try { await api('POST', '/api/tasks', { ...t, id: undefined, status: 'todo', due_date: nextDue, pomodoros_finished: 0 }); } catch(e) {}
          }
        }
        // optimistically update
        const t = topLevel.find(x => String(x.id) === String(id)) ||
                  allTasksFull.find(x => String(x.id) === String(id));
        if (t) t.status = newStatus;
        render();
      };
    });

    // Delete buttons (table view)
    document.querySelectorAll('.task-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this task?')) return;
        await api('DELETE', `/api/tasks/${el.dataset.taskId}`);
        renderTasks();
      };
    });

    // Calendar nav
    document.getElementById('cal-prev')?.addEventListener('click', () => { calMonth--; if (calMonth<0){calMonth=11;calYear--;} renderCalendarView(); });
    document.getElementById('cal-next')?.addEventListener('click', () => { calMonth++; if (calMonth>11){calMonth=0;calYear++;} renderCalendarView(); });
    document.querySelectorAll('.cal-task-chip').forEach(chip => {
      chip.onclick = (e) => { e.stopPropagation(); showTaskSlideover(chip.dataset.taskId); };
    });
  }
}

/* ─── Projects View ──────────────────────────────────────────────────── */
async function renderProjects() {
  let projects = [], goals = [];
  let apiError = null;
  try { [projects, goals] = await Promise.all([api('GET', '/api/projects'), api('GET', '/api/goals')]); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const projFilterState = { filters: {}, sort: {}, searchText: '' };

  function buildProjectCard(p) {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    const activeTasks = (p.active_tasks || []).slice(0, 3).map(t =>
      `<div style="font-size:12px;color:var(--text-muted);padding:2px 0">• ${t}</div>`
    ).join('');
    const tagChips = (p.tags || []).map(t => tagHtml(t)).join('');
    return `<div class="card detail-nav" data-proj-id="${p.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title">${p.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button>
          <button class="btn btn-sm btn-ghost proj-edit-btn" data-proj-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-danger proj-del-btn" data-proj-id="${p.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${statusBadge(p.status)}
        ${p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
        ${p.kanban_col ? `<span class="badge badge-progress">${p.kanban_col}</span>` : ''}
        ${tagChips}
      </div>
      ${p.goal_title ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Goal: ${p.goal_title}</div>` : ''}
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${activeTasks ? `<div style="margin-top:8px">${activeTasks}</div>` : ''}
    </div>`;
  }

  function buildCardsView(list) {
    return list.map(buildProjectCard).join('') ||
      `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
    const rows = list.map(p => {
      const prog = p.progress || {};
      const pct = prog.pct || 0;
      return `<tr>
        <td><span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-proj-id="${p.id}">${p.title}</span></td>
        <td>${statusBadge(p.status)}</td>
        <td>${p.goal_title || '—'}</td>
        <td>${p.macro_area ? p.macro_area.split('(')[0].trim() : '—'}</td>
        <td>${pct}% (${prog.done||0}/${prog.total||0})</td>
        <td>${(p.tags||[]).map(t=>tagHtml(t)).join('')}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button>
          <button class="btn btn-sm btn-ghost proj-edit-btn" data-proj-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-danger proj-del-btn" data-proj-id="${p.id}">Del</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Status</th><th>Goal</th><th>Area</th><th>Progress</th><th>Tags</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'}],
    projectsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Projects</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-proj-btn">+ New Project</button>
      </div>
    </div>
    <div id="proj-list"></div>
  </div>`;

  const projFilterDefs = [
    { key: 'status', label: 'Status', multi: true, options: ['todo','in_progress','blocked','done'].map(s => ({ value: s, label: s.replace('_',' ') })) },
    { key: 'goal', label: 'Goal', multi: false, options: [{ value: '', label: 'All' }, ...goals.map(g => ({ value: String(g.id), label: g.title }))] },
  ];
  const projSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progress' },
  ];
  const viewEl = document.querySelector('#main-content .view');
  const headerEl = viewEl?.querySelector('.view-header');
  if (headerEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'proj-filter-bar-container';
    headerEl.after(barDiv);
    notionFilterBar('proj-filter-bar-container', projFilterDefs, projSortDefs, projFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(projects, projFilterState, {
      status: p => p.status,
      goal: p => String(p.goal_id || ''),
      title: p => p.title,
      progress: p => String((p.progress && p.progress.pct) || 0),
      _text: p => p.title + ' ' + (p.description || '') + ' ' + (p.goal_title || ''),
    });
  }

  function render() {
    const list = getFiltered();
    document.getElementById('proj-list').innerHTML =
      projectsViewMode === 'table' ? buildTableView(list) : buildCardsView(list);
    bindProjEvents();
  }

  document.getElementById('new-proj-btn').onclick = () => showProjectModal(null, goals);
  bindViewToggle([], null, (mode) => {
    projectsViewMode = mode;
    localStorage.setItem('projectsViewMode', mode);
    render();
  });
  render();

  function bindProjEvents() {
    document.querySelectorAll('.detail-nav').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.proj-edit-btn, .proj-del-btn, .proj-export-btn')) return;
        renderView('project-detail', el.dataset.projId);
      };
    });
    document.querySelectorAll('.task-title-link[data-proj-id]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); renderView('project-detail', el.dataset.projId); };
    });
    document.querySelectorAll('.proj-export-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const data = await api('GET', `/api/export/project/${el.dataset.projId}`);
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        downloadJSON(data, `project-${p?.title||el.dataset.projId}.json`);
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
}

/* ─── Goals View ─────────────────────────────────────────────────────── */
async function renderGoals() {
  let goals = [];
  let apiError = null;
  try { goals = await api('GET', '/api/goals'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const goalFilterState = { filters: {}, sort: {}, searchText: '' };

  function buildGoalCard(g) {
    const prog = g.progress || {};
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    const tagChips = (g.tags || []).map(t => tagHtml(t)).join('');
    return `<div class="card detail-nav-goal" data-goal-id="${g.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title">${g.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button>
          <button class="btn btn-sm btn-ghost goal-edit-btn" data-goal-id="${g.id}">Edit</button>
          <button class="btn btn-sm btn-danger goal-del-btn" data-goal-id="${g.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
        ${g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        ${statusBadge(g.status)}
        ${tagChips}
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0} tasks</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }

  function buildCardsView(list) {
    return list.map(buildGoalCard).join('') ||
      `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
    const rows = list.map(g => {
      const prog = g.progress || {};
      const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
      return `<tr>
        <td><span style="cursor:pointer;color:var(--accent)" class="goal-nav-link" data-goal-id="${g.id}">${g.title}</span></td>
        <td>${statusBadge(g.status)}</td>
        <td>${g.type || '—'}</td>
        <td>${g.year || '—'}</td>
        <td>${pct}%</td>
        <td>${(g.tags||[]).map(t=>tagHtml(t)).join('')}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button>
          <button class="btn btn-sm btn-ghost goal-edit-btn" data-goal-id="${g.id}">Edit</button>
          <button class="btn btn-sm btn-danger goal-del-btn" data-goal-id="${g.id}">Del</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Status</th><th>Type</th><th>Year</th><th>Progress</th><th>Tags</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'}],
    goalsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Goals</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-goal-btn">+ New Goal</button>
      </div>
    </div>
    <div id="goal-list"></div>
  </div>`;

  const goalFilterDefs = [
    { key: 'status', label: 'Status', multi: true, options: ['todo','in_progress','blocked','done'].map(s => ({ value: s, label: s.replace('_',' ') })) },
    { key: 'type', label: 'Type', multi: true, options: GOAL_TYPES.map(t => ({ value: t, label: t })) },
    { key: 'year', label: 'Year', multi: true, options: GOAL_YEARS.map(y => ({ value: y, label: y })) },
  ];
  const goalSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'type', label: 'Type' },
    { key: 'year', label: 'Year' },
  ];
  const goalViewEl = document.querySelector('#main-content .view');
  const goalHeaderEl = goalViewEl?.querySelector('.view-header');
  if (goalHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'goal-filter-bar-container';
    goalHeaderEl.after(barDiv);
    notionFilterBar('goal-filter-bar-container', goalFilterDefs, goalSortDefs, goalFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(goals, goalFilterState, {
      status: g => g.status,
      type: g => g.type || '',
      year: g => g.year || '',
      title: g => g.title,
      _text: g => g.title + ' ' + (g.description || ''),
    });
  }

  function render() {
    const list = getFiltered();
    document.getElementById('goal-list').innerHTML =
      goalsViewMode === 'table' ? buildTableView(list) : buildCardsView(list);
    bindGoalEvents();
  }

  document.getElementById('new-goal-btn').onclick = () => showGoalModal(null);
  bindViewToggle([], null, (mode) => {
    goalsViewMode = mode;
    localStorage.setItem('goalsViewMode', mode);
    render();
  });
  render();

  function bindGoalEvents() {
    document.querySelectorAll('.detail-nav-goal').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.goal-edit-btn, .goal-del-btn, .goal-export-btn')) return;
        renderView('goal-detail', el.dataset.goalId);
      };
    });
    document.querySelectorAll('.goal-nav-link').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); renderView('goal-detail', el.dataset.goalId); };
    });
    document.querySelectorAll('.goal-export-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const data = await api('GET', `/api/export/goal/${el.dataset.goalId}`);
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        downloadJSON(data, `goal-${g?.title||el.dataset.goalId}.json`);
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
}

/* ─── Notes View ─────────────────────────────────────────────────────── */
async function renderNotes() {
  let notes = [];
  let apiError = null;
  try { notes = await api('GET', '/api/notes'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const noteFilterState = { filters: {}, sort: {}, searchText: '' };

  function buildNoteCard(n) {
    const tagChips = (n.tags || []).map(t => tagHtml(t)).join('');
    return `<div class="note-card" data-note-id="${n.id}">
      <div class="flex-between gap-8">
        <div class="note-title">${n.title || 'Untitled'}</div>
        <div onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-danger note-del-btn" data-note-id="${n.id}">Delete</button>
        </div>
      </div>
      <div class="note-body-preview">${n.body || ''}</div>
      <div class="note-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
        ${fmtDate(n.note_date) ? `<span>${fmtDate(n.note_date)}</span>` : ''}
        ${n.category_name ? `<span>· ${n.category_name}</span>` : ''}
        ${tagChips}
      </div>
    </div>`;
  }

  function buildNoteTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    const rows = list.map(n => `<tr class="note-card" data-note-id="${n.id}" style="cursor:pointer">
      <td>${n.title || 'Untitled'}</td>
      <td>${fmtDate(n.note_date) || '—'}</td>
      <td>${n.category_name || '—'}</td>
      <td>${(n.tags||[]).map(t=>tagHtml(t)).join('')}</td>
      <td onclick="event.stopPropagation()"><button class="btn btn-sm btn-danger note-del-btn" data-note-id="${n.id}">Del</button></td>
    </tr>`).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Date</th><th>Category</th><th>Tags</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'}],
    notesViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Notes</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-note-btn">+ New Note</button>
      </div>
    </div>
    <div id="notes-list"></div>
  </div>`;

  const noteFilterDefs = [
    { key: 'category', label: 'Category', multi: false, options: [{ value: '', label: 'All' }, ...allCategories.map(c => ({ value: String(c.id), label: c.name }))] },
  ];
  const noteSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'note_date', label: 'Date' },
    { key: 'category_name', label: 'Category' },
  ];
  const noteViewEl = document.querySelector('#main-content .view');
  const noteHeaderEl = noteViewEl?.querySelector('.view-header');
  if (noteHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'note-filter-bar-container';
    noteHeaderEl.after(barDiv);
    notionFilterBar('note-filter-bar-container', noteFilterDefs, noteSortDefs, noteFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(notes, noteFilterState, {
      category: n => String(n.category_id || ''),
      title: n => n.title || '',
      note_date: n => n.note_date || '',
      category_name: n => n.category_name || '',
      _text: n => (n.title || '') + ' ' + (n.body || ''),
    });
  }

  function render() {
    const list = getFiltered();
    if (!list.length) {
      document.getElementById('notes-list').innerHTML =
        `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    } else {
      document.getElementById('notes-list').innerHTML =
        notesViewMode === 'table' ? buildNoteTable(list) :
        `<div style="display:grid;gap:12px">${list.map(buildNoteCard).join('')}</div>`;
    }
    bindNoteEvents();
  }

  document.getElementById('new-note-btn').onclick = () => showNoteModal(null, () => renderNotes());
  bindViewToggle([], null, (mode) => {
    notesViewMode = mode;
    localStorage.setItem('notesViewMode', mode);
    render();
  });
  render();

  function bindNoteEvents() {
    document.querySelectorAll('.note-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.classList.contains('note-del-btn')) return;
        const n = notes.find(x => String(x.id) === el.dataset.noteId);
        if (n) showNoteModal(n, () => renderNotes());
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

  function buildSprintCard(s) {
    const prog = s.progress || {};
    const pct = prog.pct || 0;
    const nextStatus = s.status === 'planned' ? 'active' : s.status === 'active' ? 'completed' : null;
    const nextLabel = s.status === 'planned' ? 'Start' : s.status === 'active' ? 'Complete' : null;
    return `<div class="card">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title sprint-detail-link" data-sprint-id="${s.id}" style="cursor:pointer;color:var(--accent)">${s.title}</span>
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
  }

  function buildSprintTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`;
    const rows = list.map(s => {
      const prog = s.progress || {};
      const pct = prog.pct || 0;
      return `<tr class="sprint-row" data-sprint-id="${s.id}" style="cursor:pointer">
        <td><span class="sprint-detail-link" data-sprint-id="${s.id}" style="color:var(--accent);cursor:pointer">${s.title}</span></td>
        <td>${statusBadge(s.status)}</td>
        <td>${s.project_title || '—'}</td>
        <td>${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</td>
        <td>${pct}%</td>
        <td>
          ${s.status === 'planned' ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="active">Start</button>` : ''}
          ${s.status === 'active' ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="completed">Complete</button>` : ''}
          <button class="btn btn-sm btn-danger sprint-del-btn" data-sprint-id="${s.id}">Del</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Status</th><th>Project</th><th>Dates</th><th>Progress</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'}],
    sprintsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Sprints</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-sprint-btn">+ New Sprint</button>
      </div>
    </div>
    <div id="sprints-list"></div>
  </div>`;

  const sprintFilterState = { filters: {}, sort: {}, searchText: '' };
  const sprintFilterDefs = [
    { key: 'status', label: 'Status', multi: true, options: ['planned','active','completed'].map(s => ({ value: s, label: s })) },
    { key: 'project', label: 'Project', multi: false, options: [{ value: '', label: 'All' }, ...projects.map(p => ({ value: String(p.id), label: p.title }))] },
  ];
  const sprintSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'status', label: 'Status' },
  ];
  const sprintViewEl = document.querySelector('#main-content .view');
  const sprintHeaderEl = sprintViewEl?.querySelector('.view-header');
  if (sprintHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'sprint-filter-bar-container';
    sprintHeaderEl.after(barDiv);
    notionFilterBar('sprint-filter-bar-container', sprintFilterDefs, sprintSortDefs, sprintFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(sprints, sprintFilterState, {
      status: s => s.status,
      project: s => String(s.project_id || ''),
      title: s => s.title,
      start_date: s => s.start_date || '',
      _text: s => s.title + ' ' + (s.project_title || ''),
    });
  }

  function render() {
    const list = getFiltered();
    document.getElementById('sprints-list').innerHTML =
      sprintsViewMode === 'table' ? buildSprintTable(list) :
      (list.map(buildSprintCard).join('') || `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`);
    bindSprintEvents();
  }

  document.getElementById('new-sprint-btn').onclick = () => showSprintModal(projects);
  bindViewToggle([], null, (mode) => {
    sprintsViewMode = mode;
    localStorage.setItem('sprintsViewMode', mode);
    render();
  });
  render();

  function bindSprintEvents() {
    document.querySelectorAll('.sprint-detail-link').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); renderView('sprint-detail', el.dataset.sprintId); };
    });
    document.querySelectorAll('.sprint-status-btn').forEach(el => {
      el.onclick = async () => {
        const nextStatus = el.dataset.next;
        await api('PATCH', `/api/sprints/${el.dataset.sprintId}`, { status: nextStatus });
        // When activating a sprint, go to dashboard to show it in command center
        if (nextStatus === 'active') renderView('dashboard');
        else renderSprints();
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


/* ─── Sprint Detail View ─────────────────────────────────────────────── */
async function renderSprintDetail(sprintId) {
  let sprint;
  try { sprint = await api('GET', `/api/sprints/${sprintId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Sprint not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('sprint-detail', sprintId, sprint.title);

  const tasks = sprint.tasks || [];
  const prog = sprint.progress || {};
  const pct = prog.pct || 0;

  // Compute sub_task_count for each task from the tasks array
  tasks.forEach(t => {
    t.sub_task_count = tasks.filter(s => s.parent_task_id === t.id).length;
  });

  // Merge tasks into cache for subtask lookups
  tasks.forEach(t => { if (!allTasksCache.find(x => x.id === t.id)) allTasksCache.push(t); });

  function buildSprintTaskTree(taskList, allTasks, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, true, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildSprintTaskTree(children, allTasks, depth + 1);
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  const taskIds = new Set(tasks.map(t => t.id));
  const topLevel = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
  const taskListHtml = tasks.length
    ? `<ul class="task-list">${buildSprintTaskTree(topLevel, tasks, 0)}</ul>`
    : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks in this sprint</div></div>`;

  const nextStatus = sprint.status === 'planned' ? 'active' : sprint.status === 'active' ? 'completed' : null;
  const nextLabel = sprint.status === 'planned' ? 'Start Sprint' : sprint.status === 'active' ? 'Complete Sprint' : null;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        ${sprint.project_title ? `<div class="breadcrumb" style="margin-bottom:6px"><span class="bc-crumb bc-proj" style="cursor:pointer" data-proj-id="${sprint.project_id}">◆ ${sprint.project_title}</span></div>` : ''}
        <h1 class="view-title">⚡ ${sprint.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(sprint.status)}
          ${sprint.start_date ? `<span class="badge badge-todo">${fmtDate(sprint.start_date)} → ${fmtDate(sprint.end_date)}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="sd-back-btn">← Back</button>
        ${nextStatus ? `<button class="btn btn-ghost" id="sd-status-btn" data-next="${nextStatus}">${nextLabel}</button>` : ''}
        <button class="btn btn-primary" id="sd-add-task-btn">+ Task</button>
      </div>
    </div>
    <div class="widget" style="margin-bottom:16px">
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}% complete</span><span>${prog.done || 0}/${prog.total || 0} tasks</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
    <div class="widget">
      <div class="widget-header"><span class="widget-title">Tasks (${tasks.length})</span></div>
      <div id="sd-task-list">${taskListHtml}</div>
    </div>
  </div>`;

  document.getElementById('sd-back-btn').onclick = () => renderView('sprints');
  document.getElementById('sd-add-task-btn').onclick = () =>
    showNewTaskModal({ sprint_id: parseInt(sprintId) }, () => renderSprintDetail(sprintId));
  document.getElementById('sd-status-btn')?.addEventListener('click', async (e) => {
    const next = e.currentTarget.dataset.next;
    await api('PATCH', `/api/sprints/${sprintId}`, { status: next });
    if (next === 'active') renderView('dashboard');
    else renderSprintDetail(sprintId);
  });
  if (sprint.project_id) {
    document.querySelectorAll('.bc-proj').forEach(el => {
      el.onclick = () => renderView('project-detail', el.dataset.projId);
    });
  }
  bindDetailTaskEvents(() => renderSprintDetail(sprintId));
}

/* ─── Resources View ─────────────────────────────────────────────────── */
async function renderResources() {
  let resources = [];
  let apiError = null;
  try { resources = await api('GET', '/api/resources'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const resFilterState = { filters: {}, sort: {}, searchText: '' };
  const types = [...new Set(resources.map(r => r.resource_type).filter(Boolean))];

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
          <button class="btn btn-sm btn-danger res-del-btn" data-res-id="${r.id}">×</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Type</th><th>Linked</th><th>URL / Preview</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    return `<div style="display:grid;gap:12px">${list.map(r => {
      const rawUrl = r.url || '';
      const linked = r.goal_title || r.project_title || r.task_title;
      return `<div class="card">
        <div class="flex-between gap-8" style="margin-bottom:6px">
          <span class="card-title">${r.title}</span>
          <div class="flex gap-8">
            <button class="btn btn-sm btn-ghost res-edit-btn" data-res-id="${r.id}">Edit</button>
            <button class="btn btn-sm btn-danger res-del-btn" data-res-id="${r.id}">×</button>
          </div>
        </div>
        ${r.resource_type ? `<span class="badge badge-todo">${r.resource_type}</span>` : ''}
        ${linked ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">→ ${linked}</div>` : ''}
        ${rawUrl ? `<div style="margin-top:6px"><a href="${rawUrl}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent)">${rawUrl.length > 60 ? rawUrl.slice(0,60)+'…' : rawUrl}</a></div>` : ''}
        ${r.body ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${r.body.slice(0,120)}${r.body.length>120?'…':''}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }

  const toggle = viewToggleHtml([{key:'table',label:'Table'},{key:'cards',label:'Cards'}], resourcesViewMode);

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Resources</h1>
      <div style="display:flex;gap:8px;align-items:center">
        ${toggle}
        <button class="btn btn-primary" id="new-res-btn">+ New Resource</button>
      </div>
    </div>
    <div id="res-table"></div>
  </div>`;

  const resFilterDefs = [
    { key: 'resource_type', label: 'Type', multi: false, options: [{ value: '', label: 'All' }, ...types.map(t => ({ value: t, label: t }))] },
  ];
  const resSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'resource_type', label: 'Type' },
  ];
  const resViewEl = document.querySelector('#main-content .view');
  const resHeaderEl = resViewEl?.querySelector('.view-header');
  if (resHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'res-filter-bar-container';
    resHeaderEl.after(barDiv);
    notionFilterBar('res-filter-bar-container', resFilterDefs, resSortDefs, resFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(resources, resFilterState, {
      resource_type: r => r.resource_type || '',
      title: r => r.title,
      _text: r => r.title + ' ' + (r.url || '') + ' ' + (r.body || ''),
    });
  }

  function render() {
    const list = getFiltered();
    document.getElementById('res-table').innerHTML =
      resourcesViewMode === 'cards' ? buildCards(list) : buildTable(list);
    bindResEvents();
  }

  document.getElementById('new-res-btn').onclick = () => showResourceModal(null, () => renderResources());
  bindViewToggle([], null, (mode) => {
    resourcesViewMode = mode;
    localStorage.setItem('resourcesViewMode', mode);
    render();
  });
  render();

  function bindResEvents() {
    document.querySelectorAll('.res-edit-btn').forEach(el => {
      el.onclick = async () => {
        const r = resources.find(x => String(x.id) === el.dataset.resId);
        showResourceModal(r, () => renderResources());
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
    <div class="filter-row"><input type="text" id="cat-search" placeholder="Search categories…" /></div>
    <div id="cat-grid" class="taxonomy-grid">${chips}</div>
  </div>`;

  document.getElementById('new-cat-btn').onclick = () => showCategoryModal(null);
  document.getElementById('cat-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.taxonomy-chip').forEach(chip => {
      const name = chip.querySelector('.taxonomy-chip-name')?.textContent?.toLowerCase() || '';
      chip.style.display = name.includes(q) ? '' : 'none';
    });
  };
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
    <div class="filter-row"><input type="text" id="tag-search" placeholder="Search tags…" /></div>
    <div id="tag-grid" class="taxonomy-grid">${chips}</div>
  </div>`;

  document.getElementById('new-tag-btn').onclick = () => showTagModal(null);
  document.getElementById('tag-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#tag-grid .taxonomy-chip').forEach(chip => {
      const name = chip.querySelector('.taxonomy-chip-name')?.textContent?.toLowerCase() || '';
      chip.style.display = name.includes(q) ? '' : 'none';
    });
  };
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
  updateBreadcrumb('project-detail', projectId, p.title);

  const tasks = p.tasks || [];
  const notes = p.notes || [];
  const resources = p.resources || [];

  // Compute sub_task_count for each task from the tasks array itself
  tasks.forEach(t => {
    t.sub_task_count = tasks.filter(s => s.parent_task_id === t.id).length;
  });

  // Merge project tasks into allTasksCache for subtask lookups
  tasks.forEach(t => {
    if (!allTasksCache.find(x => x.id === t.id)) allTasksCache.push(t);
  });

  function buildTaskTreeRows(taskList, allTasks, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, false, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildTaskTreeRows(children, allTasks, depth + 1);
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  function buildTaskList() {
    if (!tasks.length) return `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks</div></div>`;
    const taskIds = new Set(tasks.map(t => t.id));
    const topLevel = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
    return '<ul class="task-list">' + buildTaskTreeRows(topLevel, tasks, 0) + '</ul>';
  }

  function renderTaskList() {
    document.getElementById('pd-task-list').innerHTML = buildTaskList();
    bindDetailTaskEvents(() => renderProjectDetail(projectId));
  }

  const noteCards = notes.map(n => `<div class="note-card clickable-note" data-note-id="${n.id}" style="cursor:pointer">
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
        <button class="btn btn-ghost" id="pd-export-btn">Export JSON</button>
        <button class="btn btn-ghost" id="pd-back-btn">← Back</button>
        <button class="btn btn-primary" id="pd-add-task-btn">+ Task</button>
        <button class="btn btn-ghost" id="pd-add-note-btn">+ Note</button>
        <button class="btn btn-ghost" id="pd-add-res-btn">+ Resource</button>
      </div>
    </div>
    ${p.description ? `<div class="card" style="margin-bottom:16px"><p style="color:var(--text-muted)">${p.description}</p></div>` : ''}
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Tasks (${tasks.length})</span></div>
        <div id="pd-task-list">${buildTaskList()}</div>
      </div>
    </div>
    <div class="cc-grid" style="margin-top:16px">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Notes (${notes.length})</span></div>
        <div id="pd-notes">${noteCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Resources (${resources.length})</span></div>
        <div>${resRows}</div>
      </div>
    </div>
    <div class="widget" style="margin-top:16px">
      <div class="widget-header">
        <span class="widget-title">Properties</span>
        <button class="btn btn-sm btn-ghost" id="pd-add-prop-btn">+ Add</button>
      </div>
      <div id="pd-props-list"></div>
    </div>
  </div>`;

  document.getElementById('pd-back-btn').onclick = () => renderView('projects');
  document.getElementById('pd-add-task-btn').onclick = () => showNewTaskModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-add-note-btn').onclick = () => showNoteModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-add-res-btn').onclick = () => showResourceModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-export-btn').onclick = async () => {
    const data = await api('GET', `/api/export/project/${projectId}`);
    downloadJSON(data, `project-${p.title}.json`);
  };
  if (goalLink) {
    document.querySelectorAll('.bc-goal').forEach(el => {
      el.onclick = () => renderView('goal-detail', el.dataset.goalId);
    });
  }
  document.querySelectorAll('.clickable-note').forEach(el => {
    el.onclick = () => {
      const n = notes.find(x => String(x.id) === el.dataset.noteId);
      if (n) showNoteModal(n, () => renderProjectDetail(projectId));
    };
  });
  bindDetailTaskEvents(() => renderProjectDetail(projectId));
  bindPropertiesWidget('project', projectId, 'pd-props-list', 'pd-add-prop-btn');
}
async function renderGoalDetail(goalId) {
  let g;
  try { g = await api('GET', `/api/goals/${goalId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Goal not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('goal-detail', goalId, g.title);

  const projects = g.projects || [];
  const tasks = g.tasks || [];
  const notes = g.notes || [];
  const resources = g.resources || [];

  // Compute sub_task_count for each task from the tasks array
  tasks.forEach(t => {
    t.sub_task_count = tasks.filter(s => s.parent_task_id === t.id).length;
  });

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

  // Merge goal tasks into cache for subtask lookups
  tasks.forEach(t => { if (!allTasksCache.find(x => x.id === t.id)) allTasksCache.push(t); });

  function buildGoalTaskTreeRows(taskList, allTasks, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, false, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildGoalTaskTreeRows(children, allTasks, depth + 1);
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  const taskIds = new Set(tasks.map(t => t.id));
  const topLevelTasks = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
  const taskRows = tasks.length
    ? '<ul class="task-list">' + buildGoalTaskTreeRows(topLevelTasks, tasks, 0) + '</ul>'
    : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No direct tasks</div></div>`;

  const noteCards = notes.map(n => `<div class="note-card clickable-note" data-note-id="${n.id}" style="cursor:pointer">
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
        <button class="btn btn-ghost" id="gd-export-btn">Export JSON</button>
        <button class="btn btn-ghost" id="gd-back-btn">← Back</button>
        <button class="btn btn-primary" id="gd-add-task-btn">+ Task</button>
        <button class="btn btn-ghost" id="gd-add-note-btn">+ Note</button>
        <button class="btn btn-ghost" id="gd-add-res-btn">+ Resource</button>
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
        <div id="gd-task-list">${taskRows}</div>
      </div>
    </div>
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Notes (${notes.length})</span></div>
        <div id="gd-notes">${noteCards}</div>
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
    <div class="widget" style="margin-top:16px">
      <div class="widget-header">
        <span class="widget-title">Properties</span>
        <button class="btn btn-sm btn-ghost" id="gd-add-prop-btn">+ Add</button>
      </div>
      <div id="gd-props-list"></div>
    </div>
  </div>`;

  document.getElementById('gd-back-btn').onclick = () => renderView('goals');
  document.getElementById('gd-export-btn').onclick = async () => {
    const data = await api('GET', `/api/export/goal/${goalId}`);
    downloadJSON(data, `goal-${g.title}.json`);
  };
  document.getElementById('gd-add-task-btn').onclick = () => showNewTaskModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-add-note-btn').onclick = () => showNoteModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-add-res-btn').onclick = () => showResourceModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.querySelectorAll('#gd-proj-list .detail-nav').forEach(el => {
    el.onclick = () => renderView('project-detail', el.dataset.projId);
  });
  document.querySelectorAll('.clickable-note').forEach(el => {
    el.onclick = () => {
      const n = notes.find(x => String(x.id) === el.dataset.noteId);
      if (n) showNoteModal(n, () => renderGoalDetail(goalId));
    };
  });
  bindDetailTaskEvents(() => renderGoalDetail(goalId));
  bindPropertiesWidget('goal', goalId, 'gd-props-list', 'gd-add-prop-btn');
}

/* ─── Properties Widget ──────────────────────────────────────────────── */
async function bindPropertiesWidget(entityType, entityId, listContainerId, addBtnId) {
  const listEl = document.getElementById(listContainerId);
  const addBtn = document.getElementById(addBtnId);
  if (!listEl) return;

  async function loadAndRender() {
    let props = {};
    try { props = await api('GET', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`); } catch(e) {}
    const entries = Object.entries(props);
    if (!entries.length) {
      listEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:6px 0">No custom properties</div>`;
    } else {
      listEl.innerHTML = entries.map(([k,v]) => `
        <div class="prop-row" data-key="${k.replace(/"/g,'&quot;')}">
          <span class="prop-key">${k}</span>
          <span class="prop-sep">:</span>
          <input class="prop-val-input" data-key="${k.replace(/"/g,'&quot;')}" value="${(v||'').replace(/"/g,'&quot;')}" />
          <button class="prop-del-btn btn btn-sm btn-ghost" data-key="${k.replace(/"/g,'&quot;')}" title="Delete">×</button>
        </div>`).join('');
      listEl.querySelectorAll('.prop-val-input').forEach(inp => {
        inp.onblur = async () => {
          await api('POST', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`, { key: inp.dataset.key, value: inp.value });
        };
        inp.onkeydown = (e) => { if (e.key === 'Enter') inp.blur(); };
      });
      listEl.querySelectorAll('.prop-del-btn').forEach(btn => {
        btn.onclick = async () => {
          await api('DELETE', `/api/properties?entity_type=${entityType}&entity_id=${entityId}&key=${encodeURIComponent(btn.dataset.key)}`);
          loadAndRender();
        };
      });
    }
  }

  loadAndRender();

  if (addBtn) {
    addBtn.onclick = () => {
      const existing = document.getElementById('prop-add-row');
      if (existing) { existing.remove(); return; }
      const row = document.createElement('div');
      row.id = 'prop-add-row';
      row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px';
      row.innerHTML = `
        <input id="prop-new-key" placeholder="Property name" style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text)" />
        <input id="prop-new-val" placeholder="Value" style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text)" />
        <button class="btn btn-sm btn-primary" id="prop-save-new">Add</button>
        <button class="btn btn-sm btn-ghost" id="prop-cancel-new">×</button>`;
      listEl.after(row);
      document.getElementById('prop-new-key').focus();
      document.getElementById('prop-cancel-new').onclick = () => row.remove();
      const saveNew = async () => {
        const key = document.getElementById('prop-new-key').value.trim();
        const val = document.getElementById('prop-new-val').value;
        if (!key) return;
        await api('POST', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`, { key, value: val });
        row.remove();
        loadAndRender();
      };
      document.getElementById('prop-save-new').onclick = saveNew;
      document.getElementById('prop-new-val').onkeydown = (e) => { if (e.key === 'Enter') saveNew(); };
    };
  }
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

  // Fetch projects and goals for selects
  let allProjects = [], allGoals = [];
  try { [allProjects, allGoals] = await Promise.all([api('GET', '/api/projects'), api('GET', '/api/goals')]); } catch(e) {}
  const projOpts = '<option value="">— none —</option>' + allProjects.map(p =>
    `<option value="${p.id}" ${String(p.id)===String(task.project_id)?'selected':''}>${p.title}</option>`).join('');
  const goalOpts = '<option value="">— none —</option>' + allGoals.map(g =>
    `<option value="${g.id}" ${String(g.id)===String(task.goal_id)?'selected':''}>${g.title}</option>`).join('');

  const pomPlanned = task.pomodoros_planned || 0;
  const pomDone = task.pomodoros_finished || 0;
  const dotCount = Math.max(pomPlanned, pomDone, 1);
  const pomDots = Array.from({length: dotCount}, (_, i) =>
    `<div class="pom-dot ${i < pomDone ? 'done' : ''}"></div>`
  ).join('');

  // Build nested subtask table
  function buildSubtaskTable(items, depth) {
    if (!items.length) return '';
    return items.map(st => {
      const allSubs = allTasksCache.filter(x => x.parent_task_id === st.id);
      const indent = depth * 16;
      return `<tr class="subtask-table-row" data-st-id="${st.id}" style="cursor:pointer">
        <td style="padding-left:${12+indent}px">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="task-check ${st.status==='done'?'done':''}" data-subtask-id="${st.id}" style="flex-shrink:0">${st.status==='done'?'✓':''}</div>
            <span class="${st.status==='done'?'task-title-text done':'task-title-text'}">${st.title}</span>
          </div>
          ${allSubs.length > 0 ? `<div style="margin-top:4px">${buildSubtaskTable(allSubs, depth+1)}</div>` : ''}
        </td>
        <td>${statusBadge(st.status)}</td>
        <td>${priorityBadge(st.priority)}</td>
        <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-muted)">${fmtDate(st.due_date)||'—'}</td>
      </tr>`;
    }).join('');
  }

  const subtaskTableBody = buildSubtaskTable(subtasks, 0);
  const subtasksHtml = subtasks.length > 0 ? `
    <div class="notion-table-wrap" style="margin-top:8px">
      <table class="notion-table">
        <thead><tr>
          <th>Subtask</th><th>Status</th><th>Priority</th><th>Due</th>
        </tr></thead>
        <tbody>${subtaskTableBody}</tbody>
      </table>
    </div>` : '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No subtasks</div>';

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
        <input type="date" id="detail-due" value="${stripDate(task.due_date)}" />
      </div>
      <div class="detail-field">
        <label>Focus Block</label>
        <input type="date" id="detail-focus" value="${stripDate(task.focus_block)}" />
      </div>
      <div class="detail-field">
        <label>Category</label>
        <select id="detail-category">${catOpts}</select>
      </div>
      <div class="detail-field">
        <label>Story Points</label>
        <input type="number" id="detail-points" value="${task.story_points || ''}" min="0" />
      </div>
      <div class="detail-field">
        <label>Goal</label>
        <select id="detail-goal">${goalOpts}</select>
      </div>
      <div class="detail-field">
        <label>Project</label>
        <select id="detail-project">${projOpts}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="detail-desc" style="width:100%;min-height:80px">${task.description || ''}</textarea>
    </div>
    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Subtasks (${subtasks.length})</span>
        <button class="btn btn-sm btn-ghost" id="add-subtask-btn">+ Add</button>
      </div>
      <div id="subtask-list">${subtasksHtml}</div>
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
    <div class="subtask-section" style="margin-top:20px" id="props-section">
      <div class="subtask-section-title">
        <span>Properties</span>
        <button class="btn btn-sm btn-ghost" id="add-prop-btn">+ Add</button>
      </div>
      <div id="props-list"></div>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost btn-sm" id="task-export-btn">Export JSON</button>
    </div>
  `;

  openSlideover(task.title, body);

  async function patchTask(data) {
    try { await api('PATCH', `/api/tasks/${taskId}`, data); } catch(e) { return; }
    // Refresh background view without closing the slideover (call render functions directly)
    const v = currentView;
    if (v === 'tasks') renderTasks();
    else if (v === 'dashboard') renderDashboard();
    else if (v === 'project-detail' && currentParams) renderProjectDetail(currentParams);
    else if (v === 'goal-detail' && currentParams) renderGoalDetail(currentParams);
    // Re-fetch and re-render the slideover body with updated data
    showTaskSlideover(taskId);
  }

  async function handleStatusChange(newStatus) {
    await patchTask({ status: newStatus });
    // Recurring: when marked done, recreate with next due date
    if (newStatus === 'done' && task.recur_interval && task.recur_interval > 0) {
      const interval = task.recur_interval;
      const unit = (task.recur_unit || 'days').toLowerCase();
      let nextDue = null;
      if (task.due_date) {
        const d = new Date(stripDate(task.due_date) + 'T00:00:00');
        if (unit.startsWith('day')) d.setDate(d.getDate() + interval);
        else if (unit.startsWith('week')) d.setDate(d.getDate() + interval * 7);
        else if (unit.startsWith('month')) d.setMonth(d.getMonth() + interval);
        else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + interval);
        nextDue = d.toISOString().split('T')[0];
      }
      const clone = {
        title: task.title, description: task.description,
        status: 'todo', priority: task.priority,
        due_date: nextDue, focus_block: null,
        goal_id: task.goal_id, project_id: task.project_id, sprint_id: task.sprint_id,
        parent_task_id: task.parent_task_id,
        category_id: task.category_id, story_points: task.story_points,
        pomodoros_planned: task.pomodoros_planned, pomodoros_finished: 0,
        recur_interval: interval, recur_unit: unit,
      };
      try { await api('POST', '/api/tasks', clone); } catch(e) {}
    }
  }

  document.getElementById('detail-title').onblur = (e) => patchTask({ title: e.target.value });
  document.getElementById('detail-status').onchange = (e) => handleStatusChange(e.target.value);
  document.getElementById('detail-priority').onchange = (e) => patchTask({ priority: e.target.value });
  document.getElementById('detail-due').onchange = (e) => patchTask({ due_date: e.target.value || null });
  document.getElementById('detail-focus').onchange = (e) => patchTask({ focus_block: e.target.value || null });
  document.getElementById('detail-category').onchange = (e) => patchTask({ category_id: e.target.value ? parseInt(e.target.value) : null });
  document.getElementById('detail-points').onchange = (e) => patchTask({ story_points: parseInt(e.target.value) || 0 });
  document.getElementById('detail-goal').onchange = (e) => patchTask({ goal_id: e.target.value ? parseInt(e.target.value) : null });
  document.getElementById('detail-project').onchange = (e) => patchTask({ project_id: e.target.value ? parseInt(e.target.value) : null });
  document.getElementById('detail-desc').onblur = (e) => patchTask({ description: e.target.value });

  document.getElementById('add-subtask-btn').onclick = () => {
    showNewTaskModal({ parent_task_id: parseInt(taskId), status: 'todo', priority: 'medium' }, () => showTaskSlideover(taskId));
  };

  document.querySelectorAll('.subtask-table-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('[data-subtask-id]')) return;
      showTaskSlideover(row.dataset.stId);
    };
  });

  document.querySelectorAll('[data-subtask-id]').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
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

  document.getElementById('task-export-btn').onclick = async () => {
    const data = await api('GET', `/api/export/task/${taskId}`);
    downloadJSON(data, `task-${task.title.replace(/\s+/g,'-')}.json`);
  };

  // Properties widget
  bindPropertiesWidget('task', taskId, 'props-list', 'add-prop-btn');

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

/* ─── Calendar Builder ───────────────────────────────────────────────── */
function buildCalendar(tasks, year, month, showNav) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  // Start grid on Monday
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0
  const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
    `<div class="cal-day-header">${d}</div>`).join('');

  // Build day cells
  let cells = '';
  let dayNum = 1 - startDow;
  const today = new Date(); today.setHours(0,0,0,0);

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++, dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const isCurrentMonth = cellDate.getMonth() === month;
      const isToday = cellDate.getTime() === today.getTime();
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
      const dayTasks = tasks.filter(t => stripDate(t.due_date) === dateStr || stripDate(t.focus_block) === dateStr);
      const taskChips = dayTasks.slice(0,4).map(t => {
        const prioColors = { urgent:'var(--danger)', high:'var(--danger)', medium:'var(--warning)', low:'var(--text-muted)' };
        const color = prioColors[t.priority] || 'var(--text-muted)';
        return `<div class="cal-task-chip" data-task-id="${t.id}" style="border-left:2px solid ${color}" title="${t.title}">${t.title}</div>`;
      }).join('');
      cells += `<div class="calendar-day ${isCurrentMonth?'':'other-month'} ${isToday?'today':''}">
        <div class="cal-day-num">${cellDate.getDate()}</div>
        <div class="cal-tasks">${taskChips}</div>
      </div>`;
    }
    if (dayNum > lastDay.getDate() + 1) break;
  }

  const nav = showNav ? `<div class="cal-nav">
    <button class="btn btn-sm btn-ghost" id="cal-prev">‹ Prev</button>
    <span style="font-family:'DM Mono',monospace;font-size:14px">${monthNames[month]} ${year}</span>
    <button class="btn btn-sm btn-ghost" id="cal-next">Next ›</button>
  </div>` : `<div style="font-family:'DM Mono',monospace;font-size:13px;margin-bottom:12px;color:var(--text-muted)">${monthNames[month]} ${year}</div>`;

  return `${nav}<div class="calendar-grid">${dayHeaders}${cells}</div>`;
}

/* ─── Calendar View (sidebar nav) ───────────────────────────────────── */
async function renderCalendarView() {
  let tasks = [], goals = [], projects = [], sprints = [];
  try {
    [tasks, goals, projects, sprints] = await Promise.all([
      api('GET', '/api/tasks?all=1'),
      api('GET', '/api/goals'),
      api('GET', '/api/projects'),
      api('GET', '/api/sprints'),
    ]);
    allTasksCache = tasks;
  } catch(e) {}

  // Build sprint date ranges for background shading
  const sprintRanges = sprints
    .filter(s => s.status === 'active' && s.start_date && s.end_date)
    .map(s => ({ title: s.title, start: stripDate(s.start_date), end: stripDate(s.end_date) }));

  // Build unified event list. Tasks with start_date become ranged events.
  const events = [];
  tasks.forEach(t => {
    const sd = t.start_date ? stripDate(t.start_date) : null;
    const dd = t.due_date ? stripDate(t.due_date) : null;
    if (sd && dd && sd !== dd) {
      events.push({ id: t.id, type: 'task', title: t.title, start: sd, end: dd, ranged: true, priority: t.priority, status: t.status });
    } else if (dd) {
      events.push({ id: t.id, type: 'task', title: t.title, date: dd, ranged: false, priority: t.priority, status: t.status });
    } else if (sd) {
      events.push({ id: t.id, type: 'task', title: t.title, date: sd, ranged: false, priority: t.priority, status: t.status });
    }
  });
  goals.forEach(g => {
    const sd = g.start_date ? stripDate(g.start_date) : null;
    const dd = g.due_date   ? stripDate(g.due_date)   : null;
    if (sd && dd && sd !== dd) {
      events.push({ id: g.id, type: 'goal', title: g.title, start: sd, end: dd, ranged: true });
    } else {
      if (dd) events.push({ id: g.id, type: 'goal', title: g.title, date: dd, ranged: false });
      else if (sd) events.push({ id: g.id, type: 'goal', title: g.title, date: sd, ranged: false });
    }
  });
  projects.forEach(p => {
    const sd = p.start_date ? stripDate(p.start_date) : null;
    const dd = p.due_date   ? stripDate(p.due_date)   : null;
    if (sd && dd && sd !== dd) {
      events.push({ id: p.id, type: 'project', title: p.title, start: sd, end: dd, ranged: true });
    } else {
      if (dd) events.push({ id: p.id, type: 'project', title: p.title, date: dd, ranged: false });
      else if (sd) events.push({ id: p.id, type: 'project', title: p.title, date: sd, ranged: false });
    }
  });
  sprints.forEach(s => {
    const sd = s.start_date ? stripDate(s.start_date) : null;
    const ed = s.end_date   ? stripDate(s.end_date)   : null;
    if (sd && ed && sd !== ed) {
      events.push({ id: s.id, type: 'sprint', title: s.title, start: sd, end: ed, ranged: true });
    } else {
      if (sd) events.push({ id: s.id, type: 'sprint', title: s.title + ' (start)', date: sd, ranged: false });
      if (ed) events.push({ id: s.id, type: 'sprint', title: s.title + ' (end)',   date: ed, ranged: false });
    }
  });

  const typeColors = {
    task:    'var(--accent)',
    goal:    'var(--success)',
    project: 'var(--warning)',
    sprint:  '#9b7fe8',
  };

  // Returns events that appear on a given dateStr (ranged or single-day)
  function eventsOnDate(dateStr) {
    return events.filter(ev => {
      if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
      if (ev.ranged) return dateStr >= ev.start && dateStr <= ev.end;
      return ev.date === dateStr;
    });
  }

  function chipColor(ev) {
    if (ev.type === 'task' && ev.priority) {
      return { urgent:'var(--danger)', high:'var(--danger)', medium:'var(--warning)', low:'var(--text-muted)' }[ev.priority] || 'var(--accent)';
    }
    return typeColors[ev.type] || 'var(--accent)';
  }

  function dateAdd(d, days) {
    const r = new Date(d); r.setDate(r.getDate() + days); return r;
  }
  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function buildMonthCal() {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth+1, 0);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const todayD = new Date(); todayD.setHours(0,0,0,0);

    // Build week rows, each has 7 dates
    const weeks = [];
    let dayNum = 1 - startDow;
    for (let row = 0; row < 6; row++) {
      const week = [];
      for (let col = 0; col < 7; col++, dayNum++) {
        week.push(new Date(calYear, calMonth, dayNum));
      }
      weeks.push(week);
      if (dayNum > lastDay.getDate() + 1) break;
    }

    // For multi-day events, figure out which "lanes" (vertical slots) they occupy per week row
    // so bars don't overlap. Returns [{ev, startCol, endCol, lane}] per week row.
    function rangedBarsForWeek(weekDates) {
      const wStart = dateStr(weekDates[0]);
      const wEnd   = dateStr(weekDates[6]);
      // Only truly ranged events (start_date != due_date)
      const rangedEvs = events.filter(ev => {
        if (!ev.ranged) return false;
        if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
        return ev.end >= wStart && ev.start <= wEnd;
      });
      // Assign lanes greedily
      const lanes = []; // lanes[i] = end date of last bar in lane i
      return rangedEvs.map(ev => {
        const clampedStart = ev.start < wStart ? wStart : ev.start;
        const clampedEnd   = ev.end   > wEnd   ? wEnd   : ev.end;
        const startCol = weekDates.findIndex(d => dateStr(d) === clampedStart);
        const endCol   = weekDates.findIndex(d => dateStr(d) === clampedEnd);
        let lane = lanes.findIndex(laneEnd => laneEnd < clampedStart);
        if (lane === -1) { lane = lanes.length; lanes.push(clampedEnd); }
        else { lanes[lane] = clampedEnd; }
        return { ev, startCol, endCol, lane };
      });
    }

    const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
      `<div class="cal-day-header">${d}</div>`).join('');

    const weekRows = weeks.map(weekDates => {
      const bars = rangedBarsForWeek(weekDates);
      const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), -1);
      // How many lanes are used — reserve vertical space for bars above point-in-time events
      const barAreaHeight = maxLane >= 0 ? (maxLane + 1) * 20 + 4 : 0;

      // Day cells
      const cells = weekDates.map((cellDate, col) => {
        const ds = dateStr(cellDate);
        const isCurrentMonth = cellDate.getMonth() === calMonth;
        const isTodayCell = cellDate.getTime() === todayD.getTime();
        const isInSprint = sprintRanges.some(r => ds >= r.start && ds <= r.end);
        const sprintStyle = isInSprint ? 'background:var(--accent-glow);' : '';
        // Single-day (point-in-time) events only
        const dayEvents = events.filter(ev => {
          if (ev.ranged) return false;
          if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
          return ev.date === ds;
        });
        const CHIP_LIMIT = 2;
        const visibleEvents = dayEvents.slice(0, CHIP_LIMIT);
        const overflow = dayEvents.length - CHIP_LIMIT;
        const chips = visibleEvents.map(ev => {
          const color = chipColor(ev);
          const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
          return `<div class="cal-task-chip" ${taskId} style="border-left:2px solid ${color}" title="${ev.title}">${ev.title}</div>`;
        }).join('');
        const overflowChip = overflow > 0 ? `<div class="cal-overflow-btn" data-date="${ds}">+${overflow}</div>` : '';
        return `<div class="calendar-day ${isCurrentMonth?'':'other-month'} ${isTodayCell?'today':''}" style="${sprintStyle}grid-column:${col+1}" data-date="${ds}">
          <div class="cal-day-num">${cellDate.getDate()}</div>
          <div class="cal-tasks" style="margin-top:${barAreaHeight}px">${chips}${overflowChip}</div>
        </div>`;
      }).join('');

      // Spanning bar elements — placed in the same grid using grid-column
      const barEls = bars.map(({ ev, startCol, endCol, lane }) => {
        const color = chipColor(ev);
        const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
        const isStart = ev.start >= dateStr(weekDates[0]);
        const isEnd   = ev.end   <= dateStr(weekDates[6]);
        const borderRadiusLeft  = isStart ? '3px' : '0';
        const borderRadiusRight = isEnd   ? '3px' : '0';
        const topOffset = 22 + lane * 20; // below day number
        return `<div class="cal-span-bar" ${taskId} title="${ev.title}"
          style="grid-column:${startCol+1}/${endCol+2};grid-row:1;
                 top:${topOffset}px;background:${color};
                 border-radius:${borderRadiusLeft} ${borderRadiusRight} ${borderRadiusRight} ${borderRadiusLeft};">
          <span class="cal-span-bar-label">${ev.title}</span>
        </div>`;
      }).join('');

      return `<div class="cal-week-row">${cells}${barEls}</div>`;
    }).join('');

    return `<div class="calendar-month-wrap">
      <div class="cal-day-headers-row">${dayHeaders}</div>
      ${weekRows}
    </div>`;
  }

  function buildScopedCal(numDays) {
    // Week/3-day/day views: show numDays columns starting from calAnchorDate
    const start = new Date(calAnchorDate); start.setHours(0,0,0,0);
    const todayD = new Date(); todayD.setHours(0,0,0,0);
    const days = [];
    for (let i = 0; i < numDays; i++) days.push(dateAdd(start, i));
    const wStart = dateStr(days[0]);
    const wEnd   = dateStr(days[days.length - 1]);

    const headers = days.map(d => {
      const isT = d.getTime() === todayD.getTime();
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return `<div class="cal-day-header ${isT?'today':''}" style="${isT?'color:var(--accent);font-weight:600':''}">
        ${dayNames[d.getDay()]} ${d.getDate()}
      </div>`;
    }).join('');

    // Compute spanning bars for this window
    const rangedEvs = events.filter(ev => {
      if (!ev.ranged) return false;
      if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
      return ev.end >= wStart && ev.start <= wEnd;
    });
    const lanes = [];
    const bars = rangedEvs.map(ev => {
      const clampedStart = ev.start < wStart ? wStart : ev.start;
      const clampedEnd   = ev.end   > wEnd   ? wEnd   : ev.end;
      const startCol = days.findIndex(d => dateStr(d) === clampedStart);
      const endCol   = days.findIndex(d => dateStr(d) === clampedEnd);
      let lane = lanes.findIndex(laneEnd => laneEnd < clampedStart);
      if (lane === -1) { lane = lanes.length; lanes.push(clampedEnd); }
      else { lanes[lane] = clampedEnd; }
      return { ev, startCol, endCol, lane };
    });
    const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), -1);
    const barAreaHeight = maxLane >= 0 ? (maxLane + 1) * 20 + 4 : 0;

    const cells = days.map((d, col) => {
      const ds = dateStr(d);
      const isT = d.getTime() === todayD.getTime();
      const isInSprint = sprintRanges.some(r => ds >= r.start && ds <= r.end);
      const sprintStyle = isInSprint ? 'background:var(--accent-glow);' : '';
      // Only point-in-time events
      const dayEvents = events.filter(ev => {
        if (ev.ranged) return false;
        if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
        return ev.date === ds;
      });
      const chips = dayEvents.map(ev => {
        const color = chipColor(ev);
        const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
        return `<div class="cal-task-chip" ${taskId} style="border-left:2px solid ${color}" title="${ev.title}">${ev.title}</div>`;
      }).join('');
      return `<div class="calendar-day ${isT?'today':''}" style="${sprintStyle}grid-column:${col+1};min-height:120px" data-date="${ds}">
        <div class="cal-tasks" style="margin-top:${barAreaHeight}px">${chips||'<div style="color:var(--text-muted);font-size:11px">—</div>'}</div>
      </div>`;
    }).join('');

    const barEls = bars.map(({ ev, startCol, endCol, lane }) => {
      const color = chipColor(ev);
      const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
      const isStart = ev.start >= wStart;
      const isEnd   = ev.end   <= wEnd;
      const blr = isStart ? '3px' : '0';
      const brr = isEnd   ? '3px' : '0';
      const topOffset = 20 + lane * 20;
      return `<div class="cal-span-bar" ${taskId} title="${ev.title}"
        style="grid-column:${startCol+1}/${endCol+2};grid-row:1;top:${topOffset}px;background:${color};border-radius:${blr} ${brr} ${brr} ${blr};">
        <span class="cal-span-bar-label">${ev.title}</span>
      </div>`;
    }).join('');

    const gridCols = `grid-template-columns:repeat(${numDays},1fr)`;
    return `<div class="cal-day-headers-row" style="${gridCols.replace('grid-template-columns','grid-template-columns')}">${headers}</div><div class="cal-week-row" style="${gridCols}">${cells}${barEls}</div>`;
  }

  // Gantt / timeline view for ranged tasks
  function buildGantt() {
    // Show current month as the timeline window
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth+1, 0);
    const totalDays = lastDay.getDate();

    // Collect only ranged tasks + single-day tasks with due dates in this month
    const rangedEvs = events.filter(ev => {
      if (ev.type !== 'task') return false;
      if (ev.ranged) {
        return ev.end >= dateStr(firstDay) && ev.start <= dateStr(lastDay);
      }
      return ev.date >= dateStr(firstDay) && ev.date <= dateStr(lastDay);
    });

    if (!rangedEvs.length) {
      return `<div style="color:var(--text-muted);font-size:13px;padding:24px 0">No tasks with dates in ${monthNames[calMonth]} ${calYear}. Add start/due dates to tasks to see them here.</div>`;
    }

    // Day header row
    const dayNums = [];
    for (let i = 1; i <= totalDays; i++) dayNums.push(i);
    const dayHeaderRow = dayNums.map(d => {
      const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const todayStr = dateStr(new Date());
      const isT = ds === todayStr;
      return `<div class="gantt-day-hdr ${isT?'gantt-today-col':''}">${d}</div>`;
    }).join('');

    const rows = rangedEvs.map(ev => {
      const color = chipColor(ev);
      const startDs = ev.ranged ? ev.start : ev.date;
      const endDs = ev.ranged ? ev.end : ev.date;
      const clampedStart = startDs < dateStr(firstDay) ? dateStr(firstDay) : startDs;
      const clampedEnd = endDs > dateStr(lastDay) ? dateStr(lastDay) : endDs;

      const startDay = parseInt(clampedStart.split('-')[2], 10);
      const endDay = parseInt(clampedEnd.split('-')[2], 10);
      const spanDays = endDay - startDay + 1;
      const leftPct = ((startDay - 1) / totalDays) * 100;
      const widthPct = (spanDays / totalDays) * 100;

      const taskAttr = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
      return `<div class="gantt-row">
        <div class="gantt-label" title="${ev.title}">${ev.title}</div>
        <div class="gantt-track">
          ${dayNums.map(d => {
            const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const todayStr = dateStr(new Date());
            return `<div class="gantt-cell ${ds === todayStr ? 'gantt-today-col' : ''}"></div>`;
          }).join('')}
          <div class="gantt-bar cal-event-${ev.type === 'task' ? 'task' : 'other'}" ${taskAttr}
            style="left:${leftPct}%;width:${widthPct}%;background:${color};border-radius:3px;opacity:0.85"
            title="${ev.title}: ${startDs} → ${endDs}">
            <span class="gantt-bar-label">${ev.title}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="gantt-wrap">
      <div class="gantt-header-row">
        <div class="gantt-label"></div>
        <div class="gantt-track gantt-day-headers">${dayHeaderRow}</div>
      </div>
      ${rows}
    </div>`;
  }

  function buildNav() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let label = '';
    const scopes = [
      { id:'month', label:'Month' }, { id:'week', label:'Week' },
      { id:'3day', label:'3 Days' }, { id:'day', label:'Day' }, { id:'gantt', label:'Timeline' }
    ];
    const scopeBtns = scopes.map(s =>
      `<button class="btn btn-sm ${calScope===s.id?'btn-primary':'btn-ghost'} cal-scope-btn" data-scope="${s.id}">${s.label}</button>`
    ).join('');

    if (calScope === 'month' || calScope === 'gantt') {
      label = `${monthNames[calMonth]} ${calYear}`;
    } else {
      const numDays = calScope === 'week' ? 7 : calScope === '3day' ? 3 : 1;
      const endD = dateAdd(calAnchorDate, numDays - 1);
      label = `${calAnchorDate.getDate()} ${monthNames[calAnchorDate.getMonth()]} – ${endD.getDate()} ${monthNames[endD.getMonth()]} ${endD.getFullYear()}`;
    }
    return `<div class="cal-nav">
      <button class="btn btn-sm btn-ghost" id="cal-prev">‹ Prev</button>
      <span style="font-family:'DM Mono',monospace;font-size:14px;min-width:200px;text-align:center">${label}</span>
      <button class="btn btn-sm btn-ghost" id="cal-next">Next ›</button>
      <div style="display:flex;gap:4px;margin-left:16px">${scopeBtns}</div>
    </div>`;
  }

  function buildContent() {
    if (calScope === 'month') return buildMonthCal();
    if (calScope === 'week') return buildScopedCal(7);
    if (calScope === '3day') return buildScopedCal(3);
    if (calScope === 'day') return buildScopedCal(1);
    if (calScope === 'gantt') return buildGantt();
    return buildMonthCal();
  }

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Calendar</h1>
      <div class="col-picker-wrap" style="position:relative">
        <button class="btn btn-sm btn-ghost" id="cal-filter-btn" title="Filter event types">⊟ Filter</button>
        <div class="col-picker-dropdown hidden" id="cal-filter-dropdown">
          ${CAL_EVENT_TYPES.map(t => `<label class="col-picker-item"><input type="checkbox" class="cal-type-check" data-type="${t}" ${calEventTypes.includes(t)?'checked':''}> ${t}s</label>`).join('')}
        </div>
      </div>
    </div>
    <div class="cal-legend" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;font-size:12px">
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:50%;margin-right:4px"></span>Tasks</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:50%;margin-right:4px"></span>Goals</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--warning);border-radius:50%;margin-right:4px"></span>Projects</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:#9b7fe8;border-radius:50%;margin-right:4px"></span>Sprints</span>
    </div>
    <div id="cal-content">${buildNav()}${buildContent()}</div>
  </div>`;

  // Calendar filter picker
  const calFilterBtn = document.getElementById('cal-filter-btn');
  const calFilterDrop = document.getElementById('cal-filter-dropdown');
  calFilterBtn.onclick = (e) => { e.stopPropagation(); calFilterDrop.classList.toggle('hidden'); };
  document.querySelectorAll('.cal-type-check').forEach(chk => {
    chk.onchange = () => {
      calEventTypes = [...document.querySelectorAll('.cal-type-check:checked')].map(c => c.dataset.type);
      if (!calEventTypes.length) calEventTypes = ['task'];
      localStorage.setItem('calEventTypes', JSON.stringify(calEventTypes));
      document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
      rebind();
    };
  });

  function rebind() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      if (calScope === 'month' || calScope === 'gantt') {
        calMonth--; if (calMonth<0){calMonth=11;calYear--;}
      } else {
        const step = calScope==='week'?-7:calScope==='3day'?-3:-1;
        calAnchorDate = dateAdd(calAnchorDate, step);
      }
      document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
      rebind();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      if (calScope === 'month' || calScope === 'gantt') {
        calMonth++; if (calMonth>11){calMonth=0;calYear++;}
      } else {
        const step = calScope==='week'?7:calScope==='3day'?3:1;
        calAnchorDate = dateAdd(calAnchorDate, step);
      }
      document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
      rebind();
    });
    document.querySelectorAll('.cal-scope-btn').forEach(btn => {
      btn.onclick = () => {
        calScope = btn.dataset.scope;
        localStorage.setItem('calScope', calScope);
        // Sync anchor date for scoped views
        if (calScope === 'week') {
          // align to Monday of current week
          const d = new Date(); const dow = d.getDay(); const diff = dow === 0 ? -6 : 1 - dow;
          calAnchorDate = dateAdd(d, diff);
        } else if (calScope !== 'month' && calScope !== 'gantt') {
          calAnchorDate = new Date();
        }
        document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
        rebind();
      };
    });
    document.querySelectorAll('.cal-task-chip[data-task-id]').forEach(chip => {
      chip.onclick = (e) => { e.stopPropagation(); showTaskSlideover(chip.dataset.taskId); };
    });
    document.querySelectorAll('.cal-span-bar[data-task-id]').forEach(bar => {
      bar.onclick = (e) => { e.stopPropagation(); showTaskSlideover(bar.dataset.taskId); };
    });
    document.querySelectorAll('.gantt-bar.cal-event-task').forEach(bar => {
      bar.onclick = (e) => { e.stopPropagation(); showTaskSlideover(bar.dataset.taskId); };
    });
    // Overflow "show more" — expand cell inline
    document.querySelectorAll('.cal-overflow-btn').forEach(btn => {
      if (btn.classList.contains('cal-collapse-btn')) return;
      btn.onclick = (e) => {
        e.stopPropagation();
        const ds = btn.dataset.date;
        const dayEvents = events.filter(ev => {
          if (ev.ranged) return false;
          if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
          return ev.date === ds;
        });
        const cell = btn.closest('.calendar-day');
        const tasksContainer = cell.querySelector('.cal-tasks');
        tasksContainer.innerHTML = dayEvents.map(ev => {
          const color = chipColor(ev);
          const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
          return `<div class="cal-task-chip" ${taskId} style="border-left:2px solid ${color}" title="${ev.title}">${ev.title}</div>`;
        }).join('') + `<div class="cal-overflow-btn cal-collapse-btn">▲ less</div>`;
        cell.querySelector('.cal-collapse-btn').onclick = (e2) => {
          e2.stopPropagation();
          document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
          rebind();
        };
        cell.querySelectorAll('.cal-task-chip[data-task-id]').forEach(chip => {
          chip.onclick = (e2) => { e2.stopPropagation(); showTaskSlideover(chip.dataset.taskId); };
        });
      };
    });
  }
  rebind();
}


async function renderPomodoro() {
  if (allTasksCache.length === 0) {
    try { allTasksCache = await api('GET', '/api/tasks') || []; } catch(e) {}
  }
  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Pomodoro</h1>
    </div>
    <div class="pomodoro-wrap">
      <div class="pom-search-wrap">
        <input type="text" id="pom-task-search" placeholder="Search task to focus on…" autocomplete="off" style="width:360px" />
        <div class="pom-suggestions" id="pom-suggestions"></div>
      </div>
      <div id="pom-selected-task" class="pomodoro-task-name" style="min-height:20px"></div>
      <div class="pomodoro-ring" id="pom-ring">
        <div class="pomodoro-time" id="pom-time">25:00</div>
        <div class="pomodoro-label" id="pom-label">Work</div>
      </div>
      <div class="pomodoro-controls">
        <button class="btn btn-primary" id="pom-start">Start</button>
        <button class="btn btn-ghost" id="pom-pause">Pause</button>
        <button class="btn btn-ghost" id="pom-reset">Reset</button>
        <button class="btn btn-ghost" id="pom-break">Break (5m)</button>
      </div>
      <div id="pom-log" style="width:100%;max-width:400px;margin-top:8px"></div>
    </div>
  </div>`;

  function fmt(s) {
    const m = Math.floor(s/60), sec = s%60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function updateDisplay() {
    document.getElementById('pom-time').textContent = fmt(pomState.seconds);
    document.getElementById('pom-label').textContent = pomState.mode === 'work' ? 'Work' : 'Break';
    const ring = document.getElementById('pom-ring');
    ring.className = `pomodoro-ring${pomState.running ? (pomState.mode==='work'?' active':' break') : ''}`;
  }

  function renderLog() {
    const log = document.getElementById('pom-log');
    if (!log) return;
    if (!pomState.finished.length) { log.innerHTML = ''; return; }
    log.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Completed today</div>` +
      pomState.finished.map(e => `<div style="font-size:12px;color:var(--text-muted);padding:3px 0;border-bottom:1px solid var(--border-light)">✓ ${e.task} · ${e.time}</div>`).join('');
  }

  // Task search
  const searchInput = document.getElementById('pom-task-search');
  const suggestions = document.getElementById('pom-suggestions');

  searchInput.oninput = () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) { suggestions.innerHTML = ''; return; }
    const matches = allTasksCache.filter(t => t.title.toLowerCase().includes(q) && t.status !== 'done').slice(0, 8);
    suggestions.innerHTML = matches.map(t =>
      `<div class="pom-suggestion" data-id="${t.id}" data-title="${t.title.replace(/"/g,'&quot;')}">${t.title}</div>`
    ).join('') || '<div class="pom-suggestion" style="color:var(--text-muted);cursor:default">No results</div>';
  };

  suggestions.addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    pomState.taskId = parseInt(item.dataset.id);
    pomState.taskTitle = item.dataset.title;
    searchInput.value = item.dataset.title;
    suggestions.innerHTML = '';
    document.getElementById('pom-selected-task').innerHTML = `<span>Focus: </span><span>${pomState.taskTitle}</span>`;
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.pom-search-wrap')) suggestions.innerHTML = '';
  }, { once: false });

  // Timer
  function tick() {
    if (!pomState.running) return;
    pomState.seconds--;
    updateDisplay();
    if (pomState.seconds <= 0) {
      clearInterval(pomTimer); pomTimer = null; pomState.running = false;
      // Beep
      try {
        const ac = new AudioContext();
        const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
        osc.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.3);
      } catch(e) {}
      if (pomState.mode === 'work') {
        // Log it
        const now = new Date();
        pomState.finished.push({ task: pomState.taskTitle || '(no task)', time: now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
        renderLog();
        // PATCH task
        if (pomState.taskId) {
          const t = allTasksCache.find(x => x.id === pomState.taskId);
          const cur = t ? (t.pomodoros_finished || 0) : 0;
          api('PATCH', `/api/tasks/${pomState.taskId}`, { pomodoros_finished: cur + 1 }).catch(()=>{});
          if (t) t.pomodoros_finished = cur + 1;
        }
        // Switch to break
        pomState.mode = 'break'; pomState.seconds = 5*60;
        updateDisplay();
      } else {
        pomState.mode = 'work'; pomState.seconds = 25*60;
        updateDisplay();
      }
    }
  }

  document.getElementById('pom-start').onclick = () => {
    if (pomState.running) return;
    pomState.running = true;
    pomTimer = setInterval(tick, 1000);
    updateDisplay();
  };
  document.getElementById('pom-pause').onclick = () => {
    pomState.running = false;
    clearInterval(pomTimer); pomTimer = null;
    updateDisplay();
  };
  document.getElementById('pom-reset').onclick = () => {
    pomState.running = false;
    clearInterval(pomTimer); pomTimer = null;
    pomState.seconds = pomState.mode === 'work' ? 25*60 : 5*60;
    updateDisplay();
  };
  document.getElementById('pom-break').onclick = () => {
    pomState.running = false;
    clearInterval(pomTimer); pomTimer = null;
    pomState.mode = pomState.mode === 'work' ? 'break' : 'work';
    pomState.seconds = pomState.mode === 'work' ? 25*60 : 5*60;
    document.getElementById('pom-break').textContent = pomState.mode === 'work' ? 'Break (5m)' : 'Work (25m)';
    updateDisplay();
  };

  // Restore selected task
  if (pomState.taskId) {
    document.getElementById('pom-selected-task').innerHTML = `<span>Focus: </span><span>${pomState.taskTitle}</span>`;
    searchInput.value = pomState.taskTitle;
  }
  updateDisplay();
  renderLog();
}

/* ─── Dashboard task list bindings ──────────────────────────────────── */
function bindTaskListEvents() {
  document.querySelectorAll('.task-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.classList.contains('task-check') || e.target.dataset.checkId ||
          e.target.classList.contains('task-toggle-arrow') || e.target.closest('.task-toggle-arrow') ||
          e.target.classList.contains('task-add-sub-btn') || e.target.closest('.task-add-sub-btn')) return;
      showTaskSlideover(row.dataset.taskId);
    };
  });
  document.querySelectorAll('.task-add-sub-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.addSubId);
      const row = btn.closest('.task-row');
      if (!row) return;
      const alreadyOpen = btn.classList.contains('open');
      document.querySelectorAll(`.inline-task-input-row[data-parent-id="${parentId}"]`).forEach(r => r.remove());
      if (alreadyOpen) { btn.classList.remove('open'); return; }
      btn.classList.add('open');
      const inputRow = document.createElement('li');
      inputRow.className = 'inline-task-input-row';
      inputRow.dataset.parentId = parentId;
      inputRow.innerHTML = `
        <input type="text" class="inline-task-title-input" placeholder="New subtask title…" autofocus />
        <button class="btn btn-sm btn-primary inline-task-save-btn">Add</button>
        <button class="btn btn-sm btn-ghost inline-cancel-btn">Cancel</button>`;
      row.after(inputRow);
      inputRow.querySelector('.inline-task-title-input').focus();
      inputRow.querySelector('.inline-cancel-btn').onclick = (e) => { e.stopPropagation(); inputRow.remove(); btn.classList.remove('open'); };
      const saveInline = async () => {
        const title = inputRow.querySelector('.inline-task-title-input').value.trim();
        if (!title) return;
        try {
          await api('POST', '/api/tasks', { title, parent_task_id: parentId, status: 'todo', priority: 'medium' });
          renderDashboard();
        } catch(err) { alert('Error creating subtask: ' + err.message); }
      };
      inputRow.querySelector('.inline-task-save-btn').onclick = (e) => { e.stopPropagation(); saveInline(); };
      inputRow.querySelector('.inline-task-title-input').onkeydown = (e) => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') { inputRow.remove(); btn.classList.remove('open'); } };
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

/* ─── Shared detail-view task event binding ──────────────────────────── */
function bindDetailTaskEvents(onRefresh) {
  document.querySelectorAll('.task-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.classList.contains('task-check') || e.target.dataset.checkId ||
          e.target.classList.contains('task-toggle-arrow') || e.target.closest('.task-toggle-arrow') ||
          e.target.classList.contains('task-add-sub-btn') || e.target.closest('.task-add-sub-btn')) return;
      showTaskSlideover(row.dataset.taskId);
    };
  });
  document.querySelectorAll('.task-check').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      const id = el.dataset.checkId;
      const isDone = el.classList.contains('done');
      try { await api('PATCH', `/api/tasks/${id}`, { status: isDone ? 'todo' : 'done' }); } catch(err) {}
      if (onRefresh) onRefresh();
    };
  });
  document.querySelectorAll('.task-toggle-arrow').forEach(arrow => {
    arrow.onclick = (e) => {
      e.stopPropagation();
      const id = String(arrow.dataset.toggleId);
      if (expandedTasks.has(id)) expandedTasks.delete(id);
      else expandedTasks.add(id);
      if (onRefresh) onRefresh();
    };
  });
  document.querySelectorAll('.task-add-sub-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.addSubId);
      const row = btn.closest('.task-row, .task-table-row');
      if (!row) return;
      const alreadyOpen = btn.classList.contains('open');
      document.querySelectorAll(`.inline-task-input-row[data-parent-id="${parentId}"]`).forEach(r => r.remove());
      if (alreadyOpen) { btn.classList.remove('open'); return; }
      btn.classList.add('open');
      const inputRow = document.createElement('li');
      inputRow.className = 'inline-task-input-row';
      inputRow.dataset.parentId = parentId;
      inputRow.style.paddingLeft = row.style.paddingLeft || '12px';
      inputRow.innerHTML = `
        <input type="text" class="inline-task-title-input" placeholder="New subtask title…" autofocus />
        <button class="btn btn-sm btn-primary inline-task-save-btn">Add</button>
        <button class="btn btn-sm btn-ghost inline-cancel-btn">Cancel</button>`;
      row.after(inputRow);
      inputRow.querySelector('.inline-task-title-input').focus();
      inputRow.querySelector('.inline-cancel-btn').onclick = (e) => { e.stopPropagation(); inputRow.remove(); btn.classList.remove('open'); };
      const saveInline = async () => {
        const title = inputRow.querySelector('.inline-task-title-input').value.trim();
        if (!title) return;
        try {
          await api('POST', '/api/tasks', { title, parent_task_id: parentId, status: 'todo', priority: 'medium' });
          allTasksCache = await api('GET', '/api/tasks?all=1');
          expandedTasks.add(String(parentId));
          if (onRefresh) onRefresh();
        } catch(err) { alert('Error creating subtask: ' + err.message); }
      };
      inputRow.querySelector('.inline-task-save-btn').onclick = (e) => { e.stopPropagation(); saveInline(); };
      inputRow.querySelector('.inline-task-title-input').onkeydown = (e) => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') { inputRow.remove(); btn.classList.remove('open'); } };
    };
  });
  document.querySelectorAll('.add-subtask-inline-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.parentId);
      showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
        allTasksCache = await api('GET', '/api/tasks?all=1');
        if (onRefresh) onRefresh();
      });
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
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="t-start" value="${stripDate(v.start_date)}" /></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" id="t-due" value="${stripDate(v.due_date)}" /></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Focus Block</label><input type="date" id="t-focus" value="${stripDate(v.focus_block)}" /></div>
      <div></div>
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
    <div class="form-group">
      <label class="form-label">Recurring</label>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="t-is-recurring" ${(v.recur_interval||0)>0?'checked':''} style="width:auto" /> Repeating task
        </label>
        <div id="recur-fields" style="display:${(v.recur_interval||0)>0?'flex':'none'};gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--text-muted)">Every</span>
          <input type="number" id="t-recur-interval" value="${v.recur_interval||1}" min="1" style="width:60px" />
          <select id="t-recur-unit">
            ${['days','weeks','months','years'].map(u => `<option value="${u}" ${(v.recur_unit||'').toLowerCase()===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;
}

function collectTaskForm() {
  const isRecurring = document.getElementById('t-is-recurring')?.checked;
  return {
    title: document.getElementById('t-title').value.trim(),
    description: document.getElementById('t-desc').value,
    status: document.getElementById('t-status').value,
    priority: document.getElementById('t-priority').value,
    start_date: document.getElementById('t-start').value || null,
    due_date: document.getElementById('t-due').value || null,
    focus_block: document.getElementById('t-focus').value || null,
    goal_id: document.getElementById('t-goal').value ? parseInt(document.getElementById('t-goal').value) : null,
    project_id: document.getElementById('t-project').value ? parseInt(document.getElementById('t-project').value) : null,
    sprint_id: document.getElementById('t-sprint').value ? parseInt(document.getElementById('t-sprint').value) : null,
    parent_task_id: document.getElementById('t-parent').value ? parseInt(document.getElementById('t-parent').value) : null,
    category_id: document.getElementById('t-category').value ? parseInt(document.getElementById('t-category').value) : null,
    story_points: parseInt(document.getElementById('t-points').value) || 0,
    pomodoros_planned: parseInt(document.getElementById('t-poms').value) || 0,
    recur_interval: isRecurring ? (parseInt(document.getElementById('t-recur-interval')?.value) || 1) : 0,
    recur_unit: isRecurring ? (document.getElementById('t-recur-unit')?.value || 'days') : '',
  };
}

async function showNewTaskModal(presets, afterSave) {
  const resources = await getTaskModalResources();
  const fake = { status: 'todo', priority: 'medium', ...presets };
  openFormSlideover('New Task', taskModalBody(fake, resources));
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('t-is-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recur-fields').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { alert('Title is required'); return; }
    await api('POST', '/api/tasks', data);
    closeFormSlideover();
    if (afterSave) afterSave(); else renderView(currentView);
  };
}

async function showEditTaskModal(task) {
  const resources = await getTaskModalResources();
  openFormSlideover('Edit Task', taskModalBody(task, resources));
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('t-is-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recur-fields').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { alert('Title is required'); return; }
    await api('PATCH', `/api/tasks/${task.id}`, data);
    closeFormSlideover();
    renderView(currentView);
  };
  document.getElementById('modal-delete-btn').onclick = async () => {
    if (!confirm('Delete this task?')) return;
    await api('DELETE', `/api/tasks/${task.id}`);
    closeFormSlideover();
    renderView(currentView);
  };
}

/* ─── Goal Modal ─────────────────────────────────────────────────────── */
async function showGoalModal(goal, afterSave) {
  const v = goal || {};
  const typeOpts = GOAL_TYPES.map(t => `<option value="${t}" ${v.type===t?'selected':''}>${t}</option>`).join('');
  const yearOpts = GOAL_YEARS.map(y => `<option value="${y}" ${v.year===y?'selected':''}>${y}</option>`).join('');
  const statusOpts = ['todo','in_progress','done'].map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  let existingTagIds = [];
  if (v.id) {
    try { existingTagIds = (await api('GET', `/api/goals/${v.id}/tags`) || []).map(t => t.id); } catch(e) {}
  }

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
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="g-start" value="${stripDate(v.start_date)}" /></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" id="g-due" value="${stripDate(v.due_date)}" /></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Value</label><input type="number" id="g-sv" value="${v.start_value||''}" /></div>
      <div class="form-group"><label class="form-label">Current Value</label><input type="number" id="g-cv" value="${v.current_value||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Target Value</label>
      <input type="number" id="g-target" value="${v.target||''}" /></div>
    <div class="form-group"><label class="form-label">Tags</label>
      ${tagPickerHtml(existingTagIds)}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Goal' : 'New Goal', body);
  bindTagPicker();
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
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
    let savedId = v.id;
    if (v.id) await api('PATCH', `/api/goals/${v.id}`, data);
    else { const r = await api('POST', '/api/goals', data); savedId = r?.id; }
    if (savedId) {
      const tagIds = getSelectedTagIds();
      try { await api('PUT', `/api/goals/${savedId}/tags`, { tag_ids: tagIds }); } catch(e) {}
    }
    closeFormSlideover();
    if (afterSave) afterSave();
    else renderGoals();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this goal?')) return;
      await api('DELETE', `/api/goals/${v.id}`);
      closeFormSlideover();
      renderGoals();
    };
  }
}

/* ─── Project Modal ──────────────────────────────────────────────────── */
async function showProjectModal(project, goals, afterSave) {
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

  let existingTagIds = [];
  if (v.id) {
    try { existingTagIds = (await api('GET', `/api/projects/${v.id}/tags`) || []).map(t => t.id); } catch(e) {}
  }

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
    <div class="form-group"><label class="form-label">Tags</label>
      ${tagPickerHtml(existingTagIds)}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Project' : 'New Project', body);
  bindTagPicker();
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
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
    let savedId = v.id;
    if (v.id) await api('PATCH', `/api/projects/${v.id}`, data);
    else { const r = await api('POST', '/api/projects', data); savedId = r?.id; }
    if (savedId) {
      const tagIds = getSelectedTagIds();
      try { await api('PUT', `/api/projects/${savedId}/tags`, { tag_ids: tagIds }); } catch(e) {}
    }
    closeFormSlideover();
    if (afterSave) afterSave();
    else renderProjects();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this project?')) return;
      await api('DELETE', `/api/projects/${v.id}`);
      closeFormSlideover();
      renderProjects();
    };
  }
}

/* ─── Note Modal ─────────────────────────────────────────────────────── */
async function showNoteModal(note, afterSave) {
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
  const selectedTagIds = (v.tags || []).map(t => t.id);

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
    <div class="form-group"><label class="form-label">Tags</label>
      <div class="tag-picker" id="note-tag-picker">${tagPickerHtml(selectedTagIds)}</div>
    </div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Note' : 'New Note', body);
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;

  // Tag picker toggle
  document.querySelectorAll('#note-tag-picker .tag-chip').forEach(chip => {
    chip.onclick = () => chip.classList.toggle('selected');
  });

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
    if (!data.title) { alert('Title is required'); return; }
    let savedId = v.id;
    try {
      if (v.id) {
        await api('PATCH', `/api/notes/${v.id}`, data);
      } else {
        const created = await api('POST', '/api/notes', data);
        if (created) savedId = created.id;
      }
    } catch(err) {
      alert('Error saving note: ' + (err.message || String(err)));
      return;
    }
    // Save tags
    if (savedId) {
      const pickedIds = [...document.querySelectorAll('#note-tag-picker .tag-chip.selected')].map(c => parseInt(c.dataset.tagId));
      try { await api('PUT', `/api/notes/${savedId}/tags`, { tag_ids: pickedIds }); } catch(err) {}
    }
    closeFormSlideover();
    if (afterSave) afterSave(); else renderNotes();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this note?')) return;
      await api('DELETE', `/api/notes/${v.id}`);
      closeFormSlideover();
      if (afterSave) afterSave(); else renderNotes();
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

  openFormSlideover('New Sprint', body);
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
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
    closeFormSlideover();
    renderSprints();
  };
}

/* ─── Resource Modal ─────────────────────────────────────────────────── */
async function showResourceModal(resource, afterSave) {
  const v = resource || {};
  let projects = [], tasks = [], goals = [], notes = [];
  try { [projects, tasks, goals, notes] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/tasks'), api('GET', '/api/goals'), api('GET', '/api/notes')
  ]); } catch(e) {}

  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id)===String(v.project_id)?'selected':''}>${p.title}</option>`).join('');
  const taskOpts = '<option value="">— none —</option>' + tasks.map(t =>
    `<option value="${t.id}" ${String(t.id)===String(v.task_id)?'selected':''}>${t.title}</option>`).join('');

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="r-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Type</label>
      <input type="text" id="r-type" value="${v.resource_type||v.type||''}" placeholder="e.g. link, book, tool…" /></div>
    <div class="form-group"><label class="form-label">URL</label>
      <input type="url" id="r-url" value="${v.url||''}" /></div>
    <div class="form-group"><label class="form-label">Body / Notes</label>
      <textarea id="r-body">${v.body||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="r-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Project</label><select id="r-project">${projOpts}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Task</label><select id="r-task">${taskOpts}</select></div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Resource' : 'New Resource', body);
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('r-title').value.trim(),
      resource_type: document.getElementById('r-type').value || 'note',
      type: document.getElementById('r-type').value || 'note',
      url: document.getElementById('r-url').value || null,
      body: document.getElementById('r-body').value,
      goal_id: document.getElementById('r-goal').value ? parseInt(document.getElementById('r-goal').value) : null,
      project_id: document.getElementById('r-project').value ? parseInt(document.getElementById('r-project').value) : null,
      task_id: document.getElementById('r-task').value ? parseInt(document.getElementById('r-task').value) : null,
    };
    if (!data.title) { alert('Title is required'); return; }
    if (v.id) await api('PATCH', `/api/resources/${v.id}`, data);
    else await api('POST', '/api/resources', data);
    closeFormSlideover();
    if (afterSave) afterSave(); else renderResources();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this resource?')) return;
      await api('DELETE', `/api/resources/${v.id}`);
      closeFormSlideover();
      if (afterSave) afterSave(); else renderResources();
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
  document.getElementById('modal-backdrop').onclick = () => { closeModal(); closeFormSlideover(); closeSlideover(); };

  // Slideover close
  document.getElementById('slideover-close').onclick = closeSlideover;

  // Form slideover close
  document.getElementById('form-slideover-close').onclick = closeFormSlideover;

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

  // Fetch latest GitHub commit SHA for version button
  try {
    const ghRes = await fetch('https://api.github.com/repos/raibis/raibis-lifeos/commits/main');
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      const sha = ghData.sha ? ghData.sha.slice(0, 7) : null;
      if (sha) {
        const vBtn = document.getElementById('version-btn');
        if (vBtn) {
          vBtn.href = `https://github.com/raibis/raibis-lifeos/commit/${ghData.sha}`;
          vBtn.innerHTML = `<span class="nav-icon">⬡</span> v1.0.2-alpha.2 · ${sha}`;
        }
      }
    }
  } catch(e) {}

  renderView('dashboard');
  initAiPanel();
});

/* ─── AI Assistant Panel ─────────────────────────────────────────────── */
const aiState = {
  messages: [],
  isThinking: false,
  isRecording: false,
  recognition: null,
  inputMode: 'text',
  webhook: localStorage.getItem('raibis_webhook') || '',
};

function initAiPanel() {
  const fab = document.getElementById('ai-fab');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-panel-close');
  const sendBtn = document.getElementById('ai-send-btn');
  const input = document.getElementById('ai-input');
  const tabText = document.getElementById('ai-tab-text');
  const tabVoice = document.getElementById('ai-tab-voice');
  const micBtn = document.getElementById('ai-mic-btn');

  if (!fab || !panel) return;

  fab.onclick = () => panel.classList.toggle('open');
  closeBtn.onclick = () => panel.classList.remove('open');

  tabText.onclick = () => aiSwitchMode('text');
  tabVoice.onclick = () => aiSwitchMode('voice');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) aiSend(); }
  });
  sendBtn.onclick = aiSend;
  micBtn.onclick = aiToggleMic;
}

function aiSwitchMode(mode) {
  aiState.inputMode = mode;
  document.getElementById('ai-tab-text').classList.toggle('active', mode === 'text');
  document.getElementById('ai-tab-voice').classList.toggle('active', mode === 'voice');
  document.getElementById('ai-text-area').classList.toggle('hidden', mode !== 'text');
  document.getElementById('ai-voice-area').classList.toggle('hidden', mode !== 'voice');
  if (mode === 'text') document.getElementById('ai-input').focus();
  else aiCheckVoiceSupport();
}

function aiCheckVoiceSupport() {
  const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  document.getElementById('ai-voice-unsupported').classList.toggle('hidden', supported);
  document.getElementById('ai-voice-controls').classList.toggle('hidden', !supported);
}

function aiToggleMic() {
  if (aiState.isRecording) { aiStopRecording(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const r = new SR();
  r.continuous = false;
  r.interimResults = true;
  r.lang = 'en-US';
  aiState.recognition = r;
  r.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    document.getElementById('ai-voice-preview').textContent = transcript;
    if (e.results[e.results.length - 1].isFinal) {
      aiSend(transcript);
      aiStopRecording();
    }
  };
  r.onerror = () => aiStopRecording();
  r.onend = () => { if (aiState.isRecording) aiStopRecording(); };
  r.start();
  aiState.isRecording = true;
  document.getElementById('ai-mic-btn').classList.add('recording');
  document.getElementById('ai-voice-status').textContent = 'Listening…';
}

function aiStopRecording() {
  aiState.isRecording = false;
  if (aiState.recognition) { try { aiState.recognition.stop(); } catch(e) {} aiState.recognition = null; }
  const micBtn = document.getElementById('ai-mic-btn');
  if (micBtn) micBtn.classList.remove('recording');
  const statusEl = document.getElementById('ai-voice-status');
  if (statusEl) statusEl.textContent = 'Tap to speak';
  const previewEl = document.getElementById('ai-voice-preview');
  if (previewEl) previewEl.textContent = '';
}

async function aiSend(text) {
  const input = document.getElementById('ai-input');
  const msg = text || (input ? input.value.trim() : '');
  if (!msg || aiState.isThinking) return;
  if (input && !text) { input.value = ''; input.style.height = 'auto'; document.getElementById('ai-send-btn').disabled = true; }

  aiAddMessage('user', msg);
  const thinking = aiAddThinking();
  aiState.isThinking = true;

  // Update webhook from localStorage in case it changed
  aiState.webhook = localStorage.getItem('raibis_webhook') || '';

  try {
    let reply;
    if (!aiState.webhook) {
      reply = 'No webhook configured. Set your N8N webhook URL in raibis-chat settings (open full chat with ↗ Full).';
    } else {
      const res = await fetch(aiState.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: 'lifeos-panel', timestamp: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { text: await res.text() };
      reply = typeof data === 'string' ? data : (data.text || data.output || JSON.stringify(data));
    }
    thinking.remove();
    aiAddMessage('ai', reply);
  } catch(e) {
    thinking.remove();
    aiAddMessage('ai', `Error: ${e.message}`);
  }
  aiState.isThinking = false;
}

function aiAddMessage(role, content) {
  const feed = document.getElementById('ai-chat-feed');
  const empty = document.getElementById('ai-empty');
  if (empty) empty.style.display = 'none';

  const el = document.createElement('div');
  el.className = `ai-msg from-${role}`;
  const sender = role === 'user' ? 'You' : 'raibis';
  el.innerHTML = `<div class="ai-msg-sender">${sender}</div><div class="ai-msg-bubble">${escHtml(content)}</div>`;
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
  return el;
}

function aiAddThinking() {
  const feed = document.getElementById('ai-chat-feed');
  const el = document.createElement('div');
  el.className = 'ai-msg from-ai';
  el.innerHTML = `<div class="ai-thinking"><div class="ai-thinking-dot"></div><div class="ai-thinking-dot"></div><div class="ai-thinking-dot"></div></div>`;
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
  return el;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
