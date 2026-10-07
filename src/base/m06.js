/* Voltio · curso base, módulo 7: Condensadores y bobinas
   Lote 3. VIZ propias: symLive, capQ, capLife, capComb, expCurve, coilKick, vldi (rc y rlCurrent ya existen).
   Generadores m6_*. Los conceptos que solo usa este módulo se amplían aquí; los compartidos no se tocan. */
(() => {
  const { num, fI, fV, st, batt, hbar } = Widgets.H;
  const vz = (x, y, s = 1) => `<path d="M${x} ${y - 21 * s}l-6 ${3 * s}l12 ${6 * s}l-12 ${6 * s}l12 ${6 * s}l-12 ${6 * s}l12 ${6 * s}l-12 ${6 * s}l6 ${3 * s}" ${st}/>`;
  const coilH = (x, y) => `<path d="M${x - 30} ${y}h8a6 6 0 0 1 11 0a6 6 0 0 1 11 0a6 6 0 0 1 11 0a6 6 0 0 1 11 0h8" ${st}/>`;
  const fC = uF => uF >= 1000 ? num(uF / 1000, 2) + ' mF' : uF >= 1 ? num(uF, 1) + ' µF' : num(uF * 1000, 0) + ' nF';
  const fQ = uC => uC >= 1000 ? num(uC / 1000, 3) + ' mC' : num(uC, 1) + ' µC';
  const fE = J => J >= 1 ? num(J, 2) + ' J' : J >= 1e-3 ? num(J * 1000, 1) + ' mJ' : num(J * 1e6, 0) + ' µJ';
  const fT = s => s >= 1 ? num(s, 2) + ' s' : s >= 1e-3 ? num(s * 1000, 2) + ' ms' : num(s * 1e6, 1) + ' µs';
  const logBar = (x, y, w, v, lo, hi, col, lab) => hbar(x, y, w, (Math.log10(Math.max(v, 10 ** lo)) - lo) / (hi - lo), col, lab);
  const CL = [1, 10, 22, 47, 100, 220, 470, 1000];
  const TYP = ['1', '2'];

  /* ================= VISUALIZACIONES ================= */
  Object.assign(Widgets.VIZ, {
    // LDR, potenciómetro y NTC: sus símbolos «en vivo»
    symLive: {
      calc: p => ({ Rldr: 10 ** (5 - 3 * p.luz / 100), pos: p.cur, Rntc: 10000 * Math.exp(3950 * (1 / (p.temp + 273.15) - 1 / 298.15)) }),
      svg: (p, o) => {
        const fR = Widgets.H.fR, y = 95, cy = y + 21 - 42 * p.cur / 100, hot = p.temp / 80;
        return `<svg viewBox="0 0 300 190" class="viz">
          <circle cx="22" cy="34" r="12" fill="var(--led)" opacity="${(0.15 + 0.85 * p.luz / 100).toFixed(2)}"/><path d="M30 46l14 14m-5 0h5v-5M38 40l14 14m-5 0h5v-5" ${st} stroke-width="1.6" opacity="${(0.2 + 0.8 * p.luz / 100).toFixed(2)}"/>
          <path d="M60 40V74M60 116V150" ${st}/>${vz(60, y)}<text x="60" y="168" text-anchor="middle" class="vizsm">LDR</text><text x="60" y="183" text-anchor="middle" class="vizlab">${fR(Math.round(o.Rldr))}</text>
          <path d="M150 40V74M150 116V150" ${st}/>${vz(150, y)}<path d="M182 ${cy.toFixed(1)}H158M166 ${(cy - 6).toFixed(1)}l-8 6l8 6" stroke="var(--ice)" stroke-width="2.4" fill="none"/>
          <text x="150" y="168" text-anchor="middle" class="vizsm">potenciómetro</text><text x="150" y="183" text-anchor="middle" class="vizlab">cursor al ${num(p.cur, 0)} %</text>
          <path d="M245 40V74M245 116V150" ${st}/>${vz(245, y)}<path d="M227 122l36 -54M221 122h6" ${st} stroke-width="1.8"/><text x="262" y="64" class="vizsm">−t°</text>
          <rect x="280" y="${(150 - 100 * hot).toFixed(1)}" width="8" height="${(100 * hot).toFixed(1)}" rx="3" fill="var(--err)" opacity=".75"/><rect x="280" y="50" width="8" height="100" rx="3" fill="none" stroke="var(--muted)"/>
          <text x="245" y="168" text-anchor="middle" class="vizsm">NTC a ${num(p.temp, 0)} °C</text><text x="245" y="183" text-anchor="middle" class="vizlab">${fR(Math.round(o.Rntc))}</text></svg>`;
      }
    },
    // Placas de un condensador que se llenan de carga: Q = C · V
    capQ: {
      calc: p => { const uC = p.C * p.V; return { uC, Qm: uC / 1000 }; },
      svg: (p, o) => {
        const h = 40 + 25 * Math.log10(p.C), y0 = 95 - h / 2, n = Math.min(24, Math.round(Math.sqrt(o.uC) * 0.5));
        const rows = Math.max(2, Math.floor((h - 6) / 13)); let ch = ''; for (let i = 0; i < Math.min(n, rows * 3); i++) { const yy = y0 + 9 + (i % rows) * (h - 14) / (rows - 1), dx = Math.floor(i / rows) * 9; ch += `<text x="${108 - dx}" y="${(yy + 4).toFixed(1)}" text-anchor="middle" class="vizsm" style="fill:var(--err)">+</text><text x="${192 + dx}" y="${(yy + 4).toFixed(1)}" text-anchor="middle" class="vizsm" style="fill:var(--ice)">−</text>`; }
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M55 88V25H117V${y0.toFixed(1)}M183 ${y0.toFixed(1)}V25H260V165H55V132" ${st}/>
          <rect x="114" y="${y0.toFixed(1)}" width="7" height="${h.toFixed(1)}" fill="currentColor"/><rect x="179" y="${y0.toFixed(1)}" width="7" height="${h.toFixed(1)}" fill="currentColor"/>
          <rect x="123" y="${y0.toFixed(1)}" width="54" height="${h.toFixed(1)}" fill="var(--ice)" opacity=".12"/><text x="150" y="${(y0 - 6).toFixed(1)}" text-anchor="middle" class="vizsm">aislante</text>
          ${ch}${batt(55, 110, p.V)}<text x="270" y="100" class="vizsm">${fC(p.C)}</text>
          <text x="150" y="184" text-anchor="middle" class="vizlab">Q = C · V = ${fQ(o.uC)}</text></svg>`;
      }
    },
    // Vida de un electrolítico según la temperatura (×2 cada 10 °C menos)
    capLife: {
      calc: p => { const h = p.Lh * 2 ** ((105 - p.T) / 10); return { h, years: h / 8760 }; },
      svg: (p, o) => {
        const hot = (p.T - 20) / 85;
        return `<svg viewBox="0 0 300 180" class="viz"><rect x="30" y="20" width="16" height="110" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="38" cy="140" r="13" fill="var(--err)"/>
          <rect x="34" y="${(126 - 104 * hot).toFixed(1)}" width="8" height="${(104 * hot + 8).toFixed(1)}" fill="var(--err)"/><text x="56" y="${(130 - 104 * hot).toFixed(1)}" class="vizlab">${num(p.T, 0)} °C</text>
          <rect x="200" y="40" width="50" height="80" rx="8" fill="#1F4E9C"/><rect x="232" y="40" width="10" height="80" fill="#D7DEE8"/><text x="225" y="138" text-anchor="middle" class="vizsm">${num(p.Lh, 0)} h a 105 °C</text>
          ${logBar(20, 172, 260, o.h, 3, 6, o.years >= 5 ? 'var(--ok)' : 'var(--led)', `Vida: ${num(o.h, 0)} h ≈ ${o.years >= 1 ? num(o.years, 1) + ' años' : num(o.h / 730, 1) + ' meses'}`)}</svg>`;
      }
    },
    // Dos condensadores en paralelo (m = 1) o en serie (m = 2), con su energía
    capComb: {
      calc: p => { const Ct = p.m === 1 ? p.C1 + p.C2 : p.C1 * p.C2 / (p.C1 + p.C2), E = 0.5 * Ct * 1e-6 * p.V * p.V; return { Ct, E, mJ: E * 1000 }; },
      svg: (p, o) => {
        const cap = (x, y, lab, v) => v ? `<path d="M${x - 14} ${y - 4}h28M${x - 14} ${y + 4}h28" stroke="currentColor" stroke-width="3"/><text x="${x + 20}" y="${y + 4}" class="vizsm">${lab}</text>` : `<path d="M${x - 4} ${y - 14}v28M${x + 4} ${y - 14}v28" stroke="currentColor" stroke-width="3"/><text x="${x}" y="${y - 20}" text-anchor="middle" class="vizsm">${lab}</text>`;
        const body = p.m === 1
          ? `<path d="M55 88V30H230V91M150 30V91M150 99V150M230 99V150M55 132V150H230" ${st}/>${cap(150, 95, fC(p.C1), 1)}${cap(230, 95, fC(p.C2), 1)}<text x="150" y="20" text-anchor="middle" class="vizsm">en paralelo: misma tensión, las placas se suman</text>`
          : `<path d="M55 88V40H126M134 40H196M204 40H250V150H55V132" ${st}/>${cap(130, 40, fC(p.C1), 0)}${cap(200, 40, fC(p.C2), 0)}<text x="150" y="80" text-anchor="middle" class="vizsm">en serie: la tensión se reparte</text>`;
        return `<svg viewBox="0 0 300 190" class="viz">${body}${batt(55, 110, p.V)}
          <text x="150" y="172" text-anchor="middle" class="vizlab">Total ${fC(o.Ct)} · guarda ${fE(o.E)}</text><text x="150" y="186" text-anchor="middle" class="vizsm">E = ½ · C · V²</text></svg>`;
      }
    },
    // e^(−x): carga y descarga en función de t/τ
    expCurve: {
      calc: p => ({ up: (1 - Math.exp(-p.x)) * 100, down: Math.exp(-p.x) * 100 }),
      svg: (p, o) => {
        const X = x => 40 + 48 * x, Y = f => 145 - 115 * f; const u = [], d = [];
        for (let i = 0; i <= 50; i++) { const x = i / 10; u.push(`${X(x).toFixed(1)},${Y(1 - Math.exp(-x)).toFixed(1)}`); d.push(`${X(x).toFixed(1)},${Y(Math.exp(-x)).toFixed(1)}`); }
        return `<svg viewBox="0 0 300 185" class="viz"><path d="M40 25V145H285" ${st} stroke-width="1.5"/>
          ${[1, 2, 3, 4, 5].map(k => `<path d="M${X(k)} 145v4" stroke="currentColor"/><text x="${X(k)}" y="160" text-anchor="middle" class="vizsm">${k}τ</text>`).join('')}
          <polyline points="${u.join(' ')}" fill="none" stroke="var(--led)" stroke-width="2.5"/><polyline points="${d.join(' ')}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>
          <path d="M${X(p.x).toFixed(1)} 25V145" stroke="var(--muted)" stroke-dasharray="4 4"/>
          <circle cx="${X(p.x).toFixed(1)}" cy="${Y(o.up / 100).toFixed(1)}" r="5" fill="var(--led)"/><circle cx="${X(p.x).toFixed(1)}" cy="${Y(o.down / 100).toFixed(1)}" r="5" fill="var(--ice)"/>
          <text x="44" y="18" class="vizlab">t = ${num(p.x, 1)}τ · carga ${num(o.up, 1)} % · descarga ${num(o.down, 1)} %</text>
          <text x="150" y="178" text-anchor="middle" class="vizsm">ámbar: 1 − e^(−t/τ) · azul: e^(−t/τ)</text></svg>`;
      }
    },
    // Pico de tensión al cortar la corriente de una bobina de 100 mH
    coilKick: {
      calc: p => { const V = 0.1 * p.I / (p.tc / 1000); return { Vpk: V, spark: V >= 300 ? 1 : 0 }; },
      svg: (p, o) => {
        const sp = o.spark ? `<path d="M118 34l6 -8l-2 7l7 -5l-4 9l6 -3" stroke="var(--led)" stroke-width="2.5" fill="none" class="a-blink"/><text x="125" y="20" text-anchor="middle" class="vizlab" style="fill:var(--led)">¡chispa!</text>` : '';
        return `<svg viewBox="0 0 300 190" class="viz"><path d="M55 88V45H105M140 45H180M240 45H260V140H55V132" ${st}/>
          <circle cx="105" cy="45" r="3" fill="currentColor"/><circle cx="140" cy="45" r="3" fill="currentColor"/><path d="M105 45l30 -16" ${st}/>${sp}
          ${coilH(210, 45)}<text x="210" y="70" text-anchor="middle" class="vizsm">bobina 100 mH</text>${batt(55, 110, 5)}
          <text x="150" y="100" text-anchor="middle" class="vizsm">corriente antes de abrir: ${num(p.I, 1)} A</text>
          <text x="150" y="116" text-anchor="middle" class="vizsm">la corriente se corta en ${fT(p.tc / 1000)}</text>
          ${logBar(20, 175, 260, o.Vpk, 0, 4, o.spark ? 'var(--err)' : o.Vpk <= 10 ? 'var(--ok)' : 'var(--led)', `Pico de tensión en la bobina: ${o.Vpk >= 1000 ? num(o.Vpk / 1000, 1) + ' kV' : num(o.Vpk, 0) + ' V'}`)}</svg>`;
      }
    },
    // V = L · ΔI / Δt con una rampa de corriente
    vldi: {
      calc: p => ({ V: p.L / 1000 * p.dI / (p.dt / 1000) }),
      svg: (p, o) => {
        const w = 40 + 160 * (Math.log10(p.dt) + 2) / 4;
        return `<svg viewBox="0 0 300 185" class="viz"><path d="M40 20V120H285" ${st} stroke-width="1.5"/>
          <path d="M40 115H60L${(60 + w).toFixed(1)} ${(115 - 80 * p.dI / 2).toFixed(1)}H285" fill="none" stroke="var(--led)" stroke-width="3"/>
          <path d="M60 128H${(60 + w).toFixed(1)}" stroke="var(--muted)" stroke-width="1.5"/><text x="${(60 + w / 2).toFixed(1)}" y="140" text-anchor="middle" class="vizsm">Δt = ${num(p.dt, 2)} ms</text>
          <text x="${(66 + w).toFixed(1)}" y="${(110 - 80 * p.dI / 2).toFixed(1)}" class="vizsm">ΔI = ${num(p.dI, 1)} A</text><text x="44" y="16" class="vizsm">corriente en la bobina de ${num(p.L, 0)} mH</text>
          ${logBar(20, 176, 260, o.V, -1, 4, 'var(--ice)', `Tensión en la bobina mientras cambia: ${o.V >= 1000 ? num(o.V / 1000, 2) + ' kV' : num(o.V, 2) + ' V'}`)}</svg>`;
      }
    }
  });

  /* ================= GENERADORES (con pista) ================= */
  const { pick, fmt, fR: gR, MC, N } = Gen.helpers;
  const capU = c => c >= 0.1 ? fmt(c, 3) + ' F' : c >= 1e-7 ? fmt(c * 1e6, 3) + ' µF' : c >= 1e-10 ? fmt(c * 1e9, 3) + ' nF' : fmt(c * 1e12, 3) + ' pF';
  const eng = (x, u) => { const e = Math.max(-9, Math.min(3, Math.floor(Math.log10(Math.abs(x)) / 3) * 3)); return fmt(Number((x / 10 ** e).toPrecision(3)), 3) + ' ' + { '-9': 'n', '-6': 'µ', '-3': 'm', '0': '', '3': 'k' }[e] + u; };
  Gen.add('m6_capUnits', () => {
    const [q, a, u, e] = pick([['0,1 µF', 100, 'nF', '0,1 × 1000'], ['4700 pF', 4.7, 'nF', '4700 / 1000'], ['22 nF', 0.022, 'µF', '22 / 1000'], ['470 nF', 0.47, 'µF', '470 / 1000'], ['1 µF', 1000, 'nF', '1 × 1000'], ['10 nF', 10000, 'pF', '10 × 1000'], ['0,047 µF', 47, 'nF', '0,047 × 1000'], ['330 pF', 0.33, 'nF', '330 / 1000'], ['2,2 µF', 2200, 'nF', '2,2 × 1000']]);
    return { ...N(`Pasa ${q} a ${u}.`, a, u, `Entre pF, nF y µF hay saltos de ×1000: ${e} = ${fmt(a, 3)} ${u}.`, a * 0.01), h: 'pF → nF → µF: cada paso hacia la derecha divide entre 1000; hacia la izquierda, multiplica.' };
  }, 'ba_capunits');
  Gen.add('m6_capCode', () => {
    const c = pick([['104', '100 nF'], ['103', '10 nF'], ['105', '1 µF'], ['473', '47 nF'], ['222', '2,2 nF'], ['101', '100 pF'], ['224', '220 nF'], ['472', '4,7 nF'], ['331', '330 pF']]);
    return MC(`Un condensador cerámico pone «${c[0]}». ¿Cuánto vale?`, c[1], ['100 nF', '10 nF', '1 µF', '47 nF', '2,2 nF', '100 pF', '220 nF', '4,7 nF', '330 pF', '10 µF'].filter(x => x !== c[1]).sort(() => Math.random() - 0.5), `Dos cifras y luego cuántos ceros, en picofaradios: «${c[0]}» = ${c[0].slice(0, 2)} seguido de ${c[0][2]} ceros pF = ${c[1]}.`, { h: 'Las dos primeras cifras son el valor y la tercera, cuántos ceros añadir. El resultado sale en pF.' });
  }, 'ba_capmark');
  Gen.add('m6_capType', () => {
    const all = ['Cerámico C0G', 'Cerámico X7R', 'Electrolítico de aluminio', 'Película (poliéster o polipropileno)', 'Supercondensador'];
    const [q, r, e] = pick([['22 pF muy estables para un oscilador de cristal', 'Cerámico C0G', 'C0G (NP0) apenas cambia con la temperatura ni con la tensión.'], ['100 nF pequeños y baratos para filtrar ruido rápido junto a un circuito', 'Cerámico X7R', 'Un cerámico X7R pequeño es lo habitual para eso.'], ['2200 µF para guardar mucha energía barata en una fuente', 'Electrolítico de aluminio', 'Mucha capacidad por poco dinero, con polaridad.'], ['1 µF muy preciso en el filtro de un equipo de audio', 'Película (poliéster o polipropileno)', 'Los de película son estables y con pocas pérdidas.'], ['Varios faradios para mantener un reloj durante un corte de luz', 'Supercondensador', 'Faradios de capacidad a pocos voltios.']]);
    return MC(`¿Qué tipo de condensador eliges para esto: ${q}?`, r, all.filter(x => x !== r), e, { h: 'Piensa qué importa aquí: estabilidad, capacidad enorme, precisión o tamaño.' });
  }, 'ba_captypes');
  Gen.add('m6_capComb', () => {
    const a = pick([10, 22, 47, 100, 220]), b = pick([10, 22, 47, 100, 220]);
    if (Math.random() < 0.5) return MC(`${a} µF y ${b} µF en paralelo. ¿Capacidad total?`, `${a + b} µF`, [`${fmt(a * b / (a + b), 1)} µF`, `${Math.max(a, b)} µF`, `${a * b} µF`], 'En paralelo las placas se suman: C = C1 + C2.', { h: 'En paralelo es como tener más superficie de placa.' });
    const s = a * b / (a + b);
    return { ...N(`${a} µF y ${b} µF en serie. ¿Capacidad total, en µF?`, s, 'µF', `En serie se combinan como las resistencias en paralelo: ${a} × ${b} / (${a} + ${b}) = ${fmt(s, 2)} µF.`, Math.max(0.05, s * 0.02)), h: 'En serie, la fórmula es la del paralelo de resistencias: producto entre suma.' };
  }, 'ba_capcomb');
  Gen.add('m6_capJ', () => {
    const [C, V] = pick([[100e-6, 25], [470e-6, 16], [1000e-6, 35], [2200e-6, 50], [10e-6, 400], [1, 2.7], [10, 2.7], [100e-6, 400], [47e-6, 100]]); const E = 0.5 * C * V * V;
    return MC(`¿Cuánta energía guarda un condensador de ${capU(C)} cargado a ${fmt(V)} V?`, eng(E, 'J'), [eng(C * V * V, 'J'), eng(0.5 * C * V, 'J'), eng(E * 1000, 'J'), eng(E / 1000, 'J')], `E = ½ · C · V² = ½ × ${capU(C)} × (${fmt(V)} V)² = ${eng(E, 'J')}.`, { h: 'Pasa la capacidad a faradios, eleva la tensión al cuadrado y no olvides el ½.' });
  }, 'ba_capj');
  Gen.add('m6_tau', () => {
    const R = pick([1000, 2200, 4700, 10000, 47000, 100000]), C = pick([1, 10, 47, 100, 220, 470]); const t = R * C * 1e-6, ms = t < 1;
    return { ...N(`R = ${gR(R)} y C = ${C} µF. ¿Cuánto vale τ, en ${ms ? 'ms' : 's'}?`, ms ? t * 1000 : t, ms ? 'ms' : 's', `τ = R · C = ${R} Ω × ${C}·10⁻⁶ F = ${fmt(t, 4)} s${ms ? ` = ${fmt(t * 1000, 2)} ms` : ''}.`, Math.max(0.002, (ms ? t * 1000 : t) * 0.02)), h: 'Multiplica ohmios por faradios y salen segundos. Atajo: kΩ × µF = ms.' };
  }, 'rc');
  Gen.add('m6_rcPct', () => {
    const T = { 1: ['63 %', '37 %'], 2: ['86 %', '14 %'], 3: ['95 %', '5 %'], 5: ['99 %', '1 %'] }, n = pick([1, 2, 3, 5]), dn = Math.random() < 0.4;
    const r = T[n][dn ? 1 : 0], all = ['63 %', '86 %', '95 %', '99 %', '37 %', '14 %', '50 %'];
    return MC(dn ? `Un condensador cargado se descarga por una resistencia. ¿Qué parte de su tensión le queda tras ${n}τ?` : `Un condensador se carga a través de una resistencia. ¿Qué porcentaje tiene tras ${n}τ?`, r, all.filter(x => x !== r).sort(() => Math.random() - 0.5), dn ? 'Descargando quedan el 37 %, 14 %, 5 % y 1 % tras 1, 2, 3 y 5τ.' : 'Cargando: 63 %, 86 %, 95 % y 99 % tras 1, 2, 3 y 5τ.', { h: 'Recuerda la tabla: cada τ recorre el 63 % de lo que le falta.' });
  }, 'ba_rcpct');
  Gen.add('m6_exp', () => {
    const v = { 1: '0,37', 2: '0,14', 3: '0,05', 5: '0,007' }, n = pick([1, 2, 3, 5]);
    return MC(`¿Cuánto vale aproximadamente e^(−${n})?`, v[n], ['0,37', '0,14', '0,05', '0,007', '0,63', '0,5'].filter(x => x !== v[n]), `e ≈ 2,718; e^(−${n}) = 1 / 2,718^${n} ≈ ${v[n]}. Es la fracción que queda en una descarga tras ${n}τ.`, { h: 'e^(−1) ≈ 0,37 y cada τ más vuelve a multiplicar por 0,37.' });
  }, 'ba_exp');
  Gen.add('m6_rcForm', () => {
    const V = pick([5, 9, 10, 12]), tau = pick([0.1, 0.5, 1, 2]), k = pick([0.5, 1, 1.5, 2, 3]), t = tau * k, up = Math.random() < 0.5;
    const v = up ? V * (1 - Math.exp(-k)) : V * Math.exp(-k);
    return { ...N(up ? `Un condensador se carga hacia ${V} V con τ = ${fmt(tau)} s. ¿Qué tensión tiene tras ${fmt(t)} s?` : `Un condensador cargado a ${V} V se descarga con τ = ${fmt(tau)} s. ¿Qué tensión le queda tras ${fmt(t)} s?`, v, 'V', `t/τ = ${fmt(k)}; e^(−${fmt(k)}) ≈ ${fmt(Math.exp(-k), 3)}. ${up ? `Vc = ${V} × (1 − ${fmt(Math.exp(-k), 3)})` : `Vc = ${V} × ${fmt(Math.exp(-k), 3)}`} = ${fmt(v, 2)} V.`, Math.max(0.05, v * 0.02)), h: up ? 'Carga: Vc = V · (1 − e^(−t/τ)). Calcula primero t/τ.' : 'Descarga: Vc = V · e^(−t/τ). Calcula primero t/τ.' };
  }, 'ba_rcform');
  Gen.add('m6_tauRL', () => {
    const L = pick([1e-3, 10e-3, 100e-3, 1]), R = pick([10, 47, 100, 1000]); const tau = L / R, us = tau < 1e-3, val = us ? tau * 1e6 : tau * 1000;
    return { ...N(`Bobina de ${eng(L, 'H')} con ${gR(R)} en serie. ¿Constante de tiempo τ, en ${us ? 'µs' : 'ms'}?`, val, us ? 'µs' : 'ms', `τ = L / R = ${eng(tau, 's')}. En RC se multiplica; en RL se divide.`, val * 0.02), h: 'τ = L / R, con L en henrios y R en ohmios: salen segundos.' };
  }, 'ba_taurl');
  Gen.add('m6_coilJ', () => {
    const L = pick([10e-6, 100e-6, 1e-3, 10e-3, 100e-3]), I = pick([0.1, 0.5, 1, 2, 3]); const E = 0.5 * L * I * I;
    return MC(`Por una bobina de ${eng(L, 'H')} pasan ${fmt(I)} A. ¿Energía guardada en su campo magnético?`, eng(E, 'J'), [eng(L * I * I, 'J'), eng(0.5 * L * I, 'J'), eng(E * 1e6, 'J'), eng(E / 1000, 'J')], `E = ½ · L · I² = ${eng(E, 'J')}. Es la energía que la bobina suelta de golpe si cortas la corriente.`, { h: 'Como en el condensador, pero con L e I: ½ · L · I², con L en henrios.' });
  }, 'ba_coilj');

  /* ================= SVG DE LAS TARJETAS ================= */
  const S = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" class="viz">${inner}</svg>`;
  const t = (x, y, s, cls = 'vizsm', a = 'middle', more = '') => `<text x="${x}" y="${y}" text-anchor="${a}" class="${cls}" ${more}>${s}</text>`;
  const symCap = (x, y) => `<path d="M${x - 30} ${y}h26M${x + 4} ${y}h26M${x - 4} ${y - 12}v24M${x + 4} ${y - 12}v24" ${st}/>`;
  const symEcap = (x, y) => `<path d="M${x - 30} ${y}h26M${x + 4} ${y}h26M${x - 4} ${y - 12}v24M${x + 6} ${y - 12}q-4 12 0 24" ${st}/>${t(x - 12, y - 12, '+', 'vizlab')}`;
  const symRes = (x, y) => `<path d="M${x - 30} ${y}h9l3 -6l6 12l6 -12l6 12l6 -12l6 12l3 -6h9" ${st}/>`;
  const symNtc = (x, y) => symRes(x, y) + `<path d="M${x - 16} ${y + 14}l32 -28M${x - 22} ${y + 14}h6" ${st} stroke-width="1.6"/>${t(x + 22, y - 12, '−t°', 'vizsm', 'start')}`;
  const symPot = (x, y) => symRes(x, y) + `<path d="M${x} ${y + 22}v-12M${x - 4} ${y + 15}l4 -6l4 6" ${st}/>`;
  const symLdr = (x, y) => symRes(x, y) + `<path d="M${x - 14} ${y - 26}l8 8m-4 0h4v-4M${x - 4} ${y - 26}l8 8m-4 0h4v-4" ${st} stroke-width="1.6"/>`;
  const symFuse = (x, y) => `<path d="M${x - 30} ${y}h60" ${st}/><rect x="${x - 14}" y="${y - 6}" width="28" height="12" ${st}/>`;
  const symMotor = (x, y) => `<path d="M${x - 30} ${y}h18M${x + 12} ${y}h18" ${st}/><circle cx="${x}" cy="${y}" r="12" ${st}/>${t(x, y + 5, 'M', 'vizlab')}`;
  const symRelay = (x, y) => coilH(x - 40, y + 18) + `<path d="M${x + 10} ${y + 18}h12M${x + 46} ${y + 18}h12M${x + 22} ${y + 18}l22 -12" ${st}/><path d="M${x - 40} ${y + 10}V${y - 4}H${x + 33}V${y + 10}" stroke="currentColor" stroke-dasharray="3 3" fill="none"/>`;
  const gallery1 = S(300, 170, `${symCap(70, 50)}${t(70, 80, 'condensador')}${symEcap(220, 50)}${t(220, 80, 'electrolítico')}${symPot(70, 125)}${t(70, 165, 'potenciómetro')}${symLdr(220, 125)}${t(220, 165, 'LDR')}`);
  const gallery2 = S(300, 175, `${symNtc(65, 45)}${t(65, 80, 'NTC')}${symFuse(225, 45)}${t(225, 80, 'fusible')}${coilH(65, 125)}${t(65, 150, 'bobina')}${symMotor(225, 125)}${t(225, 160, 'motor')}`);
  const relaySVG = S(300, 160, `${symRelay(110, 50)}${t(150, 110, 'relé: la bobina mueve el interruptor', 'vizlab')}${t(150, 130, 'la línea discontinua indica esa unión mecánica')}<circle cx="70" cy="68" r="4" fill="var(--led)" class="a-pulse"/>`);
  const platesSVG = S(300, 150, `<path d="M40 75H120M180 75H260" ${st}/><rect x="117" y="25" width="8" height="100" fill="currentColor"/><rect x="175" y="25" width="8" height="100" fill="currentColor"/><rect x="127" y="25" width="46" height="100" fill="var(--ice)" opacity=".15"/>${[35, 55, 75, 95, 115].map((y, i) => `<text x="108" y="${y + 4}" text-anchor="middle" class="vizlab a-fade a-d${i % 4 + 1}" style="fill:var(--err)">+</text><text x="192" y="${y + 4}" text-anchor="middle" class="vizlab a-fade a-d${i % 4 + 1}" style="fill:var(--ice)">−</text>`).join('')}${t(150, 18, 'aislante (dieléctrico)')}${t(150, 145, 'las cargas se acumulan, pero no cruzan')}`);
  const qcvSVG = S(300, 120, `${t(150, 50, 'Q = C · V', 'vizbig', 'middle', 'style="font-size:26px"')}${t(60, 90, 'carga (C)')}${t(150, 90, 'capacidad (F)')}${t(240, 90, 'tensión (V)')}${t(150, 112, '1 F guarda 1 culombio por cada voltio')}`);
  const ladderSVG = S(300, 110, `${['pF', 'nF', 'µF', 'F'].map((u, i) => `<rect x="${12 + i * 74}" y="30" width="54" height="34" rx="8" fill="none" stroke="currentColor" stroke-width="2"/>${t(39 + i * 74, 53, u, 'vizlab')}`).join('')}${[0, 1].map(i => `<path d="M${68 + i * 74} 47h16" stroke="var(--led)" stroke-width="2"/>${t(76 + i * 74, 24, '×1000')}`).join('')}<path d="M216 47h16" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 3"/>${t(224, 24, '×10⁶')}${t(150, 96, '1 µF = 1000 nF = 1 000 000 pF')}`);
  const codeSVG = S(300, 140, `<ellipse cx="80" cy="60" rx="45" ry="40" fill="#D9A441"/>${t(80, 68, '104', 'vizbig', 'middle', 'style="font-size:22px;fill:#3a2a10"')}<path d="M65 98v35M95 98v35" stroke="#9AA3B2" stroke-width="4"/>${t(210, 40, '10 → las dos cifras', 'vizsm')}${t(210, 62, '4 → cuatro ceros', 'vizsm')}${t(210, 90, '10 0000 pF', 'vizlab')}${t(210, 112, '= 100 nF', 'vizlab')}`);
  const dcSVG = S(300, 150, `<path d="M40 20V120H285" ${st} stroke-width="1.5"/><path d="M40 28C60 80 90 110 140 117S240 120 285 120" fill="none" stroke="var(--led)" stroke-width="3" class="a-draw" style="--len:300"/>${t(48, 22, 'corriente', 'vizsm', 'start')}${t(280, 136, 'tiempo', 'vizsm', 'end')}${t(90, 60, 'se carga', 'vizsm', 'start')}${t(220, 108, 'cargado: ya no pasa nada', 'vizsm')}`);
  const canSVG = S(300, 150, `<rect x="40" y="20" width="80" height="110" rx="12" fill="#1F4E9C"/><rect x="96" y="20" width="18" height="110" fill="#D7DEE8"/>${t(105, 60, '−', 'vizlab', 'middle', 'style="fill:#1F4E9C"')}${t(105, 95, '−', 'vizlab', 'middle', 'style="fill:#1F4E9C"')}${t(68, 65, '470 µF', 'vizsm', 'middle', 'style="fill:#fff"')}${t(68, 82, '16 V', 'vizlab', 'middle', 'style="fill:#fff"')}${t(210, 50, 'capacidad', 'vizsm')}${t(210, 66, '470 µF', 'vizlab')}${t(210, 96, 'tensión MÁXIMA', 'vizsm')}${t(210, 112, '16 V', 'vizlab')}<path d="M72 130v15M100 130v10" stroke="#9AA3B2" stroke-width="4"/>`);
  const typesSVG = S(300, 140, `<ellipse cx="40" cy="50" rx="22" ry="20" fill="#D9A441"/>${t(40, 95, 'cerámico')}<rect x="85" y="25" width="36" height="55" rx="7" fill="#1F4E9C"/><rect x="111" y="25" width="7" height="55" fill="#D7DEE8"/>${t(103, 95, 'electrolítico')}<path d="M165 30q18 0 18 22q0 22 -18 26q-18 -4 -18 -26q0 -22 18 -22z" fill="#C79A1E"/>${t(165, 95, 'tántalo')}<rect x="210" y="30" width="44" height="40" rx="4" fill="#C8463E"/>${t(232, 95, 'película')}${t(150, 125, 'mismo principio, distinto aislante')}`);
  const biasSVG = S(300, 160, `<path d="M40 20V125H285" ${st} stroke-width="1.5"/><path d="M40 30H285" stroke="var(--ok)" stroke-width="3"/><path d="M40 30C120 34 200 60 285 85" stroke="var(--led)" stroke-width="3" fill="none"/><path d="M40 30C90 50 160 100 285 118" stroke="var(--err)" stroke-width="3" fill="none"/>${t(280, 24, 'C0G: no cambia', 'vizsm', 'end')}${t(280, 78, 'X7R', 'vizsm', 'end')}${t(280, 112, 'Y5V', 'vizsm', 'end')}${t(30, 34, '100 %', 'vizsm', 'end')}${t(160, 142, 'tensión continua aplicada →')}${t(160, 156, '(curvas orientativas: mira la hoja de datos)')}`);
  const parSVG = S(300, 140, `<path d="M40 30H260M40 110H260M110 30V62M110 78V110M190 30V62M190 78V110" ${st}/><path d="M92 62h36M92 78h36M172 62h36M172 78h36" stroke="currentColor" stroke-width="3"/><rect x="92" y="60" width="116" height="20" rx="4" fill="var(--led)" opacity=".18" class="a-pulse"/>${t(150, 132, 'en paralelo: como una placa más grande → se suman')}`);
  const serSVG = S(300, 120, `<path d="M20 50H96M104 50H196M204 50H280" ${st}/><path d="M96 30v40M104 30v40M196 30v40M204 30v40" stroke="currentColor" stroke-width="3"/>${t(150, 92, 'en serie: como placas más separadas → baja')}${t(150, 110, '1/C = 1/C1 + 1/C2')}`);
  const energySVG = S(300, 130, `${t(20, 28, '5 V', 'vizlab', 'start')}<rect x="60" y="16" width="40" height="16" rx="4" fill="var(--led)"/>${t(20, 60, '10 V', 'vizlab', 'start')}<rect x="60" y="48" width="160" height="16" rx="4" fill="var(--led)"/>${t(228, 60, '×4', 'vizlab', 'start')}${t(150, 96, 'E = ½ · C · V²', 'vizbig')}${t(150, 118, 'el doble de tensión guarda cuatro veces más energía')}`);
  const dangerSVG = S(300, 130, `<path d="M150 15L215 115H85Z" fill="none" stroke="var(--err)" stroke-width="4"/>${t(150, 100, '!', 'vizbig', 'middle', 'style="font-size:40px;fill:var(--err)"')}${t(40, 40, '470 µF', 'vizlab', 'middle')}${t(40, 58, '400 V', 'vizlab', 'middle')}${t(248, 40, '≈ 38 J', 'vizlab', 'middle')}${t(248, 58, 'aun desenchufado', 'vizsm', 'middle')}`);
  const whySVG = S(300, 140, `<path d="M30 110H280" stroke="currentColor"/><rect x="40" y="40" width="40" height="70" fill="none" stroke="currentColor" stroke-width="2"/><rect x="40" y="95" width="40" height="15" fill="var(--ice)" opacity=".6"/><rect x="130" y="40" width="40" height="70" fill="none" stroke="currentColor" stroke-width="2"/><rect x="130" y="62" width="40" height="48" fill="var(--ice)" opacity=".6"/><rect x="220" y="40" width="40" height="70" fill="none" stroke="currentColor" stroke-width="2"/><rect x="220" y="44" width="40" height="66" fill="var(--ice)" opacity=".6"/>${t(60, 30, 'vacío: entra rápido')}${t(150, 30, 'a medias')}${t(240, 30, 'casi lleno: muy lento')}${t(150, 130, 'cuanta menos diferencia queda, menos corriente entra')}`);
  const tableSVG = S(300, 150, `${[[1, 63], [2, 86], [3, 95], [4, 98], [5, 99]].map(([k, p], i) => `<rect x="${30 + i * 52}" y="${130 - p}" width="38" height="${p}" rx="4" fill="var(--led)" opacity="${0.45 + i * 0.12}"/>${t(49 + i * 52, 124 - p, p + ' %', 'vizlab')}${t(49 + i * 52, 145, k + 'τ')}`).join('')}`);
  const fallSVG = S(300, 150, `${[[1, 37], [2, 14], [3, 5], [5, 1]].map(([k, p], i) => `<rect x="${40 + i * 62}" y="${130 - p}" width="40" height="${p}" rx="4" fill="var(--ice)"/>${t(60 + i * 62, 124 - p, p + ' %', 'vizlab')}${t(60 + i * 62, 145, k + 'τ')}`).join('')}${t(150, 20, 'lo que queda al descargar')}`);
  const tauSVG = S(300, 110, `${t(150, 40, 'τ = R · C', 'vizbig', 'middle', 'style="font-size:24px"')}${t(150, 70, 'Ω · F = s')}${t(150, 92, 'atajo: kΩ × µF = ms · 10 kΩ × 100 µF = 1000 ms = 1 s')}`);
  const stairSVG = S(300, 150, `<path d="M30 130H290" stroke="currentColor"/><path d="M30 130V60H90V35H150V25H210V22H270" fill="none" stroke="var(--led)" stroke-width="3" class="a-draw" style="--len:400"/><path d="M30 20H290" stroke="var(--muted)" stroke-dasharray="4 4"/>${t(60, 76, '63 %')}${t(120, 52, '86 %')}${t(180, 42, '95 %')}${t(240, 40, '98 %')}${t(150, 148, 'cada τ recorre el 63 % de lo que le falta')}${t(285, 14, 'lleno', 'vizsm', 'end')}`);
  const eSVG = S(300, 120, `${[['e^(−1)', '0,37'], ['e^(−2)', '0,14'], ['e^(−3)', '0,05'], ['e^(−5)', '0,007']].map(([a, b], i) => `<rect x="${12 + i * 72}" y="30" width="62" height="56" rx="8" fill="none" stroke="var(--ice)" stroke-width="2"/>${t(43 + i * 72, 52, a, 'vizsm')}${t(43 + i * 72, 74, b, 'vizlab')}`).join('')}${t(150, 108, 'e ≈ 2,718 · cada τ multiplica por 0,37')}`);
  const formSVG = S(300, 120, `${t(150, 38, 'carga: Vc = V · (1 − e^(−t/τ))', 'vizlab')}${t(150, 70, 'descarga: Vc = V · e^(−t/τ)', 'vizlab')}${t(150, 104, 'primero t/τ, luego e^, luego por V')}`);
  const halfSVG = S(300, 140, `<path d="M40 20V115H285" ${st} stroke-width="1.5"/><path d="M40 115C70 70 110 45 285 22" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M40 68H102V115" stroke="var(--muted)" stroke-dasharray="4 4" fill="none"/>${t(34, 72, '50 %', 'vizsm', 'end')}${t(102, 130, '0,69τ')}${t(200, 100, 't = τ · ln 2 ≈ 0,69 · τ', 'vizlab')}`);
  const coilSVG = S(300, 140, `${coilH(150, 70)}${[18, 30, 42].map((r, i) => `<ellipse cx="150" cy="70" rx="${r + 30}" ry="${r}" fill="none" stroke="var(--ice)" stroke-width="1.5" class="a-pulse a-d${i + 1}" opacity=".7"/>`).join('')}${t(150, 132, 'hilo enrollado: al pasar corriente, crea un campo magnético')}`);
  const vsSVG = S(300, 120, `<rect x="10" y="20" width="135" height="80" rx="10" fill="none" stroke="var(--ice)" stroke-width="2"/>${symCap(77, 45)}${t(77, 78, 'se opone a cambios')}${t(77, 92, 'de TENSIÓN')}<rect x="155" y="20" width="135" height="80" rx="10" fill="none" stroke="var(--led)" stroke-width="2"/>${coilH(222, 50)}${t(222, 78, 'se opone a cambios')}${t(222, 92, 'de CORRIENTE')}`);
  const sparkSVG = S(300, 130, `<path d="M30 70H110M190 70H270" ${st}/><circle cx="110" cy="70" r="4" fill="currentColor"/><circle cx="190" cy="70" r="4" fill="currentColor"/><path d="M135 55l10 12l-8 3l14 14l-4 -12l8 -2z" fill="var(--led)" class="a-blink"/>${t(150, 30, 'la bobina «empuja» para mantener la corriente', 'vizsm')}${t(150, 115, 'la tensión sube hasta que salta por el aire', 'vizsm')}`);
  const relayAnim = S(300, 170, `${coilH(80, 120)}<rect x="45" y="85" width="70" height="22" rx="4" fill="var(--muted)" opacity=".35"/>${t(80, 150, 'electroimán')}<g class="a-bob"><path d="M60 72L200 60" stroke="currentColor" stroke-width="4"/></g><circle cx="60" cy="72" r="4" fill="currentColor"/>${t(40, 66, 'COM', 'vizsm', 'end')}<circle cx="210" cy="50" r="5" fill="var(--ok)"/>${t(222, 54, 'NA', 'vizsm', 'start')}<circle cx="210" cy="82" r="5" fill="var(--err)"/>${t(222, 86, 'NC', 'vizsm', 'start')}${t(150, 20, 'interruptor movido por un imán', 'vizlab')}`);
  const lformSVG = S(300, 130, `<path d="M40 15V95H285" ${st} stroke-width="1.5"/><path d="M40 90H90L170 30H285" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M90 104H170" stroke="var(--muted)"/>${t(130, 118, 'Δt')}${t(180, 64, 'ΔI', 'vizsm', 'start')}${t(50, 30, 'V = L · ΔI / Δt', 'vizlab', 'start')}`);
  const satSVG = S(300, 140, `<path d="M40 15V110H285" ${st} stroke-width="1.5"/><path d="M40 30H170C200 30 210 80 285 95" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M170 15V110" stroke="var(--err)" stroke-dasharray="4 4"/>${t(170, 125, 'Isat')}${t(48, 24, 'inductancia', 'vizsm', 'start')}${t(280, 125, 'corriente →', 'vizsm', 'end')}${t(240, 70, 'se desploma', 'vizsm')}`);
  const ljSVG = S(300, 110, `${t(150, 40, 'E = ½ · L · I²', 'vizbig', 'middle', 'style="font-size:24px"')}${t(150, 70, 'condensador: ½ · C · V² · bobina: ½ · L · I²')}${t(150, 94, 'el doble de corriente, cuatro veces más energía')}`);

  /* ================= CONCEPTOS ================= */
  const base = k => CONCEPTS[k] ? CONCEPTS[k].alts : [];
  const rcP = (o = {}) => ({ R: { label: 'R', val: 10000, fmt: 'R', min: 1000, max: 100000 }, C: { label: 'C', val: 100, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' }, ...o });
  const expP = v => ({ x: { label: 't / τ', val: v, min: 0, max: 5, step: 0.1, unit: 'τ', dec: 1 } });
  Object.assign(CONCEPTS, {
    ba_symbols2: { name: 'Símbolos de componentes pasivos', alts: [
      { title: 'Galería', text: 'Condensador: dos rayas paralelas (dos placas que no se tocan); con una curva o un +, electrolítico. Potenciómetro: resistencia con una flecha que la toca (el cursor). LDR: flechas de luz que entran. NTC: una raya cruzada y «−t°».', svg: gallery1, q: mcq('Una resistencia con dos flechas que apuntan hacia ella es…', ['Una LDR (fotorresistencia)', 'Un LED', 'Un potenciómetro', 'Un condensador'], 'Las flechas que entran son luz que llega al componente.') },
      { title: 'Bobinas y compañía', text: 'La bobina se dibuja como una fila de bucles (el hilo enrollado). Un relé es una bobina con un interruptor y una línea discontinua entre ellos: la bobina mueve el interruptor. El fusible es un rectángulo atravesado por un hilo y el motor, un círculo con una M.', svg: gallery2, q: mcq('Ves una bobina unida a un interruptor por una línea discontinua. ¿Qué es?', ['Un relé', 'Un motor', 'Un fusible', 'Un potenciómetro'], 'La línea discontinua indica que la bobina mueve el interruptor.') }
    ] },
    ba_polarity: { name: 'Polaridad del electrolítico', alts: [
      { title: 'Dónde mirar', text: 'En el componente: la <b>franja con signos −</b> y la <b>pata corta</b> son el negativo. En el esquema: la placa curva o el <b>+</b> marcan el positivo. El + va hacia el punto de más tensión.', svg: canSVG, q: mcq('En un electrolítico, la franja con signos − está del lado…', ['De la pata negativa', 'De la pata positiva', 'De ninguna: es decoración', 'Del lado que va a más tensión'], 'La franja marca el negativo.') },
      ...base('ba_polarity')
    ] },
    ba_capq: { name: 'Carga de un condensador (Q = C · V)', alts: [
      { title: 'Llena las placas', text: 'La carga que guarda un condensador es proporcional a su capacidad y a la tensión: <b>Q = C · V</b>. Más capacidad (placas más grandes) o más tensión, más carga. Pruébalo.', tune: { viz: 'capQ', params: { C: { label: 'C', val: 47, list: CL, fmt: 'C' }, V: { label: 'Tensión', val: 5, min: 0, max: 12, step: 0.5, unit: 'V', dec: 1 } } }, q: mcq('100 µF a 10 V. ¿Carga?', ['1 mC', '10 mC', '0,1 mC', '1000 C'], 'Q = 0,0001 F × 10 V = 0,001 C = 1 mC.') },
      { title: 'Con números', text: 'Pasa la capacidad a faradios y multiplica por los voltios: salen culombios. 220 µF a 5 V → 0,00022 × 5 = 0,0011 C = 1,1 mC. Atajo: µF × V = µC (220 × 5 = 1100 µC).', q: mcq('47 µF a 2 V. ¿Carga?', ['94 µC', '23,5 µC', '94 mC', '0,94 µC'], 'µF × V = µC: 47 × 2 = 94 µC.') }
    ] },
    ba_capunits: { name: 'Faradios: µF, nF y pF', alts: [
      { title: 'La escalera de ×1000', text: 'El faradio es enorme: en la práctica se usan µF, nF y pF, y entre cada uno hay un salto de ×1000. 1 µF = 1000 nF; 1 nF = 1000 pF.', svg: ladderSVG, q: mcq('¿Cuántos nF son 0,47 µF?', ['470 nF', '47 nF', '4700 nF', '0,47 nF'], '× 1000: 0,47 µF = 470 nF.') },
      { title: 'Mueve la coma', text: 'Pasar a la unidad de la derecha (pF → nF → µF) es dividir entre 1000: la coma se mueve tres cifras a la izquierda. 4700 pF → 4,7 nF. A la izquierda, multiplicar: 0,1 µF → 100 nF.', q: mcq('¿Cuántos nF son 2200 pF?', ['2,2 nF', '2200 nF', '22 nF', '0,22 nF'], '2200 / 1000 = 2,2 nF.') }
    ] },
    ba_capmark: { name: 'Leer el valor de un condensador', alts: [
      { title: 'Dos cifras y ceros', text: 'Los cerámicos pequeños llevan tres cifras: las dos primeras son el valor y la tercera, cuántos ceros añadir. El resultado está en <b>picofaradios</b>.', svg: codeSVG, q: mcq('Un condensador pone «222». ¿Cuánto vale?', ['2,2 nF', '222 pF', '22 nF', '2,2 µF'], '22 y dos ceros: 2200 pF = 2,2 nF.') },
      ...base('bb_capcode').slice(1)
    ] },
    ba_capdc: { name: 'El condensador en continua', alts: [
      { title: 'Corriente solo al principio', text: 'Al conectar un condensador a una pila pasa corriente mientras se carga; cuando ya tiene la tensión de la pila, la corriente se para. En continua y cargado, es como un circuito abierto.', svg: dcSVG, q: mcq('Un condensador lleva una hora conectado a una pila de 9 V. ¿Corriente?', ['Prácticamente ninguna', 'Mucha', 'La misma que al principio', 'Va y viene'], 'Ya está cargado: no entra más carga.') },
      ...base('ba_capdc')
    ] },
    ba_capvolt: { name: 'Tensión nominal del condensador', alts: [
      { title: 'Un máximo, no un valor', text: 'La tensión impresa (16 V, 25 V…) es la <b>máxima</b> que soporta, no la que da ni la que necesita. Elígela con margen por encima de la tensión de tu circuito.', svg: canSVG, q: mcq('Circuito de 5 V. ¿Qué condensador eliges?', ['Uno de 10 V o más', 'Uno de 5 V justos', 'Uno de 3,3 V', 'Da igual'], 'Con margen: 10 V o más.') },
      { title: 'Por qué el margen', text: 'Las fuentes tienen pequeños picos al encender y apagar, y los condensadores envejecen. Una regla habitual es elegir al menos 1,5 o 2 veces la tensión de trabajo. Pasarse de la máxima puede perforar el aislante.', q: mcq('¿Qué indica «35 V» en un condensador?', ['La tensión máxima que soporta', 'La tensión que genera', 'La que necesita para funcionar', 'Su capacidad'], 'Es un límite.') }
    ] },
    ba_captypes: { name: 'Tipos de condensador', alts: [
      { title: 'Cada aislante, un uso', text: 'Cerámico: pequeño, barato, sin polaridad; ideal para valores pequeños y ruido rápido. C0G (NP0): cerámico muy estable. Electrolítico: mucha capacidad barata, con polaridad. Película: preciso, para audio y filtros. Supercondensador: faradios a pocos voltios.', svg: typesSVG, q: mcq('Necesitas 2200 µF para guardar mucha energía barata. ¿Qué tipo?', ['Electrolítico', 'Cerámico C0G', 'Película', 'Tántalo de 1 nF'], 'Mucha capacidad por poco dinero: electrolítico.') },
      { title: 'Sus puntos débiles', text: 'Cada tipo tiene su defecto: los cerámicos X7R, X5R e Y5V pierden capacidad con la tensión y la temperatura; los electrolíticos se secan con el calor y tienen polaridad; los de tántalo pueden fallar en cortocircuito si se pasan de tensión; los de película son grandes para su capacidad.', q: mcq('¿Qué cerámico apenas cambia con la tensión y la temperatura?', ['C0G (NP0)', 'Y5V', 'X5R', 'Todos igual'], 'C0G es la clase estable.') }
    ] },
    ba_ceramic: { name: 'Cerámicos: estables y no tanto', alts: [
      { title: 'La curva que engaña', text: 'Un cerámico de clase 2 (X7R, X5R, Y5V) pierde capacidad cuando le aplicas tensión continua: un 10 µF de 6,3 V trabajando a 5 V puede quedarse en menos de la mitad. Los C0G no cambian, pero solo existen en valores pequeños.', svg: biasSVG, q: mcq('Un cerámico X5R de 10 µF y 6,3 V trabaja a 5 V. ¿Capacidad real?', ['Bastante menos de 10 µF', 'Exactamente 10 µF', 'Más de 10 µF', '0 µF'], 'La clase 2 pierde mucha capacidad con la tensión.') },
      { title: 'Cómo protegerte', text: 'Elige una tensión nominal bien por encima de la de trabajo (pierden menos), un encapsulado más grande o un C0G si el valor es pequeño. Y mira la gráfica de capacidad frente a tensión de la hoja de datos.', q: mcq('¿Qué ayuda a que un X7R pierda menos capacidad?', ['Elegir una tensión nominal bastante mayor que la de trabajo', 'Ponerlo al revés', 'Usar uno más pequeño', 'Calentarlo'], 'Más margen de tensión, menos pérdida.') }
    ] },
    ba_caplife: { name: 'Vida de un electrolítico', alts: [
      { title: 'Enfríalo y vivirá más', text: 'La vida se da a la temperatura máxima (por ejemplo, 2000 h a 105 °C) y, como regla aproximada, se duplica por cada 10 °C menos. Mueve la temperatura.', tune: { viz: 'capLife', params: { Lh: { label: 'Vida a 105 °C', val: 2000, list: [1000, 2000, 5000, 10000], unit: 'h', dec: 0 }, T: { label: 'Temperatura', val: 85, min: 25, max: 105, step: 5, unit: '°C', dec: 0 } } }, q: mcq('2000 h a 105 °C. ¿Vida a 85 °C?', ['8000 h', '4000 h', '2000 h', '20 000 h'], '20 °C menos son dos saltos: ×4.') },
      ...base('ba_caplife')
    ] },
    ba_capcomb: { name: 'Condensadores en paralelo y en serie', alts: [
      { title: 'Combínalos', text: 'Cambia entre paralelo (1) y serie (2) y mira la capacidad total. En paralelo se suman; en serie baja, como las resistencias en paralelo.', tune: { viz: 'capComb', params: { C1: { label: 'C1', val: 22, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' }, C2: { label: 'C2', val: 47, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' }, m: { label: 'Montaje (1 = paralelo, 2 = serie)', val: 1, list: [1, 2], dec: 0 }, V: { val: 10, fixed: true } } }, q: mcq('Dos de 100 µF en serie. ¿Total?', ['50 µF', '200 µF', '100 µF', '10 000 µF'], 'Dos iguales en serie: la mitad.') },
      ...base('ba_capcomb')
    ] },
    ba_capj: { name: 'Energía de un condensador', alts: [
      { title: 'El cuadrado manda', text: 'Un condensador guarda <b>E = ½ · C · V²</b>. Doble de tensión, cuatro veces más energía. Sube la tensión y mira cómo crece.', tune: { viz: 'capComb', params: { C1: { label: 'C1', val: 1000, list: [100, 470, 1000], fmt: 'C' }, C2: { val: 1000, fixed: true }, m: { val: 1, fixed: true }, V: { label: 'Tensión', val: 10, min: 0, max: 50, step: 1, unit: 'V', dec: 0 } } }, q: mcq('¿Cuánta energía guardan 100 µF a 10 V?', ['5 mJ', '10 mJ', '0,5 mJ', '1 J'], '½ × 0,0001 × 100 = 0,005 J.') },
      { title: 'Comparado con una batería', text: 'Un supercondensador de 1 F a 2,7 V guarda ½ × 1 × 2,7² ≈ 3,6 J; la batería de un móvil, decenas de miles de julios. Los condensadores dan energía muy deprisa, pero guardan poca.', q: mcq('¿Por qué un condensador de 1 F y 2,7 V no sustituye a la batería de un móvil?', ['Guarda muy poca energía: unos 3,6 J', 'Porque pesa más', 'Porque no se puede cargar', 'Sí la sustituye'], 'Miles de veces menos que una batería.') }
    ] },
    ba_capshock: { name: 'Condensadores cargados: peligro', alts: [
      { title: 'Siguen cargados', text: 'Un condensador grande de un aparato de red puede seguir cargado mucho después de desenchufarlo: 470 µF a 400 V guardan unos 38 J, de sobra para una descarga peligrosa. Antes de tocar: mide y descarga con una resistencia.', svg: dangerSVG, q: mcq('Desenchufas un aparato de red para repararlo. ¿Qué haces antes de tocar dentro?', ['Medir y descargar los condensadores grandes', 'Nada: está desenchufado', 'Tocar con un dedo para comprobar', 'Cortocircuitarlos con un destornillador'], 'Mide y descarga con una resistencia adecuada.') },
      { title: 'Cómo se descarga', text: 'Con una resistencia de potencia (por ejemplo, unos kΩ y varios vatios) y pinzas aisladas, mientras miras la tensión con el multímetro. Un destornillador en cortocircuito suelta toda la energía de golpe: chispa, cráter en las patas y riesgo de quemaduras. En este curso trabajas con pilas: los aparatos de red no se abren.', q: mcq('¿Por qué no se descarga un condensador grande con un destornillador?', ['Suelta toda la energía de golpe: chispa y daños', 'Porque tarda mucho', 'Porque no funciona', 'Sí es lo recomendado'], 'Con una resistencia, la energía sale poco a poco.') }
    ] },
    rc: { name: 'Constante de tiempo RC', alts: [
      { title: 'Cámbialo y mira la curva', text: 'Más resistencia o más capacidad, curva más lenta: <b>τ = R · C</b>. Tras 1τ la carga va por el 63 %.', tune: { viz: 'rc', params: rcP() }, q: mcq('Si duplicas R con el mismo C, τ…', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'τ es proporcional a R.') },
      ...base('rc')
    ] },
    ba_rcpct: { name: 'Carga y descarga tras n·τ', alts: [
      { title: 'La tabla', text: 'Cargando: 63 % tras 1τ, 86 % tras 2τ, 95 % tras 3τ, 98 % tras 4τ y 99 % (prácticamente lleno) tras 5τ.', svg: tableSVG, q: mcq('τ = 0,2 s. ¿Cuánto tarda en cargarse casi del todo?', ['Alrededor de 1 s', '0,2 s', '0,4 s', '10 s'], '5τ = 1 s.') },
      { title: 'Cada τ, un 63 % de lo que falta', text: 'En cada τ el condensador recorre el 63 % de lo que le falta. Tras 1τ le falta el 37 %; tras 2τ, el 37 % de ese 37 % (un 14 %): va por el 86 %. Descargando es al revés: quedan el 37 %, el 14 %, el 5 %…', svg: stairSVG, q: mcq('¿Qué porcentaje le queda tras 2τ de descarga?', ['14 %', '37 %', '86 %', '0 %'], '0,37 × 0,37 ≈ 0,14.') },
      { title: 'Míralo en la curva', text: 'Mueve el punto por la curva: en 1τ, 63 % cargado y 37 % descargado; en 5τ, casi 100 % y casi 0 %.', tune: { viz: 'expCurve', params: expP(1) }, q: mcq('Tras 3τ de carga, ¿por dónde va?', ['95 %', '63 %', '86 %', '100 %'], 'Le falta un 5 %.') }
    ] },
    ba_exp: { name: 'La función e^(−x)', alts: [
      { title: 'Los valores clave', text: 'e ≈ 2,718. e^(−1) ≈ 0,37, e^(−2) ≈ 0,14, e^(−3) ≈ 0,05, e^(−5) ≈ 0,007: cada paso vuelve a multiplicar por 0,37.', svg: eSVG, q: mcq('¿Cuánto vale aproximadamente e^(−2)?', ['0,14', '0,37', '0,05', '0,5'], '0,37 × 0,37.') },
      ...base('ba_exp')
    ] },
    ba_rcform: { name: 'La fórmula de la curva RC', alts: [
      { title: 'Busca el punto', text: 'Carga: <b>Vc = V · (1 − e^(−t/τ))</b>. Descarga: <b>Vc = V · e^(−t/τ)</b>. Mueve t/τ: la curva ámbar es la carga y la azul, la descarga. Las dos se cruzan en 0,69τ, donde valen el 50 %.', tune: { viz: 'expCurve', params: expP(0.3) }, q: mcq('¿Cuánto tarda (en τ) en cargarse a la mitad?', ['Unos 0,7τ', '1τ', '0,5τ', '2τ'], 'ln 2 ≈ 0,69.') },
      { title: 'Paso a paso', text: '9 V, τ = 1 s, tras 0,5 s de carga: t/τ = 0,5; e^(−0,5) ≈ 0,61; 1 − 0,61 = 0,39; 9 × 0,39 ≈ 3,5 V. Siempre en ese orden: t/τ, la exponencial, y luego por la tensión.', svg: formSVG, q: mcq('10 V, τ = 1 s, tras 1 s de descarga. ¿Tensión?', ['3,7 V', '6,3 V', '1 V', '0 V'], '10 × e^(−1) ≈ 3,7 V.') }
    ] },
    ba_coil: { name: 'La bobina se opone a los cambios', alts: [
      { title: 'Un volante de inercia', text: 'Una bobina es la inercia de la electricidad: cuesta arrancar la corriente y cuesta pararla. Con una corriente constante no hace nada (es casi un cable); ante un cambio brusco, reacciona con fuerza.', svg: vsSVG, q: mcq('Por una bobina ideal pasa una corriente continua constante. ¿Qué tensión cae en ella?', ['Cero', 'Muchísima', 'La de la pila', 'Depende del color'], 'Sin cambio de corriente no reacciona.') },
      { title: 'Míralo en el tiempo', text: 'Con una pila y una resistencia, la corriente por la bobina no aparece de golpe: sube poco a poco (continua). Mientras sube, en la bobina hay tensión (discontinua); cuando la corriente ya no cambia, esa tensión desaparece.', tune: { viz: 'rlCurrent', params: { L: { label: 'L', val: 100, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, R: { label: 'R', val: 100, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' }, V: { val: 5, fixed: true } } }, q: mcq('Conectas una bobina con una resistencia a una pila. La corriente…', ['Sube poco a poco hasta V / R', 'Aparece de golpe', 'No pasa nunca', 'Sube sin límite'], 'La bobina frena el cambio, no la corriente final.') }
    ] },
    ba_kick: { name: 'El pico al cortar una bobina', alts: [
      { title: 'Corta y mira', text: 'Cuanto más rápido cortas la corriente de una bobina, mayor es el pico de tensión. Con un corte brusco salta una chispa en el interruptor.', tune: { viz: 'coilKick', params: { I: { label: 'Corriente', val: 0.5, min: 0.1, max: 1, step: 0.1, unit: 'A', dec: 1 }, tc: { label: 'Tiempo de corte', val: 1, list: [100, 10, 1, 0.1, 0.01], unit: 'ms', dec: 2 } } }, q: mcq('Cortas la misma corriente diez veces más rápido. El pico…', ['Es unas diez veces mayor', 'Es diez veces menor', 'No cambia', 'Desaparece'], 'La bobina reacciona a lo rápido del cambio.') },
      { title: 'Dónde lo ves', text: 'Es la chispa al desenchufar un aparato con motor, la que hace saltar la bujía de un coche y la que estropea los contactos de un interruptor. También puede romper lo que conmuta la bobina: más adelante verás cómo se protege.', svg: sparkSVG, q: mcq('¿Por qué saltan chispas al abrir el interruptor de un motor en marcha?', ['El bobinado del motor da un pico de tensión al cortar la corriente', 'Porque el motor tiene pilas', 'Por la electricidad estática', 'Porque el interruptor está roto'], 'Un motor está lleno de bobinas.') }
    ] },
    ba_relay: { name: 'El relé', alts: [
      { title: 'Un interruptor con imán', text: 'Un relé es un electroimán que mueve una lámina: con corriente en la bobina, el común (COM) pasa del contacto NC al NA. Una corriente pequeña conmuta otra grande, y los dos circuitos no se tocan.', svg: relayAnim, q: mcq('Sin corriente en la bobina, el común está unido a…', ['El contacto NC (normalmente cerrado)', 'El contacto NA', 'Ninguno', 'La bobina'], 'En reposo, NC está cerrado.') },
      { title: 'Dos mundos separados', text: 'Con un relé, un circuito de pilas puede encender una lámpara de otro circuito sin que las dos partes se toquen eléctricamente: solo las une el imán. Es lento y hace clic, pero aísla muy bien.', q: mcq('¿Qué ventaja principal tiene un relé?', ['Aísla el circuito de control del de la carga', 'Es silencioso', 'No consume nada', 'Funciona sin bobina'], 'Las une el imán, no un cable.') }
    ] },
    ba_vldi: { name: 'Inductancia y V = L · ΔI / Δt', alts: [
      { title: 'Prueba la rampa', text: 'La tensión de una bobina depende de lo rápido que cambia su corriente: <b>V = L · ΔI / Δt</b>. Más inductancia, más cambio o menos tiempo → más tensión.', tune: { viz: 'vldi', params: { L: { label: 'L', val: 10, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, dI: { label: 'ΔI', val: 0.5, min: 0.1, max: 2, step: 0.1, unit: 'A', dec: 1 }, dt: { label: 'Δt', val: 1, list: [0.01, 0.1, 1, 10, 100], unit: 'ms', dec: 2 } } }, q: mcq('Bobina de 1 mH; la corriente sube 2 A en 1 ms. ¿Tensión?', ['2 V', '0,5 V', '2000 V', '0,002 V'], '0,001 × 2 / 0,001 = 2 V.') },
      { title: 'Qué es un henrio', text: 'Una bobina tiene 1 H si, al cambiar su corriente 1 A cada segundo, aparece 1 V. Lo normal son µH y mH. La inductancia crece mucho con el número de vueltas (con su cuadrado) y con un núcleo de ferrita o hierro.', svg: lformSVG, q: mcq('¿Qué aumenta la inductancia de una bobina?', ['Más vueltas y un núcleo de ferrita', 'Hilo más grueso', 'Menos vueltas', 'Más corriente'], 'L crece con el cuadrado de las vueltas y con el núcleo.') }
    ] },
    ba_taurl: { name: 'Constante de tiempo L / R', alts: [
      { title: 'Míralo en la curva', text: 'La corriente de un RL sube como la tensión de un RC: 63 % en 1τ, casi todo en 5τ, con <b>τ = L / R</b>. Prueba a subir R: ¡va más rápido!', tune: { viz: 'rlCurrent', params: { L: { label: 'L', val: 100, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, R: { label: 'R', val: 100, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' }, V: { val: 5, fixed: true } } }, q: mcq('100 mH con 100 Ω. ¿τ?', ['1 ms', '10 s', '10 ms', '0,1 ms'], '0,1 / 100 = 0,001 s.') },
      ...base('ba_taurl')
    ] },
    ba_coilj: { name: 'Energía de una bobina', alts: [
      { title: 'Igual que el condensador', text: 'La bobina guarda energía en su campo magnético: <b>E = ½ · L · I²</b>. Es la misma forma que ½ · C · V², con L en lugar de C y la corriente en lugar de la tensión.', svg: ljSVG, q: mcq('Una bobina de 100 µH con 2 A. ¿Energía?', ['0,2 mJ', '0,4 mJ', '0,1 mJ', '200 J'], '½ × 0,0001 × 4 = 0,0002 J.') },
      { title: 'Adónde va al cortar', text: 'Si cortas la corriente, esa energía tiene que salir por algún sitio: por eso aparece el pico de tensión. Una bobina de 10 mH con 1 A guarda 5 mJ; parece poco, pero soltado en microsegundos da cientos de voltios.', q: mcq('¿Qué tienen en común una bobina y un condensador?', ['Los dos guardan energía y tienen constante de tiempo', 'Nada', 'Los dos bloquean la continua', 'Los dos tienen polaridad'], 'El condensador se opone a cambios de tensión; la bobina, a cambios de corriente.') }
    ] },
    ba_coilsat: { name: 'Saturación de una bobina', alts: [
      { title: 'El núcleo se llena', text: 'Hasta la corriente de saturación la inductancia se mantiene; por encima, el núcleo ya no admite más campo y la inductancia se desploma: la corriente sube de golpe.', svg: satSVG, q: mcq('Una bobina tiene Isat = 2 A y por ella pasan picos de 2,5 A. ¿Qué pasa?', ['Se satura: la inductancia cae y la corriente se dispara', 'Nada', 'Gana inductancia', 'Baja la corriente'], 'Elige siempre Isat por encima del pico.') },
      ...base('ba_coilsat').slice(1)
    ] }
  });

  /* ================= LECCIONES ================= */
  const capP = { C: { label: 'Capacidad', val: 47, list: CL, fmt: 'C' }, V: { label: 'Tensión de la pila', val: 5, min: 0, max: 12, step: 0.5, unit: 'V', dec: 1 } };
  const rlP = (L, R) => ({ L: { label: 'L', val: L, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, R: { label: 'R', val: R, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' }, V: { val: 5, fixed: true } });

  UNITS.push({ id: 'm6', title: 'Condensadores y bobinas', desc: 'Componentes que guardan energía: símbolos, condensadores, carga y descarga RC, bobinas y relés.', nodes: [
    L('e2', 'Más símbolos: componentes pasivos', 'sym', ['ba_symbols2', 'ba_polarity'], [
      Q('En un esquema ves dos rayas paralelas muy juntas, cortando el cable. ¿Qué crees que representan?', ['Dos placas que no se tocan: un condensador', 'Un cable roto', 'Una pila'], 'Es un condensador: dos placas separadas por un aislante. La pila también tiene dos rayas, pero de distinto largo.', { predict: true, c: 'ba_symbols2', h: 'Fíjate en que las dos rayas miden lo mismo; en la pila no.' }),
      I('Ya conoces los símbolos de la pila, la resistencia, el LED y el interruptor. Ahora llegan los componentes <b>pasivos</b> que faltan: condensadores, potenciómetros, sensores, bobinas…', { svg: gallery1, more: 'Pasivo quiere decir que el componente no amplifica ni genera energía: la guarda, la frena o la deja pasar. Los activos (transistores, chips) llegarán más adelante.' }),
      I('<b>Condensador</b>: dos placas que no se tocan. Si una placa es curva o lleva un <b>+</b>, es <b>electrolítico</b>: tiene polaridad y hay que conectarlo en su sentido.', { symk: 'ecap' }),
      { t: 'explore', text: 'Tres componentes cuyo valor cambia: una LDR (luz), un potenciómetro (cursor) y una NTC (temperatura). Mira cómo sus símbolos lo cuentan.', viz: 'symLive', params: { luz: { label: 'Luz', val: 20, min: 0, max: 100, step: 5, unit: '%', dec: 0 }, cur: { label: 'Cursor del potenciómetro', val: 50, min: 0, max: 100, step: 5, unit: '%', dec: 0 }, temp: { label: 'Temperatura', val: 20, min: 0, max: 80, step: 2, unit: '°C', dec: 0 } },
        tasks: [
          { q: 'Rldr', min: 0, max: 999, text: 'Haz que la LDR baje de 1 kΩ', done: 'Más luz, menos resistencia: por eso su símbolo lleva flechas de luz que entran.', hint: 'Sube la luz.' },
          { q: 'pos', min: 24, max: 26, text: 'Pon el cursor del potenciómetro al 25 %', done: 'La flecha del símbolo es el cursor: la tercera pata.', hint: 'Baja el cursor.' },
          { q: 'Rntc', min: 0, max: 4999, text: 'Calienta la NTC hasta que baje de 5 kΩ', done: 'NTC: coeficiente negativo, más temperatura, menos resistencia. De ahí el «−t°».', hint: 'Sube la temperatura.' }
        ] },
      I('Más símbolos: la <b>NTC</b> (raya cruzada y −t°), el <b>fusible</b>, la <b>bobina</b> (una fila de bucles: hilo enrollado) y el <b>motor</b> (un círculo con una M).', { svg: gallery2 }),
      I('El <b>relé</b>: una bobina y un interruptor unidos por una línea discontinua. La bobina, al recibir corriente, se convierte en un imán y mueve el interruptor. Lo verás a fondo en esta unidad.', { svg: relaySVG }),
      { t: 'match', q: 'Une cada símbolo con su nombre.', pairs: [['sym:cap', 'Condensador'], ['sym:ecap', 'Electrolítico'], ['sym:pot', 'Potenciómetro'], ['sym:ldr', 'Fotorresistencia (LDR)']], c: 'ba_symbols2', h: 'Busca los detalles: placa curva, flecha que toca, flechas que entran.' },
      { t: 'match', q: 'Y estos.', pairs: [['sym:fuse', 'Fusible'], ['sym:motor', 'Motor'], ['sym:sw', 'Interruptor'], ['sym:bat', 'Pila']], c: 'ba_symbols2', h: 'El fusible es un rectángulo con un hilo; el motor lleva una M.' },
      { t: 'sym', k: 'ecap', q: '¿Qué indica la placa curva o el +?', o: ['Que tiene polaridad', 'Que es grande', 'Que es variable', 'Que se calienta'], a: 0, e: 'Los electrolíticos tienen + y −: el + va hacia el punto de más tensión.', c: 'ba_polarity', h: 'Piensa en por qué un componente necesitaría un signo +.' },
      { t: 'sym', k: 'pot', q: '¿Qué representa la flecha?', o: ['Un cursor móvil', 'Que emite luz', 'El sentido de la corriente', 'Que está roto'], a: 0, e: 'La flecha que toca la resistencia es el cursor: la tercera pata.', c: 'ba_symbols2', h: 'Recuerda el reto: ¿qué movías en el potenciómetro?' },
      Q('Ves una resistencia cruzada por una raya en diagonal y «−t°» al lado. ¿Qué es?', ['Una NTC: su resistencia baja al calentarse', 'Una LDR', 'Un fusible', 'Un potenciómetro roto'], 'La raya indica que el valor cambia solo; −t°, que baja con la temperatura.', { c: 'ba_symbols2', h: 'El «t°» habla de temperatura.' }),
      Q('¿Cómo se dibuja una bobina?', ['Como una fila de bucles', 'Como dos rayas paralelas', 'Como un rectángulo con un hilo', 'Como un círculo con una M'], 'Los bucles recuerdan el hilo enrollado.', { c: 'ba_symbols2', h: 'Una bobina es hilo enrollado.' }),
      Q('Una bobina y un interruptor unidos por una línea discontinua son…', ['Un relé', 'Un motor', 'Un condensador variable', 'Dos componentes sin relación'], 'La línea discontinua es la unión mecánica: la bobina mueve el interruptor.', { c: 'ba_symbols2', h: '¿Qué componente mueve un interruptor con un imán?' }),
      I('<b>Resumen</b>\n· Condensador: dos placas; con curva o +, electrolítico (polaridad).\n· Flecha que toca: potenciómetro. Flechas que entran: LDR. Raya y −t°: NTC.\n· Bucles: bobina. Bobina + interruptor + línea discontinua: relé.')
    ]),
    L('g3', 'El condensador', 'cap', ['ba_capq', 'ba_capdc', 'ba_capunits', 'ba_capmark', 'ba_capvolt', 'ba_polarity'], [
      Q('Conectas un condensador a una pila de 9 V a través de una resistencia y esperas un rato. ¿Qué crees que pasa con la corriente?', ['Pasa al principio y luego se para', 'Pasa siempre igual, como por una resistencia', 'No pasa nunca'], 'Al principio entra carga en el condensador; cuando ya está lleno, la corriente se para. Vamos a ver por qué.', { predict: true, c: 'ba_capdc', h: 'Entre las placas hay un aislante: ¿puede cruzar la carga?' }),
      I('Un <b>condensador</b> son dos placas metálicas separadas por un aislante. La pila saca carga de una placa y la empuja a la otra: se acumula carga, pero nada cruza el aislante.', { svg: platesSVG, more: 'Cuanta más superficie tienen las placas y más cerca están, más carga caben por voltio. El aislante (dieléctrico) también cuenta: algunos materiales multiplican la capacidad.\nLa carga se mide en culombios, como viste al principio del curso.' }),
      { t: 'explore', text: 'Elige capacidad y tensión y mira cuánta carga se acumula en las placas.', viz: 'capQ', params: capP,
        tasks: [
          { q: 'Qm', min: 0.99, max: 1.01, text: 'Guarda exactamente 1 mC', done: 'Por ejemplo 100 µF a 10 V, o 1000 µF a 1 V: Q = C · V.', hint: 'Prueba con 100 µF y busca la tensión.' },
          { q: 'Qm', min: 10, max: 20, text: 'Ahora guarda más de 10 mC', done: 'Hace falta mucha capacidad y bastante tensión: 1000 µF a 10 V o más.', hint: 'Sube la capacidad al máximo.' },
          { q: 'Qm', min: 0.045, max: 0.055, text: 'Y ahora solo unos 0,05 mC', done: 'Poca capacidad o poca tensión: 10 µF a 5 V, por ejemplo.', hint: 'Baja la capacidad.' }
        ] },
      I('La carga es proporcional a la tensión: <b>Q = C · V</b>. La constante C es la <b>capacidad</b>, en <b>faradios</b> (F): 1 F guarda 1 culombio por cada voltio.', { svg: qcvSVG }),
      { t: 'steps', text: '¿Cuánta carga guarda un condensador de 100 µF a 9 V?', svg: qcvSVG, steps: ['Fórmula: <b>Q = C · V</b>', 'C en faradios: 100 µF = 0,0001 F', 'Q = 0,0001 × 9 = <b>0,0009 C</b>', 'En mC: 0,0009 × 1000 = <b>0,9 mC</b> (o 900 µC)'], result: '0,9 mC' },
      Nm('¿Cuánta carga guarda uno de 470 µF a 10 V, en mC?', 4.7, 'mC', 'Q = 0,00047 × 10 = 0,0047 C = 4,7 mC.', { c: 'ba_capq', h: 'Pasa los µF a faradios, multiplica por los voltios y pasa a mC.' }),
      Q('Con el mismo condensador, duplicas la tensión. La carga…', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'Q = C · V: proporcional a V.', { c: 'ba_capq', h: 'En Q = C · V, ¿qué cambia si V es el doble?' }),
      I('El faradio es enorme. En la práctica se usan <b>µF</b>, <b>nF</b> y <b>pF</b>, con saltos de ×1000 entre ellos.', { svg: ladderSVG }),
      Nm('¿Cuántos nF son 0,1 µF?', 100, 'nF', '0,1 × 1000 = 100 nF.', { c: 'ba_capunits', h: 'De µF a nF se multiplica por 1000.' }),
      G('m6_capUnits'),
      I('Los cerámicos pequeños no caben con el valor escrito: llevan un código de tres cifras. Las dos primeras son el valor y la tercera, cuántos ceros. Sale en <b>pF</b>.', { svg: codeSVG }),
      G('m6_capCode'),
      I('En <b>continua</b>, la corriente solo pasa mientras el condensador se carga. Una vez lleno, no pasa nada: <b>bloquea la continua</b>.', { svg: dcSVG }),
      Q('En continua y ya cargado, ¿cuánta corriente pasa por un condensador?', ['Prácticamente ninguna', 'Mucha', 'La misma que por una resistencia', 'Depende del color'], 'Las placas no se tocan: una vez llenas, la corriente se para.', { c: 'ba_capdc', h: 'Recuerda la gráfica de la corriente al cargarse.' }),
      I('Dos datos que importan: el electrolítico tiene <b>polaridad</b> (franja − y pata corta al negativo) y todos tienen una <b>tensión máxima</b> impresa. Elige siempre con margen.', { svg: canSVG }),
      { t: 'tap', img: 'ecap', q: 'Toca la pata negativa del electrolítico.', a: 'minus', right: 'la pata corta, del lado de la franja', e: 'La franja con signos − marca el negativo.', c: 'ba_polarity', h: 'Busca la franja con signos −.' },
      Q('¿Qué indica «16 V» impreso en un condensador?', ['La tensión máxima que soporta', 'La tensión que genera', 'La que necesita para funcionar', 'Su capacidad'], 'Es un límite: elige con margen.', { c: 'ba_capvolt', h: 'Un condensador no genera tensión: la guarda.' }),
      I('<b>Resumen</b>\n· Dos placas y un aislante: <b>Q = C · V</b>.\n· µF, nF y pF, con saltos de ×1000; código «104» = 100 nF.\n· En continua, una vez cargado, no pasa corriente.\n· Electrolítico: polaridad. Todos: tensión máxima.')
    ]),
    L('g7', 'Tipos de condensadores', 'cap', ['ba_captypes', 'ba_ceramic', 'ba_caplife', 'ba_capvolt', 'ba_polarity'], [
      Q('Tienes dos condensadores de 10 µF: uno cerámico diminuto y un electrolítico mucho más grande. ¿Por qué crees que existen los dos?', ['Cada material tiene ventajas e inconvenientes distintos', 'Son idénticos: solo cambia el aspecto', 'El grande guarda más carga a la misma tensión'], 'Misma capacidad nominal, pero distinto aislante: cambian el precio, la polaridad, la estabilidad, la vida y cuánto aguantan.', { predict: true, c: 'ba_captypes', h: 'Piensa en qué más puede cambiar aparte de la capacidad.' }),
      I('Todos son dos placas y un aislante, pero el <b>aislante</b> (dieléctrico) lo cambia todo: cerámico, electrolítico, tántalo, película…', { svg: typesSVG, more: 'También existen los supercondensadores: faradios de capacidad a solo 2,5–2,7 V por celda. Sirven para mantener un reloj durante un corte de luz o dar picos de energía.' }),
      { t: 'match', q: 'Une cada uso con el condensador típico.', pairs: [['100 nF para filtrar ruido rápido junto a un circuito', 'Cerámico'], ['2200 µF para guardar mucha energía barata', 'Electrolítico'], ['Filtro de audio preciso', 'Película'], ['Mantener un reloj durante un corte de luz', 'Supercondensador']], c: 'ba_captypes', h: 'Piensa en el tamaño de la capacidad y en si hace falta precisión.' },
      I('<b>Cerámicos</b>: los <b>C0G (NP0)</b> son muy estables, pero solo existen en valores pequeños. Los de clase 2 (<b>X7R, X5R, Y5V</b>) pierden capacidad con la tensión continua y la temperatura.', { svg: biasSVG }),
      Q('Necesitas 22 pF muy estables para un oscilador de cristal. ¿Qué eliges?', ['Cerámico C0G (NP0)', 'Electrolítico', 'Cerámico Y5V', 'Supercondensador'], 'C0G apenas cambia con la tensión ni con la temperatura.', { c: 'ba_captypes', h: 'Valor pequeño y estabilidad: ¿qué cerámico no cambia?' }),
      Q('Un cerámico X5R de 10 µF y 6,3 V trabaja a 5 V. ¿Cuánta capacidad tendrá de verdad?', ['Bastante menos: puede quedarse en menos de la mitad', 'Exactamente 10 µF', 'Más de 10 µF', 'Ninguna'], 'La clase 2 pierde mucha capacidad cerca de su tensión nominal.', { c: 'ba_ceramic', h: 'Mira la curva del X7R/Y5V con tensión aplicada.' }),
      I('<b>Electrolíticos</b>: mucha capacidad barata, con polaridad. Su líquido se seca con el calor: la vida se da en horas a una temperatura y, como regla, <b>se duplica por cada 10 °C menos</b>.', { svg: canSVG }),
      { t: 'explore', text: 'Un electrolítico de 105 °C. Cambia su vida nominal y la temperatura a la que trabaja.', viz: 'capLife', params: { Lh: { label: 'Vida a 105 °C', val: 2000, list: [1000, 2000, 5000, 10000], unit: 'h', dec: 0 }, T: { label: 'Temperatura de trabajo', val: 95, min: 25, max: 105, step: 5, unit: '°C', dec: 0 } },
        tasks: [
          { q: 'years', min: 5, max: 1000, text: 'Haz que dure más de 5 años', done: 'Más fresco o con más horas nominales: la regla ×2 cada 10 °C es muy agradecida.', hint: 'Baja la temperatura.' },
          { q: 'h', min: 0, max: 1500, text: 'Ahora haz que muera en menos de 1500 h (unos 2 meses)', done: 'Caliente y con pocas horas nominales: así fallan las fuentes baratas.', hint: 'Sube la temperatura y elige 1000 h.' }
        ] },
      { t: 'steps', text: 'Un electrolítico de 2000 h a 105 °C trabaja a 65 °C. ¿Cuánto durará?', steps: ['Diferencia: 105 − 65 = <b>40 °C</b>', 'Cada 10 °C, ×2: son <b>4 saltos</b>', '2⁴ = 16 → 2000 × 16 = <b>32 000 h</b>', 'Un año tiene 8760 h: unos <b>3,7 años</b> encendido sin parar'], result: 'Unas 32 000 h' },
      Nm('5000 h a 105 °C, trabajando a 85 °C. ¿Vida aproximada, en horas?', 20000, 'h', '20 °C menos son dos saltos: ×4.', { c: 'ba_caplife', h: 'Cuenta cuántos saltos de 10 °C hay y multiplica por 2 en cada uno.' }),
      Q('Un electrolítico conectado al revés en una fuente de 12 V…', ['Puede calentarse, hincharse o reventar', 'Funciona igual', 'Gana capacidad', 'Se vuelve cerámico'], 'Su aislante es una capa finísima que solo aguanta en un sentido.', { c: 'ba_polarity', h: 'Recuerda por qué lleva una franja con signos −.' }),
      I('<b>Tántalo</b>: compactos y estables, con polaridad, pero delicados si se pasan de tensión. <b>Película</b>: precisos y duraderos, pero grandes. Y todos tienen una pequeña resistencia interna, la <b>ESR</b>: con mucha corriente, se calientan (P = I² · ESR).', { svg: typesSVG }),
      Q('Los condensadores de tántalo tienen fama de…', ['Fallar en cortocircuito, a veces con llama, si se superan sus límites', 'Ser eternos', 'No tener polaridad', 'Ser enormes'], 'Se usan con bastante margen de tensión.', { c: 'ba_captypes', h: 'Piensa en su punto débil.' }),
      Q('Circuito de 12 V. ¿Qué tensión nominal eliges para su condensador?', ['25 V', '10 V', '12 V justos', 'Da igual'], 'Margen para picos y envejecimiento; en cerámicos, además, pierden menos capacidad.', { c: 'ba_capvolt', h: 'La tensión impresa es un máximo: deja margen.' }),
      G('m6_capType'),
      I('<b>Resumen</b>\n· Cerámico: pequeño y sin polaridad; C0G estable, X7R/Y5V pierden capacidad con la tensión.\n· Electrolítico: mucha capacidad y polaridad; vida ×2 cada 10 °C menos.\n· Tántalo y película para casos concretos. Tensión nominal con margen.')
    ]),
    L('g8', 'Condensadores en serie, en paralelo y su energía', 'cap', ['ba_capcomb', 'ba_capj', 'ba_capshock'], [
      Q('Pones dos condensadores de 100 µF en paralelo. ¿Qué capacidad crees que tendrán juntos?', ['200 µF', '50 µF', '100 µF'], 'En paralelo es como tener una placa más grande: las capacidades se suman. Al revés que las resistencias.', { predict: true, c: 'ba_capcomb', h: 'Más superficie de placa, ¿más o menos carga por voltio?' }),
      I('<b>En paralelo</b> las placas se juntan: es como un condensador con más superficie. Las capacidades <b>se suman</b>: C = C1 + C2. Todos ven la misma tensión.', { svg: parSVG }),
      { t: 'explore', text: 'Dos condensadores y una pila. Cambia el montaje (1 = paralelo, 2 = serie), los valores y la tensión.', viz: 'capComb', params: { C1: { label: 'C1', val: 10, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' }, C2: { label: 'C2', val: 10, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' }, m: { label: 'Montaje (1 = paralelo, 2 = serie)', val: 1, list: [1, 2], dec: 0 }, V: { label: 'Tensión', val: 10, min: 0, max: 50, step: 1, unit: 'V', dec: 0 } },
        tasks: [
          { q: 'Ct', min: 68.5, max: 69.5, text: 'Consigue 69 µF', done: '22 + 47 = 69 µF en paralelo.', hint: 'Paralelo con 22 y 47 µF.' },
          { q: 'Ct', min: 49.5, max: 50.5, text: 'Ahora 50 µF con dos iguales', done: 'Dos de 100 µF en serie: la mitad.', hint: 'Dos de 100 µF y montaje 2.' },
          { q: 'E', min: 1, max: 1000, text: 'Guarda más de 1 julio', done: 'Mucha capacidad y, sobre todo, tensión: la energía va con V².', hint: 'Paralelo con mucha capacidad y sube la tensión.' }
        ] },
      I('<b>En serie</b> es como separar más las placas: la capacidad baja. Se calcula como las resistencias en paralelo: <b>1/C = 1/C1 + 1/C2</b>. Con dos iguales, la mitad.', { svg: serSVG }),
      { t: 'steps', text: '22 µF y 47 µF en serie. ¿Capacidad total?', svg: serSVG, steps: ['Con dos: producto entre suma, como dos resistencias en paralelo.', '22 × 47 = 1034', '22 + 47 = 69', '1034 / 69 ≈ <b>15 µF</b>: menos que el más pequeño'], result: 'Unos 15 µF' },
      Nm('Dos de 10 µF en serie. ¿Capacidad total, en µF?', 5, 'µF', 'Iguales en serie: la mitad.', { c: 'ba_capcomb', h: 'Dos iguales en serie: ¿qué pasa siempre?' }),
      G('m6_capComb'),
      Q('¿Por qué a veces se ponen dos condensadores en serie?', ['Para aguantar más tensión entre los dos', 'Para tener más capacidad', 'Para que no tengan polaridad nunca', 'No se hace nunca'], 'Se reparten la tensión (mejor con una resistencia en paralelo con cada uno para equilibrarla).', { c: 'ba_capcomb', h: 'En serie, la tensión de la pila se reparte entre ellos.' }),
      Q('Un condensador de 16 V y otro de 25 V en paralelo. ¿Hasta qué tensión puedes usar el conjunto?', ['16 V', '25 V', '41 V', '20,5 V'], 'En paralelo los dos ven la misma tensión: manda el más débil.', { c: 'ba_capcomb', h: 'En paralelo, ¿qué tensión ve cada uno?' }),
      I('Un condensador cargado guarda energía: <b>E = ½ · C · V²</b>. Ojo al cuadrado: a doble tensión, cuatro veces más energía.', { svg: energySVG }),
      { t: 'steps', text: '¿Cuánta energía guarda un condensador de 1000 µF a 35 V?', svg: energySVG, steps: ['C en faradios: 1000 µF = 0,001 F', 'V² = 35² = 1225', 'E = ½ × 0,001 × 1225', '<b>E ≈ 0,61 J</b>'], result: 'Unos 0,61 J' },
      G('m6_capJ'),
      Q('¿Por qué un condensador de 1 F y 2,7 V no sustituye a la batería de un móvil?', ['Guarda muy poca energía: ½ × 1 × 2,7² ≈ 3,6 J', 'Porque es más grande', 'Porque no se puede cargar', 'Sí la sustituye'], 'Una batería de móvil guarda decenas de miles de julios.', { c: 'ba_capj', h: 'Calcula la energía y compárala con la de una batería.' }),
      I('Peligro real: los condensadores de los aparatos de red pueden seguir cargados tras desenchufar. Uno de 470 µF a 400 V guarda unos 38 J. Se miden y se descargan con una <b>resistencia</b> antes de tocar.', { svg: dangerSVG, more: 'Para descargar se usa una resistencia de potencia (por ejemplo, de unos kΩ y varios vatios) sujeta con pinzas aisladas, mientras se mira la tensión con el multímetro. Nunca con un destornillador: soltaría toda la energía de golpe.\nEn este curso trabajas con pilas y baja tensión: los aparatos conectados a la red no se abren.' }),
      Nm('¿Cuánta energía guarda un condensador de 470 µF a 400 V, en J?', 37.6, 'J', '½ × 0,00047 × 160 000 = 37,6 J.', { tol: 0.5, c: 'ba_capj', h: 'Eleva 400 al cuadrado antes de multiplicar.' }),
      { t: 'order', q: 'Ordena cómo se descarga con seguridad un condensador grande.', items: ['Desenchufar el aparato y esperar unos minutos', 'Medir la tensión del condensador con el multímetro', 'Descargarlo con una resistencia de potencia y pinzas aisladas', 'Volver a medir: debe marcar casi 0 V', 'Ahora ya se puede trabajar'], e: 'Medir antes y después: nunca des por hecho que está descargado.', c: 'ba_capshock', h: 'Empieza por quitar la alimentación y termina comprobando.' },
      Q('Un flash de cámara carga un condensador a unos 300 V. ¿Por qué es peligroso abrirlo?', ['Guarda energía para una descarga dolorosa o peligrosa, incluso apagado', 'No lo es: está apagado', 'Porque la pila es grande', 'Por la luz'], 'Mide y descarga antes de tocar.', { c: 'ba_capshock', h: '¿Se descarga solo un condensador al apagar el aparato?' }),
      I('<b>Resumen</b>\n· Paralelo: se suman (manda la menor tensión nominal).\n· Serie: 1/C = 1/C1 + 1/C2; aguantan más tensión.\n· <b>E = ½ · C · V²</b>. Los grandes y de alta tensión: medir y descargar.')
    ]),
    L('g4', 'Carga y descarga RC', 'cap', ['rc', 'ba_rcpct'], [
      Q('Cargas un condensador a través de una resistencia. ¿Cómo crees que sube su tensión?', ['Rápido al principio y cada vez más despacio', 'A ritmo constante, en línea recta', 'De golpe, al instante'], 'Al principio entra mucha corriente; cuanto más lleno, menos diferencia queda con la pila y más despacio entra. Vamos a medirlo.', { predict: true, c: 'ba_rcpct', h: 'Piensa en llenar una piscina con una manguera desde un depósito cuyo nivel es fijo.' }),
      I('¿Por qué se frena? La corriente que entra depende de la diferencia de tensión entre la pila y el condensador. Vacío, la diferencia es máxima; casi lleno, casi no queda diferencia y entra muy poca.', { svg: whySVG }),
      { t: 'explore', text: 'Circuito RC: una pila carga el condensador a través de R. Mira la curva y la constante de tiempo τ.', viz: 'rc', params: rcP({ R: { label: 'R', val: 4700, fmt: 'R', min: 1000, max: 100000 }, C: { label: 'C', val: 47, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' } }),
        tasks: [
          { q: 'tau', min: 0.9, max: 1.1, text: 'Consigue τ = 1 s', done: '10 kΩ con 100 µF, o 100 kΩ con 10 µF.', hint: 'Prueba 10 kΩ y busca la capacidad.' },
          { q: 'tau', min: 0.009, max: 0.011, text: 'Ahora τ = 10 ms', done: '1 kΩ con 10 µF: kΩ × µF = ms.', hint: 'Lo más pequeño de los dos.' },
          { q: 'tau', min: 40, max: 1000, text: 'Haz que tarde más de 40 s en llegar al 63 %', done: '100 kΩ y 470 µF: casi un minuto.', hint: 'Lo más grande de los dos.' }
        ] },
      I('La constante de tiempo es <b>τ = R · C</b>. Con ohmios y faradios, salen <b>segundos</b>. Atajo: kΩ × µF = ms.', { svg: tauSVG }),
      { t: 'steps', text: 'R = 4,7 kΩ y C = 47 µF. ¿τ? ¿Y cuándo estará casi cargado?', svg: tauSVG, steps: ['τ = R · C = 4700 Ω × 0,000047 F', '<b>τ ≈ 0,22 s</b> (o 4,7 × 47 ≈ 221 ms)', 'Casi lleno tras 5τ: 5 × 0,22 = <b>1,1 s</b>'], result: 'τ ≈ 0,22 s; casi cargado en algo más de 1 s' },
      Nm('R = 10 kΩ y C = 100 µF. ¿τ, en segundos?', 1, 's', '10 000 × 0,0001 = 1 s.', { c: 'rc', h: 'Multiplica R en ohmios por C en faradios.' }),
      G('m6_tau'),
      I('La regla de oro: tras <b>1τ</b> va por el <b>63 %</b>; tras 2τ, 86 %; 3τ, 95 %; y tras <b>5τ</b>, prácticamente lleno (99 %).', { svg: tableSVG }),
      G('m6_rcPct'),
      Q('τ = 0,2 s. ¿Cuánto tarda en cargarse casi del todo?', ['Alrededor de 1 s', '0,2 s', '0,4 s', '20 s'], '5τ = 5 × 0,2 = 1 s.', { c: 'ba_rcpct', h: 'Casi lleno = 5τ.' }),
      I('La <b>descarga</b> es la imagen en espejo: tras 1τ queda el <b>37 %</b>, tras 2τ el 14 %, tras 3τ el 5 %…', { svg: fallSVG }),
      Q('En la descarga, tras 1τ queda…', ['El 37 %', 'El 63 %', 'Nada', 'El 50 %'], 'Pierde el 63 % y queda el 37 %.', { c: 'ba_rcpct', h: 'Si en la carga gana un 63 %, en la descarga pierde un 63 %.' }),
      Nm('Un condensador cargado a 10 V se descarga. ¿Qué tensión le queda tras 2τ, en V?', 1.4, 'V', 'Tras 2τ queda el 14 %: 10 × 0,14 = 1,4 V.', { tol: 0.1, c: 'ba_rcpct', h: 'Busca el porcentaje que queda tras 2τ en la tabla de descarga.' }),
      Q('Duplicas el condensador con la misma resistencia. ¿Qué le pasa a τ?', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'τ = R · C: proporcional a C.', { c: 'rc', h: 'Mira la fórmula de τ.' }),
      I('<b>Resumen</b>\n· Sube rápido y luego despacio: <b>τ = R · C</b> (Ω · F = s).\n· Carga: 63 % en 1τ, 99 % en 5τ.\n· Descarga: queda el 37 % en 1τ.')
    ]),
    L('g5', 'Las matemáticas de la curva RC', 'cap', ['ba_exp', 'ba_rcform'], [
      Q('Cada τ, el condensador recorre el 63 % de lo que le falta. Tras 1τ va por el 63 %. ¿Por dónde irá tras 2τ?', ['Por el 86 %', 'Por el 100 %', 'Por el 126 %'], 'Le faltaba un 37 %; recorre el 63 % de eso (un 23 %): 63 + 23 = 86 %. Nunca llega del todo.', { predict: true, c: 'ba_exp', h: 'No sumes 63 + 63: recorre el 63 % de lo que le FALTA.' }),
      I('Cuando algo cambia en proporción a lo que le queda (el condensador, el agua de un depósito que se vacía, el café que se enfría), sigue una curva <b>exponencial</b>. Su número es <b>e ≈ 2,718</b>.', { svg: stairSVG, more: 'e aparece siempre que la rapidez de un cambio es proporcional a la cantidad: intereses compuestos, desintegración radiactiva, enfriamiento… En la calculadora está como «e^x» (o «exp»).' }),
      { t: 'explore', text: 'Mueve el tiempo, en múltiplos de τ. La curva ámbar es la carga y la azul, la descarga.', viz: 'expCurve', params: expP(0.2),
        tasks: [
          { q: 'up', min: 49, max: 51, text: 'Busca cuándo la carga llega al 50 %', done: 'Hacia 0,7τ: es justo donde se cruzan las dos curvas.', hint: 'Un poco antes de 1τ.' },
          { q: 'down', min: 4.5, max: 5.5, text: 'Busca cuándo a la descarga solo le queda un 5 %', done: 'En 3τ: e^(−3) ≈ 0,05.', hint: 'Entre 2τ y 4τ.' },
          { q: 'up', min: 99, max: 100, text: 'Haz que la carga pase del 99 %', done: 'Hacia 4,6τ: por eso se dice «5τ, prácticamente lleno».', hint: 'Al final de la gráfica.' }
        ] },
      I('La pieza clave es <b>e^(−x)</b>: e^(−1) ≈ 0,37, e^(−2) ≈ 0,14, e^(−3) ≈ 0,05. Es justo lo que queda en una descarga tras 1, 2 y 3τ.', { svg: eSVG }),
      G('m6_exp'),
      I('Con eso salen las fórmulas:\n· Carga: <b>Vc = V · (1 − e^(−t/τ))</b>\n· Descarga: <b>Vc = V · e^(−t/τ)</b>', { svg: formSVG }),
      { t: 'steps', text: 'Un condensador se carga hacia 9 V con τ = 1 s. ¿Qué tensión tiene tras 1 s?', svg: formSVG, steps: ['t/τ = 1 s / 1 s = <b>1</b>', 'e^(−1) ≈ <b>0,368</b>', '1 − 0,368 = 0,632 (el 63 %)', 'Vc = 9 × 0,632 ≈ <b>5,69 V</b>'], result: '5,69 V' },
      Nm('9 V, τ = 1 s. ¿Tensión tras 1 s de carga, en V?', 5.69, 'V', '9 × (1 − 0,368).', { tol: 0.1, c: 'ba_rcform', h: 'Carga: V · (1 − e^(−t/τ)), con t/τ = 1.' }),
      Nm('Un condensador cargado a 10 V se descarga con τ = 0,5 s. ¿Tensión tras 1 s, en V?', 1.35, 'V', 't/τ = 2; 10 × e^(−2) ≈ 10 × 0,135 = 1,35 V.', { tol: 0.06, c: 'ba_rcform', h: 'Calcula t/τ primero: 1 s entre 0,5 s.' }),
      I('Al revés: ¿cuánto tarda en llegar a un valor? Se usa <b>ln</b>, la operación inversa de e^x. Para la mitad: <b>t = τ · ln 2 ≈ 0,69 · τ</b>.', { svg: halfSVG, more: 'ln(x) responde: «¿a qué exponente hay que elevar e para obtener x?». ln 2 ≈ 0,693 porque e^0,693 ≈ 2. En la calculadora, tecla «ln».\nEste 0,69 aparecerá en las fórmulas del temporizador 555.' }),
      Q('¿Cuánto tarda (en τ) un condensador en cargarse a la mitad?', ['Unos 0,7τ', '1τ', '0,5τ', '2τ'], 'ln 2 ≈ 0,69.', { c: 'ba_rcform', h: 'Mira la gráfica: ¿dónde se cruzan carga y descarga?' }),
      Nm('Con τ = 10 ms, ¿cuántos ms tarda en cargarse a la mitad?', 6.9, 'ms', '0,69 × 10 ms.', { tol: 0.1, c: 'ba_rcform', h: 'La mitad llega en 0,69 · τ.' }),
      G('m6_rcForm'),
      I('<b>Resumen</b>\n· Lo que cambia en proporción a lo que queda es exponencial (e ≈ 2,718).\n· Carga: V · (1 − e^(−t/τ)). Descarga: V · e^(−t/τ).\n· Mitad en 0,69τ (ln 2).')
    ]),
    L('g6', 'Bobinas y relés', 'cap', ['ba_coil', 'ba_kick', 'ba_relay'], [
      Q('Por una bobina pasa corriente y abres el interruptor de golpe. ¿Qué crees que pasa?', ['Aparece un pico de tensión muy alto, a veces con chispa', 'La corriente se para y no pasa nada más', 'La bobina sigue dando corriente durante horas'], 'La bobina «se resiste» a que la corriente cambie: al cortarla, su tensión se dispara hasta que salta una chispa.', { predict: true, c: 'ba_kick', h: 'Una bobina se opone a los cambios de corriente.' }),
      I('Una <b>bobina</b> es hilo enrollado. Al pasar corriente crea un campo magnético (es un electroimán) y guarda energía en él. Su gran rasgo: <b>se opone a los cambios de corriente</b>, como un volante de inercia.', { svg: coilSVG }),
      I('Es la pareja del condensador: el condensador se opone a los cambios de <b>tensión</b>; la bobina, a los de <b>corriente</b>. Con corriente continua constante, una bobina es casi un cable.', { svg: vsSVG }),
      { t: 'explore', text: 'Una bobina de 100 mH alimentada a través de un interruptor. Elige la corriente y lo rápido que se corta al abrir.', viz: 'coilKick', params: { I: { label: 'Corriente', val: 0.5, min: 0.1, max: 1, step: 0.1, unit: 'A', dec: 1 }, tc: { label: 'Tiempo que tarda en cortarse', val: 1, list: [100, 10, 1, 0.1, 0.01], unit: 'ms', dec: 2 } },
        tasks: [
          { q: 'Vpk', min: 0, max: 10, text: 'Corta sin que el pico pase de 10 V', done: 'Un corte lento (o poca corriente) da un pico pequeño.', hint: 'Haz que el corte tarde más.' },
          { q: 'spark', min: 1, max: 1, text: 'Ahora haz saltar una chispa', done: 'Un corte brusco da cientos de voltios: suficiente para saltar por el aire entre los contactos.', hint: 'Corte muy rápido.' }
        ] },
      I('Al abrir de golpe, la bobina intenta mantener la corriente y su tensión sube hasta que la corriente encuentra camino: una <b>chispa</b>. Así funciona la bujía de un coche, y así se estropean los contactos de los interruptores.', { svg: sparkSVG, more: 'Ese pico puede romper lo que controla la bobina. Más adelante, con los diodos y los transistores, verás cómo se le da un camino seguro.' }),
      Q('¿A qué se opone una bobina?', ['A los cambios de corriente', 'A la corriente continua', 'A la luz', 'Al calor'], 'Como un volante de inercia.', { c: 'ba_coil', h: 'Compárala con el condensador.' }),
      Q('Por una bobina ya pasa una corriente continua constante. ¿Cómo se comporta?', ['Casi como un cable', 'Como un circuito abierto', 'Como una pila', 'Como un condensador'], 'Sin cambios de corriente, no reacciona: solo queda la pequeña resistencia del hilo.', { c: 'ba_coil', h: 'Si la corriente no cambia, ¿tiene algo a lo que oponerse?' }),
      Q('Cortas la misma corriente diez veces más rápido. El pico de tensión…', ['Es mucho mayor', 'Es menor', 'Es igual', 'Desaparece'], 'Más rápido el cambio, más fuerte la reacción.', { c: 'ba_kick', h: 'Recuerda el reto de la chispa.' }),
      Q('¿Por qué saltan chispas al abrir el interruptor de un motor en marcha?', ['Sus bobinados dan un pico de tensión al cortar la corriente', 'Porque el motor tiene una pila dentro', 'Por la electricidad estática', 'Porque el interruptor está mal'], 'Un motor está lleno de bobinas.', { c: 'ba_kick', h: '¿Qué hay dentro de un motor?' }),
      I('Un <b>relé</b> es un interruptor movido por un electroimán. Con corriente en la bobina, la lámina común (COM) pasa del contacto <b>NC</b> (normalmente cerrado) al <b>NA</b> (normalmente abierto).', { svg: relayAnim }),
      { t: 'steps', text: '¿Qué pasa dentro de un relé cuando lo activas?', svg: relayAnim, steps: ['Pasa corriente por la bobina: se convierte en un <b>imán</b>.', 'El imán atrae la lámina móvil (el común).', 'El común se separa de NC y toca <b>NA</b>: el segundo circuito se cierra. ¡Clic!', 'Al quitar la corriente, un muelle devuelve la lámina a NC.'], result: 'Una corriente pequeña mueve un interruptor de otro circuito.' },
      { t: 'match', q: 'Une cada parte del relé con lo que hace.', pairs: [['Bobina', 'El electroimán que mueve la lámina'], ['Común (COM)', 'La lámina que se mueve'], ['NA', 'Se une al común solo con la bobina activada'], ['NC', 'Unido al común en reposo']], c: 'ba_relay', h: 'N de «normalmente»: así está cuando la bobina no tiene corriente.' },
      Q('¿Qué ventaja principal tiene un relé?', ['Aísla el circuito de control del de la carga y conmuta corrientes grandes', 'Es silencioso', 'No consume nada', 'Funciona sin alimentación'], 'Los dos circuitos solo los une el imán.', { c: 'ba_relay', h: 'Piensa en qué une a los dos circuitos.' }),
      Nm('La bobina de un relé de 5 V tiene 70 Ω. ¿Cuánta corriente pide, en mA?', 71, 'mA', '5 / 70 ≈ 0,071 A = 71 mA.', { tol: 1, c: 'ba_relay', h: 'La bobina, en continua, es una resistencia: aplica la ley de Ohm.' }),
      I('<b>Resumen</b>\n· Bobina: hilo enrollado, campo magnético; se opone a los cambios de corriente.\n· Al cortarla de golpe: pico de tensión y chispa.\n· Relé: electroimán que mueve un interruptor (COM, NA, NC) y aísla los circuitos.')
    ]),
    L('g9', 'La bobina a fondo', 'cap', ['ba_vldi', 'ba_taurl', 'ba_coilj', 'ba_coilsat'], [
      Q('En una bobina, la corriente sube 1 A en 1 ms. Si haces que suba ese mismo amperio en 0,1 ms, ¿qué crees que pasa con su tensión?', ['Se multiplica por 10', 'Se divide entre 10', 'No cambia'], 'La tensión depende de lo rápido que cambia la corriente: diez veces más rápido, diez veces más tensión.', { predict: true, c: 'ba_vldi', h: 'Recuerda el reto de la chispa: ¿qué la provocaba?' }),
      I('Esa oposición se mide con la <b>inductancia</b> L, en <b>henrios</b> (H); lo normal son µH y mH. La tensión de una bobina es <b>V = L · ΔI / Δt</b>: inductancia por lo rápido que cambia la corriente.', { svg: lformSVG, more: 'L crece con el cuadrado del número de vueltas y con el núcleo: uno de ferrita o hierro la multiplica.\n1 H: si la corriente cambia 1 A cada segundo, aparece 1 V.' }),
      { t: 'explore', text: 'La corriente de la bobina sube ΔI en un tiempo Δt. Mira qué tensión aparece.', viz: 'vldi', params: { L: { label: 'L', val: 10, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, dI: { label: 'ΔI', val: 0.5, min: 0.1, max: 2, step: 0.1, unit: 'A', dec: 1 }, dt: { label: 'Δt', val: 1, list: [0.01, 0.1, 1, 10, 100], unit: 'ms', dec: 2 } },
        tasks: [
          { q: 'V', min: 9.99, max: 10.01, text: 'Consigue justo 10 V', done: '10 mH, 1 A en 1 ms: 0,01 × 1 / 0,001 = 10 V.', hint: 'Con 10 mH y 1 ms, ¿qué ΔI necesitas?' },
          { q: 'V', min: 100, max: 1e9, text: 'Ahora más de 100 V', done: 'Un cambio muy rápido o una bobina grande: así nace el pico al cortar.', hint: 'Acorta Δt.' },
          { q: 'V', min: 0, max: 0.5, text: 'Y ahora menos de 0,5 V', done: 'Cambios lentos y bobinas pequeñas apenas dan tensión.', hint: 'Bobina pequeña y Δt largo.' }
        ] },
      { t: 'steps', text: 'Bobina de 10 mH; la corriente sube 1 A en 1 ms. ¿Qué tensión aparece?', svg: lformSVG, steps: ['Fórmula: <b>V = L · ΔI / Δt</b>', 'En unidades base: L = 0,01 H; ΔI = 1 A; Δt = 0,001 s', 'V = 0,01 × 1 / 0,001', '<b>V = 10 V</b>'], result: '10 V' },
      Nm('Bobina de 100 mH; la corriente sube 0,2 A en 2 ms. ¿Tensión, en V?', 10, 'V', '0,1 × 0,2 / 0,002 = 10 V.', { c: 'ba_vldi', h: 'Pasa mH a H y ms a s antes de calcular.' }),
      Q('¿Qué aumenta la inductancia de una bobina?', ['Más vueltas y un núcleo de ferrita o hierro', 'Hilo más grueso', 'Menos vueltas', 'Más corriente'], 'L crece con el cuadrado del número de vueltas y con el material del núcleo.', { c: 'ba_vldi', h: 'Piensa en cómo se hace un electroimán más fuerte.' }),
      I('Con una resistencia y una pila, la corriente no aparece de golpe: sube como la carga de un condensador, con <b>τ = L / R</b> (henrios entre ohmios = segundos). Tras 5τ ya vale V / R.', { tune: { viz: 'rlCurrent', params: rlP(100, 100) } }),
      { t: 'explore', text: 'Bobina y resistencia con una pila de 5 V. La línea continua es la corriente; la discontinua, la tensión en la bobina.', viz: 'rlCurrent', params: rlP(470, 100),
        tasks: [
          { q: 'tauMs', min: 0.9, max: 1.1, text: 'Consigue τ = 1 ms', done: '10 mH con 10 Ω, 100 mH con 100 Ω o 1 H con 1 kΩ.', hint: 'τ = L / R: busca una pareja con la misma cifra.' },
          { q: 'If', min: 0.2, max: 10, text: 'Haz que la corriente final pase de 200 mA', done: 'La corriente final la pone solo la resistencia: 5 V / R.', hint: 'Baja la resistencia.' },
          { q: 'tauMs', min: 50, max: 1e6, text: 'Ahora haz que sea muy lenta: τ de más de 50 ms', done: 'Bobina grande y resistencia pequeña. Al revés que en RC: más R, más rápido.', hint: 'L al máximo y R pequeña.' }
        ] },
      G('m6_tauRL'),
      Q('En un circuito RL, subes la resistencia. La corriente llega a su valor final…', ['Más rápido (pero el valor final es menor)', 'Más despacio', 'Igual de rápido', 'Nunca'], 'τ = L / R: al revés que en RC.', { c: 'ba_taurl', h: 'En RL, R divide.' }),
      I('La bobina guarda energía en su campo magnético: <b>E = ½ · L · I²</b>. Al cortar la corriente, esa energía tiene que salir: es el pico que viste.', { svg: ljSVG }),
      G('m6_coilJ'),
      I('<b>Saturación</b>: un núcleo de ferrita solo admite cierto campo. Por encima de su <b>corriente de saturación</b> (Isat), la inductancia se desploma. Las bobinas de potencia dan también una corriente <b>térmica</b>: la que las calienta unos grados.', { svg: satSVG }),
      Q('Una bobina de 22 µH tiene Isat = 3 A. Por ella pasan picos de 4 A. ¿Qué pasa?', ['Se satura: la inductancia cae y la corriente se dispara', 'Nada', 'Da más inductancia', 'Baja la corriente'], 'Elige siempre Isat por encima del pico.', { c: 'ba_coilsat', h: 'Compara el pico con Isat.' }),
      Q('¿Qué tienen en común la bobina y el condensador?', ['Los dos guardan energía y tienen constante de tiempo', 'Nada', 'Los dos bloquean la continua', 'Los dos tienen polaridad'], 'El condensador se opone a cambios de tensión; la bobina, a cambios de corriente.', { c: 'ba_coilj', h: 'Compara ½ · C · V² con ½ · L · I² y τ = RC con τ = L/R.' }),
      I('<b>Resumen</b>\n· <b>V = L · ΔI / Δt</b>, con L en henrios.\n· RL: <b>τ = L / R</b>. Energía: <b>½ · L · I²</b>.\n· No pases de Isat.', { more: 'Para que el pico al cortar una bobina no dañe nada se le da un camino con un diodo (diodo de rueda libre): lo verás con los diodos y los transistores.' })
    ]),
    SIM('s3', 'Reto: luz que se apaga despacio', 'El LED se enciende al pulsar y sigue al menos 1 s tras soltar.', { battery: 9, parts: ['push', 'cap', 'res', 'led'], sch: 'rcDelay', hint: 'El pulsador carga el condensador; el condensador alimenta el LED por la resistencia.' }, 'afterglow'),
    PRJ('p3', 'Proyecto: luz de cortesía', 'courtesy')
  ] });
})();
