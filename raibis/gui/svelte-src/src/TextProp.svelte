<script>
  // Text/number/email/phone/url custom property control — click to edit
  // inline, blur or Enter to save, Escape to cancel. Replaces the
  // hand-rolled "swap span for <input>, wire onblur/onkeydown by hand"
  // pattern in buildInlinePropPanel/bindInlinePropPanel (app.js).
  let { value = '', type = 'text', onChange } = $props();

  let editing = $state(false);
  let draft = $state(value);
  let inputEl = $state(null);

  $effect(() => {
    if (editing && inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });

  function startEdit() {
    draft = value;
    editing = true;
  }

  function save() {
    editing = false;
    if (draft !== value) {
      value = draft;
      onChange?.(draft);
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') inputEl.blur();
    if (e.key === 'Escape') { editing = false; }
  }

  function handleStartEditKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); }
  }

  const inputType = type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text';
</script>

{#if editing}
  <input
    bind:this={inputEl}
    type={inputType}
    value={draft}
    oninput={(e) => draft = e.currentTarget.value}
    onblur={save}
    onkeydown={handleKeydown}
    onclick={(e) => e.stopPropagation()}
    style="width:100%;border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:13px;background:var(--bg-card);color:var(--text-primary)"
  />
{:else if type === 'url' && value}
  <div role="button" tabindex="0" onclick={startEdit} onkeydown={handleStartEditKey} style="cursor:text">
    <a href={value} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} style="color:var(--accent);text-decoration:underline;font-size:12px">{value}</a>
  </div>
{:else if value}
  <span role="button" tabindex="0" onclick={startEdit} onkeydown={handleStartEditKey} style="font-size:12px;cursor:text">{value}</span>
{:else}
  <span role="button" tabindex="0" onclick={startEdit} onkeydown={handleStartEditKey} class="empty" style="cursor:text">—</span>
{/if}
