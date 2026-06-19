# Widget System

Each entity detail view (Goal, Project, Sprint) has a configurable widget grid. Widgets can be shown/hidden, dragged to reorder, and custom widgets can be written in JavaScript.

## Using Widgets

Click **Widgets ⚙** in the view header to open the widget manager. From there you can:

- **Reorder** — drag the ⠿ handle to change widget order
- **Show/Hide** — toggle the switch to show or hide a widget
- **Add** — pick a built-in type from the dropdown and click Add
- **Remove** — click ✕ next to any custom widget to delete it
- **Reset** — restore the default layout

Layout is saved in `localStorage` per entity type (`widget_layout_goal`, `widget_layout_project`, `widget_layout_sprint`).

## Built-in Widget Types

| Type         | Description |
|--------------|-------------|
| `tasks`      | Task list (tree, with expand/collapse) |
| `notes`      | Note cards |
| `resources`  | Resource links |
| `projects`   | Project cards with progress bar |
| `properties` | Editable property rows (status, tags, dates, …) |
| `editor`     | EditorJS rich-text block editor |
| `comments`   | Comment thread |
| `metrics`    | Goal metrics (start / current / target) |
| `custom`     | User-written JavaScript widget |

## Creating a Custom Widget

Click **Widgets ⚙ → + New Custom Widget**. You'll get a code editor with this signature:

```js
// Parameters:
//   entity   — string: 'goal' | 'project' | 'sprint'
//   entityId — number
//   data     — full API response for the entity

// Return an HTML string.

const tasks = data.tasks || [];
return `<div style="padding:8px">
  <strong>${data.title}</strong>
  <p style="color:var(--text-muted);margin-top:4px">${tasks.length} task(s)</p>
</div>`;
```

### `data` object fields (varies by entity)

**Common fields**
- `data.id`, `data.title`, `data.status`, `data.description`
- `data.tags` — array of tag objects `{ id, name, color }`
- `data.tasks` — array of task objects
- `data.notes` — array of note objects
- `data.resources` — array of resource objects
- `data.content_json` — EditorJS JSON string (rich content)
- `data.created_at`, `data.updated_at`

**Goal-specific**
- `data.type`, `data.year`, `data.due_date`
- `data.start_value`, `data.current_value`, `data.target`
- `data.projects` — related project objects

**Project-specific**
- `data.goal_id`, `data.goal_title`
- `data.macro_area`, `data.kanban_col`
- `data.start_date`, `data.due_date`
- `data.progress` — `{ total, done, pct }`

**Sprint-specific**
- `data.project_id`, `data.project_title`
- `data.start_date`, `data.end_date`
- `data.story_points`
- `data.progress` — `{ total, done, pct }`

### Available CSS variables

Use design-system variables in your HTML:

```
--color-text          main text
--color-text-secondary muted text
--color-accent        accent color (black in light mode)
--color-surface       card/widget background
--color-border        border color
--color-danger        red
--color-success       green
```

### Example: Sprint velocity card

```js
const done = (data.tasks || []).filter(t => t.status === 'done').length;
const total = (data.tasks || []).length;
const pts = data.story_points || 0;
const pct = total > 0 ? Math.round(done / total * 100) : 0;
return `
  <div style="display:flex;gap:16px;flex-wrap:wrap;padding:8px 0">
    <div style="text-align:center">
      <div style="font-size:28px;font-weight:700">${pct}%</div>
      <div style="font-size:11px;color:var(--color-text-secondary)">Complete</div>
    </div>
    <div style="text-align:center">
      <div style="font-size:28px;font-weight:700">${done}/${total}</div>
      <div style="font-size:11px;color:var(--color-text-secondary)">Tasks</div>
    </div>
    ${pts ? `<div style="text-align:center">
      <div style="font-size:28px;font-weight:700">${pts}</div>
      <div style="font-size:11px;color:var(--color-text-secondary)">Story Pts</div>
    </div>` : ''}
  </div>`;
```

## Storage

Custom widget definitions are stored in `localStorage` under `widget_custom_defs` as a JSON array:

```json
[
  {
    "id": "cw-1718000000000",
    "name": "Sprint Velocity",
    "code": "..."
  }
]
```

Widget layouts per entity type:

```json
// localStorage key: widget_layout_goal
[
  { "id": "w-tasks", "type": "tasks", "label": "Direct Tasks", "visible": true },
  { "id": "w-editor", "type": "editor", "label": "Content", "visible": true }
]
```
