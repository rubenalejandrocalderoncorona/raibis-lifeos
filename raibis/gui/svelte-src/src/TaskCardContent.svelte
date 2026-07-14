<script>
  // Task card content — shared by both card view and kanban view (nearly
  // identical structure: ctx-handle + title header, then meta chips, then
  // custom-prop chips; card view additionally shows a project line above
  // the meta row and a subtask subtree below the chips). Purely
  // presentational, same reasoning as TaskRowContent: the outer draggable/
  // clickable wrapper (.task-card-item / .kanban-card, with data-task-id
  // and the cursor style) stays vanilla in taskCardHtml()/kanban builder,
  // since bindKanbanDrag's mousedown listener and the "click to open"
  // wiring both operate on that outer element regardless of what's inside.
  //
  // ctx-handle is included directly in this component (unlike
  // TaskRowContent, which keeps it as a vanilla sibling) because here it's
  // a flex child of .kanban-card-header alongside the title — pulling it
  // out would change the header's flex layout. bindCtxHandles() just needs
  // to run *after* this mounts, which the caller (mountTaskCardSvelteInstances)
  // already guarantees by ordering.
  let {
    taskId,
    title = '',
    iconSize = 16,
    recurBadgeHtml = '',
    projLineHtml = '',
    metaHtml = '',
    customChipsHtml = '',
    subtreeHtml = '',
  } = $props();
</script>

<div class="kanban-card-header">
  <span class="ctx-handle" data-entity="task" data-id={taskId} title="Actions">⠿</span>
  <div class="kanban-card-title">
    <span class="list-icon-slot" data-icon-entity="task" data-icon-id={taskId} data-icon-size={iconSize} style="display:none;margin-right:4px;vertical-align:middle;font-size:{iconSize}px"></span>{title}<span class="comment-badge" data-comment-for={taskId} data-comment-entity="task" style="display:none"></span>{@html recurBadgeHtml}
  </div>
</div>
{@html projLineHtml}
{@html metaHtml}
{@html customChipsHtml}
{#if subtreeHtml}
  <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:4px">{@html subtreeHtml}</div>
{/if}
