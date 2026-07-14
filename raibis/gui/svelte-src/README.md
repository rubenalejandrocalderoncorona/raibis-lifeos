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

## Not yet ported

Task table-view row rendering, the pomodoro widget (small and only
rendered once per slideover open — not spread across many call sites
like the others, so lower priority), and the EditorJS content block
(wraps a third-party library; "porting" it is a different kind of
problem — who owns the editor instance's lifecycle — not chip
rendering, so it deserves its own dedicated pass rather than being
squeezed into this round).

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
