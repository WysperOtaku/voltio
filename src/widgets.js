/* Voltio · ejercicios interactivos.
   Cada widget: render(ex, el, ctx) → { check(): {ok, right?, msg?}, destroy?() }
   ctx.ready(bool) activa el botón Comprobar; ctx.done(result) para widgets que se corrigen solos. */
const Widgets = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const num = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const fR = r => r >= 1e6 ? num(r / 1e6) + ' MΩ' : r >= 1000 ? num(r / 1000) + ' kΩ' : num(r) + ' Ω';
  const fI = i => Math.abs(i) >= 1 ? num(i) + ' A' : Math.abs(i) >= 1e-3 ? num(i * 1000, 1) + ' mA' : num(i * 1e6, 0) + ' µA';
  const fV = v => num(v) + ' V';
  const E12 = [10, 22, 47, 100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 6800, 10000, 22000, 47000, 100000, 220000, 470000, 1000000];
  const BAND = ['negro', 'marrón', 'rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'gris', 'blanco'];
  const BANDHEX = ['#1a1a1a', '#7B4A21', '#D22B2B', '#F07D10', '#F5D10A', '#2E9B3C', '#2A5BD7', '#8A3FC9', '#8A8A8A', '#F4F4F4'];
  const st = 'stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  let audio = null;
  function beep(on) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (!on) { if (audio._o) { audio._o.stop(); audio._o = null; } return; }
      if (audio._o) return;
      const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 2700; g.gain.value = 0.04; o.connect(g); g.connect(audio.destination); o.start(); audio._o = o;
    } catch (e) { }
  }

  /* ============ TUNE: circuitos con deslizadores ============ */
  const LEDV = 1.8;
  const VIZ = {
    ohm: {
      calc: p => ({ I: p.V / p.R }),
      svg: (p, o) => `<svg viewBox="0 0 300 170" class="viz">${flowLoop('M60 40H240V130H60Z', o.I, 0.02)}
        ${batt(60, 85, p.V)}<g transform="translate(150 40)">${resBody()}</g>
        <g transform="translate(240 85)"><circle r="30" class="meterc"/><text y="2" text-anchor="middle" class="vizbig" style="font-size:11.5px">${fI(o.I)}</text><text y="16" text-anchor="middle" class="vizsm">amperímetro</text></g>
        <text x="150" y="22" text-anchor="middle" class="vizlab">${fR(p.R)}</text></svg>`
    },
    led: {
      calc: p => { const I = Math.max(0, (p.V - LEDV) / (p.R + 12)); return { I, burnt: I > 0.045, b: Math.min(1, I / 0.015) }; },
      svg: (p, o) => `<svg viewBox="0 0 300 170" class="viz">${flowLoop('M60 40H240V130H60Z', o.burnt ? 0 : o.I, 0.02)}
        ${batt(60, 85, p.V)}<g transform="translate(150 40)">${resBody()}</g>
        <g transform="translate(240 85)">${ledBulb(o.burnt ? 0 : o.b, o.burnt)}</g>
        <text x="150" y="22" text-anchor="middle" class="vizlab">${fR(p.R)}</text>
        <text x="150" y="160" text-anchor="middle" class="vizlab">${o.burnt ? '💨 LED quemado: ' + fI(o.I) : 'Corriente: ' + fI(o.I)}</text></svg>`
    },
    series: {
      calc: p => { const I = p.V / (p.R1 + p.R2); return { I, V1: I * p.R1, V2: I * p.R2 }; },
      svg: (p, o) => `<svg viewBox="0 0 300 190" class="viz">${flowLoop('M50 40H250V130H50Z', o.I, 0.01)}${batt(50, 85, p.V)}
        <g transform="translate(115 40)">${resBody()}</g><g transform="translate(195 40)">${resBody()}</g>
        <text x="115" y="22" text-anchor="middle" class="vizlab">R1 ${fR(p.R1)}</text><text x="195" y="22" text-anchor="middle" class="vizlab">R2 ${fR(p.R2)}</text>
        ${stackBar(50, 160, 200, [[o.V1, '#F2A900', 'V1 ' + fV(o.V1)], [o.V2, '#3E8FCB', 'V2 ' + fV(o.V2)]], p.V)}</svg>`
    },
    divider: {
      calc: p => ({ Vout: p.V * p.R2 / (p.R1 + p.R2) }),
      svg: (p, o) => `<svg viewBox="0 0 300 200" class="viz"><path d="M50 30H150V170H50Z" ${st}/>${batt(50, 100, p.V)}
        <g transform="translate(150 65) rotate(90)">${resBody()}</g><g transform="translate(150 135) rotate(90)">${resBody()}</g>
        <text x="168" y="69" class="vizlab">R1 ${fR(p.R1)}</text><text x="168" y="139" class="vizlab">R2 ${fR(p.R2)}</text>
        <path d="M150 100H215" ${st}/><circle cx="150" cy="100" r="4" fill="currentColor"/>
        <g transform="translate(245 100)"><circle r="28" class="meterc"/><text y="0" text-anchor="middle" class="vizbig">${fV(o.Vout)}</text><text y="14" text-anchor="middle" class="vizsm">Vsal</text></g></svg>`
    },
    parallel: {
      calc: p => { const I1 = p.V / p.R1, I2 = p.V / p.R2; return { I1, I2, It: I1 + I2, Req: 1 / (1 / p.R1 + 1 / p.R2) }; },
      svg: (p, o) => `<svg viewBox="0 0 300 180" class="viz">${flowPath('M50 35H230', o.It, 0.04)}${flowPath('M50 145H230', o.It, 0.04)}
        ${flowPath('M150 35V145', o.I1, 0.02)}${flowPath('M230 35V145', o.I2, 0.02)}<path d="M50 35V145" ${st}/>${batt(50, 90, p.V)}
        <g transform="translate(150 90) rotate(90)">${resBody()}</g><g transform="translate(230 90) rotate(90)">${resBody()}</g>
        <text x="160" y="70" class="vizlab">${fI(o.I1)}</text><text x="240" y="70" class="vizlab">${fI(o.I2)}</text>
        <text x="90" y="27" class="vizlab">Total ${fI(o.It)}</text><text x="160" y="125" class="vizsm">${fR(p.R1)}</text><text x="240" y="125" class="vizsm">${fR(p.R2)}</text></svg>`
    },
    kcl: {
      calc: p => ({ I3: p.I1 + p.I2 }),
      svg: (p, o) => `<svg viewBox="0 0 300 170" class="viz">${flowPath('M30 50L150 90', p.I1, 0.05)}${flowPath('M30 130L150 90', p.I2, 0.05)}${flowPath('M150 90H280', o.I3, 0.05)}
        <circle cx="150" cy="90" r="7" fill="currentColor"/><text x="40" y="40" class="vizlab">I1 = ${num(p.I1 * 1000, 0)} mA</text><text x="40" y="155" class="vizlab">I2 = ${num(p.I2 * 1000, 0)} mA</text>
        <text x="190" y="80" class="vizlab">I3 = ${num(o.I3 * 1000, 0)} mA</text></svg>`
    },
    power: {
      calc: p => { const P = p.V * p.V / p.R; return { P, I: p.V / p.R, hot: Math.min(1, P / 0.25) }; },
      svg: (p, o) => `<svg viewBox="0 0 300 170" class="viz">${flowLoop('M60 40H240V130H60Z', o.I, 0.03)}${batt(60, 85, p.V)}
        <g transform="translate(170 40) scale(1.6)"><rect x="-17" y="-7" width="34" height="14" rx="7" fill="${heat(o.hot)}" stroke="#7a6a50"/></g>
        ${o.P > 0.5 ? '<text x="170" y="18" text-anchor="middle" font-size="22">💨</text>' : ''}
        <text x="150" y="160" text-anchor="middle" class="vizlab">P = ${o.P >= 1 ? num(o.P) + ' W' : num(o.P * 1000, 0) + ' mW'} · ${o.P > 0.25 ? 'supera ¼ W' : 'dentro de ¼ W'}</text>
        <text x="170" y="74" text-anchor="middle" class="vizsm">${fR(p.R)}</text></svg>`
    },
    rc: {
      calc: p => ({ tau: p.R * p.C * 1e-6 }),
      anim: true,
      svg: (p, o, t) => {
        const T = 5 * o.tau, tt = (t % Math.max(T, 0.5)) , frac = 1 - Math.exp(-tt / o.tau);
        const pts = []; for (let i = 0; i <= 60; i++) { const x = i / 60 * Math.max(T, 0.5); pts.push(`${40 + i * 4},${150 - 110 * (1 - Math.exp(-x / o.tau))}`); }
        const tauX = 40 + 240 * (o.tau / Math.max(T, 0.5));
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M40 30V150H285" ${st} stroke-width="1.5"/>
          <polyline points="${pts.join(' ')}" fill="none" stroke="var(--line)" stroke-width="2"/>
          <polyline points="${pts.slice(0, Math.round(tt / Math.max(T, 0.5) * 60) + 1).join(' ')}" fill="none" stroke="var(--led)" stroke-width="3"/>
          <path d="M${tauX} 150V${150 - 110 * 0.632}H40" stroke="var(--muted)" stroke-dasharray="4 4" fill="none"/>
          <text x="${tauX}" y="166" text-anchor="middle" class="vizsm">τ</text><text x="8" y="${150 - 110 * 0.632 + 4}" class="vizsm">63 %</text>
          <text x="45" y="22" class="vizlab">Carga: ${num(frac * 100, 0)} % · τ = ${o.tau >= 1 ? num(o.tau) + ' s' : num(o.tau * 1000, 0) + ' ms'}</text></svg>`;
      }
    },
    npn: {
      calc: p => { const Ib = Math.max(0, (5 - 0.7) / p.Rb), Imax = (9 - LEDV) / 470, Ic = Math.min(p.beta * Ib, Imax); return { Ib, Ic, sat: p.beta * Ib >= Imax, b: Math.min(1, Ic / 0.015) }; },
      svg: (p, o) => `<svg viewBox="0 0 300 200" class="viz">${flowPath('M210 20V170', o.Ic, 0.02)}${flowPath('M40 110H180', o.Ib * 40, 0.02)}
        <text x="215" y="16" class="vizsm">+9 V</text><g transform="translate(210 45) rotate(90)">${resBody()}</g><g transform="translate(210 90)">${ledBulb(o.b)}</g>
        <g transform="translate(200 135)">${Schem ? `<g style="color:var(--ink)">${npnSym()}</g>` : ''}</g>
        <text x="10" y="104" class="vizsm">5 V</text><g transform="translate(110 110)">${resBody()}</g><text x="110" y="95" text-anchor="middle" class="vizlab">RB ${fR(p.Rb)}</text>
        <text x="20" y="190" class="vizlab">Base ${fI(o.Ib)} → colector ${fI(o.Ic)} · ${o.Ib < 1e-6 ? 'cortado' : o.sat ? 'saturado' : 'en zona activa'}</text></svg>`
    },
    astable: {
      calc: p => { const f = 1.44 / ((p.R1 + 2 * p.R2) * p.C * 1e-6); return { f }; },
      anim: true,
      svg: (p, o, t) => {
        const on = o.f > 25 ? 0.6 : (Math.sin(t * Math.PI * 2 * o.f) > -0.1 ? 1 : 0);
        return `<svg viewBox="0 0 300 160" class="viz"><rect x="40" y="40" width="90" height="80" rx="6" ${st}/><text x="85" y="86" text-anchor="middle" class="vizbig">555</text>
          <path d="M130 80H200" ${st}/><g transform="translate(225 80)">${ledBulb(on)}</g>
          <text x="20" y="150" class="vizlab">f = ${o.f >= 1 ? num(o.f, 2) + ' Hz' : num(o.f, 3) + ' Hz'} · periodo ${num(1 / o.f, 2)} s${o.f > 25 ? ' · el ojo ya lo ve fijo' : ''}</text></svg>`;
      }
    },
    opamp: {
      calc: p => { const G = 1 + p.Rf / p.Rg; return { G, Vout: Math.max(0, Math.min(8.5, p.Vin * G)), clip: p.Vin * G > 8.5 }; },
      svg: (p, o) => `<svg viewBox="0 0 300 170" class="viz"><g transform="translate(150 70) scale(1.4)" style="color:var(--ink)"><path d="M-18 -22v44l36 -22z M-30 -10h12M-30 10h12M18 0h12" ${st}/><text x="-15" y="-6" font-size="11" fill="currentColor">+</text><text x="-14" y="15" font-size="12" fill="currentColor">−</text></g>
        <text x="20" y="60" class="vizlab">Vent ${fV(p.Vin)}</text>
        ${hbar(40, 120, 220, p.Vin / 9, '#3E8FCB', 'Entrada')}${hbar(40, 145, 220, o.Vout / 9, o.clip ? '#D64545' : '#F2A900', 'Salida ' + fV(o.Vout) + (o.clip ? ' (saturada)' : ''))}
        <text x="210" y="60" class="vizlab">Ganancia ${num(o.G, 1)}</text></svg>`
    },
    pwm: {
      calc: p => ({ avg: 5 * p.D / 100, b: p.D / 100 }),
      svg: (p, o) => { let d = 'M20 110'; for (let k = 0; k < 4; k++) { const x = 20 + k * 60, w = 60 * p.D / 100; d += `V${p.D > 0 ? 50 : 110}H${x + w}V110H${x + 60}`; }
        return `<svg viewBox="0 0 300 170" class="viz"><path d="${d}" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M20 ${110 - 60 * p.D / 100}H260" stroke="var(--muted)" stroke-dasharray="4 4"/>
          <text x="20" y="40" class="vizsm">5 V</text><text x="20" y="128" class="vizsm">0 V</text><g transform="translate(275 80)">${ledBulb(o.b)}</g>
          <text x="12" y="155" class="vizlab">Ciclo ${p.D} % · media ${fV(o.avg)} · analogWrite(${Math.round(p.D * 2.55)})</text></svg>`; }
    },
    /* --- m12 Microcontroladores --- */
    mc_wrap: {
      calc: p => { const m = 2 ** (p.bits || 8), v = Math.round(p.v), s = ((v % m) + m) % m; return { s, laps: Math.floor(v / m), trick: s === 4 && v > 255 ? 1 : 0 }; },
      svg: (p, o) => {
        const m = 2 ** (p.bits || 8), v = Math.round(p.v), cx = 218, cy = 80, r = 58, ang = x => x / m * 2 * Math.PI - Math.PI / 2;
        let ticks = '';
        for (let k = 0; k < 16; k++) { const b = ang(k * m / 16), r1 = k % 4 ? r - 5 : r - 10; ticks += `<path d="M${(cx + Math.cos(b) * r1).toFixed(1)} ${(cy + Math.sin(b) * r1).toFixed(1)}L${(cx + Math.cos(b) * r).toFixed(1)} ${(cy + Math.sin(b) * r).toFixed(1)}" stroke="var(--muted)" stroke-width="2"/>`; }
        const lab = [0, 1, 2, 3].map(k => { const b = ang(k * m / 4); return `<text x="${(cx + Math.cos(b) * (r + 13)).toFixed(1)}" y="${(cy + Math.sin(b) * (r + 13) + 4).toFixed(1)}" text-anchor="middle" class="vizsm">${k * m / 4}</text>`; }).join('');
        const a = ang(o.s), bad = o.s !== v;
        return `<svg viewBox="0 0 300 170" class="viz"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="2.5"/>${ticks}${lab}
          <path d="M${cx} ${cy}L${(cx + Math.cos(a) * (r - 14)).toFixed(1)} ${(cy + Math.sin(a) * (r - 14)).toFixed(1)}" stroke="var(--led)" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4" fill="var(--led)"/>
          <text x="10" y="30" class="vizsm">Intentas guardar</text><text x="10" y="56" class="vizbig" style="font-size:24px">${v}</text>
          <text x="10" y="86" class="vizsm">El byte guarda</text><text x="10" y="112" class="vizbig" style="font-size:24px;fill:${bad ? 'var(--err)' : 'var(--ok)'}">${o.s}</text>
          <text x="10" y="160" class="vizlab">${o.laps ? `Ha dado ${o.laps} vuelta${o.laps > 1 ? 's' : ''}: se pierden ${o.laps * m}` : `Cabe: un byte va de 0 a ${m - 1}`}</text></svg>`;
      }
    },
    mc_bounce: (() => {
      // Dos pulsaciones reales con sus rebotes (instantes en ms en que cambia la lectura del pin)
      const TG = [15, 15.8, 17, 18.2, 19, 21.5, 22.3, 60, 61, 62.5, 85, 85.6, 86.8, 87.5, 88.9, 130, 131, 132], END = 150;
      const raw = t => { let v = 1; for (const x of TG) { if (t >= x) v ^= 1; else break; } return v; };
      const X = t => (10 + t / END * 280).toFixed(1);
      const path = (ch, yh, yl) => { let v = 1, d = `M10 ${yh}`; for (const t of ch) { v ^= 1; d += `H${X(t)}V${v ? yh : yl}`; } return d + 'H290'; };
      return {
        calc: p => { let acc = 1, tl = -1e9, n = 0; const ch = []; for (let i = 0; i <= END * 10; i++) { const t = i / 10, r = raw(t); if (r !== acc && t - tl > p.T) { acc = r; tl = t; ch.push(t); if (!r) n++; } } return { n, ch }; },
        svg: (p, o) => {
          const lock = p.T > 0 ? o.ch.map(c => `<rect x="${X(c)}" y="94" width="${(Math.min(c + p.T, END) - c) / END * 280}" height="44" fill="var(--ice)" opacity=".25"/>`).join('') : '';
          return `<svg viewBox="0 0 300 170" class="viz"><text x="10" y="16" class="vizsm">Lo que lee el pin (con rebotes)</text><text x="290" y="16" text-anchor="end" class="vizsm">0–150 ms</text>
            <path d="${path(TG, 26, 62)}" fill="none" stroke="var(--led)" stroke-width="2"/>
            <text x="10" y="88" class="vizsm">Lo que acepta (sombreado: se ignora)</text>${lock}
            <path d="${path(o.ch, 100, 134)}" fill="none" stroke="var(--ok)" stroke-width="2.5"/>
            <text x="10" y="162" class="vizlab" style="fill:${o.n === 2 ? 'var(--ok)' : 'var(--err)'}">Detectadas: ${o.n} · reales: 2</text></svg>`;
        }
      };
    })(),
    zener: {
      calc: p => { const Vout = p.Vin <= p.Vz ? p.Vin * 0.98 : p.Vz + (p.Vin - p.Vz) * 0.01; return { Vout, Iz: Math.max(0, (p.Vin - p.Vz) / 220) }; },
      svg: (p, o) => `<svg viewBox="0 0 300 170" class="viz">${hbar(40, 60, 220, p.Vin / 12, '#3E8FCB', 'Entrada ' + fV(p.Vin))}${hbar(40, 110, 220, o.Vout / 12, '#F2A900', 'Salida ' + fV(o.Vout))}
        <path d="M${40 + 220 * p.Vz / 12} 40V130" stroke="var(--err)" stroke-dasharray="4 4"/><text x="${40 + 220 * p.Vz / 12}" y="150" text-anchor="middle" class="vizsm">Vz ${fV(p.Vz)}</text>
        <text x="40" y="165" class="vizsm">Corriente por el zener ${fI(o.Iz)}</text></svg>`
    },
    /* --- Curso base ampliado: alterna, bobinas, osciloscopio y Schmitt --- */
    lcResonance: {
      calc: p => { const L = p.L * 1e-6, C = p.C * 1e-12; const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C)), Q = Math.sqrt(L / C) / p.R; return { f0, Q, BW: f0 / Q }; },
      svg: (p, o) => {
        const lo = 5, hi = Math.log10(2e7), X = f => 30 + 255 * (Math.log10(f) - lo) / (hi - lo), Y = a => 140 - 110 * a;
        const fs = []; for (let i = 0; i <= 140; i++) fs.push(10 ** (lo + (hi - lo) * i / 140));
        fs.push(o.f0, o.f0 * (1 + 0.5 / o.Q), o.f0 / (1 + 0.5 / o.Q)); fs.sort((a, b) => a - b);
        const pts = fs.map(f => { const d = f / o.f0 - o.f0 / f; return `${X(f).toFixed(1)},${Y(1 / Math.sqrt(1 + o.Q * o.Q * d * d)).toFixed(1)}`; }).join(' ');
        const fH = f => f >= 1e6 ? num(f / 1e6, 2) + ' MHz' : num(f / 1e3, f >= 1e5 ? 0 : 1) + ' kHz';
        const band = o.f0 >= 0.526e6 && o.f0 <= 1.7e6 ? ' · onda media' : o.f0 >= 3e6 ? ' · onda corta' : '';
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M30 25V140H288" ${st} stroke-width="1.5"/>
          ${[1e5, 1e6, 1e7].map(f => `<path d="M${X(f).toFixed(1)} 140v4" stroke="currentColor"/><text x="${X(f).toFixed(1)}" y="156" text-anchor="middle" class="vizsm">${fH(f)}</text>`).join('')}
          <polyline points="${pts}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <path d="M${X(o.f0).toFixed(1)} 30V140" stroke="var(--muted)" stroke-dasharray="4 4"/>
          <text x="34" y="18" class="vizlab">f₀ = ${fH(o.f0)}${band}</text>
          <text x="34" y="172" class="vizsm">Q = ${num(o.Q, 1)} · ancho de banda ${fH(o.BW)}</text></svg>`;
      }
    },
    rlCurrent: {
      calc: p => { const tau = p.L * 1e-3 / p.R; return { tau, tauMs: tau * 1000, If: p.V / p.R }; },
      anim: true, restart: true,
      svg: (p, o, t) => {
        const fT = s => s >= 1 ? num(s, 2) + ' s' : s >= 1e-3 ? num(s * 1000, 2) + ' ms' : num(s * 1e6, 1) + ' µs';
        const n = Math.round(Math.min(1, (t % 3.5) / 2.5) * 60);
        const I = [], V = []; for (let i = 0; i <= 60; i++) { const e = Math.exp(-5 * i / 60); I.push(`${40 + i * 4},${(145 - 105 * (1 - e)).toFixed(1)}`); V.push(`${40 + i * 4},${(145 - 105 * e).toFixed(1)}`); }
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M40 30V145H285" ${st} stroke-width="1.5"/>
          <polyline points="${I.join(' ')}" fill="none" stroke="var(--line)" stroke-width="2"/><polyline points="${V.join(' ')}" fill="none" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 3"/>
          <polyline points="${I.slice(0, n + 1).join(' ')}" fill="none" stroke="var(--led)" stroke-width="3"/><polyline points="${V.slice(0, n + 1).join(' ')}" fill="none" stroke="var(--ice)" stroke-width="2.5" stroke-dasharray="4 3"/>
          <path d="M88 145V${(145 - 105 * 0.632).toFixed(1)}H40" stroke="var(--muted)" stroke-dasharray="2 4" fill="none"/><text x="88" y="158" text-anchor="middle" class="vizsm">τ</text><text x="280" y="158" text-anchor="end" class="vizsm">5τ</text>
          <text x="45" y="20" class="vizlab">τ = L / R = ${fT(o.tau)} · final ${fI(o.If)}</text>
          <text x="150" y="172" text-anchor="middle" class="vizsm">continua: corriente · discontinua: tensión en la bobina</text></svg>`;
      }
    },
    scopeTrigger: {
      calc: p => { const trig = Math.abs(p.lvl) < 2, cyc = 10 * p.tdiv; return { trig: trig ? 1 : 0, cyc, ok: trig && cyc >= 2 && cyc <= 5 ? 1 : 0 }; },
      anim: true,
      svg: (p, o, t) => {
        const x0 = 20, y0 = 79, dx = 26, dy = 16; // 10 × 8 divisiones, 1 V/div
        const ph = o.trig ? Math.asin(p.lvl / 2) : t * 2.7;
        let d = ''; for (let i = 0; i <= 260; i += 2) { const ms = i / dx * p.tdiv, v = 2 * Math.sin(2 * Math.PI * ms + ph); d += (i ? 'L' : 'M') + (x0 + i) + ' ' + (y0 - v * dy).toFixed(1); }
        let g = ''; for (let i = 0; i <= 10; i++) g += `<path d="M${x0 + i * dx} 15V143" stroke="var(--line)" stroke-width="${i === 5 ? 1.2 : 0.6}"/>`;
        for (let j = 0; j <= 8; j++) g += `<path d="M20 ${15 + j * dy}H280" stroke="var(--line)" stroke-width="${j === 4 ? 1.2 : 0.6}"/>`;
        const yl = y0 - p.lvl * dy;
        return `<svg viewBox="0 0 300 175" class="viz">${g}<path d="${d}" fill="none" stroke="var(--ok)" stroke-width="2.2"/>
          <path d="M20 ${yl.toFixed(1)}H280" stroke="var(--led)" stroke-dasharray="5 4"/><path d="M8 ${(yl - 5).toFixed(1)}l10 5l-10 5z" fill="var(--led)"/>
          <text x="20" y="160" class="vizlab">${o.trig ? `Disparo estable · ${num(o.cyc, 1)} ciclos en pantalla` : 'Sin disparo: el nivel no corta la señal'}</text>
          <text x="20" y="173" class="vizsm">1 V/div · ${num(p.tdiv, 2)} ms/div · señal de 1 kHz y 2 V de pico</text></svg>`;
      }
    },
    schmittHyst: {
      calc: p => {
        const k = p.R1 / p.R2, up = 2.5 + 2.5 * k, dn = 2.5 - 2.5 * k, sig = [], outs = []; let out = 0, tr = 0;
        for (let i = 0; i <= 240; i++) { const x = i / 240, u = (2 * x) % 1, v = 1.5 + 2 * (u < 0.5 ? 2 * u : 2 - 2 * u) + 0.12 * Math.sin(2 * Math.PI * 41 * x) + 0.07 * Math.sin(2 * Math.PI * 61 * x + 1.3); if (!out && v > up) { out = 1; tr++; } else if (out && v < dn) { out = 0; tr++; } sig.push(v); outs.push(out); }
        return { up, dn, H: 5 * k, tr, clean: tr === 4 ? 1 : 0, sig, outs };
      },
      svg: (p, o) => {
        const X = i => 30 + i * 1.05, Y = v => Math.max(6, Math.min(100, 95 - (v - 1) * 80 / 3));
        const s = o.sig.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
        let q = ''; o.outs.forEach((b, i) => { q += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + (b ? 112 : 136); });
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M30 6V100M30 140H285" ${st} stroke-width="1.2"/>
          <polyline points="${s}" fill="none" stroke="var(--ice)" stroke-width="1.8"/>
          <path d="M30 ${Y(o.up).toFixed(1)}H285" stroke="var(--err)" stroke-dasharray="5 4"/><path d="M30 ${Y(o.dn).toFixed(1)}H285" stroke="var(--ok)" stroke-dasharray="5 4"/>
          <path d="${q}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="2" y="56" class="vizsm">ent.</text><text x="2" y="128" class="vizsm">sal.</text>
          <text x="8" y="156" class="vizlab">Sube a ${fV(o.up)} · baja a ${fV(o.dn)} · H ${fV(o.H)}</text>
          <text x="30" y="171" class="vizsm">${o.tr === 4 ? 'Salida limpia: 4 cambios' : o.tr === 0 ? 'La entrada nunca llega al umbral de subida' : o.tr + ' cambios: el ruido hace rebotar la salida'}</text></svg>`;
      }
    },
    zTriangle: {
      calc: p => { const Z = Math.hypot(p.R, p.X), phi = Math.atan2(p.X, p.R) * 180 / Math.PI; return { Z, phi, aphi: Math.abs(phi) }; },
      svg: (p, o) => {
        const s = Math.min(0.22, 200 / Math.max(p.R, 1), 62 / Math.max(Math.abs(p.X), 1)), x0 = 40, y0 = 85, x1 = x0 + p.R * s, y1 = y0 - p.X * s;
        const kind = p.X > 0 ? 'Inductiva: la corriente va retrasada' : p.X < 0 ? 'Capacitiva: la corriente va adelantada' : 'Resistiva pura: tensión y corriente en fase';
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M${x0} ${y0}H${x1.toFixed(1)}" stroke="var(--led)" stroke-width="4"/><path d="M${x1.toFixed(1)} ${y0}V${y1.toFixed(1)}" stroke="var(--ice)" stroke-width="4"/>
          <path d="M${x0} ${y0}L${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="currentColor" stroke-width="3"/>
          <text x="${((x0 + x1) / 2).toFixed(1)}" y="${y0 + (p.X >= 0 ? 16 : -8)}" text-anchor="middle" class="vizsm">R ${num(p.R, 0)} Ω</text>
          <text x="${(x1 + 6).toFixed(1)}" y="${((y0 + y1) / 2 + 4).toFixed(1)}" class="vizsm">X ${num(p.X, 0)} Ω</text>
          <text x="20" y="20" class="vizlab">Z = ${num(o.Z, 0)} Ω · φ = ${num(o.phi, 1)}°</text>
          <text x="20" y="168" class="vizsm">${kind}</text></svg>`;
      }
    },
    battery: {
      calc: p => ({ h: p.mAh / p.mA }),
      svg: (p, o) => `<svg viewBox="0 0 300 150" class="viz"><rect x="40" y="40" width="200" height="70" rx="8" ${st}/><rect x="240" y="60" width="12" height="30" rx="3" fill="currentColor"/>
        <rect x="46" y="46" width="${188 * Math.min(1, p.mAh / 3000)}" height="58" rx="5" fill="var(--ok)" opacity=".7"/><text x="140" y="82" text-anchor="middle" class="vizbig">${p.mAh} mAh</text>
        <text x="40" y="136" class="vizlab">Consumo ${p.mA} mA → dura unas ${num(o.h, 1)} h</text></svg>`
    }
  };
  function heat(x) { const r = Math.round(231 + 24 * x), g = Math.round(211 - 150 * x), b = Math.round(168 - 140 * x); return `rgb(${r},${g},${b})`; }
  function batt(x, y, V) { return `<g transform="translate(${x} ${y})"><rect x="-13" y="-22" width="26" height="44" rx="4" fill="var(--board)"/><rect x="-13" y="-22" width="26" height="10" rx="3" fill="#E5484D"/><text x="-17" y="4" text-anchor="end" class="vizlab">${num(V, 1)} V</text></g>`; }
  function resBody() { return `<rect x="-20" y="-8" width="40" height="16" rx="8" fill="#E7D3A8" stroke="#C9B183"/><rect x="-12" y="-8" width="4" height="16" fill="#7B4A21"/><rect x="-4" y="-8" width="4" height="16" fill="#1a1a1a"/><rect x="4" y="-8" width="4" height="16" fill="#D22B2B"/>`; }
  function ledBulb(b, burnt) { return `<circle r="28" fill="#FF3B30" opacity="${(b * 0.45).toFixed(2)}"/><circle r="13" fill="${burnt ? '#3a2020' : '#FF3B30'}" style="filter:brightness(${(0.45 + 0.9 * b).toFixed(2)})"/><path d="M7 -11a13 13 0 0 1 0 22" stroke="#fff" stroke-opacity=".5" fill="none"/>`; }
  function npnSym() { return `<circle cx="4" cy="0" r="18" ${st}/><path d="M-30 0h24M-6 -12v24M-6 -6l16 -12v-12M-6 6l16 12v22" ${st}/>`; }
  function flowPath(d, I, ref) {
    const sp = I <= 1e-7 ? 0 : Math.max(0.25, Math.min(6, ref / I));
    return `<path d="${d}" ${st}/><path d="${d}" class="flow" style="${sp ? `animation-duration:${sp.toFixed(2)}s` : 'animation:none;opacity:0'}"/>`;
  }
  const flowLoop = flowPath;
  function stackBar(x, y, w, parts, total) {
    let s = '', cx = x;
    for (const [v, col, lab] of parts) { const ww = w * v / total; s += `<rect x="${cx}" y="${y - 12}" width="${Math.max(0, ww)}" height="16" fill="${col}" rx="3"/><text x="${cx + 2}" y="${y + 20}" class="vizsm">${lab}</text>`; cx += ww; }
    return s + `<text x="${x + w}" y="${y - 18}" text-anchor="end" class="vizsm">Suma = ${num(total, 1)} V de la pila</text>`;
  }
  function hbar(x, y, w, f, col, lab) { return `<rect x="${x}" y="${y - 10}" width="${w}" height="14" rx="4" fill="var(--line)"/><rect x="${x}" y="${y - 10}" width="${w * Math.max(0, Math.min(1, f))}" height="14" rx="4" fill="${col}"/><text x="${x}" y="${y - 14}" class="vizsm">${lab}</text>`; }
  function fmtParam(k, v, def) {
    if (def.fmt === 'R') return fR(v); if (def.fmt === 'C') return v + ' µF'; if (def.fmt === 'mA') return num(v * 1000, 0) + ' mA';
    return num(v, def.dec ?? 1) + (def.unit ? ' ' + def.unit : '');
  }
  function tune(ex, el, ctx) {
    const viz = VIZ[ex.viz], p = {}, defs = ex.params;
    for (const [k, d] of Object.entries(defs)) p[k] = d.val;
    el.innerHTML = `<div class="tune"><div class="vizbox"></div>${Object.entries(defs).filter(([, d]) => !d.fixed).map(([k, d]) => {
      const list = d.list || (d.fmt === 'R' ? E12.filter(r => r >= (d.min || 10) && r <= (d.max || 1e6)) : null);
      const max = list ? list.length - 1 : d.max, step = list ? 1 : d.step, v = list ? Math.max(0, list.indexOf(d.val)) : d.val;
      return `<label class="tctl"><span>${d.label} <b data-out="${k}">${fmtParam(k, d.val, d)}</b></span><input type="range" min="${list ? 0 : d.min}" max="${max}" step="${step}" value="${v}" data-k="${k}"></label>`;
    }).join('')}${ex.goal ? `<p class="goal" aria-live="polite"></p>` : ''}</div>`;
    const box = el.querySelector('.vizbox'), goalEl = el.querySelector('.goal');
    let t0 = performance.now(), raf = 0, o = viz.calc(p);
    const meets = () => { const v = o[ex.goal.q]; return v >= ex.goal.min && v <= ex.goal.max && !(ex.goal.notBurnt && o.burnt); };
    function paint() { o = viz.calc(p); box.innerHTML = viz.svg(p, o, (performance.now() - t0) / 1000); if (goalEl) { const ok = meets(); goalEl.className = 'goal' + (ok ? ' met' : ''); goalEl.textContent = ok ? 'Objetivo conseguido' : ex.goal.text; } }
    el.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.k, d = defs[k], list = d.list || (d.fmt === 'R' ? E12.filter(r => r >= (d.min || 10) && r <= (d.max || 1e6)) : null);
      p[k] = list ? list[+inp.value] : +inp.value; el.querySelector(`[data-out="${k}"]`).textContent = fmtParam(k, p[k], d); paint();
      if (viz.anim && (ex.viz === 'rc' || viz.restart)) t0 = performance.now();
    }));
    paint();
    if (viz.anim) { const loop = () => { paint(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
    ctx.ready(true);
    return { check: () => ex.goal ? { ok: meets(), msg: meets() ? null : ex.goal.hint } : { ok: true }, destroy: () => cancelAnimationFrame(raf) };
  }

  /* ============ MULTÍMETRO ============ */
  const MANUAL = [
    { k: 'OFF' }, { k: 'V', r: 600, lab: '600' }, { k: 'V', r: 200, lab: '200' }, { k: 'V', r: 20, lab: '20' }, { k: 'V', r: 2, lab: '2' }, { k: 'V', r: 0.2, lab: '200m' },
    { k: 'A', r: 10, lab: '10A' }, { k: 'A', r: 0.2, lab: '200m' }, { k: 'A', r: 0.02, lab: '20m' }, { k: 'A', r: 0.002, lab: '2m' }, { k: 'A', r: 0.0002, lab: '200µ' },
    { k: 'R', r: 200, lab: '200' }, { k: 'R', r: 2000, lab: '2k' }, { k: 'R', r: 20000, lab: '20k' }, { k: 'R', r: 200000, lab: '200k' }, { k: 'R', r: 2e6, lab: '2M' },
    { k: 'C', lab: '·)))' }, { k: 'VAC', r: 200, lab: '200' }, { k: 'VAC', r: 600, lab: '600' }
  ];
  const AUTO = [{ k: 'OFF' }, { k: 'V', lab: 'V⎓' }, { k: 'VAC', lab: 'V~' }, { k: 'A', lab: 'A⎓' }, { k: 'R', lab: 'Ω' }, { k: 'C', lab: '·)))' }];
  const GROUPLAB = { V: 'V⎓', A: 'A⎓', R: 'Ω', VAC: 'V~' };
  // Escenas: esquema + puntos de medida + circuito para el motor
  const SCENES = {
    bat: { w: 300, h: 150, powered: true, parts: [{ k: 'bat', x: 150, y: 75, rot: 90, lab: 'Pila 9 V', lx: 50, ly: 4 }], wires: [[150, 45, 150, 22], [150, 105, 150, 128]],
      pts: { P: [150, 22, 1], N: [150, 128, 0] }, n: 2, els: () => [{ t: 'V', a: 1, b: 0, v: 9.42, rs: 1.5 }] },
    led: { w: 300, h: 160, powered: true, parts: [{ k: 'bat', x: 40, y: 85, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 140, y: 30, lab: '470 Ω' }, { k: 'led', x: 240, y: 85, rot: 90, lab: 'LED' }],
      wires: [[40, 55, 40, 30, 110, 30], [170, 30, 240, 30, 240, 55], [240, 115, 240, 140, 40, 140, 40, 115]],
      pts: { A: [75, 30, 1], B: [205, 30, 2], C: [240, 140, 0], D: [40, 140, 0] }, n: 3,
      els: () => [{ t: 'V', a: 1, b: 0, v: 9, rs: 1 }, { t: 'R', a: 1, b: 2, r: 470 }, { t: 'D', a: 2, b: 0, vf: 1.8, ron: 12 }] },
    ledgap: { w: 300, h: 160, powered: true, parts: [{ k: 'bat', x: 40, y: 85, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 130, y: 30, lab: '470 Ω' }, { k: 'led', x: 250, y: 85, rot: 90, lab: 'LED' }],
      wires: [[40, 55, 40, 30, 100, 30], [160, 30, 185, 30], [215, 30, 250, 30, 250, 55], [250, 115, 250, 140, 40, 140, 40, 115]],
      pts: { A: [70, 30, 1], X: [185, 30, 2], Y: [215, 30, 3], C: [250, 140, 0] }, n: 4, gap: ['X', 'Y'],
      els: () => [{ t: 'V', a: 1, b: 0, v: 9, rs: 1 }, { t: 'R', a: 1, b: 2, r: 470 }, { t: 'D', a: 3, b: 0, vf: 1.8, ron: 12 }] },
    div: { w: 300, h: 200, powered: true, parts: [{ k: 'bat', x: 40, y: 100, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 160, y: 60, rot: 90, lab: 'R1 2 kΩ' }, { k: 'res', x: 160, y: 140, rot: 90, lab: 'R2 1 kΩ' }],
      wires: [[40, 70, 40, 15, 160, 15, 160, 30], [160, 90, 160, 110], [160, 100, 230, 100], [160, 170, 160, 185, 40, 185, 40, 130]], dots: [[160, 100]],
      pts: { T: [100, 15, 1], M: [230, 100, 2], B: [100, 185, 0] }, n: 3,
      els: () => [{ t: 'V', a: 1, b: 0, v: 9, rs: 1 }, { t: 'R', a: 1, b: 2, r: 2000 }, { t: 'R', a: 2, b: 0, r: 1000 }] },
    res: { w: 300, h: 120, powered: false, custom: v => `<path d="M30 60H95M205 60H270" stroke="#9AA3B2" stroke-width="4" stroke-linecap="round"/><rect x="95" y="42" width="110" height="36" rx="16" fill="#E7D3A8" stroke="#C9B183"/>` + resBands(v).map((d, i) => `<rect x="${112 + i * 18}" y="42" width="9" height="36" fill="${BANDHEX[d]}"/>`).join('') + `<rect x="180" y="42" width="9" height="36" fill="#C9A227"/>`,
      pts: { a: [30, 60, 1], b: [270, 60, 2] }, n: 3, els: v => [{ t: 'R', a: 1, b: 2, r: v }] },
    wires3: { w: 300, h: 170, powered: false, custom: () => ['#E5484D', '#2EA44F', '#3E8FCB'].map((c, i) => `<path d="M40 ${40 + i * 50}C120 ${10 + i * 50} 180 ${70 + i * 50} 260 ${40 + i * 50}" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/><text x="150" y="${30 + i * 50}" text-anchor="middle" class="vizsm">Cable ${'ABC'[i]}</text>`).join(''),
      pts: { A1: [40, 40, 1], A2: [260, 40, 2], B1: [40, 90, 3], B2: [260, 90, 4], C1: [40, 140, 5], C2: [260, 140, 6] }, n: 7,
      els: () => [{ t: 'R', a: 1, b: 2, r: 0.3 }, { t: 'R', a: 3, b: 4, r: 1e10 }, { t: 'R', a: 5, b: 6, r: 0.4 }] },
    npn: { w: 300, h: 200, powered: true, parts: [{ k: 'vcc', x: 40, y: 22, lab2: '+9 V' }, { k: 'res', x: 100, y: 110, lab: 'RB 10 kΩ' }, { k: 'npn', x: 180, y: 110, lab: 'Q1', lx: 40, ly: 4 }, { k: 'res', x: 190, y: 45, rot: 90, lab: 'RC 470 Ω' }, { k: 'gnd', x: 190, y: 182 }],
      wires: [[40, 34, 40, 110, 70, 110], [130, 110, 150, 110], [40, 15, 40, 8, 190, 8, 190, 15], [190, 75, 190, 80], [190, 80, 250, 80], [190, 140, 190, 170], [190, 160, 250, 160]],
      pts: { B: [140, 110, 2], C: [250, 80, 3], E: [250, 160, 0], V: [120, 8, 1] }, n: 4,
      els: () => [{ t: 'V', a: 1, b: 0, v: 9, rs: 1 }, { t: 'R', a: 1, b: 2, r: 10000 }, { t: 'R', a: 1, b: 3, r: 470 }, { t: 'Q', c: 3, b: 2, e: 0, beta: 150 }] },
    zener: { w: 300, h: 170, powered: true, parts: [{ k: 'bat', x: 40, y: 85, rot: 90, lab: '9 V', lx: -18, ly: 4 }, { k: 'res', x: 130, y: 25, lab: '220 Ω' }, { k: 'zener', x: 200, y: 85, rot: -90, lab: '5,1 V', lx: 40, ly: 4 }],
      wires: [[40, 55, 40, 25, 100, 25], [160, 25, 260, 25], [200, 25, 200, 55], [200, 115, 200, 150], [40, 115, 40, 150, 260, 150]], dots: [[200, 25], [200, 150]],
      pts: { T: [260, 25, 2], B: [260, 150, 0], A: [70, 25, 1] }, n: 3,
      els: () => [{ t: 'V', a: 1, b: 0, v: 9, rs: 1 }, { t: 'R', a: 1, b: 2, r: 220 }, { t: 'D', a: 0, b: 2, vf: 0.7, ron: 1, vz: 5.1, rz: 4 }] }
  };
  function resBands(r) { const s = String(Math.round(r)); return [+s[0], s.length > 1 ? +s[1] : 0, Math.max(0, s.length - 2)]; }

  function meter(ex, el, ctx) {
    const auto = ex.auto ?? ctx.meterAuto;
    const DIAL = auto ? AUTO : MANUAL;
    const sc = SCENES[ex.scene];
    const S = { dial: 0, jack: ex.startJack || 'VO', red: null, black: null, active: 'red', fuse: false };
    const task = ex.task;
    el.innerHTML = `<div class="mtr">
      <div class="mscene"></div>
      <div class="mprobe" role="group" aria-label="Punta activa"><button data-p="red" class="pr">Punta roja</button><button data-p="black" class="pb">Punta negra</button><button data-p="clear" class="pc">Quitar puntas</button></div>
      <div class="mbody"><svg viewBox="0 0 300 412" class="msvg"></svg></div>
      <div class="mrot"><button data-r="-1" aria-label="Girar selector a la izquierda">◀ Girar</button><span class="mpos"></span><button data-r="1" aria-label="Girar selector a la derecha">Girar ▶</button></div>
    </div>`;
    const scEl = el.querySelector('.mscene'), msvg = el.querySelector('.msvg'), posEl = el.querySelector('.mpos');
    function sceneSVG() {
      let body = sc.custom ? sc.custom(ex.val) : '';
      const sch = sc.custom ? '' : Schem.draw({ w: sc.w, h: sc.h, parts: sc.parts, wires: sc.wires, dots: sc.dots }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      const gapMark = sc.gap ? `<text x="${(sc.pts[sc.gap[0]][0] + sc.pts[sc.gap[1]][0]) / 2}" y="${sc.pts[sc.gap[0]][1] - 10}" text-anchor="middle" class="vizsm">corte</text>` : '';
      const pts = Object.entries(sc.pts).map(([k, [x, y]]) => `<g class="mpt" data-pt="${k}"><circle cx="${x}" cy="${y}" r="16" class="mhit"/><circle cx="${x}" cy="${y}" r="6" class="mdot"/>${S.red === k ? probeTip(x, y, '#E5484D') : ''}${S.black === k ? probeTip(x, y, '#222') : ''}</g>`).join('');
      scEl.innerHTML = `<svg viewBox="0 0 ${sc.w} ${sc.h}" class="viz" style="color:var(--ink)">${body}${sch}${gapMark}${pts}</svg>`;
    }
    const probeTip = (x, y, c) => `<path d="M${x} ${y}l-7 -24h14z" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
    function compute() {
      const d = DIAL[S.dial];
      if (d.k === 'OFF') return { off: true };
      const r = S.red && sc.pts[S.red][2], b = S.black && sc.pts[S.black][2];
      const both = S.red && S.black;
      const shunt = S.jack === 'A10' ? 0.01 : S.jack === 'mA' ? 1 : null;
      if ((d.k === 'R' || d.k === 'C') && S.jack === 'VO') {
        if (!both) return { val: Infinity, k: d.k };
        if (r === b) return { val: 0.2, k: d.k };
        if (sc.powered) return { val: 37 + Math.random() * 400, k: d.k, bogus: true };
        const els = (sc.els(ex.val)).concat([{ t: 'V', a: r, b, v: 1, rs: 1e-3 }]);
        Solver.solve({ n: sc.n, gnd: 0, els });
        const I = els[els.length - 1].i;
        return { val: I < 1e-9 ? Infinity : 1 / I, k: d.k };
      }
      if (!both) return { val: 0, k: d.k };
      const els = sc.els(ex.val).slice();
      if (shunt) els.push({ t: 'R', a: r, b, r: shunt }); else els.push({ t: 'R', a: r, b, r: 1e7 });
      const res = Solver.solve({ n: sc.n, gnd: 0, els });
      const vr = res.v[r] - res.v[b];
      if (shunt) {
        const I = vr / shunt;
        if (S.jack === 'mA' && Math.abs(I) > 0.25) S.fuse = true;
        if (S.fuse && S.jack === 'mA') return { val: 0, k: d.k, fuse: true };
        if (d.k === 'A') return { val: I, k: 'A' };
        return { val: d.k === 'VAC' ? 0 : vr, k: d.k, shorted: Math.abs(I) > 0.05 };
      }
      if (d.k === 'V') return { val: vr, k: 'V' };
      if (d.k === 'VAC') return { val: 0, k: 'VAC' };
      return { val: 0, k: d.k };
    }
    function display(m) {
      const d = DIAL[S.dial];
      if (m.off) return { txt: '', unit: '' };
      if (d.k === 'C') { const cont = m.val < 50; beep(cont); return { txt: m.val === Infinity || m.val > 1999 ? (auto ? 'OL' : '1') : num(m.val, 1).replace(',', '.'), unit: auto ? 'Ω' : '', cont, over: !(m.val < 2000) }; }
      beep(false);
      let ranges, unitBase;
      if (d.k === 'V' || d.k === 'VAC') ranges = [[0.2, 'mV', 1e3], [2, 'V', 1], [20, 'V', 1], [200, 'V', 1], [600, 'V', 1]];
      if (d.k === 'A') ranges = S.jack === 'A10' ? [[10, 'A', 1]] : [[0.0002, 'µA', 1e6], [0.002, 'mA', 1e3], [0.02, 'mA', 1e3], [0.2, 'mA', 1e3]];
      if (d.k === 'R') ranges = [[200, 'Ω', 1], [2000, 'kΩ', 1e-3], [20000, 'kΩ', 1e-3], [200000, 'kΩ', 1e-3], [2e6, 'MΩ', 1e-6]];
      let rg;
      if (auto) rg = ranges.find(x => Math.abs(m.val) < x[0] * 0.9995) || ranges[ranges.length - 1];
      else rg = ranges.find(x => Math.abs(x[0] - d.r) < 1e-12) || (d.k === 'A' && S.jack === 'A10' ? ranges[0] : ranges.find(x => x[0] >= d.r) || ranges[ranges.length - 1]);
      const max = rg[0], disp = m.val * rg[2], dmax = max * rg[2];
      const over = Math.abs(m.val) >= max * 0.9995 || m.val === Infinity;
      if (over) return { txt: auto ? 'OL' : '1', unit: auto ? rg[1] : '', over: true };
      const dec = Math.max(0, 3 - Math.round(Math.log10(dmax / 2)));
      let txt = Math.abs(disp).toFixed(dec);
      if (disp < 0 && Math.abs(disp) > 0.5 * 10 ** -dec) txt = '-' + txt;
      return { txt, unit: auto ? rg[1] : '', over: false, range: rg[0] };
    }
    function meterSVG(dsp) {
      const n = DIAL.length, cx = 150, cy = 226, R = 74;
      const ang = i => (-150 + 300 * i / (n - 1)) * Math.PI / 180;
      let dial = `<circle cx="${cx}" cy="${cy}" r="${R + 26}" class="mdialbg"/><circle cx="${cx}" cy="${cy}" r="${R - 16}" class="mknob"/>`;
      let lastG = null;
      DIAL.forEach((d, i) => {
        const a = ang(i), x = cx + Math.sin(a) * (R + 13), y = cy - Math.cos(a) * (R + 13);
        dial += `<g class="mdpos ${i === S.dial ? 'on' : ''}" data-d="${i}"><circle cx="${x}" cy="${y}" r="12" class="mdhit"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" class="mdl ${d.k}">${d.k === 'OFF' ? 'OFF' : d.lab}</text></g>`;
        if (!auto && d.k !== lastG && GROUPLAB[d.k]) { const a2 = ang(i + (d.k === 'V' ? 2 : d.k === 'VAC' ? 0.5 : 2)); dial += `<text x="${cx + Math.sin(a2) * (R + 37)}" y="${cy - Math.cos(a2) * (R + 37) + 4}" text-anchor="middle" class="mgrp">${GROUPLAB[d.k]}</text>`; }
        lastG = d.k;
      });
      const a = ang(S.dial);
      dial += `<path d="M${cx} ${cy}L${cx + Math.sin(a) * (R - 16)} ${cy - Math.cos(a) * (R - 16)}" class="mptr"/>`;
      const jacks = [['A10', '10A', 60], ['mA', 'mA', 120], ['COM', 'COM', 180], ['VO', 'VΩ', 240]];
      const js = jacks.map(([k, l, x]) => `<g class="mjack ${k === S.jack ? 'red' : ''} ${k === 'COM' ? 'com' : ''}" data-j="${k}"><circle cx="${x}" cy="378" r="15" class="mjo"/><circle cx="${x}" cy="378" r="7" class="mji"/><text x="${x}" y="356" text-anchor="middle" class="mjl">${l}</text>${k === S.jack ? `<path d="M${x} 378v26" stroke="#E5484D" stroke-width="7" stroke-linecap="round"/>` : ''}${k === 'COM' ? `<path d="M${x} 378v26" stroke="#222" stroke-width="7" stroke-linecap="round"/>` : ''}</g>`).join('');
      return `<rect x="10" y="4" width="280" height="404" rx="26" class="mcase"/><rect x="40" y="24" width="220" height="76" rx="8" class="mlcd"/>
        <text x="245" y="80" text-anchor="end" class="mdig ${dsp.over ? 'ovr' : ''}" ${(!auto && dsp.over) ? 'x="70" text-anchor="start"' : ''}>${dsp.txt}</text>
        <text x="250" y="44" text-anchor="end" class="munit">${dsp.unit || ''}</text>${auto ? '<text x="52" y="44" class="munit">AUTO</text>' : ''}${dsp.cont ? '<text x="52" y="92" class="munit">·)))</text>' : ''}
        ${S.fuse ? '<text x="150" y="118" text-anchor="middle" class="mfuse">Fusible de mA fundido</text>' : ''}${dial}${js}`;
    }
    let last = null;
    function paint() {
      sceneSVG(); last = compute(); const dsp = display(last); msvg.innerHTML = meterSVG(dsp);
      const d = DIAL[S.dial]; posEl.textContent = d.k === 'OFF' ? 'Apagado' : (GROUPLAB[d.k] || 'Continuidad') + (d.r && !auto ? ' · rango ' + d.lab : '');
      el.querySelectorAll('[data-p]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === S.active)));
      last.dsp = dsp;
    }
    el.addEventListener('click', e => {
      const pt = e.target.closest('[data-pt]'), dp = e.target.closest('[data-d]'), jk = e.target.closest('[data-j]'), pb = e.target.closest('[data-p]'), rb = e.target.closest('[data-r]');
      if (pt) { const k = pt.dataset.pt; if (S.active === 'red') { S.red = k; S.active = 'black'; } else { S.black = k; S.active = 'red'; } }
      if (dp) S.dial = +dp.dataset.d;
      if (rb) S.dial = (S.dial + +rb.dataset.r + DIAL.length) % DIAL.length;
      if (jk && jk.dataset.j !== 'COM') S.jack = jk.dataset.j;
      if (pb) { if (pb.dataset.p === 'clear') { S.red = S.black = null; S.active = 'red'; } else S.active = pb.dataset.p; }
      if (pt || dp || jk || pb || rb) { paint(); ctx.ready(true); const hb = el.closest('.q') && el.closest('.q').querySelector('.hintbar'); if (hb) hb.remove(); }
    });
    paint(); ctx.ready(true);
    function check() {
      if (!task) return { ok: true };
      const d = DIAL[S.dial], want = task.measure;
      const fail = msg => ({ ok: false, msg });
      if (S.fuse && (want === 'A' || S.jack === 'mA')) return fail('Has fundido el fusible: con la punta roja en el borne mA el multímetro es casi un cable y lo has puesto en paralelo con la pila. La corriente siempre se mide en serie.' + (want === 'A' ? '' : ' Vuelve a poner la punta roja en VΩ.'));
      if (d.k === 'OFF') return fail('El multímetro está apagado: gira el selector.');
      const wantK = want === 'cont' ? 'C' : want;
      if (d.k !== wantK) return fail({ V: 'Para medir tensión continua, el selector va en la zona V⎓.', A: 'Para medir corriente continua, el selector va en la zona A⎓.', R: 'Para medir resistencia, el selector va en la zona Ω.', C: 'Para comprobar continuidad, usa la posición del pitido ·))).' }[wantK] + (d.k === 'VAC' ? ' V~ es para alterna, como la de un enchufe.' : ''));
      const wantJack = want === 'A' ? (task.big ? 'A10' : 'mA') : 'VO';
      if (S.jack !== wantJack) return fail(want === 'A' ? 'Para medir corriente, la punta roja tiene que ir en el borne mA (o 10A para corrientes grandes).' : 'La punta roja va en el borne VΩ; los bornes de corriente no sirven para esto.');
      const pair = [S.red, S.black];
      if (!S.red || !S.black) return fail('Coloca las dos puntas en el circuito.');
      const target = want === 'A' ? sc.gap : task.between;
      const nodes = p => sc.pts[p][2];
      const same = (a, b) => (nodes(a[0]) === nodes(b[0]) && nodes(a[1]) === nodes(b[1])) || (nodes(a[0]) === nodes(b[1]) && nodes(a[1]) === nodes(b[0]));
      if (!same(pair, target)) return fail(want === 'A' ? 'La corriente se mide en serie: abre el circuito y pon una punta a cada lado del corte, para que toda la corriente pase por el multímetro.' : want === 'V' ? 'La tensión se mide en paralelo: una punta a cada lado de lo que quieres medir.' : 'Las puntas deben ir en los dos extremos de lo que quieres comprobar.');
      if (want === 'R' && last.bogus) return fail('El circuito tiene alimentación: la resistencia siempre se mide sin pila conectada.');
      if (last.dsp.over && want !== 'cont') return fail(auto ? 'Fuera de rango.' : 'La pantalla muestra solo un 1 a la izquierda: el valor supera el rango elegido. Gira a un rango mayor.');
      if (!auto && task.best && want !== 'cont') {
        const better = MANUAL.filter(x => x.k === d.k && x.r < d.r && Math.abs(last.val) < x.r * 0.9995 && !(want === 'A' && x.r === 10));
        if (better.length) return fail(`Se puede leer, pero el rango ${better[better.length - 1].lab} está más cerca del valor y te da más decimales. Elige siempre el rango más bajo que no se desborde.`);
      }
      if (task.sign && last.val < 0) return fail('La pantalla marca un signo menos: tienes las puntas al revés. La roja va al punto más positivo.');
      return { ok: true, msg: `Lectura: ${last.dsp.txt}${last.dsp.unit ? ' ' + last.dsp.unit : ''}${!auto && last.dsp.range ? ' en el rango ' + MANUAL[S.dial].lab : ''}.` };
    }
    return { check, destroy: () => beep(false) };
  }

  /* ============ OTROS WIDGETS ============ */
  function mc(ex, el, ctx) {
    let sel = null;
    const opts = ex.o.map((o, i) => [o, i]);
    const order = ex.keep ? opts : shuffle(opts);
    el.innerHTML = `${ex.code ? `<pre class="code">${esc(ex.code)}</pre>` : ''}${ex.sch ? `<div class="schbox">${Schem.draw(SCH[ex.sch])}</div>` : ''}${ex.symk ? Schem.symbol(ex.symk) : ''}${ex.img ? IMG[ex.img].svg('') : ''}<div class="opts">${order.map(([o, i]) => `<button class="opt" data-i="${i}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`;
    el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sel = +b.dataset.i; ctx.ready(true); }));
    return { check: () => ({ ok: sel === ex.a, right: ex.o[ex.a] }), lock: () => el.querySelectorAll('.opt').forEach(b => b.disabled = true) };
  }
  function pick(ex, el, ctx) { // elegir el esquema correcto
    let sel = null;
    const order = shuffle(ex.o.map((k, i) => [k, i]));
    el.innerHTML = `<div class="opts">${order.map(([k, i]) => `<button class="opt schopt" data-i="${i}" aria-pressed="false">${Schem.draw(SCH[k], { width: 260 })}</button>`).join('')}</div>`;
    el.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { el.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sel = +b.dataset.i; ctx.ready(true); }));
    return { check: () => ({ ok: sel === ex.a, right: 'el esquema marcado' }), lock: () => el.querySelectorAll('.opt').forEach(b => b.disabled = true) };
  }
  function numw(ex, el, ctx) {
    el.innerHTML = `${ex.code ? `<pre class="code">${esc(ex.code)}</pre>` : ''}${ex.sch ? `<div class="schbox">${Schem.draw(SCH[ex.sch])}</div>` : ''}<label class="numin"><input inputmode="decimal" autocomplete="off" placeholder="Tu respuesta" aria-label="Respuesta en ${ex.u}"><span>${ex.u}</span></label>`;
    const inp = el.querySelector('input');
    const parse = s => { s = String(s).trim().replace(/\s/g, '').replace(',', '.').replace(/[^\d.\-]/g, ''); return s === '' ? NaN : Number(s); };
    inp.addEventListener('input', () => ctx.ready(!isNaN(parse(inp.value))));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') ctx.submit(); });
    setTimeout(() => inp.focus(), 50);
    return { check: () => { const v = parse(inp.value), tol = ex.tol ?? Math.max(Math.abs(ex.a) * 0.01, 1e-9); return { ok: Math.abs(v - ex.a) <= tol, right: num(ex.a, 3) + ' ' + ex.u }; }, lock: () => inp.disabled = true };
  }
  function resw(ex, el, ctx) { // leer bandas
    const bandsArr = ex.bands;
    const COL = { negro: 0, marrón: 1, rojo: 2, naranja: 3, amarillo: 4, verde: 5, azul: 6, violeta: 7, gris: 8, blanco: 9 };
    el.innerHTML = `${bigResistor(bandsArr.slice(0, 3).map(b => COL[b]), bandsArr[3])}<p class="small center-t">${bandsArr.join(' · ')}</p>`;
    const inner = document.createElement('div'); el.appendChild(inner);
    return mc({ ...ex, q: '' }, inner, ctx);
  }
  function bigResistor(d, tol = 'dorado') {
    const xs = [88, 118, 148];
    return `<svg class="resistor" viewBox="0 0 300 110" width="300"><path d="M0 55h60M240 55h60" stroke="#9AA3B2" stroke-width="6" stroke-linecap="round"/>
      <path d="M60 30q0-14 18-14h20q10 0 14 8h76q4-8 14-8h20q18 0 18 14v50q0 14-18 14h-20q-10 0-14-8h-76q-4 8-14 8h-20q-18 0-18-14z" fill="#E7D3A8" stroke="#C9B183" stroke-width="2"/>
      ${d.map((x, i) => x == null ? `<rect x="${xs[i]}" y="${i === 0 ? 18 : 26}" width="16" height="${i === 0 ? 74 : 58}" fill="none" stroke="var(--muted)" stroke-dasharray="3 3"/>` : `<rect x="${xs[i]}" y="${i === 0 ? 18 : 26}" width="16" height="${i === 0 ? 74 : 58}" fill="${BANDHEX[x]}" ${x === 9 ? 'stroke="#bbb"' : ''}/>`).join('')}
      <rect x="206" y="18" width="16" height="74" fill="${tol === 'plateado' ? '#BFC4C9' : '#C9A227'}"/></svg>`;
  }
  function bandsw(ex, el, ctx) { // construir resistencia con bandas
    const d = [null, null, null]; let slot = 0;
    el.innerHTML = `<div class="rbox"></div><div class="slots">${['1.ª cifra', '2.ª cifra', 'Multiplicador'].map((l, i) => `<button data-s="${i}">${l}</button>`).join('')}</div>
      <div class="pal">${BAND.map((b, i) => `<button data-c="${i}" aria-label="${b}"><i style="background:${BANDHEX[i]}"></i><span>${b}<br><small>${i} · ×${['1', '10', '100', '1k', '10k', '100k', '1M', '10M', '100M', '1G'][i]}</small></span></button>`).join('')}</div>
      <p class="goal" aria-live="polite"></p>`;
    const val = () => d.some(x => x == null) ? null : (d[0] * 10 + d[1]) * 10 ** d[2];
    function paint() {
      el.querySelector('.rbox').innerHTML = bigResistor(d);
      el.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.s === slot)));
      const v = val(); el.querySelector('.goal').textContent = ex.live && v != null ? 'Valor: ' + fR(v) : (v != null ? 'Bandas completas' : 'Elige un color para cada banda');
      ctx.ready(v != null);
    }
    el.addEventListener('click', e => {
      const s = e.target.closest('[data-s]'), c = e.target.closest('[data-c]');
      if (s) slot = +s.dataset.s;
      if (c) { d[slot] = +c.dataset.c; slot = Math.min(2, slot + 1); }
      if (s || c) paint();
    });
    paint();
    return { check: () => ({ ok: val() === ex.target, right: resBands(ex.target).map(i => BAND[i]).join(', ') }) };
  }
  function symw(ex, el, ctx) { return mc({ ...ex, symk: ex.k }, el, ctx); }
  function match(ex, el, ctx) {
    const L = shuffle(ex.pairs.map((p, i) => [p[0], i])), R = shuffle(ex.pairs.map((p, i) => [p[1], i]));
    let selL = null, mistakes = 0, done = 0;
    const cell = (v) => v.startsWith('sym:') ? Schem.symbol(v.slice(4)).replace('width="120"', 'width="74"') : esc(v);
    el.innerHTML = `<div class="match"><div class="mcol">${L.map(([v, i]) => `<button data-l="${i}">${cell(v)}</button>`).join('')}</div><div class="mcol">${R.map(([v, i]) => `<button data-r="${i}">${cell(v)}</button>`).join('')}</div></div>`;
    el.addEventListener('click', e => {
      const l = e.target.closest('[data-l]'), r = e.target.closest('[data-r]');
      if (l && !l.disabled) { el.querySelectorAll('[data-l]').forEach(b => b.setAttribute('aria-pressed', 'false')); l.setAttribute('aria-pressed', 'true'); selL = l; }
      if (r && !r.disabled && selL) {
        if (r.dataset.r === selL.dataset.l) { r.disabled = selL.disabled = true; r.classList.add('ok'); selL.classList.add('ok'); selL = null; done++; try { navigator.vibrate && navigator.vibrate(15); } catch (_) { } if (done === ex.pairs.length) ctx.ready(true); }
        else { mistakes++; r.classList.add('shake'); selL.classList.add('shake'); setTimeout(() => el.querySelectorAll('.shake').forEach(x => x.classList.remove('shake')), 400); }
      }
    });
    return { check: () => ({ ok: mistakes <= 1, msg: mistakes > 1 ? `Has fallado ${mistakes} parejas. Repásalas: aparecerá de nuevo.` : null }) };
  }
  function order(ex, el, ctx) {
    const pool = shuffle(ex.items.map((t, i) => [t, i])), ans = [];
    el.innerHTML = `<ol class="oans"></ol><div class="opool"></div>`;
    function paint() {
      el.querySelector('.oans').innerHTML = ans.map(i => `<li><button data-a="${i}">${esc(ex.items[i])}</button></li>`).join('') || '<li class="ph">Toca los pasos en orden</li>';
      el.querySelector('.opool').innerHTML = pool.filter(([, i]) => !ans.includes(i)).map(([t, i]) => `<button data-p="${i}">${esc(t)}</button>`).join('');
      ctx.ready(ans.length === ex.items.length);
    }
    el.addEventListener('click', e => { const a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]'); if (a) ans.splice(ans.indexOf(+a.dataset.a), 1); if (p) ans.push(+p.dataset.p); if (a || p) paint(); });
    paint();
    return { check: () => ({ ok: ans.every((v, i) => v === i), right: ex.items.map((t, i) => (i + 1) + '. ' + t).join(' ') }) };
  }
  const GATES = { AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), XOR: (a, b) => a ^ b };
  function gateSym(g) {
    const body = { AND: 'M-20 -20h18a20 20 0 0 1 0 40h-18z', NAND: 'M-20 -20h18a20 20 0 0 1 0 40h-18z', OR: 'M-22 -20q10 20 0 40q30 0 42 -20q-12 -20 -42 -20z', NOR: 'M-22 -20q10 20 0 40q30 0 42 -20q-12 -20 -42 -20z', XOR: 'M-18 -20q10 20 0 40q30 0 42 -20q-12 -20 -42 -20zM-26 -20q10 20 0 40' }[g];
    const bub = g === 'NAND' || g === 'NOR' ? '<circle cx="24" cy="0" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/>' : '';
    return `<svg viewBox="-50 -32 100 64" width="150" style="color:var(--ink);display:block;margin:0 auto"><path d="${body}" ${st}/><path d="M-40 -10h${g === 'XOR' ? 16 : 20}M-40 10h${g === 'XOR' ? 16 : 20}M${bub ? 28 : 20} 0h18" ${st}/>${bub}<text x="-46" y="-6" font-size="9" fill="currentColor">A</text><text x="-46" y="20" font-size="9" fill="currentColor">B</text></svg>`;
  }
  function truth(ex, el, ctx) {
    const f = GATES[ex.gate], out = [null, null, null, null], inp = [0, 0];
    el.innerHTML = `${ex.sch ? `<div class="schbox">${Schem.draw(SCH[ex.sch])}</div>` : gateSym(ex.gate)}
      ${ex.live ? `<div class="live"><button data-in="0">A: <b>0</b></button><button data-in="1">B: <b>0</b></button><span class="lout"></span></div>` : ''}
      <table class="tt"><thead><tr><th>A</th><th>B</th><th>Salida</th></tr></thead><tbody>${[[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b], i) => `<tr><td>${a}</td><td>${b}</td><td><button data-o="${i}">?</button></td></tr>`).join('')}</tbody></table>`;
    function paint() {
      el.querySelectorAll('[data-o]').forEach(b => { const v = out[+b.dataset.o]; b.textContent = v == null ? '?' : v; b.className = v == null ? '' : v ? 'one' : 'zero'; });
      if (ex.live) { el.querySelectorAll('[data-in]').forEach(b => { b.querySelector('b').textContent = inp[+b.dataset.in]; b.setAttribute('aria-pressed', String(!!inp[+b.dataset.in])); }); const o = f(inp[0], inp[1]); el.querySelector('.lout').innerHTML = `<svg viewBox="-30 -30 60 60" width="56">${ledBulb(o)}</svg>`; }
      ctx.ready(out.every(v => v != null));
    }
    el.addEventListener('click', e => { const o = e.target.closest('[data-o]'), i = e.target.closest('[data-in]'); if (o) { const k = +o.dataset.o; out[k] = out[k] == null ? 1 : 1 - out[k]; } if (i) inp[+i.dataset.in] ^= 1; if (o || i) paint(); });
    paint();
    return { check: () => { const ok = [[0, 0], [0, 1], [1, 0], [1, 1]].every(([a, b], i) => out[i] === f(a, b)); return { ok, right: [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => `${a}${b}→${f(a, b)}`).join(', ') }; } };
  }
  function bits(ex, el, ctx) {
    const n = ex.n || 8, b = new Array(n).fill(0);
    el.innerHTML = `<div class="bits">${b.map((_, i) => `<button data-b="${i}"><svg viewBox="-16 -16 32 32" width="30">${ledBulb(0)}</svg><b>0</b><small>${2 ** (n - 1 - i)}</small></button>`).join('')}</div><p class="goal"></p>`;
    const val = () => b.reduce((s, v, i) => s + v * 2 ** (n - 1 - i), 0);
    function paint() { el.querySelectorAll('[data-b]').forEach(x => { const i = +x.dataset.b; x.querySelector('b').textContent = b[i]; x.querySelector('svg').innerHTML = ledBulb(b[i]); x.setAttribute('aria-pressed', String(!!b[i])); }); el.querySelector('.goal').textContent = ex.live ? 'Valor decimal: ' + val() : ''; }
    el.addEventListener('click', e => { const x = e.target.closest('[data-b]'); if (x) { b[+x.dataset.b] ^= 1; paint(); } });
    paint(); ctx.ready(true);
    return { check: () => ex.free ? { ok: true } : ({ ok: val() === ex.target, right: ex.target.toString(2).padStart(n, '0') }) };
  }
  function bbtap(ex, el, ctx) { // protoboard: toca los agujeros conectados
    const C = 10, rows = ['+', '−', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], Y = [14, 30, 60, 76, 92, 108, 124, 156, 172, 188, 204, 220];
    const [sc, sr] = ex.start, sel = new Set();
    const grp = (c, r) => r <= 1 ? 'rail' + r : (r <= 6 ? 'T' : 'B') + c;
    const want = new Set(); for (let r = 0; r < rows.length; r++) for (let c = 0; c < C; c++) if (grp(c, r) === grp(sc, sr) && !(c === sc && r === sr)) want.add(c + ':' + r);
    function paint() {
      let s = `<rect x="0" y="0" width="${30 + C * 22}" height="236" rx="8" class="bbm"/><rect x="4" y="136" width="${22 + C * 22}" height="8" rx="2" class="bbgap"/>`;
      rows.forEach((l, r) => { s += `<text x="8" y="${Y[r] + 4}" class="lbl">${l}</text>`; for (let c = 0; c < C; c++) { const k = c + ':' + r, isS = c === sc && r === sr; s += `<g data-h="${k}"><rect x="${28 + c * 22 - 9}" y="${Y[r] - 7}" width="18" height="14" fill="transparent"/><rect x="${28 + c * 22 - 4}" y="${Y[r] - 4}" width="8" height="8" rx="1.5" class="hole ${isS ? 'hstart' : sel.has(k) ? 'hsel' : ''}"/></g>`; } });
      el.querySelector('svg').innerHTML = s; ctx.ready(sel.size > 0);
    }
    el.innerHTML = `<svg viewBox="0 0 ${30 + C * 22} 236" class="viz bbsvg"></svg><p class="small center-t">Agujero de partida en ámbar. Toca los que quedan conectados a él.</p>`;
    el.addEventListener('click', e => { const h = e.target.closest('[data-h]'); if (!h) return; const k = h.dataset.h; if (k === sc + ':' + sr) return; sel.has(k) ? sel.delete(k) : sel.add(k); paint(); });
    paint();
    return { check: () => { const ok = sel.size === want.size && [...sel].every(k => want.has(k)); return { ok, msg: ok ? null : sr <= 1 ? 'Las filas de alimentación conectan todos los agujeros de la misma línea a lo largo de la placa.' : 'En la zona central, cada columna de 5 agujeros (a–e o f–j) está unida por dentro. La ranura central las separa.' }; } };
  }
  function pin(ex, el, ctx) {
    let sel = null;
    const pins = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND', '5V', 'A0', 'A1', 'A2', 'A3', 'A4'];
    const pwm = ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'];
    el.innerHTML = `${ex.code ? `<pre class="code">${esc(ex.code)}</pre>` : ''}<div class="unohdr">${pins.map(p => `<button data-pin="${p}" aria-pressed="false">${p.replace('D', '')}${pwm.includes(p) ? '<i>~</i>' : ''}</button>`).join('')}</div><p class="small center-t">Cabecera de la placa: ~ indica salida PWM</p>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-pin]'); if (!b) return; el.querySelectorAll('[data-pin]').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sel = b.dataset.pin; ctx.ready(true); });
    return { check: () => ({ ok: Array.isArray(ex.a) ? ex.a.includes(sel) : sel === ex.a, right: Array.isArray(ex.a) ? ex.a.join(', ') : ex.a }) };
  }
  // Imágenes con zonas tocables
  const IMG = {
    led: { svg: s => `<svg viewBox="0 0 200 220" class="viz tapimg"><g data-z="body"><path d="M60 110V60a40 40 0 0 1 80 0v50z" fill="#FF3B30" opacity=".85"/><rect x="52" y="104" width="96" height="14" rx="3" fill="#E0332A"/></g><g data-z="flat"><rect x="140" y="98" width="20" height="26" fill="transparent"/><path d="M148 104v14" stroke="#fff" stroke-width="3"/></g><g data-z="anode"><rect x="68" y="118" width="26" height="100" fill="transparent"/><path d="M80 118v95" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/></g><g data-z="cathode"><rect x="106" y="118" width="26" height="70" fill="transparent"/><path d="M120 118v62" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/></g>${s}</svg>` },
    ecap: { svg: s => `<svg viewBox="0 0 200 230" class="viz tapimg"><rect x="55" y="20" width="90" height="130" rx="14" fill="#1F4E9C"/><g data-z="stripe"><rect x="115" y="20" width="22" height="130" fill="#D7DEE8"/><text x="126" y="60" text-anchor="middle" font-size="22" fill="#1F4E9C">−</text><text x="126" y="100" text-anchor="middle" font-size="22" fill="#1F4E9C">−</text></g><g data-z="plus"><rect x="68" y="150" width="26" height="80" fill="transparent"/><path d="M80 150v75" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/></g><g data-z="minus"><rect x="108" y="150" width="26" height="60" fill="transparent"/><path d="M120 150v52" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/></g>${s}</svg>` },
    npn: { svg: s => `<svg viewBox="0 0 200 230" class="viz tapimg"><path d="M50 40h100v70h-100z" fill="#1c1c1c"/><path d="M50 40a50 18 0 0 1 100 0" fill="#2a2a2a"/><text x="100" y="80" text-anchor="middle" fill="#ddd" font-size="13">2N3904</text><text x="100" y="98" text-anchor="middle" fill="#999" font-size="10">cara plana</text>${['E', 'B', 'C'].map((p, i) => `<g data-z="${p}"><rect x="${58 + i * 30}" y="110" width="26" height="110" fill="transparent"/><path d="M${71 + i * 30} 110v100" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/></g>`).join('')}${s}</svg>` },
    diode: { svg: s => `<svg viewBox="0 0 300 100" class="viz tapimg"><path d="M10 50h80M210 50h80" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/><g data-z="anode"><rect x="90" y="30" width="80" height="40" rx="6" fill="#1c1c1c"/></g><g data-z="cathode"><rect x="170" y="30" width="40" height="40" rx="6" fill="#1c1c1c"/><rect x="178" y="30" width="12" height="40" fill="#D7DEE8"/></g>${s}</svg>` }
  };
  function tap(ex, el, ctx) {
    let sel = null;
    el.innerHTML = IMG[ex.img].svg('');
    const svg = el.querySelector('svg');
    svg.addEventListener('click', e => { const z = e.target.closest('[data-z]'); if (!z) return; svg.querySelectorAll('[data-z]').forEach(x => x.classList.remove('zsel')); z.classList.add('zsel'); sel = z.dataset.z; ctx.ready(true); });
    return { check: () => ({ ok: sel === ex.a, right: ex.right }) };
  }
  function info(ex, el, ctx) {
    let viz = '';
    if (ex.sch) viz = `<div class="schbox">${Schem.draw(SCH[ex.sch])}</div>`;
    if (ex.symk) viz = Schem.symbol(ex.symk);
    if (ex.img) viz = IMG[ex.img].svg('');
    if (ex.gate) viz = gateSym(ex.gate);
    if (ex.svg) viz = ex.svg;
    el.innerHTML = `<div class="info">${viz}${ex.text.split('\n').map(p => `<p>${p}</p>`).join('')}${ex.code ? `<pre class="code">${esc(ex.code)}</pre>` : ''}</div>`;
    let inner = null;
    if (ex.tune) { const d = document.createElement('div'); el.querySelector('.info').prepend(d); inner = tune({ viz: ex.tune.viz, params: ex.tune.params }, d, { ready() { } }); }
    ctx.ready(true);
    return { check: () => ({ ok: true }), info: true, destroy: () => inner && inner.destroy && inner.destroy() };
  }

  const REG = { mc, num: numw, res: resw, sym: symw, pick, tune, meter, match, order, truth, bits, bbtap, pin, tap, bands: bandsw, info };
  function render(ex, el, ctx) { return REG[ex.t](ex, el, ctx); }
  const KIND = { mc: 'Elige la respuesta', num: 'Calcula', res: 'Lee el código de colores', sym: '¿Qué símbolo es este?', pick: 'Elige el esquema', tune: 'Experimenta', meter: 'Usa el multímetro', match: 'Une las parejas', order: 'Ordena los pasos', truth: 'Completa la tabla de verdad', bits: 'Enciende los bits', bbtap: 'Explora la protoboard', pin: 'Elige el pin', tap: 'Toca la parte correcta', bands: 'Pinta las bandas', info: 'Descubre' };
  // Utilidades de dibujo para que las especialidades añadan sus propias visualizaciones (Object.assign(Widgets.VIZ, …)).
  const H = { esc, num, fR, fI, fV, st, batt, resBody, ledBulb, npnSym, flowPath, stackBar, hbar, heat, BANDHEX };
  return { render, KIND, SCENES, VIZ, IMG, H };
})();
