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
Project, Goal, Sprint, Note, Resource, custom entity types). Every custom
property type except `multi_select` and `rollup` is now Svelte-driven.

- `CheckboxProp.svelte` — checkbox-type control. First component ported;
  establishes the mount-into-placeholder pattern above.
- `TextProp.svelte` — text/number/email/phone/url control. Click to edit
  inline, blur/Enter to save, Escape to cancel; url values render as a
  clickable link when not editing. Owns its edit UI entirely — no vanilla
  global involved.
- `DateProp.svelte`, `SelectProp.svelte`, `RelationProp.svelte` — these three
  are deliberately "dumb": they display a value and expose a single
  `onEditRequest` callback prop. The actual editing UI stays 100% vanilla
  (`openSingleDatePickerGlobal`, `openSingleSelectPicker`,
  `openRelationPicker` — the last one is a new standalone function,
  extracted verbatim from the old click handler including all the
  bilateral-sync logic, so RelationProp's callback can trigger it). After
  a pick, the vanilla picker calls `onRerender()` (full panel rebuild +
  remount) rather than patching the component's props in place — simpler
  and reuses the mount/unmount lifecycle that already has to exist, at the
  cost of a full panel re-render per edit instead of a targeted update.

## Not yet ported (still on the vanilla path)

- `multi_select` — chip add/remove UI (`ms-chip-remove`/`ms-add-btn`
  bindings) wasn't touched; lower priority since it doesn't have the
  "empty value renders wrong" failure mode the others had.
- `rollup` — read-only, opens the rollup-rule config panel on click. Could
  follow the DateProp/SelectProp "dumb display + onEditRequest" shape
  whenever it's worth doing.

Also not yet started: the Task list/card/kanban/table row rendering itself
(`taskRowHtml`, `buildStandardListRow`), subtasks tree, pomodoro widget,
comments, and the EditorJS content block — i.e. everything outside the
property panel. The property panel was the natural first slice since it's
shared across every entity type and was already the most bug-prone surface
this session (checkbox "undefined", stale re-renders, etc.).

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
