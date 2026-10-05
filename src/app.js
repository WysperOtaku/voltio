/* Voltio · aplicación (vistas, lecciones, repaso, retos, proyectos y laboratorio) */
const ALL = UNITS.flatMap((u, ui) => u.nodes.map(n => ({ ...n, unit: u.id, ui })));
const LESSON = Object.fromEntries(ALL.filter(n => n.kind === 'lesson').map(n => [n.id, n]));

/* ===================== ESTADO ===================== */
const KEY = 'voltio-v1';
const MILESTONES = [[3, 20], [7, 50], [14, 80], [30, 150], [50, 200], [100, 500], [365, 1000]];
const FREEZE_PRICE = 100, FREEZE_MAX = 2, REPAIR_PRICE = 200, REPAIR_DAYS = 3, CHALLENGE_LESSONS = 3;
function fresh() { return { v: 3, offset: 0, streak: 0, longest: 0, covered: null, hist: {}, freezes: 1, gems: 300, xp: 0, done: {}, perDay: {}, lost: null, miles: [], pending: [], circ: {}, chk: {}, labMode: 'battery', meterAuto: false, miss: {}, altIdx: {} }; }
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
if (S.v !== 3) S = { ...fresh(), ...S, v: 3, done: {}, chk: {}, circ: {} };
S = { ...fresh(), ...S };
/* Persistencia: en la app instalada se guarda en el almacenamiento nativo de Android
   (Capacitor Preferences) y además en el del WebView; en la web, solo en el navegador. */
const NativePrefs = (() => { try { const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins.Preferences) || (C.registerPlugin && C.registerPlugin('Preferences')) || null; } catch (e) { return null; } })();
let saveTimer = 0;
function save() {
  S.savedAt = Date.now();
  const json = JSON.stringify(S);
  try { localStorage.setItem(KEY, json); } catch (e) { }
  if (NativePrefs) { clearTimeout(saveTimer); saveTimer = setTimeout(() => { NativePrefs.set({ key: KEY, value: json }).catch(() => { }); }, 250); }
}
function flushSave() { if (NativePrefs) { clearTimeout(saveTimer); NativePrefs.set({ key: KEY, value: JSON.stringify(S) }).catch(() => { }); } }
async function loadNative() {
  if (!NativePrefs) return;
  try { const r = await NativePrefs.get({ key: KEY }); if (r && r.value) { const n = JSON.parse(r.value); if (!S.savedAt || (n.savedAt || 0) > S.savedAt) S = { ...fresh(), ...n }; } } catch (e) { }
}
/* Copia de seguridad: un código de texto que se copia y se pega */
function exportCode() { return 'VOLTIO1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function importCode(txt) {
  const t = String(txt).trim(); if (!t.startsWith('VOLTIO1:')) throw new Error('El código no es de Voltio.');
  const d = JSON.parse(decodeURIComponent(escape(atob(t.slice(8)))));
  if (typeof d !== 'object' || d.v == null) throw new Error('El código está incompleto.');
  return d;
}
/* ===================== FECHAS ===================== */
const DAY = 86400000;
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const now = () => new Date(Date.now() + S.offset * DAY);
const today = () => iso(now());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const add = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diff = (a, b) => Math.round((parse(b) - parse(a)) / DAY);

/* ===================== RACHA ===================== */
function evaluate() {
  const t = today(), y = add(t, -1);
  if (!S.covered) { S.covered = y; save(); return; }
  if (S.covered >= y) return;
  let d = add(S.covered, 1);
  while (d <= y) {
    const st = S.hist[d];
    if (st === 'done' || st === 'frozen' || st === 'repaired') { d = add(d, 1); continue; }
    if (S.streak > 0) {
      if (S.freezes > 0) { S.freezes--; S.hist[d] = 'frozen'; S.pending.push({ k: 'frozen', d }); }
      else { S.lost = { value: S.streak, from: d, expires: add(d, REPAIR_DAYS) }; S.pending.push({ k: 'lost', value: S.streak }); S.streak = 0; }
    }
    d = add(d, 1);
  }
  S.covered = y;
  if (S.lost && t > S.lost.expires) S.lost = null;
  save();
}
function practicedToday() {
  const t = today();
  S.perDay[t] = (S.perDay[t] || 0) + 1;
  let extended = false;
  if (S.hist[t] !== 'done') { S.hist[t] = 'done'; S.streak++; extended = true; }
  if (S.streak > S.longest) S.longest = S.streak;
  const newMiles = [];
  for (const [n, g] of MILESTONES) if (S.streak >= n && !S.miles.includes(n)) { S.miles.push(n); S.gems += g; newMiles.push([n, g]); }
  save();
  return { extended, newMiles };
}
const repairAvailable = () => S.lost && today() <= S.lost.expires;
function repair(method) {
  if (!repairAvailable()) return false;
  if (method === 'gems') { if (S.gems < REPAIR_PRICE) return false; S.gems -= REPAIR_PRICE; }
  if (method === 'challenge' && (S.perDay[today()] || 0) < CHALLENGE_LESSONS) return false;
  let d = S.lost.from; const t = today();
  while (d < t) { if (!S.hist[d]) S.hist[d] = 'repaired'; d = add(d, 1); }
  S.streak = S.lost.value + S.streak;
  if (S.streak > S.longest) S.longest = S.streak;
  S.lost = null; save(); return true;
}

function isUnlocked(id) {
  const i = ALL.findIndex(n => n.id === id);
  for (let j = i - 1; j >= 0; j--) { if (ALL[j].kind === 'project') continue; return !!S.done[ALL[j].id]; }
  return true;
}
const meterAutoOn = () => !!(S.meterAuto && S.done.f6);

/* ===================== IDENTIDAD ===================== */
// Cada módulo lleva el color de la banda de su número, como en el código de colores.
const BAND = ['#2B2B2B', '#7B4A21', '#D22B2B', '#F07D10', '#E3B505', '#2E9B3C', '#2A5BD7', '#8A3FC9', '#8A8A8A', '#ECECEC'];
const unitColor = ui => BAND[ui % 10];
function unitResistor(ui) {
  const d = String(ui).padStart(2, '0').split('').map(Number);
  return `<svg viewBox="0 0 120 40" width="96" height="32" aria-hidden="true"><path d="M0 20h22M98 20h22" stroke="#9AA3B2" stroke-width="3"/><rect x="22" y="8" width="76" height="24" rx="11" fill="#E7D3A8"/>${d.map((x, i) => `<rect x="${38 + i * 14}" y="8" width="8" height="24" fill="${BAND[x]}" ${x === 9 ? 'stroke="#bbb"' : ''}/>`).join('')}<rect x="80" y="8" width="6" height="24" fill="#C9A227"/></svg>`;
}
// Chispa: la mascota. Un LED con cara.
function chispa(mood = 'happy', size = 56) {
  const on = mood !== 'sad', id = 'cg' + Math.random().toString(36).slice(2, 6);
  const eyes = mood === 'sad' ? '<path d="M30 46q4 -3 8 0M52 46q4 -3 8 0" stroke="#1B1300" stroke-width="3" fill="none" stroke-linecap="round"/>' : mood === 'think' ? '<circle cx="34" cy="46" r="3.5" fill="#1B1300"/><circle cx="56" cy="44" r="3.5" fill="#1B1300"/>' : '<path d="M30 47q4 -5 8 0M52 47q4 -5 8 0" stroke="#1B1300" stroke-width="3" fill="none" stroke-linecap="round"/>';
  const mouth = mood === 'sad' ? '<path d="M37 61q8 -5 16 0" stroke="#1B1300" stroke-width="3" fill="none" stroke-linecap="round"/>' : mood === 'think' ? '<path d="M38 60h12" stroke="#1B1300" stroke-width="3" stroke-linecap="round"/>' : '<path d="M36 57q9 9 18 0" stroke="#1B1300" stroke-width="3" fill="none" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 90 110" width="${size}" height="${size * 1.22}" aria-hidden="true" class="chispa"><defs><radialGradient id="${id}" cx="45%" cy="35%" r="65%"><stop offset="0" stop-color="${on ? '#FFE9A8' : '#C9CED8'}"/><stop offset="1" stop-color="${on ? '#FFB000' : '#8A94A8'}"/></radialGradient></defs>
    ${on ? '<circle cx="45" cy="45" r="42" fill="#FFB000" opacity=".2"/>' : ''}<path d="M15 78V42a30 30 0 0 1 60 0v36z" fill="url(#${id})"/><rect x="10" y="74" width="70" height="9" rx="3" fill="${on ? '#E08A00' : '#6B7385'}"/><path d="M33 83v22M57 83v16" stroke="#8A94A8" stroke-width="4" stroke-linecap="round"/>${eyes}${mouth}</svg>`;
}

/* ===================== UI COMÚN ===================== */
const $ = s => document.querySelector(s);
const main = $('#main');
let view = 'learn';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function vib(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } }
function toast(msg) { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
function header() { $('#tStreak').textContent = S.streak; $('#tGems').textContent = S.gems; $('#tFreeze').textContent = S.freezes; $('#tLed').classList.toggle('on', S.hist[today()] === 'done'); const n = Object.keys(S.miss).length; const b = $('#revBadge'); if (b) { b.textContent = n; b.hidden = !n; } }
function ledSVG(on, size = 150) {
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 150 150" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="${id}" cx="50%" cy="42%" r="55%"><stop offset="0" stop-color="${on ? '#FFE9A8' : '#9AA7BF'}"/><stop offset=".6" stop-color="${on ? '#FFB000' : '#5B6782'}"/><stop offset="1" stop-color="${on ? '#E08A00' : '#3B4660'}"/></radialGradient></defs>
   ${on ? '<circle cx="75" cy="68" r="62" fill="#FFB000" opacity=".22"/>' : ''}<path d="M35 112V66a40 40 0 0 1 80 0v46z" fill="url(#${id})"/><rect x="28" y="108" width="94" height="12" rx="3" fill="${on ? '#E08A00' : '#3B4660'}"/><path d="M60 120v26M90 120v20" stroke="#8A94A8" stroke-width="5" stroke-linecap="round"/></svg>`;
}
function go(v, anchor) { view = v; render(); main.scrollTop = 0; if (anchor) setTimeout(() => { const el = document.getElementById(anchor); el && el.scrollIntoView({ behavior: 'smooth' }); }, 50); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go, b.dataset.anchor)));
const ICONS = {
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>',
  ohm: '<path d="M5 20h4v-2a7 7 0 1 1 6 0v2h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  series: '<path d="M2 12h3l1.5-3 3 6 3-6 3 6 1.5-3H22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  res: '<path d="M2 12h4M18 12h4" stroke="currentColor" stroke-width="2.2"/><rect x="6" y="8" width="12" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9.5 8v8M12 8v8M15 8v8" stroke="currentColor" stroke-width="1.8"/>',
  led: '<path d="M7 20V11a5 5 0 0 1 10 0v9z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5 20h14M10 20v3M14 20v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  heat: '<path d="M8 21c-2-3 0-5 0-8s-2-4-2-4M13 21c-2-3 0-5 0-8s-2-4-2-4M18 21c-2-3 0-5 0-8s-2-4-2-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  cap: '<path d="M2 12h7M15 12h7M9 5v14M15 5v14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  node: '<path d="M3 5l9 7M3 19l9-7h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  div: '<path d="M12 2v4M12 18v4M12 12h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="9" y="6" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="13" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  sym: '<path d="M3 12h3l2-5 3 10 3-10 3 10 2-5h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  bb: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' + [7, 10, 14, 17].map(y => [7, 10, 13, 16].map(x => `<rect x="${x - .8}" y="${y - .8}" width="1.6" height="1.6" fill="currentColor"/>`).join('')).join(''),
  meter: '<rect x="5" y="2" width="14" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="5" width="8" height="4" rx="1" fill="currentColor"/><circle cx="12" cy="15" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  npn: '<circle cx="13" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12h7M9 8v8M9 10l6-4v-4M9 14l6 4v4" fill="none" stroke="currentColor" stroke-width="2"/>',
  amp: '<path d="M6 4v16l14-8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  ic: '<rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 8h3M3 12h3M3 16h3M18 8h3M18 12h3M18 16h3" stroke="currentColor" stroke-width="2"/>',
  bin: '<text x="2" y="16" font-size="11" font-weight="700" fill="currentColor" font-family="monospace">101</text>',
  gate: '<path d="M5 5h6a7 7 0 0 1 0 14H5z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2 9h3M2 15h3M18 12h4" stroke="currentColor" stroke-width="2.2"/>',
  chip: '<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" stroke-width="2"/>',
  bat: '<rect x="4" y="7" width="15" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M21 10v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="6" y="9" width="7" height="6" fill="currentColor"/>',
  pcb: '<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 7h5v5h5v5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="7" r="1.8" fill="currentColor"/><circle cx="17" cy="17" r="1.8" fill="currentColor"/>',
  sim: '<rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 15l4-6 3 4 2-2 3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  proj: '<path d="M14 3l7 7-11 11H3v-7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M11 6l7 7" stroke="currentColor" stroke-width="2.2"/>',
  check: '<path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/>'
};

/* ===================== VISTAS ===================== */
function render() {
  header();
  document.querySelectorAll('.nav button').forEach(b => { if (b.dataset.go === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (labApi && view !== 'lab') { labApi.destroy(); labApi = null; }
  ({ learn: renderLearn, review: renderReview, lab: renderLab, streak: renderStreak, profile: renderProfile })[view]();
}

function renderLearn() {
  const offsets = [0, -70, -100, -70, 0, 70, 100, 70];
  let html = '';
  if (repairAvailable()) html += repairCard(true);
  else if (S.hist[today()] !== 'done') html += `<div class="card hello"><div class="row">${chispa(S.streak ? 'happy' : 'think', 48)}<div class="grow"><h3>${S.streak > 0 ? 'Mantén encendida tu racha' : 'Enciende tu primera racha'}</h3><p style="margin:0">Completa una lección, un repaso o un reto hoy para ${S.streak > 0 ? 'llegar a ' + (S.streak + 1) + ' días' : 'empezar'}.</p></div></div></div>`;
  const nm = Object.keys(S.miss).length;
  if (nm) html += `<button class="card revcta" id="revcta"><span class="revn">${nm}</span><span><b>Repasa tus fallos</b><br><small>Con explicaciones distintas a la primera vez</small></span></button>`;
  const firstOpen = ALL.find(n => n.kind !== 'project' && isUnlocked(n.id) && !S.done[n.id]);
  let idx = 0;
  UNITS.forEach((u, ui) => {
    const dn = u.nodes.filter(n => S.done[n.id]).length, col = unitColor(ui);
    html += `<section class="unit" id="u-${u.id}" style="--uc:${col}"><div class="uhead">${unitResistor(ui)}<span class="unum">Módulo ${ui}</span></div><h2>${esc(u.title)}</h2><p>${esc(u.desc)}</p><div class="uprog"><i style="width:${dn / u.nodes.length * 100}%"></i></div><small class="ucount">${dn} de ${u.nodes.length}</small></section><div class="path" style="--uc:${col}">`;
    let prevOff = null, prevDone = false;
    u.nodes.forEach(n => {
      const off = offsets[idx % offsets.length]; idx++;
      const done = !!S.done[n.id], open = isUnlocked(n.id), cur = firstOpen && firstOpen.id === n.id;
      const cls = [done ? 'done' : cur ? 'current' : open ? '' : 'locked', 'k-' + n.kind].join(' ');
      const icon = done ? ICONS.check : open ? ICONS[n.icon] || ICONS.bolt : ICONS.lock;
      const trace = prevOff === null ? '' : `<svg class="trace" viewBox="-150 -152 300 210" aria-hidden="true"><path d="M${prevOff} -94V-60L${off} -20V20" class="${prevDone ? 'on' : ''}"/><circle cx="${prevOff}" cy="-60" r="4" class="via ${prevDone ? 'on' : ''}"/><circle cx="${off}" cy="-20" r="4" class="via ${prevDone ? 'on' : ''}"/></svg>`;
      html += `<div class="node-row">${trace}<button class="node ${cls}" style="transform:translateX(${off}px)${n.kind === 'project' ? ' rotate(45deg)' : ''}" data-node="${n.id}" aria-label="${esc(n.title)}${done ? ', completado' : ''}${open ? '' : ', bloqueado'}">
        ${cur ? '<span class="start-tag">Empezar</span>' : ''}<svg viewBox="0 0 24 24" class="nicon">${icon}</svg><span class="node-label">${esc(n.title)}</span></button></div>`;
      prevOff = off; prevDone = done;
    });
    html += '</div>';
  });
  main.innerHTML = html;
  main.querySelectorAll('[data-node]').forEach(b => b.addEventListener('click', () => {
    const n = ALL.find(x => x.id === b.dataset.node);
    if (!isUnlocked(n.id)) { toast('Completa el paso anterior primero'); return; }
    nodeSheet(n);
  }));
  const rc = $('#revcta'); rc && (rc.onclick = () => startReview());
  bindRepair();
  if (firstOpen && !renderLearn.scrolled) { renderLearn.scrolled = true; const el = main.querySelector(`[data-node="${firstOpen.id}"]`); el && setTimeout(() => el.scrollIntoView({ block: 'center' }), 60); }
}

const KINDNAME = { lesson: 'Lección', sim: 'Reto de simulador', project: 'Proyecto real', route: 'Reto de rutado' };
function nodeSheet(n) {
  const u = UNITS[n.ui], done = !!S.done[n.id];
  const gens = n.kind === 'lesson' ? [...new Set(n.ex.filter(e => e.t === 'gen').map(e => e.g))] : [];
  const alts = n.kind === 'lesson' ? (n.c || []).filter(c => CONCEPTS[c]) : [];
  const graded = n.kind === 'lesson' ? n.ex.filter(e => e.t !== 'info').length : 0;
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal nsheet" role="dialog" aria-modal="true" style="--uc:${unitColor(n.ui)}">
    <div class="nsh"><span class="nkind">${KINDNAME[n.kind]} · ${esc(u.title)}</span><button class="close" aria-label="Cerrar">×</button></div>
    <h2>${esc(n.title)}</h2>
    <p>${n.kind === 'lesson' ? `${n.ex.length} pasos · ${graded} ejercicios${done ? ' · completada' : ''}` : esc(n.brief || (n.kind === 'project' ? PROJECTS[n.project].intro : ''))}</p>
    <button class="btn amber" data-a="start">${done ? (n.kind === 'lesson' ? 'Repetir lección' : 'Abrir de nuevo') : 'Empezar'}</button>
    ${alts.length ? `<button class="btn ghost" data-a="alt">Otra forma de verlo</button>` : ''}
    ${gens.length ? `<button class="btn ghost" data-a="practice">Practicar con números nuevos</button>` : ''}
  </div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.querySelector('.close').onclick = close;
  bg.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    close();
    if (b.dataset.a === 'start') openNode(n);
    if (b.dataset.a === 'alt') startLesson({ id: n.id + ':alt', title: 'Otra forma de verlo: ' + n.title, extra: true, c: n.c, ex: alts.flatMap(c => CONCEPTS[c].alts.flatMap((a, i) => altPair(c, i))) });
    if (b.dataset.a === 'practice') startLesson({ id: n.id + ':prac', title: 'Práctica: ' + n.title, extra: true, c: n.c, ex: Array.from({ length: 8 }, (_, i) => ({ t: 'gen', g: gens[i % gens.length] })) });
  });
}
function openNode(n) { if (n.kind === 'lesson') startLesson(n); else if (n.kind === 'sim') startSim(n); else if (n.kind === 'project') startProject(n); else if (n.kind === 'route') startRoute(n); }

function repairCard(short) {
  const left = diff(today(), S.lost.expires), lt = S.perDay[today()] || 0;
  return `<div class="card repair"><h3>Recupera tu racha de ${S.lost.value} días</h3><p>Tienes ${left === 0 ? 'hasta el final de hoy' : left === 1 ? 'hasta mañana' : left + ' días'} para repararla.</p>
   <button class="btn amber" data-repair="gems" ${S.gems < REPAIR_PRICE ? 'disabled' : ''}>Reparar por ${REPAIR_PRICE} gemas</button>
   <button class="btn ghost" data-repair="challenge" ${lt < CHALLENGE_LESSONS ? 'disabled' : ''}>Reto gratis: ${Math.min(lt, CHALLENGE_LESSONS)}/${CHALLENGE_LESSONS} actividades hoy</button>
   ${short ? '' : `<p class="small" style="margin-top:12px">El reto gratis se cumple completando ${CHALLENGE_LESSONS} actividades el mismo día.</p>`}</div>`;
}
function bindRepair() {
  main.querySelectorAll('[data-repair]').forEach(b => b.addEventListener('click', () => {
    const v = S.lost.value;
    if (repair(b.dataset.repair)) { vib([30, 40, 60]); showModal(chispa('happy', 90), 'Racha recuperada', `Vuelves a tener ${S.streak} días. Tu racha de ${v} días sigue viva.`, 'Continuar'); render(); }
  }));
}

/* ----- Repaso ----- */
function renderReview() {
  const items = Object.values(S.miss);
  const byC = {};
  items.forEach(m => { const c = m.c || 'otros'; (byC[c] = byC[c] || []).push(m); });
  if (!items.length) {
    main.innerHTML = `<h2 class="ptitle">Repasar</h2><div class="card center-card">${chispa('happy', 80)}<h3>Nada pendiente</h3><p>Cuando falles un ejercicio aparecerá aquí, y podrás repasarlo con explicaciones distintas hasta que lo domines.</p></div>
      <h3 class="sub">Explicaciones alternativas</h3><div class="clist2">${Object.entries(CONCEPTS).map(([k, c]) => `<button class="cbtn" data-c="${k}">${esc(c.name)}<small>${c.alts.length} ${c.alts.length === 1 ? 'enfoque' : 'enfoques'}</small></button>`).join('')}</div>`;
  } else {
    main.innerHTML = `<h2 class="ptitle">Repasar</h2><p class="small" style="margin:0 0 6px">Cada ejercicio sale de la lista cuando lo aciertas dos veces seguidas.</p>
      <button class="btn amber" id="revgo" style="margin:12px 0">Repasar ahora (${Math.min(items.length, 10)} ${Math.min(items.length, 10) === 1 ? 'ejercicio' : 'ejercicios'})</button>
      <h3 class="sub">Por tema</h3>${Object.entries(byC).map(([c, ms]) => `<div class="card revrow"><div class="grow"><b>${esc(CONCEPTS[c] ? CONCEPTS[c].name : 'Otros')}</b><br><small>${ms.length} ${ms.length === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'} · ${ms.reduce((a, m) => a + m.n, 0)} fallos</small></div>${CONCEPTS[c] ? `<button class="sbtn" data-c="${c}">Otra forma de verlo</button>` : ''}</div>`).join('')}
      <h3 class="sub">Todas las explicaciones alternativas</h3><div class="clist2">${Object.entries(CONCEPTS).map(([k, c]) => `<button class="cbtn" data-c="${k}">${esc(c.name)}<small>${c.alts.length} ${c.alts.length === 1 ? 'enfoque' : 'enfoques'}</small></button>`).join('')}</div>`;
    $('#revgo').onclick = () => startReview();
  }
  main.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = b.dataset.c; startLesson({ id: 'alt:' + c, title: 'Otra forma de verlo: ' + CONCEPTS[c].name, extra: true, c: [c], ex: CONCEPTS[c].alts.flatMap((a, i) => altPair(c, i)) }); });
}
function startReview() {
  const items = Object.values(S.miss).sort((a, b) => b.n - a.n || (b.t > a.t ? 1 : -1)).slice(0, 10);
  const ex = items.map(m => {
    if (m.g) return { t: 'gen', g: m.g, _key: m.k };
    const l = LESSON[m.l]; const e = l && l.ex[m.i]; return e ? { ...e, _key: m.k, c: e.c || m.c || (l.c || [])[0] } : null;
  }).filter(Boolean);
  if (!ex.length) { S.miss = {}; save(); render(); return; }
  startLesson({ id: 'review', title: 'Repaso', review: true, extra: true, ex });
}

/* ----- Racha y tienda ----- */
function renderStreak() {
  const t = today(), on = S.hist[t] === 'done', labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const nd = now(), dow = (nd.getDay() + 6) % 7, monday = add(t, -dow);
  let week = ''; for (let i = 0; i < 7; i++) { const d = add(monday, i); week += `<div class="day"><div class="dot ${S.hist[d] || ''} ${d === t ? 'today' : ''}"></div>${labels[i]}</div>`; }
  const first = new Date(nd.getFullYear(), nd.getMonth(), 1), days = new Date(nd.getFullYear(), nd.getMonth() + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
  let cal = labels.map(l => `<div class="h">${l}</div>`).join(''); for (let i = 0; i < lead; i++) cal += '<div></div>';
  for (let d = 1; d <= days; d++) { const k = iso(new Date(nd.getFullYear(), nd.getMonth(), d)); cal += `<div class="c ${S.hist[k] || ''} ${k === t ? 'today' : ''}">${d}</div>`; }
  const month = nd.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const miles = MILESTONES.map(([n, g]) => `<div class="mile ${S.miles.includes(n) ? 'got' : ''}"><b>${n} días</b><span class="r">${S.miles.includes(n) ? 'Conseguido' : '+' + g + ' gemas'}</span></div>`).join('');
  main.innerHTML = `<div class="hero"><div class="big-led ${S.streak ? '' : 'off'} ${on ? 'glow' : ''}">${ledSVG(S.streak > 0)}<div class="num">${S.streak}</div></div>
    <h1>${S.streak === 1 ? '1 día de racha' : S.streak + ' días de racha'}</h1><p>${on ? 'Hoy ya está hecho. Vuelve mañana.' : S.streak ? 'Practica hoy para no perderla.' : 'Completa una actividad para encenderla.'}</p></div>
   ${repairAvailable() ? repairCard(false) : ''}
   <div class="card"><h3>Esta semana</h3><div class="week">${week}</div></div>
   <div class="card"><h3>${month.charAt(0).toUpperCase() + month.slice(1)}</h3><div class="cal">${cal}</div><div class="legend"><span><i style="background:var(--led)"></i>Practicado</span><span><i style="background:var(--ice)"></i>Protegido</span><span><i style="background:repeating-linear-gradient(45deg,var(--led),var(--led) 3px,transparent 3px,transparent 5px);border:1px solid var(--led)"></i>Reparado</span></div></div>
   <div class="card"><h3>Hitos de racha</h3><p>Récord personal: ${S.longest} ${S.longest === 1 ? 'día' : 'días'}</p><div class="miles">${miles}</div></div>
   <h2 class="ptitle" id="shop">Tienda</h2><p class="small" style="margin:0">Tienes ${S.gems} gemas. Las ganas con lecciones, repasos, retos, proyectos e hitos.</p>
   <div class="card"><div class="row"><div class="shop-icon" style="background:var(--ice-soft)"><span class="ice" style="width:26px;height:26px;border-radius:7px"></span></div><div class="grow"><h3>Protector de racha</h3><p style="margin:0">Cubre un día sin practicar. Máximo ${FREEZE_MAX}. Tienes ${S.freezes}.</p></div></div>
    <button class="btn" style="margin-top:14px" id="buyF" ${S.freezes >= FREEZE_MAX || S.gems < FREEZE_PRICE ? 'disabled' : ''}>${S.freezes >= FREEZE_MAX ? 'Ya tienes el máximo' : 'Comprar por ' + FREEZE_PRICE + ' gemas'}</button></div>
   <div class="card"><div class="row"><div class="shop-icon" style="background:var(--bg)">${ledSVG(true, 44)}</div><div class="grow"><h3>Reparación de racha</h3><p style="margin:0">${repairAvailable() ? 'Recupera tus ' + S.lost.value + ' días perdidos.' : 'Disponible durante ' + REPAIR_DAYS + ' días después de perder una racha.'}</p></div></div>
    ${repairAvailable() ? `<button class="btn amber" style="margin-top:14px" data-repair="gems" ${S.gems < REPAIR_PRICE ? 'disabled' : ''}>Reparar por ${REPAIR_PRICE} gemas</button>` : ''}</div>`;
  const b = $('#buyF'); b && b.addEventListener('click', () => { if (S.gems >= FREEZE_PRICE && S.freezes < FREEZE_MAX) { S.gems -= FREEZE_PRICE; S.freezes++; save(); vib(20); toast('Protector comprado'); render(); } });
  bindRepair();
}

function renderProfile() {
  const total = ALL.length, done = ALL.filter(n => S.done[n.id]).length, autoUnlocked = !!S.done.f6;
  main.innerHTML = `<h2 class="ptitle">Tu progreso</h2>
   <div class="kv"><div><b>${S.xp}</b><span>XP total</span></div><div><b>${done}/${total}</b><span>Pasos completados</span></div><div><b>${S.streak}</b><span>Racha actual</span></div><div><b>${Object.keys(S.miss).length}</b><span>Por repasar</span></div></div>
   <div class="card"><h3>Módulos</h3>${UNITS.map((u, ui) => { const d = u.nodes.filter(n => S.done[n.id]).length; return `<div class="mprog" style="--uc:${unitColor(ui)}"><span>${ui}. ${esc(u.title)}</span><div class="uprog"><i style="width:${d / u.nodes.length * 100}%"></i></div><small>${d}/${u.nodes.length}</small></div>`; }).join('')}</div>
   <div class="card"><h3>Multímetro</h3><p>${autoUnlocked ? 'Ya dominas el multímetro manual. Puedes pasar al automático en el resto de ejercicios.' : 'Completa la lección “Multímetro automático” del módulo 5 para desbloquear el autorrango.'}</p>
    <label class="switch"><input type="checkbox" id="mauto" ${S.meterAuto && autoUnlocked ? 'checked' : ''} ${autoUnlocked ? '' : 'disabled'}><span>Usar multímetro automático</span></label></div>
   <div class="card"><h3>Herramientas de prueba</h3><p>Fecha simulada: <b>${parse(today()).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</b>${S.offset ? ' (+' + S.offset + ' días)' : ''}.</p>
    <button class="btn" id="d1">Avanzar 1 día</button><button class="btn ghost" id="d3">Avanzar 3 días sin practicar</button><button class="btn ghost" id="gm">Añadir 200 gemas</button><button class="btn ghost" id="ua">Desbloquear todo el temario</button><button class="btn ghost" id="rs" style="color:var(--err)">Borrar todo el progreso</button></div>
   <div class="card"><h3>Copia de seguridad</h3><p>Pasa tu progreso entre la web y la app, o guárdalo por si cambias de móvil. Incluye racha, gemas, lecciones, repasos y tus montajes.</p>
    <button class="btn" id="bkExp">Exportar progreso</button><button class="btn ghost" id="bkImp">Importar progreso</button>
    <p class="small" style="margin:10px 0 0">${NativePrefs ? 'Estás en la app: el progreso se guarda en el almacenamiento del móvil.' : 'Estás en la versión web: el progreso se guarda en este navegador.'}</p></div>
   <div class="card"><h3>Sobre el temario</h3><p style="margin:0">El orden sigue la progresión de <i>Getting Started in Electronics</i> (Forrest Mims III), con la profundidad de <i>The Art of Electronics</i> e ideas prácticas de <i>Make: Electronics</i>. Las explicaciones, ejercicios y simulaciones son originales.</p></div>`;
  const m = $('#mauto'); m && m.addEventListener('change', () => { S.meterAuto = m.checked; save(); toast(m.checked ? 'Multímetro automático activado' : 'Multímetro manual activado'); });
  $('#d1').onclick = () => { S.offset++; save(); evaluate(); render(); flush(); toast('Ahora es ' + parse(today()).toLocaleDateString('es-ES', { weekday: 'long' })); };
  $('#d3').onclick = () => { S.offset += 3; save(); evaluate(); render(); flush(); };
  $('#gm').onclick = () => { S.gems += 200; save(); render(); };
  $('#ua').onclick = () => { ALL.forEach(n => { if (n.kind !== 'project') S.done[n.id] = S.done[n.id] || 'skip'; }); save(); toast('Todo desbloqueado para probar'); render(); };
  $('#bkExp').onclick = () => backupModal('export');
  $('#bkImp').onclick = () => backupModal('import');
  $('#rs').onclick = () => { if (confirm('¿Borrar todo el progreso? No se puede deshacer.')) { S = fresh(); save(); evaluate(); go('learn'); } };
}

/* ===================== MODALES ===================== */
function backupModal(mode) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  const exp = mode === 'export', code = exp ? exportCode() : '';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h2>${exp ? 'Exportar progreso' : 'Importar progreso'}</h2>
    <p>${exp ? 'Copia este código y pégalo en “Importar progreso” en la otra versión de Voltio.' : 'Pega aquí el código que exportaste. Sustituirá el progreso actual de este dispositivo.'}</p>
    <textarea class="bkta" ${exp ? 'readonly' : 'placeholder="VOLTIO1:…"'} aria-label="Código de progreso">${exp ? code : ''}</textarea>
    <p class="small bkmsg" aria-live="polite"></p>
    ${exp ? `<button class="btn amber" data-b="copy">Copiar código</button>${navigator.share ? '<button class="btn ghost" data-b="share">Compartir</button>' : ''}` : '<button class="btn amber" data-b="imp">Importar</button>'}
    <button class="btn ghost" data-b="close">Cerrar</button></div>`;
  document.body.appendChild(bg);
  const ta = bg.querySelector('textarea'), msg = bg.querySelector('.bkmsg');
  bg.querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
    const a = b.dataset.b;
    if (a === 'close') bg.remove();
    if (a === 'copy') { try { await navigator.clipboard.writeText(code); msg.textContent = 'Copiado. Ahora pégalo en la otra versión.'; } catch (e) { ta.focus(); ta.select(); msg.textContent = 'Selecciona el texto y cópialo a mano.'; } }
    if (a === 'share') { try { await navigator.share({ title: 'Progreso de Voltio', text: code }); } catch (e) { } }
    if (a === 'imp') {
      try { const d = importCode(ta.value); if (!confirm(`¿Sustituir el progreso de este dispositivo? Se cargará una racha de ${d.streak || 0} días y ${Object.keys(d.done || {}).length} pasos completados.`)) return; S = { ...fresh(), ...d }; save(); flushSave(); bg.remove(); evaluate(); go('learn'); toast('Progreso importado'); }
      catch (e) { msg.textContent = e.message || 'No se pudo leer el código.'; }
    }
  });
}
function showModal(art, title, text, cta, cb) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div style="text-align:center">${art}</div><h2 style="text-align:center">${esc(title)}</h2><p style="text-align:center">${esc(text)}</p><button class="btn">${esc(cta)}</button></div>`;
  document.body.appendChild(bg); const b = bg.querySelector('.btn'); b.focus(); b.addEventListener('click', () => { bg.remove(); cb && cb(); });
}
function flush() {
  if (!S.pending.length) return;
  const ev = S.pending.shift(); save();
  if (ev.k === 'frozen') showModal(`<svg width="90" height="90" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="var(--ice)"/><path d="M12 6v12M7 9l10 6M17 9L7 15" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`, 'Protector usado', `No practicaste el ${parse(ev.d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}, pero tu racha de ${S.streak} ${S.streak === 1 ? 'día' : 'días'} sigue a salvo. Te quedan ${S.freezes}.`, 'Entendido', flush);
  else showModal(chispa('sad', 90), 'Se apagó tu racha', `Perdiste una racha de ${ev.value} días. Puedes repararla durante ${REPAIR_DAYS} días con gemas o completando ${CHALLENGE_LESSONS} actividades en un día.`, 'Ver opciones', () => { go('streak'); flush(); });
}

/* ===================== PANTALLA COMPLETA ===================== */
function overlay() {
  const L = document.createElement('div'); L.className = 'lesson'; document.body.appendChild(L); document.body.style.overflow = 'hidden';
  return { L, close() { L.remove(); document.body.style.overflow = ''; render(); } };
}
function finishScreen(L, close, node, { xp, gems, extra = '' }) {
  const graded = !node.extra;
  const first = graded && (!S.done[node.id] || S.done[node.id] === 'skip');
  if (graded && !first) gems = Math.round(gems / 3);
  S.xp += xp; S.gems += gems; if (graded) S.done[node.id] = true; save();
  const before = S.streak, r = practicedToday(), lt = S.perDay[today()];
  L.innerHTML = `<div class="lesson-in"><div class="center">${chispa('happy', 92)}
    <div class="streakpill">${ledSVG(true, 34)}<b>${S.streak}</b> ${S.streak === 1 ? 'día' : 'días'}</div>
    <h1>${r.extended ? (before === 0 ? '¡Racha encendida!' : '¡' + S.streak + ' días seguidos!') : esc(node.review ? 'Repaso completado' : node.extra ? 'Práctica completada' : node.kind === 'project' ? 'Proyecto completado' : node.kind === 'lesson' ? 'Lección completada' : 'Reto superado')}</h1>
    <p>${r.extended ? 'Has practicado hoy. Vuelve mañana para que siga creciendo.' : 'Tu racha de hoy ya estaba asegurada.'}${repairAvailable() && lt <= CHALLENGE_LESSONS ? ' Reto de recuperación: ' + lt + '/' + CHALLENGE_LESSONS + '.' : ''}</p>
    <div class="chips"><div class="chip"><b>+${xp}</b><span>XP</span></div><div class="chip"><b>+${gems}</b><span>gemas</span></div>${extra}</div>
    ${r.newMiles.map(([n, g]) => `<p><b>Hito de ${n} días:</b> +${g} gemas</p>`).join('')}${node.id === 'f6' ? '<p><b>Desbloqueado:</b> multímetro automático (actívalo en Perfil).</p>' : ''}</div>
    <div class="foot"><button class="btn amber" id="end">Continuar</button></div></div>`;
  vib([30, 50, 30, 50, 80]);
  L.querySelector('#end').onclick = close;
}

/* ===================== LECCIÓN, REFUERZO Y REPASO ===================== */
function altPair(c, i) {
  const a = CONCEPTS[c].alts[i];
  return [{ t: 'info', _alt: c, title: a.title, text: a.text, tune: a.tune, svg: a.svg, sch: a.sch }, { ...a.q, c, _alt: c, _key: 'alt:' + c + ':' + i }];
}
function nextAlt(c) {
  if (!CONCEPTS[c]) return null;
  const i = (S.altIdx[c] || 0) % CONCEPTS[c].alts.length; S.altIdx[c] = (S.altIdx[c] || 0) + 1; save();
  return altPair(c, i);
}
function recordMiss(ex, lessonId, c) {
  const k = ex._key; if (!k || k.startsWith('alt:')) return;
  const m = S.miss[k] || (S.miss[k] = { k, l: lessonId, i: ex._idx, g: ex._gen || null, c: ex.c || c || null, n: 0, ok: 0 });
  m.n++; m.ok = 0; m.t = today(); save();
}
function recordHit(ex) { const m = S.miss[ex._key]; if (!m) return; m.ok++; if (m.ok >= 2) delete S.miss[ex._key]; save(); }

function startLesson(lesson) {
  const { L, close } = overlay();
  const queue = lesson.ex.map((e, i) => ({ ...e, _idx: e._idx ?? i, _key: e._key || (lesson.extra ? null : lesson.id + ':' + i) }));
  let doneCount = 0, mistakes = 0, w = null;
  const altRounds = {};
  function frame(inner, foot) {
    if (w && w.destroy) w.destroy(); w = null;
    const pct = doneCount / Math.max(1, doneCount + queue.length) * 100;
    L.innerHTML = `<div class="lesson-in" style="--uc:${lesson.ui != null ? unitColor(lesson.ui) : 'var(--led)'}"><div class="lbar"><button class="close" aria-label="Salir">×</button><div class="prog"><i style="width:${pct}%"></i></div></div><div class="q">${inner}</div><div class="foot">${foot}</div></div>`;
    L.querySelector('.close').onclick = () => { if (doneCount === 0 || confirm('¿Salir? Perderás el progreso de esta sesión.')) { if (w && w.destroy) w.destroy(); close(); } };
  }
  function ask() {
    if (!queue.length) return finishScreen(L, () => close(), lesson, { xp: lesson.extra ? 8 : 10 + (mistakes === 0 ? 5 : 0), gems: lesson.extra ? 8 : 15, extra: `<div class="chip"><b>${mistakes}</b><span>fallos</span></div>` });
    let ex = queue[0];
    if (ex.t === 'gen') { const g = Gen.make(ex.g); ex = queue[0] = { ...g, _key: ex._key || 'gen:' + ex.g, _gen: ex.g, _idx: ex._idx }; if (!lesson.extra) ex._key = 'gen:' + ex._gen; }
    const isInfo = ex.t === 'info';
    const kind = ex._alt ? (isInfo ? 'Otra forma de verlo' : 'Comprueba si ahora encaja') : Widgets.KIND[ex.t];
    const title = isInfo ? (ex.title || '') : ex.t === 'res' ? '¿Qué valor tiene esta resistencia?' : ex.q || '';
    frame(`<div class="kind ${ex._alt ? 'altk' : ''}">${kind}</div>${title ? `<h2>${esc(title)}</h2>` : ''}<div class="wbox"></div>`, `<button class="btn ${isInfo ? 'amber' : ''}" id="chk" ${isInfo ? '' : 'disabled'}>${isInfo ? 'Continuar' : 'Comprobar'}</button>`);
    const chk = L.querySelector('#chk');
    const ctx = { ready: v => { chk.disabled = !v; }, submit: () => !chk.disabled && chk.click(), meterAuto: meterAutoOn() };
    w = Widgets.render(ex, L.querySelector('.wbox'), ctx);
    chk.addEventListener('click', () => {
      if (isInfo) { queue.shift(); doneCount++; return ask(); }
      const r = w.check();
      if (!r.ok && ex.t === 'meter') {
        mistakes++; vib([60, 40, 60]);
        let s = L.querySelector('.hintbar'); if (!s) { s = document.createElement('div'); s.className = 'hintbar'; L.querySelector('.q').appendChild(s); }
        s.innerHTML = `${chispa('think', 32)}<span>${esc(r.msg)}</span>`; s.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (!ex._miss) { ex._miss = true; recordMiss(ex, lesson.id, ex.c || (lesson.c || [])[0]); }
        return;
      }
      const hb = L.querySelector('.hintbar'); if (hb) hb.remove();
      w.lock && w.lock();
      queue.shift();
      let remedial = null;
      if (r.ok) { doneCount++; vib(25); if (ex.t !== 'meter' || !ex._miss) recordHit(ex); }
      else {
        mistakes++; vib([60, 40, 60]);
        const c = ex.c || (lesson.c || [])[0];
        recordMiss(ex, lesson.id, c);
        if (c && CONCEPTS[c] && (altRounds[c] || 0) < CONCEPTS[c].alts.length) { altRounds[c] = (altRounds[c] || 0) + 1; remedial = nextAlt(c); }
        if (!ex._alt) queue.push(ex);
      }
      const prog = L.querySelector('.prog i'); prog.style.width = (doneCount / Math.max(1, doneCount + queue.length + (remedial ? 2 : 0)) * 100) + '%';
      const head = r.ok ? pickOne(['¡Correcto!', '¡Bien visto!', '¡Exacto!', '¡Eso es!']) : (r.right ? 'Respuesta correcta: ' + r.right : 'No del todo');
      const body = [r.msg, ex.e].filter(Boolean).map(esc).join(' ');
      L.querySelector('.foot').innerHTML = `<div class="sheet ${r.ok ? 'ok' : 'bad'}" role="status"><div class="shead">${chispa(r.ok ? 'happy' : 'sad', 40)}<h3>${esc(head)}</h3></div>${body ? `<p>${body}</p>` : ''}${remedial ? `<p class="remnote">Te lo explico de otra manera antes de seguir.</p>` : ''}<button class="btn ${r.ok ? 'okb' : 'badb'}" id="nx">Continuar</button></div>`;
      const nx = L.querySelector('#nx'); nx.focus();
      nx.onclick = () => { if (remedial) queue.unshift(...remedial); ask(); };
    });
  }
  ask();
}
const pickOne = a => a[Math.floor(Math.random() * a.length)];

/* ===================== RETO DE SIMULADOR ===================== */
function startSim(node) {
  const { L, close } = overlay();
  const cfg = node.sim;
  L.innerHTML = `<div class="lesson-in simscreen" style="--uc:${unitColor(node.ui)}"><div class="lbar"><button class="close" aria-label="Salir del reto">×</button><h2 class="stitle">${esc(node.title)}</h2></div>
    <div class="q"><p class="brief">${esc(node.brief)}</p>
    ${cfg.sch ? `<details class="det"><summary>Ver esquema</summary><div class="schbox">${Schem.draw(SCH[cfg.sch])}</div></details>` : ''}
    ${cfg.code ? `<details class="det"><summary>Ver programa cargado</summary><pre class="code">${esc(SKETCHES[cfg.arduino].code)}</pre></details>` : ''}
    <div class="simhost"></div><div class="checks" aria-live="polite"></div></div>
    <div class="foot"><button class="btn" id="chk">Comprobar</button></div></div>`;
  const api = Sim.open(L.querySelector('.simhost'), { battery: cfg.battery, arduino: cfg.arduino, board: 'uno', parts: cfg.parts, hint: cfg.hint, initial: S.circ[node.id] }, { toast, onChange: m => { S.circ[node.id] = m; save(); } });
  L.querySelector('.close').onclick = () => { api.destroy(); close(); };
  L.querySelector('#chk').onclick = () => {
    const res = CHECKS[node.checks](api), ok = res.every(r => r.ok);
    L.querySelector('.checks').innerHTML = `<ul class="clist">${res.map(r => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✗'} ${esc(r.label)}</li>`).join('')}</ul>`;
    L.querySelector('.checks').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (ok) { vib([30, 40, 60]); const f = L.querySelector('.foot'); f.innerHTML = '<button class="btn okb" id="fin">Reto superado · Continuar</button>'; f.querySelector('#fin').onclick = () => { api.destroy(); finishScreen(L, close, node, { xp: 25, gems: 30 }); }; }
    else vib([60, 40, 60]);
  };
}

/* ===================== PROYECTO REAL ===================== */
function startProject(node) {
  const { L, close } = overlay();
  const p = PROJECTS[node.project];
  const chk = S.chk[node.id] || (S.chk[node.id] = p.checks.map(() => false));
  function paint() {
    const all = chk.every(Boolean);
    L.innerHTML = `<div class="lesson-in" style="--uc:${unitColor(node.ui)}"><div class="lbar"><button class="close" aria-label="Cerrar">×</button><h2 class="stitle">${esc(node.title)}</h2></div>
      <div class="q proj"><p class="brief">${esc(p.intro)}</p><div class="schbox">${Schem.draw(SCH[p.sch])}</div>
      <h3>Material</h3><ul class="bom">${p.bom.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <h3>Montaje</h3><ol class="steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <h3>Comprobaciones</h3><div class="pchk">${p.checks.map((c, i) => `<label><input type="checkbox" data-c="${i}" ${chk[i] ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>
      <p class="small">Antes de montarlo puedes probar el circuito en el Laboratorio.</p></div>
      <div class="foot"><button class="btn ${all ? 'amber' : ''}" id="fin" ${all && S.done[node.id] !== true ? '' : 'disabled'}>${S.done[node.id] === true ? 'Proyecto completado' : all ? 'Marcar como completado' : 'Marca todas las comprobaciones'}</button></div></div>`;
    L.querySelector('.close').onclick = close;
    L.querySelectorAll('[data-c]').forEach(c => c.addEventListener('change', () => { chk[+c.dataset.c] = c.checked; save(); const y = L.querySelector('.q').scrollTop; paint(); L.querySelector('.q').scrollTop = y; }));
    L.querySelector('#fin').onclick = () => finishScreen(L, close, node, { xp: 40, gems: 50 });
  }
  paint();
}

/* ===================== RUTADO ===================== */
function startRoute(node) {
  const { L, close } = overlay();
  L.innerHTML = `<div class="lesson-in"><div class="lbar"><button class="close" aria-label="Salir">×</button><h2 class="stitle">${esc(node.title)}</h2></div>
    <div class="q"><p class="brief">${esc(node.brief)}</p><p class="small">Arrastra desde un pad. Las pistas no pueden cruzarse ni pasar por pads de otra red.</p><div class="rhost"></div></div>
    <div class="foot"><button class="btn" id="fin" disabled>Conecta todas las redes</button></div></div>`;
  L.querySelector('.close').onclick = close;
  Route.open(L.querySelector('.rhost'), node.level, () => { const f = L.querySelector('#fin'); f.disabled = false; f.className = 'btn amber'; f.textContent = 'Placa rutada · Continuar'; vib([30, 40, 60]); f.onclick = () => finishScreen(L, close, node, { xp: 20, gems: 25 }); });
}

/* ===================== LABORATORIO ===================== */
let labApi = null;
const LABMODES = { battery: 'Pila', uno: 'Uno', nano: 'Nano', esp32: 'ESP32' };
function renderLab() {
  if (S.labMode === 'arduino') S.labMode = 'uno';
  const m = S.labMode;
  main.innerHTML = `<h2 class="ptitle">Laboratorio</h2><p class="small" style="margin:0 0 10px">Monta lo que quieras. Se guarda solo.</p>
    <div class="seg seg4">${Object.entries(LABMODES).map(([k, l]) => `<button data-lm="${k}" aria-pressed="${m === k}">${l}</button>`).join('')}</div>
    ${m === 'esp32' ? '<p class="small note">El ESP32 trabaja a 3,3 V. Sus programas se ejecutan como un modelo de su comportamiento; la Uno y la Nano emulan el chip real instrucción a instrucción.</p>' : m === 'nano' ? '<p class="small note">La Nano va pinchada en la protoboard: sus patas comparten columna con los agujeros libres de arriba y de abajo.</p>' : ''}
    <div class="labhost"></div><button class="btn ghost" id="labclear" style="margin-top:12px">Vaciar protoboard</button>`;
  main.querySelectorAll('[data-lm]').forEach(b => b.onclick = () => { S.labMode = b.dataset.lm; save(); render(); });
  const key = 'lab_' + m, isB = m !== 'battery';
  const sketches = m === 'esp32' ? Object.keys(ESP_SKETCHES) : Object.keys(SKETCHES);
  labApi = Sim.open(main.querySelector('.labhost'), { battery: isB ? null : 9, arduino: isB ? sketches[0] : null, board: isB ? m : null, sketches: isB ? sketches : null, initial: S.circ[key], parts: Object.keys(Sim.PARTS) }, { toast, onChange: mm => { S.circ[key] = mm; save(); } });
  $('#labclear').onclick = () => { if (confirm('¿Vaciar la protoboard?')) { S.circ[key] = null; save(); render(); } };
}

/* ===================== ARRANQUE ===================== */
(async () => { await loadNative(); evaluate(); render(); flush(); })();
document.addEventListener('visibilitychange', () => { if (document.hidden) { flushSave(); return; } evaluate(); if (!document.querySelector('.lesson')) render(); flush(); });
window.addEventListener('pagehide', flushSave);
/* Botón atrás de Android: cierra la ventana abierta antes de salir de la app */
(() => {
  try {
    const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
    const App = (C.Plugins && C.Plugins.App) || (C.registerPlugin && C.registerPlugin('App')); if (!App) return;
    App.addListener('backButton', () => {
      const m = document.querySelector('.modal-bg'); if (m) { m.remove(); return; }
      const c = document.querySelector('.lesson .close'); if (c) { c.click(); return; }
      if (view !== 'learn') { go('learn'); return; }
      flushSave(); App.exitApp();
    });
    App.addListener('pause', flushSave);
  } catch (e) { }
})();
