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
  // ── Core entities ───────────────────────────────────────────────────────
  { name:'task',         svg:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>' },
  { name:'goal',         svg:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { name:'project',      svg:'<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>' },
  { name:'note',         svg:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { name:'sprint',       svg:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  // ── Common actions ──────────────────────────────────────────────────────
  { name:'star',         svg:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { name:'heart',        svg:'<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>' },
  { name:'flag',         svg:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
  { name:'bookmark',     svg:'<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>' },
  { name:'check',        svg:'<polyline points="20 6 9 17 4 12"/>' },
  { name:'check-circle', svg:'<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
  { name:'x-circle',     svg:'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
  { name:'plus-circle',  svg:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>' },
  { name:'alert',        svg:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { name:'info',         svg:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
  // ── Organization ────────────────────────────────────────────────────────
  { name:'link',         svg:'<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' },
  { name:'calendar',     svg:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
  { name:'clock',        svg:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  { name:'folder',       svg:'<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>' },
  { name:'folder-open',  svg:'<path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>' },
  { name:'inbox',        svg:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>' },
  { name:'archive',      svg:'<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>' },
  { name:'tag',          svg:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>' },
  { name:'filter',       svg:'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' },
  { name:'sort',         svg:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>' },
  { name:'list',         svg:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3" y2="6"/><line x1="3" y1="12" x2="3" y2="12"/><line x1="3" y1="18" x2="3" y2="18"/>' },
  { name:'grid',         svg:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
  { name:'table',        svg:'<rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/>' },
  // ── People & Communication ───────────────────────────────────────────────
  { name:'users',        svg:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>' },
  { name:'user',         svg:'<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  { name:'message',      svg:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' },
  { name:'mail',         svg:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
  { name:'phone',        svg:'<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.72 6.72l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>' },
  { name:'share',        svg:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' },
  // ── Analytics & Data ────────────────────────────────────────────────────
  { name:'chart',        svg:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  { name:'chart-line',   svg:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { name:'pie-chart',    svg:'<path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>' },
  { name:'trending-up',  svg:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
  { name:'activity',     svg:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { name:'database',     svg:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' },
  // ── Technology ──────────────────────────────────────────────────────────
  { name:'code',         svg:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
  { name:'code-branch',  svg:'<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/>' },
  { name:'terminal',     svg:'<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>' },
  { name:'package',      svg:'<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' },
  { name:'git-branch',   svg:'<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/>' },
  { name:'server',       svg:'<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>' },
  { name:'cpu',          svg:'<rect x="9" y="9" width="6" height="6"/><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="15" y1="18" x2="15" y2="22"/><line x1="2" y1="9" x2="6" y2="9"/><line x1="2" y1="15" x2="6" y2="15"/><line x1="18" y1="9" x2="22" y2="9"/><line x1="18" y1="15" x2="22" y2="15"/>' },
  { name:'wifi',         svg:'<path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 16 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>' },
  // ── Settings & Tools ────────────────────────────────────────────────────
  { name:'settings',     svg:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>' },
  { name:'tool',         svg:'<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>' },
  { name:'sliders',      svg:'<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>' },
  { name:'lock',         svg:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>' },
  { name:'unlock',       svg:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>' },
  { name:'key',          svg:'<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>' },
  // ── Navigation ──────────────────────────────────────────────────────────
  { name:'layers',       svg:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>' },
  { name:'map',          svg:'<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>' },
  { name:'home',         svg:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { name:'compass',      svg:'<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>' },
  { name:'external-link',svg:'<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>' },
  // ── Productivity ────────────────────────────────────────────────────────
  { name:'brain',        svg:'<path d="M9.5 2a2.5 2.5 0 01.5 5M9.5 2a2.5 2.5 0 00-.5 5"/><path d="M6 5a6 6 0 00-3 10.5M18 5a6 6 0 013 10.5"/><path d="M9 10v4M15 10v4"/><path d="M9 14a3 3 0 006 0"/>' },
  { name:'lightbulb',    svg:'<line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/>' },
  { name:'target',       svg:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { name:'award',        svg:'<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>' },
  { name:'trending',     svg:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
  { name:'zap',          svg:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { name:'refresh',      svg:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>' },
  { name:'repeat',       svg:'<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>' },
  // ── Finance & Business ───────────────────────────────────────────────────
  { name:'dollar',       svg:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>' },
  { name:'credit-card',  svg:'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
  { name:'briefcase',    svg:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>' },
  { name:'shopping-bag', svg:'<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>' },
  // ── Health & Life ───────────────────────────────────────────────────────
  { name:'activity-hr',  svg:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { name:'sun',          svg:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' },
  { name:'moon',         svg:'<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>' },
  { name:'droplet',      svg:'<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>' },
  { name:'feather',      svg:'<path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>' },
  // ── Media ───────────────────────────────────────────────────────────────
  { name:'image',        svg:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
  { name:'video',        svg:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>' },
  { name:'music',        svg:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
  { name:'mic',          svg:'<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>' },
  { name:'camera',       svg:'<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>' },
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
function navIcon(view, size = 18) {
  const el = document.querySelector(`[data-view="${view}"] svg.nav-icon`);
  if (!el) return '';
  const c = el.cloneNode(true);
  c.setAttribute('width', size); c.setAttribute('height', size);
  c.style.verticalAlign = 'middle'; c.style.marginRight = '6px'; c.style.flexShrink = '0';
  return c.outerHTML;
}

// Returns icon HTML for a built-in view, respecting any stored custom icon
function viewIconHtml(view, size = 20) {
  const saved = localStorage.getItem(`navIcon_${view}`);
  if (saved) return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;flex-shrink:0;margin-right:6px;vertical-align:middle">${renderEntityIcon(saved, size)}</span>`;
  return navIcon(view, size);
}
// Returns label for a built-in view, respecting any stored custom label
function viewDisplayName(view, fallback) {
  return escHtml(localStorage.getItem(`navLabel_${view}`) || fallback);
}

// Wires up double-click rename+icon on a built-in entity view title element
function addBuiltinViewTitleRename(viewTitleEl, view, fallback) {
  if (!viewTitleEl) return;
  viewTitleEl.style.cursor = 'default';
  viewTitleEl.title = 'Double-click to rename';
  viewTitleEl.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const navLink = document.querySelector(`[data-view="${view}"]`);
    const currentLabel = localStorage.getItem(`navLabel_${view}`)
      || navLink?.querySelector('span:not(.nav-icon)')?.textContent
      || fallback;
    let newIconVal = localStorage.getItem(`navIcon_${view}`) || '';
    const iconBtnEl = document.createElement('button');
    iconBtnEl.style.cssText = 'font-size:16px;background:none;border:1px solid var(--border);border-radius:4px;padding:1px 5px;cursor:pointer;line-height:1.4;min-width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0';
    iconBtnEl.innerHTML = newIconVal ? renderEntityIcon(newIconVal, 16) : navIcon(view, 16);
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = currentLabel;
    inp.style.cssText = 'font-size:inherit;padding:2px 8px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text-primary);flex:1;min-width:80px;outline:none';
    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = 'font-size:11px;background:var(--accent);color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer';
    saveBtn.textContent = '✓';
    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'font-size:11px;background:none;border:1px solid var(--border);border-radius:4px;padding:2px 8px;cursor:pointer';
    cancelBtn.textContent = '✕';
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
    wrap.append(iconBtnEl, inp, saveBtn, cancelBtn);
    viewTitleEl.innerHTML = ''; viewTitleEl.appendChild(wrap);
    inp.focus(); inp.select();
    iconBtnEl.onclick = (ev) => {
      ev.stopPropagation();
      showIconPicker(iconBtnEl, null, null, newIconVal, (icon) => {
        newIconVal = icon || '';
        iconBtnEl.innerHTML = newIconVal ? renderEntityIcon(newIconVal, 16) : navIcon(view, 16);
      });
    };
    const doRestore = () => { viewTitleEl.innerHTML = `${viewIconHtml(view, 20)}${viewDisplayName(view, fallback)}`; };
    const doSave = () => {
      const newLabel = inp.value.trim() || currentLabel;
      if (inp.value.trim()) localStorage.setItem(`navLabel_${view}`, newLabel);
      else localStorage.removeItem(`navLabel_${view}`);
      if (newIconVal) localStorage.setItem(`navIcon_${view}`, newIconVal);
      else localStorage.removeItem(`navIcon_${view}`);
      if (navLink) {
        const navSpan = navLink.querySelector('span:not(.nav-icon)');
        if (navSpan) navSpan.textContent = newLabel;
        const navIconEl = navLink.querySelector('.nav-icon');
        if (navIconEl && newIconVal) navIconEl.outerHTML = `<span class="nav-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0">${renderEntityIcon(newIconVal, 16)}</span>`;
      }
      viewTitleEl.innerHTML = `${viewIconHtml(view, 20)}${escHtml(newLabel)}`;
    };
    saveBtn.onclick = (ev) => { ev.stopPropagation(); doSave(); };
    cancelBtn.onclick = (ev) => { ev.stopPropagation(); doRestore(); };
    inp.onclick = ev => ev.stopPropagation();
    inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); doSave(); } if (ev.key === 'Escape') { ev.preventDefault(); doRestore(); } };
  });
}

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
let customEntityTypes = [];
let currentView = 'dashboard';
let _connectedPropTypesCache = null;
let currentParams = null;
let navHistory = []; // [{view, params, label}]
let allTags = [];
let allCategories = [];
// Single slot for the active view's propDefsChanged callback — replaced on each view mount
let _viewPropDefsCallback = null;
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

// Shared kanban drag state (mouse-based — WKWebView doesn't support HTML5 drag API)
let _kanbanDrag = { id: null, type: null, el: null, ghost: null, startX: 0, startY: 0, moved: false };

function bindKanbanDrag(board, cardSelector, idAttr, onDrop) {
  if (!board) return;
  const THRESHOLD = 6; // px before drag activates

  board.querySelectorAll(cardSelector).forEach(card => {
    card.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('button,a,input,select,textarea')) return;
      _kanbanDrag.id = card.dataset[idAttr];
      _kanbanDrag.el = card;
      _kanbanDrag.startX = e.clientX;
      _kanbanDrag.startY = e.clientY;
      _kanbanDrag.moved = false;
      _kanbanDrag.ghost = null;
    });
  });

  const onMouseMove = e => {
    if (!_kanbanDrag.id) return;
    const dx = e.clientX - _kanbanDrag.startX;
    const dy = e.clientY - _kanbanDrag.startY;

    if (!_kanbanDrag.moved && Math.hypot(dx, dy) < THRESHOLD) return;

    if (!_kanbanDrag.moved) {
      _kanbanDrag.moved = true;
      document.body.classList.add('kanban-dragging-active');
      const ghost = _kanbanDrag.el.cloneNode(true);
      ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;opacity:0.85;
        width:${_kanbanDrag.el.offsetWidth}px;box-shadow:0 8px 24px rgba(0,0,0,.25);
        transform:rotate(2deg);transition:none`;
      document.body.appendChild(ghost);
      _kanbanDrag.ghost = ghost;
      _kanbanDrag.el.classList.add('kanban-dragging');
    }

    const ghost = _kanbanDrag.ghost;
    const rect = _kanbanDrag.el.getBoundingClientRect();
    ghost.style.left = (rect.left + dx) + 'px';
    ghost.style.top  = (rect.top  + dy) + 'px';

    // Highlight drop target
    board.querySelectorAll('.kanban-col-body').forEach(b => b.classList.remove('kanban-drag-over'));
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const body = target?.closest('.kanban-col-body');
    if (body && board.contains(body)) body.classList.add('kanban-drag-over');
  };

  const onMouseUp = async e => {
    if (!_kanbanDrag.id) return;
    const id = _kanbanDrag.id;
    const moved = _kanbanDrag.moved;

    if (_kanbanDrag.ghost) { _kanbanDrag.ghost.remove(); _kanbanDrag.ghost = null; }
    if (_kanbanDrag.el) _kanbanDrag.el.classList.remove('kanban-dragging');
    document.body.classList.remove('kanban-dragging-active');
    board.querySelectorAll('.kanban-col-body').forEach(b => b.classList.remove('kanban-drag-over'));
    _kanbanDrag = { id: null, type: null, el: null, ghost: null, startX: 0, startY: 0, moved: false };

    if (!moved) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const body = target?.closest('.kanban-col-body');
    if (!body || !board.contains(body)) return;
    const colKey = body.closest('.kanban-col')?.dataset.col;
    if (!colKey) return;

    await onDrop(id, colKey);
  };

  board.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp, { once: false });
  // Clean up listeners when board is removed
  const observer = new MutationObserver(() => {
    if (!document.contains(board)) {
      board.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
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

// Property visibility per task view mode
const TASK_PROPS = [
  { key: 'status',      label: 'Status' },
  { key: 'priority',    label: 'Priority' },
  { key: 'due_date',    label: 'Due Date' },
  { key: 'project',     label: 'Project' },
  { key: 'goal',        label: 'Goals' },
  { key: 'tags',        label: 'Tags' },
  { key: 'story_points',label: 'Story Points' },
  { key: 'category',    label: 'Category' },
  { key: 'recurrence',  label: 'Recurrence' },
  { key: 'description', label: 'Description' },
];
const TASK_PROP_DEFAULTS = TASK_PROPS.map(p => p.key); // all visible by default
function getTaskVisProps(viewMode) {
  const stored = localStorage.getItem(`taskVisProps_${viewMode}`);
  if (!stored) return [...TASK_PROP_DEFAULTS];
  const keys = JSON.parse(stored);
  // Ensure any new default keys are present (migration for existing localStorage)
  let changed = false;
  TASK_PROP_DEFAULTS.forEach(k => { if (!keys.includes(k)) { keys.push(k); changed = true; } });
  if (changed) localStorage.setItem(`taskVisProps_${viewMode}`, JSON.stringify(keys));
  return keys;
}
function setTaskVisProps(viewMode, keys) {
  localStorage.setItem(`taskVisProps_${viewMode}`, JSON.stringify(keys));
}
function propVisible(viewMode, key) {
  return getTaskVisProps(viewMode).includes(key);
}

// Generic property visibility for non-task entities (projects, goals, resources, notes)
const ENTITY_PROPS = {
  project:  [
    { key: 'status',    label: 'Status' },
    { key: 'goal',      label: 'Goals' },
    { key: 'macro',     label: 'Macro Area' },
    { key: 'progress',  label: 'Progress' },
    { key: 'tags',      label: 'Tags' },
  ],
  goal:     [
    { key: 'status',    label: 'Status' },
    { key: 'type',      label: 'Type' },
    { key: 'year',      label: 'Year' },
    { key: 'progress',  label: 'Progress' },
    { key: 'tags',      label: 'Tags' },
  ],
  resource: [
    { key: 'type',      label: 'Type' },
    { key: 'url',       label: 'URL' },
    { key: 'project',   label: 'Projects' },
    { key: 'goal',      label: 'Goals' },
  ],
  note:     [
    { key: 'date',      label: 'Date' },
    { key: 'tags',      label: 'Tags' },
    { key: 'category',  label: 'Category' },
  ],
  sprint:   [
    { key: 'status',    label: 'Status' },
    { key: 'project',   label: 'Projects' },
    { key: 'dates',     label: 'Dates' },
    { key: 'progress',  label: 'Progress' },
  ],
};
function getEntityVisProps(entity) {
  const stored = localStorage.getItem(`entityVisProps_${entity}`);
  let base;
  if (stored) {
    base = JSON.parse(stored);
    if (entity.startsWith('custom_')) {
      // Migration: include newly added prop defs (and tags) not yet in stored visibility list
      const allCustomKeys = ['tags', ...getCustomPropDefs(entity).filter(d => !d._taxonomy).map(d => d.key)];
      const baseSet = new Set(base);
      const hiddenCustom = new Set(JSON.parse(localStorage.getItem(`entityHiddenCustom_${entity}`) || '[]'));
      const newKeys = allCustomKeys.filter(k => !baseSet.has(k) && !hiddenCustom.has(k));
      if (newKeys.length > 0) { base = [...base, ...newKeys]; localStorage.setItem(`entityVisProps_${entity}`, JSON.stringify(base)); }
    }
  } else if (entity.startsWith('custom_')) {
    // Default: tags + all defined props visible for custom entity types
    base = ['tags', ...getCustomPropDefs(entity).filter(d => !d._taxonomy).map(d => d.key)];
  } else {
    base = (ENTITY_PROPS[entity] || []).map(p => p.key);
  }
  // Inject taxonomy props that aren't explicitly hidden by the user for this entity
  const hiddenTax = new Set(JSON.parse(localStorage.getItem(`entityHiddenTax_${entity}`) || '[]'));
  const taxKeys = getGlobalTaxonomyProps().map(tp => `tax_${tp.key}`).filter(k => !hiddenTax.has(k));
  const baseSet = new Set(base);
  return [...base, ...taxKeys.filter(k => !baseSet.has(k))];
}
function setEntityVisProps(entity, keys) {
  // Track which taxonomy props the user explicitly toggled off
  const keySet = new Set(keys);
  const hiddenTax = [];
  getGlobalTaxonomyProps().forEach(tp => {
    const k = `tax_${tp.key}`;
    if (!keySet.has(k)) hiddenTax.push(k);
  });
  if (hiddenTax.length > 0) localStorage.setItem(`entityHiddenTax_${entity}`, JSON.stringify(hiddenTax));
  else localStorage.removeItem(`entityHiddenTax_${entity}`);
  if (entity.startsWith('custom_')) {
    const allCustomKeys = ['tags', ...getCustomPropDefs(entity).filter(d => !d._taxonomy).map(d => d.key)];
    const hiddenCustom = allCustomKeys.filter(k => !keySet.has(k));
    if (hiddenCustom.length > 0) localStorage.setItem(`entityHiddenCustom_${entity}`, JSON.stringify(hiddenCustom));
    else localStorage.removeItem(`entityHiddenCustom_${entity}`);
  }
  localStorage.setItem(`entityVisProps_${entity}`, JSON.stringify(keys));
}
function entityPropVisible(entity, key) {
  return getEntityVisProps(entity).includes(key);
}

/* ─── View Tabs + Filter/Sort System ─────────────────────────────── */

// Operator definitions per field type
const FILTER_OPERATORS = {
  text:         ['is','is_not','contains','not_contains','starts_with','ends_with','is_empty','is_not_empty'],
  select:       ['is','is_not','is_empty','is_not_empty'],
  multi_select: ['contains','not_contains','is_empty','is_not_empty'],
  number:       ['eq','neq','gt','lt','gte','lte','is_empty','is_not_empty'],
  boolean:      ['is_true','is_false'],
  date:         ['is','before','after','is_empty','is_not_empty'],
};
const OPERATOR_LABELS = {
  is:'Is', is_not:'Is not', contains:'Contains', not_contains:'Does not contain',
  starts_with:'Starts with', ends_with:'Ends with', is_empty:'Is empty', is_not_empty:'Is not empty',
  eq:'=', neq:'≠', gt:'>', lt:'<', gte:'≥', lte:'≤',
  is_true:'Checked', is_false:'Unchecked', before:'Before', after:'After',
};

// Filterable field definitions per entity (optionsFn resolved at bind time with live data)
const FILTER_FIELDS = {
  task: [
    { key:'title',        label:'Title',        type:'text' },
    { key:'status',       label:'Status',       type:'select',       options: () => TASK_STATUSES.map(s=>({value:s,label:s.replace(/_/g,' ')})) },
    { key:'priority',     label:'Priority',     type:'select',       options: () => TASK_PRIORITIES.map(p=>({value:p,label:p})) },
    { key:'due_date',     label:'Due Date',     type:'date' },
    { key:'story_points', label:'Story Points', type:'number' },
  ],
  project: [
    { key:'title',      label:'Title',  type:'text' },
    { key:'status',     label:'Status', type:'select', options: () => ['todo','in_progress','blocked','done'].map(s=>({value:s,label:s.replace(/_/g,' ')})) },
    { key:'macro_area', label:'Area',   type:'text' },
  ],
  goal: [
    { key:'title',  label:'Title',  type:'text' },
    { key:'status', label:'Status', type:'select', options: () => ['todo','in_progress','done'].map(s=>({value:s,label:s.replace(/_/g,' ')})) },
    { key:'type',   label:'Type',   type:'text' },
    { key:'year',   label:'Year',   type:'number' },
  ],
  note: [
    { key:'title',         label:'Title',    type:'text' },
    { key:'note_date',     label:'Date',     type:'date' },
    { key:'category_name', label:'Category', type:'select', options: () => allCategories.map(c=>({value:c.name,label:c.name})) },
  ],
  sprint: [
    { key:'title',  label:'Title',  type:'text' },
    { key:'status', label:'Status', type:'select', options: () => ['planned','active','completed'].map(s=>({value:s,label:s})) },
  ],
  resource: [
    { key:'title',         label:'Title', type:'text' },
    { key:'resource_type', label:'Type',  type:'text' },
  ],
};

// Resolve field options at call time
function getFilterFieldOptions(entity, fieldKey) {
  const fieldDef = (FILTER_FIELDS[entity] || []).find(f => f.key === fieldKey);
  if (!fieldDef) return [];
  if (typeof fieldDef.options === 'function') return fieldDef.options();
  return fieldDef.options || [];
}

// View persistence
function getDefaultViews(entity) {
  const defaults = {
    task:     [{id:'_list',  name:'List',  viewType:'list',  filters:[], sorts:[]}],
    project:  [{id:'_cards', name:'Cards', viewType:'cards', filters:[], sorts:[]}],
    goal:     [{id:'_cards', name:'Cards', viewType:'cards', filters:[], sorts:[]}],
    note:     [{id:'_cards', name:'Cards', viewType:'cards', filters:[], sorts:[]}],
    sprint:   [{id:'_cards', name:'Cards', viewType:'cards', filters:[], sorts:[]}],
    resource: [{id:'_table', name:'Table', viewType:'table', filters:[], sorts:[]}],
  };
  // Custom entity types use a fixed key prefix
  if (entity.startsWith('custom_')) {
    return [
      {id:'_list',  name:'List',  viewType:'list',  filters:[], sorts:[]},
      {id:'_cards', name:'Cards', viewType:'cards', filters:[], sorts:[]},
      {id:'_table', name:'Table', viewType:'table', filters:[], sorts:[]},
    ];
  }
  return defaults[entity] || [{id:'_list',name:'List',viewType:'list',filters:[],sorts:[]}];
}
function getEntityViews(entity) {
  try { return JSON.parse(localStorage.getItem(`savedViews_${entity}`)) || getDefaultViews(entity); } catch(e) { return getDefaultViews(entity); }
}
function saveEntityViews(entity, views) { localStorage.setItem(`savedViews_${entity}`, JSON.stringify(views)); }
function getActiveTabId(entity) { return localStorage.getItem(`activeTab_${entity}`) || getEntityViews(entity)[0]?.id; }
function setActiveTabId(entity, id) { localStorage.setItem(`activeTab_${entity}`, id); }
function nanoid() { return Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,10); }

// Filter + sort application
function applyViewFiltersAndSorts(items, view, accessors) {
  const filters = (view && view.filters) || [];
  const sorts = (view && view.sorts) || [];

  // Apply filters with AND/OR chaining
  let filtered = items;
  if (filters.length) {
    filtered = items.filter(item => {
      let result = matchFilterRule(item, filters[0], accessors);
      for (let i = 1; i < filters.length; i++) {
        const prev = filters[i - 1];
        const match = matchFilterRule(item, filters[i], accessors);
        result = (prev.logic === 'or') ? (result || match) : (result && match);
      }
      return result;
    });
  }

  // Apply sorts in order (index 0 = highest precedence — apply last so it wins)
  if (sorts.length) {
    const sortsCopy = [...sorts].reverse(); // reverse so index 0 is applied last
    sortsCopy.forEach(s => {
      const acc = accessors[s.field] || (() => '');
      filtered = [...filtered].sort((a, b) => {
        const av = acc(a), bv = acc(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const na = Number(av), nb = Number(bv);
        const cmp = (!isNaN(na) && !isNaN(nb))
          ? na - nb
          : String(av).localeCompare(String(bv), undefined, {numeric:true, sensitivity:'base'});
        return s.dir === 'desc' ? -cmp : cmp;
      });
    });
  }

  return filtered;
}

function matchFilterRule(item, rule, accessors) {
  const acc = accessors[rule.field];
  const raw = acc ? acc(item) : undefined;
  const op = rule.operator;
  const val = rule.value;

  // No-value operators
  if (op === 'is_empty')    return raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);
  if (op === 'is_not_empty') return raw != null && raw !== '' && !(Array.isArray(raw) && raw.length === 0);
  if (op === 'is_true')  return !!raw;
  if (op === 'is_false') return !raw;

  const strRaw = String(raw ?? '').toLowerCase();
  const strVal = String(val ?? '').toLowerCase();

  if (op === 'is')           return strRaw === strVal;
  if (op === 'is_not')       return strRaw !== strVal;
  if (op === 'contains') {
    if (Array.isArray(raw)) return raw.some(r => String(r).toLowerCase().includes(strVal));
    return strRaw.includes(strVal);
  }
  if (op === 'not_contains') {
    if (Array.isArray(raw)) return !raw.some(r => String(r).toLowerCase().includes(strVal));
    return !strRaw.includes(strVal);
  }
  if (op === 'starts_with')  return strRaw.startsWith(strVal);
  if (op === 'ends_with')    return strRaw.endsWith(strVal);

  // Number operators
  const numRaw = Number(raw), numVal = Number(val);
  if (op === 'eq')  return numRaw === numVal;
  if (op === 'neq') return numRaw !== numVal;
  if (op === 'gt')  return numRaw > numVal;
  if (op === 'lt')  return numRaw < numVal;
  if (op === 'gte') return numRaw >= numVal;
  if (op === 'lte') return numRaw <= numVal;

  // Date operators (compare ISO strings lexicographically)
  if (op === 'before') return strRaw !== '' && strRaw < strVal;
  if (op === 'after')  return strRaw !== '' && strRaw > strVal;

  return true;
}

// Build a view type icon for the tab
function viewTypeIcon(viewType) {
  const icons = { list:'≡', table:'⊞', cards:'⊟', kanban:'⊡', dashboard:'▦', calendar:'◫' };
  return icons[viewType] || '≡';
}

// Build tab bar HTML
// SVG icons for the toolbar
const TB_ICONS = {
  filter:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
  sort:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4-4 4 4"/><path d="M7 4v16"/><path d="M21 16l-4 4-4-4"/><path d="M17 20V4"/></svg>`,
  bolt:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  search:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  expand:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  settings: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};
const ACT_ICONS = {
  addIcon:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  addCover: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
};

function buildViewTabBar(entity, views, activeId) {
  const activeView = views.find(v => v.id === activeId) || views[0];
  const entityLabels = { task:'Task', project:'Project', goal:'Goal', note:'Note', sprint:'Sprint', resource:'Resource' };
  const label = entityLabels[entity] || entity;

  const tabsHtml = views.map(v => {
    const icon = v.icon || viewTypeIcon(v.viewType);
    return `
    <button class="view-tab${v.id === activeId ? ' active' : ''}" data-tab-id="${v.id}" data-tab-entity="${entity}" title="${v.name}">
      <span class="view-tab-icon">${icon}</span>
      <span class="view-tab-name">${v.name}</span>
    </button>`;
  }).join('');

  const hasFilters = (activeView?.filters || []).length > 0;
  const hasSorts   = (activeView?.sorts   || []).length > 0;

  const filterChips = buildFilterChipsHtml(entity, activeView);
  const sortChips   = buildSortChipsHtml(entity, activeView);

  return `<div class="view-tab-bar" id="${entity}-tab-bar">
    <div class="view-tabs" id="${entity}-view-tabs">
      ${tabsHtml}
      <button class="view-tab-add" id="${entity}-add-tab-btn" title="Add view">+</button>
    </div>
    <div class="view-toolbar-right">
      <div class="tb-icons">
        <button class="tb-icon-btn${hasFilters ? ' tb-active' : ''}" id="${entity}-tb-filter" title="Toggle filter/sort bar">${TB_ICONS.filter}</button>
        <button class="tb-icon-btn${hasSorts   ? ' tb-active' : ''}" id="${entity}-tb-sort"   title="Toggle filter/sort bar">${TB_ICONS.sort}</button>
        <button class="tb-icon-btn tb-future"  id="${entity}-tb-bolt"     title="Automations (coming soon)">${TB_ICONS.bolt}</button>
        <button class="tb-icon-btn"            id="${entity}-tb-search"   title="Toggle search">${TB_ICONS.search}</button>
        <button class="tb-icon-btn tb-future"  id="${entity}-tb-expand"   title="Expand (coming soon)">${TB_ICONS.expand}</button>
        <button class="tb-icon-btn"            id="${entity}-tb-settings" title="Settings">${TB_ICONS.settings}</button>
      </div>
      <button class="btn btn-primary" id="new-${entity}-btn">+ New ${label}</button>
    </div>
  </div>
  <div class="filter-sort-bar" id="${entity}-filter-sort-bar" style="display:none">
    <div class="filter-sort-chips" id="${entity}-filter-sort-chips">
      ${filterChips}
      <button class="chip chip-add" id="${entity}-filter-add-btn">+ Filter</button>
      <span class="chip-separator">|</span>
      ${sortChips}
      <button class="chip chip-add" id="${entity}-sort-add-btn">+ Sort</button>
    </div>
  </div>`;
}

function getFilterValueLabel(rule, fd) {
  if (!rule.value || (Array.isArray(rule.value) && !rule.value.length)) return '';
  if (Array.isArray(rule.value)) {
    if (fd && typeof fd.options === 'function') {
      const opts = fd.options();
      return rule.value.map(v => {
        const o = opts.find(x => (typeof x === 'object' ? x.value : x) === v);
        return o ? (typeof o === 'object' ? o.label : o) : v;
      }).join(', ');
    }
    return rule.value.join(', ');
  }
  return String(rule.value);
}

function buildFilterChipsHtml(entity, view) {
  const fields = FILTER_FIELDS[entity] || [];
  return (view && view.filters || []).map(rule => {
    const fd = fields.find(f => f.key === rule.field) || fields[0];
    const noVal = ['is_empty','is_not_empty','is_true','is_false'].includes(rule.operator);
    const opLabel = OPERATOR_LABELS[rule.operator] || rule.operator;
    const valLabel = getFilterValueLabel(rule, fd);
    const text = noVal
      ? `${fd?.label || rule.field}: ${opLabel}`
      : `${fd?.label || rule.field} ${opLabel}${valLabel ? ': ' + valLabel : ''}`;
    const truncated = text.length > 30 ? text.slice(0, 28) + '…' : text;
    return `<button class="chip chip-filter" data-filter-rule-id="${rule.id}" title="${text}">${truncated}</button>`;
  }).join('');
}

function buildSortChipsHtml(entity, view) {
  const fields = FILTER_FIELDS[entity] || [];
  return (view && view.sorts || []).map((s, i) => {
    const fd = fields.find(f => f.key === s.field);
    const arrow = s.dir === 'desc' ? '↓' : '↑';
    return `<button class="chip chip-sort" data-sort-idx="${i}">${arrow} ${fd?.label || s.field}<span class="chip-del" data-sort-del-idx="${i}">×</span></button>`;
  }).join('');
}

function bindFilterSortChips(entity, activeViewRef, onUpdate) {
  const container = document.getElementById(`${entity}-filter-sort-chips`);
  if (!container) return;

  function syncIconState() {
    const hasFilters = (activeViewRef.filters || []).length > 0;
    const hasSorts   = (activeViewRef.sorts   || []).length > 0;
    document.getElementById(`${entity}-tb-filter`)?.classList.toggle('tb-active', hasFilters);
    document.getElementById(`${entity}-tb-sort`)?.classList.toggle('tb-active', hasSorts);
  }

  function rebuild() {
    container.innerHTML =
      buildFilterChipsHtml(entity, activeViewRef) +
      `<button class="chip chip-add" id="${entity}-filter-add-btn">+ Filter</button>` +
      `<span class="chip-separator">|</span>` +
      buildSortChipsHtml(entity, activeViewRef) +
      `<button class="chip chip-add" id="${entity}-sort-add-btn">+ Sort</button>`;
    syncIconState();
    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('.chip-filter').forEach(chip => {
      chip.onclick = (e) => {
        e.stopPropagation();
        const ruleId = chip.dataset.filterRuleId;
        const rule = (activeViewRef.filters || []).find(r => r.id === ruleId);
        if (rule) openFilterPopover(chip, entity, activeViewRef, rule, () => { onUpdate(activeViewRef); rebuild(); });
      };
    });

    container.querySelectorAll('.chip-del[data-sort-del-idx]').forEach(del => {
      del.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(del.dataset.sortDelIdx);
        (activeViewRef.sorts || []).splice(idx, 1);
        onUpdate(activeViewRef); rebuild();
      };
    });

    container.querySelectorAll('.chip-sort').forEach(chip => {
      chip.onclick = (e) => {
        if (e.target.classList.contains('chip-del')) return;
        e.stopPropagation();
        const idx = parseInt(chip.dataset.sortIdx);
        openSortEditPopover(chip, entity, activeViewRef, idx, () => { onUpdate(activeViewRef); rebuild(); });
      };
    });

    const addFilterBtn = document.getElementById(`${entity}-filter-add-btn`);
    if (addFilterBtn) addFilterBtn.onclick = (e) => {
      e.stopPropagation();
      const firstField = (FILTER_FIELDS[entity] || [])[0];
      if (!firstField) return;
      const newRule = { id: nanoid(), field: firstField.key, operator: (FILTER_OPERATORS[firstField.type] || FILTER_OPERATORS.text)[0], value: '', logic: 'and' };
      if (!activeViewRef.filters) activeViewRef.filters = [];
      activeViewRef.filters.push(newRule);
      onUpdate(activeViewRef);
      rebuild();
      const newChip = container.querySelector(`.chip-filter[data-filter-rule-id="${newRule.id}"]`);
      if (newChip) openFilterPopover(newChip, entity, activeViewRef, newRule, () => { onUpdate(activeViewRef); rebuild(); });
    };

    const addSortBtn = document.getElementById(`${entity}-sort-add-btn`);
    if (addSortBtn) addSortBtn.onclick = (e) => {
      e.stopPropagation();
      openSortAddPopover(addSortBtn, entity, activeViewRef, () => { onUpdate(activeViewRef); rebuild(); });
    };
  }

  bindEvents();
}

function openFilterPopover(anchorEl, entity, view, rule, onSave) {
  document.getElementById('_filter-popover')?.remove();
  const fields = FILTER_FIELDS[entity] || [];
  let fd = fields.find(f => f.key === rule.field) || fields[0];
  let fieldType = fd?.type || 'text';
  const noValueOps = ['is_empty','is_not_empty','is_true','is_false'];

  function currentOps() { return FILTER_OPERATORS[fieldType] || FILTER_OPERATORS.text; }
  function opOpts() { return currentOps().map(o => `<option value="${o}"${o===rule.operator?' selected':''}>${OPERATOR_LABELS[o]||o}</option>`).join(''); }
  function fieldOpts() { return fields.map(f => `<option value="${f.key}"${f.key===rule.field?' selected':''}>${f.label}</option>`).join(''); }

  function buildValueHtml() {
    if (noValueOps.includes(rule.operator)) return '';
    if (fieldType === 'select' || fieldType === 'multi_select') {
      const opts = typeof fd?.options === 'function' ? fd.options() : (fd?.options || []);
      const selVals = Array.isArray(rule.value) ? rule.value : (rule.value ? [String(rule.value)] : []);
      return `<div class="fp-option-list">${opts.map(opt => {
        const v = typeof opt === 'object' ? opt.value : opt;
        const l = typeof opt === 'object' ? opt.label : opt;
        const checked = selVals.includes(String(v));
        return `<label class="fp-option-item"><input type="${fieldType==='multi_select'?'checkbox':'radio'}" class="fp-val-check" value="${v}"${checked?' checked':''}> ${l}</label>`;
      }).join('')}</div>`;
    }
    if (fieldType === 'date') return `<input type="date" class="fp-date-input" value="${rule.value||''}">`;
    if (fieldType === 'number') return `<input type="number" class="fp-num-input" placeholder="Type a value…" value="${rule.value||''}">`;
    return `<input type="text" class="fp-text-input" placeholder="Type a value…" value="${rule.value||''}">`;
  }

  const pop = document.createElement('div');
  pop.id = '_filter-popover';
  pop.className = 'filter-popover';
  pop.innerHTML = `
    <div class="fp-header">
      <select class="fp-field-sel">${fieldOpts()}</select>
      <select class="fp-op-sel">${opOpts()}</select>
      <span style="flex:1"></span>
      <button class="fp-del-btn" title="Delete filter">🗑</button>
    </div>
    <div class="fp-value-wrap">${buildValueHtml()}</div>`;

  const rect = anchorEl.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 300);
  pop.style.cssText = `top:${rect.bottom + 6}px;left:${left}px`;
  document.body.appendChild(pop);

  function bindValueEvents() {
    pop.querySelectorAll('.fp-val-check').forEach(chk => {
      chk.onchange = () => {
        if (fieldType === 'multi_select') {
          rule.value = [...pop.querySelectorAll('.fp-val-check:checked')].map(c => c.value);
        } else {
          rule.value = chk.value;
        }
        onSave();
      };
    });
    const inp = pop.querySelector('.fp-text-input,.fp-num-input,.fp-date-input');
    if (inp) inp.oninput = () => { rule.value = inp.value; onSave(); };
  }

  pop.querySelector('.fp-field-sel').onchange = (e) => {
    rule.field = e.target.value;
    fd = fields.find(f => f.key === rule.field) || fields[0];
    fieldType = fd?.type || 'text';
    rule.operator = (FILTER_OPERATORS[fieldType] || FILTER_OPERATORS.text)[0];
    rule.value = '';
    pop.querySelector('.fp-op-sel').innerHTML = opOpts();
    pop.querySelector('.fp-value-wrap').innerHTML = buildValueHtml();
    bindValueEvents();
    onSave();
  };

  pop.querySelector('.fp-op-sel').onchange = (e) => {
    rule.operator = e.target.value;
    if (noValueOps.includes(rule.operator)) rule.value = '';
    pop.querySelector('.fp-value-wrap').innerHTML = buildValueHtml();
    bindValueEvents();
    onSave();
  };

  pop.querySelector('.fp-del-btn').onclick = (e) => {
    e.stopPropagation();
    view.filters = (view.filters || []).filter(r => r.id !== rule.id);
    onSave();
    pop.remove();
  };

  bindValueEvents();
  const close = (e) => { if (!pop.contains(e.target)) pop.remove(); };
  setTimeout(() => document.addEventListener('click', close), 0);
  pop.addEventListener('click', e => e.stopPropagation());
}

function openSortAddPopover(anchorEl, entity, view, onSave) {
  document.getElementById('_sort-popover')?.remove();
  const fields = FILTER_FIELDS[entity] || [];
  const pop = document.createElement('div');
  pop.id = '_sort-popover';
  pop.className = 'filter-popover';
  pop.innerHTML = `<div class="fp-option-list">${fields.map(f =>
    `<div class="fp-option-item sa-field" data-field="${f.key}">${f.label}</div>`
  ).join('')}</div>`;
  const rect = anchorEl.getBoundingClientRect();
  pop.style.cssText = `top:${rect.bottom + 6}px;left:${rect.left}px;min-width:160px`;
  document.body.appendChild(pop);
  pop.querySelectorAll('.sa-field').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      if (!view.sorts) view.sorts = [];
      view.sorts.push({ field: item.dataset.field, dir: 'asc' });
      onSave();
      pop.remove();
    };
  });
  const close = (e) => { if (!pop.contains(e.target)) pop.remove(); };
  setTimeout(() => document.addEventListener('click', close), 0);
  pop.addEventListener('click', e => e.stopPropagation());
}

function openSortEditPopover(anchorEl, entity, view, idx, onSave) {
  document.getElementById('_sort-popover')?.remove();
  const fields = FILTER_FIELDS[entity] || [];
  const sort = (view.sorts || [])[idx];
  if (!sort) return;
  const fieldOpts = fields.map(f => `<option value="${f.key}"${f.key===sort.field?' selected':''}>${f.label}</option>`).join('');
  const pop = document.createElement('div');
  pop.id = '_sort-popover';
  pop.className = 'filter-popover';
  pop.innerHTML = `
    <div class="fp-header">
      <select class="se-field-sel" style="font-size:13px;border:none;background:none;color:var(--text-primary,var(--text));font-weight:500;cursor:pointer">${fieldOpts}</select>
    </div>
    <div class="se-dir-btns">
      <button class="se-dir-btn${sort.dir==='asc'?' active':''}" data-dir="asc">↑ Ascending</button>
      <button class="se-dir-btn${sort.dir==='desc'?' active':''}" data-dir="desc">↓ Descending</button>
    </div>
    <button class="se-del-btn">Delete sort</button>`;
  const rect = anchorEl.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - 240);
  pop.style.cssText = `top:${rect.bottom + 6}px;left:${left}px`;
  document.body.appendChild(pop);
  pop.querySelector('.se-field-sel').onchange = (e) => { sort.field = e.target.value; onSave(); };
  pop.querySelectorAll('.se-dir-btn').forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); sort.dir = btn.dataset.dir; onSave(); pop.remove(); };
  });
  pop.querySelector('.se-del-btn').onclick = (e) => {
    e.stopPropagation(); (view.sorts || []).splice(idx, 1); onSave(); pop.remove();
  };
  const close = (e) => { if (!pop.contains(e.target)) pop.remove(); };
  setTimeout(() => document.addEventListener('click', close), 0);
  pop.addEventListener('click', e => e.stopPropagation());
}

// Bind tab bar interactions
// ── Property Manager Panel ─────────────────────────────────────────────────
// Opens a floating panel anchored to btnEl that lets the user see, add, and
// remove custom property definitions for the given entity type.
function openPropManager(btnEl, entity) {
  const existing = document.getElementById('prop-mgr-panel');
  if (existing) { existing.remove(); return; }

  function render() {
    const defs = getCustomPropDefs(entity);
    const overrides = getPropOverrides(entity);
    const typeSvg = (iconPath) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;
    const rows = defs.length
      ? defs.map(d => {
          const pt = CUSTOM_PROP_TYPES.find(p => p.type === d.type);
          const ov = overrides[d.key] || {};
          const iconHtml = ov.icon
            ? renderEntityIcon(ov.icon, 14)
            : d.icon
              ? renderEntityIcon(d.icon, 14)
              : (pt ? typeSvg(pt.icon) : '');
          const labelText = ov.label || d.label;
          return `<div class="prop-mgr-row" data-key="${d.key}">
            <span class="prop-mgr-icon">${iconHtml}</span>
            <span class="prop-mgr-label">${escHtml(labelText)}</span>
            <span class="prop-mgr-type">${d._taxonomy ? 'taxonomy' : d.type}</span>
            ${!d._taxonomy ? `<button class="prop-mgr-edit" data-key="${d.key}" title="Edit" style="background:none;border:none;cursor:pointer;opacity:0;color:var(--text-muted);font-size:13px;padding:0 2px;flex-shrink:0;transition:opacity 80ms">✏</button>` : ''}
            ${!d._taxonomy ? `<button class="prop-mgr-del" data-key="${d.key}" title="Remove">×</button>` : ''}
          </div>`;
        }).join('')
      : `<div class="prop-mgr-empty">No custom properties yet</div>`;

    const curFmt = getDateFormat();
    panel.innerHTML = `
      <div class="prop-mgr-header">
        <span>Properties · ${entity.charAt(0).toUpperCase()+entity.slice(1)}</span>
        <button class="btn btn-sm btn-ghost" id="prop-mgr-edit-all-btn" style="font-size:11px;padding:2px 6px">Edit all</button>
        <button class="prop-mgr-close" id="prop-mgr-close-btn">×</button>
      </div>
      <div class="prop-mgr-list">${rows}</div>
      <div class="prop-mgr-footer">
        <span class="add-prop-btn prop-mgr-add-btn" data-entity="${entity}">+ Add property</span>
      </div>
      <div style="border-top:1px solid var(--border);padding:10px 12px 8px">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:6px">Date display</div>
        <select id="prop-mgr-date-fmt" style="width:100%;font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text-primary);cursor:pointer">
          <option value="short"${curFmt==='short'?' selected':''}>Jun 22 (Month + Day)</option>
          <option value="long"${curFmt==='long'?' selected':''}>June 22, 2026 (Full)</option>
          <option value="numeric"${curFmt==='numeric'?' selected':''}>6/22/2026 (US)</option>
          <option value="eu"${curFmt==='eu'?' selected':''}>22/06/2026 (EU)</option>
          <option value="iso"${curFmt==='iso'?' selected':''}>2026-06-22 (ISO)</option>
        </select>
      </div>`;

    // Show edit button on hover (CSS already handles del; add same for edit)
    panel.querySelectorAll('.prop-mgr-row').forEach(row => {
      row.addEventListener('mouseenter', () => { const eb = row.querySelector('.prop-mgr-edit'); if (eb) eb.style.opacity = '1'; });
      row.addEventListener('mouseleave', () => { const eb = row.querySelector('.prop-mgr-edit'); if (eb) eb.style.opacity = '0'; });
    });

    panel.querySelectorAll('.prop-mgr-del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const key = btn.dataset.key;
        if (!confirm(`Remove property "${key}" from all ${entity}s?`)) return;
        const defs = getCustomPropDefs(entity).filter(d => d.key !== key);
        setCustomPropDefs(entity, defs);
        const ord = getEntityPropOrder(entity);
        if (ord) setEntityPropOrder(entity, ord.filter(k => k !== key));
        document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
        render();
      };
    });

    panel.querySelectorAll('.prop-mgr-edit').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openPropEditModal(entity, btn.dataset.key, render);
      };
    });

    document.getElementById('prop-mgr-edit-all-btn').onclick = (e) => {
      e.stopPropagation();
      panel.remove();
      openAllPropsEditorModal(entity);
    };
    document.getElementById('prop-mgr-close-btn').onclick = () => panel.remove();
    bindAddPropBtn(entity, () => { render(); document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } })); });
    const dateFmtSel = document.getElementById('prop-mgr-date-fmt');
    if (dateFmtSel) dateFmtSel.onchange = () => { localStorage.setItem('_globalDateFormat', dateFmtSel.value); renderView(currentView); };
  }

  const panel = document.createElement('div');
  panel.id = 'prop-mgr-panel';
  panel.className = 'prop-mgr-panel';
  document.body.appendChild(panel);
  render();

  const rect = btnEl.getBoundingClientRect();
  panel.style.top = (rect.bottom + 6) + 'px';
  panel.style.right = (window.innerWidth - rect.right) + 'px';

  const dismiss = (e) => {
    if (!panel.contains(e.target) && e.target !== btnEl) {
      panel.remove();
      document.removeEventListener('mousedown', dismiss, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', dismiss, true), 10);
}

// Opens a small modal to edit icon + label for a single custom prop
function openPropEditModal(entity, key, onSave) {
  const defs = getCustomPropDefs(entity);
  const def = defs.find(d => d.key === key);
  if (!def) return;
  const overrides = getPropOverrides(entity);
  const ov = overrides[key] || {};
  const currentLabel = ov.label || def.label;
  let selectedIcon = ov.icon || def.icon || '';

  const body = `
    <div style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
      <div style="display:flex;align-items:center;gap:12px">
        <div>
          <label class="form-label" style="display:block;margin-bottom:4px">Icon</label>
          <button id="pep-icon-btn" class="btn btn-sm" style="width:48px;height:48px;font-size:22px;border:2px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card)">
            ${selectedIcon ? renderEntityIcon(selectedIcon, 22) : '<span style="font-size:20px;color:var(--text-dim)">+</span>'}
          </button>
        </div>
        <div style="flex:1">
          <label class="form-label">Name</label>
          <input type="text" id="pep-label" value="${escHtml(currentLabel)}" style="width:100%;box-sizing:border-box" />
        </div>
      </div>
      <div class="form-actions" style="margin:0">
        <button class="btn btn-ghost" id="pep-cancel">Cancel</button>
        <button class="btn btn-primary" id="pep-save">Save</button>
      </div>
    </div>`;

  openModal(`Edit: ${def.label}`, body, null);

  // Wire icon picker button
  document.getElementById('pep-icon-btn').onclick = (e) => {
    e.stopPropagation();
    showIconPicker(document.getElementById('pep-icon-btn'), entity, null, selectedIcon, (icon) => {
      selectedIcon = icon;
      const btn = document.getElementById('pep-icon-btn');
      if (btn) btn.innerHTML = icon ? renderEntityIcon(icon, 22) : '<span style="font-size:20px;color:var(--text-dim)">+</span>';
    });
  };

  document.getElementById('pep-cancel').onclick = closeModal;
  document.getElementById('pep-save').onclick = () => {
    const newLabel = document.getElementById('pep-label').value.trim();
    if (!newLabel) { showToast('Name is required', 'error'); return; }
    const ovs = getPropOverrides(entity);
    ovs[key] = { label: newLabel, icon: selectedIcon };
    if (!selectedIcon) delete ovs[key].icon;
    if (ovs[key] && !ovs[key].label && !ovs[key].icon) delete ovs[key];
    setPropOverrides(entity, ovs);
    const defs2 = getCustomPropDefs(entity);
    const idx = defs2.findIndex(d => d.key === key);
    if (idx !== -1) {
      defs2[idx].label = newLabel;
      if (selectedIcon) defs2[idx].icon = selectedIcon; else delete defs2[idx].icon;
      setCustomPropDefs(entity, defs2);
    }
    closeModal();
    document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
    if (onSave) onSave();
  };
}

// Opens the full-screen property editor modal listing ALL props (built-in + custom)
function openAllPropsEditorModal(entity) {
  const BUILTIN_PROPS = {
    task:    ['status','priority','due','focus','tags','category','goal','project','points','recur'],
    goal:    ['status','type','year','tags','category','due','metrics'],
    project: ['status','due','goal','tags','category','macro','kanban','archived'],
    sprint:  ['status'],
    note:    ['date','project','goal','tags','category'],
  };
  const builtinKeys = BUILTIN_PROPS[entity] || [];
  const customDefs = getCustomPropDefs(entity);
  const overrides = getPropOverrides(entity);

  // Mutable icon state (key → selected icon string)
  const iconState = {};
  builtinKeys.forEach(k => { iconState[k] = (overrides[k] || {}).icon || ''; });
  customDefs.forEach(d => { iconState[d.key] = (overrides[d.key] || {}).icon || d.icon || ''; });

  const iconBtnHtml = (k, icon) =>
    `<button class="pae-icon-btn" data-key="${k}" title="Pick icon"
      style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);cursor:pointer;flex-shrink:0;transition:border-color 120ms">
      ${icon ? renderEntityIcon(icon, 18) : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'}
    </button>`;

  const rowStyle = 'display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--color-border)';

  const builtinRows = builtinKeys.map(k => {
    const ov = overrides[k] || {};
    return `<div style="${rowStyle}">
      ${iconBtnHtml(k, iconState[k])}
      <div style="flex:1;min-width:0">
        <input class="pae-label" data-key="${k}" type="text" value="${escHtml(ov.label || k)}"
          style="width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text);padding:5px 8px;font-size:13px;box-sizing:border-box" />
      </div>
      <span style="width:52px;text-align:right;font-size:10px;color:var(--text-muted);flex-shrink:0;font-weight:500;letter-spacing:.03em;text-transform:uppercase">built-in</span>
    </div>`;
  }).join('');

  const customRows = customDefs.map(d => {
    const ov = overrides[d.key] || {};
    return `<div style="${rowStyle}">
      ${iconBtnHtml(d.key, iconState[d.key])}
      <div style="flex:1;min-width:0">
        <input class="pae-label" data-key="${d.key}" type="text" value="${escHtml(ov.label || d.label)}"
          style="width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text);padding:5px 8px;font-size:13px;box-sizing:border-box" />
      </div>
      <span style="width:52px;text-align:right;font-size:10px;color:var(--text-muted);flex-shrink:0;font-weight:500;letter-spacing:.03em;text-transform:uppercase">${d.type}</span>
    </div>`;
  }).join('');

  const sectionHead = (label) =>
    `<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:12px 0 4px">${label}</div>`;

  const body = `
    <div style="display:flex;flex-direction:column;padding:4px 0">
      ${builtinKeys.length ? sectionHead('Built-in') + builtinRows : ''}
      ${customDefs.length ? sectionHead('Custom') + customRows : ''}
      ${!builtinKeys.length && !customDefs.length ? '<div style="color:var(--text-muted);font-size:13px;padding:12px 0;text-align:center">No properties defined yet.</div>' : ''}
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost" id="pae-cancel">Cancel</button>
        <button class="btn btn-primary" id="pae-save">Save all</button>
      </div>
    </div>`;

  openModal(`Edit Properties · ${entity.charAt(0).toUpperCase()+entity.slice(1)}`, body, null);

  // Wire icon picker buttons
  document.querySelectorAll('#modal-body .pae-icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = btn.dataset.key;
      showIconPicker(btn, entity, null, iconState[k], (icon) => {
        iconState[k] = icon;
        btn.innerHTML = icon ? renderEntityIcon(icon, 18) : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      });
    });
  });

  document.getElementById('pae-cancel').onclick = closeModal;
  document.getElementById('pae-save').onclick = () => {
    const newOvs = { ...overrides };
    document.querySelectorAll('#modal-body .pae-label').forEach(inp => {
      const k = inp.dataset.key;
      const newLabel = inp.value.trim();
      const newIcon = iconState[k] || '';
      if (!newOvs[k]) newOvs[k] = {};
      if (newLabel) newOvs[k].label = newLabel; else delete newOvs[k].label;
      if (newIcon) newOvs[k].icon = newIcon; else delete newOvs[k].icon;
      if (!newOvs[k].label && !newOvs[k].icon) delete newOvs[k];
    });
    setPropOverrides(entity, newOvs);
    const defs2 = getCustomPropDefs(entity);
    defs2.forEach(d => {
      const ov2 = newOvs[d.key] || {};
      if (ov2.label) d.label = ov2.label;
      if (ov2.icon) d.icon = ov2.icon; else delete d.icon;
    });
    setCustomPropDefs(entity, defs2);
    closeModal();
    document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
    showToast('Properties updated', 'success');
  };
}

function bindViewTabBar(entity, onTabSwitch, onViewsChanged) {
  // Tab clicks — use mousedown to avoid conflict with dblclick/rename
  document.querySelectorAll(`#${entity}-view-tabs .view-tab`).forEach(tab => {
    tab.onclick = (e) => {
      if (e.target.tagName === 'INPUT') return; // rename mode
      if (tab.dataset.renaming) return;
      setActiveTabId(entity, tab.dataset.tabId);
      // Update active class visually without waiting for full re-render
      document.querySelectorAll(`#${entity}-view-tabs .view-tab`).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      onTabSwitch(tab.dataset.tabId);
    };
    // Double-click to rename
    tab.ondblclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const nameEl = tab.querySelector('.view-tab-name');
      if (!nameEl) return;
      tab.dataset.renaming = '1';
      const oldName = nameEl.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = oldName;
      input.className = 'view-tab-rename-input';
      const w = Math.max(oldName.length * 8 + 20, 50);
      input.style.cssText = `width:${w}px;min-width:40px;max-width:180px`;
      nameEl.replaceWith(input);
      // Use rAF to ensure DOM is ready before focusing
      requestAnimationFrame(() => { input.focus(); input.select(); });
      const finish = (save) => {
        if (!tab.contains(input)) return; // already finished
        const newName = save ? (input.value.trim() || oldName) : oldName;
        if (save && newName !== oldName) {
          const views = getEntityViews(entity);
          const v = views.find(v => v.id === tab.dataset.tabId);
          if (v) { v.name = newName; saveEntityViews(entity, views); }
        }
        const span = document.createElement('span');
        span.className = 'view-tab-name';
        span.textContent = newName;
        input.replaceWith(span);
        delete tab.dataset.renaming;
      };
      input.onblur = () => finish(true);
      input.onkeydown = (ke) => {
        ke.stopPropagation();
        if (ke.key === 'Enter') { ke.preventDefault(); finish(true); }
        if (ke.key === 'Escape') { ke.preventDefault(); finish(false); }
      };
      input.onclick = (ce) => ce.stopPropagation();
    };
    // Right-click context menu
    tab.oncontextmenu = (e) => {
      e.preventDefault();
      const views = getEntityViews(entity);
      const menu = document.createElement('div');
      menu.className = 'ctx-menu';
      menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;z-index:9100`;
      const canDelete = views.length > 1;
      menu.innerHTML = `
        <div class="ctx-menu-item" id="tab-ctx-rename">Rename</div>
        <div class="ctx-menu-item" id="tab-ctx-icon">Change icon</div>
        <div class="ctx-menu-item" id="tab-ctx-duplicate">Duplicate</div>
        ${canDelete ? `<div class="ctx-menu-separator"></div><div class="ctx-menu-item ctx-menu-item--danger" id="tab-ctx-delete">Delete</div>` : ''}
      `;
      document.body.appendChild(menu);
      const remove = () => menu.remove();
      document.addEventListener('click', remove, {once:true});
      menu.querySelector('#tab-ctx-rename')?.addEventListener('click', (e) => { e.stopPropagation(); remove(); tab.dispatchEvent(new MouseEvent('dblclick', {bubbles:true})); });
      menu.querySelector('#tab-ctx-icon')?.addEventListener('click', (e) => {
        e.stopPropagation(); remove();
        const tabId = tab.dataset.tabId;
        const iconOptions = ['≡','⊞','⊟','⊡','▦','◫','★','●','◆','▲','☰','♦','✦','⬡','⬢'];
        const iconPop = document.createElement('div');
        iconPop.className = 'ctx-menu';
        iconPop.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;z-index:9200;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;padding:8px`;
        iconPop.innerHTML = iconOptions.map(ic => `<button class="tab-icon-opt" style="font-size:16px;padding:6px;border:none;background:none;cursor:pointer;border-radius:4px">${ic}</button>`).join('');
        document.body.appendChild(iconPop);
        const removeIconPop = () => iconPop.remove();
        setTimeout(() => document.addEventListener('click', removeIconPop, {once:true}), 0);
        iconPop.addEventListener('click', ev => ev.stopPropagation());
        iconPop.querySelectorAll('.tab-icon-opt').forEach(btn => {
          btn.onmouseenter = () => { btn.style.background = 'var(--bg-hover)'; };
          btn.onmouseleave = () => { btn.style.background = 'none'; };
          btn.onclick = (ev) => {
            ev.stopPropagation(); removeIconPop();
            const vs = getEntityViews(entity);
            const v = vs.find(v => v.id === tabId);
            if (v) { v.icon = btn.textContent; saveEntityViews(entity, vs); onViewsChanged(vs); }
          };
        });
      });
      menu.querySelector('#tab-ctx-duplicate')?.addEventListener('click', (e) => {
        e.stopPropagation(); remove();
        const src = views.find(v => v.id === tab.dataset.tabId);
        if (src) {
          const copy = JSON.parse(JSON.stringify(src));
          copy.id = nanoid(); copy.name = src.name + ' copy';
          const idx = views.indexOf(src);
          views.splice(idx + 1, 0, copy);
          saveEntityViews(entity, views);
          setActiveTabId(entity, copy.id);
          onViewsChanged(views);
        }
      });
      menu.querySelector('#tab-ctx-delete')?.addEventListener('click', (e) => {
        e.stopPropagation(); remove();
        const idx = views.findIndex(v => v.id === tab.dataset.tabId);
        if (idx >= 0 && views.length > 1) {
          views.splice(idx, 1);
          saveEntityViews(entity, views);
          const newActive = views[Math.min(idx, views.length-1)].id;
          setActiveTabId(entity, newActive);
          onViewsChanged(views);
        }
      });
    };
  });

  // Add tab button → popover with view type picker
  const addBtn = document.getElementById(`${entity}-add-tab-btn`);
  if (addBtn) {
    addBtn.onclick = (e) => {
      e.stopPropagation();
      const existing = document.getElementById('add-tab-popover');
      if (existing) { existing.remove(); return; }
      const rect = addBtn.getBoundingClientRect();
      const pop = document.createElement('div');
      pop.id = 'add-tab-popover';
      pop.className = 'ctx-menu';
      pop.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;z-index:9100;min-width:160px`;
      const types = ['list','table','cards','kanban','dashboard'];
      pop.innerHTML = types.map(t => `<div class="ctx-menu-item add-tab-type-btn" data-type="${t}" style="gap:8px"><span>${viewTypeIcon(t)}</span> ${t.charAt(0).toUpperCase()+t.slice(1)}</div>`).join('');
      document.body.appendChild(pop);
      const remove = () => pop.remove();
      document.addEventListener('click', remove, {once:true});
      pop.querySelectorAll('.add-tab-type-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation(); remove();
          const vt = btn.dataset.type;
          const views = getEntityViews(entity);
          const newView = { id: nanoid(), name: vt.charAt(0).toUpperCase()+vt.slice(1), viewType: vt, filters: [], sorts: [] };
          views.push(newView);
          saveEntityViews(entity, views);
          setActiveTabId(entity, newView.id);
          onViewsChanged(views);
        };
      });
    };
  }

  // Toolbar icon buttons: filter, sort → toggle filter-sort-bar; others no-op for now
  const filterSortBar = document.getElementById(`${entity}-filter-sort-bar`);
  const tbFilter = document.getElementById(`${entity}-tb-filter`);
  const tbSort   = document.getElementById(`${entity}-tb-sort`);
  const tbSearch = document.getElementById(`${entity}-tb-search`);

  function toggleFilterSortBar() {
    if (!filterSortBar) return;
    const hidden = filterSortBar.style.display === 'none';
    filterSortBar.style.display = hidden ? '' : 'none';
  }

  if (tbFilter) tbFilter.onclick = (e) => { e.stopPropagation(); toggleFilterSortBar(); };
  if (tbSort)   tbSort.onclick   = (e) => { e.stopPropagation(); toggleFilterSortBar(); };

  // Bolt button → open automations overlay
  const tbBolt = document.getElementById(`${entity}-tb-bolt`);
  if (tbBolt) {
    tbBolt.classList.remove('tb-future');
    tbBolt.title = 'Automations';
    // Tasks always have the built-in Recurring automation, so bolt is always active
    const refreshBoltState = () => {
      if (entity === 'task') { tbBolt.classList.add('tb-active'); return; }
      api('GET', `/api/automations?entity_type=${entity}`).then(list => {
        tbBolt.classList.toggle('tb-active', !!(list && list.length > 0));
      }).catch(() => {});
    };
    refreshBoltState();
    tbBolt.onclick = (e) => {
      e.stopPropagation();
      showAutomationsOverlay(entity, refreshBoltState);
    };
  }

  // Settings/Properties button → open property manager panel
  const tbSettings = document.getElementById(`${entity}-tb-settings`);
  if (tbSettings) tbSettings.onclick = (e) => { e.stopPropagation(); openPropManager(tbSettings, entity); };

  // Search toggle: show/hide a search input row below the tab bar
  if (tbSearch) tbSearch.onclick = (e) => {
    e.stopPropagation();
    const existingSearch = document.getElementById(`${entity}-search-bar`);
    if (existingSearch) {
      existingSearch.remove();
      tbSearch.classList.remove('tb-active');
      return;
    }
    const bar = document.createElement('div');
    bar.id = `${entity}-search-bar`;
    bar.className = 'entity-search-bar';
    bar.innerHTML = `<input type="text" class="entity-search-input" placeholder="Search…" id="${entity}-search-input" autocomplete="off">`;
    const tabBar = document.getElementById(`${entity}-tab-bar`);
    if (tabBar) tabBar.insertAdjacentElement('afterend', bar);
    tbSearch.classList.add('tb-active');
    const inp = document.getElementById(`${entity}-search-input`);
    if (inp) { inp.focus(); inp.oninput = () => { /* search handled per-entity */ }; }
  };
}


// Build a reusable property visibility panel and wire it up.
// anchorEl: the button/wrap element to append the panel to
// props: array of {key, label}
// getVis: () => string[]  — current visible keys
// setVis: (keys) => void  — persist new keys
// onToggle: () => void    — called after toggling (e.g. render())
function bindPropVisPanel(anchorEl, props, getVis, setVis, onToggle) {
  const existing = document.getElementById('prop-vis-panel');
  if (existing) { existing.remove(); return; }
  const eyeOn  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOff = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const vis = getVis();
  const panel = document.createElement('div');
  panel.id = 'prop-vis-panel';
  panel.className = 'prop-vis-panel';
  panel.innerHTML = `<div style="padding:6px 12px 4px;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Property visibility</div>` +
    props.map(p => {
      const on = vis.includes(p.key);
      return `<div class="prop-vis-row${on?'':' hidden-prop'}" data-prop="${p.key}">
        <span class="prop-vis-name">${p.label}</span>
        <span class="prop-vis-eye">${on ? eyeOn : eyeOff}</span>
      </div>`;
    }).join('');
  anchorEl.appendChild(panel);
  panel.querySelectorAll('.prop-vis-row').forEach(row => {
    row.onclick = () => {
      const key = row.dataset.prop;
      let cur = getVis();
      if (cur.includes(key)) cur = cur.filter(k => k !== key);
      else cur = [...cur, key];
      setVis(cur);
      row.classList.toggle('hidden-prop', !cur.includes(key));
      row.querySelector('.prop-vis-eye').innerHTML = cur.includes(key) ? eyeOn : eyeOff;
      onToggle();
    };
  });
  document.addEventListener('click', function outsideClick(e) {
    if (!panel.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target)) {
      panel.remove();
      document.removeEventListener('click', outsideClick);
    }
  });
}

// ── Custom property definitions (schema-level, stored in localStorage until backend ready) ──
const CUSTOM_PROP_TYPES = [
  { type: 'text',         label: 'Text',         icon: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/>' },
  { type: 'number',       label: 'Number',       icon: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>' },
  { type: 'select',       label: 'Select',       icon: '<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>' },
  { type: 'multi_select', label: 'Multi-select', icon: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="2"/><circle cx="3" cy="12" r="2"/><circle cx="3" cy="18" r="2"/>' },
  { type: 'status',       label: 'Status',       icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
  { type: 'date',         label: 'Date',         icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
  { type: 'checkbox',     label: 'Checkbox',     icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>' },
  { type: 'url',          label: 'URL',          icon: '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' },
  { type: 'phone',        label: 'Phone',        icon: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.02 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>' },
  { type: 'email',        label: 'Email',        icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
  { type: 'relation',     label: 'Relation',     icon: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="15 6 21 12 15 18"/><polyline points="9 6 3 12 9 18"/>' },
];

async function getConnectedPropTypes() {
  if (_connectedPropTypesCache) return _connectedPropTypesCache;
  try {
    const integrations = await api('GET', '/api/integrations');
    _connectedPropTypesCache = integrations.map(i => ({
      type: `connected:${i.id}`,
      label: i.label || `${i.app_id}: ${i.name}`,
      icon: '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>',
      connected: true,
      integrationId: i.id,
    }));
    return _connectedPropTypesCache;
  } catch { return []; }
}

function getPropLabelWidth() {
  return parseInt(localStorage.getItem('propLabelWidth') || '130', 10);
}
function setPropLabelWidth(w) {
  localStorage.setItem('propLabelWidth', String(Math.max(60, Math.min(280, w))));
}

function getCustomPropDefs(entity) {
  const stored = localStorage.getItem(`customPropDefs_${entity}`);
  const entityDefs = stored ? JSON.parse(stored) : [];
  const taxProps = getGlobalTaxonomyProps();
  const entityKeys = new Set(entityDefs.map(d => d.key));
  const taxDefs = taxProps
    .filter(tp => !entityKeys.has(`tax_${tp.key}`))
    .map(tp => {
      const opts = getTaxonomyOptions(tp.key);
      const optionColors = {};
      opts.forEach(o => { if (o.color) optionColors[o.name] = o.color; });
      return { key: `tax_${tp.key}`, label: tp.label, type: 'multi_select', options: opts.map(o => o.name), optionColors, _taxonomy: tp.key };
    });
  return [...entityDefs, ...taxDefs];
}

function setCustomPropDefs(entity, defs) {
  // Taxonomy defs are global; save their option changes to taxonomy storage, not entity storage
  const taxDefs = defs.filter(d => d._taxonomy);
  const entityDefs = defs.filter(d => !d._taxonomy);
  taxDefs.forEach(d => {
    const existing = getTaxonomyOptions(d._taxonomy);
    const opts = (d.options || []).map(name => {
      const prev = existing.find(o => o.name === name);
      return { id: prev ? prev.id : String(Date.now() + Math.random()), name, color: (d.optionColors || {})[name] || '' };
    });
    saveTaxonomyOptions(d._taxonomy, opts);
  });
  localStorage.setItem(`customPropDefs_${entity}`, JSON.stringify(entityDefs));
}

// ── Disabled Built-in Entities ────────────────────────────────────────────
// Stores which built-in entity nav items the user has "deleted" (hidden).
function getDisabledBuiltinEntities() {
  try { return JSON.parse(localStorage.getItem('disabledBuiltinEntities') || '[]'); } catch { return []; }
}
function setDisabledBuiltinEntities(list) {
  localStorage.setItem('disabledBuiltinEntities', JSON.stringify(list));
}
function applyDisabledBuiltinEntities() {
  const disabled = new Set(getDisabledBuiltinEntities());
  document.querySelectorAll('[data-view]').forEach(el => {
    const view = el.dataset.view;
    if (disabled.has(view)) el.style.display = 'none';
    else if (el.style.display === 'none' && !disabled.has(view)) el.style.display = '';
  });
}

// ── Global Taxonomy Props ─────────────────────────────────────────────────
function getGlobalTaxonomyProps() {
  const s = localStorage.getItem('globalTaxonomyProps');
  return s ? JSON.parse(s) : [];
}
function saveGlobalTaxonomyProps(props) {
  localStorage.setItem('globalTaxonomyProps', JSON.stringify(props));
}
function getTaxonomyOptions(key) {
  const s = localStorage.getItem(`taxonomyOpts_${key}`);
  return s ? JSON.parse(s) : [];
}
function saveTaxonomyOptions(key, options) {
  localStorage.setItem(`taxonomyOpts_${key}`, JSON.stringify(options));
}

function renderTaxonomyNav() {
  const container = document.getElementById('taxonomy-custom-nav');
  if (!container) return;
  const props = getGlobalTaxonomyProps();
  container.innerHTML = props.map(tp => `
    <a class="nav-item" data-view="taxonomy:${escHtml(tp.key)}" href="#">
      <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5.5" y2="17"/><line x1="12" y1="7" x2="18.5" y2="17"/></svg>
      <span>${escHtml(tp.label)}</span>
    </a>
  `).join('');
  container.querySelectorAll('[data-view]').forEach(a => {
    a.onclick = e => { e.preventDefault(); renderView(a.dataset.view); };
  });
}

function showNewTaxonomyModal() {
  const body = `
    <div class="form-group"><label class="form-label">Name *</label>
      <input type="text" id="tax-name" placeholder="e.g. Types, Contexts, Areas…" /></div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:4px">This creates a global multiselect property that appears on all entities in their property panels.</p>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Create</button>
    </div>`;
  openModal('New Taxonomy Property', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  setTimeout(() => document.getElementById('tax-name')?.focus(), 50);
  document.getElementById('modal-save-btn').onclick = () => {
    const label = document.getElementById('tax-name')?.value.trim() || '';
    if (!label) { showToast('Name is required', 'error'); return; }
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const props = getGlobalTaxonomyProps();
    if (props.some(p => p.key === key)) { showToast('A taxonomy with this name already exists', 'error'); return; }
    props.push({ key, label });
    saveGlobalTaxonomyProps(props);
    closeModal();
    renderTaxonomyNav();
    renderView(`taxonomy:${key}`);
  };
}

// Prop label/icon overrides (user-renamed built-in or custom props)
function getPropOverrides(entity) {
  const stored = localStorage.getItem(`propOverrides_${entity}`);
  return stored ? JSON.parse(stored) : {};
}
function setPropOverrides(entity, overrides) {
  localStorage.setItem(`propOverrides_${entity}`, JSON.stringify(overrides));
}

// Parse a relation value (legacy [[Title]] or new [{id,label},...] JSON)
function parseRelationValue(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const m = raw.match(/^\[\[(.+)\]\]$/);
  if (m) return [{ id: '', label: m[1] }];
  return [];
}

function getCustomPropValues(entity, recordId) {
  const stored = localStorage.getItem(`customPropVals_${entity}_${recordId}`);
  return stored ? JSON.parse(stored) : {};
}

function setCustomPropValue(entity, recordId, key, value) {
  const vals = getCustomPropValues(entity, recordId);
  vals[key] = value;
  localStorage.setItem(`customPropVals_${entity}_${recordId}`, JSON.stringify(vals));
  // Sync to backend (persists to DB + Obsidian vault frontmatter)
  api('POST', `/api/properties?entity_type=${entity}&entity_id=${recordId}`, { key, value: String(value) })
    .catch(e => console.warn('[vault] custom prop sync failed:', e));
  // Refresh custom prop chips in any visible list/cards/kanban row for this record
  document.querySelectorAll(`.task-chips-outer[data-entity="${entity}"][data-rid="${recordId}"]`).forEach(el => {
    el.innerHTML = renderCustomPropChips(entity, recordId, el.dataset.vm || 'list');
  });
}

/* ─── Rich Content / EditorJS helpers ───────────────────────────────── */
const _activeEditors = {};

function buildRichContentSection(entity, entityId) {
  const hostId = `editorjs-${entity}-${entityId}`;
  return `<div class="rich-content-section">
    <div class="rich-section-label">Content</div>
    <div id="${hostId}" class="rich-editor-host"></div>
  </div>`;
}

function editorJsToMarkdown(data) {
  if (!data || !data.blocks) return '';
  return data.blocks.map(b => {
    const txt = s => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    switch (b.type) {
      case 'header':    return '#'.repeat(b.data.level||2) + ' ' + txt(b.data.text);
      case 'paragraph': return txt(b.data.text);
      case 'list': {
        const items = b.data.items || [];
        return items.map((it,i) => (b.data.style==='ordered' ? `${i+1}.` : '-') + ' ' + txt(typeof it === 'string' ? it : it.content||it.text||'')).join('\n');
      }
      case 'checklist': return (b.data.items||[]).map(it => `- [${it.checked?'x':' '}] ${txt(it.text)}`).join('\n');
      case 'quote':     return `> ${txt(b.data.text)}\n> — ${txt(b.data.caption)}`;
      case 'code':      return '```\n' + (b.data.code||'') + '\n```';
      case 'delimiter': return '---';
      case 'table': {
        const rows = b.data.content || [];
        if (!rows.length) return '';
        const r0 = rows[0].map(c => txt(c));
        return '| ' + r0.join(' | ') + ' |\n| ' + r0.map(()=>'---').join(' | ') + ' |\n' +
          rows.slice(1).map(r => '| ' + r.map(c=>txt(c)).join(' | ') + ' |').join('\n');
      }
      default: return '';
    }
  }).filter(Boolean).join('\n\n');
}

async function initRichEditor(hostId, entity, entityId, isFullscreen) {
  if (!window.EditorJS) return;
  const container = document.getElementById(hostId);
  if (!container) return;

  // Destroy prior instance
  if (_activeEditors[hostId]) {
    try { await _activeEditors[hostId].destroy(); } catch {}
    delete _activeEditors[hostId];
  }

  // Load saved content from entity's content_json field
  let savedData = null;
  const _isCustomEnt = entity.startsWith('custom_');
  if (!_isCustomEnt) {
    try {
      const _epaths = { task: 'tasks', note: 'notes', goal: 'goals', project: 'projects', sprint: 'sprints', resource: 'resources' };
      const _ent = await api('GET', `/api/${_epaths[entity] || entity + 's'}/${entityId}`);
      if (_ent.content_json) { savedData = JSON.parse(_ent.content_json); }
    } catch {}
  }
  // Fall back to local cache (primary for custom entities)
  if (!savedData) {
    const vals = getCustomPropValues(entity, entityId);
    const cached = vals._rich_content || vals.rich_content;
    if (cached) { try { savedData = JSON.parse(cached); } catch {} }
  }

  const TOOLS = {};
  if (window.Header)      TOOLS.header      = { class: window.Header, config: { placeholder: 'Heading', levels: [1,2,3] } };
  if (window.SimpleImage) TOOLS.image       = { class: window.SimpleImage };
  if (window.List)        TOOLS.list        = { class: window.List, inlineToolbar: true };
  if (window.Checklist)   TOOLS.checklist   = { class: window.Checklist, inlineToolbar: true };
  if (window.Quote)       TOOLS.quote       = { class: window.Quote, inlineToolbar: true };
  if (window.CodeTool)    TOOLS.code        = window.CodeTool;
  if (window.Delimiter)   TOOLS.delimiter   = window.Delimiter;
  if (window.RawTool)     TOOLS.raw         = window.RawTool;
  if (window.Warning)     TOOLS.warning     = { class: window.Warning, inlineToolbar: true };
  if (window.Marker)      TOOLS.marker      = { class: window.Marker };
  if (window.InlineCode)  TOOLS.inlineCode  = { class: window.InlineCode };
  if (window.Table)       TOOLS.table       = { class: window.Table, inlineToolbar: true };

  let saveTimer;
  const editor = new EditorJS({
    holder: hostId,
    placeholder: 'Add content — type / for blocks…',
    data: savedData || { blocks: [] },
    tools: TOOLS,
    minHeight: isFullscreen ? 600 : 200,
    onReady: () => {
      const redactor = container.querySelector('.codex-editor__redactor');
      if (redactor) redactor.style.paddingLeft = '60px';
      if (!isFullscreen) {
        const section = container.closest('.rich-content-section');
        if (section) section.style.marginLeft = '44px';
      }
      // Fix popover (slash-menu / toolbox) being clipped by overflow-y:auto parents
      new MutationObserver(() => {
        container.querySelectorAll('.ce-popover--opened:not([data-lifted])').forEach(pop => {
          pop.dataset.lifted = '1';
          requestAnimationFrame(() => {
            const r = pop.getBoundingClientRect();
            if (!r.width) return;
            const maxH = 290;
            const top = Math.max(8, Math.min(r.top, window.innerHeight - maxH - 8));
            pop.style.position = 'fixed';
            pop.style.top = top + 'px';
            pop.style.left = r.left + 'px';
            pop.style.zIndex = '9999';
            pop.style.width = r.width + 'px';
          });
        });
        container.querySelectorAll('.ce-popover[data-lifted]:not(.ce-popover--opened)').forEach(pop => {
          delete pop.dataset.lifted;
          pop.style.position = '';
          pop.style.top = '';
          pop.style.left = '';
          pop.style.zIndex = '';
          pop.style.width = '';
        });
      }).observe(container, { subtree: true, attributes: true, attributeFilter: ['class'] });
    },
    onChange: async () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const data = await editor.save();
          const json = JSON.stringify(data);
          if (_isCustomEnt) {
            setCustomPropValue(entity, parseInt(entityId), '_rich_content', json);
          } else {
            api('POST', '/api/content', { entity_type: entity, entity_id: parseInt(entityId), content_json: json }).catch(() => {});
          }
        } catch {}
      }, 900);
    },
  });
  _activeEditors[hostId] = editor;
}

/* ─── Cover reposition drag ──────────────────────────────────────────── */
function enterCoverRepositionMode(el, entity, id, onDone) {
  const origPos = el.style.backgroundPosition;
  el.classList.add('sc-repositioning', 'fs-repositioning');
  el.style.cursor = 'ns-resize';

  const overlay = document.createElement('div');
  overlay.className = 'cover-reposition-overlay';
  overlay.innerHTML = `<span class="cover-reposition-hint">Drag to reposition</span><div class="cover-reposition-actions"><button class="cover-reposition-save">Save</button><button class="cover-reposition-cancel">Cancel</button></div>`;
  el.appendChild(overlay);

  let dragging = false, startY = 0, startPct = 0;
  const getPct = () => {
    const m = el.style.backgroundPosition.match(/(\d+(?:\.\d+)?)%/);
    return m ? parseFloat(m[1]) : 50;
  };

  function onDown(e) {
    if (e.target.closest('button')) return;
    dragging = true; startY = e.clientY; startPct = getPct();
    el.style.cursor = 'grabbing'; e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    let p = startPct - (e.clientY - startY) / el.offsetHeight * 100;
    el.style.backgroundPosition = `center ${Math.max(0, Math.min(100, p)).toFixed(1)}%`;
  }
  function onUp() { if (dragging) { dragging = false; el.style.cursor = 'ns-resize'; } }

  el.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);

  function cleanup() {
    el.removeEventListener('mousedown', onDown);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    el.classList.remove('sc-repositioning', 'fs-repositioning');
    el.style.cursor = '';
    overlay.remove();
  }

  overlay.querySelector('.cover-reposition-save').onclick = async (e) => {
    e.stopPropagation();
    const pos = `${getPct().toFixed(1)}%`;
    await api('POST', `/api/properties?entity_type=${entity}&entity_id=${id}`, { key: '_cover_pos', value: pos }).catch(() => {});
    cleanup(); onDone(pos);
  };
  overlay.querySelector('.cover-reposition-cancel').onclick = (e) => {
    e.stopPropagation();
    el.style.backgroundPosition = origPos;
    cleanup(); onDone(null);
  };
}

/* ─── Slideover cover image ──────────────────────────────────────────── */
async function initSlideoverCoverArea(entity, id) {
  const wrap = document.getElementById('slideover-cover-wrap');
  if (!wrap) return;
  let _dataUrl = '', _posY = '50%';
  const applyScCover = (dataUrl, posY = '50%') => {
    _dataUrl = dataUrl; _posY = posY;
    wrap.innerHTML = '';
    if (dataUrl) {
      wrap.classList.add('has-cover');
      wrap.style.backgroundImage = `url(${dataUrl})`;
      wrap.style.backgroundPosition = `center ${posY}`;
      const chgBtn = document.createElement('button');
      chgBtn.className = 'sc-cover-btn'; chgBtn.textContent = 'Change cover';
      chgBtn.onclick = () => pickScCover();
      const rmBtn = document.createElement('button');
      rmBtn.className = 'sc-cover-btn'; rmBtn.style.right = '130px'; rmBtn.textContent = 'Remove cover';
      rmBtn.onclick = async () => {
        await api('DELETE', `/api/properties?entity_type=${entity}&entity_id=${id}&key=_cover`).catch(() => {});
        applyScCover('');
      };
      const reposBtn = document.createElement('button');
      reposBtn.className = 'sc-cover-btn'; reposBtn.style.right = '255px'; reposBtn.textContent = 'Edit position';
      reposBtn.onclick = () => enterCoverRepositionMode(wrap, entity, id, (newPos) => {
        applyScCover(_dataUrl, newPos || _posY);
      });
      wrap.append(chgBtn, rmBtn, reposBtn);
    } else {
      wrap.classList.remove('has-cover');
      wrap.style.backgroundImage = ''; wrap.style.backgroundPosition = '';
      const addBtn = document.createElement('button');
      addBtn.className = 'sc-add-btn'; addBtn.innerHTML = ACT_ICONS.addCover + 'Add cover';
      addBtn.onclick = () => pickScCover();
      wrap.appendChild(addBtn);
    }
  };
  const pickScCover = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        await api('POST', `/api/properties?entity_type=${entity}&entity_id=${id}`, { key: '_cover', value: dataUrl });
        applyScCover(dataUrl, _posY);
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };
  api('GET', `/api/properties?entity_type=${entity}&entity_id=${id}`)
    .then(props => applyScCover(props?._cover || '', props?._cover_pos || '50%'))
    .catch(() => applyScCover(''));
}

/* ─── Individual view (project/goal) cover + action init ────────────── */
function initDetailViewCover(entity, id, coverRowId, actionRowId) {
  const coverRow = document.getElementById(coverRowId);
  const actionRow = document.getElementById(actionRowId);
  if (!coverRow || !actionRow) return;

  let _dataUrl = '', _posY = '50%';

  const pick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        await api('POST', `/api/properties?entity_type=${entity}&entity_id=${id}`, { key: '_cover', value: dataUrl });
        apply(dataUrl, _posY);
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const apply = (dataUrl, posY = '50%') => {
    _dataUrl = dataUrl; _posY = posY;
    coverRow.innerHTML = '';
    if (dataUrl) {
      coverRow.classList.add('has-cover');
      coverRow.style.backgroundImage = `url(${dataUrl})`;
      coverRow.style.backgroundPosition = `center ${posY}`;
      const changeBtn = document.createElement('button');
      changeBtn.className = 'fs-cover-btn';
      changeBtn.textContent = 'Change cover';
      changeBtn.onclick = () => pick();
      const removeBtn = document.createElement('button');
      removeBtn.className = 'fs-cover-btn';
      removeBtn.style.right = '130px';
      removeBtn.textContent = 'Remove cover';
      removeBtn.onclick = async () => {
        await api('DELETE', `/api/properties?entity_type=${entity}&entity_id=${id}&key=_cover`).catch(() => {});
        apply('');
      };
      const reposBtn = document.createElement('button');
      reposBtn.className = 'fs-cover-btn';
      reposBtn.style.right = '255px';
      reposBtn.textContent = 'Edit position';
      reposBtn.onclick = () => enterCoverRepositionMode(coverRow, entity, id, (newPos) => apply(_dataUrl, newPos || _posY));
      coverRow.append(changeBtn, removeBtn, reposBtn);
    } else {
      coverRow.classList.remove('has-cover');
      coverRow.style.backgroundImage = ''; coverRow.style.backgroundPosition = '';
    }
    // Add/remove "Add cover" link in action row
    actionRow.querySelectorAll('.ev-cover-add-link').forEach(el => el.remove());
    if (!dataUrl) {
      const addCoverLink = document.createElement('span');
      addCoverLink.className = 'ev-cover-add-link';
      addCoverLink.innerHTML = ACT_ICONS.addCover + 'Add cover';
      addCoverLink.onclick = () => pick();
      actionRow.appendChild(addCoverLink);
    }
  };

  api('GET', `/api/properties?entity_type=${entity}&entity_id=${id}`)
    .then(props => apply(props?._cover || '', props?._cover_pos || '50%'))
    .catch(() => apply(''));
}

/* ─── Fullscreen entity overlay ──────────────────────────────────────── */
let _currentSlideoverExpand = null;
function setSlideoverExpand(fn) { _currentSlideoverExpand = fn; }
let _currentFsPropsBuilder = null;
function setFsPropsBuilder(fn) { _currentFsPropsBuilder = fn; }
let _currentFsChipsBuilder = null;
function setFsChipsBuilder(fn) { _currentFsChipsBuilder = fn; }

function openEntityFullscreen(entity, entityId, title, patchTitleFn) {
  const overlay = document.getElementById('entity-fullscreen');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.classList.add('fullscreen-open');

  const fsCoverRow = document.getElementById('fs-cover-row');
  const fsIconRow = document.getElementById('fs-icon-row');
  let _fsDataUrl = '', _fsPosY = '50%', _fsIcon = '';

  const renderFsActions = () => {
    if (!fsIconRow) return;
    fsIconRow.innerHTML = '';
    if (_fsIcon) {
      fsIconRow.classList.add('has-entity-icon');
      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'cursor:pointer;font-size:36px;line-height:1';
      iconSpan.title = 'Click to change icon';
      iconSpan.innerHTML = renderEntityIcon(_fsIcon, 36);
      iconSpan.onclick = () => showIconPicker(fsIconRow, null, null, _fsIcon, async (newIcon) => {
        await saveEntityIcon(entity, entityId, newIcon || '');
        _fsIcon = newIcon || '';
        renderFsActions();
        document.querySelectorAll(`[data-entity-id="${entityId}"] .list-icon-slot`).forEach(el => {
          el.innerHTML = newIcon ? renderEntityIcon(newIcon, 18) : '';
        });
      });
      fsIconRow.appendChild(iconSpan);
    } else {
      fsIconRow.classList.remove('has-entity-icon');
      const addIconSpan = document.createElement('span');
      addIconSpan.style.cssText = 'cursor:pointer;font-size:13px;color:var(--text-muted);font-weight:500;display:inline-flex;align-items:center;padding:2px 0;margin-right:16px';
      addIconSpan.title = 'Click to add icon';
      addIconSpan.innerHTML = ACT_ICONS.addIcon + 'Add icon';
      addIconSpan.onclick = () => showIconPicker(fsIconRow, null, null, '', async (newIcon) => {
        await saveEntityIcon(entity, entityId, newIcon || '');
        _fsIcon = newIcon || '';
        renderFsActions();
        document.querySelectorAll(`[data-entity-id="${entityId}"] .list-icon-slot`).forEach(el => {
          el.innerHTML = newIcon ? renderEntityIcon(newIcon, 18) : '';
        });
      });
      fsIconRow.appendChild(addIconSpan);
      if (!_fsDataUrl) {
        const addCoverSpan = document.createElement('span');
        addCoverSpan.style.cssText = 'cursor:pointer;font-size:13px;color:var(--text-muted);font-weight:500;display:inline-flex;align-items:center;padding:2px 0';
        addCoverSpan.innerHTML = ACT_ICONS.addCover + 'Add cover';
        addCoverSpan.onclick = () => fsPick();
        fsIconRow.appendChild(addCoverSpan);
      }
    }
  };

  const fsPick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        await api('POST', `/api/properties?entity_type=${entity}&entity_id=${entityId}`, { key: '_cover', value: dataUrl });
        fsApplyCover(dataUrl, _fsPosY);
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const fsApplyCover = (dataUrl, posY = '50%') => {
    _fsDataUrl = dataUrl; _fsPosY = posY;
    if (!fsCoverRow) return;
    fsCoverRow.innerHTML = '';
    if (dataUrl) {
      fsCoverRow.classList.add('has-cover');
      fsCoverRow.style.backgroundImage = `url(${dataUrl})`;
      fsCoverRow.style.backgroundPosition = `center ${posY}`;
      overlay.classList.add('has-cover');
      const changeBtn = document.createElement('button');
      changeBtn.className = 'fs-cover-btn';
      changeBtn.textContent = 'Change cover';
      changeBtn.onclick = () => fsPick();
      const removeBtn = document.createElement('button');
      removeBtn.className = 'fs-cover-btn';
      removeBtn.style.right = '130px';
      removeBtn.textContent = 'Remove cover';
      removeBtn.onclick = async () => {
        await api('DELETE', `/api/properties?entity_type=${entity}&entity_id=${entityId}&key=_cover`).catch(() => {});
        fsApplyCover('');
      };
      const reposBtn = document.createElement('button');
      reposBtn.className = 'fs-cover-btn';
      reposBtn.style.right = '255px';
      reposBtn.textContent = 'Edit position';
      reposBtn.onclick = () => enterCoverRepositionMode(fsCoverRow, entity, entityId, (newPos) => {
        fsApplyCover(_fsDataUrl, newPos || _fsPosY);
      });
      fsCoverRow.append(changeBtn, removeBtn, reposBtn);
    } else {
      fsCoverRow.classList.remove('has-cover');
      fsCoverRow.style.backgroundImage = ''; fsCoverRow.style.backgroundPosition = '';
      overlay.classList.remove('has-cover');
    }
    renderFsActions();
  };

  // Cover image
  if (fsCoverRow) {
    api('GET', `/api/properties?entity_type=${entity}&entity_id=${entityId}`)
      .then(props => fsApplyCover(props?._cover || '', props?._cover_pos || '50%'))
      .catch(() => fsApplyCover(''));
  }

  // Load entity icon
  if (fsIconRow) {
    loadEntityIcon(entity, entityId).then(icon => { _fsIcon = icon || ''; renderFsActions(); }).catch(() => { _fsIcon = ''; renderFsActions(); });
  }

  // Set title (editable)
  const titleEl = document.getElementById('fs-title');
  if (titleEl) {
    titleEl.textContent = title || '';
    titleEl.oninput = () => {
      clearTimeout(titleEl._saveT);
      titleEl._saveT = setTimeout(() => patchTitleFn(titleEl.textContent.trim()), 600);
    };
  }

  // Clone header chips (Status, Priority, Due… etc) from the open slideover
  const fsChipsRow = document.getElementById('fs-prop-chips-row');
  if (fsChipsRow) {
    const srcChips = document.querySelector('#slideover-body #prop-chips');
    fsChipsRow.innerHTML = srcChips ? srcChips.innerHTML : '';
    // Remove IDs to prevent document.getElementById conflicts with the live slideover
    fsChipsRow.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    // Wire up interactive handlers via the entity's registered chips builder
    if (_currentFsChipsBuilder) _currentFsChipsBuilder(fsChipsRow);
  }

  // Mount prop panel — use entity-registered builder for fully interactive props
  const fsProps = document.getElementById('fs-props');
  if (fsProps) {
    if (_currentFsPropsBuilder) {
      _currentFsPropsBuilder(fsProps);
    } else {
      const fsRerender = () => {
        fsProps.innerHTML = buildInlinePropPanel(entity, entityId, []);
        bindInlinePropPanel(entity, entityId, {}, fsRerender, fsProps);
      };
      fsProps.innerHTML = buildInlinePropPanel(entity, entityId, []);
      bindInlinePropPanel(entity, entityId, {}, fsRerender, fsProps);
    }
  }

  // Init the fullscreen editor
  initRichEditor('editorjs-fullscreen', entity, entityId, true);

  // Comments
  const fsCom = document.getElementById('fs-comments');
  if (fsCom) {
    fsCom.innerHTML = buildCommentSection(entity, entityId);
    bindCommentSection(fsCom.querySelector('.comment-section'));
  }

  // Close handler
  document.getElementById('fs-close-btn').onclick = closeEntityFullscreen;
}

function closeEntityFullscreen() {
  const overlay = document.getElementById('entity-fullscreen');
  if (overlay) { overlay.style.display = 'none'; overlay.classList.remove('has-cover'); }
  document.body.classList.remove('fullscreen-open');
  const coverRow = document.getElementById('fs-cover-row');
  if (coverRow) { coverRow.innerHTML = ''; coverRow.classList.remove('has-cover'); coverRow.style.backgroundImage = ''; }
  const iconRow = document.getElementById('fs-icon-row');
  if (iconRow) { iconRow.innerHTML = ''; iconRow.classList.remove('has-entity-icon'); }
  const chipsRow = document.getElementById('fs-prop-chips-row');
  if (chipsRow) chipsRow.innerHTML = '';
  const key = 'editorjs-fullscreen';
  if (_activeEditors[key]) {
    try { _activeEditors[key].destroy(); } catch {}
    delete _activeEditors[key];
  }
}

async function loadEntityCustomProps(entity, recordId) {
  if (!recordId) return;
  try {
    const props = await api('GET', `/api/properties?entity_type=${entity}&entity_id=${recordId}`);
    const existing = getCustomPropValues(entity, recordId);
    // Merge ALL server values (not filtered — defs may not yet exist locally)
    Object.assign(existing, props);
    localStorage.setItem(`customPropVals_${entity}_${recordId}`, JSON.stringify(existing));

    // Auto-restore prop defs for relation values found on server that have no local def
    const currentDefs = getCustomPropDefs(entity);
    const existingKeys = new Set(currentDefs.map(d => d.key));
    const entityOnlyDefs = currentDefs.filter(d => !d._taxonomy);
    let defsChanged = false;
    for (const [k, v] of Object.entries(props)) {
      if (existingKeys.has(k)) continue;
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id !== undefined && parsed[0].label !== undefined) {
          const relEntity = k.replace(/s$/, '');
          entityOnlyDefs.push({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), type: 'relation', relatedEntity: relEntity, bilateral: true, reverseKey: `${entity}s` });
          defsChanged = true;
        }
      } catch {}
    }
    if (defsChanged) setCustomPropDefs(entity, entityOnlyDefs);
  } catch(e) {}
}

function customPropCell(entity, recordId, def) {
  const vals = getCustomPropValues(entity, recordId);
  const val = vals[def.key] ?? '';
  if (def.type === 'checkbox') {
    return `<td><input type="checkbox" class="custom-prop-check" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" ${val?'checked':''}></td>`;
  }
  if (def.type === 'date') {
    const display = val ? _dateChipDisplay(val) : '—';
    return `<td><button type="button" class="table-date-chip" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" data-value="${val}" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-primary);padding:0">${display}</button></td>`;
  }
  if (def.type === 'number') {
    return `<td><input type="number" class="custom-prop-input" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" value="${val}" style="font-size:12px;width:70px;border:1px solid var(--border);border-radius:3px;padding:1px 4px;background:transparent;color:var(--text-primary)"></td>`;
  }
  if (def.type === 'select' || def.type === 'status') {
    const oc = def.optionColors || {};
    const color = val ? (oc[val] || '') : '';
    const html = val ? (color ? `<span class="multi-chip color-${color}" style="font-size:11px">${escHtml(val)}</span>` : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:11px">${escHtml(val)}</span>`) : '—';
    return `<td class="custom-prop-select-cell" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" style="cursor:pointer">${html}</td>`;
  }
  if (def.type === 'multi_select') {
    const arr = (() => { try { const a = JSON.parse(val); return Array.isArray(a) ? a : (val ? [val] : []); } catch { return val ? [val] : []; } })();
    const oc = def.optionColors || {};
    const html = arr.length ? arr.map(v => oc[v] ? `<span class="multi-chip color-${oc[v]}" style="font-size:11px">${escHtml(v)}</span>` : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:11px">${escHtml(v)}</span>`).join('') : '—';
    return `<td class="custom-prop-select-cell" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" style="cursor:pointer">${html}</td>`;
  }
  if (def.type === 'relation') {
    const relItems = parseRelationValue(val);
    const html = relItems.length ? relItems.map(it => `<span class="multi-chip" style="font-size:11px">${escHtml(it.label)}</span>`).join('') : '—';
    return `<td class="custom-prop-select-cell" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" style="cursor:pointer">${html}</td>`;
  }
  return `<td><span class="custom-prop-text" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${def.key}" contenteditable="true" style="font-size:12px;outline:none;min-width:60px;display:inline-block">${val}</span></td>`;
}

function addPropColumnHeader(entity) {
  return `<th class="add-prop-th" style="position:relative;cursor:pointer;width:32px;text-align:center">
    <span class="add-prop-btn" data-entity="${entity}" style="font-size:16px;color:var(--text-muted);cursor:pointer;user-select:none;padding:0 8px">+</span>
  </th>`;
}

// ── showAddOptionsPanel ────────────────────────────────────────────────────
// After naming a select/multi_select prop, lets user add options before saving.
// Options are optional — clicking "Create" with no options saves the prop as free-text.
function showAddOptionsPanel(anchorBtn, key, name, type, entity, onAdd) {
  document.getElementById('add-prop-opts-picker')?.remove();
  const opts = [];
  const panel = document.createElement('div');
  panel.id = 'add-prop-opts-picker';
  panel.className = 'prop-vis-panel';

  const saveAndClose = () => {
    const defs = getCustomPropDefs(entity);
    defs.push({ key, label: name, type, options: opts });
    setCustomPropDefs(entity, defs);
    if (entity === 'task') {
      ['board','table','list','kanban','cards'].forEach(vm => { const v=getTaskVisProps(vm); if(!v.includes(key)) setTaskVisProps(vm,[...v,key]); });
    } else {
      const v = getEntityVisProps(entity); if (!v.includes(key)) setEntityVisProps(entity, [...v, key]);
    }
    panel.remove();
    onAdd();
    document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
  };

  const renderPanel = () => {
    panel.innerHTML = `
      <div style="padding:6px 10px 4px;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Options for "${name}" <span style="font-weight:400;opacity:.7">(optional)</span></div>
      <div style="padding:0 8px;max-height:180px;overflow-y:auto">
        ${opts.map((o,i) => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0">
          <span class="multi-chip" style="flex:1;background:var(--accent-glow);font-size:12px">${o}</span>
          <button data-del-idx="${i}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;line-height:1">×</button>
        </div>`).join('')}
      </div>
      <div style="padding:4px 8px 6px;display:flex;gap:6px;align-items:center">
        <input id="add-opt-input" type="text" placeholder="Add option…"
          style="flex:1;font-size:13px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text-primary)"/>
        <button id="add-opt-add" class="btn btn-sm" style="white-space:nowrap">Add</button>
      </div>
      <div style="padding:0 8px 8px;display:flex;justify-content:flex-end;gap:6px">
        <button id="add-opt-cancel" class="btn btn-sm btn-ghost">Cancel</button>
        <button id="add-opt-done" class="btn btn-sm btn-primary">Create${opts.length ? ` (${opts.length})` : ''}</button>
      </div>`;
    panel.querySelectorAll('[data-del-idx]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); opts.splice(Number(btn.dataset.delIdx), 1); renderPanel(); };
    });
    const addOpt = () => {
      const inp = panel.querySelector('#add-opt-input');
      const v = inp.value.trim();
      if (!v || opts.includes(v)) { inp.style.borderColor='var(--danger)'; return; }
      opts.push(v); inp.value=''; renderPanel(); panel.querySelector('#add-opt-input').focus();
    };
    panel.querySelector('#add-opt-add').onclick = (e) => { e.stopPropagation(); addOpt(); };
    panel.querySelector('#add-opt-input').onkeydown = (e) => { if (e.key==='Enter'){e.preventDefault();addOpt();} if(e.key==='Escape'){panel.remove();} };
    panel.querySelector('#add-opt-cancel').onclick = (e) => { e.stopPropagation(); panel.remove(); };
    panel.querySelector('#add-opt-done').onclick = (e) => { e.stopPropagation(); saveAndClose(); };
    requestAnimationFrame(() => panel.querySelector('#add-opt-input')?.focus());
  };

  renderPanel();
  const rect = anchorBtn.getBoundingClientRect();
  panel.style.cssText = `position:fixed;z-index:9200;min-width:270px;top:${rect.bottom+4}px;left:${rect.left}px`;
  document.body.appendChild(panel);
  requestAnimationFrame(() => {
    const cr = panel.getBoundingClientRect();
    if (cr.right > window.innerWidth - 8) panel.style.left = (window.innerWidth - cr.width - 8) + 'px';
    if (cr.bottom > window.innerHeight - 8) panel.style.top = (rect.top - cr.height - 4) + 'px';
  });
  setTimeout(() => {
    document.addEventListener('click', function outsideOpts(ev) {
      if (!panel.contains(ev.target) && !anchorBtn.contains(ev.target)) {
        panel.remove(); document.removeEventListener('click', outsideOpts);
      }
    });
  }, 0);
}

// ── showAddRelationPanel ───────────────────────────────────────────────────
// After naming a relation prop, picks target entity and direction.
function showAddRelationPanel(anchorBtn, key, name, entity, onAdd) {
  document.getElementById('add-prop-rel-picker')?.remove();
  const panel = document.createElement('div');
  panel.id = 'add-prop-rel-picker';
  panel.className = 'prop-vis-panel';
  const builtinEntities = ['task','goal','project','sprint','note','resource'];
  const customEntities = customEntityTypes.map(t => ({ name: t.name, label: t.display_name || t.name }));
  const entities = [...builtinEntities, ...customEntities.map(t => t.name)];
  const entityLabel = (ent) => { const ct = customEntityTypes.find(t => t.name === ent); return ct ? (ct.display_name || ct.name) : ent; };
  let relatedEntity = entities[0];
  let bilateral = true;

  const renderPanel = () => {
    panel.innerHTML = `
      <div style="padding:6px 10px 4px;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Relation: "${name}"</div>
      <div style="padding:4px 10px 6px;font-size:12px;color:var(--text-muted)">Links to which entity?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 8px 8px">
        ${entities.map(ent => `<div class="prop-type-row rel-ent-pick${relatedEntity===ent?' rel-ent-active':''}" data-ent="${ent}" style="${relatedEntity===ent?'background:var(--accent);color:#fff;':''}">
          <span style="text-transform:capitalize;font-size:13px">${entityLabel(ent)}</span>
        </div>`).join('')}
      </div>
      <div style="padding:0 8px 8px;display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="rel-bilateral" ${bilateral?'checked':''} style="cursor:pointer;accent-color:var(--accent)">
        <label for="rel-bilateral" style="font-size:13px;cursor:pointer">Bilateral (both entities see this link)</label>
      </div>
      <div style="padding:0 8px 8px;display:flex;justify-content:flex-end;gap:6px">
        <button id="rel-cancel" class="btn btn-sm btn-ghost">Cancel</button>
        <button id="rel-create" class="btn btn-sm btn-primary">Create Relation</button>
      </div>`;
    panel.querySelectorAll('.rel-ent-pick').forEach(row => {
      row.onclick = (e) => { e.stopPropagation(); relatedEntity = row.dataset.ent; renderPanel(); };
    });
    panel.querySelector('#rel-bilateral').onchange = (e) => { bilateral = e.target.checked; };
    panel.querySelector('#rel-cancel').onclick = (e) => { e.stopPropagation(); panel.remove(); };
    panel.querySelector('#rel-create').onclick = (e) => {
      e.stopPropagation();
      const defs = getCustomPropDefs(entity);
      const revKey = bilateral ? `${entity}_${key}` : undefined;
      defs.push({ key, label: name, type: 'relation', relatedEntity, bilateral, reverseKey: revKey });
      setCustomPropDefs(entity, defs);
      if (bilateral) {
        // Add reverse relation on the target entity — label = display name of the source entity
        const BUILTIN_LABELS = {task:'Tasks',goal:'Goals',project:'Projects',sprint:'Sprints',note:'Notes',resource:'Resources',habit:'Habits'};
        const revLabel = BUILTIN_LABELS[entity] || entityLabel(entity);
        const revDefs = getCustomPropDefs(relatedEntity);
        if (!revDefs.some(d => d.key === revKey)) {
          revDefs.push({ key: revKey, label: revLabel, type: 'relation', relatedEntity: entity, bilateral: true, reverseKey: key });
          setCustomPropDefs(relatedEntity, revDefs);
          const rv = getEntityVisProps(relatedEntity); if (!rv.includes(revKey)) setEntityVisProps(relatedEntity, [...rv, revKey]);
        }
      }
      if (entity === 'task') {
        ['board','table','list','kanban','cards'].forEach(vm => { const v=getTaskVisProps(vm); if(!v.includes(key)) setTaskVisProps(vm,[...v,key]); });
      } else {
        const v = getEntityVisProps(entity); if (!v.includes(key)) setEntityVisProps(entity, [...v, key]);
      }
      panel.remove();
      onAdd();
      document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
    };
  };

  renderPanel();
  const rect = anchorBtn.getBoundingClientRect();
  panel.style.cssText = `position:fixed;z-index:9200;min-width:270px;top:${rect.bottom+4}px;left:${rect.left}px`;
  document.body.appendChild(panel);
  requestAnimationFrame(() => {
    const cr = panel.getBoundingClientRect();
    if (cr.right > window.innerWidth - 8) panel.style.left = (window.innerWidth - cr.width - 8) + 'px';
    if (cr.bottom > window.innerHeight - 8) panel.style.top = (rect.top - cr.height - 4) + 'px';
  });
  setTimeout(() => {
    document.addEventListener('click', function outsideRel(ev) {
      if (!panel.contains(ev.target) && !anchorBtn.contains(ev.target)) {
        panel.remove(); document.removeEventListener('click', outsideRel);
      }
    });
  }, 0);
}

function bindAddPropBtn(entity, onAdd) {
  document.querySelectorAll(`.add-prop-btn[data-entity="${entity}"]`).forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const existing = document.getElementById('add-prop-picker');
      if (existing) { existing.remove(); return; }
      const picker = document.createElement('div');
      picker.id = 'add-prop-picker';
      picker.className = 'prop-vis-panel';
      const typeSvg = (iconPath) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;

      const connectedTypes = await getConnectedPropTypes();
      const buildSection = (types) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">` +
        types.map(pt => `<div class="prop-type-row" data-type="${pt.type}">
          <span class="prop-type-icon">${typeSvg(pt.icon)}</span>
          <span>${pt.label}</span>
        </div>`).join('') + `</div>`;

      picker.innerHTML =
        `<div style="padding:2px 8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Select type</div>` +
        buildSection(CUSTOM_PROP_TYPES) +
        (connectedTypes.length ? `<div class="prop-type-section-header">Connected Apps</div>` + buildSection(connectedTypes) : '');

      // Position fixed from viewport rect — escapes overflow:auto clipping in slideovers
      const bRect = btn.getBoundingClientRect();
      picker.style.cssText = `position:fixed;z-index:9100;min-width:280px;padding:8px 6px 6px;top:${bRect.bottom+4}px;left:${bRect.left}px`;
      document.body.appendChild(picker);
      requestAnimationFrame(() => {
        const cr = picker.getBoundingClientRect();
        if (cr.right > window.innerWidth - 8) picker.style.left = (window.innerWidth - cr.width - 8) + 'px';
        if (cr.bottom > window.innerHeight - 8) picker.style.top = (bRect.top - cr.height - 4) + 'px';
      });
      picker.querySelectorAll('.prop-type-row').forEach(row => {
        row.onclick = (ev) => {
          ev.stopPropagation();
          picker.remove();
          const rawType = row.dataset.type;
          const isConnected = rawType.startsWith('connected:');
          const pt = isConnected
            ? connectedTypes.find(t => t.type === rawType)
            : CUSTOM_PROP_TYPES.find(t => t.type === rawType);

          // Inline name input — replaces native prompt() for Tauri/browser compat
          document.getElementById('add-prop-name-picker')?.remove();
          const namePicker = document.createElement('div');
          namePicker.id = 'add-prop-name-picker';
          namePicker.className = 'prop-vis-panel';
          namePicker.innerHTML =
            `<div style="padding:6px 10px 4px;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Name this ${pt?.label || rawType} property</div>
            <div style="padding:4px 8px 8px;display:flex;gap:6px;align-items:center">
              <input id="add-prop-name-input" type="text" placeholder="Property name…"
                style="flex:1;font-size:13px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text-primary)"/>
              <button id="add-prop-name-confirm" class="btn btn-sm btn-primary" style="white-space:nowrap">Add</button>
            </div>`;
          const bRect2 = btn.getBoundingClientRect();
          namePicker.style.cssText = `position:fixed;z-index:9200;min-width:260px;top:${bRect2.bottom+4}px;left:${bRect2.left}px`;
          document.body.appendChild(namePicker);
          const nameInp = document.getElementById('add-prop-name-input');
          requestAnimationFrame(() => nameInp.focus());

          const confirmAdd = () => {
            const name = nameInp.value.trim();
            if (!name) { nameInp.style.borderColor = 'var(--danger)'; nameInp.focus(); return; }
            const key = name.toLowerCase().replace(/\s+/g, '_');
            const defs = getCustomPropDefs(entity);
            if (defs.some(d => d.key === key)) {
              nameInp.style.borderColor = 'var(--danger)';
              nameInp.title = 'A property with that name already exists';
              nameInp.focus();
              return;
            }
            namePicker.remove();
            // Types needing extra steps before saving
            if (!isConnected && (rawType === 'select' || rawType === 'multi_select' || rawType === 'status')) {
              showAddOptionsPanel(btn, key, name, rawType, entity, onAdd);
              return;
            }
            if (!isConnected && rawType === 'relation') {
              showAddRelationPanel(btn, key, name, entity, onAdd);
              return;
            }
            // Simple types: save immediately
            if (isConnected) {
              defs.push({ key, label: name, type: 'connected', integrationId: pt.integrationId });
            } else {
              defs.push({ key, label: name, type: rawType });
            }
            setCustomPropDefs(entity, defs);
            // Auto-add to visible sets so new props appear immediately in filter panel
            if (entity === 'task') {
              ['board','table','list','kanban','cards'].forEach(vm => { const v=getTaskVisProps(vm); if(!v.includes(key)) setTaskVisProps(vm,[...v,key]); });
            } else {
              const v = getEntityVisProps(entity); if (!v.includes(key)) setEntityVisProps(entity, [...v, key]);
            }
            onAdd();
            document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
          };

          document.getElementById('add-prop-name-confirm').onclick = (e) => { e.stopPropagation(); confirmAdd(); };
          nameInp.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmAdd(); }
            if (e.key === 'Escape') { namePicker.remove(); }
          };
          setTimeout(() => {
            document.addEventListener('click', function nameOutside(ev2) {
              if (!namePicker.contains(ev2.target)) {
                namePicker.remove();
                document.removeEventListener('click', nameOutside);
              }
            });
          }, 0);
        };
      });
      document.addEventListener('click', function outsideClick(ev) {
        if (!picker.contains(ev.target) && ev.target !== btn) {
          picker.remove();
          document.removeEventListener('click', outsideClick);
        }
      });
    };
  });
}

// ── renderCustomPropChips ─────────────────────────────────────────────────
// Returns an HTML string of visible custom prop chips for card/list/kanban views.
// For tasks: uses propVisible(viewMode, key). For others: entityPropVisible(entity, key).
function renderCustomPropChips(entity, recordId, viewMode) {
  const allDefs = getCustomPropDefs(entity);
  if (!allDefs.length) return '';
  // Filter out custom relation props that shadow a built-in prop
  const builtinKeys = new Set((ENTITY_ALL_PROPS[entity] || []).map(d => d.key));
  const defs = allDefs.filter(d => {
    if (builtinKeys.has(d.key)) return false;
    if (d.type === 'relation' && builtinKeys.has(d.key.replace(/s$/, ''))) return false;
    return true;
  });
  if (!defs.length) return '';
  const isVisible = entity === 'task'
    ? (key) => propVisible(viewMode || 'cards', key)
    : (key) => entityPropVisible(entity, key);
  const vals = getCustomPropValues(entity, recordId);
  const chips = defs.filter(d => isVisible(d.key)).map(def => {
    const val = vals[def.key] ?? '';
    if (!val && val !== false && val !== 0) return '';
    if (def.type === 'checkbox') {
      return val ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;background:var(--accent-glow);border-radius:3px;padding:1px 5px" title="${def.label}: checked"><span style="color:var(--text-muted)">${def.label}:</span> ✓</span>` : '';
    }
    if (def.type === 'multi_select') {
      const arr = (() => { try { const a = JSON.parse(val); return Array.isArray(a) ? a : (val ? [val] : []); } catch { return val ? [val] : []; } })();
      if (!arr.length) return '';
      const oc = def.optionColors || {};
      return arr.map(v => oc[v]
        ? `<span class="multi-chip color-${oc[v]}" style="font-size:10px">${escHtml(v)}</span>`
        : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:10px">${escHtml(v)}</span>`
      ).join('');
    }
    if (def.type === 'select' || def.type === 'status') {
      if (!val) return '';
      const color = (def.optionColors || {})[val] || '';
      return color
        ? `<span class="multi-chip color-${color}" style="font-size:10px" title="${def.label}: ${escHtml(val)}">${escHtml(val)}</span>`
        : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:10px" title="${def.label}: ${escHtml(val)}">${escHtml(val)}</span>`;
    }
    if (def.type === 'relation') {
      const allRelItems = parseRelationValue(val);
      const seenIds = new Set();
      const relItems = allRelItems.filter(it => { if (seenIds.has(it.id)) return false; seenIds.add(it.id); return true; });
      if (!relItems.length) return '';
      return relItems.map(it => `<span class="multi-chip" style="font-size:10px" title="${def.label}: ${escHtml(it.label)}">${escHtml(it.label)}</span>`).join('');
    }
    const display = String(val);
    if (!display) return '';
    return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;background:var(--accent-glow);border-radius:3px;padding:1px 5px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${def.label}: ${display}"><span style="color:var(--text-muted)">${def.label}:</span> ${escHtml(display)}</span>`;
  }).filter(Boolean);
  if (!chips.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">${chips.join('')}</div>`;
}

function bindCustomPropCells() {
  document.querySelectorAll('.custom-prop-check').forEach(el => {
    el.onchange = () => setCustomPropValue(el.dataset.entity, el.dataset.recordId, el.dataset.propKey, el.checked);
  });
  document.querySelectorAll('.custom-prop-input').forEach(el => {
    el.onchange = () => setCustomPropValue(el.dataset.entity, el.dataset.recordId, el.dataset.propKey, el.value);
  });
  document.querySelectorAll('.custom-prop-text').forEach(el => {
    el.onblur = () => setCustomPropValue(el.dataset.entity, el.dataset.recordId, el.dataset.propKey, el.textContent.trim());
  });
  document.querySelectorAll('.table-date-chip').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openSingleDatePickerGlobal(btn, btn.dataset.value || '', (val) => {
        btn.dataset.value = val || '';
        btn.textContent = val ? _dateChipDisplay(val) : '—';
        setCustomPropValue(btn.dataset.entity, btn.dataset.recordId, btn.dataset.propKey, val || '');
      });
    };
  });
  document.querySelectorAll('.custom-prop-select-cell').forEach(cell => {
    cell.onclick = (e) => {
      e.stopPropagation();
      const { entity, recordId, propKey } = cell.dataset;
      const def = getCustomPropDefs(entity).find(d => d.key === propKey);
      if (!def) return;
      const curVal = getCustomPropValues(entity, recordId)[propKey] ?? '';
      if (def.type === 'multi_select') {
        const curArr = (() => { try { const a = JSON.parse(curVal); return Array.isArray(a) ? a : (curVal ? [curVal] : []); } catch { return curVal ? [curVal] : []; } })();
        const opts = def.options || [];
        document.getElementById('custom-ms-picker')?.remove();
        const popup = document.createElement('div');
        popup.id = 'custom-ms-picker';
        popup.className = 'prop-vis-panel';
        const sel = new Set(curArr);
        const eyeOn = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
        const renderMs = () => {
          popup.innerHTML = `<div style="padding:4px 10px 6px;font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">${def.label}</div>` +
            opts.map(o => `<div class="prop-vis-row" data-opt="${o}" style="cursor:pointer;user-select:none">
              <span style="color:var(--text-primary);font-size:13px">${o}</span>
              <span style="opacity:${sel.has(o)?'1':'0'}">${eyeOn}</span>
            </div>`).join('') +
            `<div style="padding:4px 8px 6px;text-align:right"><button id="custom-ms-done" class="btn btn-sm btn-primary" style="font-size:12px">Done</button></div>`;
          popup.querySelectorAll('[data-opt]').forEach(row => {
            row.onclick = (ev) => { ev.stopPropagation(); const o = row.dataset.opt; if (sel.has(o)) sel.delete(o); else sel.add(o); renderMs(); };
          });
          const db = popup.querySelector('#custom-ms-done');
          if (db) db.onclick = (ev) => { ev.stopPropagation(); popup.remove(); const v=JSON.stringify([...sel]); setCustomPropValue(entity,recordId,propKey,v); const oc2=def.optionColors||{}; cell.innerHTML=([...sel].map(v=>oc2[v]?`<span class="multi-chip color-${oc2[v]}" style="font-size:11px">${escHtml(v)}</span>`:`<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:11px">${escHtml(v)}</span>`).join(''))||'—'; };
        };
        renderMs();
        const r = cell.getBoundingClientRect();
        popup.style.cssText = `position:fixed;z-index:9200;min-width:160px;top:${r.bottom+4}px;left:${r.left}px`;
        document.body.appendChild(popup);
        setTimeout(() => { document.addEventListener('click', function h(ev) { if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', h); } }); }, 0);
      } else if (def.type === 'relation') {
        const relEntity = def.relatedEntity || 'task';
        const isBuiltin = ['task','goal','project','sprint','note','resource','habit'].includes(relEntity);
        const relPath = relEntity === 'task' ? '/api/tasks?all=1'
          : isBuiltin ? `/api/${relEntity}s`
          : `/api/custom/${relEntity}`;
        api('GET', relPath).then(async raw => {
          const list = Array.isArray(raw) ? raw : (raw?.tasks || raw?.goals || raw?.projects || raw?.notes || raw?.resources || raw?.sprints || []);
          const currentItems = parseRelationValue(curVal);
          const curIds = currentItems.map(x => x.id).filter(Boolean);
          openCombo(
            cell,
            list.map(it => ({ value: String(it.id), label: it.title || it.name || String(it.id) })),
            null,
            async ({ multiIds }) => {
              if (!multiIds) return;
              const newItems = multiIds.map(id => {
                const it = list.find(x => String(x.id) === String(id));
                return { id: String(id), label: it ? (it.title || it.name || String(id)) : String(id) };
              });
              setCustomPropValue(entity, recordId, propKey, JSON.stringify(newItems));
              // Sprint FK + relations table sync
              if (relEntity === 'sprint' && entity === 'task') {
                const spId = multiIds.length > 0 ? parseInt(multiIds[0]) : null;
                api('PATCH', `/api/tasks/${recordId}`, { sprint_id: spId }).catch(() => {});
                for (const sid of multiIds) api('POST', `/api/relations/sprint/${sid}`, { related_entity_type: 'task', related_entity_id: parseInt(recordId) }).catch(() => {});
                for (const id of curIds) if (!multiIds.map(String).includes(String(id))) api('DELETE', `/api/relations/sprint/${id}/task/${recordId}`, {}).catch(() => {});
              }
              if (def.bilateral !== false) {
                const revKey = def.reverseKey ?? `${entity}_${propKey}`;
                let sourceTitle = String(recordId);
                try {
                  const isBuiltinSrc = ['task','goal','project','sprint','note','resource','habit'].includes(entity);
                  const srcPath = entity === 'task' ? `/api/tasks/${recordId}` : isBuiltinSrc ? `/api/${entity}s/${recordId}` : `/api/custom/${entity}/${recordId}`;
                  const src = await api('GET', srcPath);
                  sourceTitle = src.title || src.name || String(recordId);
                } catch {}
                const newIdSet = new Set(multiIds.map(String));
                const oldIdSet = new Set(curIds.map(String));
                for (const id of newIdSet) {
                  if (!oldIdSet.has(id)) {
                    let revVals = getCustomPropValues(relEntity, parseInt(id));
                    try {
                      const serverProps = await api('GET', `/api/properties?entity_type=${relEntity}&entity_id=${id}`);
                      revVals = { ...revVals, ...serverProps };
                      localStorage.setItem(`customPropVals_${relEntity}_${id}`, JSON.stringify(revVals));
                    } catch(e) {}
                    let revArr = parseRelationValue(revVals[revKey] ?? '');
                    if (!revArr.some(x => x.id === String(recordId))) {
                      revArr.push({ id: String(recordId), label: sourceTitle });
                      setCustomPropValue(relEntity, parseInt(id), revKey, JSON.stringify(revArr));
                    }
                  }
                }
                for (const id of oldIdSet) {
                  if (id && !newIdSet.has(id)) {
                    let revVals = getCustomPropValues(relEntity, parseInt(id));
                    try {
                      const serverProps = await api('GET', `/api/properties?entity_type=${relEntity}&entity_id=${id}`);
                      revVals = { ...revVals, ...serverProps };
                      localStorage.setItem(`customPropVals_${relEntity}_${id}`, JSON.stringify(revVals));
                    } catch(e) {}
                    let revArr = parseRelationValue(revVals[revKey] ?? '');
                    revArr = revArr.filter(x => x.id !== String(recordId));
                    setCustomPropValue(relEntity, parseInt(id), revKey, JSON.stringify(revArr));
                  }
                }
              }
              cell.innerHTML = newItems.length ? newItems.map(it => `<span class="multi-chip" style="font-size:11px">${escHtml(it.label)}</span>`).join('') : '—';
            },
            { multiSelect: true, selectedIds: curIds }
          );
        }).catch(() => {});
      } else {
        openSingleSelectPicker(cell, def, entity, recordId, propKey, () => {
          const newDef = getCustomPropDefs(entity).find(d => d.key === propKey);
          const newVal = getCustomPropValues(entity, recordId)[propKey] ?? '';
          const oc2 = (newDef && newDef.optionColors) || {};
          const color2 = oc2[newVal] || '';
          cell.innerHTML = newVal ? (color2 ? `<span class="multi-chip color-${color2}" style="font-size:11px">${escHtml(newVal)}</span>` : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:11px">${escHtml(newVal)}</span>`) : '—';
        });
      }
    };
  });
}
const CAL_EVENT_TYPES = ['task','goal','project','sprint'];

// ── Modal date chip helpers (shared across all forms) ────────────────────
function _dateChipDisplay(iso) {
  if (!iso) return 'Pick date';
  return fmtDate(iso) || iso;
}
function _rangeDateChipDisplay(startIso, endIso) {
  if (!startIso && !endIso) return 'Pick date range';
  if (!endIso || startIso === endIso) return _dateChipDisplay(startIso);
  return `${_dateChipDisplay(startIso)} → ${_dateChipDisplay(endIso)}`;
}
function singleDateChipHtml(id, value) {
  return `<button type="button" class="modal-date-chip" data-single-target="${id}">${_dateChipDisplay(value || null)}</button>
<input type="hidden" id="${id}" value="${value || ''}">`;
}
function rangeDateChipHtml(startId, startVal, endId, endVal) {
  return `<button type="button" class="modal-date-chip" data-start-target="${startId}" data-end-target="${endId}">${_rangeDateChipDisplay(startVal || null, endVal || null)}</button>
<input type="hidden" id="${startId}" value="${startVal || ''}">
<input type="hidden" id="${endId}" value="${endVal || ''}">`;
}
function bindModalDateChips(containerEl) {
  const container = containerEl || document;
  container.querySelectorAll('.modal-date-chip').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const singleId = btn.dataset.singleTarget;
      const startId = btn.dataset.startTarget;
      const endId = btn.dataset.endTarget;
      if (singleId) {
        const inp = document.getElementById(singleId);
        openSingleDatePickerGlobal(btn, inp?.value || '', (val) => {
          if (inp) { inp.value = val || ''; inp.dispatchEvent(new Event('input', { bubbles: true })); }
          btn.textContent = _dateChipDisplay(val);
        });
      } else if (startId && endId) {
        const startInp = document.getElementById(startId);
        const endInp = document.getElementById(endId);
        openDateRangePickerGlobal(btn, startInp?.value || null, endInp?.value || null, (start, end) => {
          if (startInp) { startInp.value = start || ''; startInp.dispatchEvent(new Event('input', { bubbles: true })); }
          if (endInp) { endInp.value = end || ''; endInp.dispatchEvent(new Event('input', { bubbles: true })); }
          btn.textContent = _rangeDateChipDisplay(start, end);
        });
      }
    };
  });
}

// ── Prop panel order persistence ──────────────────────────────────────────
function getEntityPropOrder(entity) {
  const s = localStorage.getItem(`propOrder_${entity}`);
  return s ? JSON.parse(s) : null;
}
function setEntityPropOrder(entity, order) {
  localStorage.setItem(`propOrder_${entity}`, JSON.stringify(order));
}

// ── buildInlinePropPanel ──────────────────────────────────────────────────
// Renders a .inline-prop-panel div with built-in + custom prop rows, each
// with a drag handle for reordering. builtinDefs is an array of:
//   { key, label, icon, getValue(recordId), renderValue(val), onEdit(rowEl, recordId, patchFn) }
// onReorder(newOrderKeys) is called after drag-drop.
// Returns HTML string; call bindInlinePropPanel(entity, recordId, ...) after inserting into DOM.
function buildInlinePropPanel(entity, recordId, builtinDefs, excludeKeys) {
  const order = getEntityPropOrder(entity);
  const customDefs = getCustomPropDefs(entity);
  const customVals = recordId != null ? getCustomPropValues(entity, recordId) : {};

  // Merge all def keys in order — custom keys that shadow a builtin are excluded.
  // Also exclude relation custom props whose key is the plural of a built-in FK key
  // (e.g. 'projects' when 'project' is a built-in prop) — prevents duplicate rows
  // left over from before the _ensureRelProp fix.
  const allBuiltinKeys = builtinDefs.map(d => d.key);
  const _excludeSet = new Set(excludeKeys || []);
  const entityBuiltinSingularKeys = new Set((ENTITY_ALL_PROPS[entity] || []).map(d => d.key));
  const allCustomKeys = customDefs.filter(d => {
    if (allBuiltinKeys.includes(d.key)) return false;
    if (_excludeSet.has(d.key)) return false;
    if (d.type === 'relation' && entityBuiltinSingularKeys.has(d.key.replace(/s$/, ''))) return false;
    return true;
  }).map(d => d.key);
  const allKeys = [...allBuiltinKeys, ...allCustomKeys];
  let orderedKeys;
  if (order) {
    // Merge: known order first, then any new keys not in order
    const known = order.filter(k => allKeys.includes(k));
    const novel = allKeys.filter(k => !order.includes(k));
    orderedKeys = [...known, ...novel];
  } else {
    orderedKeys = allKeys;
  }

  const propTypeIcon = (type) => {
    const pt = CUSTOM_PROP_TYPES.find(p => p.type === type);
    if (!pt) return '';
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pt.icon}</svg>`;
  };

  const overrides = getPropOverrides(entity);
  const rows = orderedKeys.map(key => {
    const builtin = builtinDefs.find(d => d.key === key);
    const custom = customDefs.find(d => d.key === key);
    if (!builtin && !custom) return '';

    const ov = overrides[key] || {};
    const labelText = ov.label || (builtin ? builtin.label : custom.label);
    const iconHtml = ov.icon
      ? renderEntityIcon(ov.icon, 14)
      : builtin
        ? (builtin.icon || '')
        : (custom.icon ? renderEntityIcon(custom.icon, 14) : propTypeIcon(custom.type));
    const valHtml = builtin
      ? (builtin.renderValue ? builtin.renderValue() : '<span class="empty">—</span>')
      : (() => {
          const val = customVals[key] ?? '';
          if (custom.type === 'checkbox') {
            return `<input type="checkbox" class="icp-check" data-entity="${entity}" data-record-id="${recordId}" data-prop-key="${key}" ${val?'checked':''}
              style="cursor:pointer;accent-color:var(--accent)" onclick="event.stopPropagation()">`;
          }
          if (custom.type === 'multi_select') {
            const arr = (() => { try { const a = JSON.parse(val); return Array.isArray(a) ? a : (val ? [val] : []); } catch { return val ? [val] : []; } })();
            const optColors = custom.optionColors || {};
            const chips = arr.map(v => {
              const color = optColors[v] || '';
              const chipClass = color ? `multi-chip color-${color} ms-chip` : `multi-chip ms-chip`;
              const chipStyle = color ? '' : 'style="background:var(--accent-glow);color:var(--text-primary);font-size:11px;display:inline-flex;align-items:center;gap:3px;cursor:default"';
              return `<span class="${chipClass}" data-ms-val="${v.replace(/"/g,'&quot;')}" ${chipStyle}>${v}<span class="ms-chip-remove" data-val="${v.replace(/"/g,'&quot;')}" style="cursor:pointer;font-weight:700;opacity:0.6;font-size:12px;line-height:1" title="Remove">×</span></span>`;
            }).join('');
            return `<div class="ms-chips-wrap" style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;min-height:20px">${chips}<button class="btn btn-sm btn-ghost ms-add-btn" data-prop-key="${key}" style="font-size:11px;padding:1px 5px;height:20px;line-height:1" title="Add option">+</button></div>`;
          }
          if (!val) return `<span class="empty">—</span>`;
          if (custom.type === 'date') return `<span style="font-size:12px">${fmtDate(val)||val}</span>`;
          if (custom.type === 'select' || custom.type === 'status') {
            const color = (custom.optionColors || {})[val] || '';
            return color
              ? `<span class="multi-chip color-${color}" style="font-size:11px">${escHtml(val)}</span>`
              : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:11px">${escHtml(val)}</span>`;
          }
          if (custom.type === 'url') {
            return `<a href="${val}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;font-size:12px" onclick="event.stopPropagation()">${val}</a>`;
          }
          if (custom.type === 'relation') {
            const relItems = parseRelationValue(val);
            return relItems.length
              ? relItems.map(it => `<span class="multi-chip" style="font-size:11px">${escHtml(it.label)}</span>`).join('')
              : '<span class="empty">—</span>';
          }
          return `<span style="font-size:12px">${String(val).replace(/</g,'&lt;')}</span>`;
        })();
    const isCustom = !!custom && !custom._taxonomy;
    return `<div class="inline-prop-row" data-prop-key="${key}" data-is-custom="${isCustom}">
      <span class="inline-prop-drag-handle" title="Drag to reorder">⠿</span>
      <div class="inline-prop-label">${iconHtml}<span class="inline-prop-label-text">${labelText}</span></div>
      <div class="prop-label-resizer" title="Drag to resize columns"></div>
      <div class="inline-prop-value${!valHtml || valHtml.includes('class="empty"') ? ' empty' : ''}" data-prop-key="${key}">${valHtml}</div>
      ${isCustom ? `<button class="prop-del-btn btn btn-sm btn-ghost icp-del-btn" data-entity="${entity}" data-prop-key="${key}" title="Remove property" style="font-size:13px">×</button>` : ''}
    </div>`;
  }).filter(Boolean).join('');

  const addBtnHtml = `<div class="inline-prop-add-row">
    <span class="inline-prop-add-btn add-prop-btn" data-entity="${entity}" data-record-id="${recordId || ''}">
      + Add property
    </span>
  </div>`;

  return `<div class="inline-prop-panel" data-entity="${entity}" data-record-id="${recordId || ''}" style="--prop-label-w:${getPropLabelWidth()}px">${rows}${addBtnHtml}</div>`;
}

// ── bindInlinePropPanel ───────────────────────────────────────────────────
// Wires drag-to-reorder, custom prop editing, delete, and the Add button.
// builtinEditFns: { [key]: (rowEl, valueEl) => void } — called on value click
// onRerender: () => void — called to rebuild the panel after any change
function bindInlinePropPanel(entity, recordId, builtinEditFns, onRerender, root) {
  const panel = (root || document).querySelector(`.inline-prop-panel[data-entity="${entity}"]`);
  if (!panel) return;

  // Auto re-render when a property is added from another panel (same entity type)
  const propDefsHandler = (e) => { if (e.detail.entity === entity) onRerender(); };
  document.addEventListener('propDefsChanged', propDefsHandler);
  // Clean up listener when panel is removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(panel)) {
      document.removeEventListener('propDefsChanged', propDefsHandler);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Wire builtin value clicks
  panel.querySelectorAll('.inline-prop-row[data-is-custom="false"] .inline-prop-value').forEach(valEl => {
    const key = valEl.dataset.propKey;
    const fn = builtinEditFns[key];
    if (fn) valEl.onclick = (e) => { e.stopPropagation(); fn(valEl); };
  });

  // Wire custom prop value clicks (inline edit)
  panel.querySelectorAll('.inline-prop-row[data-is-custom="true"] .inline-prop-value').forEach(valEl => {
    const key = valEl.dataset.propKey;
    const defs = getCustomPropDefs(entity);
    const def = defs.find(d => d.key === key);
    if (!def) return;
    if (def.type === 'checkbox') return; // handled by input directly
    valEl.onclick = (e) => {
      e.stopPropagation();
      if (valEl.querySelector('input,textarea')) return;
      const currentVals = getCustomPropValues(entity, recordId);
      const cur = currentVals[key] ?? '';
      if (def.type === 'date') {
        openSingleDatePickerGlobal(valEl, cur || null, (val) => {
          setCustomPropValue(entity, recordId, key, val || '');
          onRerender();
        });
        return;
      }
      if (def.type === 'select' || def.type === 'status') {
        openSingleSelectPicker(valEl, def, entity, recordId, key, onRerender);
        return;
      }
      if (def.type === 'multi_select') {
        // Handled by ms-chip-remove and ms-add-btn wired below; skip generic onclick.
        return;
      }
      if (def.type === 'relation') {
        const relEntity = def.relatedEntity || 'task';
        const isBuiltin = ['task','goal','project','sprint','note','resource','habit'].includes(relEntity);
        const relPath = relEntity === 'task' ? '/api/tasks?all=1'
          : isBuiltin ? `/api/${relEntity}s`
          : `/api/custom/${relEntity}`;
        api('GET', relPath).then(async raw => {
          const list = Array.isArray(raw) ? raw : (raw?.tasks || raw?.goals || raw?.projects || raw?.notes || raw?.resources || raw?.sprints || []);
          const currentItems = parseRelationValue(cur);
          const curIds = currentItems.map(x => x.id).filter(Boolean);
          openCombo(
            valEl,
            list.map(it => ({ value: String(it.id), label: it.title || it.name || String(it.id) })),
            null,
            async ({ multiIds }) => {
              if (!multiIds) return;
              const newItems = multiIds.map(id => {
                const it = list.find(x => String(x.id) === String(id));
                return { id: String(id), label: it ? (it.title || it.name || String(id)) : String(id) };
              });
              setCustomPropValue(entity, recordId, key, JSON.stringify(newItems));
              // Sprint FK + relations table sync
              if (relEntity === 'sprint' && entity === 'task') {
                const spId = multiIds.length > 0 ? parseInt(multiIds[0]) : null;
                api('PATCH', `/api/tasks/${recordId}`, { sprint_id: spId }).catch(() => {});
                for (const sid of multiIds) api('POST', `/api/relations/sprint/${sid}`, { related_entity_type: 'task', related_entity_id: parseInt(recordId) }).catch(() => {});
                for (const id of curIds) if (!multiIds.map(String).includes(String(id))) api('DELETE', `/api/relations/sprint/${id}/task/${recordId}`, {}).catch(() => {});
              }
              // Bilateral sync
              if (def.bilateral !== false) {
                const revKey = def.reverseKey ?? `${entity}_${key}`;
                let sourceTitle = String(recordId);
                try {
                  const isBuiltinSrc = ['task','goal','project','sprint','note','resource','habit'].includes(entity);
                  const srcPath = entity === 'task' ? `/api/tasks/${recordId}` : isBuiltinSrc ? `/api/${entity}s/${recordId}` : `/api/custom/${entity}/${recordId}`;
                  const src = await api('GET', srcPath);
                  sourceTitle = src.title || src.name || String(recordId);
                } catch {}
                const newIdSet = new Set(multiIds.map(String));
                const oldIdSet = new Set(curIds.map(String));
                for (const id of newIdSet) {
                  if (!oldIdSet.has(id)) {
                    let revVals = getCustomPropValues(relEntity, parseInt(id));
                    try {
                      const serverProps = await api('GET', `/api/properties?entity_type=${relEntity}&entity_id=${id}`);
                      revVals = { ...revVals, ...serverProps };
                      localStorage.setItem(`customPropVals_${relEntity}_${id}`, JSON.stringify(revVals));
                    } catch(e) {}
                    let revArr = parseRelationValue(revVals[revKey] ?? '');
                    if (!revArr.some(x => x.id === String(recordId))) {
                      revArr.push({ id: String(recordId), label: sourceTitle });
                      setCustomPropValue(relEntity, parseInt(id), revKey, JSON.stringify(revArr));
                    }
                  }
                }
                for (const id of oldIdSet) {
                  if (id && !newIdSet.has(id)) {
                    let revVals = getCustomPropValues(relEntity, parseInt(id));
                    try {
                      const serverProps = await api('GET', `/api/properties?entity_type=${relEntity}&entity_id=${id}`);
                      revVals = { ...revVals, ...serverProps };
                      localStorage.setItem(`customPropVals_${relEntity}_${id}`, JSON.stringify(revVals));
                    } catch(e) {}
                    let revArr = parseRelationValue(revVals[revKey] ?? '');
                    revArr = revArr.filter(x => x.id !== String(recordId));
                    setCustomPropValue(relEntity, parseInt(id), revKey, JSON.stringify(revArr));
                  }
                }
              }
              valEl.innerHTML = newItems.length
                ? newItems.map(it => `<span class="multi-chip" style="font-size:11px">${escHtml(it.label)}</span>`).join('')
                : '<span class="empty">—</span>';
            },
            { multiSelect: true, selectedIds: curIds }
          );
        }).catch(() => {});
        return;
      }
      const inp = def.type === 'number'
        ? Object.assign(document.createElement('input'), { type: 'number', value: cur })
        : Object.assign(document.createElement('input'), { type: def.type === 'email' ? 'email' : def.type === 'phone' ? 'tel' : 'text', value: cur, placeholder: def.label });
      inp.style.cssText = 'width:100%;border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:13px;background:var(--bg-card);color:var(--text-primary)';
      valEl.innerHTML = '';
      valEl.appendChild(inp);
      inp.focus();
      const save = () => {
        setCustomPropValue(entity, recordId, key, inp.value);
        onRerender();
      };
      inp.onblur = save;
      inp.onkeydown = (ke) => { if (ke.key === 'Enter') inp.blur(); if (ke.key === 'Escape') { valEl.innerHTML = cur || '<span class="empty">—</span>'; } };
    };
  });

  // Wire custom checkbox changes
  panel.querySelectorAll('.icp-check').forEach(chk => {
    chk.onchange = () => setCustomPropValue(chk.dataset.entity, chk.dataset.recordId, chk.dataset.propKey, chk.checked);
  });

  // Wire delete buttons (remove custom prop def + values from all records)
  panel.querySelectorAll('.icp-del-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.dataset.propKey;
      const defLabel = getCustomPropDefs(entity).find(d => d.key === key)?.label || key;
      showConfirmModal(`Delete property "<b>${defLabel}</b>"?<br><span style="font-size:12px;color:var(--text-muted)">This removes it from all ${entity}s.</span>`, async () => {
        const defs = getCustomPropDefs(entity).filter(d => d.key !== key);
        setCustomPropDefs(entity, defs);
        const ord = getEntityPropOrder(entity);
        if (ord) setEntityPropOrder(entity, ord.filter(k => k !== key));
        if (entity === 'task') {
          ['board','table','list','kanban','cards'].forEach(vm => {
            const v = getTaskVisProps(vm); setTaskVisProps(vm, v.filter(k => k !== key));
          });
        } else {
          const v = getEntityVisProps(entity); setEntityVisProps(entity, v.filter(k => k !== key));
        }
        const prefix = `customPropVals_${entity}_`;
        Object.keys(localStorage).forEach(lsKey => {
          if (lsKey.startsWith(prefix)) {
            try {
              const vals = JSON.parse(localStorage.getItem(lsKey) || '{}');
              if (key in vals) { delete vals[key]; localStorage.setItem(lsKey, JSON.stringify(vals)); }
            } catch {}
          }
        });
        try { await api('DELETE', `/api/properties?entity_type=${entity}&key=${encodeURIComponent(key)}`); } catch(err) {}
        document.dispatchEvent(new CustomEvent('propDefsChanged', { detail: { entity } }));
        onRerender();
      });
    };
  });

  // Wire multi_select chip removes (× per chip)
  panel.querySelectorAll('.ms-chip-remove').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.closest('[data-prop-key]')?.dataset.propKey;
      if (!key) return;
      const cur = getCustomPropValues(entity, recordId)[key] ?? '';
      const arr = (() => { try { const a = JSON.parse(cur); return Array.isArray(a) ? a : []; } catch { return []; } })();
      const updated = arr.filter(v => v !== btn.dataset.val);
      setCustomPropValue(entity, recordId, key, JSON.stringify(updated));
      onRerender();
    };
  });

  // Wire multi_select + button — opens full tag-like picker
  panel.querySelectorAll('.ms-add-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const key = btn.dataset.propKey || btn.closest('[data-prop-key]')?.dataset.propKey;
      if (!key) return;
      const defs = getCustomPropDefs(entity);
      const def = defs.find(d => d.key === key);
      if (!def) return;
      openMultiSelectPicker(btn, def, entity, recordId, key, onRerender);
    };
  });

  // Wire Add property button
  bindAddPropBtn(entity, onRerender);

  // Wire drag-to-reorder
  bindPropPanelDrag(panel, entity, onRerender);

  // Wire label column resizer
  bindPropLabelResizer(panel);
}

// ── bindPropPanelDrag ─────────────────────────────────────────────────────
// Mouse-based drag-to-reorder for .inline-prop-row rows inside panelEl.
// On drop, saves new order to localStorage and calls onRerender.
function bindPropPanelDrag(panelEl, entity, onRerender) {
  let dragRow = null, dragIdx = -1, placeholder = null, startY = 0;

  panelEl.querySelectorAll('.inline-prop-drag-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const row = handle.closest('.inline-prop-row');
      if (!row) return;
      dragRow = row;
      const rows = [...panelEl.querySelectorAll('.inline-prop-row')];
      dragIdx = rows.indexOf(row);
      startY = e.clientY;

      // Create placeholder
      placeholder = document.createElement('div');
      placeholder.className = 'inline-prop-row';
      placeholder.style.cssText = `height:${row.offsetHeight}px;opacity:0.3;background:var(--accent-glow);border-radius:var(--radius-sm)`;

      row.style.cssText += ';opacity:0.4;pointer-events:none;';

      const onMove = (ev) => {
        const currentRows = [...panelEl.querySelectorAll('.inline-prop-row:not([style*="pointer-events"])')];
        const panelRect = panelEl.getBoundingClientRect();
        const relY = ev.clientY - panelRect.top;
        let insertBefore = null;
        for (const r of currentRows) {
          const rRect = r.getBoundingClientRect();
          const rMid = rRect.top - panelRect.top + rRect.height / 2;
          if (relY < rMid) { insertBefore = r; break; }
        }
        if (insertBefore) panelEl.insertBefore(placeholder, insertBefore);
        else {
          // Insert before add-row
          const addRow = panelEl.querySelector('.inline-prop-add-row');
          panelEl.insertBefore(placeholder, addRow || null);
        }
      };

      panelEl.insertBefore(placeholder, row.nextSibling);

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!dragRow || !placeholder) return;

        // Determine final order from current DOM
        const finalRows = [...panelEl.querySelectorAll('.inline-prop-row')];
        const phIdx = finalRows.indexOf(placeholder);
        // Insert dragRow where placeholder is
        panelEl.insertBefore(dragRow, placeholder);
        placeholder.remove();
        dragRow.style.opacity = '';
        dragRow.style.pointerEvents = '';

        // Save new order
        const newOrder = [...panelEl.querySelectorAll('.inline-prop-row')].map(r => r.dataset.propKey).filter(Boolean);
        setEntityPropOrder(entity, newOrder);
        onRerender();
        dragRow = null; placeholder = null;
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ── bindPropLabelResizer ──────────────────────────────────────────────────────
// Wires all .prop-label-resizer elements inside panelEl to drag-resize the label column.
function bindPropLabelResizer(panelEl) {
  panelEl.querySelectorAll('.prop-label-resizer').forEach(resizer => {
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = getPropLabelWidth();
      const onMove = (mv) => {
        const newW = Math.max(60, Math.min(280, startW + mv.clientX - startX));
        panelEl.style.setProperty('--prop-label-w', newW + 'px');
      };
      const onUp = (ev) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const finalW = Math.max(60, Math.min(280, startW + ev.clientX - startX));
        setPropLabelWidth(finalW);
        document.querySelectorAll('.inline-prop-panel').forEach(p => p.style.setProperty('--prop-label-w', finalW + 'px'));
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

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

function getDateFormat() {
  return localStorage.getItem('_globalDateFormat') || 'short';
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const s = stripDate(dateStr);
  const d = new Date(s + 'T00:00:00');
  const fmt = getDateFormat();
  if (fmt === 'iso') return s;
  if (fmt === 'eu') { const [y,m,day] = s.split('-'); return `${day}/${m}/${y}`; }
  if (fmt === 'numeric') return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  if (fmt === 'long') return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(stripDate(dateStr) + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}

// Returns an inline color string based on how near/far the due date is.
// overdue → red; today → orange; 1-2d → amber; 3-6d → yellow-green; 7+ → green
function dueDateColor(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days < 0)  return '#ef4444';
  if (days === 0) return '#f97316';
  if (days <= 2)  return '#f59e0b';
  if (days <= 6)  return '#84cc16';
  return '#22c55e';
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
  const color = dueDateColor(dateStr);
  return `<span class="task-due" style="color:${color}">${fmtDate(dateStr)}</span>`;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function showJSONModal(endpoint, filename) {
  const data = await api('GET', endpoint);
  const json = JSON.stringify(data, null, 2);
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `<div class="modal json-modal open" style="position:static;transform:none;opacity:1;visibility:visible;max-width:720px;width:95vw;max-height:85vh;overflow:hidden">
    <div class="modal-header">
      <span class="modal-title">${filename}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-ghost btn-sm" id="json-download-btn">Download</button>
        <button class="modal-close" id="json-close-btn">×</button>
      </div>
    </div>
    <pre class="json-preview">${json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#json-close-btn').onclick = () => modal.remove();
  modal.querySelector('#json-download-btn').onclick = () => downloadJSON(data, filename);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
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
            <div class="filter-pill-row">
            ${fd.options.map(opt => {
              const active = fd.multi
                ? (state.filters[fd.key] && state.filters[fd.key].has(String(opt.value)))
                : String(state.filters[fd.key]) === String(opt.value);
              return `<button class="filter-pill-btn${active ? ' active' : ''}" data-filter-key="${fd.key}" data-filter-val="${opt.value}" data-filter-multi="${fd.multi?'1':'0'}">${opt.label}</button>`;
            }).join('')}
            </div>
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
    filterDrop.querySelectorAll('.filter-pill-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const key = btn.dataset.filterKey;
        const val = btn.dataset.filterVal;
        const isMulti = btn.dataset.filterMulti === '1';
        if (isMulti) {
          if (!state.filters[key]) state.filters[key] = new Set();
          if (state.filters[key].has(val)) state.filters[key].delete(val);
          else state.filters[key].add(val);
          if (state.filters[key].size === 0) delete state.filters[key];
        } else {
          if (state.filters[key] === val) delete state.filters[key];
          else state.filters[key] = val;
        }
        btn.classList.toggle('active', isMulti
          ? !!(state.filters[key] && state.filters[key].has(val))
          : state.filters[key] === val);
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

function taskRowHtml(task, showProject, indent, viewMode) {
  const vm = viewMode || 'list';
  const vis = (key) => propVisible(vm, key);
  const done = task.status === 'done';
  const titleCls = done ? 'task-title-text done' : 'task-title-text';
  const projBadge = showProject && task.project_title && vis('project')
    ? `<span class="task-project">${task.project_title}</span>` : '';
  const goalBadge = vis('goal') && task.goal_title
    ? `<span class="task-project" style="background:var(--color-surface-secondary,var(--bg-card));border:1px solid var(--border)">${task.goal_title}</span>` : '';
  const dueBadge = vis('due_date') ? dueBadgeHtml(task.due_date) : '';
  const hasChildren = (task.sub_task_count || task.subtask_count || 0) > 0;
  const isExpanded = expandedTasks.has(String(task.id));
  const chevronSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,3 5,7 8,3"/></svg>`;
  const toggleArrow = `<span class="task-toggle-arrow ${isExpanded ? 'expanded' : ''}" data-toggle-id="${task.id}" title="Toggle subtasks">${chevronSvg}</span>`;
  const tagChips = vis('tags') ? (task.tags || []).slice(0, 2).map(t => tagHtml(t)).join('') : '';
  const recurBadge = vis('recurrence') && task.recur_interval > 0 ? `<span class="task-recur-badge" title="Repeats every ${task.recur_interval} ${task.recur_unit||'days'}">↺</span>` : '';
  const indentStyle = indent ? `padding-left:${indent * 24 + 12}px` : '';

  // Category label
  let catLabel = '';
  if (vis('category') && task.category_id) {
    const cat = allCategories.find(c => c.id === task.category_id);
    catLabel = cat ? cat.name : (task.category || '');
  }
  const catChip = catLabel ? `<span class="task-category-chip">${catLabel}</span>` : '';
  const statusChip = vis('status') ? statusBadge(task.status) : '';
  const priorityChip = vis('priority') ? priorityBadge(task.priority) : '';
  const storyPts = vis('story_points') && task.story_points ? `<span style="font-size:10px;color:var(--text-muted);border:1px solid var(--border);border-radius:3px;padding:0 4px">${task.story_points}pt</span>` : '';

  return `<li class="task-row ${indent ? 'task-row-sub' : ''}" data-task-id="${task.id}" style="${indentStyle}">
    <span class="ctx-handle" data-entity="task" data-id="${task.id}" title="Actions">⠿</span>
    ${toggleArrow}
    <div class="task-check ${done ? 'done' : ''}" data-check-id="${task.id}">${done ? '✓' : ''}</div>
    <div class="task-content">
      <div class="${titleCls}"><span class="list-icon-slot" data-icon-entity="task" data-icon-id="${task.id}" data-icon-size="16" style="display:none;margin-right:4px;vertical-align:middle;font-size:16px"></span>${task.title} <span class="comment-badge" data-comment-for="${task.id}" data-comment-entity="task" style="display:none"></span>${recurBadge}</div>
      <div class="task-meta-row">${projBadge}${goalBadge}${catChip}${tagChips}${statusChip}${priorityChip}${storyPts}</div>
      <div class="task-chips-outer" data-entity="task" data-rid="${task.id}" data-vm="${vm||'list'}">${renderCustomPropChips('task', task.id, vm)}</div>
    </div>
    <span class="task-row-due-right">${dueBadge}</span>
  </li>`;
}

// Module-level tree row builder — used by dashboard and renderTasks list view
function buildTaskTreeRows(tasks, allTasks, depth, showProject, viewMode) {
  let html = '';
  for (const t of tasks) {
    html += taskRowHtml(t, showProject, depth, viewMode);
    const isExpanded = expandedTasks.has(String(t.id));
    const children = allTasks.filter(s => s.parent_task_id === t.id);
    if (isExpanded) {
      if (children.length > 0) {
        html += buildTaskTreeRows(children, allTasks, depth + 1, showProject, viewMode);
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
// Creates HTML for entity action toolbar (icon, cover buttons)

function openSlideover(title, bodyHTML) {
  document.getElementById('slideover-title').textContent = title;
  const bodyEl = document.getElementById('slideover-body');
  const coverWrap = document.getElementById('slideover-cover-wrap');
  // Save and remove cover-wrap before setting innerHTML to preserve it
  if (coverWrap) coverWrap.remove();
  bodyEl.innerHTML = bodyHTML;
  // Re-append cover-wrap at the start of body so it's sticky at top
  if (coverWrap) {
    coverWrap.innerHTML = '';
    coverWrap.classList.remove('has-cover');
    coverWrap.style.backgroundImage = '';
    bodyEl.insertBefore(coverWrap, bodyEl.firstChild);
  }
  setSlideoverExport(null, null); // reset export button
  setSlideoverExpand(null);
  setFsPropsBuilder(null);
  setFsChipsBuilder(null);
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

function setSlideoverExport(entity, id) {
  const btn = document.getElementById('slideover-export');
  if (!btn) return;
  if (!entity || !id) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  btn.onclick = () => downloadEntityJson(entity, id);
}

function downloadEntityJson(entity, id, filename) {
  api('GET', `/api/export/${entity}/${id}`).then(data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${entity}-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch(() => showToast('Export failed', 'error'));
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

  let label = detailLabel || VIEW_LABELS[view] || view;
  if (!detailLabel && view.startsWith('custom:')) {
    const typeName = view.slice(7);
    const typeInfo = customEntityTypes.find(t => t.name === typeName);
    label = typeInfo ? (typeInfo.display_name || typeName) : typeName;
  }
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

  // Custom entity views: "custom:{typeName}"
  if (view.startsWith('custom:')) {
    const typeName = view.slice(7);
    renderCustomEntityList(typeName);
    return;
  }

  // Global taxonomy prop views: "taxonomy:{key}"
  if (view.startsWith('taxonomy:')) {
    const taxKey = view.slice(9);
    renderTaxonomyPropView(taxKey);
    return;
  }

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
    case 'automations':     renderAutomationsView(); break;
    case 'custom-detail': {
      if (params) { const [tn, eid] = params.split('/'); renderCustomEntityDetail(tn, eid); }
      break;
    }
    default:
      main.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-icon">?</div><div class="empty-state-text">Unknown view</div></div></div>`;
  }
}

/* ─── Custom Entity Types ─────────────────────────────────────────────── */

async function loadCustomEntityTypes() {
  customEntityTypes = await api('GET', '/api/custom-types').catch(() => []) || [];
  // Sync prop_defs from database → localStorage so getCustomPropDefs finds them
  customEntityTypes.forEach(t => {
    if (!t.prop_defs) return;
    let dbDefs;
    try { dbDefs = JSON.parse(t.prop_defs); } catch(e) { return; }
    if (!Array.isArray(dbDefs) || !dbDefs.length) return;
    const entityKey = `custom_${t.name}`;
    let localDefs;
    try { localDefs = JSON.parse(localStorage.getItem(`customPropDefs_${entityKey}`) || '[]'); } catch(e) { localDefs = []; }
    const localKeys = new Set(localDefs.map(d => d.key));
    const merged = [...localDefs, ...dbDefs.filter(d => !localKeys.has(d.key))];
    localStorage.setItem(`customPropDefs_${entityKey}`, JSON.stringify(merged));
  });
  renderCustomEntityNav();
}

function renderCustomEntityNav() {
  const container = document.getElementById('custom-entities-nav');
  if (!container) return;
  if (!customEntityTypes.length) { container.innerHTML = ''; return; }

  function navIconHtml(t) {
    return t.icon
      ? (t.icon.startsWith('__svg:')
          ? `<span class="nav-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px">${renderEntityIcon(t.icon, 16)}</span>`
          : `<span class="nav-icon" style="font-size:16px">${t.icon}</span>`)
      : `<span class="nav-icon" style="font-size:16px">📁</span>`;
  }

  container.innerHTML = customEntityTypes.map(t =>
    `<div class="nav-custom-wrap" data-cet-name="${escHtml(t.name)}">
      <a class="nav-item _cet-nav-link" data-view="custom:${escHtml(t.name)}" href="#" title="Double-click to rename">
        ${navIconHtml(t)}
        <span class="_cet-nav-label">${escHtml(t.display_name || t.name)}</span>
      </a>
    </div>`
  ).join('');

  container.querySelectorAll('._cet-nav-link').forEach(a => {
    let _navClickTimer = null;
    let _navLastClick = 0;

    function startInlineEdit() {
      const wrap = a.closest('.nav-custom-wrap');
      const tName = wrap?.dataset.cetName;
      const t = customEntityTypes.find(ct => ct.name === tName);
      if (!t) return;

      let editIconVal = t.icon || '📁';
      const editIconId = `_cet-edit-icon-${tName}`;
      const editInputId = `_cet-edit-input-${tName}`;
      wrap.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;padding:2px 8px">
          <button id="${editIconId}" style="font-size:16px;background:none;border:1px solid var(--border);border-radius:4px;padding:1px 4px;cursor:pointer;line-height:1.4" title="Change icon">${editIconVal.startsWith('__svg:') ? renderEntityIcon(editIconVal, 16) : editIconVal}</button>
          <input id="${editInputId}" type="text" value="${escHtml(t.display_name || t.name)}"
            style="flex:1;font-size:13px;padding:2px 6px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text-primary);min-width:0" />
          <button class="_cet-edit-save" style="font-size:11px;background:var(--accent);color:#fff;border:none;border-radius:4px;padding:2px 6px;cursor:pointer">✓</button>
          <button class="_cet-edit-cancel" style="font-size:11px;background:none;border:1px solid var(--border);border-radius:4px;padding:2px 6px;cursor:pointer">✕</button>
        </div>`;

      const iconBtn = wrap.querySelector(`#${editIconId}`);
      const inp = wrap.querySelector(`#${editInputId}`);
      inp.focus(); inp.select();

      iconBtn.onclick = (ev) => {
        ev.stopPropagation();
        showIconPicker(iconBtn, null, null, editIconVal, (newIcon) => {
          editIconVal = newIcon || '📁';
          iconBtn.innerHTML = editIconVal.startsWith('__svg:') ? renderEntityIcon(editIconVal, 16) : editIconVal;
        });
      };

      async function saveEdit() {
        const newName = inp.value.trim();
        if (!newName) { renderCustomEntityNav(); return; }
        try {
          await api('PUT', `/api/custom-types/${tName}`, {
            display_name: newName,
            icon: editIconVal,
            prop_defs: t.prop_defs || '',
            has_detail_view: t.has_detail_view,
          });
          t.display_name = newName;
          t.icon = editIconVal;
          renderCustomEntityNav();
          showToast('Updated');
        } catch(err) {
          showToast('Failed to save', 'error');
          renderCustomEntityNav();
        }
      }

      wrap.querySelector('._cet-edit-save').onclick = (ev) => { ev.stopPropagation(); saveEdit(); };
      wrap.querySelector('._cet-edit-cancel').onclick = (ev) => { ev.stopPropagation(); renderCustomEntityNav(); };
      inp.onkeydown = (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); saveEdit(); }
        if (ev.key === 'Escape') { ev.preventDefault(); renderCustomEntityNav(); }
      };
    }

    a.onclick = e => {
      e.preventDefault();
      const now = Date.now();
      if (now - _navLastClick < 300) {
        clearTimeout(_navClickTimer);
        _navClickTimer = null;
        _navLastClick = 0;
        startInlineEdit();
        return;
      }
      _navLastClick = now;
      _navClickTimer = setTimeout(() => { _navClickTimer = null; renderView(a.dataset.view); }, 280);
    };
  });
}

async function renderCustomEntityList(typeName) {
  const typeInfo = customEntityTypes.find(t => t.name === typeName);
  const displayName = typeInfo ? (typeInfo.display_name || typeName) : typeName;
  const rawIcon = typeInfo ? (typeInfo.icon || '📁') : '📁';
  const iconHtml = rawIcon.startsWith('__svg:') ? renderEntityIcon(rawIcon, 20) : `<span style="font-size:18px">${rawIcon}</span>`;
  let propDefs = [];
  if (typeInfo && typeInfo.prop_defs) {
    try { propDefs = JSON.parse(typeInfo.prop_defs); } catch(e) { propDefs = []; }
  }

  const entityKey = `custom_${typeName}`;
  const views = getEntityViews(entityKey);
  const activeId = getActiveTabId(entityKey);
  let activeView = views.find(v => v.id === activeId) || views[0];
  let viewMode = activeView.viewType || 'list';

  const main = document.getElementById('main-content');
  try {
    const entities = await api('GET', `/api/custom/${typeName}`);
    let list = Array.isArray(entities) ? entities : [];

    main.innerHTML = `<div class="view">
      <div class="view-header"><h1 class="view-title">${iconHtml} ${escHtml(displayName)}</h1></div>
      ${buildViewTabBar(entityKey, views, activeView.id)}
      <div id="custom-entity-content"></div>
    </div>`;

    // Double-click on view title → inline edit display_name + icon
    const viewTitleEl = main.querySelector('.view-title');
    if (viewTitleEl && typeInfo) {
      let _titleLastClick = 0;
      viewTitleEl.style.cursor = 'default';
      viewTitleEl.title = 'Double-click to rename';
      viewTitleEl.onclick = (e) => {
        const now = Date.now();
        if (now - _titleLastClick < 350) {
          _titleLastClick = 0;
          let editIconVal = typeInfo.icon || '📁';
          viewTitleEl.innerHTML = `
            <span style="display:inline-flex;align-items:center;gap:6px">
              <button id="_cet-title-icon-btn" style="font-size:18px;background:none;border:1px solid var(--border);border-radius:4px;padding:1px 5px;cursor:pointer;line-height:1.4" title="Change icon">${editIconVal.startsWith('__svg:') ? renderEntityIcon(editIconVal, 20) : editIconVal}</button>
              <input id="_cet-title-input" type="text" value="${escHtml(typeInfo.display_name || typeInfo.name)}"
                style="font-size:inherit;padding:2px 8px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text-primary);min-width:120px" />
              <button id="_cet-title-save" style="font-size:12px;background:var(--accent);color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer">✓</button>
              <button id="_cet-title-cancel" style="font-size:12px;background:none;border:1px solid var(--border);border-radius:4px;padding:2px 8px;cursor:pointer">✕</button>
            </span>`;
          const iconBtn = viewTitleEl.querySelector('#_cet-title-icon-btn');
          const inp = viewTitleEl.querySelector('#_cet-title-input');
          inp.focus(); inp.select();
          iconBtn.onclick = (ev) => {
            ev.stopPropagation();
            showIconPicker(iconBtn, null, null, editIconVal, (newIcon) => {
              editIconVal = newIcon || '📁';
              iconBtn.innerHTML = editIconVal.startsWith('__svg:') ? renderEntityIcon(editIconVal, 20) : editIconVal;
            });
          };
          const restoreTitle = () => {
            const ri = typeInfo.icon || '📁';
            const riHtml = ri.startsWith('__svg:') ? renderEntityIcon(ri, 20) : `<span style="font-size:18px">${ri}</span>`;
            viewTitleEl.innerHTML = `${riHtml} ${escHtml(typeInfo.display_name || typeInfo.name)}`;
          };
          const saveTitle = async () => {
            const newName = inp.value.trim();
            if (!newName) { restoreTitle(); return; }
            try {
              await api('PUT', `/api/custom-types/${typeName}`, {
                display_name: newName,
                icon: editIconVal,
                prop_defs: typeInfo.prop_defs || '',
                has_detail_view: typeInfo.has_detail_view,
              });
              typeInfo.display_name = newName;
              typeInfo.icon = editIconVal;
              renderCustomEntityNav();
              restoreTitle();
              showToast('Updated');
            } catch(err) {
              showToast('Failed to save', 'error');
              restoreTitle();
            }
          };
          viewTitleEl.querySelector('#_cet-title-save').onclick = (ev) => { ev.stopPropagation(); saveTitle(); };
          viewTitleEl.querySelector('#_cet-title-cancel').onclick = (ev) => { ev.stopPropagation(); restoreTitle(); };
          inp.onkeydown = (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); saveTitle(); }
            if (ev.key === 'Escape') { ev.preventDefault(); restoreTitle(); }
          };
          return;
        }
        _titleLastClick = now;
      };
    }

    // Update "new" button label and wire it up
    const newBtn = document.getElementById(`new-${entityKey}-btn`);
    if (newBtn) { newBtn.textContent = `+ New ${displayName}`; newBtn.onclick = () => openCustomEntityForm(typeName, null); }

    // Inject prop-visibility eye button into toolbar
    const eyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const propVisHtml = `<div class="prop-vis-wrap" id="${entityKey}-prop-vis-wrap" style="margin-right:4px"><button class="btn btn-sm btn-ghost" id="${entityKey}-prop-vis-btn" title="Property visibility">${eyeSvg}</button></div>`;
    const customToolbarRight = main.querySelector(`#${entityKey}-tab-bar .view-toolbar-right`);
    if (customToolbarRight && newBtn) {
      customToolbarRight.insertBefore(document.createRange().createContextualFragment(propVisHtml), newBtn);
    }
    const propVisBtn = document.getElementById(`${entityKey}-prop-vis-btn`);
    const propVisWrap = document.getElementById(`${entityKey}-prop-vis-wrap`);
    if (propVisBtn && propVisWrap) {
      propVisBtn.onclick = (e) => {
        e.stopPropagation();
        // Use full prop defs (including taxonomy) for the visibility panel
        const propList = [{ key: 'tags', label: 'Tags' }, ...getCustomPropDefs(entityKey).map(pd => ({ key: pd.key, label: pd.label || pd.key }))];
        bindPropVisPanel(propVisWrap, propList, () => getEntityVisProps(entityKey), (keys) => setEntityVisProps(entityKey, keys), render);
      };
    }

    // Bind view tab bar
    bindViewTabBar(entityKey, (newActiveId) => {
      setActiveTabId(entityKey, newActiveId);
      const v = getEntityViews(entityKey).find(v => v.id === newActiveId) || views[0];
      activeView = v;
      viewMode = v.viewType || 'list';
      render();
    }, () => renderCustomEntityList(typeName));

    function bindRows() {
      bindCtxHandles(main);
      injectListIcons(entityKey, list.map(e => e.id));
      main.querySelectorAll('.custom-entity-row[data-id]').forEach(row => {
        row.onclick = e => {
          if (e.target.closest('.ctx-handle')) return;
          if (typeInfo && typeInfo.has_detail_view) {
            renderView('custom-detail', `${typeName}/${row.dataset.id}`);
          } else {
            openCustomEntitySlideover(typeName, parseInt(row.dataset.id));
          }
        };
      });
    }

    // Use full prop defs (including taxonomy) for all view builders
    const allCustomDefs = getCustomPropDefs(entityKey);

    function renderPropVal(pd, rawVal) {
      if (!rawVal) return '';
      if (pd.type === 'date') return fmtDate(rawVal) || rawVal;
      if (pd.type === 'multi_select' || pd.type === 'checkbox') {
        try { const arr = JSON.parse(rawVal); if (Array.isArray(arr)) return arr.join(', '); } catch {}
      }
      if (pd.type === 'relation') {
        try { const arr = JSON.parse(rawVal); if (Array.isArray(arr)) return arr.map(it => it.label || it.id).join(', '); } catch {}
      }
      return String(rawVal);
    }

    function buildListView(items) {
      if (!items.length) return emptyState();
      return `<div class="entity-list-view">${items.map(e => {
        const visProps = allCustomDefs.filter(pd => entityPropVisible(entityKey, pd.key)).slice(0, 4).map(pd => {
          const v = renderPropVal(pd, e.props?.[pd.key] || '');
          return v ? `<span class="entity-list-meta">${escHtml(v)}</span>` : '';
        }).filter(Boolean).join('');
        const tagSpan = entityPropVisible(entityKey, 'tags') && e.tags?.length
          ? e.tags.map(t => `<span class="multi-chip color-${t.color||'blue'}" style="font-size:11px">${escHtml(t.name)}</span>`).join('')
          : '';
        return `<div class="entity-list-row custom-entity-row" data-id="${e.id}" style="cursor:pointer">
          <span class="ctx-handle" data-entity="${escHtml(entityKey)}" data-id="${e.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
          <span class="list-icon-slot" data-icon-entity="${escHtml(entityKey)}" data-icon-id="${e.id}" data-icon-size="16" style="display:none;flex-shrink:0"></span>
          <span class="entity-list-title">${escHtml(e.title)}</span>
          ${visProps}${tagSpan}
        </div>`;
      }).join('')}</div>`;
    }

    function buildCardsView(items) {
      if (!items.length) return emptyState();
      return `<div class="entity-cards">${items.map(e => {
        const visProps = allCustomDefs.filter(pd => entityPropVisible(entityKey, pd.key)).slice(0, 5).map(pd => {
          const v = renderPropVal(pd, e.props?.[pd.key] || '');
          return v ? `<div style="display:flex;gap:6px;font-size:12px;padding:2px 0"><span style="color:var(--text-muted);min-width:80px;flex-shrink:0">${escHtml(pd.label)}</span><span>${escHtml(v)}</span></div>` : '';
        }).filter(Boolean).join('');
        const tagRow = entityPropVisible(entityKey, 'tags') && e.tags?.length
          ? `<div style="display:flex;gap:4px;flex-wrap:wrap;padding:2px 0">${e.tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${escHtml(t.name)}</span>`).join('')}</div>`
          : '';
        return `<div class="entity-card custom-entity-row" data-id="${e.id}" style="cursor:pointer;display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px">
            <span class="ctx-handle" data-entity="${escHtml(entityKey)}" data-id="${e.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
            <div class="entity-card-title" style="font-weight:600;font-size:14px;flex:1">${escHtml(e.title)}</div>
          </div>
          ${visProps}${tagRow}
        </div>`;
      }).join('')}</div>`;
    }

    function buildTableView(items) {
      if (!items.length) return emptyState();
      const visDefs = allCustomDefs.filter(pd => entityPropVisible(entityKey, pd.key));
      const showTags = entityPropVisible(entityKey, 'tags');
      return `<div class="entity-table-wrap"><table class="entity-table">
        <thead><tr>
          <th class="ctx-handle-th"></th>
          <th>Title</th>
          ${visDefs.map(pd => `<th>${escHtml(pd.label)}</th>`).join('')}
          ${showTags ? '<th>Tags</th>' : ''}
          <th>Created</th>
        </tr></thead>
        <tbody>${items.map(e => `<tr class="custom-entity-row" data-id="${e.id}" style="cursor:pointer">
          <td class="ctx-handle-cell"><span class="ctx-handle" data-entity="${escHtml(entityKey)}" data-id="${e.id}" title="Actions" onclick="event.stopPropagation()">⠿</span></td>
          <td style="font-weight:500">${escHtml(e.title)}</td>
          ${visDefs.map(pd => `<td>${escHtml(renderPropVal(pd, e.props?.[pd.key] || ''))}</td>`).join('')}
          ${showTags ? `<td>${e.tags?.length ? e.tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${escHtml(t.name)}</span>`).join('') : ''}</td>` : ''}
          <td style="color:var(--text-muted);font-size:11px">${fmtDate(e.created_at)}</td>
        </tr>`).join('')}
        </tbody>
      </table></div>`;
    }

    function emptyState() {
      return `<div class="empty-state"><div class="empty-state-icon">${iconHtml}</div><div class="empty-state-text">No ${escHtml(displayName.toLowerCase())} yet.</div></div>`;
    }

    function buildKanbanView(items) {
      const groupProp = allCustomDefs.find(d => d.type === 'select' || d.type === 'status');
      if (!groupProp) {
        return `<div class="empty-state"><div class="empty-state-text">Add a <strong>Select</strong> or <strong>Status</strong> property to use Kanban view.</div></div>`;
      }
      const colKeys = groupProp.options || [];
      const grouped = {};
      colKeys.forEach(k => { grouped[k] = []; });
      grouped[''] = [];
      items.forEach(item => {
        const val = item.props?.[groupProp.key] || '';
        if (!grouped[val]) grouped[val] = [];
        grouped[val].push(item);
      });
      const extraKeys = Object.keys(grouped).filter(k => k && !colKeys.includes(k) && grouped[k].length > 0);
      const allColKeys = [...colKeys, ...extraKeys];
      if (grouped[''] && grouped[''].length > 0) allColKeys.push('');

      const colsHtml = allColKeys.map(colKey => {
        const colItems = grouped[colKey] || [];
        const cardsHtml = colItems.map(item => {
          const visProps = allCustomDefs.filter(d => d.key !== groupProp.key && entityPropVisible(entityKey, d.key)).slice(0, 3).map(pd => {
            const v = renderPropVal(pd, item.props?.[pd.key] || '');
            return v ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escHtml(pd.label)}: ${escHtml(v)}</div>` : '';
          }).filter(Boolean).join('');
          const tagRow = entityPropVisible(entityKey, 'tags') && item.tags?.length
            ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px">${item.tags.map(t => `<span class="multi-chip color-${t.color||'blue'}" style="font-size:10px">${escHtml(t.name)}</span>`).join('')}</div>`
            : '';
          return `<div class="kanban-card custom-entity-row" data-id="${item.id}" style="cursor:pointer">
            <div class="kanban-card-header">
              <div class="kanban-card-title">${escHtml(item.title)}</div>
              <span class="ctx-handle" data-entity="${escHtml(entityKey)}" data-id="${item.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
            </div>
            ${cardsHtml}${tagRow}
          </div>`;
        }).join('');
        const label = colKey || '(None)';
        return `<div class="kanban-col" data-col="${escHtml(colKey)}">
          <div class="kanban-col-header">
            <span>${escHtml(label)}</span>
            <span class="kanban-count">${colItems.length}</span>
          </div>
          <div class="kanban-col-body">${cardsHtml || `<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No items</div>`}</div>
        </div>`;
      }).join('');

      const colCount = Math.max(allColKeys.length, 1);
      const boardStyle = `display:grid;grid-template-columns:repeat(${colCount},minmax(220px,1fr));gap:var(--space-4);align-items:start;padding-bottom:16px`;
      return `<div style="overflow-x:auto;width:100%"><div class="kanban-board" data-groupby="${escHtml(groupProp.key)}" data-entity-key="${escHtml(entityKey)}" style="${boardStyle}">${colsHtml}</div></div>`;
    }

    async function render() {
      const container = document.getElementById('custom-entity-content');
      if (!container) return;
      try {
        const fresh = await api('GET', `/api/custom/${typeName}`);
        if (Array.isArray(fresh)) list = fresh;
      } catch (_) {}
      if (viewMode === 'kanban') container.innerHTML = buildKanbanView(list);
      else if (viewMode === 'cards') container.innerHTML = buildCardsView(list);
      else if (viewMode === 'table') container.innerHTML = buildTableView(list);
      else container.innerHTML = buildListView(list);
      bindRows();
      if (viewMode === 'kanban') {
        const board = container.querySelector('.kanban-board[data-entity-key]');
        if (board) {
          const gPropKey = board.dataset.groupby;
          bindKanbanDrag(board, '.kanban-card.custom-entity-row[data-id]', 'id', async (itemId, colKey) => {
            const item = list.find(x => String(x.id) === String(itemId));
            if (!item) return;
            const newProps = Object.assign({}, item.props || {}, { [gPropKey]: colKey });
            await api('PUT', `/api/custom/${typeName}/${itemId}`, { title: item.title, props: newProps });
            render();
          });
        }
      }
    }

    render();
  } catch(err) {
    main.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text" style="color:var(--color-danger)">Failed to load ${escHtml(displayName)}: ${escHtml(String(err))}</div></div></div>`;
  }
}

async function renderCustomEntityDetail(typeName, entityId) {
  const typeInfo = customEntityTypes.find(t => t.name === typeName);
  const displayName = typeInfo ? (typeInfo.display_name || typeName) : typeName;
  const rawIcon = typeInfo ? (typeInfo.icon || '📁') : '📁';
  const iconHtml = rawIcon.startsWith('__svg:') ? renderEntityIcon(rawIcon, 20) : `<span style="font-size:18px">${rawIcon}</span>`;
  const entityKey = `custom_${typeName}`;
  const main = document.getElementById('main-content');
  try {
    const e = await api('GET', `/api/custom/${typeName}/${entityId}`);
    const propPanel = buildInlinePropPanel(entityKey, parseInt(entityId), []);
    main.innerHTML = `<div class="view">
      <div class="entity-view-cover" id="ced-cover-row"></div>
      <div class="entity-view-action" id="ced-action-row">
        <button class="entity-icon-add-btn" id="ced-icon-btn">
          <span id="ced-icon-display"></span>
          <span id="ced-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
        </button>
      </div>
      <div class="view-header">
        <div>
          <div style="color:var(--text-muted);font-size:12px;cursor:pointer;margin-bottom:4px" id="ced-back-crumb">← ${escHtml(displayName)}</div>
          <h1 class="view-title">${escHtml(e.title)}</h1>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" id="ced-manage-btn">Widgets ⚙</button>
          <button class="btn btn-ghost" id="ced-back-btn">← Back</button>
          <button class="btn btn-primary btn-sm" id="ced-edit-btn">Edit</button>
        </div>
      </div>
      <div id="ced-widget-grid">
        ${buildWidgetGrid(entityKey, parseInt(entityId), { propPanelHtml: propPanel })}
      </div>
    </div>`;

    document.getElementById('ced-back-btn').onclick = () => renderView(`custom:${typeName}`);
    document.getElementById('ced-back-crumb').onclick = () => renderView(`custom:${typeName}`);
    document.getElementById('ced-edit-btn').onclick = () => openCustomEntityForm(typeName, e);
    document.getElementById('ced-manage-btn').onclick = (ev) => openWidgetManager(entityKey, ev.currentTarget, () => renderCustomEntityDetail(typeName, entityId));

    const container = document.getElementById('ced-widget-grid');
    initWidgetGrid(entityKey, parseInt(entityId), container, () => renderCustomEntityDetail(typeName, entityId));
    bindInlinePropPanel(entityKey, parseInt(entityId), {}, () => renderCustomEntityDetail(typeName, entityId));

    const cedIconBtn = document.getElementById('ced-icon-btn');
    const cedIconDisplay = document.getElementById('ced-icon-display');
    const cedIconLabel = document.getElementById('ced-icon-add-label');
    const cedActionRow = document.getElementById('ced-action-row');
    const setCedIcon = (icon) => {
      cedIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 32) : '';
      cedIconDisplay.dataset.icon = icon || '';
      cedIconLabel.innerHTML = icon ? '' : ACT_ICONS.addIcon + 'Add icon';
      cedActionRow?.classList.toggle('has-entity-icon', !!icon);
    };
    loadEntityIcon(entityKey, entityId).then(icon => setCedIcon(icon || ''));
    cedIconBtn.onclick = (ev) => {
      ev.stopPropagation();
      const cur = cedIconDisplay.dataset.icon || '';
      showIconPicker(cedIconBtn, entityKey, entityId, cur, (newIcon) => {
        setCedIcon(newIcon || '');
        saveEntityIcon(entityKey, entityId, newIcon || '').catch(() => setCedIcon(cur));
      });
    };
    if (typeInfo?.has_detail_view) initDetailViewCover(entityKey, entityId, 'ced-cover-row', 'ced-action-row');
  } catch(err) {
    main.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text" style="color:var(--color-danger)">Failed to load: ${escHtml(String(err))}</div></div></div>`;
  }
}

async function openCustomEntitySlideover(typeName, id) {
  const typeInfo = customEntityTypes.find(t => t.name === typeName);
  const displayName = typeInfo ? (typeInfo.display_name || typeName) : typeName;
  const entityKey = `custom_${typeName}`;

  openSlideover(displayName, '<div class="loading">Loading…</div>');

  let e, cesTags = [];
  try {
    e = await api('GET', `/api/custom/${typeName}/${id}`);
    try { cesTags = await api('GET', `/api/custom/${typeName}/${id}/tags`); } catch(_) { cesTags = []; }
  } catch(err) {
    showToast('Failed to load entity', 'error');
    return;
  }

  await loadEntityCustomProps(entityKey, id);
  if (!allCategories.length) { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} }

  const cesSections = getPropSections(entityKey);
  const cesHeadKeys = cesSections.heading;
  const propPanel = buildInlinePropPanel(entityKey, id, [], cesHeadKeys);
  const cesCustomVals = getCustomPropValues(entityKey, id);
  const cesPropDefs = getCustomPropDefs(entityKey);
  const cesCatId = cesCustomVals._category_id || null;
  const cesCatName = cesCatId ? (allCategories.find(c => String(c.id) === String(cesCatId)) || {}).name : null;

  const cesHeadingChips = cesHeadKeys.filter(k => k !== 'tags').map(k => {
    const def = cesPropDefs.find(d => d.key === k);
    if (!def) return '';
    const val = cesCustomVals[k] || '';
    let displayVal;
    if (def.type === 'multi_select') {
      try { const arr = JSON.parse(val); displayVal = arr.length ? arr.map(v => `<span class="multi-chip" style="font-size:11px">${escHtml(v)}</span>`).join('') : '—'; } catch { displayVal = val || '—'; }
    } else if (def.type === 'relation') {
      try { const arr = JSON.parse(val); displayVal = arr.length ? arr.map(it => `<span class="multi-chip" style="font-size:11px">${escHtml(it.label||it.id)}</span>`).join('') : '—'; } catch { displayVal = val || '—'; }
    } else { displayVal = val ? escHtml(String(val)) : '—'; }
    return `<button class="prop-chip" id="chip-cus-${escHtml(k)}" data-key="${escHtml(k)}"><span class="chip-label">${escHtml(def.label)}</span><span class="chip-value">${displayVal}</span></button>`;
  }).filter(Boolean).join('');

  const body = `
    <button class="entity-icon-add-btn" id="ces-icon-add-btn">
      <span id="ces-icon-display"></span>
      <span id="ces-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      <textarea class="detail-title-input" id="detail-title" rows="1">${(e.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      <button class="prop-chip" id="chip-tags" data-key="tags"><span class="chip-label">Tags</span><span class="chip-value" id="chip-tags-val">${cesTags.length ? cesTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span></button>
      <button class="prop-chip${cesCatName ? '' : ' chip-empty'}" id="chip-category" data-key="category"><span class="chip-label">Category</span><span class="chip-value" id="chip-category-val">${cesCatName || '—'}</span></button>
      ${cesHeadingChips}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${propPanel}

    ${buildRichContentSection(entityKey, id)}

    ${buildCommentSection(entityKey, id)}
  `;

  openSlideover(e.title || displayName, body);
  setSlideoverExport(entityKey, id);
  initSlideoverCoverArea(entityKey, id);

  // Icon
  const cesIconAddBtn = document.getElementById('ces-icon-add-btn');
  const cesIconDisplay = document.getElementById('ces-icon-display');
  const cesIconAddLabel = document.getElementById('ces-icon-add-label');
  loadEntityIcon(entityKey, id).then(icon => {
    if (icon) { cesIconDisplay.innerHTML = renderEntityIcon(icon, 32); cesIconDisplay.dataset.icon = icon; cesIconAddLabel.textContent = ''; }
  });
  cesIconAddBtn.onclick = (ev) => {
    ev.stopPropagation();
    const cur = cesIconDisplay.dataset.icon || '';
    showIconPicker(cesIconAddBtn, entityKey, id, cur, (newIcon) => {
      cesIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      cesIconDisplay.dataset.icon = newIcon || '';
      cesIconAddLabel.innerHTML = newIcon ? '' : ACT_ICONS.addIcon + 'Add icon';
      saveEntityIcon(entityKey, id, newIcon);
    });
  };

  // Title
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => { titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px'; });
  titleTA.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (ev) => {
    const newTitle = ev.target.value.trim();
    if (newTitle && newTitle !== e.title) {
      api('PUT', `/api/custom/${typeName}/${id}`, { title: newTitle, props: e.props || {} })
        .then(() => { e.title = newTitle; })
        .catch(() => {});
    }
  };

  // Tags chip
  document.getElementById('chip-tags')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const _items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const _curIds = cesTags.map(t => t.id);
    openCombo(ev.currentTarget, _items, null, async ({ multiIds, create }) => {
      if (create) {
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          await api('PUT', `/api/custom/${typeName}/${id}/tags`, { tag_ids: [...new Set([..._curIds, newTag.id])] });
        } catch(err) {}
        closeCombo();
        openCustomEntitySlideover(typeName, id);
        return;
      }
      const ids = (multiIds || []).map(Number);
      cesTags = allTags.filter(t => ids.includes(t.id));
      const v = document.getElementById('chip-tags-val'); if (v) v.innerHTML = cesTags.length ? cesTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      await api('PUT', `/api/custom/${typeName}/${id}/tags`, { tag_ids: ids });
    }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
  });

  // Category chip
  document.getElementById('chip-category')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const _catItems = [{ value: '', label: '— None —' }, ...allCategories.map(c => ({ value: c.id, label: c.name }))];
    openCombo(ev.currentTarget, _catItems, cesCatId || '', async ({ value }) => {
      const newId = String(value || '');
      await api('POST', `/api/properties?entity_type=${typeName}&entity_id=${id}`, { key: '_category_id', value: newId });
      if (e.props) e.props._category_id = newId;
      openCustomEntitySlideover(typeName, id);
    });
  });

  // Heading custom prop chips → click triggers matching inline prop row editor
  cesHeadKeys.filter(k => k !== 'tags').forEach(k => {
    const chip = document.getElementById(`chip-cus-${k}`);
    if (!chip) return;
    chip.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const row = document.querySelector(`.inline-prop-panel[data-entity="${entityKey}"] .inline-prop-row[data-prop-key="${k}"]`);
      if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); row.querySelector('.inline-prop-value')?.click(); }
    });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (ev) => {
    ev.stopPropagation();
    openPropSectionManager(ev.currentTarget, entityKey, () => openCustomEntitySlideover(typeName, id));
  };

  setFsChipsBuilder((fsContainer) => {
    fsContainer.querySelector('[data-key="tags"]')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const _curIds = cesTags.map(t => t.id);
      openCombo(ev.currentTarget, allTags.map(t => ({ value: t.id, label: t.name, color: t.color })), null, async ({ multiIds, create }) => {
        if (create) {
          try {
            const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
            allTags.push(newTag);
            await api('PUT', `/api/custom/${typeName}/${id}/tags`, { tag_ids: [...new Set([..._curIds, newTag.id])] });
          } catch(err) {}
          closeCombo();
          openCustomEntitySlideover(typeName, id);
          return;
        }
        const ids = (multiIds || []).map(Number);
        cesTags = allTags.filter(t => ids.includes(t.id));
        const v = fsContainer.querySelector('[data-key="tags"] .chip-value');
        if (v) v.innerHTML = cesTags.length ? cesTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
        await api('PUT', `/api/custom/${typeName}/${id}/tags`, { tag_ids: ids });
      }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
    });
    cesHeadKeys.filter(k => k !== 'tags').forEach(k => {
      const chip = fsContainer.querySelector(`[data-key="${k}"]`);
      if (!chip) return;
      chip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const fsProps = document.getElementById('fs-props');
        const row = (fsProps || document).querySelector(`.inline-prop-panel[data-entity="${entityKey}"] .inline-prop-row[data-prop-key="${k}"]`);
        if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); row.querySelector('.inline-prop-value')?.click(); }
      });
    });
    fsContainer.querySelector('.prop-chips-more')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openPropSectionManager(ev.currentTarget, entityKey, () => openCustomEntitySlideover(typeName, id));
    });
  });

  bindInlinePropPanel(entityKey, id, {}, () => openCustomEntitySlideover(typeName, id));
  bindCommentSection(document.querySelector(`.comment-section[data-entity-type="${entityKey}"]`));
  initRichEditor(`editorjs-${entityKey}-${id}`, entityKey, id, false);
  if (typeInfo?.has_detail_view) {
    setSlideoverExpand(() => { closeSlideover(); renderView('custom-detail', `${typeName}/${id}`); });
  } else {
    setSlideoverExpand(() => openEntityFullscreen(entityKey, id, e.title || displayName, (t) => {
      api('PUT', `/api/custom/${typeName}/${id}`, { title: t, props: e.props || {} }).catch(() => {});
    }));
  }
}

async function openCustomEntityForm(typeName, entityOrNull) {
  const typeInfo = customEntityTypes.find(t => t.name === typeName);
  const displayName = typeInfo ? (typeInfo.display_name || typeName) : typeName;
  const entityKey = `custom_${typeName}`;
  let propDefs = [];
  if (typeInfo && typeInfo.prop_defs) {
    try { propDefs = JSON.parse(typeInfo.prop_defs); } catch(e) { propDefs = []; }
  }

  // If given a partial entity with only id, fetch full entity
  let entity = entityOrNull;
  if (entity && entity.id && !entity.title) {
    try { entity = await api('GET', `/api/custom/${typeName}/${entity.id}`); } catch(e) { entity = null; }
  }

  const isEdit = !!(entity && entity.id);
  const props = (entity && entity.props) || {};

  // Load existing tags for edit mode
  let existingTags = [];
  if (isEdit) {
    try { existingTags = await api('GET', `/api/custom/${typeName}/${entity.id}/tags`); } catch {}
  }

  // Load global taxonomy props
  const taxProps = getGlobalTaxonomyProps();

  const propFields = propDefs.map(pd => {
    const val = props[pd.key] || '';
    const inputType = pd.type === 'number' ? 'number' : pd.type === 'date' ? 'date' : pd.type === 'url' ? 'url' : 'text';
    return `
      <div class="form-group">
        <label class="form-label">${escHtml(pd.label || pd.key)}</label>
        <input type="${inputType}" id="cf-${escHtml(pd.key)}" value="${escHtml(val)}" placeholder="${escHtml(pd.label || pd.key)}…" />
      </div>`;
  }).join('');

  // Tags field (always shown — taxonomy)
  const existingTagNames = existingTags.map(t => t.name).join(', ');
  const tagsField = `
    <div class="form-group">
      <label class="form-label">Tags <span style="font-size:10px;color:var(--text-muted);font-weight:400">(comma-separated)</span></label>
      <input type="text" id="cf-_tags" value="${escHtml(existingTagNames)}" placeholder="tag1, tag2…" />
    </div>`;

  // Global taxonomy fields (always shown)
  const taxFields = taxProps.map(tp => {
    const opts = getTaxonomyOptions(tp.key);
    const curVals = (() => { try { return JSON.parse(props[`tax_${tp.key}`] || '[]'); } catch { return []; } })();
    return `
      <div class="form-group">
        <label class="form-label">${escHtml(tp.label)} <span style="font-size:10px;color:var(--text-muted);font-weight:400">(select multiple)</span></label>
        <select id="cf-tax-${escHtml(tp.key)}" multiple size="3" style="width:100%;border:1px solid var(--border);border-radius:6px;background:var(--bg-surface);color:var(--text-primary);padding:4px">
          ${opts.map(o => `<option value="${escHtml(o.name)}" ${curVals.includes(o.name)?'selected':''}>${escHtml(o.name)}</option>`).join('')}
        </select>
      </div>`;
  }).join('');

  const formHtml = `
    <div class="form-group">
      <label class="form-label">Title <span style="color:var(--color-danger)">*</span></label>
      <input type="text" id="cf-title" value="${escHtml(entity ? entity.title : '')}" placeholder="${escHtml(displayName)} title…" />
    </div>
    ${propFields}
    ${tagsField}
    ${taxFields}
    <div class="form-actions">
      <button class="btn btn-ghost" id="cf-cancel">Cancel</button>
      <button class="btn btn-primary" id="cf-save">${isEdit ? 'Update' : 'Create'}</button>
    </div>`;

  openFormSlideover(isEdit ? `Edit ${displayName}` : `New ${displayName}`, formHtml);
  requestAnimationFrame(() => document.getElementById('cf-title')?.focus());
  document.getElementById('cf-cancel').onclick = closeFormSlideover;
  document.getElementById('cf-save').onclick = async () => {
    const title = document.getElementById('cf-title').value.trim();
    if (!title) { showToast('Title is required', 'error'); return; }
    const newProps = {};
    propDefs.forEach(pd => {
      const el = document.getElementById(`cf-${pd.key}`);
      if (el) newProps[pd.key] = el.value;
    });
    // Collect taxonomy prop values
    taxProps.forEach(tp => {
      const sel = document.getElementById(`cf-tax-${tp.key}`);
      if (sel) {
        const selected = [...sel.selectedOptions].map(o => o.value);
        newProps[`tax_${tp.key}`] = JSON.stringify(selected);
      }
    });
    try {
      let entityId;
      if (isEdit) {
        await api('PUT', `/api/custom/${typeName}/${entity.id}`, { title, props: newProps });
        entityId = entity.id;
        showToast(`${displayName} updated`);
      } else {
        const created = await api('POST', `/api/custom/${typeName}`, { title, props: newProps });
        entityId = created.id;
        showToast(`${displayName} created`);
      }
      // Save tags
      const tagsInput = document.getElementById('cf-_tags')?.value.trim() || '';
      if (tagsInput || isEdit) {
        const tagNames = tagsInput ? tagsInput.split(',').map(s => s.trim()).filter(Boolean) : [];
        const tagIds = [];
        for (const name of tagNames) {
          let t = allTags.find(x => x.name.toLowerCase() === name.toLowerCase());
          if (!t) { try { t = await api('POST', '/api/tags', { name, color: 'blue' }); allTags.push(t); } catch {} }
          if (t) tagIds.push(t.id);
        }
        await api('PUT', `/api/custom/${typeName}/${entityId}/tags`, { tag_ids: tagIds }).catch(() => {});
      }
      closeFormSlideover();
      renderView(currentView);
    } catch(err) {
      showToast('Error: ' + (err.message || err), 'error');
    }
  };
}

/* ─── Context Menu ───────────────────────────────────────────────────── */

// Entity → API path mapping
const ENTITY_API_MAP = {
  task: 'tasks', goal: 'goals', project: 'projects',
  note: 'notes', resource: 'resources', sprint: 'sprints'
};

// Render the current view after a mutation
function renderCurrentView() {
  switch (currentView) {
    case 'tasks':          renderTasks(); break;
    case 'projects':       renderProjects(); break;
    case 'project-detail': renderProjectDetail(currentParams); break;
    case 'goals':          renderGoals(); break;
    case 'goal-detail':    renderGoalDetail(currentParams); break;
    case 'notes':          renderNotes(); break;
    case 'sprints':        renderSprints(); break;
    case 'sprint-detail':  renderSprintDetail(currentParams); break;
    case 'resources':      renderResources(); break;
    case 'dashboard':      renderDashboard(); break;
    case 'custom-detail':  if (currentParams) { const [tn, eid] = currentParams.split('/'); renderCustomEntityDetail(tn, eid); } break;
  }
}

// ── Prop Section Manager ─────────────────────────────────────────────────────
// Manages which properties are shown in the heading (horizontal chip bar, max 5)
// vs the body (vertical inline prop panel). Opened by the ··· button.

const ENTITY_ALL_PROPS = {
  task:     [{key:'status',label:'Status'},{key:'priority',label:'Priority'},{key:'due',label:'Due Date'},{key:'focus',label:'Focus Block'},{key:'tags',label:'Tags'},{key:'goal',label:'Goals'},{key:'project',label:'Projects'},{key:'category',label:'Category'},{key:'points',label:'Story Points'},{key:'recur',label:'Recurring'}],
  goal:     [{key:'status',label:'Status'},{key:'type',label:'Type'},{key:'year',label:'Year'},{key:'progress',label:'Progress'},{key:'tags',label:'Tags'},{key:'category',label:'Category'},{key:'due',label:'Due Date'},{key:'metrics',label:'Metrics'}],
  project:  [{key:'status',label:'Status'},{key:'due',label:'Due Date'},{key:'goal',label:'Goals'},{key:'progress',label:'Progress'},{key:'tags',label:'Tags'},{key:'category',label:'Category'},{key:'macro',label:'Macro Area'},{key:'kanban',label:'Kanban Col'},{key:'archived',label:'Archived'}],
  sprint:   [{key:'status',label:'Status'},{key:'dates',label:'Dates'},{key:'project',label:'Projects'},{key:'progress',label:'Progress'},{key:'tags',label:'Tags'},{key:'points',label:'Story Points'},{key:'category',label:'Category'}],
  note:     [{key:'date',label:'Date'},{key:'project',label:'Projects'},{key:'goal',label:'Goals'},{key:'tags',label:'Tags'},{key:'category',label:'Category'}],
  resource: [{key:'type',label:'Type'},{key:'url',label:'URL'},{key:'project',label:'Projects'},{key:'goal',label:'Goals'},{key:'tags',label:'Tags'},{key:'category',label:'Category'}],
};

const ENTITY_SECTION_DEFAULTS = {
  task:     { heading:['status','priority','due','focus','tags'],   body:['goal','project','category','points','recur'] },
  goal:     { heading:['status','type','year','tags'],              body:['category','due','metrics'] },
  project:  { heading:['status','due','goal','tags'],              body:['category','macro','kanban','archived'] },
  sprint:   { heading:['status','dates','project','tags'],         body:['points','category'] },
  note:     { heading:['date','project','goal','tags'],            body:['category'] },
  resource: { heading:['type','url','project','goal'],             body:['tags','category'] },
};

function getPropSections(entity) {
  try {
    const s = localStorage.getItem(`propSections_${entity}`);
    if (s) {
      const stored = JSON.parse(s);
      // Migration: inject ENTITY_ALL_PROPS keys that were added after the user's
      // sections were last saved (e.g. 'tags' added to sprint/resource).
      const allKeys = (ENTITY_ALL_PROPS[entity] || []).map(p => p.key);
      const knownSet = new Set([...(stored.heading || []), ...(stored.body || [])]);
      const missing = allKeys.filter(k => !knownSet.has(k));
      if (missing.length > 0) {
        stored.heading = [...(stored.heading || []), ...missing];
        localStorage.setItem(`propSections_${entity}`, JSON.stringify(stored));
      }
      return stored;
    }
  } catch(e) {}
  const d = ENTITY_SECTION_DEFAULTS[entity];
  return d ? { heading:[...d.heading], body:[...d.body] } : { heading:[], body:[] };
}

function setPropSections(entity, sections) {
  localStorage.setItem(`propSections_${entity}`, JSON.stringify(sections));
}

function openPropSectionManager(anchorEl, entity, onSave) {
  document.getElementById('prop-section-mgr')?.remove();
  const MAX = 5;

  function allProps() {
    const base = ENTITY_ALL_PROPS[entity] || [];
    const custom = getCustomPropDefs(entity).map(d => ({ key: d.key, label: d.label }));
    return [...base, ...custom];
  }

  function normalizedSections() {
    const s = getPropSections(entity);
    const all = allProps().map(p => p.key);
    all.forEach(k => { if (!s.heading.includes(k) && !s.body.includes(k)) s.body.push(k); });
    s.heading = s.heading.filter(k => all.includes(k));
    s.body    = s.body.filter(k => all.includes(k));
    return s;
  }

  const panel = document.createElement('div');
  panel.id = 'prop-section-mgr';
  panel.className = 'prop-vis-panel';
  panel.style.cssText = 'position:fixed;z-index:9200;min-width:280px;max-width:300px;padding:0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.18)';

  let dragKey = null, dragZone = null;

  function renderPanel() {
    const s = normalizedSections();
    const all = allProps();
    const canAdd = s.heading.length < MAX;

    const renderRow = (k, zone) => {
      const p = all.find(x => x.key === k) || { key: k, label: k };
      const isHead = zone === 'heading';
      return `<div class="psm-row" draggable="true" data-key="${k}" data-zone="${zone}"
        style="display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:grab;user-select:none;border-radius:4px;transition:background .1s">
        <span style="color:var(--text-muted);font-size:13px;flex-shrink:0;cursor:grab">⠿</span>
        <span style="flex:1;font-size:13px;color:var(--text-primary)">${p.label}</span>
        <button class="psm-move" data-key="${k}" data-to="${isHead?'body':'heading'}"
          ${!isHead && !canAdd ? 'disabled' : ''}
          style="font-size:10px;padding:2px 7px;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer;color:var(--text-muted);flex-shrink:0;${!isHead && !canAdd ? 'opacity:.3;cursor:default' : ''}">
          ${isHead ? '↓ Body' : '↑ Top'}
        </button>
      </div>`;
    };

    const headRows = s.heading.map(k => renderRow(k,'heading')).join('') ||
      '<div style="padding:6px 12px;font-size:12px;color:var(--text-muted);font-style:italic">Empty</div>';
    const bodyRows = s.body.map(k => renderRow(k,'body')).join('') ||
      '<div style="padding:6px 12px;font-size:12px;color:var(--text-muted);font-style:italic">Empty</div>';

    panel.innerHTML = `
      <div style="padding:7px 12px 5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
        <span>Heading</span><span style="font-weight:400">${s.heading.length}/5</span>
      </div>
      <div id="psm-zone-heading" data-zone="heading" style="min-height:36px;padding:3px 0;border-bottom:1px solid var(--border)">${headRows}</div>
      <div style="padding:7px 12px 5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)">Body</div>
      <div id="psm-zone-body" data-zone="body" style="min-height:36px;padding:3px 0;max-height:260px;overflow-y:auto">${bodyRows}</div>
    `;

    // Move buttons
    panel.querySelectorAll('.psm-move:not([disabled])').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const key = btn.dataset.key, to = btn.dataset.to;
        const s2 = normalizedSections();
        if (to === 'heading') {
          if (s2.heading.length >= MAX) return;
          s2.body = s2.body.filter(k => k !== key);
          s2.heading = [...s2.heading, key];
        } else {
          s2.heading = s2.heading.filter(k => k !== key);
          s2.body = [key, ...s2.body];
        }
        setPropSections(entity, s2);
        onSave();
        renderPanel();
      };
    });

    // Drag rows
    panel.querySelectorAll('.psm-row').forEach(row => {
      row.ondragstart = (e) => {
        dragKey = row.dataset.key; dragZone = row.dataset.zone;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.style.opacity = '.4', 0);
      };
      row.ondragend = () => {
        row.style.opacity = '';
        panel.querySelectorAll('.psm-dv').forEach(el => el.classList.remove('psm-dv'));
        dragKey = null; dragZone = null;
      };
      row.ondragover = (e) => { e.preventDefault(); row.classList.add('psm-dv'); };
      row.ondragleave = () => row.classList.remove('psm-dv');
      row.ondrop = (e) => {
        e.preventDefault(); row.classList.remove('psm-dv');
        if (!dragKey || dragKey === row.dataset.key) return;
        const targetKey = row.dataset.key, targetZone = row.dataset.zone;
        const s2 = normalizedSections();
        s2.heading = s2.heading.filter(k => k !== dragKey);
        s2.body    = s2.body.filter(k => k !== dragKey);
        if (targetZone === 'heading') {
          if (s2.heading.length >= MAX && dragZone !== 'heading') return;
          const idx = s2.heading.indexOf(targetKey);
          s2.heading.splice(idx >= 0 ? idx : s2.heading.length, 0, dragKey);
        } else {
          const idx = s2.body.indexOf(targetKey);
          s2.body.splice(idx >= 0 ? idx : s2.body.length, 0, dragKey);
        }
        setPropSections(entity, s2);
        onSave();
        renderPanel();
      };
    });

    // Drop on empty zone area
    panel.querySelectorAll('[id^="psm-zone-"]').forEach(zone => {
      zone.ondragover = (e) => { e.preventDefault(); zone.style.outline = '2px dashed var(--accent)'; };
      zone.ondragleave = () => { zone.style.outline = ''; };
      zone.ondrop = (e) => {
        e.preventDefault(); zone.style.outline = '';
        if (!dragKey) return;
        const targetZone = zone.dataset.zone;
        const s2 = normalizedSections();
        s2.heading = s2.heading.filter(k => k !== dragKey);
        s2.body    = s2.body.filter(k => k !== dragKey);
        if (targetZone === 'heading') {
          if (s2.heading.length >= MAX && dragZone !== 'heading') return;
          s2.heading.push(dragKey);
        } else {
          s2.body.push(dragKey);
        }
        setPropSections(entity, s2);
        onSave();
        renderPanel();
      };
    });
  }

  renderPanel();

  const rect = anchorEl.getBoundingClientRect();
  const w = 300;
  let left = rect.right - w;
  if (left < 8) left = 8;
  if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
  panel.style.top  = `${Math.min(rect.bottom + 4, window.innerHeight - 340)}px`;
  panel.style.left = `${left}px`;
  document.body.appendChild(panel);

  const dismiss = (e) => { if (!panel.contains(e.target) && e.target !== anchorEl) { panel.remove(); document.removeEventListener('mousedown', dismiss); } };
  setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
}

// ── openValuePicker ──────────────────────────────────────────────────────────
// Shows a simple floating list of options anchored to anchorEl.
// ── clampPopup ────────────────────────────────────────────────────────────────
// Positions a fixed popup anchored below anchorEl, then clamps it to the
// viewport so it never overflows right/bottom/left edges.
function clampPopup(popup, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = `${rect.bottom + 4}px`;
  popup.style.left = `${rect.left}px`;
  popup.style.visibility = 'hidden';
  document.body.appendChild(popup);
  requestAnimationFrame(() => {
    const cr = popup.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = rect.left;
    if (left + cr.width > vw - 8) left = vw - cr.width - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 4;
    if (top + cr.height > vh - 8) top = rect.top - cr.height - 4;
    if (top < 8) top = 8;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.visibility = '';
  });
}

// options: [{ value, label }] or [string]
// onSelect(value) is called on pick.
function openValuePicker(anchorEl, options, onSelect) {
  document.getElementById('value-picker-popup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'value-picker-popup';
  popup.className = 'prop-vis-panel';
  popup.innerHTML = options.map(o => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return `<div class="prop-vis-row value-pick-item" data-val="${String(v).replace(/"/g,'&quot;')}" style="cursor:pointer">${l}</div>`;
  }).join('');
  popup.style.cssText = `position:fixed;z-index:9100;min-width:160px;max-width:280px`;
  clampPopup(popup, anchorEl);
  popup.querySelectorAll('.value-pick-item').forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); popup.remove(); onSelect(el.dataset.val); };
  });
  setTimeout(() => {
    document.addEventListener('click', function handler(ev) {
      if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', handler); }
    });
  }, 0);
}

// ── openMultiSelectPicker ─────────────────────────────────────────────────────
// Full tag-like picker for multi_select custom props.
// Supports toggling existing options, creating new ones, and assigning colors.
const MS_COLORS = ['blue','green','red','yellow','purple','cyan','orange','pink'];

function openMultiSelectPicker(anchorEl, def, entity, recordId, key, onRerender) {
  document.getElementById('ms-picker-popup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'ms-picker-popup';
  popup.className = 'prop-vis-panel';

  const cur = getCustomPropValues(entity, recordId)[key] ?? '';
  let sel = new Set((() => { try { const a = JSON.parse(cur); return Array.isArray(a) ? a : (cur ? [cur] : []); } catch { return cur ? [cur] : []; } })());
  let filter = '';
  const opts = def.options ? [...def.options] : [];
  const optColors = Object.assign({}, def.optionColors || {});

  function saveDefsColors() {
    const defs = getCustomPropDefs(entity);
    const idx = defs.findIndex(d => d.key === key);
    if (idx >= 0) { defs[idx].options = opts; defs[idx].optionColors = optColors; setCustomPropDefs(entity, defs); }
  }

  function renderPicker() {
    const filtered = opts.filter(o => o.toLowerCase().includes(filter.toLowerCase()));
    const exactMatch = opts.some(o => o.toLowerCase() === filter.toLowerCase().trim());
    const createLabel = filter.trim();

    popup.innerHTML =
      `<div style="padding:5px 8px;border-bottom:1px solid var(--border)">
        <input id="ms-picker-inp" class="form-input" placeholder="Search or create…" value="${filter.replace(/"/g,'&quot;')}"
          style="width:100%;font-size:12px;padding:3px 6px;height:26px;box-sizing:border-box">
       </div>` +
      filtered.map(o => {
        const isSelected = sel.has(o);
        const color = optColors[o];
        const chipHtml = color
          ? `<span class="multi-chip color-${color}" style="font-size:11px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${o}</span>`
          : `<span class="multi-chip" style="background:var(--accent-glow);color:var(--text-primary);font-size:11px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${o}</span>`;
        return `<div class="prop-vis-row ms-picker-opt" data-opt="${o.replace(/"/g,'&quot;')}"
          style="display:flex;align-items:center;gap:5px;cursor:pointer;padding-right:4px">
          ${chipHtml}
          <button class="ms-color-btn btn btn-sm btn-ghost" data-opt="${o.replace(/"/g,'&quot;')}"
            title="Color" style="padding:0 4px;font-size:10px;opacity:0.5;flex-shrink:0">●</button>
          ${isSelected ? `<span style="color:var(--accent);font-size:13px;flex-shrink:0">✓</span>` : `<span style="width:13px;flex-shrink:0"></span>`}
        </div>`;
      }).join('') +
      (!exactMatch && createLabel
        ? `<div class="prop-vis-row ms-picker-create" style="cursor:pointer;color:var(--accent);font-size:12px">+ Create "<b>${createLabel}</b>"</div>`
        : '') +
      `<div style="padding:5px 8px;border-top:1px solid var(--border)">
        <button id="ms-picker-done" class="btn btn-sm btn-primary" style="width:100%">Done</button>
       </div>`;

    const inp = popup.querySelector('#ms-picker-inp');
    inp.oninput = () => { filter = inp.value; renderPicker(); };
    inp.onclick = e => e.stopPropagation();
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);

    popup.querySelectorAll('.ms-picker-opt').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('.ms-color-btn')) return;
        e.stopPropagation();
        const o = row.dataset.opt;
        if (sel.has(o)) sel.delete(o); else sel.add(o);
        renderPicker();
      };
    });

    popup.querySelectorAll('.ms-color-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('ms-cpicker')?.remove();
        const o = btn.dataset.opt;
        const cp = document.createElement('div');
        cp.id = 'ms-cpicker';
        cp.className = 'prop-vis-panel';
        cp.innerHTML = MS_COLORS.map(c =>
          `<div class="prop-vis-row ms-cpick-item" data-color="${c}" style="cursor:pointer">
            <span class="multi-chip color-${c}" style="font-size:11px">${c}</span>
           </div>`
        ).join('');
        cp.querySelectorAll('.ms-cpick-item').forEach(ci => {
          ci.onclick = (ev) => {
            ev.stopPropagation();
            optColors[o] = ci.dataset.color;
            saveDefsColors();
            cp.remove();
            renderPicker();
          };
        });
        cp.style.cssText = `position:fixed;z-index:9400;min-width:110px`;
        clampPopup(cp, btn);
        setTimeout(() => document.addEventListener('click', function h(ev) { if (!cp.contains(ev.target)) { cp.remove(); document.removeEventListener('click', h); } }), 0);
      };
    });

    const createEl = popup.querySelector('.ms-picker-create');
    if (createEl) {
      createEl.onclick = (e) => {
        e.stopPropagation();
        const newOpt = filter.trim();
        if (!newOpt || opts.includes(newOpt)) return;
        opts.push(newOpt);
        sel.add(newOpt);
        saveDefsColors();
        filter = '';
        renderPicker();
      };
    }

    popup.querySelector('#ms-picker-done').onclick = (e) => {
      e.stopPropagation();
      popup.remove();
      setCustomPropValue(entity, recordId, key, JSON.stringify([...sel]));
      onRerender();
    };
  }

  renderPicker();
  popup.style.cssText = `position:fixed;z-index:9200;min-width:220px;max-height:340px;overflow-y:auto`;
  clampPopup(popup, anchorEl);
  setTimeout(() => document.addEventListener('click', function h(ev) { if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', h); } }), 0);
}

// ── openSingleSelectPicker ────────────────────────────────────────────────────
// Single-value picker styled like the task status/priority combo-popover.
function openSingleSelectPicker(anchorEl, def, entity, recordId, key, onRerender) {
  document.getElementById('ss-picker-popup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'ss-picker-popup';
  popup.className = 'combo-popover';
  popup.style.minWidth = '220px';

  const opts = [...(def.options || [])];
  const optColors = Object.assign({}, def.optionColors || {});
  const currentVal = getCustomPropValues(entity, recordId)[key] || '';
  let filter = '';
  let editingVal = null;
  let editInputVal = '';
  let colorPickerVal = null;
  const COLOR_PRESETS = ['#e07070','#fb923c','#d4a84b','#6dcc8a','#378ADD','#a78bfa','#f472b6','#22d3ee','#94a3b8'];

  function saveDefs() {
    const defs = getCustomPropDefs(entity);
    const idx = defs.findIndex(d => d.key === key);
    if (idx >= 0) { defs[idx].options = [...opts]; defs[idx].optionColors = Object.assign({}, optColors); setCustomPropDefs(entity, defs); }
  }

  function renderPicker() {
    const filtered = filter ? opts.filter(o => o.toLowerCase().includes(filter.toLowerCase())) : opts;
    const showCreate = filter.trim() && !opts.some(o => o.toLowerCase() === filter.trim().toLowerCase());

    const items = filtered.map(v => {
      const isSel = v === currentVal;
      const color = optColors[v] || '';
      const dot = `<span class="combo-color-dot" data-colorpicker="${v.replace(/"/g,'&quot;')}" title="Set color" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color||'var(--border)'};border:1px solid ${color||'var(--border)'};cursor:pointer;flex-shrink:0;margin-right:2px"></span>`;
      if (editingVal === v) {
        return `<div class="combo-item combo-item-editing" data-val="${v.replace(/"/g,'&quot;')}">
          ${dot}
          <input class="combo-edit-input" value="${(editInputVal || v).replace(/"/g,'&quot;')}" data-editing="${v.replace(/"/g,'&quot;')}" style="flex:1;font-size:12px;padding:2px 4px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-surface);color:var(--text-primary)" />
          <button class="combo-edit-save" data-editing="${v.replace(/"/g,'&quot;')}" style="font-size:11px;padding:2px 6px;margin-left:4px;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer">✓</button>
          <button class="combo-edit-cancel" style="font-size:11px;padding:2px 6px;margin-left:2px;background:transparent;border:none;cursor:pointer;color:var(--text-muted)">✕</button>
        </div>`;
      }
      const colorPickerHtml = colorPickerVal === v ? `<div class="combo-color-picker" data-for="${v.replace(/"/g,'&quot;')}" style="display:flex;flex-wrap:wrap;gap:4px;padding:6px;border-top:1px solid var(--border)">
        ${COLOR_PRESETS.map(c => `<span class="combo-color-swatch${color===c?' active':''}" data-color="${c}" data-for-val="${v.replace(/"/g,'&quot;')}" style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${c};cursor:pointer;border:2px solid ${color===c?'var(--text-primary)':'transparent'}"></span>`).join('')}
        <span class="combo-color-swatch combo-color-clear" data-color="" data-for-val="${v.replace(/"/g,'&quot;')}" title="Clear" style="display:inline-block;width:16px;height:16px;border-radius:3px;background:var(--border);cursor:pointer;border:2px solid transparent;font-size:9px;line-height:16px;text-align:center;color:var(--text-muted)">✕</span>
      </div>` : '';
      return `<div class="combo-item editable-val-item${isSel?' selected':''}" data-val="${v.replace(/"/g,'&quot;')}" style="display:flex;align-items:center;gap:4px;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;flex:1">
          ${dot}<span style="color:${color||'inherit'}">${v.replace(/_/g,' ')}</span>
        </div>
        <button class="combo-rename-btn" data-rename="${v.replace(/"/g,'&quot;')}" title="Rename" style="opacity:0.4;background:none;border:none;cursor:pointer;font-size:11px;padding:0 4px;color:var(--text-muted)">✎</button>
        ${colorPickerHtml}
      </div>`;
    }).join('');

    const clearRow = `<div class="combo-item" data-ss-clear style="color:var(--text-muted);font-style:italic;cursor:pointer">— clear —</div>`;

    popup.innerHTML = `
      <div class="combo-search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="combo-search" placeholder="Search or add…" value="${filter.replace(/"/g,'&quot;')}" />
      </div>
      <div class="combo-list">
        ${clearRow}
        ${items || '<div class="combo-empty">No options</div>'}
        ${showCreate ? `<div class="combo-item create-new" data-create="${filter.trim().replace(/"/g,'&quot;')}">+ Add "${filter.trim()}"</div>` : ''}
      </div>`;

    const inp = popup.querySelector('.combo-search');
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.oninput = (e) => { filter = e.target.value; editingVal = null; renderPicker(); };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter' && filter.trim()) {
        const exact = opts.find(o => o.toLowerCase() === filter.trim().toLowerCase());
        if (exact) { setCustomPropValue(entity, recordId, key, exact); popup.remove(); onRerender(); }
        else { const nv = filter.trim(); opts.push(nv); saveDefs(); setCustomPropValue(entity, recordId, key, nv); popup.remove(); onRerender(); }
      } else if (e.key === 'Escape') popup.remove();
    };

    popup.querySelector('[data-ss-clear]').onclick = (e) => { e.stopPropagation(); popup.remove(); setCustomPropValue(entity, recordId, key, ''); onRerender(); };

    popup.querySelectorAll('.editable-val-item[data-val]').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.combo-rename-btn') || e.target.closest('.combo-color-dot') || e.target.closest('.combo-color-picker')) return;
        e.stopPropagation(); popup.remove(); setCustomPropValue(entity, recordId, key, el.dataset.val); onRerender();
      };
    });

    popup.querySelectorAll('.combo-rename-btn').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); editingVal = btn.dataset.rename; editInputVal = editingVal; renderPicker(); };
    });
    popup.querySelectorAll('.combo-edit-save').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const oldVal = btn.dataset.editing;
        const inputEl = popup.querySelector(`.combo-edit-input[data-editing="${oldVal}"]`);
        const newVal = (inputEl ? inputEl.value.trim() : oldVal);
        if (newVal && newVal !== oldVal) {
          const idx = opts.indexOf(oldVal);
          if (idx >= 0) { opts[idx] = newVal; if (optColors[oldVal]) { optColors[newVal] = optColors[oldVal]; delete optColors[oldVal]; } }
          saveDefs();
          if (currentVal === oldVal) { setCustomPropValue(entity, recordId, key, newVal); popup.remove(); onRerender(); return; }
        }
        editingVal = null; renderPicker();
      };
    });
    popup.querySelectorAll('.combo-edit-cancel').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); editingVal = null; renderPicker(); };
    });
    popup.querySelectorAll('.combo-edit-input').forEach(inp2 => {
      inp2.oninput = (e) => { editInputVal = e.target.value; };
      inp2.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); popup.querySelector('.combo-edit-save').click(); }
        else if (e.key === 'Escape') { e.stopPropagation(); editingVal = null; renderPicker(); }
      };
    });

    const createEl = popup.querySelector('.create-new[data-create]');
    if (createEl) {
      createEl.onclick = () => { const nv = createEl.dataset.create; opts.push(nv); saveDefs(); setCustomPropValue(entity, recordId, key, nv); popup.remove(); onRerender(); };
    }

    popup.querySelectorAll('.combo-color-dot[data-colorpicker]').forEach(dot => {
      dot.onclick = (e) => { e.stopPropagation(); const v = dot.dataset.colorpicker; colorPickerVal = colorPickerVal === v ? null : v; renderPicker(); };
    });
    popup.querySelectorAll('.combo-color-swatch[data-for-val]').forEach(swatch => {
      swatch.onclick = (e) => { e.stopPropagation(); const v = swatch.dataset.forVal; optColors[v] = swatch.dataset.color; saveDefs(); colorPickerVal = null; renderPicker(); };
    });
  }

  renderPicker();
  const rect = anchorEl.getBoundingClientRect();
  popup.style.cssText = `position:fixed;z-index:9200;top:${rect.bottom+4}px;left:${rect.left}px`;
  document.body.appendChild(popup);
  requestAnimationFrame(() => {
    const cr = popup.getBoundingClientRect();
    if (cr.right > window.innerWidth - 8) popup.style.left = (window.innerWidth - cr.width - 8) + 'px';
  });
  setTimeout(() => document.addEventListener('click', function h(ev) { if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', h); } }), 0);
}

// ── openTagsPicker ────────────────────────────────────────────────────────────
// Shows a floating multi-select tags panel.
// selectedIds: number[]; onCommit(ids: number[]) called on Done.
function openTagsPicker(anchorEl, selectedIds, onCommit) {
  document.getElementById('tags-picker-popup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'tags-picker-popup';
  popup.className = 'prop-vis-panel';
  let sel = new Set((selectedIds || []).map(String));
  let filter = '';

  function renderTagsPicker() {
    const filtered = allTags.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
    const exactMatch = allTags.some(t => t.name.toLowerCase() === filter.toLowerCase().trim());
    const createLabel = filter.trim();
    popup.innerHTML =
      `<div style="padding:5px 8px;border-bottom:1px solid var(--border)">
        <input id="tags-picker-inp" class="form-input" placeholder="Search or create…" value="${filter.replace(/"/g,'&quot;')}"
          style="width:100%;font-size:12px;padding:3px 6px;height:26px;box-sizing:border-box">
       </div>` +
      (filtered.length
        ? filtered.map(t =>
            `<div class="prop-vis-row" data-tag-id="${t.id}" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:5px">
              <span class="multi-chip color-${t.color||'blue'}" style="opacity:${sel.has(String(t.id))?'1':'0.35'};flex:1">${escHtml(t.name)}</span>
              ${sel.has(String(t.id)) ? `<span style="color:var(--accent);font-size:13px;flex-shrink:0">✓</span>` : `<span style="width:13px;flex-shrink:0"></span>`}
            </div>`).join('')
        : (!createLabel ? '<div style="padding:6px 10px;font-size:12px;color:var(--text-muted)">No tags yet — type a name above to create one</div>' : '')) +
      (!exactMatch && createLabel
        ? `<div class="prop-vis-row tags-picker-create" style="cursor:pointer;color:var(--accent);font-size:12px;padding:4px 10px">+ Create "<b>${escHtml(createLabel)}</b>"</div>`
        : '') +
      `<div style="padding:6px 8px;border-top:1px solid var(--border)">
        <button id="tags-picker-done" class="btn btn-sm btn-primary" style="width:100%">Done</button>
      </div>`;

    const inp = popup.querySelector('#tags-picker-inp');
    if (inp) { inp.oninput = () => { filter = inp.value; renderTagsPicker(); }; inp.onclick = e => e.stopPropagation(); inp.focus(); }

    popup.querySelectorAll('[data-tag-id]').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const id = String(el.dataset.tagId);
        if (sel.has(id)) sel.delete(id); else sel.add(id);
        renderTagsPicker();
      };
    });

    const createEl = popup.querySelector('.tags-picker-create');
    if (createEl) {
      createEl.onclick = async (e) => {
        e.stopPropagation();
        const name = filter.trim();
        if (!name) return;
        try {
          const newTag = await api('POST', '/api/tags', { name, color: 'blue' });
          allTags.push(newTag);
          sel.add(String(newTag.id));
          filter = '';
          renderTagsPicker();
        } catch(err) { showToast('Failed to create tag', 'error'); }
      };
    }

    document.getElementById('tags-picker-done').onclick = (e) => {
      e.stopPropagation();
      popup.remove();
      onCommit([...sel].map(Number));
    };
  }

  renderTagsPicker();
  popup.style.cssText = `position:fixed;z-index:9100;min-width:220px;max-height:340px;overflow-y:auto`;
  clampPopup(popup, anchorEl);
  setTimeout(() => {
    document.addEventListener('click', function handler(ev) {
      if (!popup.contains(ev.target)) { popup.remove(); document.removeEventListener('click', handler); }
    });
  }, 0);
}

function showContextMenu(entityType, entityId, anchorEl) {
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());

  const svgIcon = (paths) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons = {
    editIcon: svgIcon('<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>'),
    comment:  svgIcon('<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'),
    duplicate:svgIcon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>'),
    moveTo:   svgIcon('<polyline points="5 9 2 12 5 15"/><path d="M2 12h14"/><polyline points="15 9 18 12 15 15"/><path d="M18 12h4"/>'),
    trash:    svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>'),
  };

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  // Build items with search filter support
  const editIcon2 = svgIcon('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>');
  const isCustom = entityType.startsWith('custom_');
  const items = [
    ...(isCustom ? [{ action: 'custom-edit', icon: editIcon2, label: 'Edit', shortcut: '' }] : []),
    { action: 'edit-icon', icon: icons.editIcon, label: 'Edit icon', shortcut: '' },
    { action: 'comment',   icon: icons.comment,  label: 'Comment',   shortcut: '⌘⇧M' },
    { action: 'duplicate', icon: icons.duplicate,label: 'Duplicate', shortcut: '⌘D' },
    { action: 'move-to',   icon: icons.moveTo,   label: 'Move to',   shortcut: '⌘⇧P' },
  ];

  const renderItems = (filter) => {
    const filtered = items.filter(it => !filter || it.label.toLowerCase().includes(filter.toLowerCase()));
    return `
      <div class="ctx-menu-section">Page</div>
      ${filtered.map(it => `
        <div class="ctx-menu-item" data-action="${it.action}">
          ${it.icon}<span>${it.label}</span>
          ${it.shortcut ? `<span class="ctx-menu-shortcut">${it.shortcut}</span>` : ''}
        </div>`).join('')}
      <div class="ctx-menu-separator"></div>
      ${(!filter || 'trash move to trash delete'.includes(filter.toLowerCase())) ? `
      <div class="ctx-menu-item ctx-menu-item--danger" data-action="trash">
        ${icons.trash}<span>Move to Trash</span>
        <span class="ctx-menu-shortcut">Del</span>
      </div>` : ''}
    `;
  };

  menu.innerHTML = `
    <div class="ctx-menu-search">
      <input class="ctx-menu-search-input" placeholder="Search actions…" autocomplete="off">
    </div>
    <div class="ctx-menu-items">${renderItems('')}</div>
    <div class="ctx-menu-footer">Last edited · ${entityType} #${entityId}</div>
  `;
  document.body.appendChild(menu);

  // Position relative to anchor
  const rect = anchorEl.getBoundingClientRect();
  const mw = 230, mh = 280;
  const left = Math.min(rect.right + 4, window.innerWidth - mw - 8);
  const top  = Math.min(rect.top, window.innerHeight - mh - 8);
  menu.style.left = left + 'px';
  menu.style.top  = top + 'px';

  // Search filter
  const searchInp = menu.querySelector('.ctx-menu-search-input');
  searchInp.focus();
  searchInp.oninput = () => {
    menu.querySelector('.ctx-menu-items').innerHTML = renderItems(searchInp.value);
    bindMenuItemActions();
  };

  function bindMenuItemActions() {
    menu.querySelectorAll('.ctx-menu-item').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        menu.remove();
        const action = el.dataset.action;
        if (action === 'custom-edit') {
          const typeName = entityType.slice(7);
          const typeInfo = customEntityTypes.find(t => t.name === typeName);
          openCustomEntityForm(typeName, typeInfo ? { id: parseInt(entityId) } : null);
        } else if (action === 'edit-icon') {
          // Find the icon slot for this entity and open picker
          const slot = document.querySelector(`[data-icon-entity="${entityType}"][data-icon-id="${entityId}"]`);
          if (slot) showIconPicker(slot, entityType, entityId, null, () => {});
        } else if (action === 'comment') {
          openCommentPanel(entityType, entityId);
        } else if (action === 'duplicate') {
          duplicateEntity(entityType, entityId);
        } else if (action === 'move-to') {
          openMoveToPanel(entityType, entityId, anchorEl);
        } else if (action === 'trash') {
          deleteEntity(entityType, entityId);
        }
      };
    });
  }
  bindMenuItemActions();

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  const colors = { info: 'var(--color-surface)', success: '#1a4731', error: '#4a1515' };
  const borders = { info: 'var(--color-border)', success: '#2d6a4f', error: '#7f1d1d' };
  el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;padding:10px 16px;border-radius:var(--radius-md);
    background:${colors[type]||colors.info};border:1px solid ${borders[type]||borders.info};
    color:var(--color-text);font-size:13px;box-shadow:var(--shadow-float);max-width:320px;
    transition:opacity .3s;pointer-events:none`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

function showConfirmModal(message, onConfirm) {
  document.getElementById('_confirm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = '_confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:24px 28px;min-width:280px;max-width:400px;box-shadow:var(--shadow-float)">
      <div style="font-size:14px;color:var(--color-text);margin-bottom:20px;line-height:1.5">${message}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="_confirm-cancel" class="btn btn-ghost btn-sm">Cancel</button>
        <button id="_confirm-ok" class="btn btn-primary btn-sm" style="background:var(--color-danger);border-color:var(--color-danger)">Delete</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById('_confirm-cancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.getElementById('_confirm-ok').onclick = () => { close(); onConfirm(); };
}

async function deleteEntity(entityType, entityId) {
  let apiPath;
  if (entityType.startsWith('custom_')) {
    apiPath = `custom/${entityType.slice(7)}`;
  } else {
    apiPath = ENTITY_API_MAP[entityType];
  }
  if (!apiPath) return;
  showConfirmModal(`Delete this ${entityType.startsWith('custom_') ? entityType.slice(7) : entityType}?`, async () => {
    await api('DELETE', `/api/${apiPath}/${entityId}`);
    closeSlideover();
    renderCurrentView();
  });
}

async function duplicateEntity(entityType, entityId) {
  const apiPath = ENTITY_API_MAP[entityType];
  if (!apiPath) return;
  let orig;
  try { orig = await api('GET', `/api/${apiPath}/${entityId}`); } catch (e) { return; }
  const copy = { ...orig };
  delete copy.id; delete copy.created_at; delete copy.updated_at;
  if (copy.title) copy.title = copy.title + ' (copy)';
  else if (copy.name) copy.name = copy.name + ' (copy)';
  try { await api('POST', `/api/${apiPath}`, copy); } catch (e) { return; }
  renderCurrentView();
}

function openMoveToPanel(entityType, entityId, anchorEl) {
  document.querySelectorAll('.move-to-picker').forEach(m => m.remove());
  const allTypes = ['task','goal','project','note','resource','sprint'];
  const others = allTypes.filter(t => t !== entityType);
  const picker = document.createElement('div');
  picker.className = 'ctx-menu move-to-picker';
  picker.innerHTML = `
    <div class="ctx-menu-section">Move to…</div>
    ${others.map(t => `<div class="ctx-menu-item" data-target="${t}">
      <span style="text-transform:capitalize">${t}</span>
    </div>`).join('')}
  `;
  document.body.appendChild(picker);
  const rect = anchorEl.getBoundingClientRect();
  picker.style.left = Math.min(rect.right + 4, window.innerWidth - 240) + 'px';
  picker.style.top  = rect.top + 'px';
  picker.querySelectorAll('.ctx-menu-item').forEach(el => {
    el.onclick = async (e) => {
      e.stopPropagation();
      picker.remove();
      const targetType = el.dataset.target;
      const srcPath = ENTITY_API_MAP[entityType];
      const dstPath = ENTITY_API_MAP[targetType];
      if (!srcPath || !dstPath) return;
      let orig;
      try { orig = await api('GET', `/api/${srcPath}/${entityId}`); } catch (ex) { return; }
      const copy = { ...orig };
      delete copy.id; delete copy.created_at; delete copy.updated_at;
      try {
        await api('POST', `/api/${dstPath}`, copy);
        await api('DELETE', `/api/${srcPath}/${entityId}`);
        closeSlideover();
        renderCurrentView();
      } catch (ex) { showToast('Move failed: ' + ex.message, 'error'); }
    };
  });
  setTimeout(() => {
    document.addEventListener('click', function h(e) {
      if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', h); }
    });
  }, 0);
}

function openCommentPanel(entityType, entityId) {
  // Focus existing comment input if the panel is already open
  const existingSec = document.querySelector(`.comment-section[data-entity-type="${entityType}"][data-entity-id="${entityId}"]`);
  if (existingSec) {
    const inp = existingSec.querySelector('.comment-input');
    if (inp) { existingSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); inp.focus(); }
    return;
  }
  // Open the entity's detail/slideover then focus the comment input
  const id = String(entityId);
  const detailViews = { project: 'project-detail', goal: 'goal-detail', sprint: 'sprint-detail' };
  if (detailViews[entityType]) {
    renderView(detailViews[entityType], id);
    setTimeout(() => {
      const sec = document.querySelector('.comment-section');
      if (sec) { const inp = sec.querySelector('.comment-input'); if (inp) { sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); inp.focus(); } }
    }, 400);
  } else if (entityType === 'task') {
    showTaskSlideover(id);
    setTimeout(() => {
      const sec = document.querySelector('.comment-section');
      if (sec) { const inp = sec.querySelector('.comment-input'); if (inp) { sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); inp.focus(); } }
    }, 400);
  } else if (entityType === 'note') {
    // notes open as modal — just scroll if somehow visible
    const sec = document.querySelector('.comment-section');
    if (sec) { const inp = sec.querySelector('.comment-input'); if (inp) inp.focus(); }
  } else if (entityType === 'resource') {
    api('GET', `/api/resources/${id}`).then(r => {
      if (r) showResourceSlideover(r, () => renderResources());
      setTimeout(() => {
        const sec = document.querySelector('.comment-section');
        if (sec) { const inp = sec.querySelector('.comment-input'); if (inp) { sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); inp.focus(); } }
      }, 400);
    }).catch(() => {});
  }
}

// Bind ctx-handle clicks directly on each element (avoids stopPropagation blocking delegation)
function bindCtxHandles(root) {
  const scope = root || document;
  scope.querySelectorAll('.ctx-handle').forEach(h => {
    h.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showContextMenu(h.dataset.entity, h.dataset.id, h);
    };
  });
}

// ⌘⇧M global shortcut → focus comment input
document.addEventListener('keydown', (e) => {
  if (e.metaKey && e.shiftKey && e.key === 'm') {
    const inp = document.querySelector('.comment-section .comment-input');
    if (inp) inp.focus();
  }
});

/* ─── Sub-items Section (generic parent→child hierarchy) ────────────── */

const SUB_ITEM_TYPES = [
  { value: 'task',    label: 'Task'    },
  { value: 'goal',    label: 'Goal'    },
  { value: 'project', label: 'Project' },
  { value: 'note',    label: 'Note'    },
];

function buildSubItemsSection(entityType, entityId) {
  const typeOpts = SUB_ITEM_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`
  ).join('');
  return `
    <div class="subtask-section" id="sub-items-sec-${entityType}-${entityId}">
      <div class="subtask-section-title">
        <span>Sub-items</span>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="sub-item-type-${entityType}-${entityId}" class="form-control"
            style="font-size:11px;padding:2px 6px;height:24px;min-width:80px">
            ${typeOpts}
          </select>
          <button class="btn btn-sm btn-ghost" id="add-sub-item-btn-${entityType}-${entityId}">+ Add</button>
        </div>
      </div>
      <div id="sub-items-list-${entityType}-${entityId}" style="margin-top:6px">
        <div style="color:var(--text-muted);font-size:12px">Loading…</div>
      </div>
    </div>`;
}

async function refreshSubItemsList(entityType, entityId) {
  const container = document.getElementById(`sub-items-list-${entityType}-${entityId}`);
  if (!container) return;
  let children = [];
  try { children = await api('GET', `/api/children/${entityType}/${entityId}`); } catch(e) {}
  if (!Array.isArray(children) || !children.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:4px 0">No sub-items yet</div>';
    return;
  }
  container.innerHTML = children.map(c =>
    `<div class="subtask-row" style="cursor:pointer" data-sub-type="${c.child_entity_type}" data-sub-id="${c.child_entity_id}">
      <span style="font-size:10px;background:var(--accent-glow);border-radius:3px;padding:1px 5px;color:var(--text-muted);flex-shrink:0">${c.child_entity_type}</span>
      <span class="subtask-title">${c.child_title || '—'}</span>
      <button class="btn btn-sm btn-ghost sub-item-unlink-btn"
        data-sub-type="${c.child_entity_type}" data-sub-id="${c.child_entity_id}"
        title="Unlink" style="opacity:0.5;flex-shrink:0">×</button>
    </div>`
  ).join('');
  container.querySelectorAll('.sub-item-unlink-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      try { await api('DELETE', `/api/children/${entityType}/${entityId}/${btn.dataset.subType}/${btn.dataset.subId}`); } catch(err) {}
      await refreshSubItemsList(entityType, entityId);
    };
  });
  container.querySelectorAll('[data-sub-type]').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('.sub-item-unlink-btn')) return;
      const t = row.dataset.subType, id = parseInt(row.dataset.subId);
      if (t === 'task')    showTaskSlideover(id);
      else if (t === 'goal')    showGoalSlideover({ id }, null);
      else if (t === 'project') showProjectSlideover({ id }, null, null);
      else if (t === 'note')    showNoteSlideover(id, null);
    };
  });
}

async function initSubItemsSection(entityType, entityId) {
  await refreshSubItemsList(entityType, entityId);
  const addBtn = document.getElementById(`add-sub-item-btn-${entityType}-${entityId}`);
  if (!addBtn) return;
  addBtn.onclick = async (e) => {
    e.stopPropagation();
    const sel = document.getElementById(`sub-item-type-${entityType}-${entityId}`);
    const childType = sel ? sel.value : 'task';
    const title = prompt(`New ${childType} title:`);
    if (!title?.trim()) return;
    try {
      let newId;
      if (childType === 'task') {
        const t = await api('POST', '/api/tasks', { title: title.trim(), status: 'todo', priority: 'medium' });
        newId = t.id;
      } else if (childType === 'goal') {
        const g = await api('POST', '/api/goals', { title: title.trim(), status: 'active' });
        newId = g.id;
      } else if (childType === 'project') {
        const p = await api('POST', '/api/projects', { title: title.trim(), status: 'active' });
        newId = p.id;
      } else if (childType === 'note') {
        const n = await api('POST', '/api/notes', { title: title.trim(), body: '' });
        newId = n.id;
      }
      if (newId) {
        await api('POST', `/api/children/${entityType}/${entityId}`, {
          child_entity_type: childType, child_entity_id: newId
        });
        await refreshSubItemsList(entityType, entityId);
      }
    } catch(err) { console.error('Sub-item creation failed:', err); }
  };
}

/* ─── Entity Views System ────────────────────────────────────────────── */
// Replaces hardcoded Notes/Resources/Relations sections.
// Config per entity type stored in localStorage.

const EV_LABELS = {note:'Notes',resource:'Resources',task:'Tasks',goal:'Goals',project:'Projects',sprint:'Sprints',habit:'Habits'};
const EV_APIS   = {note:'notes',resource:'resources',task:'tasks',goal:'goals',project:'projects',sprint:'sprints',habit:'habits'};
const EV_ALL_TYPES = ['note','resource','task','goal','project','sprint','habit'];

function getBottomViews(entityType) {
  const s = localStorage.getItem(`entityViews_${entityType}`);
  if (s) try { return JSON.parse(s); } catch {}
  if (entityType === 'task') return [
    { childType: 'note',     mode: 'list' },
    { childType: 'resource', mode: 'list' },
    { childType: 'project',  mode: 'list' },
    { childType: 'goal',     mode: 'list' },
    { childType: 'sprint',   mode: 'list' },
  ];
  return [{ childType: 'note', mode: 'list' }, { childType: 'resource', mode: 'list' }];
}
function setBottomViews(entityType, views) {
  localStorage.setItem(`entityViews_${entityType}`, JSON.stringify(views));
}

function buildEntityViewsSection(entityType, entityId) {
  return `<div id="ev-container-${entityType}-${entityId}" class="ev-container">
    <div style="color:var(--text-muted);font-size:12px;padding:8px 0">Loading…</div>
  </div>`;
}

async function initEntityViewsSection(entityType, entityId, entityData) {
  const container = document.getElementById(`ev-container-${entityType}-${entityId}`);
  if (!container) return;

  let allRels = [];
  try { allRels = await api('GET', `/api/relations/${entityType}/${entityId}`); } catch {}
  allRels = Array.isArray(allRels) ? allRels : [];

  // Group relations by child type
  const relsByType = {};
  allRels.forEach(r => {
    if (!relsByType[r.related_entity_type]) relsByType[r.related_entity_type] = [];
    relsByType[r.related_entity_type].push(r);
  });

  // Backward compat: FK-linked notes/resources for ALL entity types (task, project, goal, etc.)
  ['notes','resources'].forEach((field) => {
    const ct = field === 'notes' ? 'note' : 'resource';
    const existing = new Set((relsByType[ct] || []).map(r => String(r.related_entity_id)));
    (entityData?.[field] || []).filter(item => !existing.has(String(item.id))).forEach(item => {
      if (!relsByType[ct]) relsByType[ct] = [];
      relsByType[ct].push({ id: null, related_entity_type: ct, related_entity_id: item.id, related_title: item.title || item.name, is_fk: true });
    });
  });

  // Task-specific: scalar FK fields goal_id, project_id, sprint_id
  if (entityType === 'task') {
    const scalarFKs = [
      { field: 'goal_id',    ct: 'goal',    titleKey: '_goalTitle'   },
      { field: 'project_id', ct: 'project', titleKey: '_projTitle'   },
      { field: 'sprint_id',  ct: 'sprint',  titleKey: '_sprintTitle' },
    ];
    scalarFKs.forEach(({ field, ct, titleKey }) => {
      const fkId = entityData?.[field];
      if (!fkId) return;
      const existing = new Set((relsByType[ct] || []).map(r => String(r.related_entity_id)));
      if (!existing.has(String(fkId))) {
        if (!relsByType[ct]) relsByType[ct] = [];
        relsByType[ct].push({ id: null, related_entity_type: ct, related_entity_id: fkId,
          related_title: entityData?.[titleKey] || `${ct} ${fkId}`, is_fk: true, fk_field: field });
      }
    });
  }

  const views = getBottomViews(entityType);

  function renderBlock(view) {
    const label = EV_LABELS[view.childType] || view.childType;
    const items = relsByType[view.childType] || [];
    return `<div class="subtask-section ev-block" data-child-type="${view.childType}" style="margin-top:16px">
      <div class="subtask-section-title">
        <span>${label} (${items.length})</span>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-sm btn-ghost ev-add-btn" data-child-type="${view.childType}">+ Add</button>
          <button class="btn btn-sm btn-ghost ev-rm-btn" data-child-type="${view.childType}" title="Remove this view" style="opacity:0.5;padding:3px 5px;color:var(--color-text-secondary)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
        </div>
      </div>
      <div class="ev-items">
        ${items.length ? items.map(r => `
          <div class="subtask-row ev-item-row" style="cursor:pointer" data-child-type="${r.related_entity_type}" data-child-id="${r.related_entity_id}">
            <span class="subtask-title">${r.related_title || '(untitled)'}</span>
            <button class="btn btn-sm btn-ghost ev-unlink-btn"
              data-rel-id="${r.id || ''}" data-child-type="${r.related_entity_type}"
              data-child-id="${r.related_entity_id}" data-is-fk="${r.is_fk || ''}"
              data-fk-field="${r.fk_field || ''}"
              style="opacity:0.5;flex-shrink:0">×</button>
          </div>`).join('')
        : `<div style="color:var(--text-muted);font-size:12px;padding:4px 0">No linked ${label.toLowerCase()}</div>`}
      </div>
    </div>`;
  }

  container.innerHTML = `
    ${views.map(renderBlock).join('')}
    <div style="margin-top:10px">
      <button class="btn btn-sm btn-ghost ev-addview-btn" style="width:100%">+ Add view</button>
    </div>`;

  // Remove a view from config
  container.querySelectorAll('.ev-rm-btn').forEach(btn => {
    btn.onclick = () => {
      setBottomViews(entityType, getBottomViews(entityType).filter(v => v.childType !== btn.dataset.childType));
      initEntityViewsSection(entityType, entityId, entityData);
    };
  });

  // Unlink an item
  container.querySelectorAll('.ev-unlink-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const { childType: ct, childId: cid, isFk, fkField } = btn.dataset;
      if (isFk === 'true') {
        if (ct === 'note') {
          const fkKey = `${entityType}_id`;
          await api('PATCH', `/api/notes/${cid}`, { [fkKey]: null }).catch(() => {});
        } else if (ct === 'resource') {
          const fkKey = `${entityType}_id`;
          await api('PATCH', `/api/resources/${cid}`, { [fkKey]: null }).catch(() => {});
        } else if (fkField && entityType === 'task') {
          await api('PATCH', `/api/tasks/${entityId}`, { [fkField]: null }).catch(() => {});
        }
      } else {
        await api('DELETE', `/api/relations/${entityType}/${entityId}/${ct}/${cid}`).catch(() => {});
      }
      await removeEVBilateral(entityType, entityId, ct, parseInt(cid));
      initEntityViewsSection(entityType, entityId, entityData);
    };
  });

  // Open item in sideview on row click
  container.querySelectorAll('.ev-item-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('.ev-unlink-btn')) return;
      const t = row.dataset.childType, id = parseInt(row.dataset.childId);
      if (t === 'task')     showTaskSlideover(id);
      else if (t === 'goal')     showGoalSlideover({ id }, null);
      else if (t === 'project')  showProjectSlideover({ id }, null, null);
      else if (t === 'note')     showNoteSlideover(id, null);
      else if (t === 'resource') showResourceSlideover({ id }, null);
    };
  });

  // Add link to an existing entity
  container.querySelectorAll('.ev-add-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const anchor = e.currentTarget;
      const ct = btn.dataset.childType;
      const apiPath = EV_APIS[ct];
      if (!apiPath) return;
      try {
        let all = await api('GET', `/api/${apiPath}`);
        if (!Array.isArray(all)) all = [];
        const linkedIds = new Set((relsByType[ct] || []).map(r => String(r.related_entity_id)));
        const available = all.filter(item => !linkedIds.has(String(item.id)));
        if (!available.length) return;
        const pickerItems = available.map(item => ({
          value: String(item.id), label: item.title || item.name || '(untitled)'
        }));
        openValuePicker(anchor, pickerItems, async (val) => {
          const childTitle = pickerItems.find(i => i.value === val)?.label || val;
          await api('POST', `/api/relations/${entityType}/${entityId}`, {
            related_entity_type: ct, related_entity_id: parseInt(val)
          });
          // Set FK for task scalar relations if not yet assigned
          if (entityType === 'task') {
            if (ct === 'project' && !entityData.project_id)
              await api('PATCH', `/api/tasks/${entityId}`, { project_id: parseInt(val) }).catch(() => {});
            else if (ct === 'goal' && !entityData.goal_id)
              await api('PATCH', `/api/tasks/${entityId}`, { goal_id: parseInt(val) }).catch(() => {});
            else if (ct === 'sprint' && !entityData.sprint_id)
              await api('PATCH', `/api/tasks/${entityId}`, { sprint_id: parseInt(val) }).catch(() => {});
          }
          const parentTitle = entityData?.title || entityData?.name || String(entityId);
          await ensureEVBilateral(entityType, entityId, parentTitle, ct, parseInt(val), childTitle);
          initEntityViewsSection(entityType, entityId, entityData);
        });
      } catch(err) { console.error('ev-add:', err); }
    };
  });

  // Add a new view type
  container.querySelector('.ev-addview-btn').onclick = (e) => {
    const used = new Set(getBottomViews(entityType).map(v => v.childType));
    const available = EV_ALL_TYPES.filter(t => t !== entityType && !used.has(t));
    if (!available.length) return;
    openValuePicker(e.currentTarget, available.map(t => ({ value: t, label: EV_LABELS[t] || t })), (val) => {
      const v = getBottomViews(entityType);
      v.push({ childType: val, mode: 'list' });
      setBottomViews(entityType, v);
      initEntityViewsSection(entityType, entityId, entityData);
    });
  };
}

/* ─── Entity Views Bilateral Sync ───────────────────────────────────── */
// When a link is added via ev-add-btn, ensure the child entity has a custom
// prop showing which parent entities reference it (and vice versa).
async function _ensureRelProp(ownerType, ownerId, targetType, targetId, targetTitle) {
  const propKey = `${targetType}s`;
  // If a built-in FK prop already covers this relation (e.g. note.project for targetType='project'),
  // use its singular key instead of creating a duplicate plural custom prop def.
  const builtinProps = ENTITY_ALL_PROPS[ownerType] || [];
  const builtinMatch = builtinProps.find(p => p.key === targetType);
  const effectiveKey = builtinMatch ? targetType : propKey;

  if (!builtinMatch) {
    const propLabel = EV_LABELS[targetType] || targetType;
    const defs = getCustomPropDefs(ownerType);
    if (!defs.some(d => d.key === propKey)) {
      const reverseKey = `${ownerType}s`;
      defs.push({ key: propKey, label: propLabel, type: 'relation', relatedEntity: targetType, bilateral: true, reverseKey });
      setCustomPropDefs(ownerType, defs);
      const vp = getEntityVisProps(ownerType);
      if (!vp.includes(propKey)) setEntityVisProps(ownerType, [...vp, propKey]);
    }
  }
  try {
    const sp = await api('GET', `/api/properties?entity_type=${ownerType}&entity_id=${ownerId}`);
    const ex = getCustomPropValues(ownerType, ownerId);
    Object.assign(ex, sp);
    localStorage.setItem(`customPropVals_${ownerType}_${ownerId}`, JSON.stringify(ex));
  } catch(e) {}
  const vals = getCustomPropValues(ownerType, ownerId);
  let arr = parseRelationValue(vals[effectiveKey] ?? '');
  if (!arr.some(x => x.id === String(targetId))) {
    arr.push({ id: String(targetId), label: targetTitle });
    setCustomPropValue(ownerType, ownerId, effectiveKey, JSON.stringify(arr));
  }
}

async function _removeRelProp(ownerType, ownerId, targetType, targetId) {
  const propKey = `${targetType}s`;
  const builtinProps = ENTITY_ALL_PROPS[ownerType] || [];
  const builtinMatch = builtinProps.find(p => p.key === targetType);
  const effectiveKey = builtinMatch ? targetType : propKey;
  try {
    const sp = await api('GET', `/api/properties?entity_type=${ownerType}&entity_id=${ownerId}`);
    const ex = getCustomPropValues(ownerType, ownerId);
    Object.assign(ex, sp);
    localStorage.setItem(`customPropVals_${ownerType}_${ownerId}`, JSON.stringify(ex));
  } catch(e) {}
  const vals = getCustomPropValues(ownerType, ownerId);
  let arr = parseRelationValue(vals[effectiveKey] ?? '');
  arr = arr.filter(x => x.id !== String(targetId));
  setCustomPropValue(ownerType, ownerId, effectiveKey, JSON.stringify(arr));
}

// Called when a builtin FK field changes: syncs the reverse custom prop on the related entity
async function syncBuiltinRelation(ownerType, ownerId, ownerTitle, relEntity, oldId, newId) {
  if (oldId && String(oldId) !== String(newId)) await _removeRelProp(relEntity, parseInt(oldId), ownerType, ownerId);
  if (newId) await _ensureRelProp(relEntity, parseInt(newId), ownerType, ownerId, ownerTitle || String(ownerId));
}

// Reads stored multi-value for a builtin relation prop; falls back to FK display name
function renderMultiRelationValue(entity, recordId, propKey, fkTitle) {
  const vals = getCustomPropValues(entity, recordId);
  const stored = vals[propKey];
  if (stored) {
    const items = parseRelationValue(stored);
    // Deduplicate by id to guard against stale storage having duplicate entries
    const seen = new Set();
    const unique = items.filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });
    if (unique.length) return unique.map(it => `<span class="multi-chip" style="font-size:11px">${escHtml(it.label)}</span>`).join('');
  }
  return fkTitle ? `<span>${escHtml(fkTitle)}</span>` : '';
}

// Multi-value picker for builtin FK relation props (goal, project, sprint).
// Stores multi-value in custom prop storage under propKey, keeps FK synced to first item,
// and runs bilateral sync for added/removed items.
function openMultiRelationPicker(valEl, entity, recordId, propKey, relEntity, relList, currentObj, patchFn, fkField, rerender) {
  const customVals = getCustomPropValues(entity, recordId);
  let curItems = parseRelationValue(customVals[propKey] ?? '');
  if (!curItems.length && currentObj && currentObj[fkField]) {
    const fkId = String(currentObj[fkField]);
    const fkItem = relList.find(x => String(x.id) === fkId);
    curItems = [{ id: fkId, label: fkItem ? (fkItem.title || fkItem.name || fkId) : fkId }];
  }
  const curIds = curItems.map(x => x.id).filter(Boolean);
  openCombo(valEl, relList.map(it => ({ value: String(it.id), label: it.title || it.name || String(it.id) })), null,
    async ({ multiIds }) => {
      if (!multiIds) return;
      const newItems = multiIds.map(id => {
        const it = relList.find(x => String(x.id) === String(id));
        return { id: String(id), label: it ? (it.title || it.name || String(id)) : String(id) };
      });
      setCustomPropValue(entity, parseInt(recordId), propKey, JSON.stringify(newItems));
      const primaryId = multiIds.length > 0 ? parseInt(multiIds[0]) : null;
      const patch = {}; patch[fkField] = primaryId;
      await patchFn(patch);
      const newSet = new Set(multiIds.map(String)), oldSet = new Set(curIds.map(String));
      const ownerTitle = (currentObj && (currentObj.title || currentObj.name)) || String(recordId);
      await Promise.all([
        ...[...newSet].filter(id => !oldSet.has(id)).map(id => _ensureRelProp(relEntity, parseInt(id), entity, parseInt(recordId), ownerTitle)),
        ...[...oldSet].filter(id => !newSet.has(id)).map(id => _removeRelProp(relEntity, parseInt(id), entity, parseInt(recordId))),
      ]);
      rerender();
    },
    { multiSelect: true, selectedIds: curIds }
  );
}

// Ensures both sides see the link as a custom prop (body panel entry)
async function ensureEVBilateral(parentType, parentId, parentTitle, childType, childId, childTitle) {
  await _ensureRelProp(childType, childId, parentType, parentId, parentTitle);
  if (childTitle !== undefined) await _ensureRelProp(parentType, parentId, childType, childId, childTitle);
}

async function removeEVBilateral(parentType, parentId, childType, childId) {
  await _removeRelProp(childType, childId, parentType, parentId);
  await _removeRelProp(parentType, parentId, childType, childId);
}

/* ─── Relations Section (bidirectional peer links) ───────────────────── */

const RELATION_ENTITY_TYPES = [
  { value: 'task',     label: 'Task'     },
  { value: 'goal',     label: 'Goal'     },
  { value: 'project',  label: 'Project'  },
  { value: 'note',     label: 'Note'     },
  { value: 'resource', label: 'Resource' },
  { value: 'sprint',   label: 'Sprint'   },
];

function buildRelationsSection(entityType, entityId) {
  return `
    <div class="subtask-section" id="relations-sec-${entityType}-${entityId}">
      <div class="subtask-section-title">
        <span>Relations</span>
        <button class="btn btn-sm btn-ghost" id="add-relation-btn-${entityType}-${entityId}" style="font-size:12px">+ Add relation</button>
      </div>
      <div id="relations-list-${entityType}-${entityId}" style="margin-top:6px">
        <div style="color:var(--text-muted);font-size:12px">Loading…</div>
      </div>
    </div>`;
}

async function refreshRelationsList(entityType, entityId) {
  const container = document.getElementById(`relations-list-${entityType}-${entityId}`);
  if (!container) return;
  let rels = [];
  try { rels = await api('GET', `/api/relations/${entityType}/${entityId}`); } catch(e) {}
  if (!Array.isArray(rels) || !rels.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:4px 0">No relations</div>';
    return;
  }
  container.innerHTML = rels.map(r =>
    `<div class="subtask-row" style="cursor:pointer" data-rel-type="${r.related_entity_type}" data-rel-id="${r.related_entity_id}">
      <span style="font-size:10px;background:var(--accent-glow);border-radius:3px;padding:1px 5px;color:var(--text-muted);flex-shrink:0">${r.related_entity_type}</span>
      <span class="subtask-title">${r.related_title || '—'}</span>
      <button class="btn btn-sm btn-ghost rel-unlink-btn"
        data-rel-type="${r.related_entity_type}" data-rel-id="${r.related_entity_id}"
        title="Remove" style="opacity:0.5;flex-shrink:0">×</button>
    </div>`
  ).join('');
  container.querySelectorAll('.rel-unlink-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      try { await api('DELETE', `/api/relations/${entityType}/${entityId}/${btn.dataset.relType}/${btn.dataset.relId}`); } catch(err) {}
      await refreshRelationsList(entityType, entityId);
    };
  });
  container.querySelectorAll('[data-rel-type]').forEach(row => {
    row.onclick = (e) => {
      if (e.target.closest('.rel-unlink-btn')) return;
      const t = row.dataset.relType, id = parseInt(row.dataset.relId);
      if (t === 'task')    showTaskSlideover(id);
      else if (t === 'goal')    showGoalSlideover({ id }, null);
      else if (t === 'project') showProjectSlideover({ id }, null, null);
      else if (t === 'note')    showNoteSlideover(id, null);
      else if (t === 'resource') showResourceSlideover({ id }, null);
    };
  });
}

async function initRelationsSection(entityType, entityId) {
  await refreshRelationsList(entityType, entityId);
  const addBtn = document.getElementById(`add-relation-btn-${entityType}-${entityId}`);
  if (!addBtn) return;

  addBtn.onclick = (e) => {
    e.stopPropagation();
    // Step 1: pick entity type
    openValuePicker(addBtn, RELATION_ENTITY_TYPES, async (relType) => {
      // Step 2: pick entity item from that type
      let items = [];
      try {
        const res = await api('GET', `/api/${relType}s`);
        items = Array.isArray(res) ? res : (res.tasks || res.goals || res.projects || res.notes || res.resources || res.sprints || []);
      } catch(e) {}
      if (!items.length) return;
      const opts = items.map(it => ({ value: String(it.id), label: it.title || it.name || `${relType}-${it.id}` }));
      openValuePicker(addBtn, opts, async (relId) => {
        try {
          await api('POST', `/api/relations/${entityType}/${entityId}`, {
            related_entity_type: relType,
            related_entity_id: parseInt(relId)
          });
          await refreshRelationsList(entityType, entityId);
        } catch(err) { console.error('Failed to add relation:', err); }
      });
    });
  };
}

/* ─── Comment Section ────────────────────────────────────────────────── */

function buildCommentSection(entityType, entityId) {
  return `<div class="comment-section" data-entity-type="${entityType}" data-entity-id="${entityId}">
    <div class="comment-section-header">Comments</div>
    <div class="comment-list"></div>
    <div class="comment-input-row">
      <div class="comment-avatar">M</div>
      <input class="comment-input" placeholder="Add a comment…" autocomplete="off">
      <button class="comment-send-btn" title="Send">↑</button>
    </div>
  </div>`;
}

async function bindCommentSection(el) {
  if (!el) return;
  const entityType = el.dataset.entityType;
  const entityId   = el.dataset.entityId;
  const listEl     = el.querySelector('.comment-list');
  const inp        = el.querySelector('.comment-input');
  const sendBtn    = el.querySelector('.comment-send-btn');

  async function loadComments() {
    let comments = [];
    try { comments = await api('GET', `/api/comments?entity_type=${entityType}&entity_id=${entityId}`); } catch(e) {}
    if (!comments || !comments.length) {
      listEl.innerHTML = '<div class="comment-empty">No comments yet.</div>';
      updateSlideoverCommentIcon(0);
      return;
    }
    listEl.innerHTML = comments.map(c => {
      const initial = (c.author || 'M').charAt(0).toUpperCase();
      const relTime = relativeTime(c.created_at);
      return `<div class="comment-row">
        <div class="comment-avatar">${initial}</div>
        <div class="comment-body">
          <div class="comment-meta"><span class="comment-author">${c.author || 'me'}</span><span class="comment-time">${relTime}</span></div>
          <div class="comment-text">${escHtml(c.body)}</div>
        </div>
      </div>`;
    }).join('');
    updateSlideoverCommentIcon(comments.length);
  }

  await loadComments();

  async function sendComment() {
    const body = inp.value.trim();
    if (!body) return;
    inp.value = '';
    try {
      await api('POST', '/api/comments', { entity_type: entityType, entity_id: parseInt(entityId), body, author: 'me' });
      await loadComments();
      updateCommentBadge(entityType, entityId);
    } catch(e) {}
  }

  sendBtn.onclick = sendComment;
  inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } };
}

function updateCommentBadge(entityType, entityId) {
  // Refresh badge on any visible card/row for this entity
  api('GET', `/api/comments?entity_type=${entityType}&entity_id=${entityId}`)
    .then(comments => {
      const count = (comments || []).length;
      injectCommentBadge(entityType, String(entityId), count);
      updateSlideoverCommentIcon(count);
    }).catch(() => {});
}

// Inject a comment count badge into a single entity's row/card
function injectCommentBadge(entityType, entityId, count) {
  const id = String(entityId);
  const msgIcon = `<svg class="comment-badge-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  document.querySelectorAll(`[data-comment-for="${id}"][data-comment-entity="${entityType}"]`).forEach(el => {
    if (count > 0) {
      el.innerHTML = `${msgIcon}${count}`;
      el.style.display = 'inline-flex';
      el.title = `${count} comment${count!==1?'s':''}`;
    } else {
      el.style.display = 'none';
      el.innerHTML = '';
    }
  });
}

// After rendering a list, fetch and inject comment counts for all visible entities
async function injectCommentBadges(entityType, ids) {
  if (!ids || !ids.length) return;
  // Fetch counts for each id in parallel (batched to avoid overwhelming the server)
  const unique = [...new Set(ids.map(String))];
  await Promise.all(unique.map(async id => {
    try {
      const comments = await api('GET', `/api/comments?entity_type=${entityType}&entity_id=${id}`);
      const count = (comments || []).length;
      if (count > 0) injectCommentBadge(entityType, id, count);
    } catch(e) {}
  }));
}

function updateSlideoverCommentIcon(count) {
  // Inject/update comment bubble next to the entity name in the open panel
  const commentSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  const titleArea = document.querySelector('#slideover-body .detail-title-area') ||
                    document.querySelector('#main-content h1.view-title');
  if (!titleArea) return;

  let badge = titleArea.querySelector('.slideover-comment-icon');
  if (count > 0) {
    const label = `${commentSvg} ${count}`;
    if (badge) {
      badge.innerHTML = label;
      badge.title = `${count} comment${count !== 1 ? 's' : ''}`;
    } else {
      titleArea.insertAdjacentHTML('beforeend',
        `<span class="slideover-comment-icon" title="${count} comment${count !== 1 ? 's' : ''}">${label}</span>`);
      const newBadge = titleArea.querySelector('.slideover-comment-icon');
      if (newBadge) newBadge.onclick = () => {
        const sec = document.querySelector('.comment-section');
        if (sec) { sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); sec.querySelector('.comment-input')?.focus(); }
      };
    }
  } else if (badge) {
    badge.remove();
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
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
    el.onclick = (e) => {
      if (e.target.closest('.ctx-handle')) return;
      renderView('project-detail', el.dataset.projId);
    };
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
      if (!text) { showToast('Write something first', 'error'); return; }
      const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
      await api('POST', '/api/notes', { title: `Daily Note — ${dateStr}`, body: text });
      localStorage.removeItem('daily_note_draft');
      dailyInput.value = '';
      showToast('Note saved!', 'success');
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
  injectCommentBadges('task', allTasks.map(t => t.id));
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

  const taskViews = getEntityViews('task');
  const taskActiveId = getActiveTabId('task');
  let activeTaskView = taskViews.find(v => v.id === taskActiveId) || taskViews[0];
  tasksViewMode = activeTaskView.viewType;

  const kanbanGroupByHtml = `<div class="col-picker-wrap" id="kanban-groupby-wrap" style="${tasksViewMode==='kanban'?'':'display:none'}">
    <button class="btn btn-sm btn-ghost" id="kanban-groupby-btn" title="Group by">⊟ Group: ${tasksKanbanGroupBy}</button>
    <div class="col-picker-dropdown hidden" id="kanban-groupby-dropdown">
      <label class="col-picker-item"><input type="radio" name="kanban-groupby" value="status" ${tasksKanbanGroupBy==='status'?'checked':''}> Status</label>
      <label class="col-picker-item"><input type="radio" name="kanban-groupby" value="priority" ${tasksKanbanGroupBy==='priority'?'checked':''}> Priority</label>
    </div>
  </div>`;

  const isKanban = tasksViewMode === 'kanban';
  const kanbanCols = isKanban ? (tasksKanbanGroupBy === 'status' ? TASK_STATUSES : TASK_PRIORITIES) : [];
  const hiddenForGroup = isKanban ? (kanbanHiddenCols[tasksKanbanGroupBy] || []) : [];
  const colPickerHtml = `<div class="col-picker-wrap" style="position:relative${isKanban?'':';display:none'}" id="col-picker-wrap">
    <button class="btn btn-sm btn-ghost" id="col-picker-btn" title="Show/hide columns">⊟ Columns</button>
    <div class="col-picker-dropdown hidden" id="col-picker-dropdown">
      ${kanbanCols.map(col => `<label class="col-picker-item"><input type="checkbox" class="kanban-col-check" data-col="${col}" ${hiddenForGroup.includes(col)?'':'checked'}> ${col.replace(/_/g,' ')}</label>`).join('')}
    </div>
  </div>`;

  const eyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const propVisHtml = `<div class="prop-vis-wrap" id="prop-vis-wrap" style="margin-right:4px">
    <button class="btn btn-sm btn-ghost" id="prop-vis-btn" title="Property visibility">${eyeSvg}</button>
  </div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">${viewIconHtml('tasks')}${viewDisplayName('tasks','Tasks')}</h1>
    </div>
    ${buildViewTabBar('task', taskViews, activeTaskView.id).replace('id="new-task-btn"', 'id="new-task-btn" style="display:none"')}
    <div id="tasks-content"></div>
  </div>`;

  // Inject extra toolbar items (kanban group-by, col picker, prop-vis) into toolbar-right before new btn
  const toolbarRight = document.querySelector('#task-tab-bar .view-toolbar-right');
  if (toolbarRight) {
    const newBtn = toolbarRight.querySelector('#new-task-btn');
    if (newBtn) {
      newBtn.style.display = '';
      newBtn.textContent = '+ New Task';
      toolbarRight.insertBefore(document.createRange().createContextualFragment(kanbanGroupByHtml + colPickerHtml + propVisHtml), newBtn);
    }
  }

  document.getElementById('new-task-btn').onclick = () => showNewTaskModal({});
  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'tasks', 'Tasks');

  // Column picker
  const colPickerBtn = document.getElementById('col-picker-btn');
  const colPickerDrop = document.getElementById('col-picker-dropdown');
  if (colPickerBtn) {
    colPickerBtn.onclick = (e) => { e.stopPropagation(); colPickerDrop.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => {
      if (!colPickerBtn.contains(e.target)) colPickerDrop.classList.add('hidden');
    }, { once: false, capture: false });
    document.querySelectorAll('.kanban-col-check').forEach(chk => {
      chk.onchange = () => {
        const checked = [...document.querySelectorAll('.kanban-col-check')].map(c => ({ col: c.dataset.col, on: c.checked }));
        kanbanHiddenCols[tasksKanbanGroupBy] = checked.filter(c => !c.on).map(c => c.col);
        localStorage.setItem('kanbanHiddenCols', JSON.stringify(kanbanHiddenCols));
        render();
      };
    });
  }

  // Property visibility panel
  const propVisBtn = document.getElementById('prop-vis-btn');
  const propVisWrap = document.getElementById('prop-vis-wrap');
  if (propVisBtn && propVisWrap) {
    propVisBtn.onclick = (e) => {
      e.stopPropagation();
      bindPropVisPanel(
        propVisWrap,
        [...TASK_PROPS, ...getCustomPropDefs('task').map(d => ({ key: d.key, label: d.label }))],
        () => getTaskVisProps(tasksViewMode),
        (keys) => setTaskVisProps(tasksViewMode, keys),
        render
      );
    };
  }

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

  // Bind tab bar
  bindViewTabBar('task', (newActiveId) => {
    setActiveTabId('task', newActiveId);
    tasksViewMode = (getEntityViews('task').find(v => v.id === newActiveId) || {}).viewType || 'list';
    localStorage.setItem('tasksViewMode', tasksViewMode);
    renderTasks();
  }, () => renderTasks());

  // Bind filter/sort panels
  bindFilterSortChips('task', activeTaskView, (updatedView) => {
    const vs = getEntityViews('task');
    const idx = vs.findIndex(v => v.id === updatedView.id);
    if (idx >= 0) vs[idx] = updatedView;
    saveEntityViews('task', vs);
    activeTaskView = updatedView;
    render();
  });

  function getFiltered() {
    return applyViewFiltersAndSorts(topLevel, activeTaskView, {
      title: t => t.title,
      status: t => t.status,
      priority: t => t.priority,
      due_date: t => t.due_date || '',
      story_points: t => t.story_points,
      _text: t => t.title + ' ' + (t.description || '') + ' ' + (t.project_title || '') + ' ' + Object.values(getCustomPropValues('task', t.id) || {}).filter(v => typeof v === 'string' || typeof v === 'number').join(' '),
    });
  }

  function buildCardsView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;
    const cards = list.map(t => {
      const dueLine = t.due_date ? `<span class="task-due" style="font-size:11px;color:${dueDateColor(t.due_date)}">${fmtDate(t.due_date)}</span>` : '';
      const projLine = t.project_title ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${t.project_title}</div>` : '';
      const tags = (t.tags||[]).slice(0,3).map(tg => tagHtml(tg)).join('');
      const storyPts = t.story_points ? `<span style="font-size:10px;color:var(--text-muted);border:1px solid var(--border);border-radius:3px;padding:0 4px">${t.story_points}pt</span>` : '';
      const meta = [statusBadge(t.status), priorityBadge(t.priority), dueLine, tags, storyPts].filter(Boolean);
      return `<div class="task-card-item" data-task-id="${t.id}" style="cursor:pointer">
        <div class="kanban-card-header">
          <div class="kanban-card-title"><span class="list-icon-slot" data-icon-entity="task" data-icon-id="${t.id}" data-icon-size="16" style="display:none;margin-right:4px;vertical-align:middle;font-size:16px"></span>${t.title}<span class="comment-badge" data-comment-for="${t.id}" data-comment-entity="task" style="display:none"></span></div>
          <span class="ctx-handle" data-entity="task" data-id="${t.id}" title="Actions">⠿</span>
        </div>
        ${projLine}
        ${meta.length ? `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:6px">${meta.join('')}</div>` : ''}
        ${renderCustomPropChips('task', t.id, 'cards')}
      </div>`;
    }).join('');
    return `<div class="task-cards-grid">${cards}</div>`;
  }

  function buildListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;
    return '<ul class="task-list">' + buildTaskTreeRows(list, allTasksFull, 0, true, 'list') + '</ul>';
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">No tasks found</div></div>`;

    const vis = (key) => propVisible('table', key);
    const allColDef = [
      { key: 'project',      header: 'Project',      cell: (t) => `<td>${t.project_title ? `<span class="badge badge-todo">${t.project_title}</span>` : '—'}</td>` },
      { key: 'goal',         header: 'Goals',         cell: (t) => `<td>${t.goal_title ? `<span class="badge badge-todo">${t.goal_title}</span>` : '—'}</td>` },
      { key: 'status',       header: 'Status',        cell: (t) => { const sopts = TASK_STATUSES.map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join(''); return `<td><select class="inline-status-select" data-task-id="${t.id}" style="font-size:11px;padding:2px 6px;border-radius:3px">${sopts}</select></td>`; } },
      { key: 'priority',     header: 'Priority',      cell: (t) => `<td>${priorityBadge(t.priority)}</td>` },
      { key: 'due_date',     header: 'Due',           cell: (t) => `<td style="${t.due_date?'color:'+dueDateColor(t.due_date):''}">${fmtDate(t.due_date)||'—'}</td>` },
      { key: 'tags',         header: 'Tags',          cell: (t) => `<td>${(t.tags||[]).map(tg=>tagHtml(tg)).join('')}</td>` },
      { key: 'story_points', header: 'Points',        cell: (t) => `<td>${t.story_points ? `<span style="font-size:11px;border:1px solid var(--border);border-radius:3px;padding:0 4px">${t.story_points}pt</span>` : '—'}</td>` },
      { key: 'category',     header: 'Category',      cell: (t) => { const cn = t.category_name || t.category || ''; return `<td>${cn ? `<span style="font-size:11px;color:var(--text-muted)">${cn}</span>` : '—'}</td>`; } },
      { key: 'recurrence',   header: 'Recurrence',    cell: (t) => `<td>${t.recur_interval > 0 ? `<span class="task-recur-badge">↺ every ${t.recur_interval} ${(t.recur_unit||'').toLowerCase()}</span>` : '—'}</td>` },
      { key: 'description',  header: 'Description',   cell: (t) => `<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--text-muted)">${t.description||'—'}</td>` },
    ];
    const visibleCols = allColDef.filter(c => vis(c.key));

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
        const titleCell = `<td><div class="task-title-cell" style="padding-left:${depth*20}px">${toggleBtn}<span class="list-icon-slot" data-icon-entity="task" data-icon-id="${t.id}" data-icon-size="15" style="display:none;margin-right:4px;vertical-align:middle;font-size:15px"></span><span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-task-id="${t.id}">${t.title}${t.recur_interval>0?` <span class="task-recur-badge">↺</span>`:''}</span><span class="comment-badge" data-comment-for="${t.id}" data-comment-entity="task" style="display:none"></span></div></td>`;
        const customCols = getCustomPropDefs('task').filter(d => propVisible('table', d.key)).map(def => customPropCell('task', t.id, def)).join('');
        html += `<tr class="task-table-row" data-task-id="${t.id}" style="position:relative">
          ${titleCell}${visibleCols.map(c => c.cell(t)).join('')}${customCols}
          <td><span class="ctx-handle" data-entity="task" data-id="${t.id}" title="Actions">⠿</span></td>
        </tr>`;
        if (isExpanded && children.length > 0) {
          html += tableRows(children, depth + 1);
          const colspan = visibleCols.length + 2;
          html += `<tr class="task-quick-add-row task-table-add-row" data-add-parent="${t.id}">
            <td colspan="${colspan}" style="padding:4px 8px 4px ${(depth+1)*20+8}px">
              <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:12px;color:var(--color-text-secondary)">+ Add Subtask</button>
            </td>
          </tr>`;
        }
      });
      return html;
    }

    const customHeaders = getCustomPropDefs('task').filter(d => propVisible('table', d.key)).map(d => `<th>${d.label}</th>`).join('');
    const headers = `<th>Title</th>` + visibleCols.map(c => `<th>${c.header}</th>`).join('') + customHeaders + '<th></th>' + addPropColumnHeader('task');
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
        const kVis = (key) => propVisible('kanban', key);
        const recurBadge = kVis('recurrence') && t.recur_interval > 0 ? ' <span class="task-recur-badge">↺</span>' : '';
        const projLine = kVis('project') && t.project_title ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${t.project_title}</div>` : '';
        const statusLine = kVis('status') ? (groupBy === 'status' ? (kVis('priority') ? priorityBadge(t.priority) : '') : statusBadge(t.status)) : '';
        const dueLine = kVis('due_date') && t.due_date ? `<span class="task-due" style="font-size:10px;color:${dueDateColor(t.due_date)}">${fmtDate(t.due_date)}</span>` : '';
        const tagLine = kVis('tags') ? (t.tags||[]).slice(0,2).map(tg => tagHtml(tg)).join('') : '';
        const storyPts = kVis('story_points') && t.story_points ? `<span style="font-size:10px;color:var(--text-muted);border:1px solid var(--border);border-radius:3px;padding:0 4px">${t.story_points}pt</span>` : '';
        const metaLine = [statusLine, dueLine, tagLine, storyPts].some(Boolean)
          ? `<div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">${statusLine}${dueLine}${tagLine}${storyPts}</div>` : '';
        return `<div class="kanban-card" data-task-id="${t.id}" style="cursor:grab">
          <div class="kanban-card-header"><div class="kanban-card-title"><span class="list-icon-slot" data-icon-entity="task" data-icon-id="${t.id}" data-icon-size="15" style="display:none;margin-right:4px;vertical-align:middle;font-size:15px"></span>${t.title}<span class="comment-badge" data-comment-for="${t.id}" data-comment-entity="task" style="display:none"></span>${recurBadge}</div><span class="ctx-handle" data-entity="task" data-id="${t.id}" title="Actions">⠿</span></div>
          ${projLine}${metaLine}
          ${renderCustomPropChips('task', t.id, 'kanban')}
        </div>`;
      }).join('');
      const label = colKey.replace(/_/g,' ');
      const colColor = getValueColor(groupBy === 'status' ? 'taskStatuses' : 'taskPriorities', colKey);
      return `<div class="kanban-col" data-col="${colKey}">
        <div class="kanban-col-header" style="${colColor ? `color:${colColor}` : ''}">
          <span>${label}</span>
          <span class="kanban-count">${tasks.length}</span>
        </div>
        <div class="kanban-col-body">
          ${cards || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No tasks</div>'}
        </div>
        <button class="btn btn-sm btn-ghost kanban-add-btn" data-status="${colKey}" style="width:100%;margin-top:8px;font-size:12px">+ Add task</button>
      </div>`;
    }).join('');

    // Set explicit column count so all columns stay on one row; horizontal scroll if needed
    const colCount = allKeys.length;
    const colWidth = 260; // px per column
    const boardStyle = `display:grid;grid-template-columns:repeat(${colCount},minmax(${colWidth}px,1fr));gap:var(--space-4);align-items:start;padding-bottom:16px`;
    return `<div style="overflow-x:auto;width:100%"><div class="kanban-board" style="${boardStyle}" data-groupby="${groupBy}">${colsHtml}</div></div>`;
  }

  function bindTaskKanban() {
    const board = document.querySelector('.kanban-board[data-groupby]');
    if (!board) return;
    const groupBy = board.dataset.groupby;
    bindKanbanDrag(board, '.kanban-card[data-task-id]', 'taskId', async (taskId, colKey) => {
      await api('PATCH', `/api/tasks/${taskId}`, { [groupBy]: colKey });
      const t = tasks.find(x => String(x.id) === String(taskId));
      if (t) t[groupBy] = colKey;
      render();
    });
  }

  let filterBarInitialized = false;
  function render() {
    const filtered = getFiltered();
    let content = '';
    if (tasksViewMode === 'list') content = buildListView(filtered);
    else if (tasksViewMode === 'table') content = buildTableView(filtered);
    else if (tasksViewMode === 'kanban') content = buildKanbanView(filtered);
    else if (tasksViewMode === 'dashboard') content = buildDashboardView(filtered);
    else if (tasksViewMode === 'cards') content = buildCardsView(filtered);
    document.getElementById('tasks-content').innerHTML = content;
    bindTasksContentEvents();
    if (tasksViewMode === 'table') {
      bindAddPropBtn('task', render);
      bindCustomPropCells();
    }
    // Show/hide kanban-specific controls
    const gbWrap = document.getElementById('kanban-groupby-wrap');
    if (gbWrap) gbWrap.style.display = tasksViewMode === 'kanban' ? '' : 'none';
    const colWrap = document.getElementById('col-picker-wrap');
    if (colWrap) colWrap.style.display = tasksViewMode === 'kanban' ? '' : 'none';
    // Inject entity icons into task title slots — include subtask ids too
    injectListIcons('task', allTasksFull.map(t => t.id));
    injectCommentBadges('task', allTasksFull.map(t => t.id));
  }

  render();
  _viewPropDefsCallback = (entity) => { if (entity === 'task') render(); };

  function bindTasksContentEvents() {
    bindCtxHandles();
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
        const pt = allTasksFull.find(t => t.id === parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium',
          goal_id: pt?.goal_id || null, project_id: pt?.project_id || null, sprint_id: pt?.sprint_id || null }, async () => {
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
            e.target.closest('.ctx-handle') ||
            e.target.dataset.checkId) return;
        showTaskSlideover(row.dataset.taskId);
      };
    });
    // Table row click → slideover (guards against toggle/add-sub/select)
    document.querySelectorAll('.task-table-row').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('.task-toggle-arrow') ||
            e.target.closest('.task-add-sub-btn') ||
            e.target.closest('.ctx-handle') ||
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
        // optimistically update
        const t = topLevel.find(x => String(x.id) === String(id)) ||
                  allTasksFull.find(x => String(x.id) === String(id));
        if (t) t.status = newStatus;
        render();
      };
    });

    // Kanban card click → slideover
    document.querySelectorAll('.kanban-card[data-task-id]').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.ctx-handle')) return;
        showTaskSlideover(card.dataset.taskId);
      };
    });

    // Cards view card click → slideover
    document.querySelectorAll('.task-card-item[data-task-id]').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.ctx-handle')) return;
        showTaskSlideover(card.dataset.taskId);
      };
    });

    // Kanban "+ Add task" button
    document.querySelectorAll('.kanban-add-btn').forEach(btn => {
      btn.onclick = () => {
        const presets = {};
        if (tasksKanbanGroupBy === 'status') presets.status = btn.dataset.status;
        else if (tasksKanbanGroupBy === 'priority') presets.priority = btn.dataset.status;
        showNewTaskModal(presets, () => renderTasks());
      };
    });
    bindTaskKanban();

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

  function buildProjectCard(p) {
    const prog = p.progress || {};
    const pct = prog.pct || 0;
    const vis = (key) => entityPropVisible('project', key);
    const activeTasks = (p.active_tasks || []).slice(0, 3).map(t =>
      `<div style="font-size:12px;color:var(--text-muted);padding:2px 0">• ${t}</div>`
    ).join('');
    const tagChips = vis('tags') ? (p.tags || []).map(t => tagHtml(t)).join('') : '';
    return `<div class="card proj-slideover-card" data-proj-id="${p.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          <span class="ctx-handle" data-entity="project" data-id="${p.id}" title="Actions">⠿</span>
          <span class="card-title"><span class="list-icon-slot" data-icon-entity="project" data-icon-id="${p.id}" data-icon-size="20" style="display:none;margin-right:6px;vertical-align:middle;font-size:20px"></span>${p.title}<span class="comment-badge" data-comment-for="${p.id}" data-comment-entity="project" style="display:none"></span></span>
        </div>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${vis('status') ? statusBadge(p.status) : ''}
        ${vis('area') && p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
        ${tagChips}
      </div>
      ${vis('goal') && p.goal_title ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Goal: ${p.goal_title}</div>` : ''}
      ${vis('progress') ? `<div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>` : ''}
      ${activeTasks ? `<div style="margin-top:8px">${activeTasks}</div>` : ''}
      ${renderCustomPropChips('project', p.id, 'cards')}
    </div>`;
  }

  function buildCardsView(list) {
    return list.map(buildProjectCard).join('') ||
      `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
    const vis = (key) => entityPropVisible('project', key);
    const rows = list.map(p => {
      const prog = p.progress || {};
      const pct = prog.pct || 0;
      const customCols = getCustomPropDefs('project').filter(d => entityPropVisible('project', d.key)).map(def => customPropCell('project', p.id, def)).join('');
      return `<tr>
        <td class="ctx-handle-cell"><span class="ctx-handle" data-entity="project" data-id="${p.id}" title="Actions">⠿</span></td>
        <td><span class="list-icon-slot" data-icon-entity="project" data-icon-id="${p.id}" data-icon-size="15" style="display:none;margin-right:4px;vertical-align:middle;font-size:15px"></span><span class="task-title-link" style="cursor:pointer;color:var(--accent)" data-proj-id="${p.id}">${p.title}</span><span class="comment-badge" data-comment-for="${p.id}" data-comment-entity="project" style="display:none"></span></td>
        ${vis('status')   ? `<td>${statusBadge(p.status)}</td>` : ''}
        ${vis('goal')     ? `<td>${p.goal_title || '—'}</td>` : ''}
        ${vis('area')     ? `<td>${p.macro_area ? p.macro_area.split('(')[0].trim() : '—'}</td>` : ''}
        ${vis('progress') ? `<td>${pct}% (${prog.done||0}/${prog.total||0})</td>` : ''}
        ${vis('tags')     ? `<td>${(p.tags||[]).map(t=>tagHtml(t)).join('')}</td>` : ''}
        ${customCols}
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button>
        </td>
      </tr>`;
    }).join('');
    const customHeaders = getCustomPropDefs('project').filter(d => entityPropVisible('project', d.key)).map(d => `<th>${d.label}</th>`).join('');
    const headers = [
      '<th class="ctx-handle-th"></th>',
      '<th>Title</th>',
      vis('status')   ? '<th>Status</th>'   : '',
      vis('goal')     ? '<th>Goal</th>'     : '',
      vis('area')     ? '<th>Area</th>'     : '',
      vis('progress') ? '<th>Progress</th>' : '',
      vis('tags')     ? '<th>Tags</th>'     : '',
      customHeaders,
      '<th></th>',
      addPropColumnHeader('project'),
    ].join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
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
        const vis = (key) => entityPropVisible('project', key);
        return `<div class="kanban-card proj-kanban-card" data-proj-id="${p.id}" style="cursor:grab">
          <div class="kanban-card-title">${p.title}</div>
          ${vis('goal') && p.goal_title ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${p.goal_title}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            ${vis('status') && groupBy !== 'status' ? statusBadge(p.status) : ''}
            ${vis('area') && groupBy !== 'macro_area' && p.macro_area ? `<span style="font-size:10px;color:var(--text-muted)">${p.macro_area.split('(')[0].trim()}</span>` : ''}
          </div>
          ${vis('progress') ? `<div style="margin-top:8px">
            <div class="progress-track" style="height:4px"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${pct}% · ${prog.done||0}/${prog.total||0}</div>
          </div>` : ''}
          ${renderCustomPropChips('project', p.id, 'kanban')}
        </div>`;
      }).join('');
      const label = colKey.replace(/_/g,' ');
      return `<div class="kanban-col proj-kanban-col" data-col="${colKey}">
        <div class="kanban-col-header">
          <span>${label}</span>
          <span class="kanban-count">${items.length}</span>
        </div>
        <div class="kanban-col-body">
          ${cards || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No projects</div>'}
        </div>
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

  function bindProjKanban() {
    const board = document.querySelector('#proj-list .kanban-board');
    if (!board) return;
    const groupBy = projsKanbanGroupBy;
    const field = groupBy === 'macro_area' ? 'macro_area' : groupBy === 'kanban_col' ? 'kanban_col' : 'status';
    bindKanbanDrag(board, '.proj-kanban-card[data-proj-id]', 'projId', async (projId, colKey) => {
      await api('PATCH', `/api/projects/${projId}`, { [field]: colKey });
      const p = projects.find(x => String(x.id) === String(projId));
      if (p) p[field] = colKey;
      render();
    });
  }

  const projViews = getEntityViews('project');
  const projActiveId = getActiveTabId('project');
  let activeProjView = projViews.find(v => v.id === projActiveId) || projViews[0];
  projectsViewMode = activeProjView.viewType;

  const projEyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const projPropVisHtml = `<div class="prop-vis-wrap" id="proj-prop-vis-wrap" style="margin-right:4px"><button class="btn btn-sm btn-ghost" id="proj-prop-vis-btn" title="Property visibility">${projEyeSvg}</button></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header"><h1 class="view-title">${viewIconHtml('projects')}${viewDisplayName('projects','Projects')}</h1></div>
    ${buildViewTabBar('project', projViews, activeProjView.id).replace('id="new-project-btn"', 'id="new-project-btn" style="display:none"')}
    <div id="proj-list"></div>
  </div>`;

  // Inject prop-vis into toolbar-right
  const projToolbarRight = document.querySelector('#project-tab-bar .view-toolbar-right');
  if (projToolbarRight) {
    const newBtn = projToolbarRight.querySelector('#new-project-btn');
    if (newBtn) { newBtn.style.display = ''; newBtn.textContent = '+ New Project'; projToolbarRight.insertBefore(document.createRange().createContextualFragment(projPropVisHtml), newBtn); }
  }

  const projPropVisBtn = document.getElementById('proj-prop-vis-btn');
  const projPropVisWrap = document.getElementById('proj-prop-vis-wrap');
  if (projPropVisBtn && projPropVisWrap) {
    projPropVisBtn.onclick = (e) => {
      e.stopPropagation();
      bindPropVisPanel(projPropVisWrap, [...(ENTITY_ALL_PROPS.project||[]), ...getCustomPropDefs('project').map(d => ({ key: d.key, label: d.label }))], () => getEntityVisProps('project'), (keys) => setEntityVisProps('project', keys), render);
    };
  }

  // Wire new project button
  document.getElementById('new-project-btn').onclick = () => showProjectModal(null, goals);
  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'projects', 'Projects');

  // Bind tab bar
  bindViewTabBar('project', (newActiveId) => {
    setActiveTabId('project', newActiveId);
    projectsViewMode = (getEntityViews('project').find(v => v.id === newActiveId) || {}).viewType || 'cards';
    localStorage.setItem('projectsViewMode', projectsViewMode);
    renderProjects();
  }, () => renderProjects());

  // Bind filter/sort panels
  bindFilterSortChips('project', activeProjView, (updatedView) => {
    const vs = getEntityViews('project');
    const idx = vs.findIndex(v => v.id === updatedView.id);
    if (idx >= 0) vs[idx] = updatedView;
    saveEntityViews('project', vs);
    activeProjView = updatedView;
    render();
  });

  function getFiltered() {
    return applyViewFiltersAndSorts(projects, activeProjView, {
      title: p => p.title,
      status: p => p.status,
      macro_area: p => p.macro_area || '',
      goal_id: p => String(p.goal_id || ''),
      _text: p => p.title + ' ' + (p.description || '') + ' ' + (p.goal_title || '') + ' ' + Object.values(getCustomPropValues('project', p.id) || {}).filter(v => typeof v === 'string' || typeof v === 'number').join(' '),
    });
  }

  function buildProjectListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">No projects found</div></div>`;
    const vis = (key) => entityPropVisible('project', key);
    return `<div class="entity-list-view">${list.map(p => {
      const prog = p.progress || {};
      const pct = prog.pct || 0;
      return `<div class="entity-list-row proj-list-row" data-proj-id="${p.id}">
        <span class="ctx-handle" data-entity="project" data-id="${p.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
        <span class="list-icon-slot" data-icon-entity="project" data-icon-id="${p.id}" data-icon-size="16" style="display:none;flex-shrink:0"></span>
        <span class="entity-list-title proj-list-title">${p.title}<span class="comment-badge" data-comment-for="${p.id}" data-comment-entity="project" style="display:none"></span></span>
        ${vis('status') ? statusBadge(p.status) : ''}
        ${vis('goal') ? (() => { const v = renderMultiRelationValue('project', p.id, 'goal', p.goal_title); return v ? `<span class="entity-list-meta">${v}</span>` : ''; })() : ''}
        ${vis('macro') && p.macro_area ? `<span class="entity-list-meta">${p.macro_area.split('(')[0].trim()}</span>` : ''}
        ${vis('progress') && prog.total > 0 ? `<span class="entity-list-progress"><span class="entity-list-progress-bar" style="width:${pct}%"></span></span><span class="entity-list-pct">${pct}%</span>` : ''}
        ${vis('tags') ? (p.tags || []).map(t => tagHtml(t)).join('') : ''}
        ${renderCustomPropChips('project', p.id, 'list')}
        <span onclick="event.stopPropagation()"><button class="btn btn-sm btn-ghost proj-export-btn" data-proj-id="${p.id}">Export</button></span>
      </div>`;
    }).join('')}</div>`;
  }

  function render() {
    const list = getFiltered();
    let html;
    if (projectsViewMode === 'table') html = buildTableView(list);
    else if (projectsViewMode === 'kanban') html = buildProjectKanbanView(list);
    else if (projectsViewMode === 'list') html = buildProjectListView(list);
    else html = buildCardsView(list);
    document.getElementById('proj-list').innerHTML = html;
    bindProjEvents();
    if (projectsViewMode === 'table') { bindAddPropBtn('project', render); bindCustomPropCells(); }
    injectListIcons('project', list.map(p => p.id));
    injectCommentBadges('project', list.map(p => p.id));
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
        card.addEventListener('click', (e) => {
          if (e.target.closest('.ctx-handle')) return;
          if (e.target.closest('.kanban-card-title')) {
            renderView('project-detail', card.dataset.projId);
            return;
          }
          const p = projects.find(x => String(x.id) === card.dataset.projId);
          if (p) showProjectSlideover(p, goals, render);
        });
      });
      bindCtxHandles();
      bindProjKanban();
    }
  }
  render();
  _viewPropDefsCallback = (entity) => { if (entity === 'project') render(); };

  function bindProjEvents() {
    bindCtxHandles();
    document.querySelectorAll('.proj-slideover-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.proj-del-btn, .proj-export-btn, .ctx-handle')) return;
        if (e.target.closest('.card-title')) {
          renderView('project-detail', el.dataset.projId);
          return;
        }
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        if (p) showProjectSlideover(p, goals, render);
      };
    });
    document.querySelectorAll('.task-title-link[data-proj-id]').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        renderView('project-detail', el.dataset.projId);
      };
    });
    document.querySelectorAll('.proj-list-row').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.proj-export-btn, .ctx-handle')) return;
        if (e.target.closest('.proj-list-title')) {
          renderView('project-detail', el.dataset.projId);
          return;
        }
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        if (p) showProjectSlideover(p, goals, render);
      };
    });
    document.querySelectorAll('.proj-export-btn').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const p = projects.find(x => String(x.id) === el.dataset.projId);
        showJSONModal(`/api/export/project/${el.dataset.projId}`, `project-${p?.title||el.dataset.projId}.json`);
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

  const goalViews = getEntityViews('goal');
  const goalActiveId = getActiveTabId('goal');
  let activeGoalView = goalViews.find(v => v.id === goalActiveId) || goalViews[0];
  goalsViewMode = activeGoalView.viewType;

  const goalEyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const goalPropVisHtml = `<div class="prop-vis-wrap" id="goal-prop-vis-wrap" style="margin-right:4px"><button class="btn btn-sm btn-ghost" id="goal-prop-vis-btn" title="Property visibility">${goalEyeSvg}</button></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header"><h1 class="view-title">${viewIconHtml('goals')}${viewDisplayName('goals','Goals')}</h1></div>
    ${buildViewTabBar('goal', goalViews, activeGoalView.id).replace('id="new-goal-btn"', 'id="new-goal-btn" style="display:none"')}
    <div id="goal-list"></div>
  </div>`;

  const goalToolbarRight = document.querySelector('#goal-tab-bar .view-toolbar-right');
  if (goalToolbarRight) {
    const newBtn = goalToolbarRight.querySelector('#new-goal-btn');
    if (newBtn) { newBtn.style.display = ''; newBtn.textContent = '+ New Goal'; goalToolbarRight.insertBefore(document.createRange().createContextualFragment(goalPropVisHtml), newBtn); }
  }

  const goalPropVisBtn = document.getElementById('goal-prop-vis-btn');
  const goalPropVisWrap = document.getElementById('goal-prop-vis-wrap');
  if (goalPropVisBtn && goalPropVisWrap) {
    goalPropVisBtn.onclick = (e) => {
      e.stopPropagation();
      bindPropVisPanel(goalPropVisWrap, [...(ENTITY_ALL_PROPS.goal||[]), ...getCustomPropDefs('goal').map(d => ({ key: d.key, label: d.label }))], () => getEntityVisProps('goal'), (keys) => setEntityVisProps('goal', keys), render);
    };
  }

  document.getElementById('new-goal-btn').onclick = () => showGoalModal(null);
  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'goals', 'Goals');

  bindViewTabBar('goal', (newActiveId) => {
    setActiveTabId('goal', newActiveId);
    goalsViewMode = (getEntityViews('goal').find(v => v.id === newActiveId) || {}).viewType || 'cards';
    localStorage.setItem('goalsViewMode', goalsViewMode);
    renderGoals();
  }, () => renderGoals());

  bindFilterSortChips('goal', activeGoalView, (updatedView) => {
    const vs = getEntityViews('goal');
    const idx = vs.findIndex(v => v.id === updatedView.id);
    if (idx >= 0) vs[idx] = updatedView;
    saveEntityViews('goal', vs);
    activeGoalView = updatedView;
    render();
  });

  function getFiltered() {
    return applyViewFiltersAndSorts(goals, activeGoalView, {
      title: g => g.title,
      status: g => g.status,
      type: g => g.type || '',
      year: g => g.year || '',
      _text: g => g.title + ' ' + (g.description || '') + ' ' + Object.values(getCustomPropValues('goal', g.id) || {}).filter(v => typeof v === 'string' || typeof v === 'number').join(' '),
    });
  }

  function buildGoalListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
    const vis = (key) => entityPropVisible('goal', key);
    return `<div class="entity-list-view">${list.map(g => {
      const prog = g.progress || {};
      const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
      return `<div class="entity-list-row goal-list-row" data-goal-id="${g.id}">
        <span class="ctx-handle" data-entity="goal" data-id="${g.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
        <span class="list-icon-slot" data-icon-entity="goal" data-icon-id="${g.id}" data-icon-size="16" style="display:none;flex-shrink:0"></span>
        <span class="entity-list-title goal-list-title">${g.title}<span class="comment-badge" data-comment-for="${g.id}" data-comment-entity="goal" style="display:none"></span></span>
        ${vis('type') && g.type ? `<span class="entity-list-meta">${g.type}</span>` : ''}
        ${vis('year') && g.year ? `<span class="entity-list-meta">${g.year}</span>` : ''}
        ${vis('status') ? statusBadge(g.status) : ''}
        ${vis('progress') && prog.total > 0 ? `<span class="entity-list-progress"><span class="entity-list-progress-bar" style="width:${pct}%"></span></span><span class="entity-list-pct">${pct}%</span>` : ''}
        ${vis('tags') ? (g.tags || []).map(t => tagHtml(t)).join('') : ''}
        <span onclick="event.stopPropagation()"><button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button></span>
      </div>`;
    }).join('')}</div>`;
  }

  function render() {
    const list = getFiltered();
    let html;
    if (goalsViewMode === 'table') html = buildTableView(list);
    else if (goalsViewMode === 'kanban') html = buildGoalKanbanView(list);
    else if (goalsViewMode === 'list') html = buildGoalListView(list);
    else html = buildCardsView(list);
    document.getElementById('goal-list').innerHTML = html;
    bindGoalEvents();
    if (goalsViewMode === 'table') { bindAddPropBtn('goal', render); bindCustomPropCells(); }
    injectListIcons('goal', list.map(g => g.id));
    injectCommentBadges('goal', list.map(g => g.id));
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
        card.addEventListener('click', (e) => {
          if (e.target.closest('.ctx-handle')) return;
          if (e.target.closest('.kanban-card-title')) {
            renderView('goal-detail', card.dataset.goalId);
            return;
          }
          const g = goals.find(x => String(x.id) === card.dataset.goalId);
          if (g) showGoalSlideover(g, render);
        });
      });
      bindCtxHandles();
      bindGoalKanban();
    }
  }
  render();
  _viewPropDefsCallback = (entity) => { if (entity === 'goal') render(); };

  function buildGoalCard(g) {
    const prog = g.progress || {};
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    const vis = (key) => entityPropVisible('goal', key);
    const tagChips = vis('tags') ? (g.tags || []).map(t => tagHtml(t)).join('') : '';
    return `<div class="card goal-slideover-card" data-goal-id="${g.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          <span class="ctx-handle" data-entity="goal" data-id="${g.id}" title="Actions">⠿</span>
          <span class="card-title"><span class="list-icon-slot" data-icon-entity="goal" data-icon-id="${g.id}" data-icon-size="20" style="display:none;margin-right:6px;vertical-align:middle;font-size:20px"></span>${g.title}<span class="comment-badge" data-comment-for="${g.id}" data-comment-entity="goal" style="display:none"></span></span>
        </div>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${vis('type') && g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
        ${vis('year') && g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        ${vis('status') ? statusBadge(g.status) : ''}
        ${tagChips}
      </div>
      ${vis('progress') ? `<div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0} tasks</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>` : ''}
      ${renderCustomPropChips('goal', g.id, 'cards')}
    </div>`;
  }

  function buildCardsView(list) {
    return list.map(buildGoalCard).join('') ||
      `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
  }

  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No goals found</div></div>`;
    const vis = (key) => entityPropVisible('goal', key);
    const rows = list.map(g => {
      const prog = g.progress || {};
      const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
      const customCols = getCustomPropDefs('goal').filter(d => entityPropVisible('goal', d.key)).map(def => customPropCell('goal', g.id, def)).join('');
      return `<tr>
        <td class="ctx-handle-cell"><span class="ctx-handle" data-entity="goal" data-id="${g.id}" title="Actions">⠿</span></td>
        <td><span style="cursor:pointer;color:var(--accent)" class="goal-nav-link" data-goal-id="${g.id}">${g.title}</span><span class="comment-badge" data-comment-for="${g.id}" data-comment-entity="goal" style="display:none"></span></td>
        ${vis('status')   ? `<td>${statusBadge(g.status)}</td>` : ''}
        ${vis('type')     ? `<td>${g.type || '—'}</td>` : ''}
        ${vis('year')     ? `<td>${g.year || '—'}</td>` : ''}
        ${vis('progress') ? `<td>${pct}%</td>` : ''}
        ${vis('tags')     ? `<td>${(g.tags||[]).map(t=>tagHtml(t)).join('')}</td>` : ''}
        ${customCols}
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost goal-export-btn" data-goal-id="${g.id}">Export</button>
        </td>
      </tr>`;
    }).join('');
    const customHeaders = getCustomPropDefs('goal').filter(d => entityPropVisible('goal', d.key)).map(d => `<th>${d.label}</th>`).join('');
    const headers = [
      '<th class="ctx-handle-th"></th>',
      '<th>Title</th>',
      vis('status')   ? '<th>Status</th>'   : '',
      vis('type')     ? '<th>Type</th>'     : '',
      vis('year')     ? '<th>Year</th>'     : '',
      vis('progress') ? '<th>Progress</th>' : '',
      vis('tags')     ? '<th>Tags</th>'     : '',
      customHeaders,
      '<th></th>',
      addPropColumnHeader('goal'),
    ].join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
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
        const vis = (key) => entityPropVisible('goal', key);
        return `<div class="kanban-card goal-kanban-card" data-goal-id="${g.id}" style="cursor:grab">
          <div class="kanban-card-title">${g.title}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
            ${vis('status') && groupBy !== 'status' ? statusBadge(g.status) : ''}
            ${vis('type') && groupBy !== 'type' && g.type ? `<span>${g.type}</span>` : ''}
            ${vis('year') && groupBy !== 'year' && g.year ? `<span>${g.year}</span>` : ''}
          </div>
          ${vis('progress') ? `<div style="margin-top:8px">
            <div class="progress-track" style="height:4px"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${pct}% · ${prog.done||0}/${prog.total||0}</div>
          </div>` : ''}
          ${renderCustomPropChips('goal', g.id, 'kanban')}
        </div>`;
      }).join('');
      const label = colKey.replace(/_/g,' ');
      return `<div class="kanban-col goal-kanban-col" data-col="${colKey}">
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

  function bindGoalKanban() {
    const board = document.querySelector('#goal-list .kanban-board');
    if (!board) return;
    const groupBy = goalsKanbanGroupBy;
    const field = groupBy === 'type' ? 'type' : 'status';
    bindKanbanDrag(board, '.goal-kanban-card[data-goal-id]', 'goalId', async (goalId, colKey) => {
      await api('PATCH', `/api/goals/${goalId}`, { [field]: colKey });
      const g = goals.find(x => String(x.id) === String(goalId));
      if (g) g[field] = colKey;
      render();
    });
  }

  function bindGoalEvents() {
    bindCtxHandles();
    document.querySelectorAll('.goal-slideover-card').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.goal-del-btn, .goal-export-btn, .ctx-handle')) return;
        if (e.target.closest('.card-title')) {
          renderView('goal-detail', el.dataset.goalId);
          return;
        }
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        if (g) showGoalSlideover(g, render);
      };
    });
    document.querySelectorAll('.goal-nav-link').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        renderView('goal-detail', el.dataset.goalId);
      };
    });
    document.querySelectorAll('.goal-list-row').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.goal-export-btn, .ctx-handle')) return;
        if (e.target.closest('.goal-list-title')) {
          renderView('goal-detail', el.dataset.goalId);
          return;
        }
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        if (g) showGoalSlideover(g, render);
      };
    });
    document.querySelectorAll('.goal-export-btn').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const g = goals.find(x => String(x.id) === el.dataset.goalId);
        showJSONModal(`/api/export/goal/${el.dataset.goalId}`, `goal-${g?.title||el.dataset.goalId}.json`);
      };
    });
  }
}

/* ─── Notes View ─────────────────────────────────────────────────────── */
async function renderNotes() {
  let notes = [], _noteProjects = [], _noteGoals = [];
  let apiError = null;
  try {
    [notes, _noteProjects, _noteGoals] = await Promise.all([
      api('GET', '/api/notes'),
      api('GET', '/api/projects').catch(() => []),
      api('GET', '/api/goals').catch(() => []),
    ]);
  } catch(e) { apiError = e.message || String(e); }

  if (apiError) {
    document.getElementById('main-content').innerHTML = `<div class="view">
      <div class="api-error-banner">⚠ Cannot reach raibis server. Restart: <code>cd raibis-go && go run ./cmd/server/main.go</code><br><small style="color:var(--text-muted)">${apiError}</small></div>
    </div>`;
    return;
  }

  const noteViews = getEntityViews('note');
  const noteActiveId = getActiveTabId('note');
  let activeNoteView = noteViews.find(v => v.id === noteActiveId) || noteViews[0];
  notesViewMode = activeNoteView.viewType;

  const noteEyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const notePropVisHtml = `<div class="prop-vis-wrap" id="note-prop-vis-wrap" style="margin-right:4px"><button class="btn btn-sm btn-ghost" id="note-prop-vis-btn" title="Property visibility">${noteEyeSvg}</button></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header"><h1 class="view-title">${viewIconHtml('notes')}${viewDisplayName('notes','Notes')}</h1></div>
    ${buildViewTabBar('note', noteViews, activeNoteView.id).replace('id="new-note-btn"', 'id="new-note-btn" style="display:none"')}
    <div id="notes-list"></div>
  </div>`;

  const noteToolbarRight = document.querySelector('#note-tab-bar .view-toolbar-right');
  if (noteToolbarRight) {
    const newBtn = noteToolbarRight.querySelector('#new-note-btn');
    if (newBtn) { newBtn.style.display = ''; newBtn.textContent = '+ New Note'; noteToolbarRight.insertBefore(document.createRange().createContextualFragment(notePropVisHtml), newBtn); }
  }

  const notePropVisBtn = document.getElementById('note-prop-vis-btn');
  const notePropVisWrap = document.getElementById('note-prop-vis-wrap');
  if (notePropVisBtn && notePropVisWrap) {
    notePropVisBtn.onclick = (e) => {
      e.stopPropagation();
      bindPropVisPanel(notePropVisWrap, [...(ENTITY_ALL_PROPS.note||[]), ...getCustomPropDefs('note').map(d => ({ key: d.key, label: d.label }))], () => getEntityVisProps('note'), (keys) => setEntityVisProps('note', keys), render);
    };
  }

  document.getElementById('new-note-btn').onclick = () => showNoteModal(null, () => renderNotes());
  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'notes', 'Notes');

  bindViewTabBar('note', (newActiveId) => {
    setActiveTabId('note', newActiveId);
    notesViewMode = (getEntityViews('note').find(v => v.id === newActiveId) || {}).viewType || 'cards';
    localStorage.setItem('notesViewMode', notesViewMode);
    renderNotes();
  }, () => renderNotes());

  bindFilterSortChips('note', activeNoteView, (updatedView) => {
    const vs = getEntityViews('note');
    const idx = vs.findIndex(v => v.id === updatedView.id);
    if (idx >= 0) vs[idx] = updatedView;
    saveEntityViews('note', vs);
    activeNoteView = updatedView;
    render();
  });

  function getFiltered() {
    return applyViewFiltersAndSorts(notes, activeNoteView, {
      title: n => n.title || '',
      note_date: n => n.note_date || '',
      category_name: n => n.category_name || '',
      _text: n => (n.title || '') + ' ' + (n.body || ''),
    });
  }

  function buildNoteListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    const vis = (key) => entityPropVisible('note', key);
    return `<div class="entity-list-view">${list.map(n => {
      return `<div class="entity-list-row note-item" data-note-id="${n.id}">
        <span class="ctx-handle" data-entity="note" data-id="${n.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
        <span class="list-icon-slot" data-icon-entity="note" data-icon-id="${n.id}" data-icon-size="16" style="display:none;flex-shrink:0"></span>
        <span class="entity-list-title">${n.title || 'Untitled'}<span class="comment-badge" data-comment-for="${n.id}" data-comment-entity="note" style="display:none"></span></span>
        ${vis('date') && fmtDate(n.note_date) ? `<span class="entity-list-meta">${fmtDate(n.note_date)}</span>` : ''}
        ${vis('project') ? (() => { const v = renderMultiRelationValue('note', n.id, 'project', (_noteProjects.find(p => String(p.id) === String(n.project_id))?.title)); return v ? `<span class="entity-list-meta">${v}</span>` : ''; })() : ''}
        ${vis('goal') ? (() => { const v = renderMultiRelationValue('note', n.id, 'goal', (_noteGoals.find(g => String(g.id) === String(n.goal_id))?.title)); return v ? `<span class="entity-list-meta">${v}</span>` : ''; })() : ''}
        ${vis('category') && n.category_name ? `<span class="entity-list-meta">${n.category_name}</span>` : ''}
        ${vis('tags') ? (n.tags || []).map(t => tagHtml(t)).join('') : ''}
        ${renderCustomPropChips('note', n.id, 'list')}
      </div>`;
    }).join('')}</div>`;
  }

  function buildNoteKanbanView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    const vis = (key) => entityPropVisible('note', key);
    const categories = [...new Set(list.map(n => n.category_name || 'Uncategorized'))].sort();
    const grouped = {};
    categories.forEach(c => { grouped[c] = []; });
    list.forEach(n => { (grouped[n.category_name || 'Uncategorized'] ||= []).push(n); });
    const colsHtml = categories.map(cat => {
      const items = grouped[cat] || [];
      const cards = items.map(n => {
        const tagChips = vis('tags') ? (n.tags || []).map(t => tagHtml(t)).join('') : '';
        return `<div class="kanban-card note-card" data-note-id="${n.id}" style="cursor:pointer">
          <div class="kanban-card-title">${n.title || 'Untitled'}<span class="comment-badge" data-comment-for="${n.id}" data-comment-entity="note" style="display:none"></span></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
            ${vis('date') && n.note_date ? `<span>${fmtDate(n.note_date)}</span>` : ''}
            ${tagChips}
          </div>
          ${renderCustomPropChips('note', n.id, 'kanban')}
        </div>`;
      }).join('');
      return `<div class="kanban-col" data-col="${cat}">
        <div class="kanban-col-header"><span>${cat}</span><span class="kanban-count">${items.length}</span></div>
        <div class="kanban-col-body">${cards || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No notes</div>'}</div>
      </div>`;
    }).join('');
    const boardStyle = `display:grid;grid-template-columns:repeat(${categories.length},minmax(240px,1fr));gap:var(--space-4);align-items:start;padding-bottom:16px`;
    return `<div style="overflow-x:auto;width:100%"><div class="kanban-board" style="${boardStyle}">${colsHtml}</div></div>`;
  }

  function render() {
    const list = getFiltered();
    let html;
    if (notesViewMode === 'table') html = buildNoteTable(list);
    else if (notesViewMode === 'list') html = buildNoteListView(list);
    else if (notesViewMode === 'kanban') html = buildNoteKanbanView(list);
    else html = list.length
      ? `<div style="display:grid;gap:12px">${list.map(buildNoteCard).join('')}</div>`
      : `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    document.getElementById('notes-list').innerHTML = html;
    bindNoteEvents();
    if (notesViewMode === 'table') { bindAddPropBtn('note', render); bindCustomPropCells(); }
    injectListIcons('note', list.map(n => n.id));
    injectCommentBadges('note', list.map(n => n.id));
  }
  render();
  _viewPropDefsCallback = (entity) => { if (entity === 'note') render(); };

  function buildNoteCard(n) {
    const vis = (key) => entityPropVisible('note', key);
    const tagChips = vis('tags') ? (n.tags || []).map(t => tagHtml(t)).join('') : '';
    return `<div class="note-card" data-note-id="${n.id}">
      <div class="flex-between gap-8">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          <span class="ctx-handle" data-entity="note" data-id="${n.id}" title="Actions">⠿</span>
          <div class="note-title"><span class="list-icon-slot" data-icon-entity="note" data-icon-id="${n.id}" data-icon-size="18" style="display:none;margin-right:5px;vertical-align:middle;font-size:18px"></span>${n.title || 'Untitled'}<span class="comment-badge" data-comment-for="${n.id}" data-comment-entity="note" style="display:none"></span></div>
        </div>
        <div onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost note-json-btn" data-note-id="${n.id}">Show JSON</button>
        </div>
      </div>
      <div class="note-body-preview">${n.body || ''}</div>
      <div class="note-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
        ${vis('date') && fmtDate(n.note_date) ? `<span>${fmtDate(n.note_date)}</span>` : ''}
        ${vis('category') && n.category_name ? `<span>· ${n.category_name}</span>` : ''}
        ${vis('project') ? (() => { const v = renderMultiRelationValue('note', n.id, 'project', (_noteProjects.find(p => String(p.id) === String(n.project_id))?.title)); return v ? `<span class="entity-list-meta">${v}</span>` : ''; })() : ''}
        ${vis('goal') ? (() => { const v = renderMultiRelationValue('note', n.id, 'goal', (_noteGoals.find(g => String(g.id) === String(n.goal_id))?.title)); return v ? `<span class="entity-list-meta">${v}</span>` : ''; })() : ''}
        ${tagChips}
      </div>
      ${renderCustomPropChips('note', n.id, 'cards')}
    </div>`;
  }

  function buildNoteTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">No notes found</div></div>`;
    const vis = (key) => entityPropVisible('note', key);
    const rows = list.map(n => {
      const customCols = getCustomPropDefs('note').filter(d => entityPropVisible('note', d.key)).map(def => customPropCell('note', n.id, def)).join('');
      return `<tr class="note-item" data-note-id="${n.id}" style="cursor:pointer">
        <td class="ctx-handle-cell"><span class="ctx-handle" data-entity="note" data-id="${n.id}" title="Actions">⠿</span></td>
        <td><span class="list-icon-slot" data-icon-entity="note" data-icon-id="${n.id}" data-icon-size="16" style="display:none;margin-right:5px;vertical-align:middle;font-size:16px"></span>${n.title || 'Untitled'}<span class="comment-badge" data-comment-for="${n.id}" data-comment-entity="note" style="display:none"></span></td>
        ${vis('date')     ? `<td>${fmtDate(n.note_date) || '—'}</td>` : ''}
        ${vis('project')  ? `<td>${renderMultiRelationValue('note', n.id, 'project', (_noteProjects.find(p => String(p.id) === String(n.project_id))?.title)) || '—'}</td>` : ''}
        ${vis('goal')     ? `<td>${renderMultiRelationValue('note', n.id, 'goal', (_noteGoals.find(g => String(g.id) === String(n.goal_id))?.title)) || '—'}</td>` : ''}
        ${vis('category') ? `<td>${n.category_name || '—'}</td>` : ''}
        ${vis('tags')     ? `<td>${(n.tags||[]).map(t=>tagHtml(t)).join('')}</td>` : ''}
        ${customCols}
        <td onclick="event.stopPropagation()"></td>
      </tr>`;
    }).join('');
    const customHeaders = getCustomPropDefs('note').filter(d => entityPropVisible('note', d.key)).map(d => `<th>${d.label}</th>`).join('');
    const headers = [
      '<th class="ctx-handle-th"></th>',
      '<th>Title</th>',
      vis('date')     ? '<th>Date</th>'     : '',
      vis('project')  ? '<th>Projects</th>' : '',
      vis('goal')     ? '<th>Goals</th>'    : '',
      vis('category') ? '<th>Category</th>' : '',
      vis('tags')     ? '<th>Tags</th>'     : '',
      customHeaders,
      '<th></th>',
      addPropColumnHeader('note'),
    ].join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  function bindNoteEvents() {
    bindCtxHandles();
    document.querySelectorAll('.note-card, .note-item').forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest('.ctx-handle, .note-json-btn')) return;
        const n = notes.find(x => String(x.id) === el.dataset.noteId);
        if (n) showNoteModal(n, () => renderNotes());
      };
    });
    document.querySelectorAll('.note-json-btn').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const n = notes.find(x => String(x.id) === el.dataset.noteId);
        showJSONModal(`/api/export/note/${el.dataset.noteId}`, `note-${n?.title||el.dataset.noteId}.json`);
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
    const vis = (key) => entityPropVisible('sprint', key);
    const nextStatus = s.status === 'planned' ? 'active' : s.status === 'active' ? 'completed' : null;
    const nextLabel = s.status === 'planned' ? 'Start' : s.status === 'active' ? 'Complete' : null;
    const prevStatus = s.status === 'active' ? 'planned' : s.status === 'completed' ? 'active' : null;
    const prevLabel = s.status === 'active' ? '↩ Planned' : s.status === 'completed' ? '↩ Active' : null;
    return `<div class="card" data-sprint-id="${s.id}" style="cursor:pointer">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          <span class="ctx-handle" data-entity="sprint" data-id="${s.id}" title="Actions">⠿</span>
          <span class="card-title sprint-detail-link" data-sprint-id="${s.id}" style="cursor:pointer;color:var(--accent)"><span class="list-icon-slot" data-icon-entity="sprint" data-icon-id="${s.id}" data-icon-size="20" style="display:none;margin-right:6px;vertical-align:middle;font-size:20px"></span>${s.title}<span class="comment-badge" data-comment-for="${s.id}" data-comment-entity="sprint" style="display:none"></span></span>
        </div>
        <div class="flex gap-8">
          ${prevStatus ? `<button class="btn btn-sm btn-ghost sprint-prev-status-btn" data-sprint-id="${s.id}" data-prev="${prevStatus}">${prevLabel}</button>` : ''}
          ${nextStatus ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="${nextStatus}">${nextLabel}</button>` : ''}
          <button class="btn btn-sm btn-ghost sprint-edit-btn" data-sprint-id="${s.id}">Edit</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${vis('status') ? statusBadge(s.status) : ''}
        ${vis('project') && s.project_title ? `<span class="badge badge-todo">${s.project_title}</span>` : ''}
      </div>
      ${vis('dates') ? `<div class="card-meta">${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</div>` : ''}
      ${vis('progress') ? `<div class="progress-wrap">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done || 0}/${prog.total || 0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>` : ''}
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
      ${(() => {
        const customVals = getCustomPropValues('sprint', s.id);
        return getCustomPropDefs('sprint').filter(d => entityPropVisible('sprint', d.key)).map(d => {
          const v = customVals[d.key] || '';
          if (!v) return '';
          if (d.type === 'multi_select') {
            const arr = (() => { try { const a = JSON.parse(v); return Array.isArray(a) ? a : (v ? [v] : []); } catch { return v ? [v] : []; } })();
            const oc = d.optionColors || {};
            if (!arr.length) return '';
            return `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${arr.map(x => oc[x] ? `<span class="multi-chip color-${oc[x]}" style="font-size:11px">${escHtml(x)}</span>` : `<span class="multi-chip" style="font-size:11px">${escHtml(x)}</span>`).join('')}</div>`;
          }
          if (d.type === 'select' || d.type === 'status') {
            const oc = d.optionColors || {};
            return `<div style="margin-top:4px">${oc[v] ? `<span class="multi-chip color-${oc[v]}" style="font-size:11px">${escHtml(v)}</span>` : `<span class="entity-list-meta">${escHtml(d.label)}: ${escHtml(v)}</span>`}</div>`;
          }
          return `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escHtml(d.label)}: ${escHtml(d.type === 'date' ? (fmtDate(v)||v) : String(v))}</div>`;
        }).filter(Boolean).join('');
      })()}
    </div>`;
  }

  function buildSprintTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`;
    const vis = (key) => entityPropVisible('sprint', key);
    const rows = list.map(s => {
      const prog = s.progress || {};
      const pct = prog.pct || 0;
      const customCols = getCustomPropDefs('sprint').filter(d => entityPropVisible('sprint', d.key)).map(def => customPropCell('sprint', s.id, def)).join('');
      return `<tr class="sprint-row" data-sprint-id="${s.id}" style="cursor:pointer">
        <td class="ctx-handle-cell"><span class="ctx-handle" data-entity="sprint" data-id="${s.id}" title="Actions">⠿</span></td>
        <td><span class="sprint-detail-link" data-sprint-id="${s.id}" style="color:var(--accent);cursor:pointer">${s.title}</span><span class="comment-badge" data-comment-for="${s.id}" data-comment-entity="sprint" style="display:none"></span></td>
        ${vis('status')   ? `<td>${statusBadge(s.status)}</td>` : ''}
        ${vis('project')  ? `<td>${s.project_title || '—'}</td>` : ''}
        ${vis('dates')    ? `<td>${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</td>` : ''}
        ${vis('progress') ? `<td>${pct}%</td>` : ''}
        ${customCols}
        <td>
          ${s.status === 'active' ? `<button class="btn btn-sm btn-ghost sprint-prev-status-btn" data-sprint-id="${s.id}" data-prev="planned">↩ Planned</button>` : ''}
          ${s.status === 'completed' ? `<button class="btn btn-sm btn-ghost sprint-prev-status-btn" data-sprint-id="${s.id}" data-prev="active">↩ Active</button>` : ''}
          ${s.status === 'planned' ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="active">Start</button>` : ''}
          ${s.status === 'active' ? `<button class="btn btn-sm btn-ghost sprint-status-btn" data-sprint-id="${s.id}" data-next="completed">Complete</button>` : ''}
          <button class="btn btn-sm btn-ghost sprint-edit-btn" data-sprint-id="${s.id}">Edit</button>
        </td>
      </tr>`;
    }).join('');
    const customHeaders = getCustomPropDefs('sprint').filter(d => entityPropVisible('sprint', d.key)).map(d => `<th>${d.label}</th>`).join('');
    const headers = [
      '<th class="ctx-handle-th"></th>',
      '<th>Title</th>',
      vis('status')   ? '<th>Status</th>'   : '',
      vis('project')  ? '<th>Project</th>'  : '',
      vis('dates')    ? '<th>Dates</th>'    : '',
      vis('progress') ? '<th>Progress</th>' : '',
      customHeaders,
      '<th></th>',
      addPropColumnHeader('sprint'),
    ].join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  const sprintViews = getEntityViews('sprint');
  const sprintActiveId = getActiveTabId('sprint');
  let activeSprintView = sprintViews.find(v => v.id === sprintActiveId) || sprintViews[0];
  sprintsViewMode = activeSprintView.viewType;

  const sprintEyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const sprintPropVisHtml = `<div class="prop-vis-wrap" id="sprint-prop-vis-wrap" style="margin-right:4px"><button class="btn btn-sm btn-ghost" id="sprint-prop-vis-btn" title="Property visibility">${sprintEyeSvg}</button></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header"><h1 class="view-title">${viewIconHtml('sprints')}${viewDisplayName('sprints','Sprints')}</h1></div>
    ${buildViewTabBar('sprint', sprintViews, activeSprintView.id).replace('id="new-sprint-btn"', 'id="new-sprint-btn" style="display:none"')}
    <div id="sprints-list"></div>
  </div>`;

  const sprintToolbarRight = document.querySelector('#sprint-tab-bar .view-toolbar-right');
  if (sprintToolbarRight) {
    const newBtn = sprintToolbarRight.querySelector('#new-sprint-btn');
    if (newBtn) { newBtn.style.display = ''; newBtn.textContent = '+ New Sprint'; sprintToolbarRight.insertBefore(document.createRange().createContextualFragment(sprintPropVisHtml), newBtn); }
  }

  const sprintPropVisBtn = document.getElementById('sprint-prop-vis-btn');
  const sprintPropVisWrap = document.getElementById('sprint-prop-vis-wrap');
  if (sprintPropVisBtn && sprintPropVisWrap) {
    sprintPropVisBtn.onclick = (e) => {
      e.stopPropagation();
      bindPropVisPanel(sprintPropVisWrap, [...(ENTITY_ALL_PROPS.sprint||[]), ...getCustomPropDefs('sprint').map(d => ({ key: d.key, label: d.label }))], () => getEntityVisProps('sprint'), (keys) => setEntityVisProps('sprint', keys), render);
    };
  }

  document.getElementById('new-sprint-btn').onclick = () => showSprintModal(projects);
  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'sprints', 'Sprints');

  bindViewTabBar('sprint', (newActiveId) => {
    setActiveTabId('sprint', newActiveId);
    sprintsViewMode = (getEntityViews('sprint').find(v => v.id === newActiveId) || {}).viewType || 'cards';
    localStorage.setItem('sprintsViewMode', sprintsViewMode);
    renderSprints();
  }, () => renderSprints());

  bindFilterSortChips('sprint', activeSprintView, (updatedView) => {
    const vs = getEntityViews('sprint');
    const idx = vs.findIndex(v => v.id === updatedView.id);
    if (idx >= 0) vs[idx] = updatedView;
    saveEntityViews('sprint', vs);
    activeSprintView = updatedView;
    render();
  });

  function getFiltered() {
    return applyViewFiltersAndSorts(sprints, activeSprintView, {
      title: s => s.title,
      status: s => s.status,
      project_id: s => String(s.project_id || ''),
      start_date: s => s.start_date || '',
      _text: s => s.title + ' ' + (s.project_title || ''),
    });
  }

  function buildSprintListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`;
    const vis = (key) => entityPropVisible('sprint', key);
    return `<div class="entity-list-view">${list.map(s => {
      const prog = s.progress || {};
      const pct = prog.pct || 0;
      return `<div class="entity-list-row sprint-list-row" data-sprint-id="${s.id}">
        <span class="ctx-handle" data-entity="sprint" data-id="${s.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
        <span class="list-icon-slot" data-icon-entity="sprint" data-icon-id="${s.id}" data-icon-size="16" style="display:none;flex-shrink:0"></span>
        <span class="entity-list-title sprint-detail-link" data-sprint-id="${s.id}" style="cursor:pointer;color:var(--accent)">${s.title}<span class="comment-badge" data-comment-for="${s.id}" data-comment-entity="sprint" style="display:none"></span></span>
        ${vis('status') ? statusBadge(s.status) : ''}
        ${vis('project') && s.project_title ? `<span class="entity-list-meta">${s.project_title}</span>` : ''}
        ${vis('dates') ? `<span class="entity-list-meta">${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}</span>` : ''}
        ${vis('progress') && prog.total > 0 ? `<span class="entity-list-progress"><span class="entity-list-progress-bar" style="width:${pct}%"></span></span><span class="entity-list-pct">${pct}%</span>` : ''}
        ${vis('points') && s.story_points ? `<span class="entity-list-meta">${s.story_points} pts</span>` : ''}
        ${vis('tags') ? (s.tags || []).map(t => tagHtml(t)).join('') : ''}
      </div>`;
    }).join('')}</div>`;
  }

  function render() {
    const list = getFiltered();
    let html;
    if (sprintsViewMode === 'table') html = buildSprintTable(list);
    else if (sprintsViewMode === 'list') html = buildSprintListView(list);
    else html = list.map(buildSprintCard).join('') || `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-text">No sprints found</div></div>`;
    document.getElementById('sprints-list').innerHTML = html;
    bindSprintEvents();
    injectListIcons('sprint', list.map(s => s.id));
    injectCommentBadges('sprint', list.map(s => s.id));
    if (sprintsViewMode === 'table') { bindAddPropBtn('sprint', render); bindCustomPropCells(); }
  }
  render();
  _viewPropDefsCallback = (entity) => { if (entity === 'sprint') render(); };

  function bindSprintEvents() {
    bindCtxHandles();
    document.querySelectorAll('.sprint-detail-link').forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); renderView('sprint-detail', el.dataset.sprintId); };
    });
    // Whole card click → sideview (ignore title and buttons)
    document.querySelectorAll('.card[data-sprint-id]').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('button') || e.target.closest('.ctx-handle') || e.target.closest('.sprint-detail-link')) return;
        showSprintSlideover(card.dataset.sprintId, render);
      };
    });
    // Table row click → sideview (ignore title and buttons)
    document.querySelectorAll('tr.sprint-row[data-sprint-id]').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('button') || e.target.closest('.ctx-handle') || e.target.closest('.sprint-detail-link')) return;
        showSprintSlideover(row.dataset.sprintId, render);
      };
    });
    // List row click → sideview (title click handled by sprint-detail-link)
    document.querySelectorAll('.sprint-list-row[data-sprint-id]').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('button') || e.target.closest('.ctx-handle') || e.target.closest('.sprint-detail-link')) return;
        showSprintSlideover(row.dataset.sprintId, render);
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
      el.onclick = (e) => {
        e.stopPropagation();
        const prevStatus = el.dataset.prev;
        showConfirmModal(`Revert sprint to "${prevStatus}"?`, async () => {
          await api('PATCH', `/api/sprints/${el.dataset.sprintId}`, { status: prevStatus });
          renderSprints();
        });
      };
    });
    document.querySelectorAll('.sprint-del-btn').forEach(el => {
      el.onclick = () => {
        showConfirmModal('Delete this sprint?', async () => {
          await api('DELETE', `/api/sprints/${el.dataset.sprintId}`);
          renderSprints();
        });
      };
    });
    // ctx-handle for sprint rows handled by global delegation
    document.querySelectorAll('.sprint-edit-btn').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        const s = sprints.find(x => String(x.id) === el.dataset.sprintId);
        if (s) showSprintSlideover(s.id, render);
      };
    });
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   WIDGET SYSTEM  — configurable, drag-and-drop layout per entity type
   Layout stored in localStorage; custom widgets via user-written JS snippets.
   ═══════════════════════════════════════════════════════════════════════════ */

const WIDGET_TYPE_META = {
  properties: { label: 'Properties', icon: '⚙' },
  tasks:      { label: 'Tasks',      icon: '✓' },
  notes:      { label: 'Notes',      icon: '📄' },
  resources:  { label: 'Resources',  icon: '🔗' },
  projects:   { label: 'Projects',   icon: '📁' },
  sprints:    { label: 'Sprints',    icon: '⚡' },
  editor:     { label: 'Content',    icon: '✏' },
  comments:   { label: 'Comments',   icon: '💬' },
  metrics:    { label: 'Metrics',    icon: '📊' },
  custom:     { label: 'Custom',     icon: '◈' },
};

const WIDGET_DEFAULT_LAYOUTS = {
  goal: [
    { id: 'w-projects',  type: 'projects',   label: 'Projects',     visible: true },
    { id: 'w-tasks',     type: 'tasks',      label: 'Direct Tasks', visible: true },
    { id: 'w-notes',     type: 'notes',      label: 'Notes',        visible: true },
    { id: 'w-resources', type: 'resources',  label: 'Resources',    visible: true },
    { id: 'w-properties',type: 'properties', label: 'Properties',   visible: true },
    { id: 'w-editor',    type: 'editor',     label: 'Content',      visible: true },
    { id: 'w-comments',  type: 'comments',   label: 'Comments',     visible: true },
  ],
  project: [
    { id: 'w-tasks',     type: 'tasks',      label: 'Tasks',        visible: true },
    { id: 'w-notes',     type: 'notes',      label: 'Notes',        visible: true },
    { id: 'w-resources', type: 'resources',  label: 'Resources',    visible: true },
    { id: 'w-properties',type: 'properties', label: 'Properties',   visible: true },
    { id: 'w-editor',    type: 'editor',     label: 'Content',      visible: true },
    { id: 'w-comments',  type: 'comments',   label: 'Comments',     visible: true },
  ],
  sprint: [
    { id: 'w-tasks',     type: 'tasks',      label: 'Sprint Tasks', visible: true },
    { id: 'w-properties',type: 'properties', label: 'Properties',   visible: true },
    { id: 'w-editor',    type: 'editor',     label: 'Content',      visible: true },
    { id: 'w-comments',  type: 'comments',   label: 'Comments',     visible: true },
  ],
};

function getWidgetLayout(entity) {
  try {
    const saved = localStorage.getItem(`widget_layout_${entity}`);
    if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length) return p; }
  } catch(e) {}
  if (WIDGET_DEFAULT_LAYOUTS[entity]) return JSON.parse(JSON.stringify(WIDGET_DEFAULT_LAYOUTS[entity]));
  if (entity.startsWith('custom_')) return [
    { id: 'w-properties', type: 'properties', label: 'Properties', visible: true },
    { id: 'w-editor',    type: 'editor',     label: 'Content',    visible: true },
    { id: 'w-comments',  type: 'comments',   label: 'Comments',   visible: true },
  ];
  return [];
}
function saveWidgetLayout(entity, layout) { localStorage.setItem(`widget_layout_${entity}`, JSON.stringify(layout)); }
function resetWidgetLayout(entity) { localStorage.removeItem(`widget_layout_${entity}`); }
function getCustomWidgetDefs() { try { return JSON.parse(localStorage.getItem('widget_custom_defs') || '[]'); } catch(e) { return []; } }
function saveCustomWidgetDefs(defs) { localStorage.setItem('widget_custom_defs', JSON.stringify(defs)); }

// ── Widget content builders ───────────────────────────────────────────────────

function _wTasksHtml(tasks) {
  if (!tasks || !tasks.length)
    return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks</div></div>';
  const taskIds = new Set(tasks.map(t => t.id));
  const top = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id));
  let html = '<ul class="task-list">';
  const walk = (list, depth) => {
    for (const t of list) {
      html += taskRowHtml(t, false, depth);
      if (expandedTasks.has(String(t.id))) {
        const kids = allTasksCache.filter(s => s.parent_task_id === t.id);
        if (kids.length) {
          walk(kids, depth + 1);
          html += `<li class="inline-subtask-input-row" data-parent-id="${t.id}" style="padding-left:${(depth+1)*20+8}px">
            <button class="btn btn-sm btn-ghost add-subtask-inline-btn" data-parent-id="${t.id}" style="font-size:11px">+ Subtask</button></li>`;
        }
      }
    }
  };
  walk(top, 0);
  return html + '</ul>';
}

function _wNotesHtml(notes) {
  return notes && notes.length
    ? notes.map(n => `<div class="note-card clickable-note" data-note-id="${n.id}" style="cursor:pointer">
        <div class="note-title">${escHtml(n.title || 'Untitled')}</div>
        <div class="note-body-preview">${escHtml(n.body || '')}</div>
        <div class="note-meta">${fmtDate(n.note_date) || ''}</div></div>`).join('')
    : '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No notes</div></div>';
}

function _wResourcesHtml(resources) {
  return resources && resources.length
    ? resources.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span class="badge badge-todo">${escHtml(r.resource_type || 'link')}</span>
        <span style="flex:1">${escHtml(r.title)}</span>
        ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">↗</a>` : ''}</div>`).join('')
    : '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No resources</div></div>';
}

function _wProjectsHtml(projects) {
  if (!projects || !projects.length)
    return '<div class="empty-state" style="padding:20px"><div class="empty-state-text">No projects</div></div>';
  return projects.map(p => {
    const prog = p.progress || {}, pct = prog.pct || 0;
    return `<div class="card detail-nav" data-proj-id="${p.id}" style="cursor:pointer;margin-bottom:8px">
      <div class="flex-between gap-8"><span class="card-title">${escHtml(p.title)}</span>${statusBadge(p.status)}</div>
      <div class="progress-wrap" style="margin-top:8px">
        <div class="progress-label"><span>${pct}%</span><span>${prog.done||0}/${prog.total||0}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div></div>`;
  }).join('');
}

function _wMetricsHtml(data) {
  if (!data || data.target == null) return '<div class="empty-state-text" style="padding:12px 0">No metrics configured</div>';
  const pct = data.target > 0 ? Math.round((data.current_value || 0) / data.target * 100) : 0;
  return `<div class="stats-row">
    ${data.start_value != null ? `<div class="stat-card"><div class="stat-value">${data.start_value}</div><div class="stat-label">Start</div></div>` : ''}
    ${data.current_value != null ? `<div class="stat-card"><div class="stat-value">${data.current_value}</div><div class="stat-label">Current</div></div>` : ''}
    ${data.target != null ? `<div class="stat-card"><div class="stat-value">${data.target}</div><div class="stat-label">Target</div></div>` : ''}
  </div>
  <div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
  <div style="text-align:right;font-size:12px;color:var(--text-muted);margin-top:4px">${pct}%</div>`;
}

function _wCustomHtml(entity, entityId, data, def) {
  if (!def || !def.code) return '<div class="empty-state-text" style="padding:12px 0">No code. Edit via Widgets panel.</div>';
  try {
    const fn = new Function('entity', 'entityId', 'data', '"use strict";\n' + def.code);
    return fn(entity, entityId, data) || '';
  } catch(e) {
    return `<div style="color:var(--danger);font-size:12px;padding:8px">Widget error: ${escHtml(e.message)}</div>`;
  }
}

// ── Main grid builder ─────────────────────────────────────────────────────────
// wData = { tasks, notes, resources, projects, propPanelHtml, entityData }

function buildWidgetGrid(entity, entityId, wData) {
  const layout = getWidgetLayout(entity);
  const customDefs = getCustomWidgetDefs();
  const visible = layout.filter(w => w.visible);
  if (!visible.length) return `<div class="empty-state" style="padding:40px"><div class="empty-state-text">No visible widgets. Use the Widgets ⚙ button to configure.</div></div>`;
  const dgh = `<span class="widget-drag-handle" title="Drag to reorder"><svg width="10" height="16" viewBox="0 0 10 16" fill="var(--text-muted)"><circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="3" cy="6" r="1.5"/><circle cx="7" cy="6" r="1.5"/><circle cx="3" cy="10" r="1.5"/><circle cx="7" cy="10" r="1.5"/><circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/></svg></span>`;
  return visible.map(w => {
    let body = '';
    switch(w.type) {
      case 'tasks':      body = _wTasksHtml(wData.tasks); break;
      case 'notes':      body = _wNotesHtml(wData.notes); break;
      case 'resources':  body = _wResourcesHtml(wData.resources); break;
      case 'projects':   body = _wProjectsHtml(wData.projects); break;
      case 'properties': body = wData.propPanelHtml || ''; break;
      case 'editor':     body = `<div id="editorjs-${entity}-${entityId}" class="rich-editor-host"></div>`; break;
      case 'comments':   body = buildCommentSection(entity, entityId); break;
      case 'metrics':    body = _wMetricsHtml(wData.entityData); break;
      case 'custom': {
        const def = customDefs.find(d => d.id === w.customDefId);
        body = _wCustomHtml(entity, entityId, wData.entityData, def); break;
      }
      default: body = `<div class="empty-state-text">Unknown widget: ${escHtml(w.type)}</div>`;
    }
    return `<div class="widget widget-item" data-widget-id="${escHtml(w.id)}" data-widget-type="${w.type}" style="margin-bottom:16px">
      <div class="widget-header">
        ${dgh}
        <span class="widget-title">${escHtml(w.label)}</span>
      </div>
      <div class="widget-body">${body}</div>
    </div>`;
  }).join('');
}

function initWidgetGrid(entity, entityId, container, onRerender) {
  if (!container) return;
  if (window.Sortable) {
    new Sortable(container, {
      handle: '.widget-drag-handle',
      animation: 150,
      onEnd: () => {
        const layout = getWidgetLayout(entity);
        const order = Array.from(container.querySelectorAll('.widget-item[data-widget-id]')).map(el => el.dataset.widgetId);
        const sorted = order.map(id => layout.find(w => w.id === id)).filter(Boolean);
        const rest = layout.filter(w => !sorted.find(s => s.id === w.id));
        saveWidgetLayout(entity, [...sorted, ...rest]);
      }
    });
  }
  const editorHost = container.querySelector('.rich-editor-host[id]');
  if (editorHost) initRichEditor(editorHost.id, entity, entityId, false);
  const cmt = container.querySelector('.comment-section');
  if (cmt) bindCommentSection(cmt);
}

// ── Widget manager panel ──────────────────────────────────────────────────────

function openWidgetManager(entity, anchorEl, onClose) {
  document.getElementById('widget-mgr')?.remove();
  const layout = getWidgetLayout(entity);
  const customDefs = getCustomWidgetDefs();
  const dgh = `<svg width="10" height="16" viewBox="0 0 10 16" fill="var(--text-muted)" style="cursor:grab;flex-shrink:0"><circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="3" cy="6" r="1.5"/><circle cx="7" cy="6" r="1.5"/><circle cx="3" cy="10" r="1.5"/><circle cx="7" cy="10" r="1.5"/><circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/></svg>`;

  const rowsHtml = layout.map(w => {
    const meta = WIDGET_TYPE_META[w.type] || { icon: '◉' };
    return `<div class="wm-row" data-wid="${escHtml(w.id)}">
      <span class="wm-row-handle">${dgh}</span>
      <span class="wm-row-icon">${meta.icon}</span>
      <span class="wm-row-label">${escHtml(w.label)}</span>
      <label class="wm-toggle-wrap" title="${w.visible ? 'Click to hide' : 'Click to show'}">
        <input type="checkbox" class="wm-vis-cb" ${w.visible ? 'checked' : ''} data-wid="${escHtml(w.id)}">
        <span class="wm-toggle-slider"></span>
      </label>
      ${w.type === 'custom' ? `<button class="btn btn-ghost btn-sm wm-del-btn" data-wid="${escHtml(w.id)}" style="color:var(--danger);padding:2px 5px;line-height:1;flex-shrink:0">✕</button>` : '<span style="width:24px;flex-shrink:0"></span>'}
    </div>`;
  }).join('');

  const existingTypes = new Set(layout.map(w => w.type));
  const addableOpts = Object.entries(WIDGET_TYPE_META)
    .filter(([t]) => t !== 'custom' && !existingTypes.has(t))
    .map(([t, m]) => `<option value="${t}">${m.icon} ${m.label}</option>`).join('');
  const addCustomOpts = customDefs
    .filter(d => !layout.find(w => w.type === 'custom' && w.customDefId === d.id))
    .map(d => `<option value="cx:${d.id}">◈ ${escHtml(d.name)}</option>`).join('');

  const panel = document.createElement('div');
  panel.id = 'widget-mgr';
  panel.className = 'widget-mgr';
  panel.innerHTML = `
    <div class="wm-hd"><span class="wm-title">Manage Widgets</span><button class="btn btn-ghost btn-sm" id="wm-x">✕</button></div>
    <div class="wm-body">
      <div class="wm-list" id="wm-list">${rowsHtml || '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No widgets configured</div>'}</div>
      <div class="wm-add">
        <select id="wm-sel" class="form-input" style="flex:1;font-size:12px;min-width:0"><option value="">Add widget…</option>${addableOpts}${addCustomOpts}</select>
        <button class="btn btn-sm btn-primary" id="wm-add">Add</button>
      </div>
      <button class="btn btn-sm btn-ghost" id="wm-new-cust" style="width:100%;margin-top:6px;font-size:12px">+ New Custom Widget</button>
      <button class="btn btn-sm btn-ghost" id="wm-reset" style="width:100%;margin-top:4px;font-size:11px;color:var(--text-muted)">Reset to defaults</button>
    </div>`;

  document.body.appendChild(panel);

  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  }

  if (window.Sortable) {
    new Sortable(document.getElementById('wm-list'), { handle: '.wm-row-handle', animation: 120 });
  }

  panel.querySelectorAll('.wm-vis-cb').forEach(cb => {
    cb.onchange = () => {
      const lay = getWidgetLayout(entity);
      const w = lay.find(x => x.id === cb.dataset.wid);
      if (w) { w.visible = cb.checked; saveWidgetLayout(entity, lay); }
    };
  });

  panel.querySelectorAll('.wm-del-btn').forEach(btn => {
    btn.onclick = () => {
      saveWidgetLayout(entity, getWidgetLayout(entity).filter(w => w.id !== btn.dataset.wid));
      btn.closest('.wm-row').remove();
    };
  });

  document.getElementById('wm-add').onclick = () => {
    const val = document.getElementById('wm-sel').value;
    if (!val) return;
    const lay = getWidgetLayout(entity);
    if (val.startsWith('cx:')) {
      const def = customDefs.find(d => d.id === val.slice(3));
      if (def) lay.push({ id: `w-cx-${Date.now()}`, type: 'custom', label: def.name, customDefId: def.id, visible: true });
    } else {
      const meta = WIDGET_TYPE_META[val];
      if (meta) lay.push({ id: `w-${val}-${Date.now()}`, type: val, label: meta.label, visible: true });
    }
    saveWidgetLayout(entity, lay);
    _closeWM(); openWidgetManager(entity, anchorEl, onClose);
  };

  document.getElementById('wm-new-cust').onclick = () => {
    _closeWM(); openCustomWidgetEditor(null, () => openWidgetManager(entity, anchorEl, onClose));
  };

  document.getElementById('wm-reset').onclick = () => {
    if (!confirm('Reset widget layout to defaults?')) return;
    resetWidgetLayout(entity); _closeWM(); openWidgetManager(entity, anchorEl, onClose);
  };

  const saveOrder = () => {
    const listEl = document.getElementById('wm-list');
    if (!listEl) return;
    const lay = getWidgetLayout(entity);
    const order = Array.from(listEl.querySelectorAll('.wm-row[data-wid]')).map(r => r.dataset.wid);
    const sorted = order.map(id => lay.find(w => w.id === id)).filter(Boolean);
    const rest = lay.filter(w => !sorted.find(s => s.id === w.id));
    saveWidgetLayout(entity, [...sorted, ...rest]);
  };

  document.getElementById('wm-x').onclick = () => { saveOrder(); _closeWM(); if (onClose) onClose(); };

  setTimeout(() => {
    const handler = (e) => {
      if (!document.getElementById('widget-mgr')?.contains(e.target)) {
        saveOrder(); _closeWM(); document.removeEventListener('click', handler); if (onClose) onClose();
      }
    };
    document.addEventListener('click', handler);
  }, 120);
}

function _closeWM() { document.getElementById('widget-mgr')?.remove(); }

// ── Custom widget code editor ─────────────────────────────────────────────────

function openCustomWidgetEditor(existingDef, onClose) {
  const isEdit = !!existingDef;
  const overlay = document.createElement('div');
  overlay.className = 'modal open';
  overlay.style.zIndex = '10500';
  const exCode = existingDef?.code || `// Signature: (entity, entityId, data) => htmlString
// data = full API response: data.title, data.tasks, data.notes, data.resources, ...
const tasks = data.tasks || [];
return \`<div style="padding:8px">
  <strong>\${data.title}</strong>
  <p style="color:var(--text-muted);margin-top:4px">\${tasks.length} task(s)</p>
</div>\`;`;
  overlay.innerHTML = `<div class="modal-box" style="max-width:740px;width:95vw">
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'Edit' : 'Create'} Custom Widget</span>
      <button class="modal-close-btn" id="cwe-x">✕</button>
    </div>
    <div class="modal-body">
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Name</label>
      <input id="cwe-name" class="form-input" placeholder="My Widget" value="${escHtml(existingDef?.name||'')}" style="margin-bottom:12px">
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">JavaScript (return HTML string)</label>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">See <code>WIDGETS.md</code> in the repo for full API docs.</div>
      <textarea id="cwe-code" class="form-input" rows="14" style="font-family:'Menlo','Monaco',monospace;font-size:12px">${escHtml(exCode)}</textarea>
    </div>
    <div class="modal-footer" style="justify-content:space-between">
      <div>${isEdit ? `<button class="btn btn-ghost" id="cwe-del" style="color:var(--danger)">Delete</button>` : '<span></span>'}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" id="cwe-cancel">Cancel</button>
        <button class="btn btn-primary" id="cwe-save">Save Widget</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); if (onClose) onClose(); };
  overlay.onclick = e => { if (e.target === overlay) close(); };
  document.getElementById('cwe-x').onclick = close;
  document.getElementById('cwe-cancel').onclick = close;
  document.getElementById('cwe-save').onclick = () => {
    const name = document.getElementById('cwe-name').value.trim();
    const code = document.getElementById('cwe-code').value;
    if (!name) { alert('Widget name is required'); return; }
    const defs = getCustomWidgetDefs();
    if (isEdit) {
      const idx = defs.findIndex(d => d.id === existingDef.id);
      if (idx >= 0) defs[idx] = { ...existingDef, name, code };
      else defs.push({ id: existingDef.id, name, code });
    } else {
      defs.push({ id: `cw-${Date.now()}`, name, code });
    }
    saveCustomWidgetDefs(defs); close();
  };
  if (isEdit) {
    document.getElementById('cwe-del')?.addEventListener('click', () => {
      if (!confirm('Delete this custom widget?')) return;
      saveCustomWidgetDefs(getCustomWidgetDefs().filter(d => d.id !== existingDef.id)); close();
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

  async function patchSprint(data) {
    try { await api('PATCH', `/api/sprints/${sprintId}`, data); } catch(e) { return; }
    renderSprintDetail(sprintId);
  }
  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  let sdLocalProjects = [];
  try { sdLocalProjects = await api('GET', '/api/projects'); } catch(e) {}
  const sdProjName = sdLocalProjects.find(p => String(p.id) === String(sprint.project_id))?.title || sprint.project_title || null;
  const allSprintDetailBuiltinDefs = [
    { key: 'status',  label: 'Status',    icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => statusBadge(sprint.status||'planned') },
    { key: 'dates',   label: 'Dates',     icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => { const dr = sprint.start_date && sprint.end_date ? `${fmtDate(sprint.start_date)} → ${fmtDate(sprint.end_date)}` : fmtDate(sprint.start_date||sprint.end_date)||''; return dr ? `<span>${dr}</span>` : ''; } },
    { key: 'project', label: 'Projects',  icon: pIco('<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'),
      renderValue: () => renderMultiRelationValue('sprint', sprintId, 'project', sdProjName) },
    { key: 'points',  label: 'Capacity (pts)', icon: pIco('<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>'),
      renderValue: () => sprint.story_points != null ? `<span>${sprint.story_points}</span>` : '' },
  ];
  await loadEntityCustomProps('sprint', sprintId);
  const sprintDetailPropPanel = buildInlinePropPanel('sprint', sprintId, allSprintDetailBuiltinDefs);
  const sprintDetailEditFns = {
    status:  (valEl) => { openValuePicker(valEl, ['planned','active','completed'].map(s => ({ value: s, label: s })), async (val) => { await patchSprint({ status: val }); }); },
    dates:   (valEl) => { openDateRangePickerGlobal(valEl, stripDate(sprint.start_date), stripDate(sprint.end_date), async (start, end) => { await patchSprint({ start_date: start||null, end_date: end||null }); }); },
    project: (valEl) => openMultiRelationPicker(valEl, 'sprint', sprintId, 'project', 'project', sdLocalProjects, sprint, patchSprint, 'project_id', () => renderSprintDetail(sprintId)),
    points:  (valEl) => {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.style.cssText = 'width:80px;border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:13px;background:var(--bg-card);color:var(--text)';
      inp.value = sprint.story_points || '';
      valEl.innerHTML = ''; valEl.appendChild(inp); inp.focus();
      inp.onblur = async () => { await patchSprint({ story_points: parseInt(inp.value) || 0 }); };
      inp.onkeydown = (ke) => { if (ke.key === 'Enter') inp.blur(); };
    },
  };

  const tasks = sprint.tasks || [];
  const prog = sprint.progress || {};
  const pct = prog.pct || 0;

  // Load all tasks so toggle reveals subtasks that don't carry sprint_id
  let allTasks = [];
  try { allTasks = await api('GET', '/api/tasks?all=1'); allTasksCache = allTasks; allTasksFull = allTasks; } catch(e) {}
  // Also include tasks linked to this sprint via the relations table (multi-sprint support)
  let relLinkedTaskIds = new Set();
  try {
    const rels = await api('GET', `/api/relations/sprint/${sprintId}`);
    (Array.isArray(rels) ? rels : []).filter(r => r.related_entity_type === 'task').forEach(r => relLinkedTaskIds.add(String(r.related_entity_id)));
  } catch(e) {}
  // Merge: tasks with sprint_id FK OR tasks linked via relations table
  const sprintTaskIds = new Set([...tasks.map(t => String(t.id)), ...relLinkedTaskIds]);
  allTasks.filter(t => relLinkedTaskIds.has(String(t.id)) && !tasks.some(st => st.id === t.id)).forEach(t => tasks.push(t));
  tasks.forEach(t => { t.sub_task_count = allTasksCache.filter(s => s.parent_task_id === t.id).length; });
  const unassigned = allTasks.filter(t => !t.parent_task_id && !sprintTaskIds.has(String(t.id)));

  function buildSprintTaskTree(taskList, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, true, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasksCache.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildSprintTaskTree(children, depth + 1);
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
    ? `<ul class="task-list">${buildSprintTaskTree(topLevel, 0)}</ul>`
    : `<div class="empty-state" style="padding:20px"><div class="empty-state-text">No tasks in this sprint yet</div></div>`; // top-level unassigned tasks only

  const nextStatus = sprint.status === 'planned' ? 'active' : sprint.status === 'active' ? 'completed' : null;
  const nextLabel = sprint.status === 'planned' ? 'Start Sprint' : sprint.status === 'active' ? 'Complete Sprint' : null;
  const prevStatus = sprint.status === 'active' ? 'planned' : sprint.status === 'completed' ? 'active' : null;
  const prevLabel = sprint.status === 'active' ? '↩ Revert to Planned' : sprint.status === 'completed' ? '↩ Revert to Active' : null;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="entity-view-cover" id="sprint-cover-row"></div>
    <div class="entity-view-action" id="sprint-action-row">
      <button class="entity-icon-add-btn" id="sprint-det-icon-btn">
        <span id="sprint-det-icon-display"></span>
        <span id="sprint-det-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
      </button>
    </div>
    <div class="view-header">
      <div>
        ${sprint.project_title ? `<div class="breadcrumb" style="margin-bottom:6px"><span class="bc-crumb bc-proj" style="cursor:pointer" data-proj-id="${sprint.project_id}">◆ ${sprint.project_title}</span></div>` : ''}
        <h1 class="view-title">${sprint.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(sprint.status)}
          ${sprint.start_date ? `<span class="badge badge-todo">${fmtDate(sprint.start_date)} → ${fmtDate(sprint.end_date)}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" id="sd-manage-btn">Widgets ⚙</button>
        <button class="btn btn-ghost" id="sd-back-btn">← Back</button>
        ${prevStatus ? `<button class="btn btn-ghost" id="sd-prev-status-btn" data-prev="${prevStatus}">${prevLabel}</button>` : ''}
        ${nextStatus ? `<button class="btn btn-ghost" id="sd-status-btn" data-next="${nextStatus}">${nextLabel}</button>` : ''}
        <button class="btn btn-ghost" id="sd-json-btn">Show JSON</button>
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
    <div id="sd-widget-grid" style="margin-top:12px">
      ${buildWidgetGrid('sprint', sprintId, { tasks, propPanelHtml: sprintDetailPropPanel, entityData: sprint })}
    </div>
  </div>`;

  document.getElementById('sd-manage-btn').onclick = (e) => openWidgetManager('sprint', e.currentTarget, () => renderSprintDetail(sprintId));
  document.getElementById('sd-back-btn').onclick = () => renderView('sprints');
  document.getElementById('sd-json-btn').onclick = () =>
    showJSONModal(`/api/export/sprint/${sprintId}`, `sprint-${sprint.title.replace(/\s+/g,'-')}.json`);
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
    const assignedTasks = allTasks.filter(t => (t.sprint_id && String(t.sprint_id) === String(sprintId)) || relLinkedTaskIds.has(String(t.id)));
    const unassignedTasks = allTasks.filter(t => !t.parent_task_id && !assignedTasks.some(a => a.id === t.id));
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
        // Set FK only if task has no sprint yet (first sprint), otherwise use relations table for multi-sprint
        const task = allTasks.find(t => t.id === taskId);
        if (!task?.sprint_id) {
          await api('PATCH', `/api/tasks/${taskId}`, { sprint_id: parseInt(sprintId) });
        } else {
          // Additional sprint: link via relations table only
          await api('POST', `/api/relations/sprint/${sprintId}`, { related_entity_type: 'task', related_entity_id: taskId }).catch(() => {});
        }
        if (task) await ensureEVBilateral('sprint', parseInt(sprintId), sprint.title || String(sprintId), 'task', taskId, task.title || String(taskId));
        renderSprintDetail(sprintId);
      };
    });
    document.querySelectorAll('.sd-unassign-btn').forEach(btn => {
      btn.onclick = async () => {
        const taskId = parseInt(btn.dataset.taskId);
        btn.disabled = true; btn.textContent = '…';
        // Clear FK if this is the FK-linked sprint
        const task = allTasks.find(t => t.id === taskId);
        if (task?.sprint_id && String(task.sprint_id) === String(sprintId)) {
          await api('PATCH', `/api/tasks/${taskId}`, { sprint_id: null });
        }
        // Also remove from relations table (no-op if not there)
        await api('DELETE', `/api/relations/sprint/${sprintId}/task/${taskId}`).catch(() => {});
        await removeEVBilateral('sprint', parseInt(sprintId), 'task', taskId);
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
  const sdwg = document.getElementById('sd-widget-grid');
  initWidgetGrid('sprint', sprintId, sdwg, () => renderSprintDetail(sprintId));
  bindInlinePropPanel('sprint', sprintId, sprintDetailEditFns, () => renderSprintDetail(sprintId));

  // Icon + cover for sprint individual view
  const spDetIconBtn = document.getElementById('sprint-det-icon-btn');
  const spDetIconDisplay = document.getElementById('sprint-det-icon-display');
  const spDetIconLabel = document.getElementById('sprint-det-icon-add-label');
  const spDetActionRow = document.getElementById('sprint-action-row');
  const setSpDetIcon = (icon) => {
    spDetIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 32) : '';
    spDetIconDisplay.dataset.icon = icon || '';
    spDetIconLabel.innerHTML = icon ? '' : ACT_ICONS.addIcon + 'Add icon';
    spDetActionRow?.classList.toggle('has-entity-icon', !!icon);
  };
  loadEntityIcon('sprint', sprintId).then(icon => setSpDetIcon(icon || ''));
  spDetIconBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = spDetIconDisplay.dataset.icon || '';
    showIconPicker(spDetIconBtn, 'sprint', sprintId, cur, (newIcon) => {
      setSpDetIcon(newIcon || '');
      saveEntityIcon('sprint', sprintId, newIcon || '').catch(() => setSpDetIcon(cur));
    });
  };
  initDetailViewCover('sprint', sprintId, 'sprint-cover-row', 'sprint-action-row');
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
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Helpers ──────────────────────────────────────────────────────────
  const HABIT_TYPE_COLORS = {
    learning:    { bg: 'var(--tag-blue-bg)',   text: 'var(--tag-blue-text)'   },
    fitness:     { bg: 'var(--tag-green-bg)',  text: 'var(--tag-green-text)'  },
    meditation:  { bg: 'var(--tag-purple-bg)', text: 'var(--tag-purple-text)' },
    general:     { bg: 'var(--tag-gray-bg)',   text: 'var(--color-text-secondary)' },
  };
  const HABIT_PALETTE = ['#378ADD','#6dcc8a','#a78bfa','#fb923c','#f472b6','#22d3ee','#d4a84b','#e07070'];
  const habitColors = {};
  habits.forEach((h, i) => { habitColors[h.id] = HABIT_PALETTE[i % HABIT_PALETTE.length]; });

  function habitTypeBadge(type) {
    const t = (type || 'general').toLowerCase();
    const c = HABIT_TYPE_COLORS[t] || HABIT_TYPE_COLORS.general;
    return `<span class="badge" style="background:${c.bg};color:${c.text}">${t}</span>`;
  }

  function refLink(h) {
    if (!h.reference_id) return '—';
    return `<span style="font-size:11px;color:var(--accent);font-family:var(--font-mono)">${h.reference_id}</span>`;
  }

  function streakBadge(h) {
    if (!h.streak) return '';
    return `<span class="habit-streak-badge" title="${h.streak}-day streak">🔥 ${h.streak}</span>`;
  }

  function checkinBtn(h) {
    const done = !!h.done_today;
    return `<button class="btn btn-sm habit-checkin-btn${done ? ' habit-checkin-done' : ''}" data-habit-id="${h.id}" data-done="${done}" title="${done ? 'Undo today\'s check-in' : 'Check in for today'}">${done ? '✓ Done' : '+ Today'}</button>`;
  }

  // ── Table view ───────────────────────────────────────────────────────
  function buildTableView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">○</div><div class="empty-state-text">No habits yet — add one to get started</div></div>`;
    const rows = list.map(h => `<tr>
      <td style="font-weight:500">${h.title}</td>
      <td>${habitTypeBadge(h.type)}</td>
      <td>${refLink(h)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${streakBadge(h)}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        ${checkinBtn(h)}
        <button class="btn btn-sm btn-ghost habit-edit-btn" data-habit-id="${h.id}">Edit</button>
        <button class="btn btn-sm btn-danger habit-del-btn" data-habit-id="${h.id}">Del</button>
      </td>
    </tr>`).join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr><th>Title</th><th>Type</th><th>Reference</th><th>Streak</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  // ── Cards view ───────────────────────────────────────────────────────
  function buildCardsView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">○</div><div class="empty-state-text">No habits yet — add one to get started</div></div>`;
    return `<div class="cc-grid">${list.map(h => `<div class="card habit-card" style="cursor:default">
      <div class="flex-between gap-8" style="margin-bottom:6px">
        <span class="card-title">${h.title}</span>
        <div class="flex gap-8" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-ghost habit-edit-btn" data-habit-id="${h.id}">Edit</button>
          <button class="btn btn-sm btn-danger habit-del-btn" data-habit-id="${h.id}">Del</button>
        </div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:8px">
        ${habitTypeBadge(h.type)}
        ${h.reference_id ? `<span class="badge" style="background:var(--tag-cyan-bg,#e0f7fa);color:var(--tag-cyan-text,#00838f);font-family:var(--font-mono)">ref: ${h.reference_id}</span>` : ''}
        ${streakBadge(h)}
      </div>
      <div class="flex-between" style="align-items:center">
        <span style="font-size:11px;color:var(--text-muted)">Since ${fmtDate(h.created_at) || '—'}</span>
        <span onclick="event.stopPropagation()">${checkinBtn(h)}</span>
      </div>
    </div>`).join('')}</div>`;
  }

  // ── Calendar heatmap view ─────────────────────────────────────────────
  // Shows 12 weeks of completion data per habit as GitHub-style squares.
  async function buildCalendarView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">○</div><div class="empty-state-text">No habits yet — add one to get started</div></div>`;

    // Fetch completions for all habits (last 12 weeks = 84 days)
    const fromDate = (() => {
      const d = new Date(); d.setDate(d.getDate() - 83); return d.toISOString().slice(0, 10);
    })();

    const completionSets = await Promise.all(list.map(async h => {
      try {
        const dates = await api('GET', `/api/habits/${h.id}/completions?from=${fromDate}&to=${todayStr}`);
        return new Set(dates);
      } catch(_) { return new Set(); }
    }));

    // Build date array for last 84 days, starting from the most recent Sunday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const gridEnd = new Date(today);
    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridStart.getDate() - 83 - dayOfWeek);

    const allDates = [];
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().slice(0, 10));
    }

    const weekLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthPositions = {};
    allDates.forEach((date, i) => {
      const col = Math.floor(i / 7);
      const m = date.slice(0, 7);
      if (!monthPositions[m]) monthPositions[m] = col;
    });

    const totalCols = Math.ceil(allDates.length / 7);

    function habitHeatmap(h, cSet) {
      const items = [];

      // Month labels (grid-row:1, grid-column: weekIndex+2)
      Object.entries(monthPositions).forEach(([ym, weekCol]) => {
        const [y, m] = ym.split('-');
        const label = new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'short' });
        items.push(`<div style="grid-column:${weekCol+2};grid-row:1;font-size:10px;color:var(--text-muted);white-space:nowrap">${label}</div>`);
      });

      // Day-of-week labels (grid-column:1, grid-row:2-8) — only odd rows to avoid crowding
      weekLabels.forEach((lbl, ri) => {
        if ([1,3,5].includes(ri)) {
          items.push(`<div style="grid-column:1;grid-row:${ri+2};font-size:9px;color:var(--text-muted);text-align:right;padding-right:4px;line-height:14px">${lbl}</div>`);
        }
      });

      // Cells: each date maps to (weekIndex+2, dayOfWeek+2)
      allDates.forEach((date, i) => {
        const weekCol = Math.floor(i / 7) + 2;
        const dayRow  = (i % 7) + 2;
        const done    = cSet.has(date);
        const isToday = date === todayStr;
        const color   = done ? habitColors[h.id] : 'var(--color-border)';
        const opacity = done ? '1' : '0.35';
        items.push(`<div class="habit-heat-cell${isToday ? ' today' : ''}" data-date="${date}" data-habit-id="${h.id}" data-done="${done}" style="grid-column:${weekCol};grid-row:${dayRow};background:${color};opacity:${opacity}" title="${date}${done ? ' ✓' : ''}"></div>`);
      });

      return `<div class="habit-heatmap-row">
        <div class="habit-heatmap-title">
          <span style="font-weight:600">${_esc(h.title)}</span>
          ${streakBadge(h)}
          <span onclick="event.stopPropagation()">${checkinBtn(h)}</span>
        </div>
        <div class="habit-heatmap-grid" style="grid-template-columns:26px repeat(${totalCols},14px);grid-template-rows:16px repeat(7,14px)">
          ${items.join('')}
        </div>
      </div>`;
    }

    const rows = list.map((h, i) => habitHeatmap(h, completionSets[i]));
    return `<div class="habit-heatmap-wrap">${rows.join('')}</div>`;
  }

  // ── Shell ────────────────────────────────────────────────────────────
  const toggle = viewToggleHtml(
    [{key:'table',label:'Table'},{key:'cards',label:'Cards'},{key:'calendar',label:'Heatmap'}],
    habitsViewMode
  );

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <div>
        <h1 class="view-title">${viewIconHtml('habits')}${viewDisplayName('habits','Habits')}</h1>
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
    { key: 'streak',     label: 'Streak'  },
    { key: 'created_at', label: 'Created' },
  ];

  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'habits', 'Habits');

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
      streak:     h => h.streak || 0,
      created_at: h => h.created_at || '',
      _text:      h => h.title + ' ' + (h.reference_id || '') + ' ' + (h.type || ''),
    });
  }

  async function render() {
    const list = getFiltered();
    const el   = document.getElementById('habit-list');
    if (!el) return;
    if (habitsViewMode === 'table')         el.innerHTML = buildTableView(list);
    else if (habitsViewMode === 'cards')    el.innerHTML = buildCardsView(list);
    else if (habitsViewMode === 'calendar') el.innerHTML = await buildCalendarView(list);
    bindHabitEvents();
  }

  document.getElementById('new-habit-btn').onclick = () => showHabitModal(null);

  bindViewToggle([], null, (mode) => {
    habitsViewMode = mode;
    localStorage.setItem('habitsViewMode', mode);
    renderHabits();
  });

  render();

  function bindHabitEvents() {
    document.querySelectorAll('.habit-checkin-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id   = btn.dataset.habitId;
        const done = btn.dataset.done === 'true';
        btn.disabled = true;
        try {
          const res = await api('POST', `/api/habits/${id}/checkin`, { done: !done });
          // Update in-memory habit
          const h = habits.find(x => String(x.id) === id);
          if (h) { h.done_today = res.done_today; h.streak = res.streak; }
          render();
        } catch(_) { btn.disabled = false; }
      };
    });
    document.querySelectorAll('.habit-heat-cell').forEach(cell => {
      cell.onclick = async (e) => {
        e.stopPropagation();
        const id   = cell.dataset.habitId;
        const date = cell.dataset.date;
        const done = cell.dataset.done === 'true';
        cell.style.opacity = '0.5';
        try {
          const res = await api('POST', `/api/habits/${id}/checkin`, { date, done: !done });
          const h = habits.find(x => String(x.id) === id);
          if (h) { h.done_today = res.done_today; h.streak = res.streak; }
          renderHabits();
        } catch(_) { cell.style.opacity = done ? '1' : '0.35'; }
      };
    });
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

  const resViews = getEntityViews('resource');
  const resActiveId = getActiveTabId('resource');
  let activeResView = resViews.find(v => v.id === resActiveId) || resViews[0];
  resourcesViewMode = activeResView.viewType;

  const resEyeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const resPropVisHtml = `<div class="prop-vis-wrap" id="res-prop-vis-wrap" style="margin-right:4px"><button class="btn btn-sm btn-ghost" id="res-prop-vis-btn" title="Property visibility">${resEyeSvg}</button></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header"><h1 class="view-title">${viewIconHtml('resources')}${viewDisplayName('resources','Resources')}</h1></div>
    ${buildViewTabBar('resource', resViews, activeResView.id).replace('id="new-resource-btn"', 'id="new-resource-btn" style="display:none"')}
    <div id="res-table"></div>
  </div>`;

  const resToolbarRight = document.querySelector('#resource-tab-bar .view-toolbar-right');
  if (resToolbarRight) {
    const newBtn = resToolbarRight.querySelector('#new-resource-btn');
    if (newBtn) { newBtn.style.display = ''; newBtn.textContent = '+ New Resource'; resToolbarRight.insertBefore(document.createRange().createContextualFragment(resPropVisHtml), newBtn); }
  }

  const resPropVisBtn = document.getElementById('res-prop-vis-btn');
  const resPropVisWrap = document.getElementById('res-prop-vis-wrap');
  if (resPropVisBtn && resPropVisWrap) {
    resPropVisBtn.onclick = (e) => {
      e.stopPropagation();
      bindPropVisPanel(resPropVisWrap, [...(ENTITY_ALL_PROPS.resource||[]), ...getCustomPropDefs('resource').map(d => ({ key: d.key, label: d.label }))], () => getEntityVisProps('resource'), (keys) => setEntityVisProps('resource', keys), render);
    };
  }

  document.getElementById('new-resource-btn').onclick = () => showResourceModal(null, () => renderResources());
  addBuiltinViewTitleRename(document.querySelector('#main-content .view-title'), 'resources', 'Resources');

  bindViewTabBar('resource', (newActiveId) => {
    setActiveTabId('resource', newActiveId);
    resourcesViewMode = (getEntityViews('resource').find(v => v.id === newActiveId) || {}).viewType || 'table';
    localStorage.setItem('resourcesViewMode', resourcesViewMode);
    renderResources();
  }, () => renderResources());

  bindFilterSortChips('resource', activeResView, (updatedView) => {
    const vs = getEntityViews('resource');
    const idx = vs.findIndex(v => v.id === updatedView.id);
    if (idx >= 0) vs[idx] = updatedView;
    saveEntityViews('resource', vs);
    activeResView = updatedView;
    render();
  });

  function getFiltered() {
    return applyViewFiltersAndSorts(resources, activeResView, {
      title: r => r.title,
      resource_type: r => r.resource_type || '',
      _text: r => r.title + ' ' + (r.url || '') + ' ' + (r.body || '') + ' ' + Object.values(getCustomPropValues('resource', r.id) || {}).filter(v => typeof v === 'string' || typeof v === 'number').join(' '),
    });
  }

  function buildResourceListView(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    const vis = (key) => entityPropVisible('resource', key);
    return `<div class="entity-list-view">${list.map(r => {
      return `<div class="entity-list-row res-row" data-res-id="${r.id}">
        <span class="ctx-handle" data-entity="resource" data-id="${r.id}" title="Actions" onclick="event.stopPropagation()">⠿</span>
        <span class="list-icon-slot" data-icon-entity="resource" data-icon-id="${r.id}" data-icon-size="16" style="display:none;flex-shrink:0"></span>
        <span class="entity-list-title">${r.title}<span class="comment-badge" data-comment-for="${r.id}" data-comment-entity="resource" style="display:none"></span></span>
        ${vis('type') && r.resource_type ? `<span class="entity-list-meta">${r.resource_type}</span>` : ''}
        ${vis('project') && r.project_title ? `<span class="entity-list-meta">→ ${r.project_title}</span>` : ''}
        ${vis('goal') && r.goal_title ? `<span class="entity-list-meta">→ ${r.goal_title}</span>` : ''}
        ${vis('url') && r.url ? `<span class="entity-list-meta" onclick="event.stopPropagation()"><a href="${r.url}" target="_blank" rel="noopener" style="color:var(--accent)">${r.url.length > 40 ? r.url.slice(0,40)+'…' : r.url}</a></span>` : ''}
        ${vis('tags') ? (r.tags || []).map(t => tagHtml(t)).join('') : ''}
        ${getCustomPropDefs('resource').filter(d => entityPropVisible('resource', d.key)).map(d => {
          const v = (getCustomPropValues('resource', r.id) || {})[d.key] || '';
          if (!v) return '';
          if (d.type === 'multi_select') {
            const arr = (() => { try { const a = JSON.parse(v); return Array.isArray(a) ? a : (v ? [v] : []); } catch { return v ? [v] : []; } })();
            const oc = d.optionColors || {};
            return arr.map(x => oc[x] ? `<span class="multi-chip color-${oc[x]}" style="font-size:11px">${escHtml(x)}</span>` : `<span class="multi-chip" style="font-size:11px">${escHtml(x)}</span>`).join('');
          }
          return `<span class="entity-list-meta">${escHtml(String(v))}</span>`;
        }).join('')}
      </div>`;
    }).join('')}</div>`;
  }

  function render() {
    const list = getFiltered();
    let html;
    if (resourcesViewMode === 'cards') html = buildCards(list);
    else if (resourcesViewMode === 'list') html = buildResourceListView(list);
    else html = buildTable(list);
    document.getElementById('res-table').innerHTML = html;
    bindResEvents();
    if (resourcesViewMode === 'table') { bindAddPropBtn('resource', render); bindCustomPropCells(); }
    injectListIcons('resource', list.map(r => r.id));
    injectCommentBadges('resource', list.map(r => r.id));
  }
  render();
  _viewPropDefsCallback = (entity) => { if (entity === 'resource') render(); };

  function buildTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    const vis = (key) => entityPropVisible('resource', key);
    const rows = list.map(r => {
      const rawUrl = r.url || '';
      const link = rawUrl
        ? `<a href="${rawUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${rawUrl.length > 40 ? rawUrl.slice(0,40) + '…' : rawUrl}</a>`
        : (r.body ? r.body.slice(0,60) + '…' : '—');
      const linked = r.goal_title || r.project_title || r.task_title || '—';
      const customCols = getCustomPropDefs('resource').filter(d => entityPropVisible('resource', d.key)).map(def => customPropCell('resource', r.id, def)).join('');
      return `<tr class="res-row" data-res-id="${r.id}" style="cursor:pointer">
        <td class="ctx-handle-cell"><span class="ctx-handle" data-entity="resource" data-id="${r.id}" title="Actions">⠿</span></td>
        <td><span class="list-icon-slot" data-icon-entity="resource" data-icon-id="${r.id}" data-icon-size="16" style="display:none;margin-right:5px;vertical-align:middle;font-size:16px"></span>${r.title}<span class="comment-badge" data-comment-for="${r.id}" data-comment-entity="resource" style="display:none"></span></td>
        ${vis('type')   ? `<td>${r.resource_type || '—'}</td>` : ''}
        ${vis('linked') ? `<td>${linked}</td>` : ''}
        ${vis('url')    ? `<td>${link}</td>` : ''}
        ${customCols}
        <td onclick="event.stopPropagation()"></td>
      </tr>`;
    }).join('');
    const customHeaders = getCustomPropDefs('resource').filter(d => entityPropVisible('resource', d.key)).map(d => `<th>${d.label}</th>`).join('');
    const headers = [
      '<th class="ctx-handle-th"></th>',
      '<th>Title</th>',
      vis('type')   ? '<th>Type</th>'           : '',
      vis('linked') ? '<th>Linked</th>'          : '',
      vis('url')    ? '<th>URL / Preview</th>'   : '',
      customHeaders,
      '<th></th>',
      addPropColumnHeader('resource'),
    ].join('');
    return `<div class="notion-table-wrap"><table class="notion-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">No resources yet</div></div>`;
    return `<div style="display:grid;gap:12px">${list.map(r => {
      const rawUrl = r.url || '';
      const linked = r.goal_title || r.project_title || r.task_title;
      const vis = (key) => entityPropVisible('resource', key);
      return `<div class="card res-row" data-res-id="${r.id}" style="cursor:pointer">
        <div class="flex-between gap-8" style="margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:6px;min-width:0">
            <span class="ctx-handle" data-entity="resource" data-id="${r.id}" title="Actions">⠿</span>
            <span class="card-title"><span class="list-icon-slot" data-icon-entity="resource" data-icon-id="${r.id}" data-icon-size="18" style="display:none;margin-right:6px;vertical-align:middle;font-size:18px"></span>${r.title}<span class="comment-badge" data-comment-for="${r.id}" data-comment-entity="resource" style="display:none"></span></span>
          </div>
        </div>
        ${vis('type') && r.resource_type ? `<span class="badge badge-todo">${r.resource_type}</span>` : ''}
        ${vis('linked') && linked ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">→ ${linked}</div>` : ''}
        ${vis('url') && rawUrl ? `<div style="margin-top:6px" onclick="event.stopPropagation()"><a href="${rawUrl}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent)">${rawUrl.length > 60 ? rawUrl.slice(0,60)+'…' : rawUrl}</a></div>` : ''}
        ${r.body ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${r.body.slice(0,120)}${r.body.length>120?'…':''}</div>` : ''}
        ${vis('tags') ? (r.tags || []).map(t => tagHtml(t)).join('') : ''}
        ${(() => {
          const customVals = getCustomPropValues('resource', r.id);
          return getCustomPropDefs('resource').filter(d => entityPropVisible('resource', d.key)).map(d => {
            const v = customVals[d.key] || '';
            if (!v) return '';
            if (d.type === 'multi_select') {
              const arr = (() => { try { const a = JSON.parse(v); return Array.isArray(a) ? a : (v ? [v] : []); } catch { return v ? [v] : []; } })();
              const oc = d.optionColors || {};
              if (!arr.length) return '';
              return arr.map(x => oc[x] ? `<span class="multi-chip color-${oc[x]}" style="font-size:11px">${escHtml(x)}</span>` : `<span class="multi-chip" style="font-size:11px">${escHtml(x)}</span>`).join('');
            }
            if (d.type === 'select' || d.type === 'status') {
              const oc = d.optionColors || {};
              return oc[v] ? `<span class="multi-chip color-${oc[v]}" style="font-size:11px">${escHtml(v)}</span>` : `<span class="entity-list-meta">${escHtml(v)}</span>`;
            }
            return `<span class="entity-list-meta">${escHtml(d.label)}: ${escHtml(d.type === 'date' ? (fmtDate(v)||v) : String(v))}</span>`;
          }).filter(Boolean).join('');
        })()}
      </div>`;
    }).join('')}</div>`;
  }

  function bindResEvents() {
    bindCtxHandles();
    document.querySelectorAll('.res-row').forEach(el => {
      el.onclick = async (e) => {
        if (e.target.closest('.ctx-handle') || e.target.closest('a')) return;
        const r = resources.find(x => String(x.id) === el.dataset.resId);
        if (r) showResourceSlideover(r, () => renderResources());
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

/* ─── Taxonomy Prop View ─────────────────────────────────────────────── */
async function renderTaxonomyPropView(key) {
  const props = getGlobalTaxonomyProps();
  const prop = props.find(p => p.key === key);
  if (!prop) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">Taxonomy not found</div></div></div>`;
    return;
  }
  const options = getTaxonomyOptions(key);
  const optChips = options.map(o => {
    const hex = COLOR_HEX[o.color] || o.color || '#378ADD';
    return `<div class="taxonomy-chip">
      <div class="taxonomy-chip-color" style="background:${hex}"></div>
      <span class="taxonomy-chip-name">${escHtml(o.name)}</span>
      <div class="taxonomy-chip-actions">
        <button class="btn btn-sm btn-ghost tax-opt-edit-btn" data-key="${escHtml(key)}" data-opt-id="${escHtml(String(o.id))}">Edit</button>
        <button class="btn btn-sm btn-danger tax-opt-del-btn" data-key="${escHtml(key)}" data-opt-id="${escHtml(String(o.id))}">Del</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">◈</div><div class="empty-state-text">No options yet — add one below</div></div>`;

  document.getElementById('main-content').innerHTML = `<div class="view">
    <div class="view-header">
      <h1 class="view-title">${escHtml(prop.label)}</h1>
      <div class="flex gap-8">
        <button class="btn btn-ghost" id="tax-rename-btn">Rename</button>
        <button class="btn btn-danger btn-sm" id="tax-delete-btn">Delete taxonomy</button>
        <button class="btn btn-primary" id="new-tax-opt-btn">+ New option</button>
      </div>
    </div>
    <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Options for <b>${escHtml(prop.label)}</b> — these appear as a multiselect in all entity property panels.</p>
    <div id="tax-opts-grid" class="taxonomy-grid">${optChips}</div>
  </div>`;

  document.getElementById('new-tax-opt-btn').onclick = () => showTaxonomyOptionModal(key, null, () => renderTaxonomyPropView(key));
  document.getElementById('tax-rename-btn').onclick = () => {
    const label = prompt(`New name for "${prop.label}":`, prop.label);
    if (!label || !label.trim()) return;
    const ps = getGlobalTaxonomyProps();
    const idx = ps.findIndex(p => p.key === key);
    if (idx >= 0) { ps[idx].label = label.trim(); saveGlobalTaxonomyProps(ps); }
    renderTaxonomyNav();
    renderTaxonomyPropView(key);
  };
  document.getElementById('tax-delete-btn').onclick = () => {
    if (!confirm(`Delete taxonomy "${prop.label}"? Values saved on entities will remain but the property will no longer appear.`)) return;
    saveGlobalTaxonomyProps(getGlobalTaxonomyProps().filter(p => p.key !== key));
    localStorage.removeItem(`taxonomyOpts_${key}`);
    renderTaxonomyNav();
    renderView('dashboard');
  };
  document.querySelectorAll('.tax-opt-edit-btn').forEach(btn => {
    btn.onclick = () => {
      const opt = getTaxonomyOptions(btn.dataset.key).find(o => String(o.id) === btn.dataset.optId);
      if (opt) showTaxonomyOptionModal(btn.dataset.key, opt, () => renderTaxonomyPropView(key));
    };
  });
  document.querySelectorAll('.tax-opt-del-btn').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('Delete this option?')) return;
      saveTaxonomyOptions(btn.dataset.key, getTaxonomyOptions(btn.dataset.key).filter(o => String(o.id) !== btn.dataset.optId));
      renderTaxonomyPropView(key);
    };
  });
}

function showTaxonomyOptionModal(taxKey, opt, afterSave) {
  const v = opt || {};
  const body = `
    <div class="form-group"><label class="form-label">Name *</label>
      <input type="text" id="taxopt-name" value="${escHtml(v.name || '')}" placeholder="Option name" /></div>
    <div class="form-group"><label class="form-label">Color</label>
      ${colorSelect('taxopt-color', v.color || 'blue')}</div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;
  openModal(v.id ? 'Edit Option' : 'New Option', body, null);
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  setTimeout(() => document.getElementById('taxopt-name')?.focus(), 50);
  document.getElementById('modal-save-btn').onclick = () => {
    const name = document.getElementById('taxopt-name')?.value.trim() || '';
    const color = document.getElementById('taxopt-color')?.value || 'blue';
    if (!name) { showToast('Name is required', 'error'); return; }
    let opts = getTaxonomyOptions(taxKey);
    if (v.id) {
      const idx = opts.findIndex(o => String(o.id) === String(v.id));
      if (idx >= 0) opts[idx] = { ...opts[idx], name, color };
    } else {
      opts.push({ id: String(Date.now()), name, color });
    }
    saveTaxonomyOptions(taxKey, opts);
    closeModal();
    if (afterSave) afterSave();
  };
}

/* ─── Project Detail View ─────────────────────────────────────────────── */
async function renderProjectDetail(projectId) {
  let p;
  try { p = await api('GET', `/api/projects/${projectId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Project not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('project-detail', projectId, p.title);

  async function patchProject(data) {
    try { await api('PATCH', `/api/projects/${projectId}`, data); } catch(e) { return; }
    renderProjectDetail(projectId);
  }
  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const tags = p.tags || [];
  const catName = allCategories ? (allCategories.find(c => String(c.id) === String(p.category_id)) || {}).name : null;
  let pdLocalGoals = [];
  try { pdLocalGoals = await api('GET', '/api/goals'); } catch(e) {}
  const goalName = pdLocalGoals.find(g => String(g.id) === String(p.goal_id))?.title || null;
  const allProjDetailBuiltinDefs = [
    { key: 'status',   label: 'Status',    icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => statusBadge(p.status||'active') },
    { key: 'due',      label: 'Due Date',  icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => p.due_date ? `<span>${fmtDate(p.due_date)}</span>` : '' },
    { key: 'goal',     label: 'Goals',     icon: pIco('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
      renderValue: () => renderMultiRelationValue('project', projectId, 'goal', goalName) },
    { key: 'tags',     label: 'Tags',      icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => tags.length ? tags.map(t => tagHtml(t)).join('') : '' },
    { key: 'category', label: 'Category',  icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => catName ? `<span>${catName}</span>` : '' },
    { key: 'macro',    label: 'Macro Area',icon: pIco('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
      renderValue: () => p.macro_area ? `<span>${p.macro_area.split('(')[0].trim()}</span>` : '' },
    { key: 'kanban',   label: 'Kanban Col',icon: pIco('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>'),
      renderValue: () => p.kanban_col ? `<span>${p.kanban_col}</span>` : '' },
    { key: 'archived', label: 'Archived',  icon: pIco('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>'),
      renderValue: () => p.archived ? `<span>Yes</span>` : '' },
  ];
  await loadEntityCustomProps('project', projectId);
  const projDetailPropPanel = buildInlinePropPanel('project', projectId, allProjDetailBuiltinDefs);
  const projDetailEditFns = {
    status:   (valEl) => { openValuePicker(valEl, PROJECT_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })), async (val) => { await patchProject({ status: val }); }); },
    due:      (valEl) => { openDateRangePickerGlobal(valEl, stripDate(p.start_date), stripDate(p.due_date), async (start, end) => { await patchProject({ start_date: start||null, due_date: end||null }); }); },
    goal:     (valEl) => openMultiRelationPicker(valEl, 'project', projectId, 'goal', 'goal', pdLocalGoals, p, patchProject, 'goal_id', () => renderProjectDetail(projectId)),
    tags:     (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = tags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/projects/${projectId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); renderProjectDetail(projectId); return; } await api('PUT', `/api/projects/${projectId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); renderProjectDetail(projectId); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    category: async (valEl) => { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} openValuePicker(valEl, [{ value:'', label:'— none —' }, ...(allCategories||[]).map(c => ({ value: c.id, label: c.name }))], async (val) => { await patchProject({ category_id: val ? parseInt(val) : null }); }); },
    macro:    (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...MACRO_AREAS.map(m => ({ value: m, label: m.split('(')[0].trim() }))], async (val) => { await patchProject({ macro_area: val||null }); }); },
    kanban:   (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...KANBAN_COLS.map(k => ({ value: k, label: k }))], async (val) => { await patchProject({ kanban_col: val||null }); }); },
    archived: (valEl) => { patchProject({ archived: !p.archived }); },
  };

  const tasks = p.tasks || [];
  const notes = p.notes || [];
  const resources = p.resources || [];

  // Load all tasks so child lookups work even for subtasks without project_id
  try {
    const all = await api('GET', '/api/tasks?all=1');
    allTasksCache = Array.isArray(all) ? all : allTasksCache;
    allTasksFull = allTasksCache;
  } catch(e) {}

  // Compute sub_task_count from the full task cache (subtasks may not carry project_id)
  tasks.forEach(t => {
    t.sub_task_count = allTasksCache.filter(s => s.parent_task_id === t.id).length;
  });

  function buildTaskTreeRows(taskList, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, false, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasksCache.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildTaskTreeRows(children, depth + 1);
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
    return '<ul class="task-list">' + buildTaskTreeRows(topLevel, 0) + '</ul>';
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
    <div class="entity-view-cover" id="proj-cover-row"></div>
    <div class="entity-view-action" id="proj-action-row">
      <button class="entity-icon-add-btn" id="proj-icon-btn">
        <span id="proj-icon-display"></span>
        <span id="proj-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
      </button>
    </div>
    <div class="view-header">
      <div>
        ${goalLink ? `<div class="breadcrumb" style="margin-bottom:6px">${goalLink}</div>` : ''}
        <h1 class="view-title">${p.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(p.status)}
          ${p.macro_area ? `<span class="badge badge-todo">${p.macro_area.split('(')[0].trim()}</span>` : ''}
          ${p.kanban_col ? `<span class="badge badge-progress">${p.kanban_col}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" id="pd-manage-btn">Widgets ⚙</button>
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
      <div class="widget-header"><span class="widget-title">Properties</span></div>
      ${projDetailPropPanel}
    </div>
    ${buildRichContentSection('project', projectId)}
    ${buildCommentSection('project', projectId)}
  </div>`;

  document.getElementById('pd-back-btn').onclick = () => renderView('projects');
  document.getElementById('pd-add-task-btn').onclick = () => showNewTaskModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-add-note-btn').onclick = () => showNoteModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-add-res-btn').onclick = () => showResourceModal({ project_id: parseInt(projectId) }, () => renderProjectDetail(projectId));
  document.getElementById('pd-export-btn').onclick = () =>
    showJSONModal(`/api/export/project/${projectId}`, `project-${p.title}.json`);
  document.getElementById('pd-manage-btn').onclick = (e) => openWidgetManager('project', e.currentTarget, () => renderProjectDetail(projectId));
  // ── Project icon + cover ─────────────────────────────────────────────
  const projIconBtn = document.getElementById('proj-icon-btn');
  const projIconDisplay = document.getElementById('proj-icon-display');
  const projIconAddLabel = document.getElementById('proj-icon-add-label');
  const projActionRow = document.getElementById('proj-action-row');
  const setProjIcon = (icon) => {
    if (projIconDisplay) { projIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 32) : ''; projIconDisplay.dataset.icon = icon || ''; }
    if (projIconAddLabel) projIconAddLabel.innerHTML = icon ? '' : ACT_ICONS.addIcon + 'Add icon';
    if (projActionRow) projActionRow.classList.toggle('has-entity-icon', !!icon);
  };
  loadEntityIcon('project', projectId).then(setProjIcon).catch(() => setProjIcon(''));
  if (projIconBtn) {
    projIconBtn.onclick = (e) => {
      e.stopPropagation();
      const cur = projIconDisplay ? projIconDisplay.dataset.icon || '' : '';
      showIconPicker(projIconBtn, 'project', projectId, cur, (newIcon) => {
        setProjIcon(newIcon || '');
        saveEntityIcon('project', projectId, newIcon).catch(() => setProjIcon(cur));
      });
    };
  }
  initDetailViewCover('project', projectId, 'proj-cover-row', 'proj-action-row');
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
  bindInlinePropPanel('project', projectId, projDetailEditFns, () => renderProjectDetail(projectId));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="project"]'));
  initRichEditor(`editorjs-project-${projectId}`, 'project', projectId, false);
}
async function renderGoalDetail(goalId) {
  let g;
  try { g = await api('GET', `/api/goals/${goalId}`); } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="view"><div class="empty-state"><div class="empty-state-text">Goal not found</div></div></div>`;
    return;
  }
  updateBreadcrumb('goal-detail', goalId, g.title);

  async function patchGoal(data) {
    try { await api('PATCH', `/api/goals/${goalId}`, data); } catch(e) { return; }
    renderGoalDetail(goalId);
  }
  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const tags = g.tags || [];
  const catName = allCategories ? (allCategories.find(c => String(c.id) === String(g.category_id)) || {}).name : null;
  const allGoalDetailBuiltinDefs = [
    { key: 'status',   label: 'Status',   icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => statusBadge(g.status||'active') },
    { key: 'type',     label: 'Type',     icon: pIco('<path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>'),
      renderValue: () => g.type ? `<span>${g.type}</span>` : '' },
    { key: 'year',     label: 'Year',     icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => g.year ? `<span>${g.year}</span>` : '' },
    { key: 'tags',     label: 'Tags',     icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => tags.length ? tags.map(t => tagHtml(t)).join('') : '' },
    { key: 'category', label: 'Category', icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => catName ? `<span>${catName}</span>` : '' },
    { key: 'due',      label: 'Due Date', icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => g.due_date ? `<span>${fmtDate(g.due_date)}</span>` : '' },
    { key: 'metrics',  label: 'Metrics',  icon: pIco('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
      renderValue: () => g.target != null ? `<span>${g.current_value ?? '—'}/${g.target}</span>` : '' },
  ];
  await loadEntityCustomProps('goal', goalId);
  const goalDetailPropPanel = buildInlinePropPanel('goal', goalId, allGoalDetailBuiltinDefs);
  const goalDetailEditFns = {
    status:   (valEl) => { openValuePicker(valEl, GOAL_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })), async (val) => { await patchGoal({ status: val }); }); },
    type:     (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...GOAL_TYPES.map(t => ({ value: t, label: t }))], async (val) => { await patchGoal({ type: val||null }); }); },
    year:     (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...GOAL_YEARS.map(y => ({ value: y, label: y }))], async (val) => { await patchGoal({ year: val||null }); }); },
    tags:     (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = tags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/goals/${goalId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); renderGoalDetail(goalId); return; } await api('PUT', `/api/goals/${goalId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); renderGoalDetail(goalId); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    category: async (valEl) => { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} openValuePicker(valEl, [{ value:'', label:'— none —' }, ...(allCategories||[]).map(c => ({ value: c.id, label: c.name }))], async (val) => { await patchGoal({ category_id: val ? parseInt(val) : null }); }); },
    due:      (valEl) => { openSingleDatePickerGlobal(valEl, stripDate(g.due_date), async (val) => { await patchGoal({ due_date: val||null }); }); },
    metrics:  (valEl) => {
      valEl.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">
        <input type="number" placeholder="Start" value="${g.start_value??''}" id="gdm-sv" style="width:65px;font-size:12px;padding:2px 5px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-card);color:var(--text)">
        <input type="number" placeholder="Current" value="${g.current_value??''}" id="gdm-cv" style="width:65px;font-size:12px;padding:2px 5px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-card);color:var(--text)">
        <input type="number" placeholder="Target" value="${g.target??''}" id="gdm-t" style="width:65px;font-size:12px;padding:2px 5px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-card);color:var(--text)">
      </div>`;
      document.getElementById('gdm-sv')?.focus();
      const save = async () => {
        const sv = parseFloat(document.getElementById('gdm-sv')?.value), cv = parseFloat(document.getElementById('gdm-cv')?.value), t = parseFloat(document.getElementById('gdm-t')?.value);
        await patchGoal({ start_value: isNaN(sv)?null:sv, current_value: isNaN(cv)?null:cv, target: isNaN(t)?null:t });
      };
      ['gdm-sv','gdm-cv','gdm-t'].forEach(id => { document.getElementById(id)?.addEventListener('blur', () => setTimeout(save, 150)); document.getElementById(id)?.addEventListener('keydown', e => { if (e.key==='Enter') save(); }); });
    },
  };

  const projects = g.projects || [];
  const tasks = g.tasks || [];
  const notes = g.notes || [];
  const resources = g.resources || [];

  // Load all tasks so toggle reveals subtasks that don't carry goal_id
  try {
    const all = await api('GET', '/api/tasks?all=1');
    allTasksCache = Array.isArray(all) ? all : allTasksCache;
    allTasksFull = allTasksCache;
  } catch(e) {}

  // Compute sub_task_count from full cache
  tasks.forEach(t => {
    t.sub_task_count = allTasksCache.filter(s => s.parent_task_id === t.id).length;
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

  function buildGoalTaskTreeRows(taskList, depth) {
    let html = '';
    for (const t of taskList) {
      html += taskRowHtml(t, false, depth);
      const isExp = expandedTasks.has(String(t.id));
      const children = allTasksCache.filter(s => s.parent_task_id === t.id);
      if (isExp && children.length > 0) {
        html += buildGoalTaskTreeRows(children, depth + 1);
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
    ? '<ul class="task-list">' + buildGoalTaskTreeRows(topLevelTasks, 0) + '</ul>'
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
    <div class="entity-view-cover" id="goal-cover-row"></div>
    <div class="entity-view-action" id="goal-action-row">
      <button class="entity-icon-add-btn" id="goal-icon-btn">
        <span id="goal-icon-display"></span>
        <span id="goal-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
      </button>
    </div>
    <div class="view-header">
      <div>
        <h1 class="view-title">${g.title}</h1>
        <div class="flex gap-8" style="margin-top:6px">
          ${statusBadge(g.status)}
          ${g.type ? `<span class="badge badge-progress">${g.type}</span>` : ''}
          ${g.year ? `<span class="badge badge-todo">${g.year}</span>` : ''}
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" id="gd-manage-btn">Widgets ⚙</button>
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
      <div class="widget-header"><span class="widget-title">Properties</span></div>
      ${goalDetailPropPanel}
    </div>
    ${buildRichContentSection('goal', goalId)}
    ${buildCommentSection('goal', goalId)}
  </div>`;

  document.getElementById('gd-back-btn').onclick = () => renderView('goals');
  document.getElementById('gd-export-btn').onclick = () =>
    showJSONModal(`/api/export/goal/${goalId}`, `goal-${g.title}.json`);
  document.getElementById('gd-add-task-btn').onclick = () => showNewTaskModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-add-note-btn').onclick = () => showNoteModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-add-res-btn').onclick = () => showResourceModal({ goal_id: parseInt(goalId) }, () => renderGoalDetail(goalId));
  document.getElementById('gd-manage-btn').onclick = (e) => openWidgetManager('goal', e.currentTarget, () => renderGoalDetail(goalId));
  // ── Goal icon + cover ─────────────────────────────────────────────────
  const goalIconBtn = document.getElementById('goal-icon-btn');
  const goalIconDisplay = document.getElementById('goal-icon-display');
  const goalIconAddLabel = document.getElementById('goal-icon-add-label');
  const goalActionRow = document.getElementById('goal-action-row');
  const setGoalIcon = (icon) => {
    if (goalIconDisplay) { goalIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 32) : ''; goalIconDisplay.dataset.icon = icon || ''; }
    if (goalIconAddLabel) goalIconAddLabel.innerHTML = icon ? '' : ACT_ICONS.addIcon + 'Add icon';
    if (goalActionRow) goalActionRow.classList.toggle('has-entity-icon', !!icon);
  };
  loadEntityIcon('goal', goalId).then(setGoalIcon).catch(() => setGoalIcon(''));
  if (goalIconBtn) {
    goalIconBtn.onclick = (e) => {
      e.stopPropagation();
      const cur = goalIconDisplay ? goalIconDisplay.dataset.icon || '' : '';
      showIconPicker(goalIconBtn, 'goal', goalId, cur, (newIcon) => {
        setGoalIcon(newIcon || '');
        saveEntityIcon('goal', goalId, newIcon).catch(() => setGoalIcon(cur));
      });
    };
  }
  initDetailViewCover('goal', goalId, 'goal-cover-row', 'goal-action-row');
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
  bindInlinePropPanel('goal', goalId, goalDetailEditFns, () => renderGoalDetail(goalId));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="goal"]'));
  initRichEditor(`editorjs-goal-${goalId}`, 'goal', goalId, false);
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

/* ─── Global Date Picker ─────────────────────────────────────────────── */
let _dpEl = null;
function closeDatePicker() {
  if (_dpEl) { _dpEl.remove(); _dpEl = null; }
  document.removeEventListener('mousedown', _dpOutside);
}
function _dpOutside(e) {
  if (_dpEl && !_dpEl.contains(e.target)) closeDatePicker();
}

function openDateRangePickerGlobal(anchorEl, startVal, endVal, onChange, singleDate = false) {
  closeDatePicker();
  const today = new Date(); today.setHours(0,0,0,0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  if (startVal) { const d = new Date(startVal + 'T00:00:00'); viewYear = d.getFullYear(); viewMonth = d.getMonth(); }
  let rangeStart = startVal ? new Date(startVal + 'T00:00:00') : null;
  let rangeEnd = endVal ? new Date(endVal + 'T00:00:00') : null;
  let pickingEnd = !!rangeStart && !singleDate;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  function toISO(d) { return d ? d.toISOString().split('T')[0] : null; }

  _dpEl = document.createElement('div');
  _dpEl.className = 'datepicker-popover';

  function renderPicker() {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
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
    const rangeLabel = singleDate
      ? (rangeStart ? rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'Pick date')
      : rangeStart && rangeEnd
        ? `${rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} → ${rangeEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
        : rangeStart ? `${rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} → pick end`
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

    _dpEl.querySelector('#dp-prev').onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderPicker(); };
    _dpEl.querySelector('#dp-next').onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderPicker(); };
    _dpEl.querySelector('#dp-clear').onclick = () => {
      rangeStart = null; rangeEnd = null; pickingEnd = false;
      onChange(null, null); renderPicker();
    };
    _dpEl.querySelectorAll('.dp-day[data-iso]').forEach(el => {
      el.onclick = () => {
        const clicked = new Date(el.dataset.iso + 'T00:00:00');
        if (singleDate) {
          onChange(toISO(clicked), null);
          closeDatePicker();
          return;
        }
        if (!rangeStart || (!pickingEnd && rangeEnd)) {
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

function openSingleDatePickerGlobal(anchorEl, currentVal, onChange) {
  openDateRangePickerGlobal(anchorEl, currentVal, null, (start) => onChange(start || null), true);
}

/* ─── Combo Popover (global) ─────────────────────────────────────────── */
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
    const filtered = filter ? items.filter(i => i.label.toLowerCase().includes(filter.toLowerCase())) : items;
    const showCreate = allowCreate && filter.trim() && !filtered.some(i => i.label.toLowerCase() === filter.trim().toLowerCase());
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
    inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.oninput = (e) => { filter = e.target.value; focusIdx = -1; render(); };
    inp.onkeydown = (e) => {
      const comboItems = _comboEl.querySelectorAll('.combo-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(focusIdx + 1, comboItems.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(focusIdx - 1, 0); render(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusIdx >= 0 && comboItems[focusIdx]) comboItems[focusIdx].click();
        else if (allowCreate && filter.trim()) {
          const exact = items.find(i => i.label.toLowerCase() === filter.trim().toLowerCase());
          if (!exact) { onSelect({ create: filter.trim() }); closeCombo(); }
          else { onSelect({ value: String(exact.value), label: exact.label }); closeCombo(); }
        }
      }
      else if (e.key === 'Escape') closeCombo();
    };
    _comboEl.querySelectorAll('.combo-sel-chip').forEach(chip => {
      chip.onclick = (e) => { e.stopPropagation(); const v = chip.dataset.remove; localSelected.delete(v); onSelect({ multiIds: [...localSelected] }); render(); };
    });
    _comboEl.querySelectorAll('.combo-item').forEach(el => {
      el.onclick = async (e) => {
        e.stopPropagation();
        if (el.dataset.create) { await onSelect({ create: el.dataset.create }); closeCombo(); }
        else {
          if (multiSelect) {
            const v = el.dataset.val;
            if (localSelected.has(v)) localSelected.delete(v); else localSelected.add(v);
            onSelect({ multiIds: [...localSelected] }); render();
          } else { onSelect({ value: el.dataset.val, label: el.dataset.label }); closeCombo(); }
        }
      };
    });
  }
  render();
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

/* ─── Task Slideover ─────────────────────────────────────────────────── */
async function showTaskSlideover(taskId) {
  openSlideover('Task Detail', '<div class="loading">Loading…</div>');

  let task;
  try { task = await api('GET', `/api/tasks/${taskId}`); } catch(e) { return; }

  const subtasks = task.sub_tasks || [];
  const tags = task.tags || [];

  // Fetch projects, goals, sprints for comboboxes; always refresh allTasksCache for correct child lookups
  let allProjects = [], allGoals = [], allSprintsLocal = [];
  try {
    const results = await Promise.all([
      api('GET', '/api/projects'),
      api('GET', '/api/goals'),
      api('GET', '/api/tasks?all=1'),
      api('GET', '/api/sprints'),
    ]);
    [allProjects, allGoals] = results;
    allTasksCache = results[2];
    allTasksFull = allTasksCache;
    allSprintsLocal = results[3] || [];
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
        const pt = allTasksCache.find(t => t.id === parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium',
          goal_id: pt?.goal_id || null, project_id: pt?.project_id || null, sprint_id: pt?.sprint_id || null }, async () => {
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
  const sprintName = allSprintsLocal.find(s => String(s.id) === String(task.sprint_id))?.title || null;

  // ── Inline prop panel (built-in extra props + custom props) ──────────────
  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const taskSections = getPropSections('task');
  const isInHead = (k) => taskSections.heading.includes(k);
  const TASK_CHIP_KEYS = ['status','priority','due','focus','tags'];
  const taskExtraHeadKeys = taskSections.heading.filter(k => !TASK_CHIP_KEYS.includes(k));

  const allTaskBuiltinDefs = [
    { key: 'status',   label: 'Status',       icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => task.status ? statusBadge(task.status) : '' },
    { key: 'priority', label: 'Priority',     icon: pIco('<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>'),
      renderValue: () => task.priority ? priorityBadge(task.priority) : '' },
    { key: 'due',      label: 'Due Date',     icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => { const v = fmtDateRange(task.start_date, task.due_date); return v ? `<span>${v}</span>` : ''; } },
    { key: 'focus',    label: 'Focus Block',  icon: pIco('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
      renderValue: () => { const v = fmtDateRange(task.focus_block_start, task.focus_block); return v ? `<span>${v}</span>` : ''; } },
    { key: 'tags',     label: 'Tags',         icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => tags.length ? tags.map(t => tagHtml(t)).join('') : '' },
    { key: 'category', label: 'Category',     icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => catName ? `<span>${catName}</span>` : '' },
    { key: 'goal',     label: 'Goals',        icon: pIco('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
      renderValue: () => renderMultiRelationValue('task', taskId, 'goal', goalName) },
    { key: 'project',  label: 'Projects',     icon: pIco('<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'),
      renderValue: () => renderMultiRelationValue('task', taskId, 'project', projName) },
    { key: 'points',   label: 'Story Points', icon: pIco('<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>'),
      renderValue: () => task.story_points != null && task.story_points > 0 ? `<span>${task.story_points}</span>` : '' },
    { key: 'recur',       label: 'Recurring',    icon: pIco('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>'),
      renderValue: () => (task.recur_interval||0) > 0 ? `<span>Every ${task.recur_interval} ${task.recur_unit||'days'}</span>` : '' },
    { key: 'description', label: 'Description',  icon: pIco('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
      renderValue: () => task.description ? `<span style="font-size:12px;white-space:pre-wrap">${escHtml(task.description)}</span>` : '' },
  ];
  const taskBodyDefs = allTaskBuiltinDefs.filter(d => taskSections.body.includes(d.key) || d.key === 'description');
  await loadEntityCustomProps('task', taskId);
  const taskInlinePropPanel = buildInlinePropPanel('task', taskId, taskBodyDefs);

  const body = `
    <button class="entity-icon-add-btn" id="task-icon-add-btn">
      <span id="task-icon-display"></span>
      <span id="task-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      ${bcPrefix}
      <textarea class="detail-title-input" id="detail-title" rows="1">${(task.title || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      ${isInHead('status') ? `<button class="prop-chip chip-status-${task.status}" id="chip-status" data-key="status">
        <span class="chip-label">Status</span>
        <span class="chip-value"${(() => { const c = getValueColor('taskStatuses', task.status); return c ? ` style="background:${c}22;color:${c};border-radius:3px;padding:1px 5px;font-weight:600"` : ''; })()}>${task.status.replace('_',' ')}</span>
      </button>` : ''}
      ${isInHead('priority') ? `<button class="prop-chip chip-priority-${task.priority}" id="chip-priority" data-key="priority">
        <span class="chip-label">Priority</span>
        <span class="chip-value"${(() => { const c = getValueColor('taskPriorities', task.priority); return c ? ` style="background:${c}22;color:${c};border-radius:3px;padding:1px 5px;font-weight:600"` : ''; })()}>${task.priority}</span>
      </button>` : ''}
      ${isInHead('due') ? `<button class="prop-chip" id="chip-due" data-key="due">
        <span class="chip-label">Due</span>
        <span class="chip-value" id="chip-due-val">${fmtDateRange(task.start_date, task.due_date)}</span>
      </button>` : ''}
      ${isInHead('focus') ? `<button class="prop-chip${task.focus_block ? '' : ' chip-empty'}" id="chip-focus" data-key="focus" title="Focus block">
        <span class="chip-label">Focus</span>
        <span class="chip-value" id="chip-focus-val">${fmtDateRange(task.focus_block_start, task.focus_block)}</span>
      </button>` : ''}
      ${isInHead('tags') ? `<button class="prop-chip" id="chip-tags" data-key="tags">
        <span class="chip-label">Tags</span>
        <span class="chip-value" id="chip-tags-val">${tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span>
      </button>` : ''}
      ${taskExtraHeadKeys.map(k => { const def = allTaskBuiltinDefs.find(d => d.key === k); if (!def) return ''; return `<button class="prop-chip" id="chip-extra-${k}" data-key="${k}"><span class="chip-label">${def.label}</span><span class="chip-value">${def.renderValue() || '—'}</span></button>`; }).join('')}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${taskInlinePropPanel}

    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Subtasks (${subtasks.length})</span>
        <button class="btn btn-sm btn-ghost" id="add-subtask-btn">+ Add</button>
      </div>
      <div id="subtask-list"></div>
    </div>
    <div class="subtask-section">
      <div class="subtask-section-title" style="align-items:center">
        <span>Pomodoro</span>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:400">
          <input type="checkbox" id="task-pomodoro-toggle" ${task.pomodoro ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent)">
          <span style="color:var(--text-muted)">${task.pomodoro ? 'Tracked in Pomodoro view' : 'Enable for Pomodoro view'}</span>
        </label>
      </div>
      ${task.pomodoro ? `<div class="subtask-section-title" style="margin-top:6px">
        <span style="font-size:12px;color:var(--text-muted)">Sessions · ${pomDone}/${pomPlanned}</span>
        <button class="btn btn-sm btn-ghost" id="log-pom-btn">+ Log</button>
      </div>
      <div class="pomodoro-track">${pomDots}</div>` : ''}
    </div>
    ${buildEntityViewsSection('task', taskId)}
    ${buildCommentSection('task', taskId)}
    ${buildRichContentSection('task', taskId)}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="task-export-btn">Export JSON</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" id="task-delete-btn">Delete</button>
    </div>
  `;

  openSlideover(task.title, body);
  setSlideoverExport('task', task.id);
  initSlideoverCoverArea('task', task.id);

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

  // Icon
  const taskIconAddBtn = document.getElementById('task-icon-add-btn');
  const taskIconDisplay = document.getElementById('task-icon-display');
  const taskIconAddLabel = document.getElementById('task-icon-add-label');
  loadEntityIcon('task', taskId).then(icon => {
    if (icon) { taskIconDisplay.innerHTML = renderEntityIcon(icon, 32); taskIconDisplay.dataset.icon = icon; taskIconAddLabel.textContent = ''; }
  });
  taskIconAddBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = taskIconDisplay.dataset.icon || '';
    showIconPicker(taskIconAddBtn, 'task', taskId, cur, (newIcon) => {
      taskIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      taskIconDisplay.dataset.icon = newIcon || '';
      taskIconAddLabel.innerHTML = newIcon ? '' : ACT_ICONS.addIcon + 'Add icon';
      saveEntityIcon('task', taskId, newIcon);
    });
  };


  // ── Bind inline prop panel (extra built-in + custom props) ───────────────
  const taskInlinePropEditFns = {
    status: (valEl) => {
      openEditableValueCombo(valEl, TASK_STATUSES, 'taskStatuses', task.status, async (value) => {
        await handleStatusChange(value);
      });
    },
    priority: (valEl) => {
      openEditableValueCombo(valEl, TASK_PRIORITIES, 'taskPriorities', task.priority, async (value) => {
        await patchTask({ priority: value });
      });
    },
    due: (valEl) => {
      openDateRangePickerGlobal(valEl, stripDate(task.start_date), stripDate(task.due_date), async (start, end) => {
        await patchTask({ start_date: start || null, due_date: end || start || null });
        showTaskSlideover(taskId);
      });
    },
    focus: (valEl) => {
      openDateRangePickerGlobal(valEl, stripDate(task.focus_block_start), stripDate(task.focus_block), async (start, end) => {
        await patchTask({ focus_block_start: start || null, focus_block: end || start || null });
        showTaskSlideover(taskId);
      });
    },
    tags: (valEl) => {
      const curIds = tags.map(t => t.id);
      openCombo(valEl, allTags.map(t => ({ value: t.id, label: t.name, color: t.color })), null, async ({ multiIds, create }) => {
        if (create) {
          try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: [...new Set([...curIds, nt.id])] }); } catch(err) {}
        } else {
          await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: (multiIds||[]).map(Number) });
        }
        showTaskSlideover(taskId);
      }, { multiSelect: true, allowCreate: true, selectedIds: curIds });
    },
    category: async (valEl) => {
      try { allCategories = await api('GET', '/api/categories'); } catch(e) {}
      const cats = [{ value: '', label: '— none —' }, ...allCategories.map(c => ({ value: String(c.id), label: c.name }))];
      openCombo(valEl, cats, task.category_id ? String(task.category_id) : '', async ({ value, label, create }) => {
        if (create) {
          try { const nc = await api('POST', '/api/categories', { name: create }); allCategories.push(nc); await patchTask({ category_id: nc.id }); } catch(err) {}
        } else {
          await patchTask({ category_id: value ? parseInt(value) : null });
        }
      }, { allowCreate: true });
    },
    goal:    (valEl) => openMultiRelationPicker(valEl, 'task', taskId, 'goal', 'goal', allGoals, task, patchTask, 'goal_id', () => showTaskSlideover(taskId)),
    project: (valEl) => openMultiRelationPicker(valEl, 'task', taskId, 'project', 'project', allProjects, task, patchTask, 'project_id', () => showTaskSlideover(taskId)),
    points: (valEl) => {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.style.cssText = 'width:80px;border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:13px;background:var(--bg-card);color:var(--text)';
      inp.value = task.story_points || '';
      valEl.innerHTML = ''; valEl.appendChild(inp); inp.focus();
      inp.onblur = async () => { await patchTask({ story_points: parseInt(inp.value) || 0 }); };
      inp.onkeydown = (ke) => { if (ke.key === 'Enter') inp.blur(); };
    },
    recur: (valEl) => {
      const iv = task.recur_interval || 0;
      const unit = (task.recur_unit || 'days').toLowerCase();
      const popup = document.createElement('div');
      popup.className = 'combo-popover';
      popup.style.cssText = 'padding:14px;min-width:215px';
      popup.innerHTML = `
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px">
          <input type="checkbox" id="_recur-on" ${iv > 0 ? 'checked' : ''} style="width:auto">
          <span style="font-size:13px">Repeating task</span>
        </label>
        <div id="_recur-flds" style="display:${iv > 0 ? 'flex' : 'none'};gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <span style="font-size:12px;color:var(--text-muted)">Every</span>
          <input type="number" id="_recur-n" value="${iv || 1}" min="1" style="width:52px">
          <select id="_recur-u">${['days','weeks','months','years'].map(u => `<option value="${u}" ${unit===u?'selected':''}>${u}</option>`).join('')}</select>
        </div>
        <button class="btn btn-primary btn-sm" id="_recur-save" style="width:100%">Save</button>`;
      clampPopup(popup, valEl);
      popup.querySelector('#_recur-on').onchange = e => {
        popup.querySelector('#_recur-flds').style.display = e.target.checked ? 'flex' : 'none';
      };
      popup.querySelector('#_recur-save').onclick = async () => {
        const on = popup.querySelector('#_recur-on').checked;
        const n = on ? (parseInt(popup.querySelector('#_recur-n').value) || 1) : 0;
        const u = on ? popup.querySelector('#_recur-u').value : '';
        popup.remove();
        await patchTask({ recur_interval: n, recur_unit: u });
        // Sync to automations DB: upsert a recurring automation for this task
        await syncRecurAutomation(taskId, task.title, on ? n : 0, u);
      };
      const dismiss = e => { if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', dismiss); } };
      setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
    },
    description: (valEl) => {
      const cur = task.description || '';
      const ta = Object.assign(document.createElement('textarea'), { value: cur });
      ta.style.cssText = 'width:100%;min-height:72px;border:1px solid var(--accent);border-radius:4px;padding:6px 8px;font-size:13px;background:var(--bg-card);color:var(--text-primary);resize:vertical;box-sizing:border-box';
      valEl.innerHTML = '';
      valEl.appendChild(ta);
      ta.focus();
      const save = async () => {
        await patchTask({ description: ta.value });
        task.description = ta.value;
        valEl.innerHTML = ta.value ? `<span style="font-size:12px;white-space:pre-wrap">${escHtml(ta.value)}</span>` : '<span class="empty">—</span>';
      };
      ta.onblur = save;
      ta.onkeydown = (ke) => { if (ke.key === 'Escape') { valEl.innerHTML = cur ? `<span style="font-size:12px;white-space:pre-wrap">${escHtml(cur)}</span>` : '<span class="empty">—</span>'; } };
    },
  };
  bindInlinePropPanel('task', taskId, taskInlinePropEditFns, () => showTaskSlideover(taskId));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="task"]'));
  initEntityViewsSection('task', taskId, { ...task, _goalTitle: goalName, _projTitle: projName, _sprintTitle: sprintName });
  initRichEditor(`editorjs-task-${taskId}`, 'task', taskId, false);
  setFsPropsBuilder((fsPropsEl) => {
    const rerender = () => { fsPropsEl.innerHTML = buildInlinePropPanel('task', taskId, taskBodyDefs); bindInlinePropPanel('task', taskId, taskInlinePropEditFns, rerender, fsPropsEl); };
    fsPropsEl.innerHTML = buildInlinePropPanel('task', taskId, taskBodyDefs);
    bindInlinePropPanel('task', taskId, taskInlinePropEditFns, rerender, fsPropsEl);
  });
  setFsChipsBuilder((container) => {
    const byKey = (k) => container.querySelector(`[data-key="${k}"]`);
    byKey('status')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditableValueCombo(e.currentTarget, TASK_STATUSES, 'taskStatuses', task.status, async (value) => {
        const chip = e.currentTarget;
        chip.className = `prop-chip chip-status-${value}`;
        chip.querySelector('.chip-value').textContent = value.replace(/_/g,' ');
        applyChipValueColor(chip, 'taskStatuses', value);
        await handleStatusChange(value);
      });
    });
    byKey('priority')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditableValueCombo(e.currentTarget, TASK_PRIORITIES, 'taskPriorities', task.priority, async (value) => {
        const chip = e.currentTarget;
        chip.className = `prop-chip chip-priority-${value}`;
        chip.querySelector('.chip-value').textContent = value.replace(/_/g,' ');
        applyChipValueColor(chip, 'taskPriorities', value);
        await patchTask({ priority: value });
      });
    });
    byKey('due')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDateRangePickerGlobal(e.currentTarget, stripDate(task.start_date), stripDate(task.due_date), async (start, end) => {
        const v = e.currentTarget.querySelector('.chip-value');
        if (v) v.textContent = fmtDateRange(start, end) || '—';
        await patchTask({ start_date: start || null, due_date: end || start || null });
      });
    });
    byKey('focus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDateRangePickerGlobal(e.currentTarget, stripDate(task.focus_block_start), stripDate(task.focus_block), async (start, end) => {
        const v = e.currentTarget.querySelector('.chip-value');
        if (v) v.textContent = fmtDateRange(start, end) || '—';
        e.currentTarget.classList.toggle('chip-empty', !end && !start);
        await patchTask({ focus_block_start: start || null, focus_block: end || start || null });
      });
    });
    byKey('tags')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const curIds = tags.map(t => t.id);
      openCombo(e.currentTarget, allTags.map(t => ({ value: t.id, label: t.name, color: t.color })), null, async ({ multiIds, create }) => {
        if (create) {
          try { const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(newTag); await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: [...new Set([...curIds, newTag.id])] }); } catch(err) {}
          closeCombo(); showTaskSlideover(taskId); return;
        }
        const ids = (multiIds || []).map(Number);
        const v = e.currentTarget.querySelector('.chip-value');
        if (v) { const sel = allTags.filter(t => ids.includes(t.id)); v.innerHTML = sel.length ? sel.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'; }
        await api('PUT', `/api/tasks/${taskId}/tags`, { tag_ids: ids });
      }, { multiSelect: true, allowCreate: true, selectedIds: curIds });
    });
    taskExtraHeadKeys.forEach(k => {
      const el = container.querySelector(`[data-key="${k}"]`);
      if (!el) return;
      const fn = taskInlinePropEditFns[k];
      if (fn) el.addEventListener('click', (ev) => { ev.stopPropagation(); fn(el.querySelector('.chip-value')); });
    });
    container.querySelector('.prop-chips-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPropSectionManager(e.currentTarget, 'task', () => showTaskSlideover(taskId));
    });
  });
  setSlideoverExpand(() => openEntityFullscreen('task', taskId, task.title, (t) => patchTask({ title: t })));
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

  document.getElementById('chip-status')?.addEventListener('click', (e) => {
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
  });

  document.getElementById('chip-priority')?.addEventListener('click', (e) => {
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
  });

  document.getElementById('chip-due')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openDateRangePickerGlobal(
      e.currentTarget,
      stripDate(task.start_date),
      stripDate(task.due_date),
      async (start, end) => {
        const chipVal = document.getElementById('chip-due-val');
        if (chipVal) chipVal.textContent = fmtDateRange(start, end) || '—';
        await patchTask({ start_date: start || null, due_date: end || start || null });
      }
    );
  });

  document.getElementById('chip-focus')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openDateRangePickerGlobal(
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
  });

  document.getElementById('chip-tags')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const curIds = tags.map(t => t.id);
    openCombo(e.currentTarget, items, null, async ({ multiIds, create }) => {
      if (create) {
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
  });

  // Extra heading chips (props moved from body → heading)
  taskExtraHeadKeys.forEach(k => {
    const el = document.getElementById(`chip-extra-${k}`);
    if (!el) return;
    const fn = taskInlinePropEditFns[k];
    if (fn) el.addEventListener('click', (e) => { e.stopPropagation(); fn(el.querySelector('.chip-value')); });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();
    openPropSectionManager(e.currentTarget, 'task', () => showTaskSlideover(taskId));
  };

  document.getElementById('add-subtask-btn').onclick = () => {
    showNewTaskModal({ parent_task_id: parseInt(taskId), status: 'todo', priority: 'medium',
      goal_id: task.goal_id || null, project_id: task.project_id || null, sprint_id: task.sprint_id || null }, async () => {
      allTasksCache = await api('GET', '/api/tasks?all=1');
      allTasksFull = allTasksCache;
      renderSubtaskTable();
    });
  };

  document.getElementById('task-pomodoro-toggle').onchange = async (e) => {
    await patchTask({ pomodoro: e.target.checked });
    showTaskSlideover(taskId);
  };

  if (task.pomodoro) {
    document.getElementById('log-pom-btn').onclick = async () => {
      await patchTask({ pomodoros_finished: pomDone + 1 });
      showTaskSlideover(taskId);
    };
  }

  document.getElementById('task-export-btn').onclick = () =>
    showJSONModal(`/api/export/task/${taskId}`, `task-${task.title.replace(/\s+/g,'-')}.json`);

  document.getElementById('task-delete-btn').onclick = () => deleteEntity('task', taskId);

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
      <h1 class="view-title">${navIcon('calendar')}Calendar</h1>
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
  const pomTasks = allTasksCache.filter(t => t.pomodoro);

  document.getElementById('main-content').innerHTML = `<div class="view pom-view">
    <div class="view-header">
      <h1 class="view-title">${navIcon('pomodoro')}Pomodoro</h1>
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
        const freshTasks = allTasksCache.filter(t => t.pomodoro);
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
        const freshTasks = allTasksCache.filter(tt => tt.pomodoro);
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
  bindCtxHandles();
  document.querySelectorAll('.task-row').forEach(row => {
    row.onclick = (e) => {
      if (e.target.classList.contains('task-check') || e.target.dataset.checkId ||
          e.target.classList.contains('task-toggle-arrow') || e.target.closest('.task-toggle-arrow') ||
          e.target.classList.contains('task-add-sub-btn') || e.target.closest('.task-add-sub-btn') ||
          e.target.closest('.ctx-handle')) return;
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
        const pt = (allTasksCache || []).find(t => t.id === parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium',
          goal_id: pt?.goal_id || null, project_id: pt?.project_id || null, sprint_id: pt?.sprint_id || null }, async () => {
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
        const pt = (allTasksCache || []).find(t => t.id === parentId);
        showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium',
          goal_id: pt?.goal_id || null, project_id: pt?.project_id || null, sprint_id: pt?.sprint_id || null }, async () => {
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
      const pt = (allTasksCache || []).find(t => t.id === parentId);
      showNewTaskModal({ parent_task_id: parentId, status: 'todo', priority: 'medium',
        goal_id: pt?.goal_id || null, project_id: pt?.project_id || null, sprint_id: pt?.sprint_id || null }, async () => {
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
        ${singleDateChipHtml('t-due', stripDate(v.due_date))}
      </div>
      <div id="t-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        ${rangeDateChipHtml('t-start', stripDate(v.start_date), 't-due-range', stripDate(v.due_date))}
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Focus Block</label>${singleDateChipHtml('t-focus', stripDate(v.focus_block))}</div>
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
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label class="toggle-switch">
          <input type="checkbox" id="t-is-recurring" ${(v.recur_interval||0)>0?'checked':''} />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-label">Repeating task</span>
        </label>
        <div id="recur-fields" style="display:${(v.recur_interval||0)>0?'flex':'none'};gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--text-muted)">Every</span>
          <input type="number" id="t-recur-interval" value="${v.recur_interval||1}" min="1" style="width:56px" />
          <select id="t-recur-unit">
            ${['days','weeks','months','years'].map(u => `<option value="${u}" ${(v.recur_unit||'').toLowerCase()===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    ${(() => {
      const customDefs = getCustomPropDefs('task');
      if (!customDefs.length) return '';
      const fields = customDefs.map(def => {
        const existing = (v.id != null) ? (getCustomPropValues('task', v.id)[def.key] ?? '') : '';
        let input;
        if (def.type === 'checkbox') {
          input = `<input type="checkbox" id="t-cp-${def.key}" ${existing?'checked':''} style="width:auto;margin-top:4px">`;
        } else if (def.type === 'date') {
          input = singleDateChipHtml(`t-cp-${def.key}`, existing);
        } else if (def.type === 'number') {
          input = `<input type="number" id="t-cp-${def.key}" value="${existing}" min="0">`;
        } else {
          input = `<input type="text" id="t-cp-${def.key}" value="${(String(existing)).replace(/"/g,'&quot;')}" placeholder="${def.label}">`;
        }
        return `<div class="form-group"><label class="form-label">${def.label}</label>${input}</div>`;
      }).join('');
      return `<div id="t-custom-props-section" style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Custom Properties</div>
        ${fields}
      </div>`;
    })()}
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
  bindModalDateChips();
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  bindDateModeToggle('t-date-due-wrap', 't-date-range-wrap');
  document.getElementById('t-is-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recur-fields').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { showToast('Title is required', 'error'); return; }
    const newTask = await api('POST', '/api/tasks', data);
    // Save custom prop values if any were filled
    if (newTask && newTask.id) {
      getCustomPropDefs('task').forEach(def => {
        const el = document.getElementById(`t-cp-${def.key}`);
        if (!el) return;
        const val = def.type === 'checkbox' ? el.checked : el.value;
        if (val !== '' && val !== false) setCustomPropValue('task', newTask.id, def.key, val);
      });
    }
    closeFormSlideover();
    if (afterSave) afterSave(); else renderView(currentView);
  };
}

async function showEditTaskModal(task) {
  const resources = await getTaskModalResources();
  openFormSlideover('Edit Task', taskModalBody(task, resources));
  bindModalDateChips();
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  bindDateModeToggle('t-date-due-wrap', 't-date-range-wrap');
  document.getElementById('t-is-recurring')?.addEventListener('change', (e) => {
    document.getElementById('recur-fields').style.display = e.target.checked ? 'flex' : 'none';
  });
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = collectTaskForm();
    if (!data.title) { showToast('Title is required', 'error'); return; }
    await api('PATCH', `/api/tasks/${task.id}`, data);
    // Save custom prop values
    getCustomPropDefs('task').forEach(def => {
      const el = document.getElementById(`t-cp-${def.key}`);
      if (!el) return;
      const val = def.type === 'checkbox' ? el.checked : el.value;
      setCustomPropValue('task', task.id, def.key, val);
    });
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
        ${singleDateChipHtml('g-due', stripDate(v.due_date))}
      </div>
      <div id="g-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        ${rangeDateChipHtml('g-start', stripDate(v.start_date), 'g-due-range', stripDate(v.due_date))}
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
  bindModalDateChips();
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
    if (!data.title) { showToast('Title is required', 'error'); return; }
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
  const projectId = project.id;
  openSlideover('Project Detail', '<div class="loading">Loading…</div>');

  let p;
  try { p = await api('GET', `/api/projects/${projectId}`); } catch(e) { return; }
  if (!goals || !goals.length) {
    try { goals = await api('GET', '/api/goals'); } catch(e) { goals = []; }
  }

  const tags = p.tags || [];
  const tasks = (p.tasks || []).filter(t => !t.parent_task_id);

  async function patchProject(data) {
    try { await api('PATCH', `/api/projects/${projectId}`, data); } catch(e) { return; }
    if (afterSave) afterSave();
  }

  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const catName = allCategories ? (allCategories.find(c => String(c.id) === String(p.category_id)) || {}).name : null;
  const goalName = goals.find(g => String(g.id) === String(p.goal_id))?.title || null;

  const projSections = getPropSections('project');
  const projIsInHead = (k) => projSections.heading.includes(k);
  const PROJ_CHIP_KEYS = ['status','due','goal','tags'];
  const projExtraHeadKeys = projSections.heading.filter(k => !PROJ_CHIP_KEYS.includes(k));

  const allProjBuiltinDefs = [
    { key: 'status',   label: 'Status',    icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => statusBadge(p.status||'active') },
    { key: 'due',      label: 'Due Date',  icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => fmtDate(p.due_date) ? `<span>${fmtDate(p.due_date)}</span>` : '' },
    { key: 'goal',     label: 'Goals',     icon: pIco('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
      renderValue: () => renderMultiRelationValue('project', projectId, 'goal', goalName) },
    { key: 'tags',     label: 'Tags',      icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '' },
    { key: 'category', label: 'Category',  icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => catName ? `<span>${catName}</span>` : '' },
    { key: 'macro',    label: 'Macro Area',icon: pIco('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
      renderValue: () => p.macro_area ? `<span>${p.macro_area.split('(')[0].trim()}</span>` : '' },
    { key: 'kanban',   label: 'Kanban Col',icon: pIco('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>'),
      renderValue: () => p.kanban_col ? `<span>${p.kanban_col}</span>` : '' },
    { key: 'archived', label: 'Archived',  icon: pIco('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'),
      renderValue: () => p.archived ? `<span>Yes</span>` : '' },
  ];
  const projBodyDefs = allProjBuiltinDefs.filter(d => projSections.body.includes(d.key));
  await loadEntityCustomProps('project', projectId);
  const projInlinePropPanel = buildInlinePropPanel('project', projectId, projBodyDefs);

  const goalCrumb = goalName
    ? `<div class="detail-bc-prefix"><span class="bc-part bc-goal" data-goal-id="${p.goal_id}" style="cursor:pointer">${goalName}</span></div>`
    : '';

  const taskRows = tasks.map(t =>
    `<li class="task-row" data-task-id="${t.id}" style="cursor:pointer">
      <div class="task-check ${t.status==='done'?'done':''}" data-check-id="${t.id}">${t.status==='done'?'✓':''}</div>
      <div class="task-content"><div class="task-title">${t.title}</div></div>
      ${statusBadge(t.status)}
    </li>`
  ).join('') || '<li style="padding:8px;color:var(--text-muted);font-size:13px">No tasks</li>';

  const body = `
    <button class="entity-icon-add-btn" id="proj-icon-add-btn">
      <span id="proj-icon-display"></span>
      <span id="proj-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      ${goalCrumb}
      <textarea class="detail-title-input" id="detail-title" rows="1">${(p.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      ${projIsInHead('status') ? `<button class="prop-chip" id="chip-status" data-key="status"><span class="chip-label">Status</span><span class="chip-value">${(p.status||'active').replace('_',' ')}</span></button>` : ''}
      ${projIsInHead('due') ? `<button class="prop-chip" id="chip-due" data-key="due"><span class="chip-label">Due</span><span class="chip-value" id="chip-due-val">${fmtDate(p.due_date) || '—'}</span></button>` : ''}
      ${projIsInHead('goal') ? `<button class="prop-chip" id="chip-goal" data-key="goal"><span class="chip-label">Goal</span><span class="chip-value" id="chip-goal-val">${goalName || '—'}</span></button>` : ''}
      ${projIsInHead('tags') ? `<button class="prop-chip" id="chip-tags" data-key="tags"><span class="chip-label">Tags</span><span class="chip-value" id="chip-tags-val">${tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span></button>` : ''}
      ${projExtraHeadKeys.map(k => { const def = allProjBuiltinDefs.find(d => d.key === k); if (!def) return ''; return `<button class="prop-chip" id="chip-extra-${k}" data-key="${k}"><span class="chip-label">${def.label}</span><span class="chip-value">${def.renderValue() || '—'}</span></button>`; }).join('')}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${projInlinePropPanel}

    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="detail-desc" style="width:100%;min-height:80px">${p.description || ''}</textarea>
    </div>

    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Tasks (${tasks.length})</span>
        <button class="btn btn-sm btn-ghost" id="proj-open-detail-btn">Open Full View ⤢</button>
      </div>
      <ul class="task-list" id="proj-task-list">${taskRows}</ul>
    </div>

    ${buildEntityViewsSection('project', projectId)}

    ${buildCommentSection('project', projectId)}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="proj-export-btn">Export JSON</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" id="proj-delete-btn">Delete</button>
    </div>
  `;

  openSlideover(p.title, body);
  setSlideoverExport('project', p.id);
  initSlideoverCoverArea('project', p.id);

  // Icon
  const projIconAddBtn = document.getElementById('proj-icon-add-btn');
  const projIconDisplay = document.getElementById('proj-icon-display');
  const projIconAddLabel = document.getElementById('proj-icon-add-label');
  loadEntityIcon('project', projectId).then(icon => {
    if (icon) { projIconDisplay.innerHTML = renderEntityIcon(icon, 32); projIconDisplay.dataset.icon = icon; projIconAddLabel.textContent = ''; }
  });
  projIconAddBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = projIconDisplay.dataset.icon || '';
    showIconPicker(projIconAddBtn, 'project', projectId, cur, (newIcon) => {
      projIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      projIconDisplay.dataset.icon = newIcon || '';
      projIconAddLabel.innerHTML = newIcon ? '' : ACT_ICONS.addIcon + 'Add icon';
      saveEntityIcon('project', projectId, newIcon);
    });
  };

  // Title
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => { titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px'; });
  titleTA.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (e) => { if (e.target.value.trim()) patchProject({ title: e.target.value.trim() }); };

  document.getElementById('detail-desc').onblur = (e) => patchProject({ description: e.target.value });

  // Breadcrumb goal nav
  document.querySelector('.bc-goal')?.addEventListener('click', () => { closeSlideover(); renderView('goal-detail', p.goal_id); });

  // Prop chips
  document.getElementById('chip-status')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openValuePicker(e.currentTarget, PROJECT_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })), async (val) => {
      const el = document.getElementById('chip-status'); if (el) el.querySelector('.chip-value').textContent = val.replace('_',' ');
      await patchProject({ status: val });
    });
  });
  document.getElementById('chip-due')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openDateRangePickerGlobal(e.currentTarget, stripDate(p.start_date), stripDate(p.due_date), async (start, end) => {
      await patchProject({ start_date: start || null, due_date: end || null });
      const v = document.getElementById('chip-due-val'); if (v) v.textContent = end ? fmtDate(end) : (start ? fmtDate(start) : '—');
    });
  });
  document.getElementById('chip-goal')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openValuePicker(e.currentTarget, [{ value: '', label: '— none —' }, ...(goals||[]).map(g => ({ value: g.id, label: g.title }))], async (val) => {
      const v = document.getElementById('chip-goal-val'); if (v) v.textContent = val ? (goals||[]).find(g => String(g.id) === String(val))?.title || val : '—';
      await patchProject({ goal_id: val ? parseInt(val) : null });
    });
  });
  document.getElementById('chip-tags')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const _items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const _curIds = tags.map(t => t.id);
    openCombo(e.currentTarget, _items, null, async ({ multiIds, create }) => {
      if (create) {
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          const updIds = [...new Set([..._curIds, newTag.id])];
          await api('PUT', `/api/projects/${projectId}/tags`, { tag_ids: updIds });
        } catch(err) {}
        closeCombo();
        showProjectSlideover({ id: projectId }, goals, afterSave);
        return;
      }
      const ids = (multiIds || []).map(Number);
      const sel = allTags.filter(t => ids.includes(t.id));
      const v = document.getElementById('chip-tags-val'); if (v) v.innerHTML = sel.length ? sel.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      await api('PUT', `/api/projects/${projectId}/tags`, { tag_ids: ids });
      if (afterSave) afterSave();
    }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
  });

  // Extra heading chips
  const projInlinePropEditFns = {
    status:   (valEl) => { openValuePicker(valEl, PROJECT_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })), async (val) => { await patchProject({ status: val }); showProjectSlideover({ id: projectId }, goals, afterSave); }); },
    due:      (valEl) => { openDateRangePickerGlobal(valEl, stripDate(p.start_date), stripDate(p.due_date), async (start, end) => { await patchProject({ start_date: start||null, due_date: end||null }); showProjectSlideover({ id: projectId }, goals, afterSave); }); },
    goal:     (valEl) => openMultiRelationPicker(valEl, 'project', projectId, 'goal', 'goal', goals||[], p, patchProject, 'goal_id', () => showProjectSlideover({ id: projectId }, goals, afterSave)),
    tags:     (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = tags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/projects/${projectId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); showProjectSlideover({ id: projectId }, goals, afterSave); return; } await api('PUT', `/api/projects/${projectId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); showProjectSlideover({ id: projectId }, goals, afterSave); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    category: async (valEl) => { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} openValuePicker(valEl, [{ value:'', label:'— none —' }, ...(allCategories||[]).map(c => ({ value: c.id, label: c.name }))], async (val) => { await patchProject({ category_id: val ? parseInt(val) : null }); showProjectSlideover({ id: projectId }, goals, afterSave); }); },
    macro:    (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...MACRO_AREAS.map(m => ({ value: m, label: m.split('(')[0].trim() }))], async (val) => { await patchProject({ macro_area: val||null }); showProjectSlideover({ id: projectId }, goals, afterSave); }); },
    kanban:   (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...KANBAN_COLS.map(k => ({ value: k, label: k }))], async (val) => { await patchProject({ kanban_col: val||null }); showProjectSlideover({ id: projectId }, goals, afterSave); }); },
    archived: (valEl) => { patchProject({ archived: !p.archived }).then(() => showProjectSlideover({ id: projectId }, goals, afterSave)); },
  };
  projExtraHeadKeys.forEach(k => {
    const el = document.getElementById(`chip-extra-${k}`);
    if (!el) return;
    const fn = projInlinePropEditFns[k];
    if (fn) el.addEventListener('click', (e) => { e.stopPropagation(); fn(el.querySelector('.chip-value')); });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();
    openPropSectionManager(e.currentTarget, 'project', () => showProjectSlideover({ id: projectId }, goals, afterSave));
  };

  // Inline prop panel
  bindInlinePropPanel('project', projectId, projInlinePropEditFns, () => showProjectSlideover({ id: projectId }, goals, afterSave));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="project"]'));
  initEntityViewsSection('project', projectId, p);
  setSlideoverExpand(() => { closeSlideover(); renderView('project-detail', projectId); });

  // Task rows click → task sideview
  document.querySelectorAll('#proj-task-list [data-task-id]').forEach(el => {
    el.onclick = () => showTaskSlideover(el.dataset.taskId);
  });

  document.getElementById('proj-open-detail-btn').onclick = () => { closeSlideover(); renderView('project-detail', projectId); };
  document.getElementById('proj-export-btn').onclick = () => showJSONModal(`/api/export/project/${projectId}`, `project-${projectId}.json`);
  document.getElementById('proj-delete-btn').onclick = () => deleteEntity('project', projectId);
}

/* ─── Goal Slideover (auto-save, expand to detail) ──────────────────── */
async function showGoalSlideover(goal, afterSave) {
  if (!goal?.id) { showGoalModal(goal, afterSave); return; }
  const goalId = goal.id;
  openSlideover('Goal Detail', '<div class="loading">Loading…</div>');

  let g;
  try { g = await api('GET', `/api/goals/${goalId}`); } catch(e) { return; }

  const tags = g.tags || [];
  const projects = g.projects || [];

  async function patchGoal(data) {
    try { await api('PATCH', `/api/goals/${goalId}`, data); } catch(e) { return; }
    if (afterSave) afterSave();
  }

  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const catName = allCategories ? (allCategories.find(c => String(c.id) === String(g.category_id)) || {}).name : null;

  const goalSections = getPropSections('goal');
  const goalIsInHead = (k) => goalSections.heading.includes(k);
  const GOAL_CHIP_KEYS = ['status','type','year','tags'];
  const goalExtraHeadKeys = goalSections.heading.filter(k => !GOAL_CHIP_KEYS.includes(k));

  const allGoalBuiltinDefs = [
    { key: 'status',   label: 'Status',   icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => statusBadge(g.status||'active') },
    { key: 'type',     label: 'Type',     icon: pIco('<path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>'),
      renderValue: () => g.type ? `<span>${g.type}</span>` : '' },
    { key: 'year',     label: 'Year',     icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => g.year ? `<span>${g.year}</span>` : '' },
    { key: 'tags',     label: 'Tags',     icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '' },
    { key: 'category', label: 'Category', icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => catName ? `<span>${catName}</span>` : '' },
    { key: 'due',      label: 'Due Date', icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => g.due_date ? `<span>${fmtDate(g.due_date)}</span>` : '' },
    { key: 'metrics',  label: 'Metrics',  icon: pIco('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
      renderValue: () => g.target != null ? `<span>${g.current_value ?? '—'}/${g.target}</span>` : '' },
  ];
  const goalBodyDefs = allGoalBuiltinDefs.filter(d => goalSections.body.includes(d.key));
  await loadEntityCustomProps('goal', goalId);
  const goalInlinePropPanel = buildInlinePropPanel('goal', goalId, goalBodyDefs);

  const projRows = projects.map(p =>
    `<div class="note-card" data-proj-id="${p.id}" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:6px;padding:8px 10px">
      <span>${p.title}</span>
      <span>${statusBadge(p.status)}</span>
    </div>`
  ).join('') || '<div style="color:var(--text-muted);font-size:13px">No linked projects</div>';

  const body = `
    <button class="entity-icon-add-btn" id="goal-icon-add-btn">
      <span id="goal-icon-display"></span>
      <span id="goal-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      <textarea class="detail-title-input" id="detail-title" rows="1">${(g.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      ${goalIsInHead('status') ? `<button class="prop-chip" id="chip-status" data-key="status"><span class="chip-label">Status</span><span class="chip-value">${(g.status||'active').replace('_',' ')}</span></button>` : ''}
      ${goalIsInHead('type') ? `<button class="prop-chip" id="chip-type" data-key="type"><span class="chip-label">Type</span><span class="chip-value" id="chip-type-val">${g.type || '—'}</span></button>` : ''}
      ${goalIsInHead('year') ? `<button class="prop-chip" id="chip-year" data-key="year"><span class="chip-label">Year</span><span class="chip-value" id="chip-year-val">${g.year || '—'}</span></button>` : ''}
      ${goalIsInHead('tags') ? `<button class="prop-chip" id="chip-tags" data-key="tags"><span class="chip-label">Tags</span><span class="chip-value" id="chip-tags-val">${tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span></button>` : ''}
      ${goalExtraHeadKeys.map(k => { const def = allGoalBuiltinDefs.find(d => d.key === k); if (!def) return ''; return `<button class="prop-chip" id="chip-extra-${k}" data-key="${k}"><span class="chip-label">${def.label}</span><span class="chip-value">${def.renderValue() || '—'}</span></button>`; }).join('')}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${goalInlinePropPanel}

    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="detail-desc" style="width:100%;min-height:80px">${g.description || ''}</textarea>
    </div>

    <div class="subtask-section">
      <div class="subtask-section-title">
        <span>Projects (${projects.length})</span>
        <button class="btn btn-sm btn-ghost" id="goal-open-detail-btn">Open Full View ⤢</button>
      </div>
      <div id="goal-proj-list">${projRows}</div>
    </div>

    ${buildEntityViewsSection('goal', goalId)}

    ${buildCommentSection('goal', goalId)}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="goal-export-btn">Export JSON</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" id="goal-delete-btn">Delete</button>
    </div>
  `;

  openSlideover(g.title, body);
  setSlideoverExport('goal', g.id);
  initSlideoverCoverArea('goal', g.id);

  // Icon
  const goalIconAddBtn = document.getElementById('goal-icon-add-btn');
  const goalIconDisplay = document.getElementById('goal-icon-display');
  const goalIconAddLabel = document.getElementById('goal-icon-add-label');
  loadEntityIcon('goal', goalId).then(icon => {
    if (icon) { goalIconDisplay.innerHTML = renderEntityIcon(icon, 32); goalIconDisplay.dataset.icon = icon; goalIconAddLabel.textContent = ''; }
  });
  goalIconAddBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = goalIconDisplay.dataset.icon || '';
    showIconPicker(goalIconAddBtn, 'goal', goalId, cur, (newIcon) => {
      goalIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      goalIconDisplay.dataset.icon = newIcon || '';
      goalIconAddLabel.innerHTML = newIcon ? '' : ACT_ICONS.addIcon + 'Add icon';
      saveEntityIcon('goal', goalId, newIcon);
    });
  };

  // Title
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => { titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px'; });
  titleTA.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (e) => { if (e.target.value.trim()) patchGoal({ title: e.target.value.trim() }); };

  // Description
  document.getElementById('detail-desc').onblur = (e) => patchGoal({ description: e.target.value });

  // Prop chips
  document.getElementById('chip-status')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openValuePicker(e.currentTarget, GOAL_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })), async (val) => {
      const el = document.getElementById('chip-status'); if (el) el.querySelector('.chip-value').textContent = val.replace('_',' ');
      await patchGoal({ status: val });
    });
  });
  document.getElementById('chip-type')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openValuePicker(e.currentTarget, [{ value: '', label: '— none —' }, ...GOAL_TYPES.map(t => ({ value: t, label: t }))], async (val) => {
      const v = document.getElementById('chip-type-val'); if (v) v.textContent = val || '—';
      await patchGoal({ type: val || null });
    });
  });
  document.getElementById('chip-year')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openValuePicker(e.currentTarget, [{ value: '', label: '— none —' }, ...GOAL_YEARS.map(y => ({ value: y, label: y }))], async (val) => {
      const v = document.getElementById('chip-year-val'); if (v) v.textContent = val || '—';
      await patchGoal({ year: val || null });
    });
  });
  document.getElementById('chip-tags')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const _items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const _curIds = tags.map(t => t.id);
    openCombo(e.currentTarget, _items, null, async ({ multiIds, create }) => {
      if (create) {
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          await api('PUT', `/api/goals/${goalId}/tags`, { tag_ids: [...new Set([..._curIds, newTag.id])] });
        } catch(err) {}
        closeCombo();
        showGoalSlideover({ id: goalId }, afterSave);
        return;
      }
      const ids = (multiIds || []).map(Number);
      const sel = allTags.filter(t => ids.includes(t.id));
      const v = document.getElementById('chip-tags-val'); if (v) v.innerHTML = sel.length ? sel.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      await api('PUT', `/api/goals/${goalId}/tags`, { tag_ids: ids });
      if (afterSave) afterSave();
    }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
  });

  const goalInlinePropEditFns = {
    status:   (valEl) => { openValuePicker(valEl, GOAL_STATUSES.map(s => ({ value: s, label: s.replace('_',' ') })), async (val) => { await patchGoal({ status: val }); showGoalSlideover({ id: goalId }, afterSave); }); },
    type:     (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...GOAL_TYPES.map(t => ({ value: t, label: t }))], async (val) => { await patchGoal({ type: val||null }); showGoalSlideover({ id: goalId }, afterSave); }); },
    year:     (valEl) => { openValuePicker(valEl, [{ value:'', label:'— none —' }, ...GOAL_YEARS.map(y => ({ value: y, label: y }))], async (val) => { await patchGoal({ year: val||null }); showGoalSlideover({ id: goalId }, afterSave); }); },
    tags:     (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = tags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/goals/${goalId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); showGoalSlideover({ id: goalId }, afterSave); return; } await api('PUT', `/api/goals/${goalId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); showGoalSlideover({ id: goalId }, afterSave); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    category: async (valEl) => { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} openValuePicker(valEl, [{ value:'', label:'— none —' }, ...(allCategories||[]).map(c => ({ value: c.id, label: c.name }))], async (val) => { await patchGoal({ category_id: val ? parseInt(val) : null }); showGoalSlideover({ id: goalId }, afterSave); }); },
    due:      (valEl) => { openSingleDatePickerGlobal(valEl, stripDate(g.due_date), async (val) => { await patchGoal({ due_date: val||null }); showGoalSlideover({ id: goalId }, afterSave); }); },
    metrics:  (valEl) => {
      valEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px">
        <input type="number" placeholder="Start" value="${g.start_value??''}" id="gm-sv" style="width:70px;font-size:12px;padding:2px 5px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-card);color:var(--text)">
        <input type="number" placeholder="Current" value="${g.current_value??''}" id="gm-cv" style="width:70px;font-size:12px;padding:2px 5px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-card);color:var(--text)">
        <input type="number" placeholder="Target" value="${g.target??''}" id="gm-t" style="width:70px;font-size:12px;padding:2px 5px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-card);color:var(--text)">
      </div>`;
      document.getElementById('gm-sv')?.focus();
      const save = async () => {
        const sv = parseFloat(document.getElementById('gm-sv')?.value); const cv = parseFloat(document.getElementById('gm-cv')?.value); const t = parseFloat(document.getElementById('gm-t')?.value);
        await patchGoal({ start_value: isNaN(sv)?null:sv, current_value: isNaN(cv)?null:cv, target: isNaN(t)?null:t });
        showGoalSlideover({ id: goalId }, afterSave);
      };
      ['gm-sv','gm-cv','gm-t'].forEach(id => { document.getElementById(id)?.addEventListener('blur', () => setTimeout(save, 150)); document.getElementById(id)?.addEventListener('keydown', e => { if (e.key==='Enter') save(); }); });
    },
  };

  goalExtraHeadKeys.forEach(k => {
    const el = document.getElementById(`chip-extra-${k}`);
    if (!el) return;
    const fn = goalInlinePropEditFns[k];
    if (fn) el.addEventListener('click', (e) => { e.stopPropagation(); fn(el.querySelector('.chip-value')); });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();
    openPropSectionManager(e.currentTarget, 'goal', () => showGoalSlideover({ id: goalId }, afterSave));
  };

  // Inline prop panel
  bindInlinePropPanel('goal', goalId, goalInlinePropEditFns, () => showGoalSlideover({ id: goalId }, afterSave));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="goal"]'));
  initEntityViewsSection('goal', goalId, g);
  setSlideoverExpand(() => { closeSlideover(); renderView('goal-detail', goalId); });

  // Project cards nav
  document.querySelectorAll('#goal-proj-list [data-proj-id]').forEach(el => {
    el.onclick = () => { closeSlideover(); renderView('project-detail', el.dataset.projId); };
  });

  document.getElementById('goal-open-detail-btn').onclick = () => { closeSlideover(); renderView('goal-detail', goalId); };
  document.getElementById('goal-export-btn').onclick = () => showJSONModal(`/api/export/goal/${goalId}`, `goal-${goalId}.json`);
  document.getElementById('goal-delete-btn').onclick = () => deleteEntity('goal', goalId);
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
        ${singleDateChipHtml('p-due', stripDate(v.due_date))}
      </div>
      <div id="p-date-range-wrap" class="date-range-row" style="${!v.start_date ? 'display:none' : 'margin-top:6px'}">
        ${rangeDateChipHtml('p-start', stripDate(v.start_date), 'p-due-range', stripDate(v.due_date))}
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
  bindModalDateChips();
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
    if (!data.title) { showToast('Title is required', 'error'); return; }
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
  // Existing notes open the detail sideview; new notes use the form
  if (v.id) { showNoteSlideover(v.id, afterSave); return; }

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

  const body = `
    <div class="form-group"><label class="form-label">Title *</label>
      <input type="text" id="n-title" value="${(v.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-group"><label class="form-label">Body</label>
      <textarea id="n-body" style="min-height:120px">${v.body||''}</textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select id="n-category">${catOpts}</select></div>
      <div class="form-group"><label class="form-label">Note Date</label>${singleDateChipHtml('n-date', v.note_date||'')}</div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Goal</label><select id="n-goal">${goalOpts}</select></div>
      <div class="form-group"><label class="form-label">Project</label><select id="n-project">${projOpts}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Task</label><select id="n-task">${taskOpts}</select></div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>`;

  openFormSlideover('New Note', body);
  bindModalDateChips();
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('modal-save-btn').onclick = async () => {
    const data = {
      title: document.getElementById('n-title').value.trim(),
      body: document.getElementById('n-body').value,
      category_id: document.getElementById('n-category').value ? parseInt(document.getElementById('n-category').value) : null,
      note_date: document.getElementById('n-date').value || null,
      goal_id: document.getElementById('n-goal').value ? parseInt(document.getElementById('n-goal').value) : null,
      project_id: document.getElementById('n-project').value ? parseInt(document.getElementById('n-project').value) : null,
      task_id: document.getElementById('n-task').value ? parseInt(document.getElementById('n-task').value) : null,
      ...(v.task_id && { task_id: parseInt(v.task_id) }),
      ...(v.project_id && { project_id: parseInt(v.project_id) }),
      ...(v.goal_id && { goal_id: parseInt(v.goal_id) }),
    };
    if (!data.title) { showToast('Title is required', 'error'); return; }
    try {
      await api('POST', '/api/notes', data);
      closeFormSlideover();
      if (afterSave) afterSave(); else renderNotes();
    } catch(err) { showToast('Error saving note: ' + (err.message || String(err)), 'error'); }
  };
}

/* ─── Note Sideview (task-sideview style for existing notes) ─────────── */
async function showNoteSlideover(noteId, afterSave) {
  openSlideover('Note Detail', '<div class="loading">Loading…</div>');

  let n, projects = [], goals = [];
  try {
    [n, projects, goals] = await Promise.all([
      api('GET', `/api/notes/${noteId}`),
      api('GET', '/api/projects'),
      api('GET', '/api/goals'),
    ]);
  } catch(e) { return; }

  const tags = n.tags || [];

  async function patchNote(data) {
    try { await api('PATCH', `/api/notes/${noteId}`, data); } catch(e) { return; }
    if (afterSave) afterSave();
  }

  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const catName = allCategories ? (allCategories.find(c => String(c.id) === String(n.category_id)) || {}).name : null;
  const projName = projects.find(p => String(p.id) === String(n.project_id))?.title || null;
  const goalName = goals.find(g => String(g.id) === String(n.goal_id))?.title || null;

  const noteSections = getPropSections('note');
  const noteIsInHead = (k) => noteSections.heading.includes(k);
  const NOTE_CHIP_KEYS = ['date','project','goal','tags'];
  const noteExtraHeadKeys = noteSections.heading.filter(k => !NOTE_CHIP_KEYS.includes(k));

  const allNoteBuiltinDefs = [
    { key: 'date',     label: 'Date',     icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => n.note_date ? `<span>${fmtDate(n.note_date)}</span>` : '' },
    { key: 'project',  label: 'Projects', icon: pIco('<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'),
      renderValue: () => renderMultiRelationValue('note', noteId, 'project', projName) },
    { key: 'goal',     label: 'Goals',    icon: pIco('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
      renderValue: () => renderMultiRelationValue('note', noteId, 'goal', goalName) },
    { key: 'tags',     label: 'Tags',     icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '' },
    { key: 'category', label: 'Category', icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => catName ? `<span>${catName}</span>` : '' },
  ];
  const noteBodyDefs = allNoteBuiltinDefs.filter(d => noteSections.body.includes(d.key));
  await loadEntityCustomProps('note', noteId);
  const noteInlinePropPanel = buildInlinePropPanel('note', noteId, noteBodyDefs);

  const body = `
    <button class="entity-icon-add-btn" id="note-icon-add-btn">
      <span id="note-icon-display"></span>
      <span id="note-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      <textarea class="detail-title-input" id="detail-title" rows="1">${(n.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      ${noteIsInHead('date') ? `<button class="prop-chip" id="chip-date" data-key="date"><span class="chip-label">Date</span><span class="chip-value" id="chip-date-val">${fmtDate(n.note_date) || '—'}</span></button>` : ''}
      ${noteIsInHead('project') ? `<button class="prop-chip" id="chip-project" data-key="project"><span class="chip-label">Project</span><span class="chip-value" id="chip-project-val">${projName || '—'}</span></button>` : ''}
      ${noteIsInHead('goal') ? `<button class="prop-chip" id="chip-goal" data-key="goal"><span class="chip-label">Goal</span><span class="chip-value" id="chip-goal-val">${goalName || '—'}</span></button>` : ''}
      ${noteIsInHead('tags') ? `<button class="prop-chip" id="chip-tags" data-key="tags"><span class="chip-label">Tags</span><span class="chip-value" id="chip-tags-val">${tags.length ? tags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span></button>` : ''}
      ${noteExtraHeadKeys.map(k => { const def = allNoteBuiltinDefs.find(d => d.key === k); if (!def) return ''; return `<button class="prop-chip" id="chip-extra-${k}" data-key="${k}"><span class="chip-label">${def.label}</span><span class="chip-value">${def.renderValue() || '—'}</span></button>`; }).join('')}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${noteInlinePropPanel}

    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Content</label>
      <textarea id="detail-body" style="width:100%;min-height:200px">${n.body || ''}</textarea>
    </div>

    ${buildEntityViewsSection('note', noteId)}

    ${buildCommentSection('note', noteId)}
    ${buildRichContentSection('note', noteId)}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="note-export-btn">Export JSON</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" id="note-delete-btn">Delete</button>
    </div>
  `;

  openSlideover(n.title || 'Note', body);
  setSlideoverExport('note', n.id);
  initSlideoverCoverArea('note', n.id);

  // Icon
  const noteIconAddBtn = document.getElementById('note-icon-add-btn');
  const noteIconDisplay = document.getElementById('note-icon-display');
  const noteIconAddLabel = document.getElementById('note-icon-add-label');
  loadEntityIcon('note', noteId).then(icon => {
    if (icon) { noteIconDisplay.innerHTML = renderEntityIcon(icon, 32); noteIconDisplay.dataset.icon = icon; noteIconAddLabel.textContent = ''; }
  });
  noteIconAddBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = noteIconDisplay.dataset.icon || '';
    showIconPicker(noteIconAddBtn, 'note', noteId, cur, (newIcon) => {
      noteIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      noteIconDisplay.dataset.icon = newIcon || '';
      noteIconAddLabel.innerHTML = newIcon ? '' : ACT_ICONS.addIcon + 'Add icon';
      saveEntityIcon('note', noteId, newIcon);
    });
  };

  // Title
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => { titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px'; });
  titleTA.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (e) => { if (e.target.value.trim()) patchNote({ title: e.target.value.trim() }); };

  // Body
  let bodyTimer = null;
  document.getElementById('detail-body').addEventListener('input', () => {
    clearTimeout(bodyTimer);
    bodyTimer = setTimeout(() => patchNote({ body: document.getElementById('detail-body').value }), 800);
  });

  // Prop chips
  document.getElementById('chip-date')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openSingleDatePickerGlobal(e.currentTarget, stripDate(n.note_date), async (val) => {
      const v = document.getElementById('chip-date-val'); if (v) v.textContent = val ? fmtDate(val) : '—';
      await patchNote({ note_date: val || null });
    });
  });
  document.getElementById('chip-project')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openMultiRelationPicker(e.currentTarget, 'note', noteId, 'project', 'project', projects, n, patchNote, 'project_id', () => showNoteSlideover(noteId, afterSave));
  });
  document.getElementById('chip-goal')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openMultiRelationPicker(e.currentTarget, 'note', noteId, 'goal', 'goal', goals, n, patchNote, 'goal_id', () => showNoteSlideover(noteId, afterSave));
  });
  document.getElementById('chip-tags')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const _items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const _curIds = tags.map(t => t.id);
    openCombo(e.currentTarget, _items, null, async ({ multiIds, create }) => {
      if (create) {
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          await api('PUT', `/api/notes/${noteId}/tags`, { tag_ids: [...new Set([..._curIds, newTag.id])] });
        } catch(err) {}
        closeCombo();
        showNoteSlideover(noteId, afterSave);
        return;
      }
      const ids = (multiIds || []).map(Number);
      const sel = allTags.filter(t => ids.includes(t.id));
      const v = document.getElementById('chip-tags-val'); if (v) v.innerHTML = sel.length ? sel.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      await api('PUT', `/api/notes/${noteId}/tags`, { tag_ids: ids });
      if (afterSave) afterSave();
    }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
  });

  const noteInlinePropEditFns = {
    date:     (valEl) => { openSingleDatePickerGlobal(valEl, stripDate(n.note_date), async (val) => { await patchNote({ note_date: val||null }); showNoteSlideover(noteId, afterSave); }); },
    project:  (valEl) => openMultiRelationPicker(valEl, 'note', noteId, 'project', 'project', projects, n, patchNote, 'project_id', () => showNoteSlideover(noteId, afterSave)),
    goal:     (valEl) => openMultiRelationPicker(valEl, 'note', noteId, 'goal', 'goal', goals, n, patchNote, 'goal_id', () => showNoteSlideover(noteId, afterSave)),
    tags:     (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = tags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/notes/${noteId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); showNoteSlideover(noteId, afterSave); return; } await api('PUT', `/api/notes/${noteId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); showNoteSlideover(noteId, afterSave); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    category: async (valEl) => { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} openValuePicker(valEl, [{ value:'', label:'— none —' }, ...(allCategories||[]).map(c => ({ value: c.id, label: c.name }))], async (val) => { await patchNote({ category_id: val ? parseInt(val) : null }); showNoteSlideover(noteId, afterSave); }); },
  };

  noteExtraHeadKeys.forEach(k => {
    const el = document.getElementById(`chip-extra-${k}`);
    if (!el) return;
    const fn = noteInlinePropEditFns[k];
    if (fn) el.addEventListener('click', (e) => { e.stopPropagation(); fn(el.querySelector('.chip-value')); });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();
    openPropSectionManager(e.currentTarget, 'note', () => showNoteSlideover(noteId, afterSave));
  };

  // Inline prop panel
  bindInlinePropPanel('note', noteId, noteInlinePropEditFns, () => showNoteSlideover(noteId, afterSave));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="note"]'));
  initEntityViewsSection('note', noteId, n);
  initRichEditor(`editorjs-note-${noteId}`, 'note', noteId, false);
  setFsPropsBuilder((fsPropsEl) => {
    const rerender = () => { fsPropsEl.innerHTML = buildInlinePropPanel('note', noteId, noteBodyDefs); bindInlinePropPanel('note', noteId, noteInlinePropEditFns, rerender, fsPropsEl); };
    fsPropsEl.innerHTML = buildInlinePropPanel('note', noteId, noteBodyDefs);
    bindInlinePropPanel('note', noteId, noteInlinePropEditFns, rerender, fsPropsEl);
  });
  setSlideoverExpand(() => openEntityFullscreen('note', noteId, n.title, (t) => patchNote({ title: t })));

  document.getElementById('note-export-btn').onclick = () => showJSONModal(`/api/export/note/${noteId}`, `note-${noteId}.json`);
  document.getElementById('note-delete-btn').onclick = () => deleteEntity('note', noteId);
}

/* ─── Sprint Slideover (task-sideview style) ─────────────────────────── */
async function showSprintSlideover(sprintId, afterSave) {
  openSlideover('Sprint Detail', '<div class="loading">Loading…</div>');

  let s, allProjects = [], sprintTags = [];
  try {
    [s, allProjects] = await Promise.all([
      api('GET', `/api/sprints/${sprintId}`),
      api('GET', '/api/projects'),
    ]);
    try { sprintTags = await api('GET', `/api/sprints/${sprintId}/tags`); } catch(e) { sprintTags = []; }
  } catch(e) { return; }
  if (!allCategories.length) { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} }

  const tasks = (s.tasks || []).filter(t => !t.parent_task_id);
  const projName = allProjects.find(p => String(p.id) === String(s.project_id))?.title || null;

  async function patchSprint(data) {
    try { await api('PATCH', `/api/sprints/${sprintId}`, data); } catch(e) { return; }
    if (afterSave) afterSave();
  }

  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  const sprintSections = getPropSections('sprint');
  const sprintIsInHead = (k) => sprintSections.heading.includes(k);
  const SPRINT_CHIP_KEYS = ['status','dates','project','tags','category'];
  const sprintExtraHeadKeys = sprintSections.heading.filter(k => !SPRINT_CHIP_KEYS.includes(k));

  await loadEntityCustomProps('sprint', sprintId);
  const _sprintCatId = getCustomPropValues('sprint', sprintId)._category_id || null;
  const sprintCatName = _sprintCatId ? (allCategories.find(c => String(c.id) === String(_sprintCatId)) || {}).name : null;

  const allSprintBuiltinDefs = [
    { key: 'status',  label: 'Status',    icon: pIco('<circle cx="12" cy="12" r="10"/>'),
      renderValue: () => `<span style="${sprintStatusStyle(s.status)}">${(s.status||'planned').replace('_',' ')}</span>` },
    { key: 'dates',   label: 'Dates',     icon: pIco('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
      renderValue: () => { const dr = s.start_date && s.end_date ? `${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}` : fmtDate(s.start_date||s.end_date)||''; return dr ? `<span>${dr}</span>` : ''; } },
    { key: 'project', label: 'Projects',  icon: pIco('<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'),
      renderValue: () => renderMultiRelationValue('sprint', sprintId, 'project', projName) },
    { key: 'tags',    label: 'Tags',      icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => sprintTags.length ? sprintTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '' },
    { key: 'points',  label: 'Capacity (pts)', icon: pIco('<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>'),
      renderValue: () => s.story_points != null ? `<span>${s.story_points}</span>` : '' },
    { key: 'category', label: 'Category', icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => sprintCatName ? `<span>${sprintCatName}</span>` : '' },
  ];
  const sprintBodyDefs = allSprintBuiltinDefs.filter(d => sprintSections.body.includes(d.key));
  const sprintInlinePropPanel = buildInlinePropPanel('sprint', sprintId, sprintBodyDefs);

  const projCrumb = projName
    ? `<div class="detail-bc-prefix"><span class="bc-part bc-proj" data-proj-id="${s.project_id}" style="cursor:pointer">${projName}</span></div>`
    : '';

  const taskRows = tasks.map(t =>
    `<li class="task-row" data-task-id="${t.id}" style="cursor:pointer">
      <div class="task-check ${t.status==='done'?'done':''}" data-check-id="${t.id}">${t.status==='done'?'✓':''}</div>
      <div class="task-content"><div class="task-title">${t.title}</div></div>
      ${statusBadge(t.status)}
    </li>`
  ).join('') || '<li style="padding:8px;color:var(--text-muted);font-size:13px">No tasks</li>';

  const dateRange = s.start_date && s.end_date
    ? `${fmtDate(s.start_date)} → ${fmtDate(s.end_date)}`
    : fmtDate(s.start_date || s.end_date) || '—';

  const SPRINT_STATUSES = ['planned','active','completed'];
  const SPRINT_STATUS_COLORS = { planned: '#94a3b8', active: '#22c55e', completed: '#a78bfa' };
  function sprintStatusStyle(st) {
    const c = getValueColor('sprintStatuses', st) || SPRINT_STATUS_COLORS[st] || '';
    return c ? `background:${c}22;color:${c};border-radius:3px;padding:1px 6px;font-weight:600` : '';
  }

  const body = `
    <button class="entity-icon-add-btn" id="sprint-icon-add-btn">
      <span id="sprint-icon-display"></span>
      <span id="sprint-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      ${projCrumb}
      <textarea class="detail-title-input" id="detail-title" rows="1">${(s.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      ${sprintIsInHead('status') ? `<button class="prop-chip chip-sprint-status-${s.status||'planned'}" id="chip-status" data-key="status"><span class="chip-label">Status</span><span class="chip-value" id="chip-status-val" style="${sprintStatusStyle(s.status)}">${(s.status||'planned').replace('_',' ')}</span></button>` : ''}
      ${sprintIsInHead('dates') ? `<button class="prop-chip" id="chip-dates" data-key="dates"><span class="chip-label">Dates</span><span class="chip-value" id="chip-dates-val">${dateRange}</span></button>` : ''}
      ${sprintIsInHead('project') ? `<button class="prop-chip" id="chip-project" data-key="project"><span class="chip-label">Project</span><span class="chip-value" id="chip-project-val">${projName || '—'}</span></button>` : ''}
      ${sprintIsInHead('tags') ? `<button class="prop-chip" id="chip-tags" data-key="tags"><span class="chip-label">Tags</span><span class="chip-value" id="chip-tags-val">${sprintTags.length ? sprintTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span></button>` : ''}
      ${sprintIsInHead('category') ? `<button class="prop-chip${sprintCatName ? '' : ' chip-empty'}" id="chip-category" data-key="category"><span class="chip-label">Category</span><span class="chip-value" id="chip-category-val">${sprintCatName || '—'}</span></button>` : ''}
      ${sprintExtraHeadKeys.map(k => { const def = allSprintBuiltinDefs.find(d => d.key === k); if (!def) return ''; return `<button class="prop-chip" id="chip-extra-${k}" data-key="${k}"><span class="chip-label">${def.label}</span><span class="chip-value">${def.renderValue() || '—'}</span></button>`; }).join('')}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${sprintInlinePropPanel}

    <div class="subtask-section" style="margin-top:12px">
      <div class="subtask-section-title">
        <span>Tasks (${tasks.length})</span>
        <button class="btn btn-sm btn-ghost" id="sprint-open-detail-btn">Open Full View ⤢</button>
      </div>
      <ul class="task-list" id="sprint-task-list">${taskRows}</ul>
    </div>

    ${buildCommentSection('sprint', sprintId)}
    ${buildRichContentSection('sprint', sprintId)}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="sprint-export-btn">Export JSON</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" id="sprint-delete-btn">Delete</button>
    </div>
  `;

  openSlideover(s.title, body);
  setSlideoverExport('sprint', s.id);
  initSlideoverCoverArea('sprint', s.id);

  // Icon
  const sprintIconAddBtn = document.getElementById('sprint-icon-add-btn');
  const sprintIconDisplay = document.getElementById('sprint-icon-display');
  const sprintIconAddLabel = document.getElementById('sprint-icon-add-label');
  loadEntityIcon('sprint', sprintId).then(icon => {
    if (icon) { sprintIconDisplay.innerHTML = renderEntityIcon(icon, 32); sprintIconDisplay.dataset.icon = icon; sprintIconAddLabel.textContent = ''; }
  });
  sprintIconAddBtn.onclick = (e) => {
    e.stopPropagation();
    const cur = sprintIconDisplay.dataset.icon || '';
    showIconPicker(sprintIconAddBtn, 'sprint', sprintId, cur, (newIcon) => {
      sprintIconDisplay.innerHTML = newIcon ? renderEntityIcon(newIcon, 32) : '';
      sprintIconDisplay.dataset.icon = newIcon || '';
      sprintIconAddLabel.innerHTML = newIcon ? '' : ACT_ICONS.addIcon + 'Add icon';
      saveEntityIcon('sprint', sprintId, newIcon);
    });
  };

  // Title
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => { titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px'; });
  titleTA.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (e) => { if (e.target.value.trim()) patchSprint({ title: e.target.value.trim() }); };

  // Breadcrumb nav
  document.querySelector('.bc-proj')?.addEventListener('click', () => { closeSlideover(); renderView('project-detail', s.project_id); });

  // Prop chips
  document.getElementById('chip-status')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const items = SPRINT_STATUSES.map(v => {
      const c = getValueColor('sprintStatuses', v) || SPRINT_STATUS_COLORS[v] || '';
      return { value: v, label: v.replace('_',' '), _color: c };
    });
    openCombo(e.currentTarget, items, s.status || 'planned', async ({ value }) => {
      const chipEl = document.getElementById('chip-status');
      if (chipEl) {
        chipEl.className = `prop-chip chip-sprint-status-${value}`;
        const valEl = chipEl.querySelector('.chip-value');
        if (valEl) { valEl.textContent = value.replace('_',' '); valEl.setAttribute('style', sprintStatusStyle(value)); }
      }
      s.status = value;
      await patchSprint({ status: value });
    });
  });
  document.getElementById('chip-dates')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openDateRangePickerGlobal(e.currentTarget, stripDate(s.start_date), stripDate(s.end_date), async (start, end) => {
      await patchSprint({ start_date: start || null, end_date: end || null });
      const v = document.getElementById('chip-dates-val'); if (v) v.textContent = start && end ? `${fmtDate(start)} → ${fmtDate(end)}` : fmtDate(start || end) || '—';
    });
  });
  document.getElementById('chip-project')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openValuePicker(e.currentTarget, [{ value: '', label: '— none —' }, ...allProjects.map(p => ({ value: p.id, label: p.title }))], async (val) => {
      const v = document.getElementById('chip-project-val'); if (v) v.textContent = val ? allProjects.find(p => String(p.id) === String(val))?.title || val : '—';
      await patchSprint({ project_id: val ? parseInt(val) : null });
    });
  });
  document.getElementById('chip-tags')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const _items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const _curIds = sprintTags.map(t => t.id);
    openCombo(e.currentTarget, _items, null, async ({ multiIds, create }) => {
      if (create) {
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          await api('PUT', `/api/sprints/${sprintId}/tags`, { tag_ids: [...new Set([..._curIds, newTag.id])] });
        } catch(err) {}
        closeCombo();
        showSprintSlideover(sprintId, afterSave);
        return;
      }
      const ids = (multiIds || []).map(Number);
      sprintTags = allTags.filter(t => ids.includes(t.id));
      const v = document.getElementById('chip-tags-val'); if (v) v.innerHTML = sprintTags.length ? sprintTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      await api('PUT', `/api/sprints/${sprintId}/tags`, { tag_ids: ids });
      if (afterSave) afterSave();
    }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
  });

  const sprintInlinePropEditFns = {
    status:  (valEl) => { openCombo(valEl, SPRINT_STATUSES.map(v => ({ value: v, label: v.replace('_',' ') })), s.status||'planned', async ({ value }) => { s.status = value; await patchSprint({ status: value }); showSprintSlideover(sprintId, afterSave); }); },
    dates:   (valEl) => { openDateRangePickerGlobal(valEl, stripDate(s.start_date), stripDate(s.end_date), async (start, end) => { await patchSprint({ start_date: start||null, end_date: end||null }); showSprintSlideover(sprintId, afterSave); }); },
    project: (valEl) => openMultiRelationPicker(valEl, 'sprint', sprintId, 'project', 'project', allProjects, s, patchSprint, 'project_id', () => showSprintSlideover(sprintId, afterSave)),
    tags:    (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = sprintTags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/sprints/${sprintId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); showSprintSlideover(sprintId, afterSave); return; } await api('PUT', `/api/sprints/${sprintId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); showSprintSlideover(sprintId, afterSave); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    points:  (valEl) => {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.style.cssText = 'width:80px;border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:13px;background:var(--bg-card);color:var(--text)';
      inp.value = s.story_points || '';
      valEl.innerHTML = ''; valEl.appendChild(inp); inp.focus();
      inp.onblur = async () => { await patchSprint({ story_points: parseInt(inp.value) || null }); showSprintSlideover(sprintId, afterSave); };
      inp.onkeydown = (ke) => { if (ke.key === 'Enter') inp.blur(); };
    },
    category: async (valEl) => {
      if (!allCategories.length) { try { allCategories = await api('GET', '/api/categories'); } catch(e) {} }
      const items = [{ value: '', label: '— None —' }, ...allCategories.map(c => ({ value: c.id, label: c.name }))];
      openCombo(valEl, items, _sprintCatId || '', async ({ value }) => {
        await api('POST', `/api/properties?entity_type=sprint&entity_id=${sprintId}`, { key: '_category_id', value: String(value||'') });
        showSprintSlideover(sprintId, afterSave);
      });
    },
  };

  document.getElementById('chip-category')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sprintInlinePropEditFns.category(e.currentTarget.querySelector('.chip-value'));
  });

  sprintExtraHeadKeys.forEach(k => {
    const el = document.getElementById(`chip-extra-${k}`);
    if (!el) return;
    const fn = sprintInlinePropEditFns[k];
    if (fn) el.addEventListener('click', (e) => { e.stopPropagation(); fn(el.querySelector('.chip-value')); });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();
    openPropSectionManager(e.currentTarget, 'sprint', () => showSprintSlideover(sprintId, afterSave));
  };

  // Inline prop panel
  bindInlinePropPanel('sprint', sprintId, sprintInlinePropEditFns, () => showSprintSlideover(sprintId, afterSave));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="sprint"]'));
  initRichEditor(`editorjs-sprint-${sprintId}`, 'sprint', sprintId, false);
  setFsPropsBuilder((fsPropsEl) => {
    const rerender = () => { fsPropsEl.innerHTML = buildInlinePropPanel('sprint', sprintId, sprintBodyDefs); bindInlinePropPanel('sprint', sprintId, sprintInlinePropEditFns, rerender, fsPropsEl); };
    fsPropsEl.innerHTML = buildInlinePropPanel('sprint', sprintId, sprintBodyDefs);
    bindInlinePropPanel('sprint', sprintId, sprintInlinePropEditFns, rerender, fsPropsEl);
  });
  setSlideoverExpand(() => { closeSlideover(); renderView('sprint-detail', sprintId); });

  // Task rows
  document.querySelectorAll('#sprint-task-list [data-task-id]').forEach(el => {
    el.onclick = () => showTaskSlideover(el.dataset.taskId);
  });

  document.getElementById('sprint-open-detail-btn').onclick = () => { closeSlideover(); renderView('sprint-detail', sprintId); };
  document.getElementById('sprint-export-btn').onclick = () => showJSONModal(`/api/export/sprint/${sprintId}`, `sprint-${sprintId}.json`);
  document.getElementById('sprint-delete-btn').onclick = () => {
    if (!confirm('Delete this sprint?')) return;
    api('DELETE', `/api/sprints/${sprintId}`).then(() => { closeSlideover(); renderSprints(); });
  };
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
      <div class="form-group"><label class="form-label">Start Date</label>${singleDateChipHtml('sp-start', s.start_date||'')}</div>
      <div class="form-group"><label class="form-label">End Date</label>${singleDateChipHtml('sp-end', s.end_date||'')}</div>
    </div>
    <div class="form-group"><label class="form-label">Capacity (Story Points)</label>
      <input type="number" id="sp-story-points" min="0" placeholder="e.g. 40" value="${s.story_points != null ? s.story_points : ''}" style="width:100%" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">${s.id ? 'Save' : 'Create'}</button>
    </div>`;

  openFormSlideover(s.id ? 'Edit Sprint' : 'New Sprint', body);
  bindModalDateChips();
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
    if (!data.title) { showToast('Title is required', 'error'); return; }
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
  if (!v.id) { showResourceModal(null, afterSave); return; }
  const resId = v.id;
  openSlideover('Resource Detail', '<div class="loading">Loading…</div>');

  let r, projects = [], goals = [], resTags = [];
  try {
    [r, projects, goals] = await Promise.all([
      api('GET', `/api/resources/${resId}`),
      api('GET', '/api/projects'),
      api('GET', '/api/goals'),
    ]);
    try { resTags = await api('GET', `/api/resources/${resId}/tags`); } catch(e) { resTags = []; }
  } catch(e) { return; }
  try { allCategories = await api('GET', '/api/categories'); } catch(e) {}

  async function patchResource(data) {
    try { await api('PATCH', `/api/resources/${resId}`, data); } catch(e) { return; }
    if (afterSave) afterSave();
  }

  const pIco = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const rawUrl = r.url || '';
  const projName = projects.find(p => String(p.id) === String(r.project_id))?.title || null;
  const goalName = goals.find(g => String(g.id) === String(r.goal_id))?.title || null;
  const fileName = r.file_path ? r.file_path.split('/').pop() : '';

  const resSections = getPropSections('resource');
  const resIsInHead = (k) => resSections.heading.includes(k);
  const RES_CHIP_KEYS = ['type','url','project','goal','tags','category'];
  const resExtraHeadKeys = resSections.heading.filter(k => !RES_CHIP_KEYS.includes(k));

  await loadEntityCustomProps('resource', resId);
  const _resCatId = getCustomPropValues('resource', resId)._category_id || null;
  const resCatName = _resCatId ? (allCategories.find(c => String(c.id) === String(_resCatId)) || {}).name : null;

  const allResBuiltinDefs = [
    { key: 'type',    label: 'Type',    icon: pIco('<path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>'),
      renderValue: () => r.resource_type ? `<span>${r.resource_type}</span>` : '' },
    { key: 'url',     label: 'URL',     icon: pIco('<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>'),
      renderValue: () => rawUrl ? `<span>${rawUrl.replace(/^https?:\/\//,'')}</span>` : '' },
    { key: 'project', label: 'Projects', icon: pIco('<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'),
      renderValue: () => renderMultiRelationValue('resource', resId, 'project', projName) },
    { key: 'goal',    label: 'Goals',   icon: pIco('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
      renderValue: () => renderMultiRelationValue('resource', resId, 'goal', goalName) },
    { key: 'tags',    label: 'Tags',    icon: pIco('<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'),
      renderValue: () => resTags.length ? resTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '' },
    { key: 'category', label: 'Category', icon: pIco('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'),
      renderValue: () => resCatName ? `<span>${resCatName}</span>` : '' },
  ];
  const resBodyDefs = allResBuiltinDefs.filter(d => resSections.body.includes(d.key));
  await loadEntityCustomProps('resource', resId);
  const resInlinePropPanel = buildInlinePropPanel('resource', resId, resBodyDefs);

  const body = `
    <button class="entity-icon-add-btn" id="res-icon-add-btn">
      <span id="res-icon-display"></span>
      <span id="res-icon-add-label">${ACT_ICONS.addIcon}Add icon</span>
    </button>
    <div class="detail-title-area">
      <textarea class="detail-title-input" id="detail-title" rows="1">${(r.title||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
    </div>

    <div class="prop-chips" id="prop-chips">
      ${resIsInHead('type') ? `<button class="prop-chip" id="chip-type" data-key="type"><span class="chip-label">Type</span><span class="chip-value" id="chip-type-val">${r.resource_type || '—'}</span></button>` : ''}
      ${resIsInHead('url') ? `<button class="prop-chip${rawUrl ? '' : ' chip-empty'}" id="chip-url" data-key="url"><span class="chip-label">URL</span><span class="chip-value" id="chip-url-val">${rawUrl ? `<a href="${rawUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;display:inline-block;vertical-align:bottom">${rawUrl.replace(/^https?:\/\//,'')}</a>` : '—'}</span></button>` : ''}
      ${resIsInHead('project') ? `<button class="prop-chip" id="chip-project" data-key="project"><span class="chip-label">Project</span><span class="chip-value" id="chip-project-val">${projName || '—'}</span></button>` : ''}
      ${resIsInHead('goal') ? `<button class="prop-chip" id="chip-goal" data-key="goal"><span class="chip-label">Goal</span><span class="chip-value" id="chip-goal-val">${goalName || '—'}</span></button>` : ''}
      ${resIsInHead('tags') ? `<button class="prop-chip" id="chip-tags" data-key="tags"><span class="chip-label">Tags</span><span class="chip-value" id="chip-tags-val">${resTags.length ? resTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—'}</span></button>` : ''}
      ${resIsInHead('category') ? `<button class="prop-chip${resCatName ? '' : ' chip-empty'}" id="chip-category" data-key="category"><span class="chip-label">Category</span><span class="chip-value" id="chip-category-val">${resCatName || '—'}</span></button>` : ''}
      ${resExtraHeadKeys.map(k => { const def = allResBuiltinDefs.find(d => d.key === k); if (!def) return ''; return `<button class="prop-chip" id="chip-extra-${k}" data-key="${k}"><span class="chip-label">${def.label}</span><span class="chip-value">${def.renderValue() || '—'}</span></button>`; }).join('')}
      <button class="prop-chips-more" id="prop-chips-more" title="More properties">···</button>
    </div>

    ${resInlinePropPanel}

    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Body / Notes</label>
      <textarea id="detail-body" style="width:100%;min-height:120px">${r.body || ''}</textarea>
    </div>

    <div class="subtask-section">
      <div class="subtask-section-title"><span>File Attachment</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:4px 0">
        ${fileName
          ? `<a href="/api/resource-file/${resId}" download="${fileName}" style="font-size:12px;color:var(--accent)">📎 ${fileName}</a>`
          : '<span style="font-size:12px;color:var(--text-muted)">No file attached</span>'}
        <label class="btn btn-sm btn-ghost" style="cursor:pointer;margin:0">
          Upload file<input type="file" id="rs-file-input" style="display:none" />
        </label>
        <span id="rs-file-status" style="font-size:11px;color:var(--text-muted)"></span>
      </div>
    </div>

    ${buildEntityViewsSection('resource', resId)}

    ${buildCommentSection('resource', resId)}
    ${buildRichContentSection('resource', resId)}

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <button class="btn btn-ghost btn-sm" id="res-export-btn">Export JSON</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" id="res-delete-btn">Delete</button>
    </div>
  `;

  openSlideover(r.title || 'Resource', body);
  setSlideoverExport('resource', r.id);
  initSlideoverCoverArea('resource', r.id);

  // Icon button
  const resIconBtn = document.getElementById('res-icon-add-btn');
  const resIconDisplay = document.getElementById('res-icon-display');
  const resIconAddLabel = document.getElementById('res-icon-add-label');
  if (resIconBtn) {
    loadEntityIcon('resource', resId).then(icon => {
      if (icon) { resIconDisplay.innerHTML = renderEntityIcon(icon, 28); resIconAddLabel.style.display = 'none'; }
    });
    resIconBtn.addEventListener('click', () => {
      const cur = resIconDisplay.innerHTML ? resIconDisplay.textContent : '';
      showIconPicker(resIconBtn, null, null, cur, async (icon) => {
        await saveEntityIcon('resource', resId, icon || '');
        resIconDisplay.innerHTML = icon ? renderEntityIcon(icon, 28) : '';
        resIconAddLabel.style.display = icon ? 'none' : '';
        document.querySelectorAll(`[data-icon-entity="resource"][data-icon-id="${resId}"]`).forEach(el => {
          el.innerHTML = icon ? renderEntityIcon(icon, parseInt(el.dataset.iconSize) || 16) : '';
          el.style.display = icon ? '' : 'none';
        });
      });
    });
  }

  // Title
  const titleTA = document.getElementById('detail-title');
  titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px';
  titleTA.addEventListener('input', () => { titleTA.style.height = 'auto'; titleTA.style.height = titleTA.scrollHeight + 'px'; });
  titleTA.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); titleTA.blur(); } });
  titleTA.onblur = (e) => { if (e.target.value.trim()) patchResource({ title: e.target.value.trim() }); };

  // Body auto-save
  let bodyTimer = null;
  document.getElementById('detail-body').addEventListener('input', () => {
    clearTimeout(bodyTimer);
    bodyTimer = setTimeout(() => patchResource({ body: document.getElementById('detail-body').value }), 800);
  });

  // Prop chips
  document.getElementById('chip-type')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const typeInp = document.createElement('input');
    typeInp.type = 'text'; typeInp.value = r.resource_type || ''; typeInp.placeholder = 'e.g. link, book, tool…';
    typeInp.style.cssText = 'font-size:12px;padding:3px 6px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text-primary);width:120px';
    const chip = document.getElementById('chip-type'); const valSpan = chip.querySelector('.chip-value');
    valSpan.innerHTML = ''; valSpan.appendChild(typeInp); typeInp.focus();
    typeInp.onblur = async () => { const v2 = typeInp.value.trim(); valSpan.textContent = v2 || '—'; if (v2 !== (r.resource_type || '')) await patchResource({ resource_type: v2 || null }); };
    typeInp.onkeydown = (ke) => { if (ke.key === 'Enter') typeInp.blur(); if (ke.key === 'Escape') valSpan.textContent = r.resource_type || '—'; };
  });
  document.getElementById('chip-url')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const urlInp = document.createElement('input');
    urlInp.type = 'url'; urlInp.value = rawUrl; urlInp.placeholder = 'https://…';
    urlInp.style.cssText = 'font-size:12px;padding:3px 6px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text-primary);width:200px';
    const chip = document.getElementById('chip-url'); const valSpan = chip.querySelector('.chip-value');
    valSpan.innerHTML = ''; valSpan.appendChild(urlInp); urlInp.focus();
    urlInp.onblur = async () => { const v2 = urlInp.value.trim(); valSpan.innerHTML = v2 ? `<a href="${v2}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none">${v2.replace(/^https?:\/\//,'')}</a>` : '—'; if (v2 !== rawUrl) await patchResource({ url: v2 || null }); };
    urlInp.onkeydown = (ke) => { if (ke.key === 'Enter') urlInp.blur(); };
  });
  document.getElementById('chip-project')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openMultiRelationPicker(e.currentTarget, 'resource', resId, 'project', 'project', projects, r, patchResource, 'project_id', () => showResourceSlideover({ id: resId }, afterSave));
  });
  document.getElementById('chip-goal')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openMultiRelationPicker(e.currentTarget, 'resource', resId, 'goal', 'goal', goals, r, patchResource, 'goal_id', () => showResourceSlideover({ id: resId }, afterSave));
  });
  document.getElementById('chip-tags')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const _items = allTags.map(t => ({ value: t.id, label: t.name, color: t.color }));
    const _curIds = resTags.map(t => t.id);
    openCombo(e.currentTarget, _items, null, async ({ multiIds, create }) => {
      if (create) {
        try {
          const newTag = await api('POST', '/api/tags', { name: create, color: 'blue' });
          allTags.push(newTag);
          await api('PUT', `/api/resources/${resId}/tags`, { tag_ids: [...new Set([..._curIds, newTag.id])] });
        } catch(err) {}
        closeCombo();
        showResourceSlideover({ id: resId }, afterSave);
        return;
      }
      const ids = (multiIds || []).map(Number);
      resTags = allTags.filter(t => ids.includes(t.id));
      const v = document.getElementById('chip-tags-val'); if (v) v.innerHTML = resTags.length ? resTags.map(t => `<span class="multi-chip color-${t.color||'blue'}">${t.name}</span>`).join('') : '—';
      await api('PUT', `/api/resources/${resId}/tags`, { tag_ids: ids });
      if (afterSave) afterSave();
    }, { multiSelect: true, allowCreate: true, selectedIds: _curIds });
  });
  document.getElementById('chip-category')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const _items = [{ value: '', label: '— None —' }, ...allCategories.map(c => ({ value: c.id, label: c.name }))];
    openCombo(e.currentTarget, _items, _resCatId || '', async ({ value }) => {
      await api('POST', `/api/properties?entity_type=resource&entity_id=${resId}`, { key: '_category_id', value: String(value || '') });
      showResourceSlideover({ id: resId }, afterSave);
    });
  });

  const resInlinePropEditFns = {
    type:    (valEl) => {
      const inp = document.createElement('input'); inp.type = 'text'; inp.value = r.resource_type || ''; inp.placeholder = 'e.g. link, book…';
      inp.style.cssText = 'font-size:12px;padding:3px 6px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text);width:120px';
      valEl.innerHTML = ''; valEl.appendChild(inp); inp.focus();
      inp.onblur = async () => { await patchResource({ resource_type: inp.value.trim() || null }); showResourceSlideover({ id: resId }, afterSave); };
      inp.onkeydown = ke => { if (ke.key === 'Enter') inp.blur(); };
    },
    url:     (valEl) => {
      const inp = document.createElement('input'); inp.type = 'url'; inp.value = rawUrl; inp.placeholder = 'https://…';
      inp.style.cssText = 'font-size:12px;padding:3px 6px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text);width:200px';
      valEl.innerHTML = ''; valEl.appendChild(inp); inp.focus();
      inp.onblur = async () => { await patchResource({ url: inp.value.trim() || null }); showResourceSlideover({ id: resId }, afterSave); };
      inp.onkeydown = ke => { if (ke.key === 'Enter') inp.blur(); };
    },
    project: (valEl) => openMultiRelationPicker(valEl, 'resource', resId, 'project', 'project', projects, r, patchResource, 'project_id', () => showResourceSlideover({ id: resId }, afterSave)),
    goal:    (valEl) => openMultiRelationPicker(valEl, 'resource', resId, 'goal', 'goal', goals, r, patchResource, 'goal_id', () => showResourceSlideover({ id: resId }, afterSave)),
    tags:    (valEl) => { const _i = allTags.map(t => ({ value: t.id, label: t.name, color: t.color })); const _c = resTags.map(t => t.id); openCombo(valEl, _i, null, async ({ multiIds, create }) => { if (create) { try { const nt = await api('POST', '/api/tags', { name: create, color: 'blue' }); allTags.push(nt); await api('PUT', `/api/resources/${resId}/tags`, { tag_ids: [...new Set([..._c, nt.id])] }); } catch(e) {} closeCombo(); showResourceSlideover({ id: resId }, afterSave); return; } await api('PUT', `/api/resources/${resId}/tags`, { tag_ids: (multiIds||[]).map(Number) }); showResourceSlideover({ id: resId }, afterSave); }, { multiSelect: true, allowCreate: true, selectedIds: _c }); },
    category: (valEl) => { const _i = [{ value: '', label: '— None —' }, ...allCategories.map(c => ({ value: c.id, label: c.name }))]; openCombo(valEl, _i, _resCatId || '', async ({ value }) => { await api('POST', `/api/properties?entity_type=resource&entity_id=${resId}`, { key: '_category_id', value: String(value || '') }); showResourceSlideover({ id: resId }, afterSave); }); },
  };

  resExtraHeadKeys.forEach(k => {
    const el = document.getElementById(`chip-extra-${k}`);
    if (!el) return;
    const fn = resInlinePropEditFns[k];
    if (fn) el.addEventListener('click', (e) => { e.stopPropagation(); fn(el.querySelector('.chip-value')); });
  });

  // ··· Section manager
  document.getElementById('prop-chips-more').onclick = (e) => {
    e.stopPropagation();
    openPropSectionManager(e.currentTarget, 'resource', () => showResourceSlideover({ id: resId }, afterSave));
  };

  // Inline prop panel
  bindInlinePropPanel('resource', resId, resInlinePropEditFns, () => showResourceSlideover({ id: resId }, afterSave));
  bindCommentSection(document.querySelector('.comment-section[data-entity-type="resource"]'));
  initEntityViewsSection('resource', resId, r);
  initRichEditor(`editorjs-resource-${resId}`, 'resource', resId, false);
  setFsPropsBuilder((fsPropsEl) => {
    const rerender = () => { fsPropsEl.innerHTML = buildInlinePropPanel('resource', resId, resBodyDefs); bindInlinePropPanel('resource', resId, resInlinePropEditFns, rerender, fsPropsEl); };
    fsPropsEl.innerHTML = buildInlinePropPanel('resource', resId, resBodyDefs);
    bindInlinePropPanel('resource', resId, resInlinePropEditFns, rerender, fsPropsEl);
  });
  setSlideoverExpand(() => openEntityFullscreen('resource', resId, r.title, (t) => patchResource({ title: t })));

  // File upload
  const fileInput = document.getElementById('rs-file-input');
  const fileStatus = document.getElementById('rs-file-status');
  if (fileInput) {
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      fileStatus.textContent = 'Uploading…';
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch(`/api/resource-upload/${resId}`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        fileStatus.textContent = 'Uploaded';
        if (afterSave) afterSave();
      } catch(e) { fileStatus.textContent = 'Upload failed'; }
    };
  }

  document.getElementById('res-export-btn').onclick = () =>
    showJSONModal(`/api/export/resource/${resId}`, `resource-${resId}.json`);
  document.getElementById('res-delete-btn').onclick = () => deleteEntity('resource', resId);
}

/* ─── Category Modal ─────────────────────────────────────────────────── */

async function showResourceModal(presets, afterSave) {
  const p = presets || {};
  let projects = [], tasks = [], goals = [];
  try { [projects, tasks, goals] = await Promise.all([
    api('GET', '/api/projects'), api('GET', '/api/tasks'), api('GET', '/api/goals')
  ]); } catch(e) {}

  const goalOpts = '<option value="">— none —</option>' + goals.map(g =>
    `<option value="${g.id}" ${String(g.id)===String(p.goal_id)?'selected':''}>${g.title}</option>`).join('');
  const projOpts = '<option value="">— none —</option>' + projects.map(pr =>
    `<option value="${pr.id}" ${String(pr.id)===String(p.project_id)?'selected':''}>${pr.title}</option>`).join('');
  const taskOpts = '<option value="">— none —</option>' + tasks.map(t =>
    `<option value="${t.id}" ${String(t.id)===String(p.task_id)?'selected':''}>${t.title}</option>`).join('');

  const body = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">
      <div class="form-group" style="margin:0">
        <label class="form-label">Title *</label>
        <input type="text" id="rs-title" placeholder="Resource title" style="width:100%;box-sizing:border-box" />
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Type</label>
        <input type="text" id="rs-type" placeholder="e.g. link, book, tool…" style="width:100%;box-sizing:border-box" />
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">URL</label>
        <input type="url" id="rs-url" style="width:100%;box-sizing:border-box" />
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Body / Notes</label>
        <textarea id="rs-body" style="width:100%;box-sizing:border-box;min-height:80px"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group" style="margin:0"><label class="form-label">Goal</label><select id="rs-goal" style="width:100%">${goalOpts}</select></div>
        <div class="form-group" style="margin:0"><label class="form-label">Project</label><select id="rs-project" style="width:100%">${projOpts}</select></div>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Task</label>
        <select id="rs-task" style="width:100%">${taskOpts}</select>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-save-btn">Create</button>
      </div>
    </div>`;

  openFormSlideover('New Resource', body);
  document.getElementById('modal-cancel-btn').onclick = closeFormSlideover;
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('rs-title').value.trim();
    if (!title) { showToast('Title is required', 'error'); return; }
    const data = {
      title,
      resource_type: document.getElementById('rs-type').value || 'note',
      url: document.getElementById('rs-url').value.trim() || null,
      body: document.getElementById('rs-body').value,
      goal_id: document.getElementById('rs-goal').value ? parseInt(document.getElementById('rs-goal').value) : null,
      project_id: document.getElementById('rs-project').value ? parseInt(document.getElementById('rs-project').value) : null,
      task_id: document.getElementById('rs-task').value ? parseInt(document.getElementById('rs-task').value) : null,
    };
    try {
      await api('POST', '/api/resources', data);
      closeFormSlideover();
      if (afterSave) afterSave();
    } catch(e) {
      showToast('Failed to create resource: ' + e.message, 'error');
    }
  };
}

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
    if (!data.name) { showToast('Name is required', 'error'); return; }
    try {
      if (v.id) await api('PATCH', `/api/categories/${v.id}`, data);
      else await api('POST', '/api/categories', data);
      closeModal();
      try { allCategories = await api('GET', '/api/categories'); } catch(e) {}
      await renderCategories();
    } catch(e) {
      showToast('Failed to save category: ' + (e.message || e), 'error');
    }
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
    if (!data.name) { showToast('Name is required', 'error'); return; }
    try {
      if (v.id) await api('PATCH', `/api/tags/${v.id}`, data);
      else await api('POST', '/api/tags', data);
      closeModal();
      try { allTags = await api('GET', '/api/tags'); } catch(e) {}
      await renderTags();
    } catch(e) {
      showToast('Failed to save tag: ' + (e.message || e), 'error');
    }
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

/* ─── Connected Apps Panel ───────────────────────────────────────────── */
function openConnectedAppsPanel() {
  document.getElementById('_apps-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = '_apps-overlay';
  overlay.className = 'apps-overlay';
  overlay.innerHTML = `
    <div class="apps-panel" id="_apps-panel">
      <div class="apps-panel-header">
        <div class="apps-panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Connected Apps
        </div>
        <button class="apps-close-btn" id="_apps-close-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="apps-grid" id="_apps-grid">
        <div class="apps-loading">Checking app status…</div>
      </div>
      <div class="apps-panel-footer">
        <span class="apps-footer-note">Connected apps</span>
        <button class="apps-settings-link" id="_apps-open-settings">⚙ Open raibis Settings</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('_apps-close-btn').onclick = () => overlay.remove();
  document.getElementById('_apps-open-settings').onclick = () => { overlay.remove(); openRaibisSettings('apps'); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
  });

  loadAppsStatus();

  async function loadAppsStatus() {
    const grid = document.getElementById('_apps-grid');
    try {
      const apps = await api('GET', '/api/apps/status');
      if (!apps.length) {
        grid.innerHTML = `<div class="apps-empty">No apps configured. Add entries to <code>~/.raibis/apps.json</code></div>`;
        return;
      }
      grid.innerHTML = apps.map(app => buildAppCard(app)).join('');
      grid.querySelectorAll('.app-launch-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.appId;
          btn.disabled = true;
          btn.textContent = 'Launching…';
          try {
            await api('POST', '/api/apps/launch', { id });
            setTimeout(loadAppsStatus, 2500);
          } catch(e) {
            btn.disabled = false;
            btn.textContent = 'Launch';
            const errEl = grid.querySelector(`.app-card[data-app-id="${id}"] .app-error`);
            if (errEl) { errEl.textContent = e.message || 'Launch failed'; errEl.style.display = 'block'; }
          }
        };
      });
      grid.querySelectorAll('.app-open-btn').forEach(btn => {
        btn.onclick = () => window.open(btn.dataset.appUrl, '_blank');
      });
    } catch(e) {
      grid.innerHTML = `<div class="apps-empty">Could not reach server.</div>`;
    }
  }

  function buildAppCard(app) {
    const running = app.running;
    const colorStyle = app.color ? `--app-color:${app.color}` : '';
    return `
      <div class="app-card" data-app-id="${app.id}" style="${colorStyle}">
        <div class="app-card-top">
          <div class="app-icon-wrap">
            <span class="app-icon">${escHtml(app.icon || '⚙')}</span>
            <span class="app-status-dot ${running ? 'online' : 'offline'}"></span>
          </div>
          <div class="app-info">
            <div class="app-name">${escHtml(app.name)}</div>
            <div class="app-desc">${escHtml(app.description || '')}</div>
          </div>
        </div>
        <div class="app-card-bottom">
          <span class="app-status-badge ${running ? 'online' : 'offline'}">${running ? 'Running' : 'Offline'}</span>
          ${running
            ? `<button class="app-open-btn btn btn-sm" data-app-url="${escHtml(app.url || '')}">Open ↗</button>`
            : (app.launch_mode && app.launch_mode !== 'none'
                ? `<button class="app-launch-btn btn btn-sm btn-primary" data-app-id="${app.id}">Launch</button>`
                : `<span class="app-manual-note">Manual launch</span>`)
          }
        </div>
        <div class="app-error" style="display:none"></div>
      </div>
    `;
  }
}

/* ─── Automations — shared helpers ────────────────────────────────────── */

// Per-entity properties known to the system (for trigger/action dropdowns)
const ENTITY_PROPS_MAP = {
  task:    [
    { key:'status',     label:'Status'    },
    { key:'priority',   label:'Priority'  },
    { key:'due_date',   label:'Due Date'  },
    { key:'goal_id',    label:'Goal'      },
    { key:'project_id', label:'Project'   },
    { key:'sprint_id',  label:'Sprint'    },
    { key:'category_id',label:'Category'  },
  ],
  goal:    [{ key:'status', label:'Status' }, { key:'type', label:'Type' }],
  project: [{ key:'status', label:'Status' }, { key:'macro_area', label:'Macro Area' }],
  sprint:  [{ key:'status', label:'Status' }],
  note:    [{ key:'archived', label:'Archived' }],
  resource:[{ key:'type', label:'Type' }],
};

function getEntityPropValues(entType, propKey) {
  if (entType === 'task') {
    if (propKey === 'status')   return TASK_STATUSES;
    if (propKey === 'priority') return TASK_PRIORITIES;
  }
  if (entType === 'goal'    && propKey === 'status') return ['todo','in_progress','done','cancelled'];
  if (entType === 'project' && propKey === 'status') return ['planning','active','on_hold','done','archived'];
  if (entType === 'sprint'  && propKey === 'status') return ['planning','active','completed'];
  if (propKey === 'archived') return ['true','false'];
  // Check custom prop defs for select/status types
  const customDefs = getCustomPropDefs(entType);
  const def = customDefs.find(d => d.key === propKey);
  if (def && (def.type === 'select' || def.type === 'status' || def.type === 'multi_select') && def.options?.length) {
    return def.options;
  }
  return null; // free-text input
}

function getAllActionProps(entType) {
  const builtIn = ENTITY_PROPS_MAP[entType] || ENTITY_PROPS_MAP.task;
  const custom = getCustomPropDefs(entType).map(d => ({ key: d.key, label: d.label || d.key }));
  return [...builtIn, ...custom];
}

function normalizeAddItemAction(a) {
  if (a.action_type !== 'add_item' || a.overrides) return a;
  const overrides = [];
  if (a.field_overrides && typeof a.field_overrides === 'object') {
    for (const [field, value] of Object.entries(a.field_overrides)) {
      overrides.push({ field, value: String(value) });
    }
  }
  if (a.due_date_offset && typeof a.due_date_offset === 'object') {
    overrides.push({ field: 'due_date', offset_interval: a.due_date_offset.interval || 1, offset_unit: a.due_date_offset.unit || 'days' });
  }
  return { ...a, overrides: overrides.length ? overrides : [{ field: 'status', value: 'todo' }], template: 'copy_current' };
}

function parseCfgArray(s) {
  if (!s) return [];
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object') return [p];
  } catch {}
  return [];
}

function formatTrigger(type, configStr) {
  try {
    const arr = parseCfgArray(configStr);
    const t = arr[0] || {};
    const tt = t.trigger_type || type || 'property_changed';
    if (tt === 'property_changed') {
      const prop = t.property || '?';
      const val  = t.to_value  || '?';
      return `${prop.replace(/_/g,' ')} → ${val.replace(/_/g,' ')}`;
    }
    if (tt === 'item_added') return 'item added';
    if (tt === 'frequency')  return `every ${t.interval||''} ${t.unit||''}`.trim();
    return tt;
  } catch { return type || ''; }
}

function formatAction(type, configStr) {
  try {
    const arr = parseCfgArray(configStr);
    const a = arr[0] || {};
    const at = a.action_type || type || 'edit_property';
    if (at === 'edit_property') return `Set ${(a.field||'?').replace(/_/g,' ')} → ${(a.value||'?').replace(/_/g,' ')}`;
    if (at === 'add_item') {
      if (a.due_date_offset) return `Create copy, due +${a.due_date_offset.interval}${(a.due_date_offset.unit||'')[0]||''}`;
      return 'Create item';
    }
    if (at === 'notify') return 'Notify';
    return at;
  } catch { return type || ''; }
}

/* ─── Automations View (full page) ───────────────────────────────────── */

async function renderAutomationsView() {
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="view"><div class="loading">Loading…</div></div>`;
  const list = await api('GET', '/api/automations').catch(() => []);
  main.innerHTML = `<div class="view" id="_av-root"></div>`;
  renderAutoListView(document.getElementById('_av-root'), list, '', () => renderAutomationsView());
}

/* ─── Automations Overlay ─────────────────────────────────────────────── */

async function syncRecurAutomation(taskId, taskTitle, interval, unit) {
  const list = await api('GET', '/api/automations?entity_type=task').catch(() => []);
  const existing = (list || []).find(a => {
    try {
      const triggers = parseCfgArray(a.trigger_config);
      return triggers.some(tc =>
        (tc.trigger_type || a.trigger_type) === 'property_changed' &&
        tc.property === 'status' && tc.to_value === 'done' &&
        String(tc.entity_id) === String(taskId)
      ) && parseCfgArray(a.action_config).some(ac => (ac.action_type || a.action_type) === 'add_item');
    } catch { return false; }
  });
  if (interval <= 0) {
    if (existing) await api('DELETE', `/api/automations/${existing.id}`).catch(() => {});
    return;
  }
  const triggers = [{ trigger_type: 'property_changed', property: 'status', to_value: 'done', entity_id: taskId }];
  const actions  = [{ action_type: 'add_item', template: 'copy_current',
    field_overrides: { status: 'todo' },
    due_date_offset: { from_field: 'due_date', interval, unit: unit || 'days' } }];
  const payload = {
    name: `Recurring: ${taskTitle}`,
    description: `Auto-recreate "${taskTitle}" every ${interval} ${unit || 'days'}`,
    entity_type: 'task', enabled: true, trigger_logic: 'all',
    trigger_type: 'property_changed', trigger_config: JSON.stringify(triggers),
    action_type:  'add_item',         action_config:  JSON.stringify(actions),
  };
  if (existing) {
    await api('PATCH', `/api/automations/${existing.id}`, payload).catch(() => {});
  } else {
    await api('POST', '/api/automations', payload).catch(() => {});
  }
}

async function showAutomationsOverlay(entityType, onClose) {
  document.getElementById('_automations-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = '_automations-overlay';
  overlay.className = 'settings-overlay';
  overlay.innerHTML = `
    <div class="settings-modal" id="_auto-modal" style="max-width:680px;width:92vw;min-height:500px">
      <div class="settings-content" id="_auto-content" style="flex:1;overflow-y:auto">
        <div class="settings-content-header">
          <span class="settings-content-title" id="_auto-title">Automations</span>
          <button class="settings-close-btn" id="_auto-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="settings-body" id="_auto-body">
          <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:32px 0">Loading…</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); onClose?.(); };
  document.getElementById('_auto-close').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function escH(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escH); }
  });

  const list = await api('GET', `/api/automations?entity_type=${entityType}`).catch(() => []);
  const body  = document.getElementById('_auto-body');
  if (!body) return;
  renderAutoListView(body, list, entityType, async () => {
    const updated = await api('GET', `/api/automations?entity_type=${entityType}`).catch(() => []);
    renderAutoListView(body, updated, entityType, async () => {
      const u2 = await api('GET', `/api/automations?entity_type=${entityType}`).catch(() => []);
      renderAutoListView(body, u2, entityType, () => {});
    });
  });
}

// Renders list + inline editor inside any container
function renderAutoListView(container, list, entityType, onMutate) {
  const safe = list || [];
  // Built-in Recurring Tasks automation card (always shown for task entity)
  const builtinCard = (entityType === 'task' || !entityType) ? `
    <div class="auto-rule-card" style="border-color:var(--color-border-strong)">
      <div class="auto-rule-header">
        <div class="auto-rule-name">🔄 Recurring Tasks <span style="font-size:10px;font-weight:400;color:var(--text-muted);margin-left:4px">built-in</span></div>
        <span style="font-size:11px;color:var(--text-muted)">Always on</span>
      </div>
      <div class="auto-rule-meta" style="font-size:12px;color:var(--text-muted)">
        Tasks with a recurrence interval are automatically re-created when marked done. Set the interval in the task's edit form.
      </div>
    </div>` : '';
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${builtinCard}
      ${safe.length === 0 ? `
        <div style="text-align:center;padding:${entityType === 'task' ? '24' : '48'}px 0">
          ${entityType !== 'task' ? `<div style="font-size:36px;margin-bottom:12px">⚡</div>` : ''}
          <div style="font-size:14px;font-weight:600;margin-bottom:6px">${entityType === 'task' ? 'No custom automations yet' : 'No automations yet'}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Create a rule to automate actions when triggers fire.</div>
          <button class="btn btn-primary btn-sm" id="_av-create-first">+ New rule</button>
        </div>` : `
        ${safe.map(a => `
          <div class="auto-rule-card" data-auto-id="${a.id}">
            <div class="auto-rule-header">
              <div class="auto-rule-name">${escHtml(a.name)}</div>
              <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
                <label class="auto-toggle-label">
                  <input type="checkbox" class="auto-enabled-chk" data-auto-id="${a.id}" ${a.enabled?'checked':''}>
                  <span class="auto-toggle-track"></span>
                </label>
                <button class="btn btn-sm btn-ghost auto-edit-btn" data-auto-id="${a.id}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-sm btn-ghost auto-del-btn" data-auto-id="${a.id}" style="color:var(--color-danger,#ef4444)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              </div>
            </div>
            <div class="auto-rule-meta">
              <span class="auto-badge auto-badge-trigger">${formatTrigger(a.trigger_type, a.trigger_config)}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              <span class="auto-badge auto-badge-action">${formatAction(a.action_type, a.action_config)}</span>
              <span style="font-size:11px;color:var(--text-muted);margin-left:2px">[${escHtml(a.entity_type)}]</span>
            </div>
          </div>`).join('')}
        <button class="btn btn-sm" id="_av-create-first" style="align-self:flex-start;margin-top:4px">+ New rule</button>`}
      <div id="_av-form-area"></div>
    </div>`;

  container.querySelector('#_av-create-first')?.addEventListener('click', () => {
    const area = document.getElementById('_av-form-area');
    area.innerHTML = `<hr style="border:none;border-top:1px solid var(--color-border);margin:14px 0">`;
    renderAutoForm(area, null, entityType, onMutate);
  });
  container.querySelectorAll('.auto-enabled-chk').forEach(chk => {
    chk.onchange = async () => {
      await api('PATCH', `/api/automations/${chk.dataset.autoId}`, { enabled: chk.checked }).catch(() => {});
    };
  });
  container.querySelectorAll('.auto-del-btn').forEach(btn => {
    btn.onclick = () => showConfirmModal('Delete this automation?', async () => {
      await api('DELETE', `/api/automations/${btn.dataset.autoId}`).catch(() => {});
      onMutate();
    });
  });
  container.querySelectorAll('.auto-edit-btn').forEach(btn => {
    btn.onclick = () => {
      const a = safe.find(x => String(x.id) === btn.dataset.autoId);
      if (!a) return;
      const area = document.getElementById('_av-form-area');
      area.innerHTML = `<hr style="border:none;border-top:1px solid var(--color-border);margin:14px 0">`;
      renderAutoForm(area, a, entityType, onMutate);
      area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

// Notion-style automation form with many-to-many triggers + actions
function renderAutoForm(container, existing, defEntityType, onSave) {
  // ── State ───────────────────────────────────────────────────────────────
  let ruleName   = existing?.name        || '';
  let enabled    = existing?.enabled     !== false;
  let entType    = existing?.entity_type || defEntityType || 'task';
  let trigLogic  = existing?.trigger_logic || 'all';
  let triggers = parseCfgArray(existing?.trigger_config);
  let actions  = parseCfgArray(existing?.action_config).map(normalizeAddItemAction);
  // Backward compat: if no array, use top-level type fields
  if (!triggers.length && existing?.trigger_type) {
    triggers = [{ trigger_type: existing.trigger_type, ...((() => { try { return JSON.parse(existing.trigger_config||'{}'); } catch { return {}; } })()) }];
  }
  if (!actions.length && existing?.action_type) {
    actions = [normalizeAddItemAction({ action_type: existing.action_type, ...((() => { try { return JSON.parse(existing.action_config||'{}'); } catch { return {}; } })()) })];
  }
  // Backward compat: single-object config parsed without type key — fill from top-level
  if (triggers.length === 1 && !triggers[0].trigger_type && existing?.trigger_type) {
    triggers[0] = { trigger_type: existing.trigger_type, ...triggers[0] };
  }
  if (actions.length === 1 && !actions[0].action_type && existing?.action_type) {
    actions[0] = normalizeAddItemAction({ action_type: existing.action_type, ...actions[0] });
  }
  if (!triggers.length) triggers = [{ trigger_type: 'property_changed', property: 'status', to_value: 'done' }];
  if (!actions.length)  actions  = [{ action_type: 'add_item', template: 'copy_current', overrides: [{ field: 'status', value: 'todo' }] }];

  // ── Row renderers ───────────────────────────────────────────────────────
  function triggerRowHtml(t, i) {
    const tt = t.trigger_type || 'property_changed';
    const props = ENTITY_PROPS_MAP[entType] || ENTITY_PROPS_MAP.task;
    const propKey = t.property || props[0]?.key || 'status';
    const vals = getEntityPropValues(entType, propKey);
    const propOpts = props.map(p => `<option value="${p.key}" ${propKey===p.key?'selected':''}>${p.label}</option>`).join('');
    const toVal = t.to_value || '';

    let bodyHtml = '';
    if (tt === 'property_changed') {
      const valControl = vals
        ? `<select class="auto-pill-sel auto-pill-val" data-field="to_value">${vals.map(v=>`<option value="${v}" ${toVal===v?'selected':''}>${v.replace(/_/g,' ')}</option>`).join('')}</select>`
        : `<input class="auto-pill-input" data-field="to_value" placeholder="value" value="${escHtml(toVal)}">`;
      bodyHtml = `<select class="auto-pill-sel" data-field="property">${propOpts}</select>
                  <span class="auto-pill-sep">is</span>${valControl}`;
    } else if (tt === 'frequency') {
      bodyHtml = `<span class="auto-pill-sep">every</span>
        <input class="auto-pill-input auto-pill-num" type="number" min="1" data-field="interval" value="${t.interval||1}">
        <select class="auto-pill-sel" data-field="unit">${['days','weeks','months','years'].map(u=>`<option value="${u}" ${(t.unit||'weeks')===u?'selected':''}>${u}</option>`).join('')}</select>`;
    } else {
      bodyHtml = `<span class="auto-pill-sep" style="color:var(--text-muted)">any item is added</span>`;
    }
    return `<div class="af-row" data-trow="${i}">
      <div class="af-row-icon">⚡</div>
      <select class="auto-pill-sel auto-pill-type" data-field="trigger_type">
        <option value="property_changed" ${tt==='property_changed'?'selected':''}>Property changed</option>
        <option value="item_added"       ${tt==='item_added'?'selected':''}>Item added</option>
        <option value="frequency"        ${tt==='frequency'?'selected':''}>Frequency</option>
      </select>
      <div class="af-row-body">${bodyHtml}</div>
      <button class="af-row-remove" title="Remove trigger"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`;
  }

  function actionRowHtml(a, i) {
    const at = a.action_type || 'edit_property';
    const props = ENTITY_PROPS_MAP[entType] || ENTITY_PROPS_MAP.task;
    const fieldKey = a.field || props[0]?.key || 'status';
    const vals = getEntityPropValues(entType, fieldKey);
    const fieldOpts = props.map(p => `<option value="${p.key}" ${fieldKey===p.key?'selected':''}>${p.label}</option>`).join('');
    const av = a.value || '';
    const iv = a.due_date_offset?.interval ?? 1;
    const un = a.due_date_offset?.unit ?? 'weeks';

    let bodyHtml = '';
    if (at === 'edit_property') {
      const valControl = vals
        ? `<select class="auto-pill-sel auto-pill-val" data-field="value">${vals.map(v=>`<option value="${v}" ${av===v?'selected':''}>${v.replace(/_/g,' ')}</option>`).join('')}</select>`
        : `<input class="auto-pill-input" data-field="value" placeholder="value" value="${escHtml(av)}">`;
      bodyHtml = `<span class="auto-pill-sep">Set</span>
        <select class="auto-pill-sel" data-field="field">${fieldOpts}</select>
        <span class="auto-pill-sep">to</span>${valControl}`;
    } else if (at === 'add_item') {
      const overrides = a.overrides || [];
      const allProps = getAllActionProps(entType);
      const overrideRowsHtml = overrides.map((ov, j) => {
        const f = ov.field || 'status';
        const propOpts = allProps.map(p => `<option value="${p.key}" ${f===p.key?'selected':''}>${p.label}</option>`).join('');
        let valCtrl;
        if (f === 'due_date') {
          valCtrl = `<span class="auto-pill-sep">+</span>
            <input class="auto-pill-input auto-pill-num" type="number" min="0" data-ov-interval="${j}" value="${ov.offset_interval||1}">
            <select class="auto-pill-sel" data-ov-unit="${j}">${['days','weeks','months','years'].map(u=>`<option value="${u}" ${(ov.offset_unit||'days')===u?'selected':''}>${u}</option>`).join('')}</select>`;
        } else {
          const vals = getEntityPropValues(entType, f);
          valCtrl = vals
            ? `<select class="auto-pill-sel auto-pill-val" data-ov-value="${j}">${vals.map(v=>`<option value="${v}" ${(ov.value||'')===v?'selected':''}>${v.replace(/_/g,' ')}</option>`).join('')}</select>`
            : `<input class="auto-pill-input" data-ov-value="${j}" placeholder="value" value="${escHtml(ov.value||'')}">`;
        }
        return `<div class="af-override-row" data-ov-i="${j}">
          <span class="auto-pill-sep" style="font-size:11px">Set</span>
          <select class="auto-pill-sel auto-pill-type" data-ov-field="${j}">${propOpts}</select>
          <span class="auto-pill-sep" style="font-size:11px">to</span>
          ${valCtrl}
          <button class="af-row-remove" data-ov-del="${j}" title="Remove field"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>`;
      }).join('');
      bodyHtml = `<div class="af-add-item-wrap" data-arow-wrap="${i}">
        ${overrideRowsHtml}
        <button class="af-add-btn" data-ov-add="${i}" style="margin-top:4px;font-size:11px;padding:3px 8px">+ Add field</button>
      </div>`;
    } else {
      bodyHtml = `<span class="auto-pill-sep" style="color:var(--text-muted)">notification (coming soon)</span>`;
    }
    return `<div class="af-row" data-arow="${i}">
      <div class="af-row-icon">✦</div>
      <select class="auto-pill-sel auto-pill-type" data-field="action_type">
        <option value="edit_property" ${at==='edit_property'?'selected':''}>Set property</option>
        <option value="add_item"      ${at==='add_item'?'selected':''}>Create item</option>
        <option value="notify"        ${at==='notify'?'selected':''}>Notify (future)</option>
      </select>
      <div class="af-row-body">${bodyHtml}</div>
      <button class="af-row-remove" title="Remove action"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`;
  }

  // ── Render ──────────────────────────────────────────────────────────────
  function render() {
    const formEl = container.querySelector('.af-form-wrap') || document.createElement('div');
    formEl.className = 'af-form-wrap';
    formEl.innerHTML = `
      <div class="af-header">
        <input class="af-name-input" id="_af-name" placeholder="Automation name…" value="${escHtml(ruleName)}">
        <label class="auto-toggle-label af-enabled-toggle">
          <input type="checkbox" id="_af-enabled" ${enabled?'checked':''}>
          <span class="auto-toggle-track"></span>
          <span class="af-toggle-text">${enabled?'Active':'Inactive'}</span>
        </label>
      </div>
      <div class="af-entity-row">
        <span class="auto-pill-sep">For</span>
        <select class="auto-pill-sel" id="_af-entity">
          ${['task','goal','project','sprint','note','resource'].map(e=>`<option value="${e}" ${entType===e?'selected':''}>${e}s</option>`).join('')}
        </select>
      </div>
      <hr class="af-divider">
      <div class="af-section">
        <div class="af-section-header">
          <span class="auto-pill-sep">When</span>
          <select class="auto-pill-sel af-logic-sel" id="_af-trig-logic">
            <option value="all" ${trigLogic==='all'?'selected':''}>all</option>
            <option value="any" ${trigLogic==='any'?'selected':''}>any</option>
          </select>
          <span class="auto-pill-sep">triggers occur</span>
        </div>
        <div class="af-rows" id="_af-trigger-rows">${triggers.map(triggerRowHtml).join('')}</div>
        <button class="af-add-btn" id="_af-add-trigger">+ Add trigger</button>
      </div>
      <div class="af-connector"><div class="af-connector-line"></div></div>
      <div class="af-section">
        <div class="af-section-header"><span class="auto-pill-sep" style="font-weight:700;color:var(--color-text)">Do</span></div>
        <div class="af-rows" id="_af-action-rows">${actions.map(actionRowHtml).join('')}</div>
        <button class="af-add-btn" id="_af-add-action">+ Add action</button>
      </div>
      <hr class="af-divider">
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" id="_af-save">Save rule</button>
        <button class="btn btn-sm btn-ghost" id="_af-cancel">Cancel</button>
      </div>`;

    if (!container.querySelector('.af-form-wrap')) container.appendChild(formEl);

    // Wire header
    formEl.querySelector('#_af-name').oninput = e => { ruleName = e.target.value; };
    formEl.querySelector('#_af-enabled').onchange = e => {
      enabled = e.target.checked;
      formEl.querySelector('.af-toggle-text').textContent = enabled ? 'Active' : 'Inactive';
    };
    formEl.querySelector('#_af-entity').onchange = e => { entType = e.target.value; render(); };
    formEl.querySelector('#_af-trig-logic').onchange = e => { trigLogic = e.target.value; };

    // Trigger row events
    formEl.querySelector('#_af-trigger-rows').addEventListener('change', e => {
      const row = e.target.closest('[data-trow]'); if (!row) return;
      const i = parseInt(row.dataset.trow), field = e.target.dataset.field;
      if (!field) return;
      if (field.includes('.')) {
        const [p, c] = field.split('.');
        triggers[i][p] = { ...(triggers[i][p]||{}), [c]: e.target.type==='number' ? +e.target.value : e.target.value };
      } else {
        triggers[i] = { ...triggers[i], [field]: e.target.value };
      }
      if (field === 'trigger_type' || field === 'property') render();
    });
    formEl.querySelector('#_af-trigger-rows').addEventListener('click', e => {
      const btn = e.target.closest('.af-row-remove'); if (!btn) return;
      triggers.splice(parseInt(btn.closest('[data-trow]').dataset.trow), 1);
      render();
    });
    formEl.querySelector('#_af-add-trigger').onclick = () => {
      triggers.push({ trigger_type: 'property_changed', property: 'status', to_value: 'done' });
      render();
    };

    // Action row events
    formEl.querySelector('#_af-action-rows').addEventListener('change', e => {
      const row = e.target.closest('[data-arow]'); if (!row) return;
      const i = parseInt(row.dataset.arow);
      // Override field changed — update field key and re-render
      if (e.target.dataset.ovField !== undefined) {
        const j = parseInt(e.target.dataset.ovField);
        if (!actions[i].overrides) actions[i].overrides = [];
        actions[i].overrides[j] = { field: e.target.value };
        render(); return;
      }
      const field = e.target.dataset.field;
      if (!field) return;
      if (field.includes('.')) {
        const [p, c] = field.split('.');
        actions[i][p] = { ...(actions[i][p]||{}), [c]: e.target.type==='number' ? +e.target.value : e.target.value };
      } else {
        actions[i] = { ...actions[i], [field]: e.target.value };
      }
      if (field === 'action_type' || field === 'field') render();
    });
    formEl.querySelector('#_af-action-rows').addEventListener('click', e => {
      const row = e.target.closest('[data-arow]'); if (!row) return;
      const i = parseInt(row.dataset.arow);
      // Override delete
      const ovDel = e.target.closest('[data-ov-del]');
      if (ovDel) { actions[i].overrides?.splice(parseInt(ovDel.dataset.ovDel), 1); render(); return; }
      // Override add
      const ovAdd = e.target.closest('[data-ov-add]');
      if (ovAdd) { if (!actions[i].overrides) actions[i].overrides = []; actions[i].overrides.push({ field: 'status', value: 'todo' }); render(); return; }
      // Action row remove (only if NOT inside an override sub-row)
      const removeBtn = e.target.closest('.af-row-remove');
      if (removeBtn && !removeBtn.closest('[data-ov-i]')) { actions.splice(i, 1); render(); }
    });
    formEl.querySelector('#_af-add-action').onclick = () => {
      actions.push({ action_type: 'edit_property', field: 'status', value: 'todo' });
      render();
    };

    formEl.querySelector('#_af-cancel').onclick = onSave;
    formEl.querySelector('#_af-save').onclick = async () => {
      // Collect any unsaved text inputs (trigger/action top-level fields)
      formEl.querySelectorAll('[data-field]').forEach(el => {
        const row = el.closest('[data-trow]') || el.closest('[data-arow]');
        if (!row) return;
        const isTrig = row.dataset.trow !== undefined;
        const i = parseInt(isTrig ? row.dataset.trow : row.dataset.arow);
        const field = el.dataset.field;
        if (!field || el.tagName === 'SELECT') return;
        const val = el.type === 'number' ? +el.value : el.value;
        if (isTrig) {
          if (field.includes('.')) { const [p,c]=field.split('.'); triggers[i][p]={...(triggers[i][p]||{}),[c]:val}; }
          else triggers[i][field] = val;
        } else {
          if (field.includes('.')) { const [p,c]=field.split('.'); actions[i][p]={...(actions[i][p]||{}),[c]:val}; }
          else actions[i][field] = val;
        }
      });
      // Collect override values from add_item rows
      formEl.querySelectorAll('[data-arow]').forEach(row => {
        const i = parseInt(row.dataset.arow);
        if (actions[i]?.action_type !== 'add_item') return;
        row.querySelectorAll('[data-ov-i]').forEach(ovRow => {
          const j = parseInt(ovRow.dataset.ovI);
          const ov = actions[i].overrides?.[j]; if (!ov) return;
          if (ov.field === 'due_date') {
            const intEl = ovRow.querySelector('[data-ov-interval]');
            const unitEl = ovRow.querySelector('[data-ov-unit]');
            if (intEl) ov.offset_interval = parseInt(intEl.value) || 1;
            if (unitEl) ov.offset_unit = unitEl.value;
          } else {
            const valEl = ovRow.querySelector('[data-ov-value]');
            if (valEl && valEl.tagName !== 'SELECT') ov.value = valEl.value;
          }
        });
      });

      const name = formEl.querySelector('#_af-name').value.trim();
      if (!name) { showToast('Name is required', 'error'); return; }

      const payload = {
        name, entity_type: entType, enabled, trigger_logic: trigLogic,
        trigger_type: triggers[0]?.trigger_type || 'property_changed',
        trigger_config: JSON.stringify(triggers),
        action_type: actions[0]?.action_type || 'edit_property',
        action_config: JSON.stringify(actions),
      };
      try {
        if (existing?.id) {
          await api('PATCH', `/api/automations/${existing.id}`, payload);
        } else {
          await api('POST', '/api/automations', payload);
        }
        showToast('Automation saved', 'success');
        onSave();
      } catch { showToast('Save failed', 'error'); }
    };
  }

  render();
}

/* ─── New Entity Type Modal ──────────────────────────────────────────── */
function showNewEntityTypeModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9100;display:flex;align-items:center;justify-content:center';

  const PROP_TYPES = ['text','number','date','select','multi_select','url','checkbox','relation'];
  // Tags and global taxonomy props are always available on every entity via the taxonomy system.
  // Only show non-taxonomy starter props here.
  const STARTER_PROPS = [
    { key: 'status',    label: 'Status',    type: 'select',       options: 'To Do,In Progress,Done' },
    { key: 'priority',  label: 'Priority',  type: 'select',       options: 'Low,Medium,High' },
    { key: 'due_date',  label: 'Due Date',  type: 'date',         options: '' },
    { key: 'url',       label: 'URL',       type: 'url',          options: '' },
    { key: 'notes',     label: 'Notes',     type: 'text',         options: '' },
  ];

  let iconSelected = '📁';
  let propRows = [];

  overlay.innerHTML = `
    <div style="background:var(--bg-card);border-radius:12px;padding:28px 32px;width:520px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.35)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h2 style="font-size:17px;font-weight:700;margin:0">New Entity Type</h2>
        <button id="_net-close" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--text-muted);line-height:1">×</button>
      </div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
        <button id="_net-icon-btn" style="width:44px;height:44px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">📁</button>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          <input id="_net-display" type="text" placeholder="Display name (e.g. Repositories)" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;background:var(--bg-surface);color:var(--text-primary)" />
          <input id="_net-name" type="text" placeholder="Slug (auto-generated, e.g. repositories)" style="width:100%;padding:6px 12px;border:1px solid var(--border);border-radius:6px;font-size:12px;color:var(--text-muted);background:var(--bg-surface)" />
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Starter properties</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
          ${STARTER_PROPS.map(sp => `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:4px 10px;border:1px solid var(--border);border-radius:20px;background:var(--bg-surface)"><input type="checkbox" data-starter="${sp.key}" style="accent-color:var(--accent)"> ${sp.label}</label>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;padding:6px 8px;background:var(--bg-surface);border-radius:6px;border:1px solid var(--border)">
          <strong>Tags</strong> and any <strong>Taxonomy properties</strong> (Categories, etc.) are always available on every entity — no need to add them here.
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Custom properties</div>
        <div id="_net-propdefs" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"></div>
        <button id="_net-addprop" class="btn btn-sm btn-ghost" style="font-size:12px">+ Add property</button>
      </div>
      <div style="padding:12px 0 16px;border-top:1px solid var(--border);margin-top:4px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="_net-indview" style="accent-color:var(--accent)">
          <span><strong>Individual view</strong> — each record gets its own full-page detail view (like Projects &amp; Goals)</span>
        </label>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:0;border-top:1px solid var(--border)">
        <button id="_net-cancel" class="btn btn-ghost">Cancel</button>
        <button id="_net-create" class="btn btn-primary">Create entity</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const iconBtn = overlay.querySelector('#_net-icon-btn');
  const displayInp = overlay.querySelector('#_net-display');
  const nameInp = overlay.querySelector('#_net-name');
  const propDefsEl = overlay.querySelector('#_net-propdefs');

  // Auto-generate slug from display name
  displayInp.oninput = () => {
    nameInp.value = displayInp.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
  };

  // Icon picker
  iconBtn.onclick = (e) => {
    e.stopPropagation();
    showIconPicker(iconBtn, null, null, iconSelected, (icon) => {
      iconSelected = icon || '📁';
      iconBtn.innerHTML = iconSelected.startsWith('__svg:')
        ? renderEntityIcon(iconSelected, 22)
        : `<span style="font-size:22px">${iconSelected}</span>`;
    });
  };

  // Prop rows builder
  function renderPropDefs() {
    propDefsEl.innerHTML = propRows.map((row, i) => `
      <div style="display:flex;gap:6px;align-items:center">
        <input type="text" placeholder="Label" value="${escHtml(row.label)}" data-idx="${i}" data-field="label" style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:12px;background:var(--bg-surface);color:var(--text-primary)" />
        <select data-idx="${i}" data-field="type" style="padding:5px 6px;border:1px solid var(--border);border-radius:5px;font-size:12px;background:var(--bg-surface);color:var(--text-primary)">
          ${PROP_TYPES.map(t => `<option value="${t}" ${row.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-ghost" data-remove="${i}" style="color:var(--color-danger);flex-shrink:0">×</button>
      </div>`).join('');
    propDefsEl.querySelectorAll('input,select').forEach(el => {
      el.oninput = el.onchange = () => {
        const idx = parseInt(el.dataset.idx);
        const field = el.dataset.field;
        if (field === 'label') {
          propRows[idx].label = el.value;
          propRows[idx].key = el.value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
        } else {
          propRows[idx][field] = el.value;
        }
      };
    });
    propDefsEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = () => { propRows.splice(parseInt(btn.dataset.remove), 1); renderPropDefs(); };
    });
  }

  overlay.querySelector('#_net-addprop').onclick = () => {
    propRows.push({ key: '', label: '', type: 'text' });
    renderPropDefs();
  };

  // Starter props
  overlay.querySelectorAll('[data-starter]').forEach(chk => {
    chk.onchange = () => {
      const sp = STARTER_PROPS.find(p => p.key === chk.dataset.starter);
      if (!sp) return;
      if (chk.checked) {
        if (!propRows.find(r => r.key === sp.key)) {
          const row = { key: sp.key, label: sp.label, type: sp.type };
          if (sp.options) row.options = sp.options.split(',').map(s => s.trim());
          propRows.push(row);
          renderPropDefs();
        }
      } else {
        propRows = propRows.filter(r => r.key !== sp.key);
        renderPropDefs();
      }
    };
  });

  // Close
  const close = () => overlay.remove();
  overlay.querySelector('#_net-close').onclick = close;
  overlay.querySelector('#_net-cancel').onclick = close;
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });

  // Create
  overlay.querySelector('#_net-create').onclick = async () => {
    const display_name = displayInp.value.trim();
    const name = nameInp.value.trim() || display_name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if (!name || !display_name) { showToast('Display name is required', 'error'); return; }
    const icon = iconSelected || '📁';
    const validRows = propRows.filter(r => r.key && r.label);
    const prop_defs = JSON.stringify(validRows);
    const has_detail_view = !!(overlay.querySelector('#_net-indview')?.checked);
    try {
      await api('POST', '/api/custom-types', { name, display_name, icon, prop_defs, has_detail_view });
      await loadCustomEntityTypes();
      showToast(`"${display_name}" created`);
      close();
    } catch(err) { showToast('Failed: ' + (err.message || err), 'error'); }
  };
}

/* ─── Raibis Settings Window ─────────────────────────────────────────── */
async function openRaibisSettings(defaultTab = 'apps') {
  document.getElementById('_settings-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = '_settings-overlay';
  overlay.className = 'settings-overlay';

  overlay.innerHTML = `
    <div class="settings-modal" id="_settings-modal">
      <div class="settings-sidebar">
        <div class="settings-sidebar-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
          raibis
        </div>
        <button class="settings-tab${defaultTab==='data'?' active':''}" data-stab="data">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          Data
        </button>
        <button class="settings-tab${defaultTab==='vault'?' active':''}" data-stab="vault">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Vault
        </button>
        <button class="settings-tab${defaultTab==='apps'?' active':''}" data-stab="apps">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Connected Apps
        </button>
        <button class="settings-tab${defaultTab==='integrations'?' active':''}" data-stab="integrations">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          App Integrations
        </button>
      </div>
      <div class="settings-content" id="_settings-content">
        <div class="settings-content-header">
          <span class="settings-content-title" id="_settings-title">Connected Apps</span>
          <button class="settings-close-btn" id="_settings-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="settings-body" id="_settings-body">
          <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:32px 0">Loading…</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('_settings-close').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function escH(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escH); }
  });

  // Tab switching
  overlay.querySelectorAll('.settings-tab').forEach(tab => {
    tab.onclick = () => {
      overlay.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSettingsTab(tab.dataset.stab);
    };
  });

  renderSettingsTab(defaultTab);

  async function renderSettingsTab(tab) {
    const body = document.getElementById('_settings-body');
    const title = document.getElementById('_settings-title');
    body.innerHTML = `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:32px 0">Loading…</div>`;

    if (tab === 'data') {
      title.textContent = 'Data Management';
      await renderDataTab(body);
    } else if (tab === 'vault') {
      title.textContent = 'Vault';
      await renderVaultTab(body);
    } else if (tab === 'apps') {
      title.textContent = 'Connected Apps';
      await renderAppsTab(body);
    } else {
      title.textContent = 'App Integrations';
      await renderIntegrationsTab(body);
    }
  }

  async function renderDataTab(body) {
    body.innerHTML = '';
    // ── Custom Entity Types section ───────────────────────────────────────────
    const cetSection = document.createElement('div');
    cetSection.style.cssText = 'margin-bottom:20px;border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:16px;background:var(--color-surface)';
    cetSection.innerHTML = `
      <h4 style="margin:0 0 12px;font-size:13px;font-weight:600">Custom Entity Types</h4>
      <div id="_cet-list" style="margin-bottom:16px"></div>
      <div style="border-top:1px solid var(--color-border);padding-top:14px">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Define New Type</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;gap:8px;align-items:flex-end">
            <div class="form-group" style="flex:2;margin:0"><label class="form-label" style="font-size:11px">Slug (e.g. "repository")</label>
              <input type="text" id="_cet-name" placeholder="repository" style="width:100%" /></div>
            <div class="form-group" style="flex:2;margin:0"><label class="form-label" style="font-size:11px">Display Name</label>
              <input type="text" id="_cet-display" placeholder="Repository" style="width:100%" /></div>
            <div class="form-group" style="flex:0 0 auto;margin:0"><label class="form-label" style="font-size:11px;display:block;margin-bottom:4px">Icon</label>
              <button id="_cet-icon-btn" style="width:40px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card);cursor:pointer" title="Pick icon">📁</button>
            </div>
          </div>
          <div>
            <label class="form-label" style="font-size:11px;margin-bottom:6px;display:block">Properties</label>
            <div style="margin-bottom:10px">
              <label style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Starter Properties</label>
              <div id="_cet-starters" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                ${['status','priority','due_date','tags','category','notes'].map(k => {
                  const labels = { status:'Status', priority:'Priority', due_date:'Due Date', tags:'Tags', category:'Category', notes:'Notes' };
                  return `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;padding:3px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card)"><input type="checkbox" data-starter="${k}" style="cursor:pointer;accent-color:var(--accent)">${labels[k]}</label>`;
                }).join('')}
              </div>
            </div>
            <div id="_cet-propdefs" style="display:flex;flex-direction:column;gap:6px"></div>
            <button class="btn btn-sm btn-ghost" id="_cet-addprop" style="margin-top:6px">+ Add property</button>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
              <input type="checkbox" id="_cet-has-detail-view" style="cursor:pointer;accent-color:var(--accent)">
              Individual view (full page with widgets, like Goals/Projects)
            </label>
          </div>
          <div>
            <button class="btn btn-primary btn-sm" id="_cet-create">Create Entity Type</button>
          </div>
        </div>
      </div>`;
    body.prepend(cetSection);

    async function renderCetList() {
      const list = document.getElementById('_cet-list');
      if (!list) return;
      await loadCustomEntityTypes();
      const types = customEntityTypes;
      renderCustomEntityNav();
      if (!types.length) {
        list.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">No custom entity types defined yet.</div>';
        return;
      }
      list.innerHTML = types.map(t => {
        const iconDisplay = t.icon
          ? (t.icon.startsWith('__svg:') ? renderEntityIcon(t.icon, 16) : `<span style="font-size:16px">${t.icon}</span>`)
          : `<span style="font-size:16px">📁</span>`;
        let propDefs = [];
        try { propDefs = t.prop_defs ? JSON.parse(t.prop_defs) : []; } catch(e) {}
        const taxProps = getGlobalTaxonomyProps();
        const propDefsHtml = (propDefs.length || taxProps.length)
          ? [
              ...propDefs.map((pd, i) => `
                <div style="display:flex;align-items:center;gap:6px;padding:3px 0" data-prop-idx="${i}" data-type-name="${escHtml(t.name)}">
                  <span style="font-size:11px;color:var(--text-muted);width:70px;flex-shrink:0">${escHtml(pd.key)}</span>
                  <span style="font-size:11px;flex:1">${escHtml(pd.label || pd.key)}</span>
                  <span style="font-size:10px;color:var(--text-muted);width:60px;flex-shrink:0">${escHtml(pd.type || 'text')}</span>
                  <button class="btn btn-sm btn-ghost _cet-prop-del" data-type-name="${escHtml(t.name)}" data-prop-idx="${i}" style="color:var(--color-danger);padding:0 4px;font-size:12px" title="Delete property">×</button>
                </div>`),
              ...taxProps.map(tp => `
                <div style="display:flex;align-items:center;gap:6px;padding:3px 0;opacity:0.7">
                  <span style="font-size:11px;color:var(--text-muted);width:70px;flex-shrink:0">tax_${escHtml(tp.key)}</span>
                  <span style="font-size:11px;flex:1">${escHtml(tp.label)}</span>
                  <span style="font-size:10px;color:var(--accent);width:60px;flex-shrink:0">taxonomy</span>
                </div>`),
            ].join('')
          : '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">No custom properties defined.</div>';
        return `
        <div style="border-bottom:1px solid var(--color-border);padding:6px 0">
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn btn-sm btn-ghost _cet-icon" data-name="${escHtml(t.name)}" title="Change icon" style="padding:2px 4px;min-width:28px;display:flex;align-items:center;justify-content:center">${iconDisplay}</button>
            <input type="text" class="_cet-display-name" data-name="${escHtml(t.name)}" value="${escHtml(t.display_name)}" style="flex:1;font-size:13px;font-weight:500;border:1px solid transparent;border-radius:4px;padding:2px 6px;background:transparent;color:var(--text-primary)" title="Click to rename" />
            <span style="font-size:11px;color:var(--text-muted)">${escHtml(t.name)}</span>
            <label title="Individual view" style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;color:var(--text-muted)">
              <input type="checkbox" class="_cet-detail-view" data-name="${escHtml(t.name)}" ${t.has_detail_view ? 'checked' : ''} style="cursor:pointer;accent-color:var(--accent)">
              Detail view
            </label>
            <button class="btn btn-sm btn-ghost _cet-toggle-props" data-name="${escHtml(t.name)}" title="Manage properties" style="font-size:11px">Props ▾</button>
            <button class="btn btn-sm btn-ghost _cet-del" data-name="${escHtml(t.name)}" style="color:var(--color-danger)">Delete</button>
          </div>
          <div class="_cet-props-panel" data-name="${escHtml(t.name)}" style="display:none;padding:6px 8px 4px 36px;background:var(--color-surface-secondary,var(--color-surface));border-radius:4px;margin-top:4px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Properties</div>
            <div class="_cet-props-list" data-name="${escHtml(t.name)}">${propDefsHtml}</div>
            <button class="btn btn-sm btn-ghost _cet-add-prop" data-name="${escHtml(t.name)}" style="margin-top:6px;font-size:11px">+ Add Property</button>
          </div>
        </div>`;
      }).join('');
      list.querySelectorAll('._cet-icon').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const tName = btn.dataset.name;
          const t = customEntityTypes.find(ct => ct.name === tName);
          if (!t) return;
          showIconPicker(btn, null, null, t.icon || '📁', async (newIcon) => {
            const icon = newIcon || '📁';
            try {
              await api('PUT', `/api/custom-types/${tName}`, { display_name: t.display_name, icon, prop_defs: t.prop_defs || '', has_detail_view: t.has_detail_view });
              await renderCetList();
            } catch(err) { showToast('Failed to update icon: ' + (err.message || err), 'error'); }
          });
        };
      });
      list.querySelectorAll('._cet-display-name').forEach(inp => {
        inp.onfocus = () => { inp.style.border = '1px solid var(--accent)'; inp.style.background = 'var(--color-surface)'; };
        inp.onblur = async () => {
          inp.style.border = '1px solid transparent'; inp.style.background = 'transparent';
          const tName = inp.dataset.name;
          const t = customEntityTypes.find(ct => ct.name === tName);
          if (!t || inp.value.trim() === t.display_name) return;
          const newName = inp.value.trim();
          if (!newName) { inp.value = t.display_name; return; }
          try {
            await api('PUT', `/api/custom-types/${tName}`, { display_name: newName, icon: t.icon || '📁', prop_defs: t.prop_defs || '', has_detail_view: t.has_detail_view });
            t.display_name = newName;
            renderCustomEntityNav();
            showToast('Renamed');
          } catch(err) { showToast('Failed to rename', 'error'); inp.value = t.display_name; }
        };
        inp.onkeydown = (e) => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = customEntityTypes.find(ct => ct.name === inp.dataset.name)?.display_name || inp.value; inp.blur(); } };
      });
      list.querySelectorAll('._cet-toggle-props').forEach(btn => {
        btn.onclick = () => {
          const panel = list.querySelector(`._cet-props-panel[data-name="${btn.dataset.name}"]`);
          if (!panel) return;
          const visible = panel.style.display !== 'none';
          panel.style.display = visible ? 'none' : 'block';
          btn.textContent = visible ? 'Props ▾' : 'Props ▴';
        };
      });
      list.querySelectorAll('._cet-prop-del').forEach(btn => {
        btn.onclick = async () => {
          const tName = btn.dataset.typeName;
          const idx = parseInt(btn.dataset.propIdx);
          const t = customEntityTypes.find(ct => ct.name === tName);
          if (!t) return;
          let defs = [];
          try { defs = t.prop_defs ? JSON.parse(t.prop_defs) : []; } catch(e) {}
          defs.splice(idx, 1);
          const newPropDefs = JSON.stringify(defs);
          try {
            await api('PUT', `/api/custom-types/${tName}`, { display_name: t.display_name, icon: t.icon || '📁', prop_defs: newPropDefs, has_detail_view: t.has_detail_view });
            t.prop_defs = newPropDefs;
            await renderCetList();
            // Re-open the props panel for that type
            const panel = list.querySelector(`._cet-props-panel[data-name="${tName}"]`);
            if (panel) { panel.style.display = 'block'; const toggleBtn = list.querySelector(`._cet-toggle-props[data-name="${tName}"]`); if (toggleBtn) toggleBtn.textContent = 'Props ▴'; }
            showToast('Property deleted');
          } catch(err) { showToast('Failed to delete property', 'error'); }
        };
      });
      list.querySelectorAll('._cet-add-prop').forEach(btn => {
        btn.onclick = () => {
          const tName = btn.dataset.name;
          const t = customEntityTypes.find(ct => ct.name === tName);
          if (!t) return;
          const panelList = list.querySelector(`._cet-props-list[data-name="${tName}"]`);
          if (!panelList) return;
          const addRow = document.createElement('div');
          addRow.style.cssText = 'display:flex;gap:6px;align-items:center;padding:3px 0';
          addRow.innerHTML = `
            <input type="text" placeholder="key" style="width:80px;font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px" class="_new-prop-key" />
            <input type="text" placeholder="Label" style="width:90px;font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px" class="_new-prop-label" />
            <select style="font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px" class="_new-prop-type">
              ${['text','number','date','select','url','multi_select'].map(o => `<option value="${o}">${o}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-primary _new-prop-save" style="font-size:11px;padding:2px 8px">Add</button>
            <button class="btn btn-sm btn-ghost _new-prop-cancel" style="font-size:11px;padding:2px 6px">×</button>`;
          panelList.appendChild(addRow);
          addRow.querySelector('._new-prop-cancel').onclick = () => addRow.remove();
          addRow.querySelector('._new-prop-save').onclick = async () => {
            const key = addRow.querySelector('._new-prop-key').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const label = addRow.querySelector('._new-prop-label').value.trim() || key;
            const type = addRow.querySelector('._new-prop-type').value;
            if (!key) { showToast('Key is required', 'error'); return; }
            let defs = [];
            try { defs = t.prop_defs ? JSON.parse(t.prop_defs) : []; } catch(e) {}
            if (defs.some(d => d.key === key)) { showToast('Property key already exists', 'error'); return; }
            defs.push({ key, label, type });
            const newPropDefs = JSON.stringify(defs);
            try {
              await api('PUT', `/api/custom-types/${tName}`, { display_name: t.display_name, icon: t.icon || '📁', prop_defs: newPropDefs, has_detail_view: t.has_detail_view });
              t.prop_defs = newPropDefs;
              await renderCetList();
              const panel = list.querySelector(`._cet-props-panel[data-name="${tName}"]`);
              if (panel) { panel.style.display = 'block'; const toggleBtn = list.querySelector(`._cet-toggle-props[data-name="${tName}"]`); if (toggleBtn) toggleBtn.textContent = 'Props ▴'; }
              showToast('Property added');
            } catch(err) { showToast('Failed to add property', 'error'); }
          };
        };
      });
      list.querySelectorAll('._cet-detail-view').forEach(chk => {
        chk.onchange = async () => {
          const tName = chk.dataset.name;
          const t = customEntityTypes.find(ct => ct.name === tName);
          if (!t) return;
          try {
            await api('PUT', `/api/custom-types/${tName}`, { display_name: t.display_name, icon: t.icon || '📁', prop_defs: t.prop_defs || '', has_detail_view: chk.checked });
            // Update in-memory cache without full reload
            t.has_detail_view = chk.checked;
          } catch(err) { showToast('Failed to update: ' + (err.message || err), 'error'); chk.checked = !chk.checked; }
        };
      });
      list.querySelectorAll('._cet-del').forEach(btn => {
        btn.onclick = () => {
          showConfirmModal(`Delete type "${btn.dataset.name}" and all its entities?`, async () => {
            await api('DELETE', `/api/custom-types/${btn.dataset.name}`);
            await renderCetList();
          });
        };
      });
    }
    await renderCetList();

    // Property defs builder
    let propDefsRows = [];
    function renderPropDefsUI() {
      const pd = document.getElementById('_cet-propdefs');
      if (!pd) return;
      pd.innerHTML = propDefsRows.map((row, i) => `
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" placeholder="key" value="${escHtml(row.key)}" data-idx="${i}" data-field="key" style="width:90px" />
          <input type="text" placeholder="Label" value="${escHtml(row.label)}" data-idx="${i}" data-field="label" style="width:100px" />
          <select data-idx="${i}" data-field="type" style="flex:1">
            ${['text','number','date','select','url'].map(opt => `<option value="${opt}" ${row.type===opt?'selected':''}>${opt}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-ghost" data-remove="${i}" style="color:var(--color-danger)">×</button>
        </div>`).join('');
      pd.querySelectorAll('input,select').forEach(el => {
        el.oninput = el.onchange = () => {
          const idx = parseInt(el.dataset.idx);
          propDefsRows[idx][el.dataset.field] = el.value;
        };
      });
      pd.querySelectorAll('[data-remove]').forEach(btn => {
        btn.onclick = () => { propDefsRows.splice(parseInt(btn.dataset.remove), 1); renderPropDefsUI(); };
      });
    }
    cetSection.querySelector('#_cet-addprop').onclick = () => {
      propDefsRows.push({ key: '', label: '', type: 'text' });
      renderPropDefsUI();
    };

    // Starter properties
    const STARTER_PROPS = [
      { key: 'status',    label: 'Status',    type: 'select',       options: 'To Do,In Progress,Done' },
      { key: 'priority',  label: 'Priority',  type: 'select',       options: 'Low,Medium,High' },
      { key: 'due_date',  label: 'Due Date',  type: 'date' },
      { key: 'tags',      label: 'Tags',      type: 'multi_select', options: '' },
      { key: 'category',  label: 'Category',  type: 'text' },
      { key: 'notes',     label: 'Notes',     type: 'text' },
    ];
    cetSection.querySelectorAll('[data-starter]').forEach(chk => {
      chk.onchange = () => {
        const sp = STARTER_PROPS.find(p => p.key === chk.dataset.starter);
        if (!sp) return;
        if (chk.checked) {
          if (!propDefsRows.find(r => r.key === sp.key)) {
            propDefsRows.push({ key: sp.key, label: sp.label, type: sp.type });
            renderPropDefsUI();
          }
        } else {
          propDefsRows = propDefsRows.filter(r => r.key !== sp.key);
          renderPropDefsUI();
        }
      };
    });

    // Wire icon picker for entity type icon button
    let cetIconSelected = '📁';
    const cetIconBtn = cetSection.querySelector('#_cet-icon-btn');
    if (cetIconBtn) {
      cetIconBtn.onclick = (e) => {
        e.stopPropagation();
        showIconPicker(cetIconBtn, null, null, cetIconSelected, (icon) => {
          cetIconSelected = icon || '📁';
          cetIconBtn.innerHTML = cetIconSelected.startsWith('__svg:')
            ? renderEntityIcon(cetIconSelected, 20)
            : `<span style="font-size:20px">${cetIconSelected}</span>`;
        });
      };
    }

    cetSection.querySelector('#_cet-create').onclick = async () => {
      const name = (cetSection.querySelector('#_cet-name').value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const display_name = (cetSection.querySelector('#_cet-display').value || '').trim();
      const icon = cetIconSelected || '📁';
      const has_detail_view = !!(cetSection.querySelector('#_cet-has-detail-view')?.checked);
      if (!name || !display_name) { showToast('Name and display name are required', 'error'); return; }
      const prop_defs = JSON.stringify(propDefsRows.filter(r => r.key));
      try {
        await api('POST', '/api/custom-types', { name, display_name, icon, prop_defs, has_detail_view });
        showToast(`Type "${display_name}" created`);
        propDefsRows = [];
        cetIconSelected = '📁';
        if (cetIconBtn) cetIconBtn.innerHTML = '<span style="font-size:20px">📁</span>';
        cetSection.querySelector('#_cet-name').value = '';
        cetSection.querySelector('#_cet-display').value = '';
        const hdvChk = cetSection.querySelector('#_cet-has-detail-view');
        if (hdvChk) hdvChk.checked = false;
        cetSection.querySelectorAll('[data-starter]').forEach(chk => { chk.checked = false; });
        renderPropDefsUI();
        await renderCetList();
      } catch(err) { showToast('Failed: ' + (err.message || err), 'error'); }
    };

    const ENTITY_TYPES = [
      { key: 'tasks',      label: 'Tasks',      api: 'tasks',      titleKey: 'title', exportKey: 'tasks',      navView: 'tasks',
        createFn: () => { overlay.remove(); showNewTaskModal({}, renderCurrentView); } },
      { key: 'goals',      label: 'Goals',      api: 'goals',      titleKey: 'title', exportKey: 'goals',      navView: 'goals',
        createFn: () => { overlay.remove(); showGoalModal(null, renderCurrentView); } },
      { key: 'projects',   label: 'Projects',   api: 'projects',   titleKey: 'title', exportKey: 'projects',   navView: 'projects',
        createFn: () => { overlay.remove(); showProjectModal(null, [], renderCurrentView); } },
      { key: 'notes',      label: 'Notes',      api: 'notes',      titleKey: 'title', exportKey: 'notes',      navView: 'notes',
        createFn: () => { overlay.remove(); showNoteModal(null, renderCurrentView); } },
      { key: 'resources',  label: 'Resources',  api: 'resources',  titleKey: 'title', exportKey: 'resources',  navView: 'resources',
        createFn: () => { overlay.remove(); showResourceModal({}, renderCurrentView); } },
      { key: 'sprints',    label: 'Sprints',    api: 'sprints',    titleKey: 'title', exportKey: 'sprints',    navView: 'sprints',
        createFn: () => showSprintCreateModal(loadEntities.bind(null, ENTITY_TYPES.find(t => t.key === 'sprints'))) },
      { key: 'habits',     label: 'Habits',     api: 'habits',     titleKey: 'name',  exportKey: 'habits',     navView: 'habits',
        createFn: () => { overlay.remove(); showHabitModal(null); } },
    ];
    // Append custom entity types as browsable tabs
    customEntityTypes.forEach(ct => {
      const ctName = ct.name;
      ENTITY_TYPES.push({
        key: `custom_${ctName}`,
        label: ct.display_name,
        api: `custom/${ctName}`,
        titleKey: 'title',
        exportKey: null,
        createFn: () => { overlay.remove(); openCustomEntityForm(ctName, null); },
      });
    });

    // Dedicated container so loadEntities doesn't destroy the CET section above
    const dataSection = document.createElement('div');
    dataSection.style.cssText = 'border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:16px;background:var(--color-surface);margin-bottom:20px';
    body.appendChild(dataSection);

    let activeType = ENTITY_TYPES[0];

    async function loadEntities(type) {
      activeType = type;
      const singularLabel = type.label.replace(/s$/, '');
      dataSection.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${ENTITY_TYPES.map(t => `<button class="btn btn-sm ${t.key===type.key?'btn-primary':'btn-ghost'}" data-dtype="${t.key}">${t.label}</button>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span id="_data-count" style="font-size:12px;color:var(--text-muted)"></span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-ghost btn-sm" id="_data-clear-all" style="color:var(--color-danger)">Clear All Data</button>
            <button class="btn btn-ghost btn-sm" id="_data-del-entity" style="color:var(--color-danger)">Delete Entity</button>
            <button class="btn btn-primary btn-sm" id="_data-create">+ New ${singularLabel}</button>
          </div>
        </div>
        <div id="_data-content" style="color:var(--text-muted);font-size:13px;padding:8px 0">Loading…</div>`;

      dataSection.querySelectorAll('[data-dtype]').forEach(btn => {
        btn.onclick = () => loadEntities(ENTITY_TYPES.find(t => t.key === btn.dataset.dtype));
      });
      const createBtn = dataSection.querySelector('#_data-create');
      if (createBtn) createBtn.onclick = type.createFn || (() => showToast('No create action for ' + type.label, 'info'));

      // "Delete Entity" — deletes all records AND removes from nav (disables the entity)
      const delEntityBtn = dataSection.querySelector('#_data-del-entity');
      if (delEntityBtn) {
        delEntityBtn.onclick = () => showConfirmModal(
          `Completely delete "${type.label}"? This removes ALL records and hides the entity from the sidebar. This cannot be undone.`,
          async () => {
            try {
              const items = await api('GET', `/api/${type.api}`);
              const list = Array.isArray(items) ? items : (items[type.key] || []);
              await Promise.all(list.map(item => api('DELETE', `/api/${type.api}/${item.id}`).catch(() => {})));
              if (type.key.startsWith('custom_')) {
                // For custom types: also delete the type definition
                const ctName = type.key.replace(/^custom_/, '');
                await api('DELETE', `/api/custom-types/${ctName}`);
                customEntityTypes = customEntityTypes.filter(ct => ct.name !== ctName);
                renderCustomEntityNav();
                await renderCetList();
                await loadEntities(ENTITY_TYPES[0]);
              } else {
                // For built-in types: hide from nav
                const disabled = getDisabledBuiltinEntities();
                if (!disabled.includes(type.navView || type.key)) disabled.push(type.navView || type.key);
                setDisabledBuiltinEntities(disabled);
                applyDisabledBuiltinEntities();
                renderCurrentView();
                await loadEntities(ENTITY_TYPES[0]);
              }
              showToast(`${type.label} deleted`);
            } catch(e) { showToast('Failed to delete entity', 'error'); }
          }
        );
      }


      const clearAllBtn = dataSection.querySelector('#_data-clear-all');
      if (clearAllBtn) {
        clearAllBtn.onclick = () => showConfirmModal(
          `Delete ALL ${type.label.toLowerCase()}? This permanently removes all records and cannot be undone.`,
          async () => {
            try {
              const items = await api('GET', `/api/${type.api}`);
              const list = Array.isArray(items) ? items : (items[type.key] || []);
              await Promise.all(list.map(item => api('DELETE', `/api/${type.api}/${item.id}`).catch(() => {})));
              renderCurrentView();
              loadEntities(type);
              showToast(`All ${type.label.toLowerCase()} deleted`);
            } catch(e) { showToast('Failed to clear data', 'error'); }
          }
        );
      }

      const content = dataSection.querySelector('#_data-content');
      const countEl  = dataSection.querySelector('#_data-count');
      try {
        let items = await api('GET', `/api/${type.api}`);
        if (!Array.isArray(items)) items = items[type.key] || [];
        countEl.textContent = `${items.length} ${type.label.toLowerCase()}`;
        if (!items.length) {
          content.innerHTML = `<div style="text-align:center;padding:24px 0;color:var(--text-muted)">No ${type.label.toLowerCase()} yet.</div>`;
        } else {
          content.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:4px">
              ${items.map(item => `
                <div class="_data-row" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface)">
                  <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(item[type.titleKey] || '(untitled)')}</span>
                  ${type.exportKey ? `<button class="btn btn-sm btn-ghost _data-export-item" data-id="${item.id}" title="Export as JSON" style="flex-shrink:0">⬇</button>` : ''}
                  <button class="btn btn-sm btn-ghost _data-del" data-id="${item.id}" style="color:var(--color-danger);flex-shrink:0">Delete</button>
                </div>`).join('')}
            </div>`;
          if (type.exportKey) {
            content.querySelectorAll('._data-export-item').forEach(btn => {
              btn.onclick = () => downloadEntityJson(type.exportKey.replace(/s$/, ''), btn.dataset.id,
                `${type.exportKey.replace(/s$/, '')}-${btn.dataset.id}.json`);
            });
          }
        }
        content.querySelectorAll('._data-del').forEach(btn => {
          btn.onclick = () => {
            const name = btn.closest('._data-row').querySelector('span').textContent;
            showConfirmModal(`Delete "${name}"?`, async () => {
              await api('DELETE', `/api/${type.api}/${btn.dataset.id}`);
              renderCurrentView();
              loadEntities(type);
            });
          };
        });
      } catch(e) {
        content.innerHTML = `<div style="color:var(--color-danger);font-size:13px">Failed to load ${type.label.toLowerCase()}.</div>`;
      }
    }

    await loadEntities(activeType);

    // ── Restore hidden entities ────────────────────────────────────────────
    function renderRestoreSection() {
      const disabled = getDisabledBuiltinEntities();
      const restoreSection = body.querySelector('#_restore-section');
      if (!disabled.length) { if (restoreSection) restoreSection.remove(); return; }
      const LABELS = { tasks:'Tasks', goals:'Goals', projects:'Projects', notes:'Notes', resources:'Resources', sprints:'Sprints', habits:'Habits', calendar:'Calendar', pomodoro:'Pomodoro', automations:'Automations' };
      const html = `<div id="_restore-section" style="border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:16px;background:var(--color-surface);margin-bottom:20px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">Hidden entities</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${disabled.map(v => `<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border);border-radius:20px;font-size:12px">
            <span>${escHtml(LABELS[v] || v)}</span>
            <button class="btn btn-sm btn-ghost _restore-btn" data-view="${escHtml(v)}" style="padding:0 4px;font-size:11px">Restore</button>
          </div>`).join('')}
        </div>
      </div>`;
      if (restoreSection) restoreSection.outerHTML = html;
      else body.insertBefore(document.createRange().createContextualFragment(html), dataSection);
      body.querySelectorAll('._restore-btn').forEach(btn => {
        btn.onclick = () => {
          const view = btn.dataset.view;
          const updated = getDisabledBuiltinEntities().filter(v => v !== view);
          setDisabledBuiltinEntities(updated);
          applyDisabledBuiltinEntities();
          renderRestoreSection();
        };
      });
    }
    renderRestoreSection();

    // ── Export section ────────────────────────────────────────────────────
    const builtinExportTypes = ENTITY_TYPES.filter(t => t.exportKey);
    const customExportTypes = customEntityTypes.map(ct => ({ name: ct.name, label: ct.display_name }));
    const exportSection = document.createElement('div');
    exportSection.className = 'settings-export-section';
    exportSection.innerHTML = `
      <h4>Export as JSON</h4>
      <div class="settings-export-checks">
        ${builtinExportTypes.map(t => `
          <label class="settings-export-check">
            <input type="checkbox" value="${t.exportKey}" data-kind="builtin" checked> ${t.label}
          </label>`).join('')}
        ${customExportTypes.map(ct => `
          <label class="settings-export-check">
            <input type="checkbox" value="${ct.name}" data-kind="custom" checked> ${ct.label}
          </label>`).join('')}
      </div>
      <button class="btn btn-sm" id="_export-all-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export selected
      </button>`;
    body.appendChild(exportSection);
    body.querySelector('#_export-all-btn').onclick = async () => {
      const builtinChecked = [...body.querySelectorAll('.settings-export-checks input[data-kind="builtin"]:checked')].map(el => el.value);
      const customChecked = [...body.querySelectorAll('.settings-export-checks input[data-kind="custom"]:checked')].map(el => el.value);
      if (!builtinChecked.length && !customChecked.length) { showToast('Select at least one entity type', 'info'); return; }
      try {
        const data = {};
        if (builtinChecked.length) {
          const builtinData = await api('GET', `/api/export?entities=${builtinChecked.join(',')}`);
          Object.assign(data, builtinData);
        }
        for (const typeName of customChecked) {
          try {
            const items = await api('GET', `/api/custom/${typeName}`);
            data[typeName] = Array.isArray(items) ? items : [];
          } catch(e) { data[typeName] = []; }
        }
        downloadJson(data, `raibis-export-${new Date().toISOString().slice(0,10)}.json`);
      } catch { showToast('Export failed', 'error'); }
    };

    // ── Danger zone ───────────────────────────────────────────────────────
    const dangerZone = document.createElement('div');
    dangerZone.className = 'settings-danger-zone';
    dangerZone.innerHTML = `
      <h4>Danger Zone</h4>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="font-size:12px;color:var(--color-text-secondary)">
          Delete <strong>all data</strong> — tasks, goals, projects, notes, resources, automations — and all Obsidian vault files. This cannot be undone.
        </div>
        <button class="btn btn-sm" id="_clean-slate-btn" style="background:var(--color-danger,#ef4444);color:#fff;border-color:var(--color-danger,#ef4444);flex-shrink:0">
          Clean slate
        </button>
      </div>`;
    body.appendChild(dangerZone);
    body.querySelector('#_clean-slate-btn').onclick = () => {
      showConfirmModal('Delete ALL data and vault files? This cannot be undone.', async () => {
        showConfirmModal('Are you absolutely sure? Type-to-confirm not required, but this is irreversible.', async () => {
          try {
            await api('DELETE', '/api/data/purge');
            // Clear ALL entity-related localStorage state so stale IDs don't
            // bleed into newly-created entities (which reuse the same numeric IDs
            // after the DB AUTOINCREMENT counter resets).
            const CLEAR_PREFIXES = [
              'savedViews_', 'entityViews_', 'customPropDefs_', 'customPropVals_',
              'propSections_', 'propOverrides_', 'propOrder_', 'entityVisProps_',
              'entityHiddenTax_', 'activeTab_', 'taxonomyOpts_', 'taskVisProps_',
            ];
            Object.keys(localStorage).forEach(k => {
              if (CLEAR_PREFIXES.some(p => k.startsWith(p)) || k === 'globalTaxonomyProps') {
                localStorage.removeItem(k);
              }
            });
            showToast('All data deleted — reloading…', 'success');
            setTimeout(() => location.reload(), 800);
          } catch { showToast('Purge failed', 'error'); }
        });
      });
    };
  }

  function showSprintCreateModal(onCreated) {
    const modalEl = document.createElement('div');
    modalEl.className = 'settings-overlay';
    modalEl.innerHTML = `
      <div class="settings-modal" style="max-width:420px;width:92vw">
        <div class="settings-content">
          <div class="settings-content-header">
            <span class="settings-content-title">New Sprint</span>
            <button class="settings-close-btn" id="_sc-close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="settings-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
            <div class="auto-form-group">
              <label class="auto-form-label">Sprint Name <span style="color:var(--color-danger)">*</span></label>
              <input class="auto-form-input" id="_sc-title" placeholder="Sprint 1…">
            </div>
            <div style="display:flex;gap:10px">
              <div class="auto-form-group" style="flex:2;margin:0">
                <label class="auto-form-label">Project <span style="font-size:10px;color:var(--text-muted)">(optional)</span></label>
                <select class="auto-form-select" id="_sc-project" style="width:100%">
                  <option value="">— no project —</option>
                </select>
              </div>
              <div class="auto-form-group" style="flex:1;margin:0">
                <label class="auto-form-label">Capacity (pts)</label>
                <input class="auto-form-input" id="_sc-points" type="number" min="0" placeholder="e.g. 40">
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-primary btn-sm" id="_sc-save">Create Sprint</button>
              <button class="btn btn-sm btn-ghost" id="_sc-cancel">Cancel</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    const close = () => modalEl.remove();
    modalEl.querySelector('#_sc-close').onclick = close;
    modalEl.querySelector('#_sc-cancel').onclick = close;
    modalEl.addEventListener('click', e => { if (e.target === modalEl) close(); });
    // Load projects (optional)
    api('GET', '/api/projects').then(projects => {
      const sel = modalEl.querySelector('#_sc-project');
      sel.innerHTML = `<option value="">— no project —</option>` +
        (projects || []).map(p => `<option value="${p.id}">${escHtml(p.title)}</option>`).join('');
    }).catch(() => {});
    modalEl.querySelector('#_sc-save').onclick = async () => {
      const title = modalEl.querySelector('#_sc-title').value.trim();
      if (!title) { showToast('Sprint name is required', 'error'); return; }
      const projectId = parseInt(modalEl.querySelector('#_sc-project').value) || 0;
      const ptsRaw = modalEl.querySelector('#_sc-points').value.trim();
      const payload = { title };
      if (projectId) payload.project_id = projectId;
      if (ptsRaw !== '') payload.story_points = parseInt(ptsRaw) || 0;
      try {
        await api('POST', '/api/sprints', payload);
        showToast('Sprint created', 'success');
        close();
        onCreated?.();
      } catch { showToast('Failed to create sprint', 'error'); }
    };
  }

  async function renderVaultTab(body) {
    let cfg = {};
    try { cfg = await api('GET', '/api/config'); } catch(e) { cfg = { vault_path: '(unknown)' }; }
    const vaultPath = cfg.vault_path || '(not set)';
    const isObsidian = vaultPath.includes('Documents') || vaultPath.toLowerCase().includes('obsidian');
    body.innerHTML = `
      <div class="vault-settings">
        <div class="vault-settings-row">
          <div class="vault-settings-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Vault Path
          </div>
          <div class="vault-settings-value">
            <code style="font-size:12px;background:var(--bg-card);padding:4px 8px;border-radius:4px;border:1px solid var(--border);display:block;word-break:break-all">${vaultPath}</code>
            ${isObsidian ? '<div style="color:var(--color-success);font-size:11px;margin-top:4px">✓ Obsidian vault detected</div>' : ''}
          </div>
        </div>
        <div class="vault-settings-row" style="align-items:flex-start;margin-top:12px">
          <div class="vault-settings-label">Structure</div>
          <div class="vault-settings-value" style="font-size:12px;color:var(--text-muted);line-height:1.6">
            Notes → <code>${vaultPath}/notes/</code><br>
            Resources → <code>${vaultPath}/resources/</code>
          </div>
        </div>
        <div style="margin-top:20px;padding:12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);font-size:12px;color:var(--text-muted);line-height:1.7">
          <strong style="color:var(--text)">To change the vault path:</strong><br>
          Web mode: set <code>LIFEOS_VAULT=/path/to/vault</code> in the Makefile or environment.<br>
          Desktop app: the vault is configured in <code>main.rs</code> (requires rebuild).
        </div>
      </div>`;
  }

  async function renderAppsTab(body) {
    let apps;
    try { apps = await api('GET', '/api/apps/status'); }
    catch(e) { body.innerHTML = `<div class="apps-empty">Could not load apps.</div>`; return; }

    function buildEditCard(app) {
      const colorStyle = app.color ? `--app-color:${app.color}` : '';
      return `
        <div class="app-edit-card" data-app-id="${app.id}" style="${colorStyle}">
          <div class="app-edit-card-header">
            <span class="app-edit-card-title">
              <span style="font-size:16px">${escHtml(app.icon||'⚙')}</span>
              ${escHtml(app.name)}
              <span class="app-status-badge ${app.running?'online':'offline'}" style="margin-left:4px">${app.running?'Running':'Offline'}</span>
            </span>
            <div class="app-edit-card-actions">
              <button class="btn btn-sm app-del-btn" data-app-id="${app.id}" style="color:var(--danger,#e05252)">Delete</button>
            </div>
          </div>
          <div class="app-edit-fields">
            <div class="app-edit-field"><label>Name</label><input class="app-edit-input" data-field="name" value="${escHtml(app.name)}"></div>
            <div class="app-edit-field"><label>Icon (emoji)</label><input class="app-edit-input" data-field="icon" value="${escHtml(app.icon||'')}"></div>
            <div class="app-edit-field"><label>URL</label><input class="app-edit-input" data-field="url" value="${escHtml(app.url||'')}"></div>
            <div class="app-edit-field"><label>Health Path</label><input class="app-edit-input" data-field="health_path" value="${escHtml(app.health_path||'')}"></div>
            <div class="app-edit-field"><label>Color</label><input class="app-edit-input" type="color" data-field="color" value="${app.color||'#6366f1'}" style="height:30px;padding:2px 4px"></div>
            <div class="app-edit-field"><label>Launch Mode</label>
              <select class="app-edit-input" data-field="launch_mode">
                ${['local_make','docker_local','docker_remote','none'].map(m => `<option value="${m}"${m===app.launch_mode?' selected':''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="app-edit-field"><label>Launch Dir</label><input class="app-edit-input" data-field="launch_dir" value="${escHtml(app.launch_dir||'')}"></div>
            <div class="app-edit-field"><label>Launch Cmd</label><input class="app-edit-input" data-field="launch_cmd" value="${escHtml(app.launch_cmd||'')}"></div>
          </div>
          <div class="app-edit-card-footer">
            <span class="save-badge" id="save-badge-${app.id}">Saved ✓</span>
            <button class="btn btn-sm app-save-btn btn-primary" data-app-id="${app.id}">Save changes</button>
          </div>
        </div>`;
    }

    body.innerHTML = apps.map(buildEditCard).join('') +
      `<button class="btn btn-sm" id="_add-app-btn" style="margin-top:4px">+ Add App</button>`;

    // Build mutable apps array from displayed state
    const getAppsFromDOM = () => {
      return [...body.querySelectorAll('.app-edit-card')].map(card => {
        const get = (f) => card.querySelector(`[data-field="${f}"]`)?.value || '';
        return {
          id: card.dataset.appId,
          name: get('name'),
          icon: get('icon'),
          url: get('url'),
          health_path: get('health_path'),
          color: get('color'),
          launch_mode: get('launch_mode'),
          launch_dir: get('launch_dir'),
          launch_cmd: get('launch_cmd'),
          description: '',
        };
      });
    };

    body.querySelectorAll('.app-save-btn').forEach(btn => {
      btn.onclick = async () => {
        const allApps = getAppsFromDOM();
        try {
          await api('PUT', '/api/apps', allApps);
          const badge = document.getElementById(`save-badge-${btn.dataset.appId}`);
          if (badge) { badge.classList.add('visible'); setTimeout(() => badge.classList.remove('visible'), 2000); }
        } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
      };
    });

    body.querySelectorAll('.app-del-btn').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this app configuration?')) return;
        const allApps = getAppsFromDOM().filter(a => a.id !== btn.dataset.appId);
        try {
          await api('PUT', '/api/apps', allApps);
          await renderAppsTab(body);
        } catch(e) { showToast('Delete failed: ' + e.message, 'error'); }
      };
    });

    document.getElementById('_add-app-btn').onclick = () => {
      const newId = 'app_' + Date.now();
      const blank = { id: newId, name: 'New App', icon: '🔗', url: 'http://localhost:3000', health_path: '/api/health', color: '#6366f1', launch_mode: 'local_make', launch_dir: '', launch_cmd: 'make web', description: '' };
      const card = document.createElement('div');
      card.innerHTML = buildEditCard(blank);
      document.getElementById('_add-app-btn').insertAdjacentElement('beforebegin', card.firstElementChild);
      // Re-bind save/del buttons
      card.querySelector('.app-save-btn').onclick = async () => {
        const allApps = getAppsFromDOM();
        try { await api('PUT', '/api/apps', allApps); await renderAppsTab(body); }
        catch(e) { showToast('Save failed: ' + e.message, 'error'); }
      };
      card.querySelector('.app-del-btn').onclick = () => card.remove();
    };
  }

  async function renderIntegrationsTab(body) {
    let integrations, apps;
    try {
      [integrations, apps] = await Promise.all([
        api('GET', '/api/integrations'),
        api('GET', '/api/apps/status'),
      ]);
    } catch(e) { body.innerHTML = `<div class="apps-empty">Could not load integrations.</div>`; return; }

    const appMap = Object.fromEntries(apps.map(a => [a.id, a]));

    let html = '';
    if (!integrations.length) {
      html += `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No integrations configured yet.</div>`;
    } else {
      // Group by app
      const grouped = {};
      integrations.forEach(i => { (grouped[i.app_id] = grouped[i.app_id]||[]).push(i); });
      for (const [appId, rows] of Object.entries(grouped)) {
        const app = appMap[appId] || { name: appId, icon: '⚙' };
        html += `<div class="intg-section-header">${escHtml(app.icon||'⚙')} ${escHtml(app.name)}</div>`;
        rows.forEach((intg, idx) => {
          html += `<div class="intg-row" data-intg-id="${escHtml(intg.id)}">
            <span class="intg-row-label">${escHtml(intg.label||intg.name)}</span>
            <span class="intg-row-meta">${escHtml(intg.endpoint)} → .${escHtml(intg.field_path)} → ${escHtml(intg.field_type)}</span>
            <span class="intg-status unknown" id="intg-status-${escHtml(intg.id)}">—</span>
            <button class="btn btn-sm intg-test-btn" data-intg-id="${escHtml(intg.id)}">Test</button>
            <button class="btn btn-sm intg-del-btn" data-intg-id="${escHtml(intg.id)}" style="color:var(--danger,#e05252)">✕</button>
          </div>`;
        });
      }
    }

    // Add integration form
    const appOptions = apps.map(a => `<option value="${a.id}">${escHtml(a.name)}</option>`).join('');
    html += `
      <div class="add-intg-form" id="_add-intg-form">
        <h4>+ Add Integration</h4>
        <div class="add-intg-fields">
          <div class="add-intg-field"><label>App</label>
            <select id="_intg-app">${appOptions}</select>
          </div>
          <div class="add-intg-field"><label>Name</label>
            <input id="_intg-name" placeholder="e.g. Repository">
          </div>
          <div class="add-intg-field"><label>Endpoint</label>
            <input id="_intg-endpoint" placeholder="/api/repos">
          </div>
          <div class="add-intg-field"><label>Method</label>
            <select id="_intg-method"><option>GET</option><option>POST</option></select>
          </div>
          <div class="add-intg-field"><label>Field Path</label>
            <input id="_intg-field-path" placeholder="e.g. name  (key per item in array)">
          </div>
          <div class="add-intg-field"><label>Expected Type</label>
            <select id="_intg-field-type">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="url">URL</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>
          <div class="add-intg-field" style="grid-column:1/-1"><label>Label (shown in property picker)</label>
            <input id="_intg-label" placeholder="e.g. SuperGit: Repository">
          </div>
        </div>
        <div class="test-result-box" id="_intg-test-result" style="display:none"></div>
        <div class="add-intg-footer">
          <button class="btn btn-sm" id="_intg-test-btn">Test Connection</button>
          <button class="btn btn-sm btn-primary" id="_intg-save-btn">Save Integration</button>
        </div>
      </div>`;

    body.innerHTML = html;

    // Test existing integrations
    body.querySelectorAll('.intg-test-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.intgId;
        const intg = integrations.find(i => i.id === id);
        if (!intg) return;
        const statusEl = document.getElementById(`intg-status-${id}`);
        if (statusEl) { statusEl.className = 'intg-status unknown'; statusEl.textContent = '…'; }
        try {
          const res = await api('POST', '/api/integrations/probe', {
            app_id: intg.app_id, endpoint: intg.endpoint, method: intg.method || 'GET', field_path: intg.field_path, field_type: intg.field_type
          });
          if (statusEl) {
            if (res.error) {
              statusEl.className = 'intg-status error';
              statusEl.textContent = 'Error';
              statusEl.title = res.error;
            } else {
              statusEl.className = 'intg-status ok';
              statusEl.textContent = 'OK';
              statusEl.title = 'value: ' + JSON.stringify(res.value);
            }
          }
        } catch(e) {
          if (statusEl) { statusEl.className = 'intg-status error'; statusEl.textContent = 'Error'; }
        }
      };
    });

    // Delete integration
    body.querySelectorAll('.intg-del-btn').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this integration? This will affect any properties using it.')) return;
        const updated = integrations.filter(i => i.id !== btn.dataset.intgId);
        try {
          await api('PUT', '/api/integrations', updated);
          _connectedPropTypesCache = null; // invalidate cache
          await renderIntegrationsTab(body);
        } catch(e) { showToast('Delete failed: ' + e.message, 'error'); }
      };
    });

    // Test new integration form
    document.getElementById('_intg-test-btn').onclick = async () => {
      const appId = document.getElementById('_intg-app').value;
      const endpoint = document.getElementById('_intg-endpoint').value.trim();
      const method = document.getElementById('_intg-method').value;
      const fieldPath = document.getElementById('_intg-field-path').value.trim();
      const fieldType = document.getElementById('_intg-field-type').value;
      const box = document.getElementById('_intg-test-result');
      box.style.display = '';
      box.className = 'test-result-box';
      box.textContent = 'Testing…';
      try {
        const res = await api('POST', '/api/integrations/probe', { app_id: appId, endpoint, method, field_path: fieldPath, field_type: fieldType });
        if (res.error) {
          box.className = 'test-result-box error';
          box.textContent = '✕ ' + res.error + (res.value != null ? '\n  got: ' + JSON.stringify(res.value) : '');
        } else {
          box.className = 'test-result-box ok';
          if (res.is_list) {
            const samples = Array.isArray(res.value) ? res.value : [];
            box.textContent = `✓ List of ${res.inferred_type} values. Samples: ${samples.map(v => JSON.stringify(v)).join(', ') || '(empty)'}`;
          } else {
            box.textContent = '✓ ' + JSON.stringify(res.value) + '  (type: ' + res.inferred_type + ')';
          }
        }
      } catch(e) {
        box.className = 'test-result-box error';
        box.textContent = '✕ ' + (e.message || 'Connection failed');
      }
    };

    // Save new integration
    document.getElementById('_intg-save-btn').onclick = async () => {
      const appId = document.getElementById('_intg-app').value;
      const name = document.getElementById('_intg-name').value.trim();
      const endpoint = document.getElementById('_intg-endpoint').value.trim();
      const method = document.getElementById('_intg-method').value;
      const fieldPath = document.getElementById('_intg-field-path').value.trim();
      const fieldType = document.getElementById('_intg-field-type').value;
      const label = document.getElementById('_intg-label').value.trim();
      if (!name || !endpoint || !fieldPath) { showToast('Name, endpoint, and field path are required', 'error'); return; }
      const app = apps.find(a => a.id === appId);
      const autoLabel = label || (app ? `${app.name}: ${name}` : name);
      // Probe once to detect is_list before saving
      let isList = false;
      try {
        const probe = await api('POST', '/api/integrations/probe', { app_id: appId, endpoint, method, field_path: fieldPath, field_type: fieldType });
        isList = !!probe.is_list;
      } catch { /* offline — save anyway, is_list defaults to false */ }
      const newIntg = {
        id: appId + '_' + name.toLowerCase().replace(/\s+/g,'_') + '_' + Date.now(),
        app_id: appId, name, endpoint, method, field_path: fieldPath, field_type: fieldType,
        is_list: isList,
        label: autoLabel,
      };
      try {
        await api('PUT', '/api/integrations', [...integrations, newIntg]);
        _connectedPropTypesCache = null; // invalidate cache
        await renderIntegrationsTab(body);
      } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
    };
  }
}

/* ─── Global propDefsChanged relay → active view re-render ─────────── */
document.addEventListener('propDefsChanged', (e) => {
  if (_viewPropDefsCallback) _viewPropDefsCallback(e.detail.entity);
});

/* ─── Init ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Hide any built-in entity nav items the user has deleted
  applyDisabledBuiltinEntities();

  // Nav click handlers — built-in entity views support double-click rename
  const RENAMEABLE_VIEWS = new Set(['tasks','goals','projects','notes','resources','sprints','habits','calendar','pomodoro','automations']);

  // Apply any stored custom labels and icons to built-in nav items
  document.querySelectorAll('[data-view]').forEach(link => {
    const view = link.dataset.view;
    if (!RENAMEABLE_VIEWS.has(view)) return;
    const savedLabel = localStorage.getItem(`navLabel_${view}`);
    if (savedLabel) {
      const span = link.querySelector('span:not(.nav-icon)');
      if (span) span.textContent = savedLabel;
    }
    const savedIcon = localStorage.getItem(`navIcon_${view}`);
    if (savedIcon) {
      const iconEl = link.querySelector('.nav-icon');
      if (iconEl) iconEl.outerHTML = `<span class="nav-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0">${renderEntityIcon(savedIcon, 16)}</span>`;
    }
  });

  document.querySelectorAll('[data-view]').forEach(link => {
    let _lastClick = 0, _clickTimer = null;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;

      // Double-click rename + icon for entity views
      if (RENAMEABLE_VIEWS.has(view)) {
        const now = Date.now();
        if (now - _lastClick < 350) {
          _lastClick = 0;
          clearTimeout(_clickTimer); _clickTimer = null;
          const span = link.querySelector('span:not(.nav-icon)');
          if (!span) { renderView(view); return; }
          const currentLabel = span.textContent;
          const currentIconEl = link.querySelector('.nav-icon');
          const currentIconHtml = currentIconEl ? currentIconEl.outerHTML : '';
          let newIconVal = localStorage.getItem(`navIcon_${view}`) || '';

          const editWrap = document.createElement('div');
          editWrap.style.cssText = 'display:flex;align-items:center;gap:3px;padding:2px 0;width:100%';
          const iconBtnEl = document.createElement('button');
          iconBtnEl.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;padding:1px 3px;cursor:pointer;line-height:1.2;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0';
          iconBtnEl.innerHTML = newIconVal ? renderEntityIcon(newIconVal, 14) : (currentIconEl ? currentIconEl.outerHTML : '☰');
          const inp = document.createElement('input');
          inp.type = 'text'; inp.value = currentLabel;
          inp.style.cssText = 'flex:1;font-size:13px;padding:2px 4px;border:1px solid var(--accent);border-radius:4px;background:var(--bg-card);color:var(--text-primary);min-width:0;outline:none';
          const saveBtn = document.createElement('button');
          saveBtn.style.cssText = 'font-size:11px;background:var(--accent);color:#fff;border:none;border-radius:4px;padding:2px 5px;cursor:pointer;flex-shrink:0';
          saveBtn.textContent = '✓';
          const cancelBtn = document.createElement('button');
          cancelBtn.style.cssText = 'font-size:11px;background:none;border:1px solid var(--border);border-radius:4px;padding:2px 5px;cursor:pointer;flex-shrink:0';
          cancelBtn.textContent = '✕';
          editWrap.append(iconBtnEl, inp, saveBtn, cancelBtn);

          // Replace link content with editor
          link.innerHTML = '';
          link.appendChild(editWrap);
          inp.focus(); inp.select();

          iconBtnEl.onclick = (ev) => {
            ev.stopPropagation();
            showIconPicker(iconBtnEl, null, null, newIconVal, (icon) => {
              newIconVal = icon || '';
              iconBtnEl.innerHTML = newIconVal ? renderEntityIcon(newIconVal, 14) : (currentIconEl ? currentIconEl.outerHTML : '☰');
            });
          };

          const restoreLink = (label, iconHtml) => {
            link.innerHTML = `${iconHtml}<span>${label}</span>`;
          };

          const doSave = () => {
            const newLabel = inp.value.trim() || currentLabel;
            if (inp.value.trim()) localStorage.setItem(`navLabel_${view}`, newLabel);
            else localStorage.removeItem(`navLabel_${view}`);
            if (newIconVal) localStorage.setItem(`navIcon_${view}`, newIconVal);
            else localStorage.removeItem(`navIcon_${view}`);
            const iconHtml = newIconVal
              ? `<span class="nav-icon" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0">${renderEntityIcon(newIconVal, 16)}</span>`
              : currentIconHtml;
            restoreLink(newLabel, iconHtml);
          };
          const doCancel = () => restoreLink(currentLabel, currentIconHtml);

          saveBtn.onclick  = ev => { ev.stopPropagation(); doSave(); };
          cancelBtn.onclick = ev => { ev.stopPropagation(); doCancel(); };
          inp.onclick = ev => ev.stopPropagation();
          inp.onkeydown = ev => {
            if (ev.key === 'Enter') { ev.preventDefault(); doSave(); }
            if (ev.key === 'Escape') { ev.preventDefault(); doCancel(); }
          };
          return;
        }
        _lastClick = now;
        _clickTimer = setTimeout(() => {
          _clickTimer = null;
          document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
          document.querySelectorAll(`[data-view="${view}"]`).forEach(l => l.classList.add('active'));
          renderView(view);
        }, 320);
      } else {
        document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
        document.querySelectorAll(`[data-view="${view}"]`).forEach(l => l.classList.add('active'));
        renderView(view);
      }
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

  // Slideover expand
  document.getElementById('slideover-expand').onclick = () => {
    if (_currentSlideoverExpand) _currentSlideoverExpand();
  };

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

  // Connected apps panel
  document.getElementById('connected-apps-btn').onclick = openConnectedAppsPanel;

  // Sync vault button
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.onclick = async () => {
      syncBtn.classList.add('spinning');
      try {
        const r = await api('POST', '/api/sync');
        showToast(`Vault sync: ${r.inserted} inserted, ${r.updated} updated`);
        await loadCustomEntityTypes();
        renderView(currentView);
      } catch(e) { showToast('Sync failed', 'error'); }
      finally { syncBtn.classList.remove('spinning'); }
    };
  }

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

  // Load custom entity types and render nav
  await loadCustomEntityTypes();

  renderTaxonomyNav();

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
      <div class="form-group"><label class="form-label">Date</label>${singleDateChipHtml('qn-date', today)}</div>
      <div class="form-group"><label class="form-label">Category</label><select id="qn-category">${catOpts}</select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save Note</button>
    </div>`;

  openModal('Quick Note', body);
  bindModalDateChips();
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  requestAnimationFrame(() => document.getElementById('qn-title')?.focus());
  document.getElementById('modal-save-btn').onclick = async () => {
    const title = document.getElementById('qn-title').value.trim();
    const body = document.getElementById('qn-body').value;
    const note_date = document.getElementById('qn-date').value || null;
    const category_id = document.getElementById('qn-category').value
      ? parseInt(document.getElementById('qn-category').value) : null;
    if (!title && !body) { showToast('Please enter a title or note content', 'error'); return; }
    try {
      await api('POST', '/api/notes', { title: title || 'Quick Note', body, note_date, category_id });
      closeModal();
      if (window.__showToast) window.__showToast('Note saved');
      if (currentView === 'notes') renderNotes();
    } catch(e) { showToast('Error saving note: ' + (e.message || e), 'error'); }
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
    document.getElementById('fab-group')?.classList.add('panel-open-ai');
  }

  function closeAiPanel() {
    panel.classList.remove('open');
    fab.style.display = '';
    document.getElementById('fab-group')?.classList.remove('panel-open-ai');
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
