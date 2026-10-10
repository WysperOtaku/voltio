/* Voltio · estudio: exámenes de nivel al final de cada módulo, repaso de temario por módulo
   y resumen semanal. Solo declara funciones: se usan en tiempo de ejecución desde app.js. */

/* ===================== ESTADÍSTICAS DIARIAS ===================== */
// S.wk[fecha] = { xp, min, l: [lecciones completadas], x: [[módulo, nota]], c: { concepto: [aciertos, fallos] } }
function dayRec(d) {
  S.wk = S.wk || {}; d = d || today();
  return S.wk[d] || (S.wk[d] = { xp: 0, min: 0, l: [], x: [], c: {} });
}
function statAnswer(c, ok) { if (!c) return; const r = dayRec(); const s = r.c[c] || (r.c[c] = [0, 0]); s[ok ? 0 : 1]++; }
function pruneStats() { if (!S.wk) return; const lim = add(today(), -70); Object.keys(S.wk).forEach(d => { if (d < lim) delete S.wk[d]; }); }

/* ===================== EXAMEN DE NIVEL ===================== */
const EXAM_PASS = 90;
// Tipos de ejercicio que se pueden corregir sin dar pistas por el camino
const EXAM_TYPES = new Set(['mc', 'num', 'match', 'order', 'bits', 'pin', 'res', 'bands', 'tap', 'sym', 'pick', 'truth', 'tune', 'meter', 'bbtap']);
let _units = null;
function unitById(id) { if (!_units) _units = Object.fromEntries([...UNITS, ...TRACKS.flatMap(t => t.units)].map(u => [u.id, u])); return _units[id]; }
const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const examSize = u => { const n = u.nodes.filter(x => x.kind === 'lesson').length; return Math.max(12, Math.min(40, n * 3)); };

/* Construye el examen: por cada lección, unas preguntas que cubran sus conceptos. Primero las del
   banco propio del módulo (u.exam, preguntas nuevas), luego generadores con números nuevos y por
   último ejercicios de la propia lección. Cada intento sale distinto. */
function buildExam(u) {
  const lessons = u.nodes.filter(n => n.kind === 'lesson'), N = examSize(u);
  const per = Math.max(2, Math.ceil(N / Math.max(1, lessons.length)));
  const pool = (u.exam || []).map((e, i) => ({ ...e, _key: 'xq:' + u.id + ':' + i, _x: u.id, _idx: i }));
  const used = new Set(), out = [];
  const take = (list, max, pick) => {
    const seen = new Set(pick.map(e => e.c));
    // primero conceptos aún no preguntados en esta lección, luego el resto
    for (const pass of [0, 1]) for (const e of list) {
      if (pick.length >= max) return;
      if (used.has(e._key) || (pass === 0 && seen.has(e.c))) continue;
      used.add(e._key); seen.add(e.c); pick.push(e);
    }
  };
  lessons.forEach(l => {
    const cs = new Set(l.c || []); l.ex.forEach(e => e.c && cs.add(e.c));
    const mine = shuffled(pool.filter(p => p.l === l.id || cs.has(p.c)));
    const gens = shuffled([...new Set(l.ex.filter(e => e.t === 'gen').map(e => e.g))]).map(g => ({ t: 'gen', g, _key: 'gen:' + g, c: Gen.make(g).c }));
    const exs = shuffled(l.ex.map((e, i) => ({ ...e, _idx: i, _key: l.id + ':' + i, _l: l.id })).filter(e => EXAM_TYPES.has(e.t) && !e.predict && !e.live));
    const pick = [];
    take(mine, Math.ceil(per * 0.6), pick); take(gens, Math.ceil(per * 0.8), pick); take(exs, per, pick); take(mine, per, pick);
    out.push(...pick);
  });
  if (out.length < N) take(shuffled(pool), N, out);
  return shuffled(out).slice(0, N);
}

function examMiss(ex, u) {
  const k = ex._key; if (!k) return;
  const m = S.miss[k] || (S.miss[k] = { k, n: 0, ok: 0, c: ex.c || null });
  if (ex._x) { m.x = ex._x; m.i = ex._idx; } else if (ex._gen || ex.g) m.g = ex._gen || ex.g; else { m.l = ex._l; m.i = ex._idx; if (ex.q) m.q = ex.q; }
  m.n++; m.ok = 0; m.t = today();
}

function startExam(node) {
  const u = unitById(node.unit), qs = buildExam(u), prev = (S.exam || {})[u.id];
  const { L, close } = overlay(); Mascot.suspend(true);
  const t0 = Date.now(), answers = [];
  let i = 0, w = null;
  const end = () => { if (w && w.destroy) w.destroy(); Mascot.suspend(false); close(); };
  const col = nodeColor(node);
  L.innerHTML = `<div class="lesson-in exam" style="--uc:${col}"><div class="lbar"><button class="close" aria-label="Salir">×</button><h2 class="stitle">Examen del módulo</h2></div>
    <div class="q exintro"><div class="exbadge"><svg viewBox="0 0 24 24">${ICONS.exam}</svg></div><h1>${esc(u.title)}</h1>
      <ul class="exrules"><li><b>${qs.length} preguntas</b> de todo el módulo, mezcladas.</li><li>Necesitas <b>un ${EXAM_PASS} %</b> para desbloquear el siguiente módulo.</li><li><b>Sin pistas ni correcciones</b>: Chispa espera fuera y no sabrás si aciertas hasta el final.</li><li>Al terminar verás tu nota y cada pregunta explicada.</li></ul>
      ${prev ? `<p class="small">Tu mejor nota: <b>${prev.best} %</b>${prev.tries > 1 ? ` · ${prev.tries} intentos` : ''}.</p>` : '<p class="small">Si no te sientes seguro, en Repasar tienes un repaso de todo el módulo.</p>'}</div>
    <div class="foot"><button class="btn amber" id="go">Empezar el examen</button><button class="btn ghost" id="rev">Repasar antes</button></div></div>`;
  L.querySelector('.close').onclick = end;
  L.querySelector('#rev').onclick = () => { end(); moduleReview(u); };
  L.querySelector('#go').onclick = () => { Fx.sound('step'); ask(); };
  function ask() {
    if (w && w.destroy) w.destroy(); w = null;
    if (i >= qs.length) return result();
    let ex = qs[i];
    if (ex.t === 'gen') { const g = Gen.make(ex.g); ex = qs[i] = { ...g, _key: ex._key, _gen: ex.g }; }
    const title = ex.t === 'res' ? '¿Qué valor tiene esta resistencia?' : ex.q || '';
    L.innerHTML = `<div class="lesson-in exam" style="--uc:${col}"><div class="lbar"><button class="close" aria-label="Abandonar">×</button><div class="prog"><i style="width:${i / qs.length * 100}%"></i></div><span class="excount">${i + 1}/${qs.length}</span></div>
      <div class="q"><div class="kind">${Widgets.KIND[ex.t]}</div>${title ? `<h2>${esc(title)}</h2>` : ''}<div class="wbox"></div></div>
      <div class="foot"><button class="btn" id="chk" disabled>${i + 1 < qs.length ? 'Responder y seguir' : 'Responder y terminar'}</button></div></div>`;
    L.querySelector('.close').onclick = () => { if (confirm('¿Abandonar el examen? No contará como intento.')) end(); };
    Fx.anim(L.querySelector('.q'), 'enter');
    const chk = L.querySelector('#chk');
    w = Widgets.render(ex, L.querySelector('.wbox'), { ready: v => { chk.disabled = !v; }, submit: () => !chk.disabled && chk.click(), meterAuto: meterAutoOn(), exam: true });
    chk.onclick = () => {
      const r = w.check();
      answers.push({ ex, ok: !!r.ok, right: r.right });
      statAnswer(ex.c, !!r.ok);
      Fx.sound('tap'); vib(15); i++; ask();
    };
  }
  function result() {
    const ok = answers.filter(a => a.ok).length, pct = Math.round(ok / answers.length * 100), passed = pct >= EXAM_PASS;
    S.exam = S.exam || {};
    const rec = S.exam[u.id] || { best: 0, tries: 0, passed: false };
    rec.tries++; rec.last = pct; rec.best = Math.max(rec.best, pct); rec.passed = rec.passed || passed; rec.d = today();
    rec.weak = [...new Set(answers.filter(a => !a.ok).map(a => a.ex.c).filter(Boolean))];
    S.exam[u.id] = rec;
    answers.filter(a => !a.ok).forEach(a => examMiss(a.ex, u));
    const dr = dayRec(); dr.x.push([u.id, pct]); dr.min += Math.round((Date.now() - t0) / 60000);
    save();
    // Por concepto: aciertos y total
    const byC = {}; answers.forEach(a => { const c = a.ex.c || '?'; const b = byC[c] || (byC[c] = [0, 0]); b[1]++; if (a.ok) b[0]++; });
    const R = 54, C = 2 * Math.PI * R;
    Mascot.suspend(false);
    L.innerHTML = `<div class="lesson-in exam result" style="--uc:${col}"><div class="lbar"><button class="close" aria-label="Cerrar">×</button><h2 class="stitle">Resultado del examen</h2></div>
      <div class="q"><div class="center">
        <div class="ring ${passed ? 'pass' : 'fail'}"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${R}" class="rbg"/><circle cx="70" cy="70" r="${R}" class="rfg" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/>
          <line x1="70" y1="8" x2="70" y2="24" class="rmark" transform="rotate(${EXAM_PASS * 3.6} 70 70)"/></svg><div class="rnum"><b id="pct">0</b><span>%</span></div></div>
        <h1>${passed ? (pct === 100 ? '¡Perfecto!' : '¡Aprobado!') : 'Aún no'}</h1>
        <p>${ok} de ${answers.length} correctas. ${passed ? (rec.tries === 1 && !prev ? 'Módulo superado a la primera.' : 'Módulo superado.') : `Necesitas un ${EXAM_PASS} %: te ${Math.ceil(answers.length * EXAM_PASS / 100) - ok === 1 ? 'ha faltado 1 respuesta' : 'han faltado ' + (Math.ceil(answers.length * EXAM_PASS / 100) - ok) + ' respuestas'}.`}</p></div>
        <h3 class="sub">Por temas</h3><div class="cbars">${Object.entries(byC).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([c, [h, t]]) => `<div class="cbar ${h === t ? 'full' : h / t < 0.6 ? 'low' : ''}"><span>${esc(CONCEPTS[c] ? CONCEPTS[c].name : 'Otros')}</span><div class="uprog"><i style="width:0" data-w="${h / t * 100}"></i></div><small>${h}/${t}</small></div>`).join('')}</div>
        <h3 class="sub">Pregunta a pregunta</h3><div class="xlist">${answers.map((a, k) => `<details class="xq ${a.ok ? 'ok' : 'no'}"><summary><span class="xi">${a.ok ? '✓' : '✗'}</span><span class="grow">${k + 1}. ${esc(String(a.ex.q || Widgets.KIND[a.ex.t]).slice(0, 140))}</span></summary>
          ${a.ok ? '<p class="small">Respondiste bien.</p>' : `<p class="small">Tu respuesta no era correcta.${a.right ? ` Correcta: <b>${esc(a.right)}</b>.` : ''}</p>`}${a.ex.e ? `<p>${esc(a.ex.e)}</p>` : ''}</details>`).join('')}</div>
      </div>
      <div class="foot">${passed ? '<button class="btn amber" id="fin">Continuar</button>' : `<button class="btn amber" id="weak">Repasar lo que he fallado</button><button class="btn ghost" id="again">Volver a intentarlo</button>`}</div></div>`;
    const ring = L.querySelector('.rfg');
    requestAnimationFrame(() => { ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.2,.9,.3,1)'; ring.style.strokeDashoffset = C * (1 - pct / 100); });
    Fx.countUp(L.querySelector('#pct'), pct, { prefix: '', ms: 1400 });
    setTimeout(() => L.querySelectorAll('.cbar i').forEach((b, k) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, k * 80)), 600);
    setTimeout(() => {
      if (passed) { Fx.sound('unlock'); Fx.confetti(pct === 100 ? 180 : 120); Mascot.react('party'); Mascot.say(pct === 100 ? '¡Ni un fallo! Esto ya está en tu cabeza para quedarse.' : '¡Lo tienes! Los fallos que quedan los encontrarás en Repasar.', 'happy', 6000, '¡Enhorabuena!'); }
      else { Fx.sound('wrong'); Mascot.react('think'); Mascot.say('Repasa los temas en rojo con el repaso guiado y vuelve a intentarlo: cada examen sale con preguntas distintas.', 'think', 8000, 'Casi'); }
    }, 1500);
    L.querySelector('.close').onclick = end;
    if (passed) L.querySelector('#fin').onclick = () => finishScreen(L, () => { Mascot.suspend(false); close(); }, node, { xp: 40 + Math.round(pct / 5), gems: 60 + (pct === 100 ? 40 : 0), extra: `<div class="chip"><b>${pct} %</b><span>nota</span></div>` });
    else {
      practicedToday();
      L.querySelector('#weak').onclick = () => { end(); moduleReview(u, new Set(rec.weak)); };
      L.querySelector('#again').onclick = () => { end(); startExam(node); };
    }
  }
}

/* ===================== REPASO DE TEMARIO ===================== */
/* Una lección larga con lo esencial de cada lección del módulo: su resumen, su ejemplo resuelto
   y ejercicios (con números nuevos cuando hay generador). Con «only», solo los conceptos flojos,
   empezando por una explicación alternativa de cada uno. */
function moduleReview(u, only) {
  const ex = [], cs = new Set();
  if (only && only.size) [...only].filter(c => CONCEPTS[c]).forEach(c => { const p = altPair(c, Math.floor(Math.random() * CONCEPTS[c].alts.length)); ex.push(p[0]); cs.add(c); });
  u.nodes.filter(n => n.kind === 'lesson').forEach(l => {
    const lc = new Set([...(l.c || []), ...l.ex.map(e => e.c).filter(Boolean)]);
    if (only && only.size && ![...only].some(c => lc.has(c))) return;
    lc.forEach(c => cs.add(c));
    const infos = l.ex.filter(e => e.t === 'info');
    const sum = [...infos].reverse().find(e => /resumen/i.test(String(e.text).slice(0, 80))) || infos[infos.length - 1];
    if (sum) ex.push({ ...sum, title: l.title });
    const st = l.ex.find(e => e.t === 'steps'); if (st && !only) ex.push(st);
    const graded = shuffled(l.ex.map((e, i) => ({ ...e, _idx: i, _key: l.id + ':' + i })).filter(e => !Widgets.UNGRADED.has(e.t) && e.t !== 'gen' && !e.predict && (!only || !only.size || only.has(e.c))));
    const gens = [...new Set(l.ex.filter(e => e.t === 'gen').map(e => e.g))];
    const want = only && only.size ? 3 : 2;
    if (gens.length) { const g = gens[Math.floor(Math.random() * gens.length)]; ex.push({ t: 'gen', g, _key: 'gen:' + g }); }
    ex.push(...graded.slice(0, want - (gens.length ? 1 : 0)));
  });
  if (!ex.length) { toast('No hay nada que repasar en este módulo todavía'); return; }
  startLesson({ id: 'rev:' + u.id, title: (only ? 'Repaso de lo flojo: ' : 'Repaso: ') + u.title, extra: true, c: [...cs], ex });
}

/* ===================== PESTAÑA REPASAR ===================== */
function examChip(u) {
  const r = (S.exam || {})[u.id];
  if (!r) return '<span class="xchip">Examen pendiente</span>';
  return r.passed ? `<span class="xchip ok">Aprobado · ${r.best} %</span>` : `<span class="xchip no">Suspendido · ${r.last} %</span>`;
}
function renderReview() {
  const items = Object.values(S.miss);
  const byC = {}; items.forEach(m => { const c = m.c || 'otros'; (byC[c] = byC[c] || []).push(m); });
  const groups = [{ key: 'base', title: 'Curso base', units: UNITS, num: i => i }, ...TRACKS.map(t => ({ key: t.id, title: t.title, units: t.units, num: i => i + 1 }))];
  const cur = firstOpenIn('base');
  const mods = groups.map(g => {
    const open = g.units.filter(u => u.nodes.length && isUnlocked(u.nodes[0].id));
    if (!open.length) return '';
    const here = cur && g.key === 'base';
    return `<details class="cgroup" ${here ? 'open' : ''}><summary>${esc(g.title)} <small>${open.length} ${open.length === 1 ? 'módulo' : 'módulos'}</small></summary>${open.map(u => {
      const r = (S.exam || {})[u.id], weak = r && !r.passed && r.weak && r.weak.length;
      return `<div class="modrev" style="--uc:${BAND[g.num(g.units.indexOf(u)) % 10]}"><div class="grow"><b>${esc(u.title)}</b>${examChip(u)}</div><div class="mrbtns"><button class="sbtn" data-rev="${u.id}">Repasar</button>${weak ? `<button class="sbtn hot" data-weak="${u.id}">Lo flojo</button>` : ''}</div></div>`;
    }).join('')}</details>`;
  }).join('');
  main.innerHTML = `<h2 class="ptitle">Repasar</h2>
    ${items.length ? `<div class="card"><h3>Tus fallos</h3><p>${items.length} ${items.length === 1 ? 'ejercicio' : 'ejercicios'} por repasar. Cada uno sale de la lista cuando lo aciertas dos veces seguidas.</p><button class="btn amber" id="revgo">Repasar fallos (${Math.min(items.length, 10)})</button></div>` : ''}
    <h3 class="sub">Repasar temario</h3><p class="small" style="margin:0 0 8px">Una lección larga con lo esencial de cada lección del módulo, sus ejemplos y ejercicios con números nuevos. Perfecta antes de un examen, después de suspenderlo o cuando algo ya no lo recuerdas.</p>
    ${mods || '<p class="small">Completa tu primera lección para poder repasar.</p>'}
    ${items.length ? `<h3 class="sub">Fallos por tema</h3>${Object.entries(byC).map(([c, ms]) => `<div class="card revrow"><div class="grow"><b>${esc(CONCEPTS[c] ? CONCEPTS[c].name : 'Otros')}</b><br><small>${ms.length} ${ms.length === 1 ? 'pendiente' : 'pendientes'} · ${ms.reduce((a, m) => a + m.n, 0)} fallos</small></div>${CONCEPTS[c] ? `<button class="sbtn" data-c="${c}">Otra forma de verlo</button>` : ''}</div>`).join('')}` : ''}
    <h3 class="sub">Explicaciones alternativas</h3>${conceptLists()}`;
  const rg = $('#revgo'); rg && (rg.onclick = () => startReview());
  main.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => moduleReview(unitById(b.dataset.rev)));
  main.querySelectorAll('[data-weak]').forEach(b => b.onclick = () => moduleReview(unitById(b.dataset.weak), new Set(S.exam[b.dataset.weak].weak)));
  main.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = b.dataset.c; startLesson({ id: 'alt:' + c, title: 'Otra forma de verlo: ' + CONCEPTS[c].name, extra: true, c: [c], ex: CONCEPTS[c].alts.flatMap((a, i) => altPair(c, i)) }); });
}

/* ===================== RESUMEN SEMANAL ===================== */
function weekStats(endDay) {
  const days = Array.from({ length: 7 }, (_, k) => add(endDay, k - 6));
  const agg = { days, xp: 0, min: 0, active: 0, perDay: [], l: [], x: [], c: {} };
  days.forEach(d => {
    const r = (S.wk || {})[d], h = S.hist[d];
    agg.perDay.push(r ? r.xp : 0);
    if (h === 'done') agg.active++;
    if (!r) return;
    agg.xp += r.xp; agg.min += r.min; agg.l.push(...r.l); agg.x.push(...r.x);
    for (const [c, [o, k]] of Object.entries(r.c)) { const s = agg.c[c] || (agg.c[c] = [0, 0]); s[0] += o; s[1] += k; }
  });
  agg.l = [...new Set(agg.l)];
  const cs = Object.entries(agg.c).filter(([c, [o, k]]) => CONCEPTS[c] && o + k >= 3).map(([c, [o, k]]) => ({ c, o, k, acc: o / (o + k) }));
  agg.best = cs.filter(x => x.acc >= 0.75).sort((a, b) => b.acc - a.acc || (b.o + b.k) - (a.o + a.k)).slice(0, 3);
  agg.hard = cs.filter(x => x.acc < 0.75).sort((a, b) => a.acc - b.acc || (b.o + b.k) - (a.o + a.k)).slice(0, 3);
  agg.answers = Object.values(agg.c).reduce((a, [o, k]) => a + o + k, 0);
  agg.right = Object.values(agg.c).reduce((a, [o]) => a + o, 0);
  return agg;
}
const weekKey = () => { const nd = now(), dow = (nd.getDay() + 6) % 7; return add(today(), -dow); };
function weeklyTeaser() {
  const w = weekStats(today());
  return `<div class="card weekcard" id="wkcard"><div class="row">${chispa('happy', 46)}<div class="grow"><h3>Tu semana</h3><p style="margin:0">${w.active} ${w.active === 1 ? 'día' : 'días'} practicados · ${w.xp} XP · ${w.l.length} ${w.l.length === 1 ? 'lección' : 'lecciones'}</p></div></div><button class="btn amber" id="wkgo" style="margin-top:12px">Ver mi resumen</button></div>`;
}
function startWeekly() {
  const w = weekStats(today()), p = weekStats(add(today(), -7));
  const { L, close } = overlay(); Mascot.suspend(true);
  const end = () => { Mascot.suspend(false); close(); };
  S.wkSeen = weekKey(); save();
  const trend = p.xp ? Math.round((w.xp - p.xp) / p.xp * 100) : null;
  const accW = w.answers ? Math.round(w.right / w.answers * 100) : null;
  const intro = !w.xp && !w.active ? '¡Hola! Esta semana aún no hemos practicado juntos. Con una lección al día todo se queda mucho mejor en la cabeza. ¿Empezamos hoy?'
    : trend != null && trend > 15 ? `¡Vaya semana! Has sacado un ${trend} % más de XP que la anterior. Te lo cuento todo:`
    : w.active >= 5 ? `¡${w.active} días de 7! Esa constancia es lo que de verdad instala lo aprendido. Mira:`
    : 'Aquí tienes tu semana. Cada día que practicas cuenta; vamos a ver qué has conseguido:';
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'], maxXp = Math.max(10, ...w.perDay);
  const dayLab = d => labels[(parse(d).getDay() + 6) % 7];
  const lessonTitles = w.l.map(id => NODE[id]).filter(Boolean);
  const exams = w.x.map(([uid, pct]) => ({ u: unitById(uid), pct })).filter(x => x.u);
  const closing = w.hard.length ? `Esta semana, a por «${CONCEPTS[w.hard[0].c].name}»: un repaso de diez minutos y será tuyo.` : w.xp ? 'Sigue así: lo que repites unos días seguidos ya no se olvida.' : 'Una lección hoy y la semana que viene este resumen se llenará.';
  L.innerHTML = `<div class="lesson-in weekly"><div class="lbar"><button class="close" aria-label="Cerrar">×</button><h2 class="stitle">Tu semana</h2></div>
    <div class="q">
      <div class="wkhero"><div class="wkchispa">${chispa('happy', 96)}</div><div class="wkbubble"><span id="wktype"></span></div></div>
      <div class="wktiles">
        <div class="wkt"><b data-cu="${w.active}">0</b><span>días de 7</span></div>
        <div class="wkt"><b data-cu="${w.xp}">0</b><span>XP${trend != null ? ` · <i class="${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)} %</i>` : ''}</span></div>
        <div class="wkt"><b data-cu="${w.min}">0</b><span>minutos</span></div>
        <div class="wkt"><b data-cu="${accW == null ? 0 : accW}">0</b><span>% de aciertos</span></div>
      </div>
      <div class="card wkchart"><h3>XP por día</h3><div class="bars">${w.days.map((d, k) => `<div class="bar ${d === today() ? 'today' : ''}"><i style="height:0" data-h="${Math.round(w.perDay[k] / maxXp * 100)}"></i><small>${w.perDay[k] || ''}</small><span>${dayLab(d)}</span></div>`).join('')}</div></div>
      ${lessonTitles.length || exams.length ? `<div class="card wksec"><h3>Lo que has aprendido</h3><ul class="wklist">${exams.map(x => `<li class="wkx ${x.pct >= EXAM_PASS ? 'ok' : ''}">${x.pct >= EXAM_PASS ? 'Examen aprobado' : 'Examen intentado'}: <b>${esc(x.u.title)}</b> · ${x.pct} %</li>`).join('')}${lessonTitles.slice(0, 10).map(n => `<li>${esc(n.title)}</li>`).join('')}${lessonTitles.length > 10 ? `<li class="small">y ${lessonTitles.length - 10} más</li>` : ''}</ul></div>` : ''}
      ${w.best.length ? `<div class="card wksec good"><h3>Lo que mejor se te ha dado</h3>${w.best.map(x => `<div class="wkc"><span>${esc(CONCEPTS[x.c].name)}</span><div class="uprog"><i style="width:0" data-w="${Math.round(x.acc * 100)}"></i></div><small>${Math.round(x.acc * 100)} %</small></div>`).join('')}</div>` : ''}
      ${w.hard.length ? `<div class="card wksec hard"><h3>Lo que más te ha costado</h3>${w.hard.map(x => `<div class="wkc"><span>${esc(CONCEPTS[x.c].name)}</span><div class="uprog"><i style="width:0" data-w="${Math.round(x.acc * 100)}"></i></div><small>${Math.round(x.acc * 100)} %</small><button class="sbtn" data-c="${x.c}">Repasar</button></div>`).join('')}</div>` : ''}
      <p class="wkclose">${esc(closing)}</p>
    </div>
    <div class="foot"><button class="btn amber" id="wkend">¡A por la semana!</button></div></div>`;
  // Chispa lo cuenta escribiendo, y luego aparece todo con su animación
  const typeEl = L.querySelector('#wktype'); let k = 0;
  const typer = setInterval(() => { k += 2; typeEl.textContent = intro.slice(0, k); if (k % 6 === 0) Fx.sound('tick'); if (k >= intro.length) clearInterval(typer); }, 28);
  if (Fx.reduced()) { clearInterval(typer); typeEl.textContent = intro; }
  Fx.sound('chirp');
  L.querySelectorAll('.wkt, .wkchart, .wksec, .wkclose').forEach((c, j) => { c.style.animationDelay = (0.5 + j * 0.15) + 's'; c.classList.add('chipin'); });
  setTimeout(() => {
    L.querySelectorAll('[data-cu]').forEach(b => Fx.countUp(b, +b.dataset.cu, { prefix: '', ms: 900 }));
    L.querySelectorAll('.bars i').forEach((b, j) => setTimeout(() => { b.style.height = Math.max(b.dataset.h > 0 ? 6 : 0, +b.dataset.h) + '%'; }, j * 90));
    L.querySelectorAll('.wkc i').forEach((b, j) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, 400 + j * 100));
    if (trend != null && trend > 0 || w.active >= 5) { Fx.confetti(90); Fx.sound('streak'); }
  }, 800);
  L.querySelector('.close').onclick = () => { clearInterval(typer); end(); };
  L.querySelector('#wkend').onclick = () => { clearInterval(typer); Fx.sound('complete'); Fx.confetti(60); end(); };
  L.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { clearInterval(typer); end(); const c = b.dataset.c; startLesson({ id: 'alt:' + c, title: 'Otra forma de verlo: ' + CONCEPTS[c].name, extra: true, c: [c], ex: CONCEPTS[c].alts.flatMap((a, i) => altPair(c, i)) }); });
}
