# Svelte migration — component source

This is the source for individual UI controls being ported from `app.js`'s
hand-rolled HTML-string + manual-event-rebind pattern to Svelte components,
one at a time. It coexists with the vanilla app — nothing here replaces
`app.js`'s routing, data-fetching, or page-level rendering.

## How it fits together

- `npm run build` compiles everything under `src/` into a single IIFE bundle
  at `../public/svelte/bundle.js` (see `vite.config.js`).
- `../public/index.html` loads that bundle via a plain `<script>` tag,
  before `app.js`.
- `src/main.js` exposes mount functions on `window.RaibisSvelte`, e.g.
  `window.RaibisSvelte.mountCheckboxProp(targetEl, props)`.
- `app.js` renders a placeholder `<span>` where a component should go
  (instead of the old raw HTML control), then — in the same post-render
  binding step that used to attach `.onchange` handlers — calls the
  matching `window.RaibisSvelte.mount*` function on that placeholder.
- Components take plain data props + callback props (e.g. `onChange`) and
  never call `setCustomPropValue`/`api()` etc. directly — the app.js call
  site wires the callback to whatever the vanilla state layer needs. This
  keeps components portable and testable without dragging in app.js's
  globals.
- **Mount/unmount lifecycle**: Svelte 5 does NOT auto-cleanup a mounted
  component's effects when its DOM is discarded via `innerHTML =` (only
  `unmount()` does that). `bindInlinePropPanel` mounts into every
  `.svelte-*-mount` placeholder, collects the returned instances, and
  unmounts them in the same "panel left the DOM" `MutationObserver` check
  that already existed for cleaning up its `propDefsChanged` listener. Any
  new panel/row-level binding function that starts mounting components
  needs the same pattern — track instances, unmount when that DOM is
  discarded — or you leak reactive effects on every re-render.

## Rebuilding after a change

```bash
cd raibis/gui/svelte-src
npm run build
```

This only needs to run when files under `svelte-src/` change — `make web`
/ `make app` / `make hard` sync `raibis/gui/public/svelte/` (the build
output) into the Go embed dir as-is, same as they do for `app.js`. There's
also `make svelte-build` if you want to do it as a separate step.

## Ported so far

All live in `buildInlinePropPanel`/`bindInlinePropPanel` (app.js) — the
inline property panel shown in every entity's detail slideover (Task,
Project, Goal, Sprint, Note, Resource, custom entity types). **Every
custom property type is now Svelte-driven** — this closes out the
property panel as a migration milestone.

- `CheckboxProp.svelte` — checkbox-type control. First component ported;
  establishes the mount-into-placeholder pattern above.
- `TextProp.svelte` — text/number/email/phone/url control. Click to edit
  inline, blur/Enter to save, Escape to cancel; url values render as a
  clickable link when not editing. Owns its edit UI entirely — no vanilla
  global involved.
- `DateProp.svelte`, `SelectProp.svelte`, `RelationProp.svelte`,
  `RollupProp.svelte` — these are deliberately "dumb": they display a value
  (RelationProp/RollupProp take pre-rendered HTML from `relationChipHtml`/
  `renderRollupValue` via `{@html}` so the visual can't drift from every
  other place in the app that renders the same thing) and expose a single
  `onEditRequest` callback prop. The actual editing UI stays 100% vanilla
  (`openSingleDatePickerGlobal`, `openSingleSelectPicker`,
  `openRelationPicker` — a new standalone function extracted verbatim from
  the old click handler including all the bilateral-sync logic —
  `showAddRollupPanel`). After an edit, the vanilla picker calls
  `onRerender()` (full panel rebuild + remount) rather than patching the
  component's props in place — simpler and reuses the mount/unmount
  lifecycle that already has to exist, at the cost of a full panel
  re-render per edit instead of a targeted update.
- `MultiSelectProp.svelte` — the one exception to "dumb display": chip
  removal is handled directly in the component (`onRemove` callback,
  no vanilla global needed for that half) since it doesn't need a picker
  UI; adding a new value still delegates to `openMultiSelectPicker` via
  `onEditRequest`, same shape as the others.

## Task list row (taskRowHtml)

`TaskRowContent.svelte` renders a task row's title, meta chips,
custom-prop chips, and right-aligned due-date cluster (all pre-rendered
HTML from the existing vanilla chip/badge functions, passed through via
`{@html}` — same approach as RelationProp/RollupProp). It's deliberately
presentational, same reasoning as the property panel's "dumb" components:
row click (→ open slideover), the ctx-handle context menu, and the
subtask toggle-arrow all stay vanilla siblings in the `<li>` that
`taskRowHtml()` still builds — none of that wiring needed to move, and
ctx-handle specifically is shared infrastructure used by every entity
type, not worth re-deriving per component.

`taskRowHtml()` is called from ~8 places (dashboard widgets, the main
Tasks list, entity-detail "Tasks" widgets) that each independently
rebuild their own slice of the DOM, so mount/unmount can't live in one
panel-scoped closure like the property panel's does. Instead there's a
shared module-level registry (`_taskRowSvelteInstances`, a `Map` from
mount element → instance) plus a single `MutationObserver` on
`document.body` that unmounts any instance whose element leaves the DOM
— call `mountTaskRowSvelteInstances(root)` after inserting HTML that may
contain new `.svelte-taskrow-mount` placeholders (it's idempotent,
skips already-mounted elements). This is called from the three distinct
"post-render, wire this task list" functions that between them cover
every `taskRowHtml()` call site: `bindTaskListEvents` (dashboard),
`bindDetailTaskEvents` (Sprint/Project/Goal full-page "Tasks" widget),
and `bindTasksContentEvents` (the main Tasks page itself — found by
testing live, not by reading the call graph; it's a third, separate bind
function that doesn't share a name with the other two).

**Scope note**: this covers `taskRowHtml()`'s callers only — the
*slideover's own* simpler "Tasks" widget (Project/Sprint/Goal detail,
title + status chip only, no chips/dates) is a different, already-simple
hand-rolled renderer that was intentionally left alone; unifying it with
the richer row would be a visual redesign, not a straight port.

## Task cards (card view + kanban view)

`TaskCardContent.svelte` covers the Tasks page's own `buildCardsView`/
`buildKanbanView` (different markup than the list row — `kanban-card`/
`task-card-item` classes, not `taskRowHtml`, and only used by the main
Tasks page, not the dashboard/detail widgets). One component serves
both views since their structure is nearly identical (header + meta
chips + custom chips; card view additionally has a project line and a
subtask subtree).

Unlike TaskRowContent, **ctx-handle lives inside this component** rather
than as a vanilla sibling. Reason: here it's a flex child of
`.kanban-card-header` alongside the title (`display:flex;
justify-content:space-between`) — pulling it out to a sibling position
would've changed the header's layout, whereas in the list row ctx-handle
was already a `<li>`-level sibling with no such flex dependency. The
tradeoff: `bindCtxHandles()` must run *after* the card mount now, or it
queries for `.ctx-handle` elements that don't exist yet. `mountTaskRowSvelteInstances`
now mounts both `.svelte-taskrow-mount` and `.svelte-taskcard-mount`
placeholders (shared registry/observer), and `bindTasksContentEvents`
(the only bind function that renders cards/kanban) was reordered to
mount before calling `bindCtxHandles()` — this is called out explicitly
in both places since it's an easy invariant to break by pasting a new
`bindCtxHandles()` call in the wrong order.

The outer wrapper (`.task-card-item[data-task-id]` / `.kanban-card[data-task-id]`,
carrying the cursor style and — for kanban — the mousedown-based drag
binding from `bindKanbanDrag`) stays vanilla, same reasoning as
`taskRowHtml()`'s `<li>`: those bindings only need the outer element to
exist, not care what's inside it.

## Subtask table (Task's own slideover)

`SubtaskRow.svelte` mounts directly into each `<tr>` of the "SUBTASKS (N)"
mini-table shown inside a Task's slideover (title/status/priority/due,
nested to arbitrary depth via the expand chevron). Same shape as
TaskCardContent: the chevron keeps its original `sub-table-toggle` class
so the existing `bindSubtaskTableEvents()` binding works unchanged, as
long as it runs after the mount (same ordering requirement, same reason
— the chevron is Svelte-rendered content, not a vanilla sibling).

Lifecycle here differs from the row/card registries: this table has
exactly one call site (`renderSubtaskTable()`, inside `showTaskSlideover`),
so instead of a shared module-level registry it uses a local array that's
explicitly unmounted at the top of `renderSubtaskTable()` before the next
`innerHTML` replace (covers the common case — expanding/collapsing a
branch re-renders the whole table), plus a one-time `MutationObserver` as
a backstop for the "slideover closes without re-rendering" case that the
explicit unmount doesn't reach.

## Comments

`CommentSection.svelte` is shared by every entity type's comment thread
(Task/Project/Goal/Note/Sprint/Resource all call the same
`bindCommentSection()` — that's the one function this needed to change,
so all ~8 call sites picked it up automatically). Unlike the row/card/
subtask components, this one owns real state (the comment list, the
input value) rather than just formatting a display — there's genuine
interactivity (send, clear input, re-render the list) that isn't just
"click to delegate elsewhere."

It still doesn't call `api()`/`relativeTime()` directly, keeping with
the rest of the migration's rule: comments arrive pre-formatted via
`formatCommentsForDisplay()` ({initial, author, relTime, text}), and
`onSend(body)` is a callback that performs the actual POST + refetch in
app.js and returns the fresh, pre-formatted list, which the component
sets as its own local state. `buildCommentSection()` still renders the
static `.comment-section-header` ("Comments") as a vanilla sibling —
only the list + input row are the mount.

## Task table view

`TaskTableRow.svelte` mounts directly into each `<tr>` of the Tasks
page's table view. Every cell — ctx-handle, the title cell (toggle-
arrow/add-sub-btn, icon slot, title link, comment badge), every visible
built-in column, and every custom-prop column (via the same
`customPropCell()` every other entity's table view already uses) — is
pre-rendered `<td>...</td>` HTML from the existing column-def `cell()`
functions in `buildTableView()`, concatenated into one blob and passed
through via a single `{@html}`. This component doesn't reformat or
restructure any of it — unlike the other pieces ported so far, table
view had no real bug-duplication problem to fix (it's already a single
centralized function), so the value here is purely completing the
pattern and owning the mount/unmount lifecycle instead of raw
`innerHTML` replacement, not fixing anything that was broken.

Reuses the same shared row/card mount registry (a 4th
`.svelte-tasktablerow-mount` branch in `mountTaskRowSvelteInstances`)
rather than introducing a new one, since it's called from the same
`bindTasksContentEvents()` that already mounts before `bindCtxHandles()`
— no new ordering work needed, the existing reorder from the card/kanban
round already covers it.

Verified live: all built-in columns (project/goal/status/priority/due/
tags/points/category/recurrence/description/parent-task) plus a custom
checkbox column render correctly; the inline status `<select>` persists
a change to the backend; expand/collapse shows the nested child row
with its own working inline `<select>`; title-link click opens the
right task's slideover with correct breadcrumb; ctx-handle context menu
opens. Zero console errors, no duplicate mounts.

## Standard list row (every other entity's list view)

`StandardListRowContent.svelte` covers `buildStandardListRow()` — the
shared list-row skeleton used by Project, Goal, Sprint, Note, Resource,
and custom entity types (Task's own list view has its own
`taskRowHtml()`/`TaskRowContent`, already ported). Same shape as
TaskRowContent, and actually simpler to reason about: ctx-handle, the
icon slot, and `afterHandleHtml` (e.g. custom entities' subentity
expand arrow) were already vanilla siblings *outside* `.task-content`
in the original markup, so nothing interactive lives inside the mount
and there's no ctx-handle-ordering concern like TaskCardContent/
TaskTableRow had — call `mountTaskRowSvelteInstances()` anywhere in
each entity's bind function, order doesn't matter here.

Unlike table view, this one *did* have a real duplication footprint:
six independent call sites (`buildStandardListRow` calls in Project/
Goal/Note/Sprint/Resource/custom-entity list builders), each needing
its own bind function updated — `bindProjEvents`, `bindGoalEvents`,
`bindNoteEvents`, `bindSprintEvents`, `bindResEvents`, and custom
entities' `bindRows()` (scoped to `main`, matching that module's
existing `bindCtxHandles(main)` pattern) all now call
`mountTaskRowSvelteInstances()`.

Verified live across all six: Project, Goal, Note, Sprint, and Resource
list views all render correctly (chips, colored dates, relation chips
for Sprint's project link) with zero console errors; row click opens
the right slideover; ctx-handle context menu opens. Also verified a
freshly-created custom entity type end-to-end (list render, row click →
slideover) to confirm the `bindRows()`-scoped path works the same way.

## Standard card body (Project, Goal, Note, Resource card views)

`StandardCardContent.svelte` covers the body of `buildProjectCard()`,
`buildGoalCard()`, `buildNoteCard()`, and Resource's `buildCards()` —
unlike list view, there's no shared *vanilla* builder here (each entity
independently implements its own card function), so this is one Svelte
component reused by four still-separate vanilla wrapper functions
rather than a single shared call site.

The header (`.flex-between` row with ctx-handle + `.card-title`/
`.note-title`) stays vanilla, same reasoning as
`StandardListRowContent`'s header: nothing interactive lives below it.
Everything below — chip row, entity-specific extras (Project/Goal's
progress bar, Note's `.note-body-preview`), and custom-prop chips — is
computed into one `bodyHtml` string exactly as it was inlined before,
then passed through a `<span class="svelte-stdcard-mount"
data-body="...">` placeholder via `{@html}`. Same "don't reformat, just
own the mount lifecycle" approach as `TaskTableRow`/table view.

Reuses the shared row/card mount registry (a 6th
`.svelte-stdcard-mount` branch in `mountTaskRowSvelteInstances`) — no
new bind-function wiring needed since `bindProjEvents`,
`bindGoalEvents`, `bindNoteEvents`, and `bindResEvents` already call
`mountTaskRowSvelteInstances()` from the list-row round.

`buildSprintCard()` also reuses this same component. It was initially
deferred over a concern that its extra header buttons (prev/next
status, Edit) would need the same "interactive content inside the
mount" handling `TaskCardContent`'s ctx-handle needed — but unlike
that case, Sprint's buttons are bound globally via
`document.querySelectorAll('.sprint-status-btn')` etc. in
`bindSprintEvents()`, not scoped to anything mount-order-dependent.
Since the buttons live in the header's `.flex-between` row (a sibling
of the mount, not inside it), the whole header — ctx-handle, title,
*and* the buttons — stays vanilla exactly like the other four entities,
and only the chip row / dates / progress / story-points bar below it
moves into the `bodyHtml` mount. No ordering concern, no new branch.

Verified live: Project, Goal, Note, Resource, and Sprint card views all
render their body content correctly (status/type/category chips,
due-date badges, progress bars, note preview text, resource URL link,
sprint date range) with zero console errors; card click still opens
the right slideover; ctx-handle still opens the context menu; Sprint's
Start/Complete/↩/Edit buttons still work (verified status transition
persists and re-renders correctly).

## Standard kanban card (Project, Goal, Note, custom-entity kanban views)

`StandardKanbanCard.svelte` covers the kanban-card header + body for
`buildProjectKanbanView()`, `buildGoalKanbanView()`,
`buildNoteKanbanView()`, and custom entities' `buildKanbanView()`
(inside `renderCustomEntityList`). Sprint and Resource don't have
kanban views in this app (no `buildSprintKanbanView`/
`buildResKanbanView` exist), so there are only four call sites, not
five.

Unlike `StandardCardContent`, the header can't stay a vanilla sibling
here: `.kanban-card-header` is `display:flex` with exactly two
children (ctx-handle, `.kanban-card-title`) — the same "flex sibling
at the same nesting level" situation `TaskCardContent` hit for Task's
own kanban view. Pulling ctx-handle out would break the header's flex
layout, so `StandardKanbanCard` renders it inside the mount (mirroring
`TaskCardContent` exactly), taking `entityKey`/`entityId` props plus a
`titleHtml` prop for whatever the caller needs inline (a comment-badge
for Note, nothing extra for Project/Goal/custom entities) and a
`bodyHtml` prop for everything below the header (chips, progress bar,
custom-prop chips), both pre-rendered and passed through via `{@html}`.

Because ctx-handle now lives inside this mount, `mountTaskRowSvelteInstances()`
must run *before* `bindCtxHandles()` in every caller — same requirement
Task's kanban/card round already established. `bindProjEvents`,
`bindGoalEvents`, `bindNoteEvents`, and custom entities' `bindRows()`
all had `bindCtxHandles()` first (harmless for the card-view/list-view
mounts, which keep ctx-handle vanilla) — all four were reordered to
mount first. Project/Goal's `render()` also had a second, already-
correctly-ordered `bindCtxHandles()` call specific to kanban mode (run
after `bindProjEvents()`/`bindGoalEvents()` already mounted) — that
call is now redundant but harmless, left as-is rather than removed to
minimize the diff.

Verified live: Project, Goal, Note, and a freshly-created custom entity
type (with a status property) all render kanban cards correctly (chips,
progress bars, comment badge on Note, per-column grouping/counts) with
zero console errors; ctx-handle opens the right entity's slideover for
all four.

## Not yet ported

The pomodoro widget (small and only rendered once per slideover open —
not spread across many call sites like the others, so lower priority),
and the EditorJS content block (wraps a third-party library; "porting"
it is a different kind of problem — who owns the editor instance's
lifecycle — not chip rendering, so it deserves its own dedicated pass
rather than being squeezed into this round).

Beyond list rows, the five standard cards, and the four standard kanban
views: every entity's table view besides Task's (Project/Goal/Sprint/
Note/Resource/custom entities each have their own independent table
builders, none shared — porting them would mean redoing the
TaskTableRow work per entity type, not a single shared piece), creation
modals, full-page detail chrome, non-task dashboard widgets, and the
standalone pages (Calendar,
Habits, Pomodoro, Automations).

## Porting the next component

1. Add a `.svelte` file under `src/`.
2. Export a `mount<Name>(target, props)` function from `main.js` (mirror the
   `mountCheckboxProp` pattern) and attach it to `window.RaibisSvelte`.
3. In `app.js`, replace the old HTML-string branch for that control with a
   placeholder `<span class="svelte-<name>-mount" data-...>` carrying
   whatever data attributes the mount call needs.
4. In the existing post-render binding function for that panel/row, find
   `.svelte-<name>-mount` elements and call the mount function, wiring its
   callback prop(s) to the existing vanilla state functions
   (`setCustomPropValue`, `api()`, etc.) — don't reimplement that plumbing
   inside the component.
5. `npm run build`, then `make hard` (or `make hard mode=app`) to sync +
   verify.
