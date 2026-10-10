/* Voltio · curso base, módulo 9: Alterna a fondo
   Lote 3. VIZ propias: xl, phasor, probeComp, riseTime, filter2, pfTriangle, xfmr (zTriangle y lcResonance ya existen).
   Generadores m7b_*. Los conceptos que solo usa este módulo se amplían o se crean aquí. */
(() => {
  const { num, fR, fV, st, hbar, flowPath } = Widgets.H;
  const fH = f => f >= 1e6 ? num(f / 1e6, 2) + ' MHz' : f >= 1000 ? num(f / 1000, 2) + ' kHz' : num(f, 0) + ' Hz';
  const fT = s => s >= 1e-3 ? num(s * 1000, 2) + ' ms' : s >= 1e-6 ? num(s * 1e6, 2) + ' µs' : num(s * 1e9, 1) + ' ns';
  const lin = pts => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const coil = (x, y, n, vert) => { let d = `M${x} ${y}`; for (let i = 0; i < n; i++) d += vert ? 'a6 5 0 0 1 0 10' : 'a5 6 0 0 1 10 0'; return `<path d="${d}" ${st}/>`; };
  const arrow = (x1, y1, x2, y2, col, w = 3) => { const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return ''; const h = Math.min(9, L / 2); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}M${(x2 - h * Math.cos(a - 0.4)).toFixed(1)} ${(y2 - h * Math.sin(a - 0.4)).toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${(x2 - h * Math.cos(a + 0.4)).toFixed(1)} ${(y2 - h * Math.sin(a + 0.4)).toFixed(1)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`; };
  const F2 = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 100000];

  /* ================= VISUALIZACIONES ================= */
  Object.assign(Widgets.VIZ, {
    // Reactancia de una bobina con un generador de 5 V eficaces
    xl: {
      calc: p => { const XL = 2 * Math.PI * p.f * p.L * 1e-3; return { XL, ImA: 5 / XL * 1000 }; },
      svg: (p, o) => `<svg viewBox="0 0 300 190" class="viz">${flowPath('M60 65V30H200', Math.min(o.ImA, 5000) / 1000, 0.002)}${flowPath('M240 30H255V130H60V97', Math.min(o.ImA, 5000) / 1000, 0.002)}
        <circle cx="60" cy="81" r="16" ${st}/><path d="M50 81q5 -10 10 0t10 0" ${st}/><text x="20" y="85" class="vizsm">5 V</text>${coil(200, 30, 4)}
        <text x="220" y="54" text-anchor="middle" class="vizsm">${num(p.L, 2)} mH</text>
        <text x="150" y="16" text-anchor="middle" class="vizlab">${fH(p.f)} · corriente ${o.ImA >= 1000 ? num(o.ImA / 1000, 2) + ' A' : o.ImA >= 1 ? num(o.ImA, 1) + ' mA' : num(o.ImA * 1000, 0) + ' µA'}</text>
        ${hbar(30, 176, 240, (Math.log10(o.XL) + 2) / 8, 'var(--led)', `XL = ${fR(o.XL)} (escala logarítmica)`)}</svg>`
    },
    // Fasores que giran: la tensión de R va con la corriente, la de X a 90°
    phasor: {
      calc: p => { const Z = Math.hypot(p.R, p.X), phi = Math.atan2(p.X, p.R) * 180 / Math.PI; return { Z, phi, aphi: Math.abs(phi) }; },
      anim: true,
      svg: (p, o, t) => {
        const cx = 75, cy = 95, s = 58 / Math.max(o.Z, 1), th = -t * 1.6, ph = o.phi * Math.PI / 180;
        const ux = Math.cos(th), uy = Math.sin(th), vx = Math.cos(th - Math.PI / 2), vy = Math.sin(th - Math.PI / 2);
        const xr = cx + p.R * s * ux, yr = cy + p.R * s * uy, xt = xr + p.X * s * vx, yt = yr + p.X * s * vy;
        const I = [], V = []; for (let i = 0; i <= 100; i++) { const a = i / 100 * 4 * Math.PI; I.push([160 + i * 1.3, 95 - 40 * Math.sin(a)]); V.push([160 + i * 1.3, 95 - 55 * Math.sin(a + ph)]); }
        return `<svg viewBox="0 0 300 190" class="viz"><circle cx="${cx}" cy="${cy}" r="60" fill="none" stroke="var(--line)"/><path d="M155 95H292" stroke="var(--line)"/>
          ${arrow(cx, cy, xr, yr, 'var(--ice)')}${arrow(xr, yr, xt, yt, 'var(--ok)')}${arrow(cx, cy, xt, yt, 'var(--led)', 3.5)}
          <polyline points="${lin(I)}" fill="none" stroke="var(--ice)" stroke-width="2"/><polyline points="${lin(V)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="10" y="18" class="vizlab">Z = ${fR(o.Z)} · φ = ${num(o.phi, 0)}°</text>
          <text x="10" y="172" class="vizsm" style="fill:var(--ice)">azul: R (con la corriente)</text><text x="10" y="186" class="vizsm" style="fill:var(--ok)">verde: X (a 90°)</text>
          <text x="160" y="172" class="vizsm" style="fill:var(--led)">ámbar: tensión total</text><text x="160" y="186" class="vizsm">${o.phi > 1 ? 'la tensión va por delante' : o.phi < -1 ? 'la tensión va por detrás' : 'tensión y corriente juntas'}</text></svg>`;
      }
    },
    // Compensar una sonda ×10: k = 1 es la compensación correcta
    probeComp: {
      calc: p => ({ k: p.k, err: Math.abs(p.k - 1) }),
      svg: (p, o) => {
        const pts = []; for (let i = 0; i <= 240; i++) { const ph = (i % 120) / 120, hi = ph < 0.5, tt = (hi ? ph : ph - 0.5) * 120, lvl = hi ? 1 : 0, sgn = hi ? 1 : -1; const v = lvl + sgn * (p.k - 1) * Math.exp(-tt / 12); pts.push([30 + i, 120 - 70 * v]); }
        const msg = o.err <= 0.025 ? 'Bien compensada: esquinas rectas' : p.k > 1 ? 'Sobrecompensada: picos en las esquinas' : 'Subcompensada: esquinas redondeadas';
        return `<svg viewBox="0 0 300 180" class="viz"><rect x="25" y="20" width="250" height="125" fill="var(--board)" opacity=".9"/><path d="M25 120H275M25 50H275" stroke="#2A3755"/>
          <polyline points="${lin(pts)}" fill="none" stroke="var(--ok)" stroke-width="2.4"/>
          <text x="25" y="164" class="vizlab" style="fill:${o.err <= 0.025 ? 'var(--ok)' : 'currentColor'}">${msg}</text><text x="25" y="178" class="vizsm">cuadrada de 1 kHz de prueba del propio osciloscopio</text></svg>`;
      }
    },
    // Tiempo de subida del 10 % al 90 % en un RC
    riseTime: {
      calc: p => { const tau = p.R * p.C * 1e-9, tr = 2.2 * tau; return { tau, tr, trus: tr * 1e6 }; },
      svg: (p, o) => {
        const X = k => 40 + 48 * k, Y = v => 140 - 110 * v, pts = []; for (let i = 0; i <= 100; i++) { const k = i / 20; pts.push([X(k), Y(1 - Math.exp(-k))]); }
        const a = X(0.105), b = X(2.303);
        return `<svg viewBox="0 0 300 185" class="viz"><path d="M40 25V140H285" ${st} stroke-width="1.4"/><polyline points="${lin(pts)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <path d="M40 ${Y(0.1)}H285M40 ${Y(0.9)}H285" stroke="var(--muted)" stroke-dasharray="3 4"/><text x="36" y="${Y(0.1) + 4}" text-anchor="end" class="vizsm">10 %</text><text x="36" y="${Y(0.9) + 4}" text-anchor="end" class="vizsm">90 %</text>
          <path d="M${a.toFixed(1)} 152H${b.toFixed(1)}" stroke="var(--ice)" stroke-width="2.5"/><path d="M${a.toFixed(1)} 146v12M${b.toFixed(1)} 146v12" stroke="var(--ice)" stroke-width="2"/>
          <text x="${((a + b) / 2).toFixed(1)}" y="170" text-anchor="middle" class="vizlab">tr = 2,2 · R · C = ${fT(o.tr)}</text><text x="44" y="18" class="vizsm">R = ${fR(p.R)} · C = ${num(p.C, 1)} nF · τ = ${fT(o.tau)}</text></svg>`;
      }
    },
    // Filtros de segundo orden con f₀ = 1 kHz: paso bajo (1), paso banda (2), banda eliminada (3)
    filter2: {
      calc: p => {
        const H = f => { const x = f / 1000, d = Math.hypot(1 - x * x, x / p.Q); return p.t === 2 ? (x / p.Q) / d : p.t === 3 ? Math.abs(1 - x * x) / d : 1 / d; };
        let pk = 0; for (let i = 0; i <= 200; i++) pk = Math.max(pk, H(10 ** (1 + 4 * i / 200)));
        const g = H(p.f); return { dB: Math.max(-80, 20 * Math.log10(Math.max(g, 1e-6))), peak: 20 * Math.log10(pk), bw: 1000 / p.Q };
      },
      svg: (p, o) => {
        const H = f => { const x = f / 1000, d = Math.hypot(1 - x * x, x / p.Q); return p.t === 2 ? (x / p.Q) / d : p.t === 3 ? Math.abs(1 - x * x) / d : 1 / d; };
        const X = f => 45 + 60 * (Math.log10(f) - 1), Y = d => 40 + 1.5 * Math.min(66, Math.max(-20, -d)), pts = [], rc = [];
        for (let i = 0; i <= 160; i++) { const f = 10 ** (1 + 4 * i / 160); pts.push([X(f), Y(20 * Math.log10(Math.max(H(f), 1e-6)))]); rc.push([X(f), Y(-10 * Math.log10(1 + (f / 1000) ** 2))]); }
        const name = ['Paso bajo de 2.º orden', 'Paso banda', 'Banda eliminada'][p.t - 1];
        return `<svg viewBox="0 0 300 195" class="viz"><path d="M45 15V140H285" ${st} stroke-width="1.4"/>
          ${[0, -20, -40, -60].map(d => `<text x="40" y="${Y(d) + 4}" text-anchor="end" class="vizsm">${d}</text><path d="M45 ${Y(d)}H285" stroke="var(--line)" stroke-width=".6"/>`).join('')}
          ${[100, 1000, 10000].map(f => `<text x="${X(f)}" y="153" text-anchor="middle" class="vizsm">${fH(f)}</text>`).join('')}
          ${p.t === 1 ? `<polyline points="${lin(rc)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>` : ''}
          <polyline points="${lin(pts)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <circle cx="${X(p.f).toFixed(1)}" cy="${Y(o.dB).toFixed(1)}" r="6" fill="var(--ice)"/>
          <text x="10" y="172" class="vizlab">${name} · Q = ${num(p.Q, 3)}${p.t === 1 && o.peak > 0.1 ? ` · pico de ${num(o.peak, 1)} dB` : ''}</text>
          <text x="10" y="188" class="vizsm">a ${fH(p.f)}: ${o.dB <= -79 ? 'eliminada del todo' : num(o.dB, 1) + ' dB'}${p.t === 1 ? ' · discontinua: un RC simple' : ' · ancho de banda ' + fH(o.bw)}</text></svg>`;
      }
    },
    // Triángulo de potencias
    pfTriangle: {
      calc: p => { const S = Math.hypot(p.P, p.Q), pf = S ? p.P / S : 1; return { S, pf, I: S / 230 }; },
      svg: (p, o) => {
        const s = 150 / Math.max(p.P, p.Q, 1), x0 = 40, y0 = 150, x1 = x0 + p.P * s, y1 = y0 - p.Q * s;
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M${x0} ${y0}H${x1.toFixed(1)}" stroke="var(--led)" stroke-width="5"/><path d="M${x1.toFixed(1)} ${y0}V${y1.toFixed(1)}" stroke="var(--ice)" stroke-width="5"/><path d="M${x0} ${y0}L${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="currentColor" stroke-width="3"/>
          <text x="${((x0 + x1) / 2).toFixed(1)}" y="${y0 + 18}" text-anchor="middle" class="vizsm">P activa ${num(p.P, 0)} W</text>
          <text x="${Math.min(x1 + 8, 230).toFixed(1)}" y="${((y0 + y1) / 2).toFixed(1)}" class="vizsm">Q ${num(p.Q, 0)} var</text>
          <text x="10" y="18" class="vizlab">S = ${num(o.S, 0)} VA · cos φ = ${num(o.pf, 2)}</text><text x="10" y="36" class="vizsm">a 230 V circulan ${num(o.I, 2)} A</text></svg>`;
      }
    },
    // Transformador: vueltas, tensiones y corrientes
    xfmr: {
      calc: p => { const Vs = p.Vp * p.Ns / p.Np, Is = p.Is || 1; return { Vs, Ip: Is * p.Ns / p.Np, n: p.Np / p.Ns }; },
      svg: (p, o) => {
        const n1 = Math.max(2, Math.min(9, Math.round(Math.log2(p.Np / 12)) + 1)), n2 = Math.max(2, Math.min(9, Math.round(Math.log2(p.Ns / 12)) + 1)), Is = p.Is || 1;
        return `<svg viewBox="0 0 300 190" class="viz"><rect x="105" y="25" width="90" height="120" rx="6" fill="none" stroke="var(--muted)" stroke-width="10" opacity=".55"/>
          ${coil(100, 85 - n1 * 5, n1, 1)}${coil(200, 85 - n2 * 5, n2, 1)}<path d="M100 ${85 - n1 * 5}H40M100 ${85 + n1 * 5}H40M200 ${85 - n2 * 5}H260M200 ${85 + n2 * 5}H260" ${st}/>
          <path d="M130 50Q150 40 170 50M130 120Q150 130 170 120" stroke="var(--ice)" stroke-width="2" fill="none" class="a-flow-slow"/>
          <text x="40" y="20" class="vizlab">${fV(p.Vp)}</text><text x="40" y="160" class="vizsm">${p.Np} vueltas</text><text x="40" y="176" class="vizsm">Ip = ${num(o.Ip, 3)} A</text>
          <text x="260" y="20" text-anchor="end" class="vizlab">${fV(o.Vs)}</text><text x="260" y="160" text-anchor="end" class="vizsm">${p.Ns} vueltas</text><text x="260" y="176" text-anchor="end" class="vizsm">Is = ${num(Is, 1)} A</text>
          <text x="150" y="186" text-anchor="middle" class="vizsm">${o.Vs > p.Vp ? 'elevador' : o.Vs < p.Vp ? 'reductor' : '1:1'}</text></svg>`;
      }
    }
  });

  /* ================= GENERADORES (con pista) ================= */
  const { pick, fmt, fR: gR, MC, N } = Gen.helpers;
  const eng = (x, u) => { const e = Math.max(-9, Math.min(6, Math.floor(Math.log10(Math.abs(x)) / 3) * 3)); return fmt(Number((x / 10 ** e).toPrecision(3)), 3) + ' ' + { '-9': 'n', '-6': 'µ', '-3': 'm', '0': '', '3': 'k', '6': 'M' }[e] + u; };
  Gen.add('m7b_xl', () => {
    let f, L, x; do { f = pick([50, 1000, 10000, 100000, 1e6]); L = pick([1e-6, 10e-6, 100e-6, 1e-3, 10e-3, 100e-3]); x = 2 * Math.PI * f * L; } while (x < 0.5 || x > 2e5);
    return MC(`¿Qué reactancia tiene una bobina de ${eng(L, 'H')} a ${eng(f, 'Hz')}?`, eng(x, 'Ω'), [eng(x / (2 * Math.PI), 'Ω'), eng(1 / x, 'Ω'), eng(x * 1000, 'Ω'), eng(x / 1000, 'Ω')], `XL = 2π · f · L = 2π × ${eng(f, 'Hz')} × ${eng(L, 'H')} ≈ ${eng(x, 'Ω')}.`, { h: 'XL = 2π · f · L, con f en Hz y L en henrios. No olvides el 2π.' });
  }, 'ba_xl');
  Gen.add('m7b_z', () => {
    const [r, x] = pick([[3, 4], [6, 8], [30, 40], [300, 400], [120, 160], [50, 120], [100, 100], [80, 60], [500, 1200], [200, 150]]), k = pick([1, 10]), R = r * k, X = x * k, Z = Math.hypot(R, X), bob = Math.random() < 0.5;
    if (Math.random() < 0.55) return MC(`Una resistencia de ${gR(R)} en serie con ${bob ? 'una bobina' : 'un condensador'} de reactancia ${gR(X)}. ¿Impedancia total?`, gR(Math.round(Z * 10) / 10), [gR(R + X), gR(Math.abs(X - R)), gR(Math.round(R * X / (R + X) * 10) / 10)], `Las tensiones de R y de X están a 90°: se combinan como los catetos de un triángulo. Z = √(R² + X²) = ${gR(Math.round(Z * 10) / 10)}.`, { h: 'No sumes R y X: usa Pitágoras, Z = √(R² + X²).' });
    const ph = Math.atan2(X, R) * 180 / Math.PI;
    return { ...N(`R = ${gR(R)} y ${bob ? 'XL' : 'XC'} = ${gR(X)} en serie. ¿Desfase entre tensión y corriente, en grados (sin signo)?`, ph, '°', `φ = arctan(X / R) = arctan(${fmt(X / R, 3)}) ≈ ${fmt(ph, 1)}°.`, 1), h: 'φ = arctan(X / R): el ángulo del triángulo de impedancias.' };
  }, 'impedance');
  Gen.add('m7b_rise', () => {
    if (Math.random() < 0.5) { const bw = pick([10e6, 20e6, 50e6, 100e6, 200e6]), tr = 0.35 / bw * 1e9; return { ...N(`Un osciloscopio tiene ${eng(bw, 'Hz')} de ancho de banda. ¿Tiempo de subida propio aproximado, en ns?`, tr, 'ns', `tr ≈ 0,35 / BW = ${fmt(tr, 2)} ns.`, tr * 0.03), h: 'tr ≈ 0,35 / ancho de banda, con el ancho de banda en Hz.' }; }
    const R = pick([1000, 10000, 100000]), C = pick([10e-12, 100e-12, 1e-9, 10e-9]), tr = 2.2 * R * C;
    return { ...N(`Un RC con ${gR(R)} y ${eng(C, 'F')}. ¿Tiempo de subida del 10 % al 90 %, en µs?`, tr * 1e6, 'µs', `tr = 2,2 · R · C = 2,2 × ${R} × ${eng(C, 'F')} = ${eng(tr, 's')}.`, tr * 1e6 * 0.03), h: 'tr = 2,2 · R · C; pasa el resultado a microsegundos.' };
  }, 'ba_rise');
  Gen.add('m7b_phase', () => {
    const f = pick([50, 100, 500, 1000, 2000]), T = 1000 / f, frac = pick([1 / 8, 1 / 6, 1 / 4, 1 / 3, 1 / 2]), dt = T * frac;
    return { ...N(`Dos senoides de ${f} Hz; la segunda cruza el cero ${fmt(dt, 3)} ms después que la primera. ¿Desfase, en grados?`, 360 * frac, '°', `T = ${fmt(T, 3)} ms; φ = 360° · Δt / T = 360 × ${fmt(dt, 3)} / ${fmt(T, 3)} = ${fmt(360 * frac, 1)}°.`, 1), h: 'Calcula el periodo y mira qué fracción de él es el retraso: esa fracción de 360°.' };
  }, 'ba_phasemeas');
  Gen.add('m7b_f0', () => {
    const L = pick([10e-6, 47e-6, 100e-6, 220e-6, 1e-3, 10e-3]), C = pick([100e-12, 220e-12, 1e-9, 10e-9, 100e-9, 1e-6]), f = 1 / (2 * Math.PI * Math.sqrt(L * C));
    return MC(`Bobina de ${eng(L, 'H')} y condensador de ${eng(C, 'F')}. ¿Frecuencia de resonancia?`, eng(f, 'Hz'), [eng(1 / Math.sqrt(L * C), 'Hz'), eng(1 / (2 * Math.PI * L * C), 'Hz'), eng(f * 1000, 'Hz'), eng(f / 1000, 'Hz')], `f₀ = 1 / (2π · √(L · C)) ≈ ${eng(f, 'Hz')}.`, { h: 'Multiplica L por C, haz la raíz, multiplica por 2π y calcula el inverso.' });
  }, 'ba_f0');
  Gen.add('m7b_q', () => {
    if (Math.random() < 0.5) { const XL = pick([200, 500, 1000, 1500, 2000]), R = pick([5, 10, 20, 50]); return { ...N(`RLC serie en resonancia: XL = ${gR(XL)} y R = ${gR(R)}. ¿Factor de calidad Q?`, XL / R, '', `Q = XL / R = ${fmt(XL / R)}.`, XL / R * 0.02), h: 'Q = XL / R en resonancia.' }; }
    const f0 = pick([455e3, 1e6, 10.7e6, 7e6, 100e3]), Q = pick([10, 20, 50, 100]); return { ...N(`Un circuito resuena a ${eng(f0, 'Hz')} con Q = ${Q}. ¿Ancho de banda, en kHz?`, f0 / Q / 1000, 'kHz', `BW = f₀ / Q = ${eng(f0 / Q, 'Hz')}.`, f0 / Q / 1000 * 0.02), h: 'BW = f₀ / Q; pasa el resultado a kHz.' };
  }, 'ba_q');
  Gen.add('m7b_bw', () => {
    const f0 = pick([1000, 5000, 10000, 50000, 100000]), Q = pick([2, 5, 10, 20]);
    return { ...N(`Un filtro paso banda centrado en ${eng(f0, 'Hz')} tiene Q = ${Q}. ¿Ancho de banda, en Hz?`, f0 / Q, 'Hz', `BW = f₀ / Q = ${fmt(f0 / Q)} Hz: deja pasar más o menos de ${fmt(f0 - f0 / Q / 2)} a ${fmt(f0 + f0 / Q / 2)} Hz.`, f0 / Q * 0.02), h: 'El ancho de banda es la frecuencia central dividida entre Q.' };
  }, 'ba_bandpass');
  Gen.add('m7b_pf', () => {
    const I = pick([0.5, 1, 2, 4, 5]), pf = pick([0.5, 0.6, 0.8, 0.9]), P = 230 * I * pf;
    if (Math.random() < 0.5) return MC(`Un aparato a 230 V consume ${fmt(I)} A eficaces con factor de potencia ${fmt(pf)}. ¿Potencia activa?`, `${fmt(P, 0)} W`, [`${fmt(230 * I, 0)} W`, `${fmt(230 * I / pf, 0)} W`, `${fmt(P * pf, 0)} W`], `P = V · I · cos φ = ${fmt(P, 0)} W. V · I = ${fmt(230 * I, 0)} VA es la aparente.`, { h: 'Activa = tensión × corriente × factor de potencia.' });
    return { ...N(`Un aparato a 230 V consume ${fmt(I)} A eficaces. ¿Potencia aparente, en VA?`, 230 * I, 'VA', `S = V · I = ${fmt(230 * I, 0)} VA, sea cual sea el factor de potencia.`, 1), h: 'La aparente es simplemente tensión eficaz por corriente eficaz.' };
  }, 'ba_pf');
  Gen.add('m7b_xfmr', () => {
    const [Np, Ns] = pick([[1000, 50], [2000, 100], [920, 48], [1150, 60], [500, 100], [100, 500]]), Vp = pick([230, 12, 24]), Vs = Vp * Ns / Np;
    return { ...N(`Transformador con ${Np} vueltas en el primario y ${Ns} en el secundario. Al primario llegan ${Vp} V. ¿Tensión en el secundario, en V?`, Vs, 'V', `Vs = Vp · Ns / Np = ${Vp} × ${Ns} / ${Np} = ${fmt(Vs, 2)} V.`, Math.max(0.02, Vs * 0.01)), h: 'La tensión se reparte igual que las vueltas: Vs / Vp = Ns / Np.' };
  }, 'ba_xfmr');

  /* ================= SVG DE LAS TARJETAS ================= */
  const S = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" class="viz">${inner}</svg>`;
  const t = (x, y, s, cls = 'vizsm', a = 'middle', more = '') => `<text x="${x}" y="${y}" text-anchor="${a}" class="${cls}" ${more}>${s}</text>`;
  const sn = (x0, w, y0, a, ph = 0, n = 2) => { const q = []; for (let i = 0; i <= 120; i++) q.push([x0 + w * i / 120, y0 - a * Math.sin(2 * Math.PI * n * i / 120 + ph)]); return lin(q); };
  const xlvsSVG = S(300, 150, `<path d="M30 120H280M30 120V20" stroke="currentColor" stroke-width="1.5"/><path d="M30 120L270 30" stroke="var(--led)" stroke-width="3"/><path d="M40 25Q60 110 270 115" stroke="var(--ice)" stroke-width="3" fill="none"/>${t(250, 45, 'XL = 2π · f · L', 'vizsm', 'end', 'style="fill:var(--led)"')}${t(260, 105, 'Xc', 'vizsm', 'end', 'style="fill:var(--ice)"')}${t(275, 138, 'frecuencia →', 'vizsm', 'end')}${t(35, 16, 'reactancia', 'vizsm', 'start')}`);
  const chokeSVG = S(300, 120, `<path d="M20 60H100M180 60H280" ${st}/>${coil(100, 60, 8)}<rect x="210" y="45" width="40" height="30" rx="8" fill="var(--muted)" opacity=".5"/><path d="M20 60H100" class="a-flow-slow" stroke="var(--led)" stroke-width="2"/>${t(140, 112, 'continua: pasa · ruido rápido: frenado')}${t(230, 92, 'ferrita', 'vizsm')}`);
  const phaseSVG = S(300, 150, `<path d="M20 70H285" stroke="var(--line)"/><polyline points="${sn(20, 265, 70, 40)}" fill="none" stroke="var(--ice)" stroke-width="2.5"/><polyline points="${sn(20, 265, 70, 50, Math.PI / 2)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>${t(20, 140, 'condensador: la corriente (azul) va 90° por delante', 'vizsm', 'start')}${t(20, 16, 'CIVIL: en C, I antes que V · en L, V antes que I', 'vizlab', 'start')}`);
  const fcSVG = S(300, 140, `<path d="M40 110H200" stroke="var(--led)" stroke-width="5"/><path d="M200 110V30" stroke="var(--ice)" stroke-width="5"/><path d="M40 110L200 30" stroke="currentColor" stroke-width="3"/>${t(120, 130, 'R = 1 kΩ')}${t(208, 74, 'Xc = 1 kΩ', 'vizsm', 'start')}${t(90, 62, '1414 Ω', 'vizlab')}${t(70, 102, '45°', 'vizsm')}`);
  const matchSVG = S(300, 130, `<path d="M40 100L60 20L80 100M60 20V100" ${st}/>${t(60, 118, 'antena 50 Ω')}<path d="M80 100H190" stroke="currentColor" stroke-width="4"/>${t(135, 90, 'cable de 50 Ω')}<rect x="190" y="70" width="80" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="2"/>${t(230, 98, 'receptor')}${t(230, 112, 'entrada 50 Ω')}${t(150, 20, 'mismas impedancias: se aprovecha toda la señal', 'vizsm')}`);
  const x10SVG = S(300, 130, `<path d="M20 60H70M110 60H180M220 60V40M220 80V110" ${st}/><rect x="70" y="52" width="40" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>${t(90, 44, '9 MΩ')}<rect x="212" y="40" width="16" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>${t(240, 64, '1 MΩ', 'vizsm', 'start')}<path d="M180 60H220" ${st}/>${t(45, 50, 'punta')}${t(90, 90, 'en la sonda')}${t(292, 105, 'en el osciloscopio', 'vizsm', 'end')}${t(150, 125, '1 / (9 + 1) = la décima parte')}`);
  const compSVG = S(300, 120, `${[['sub', 'M10 90C20 40 30 40 80 40V90'], ['bien', 'M110 90V40H180V90'], ['sobre', 'M210 90V25Q215 40 280 40V90']].map(([n, d], i) => `<path d="${d}" fill="none" stroke="var(--ok)" stroke-width="2.4"/>${t(45 + i * 100, 110, n === 'sub' ? 'redondeada' : n === 'bien' ? 'plana' : 'con pico')}`).join('')}${t(150, 16, 'gira el tornillo de la sonda hasta dejarla plana')}`);
  const dtSVG = S(300, 150, `<path d="M20 70H285" stroke="var(--line)"/><polyline points="${sn(20, 265, 70, 45)}" fill="none" stroke="var(--ice)" stroke-width="2.5"/><polyline points="${sn(20, 265, 70, 45, -Math.PI / 2)}" fill="none" stroke="var(--led)" stroke-width="2.5"/><path d="M20 120H53" stroke="currentColor" stroke-width="2.5"/><path d="M20 114v12M53 114v12" stroke="currentColor"/>${t(36, 140, 'Δt')}${t(200, 140, 'φ = 360° · Δt / T', 'vizlab')}`);
  const crossSVG = S(300, 150, `<path d="M30 125H285M30 125V15" stroke="currentColor" stroke-width="1.5"/><path d="M30 125L270 25" stroke="var(--led)" stroke-width="3"/><path d="M40 20Q70 115 270 120" stroke="var(--ice)" stroke-width="3" fill="none"/><circle cx="117" cy="89" r="6" fill="var(--ok)" class="a-pulse"/><path d="M117 89V125" stroke="var(--ok)" stroke-dasharray="3 3"/>${t(117, 140, 'f₀: XL = XC')}${t(262, 40, 'XL', 'vizsm', 'end', 'style="fill:var(--led)"')}${t(270, 112, 'XC', 'vizsm', 'end', 'style="fill:var(--ice)"')}`);
  const swingSVG = S(300, 130, `<path d="M70 30v30M58 42h24M58 50h24M70 60v30" stroke="currentColor" stroke-width="2.2"/>${coil(200, 35, 5, 1)}<path d="M70 30H200V35M70 90H200V85" ${st}/><rect x="56" y="38" width="28" height="18" fill="var(--led)" opacity=".5" class="a-fade"/><ellipse cx="200" cy="60" rx="22" ry="34" fill="none" stroke="var(--ice)" class="a-fade a-d4" stroke-width="2"/>${t(70, 110, 'energía en C')}${t(200, 110, 'energía en L')}${t(135, 20, 'va y viene, como un columpio')}`);
  const qSVG = S(300, 140, `<path d="M20 120H285" stroke="currentColor"/><path d="M20 118C120 116 140 20 152 20S180 116 285 118" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M20 118C100 112 120 60 152 60S200 112 285 118" fill="none" stroke="var(--ice)" stroke-width="2.5"/>${t(152, 14, 'Q alto: estrecho')}${t(225, 80, 'Q bajo: ancho', 'vizsm', 'start', 'style="fill:var(--ice)"')}${t(150, 136, 'BW = f₀ / Q')}`);
  const tankSVG = S(300, 130, `<rect x="15" y="15" width="130" height="80" rx="8" fill="none" stroke="var(--led)" stroke-width="2"/>${t(80, 32, 'LC en serie')}<path d="M25 60H50M70 60H80" ${st}/><path d="M50 48v24M58 48v24" stroke="currentColor" stroke-width="3"/>${coil(80, 60, 4)}<path d="M120 60H135" ${st}/>${t(80, 112, 'en f₀: casi un cable')}<rect x="155" y="15" width="130" height="80" rx="8" fill="none" stroke="var(--ice)" stroke-width="2"/>${t(220, 32, 'LC en paralelo')}<path d="M180 45v10M180 65v15M260 45V40H180M180 80H260V75" ${st}/><path d="M168 55h24M168 65h24" stroke="currentColor" stroke-width="3"/>${coil(260, 40, 3, 1)}${t(220, 112, 'en f₀: casi abierto')}`);
  const slope2SVG = S(300, 140, `<path d="M40 15V120H285" ${st} stroke-width="1.5"/><path d="M40 30H110L280 75" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="5 4" fill="none"/><path d="M40 30H110L280 118" stroke="var(--led)" stroke-width="3" fill="none"/>${t(275, 68, '−20 dB/déc', 'vizsm', 'end')}${t(250, 104, '−40 dB/déc', 'vizsm', 'end', 'style="fill:var(--led)"')}${t(110, 136, 'fc')}`);
  const qcurvesSVG = S(300, 140, `<path d="M40 15V120H285" ${st} stroke-width="1.5"/><path d="M40 45H100Q140 46 160 70L280 118" fill="none" stroke="var(--ice)" stroke-width="2"/><path d="M40 45H120Q150 45 165 60L280 112" fill="none" stroke="var(--ok)" stroke-width="2.5"/><path d="M40 45H120Q150 40 160 20Q168 50 180 70L280 108" fill="none" stroke="var(--err)" stroke-width="2"/>${t(200, 20, 'Q alto: pico', 'vizsm', 'start', 'style="fill:var(--err)"')}${t(200, 52, 'Q = 0,707: plano', 'vizsm', 'start', 'style="fill:var(--ok)"')}${t(60, 90, 'Q bajo: suave', 'vizsm', 'start', 'style="fill:var(--ice)"')}`);
  const bpSVG = S(300, 150, `<path d="M15 15V60H145M155 15V60H285M15 90V135H145M155 90V135H285" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M15 25H60Q70 25 80 50L145 58" stroke="var(--led)" stroke-width="2.4" fill="none"/>${t(80, 76, 'paso bajo')}<path d="M155 58Q205 58 220 20Q235 58 285 58" stroke="var(--led)" stroke-width="2.4" fill="none"/>${t(220, 76, 'paso banda')}<path d="M15 98Q65 98 80 133Q95 98 145 98" stroke="var(--led)" stroke-width="2.4" fill="none"/>${t(80, 148, 'banda eliminada')}<path d="M155 133H200Q210 133 220 108L285 98" stroke="var(--led)" stroke-width="2.4" fill="none"/>${t(220, 148, 'paso alto')}`);
  const pfWaveSVG = S(300, 140, `<path d="M20 70H285" stroke="var(--line)"/><polyline points="${sn(20, 265, 70, 50)}" fill="none" stroke="var(--led)" stroke-width="2.5"/><polyline points="${sn(20, 265, 70, 35, -0.7)}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>${t(20, 134, 'ámbar: tensión · azul: corriente retrasada (motor)', 'vizsm', 'start')}`);
  const triSVG = S(300, 140, `<path d="M40 110H220" stroke="var(--led)" stroke-width="5"/><path d="M220 110V30" stroke="var(--ice)" stroke-width="5"/><path d="M40 110L220 30" stroke="currentColor" stroke-width="3"/>${t(130, 130, 'activa P (W): la útil')}${t(228, 74, 'reactiva Q (var)', 'vizsm', 'start')}${t(100, 60, 'aparente S (VA)', 'vizsm', 'end')}${t(75, 104, 'φ', 'vizsm')}`);
  const meterPlugSVG = S(300, 120, `<rect x="110" y="15" width="80" height="90" rx="12" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="120" y="25" width="60" height="28" rx="4" fill="var(--ok)" opacity=".3"/>${t(150, 44, '920 W', 'vizlab')}${t(150, 70, 'cos φ 0,80')}<circle cx="138" cy="90" r="4" fill="currentColor"/><circle cx="162" cy="90" r="4" fill="currentColor"/>${t(150, 118, 'medidor de enchufe: mide sin abrir nada')}`);
  const xfSVG = S(300, 140, `<rect x="105" y="20" width="90" height="100" rx="6" fill="none" stroke="var(--muted)" stroke-width="10" opacity=".55"/>${coil(100, 40, 6, 1)}${coil(200, 55, 3, 1)}<path d="M100 40H40M100 100H40M200 55H260M200 85H260" ${st}/><path d="M130 45Q150 35 170 45M130 95Q150 105 170 95" stroke="var(--ice)" stroke-width="2" fill="none" class="a-flow-slow"/>${t(40, 130, 'primario', 'vizsm', 'start')}${t(260, 130, 'secundario', 'vizsm', 'end')}${t(150, 14, 'el campo que cambia une las dos bobinas')}`);
  const ratioSVG = S(300, 110, `${t(150, 40, 'Vs / Vp = Ns / Np', 'vizbig', 'middle', 'style="font-size:22px"')}${t(150, 70, '1000 vueltas → 50 vueltas: la tensión ÷ 20')}${t(150, 94, '230 V → 11,5 V')}`);
  const powSVG = S(300, 110, `${t(150, 36, 'Vp · Ip ≈ Vs · Is', 'vizbig', 'middle', 'style="font-size:22px"')}${t(150, 66, 'baja la tensión → sube la corriente')}${t(150, 90, '230 V × 0,1 A ≈ 11,5 V × 2 A')}`);

  /* ================= CONCEPTOS ================= */
  const base = k => CONCEPTS[k] ? CONCEPTS[k].alts : [];
  const xlP = (o = {}) => ({ L: { label: 'L', val: 1, list: [0.01, 0.1, 1, 10, 100], unit: 'mH', dec: 2 }, f: { label: 'Frecuencia', val: 1000, list: [50, 100, 500, 1000, 5000, 10000, 16000, 20000, 50000, 100000], unit: 'Hz', dec: 0 }, ...o });
  const phP = (o = {}) => ({ R: { label: 'R', val: 300, min: 0, max: 1000, step: 10, unit: 'Ω', dec: 0 }, X: { label: 'X (+ bobina, − condensador)', val: 0, min: -1000, max: 1000, step: 10, unit: 'Ω', dec: 0 }, ...o });
  const lcP = () => ({ L: { label: 'L', val: 220, list: [10, 22, 47, 100, 220, 470, 1000], unit: 'µH', dec: 0 }, C: { label: 'C (variable)', val: 400, min: 10, max: 1000, step: 5, unit: 'pF', dec: 0 }, R: { label: 'R', val: 47, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' } });
  const f2P = (o = {}) => ({ Q: { label: 'Q', val: 0.707, list: [0.5, 0.707, 1, 2, 5, 10], dec: 3 }, t: { label: 'Tipo (1 bajo, 2 banda, 3 eliminada)', val: 1, list: [1, 2, 3], dec: 0 }, f: { label: 'Frecuencia de la señal', val: 1000, list: F2, unit: 'Hz', dec: 0 }, ...o });
  Object.assign(CONCEPTS, {
    ba_xl: { name: 'Reactancia de la bobina', alts: [
      { title: 'Sube la frecuencia', text: 'Cuanto más rápido cambia la corriente, más se opone la bobina: <b>XL = 2π · f · L</b>. Al revés que el condensador.', tune: { viz: 'xl', params: xlP() }, q: mcq('Una bobina presenta 100 Ω a 1 kHz. ¿Y a 10 kHz?', ['1 kΩ', '10 Ω', '100 Ω', '10 kΩ'], 'Proporcional a f.') },
      ...base('ba_xl')
    ] },
    ba_phasor: { name: 'Desfase en bobinas y condensadores', alts: [
      { title: 'Flechas que giran', text: 'Un fasor es una flecha que gira; la senoide es su sombra. La tensión de R va en la dirección de la corriente; la de una reactancia, a 90°. Cambia X y mira cómo se adelanta o se retrasa la tensión total.', tune: { viz: 'phasor', params: phP({ X: { label: 'X (+ bobina, − condensador)', val: 400, min: -1000, max: 1000, step: 10, unit: 'Ω', dec: 0 } }) }, q: mcq('Con una bobina en serie (X positiva), la tensión total respecto a la corriente va…', ['Por delante', 'Por detrás', 'Igual', 'Al revés'], 'En L, V antes que I.') },
      ...base('ba_phasor')
    ] },
    impedance: { name: 'Impedancia', alts: [...base('impedance')] },
    ba_zmatch: { name: 'Impedancia de entrada y adaptación', alts: [
      { title: 'Igual con igual', text: 'Cada entrada o salida tiene su impedancia. Con señales de radio débiles se iguala la de la antena, la del cable y la de la entrada del receptor (típico: 50 Ω) para aprovecharla toda: es la máxima transferencia de potencia que ya conoces, ahora con impedancias.', svg: matchSVG, q: mcq('Una antena de 50 Ω y un receptor. ¿Qué impedancia de entrada conviene?', ['50 Ω', '0 Ω', 'Infinita', '1 Ω'], 'Adaptación: la misma.') },
      { title: 'No siempre se adapta', text: 'Para medir una tensión interesa una entrada de impedancia muy alta (que no cargue). Para alimentar, una salida de impedancia muy baja. Solo con señales débiles de radio o antena se adapta.', q: mcq('¿Qué impedancia de entrada interesa en un voltímetro?', ['Muy alta, para no cargar el circuito', 'Igual a la del circuito', 'Muy baja', 'Cero'], 'Para medir sin molestar.') }
    ] },
    ba_probe: { name: 'Sondas ×1 y ×10', alts: [
      { title: 'Compénsala tú', text: 'Gira el condensador ajustable de la sonda hasta que la cuadrada de prueba quede plana: ni picos ni esquinas redondeadas.', tune: { viz: 'probeComp', params: { k: { label: 'Tornillo de compensación', val: 0.7, min: 0.5, max: 1.5, step: 0.05, unit: '', dec: 2 } } }, q: mcq('Al compensar, la cuadrada sale con las esquinas redondeadas. ¿Diagnóstico?', ['Subcompensada', 'Sobrecompensada', 'Bien compensada', 'Sonda rota'], 'Redondeadas: falta compensación.') },
      ...base('ba_probe')
    ] },
    ba_rise: { name: 'Tiempo de subida', alts: [
      { title: 'Mídelo en la curva', text: 'El tiempo de subida va del 10 % al 90 % del flanco. En un RC vale <b>tr = 2,2 · R · C</b>. Cambia R y C.', tune: { viz: 'riseTime', params: { R: { label: 'R', val: 1000, fmt: 'R', min: 100, max: 100000 }, C: { label: 'C', val: 1, list: [0.1, 1, 10, 100], unit: 'nF', dec: 1 } } }, q: mcq('Un RC con 1 kΩ y 1 µF. ¿Tiempo de subida?', ['2,2 ms', '1 ms', '0,35 ms', '5 ms'], '2,2 × 1000 × 10⁻⁶ = 2,2 ms.') },
      ...base('ba_rise')
    ] },
    ba_phasemeas: { name: 'Medir un desfase', alts: [
      { title: 'Fracción del periodo', text: 'Mide cuánto tiempo Δt separa los cruces por cero de las dos señales y compáralo con el periodo T: <b>φ = 360° · Δt / T</b>. Un cuarto de periodo son 90°; medio, 180°.', svg: dtSVG, q: mcq('Señales de 1 kHz; una cruza el cero 0,5 ms después. ¿Desfase?', ['180°', '90°', '45°', '360°'], 'Medio periodo: 180°.') },
      { title: 'Con números', text: '500 Hz → T = 2 ms. Si el retraso es 0,25 ms, es 1/8 del periodo: 360 / 8 = 45°. Primero el periodo, luego la fracción.', q: mcq('50 Hz y un retraso de 5 ms. ¿Desfase?', ['90°', '45°', '180°', '18°'], 'T = 20 ms; 5 / 20 = 1/4 → 90°.') }
    ] },
    ba_f0: { name: 'Frecuencia de resonancia LC', alts: [
      { title: 'Donde se cruzan', text: 'XL sube con la frecuencia y XC baja. Se igualan en un solo punto: <b>f₀ = 1 / (2π · √(L · C))</b>.', svg: crossSVG, q: mcq('Aumentas la bobina de un circuito LC. La frecuencia de resonancia…', ['Baja', 'Sube', 'No cambia', 'Se duplica'], 'Más L o más C: f₀ más baja.') },
      ...base('ba_f0')
    ] },
    ba_q: { name: 'Factor Q y ancho de banda', alts: [
      { title: 'Afila el pico', text: 'Con menos resistencia el pico de resonancia se hace más alto y estrecho: más Q. <b>Q = XL / R</b> y <b>BW = f₀ / Q</b>.', tune: { viz: 'lcResonance', params: lcP() }, q: mcq('Bajas la resistencia de un RLC serie. El ancho de banda…', ['Se estrecha', 'Se ensancha', 'No cambia', 'Desaparece'], 'Menos R, más Q, menos BW.') },
      ...base('ba_q')
    ] },
    ba_restype: { name: 'Resonancia serie y paralelo', alts: [
      { title: 'Serie deja pasar, paralelo bloquea', text: 'En resonancia, un LC en serie es casi un cable (solo queda R): corriente máxima. Un LC en paralelo (tanque) es casi un circuito abierto: impedancia máxima.', svg: tankSVG, q: mcq('Un LC en paralelo, en resonancia, ¿cómo se comporta?', ['Casi como un circuito abierto', 'Como un cable', 'Como una resistencia de 0 Ω', 'Como una pila'], 'Impedancia máxima.') },
      ...base('ba_restype')
    ] },
    ba_order2: { name: 'Filtros de segundo orden', alts: [
      { title: 'Mira la pendiente y el pico', text: 'Un filtro de segundo orden cae <b>40 dB por década</b>, el doble que un RC. Cerca de f₀ manda Q: con 0,707 queda plano; con más, aparece un pico.', tune: { viz: 'filter2', params: f2P({ t: { val: 1, fixed: true } }) }, q: mcq('Un paso bajo de segundo orden, una década por encima de f₀, atenúa unos…', ['40 dB', '20 dB', '3 dB', '80 dB'], 'Doble pendiente que un RC.') },
      { title: 'Por qué no basta con encadenar', text: 'Dos RC iguales seguidos cargan uno al otro: el segundo tira de la salida del primero y la curva sale peor de lo esperado. Por eso se usan un RLC o, más adelante, filtros con amplificadores entre etapas.', svg: slope2SVG, q: mcq('¿Qué Q da la respuesta más plana sin pico?', ['Unos 0,707', '10', '0,1', '100'], 'Es el filtro Butterworth.') }
    ] },
    ba_bandpass: { name: 'Paso banda y banda eliminada', alts: [
      { title: 'Cuatro formas', text: 'Paso bajo: lo lento. Paso alto: lo rápido. <b>Paso banda</b>: una franja alrededor de f₀, de ancho f₀ / Q. <b>Banda eliminada</b> (notch): todo menos una franja.', svg: bpSVG, q: mcq('Quieres quitar el zumbido de 50 Hz de un micrófono. ¿Qué filtro?', ['Banda eliminada a 50 Hz', 'Paso alto a 10 kHz', 'Paso bajo a 50 Hz', 'Paso banda a 50 Hz'], 'Quitas 50 Hz y dejas el resto.') },
      { title: 'Pruébalos', text: 'Cambia el tipo y el Q: el paso banda se estrecha al subir Q; la banda eliminada se come justo 1 kHz.', tune: { viz: 'filter2', params: f2P({ t: { label: 'Tipo (1 bajo, 2 banda, 3 eliminada)', val: 2, list: [1, 2, 3], dec: 0 } }) }, q: mcq('Paso banda a 10 kHz con Q = 10. ¿Ancho de banda?', ['1 kHz', '10 kHz', '100 kHz', '100 Hz'], 'BW = f₀ / Q.') }
    ] },
    ba_pf: { name: 'Potencia activa, aparente y factor de potencia', alts: [
      { title: 'El triángulo', text: 'La activa P (la útil) y la reactiva Q (la que va y viene) forman un triángulo cuya hipotenusa es la aparente S. <b>cos φ = P / S</b>.', tune: { viz: 'pfTriangle', params: { P: { label: 'Activa P', val: 800, min: 0, max: 1000, step: 50, unit: 'W', dec: 0 }, Q: { label: 'Reactiva Q', val: 600, min: 0, max: 1000, step: 50, unit: 'var', dec: 0 } } }, q: mcq('P = 600 W y Q = 800 var. ¿S?', ['1000 VA', '1400 VA', '200 VA', '480 VA'], '√(600² + 800²).') },
      ...base('ba_pf')
    ] },
    ba_xfmr: { name: 'Transformadores', alts: [
      { title: 'Cambia las vueltas', text: 'La tensión se reparte como las vueltas: <b>Vs / Vp = Ns / Np</b>. Menos vueltas en el secundario: reductor; más: elevador.', tune: { viz: 'xfmr', params: { Np: { label: 'Vueltas del primario', val: 1000, list: [100, 500, 1000, 2000], dec: 0 }, Ns: { label: 'Vueltas del secundario', val: 100, list: [25, 50, 100, 230, 500, 1000, 2000], dec: 0 }, Vp: { val: 230, fixed: true }, Is: { val: 2, fixed: true } } }, q: mcq('2000 vueltas a 230 V y 100 en el secundario. ¿Salida?', ['11,5 V', '4600 V', '23 V', '115 V'], '230 × 100 / 2000.') },
      ...base('ba_xfmr')
    ] },
    ba_xfmrpow: { name: 'Potencia y corriente en un transformador', alts: [
      { title: 'Lo que entra, sale', text: 'Un transformador no crea energía: la potencia del secundario sale del primario (menos unas pérdidas pequeñas). Si baja la tensión, sube la corriente en la misma proporción.', svg: powSVG, q: mcq('Un transformador de 230 V a 23 V da 1 A en el secundario. ¿Corriente aproximada en el primario?', ['0,1 A', '10 A', '1 A', '0,01 A'], '23 W / 230 V ≈ 0,1 A.') },
      { title: 'Con números', text: '230 V → 12 V, con 2 A en el secundario: 24 W. En el primario: 24 W / 230 V ≈ 0,104 A. La relación de corrientes es la inversa de la de tensiones.', q: mcq('Un transformador elevador multiplica la tensión × 10. La corriente en el secundario respecto a la del primario es…', ['Unas 10 veces menor', '10 veces mayor', 'Igual', '100 veces menor'], 'Misma potencia: × 10 en tensión, ÷ 10 en corriente.') }
    ] }
  });

  // Arregla frases de alternativas heredadas que nombraban cosas aún no vistas en esta parte del curso
  const fixAlt = (k, title, pairs) => { const a = CONCEPTS[k].alts.find(x => x.title === title); if (!a) return; const r = s => pairs.reduce((x, [f, t]) => x.split(f).join(t), s); a.text = r(a.text); if (a.q) { a.q.q = r(a.q.q); a.q.e = r(a.q.e); a.q.o = a.q.o.map(r); } };
  fixAlt('ba_xl', 'Choques y ferritas', [['Por lo mismo, la impedancia de un altavoz “de 8 Ω” sube a frecuencias altas.', 'Por lo mismo, la bobina de un altavoz se opone más a los agudos.']]);
  fixAlt('ba_pf', 'Tres potencias', [['cables y transformadores', 'cables y aparatos']]);
  /* ================= LECCIONES ================= */
  UNITS.push({ id: 'm7b', title: 'Alterna a fondo', desc: 'Reactancia inductiva, impedancia y fasores, sondas, resonancia, filtros de segundo orden, potencia en alterna y transformadores.', nodes: [
    L('h7', 'Reactancia inductiva', 'wave', ['ba_xl'], [
      Q('En continua, una bobina es casi un cable. ¿Qué crees que pasa con una alterna de frecuencia muy alta?', ['Se opone mucho: la corriente intenta cambiar muy deprisa', 'Sigue siendo un cable', 'Se convierte en un condensador'], 'La bobina se opone a los cambios de corriente; en alterna rápida, la corriente cambia sin parar.', { predict: true, c: 'ba_xl', h: 'Recuerda a qué se opone una bobina.' }),
      I('En alterna, la corriente cambia todo el tiempo, así que la bobina siempre se opone. Esa oposición es la <b>reactancia inductiva</b>: <b>XL = 2π · f · L</b>. Al revés que en el condensador: <b>más frecuencia, más reactancia</b>.', { svg: xlvsSVG }),
      { t: 'explore', text: 'Un generador de 5 V eficaces con una bobina. Cambia la inductancia y la frecuencia.', viz: 'xl', params: xlP(),
        tasks: [
          { q: 'XL', min: 95, max: 105, text: 'Consigue unos 100 Ω', done: 'Por ejemplo 1 mH a 16 kHz: 2π × 16 000 × 0,001 ≈ 100 Ω.', hint: 'Con 1 mH, sube la frecuencia.' },
          { q: 'XL', min: 0, max: 1, text: 'Ahora que casi no se oponga: menos de 1 Ω', done: 'Bobina pequeña y frecuencia baja: casi un cable.', hint: 'Baja las dos.' },
          { q: 'XL', min: 10000, max: 1e9, text: 'Y que casi bloquee: más de 10 kΩ', done: 'Bobina grande y frecuencia alta.', hint: 'Sube las dos.' }
        ] },
      { t: 'steps', text: '¿Qué reactancia tiene una bobina de 1 mH a 15,9 kHz?', svg: xlvsSVG, steps: ['Fórmula: <b>XL = 2π · f · L</b>', '2π × 15 900 × 0,001', '<b>XL ≈ 100 Ω</b>'], result: 'Unos 100 Ω' },
      G('m7b_xl'),
      Q('En continua (f = 0), una bobina ideal se comporta como…', ['Un cable', 'Un circuito abierto', 'Un condensador', 'Una pila'], 'XL = 0: solo queda la resistencia del hilo.', { c: 'ba_xl', h: 'Pon f = 0 en la fórmula.' }),
      Q('Frecuencia × 10: XL…', ['Se multiplica por 10', 'Se divide entre 10', 'No cambia', 'Se multiplica por 100'], 'Proporcional a f.', { c: 'ba_xl', h: 'f está multiplicando.' }),
      { t: 'match', q: '¿Qué hace cada uno?', pairs: [['Bobina con frecuencia alta', 'Bloquea'], ['Bobina en continua', 'Deja pasar'], ['Condensador con frecuencia alta', 'Deja pasar '], ['Condensador en continua', 'Bloquea ']], c: 'ba_xl', h: 'Son opuestos: lo que uno bloquea, el otro lo deja pasar.' },
      Nm('¿A qué frecuencia tiene una bobina de 1 mH una reactancia de 100 Ω, en kHz?', 15.9, 'kHz', 'f = XL / (2π · L) = 100 / 0,00628 ≈ 15 900 Hz.', { tol: 0.2, c: 'ba_xl', h: 'Despeja f de XL = 2π · f · L.' }),
      I('Uso real: el <b>choque</b>. Una bobina en serie con la alimentación deja pasar la continua y frena el ruido rápido. Los cilindros de ferrita de algunos cables hacen eso mismo.', { svg: chokeSVG }),
      Q('¿Para qué sirve el cilindro de ferrita de algunos cables?', ['Frenar el ruido de alta frecuencia sin afectar a la continua', 'Dar peso', 'Subir la tensión', 'Proteger de golpes'], 'Es una bobina de una vuelta con núcleo de ferrita.', { c: 'ba_xl', h: 'Una bobina, ¿qué deja pasar y qué frena?' }),
      Q('Una reactancia, ¿convierte energía en calor como una resistencia?', ['No: guarda la energía y la devuelve en cada ciclo', 'Sí, igual', 'Sí, el doble', 'Solo en continua'], 'Una reactancia ideal no se calienta.', { c: 'ba_xl', h: 'Recuerda qué hace una bobina con la energía.' }),
      I('<b>Resumen</b>\n· <b>XL = 2π · f · L</b>: crece con la frecuencia.\n· En continua, cable; a alta frecuencia, freno (choques y ferritas).\n· La reactancia guarda y devuelve energía: no calienta.')
    ]),
    L('h8', 'Impedancia y fasores sin miedo', 'wave', ['ba_phasor', 'impedance', 'ba_zmatch'], [
      Q('Una resistencia de 1 kΩ en serie con un condensador de Xc = 1 kΩ. ¿Cuánto crees que vale la oposición total?', ['Unos 1,4 kΩ', '2 kΩ', '0 Ω'], 'No se suman sin más: sus tensiones están desfasadas 90°. Se combinan como los lados de un triángulo: √2 × 1 kΩ.', { predict: true, c: 'impedance', h: 'Piensa en dos flechas en ángulo recto.' }),
      I('En una resistencia, tensión y corriente van juntas. En un <b>condensador</b>, la corriente va <b>90° por delante</b> de la tensión; en una <b>bobina</b>, 90° por detrás. Regla: <b>CIVIL</b> (en C, I antes que V; en L, V antes que I).', { svg: phaseSVG }),
      { t: 'explore', text: 'Una R en serie con una reactancia X. Las flechas (fasores) giran; sus sombras son las senoides de la derecha.', viz: 'phasor', params: phP(),
        tasks: [
          { q: 'phi', min: 44, max: 46, text: 'Consigue un desfase de +45°', done: 'Con X = R (bobina): la tensión va 45° por delante.', hint: 'Haz X igual a R, en positivo.' },
          { q: 'phi', min: -46, max: -44, text: 'Ahora −45° (con condensador)', done: 'X = −R: la tensión va 45° por detrás de la corriente.', hint: 'X negativa, del mismo tamaño que R.' },
          { q: 'Z', min: 495, max: 505, text: 'Con R = 300 Ω, consigue Z = 500 Ω', done: 'X = ±400 Ω: el triángulo 3-4-5.', hint: '√(300² + X²) = 500.' }
        ] },
      I('Un <b>fasor</b> es una flecha que gira a la frecuencia de la señal: la senoide es su sombra. Las tensiones de R y de X son flechas a 90°: se suman como los catetos de un triángulo.', { svg: fcSVG }),
      I('La oposición total es la <b>impedancia</b>: <b>Z = √(R² + X²)</b>, con un desfase <b>φ = arctan(X / R)</b>.', { tune: { viz: 'zTriangle', params: { R: { label: 'R', val: 300, min: 0, max: 1000, step: 10, unit: 'Ω', dec: 0 }, X: { label: 'X (+ bobina, − condensador)', val: 400, min: -1000, max: 1000, step: 10, unit: 'Ω', dec: 0 } } } }),
      { t: 'steps', text: 'R = 1 kΩ en serie con un condensador de Xc = 1 kΩ. ¿Impedancia y desfase?', svg: fcSVG, steps: ['Z = √(R² + X²) = √(1000² + 1000²)', '<b>Z ≈ 1414 Ω</b> (√2 × 1000)', 'φ = arctan(1000 / 1000) = arctan(1)', '<b>φ = 45°</b> (la corriente adelantada, por ser condensador)'], result: '1414 Ω y 45°' },
      Q('En un condensador en alterna…', ['La corriente va 90° por delante de la tensión', 'La tensión va 90° por delante', 'Van en fase', 'Van a 180°'], 'CIVIL: en C, I antes que V.', { c: 'ba_phasor', h: 'Recuerda CIVIL.' }),
      G('m7b_z'),
      Q('En ese circuito (1 kΩ y Xc = 1 kΩ), con 10 V eficaces en total, ¿qué tensión cae en la resistencia?', ['Unos 7,1 V', '5 V', '10 V', '0 V'], 'I = 10 / 1414; VR = I · 1000 ≈ 7,07 V. En C caen otros 7,07 V: no suman 10 porque están desfasadas.', { c: 'impedance', h: 'Calcula la corriente con Z y luego aplica Ohm a la resistencia.' }),
      I('Eso es lo que pasa en la frecuencia de corte de un filtro RC: R = Xc, la salida es 1/√2 ≈ 0,707 de la entrada (−3 dB) y el desfase es de 45°.', { svg: fcSVG }),
      Q('¿Qué desfase hay en la frecuencia de corte de un filtro RC de primer orden?', ['45°', '90°', '0°', '180°'], 'arctan(1) = 45°.', { c: 'impedance', h: 'En fc, R = Xc.' }),
      I('Cada entrada y salida tiene su <b>impedancia</b>. Con señales de radio débiles se iguala la de la antena, el cable y el receptor (típico: 50 Ω): es la máxima transferencia de potencia con impedancias.', { svg: matchSVG }),
      Q('Una antena de 50 Ω y un receptor. ¿Qué impedancia de entrada conviene?', ['50 Ω', '0 Ω', 'Infinita', '1 Ω'], 'Adaptación de impedancias: lo verás a fondo en Radio.', { c: 'ba_zmatch', h: 'Recuerda cuándo se saca la máxima potencia.' }),
      Q('¿Por qué la impedancia de un altavoz «de 8 Ω» cambia con la frecuencia?', ['Su bobina añade una reactancia que crece con la frecuencia', 'Porque se calienta', 'No cambia', 'Por el color del cono'], 'La impedancia nominal es una referencia, no una constante.', { c: 'impedance', h: '¿Qué componente hay dentro de un altavoz?' }),
      I('<b>Resumen</b>\n· CIVIL: en C la corriente adelanta 90°; en L, la tensión.\n· <b>Z = √(R² + X²)</b>; <b>φ = arctan(X / R)</b>.\n· En la fc de un RC: −3 dB y 45°. Antenas y receptores se adaptan (50 Ω).')
    ]),
    L('f9', 'Sondas, tiempos de subida y desfase', 'meter', ['ba_probe', 'ba_rise', 'ba_phasemeas', 'ba_probegnd'], [
      Q('Conectas la sonda del osciloscopio a un circuito. ¿Crees que la sonda cambia lo que mides?', ['Un poco: tiene resistencia y capacidad', 'Nada en absoluto', 'Lo duplica'], 'Toda medida carga algo el circuito. La sonda ×10 lo reduce mucho.', { predict: true, c: 'ba_probe', h: 'Recuerda que el voltímetro también cargaba el circuito.' }),
      I('Una sonda <b>×10</b> lleva dentro 9 MΩ que, con el 1 MΩ de la entrada del osciloscopio, dividen entre 10. Pierdes señal, pero cargas mucho menos el circuito y ganas rapidez.', { svg: x10SVG }),
      Q('Sonda ×10 y canal configurado en ×10. La pantalla marca 3 V. ¿Qué llega a la entrada del aparato?', ['0,3 V, que el osciloscopio multiplica por 10 al mostrarlo', '30 V', '3 V', '0,03 V'], 'La sonda divide y el canal lo compensa en pantalla.', { c: 'ba_probe', h: 'La sonda divide entre 10 antes de llegar al aparato.' }),
      I('<b>Compensación</b>: la sonda ×10 tiene un condensador ajustable que debe equilibrar la capacidad de la entrada. Se ajusta con la cuadrada de 1 kHz que da el propio osciloscopio.', { svg: compSVG }),
      { t: 'explore', text: 'La cuadrada de prueba vista con una sonda ×10. Gira el tornillo de compensación.', viz: 'probeComp', params: { k: { label: 'Tornillo de compensación', val: 0.7, min: 0.5, max: 1.5, step: 0.05, unit: '', dec: 2 } },
        tasks: [
          { q: 'err', min: 0, max: 0.025, text: 'Deja la cuadrada plana', done: 'Bien compensada: esquinas rectas.', hint: 'Gira hacia el centro.' },
          { q: 'k', min: 1.3, max: 2, text: 'Ahora pásate: mira cómo se ve sobrecompensada', done: 'Picos en las esquinas: también falsean la medida.', hint: 'Gira del todo hacia arriba.' }
        ] },
      { t: 'match', q: 'Une lo que ves al compensar con su diagnóstico.', pairs: [['Esquinas con picos hacia fuera', 'Sobrecompensada'], ['Esquinas redondeadas', 'Subcompensada'], ['Cuadrada plana', 'Bien compensada']], c: 'ba_probe', h: 'Recuerda lo que viste al girar el tornillo.' },
      I('El <b>tiempo de subida</b> (tr) va del 10 % al 90 % de un flanco. En un RC, <b>tr = 2,2 · R · C</b>. El osciloscopio también tiene el suyo: <b>tr ≈ 0,35 / ancho de banda</b> (la frecuencia a la que el aparato ya atenúa 3 dB).', { tune: { viz: 'riseTime', params: { R: { label: 'R', val: 1000, fmt: 'R', min: 100, max: 100000 }, C: { label: 'C', val: 1, list: [0.1, 1, 10, 100], unit: 'nF', dec: 1 } } }, more: 'Un osciloscopio de 100 MHz no puede mostrar flancos de menos de unos 3,5 ns: los verá más lentos de lo que son. Regla práctica: elige un aparato unas 3 a 5 veces más rápido que lo que quieres ver.' }),
      G('m7b_rise'),
      Nm('Un osciloscopio de 50 MHz. ¿Tiempo de subida propio aproximado, en ns?', 7, 'ns', '0,35 / 50 000 000 = 7 ns.', { tol: 0.2, c: 'ba_rise', h: 'tr ≈ 0,35 / ancho de banda, con el ancho de banda en Hz.' }),
      I('Para medir el <b>desfase</b> entre dos señales de la misma frecuencia, mide cuánto tiempo Δt separa sus cruces por cero: <b>φ = 360° · Δt / T</b>.', { svg: dtSVG }),
      { t: 'steps', text: 'Dos senoides de 1 kHz; la segunda cruza el cero 0,25 ms después. ¿Desfase?', svg: dtSVG, steps: ['Periodo: T = 1 / 1000 = <b>1 ms</b>', 'Fracción: Δt / T = 0,25 / 1 = 1/4', 'φ = 360° × 1/4 = <b>90°</b>'], result: '90°' },
      Nm('Dos senoides de 2 kHz; la segunda va 0,0625 ms por detrás. ¿Desfase, en grados?', 45, '°', 'T = 0,5 ms; 0,0625 / 0,5 = 1/8 → 45°.', { tol: 1, c: 'ba_phasemeas', h: 'Primero el periodo; luego qué fracción de él es el retraso.' }),
      G('m7b_phase'),
      Q('Mides con la sonda en ×1 un punto de alta impedancia y la señal sale más lenta de lo esperado. ¿Por qué?', ['La capacidad de la sonda en ×1 (unos 100 pF) forma un RC con el circuito', 'La sonda en ×1 amplifica', 'El disparo está mal', 'El acoplo es DC'], 'En ×10 la capacidad es de unos 10–15 pF: carga mucho menos.', { c: 'ba_probe', h: 'Resistencia alta y capacidad: ¿qué forman juntas?' }),
      Q('Con la pinza de masa larga (15 cm) aparecen oscilaciones en los flancos rápidos. ¿Solución?', ['Usar el muelle de masa corto en la punta', 'Una pinza más larga', 'Subir los V/div', 'Acoplo AC'], 'El cable largo es una pequeña bobina que, con la capacidad de la sonda, hace oscilar los flancos.', { c: 'ba_probegnd', h: 'Un cable largo es una pequeña bobina.' }),
      I('<b>Resumen</b>\n· Sonda ×10: divide entre 10 y carga poco; hay que compensarla.\n· tr = 2,2 · R · C; el osciloscopio, tr ≈ 0,35 / ancho de banda.\n· Desfase: φ = 360° · Δt / T. Masa corta para flancos rápidos.')
    ]),
    L('h9', 'Resonancia LC y factor Q', 'wave', ['ba_f0', 'ba_q', 'ba_restype'], [
      Q('XL sube con la frecuencia y XC baja. ¿Crees que habrá una frecuencia en la que valgan lo mismo?', ['Sí, siempre hay una', 'No, nunca', 'Solo con bobinas grandes'], 'Una curva sube y la otra baja: se cruzan en un punto. Esa es la frecuencia de resonancia.', { predict: true, c: 'ba_f0', h: 'Una sube y la otra baja…' }),
      I('A una frecuencia, XL = XC: la <b>frecuencia de resonancia</b>.\n2π·f·L = 1 / (2π·f·C) → <b>f₀ = 1 / (2π · √(L · C))</b>', { svg: crossSVG }),
      I('Un LC cargado oscila solo: el condensador se descarga a través de la bobina, la bobina mantiene la corriente y carga el condensador al revés, y vuelta a empezar, como un columpio. La resistencia apaga la oscilación poco a poco.', { svg: swingSVG }),
      { t: 'explore', text: 'La curva es la corriente de un RLC en serie según la frecuencia (eje logarítmico). Mueve L y C para mover el pico; R cambia lo afilado que es.', viz: 'lcResonance', params: lcP(),
        tasks: [
          { q: 'f0', min: 950000, max: 1050000, text: 'Sintoniza 1 MHz (onda media)', done: 'Así se sintoniza una radio: un condensador variable mueve f₀.', hint: 'Con 220 µH, unos 115 pF.' },
          { q: 'BW', min: 0, max: 20000, text: 'Haz el pico más estrecho: ancho de banda < 20 kHz', done: 'Menos R → más Q → más selectivo: separa emisoras cercanas.', hint: 'Baja R.' },
          { q: 'Q', min: 0, max: 5, text: 'Ahora estropéalo: Q menor que 5', done: 'Mucha resistencia: un pico ancho y bajo que no separa nada.', hint: 'Sube R.' }
        ] },
      { t: 'steps', text: 'Bobina de 10 µH y condensador de 0,1 µF. ¿Frecuencia de resonancia?', svg: crossSVG, steps: ['L · C = 10⁻⁵ × 10⁻⁷ = 10⁻¹²', '√(10⁻¹²) = 10⁻⁶', '2π × 10⁻⁶ ≈ 6,28 × 10⁻⁶', 'f₀ = 1 / 6,28·10⁻⁶ ≈ <b>159 kHz</b>'], result: 'Unos 159 kHz' },
      G('m7b_f0'),
      I('El <b>factor de calidad Q</b> dice lo afilado del pico. En serie: <b>Q = XL / R</b> en resonancia. Ancho de banda (entre los puntos de −3 dB): <b>BW = f₀ / Q</b>.', { svg: qSVG }),
      G('m7b_q'),
      Nm('Un circuito resuena a 1 MHz con Q = 50. ¿Ancho de banda, en kHz?', 20, 'kHz', 'BW = 1 000 000 / 50 = 20 000 Hz.', { c: 'ba_q', h: 'BW = f₀ / Q.' }),
      Q('En resonancia serie, la corriente es…', ['Máxima: solo la limita R', 'Mínima', 'Cero', 'La misma que fuera de resonancia'], 'XL y XC se anulan.', { c: 'ba_restype', h: 'En serie, XL y XC se restan.' }),
      Q('En un LC en paralelo (circuito tanque), en resonancia la impedancia es…', ['Máxima (ideal: infinita)', 'Mínima', 'Cero', 'Igual a R'], 'Por eso un tanque solo deja pasar ganancia cerca de f₀ en un amplificador.', { c: 'ba_restype', h: 'Paralelo hace lo contrario que serie.' }),
      Q('En resonancia serie con Q = 50 y 1 V de entrada, la tensión en el condensador puede llegar a…', ['Unos 50 V', '1 V', '0,02 V', '0 V'], 'En resonancia, VC ≈ Q · Vent. En circuitos de potencia, esa tensión puede ser peligrosa.', { c: 'ba_q', h: 'Q también multiplica la tensión en L y en C.' }),
      I('<b>Resumen</b>\n· <b>f₀ = 1 / (2π√(LC))</b>: ahí XL = XC.\n· <b>Q = XL / R</b>; <b>BW = f₀ / Q</b>.\n· Serie: corriente máxima. Paralelo: impedancia máxima.')
    ]),
    L('h10', 'Filtros de segundo orden', 'wave', ['ba_order2', 'ba_bandpass', 'ba_q'], [
      Q('Pones un filtro RC detrás de otro igual. Una década por encima de fc, ¿cuánto crees que atenúan juntos?', ['Unos 40 dB: cada uno quita unos 20', 'Unos 20 dB, igual que uno', 'Nada'], 'Las atenuaciones en dB se suman: unos 40 dB por década (aunque encadenarlos a lo bruto tiene un problema que verás ahora).', { predict: true, c: 'ba_order2', h: 'En dB, las etapas en cadena se suman.' }),
      I('Un RC cae 20 dB por década (<b>primer orden</b>). Un filtro de <b>segundo orden</b> (dos RC bien hechos o un RLC) cae <b>40 dB por década</b>: separa mucho mejor.', { svg: slope2SVG }),
      { t: 'explore', text: 'Filtros de segundo orden con f₀ = 1 kHz. Cambia el tipo, el Q y la frecuencia de la señal.', viz: 'filter2', params: f2P(),
        tasks: [
          { q: 'dB', min: -41, max: -39, text: 'Con el paso bajo, lleva la señal una década por encima (10 kHz)', done: '−40 dB: el doble que el RC (la línea discontinua).', hint: 'Señal a 10 kHz.' },
          { q: 'peak', min: 6, max: 100, text: 'Haz que aparezca un pico de más de 6 dB', done: 'Con Q alto, el filtro resuena cerca de f₀ antes de caer.', hint: 'Sube Q.' },
          { q: 'dB', min: -100, max: -30, text: 'Con la banda eliminada, borra la señal de 1 kHz', done: 'Un notch se come justo f₀ y deja el resto.', hint: 'Tipo 3 y señal a 1 kHz.' }
        ] },
      I('En un paso bajo de segundo orden, cerca de f₀ manda <b>Q</b>:\n· Q bajo (≈ 0,5): caída suave.\n· <b>Q ≈ 0,707</b> (Butterworth): lo más plano posible sin pico.\n· Q alto: un pico de resonancia antes de caer.', { svg: qcurvesSVG }),
      Q('¿Qué Q da la respuesta más plana sin pico?', ['Unos 0,707', '10', '0,1', '100'], 'Butterworth.', { c: 'ba_order2', h: 'Recuerda el reto del pico.' }),
      Q('Un paso bajo de segundo orden, una década por encima de su frecuencia de corte, atenúa unos…', ['40 dB (÷ 100)', '20 dB (÷ 10)', '3 dB', '80 dB'], 'Doble pendiente que un RC.', { c: 'ba_order2', h: 'El doble que un RC.' }),
      Q('Dos filtros RC iguales encadenados sin nada entre ellos, ¿son un buen segundo orden?', ['No del todo: el segundo carga al primero y la curva empeora', 'Perfecto', 'No filtran nada', 'Suben la señal'], 'El segundo tira de la salida del primero (piensa en Thévenin). Lo resolverás con amplificadores entre etapas.', { c: 'ba_order2', h: 'Recuerda qué le pasa a una salida cuando le conectas una carga.' }),
      I('Más formas: el <b>paso banda</b> deja pasar solo lo cercano a f₀, con un ancho de banda <b>f₀ / Q</b>; la <b>banda eliminada</b> (notch) quita una sola franja, por ejemplo el zumbido de 50 Hz.', { svg: bpSVG }),
      { t: 'match', q: 'Une cada filtro con lo que deja pasar.', pairs: [['Paso bajo', 'Lo lento'], ['Paso alto', 'Lo rápido'], ['Paso banda', 'Una franja alrededor de f₀'], ['Banda eliminada', 'Todo menos una franja']], c: 'ba_bandpass', h: 'El nombre dice lo que pasa o lo que se elimina.' },
      { t: 'steps', text: 'Un paso banda a 10 kHz con Q = 5. ¿Qué franja deja pasar?', svg: bpSVG, steps: ['BW = f₀ / Q = 10 kHz / 5 = <b>2 kHz</b>', 'Centrado en 10 kHz: más o menos de <b>9 a 11 kHz</b>', 'Fuera de esa franja, la señal cae rápido.'], result: 'Unos 2 kHz de ancho' },
      Nm('Paso banda a 10 kHz con Q = 5. ¿Ancho de banda, en kHz?', 2, 'kHz', 'BW = f₀ / Q.', { c: 'ba_bandpass', h: 'Divide la frecuencia central entre Q.' }),
      Q('Quieres quitar el zumbido de la red de la señal de un micrófono. ¿Qué filtro?', ['Banda eliminada a 50 Hz', 'Paso alto a 10 kHz', 'Paso bajo a 50 Hz', 'Ninguno'], 'Quitas 50 Hz y dejas el resto.', { c: 'ba_bandpass', h: 'Solo quieres quitar una frecuencia concreta.' }),
      G('m7b_bw'),
      I('<b>Resumen</b>\n· Segundo orden: <b>40 dB por década</b>.\n· Q = 0,707: plano (Butterworth); Q alto: pico.\n· Paso banda (BW = f₀ / Q) y banda eliminada.')
    ]),
    L('h11', 'Potencia en alterna en dos pinceladas', 'heat', ['ba_pf'], [
      Q('Un motor conectado a 230 V consume 5 A. ¿Crees que gasta 230 × 5 = 1150 W?', ['No necesariamente: parte de la corriente va y viene sin hacer trabajo', 'Sí, siempre', 'Gasta más de 1150 W'], 'Con bobinas, la corriente va desfasada: una parte solo va y vuelve. Los vatios reales son menos.', { predict: true, c: 'ba_pf', h: 'Un motor está lleno de bobinas: piensa en el desfase.' }),
      I('Con una resistencia, P = Vrms · Irms. Pero con bobinas o condensadores la corriente va desfasada y parte de ella va y viene sin hacer trabajo. La potencia útil es la <b>activa</b>: <b>P = Vrms · Irms · cos φ</b>.', { svg: pfWaveSVG }),
      { t: 'explore', text: 'El triángulo de potencias: la activa (horizontal) y la reactiva (vertical). Cambia las dos.', viz: 'pfTriangle', params: { P: { label: 'Activa P', val: 800, min: 0, max: 1000, step: 50, unit: 'W', dec: 0 }, Q: { label: 'Reactiva Q', val: 300, min: 0, max: 1000, step: 50, unit: 'var', dec: 0 } },
        tasks: [
          { q: 'pf', min: 0.99, max: 1, text: 'Consigue un factor de potencia de 0,99 o más', done: 'Casi sin reactiva: como una resistencia pura.', hint: 'Baja la reactiva.' },
          { q: 'S', min: 995, max: 1005, text: 'Haz que la aparente valga 1000 VA', done: 'Por ejemplo 600 W y 800 var: los cables cargan 1000 VA para solo 600 W útiles.', hint: 'Piensa en el triángulo 3-4-5.' },
          { q: 'pf', min: 0.49, max: 0.51, text: 'Y ahora un factor de potencia de 0,5', done: 'Mucha reactiva: la mitad de la corriente no hace trabajo útil.', hint: 'Reactiva bastante mayor que la activa.' }
        ] },
      I('Tres potencias:\n· <b>Activa</b> P (W): la útil.\n· <b>Reactiva</b> Q (var): la que va y viene.\n· <b>Aparente</b> S (VA) = Vrms · Irms: la que tienen que aguantar cables y aparatos.\nForman un triángulo: S² = P² + Q²; <b>cos φ = P / S</b> es el factor de potencia.', { svg: triSVG }),
      { t: 'steps', text: 'Un motor a 230 V consume 5 A con un factor de potencia de 0,8. ¿Aparente y activa?', svg: triSVG, steps: ['Aparente: S = V · I = 230 × 5 = <b>1150 VA</b>', 'Activa: P = S · cos φ = 1150 × 0,8 = <b>920 W</b>', 'Los cables llevan 5 A, aunque solo 920 W hacen trabajo.'], result: '1150 VA y 920 W' },
      Q('El factor de potencia (cos φ) de una resistencia pura es…', ['1', '0', '0,5', '−1'], 'Tensión y corriente en fase.', { c: 'ba_pf', h: '¿Hay desfase en una resistencia?' }),
      G('m7b_pf'),
      Q('Un SAI dice «1000 VA / 600 W». ¿Qué significa?', ['Aguanta 1000 VA de aparente pero solo 600 W de activa', 'Da 1600 W', 'Da 1000 W', 'Es lo mismo'], 'Respeta los dos límites.', { c: 'ba_pf', h: 'VA y W son potencias distintas.' }),
      Nm('Un motor a 230 V consume 4 A con cos φ = 0,8. ¿Potencia activa, en W?', 736, 'W', 'P = 230 × 4 × 0,8 = 736 W. La aparente es 920 VA.', { tol: 2, c: 'ba_pf', h: 'Activa = V · I · cos φ.' }),
      Q('¿Por qué a la compañía eléctrica no le gusta un factor de potencia bajo?', ['Por la red circula más corriente de la necesaria para la misma potencia útil', 'Porque gastas menos', 'Porque sube la tensión', 'Da igual'], 'Más corriente, más pérdidas en los cables.', { c: 'ba_pf', h: 'Mismos vatios útiles con más corriente, ¿qué pasa en los cables?' }),
      I('Las fuentes de alimentación baratas consumen a picos (no en senoide) y tienen mal factor de potencia; las buenas llevan corrección (<b>PFC</b>). Todo esto se mide con un medidor de enchufe: la red no se toca.', { svg: meterPlugSVG }),
      Q('Si multiplicas la tensión eficaz por la corriente eficaz de un aparato, ¿obtienes sus vatios reales?', ['No: obtienes VA; faltan el desfase y la forma de onda', 'Sí, siempre', 'Solo en continua', 'Solo en motores'], 'Para vatios reales hace falta un medidor de potencia.', { c: 'ba_pf', h: 'V · I es la aparente.' }),
      I('<b>Resumen</b>\n· Activa P (W), reactiva Q (var), aparente S (VA): S² = P² + Q².\n· <b>P = V · I · cos φ</b>.\n· Factor de potencia bajo = más corriente para el mismo trabajo.')
    ]),
    L('h6', 'Transformadores', 'bolt', ['ba_xfmr', 'ba_xfmrpow'], [
      Q('¿Crees que un transformador funciona con una pila?', ['No: necesita una corriente que cambie', 'Sí, igual que con alterna', 'Sí, pero da menos tensión'], 'La tensión del secundario la induce un campo magnético que cambia; con continua el campo es fijo y no induce nada.', { predict: true, c: 'ba_xfmr', h: 'Recuerda: una bobina reacciona a los cambios.' }),
      I('Un <b>transformador</b> son dos bobinas sobre un mismo núcleo. La alterna del <b>primario</b> crea un campo magnético que cambia sin parar, y ese campo induce una tensión en el <b>secundario</b>. No hay cable entre ellas.', { svg: xfSVG }),
      { t: 'explore', text: 'Un transformador a 230 V. Cambia las vueltas del primario y del secundario. Por el secundario pasan 2 A.', viz: 'xfmr', params: { Np: { label: 'Vueltas del primario', val: 1000, list: [100, 500, 1000, 2000], dec: 0 }, Ns: { label: 'Vueltas del secundario', val: 100, list: [25, 50, 100, 230, 500, 1000, 2000], dec: 0 }, Vp: { val: 230, fixed: true }, Is: { val: 2, fixed: true } },
        tasks: [
          { q: 'Vs', min: 11.4, max: 11.6, text: 'Consigue 11,5 V en el secundario', done: '1000 y 50 vueltas: la tensión ÷ 20.', hint: '230 / 11,5 = 20: necesitas 20 veces menos vueltas.' },
          { q: 'n', min: 0, max: 0.99, text: 'Ahora hazlo elevador: más tensión a la salida', done: 'Más vueltas en el secundario que en el primario.', hint: 'Secundario con más vueltas.' },
          { q: 'Ip', min: 0, max: 0.105, text: 'Con los 2 A del secundario, que por el primario pasen 0,1 A o menos', done: 'Al bajar la tensión × 20, la corriente del primario es 20 veces menor: la potencia se conserva.', hint: 'Vuelve a un reductor fuerte.' }
        ] },
      I('La tensión se reparte como las vueltas: <b>Vs / Vp = Ns / Np</b>.', { svg: ratioSVG }),
      { t: 'steps', text: '1000 vueltas en el primario, 50 en el secundario y 230 V. ¿Tensión de salida?', svg: ratioSVG, steps: ['Relación: Ns / Np = 50 / 1000 = 1/20', 'Vs = 230 × 1/20', '<b>Vs = 11,5 V</b>'], result: '11,5 V' },
      Nm('Primario de 920 vueltas a 230 V; secundario de 48. ¿Tensión de salida, en V?', 12, 'V', '230 × 48 / 920 = 12 V.', { c: 'ba_xfmr', h: 'Vs = Vp · Ns / Np.' }),
      G('m7b_xfmr'),
      I('Un transformador no crea energía: la potencia que sale por el secundario entra por el primario. <b>Vp · Ip ≈ Vs · Is</b>: si baja la tensión, sube la corriente.', { svg: powSVG }),
      Nm('230 V → 12 V, con 2 A en el secundario. ¿Corriente aproximada en el primario, en mA?', 104, 'mA', '24 W / 230 V ≈ 0,104 A.', { tol: 2, c: 'ba_xfmrpow', h: 'Calcula la potencia del secundario y divídela entre la tensión del primario.' }),
      Q('¿Por qué no funciona un transformador con una pila?', ['Necesita una corriente que cambie para inducir tensión', 'La pila es pequeña', 'Sí funciona', 'Por la polaridad'], 'Inducción = cambio.', { c: 'ba_xfmr', h: 'Con continua, ¿cambia el campo magnético?' }),
      Q('¿Qué ventaja de seguridad da un transformador?', ['Aislamiento galvánico entre la red y tu circuito', 'No se calienta', 'No pesa', 'Ninguna'], 'No hay conexión eléctrica directa entre las bobinas: solo el campo magnético.', { c: 'ba_xfmr', h: '¿Hay algún cable entre el primario y el secundario?' }),
      Q('Un transformador da «12 V» de alterna. ¿Qué tensión de pico tiene su salida?', ['Unos 17 V', '12 V', '24 V', '8,5 V'], 'Las tensiones de alterna se dan en eficaz: 12 × 1,414 ≈ 17 V de pico.', { c: 'ba_rms', h: 'Los 12 V son eficaces.' }),
      Q('Para un proyecto con transformador de red, ¿qué es lo sensato?', ['Usar un adaptador cerrado que ya dé baja tensión', 'Cablear tú el primario a 230 V en la protoboard', 'Quitar la carcasa para ventilar', 'Tocarlo para ver si calienta'], 'La parte de 230 V no se manipula: se usan adaptadores cerrados y homologados.', { c: 'ba_xfmr', h: 'Recuerda dónde está el peligro de la red.' }),
      I('<b>Resumen</b>\n· Dos bobinas en un núcleo; solo con alterna.\n· <b>Vs / Vp = Ns / Np</b>; la potencia se conserva (si baja V, sube I).\n· Aísla de la red. Sus tensiones se dan en eficaz.')
    ]),
    PRJ('p16', 'Proyecto: filtro para altavoces de dos vías', 'crossover')
  ],
  // Banco del examen de nivel: preguntas nuevas que cubren todas las lecciones del módulo
  exam: [
    // h7 · reactancia inductiva
    Nm('Un choque debe oponer al menos 1 kΩ al ruido de 1 MHz. ¿Qué inductancia mínima necesita, en µH?', 159, 'µH', 'L = XL / (2π · f) = 1000 / (6,283 × 1 000 000) ≈ 0,000159 H = 159 µH.', { tol: 2, c: 'ba_xl', h: 'Despeja L de XL = 2π · f · L.', l: 'h7' }),
    Q('Una bobina y un condensador tienen la misma reactancia a 1 kHz. Subes la frecuencia a 2 kHz. ¿Qué pasa?', ['La de la bobina se duplica y la del condensador se reduce a la mitad', 'Las dos se duplican', 'Las dos se reducen a la mitad', 'No cambian'], 'XL = 2π · f · L crece con f; Xc = 1 / (2π · f · C) baja con f. Por eso solo coinciden a una frecuencia.', { c: 'ba_xl', h: 'Mira dónde está f en cada fórmula: ¿multiplicando o dividiendo?', l: 'h7' }),
    // h8 · impedancia y fasores
    Nm('Una resistencia de 3 kΩ en serie con un condensador de Xc = 4 kΩ recibe 10 V eficaces. ¿Qué tensión eficaz cae en el condensador, en V?', 8, 'V', 'Z = √(3² + 4²) = 5 kΩ. I = 10 V / 5 kΩ = 2 mA. En C: 2 mA × 4 kΩ = 8 V (y 6 V en R: no suman 10 porque están desfasadas 90°).', { tol: 0.1, c: 'impedance', h: 'Calcula Z con el triángulo, saca la corriente y multiplícala por Xc.', l: 'h8' }),
    Q('Mides la tensión y la corriente de un componente y ves que la corriente cruza el cero un cuarto de periodo antes que la tensión. ¿Qué componente es?', ['Un condensador', 'Una bobina', 'Una resistencia', 'Un cable'], 'Un cuarto de periodo son 90°, con la corriente por delante. CIVIL: en C, la I va antes que la V.', { c: 'ba_phasor', h: 'Un cuarto de periodo son 90°. Usa la regla CIVIL.', l: 'h8' }),
    Q('El cable de una antena de 50 Ω llega a un receptor con entrada de 50 Ω. ¿Por qué se igualan las impedancias?', ['Para que la señal débil llegue con la máxima potencia posible', 'Para que el cable pese menos', 'Para subir la tensión de la señal', 'Para bloquear la continua'], 'Es la máxima transferencia de potencia aplicada a impedancias: con señales de radio débiles no se puede desperdiciar nada.', { c: 'ba_zmatch', h: 'Recuerda cuándo se transfiere la máxima potencia a una carga.', l: 'h8' }),
    TU('Con una resistencia y una reactancia en serie, consigue que la tensión vaya 60° por detrás de la corriente.', 'phasor', { R: { label: 'R', val: 300, min: 0, max: 1000, step: 10, unit: 'Ω', dec: 0 }, X: { label: 'X (+ bobina, − condensador)', val: 0, min: -1000, max: 1000, step: 10, unit: 'Ω', dec: 0 } }, { q: 'phi', min: -61, max: -59, text: 'Objetivo: la tensión, 60° por detrás de la corriente', hint: 'tan(60°) ≈ 1,73.' }, 'La tensión detrás de la corriente pide un condensador (X negativa). φ = arctan(X / R) = −60° cuando |X| = 1,73 · R: con R = 300 Ω, X ≈ −520 Ω.', { c: 'ba_phasor', h: '¿Bobina o condensador? Luego usa φ = arctan(X / R).', l: 'h8' }),
    // f9 · sondas, subida y desfase
    Nm('Un RC con 2,2 kΩ y 1 nF. ¿Tiempo de subida (del 10 al 90 %), en µs?', 4.84, 'µs', 'tr = 2,2 · R · C = 2,2 × 2200 × 0,000000001 = 0,00000484 s = 4,84 µs.', { tol: 0.05, c: 'ba_rise', h: 'tr = 2,2 · R · C, con todo en unidades base.', l: 'f9' }),
    Q('Quieres ver bien flancos de unos 5 ns. ¿Qué osciloscopio eliges?', ['Uno de 350 MHz: su subida propia es de 1 ns', 'Uno de 20 MHz', 'Uno de 70 MHz: su subida propia es de 5 ns', 'Cualquiera: el flanco es el que es'], 'Su subida propia es 0,35 / ancho de banda. Para no deformar un flanco de 5 ns, el aparato debe ser unas 3–5 veces más rápido: 1–1,7 ns, unos 200–350 MHz.', { c: 'ba_rise', h: 'Calcula la subida propia de cada uno con 0,35 / ancho de banda y compárala con 5 ns.', l: 'f9' }),
    Nm('Una senoide de 400 Hz va 60° por detrás de otra. ¿Cuántos µs separan sus cruces por cero?', 417, 'µs', 'T = 1 / 400 = 2,5 ms = 2500 µs. Δt = T · φ / 360° = 2500 × 60 / 360 ≈ 417 µs.', { tol: 3, c: 'ba_phasemeas', h: 'Despeja Δt de φ = 360° · Δt / T.', l: 'f9' }),
    Q('Pasas la sonda de ×1 a ×10, pero olvidas poner el canal del osciloscopio en ×10. Una señal de 5 V se ve como…', ['0,5 V: la sonda divide entre 10 y nadie lo compensa', '50 V', '5 V', '0,05 V'], 'La sonda ×10 entrega la décima parte. Si el canal no sabe que debe multiplicar por 10, la pantalla muestra 0,5 V.', { c: 'ba_probe', h: '¿Qué hace la sonda ×10 con la señal y quién lo compensa?', l: 'f9' }),
    // h9 · resonancia
    Nm('Quieres que una bobina de 100 µH resuene a 1 MHz. ¿Qué condensador necesitas, en pF?', 253, 'pF', 'C = 1 / ((2π · f₀)² · L) = 1 / ((6,283 × 10⁶)² × 0,0001) ≈ 2,53 × 10⁻¹⁰ F = 253 pF.', { tol: 3, c: 'ba_f0', h: 'Despeja C de f₀ = 1 / (2π√(LC)): C = 1 / ((2π · f₀)² · L).', l: 'h9' }),
    Q('Para bajar a la mitad la frecuencia de resonancia de un LC sin tocar la bobina, ¿qué haces con el condensador?', ['Multiplicarlo por 4', 'Multiplicarlo por 2', 'Dividirlo entre 2', 'Dividirlo entre 4'], 'f₀ va con 1 / √C: para dividir f₀ entre 2, √C debe doblarse, así que C se multiplica por 4.', { c: 'ba_f0', h: 'f₀ depende de la raíz de C: ¿qué factor de C dobla su raíz?', l: 'h9' }),
    Nm('RLC serie con L = 1 mH, C = 10 nF y R = 10 Ω. ¿Factor de calidad Q?', 31.6, '', 'f₀ = 1 / (2π√(10⁻³ × 10⁻⁸)) ≈ 50,3 kHz. XL = 2π × 50 300 × 0,001 ≈ 316 Ω. Q = XL / R ≈ 31,6.', { tol: 0.6, c: 'ba_q', h: 'Calcula f₀, luego XL a esa frecuencia, y divide entre R.', l: 'h9' }),
    Q('Un LC en paralelo, colocado entre la señal de la antena y masa, deja llegar al amplificador solo la emisora sintonizada. ¿Por qué?', ['En resonancia su impedancia es máxima; el resto de frecuencias se van a masa a través de él', 'En resonancia es un cortocircuito a masa', 'Porque bloquea la continua', 'Porque amplifica la emisora'], 'Fuera de f₀, la bobina o el condensador tienen poca reactancia y desvían la señal a masa. Justo en f₀, el tanque presenta impedancia máxima y esa frecuencia se queda.', { c: 'ba_restype', h: '¿Cómo es la impedancia de un LC en paralelo en resonancia, y fuera de ella?', l: 'h9' }),
    // h10 · segundo orden
    Nm('Paso bajo de segundo orden con f₀ = 500 Hz. ¿Atenuación aproximada a 50 kHz, en dB (con signo)?', -80, 'dB', '50 kHz está dos décadas por encima: −40 dB por década × 2 = −80 dB (÷ 10 000).', { tol: 2, c: 'ba_order2', h: 'Cuenta décadas por encima de f₀; un segundo orden cae 40 dB en cada una.', l: 'h10' }),
    Q('Necesitas que, una década por encima del corte, la señal salga 100 veces más pequeña. ¿Qué filtro?', ['Uno de segundo orden: 40 dB por década', 'Un RC de primer orden', 'Uno de primer orden con Q alto', 'Cualquier paso alto'], '÷ 100 son 40 dB. Un primer orden solo da 20 dB por década (÷ 10); hace falta segundo orden.', { c: 'ba_order2', h: 'Pasa ÷ 100 a dB y compáralo con lo que cae cada orden por década.', l: 'h10' }),
    Nm('Un paso banda debe dejar pasar de 950 Hz a 1050 Hz. ¿Qué Q necesita?', 10, '', 'Ancho de banda: 1050 − 950 = 100 Hz, centrado en 1000 Hz. Q = f₀ / BW = 1000 / 100 = 10.', { tol: 0.3, c: 'ba_bandpass', h: 'Saca el ancho de banda y el centro, y usa BW = f₀ / Q.', l: 'h10' }),
    { t: 'match', q: 'Une cada tarea con el filtro que la resuelve.', pairs: [['Mandar solo los graves al altavoz de subgraves', 'Paso bajo'], ['Quitar el zumbido de 50 Hz y dejar el resto', 'Banda eliminada'], ['Quedarte con una sola emisora', 'Paso banda'], ['Quitar la continua y lo muy lento', 'Paso alto']], e: 'Los graves son lo lento (paso bajo); la continua y lo muy lento se quitan con un paso alto; una emisora es una franja estrecha (paso banda); el zumbido de 50 Hz se quita con una banda eliminada que deja todo lo demás.', c: 'ba_bandpass', h: 'Piensa en qué deja pasar cada filtro: lo lento, lo rápido, una franja o todo menos una franja.', l: 'h10' },
    // h11 · potencia en alterna
    Nm('Un compresor a 230 V consume 2,2 kW de potencia activa con cos φ = 0,8. ¿Corriente eficaz, en A?', 11.96, 'A', 'S = P / cos φ = 2200 / 0,8 = 2750 VA. I = S / V = 2750 / 230 ≈ 11,96 A.', { tol: 0.12, c: 'ba_pf', h: 'Calcula primero la aparente con el factor de potencia y luego divide entre la tensión.', l: 'h11' }),
    Nm('Una carga tiene P = 1200 W y Q = 500 var. ¿Factor de potencia?', 0.923, '', 'S = √(1200² + 500²) = 1300 VA. cos φ = P / S = 1200 / 1300 ≈ 0,923.', { tol: 0.005, c: 'ba_pf', h: 'Con el triángulo de potencias saca S y luego cos φ = P / S.', l: 'h11' }),
    Q('Dos aparatos dan los mismos 1000 W útiles a 230 V: uno con cos φ = 1 y otro con cos φ = 0,5. ¿Cuál necesita cables más gruesos?', ['El de cos φ = 0,5: pide el doble de corriente', 'El de cos φ = 1', 'Los dos igual: gastan los mismos vatios', 'Ninguno: el factor de potencia no afecta a los cables'], 'I = P / (V · cos φ): con 0,5 la corriente es el doble (unos 8,7 A frente a 4,3 A). Los cables tienen que aguantar esa corriente aunque parte no haga trabajo.', { c: 'ba_pf', h: 'Despeja I de P = V · I · cos φ para los dos casos.', l: 'h11' }),
    // h6 · transformadores
    Nm('Quieres 9 V a partir de 230 V con un primario de 2300 vueltas. ¿Cuántas vueltas lleva el secundario?', 90, 'vueltas', 'Ns = Np · Vs / Vp = 2300 × 9 / 230 = 90 vueltas.', { tol: 0.5, c: 'ba_xfmr', h: 'Las tensiones van en la misma proporción que las vueltas.', l: 'h6' }),
    Nm('Un transformador 230 V → 24 V alimenta una carga de 12 Ω. ¿Corriente aproximada en el primario, en mA?', 209, 'mA', 'Secundario: 24 / 12 = 2 A, 48 W. La potencia se conserva: Ip ≈ 48 / 230 ≈ 0,209 A = 209 mA.', { tol: 3, c: 'ba_xfmrpow', h: 'Calcula la potencia de la carga y piensa que entra la misma por el primario.', l: 'h6' }),
    Q('El secundario de un transformador da 15 V eficaces. ¿Qué tensión pico a pico ves con el osciloscopio?', ['Unos 42 V', 'Unos 21 V', '30 V', '15 V'], 'Pico: 15 × 1,414 ≈ 21,2 V. Pico a pico: el doble, unos 42,4 V.', { c: 'ba_rms', h: 'Pasa de eficaz a pico y luego a pico a pico.', l: 'h6' }),
    Q('Conectas el primario de un transformador de 12 V a una fuente de 12 V de continua. ¿Qué ocurre?', ['No da salida, y el primario, que solo tiene la resistencia del hilo, pide mucha corriente y se calienta', 'Da 12 V de continua en el secundario', 'Funciona igual que con alterna', 'Da el doble de tensión'], 'Con continua el campo no cambia y no induce nada en el secundario. Además, sin reactancia (XL = 0 a 0 Hz) la bobina del primario es casi un cable: la corriente solo la limita el hilo.', { c: 'ba_xfmr', h: 'Piensa en dos cosas: qué induce un campo fijo y cuánto vale XL en continua.', l: 'h6' }),
  ] });
})();
