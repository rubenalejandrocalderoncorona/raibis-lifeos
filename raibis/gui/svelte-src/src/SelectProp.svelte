<script>
  // Select/status-type custom property control. Same "dumb display, delegate
  // the click" shape as DateProp — openSingleSelectPicker is a shared
  // vanilla global widget, not reimplemented here. See DateProp for the
  // rationale.
  let { value = '', color = '', onEditRequest } = $props();

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditRequest?.(); }
  }

  let chipClass = $derived(color ? `multi-chip color-${color}` : 'multi-chip');
  let chipStyle = $derived(color ? 'font-size:11px;cursor:pointer' : 'font-size:11px;cursor:pointer;background:var(--accent-glow);color:var(--text-primary)');
</script>

{#if value}
  <span role="button" tabindex="0" onclick={() => onEditRequest?.()} onkeydown={handleKey} class={chipClass} style={chipStyle}>{value}</span>
{:else}
  <span role="button" tabindex="0" onclick={() => onEditRequest?.()} onkeydown={handleKey} class="empty" style="cursor:pointer">—</span>
{/if}
