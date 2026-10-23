/* Ledly · el día a día: tiempo de práctica y objetivo diario, calentamiento al abrir la app cada
   día y notificaciones locales (hora de practicar, recordatorios, racha en peligro, protector usado,
   racha perdida y días para repararla). Solo declara funciones y un objeto: se usa desde app.js. */

/* ===================== TIEMPO Y OBJETIVO DIARIO ===================== */
const GOALS = [5, 10, 15, 20, 30];
// Segundos de práctica activa de un día (lecciones, retos, exámenes, repasos…)
const daySec = d => { const r = (S.wk || {})[d || today()]; return r ? (r.sec || 0) + (r.min || 0) * 60 : 0; };
function addActiveTime(ms) {
  if (!(ms > 3000)) return;
  const r = dayRec(); r.sec = (r.sec || 0) + Math.round(Math.min(ms, 30 * 60000) / 1000); save();
}
// Celebración (una vez al día) al cumplir el objetivo de minutos
function checkGoal() {
  const t = today(); S.goalHit = S.goalHit || {};
  if (S.goalHit[t] || daySec(t) < (S.goal || 10) * 60) return;
  S.goalHit[t] = true; S.gems += 10; save(); header();
  setTimeout(() => { Fx.sound('unlock'); Fx.confetti(110); Mascot.react('party'); Mascot.say(`Has practicado ${S.goal} minutos hoy. ¡Objetivo cumplido! +10 gemas.`, 'happy', 6000, '¡Objetivo diario!'); Fx.anim(document.getElementById('tGoal'), 'pop'); }, 450);
}
function goalRing(size = 22) {
  const p = Math.min(1, daySec() / ((S.goal || 10) * 60)), R = 9, C = 2 * Math.PI * R;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="gring ${p >= 1 ? 'full' : ''}" aria-hidden="true"><circle cx="12" cy="12" r="${R}" class="gbg"/><circle cx="12" cy="12" r="${R}" class="gfg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - p)}"/>${p >= 1 ? '<path d="M8 12.5l2.6 2.6L16 9.6" class="gok"/>' : ''}</svg>`;
}
function goalLine() {
  const m = Math.floor(daySec() / 60), g = S.goal || 10;
  return m >= g ? `Objetivo de hoy cumplido: ${m} de ${g} min` : `Hoy llevas ${m} de ${g} min`;
}

/* ===================== CALENTAMIENTO DIARIO ===================== */
// Repaso espaciado por lección: S.seen[id] = { d: último repaso, k: repasos seguidos bien hechos }
const SPACING = [1, 3, 7, 14, 30, 60];
const QUICK = new Set(['mc', 'num', 'match', 'order', 'bits', 'pin', 'res', 'sym', 'pick', 'tap', 'truth']);
function markSeen(id, ok) {
  S.seen = S.seen || {}; const s = S.seen[id] || (S.seen[id] = { d: today(), k: 0 });
  s.d = today(); s.k = ok ? Math.min(SPACING.length - 1, s.k + 1) : Math.max(0, s.k - 1);
}
function quickFrom(lesson) {
  const gens = [...new Set(lesson.ex.filter(e => e.t === 'gen').map(e => e.g))];
  if (gens.length && Math.random() < 0.6) { const g = gens[Math.floor(Math.random() * gens.length)]; return { t: 'gen', g, _key: 'gen:' + g, _l: lesson.id }; }
  const list = lesson.ex.map((e, i) => ({ ...e, _idx: i, _key: lesson.id + ':' + i, _l: lesson.id })).filter(e => QUICK.has(e.t) && !e.predict && !e.live);
  if (!list.length) return gens.length ? { t: 'gen', g: gens[0], _key: 'gen:' + gens[0], _l: lesson.id } : null;
  return list[Math.floor(Math.random() * list.length)];
}
function resolveMiss(m) {
  if (m.g) return { t: 'gen', g: m.g, _key: m.k };
  if (m.x) { const u = unitById(m.x), e = u && u.exam && u.exam[m.i]; return e ? { ...e, _key: m.k } : null; }
  const l = LESSON[m.l]; let e = l && l.ex[m.i];
  if (l && (!e || Widgets.UNGRADED.has(e.t) || (m.q && e.q !== m.q))) { const j = m.q ? l.ex.findIndex(x => x.q === m.q) : -1; e = j >= 0 ? l.ex[j] : null; }
  return e && QUICK.has(e.t) ? { ...e, _key: m.k, _l: m.l, c: e.c || m.c } : null;
}
/* Decide cuántas preguntas y cuáles. Mezcla tres fuentes:
   · fallos pendientes (los más repetidos y antiguos primero);
   · lecciones cuyo repaso espaciado ha vencido (1, 3, 7, 14, 30, 60 días según lo bien que vayan);
   · conceptos flojos de las dos últimas semanas (menos del 70 % de aciertos).
   Más preguntas si hay mucho pendiente o si llevas días sin entrar; menos si tu objetivo es corto.
   Nunca más de 10 ni más de 2 de la misma lección. */
function warmupPlan() {
  const doneL = ALL.filter(n => n.kind === 'lesson' && S.done[n.id] === true);
  if (!doneL.length) return null;
  const t = today(), seen = S.seen || {};
  const age = id => seen[id] ? diff(seen[id].d, t) : 999;
  const misses = Object.values(S.miss).sort((a, b) => b.n - a.n || (a.t < b.t ? -1 : 1));
  const due = doneL.map(l => { const s = seen[l.id], iv = SPACING[s ? s.k : 0]; return { l, over: age(l.id) / iv }; }).filter(x => x.over >= 1).sort((a, b) => b.over - a.over);
  const acc = {}; for (let k = 0; k < 14; k++) { const r = (S.wk || {})[add(t, -k)]; if (r) for (const [c, [o, f]] of Object.entries(r.c)) { const a = acc[c] || (acc[c] = [0, 0]); a[0] += o; a[1] += f; } }
  const weak = Object.entries(acc).filter(([c, [o, f]]) => o + f >= 3 && o / (o + f) < 0.7).sort((a, b) => a[1][0] / (a[1][0] + a[1][1]) - b[1][0] / (b[1][0] + b[1][1])).map(([c]) => c);
  let away = 0; for (let k = 1; k <= 7; k++) { if (S.hist[add(t, -k)] === 'done') break; away++; }
  let N = 3 + Math.min(3, misses.length) + Math.min(3, Math.ceil(due.length / 2)) + (weak.length ? 1 : 0) + (away >= 2 ? 2 : 0);
  if ((S.goal || 10) <= 5) N = Math.min(N, 6);
  N = Math.max(3, Math.min(10, N));
  const out = [], perL = {}, keys = new Set();
  const push = e => { if (!e || keys.has(e._key) || out.length >= N) return false; const l = e._l || 'x'; if ((perL[l] || 0) >= 2) return false; keys.add(e._key); perL[l] = (perL[l] || 0) + 1; out.push(e); return true; };
  const quota = (k, frac) => Math.max(1, Math.round(N * frac));
  let n = 0; for (const m of misses) { if (n >= quota('m', 0.4)) break; if (push(resolveMiss(m))) n++; }
  n = 0; for (const { l } of due) { if (n >= quota('d', 0.4)) break; if (push(quickFrom(l))) n++; }
  for (const c of weak) { if (out.length >= N) break; const l = doneL.find(x => x.ex.some(e => e.c === c && QUICK.has(e.t))); if (!l) continue; const list = l.ex.map((e, i) => ({ ...e, _idx: i, _key: l.id + ':' + i, _l: l.id })).filter(e => e.c === c && QUICK.has(e.t) && !e.predict && !e.live); push(list[Math.floor(Math.random() * list.length)]); }
  // Relleno: lo más reciente primero, para afianzar lo de los últimos días
  const recent = [...doneL].sort((a, b) => age(a.id) - age(b.id));
  for (let pass = 0; pass < 3 && out.length < N; pass++) for (const l of recent) { if (out.length >= N) break; push(quickFrom(l)); }
  if (out.length < 3) return null;
  return { items: out.sort(() => Math.random() - 0.5), N: out.length, misses: misses.length, due: due.length, weak: weak.length, away };
}
const greeting = () => { const h = now().getHours(); return h < 6 ? '¡Qué madrugón!' : h < 14 ? '¡Buenos días!' : h < 21 ? '¡Buenas tardes!' : '¡Buenas noches!'; };
function maybeWarmup() {
  if (document.querySelector('.lesson') || S.warm === today()) return;
  const plan = warmupPlan(); if (!plan) return;
  S.warm = today(); save();
  warmupSplash(plan);
}
/* Pantalla de bienvenida: Chispa se enciende (parpadea como un LED que arranca), suelta rayos y
   presenta el calentamiento del día. */
function warmupSplash(plan) {
  const { L, close } = overlay(); Mascot.suspend(true);
  const end = () => { Mascot.suspend(false); close(); };
  const mins = Math.max(1, Math.round(plan.N * 0.4));
  const why = plan.misses && plan.due ? 'Repasamos fallos pendientes y lo que toca no olvidar.' : plan.misses ? 'Volvemos sobre lo que se te resistió.' : plan.due ? 'Repasamos lo que ya toca refrescar para que no se olvide.' : 'Afianzamos lo último que has aprendido.';
  const streakTxt = S.streak ? `Llevas <b>${S.streak} ${S.streak === 1 ? 'día' : 'días'}</b> de racha.` : repairAvailable() ? `Tu racha de ${S.lost.value} días aún se puede reparar.` : 'Hoy empieza una racha nueva.';
  L.className = 'lesson splash';
  L.innerHTML = `<div class="splin">
    <div class="sbulb off"><svg viewBox="-60 -60 210 230" class="srays" aria-hidden="true">${Array.from({ length: 12 }, (_, k) => `<line x1="45" y1="-38" x2="45" y2="-52" transform="rotate(${k * 30} 45 50)"/>`).join('')}</svg>${chispa('happy', 150)}</div>
    <h1 class="sgreet">${greeting()}</h1>
    <p class="ssub">${streakTxt} ${goalLine()}.</p>
    <div class="scard"><b>Calentamiento de hoy</b><span>${plan.N} preguntas rápidas · unos ${mins} min</span><small>${why} Sin explicaciones por el camino: al final ves cómo te ha ido.</small></div>
    <button class="btn amber" id="wgo">¡Vamos!</button><button class="btn ghost" id="wno">Ahora no</button></div>`;
  const b = L.querySelector('.sbulb');
  setTimeout(() => { b.classList.add('flick'); Fx.sound('tick'); }, 350);
  setTimeout(() => { b.classList.remove('flick', 'off'); b.classList.add('on'); Fx.sound('unlock'); Fx.burstAt(b, { n: 30, speed: 6 }); }, 1100);
  L.querySelectorAll('.sgreet, .ssub, .scard, #wgo, #wno').forEach((x, k) => { x.style.animationDelay = (1.2 + k * 0.12) + 's'; x.classList.add('chipin'); });
  L.querySelector('#wno').onclick = () => { Fx.sound('close'); end(); };
  L.querySelector('#wgo').onclick = () => { end(); startWarmup(plan); };
}
/* El calentamiento: preguntas seguidas, sin explicaciones; solo ✓ o ✗ (y la respuesta buena) y a la siguiente. */
function startWarmup(plan) {
  plan = plan || warmupPlan(); if (!plan) { toast('Completa alguna lección para tener calentamiento'); return; }
  const { L, close } = overlay();
  let i = 0, ok = 0, combo = 0, w = null;
  const results = [];
  Mascot.provider = () => ({ title: 'Calentamiento', text: pickOne(['¡Tú puedes! Es solo para despertar las neuronas.', 'Sin prisa: lo importante es que lo pienses.', 'Si no sale, no pasa nada: lo apuntamos para repasarlo.']), mood: 'happy' });
  const node = { id: 'warm', extra: true, warm: true, title: 'Calentamiento' };
  function ask() {
    if (w && w.destroy) w.destroy(); w = null;
    if (i >= plan.items.length) {
      S.warmDone = today(); save();
      return finishScreen(L, () => { Mascot.provider = defaultTip; close(); }, node, { xp: 5 + 2 * ok, gems: 5 + ok, extra: `<div class="chip"><b>${ok}/${plan.items.length}</b><span>aciertos</span></div>${results.length ? `<div class="wres">${results.map(r => `<span class="${r ? 'ok' : 'no'}"></span>`).join('')}</div>` : ''}` });
    }
    let ex = plan.items[i];
    if (ex.t === 'gen') { const g = Gen.make(ex.g); ex = plan.items[i] = { ...g, _key: ex._key, _gen: ex.g, _l: ex._l }; }
    const title = ex.t === 'res' ? '¿Qué valor tiene esta resistencia?' : ex.q || '';
    L.innerHTML = `<div class="lesson-in warmup"><div class="lbar"><button class="close" aria-label="Salir">×</button><div class="prog"><i style="width:${i / plan.items.length * 100}%"></i></div><span class="excount">${i + 1}/${plan.items.length}</span></div>
      <div class="q"><div class="kind">Calentamiento · ${Widgets.KIND[ex.t]}</div>${title ? `<h2>${esc(title)}</h2>` : ''}<div class="wbox"></div></div>
      <div class="foot"><button class="btn" id="chk" disabled>Comprobar</button></div></div>`;
    L.querySelector('.close').onclick = () => { if (i === 0 || confirm('¿Dejar el calentamiento?')) { if (w && w.destroy) w.destroy(); Mascot.provider = defaultTip; close(); } };
    Fx.anim(L.querySelector('.q'), 'enter');
    const chk = L.querySelector('#chk'), wbox = L.querySelector('.wbox');
    w = Widgets.render(ex, wbox, { ready: v => { chk.disabled = !v; }, submit: () => !chk.disabled && chk.click(), meterAuto: meterAutoOn() });
    chk.onclick = () => {
      const r = w.check(); w.lock && w.lock();
      statAnswer(ex.c, !!r.ok); results.push(!!r.ok);
      if (ex._l) markSeen(ex._l, !!r.ok);
      if (r.ok) { ok++; combo++; recordHit(ex); Fx.sound('correct', combo - 1); Fx.burstAt(chk, { n: 14 }); Mascot.react('right'); }
      else { combo = 0; recordMiss(ex, ex._l || null, ex.c); Fx.sound('wrong'); Fx.anim(wbox, 'shake'); Mascot.react('wrong'); }
      save();
      L.querySelector('.foot').innerHTML = `<div class="sheet mini ${r.ok ? 'ok' : 'bad'}" role="status"><div class="shead"><span class="sicon">${r.ok ? '✓' : '✗'}</span><h3>${r.ok ? pickOne(['¡Bien!', '¡Eso es!', '¡Correcto!']) : r.right ? 'Era: ' + esc(r.right) : 'Esta no'}</h3></div><button class="btn ${r.ok ? 'okb' : 'badb'}" id="nx">${i + 1 < plan.items.length ? 'Siguiente' : 'Ver resultado'}</button></div>`;
      Fx.anim(L.querySelector('.sheet'), 'slideup');
      const nx = L.querySelector('#nx'); nx.focus(); nx.onclick = () => { Fx.sound('tap'); i++; ask(); };
    };
  }
  ask();
}

/* ===================== NOTIFICACIONES ===================== */
/* Notificaciones locales con @capacitor/local-notifications. La app no puede ejecutarse en segundo
   plano, así que cada vez que se abre, se cierra o practicas, se recalculan las de los próximos 7 días
   suponiendo que no vuelves a entrar; al entrar, se rehacen. */
const Notify = (() => {
  const plugin = () => { try { const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins.LocalNotifications) || (C.registerPlugin && C.registerPlugin('LocalNotifications')) || null; } catch (e) { return null; } };
  const ICON = { smallIcon: 'ic_stat_voltio', largeIcon: 'ic_notif_large', iconColor: '#FFB000', channelId: 'voltio' };
  let chan = false;
  async function channel(p) { if (chan) return; chan = true; try { await p.createChannel({ id: 'voltio', name: 'Práctica diaria', description: 'Tu hora de practicar, recordatorios y avisos de racha', importance: 4, visibility: 1, vibration: true, lights: true, lightColor: '#FFB000' }); } catch (e) { } }
  async function permission(ask) {
    const p = plugin(); if (!p) return 'web';
    try { let r = await p.checkPermissions(); if (r.display !== 'granted' && ask) r = await p.requestPermissions(); return r.display; } catch (e) { return 'denied'; }
  }
  const hm = s => { const [h, m] = String(s || '19:00').split(':').map(Number); return [h || 0, m || 0]; };
  // Fecha real de una hora de un día (respetando el desfase de días de las herramientas de prueba)
  const at = (day, h, m) => { const d = parse(day); d.setHours(h, m, 0, 0); return new Date(d.getTime() - (S.offset || 0) * DAY); };
  const dayName = d => parse(d).toLocaleDateString('es-ES', { weekday: 'long' });
  const PRACTICE = [
    ['¡Hora de practicar!', 'Chispa te espera con el calentamiento del día. Unos minutos y listo.'],
    ['Tu rato de electrónica', 'Es tu hora. ¿Un par de lecciones para mantener la racha encendida?'],
    ['¡A practicar!', 'Lo que se repasa a diario se queda para siempre. ¿Empezamos?'],
    ['Chispa está encendida', 'Es tu hora de practicar. Hoy toca seguir sumando.']];
  const LATER = [['¿Un ratito ahora?', 'Aún no has practicado hoy. Con 5 minutos basta para la racha.'], ['Se te ha pasado la hora', 'No pasa nada: todavía estás a tiempo de practicar hoy.'], ['Chispa te echa de menos', 'Una lección rápida y el día queda hecho.']];
  /* Las notificaciones de los próximos 7 días, simulando qué pasaría con la racha si no entras. */
  function plan() {
    const list = [], [H, M] = hm(S.practiceAt), t = today(), nowReal = Date.now();
    let n = S.streak, f = S.freezes, lost = repairAvailable() ? { ...S.lost } : null;
    const practicedToday = S.hist[t] === 'done';
    for (let d = 0; d < 7; d++) {
      const D = add(t, d), base = 100 + d * 10;
      let first = null;
      if (d > 0 && (d > 1 || !practicedToday)) {
        // Se evalúa el día anterior, que (en esta simulación) no has practicado
        const prev = add(D, -1);
        if (n > 0) {
          if (f > 0) { f--; first = ['Protector de racha usado', `Ayer no practicaste, pero tu racha de ${n} ${n === 1 ? 'día' : 'días'} sigue a salvo. ${f ? `Te ${f === 1 ? 'queda 1 protector' : 'quedan ' + f + ' protectores'}.` : 'Era tu último protector: hoy no te lo saltes.'}`]; }
          else { lost = { value: n, from: prev, expires: add(prev, REPAIR_DAYS) }; n = 0; first = ['Se apagó tu racha', `Has perdido tu racha de ${lost.value} días, pero tienes ${REPAIR_DAYS} días para repararla: con gemas o con 3 actividades en un día. ¡Aún estás a tiempo!`]; }
        }
      }
      const repairLeft = lost && D <= lost.expires ? diff(D, lost.expires) + 1 : 0;
      if (!first && repairLeft) first = [repairLeft === 1 ? 'Último día para reparar tu racha' : 'Aún puedes reparar tu racha', `Tu racha de ${lost.value} días se puede recuperar ${repairLeft === 1 ? 'solo hasta esta noche' : `durante ${repairLeft} días más`}. Entra y hazlo con 3 actividades o con gemas.`];
      if (d === 0 && practicedToday) continue;
      if (!first) first = PRACTICE[(parse(D).getDate() + d) % PRACTICE.length];
      const push = (id, h, m, [title, body]) => { const when = at(D, h, m); if (when.getTime() > nowReal + 60000) list.push({ id, title, body, schedule: { at: when, allowWhileIdle: true }, ...ICON }); };
      push(base + 1, H, M, first);
      // Recordatorio unas horas después, si sigue siendo de día
      // Recordatorios si se te pasa: hora y media después y, si queda día, tres horas después
      const r1 = H * 60 + M + 90, r2 = H * 60 + M + 180;
      if (r1 < 21 * 60) push(base + 2, Math.floor(r1 / 60), r1 % 60, LATER[(d + 1) % LATER.length]);
      if (r2 < 21 * 60) push(base + 4, Math.floor(r2 / 60), r2 % 60, LATER[(d + 2) % LATER.length]);
      // Aviso de noche: la racha se apaga a medianoche
      if (H * 60 + M < 21 * 60) push(base + 3, 21, 30, n > 0 ? ['Tu racha está en peligro', `Tu racha de ${n} ${n === 1 ? 'día' : 'días'} se apaga a medianoche. ${f ? 'Tienes protector, pero mejor no gastarlo.' : 'No tienes protector: entra ahora y sálvala.'}`] : repairLeft === 1 ? ['Última oportunidad', `Esta noche termina el plazo para reparar tu racha de ${lost.value} días.`] : ['Aún estás a tiempo', `El ${dayName(D)} todavía no has practicado. Un ratito antes de dormir.`]);
    }
    return list;
  }
  async function schedule() {
    const p = plugin(); if (!p) return;
    try {
      const pend = await p.getPending(); if (pend && pend.notifications && pend.notifications.length) await p.cancel({ notifications: pend.notifications.map(x => ({ id: x.id })) });
      if (!S.notif || (await permission(false)) !== 'granted') return;
      await channel(p);
      const list = plan(); if (list.length) await p.schedule({ notifications: list });
    } catch (e) { }
  }
  async function test() {
    const p = plugin(); if (!p) return false;
    try { await channel(p); await p.schedule({ notifications: [{ id: 99, title: '¡Así te avisará Chispa!', body: `Cada día a las ${S.practiceAt || '19:00'}, y te recordará si se te pasa.`, schedule: { at: new Date(Date.now() + 4000) }, ...ICON }] }); return true; } catch (e) { return false; }
  }
  return { available: () => !!plugin(), permission, schedule, test, plan };
})();
