'use strict';

/* ─── Constants ─────────────────────────────────────────────────────── */
const API = 'http://localhost:3344';
const DEFAULT_TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const DEFAULT_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
let TASK_STATUSES = JSON.parse(localStorage.getItem('taskStatuses') || 'null') || [...DEFAULT_TASK_STATUSES];
let TASK_PRIORITIES = JSON.parse(localStorage.getItem('taskPriorities') || 'null') || [...DEFAULT_TASK_PRIORITIES];
const TASK_CATEGORIES = ['Work-Process','Work-Tickets','Birthdays','Finance','Organization','Hobbies','Study','Travel','Personal','Health','Work-Task'];
const RECUR_UNITS = ['Day(s)','Week(s)','Month(s)','Year(s)'];
const GOAL_TYPES = ['12 Weeks','12 Months','3 Years','5 Years'];
const GOAL_YEARS = ['2025','2026','2027','Multiyear'];
const MACRO_AREAS = ['Soul (Connection & Restoration)','Output (Deep Work & Career)','Growth (Input & Optimization)','Body (Physicality)'];
const KANBAN_COLS = ['Backlog','Maintenance','Sprint'];
const PROJECT_STATUSES = ['active','on_hold','completed','archived'];
const GOAL_STATUSES = ['active','on_hold','completed','archived'];
const COLOR_OPTIONS = ['blue','green','red','yellow','purple','cyan','orange','pink'];
const COLOR_HEX = {blue:'#378ADD',green:'#6dcc8a',red:'#e07070',yellow:'#d4a84b',purple:'#a78bfa',cyan:'#22d3ee',orange:'#fb923c',pink:'#f472b6'};

/* ─── Icon / Emoji Picker ─────────────────────────────────────────────── */
const EMOJI_DATA = {
  'People':   ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
  'Gestures': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'],
  'Animals':  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦩','🦢','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'],
  'Nature':   ['🌸','💮','🏵️','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀','🍁','🍂','🍃','🍄','🌰','🦠','🌍','🌎','🌏','🌐','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙','🌚','🌛','🌜','☀️','🌝','🌞','🪐','⭐','🌟','💫','✨','⚡','☄️','💥','🔥','🌪','🌈','☁️','⛅','🌤️','❄️','🌊','💧','🌫️','🌬️','🌀','🌈','⛈️','🌩️','🌨️','🌧️','🌦️','🌥️','🌤️'],
  'Food':     ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍑','🥭','🍍','🥥','🥝','🍅','🫒','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🫘','🌰','🍞','🥐','🥖','🫓','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔','🌮','🌯','🥙','🧆','🥚','🍣','🍱','🍛','🍜','🍝','🍠','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥐','☕','🫖','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹'],
  'Travel':   ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚁','🛸','✈️','🛩️','🛫','🛬','🪂','💺','🚀','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','🗾','🗿','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🌌','🌠','🎇','🎆'],
  'Objects':  ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💽','💾','💿','📀','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰','💴','💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','📋','📌','📍','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','🔧','🔩','⚙️','🗜️','🔗','⛓️','🧲','🪜','⚗️','🧪','🧫','🧬','🔬','🔭','📡','💊','💉','🩺','🩹','🧰','🪤','🪣','🧲','📦','📬','📮','🗒️','📝','✏️','🖊️','🖋️','📖','📚','📓','📒','📃','📄','📑','📜','📰','🗞️','🔖','🏷️','💰','🔑','🗝️','🔍','🔎','🗂️','📁','📂','🗃️','🗄️'],
  'Activity': ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🥏','🎱','🪃','🏓','🏸','🏒','🥍','🏏','🪃','🎿','🛷','🛹','🛼','🥊','🥋','🎽','🤿','🥅','⛳','🎣','🤿','🎽','🎿','🛷','🏹','🎯','🎱','🎮','🎰','🎲','🧩','🪀','🪁','🎭','🎨','🖼️','🎪','🎤','🎧','🎼','🎵','🎶','🎷','🎸','🎹','🎺','🎻','🥁','🪘','🎙️','📯','🎬','🎥','📽️','🎞️','📺','📷','📸','🔭','🎠','🎡','🎢','🎪'],
  'Symbols':  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☯️','🔯','✡️','☦️','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','📶','🛜','📳','📴','📵','✅','☑️','✔️','❎','🔀','🔁','🔂','▶️','⏩','⏭️','⏯️','◀️','⏪','⏮️','🔼','⏫','🔽','⏬','⏸️','⏹️','⏺️','🎦','🔇','🔈','🔉','🔊','📢','📣','📡','🔔','🔕','🎵','🎶','⚡','🔋','💡','🔦','🕯️','🪔','💸','💳','🪙','♻️','🔄','⚙️','🔧','🔩','🗜️','🔗','⛓️','🪝','🧲','⚗️','🔬','🔭','🔮','🪄','🧿','💈','🪞','🪟','🪜','🛋️','🪑','🚪','🛏️','🛁','🪒','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🪤','🪣','🧯','🛒','🚬','⚰️','🪦','⚱️','🏺','🗿','🗽'],
  'Flags':    ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇲🇽','🇷🇺','🇸🇦','🇦🇪','🇳🇱','🇧🇪','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇹','🇵🇱','🇨🇿','🇦🇹','🇨🇭','🇬🇷','🇹🇷','🇮🇱','🇪🇬','🇿🇦','🇳🇬','🇰🇪','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇻🇪','🇵🇭','🇹🇭','🇻🇳','🇮🇩','🇲🇾','🇸🇬','🇳🇿','🇮🇪','🇺🇦','🇷🇴','🇭🇺'],
};

const ICON_DATA = [
  { name:'task',      svg:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>' },
  { name:'goal',      svg:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { name:'project',   svg:'<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>' },
  { name:'note',      svg:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { name:'sprint',    svg:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { name:'star',      svg:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { name:'heart',     svg:'<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>' },
  { name:'flag',      svg:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
  { name:'bookmark',  svg:'<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>' },
  { name:'link',      svg:'<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' },
  { name:'calendar',  svg:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
  { name:'clock',     svg:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  { name:'folder',    svg:'<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>' },
  { name:'brain',     svg:'<path d="M9.5 2a2.5 2.5 0 01.5 5M9.5 2a2.5 2.5 0 00-.5 5"/><path d="M6 5a6 6 0 00-3 10.5M18 5a6 6 0 013 10.5"/><path d="M9 10v4M15 10v4"/><path d="M9 14a3 3 0 006 0"/>' },
  { name:'chart',     svg:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  { name:'code',      svg:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
  { name:'settings',  svg:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>' },
  { name:'layers',    svg:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>' },
  { name:'users',     svg:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
  { name:'map',       svg:'<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>' },
  { name:'home',      svg:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
];

let _iconPickerEl = null; // singleton picker DOM element

function _svgIcon(pathData, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`;
}

function _buildIconPicker(entityType, entityId, currentIcon, onSelect) {
  // Remove any existing picker
  if (_iconPickerEl) { _iconPickerEl.remove(); _iconPickerEl = null; }

  let activeTab = 'emoji';
  let filterText = '';

  const el = document.createElement('div');
  el.className = 'icon-picker-popover';
  el.id = 'icon-picker-popover';

  function renderContent() {
    const tabBar = `
      <div class="icon-picker-tabs">
        <button class="icon-picker-tab ${activeTab==='emoji'?'active':''}" data-tab="emoji">Emoji</button>
        <button class="icon-picker-tab ${activeTab==='icons'?'active':''}" data-tab="icons">Icons</button>
        <button class="icon-picker-tab icon-picker-remove" data-tab="remove">Remove</button>
      </div>`;
    const filterBar = `
      <div class="icon-picker-filter">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="icon-picker-search" placeholder="Filter…" value="${filterText.replace(/"/g,'&quot;')}" />
      </div>`;

    let gridContent = '';
    if (activeTab === 'emoji') {
      for (const [group, emojis] of Object.entries(EMOJI_DATA)) {
        const filtered = filterText
          ? emojis.filter(e => e.includes(filterText))
          : emojis;
        if (!filtered.length) continue;
        gridContent += `<div class="icon-picker-group-label">${group}</div>
          <div class="icon-picker-grid">
            ${filtered.map(e => `<button class="icon-picker-item" data-icon="${e}" title="${e}">${e}</button>`).join('')}
          </div>`;
      }
    } else if (activeTab === 'icons') {
      const filtered = filterText
        ? ICON_DATA.filter(i => i.name.includes(filterText.toLowerCase()))
        : ICON_DATA;
      gridContent += `<div class="icon-picker-grid">
        ${filtered.map(i => `<button class="icon-picker-item icon-picker-item-svg" data-icon="__svg:${i.name}" title="${i.name}">${_svgIcon(i.svg, 16)}</button>`).join('')}
      </div>`;
    }

    el.innerHTML = tabBar + filterBar + `<div class="icon-picker-body">${gridContent || '<div class="icon-picker-empty">No results</div>'}</div>`;

    el.querySelectorAll('.icon-picker-tab').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (btn.dataset.tab === 'remove') {
          onSelect('');
          el.remove();
          _iconPickerEl = null;
          return;
        }
        activeTab = btn.dataset.tab;
        filterText = '';
        renderContent();
      };
    });
    const searchEl = el.querySelector('.icon-picker-search');
    if (searchEl) {
      searchEl.oninput = (e) => { filterText = e.target.value; renderContent(); };
      searchEl.onclick = (e) => e.stopPropagation();
      requestAnimationFrame(() => searchEl.focus());
    }
    el.querySelectorAll('.icon-picker-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        onSelect(btn.dataset.icon);
        el.remove();
        _iconPickerEl = null;
      };
    });
  }

  renderContent();
  return el;
}

function showIconPicker(anchorEl, entityType, entityId, currentIcon, onSelect) {
  if (_iconPickerEl) { _iconPickerEl.remove(); _iconPickerEl = null; return; }

  const picker = _buildIconPicker(entityType, entityId, currentIcon, onSelect);
  document.body.appendChild(picker);
  _iconPickerEl = picker;

  // Position below/near anchor
  const rect = anchorEl.getBoundingClientRect();
  const pickerW = 280;
  const left = Math.min(rect.left, window.innerWidth - pickerW - 8);
  const top = rect.bottom + 6;
  picker.style.left = Math.max(8, left) + 'px';
  picker.style.top = top + 'px';

  // Dismiss on click outside
  const dismiss = (e) => {
    if (!picker.contains(e.target) && e.target !== anchorEl) {
      picker.remove();
      _iconPickerEl = null;
      document.removeEventListener('click', dismiss, true);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss, true), 10);
}

async function loadEntityIcon(entityType, entityId) {
  try {
    const props = await api('GET', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`);
    return props._icon || '';
  } catch(e) { return ''; }
}

async function saveEntityIcon(entityType, entityId, icon) {
  if (!entityId) return;
  try {
    if (icon) {
      await api('POST', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`, { key: '_icon', value: icon });
    } else {
      await api('DELETE', `/api/properties?entity_type=${entityType}&entity_id=${entityId}&key=_icon`);
    }
  } catch(e) {
    // Only re-throw server errors (5xx) so callers can revert the optimistic UI update
    if (e.message && e.message.includes('5')) throw e;
  }
}

function renderEntityIcon(icon, size = 22) {
  if (!icon) return '';
  if (icon.startsWith('__svg:')) {
    const name = icon.slice(6);
    const found = ICON_DATA.find(i => i.name === name);
    if (found) return `<span class="entity-icon-display" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center">${_svgIcon(found.svg, size * 0.8)}</span>`;
  }
  return `<span class="entity-icon-display" style="font-size:${size}px;line-height:1">${icon}</span>`;
}

// ── Lazy icon injection for list views ────────────────────────────────
// Renders placeholders with data-icon-entity and data-icon-id, then
// fetches icons in parallel and injects them without a full re-render.
async function injectListIcons(entityType, ids) {
  if (!ids || !ids.length) return;
  const unique = [...new Set(ids.map(String))];
  await Promise.all(unique.map(async (id) => {
    try {
      const props = await api('GET', `/api/properties?entity_type=${entityType}&entity_id=${id}`);
      const icon = props._icon;
      if (!icon) return;
      document.querySelectorAll(`[data-icon-entity="${entityType}"][data-icon-id="${id}"]`).forEach(el => {
        el.innerHTML = renderEntityIcon(icon, parseInt(el.dataset.iconSize) || 16);
        el.style.display = 'inline-flex';
      });
    } catch(e) {}
  }));
}

/* ─── State ──────────────────────────────────────────────────────────── */
let currentView = 'dashboard';
let currentParams = null;
let navHistory = []; // [{view, params, label}]
let allTags = [];
let allCategories = [];
let allTasksCache = [];
let expandedTasks = new Set();
let tasksViewMode = localStorage.getItem('tasksViewMode') || 'list';
let tasksKanbanGroupBy = localStorage.getItem('tasksKanbanGroupBy') || 'status';
// Hidden kanban columns per groupBy key — stored as { status: ['cancelled'], priority: [] }
let kanbanHiddenCols = JSON.parse(localStorage.getItem('kanbanHiddenCols') || '{}');
let projectsViewMode = localStorage.getItem('projectsViewMode') || 'cards';
let projsKanbanGroupBy = localStorage.getItem('projsKanbanGroupBy') || 'status';
let goalsViewMode = localStorage.getItem('goalsViewMode') || 'cards';
let goalsKanbanGroupBy = localStorage.getItem('goalsKanbanGroupBy') || 'status';
let notesViewMode = localStorage.getItem('notesViewMode') || 'cards';
let resourcesViewMode = localStorage.getItem('resourcesViewMode') || 'table';
let sprintsViewMode = localStorage.getItem('sprintsViewMode') || 'cards';
let habitsViewMode  = localStorage.getItem('habitsViewMode')  || 'table';
let pomTimer = null;
let pomState = { running: false, seconds: 25*60, mode: 'work', taskId: null, taskTitle: '', finished: [] };
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calScope = localStorage.getItem('calScope') || 'month'; // 'month'|'week'|'3day'|'day'
let calAnchorDate = new Date(); // anchor for week/3day/day views
let globalSearchDebounce = null;

// Column visibility for table views
const TASK_TABLE_COLS = ['title','project','status','priority','due','tags'];
let taskTableCols = JSON.parse(localStorage.getItem('taskTableCols') || 'null') || [...TASK_TABLE_COLS];
const CAL_EVENT_TYPES = ['task','goal','project','sprint'];
let calEventTypes = JSON.parse(localStorage.getItem('calEventTypes') || 'null') || [...CAL_EVENT_TYPES];

/* ─── Utilities ──────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function stripDate(dateStr) {
  if (!dateStr) return '';
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const s = stripDate(dateStr);
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const s = stripDate(dateStr);
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(stripDate(dateStr) + 'T00:00:00');
  return d < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(stripDate(dateStr) + 'T00:00:00');
  return d.getTime() === today.getTime();
}

function statusBadge(status) {
  const map = { todo: 'badge-todo', in_progress: 'badge-progress', blocked: 'badge-blocked', done: 'badge-done' };
  const label = (status || 'todo').replace('_', ' ');
  const customColor = getValueColor('taskStatuses', status);
  const styleAttr = customColor ? ` style="background:${customColor}22;color:${customColor};border-color:${customColor}55"` : '';
  return `<span class="badge ${map[status] || 'badge-todo'}"${styleAttr}>${label}</span>`;
}

function priorityBadge(priority) {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };
  const customColor = getValueColor('taskPriorities', priority);
  const styleAttr = customColor ? ` style="background:${customColor}22;color:${customColor};border-color:${customColor}55"` : '';
  return `<span class="badge ${map[priority] || 'badge-low'}"${styleAttr}>${priority || 'low'}</span>`;
}

function getValueColor(storageKey, value) {
  if (!value) return null;
  try {
    const map = JSON.parse(localStorage.getItem(storageKey + 'Colors') || '{}');
    return map[value] || null;
  } catch(e) { return null; }
}

function setValueColor(storageKey, value, color) {
  try {
    const map = JSON.parse(localStorage.getItem(storageKey + 'Colors') || '{}');
    if (color) map[value] = color;
    else delete map[value];
    localStorage.setItem(storageKey + 'Colors', JSON.stringify(map));
  } catch(e) {}
}

// Sprint story-points gradient: gray→green (0→100%) green (100%) green→yellow (100-120%) yellow→red (120%+)
function spGradientColor(assigned, capacity) {
  if (!capacity) return 'var(--text-muted)';
  const ratio = assigned / capacity;
  if (ratio <= 0) return 'hsl(0,0%,55%)';
  if (ratio <= 0.5) {
    const t = ratio / 0.5;
    return `hsl(${Math.round(t*120)},${Math.round(t*60)}%,45%)`;
  }
  if (ratio <= 1.0) return 'hsl(120,55%,38%)';
  if (ratio <= 1.2) {
    const t = (ratio - 1.0) / 0.2;
    return `hsl(${Math.round(120 - t*60)},70%,42%)`;
  }
  if (ratio <= 1.5) {
    const t = (ratio - 1.2) / 0.3;
    return `hsl(${Math.round(60 - t*60)},75%,42%)`;
  }
  return 'hsl(0,75%,42%)';
}

function tagHtml(tag) {
  const hex = tag.color ? (COLOR_HEX[tag.color] || tag.color) : '#378ADD';
  return `<span class="tag" style="color:${hex};border-color:${hex}22;background:${hex}18">${tag.name}</span>`;
}

function dueBadgeHtml(dateStr) {
  if (!dateStr) return '';
  let cls = '';
  if (isOverdue(dateStr)) cls = 'overdue';
  else if (isToday(dateStr)) cls = 'today';
  return `<span class="task-due ${cls}">${fmtDate(dateStr)}</span>`;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Parse query string like "status:todo priority:high due:before:2025-12-31 text" */
function parseQueryFilter(query) {
  const tokens = query.trim().split(/\s+/);
  const filters = {};
  const textParts = [];
  for (const tok of tokens) {
    if (!tok) continue;
    const m = tok.match(/^(\w+):(.+)$/);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2].toLowerCase();
      filters[key] = val;
    } else {
      textParts.push(tok.toLowerCase());
    }
  }
  filters._text = textParts.join(' ');
  return filters;
}

function applyQueryFilter(items, query, fieldMap) {
  if (!query.trim()) return items;
  const f = parseQueryFilter(query);
  return items.filter(item => {
    for (const [key, val] of Object.entries(f)) {
      if (key === '_text') {
        if (!val) continue;
        const text = (fieldMap.text ? fieldMap.text(item) : item.title || '').toLowerCase();
        if (!text.includes(val)) return false;
        continue;
      }
      const getter = fieldMap[key];
      if (!getter) continue;
      const itemVal = String(getter(item) || '').toLowerCase();
      if (val.startsWith('before:')) {
        if (!itemVal || itemVal >= val.slice(7)) return false;
      } else if (val.startsWith('after:')) {
        if (!itemVal || itemVal <= val.slice(6)) return false;
      } else {
        if (!itemVal.includes(val)) return false;
      }
    }
    return true;
  });
}

function queryFilterHtml(placeholder) {
  return `<div class="query-filter-wrap">
    <input type="text" class="query-filter-input" placeholder="${placeholder||'Filter: status:todo priority:high …'}" autocomplete="off" />
    <div class="query-filter-hint">Fields: <code>status</code> <code>priority</code> <code>project</code> <code>goal</code> <code>tag</code> <code>due:before:DATE</code></div>
  </div>`;
}

/* Custom styled select dropdown */
function customSelectHtml(id, options, value, placeholder) {
  const opts = options.map(o => `<div class="csel-option${String(o.value)===String(value)?' selected':''}" data-value="${o.value}">${o.label}</div>`).join('');
  const selected = options.find(o => String(o.value) === String(value));
  return `<div class="csel" id="${id}" data-value="${value||''}">
    <div class="csel-trigger">
      <span class="csel-label">${selected ? selected.label : (placeholder||'Select…')}</span>
      <span class="csel-arrow">▾</span>
    </div>
    <div class="csel-dropdown">${opts}</div>
  </div>`;
}

function bindCustomSelects(container, onChange) {
  (container || document).querySelectorAll('.csel').forEach(csel => {
    const trigger = csel.querySelector('.csel-trigger');
    const dropdown = csel.querySelector('.csel-dropdown');
    trigger.onclick = (e) => {
      e.stopPropagation();
      // Close others
      document.querySelectorAll('.csel.open').forEach(c => { if (c !== csel) c.classList.remove('open'); });
      csel.classList.toggle('open');
    };
    csel.querySelectorAll('.csel-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        csel.dataset.value = val;
        csel.querySelector('.csel-label').textContent = opt.textContent;
        csel.querySelectorAll('.csel-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        csel.classList.remove('open');
        if (onChange) onChange(csel.id, val);
      };
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.csel.open').forEach(c => c.classList.remove('open'));
  }, { capture: false });
}

function viewToggleHtml(modes, current, storageKey) {
  const icons = { cards: '⊟', table: '⊞', list: '≡', dashboard: '▦', calendar: '◫', kanban: '⊡' };
  return `<div class="view-toggle">${modes.map(m =>
    `<button class="view-toggle-btn ${current===m.key?'active':''}" data-mode="${m.key}" title="${m.label}">${icons[m.key] || m.label}</button>`
  ).join('')}</div>`;
}

function bindViewToggle(modes, getCurrent, onSwitch) {
  const container = document.getElementById('main-content') || document;
  container.querySelectorAll('.view-toggle-btn[data-mode]').forEach(btn => {
    btn.onclick = () => {
      onSwitch(btn.dataset.mode);
      container.querySelectorAll('.view-toggle-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
}

function tagFilterRowHtml() {
  if (!allTags.length) return '';
  const chips = allTags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    return `<span class="tag-chip tag-filter-chip" data-tag-id="${t.id}" style="color:${hex}">${t.name}</span>`;
  }).join('');
  return `<div class="tag-filter-row">${chips}</div>`;
}

/* ─── Notion-style filter bar ─────────────────────────────────────── */
// filterDefs: [{key, label, options:[{value,label}], multi:bool}]
// sortDefs: [{key, label}]
// state: { filters:{key:Set|value}, sort:{key, dir:'asc'|'desc'} }
function notionFilterBar(containerId, filterDefs, sortDefs, state, onChange) {
  function chipHtml() {
    let chips = '';
    for (const fd of filterDefs) {
      const active = state.filters[fd.key];
      if (fd.multi) {
        if (active && active.size > 0) {
          const vals = [...active].map(v => {
            const opt = fd.options.find(o => String(o.value) === String(v));
            return opt ? opt.label : v;
          }).join(', ');
          chips += `<span class="filter-chip" data-filter-key="${fd.key}">
            <span class="filter-chip-label">${fd.label}:</span>
            <span class="filter-chip-value">${vals}</span>
            <span class="filter-chip-remove" data-remove-filter="${fd.key}" title="Remove filter">×</span>
          </span>`;
        }
      } else {
        if (active) {
          const opt = fd.options.find(o => String(o.value) === String(active));
          const val = opt ? opt.label : active;
          chips += `<span class="filter-chip" data-filter-key="${fd.key}">
            <span class="filter-chip-label">${fd.label}:</span>
            <span class="filter-chip-value">${val}</span>
            <span class="filter-chip-remove" data-remove-filter="${fd.key}" title="Remove filter">×</span>
          </span>`;
        }
      }
    }
    return chips;
  }

  function sortChipHtml() {
    const { key, dir } = state.sort || {};
    if (!key) return '';
    const sd = sortDefs.find(s => s.key === key);
    if (!sd) return '';
    const arrow = dir === 'desc' ? '↓' : '↑';
    return `<span class="filter-chip" data-sort-chip>
      <span class="filter-chip-label">Sort:</span>
      <span class="filter-chip-value">${sd.label} ${arrow}</span>
      <span class="filter-chip-remove" data-remove-sort title="Remove sort">×</span>
    </span>`;
  }

  const barHtml = `<div class="notion-filter-bar" id="${containerId}-filter-bar">
    <div class="filter-bar-wrap" style="position:relative">
      <button class="filter-sort-btn${(state.sort && state.sort.key) ? ' active' : ''}" id="${containerId}-sort-btn">↑↓ Sort</button>
      <div class="sort-dropdown hidden" id="${containerId}-sort-dropdown">
        ${sortDefs.map(sd => {
          const isActive = state.sort && state.sort.key === sd.key;
          const dir = isActive ? state.sort.dir : null;
          return `<div class="sort-dropdown-row" data-sort-key="${sd.key}">
            <span>${sd.label}</span>
            <span style="display:flex;gap:4px">
              <button class="sort-asc-btn${dir==='asc'?' active':''}" data-sort-key="${sd.key}" data-sort-dir="asc">↑</button>
              <button class="sort-desc-btn${dir==='desc'?' active':''}" data-sort-key="${sd.key}" data-sort-dir="desc">↓</button>
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="filter-bar-wrap" style="position:relative">
      <button class="filter-add-btn" id="${containerId}-filter-add-btn">+ Filter</button>
      <div class="filter-dropdown hidden" id="${containerId}-filter-dropdown">
        ${filterDefs.map(fd => `
          <div class="filter-dropdown-section">
            <span class="filter-dropdown-label">${fd.label}</span>
            ${fd.options.map(opt => {
              const checked = fd.multi
                ? (state.filters[fd.key] && state.filters[fd.key].has(String(opt.value)))
                : String(state.filters[fd.key]) === String(opt.value);
              return `<div class="filter-dropdown-opt">
                <input type="checkbox" data-filter-key="${fd.key}" data-filter-val="${opt.value}" data-filter-multi="${fd.multi?'1':'0'}" ${checked?'checked':''} />
                <span>${opt.label}</span>
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </div>
    <span class="filter-chip-separator" style="flex:0"></span>
    ${chipHtml()}
    ${sortChipHtml()}
    <input type="text" id="${containerId}-search" placeholder="Search…" style="flex:1;min-width:140px;max-width:280px;font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card);color:var(--text)" autocomplete="off" value="${state.searchText||''}" />
  </div>`;

  const container = document.getElementById(containerId);
  if (container) {
    container.insertAdjacentHTML('afterbegin', barHtml);
  }

  function refreshChips() {
    const bar = document.getElementById(`${containerId}-filter-bar`);
    if (!bar) return;
    // Remove old chips (between separator and search input)
    bar.querySelectorAll('.filter-chip').forEach(c => c.remove());
    // Insert new chips before the search input
    const search = document.getElementById(`${containerId}-search`);
    const newChips = chipHtml() + sortChipHtml();
    if (newChips && search) {
      search.insertAdjacentHTML('beforebegin', newChips);
    }
    // Re-bind remove buttons
    bar.querySelectorAll('[data-remove-filter]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); delete state.filters[el.dataset.removeFilter]; refreshChips(); onChange(); };
    });
    bar.querySelectorAll('[data-remove-sort]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); state.sort = {}; refreshChips(); onChange(); };
    });
    // Update sort button active state
    const sortBtn2 = document.getElementById(`${containerId}-sort-btn`);
    if (sortBtn2) sortBtn2.classList.toggle('active', !!(state.sort && state.sort.key));
  }

  // Bind sort button
  const sortBtn = document.getElementById(`${containerId}-sort-btn`);
  const sortDrop = document.getElementById(`${containerId}-sort-dropdown`);
  if (sortBtn && sortDrop) {
    sortBtn.onclick = (e) => { e.stopPropagation(); sortDrop.classList.toggle('hidden'); document.getElementById(`${containerId}-filter-dropdown`)?.classList.add('hidden'); };
    sortDrop.querySelectorAll('[data-sort-dir]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        state.sort = { key: btn.dataset.sortKey, dir: btn.dataset.sortDir };
        sortDrop.classList.add('hidden');
        refreshChips();
        onChange();
      };
    });
  }

  // Bind filter add button
  const filterAddBtn = document.getElementById(`${containerId}-filter-add-btn`);
  const filterDrop = document.getElementById(`${containerId}-filter-dropdown`);
  if (filterAddBtn && filterDrop) {
    filterAddBtn.onclick = (e) => { e.stopPropagation(); filterDrop.classList.toggle('hidden'); sortDrop?.classList.add('hidden'); };
    filterDrop.querySelectorAll('input[data-filter-key]').forEach(chk => {
      chk.onchange = (e) => {
        e.stopPropagation();
        const key = chk.dataset.filterKey;
        const val = chk.dataset.filterVal;
        const isMulti = chk.dataset.filterMulti === '1';
        if (isMulti) {
          if (!state.filters[key]) state.filters[key] = new Set();
          if (chk.checked) state.filters[key].add(val);
          else state.filters[key].delete(val);
          if (state.filters[key].size === 0) delete state.filters[key];
        } else {
          if (chk.checked) state.filters[key] = val;
          else delete state.filters[key];
        }
        refreshChips();
        onChange();
      };
    });
  }

  // Bind remove chip buttons (initial)
  const bar = document.getElementById(`${containerId}-filter-bar`);
  if (bar) {
    bar.querySelectorAll('[data-remove-filter]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); delete state.filters[el.dataset.removeFilter]; refreshChips(); onChange(); };
    });
    bar.querySelectorAll('[data-remove-sort]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); state.sort = {}; refreshChips(); onChange(); };
    });
    const search = document.getElementById(`${containerId}-search`);
    if (search) {
      search.oninput = () => { state.searchText = search.value; onChange(); };
    }
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    sortDrop?.classList.add('hidden');
    filterDrop?.classList.add('hidden');
  }, { capture: false });
}

function applySortFilter(list, state, fieldMap) {
  let result = [...list];
  // Apply filters
  for (const [key, val] of Object.entries(state.filters || {})) {
    const getter = fieldMap[key];
    if (!getter) continue;
    if (val instanceof Set) {
      if (val.size > 0) result = result.filter(item => val.has(String(getter(item) || '')));
    } else if (val) {
      result = result.filter(item => String(getter(item) || '').toLowerCase().includes(String(val).toLowerCase()));
    }
  }
  // Apply search text
  if (state.searchText && state.searchText.trim()) {
    const q = state.searchText.toLowerCase();
    const textGetter = fieldMap._text || (item => item.title || '');
    result = result.filter(item => String(textGetter(item) || '').toLowerCase().includes(q));
  }
  // Apply sort
  const { key, dir } = state.sort || {};
  if (key && fieldMap[key]) {
    result.sort((a, b) => {
      const av = String(fieldMap[key](a) || '');
      const bv = String(fieldMap[key](b) || '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return result;
}

function tagPickerHtml(selectedIds) {
  if (!allTags.length) return '<span style="font-size:12px;color:var(--text-muted)">No tags available</span>';
  return allTags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    const sel = (selectedIds || []).includes(t.id) ? 'selected' : '';
    return `<span class="tag-chip ${sel}" data-tag-id="${t.id}" style="color:${hex}">${t.name}</span>`;
  }).join('');
}

function bindTagPicker() {
  document.querySelectorAll('.modal-body .tag-chip, #form-slideover-body .tag-chip').forEach(chip => {
    chip.onclick = () => chip.classList.toggle('selected');
  });
}

function getSelectedTagIds() {
  return [...document.querySelectorAll('.modal-body .tag-chip.selected, #form-slideover-body .tag-chip.selected')].map(c => parseInt(c.dataset.tagId));
}

function taskRowHtml(task, showProject, indent) {
  const done = task.status === 'done';
  const titleCls = done ? 'task-title-text done' : 'task-title-text';
  const projBadge = showProject && task.project_title
    ? `<span class="task-project">${task.project_title}</span>` : '';
  const dueBadge = dueBadgeHtml(task.due_date);
  const hasChildren = (task.sub_task_count || task.subtask_count || 0) > 0;
  const isExpanded = expandedTasks.has(String(task.id));
  const chevronSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,3 5,7 8,3"/></svg>`;
  const toggleArrow = `<span class="task-toggle-arrow ${isExpanded ? 'expanded' : ''}" data-toggle-id="${task.id}" title="Toggle subtasks">${chevronSvg}</span>`;
  const tagChips = (task.tags || []).slice(0, 2).map(t => tagHtml(t)).join('');
  const recurBadge = task.recur_interval > 0 ? `<span class="task-recur-badge" title="Repeats every ${task.recur_interval} ${task.recur_unit||'days'}">↺</span>` : '';
  const indentStyle = indent ? `padding-left:${indent * 24 + 12}px` : '';

  // Category color dot
  let catColor = '';
  if (task.category_id) {
    const cat = allCategories.find(c => c.id === task.category_id);
    catColor = cat ? (COLOR_HEX[cat.color] || cat.color || '') : '';
  }
  const catDot = catColor ? `<span class="cat-dot" style="background:${catColor}" title="${task.category||''}"></span>` : '';

  return `<li class="task-row ${indent ? 'task-row-sub' : ''}" data-task-id="${task.id}" style="${indentStyle}">
    ${toggleArrow}
    <div class="task-check ${done ? 'done' : ''}" data-check-id="${task.id}">${done ? '✓' : ''}</div>
    ${catDot}
    <div class="task-content">
      <div class="${titleCls}"><span class="list-icon-slot" data-icon-entity="task" data-icon-id="${task.id}" data-icon-size="16" style="display:none;margin-right:4px;vertical-align:middle;font-size:16px"></span>${task.title} ${recurBadge}</div>
      <div class="task-meta-row">${projBadge}${dueBadge}${tagChips}</div>
    </div>
    <span class="task-row-due-right">${task.due_date ? fmtDate(task.due_date) : ''}</span>
  </li>`;
}

// Module-level tree row builder — used by dashboard and renderTasks list view
function buildTaskTreeRows(tasks, allTasks, depth, showProject) {
  let html = '';
  for (const t of tasks) {
    html += taskRowHtml(t, showProject && depth === 0, depth);
    const isExpanded = expandedTasks.has(String(t.id));
    const children = allTasks.filter(s => s.parent_task_id === t.id);
    if (isExpanded) {
      if (children.length > 0) {
        html += buildTaskTreeRows(children, allTasks, depth + 1, false);
      }
      html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
        <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px;opacity:0.6">+ Add Subtask</button>
      </li>`;
    }
  }
  return html;
}

function colorSelect(name, selected) {
  const opts = COLOR_OPTIONS.map(c =>
    `<option value="${c}" ${selected === c ? 'selected' : ''}>${c}</option>`
  ).join('');
  return `<select name="${name}" id="${name}">${opts}</select>`;
}

function categoryOptions(selected, includeBlank) {
  const blank = includeBlank ? '<option value="">— none —</option>' : '';
  return blank + allCategories.map(c =>
    `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${c.name}</option>`
  ).join('');
}

/* ─── Modal ──────────────────────────────────────────────────────────── */
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  const modal = document.getElementById('modal');
  modal.classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
  const saveBtn = document.getElementById('modal-save-btn');
  if (saveBtn && onSave) saveBtn.onclick = onSave;
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('open');
  if (!document.getElementById('slideover').classList.contains('open') &&
      !document.getElementById('form-slideover').classList.contains('open')) {
    document.getElementById('modal-backdrop').classList.remove('open');
  }
}

/* ─── Slideover ──────────────────────────────────────────────────────── */
function openSlideover(title, bodyHTML) {
  document.getElementById('slideover-title').textContent = title;
  document.getElementById('slideover-body').innerHTML = bodyHTML;
  const panel = document.getElementById('slideover');
  panel.classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('fab-group')?.classList.add('panel-open-main');
  // Clicking the main slideover body closes the secondary (props) panel
  panel.onclick = (e) => {
    const formPanel = document.getElementById('form-slideover');
    if (formPanel.classList.contains('open') && !formPanel.contains(e.target)) {
      closeFormSlideover();
    }
  };
}

function closeSlideover() {
  const panel = document.getElementById('slideover');
  panel.classList.remove('open');
  if (!document.getElementById('form-slideover').classList.contains('open')) {
    document.getElementById('modal-backdrop').classList.remove('open');
    document.getElementById('fab-group')?.classList.remove('panel-open-main');
    document.getElementById('fab-group')?.classList.remove('panel-open-form');
  }
}

/* ─── Form Slideover (for create/edit forms) ─────────────────────────── */
function openFormSlideover(title, bodyHTML) {
  document.getElementById('form-slideover-title').textContent = title;
  document.getElementById('form-slideover-body').innerHTML = bodyHTML;
  const panel = document.getElementById('form-slideover');
  panel.classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('fab-group')?.classList.add('panel-open-form');
}

function closeFormSlideover() {
  const panel = document.getElementById('form-slideover');
  panel.classList.remove('open');
  if (!document.getElementById('slideover').classList.contains('open') &&
      !document.getElementById('modal').classList.contains('open')) {
    document.getElementById('modal-backdrop').classList.remove('open');
  }
  if (!document.getElementById('slideover').classList.contains('open')) {
    document.getElementById('fab-group')?.classList.remove('panel-open-main');
    document.getElementById('fab-group')?.classList.remove('panel-open-form');
  }
}

/* ─── View Dispatcher ────────────────────────────────────────────────── */
const VIEW_LABELS = {
  dashboard: 'Dashboard', tasks: 'Tasks', projects: 'Projects', goals: 'Goals',
  notes: 'Notes', resources: 'Resources', sprints: 'Sprints', calendar: 'Calendar',
  pomodoro: 'Pomodoro', categories: 'Categories', tags: 'Tags', habits: 'Habits',
};

function updateBreadcrumb(view, params, detailLabel) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;

  // Build crumb list
  const crumbs = [];

  // Top-level detail views get a parent crumb
  const parentMap = { 'project-detail': 'projects', 'goal-detail': 'goals', 'sprint-detail': 'sprints' };
  if (parentMap[view]) {
    crumbs.push({ label: VIEW_LABELS[parentMap[view]], view: parentMap[view] });
  } else if (view !== 'dashboard') {
    // Add Dashboard as root only if not already dashboard
  }

  const label = detailLabel || VIEW_LABELS[view] || view;
  crumbs.push({ label, view, params, current: true });

  if (crumbs.length <= 1 && view === 'dashboard') {
    bc.innerHTML = '';
    return;
  }

  bc.innerHTML = crumbs.map((c, i) => {
    const sep = i > 0 ? `<span class="bc-sep">›</span>` : '';
    if (c.current) return `${sep}<span class="bc-item"><span>${c.label}</span></span>`;
    return `${sep}<span class="bc-item"><a class="bc-link" data-bc-view="${c.view}" ${c.params ? `data-bc-params="${c.params}"` : ''}>${c.label}</a></span>`;
  }).join('');

  bc.querySelectorAll('.bc-link').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); renderView(a.dataset.bcView, a.dataset.bcParams); };
  });
}

function renderView(view, params) {
  currentView = view;
  currentParams = params || null;
  closeSlideover();

  // Sync sidebar active state: detail views highlight their parent nav item
  const sidebarView = { 'project-detail': 'projects', 'goal-detail': 'goals' }[view] || view;
  document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
  const activeNavItems = document.querySelectorAll(`[data-view="${sidebarView}"]`);
  activeNavItems.forEach(l => l.classList.add('active'));
  // Animate newly-active nav item
  if (window.LifeAnimations) activeNavItems.forEach(el => LifeAnimations.navItemEnter(el));

  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="view"><div class="loading">Loading…</div></div>`;
  updateBreadcrumb(view, params);
  switch (view) {
    case 'dashboard':       renderDashboard(); break;
    case 'tasks':           renderTasks(); break;
    case 'projects':        renderProjects(); break;
    case 'project-detail':  renderProjectDetail(params); break;
    case 'goals':           renderGoals(); break;
    case 'goal-detail':     renderGoalDetail(params); break;
    case 'notes':           renderNotes(); break;
    case 'sprints':         renderSprints(); break;
    case 'sprint-detail':  renderSprintDetail(params); break;
    case 'resources':       renderResources(); break;
    case 'categories':      renderCategories(); break;
    case 'tags':            renderTags(); break;
    case 'pomodoro':        renderPomodoro(); break;
    case 'calendar':        renderCalendarView(); break;
    case 'habits':          renderHabits(); break;
    default:
      main.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-icon">?</div><div class="empty-state-text">Unknown view</div></div></div>`;
  }
}

/* ─── Dashboard ──────────────────────────────────────────────────────── */
let dashboardMode = localStorage.getItem('dashboardMode') || 'tables';

async function renderDashboard() {
  let data = {}, goals = [], notes = [], resources = [], allTasks = [];
  let apiError = null;
  try {
    [data, goals, notes, resources, allTasks] = await Promise.all([
      api('GET', '/api/dashboard'),
      api('GET', '/api/goals'),
      api('GET', '/api/notes'),
      api('GET', '/api/resources'),
      api('GET', '/api/tasks?all=1'),
    ]);
  } catch(e) { data = {}; apiError = e.message || String(e); }
  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server at <b>localhost:3344</b>. Start the Go server:
        <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px">cd raibis-go && go run ./cmd/server/main.go</code>
        <br><small style="color:var(--text-muted)">${apiError}</small>
      </div>
    </div>`;
    return;
  }

  const goalsCount = data.goals_count || 0;
  const projectsCount = data.projects_count || 0;
  const inProgressCount = data.in_progress || 0;
  const overdueCount = data.overdue || 0;
  const sprint = data.active_sprint || null;
  const projects = data.active_projects || [];
  const todayTasks = data.today_tasks || [];
  const urgentTasks = data.urgent_tasks || [];
  // Active tasks = all non-done top-level tasks for the "All Tasks" section
  allTasksCache = allTasks;
  const activeTasks = (allTasks || []).filter(t => t.status !== 'done' && !t.parent_task_id);
  // Compute sub_task_count for ALL tasks so subtask toggles work at every depth
  allTasks.forEach(t => {
    t.sub_task_count = allTasks.filter(c => c.parent_task_id === t.id).length;
  });

  const sprintWidget = sprint ? (() => {
    const sprintPctVal = sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;
    const spCap = sprint.story_points || 0;
    const spDone = sprint.story_points_done || 0;
    const spColor = spGradientColor(spDone, spCap);
    const spBar = spCap > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-top:6px;margin-bottom:2px">
        <span>Story Points</span><span style="font-weight:600;color:${spColor}">${spDone} / ${spCap}</span>
      </div>
      <div class="sprint-progress-bar" style="height:4px">
        <div class="sprint-progress-fill" style="width:${Math.min(100,Math.round(spDone/spCap*100))}%;background:${spColor}"></div>
      </div>` : '';
    return `
      <div class="sprint-name" style="cursor:pointer" data-sprint-id="${sprint.id}">${sprint.title}</div>
      <div class="sprint-dates">${fmtDate(sprint.start_date)} → ${fmtDate(sprint.end_date)}</div>
      <div class="sprint-progress-bar"><div class="sprint-progress-fill" style="width:${sprintPctVal}%"></div></div>
      <div class="sprint-stats">${sprint.done || 0}/${sprint.total || 0} tasks · ${sprintPctVal}%</div>
      ${spBar}`;
  })() : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No active sprint</div></div>`;

  const projRows = projects.slice(0, 5).map(p => {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    return `<div class="proj-row" data-proj-id="${p.id}" style="cursor:pointer">
      <span class="proj-name">${p.title}</span>
      <div class="proj-bar-wrap"><div class="proj-bar"><div class="proj-bar-fill" style="width:${pct}%"></div></div></div>
      <span class="proj-pct">${pct}%</span>
    </div>`;
  }).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No active projects</div></div>`;

  const todayRows = todayTasks.map(t => taskRowHtml(t, true)).join('')
    || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">Nothing due today</div></div>`;

  const urgentSection = urgentTasks.length > 0 ? `
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Urgent / High Priority</span></div>
        <ul class="task-list">${urgentTasks.slice(0,5).map(t => taskRowHtml(t, true)).join('')}</ul>
      </div>
    </div>` : '';

  // Goals section
  const goalsSection = goals.length > 0 ? `
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Goals (${goals.length})</span>
          <button class="btn btn-sm btn-ghost" onclick="renderView('goals')">View all →</button>
        </div>
        <div class="notion-table-wrap"><table class="notion-table">
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>${goals.slice(0,5).map(g => `<tr style="cursor:pointer" onclick="renderView('goal-detail','${g.id}')">
            <td>${g.title}</td><td>${g.type||'—'}</td><td>${statusBadge(g.status)}</td>
            <td style="font-size:11px;color:var(--text-muted)">${fmtDate(g.due_date)||'—'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${goals.length > 5 ? `<div style="padding:8px 0;text-align:center"><button class="btn btn-sm btn-ghost dash-show-more" data-type="goals">Show ${goals.length-5} more…</button></div>` : ''}
      </div>
    </div>` : '';

  // Notes section
  const notesSection = notes.length > 0 ? `
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Recent Notes (${notes.length})</span>
          <button class="btn btn-sm btn-ghost" onclick="renderView('notes')">View all →</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">${notes.slice(0,4).map(n => `
          <div class="note-card" style="flex:1;min-width:180px;max-width:260px">
            <div class="note-title">${n.title || 'Untitled'}</div>
            <div class="note-body-preview">${(n.body||'').slice(0,80)}${n.body&&n.body.length>80?'…':''}</div>
          </div>`).join('')}</div>
        ${notes.length > 4 ? `<div style="padding:8px 0;text-align:center"><button class="btn btn-sm btn-ghost" onclick="renderView('notes')">Show more notes →</button></div>` : ''}
      </div>
    </div>` : '';

  // Stats mode bars
  const taskStatusCounts = {};
  TASK_STATUSES.forEach(s => taskStatusCounts[s] = 0);
  todayTasks.concat(urgentTasks).forEach(t => { if (taskStatusCounts[t.status]!==undefined) taskStatusCounts[t.status]++; });
  const maxCount = Math.max(...Object.values(taskStatusCounts), 1);
  const statsSection = `
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Tasks by Status</span></div>
        ${TASK_STATUSES.map(s => {
          const c = taskStatusCounts[s];
          const pct = Math.round((c / maxCount) * 100);
          return `<div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>${s.replace('_',' ')}</span><span>${c}</span></div>
            <div style="height:6px;background:var(--border);border-radius:3px"><div style="height:100%;background:var(--accent);border-radius:3px;width:${pct}%"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Goal Progress</span></div>
        ${goals.slice(0,6).map(g => {
          const pct = g.progress?.pct || 0;
          return `<div style="margin-bottom:8px;cursor:pointer" onclick="renderView('goal-detail','${g.id}')">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>${g.title.slice(0,30)}</span><span>${pct}%</span></div>
            <div style="height:5px;background:var(--border);border-radius:3px"><div style="height:100%;background:var(--success);border-radius:3px;width:${pct}%"></div></div>
          </div>`;
        }).join('') || '<div class="empty-state" style="padding:16px"><div class="empty-state-text">No goals</div></div>'}
      </div>
    </div>`;

  const tablesContent = `
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Active Sprint</span></div>
        ${sprintWidget}
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Active Projects</span></div>
        ${projRows}
      </div>
    </div>
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">All Tasks</span>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="dash-task-status-filter" style="font-size:11px;padding:2px 6px">
              <option value="">All statuses</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
            </select>
            <button class="btn btn-sm btn-ghost widget-action" id="dash-add-task">+ Add Task</button>
          </div>
        </div>
        <ul class="task-list" id="dash-all-tasks-list">${activeTasks.length ? buildTaskTreeRows(activeTasks, allTasks, 0, true) : '<li style="padding:12px;color:var(--text-muted);font-size:13px">No open tasks</li>'}</ul>
      </div>
    </div>
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Today's Tasks</span>
        </div>
        <ul class="task-list">${todayRows}</ul>
      </div>
    </div>
    ${urgentSection}
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header">
          <span class="widget-title">Daily Notes</span>
          <span style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace" id="daily-note-date"></span>
        </div>
        <textarea id="daily-note-input" placeholder="Write your thoughts for today… (auto-saved as a note at end of day)" style="width:100%;min-height:80px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:13px;padding:10px 12px;resize:vertical;font-family:'DM Sans',sans-serif;box-sizing:border-box">${localStorage.getItem('daily_note_draft')||''}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-sm btn-primary" id="daily-note-save-btn">Save as Note</button>
          <button class="btn btn-sm btn-ghost" id="daily-note-clear-btn">Clear</button>
        </div>
      </div>
    </div>
    ${goalsSection}
    ${notesSection}`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Command Center</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="text" id="dash-global-search" placeholder="Filter tasks…" style="width:200px" />
        <div class="view-toggle">
          <button class="view-toggle-btn ${dashboardMode==='tables'?'active':''}" data-dash-mode="tables" title="Tables">⊞</button>
          <button class="view-toggle-btn ${dashboardMode==='stats'?'active':''}" data-dash-mode="stats" title="Stats">◉</button>
        </div>
        <button class="btn btn-primary" id="dash-quick-task">+ Quick Task</button>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${goalsCount}</div><div class="stat-label">Goals</div></div>
      <div class="stat-card"><div class="stat-value">${projectsCount}</div><div class="stat-label">Projects</div></div>
      <div class="stat-card"><div class="stat-value">${inProgressCount}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${overdueCount}</div><div class="stat-label">Overdue</div></div>
    </div>
    <div id="dash-content">${dashboardMode === 'stats' ? statsSection : tablesContent}</div>
  </div>`;

  document.getElementById('dash-quick-task').onclick = () => showNewTaskModal({});
  const dashAddTaskBtn = document.getElementById('dash-add-task');
  if (dashAddTaskBtn) dashAddTaskBtn.onclick = () => showNewTaskModal({});
  document.getElementById('dash-global-search').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.task-row').forEach(row => {
      const title = row.querySelector('.task-title-text')?.textContent?.toLowerCase() || '';
      row.style.display = (!q || title.includes(q)) ? '' : 'none';
    });
  };
  document.querySelectorAll('[data-dash-mode]').forEach(btn => {
    btn.onclick = () => {
      dashboardMode = btn.dataset.dashMode;
      localStorage.setItem('dashboardMode', dashboardMode);
      renderDashboard();
    };
  });
  bindTaskListEvents();
  document.querySelectorAll('.proj-row').forEach(el => {
    el.onclick = () => renderView('project-detail', el.dataset.projId);
  });
  document.querySelectorAll('.sprint-name[data-sprint-id]').forEach(el => {
    el.onclick = () => renderView('sprint-detail', el.dataset.sprintId);
  });

  // All Tasks status filter
  const taskStatusFilter = document.getElementById('dash-task-status-filter');
  if (taskStatusFilter) {
    taskStatusFilter.onchange = () => {
      const status = taskStatusFilter.value;
      const list = document.getElementById('dash-all-tasks-list');
      if (!list) return;
      const filtered = status ? activeTasks.filter(t => t.status === status) : activeTasks;
      list.innerHTML = filtered.map(t => taskRowHtml(t, true)).join('') || '<li style="padding:12px;color:var(--text-muted);font-size:13px">No tasks</li>';
      bindTaskListEvents();
    };
  }

  // Daily notes widget
  const dailyNoteDateEl = document.getElementById('daily-note-date');
  if (dailyNoteDateEl) {
    const today = new Date();
    dailyNoteDateEl.textContent = today.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  }
  const dailyInput = document.getElementById('daily-note-input');
  if (dailyInput) {
    dailyInput.oninput = () => localStorage.setItem('daily_note_draft', dailyInput.value);
    document.getElementById('daily-note-save-btn').onclick = async () => {
      const text = dailyInput.value.trim();
      if (!text) { alert('Write something first'); return; }
      const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
      await api('POST', '/api/notes', { title: `Daily Note — ${dateStr}`, body: text });
      localStorage.removeItem('daily_note_draft');
      dailyInput.value = '';
      alert('Note saved!');
      renderDashboard();
    };
    document.getElementById('daily-note-clear-btn').onclick = () => {
      dailyInput.value = '';
      localStorage.removeItem('daily_note_draft');
    };
  }

  // ── GSAP page enter + stagger animations ──────────────────────────
  if (window.LifeAnimations) {
    LifeAnimations.pageEnter('#main-content .view');
    // Stagger stat cards
    requestAnimationFrame(() => {
      LifeAnimations.staggerList('#main-content .stat-card', { stagger: 0.05 });
      LifeAnimations.staggerList('#main-content .task-row', { stagger: 0.03, delay: 0.1 });
      LifeAnimations.hoverLiftAll('#main-content .stat-card');
      LifeAnimations.hoverLiftAll('#main-content .widget');
    });
  }
  // Inject task icons (dashboard task list)
  injectListIcons('task', allTasks.map(t => t.id));
}

/* ─── Tasks View ─────────────────────────────────────────────────────── */
async function renderTasks() {
  let tasks = [], projects = [], allTasksFull = [];
  let apiError = null;
  try {
    [tasks, projects, allTasksFull] = await Promise.all([
      api('GET', '/api/tasks'),
      api('GET', '/api/projects'),
      api('GET', '/api/tasks?all=1'),
    ]);
    allTasksCache = allTasksFull;
  } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const topLevel = tasks; // already top-level-only from server default
  // Compute sub_task_count for all tasks (used by list view + table view)
  allTasksFull.forEach(t => {
    t.sub_task_count = allTasksFull.filter(c => c.parent_task_id === t.id).length;
  });
  // Copy into topLevel (same objects, but ensure topLevel also has it)
  topLevel.forEach(t => {
    if (t.sub_task_count === undefined)
      t.sub_task_count = allTasksFull.filter(c => c.parent_task_id === t.id).length;
  });

  const taskFilterState = { filters: {}, sort: {}, searchText: '' };

  const viewToggle = `<div class="view-toggle">
    <button class="view-toggle-btn ${tasksViewMode==='list'?'active':''}" data-mode="list" title="List">≡</button>
    <button class="view-toggle-btn ${tasksViewMode==='table'?'active':''}" data-mode="table" title="Table">⊞</button>
    <button class="view-toggle-btn ${tasksViewMode==='kanban'?'active':''}" data-mode="kanban" title="Kanban">⊟</button>
    <button class="view-toggle-btn ${tasksViewMode==='dashboard'?'active':''}" data-mode="dashboard" title="Dashboard">▦</button>
  </div>`;

  const kanbanGroupByHtml = `<div class="col-picker-wrap" id="kanban-groupby-wrap" style="${tasksViewMode==='kanban'?'':'display:none'}">
    <button class="btn btn-sm btn-ghost" id="kanban-groupby-btn" title="Group by">⊟ Group: ${tasksKanbanGroupBy}</button>
    <div class="col-picker-dropdown hidden" id="kanban-groupby-dropdown">
      <label class="col-picker-item"><input type="radio" name="kanban-groupby" value="status" ${tasksKanbanGroupBy==='status'?'checked':''}> Status</label>
      <label class="col-picker-item"><input type="radio" name="kanban-groupby" value="priority" ${tasksKanbanGroupBy==='priority'?'checked':''}> Priority</label>
    </div>
  </div>`;

  // Columns picker: table cols for list/table view; kanban column visibility for kanban view
  const isKanban = tasksViewMode === 'kanban';
  const kanbanCols = isKanban ? (tasksKanbanGroupBy === 'status' ? TASK_STATUSES : TASK_PRIORITIES) : [];
  const hiddenForGroup = isKanban ? (kanbanHiddenCols[tasksKanbanGroupBy] || []) : [];
  const colPickerHtml = `<div class="col-picker-wrap" style="position:relative" id="col-picker-wrap">
    <button class="btn btn-sm btn-ghost" id="col-picker-btn" title="Show/hide columns">⊟ Columns</button>
    <div class="col-picker-dropdown hidden" id="col-picker-dropdown">
      ${isKanban
        ? kanbanCols.map(col => `<label class="col-picker-item"><input type="checkbox" class="kanban-col-check" data-col="${col}" ${hiddenForGroup.includes(col)?'':'checked'}> ${col.replace(/_/g,' ')}</label>`).join('')
        : TASK_TABLE_COLS.map(col => `<label class="col-picker-item"><input type="checkbox" class="col-picker-check" data-col="${col}" ${taskTableCols.includes(col)?'checked':''}> ${col}</label>`).join('')
      }
    </div>
  </div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Tasks</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${viewToggle}
        ${kanbanGroupByHtml}
        ${colPickerHtml}
        <button class="btn btn-primary" id="new-task-btn">+ New Task</button>
      </div>
    </div>
    <div id="tasks-content"></div>
  </div>`;

  document.getElementById('new-task-btn').onclick = () => showNewTaskModal({});

  // Column picker
  const colPickerBtn = document.getElementById('col-picker-btn');
  const colPickerDrop = document.getElementById('col-picker-dropdown');
  if (colPickerBtn) {
    colPickerBtn.onclick = (e) => { e.stopPropagation(); colPickerDrop.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => {
      if (!colPickerBtn.contains(e.target)) colPickerDrop.classList.add('hidden');
    }, { once: false, capture: false });
    // Table cols handler
    document.querySelectorAll('.col-picker-check').forEach(chk => {
      chk.onchange = () => {
        taskTableCols = [...document.querySelectorAll('.col-picker-check:checked')].map(c => c.dataset.col);
        if (!taskTableCols.length) taskTableCols = ['title']; // always keep title
        localStorage.setItem('taskTableCols', JSON.stringify(taskTableCols));
        render();
      };
    });
    // Kanban col visibility handler
    document.querySelectorAll('.kanban-col-check').forEach(chk => {
      chk.onchange = () => {
        const checked = [...document.querySelectorAll('.kanban-col-check')].map(c => ({ col: c.dataset.col, on: c.checked }));
        kanbanHiddenCols[tasksKanbanGroupBy] = checked.filter(c => !c.on).map(c => c.col);
        localStorage.setItem('kanbanHiddenCols', JSON.stringify(kanbanHiddenCols));
        render();
      };
    });
  }

  // View toggle
  document.querySelectorAll('#main-content .view-toggle-btn[data-mode]').forEach(btn => {
    btn.onclick = () => {
      tasksViewMode = btn.dataset.mode;
      localStorage.setItem('tasksViewMode', tasksViewMode);
      document.querySelectorAll('#main-content .view-toggle-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const gbWrap = document.getElementById('kanban-groupby-wrap');
      if (gbWrap) gbWrap.style.display = tasksViewMode === 'kanban' ? '' : 'none';
      render();
    };
  });

  // Kanban group-by dropdown
  const kanbanGbBtn = document.getElementById('kanban-groupby-btn');
  const kanbanGbDrop = document.getElementById('kanban-groupby-dropdown');
  if (kanbanGbBtn && kanbanGbDrop) {
    kanbanGbBtn.onclick = (e) => { e.stopPropagation(); kanbanGbDrop.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => {
      if (kanbanGbBtn && !kanbanGbBtn.contains(e.target)) kanbanGbDrop.classList.add('hidden');
    });
    kanbanGbDrop.querySelectorAll('input[name="kanban-groupby"]').forEach(radio => {
      radio.onchange = () => {
        tasksKanbanGroupBy = radio.value;
        localStorage.setItem('tasksKanbanGroupBy', tasksKanbanGroupBy);
        if (kanbanGbBtn) kanbanGbBtn.textContent = `⊟ Group: ${tasksKanbanGroupBy}`;
        kanbanGbDrop.classList.add('hidden');
        render();
      };
    });
  }

  function getFiltered() {
    return applySortFilter(topLevel, taskFilterState, {
      status: t => t.status,
      priority: t => t.priority,
      project: t => String(t.project_id || ''),
      _text: t => t.title + ' ' + (t.description || '') + ' ' + (t.project_title || ''),
      title: t => t.title,
      due: t => t.due_date || '',
    });
  }

  function buildListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;
    return '<ul class="task-list">' + buildTaskTreeRows(list, allTasksFull, 0, true) + '</ul>';
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;

    const cols = taskTableCols.length ? taskTableCols : TASK_TABLE_COLS;
    const colDef = {
      title:    { header: 'Title',    cell: (t, depth, toggleBtn) => `<td><div class="task-title-cell" style="padding-left:${depth*20}px">${toggleBtn}<span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-task-id="${t.id}">${t.title}${t.recur_interval>0?` <span class="task-recur-badge">↺</span>`:''}</span></div></td>` },
      project:  { header: 'Project',  cell: (t) => `<td>${t.project_title ? `<span class="badge badge-todo">${t.project_title}</span>` : '—'}</td>` },
      status:   { header: 'Status',   cell: (t) => { const sopts = TASK_STATUSES.map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join(''); return `<td><select class="inline-status-select" data-task-id="${t.id}" style="font-size:11px;padding:2px 6px;border-radius:3px">${sopts}</select></td>`; } },
      priority: { header: 'Priority', cell: (t) => `<td>${priorityBadge(t.priority)}</td>` },
      due:      { header: 'Due',      cell: (t) => `<td class="${isOverdue(t.due_date)?'task-due overdue':isToday(t.due_date)?'task-due today':''}">${fmtDate(t.due_date)||'—'}</td>` },
      tags:     { header: 'Tags',     cell: (t) => `<td>${(t.tags||[]).map(tg=>tagHtml(tg)).join('')}</td>` },
    };

    function tableRows(tasks, depth) {
      let html = '';
      tasks.forEach(t => {
        const children = allTasksFull.filter(c => c.parent_task_id && String(c.parent_task_id) === String(t.id));
        const hasChildren = children.length > 0 || (t.sub_task_count || 0) > 0;
        const isExpanded = expandedTasks.has(String(t.id));
        const chevronSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,3 5,7 8,3"/></svg>`;
        const toggleBtn = hasChildren
          ? `<span class="task-toggle-arrow ${isExpanded ? 'expanded' : ''}" data-toggle-id="${t.id}" title="Toggle subtasks">${chevronSvg}</span>`
          : `<span class="task-add-sub-btn" data-add-sub-id="${t.id}" title="Add subtask">${chevronSvg}</span>`;
        html += `<tr class="task-table-row" data-task-id="${t.id}" style="position:relative">
          ${cols.map(c => colDef[c] ? (c === 'title' ? colDef.title.cell(t, depth, toggleBtn) : colDef[c].cell(t)) : '').join('')}
          <td><button class="btn btn-sm btn-danger task-del-btn" data-task-id="${t.id}">×</button></td>
        </tr>`;
        if (isExpanded && children.length > 0) {
          html += tableRows(children, depth + 1);
          const colspan = cols.length + 1;
          html += `<tr class="task-quick-add-row task-table-add-row" data-add-parent="${t.id}">
            <td colspan="${colspan}" style="padding:4px 8px 4px ${(depth+1)*20+8}px">
              <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:12px;color:var(--color-text-secondary)">+ Add Subtask</button>
            </td>
          </tr>`;
        }
      });
      return html;
    }

    const headers = cols.map(c => colDef[c] ? `<th>${colDef[c].header}</th>` : '').join('') + '<th></th>';
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${tableRows(list, 0)}</tbody></table></div>`;
  }

  function buildDashboardView(list) {
    const total = list.length;
    const todo = list.filter(t => t.status === 'todo').length;
    const inprog = list.filter(t => t.status === 'in_progress').length;
    const done = list.filter(t => t.status === 'done').length;
    const overdue = list.filter(t => isOverdue(t.due_date) && t.status !== 'done').length;
    const byPriority = { urgent:0, high:0, medium:0, low:0 };
    list.forEach(t => { if (byPriority[t.priority] !== undefined) byPriority[t.priority]++; });
    const maxPrio = Math.max(...Object.values(byPriority), 1);
    const prioBar = (label, count, cls) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="width:60px;font-size:11px;color:var(--text-muted)">${label}</span>
      <div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden">
        <div style="width:${Math.round((count/maxPrio)*100)}%;height:100%;background:var(--accent);border-radius:5px"></div>
      </div>
      <span style="width:24px;text-align:right;font-size:11px;font-family:DM Mono,monospace">${count}</span>
    </div>`;
    return `<div class="stats-row" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-value">${todo}</div><div class="stat-label">Todo</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${inprog}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${done}</div><div class="stat-label">Done</div></div>
    </div>
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">By Priority</span></div>
        ${prioBar('Urgent', byPriority.urgent, 'danger')}
        ${prioBar('High', byPriority.high, 'high')}
        ${prioBar('Medium', byPriority.medium, 'medium')}
        ${prioBar('Low', byPriority.low, 'low')}
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Overdue</span></div>
        <div class="stat-value" style="font-size:36px;color:${overdue>0?'var(--danger)':'var(--success)'}">${overdue}</div>
        <div class="stat-label" style="margin-top:4px">${overdue > 0 ? 'tasks past due' : 'all on track'}</div>
      </div>
    </div>
    <div class="widget" style="margin-top:0">
      <div class="widget-header"><span class="widget-title">In Progress</span></div>
      <ul class="task-list">${list.filter(t=>t.status==='in_progress').map(t=>taskRowHtml(t,true)).join('')||'<li style="padding:12px;color:var(--text-muted);font-size:13px">None in progress</li>'}</ul>
    </div>`;
  }

  function buildKanbanView(list) {
    const groupBy = tasksKanbanGroupBy;
    const allCols = groupBy === 'status' ? TASK_STATUSES : TASK_PRIORITIES;
    const hidden = kanbanHiddenCols[groupBy] || [];
    const cols = allCols.filter(c => !hidden.includes(c));
    const grouped = {};
    allCols.forEach(c => { grouped[c] = []; });
    // Also collect tasks with values not in current cols array (custom values)
    list.forEach(t => {
      const key = t[groupBy] || '';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    // Include extra keys that exist in data but not in known cols, and aren't hidden
    const extraKeys = Object.keys(grouped).filter(k => !allCols.includes(k) && grouped[k].length > 0 && !hidden.includes(k));
    const allKeys = [...cols, ...extraKeys];

    const colsHtml = allKeys.map(colKey => {
      const tasks = grouped[colKey] || [];
      const cards = tasks.map(t => {
        const dueCls = isOverdue(t.due_date) ? 'overdue' : isToday(t.due_date) ? 'today' : '';
        return `<div class="kanban-card" data-task-id="${t.id}" draggable="true"
          ondragstart="event.dataTransfer.setData('text/plain',${t.id});event.currentTarget.classList.add('kanban-dragging')"
          ondragend="event.currentTarget.classList.remove('kanban-dragging')"
          style="cursor:pointer">
          <div class="kanban-card-title">${t.title}${t.recur_interval>0?' <span class="task-recur-badge">↺</span>':''}</div>
          ${t.project_title ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${t.project_title}</div>` : ''}
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">
            ${groupBy === 'status' ? priorityBadge(t.priority) : statusBadge(t.status)}
            ${t.due_date ? `<span class="task-due ${dueCls}" style="font-size:10px">${fmtDate(t.due_date)}</span>` : ''}
          </div>
        </div>`;
      }).join('');
      const label = colKey.replace(/_/g,' ');
      const colColor = getValueColor(groupBy === 'status' ? 'taskStatuses' : 'taskPriorities', colKey);
      return `<div class="kanban-col" data-col="${colKey}"
          ondragover="event.preventDefault();event.currentTarget.classList.add('kanban-drag-over')"
          ondragleave="event.currentTarget.classList.remove('kanban-drag-over')"
          ondrop="event.preventDefault();event.currentTarget.classList.remove('kanban-drag-over');window._taskKanbanDrop(event,'${colKey}')">
        <div class="kanban-col-header" style="${colColor ? `color:${colColor}` : ''}">
          <span>${label}</span>
          <span class="kanban-count">${tasks.length}</span>
        </div>
        <div class="kanban-col-body">${cards || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No tasks</div>'}</div>
        <button class="btn btn-sm btn-ghost kanban-add-btn" data-status="${colKey}" style="width:100%;margin-top:8px;font-size:12px">+ Add task</button>
      </div>`;
    }).join('');

    // Set explicit column count so all columns stay on one row; horizontal scroll if needed
    const colCount = allKeys.length;
    const colWidth = 260; // px per column
    const boardStyle = `display:grid;grid-template-columns:repeat(${colCount},minmax(${colWidth}px,1fr));gap:var(--space-4);align-items:start;padding-bottom:16px`;
    return `<div style="overflow-x:auto;width:100%"><div class="kanban-board" style="${boardStyle}" data-groupby="${groupBy}">${colsHtml}</div></div>`;
  }

  window._taskKanbanDrop = async (e, newColKey) => {
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    // Read groupBy from the board element so it's always current
    const board = document.querySelector('.kanban-board[data-groupby]');
    const patchField = board ? board.dataset.groupby : tasksKanbanGroupBy;
    await api('PATCH', `/api/tasks/${taskId}`, { [patchField]: newColKey });
    renderTasks();
  };

  let filterBarInitialized = false;
  function render() {
    const filtered = getFiltered();
    let content = '';
    if (tasksViewMode === 'list') content = buildListView(filtered);
    else if (tasksViewMode === 'table') content = buildTableView(filtered);
    else if (tasksViewMode === 'kanban') content = buildKanbanView(filtered);
    else if (tasksViewMode === 'dashboard') content = buildDashboardView(filtered);
    document.getElementById('tasks-content').innerHTML = content;
    // Initialize filter bar once after content container is in DOM
    if (!filterBarInitialized) {
      filterBarInitialized = true;
      const taskFilterDefs = [
        { key: 'status', label: 'Status', multi: true, options: TASK_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })) },
        { key: 'priority', label: 'Priority', multi: true, options: TASK_PRIORITIES.map(p => ({ value: p, label: p })) },
        { key: 'project', label: 'Project', multi: false, options: [{ value: '', label: 'All' }, ...projects.map(p => ({ value: String(p.id), label: p.title }))] },
      ];
      const taskSortDefs = [
        { key: 'title', label: 'Title' },
        { key: 'due', label: 'Due Date' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
      ];
      const viewEl = document.querySelector('#main-content .view');
      if (viewEl) {
        const headerEl = viewEl.querySelector('.view-header');
        const barDiv = document.createElement('div');
        barDiv.id = 'tasks-filter-bar-container';
        if (headerEl) headerEl.after(barDiv);
        notionFilterBar('tasks-filter-bar-container', taskFilterDefs, taskSortDefs, taskFilterState, render);
      }
    }
    bindTasksContentEvents();
    // Inject entity icons into task title slots — include subtask ids too
    injectListIcons('task', allTasksFull.map(t => t.id));
  }

  render();

  function bindTasksContentEvents() {
    document.querySelectorAll('.task-toggle-arrow').forEach(arrow => {
      arrow.onclick = async (e) => {
        e.stopPropagation();
        const id = String(arrow.dataset.toggleId);
        if (expandedTasks.has(id)) expandedTasks.delete(id);
        else expandedTasks.add(id);
        render();
      };
    });

    // Inline subtask add button
    document.querySelectorAll('.add-subtask-inline-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const parentId = parseInt(btn.dataset.parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
          allTasksFull = await api('GET', '/api/tasks?all=1');
          allTasksCache = allTasksFull;
          const parent = allTasksFull.find(t => t.id === parentId);
          if (parent) parent.sub_task_count = (parent.sub_task_count || 0) + 1;
          render();
        });
      };
    });

    // Task row click → slideover (only arrow and check are excluded)
    document.querySelectorAll('.task-row').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('.task-toggle-arrow') ||
            e.target.closest('.task-check') ||
            e.target.closest('.add-subtask-inline-btn') ||
            e.target.closest('.inline-subtask-input-row') ||
            e.target.dataset.checkId) return;
        showTaskSlideover(row.dataset.taskId);
      };
    });
    // Table row click → slideover (guards against toggle/add-sub/select)
    document.querySelectorAll('.task-table-row').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('.task-toggle-arrow') ||
            e.target.closest('.task-add-sub-btn') ||
            e.target.tagName === 'SELECT' ||
            e.target.tagName === 'BUTTON' ||
            e.target.closest('button')) return;
        showTaskSlideover(row.dataset.taskId);
      };
    });

    // Title links (table view)
    document.querySelectorAll('.task-title-link').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); showTaskSlideover(el.dataset.taskId); };
    });

    // Inline status change (table view)
    document.querySelectorAll('.inline-status-select').forEach(sel => {
      sel.onchange = async (e) => {
        e.stopPropagation();
        const id = sel.dataset.taskId;
        const newStatus = sel.value;
        try { await api('PATCH', `/api/tasks/${id}`, { status: newStatus }); } catch(err) {}
        const t = topLevel.find(x => String(x.id) === String(id));
        if (t) t.status = newStatus;
        // Handle recurring
        if (newStatus === 'done' && t && t.recur_interval > 0) {
          const interval = t.recur_interval;
          const unit = (t.recur_unit || 'days').toLowerCase();
          let nextDue = null;
          if (t.due_date) {
            const d = new Date(stripDate(t.due_date) + 'T00:00:00');
            if (unit.startsWith('day')) d.setDate(d.getDate() + interval);
            else if (unit.startsWith('week')) d.setDate(d.getDate() + interval * 7);
            else if (unit.startsWith('month')) d.setMonth(d.getMonth() + interval);
            else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + interval);
            nextDue = d.toISOString().split('T')[0];
          }
          try { await api('POST', '/api/tasks', { ...t, id: undefined, status: 'todo', due_date: nextDue, pomodoros_finished: 0 }); } catch(e) {}
        }
      };
    });

    // Checkboxes
    document.querySelectorAll('.task-check').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const id = el.dataset.checkId;
        const isDone = el.classList.contains('done');
        const newStatus = isDone ? 'todo' : 'done';
        try { await api('PATCH', `/api/tasks/${id}`, { status: newStatus }); } catch(err) {}
        // Handle recurring: if marking done and task has recur_interval, create next occurrence
        if (!isDone) {
          const t = topLevel.find(x => String(x.id) === String(id)) || allTasksFull.find(x => String(x.id) === String(id));
          if (t && t.recur_interval > 0) {
            const interval = t.recur_interval;
            const unit = (t.recur_unit || 'days').toLowerCase();
            let nextDue = null;
            if (t.due_date) {
              const d = new Date(stripDate(t.due_date) + 'T00:00:00');
              if (unit.startsWith('day')) d.setDate(d.getDate() + interval);
              else if (unit.startsWith('week')) d.setDate(d.getDate() + interval * 7);
              else if (unit.startsWith('month')) d.setMonth(d.getMonth() + interval);
              else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + interval);
              nextDue = d.toISOString().split('T')[0];
            }
            try { await api('POST', '/api/tasks', { ...t, id: undefined, status: 'todo', due_date: nextDue, pomodoros_finished: 0 }); } catch(e) {}
          }
        }
        // optimistically update
        const t = topLevel.find(x => String(x.id) === String(id)) ||
                  allTasksFull.find(x => String(x.id) === String(id));
        if (t) t.status = newStatus;
        render();
      };
    });

    // Delete buttons (table view)
    document.querySelectorAll('.task-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this task?')) return;
        await api('DELETE', `/api/tasks/${el.dataset.taskId}`);
        renderTasks();
      };
    });

    // Kanban card click → slideover
    document.querySelectorAll('.kanban-card[data-task-id]').forEach(card => {
      card.onclick = () => showTaskSlideover(card.dataset.taskId);
    });

    // Kanban "+ Add task" button
    document.querySelectorAll('.kanban-add-btn').forEach(btn => {
      btn.onclick = () => {
        const presets = {};
        if (tasksKanbanGroupBy === 'status') presets.status = btn.dataset.status;
        else if (tasksKanbanGroupBy === 'priority') presets.priority = btn.dataset.status; // dataset.status holds the col key
        showNewTaskModal(presets, () => renderTasks());
      };
    });

    // Calendar nav
    document.getElementById('cal-prev')?.addEventListener('click', () => { calMonth--; if (calMonth<0){calMonth=11;calYear--;} renderCalendarView(); });
    document.getElementById('cal-next')?.addEventListener('click', () => { calMonth++; if (calMonth>11){calMonth=0;calYear++;} renderCalendarView(); });
    document.querySelectorAll('.cal-task-chip').forEach(chip => {
      chip.onclick = (e) => { e.stopPropagation(); showTaskSlideover(chip.dataset.taskId); };
    });
  }
}

/* ─── Projects View ──────────────────────────────────────────────────── */
async function renderProjects() {
  let projects = [], goals = [];
  let apiError = null;
  try { [projects, goals] = await Promise.all([api('GET', '/api/projects'), api('GET', '/api/goals')]); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const projFilterState = { filters: {}, sort: {}, searchText: '' };

  function buildProjectCard(p) {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    const activeTasks = (p.active_tasks || []).slice(0, 3).map(t =>
      `<div style="font-size:12px;color:var(--text-muted);padding:2px 0">• ${t}</div>`
    ).join('');
    const tagChips = (p.tags || []).map(t => tagHtml(t)).join('');
    return `<div class="card proj-slideover-card" data-proj-id="${p.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title"><span class="list-icon-slot" data-icon-entity="project" data-icon-id="${p.id}" data-icon-size="20" style="display:none;margin-right:6px;vertical-align:middle;font-size:20px"></span>${p.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button>
          <button class="btn btn-sm btn-danger proj-del-btn" data-proj-id="${p.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${statusBadge(p.status)}
        ${p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
        ${p.kanban_col ? `<span class="badge badge-progress">${p.kanban_col}</span>` : ''}
        ${tagChips}
      </div>
      ${p.goal_title ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Goal: ${p.goal_title}</div>` : ''}
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${activeTasks ? `<div style="margin-top:8px">${activeTasks}</div>` : ''}
    </div>`;
  }

  function buildCardsView(list) {
    return list.map(buildProjectCard).join('') ||
      `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
    const rows = list.map(p => {
      const prog = p.progress || {};
      const pct = prog.pct || 0;
      return `<tr>
        <td><span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-proj-id="${p.id}">${p.title}</span></td>
        <td>${statusBadge(p.status)}</td>
        <td>${p.goal_title || '—'}</td>
        <td>${p.macro_area ? p.macro_area.split('(')[0].trim() : '—'}</td>
        <td>${pct}% (${prog.done||0}/${prog.total||0})</td>
        <td>${(p.tags||[]).map(t=>tagHtml(t)).join('')}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button>
          <button class="btn btn-sm btn-danger proj-del-btn" data-proj-id="${p.id}">Del</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Status</th><th>Goal</th><th>Area</th><th>Progress</th><th>Tags</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function buildProjectKanbanView(list) {
    const groupBy = projsKanbanGroupBy; // 'status' | 'macro_area' | 'kanban_col'
    const allVals = groupBy === 'status'
      ? PROJECT_STATUSES
      : groupBy === 'kanban_col'
        ? KANBAN_COLS
        : [...new Set(list.map(p => p.macro_area || 'none').filter(Boolean))].sort();
    const grouped = {};
    allVals.forEach(v => { grouped[v] = []; });
    list.forEach(p => {
      const raw = groupBy === 'status' ? p.status : groupBy === 'kanban_col' ? p.kanban_col : p.macro_area;
      const key = raw || allVals[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    const cols = allVals.filter(v => grouped[v]?.length > 0 || groupBy === 'status');
    const colsHtml = cols.map(colKey => {
      const items = grouped[colKey] || [];
      const cards = items.map(p => {
        const prog = p.progress || {};
        const pct = prog.pct || 0;
        return `<div class="kanban-card proj-kanban-card" data-proj-id="${p.id}" draggable="true"
            ondragstart="event.dataTransfer.setData('text/plain','${p.id}');event.currentTarget.classList.add('kanban-dragging')"
            ondragend="event.currentTarget.classList.remove('kanban-dragging')"
            style="cursor:pointer">
          <div class="kanban-card-title">${p.title}</div>
          ${p.goal_title ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${p.goal_title}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            ${groupBy !== 'status' ? statusBadge(p.status) : ''}
            ${groupBy !== 'macro_area' && p.macro_area ? `<span style="font-size:10px;color:var(--text-muted)">${p.macro_area.split('(')[0].trim()}</span>` : ''}
          </div>
          <div style="margin-top:8px">
            <div class="progress-track" style="height:4px"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${pct}% · ${prog.done||0}/${prog.total||0}</div>
          </div>
        </div>`;
      }).join('');
      const label = colKey.replace(/_/g,' ');
      return `<div class="kanban-col proj-kanban-col" data-col="${colKey}"
          ondragover="event.preventDefault();event.currentTarget.classList.add('kanban-drag-over')"
          ondragleave="event.currentTarget.classList.remove('kanban-drag-over')"
          ondrop="event.preventDefault();event.currentTarget.classList.remove('kanban-drag-over');window._projKanbanDrop(event,'${colKey}','${groupBy}')">
        <div class="kanban-col-header">
          <span>${label}</span>
          <span class="kanban-count">${items.length}</span>
        </div>
        <div class="kanban-col-body">${cards || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No projects</div>'}</div>
      </div>`;
    }).join('');
    const colWidth = 260;
    const boardStyle = `display:grid;grid-template-columns:repeat(${cols.length},minmax(${colWidth}px,1fr));gap:var(--space-4);align-items:start;padding-bottom:16px`;
    const gbBtnStyle = (v) => `padding:3px 8px;font-size:11px;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;background:${projsKanbanGroupBy===v?'var(--accent)':'var(--bg-surface)'};color:${projsKanbanGroupBy===v?'#fff':'var(--text-primary)'}`;
    const groupByBar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:11px;color:var(--text-muted)">
      <span>Group by:</span>
      <button id="proj-gb-status" style="${gbBtnStyle('status')}">Status</button>
      <button id="proj-gb-area" style="${gbBtnStyle('macro_area')}">Area</button>
      <button id="proj-gb-kanban" style="${gbBtnStyle('kanban_col')}">Kanban col</button>
    </div>`;
    return `${groupByBar}<div style="overflow-x:auto;width:100%"><div class="kanban-board" style="${boardStyle}">${colsHtml}</div></div>`;
  }

  window._projKanbanDrop = async (e, newColKey, groupBy) => {
    const projId = e.dataTransfer.getData('text/plain');
    if (!projId) return;
    const field = groupBy === 'macro_area' ? 'macro_area' : 'status';
    await api('PATCH', `/api/projects/${projId}`, { [field]: newColKey });
    const p = projects.find(x => String(x.id) === projId);
    if (p) p[field] = newColKey;
    render();
  };

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'},{key:'kanban',label:'Kanban'}],
    projectsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Projects</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-proj-btn">+ New Project</button>
      </div>
    </div>
    <div id="proj-list"></div>
  </div>`;

  const projFilterDefs = [
    { key: 'status', label: 'Status', multi: true, options: ['todo','in_progress','blocked','done'].map(s => ({ value: s, label: s.replace('_',' ') })) },
    { key: 'goal', label: 'Goal', multi: false, options: [{ value: '', label: 'All' }, ...goals.map(g => ({ value: String(g.id), label: g.title }))] },
  ];
  const projSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progress' },
  ];
  const viewEl = document.querySelector('#main-content .view');
  const headerEl = viewEl?.querySelector('.view-header');
  if (headerEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'proj-filter-bar-container';
    headerEl.after(barDiv);
    notionFilterBar('proj-filter-bar-container', projFilterDefs, projSortDefs, projFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(projects, projFilterState, {
      status: p => p.status,
      goal: p => String(p.goal_id || ''),
      title: p => p.title,
      progress: p => String((p.progress && p.progress.pct) || 0),
      _text: p => p.title + ' ' + (p.description || '') + ' ' + (p.goal_title || ''),
    });
  }

  function render() {
    const list = getFiltered();
    let html;
    if (projectsViewMode === 'table') html = buildTableView(list);
    else if (projectsViewMode === 'kanban') html = buildProjectKanbanView(list);
    else html = buildCardsView(list);
    document.getElementById('proj-list').innerHTML = html;
    bindProjEvents();
    injectListIcons('project', list.map(p => p.id));
    if (projectsViewMode === 'kanban') {
      document.getElementById('proj-gb-status')?.addEventListener('click', () => {
        projsKanbanGroupBy = 'status'; localStorage.setItem('projsKanbanGroupBy', 'status'); render();
      });
      document.getElementById('proj-gb-area')?.addEventListener('click', () => {
        projsKanbanGroupBy = 'macro_area'; localStorage.setItem('projsKanbanGroupBy', 'macro_area'); render();
      });
      document.getElementById('proj-gb-kanban')?.addEventListener('click', () => {
        projsKanbanGroupBy = 'kanban_col'; localStorage.setItem('projsKanbanGroupBy', 'kanban_col'); render();
      });
      document.querySelectorAll('.proj-kanban-card').forEach(card => {
        card.addEventListener('click', () => renderView('project-detail', card.dataset.projId));
      });
    }
  }

  document.getElementById('new-proj-btn').onclick = () => showProjectModal(null, goals);
  bindViewToggle([], null, (mode) => {
    projectsViewMode = mode;
    localStorage.setItem('projectsViewMode', mode);
    render();
  });
  render();

  function bindProjEvents() {
    document.querySelectorAll('.proj-slideover-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.proj-del-btn, .proj-export-btn')) return;
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        showProjectSlideover(p, goals, () => renderProjects());
      };
    });
    document.querySelectorAll('.task-title-link[data-proj-id]').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        showProjectSlideover(p, goals, () => renderProjects());
      };
    });
    document.querySelectorAll('.proj-export-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const data = await api('GET', `/api/export/project/${el.dataset.projId}`);
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        downloadJSON(data, `project-${p?.title||el.dataset.projId}.json`);
      };
    });
    document.querySelectorAll('.proj-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this project?')) return;
        await api('DELETE', `/api/projects/${el.dataset.projId}`);
        renderProjects();
      };
    });
  }
}

/* ─── Goals View ─────────────────────────────────────────────────────── */
async function renderGoals() {
  let goals = [];
  let apiError = null;
  try { goals = await api('GET', '/api/goals'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const goalFilterState = { filters: {}, sort: {}, searchText: '' };

  function buildGoalCard(g) {
    const prog = g.progress || {};
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    const tagChips = (g.tags || []).map(t => tagHtml(t)).join('');
    return `<div class="card goal-slideover-card" data-goal-id="${g.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title"><span class="list-icon-slot" data-icon-entity="goal" data-icon-id="${g.id}" data-icon-size="20" style="display:none;margin-right:6px;vertical-align:middle;font-size:20px"></span>${g.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button>
          <button class="btn btn-sm btn-danger goal-del-btn" data-goal-id="${g.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
        ${g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        ${statusBadge(g.status)}
        ${tagChips}
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0} tasks</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }

  function buildCardsView(list) {
    return list.map(buildGoalCard).join('') ||
      `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
    const rows = list.map(g => {
      const prog = g.progress || {};
      const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
      return `<tr>
        <td><span style="cursor:pointer;color:var(--accent)" class="goal-nav-link" data-goal-id="${g.id}">${g.title}</span></td>
        <td>${statusBadge(g.status)}</td>
        <td>${g.type || '—'}</td>
        <td>${g.year || '—'}</td>
        <td>${pct}%</td>
        <td>${(g.tags||[]).map(t=>tagHtml(t)).join('')}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button>
          <button class="btn btn-sm btn-danger goal-del-btn" data-goal-id="${g.id}">Del</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Status</th><th>Type</th><th>Year</th><th>Progress</th><th>Tags</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function buildGoalKanbanView(list) {
    const groupBy = goalsKanbanGroupBy; // 'status' | 'type' | 'year'
    const allVals = groupBy === 'status'
      ? GOAL_STATUSES
      : groupBy === 'type'
        ? GOAL_TYPES
        : GOAL_YEARS;
    const grouped = {};
    allVals.forEach(v => { grouped[v] = []; });
    list.forEach(g => {
      const raw = groupBy === 'status' ? g.status : groupBy === 'type' ? g.type : g.year;
      const key = raw || allVals[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(g);
    });
    const cols = allVals.filter(v => grouped[v]?.length > 0 || groupBy === 'status');
    const colsHtml = cols.map(colKey => {
      const items = grouped[colKey] || [];
      const cards = items.map(g => {
        const prog = g.progress || {};
        const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
        return `<div class="kanban-card goal-kanban-card" data-goal-id="${g.id}" draggable="true"
            ondragstart="event.dataTransfer.setData('text/plain','${g.id}');event.currentTarget.classList.add('kanban-dragging')"
            ondragend="event.currentTarget.classList.remove('kanban-dragging')"
            style="cursor:pointer">
          <div class="kanban-card-title">${g.title}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
            ${groupBy !== 'status' ? statusBadge(g.status) : ''}
            ${groupBy !== 'type' && g.type ? `<span>${g.type}</span>` : ''}
            ${groupBy !== 'year' && g.year ? `<span>${g.year}</span>` : ''}
          </div>
          <div style="margin-top:8px">
            <div class="progress-track" style="height:4px"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${pct}% · ${prog.done||0}/${prog.total||0}</div>
          </div>
        </div>`;
      }).join('');
      const label = colKey.replace(/_/g,' ');
      return `<div class="kanban-col goal-kanban-col" data-col="${colKey}"
          ondragover="event.preventDefault();event.currentTarget.classList.add('kanban-drag-over')"
          ondragleave="event.currentTarget.classList.remove('kanban-drag-over')"
          ondrop="event.preventDefault();event.currentTarget.classList.remove('kanban-drag-over');window._goalKanbanDrop(event,'${colKey}','${groupBy}')">
        <div class="kanban-col-header">
          <span>${label}</span>
          <span class="kanban-count">${items.length}</span>
        </div>
        <div class="kanban-col-body">${cards || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No goals</div>'}</div>
      </div>`;
    }).join('');
    const colWidth = 260;
    const boardStyle = `display:grid;grid-template-columns:repeat(${cols.length},minmax(${colWidth}px,1fr));gap:var(--space-4);align-items:start;padding-bottom:16px`;
    const gbBtnStyle = (v) => `padding:3px 8px;font-size:11px;border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;background:${goalsKanbanGroupBy===v?'var(--accent)':'var(--bg-surface)'};color:${goalsKanbanGroupBy===v?'#fff':'var(--text-primary)'}`;
    const groupByBar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:11px;color:var(--text-muted)">
      <span>Group by:</span>
      <button id="goal-gb-status" style="${gbBtnStyle('status')}">Status</button>
      <button id="goal-gb-type" style="${gbBtnStyle('type')}">Type</button>
      <button id="goal-gb-year" style="${gbBtnStyle('year')}">Year</button>
    </div>`;
    return `${groupByBar}<div style="overflow-x:auto;width:100%"><div class="kanban-board" style="${boardStyle}">${colsHtml}</div></div>`;
  }

  window._goalKanbanDrop = async (e, newColKey, groupBy) => {
    const goalId = e.dataTransfer.getData('text/plain');
    if (!goalId) return;
    const field = groupBy === 'type' ? 'type' : 'status';
    await api('PATCH', `/api/goals/${goalId}`, { [field]: newColKey });
    const g = goals.find(x => String(x.id) === goalId);
    if (g) g[field] = newColKey;
    render();
  };

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'},{key:'kanban',label:'Kanban'}],
    goalsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Goals</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-goal-btn">+ New Goal</button>
      </div>
    </div>
    <div id="goal-list"></div>
  </div>`;

  const goalFilterDefs = [
    { key: 'status', label: 'Status', multi: true, options: ['todo','in_progress','blocked','done'].map(s => ({ value: s, label: s.replace('_',' ') })) },
    { key: 'type', label: 'Type', multi: true, options: GOAL_TYPES.map(t => ({ value: t, label: t })) },
    { key: 'year', label: 'Year', multi: true, options: GOAL_YEARS.map(y => ({ value: y, label: y })) },
  ];
  const goalSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'type', label: 'Type' },
    { key: 'year', label: 'Year' },
  ];
  const goalViewEl = document.querySelector('#main-content .view');
  const goalHeaderEl = goalViewEl?.querySelector('.view-header');
  if (goalHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'goal-filter-bar-container';
    goalHeaderEl.after(barDiv);
    notionFilterBar('goal-filter-bar-container', goalFilterDefs, goalSortDefs, goalFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(goals, goalFilterState, {
      status: g => g.status,
      type: g => g.type || '',
      year: g => g.year || '',
      title: g => g.title,
      _text: g => g.title + ' ' + (g.description || ''),
    });
  }

  function render() {
    const list = getFiltered();
    let html;
    if (goalsViewMode === 'table') html = buildTableView(list);
    else if (goalsViewMode === 'kanban') html = buildGoalKanbanView(list);
    else html = buildCardsView(list);
    document.getElementById('goal-list').innerHTML = html;
    bindGoalEvents();
    injectListIcons('goal', list.map(g => g.id));
    if (goalsViewMode === 'kanban') {
      document.getElementById('goal-gb-status')?.addEventListener('click', () => {
        goalsKanbanGroupBy = 'status'; localStorage.setItem('goalsKanbanGroupBy', 'status'); render();
      });
      document.getElementById('goal-gb-type')?.addEventListener('click', () => {
        goalsKanbanGroupBy = 'type'; localStorage.setItem('goalsKanbanGroupBy', 'type'); render();
      });
      document.getElementById('goal-gb-year')?.addEventListener('click', () => {
        goalsKanbanGroupBy = 'year'; localStorage.setItem('goalsKanbanGroupBy', 'year'); render();
      });
      document.querySelectorAll('.goal-kanban-card').forEach(card => {
        card.addEventListener('click', () => renderView('goal-detail', card.dataset.goalId));
      });
    }
  }

  document.getElementById('new-goal-btn').onclick = () => showGoalModal(null);
  bindViewToggle([], null, (mode) => {
    goalsViewMode = mode;
    localStorage.setItem('goalsViewMode', mode);
    render();
  });
  render();

  function bindGoalEvents() {
    document.querySelectorAll('.goal-slideover-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.goal-del-btn, .goal-export-btn')) return;
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        showGoalSlideover(g, () => renderGoals());
      };
    });
    document.querySelectorAll('.goal-nav-link').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        showGoalSlideover(g, () => renderGoals());
      };
    });
    document.querySelectorAll('.goal-export-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const data = await api('GET', `/api/export/goal/${el.dataset.goalId}`);
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        downloadJSON(data, `goal-${g?.title||el.dataset.goalId}.json`);
      };
    });
    document.querySelectorAll('.goal-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this goal?')) return;
        await api('DELETE', `/api/goals/${el.dataset.goalId}`);
        renderGoals();
      };
    });
  }
}

/* ─── Notes View ─────────────────────────────────────────────────────── */
async function renderNotes() {
  let notes = [];
  let apiError = null;
  try { notes = await api('GET', '/api/notes'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const noteFilterState = { filters: {}, sort: {}, searchText: '' };

  function buildNoteCard(n) {
    const tagChips = (n.tags || []).map(t => tagHtml(t)).join('');
    return `<div class="note-card" data-note-id="${n.id}">
      <div class="flex-between gap-8">
        <div class="note-title"><span class="list-icon-slot" data-icon-entity="note" data-icon-id="${n.id}" data-icon-size="18" style="display:none;margin-right:5px;vertical-align:middle;font-size:18px"></span>${n.title || 'Untitled'}</div>
        <div onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-danger note-del-btn" data-note-id="${n.id}">Delete</button>
        </div>
      </div>
      <div class="note-body-preview">${n.body || ''}</div>
      <div class="note-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
        ${fmtDate(n.note_date) ? `<span>${fmtDate(n.note_date)}</span>` : ''}
        ${n.category_name ? `<span>· ${n.category_name}</span>` : ''}
        ${tagChips}
      </div>
    </div>`;
  }

  function buildNoteTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    const rows = list.map(n => `<tr class="note-card" data-note-id="${n.id}" style="cursor:pointer">
      <td><span class="list-icon-slot" data-icon-entity="note" data-icon-id="${n.id}" data-icon-size="16" style="display:none;margin-right:5px;vertical-align:middle;font-size:16px"></span>${n.title || 'Untitled'}</td>
      <td>${fmtDate(n.note_date) || '—'}</td>
      <td>${n.category_name || '—'}</td>
      <td>${(n.tags||[]).map(t=>tagHtml(t)).join('')}</td>
      <td onclick="event.stopPropagation()"><button class="btn btn-sm btn-danger note-del-btn" data-note-id="${n.id}">Del</button></td>
    </tr>`).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Date</th><th>Category</th><th>Tags</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'}],
    notesViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Notes</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-note-btn">+ New Note</button>
      </div>
    </div>
    <div id="notes-list"></div>
  </div>`;

  const noteFilterDefs = [
    { key: 'category', label: 'Category', multi: false, options: [{ value: '', label: 'All' }, ...allCategories.map(c => ({ value: String(c.id), label: c.name }))] },
  ];
  const noteSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'note_date', label: 'Date' },
    { key: 'category_name', label: 'Category' },
  ];
  const noteViewEl = document.querySelector('#main-content .view');
  const noteHeaderEl = noteViewEl?.querySelector('.view-header');
  if (noteHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'note-filter-bar-container';
    noteHeaderEl.after(barDiv);
    notionFilterBar('note-filter-bar-container', noteFilterDefs, noteSortDefs, noteFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(notes, noteFilterState, {
      category: n => String(n.category_id || ''),
      title: n => n.title || '',
      note_date: n => n.note_date || '',
      category_name: n => n.category_name || '',
      _text: n => (n.title || '') + ' ' + (n.body || ''),
    });
  }

  function render() {
    const list = getFiltered();
    if (!list.length) {
      document.getElementById('notes-list').innerHTML =
        `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    } else {
      document.getElementById('notes-list').innerHTML =
        notesViewMode === 'table' ? buildNoteTable(list) :
        `<div style="display:grid;gap:12px">${list.map(buildNoteCard).join('')}</div>`;
    }
    bindNoteEvents();
    injectListIcons('note', list.map(n => n.id));
  }

  document.getElementById('new-note-btn').onclick = () => showNoteModal(null, () => renderNotes());
  bindViewToggle([], null, (mode) => {
    notesViewMode = mode;
    localStorage.setItem('notesViewMode', mode);
    render();
  });
  render();

  function bindNoteEvents() {
    document.querySelectorAll('.note-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.classList.contains('note-del-btn')) return;
        const n = notes.find(x => String(x.id) === el.dataset.noteId);
        if (n) showNoteModal(n, () => renderNotes());
      };
    });
    document.querySelectorAll('.note-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this note?')) return;
        await api('DELETE', `/api/notes/${el.dataset.noteId}`);
        renderNotes();
      };
    });
  }
}

/* ─── Sprints View ───────────────────────────────────────────────────── */
async function renderSprints() {
  let sprints = [], projects = [];
  try { [sprints, projects] = await Promise.all([api('GET', '/api/sprints'), api('GET', '/api/projects')]); } catch(e) {}

  function buildSprintCard(s) {
    const prog = s.progress || {};
    const pct = prog.pct || 0;
    const nextStatus = s.status === 'planned' ? 'active' : s.status === 'active' ? 'completed' : null;
    const nextLabel = s.status === 'planned' ? 'Start' : s.status === 'active' ? 'Complete' : null;
    const prevStatus = s.status === 'active' ? 'planned' : s.status === 'completed' ? 'active' : null;
    const prevLabel = s.status === 'active' ? '↩ Planned' : s.status === 'completed' ? '↩ Active' : null;
    return `<div class="card" data-sprint-id="${s.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title sprint-detail-link" data-sprint-id="${s.id}" style="cursor:pointer;color:var(--accent)"><span class="list-icon-slot" data-icon-entity="sprint" data-icon-id="${s.id}" data-icon-size="20" style="display:none;margin-right:6px;vertical-align:middle;font-size:20px"></span>${s.title}</span>
        <div class="flex gap-8">
          ${prevStatus ? `<button class="btn btn-sm btn-ghost sprint-prev-status-btn" data-sprint-id="${s.id}" data-prev="${prevStatus}">${prevLabel}</button>` : ''}
          ${nextStatus ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="${nextStatus}">${nextLabel}</button>` : ''}
          <button class="btn btn-sm btn-ghost sprint-edit-btn" data-sprint-id="${s.id}">Edit</button>
          <button class="btn btn-sm btn-danger sprint-del-btn" data-sprint-id="${s.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${statusBadge(s.status)}
        ${s.project_title ? `<span class="badge badge-todo">${s.project_title}</span>` : ''}
      </div>
      <div class="card-meta">${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${s.story_points ? (() => {
        const cap = s.story_points;
        const used = (prog.story_points || 0);
        const ratio = used / cap;
        const color = ratio <= 0 ? 'var(--text-muted)' : ratio <= 1.0 ? `hsl(${Math.round(ratio*120)},55%,38%)` : ratio <= 1.2 ? `hsl(${Math.round(120-(ratio-1)/0.2*60)},70%,42%)` : 'hsl(0,75%,42%)';
        const pctSP = Math.min(100, Math.round(ratio * 100));
        return `<div style="margin-top:6px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px"><span>Story Pts</span><span style="color:${color}">${used}/${cap}</span></div>
          <div class="progress-track" style="height:4px"><div class="progress-fill" style="width:${pctSP}%;background:${color}"></div></div>
        </div>`;
      })() : ''}
    </div>`;
  }

  function buildSprintTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`;
    const rows = list.map(s => {
      const prog = s.progress || {};
      const pct = prog.pct || 0;
      return `<tr class="sprint-row" data-sprint-id="${s.id}" style="cursor:pointer">
        <td><span class="sprint-detail-link" data-sprint-id="${s.id}" style="color:var(--accent);cursor:pointer">${s.title}</span></td>
        <td>${statusBadge(s.status)}</td>
        <td>${s.project_title || '—'}</td>
        <td>${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</td>
        <td>${pct}%</td>
        <td>
          ${s.status === 'active' ? `<button class="btn btn-sm btn-ghost sprint-prev-status-btn" data-sprint-id="${s.id}" data-prev="planned">↩ Planned</button>` : ''}
          ${s.status === 'completed' ? `<button class="btn btn-sm btn-ghost sprint-prev-status-btn" data-sprint-id="${s.id}" data-prev="active">↩ Active</button>` : ''}
          ${s.status === 'planned' ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="active">Start</button>` : ''}
          ${s.status === 'active' ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="completed">Complete</button>` : ''}
          <button class="btn btn-sm btn-ghost sprint-edit-btn" data-sprint-id="${s.id}">Edit</button>
          <button class="btn btn-sm btn-danger sprint-del-btn" data-sprint-id="${s.id}">Del</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Status</th><th>Project</th><th>Dates</th><th>Progress</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const toggle = viewToggleHtml(
    [{key:'cards',label:'Cards'},{key:'table',label:'Table'}],
    sprintsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Sprints</h1>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-sprint-btn">+ New Sprint</button>
      </div>
    </div>
    <div id="sprints-list"></div>
  </div>`;

  const sprintFilterState = { filters: {}, sort: {}, searchText: '' };
  const sprintFilterDefs = [
    { key: 'status', label: 'Status', multi: true, options: ['planned','active','completed'].map(s => ({ value: s, label: s })) },
    { key: 'project', label: 'Project', multi: false, options: [{ value: '', label: 'All' }, ...projects.map(p => ({ value: String(p.id), label: p.title }))] },
  ];
  const sprintSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'status', label: 'Status' },
  ];
  const sprintViewEl = document.querySelector('#main-content .view');
  const sprintHeaderEl = sprintViewEl?.querySelector('.view-header');
  if (sprintHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'sprint-filter-bar-container';
    sprintHeaderEl.after(barDiv);
    notionFilterBar('sprint-filter-bar-container', sprintFilterDefs, sprintSortDefs, sprintFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(sprints, sprintFilterState, {
      status: s => s.status,
      project: s => String(s.project_id || ''),
      title: s => s.title,
      start_date: s => s.start_date || '',
      _text: s => s.title + ' ' + (s.project_title || ''),
    });
  }

  function render() {
    const list = getFiltered();
    document.getElementById('sprints-list').innerHTML =
      sprintsViewMode === 'table' ? buildSprintTable(list) :
      (list.map(buildSprintCard).join('') || `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`);
    bindSprintEvents();
    injectListIcons('sprint', list.map(s => s.id));
  }

  document.getElementById('new-sprint-btn').onclick = () => showSprintModal(projects);
  bindViewToggle([], null, (mode) => {
    sprintsViewMode = mode;
    localStorage.setItem('sprintsViewMode', mode);
    render();
  });
  render();

  function bindSprintEvents() {
    document.querySelectorAll('.sprint-detail-link').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); renderView('sprint-detail', el.dataset.sprintId); };
    });
    // Whole card click → sprint detail (ignore clicks on buttons)
    document.querySelectorAll('.card[data-sprint-id]').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('button')) return;
        renderView('sprint-detail', card.dataset.sprintId);
      };
    });
    // Table row click → sprint detail (ignore clicks on buttons)
    document.querySelectorAll('tr.sprint-row[data-sprint-id]').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('button')) return;
        renderView('sprint-detail', row.dataset.sprintId);
      };
    });
    document.querySelectorAll('.sprint-status-btn').forEach(el => {
      el.onclick = async () => {
        const nextStatus = el.dataset.next;
        await api('PATCH', `/api/sprints/${el.dataset.sprintId}`, { status: nextStatus });
        // When activating a sprint, go to dashboard to show it in command center
        if (nextStatus === 'active') renderView('dashboard');
        else renderSprints();
      };
    });
    document.querySelectorAll('.sprint-prev-status-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        const prevStatus = el.dataset.prev;
        if (!confirm(`Revert sprint to "${prevStatus}"?`)) return;
        await api('PATCH', `/api/sprints/${el.dataset.sprintId}`, { status: prevStatus });
        renderSprints();
      };
    });
    document.querySelectorAll('.sprint-del-btn').forEach(el => {
      el.onclick = async () => {
        if (!confirm('Delete this sprint?')) return;
        await api('DELETE', `/api/sprints/${el.dataset.sprintId}`);
        renderSprints();
      };
    });
    document.querySelectorAll('.sprint-edit-btn').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const s = sprints.find(x => String(x.id) === el.dataset.sprintId);
        if (s) showSprintModal(projects, s);
      };
    });
  }
}


/* ─── Sprint Detail View ─────────────────────────────────────────────── */
async function renderSprintDetail(sprintId) {
  let sprint;
  try { sprint = await api('GET', `/api/sprints/${sprintId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Sprint not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('sprint-detail', sprintId, sprint.title);

  const tasks = sprint.tasks || [];
  const prog = sprint.progress || {};
  const pct = prog.pct || 0;

  // Compute sub_task_count for each task from the tasks array
  tasks.forEach(t => {
    t.sub_task_count = tasks.filter(s => s.parent_task_id === t.id).length;
  });

  // Merge tasks into cache for subtask lookups
  tasks.forEach(t => { if (!allTasksCache.find(x => x.id === t.id)) allTasksCache.push(t); });

  function buildSprintTaskTree(taskList, allTasks, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, true, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildSprintTaskTree(children, allTasks, depth + 1);
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  const taskIds = new Set(tasks.map(t => t.id));
  const topLevel = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
  const taskListHtml = tasks.length
    ? `<ul class="task-list">${buildSprintTaskTree(topLevel, tasks, 0)}</ul>`
    : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks in this sprint yet</div></div>`;

  // Fetch all tasks for the assign/unassign panels
  let allTasks = [];
  try { allTasks = await api('GET', '/api/tasks?all=1'); allTasksCache = allTasks; allTasksFull = allTasks; } catch(e) {}
  const unassigned = allTasks.filter(t => !t.sprint_id && !t.parent_task_id); // top-level unassigned tasks only

  const nextStatus = sprint.status === 'planned' ? 'active' : sprint.status === 'active' ? 'completed' : null;
  const nextLabel = sprint.status === 'planned' ? 'Start Sprint' : sprint.status === 'active' ? 'Complete Sprint' : null;
  const prevStatus = sprint.status === 'active' ? 'planned' : sprint.status === 'completed' ? 'active' : null;
  const prevLabel = sprint.status === 'active' ? '↩ Revert to Planned' : sprint.status === 'completed' ? '↩ Revert to Active' : null;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        ${sprint.project_title ? `<div class="breadcrumb" style="margin-bottom:6px"><span class="bc-crumb bc-proj" style="cursor:pointer" data-proj-id="${sprint.project_id}">◆ ${sprint.project_title}</span></div>` : ''}
        <h1 class="view-title">⚡ ${sprint.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(sprint.status)}
          ${sprint.start_date ? `<span class="badge badge-todo">${fmtDate(sprint.start_date)} → ${fmtDate(sprint.end_date)}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="sd-back-btn">← Back</button>
        ${prevStatus ? `<button class="btn btn-ghost" id="sd-prev-status-btn" data-prev="${prevStatus}">${prevLabel}</button>` : ''}
        ${nextStatus ? `<button class="btn btn-ghost" id="sd-status-btn" data-next="${nextStatus}">${nextLabel}</button>` : ''}
        <button class="btn btn-primary" id="sd-add-task-btn">+ Task</button>
      </div>
    </div>
    <div class="widget" style="margin-bottom:16px">
      <div class="progress-wrap">
        <div class="progress-label"><span>${pct}% complete</span><span>${prog.done || 0}/${prog.total || 0} tasks</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div id="sd-sp-widget" style="margin-top:12px"></div>
    </div>
    <div class="widget">
      <div class="widget-header"><span class="widget-title">Tasks (${tasks.length})</span></div>
      <div id="sd-task-list">${taskListHtml}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
      <div class="widget">
        <div class="widget-header" style="display:flex;align-items:center;justify-content:space-between">
          <span class="widget-title">Unassigned Tasks</span>
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted)">
            <span>SP color:</span>
            <button id="sd-sp-color-badge" class="btn btn-sm btn-ghost" style="font-size:10px;padding:2px 6px">Badge</button>
            <button id="sd-sp-color-default" class="btn btn-sm btn-ghost" style="font-size:10px;padding:2px 6px">Default</button>
            <button id="sd-sp-color-row" class="btn btn-sm btn-ghost" style="font-size:10px;padding:2px 6px">Row</button>
          </div>
        </div>
        <input type="text" id="sd-unassigned-search" placeholder="Search…" style="width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);font-size:12px;margin-bottom:8px">
        <div id="sd-unassigned-list" style="max-height:320px;overflow-y:auto"></div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Assigned to Sprint</span></div>
        <div id="sd-assigned-list" style="max-height:320px;overflow-y:auto"></div>
      </div>
    </div>
  </div>`;

  document.getElementById('sd-back-btn').onclick = () => renderView('sprints');
  document.getElementById('sd-add-task-btn').onclick = () =>
    showNewTaskModal({ sprint_id: parseInt(sprintId) }, () => renderSprintDetail(sprintId));
  document.getElementById('sd-prev-status-btn')?.addEventListener('click', async (e) => {
    const prev = e.currentTarget.dataset.prev;
    if (!confirm(`Revert sprint to "${prev}"?`)) return;
    await api('PATCH', `/api/sprints/${sprintId}`, { status: prev });
    renderSprintDetail(sprintId);
  });
  document.getElementById('sd-status-btn')?.addEventListener('click', async (e) => {
    const next = e.currentTarget.dataset.next;
    await api('PATCH', `/api/sprints/${sprintId}`, { status: next });
    if (next === 'active') renderView('dashboard');
    else renderSprintDetail(sprintId);
  });
  if (sprint.project_id) {
    document.querySelectorAll('.bc-proj').forEach(el => {
      el.onclick = () => renderView('project-detail', el.dataset.projId);
    });
  }

  // ── Story Points capacity widget ─────────────────────────────────────
  const spWidget = document.getElementById('sd-sp-widget');
  const spCapacity = sprint.story_points || 0;

  function updateSpWidget(assignedPts) {
    if (!spWidget) return;
    const color = spGradientColor(assignedPts, spCapacity);
    const pctBar = spCapacity > 0 ? Math.min(100, Math.round((assignedPts / spCapacity) * 100)) : 0;
    spWidget.innerHTML = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
          <span>Story Points</span>
          <span style="font-weight:600;color:${color}">${assignedPts}${spCapacity ? ' / ' + spCapacity : ''}</span>
        </div>
        ${spCapacity ? `<div class="progress-track" style="height:6px">
          <div class="progress-fill" style="width:${pctBar}%;background:${color};transition:width 0.3s,background 0.3s"></div>
        </div>` : '<span style="font-size:11px;color:var(--text-muted)">No capacity set</span>'}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span style="font-size:11px;color:var(--text-muted)">Capacity:</span>
        <input id="sd-sp-capacity" type="number" min="0" value="${spCapacity || ''}" placeholder="—"
          style="width:60px;font-size:12px;padding:3px 6px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface);color:var(--text-primary);text-align:center" />
        <button class="btn btn-sm btn-ghost" id="sd-sp-save" style="font-size:11px">Set</button>
      </div>
    </div>`;
    document.getElementById('sd-sp-save').onclick = async () => {
      const val = document.getElementById('sd-sp-capacity').value.trim();
      const pts = val === '' ? null : parseInt(val, 10);
      await api('PATCH', `/api/sprints/${sprintId}`, { story_points: pts });
      renderSprintDetail(sprintId);
    };
    document.getElementById('sd-sp-capacity').onkeydown = (e) => {
      if (e.key === 'Enter') document.getElementById('sd-sp-save').click();
    };
  }
  updateSpWidget(prog.story_points || 0);

  // ── Assign / Unassign task panels ─────────────────────────────────────
  let sdSearchText = '';
  let sdSpColorMode = 'badge'; // 'badge' | 'default' | 'row'

  function spColor(pts) {
    if (!pts || pts <= 0) return null;
    // absolute scale: 1sp=light green, 5sp=yellow, 8sp=orange, 13sp+=red
    const ratio = Math.min(1, pts / 13);
    const h = Math.round(120 - ratio * 120);
    const s = Math.round(55 + ratio * 30);
    const l = Math.round(50 - ratio * 12);
    return `hsl(${h},${s}%,${l}%)`;
  }

  function renderAssignPanels(allTasks) {
    const sid = parseInt(sprintId);
    const assignedTasks = allTasks.filter(t => t.sprint_id && String(t.sprint_id) === String(sprintId));
    const unassignedTasks = allTasks.filter(t => !t.sprint_id && !t.parent_task_id);
    const filtered = sdSearchText
      ? unassignedTasks.filter(t => (t.title||'').toLowerCase().includes(sdSearchText))
      : unassignedTasks;

    function taskRow(t, isAssigned) {
      const hasStoryPoints = t.story_points && t.story_points > 0;
      const assignBtn = isAssigned
        ? `<button class="btn btn-sm btn-ghost sd-unassign-btn" data-task-id="${t.id}" style="font-size:11px;flex-shrink:0">Remove</button>`
        : hasStoryPoints
          ? `<button class="btn btn-sm btn-ghost sd-assign-btn" data-task-id="${t.id}" style="font-size:11px;flex-shrink:0">+ Assign</button>`
          : `<button class="btn btn-sm btn-ghost sd-assign-disabled" data-task-id="${t.id}" title="Add story points to this task first" style="font-size:11px;flex-shrink:0;opacity:0.4;cursor:not-allowed" disabled>No SP</button>`;

      const color = t.story_points ? spColor(t.story_points) : null;
      let spBadge = '';
      let rowStyle = '';
      if (color) {
        if (sdSpColorMode === 'row') {
          // Full saturated background covers entire row
          rowStyle = `background:${color};`;
          spBadge = `<span style="font-size:10px;font-weight:600;color:#fff;margin-right:4px;flex-shrink:0;text-shadow:0 1px 2px rgba(0,0,0,.3)">${t.story_points}sp</span>`;
        } else if (sdSpColorMode === 'default') {
          // Light tint background
          rowStyle = `background:${color}28;`;
          spBadge = `<span style="font-size:10px;font-weight:600;color:${color};margin-right:4px;flex-shrink:0">${t.story_points}sp</span>`;
        } else {
          // Badge only
          spBadge = `<span style="font-size:10px;font-weight:600;background:${color};color:#fff;padding:1px 5px;border-radius:3px;margin-right:4px;flex-shrink:0;text-shadow:0 1px 2px rgba(0,0,0,.25)">${t.story_points}sp</span>`;
        }
      } else if (t.story_points) {
        spBadge = `<span style="font-size:10px;color:var(--text-muted);margin-right:4px;flex-shrink:0">${t.story_points}sp</span>`;
      }

      const textColor = sdSpColorMode === 'row' && color ? 'color:#fff;' : '';
      return `<div style="display:flex;align-items:center;gap:6px;padding:5px 4px;border-bottom:1px solid var(--border);${rowStyle}${textColor}">
        ${statusBadge(t.status)}
        <span class="sd-task-open-link" data-task-id="${t.id}" style="flex:1;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;${sdSpColorMode==='row'&&color?'color:#fff;':'color:var(--accent);'}" title="${t.title}">${t.title}</span>
        ${spBadge}${assignBtn}
      </div>`;
    }

    const unassignedEl = document.getElementById('sd-unassigned-list');
    const assignedEl = document.getElementById('sd-assigned-list');
    if (unassignedEl) {
      unassignedEl.innerHTML = filtered.length
        ? filtered.map(t => taskRow(t, false)).join('')
        : `<div style="color:var(--text-muted);font-size:12px;padding:8px 0">${sdSearchText ? 'No matching tasks' : 'All tasks assigned'}</div>`;
    }
    if (assignedEl) {
      assignedEl.innerHTML = assignedTasks.length
        ? assignedTasks.map(t => taskRow(t, true)).join('')
        : `<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No tasks assigned to this sprint</div>`;
    }

    // Update SP widget to reflect current assigned total
    const assignedSp = assignedTasks.reduce((s, t) => s + (t.story_points || 0), 0);
    updateSpWidget(assignedSp);

    // Task title click → open slideover
    document.querySelectorAll('.sd-task-open-link[data-task-id]').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); showTaskSlideover(parseInt(el.dataset.taskId)); };
    });

    document.querySelectorAll('.sd-assign-btn').forEach(btn => {
      btn.onclick = async () => {
        const taskId = parseInt(btn.dataset.taskId);
        btn.disabled = true; btn.textContent = '…';
        await api('PATCH', `/api/tasks/${taskId}`, { sprint_id: parseInt(sprintId) });
        renderSprintDetail(sprintId);
      };
    });
    document.querySelectorAll('.sd-unassign-btn').forEach(btn => {
      btn.onclick = async () => {
        const taskId = parseInt(btn.dataset.taskId);
        btn.disabled = true; btn.textContent = '…';
        await api('PATCH', `/api/tasks/${taskId}`, { sprint_id: null });
        renderSprintDetail(sprintId);
      };
    });
  }

  renderAssignPanels(allTasks);
  document.getElementById('sd-unassigned-search').oninput = (e) => {
    sdSearchText = e.target.value.toLowerCase();
    renderAssignPanels(allTasks);
  };
  function updateSpColorBtns() {
    document.getElementById('sd-sp-color-badge')?.classList.toggle('btn-primary', sdSpColorMode === 'badge');
    document.getElementById('sd-sp-color-badge')?.classList.toggle('btn-ghost', sdSpColorMode !== 'badge');
    document.getElementById('sd-sp-color-default')?.classList.toggle('btn-primary', sdSpColorMode === 'default');
    document.getElementById('sd-sp-color-default')?.classList.toggle('btn-ghost', sdSpColorMode !== 'default');
    document.getElementById('sd-sp-color-row')?.classList.toggle('btn-primary', sdSpColorMode === 'row');
    document.getElementById('sd-sp-color-row')?.classList.toggle('btn-ghost', sdSpColorMode !== 'row');
  }
  updateSpColorBtns();
  document.getElementById('sd-sp-color-badge')?.addEventListener('click', () => {
    sdSpColorMode = 'badge'; updateSpColorBtns(); renderAssignPanels(allTasks);
  });
  document.getElementById('sd-sp-color-default')?.addEventListener('click', () => {
    sdSpColorMode = 'default'; updateSpColorBtns(); renderAssignPanels(allTasks);
  });
  document.getElementById('sd-sp-color-row')?.addEventListener('click', () => {
    sdSpColorMode = 'row'; updateSpColorBtns(); renderAssignPanels(allTasks);
  });

  bindDetailTaskEvents(() => renderSprintDetail(sprintId));
}

/* ─── Habits View ─────────────────────────────────────────────────────── */
async function renderHabits() {
  let habits = [];
  let apiError = null;
  try { habits = await api('GET', '/api/habits'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const habitFilterState = { filters: {}, sort: {}, searchText: '' };

  // ── Helpers ──────────────────────────────────────────────────────────
  const HABIT_TYPE_COLORS = {
    learning:    { bg: 'var(--tag-blue-bg)',   text: 'var(--tag-blue-text)'   },
    fitness:     { bg: 'var(--tag-green-bg)',  text: 'var(--tag-green-text)'  },
    meditation:  { bg: 'var(--tag-purple-bg)', text: 'var(--tag-purple-text)' },
    general:     { bg: 'var(--tag-gray-bg)',   text: 'var(--color-text-secondary)' },
  };

  function habitTypeBadge(type) {
    const t = (type || 'general').toLowerCase();
    const c = HABIT_TYPE_COLORS[t] || HABIT_TYPE_COLORS.general;
    return `<span class="badge" style="background:${c.bg};color:${c.text}">${t}</span>`;
  }

  function refLink(h) {
    if (!h.reference_id) return '—';
    return `<span style="font-size:11px;color:var(--accent);font-family:var(--font-mono)">${h.reference_id}</span>`;
  }

  // ── Table view ───────────────────────────────────────────────────────
  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">○</div><div class="empty-state-text">No habits yet — add one to get started</div></div>`;
    const rows = list.map(h => `<tr>
      <td style="font-weight:500">${h.title}</td>
      <td>${habitTypeBadge(h.type)}</td>
      <td>${refLink(h)}</td>
      <td style="font-size:11px;color:var(--text-muted)">${fmtDate(h.created_at) || '—'}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        <button class="btn btn-sm btn-ghost habit-edit-btn" data-habit-id="${h.id}">Edit</button>
        <button class="btn btn-sm btn-danger habit-del-btn" data-habit-id="${h.id}">Del</button>
      </td>
    </tr>`).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Type</th><th>Reference</th><th>Created</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  // ── Cards view ───────────────────────────────────────────────────────
  function buildCardsView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">○</div><div class="empty-state-text">No habits yet — add one to get started</div></div>`;
    return list.map(h => `<div class="card" style="cursor:default">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title">${h.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost habit-edit-btn" data-habit-id="${h.id}">Edit</button>
          <button class="btn btn-sm btn-danger habit-del-btn" data-habit-id="${h.id}">Delete</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:6px">
        ${habitTypeBadge(h.type)}
        ${h.reference_id ? `<span class="badge" style="background:var(--tag-cyan-bg,#e0f7fa);color:var(--tag-cyan-text,#00838f);font-family:var(--font-mono)">ref: ${h.reference_id}</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--text-muted)">Added ${fmtDate(h.created_at) || '—'}</div>
    </div>`).join('');
  }

  // ── Calendar view ────────────────────────────────────────────────────
  // Shows one month grid; marks the habit's creation week and today so
  // the user can see "active since" at a glance. Each habit gets a
  // colour-coded bar spanning from its created_at date to today.
  function buildCalendarView(list) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth(); // 0-based

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun

    const monthName = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });
    const todayStr  = now.toISOString().slice(0, 10);

    // Assign a colour to each habit
    const HABIT_PALETTE = ['#378ADD','#6dcc8a','#a78bfa','#fb923c','#f472b6','#22d3ee','#d4a84b','#e07070'];
    const habitColors = {};
    list.forEach((h, i) => { habitColors[h.id] = HABIT_PALETTE[i % HABIT_PALETTE.length]; });

    // Build 7-column week grid
    const totalCells = startOffset + lastDay.getDate();
    const rows = Math.ceil(totalCells / 7);

    let calRows = '';
    for (let row = 0; row < rows; row++) {
      let cells = '';
      for (let col = 0; col < 7; col++) {
        const cellIndex = row * 7 + col;
        const dayNum    = cellIndex - startOffset + 1;
        if (dayNum < 1 || dayNum > lastDay.getDate()) {
          cells += `<div class="calendar-day" style="background:var(--bg);opacity:.35"></div>`;
          continue;
        }
        const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;

        // Which habits are "active" on this day?
        const activeHabits = list.filter(h => {
          const created = h.created_at ? h.created_at.slice(0, 10) : null;
          return created && created <= dateStr && dateStr <= todayStr;
        });

        const chips = activeHabits.map(h =>
          `<div class="cal-task-chip" style="border-left:2px solid ${habitColors[h.id]};background:var(--bg-card);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h.title}">${h.title}</div>`
        ).join('');

        cells += `<div class="calendar-day${isToday ? ' today' : ''}">
          <div class="cal-day-num-cell${isToday ? ' today' : ''}">${dayNum}</div>
          ${chips}
        </div>`;
      }
      calRows += `<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border)">${cells}</div>`;
    }

    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const header = dayLabels.map(d =>
      `<div style="padding:6px 8px;font-size:11px;font-weight:600;color:var(--text-muted);text-align:center;border-right:1px solid var(--border)">${d}</div>`
    ).join('');

    // Legend
    const legend = list.length ? `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;font-size:12px">
      ${list.map(h => `<span style="display:flex;align-items:center;gap:4px">
        <span style="width:10px;height:10px;border-radius:50%;background:${habitColors[h.id]};flex-shrink:0"></span>
        ${h.title}
      </span>`).join('')}
    </div>` : '';

    return `<div>
      <div style="text-align:center;font-weight:600;font-size:15px;margin-bottom:12px;color:var(--text)">${monthName}</div>
      <div class="calendar-month-wrap">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--bg-card);border-bottom:1px solid var(--border)">${header}</div>
        ${calRows}
      </div>
      ${legend}
    </div>`;
  }

  // ── Shell ────────────────────────────────────────────────────────────
  const toggle = viewToggleHtml(
    [{key:'table',label:'Table'},{key:'cards',label:'Cards'},{key:'calendar',label:'Calendar'}],
    habitsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        <h1 class="view-title">Habits</h1>
        <div class="view-subtitle">${habits.length} habit${habits.length !== 1 ? 's' : ''} tracked</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${toggle}
        <button class="btn btn-primary" id="new-habit-btn">+ New Habit</button>
      </div>
    </div>
    <div id="habit-list"></div>
  </div>`;

  // Filter + sort bar (table/cards only)
  const habitFilterDefs = [
    { key: 'type', label: 'Type', multi: true, options: ['learning','fitness','meditation','general'].map(v => ({ value: v, label: v })) },
  ];
  const habitSortDefs = [
    { key: 'title',      label: 'Title'   },
    { key: 'type',       label: 'Type'    },
    { key: 'created_at', label: 'Created' },
  ];

  if (habitsViewMode !== 'calendar') {
    const viewEl   = document.querySelector('#main-content .view');
    const headerEl = viewEl?.querySelector('.view-header');
    if (headerEl) {
      const barDiv = document.createElement('div');
      barDiv.id = 'habit-filter-bar-container';
      headerEl.after(barDiv);
      notionFilterBar('habit-filter-bar-container', habitFilterDefs, habitSortDefs, habitFilterState, () => render());
    }
  }

  function getFiltered() {
    return applySortFilter(habits, habitFilterState, {
      type:       h => h.type || 'general',
      title:      h => h.title,
      created_at: h => h.created_at || '',
      _text:      h => h.title + ' ' + (h.reference_id || '') + ' ' + (h.type || ''),
    });
  }

  function render() {
    const list = getFiltered();
    const el   = document.getElementById('habit-list');
    if (!el) return;
    if (habitsViewMode === 'table')    el.innerHTML = buildTableView(list);
    else if (habitsViewMode === 'cards')   el.innerHTML = buildCardsView(list);
    else if (habitsViewMode === 'calendar') el.innerHTML = buildCalendarView(list);
    bindHabitEvents();
  }

  document.getElementById('new-habit-btn').onclick = () => showHabitModal(null);

  bindViewToggle([], null, (mode) => {
    habitsViewMode = mode;
    localStorage.setItem('habitsViewMode', mode);
    // Calendar doesn't use filter bar — re-render whole view to add/remove it cleanly
    renderHabits();
  });

  render();

  function bindHabitEvents() {
    document.querySelectorAll('.habit-edit-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const h = habits.find(x => String(x.id) === btn.dataset.habitId);
        showHabitModal(h);
      };
    });
    document.querySelectorAll('.habit-del-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this habit?')) return;
        await api('DELETE', `/api/habits/${btn.dataset.habitId}`);
        renderHabits();
      };
    });
  }
}

// ── Habit create/edit modal ───────────────────────────────────────────────────
function showHabitModal(habit) {
  const isEdit = !!habit;
  const title  = isEdit ? 'Edit Habit' : 'New Habit';

  const body = `
    <div class="form-group">
      <label class="form-label">Title *</label>
      <input type="text" id="h-title" value="${isEdit ? _esc(habit.title) : ''}" placeholder="e.g. Morning run, Read 30 min…" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label">Type</label>
      <select id="h-type">
        ${['general','learning','fitness','meditation'].map(t =>
          `<option value="${t}"${isEdit && habit.type === t ? ' selected' : ''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group" id="h-ref-group" style="${(isEdit && habit.type === 'learning') || (!isEdit) ? '' : 'display:none'}">
      <label class="form-label">StudyTrack Reference ID <span style="font-weight:400;color:var(--text-muted)">(required for Learning)</span></label>
      <input type="text" id="h-ref" value="${isEdit && habit.reference_id ? _esc(habit.reference_id) : ''}" placeholder="e.g. gcp-ml-engineer" autocomplete="off" style="font-family:var(--font-mono);font-size:13px" />
    </div>
    <div id="h-error" style="display:none;color:var(--danger,#DC2626);font-size:13px;margin-top:8px;padding:8px 12px;background:var(--danger-bg,#fff1f1);border-radius:6px"></div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="h-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="h-save-btn">${isEdit ? 'Save changes' : 'Create Habit'}</button>
    </div>`;

  openFormSlideover(title, body);

  // Show/hide reference field based on type selection
  const typeEl = document.getElementById('h-type');
  const refGroup = document.getElementById('h-ref-group');
  typeEl.onchange = () => {
    refGroup.style.display = typeEl.value === 'learning' ? '' : 'none';
  };
  // Set initial state
  refGroup.style.display = (typeEl.value === 'learning') ? '' : 'none';

  document.getElementById('h-cancel-btn').onclick = closeFormSlideover;

  document.getElementById('h-save-btn').onclick = async () => {
    const errEl = document.getElementById('h-error');
    errEl.style.display = 'none';

    const titleVal = document.getElementById('h-title').value.trim();
    const typeVal  = document.getElementById('h-type').value;
    const refVal   = document.getElementById('h-ref').value.trim();

    if (!titleVal) {
      errEl.textContent = 'Title is required.';
      errEl.style.display = 'block';
      document.getElementById('h-title').focus();
      return;
    }
    if (typeVal === 'learning' && !refVal) {
      errEl.textContent = 'A StudyTrack Reference ID is required for Learning habits.';
      errEl.style.display = 'block';
      document.getElementById('h-ref').focus();
      return;
    }

    const payload = { title: titleVal, type: typeVal };
    if (refVal) payload.reference_id = refVal;

    const saveBtn = document.getElementById('h-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      if (isEdit) {
        payload.id = habit.id;
        await api('PATCH', `/api/habits/${habit.id}`, payload);
      } else {
        await api('POST', '/api/habits', payload);
      }
      closeFormSlideover();
      renderHabits();
    } catch(err) {
      errEl.textContent = err.message || 'Failed to save habit. Check the server logs.';
      errEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save changes' : 'Create Habit';
    }
  };

  // Focus title on open
  setTimeout(() => document.getElementById('h-title')?.focus(), 60);
}

/* ─── Resources View ─────────────────────────────────────────────────── */
async function renderResources() {
  let resources = [];
  let apiError = null;
  try { resources = await api('GET', '/api/resources'); } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const resFilterState = { filters: {}, sort: {}, searchText: '' };
  const types = [...new Set(resources.map(r => r.resource_type).filter(Boolean))];

  function buildTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    const rows = list.map(r => {
      const rawUrl = r.url || '';
      const link = rawUrl
        ? `<a href="${rawUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${rawUrl.length > 40 ? rawUrl.slice(0,40) + '…' : rawUrl}</a>`
        : (r.body ? r.body.slice(0,60) + '…' : '—');
      const linked = r.goal_title || r.project_title || r.task_title || '—';
      return `<tr class="res-row" data-res-id="${r.id}" style="cursor:pointer">
        <td><span class="list-icon-slot" data-icon-entity="resource" data-icon-id="${r.id}" data-icon-size="16" style="display:none;margin-right:5px;vertical-align:middle;font-size:16px"></span>${r.title}</td>
        <td>${r.resource_type || '—'}</td>
        <td>${linked}</td>
        <td>${link}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-danger res-del-btn" data-res-id="${r.id}">×</button>
        </td>
      </tr>`;
    }).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Type</th><th>Linked</th><th>URL / Preview</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    return `<div style="display:grid;gap:12px">${list.map(r => {
      const rawUrl = r.url || '';
      const linked = r.goal_title || r.project_title || r.task_title;
      return `<div class="card res-row" data-res-id="${r.id}" style="cursor:pointer">
        <div class="flex-between gap-8" style="margin-bottom:6px">
          <span class="card-title"><span class="list-icon-slot" data-icon-entity="resource" data-icon-id="${r.id}" data-icon-size="18" style="display:none;margin-right:6px;vertical-align:middle;font-size:18px"></span>${r.title}</span>
          <div class="flex gap-8" onclick="event.stopPropagation()">
            <button class="btn btn-sm btn-danger res-del-btn" data-res-id="${r.id}">×</button>
          </div>
        </div>
        ${r.resource_type ? `<span class="badge badge-todo">${r.resource_type}</span>` : ''}
        ${linked ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">→ ${linked}</div>` : ''}
        ${rawUrl ? `<div style="margin-top:6px" onclick="event.stopPropagation()"><a href="${rawUrl}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent)">${rawUrl.length > 60 ? rawUrl.slice(0,60)+'…' : rawUrl}</a></div>` : ''}
        ${r.body ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${r.body.slice(0,120)}${r.body.length>120?'…':''}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }

  const toggle = viewToggleHtml([{key:'table',label:'Table'},{key:'cards',label:'Cards'}], resourcesViewMode);

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Resources</h1>
      <div style="display:flex;gap:8px;align-items:center">
        ${toggle}
        <button class="btn btn-primary" id="new-res-btn">+ New Resource</button>
      </div>
    </div>
    <div id="res-table"></div>
  </div>`;

  const resFilterDefs = [
    { key: 'resource_type', label: 'Type', multi: false, options: [{ value: '', label: 'All' }, ...types.map(t => ({ value: t, label: t }))] },
  ];
  const resSortDefs = [
    { key: 'title', label: 'Title' },
    { key: 'resource_type', label: 'Type' },
  ];
  const resViewEl = document.querySelector('#main-content .view');
  const resHeaderEl = resViewEl?.querySelector('.view-header');
  if (resHeaderEl) {
    const barDiv = document.createElement('div');
    barDiv.id = 'res-filter-bar-container';
    resHeaderEl.after(barDiv);
    notionFilterBar('res-filter-bar-container', resFilterDefs, resSortDefs, resFilterState, () => render());
  }

  function getFiltered() {
    return applySortFilter(resources, resFilterState, {
      resource_type: r => r.resource_type || '',
      title: r => r.title,
      _text: r => r.title + ' ' + (r.url || '') + ' ' + (r.body || ''),
    });
  }

  function render() {
    const list = getFiltered();
    document.getElementById('res-table').innerHTML =
      resourcesViewMode === 'cards' ? buildCards(list) : buildTable(list);
    bindResEvents();
    injectListIcons('resource', list.map(r => r.id));
  }

  document.getElementById('new-res-btn').onclick = () => showResourceModal(null, () => renderResources());
  bindViewToggle([], null, (mode) => {
    resourcesViewMode = mode;
    localStorage.setItem('resourcesViewMode', mode);
    render();
  });
  render();

  function bindResEvents() {
    document.querySelectorAll('.res-row').forEach(el => {
      el.onclick = async (e) => {
        if (e.target.closest('.res-del-btn') || e.target.closest('a')) return;
        const r = resources.find(x => String(x.id) === el.dataset.resId);
        if (r) showResourceSlideover(r, () => renderResources());
      };
    });
    document.querySelectorAll('.res-del-btn').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this resource?')) return;
        await api('DELETE', `/api/resources/${el.dataset.resId}`);
        renderResources();
      };
    });
  }
}

/* ─── Categories View ────────────────────────────────────────────────── */
async function renderCategories() {
  let cats = [];
  try { cats = await api('GET', '/api/categories'); allCategories = cats; } catch(e) {}

  const chips = cats.map(c => {
    const hex = COLOR_HEX[c.color] || c.color || '#378ADD';
    return `<div class="taxonomy-chip">
      <div class="taxonomy-chip-color" style="background:${hex}"></div>
      <span class="taxonomy-chip-name">${c.name}</span>
      <div class="taxonomy-chip-actions">
        <button class="btn btn-sm btn-ghost cat-edit-btn" data-cat-id="${c.id}">Edit</button>
        <button class="btn btn-sm btn-danger cat-del-btn" data-cat-id="${c.id}">Del</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">◉</div><div class="empty-state-text">No categories yet</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Categories</h1>
      <button class="btn btn-primary" id="new-cat-btn">+ New Category</button>
    </div>
    <div class="filter-row"><input type="text" id="cat-search" placeholder="Search categories…" /></div>
    <div id="cat-grid" class="taxonomy-grid">${chips}</div>
  </div>`;

  document.getElementById('new-cat-btn').onclick = () => showCategoryModal(null);
  document.getElementById('cat-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.taxonomy-chip').forEach(chip => {
      const name = chip.querySelector('.taxonomy-chip-name')?.textContent?.toLowerCase() || '';
      chip.style.display = name.includes(q) ? '' : 'none';
    });
  };
  document.querySelectorAll('.cat-edit-btn').forEach(el => {
    el.onclick = () => {
      const c = cats.find(x => String(x.id) === el.dataset.catId);
      showCategoryModal(c);
    };
  });
  document.querySelectorAll('.cat-del-btn').forEach(el => {
    el.onclick = async () => {
      if (!confirm('Delete this category?')) return;
      await api('DELETE', `/api/categories/${el.dataset.catId}`);
      renderCategories();
    };
  });
}

/* ─── Tags View ──────────────────────────────────────────────────────── */
async function renderTags() {
  let tags = [];
  try { tags = await api('GET', '/api/tags'); allTags = tags; } catch(e) {}

  const chips = tags.map(t => {
    const hex = COLOR_HEX[t.color] || t.color || '#378ADD';
    return `<div class="taxonomy-chip">
      <div class="taxonomy-chip-color" style="background:${hex}"></div>
      <span class="taxonomy-chip-name">${t.name}</span>
      <div class="taxonomy-chip-actions">
        <button class="btn btn-sm btn-ghost tag-edit-btn" data-tag-id="${t.id}">Edit</button>
        <button class="btn btn-sm btn-danger tag-del-btn" data-tag-id="${t.id}">Del</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">⬖</div><div class="empty-state-text">No tags yet</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Tags</h1>
      <button class="btn btn-primary" id="new-tag-btn">+ New Tag</button>
    </div>
    <div class="filter-row"><input type="text" id="tag-search" placeholder="Search tags…" /></div>
    <div id="tag-grid" class="taxonomy-grid">${chips}</div>
  </div>`;

  document.getElementById('new-tag-btn').onclick = () => showTagModal(null);
  document.getElementById('tag-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#tag-grid .taxonomy-chip').forEach(chip => {
      const name = chip.querySelector('.taxonomy-chip-name')?.textContent?.toLowerCase() || '';
      chip.style.display = name.includes(q) ? '' : 'none';
    });
  };
  document.querySelectorAll('.tag-edit-btn').forEach(el => {
    el.onclick = () => {
      const t = tags.find(x => String(x.id) === el.dataset.tagId);
      showTagModal(t);
    };
  });
  document.querySelectorAll('.tag-del-btn').forEach(el => {
    el.onclick = async () => {
      if (!confirm('Delete this tag?')) return;
      await api('DELETE', `/api/tags/${el.dataset.tagId}`);
      renderTags();
    };
  });
}

/* ─── Project Detail View ─────────────────────────────────────────────── */
async function renderProjectDetail(projectId) {
  let p;
  try { p = await api('GET', `/api/projects/${projectId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Project not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('project-detail', projectId, p.title);

  const tasks = p.tasks || [];
  const notes = p.notes || [];
  const resources = p.resources || [];

  // Compute sub_task_count for each task from the tasks array itself
  tasks.forEach(t => {
    t.sub_task_count = tasks.filter(s => s.parent_task_id === t.id).length;
  });

  // Merge project tasks into allTasksCache for subtask lookups
  tasks.forEach(t => {
    if (!allTasksCache.find(x => x.id === t.id)) allTasksCache.push(t);
  });

  function buildTaskTreeRows(taskList, allTasks, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, false, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildTaskTreeRows(children, allTasks, depth + 1);
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  function buildTaskList() {
    if (!tasks.length) return `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks</div></div>`;
    const taskIds = new Set(tasks.map(t => t.id));
    const topLevel = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
    return '<ul class="task-list">' + buildTaskTreeRows(topLevel, tasks, 0) + '</ul>';
  }

  function renderTaskList() {
    document.getElementById('pd-task-list').innerHTML = buildTaskList();
    bindDetailTaskEvents(() => renderProjectDetail(projectId));
  }

  const noteCards = notes.map(n => `<div class="note-card clickable-note" data-note-id="${n.id}" style="cursor:pointer">
    <div class="note-title">${n.title || 'Untitled'}</div>
    <div class="note-body-preview">${n.body || ''}</div>
    <div class="note-meta">${fmtDate(n.note_date) || ''}</div>
  </div>`).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No notes</div></div>`;

  const resRows = resources.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
    <span class="badge badge-todo">${r.resource_type || 'link'}</span>
    <span style="flex:1">${r.title}</span>
    ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">↗ Open</a>` : ''}
  </div>`).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No resources</div></div>`;

  const goalLink = p.goal_title
    ? `<span class="bc-crumb bc-goal" style="cursor:pointer" data-goal-id="${p.goal_id}">◈ ${p.goal_title}</span>`
    : '';

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        ${goalLink ? `<div class="breadcrumb" style="margin-bottom:6px">${goalLink}</div>` : ''}
        <button class="entity-icon-add-btn" id="proj-icon-btn">
          <span id="proj-icon-display"></span>
          <span id="proj-icon-add-label">Add icon</span>
        </button>
        <h1 class="view-title">${p.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(p.status)}
          ${p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
          ${p.kanban_col ? `<span class="badge badge-progress">${p.kanban_col}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="pd-export-btn">Export JSON</button>
        <button class="btn btn-ghost" id="pd-back-btn">← Back</button>
        <button class="btn btn-primary" id="pd-add-task-btn">+ Task</button>
        <button class="btn btn-ghost" id="pd-add-note-btn">+ Note</button>
        <button class="btn btn-ghost" id="pd-add-res-btn">+ Resource</button>
      </div>
    </div>
    ${p.description ? `<div class="card" style="margin-bottom:16px"><p style="color:var(--text-muted)">${p.description}</p></div>` : ''}
    <div class="cc-grid wide">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Tasks (${tasks.length})</span></div>
        <div id="pd-task-list">${buildTaskList()}</div>
      </div>
    </div>
    <div class="cc-grid" style="margin-top:16px">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Notes (${notes.length})</span></div>
        <div id="pd-notes">${noteCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Resources (${resources.length})</span></div>
        <div>${resRows}</div>
      </div>
    </div>
    <div class="widget" style="margin-top:16px">
      <div class="widget-header">
        <span class="widget-title">Properties</span>
        <button class="btn btn-sm btn-ghost" id="pd-add-prop-btn">+ Add</button>
      </div>
      <div id="pd-props-list"></div>
    </div>
  </div>`;

  document.getElementById('pd-back-btn').onclick = () => renderView('projects');
  document.getElementById('pd-add-task-btn').onclick = () => showNewTaskModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-add-note-btn').onclick = () => showNoteModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-add-res-btn').onclick = () => showResourceModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-export-btn').onclick = async () => {
    const data = await api('GET', `/api/export/project/${projectId}`);
    downloadJSON(data, `project-${p.title}.json`);
  };
  // ── Project icon picker ──────────────────────────────────────────────
  const projIconBtn = document.getElementById('proj-icon-btn');
  const projIconDisplay = document.getElementById('proj-icon-display');
  const projIconAddLabel = document.getElementById('proj-icon-add-label');
  loadEntityIcon('project', projectId).then(icon => {
    if (projIconDisplay) {
      projIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 32) : '';
      projIconDisplay.dataset.icon = icon || '';
      if (projIconAddLabel) projIconAddLabel.textContent = icon ? '' : 'Add icon';
    }
  });
  if (projIconBtn) {
    projIconBtn.onclick = (e) => {
      e.stopPropagation();
      const cur = projIconDisplay ? projIconDisplay.dataset.icon || '' : '';
      showIconPicker(projIconBtn, 'project', projectId, cur, (newIcon) => {
        if (projIconDisplay) { projIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : ''; projIconDisplay.dataset.icon = newIcon; }
        if (projIconAddLabel) projIconAddLabel.textContent = newIcon ? '' : 'Add icon';
        saveEntityIcon('project', projectId, newIcon).catch(() => {
          if (projIconDisplay) { projIconDisplay.innerHTML = cur ? renderEntityIcon(cur, 32) : ''; projIconDisplay.dataset.icon = cur; }
          if (projIconAddLabel) projIconAddLabel.textContent = cur ? '' : 'Add icon';
        });
      });
    };
  }
  if (goalLink) {
    document.querySelectorAll('.bc-goal').forEach(el => {
      el.onclick = () => renderView('goal-detail', el.dataset.goalId);
    });
  }
  document.querySelectorAll('.clickable-note').forEach(el => {
    el.onclick = () => {
      const n = notes.find(x => String(x.id) === el.dataset.noteId);
      if (n) showNoteModal(n, () => renderProjectDetail(projectId));
    };
  });
  bindDetailTaskEvents(() => renderProjectDetail(projectId));
  bindPropertiesWidget('project', projectId, 'pd-props-list', 'pd-add-prop-btn');
}
async function renderGoalDetail(goalId) {
  let g;
  try { g = await api('GET', `/api/goals/${goalId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Goal not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('goal-detail', goalId, g.title);

  const projects = g.projects || [];
  const tasks = g.tasks || [];
  const notes = g.notes || [];
  const resources = g.resources || [];

  // Compute sub_task_count for each task from the tasks array
  tasks.forEach(t => {
    t.sub_task_count = tasks.filter(s => s.parent_task_id === t.id).length;
  });

  const projCards = projects.map(p => {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    return `<div class="card detail-nav" data-proj-id="${p.id}" style="cursor:pointer;margin-bottom:8px">
      <div class="flex-between gap-8">
        <span class="card-title">${p.title}</span>
        ${statusBadge(p.status)}
      </div>
      <div class="progress-wrap" style="margin-top:8px">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No projects</div></div>`;

  // Merge goal tasks into cache for subtask lookups
  tasks.forEach(t => { if (!allTasksCache.find(x => x.id === t.id)) allTasksCache.push(t); });

  function buildGoalTaskTreeRows(taskList, allTasks, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, false, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasks.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildGoalTaskTreeRows(children, allTasks, depth + 1);
        html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
          <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Add Subtask</button>
        </li>`;
      }
    }
    return html;
  }

  const taskIds = new Set(tasks.map(t => t.id));
  const topLevelTasks = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
  const taskRows = tasks.length
    ? '<ul class="task-list">' + buildGoalTaskTreeRows(topLevelTasks, tasks, 0) + '</ul>'
    : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No direct tasks</div></div>`;

  const noteCards = notes.map(n => `<div class="note-card clickable-note" data-note-id="${n.id}" style="cursor:pointer">
    <div class="note-title">${n.title || 'Untitled'}</div>
    <div class="note-body-preview">${n.body || ''}</div>
    <div class="note-meta">${fmtDate(n.note_date) || ''}</div>
  </div>`).join('') || `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No notes</div></div>`;

  // Metrics row
  const metricsHtml = (g.start_value != null || g.target != null) ? `
    <div class="stats-row" style="margin-bottom:16px">
      ${g.start_value != null ? `<div class="stat-card"><div class="stat-value">${g.start_value}</div><div class="stat-label">Start</div></div>` : ''}
      ${g.current_value != null ? `<div class="stat-card"><div class="stat-value">${g.current_value}</div><div class="stat-label">Current</div></div>` : ''}
      ${g.target != null ? `<div class="stat-card"><div class="stat-value">${g.target}</div><div class="stat-label">Target</div></div>` : ''}
    </div>` : '';

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        <button class="entity-icon-add-btn" id="goal-icon-btn">
          <span id="goal-icon-display"></span>
          <span id="goal-icon-add-label">Add icon</span>
        </button>
        <h1 class="view-title">${g.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(g.status)}
          ${g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
          ${g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="gd-export-btn">Export JSON</button>
        <button class="btn btn-ghost" id="gd-back-btn">← Back</button>
        <button class="btn btn-primary" id="gd-add-task-btn">+ Task</button>
        <button class="btn btn-ghost" id="gd-add-note-btn">+ Note</button>
        <button class="btn btn-ghost" id="gd-add-res-btn">+ Resource</button>
      </div>
    </div>
    ${g.description ? `<div class="card" style="margin-bottom:16px"><p style="color:var(--text-muted)">${g.description}</p></div>` : ''}
    ${metricsHtml}
    <div class="cc-grid" style="margin-bottom:16px">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Projects (${projects.length})</span></div>
        <div id="gd-proj-list">${projCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Direct Tasks (${tasks.length})</span></div>
        <div id="gd-task-list">${taskRows}</div>
      </div>
    </div>
    <div class="cc-grid">
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Notes (${notes.length})</span></div>
        <div id="gd-notes">${noteCards}</div>
      </div>
      <div class="widget">
        <div class="widget-header"><span class="widget-title">Resources (${resources.length})</span></div>
        <div>${resources.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="badge badge-todo">${r.resource_type || 'link'}</span>
          <span style="flex:1">${r.title}</span>
          ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">↗</a>` : ''}
        </div>`).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No resources</div></div>'}</div>
      </div>
    </div>
    <div class="widget" style="margin-top:16px">
      <div class="widget-header">
        <span class="widget-title">Properties</span>
        <button class="btn btn-sm btn-ghost" id="gd-add-prop-btn">+ Add</button>
      </div>
      <div id="gd-props-list"></div>
    </div>
  </div>`;

  document.getElementById('gd-back-btn').onclick = () => renderView('goals');
  document.getElementById('gd-export-btn').onclick = async () => {
    const data = await api('GET', `/api/export/goal/${goalId}`);
    downloadJSON(data, `goal-${g.title}.json`);
  };
  document.getElementById('gd-add-task-btn').onclick = () => showNewTaskModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-add-note-btn').onclick = () => showNoteModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-add-res-btn').onclick = () => showResourceModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  // ── Goal icon picker ──────────────────────────────────────────────────
  const goalIconBtn = document.getElementById('goal-icon-btn');
  const goalIconDisplay = document.getElementById('goal-icon-display');
  const goalIconAddLabel = document.getElementById('goal-icon-add-label');
  loadEntityIcon('goal', goalId).then(icon => {
    if (goalIconDisplay) {
      goalIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 32) : '';
      goalIconDisplay.dataset.icon = icon || '';
      if (goalIconAddLabel) goalIconAddLabel.textContent = icon ? '' : 'Add icon';
    }
  });
  if (goalIconBtn) {
    goalIconBtn.onclick = (e) => {
      e.stopPropagation();
      const cur = goalIconDisplay ? goalIconDisplay.dataset.icon || '' : '';
      showIconPicker(goalIconBtn, 'goal', goalId, cur, (newIcon) => {
        if (goalIconDisplay) { goalIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : ''; goalIconDisplay.dataset.icon = newIcon; }
        if (goalIconAddLabel) goalIconAddLabel.textContent = newIcon ? '' : 'Add icon';
        saveEntityIcon('goal', goalId, newIcon).catch(() => {
          if (goalIconDisplay) { goalIconDisplay.innerHTML = cur ? renderEntityIcon(cur, 32) : ''; goalIconDisplay.dataset.icon = cur; }
          if (goalIconAddLabel) goalIconAddLabel.textContent = cur ? '' : 'Add icon';
        });
      });
    };
  }
  document.querySelectorAll('#gd-proj-list .detail-nav').forEach(el => {
    el.onclick = () => renderView('project-detail', el.dataset.projId);
  });
  document.querySelectorAll('.clickable-note').forEach(el => {
    el.onclick = () => {
      const n = notes.find(x => String(x.id) === el.dataset.noteId);
      if (n) showNoteModal(n, () => renderGoalDetail(goalId));
    };
  });
  bindDetailTaskEvents(() => renderGoalDetail(goalId));
  bindPropertiesWidget('goal', goalId, 'gd-props-list', 'gd-add-prop-btn');
}

/* ─── Properties Widget ──────────────────────────────────────────────── */
async function bindPropertiesWidget(entityType, entityId, listContainerId, addBtnId) {
  const listEl = document.getElementById(listContainerId);
  const addBtn = document.getElementById(addBtnId);
  if (!listEl) return;

  async function loadAndRender() {
    let props = {};
    try { props = await api('GET', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`); } catch(e) {}
    const entries = Object.entries(props);
    if (!entries.length) {
      listEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:6px 0">No custom properties</div>`;
    } else {
      listEl.innerHTML = entries.map(([k,v]) => `
        <div class="prop-row" data-key="${k.replace(/"/g,'&quot;')}">
          <span class="prop-key">${k}</span>
          <span class="prop-sep">:</span>
          <input class="prop-val-input" data-key="${k.replace(/"/g,'&quot;')}" value="${(v||'').replace(/"/g,'&quot;')}" />
          <button class="prop-del-btn btn btn-sm btn-ghost" data-key="${k.replace(/"/g,'&quot;')}" title="Delete">×</button>
        </div>`).join('');
      listEl.querySelectorAll('.prop-val-input').forEach(inp => {
        inp.onblur = async () => {
          await api('POST', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`, { key: inp.dataset.key, value: inp.value });
        };
        inp.onkeydown = (e) => { if (e.key === 'Enter') inp.blur(); };
      });
      listEl.querySelectorAll('.prop-del-btn').forEach(btn => {
        btn.onclick = async () => {
          await api('DELETE', `/api/properties?entity_type=${entityType}&entity_id=${entityId}&key=${encodeURIComponent(btn.dataset.key)}`);
          loadAndRender();
        };
      });
    }
  }

  loadAndRender();

  if (addBtn) {
    addBtn.onclick = () => {
      const existing = document.getElementById('prop-add-row');
      if (existing) { existing.remove(); return; }
      const row = document.createElement('div');
      row.id = 'prop-add-row';
      row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px';
      row.innerHTML = `
        <input id="prop-new-key" placeholder="Property name" style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text)" />
        <input id="prop-new-val" placeholder="Value" style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text)" />
        <button class="btn btn-sm btn-primary" id="prop-save-new">Add</button>
        <button class="btn btn-sm btn-ghost" id="prop-cancel-new">×</button>`;
      listEl.after(row);
      document.getElementById('prop-new-key').focus();
      document.getElementById('prop-cancel-new').onclick = () => row.remove();
      const saveNew = async () => {
        const key = document.getElementById('prop-new-key').value.trim();
        const val = document.getElementById('prop-new-val').value;
        if (!key) return;
        await api('POST', `/api/properties?entity_type=${entityType}&entity_id=${entityId}`, { key, value: val });
        row.remove();
        loadAndRender();
      };
      document.getElementById('prop-save-new').onclick = saveNew;
      document.getElementById('prop-new-val').onkeydown = (e) => { if (e.key === 'Enter') saveNew(); };
    };
  }
}

/* ─── Task Slideover ─────────────────────────────────────────────────── */
async function showTaskSlideover(taskId) {
  openSlideover('Task Detail', '<div class="loading">Loading…</div>');

  let task;
  try { task = await api('GET', `/api/tasks/${taskId}`); } catch(e) { return; }

  const subtasks = task.sub_tasks || [];
  const tags = task.tags || [];

  // Fetch projects and goals for comboboxes; always refresh allTasksCache for correct child lookups
  let allProjects = [], allGoals = [];
  try {
    const results = await Promise.all([
      api('GET', '/api/projects'),
      api('GET', '/api/goals'),
      api('GET', '/api/tasks?all=1'),
    ]);
    [allProjects, allGoals] = results;
    allTasksCache = results[2];
    allTasksFull = allTasksCache;
  } catch(e) {}

  const pomPlanned = task.pomodoros_planned || 0;
  const pomDone = task.pomodoros_finished || 0;
  const dotCount = Math.max(pomPlanned, pomDone, 1);
  const pomDots = Array.from({length: dotCount}, (_, i) =>
    `<div class="pom-dot ${i < pomDone ? 'done' : ''}"></div>`
  ).join('');

  // Build interactive nested subtask table (chevron toggle + add subtask)
  const chevSvgSub = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,3 5,7 8,3"/></svg>`;
  function buildSubtaskTable(items, depth) {
    if (!items.length) return '';
    let rows = '';
    items.forEach(st => {
      const children = allTasksCache.filter(x => String(x.parent_task_id) === String(st.id));
      const hasChildren = children.length > 0;
      const isExpanded = expandedTasks.has(String(st.id));
      // All rows (parent or leaf) use the same toggle arrow — clicking always expands inline
      const toggleBtn = `<span class="task-toggle-arrow sub-toggle ${isExpanded ? 'expanded' : ''}" data-toggle-id="${st.id}" style="cursor:pointer;margin-right:4px" title="Toggle">${chevSvgSub}</span>`;
      const indent = depth * 18;
      // Title is always plain text — use the toggle arrow to expand, or the inline add button to open slideover
      const titleEl = `<span class="task-title-text${st.status==='done'?' done':''}">${st.title}</span>`;
      rows += `<tr class="subtask-table-row" data-st-id="${st.id}">
        <td style="padding-left:${8+indent}px">
          <div style="display:flex;align-items:center;gap:6px">
            ${toggleBtn}
            <div class="task-check ${st.status==='done'?'done':''}" data-subtask-id="${st.id}" style="flex-shrink:0">${st.status==='done'?'✓':''}</div>
            ${titleEl}
          </div>
        </td>
        <td>${statusBadge(st.status)}</td>
        <td>${priorityBadge(st.priority)}</td>
        <td style="font-size:11px;font-family:'DM Mono',monospace;color:var(--text-muted)">${fmtDate(st.due_date)||'—'}</td>
      </tr>`;
      if (isExpanded) {
        if (hasChildren) rows += buildSubtaskTable(children, depth + 1);
        rows += `<tr class="subtask-quick-add-row" data-add-parent="${st.id}">
          <td colspan="4" style="padding:4px 8px 4px ${8+indent+18}px">
            <button class="btn btn-sm btn-ghost sub-add-inline-btn" data-parent-id="${st.id}" style="font-size:12px;color:var(--color-text-secondary)">+ Add Subtask</button>
          </td>
        </tr>`;
      }
    });
    return rows;
  }

  function renderSubtaskTable() {
    const wrap = document.getElementById('subtask-list');
    if (!wrap) return;
    const currentSubtasks = allTasksCache.filter(x => String(x.parent_task_id) === String(taskId));
    if (!currentSubtasks.length) {
      wrap.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No subtasks</div>';
      return;
    }
    wrap.innerHTML = `<div class="notion-table-wrap" style="margin-top:8px">
      <table class="notion-table">
        <thead><tr><th>Subtask</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
        <tbody>${buildSubtaskTable(currentSubtasks, 0)}</tbody>
      </table>
    </div>`;
    bindSubtaskTableEvents();
  }

  function bindSubtaskTableEvents() {
    const wrap = document.getElementById('subtask-list');
    if (!wrap) return;
    // Toggle arrows — clicking the arrow expands/collapses
    wrap.querySelectorAll('.sub-toggle').forEach(arrow => {
      arrow.onclick = (e) => {
        e.stopPropagation();
        const id = String(arrow.dataset.toggleId);
        if (expandedTasks.has(id)) expandedTasks.delete(id);
        else expandedTasks.add(id);
        renderSubtaskTable();
      };
    });
    // Row click for parent rows — clicking anywhere in the row toggles (same as arrow)
    wrap.querySelectorAll('tr.subtask-table-row[data-st-id]').forEach(row => {
      row.onclick = (e) => {
        // Only handle clicks that hit the row or its cells, not interactive children
        if (e.target.closest('.task-check') || e.target.closest('.sub-add-inline-btn')) return;
        const arrow = row.querySelector('.sub-toggle[data-toggle-id]');
        if (!arrow) return;
        e.stopPropagation();
        const id = String(arrow.dataset.toggleId);
        if (expandedTasks.has(id)) expandedTasks.delete(id);
        else expandedTasks.add(id);
        renderSubtaskTable();
      };
    });
    // Inline add subtask buttons (inside expanded rows)
    wrap.querySelectorAll('.sub-add-inline-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const parentId = parseInt(btn.dataset.parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
          allTasksCache = await api('GET', '/api/tasks?all=1');
          allTasksFull = allTasksCache;
          renderSubtaskTable();
        });
      };
    });
    // Subtask check click
    wrap.querySelectorAll('.task-check[data-subtask-id]').forEach(chk => {
      chk.onclick = async (e) => {
        e.stopPropagation();
        const stId = parseInt(chk.dataset.subtaskId);
        const st = allTasksCache.find(x => x.id === stId);
        if (!st) return;
        const newStatus = st.status === 'done' ? 'todo' : 'done';
        try { await api('PATCH', `/api/tasks/${stId}`, { status: newStatus }); } catch(err) {}
        allTasksCache = await api('GET', '/api/tasks?all=1');
        allTasksFull = allTasksCache;
        renderSubtaskTable();
      };
    });
  }

  const tagPicker = null; // legacy — tags now handled via combobox chip

  const notesHtml = (task.notes || []).map(n =>
    `<div class="note-card" style="margin-bottom:8px">
      <div class="note-title">${n.title || 'Note'}</div>
      <div class="note-body-preview">${n.body || ''}</div>
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:13px">No linked notes</div>';

  const resourcesHtml = (task.resources || []).map(r =>
    `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--accent)">${r.resource_type || 'link'}</span>
      <span>${r.title}</span>
      ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" style="font-size:12px;color:var(--text-muted)">↗</a>` : ''}
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:13px">No linked resources</div>';

  // ── Breadcrumb — walk the full ancestor chain ──────────────────────────
  // Levels: Goal → Project → ancestor tasks → (current task title shown as heading)
  // We walk up allTasksCache from parent_task_id to collect all ancestor tasks,
  // then take the topmost ancestor's goal/project fields for context.
  let bcHtml = '';
  (function buildBreadcrumb() {
    // Collect ancestor task chain (closest parent first, then grandparent, etc.)
    const ancestors = [];
    let cursor = task.parent_task_id ? String(task.parent_task_id) : null;
    const visited = new Set();
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      const anc = allTasksCache.find(t => String(t.id) === cursor);
      if (!anc) break;
      ancestors.unshift(anc); // unshift = prepend so order is root→leaf
      cursor = anc.parent_task_id ? String(anc.parent_task_id) : null;
    }

    // Find goal and project from the task itself or walk up ancestors
    let goalId = task.goal_id, goalTitle = task.goal_title;
    let projectId = task.project_id, projectTitle = task.project_title;
    if (!goalId || !goalTitle) {
      // Try to find goal_id from ancestors if current task doesn't have one
      if (!goalId) {
        const ancWithGoal = ancestors.find(a => a.goal_id);
        if (ancWithGoal) { goalId = ancWithGoal.goal_id; goalTitle = ancWithGoal.goal_title; }
      }
      // Even if we have goalId, goal_title may not be in list response — look up in allGoals
      if (goalId && !goalTitle) {
        const g = allGoals.find(g => String(g.id) === String(goalId));
        if (g) goalTitle = g.title;
      }
    }
    if ((!projectId || !projectTitle) && !projectTitle) {
      const ancWithProj = ancestors.find(a => a.project_id);
      if (ancWithProj) { projectId = ancWithProj.project_id; projectTitle = ancWithProj.project_title; }
      else {
        const p = projectId ? allProjects.find(p => String(p.id) === String(projectId)) : null;
        if (p) projectTitle = p.title;
      }
    }

    // Build the crumb: Goal (if any) › Project (if any) › ancestor tasks (if any)
    if (goalId && goalTitle) {
      bcHtml += `<span class="bc-part bc-goal" data-goal-id="${goalId}">${goalTitle}</span><span class="bc-sep">›</span>`;
    }
    if (projectId && projectTitle) {
      bcHtml += `<span class="bc-part bc-proj" data-proj-id="${projectId}">${projectTitle}</span><span class="bc-sep">›</span>`;
    }
    for (const anc of ancestors) {
      bcHtml += `<span class="bc-part" data-task-id="${anc.id}" style="cursor:pointer">${anc.title}</span><span class="bc-sep">›</span>`;
    }
  })();
  const bcPrefix = bcHtml ? `<div class="detail-bc-prefix">${bcHtml}</div>` : '';

  // ── Date range display helper ─────────────────────────────────────────
  function fmtDateRange(start, end) {
    const fmt = (d) => {
      if (!d) return null;
      const dt = new Date(stripDate(d) + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    const s = fmt(start), e = fmt(end);
    if (s && e && s !== e) return `${s} → ${e}`;
    return s || e || '—';
  }

  // ── Property chip display values ──────────────────────────────────────
  const catName = allCategories ? (allCategories.find(c => String(c.id) === String(task.category_id)) || {}).name : task.category_id;
  const projName = allProjects.find(p => String(p.id) === String(task.project_id)) ? allProjects.find(p => String(p.id) === String(task.project_id)).title : null;
  const goalName = allGoals.find(g => String(g.id) === String(task.goal_id)) ? allGoals.find(g => String(g.id) === String(task.goal_id)).title : null;

  const body = `
    <button class="entity-icon-add-btn" id="task-icon-add-btn">
      <span id="task-icon-display"></span>
      <span id="task-icon-add-label">Add icon</span>
    </button>
    <div class="detail-title-area">
      ${bcPrefix}
      <textarea class="detail-title-input" id="detail-title" rows="1">${(task.title || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      <button class="prop-chip chip-status-${task.status}" id="chip-status" data-key="status">
        <span class="chip-label">Status</span>
        <span class="chip-value"${(() => { const c = getValueColor('taskStatuses', task.status); return c ? ` style="background:${c}22;color:${c};border-radius:3px;padding:1px 5px;font-weight:600"` : ''; })()}>${task.status.replace('_',' ')}</span>
      </button>
      <button class="prop-chip chip-priority-${task.priority}" id="chip-priority" data-key="priority">
        <span class="chip-label">Priority</span>
        <span class="chip-value"${(() => { const c = getValueColor('taskPriorities', task.priority); return c ? ` style="background:${c}22;color:${c};border-radius:3px;padding:1px 5px;font-weight:600"` : ''; })()}>${task.priority}</span>
      </button>
      <button class="prop-chip" id="chip-due" data-key="due">
        <span class="chip-label">Due</span>
        <span class="chip-value" id="chip-due-val">${fmtDateRange(task.start_date, task.due_date)}</span>
      </button>
      <button class="prop-chip${task.focus_block ? '' : ' chip-empty'}" id="chip-focus" data-key="focus" title="Focus block">
        <span class="chip-label">Focus</span>
        <span class="chip-value" id="chip-focus-val">${fmtDateRange(task.focus_block_start, task.focus_block)}</span>
      </button>
      <button class="prop-chip" id="chip-tags" data-key="tags">
        <span class="chip-label">Tags</span>
        <span class="chip-value" id="chip-tags-val">${tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span>
      </button>
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="detail-desc" style="width:100%;min-height:80px">${task.description || ''}</textarea>
    </div>
    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Subtasks (${subtasks.length})</span>
        <button class="btn btn-sm btn-ghost" id="add-subtask-btn">+ Add</button>
      </div>
      <div id="subtask-list"></div>
    </div>
    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Pomodoros · ${pomDone}/${pomPlanned}</span>
        <button class="btn btn-sm btn-ghost" id="log-pom-btn">+ Log Pomodoro</button>
      </div>
      <div class="pomodoro-track">${pomDots}</div>
    </div>
    <div class="subtask-section" style="margin-top:20px">
      <div class="subtask-section-title"><span>Notes (${(task.notes||[]).length})</span>
        <button class="btn btn-sm btn-ghost" id="add-note-to-task-btn">+ Add</button>
      </div>
      <div>${notesHtml}</div>
    </div>
    <div class="subtask-section" style="margin-top:20px">
      <div class="subtask-section-title"><span>Resources (${(task.resources||[]).length})</span></div>
      <div>${resourcesHtml}</div>
    </div>
    <div class="subtask-section" style="margin-top:20px" id="props-section">
      <div class="subtask-section-title">
        <span>Properties</span>
        <button class="btn btn-sm btn-ghost" id="add-prop-btn">+ Add</button>
      </div>
      <div id="props-list"></div>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost btn-sm" id="task-export-btn">Export JSON</button>
    </div>
  `;

  openSlideover(task.title, body);

  // Render interactive subtask table now that DOM is present
  renderSubtaskTable();

  // ── patchTask + handleStatusChange ───────────────────────────────────
  async function patchTask(data) {
    try { await api('PATCH', `/api/tasks/${taskId}`, data); } catch(e) { return; }
    const v = currentView;
    if (v === 'tasks') renderTasks();
    else if (v === 'dashboard') renderDashboard();
    else if (v === 'project-detail' && currentParams) renderProjectDetail(currentParams);
    else if (v === 'goal-detail' && currentParams) renderGoalDetail(currentParams);
    else if (v === 'sprint-detail' && currentParams) renderSprintDetail(currentParams);
    showTaskSlideover(taskId);
  }

  async function handleStatusChange(newStatus) {
    await patchTask({ status: newStatus });
    if (newStatus === 'done' && task.recur_interval && task.recur_interval > 0) {
      const interval = task.recur_interval;
      const unit = (task.recur_unit || 'days').toLowerCase();
      let nextDue = null;
      if (task.due_date) {
        const d = new Date(stripDate(task.due_date) + 'T00:00:00');
        if (unit.startsWith('day')) d.setDate(d.getDate() + interval);
        else if (unit.startsWith('week')) d.setDate(d.getDate() + interval * 7);
        else if (unit.startsWith('month')) d.setMonth(d.getMonth() + interval);
        else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + interval);
        nextDue = d.toISOString().split('T')[0];
      }
      const clone = {
        title: task.title, description: task.description,
        status: 'todo', priority: task.priority,
        due_date: nextDue, focus_block: null,
        goal_id: task.goal_id, project_id: task.project_id, sprint_id: task.sprint_id,
        parent_task_id: task.parent_task_id,
        category_id: task.category_id, story_points: task.story_points,
        pomodoros_planned: task.pomodoros_planned, pomodoros_finished: 0,
        recur_interval: interval, recur_unit: unit,
      };
      try { await api('POST', '/api/tasks', clone); } catch(e) {}
    }
  }

  // ── Auto-resize title textarea ────────────────────────────────────────
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto';
  titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => {
    titleTA.style.height = 'auto';
    titleTA.style.height = titleTA.scrollHeight + 'px';
  });
  titleTA.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (e) => patchTask({ title: e.target.value });

  // ── Task icon add button (above title) ────────────────────────────────
  const taskIconAddBtn = document.getElementById('task-icon-add-btn');
  const taskIconDisplay = document.getElementById('task-icon-display');
  const taskIconAddLabel = document.getElementById('task-icon-add-label');
  loadEntityIcon('task', taskId).then(icon => {
    if (icon) {
      taskIconDisplay.innerHTML = renderEntityIcon(icon, 32);
      taskIconDisplay.dataset.icon = icon;
      taskIconAddLabel.textContent = '';
    }
  });
  taskIconAddBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = taskIconDisplay.dataset.icon || '';
    showIconPicker(taskIconAddBtn, 'task', taskId, cur, (newIcon) => {
      taskIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      taskIconDisplay.dataset.icon = newIcon;
      taskIconAddLabel.textContent = newIcon ? '' : 'Add icon';
      saveEntityIcon('task', taskId, newIcon).catch(() => {
        taskIconDisplay.innerHTML = cur ? renderEntityIcon(cur, 32) : '';
        taskIconDisplay.dataset.icon = cur;
        taskIconAddLabel.textContent = cur ? '' : 'Add icon';
      });
    });
  };


  // openCombo(anchorEl, items, currentVal, onSelect, opts)
  // items: [{ value, label, color? }]
  // opts: { allowCreate, multiSelect, selectedIds }
  let _comboEl = null;
  function closeCombo() {
    if (_comboEl) { _comboEl.remove(); _comboEl = null; }
    document.removeEventListener('mousedown', _comboOutside);
  }
  function _comboOutside(e) {
    if (_comboEl && !_comboEl.contains(e.target)) closeCombo();
  }

  function openCombo(anchorEl, items, currentVal, onSelect, opts = {}) {
    closeCombo();
    const { allowCreate = false, multiSelect = false, selectedIds = [] } = opts;
    let filter = '';
    let focusIdx = -1;
    let localSelected = new Set(selectedIds.map(String));

    _comboEl = document.createElement('div');
    _comboEl.className = 'combo-popover';

    function render() {
      const filtered = filter
        ? items.filter(i => i.label.toLowerCase().includes(filter.toLowerCase()))
        : items;
      const showCreate = allowCreate && filter.trim() && !filtered.some(i => i.label.toLowerCase() === filter.trim().toLowerCase());

      // Selected chips row (multi-select only)
      const selectedChips = multiSelect && localSelected.size > 0
        ? `<div class="combo-selected-row">${[...localSelected].map(v => {
            const it = items.find(x => String(x.value) === v);
            if (!it) return '';
            const colorDot = it.color ? `<span style="width:6px;height:6px;border-radius:50%;background:${COLOR_HEX[it.color]||it.color};display:inline-block;flex-shrink:0;margin-right:3px"></span>` : '';
            return `<span class="combo-sel-chip" data-remove="${v.replace(/"/g,'&quot;')}">${colorDot}${it.label}<span class="combo-sel-chip-x">×</span></span>`;
          }).join('')}</div>`
        : '';

      _comboEl.innerHTML = `
        ${selectedChips}
        <div class="combo-search-wrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="combo-search" placeholder="Search…" value="${filter.replace(/"/g,'&quot;')}" />
        </div>
        <div class="combo-list">
          ${filtered.length ? filtered.map((it, i) => {
            const isSel = multiSelect ? localSelected.has(String(it.value)) : String(it.value) === String(currentVal);
            const colorDot = it.color ? `<span style="width:8px;height:8px;border-radius:50%;background:${COLOR_HEX[it.color]||it.color};display:inline-block;flex-shrink:0"></span>` : '';
            return `<div class="combo-item${isSel?' selected':''}${i===focusIdx?' focused':''}" data-val="${String(it.value).replace(/"/g,'&quot;')}" data-label="${it.label.replace(/"/g,'&quot;')}">${colorDot}${it.label}${isSel && multiSelect ? '<span class="combo-item-check">✓</span>' : ''}</div>`;
          }).join('') : '<div class="combo-empty">No results</div>'}
          ${showCreate ? `<div class="combo-item create-new" data-create="${filter.trim().replace(/"/g,'&quot;')}">+ Create "${filter.trim()}"</div>` : ''}
        </div>`;

      const inp = _comboEl.querySelector('.combo-search');
      inp.focus();
      // Set cursor at end
      inp.setSelectionRange(inp.value.length, inp.value.length);

      inp.oninput = (e) => { filter = e.target.value; focusIdx = -1; render(); };
      inp.onkeydown = (e) => {
        const comboItems = _comboEl.querySelectorAll('.combo-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx + 1, comboItems.length - 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx - 1, 0); render(); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusIdx >= 0 && comboItems[focusIdx]) {
            comboItems[focusIdx].click();
          } else if (allowCreate && filter.trim()) {
            // Enter with no focused item → create if no exact match
            const exact = items.find(i => i.label.toLowerCase() === filter.trim().toLowerCase());
            if (!exact) {
              onSelect({ create: filter.trim() });
              closeCombo();
            } else {
              onSelect({ value: String(exact.value), label: exact.label });
              closeCombo();
            }
          }
        }
        else if (e.key === 'Escape') closeCombo();
      };

      _comboEl.querySelectorAll('.combo-sel-chip').forEach(chip => {
        chip.onclick = (e) => {
          e.stopPropagation();
          const v = chip.dataset.remove;
          localSelected.delete(v);
          onSelect({ multiIds: [...localSelected] });
          render();
        };
      });

      _comboEl.querySelectorAll('.combo-item').forEach(el => {
        el.onclick = async (e) => {
          e.stopPropagation();
          if (el.dataset.create) {
            // Create new tag/category
            await onSelect({ create: el.dataset.create });
            closeCombo();
          } else {
            if (multiSelect) {
              const v = el.dataset.val;
              if (localSelected.has(v)) localSelected.delete(v);
              else localSelected.add(v);
              onSelect({ multiIds: [...localSelected] });
              render();
            } else {
              onSelect({ value: el.dataset.val, label: el.dataset.label });
              closeCombo();
            }
          }
        };
      });
    }

    render();

    // Position below anchor
    const rect = anchorEl.getBoundingClientRect();
    _comboEl.style.top = (rect.bottom + 4) + 'px';
    _comboEl.style.left = rect.left + 'px';
    document.body.appendChild(_comboEl);

    // Adjust if off-screen right
    requestAnimationFrame(() => {
      if (!_comboEl) return;
      const cr = _comboEl.getBoundingClientRect();
      if (cr.right > window.innerWidth - 8) {
        _comboEl.style.left = (window.innerWidth - cr.width - 8) + 'px';
      }
    });

    setTimeout(() => document.addEventListener('mousedown', _comboOutside), 0);
  }

  // ── Editable value combo (status / priority chips) ─────────────────────
  // Allows searching, renaming existing values, and creating new ones.
  // Persists to localStorage under `storageKey`.
  function openEditableValueCombo(anchorEl, valuesArray, storageKey, currentVal, onSelect) {
    closeCombo();
    let filter = '';
    let editingVal = null; // value currently being renamed
    let editInputVal = '';
    let colorPickerVal = null; // value whose color picker is open

    // Preset colors for the inline color picker
    const COLOR_PRESETS = ['#e07070','#fb923c','#d4a84b','#6dcc8a','#378ADD','#a78bfa','#f472b6','#22d3ee','#94a3b8'];

    _comboEl = document.createElement('div');
    _comboEl.className = 'combo-popover';
    _comboEl.style.minWidth = '220px';

    function saveValues() {
      localStorage.setItem(storageKey, JSON.stringify(valuesArray));
      // valuesArray IS the live TASK_STATUSES / TASK_PRIORITIES array (same reference),
      // so mutations to it (push, splice) are already reflected — no need to sync.
    }

    function renderEditable() {
      const filtered = filter
        ? valuesArray.filter(v => v.toLowerCase().includes(filter.toLowerCase()))
        : valuesArray;
      const showCreate = filter.trim() && !valuesArray.some(v => v.toLowerCase() === filter.trim().toLowerCase());

      const items = filtered.map((v, i) => {
        const isSel = v === currentVal;
        const color = getValueColor(storageKey, v);
        const dot = `<span class="combo-color-dot" data-colorpicker="${v}" title="Set color" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color||'var(--border)'};border:1px solid ${color||'var(--border)'};cursor:pointer;flex-shrink:0;margin-right:2px"></span>`;
        if (editingVal === v) {
          return `<div class="combo-item combo-item-editing" data-val="${v}">
            ${dot}
            <input class="combo-edit-input" value="${editInputVal || v}" data-editing="${v}" style="flex:1;font-size:12px;padding:2px 4px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-surface);color:var(--text-primary)" />
            <button class="combo-edit-save" data-editing="${v}" style="font-size:11px;padding:2px 6px;margin-left:4px;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer">✓</button>
            <button class="combo-edit-cancel" style="font-size:11px;padding:2px 6px;margin-left:2px;background:transparent;border:none;cursor:pointer;color:var(--text-muted)">✕</button>
          </div>`;
        }
        const colorPickerHtml = colorPickerVal === v ? `<div class="combo-color-picker" data-for="${v}" style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;border-top:1px solid var(--border)">
          ${COLOR_PRESETS.map(c => `<span class="combo-color-swatch${color===c?' active':''}" data-color="${c}" data-for-val="${v}" style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${c};cursor:pointer;border:2px solid ${color===c?'var(--text-primary)':'transparent'}"></span>`).join('')}
          <span class="combo-color-swatch combo-color-clear" data-color="" data-for-val="${v}" title="Clear color" style="display:inline-block;width:16px;height:16px;border-radius:3px;background:var(--border);cursor:pointer;border:2px solid transparent;font-size:9px;line-height:16px;text-align:center;color:var(--text-muted)">✕</span>
        </div>` : '';
        return `<div class="combo-item editable-val-item${isSel?' selected':''}" data-val="${v}" style="display:flex;align-items:center;gap:4px;justify-content:space-between;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            ${dot}
            <span style="color:${color||'inherit'}">${v.replace(/_/g,' ')}</span>
          </div>
          <button class="combo-rename-btn" data-rename="${v}" title="Rename" style="opacity:0.4;background:none;border:none;cursor:pointer;font-size:11px;padding:0 4px;color:var(--text-muted)">✎</button>
          ${colorPickerHtml}
        </div>`;
      }).join('');

      _comboEl.innerHTML = `
        <div class="combo-search-wrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="combo-search" placeholder="Search or add…" value="${filter.replace(/"/g,'&quot;')}" />
        </div>
        <div class="combo-list">
          ${items || '<div class="combo-empty">No results</div>'}
          ${showCreate ? `<div class="combo-item create-new" data-create="${filter.trim().replace(/"/g,'&quot;')}">+ Add "${filter.trim()}"</div>` : ''}
        </div>`;

      const inp = _comboEl.querySelector('.combo-search');
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);

      inp.oninput = (e) => { filter = e.target.value; editingVal = null; renderEditable(); };
      inp.onkeydown = (e) => {
        if (e.key === 'Enter' && filter.trim()) {
          const exact = valuesArray.find(v => v.toLowerCase() === filter.trim().toLowerCase());
          if (exact) {
            onSelect(exact);
            closeCombo();
          } else {
            const newVal = filter.trim().replace(/\s+/g,'_');
            valuesArray.push(newVal);
            saveValues();
            onSelect(newVal);
            closeCombo();
          }
        } else if (e.key === 'Escape') closeCombo();
      };

      // Select value
      _comboEl.querySelectorAll('.editable-val-item[data-val]').forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.combo-rename-btn')) return;
          if (e.target.closest('.combo-color-dot') || e.target.closest('.combo-color-picker')) return;
          onSelect(el.dataset.val);
          closeCombo();
        };
      });

      // Rename button
      _comboEl.querySelectorAll('.combo-rename-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          editingVal = btn.dataset.rename;
          editInputVal = editingVal;
          renderEditable();
        };
      });

      // Save rename
      _comboEl.querySelectorAll('.combo-edit-save').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const oldVal = btn.dataset.editing;
          const inputEl = _comboEl.querySelector(`.combo-edit-input[data-editing="${oldVal}"]`);
          const newVal = (inputEl ? inputEl.value.trim() : oldVal).replace(/\s+/g,'_');
          if (newVal && newVal !== oldVal) {
            const idx = valuesArray.indexOf(oldVal);
            if (idx >= 0) valuesArray[idx] = newVal;
            saveValues();
            // If current task had old value, update
            if (currentVal === oldVal) { onSelect(newVal); closeCombo(); return; }
          }
          editingVal = null;
          renderEditable();
        };
      });

      // Cancel rename
      _comboEl.querySelectorAll('.combo-edit-cancel').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); editingVal = null; renderEditable(); };
      });

      // Edit input keydown
      _comboEl.querySelectorAll('.combo-edit-input').forEach(inp2 => {
        inp2.oninput = (e) => { editInputVal = e.target.value; };
        inp2.onkeydown = (e) => {
          if (e.key === 'Enter') { e.preventDefault(); _comboEl.querySelector('.combo-edit-save').click(); }
          else if (e.key === 'Escape') { e.stopPropagation(); editingVal = null; renderEditable(); }
        };
      });

      // Create new
      const createEl = _comboEl.querySelector('.create-new[data-create]');
      if (createEl) {
        createEl.onclick = () => {
          const newVal = createEl.dataset.create.replace(/\s+/g,'_');
          if (!valuesArray.includes(newVal)) { valuesArray.push(newVal); saveValues(); }
          onSelect(newVal);
          closeCombo();
        };
      }

      // Color dot toggle — open/close inline color picker
      _comboEl.querySelectorAll('.combo-color-dot[data-colorpicker]').forEach(dot => {
        dot.onclick = (e) => {
          e.stopPropagation();
          const val = dot.dataset.colorpicker;
          colorPickerVal = colorPickerVal === val ? null : val;
          renderEditable();
        };
      });

      // Color swatch select
      _comboEl.querySelectorAll('.combo-color-swatch[data-for-val]').forEach(swatch => {
        swatch.onclick = (e) => {
          e.stopPropagation();
          const val = swatch.dataset.forVal;
          const color = swatch.dataset.color;
          setValueColor(storageKey, val, color || null);
          colorPickerVal = null;
          renderEditable();
        };
      });
    }

    renderEditable();

    const rect = anchorEl.getBoundingClientRect();
    _comboEl.style.top = (rect.bottom + 4) + 'px';
    _comboEl.style.left = rect.left + 'px';
    document.body.appendChild(_comboEl);

    requestAnimationFrame(() => {
      if (!_comboEl) return;
      const cr = _comboEl.getBoundingClientRect();
      if (cr.right > window.innerWidth - 8) _comboEl.style.left = (window.innerWidth - cr.width - 8) + 'px';
    });

    setTimeout(() => document.addEventListener('mousedown', _comboOutside), 0);
  }

  // ── Date range picker ─────────────────────────────────────────────────
  let _dpEl = null;
  function closeDatePicker() {
    if (_dpEl) { _dpEl.remove(); _dpEl = null; }
    document.removeEventListener('mousedown', _dpOutside);
  }
  function _dpOutside(e) {
    if (_dpEl && !_dpEl.contains(e.target)) closeDatePicker();
  }

  function openDateRangePicker(anchorEl, startVal, endVal, onChange) {
    closeDatePicker();
    const today = new Date(); today.setHours(0,0,0,0);
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let rangeStart = startVal ? new Date(startVal + 'T00:00:00') : null;
    let rangeEnd = endVal ? new Date(endVal + 'T00:00:00') : null;
    let pickingEnd = !!rangeStart; // if start exists, next click sets end

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    function toISO(d) { return d ? d.toISOString().split('T')[0] : null; }

    _dpEl = document.createElement('div');
    _dpEl.className = 'datepicker-popover';

    function renderPicker() {
      const firstDay = new Date(viewYear, viewMonth, 1);
      let startDow = firstDay.getDay(); // 0=Sun
      startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      let dayGrid = '';
      let dayNum = 1 - startDow;
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++, dayNum++) {
          if (dayNum < 1 || dayNum > daysInMonth) {
            dayGrid += `<div class="dp-day other-month"></div>`;
          } else {
            const d = new Date(viewYear, viewMonth, dayNum); d.setHours(0,0,0,0);
            const iso = toISO(d);
            let cls = 'dp-day';
            if (d.getTime() === today.getTime()) cls += ' today';
            if (rangeStart && rangeEnd) {
              if (d.getTime() === rangeStart.getTime()) cls += ' range-start';
              else if (d.getTime() === rangeEnd.getTime()) cls += ' range-end';
              else if (d > rangeStart && d < rangeEnd) cls += ' in-range';
            } else if (rangeStart && d.getTime() === rangeStart.getTime()) {
              cls += ' selected';
            }
            dayGrid += `<div class="${cls}" data-iso="${iso}">${dayNum}</div>`;
          }
        }
      }

      const rangeLabel = rangeStart && rangeEnd
        ? `${rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} → ${rangeEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
        : rangeStart
        ? `${rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} → pick end`
        : 'Pick start date';

      _dpEl.innerHTML = `
        <div class="dp-header">
          <button class="dp-nav-btn" id="dp-prev">‹</button>
          <span class="dp-month-label">${MONTHS[viewMonth]} ${viewYear}</span>
          <button class="dp-nav-btn" id="dp-next">›</button>
        </div>
        <div class="dp-grid">
          ${DAYS.map(d => `<div class="dp-day-head">${d}</div>`).join('')}
          ${dayGrid}
        </div>
        <div class="dp-footer">
          <span class="dp-footer-hint">${rangeLabel}</span>
          <button class="dp-clear-btn" id="dp-clear">Clear</button>
        </div>`;

      _dpEl.querySelector('#dp-prev').onclick = () => {
        viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderPicker();
      };
      _dpEl.querySelector('#dp-next').onclick = () => {
        viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderPicker();
      };
      _dpEl.querySelector('#dp-clear').onclick = () => {
        rangeStart = null; rangeEnd = null; pickingEnd = false;
        onChange(null, null);
        renderPicker();
      };

      _dpEl.querySelectorAll('.dp-day[data-iso]').forEach(el => {
        el.onclick = () => {
          const clicked = new Date(el.dataset.iso + 'T00:00:00');
          if (!rangeStart || (!pickingEnd && rangeEnd)) {
            // Start fresh
            rangeStart = clicked; rangeEnd = null; pickingEnd = true;
          } else if (pickingEnd) {
            if (clicked < rangeStart) { rangeEnd = rangeStart; rangeStart = clicked; }
            else { rangeEnd = clicked; }
            pickingEnd = false;
            onChange(toISO(rangeStart), toISO(rangeEnd));
          }
          renderPicker();
        };
      });
    }

    renderPicker();

    // Position
    const rect = anchorEl.getBoundingClientRect();
    _dpEl.style.top = (rect.bottom + 4) + 'px';
    _dpEl.style.left = rect.left + 'px';
    document.body.appendChild(_dpEl);

    requestAnimationFrame(() => {
      if (!_dpEl) return;
      const cr = _dpEl.getBoundingClientRect();
      if (cr.right > window.innerWidth - 8) _dpEl.style.left = (window.innerWidth - cr.width - 8) + 'px';
      if (cr.bottom > window.innerHeight - 8) _dpEl.style.top = (rect.top - cr.height - 4) + 'px';
    });

    setTimeout(() => document.addEventListener('mousedown', _dpOutside), 0);
  }

  // ── Chip click handlers ───────────────────────────────────────────────
  function applyChipValueColor(chipEl, storageKey, value) {
    if (!chipEl) return;
    const valSpan = chipEl.querySelector('.chip-value');
    if (!valSpan) return;
    const c = getValueColor(storageKey, value);
    if (c) {
      valSpan.style.cssText = `background:${c}22;color:${c};border-radius:3px;padding:1px 5px;font-weight:600`;
    } else {
      valSpan.style.cssText = '';
    }
  }

  document.getElementById('chip-status').onclick = (e) => {
    e.stopPropagation();
    openEditableValueCombo(e.currentTarget, TASK_STATUSES, 'taskStatuses', task.status, async (value) => {
      const chipEl = document.getElementById('chip-status');
      if (chipEl) {
        chipEl.className = `prop-chip chip-status-${value}`;
        chipEl.querySelector('.chip-value').textContent = value.replace(/_/g,' ');
        applyChipValueColor(chipEl, 'taskStatuses', value);
      }
      await handleStatusChange(value);
    });
  };

  document.getElementById('chip-priority').onclick = (e) => {
    e.stopPropagation();
    openEditableValueCombo(e.currentTarget, TASK_PRIORITIES, 'taskPriorities', task.priority, async (value) => {
      const chipEl = document.getElementById('chip-priority');
      if (chipEl) {
        chipEl.className = `prop-chip chip-priority-${value}`;
        chipEl.querySelector('.chip-value').textContent = value.replace(/_/g,' ');
        applyChipValueColor(chipEl, 'taskPriorities', value);
      }
      await patchTask({ priority: value });
    });
  };

  document.getElementById('chip-due').onclick = (e) => {
    e.stopPropagation();
    openDateRangePicker(
      e.currentTarget,
      stripDate(task.start_date),
      stripDate(task.due_date),
      async (start, end) => {
        // Optimistic UI
        const chipVal = document.getElementById('chip-due-val');
        if (chipVal) chipVal.textContent = fmtDateRange(start, end) || '—';
        await patchTask({ start_date: start || null, due_date: end || start || null });
      }
    );
  };

  document.getElementById('chip-focus').onclick = (e) => {
    e.stopPropagation();
    openDateRangePicker(
      e.currentTarget,
      stripDate(task.focus_block_start),
      stripDate(task.focus_block),
      async (start, end) => {
        const chipVal = document.getElementById('chip-focus-val');
        if (chipVal) chipVal.textContent = fmtDateRange(start, end) || '—';
        const chipEl = document.getElementById('chip-focus');
        if (chipEl) chipEl.classList.toggle('chip-empty', !end && !start);
        await patchTask({ focus_block_start: start || null, focus_block: end || start || null });
      }
    );
  };

  document.getElementById('chip-tags').onclick = (e) => {
    e.stopPropagation();
    const items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const curIds = tags.map(t => t.id);
    openCombo(e.currentTarget, items, null, async ({ multiIds, create }) => {
      if (create) {
        // Create tag then re-open
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          const updIds = [...new Set([...curIds, newTag.id])];
          await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: updIds });
        } catch(err) {}
        closeCombo();
        showTaskSlideover(taskId);
        return;
      }
      const ids = (multiIds || []).map(Number);
      const chipVal = document.getElementById('chip-tags-val');
      if (chipVal) {
        const sel = allTags.filter(t => ids.includes(t.id));
        chipVal.innerHTML = sel.length ? sel.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      }
      await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: ids });
    }, { multiSelect: true, allowCreate: true, selectedIds: curIds });
  };

  // ── ··· More properties panel ─────────────────────────────────────────
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();

    const pIco = (path) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

    const panelBody = `<div class="prop-panel" id="all-props-panel">
      <div class="prop-panel-row">
        <div class="prop-panel-label">${pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>')} Category</div>
        <div class="prop-panel-value" id="pp-category">${catName || '—'}</div>
      </div>
      <div class="prop-panel-row">
        <div class="prop-panel-label">${pIco('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')} Focus Block</div>
        <div class="prop-panel-value" id="pp-focus">${fmtDateRange(task.focus_block_start, task.focus_block) || '—'}</div>
      </div>
      <div class="prop-panel-row">
        <div class="prop-panel-label">${pIco('<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>')} Story Points</div>
        <div class="prop-panel-value" id="pp-points">${task.story_points != null ? task.story_points : '—'}</div>
      </div>
      <div class="prop-panel-row">
        <div class="prop-panel-label">${pIco('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>')} Goal</div>
        <div class="prop-panel-value" id="pp-goal">${goalName || '—'}</div>
      </div>
      <div class="prop-panel-row">
        <div class="prop-panel-label">${pIco('<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>')} Project</div>
        <div class="prop-panel-value" id="pp-project">${projName || '—'}</div>
      </div>
    </div>`;

    openFormSlideover('All Properties', panelBody);

    // Bind click-to-edit on each prop-panel-value
    document.getElementById('pp-category').onclick = (ev) => {
      const cats = (allCategories||TASK_CATEGORIES.map((n,i)=>({id:i+1,name:n}))).map(c => ({ value: c.id, label: c.name }));
      openCombo(ev.currentTarget, cats, task.category_id, async ({ value, label, create }) => {
        if (create) {
          try {
            const nc = await api('POST', '/api/categories', { name: create });
            await patchTask({ category_id: nc.id });
          } catch(err) {}
        } else {
          document.getElementById('pp-category').textContent = label;
          await patchTask({ category_id: value ? parseInt(value) : null });
        }
      }, { allowCreate: true });
    };

    document.getElementById('pp-focus').onclick = (ev) => {
      openDateRangePicker(ev.currentTarget, null, stripDate(task.focus_block), async (start, end) => {
        const val = end || start;
        document.getElementById('pp-focus').textContent = val ? new Date(val+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
        await patchTask({ focus_block: val || null });
      });
    };

    document.getElementById('pp-points').onclick = (ev) => {
      const el = ev.currentTarget;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.style.cssText = 'width:80px;border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:13px;background:var(--bg-card);color:var(--text)';
      inp.value = task.story_points || '';
      el.innerHTML = '';
      el.appendChild(inp);
      inp.focus();
      inp.onblur = async () => {
        const v = parseInt(inp.value) || 0;
        el.textContent = v || '—';
        await patchTask({ story_points: v });
      };
      inp.onkeydown = (ke) => { if (ke.key === 'Enter') inp.blur(); };
    };

    document.getElementById('pp-goal').onclick = (ev) => {
      const items = [{ value: '', label: '— none —' }, ...allGoals.map(g => ({ value: g.id, label: g.title }))];
      openCombo(ev.currentTarget, items, task.goal_id, async ({ value, label }) => {
        document.getElementById('pp-goal').textContent = value ? label : '—';
        await patchTask({ goal_id: value ? parseInt(value) : null });
      });
    };

    document.getElementById('pp-project').onclick = (ev) => {
      const items = [{ value: '', label: '— none —' }, ...allProjects.map(p => ({ value: p.id, label: p.title }))];
      openCombo(ev.currentTarget, items, task.project_id, async ({ value, label }) => {
        document.getElementById('pp-project').textContent = value ? label : '—';
        await patchTask({ project_id: value ? parseInt(value) : null });
      });
    };
  };

  // ── Other existing bindings ──────────────────────────────────────────
  document.getElementById('detail-desc').onblur = (e) => patchTask({ description: e.target.value });

  document.getElementById('add-subtask-btn').onclick = () => {
    showNewTaskModal({ parent_task_id: parseInt(taskId), status: 'todo', priority: 'medium' }, async () => {
      allTasksCache = await api('GET', '/api/tasks?all=1');
      allTasksFull = allTasksCache;
      renderSubtaskTable();
    });
  };

  document.getElementById('log-pom-btn').onclick = async () => {
    await patchTask({ pomodoros_finished: pomDone + 1 });
    showTaskSlideover(taskId);
  };

  document.getElementById('add-note-to-task-btn').onclick = () => {
    closeSlideover();
    showNoteModal({ task_id: parseInt(taskId) });
  };

  document.getElementById('task-export-btn').onclick = async () => {
    const data = await api('GET', `/api/export/task/${taskId}`);
    downloadJSON(data, `task-${task.title.replace(/\s+/g,'-')}.json`);
  };

  // Properties widget
  bindPropertiesWidget('task', taskId, 'props-list', 'add-prop-btn');

  // Breadcrumb navigation
  document.querySelectorAll('.bc-goal').forEach(el => {
    el.onclick = () => { closeSlideover(); renderView('goal-detail', el.dataset.goalId); };
  });
  document.querySelectorAll('.bc-proj').forEach(el => {
    el.onclick = () => { closeSlideover(); renderView('project-detail', el.dataset.projId); };
  });
  document.querySelectorAll('[data-parent-id]').forEach(el => {
    el.onclick = () => showTaskSlideover(el.dataset.parentId);
  });
  // Ancestor task crumbs (built by walk-up breadcrumb)
  document.querySelectorAll('.detail-bc-prefix .bc-part[data-task-id]').forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); showTaskSlideover(el.dataset.taskId); };
  });
}

/* ─── Calendar Builder ───────────────────────────────────────────────── */
function buildCalendar(tasks, year, month, showNav) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  // Start grid on Monday
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0
  const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
    `<div class="cal-day-header">${d}</div>`).join('');

  // Build day cells
  let cells = '';
  let dayNum = 1 - startDow;
  const today = new Date(); today.setHours(0,0,0,0);

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++, dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const isCurrentMonth = cellDate.getMonth() === month;
      const isToday = cellDate.getTime() === today.getTime();
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(cellDate.getDate()).padStart(2,'0')}`;
      const dayTasks = tasks.filter(t => stripDate(t.due_date) === dateStr || stripDate(t.focus_block) === dateStr);
      const taskChips = dayTasks.slice(0,4).map(t => {
        const prioColors = { urgent:'var(--danger)', high:'var(--danger)', medium:'var(--warning)', low:'var(--text-muted)' };
        const color = prioColors[t.priority] || 'var(--text-muted)';
        return `<div class="cal-task-chip" data-task-id="${t.id}" style="border-left:2px solid ${color}" title="${t.title}">${t.title}</div>`;
      }).join('');
      cells += `<div class="calendar-day ${isCurrentMonth?'':'other-month'} ${isToday?'today':''}">
        <div class="cal-day-num">${cellDate.getDate()}</div>
        <div class="cal-tasks">${taskChips}</div>
      </div>`;
    }
    if (dayNum > lastDay.getDate() + 1) break;
  }

  const nav = showNav ? `<div class="cal-nav">
    <button class="btn btn-sm btn-ghost" id="cal-prev">‹ Prev</button>
    <span style="font-family:'DM Mono',monospace;font-size:14px">${monthNames[month]} ${year}</span>
    <button class="btn btn-sm btn-ghost" id="cal-next">Next ›</button>
  </div>` : `<div style="font-family:'DM Mono',monospace;font-size:13px;margin-bottom:12px;color:var(--text-muted)">${monthNames[month]} ${year}</div>`;

  return `${nav}<div class="calendar-grid">${dayHeaders}${cells}</div>`;
}

/* ─── Calendar View (sidebar nav) ───────────────────────────────────── */
async function renderCalendarView() {
  let tasks = [], goals = [], projects = [], sprints = [];
  try {
    [tasks, goals, projects, sprints] = await Promise.all([
      api('GET', '/api/tasks?all=1'),
      api('GET', '/api/goals'),
      api('GET', '/api/projects'),
      api('GET', '/api/sprints'),
    ]);
    allTasksCache = tasks;
  } catch(e) {}

  // Build sprint date ranges for background shading
  const sprintRanges = sprints
    .filter(s => s.status === 'active' && s.start_date && s.end_date)
    .map(s => ({ title: s.title, start: stripDate(s.start_date), end: stripDate(s.end_date) }));

  // Build unified event list. Tasks with start_date become ranged events.
  const events = [];
  tasks.forEach(t => {
    const sd = t.start_date ? stripDate(t.start_date) : null;
    const dd = t.due_date ? stripDate(t.due_date) : null;
    if (sd && dd && sd !== dd) {
      events.push({ id: t.id, type: 'task', title: t.title, start: sd, end: dd, ranged: true, priority: t.priority, status: t.status, category_id: t.category_id });
    } else if (dd) {
      events.push({ id: t.id, type: 'task', title: t.title, date: dd, ranged: false, priority: t.priority, status: t.status, category_id: t.category_id });
    } else if (sd) {
      events.push({ id: t.id, type: 'task', title: t.title, date: sd, ranged: false, priority: t.priority, status: t.status, category_id: t.category_id });
    }
  });
  goals.forEach(g => {
    const sd = g.start_date ? stripDate(g.start_date) : null;
    const dd = g.due_date   ? stripDate(g.due_date)   : null;
    if (sd && dd && sd !== dd) {
      events.push({ id: g.id, type: 'goal', title: g.title, start: sd, end: dd, ranged: true });
    } else {
      if (dd) events.push({ id: g.id, type: 'goal', title: g.title, date: dd, ranged: false });
      else if (sd) events.push({ id: g.id, type: 'goal', title: g.title, date: sd, ranged: false });
    }
  });
  projects.forEach(p => {
    const sd = p.start_date ? stripDate(p.start_date) : null;
    const dd = p.due_date   ? stripDate(p.due_date)   : null;
    if (sd && dd && sd !== dd) {
      events.push({ id: p.id, type: 'project', title: p.title, start: sd, end: dd, ranged: true });
    } else {
      if (dd) events.push({ id: p.id, type: 'project', title: p.title, date: dd, ranged: false });
      else if (sd) events.push({ id: p.id, type: 'project', title: p.title, date: sd, ranged: false });
    }
  });
  sprints.forEach(s => {
    const sd = s.start_date ? stripDate(s.start_date) : null;
    const ed = s.end_date   ? stripDate(s.end_date)   : null;
    if (sd && ed && sd !== ed) {
      events.push({ id: s.id, type: 'sprint', title: s.title, start: sd, end: ed, ranged: true });
    } else {
      if (sd) events.push({ id: s.id, type: 'sprint', title: s.title + ' (start)', date: sd, ranged: false });
      if (ed) events.push({ id: s.id, type: 'sprint', title: s.title + ' (end)',   date: ed, ranged: false });
    }
  });

  const typeColors = {
    task:    'var(--color-accent)',
    goal:    'var(--color-success)',
    project: 'var(--color-warning)',
    sprint:  '#9b7fe8',
  };

  // Returns events that appear on a given dateStr (ranged or single-day)
  function eventsOnDate(dateStr) {
    return events.filter(ev => {
      if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
      if (ev.ranged) return dateStr >= ev.start && dateStr <= ev.end;
      return ev.date === dateStr;
    });
  }

  function chipColor(ev) {
    // 1. Category color (tasks with a category)
    if (ev.category_id) {
      const cat = allCategories.find(c => c.id === ev.category_id);
      if (cat) return COLOR_HEX[cat.color] || cat.color || typeColors[ev.type] || 'var(--color-accent)';
    }
    // 2. Type color (goal, project, sprint, uncategorised task)
    return typeColors[ev.type] || 'var(--color-accent)';
  }

  function dateAdd(d, days) {
    const r = new Date(d); r.setDate(r.getDate() + days); return r;
  }
  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function buildMonthCal() {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth+1, 0);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const todayD = new Date(); todayD.setHours(0,0,0,0);

    // Build week rows, each has 7 dates
    const weeks = [];
    let dayNum = 1 - startDow;
    for (let row = 0; row < 6; row++) {
      const week = [];
      for (let col = 0; col < 7; col++, dayNum++) {
        week.push(new Date(calYear, calMonth, dayNum));
      }
      weeks.push(week);
      if (dayNum > lastDay.getDate() + 1) break;
    }

    // For multi-day events, figure out which "lanes" (vertical slots) they occupy per week row
    // so bars don't overlap. Returns [{ev, startCol, endCol, lane}] per week row.
    function rangedBarsForWeek(weekDates) {
      const wStart = dateStr(weekDates[0]);
      const wEnd   = dateStr(weekDates[6]);
      // Only truly ranged events (start_date != due_date)
      const rangedEvs = events.filter(ev => {
        if (!ev.ranged) return false;
        if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
        return ev.end >= wStart && ev.start <= wEnd;
      });
      // Assign lanes greedily
      const lanes = []; // lanes[i] = end date of last bar in lane i
      return rangedEvs.map(ev => {
        const clampedStart = ev.start < wStart ? wStart : ev.start;
        const clampedEnd   = ev.end   > wEnd   ? wEnd   : ev.end;
        const startCol = weekDates.findIndex(d => dateStr(d) === clampedStart);
        const endCol   = weekDates.findIndex(d => dateStr(d) === clampedEnd);
        let lane = lanes.findIndex(laneEnd => laneEnd < clampedStart);
        if (lane === -1) { lane = lanes.length; lanes.push(clampedEnd); }
        else { lanes[lane] = clampedEnd; }
        return { ev, startCol, endCol, lane };
      });
    }

    const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d =>
      `<div class="cal-day-header">${d}</div>`).join('');

    const weekRows = weeks.map(weekDates => {
      const bars = rangedBarsForWeek(weekDates);
      const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), -1);
      const numLanes = maxLane + 1;

      // Bar sub-grid (in-flow, no position:absolute)
      const barEls = bars.map(({ ev, startCol, endCol, lane }) => {
        const color = chipColor(ev);
        const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
        const isStart = ev.start >= dateStr(weekDates[0]);
        const isEnd   = ev.end   <= dateStr(weekDates[6]);
        const blr = isStart ? '3px' : '0';
        const brr = isEnd   ? '3px' : '0';
        return `<div class="cal-span-bar" ${taskId} title="${ev.title}"
          style="grid-column:${startCol+1}/${endCol+2};grid-row:${lane+1};background:${color};border-radius:${blr} ${brr} ${brr} ${blr};">
          <span class="cal-span-bar-label">${ev.title}</span>
        </div>`;
      }).join('');
      const barsSection = numLanes > 0
        ? `<div class="cal-week-bars" style="grid-template-rows:repeat(${numLanes},20px)">${barEls}</div>`
        : '';

      // Day number strip + chips cells
      const dayNums = weekDates.map((cellDate) => {
        const isTodayCell = cellDate.getTime() === todayD.getTime();
        const isCurrentMonth = cellDate.getMonth() === calMonth;
        return `<div class="cal-day-num-cell ${isTodayCell?'today':''} ${isCurrentMonth?'':'other-month'}">${cellDate.getDate()}</div>`;
      }).join('');

      const chipsCells = weekDates.map((cellDate) => {
        const ds = dateStr(cellDate);
        const isCurrentMonth = cellDate.getMonth() === calMonth;
        const isTodayCell = cellDate.getTime() === todayD.getTime();
        const isInSprint = sprintRanges.some(r => ds >= r.start && ds <= r.end);
        const sprintStyle = isInSprint ? 'background:var(--accent-glow);' : '';
        const dayEvents = events.filter(ev => {
          if (ev.ranged) return false;
          if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
          return ev.date === ds;
        });
        const CHIP_LIMIT = 2;
        const visibleEvents = dayEvents.slice(0, CHIP_LIMIT);
        const overflow = dayEvents.length - CHIP_LIMIT;
        const chips = visibleEvents.map(ev => {
          const color = chipColor(ev);
          const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
          return `<div class="cal-task-chip" ${taskId} style="border-left:2px solid ${color}" title="${ev.title}">${ev.title}</div>`;
        }).join('');
        const overflowChip = overflow > 0 ? `<div class="cal-overflow-btn" data-date="${ds}">+${overflow}</div>` : '';
        return `<div class="calendar-day ${isCurrentMonth?'':'other-month'} ${isTodayCell?'today':''}" style="${sprintStyle}" data-date="${ds}">
          <div class="cal-tasks">${chips}${overflowChip}</div>
        </div>`;
      }).join('');

      return `<div class="cal-week-row">
        <div class="cal-week-num-strip">${dayNums}</div>
        ${barsSection}
        <div class="cal-week-cells">${chipsCells}</div>
      </div>`;
    }).join('');

    return `<div class="calendar-month-wrap">
      <div class="cal-day-headers-row">${dayHeaders}</div>
      ${weekRows}
    </div>`;
  }

  function buildScopedCal(numDays) {
    // Week/3-day/day views: show numDays columns starting from calAnchorDate
    const start = new Date(calAnchorDate); start.setHours(0,0,0,0);
    const todayD = new Date(); todayD.setHours(0,0,0,0);
    const days = [];
    for (let i = 0; i < numDays; i++) days.push(dateAdd(start, i));
    const wStart = dateStr(days[0]);
    const wEnd   = dateStr(days[days.length - 1]);

    const headers = days.map(d => {
      const isT = d.getTime() === todayD.getTime();
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return `<div class="cal-day-header ${isT?'today':''}" style="${isT?'color:var(--accent);font-weight:600':''}">
        ${dayNames[d.getDay()]} ${d.getDate()}
      </div>`;
    }).join('');

    // Compute spanning bars for this window
    const rangedEvs = events.filter(ev => {
      if (!ev.ranged) return false;
      if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
      return ev.end >= wStart && ev.start <= wEnd;
    });
    const lanes = [];
    const bars = rangedEvs.map(ev => {
      const clampedStart = ev.start < wStart ? wStart : ev.start;
      const clampedEnd   = ev.end   > wEnd   ? wEnd   : ev.end;
      const startCol = days.findIndex(d => dateStr(d) === clampedStart);
      const endCol   = days.findIndex(d => dateStr(d) === clampedEnd);
      let lane = lanes.findIndex(laneEnd => laneEnd < clampedStart);
      if (lane === -1) { lane = lanes.length; lanes.push(clampedEnd); }
      else { lanes[lane] = clampedEnd; }
      return { ev, startCol, endCol, lane };
    });
    const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), -1);
    const numLanes = maxLane + 1;

    const cells = days.map((d, col) => {
      const ds = dateStr(d);
      const isT = d.getTime() === todayD.getTime();
      const isInSprint = sprintRanges.some(r => ds >= r.start && ds <= r.end);
      const sprintStyle = isInSprint ? 'background:var(--accent-glow);' : '';
      const dayEvents = events.filter(ev => {
        if (ev.ranged) return false;
        if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
        return ev.date === ds;
      });
      const chips = dayEvents.map(ev => {
        const color = chipColor(ev);
        const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
        return `<div class="cal-task-chip" ${taskId} style="border-left:2px solid ${color}" title="${ev.title}">${ev.title}</div>`;
      }).join('');
      return `<div class="calendar-day ${isT?'today':''}" style="${sprintStyle}min-height:100px" data-date="${ds}">
        <div class="cal-tasks">${chips||'<div style="color:var(--text-muted);font-size:11px">—</div>'}</div>
      </div>`;
    }).join('');

    const barEls = bars.map(({ ev, startCol, endCol, lane }) => {
      const color = chipColor(ev);
      const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
      const isStart = ev.start >= wStart;
      const isEnd   = ev.end   <= wEnd;
      const blr = isStart ? '3px' : '0';
      const brr = isEnd   ? '3px' : '0';
      return `<div class="cal-span-bar" ${taskId} title="${ev.title}"
        style="grid-column:${startCol+1}/${endCol+2};grid-row:${lane+1};background:${color};border-radius:${blr} ${brr} ${brr} ${blr};">
        <span class="cal-span-bar-label">${ev.title}</span>
      </div>`;
    }).join('');

    const gridCols = `grid-template-columns:repeat(${numDays},1fr)`;
    const barsSection = numLanes > 0
      ? `<div class="cal-week-bars" style="${gridCols};grid-template-rows:repeat(${numLanes},20px)">${barEls}</div>`
      : '';
    return `<div class="cal-day-headers-row" style="${gridCols}">${headers}</div>${barsSection}<div class="cal-week-row"><div class="cal-week-cells" style="${gridCols}">${cells}</div></div>`;
  }

  // Gantt / timeline view for ranged tasks
  function buildGantt() {
    // Show current month as the timeline window
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth+1, 0);
    const totalDays = lastDay.getDate();

    // Collect only ranged tasks + single-day tasks with due dates in this month
    const rangedEvs = events.filter(ev => {
      if (ev.type !== 'task') return false;
      if (ev.ranged) {
        return ev.end >= dateStr(firstDay) && ev.start <= dateStr(lastDay);
      }
      return ev.date >= dateStr(firstDay) && ev.date <= dateStr(lastDay);
    });

    if (!rangedEvs.length) {
      return `<div style="color:var(--text-muted);font-size:13px;padding:24px 0">No tasks with dates in ${monthNames[calMonth]} ${calYear}. Add start/due dates to tasks to see them here.</div>`;
    }

    // Day header row
    const dayNums = [];
    for (let i = 1; i <= totalDays; i++) dayNums.push(i);
    const dayHeaderRow = dayNums.map(d => {
      const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const todayStr = dateStr(new Date());
      const isT = ds === todayStr;
      return `<div class="gantt-day-hdr ${isT?'gantt-today-col':''}">${d}</div>`;
    }).join('');

    const rows = rangedEvs.map(ev => {
      const color = chipColor(ev);
      const startDs = ev.ranged ? ev.start : ev.date;
      const endDs = ev.ranged ? ev.end : ev.date;
      const clampedStart = startDs < dateStr(firstDay) ? dateStr(firstDay) : startDs;
      const clampedEnd = endDs > dateStr(lastDay) ? dateStr(lastDay) : endDs;

      const startDay = parseInt(clampedStart.split('-')[2], 10);
      const endDay = parseInt(clampedEnd.split('-')[2], 10);
      const spanDays = endDay - startDay + 1;
      const leftPct = ((startDay - 1) / totalDays) * 100;
      const widthPct = (spanDays / totalDays) * 100;

      const taskAttr = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
      return `<div class="gantt-row">
        <div class="gantt-label" title="${ev.title}">${ev.title}</div>
        <div class="gantt-track">
          ${dayNums.map(d => {
            const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const todayStr = dateStr(new Date());
            return `<div class="gantt-cell ${ds === todayStr ? 'gantt-today-col' : ''}"></div>`;
          }).join('')}
          <div class="gantt-bar cal-event-${ev.type === 'task' ? 'task' : 'other'}" ${taskAttr}
            style="left:${leftPct}%;width:${widthPct}%;background:${color};border-radius:3px;opacity:0.85"
            title="${ev.title}: ${startDs} → ${endDs}">
            <span class="gantt-bar-label">${ev.title}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="gantt-wrap">
      <div class="gantt-header-row">
        <div class="gantt-label"></div>
        <div class="gantt-track gantt-day-headers">${dayHeaderRow}</div>
      </div>
      ${rows}
    </div>`;
  }

  function buildTimeline() {
    const DAYS_BEFORE = 30, DAYS_AFTER = 60, PX = 38, LABEL_W = 180;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const today = new Date(); today.setHours(0,0,0,0);
    const winStart = dateAdd(today, -DAYS_BEFORE);
    const total = DAYS_BEFORE + DAYS_AFTER + 1;
    const totalWidth = total * PX;
    const todayX = DAYS_BEFORE * PX;

    const dayList = Array.from({length: total}, (_, i) => dateAdd(winStart, i));

    // Month header groups
    const monthGroups = []; let curKey = null;
    dayList.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== curKey) {
        monthGroups.push({ label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, startI: i, count: 1 });
        curKey = key;
      } else {
        monthGroups[monthGroups.length - 1].count++;
      }
    });
    const monthHdr = monthGroups.map(g =>
      `<div style="position:absolute;left:${g.startI*PX}px;width:${g.count*PX}px;font-size:11px;font-weight:600;color:var(--text-muted);border-right:1px solid var(--border-light);padding:2px 4px;white-space:nowrap;overflow:hidden">${g.label}</div>`
    ).join('');
    const dayHdr = dayList.map((d, i) => {
      const isT = d.getTime() === today.getTime();
      const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
      return `<div style="position:absolute;left:${i*PX}px;width:${PX}px;text-align:center;font-size:10px;color:${isT?'var(--danger)':'var(--text-muted)'};font-weight:${isT?700:400};line-height:1.3">${d.getDate()}<br><span style="font-size:9px">${dayNames[d.getDay()]}</span></div>`;
    }).join('');

    const allEvs = events.filter(ev => calEventTypes.includes(ev.type.split('-')[0]));
    if (!allEvs.length) {
      return `<div style="color:var(--text-muted);padding:32px;font-size:13px">No events with dates. Add start/due dates to tasks, goals, projects, or sprints.</div>`;
    }

    return `<div class="tl-wrap">
      <div class="tl-header-row">
        <div style="min-width:${LABEL_W}px;flex-shrink:0;border-right:1px solid var(--border-light)"></div>
        <div class="tl-hdr-scroll">
          <div style="width:${totalWidth}px;height:22px;position:relative;border-bottom:1px solid var(--border-light)">${monthHdr}</div>
          <div style="width:${totalWidth}px;height:32px;position:relative;border-bottom:2px solid var(--border)">
            ${dayHdr}
            <div class="tl-today-dot" style="left:${todayX + PX/2}px"></div>
          </div>
        </div>
      </div>
      <div class="tl-body-wrap">
        <div class="tl-labels-col">${allEvs.map(ev => `<div class="tl-label" title="${ev.title}">${ev.title}</div>`).join('')}</div>
        <div class="tl-tracks-scroll">
          ${allEvs.map(ev => {
            const sd = ev.ranged ? ev.start : ev.date;
            const ed = ev.ranged ? ev.end : ev.date;
            const startDayOff = Math.round((new Date(sd + 'T00:00:00').getTime() - winStart.getTime()) / 86400000);
            const endDayOff   = Math.round((new Date(ed + 'T00:00:00').getTime() - winStart.getTime()) / 86400000);
            const x = Math.max(0, startDayOff * PX);
            const rawW = (endDayOff - startDayOff + 1) * PX;
            const w = Math.min(rawW, totalWidth - x);
            const color = chipColor(ev);
            const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
            return `<div class="tl-track-row" style="width:${totalWidth}px">
              <div class="tl-today-line" style="left:${todayX + PX/2}px"></div>
              ${w > 0 ? `<div class="tl-bar" ${taskId} style="left:${x}px;width:${w}px;background:${color}" title="${ev.title}: ${sd}${ev.ranged?' → '+ed:''}">${ev.title}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  function buildNav() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let label = '';
    const scopes = [
      { id:'month', label:'Month' }, { id:'week', label:'Week' },
      { id:'3day', label:'3 Days' }, { id:'day', label:'Day' }, { id:'gantt', label:'Gantt' }, { id:'timeline', label:'Timeline' }
    ];
    const scopeBtns = scopes.map(s =>
      `<button class="btn btn-sm ${calScope===s.id?'btn-primary':'btn-ghost'} cal-scope-btn" data-scope="${s.id}">${s.label}</button>`
    ).join('');

    if (calScope === 'month' || calScope === 'gantt') {
      label = `${monthNames[calMonth]} ${calYear}`;
    } else if (calScope === 'timeline') {
      label = 'Today ±90 days';
    } else {
      const numDays = calScope === 'week' ? 7 : calScope === '3day' ? 3 : 1;
      const endD = dateAdd(calAnchorDate, numDays - 1);
      label = `${calAnchorDate.getDate()} ${monthNames[calAnchorDate.getMonth()]} – ${endD.getDate()} ${monthNames[endD.getMonth()]} ${endD.getFullYear()}`;
    }
    const hidePrevNext = calScope === 'timeline';
    return `<div class="cal-nav">
      <button class="btn btn-sm btn-ghost" id="cal-prev" ${hidePrevNext ? 'style="visibility:hidden"' : ''}>‹ Prev</button>
      <span style="font-family:'DM Mono',monospace;font-size:14px;min-width:200px;text-align:center">${label}</span>
      <button class="btn btn-sm btn-ghost" id="cal-next" ${hidePrevNext ? 'style="visibility:hidden"' : ''}>Next ›</button>
      <div style="display:flex;gap:4px;margin-left:16px">${scopeBtns}</div>
    </div>`;
  }

  function buildContent() {
    if (calScope === 'month') return buildMonthCal();
    if (calScope === 'week') return buildScopedCal(7);
    if (calScope === '3day') return buildScopedCal(3);
    if (calScope === 'day') return buildScopedCal(1);
    if (calScope === 'gantt') return buildGantt();
    if (calScope === 'timeline') return buildTimeline();
    return buildMonthCal();
  }

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">Calendar</h1>
      <div class="col-picker-wrap" style="position:relative">
        <button class="btn btn-sm btn-ghost" id="cal-filter-btn" title="Filter event types">⊟ Filter</button>
        <div class="col-picker-dropdown hidden" id="cal-filter-dropdown">
          ${CAL_EVENT_TYPES.map(t => `<label class="col-picker-item"><input type="checkbox" class="cal-type-check" data-type="${t}" ${calEventTypes.includes(t)?'checked':''}> ${t}s</label>`).join('')}
        </div>
      </div>
    </div>
    <div class="cal-legend" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;font-size:12px">
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:50%;margin-right:4px"></span>Tasks</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:50%;margin-right:4px"></span>Goals</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--warning);border-radius:50%;margin-right:4px"></span>Projects</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:#9b7fe8;border-radius:50%;margin-right:4px"></span>Sprints</span>
    </div>
    <div id="cal-content">${buildNav()}${buildContent()}</div>
  </div>`;

  // Calendar filter picker
  const calFilterBtn = document.getElementById('cal-filter-btn');
  const calFilterDrop = document.getElementById('cal-filter-dropdown');
  calFilterBtn.onclick = (e) => { e.stopPropagation(); calFilterDrop.classList.toggle('hidden'); };
  document.querySelectorAll('.cal-type-check').forEach(chk => {
    chk.onchange = () => {
      calEventTypes = [...document.querySelectorAll('.cal-type-check:checked')].map(c => c.dataset.type);
      if (!calEventTypes.length) calEventTypes = ['task'];
      localStorage.setItem('calEventTypes', JSON.stringify(calEventTypes));
      document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
      rebind();
    };
  });

  function rebind() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      if (calScope === 'timeline') return;
      if (calScope === 'month' || calScope === 'gantt') {
        calMonth--; if (calMonth<0){calMonth=11;calYear--;}
      } else {
        const step = calScope==='week'?-7:calScope==='3day'?-3:-1;
        calAnchorDate = dateAdd(calAnchorDate, step);
      }
      document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
      rebind();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      if (calScope === 'timeline') return;
      if (calScope === 'month' || calScope === 'gantt') {
        calMonth++; if (calMonth>11){calMonth=0;calYear++;}
      } else {
        const step = calScope==='week'?7:calScope==='3day'?3:1;
        calAnchorDate = dateAdd(calAnchorDate, step);
      }
      document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
      rebind();
    });
    document.querySelectorAll('.cal-scope-btn').forEach(btn => {
      btn.onclick = () => {
        calScope = btn.dataset.scope;
        localStorage.setItem('calScope', calScope);
        // Sync anchor date for scoped views
        if (calScope === 'week') {
          // align to Monday of current week
          const d = new Date(); const dow = d.getDay(); const diff = dow === 0 ? -6 : 1 - dow;
          calAnchorDate = dateAdd(d, diff);
        } else if (calScope !== 'month' && calScope !== 'gantt' && calScope !== 'timeline') {
          calAnchorDate = new Date();
        }
        document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
        rebind();
      };
    });
    document.querySelectorAll('.cal-task-chip[data-task-id]').forEach(chip => {
      chip.onclick = (e) => { e.stopPropagation(); showTaskSlideover(chip.dataset.taskId); };
    });
    document.querySelectorAll('.cal-span-bar[data-task-id]').forEach(bar => {
      bar.onclick = (e) => { e.stopPropagation(); showTaskSlideover(bar.dataset.taskId); };
    });
    document.querySelectorAll('.gantt-bar.cal-event-task').forEach(bar => {
      bar.onclick = (e) => { e.stopPropagation(); showTaskSlideover(bar.dataset.taskId); };
    });
    document.querySelectorAll('.tl-bar[data-task-id]').forEach(bar => {
      bar.onclick = (e) => { e.stopPropagation(); showTaskSlideover(bar.dataset.taskId); };
    });
    // Timeline scroll sync: keep header and tracks in horizontal lock-step (one pair per wrapper)
    document.querySelectorAll('.tl-wrap').forEach(wrap => {
      const hdrScroll = wrap.querySelector('.tl-hdr-scroll');
      const trkScroll = wrap.querySelector('.tl-tracks-scroll');
      if (!hdrScroll || !trkScroll) return;
      let syncLock = false;
      hdrScroll.addEventListener('scroll', () => {
        if (syncLock) return;
        syncLock = true;
        trkScroll.scrollLeft = hdrScroll.scrollLeft;
        syncLock = false;
      });
      trkScroll.addEventListener('scroll', () => {
        if (syncLock) return;
        syncLock = true;
        hdrScroll.scrollLeft = trkScroll.scrollLeft;
        syncLock = false;
      });
    });
    // Overflow "show more" — expand cell inline
    document.querySelectorAll('.cal-overflow-btn').forEach(btn => {
      if (btn.classList.contains('cal-collapse-btn')) return;
      btn.onclick = (e) => {
        e.stopPropagation();
        const ds = btn.dataset.date;
        const dayEvents = events.filter(ev => {
          if (ev.ranged) return false;
          if (!calEventTypes.includes(ev.type.split('-')[0])) return false;
          return ev.date === ds;
        });
        const cell = btn.closest('.calendar-day');
        const tasksContainer = cell.querySelector('.cal-tasks');
        tasksContainer.innerHTML = dayEvents.map(ev => {
          const color = chipColor(ev);
          const taskId = ev.type === 'task' ? `data-task-id="${ev.id}"` : '';
          return `<div class="cal-task-chip" ${taskId} style="border-left:2px solid ${color}" title="${ev.title}">${ev.title}</div>`;
        }).join('') + `<div class="cal-overflow-btn cal-collapse-btn">▲ less</div>`;
        cell.querySelector('.cal-collapse-btn').onclick = (e2) => {
          e2.stopPropagation();
          document.getElementById('cal-content').innerHTML = buildNav() + buildContent();
          rebind();
        };
        cell.querySelectorAll('.cal-task-chip[data-task-id]').forEach(chip => {
          chip.onclick = (e2) => { e2.stopPropagation(); showTaskSlideover(chip.dataset.taskId); };
        });
      };
    });
  }
  rebind();
}


/* ─── Pomodoro Stats Table Helper ────────────────────────────────────── */
function renderPomStatsTable(tasks) {
  if (!tasks.length) {
    return `<div class="pom-stats-empty">No tasks with pomodoro data yet. Set "Pomodoros Planned" on a task to start tracking.</div>`;
  }

  function effectiveness(planned, finished) {
    if (!planned || !finished) return { label: '—', cls: 'todo' };
    const ratio = finished / planned;
    if (ratio === 1) return { label: 'Effective', cls: 'done' };
    if (ratio < 1) return { label: 'Super Effective', cls: 'progress' };
    return { label: 'Not Very Effective', cls: 'blocked' };
  }

  function progressBar(done, planned) {
    if (!planned) return `<span style="color:var(--color-text-tertiary)">—</span>`;
    const pct = Math.min(100, Math.round((done / planned) * 100));
    const color = pct >= 100 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-accent)' : 'var(--color-warning)';
    return `<div class="pom-progress-bar"><div class="pom-progress-fill" style="width:${pct}%;background:${color}"></div></div><span class="pom-progress-pct">${pct}%</span>`;
  }

  const rows = tasks.map(t => {
    const planned = t.pomodoros_planned || 0;
    const finished = t.pomodoros_finished || 0;
    const remaining = Math.max(0, planned - finished);
    const eff = effectiveness(planned, finished);
    return `<tr>
      <td class="pom-st-task">
        <span class="pom-st-task-title">${t.title || 'Untitled'}</span>
        ${statusBadge(t.status)}
      </td>
      <td class="pom-td-num">${planned || '—'}</td>
      <td class="pom-td-num">${finished || '—'}</td>
      <td class="pom-td-num">${planned ? remaining : '—'}</td>
      <td class="pom-td-progress">${progressBar(finished, planned)}</td>
      <td class="pom-td-num">${finished || '—'}</td>
      <td><span class="badge badge-${eff.cls}" title="${planned ? `Planned ${planned}, completed ${finished}` : ''}">${eff.label}</span></td>
    </tr>`;
  }).join('');

  return `<table class="pom-stats-table">
    <thead>
      <tr>
        <th>Task</th>
        <th class="pom-td-num">Planned</th>
        <th class="pom-td-num">Completed</th>
        <th class="pom-td-num">Remaining</th>
        <th class="pom-td-progress">Progress</th>
        <th class="pom-td-num">Total Poms</th>
        <th>Velocity</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function renderPomodoro() {
  if (allTasksCache.length === 0) {
    try { allTasksCache = await api('GET', '/api/tasks') || []; } catch(e) {}
  }

  // Tasks that have pomodoro sessions planned

  // Focus block timeline helper — horizontal timeline like calendar Timeline view
  function renderFocusTimeline() {
    const DAYS_BEFORE = 7, DAYS_AFTER = 30, PX = 38, LABEL_W = 180;
    const today = new Date(); today.setHours(0,0,0,0);
    function dateAdd(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
    function dateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

    const focusTasks = allTasksCache.filter(t => t.focus_block && t.status !== 'done');
    if (!focusTasks.length) {
      return `<div class="pom-timeline-empty">No focus blocks scheduled. Open a task and set a Focus Block date in the properties panel to see it here.</div>`;
    }

    const winStart = dateAdd(today, -DAYS_BEFORE);
    const total = DAYS_BEFORE + DAYS_AFTER + 1;
    const totalWidth = total * PX;
    const todayX = DAYS_BEFORE * PX;
    const dayList = Array.from({length: total}, (_, i) => dateAdd(winStart, i));

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthGroups = []; let curKey = null;
    dayList.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== curKey) {
        monthGroups.push({ label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, startI: i, count: 1 });
        curKey = key;
      } else {
        monthGroups[monthGroups.length - 1].count++;
      }
    });
    const monthHdr = monthGroups.map(g =>
      `<div style="position:absolute;left:${g.startI*PX}px;width:${g.count*PX}px;font-size:11px;font-weight:600;color:var(--color-text-secondary);border-right:1px solid var(--color-border);padding:2px 4px;white-space:nowrap;overflow:hidden">${g.label}</div>`
    ).join('');
    const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const dayHdr = dayList.map((d, i) => {
      const isT = d.getTime() === today.getTime();
      return `<div style="position:absolute;left:${i*PX}px;width:${PX}px;text-align:center;font-size:10px;color:${isT?'var(--color-danger)':'var(--color-text-tertiary)'};font-weight:${isT?700:400};line-height:1.3">${d.getDate()}<br><span style="font-size:9px">${dayNames[d.getDay()]}</span></div>`;
    }).join('');

    const rows = focusTasks.map(t => {
      const endDs = stripDate(t.focus_block);
      const startDs = t.focus_block_start ? stripDate(t.focus_block_start) : endDs;
      const startDayOff = Math.round((new Date(startDs + 'T00:00:00').getTime() - winStart.getTime()) / 86400000);
      const endDayOff = Math.round((new Date(endDs + 'T00:00:00').getTime() - winStart.getTime()) / 86400000);
      const spanDays = Math.max(1, endDayOff - startDayOff + 1);
      const x = Math.max(0, startDayOff * PX);
      const w = Math.min(spanDays * PX, totalWidth - x);
      const statusColor = { todo:'var(--color-accent)', in_progress:'var(--color-success)', blocked:'var(--color-danger)' }[t.status] || 'var(--color-accent)';
      const barLabel = t.title.length > 14 ? t.title.slice(0, 12) + '…' : t.title;
      const rangeLabel = startDs !== endDs ? `${startDs} → ${endDs}` : endDs;
      return `<div class="tl-track-row pom-tl-track-row" style="width:${totalWidth}px" data-task-id="${t.id}" title="${t.title}">
        <div class="tl-today-line" style="left:${todayX + PX/2}px"></div>
        ${w > 0 ? `<div class="tl-bar" data-task-id="${t.id}" style="left:${x}px;width:${w}px;background:${statusColor};border-radius:3px" title="${t.title}: ${rangeLabel}">${barLabel}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="tl-wrap pom-tl-wrap">
      <div class="tl-header-row">
        <div style="min-width:${LABEL_W}px;flex-shrink:0;border-right:1px solid var(--color-border)"></div>
        <div class="tl-hdr-scroll">
          <div style="width:${totalWidth}px;height:22px;position:relative;border-bottom:1px solid var(--color-border)">${monthHdr}</div>
          <div style="width:${totalWidth}px;height:32px;position:relative;border-bottom:2px solid var(--color-border-strong)">
            ${dayHdr}
            <div class="tl-today-dot" style="left:${todayX + PX/2}px"></div>
          </div>
        </div>
      </div>
      <div class="tl-body-wrap">
        <div class="tl-labels-col" style="min-width:${LABEL_W}px">${focusTasks.map(t => `<div class="tl-label" title="${t.title}" data-task-id="${t.id}" style="cursor:pointer">${t.title}</div>`).join('')}</div>
        <div class="tl-tracks-scroll">${rows}</div>
      </div>
    </div>`;
  }
  const pomTasks = allTasksCache.filter(t => (t.pomodoros_planned || 0) > 0 || (t.pomodoros_finished || 0) > 0);

  document.getElementById('main-content').innerHTML = `<div class="view pom-view">
    <div class="view-header">
      <h1 class="view-title">Pomodoro</h1>
    </div>

    <div class="pom-layout">
      <!-- Left: task picker panel -->
      <div class="pom-picker">
        <div class="pom-picker-header">
          <span class="pom-picker-title">Tasks</span>
          <div class="pom-view-toggle">
            <button class="pom-toggle-btn active" id="pom-view-list" title="List view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button class="pom-toggle-btn" id="pom-view-table" title="Table view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
            </button>
          </div>
        </div>
        <div class="pom-picker-search">
          <input type="text" id="pom-picker-search-input" placeholder="Filter tasks…" autocomplete="off" />
        </div>
        <div class="pom-picker-body" id="pom-picker-body"></div>
      </div>

      <!-- Right: timer -->
      <div class="pom-timer-col">
        <div id="pom-selected-task" class="pomodoro-task-name" style="min-height:20px"></div>
        <div class="pomodoro-ring" id="pom-ring">
          <div class="pomodoro-time" id="pom-time">25:00</div>
          <div class="pomodoro-label" id="pom-label">Work</div>
        </div>
        <div class="pomodoro-controls">
          <button class="btn btn-primary" id="pom-start">Start</button>
          <button class="btn btn-ghost" id="pom-pause">Pause</button>
          <button class="btn btn-ghost" id="pom-reset">Reset</button>
          <button class="btn btn-ghost" id="pom-break">Break (5m)</button>
          <button class="btn btn-ghost" id="pom-complete" title="Complete current session early" style="color:var(--color-success,#6dcc8a)">✓ Complete</button>
        </div>
        <div id="pom-log" style="width:100%;max-width:400px;margin-top:8px"></div>
      </div>
    </div>

    <!-- Bottom: pomodoro stats table -->
    <div class="pom-stats-section">
      <div class="pom-stats-header">
        <span class="pom-stats-title">Session Tracker</span>
        <span class="pom-stats-subtitle">${pomTasks.length} task${pomTasks.length !== 1 ? 's' : ''} with pomodoro data</span>
      </div>
      <div id="pom-stats-table-wrap">
        ${renderPomStatsTable(pomTasks)}
      </div>
    </div>

    <!-- Focus block timeline -->
    <div class="pom-timeline-section">
      <div class="pom-stats-header">
        <span class="pom-stats-title">Focus Block Timeline</span>
        <span class="pom-stats-subtitle">Tasks scheduled for focus work</span>
      </div>
      <div id="pom-timeline" style="overflow:hidden">
        ${renderFocusTimeline()}
      </div>
    </div>
  </div>`;

  // ── Helpers ─────────────────────────────────────────────────────────
  function fmt(s) {
    const m = Math.floor(s/60), sec = s%60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function updateDisplay() {
    document.getElementById('pom-time').textContent = fmt(pomState.seconds);
    document.getElementById('pom-label').textContent = pomState.mode === 'work' ? 'Work' : 'Break';
    const ring = document.getElementById('pom-ring');
    ring.className = `pomodoro-ring${pomState.running ? (pomState.mode==='work'?' active':' break') : ''}`;
  }

  function renderLog() {
    const log = document.getElementById('pom-log');
    if (!log) return;
    if (!pomState.finished.length) { log.innerHTML = ''; return; }
    log.innerHTML = `<div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;font-weight:var(--weight-medium)">Completed today</div>` +
      pomState.finished.map(e => `<div style="font-size:var(--text-sm);color:var(--color-text-secondary);padding:4px 0;border-bottom:1px solid var(--color-border)">✓ ${e.task} · ${e.time}</div>`).join('');
  }

  // ── Task picker ──────────────────────────────────────────────────────
  let pickerView = 'list'; // 'list' | 'table'
  let pickerFilter = '';

  function getPickerTasks() {
    return allTasksCache.filter(t =>
      t.status !== 'done' &&
      (!pickerFilter || t.title.toLowerCase().includes(pickerFilter.toLowerCase()))
    );
  }

  function renderPickerList() {
    const tasks = getPickerTasks();
    if (!tasks.length) {
      return `<div class="pom-picker-empty">No open tasks</div>`;
    }
    if (pickerView === 'list') {
      return tasks.map(t => {
        const active = pomState.taskId === t.id;
        return `<div class="pom-picker-item${active ? ' selected' : ''}" data-id="${t.id}" data-title="${(t.title||'').replace(/"/g,'&quot;')}">
          <div class="pom-picker-item-check">
            ${active ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
          </div>
          <div class="pom-picker-item-text">
            <span class="pom-picker-item-title">${t.title || 'Untitled'}</span>
            ${t.priority ? `<span class="pom-picker-item-meta">${t.priority}</span>` : ''}
          </div>
          ${(t.pomodoros_planned||0) > 0 ? `<span class="pom-picker-item-badge">${t.pomodoros_finished||0}/${t.pomodoros_planned}</span>` : ''}
        </div>`;
      }).join('');
    } else {
      // Table view
      return `<table class="pom-picker-table">
        <thead><tr>
          <th>Task</th>
          <th>Planned</th>
          <th>Done</th>
          <th>Status</th>
        </tr></thead>
        <tbody>
          ${tasks.map(t => {
            const active = pomState.taskId === t.id;
            const planned = t.pomodoros_planned || 0;
            const done = t.pomodoros_finished || 0;
            return `<tr class="pom-picker-row${active ? ' selected' : ''}" data-id="${t.id}" data-title="${(t.title||'').replace(/"/g,'&quot;')}">
              <td>${t.title || 'Untitled'}</td>
              <td class="pom-td-num">${planned || '—'}</td>
              <td class="pom-td-num">${done || '—'}</td>
              <td>${statusBadge(t.status)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    }
  }

  function refreshPicker() {
    document.getElementById('pom-picker-body').innerHTML = renderPickerList();
    // Bind click on items
    document.querySelectorAll('.pom-picker-item, .pom-picker-row').forEach(el => {
      el.onclick = () => {
        pomState.taskId = parseInt(el.dataset.id);
        pomState.taskTitle = el.dataset.title;
        document.getElementById('pom-selected-task').innerHTML =
          `<span>Focus: </span><span>${pomState.taskTitle}</span>`;
        refreshPicker(); // re-render to update selected highlight
        // Refresh stats table
        const freshTasks = allTasksCache.filter(t => (t.pomodoros_planned||0)>0 || (t.pomodoros_finished||0)>0);
        document.getElementById('pom-stats-table-wrap').innerHTML = renderPomStatsTable(freshTasks);
      };
    });
  }

  // Picker filter input
  document.getElementById('pom-picker-search-input').oninput = (e) => {
    pickerFilter = e.target.value;
    refreshPicker();
  };

  // View toggle buttons
  document.getElementById('pom-view-list').onclick = () => {
    pickerView = 'list';
    document.getElementById('pom-view-list').classList.add('active');
    document.getElementById('pom-view-table').classList.remove('active');
    refreshPicker();
  };
  document.getElementById('pom-view-table').onclick = () => {
    pickerView = 'table';
    document.getElementById('pom-view-table').classList.add('active');
    document.getElementById('pom-view-list').classList.remove('active');
    refreshPicker();
  };

  // Initial render
  refreshPicker();

  // ── Timer ────────────────────────────────────────────────────────────
  function completeSession() {
    clearInterval(pomTimer); pomTimer = null; pomState.running = false;
    try {
      const ac = new AudioContext();
      const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
      osc.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.3);
    } catch(e) {}
    if (pomState.mode === 'work') {
      const now = new Date();
      pomState.finished.push({ task: pomState.taskTitle || '(no task)', time: now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
      renderLog();
      if (pomState.taskId) {
        const t = allTasksCache.find(x => x.id === pomState.taskId);
        const cur = t ? (t.pomodoros_finished || 0) : 0;
        api('PATCH', `/api/tasks/${pomState.taskId}`, { pomodoros_finished: cur + 1 }).catch(()=>{});
        if (t) t.pomodoros_finished = cur + 1;
        // Refresh stats table & picker
        const freshTasks = allTasksCache.filter(tt => (tt.pomodoros_planned||0)>0 || (tt.pomodoros_finished||0)>0);
        const wrap = document.getElementById('pom-stats-table-wrap');
        if (wrap) wrap.innerHTML = renderPomStatsTable(freshTasks);
        refreshPicker();
      }
      pomState.mode = 'break'; pomState.seconds = 5*60;
      updateDisplay();
    } else {
      pomState.mode = 'work'; pomState.seconds = 25*60;
      updateDisplay();
    }
  }

  function tick() {
    if (!pomState.running) return;
    pomState.seconds--;
    updateDisplay();
    if (pomState.seconds <= 0) completeSession();
  }

  document.getElementById('pom-start').onclick = () => {
    if (pomState.running) return;
    pomState.running = true;
    pomTimer = setInterval(tick, 1000);
    updateDisplay();
  };
  document.getElementById('pom-pause').onclick = () => {
    pomState.running = false;
    clearInterval(pomTimer); pomTimer = null;
    updateDisplay();
  };
  document.getElementById('pom-reset').onclick = () => {
    pomState.running = false;
    clearInterval(pomTimer); pomTimer = null;
    pomState.seconds = pomState.mode === 'work' ? 25*60 : 5*60;
    updateDisplay();
  };
  document.getElementById('pom-break').onclick = () => {
    pomState.running = false;
    clearInterval(pomTimer); pomTimer = null;
    pomState.mode = pomState.mode === 'work' ? 'break' : 'work';
    pomState.seconds = pomState.mode === 'work' ? 25*60 : 5*60;
    document.getElementById('pom-break').textContent = pomState.mode === 'work' ? 'Break (5m)' : 'Work (25m)';
    updateDisplay();
  };
  document.getElementById('pom-complete').onclick = () => {
    if (!pomState.running && pomState.mode !== 'work') return;
    completeSession();
  };

  if (pomState.taskId) {
    document.getElementById('pom-selected-task').innerHTML = `<span>Focus: </span><span>${pomState.taskTitle}</span>`;
  }
  updateDisplay();
  renderLog();

  // Focus block timeline — click label or bar to open task
  document.querySelectorAll('.pom-tl-wrap .tl-label[data-task-id], .pom-tl-wrap .tl-bar[data-task-id], .pom-tl-track-row').forEach(el => {
    el.onclick = () => { const id = el.dataset.taskId; if (id) showTaskSlideover(id); };
  });
  // Focus block timeline scroll sync
  const pomWrap = document.querySelector('.pom-tl-wrap');
  if (pomWrap) {
    const hdr = pomWrap.querySelector('.tl-hdr-scroll');
    const trk = pomWrap.querySelector('.tl-tracks-scroll');
    if (hdr && trk) {
      let lock = false;
      hdr.addEventListener('scroll', () => { if (lock) return; lock = true; trk.scrollLeft = hdr.scrollLeft; lock = false; });
      trk.addEventListener('scroll', () => { if (lock) return; lock = true; hdr.scrollLeft = trk.scrollLeft; lock = false; });
    }
  }
}

/* ─── Dashboard task list bindings ──────────────────────────────────── */
function bindTaskListEvents() {
  document.querySelectorAll('.task-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.classList.contains('task-check') || e.target.dataset.checkId ||
          e.target.classList.contains('task-toggle-arrow') || e.target.closest('.task-toggle-arrow') ||
          e.target.classList.contains('task-add-sub-btn') || e.target.closest('.task-add-sub-btn')) return;
      showTaskSlideover(row.dataset.taskId);
    };
  });
  document.querySelectorAll('.task-toggle-arrow').forEach(arrow => {
    arrow.onclick = (e) => {
      e.stopPropagation();
      const id = String(arrow.dataset.toggleId);
      if (expandedTasks.has(id)) expandedTasks.delete(id);
      else expandedTasks.add(id);
      renderDashboard();
    };
  });
  document.querySelectorAll('.task-add-sub-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.addSubId);
      const row = btn.closest('.task-row');
      if (!row) return;
      document.querySelectorAll('.task-quick-add-row').forEach(el => el.remove());
      btn.classList.add('expanded');
      const indentPx = parseInt(row.style.paddingLeft) || 12;
      const li = document.createElement('li');
      li.className = 'task-quick-add-row inline-subtask-input-row';
      li.style.cssText = `padding-left:${indentPx + 20}px;padding-top:6px;padding-bottom:6px`;
      li.innerHTML = `<button class="btn btn-sm btn-ghost add-subtask-inline-btn task-quick-add-trigger" data-parent-id="${parentId}" style="font-size:12px;color:var(--color-text-secondary)">+ Add Subtask</button>`;
      row.after(li);
      li.querySelector('.task-quick-add-trigger').onclick = async (ce) => {
        ce.stopPropagation();
        li.remove();
        btn.classList.remove('expanded');
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
          expandedTasks.add(String(parentId));
          renderDashboard();
        });
      };
      const outsideClick = (ev) => {
        if (!li.contains(ev.target) && ev.target !== btn) {
          li.remove();
          btn.classList.remove('expanded');
          document.removeEventListener('click', outsideClick, true);
        }
      };
      setTimeout(() => document.addEventListener('click', outsideClick, true), 0);
    };
  });
  document.querySelectorAll('.task-check').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      const id = el.dataset.checkId;
      const isDone = el.classList.contains('done');
      try { await api('PATCH', `/api/tasks/${id}`, { status: isDone ? 'todo' : 'done' }); } catch(err) {}
      renderDashboard();
    };
  });
}

/* ─── Shared detail-view task event binding ──────────────────────────── */
function bindDetailTaskEvents(onRefresh) {
  document.querySelectorAll('.task-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.classList.contains('task-check') || e.target.dataset.checkId ||
          e.target.classList.contains('task-toggle-arrow') || e.target.closest('.task-toggle-arrow') ||
          e.target.classList.contains('task-add-sub-btn') || e.target.closest('.task-add-sub-btn')) return;
      showTaskSlideover(row.dataset.taskId);
    };
  });
  document.querySelectorAll('.task-check').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      const id = el.dataset.checkId;
      const isDone = el.classList.contains('done');
      try { await api('PATCH', `/api/tasks/${id}`, { status: isDone ? 'todo' : 'done' }); } catch(err) {}
      if (onRefresh) onRefresh();
    };
  });
  document.querySelectorAll('.task-toggle-arrow').forEach(arrow => {
    arrow.onclick = (e) => {
      e.stopPropagation();
      const id = String(arrow.dataset.toggleId);
      if (expandedTasks.has(id)) expandedTasks.delete(id);
      else expandedTasks.add(id);
      if (onRefresh) onRefresh();
    };
  });
  document.querySelectorAll('.task-add-sub-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.addSubId);
      const row = btn.closest('.task-row');
      if (!row) return;
      document.querySelectorAll('.task-quick-add-row').forEach(el => el.remove());
      btn.classList.add('expanded');
      const indentPx = parseInt(row.style.paddingLeft) || 12;
      const li = document.createElement('li');
      li.className = 'task-quick-add-row inline-subtask-input-row';
      li.style.cssText = `padding-left:${indentPx + 20}px;padding-top:6px;padding-bottom:6px`;
      li.innerHTML = `<button class="btn btn-sm btn-ghost add-subtask-inline-btn task-quick-add-trigger" data-parent-id="${parentId}" style="font-size:12px;color:var(--color-text-secondary)">+ Add Subtask</button>`;
      row.after(li);
      li.querySelector('.task-quick-add-trigger').onclick = async (ce) => {
        ce.stopPropagation();
        li.remove();
        btn.classList.remove('expanded');
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
          allTasksCache = await api('GET', '/api/tasks?all=1');
          expandedTasks.add(String(parentId));
          if (onRefresh) onRefresh();
        });
      };
      const outsideClick = (ev) => {
        if (!li.contains(ev.target) && ev.target !== btn) {
          li.remove();
          btn.classList.remove('expanded');
          document.removeEventListener('click', outsideClick, true);
        }
      };
      setTimeout(() => document.addEventListener('click', outsideClick, true), 0);
    };
  });
  document.querySelectorAll('.add-subtask-inline-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.parentId);
      showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium' }, async () => {
        allTasksCache = await api('GET', '/api/tasks?all=1');
        if (onRefresh) onRefresh();
      });
    };
  });
}

/* ─── Task Modal helpers ─────────────────────────────────────────────── */
async function getTaskModalResources() {
  let projects = [], sprints = [], tasks = [], goals = [];
  try { [projects, sprints, tasks, goals] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/sprints'), api('GET', '/api/tasks?all=1'), api('GET', '/api/goals')
  ]); } catch(e) {}
  return { projects, sprints, tasks, goals };
}

function taskModalBody(task, resources) {
  const { projects, sprints, tasks, goals } = resources;
  const v = task || {};
  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id) === String(v.goal_id) ? 'selected' : ''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id) === String(v.project_id) ? 'selected' : ''}>${p.title}</option>`).join('');
  const sprintOpts = '<option value="">— none —</option>' + sprints.map(s =>
    `<option value="${s.id}" ${String(s.id) === String(v.sprint_id) ? 'selected' : ''}>${s.title}</option>`).join('');
  const parentOpts = '<option value="">— none —</option>' + tasks.filter(t => t.id !== v.id).map(t =>
    `<option value="${t.id}" ${String(t.id) === String(v.parent_task_id) ? 'selected' : ''}>${t.title}</option>`).join('');
  const statusOpts = TASK_STATUSES.map(s =>
    `<option value="${s}" ${v.status === s ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('');
  const prioOpts = TASK_PRIORITIES.map(p =>
    `<option value="${p}" ${v.priority === p ? 'selected' : ''}>${p}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  return `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="t-title" value="${(v.title||'').replace(/"/g,'&quot;')}" placeholder="Task title" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="t-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Status</label><select id="t-status">${statusOpts}</select></div>
      <div class="form-group"><label class="form-label">Priority</label><select id="t-priority">${prioOpts}</select></div>
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <div class="date-mode-toggle">
        <button type="button" class="date-mode-btn ${!v.start_date ? 'active' : ''}" data-date-mode="due">Due date</button>
        <button type="button" class="date-mode-btn ${v.start_date ? 'active' : ''}" data-date-mode="range">Date range</button>
      </div>
      <div id="t-date-due-wrap" style="${v.start_date ? 'display:none' : ''}">
        <input type="date" id="t-due" value="${stripDate(v.due_date)}" style="margin-top:6px" />
      </div>
      <div id="t-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        <input type="date" id="t-start" value="${stripDate(v.start_date)}" />
        <span class="date-range-arrow">→</span>
        <input type="date" id="t-due-range" value="${stripDate(v.due_date)}" />
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Focus Block</label><input type="date" id="t-focus" value="${stripDate(v.focus_block)}" /></div>
      <div></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="t-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Project</label><select id="t-project">${projOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Sprint</label><select id="t-sprint">${sprintOpts}</select></div>
      <div class="form-group"><label class="form-label">Parent Task</label><select id="t-parent">${parentOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="t-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label">Story Points</label><input type="number" id="t-points" value="${v.story_points||''}" min="0" /></div>
    </div>
    <div class="form-group"><label class="form-label">Pomodoros Planned</label><input type="number" id="t-poms" value="${v.pomodoros_planned||''}" min="0" /></div>
    <div class="form-group">
      <label class="form-label">Recurring</label>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="t-is-recurring" ${(v.recur_interval||0)>0?'checked':''} style="width:auto" /> Repeating task
        </label>
        <div id="recur-fields" style="display:${(v.recur_interval||0)>0?'flex':'none'};gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--text-muted)">Every</span>
          <input type="number" id="t-recur-interval" value="${v.recur_interval||1}" min="1" style="width:60px" />
          <select id="t-recur-unit">
            ${['days','weeks','months','years'].map(u => `<option value="${u}" ${(v.recur_unit||'').toLowerCase()===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;
}

function collectTaskForm() {
  const isRecurring = document.getElementById('t-is-recurring')?.checked;
  const isRange = document.getElementById('t-date-range-wrap')?.style.display !== 'none';
  return {
    title: document.getElementById('t-title').value.trim(),
    description: document.getElementById('t-desc').value,
    status: document.getElementById('t-status').value,
    priority: document.getElementById('t-priority').value,
    start_date: isRange ? (document.getElementById('t-start')?.value || null) : null,
    due_date: isRange ? (document.getElementById('t-due-range')?.value || null) : (document.getElementById('t-due')?.value || null),
    focus_block: document.getElementById('t-focus').value || null,
    goal_id: document.getElementById('t-goal').value ? parseInt(document.getElementById('t-goal').value) : null,
    project_id: document.getElementById('t-project').value ? parseInt(document.getElementById('t-project').value) : null,
    sprint_id: document.getElementById('t-sprint').value ? parseInt(document.getElementById('t-sprint').value) : null,
    parent_task_id: document.getElementById('t-parent').value ? parseInt(document.getElementById('t-parent').value) : null,
    category_id: document.getElementById('t-category').value ? parseInt(document.getElementById('t-category').value) : null,
    story_points: parseInt(document.getElementById('t-points').value) || 0,
    pomodoros_planned: parseInt(document.getElementById('t-poms').value) || 0,
    recur_interval: isRecurring ? (parseInt(document.getElementById('t-recur-interval')?.value) || 1) : 0,
    recur_unit: isRecurring ? (document.getElementById('t-recur-unit')?.value || 'days') : '',
  };
}

function bindDateModeToggle(dueWrapId, rangeWrapId) {
  document.querySelectorAll('.date-mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.date-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.dateMode;
      if (dueWrapId) document.getElementById(dueWrapId).style.display = mode === 'due' ? '' : 'none';
      if (rangeWrapId) document.getElementById(rangeWrapId).style.display = mode === 'range' ? '' : 'none';
    };
  });
}

async function showNewTaskModal(presets, afterSave) {
  const resources = await getTaskModalResources();
  const fake = { status: 'todo', priority: 'medium', ...presets };
  openFormSlideover('New Task', taskModalBody(fake, resources));
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  bindDateModeToggle('t-date-due-wrap', 't-date-range-wrap');
  document.getElementById('t-is-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recur-fields').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { alert('Title is required'); return; }
    await api('POST', '/api/tasks', data);
    closeFormSlideover();
    if (afterSave) afterSave(); else renderView(currentView);
  };
}

async function showEditTaskModal(task) {
  const resources = await getTaskModalResources();
  openFormSlideover('Edit Task', taskModalBody(task, resources));
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  bindDateModeToggle('t-date-due-wrap', 't-date-range-wrap');
  document.getElementById('t-is-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recur-fields').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { alert('Title is required'); return; }
    await api('PATCH', `/api/tasks/${task.id}`, data);
    closeFormSlideover();
    renderView(currentView);
  };
  document.getElementById('modal-delete-btn').onclick = async () => {
    if (!confirm('Delete this task?')) return;
    await api('DELETE', `/api/tasks/${task.id}`);
    closeFormSlideover();
    renderView(currentView);
  };
}

/* ─── Goal Modal ─────────────────────────────────────────────────────── */
async function showGoalModal(goal, afterSave) {
  const v = goal || {};
  const typeOpts = GOAL_TYPES.map(t => `<option value="${t}" ${v.type===t?'selected':''}>${t}</option>`).join('');
  const yearOpts = GOAL_YEARS.map(y => `<option value="${y}" ${v.year===y?'selected':''}>${y}</option>`).join('');
  const statusOpts = GOAL_STATUSES.map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  let existingTagIds = [];
  if (v.id) {
    try { existingTagIds = (await api('GET', `/api/goals/${v.id}/tags`) || []).map(t => t.id); } catch(e) {}
  }

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="g-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="g-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Type</label><select id="g-type">${typeOpts}</select></div>
      <div class="form-group"><label class="form-label">Year</label><select id="g-year">${yearOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Status</label><select id="g-status">${statusOpts}</select></div>
      <div class="form-group"><label class="form-label">Category</label><select id="g-category">${catOpts}</select></div>
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <div class="date-mode-toggle">
        <button type="button" class="date-mode-btn ${!v.start_date ? 'active' : ''}" data-date-mode="due">Due date</button>
        <button type="button" class="date-mode-btn ${v.start_date ? 'active' : ''}" data-date-mode="range">Date range</button>
      </div>
      <div id="g-date-due-wrap" style="${v.start_date ? 'display:none' : ''}">
        <input type="date" id="g-due" value="${stripDate(v.due_date)}" style="margin-top:6px" />
      </div>
      <div id="g-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        <input type="date" id="g-start" value="${stripDate(v.start_date)}" />
        <span class="date-range-arrow">→</span>
        <input type="date" id="g-due-range" value="${stripDate(v.due_date)}" />
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Value</label><input type="number" id="g-sv" value="${v.start_value||''}" /></div>
      <div class="form-group"><label class="form-label">Current Value</label><input type="number" id="g-cv" value="${v.current_value||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Target Value</label>
      <input type="number" id="g-target" value="${v.target||''}" /></div>
    <div class="form-group"><label class="form-label">Tags</label>
      ${tagPickerHtml(existingTagIds)}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Goal' : 'New Goal', body);
  bindTagPicker();
  bindDateModeToggle('g-date-due-wrap', 'g-date-range-wrap');
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('modal-save-btn').onclick = async () => {
    const isRange = document.getElementById('g-date-range-wrap')?.style.display !== 'none';
    const data = {
      title: document.getElementById('g-title').value.trim(),
      description: document.getElementById('g-desc').value,
      type: document.getElementById('g-type').value,
      year: document.getElementById('g-year').value,
      status: document.getElementById('g-status').value,
      category_id: document.getElementById('g-category').value ? parseInt(document.getElementById('g-category').value) : null,
      start_date: isRange ? (document.getElementById('g-start')?.value || null) : null,
      due_date: isRange ? (document.getElementById('g-due-range')?.value || null) : (document.getElementById('g-due')?.value || null),
      start_value: parseFloat(document.getElementById('g-sv').value) || 0,
      current_value: parseFloat(document.getElementById('g-cv').value) || 0,
      target: parseFloat(document.getElementById('g-target').value) || 0,
    };
    if (!data.title) { alert('Title is required'); return; }
    let savedId = v.id;
    if (v.id) await api('PATCH', `/api/goals/${v.id}`, data);
    else { const r = await api('POST', '/api/goals', data); savedId = r?.id; }
    if (savedId) {
      const tagIds = getSelectedTagIds();
      try { await api('PUT', `/api/goals/${savedId}/tags`, { tag_ids: tagIds }); } catch(e) {}
    }
    closeFormSlideover();
    if (afterSave) afterSave();
    else renderGoals();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this goal?')) return;
      await api('DELETE', `/api/goals/${v.id}`);
      closeFormSlideover();
      renderGoals();
    };
  }
}

/* ─── Project Slideover (auto-save, expand to detail) ───────────────── */
async function showProjectSlideover(project, goals, afterSave) {
  if (!project?.id) { showProjectModal(project, goals, afterSave); return; }
  const v = project;
  const goalOpts = '<option value="">— none —</option>' + (goals||[]).map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const statusOpts = PROJECT_STATUSES.map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const macroOpts = '<option value="">— none —</option>' + MACRO_AREAS.map(m =>
    `<option value="${m}" ${v.macro_area===m?'selected':''}>${m}</option>`).join('');
  const kanbanOpts = '<option value="">— none —</option>' + KANBAN_COLS.map(k =>
    `<option value="${k}" ${v.kanban_col===k?'selected':''}>${k}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);
  let existingTagIds = [];
  try { existingTagIds = (await api('GET', `/api/projects/${v.id}/tags`) || []).map(t => t.id); } catch(e) {}

  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span style="font-size:11px;color:var(--text-muted)">Auto-saved</span>
      <button id="proj-sl-expand" title="Open full detail view" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-muted);font-size:16px">⤢</button>
    </div>
    <div class="form-group"><label class="form-label">Title</label>
      <input type="text" id="psl-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="psl-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="psl-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Status</label><select id="psl-status">${statusOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Macro Area</label><select id="psl-macro">${macroOpts}</select></div>
      <div class="form-group"><label class="form-label">Kanban Column</label><select id="psl-kanban">${kanbanOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="psl-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label" style="margin-top:20px;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="psl-archived" ${v.archived?'checked':''} style="width:auto" /> Archived
      </label></div>
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <div class="date-mode-toggle">
        <button type="button" class="date-mode-btn ${!v.start_date ? 'active' : ''}" data-date-mode="due">Due date</button>
        <button type="button" class="date-mode-btn ${v.start_date ? 'active' : ''}" data-date-mode="range">Date range</button>
      </div>
      <div id="psl-date-due-wrap" style="${v.start_date ? 'display:none' : ''}">
        <input type="date" id="psl-due" value="${stripDate(v.due_date)}" style="margin-top:6px" />
      </div>
      <div id="psl-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        <input type="date" id="psl-start" value="${stripDate(v.start_date)}" />
        <span class="date-range-arrow">→</span>
        <input type="date" id="psl-due-range" value="${stripDate(v.due_date)}" />
      </div>
    </div>
    <div class="form-group"><label class="form-label">Tags</label>${tagPickerHtml(existingTagIds)}</div>
    <div class="form-actions">
      <button class="btn btn-danger" id="psl-delete-btn">Delete</button>
    </div>`;

  openFormSlideover('Edit Project', body);
  bindTagPicker();
  bindDateModeToggle('psl-date-due-wrap', 'psl-date-range-wrap');

  document.getElementById('proj-sl-expand').onclick = () => {
    closeFormSlideover();
    renderView('project-detail', v.id);
  };

  let saveTimer = null;
  async function autoSave() {
    const isRange = document.getElementById('psl-date-range-wrap')?.style.display !== 'none';
    const data = {
      title: document.getElementById('psl-title').value.trim(),
      description: document.getElementById('psl-desc').value,
      goal_id: document.getElementById('psl-goal').value ? parseInt(document.getElementById('psl-goal').value) : null,
      status: document.getElementById('psl-status').value,
      macro_area: document.getElementById('psl-macro').value || null,
      kanban_col: document.getElementById('psl-kanban').value || null,
      category_id: document.getElementById('psl-category').value ? parseInt(document.getElementById('psl-category').value) : null,
      archived: document.getElementById('psl-archived').checked,
      start_date: isRange ? (document.getElementById('psl-start')?.value || null) : null,
      due_date: isRange ? (document.getElementById('psl-due-range')?.value || null) : (document.getElementById('psl-due')?.value || null),
    };
    if (!data.title) return;
    await api('PATCH', `/api/projects/${v.id}`, data);
    const tagIds = getSelectedTagIds();
    try { await api('PUT', `/api/projects/${v.id}/tags`, { tag_ids: tagIds }); } catch(e) {}
    if (afterSave) afterSave();
  }
  function scheduleAutoSave() { clearTimeout(saveTimer); saveTimer = setTimeout(autoSave, 600); }

  ['psl-title','psl-desc','psl-due','psl-start','psl-due-range'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', scheduleAutoSave));
  ['psl-goal','psl-status','psl-macro','psl-kanban','psl-category'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => { clearTimeout(saveTimer); autoSave(); }));
  document.getElementById('psl-archived')?.addEventListener('change', () => { clearTimeout(saveTimer); autoSave(); });

  document.getElementById('psl-delete-btn').onclick = async () => {
    if (!confirm('Delete this project?')) return;
    await api('DELETE', `/api/projects/${v.id}`);
    closeFormSlideover();
    renderProjects();
  };
}

/* ─── Goal Slideover (auto-save, expand to detail) ──────────────────── */
async function showGoalSlideover(goal, afterSave) {
  if (!goal?.id) { showGoalModal(goal, afterSave); return; }
  const v = goal;
  const typeOpts = GOAL_TYPES.map(t => `<option value="${t}" ${v.type===t?'selected':''}>${t}</option>`).join('');
  const yearOpts = GOAL_YEARS.map(y => `<option value="${y}" ${v.year===y?'selected':''}>${y}</option>`).join('');
  const statusOpts = GOAL_STATUSES.map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);
  let existingTagIds = [];
  try { existingTagIds = (await api('GET', `/api/goals/${v.id}/tags`) || []).map(t => t.id); } catch(e) {}

  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span style="font-size:11px;color:var(--text-muted)">Auto-saved</span>
      <button id="goal-sl-expand" title="Open full detail view" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-muted);font-size:16px">⤢</button>
    </div>
    <div class="form-group"><label class="form-label">Title</label>
      <input type="text" id="gsl-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="gsl-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Type</label><select id="gsl-type">${typeOpts}</select></div>
      <div class="form-group"><label class="form-label">Year</label><select id="gsl-year">${yearOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Status</label><select id="gsl-status">${statusOpts}</select></div>
      <div class="form-group"><label class="form-label">Category</label><select id="gsl-category">${catOpts}</select></div>
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <div class="date-mode-toggle">
        <button type="button" class="date-mode-btn ${!v.start_date ? 'active' : ''}" data-date-mode="due">Due date</button>
        <button type="button" class="date-mode-btn ${v.start_date ? 'active' : ''}" data-date-mode="range">Date range</button>
      </div>
      <div id="gsl-date-due-wrap" style="${v.start_date ? 'display:none' : ''}">
        <input type="date" id="gsl-due" value="${stripDate(v.due_date)}" style="margin-top:6px" />
      </div>
      <div id="gsl-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        <input type="date" id="gsl-start" value="${stripDate(v.start_date)}" />
        <span class="date-range-arrow">→</span>
        <input type="date" id="gsl-due-range" value="${stripDate(v.due_date)}" />
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Value</label><input type="number" id="gsl-sv" value="${v.start_value||''}" /></div>
      <div class="form-group"><label class="form-label">Current Value</label><input type="number" id="gsl-cv" value="${v.current_value||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Target Value</label>
      <input type="number" id="gsl-target" value="${v.target||''}" /></div>
    <div class="form-group"><label class="form-label">Tags</label>${tagPickerHtml(existingTagIds)}</div>
    <div class="form-actions">
      <button class="btn btn-danger" id="gsl-delete-btn">Delete</button>
    </div>`;

  openFormSlideover('Edit Goal', body);
  bindTagPicker();
  bindDateModeToggle('gsl-date-due-wrap', 'gsl-date-range-wrap');

  document.getElementById('goal-sl-expand').onclick = () => {
    closeFormSlideover();
    renderView('goal-detail', v.id);
  };

  let saveTimer = null;
  async function autoSave() {
    const isRange = document.getElementById('gsl-date-range-wrap')?.style.display !== 'none';
    const data = {
      title: document.getElementById('gsl-title').value.trim(),
      description: document.getElementById('gsl-desc').value,
      type: document.getElementById('gsl-type').value,
      year: document.getElementById('gsl-year').value,
      status: document.getElementById('gsl-status').value,
      category_id: document.getElementById('gsl-category').value ? parseInt(document.getElementById('gsl-category').value) : null,
      start_date: isRange ? (document.getElementById('gsl-start')?.value || null) : null,
      due_date: isRange ? (document.getElementById('gsl-due-range')?.value || null) : (document.getElementById('gsl-due')?.value || null),
      start_value: parseFloat(document.getElementById('gsl-sv').value) || 0,
      current_value: parseFloat(document.getElementById('gsl-cv').value) || 0,
      target: parseFloat(document.getElementById('gsl-target').value) || 0,
    };
    if (!data.title) return;
    await api('PATCH', `/api/goals/${v.id}`, data);
    const tagIds = getSelectedTagIds();
    try { await api('PUT', `/api/goals/${v.id}/tags`, { tag_ids: tagIds }); } catch(e) {}
    if (afterSave) afterSave();
  }
  function scheduleAutoSave() { clearTimeout(saveTimer); saveTimer = setTimeout(autoSave, 600); }

  ['gsl-title','gsl-desc','gsl-due','gsl-start','gsl-due-range','gsl-sv','gsl-cv','gsl-target'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', scheduleAutoSave));
  ['gsl-type','gsl-year','gsl-status','gsl-category'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => { clearTimeout(saveTimer); autoSave(); }));

  document.getElementById('gsl-delete-btn').onclick = async () => {
    if (!confirm('Delete this goal?')) return;
    await api('DELETE', `/api/goals/${v.id}`);
    closeFormSlideover();
    renderGoals();
  };
}

/* ─── Project Modal ──────────────────────────────────────────────────── */
async function showProjectModal(project, goals, afterSave) {
  const v = project || {};
  const goalOpts = '<option value="">— none —</option>' + (goals||[]).map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const statusOpts = ['active','on_hold','completed','archived'].map(s =>
    `<option value="${s}" ${v.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');
  const macroOpts = '<option value="">— none —</option>' + MACRO_AREAS.map(m =>
    `<option value="${m}" ${v.macro_area===m?'selected':''}>${m}</option>`).join('');
  const kanbanOpts = '<option value="">— none —</option>' + KANBAN_COLS.map(k =>
    `<option value="${k}" ${v.kanban_col===k?'selected':''}>${k}</option>`).join('');
  const catOpts = categoryOptions(v.category_id, true);

  let existingTagIds = [];
  if (v.id) {
    try { existingTagIds = (await api('GET', `/api/projects/${v.id}/tags`) || []).map(t => t.id); } catch(e) {}
  }

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="p-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Description</label>
      <textarea id="p-desc">${v.description||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="p-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Status</label><select id="p-status">${statusOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Macro Area</label><select id="p-macro">${macroOpts}</select></div>
      <div class="form-group"><label class="form-label">Kanban Column</label><select id="p-kanban">${kanbanOpts}</select></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="p-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label" style="margin-top:20px;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="p-archived" ${v.archived?'checked':''} style="width:auto" /> Archived
      </label></div>
    </div>
    <div class="form-group">
      <label class="form-label">Date</label>
      <div class="date-mode-toggle">
        <button type="button" class="date-mode-btn ${!v.start_date ? 'active' : ''}" data-date-mode="due">Due date</button>
        <button type="button" class="date-mode-btn ${v.start_date ? 'active' : ''}" data-date-mode="range">Date range</button>
      </div>
      <div id="p-date-due-wrap" style="${v.start_date ? 'display:none' : ''}">
        <input type="date" id="p-due" value="${stripDate(v.due_date)}" style="margin-top:6px" />
      </div>
      <div id="p-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        <input type="date" id="p-start" value="${stripDate(v.start_date)}" />
        <span class="date-range-arrow">→</span>
        <input type="date" id="p-due-range" value="${stripDate(v.due_date)}" />
      </div>
    </div>
    <div class="form-group"><label class="form-label">Tags</label>
      ${tagPickerHtml(existingTagIds)}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Project' : 'New Project', body);
  bindTagPicker();
  bindDateModeToggle('p-date-due-wrap', 'p-date-range-wrap');
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('modal-save-btn').onclick = async () => {
    const isRange = document.getElementById('p-date-range-wrap')?.style.display !== 'none';
    const data = {
      title: document.getElementById('p-title').value.trim(),
      description: document.getElementById('p-desc').value,
      goal_id: document.getElementById('p-goal').value ? parseInt(document.getElementById('p-goal').value) : null,
      status: document.getElementById('p-status').value,
      macro_area: document.getElementById('p-macro').value || null,
      kanban_col: document.getElementById('p-kanban').value || null,
      category_id: document.getElementById('p-category').value ? parseInt(document.getElementById('p-category').value) : null,
      archived: document.getElementById('p-archived').checked,
      start_date: isRange ? (document.getElementById('p-start')?.value || null) : null,
      due_date: isRange ? (document.getElementById('p-due-range')?.value || null) : (document.getElementById('p-due')?.value || null),
    };
    if (!data.title) { alert('Title is required'); return; }
    let savedId = v.id;
    if (v.id) await api('PATCH', `/api/projects/${v.id}`, data);
    else { const r = await api('POST', '/api/projects', data); savedId = r?.id; }
    if (savedId) {
      const tagIds = getSelectedTagIds();
      try { await api('PUT', `/api/projects/${savedId}/tags`, { tag_ids: tagIds }); } catch(e) {}
    }
    closeFormSlideover();
    if (afterSave) afterSave();
    else renderProjects();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this project?')) return;
      await api('DELETE', `/api/projects/${v.id}`);
      closeFormSlideover();
      renderProjects();
    };
  }
}

/* ─── Note Modal ─────────────────────────────────────────────────────── */
async function showNoteModal(note, afterSave) {
  const v = note || {};
  let projects = [], tasks = [], goals = [];
  try { [projects, tasks, goals] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/tasks'), api('GET', '/api/goals')
  ]); } catch(e) {}

  const catOpts = categoryOptions(v.category_id, true);
  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id)===String(v.project_id)?'selected':''}>${p.title}</option>`).join('');
  const taskOpts = '<option value="">— none —</option>' + tasks.map(t =>
    `<option value="${t.id}" ${String(t.id)===String(v.task_id)?'selected':''}>${t.title}</option>`).join('');
  const selectedTagIds = (v.tags || []).map(t => t.id);

  const body = `
    <div class="form-group"><label class="form-label">Title</label>
      <div style="display:flex;align-items:center;gap:8px">
        <button type="button" class="entity-icon-btn" id="note-icon-btn" title="Set icon"><span id="note-icon-display">☐</span></button>
        <input type="text" id="n-title" value="${(v.title||'').replace(/"/g,'&quot;')}" style="flex:1" />
      </div>
    </div>
    <div class="form-group"><label class="form-label">Body</label>
      <textarea id="n-body" style="min-height:160px">${v.body||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="n-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label">Note Date</label><input type="date" id="n-date" value="${v.note_date||''}" /></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="n-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Project</label><select id="n-project">${projOpts}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Task</label><select id="n-task">${taskOpts}</select></div>
    <div class="form-group"><label class="form-label">Tags</label>
      <div class="tag-picker" id="note-tag-picker">${tagPickerHtml(selectedTagIds)}</div>
    </div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover(v.id ? 'Edit Note' : 'New Note', body);
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;

  // ── Note icon picker ──────────────────────────────────────────────────
  const noteIconBtn = document.getElementById('note-icon-btn');
  const noteIconDisplay = document.getElementById('note-icon-display');
  if (v.id) {
    loadEntityIcon('note', v.id).then(icon => {
      if (noteIconDisplay) { noteIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 20) : '☐'; noteIconDisplay.dataset.icon = icon || ''; }
    });
  }
  if (noteIconBtn) {
    noteIconBtn.onclick = (e) => {
      e.stopPropagation();
      const cur = noteIconDisplay ? noteIconDisplay.dataset.icon || '' : '';
      showIconPicker(noteIconBtn, 'note', v.id || null, cur, (newIcon) => {
        if (noteIconDisplay) { noteIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 20) : '☐'; noteIconDisplay.dataset.icon = newIcon; }
        if (v.id) {
          saveEntityIcon('note', v.id, newIcon).catch(() => {
            if (noteIconDisplay) { noteIconDisplay.innerHTML = cur ? renderEntityIcon(cur, 20) : '☐'; noteIconDisplay.dataset.icon = cur; }
          });
        }
      });
    };
  }

  // Tag picker toggle
  document.querySelectorAll('#note-tag-picker .tag-chip').forEach(chip => {
    chip.onclick = () => chip.classList.toggle('selected');
  });

  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('n-title').value.trim(),
      body: document.getElementById('n-body').value,
      category_id: document.getElementById('n-category').value ? parseInt(document.getElementById('n-category').value) : null,
      note_date: document.getElementById('n-date').value || null,
      goal_id: document.getElementById('n-goal').value ? parseInt(document.getElementById('n-goal').value) : null,
      project_id: document.getElementById('n-project').value ? parseInt(document.getElementById('n-project').value) : null,
      task_id: document.getElementById('n-task').value ? parseInt(document.getElementById('n-task').value) : null,
    };
    if (!data.title) { alert('Title is required'); return; }
    let savedId = v.id;
    try {
      if (v.id) {
        await api('PATCH', `/api/notes/${v.id}`, data);
      } else {
        const created = await api('POST', '/api/notes', data);
        if (created) savedId = created.id;
      }
    } catch(err) {
      alert('Error saving note: ' + (err.message || String(err)));
      return;
    }
    // Save tags
    if (savedId) {
      const pickedIds = [...document.querySelectorAll('#note-tag-picker .tag-chip.selected')].map(c => parseInt(c.dataset.tagId));
      try { await api('PUT', `/api/notes/${savedId}/tags`, { tag_ids: pickedIds }); } catch(err) {}
    }
    closeFormSlideover();
    if (afterSave) afterSave(); else renderNotes();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this note?')) return;
      await api('DELETE', `/api/notes/${v.id}`);
      closeFormSlideover();
      if (afterSave) afterSave(); else renderNotes();
    };
  }
}

/* ─── Sprint Modal ───────────────────────────────────────────────────── */
function showSprintModal(projects, sprint) {
  const s = sprint || {};
  const projOpts = '<option value="">— none —</option>' + (projects||[]).map(p =>
    `<option value="${p.id}" ${String(p.id)===String(s.project_id)?'selected':''}>${p.title}</option>`).join('');

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <div style="display:flex;align-items:center;gap:8px">
        <button type="button" class="entity-icon-btn" id="sprint-icon-btn" title="Set icon"><span id="sprint-icon-display">☐</span></button>
        <input type="text" id="sp-title" placeholder="Sprint name" value="${(s.title||'').replace(/"/g,'&quot;')}" style="flex:1" />
      </div>
    </div>
    <div class="form-group"><label class="form-label">Project</label>
      <select id="sp-project">${projOpts}</select></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" id="sp-start" value="${s.start_date||''}" /></div>
      <div class="form-group"><label class="form-label">End Date</label><input type="date" id="sp-end" value="${s.end_date||''}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Capacity (Story Points)</label>
      <input type="number" id="sp-story-points" min="0" placeholder="e.g. 40" value="${s.story_points != null ? s.story_points : ''}" style="width:100%" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">${s.id ? 'Save' : 'Create'}</button>
    </div>`;

  openFormSlideover(s.id ? 'Edit Sprint' : 'New Sprint', body);
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  // ── Sprint icon picker ────────────────────────────────────────────────
  const sprintIconBtn = document.getElementById('sprint-icon-btn');
  const sprintIconDisplay = document.getElementById('sprint-icon-display');
  if (s.id) {
    loadEntityIcon('sprint', s.id).then(icon => {
      if (sprintIconDisplay) { sprintIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 20) : '☐'; sprintIconDisplay.dataset.icon = icon || ''; }
    });
  }
  if (sprintIconBtn) {
    sprintIconBtn.onclick = (e) => {
      e.stopPropagation();
      const cur = sprintIconDisplay ? sprintIconDisplay.dataset.icon || '' : '';
      showIconPicker(sprintIconBtn, 'sprint', s.id || null, cur, (newIcon) => {
        if (sprintIconDisplay) { sprintIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 20) : '☐'; sprintIconDisplay.dataset.icon = newIcon; }
        if (s.id) {
          saveEntityIcon('sprint', s.id, newIcon).catch(() => {
            if (sprintIconDisplay) { sprintIconDisplay.innerHTML = cur ? renderEntityIcon(cur, 20) : '☐'; sprintIconDisplay.dataset.icon = cur; }
          });
        }
      });
    };
  }
  document.getElementById('modal-save-btn').onclick = async () => {
    const spVal = document.getElementById('sp-story-points').value.trim();
    const data = {
      title: document.getElementById('sp-title').value.trim(),
      project_id: document.getElementById('sp-project').value ? parseInt(document.getElementById('sp-project').value) : null,
      start_date: document.getElementById('sp-start').value || null,
      end_date: document.getElementById('sp-end').value || null,
      story_points: spVal !== '' ? parseInt(spVal, 10) : null,
    };
    if (!data.title) { alert('Title is required'); return; }
    if (s.id) {
      await api('PATCH', `/api/sprints/${s.id}`, data);
    } else {
      data.status = 'planned';
      await api('POST', '/api/sprints', data);
    }
    closeFormSlideover();
    renderSprints();
  };
}

/* ─── Resource Slideover (view + auto-save) ──────────────────────────── */
async function showResourceSlideover(resource, afterSave) {
  const v = resource || {};
  let projects = [], tasks = [], goals = [];
  try { [projects, tasks, goals] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/tasks'), api('GET', '/api/goals')
  ]); } catch(e) {}

  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id)===String(v.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(p =>
    `<option value="${p.id}" ${String(p.id)===String(v.project_id)?'selected':''}>${p.title}</option>`).join('');
  const taskOpts = '<option value="">— none —</option>' + tasks.map(t =>
    `<option value="${t.id}" ${String(t.id)===String(v.task_id)?'selected':''}>${t.title}</option>`).join('');

  const rawUrl = v.url || '';
  const urlDisplay = rawUrl
    ? `<a href="${rawUrl}" target="_blank" rel="noopener" style="color:var(--accent);word-break:break-all">${rawUrl}</a>`
    : '<span style="color:var(--text-muted)">—</span>';

  const body = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">
      <div class="form-group" style="margin:0">
        <label class="form-label">Title</label>
        <input type="text" id="rs-title" value="${(v.title||'').replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box" />
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Type</label>
        <input type="text" id="rs-type" value="${v.resource_type||v.type||''}" placeholder="e.g. link, book, tool…" style="width:100%;box-sizing:border-box" />
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">URL</label>
        <input type="url" id="rs-url" value="${rawUrl}" style="width:100%;box-sizing:border-box" />
        <div id="rs-url-preview" style="margin-top:4px;font-size:12px">${urlDisplay}</div>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Body / Notes</label>
        <textarea id="rs-body" style="width:100%;box-sizing:border-box;min-height:100px">${v.body||''}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group" style="margin:0"><label class="form-label">Goal</label><select id="rs-goal" style="width:100%">${goalOpts}</select></div>
        <div class="form-group" style="margin:0"><label class="form-label">Project</label><select id="rs-project" style="width:100%">${projOpts}</select></div>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Task</label>
        <select id="rs-task" style="width:100%">${taskOpts}</select>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-danger btn-sm" id="rs-delete-btn">Delete resource</button>
      </div>
      <div id="rs-save-indicator" style="font-size:11px;color:var(--text-muted);text-align:right;min-height:16px"></div>
    </div>`;

  openSlideover(v.title || 'Resource', body);

  const indicator = document.getElementById('rs-save-indicator');
  let saveTimer = null;

  async function autoSave() {
    const urlVal = document.getElementById('rs-url').value.trim();
    const data = {
      title:        document.getElementById('rs-title').value.trim() || v.title,
      resource_type: document.getElementById('rs-type').value || 'note',
      url:          urlVal || null,
      body:         document.getElementById('rs-body').value,
      goal_id:      document.getElementById('rs-goal').value ? parseInt(document.getElementById('rs-goal').value) : null,
      project_id:   document.getElementById('rs-project').value ? parseInt(document.getElementById('rs-project').value) : null,
      task_id:      document.getElementById('rs-task').value ? parseInt(document.getElementById('rs-task').value) : null,
    };
    indicator.textContent = 'Saving…';
    try {
      await api('PATCH', `/api/resources/${v.id}`, data);
      indicator.textContent = 'Saved';
      // Update url preview link
      document.getElementById('rs-url-preview').innerHTML = urlVal
        ? `<a href="${urlVal}" target="_blank" rel="noopener" style="color:var(--accent);word-break:break-all">${urlVal}</a>`
        : '<span style="color:var(--text-muted)">—</span>';
      if (afterSave) afterSave();
    } catch(e) {
      indicator.textContent = 'Save failed';
    }
  }

  function scheduleAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autoSave, 700);
  }

  ['rs-title','rs-type','rs-url','rs-body'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleAutoSave);
  });
  ['rs-goal','rs-project','rs-task'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', autoSave);
  });

  document.getElementById('rs-delete-btn').onclick = async () => {
    if (!confirm('Delete this resource?')) return;
    await api('DELETE', `/api/resources/${v.id}`);
    closeSlideover();
    if (afterSave) afterSave(); else renderResources();
  };
}

/* ─── Category Modal ─────────────────────────────────────────────────── */
function showCategoryModal(cat) {
  const v = cat || {};
  const body = `
    <div class="form-group"><label class="form-label">Name *</label>
      <input type="text" id="c-name" value="${(v.name||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Color</label>
      ${colorSelect('c-color', v.color || 'blue')}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Category' : 'New Category', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      name: document.getElementById('c-name').value.trim(),
      color: document.getElementById('c-color').value,
    };
    if (!data.name) { alert('Name is required'); return; }
    if (v.id) await api('PATCH', `/api/categories/${v.id}`, data);
    else await api('POST', '/api/categories', data);
    closeModal();
    try { allCategories = await api('GET', '/api/categories'); } catch(e) {}
    renderCategories();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this category?')) return;
      await api('DELETE', `/api/categories/${v.id}`);
      closeModal();
      renderCategories();
    };
  }
}

/* ─── Tag Modal ──────────────────────────────────────────────────────── */
function showTagModal(tag) {
  const v = tag || {};
  const body = `
    <div class="form-group"><label class="form-label">Name *</label>
      <input type="text" id="tg-name" value="${(v.name||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Color</label>
      ${colorSelect('tg-color', v.color || 'blue')}</div>
    <div class="form-actions">
      ${v.id ? `<button class="btn btn-danger" id="modal-delete-btn">Delete</button>` : ''}
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openModal(v.id ? 'Edit Tag' : 'New Tag', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      name: document.getElementById('tg-name').value.trim(),
      color: document.getElementById('tg-color').value,
    };
    if (!data.name) { alert('Name is required'); return; }
    if (v.id) await api('PATCH', `/api/tags/${v.id}`, data);
    else await api('POST', '/api/tags', data);
    closeModal();
    try { allTags = await api('GET', '/api/tags'); } catch(e) {}
    renderTags();
  };
  if (v.id) {
    document.getElementById('modal-delete-btn').onclick = async () => {
      if (!confirm('Delete this tag?')) return;
      await api('DELETE', `/api/tags/${v.id}`);
      closeModal();
      renderTags();
    };
  }
}

/* ─── Theme Toggle ───────────────────────────────────────────────────── */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
}

/* ─── Init ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Nav click handlers
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`[data-view="${view}"]`).forEach(l => l.classList.add('active'));
      renderView(view);
    });
  });

  // Modal close
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-backdrop').onclick = () => {
    if (document.getElementById('modal').classList.contains('open')) closeModal();
    if (document.getElementById('form-slideover').classList.contains('open')) closeFormSlideover();
    if (document.getElementById('slideover').classList.contains('open')) closeSlideover();
  };

  // Slideover close
  document.getElementById('slideover-close').onclick = closeSlideover;

  // Form slideover close
  document.getElementById('form-slideover-close').onclick = closeFormSlideover;

  // Theme toggles
  document.getElementById('theme-btn').onclick = toggleTheme;
  document.getElementById('mob-theme-btn').onclick = toggleTheme;

  // Refresh button — re-renders the current view
  document.getElementById('refresh-btn').onclick = () => {
    const btn = document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    renderView(currentView);
  };

  // Mobile menu toggle
  const mobMenuBtn = document.getElementById('mob-menu-btn');
  const sidebar = document.getElementById('sidebar');
  if (mobMenuBtn && sidebar) {
    mobMenuBtn.onclick = () => sidebar.classList.toggle('open');
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !mobMenuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Load taxonomy data
  try {
    [allTags, allCategories] = await Promise.all([
      api('GET', '/api/tags'),
      api('GET', '/api/categories'),
    ]);
  } catch(e) {
    allTags = [];
    allCategories = [];
  }

  // Fetch latest GitHub commit SHA for version button
  try {
    const ghRes = await fetch('https://api.github.com/repos/raibis/raibis-lifeos/commits/main');
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      const sha = ghData.sha ? ghData.sha.slice(0, 7) : null;
      if (sha) {
        const vBtn = document.getElementById('version-btn');
        if (vBtn) {
          vBtn.href = `https://github.com/raibis/raibis-lifeos/commit/${ghData.sha}`;
          vBtn.innerHTML = `<span class="nav-icon">⬡</span> v1.0.2-alpha.2 · ${sha}`;
        }
      }
    }
  } catch(e) {}

  renderView('dashboard');
  initAiPanel();

  // Quick note FAB
  const quickNoteFab = document.getElementById('quick-note-fab');
  if (quickNoteFab) quickNoteFab.onclick = () => showQuickNoteModal();
});

/* ─── Quick Note Modal ───────────────────────────────────────────────── */
function showQuickNoteModal() {
  const today = new Date().toISOString().split('T')[0];
  const catOpts = '<option value="">— none —</option>' + allCategories.map(c =>
    `<option value="${c.id}">${c.name}</option>`).join('');

  const body = `
    <div class="form-group">
      <label class="form-label">Title</label>
      <input type="text" id="qn-title" placeholder="Note title…" />
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <textarea id="qn-body" rows="8" placeholder="Write your note…" style="width:100%;min-height:160px"></textarea>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Date</label><input type="date" id="qn-date" value="${today}" /></div>
      <div class="form-group"><label class="form-label">Category</label><select id="qn-category">${catOpts}</select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save Note</button>
    </div>`;

  openModal('Quick Note', body);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  requestAnimationFrame(() => document.getElementById('qn-title')?.focus());
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('qn-title').value.trim();
    const body = document.getElementById('qn-body').value;
    const note_date = document.getElementById('qn-date').value || null;
    const category_id = document.getElementById('qn-category').value
      ? parseInt(document.getElementById('qn-category').value) : null;
    if (!title && !body) { alert('Please enter a title or note content'); return; }
    try {
      await api('POST', '/api/notes', { title: title || 'Quick Note', body, note_date, category_id });
      closeModal();
      if (window.__showToast) window.__showToast('Note saved');
      if (currentView === 'notes') renderNotes();
    } catch(e) { alert('Error saving note: ' + (e.message || e)); }
  };
}

/* ─── AI Assistant Panel ─────────────────────────────────────────────── */
const aiState = {
  messages: [],
  isThinking: false,
  isRecording: false,
  recognition: null,
  inputMode: 'text',
  webhook: localStorage.getItem('raibis_webhook') || '',
};

function initAiPanel() {
  const fab = document.getElementById('ai-fab');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-panel-close');
  const sendBtn = document.getElementById('ai-send-btn');
  const input = document.getElementById('ai-input');
  const tabText = document.getElementById('ai-tab-text');
  const tabVoice = document.getElementById('ai-tab-voice');
  const micBtn = document.getElementById('ai-mic-btn');

  if (!fab || !panel) return;

  function openAiPanel() {
    panel.classList.add('open');
    fab.style.display = 'none';
  }

  function closeAiPanel() {
    panel.classList.remove('open');
    fab.style.display = '';
  }

  fab.onclick = openAiPanel;
  closeBtn.onclick = closeAiPanel;

  // Click outside AI panel closes it
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== fab) {
      closeAiPanel();
    }
  }, true);

  tabText.onclick = () => aiSwitchMode('text');
  tabVoice.onclick = () => aiSwitchMode('voice');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) aiSend(); }
  });
  sendBtn.onclick = aiSend;
  micBtn.onclick = aiToggleMic;
}

function aiSwitchMode(mode) {
  aiState.inputMode = mode;
  document.getElementById('ai-tab-text').classList.toggle('active', mode === 'text');
  document.getElementById('ai-tab-voice').classList.toggle('active', mode === 'voice');
  document.getElementById('ai-text-area').classList.toggle('hidden', mode !== 'text');
  document.getElementById('ai-voice-area').classList.toggle('hidden', mode !== 'voice');
  if (mode === 'text') document.getElementById('ai-input').focus();
  else aiCheckVoiceSupport();
}

function aiCheckVoiceSupport() {
  const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  document.getElementById('ai-voice-unsupported').classList.toggle('hidden', supported);
  document.getElementById('ai-voice-controls').classList.toggle('hidden', !supported);
}

function aiToggleMic() {
  if (aiState.isRecording) { aiStopRecording(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const r = new SR();
  r.continuous = false;
  r.interimResults = true;
  r.lang = 'en-US';
  aiState.recognition = r;
  r.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    document.getElementById('ai-voice-preview').textContent = transcript;
    if (e.results[e.results.length - 1].isFinal) {
      aiSend(transcript);
      aiStopRecording();
    }
  };
  r.onerror = () => aiStopRecording();
  r.onend = () => { if (aiState.isRecording) aiStopRecording(); };
  r.start();
  aiState.isRecording = true;
  document.getElementById('ai-mic-btn').classList.add('recording');
  document.getElementById('ai-voice-status').textContent = 'Listening…';
}

function aiStopRecording() {
  aiState.isRecording = false;
  if (aiState.recognition) { try { aiState.recognition.stop(); } catch(e) {} aiState.recognition = null; }
  const micBtn = document.getElementById('ai-mic-btn');
  if (micBtn) micBtn.classList.remove('recording');
  const statusEl = document.getElementById('ai-voice-status');
  if (statusEl) statusEl.textContent = 'Tap to speak';
  const previewEl = document.getElementById('ai-voice-preview');
  if (previewEl) previewEl.textContent = '';
}

async function aiSend(text) {
  const input = document.getElementById('ai-input');
  const msg = text || (input ? input.value.trim() : '');
  if (!msg || aiState.isThinking) return;
  if (input && !text) { input.value = ''; input.style.height = 'auto'; document.getElementById('ai-send-btn').disabled = true; }

  aiAddMessage('user', msg);
  const thinking = aiAddThinking();
  aiState.isThinking = true;

  // Update webhook from localStorage in case it changed
  aiState.webhook = localStorage.getItem('raibis_webhook') || '';

  try {
    let reply;
    if (!aiState.webhook) {
      reply = 'No webhook configured. Set your N8N webhook URL in raibis-chat settings (open full chat with ↗ Full).';
    } else {
      const res = await fetch(aiState.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: 'lifeos-panel', timestamp: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { text: await res.text() };
      reply = typeof data === 'string' ? data : (data.text || data.output || JSON.stringify(data));
    }
    thinking.remove();
    aiAddMessage('ai', reply);
  } catch(e) {
    thinking.remove();
    aiAddMessage('ai', `Error: ${e.message}`);
  }
  aiState.isThinking = false;
}

function aiAddMessage(role, content) {
  const feed = document.getElementById('ai-chat-feed');
  const empty = document.getElementById('ai-empty');
  if (empty) empty.style.display = 'none';

  const el = document.createElement('div');
  el.className = `ai-msg from-${role}`;
  const sender = role === 'user' ? 'You' : 'raibis';
  el.innerHTML = `<div class="ai-msg-sender">${sender}</div><div class="ai-msg-bubble">${escHtml(content)}</div>`;
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
  return el;
}

function aiAddThinking() {
  const feed = document.getElementById('ai-chat-feed');
  const el = document.createElement('div');
  el.className = 'ai-msg from-ai';
  el.innerHTML = `<div class="ai-thinking"><div class="ai-thinking-dot"></div><div class="ai-thinking-dot"></div><div class="ai-thinking-dot"></div></div>`;
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
  return el;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── GSAP MutationObserver — auto-animate any view render ──────────── */
// Watches #main-content for new DOM subtrees and applies entrance animations.
// This fires for every renderXxx() call without modifying each function.
(function initViewAnimationObserver() {
  const main = document.getElementById('main-content');
  if (!main || !window.LifeAnimations) return;

  // Debounce to avoid firing on every intermediate innerHTML update
  let animTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(animTimer);
    animTimer = setTimeout(() => {
      // Don't animate loading spinner
      if (main.querySelector('.loading')) return;

      // Page enter — the whole .view fades + slides up
      LifeAnimations.pageEnter(main.querySelector('.view'), { duration: 0.28 });

      // Stagger lists of items that appear in all views
      requestAnimationFrame(() => {
        LifeAnimations.staggerList(main.querySelectorAll('.task-row'),    { stagger: 0.03 });
        LifeAnimations.staggerList(main.querySelectorAll('.card'),        { stagger: 0.05 });
        LifeAnimations.staggerList(main.querySelectorAll('.note-card'),   { stagger: 0.05 });
        LifeAnimations.staggerList(main.querySelectorAll('.stat-card'),   { stagger: 0.06 });
        LifeAnimations.staggerList(main.querySelectorAll('.kanban-card'), { stagger: 0.04 });
        LifeAnimations.staggerList(main.querySelectorAll('.taxonomy-chip'),{ stagger: 0.04 });

        // Hover lift on cards
        LifeAnimations.hoverLiftAll('#main-content .stat-card');
        LifeAnimations.hoverLiftAll('#main-content .widget');
        LifeAnimations.hoverLiftAll('#main-content .note-card');
      });
    }, 60); // short debounce — lets innerHTML finish before animating
  });

  observer.observe(main, { childList: true, subtree: false });
})();
