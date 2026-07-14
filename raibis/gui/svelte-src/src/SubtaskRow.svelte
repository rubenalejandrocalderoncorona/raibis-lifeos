<script>
  // Subtask table row — the mini nested-table shown inside a Task's own
  // slideover ("SUBTASKS (N)" section). Mounted directly into the <tr>
  // itself (which stays a plain vanilla element carrying the
  // subtask-table-row class + data-st-id + cursor style for the existing
  // row-click-opens-slideover wiring) — this component just renders the
  // <td> children. The expand/collapse chevron keeps its original class
  // (sub-table-toggle) and data-toggle-id attribute so the existing
  // bindSubtaskTableEvents() binding works unchanged, as long as it runs
  // after this mounts (same ctx-handle-inside-flex-header lesson as
  // TaskCardContent).
  let {
    taskId,
    title = '',
    done = false,
    hasKids = false,
    isExpanded = false,
    childCount = 0,
    indent = 0,
    statusChipHtml = '',
    priorityChipHtml = '',
    dueHtml = '',
  } = $props();

  const chevSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,3 5,7 8,3"/></svg>`;
</script>

<td style="padding-left:{8 + indent}px">
  <div style="display:flex;align-items:center;gap:6px">
    {#if hasKids}
      <span class="task-toggle-arrow sub-table-toggle {isExpanded ? 'expanded' : ''}" data-toggle-id={taskId} title={isExpanded ? 'Hide subtasks' : 'Show subtasks'} style="cursor:pointer;flex-shrink:0">{@html chevSvg}</span>
    {:else}
      <span style="width:14px;flex-shrink:0"></span>
    {/if}
    <span class={done ? 'task-title-text done' : 'task-title-text'}>{title}</span>
    {#if hasKids && !isExpanded}
      <span style="font-size:10px;color:var(--text-muted);background:var(--accent-glow);border-radius:8px;padding:0 6px;flex-shrink:0">{childCount}</span>
    {/if}
  </div>
</td>
<td>{@html statusChipHtml}</td>
<td>{@html priorityChipHtml}</td>
<td>{@html dueHtml}</td>
