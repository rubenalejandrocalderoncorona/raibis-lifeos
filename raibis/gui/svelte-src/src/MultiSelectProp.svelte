<script>
  // Multi-select custom property control. Chip removal is handled directly
  // here (no vanilla global needed); adding an option still opens the
  // shared vanilla tag-picker widget via onEditRequest, same "dumb
  // delegate" shape as DateProp/SelectProp/RelationProp for that half.
  let { values = [], optionColors = {}, onRemove, onEditRequest } = $props();
</script>

<div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;min-height:20px">
  {#each values as v (v)}
    {@const color = optionColors[v] || ''}
    <span
      class={color ? `multi-chip color-${color}` : 'multi-chip'}
      style={color ? '' : 'background:var(--accent-glow);color:var(--text-primary);font-size:11px;display:inline-flex;align-items:center;gap:3px;cursor:default'}
    >{v}<span
      role="button"
      tabindex="0"
      onclick={(e) => { e.stopPropagation(); onRemove?.(v); }}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onRemove?.(v); } }}
      style="cursor:pointer;font-weight:700;opacity:0.6;font-size:12px;line-height:1"
      title="Remove"
    >×</span></span>
  {/each}
  <button
    type="button"
    class="btn btn-sm btn-ghost"
    onclick={(e) => { e.stopPropagation(); onEditRequest?.(); }}
    style="font-size:11px;padding:1px 5px;height:20px;line-height:1"
    title="Add option"
  >+</button>
</div>
