<script>
  // Relation-type custom property control. Same "dumb display, delegate the
  // click" shape as DateProp/SelectProp — openCombo (plus the bilateral-sync
  // logic in its callback) stays entirely in app.js. chipsHtml is pre-built
  // by relationChipHtml() in app.js (already HTML-escapes item labels) and
  // passed straight through, so the visual chip styling can't drift from
  // what every other relation display in the app uses.
  let { chipsHtml = '', onEditRequest } = $props();

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditRequest?.(); }
  }
</script>

{#if chipsHtml}
  <span role="button" tabindex="0" onclick={() => onEditRequest?.()} onkeydown={handleKey} style="cursor:pointer">{@html chipsHtml}</span>
{:else}
  <span role="button" tabindex="0" onclick={() => onEditRequest?.()} onkeydown={handleKey} class="empty" style="cursor:pointer">—</span>
{/if}
