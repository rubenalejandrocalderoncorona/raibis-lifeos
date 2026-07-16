<script>
  // Task row content — title, meta chips, custom-prop chips, and the
  // right-aligned due-date cluster for a single task list row. Purely
  // presentational: row click (→ open slideover), the ctx-handle context
  // menu, and the subtask toggle-arrow all stay vanilla siblings outside
  // this component's mount point (see taskRowHtml in app.js), since none
  // of that needs to change per-row and reusing the existing shared
  // ctx-handle/click wiring avoids re-deriving it here.
  //
  // metaChipsHtml/customChipsHtml/dueHtml/recurBadgeHtml are pre-rendered
  // by the existing vanilla chip/badge functions (builtinSelectChip,
  // renderCustomPropChips, dueBadgeHtml, etc.) and passed straight through
  // via {@html} — same "don't duplicate the renderer" approach as
  // RelationProp/RollupProp in the property panel.
  let {
    taskId,
    title = '',
    done = false,
    recurBadgeHtml = '',
    metaChipsHtml = '',
    customChipsHtml = '',
    dueHtml = '',
    viewMode = 'list',
  } = $props();
</script>

<div class="task-content">
  <div class={done ? 'task-title-text done' : 'task-title-text'}>
    <span class="list-icon-slot" data-icon-entity="task" data-icon-id={taskId} data-icon-size="16" style="display:none;margin-right:4px;vertical-align:middle;font-size:16px"></span>{title} <span class="comment-badge" data-comment-for={taskId} data-comment-entity="task" style="display:none"></span>{@html recurBadgeHtml}
  </div>
  <div class="task-meta-row">{@html metaChipsHtml}</div>
  <div class="task-chips-outer" data-entity="task" data-rid={taskId} data-vm={viewMode}>{@html customChipsHtml}</div>
</div>
<span class="task-row-due-right">{@html dueHtml}</span>
