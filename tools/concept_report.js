/* Voltio · informe de conceptos para revisar que cada ejercicio lleve al refuerzo adecuado.
   Uso: node tools/concept_report.js [--units m0,m3] [--track avr] [--concepts]
   Por cada lección lista sus ejercicios puntuables con el concepto que se usaría al fallarlos
   (marcado con * si lo hereda de la lección) y, al final, cada concepto con sus explicaciones. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const buildPy = rd('build.py');
const TRACK_ORDER = JSON.parse(buildPy.match(/TRACK_ORDER = (\[.*\])/)[1].replace(/'/g, '"'));
const files = ['avr.js', 'src/solver.js', 'src/schem.js', 'src/sketches.js', 'src/sketches_esp.js', 'src/view3d.js', 'src/sim.js', 'src/route.js', 'src/widgets.js', 'src/concepts.js', 'src/gen.js', 'src/content.js', 'src/checks.js', ...TRACK_ORDER.map(t => `src/tracks/${t}.js`).filter(f => fs.existsSync(path.join(root, f)))];
const el = () => new Proxy({ style: {}, classList: { add() { }, remove() { }, toggle() { } }, dataset: {} }, { get: (t, k) => k in t ? t[k] : (k === 'querySelectorAll' ? () => [] : typeof k === 'string' ? () => el() : undefined) });
const ctx = { console, Math, JSON, Date, Object, Array, String, Number, Boolean, Set, Map, RegExp, Error, Promise, Symbol, parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, setTimeout() { }, clearTimeout() { }, requestAnimationFrame() { }, cancelAnimationFrame() { }, performance: { now: () => 0 }, navigator: {}, localStorage: { getItem() { return null; }, setItem() { } }, document: { createElement: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, body: el() }, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView, TextDecoder, TextEncoder };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(files.map(rd).join('\n;\n') + '\n;globalThis.__V = { UNITS, TRACKS, CONCEPTS, Gen };', ctx);
const { UNITS, TRACKS, CONCEPTS, Gen } = ctx.__V;

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const unitsArg = arg('--units'), trackArg = arg('--track');
let units = [];
if (trackArg) units = (TRACKS.find(t => t.id === trackArg) || { units: [] }).units;
else if (unitsArg) units = UNITS.filter(u => unitsArg.split(',').includes(u.id));
else units = UNITS;
const short = (s, n = 90) => String(s || '').replace(/<[^>]+>/g, '').replace(/\n/g, ' ').slice(0, n);
const used = new Set();
for (const u of units) {
  console.log(`\n# ${u.id} · ${u.title}`);
  for (const n of u.nodes.filter(n => n.kind === 'lesson')) {
    console.log(`\n## ${n.id} · ${n.title}  [${(n.c || []).join(', ')}]`);
    n.ex.forEach((ex, i) => {
      if (ex.t === 'info') return;
      let c = ex.c, tag = '';
      let txt = ex.t === 'mc' ? `${short(ex.q)} → ${short(ex.o[0], 40)}` : ex.t === 'num' ? `${short(ex.q)} → ${ex.a} ${ex.u || ''}` : short(ex.q || ex.text || ex.t);
      if (ex.t === 'gen') { const samples = Array.from({ length: 12 }, () => Gen.make(ex.g)); const cs = [...new Set(samples.map(s => s.c || '?'))]; c = cs.join('|'); tag = '(gen)'; txt = `G('${ex.g}') p.ej.: ${short(samples[0].q, 70)}`; cs.forEach(x => used.add(x)); }
      else if (!c) { c = (n.c || [])[0]; tag = '*'; }
      used.add(c);
      console.log(`  #${i} ${ex.t.padEnd(5)} c=${c}${tag}  ${txt}`);
    });
  }
}
if (process.argv.includes('--concepts') || true) {
  console.log('\n# Conceptos usados');
  for (const k of [...used].filter(k => CONCEPTS[k]).sort()) {
    const C = CONCEPTS[k];
    console.log(`\n${k} · ${C.name}`);
    C.alts.forEach((a, i) => console.log(`  [${i}] ${a.title}: ${short(a.text, 110)}\n      ✓ ${short(a.q.q, 80)} → ${short(a.q.o[0], 40)}`));
  }
}
