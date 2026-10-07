/* Voltio · curso base, módulo 2: Ley de Ohm y potencia.
   a4 proporciones y porcentajes · c1 ley de Ohm (intuición) · a3 despejar · c2 calcular con Ohm · a6 estimar ·
   c3 gráficas V–I · c4 potencia · c5 potencia de una resistencia · b8 seguridad · c6 energía y consumo · a8 unidades.
   Aquí aún no hay circuitos en serie ni en paralelo, ni tolerancias, ni condensadores. */
(() => {
  const { num, st, batt, resBody, flowPath, heat, fR } = Widgets.H;
  const { pick, ri, fmt, uniq, MC, N } = Gen.helpers;
  const fI = i => Math.abs(i) >= 1 ? num(i, 2) + ' A' : Math.abs(i) >= 1e-3 ? num(i * 1000, 2) + ' mA' : num(i * 1e6, 0) + ' µA';
  const fP = p => p >= 1 ? num(p, 2) + ' W' : num(p * 1000, 1) + ' mW';
  const RL = [100, 220, 470, 1000, 1500, 2000, 2200, 3300, 4700, 10000];

  /* ===================== VISUALIZACIONES ===================== */
  Object.assign(Widgets.VIZ, {
    // a4: proporcionalidad directa e inversa con ejemplos de cada día
    propBars: {
      calc: p => { const other = p.kind ? 1 / p.f : p.f; return { other }; },
      svg: (p, o) => {
        const A = p.kind ? ['Velocidad', 'km/h', 60] : ['Comensales', 'personas', 4], B = p.kind ? ['Tiempo del viaje', 'h', 4] : ['Pasta', 'g', 400];
        const bar = (y, f, col, lab) => `<rect x="20" y="${y}" width="260" height="22" rx="5" fill="var(--line)"/><rect x="20" y="${y}" width="${Math.min(260, 52 * f)}" height="22" rx="5" fill="${col}"/><text x="24" y="${y - 6}" class="vizsm">${lab}</text>`;
        return `<svg viewBox="0 0 300 175" class="viz"><text x="150" y="20" text-anchor="middle" class="vizlab">${p.kind ? 'Inversa: si una sube, la otra baja' : 'Directa: van juntas'}</text>
          ${bar(48, p.f, 'var(--ice)', `${A[0]}: ${num(A[2] * p.f, 1)} ${A[1]} (× ${p.f})`)}${bar(100, o.other, 'var(--led)', `${B[0]}: ${num(B[2] * o.other, 2)} ${B[1]} (× ${num(o.other, 2)})`)}
          <text x="150" y="150" text-anchor="middle" class="vizsm">${p.kind ? 'Viaje de 240 km: doble de velocidad, mitad de tiempo' : 'Receta: el doble de personas, el doble de pasta'}</text>
          <text x="150" y="168" text-anchor="middle" class="vizsm">la barra de abajo se multiplica por ${p.kind ? '1 / factor' : 'el mismo factor'}</text></svg>`;
      }
    },
    // c1, c2 y a6: pila, resistencia y medidor de corriente
    ohmLab: {
      calc: p => { const I = p.V / p.R; return { I, I6: p.V === 6 ? I : -1 }; },
      svg: (p, o) => {
        const Rr = p.R >= 1000 ? Math.round(p.R / 1000 * 10) / 10 * 1000 : Math.round(p.R / 100) * 100, est = p.est ? `<text x="150" y="162" text-anchor="middle" class="vizsm">Estima: ${num(p.V, 1)} / ${fR(Math.max(100, Rr))} ≈ ${fI(p.V / Math.max(100, Rr))}</text>` : `<text x="150" y="162" text-anchor="middle" class="vizsm">I = V / R = ${num(p.V, 1)} V / ${fR(p.R)}</text>`;
        return `<svg viewBox="0 0 300 170" class="viz">${flowPath('M60 40H240V130H60Z', o.I, 0.02)}${batt(60, 85, p.V)}<g transform="translate(150 40)">${resBody()}</g>
          <g transform="translate(240 85)"><circle r="31" class="meterc"/><text y="2" text-anchor="middle" class="vizbig" style="font-size:11.5px">${fI(o.I)}</text><text y="16" text-anchor="middle" class="vizsm">corriente</text></g>
          <text x="150" y="22" text-anchor="middle" class="vizlab">${fR(p.R)}</text>${est}</svg>`;
      }
    },
    // a3: el triángulo de las fórmulas de tres letras
    triangle: {
      calc: p => ({ t1: p.f === 1 && p.hide === 3 ? 1 : 0, t2: p.f === 2 && p.hide === 3 ? 1 : 0, t3: p.f === 2 && p.hide === 1 ? 1 : 0 }),
      svg: p => {
        const L = p.f === 1 ? ['d', 'v', 't'] : ['V', 'I', 'R'], ex = p.f === 1 ? ['120 km', '60 km/h', '2 h'] : ['9 V', '0,009 A', '1000 Ω'];
        const form = p.hide === 1 ? `${L[0]} = ${L[1]} · ${L[2]}` : p.hide === 2 ? `${L[1]} = ${L[0]} / ${L[2]}` : `${L[2]} = ${L[0]} / ${L[1]}`;
        const num2 = p.hide === 1 ? `${ex[0]} = ${ex[1]} × ${ex[2]}` : p.hide === 2 ? `${ex[1]} = ${ex[0]} / ${ex[2]}` : `${ex[2]} = ${ex[0]} / ${ex[1]}`;
        const pos = [[75, 62], [48, 112], [102, 112]];
        const cover = (i) => `<rect x="${pos[i][0] - 18}" y="${pos[i][1] - 24}" width="36" height="32" rx="8" fill="var(--led)" opacity=".9"/><text x="${pos[i][0]}" y="${pos[i][1] - 2}" text-anchor="middle" font-size="18">✋</text>`;
        return `<svg viewBox="0 0 300 170" class="viz"><path d="M75 18L135 128H15Z" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M36 86H114M75 86V128" stroke="currentColor" stroke-width="2.6"/>
          ${L.map((l, i) => `<text x="${pos[i][0]}" y="${pos[i][1]}" text-anchor="middle" class="vizbig" style="font-size:22px">${l}</text>`).join('')}${cover(p.hide - 1)}
          <text x="150" y="44" class="vizsm">${p.f === 1 ? 'distancia, velocidad, tiempo' : 'ley de Ohm'}</text><text x="150" y="76" class="vizbig" style="font-size:20px">${form}</text>
          <text x="150" y="104" class="vizsm">Ejemplo:</text><text x="150" y="122" class="vizlab">${num2}</text>
          <text x="150" y="158" text-anchor="middle" class="vizsm">lo que queda: arriba entre abajo, o abajo por abajo</text></svg>`;
      }
    },
    // c3: curva tensión–corriente de dos resistencias y un LED rojo
    ivCurve: {
      calc: p => {
        const f = c => (V => c === 1 ? V / 1000 : c === 2 ? V / 2000 : 0.02 * Math.exp((V - 1.95) / 0.05));
        const I = f(p.comp)(p.V), at3 = Math.abs(p.V - 3) < 1e-6;
        return { I, i1k3: p.comp === 1 && at3 ? 1 : 0, i2k3: p.comp === 2 && at3 ? 1 : 0, ledOn: p.comp === 3 && I > 0.001 && I < 0.03 ? 1 : 0 };
      },
      svg: (p, o) => {
        const X = V => 34 + V * 50, Y = I => 140 - I * 1000 * 11;
        const pts = c => { let s = ''; for (let V = 0; V <= 5.001; V += 0.025) { const I = c === 1 ? V / 1000 : c === 2 ? V / 2000 : 0.02 * Math.exp((V - 1.95) / 0.05); if (I > 0.0115) break; s += `${X(V).toFixed(1)},${Y(I).toFixed(1)} `; } return s; };
        const names = { 1: 'Resistencia de 1 kΩ', 2: 'Resistencia de 2 kΩ', 3: 'LED rojo' };
        let g = ''; for (let V = 0; V <= 5; V++) g += `<path d="M${X(V)} 140v4" stroke="currentColor"/><text x="${X(V)}" y="155" text-anchor="middle" class="vizsm">${V}</text>`;
        for (let I = 0; I <= 10; I += 5) g += `<text x="28" y="${Y(I / 1000) + 4}" text-anchor="end" class="vizsm">${I}</text>`;
        const off = o.I > 0.0115, cy = off ? 18 : Y(o.I);
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M34 14V140H290" ${st} stroke-width="1.5"/>${g}<text x="292" y="168" text-anchor="end" class="vizsm">V</text><text x="6" y="12" class="vizsm">mA</text>
          ${[1, 2, 3].map(c => `<polyline points="${pts(c)}" fill="none" stroke="${c === p.comp ? (c === 3 ? '#E5484D' : 'var(--ice)') : 'var(--line)'}" stroke-width="${c === p.comp ? 3 : 2}"/>`).join('')}
          <circle cx="${X(p.V)}" cy="${cy}" r="6" fill="var(--led)"/>
          <text x="${p.V > 3 ? 40 : 160}" y="34" class="vizlab">${names[p.comp]}</text><text x="${p.V > 3 ? 40 : 160}" y="52" class="vizsm" style="fill:${off ? 'var(--err)' : 'currentColor'}">${num(p.V, 2)} V → ${off ? (o.I > 0.2 ? '¡se dispara: se quemaría!' : '¡se dispara! ' + fI(o.I)) : fI(o.I)}</text></svg>`;
      }
    },
    // c4 y c5: la potencia calienta la resistencia; ¿aguanta su potencia nominal?
    pHeat: {
      anim: true,
      calc: p => { const P = p.V * p.V / p.R, ratio = P / p.Pr; return { P, I: p.V / p.R, ratio, margin: p.Pr / P, over: P > 0.25 ? 1 : 0, P6: p.V === 6 ? P : 0, P12k: p.V === 12 && p.R === 1000 ? P : 0, burn: ratio > 1 ? 1 : 0, m220: p.V === 12 && p.R === 220 ? p.Pr / P : 0, q4: p.Pr === 0.25 && p.Pr / P >= 2 ? p.R : 99999 }; },
      svg: (p, o, t) => {
        const sc = { 0.25: 1, 0.5: 1.25, 1: 1.55, 2: 1.9, 5: 2.4 }[p.Pr] || 1, h = Math.min(1, o.ratio), waves = Math.min(4, Math.floor(o.ratio * 4));
        let w = ''; for (let i = 0; i < waves; i++) { const y = 74 - ((t * 22 + i * 12) % 40); w += `<path d="M${140 + i * 14} ${y.toFixed(1)}q-5 -6 0 -12t0 -12" stroke="#FF6A3D" stroke-width="2" fill="none" opacity="${(0.3 + 0.7 * ((y - 34) / 40)).toFixed(2)}"/>`; }
        const word = o.ratio > 1 ? 'se quema: más de lo que aguanta' : o.ratio > 0.5 ? 'muy caliente: sin margen' : o.ratio > 0.2 ? 'templada' : 'fría';
        return `<svg viewBox="0 0 300 175" class="viz">${flowPath("M54 100H260", o.I, 0.03)}${batt(54, 130, p.V)}
          <g transform="translate(160 100) scale(${sc})"><rect x="-17" y="-7" width="34" height="14" rx="7" fill="${heat(h)}" stroke="#7a6a50"/></g>${w}
          ${o.ratio > 1 ? '<text x="160" y="36" text-anchor="middle" font-size="22" class="a-bob">💨</text>' : ''}
          <text x="160" y="130" text-anchor="middle" class="vizsm">${fR(p.R)} · aguanta ${num(p.Pr, 2)} W</text>
          <text x="150" y="152" text-anchor="middle" class="vizbig" style="font-size:15px">P = ${fP(o.P)} · I = ${fI(o.I)}</text>
          <text x="150" y="170" text-anchor="middle" class="vizsm" style="fill:${o.ratio > 1 ? 'var(--err)' : 'currentColor'}">${word} · margen × ${num(o.margin, 1)}</text></svg>`;
      }
    },
    // b8: corriente por el cuerpo según la tensión y el estado de la piel (valores orientativos)
    bodyCurrent: {
      calc: p => { const R = p.skin === 1 ? (p.V > 50 ? 2000 : 100000) : p.skin === 2 ? 1000 : 500, I = p.V / R; return { I, R, z: I < 0.0005 ? 0 : I < 0.01 ? 1 : I < 0.03 ? 2 : 3, dry230: p.skin === 1 && p.V === 230 ? 1 : 0, wet230: p.skin === 2 && p.V === 230 ? 1 : 0, wet24: p.skin === 2 && p.V === 24 ? 1 : 0 }; },
      svg: (p, o) => {
        const Z = [['No se nota', 'var(--ok)'], ['Hormigueo o dolor', '#C9A227'], ['Contracción: no puedes soltar', '#F07D10'], ['Puede parar el corazón', 'var(--err)']][o.z];
        return `<svg viewBox="0 0 300 175" class="viz"><circle cx="70" cy="30" r="13" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M70 43V100M70 100l-18 40M70 100l18 40M28 60H112" stroke="currentColor" stroke-width="2.4" fill="none"/>
          <path d="M28 60H112" stroke="var(--led)" stroke-width="4" class="${o.I > 0.0005 ? 'a-flow' : ''}" opacity="${o.I > 0.0005 ? 1 : 0}"/><circle cx="70" cy="66" r="7" fill="#E5484D" class="${o.z === 3 ? 'a-blink' : ''}"/>
          <text x="130" y="30" class="vizsm">${num(p.V, 1)} V de mano a mano</text><text x="130" y="48" class="vizsm">piel ${['', 'seca', 'mojada', 'con heridas'][p.skin]}: unos ${fR(o.R)}</text>
          <text x="130" y="78" class="vizbig" style="font-size:18px">${fI(o.I)}</text><rect x="130" y="92" width="150" height="26" rx="6" fill="${Z[1]}" opacity=".9"/><text x="205" y="110" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">${Z[0]}</text>
          <text x="10" y="158" class="vizsm">${p.skin === 1 && p.V > 50 ? 'A tensiones altas la piel seca se perfora y deja de proteger.' : 'Valores orientativos: cada contacto es distinto.'}</text><text x="10" y="172" class="vizsm">I = V / R también vale para tu cuerpo.</text></svg>`;
      }
    },
    // c6: cuánto gasta y cuánto cuesta un aparato
    energyCost: {
      calc: p => { const Whd = p.P * p.h, kwhm = Whd * 30 / 1000; return { Whd, kwhm, eur: kwhm * 0.15, t1: p.P === 2000 && p.h === 0.05 ? 1 : 0, t2: p.P === 10 && p.h === 10 ? 1 : 0, t3: p.P === 1000 && p.h === 24 ? 1 : 0 }; },
      svg: (p, o) => {
        const w = Math.min(250, 250 * Math.log10(1 + o.Whd) / Math.log10(48001));
        const ico = { 10: '💡', 60: '💡', 100: '📺', 1000: '🔥', 2000: '💨' }[p.P] || '🔌';
        return `<svg viewBox="0 0 300 170" class="viz"><text x="20" y="40" font-size="28">${ico}</text><text x="62" y="28" class="vizlab">${p.P} W durante ${num(p.h, 2)} h al día</text><text x="62" y="46" class="vizsm">energía = potencia × tiempo</text>
          <rect x="20" y="62" width="250" height="18" rx="5" fill="var(--line)"/><rect x="20" y="62" width="${w}" height="18" rx="5" fill="var(--led)"/>
          <text x="20" y="102" class="vizbig" style="font-size:17px">${o.Whd >= 1000 ? num(o.Whd / 1000, 2) + ' kWh' : num(o.Whd, 1) + ' Wh'} al día</text>
          <text x="20" y="126" class="vizlab">${num(o.kwhm, 2)} kWh al mes → ${num(o.eur, 2)} €</text><text x="20" y="150" class="vizsm">con la luz a 0,15 €/kWh (precio orientativo)</text></svg>`;
      }
    },
    // a8: multiplicar y dividir unidades como si fueran letras
    unitCancel: (() => {
      const U = { 1: ['V', [1, -1, 0], 'J/C'], 2: ['A', [0, 1, -1], 'C/s'], 3: ['Ω', [1, -2, 1], 'V/A'], 4: ['W', [1, 0, -1], 'J/s'], 5: ['J', [1, 0, 0], 'J'], 6: ['C', [0, 1, 0], 'C'], 7: ['s', [0, 0, 1], 's'] };
      const name = d => { const f = Object.values(U).find(u => u[1].every((x, i) => x === d[i])); return f ? f[0] : null; };
      const base = d => { const n = [], m = []; ['J', 'C', 's'].forEach((b, i) => { const e = d[i]; if (e > 0) n.push(b + (e > 1 ? '²' : '')); if (e < 0) m.push(b + (e < -1 ? '²' : '')); }); return (n.join('·') || '1') + (m.length ? ' / ' + m.join('·') : ''); };
      return {
        calc: p => { const d = U[p.x][1].map((v, i) => v + (p.op ? -1 : 1) * U[p.y][1][i]), r = name(d); return { isA: r === 'A' && p.op === 1 ? 1 : 0, isW: r === 'W' && p.op === 0 ? 1 : 0, isJ: r === 'J' ? 1 : 0, d }; },
        svg: (p, o) => {
          const r = name(o.d), sym = p.op ? '÷' : '×';
          return `<svg viewBox="0 0 300 170" class="viz"><text x="150" y="44" text-anchor="middle" class="vizbig" style="font-size:30px">${U[p.x][0]} ${sym} ${U[p.y][0]}</text>
            <text x="150" y="76" text-anchor="middle" class="vizsm">= (${U[p.x][2]}) ${sym} (${U[p.y][2]})</text><text x="150" y="96" text-anchor="middle" class="vizsm">en julios, culombios y segundos: ${base(o.d)}</text>
            <rect x="60" y="110" width="180" height="40" rx="8" fill="${r ? 'var(--ok-soft)' : 'var(--bg)'}" stroke="var(--line)"/><text x="150" y="137" text-anchor="middle" class="vizbig" style="font-size:18px">${r ? '= ' + r : 'sin nombre propio'}</text>
            <text x="150" y="166" text-anchor="middle" class="vizsm">1 V · 2 A · 3 Ω · 4 W · 5 J · 6 C · 7 s</text></svg>`;
        }
      };
    })()
  });

  /* ===================== SVG DE LAS TARJETAS ===================== */
  const S = {
    direct: `<svg viewBox="0 0 300 140" class="viz">${[1, 2, 3].map(k => `<text x="20" y="${18 + k * 30}" font-size="16">${'🧑'.repeat(k * 2)}</text><rect x="150" y="${4 + k * 30}" width="${k * 34}" height="18" rx="4" fill="var(--led)"/><text x="${156 + k * 34}" y="${18 + k * 30}" class="vizsm">${k * 200} g</text>`).join('')}<text x="20" y="134" class="vizsm">El doble de personas, el doble de pasta: directa.</text></svg>`,
    inverse: `<svg viewBox="0 0 300 140" class="viz">${[[60, 4], [120, 2], [240, 1]].map(([v, h], k) => `<text x="20" y="${38 + k * 30}" class="vizlab">${v} km/h</text><rect x="110" y="${24 + k * 30}" width="${h * 40}" height="18" rx="4" fill="var(--ice)"/><text x="${116 + h * 40}" y="${38 + k * 30}" class="vizsm">${h} h</text>`).join('')}<text x="20" y="134" class="vizsm">240 km: doble de velocidad, mitad de tiempo: inversa.</text></svg>`,
    grid: `<svg viewBox="0 0 300 140" class="viz">${Array.from({ length: 100 }, (_, i) => `<rect x="${20 + (i % 20) * 9}" y="${20 + Math.floor(i / 20) * 9}" width="7" height="7" rx="1" fill="${i < 20 ? 'var(--led)' : 'var(--line)'}"/>`).join('')}
      <text x="210" y="40" class="vizlab">20 %</text><text x="210" y="58" class="vizsm">20 de cada 100</text><text x="20" y="92" class="vizsm">× 20 / 100 · atajos: 10 % = ÷ 10 · 50 % = la mitad</text><text x="20" y="112" class="vizsm">±5 %: puede estar un 5 % por encima o por debajo</text></svg>`,
    ohmRule: `<svg viewBox="0 0 300 150" class="viz"><text x="150" y="40" text-anchor="middle" class="vizbig" style="font-size:30px">I = V / R</text>
      <text x="80" y="80" text-anchor="middle" class="vizlab" style="fill:var(--ok)">V ↑ → I ↑</text><text x="80" y="98" text-anchor="middle" class="vizsm">más empuje, más corriente</text>
      <text x="220" y="80" text-anchor="middle" class="vizlab" style="fill:var(--err)">R ↑ → I ↓</text><text x="220" y="98" text-anchor="middle" class="vizsm">más freno, menos corriente</text>
      <text x="150" y="134" text-anchor="middle" class="vizsm">en voltios, ohmios y amperios</text></svg>`,
    balance: `<svg viewBox="0 0 300 150" class="viz"><path d="M150 30V120M100 130H200" stroke="currentColor" stroke-width="3"/><g class="a-bob"><path d="M60 50H240" stroke="currentColor" stroke-width="3"/>
      <rect x="40" y="56" width="80" height="30" rx="6" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="80" y="76" text-anchor="middle" class="vizlab">V</text><rect x="180" y="56" width="80" height="30" rx="6" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="220" y="76" text-anchor="middle" class="vizlab">I · R</text></g>
      <text x="150" y="146" text-anchor="middle" class="vizsm">÷ R a los dos lados → V / R = I · R / R = I</text></svg>`,
    check: `<svg viewBox="0 0 300 130" class="viz"><text x="20" y="30" class="vizlab">V = I × R con I = 2 y R = 3 → V = 6</text><text x="20" y="62" class="vizlab" style="fill:var(--ok)">¿R = V / I? 6 / 2 = 3 ✓</text><text x="20" y="92" class="vizlab" style="fill:var(--err)">¿R = I / V? 2 / 6 = 0,33 ✗</text><text x="20" y="118" class="vizsm">El despeje bueno devuelve el número de partida.</text></svg>`,
    recipe: `<svg viewBox="0 0 300 150" class="viz">${[['1', 'Todo a V, A y Ω', '4,7 kΩ → 4700 Ω'], ['2', 'Aplica la fórmula', 'I = 9 / 4700'], ['3', 'Vuelve a un prefijo cómodo', '0,0019 A → 1,9 mA']].map(([n, a, b], i) => `<circle cx="28" cy="${30 + i * 44}" r="14" fill="var(--led)"/><text x="28" y="${35 + i * 44}" text-anchor="middle" font-weight="800" fill="#14213D">${n}</text><text x="52" y="${28 + i * 44}" class="vizlab">${a}</text><text x="52" y="${45 + i * 44}" class="vizsm">${b}</text>`).join('')}</svg>`,
    estimate: `<svg viewBox="0 0 300 140" class="viz"><text x="20" y="36" class="vizbig" style="font-size:20px">9 V / 470 Ω</text><text x="160" y="36" class="vizsm">difícil de cabeza</text>
      <text x="20" y="70" class="vizbig" style="font-size:20px">≈ 10 / 500</text><text x="160" y="70" class="vizsm">redondea</text><text x="20" y="104" class="vizbig" style="font-size:20px;fill:var(--ok)">= 0,02 A = 20 mA</text>
      <text x="20" y="130" class="vizsm">Real: 19,1 mA. El orden de magnitud acierta.</text></svg>`,
    vk: `<svg viewBox="0 0 300 140" class="viz"><text x="150" y="34" text-anchor="middle" class="vizbig" style="font-size:22px">V / kΩ = mA</text>${[['5 V / 1 kΩ', '5 mA'], ['12 V / 2,2 kΩ', '≈ 5 mA'], ['9 V / 10 kΩ', '0,9 mA']].map(([a, b], i) => `<text x="40" y="${66 + i * 22}" class="vizlab">${a}</text><text x="200" y="${66 + i * 22}" class="vizlab">→ ${b}</text>`).join('')}<text x="150" y="134" text-anchor="middle" class="vizsm">k (× 1000) abajo y m (÷ 1000) arriba se compensan</text></svg>`,
    absurd: `<svg viewBox="0 0 300 130" class="viz"><rect x="20" y="16" width="160" height="48" rx="8" fill="var(--board)"/><text x="170" y="50" text-anchor="end" font-size="24" font-family="monospace" fill="#FF8A8A">9 A</text>
      <text x="200" y="48" font-size="30" fill="var(--err)">✗</text><text x="20" y="92" class="vizsm">9 V entre 1 kΩ no puede dar amperios:</text><text x="20" y="110" class="vizsm">alguien usó 1 en vez de 1000 Ω. Son 9 mA.</text></svg>`,
    ivLines: '<svg viewBox="0 0 260 170" class="viz"><path d="M30 150H250M30 150V15" stroke="currentColor" stroke-width="2"/><path d="M30 150L230 40" stroke="#3E8FCB" stroke-width="3"/><path d="M30 150L230 100" stroke="#F2A900" stroke-width="3"/><text x="198" y="34" font-size="11" fill="currentColor">R baja</text><text x="198" y="94" font-size="11" fill="currentColor">R alta</text><text x="238" y="164" font-size="11" fill="currentColor">V</text><text x="12" y="20" font-size="11" fill="currentColor">I</text></svg>',
    ledKnee: '<svg viewBox="0 0 260 170" class="viz"><path d="M30 150H250M30 150V15" stroke="currentColor" stroke-width="2"/><rect x="170" y="15" width="80" height="135" fill="var(--err-soft)"/><path d="M30 150C120 149 150 146 168 128S186 40 194 15" stroke="#E5484D" stroke-width="3" fill="none"/><text x="120" y="40" font-size="11" fill="currentColor">codo ≈ 1,8–2 V</text><text x="176" y="140" font-size="10" fill="var(--err)">peligro</text><text x="238" y="164" font-size="11" fill="currentColor">V</text><text x="12" y="20" font-size="11" fill="currentColor">I</text></svg>',
    jps: `<svg viewBox="0 0 300 150" class="viz"><text x="20" y="26" class="vizlab">6 W</text><rect x="70" y="14" width="40" height="16" rx="3" fill="var(--led)"/><text x="120" y="26" class="vizsm">6 J cada segundo</text>
      <text x="20" y="62" class="vizlab">60 W</text><rect x="70" y="50" width="200" height="16" rx="3" fill="var(--led)" class="a-pulse"/><text x="20" y="84" class="vizsm">60 J cada segundo: diez veces más rápido</text>
      <text x="150" y="124" text-anchor="middle" class="vizbig" style="font-size:20px">1 W = 1 J / s</text><text x="150" y="144" text-anchor="middle" class="vizsm">potencia = energía por segundo</text></svg>`,
    pvi: `<svg viewBox="0 0 300 150" class="viz"><text x="150" y="40" text-anchor="middle" class="vizbig" style="font-size:30px">P = V · I</text><text x="20" y="76" class="vizsm">cada segundo pasan I culombios…</text><text x="20" y="96" class="vizsm">…y cada uno suelta V julios:</text><text x="20" y="120" class="vizlab">V × I julios cada segundo = vatios</text><text x="20" y="142" class="vizsm">9 V y 0,1 A → 0,9 J cada segundo = 0,9 W</text></svg>`,
    three: `<svg viewBox="0 0 300 150" class="viz"><text x="150" y="30" text-anchor="middle" class="vizbig" style="font-size:20px">P = V · I</text>
      <path d="M150 38L80 70M150 38L220 70" stroke="var(--muted)" stroke-width="2"/><text x="80" y="88" text-anchor="middle" class="vizsm">V = I · R</text><text x="220" y="88" text-anchor="middle" class="vizsm">I = V / R</text>
      <text x="80" y="116" text-anchor="middle" class="vizbig" style="font-size:18px">P = I² · R</text><text x="220" y="116" text-anchor="middle" class="vizbig" style="font-size:18px">P = V² / R</text>
      <text x="150" y="142" text-anchor="middle" class="vizsm">elige la que use los datos que tienes</text></svg>`,
    ratings: `<svg viewBox="0 0 300 140" class="viz">${[[0.25, '¼ W', 1], [0.5, '½ W', 1.25], [1, '1 W', 1.6], [2, '2 W', 2], [5, '5 W', 2.6]].map(([, l, s], i) => `<g transform="translate(${34 + i * 58} 60) scale(${s})"><rect x="-12" y="-5" width="24" height="10" rx="5" fill="${i === 4 ? '#E9E4D8' : '#E7D3A8'}" stroke="#C9B183"/></g><text x="${34 + i * 58}" y="110" text-anchor="middle" class="vizlab">${l}</text>`).join('')}<text x="20" y="134" class="vizsm">Más tamaño, más superficie para soltar calor.</text></svg>`,
    margin: `<svg viewBox="0 0 300 130" class="viz"><rect x="20" y="40" width="260" height="22" rx="5" fill="var(--line)"/><rect x="20" y="40" width="65" height="22" rx="5" fill="var(--led)"/><path d="M150 32V70" stroke="var(--ok)" stroke-width="3"/>
      <text x="20" y="32" class="vizsm">calculado: 0,12 W</text><text x="154" y="30" class="vizsm" style="fill:var(--ok)">× 2 = 0,24 W</text><text x="20" y="92" class="vizlab">Regla: elige una que aguante al menos el doble.</text><text x="20" y="112" class="vizsm">Aquí, ¼ W (0,25 W) vale justo.</text></svg>`,
    airflow: `<svg viewBox="0 0 300 145" class="viz"><path d="M20 100H280" stroke="#2E7D4F" stroke-width="8"/><path d="M110 100V70M190 100V70" stroke="#9AA3B2" stroke-width="3"/><rect x="110" y="56" width="80" height="20" rx="10" fill="#F2A07B"/>
      ${[0, 1, 2].map(i => `<path d="M${130 + i * 20} 50q-6 -8 0 -16t0 -16" stroke="#FF6A3D" stroke-width="2" fill="none" class="a-bob a-d${i + 1}"/>`).join('')}<text x="20" y="122" class="vizsm">Sepárala de la placa y no la tapes:</text><text x="20" y="136" class="vizsm" dy="-2">el calor tiene que salir.</text></svg>`,
    body: `<svg viewBox="0 0 300 160" class="viz"><circle cx="150" cy="26" r="14" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M150 40V100M150 100l-20 46M150 100l20 46M90 64H210" stroke="currentColor" stroke-width="2.4" fill="none"/>
      <path d="M90 64H210" stroke="var(--led)" stroke-width="4" class="a-flow"/><circle cx="150" cy="68" r="7" fill="#E5484D" class="a-pulse"/><text x="214" y="60" class="vizsm">mano a mano:</text><text x="214" y="76" class="vizsm">cruza el pecho</text>
      <text x="10" y="154" class="vizsm">Daña la corriente que pasa por ti, y por dónde pasa.</text></svg>`,
    skin: `<svg viewBox="0 0 300 140" class="viz">${[['Piel seca', 'decenas o cientos de kΩ', 'var(--ok)'], ['Piel mojada', 'alrededor de 1 kΩ', '#F07D10'], ['Heridas o alta tensión', 'cientos de ohmios a 2 kΩ', 'var(--err)']].map(([a, b, c], i) => `<rect x="20" y="${14 + i * 38}" width="10" height="26" rx="3" fill="${c}"/><text x="40" y="${26 + i * 38}" class="vizlab">${a}</text><text x="40" y="${42 + i * 38}" class="vizsm">${b}</text>`).join('')}<text x="20" y="134" class="vizsm">Menos resistencia: más corriente.</text></svg>`,
    rcd: `<svg viewBox="0 0 300 150" class="viz"><rect x="20" y="30" width="70" height="90" rx="8" fill="var(--ice-soft)" stroke="currentColor" stroke-width="2"/><text x="55" y="80" text-anchor="middle" class="vizlab">ID</text><text x="55" y="140" text-anchor="middle" class="vizsm">diferencial</text>
      <path d="M90 50H260V110H90" stroke="currentColor" stroke-width="2.4" fill="none"/><path d="M90 50H260" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/><text x="170" y="42" text-anchor="middle" class="vizsm">va: 1,000 A</text><text x="170" y="128" text-anchor="middle" class="vizsm">vuelve: 0,97 A → falta algo</text>
      <path d="M200 110V140" stroke="var(--err)" stroke-width="2.5" stroke-dasharray="4 3"/><text x="208" y="146" class="vizsm" style="fill:var(--err)">fuga (¿por ti?)</text></svg>`,
    ring: `<svg viewBox="0 0 300 140" class="viz"><rect x="30" y="40" width="110" height="60" rx="6" fill="#2F3B52"/><circle cx="60" cy="40" r="7" fill="#E5484D"/><circle cx="110" cy="40" r="7" fill="#9AA3B2"/>
      <ellipse cx="85" cy="34" rx="34" ry="12" fill="none" stroke="#FF5A1F" stroke-width="5" class="a-pulse"/><text x="160" y="56" class="vizlab">Un anillo puentea</text><text x="160" y="74" class="vizlab">los dos polos:</text><text x="160" y="96" class="vizsm">cientos de amperios,</text><text x="160" y="112" class="vizsm">se pone al rojo</text></svg>`,
    eArea: `<svg viewBox="0 0 300 150" class="viz"><path d="M40 120H270M40 120V20" stroke="currentColor" stroke-width="2"/><rect x="40" y="40" width="40" height="80" fill="var(--led)" opacity=".8"/><rect x="120" y="110" width="140" height="10" fill="var(--ice)" opacity=".9"/>
      <text x="44" y="34" class="vizsm">2000 W · 0,05 h</text><text x="150" y="104" class="vizsm">10 W · 10 h</text><text x="150" y="140" text-anchor="middle" class="vizsm">área = potencia × tiempo: las dos son 100 Wh</text><text x="20" y="18" class="vizsm">W</text><text x="272" y="124" class="vizsm">h</text></svg>`,
    units: `<svg viewBox="0 0 300 150" class="viz">${[['V', 'J / C', 'energía por carga'], ['A', 'C / s', 'carga por segundo'], ['Ω', 'V / A', 'tensión por amperio'], ['W', 'J / s = V · A', 'energía por segundo']].map(([a, b, c], i) => `<text x="24" y="${30 + i * 32}" class="vizbig" style="font-size:18px">${a}</text><text x="60" y="${30 + i * 32}" class="vizlab">= ${b}</text><text x="180" y="${30 + i * 32}" class="vizsm">${c}</text>`).join('')}</svg>`,
    cancel: `<svg viewBox="0 0 300 120" class="viz"><text x="20" y="40" class="vizbig" style="font-size:20px">V / Ω = V / (V/A)</text><text x="20" y="76" class="vizbig" style="font-size:20px">= <tspan text-decoration="line-through">V</tspan> · A / <tspan text-decoration="line-through">V</tspan> = A</text>
      <text x="20" y="108" class="vizsm">Las unidades se tachan como letras: sale amperios.</text></svg>`,
    kmA: `<svg viewBox="0 0 300 120" class="viz"><text x="20" y="40" class="vizbig" style="font-size:20px">kΩ × mA = V</text><text x="20" y="70" class="vizsm">(1000 Ω) × (0,001 A) = 1 V</text><text x="20" y="96" class="vizlab">4,7 kΩ × 2 mA = 9,4 V</text><text x="20" y="114" class="vizsm">sin pasar a unidades base</text></svg>`
  };

  /* ===================== CONCEPTOS ===================== */
  const C = CONCEPTS;
  C.ba_prop = { name: 'Proporciones directas e inversas', alts: [
    { title: 'Directa: van juntas', text: 'Dos magnitudes son <b>directamente</b> proporcionales si al multiplicar una por un número la otra se multiplica por el mismo: el triple de personas, el triple de pasta. Calcula el factor (12 / 4 = 3) y aplícalo (200 g × 3 = 600 g).', svg: S.direct, q: mcq('4 pilas iguales en serie dan 6 V. ¿Cuánto dan 12?', ['18 V', '2 V', '24 V', '72 V'], 'Factor 3: 6 × 3.') },
    { title: 'Inversa: al revés', text: 'Son <b>inversamente</b> proporcionales si cuando una se multiplica la otra se divide por el mismo número: el doble de velocidad, la mitad de tiempo; el doble de grifos, la mitad de espera. Antes de calcular, pregúntate: si una sube, ¿la otra sube o baja?', svg: S.inverse, q: mcq('Tres pintores tardan 6 días en pintar una casa. ¿Cuánto tardarían 6 pintores?', ['3 días', '12 días', '6 días', '2 días'], 'El doble de pintores, la mitad de tiempo.') },
    { title: 'Muévelo', text: 'Elige directa o inversa y multiplica una magnitud. Mira qué le pasa a la otra.', tune: { viz: 'propBars', params: { kind: { label: 'Tipo (0 directa · 1 inversa)', val: 1, list: [0, 1], dec: 0 }, f: { label: 'Factor', val: 2, min: 1, max: 5, step: 1, dec: 0 } } }, q: mcq('En una proporción inversa, una magnitud se multiplica por 4. La otra…', ['Se divide entre 4', 'Se multiplica por 4', 'No cambia', 'Se divide entre 2'], 'Inversa: al revés, en la misma proporción.') }
  ] };
  C.ba_percent.alts.push({ title: 'Cien cuadraditos', text: 'Un porcentaje dice cuántos de cada 100. El 20 % de algo es colorear 20 de cada 100 cuadraditos: multiplica por 20 y divide entre 100.', svg: S.grid, q: mcq('¿Cuánto es el 50 % de 9 V?', ['4,5 V', '0,45 V', '18 V', '45 V'], 'La mitad.') });
  C.ba_ohmprop.alts.push({ title: 'Con agua', text: 'Sube la altura del depósito (el empuje, la tensión) o estrecha el tubo (el freno, la resistencia) y mira el caudal (la corriente). Doble de altura, doble de caudal; doble de estrechez, mitad.', tune: { viz: 'water', params: { h: { label: 'Altura (tensión)', val: 4, min: 1, max: 10, step: 1, dec: 0 }, w: { label: 'Estrechez (resistencia)', val: 4, min: 1, max: 10, step: 1, dec: 0 } } }, q: mcq('Misma pila y el triple de resistencia. ¿Corriente?', ['Un tercio', 'El triple', 'La misma', 'Nueve veces menos'], 'Inversamente proporcional.') });
  C.ba_solve.alts[1] = { title: 'Prueba con números', text: 'Si dudas entre dos despejes, prueba con números fáciles. Con V = I × R, I = 2 y R = 3 dan V = 6. ¿R = V / I? 6 / 2 = 3 ✓. ¿R = I / V? 2 / 6 ✗. El que devuelve el número de partida es el bueno.', svg: S.check, q: mcq('d = v × t. ¿Cuánto vale v?', ['v = d / t', 'v = t / d', 'v = d × t', 'v = d − t'], 'Con t = 2 y v = 5, d = 10, y 10 / 2 = 5 ✓.') };
  C.ba_solve.alts[2] = { title: 'Tapa la que buscas', text: 'En una fórmula de tres letras con una multiplicación (arriba = abajo × abajo), tapa la que buscas: si es la de arriba, multiplica las otras dos; si es una de abajo, divide la de arriba entre la otra.', tune: { viz: 'triangle', params: { f: { label: 'Fórmula (1 distancia · 2 Ohm)', val: 2, list: [1, 2], dec: 0 }, hide: { label: 'Tapar (1 arriba · 2 abajo izq. · 3 abajo der.)', val: 2, list: [1, 2, 3], dec: 0 } } }, q: mcq('Precio total = kilos × precio por kilo. ¿Cómo calculas el precio por kilo?', ['Total / kilos', 'Total × kilos', 'Kilos / total', 'Total − kilos'], 'Se tapa uno de abajo: el de arriba entre el otro.') };
  C.ba_solve.alts[0].svg = S.balance;
  C.ba_ohm.alts.push({ title: 'Calcula y compruébalo', text: 'Elige una pila y una resistencia, calcula la corriente con I = V / R (en voltios y ohmios) y compárala con lo que marca el medidor.', tune: { viz: 'ohmLab', params: { V: pV(5), R: { label: 'Resistencia', val: 2200, list: RL, fmt: 'R' } } }, q: mcq('5 V entre 2,2 kΩ. ¿Corriente?', ['2,27 mA', '2,27 A', '0,44 mA', '11 mA'], '5 / 2200 = 0,00227 A.') });
  C.ba_estimate.alts[2] = { title: 'Sospecha de lo raro', text: 'Antes de fiarte de un resultado, pregúntate si tiene sentido. Una pila y una resistencia normales dan miliamperios, no amperios. Si el resultado se sale por un factor de 1000, casi seguro has usado 1 en vez de 1000 (kΩ como Ω) o al revés.', svg: S.absurd, q: mcq('Calculas que 5 V entre 10 kΩ dan 500 mA. ¿Qué es lo más probable?', ['Un error de prefijo: son 0,5 mA', 'Que es correcto', 'Que la pila es enorme', 'Que la resistencia está rota'], '5 / 10 000 = 0,0005 A.') };
  C.ba_estimate.alts.push({ title: 'Estima y mira', text: 'Elige una resistencia, haz tu estimación de cabeza redondeando y compárala con el valor real.', tune: { viz: 'ohmLab', params: { V: { ...pV(12), fixed: true }, R: { label: 'Resistencia', val: 2200, list: RL, fmt: 'R' }, est: { val: 1, fixed: true } } }, q: mcq('Sin calculadora: 9 V entre 4,7 kΩ…', ['Unos 2 mA', 'Unos 2 A', 'Unos 20 mA', 'Unos 0,2 mA'], '9 / 5000 ≈ 0,002 A.') });
  C.ba_ivgraph.alts.push({ title: 'Recorre la curva', text: 'Sube la tensión y mira el punto sobre cada curva. En las resistencias avanza en línea recta; en el LED no pasa casi nada hasta el codo y luego se dispara.', tune: { viz: 'ivCurve', params: { comp: { label: 'Pieza (1 · 1 kΩ, 2 · 2 kΩ, 3 · LED)', val: 3, list: [1, 2, 3], dec: 0 }, V: { label: 'Tensión', val: 1.5, min: 0, max: 5, step: 0.05, unit: 'V', dec: 2 } } }, q: mcq('En la gráfica, ¿qué recta tiene menos resistencia?', ['La más inclinada', 'La más plana', 'Las dos igual', 'La curva'], 'Con poca tensión ya pasa mucha corriente.') });
  C.ba_prating.alts.push({ title: 'Caliéntala', text: 'Elige la resistencia y su potencia nominal. Si la potencia que disipa supera lo que aguanta, se quema; con margen ×2 se queda templada.', tune: { viz: 'pHeat', params: { V: { ...pV(12), fixed: true }, R: pR('Resistencia', 470, 10, 10000), Pr: { label: 'Aguanta', val: 0.25, list: [0.25, 0.5, 1, 2, 5], unit: 'W', dec: 2 } } }, q: mcq('Una resistencia disipará 0,3 W. ¿Cuál eliges?', ['1 W', '¼ W', '½ W justa', '1/8 W'], 'El doble de 0,3 es 0,6 W: la siguiente estándar que lo supera es 1 W.') });
  C.ba_prating.alts[0] = { title: 'Calcula y deja margen', text: 'Calcula lo que disipa (P = V² / R o P = I² · R) y elige una resistencia que aguante <b>al menos el doble</b>. Las normales son de ¼ W (250 mW). 9 V sobre 330 Ω: 81 / 330 ≈ 0,25 W: justo en el límite, mejor una de ½ W.', svg: S.margin, q: mcq('12 V directamente sobre 2,2 kΩ. ¿Vale una de ¼ W?', ['Sí: disipa unos 65 mW', 'No: disipa 5,5 W', 'No: disipa 0,65 W', 'Sí: disipa 5 mW'], '144 / 2200 ≈ 0,065 W.') };
  C.ba_shockpath.alts.push({ title: 'Lo que va y lo que vuelve', text: 'El diferencial compara la corriente que va por un cable con la que vuelve por el otro. Si falta una parte, se está escapando por otro camino (quizá por una persona) y corta en milisegundos.', svg: S.rcd, q: mcq('Van 2,000 A y vuelven 1,970 A. ¿Qué hace el diferencial de 30 mA?', ['Corta: faltan 30 mA que se escapan', 'Nada: es poca diferencia', 'Sube la tensión', 'Avisa con un pitido'], 'Esos 30 mA se escapan por otro camino.') });
  C.ba_kwh.alts.push({ title: 'Calcula tu factura', text: 'Elige un aparato y cuántas horas al día lo usas. La energía es potencia por tiempo, y la factura se paga por kWh.', tune: { viz: 'energyCost', params: { P: { label: 'Potencia', val: 2000, list: [10, 60, 100, 1000, 2000], unit: 'W', dec: 0 }, h: { label: 'Horas al día', val: 1, list: [0.05, 0.5, 1, 2, 5, 8, 10, 24], unit: 'h', dec: 2 } } }, q: mcq('¿Qué gasta más: 1000 W durante 6 minutos o 25 W durante 4 horas?', ['Lo mismo: 100 Wh cada uno', 'El de 1000 W', 'El de 25 W', 'No se puede saber'], '1000 × 0,1 = 100 Wh; 25 × 4 = 100 Wh.') });
  C.ba_units.alts[0] = { title: 'Unidades que se simplifican', text: 'Trata las unidades como letras que se multiplican y se dividen. Ω = V / A, así que V / Ω = V / (V / A) = <b>A</b>. Y W = V · A. Con unas pocas equivalencias (V = J/C, A = C/s, Ω = V/A, W = J/s) sabes qué sale de cualquier fórmula sin poner números.', svg: S.cancel, q: mcq('¿Qué da A × Ω?', ['Voltios', 'Vatios', 'Amperios', 'Segundos'], 'A × (V / A) = V: es la ley de Ohm.') };
  C.ba_units.alts[2] = { title: 'Juega con las unidades', text: 'Elige dos unidades y si las multiplicas o divides. Abajo ves el resultado en julios, culombios y segundos, y si tiene nombre propio.', tune: { viz: 'unitCancel', params: { x: { label: 'Primera unidad', val: 1, list: [1, 2, 3, 4, 5, 6, 7], dec: 0 }, op: { label: 'Operación (0 × · 1 ÷)', val: 1, list: [0, 1], dec: 0 }, y: { label: 'Segunda unidad', val: 3, list: [1, 2, 3, 4, 5, 6, 7], dec: 0 } } }, q: mcq('¿Qué unidad da kΩ × mA?', ['Voltios', 'Kilovoltios', 'Milivoltios', 'Vatios'], '1000 × 0,001 = 1: los prefijos se compensan.') };
  Object.assign(C, {
    ba_elecpref: { name: 'Prefijos en ohmios y amperios', alts: [
      { title: 'Antes de calcular, a la unidad', text: 'Para usar la ley de Ohm, pasa todo a V, A y Ω: 4,7 kΩ = 4700 Ω; 20 mA = 0,02 A. Al final, vuelve a un prefijo cómodo: 0,0019 A = 1,9 mA.', svg: S.recipe, q: mcq('2,2 kΩ son…', ['2200 Ω', '0,0022 Ω', '22 Ω', '220 Ω'], 'k = × 1000.') },
      { title: 'La coma salta tres', text: 'Entre Ω y kΩ, y entre A y mA, hay un salto de 1000: la coma se mueve tres sitios. Prefijo más grande, número más pequeño. 350 mA = 0,35 A; 0,47 kΩ = 470 Ω.', q: mcq('0,015 A son…', ['15 mA', '1,5 mA', '150 mA', '0,015 mA'], '× 1000.') }
    ] },
    ba_pvi: { name: 'Potencia: P = V · I', alts: [
      { title: 'Julios cada segundo', text: 'La potencia es la energía por segundo, en vatios: 1 W = 1 J/s. Cada segundo pasan I culombios y cada uno suelta V julios: <b>P = V · I</b>. 5 V y 0,2 A → 1 W.', svg: S.pvi, q: mcq('5 V y 200 mA. ¿Potencia?', ['1 W', '1000 W', '25 W', '0,04 W'], '5 × 0,2 = 1 W.') },
      { title: 'Rapidez, no cantidad', text: 'Potencia no es energía: es lo rápido que se gasta. Una bombilla de 60 W gasta diez veces más rápido que una de 6 W; en una hora, diez veces más energía.', svg: S.jps, q: mcq('Una bombilla de 60 W y otra de 6 W, una hora cada una. ¿Cuál gasta más energía?', ['La de 60 W: diez veces más', 'Igual', 'La de 6 W', 'Depende del color'], 'Diez veces más julios cada segundo.') }
    ] },
    ba_psq: { name: 'Potencia con la resistencia: I² · R y V² / R', alts: [
      { title: 'Tres fórmulas, elige por los datos', text: 'P = V · I es la base. Con Ohm salen otras dos: si tienes I y R, <b>P = I² · R</b>; si tienes V y R, <b>P = V² / R</b>. Pasa antes todo a A, V y Ω.', svg: S.three, q: mcq('9 V sobre 1 kΩ. ¿Potencia?', ['81 mW', '9 mW', '9 W', '0,81 W'], '81 / 1000 = 0,081 W.') },
      { title: 'El cuadrado manda', text: 'En I² · R y V² / R, la corriente o la tensión van al cuadrado: el doble de tensión sobre la misma resistencia da el doble de corriente y cuatro veces más potencia. Compruébalo moviendo la pila.', tune: { viz: 'pHeat', params: { V: pV(6), R: pR('Resistencia', 1000, 10, 10000), Pr: { val: 0.25, list: [0.25], fixed: true } } }, q: mcq('Por una resistencia pasa el triple de corriente. Su potencia…', ['Se multiplica por 9', 'Se triplica', 'No cambia', 'Se divide entre 3'], '3² = 9.') }
    ] },
    ba_bodycur: { name: 'Corriente por el cuerpo', alts: [
      { title: 'Ohm también vale para ti', text: 'Tu cuerpo es una resistencia: con la piel seca, de mano a mano, decenas o cientos de kΩ; mojada o con heridas, mucho menos. Y a tensiones altas la piel se perfora y apenas protege. <b>I = V / R</b>: menos resistencia, más corriente.', svg: S.skin, q: mcq('Con la piel seca hay unos 50 kΩ. ¿Qué corriente pasaría con 12 V?', ['0,24 mA', '240 mA', '4 mA', '24 mA'], '12 / 50 000 = 0,00024 A.') },
      { title: 'Qué corriente es peligrosa', text: 'Orientativamente: menos de 0,5 mA no se nota; unos pocos mA, hormigueo o dolor; hacia 10 mA los músculos se contraen y puede que no puedas soltar; unas decenas de mA cruzando el pecho pueden desordenar el corazón. Pruébalo aquí.', tune: { viz: 'bodyCurrent', params: { V: { label: 'Tensión', val: 24, list: [1.5, 9, 24, 50, 230], unit: 'V', dec: 1 }, skin: { label: 'Piel (1 seca · 2 mojada · 3 heridas)', val: 2, list: [1, 2, 3], dec: 0 } } }, q: mcq('¿Por qué es mortal la red de 230 V y no una pila de 9 V?', ['Con 230 V tu resistencia deja pasar decenas o cientos de mA; con 9 V, muy poco', 'Porque la pila es continua', 'Porque la pila es pequeña', 'La pila también es mortal'], 'Lo que cuenta es la corriente que te atraviesa.') }
    ] },
    ba_lowvrisk: { name: 'Baterías en corto y energía guardada', alts: [
      { title: 'Pocos voltios, muchos amperios', text: 'Una batería de coche o de litio no te electrocuta con la piel seca, pero si algo metálico une sus polos (un anillo, unas llaves) pasan cientos de amperios: el metal se pone al rojo y puede haber fuego. Quítate anillos y pulseras para trabajar con baterías y guarda las celdas con los polos tapados.', svg: S.ring, q: mcq('Llevas una celda 18650 suelta en el bolsillo con monedas. ¿Riesgo?', ['Un cortocircuito: calor e incluso fuego', 'Ninguno: solo son 3,7 V', 'Se descarga un poco', 'Solo si está vacía'], 'Las monedas pueden unir los polos.') },
      { title: 'Desenchufado no es seguro', text: 'Los aparatos que van a la red (fuentes, cargadores, microondas) pueden guardar energía dentro mucho después de desenchufarlos, y tienen tensiones peligrosas. En este curso todo es de baja tensión: no abras aparatos de 230 V.', svg: S.body, q: mcq('Un cargador de 230 V se ha estropeado y está desenchufado. ¿Lo abres para curiosear?', ['No: dentro puede quedar energía guardada y hay tensiones peligrosas', 'Sí: desenchufado no hay riesgo', 'Sí, con guantes de lana', 'Sí, si es pequeño'], 'Desenchufado no significa descargado.') }
    ] },
    ba_autonomy: { name: 'Autonomía de una batería', alts: [
      { title: 'Un depósito que se vacía', text: 'Los mAh dicen cuántos miliamperios puede dar la batería durante una hora. Para saber cuánto dura: <b>horas ≈ mAh / mA</b>. 2000 mAh con 50 mA → unas 40 h. En la práctica, algo menos.', tune: { viz: 'battery', params: { mAh: { label: 'Capacidad', val: 2000, min: 200, max: 3000, step: 100, unit: 'mAh', dec: 0 }, mA: { label: 'Consumo', val: 50, min: 10, max: 500, step: 10, unit: 'mA', dec: 0 } } }, q: mcq('Batería de 1000 mAh y consumo de 50 mA. ¿Horas aproximadas?', ['20 h', '50 h', '0,05 h', '1000 h'], '1000 / 50 = 20 h.') },
      { title: 'Mismas unidades', text: 'Divide miliamperios-hora entre miliamperios y te quedan horas. Si el consumo te lo dan en amperios, pásalo antes a mA: 0,5 A = 500 mA.', q: mcq('Batería de 2500 mAh y consumo de 0,5 A. ¿Horas aproximadas?', ['5 h', '5000 h', '0,2 h', '1250 h'], '2500 / 500 = 5 h.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  const wrap = (key, h, c) => () => ({ ...Gen.make(key), h, ...(c ? { c } : {}) });
  Gen.add('baProportion', wrap('proportion', 'Calcula por cuánto se multiplica el número de pilas y aplica lo mismo a la tensión.'), 'ba_prop');
  Gen.add('baPercent', wrap('percent', 'Multiplica por el porcentaje y divide entre 100.'), 'ba_percent');
  Gen.add('baOhmV', wrap('ohmV', 'V = I × R; pasa antes los mA a A.'), 'ba_ohm');
  Gen.add('baOhmI', wrap('ohmI', 'I = V / R con R en ohmios; luego pasa los A a mA.'), 'ba_ohm');
  Gen.add('baOhmR', wrap('ohmR', 'R = V / I; la corriente, en amperios.'), 'ba_ohm');
  Gen.add('baOhmMC', wrap('ohmMC', 'Divide la tensión entre la resistencia en ohmios y estima si salen mA o A.'), 'ba_ohm');
  Gen.add('baEstimate', wrap('estimate', 'Redondea a números cómodos: voltios entre kiloohmios dan miliamperios.'), 'ba_estimate');
  Gen.add('baPower', wrap('power', 'Mira qué datos tienes: V e I → P = V · I; I y R → I² · R; V y R → V² / R.', 'ba_psq'), 'ba_psq');
  Gen.add('baRating', wrap('rating', 'Calcula P = V² / R y compárala con 0,25 W.'), 'ba_prating');
  Gen.add('baEnergy', wrap('energy', 'W × h = Wh; ÷ 1000 = kWh; × precio = euros.'), 'ba_kwh');
  Gen.add('baBattLife', wrap('battLife', 'Horas ≈ mAh / mA.', 'ba_autonomy'), 'ba_autonomy');
  Gen.add('rearrangeBasic', () => {
    const c = pick([['V = I × R', 'R', 'R = V / I', ['R = I / V', 'R = V × I', 'R = I − V']], ['V = I × R', 'I', 'I = V / R', ['I = R / V', 'I = V × R', 'I = V − R']], ['I = V / R', 'V', 'V = I × R', ['V = I / R', 'V = R / I', 'V = I + R']], ['I = V / R', 'R', 'R = V / I', ['R = I / V', 'R = V × I', 'R = I − V']], ['d = v × t', 't', 't = d / v', ['t = v / d', 't = d × v', 't = d − v']], ['d = v × t', 'v', 'v = d / t', ['v = t / d', 'v = d × t', 'v = d − t']], ['área = base × altura', 'altura', 'altura = área / base', ['altura = base / área', 'altura = área × base', 'altura = área − base']], ['total = kilos × precio', 'kilos', 'kilos = total / precio', ['kilos = precio / total', 'kilos = total × precio', 'kilos = total − precio']]]);
    return MC(`Despeja ${c[1]} de ${c[0]}`, c[2], c[3], 'Haz la misma operación a los dos lados hasta dejar la incógnita sola.', { h: 'Si la incógnita está multiplicando, divide los dos lados; si está dividiendo, multiplica.' });
  }, 'ba_solve');
  Gen.add('ohmPropG', () => {
    const I = pick([2, 3, 4, 5, 6, 8]), k = pick([2, 3, 4]);
    if (Math.random() < 0.5) { const V = pick([1.5, 3, 4.5]); return { ...N(`Con una pila de ${fmt(V)} V pasan ${I} mA por una resistencia. ¿Cuántos mA pasarán con ${fmt(V * k)} V y la misma resistencia?`, I * k, 'mA', `${k} veces más tensión, ${k} veces más corriente: ${I * k} mA.`), h: 'Con la misma resistencia, corriente y tensión van juntas.' }; }
    const R = pick([1, 2, 5]); return { ...N(`Con ${R} kΩ pasan ${I * k} mA. ¿Cuántos mA pasarán con ${R * k} kΩ y la misma pila?`, I, 'mA', `${k} veces más resistencia, ${k} veces menos corriente: ${I} mA.`), h: 'Con la misma pila, más resistencia es menos corriente, en la misma proporción.' };
  }, 'ba_ohmprop');
  Gen.add('elecPref', () => {
    const cases = [
      () => { const v = pick([1.5, 2.2, 4.7, 10, 22, 0.33]); return N(`${fmt(v)} kΩ son… ¿cuántos ohmios?`, v * 1000, 'Ω', `k = × 1000 → ${fmt(v * 1000)} Ω.`); },
      () => { const v = pick([3300, 47000, 680, 220000]); return N(`${v} Ω son… ¿cuántos kiloohmios?`, v / 1000, 'kΩ', `÷ 1000 → ${fmt(v / 1000)} kΩ.`); },
      () => { const v = pick([0.02, 0.015, 0.25, 0.005]); return N(`${fmt(v, 4)} A son… ¿cuántos miliamperios?`, v * 1000, 'mA', `× 1000 → ${fmt(v * 1000)} mA.`); },
      () => { const v = pick([20, 350, 4.5, 1200]); return N(`${fmt(v)} mA son… ¿cuántos amperios?`, v / 1000, 'A', `÷ 1000 → ${fmt(v / 1000, 4)} A.`); },
      () => { const v = pick([1, 2.2, 4.7]); return N(`${fmt(v)} MΩ son… ¿cuántos kiloohmios?`, v * 1000, 'kΩ', `De M a k bajas un peldaño: × 1000 → ${fmt(v * 1000)} kΩ.`); }
    ];
    return { ...pick(cases)(), h: 'Prefijo más grande, número más pequeño: entre peldaños hay un factor 1000.' };
  }, 'ba_elecpref');

  /* ===================== LECCIONES ===================== */
  const ohmP = (V, R, o = {}) => ({ V: pV(V), R: { label: 'Resistencia', val: R, list: RL, fmt: 'R' }, ...o });
  const heatP = (o = {}) => ({ V: pV(3), R: pR('Resistencia', 1000, 10, 10000), Pr: { val: 0.25, list: [0.25, 0.5, 1, 2, 5], fixed: true }, ...o });
  UNITS.push({ id: 'm2', title: 'Ley de Ohm y potencia', desc: 'Proporciones y despejar, la ley de Ohm, potencia, seguridad, energía y unidades.', nodes: [
   L('a4', 'Proporciones y porcentajes', 'div', ['ba_prop', 'ba_percent'], [
    Q('Una receta de bizcocho para 4 personas lleva 200 g de harina. ¿Cuánta harina crees que hace falta para 12?', ['600 g', '400 g', '800 g', '2400 g'], 'El triple de personas, el triple de harina: 600 g. Es una proporción directa.', { predict: true, c: 'ba_prop', h: '¿Cuántas veces cabe 4 en 12?' }),
    { t: 'explore', title: 'Directa o inversa', text: 'Elige el tipo de relación y multiplica la primera magnitud. Mira la segunda.', viz: 'propBars', params: { kind: { label: 'Tipo (0 directa · 1 inversa)', val: 0, list: [0, 1], dec: 0 }, f: { label: 'Factor', val: 1, min: 1, max: 5, step: 1, dec: 0 } },
      tasks: [
        { q: 'other', min: 2.99, max: 3.01, text: 'Triplica la pasta', done: 'Directa: si una se multiplica por 3, la otra también.', hint: 'En la directa, sube el factor.' },
        { q: 'other', min: 0.33, max: 0.34, text: 'Deja el tiempo del viaje en un tercio', done: 'Inversa: triple de velocidad, un tercio de tiempo.', hint: 'Cambia a inversa.' },
        { q: 'other', min: 0.19, max: 0.21, text: 'Ahora en una quinta parte', done: 'Cinco veces más rápido, cinco veces menos tiempo.' }
      ] },
    I('<b>Proporción directa</b>: van juntas. Si una se multiplica por un número, la otra también.', { svg: S.direct }),
    I('<b>Proporción inversa</b>: van al revés. Si una se multiplica, la otra se divide por el mismo número.', { svg: S.inverse, more: 'Antes de calcular, pregúntate: si una sube, ¿la otra sube o baja? Eso te dice si es directa o inversa.' }),
    { t: 'steps', title: 'Ejemplo resuelto (regla de tres)', text: '3 kg de naranjas cuestan 4,50 €. ¿Cuánto cuestan 5 kg?', steps: ['Es directa: más kilos, más precio', 'Precio de 1 kg: 4,50 / 3 = <b>1,50 €</b>', '5 kg: 5 × 1,50 = <b>7,50 €</b>'], result: '7,50 €' },
    Q('Un coche a 60 km/h tarda 2 h en un viaje. ¿Cuánto tarda a 120 km/h?', ['1 h', '4 h', '2 h', '0,5 h'], 'Doble de velocidad, mitad de tiempo.', { c: 'ba_prop', h: 'Más rápido, menos tiempo: ¿directa o inversa?' }),
    G('baProportion'),
    Q('Llenas un cubo con un grifo en 6 minutos. ¿Cuánto tardas con dos grifos iguales?', ['3 min', '12 min', '6 min', '2 min'], 'Inversa: el doble de grifos, la mitad de tiempo.', { c: 'ba_prop', h: 'Más grifos, ¿más o menos tiempo?' }),
    I('Un <b>porcentaje</b> dice cuántos de cada 100. El 20 % de algo: × 20 / 100.\nAtajos: 10 % = ÷ 10; 50 % = la mitad; 5 % = la mitad del 10 %.', { svg: S.grid }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '¿Cuánto es el 20 % de 12?', steps: ['Multiplica y divide: 12 × 20 / 100 = <b>2,4</b>', 'Con el atajo: el 10 % de 12 es 1,2', 'El 20 % es el doble: 1,2 × 2 = <b>2,4</b>'], result: '2,4' },
    G('baPercent'),
    Nm('Una pila de 9 V ha perdido un 10 % de su tensión. ¿Cuántos voltios le quedan?', 8.1, 'V', 'El 10 % de 9 es 0,9: 9 − 0,9 = 8,1 V.', { c: 'ba_percent', h: 'Calcula el 10 % y réstalo.' }),
    I('«±5 %» quiere decir que el valor real puede estar un 5 % por encima o por debajo. 200 g ± 5 % → entre 190 y 210 g.'),
    Q('Un paquete de 500 g tiene un margen de ±2 %. ¿Entre qué pesos puede estar?', ['Entre 490 y 510 g', 'Entre 498 y 502 g', 'Entre 480 y 520 g', 'Entre 400 y 600 g'], 'El 2 % de 500 es 10 g: se resta y se suma.', { c: 'ba_percent', h: 'Calcula el 2 % de 500 y réstalo y súmalo.' }),
    G('baPercent'),
    I('<b>Resumen</b>\n· Directa: van juntas (× 3 y × 3). Inversa: al revés (× 3 y ÷ 3).\n· Regla de tres: busca lo que vale una unidad.\n· Porcentaje: × % / 100. ±5 %: un 5 % arriba o abajo.')
   ]),
   L('c1', 'La ley de Ohm, intuición', 'ohm', ['ba_ohmprop', 'ba_ohm'], [
    Q('Una pila empuja corriente por una resistencia. Si pones una pila el doble de fuerte, ¿qué crees que pasará?', ['Pasará el doble de corriente', 'Pasará la mitad', 'Pasará lo mismo'], 'Más empuje, más corriente, en la misma proporción. Vamos a comprobarlo, primero con agua.', { predict: true, c: 'ba_ohmprop', h: 'Piensa en el depósito de agua: más altura, ¿más o menos caudal?' }),
    { t: 'explore', title: 'Primero, con agua', text: 'La altura del depósito es el empuje (tensión); la estrechez del tubo, el freno (resistencia); el caudal, la corriente.', viz: 'water', params: { h: { label: 'Altura (tensión)', val: 4, min: 1, max: 10, step: 1, dec: 0 }, w: { label: 'Estrechez (resistencia)', val: 4, min: 1, max: 10, step: 1, dec: 0 } },
      tasks: [
        { q: 'f_w4', min: 1.99, max: 2.01, text: 'Sin tocar el tubo, consigue el doble de caudal', done: 'Doble de altura, doble de caudal.', hint: 'Sube el depósito.' },
        { q: 'f_h8', min: 0.99, max: 1.01, text: 'Con la altura en 8, vuelve al caudal del principio', done: 'Doble de estrechez, mitad de caudal: se compensa.', hint: 'Estrecha el tubo.' }
      ] },
    { t: 'explore', title: 'Ahora, con electricidad', text: 'Una pila, una resistencia y un medidor de corriente.', viz: 'ohmLab', params: ohmP(3, 1000),
      tasks: [
        { q: 'I', min: 0.0059, max: 0.0061, text: 'Sin tocar la resistencia, haz que pasen 6 mA', done: 'Doble de tensión (6 V), doble de corriente.', hint: 'Sube la pila.' },
        { q: 'I6', min: 0.0029, max: 0.0031, text: 'Ahora consigue 3 mA con 6 V', done: 'Doble de resistencia (2 kΩ), mitad de corriente.', hint: 'Deja la pila en 6 V y busca la resistencia.' }
      ] },
    I('Lo que acabas de descubrir tiene nombre: <b>ley de Ohm</b>.\nLa corriente es el empuje dividido por el freno: <b>I = V / R</b>, en voltios, ohmios y amperios.', { svg: S.ohmRule, more: 'Georg Ohm lo midió en 1827 con hilos de distintos largos y materiales: la corriente era proporcional a la tensión e inversamente proporcional a la resistencia del hilo.' }),
    I('La misma ley se escribe de tres formas, según lo que busques:\n<b>V = I · R</b> · <b>I = V / R</b> · <b>R = V / I</b>', { svg: OHM_TRI, more: 'En la próxima lección aprenderás a pasar de una forma a otra sin memorizarlas.' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Una pila de 9 V y una resistencia de 1 kΩ. ¿Qué corriente pasa?', steps: ['Ley de Ohm: <b>I = V / R</b>', 'En unidades base: 1 kΩ = 1000 Ω', 'I = 9 / 1000 = <b>0,009 A</b>', 'En mA (× 1000): <b>9 mA</b>'], result: '9 mA' },
    Q('Con 3 V pasan 6 mA por una resistencia. ¿Cuánto pasará con 9 V?', ['18 mA', '2 mA', '12 mA', '6 mA'], 'El triple de tensión, el triple de corriente.', { c: 'ba_ohmprop', h: '¿Por cuánto se multiplica la tensión?' }),
    Q('Con 1 kΩ pasan 8 mA. ¿Cuánto pasará con 4 kΩ y la misma pila?', ['2 mA', '32 mA', '8 mA', '4 mA'], 'Cuatro veces más resistencia, cuatro veces menos corriente.', { c: 'ba_ohmprop', h: 'Más freno con el mismo empuje: ¿sube o baja?' }),
    TU('Consigue más de 50 mA cambiando solo la resistencia.', 'ohm', { V: { ...pV(6), fixed: true }, R: pR('Resistencia', 4700, 47, 10000) }, { q: 'I', min: 0.05, max: 10, text: 'Objetivo: más de 50 mA', hint: 'Menos resistencia, más corriente.' }, 'Con 6 V, por debajo de 120 Ω.', { c: 'ba_ohmprop', h: 'Para que pase más corriente con el mismo empuje, quita freno.' }),
    TU('Ajusta pila y resistencia para exactamente 10 mA.', 'ohm', { V: pV(5), R: pR('Resistencia', 220, 100, 10000) }, { q: 'I', min: 0.0098, max: 0.0102, text: 'Objetivo: 10 mA', hint: 'I = V / R: por ejemplo 10 V con 1 kΩ.' }, 'Hay muchas combinaciones válidas.', { c: 'ba_ohm', h: '10 mA son 0,01 A: busca una pareja V y R cuya división dé eso.' }),
    Q('Misma resistencia y la tensión se multiplica por 3. La corriente…', ['Se triplica', 'Se divide entre 3', 'No cambia', 'Se multiplica por 9'], 'Proporcional.', { c: 'ba_ohmprop', h: 'Tensión y corriente van juntas.' }),
    Q('Misma pila y la resistencia a la mitad. La corriente…', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'Inversamente proporcional.', { c: 'ba_ohmprop', h: 'Resistencia y corriente van al revés.' }),
    G('ohmPropG'),
    I('<b>Resumen</b>\n· Más tensión → más corriente, en la misma proporción.\n· Más resistencia → menos corriente.\n· <b>I = V / R</b> (y V = I · R, R = V / I), siempre en V, A y Ω.')
   ]),
   L('a3', 'Despejar fórmulas', 'ohm', ['ba_solve'], [
    Q('Sabes que distancia = velocidad × tiempo. ¿Cómo crees que se calcula el tiempo de un viaje?', ['tiempo = distancia / velocidad', 'tiempo = distancia × velocidad', 'tiempo = velocidad / distancia', 'tiempo = distancia − velocidad'], '120 km a 60 km/h: 120 / 60 = 2 h. Eso es despejar.', { predict: true, c: 'ba_solve', h: 'Prueba con un viaje de 120 km a 60 km/h.' }),
    I('Una fórmula es una <b>balanza equilibrada</b>: lo que hagas a un lado, házselo al otro, y sigue equilibrada.\nPara quitar algo que multiplica, divides; para quitar algo que divide, multiplicas.', { svg: S.balance }),
    { t: 'explore', title: 'El triángulo', text: 'Las fórmulas del tipo «arriba = abajo × abajo» caben en un triángulo. Tapa la letra que buscas.', viz: 'triangle', params: { f: { label: 'Fórmula (1 distancia · 2 Ohm)', val: 1, list: [1, 2], dec: 0 }, hide: { label: 'Tapar (1 arriba · 2 abajo izq. · 3 abajo der.)', val: 1, list: [1, 2, 3], dec: 0 } },
      tasks: [
        { q: 't1', min: 1, max: 1, text: 'En la de la distancia, tapa el tiempo', done: 't = d / v: la de arriba entre la otra de abajo.', hint: 'El tiempo está abajo a la derecha.' },
        { q: 't2', min: 1, max: 1, text: 'En la ley de Ohm, tapa la R', done: 'R = V / I.' },
        { q: 't3', min: 1, max: 1, text: 'Ahora tapa la de arriba', done: 'V = I · R: las dos de abajo se multiplican.' }
      ] },
    { t: 'steps', title: 'Paso a paso', text: 'De d = v · t a t = d / v.', steps: ['Empieza con <b>d = v · t</b>', 'Divide los dos lados entre v: d / v = v · t / v', 'v / v = 1: se va', 'Queda <b>t = d / v</b>'], result: 't = d / v' },
    { t: 'steps', title: 'Paso a paso', text: 'De V = I · R a R = V / I.', steps: ['Empieza con <b>V = I · R</b>', 'Divide los dos lados entre I: V / I = I · R / I', 'I / I = 1: se va', 'Queda <b>R = V / I</b>'], result: 'R = V / I' },
    Q('De V = I × R, ¿qué es I?', ['V / R', 'V × R', 'R / V', 'V − R'], 'Divide los dos lados entre R.', { c: 'ba_solve', h: 'R está multiplicando a I: ¿qué operación la quita?' }),
    G('rearrangeBasic'),
    I('Truco para no equivocarte: <b>compruébalo con números fáciles</b>. El despeje bueno te devuelve el número de partida.', { svg: S.check }),
    G('rearrangeBasic'),
    Q('Precio total = kilos × precio por kilo. ¿Cómo calculas los kilos?', ['kilos = total / precio por kilo', 'kilos = total × precio por kilo', 'kilos = precio por kilo / total', 'kilos = total − precio por kilo'], 'Divide los dos lados entre el precio por kilo.', { c: 'ba_solve', h: 'Prueba: 3 kg a 2 €/kg son 6 €. ¿Qué operación devuelve 3?' }),
    Nm('V = I × R. Con 12 V pasan 3 A. ¿Qué resistencia hay, en ohmios?', 4, 'Ω', 'R = V / I = 12 / 3 = 4 Ω.', { c: 'ba_solve', h: 'Despeja R primero y luego pon los números.' }),
    G('rearrangeBasic'),
    I('<b>Resumen</b>\n· Lo que haces a un lado, házselo al otro.\n· Lo que multiplica pasa dividiendo, y al revés.\n· Comprueba el despeje con números fáciles.')
   ]),
   L('c2', 'Calcular con la ley de Ohm', 'ohm', ['ba_ohm', 'ba_elecpref'], [
    Q('Una pila de 9 V y una resistencia de 1 kΩ. ¿Cuánta corriente crees que pasa?', ['9 mA', '9 A', '9 µA', '0,9 A'], '9 / 1000 = 0,009 A = 9 mA. El truco está en los prefijos.', { predict: true, c: 'ba_ohm', h: '1 kΩ son 1000 Ω.' }),
    { t: 'explore', title: 'Valores exactos', text: 'Busca combinaciones de pila y resistencia. Calcula antes de mover: I = V / R.', viz: 'ohmLab', params: ohmP(9, 1000),
      tasks: [
        { q: 'I', min: 0.00495, max: 0.00505, text: 'Consigue 5 mA', done: 'Por ejemplo, 5 V / 1000 Ω = 0,005 A.', hint: 'Prueba con 1 kΩ: ¿qué pila hace falta?' },
        { q: 'I', min: 0.099, max: 0.101, text: 'Consigue 100 mA', done: '10 V / 100 Ω = 0,1 A.', hint: 'Necesitas poca resistencia.' },
        { q: 'I', min: 0.000495, max: 0.000505, text: 'Consigue 0,5 mA', done: 'Por ejemplo, 5 V / 10 kΩ = 0,0005 A = 500 µA.' }
      ] },
    I('La receta que evita casi todos los errores:\n1) todo a <b>V, A y Ω</b>; 2) aplica la fórmula; 3) vuelve a un prefijo cómodo.', { svg: S.recipe }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '¿Cuánta corriente pasa por 470 Ω con una pila de 9 V?', steps: ['Ley de Ohm: <b>I = V / R</b>', 'Ya está en unidades base: I = 9 V / 470 Ω', 'Divide: I = <b>0,0191 A</b>', 'Pásalo a mA (× 1000): <b>19,1 mA</b>'], result: 'Unos 19 mA' },
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Con 5 V pasan 20 mA. ¿Qué resistencia hay?', steps: ['Busca R: <b>R = V / I</b>', 'Pasa la corriente a amperios: 20 mA = <b>0,02 A</b>', 'R = 5 / 0,02 = <b>250 Ω</b>'], result: '250 Ω' },
    Nm('Con 6 V y 1 kΩ, ¿cuántos mA pasan?', 6, 'mA', '6 / 1000 = 0,006 A = 6 mA.', { c: 'ba_ohm', h: 'Pasa 1 kΩ a 1000 Ω y luego divide.' }),
    G('baOhmI'),
    G('baOhmV'),
    Nm('2,2 kΩ son… ¿cuántos ohmios?', 2200, 'Ω', 'k = × 1000.', { c: 'ba_elecpref', h: 'k vale 1000.' }),
    G('elecPref'),
    G('baOhmR'),
    Q('Calculas que por 1 kΩ con 5 V pasan 5 A. ¿Qué ha fallado?', ['Usaste 1 en vez de 1000 Ω', 'Nada', 'La pila es muy grande', 'La fórmula es I = V × R'], '5 / 1000 = 5 mA.', { c: 'ba_ohm', h: 'Voltios entre kiloohmios dan miliamperios.' }),
    G('baOhmMC'),
    I('<b>Resumen</b>\n· Todo a V, A y Ω antes de calcular.\n· I = V / R · V = I · R · R = V / I.\n· Vuelve a un prefijo cómodo (mA, kΩ) al final.')
   ]),
   L('a6', 'Estimar y redondear', 'bin', ['ba_estimate', 'ba_ohm'], [
    Q('Sin calculadora: 9 V entre 470 Ω. ¿Qué te parece más cercano?', ['20 mA', '2 mA', '200 mA', '2 A'], '9 / 470 ≈ 10 / 500 = 0,02 A. Estimar te salva de los errores de prefijo.', { predict: true, c: 'ba_estimate', h: 'Redondea 470 a 500 y 9 a 10.' }),
    I('Un buen técnico <b>estima antes de calcular</b>: redondea a números cómodos y saca el orden de magnitud. No busca el valor exacto, sino saber si son µA, mA o A.', { svg: S.estimate }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Estima 9 V / 470 Ω.', steps: ['Redondea: 470 → <b>500</b> y 9 → <b>10</b>', '10 / 500 = <b>0,02</b>', 'Son unos <b>20 mA</b>', 'Real: 19,1 mA. ¡Muy cerca!'], result: 'Unos 20 mA' },
    I('Un atajo muy útil: <b>voltios entre kiloohmios dan miliamperios</b>. 5 V / 1 kΩ = 5 mA.', { svg: S.vk }),
    { t: 'explore', title: 'Estima con 12 V', text: 'La pila es de 12 V. Busca, estimando de cabeza, la resistencia que da cada corriente.', viz: 'ohmLab', params: ohmP(12, 1000, { V: { ...pV(12), fixed: true }, est: { val: 1, fixed: true } }),
      tasks: [
        { q: 'I', min: 0.0045, max: 0.006, text: 'Unos 5 mA', done: '12 / 2,2 kΩ ≈ 12 / 2 = 6 mA (real: 5,45 mA).', hint: '12 / 5 mA son unos 2,4 kΩ.' },
        { q: 'I', min: 0.022, max: 0.028, text: 'Unos 25 mA', done: '12 / 470 ≈ 12 / 500 = 24 mA (real: 25,5 mA).' },
        { q: 'I', min: 0.0009, max: 0.0013, text: 'Alrededor de 1 mA', done: '12 / 10 kΩ = 1,2 mA.' }
      ] },
    G('baEstimate'),
    Q('Estima: 12 V / 2,2 kΩ', ['Unos 5 mA', 'Unos 5 A', 'Unos 50 mA', 'Unos 0,5 mA'], '12 / 2000 ≈ 6 mA → real 5,45 mA.', { c: 'ba_estimate', h: 'Voltios entre kiloohmios: miliamperios.' }),
    G('baEstimate'),
    I('Si el resultado se sale del orden de magnitud esperado, casi seguro hay un <b>error de prefijo</b>: kΩ tomado como Ω, o mA como A.', { svg: S.absurd }),
    Q('Calculas que por 10 kΩ con 5 V pasan 500 mA. ¿Qué haces?', ['Revisar: 5 / 10 000 son 0,5 mA', 'Nada, está bien', 'Cambiar la pila', 'Usar una resistencia más grande'], 'Un factor 1000: error de prefijo.', { c: 'ba_estimate', h: 'Estima: voltios entre kiloohmios.' }),
    Q('Estima cuánto es 3,3 V / 680 Ω.', ['Unos 5 mA', 'Unos 50 mA', 'Unos 0,5 mA', 'Unos 5 A'], '3,5 / 700 = 0,005 A (real: 4,9 mA).', { c: 'ba_estimate', h: 'Redondea 680 a 700 y 3,3 a 3,5.' }),
    G('baOhmMC'),
    I('<b>Resumen</b>\n· Redondea y saca el orden de magnitud antes de calcular.\n· V / kΩ = mA.\n· Si sale mil veces más o menos de lo esperado, revisa los prefijos. Y da el resultado con 2 o 3 cifras.')
   ]),
   L('c3', 'Gráficas tensión–corriente', 'ohm', ['ba_ivgraph', 'ba_ledknee'], [
    Q('Si dibujas la corriente de una resistencia para 0, 1, 2, 3 V…, ¿qué forma crees que tendrá?', ['Una recta que sale del origen', 'Una curva que se dispara', 'Una línea horizontal', 'Un zigzag'], 'Una recta: doble de tensión, doble de corriente. Pero no todo es tan obediente.', { predict: true, c: 'ba_ivgraph', h: 'Recuerda: con la misma resistencia, corriente y tensión van juntas.' }),
    { t: 'explore', title: 'Recorre las curvas', text: 'Elige la pieza y sube la tensión. El punto amarillo dice cuánta corriente pasa.', viz: 'ivCurve', params: { comp: { label: 'Pieza (1 · 1 kΩ, 2 · 2 kΩ, 3 · LED rojo)', val: 1, list: [1, 2, 3], dec: 0 }, V: { label: 'Tensión', val: 0, min: 0, max: 5, step: 0.05, unit: 'V', dec: 2 } },
      tasks: [
        { q: 'i1k3', min: 1, max: 1, text: 'Con 1 kΩ, pon 3 V: ¿cuánto pasa?', done: '3 mA: una recta que sube 1 mA por voltio.', hint: 'Sube la tensión hasta 3 V.' },
        { q: 'i2k3', min: 1, max: 1, text: 'Cambia a 2 kΩ con los mismos 3 V', done: '1,5 mA: la recta es más plana; más resistencia.' },
        { q: 'ledOn', min: 1, max: 1, text: 'Con el LED, busca la tensión a la que empieza a conducir', done: 'Hasta 1,8 V casi nada; a partir de ahí, la corriente sube a toda velocidad.', hint: 'Sube despacio a partir de 1,7 V.' }
      ] },
    I('Una resistencia da una <b>recta por el origen</b>: es <b>lineal</b>. Cuanto más inclinada, más corriente con la misma tensión: <b>menos</b> resistencia.', { svg: S.ivLines, more: 'La pendiente de la recta es 1/R. En cualquier punto, R = V / I.' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Una recta pasa por (4 V, 2 mA). ¿Qué resistencia es?', steps: ['En cualquier punto: <b>R = V / I</b>', 'Pasa a amperios: 2 mA = 0,002 A', 'R = 4 / 0,002 = <b>2000 Ω</b>'], result: '2 kΩ' },
    Q('¿Qué recta corresponde a la resistencia más pequeña?', ['La más inclinada', 'La más plana', 'Las dos iguales', 'La curva'], 'Con poca tensión ya pasa mucha corriente.', { c: 'ba_ivgraph', h: 'Poca resistencia = mucha corriente con la misma tensión.' }),
    Nm('Una recta pasa por (5 V, 10 mA). ¿Resistencia en ohmios?', 500, 'Ω', '5 / 0,01 = 500 Ω.', { c: 'ba_ivgraph', h: 'R = V / I, con la corriente en amperios.' }),
    I('El LED no es una recta: casi nada hasta un <b>codo</b> (unos 1,8–2 V en uno rojo) y luego la corriente <b>se dispara</b>. Es <b>no lineal</b>.', { svg: S.ledKnee }),
    Q('La curva del LED no es una recta. Eso significa…', ['Que no cumple la ley de Ohm: su «resistencia» cambia con la tensión', 'Que está roto', 'Que es aislante', 'Que se ajusta a mano'], 'Componente no lineal.', { c: 'ba_ivgraph', h: 'Si fuera una resistencia normal, ¿qué forma tendría?' }),
    Q('¿Qué tiene de peligroso esa curva?', ['Pasado el codo, un poco más de tensión dispara la corriente', 'Que nunca conduce', 'Que conduce en los dos sentidos', 'Nada'], 'Por eso el LED lleva una resistencia.', { c: 'ba_ledknee', h: 'Mira lo empinada que es pasado el codo.' }),
    I('Por eso a un LED no se le da «la tensión justa»: unas décimas de más multiplican la corriente. La resistencia en su camino se encarga de fijarla; aprenderás a calcularla en el próximo módulo.', { tune: { viz: 'ledPiece', params: { sw: { val: 1, list: [0, 1], fixed: true }, flip: { val: 0, list: [0, 1], fixed: true }, R: { label: 'Resistencia', val: 470, list: [0, 10, 47, 100, 220, 470, 1000, 2200, 4700, 10000], fmt: 'R' } } } }),
    Q('En la gráfica de un LED rojo, a 1,5 V…', ['Casi no pasa corriente', 'Pasan muchos amperios', 'Se quema', 'Pasa lo mismo que a 2 V'], 'Está por debajo del codo.', { c: 'ba_ivgraph', h: '¿1,5 V está antes o después del codo?' }),
    Q('La recta A pasa por (2 V, 4 mA) y la B por (2 V, 1 mA). ¿Cuál tiene más resistencia?', ['B', 'A', 'Iguales'], 'Con la misma tensión pasa menos corriente: más freno (2 kΩ frente a 500 Ω).', { c: 'ba_ivgraph', h: 'Misma tensión: ¿por cuál pasa menos corriente?' }),
    I('<b>Resumen</b>\n· Resistencia: recta por el origen (lineal); más inclinada = menos R.\n· R = V / I en cualquier punto de la recta.\n· LED: curva con un codo; pasado el codo, la corriente se dispara.')
   ]),
   L('c4', 'Potencia: energía por segundo', 'heat', ['ba_pvi', 'ba_psq'], [
    Q('Una bombilla de 60 W y otra de 6 W, encendidas una hora. ¿Cuál crees que gasta más energía?', ['La de 60 W: diez veces más', 'Las dos igual', 'La de 6 W', 'Depende del color'], 'Los vatios dicen lo rápido que se gasta la energía: 60 W gasta diez veces más rápido.', { predict: true, c: 'ba_pvi', h: 'Piensa en qué significa la W de la caja.' }),
    I('La <b>potencia</b> es la rapidez con la que se transforma la energía. Se mide en <b>vatios</b>: <b>1 W = 1 julio cada segundo</b>.', { svg: S.jps }),
    I('Cada segundo pasan I culombios, y cada uno suelta V julios. Así que cada segundo se sueltan V · I julios:\n<b>P = V · I</b>', { svg: S.pvi }),
    Q('Una pila de 9 V entrega 0,1 A. ¿Cuántos julios da cada segundo?', ['0,9 J', '90 J', '9 J', '0,011 J'], 'P = V · I = 0,9 W, es decir, 0,9 J cada segundo.', { c: 'ba_pvi', h: 'Multiplica voltios por amperios.' }),
    { t: 'explore', title: 'Una resistencia que se calienta', text: 'Toda la potencia de una resistencia se vuelve calor. Esta aguanta ¼ W (0,25 W).', viz: 'pHeat', params: heatP(),
      tasks: [
        { q: 'over', min: 1, max: 1, text: 'Haz que se caliente de verdad: más de ¼ W', done: 'Más tensión o menos resistencia: más potencia.', hint: 'Sube la pila o baja la resistencia.' },
        { q: 'P6', min: 0.0355, max: 0.0365, text: 'Con 6 V, busca la resistencia que da 36 mW', done: '6 V / 1 kΩ = 6 mA; 6 × 0,006 = 0,036 W.', hint: 'Pon la pila en 6 V.' },
        { q: 'P12k', min: 0.14, max: 0.15, text: 'Duplica la tensión (12 V) con la misma resistencia', done: '¡144 mW: cuatro veces más! Doble de tensión, doble de corriente: el doble del doble.' }
      ] },
    I('Combinando con la ley de Ohm salen otras dos formas:\n<b>P = I² · R</b> (si sabes I y R) · <b>P = V² / R</b> (si sabes V y R).\nPor eso el doble de tensión da <b>cuatro veces</b> más potencia.', { svg: S.three, more: 'De dónde salen: en P = V · I cambia V por I · R y sale I · R · I = I² · R. O cambia I por V / R y sale V · V / R = V² / R.' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '9 V sobre una resistencia de 220 Ω. ¿Qué potencia disipa?', steps: ['Con V y R: <b>P = V² / R</b>', 'P = 9² / 220 = 81 / 220', 'P = <b>0,37 W</b>', 'Comprobación: I = 9 / 220 = 0,041 A; P = V · I = 9 × 0,041 = 0,37 W ✓'], result: 'Unos 0,37 W (370 mW): más de lo que aguanta una de ¼ W' },
    G('baPower'),
    Q('De P = I² × R, ¿cuánto vale I?', ['√(P / R)', 'P / R', 'P / R²', '√(P × R)'], 'Divide entre R y haz la raíz.', { c: 'ba_psq', h: 'Primero deja I² sola dividiendo entre R; luego, la raíz.' }),
    Q('El doble de corriente por la misma resistencia. Su potencia…', ['Se cuadruplica', 'Se duplica', 'No cambia', 'Baja'], 'P = I² · R: 2² = 4.', { c: 'ba_psq', h: 'La corriente va al cuadrado.' }),
    G('baPower'),
    Nm('12 V y 0,5 A. ¿Potencia en vatios?', 6, 'W', 'P = V · I = 12 × 0,5 = 6 W.', { c: 'ba_pvi', h: 'Voltios por amperios.' }),
    Q('Tu cargador pone «5 V 2 A». ¿Qué potencia máxima da?', ['10 W', '2,5 W', '7 W', '0,4 W'], '5 × 2 = 10 W.', { c: 'ba_pvi', h: 'P = V · I.' }),
    I('<b>Resumen</b>\n· Potencia = energía por segundo, en vatios (1 W = 1 J/s).\n· <b>P = V · I</b>; con Ohm, P = I² · R y P = V² / R.\n· Doble de tensión o de corriente → cuatro veces más potencia.')
   ]),
   L('c5', 'Elegir la potencia de una resistencia', 'heat', ['ba_prating'], [
    Q('Una resistencia normal, pequeñita, aguanta ¼ W. Le haces disipar 1 W. ¿Qué crees que pasa?', ['Se calienta muchísimo, huele a quemado y puede romperse', 'Nada', 'Se enfría', 'Da luz'], 'Toda esa potencia es calor, y su cuerpo no puede soltarlo tan rápido.', { predict: true, c: 'ba_prating', h: 'Recuerda en qué se convierte la potencia en una resistencia.' }),
    I('Las resistencias se fabrican para aguantar una <b>potencia nominal</b>: ¼ W las normales; también ½, 1, 2, 5 W… Cuanto más grandes, más calor pueden soltar.', { svg: S.ratings }),
    { t: 'explore', title: 'Con 12 V', text: 'La pila es de 12 V. Elige la resistencia y lo que aguanta.', viz: 'pHeat', params: { V: { ...pV(12), fixed: true }, R: { label: 'Resistencia', val: 1000, list: [220, 470, 1000, 2200, 4700], fmt: 'R' }, Pr: { label: 'Aguanta', val: 0.25, list: [0.25, 0.5, 1, 2, 5], unit: 'W', dec: 2 } },
      tasks: [
        { q: 'burn', min: 1, max: 1, text: 'Pon 220 Ω: ¿aguanta la de ¼ W?', done: 'No: 144 / 220 = 0,65 W. Se quema.', hint: 'Baja la resistencia a 220 Ω.' },
        { q: 'm220', min: 2, max: 100, text: 'Con 220 Ω, elige una que aguante con margen (al menos el doble)', done: '0,65 W × 2 = 1,3 W: hace falta la de 2 W. La de 1 W aguantaría, pero muy justa y caliente.' },
        { q: 'q4', min: 2200, max: 2200, text: 'Con la de ¼ W, busca la resistencia más baja que aguanta con margen ×2', done: '2,2 kΩ: 65 mW, menos de la mitad de 0,25 W.' }
      ] },
    I('Regla práctica: calcula lo que disipa y elige una que aguante <b>al menos el doble</b>. Si se calienta menos, dura más y no cambia de valor.', { svg: S.margin }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '12 V sobre 220 Ω. ¿De qué potencia eliges la resistencia?', steps: ['P = V² / R = 144 / 220 = <b>0,65 W</b>', 'Con margen: 0,65 × 2 = <b>1,3 W</b>', '¼ W y ½ W: no aguantan. 1 W: aguanta, pero sin margen', 'Elige la siguiente: <b>2 W</b>'], result: 'Una resistencia de 2 W' },
    TU('Con 9 V, elige la resistencia más baja que no supere ¼ W.', 'power', { V: { ...pV(9), fixed: true }, R: pR('Resistencia', 10000, 22, 10000) }, { q: 'P', min: 0.15, max: 0.25, text: 'Objetivo: entre 0,15 y 0,25 W', hint: 'R ≥ 81 / 0,25 = 324 Ω.' }, '330 Ω: 0,245 W, en el límite (sin margen).', { c: 'ba_prating', h: 'P = V² / R: ¿qué R hace que 81 / R no pase de 0,25?' }),
    G('baRating'),
    Q('La resistencia de un LED disipa 70 mW. ¿Qué potencia eliges?', ['¼ W: va sobrada', '5 W', '1/16 W justa', 'Ninguna'], 'El doble de 70 mW son 140 mW, menos de 250 mW.', { c: 'ba_prating', h: 'Compara el doble de 70 mW con 250 mW.' }),
    Q('Te sale que la resistencia de un LED disipa 40 W. ¿Qué haces?', ['Revisar las cuentas: deberían ser milivatios', 'Comprar una de 50 W', 'Poner dos LEDs', 'Nada'], 'Con pilas y LEDs se habla de milivatios: seguramente un error de prefijo.', { c: 'ba_prating', h: 'Estima: ¿es razonable tanta potencia con una pila pequeña?' }),
    G('baRating'),
    Q('Una resistencia disipará 200 mW. ¿Cuál eliges?', ['½ W', '¼ W', '1/8 W', '5 W'], '¼ W sería justo: elige al menos el doble, 0,4 W → ½ W.', { c: 'ba_prating', h: 'El doble de 0,2 W es 0,4 W: ¿qué tamaño estándar lo supera?' }),
    I('El calor tiene que salir: deja la resistencia separada de la placa y sin tapar, sobre todo las de más de ½ W.', { svg: S.airflow }),
    I('<b>Resumen</b>\n· Potencias nominales: ¼, ½, 1, 2, 5 W…\n· Calcula P y elige una que aguante al menos el doble.\n· Si te salen vatios donde esperabas milivatios, revisa los prefijos.')
   ]),
   L('b8', 'Seguridad eléctrica de verdad', 'shield', ['ba_bodycur', 'ba_shockpath', 'ba_lowvrisk'], [
    Q('¿Qué crees que hace daño de verdad al tocar algo eléctrico?', ['La corriente que atraviesa tu cuerpo', 'Solo la tensión', 'El color del cable', 'El calor del enchufe'], 'La corriente que pasa por ti, y por dónde pasa. La tensión es lo que la empuja.', { predict: true, c: 'ba_bodycur', h: 'Recuerda la ley de Ohm: la tensión empuja y… ¿qué es lo que circula?' }),
    I('Lo que daña es la <b>corriente que te atraviesa</b> y su recorrido. De mano a mano o de mano a pie cruza el pecho: el corazón.', { svg: S.body }),
    { t: 'explore', title: 'Tú como resistencia', text: 'Valores orientativos de un contacto de mano a mano. Cambia la tensión y el estado de la piel.', viz: 'bodyCurrent', params: { V: { label: 'Tensión', val: 9, list: [1.5, 9, 24, 50, 230], unit: 'V', dec: 1 }, skin: { label: 'Piel (1 seca · 2 mojada · 3 heridas)', val: 1, list: [1, 2, 3], dec: 0 } },
      tasks: [
        { q: 'dry230', min: 1, max: 1, text: 'Piel seca y la red de casa (230 V)', done: 'Peligro de muerte: a 230 V la piel se perfora y apenas frena.', hint: 'Sube la tensión al máximo.' },
        { q: 'wet230', min: 1, max: 1, text: 'Ahora con la piel mojada', done: 'Aún más corriente: por eso agua y enchufes, nunca juntos.' },
        { q: 'wet24', min: 1, max: 1, text: 'Con la piel mojada, busca la tensión más baja que ya pasa de 10 mA', done: '24 V: con la piel mojada, incluso tensiones moderadas pueden impedirte soltar.' }
      ] },
    I('Tu resistencia depende de la piel: <b>seca</b>, decenas o cientos de kΩ; <b>mojada</b> o con heridas, mucho menos. Y a tensiones altas la piel se perfora. <b>I = V / R</b> también vale para ti.', { svg: S.skin }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Piel mojada, unos 1000 Ω de mano a mano. ¿Qué corriente empujarían 230 V?', steps: ['Ley de Ohm: <b>I = V / R</b>', 'I = 230 / 1000 = <b>0,23 A</b>', 'Son <b>230 mA</b>', 'Unas decenas de mA cruzando el pecho ya pueden parar el corazón'], result: '230 mA: mortal' },
    Q('De mano a mano, con la piel seca, puede haber unos 100 kΩ. ¿Qué corriente pasaría con una pila de 9 V?', ['Unos 90 µA: ni lo notas', 'Unos 90 mA: mortal', '9 A', 'Ninguna'], '9 / 100 000 = 0,000 09 A = 90 µA.', { c: 'ba_bodycur', h: 'I = V / R con R en ohmios.' }),
    Nm('Con la piel mojada (1 kΩ), ¿cuántos mA empujarían 24 V?', 24, 'mA', '24 / 1000 = 0,024 A = 24 mA: suficiente para no poder soltar.', { c: 'ba_bodycur', h: 'Voltios entre kiloohmios dan miliamperios.' }),
    I('En casa te protege el <b>diferencial</b>: compara la corriente que va con la que vuelve. Si no coinciden, algo (quizá tú) la está desviando, y corta en milisegundos.', { svg: S.rcd, more: 'El diferencial doméstico salta con fugas de unos 30 mA. El magnetotérmico, en cambio, protege los cables de un exceso de corriente, no a las personas.' }),
    Q('¿Qué protege a las personas en la instalación eléctrica de casa?', ['El diferencial: corta si la corriente que va no es igual a la que vuelve', 'El fusible de un aparato', 'Los enchufes con tapa', 'Nada'], 'Detecta fugas, por ejemplo a través de ti.', { c: 'ba_shockpath', h: 'Busca el aparato que compara lo que va con lo que vuelve.' }),
    Q('¿Por qué se recomienda acercar una sola mano a un circuito peligroso?', ['Para que la corriente no cruce el pecho de mano a mano', 'Para ir más rápido', 'Para sujetar la linterna', 'Por costumbre'], 'El recorrido más peligroso pasa por el corazón. Aun así, en este curso no tocarás tensiones peligrosas.', { c: 'ba_shockpath', h: 'Piensa en el camino que haría la corriente entre tus dos manos.' }),
    I('Baja tensión no significa sin riesgo: una batería de coche o de litio en <b>cortocircuito</b> da cientos de amperios. Un anillo que la puentee se pone al rojo. Y los aparatos de red pueden <b>guardar energía</b> aunque estén desenchufados: no los abras.', { svg: S.ring }),
    Q('Llevas una celda 18650 suelta en el bolsillo con las llaves. ¿Algún problema?', ['Las llaves pueden cortocircuitarla: calor e incluso fuego', 'Ninguno: solo son 3,7 V', 'Solo se descarga un poco', 'Solo si está vacía'], 'Guárdalas en un estuche o con los polos tapados.', { c: 'ba_lowvrisk', h: '¿Qué pasa si algo metálico une los dos polos?' }),
    Q('Un cargador de 230 V se ha estropeado y está desenchufado. ¿Lo abres para curiosear?', ['No: dentro puede quedar energía guardada y hay tensiones peligrosas', 'Sí: desenchufado no hay riesgo', 'Sí, con guantes de lana', 'Sí, si es pequeño'], 'En este curso, todo es de baja tensión: pilas, USB y adaptadores homologados.', { c: 'ba_lowvrisk', h: 'Desenchufado no siempre quiere decir descargado.' }),
    Q('Con la piel seca tocas los dos polos de una batería de coche de 12 V. ¿Qué pasa?', ['Casi nada: con tu resistencia pasa muy poca corriente; el peligro es un corto con algo metálico', 'Te electrocutas seguro', 'La batería explota', 'Pasan cientos de amperios por ti'], '12 / 100 000 ≈ 0,1 mA. El peligro de esa batería es el cortocircuito.', { c: 'ba_bodycur', h: 'Calcula I = V / R con unos 100 kΩ de piel seca.' }),
    I('<b>Resumen</b>\n· Daña la corriente que te atraviesa; peor si cruza el pecho.\n· Piel mojada o tensiones altas: mucha menos resistencia.\n· El diferencial corta si hay fugas. Baterías en corto y aparatos de red: peligro aunque «sean pocos voltios» o estén desenchufados.')
   ]),
   L('c6', 'Energía y consumo', 'bat', ['ba_kwh', 'ba_wh', 'ba_autonomy'], [
    Q('¿Qué gasta más: un LED de 10 W encendido 10 horas o un secador de 2000 W durante 3 minutos?', ['Lo mismo: 100 Wh cada uno', 'El LED', 'El secador, diez veces más', 'Ninguno'], '10 × 10 = 100 Wh; 2000 × 0,05 = 100 Wh. La energía depende de la potencia y del tiempo.', { predict: true, c: 'ba_kwh', h: 'Multiplica la potencia por el tiempo en horas en los dos casos.' }),
    I('<b>Energía = potencia × tiempo</b>. En casa se cuenta en <b>kWh</b>: 1000 W durante una hora. Es lo que cobra la factura.', { svg: S.eArea, more: '1 Wh = 1 W durante 3600 s = 3600 J. 1 kWh = 3,6 millones de julios.' }),
    { t: 'explore', title: 'Tu factura', text: 'Elige un aparato y cuántas horas al día lo usas.', viz: 'energyCost', params: { P: { label: 'Potencia', val: 60, list: [10, 60, 100, 1000, 2000], unit: 'W', dec: 0 }, h: { label: 'Horas al día', val: 5, list: [0.05, 0.5, 1, 2, 5, 8, 10, 24], unit: 'h', dec: 2 } },
      tasks: [
        { q: 't1', min: 1, max: 1, text: 'El secador de 2000 W, 3 minutos (0,05 h) al día', done: '100 Wh al día: mucho por segundo, pero poco rato.' },
        { q: 't2', min: 1, max: 1, text: 'Iguala esos 100 Wh con un LED de 10 W', done: '10 W × 10 h = 100 Wh.' },
        { q: 't3', min: 1, max: 1, text: '¿Y una estufa de 1000 W encendida todo el día?', done: '24 kWh al día, unos 108 € al mes: lo que pesa es potencia × horas.' }
      ] },
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Un secador de 2000 W funciona 3 minutos. ¿Cuánta energía gasta y cuánto cuesta a 0,15 €/kWh?', steps: ['Tiempo en horas: 3 min = 3 / 60 = <b>0,05 h</b>', 'Energía: 2000 W × 0,05 h = <b>100 Wh</b>', 'En kWh: 100 / 1000 = <b>0,1 kWh</b>', 'Coste: 0,1 × 0,15 = <b>0,015 €</b>'], result: '100 Wh, un céntimo y medio' },
    G('baEnergy'),
    Q('El kWh es una unidad de…', ['Energía', 'Potencia', 'Corriente', 'Tiempo'], 'Potencia × tiempo = energía: 1 kWh = 3,6 millones de julios.', { c: 'ba_wh', h: 'kW por horas: ¿qué da potencia por tiempo?' }),
    Nm('¿Cuántos julios son 1 Wh?', 3600, 'J', '1 W durante 3600 s: 3600 J.', { c: 'ba_wh', h: '1 W es 1 J cada segundo; ¿cuántos segundos tiene una hora?' }),
    Q('El mAh de las baterías mide…', ['Carga eléctrica', 'Energía', 'Potencia', 'Tensión'], 'Corriente × tiempo = carga: 1 mAh = 3,6 C. Para la energía hay que multiplicar por la tensión.', { c: 'ba_wh', h: 'mA por horas: corriente por tiempo.' }),
    { t: 'explore', title: 'Haz que dure', text: '¿Cuánto dura una batería? Los mAh son la carga y los mA lo que gasta el aparato: <b>horas ≈ mAh / mA</b>. Cambia los dos.', viz: 'battery', params: { mAh: { label: 'Capacidad', val: 1000, min: 200, max: 3000, step: 100, unit: 'mAh', dec: 0 }, mA: { label: 'Consumo', val: 100, min: 10, max: 500, step: 10, unit: 'mA', dec: 0 } },
      tasks: [
        { q: 'h', min: 20, max: 1000, text: 'Que dure más de 20 horas', done: 'Más capacidad o menos consumo.', hint: 'Baja el consumo o sube los mAh.' },
        { q: 'h', min: 0, max: 2, text: 'Ahora que se agote en menos de 2 horas', done: 'Mucho consumo: el depósito se vacía rápido.' }
      ] },
    G('baBattLife'),
    Q('Una batería de 2000 mAh y un consumo de 50 mA dan unas 40 h de cuentas. ¿Por qué en la práctica dura algo menos?', ['Porque la tensión cae al final, la capacidad baja con mucha corriente o con frío', 'Porque los mAh siempre mienten', 'Porque la batería se gasta al mirarla', 'Dura siempre más'], 'Los mAh son en condiciones ideales: estima con margen.', { c: 'ba_autonomy', h: 'Piensa en cómo afectan el frío y la resistencia interna.' }),
    G('baEnergy'),
    I('<b>Resumen</b>\n· Energía = potencia × tiempo: Wh y kWh (1 Wh = 3600 J).\n· Coste = kWh × precio.\n· Autonomía ≈ mAh / mA (en la práctica, algo menos).')
   ]),
   L('a8', 'Unidades y análisis dimensional', 'bin', ['ba_units'], [
    Q('Alguien escribe P = V / R. Sin probar números, ¿crees que se puede saber si está bien?', ['Sí, mirando las unidades', 'No: hay que medir', 'Solo con calculadora'], 'V / Ω da amperios, no vatios: la fórmula está mal. Las unidades son una comprobación gratis.', { predict: true, c: 'ba_units', h: 'Piensa qué da V / R según la ley de Ohm.' }),
    I('Las unidades no son un adorno: se pueden multiplicar, dividir y tachar como letras. Si una fórmula debe dar vatios, sus unidades tienen que acabar en vatios. Se llama <b>análisis dimensional</b>.', { svg: S.cancel }),
    I('Equivalencias que ya conoces:', { svg: S.units }),
    { t: 'explore', title: 'Combina unidades', text: 'Elige dos unidades y si las multiplicas o las divides.', viz: 'unitCancel', params: { x: { label: 'Primera unidad', val: 1, list: [1, 2, 3, 4, 5, 6, 7], dec: 0 }, op: { label: 'Operación (0 × · 1 ÷)', val: 0, list: [0, 1], dec: 0 }, y: { label: 'Segunda unidad', val: 1, list: [1, 2, 3, 4, 5, 6, 7], dec: 0 } },
      tasks: [
        { q: 'isA', min: 1, max: 1, text: 'Consigue amperios dividiendo', done: 'V ÷ Ω = A (ley de Ohm) o C ÷ s = A (carga por segundo).', hint: 'Prueba V ÷ Ω.' },
        { q: 'isW', min: 1, max: 1, text: 'Consigue vatios multiplicando', done: 'V × A = W: P = V · I.' },
        { q: 'isJ', min: 1, max: 1, text: 'Consigue julios', done: 'C × V = J (W = Q · V) o W × s = J.' }
      ] },
    { t: 'steps', title: 'Paso a paso', text: '¿Qué unidad da V / Ω?', steps: ['Ω = V / A', 'V / Ω = V / (V / A)', 'Dividir entre una fracción es multiplicar por la del revés: V · A / V', 'Las V se tachan: queda <b>A</b>'], result: 'Amperios: I = V / R' },
    Q('V / Ω da…', ['Amperios', 'Vatios', 'Culombios', 'Segundos'], 'Es la ley de Ohm: I = V / R.', { c: 'ba_units', h: 'Ω = V / A: sustituye y tacha.' }),
    Q('V × A da…', ['Vatios', 'Ohmios', 'Julios', 'Culombios'], 'P = V · I.', { c: 'ba_units', h: 'Piensa en P = V · I.' }),
    Q('Alguien escribe P = V / R. ¿Cómo sabes que está mal sin probar números?', ['V / R da amperios, no vatios', 'Porque falta un 2', 'Porque R no puede ir abajo', 'No se puede saber'], 'La correcta es V² / R: V · (V / Ω) = V · A = W.', { c: 'ba_units', h: '¿Qué unidad sale de V / Ω?' }),
    { t: 'match', q: 'Une cada combinación con su unidad.', pairs: [['V · A', 'W'], ['V / Ω', 'A'], ['C / s', 'A '], ['J / C', 'V'], ['A · s', 'C']], c: 'ba_units', h: 'Empieza por V / Ω (la ley de Ohm) y V · A (la potencia).' },
    I('Truco de taller: pasa todo a unidades base (V, A, Ω, s) <b>antes</b> de operar. Y un atajo: <b>kΩ × mA = V</b>, porque k y m se compensan.', { svg: S.kmA }),
    Q('¿Qué da kΩ × mA?', ['Voltios', 'Kilovoltios', 'Milivoltios', 'Vatios'], '1000 × 0,001 = 1: los prefijos se compensan.', { c: 'ba_units', h: 'k es × 1000 y m es ÷ 1000.' }),
    Q('Alguien escribe I = V × R. ¿Qué da la derecha?', ['V · Ω, que no son amperios: está mal', 'Amperios', 'Vatios', 'Julios'], 'I = V / R sí da amperios.', { c: 'ba_units', h: 'Sustituye Ω = V / A y mira si quedan amperios.' }),
    Q('¿Qué da W × s?', ['Julios', 'Vatios', 'Amperios', 'Wh'], 'W = J / s, así que W · s = J.', { c: 'ba_units', h: 'Un vatio es un julio cada segundo.' }),
    I('<b>Resumen</b>\n· V = J/C · A = C/s · Ω = V/A · W = J/s = V · A.\n· Tacha unidades como letras para comprobar una fórmula.\n· Opera en unidades base; kΩ × mA = V.')
   ])
  ] });
})();
