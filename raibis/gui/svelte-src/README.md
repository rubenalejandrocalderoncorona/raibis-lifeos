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

- `CheckboxProp.svelte` — checkbox-type custom property control, used by
  `buildInlinePropPanel` in app.js. First component ported; establishes the
  mount-into-placeholder pattern above for everything that follows.

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
