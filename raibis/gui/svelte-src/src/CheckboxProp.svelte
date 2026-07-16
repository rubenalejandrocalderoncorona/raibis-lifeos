<script>
  // Checkbox-type custom property control — first Svelte component in the
  // migration. Replaces the hand-rolled `.icp-check` <input> + manual
  // onchange rebind in buildInlinePropPanel (app.js). Owns its own checked
  // state reactively instead of relying on the caller to re-render/rebind
  // after every value change.
  let { value = false, description = '', onChange } = $props();

  function checkboxTrue(v) {
    return v === true || v === 'true' || v === '1' || v === 1;
  }

  let checked = $state(checkboxTrue(value));

  function handleChange(e) {
    checked = e.target.checked;
    onChange?.(checked);
  }
</script>

<input
  type="checkbox"
  class="icp-check"
  title={description}
  checked={checked}
  onchange={handleChange}
  style="cursor:pointer;accent-color:var(--accent)"
/>
