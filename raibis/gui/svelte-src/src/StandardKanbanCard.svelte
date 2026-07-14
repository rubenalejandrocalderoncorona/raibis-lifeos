<script>
  // Kanban-card header + body for Project/Goal/Note/custom-entity kanban
  // views. Unlike StandardCardContent (card view), ctx-handle can't stay a
  // vanilla sibling here: .kanban-card-header is display:flex with
  // exactly two children (ctx-handle, .kanban-card-title), the same
  // "flex sibling at the same nesting level" situation TaskCardContent
  // hit for Task's own kanban — pulling ctx-handle out would break the
  // header's flex layout, so it's rendered inside the mount and the
  // caller (mountTaskRowSvelteInstances) must run before bindCtxHandles()
  // for the ctx-handle here to get bound.
  //
  // titleHtml/bodyHtml are pre-rendered by the existing per-entity kanban
  // builders and passed straight through via {@html} — same
  // "don't reformat, just own the mount lifecycle" approach as
  // StandardCardContent/TaskTableRow.
  let { entityKey, entityId, titleHtml = '', bodyHtml = '' } = $props();
</script>

<div class="kanban-card-header">
  <span class="ctx-handle" data-entity={entityKey} data-id={entityId} title="Actions">⠿</span>
  <div class="kanban-card-title">{@html titleHtml}</div>
</div>
{@html bodyHtml}
