<script>
  // Content for buildStandardListRow() — the shared list-row skeleton used
  // by every non-Task entity's list view (Project, Goal, Sprint, Note,
  // Resource, custom entity types). Same "dumb display, pre-rendered HTML
  // passed through via {@html}" approach as TaskRowContent, which this
  // mirrors closely — the one structural difference is that
  // buildStandardListRow already keeps ctx-handle, the icon slot, and
  // afterHandleHtml (e.g. custom entities' subentity expand arrow) as
  // vanilla siblings *outside* .task-content, so none of them are
  // Svelte-rendered here and there's no ctx-handle-ordering concern like
  // TaskCardContent/TaskTableRow had.
  let {
    entityId,
    entityKey,
    titleHtml = '',
    commentEntity = '',
    metaChipsHtml = '',
    customChipsHtml = '',
    dueHtml = '',
  } = $props();
</script>

<div class="task-content">
  <div class="task-title-text">{@html titleHtml}<span class="comment-badge" data-comment-for={entityId} data-comment-entity={commentEntity || entityKey} style="display:none"></span></div>
  {#if metaChipsHtml}
    <div class="task-meta-row">{@html metaChipsHtml}</div>
  {/if}
  {#if customChipsHtml}
    <div class="task-chips-outer" data-entity={entityKey} data-rid={entityId} data-vm="list">{@html customChipsHtml}</div>
  {/if}
</div>
{#if dueHtml}
  <span class="task-row-due-right">{@html dueHtml}</span>
{/if}
