<script>
  // Day-window timeline/Gantt grid — shared by Calendar's Timeline scope
  // (buildTimeline) and Pomodoro's Focus Block Timeline
  // (renderFocusTimeline), which were two ~70-line near-duplicates: same
  // day-window math, same month/day header, same today-line/bar track
  // markup — differing only in window size, month-name format, and how
  // each item's title/dates/color/click-target are derived from the
  // underlying domain data (task/goal/project/sprint calendar events vs.
  // focus-blocked tasks). That derivation stays in app.js (it's genuinely
  // different per caller); this component only owns the day-grid layout
  // math and markup, which is the part that was actually duplicated.
  //
  // Bar/track/label click-through and horizontal scroll-sync both stay
  // vanilla — bound via existing class/attribute selectors
  // (.tl-bar[data-task-id], .tl-wrap .tl-hdr-scroll/.tl-tracks-scroll) in
  // each caller's rebind(), same as before this component existed. This
  // component just needs to render those same classes/attributes.
  let {
    daysBefore = 30,
    daysAfter = 60,
    px = 38,
    labelWidth = 180,
    monthFormat = 'long', // 'long' | 'short'
    items = [], // [{ key, title, start, end, color, barLabel, barTitle, trackTitle, taskId, trackClass, barExtraStyle }]
    emptyHtml = '',
    wrapClass = '',
  } = $props();

  const MONTH_NAMES_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  function dateAdd(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const winStart = $derived(dateAdd(today, -daysBefore));
  const total = $derived(daysBefore + daysAfter + 1);
  const totalWidth = $derived(total * px);
  const todayX = $derived(daysBefore * px);
  const dayList = $derived(Array.from({ length: total }, (_, i) => dateAdd(winStart, i)));
  const monthNames = $derived(monthFormat === 'short' ? MONTH_NAMES_SHORT : MONTH_NAMES_LONG);

  const monthGroups = $derived.by(() => {
    const groups = [];
    let curKey = null;
    dayList.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== curKey) {
        groups.push({ label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, startI: i, count: 1 });
        curKey = key;
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  });

  const bars = $derived.by(() => items.map(it => {
    const startDayOff = Math.round((new Date(it.start + 'T00:00:00').getTime() - winStart.getTime()) / 86400000);
    const endDayOff = Math.round((new Date(it.end + 'T00:00:00').getTime() - winStart.getTime()) / 86400000);
    const x = Math.max(0, startDayOff * px);
    const rawW = (endDayOff - startDayOff + 1) * px;
    const w = Math.min(rawW, totalWidth - x);
    return { ...it, x, w };
  }));
</script>

{#if !items.length}
  {@html emptyHtml}
{:else}
<div class="tl-wrap {wrapClass}">
  <div class="tl-header-row">
    <div style="min-width:{labelWidth}px;flex-shrink:0;border-right:1px solid var(--color-border)"></div>
    <div class="tl-hdr-scroll">
      <div style="width:{totalWidth}px;height:22px;position:relative;border-bottom:1px solid var(--color-border)">
        {#each monthGroups as g}
          <div style="position:absolute;left:{g.startI * px}px;width:{g.count * px}px;font-size:11px;font-weight:600;color:var(--color-text-secondary);border-right:1px solid var(--color-border);padding:2px 4px;white-space:nowrap;overflow:hidden">{g.label}</div>
        {/each}
      </div>
      <div style="width:{totalWidth}px;height:32px;position:relative;border-bottom:2px solid var(--color-border-strong)">
        {#each dayList as d, i}
          <div style="position:absolute;left:{i * px}px;width:{px}px;text-align:center;font-size:10px;color:{d.getTime() === today.getTime() ? 'var(--color-danger)' : 'var(--color-text-tertiary)'};font-weight:{d.getTime() === today.getTime() ? 700 : 400};line-height:1.3">{d.getDate()}<br /><span style="font-size:9px">{DAY_NAMES[d.getDay()]}</span></div>
        {/each}
        <div class="tl-today-dot" style="left:{todayX + px / 2}px"></div>
      </div>
    </div>
  </div>
  <div class="tl-body-wrap">
    <div class="tl-labels-col" style="min-width:{labelWidth}px">
      {#each items as it (it.key)}
        <div class="tl-label" title={it.title} data-task-id={it.taskId ?? undefined} style={it.taskId != null ? 'cursor:pointer' : ''}>{it.title}</div>
      {/each}
    </div>
    <div class="tl-tracks-scroll">
      {#each bars as b (b.key)}
        <div class="tl-track-row {b.trackClass || ''}" style="width:{totalWidth}px" data-task-id={b.taskId ?? undefined} title={b.trackTitle || ''}>
          <div class="tl-today-line" style="left:{todayX + px / 2}px"></div>
          {#if b.w > 0}
            <div class="tl-bar" data-task-id={b.taskId ?? undefined} style="left:{b.x}px;width:{b.w}px;background:{b.color};{b.barExtraStyle || ''}" title={b.barTitle}>{b.barLabel ?? b.title}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
{/if}
