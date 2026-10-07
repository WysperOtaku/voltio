/* Voltio · aplicación (vistas, lecciones, repaso, retos, proyectos y laboratorio) */
/* Cada nodo pertenece a una secuencia: el curso base ('base') o una especialidad (su id).
   Dentro de cada secuencia el avance es lineal; las especialidades se abren al terminar GATE_UNIT. */
const GATE_UNIT = 'm12';
const flatUnits = (units, track) => units.flatMap((u, ui) => u.nodes.map(n => ({ ...n, unit: u.id, ui, utitle: u.title, track: track ? track.id : null, seq: track ? track.id : 'base' })));
const ALL = [...flatUnits(UNITS, null), ...TRACKS.flatMap(t => flatUnits(t.units, t))];
const NODE = Object.fromEntries(ALL.map(n => [n.id, n]));
const SEQ = {}; ALL.forEach(n => (SEQ[n.seq] = SEQ[n.seq] || []).push(n));
const TRACK = Object.fromEntries(TRACKS.map(t => [t.id, t]));
const LESSON = Object.fromEntries(ALL.filter(n => n.kind === 'lesson').map(n => [n.id, n]));

/* ===================== ESTADO ===================== */
const KEY = 'voltio-v1';
const MILESTONES = [[3, 20], [7, 50], [14, 80], [30, 150], [50, 200], [100, 500], [365, 1000]];
const FREEZE_PRICE = 100, FREEZE_MAX = 2, REPAIR_PRICE = 200, REPAIR_DAYS = 3, CHALLENGE_LESSONS = 3;
function fresh() { return { v: 3, offset: 0, streak: 0, longest: 0, covered: null, hist: {}, freezes: 1, gems: 300, xp: 0, done: {}, perDay: {}, lost: null, miles: [], pending: [], circ: {}, chk: {}, labMode: 'battery', meterAuto: false, miss: {}, altIdx: {}, sound: true, mascot: true }; }
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

// Pasos del módulo puerta que faltan para abrir las especialidades (los proyectos no cuentan)
const gateLeft = () => UNITS.find(u => u.id === GATE_UNIT).nodes.filter(n => n.kind !== 'project' && !S.done[n.id]).length;
const tracksOpen = () => gateLeft() === 0;
function isUnlocked(id) {
  if (S.done[id]) return true;
  const n = NODE[id], seq = SEQ[n.seq], i = seq.indexOf(n);
  for (let j = i - 1; j >= 0; j--) { if (seq[j].kind === 'project') continue; return !!S.done[seq[j].id]; }
  return n.seq === 'base' || tracksOpen();
}
const firstOpenIn = seq => SEQ[seq].find(n => n.kind !== 'project' && isUnlocked(n.id) && !S.done[n.id]);
const meterAutoOn = () => !!(S.meterAuto && S.done.f6);

/* ===================== IDENTIDAD ===================== */
// Cada módulo lleva el color de la banda de su número, como en el código de colores.
const BAND = ['#2B2B2B', '#7B4A21', '#D22B2B', '#F07D10', '#E3B505', '#2E9B3C', '#2A5BD7', '#8A3FC9', '#8A8A8A', '#ECECEC'];
const unitColor = ui => BAND[ui % 10];
// En las especialidades los módulos se numeran desde 1, con su banda de color.
const nodeColor = n => n.track ? BAND[(n.ui + 1) % 10] : unitColor(n.ui);
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
function go(v, anchor) { view = v; Mascot.hide(); render(); Fx.anim(main, 'enter'); main.scrollTop = 0; if (anchor) setTimeout(() => { const el = document.getElementById(anchor); el && el.scrollIntoView({ behavior: 'smooth' }); }, 50); }
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
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="19.5" r="1.8" fill="currentColor"/>',
  antenna: '<path d="M12 10v12M8 22h8M12 10L6 3M12 10l6-7M12 10V2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4.5 8.5a9 9 0 0 1 0-6M19.5 8.5a9 9 0 0 0 0-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  wave: '<path d="M2 12c2.5-7 4.5-7 7 0s4.5 7 7 0 4-5 6-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  cloud: '<path d="M7 19h10a4.5 4.5 0 0 0 .5-9A6 6 0 0 0 6 9.5 4.8 4.8 0 0 0 7 19z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  timer: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 13V9M9 2h6M12 2v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  bus: '<path d="M2 7h20M2 12h20M2 17h20" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="7" r="2" fill="currentColor"/><circle cx="13" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="17" r="2" fill="currentColor"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  memory: '<rect x="3" y="7" width="18" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7 7v10M11 7v10M15 7v10M5 17v3M9 17v3M13 17v3M17 17v3" stroke="currentColor" stroke-width="1.6"/>',
  sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  gauge: '<path d="M3 17a9 9 0 1 1 18 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 17l5-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="2" fill="currentColor"/>',
  rocket: '<path d="M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="9" r="2" fill="currentColor"/><path d="M9 15l-3 3v3l4-2M15 15l3 3v3l-4-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  check: '<path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/>'
};

/* ===================== VISTAS ===================== */
function render() {
  header();
  const navView = view === 'track' ? 'learn' : view;
  document.querySelectorAll('.nav button').forEach(b => { if (b.dataset.go === navView) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (labApi && view !== 'lab') { labApi.destroy(); labApi = null; }
  ({ learn: renderLearn, track: renderTrack, review: renderReview, lab: renderLab, streak: renderStreak, profile: renderProfile })[view]();
}

/* Ruta de nodos de una lista de módulos. Los del curso base se numeran desde start; los de una especialidad, desde 1. */
function pathHTML(units, { firstOpen, track = null, start = 0 }) {
  const offsets = [0, -70, -100, -70, 0, 70, 100, 70];
  let html = '', idx = 0;
  units.forEach((u, ui) => {
    const num = track ? ui + 1 : start + ui, dn = u.nodes.filter(n => S.done[n.id]).length, col = BAND[num % 10];
    html += `<section class="unit" id="u-${u.id}" style="--uc:${col}"><div class="uhead">${unitResistor(num)}<span class="unum">Módulo ${num}</span></div><h2>${esc(u.title)}</h2><p>${esc(u.desc)}</p><div class="uprog"><i style="width:${dn / u.nodes.length * 100}%"></i></div><small class="ucount">${dn} de ${u.nodes.length}</small></section><div class="path" style="--uc:${col}">`;
    let prevOff = null, prevDone = false;
    u.nodes.forEach(n => {
      const off = offsets[idx % offsets.length]; idx++;
      const done = !!S.done[n.id], open = isUnlocked(n.id), cur = firstOpen && firstOpen.id === n.id;
      const cls = [done ? 'done' : cur ? 'current' : open ? '' : 'locked', 'k-' + n.kind, n.id === justDone ? 'just-done' : '', cur && justDone ? 'just-open' : ''].join(' ');
      const icon = done ? ICONS.check : open ? ICONS[n.icon] || ICONS.bolt : ICONS.lock;
      const trace = prevOff === null ? '' : `<svg class="trace" viewBox="-150 -152 300 210" aria-hidden="true"><path d="M${prevOff} -94V-60L${off} -20V20" class="${prevDone ? 'on' : ''}"/><circle cx="${prevOff}" cy="-60" r="4" class="via ${prevDone ? 'on' : ''}"/><circle cx="${off}" cy="-20" r="4" class="via ${prevDone ? 'on' : ''}"/></svg>`;
      html += `<div class="node-row">${trace}<button class="node ${cls}" style="transform:translateX(${off}px)${n.kind === 'project' ? ' rotate(45deg)' : ''}" data-node="${n.id}" aria-label="${esc(n.title)}${done ? ', completado' : ''}${open ? '' : ', bloqueado'}">
        ${cur ? '<span class="start-tag">Empezar</span>' : ''}<svg viewBox="0 0 24 24" class="nicon">${icon}</svg><span class="node-label">${esc(n.title)}</span></button></div>`;
      prevOff = off; prevDone = done;
    });
    html += '</div>';
  });
  return html;
}
function bindNodes() {
  main.querySelectorAll('[data-node]').forEach(b => b.addEventListener('click', () => {
    const n = NODE[b.dataset.node];
    if (!isUnlocked(n.id)) { toast(n.track && !tracksOpen() ? 'Termina el módulo de Microcontroladores para abrir las especialidades' : 'Completa el paso anterior primero'); return; }
    nodeSheet(n);
  }));
}

function renderLearn() {
  let html = '';
  if (repairAvailable()) html += repairCard(true);
  else if (S.hist[today()] !== 'done') html += `<div class="card hello"><div class="row">${chispa(S.streak ? 'happy' : 'think', 48)}<div class="grow"><h3>${S.streak > 0 ? 'Mantén encendida tu racha' : 'Enciende tu primera racha'}</h3><p style="margin:0">Completa una lección, un repaso o un reto hoy para ${S.streak > 0 ? 'llegar a ' + (S.streak + 1) + ' días' : 'empezar'}.</p></div></div></div>`;
  const nm = Object.keys(S.miss).length;
  if (nm) html += `<button class="card revcta" id="revcta"><span class="revn">${nm}</span><span><b>Repasa tus fallos</b><br><small>Con explicaciones distintas a la primera vez</small></span></button>`;
  const firstOpen = firstOpenIn('base');
  // El carrusel de especialidades va justo después del módulo puerta; el curso base sigue debajo.
  const gi = UNITS.findIndex(u => u.id === GATE_UNIT);
  html += pathHTML(UNITS.slice(0, gi + 1), { firstOpen });
  if (TRACKS.length) html += tracksCarousel();
  html += pathHTML(UNITS.slice(gi + 1), { firstOpen, start: gi + 1 });
  main.innerHTML = html;
  bindNodes();
  bindCarousel();
  const rc = $('#revcta'); rc && (rc.onclick = () => startReview());
  bindRepair();
  if (firstOpen && (!renderLearn.scrolled || justDone)) { renderLearn.scrolled = true; const el = main.querySelector(`[data-node="${firstOpen.id}"]`); el && setTimeout(() => el.scrollIntoView({ block: 'center', behavior: justDone ? 'smooth' : 'auto' }), 60); }
  if (justDone) { setTimeout(() => { Fx.sound('step'); Fx.burstAt(main.querySelector('.node.just-open'), { n: 18 }); }, 700); justDone = null; }
}

/* ===================== ESPECIALIDADES ===================== */
const RANKS = [[0, 'Aprendiz'], [1, 'Iniciado'], [3, 'Técnico'], [6, 'Especialista'], [10, 'Experto']];
function trackStats(t) {
  const nodes = SEQ[t.id] || [], proj = nodes.filter(n => n.kind === 'project'), steps = nodes.filter(n => n.kind !== 'project');
  const pd = proj.filter(n => S.done[n.id] === true).length, sd = steps.filter(n => S.done[n.id]).length;
  const all = nodes.length && nodes.every(n => S.done[n.id] === true);
  let rank = RANKS[0][1], ri = 0; RANKS.forEach(([k, r], i) => { if (pd >= k) { rank = r; ri = i; } });
  if (all) { rank = 'Maestro'; ri = RANKS.length; }
  return { nodes, pd, pt: proj.length, sd, st: steps.length, done: nodes.filter(n => S.done[n.id]).length, rank, ri, hours: proj.reduce((a, n) => a + ((PROJECTS[n.project] || {}).hours || 0), 0) };
}
function trackBadge(t, size = 44) { return `<span class="tbadge" style="--tc:${t.color};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24">${ICONS[t.icon] || ICONS.chip}</svg></span>`; }
function tracksCarousel() {
  const open = tracksOpen(), left = gateLeft();
  return `<section class="tracks" id="tracks" aria-label="Especialidades">
    <div class="trhead"><h2>Especialidades</h2><p>${open ? 'Elige una y profundiza: cada una es un curso entero con muchos proyectos reales.' : `Se abren al terminar Microcontroladores. ${left === 1 ? 'Te falta 1 paso' : 'Te faltan ' + left + ' pasos'}.`}</p></div>
    <div class="carousel" role="list">${TRACKS.map(t => {
      const s = trackStats(t), pct = s.nodes.length ? s.done / s.nodes.length * 100 : 0;
      return `<button class="tcard ${open ? '' : 'locked'}" role="listitem" data-track="${t.id}" style="--tc:${t.color}" aria-label="${esc(t.title)}${open ? '' : ', bloqueada'}">
        <div class="tctop">${trackBadge(t)}${open ? `<span class="trank">${esc(s.rank)}</span>` : `<span class="tlock"><svg viewBox="0 0 24 24">${ICONS.lock}</svg></span>`}</div>
        <h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p>
        <div class="tmeta"><span>${t.units.length} módulos</span><span>${s.pt} proyectos</span>${s.hours ? `<span>+${s.hours} h</span>` : ''}</div>
        <div class="uprog"><i style="width:${pct}%"></i></div><small>${s.done} de ${s.nodes.length}${t.level ? ' · ' + esc(t.level) : ''}</small></button>`;
    }).join('')}</div>
    <p class="small trmore">Desliza para ver todas · el curso base sigue debajo</p></section>`;
}
function bindCarousel() { main.querySelectorAll('[data-track]').forEach(b => b.addEventListener('click', () => { curTrack = b.dataset.track; go('track'); })); }

let curTrack = null;
function renderTrack() {
  const t = TRACK[curTrack]; if (!t) { view = 'learn'; return renderLearn(); }
  const s = trackStats(t), open = tracksOpen(), firstOpen = open ? firstOpenIn(t.id) : null;
  const nextRank = RANKS.find(([k]) => k > s.pd);
  main.innerHTML = `<button class="backlink" id="tback"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Curso base</button>
    <section class="thero" style="--tc:${t.color}">${trackBadge(t, 56)}<div><span class="unum">Especialidad</span><h1>${esc(t.title)}</h1></div><p>${esc(t.desc)}${t.level ? `<small class="tlevel">${esc(t.level)}</small>` : ''}</p>
      <div class="tstats"><div><b>${esc(s.rank)}</b><span>${nextRank ? `${nextRank[0] - s.pd} ${nextRank[0] - s.pd === 1 ? 'proyecto' : 'proyectos'} para ${nextRank[1]}` : s.ri === RANKS.length ? 'Especialidad completa' : 'Completa todo para Maestro'}</span></div><div><b>${s.pd}/${s.pt}</b><span>Proyectos</span></div><div><b>${s.sd}/${s.st}</b><span>Lecciones y retos</span></div></div>
      <div class="uprog"><i style="width:${s.nodes.length ? s.done / s.nodes.length * 100 : 0}%"></i></div></section>
    ${open ? '' : `<div class="card lockcard"><div class="row">${chispa('think', 44)}<div class="grow"><h3>Aún bloqueada</h3><p style="margin:0">Puedes echar un vistazo al temario. Se abre al terminar el módulo de Microcontroladores (${gateLeft() === 1 ? 'te falta 1 paso' : 'te faltan ' + gateLeft() + ' pasos'}).</p></div></div></div>`}
    ${pathHTML(t.units, { firstOpen, track: t })}`;
  $('#tback').onclick = () => go('learn', 'tracks');
  bindNodes();
  renderTrack.scrolled = renderTrack.scrolled || {};
  if (justDone) { const jo = main.querySelector('.node.just-open'); jo && setTimeout(() => { jo.scrollIntoView({ block: 'center', behavior: 'smooth' }); Fx.sound('step'); Fx.burstAt(jo, { n: 18 }); }, 500); justDone = null; }
  else if (firstOpen && !renderTrack.scrolled[t.id] && firstOpen !== SEQ[t.id][0]) { renderTrack.scrolled[t.id] = true; const el = main.querySelector(`[data-node="${firstOpen.id}"]`); el && setTimeout(() => el.scrollIntoView({ block: 'center' }), 60); }
}

const KINDNAME = { lesson: 'Lección', sim: 'Reto de simulador', project: 'Proyecto real', route: 'Reto de rutado' };
function nodeSheet(n) {
  const done = !!S.done[n.id], where = n.track ? TRACK[n.track].short + ' · ' + n.utitle : n.utitle;
  const gens = n.kind === 'lesson' ? [...new Set(n.ex.filter(e => e.t === 'gen').map(e => e.g))] : [];
  const alts = n.kind === 'lesson' ? (n.c || []).filter(c => CONCEPTS[c]) : [];
  const graded = n.kind === 'lesson' ? n.ex.filter(e => !Widgets.UNGRADED.has(e.t)).length : 0;
  Fx.sound('open');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal nsheet" role="dialog" aria-modal="true" style="--uc:${nodeColor(n)}">
    <div class="nsh"><span class="nkind">${KINDNAME[n.kind]} · ${esc(where)}</span><button class="close" aria-label="Cerrar">×</button></div>
    <h2>${esc(n.title)}</h2>
    <p>${n.kind === 'lesson' ? `${n.ex.length} pasos · ${graded} ejercicios${done ? ' · completada' : ''}` : esc(n.brief || (n.kind === 'project' ? PROJECTS[n.project].intro : ''))}</p>
    ${n.kind === 'project' ? projMeta(PROJECTS[n.project]) : ''}
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
      <h3 class="sub">Explicaciones alternativas</h3>${conceptLists()}`;
  } else {
    main.innerHTML = `<h2 class="ptitle">Repasar</h2><p class="small" style="margin:0 0 6px">Cada ejercicio sale de la lista cuando lo aciertas dos veces seguidas.</p>
      <button class="btn amber" id="revgo" style="margin:12px 0">Repasar ahora (${Math.min(items.length, 10)} ${Math.min(items.length, 10) === 1 ? 'ejercicio' : 'ejercicios'})</button>
      <h3 class="sub">Por tema</h3>${Object.entries(byC).map(([c, ms]) => `<div class="card revrow"><div class="grow"><b>${esc(CONCEPTS[c] ? CONCEPTS[c].name : 'Otros')}</b><br><small>${ms.length} ${ms.length === 1 ? 'ejercicio pendiente' : 'ejercicios pendientes'} · ${ms.reduce((a, m) => a + m.n, 0)} fallos</small></div>${CONCEPTS[c] ? `<button class="sbtn" data-c="${c}">Otra forma de verlo</button>` : ''}</div>`).join('')}
      <h3 class="sub">Todas las explicaciones alternativas</h3>${conceptLists()}`;
    $('#revgo').onclick = () => startReview();
  }
  main.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = b.dataset.c; startLesson({ id: 'alt:' + c, title: 'Otra forma de verlo: ' + CONCEPTS[c].name, extra: true, c: [c], ex: CONCEPTS[c].alts.flatMap((a, i) => altPair(c, i)) }); });
}
/* Todas las explicaciones alternativas, agrupadas por el curso donde se usa cada concepto por primera vez
   (curso base y luego cada especialidad); los conceptos que ya no usa ningún ejercicio no se listan. */
function conceptLists() {
  const area = {}, groups = [];
  const add = (key, title, c) => { if (!c || !CONCEPTS[c] || area[c]) return; area[c] = key; let g = groups.find(x => x.key === key); if (!g) groups.push(g = { key, title, cs: [] }); g.cs.push(c); };
  ALL.forEach(n => {
    const key = n.track || 'base', title = n.track ? TRACK[n.track].title : 'Curso base';
    (n.c || []).forEach(c => add(key, title, c));
    (n.ex || []).forEach(e => add(key, title, e.c || (e.t === 'gen' ? Gen.make(e.g).c : null)));
  });
  return groups.map((g, i) => `<details class="cgroup" ${i === 0 ? 'open' : ''}><summary>${esc(g.title)} <small>${g.cs.length}</small></summary><div class="clist2">${g.cs.map(k => { const c = CONCEPTS[k]; return `<button class="cbtn" data-c="${k}">${esc(c.name)}<small>${c.alts.length} ${c.alts.length === 1 ? 'enfoque' : 'enfoques'}</small></button>`; }).join('')}</div></details>`).join('');
}
function startReview() {
  const items = Object.values(S.miss).sort((a, b) => b.n - a.n || (b.t > a.t ? 1 : -1)).slice(0, 10);
  const ex = items.map(m => {
    if (m.g) return { t: 'gen', g: m.g, _key: m.k };
    // Si la lección se ha reescrito, se busca el ejercicio por su enunciado; si ya no existe, se olvida.
    const l = LESSON[m.l]; let e = l && l.ex[m.i];
    if (l && (!e || Widgets.UNGRADED.has(e.t) || (m.q && e.q !== m.q))) { const j = m.q ? l.ex.findIndex(x => x.q === m.q) : -1; e = j >= 0 ? l.ex[j] : null; if (j >= 0) m.i = j; }
    if (!e) { delete S.miss[m.k]; return null; }
    return { ...e, _idx: m.i, _key: m.k, c: e.c || m.c || (l.c || [])[0] };
  }).filter(Boolean);
  save();
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
   ${TRACKS.length ? `<div class="card"><h3>Especialidades</h3>${tracksOpen() ? '' : `<p>Se abren al terminar Microcontroladores (${gateLeft() === 1 ? 'te falta 1 paso' : 'te faltan ' + gateLeft() + ' pasos'}).</p>`}${TRACKS.map(t => { const s = trackStats(t); return `<button class="mprog trow" data-track="${t.id}" style="--uc:${t.color}"><span>${esc(t.title)}<small>${esc(s.rank)} · ${s.pd}/${s.pt} proyectos</small></span><div class="uprog"><i style="width:${s.nodes.length ? s.done / s.nodes.length * 100 : 0}%"></i></div><small>${s.done}/${s.nodes.length}</small></button>`; }).join('')}</div>` : ''}
   <div class="card"><h3>Sonido y mascota</h3><label class="switch"><input type="checkbox" id="psound" ${S.sound ? 'checked' : ''}><span>Sonidos</span></label><label class="switch"><input type="checkbox" id="pmascot" ${S.mascot ? 'checked' : ''}><span>Chispa en pantalla (tócala para pedir pistas)</span></label></div>
   <div class="card"><h3>Multímetro</h3><p>${autoUnlocked ? 'Ya dominas el multímetro manual. Puedes pasar al automático en el resto de ejercicios.' : 'Completa la lección “Multímetro automático” del módulo 5 para desbloquear el autorrango.'}</p>
    <label class="switch"><input type="checkbox" id="mauto" ${S.meterAuto && autoUnlocked ? 'checked' : ''} ${autoUnlocked ? '' : 'disabled'}><span>Usar multímetro automático</span></label></div>
   <div class="card"><h3>Herramientas de prueba</h3><p>Fecha simulada: <b>${parse(today()).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</b>${S.offset ? ' (+' + S.offset + ' días)' : ''}.</p>
    <button class="btn" id="d1">Avanzar 1 día</button><button class="btn ghost" id="d3">Avanzar 3 días sin practicar</button><button class="btn ghost" id="gm">Añadir 200 gemas</button><button class="btn ghost" id="ua">Desbloquear todo el temario</button><button class="btn ghost" id="rs" style="color:var(--err)">Borrar todo el progreso</button></div>
   <div class="card"><h3>Copia de seguridad</h3><p>Pasa tu progreso entre la web y la app, o guárdalo por si cambias de móvil. Incluye racha, gemas, lecciones, repasos y tus montajes.</p>
    <button class="btn" id="bkExp">Exportar progreso</button><button class="btn ghost" id="bkImp">Importar progreso</button>
    <p class="small" style="margin:10px 0 0">${NativePrefs ? 'Estás en la app: el progreso se guarda en el almacenamiento del móvil.' : 'Estás en la versión web: el progreso se guarda en este navegador.'}</p></div>
   <div class="card"><h3>Sobre el temario</h3><p style="margin:0">El orden sigue la progresión de <i>Getting Started in Electronics</i> (Forrest Mims III), con la profundidad de <i>The Art of Electronics</i> e ideas prácticas de <i>Make: Electronics</i>. Las explicaciones, ejercicios y simulaciones son originales.</p></div>`;
  main.querySelectorAll('[data-track]').forEach(x => x.onclick = () => { curTrack = x.dataset.track; go('track'); });
  $('#psound').onchange = e => { S.sound = e.target.checked; Fx.setSound(S.sound); save(); Fx.sound('select'); };
  $('#pmascot').onchange = e => { S.mascot = e.target.checked; Mascot.setEnabled(S.mascot); save(); };
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
  Fx.sound('open'); Mascot.place();
  return { L, close() { L.remove(); document.body.style.overflow = ''; Mascot.provider = defaultTip; Mascot.place(); render(); } };
}
function finishScreen(L, close, node, { xp, gems, extra = '', perfect = false }) {
  const graded = !node.extra;
  const first = graded && (!S.done[node.id] || S.done[node.id] === 'skip');
  if (graded && !first) gems = Math.round(gems / 3);
  const wasOpen = tracksOpen();
  S.xp += xp; S.gems += gems; if (graded) S.done[node.id] = true; save();
  const before = S.streak, r = practicedToday(), lt = S.perDay[today()];
  if (graded) justDone = node.id;
  L.innerHTML = `<div class="lesson-in finish"><div class="center"><div class="fchispa">${chispa('happy', 92)}</div>${perfect ? '<div class="perfect">¡Sin fallos! +5 XP</div>' : ''}
    <div class="streakpill">${ledSVG(true, 34)}<b>${S.streak}</b> ${S.streak === 1 ? 'día' : 'días'}</div>
    <h1>${r.extended ? (before === 0 ? '¡Racha encendida!' : '¡' + S.streak + ' días seguidos!') : esc(node.review ? 'Repaso completado' : node.extra ? 'Práctica completada' : node.kind === 'project' ? 'Proyecto completado' : node.kind === 'lesson' ? 'Lección completada' : 'Reto superado')}</h1>
    <p>${r.extended ? 'Has practicado hoy. Vuelve mañana para que siga creciendo.' : 'Tu racha de hoy ya estaba asegurada.'}${repairAvailable() && lt <= CHALLENGE_LESSONS ? ' Reto de recuperación: ' + lt + '/' + CHALLENGE_LESSONS + '.' : ''}</p>
    <div class="chips"><div class="chip"><b data-cu="${xp}">+0</b><span>XP</span></div><div class="chip gemchip"><b data-cu="${gems}">+0</b><span>gemas</span></div>${extra}</div>
    ${r.newMiles.map(([n, g]) => `<p><b>Hito de ${n} días:</b> +${g} gemas</p>`).join('')}${node.id === 'f6' ? '<p><b>Desbloqueado:</b> multímetro automático (actívalo en Perfil).</p>' : ''}${!wasOpen && tracksOpen() && TRACKS.length ? `<div class="unlocked"><b>¡Especialidades desbloqueadas!</b><span>${TRACKS.map(t => esc(t.short || t.title)).join(' · ')}</span><small>Las tienes en el carrusel, debajo de Microcontroladores.</small></div>` : ''}</div>
    <div class="foot"><button class="btn amber" id="end">Continuar</button></div></div>`;
  vib([30, 50, 30, 50, 80]);
  const justOpened = !wasOpen && tracksOpen() && TRACKS.length;
  // Celebración: confeti, sonido, contadores que suben y las fichas apareciendo una a una
  Mascot.react('party'); Fx.sound(justOpened ? 'unlock' : 'complete'); setTimeout(() => Fx.confetti(perfect || justOpened ? 160 : 90), 120);
  if (r.extended) setTimeout(() => { Fx.sound('streak'); Fx.anim(L.querySelector('.streakpill'), 'ignite'); }, 700);
  L.querySelectorAll('.chips .chip').forEach((c, k) => { c.style.animationDelay = (0.25 + k * 0.12) + 's'; c.classList.add('chipin'); });
  L.querySelectorAll('[data-cu]').forEach((b, k) => setTimeout(() => { Fx.countUp(b, +b.dataset.cu, { ms: 650 }); if (k === 1) setTimeout(() => Fx.sound('coin'), 650); }, 450 + k * 250));
  L.querySelector('#end').onclick = () => { Fx.sound('tap'); close(); if (justOpened) go('learn', 'tracks'); };
}

/* ===================== LECCIÓN, REFUERZO Y REPASO ===================== */
function altPair(c, i) {
  const a = CONCEPTS[c].alts[i];
  return [{ t: 'info', _alt: c, title: a.title, text: a.text, tune: a.tune, svg: a.svg, sch: a.sch }, { ...a.q, c, _alt: c, _key: 'alt:' + c + ':' + i }];
}
/* Elegir la explicación alternativa: entre las que aún no se han visto en esta sesión, la que más
   palabras comparte con el ejercicio fallado; a igualdad, la siguiente en el turno de S.altIdx. */
const STOP = new Set('para como cuando donde entre sobre desde hasta porque pero tiene tienen esta este esto estos estas eso esos esas cual cuales cuanto cuanta cuantos cuantas puede pueden hace hacer mismo misma todo toda todos todas otro otra otros otras solo tambien mucho muchos muy mas menos sin con una uno unos unas del los las que por sus ese esa aqui alli siempre nunca algo nada cada vale'.split(' '));
function words(...xs) {
  const t = xs.flat(3).filter(x => typeof x === 'string').join(' ').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/<[^>]+>/g, ' ');
  return new Set(t.split(/[^a-z0-9µω]+/).filter(w => w.length >= 4 && !STOP.has(w)).map(w => w.slice(0, 6)));
}
function exWords(ex) { return words(ex.q, ex.e, ex.text, ex.t === 'mc' && ex.o ? ex.o[ex.a || 0] : null, ex.pairs, ex.items, ex.code); }
function nextAlt(c, ex, seen) {
  const C = CONCEPTS[c]; if (!C) return null;
  const n = C.alts.length, start = (S.altIdx[c] || 0) % n, w = ex ? exWords(ex) : new Set();
  let best = -1, bestScore = -1;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n; if (seen && seen.has(c + ':' + i)) continue;
    const a = C.alts[i], aw = words(a.title, a.text, a.q && a.q.q, a.q && a.q.o && a.q.o[0]);
    let hit = 0; w.forEach(x => { if (aw.has(x)) hit++; });
    const score = hit / Math.sqrt(aw.size + 4);
    if (score > bestScore + 1e-9) { best = i; bestScore = score; }
  }
  if (best < 0) return null;
  seen && seen.add(c + ':' + best);
  S.altIdx[c] = best + 1; save();
  return altPair(c, best);
}
function recordMiss(ex, lessonId, c) {
  const k = ex._key; if (!k || k.startsWith('alt:')) return;
  const m = S.miss[k] || (S.miss[k] = { k, l: lessonId, i: ex._idx, g: ex._gen || null, c: ex.c || c || null, n: 0, ok: 0 });
  if (!m.g && ex.q) m.q = ex.q;
  m.n++; m.ok = 0; m.t = today(); save();
}
function recordHit(ex) { const m = S.miss[ex._key]; if (!m) return; m.ok++; if (m.ok >= 2) delete S.miss[ex._key]; save(); }

/* Pistas de Chispa: primero la pista del ejercicio (h) o una estrategia según el tipo; si vuelves a
   tocar, un recordatorio del concepto. Nunca la respuesta. */
const TYPE_HINT = {
  mc: 'Descarta primero las opciones que no pueden ser: casi siempre quedan dos, y entonces piensa en qué se diferencian.',
  num: 'Escribe la fórmula antes de tocar números, pasa todo a unidades base (V, A, Ω, s) y estima el resultado para saber si tiene sentido.',
  match: 'Empieza por la pareja que tengas más clara: las demás se van quedando solas.',
  order: 'Busca primero qué va al principio y qué va al final; lo de en medio suele caer por su peso.',
  tune: 'Mueve un deslizador cada vez y mira qué cambia en el dibujo: así ves qué controla cada uno.',
  meter: 'Repasa las tres decisiones: qué magnitud mide el selector, en qué borne va la punta roja y dónde tocan las puntas.',
  pin: 'Busca en el código el número del pin o la función que se usa.',
  truth: 'Prueba las combinaciones una a una: ¿qué tiene que pasar para que salga 1?',
  bits: 'Cada bit vale el doble que el de su derecha: 1, 2, 4, 8, 16… Suma los que necesitas.',
  res: 'Las dos primeras bandas son cifras y la tercera dice cuántos ceros añadir.',
  bands: 'Escribe el valor como dos cifras y una cantidad de ceros: esas son las tres bandas.',
  bbtap: 'Dentro de cada mitad, las columnas de cinco agujeros están unidas; las filas de los bordes, a lo largo.',
  tap: 'Fíjate en las marcas físicas: la pata larga, la franja, la cara plana…',
  sym: 'Piensa en qué representa cada trazo del símbolo.',
  pick: 'Sigue la corriente desde el + en cada esquema y busca el que tiene un camino correcto y protegido.',
  explore: 'Mueve los deslizadores despacio y mira el dibujo: el reto marcado dice qué tienes que conseguir.',
  steps: 'Ve paso a paso: cada paso se apoya en el anterior.',
  info: 'Léelo con calma y, si quieres más detalle, abre «Cuéntame más» cuando lo haya.'
};
function hintFor(ex, level) {
  if (!ex) return null;
  const C = ex.c && CONCEPTS[ex.c];
  if (ex.t === 'explore') { const t = ex.tasks && ex.tasks.find((x, i) => !document.querySelector(`.tasks [data-t="${i}"].ok`)); return { title: 'Pista', text: t && t.hint ? t.hint : TYPE_HINT.explore }; }
  if (Widgets.UNGRADED.has(ex.t)) return { title: 'Un consejo', text: TYPE_HINT[ex.t] || TYPE_HINT.info, mood: 'happy' };
  if (level === 0) return { title: 'Pista', text: ex.h || TYPE_HINT[ex.t] || TYPE_HINT.mc };
  if (C) { const first = String(C.alts[0].text).replace(/<[^>]+>/g, '').split(/(?<=[.!?])\s/)[0]; return { title: 'Recuerda: ' + C.name, text: first, ms: 9000 }; }
  return { title: 'Pista', text: TYPE_HINT[ex.t] || TYPE_HINT.mc };
}

function startLesson(lesson) {
  const { L, close } = overlay();
  const queue = lesson.ex.map((e, i) => ({ ...e, _idx: e._idx ?? i, _key: e._key || (lesson.extra ? null : lesson.id + ':' + i) }));
  let doneCount = 0, mistakes = 0, w = null, combo = 0, best = 0, cur = null, hintLevel = 0;
  const altRounds = {}, seenAlts = new Set();
  Mascot.provider = () => { const h = hintFor(cur, hintLevel); if (cur && !Widgets.UNGRADED.has(cur.t)) hintLevel++; return h; };
  const end = () => { Mascot.provider = defaultTip; close(); };
  function frame(inner, foot) {
    if (w && w.destroy) w.destroy(); w = null;
    const pct = doneCount / Math.max(1, doneCount + queue.length) * 100;
    L.innerHTML = `<div class="lesson-in" style="--uc:${lesson.ui != null ? nodeColor(lesson) : 'var(--led)'}"><div class="lbar"><button class="close" aria-label="Salir">×</button><div class="prog"><i style="width:${pct}%"></i></div><span class="combo" hidden></span></div><div class="q">${inner}</div><div class="foot">${foot}</div></div>`;
    L.querySelector('.close').onclick = () => { if (doneCount === 0 || confirm('¿Salir? Perderás el progreso de esta sesión.')) { if (w && w.destroy) w.destroy(); Fx.sound('close'); end(); } };
    showCombo();
  }
  function showCombo() { const c = L.querySelector('.combo'); if (!c) return; c.hidden = combo < 2; c.textContent = '×' + combo; }
  function ask() {
    if (!queue.length) return finishScreen(L, end, lesson, { xp: lesson.extra ? 8 : 10 + (mistakes === 0 ? 5 : 0), gems: lesson.extra ? 8 : 15, perfect: !lesson.extra && mistakes === 0, extra: `<div class="chip"><b>${mistakes}</b><span>fallos</span></div><div class="chip"><b>×${best}</b><span>mejor racha</span></div>` });
    let ex = queue[0];
    if (ex.t === 'gen') { const g = Gen.make(ex.g); ex = queue[0] = { ...g, _key: ex._key || 'gen:' + ex.g, _gen: ex.g, _idx: ex._idx }; if (!lesson.extra) ex._key = 'gen:' + ex._gen; }
    cur = ex; hintLevel = 0; Mascot.hide(); Mascot.mood(ex._alt ? 'think' : 'happy');
    const ungraded = Widgets.UNGRADED.has(ex.t);
    const kind = ex._alt ? (ungraded ? 'Otra forma de verlo' : 'Comprueba si ahora encaja') : ex.predict ? 'Predice' : Widgets.KIND[ex.t];
    const title = ungraded ? (ex.title || '') : ex.t === 'res' ? '¿Qué valor tiene esta resistencia?' : ex.q || '';
    frame(`<div class="kind ${ex._alt ? 'altk' : ''} ${ex.predict ? 'predk' : ''}">${kind}</div>${title ? `<h2>${esc(title)}</h2>` : ''}<div class="wbox"></div>`, `<button class="btn ${ungraded ? 'amber' : ''}" id="chk" disabled>${ungraded ? 'Continuar' : ex.predict ? 'Ver qué pasa' : 'Comprobar'}</button>`);
    const chk = L.querySelector('#chk'), wbox = L.querySelector('.wbox');
    Fx.anim(L.querySelector('.q'), 'enter');
    const ctx = { ready: v => { const was = chk.disabled; chk.disabled = !v; if (was && v && ungraded && ex.t !== 'info') Fx.anim(chk, 'pop'); }, submit: () => !chk.disabled && chk.click(), meterAuto: meterAutoOn() };
    w = Widgets.render(ex, wbox, ctx);
    chk.addEventListener('click', () => {
      if (ungraded) { Fx.sound('tap'); queue.shift(); doneCount++; return ask(); }
      const r = w.check();
      if (!r.ok && ex.t === 'meter') {
        mistakes++; combo = 0; showCombo(); vib([60, 40, 60]); Fx.sound('wrong'); Fx.anim(wbox, 'shake'); Mascot.react('wrong');
        let s = L.querySelector('.hintbar'); if (!s) { s = document.createElement('div'); s.className = 'hintbar'; L.querySelector('.q').appendChild(s); }
        s.innerHTML = `<span class="hbicon">!</span><span>${esc(r.msg)}</span>`; s.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (!ex._miss) { ex._miss = true; recordMiss(ex, lesson.id, ex.c || (lesson.c || [])[0]); }
        return;
      }
      const hb = L.querySelector('.hintbar'); if (hb) hb.remove();
      w.lock && w.lock();
      queue.shift();
      let remedial = null, head, tone;
      if (ex.predict) {
        // Predecir no penaliza: lo importante es pensar antes de ver el resultado
        doneCount++; tone = r.ok ? 'ok' : 'pred';
        head = r.ok ? '¡Bien predicho!' : 'Lo que de verdad pasa: ' + (r.right || '');
        Fx.sound(r.ok ? 'correct' : 'step', combo); Mascot.react(r.ok ? 'right' : 'wow');
        if (r.ok) Fx.burstAt(chk, { n: 16 });
      } else if (r.ok) {
        doneCount++; combo++; best = Math.max(best, combo); vib(25); tone = 'ok';
        if (ex.t !== 'meter' || !ex._miss) recordHit(ex);
        head = combo >= 3 ? pickOne(['¡Imparable!', '¡Sigue así!', '¡En racha!', '¡Qué nivel!']) : pickOne(['¡Correcto!', '¡Bien visto!', '¡Exacto!', '¡Eso es!']);
        Fx.sound('correct', combo - 1); Fx.burstAt(chk, { n: 14 + Math.min(combo, 6) * 4 }); Mascot.react('right');
        if (combo === 3 || combo === 5 || combo % 10 === 0) { setTimeout(() => Fx.sound('combo', combo), 260); toast(`¡${combo} seguidas!`); }
      } else {
        mistakes++; combo = 0; vib([60, 40, 60]); tone = 'bad';
        Fx.sound('wrong'); Fx.anim(wbox, 'shake'); Mascot.react('wrong');
        const c = ex.c || (lesson.c || [])[0];
        recordMiss(ex, lesson.id, c);
        if (c && CONCEPTS[c] && (altRounds[c] || 0) < CONCEPTS[c].alts.length) { altRounds[c] = (altRounds[c] || 0) + 1; remedial = nextAlt(c, ex, seenAlts); }
        if (!ex._alt) queue.push(ex);
        head = r.right ? 'Respuesta correcta: ' + r.right : 'No del todo';
      }
      showCombo(); Fx.anim(L.querySelector('.combo'), 'pop');
      const prog = L.querySelector('.prog i'); prog.style.width = (doneCount / Math.max(1, doneCount + queue.length + (remedial ? 2 : 0)) * 100) + '%'; Fx.anim(L.querySelector('.prog'), 'glow');
      const body = [r.msg, ex.e].filter(Boolean).map(esc).join(' ');
      L.querySelector('.foot').innerHTML = `<div class="sheet ${tone}" role="status"><div class="shead"><span class="sicon">${tone === 'ok' ? '✓' : tone === 'pred' ? '!' : '✗'}</span><h3>${esc(head)}</h3></div>${body ? `<p>${body}</p>` : ''}${remedial ? `<p class="remnote">Te lo explico de otra manera antes de seguir.</p>` : ''}<button class="btn ${tone === 'bad' ? 'badb' : tone === 'pred' ? 'amber' : 'okb'}" id="nx">Continuar</button></div>`;
      Fx.anim(L.querySelector('.sheet'), 'slideup');
      const nx = L.querySelector('#nx'); nx.focus();
      nx.onclick = () => { Fx.sound('tap'); if (remedial) queue.unshift(...remedial); ask(); };
    });
  }
  ask();
}
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const TIPS = ['Si fallas, no pasa nada: te lo explico de otra manera y vuelve a salir al final.', 'En cualquier ejercicio, tócame y te doy una pista sin chivarte la respuesta.', 'Los proyectos no bloquean el avance, pero son donde de verdad se aprende: móntalos.', 'Antes de calcular, estima: si esperas miliamperios y te salen amperios, revisa los prefijos.', 'En Repasar tienes los ejercicios que fallaste, con explicaciones distintas.', 'El Laboratorio guarda tus montajes solos: prueba ahí antes de montar en la mesa.', 'Una lección al día mantiene tu racha encendida. ¡Como yo!'];
function defaultTip() {
  if (view === 'learn' || view === 'track') {
    const seq = view === 'track' ? curTrack : 'base', n = (view === 'track' && !tracksOpen()) ? null : firstOpenIn(seq);
    if (S.hist[today()] !== 'done' && n) return { title: '¿Seguimos?', text: `Tu siguiente paso es «${n.title}». Con una actividad hoy mantienes la racha.`, mood: 'happy' };
    if (n) return { title: 'Lo siguiente', text: `Te espera «${n.title}». ${pickOne(TIPS)}`, mood: 'happy' };
  }
  if (view === 'review') { const k = Object.keys(S.miss).length; return { title: 'Repasar', text: k ? `Tienes ${k} ${k === 1 ? 'ejercicio' : 'ejercicios'} por repasar. Cada uno sale de la lista al acertarlo dos veces seguidas.` : 'No tienes fallos pendientes. Aquí también puedes ver cualquier concepto explicado de otra forma.', mood: 'happy' }; }
  if (view === 'lab') return { title: 'Laboratorio', text: 'Pulsa «+ Pieza» para añadir componentes y «Cable» para unir puntos. Toca una pieza para girarla o borrarla.', mood: 'happy' };
  if (view === 'streak') return { title: 'Tu racha', text: S.streak ? `Llevas ${S.streak} ${S.streak === 1 ? 'día' : 'días'}. Un protector cubre un día sin practicar.` : 'Completa una lección hoy para encenderme… digo, para encender tu racha.', mood: 'happy' };
  return { title: 'Chispa', text: pickOne(TIPS), mood: 'happy' };
}
let justDone = null;

/* ===================== RETO DE SIMULADOR ===================== */
function startSim(node) {
  const { L, close } = overlay();
  const cfg = node.sim;
  L.innerHTML = `<div class="lesson-in simscreen" style="--uc:${nodeColor(node)}"><div class="lbar"><button class="close" aria-label="Salir del reto">×</button><h2 class="stitle">${esc(node.title)}</h2></div>
    <div class="q"><p class="brief">${esc(node.brief)}</p>
    ${cfg.sch ? `<details class="det"><summary>Ver esquema</summary><div class="schbox">${Schem.draw(SCH[cfg.sch])}</div></details>` : ''}
    ${cfg.code ? `<details class="det"><summary>Ver programa cargado</summary><pre class="code">${esc((SKETCHES[cfg.arduino] || ESP_SKETCHES[cfg.arduino]).code)}</pre></details>` : ''}
    <div class="simhost"></div><div class="checks" aria-live="polite"></div></div>
    <div class="foot"><button class="btn" id="chk">Comprobar</button></div></div>`;
  const api = Sim.open(L.querySelector('.simhost'), { battery: cfg.battery, arduino: cfg.arduino, board: cfg.board || 'uno', parts: cfg.parts, hint: cfg.hint, initial: S.circ[node.id] }, { toast, onChange: m => { S.circ[node.id] = m; save(); } });
  L.querySelector('.close').onclick = () => { api.destroy(); close(); };
  Mascot.provider = () => ({ title: 'Pista', text: cfg.hint || 'Monta primero el camino de la corriente desde el + hasta el − y luego pulsa Comprobar: la lista te dirá qué falta.' });
  L.querySelector('#chk').onclick = () => {
    const res = CHECKS[node.checks](api), ok = res.every(r => r.ok);
    L.querySelector('.checks').innerHTML = `<ul class="clist">${res.map(r => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✗'} ${esc(r.label)}</li>`).join('')}</ul>`;
    L.querySelector('.checks').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (ok) { vib([30, 40, 60]); const f = L.querySelector('.foot'); f.innerHTML = '<button class="btn okb" id="fin">Reto superado · Continuar</button>'; f.querySelector('#fin').onclick = () => { api.destroy(); finishScreen(L, close, node, { xp: 25, gems: 30 }); }; }
    else vib([60, 40, 60]);
  };
}

/* ===================== PROYECTO REAL ===================== */
// Un proyecto tiene pasos y comprobaciones planos (formato antiguo) o fases, cada una con los suyos.
// Las comprobaciones se guardan aplanadas en S.chk[id], en orden.
const projPhases = p => p.phases || [{ title: null, steps: p.steps, checks: p.checks }];
const projReward = p => ({ xp: 40 + 15 * (p.level || 0), gems: 50 + 20 * (p.level || 0) });
function projMeta(p) {
  if (!p.level && !p.hours) return '';
  return `<div class="pmeta">${p.level ? `<span class="plevel" aria-label="Dificultad ${p.level} de 5">${'<i class="on"></i>'.repeat(p.level)}${'<i></i>'.repeat(5 - p.level)}</span>` : ''}${p.hours ? `<span>≈ ${p.hours} h</span>` : ''}${p.phases ? `<span>${p.phases.length} fases</span>` : ''}</div>`;
}
function startProject(node) {
  const { L, close } = overlay();
  const p = PROJECTS[node.project], phases = projPhases(p);
  const total = phases.reduce((a, ph) => a + ph.checks.length, 0);
  const chk = S.chk[node.id] || (S.chk[node.id] = []);
  while (chk.length < total) chk.push(false);
  let k = 0; const base = phases.map(ph => { const b = k; k += ph.checks.length; return b; });
  const phaseDone = i => phases[i].checks.every((_, j) => chk[base[i] + j]);
  const firstTodo = Math.max(0, phases.findIndex((_, i) => !phaseDone(i)));
  const ph = (x, i) => `<details class="phase ${phaseDone(i) ? 'pdone' : ''}" data-ph="${i}" ${i === firstTodo || phases.length === 1 ? 'open' : ''}>
      <summary><span class="pnum">${phaseDone(i) ? '✓' : i + 1}</span><span class="grow">${esc(x.title || 'Montaje')}</span><small>${x.checks.filter((_, j) => chk[base[i] + j]).length}/${x.checks.length}</small></summary>
      <ol class="steps">${x.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>
      ${x.code ? `<pre class="code">${esc(x.code)}</pre>` : ''}
      <h4>Comprobaciones</h4><div class="pchk">${x.checks.map((c, j) => `<label><input type="checkbox" data-c="${base[i] + j}" ${chk[base[i] + j] ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></details>`;
  L.innerHTML = `<div class="lesson-in" style="--uc:${nodeColor(node)}"><div class="lbar"><button class="close" aria-label="Cerrar">×</button><h2 class="stitle">${esc(node.title)}</h2></div>
    <div class="q proj"><p class="brief">${esc(p.intro)}</p>${projMeta(p)}
    ${p.skills && p.skills.length ? `<h3>Lo que aprenderás</h3><ul class="skills">${p.skills.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${p.sch && SCH[p.sch] ? `<div class="schbox">${Schem.draw(SCH[p.sch])}</div>` : ''}
    <h3>Material</h3><ul class="bom">${p.bom.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
    <h3>${phases.length > 1 ? 'Fases' : 'Montaje'}</h3>${phases.map(ph).join('')}
    ${p.extra && p.extra.length ? `<h3>Para ir más allá</h3><ul class="bom">${p.extra.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <p class="small">${node.track ? 'Tu avance se guarda solo: puedes dejarlo a medias y seguir otro día.' : 'Antes de montarlo puedes probar el circuito en el Laboratorio.'}</p></div>
    <div class="foot"><button class="btn" id="fin"></button></div></div>`;
  const fin = L.querySelector('#fin');
  Mascot.provider = () => { const i = phases.findIndex((_, k) => !phaseDone(k)); return i < 0 ? { title: '¡Todo listo!', text: 'Has marcado todas las comprobaciones: pulsa «Marcar como completado».', mood: 'happy' } : { title: phases[i].title || 'Siguiente paso', text: 'Ve a por esta fase: ' + phases[i].steps[0] + ' Marca cada comprobación solo cuando la hayas verificado de verdad.' }; };
  function update() {
    const n = chk.filter(Boolean).length, all = n >= total, completed = S.done[node.id] === true;
    fin.className = 'btn' + (all && !completed ? ' amber' : ''); fin.disabled = !all || completed;
    fin.textContent = completed ? 'Proyecto completado' : all ? 'Marcar como completado' : `Comprobaciones: ${n} de ${total}`;
    phases.forEach((x, i) => { const d = L.querySelector(`[data-ph="${i}"]`); d.classList.toggle('pdone', phaseDone(i)); d.querySelector('.pnum').textContent = phaseDone(i) ? '✓' : i + 1; d.querySelector('summary small').textContent = `${x.checks.filter((_, j) => chk[base[i] + j]).length}/${x.checks.length}`; });
  }
  L.querySelector('.close').onclick = close;
  L.querySelectorAll('[data-c]').forEach(c => c.addEventListener('change', () => { chk[+c.dataset.c] = c.checked; save(); Fx.sound(c.checked ? 'task' : 'tap'); if (c.checked) Fx.burstAt(c, { n: 8, speed: 3 }); const ph = c.closest('.phase'), was = ph.classList.contains('pdone'); update(); if (!was && ph.classList.contains('pdone')) { Fx.sound('combo', 4); Fx.burstAt(ph.querySelector('.pnum'), { n: 24 }); } }));
  fin.onclick = () => finishScreen(L, close, node, projReward(p));
  update();
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
(async () => { await loadNative(); evaluate(); Fx.setSound(S.sound !== false); Mascot.mount(); Mascot.setEnabled(S.mascot !== false); Mascot.provider = defaultTip; render(); flush(); setTimeout(() => S.mascot !== false && S.hist[today()] !== 'done' && Mascot.say(defaultTip().text, 'happy', 5000, '¡Hola!'), 900); })();
document.addEventListener('click', e => { if (e.target.closest('.nav button, .node, .tcard, .backlink, .modal .btn, .cbtn, .seg button')) Fx.sound('tap'); }, true);
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
      if (view === 'track') { go('learn', 'tracks'); return; }
      if (view !== 'learn') { go('learn'); return; }
      flushSave(); App.exitApp();
    });
    App.addListener('pause', flushSave);
  } catch (e) { }
})();
