<script>
  // Comment thread — shared by every entity type's detail slideover/page
  // (Task, Project, Goal, Note, Sprint, Resource all call the same
  // bindCommentSection()). Unlike the row/card components, this one owns
  // real state (the comment list, the input value) since there's genuine
  // interactivity here, not just formatted display. It still doesn't call
  // api()/relativeTime() etc. directly — comments arrive pre-formatted as
  // props ({initial, author, relTime, text}), and onSend is a callback
  // that performs the actual POST + refetch in app.js and returns the
  // fresh, pre-formatted list, matching the "app.js does interop, the
  // component just renders + emits events" rule the rest of this
  // migration follows.
  let { comments: initialComments = [], onSend } = $props();

  let comments = $state(initialComments);
  let inputValue = $state('');
  let sending = $state(false);

  async function send() {
    const body = inputValue.trim();
    if (!body || sending) return;
    inputValue = '';
    sending = true;
    try {
      const fresh = await onSend?.(body);
      if (fresh) comments = fresh;
    } finally {
      sending = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }
</script>

<div class="comment-list">
  {#if !comments.length}
    <div class="comment-empty">No comments yet.</div>
  {:else}
    {#each comments as c}
      <div class="comment-row">
        <div class="comment-avatar">{c.initial}</div>
        <div class="comment-body">
          <div class="comment-meta"><span class="comment-author">{c.author}</span><span class="comment-time">{c.relTime}</span></div>
          <div class="comment-text">{c.text}</div>
        </div>
      </div>
    {/each}
  {/if}
</div>
<div class="comment-input-row">
  <div class="comment-avatar">M</div>
  <input class="comment-input" placeholder="Add a comment…" autocomplete="off" bind:value={inputValue} onkeydown={handleKeydown} />
  <button class="comment-send-btn" title="Send" onclick={send}>↑</button>
</div>
