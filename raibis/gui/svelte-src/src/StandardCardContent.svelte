<script>
  // Card-view body content for Project/Goal/Note/Resource — each entity's
  // build{Entity}Card() function already shares the same header shape
  // (ctx-handle + card-title with icon slot/comment badge, inside a
  // .flex-between row), which stays vanilla exactly like
  // StandardListRowContent's header does, for the same reason: nothing
  // interactive lives below it here. Everything below the header (chip
  // row, entity-specific extra sections like a progress bar or note
  // preview, custom-prop chips) is pre-rendered HTML from the existing
  // per-entity card functions, concatenated into one blob and passed
  // through via {@html} — same "don't reformat, just own the mount
  // lifecycle" reasoning as TaskTableRow.
  //
  // Sprint's card isn't ported here — it has extra buttons (prev/next
  // status, Edit) inside the header row itself, which would need the
  // same "interactive content inside the mount" handling TaskCardContent
  // needed for ctx-handle. Left for a follow-up.
  let { bodyHtml = '' } = $props();
</script>

{@html bodyHtml}
