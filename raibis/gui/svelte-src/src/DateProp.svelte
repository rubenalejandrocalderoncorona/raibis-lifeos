<script>
  // Date-type custom property control. Deliberately "dumb": the actual date
  // picker is a shared vanilla global widget (openSingleDatePickerGlobal)
  // that isn't worth reimplementing in Svelte yet, so this component only
  // displays the formatted value and delegates the click to app.js, which
  // opens the picker anchored at this component's own root element. After a
  // pick, app.js calls onRerender() (full panel rebuild + remount) rather
  // than patching this component's props directly — see README's lifecycle
  // note for why an in-place prop update isn't the pattern here yet.
  let { display = '', onEditRequest } = $props();

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditRequest?.(); }
  }
</script>

<span
  role="button"
  tabindex="0"
  onclick={() => onEditRequest?.()}
  onkeydown={handleKey}
  class={display ? '' : 'empty'}
  style="font-size:12px;cursor:pointer"
>{display || '—'}</span>
