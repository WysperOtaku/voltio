/* Voltio · efectos: sonidos sintetizados (sin archivos), partículas, confeti y pequeñas
   animaciones. Todo respeta prefers-reduced-motion y los interruptores de Perfil. */
const Fx = (() => {
  let ac = null, master = null, on = true;
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function ctx() {
    if (!on) return null;
    try {
      if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  // Una nota: frecuencia, inicio relativo, duración, forma de onda, volumen y deslizamiento opcional
  function tone(f, t0, dur, type = 'sine', vol = 0.18, slide = null) {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t0, dur, vol = 0.08, freq = 1800) {
    const a = ctx(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol; s.buffer = buf; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const semi = (f, n) => f * Math.pow(2, n / 12);
  let lastTick = 0;
  const SOUNDS = {
    tap: () => tone(1400, 0, 0.035, 'triangle', 0.06),
    select: () => { tone(740, 0, 0.06, 'triangle', 0.1); tone(1110, 0.03, 0.05, 'sine', 0.05); },
    tick: () => { const n = performance.now(); if (n - lastTick < 45) return; lastTick = n; tone(2200, 0, 0.02, 'square', 0.025); },
    // combo sube el tono medio tono por acierto seguido
    correct: (combo = 0) => { const k = Math.min(combo, 8); tone(semi(784, k), 0, 0.11, 'triangle', 0.16); tone(semi(1175, k), 0.08, 0.2, 'triangle', 0.16); tone(semi(2350, k), 0.08, 0.16, 'sine', 0.05); },
    wrong: () => { tone(196, 0, 0.16, 'sawtooth', 0.06, 150); tone(147, 0.1, 0.22, 'triangle', 0.12, 110); },
    task: () => { tone(988, 0, 0.08, 'triangle', 0.12); tone(1319, 0.06, 0.12, 'triangle', 0.12); },
    step: () => { tone(587, 0, 0.07, 'triangle', 0.1); tone(880, 0.04, 0.08, 'sine', 0.06); },
    hint: () => { tone(880, 0, 0.08, 'sine', 0.12, 1320); tone(1760, 0.07, 0.1, 'sine', 0.05); },
    chirp: () => { tone(1200, 0, 0.07, 'sine', 0.1, 1800); tone(1600, 0.07, 0.09, 'sine', 0.08, 1100); },
    combo: (n = 3) => [0, 4, 7, 12].forEach((s, i) => tone(semi(659, s + Math.min(n, 9)), i * 0.05, 0.14, 'triangle', 0.1)),
    coin: () => { tone(1568, 0, 0.05, 'square', 0.04); tone(2093, 0.045, 0.09, 'square', 0.04); },
    complete: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.14)); tone(2093, 0.45, 0.5, 'sine', 0.06); noise(0.45, 0.4, 0.03, 6000); },
    streak: () => { tone(392, 0, 0.5, 'sawtooth', 0.04, 1568); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.25 + i * 0.07, 0.3, 'triangle', 0.1)); },
    unlock: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', 0.13)); [1047, 1568].forEach((f, i) => tone(f, 0.5 + i * 0.12, 0.6, 'sine', 0.08)); noise(0.5, 0.6, 0.03, 7000); },
    burn: () => { noise(0, 0.35, 0.12, 900); tone(220, 0, 0.3, 'sawtooth', 0.04, 60); },
    open: () => tone(523, 0, 0.09, 'triangle', 0.08, 784),
    close: () => tone(784, 0, 0.08, 'triangle', 0.07, 523)
  };
  function sound(name, arg) { if (!on) return; try { SOUNDS[name] && SOUNDS[name](arg); } catch (e) { } }

  /* ----- partículas sobre un lienzo a pantalla completa ----- */
  let cv = null, cx = null, parts = [], raf = 0;
  function canvas() {
    if (cv) return cx;
    cv = document.createElement('canvas'); cv.className = 'fxcanvas'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    const fit = () => { const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); };
    cx = cv.getContext('2d'); fit(); addEventListener('resize', fit);
    return cx;
  }
  function loop() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      const a = Math.min(1, p.life / 20);
      cx.save(); cx.globalAlpha = a; cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c;
      if (p.kind === 'spark') { cx.beginPath(); cx.moveTo(0, -p.s); cx.lineTo(p.s * 0.35, 0); cx.lineTo(0, p.s); cx.lineTo(-p.s * 0.35, 0); cx.closePath(); cx.fill(); }
      else if (p.kind === 'dot') { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, 7); cx.fill(); }
      else cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0, 0, innerWidth, innerHeight), 0);
  }
  function emit(list) { if (reduced()) return; canvas(); parts.push(...list); if (!raf) raf = requestAnimationFrame(loop); }
  const COLORS = ['#FFB000', '#FFD25A', '#1F9D55', '#3E8FCB', '#7A4FD6', '#E5484D', '#FFFFFF'];
  function burst(x, y, { n = 22, colors = ['#FFB000', '#FFE9A8', '#1F9D55'], speed = 5, kind = 'spark' } = {}) {
    emit(Array.from({ length: n }, () => { const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random()); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: 0.12, drag: 0.96, s: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, life: 38 + Math.random() * 22, c: colors[Math.floor(Math.random() * colors.length)], kind }; }));
  }
  function burstAt(el, opts) { if (!el) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, opts); }
  function confetti(n = 110) {
    emit(Array.from({ length: n }, (_, i) => ({ x: innerWidth * (i % 2 ? 0.15 : 0.85), y: innerHeight * 0.35, vx: (i % 2 ? 1 : -1) * (2 + Math.random() * 6), vy: -6 - Math.random() * 8, g: 0.22, drag: 0.985, s: 8 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 110 + Math.random() * 60, c: COLORS[Math.floor(Math.random() * COLORS.length)], kind: Math.random() < 0.3 ? 'dot' : 'rect' })));
  }
  // Animaciones CSS de un disparo: se quita la clase y se vuelve a poner para poder repetirlas
  function anim(el, cls) { if (!el || reduced()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener('animationend', () => el.classList.remove(cls), { once: true }); }
  // Contador que sube con un tic por paso
  function countUp(el, to, { from = 0, ms = 700, prefix = '+', sfx = true } = {}) {
    if (!el) return; if (reduced() || to <= from) { el.textContent = prefix + to; return; }
    const t0 = performance.now(); let last = from;
    const f = now => { const k = Math.min(1, (now - t0) / ms), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (v !== last) { last = v; el.textContent = prefix + v; sfx && sound('tick'); } if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  return { sound, burst, burstAt, confetti, anim, countUp, reduced, setSound(v) { on = !!v; }, get soundOn() { return on; } };
})();

/* ===================== MASCOTA ===================== */
/* Chispa vive siempre en pantalla: flota, parpadea, mira a los lados y reacciona a los aciertos
   y fallos. Si la tocas te da una pista del ejercicio (o un consejo fuera de las lecciones). */
const Mascot = (() => {
  let el = null, bubble = null, hideT = 0, provider = null, enabled = true, idleT = 0;
  function svg() {
    return `<svg viewBox="0 0 90 110" class="cg" aria-hidden="true"><defs><radialGradient id="cgm" cx="45%" cy="35%" r="65%"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#FFB000"/></radialGradient></defs>
      <circle class="cg-glow" cx="45" cy="45" r="42" fill="#FFB000" opacity=".22"/>
      <g class="cg-body"><path d="M15 78V42a30 30 0 0 1 60 0v36z" fill="url(#cgm)"/><path d="M24 40a21 21 0 0 1 16 -19" stroke="#fff" stroke-opacity=".55" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g class="cg-face"><g class="cg-eyes"><ellipse class="cg-eye" cx="34" cy="46" rx="4" ry="4.6" fill="#1B1300"/><ellipse class="cg-eye" cx="56" cy="46" rx="4" ry="4.6" fill="#1B1300"/><circle cx="35.4" cy="44.4" r="1.4" fill="#fff"/><circle cx="57.4" cy="44.4" r="1.4" fill="#fff"/></g>
      <path class="cg-mouth" d="M36 57q9 9 18 0" stroke="#1B1300" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="27" cy="55" rx="4" ry="2.4" fill="#FF7A59" opacity=".45"/><ellipse cx="63" cy="55" rx="4" ry="2.4" fill="#FF7A59" opacity=".45"/></g>
      <rect x="10" y="74" width="70" height="9" rx="3" fill="#E08A00"/></g>
      <g class="cg-legs"><path class="cg-leg1" d="M33 83v22" stroke="#8A94A8" stroke-width="4" stroke-linecap="round"/><path class="cg-leg2" d="M57 83v16" stroke="#8A94A8" stroke-width="4" stroke-linecap="round"/></g></svg>`;
  }
  const MOUTH = { happy: 'M36 57q9 9 18 0', sad: 'M37 61q8 -6 16 0', think: 'M38 60h12', wow: 'M41 58a4 5 0 1 0 8 0a4 5 0 1 0 -8 0' };
  function mood(m) { if (!el) return; el.dataset.mood = m; const p = el.querySelector('.cg-mouth'); p && p.setAttribute('d', MOUTH[m] || MOUTH.happy); }
  function mount() {
    if (el) return;
    el = document.createElement('button'); el.className = 'mascot'; el.setAttribute('aria-label', 'Chispa, tu mascota: tócala para pedir una pista');
    el.innerHTML = svg();
    bubble = document.createElement('div'); bubble.className = 'mbubble'; bubble.setAttribute('role', 'status'); bubble.hidden = true;
    document.body.append(el, bubble);
    el.addEventListener('click', tap);
    bubble.addEventListener('click', () => hide());
    setInterval(() => { if (!el || el.hidden || Fx.reduced()) return; if (Math.random() < 0.35) Fx.anim(el, 'look'); }, 4200);
    place();
  }
  // Dentro de una lección, Chispa se sienta en la barra superior; fuera, flota sobre la navegación.
  function place() {
    if (!el) return;
    const lesson = document.querySelector('.lesson:last-of-type');
    el.hidden = !enabled; el.classList.toggle('inlesson', !!lesson);
    if (!enabled) hide();
  }
  function tap() {
    Fx.sound('chirp'); Fx.anim(el, 'jump'); clearTimeout(idleT);
    const r = provider ? provider() : null;
    if (r && r.text) say(r.text, r.mood || 'think', r.ms || 7000, r.title);
  }
  function say(text, m = 'happy', ms = 5000, title) {
    if (!el || !enabled) return;
    mood(m); bubble.innerHTML = (title ? `<b>${title}</b>` : '') + `<span>${text}</span><small>Toca para cerrar</small>`;
    bubble.hidden = false; bubble.classList.toggle('inlesson', el.classList.contains('inlesson'));
    Fx.anim(bubble, 'pop'); Fx.sound('hint');
    clearTimeout(hideT); hideT = setTimeout(hide, ms);
  }
  function hide() { if (bubble) bubble.hidden = true; clearTimeout(hideT); if (el) mood('happy'); }
  // Reacciones a lo que pasa en la lección
  function react(kind) {
    if (!el || !enabled) return;
    hide();
    if (kind === 'right') { mood('happy'); Fx.anim(el, 'jump'); }
    else if (kind === 'wrong') { mood('sad'); Fx.anim(el, 'droop'); idleT = setTimeout(() => mood('think'), 900); }
    else if (kind === 'party') { mood('wow'); Fx.anim(el, 'spin'); }
    else mood(kind);
  }
  return { mount, place, say, hide, react, mood, set provider(fn) { provider = fn; }, setEnabled(v) { enabled = !!v; place(); }, get el() { return el; } };
})();
