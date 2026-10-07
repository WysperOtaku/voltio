/* Voltio · curso base, módulo 8: Corriente alterna
   Lote 3. VIZ propias: sine, duty, scope, rms, xc, logAxis, db, rcFilter (scopeTrigger ya existe).
   Generadores m7_*. Los conceptos que solo usa este módulo se amplían o se crean aquí. */
(() => {
  const { num, fR, fV, st, hbar, flowPath } = Widgets.H;
  const fH = f => f >= 1e6 ? num(f / 1e6, 2) + ' MHz' : f >= 1000 ? num(f / 1000, 2) + ' kHz' : num(f, f < 10 ? 2 : 0) + ' Hz';
  const fMs = ms => ms >= 1000 ? num(ms / 1000, 2) + ' s' : ms >= 1 ? num(ms, 2) + ' ms' : num(ms * 1000, 1) + ' µs';
  const FL = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  const CL = [0.01, 0.1, 1, 10];
  const lin = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  /* ================= VISUALIZACIONES ================= */
  Object.assign(Widgets.VIZ, {
    // Senoide en una ventana fija de 100 ms
    sine: {
      calc: p => ({ T: 1000 / p.f, Vpp: 2 * p.Vp, cyc: p.f / 10, f: p.f }),
      anim: true,
      svg: (p, o, t) => {
        const X = ms => 40 + 2.5 * ms, Y = v => 95 - 3 * v, pts = [];
        for (let i = 0; i <= 300; i++) { const ms = i / 3; pts.push([X(ms), Y(p.Vp * Math.sin(2 * Math.PI * p.f * ms / 1000))]); }
        const ms0 = (t * 20) % 100, v0 = p.Vp * Math.sin(2 * Math.PI * p.f * ms0 / 1000);
        const tE = Math.min(100, o.T);
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M40 30V160M40 95H292" ${st} stroke-width="1.3"/>
          <path d="M36 ${Y(p.Vp)}H292M36 ${Y(-p.Vp)}H292" stroke="var(--muted)" stroke-dasharray="3 4"/>
          <polyline points="${lin(pts)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <circle cx="${X(ms0).toFixed(1)}" cy="${Y(v0).toFixed(1)}" r="5" fill="var(--ice)"/>
          <path d="M40 172H${X(tE).toFixed(1)}" stroke="var(--ice)" stroke-width="2.5"/><path d="M40 167v10M${X(tE).toFixed(1)} 167v10" stroke="var(--ice)" stroke-width="2"/>
          <text x="${Math.max(44, X(tE) + 6).toFixed(1)}" y="176" class="vizsm">T = ${fMs(o.T)}</text>
          <text x="34" y="${Y(p.Vp) + 4}" text-anchor="end" class="vizsm">+${num(p.Vp, 0)}</text><text x="34" y="${Y(-p.Vp) + 4}" text-anchor="end" class="vizsm">−${num(p.Vp, 0)}</text>
          <text x="40" y="18" class="vizlab">${fH(p.f)} · ${num(o.cyc, 1)} ciclos en 100 ms · Vpp = ${fV(o.Vpp)}</text></svg>`;
      }
    },
    // Onda cuadrada de 5 V con ciclo de trabajo D, su media y un LED
    duty: {
      calc: p => { const Vh = p.Vh || 5; return { avg: Vh * p.D / 100, D: p.D }; },
      svg: (p, o) => {
        const Vh = p.Vh || 5, w = 52; let d = 'M30 100';
        for (let k = 0; k < 4; k++) { const x = 30 + k * w, h = w * p.D / 100; d += p.D <= 0 ? `H${x + w}` : p.D >= 100 ? `V40H${x + w}` : `V40H${x + h}V100H${x + w}`; }
        const ya = 100 - 60 * p.D / 100, b = p.D / 100;
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M30 100H245" stroke="var(--line)"/><path d="${d}" fill="none" stroke="var(--led)" stroke-width="3"/>
          <path d="M30 ${ya.toFixed(1)}H245" stroke="var(--ice)" stroke-width="2" stroke-dasharray="6 4"/><text x="26" y="44" text-anchor="end" class="vizsm">${num(Vh, 0)} V</text><text x="26" y="104" text-anchor="end" class="vizsm">0 V</text>
          <path d="M30 116H82" stroke="var(--muted)"/><path d="M30 112v8M82 112v8" stroke="var(--muted)"/><text x="56" y="130" text-anchor="middle" class="vizsm">periodo</text>
          <g transform="translate(272 70)"><circle r="24" fill="#FF3B30" opacity="${(b * 0.45).toFixed(2)}"/><circle r="11" fill="#FF3B30" style="filter:brightness(${(0.35 + 0.9 * b).toFixed(2)})"/></g>
          <text x="20" y="160" class="vizlab">En alto el ${num(p.D, 0)} % del tiempo · media ${fV(o.avg)}</text><text x="20" y="178" class="vizsm">línea azul: el valor medio = D · ${num(Vh, 0)} V</text></svg>`;
      }
    },
    // Pantalla de osciloscopio (10 × 8 divisiones) con una señal fija
    scope: {
      calc: p => { const sh = p.sh || 1, Vp = p.Vp || 2, f = p.f || 1000, span = sh === 1 ? 2 * Vp : Vp; const hdiv = span / p.vdiv; return { hdiv, cyc: 10 * p.tdiv * f / 1000, clip: hdiv > 8.01 ? 1 : 0 }; },
      svg: (p, o) => {
        const sh = p.sh || 1, Vp = p.Vp || 2, f = p.f || 1000, D = p.D || 50, dx = 26, dy = 16, y0 = sh === 1 ? 79 : 127;
        let g = ''; for (let i = 0; i <= 10; i++) g += `<path d="M${20 + i * dx} 15V143" stroke="var(--line)" stroke-width="${i === 5 ? 1.2 : 0.6}"/>`;
        for (let j = 0; j <= 8; j++) g += `<path d="M20 ${15 + j * dy}H280" stroke="var(--line)" stroke-width="${j === 4 ? 1.2 : 0.6}"/>`;
        let d = ''; for (let i = 0; i <= 260; i++) { const ms = i / dx * p.tdiv, ph = (ms * f / 1000) % 1, v = sh === 1 ? Vp * Math.sin(2 * Math.PI * ph) : (ph < D / 100 ? Vp : 0); const y = Math.max(13, Math.min(145, y0 - v / p.vdiv * dy)); d += (i ? 'L' : 'M') + (20 + i) + ' ' + y.toFixed(1); }
        return `<svg viewBox="0 0 300 185" class="viz"><rect x="20" y="15" width="260" height="128" fill="var(--board)" opacity=".9"/>${g}<path d="${d}" fill="none" stroke="var(--ok)" stroke-width="2.2"/>
          <text x="20" y="160" class="vizlab">${num(p.vdiv, 1)} V/div · ${num(p.tdiv, 2)} ms/div</text>
          <text x="20" y="178" class="vizsm">${o.clip ? 'La señal se sale de la pantalla: sube los V/div' : `Alto: ${num(o.hdiv, 1)} div · ${num(o.cyc, 1)} ciclos en pantalla`}</text></svg>`;
      }
    },
    // Valor eficaz de una senoide (1), cuadrada (2) o triangular (3)
    rms: {
      calc: p => { const k = p.s === 2 ? 1 : p.s === 3 ? 1 / Math.sqrt(3) : 1 / Math.SQRT2; return { Vrms: p.Vp * k, ratio: k }; },
      svg: (p, o) => {
        const wave = ph => p.s === 2 ? (ph < 0.5 ? 1 : -1) : p.s === 3 ? (ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4) : Math.sin(2 * Math.PI * ph), pts = [];
        for (let i = 0; i <= 200; i++) pts.push([30 + i * 1.2, 80 - 50 * wave((i / 100) % 1)]);
        const name = ['senoide', 'cuadrada', 'triangular'][p.s - 1], yr = 80 - 50 * o.ratio;
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M30 80H272" stroke="var(--line)"/><polyline points="${lin(pts)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <path d="M30 ${yr.toFixed(1)}H272" stroke="var(--ice)" stroke-width="2" stroke-dasharray="6 4"/><text x="276" y="${(yr + 4).toFixed(1)}" class="vizsm">ef.</text><text x="276" y="34" class="vizsm">pico</text>
          <text x="30" y="155" class="vizlab">${name} de ${num(p.Vp, 0)} V de pico → ${num(o.Vrms, 1)} V eficaces</text>
          <text x="30" y="174" class="vizsm">calienta igual que ${num(o.Vrms, 1)} V de continua (× ${num(o.ratio, 3)})</text></svg>`;
      }
    },
    // Reactancia de un condensador con un generador de 5 V eficaces
    xc: {
      calc: p => { const Xc = 1 / (2 * Math.PI * p.f * p.C * 1e-6); return { Xc, ImA: 5 / Xc * 1000 }; },
      svg: (p, o) => `<svg viewBox="0 0 300 190" class="viz">${flowPath('M60 65V30H240V70', o.ImA / 1000, 0.002)}${flowPath('M240 86V130H60V97', o.ImA / 1000, 0.002)}
        <circle cx="60" cy="81" r="16" ${st}/><path d="M50 81q5 -10 10 0t10 0" ${st}/><text x="20" y="85" class="vizsm">5 V</text>
        <path d="M222 70h36M222 86h36" stroke="currentColor" stroke-width="3.5"/><text x="266" y="82" class="vizsm">${num(p.C, 2)} µF</text>
        <text x="150" y="20" text-anchor="middle" class="vizlab">${fH(p.f)} · corriente ${o.ImA >= 1 ? num(o.ImA, 1) + ' mA' : num(o.ImA * 1000, 0) + ' µA'}</text>
        ${hbar(30, 176, 240, (Math.log10(o.Xc) + 1) / 7, 'var(--ice)', `Xc = ${fR(o.Xc)} (escala logarítmica)`)}</svg>`
    },
    // El mismo valor en un eje lineal y en uno logarítmico (1 Hz a 1 MHz)
    logAxis: {
      calc: p => ({ v: 10 ** p.e, e: p.e }),
      svg: (p, o) => {
        const L = v => 20 + 260 * v / 1e6, G = e => 20 + 260 * e / 6, labs = ['1', '10', '100', '1k', '10k', '100k', '1M'];
        let tl = ''; for (let k = 0; k <= 6; k++) tl += `<path d="M${G(k)} 112v10" stroke="currentColor"/><text x="${G(k)}" y="138" text-anchor="middle" class="vizsm">${labs[k]}</text>` + (k < 6 ? [2, 5].map(m => `<path d="M${G(k + Math.log10(m)).toFixed(1)} 114v6" stroke="var(--muted)"/>`).join('') : '');
        return `<svg viewBox="0 0 300 190" class="viz"><text x="20" y="22" class="vizlab">${fH(o.v)}</text>
          <text x="20" y="44" class="vizsm">lineal: de 0 a 1 MHz</text><path d="M20 62H280" ${st}/>${[0, 0.25, 0.5, 0.75, 1].map(f => `<path d="M${20 + 260 * f} 56v12" stroke="currentColor"/>`).join('')}<text x="20" y="82" class="vizsm">0</text><text x="280" y="82" text-anchor="end" class="vizsm">1M</text>
          <circle cx="${L(o.v).toFixed(1)}" cy="62" r="6" fill="var(--led)"/>
          <text x="20" y="104" class="vizsm">logarítmico: cada marca, ×10</text><path d="M20 117H280" ${st}/>${tl}<circle cx="${G(p.e).toFixed(1)}" cy="117" r="6" fill="var(--ice)"/>
          <text x="20" y="166" class="vizlab">log₁₀(${num(o.v, o.v < 10 ? 2 : 0)}) ≈ ${num(p.e, 2)}</text><text x="20" y="182" class="vizsm">en lineal, lo pequeño queda aplastado contra el 0</text></svg>`;
      }
    },
    // Relación de tensiones → decibelios
    db: {
      calc: p => ({ dB: 20 * Math.log10(p.r), r: p.r }),
      svg: (p, o) => {
        const X = d => 30 + 240 * (d + 40) / 100;
        return `<svg viewBox="0 0 300 180" class="viz"><rect x="30" y="30" width="40" height="16" rx="3" fill="var(--muted)"/><text x="76" y="43" class="vizsm">entra 1 V</text>
          <rect x="30" y="56" width="${Math.max(2, Math.min(240, 40 * p.r)).toFixed(1)}" height="16" rx="3" fill="var(--led)"/><text x="30" y="88" class="vizsm">sale ${num(p.r, p.r < 1 ? 3 : 0)} V (× ${num(p.r, 3)})${p.r * 40 > 240 ? ' →' : ''}</text>
          <path d="M30 128H270" ${st}/>${[-40, -20, 0, 20, 40, 60].map(d => `<path d="M${X(d)} 122v12" stroke="currentColor"/><text x="${X(d)}" y="150" text-anchor="middle" class="vizsm">${d > 0 ? '+' : ''}${d}</text>`).join('')}
          <circle cx="${X(Math.max(-40, Math.min(60, o.dB))).toFixed(1)}" cy="128" r="7" fill="var(--ice)"/>
          <text x="30" y="172" class="vizlab">${o.dB >= 0 ? '+' : '−'}${num(Math.abs(o.dB), 1)} dB = 20 · log₁₀(${num(p.r, 3)})</text></svg>`;
      }
    },
    // Filtro RC paso bajo (t = 1) o paso alto (t = 2) con su diagrama de Bode
    rcFilter: {
      calc: p => { const fc = 1 / (2 * Math.PI * p.R * p.C * 1e-6), x = p.f / fc, g = p.t === 2 ? x / Math.sqrt(1 + x * x) : 1 / Math.sqrt(1 + x * x); return { fc, g, dB: 20 * Math.log10(g) }; },
      svg: (p, o) => {
        const X = f => 45 + 60 * (Math.log10(f) - 1), Y = d => 35 + 1.8 * Math.min(60, -d), pts = [];
        for (let i = 0; i <= 120; i++) { const f = 10 ** (1 + 4 * i / 120), x = f / o.fc, g = p.t === 2 ? x / Math.sqrt(1 + x * x) : 1 / Math.sqrt(1 + x * x); pts.push([X(f), Y(20 * Math.log10(g))]); }
        const xc = X(o.fc), inR = o.fc >= 10 && o.fc <= 1e5;
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M45 30V145H285" ${st} stroke-width="1.4"/>
          ${[10, 100, 1000, 10000, 100000].map(f => `<path d="M${X(f)} 145v4" stroke="currentColor"/><text x="${X(f)}" y="160" text-anchor="${f === 100000 ? 'end' : 'middle'}" class="vizsm">${fH(f)}</text>`).join('')}
          ${[0, -20, -40, -60].map(d => `<text x="40" y="${Y(d) + 4}" text-anchor="end" class="vizsm">${d}</text><path d="M45 ${Y(d)}H285" stroke="var(--line)" stroke-width=".6"/>`).join('')}
          <polyline points="${lin(pts)}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          ${inR ? `<path d="M${xc.toFixed(1)} 30V145" stroke="var(--muted)" stroke-dasharray="4 4"/><text x="${xc.toFixed(1)}" y="27" text-anchor="middle" class="vizsm">fc</text>` : ''}
          <circle cx="${X(p.f).toFixed(1)}" cy="${Y(o.dB).toFixed(1)}" r="6" fill="var(--ice)"/>
          <text x="10" y="176" class="vizlab">${p.t === 2 ? 'Paso alto' : 'Paso bajo'} · fc = ${fH(o.fc)}</text><text x="10" y="189" class="vizsm">a ${fH(p.f)}: ${num(o.dB, 1)} dB (sale × ${num(o.g, 3)}) · eje en dB</text></svg>`;
      }
    }
  });

  /* ================= GENERADORES (con pista) ================= */
  const { pick, fmt, fR: gR, MC, N } = Gen.helpers;
  const gH = f => f >= 1000 ? fmt(f / 1000, 3) + ' kHz' : fmt(f, 3) + ' Hz';
  Gen.add('m7_period', () => {
    if (Math.random() < 0.5) { const f = pick([50, 60, 100, 250, 440, 1000, 2000, 20000]); return { ...N(`Una señal de ${gH(f)}. ¿Periodo, en ms?`, 1000 / f, 'ms', `T = 1 / f = 1 / ${f} s = ${fmt(1000 / f, 3)} ms.`, Math.max(0.001, 1000 / f * 0.01)), h: 'T = 1 / f. Con f en Hz sale en segundos: pásalo a ms (× 1000).' }; }
    const T = pick([0.5, 1, 2, 4, 5, 10, 20, 40]); return { ...N(`Un ciclo dura ${fmt(T)} ms. ¿Frecuencia, en Hz?`, 1000 / T, 'Hz', `f = 1 / T = 1 / ${fmt(T / 1000, 4)} s = ${fmt(1000 / T, 1)} Hz.`, Math.max(0.1, 1000 / T * 0.01)), h: 'f = 1 / T, con T en segundos.' };
  }, 'ba_period');
  Gen.add('m7_amp', () => {
    const v = pick([1.5, 3, 5, 10, 12, 17, 325]);
    if (Math.random() < 0.5) return { ...N(`Una senoide tiene ${fmt(v)} V de pico. ¿Tensión pico a pico, en V?`, 2 * v, 'V', `Vpp = 2 · Vp = ${fmt(2 * v)} V: de lo más bajo a lo más alto.`, 0.01), h: 'Pico a pico va de −Vp a +Vp.' };
    return { ...N(`Una senoide mide ${fmt(2 * v)} V pico a pico. ¿Tensión de pico, en V?`, v, 'V', `Vp = Vpp / 2 = ${fmt(v)} V.`, 0.01), h: 'El pico es la mitad del pico a pico.' };
  }, 'ba_amp');
  Gen.add('m7_duty', () => {
    const r = Math.random();
    if (r < 0.34) { const [hi, T] = pick([[1, 4], [2, 8], [3, 4], [1, 10], [5, 20], [0.5, 2]]); return { ...N(`Una onda cuadrada está ${fmt(hi)} ms en alto en cada periodo de ${fmt(T)} ms. ¿Ciclo de trabajo, en %?`, hi / T * 100, '%', `D = tiempo en alto / periodo = ${fmt(hi)} / ${fmt(T)} = ${fmt(hi / T * 100, 1)} %.`, 0.5), h: 'Divide el tiempo en alto entre el periodo completo.' }; }
    const V = pick([3.3, 5, 9, 12]), D = pick([10, 20, 25, 40, 50, 75, 80]);
    if (r < 0.67) return { ...N(`PWM de ${fmt(V)} V con un ciclo de trabajo del ${D} %. ¿Tensión media, en V?`, V * D / 100, 'V', `Media = D · Valto = ${D / 100} × ${fmt(V)} = ${fmt(V * D / 100, 2)} V.`, 0.02), h: 'La media es la tensión alta por la fracción de tiempo que está en alto.' };
    return { ...N(`Quieres ${fmt(V * D / 100, 2)} V de media con un PWM de ${fmt(V)} V. ¿Ciclo de trabajo, en %?`, D, '%', `D = media / Valto = ${fmt(V * D / 100, 2)} / ${fmt(V)} = ${D} %.`, 0.5), h: 'Despeja D de media = D · Valto.' };
  }, 'ba_duty');
  Gen.add('m7_scope', () => {
    if (Math.random() < 0.5) { const vd = pick([0.5, 1, 2, 5]), dv = pick([2, 3, 4, 5, 6]); return { ...N(`El osciloscopio está a ${fmt(vd)} V/div y la señal ocupa ${dv} divisiones de alto, pico a pico. ¿Cuántos voltios pico a pico son?`, vd * dv, 'V', `${dv} div × ${fmt(vd)} V/div = ${fmt(vd * dv)} V.`, 0.01), h: 'Cuenta divisiones y multiplica por los V/div.' }; }
    const td = pick([0.1, 0.2, 0.5, 1, 2]), dc = pick([2, 4, 5, 8]), T = td * dc; return { ...N(`A ${fmt(td)} ms/div, un ciclo ocupa ${dc} divisiones. ¿Frecuencia, en Hz?`, 1000 / T, 'Hz', `T = ${dc} × ${fmt(td)} ms = ${fmt(T)} ms → f = 1 / T = ${fmt(1000 / T, 1)} Hz.`, 1000 / T * 0.01), h: 'Primero el periodo (divisiones × ms/div) y luego f = 1 / T.' };
  }, 'ba_scaleread');
  Gen.add('m7_vrms', () => {
    if (Math.random() < 0.5) { const vp = pick([10, 14.1, 325, 5, 170, 17]); return { ...N(`Una senoide tiene ${fmt(vp)} V de pico. ¿Valor eficaz, en V?`, vp / Math.SQRT2, 'V', `Vrms = Vp / √2 ≈ Vp × 0,707 = ${fmt(vp / Math.SQRT2, 1)} V.`, vp * 0.01), h: 'En una senoide, el eficaz es el pico entre √2 (≈ × 0,707).' }; }
    const vr = pick([12, 24, 230, 9, 6]); return { ...N(`Un multímetro en V~ marca ${vr} V en una senoide. ¿Tensión de pico, en V?`, vr * Math.SQRT2, 'V', `Vp = Vrms × √2 ≈ ${fmt(vr * Math.SQRT2, 1)} V.`, vr * 0.015), h: 'El multímetro da el eficaz: multiplica por √2 (≈ 1,414) para el pico.' };
  }, 'ba_rms');
  Gen.add('m7_xc', () => {
    const f = pick([50, 100, 1000, 10000]), C = pick([0.01, 0.1, 1, 10]); const x = 1 / (2 * Math.PI * f * C * 1e-6);
    return { ...N(`¿Reactancia de un condensador de ${fmt(C)} µF a ${gH(f)}, en Ω?`, x, 'Ω', `Xc = 1 / (2π · ${f} · ${fmt(C)}·10⁻⁶) ≈ ${fmt(x, 1)} Ω.`, x * 0.03), h: 'Xc = 1 / (2π · f · C), con f en Hz y C en faradios.' };
  }, 'ba_xc');
  Gen.add('m7_log10', () => {
    const [n, s] = pick([[10, '10'], [100, '100'], [1000, '1000'], [0.1, '0,1'], [0.01, '0,01'], [1, '1'], [1e5, '100 000'], [2, '2'], [5, '5']]);
    return { ...N(`¿Cuánto vale log₁₀(${s})?`, Math.log10(n), '', `¿10 elevado a cuánto da ${s}? ${n === 2 ? 'Casi 0,3 (10^0,3 ≈ 2).' : n === 5 ? 'Casi 0,7 (10^0,7 ≈ 5).' : `A ${fmt(Math.log10(n))}.`}`, n === 2 || n === 5 ? 0.02 : 0.01), h: n === 2 || n === 5 ? 'Recuerda: el 2 queda al 30 % de la década y el 5 al 70 %.' : 'Cuenta los ceros: el logaritmo de una potencia de 10 es su exponente.' };
  }, 'ba_log10');
  Gen.add('m7_db', () => {
    const [r, d] = pick([[10, 20], [100, 40], [2, 6], [0.5, -6], [0.1, -20], [1000, 60], [0.707, -3], [0.01, -40], [4, 12]]);
    if (Math.random() < 0.6) return MC(`Una señal sale ${fmt(r)} veces lo que entra (en tensión). ¿Cuántos dB son?`, `${d} dB`, [`${d / 2} dB`, `${d * 2} dB`, `${-d} dB`, `${fmt(r)} dB`], `dB = 20 · log₁₀(${fmt(r)}) ≈ ${d} dB.`, { h: '×10 son 20 dB, ×2 unos 6 dB; si sale menos de lo que entra, es negativo.' });
    return MC(`Un filtro da ${d} dB a cierta frecuencia. ¿Cuántas veces cambia la tensión?`, `× ${fmt(r)}`, [`× ${fmt(1 / r)}`, `× ${fmt(r * r)}`, `× ${fmt(Math.abs(d))}`], `${d} dB = 20 · log₁₀(x) → x = 10^(${d}/20) ≈ ${fmt(r)}.`, { h: 'Cada 20 dB es ×10 en tensión; cada 6 dB, ×2. El signo menos divide.' });
  }, 'ba_db');
  Gen.add('m7_fc', () => {
    const R = pick([1000, 1600, 4700, 10000, 16000]), C = pick([0.01, 0.1, 1]); const f = 1 / (2 * Math.PI * R * C * 1e-6);
    return { ...N(`Filtro RC con ${gR(R)} y ${fmt(C)} µF. ¿Frecuencia de corte, en Hz?`, f, 'Hz', `fc = 1 / (2π · R · C) = 1 / (2π × ${R} × ${fmt(C)}·10⁻⁶) ≈ ${fmt(f, 0)} Hz.`, f * 0.03), h: 'fc = 1 / (2π · R · C): R en ohmios y C en faradios.' };
  }, 'ba_fc');

  /* ================= SVG DE LAS TARJETAS ================= */
  const S = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" class="viz">${inner}</svg>`;
  const t = (x, y, s, cls = 'vizsm', a = 'middle', more = '') => `<text x="${x}" y="${y}" text-anchor="${a}" class="${cls}" ${more}>${s}</text>`;
  const sinePts = (x0, w, y0, a, n = 2) => { const p = []; for (let i = 0; i <= 120; i++) p.push([x0 + w * i / 120, y0 - a * Math.sin(2 * Math.PI * n * i / 120)]); return lin(p); };
  const dcacSVG = S(300, 150, `${t(75, 18, 'continua', 'vizlab')}<path d="M10 75H140" stroke="var(--line)"/><path d="M10 45H140" stroke="var(--ice)" stroke-width="3"/>${t(75, 110, 'siempre el mismo sentido')}${t(225, 18, 'alterna', 'vizlab')}<path d="M160 75H290" stroke="var(--line)"/><polyline points="${sinePts(160, 130, 75, 30)}" fill="none" stroke="var(--led)" stroke-width="3"/>${t(225, 125, 'cambia de sentido sin parar')}<path d="M160 140H290" class="a-flow" stroke="var(--led)" stroke-width="2"/><path d="M290 145H160" class="a-flow-rev" stroke="var(--ice)" stroke-width="2"/>`);
  const periodSVG = S(300, 150, `<path d="M20 75H285" stroke="var(--line)"/><polyline points="${sinePts(30, 240, 75, 45)}" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M30 135H150" stroke="var(--ice)" stroke-width="2.5"/><path d="M30 129v12M150 129v12" stroke="var(--ice)" stroke-width="2"/>${t(90, 128, 'periodo T: un ciclo')}${t(220, 140, 'f = 1 / T (en hercios)', 'vizlab')}`);
  const ampSVG = S(300, 150, `<path d="M20 75H210" stroke="var(--line)"/><polyline points="${sinePts(20, 190, 75, 50, 1.5)}" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M230 25V75" stroke="var(--ice)" stroke-width="3"/><path d="M262 25V125" stroke="var(--ok)" stroke-width="3"/>${t(236, 52, 'Vp', 'vizlab', 'start')}${t(268, 80, 'Vpp', 'vizlab', 'start')}<path d="M210 25H270M210 125H270" stroke="var(--muted)" stroke-dasharray="3 3"/>${t(150, 146, 'Vpp = 2 · Vp')}`);
  const plugSVG = S(300, 140, `<rect x="30" y="25" width="90" height="90" rx="20" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="58" cy="70" r="8" fill="currentColor"/><circle cx="92" cy="70" r="8" fill="currentColor"/>${t(200, 45, '230 V', 'vizlab')}${t(200, 65, '50 Hz: 50 ciclos por segundo')}${t(200, 88, 'T = 20 ms')}<path d="M150 112H280" stroke="var(--err)" stroke-width="3"/>${t(215, 132, 'peligrosa: no se toca', 'vizsm', 'middle', 'style="fill:var(--err)"')}`);
  const squareSVG = S(300, 140, `<path d="M20 100H40V40H100V100H160V40H220V100H280" fill="none" stroke="var(--led)" stroke-width="3"/>${t(70, 32, 'alto')}${t(130, 118, 'bajo')}<path d="M40 128H160" stroke="var(--ice)" stroke-width="2"/>${t(100, 138, 'periodo')}`);
  const dSVG = S(300, 140, `<path d="M20 100H40V40H70V100H160V40H190V100H280" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M40 118H70" stroke="var(--ok)" stroke-width="3"/><path d="M40 128H160" stroke="var(--ice)" stroke-width="2"/>${t(55, 112, 'alto')}${t(100, 138, 'periodo')}${t(230, 30, 'D = alto / periodo', 'vizlab')}${t(230, 50, '= 1/4 = 25 %')}`);
  const avgSVG = S(300, 140, `<path d="M20 100H40V40H70V100H160V40H190V100H280" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M20 85H280" stroke="var(--ice)" stroke-width="2.5" stroke-dasharray="6 4"/>${t(12, 44, '5 V', 'vizsm', 'start')}${t(230, 80, 'media = 25 % de 5 V', 'vizsm')}${t(150, 128, 'media = D · Valto = 1,25 V', 'vizlab')}`);
  const pwmUseSVG = S(300, 140, `<g transform="translate(60 60)"><circle r="26" fill="#FF3B30" opacity=".18"/><circle r="12" fill="#FF3B30" class="a-fade"/></g>${t(60, 112, 'LED: el ojo promedia')}<g transform="translate(220 60)" class="a-spin"><circle r="24" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M0 -24V24M-24 0H24" stroke="currentColor" stroke-width="2"/></g>${t(220, 112, 'motor: su inercia promedia')}${t(150, 134, 'encender y apagar deprisa: casi no se calienta nada')}`);
  const screenSVG = S(300, 160, `<rect x="20" y="10" width="260" height="120" rx="6" fill="var(--board)"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<path d="M${20 + i * 26} 10V130" stroke="#2A3755" stroke-width=".8"/>`).join('')}${[1, 2, 3, 4, 5].map(j => `<path d="M20 ${10 + j * 20}H280" stroke="#2A3755" stroke-width=".8"/>`).join('')}<polyline points="${sinePts(20, 260, 70, 40, 2.5)}" fill="none" stroke="var(--ok)" stroke-width="2.4" class="a-draw" style="--len:600"/>${t(150, 148, 'vertical: voltios · horizontal: tiempo')}`);
  const vdivSVG = S(300, 150, `<rect x="40" y="10" width="200" height="120" fill="var(--board)"/>${[1, 2, 3, 4, 5].map(j => `<path d="M40 ${10 + j * 20}H240" stroke="#2A3755"/>`).join('')}<path d="M40 110H90V30H140V110H190V30H240" fill="none" stroke="var(--ok)" stroke-width="2.4"/><path d="M255 30V110" stroke="var(--led)" stroke-width="2.5"/>${t(262, 66, '4 div', 'vizsm', 'start')}${t(262, 82, '× 1 V', 'vizsm', 'start')}${t(150, 146, '4 divisiones × 1 V/div = 4 V', 'vizlab')}`);
  const tdivSVG = S(300, 150, `<rect x="20" y="10" width="260" height="100" fill="var(--board)"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<path d="M${20 + i * 26} 10V110" stroke="#2A3755"/>`).join('')}<polyline points="${sinePts(20, 260, 60, 35, 2.5)}" fill="none" stroke="var(--ok)" stroke-width="2.4"/><path d="M20 124H124" stroke="var(--led)" stroke-width="2.5"/><path d="M20 118v12M124 118v12" stroke="var(--led)" stroke-width="2"/>${t(72, 142, '4 div × 1 ms = 4 ms', 'vizlab')}${t(220, 142, 'f = 250 Hz', 'vizlab')}`);
  const bulbsSVG = S(300, 140, `<g transform="translate(70 55)"><circle r="30" fill="var(--led)" opacity=".35"/><circle r="16" fill="var(--led)"/></g>${t(70, 110, '7,07 V de continua')}<g transform="translate(230 55)"><circle r="30" fill="var(--led)" opacity=".35"/><circle r="16" fill="var(--led)"/></g>${t(230, 110, 'senoide de 10 V de pico')}${t(150, 60, '=', 'vizbig', 'middle', 'style="font-size:28px"')}${t(150, 134, 'calientan y brillan igual: 7,07 V eficaces')}`);
  const rmsSVG = S(300, 140, `<path d="M20 75H285" stroke="var(--line)"/><polyline points="${sinePts(20, 265, 75, 55, 1.5)}" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M20 36H285" stroke="var(--ice)" stroke-dasharray="6 4" stroke-width="2"/>${t(282, 16, 'pico 325 V', 'vizsm', 'end')}${t(282, 32, 'eficaz 230 V', 'vizsm', 'end', 'style="fill:var(--ice)"')}${t(150, 134, 'Vrms = Vp / √2 ≈ 0,707 · Vp', 'vizlab')}`);
  const meterSVG = S(300, 140, `<rect x="100" y="10" width="100" height="120" rx="14" fill="#F2A900"/><rect x="112" y="22" width="76" height="34" rx="4" fill="#C9D8C5"/>${t(150, 46, '230,4', 'vizbig', 'middle', 'style="fill:#14213D;font-size:18px"')}${t(150, 80, 'V~', 'vizlab', 'middle', 'style="fill:#14213D"')}${t(150, 104, 'mide el eficaz', 'vizsm', 'middle', 'style="fill:#14213D"')}`);
  const mainsSVG = S(300, 140, `<path d="M20 70H285" stroke="var(--line)"/><polyline points="${sinePts(20, 265, 70, 55, 1)}" fill="none" stroke="var(--err)" stroke-width="3"/>${t(30, 18, '+325 V', 'vizsm', 'start')}${t(30, 134, '−325 V', 'vizsm', 'start')}${t(230, 40, '230 V eficaces', 'vizlab')}${t(230, 112, '650 V pico a pico', 'vizlab')}`);
  const capACSVG = S(300, 140, `<circle cx="50" cy="70" r="18" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M40 70q5 -10 10 0t10 0" ${st}/><path d="M50 52V25H200V60M200 80V115H50V88" ${st}/><path d="M50 25H200" class="a-flow" stroke="var(--led)" stroke-width="2"/><path d="M200 115H50" class="a-flow-rev" stroke="var(--led)" stroke-width="2"/><path d="M182 60h36M182 80h36" stroke="currentColor" stroke-width="3.5"/><text x="226" y="58" class="vizsm a-blink" style="fill:var(--err)">+ + +</text><text x="226" y="92" class="vizsm a-blink a-d3" style="fill:var(--ice)">− − −</text>${t(150, 136, 'se carga y descarga: la corriente va y viene')}`);
  const xcSVG = S(300, 120, `${t(150, 40, 'Xc = 1 / (2π · f · C)', 'vizbig', 'middle', 'style="font-size:22px"')}${t(80, 78, 'más frecuencia → menos Xc')}${t(220, 78, 'más capacidad → menos Xc')}${t(150, 104, 'en continua (f = 0): infinita')}`);
  const axesSVG = S(300, 140, `${t(20, 20, 'lineal: cada marca suma', 'vizsm', 'start')}<path d="M20 40H280" ${st}/>${[0, 1, 2, 3, 4].map(i => `<path d="M${20 + i * 65} 34v12" stroke="currentColor"/>${t(20 + i * 65, 62, String(i * 25))}`).join('')}${t(20, 90, 'logarítmica: cada marca multiplica', 'vizsm', 'start')}<path d="M20 108H280" ${st}/>${['1', '10', '100', '1000', '10 000'].map((s, i) => `<path d="M${20 + i * 65} 102v12" stroke="currentColor"/>${t(20 + i * 65, 130, s)}`).join('')}`);
  const logSVG = S(300, 120, `${t(150, 34, 'log₁₀(1000) = 3', 'vizbig', 'middle', 'style="font-size:22px"')}${t(150, 62, 'porque 10³ = 1000')}${t(150, 86, 'log₁₀(0,01) = −2 · log₁₀(1) = 0')}${t(150, 108, '«¿10 elevado a cuánto da este número?»')}`);
  const decadeSVG = S(300, 110, `<path d="M20 50H280" ${st}/><path d="M20 42v16M280 42v16" stroke="currentColor"/>${[2, 3, 4, 5, 6, 7, 8, 9].map(m => `<path d="M${(20 + 260 * Math.log10(m)).toFixed(1)} 44v12" stroke="var(--muted)"/>`).join('')}<circle cx="${(20 + 260 * Math.log10(2)).toFixed(1)}" cy="50" r="5" fill="var(--led)"/><circle cx="${(20 + 260 * Math.log10(5)).toFixed(1)}" cy="50" r="5" fill="var(--ice)"/>${t(20, 76, '1 k')}${t(280, 76, '10 k')}${t(98, 30, '2 k: 30 %')}${t(202, 30, '5 k: 70 %')}${t(150, 100, 'log(2) ≈ 0,3 · log(5) ≈ 0,7')}`);
  const loglogSVG = S(300, 150, `<path d="M40 15V125H285" ${st} stroke-width="1.5"/><path d="M40 25L285 120" stroke="var(--ice)" stroke-width="3"/>${[0, 1, 2, 3].map(i => `<text x="${40 + i * 80}" y="140" text-anchor="middle" class="vizsm">${['10', '100', '1k', '10k'][i]} Hz</text>`).join('')}${t(180, 54, 'Xc de 1 µF', 'vizsm', 'start', 'style="fill:var(--ice)"')}${t(180, 70, '×10 en f → ÷10 en Xc', 'vizsm', 'start')}${t(36, 22, '16 k', 'vizsm', 'end')}${t(36, 122, '16', 'vizsm', 'end')}`);
  const dbIdeaSVG = S(300, 120, `${t(150, 34, 'dB = 20 · log₁₀(Vsal / Vent)', 'vizbig', 'middle', 'style="font-size:20px"')}${t(80, 70, '×1000 → +60 dB')}${t(220, 70, '÷1000 → −60 dB')}${t(150, 104, 'números enormes y diminutos, en una escala cómoda')}`);
  const dbTableSVG = S(300, 150, `${[['× 100', '+40 dB'], ['× 10', '+20 dB'], ['× 2', '≈ +6 dB'], ['× 1', '0 dB'], ['× 0,707', '≈ −3 dB'], ['× 0,5', '≈ −6 dB'], ['× 0,1', '−20 dB']].map(([a, b], i) => `${t(110, 20 + i * 19, a, 'vizlab', 'end')}${t(130, 20 + i * 19, '→')}${t(150, 20 + i * 19, b, 'vizlab', 'start', i > 3 ? 'style="fill:var(--ice)"' : '')}`).join('')}`);
  const chainSVG = S(300, 110, `<rect x="20" y="30" width="70" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>${t(55, 55, '× 10')}<rect x="130" y="30" width="70" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>${t(165, 55, '× 100')}<path d="M5 50H20M90 50H130M200 50H230" stroke="currentColor" stroke-width="2"/>${t(55, 88, '20 dB', 'vizlab')}${t(165, 88, '40 dB', 'vizlab')}${t(262, 55, '× 1000', 'vizlab')}${t(262, 88, '= 60 dB', 'vizlab')}`);
  const pdbSVG = S(300, 110, `${t(150, 34, 'potencia: dB = 10 · log₁₀(Psal / Pent)', 'vizlab')}${t(150, 62, 'el doble de potencia ≈ +3 dB')}${t(150, 90, 'la mitad de potencia ≈ −3 dB = tensión × 0,707')}`);
  const lpSVG = S(300, 150, `<path d="M20 40H70M112 40H200M200 40H270M200 40V60M200 100V130H20" ${st}/><path d="M70 40l3 -6l6 12l6 -12l6 12l6 -12l6 12l6 -12l3 6" ${st}/><path d="M182 60h36M182 72h36" stroke="currentColor" stroke-width="3.5"/><path d="M200 72V100" ${st}/>${t(91, 25, 'R')}${t(232, 70, 'C', 'vizsm', 'start')}${t(20, 32, 'entra', 'vizsm', 'start')}${t(270, 32, 'sale', 'vizsm', 'end')}${t(150, 146, 'lo rápido «se escapa» a masa por C')}<path d="M200 40V60" class="a-flow" stroke="var(--led)" stroke-width="2"/>`);
  const hpSVG = S(300, 150, `<path d="M20 40H100M110 40H200H270M200 40V60M200 102V130H20" ${st}/><path d="M100 22v36M110 22v36" stroke="currentColor" stroke-width="3.5"/><path d="M200 60l-6 3l12 6l-12 6l12 6l-12 6l12 6l-12 6l6 3" ${st}/>${t(105, 16, 'C')}${t(214, 84, 'R', 'vizsm', 'start')}${t(150, 146, 'C en serie: bloquea la continua, deja pasar lo rápido')}`);
  const bodeSVG = S(300, 150, `<path d="M40 15V120H285" ${st} stroke-width="1.5"/><path d="M40 30H140Q160 30 170 40L280 112" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M155 15V120" stroke="var(--muted)" stroke-dasharray="4 4"/>${t(155, 135, 'fc: −3 dB (× 0,707)')}${t(36, 34, '0', 'vizsm', 'end')}${t(270, 80, '−20 dB por década', 'vizsm', 'end')}${t(50, 24, 'paso bajo', 'vizsm', 'start')}`);
  const slopeSVG = S(300, 140, `${[['1 kHz', '× 0,707'], ['10 kHz', '× 0,1'], ['100 kHz', '× 0,01']].map(([a, b], i) => `<rect x="${20 + i * 95}" y="30" width="80" height="60" rx="8" fill="none" stroke="var(--ice)" stroke-width="2"/>${t(60 + i * 95, 54, a, 'vizlab')}${t(60 + i * 95, 76, b)}`).join('')}${t(150, 115, 'paso bajo con fc = 1 kHz: −3, −20, −40 dB')}${t(150, 133, 'cada ×10 en frecuencia, ÷10 en tensión')}`);
  const modesSVG = S(300, 120, `${[['Auto', 'si no dispara, dibuja igual'], ['Normal', 'solo dibuja al disparar'], ['Single', 'una captura y se para']].map(([a, b], i) => `<rect x="10" y="${8 + i * 36}" width="70" height="28" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>${t(45, 27 + i * 36, a, 'vizlab')}${t(92, 27 + i * 36, b, 'vizsm', 'start')}`).join('')}`);
  const couplingSVG = S(300, 150, `${t(75, 18, 'DC: todo', 'vizlab')}<rect x="10" y="26" width="130" height="90" fill="var(--board)"/><path d="M10 104H140" stroke="#2A3755"/><path d="M10 40Q25 36 40 40T70 40T100 40T140 40" fill="none" stroke="var(--ok)" stroke-width="2"/>${t(75, 70, '5 V + variación', 'vizsm', 'middle', 'style="fill:#9AA7BF"')}${t(225, 18, 'AC: solo lo que varía', 'vizlab')}<rect x="160" y="26" width="130" height="90" fill="var(--board)"/><path d="M160 71H290" stroke="#2A3755"/><path d="M160 71Q175 41 190 71T220 71T250 71T290 71" fill="none" stroke="var(--ok)" stroke-width="2"/>${t(150, 140, 'AC = un condensador en serie: un filtro paso alto')}`);
  const gndSVG = S(300, 140, `<rect x="20" y="30" width="90" height="70" rx="8" fill="none" stroke="currentColor" stroke-width="2"/>${t(65, 70, 'osciloscopio')}<path d="M110 80H170" stroke="currentColor" stroke-width="2"/><path d="M110 80H170" stroke="var(--err)" stroke-width="2" class="a-flow"/><circle cx="174" cy="80" r="4" fill="currentColor"/>${t(175, 70, 'pinza de masa', 'vizsm', 'start')}<path d="M65 100V125M53 125h24M57 130h16M61 135h8" stroke="currentColor" stroke-width="2"/>${t(150, 128, 'unida a la tierra del enchufe', 'vizsm', 'start', 'style="fill:var(--err)"')}`);

  /* ================= CONCEPTOS ================= */
  const base = k => CONCEPTS[k] ? CONCEPTS[k].alts : [];
  const sineP = (o = {}) => ({ Vp: { label: 'Vp (pico)', val: 4, min: 1, max: 20, step: 1, unit: 'V', dec: 0 }, f: { label: 'Frecuencia', val: 20, min: 10, max: 200, step: 10, unit: 'Hz', dec: 0 }, ...o });
  const scopeP = (o = {}) => ({ vdiv: { label: 'V/div', val: 2, list: [0.5, 1, 2, 5], unit: 'V', dec: 1 }, tdiv: { label: 'Tiempo/div', val: 1, list: [0.1, 0.2, 0.5, 1, 2], unit: 'ms', dec: 1 }, ...o });
  const filtP = (o = {}) => ({ R: { label: 'R', val: 10000, fmt: 'R', min: 100, max: 100000 }, C: { label: 'C', val: 1, list: CL, unit: 'µF', dec: 2 }, f: { label: 'Frecuencia de la señal', val: 100, list: FL, unit: 'Hz', dec: 0 }, t: { label: 'Tipo (1 = paso bajo, 2 = paso alto)', val: 1, list: [1, 2], dec: 0 }, ...o });
  Object.assign(CONCEPTS, {
    ba_period: { name: 'Periodo y frecuencia', alts: [
      { title: 'Cuenta los ciclos', text: 'La ventana dura 100 ms. Sube la frecuencia: caben más ciclos y cada uno dura menos. <b>T = 1 / f</b>: a 50 Hz, 5 ciclos en 100 ms y 20 ms cada uno.', tune: { viz: 'sine', params: sineP() }, q: mcq('Una señal de 500 Hz. ¿Periodo?', ['2 ms', '0,5 ms', '500 ms', '20 ms'], 'T = 1 / 500 s = 0,002 s.') },
      ...base('ba_period')
    ] },
    ba_amp: { name: 'Pico y pico a pico', alts: [
      { title: 'Dos formas de medir lo alta que es', text: 'El <b>pico</b> (Vp) va de 0 a lo más alto. El <b>pico a pico</b> (Vpp) va de lo más bajo a lo más alto: <b>Vpp = 2 · Vp</b>.', svg: ampSVG, q: mcq('Una senoide de 6 V de pico. ¿Vpp?', ['12 V', '6 V', '3 V', '8,5 V'], '2 × 6.') },
      { title: 'Míralo moviendo el pico', text: 'Las líneas discontinuas marcan +Vp y −Vp. Entre ellas está el pico a pico.', tune: { viz: 'sine', params: sineP({ f: { val: 50, fixed: true } }) }, q: mcq('Una gráfica muestra 8 V de lo más bajo a lo más alto de una senoide. ¿Pico?', ['4 V', '8 V', '16 V', '2,8 V'], 'Vp = Vpp / 2.') }
    ] },
    ba_duty: { name: 'Ciclo de trabajo y valor medio', alts: [
      { title: 'Muévelo y mira la media', text: 'El ciclo de trabajo D es la parte del periodo que la señal está en alto. La media es <b>D · Valto</b>: con 5 V al 25 %, 1,25 V.', tune: { viz: 'duty', params: { D: { label: 'Ciclo de trabajo', val: 50, min: 0, max: 100, step: 5, unit: '%', dec: 0 } } }, q: mcq('PWM de 5 V al 40 %. ¿Media?', ['2 V', '4 V', '0,4 V', '5 V'], '0,4 × 5 = 2 V.') },
      { title: 'Con tiempos', text: 'Si la señal está 2 ms en alto y el periodo dura 8 ms, D = 2 / 8 = 25 %. No importa la frecuencia: lo que cuenta es la proporción del tiempo en alto.', svg: dSVG, q: mcq('3 ms en alto con un periodo de 4 ms. ¿D?', ['75 %', '25 %', '33 %', '133 %'], '3 / 4.') }
    ] },
    ba_scaleread: { name: 'Leer la pantalla del osciloscopio', alts: [
      { title: 'Ajusta tú las escalas', text: 'Cada cuadro vale lo que digan los mandos: <b>V/div</b> en vertical y <b>s/div</b> en horizontal. Cambia las escalas: la señal no cambia, cambia cuánto vale cada cuadro.', tune: { viz: 'scope', params: scopeP() }, q: mcq('2 V/div y la señal mide 3 divisiones de alto. ¿Amplitud pico a pico?', ['6 V', '1,5 V', '3 V', '5 V'], '3 × 2 V.') },
      { title: 'Del tiempo a la frecuencia', text: 'Para la frecuencia: cuenta las divisiones de un ciclo, multiplica por los s/div y tendrás el periodo; luego f = 1 / T. 5 divisiones a 0,2 ms/div → 1 ms → 1 kHz.', svg: tdivSVG, q: mcq('0,5 ms/div y un ciclo de 4 divisiones. ¿Frecuencia?', ['500 Hz', '2 kHz', '2 Hz', '250 Hz'], 'T = 2 ms → 500 Hz.') }
    ] },
    ba_rms: { name: 'Pico, pico a pico y eficaz', alts: [
      { title: 'Cambia la forma', text: 'El eficaz es la continua que calentaría igual. Depende de la forma: senoide × 0,707, cuadrada × 1, triangular × 0,577.', tune: { viz: 'rms', params: { Vp: { label: 'Pico', val: 10, min: 5, max: 400, step: 5, unit: 'V', dec: 0 }, s: { label: 'Forma (1 senoide, 2 cuadrada, 3 triangular)', val: 1, list: [1, 2, 3], dec: 0 } } }, q: mcq('Una senoide de 100 V de pico. ¿Eficaz?', ['Unos 71 V', '100 V', '141 V', '50 V'], '100 × 0,707.') },
      ...base('ba_rms')
    ] },
    ba_mainsrisk: { name: 'La red eléctrica y su peligro', alts: [
      { title: 'Más de lo que parece', text: 'Los 230 V del enchufe son eficaces: la tensión llega a ±325 V, 650 V de pico a pico, 50 veces por segundo. Con eso pasan por el cuerpo corrientes mortales. En este curso usamos pilas; la red no se toca.', svg: mainsSVG, q: mcq('¿Cuál es la tensión de pico de la red de 230 V?', ['Unos 325 V', '230 V', '115 V', '50 V'], '230 × 1,414 ≈ 325 V.') },
      { title: 'Por qué una pila no y la red sí', text: 'La corriente por el cuerpo depende de la tensión (ley de Ohm con la resistencia de tu piel). Con 9 V pasan microamperios; con 230 V, decenas de miliamperios: bastan para paralizar los músculos o parar el corazón. Por eso se trabaja con baja tensión y aparatos de enchufe cerrados.', q: mcq('¿Por qué es peligrosa la red y no una pila de 9 V?', ['Con 230 V tu cuerpo deja pasar decenas de mA', 'Porque la red es continua', 'Porque la pila tiene más energía', 'No lo es'], 'Más tensión, más corriente por la misma resistencia.') }
    ] },
    ba_xc: { name: 'Reactancia del condensador', alts: [
      { title: 'Cambia frecuencia y capacidad', text: 'Más frecuencia o más capacidad → menos reactancia → más corriente. <b>Xc = 1 / (2π · f · C)</b>.', tune: { viz: 'xc', params: { C: { label: 'C', val: 1, list: CL.concat(100), unit: 'µF', dec: 2 }, f: { label: 'Frecuencia', val: 1000, list: [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000], unit: 'Hz', dec: 0 } } }, q: mcq('Un condensador presenta 1 kΩ a 100 Hz. ¿Y a 1 kHz?', ['100 Ω', '10 kΩ', '1 kΩ', '1 Ω'], 'Diez veces más frecuencia, diez veces menos reactancia.') },
      ...base('ba_xc')
    ] },
    ba_logaxis: { name: 'Escalas logarítmicas', alts: [
      { title: 'Muévelo por los dos ejes', text: 'En el eje lineal, todo lo pequeño queda pegado al cero. En el logarítmico, cada década (×10) ocupa lo mismo: 10 Hz y 100 kHz caben juntos.', tune: { viz: 'logAxis', params: { e: { label: 'Valor (exponente de 10)', val: 2, min: 0, max: 6, step: 0.05, unit: '', dec: 2 } } }, q: mcq('¿Cuántas décadas hay de 1 Hz a 1 kHz?', ['3', '1000', '999', '2'], '1 → 10 → 100 → 1000.') },
      ...base('ba_logaxis')
    ] },
    ba_log10: { name: 'Logaritmo en base 10', alts: [
      { title: 'El exponente que falta', text: 'log₁₀(x) responde: ¿10 elevado a cuánto da x? log(1000) = 3, log(1) = 0, log(0,01) = −2.', svg: logSVG, q: mcq('¿Cuánto vale log₁₀(100)?', ['2', '10', '100', '0,01'], '10² = 100.') },
      ...base('ba_log10')
    ] },
    ba_loggraph: { name: 'Rectas en gráficas logarítmicas', alts: [
      { title: 'Una recta que baja', text: 'Con los dos ejes logarítmicos, la reactancia de un condensador frente a la frecuencia es una <b>recta</b> que baja una década por cada década: Xc es inversamente proporcional a f.', svg: loglogSVG, q: mcq('En log–log, una recta baja una década por cada década que avanza. ¿Qué relación es?', ['Inversamente proporcional', 'Directamente proporcional', 'Constante', 'Exponencial'], 'Pendiente −1: ×10 en x, ÷10 en y.') },
      ...base('ba_loggraph')
    ] },
    ba_db: { name: 'Decibelios', alts: [
      { title: 'Juega con la relación', text: 'Elige cuántas veces sale la señal respecto a lo que entra y mira los dB: ×10 → +20, ×2 → +6, × 0,707 → −3, × 0,1 → −20.', tune: { viz: 'db', params: { r: { label: 'Vsal / Vent', val: 1, list: [0.01, 0.1, 0.25, 0.5, 0.707, 1, 1.41, 2, 4, 10, 100, 1000], dec: 3 } } }, q: mcq('Una señal sale 1000 veces mayor en tensión. ¿dB?', ['60 dB', '30 dB', '1000 dB', '3 dB'], '20 × log(1000) = 20 × 3.') },
      ...base('ba_db')
    ] },
    ba_fc: { name: 'Frecuencia de corte de un RC', alts: [
      { title: 'Busca la fc', text: 'Cambia R y C y mira dónde cae la línea de fc: <b>fc = 1 / (2π · R · C)</b>. Más R o más C, fc más baja. En fc la salida es × 0,707: −3 dB.', tune: { viz: 'rcFilter', params: filtP() }, q: mcq('Filtro RC con 10 kΩ y 10 nF. ¿fc?', ['Unos 1,6 kHz', 'Unos 16 Hz', 'Unos 160 kHz', '100 Hz'], '1 / (2π × 10 000 × 10⁻⁸) ≈ 1592 Hz.') },
      { title: 'Donde R y Xc se igualan', text: 'fc es justo la frecuencia en la que la reactancia del condensador vale lo mismo que la resistencia. Por debajo manda una y por encima la otra. Ahí la salida queda en 0,707 de la entrada: −3 dB.', svg: bodeSVG, q: mcq('En la frecuencia de corte, la salida de un RC de primer orden es…', ['0,707 veces la entrada (−3 dB)', 'La mitad (−6 dB)', 'Cero', 'Igual que la entrada'], 'Es la definición de fc.') }
    ] },
    ba_lphp: { name: 'Paso bajo y paso alto', alts: [
      { title: 'Dónde va el condensador', text: '<b>Paso bajo</b>: R en serie y C a masa; el condensador «se come» lo rápido y deja pasar lo lento. <b>Paso alto</b>: C en serie y R a masa; bloquea la continua y deja pasar lo rápido.', svg: lpSVG, q: mcq('Un condensador en serie con la entrada de un amplificador de audio…', ['Bloquea la continua y deja pasar la señal', 'Amplifica', 'Bloquea el audio', 'No hace nada'], 'Es un paso alto: condensador de acoplo.') },
      { title: 'Cámbialo de tipo', text: 'Pon una frecuencia y cambia entre paso bajo (1) y paso alto (2): uno deja pasar justo lo que el otro frena.', tune: { viz: 'rcFilter', params: filtP({ R: { val: 1500, fixed: true }, C: { val: 0.1, fixed: true } }) }, q: mcq('Quieres quitar el ruido rápido de un sensor de temperatura. ¿Qué filtro?', ['Paso bajo', 'Paso alto', 'Ninguno', 'Los dos en serie'], 'La temperatura cambia despacio: deja pasar lo lento.') }
    ] },
    ba_rolloff: { name: 'Pendiente de un filtro (dB por década)', alts: [
      { title: 'Recórrela', text: 'Con un paso bajo de fc ≈ 1 kHz, mueve la frecuencia: a 10 kHz unos −20 dB, a 100 kHz unos −40 dB. Una recta de −20 dB por década.', tune: { viz: 'rcFilter', params: filtP({ R: { val: 1500, fixed: true }, C: { val: 0.1, fixed: true }, t: { val: 1, fixed: true } }) }, q: mcq('Un paso bajo de primer orden, dos décadas por encima de fc, atenúa unos…', ['40 dB', '20 dB', '6 dB', '3 dB'], '20 dB por cada década.') },
      { title: 'Con números', text: 'Por encima de fc, la salida de un RC baja en proporción a la frecuencia: ×10 en f, ÷10 en tensión. ÷10 son −20 dB; ÷100, −40 dB. Por eso se dice «20 dB por década».', svg: slopeSVG, q: mcq('Paso bajo con fc = 100 Hz. ¿Qué sale aproximadamente a 10 kHz?', ['La centésima parte (−40 dB)', 'La décima parte', 'La mitad', 'Todo'], 'Dos décadas por encima.') }
    ] },
    scope: { name: 'Disparo del osciloscopio', alts: [...base('scope')] },
    ba_coupling: { name: 'Acoplo AC y DC del osciloscopio', alts: [
      { title: 'Quitar lo fijo', text: 'En DC ves la señal entera: una pequeña variación sobre 5 V queda arriba del todo y diminuta. En AC un condensador quita los 5 V fijos y puedes ampliar solo lo que varía.', svg: couplingSVG, q: mcq('Quieres ver variaciones de 50 mV sobre 12 V. ¿Qué acoplo?', ['AC, con pocos mV/div', 'DC con 5 V/div', 'Da igual', 'Ninguno'], 'AC quita los 12 V y deja ampliar.') },
      ...base('ba_coupling')
    ] },
    ba_probegnd: { name: 'La pinza de masa de la sonda', alts: [
      { title: 'Va a tierra', text: 'En un osciloscopio de sobremesa, la pinza de masa está unida a la tierra del enchufe. Solo debe ir a la masa de tu circuito; si la pones en otro punto de algo unido a la red, haces un cortocircuito a través de la tierra.', svg: gndSVG, q: mcq('¿A qué está unida la pinza de masa de un osciloscopio de sobremesa?', ['A la tierra del enchufe', 'A nada', 'A la punta', 'Al positivo'], 'Por eso solo va a la masa del circuito.') },
      { title: 'Con pilas no hay problema', text: 'Si tu circuito va con pilas y no toca nada más, no está unido a la tierra: la pinza de masa no puede crear un cortocircuito. El riesgo aparece con circuitos alimentados directamente desde la red o con fuentes cuyo negativo va a tierra.', q: mcq('Tu circuito va con una pila y no toca nada más. ¿Hay riesgo al conectar la pinza de masa a su negativo?', ['No: el circuito está aislado de la tierra', 'Sí, siempre', 'Sí, si la pila es de 9 V', 'Solo con acoplo AC'], 'No hay camino entre la tierra y la pila.') }
    ] }
  });

  // Arregla frases de alternativas heredadas que nombraban cosas aún no vistas en esta parte del curso
  const fixAlt = (k, title, pairs) => { const a = CONCEPTS[k].alts.find(x => x.title === title); if (!a) return; const r = s => pairs.reduce((x, [f, t]) => x.split(f).join(t), s); a.text = r(a.text); if (a.q) { a.q.q = r(a.q.q); a.q.e = r(a.q.e); a.q.o = a.q.o.map(r); } };
  fixAlt('ba_loggraph', 'Con números', [['Semilog: la corriente de un diodo pasa de 1 µA a 10 µA y a 100 µA con saltos iguales de tensión (unas decenas de milivoltios cada uno): eso es crecer de forma exponencial.', 'Semilogarítmica (un eje log y otro lineal): si algo pasa de 1 a 10 y a 100 con saltos iguales en el eje lineal, crece de forma exponencial, como e^x.']]);
  fixAlt('ba_coupling', 'Quitar la continua', [['50 mV de rizado sobre 5 V', '50 mV de variación sobre 5 V'], ['el pequeño rizado de una fuente de 12 V', 'pequeñas variaciones sobre los 12 V de una fuente']]);
  fixAlt('ba_coupling', 'El acoplo AC es un paso alto', [['un rizado pequeño sobre mucha continua', 'una variación pequeña sobre mucha continua']]);
  /* ================= LECCIONES ================= */
  UNITS.push({ id: 'm7', title: 'Corriente alterna', desc: 'Senoides y ondas cuadradas, el osciloscopio, valor eficaz, reactancia, logaritmos, decibelios y filtros RC.', nodes: [
    L('h2', 'Qué es la alterna', 'bolt', ['ba_period', 'ba_amp'], [
      Q('La corriente que sale de un enchufe de casa, ¿va siempre en el mismo sentido?', ['No: cambia de sentido muchas veces por segundo', 'Sí, como la de una pila', 'Solo cambia cuando enciendes algo'], 'Es corriente alterna: va y viene 50 veces por segundo en Europa.', { predict: true, c: 'ba_period', h: 'No es una pila: piensa en el nombre «alterna».' }),
      I('En <b>continua</b> (pilas, baterías) la corriente va siempre en el mismo sentido. En <b>alterna</b>, la tensión sube, baja, se hace negativa y vuelve, una y otra vez: lo normal es que siga una <b>senoide</b>.', { svg: dcacSVG, more: 'La red usa alterna porque los transformadores, que verás en esta misma unidad, cambian su tensión con mucha facilidad, y así la energía se puede transportar lejos a alta tensión con pocas pérdidas.' }),
      { t: 'explore', text: 'La pantalla muestra 100 ms de una senoide. Cambia su pico y su frecuencia.', viz: 'sine', params: sineP(),
        tasks: [
          { q: 'cyc', min: 5, max: 5, text: 'Consigue exactamente 5 ciclos en pantalla', done: '5 ciclos en 100 ms son 50 por segundo: 50 Hz, la frecuencia de la red.', hint: 'Sube la frecuencia.' },
          { q: 'Vpp', min: 20, max: 20, text: 'Haz que mida 20 V de lo más bajo a lo más alto', done: 'Con 10 V de pico: de −10 a +10 hay 20 V.', hint: 'Mira las líneas de +Vp y −Vp.' },
          { q: 'T', min: 10, max: 10, text: 'Ahora que cada ciclo dure 10 ms', done: '100 ciclos por segundo: 100 Hz.', hint: 'Más frecuencia, ciclos más cortos.' }
        ] },
      I('Un ciclo completo dura el <b>periodo</b> T. Cuántos ciclos caben en un segundo es la <b>frecuencia</b> f, en <b>hercios</b> (Hz): <b>f = 1 / T</b>. Con prefijos: kHz, MHz.', { svg: periodSVG }),
      { t: 'steps', text: 'La red europea va a 50 Hz. ¿Cuánto dura cada ciclo?', svg: periodSVG, steps: ['Fórmula: <b>T = 1 / f</b>', 'T = 1 / 50 = 0,02 s', 'En ms (× 1000): <b>20 ms</b>'], result: '20 ms por ciclo' },
      Nm('Una señal de 1 kHz. ¿Periodo, en ms?', 1, 'ms', 'T = 1 / 1000 s = 1 ms.', { c: 'ba_period', h: '1 kHz son 1000 Hz: T = 1 / f.' }),
      G('m7_period'),
      I('Para la amplitud: el <b>pico</b> (Vp) va de 0 a lo más alto; el <b>pico a pico</b> (Vpp), de lo más bajo a lo más alto. <b>Vpp = 2 · Vp</b>.', { svg: ampSVG }),
      Q('Una senoide de 10 V de pico. ¿Vpp?', ['20 V', '10 V', '7,07 V', '5 V'], '2 × Vp.', { c: 'ba_amp', h: 'Va de −10 V a +10 V.' }),
      G('m7_amp'),
      I('La red de casa: <b>50 Hz</b> en Europa (60 Hz en América) y «230 V». Ese 230 V no es el pico: lo entenderás en la lección de valor eficaz. Es peligrosa: aquí solo se estudia, no se toca.', { svg: plugSVG }),
      Q('¿Cuántos ciclos por segundo hace la red europea?', ['50', '230', '60', '1'], '50 Hz.', { c: 'ba_period', h: 'Recuerda el primer reto.' }),
      Q('Duplicas la frecuencia de una señal. Su periodo…', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Se hace cero'], 'T = 1 / f.', { c: 'ba_period', h: 'Más ciclos por segundo, ¿cada uno dura más o menos?' }),
      I('<b>Resumen</b>\n· Alterna: la tensión sube y baja; lo típico, una senoide.\n· <b>f = 1 / T</b>, en hercios.\n· Vpp = 2 · Vp. Red europea: 50 Hz.')
    ]),
    L('h20', 'Ondas cuadradas, ciclo de trabajo y PWM', 'wave', ['ba_duty', 'ba_period'], [
      Q('Enciendes y apagas un LED 1000 veces por segundo, la mitad del tiempo encendido. ¿Qué crees que ves?', ['Un LED fijo, más flojo', 'Un parpadeo rapidísimo', 'Un LED apagado'], 'El ojo no sigue cambios tan rápidos: ve la media. Es la base del PWM.', { predict: true, c: 'ba_duty', h: '¿Puede tu ojo seguir mil cambios por segundo?' }),
      I('No todas las señales son senoides. Una <b>onda cuadrada</b> salta entre dos valores, <b>alto</b> y <b>bajo</b>. También tiene periodo y frecuencia.', { svg: squareSVG }),
      { t: 'explore', text: 'Una cuadrada de 5 V que alimenta un LED. Cambia la parte del tiempo que está en alto.', viz: 'duty', params: { D: { label: 'Tiempo en alto', val: 50, min: 0, max: 100, step: 5, unit: '%', dec: 0 } },
        tasks: [
          { q: 'avg', min: 1.24, max: 1.26, text: 'Pon el LED al 25 %', done: 'Una cuarta parte del tiempo en alto: media de 1,25 V.', hint: 'Baja el porcentaje.' },
          { q: 'avg', min: 3.74, max: 3.76, text: 'Consigue una media de 3,75 V', done: 'El 75 % de 5 V.', hint: '3,75 de 5 es tres cuartos.' },
          { q: 'avg', min: 0.49, max: 0.51, text: 'Y ahora solo 0,5 V de media', done: 'Un 10 % del tiempo: el LED casi apagado.', hint: '0,5 es la décima parte de 5.' }
        ] },
      I('El <b>ciclo de trabajo</b> D es la parte del periodo que la señal está en alto: <b>D = tiempo en alto / periodo</b>, en %.', { svg: dSVG }),
      { t: 'steps', text: 'Una cuadrada de 5 V está 2 ms en alto en cada periodo de 8 ms. ¿Ciclo de trabajo y tensión media?', svg: avgSVG, steps: ['D = 2 ms / 8 ms = 0,25 = <b>25 %</b>', 'Media = D · Valto', 'Media = 0,25 × 5 V = <b>1,25 V</b>'], result: '25 % y 1,25 V de media' },
      Nm('3 ms en alto con un periodo de 4 ms. ¿Ciclo de trabajo, en %?', 75, '%', '3 / 4 = 75 %.', { c: 'ba_duty', h: 'Divide el tiempo en alto entre el periodo.' }),
      I('El <b>valor medio</b> de la cuadrada es <b>D · Valto</b>: lo que marcaría un voltímetro de continua o lo que «nota» algo lento.', { svg: avgSVG }),
      G('m7_duty'),
      I('<b>PWM</b> (modulación por ancho de pulso): encender y apagar muy deprisa y cambiar D para regular la potencia media. El ojo o la inercia de un motor promedian. Y apenas calienta: el interruptor está o del todo encendido o del todo apagado.', { svg: pwmUseSVG, more: 'Un regulador «a lo bruto» con una resistencia se quemaría la energía sobrante; con PWM casi no se pierde nada. Lo usarás con el temporizador 555, los MOSFET y los microcontroladores.' }),
      Q('¿Por qué un LED con PWM rápido no parece parpadear?', ['El ojo no sigue cambios tan rápidos y ve la media', 'Porque el LED se queda encendido', 'Porque el PWM es continua', 'Sí parpadea a la vista'], 'Por encima de unos cien cambios por segundo, el ojo promedia.', { c: 'ba_duty', h: 'Piensa en lo que hace tu ojo con cambios muy rápidos.' }),
      Q('Un PWM al 100 %, ¿qué es?', ['Siempre en alto: como continua', 'Siempre apagado', 'La mitad del tiempo encendido', 'Una senoide'], 'Todo el periodo en alto.', { c: 'ba_duty', h: '100 % del periodo en alto…' }),
      Q('Duplicas la frecuencia de un PWM sin cambiar D. La tensión media…', ['No cambia', 'Se duplica', 'Se reduce a la mitad', 'Se hace cero'], 'La media depende de D, no de la frecuencia.', { c: 'ba_duty', h: 'Mira la fórmula de la media: ¿aparece la frecuencia?' }),
      Nm('Un motor de 12 V recibe PWM al 40 %. ¿Tensión media, en V?', 4.8, 'V', '0,4 × 12 = 4,8 V.', { c: 'ba_duty', h: 'Media = D · Valto, con D en tanto por uno.' }),
      I('<b>Resumen</b>\n· Cuadrada: alto y bajo, con su periodo.\n· <b>D = tiempo en alto / periodo</b>; media = D · Valto.\n· PWM: regular la potencia media encendiendo y apagando deprisa.')
    ]),
    L('f7', 'El osciloscopio', 'meter', ['ba_scaleread', 'ba_period', 'ba_duty'], [
      Q('Una señal cambia mil veces por segundo. ¿Qué crees que marca un multímetro en voltios?', ['Un número fijo: una especie de media', 'Un número que baila mil veces por segundo', 'Un dibujo de la señal'], 'El multímetro da un número promediado. Para ver la forma hace falta un osciloscopio.', { predict: true, c: 'ba_scaleread', h: '¿Podrías leer mil números por segundo en una pantalla?' }),
      I('El <b>osciloscopio</b> dibuja la tensión frente al tiempo. Imprescindible para PWM, audio o relojes: ves la forma, no solo un número.', { svg: screenSVG, more: 'La pantalla tiene una cuadrícula, normalmente de 10 divisiones de ancho y 8 de alto. Los mandos dicen cuánto vale cada división.' }),
      { t: 'explore', text: 'Una senoide fija de 2 V de pico y 1 kHz. Cambia las escalas del osciloscopio.', viz: 'scope', params: scopeP(),
        tasks: [
          { q: 'hdiv', min: 3.9, max: 4.1, text: 'Haz que la señal ocupe 4 divisiones de alto', done: '4 V pico a pico entre 1 V/div = 4 divisiones.', hint: 'Cambia los V/div.' },
          { q: 'cyc', min: 1.9, max: 2.1, text: 'Deja 2 ciclos en pantalla', done: '10 divisiones × 0,2 ms = 2 ms: dos ciclos de 1 ms.', hint: 'Baja el tiempo por división.' },
          { q: 'cyc', min: 0.9, max: 1.1, text: 'Ahora uno solo, que ocupe toda la pantalla', done: '10 × 0,1 ms = 1 ms: un ciclo.', hint: 'Aún más rápido.' }
        ] },
      I('<b>Vertical</b>: cuenta las divisiones de alto y multiplica por los <b>V/div</b>.', { svg: vdivSVG }),
      Q('1 V/div y una cuadrada de 5 divisiones de alto. ¿Amplitud?', ['5 V', '1 V', '0,2 V', '10 V'], '5 × 1 V.', { c: 'ba_scaleread', h: 'Divisiones × V/div.' }),
      I('<b>Horizontal</b>: las divisiones de un ciclo por los <b>s/div</b> dan el periodo; y f = 1 / T.', { svg: tdivSVG }),
      { t: 'steps', text: 'A 1 ms/div, un ciclo ocupa 4 divisiones. ¿Frecuencia?', svg: tdivSVG, steps: ['Periodo: 4 div × 1 ms/div = <b>4 ms</b>', 'f = 1 / T = 1 / 0,004 s', '<b>f = 250 Hz</b>'], result: '250 Hz' },
      Q('0,5 ms/div y un ciclo de 4 divisiones. ¿Frecuencia?', ['500 Hz', '2 Hz', '2000 Hz', '125 Hz'], 'T = 2 ms → f = 500 Hz.', { c: 'ba_scaleread', h: 'Primero el periodo y luego f = 1 / T.' }),
      G('m7_scope'),
      Q('Una cuadrada está en alto 1 división de cada 4 que dura su periodo. ¿Ciclo de trabajo?', ['25 %', '75 %', '4 %', '50 %'], '1 / 4.', { c: 'ba_duty', h: 'Tiempo en alto entre periodo, aunque sea en divisiones.' }),
      Q('¿Qué te enseña el osciloscopio que no ve el multímetro?', ['La forma de la señal en el tiempo', 'La resistencia', 'El color de los cables', 'La temperatura'], 'El multímetro da un número; el osciloscopio, la forma.', { c: 'ba_scaleread', h: 'Piensa en el dibujo de la pantalla.' }),
      I('<b>Resumen</b>\n· Tensión (vertical) frente a tiempo (horizontal).\n· Amplitud = divisiones × V/div.\n· Periodo = divisiones × s/div; f = 1 / T.')
    ]),
    L('h3', 'Valor eficaz (rms)', 'bolt', ['ba_rms', 'ba_mainsrisk'], [
      Q('Una bombilla recibe 10 V de continua y otra igual, una senoide de 10 V de pico. ¿Cuál crees que brilla más?', ['La de continua', 'Las dos igual', 'La de alterna'], 'La senoide solo está en 10 V un instante; el resto del tiempo, menos. Calienta como unos 7,07 V de continua.', { predict: true, c: 'ba_rms', h: '¿Cuánto tiempo pasa la senoide en su pico?' }),
      I('El <b>valor eficaz</b> (rms) de una señal es la continua que <b>calentaría lo mismo</b>. Así se comparan alterna y continua con justicia.', { svg: bulbsSVG, more: 'rms viene del inglés «root mean square»: la raíz de la media de los cuadrados. Se usa el cuadrado porque la potencia en una resistencia va con V².' }),
      { t: 'explore', text: 'Elige el pico y la forma de la señal. La línea azul es su valor eficaz.', viz: 'rms', params: { Vp: { label: 'Pico', val: 100, min: 5, max: 400, step: 5, unit: 'V', dec: 0 }, s: { label: 'Forma (1 senoide, 2 cuadrada, 3 triangular)', val: 1, list: [1, 2, 3], dec: 0 } },
        tasks: [
          { q: 'Vrms', min: 229, max: 231, text: 'Con la senoide, consigue 230 V eficaces', done: '325 V de pico: así es la red de casa.', hint: 'El eficaz es el pico × 0,707.' },
          { q: 'ratio', min: 0.99, max: 1.01, text: 'Busca una forma cuyo eficaz sea igual al pico', done: 'La cuadrada está siempre en su pico (en positivo o en negativo).', hint: 'Prueba las formas.' },
          { q: 'ratio', min: 0.57, max: 0.58, text: 'Y la que menos calienta para el mismo pico', done: 'La triangular: × 0,577.', hint: 'La más «puntiaguda».' }
        ] },
      I('Para una <b>senoide</b>: <b>Vrms = Vp / √2 ≈ 0,707 · Vp</b>. Al revés, Vp = Vrms × 1,414.', { svg: rmsSVG }),
      { t: 'steps', text: 'La red de casa llega a 325 V de pico. ¿Cuántos voltios eficaces son?', svg: rmsSVG, steps: ['Senoide: <b>Vrms = Vp / √2</b>', '√2 ≈ 1,414', '325 / 1,414 ≈ <b>230 V</b>'], result: 'Los famosos 230 V son eficaces.' },
      G('m7_vrms'),
      Nm('Un adaptador de alterna da 12 V eficaces. ¿Tensión de pico, en V?', 17, 'V', '12 × 1,414 ≈ 17 V.', { tol: 0.2, c: 'ba_rms', h: 'Del eficaz al pico: × √2.' }),
      I('Un multímetro en <b>V~</b> mide el <b>eficaz</b>. Los sencillos lo calculan suponiendo que la señal es una senoide; con otras formas se equivocan. Los «<b>true RMS</b>» lo miden bien con cualquier forma.', { svg: meterSVG }),
      Q('Un multímetro en V~ mide…', ['El valor eficaz', 'El pico', 'El pico a pico', 'La frecuencia'], 'Por eso en un enchufe marca 230 V.', { c: 'ba_rms', h: 'Recuerda qué número marca en un enchufe.' }),
      Q('Mides una onda cuadrada con un multímetro barato que no es «true RMS». ¿Qué pasa?', ['Puede dar un valor equivocado: supone que es una senoide', 'Lo mide perfecto', 'Marca siempre cero', 'Se estropea'], 'Su cuenta solo vale para senoides.', { c: 'ba_rms', h: '¿Qué forma supone el multímetro sencillo?' }),
      I('La red: 230 V eficaces son <b>±325 V</b> de pico, <b>650 V</b> pico a pico, 50 veces por segundo. Con eso pasan por el cuerpo corrientes mortales.', { svg: mainsSVG }),
      Q('¿Por qué es peligrosa la red?', ['Puede hacer pasar por tu cuerpo corrientes mortales: no se trabaja con ella sin formación', 'No lo es', 'Porque es continua', 'Porque los enchufes tienen mucha resistencia'], 'Bastan decenas de mA a través del pecho. En este curso usamos baja tensión.', { c: 'ba_mainsrisk', h: 'Ley de Ohm con la resistencia de tu cuerpo.' }),
      Nm('¿Cuántos voltios pico a pico tiene la red de 230 V?', 650, 'V', '325 × 2 ≈ 650 V.', { tol: 5, c: 'ba_mainsrisk', h: 'Primero el pico (× √2) y luego el pico a pico (× 2).' }),
      I('<b>Resumen</b>\n· Eficaz: la continua que calienta igual.\n· Senoide: <b>Vrms = Vp / √2</b>.\n· El multímetro en V~ da el eficaz (bien con cualquier forma si es true RMS).\n· Red: 230 V eficaces, 325 V de pico.')
    ]),
    L('h4', 'Reactancia del condensador', 'cap', ['ba_xc'], [
      Q('Un condensador bloquea la continua. Si le conectas una tensión alterna, ¿crees que pasará corriente por el circuito?', ['Sí: se carga y se descarga sin parar', 'No, nunca', 'Solo si es electrolítico'], 'La carga va y viene entre la fuente y las placas: por el circuito circula corriente alterna, aunque nada cruce el aislante.', { predict: true, c: 'ba_xc', h: 'Recuerda: hay corriente mientras la tensión del condensador cambia.' }),
      I('En alterna, la tensión cambia todo el rato: el condensador se carga, se descarga y se carga al revés. La corriente <b>va y viene</b> por el circuito, aunque nada cruce el aislante.', { svg: capACSVG }),
      { t: 'explore', text: 'Un generador de 5 V eficaces con un condensador. Cambia la frecuencia y la capacidad y mira la corriente.', viz: 'xc', params: { C: { label: 'C', val: 1, list: CL.concat(100), unit: 'µF', dec: 2 }, f: { label: 'Frecuencia', val: 50, list: [10, 20, 50, 100, 160, 200, 500, 1000, 1600, 2000, 5000, 10000, 16000, 20000, 50000, 100000], unit: 'Hz', dec: 0 } },
        tasks: [
          { q: 'Xc', min: 950, max: 1050, text: 'Consigue una reactancia de unos 1 kΩ', done: 'Por ejemplo 0,1 µF a 1,6 kHz o 1 µF a 160 Hz: lo que cuenta es f · C.', hint: 'Prueba 0,1 µF y ajusta la frecuencia.' },
          { q: 'Xc', min: 0, max: 10, text: 'Ahora que se oponga muy poco: menos de 10 Ω', done: 'Mucha frecuencia y mucha capacidad: casi un cable.', hint: 'Sube las dos cosas.' },
          { q: 'Xc', min: 100000, max: 1e12, text: 'Y que casi bloquee: más de 100 kΩ', done: 'Poca frecuencia y poca capacidad. En continua (f = 0) sería infinita.', hint: 'Baja las dos.' }
        ] },
      I('Esa oposición se llama <b>reactancia</b>: <b>Xc = 1 / (2π · f · C)</b>, en ohmios. Más frecuencia o más capacidad → menos reactancia.', { svg: xcSVG, more: '¿Por qué baja con la frecuencia? Cuanto más rápido cambia la tensión, más carga entra y sale cada segundo: más corriente con la misma tensión.\nLa reactancia no convierte la energía en calor como una resistencia: la guarda y la devuelve en cada ciclo.' }),
      { t: 'steps', text: '¿Qué reactancia tiene un condensador de 1 µF a 1 kHz?', svg: xcSVG, steps: ['Fórmula: <b>Xc = 1 / (2π · f · C)</b>', '2π × 1000 × 0,000001 = 0,00628', 'Xc = 1 / 0,00628 ≈ <b>159 Ω</b>'], result: 'Unos 159 Ω' },
      G('m7_xc'),
      Q('Frecuencia × 2: la reactancia…', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Se hace cero'], 'Inversamente proporcional a f.', { c: 'ba_xc', h: 'f está en el denominador.' }),
      Q('En continua (f = 0), la reactancia de un condensador es…', ['Infinita', 'Cero', '1 Ω', 'Igual a C'], 'Bloquea la continua.', { c: 'ba_xc', h: '¿Qué pasa al dividir entre algo cada vez más pequeño?' }),
      Nm('Con 5 V eficaces sobre un condensador de 159 Ω de reactancia, ¿qué corriente eficaz pasa, en mA?', 31.4, 'mA', 'Como Ohm: I = V / Xc = 5 / 159 ≈ 31,4 mA.', { tol: 0.5, c: 'ba_xc', h: 'La reactancia se usa como una resistencia en la ley de Ohm.' }),
      Q('Multiplicas la capacidad por 10 a la misma frecuencia. La reactancia…', ['Se divide entre 10', 'Se multiplica por 10', 'No cambia', 'Se divide entre 100'], 'También inversamente proporcional a C.', { c: 'ba_xc', h: 'C también está en el denominador.' }),
      I('<b>Resumen</b>\n· En alterna, la corriente va y viene por el condensador.\n· <b>Xc = 1 / (2π · f · C)</b>: más f o más C, menos Xc.\n· En continua, infinita. Se usa como una resistencia en Ohm.', { more: 'Con esto construirás filtros que separan frecuencias. Antes, un poco de matemáticas para dibujarlos.' })
    ]),
    L('a9', 'Escalas logarítmicas', 'bin', ['ba_logaxis', 'ba_log10', 'ba_loggraph'], [
      Q('Quieres marcar 10 Hz, 1 kHz y 100 kHz en una regla normal de 0 a 100 kHz. ¿Dónde crees que quedan los dos primeros?', ['Aplastados casi en el cero', 'Bien separados', 'Fuera de la regla'], '1 kHz es solo el 1 % de la regla, y 10 Hz el 0,01 %: indistinguibles. Hace falta otra escala.', { predict: true, c: 'ba_logaxis', h: 'Calcula qué porcentaje de 100 kHz es 1 kHz.' }),
      I('En una escala <b>lineal</b>, cada marca <b>suma</b> lo mismo. En una <b>logarítmica</b>, cada marca <b>multiplica</b>: 1, 10, 100, 1000. Cada ×10 es una <b>década</b>.', { svg: axesSVG }),
      { t: 'explore', text: 'Mueve el valor y míralo en los dos ejes: el lineal de 0 a 1 MHz y el logarítmico de 1 Hz a 1 MHz.', viz: 'logAxis', params: { e: { label: 'Valor (exponente de 10)', val: 1, min: 0, max: 6, step: 0.05, unit: '', dec: 2 } },
        tasks: [
          { q: 'v', min: 99, max: 101, text: 'Coloca 100 Hz', done: 'En el eje log está en la segunda marca; en el lineal, pegado al cero.', hint: '100 = 10²: exponente 2.' },
          { q: 'v', min: 1950, max: 2050, text: 'Coloca 2 kHz', done: 'Un 30 % de la década de 1 k a 10 k: log₁₀(2000) ≈ 3,3.', hint: 'Un poco por encima de la marca de 1k.' },
          { q: 'v', min: 999000, max: 1e7, text: 'Llega a 1 MHz', done: 'Seis décadas de 1 Hz a 1 MHz, cada una con el mismo espacio.', hint: 'Al final del todo.' }
        ] },
      I('Lo que se reparte por igual en el eje es el <b>logaritmo</b>: <b>log₁₀(x)</b> responde «¿10 elevado a cuánto da x?».', { svg: logSVG }),
      G('m7_log10'),
      Q('En un eje logarítmico, ¿qué valor queda a medio camino entre 10 y 1000?', ['100', '505', '500', '50'], 'El mismo factor a cada lado: ×10 y ×10.', { c: 'ba_logaxis', h: 'En log, «a medio camino» es multiplicar lo mismo a cada lado.' }),
      Q('Una gráfica va de 10 Hz a 100 kHz. ¿Cuántas décadas son?', ['4', '10 000', '5', '3'], '10 → 100 → 1 k → 10 k → 100 k.', { c: 'ba_logaxis', h: 'Cuenta cuántas veces multiplicas por 10.' }),
      I('Dentro de una década las marcas no están equiespaciadas: el 2 queda a un 30 % del camino y el 5 a un 70 %, porque log(2) ≈ 0,3 y log(5) ≈ 0,7.', { svg: decadeSVG }),
      Q('En la década de 1 kHz a 10 kHz, ¿dónde queda 2 kHz?', ['A un 30 % del camino', 'Al 20 %', 'A la mitad', 'Al 90 %'], 'log(2) ≈ 0,30.', { c: 'ba_logaxis', h: 'Recuerda log(2).' }),
      { t: 'steps', text: '¿Cuánto vale log₁₀(2000)?', svg: decadeSVG, steps: ['2000 = 2 × 1000', 'Los logaritmos convierten productos en sumas: log(2000) = log(2) + log(1000)', 'log(1000) = 3 y log(2) ≈ 0,3', '<b>log(2000) ≈ 3,3</b>'], result: '≈ 3,3: un 30 % dentro de la cuarta década' },
      I('Una <b>recta</b> en una gráfica con los dos ejes logarítmicos (log–log) indica una ley de potencias. Ejemplo: la reactancia de un condensador frente a la frecuencia baja una década por cada década.', { svg: loglogSVG }),
      Q('En log–log, una recta baja una década por cada década que avanza. Significa que…', ['La salida es inversamente proporcional a la entrada', 'La salida es constante', 'La salida sube', 'Hay un error'], 'Pendiente −1: ×10 en x, ÷10 en y.', { c: 'ba_loggraph', h: 'Piensa en Xc frente a f.' }),
      Q('¿Cómo se ve la reactancia de un condensador frente a la frecuencia en una gráfica log–log?', ['Como una recta que baja', 'Como una curva que sube', 'Como una línea horizontal', 'Como una senoide'], 'Xc = 1 / (2πfC): inversamente proporcional a f.', { c: 'ba_loggraph', h: '¿Qué le pasa a Xc al multiplicar f por 10?' }),
      I('<b>Resumen</b>\n· Log: cada marca multiplica; una década = ×10.\n· log₁₀(x) es el exponente: log(1000) = 3.\n· El 2 y el 5 caen al 30 % y al 70 % de la década. Recta en log–log = ley de potencias.')
    ]),
    L('h1', 'Matemáticas: logaritmos y dB', 'bin', ['ba_db', 'ba_log10'], [
      Q('Un amplificador multiplica la señal por 10 y otro, detrás, por 100. ¿Cuánto la multiplican juntos?', ['× 1000', '× 110', '× 10'], 'Las ganancias en cadena se multiplican. Los decibelios convertirán esa multiplicación en una suma.', { predict: true, c: 'ba_db', h: 'El segundo amplifica lo que ya amplificó el primero.' }),
      I('En electrónica se comparan señales de microvoltios con otras de voltios, y las ganancias se multiplican. Para manejar eso se usan los <b>decibelios</b>: <b>dB = 20 · log₁₀(Vsal / Vent)</b>.', { svg: dbIdeaSVG }),
      { t: 'explore', text: 'Elige cuántas veces sale la señal respecto a lo que entra y mira los decibelios.', viz: 'db', params: { r: { label: 'Vsal / Vent', val: 1, list: [0.01, 0.1, 0.25, 0.5, 0.707, 1, 1.41, 2, 4, 10, 100, 1000], dec: 3 } },
        tasks: [
          { q: 'dB', min: -20.1, max: -19.9, text: 'Consigue −20 dB', done: 'Sale la décima parte: × 0,1.', hint: 'Menos de lo que entra.' },
          { q: 'dB', min: 5.9, max: 6.1, text: 'Ahora +6 dB', done: '× 2 son unos 6 dB.', hint: 'Doble de lo que entra.' },
          { q: 'dB', min: -3.1, max: -2.9, text: 'Y −3 dB', done: '× 0,707: el famoso −3 dB de los filtros.', hint: 'Algo menos de lo que entra, pero no la mitad.' }
        ] },
      I('Los que conviene saber de memoria:\n· × 10 → +20 dB; × 100 → +40 dB.\n· × 2 → ≈ +6 dB; × 0,5 → ≈ −6 dB.\n· × 0,707 → ≈ −3 dB. Negativo = la señal se hace más pequeña.', { svg: dbTableSVG }),
      { t: 'steps', text: 'Un amplificador multiplica la tensión × 100. ¿Cuántos dB son?', svg: dbIdeaSVG, steps: ['Fórmula: <b>dB = 20 · log₁₀(Vsal / Vent)</b>', 'log₁₀(100) = 2', '20 × 2 = <b>40 dB</b>'], result: '+40 dB' },
      G('m7_db'),
      I('La gran ventaja: en una cadena, los dB <b>se suman</b>. × 10 y luego × 100 son 20 + 40 = 60 dB, que es × 1000.', { svg: chainSVG }),
      Nm('Dos etapas: una de 20 dB y otra de 6 dB. ¿Ganancia total, en dB?', 26, 'dB', 'Se suman: 20 + 6 = 26 dB (× 10 × 2 = × 20).', { c: 'ba_db', h: 'En decibelios, las etapas en cadena se suman.' }),
      Q('Un filtro da −20 dB a cierta frecuencia. ¿Qué significa?', ['Que la tensión sale diez veces más pequeña', 'Que sale diez veces mayor', 'Que sale 20 V menos', 'Que no hace nada'], 'Negativo: atenúa; 20 dB: factor 10.', { c: 'ba_db', h: 'El signo dice si crece o mengua; 20 dB es un factor 10.' }),
      I('Con <b>potencias</b> se usa 10 en vez de 20: <b>dB = 10 · log₁₀(Psal / Pent)</b>. El doble de potencia ≈ +3 dB. Por eso −3 dB es «la mitad de la potencia» y, a la vez, × 0,707 en tensión.', { svg: pdbSVG }),
      Q('La potencia se queda en la mitad. ¿Cuántos dB son?', ['Unos −3 dB', 'Unos −6 dB', '−50 dB', '−0,5 dB'], '10 · log(0,5) ≈ −3 dB.', { c: 'ba_db', h: 'Con potencias se usa 10 · log.' }),
      G('m7_db'),
      I('<b>Resumen</b>\n· Tensión: <b>dB = 20 · log₁₀(Vsal / Vent)</b>; potencia: 10 · log.\n· × 10 = 20 dB; × 2 ≈ 6 dB; × 0,707 ≈ −3 dB.\n· En cadena, los dB se suman.')
    ]),
    L('h5', 'Filtros RC', 'cap', ['ba_lphp', 'ba_fc', 'ba_rolloff'], [
      Q('Pones una resistencia en serie y un condensador a masa, y tomas la salida en el condensador. Para frecuencias altas, ¿qué crees que pasa con la salida?', ['Baja: el condensador desvía lo rápido a masa', 'Sube', 'No cambia nada'], 'A frecuencia alta, Xc es pequeña: el condensador es casi un cable a masa. Es un filtro paso bajo.', { predict: true, c: 'ba_lphp', h: 'Recuerda qué le pasa a Xc al subir la frecuencia.' }),
      I('Un <b>paso bajo</b> es un divisor entre R y el condensador. A baja frecuencia Xc es enorme y la salida es casi toda la entrada; a alta frecuencia Xc es pequeña y la salida cae.', { svg: lpSVG }),
      { t: 'explore', text: 'Un filtro RC con su gráfica: ganancia en dB frente a frecuencia (eje logarítmico). El punto azul es la frecuencia de la señal.', viz: 'rcFilter', params: filtP(),
        tasks: [
          { q: 'fc', min: 900, max: 1100, text: 'Consigue una fc de aproximadamente 1 kHz', done: 'Por ejemplo 1,5 kΩ con 0,1 µF: unos 1,06 kHz.', hint: 'Prueba 0,1 µF y busca la resistencia.' },
          { q: 'dB', min: -21, max: -19, text: 'Con el paso bajo, lleva la señal una década por encima de fc', done: 'Unos −20 dB: la salida es la décima parte.', hint: 'Señal a unos 10 kHz.' },
          { q: 'dB', min: -3.5, max: -2.5, text: 'Ahora pon la señal en la frecuencia de corte', done: 'Justo en fc: −3 dB, sale × 0,707. Pruébalo con el paso alto: también.', hint: 'Señal a 1 kHz.' }
        ] },
      I('Si cambias el orden (C en serie y R a masa) tienes un <b>paso alto</b>: bloquea la continua y lo lento, deja pasar lo rápido.', { svg: hpSVG }),
      I('La frontera es la <b>frecuencia de corte</b>: <b>fc = 1 / (2π · R · C)</b>, donde R = Xc. Ahí la salida es × 0,707: <b>−3 dB</b>.', { svg: bodeSVG }),
      { t: 'steps', text: 'Paso bajo con 1,6 kΩ y 1 µF. ¿Frecuencia de corte?', svg: lpSVG, steps: ['Fórmula: <b>fc = 1 / (2π · R · C)</b>', '2π × 1600 × 0,000001 = 0,01005', 'fc = 1 / 0,01005 ≈ <b>99,5 Hz</b>'], result: 'Unos 100 Hz' },
      G('m7_fc'),
      I('Por encima de fc, un paso bajo cae <b>20 dB por década</b>: cada × 10 en frecuencia, ÷ 10 en tensión. En la gráfica log–log es una recta de pendiente −1, como la de Xc.', { svg: slopeSVG }),
      Q('Por encima de fc, un paso bajo de primer orden atenúa unos…', ['20 dB por década', '3 dB en total', '100 dB', 'Nada'], 'Cada × 10 en frecuencia, ÷ 10 en amplitud.', { c: 'ba_rolloff', h: '÷ 10 en tensión, ¿cuántos dB son?' }),
      Nm('Paso bajo con fc = 1 kHz. ¿Atenuación aproximada a 100 kHz, en dB (con signo)?', -40, 'dB', 'Dos décadas por encima: −20 × 2 = −40 dB.', { tol: 1, c: 'ba_rolloff', h: 'Cuenta las décadas entre fc y 100 kHz.' }),
      Q('Quieres quitar el ruido rápido de un sensor que cambia despacio. ¿Qué filtro?', ['Paso bajo', 'Paso alto', 'Ninguno', 'Uno que amplifique'], 'Deja pasar lo lento.', { c: 'ba_lphp', h: 'La señal útil es lenta; el ruido, rápido.' }),
      Q('Un condensador en serie con la entrada de un amplificador de audio…', ['Bloquea la continua y deja pasar el audio', 'Amplifica', 'Bloquea el audio', 'No hace nada'], 'Es un paso alto: condensador de acoplo.', { c: 'ba_lphp', h: 'Condensador en serie: ¿qué no deja pasar nunca?' }),
      Q('En la frecuencia de corte, ¿cuánto sale de un filtro RC?', ['0,707 veces la entrada (−3 dB)', 'La mitad', 'Nada', 'Todo'], 'Es justo donde R = Xc.', { c: 'ba_fc', h: 'Recuerda la tabla de dB.' }),
      Nm('Filtro con R = 10 kΩ y C = 10 nF. ¿fc, en Hz?', 1592, 'Hz', '1 / (2π × 10 000 × 10⁻⁸) ≈ 1592 Hz.', { tol: 30, c: 'ba_fc', h: '10 nF = 10 × 10⁻⁹ F.' }),
      I('<b>Resumen</b>\n· Paso bajo: R en serie, C a masa. Paso alto: C en serie, R a masa.\n· <b>fc = 1 / (2π · R · C)</b>: ahí −3 dB.\n· Por fuera, 20 dB por década.')
    ]),
    L('f8', 'Osciloscopio: disparo y acoplo', 'meter', ['scope', 'ba_coupling', 'ba_probegnd'], [
      Q('A veces una señal que se repite se ve corriendo por la pantalla del osciloscopio. ¿Por qué crees que pasa?', ['Cada dibujo empieza en un punto distinto de la onda', 'La señal cambia de frecuencia', 'La pantalla es lenta'], 'El osciloscopio dibuja la señal una y otra vez; si cada dibujo empieza en otro punto, la imagen no se queda quieta. El disparo lo arregla.', { predict: true, c: 'scope', h: 'Imagina superponer fotos que empiezan en momentos distintos.' }),
      I('Para ver la señal quieta, cada captura empieza cuando la señal cruza un <b>nivel</b> en un <b>flanco</b> concreto (subida o bajada): el <b>disparo</b> (trigger).', { tune: { viz: 'scopeTrigger', params: { lvl: { label: 'Nivel de disparo', val: 0.5, min: -3, max: 3, step: 0.1, unit: 'V', dec: 1 }, tdiv: { label: 'Tiempo/div', val: 0.5, list: [0.05, 0.1, 0.2, 0.5, 1, 2], unit: 'ms', dec: 2 } } } }),
      { t: 'explore', text: 'Una senoide de 1 kHz y 2 V de pico. El nivel de disparo es la línea ámbar.', viz: 'scopeTrigger', params: { lvl: { label: 'Nivel de disparo', val: 2.6, min: -3, max: 3, step: 0.1, unit: 'V', dec: 1 }, tdiv: { label: 'Tiempo/div', val: 2, list: [0.05, 0.1, 0.2, 0.5, 1, 2], unit: 'ms', dec: 2 } },
        tasks: [
          { q: 'trig', min: 1, max: 1, text: 'Consigue que dispare', done: 'El nivel tiene que cortar la señal: entre −2 y +2 V.', hint: 'Baja el nivel por debajo del pico.' },
          { q: 'ok', min: 1, max: 1, text: 'Deja entre 2 y 5 ciclos en pantalla, quietos', done: 'Disparo estable y una base de tiempos adecuada.', hint: 'Prueba 0,2 o 0,5 ms/div.' }
        ] },
      Q('¿Qué pasa si el nivel de disparo está por encima del pico de la señal?', ['No dispara: la imagen corre o el aparato espera', 'Se ve más grande', 'Se invierte', 'Se mide mejor'], 'La señal nunca cruza el nivel.', { c: 'scope', h: 'El nivel tiene que cortar la señal.' }),
      I('Modos de disparo:\n· <b>Auto</b>: si no dispara, dibuja igual (la imagen corre).\n· <b>Normal</b>: solo dibuja al disparar.\n· <b>Single</b>: una captura y se para. Ideal para sucesos únicos, como el rebote de un pulsador.', { svg: modesSVG }),
      Q('Quieres ver el rebote de un pulsador al apretarlo una vez. ¿Qué modo?', ['Single, disparando en el flanco de bajada', 'Auto', 'Ninguno: no se puede ver', 'Normal con el nivel fuera de la señal'], 'Una captura única del suceso.', { c: 'scope', h: 'Es algo que pasa una sola vez.' }),
      I('<b>Acoplo</b> del canal:\n· <b>DC</b>: muestra todo, continua incluida.\n· <b>AC</b>: pone un condensador en serie y quita la continua. Es un <b>paso alto</b>: solo ves lo que varía.', { svg: couplingSVG }),
      { t: 'steps', text: 'Quieres ver variaciones de 50 mV montadas sobre una tensión fija de 5 V.', svg: couplingSVG, steps: ['En DC a 10 mV/div, los 5 V serían 500 divisiones: la traza se sale de la pantalla.', 'En DC a 1 V/div, se ve la línea de 5 V, pero 50 mV son 0,05 divisiones: invisibles.', 'En <b>AC</b>, el condensador quita los 5 V fijos.', 'Ahora a 10 mV/div, los 50 mV ocupan <b>5 divisiones</b>.'], result: 'AC y pocos mV/div.' },
      Q('Quieres ver pequeñas variaciones sobre los 5 V de una alimentación. ¿Qué acoplo?', ['AC, y bajas los V/div', 'DC con 2 V/div', 'Da igual', 'Ninguno'], 'AC quita los 5 V fijos y puedes ampliar lo que varía.', { c: 'ba_coupling', h: '¿Cuál quita la parte fija?' }),
      Q('Con acoplo AC, una cuadrada muy lenta (1 Hz) se ve…', ['Deformada: las partes planas caen hacia cero', 'Perfecta', 'Invertida', 'Más rápida'], 'El acoplo AC es un paso alto de pocos hercios: lo muy lento no pasa bien.', { c: 'ba_coupling', h: 'Acoplo AC = paso alto: ¿qué le pasa a lo lento?' }),
      I('Ojo con la <b>pinza de masa</b>: en un osciloscopio de sobremesa está unida a la <b>tierra del enchufe</b>. Va siempre a la masa de tu circuito.', { svg: gndSVG }),
      Q('En un osciloscopio de sobremesa, la pinza de masa de la sonda está unida a…', ['La toma de tierra del enchufe', 'Nada', 'El positivo', 'La punta'], 'Si la pones en un punto que no es masa de algo unido a la red, haces un cortocircuito a través de la tierra.', { c: 'ba_probegnd', h: 'Piensa en el tercer contacto del enchufe.' }),
      Q('Tu circuito va con pilas y no toca nada más. ¿Hay riesgo al conectar la pinza de masa a su negativo?', ['No: el circuito no está unido a la tierra', 'Sí, siempre', 'Sí, si la pila es de 9 V', 'Solo con acoplo AC'], 'No hay camino entre la tierra y la pila.', { c: 'ba_probegnd', h: '¿Hay algún camino entre la pila y la tierra del enchufe?' }),
      G('m7_scope'),
      I('<b>Resumen</b>\n· Disparo: nivel y flanco para una imagen quieta; auto, normal y single.\n· Acoplo DC (todo) y AC (quita la continua: un paso alto).\n· La pinza de masa va a tierra: solo a la masa del circuito.')
    ])
  ] });
})();
