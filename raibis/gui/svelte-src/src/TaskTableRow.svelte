<script>
  // Task table-view row — mounted directly into the <tr> (same approach as
  // SubtaskRow: <tr> only accepts <td> children, so there's no clean way
  // to keep any single cell as a vanilla sibling the way ctx-handle stays
  // outside the <li> for list rows). Every cell — ctx-handle, the title
  // cell (toggle-arrow/add-sub-btn, icon slot, title link, comment badge),
  // every visible built-in column, and every custom-prop column — is
  // pre-rendered <td>...</td> HTML from the existing column-def cell()
  // functions and customPropCell() in app.js, concatenated into one blob
  // and passed through via {@html}. This component doesn't reformat or
  // restructure any of it; the value is purely in owning the mount/unmount
  // lifecycle instead of raw innerHTML replacement.
  //
  // Interactive elements inside (ctx-handle, toggle-arrow, add-sub-btn,
  // task-title-link, inline-status-select) all keep their original
  // classes/data attributes, so the existing bindTasksContentEvents()
  // bindings work unchanged — as long as they run after this mounts,
  // which they already do (mountTaskRowSvelteInstances runs first in that
  // function, same ordering established for card/kanban view).
  let { rowCellsHtml = '' } = $props();
</script>

{@html rowCellsHtml}
