<script>
  // Rollup-type custom property control. Read-only calculated value — click
  // opens the rule-editing panel (showAddRollupPanel), a vanilla global not
  // reimplemented here. html is pre-rendered by renderRollupValue() in
  // app.js (includes the edit-hint icon and optional progress bar), passed
  // straight through so this can't visually drift from the one renderer
  // every other rollup display in the app already uses.
  let { html = '', onEditRequest } = $props();

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditRequest?.(); }
  }
</script>

<span role="button" tabindex="0" onclick={() => onEditRequest?.()} onkeydown={handleKey} style="cursor:pointer">{@html html}</span>
