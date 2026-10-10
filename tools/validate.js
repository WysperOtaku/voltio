/* Voltio · validador del temario. Uso: node tools/validate.js [--quiet]
   Carga todo el JS (menos app.js) en Node con un DOM mínimo y revisa que el temario
   base y las especialidades estén bien formados. Sale con código 1 si hay errores. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

// Mismo orden que build.py
const buildPy = rd('build.py');
const TRACK_ORDER = JSON.parse(buildPy.match(/TRACK_ORDER = (\[.*\])/)[1].replace(/'/g, '"'));
const trackFiles = TRACK_ORDER.map(t => `src/tracks/${t}.js`).filter(f => fs.existsSync(path.join(root, f)));
const extra = fs.existsSync(path.join(root, 'src/tracks')) ? fs.readdirSync(path.join(root, 'src/tracks')).filter(f => f.endsWith('.js')).map(f => 'src/tracks/' + f).filter(f => !trackFiles.includes(f)).sort() : [];
const files = ['avr.js', 'src/solver.js', 'src/schem.js', 'src/sketches.js', 'src/sketches_esp.js', 'src/view3d.js', 'src/sim.js', 'src/route.js', 'src/fx.js', 'src/widgets.js', 'src/concepts.js', 'src/gen.js', 'src/content.js', ...fs.readdirSync(path.join(root, 'src/base')).filter(f => f.endsWith('.js')).sort().map(f => 'src/base/' + f), 'src/checks.js', ...trackFiles, ...extra];

const el = () => new Proxy({ style: {}, classList: { add() { }, remove() { }, toggle() { } }, dataset: {} }, { get: (t, k) => k in t ? t[k] : (k === 'querySelectorAll' ? () => [] : typeof k === 'string' ? () => el() : undefined) });
const ctx = { console, Math, JSON, Date, Object, Array, String, Number, Boolean, Set, Map, RegExp, Error, Promise, Symbol, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, setTimeout() { }, clearTimeout() { }, requestAnimationFrame() { }, cancelAnimationFrame() { }, performance: { now: () => 0 }, navigator: {}, localStorage: { getItem() { return null; }, setItem() { } }, document: { createElement: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, body: el() }, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView, TextDecoder, TextEncoder };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
// Todos los archivos comparten ámbito, como en el <script> único
const src = files.map(f => rd(f)).join('\n;\n') + `
;globalThis.__V = { UNITS, TRACKS, CONCEPTS, Gen, Widgets, CHECKS, PROJECTS, SCH, SKETCHES, ESP_SKETCHES, Schem };`;
try { vm.runInContext(src, ctx, { filename: 'voltio.js' }); } catch (e) { console.error('ERROR al cargar el JS:', e.stack || e); process.exit(1); }
const { UNITS, TRACKS, CONCEPTS, Gen, Widgets, CHECKS, PROJECTS, SCH, SKETCHES, ESP_SKETCHES, Schem } = ctx.__V;
const ICONS = [...rd('src/app.js').match(/const ICONS = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s+([a-zA-Z0-9]+):/gm)].map(m => m[1]);

const errs = [], warns = [];
const E = (w, m) => errs.push(w + ': ' + m), W = (w, m) => warns.push(w + ': ' + m);
const ids = new Map();
const TYPES = Object.keys(Widgets.KIND).concat('gen');
let nLessons = 0, nEx = 0, nSims = 0, nProj = 0, nNoHint = 0, nExam = 0;

function checkEx(ex, where, lessonC) {
  if (!ex || typeof ex !== 'object') return E(where, 'paso vacío');
  if (!TYPES.includes(ex.t)) return E(where, 'tipo desconocido ' + ex.t);
  nEx++;
  const c = ex.c || lessonC;
  if (!Widgets.UNGRADED.has(ex.t) && c && !CONCEPTS[c]) E(where, 'concepto inexistente ' + c);
  if (ex.c && !CONCEPTS[ex.c]) E(where, 'concepto inexistente ' + ex.c);
  // Cada ejercicio puntuable dice qué concepto practica: es lo que decide la explicación alternativa al fallar.
  if (!Widgets.UNGRADED.has(ex.t) && ex.t !== 'gen' && !ex.c && !where.startsWith('concept/')) E(where, 'ejercicio sin concepto explícito (c): ' + String(ex.q || ex.t).slice(0, 60));
  if (ex.t === 'mc') { if (!Array.isArray(ex.o) || ex.o.length < 2) E(where, 'mc sin opciones'); else if (new Set(ex.o).size !== ex.o.length) E(where, 'mc con opciones repetidas: ' + ex.q); if (!ex.q) E(where, 'mc sin pregunta'); }
  if (ex.t === 'num') { if (typeof ex.a !== 'number' || !isFinite(ex.a)) E(where, 'num sin respuesta numérica: ' + ex.q); }
  if (ex.t === 'gen') { if (!Gen.keys.includes(ex.g)) E(where, 'generador inexistente ' + ex.g); }
  if (ex.t === 'tune') {
    const v = Widgets.VIZ[ex.viz]; if (!v) return E(where, 'viz inexistente ' + ex.viz);
    const p = {}; for (const [k, d] of Object.entries(ex.params || {})) { p[k] = d.val; if (d.val === undefined) E(where, 'parámetro sin val: ' + k); if (d.list && !d.list.includes(d.val)) E(where, `val de ${k} no está en list`); }
    try { const o = v.calc(p); v.svg(p, o, 0.5); if (ex.goal && !(ex.goal.q in o)) E(where, 'goal.q no lo calcula la viz: ' + ex.goal.q); } catch (e) { E(where, 'viz ' + ex.viz + ' falla: ' + e.message); }
  }
  if (ex.t === 'info' && ex.tune) { const v = Widgets.VIZ[ex.tune.viz]; if (!v) E(where, 'viz inexistente ' + ex.tune.viz); else { const p = {}; for (const [k, d] of Object.entries(ex.tune.params || {})) p[k] = d.val; try { v.svg(p, v.calc(p), 0.5); } catch (e) { E(where, 'viz ' + ex.tune.viz + ' falla: ' + e.message); } } }
  if (ex.t === 'explore') {
    const v = Widgets.VIZ[ex.viz]; if (!v) E(where, 'viz inexistente ' + ex.viz);
    else if (!Array.isArray(ex.tasks) || !ex.tasks.length) E(where, 'explore sin tasks');
    else { const p = {}; for (const [k, d] of Object.entries(ex.params || {})) p[k] = d.val; try { const o = v.calc(p); v.svg(p, o, 0.5); ex.tasks.forEach((t, i) => { if (!(t.q in o)) E(where, `task ${i}: la viz no calcula ${t.q}`); if (!t.text) E(where, `task ${i} sin text`); if (o[t.q] >= t.min && o[t.q] <= t.max) W(where, `task ${i} ya se cumple con los valores iniciales`); }); } catch (e) { E(where, 'viz ' + ex.viz + ' falla: ' + e.message); } }
  }
  if (ex.t === 'steps' && (!Array.isArray(ex.steps) || ex.steps.length < 2)) E(where, 'steps necesita al menos 2 pasos');
  if (ex.predict && ex.t !== 'mc') E(where, 'predict solo vale en preguntas mc');
  if (!Widgets.UNGRADED.has(ex.t) && ex.t !== 'gen' && !where.startsWith('concept/') && !ex.h) nNoHint++;
  if (ex.sch && !SCH[ex.sch]) E(where, 'esquema inexistente ' + ex.sch);
  if (ex.t === 'pick') (ex.o || []).forEach(k => { if (!SCH[k]) E(where, 'esquema inexistente ' + k); });
  if (ex.t === 'meter' && !Widgets.SCENES[ex.scene]) E(where, 'escena inexistente ' + ex.scene);
  if ((ex.t === 'match') && (!Array.isArray(ex.pairs) || ex.pairs.length < 2)) E(where, 'match sin parejas');
  if ((ex.t === 'match') && ex.pairs && new Set(ex.pairs.map(p => p[1])).size !== ex.pairs.length) E(where, 'match con respuestas repetidas (añade un espacio para distinguirlas)');
  if ((ex.t === 'order') && (!Array.isArray(ex.items) || ex.items.length < 2)) E(where, 'order sin elementos');
  if (ex.t === 'tap' && !Widgets.IMG[ex.img]) E(where, 'imagen inexistente ' + ex.img);
  if (ex.t === 'sym' && ex.k) { try { Schem.symbol(ex.k); } catch (e) { E(where, 'símbolo inexistente ' + ex.k); } }
  if (/\d\.\d/.test([ex.q, ex.text, ex.e, ...(ex.o || [])].filter(Boolean).join(' ')) && !ex.code) W(where, 'posible decimal con punto: ' + (ex.q || ex.text || '').slice(0, 60));
}
function checkProject(key, where) {
  const p = PROJECTS[key]; if (!p) return E(where, 'proyecto inexistente ' + key);
  if (!p.intro) E(where, 'proyecto sin intro');
  if (p.sch && !SCH[p.sch]) E(where, 'esquema inexistente ' + p.sch);
  if (!Array.isArray(p.bom) || !p.bom.length) E(where, 'proyecto sin material');
  const phases = p.phases || [{ steps: p.steps, checks: p.checks }];
  phases.forEach((ph, i) => { if (!Array.isArray(ph.steps) || !ph.steps.length) E(where, `fase ${i + 1} sin pasos`); if (!Array.isArray(ph.checks) || !ph.checks.length) E(where, `fase ${i + 1} sin comprobaciones`); });
  if (p.level != null && !(p.level >= 1 && p.level <= 5)) E(where, 'level debe ir de 1 a 5');
}
function checkNodes(nodes, where) {
  nodes.forEach(n => {
    const w = where + ' › ' + n.id;
    if (!n.id) return E(where, 'nodo sin id');
    if (ids.has(n.id)) E(w, 'id repetido (también en ' + ids.get(n.id) + ')'); ids.set(n.id, where);
    if (!ICONS.includes(n.icon)) E(w, 'icono inexistente ' + n.icon);
    if (n.kind === 'lesson') {
      nLessons++;
      (n.c || []).forEach(c => { if (!CONCEPTS[c]) E(w, 'concepto inexistente ' + c); });
      if (!n.ex || !n.ex.length) E(w, 'lección vacía');
      n.ex.forEach((ex, i) => checkEx(ex, w + '#' + i, (n.c || [])[0]));
    } else if (n.kind === 'sim') {
      nSims++;
      if (!CHECKS[n.checks]) E(w, 'comprobación inexistente ' + n.checks);
      const s = n.sim; if (s.arduino && !(SKETCHES[s.arduino] || ESP_SKETCHES[s.arduino])) E(w, 'programa inexistente ' + s.arduino);
      if (s.board && !['uno', 'nano', 'esp32'].includes(s.board)) E(w, 'placa inexistente ' + s.board);
      if (s.board === 'esp32' && s.arduino && !ESP_SKETCHES[s.arduino]) E(w, 'el ESP32 necesita un programa de ESP_SKETCHES');
      if (s.board !== 'esp32' && s.arduino && !SKETCHES[s.arduino]) E(w, 'la Uno/Nano necesita un programa de SKETCHES');
      if (s.sch && !SCH[s.sch]) E(w, 'esquema inexistente ' + s.sch);
    } else if (n.kind === 'project') { nProj++; checkProject(n.project, w); }
    else if (n.kind !== 'route') E(w, 'tipo de nodo desconocido ' + n.kind);
  });
}
// Banco de preguntas del examen de nivel de cada módulo (u.exam): ejercicios puntuables con concepto
function checkExamPool(u, w) {
  if (u.exam == null) return;
  if (!Array.isArray(u.exam)) return E(w, 'exam debe ser un array');
  u.exam.forEach((ex, i) => { const ww = w + ' › examen#' + i; if (Widgets.UNGRADED.has(ex.t) || ex.t === 'gen' || ex.predict) E(ww, 'en el examen solo van ejercicios puntuables (sin predict)'); if (ex.live) E(ww, 'nada de tablas live en el examen'); checkEx(ex, ww, null); nExam++; });
}
UNITS.forEach(u => { checkNodes(u.nodes, 'base/' + u.id); checkExamPool(u, 'base/' + u.id); });
const tids = new Set();
TRACKS.forEach(t => {
  const w = 'track/' + t.id;
  if (tids.has(t.id)) E(w, 'especialidad repetida'); tids.add(t.id);
  ['title', 'desc', 'color', 'icon'].forEach(k => { if (!t[k]) E(w, 'falta ' + k); });
  if (t.icon && !ICONS.includes(t.icon)) E(w, 'icono inexistente ' + t.icon);
  if (!t.units || !t.units.length) E(w, 'sin módulos');
  (t.units || []).forEach(u => { checkExamPool(u, w + '/' + u.id); if (ids.has(u.id)) E(w, 'id de módulo repetido ' + u.id); ids.set(u.id, w); if (!u.title || !u.desc) E(w + '/' + u.id, 'módulo sin título o descripción'); checkNodes(u.nodes || [], w + '/' + u.id); });
});
// Conceptos: todas las alternativas con pregunta válida
for (const [k, c] of Object.entries(CONCEPTS)) {
  if (!c.name || !Array.isArray(c.alts) || !c.alts.length) { E('concept/' + k, 'sin nombre o sin alternativas'); continue; }
  c.alts.forEach((a, i) => { if (!a.title || !a.text || !a.q) E('concept/' + k + '#' + i, 'alternativa incompleta'); else checkEx(a.q, 'concept/' + k + '#' + i, k); });
}
// Generadores: 300 muestras sin NaN ni opciones repetidas
for (const k of Gen.keys) {
  for (let i = 0; i < 300; i++) {
    let e; try { e = Gen.make(k); } catch (er) { E('gen/' + k, 'falla: ' + er.message); break; }
    if (e.t === 'num' && (typeof e.a !== 'number' || !isFinite(e.a))) { E('gen/' + k, 'respuesta no numérica'); break; }
    if (e.t === 'mc' && (!e.o || e.o.length < 2 || new Set(e.o).size !== e.o.length)) { E('gen/' + k, 'opciones repetidas o insuficientes'); break; }
    const txt = JSON.stringify(e); if (/NaN|undefined|Infinity/.test(txt)) { E('gen/' + k, 'NaN/undefined en ' + txt.slice(0, 120)); break; }
    if (e.c && !CONCEPTS[e.c]) { E('gen/' + k, 'concepto inexistente ' + e.c); break; }
    if (!e.c) { E('gen/' + k, 'sin concepto: añádelo a CONCEPT_OF o devuélvelo en el ejercicio (c)'); break; }
  }
}
// Programas del ESP32: se ejecutan 20 s simulados sin errores
for (const [k, s] of Object.entries(ESP_SKETCHES)) {
  if (!s.name || !s.code || typeof s.run !== 'function') { E('esp/' + k, 'falta name, code o run'); continue; }
  try { const P = {}; const io = { mode: (n, m) => { P[n] = m; }, write() { }, pwm() { }, read: () => 1, aread: () => 2048 }; const g = s.run(io); let t = 0, n = 0; while (t < 20000 && n++ < 100000) { const r = g.next(); if (r.done) break; t += r.value || 1; } } catch (e) { E('esp/' + k, 'falla al ejecutar: ' + e.message); }
}
// Esquemas
for (const k of Object.keys(SCH)) { try { Schem.draw(SCH[k]); } catch (e) { E('sch/' + k, 'no se dibuja: ' + e.message); } }

const quiet = process.argv.includes('--quiet');
console.log(`Base: ${UNITS.length} módulos · Especialidades: ${TRACKS.length} (${TRACKS.map(t => t.id + ':' + t.units.reduce((a, u) => a + u.nodes.length, 0)).join(', ')})`);
console.log(`Lecciones ${nLessons} · ejercicios ${nEx} · retos ${nSims} · proyectos ${nProj} · conceptos ${Object.keys(CONCEPTS).length} · generadores ${Gen.keys.length}`);
console.log(`Ejercicios sin pista (h): ${nNoHint} · preguntas de examen propias: ${nExam} en ${[...UNITS, ...TRACKS.flatMap(t => t.units)].filter(u => u.exam && u.exam.length).length} módulos`);
if (warns.length && !quiet) { console.log(`\nAvisos (${warns.length}):`); warns.slice(0, 40).forEach(w => console.log('  · ' + w)); }
if (errs.length) { console.log(`\nERRORES (${errs.length}):`); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\nOK: sin errores.');
