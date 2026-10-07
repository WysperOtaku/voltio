/* Voltio · curso base, módulo 1b: Tu primer circuito.
   b20 las piezas (LED, interruptor, pulsador, resistencia como pieza) · e1 símbolos · b6 abierto, cerrado y
   cortocircuito · e3 leer esquemas (uniones y cruces) · e4 convenciones (masa, etiquetas) · e5 protoboard ·
   e6 del esquema a la protoboard. Todavía sin ley de Ohm ni cálculo de la resistencia del LED. */
(() => {
  const { num, st, batt, resBody, ledBulb, flowPath } = Widgets.H;
  const inner = spec => Schem.draw(spec).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const schFlow = (k, pts, w) => Schem.draw(SCH[k], w ? { width: w } : {}).replace('</svg>', `<polyline points="${pts}" fill="none" stroke="var(--led)" stroke-width="3" stroke-opacity=".85" class="a-flow-slow"/></svg>`);

  /* ===================== ESQUEMAS PROPIOS ===================== */
  Object.assign(SCH, {
    // La linterna dibujada con símbolos de masa y +9 V (e4)
    ba_flashGnd: { w: 300, h: 150, parts: [{ k: 'vcc', x: 30, y: 30, lab2: '+9 V' }, { k: 'bat', x: 30, y: 85, rot: 90, lab: '9 V', lx: 18, ly: 4 }, { k: 'gnd', x: 30, y: 137 }, { k: 'vcc', x: 90, y: 13, lab2: '+9 V' }, { k: 'sw', x: 130, y: 25, lab: 'S1' }, { k: 'res', x: 210, y: 25, lab: 'R1' }, { k: 'led', x: 260, y: 75, rot: 90, lab: 'D1' }, { k: 'gnd', x: 260, y: 127 }],
      wires: [[30, 42, 30, 55], [30, 115, 30, 125], [90, 25, 100, 25], [160, 25, 180, 25], [240, 25, 260, 25, 260, 45], [260, 105, 260, 115]] }
  });

  /* ===================== VISUALIZACIONES ===================== */
  const swLever = (x, y, closed) => `<circle cx="${x - 16}" cy="${y}" r="3" fill="currentColor"/><circle cx="${x + 16}" cy="${y}" r="3" fill="currentColor"/><path d="M${x - 16} ${y}L${x + 15} ${closed ? y : y - 15}" ${st} stroke-width="3"/>`;
  const glow = (x, y, on) => on ? `<circle cx="${x}" cy="${y}" r="16" fill="var(--led)" opacity=".45" class="a-pulse"/>` : '';
  const V0 = { w: 280, h: 140, parts: [{ k: 'bat', x: 30, y: 75, rot: 90, lab: '9 V', lx: 16, ly: 4 }, { k: 'sw', x: 100, y: 25, lab: 'S1' }, { k: 'res', x: 180, y: 25, lab: 'R1' }, { k: 'led', x: 250, y: 75, rot: 90, lab: 'D1', lx: -14, ly: 4 }], wires: [[30, 45, 30, 25, 70, 25], [130, 25, 150, 25], [210, 25, 250, 25, 250, 45], [250, 105, 250, 130, 30, 130, 30, 105]] };
  const V1 = { w: 280, h: 140, parts: [{ k: 'bat', x: 30, y: 75, rot: 90, lab: '9 V', lx: 16, ly: 4 }, { k: 'gnd', x: 30, y: 127 }, { k: 'sw', x: 100, y: 25, lab: 'S1' }, { k: 'res', x: 180, y: 25, lab: 'R1' }, { k: 'led', x: 250, y: 75, rot: 90, lab: 'D1', lx: -14, ly: 4 }, { k: 'gnd', x: 250, y: 127 }], wires: [[30, 45, 30, 25, 70, 25], [130, 25, 150, 25], [210, 25, 250, 25, 250, 45], [250, 105, 250, 115], [30, 105, 30, 115]] };
  const V2 = { w: 280, h: 140, parts: [{ k: 'vcc', x: 30, y: 30, lab2: 'LUZ' }, { k: 'bat', x: 30, y: 85, rot: 90, lab: '9 V', lx: 16, ly: 4 }, { k: 'gnd', x: 30, y: 135 }, { k: 'vcc', x: 80, y: 13, lab2: 'LUZ' }, { k: 'sw', x: 120, y: 25, lab: 'S1' }, { k: 'res', x: 195, y: 25, lab: 'R1' }, { k: 'led', x: 250, y: 75, rot: 90, lab: 'D1', lx: -14, ly: 4 }, { k: 'gnd', x: 250, y: 127 }], wires: [[30, 42, 30, 55], [30, 115, 30, 123], [80, 25, 90, 25], [150, 25, 165, 25], [225, 25, 250, 25, 250, 45], [250, 105, 250, 115]] };
  const SYM = { 1: ['bat', 'Pila', 'Raya larga: +. Raya corta: −.'], 2: ['res', 'Resistencia', 'Un zigzag (en Europa, a veces un rectángulo).'], 3: ['led', 'LED', 'Triángulo y raya; las flechas: emite luz.'], 4: ['sw', 'Interruptor', 'Una palanca que se queda abierta o cerrada.'], 5: ['push', 'Pulsador', 'Un puente que solo cierra mientras aprietas.'], 6: ['gnd', 'Masa (GND)', 'El punto de 0 V, la referencia.'], 7: ['lamp', 'Bombilla', 'Un círculo con un aspa.'] };
  const REAL = {
    1: '<rect x="20" y="40" width="90" height="44" rx="6" fill="#2F3B52"/><rect x="110" y="52" width="8" height="20" rx="2" fill="#C9B183"/><text x="98" y="66" font-size="16" fill="#fff">+</text><text x="26" y="66" font-size="16" fill="#fff">−</text>',
    2: `<path d="M14 62H44M106 62H136" stroke="#9AA3B2" stroke-width="4"/><g transform="translate(75 62) scale(1.5)">${resBody()}</g>`,
    3: '<path d="M60 70V40a15 15 0 0 1 30 0v30z" fill="#FF3B30" opacity=".85"/><rect x="56" y="68" width="38" height="6" rx="2" fill="#E0332A"/><path d="M66 74v40M84 74v28" stroke="#9AA3B2" stroke-width="3"/><text x="48" y="122" class="vizsm">larga +</text>',
    4: '<rect x="30" y="50" width="90" height="30" rx="6" fill="#3A4660"/><rect x="62" y="40" width="22" height="18" rx="3" fill="#E7EBF0"/><path d="M50 80v18M75 80v18M100 80v18" stroke="#9AA3B2" stroke-width="3"/>',
    5: '<rect x="45" y="48" width="56" height="40" rx="5" fill="#3A4660"/><circle cx="73" cy="68" r="12" fill="#E5484D"/><path d="M52 88v14M94 88v14" stroke="#9AA3B2" stroke-width="3"/>',
    6: '<path d="M30 70H120" stroke="currentColor" stroke-width="3"/><text x="40" y="60" class="vizsm">el − de la pila</text><text x="40" y="92" class="vizsm">(0 V)</text>',
    7: '<circle cx="75" cy="52" r="24" fill="#FFE9A6" stroke="#C9A227"/><rect x="63" y="76" width="24" height="16" fill="#9AA3B2"/><path d="M66 52q9 -12 18 0" stroke="#C9A227" fill="none"/>'
  };
  Object.assign(Widgets.VIZ, {
    // b20: pila de 9 V, interruptor, resistencia y LED (que puede ir del revés o quemarse)
    ledPiece: {
      calc: p => { const on = p.sw && !p.flip, I = on ? Math.max(0, 7 / (p.R + 15)) : 0, burnt = I > 0.05 ? 1 : 0, b = Math.min(1, I / 0.015), lit = on && !burnt && I > 0.0005 ? 1 : 0; return { I, burnt, b, lit, dim: lit && b < 0.35 ? 1 : 0 }; },
      svg: (p, o) => {
        const msg = !p.sw ? 'Interruptor abierto: el camino está cortado' : p.flip ? 'LED del revés: no deja pasar la corriente' : o.burnt ? `💨 ¡Quemado! Casi sin freno pasan ${num(o.I * 1000, 0)} mA` : `Encendido: pasan ${num(o.I * 1000, 1)} mA`;
        const legs = p.flip ? '<path d="M-6 13v12M6 13v6" stroke="#9AA3B2" stroke-width="2.5"/>' : '<path d="M-6 13v6M6 13v12" stroke="#9AA3B2" stroke-width="2.5"/>';
        return `<svg viewBox="0 0 300 175" class="viz">${flowPath('M50 40H250V130H50Z', o.lit ? o.I : 0, 0.02)}${batt(50, 85, 9)}
          <rect x="88" y="26" width="44" height="28" rx="6" fill="var(--surface)"/>${swLever(110, 40, p.sw)}<text x="110" y="20" text-anchor="middle" class="vizsm">${p.sw ? 'cerrado' : 'abierto'}</text>
          <g transform="translate(185 40)">${p.R ? resBody() : '<path d="M-20 0H20" stroke="currentColor" stroke-width="3"/>'}</g><text x="185" y="20" text-anchor="middle" class="vizsm">${p.R ? Widgets.H.fR(p.R) : 'sin resistencia'}</text>
          <g transform="translate(250 85)"><rect x="-26" y="-30" width="52" height="64" fill="var(--surface)"/>${ledBulb(o.burnt ? 0 : o.b, o.burnt)}${legs}<text x="0" y="44" text-anchor="middle" class="vizsm">${p.flip ? 'pata larga abajo' : 'pata larga arriba'}</text></g>
          <text x="150" y="168" text-anchor="middle" class="vizlab" style="fill:${o.burnt ? 'var(--err)' : o.lit ? 'var(--ok)' : 'currentColor'}">${msg}</text></svg>`;
      }
    },
    // e1: una pieza real junto a su símbolo
    symCard: {
      calc: p => ({ k: p.k }),
      svg: p => {
        const [k, name, note] = SYM[p.k];
        return `<svg viewBox="0 0 300 170" class="viz"><text x="150" y="20" text-anchor="middle" class="vizlab" style="font-size:15px">${name}</text>
          <g transform="translate(0 20)">${REAL[p.k]}</g><text x="75" y="150" text-anchor="middle" class="vizsm">la pieza</text>
          <path d="M150 40V140" stroke="var(--line)"/>${Schem.symbol(k).replace('<svg ', '<svg x="160" y="34" height="100" ')}
          <text x="225" y="150" text-anchor="middle" class="vizsm">su símbolo</text><text x="150" y="166" text-anchor="middle" class="vizsm">${note}</text></svg>`;
      }
    },
    // b6: circuito abierto, cerrado, en cortocircuito y con fusible
    circuitState: {
      calc: p => { const short = p.sc && !p.fu ? 1 : 0, blown = p.sc && p.fu ? 1 : 0, lit = p.sw && !p.sc ? 1 : 0; return { short, safe: blown, lit }; },
      svg: (p, o) => {
        const fuse = p.fu ? (o.safe ? '<rect x="62" y="32" width="26" height="16" rx="3" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><path d="M66 40h6M78 40h6" stroke="var(--err)" stroke-width="2.5"/><text x="75" y="24" text-anchor="middle" class="vizsm" style="fill:var(--err)">fundido</text>' : '<rect x="62" y="32" width="26" height="16" rx="3" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><path d="M64 40h22" stroke="currentColor" stroke-width="1.5"/><text x="75" y="24" text-anchor="middle" class="vizsm">fusible</text>') : '';
        const flowI = o.short ? 1 : o.lit ? 0.015 : 0;
        const msg = o.short ? '¡Corto! Corriente enorme: todo se calienta' : o.safe ? 'El fusible se ha fundido: circuito abierto y a salvo' : o.lit ? 'Circuito cerrado: el LED luce' : 'Circuito abierto: no pasa nada';
        return `<svg viewBox="0 0 300 180" class="viz">${flowPath(o.short ? 'M40 40H120V140H40' : 'M40 40H260V140H40Z', o.safe ? 0 : flowI, 0.02)}${batt(40, 90, 9)}${fuse}
          ${p.sc ? `<path d="M120 40V140" stroke="${o.short ? '#FF5A1F' : 'var(--muted)'}" stroke-width="${o.short ? 5 : 3}" ${o.short ? 'class="a-pulse"' : ''}/><text x="126" y="96" class="vizsm" style="fill:${o.short ? 'var(--err)' : 'var(--muted)'}">corto</text>` : ''}
          ${o.short ? '<text x="14" y="128" font-size="16" class="a-bob">🔥</text>' : ''}
          <rect x="146" y="26" width="48" height="28" rx="6" fill="var(--surface)"/>${swLever(170, 40, p.sw)}<g transform="translate(225 40)">${resBody()}</g>
          <g transform="translate(260 95)"><rect x="-24" y="-26" width="48" height="52" fill="var(--surface)"/>${ledBulb(o.lit ? 1 : 0)}</g>
          <text x="150" y="172" text-anchor="middle" class="vizlab" style="fill:${o.short ? 'var(--err)' : o.safe ? 'var(--ok)' : 'currentColor'}">${msg}</text></svg>`;
      }
    },
    // e3: un cable que cruza con o sin punto
    crossDot: {
      calc: p => ({ one: p.sw && !p.dot ? 1 : 0, both: p.sw && p.dot ? 1 : 0 }),
      svg: (p, o) => {
        const spec = { w: 280, h: 140, parts: [{ k: 'bat', x: 30, y: 75, rot: 90, lab: '9 V', lx: 16, ly: 4 }, { k: p.sw ? 'node' : 'sw', x: 90, y: 25, lab: 'S1' }, { k: 'res', x: 220, y: 25, lab: 'R1' }, { k: 'led', x: 260, y: 85, rot: 90, lab: 'D1', lx: -14, ly: 4 }, { k: 'res', x: 160, y: 70, rot: 90, lab: 'R2', lx: -12 }, { k: 'led', x: 160, y: 115, rot: 90, lab: 'D2', lx: -12, ly: 4 }],
          wires: [[30, 45, 30, 25, 60, 25], [120, 25, 190, 25], [250, 25, 260, 25, 260, 55], [260, 115, 260, 140, 30, 140, 30, 105], [160, 40, 160, 6], [160, 100, 160, 85], [160, 145, 160, 140]] };
        if (p.sw) spec.wires.push([60, 25, 120, 25]);
        return `<svg viewBox="0 0 300 175" class="viz"><g transform="translate(10 6)">${inner(spec)}${p.dot ? '<circle cx="160" cy="25" r="5" fill="currentColor"/>' : '<path d="M152 25a8 8 0 0 1 16 0" fill="var(--surface)" stroke="none"/>'}${glow(260, 85, o.one || o.both)}${glow(160, 115, o.both)}</g>
          <text x="150" y="172" text-anchor="middle" class="vizlab">${p.dot ? 'Con punto: los cables están unidos' : 'Sin punto: el cable de D2 solo cruza'}</text></svg>`;
      }
    },
    // e4: el mismo circuito dibujado de tres formas
    gndMerge: {
      calc: p => ({ lit: p.sw ? 1 : 0, m1lit: p.m === 1 && p.sw ? 1 : 0, m2lit: p.m === 2 && p.sw ? 1 : 0 }),
      svg: p => {
        const spec = JSON.parse(JSON.stringify([V0, V1, V2][p.m]));
        if (p.sw) { const s = spec.parts.find(x => x.k === 'sw'); s.k = 'node'; spec.wires.push([s.x - 30, 25, s.x + 30, 25]); }
        return `<svg viewBox="0 0 300 180" class="viz"><g transform="translate(10 14)">${inner(spec)}${glow(250, 75, p.sw)}</g>
          <text x="150" y="172" text-anchor="middle" class="vizlab">${['Con todos los cables', 'Con símbolos de masa: todos son el mismo punto', 'Con etiquetas: LUZ y LUZ están unidos'][p.m]}</text></svg>`;
      }
    },
    // e5: la protoboard con rayos X y una resistencia que se puede puentear
    bbXray: {
      calc: p => ({ xr: p.xr, same: p.a === p.b ? 1 : 0, gap: Math.abs(p.a - p.b) }),
      svg: (p, o) => {
        const X = c => 30 + (c - 1) * 26, rows = 'abcde';
        let s = '<rect x="10" y="10" width="280" height="150" rx="8" fill="#F1EEE6" stroke="#CFC8B8"/><path d="M18 20H282" stroke="#E5484D" stroke-width="2"/><path d="M18 40H282" stroke="#3E8FCB" stroke-width="2"/>';
        if (p.xr) { for (let c = 1; c <= 10; c++) s += `<rect x="${X(c) - 7}" y="58" width="14" height="96" rx="3" fill="${c === p.a || c === p.b ? '#F2A900' : '#B7BCC4'}" opacity=".8"/>`; s += '<rect x="18" y="26" width="264" height="8" rx="3" fill="#B7BCC4" opacity=".8"/>'; }
        for (let c = 1; c <= 10; c++) { s += `<text x="${X(c)}" y="54" text-anchor="middle" font-size="9" fill="#5B6782">${c}</text>`; for (let r = 0; r < 5; r++) s += `<rect x="${X(c) - 3}" y="${66 + r * 18}" width="6" height="6" rx="1" fill="#2F2A20" opacity=".75"/>`; s += `<rect x="${X(c) - 3}" y="27" width="6" height="6" rx="1" fill="#2F2A20" opacity=".75"/>`; }
        const xa = X(p.a), xb = X(p.b), y = 105, mid = (xa + xb) / 2;
        s += `<path d="M${xa} ${y}V${y - 22}H${xb}V${y}" stroke="#9AA3B2" stroke-width="3" fill="none"/><g transform="translate(${mid} ${y - 22})">${resBody()}</g><circle cx="${xa}" cy="${y}" r="4" fill="#9AA3B2"/><circle cx="${xb}" cy="${y}" r="4" fill="#9AA3B2"/>`;
        const msg = o.same ? 'Misma tira: ¡puenteada, no hace nada!' : `Cada pata en su columna (${p.a} y ${p.b}): bien`;
        return `<svg viewBox="0 0 300 190" class="viz">${s}<text x="150" y="182" text-anchor="middle" class="vizlab" style="fill:${o.same ? 'var(--err)' : 'currentColor'}">${msg}</text></svg>`;
      }
    },
    // e6: la linterna en la protoboard; hay que pinchar bien el LED
    bbMap: {
      calc: p => ({ lit: p.A === 5 && p.K === 8 ? 1 : 0, rev: p.A === 8 && p.K === 5 ? 1 : 0 }),
      svg: (p, o) => {
        const X = c => 30 + (c - 1) * 26;
        let s = '<rect x="10" y="10" width="280" height="150" rx="8" fill="#F1EEE6" stroke="#CFC8B8"/><path d="M18 20H282" stroke="#E5484D" stroke-width="2"/><path d="M18 40H282" stroke="#3E8FCB" stroke-width="2"/><text x="284" y="24" text-anchor="end" font-size="9" fill="#E5484D">+</text><text x="284" y="44" text-anchor="end" font-size="9" fill="#3E8FCB">−</text>';
        for (let c = 1; c <= 10; c++) { s += `<text x="${X(c)}" y="58" text-anchor="middle" font-size="9" fill="#5B6782">${c}</text>`; for (let r = 0; r < 5; r++) s += `<rect x="${X(c) - 3}" y="${66 + r * 18}" width="6" height="6" rx="1" fill="#2F2A20" opacity=".6"/>`; }
        s += `<path d="M${X(2)} 69V20" stroke="#E5484D" stroke-width="3"/><path d="M${X(8)} 69V40" stroke="#222" stroke-width="3"/>`;
        s += `<path d="M${X(2)} 87V75H${X(5)}V87" stroke="#9AA3B2" stroke-width="3" fill="none"/><g transform="translate(${(X(2) + X(5)) / 2} 75)">${resBody()}</g>`;
        const xa = X(p.A), xk = X(p.K), mid = (xa + xk) / 2;
        s += `<path d="M${xa} 123V140M${xk} 123V136" stroke="#9AA3B2" stroke-width="3"/><path d="M${xa} 140H${mid - 10}M${xk} 136H${mid + 10}" stroke="#9AA3B2" stroke-width="2.5"/><g transform="translate(${mid} 140) scale(.55)">${ledBulb(o.lit ? 1 : 0)}</g><text x="${xa}" y="156" text-anchor="middle" font-size="9" fill="#14213D">A</text><text x="${xk}" y="156" text-anchor="middle" font-size="9" fill="#14213D">K</text>`;
        const msg = o.lit ? '¡Luce! Cada pata en su nudo' : o.rev ? 'Mismos nudos, pero al revés: no conduce' : p.A === p.K ? 'Las dos patas en la misma columna' : 'El camino no se cierra: falta un nudo';
        return `<svg viewBox="0 0 300 190" class="viz">${s}<text x="150" y="182" text-anchor="middle" class="vizsm" style="fill:${o.lit ? 'var(--ok)' : 'currentColor'}">${msg}</text></svg>`;
      }
    }
  });

  /* ===================== SVG DE LAS TARJETAS ===================== */
  const S = {
    pieces: `<svg viewBox="0 0 300 150" class="viz"><g transform="translate(36 70)"><rect x="-24" y="-30" width="48" height="60" rx="5" fill="#2F3B52"/><rect x="-8" y="-36" width="16" height="6" fill="#C9B183"/><text x="0" y="5" text-anchor="middle" font-size="12" fill="#fff">9 V</text></g>
      <g transform="translate(110 70)"><rect x="-22" y="-12" width="44" height="24" rx="5" fill="#3A4660"/><rect x="-6" y="-20" width="14" height="10" rx="2" fill="#E7EBF0"/></g>
      <g transform="translate(180 70)"><path d="M-34 0H-20M20 0H34" stroke="#9AA3B2" stroke-width="3"/>${resBody()}</g>
      <g transform="translate(255 64)"><path d="M-10 10V-10a10 10 0 0 1 20 0v20z" fill="#FF3B30" class="a-pulse"/><path d="M-5 10v26M5 10v18" stroke="#9AA3B2" stroke-width="2.5"/></g>
      ${['pila', 'interruptor', 'resistencia', 'LED'].map((t, i) => `<text x="${[36, 110, 180, 255][i]}" y="130" text-anchor="middle" class="vizsm">${t}</text>`).join('')}</svg>`,
    whyRes: `<svg viewBox="0 0 300 150" class="viz"><text x="20" y="24" class="vizlab">Sin resistencia</text><rect x="20" y="34" width="260" height="16" fill="var(--ice)" opacity=".7"/><text x="150" y="46" text-anchor="middle" font-size="11" fill="#14213D">corriente desbocada → 💨</text>
      <text x="20" y="84" class="vizlab">Con resistencia</text><rect x="20" y="94" width="100" height="16" fill="var(--ice)" opacity=".7"/><rect x="120" y="98" width="50" height="8" fill="var(--ice)"/><rect x="170" y="94" width="110" height="16" fill="var(--ice)" opacity=".4"/><text x="145" y="126" text-anchor="middle" class="vizsm">el freno deja pasar solo lo justo</text>
      <text x="20" y="146" class="vizsm">El LED apenas frena: la resistencia hace ese trabajo.</text></svg>`,
    switches: `<svg viewBox="0 0 300 150" class="viz"><text x="75" y="24" text-anchor="middle" class="vizlab">Interruptor</text><text x="225" y="24" text-anchor="middle" class="vizlab">Pulsador</text>
      <g style="color:var(--ink)"><circle cx="45" cy="70" r="3" fill="currentColor"/><circle cx="105" cy="70" r="3" fill="currentColor"/><path d="M45 70L102 56" ${st} stroke-width="3"/><path d="M20 70H45M105 70H130" ${st}/></g>
      <text x="75" y="104" text-anchor="middle" class="vizsm">se queda como lo dejas</text>
      <g class="a-bob"><path d="M195 52h60M225 52v-12M215 40h20" ${st} stroke-width="3"/></g><path d="M170 70H195M255 70H280" ${st}/><circle cx="195" cy="70" r="3" fill="currentColor"/><circle cx="255" cy="70" r="3" fill="currentColor"/>
      <text x="225" y="104" text-anchor="middle" class="vizsm">solo cierra mientras aprietas</text><text x="150" y="136" text-anchor="middle" class="vizsm">Abrir = cortar el camino de la corriente</text></svg>`,
    path: `<svg viewBox="0 0 300 160" class="viz"><path d="M40 40H260V130H40Z" fill="none" stroke="var(--line)" stroke-width="3"/><path d="M40 40H260V130H40Z" fill="none" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/>
      ${batt(40, 85, 9)}<rect x="88" y="26" width="44" height="28" rx="6" fill="var(--surface)"/>${swLever(110, 40, true)}<g transform="translate(185 40)">${resBody()}</g>
      <g transform="translate(260 85)"><rect x="-18" y="-22" width="36" height="44" fill="var(--surface)"/>${ledBulb(1)}</g>
      <text x="62" y="30" class="vizsm">1 +</text><text x="104" y="68" class="vizsm">2</text><text x="181" y="64" class="vizsm">3</text><text x="232" y="60" class="vizsm">4 ánodo</text><text x="230" y="122" class="vizsm">5 cátodo</text><text x="62" y="150" class="vizsm">6 vuelta al −</text></svg>`,
    realVsSch: `<svg viewBox="0 0 300 160" class="viz"><text x="70" y="18" text-anchor="middle" class="vizsm">en la mesa</text><text x="225" y="18" text-anchor="middle" class="vizsm">en el esquema</text>
      <rect x="20" y="40" width="30" height="40" rx="4" fill="#2F3B52"/><path d="M50 50q40 -30 60 20M35 80q10 60 80 40" stroke="#E5484D" stroke-width="3" fill="none"/><path d="M110 70q10 20 0 40" stroke="#222" stroke-width="3" fill="none"/><circle cx="112" cy="68" r="8" fill="#FF3B30"/>
      <path d="M150 24V150" stroke="var(--line)"/>
      <g transform="translate(14 0)" style="color:var(--ink)">${inner({ w: 120, h: 120, parts: [{ k: 'bat', x: 170, y: 80, rot: 90 }, { k: 'led', x: 250, y: 80, rot: 90 }], wires: [[170, 50, 170, 35, 250, 35, 250, 50], [170, 110, 170, 125, 250, 125, 250, 110]] }).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
      <text x="150" y="156" text-anchor="middle" class="vizsm">El dibujo ordena conexiones, no copia formas.</text></svg>`,
    swGnd: `<svg viewBox="0 0 300 130" class="viz">${['sw', 'push', 'gnd'].map((k, i) => Schem.symbol(k).replace('<svg ', `<svg x="${10 + i * 95}" y="10" height="80" `)).join('')}
      <text x="55" y="110" text-anchor="middle" class="vizsm">interruptor</text><text x="150" y="110" text-anchor="middle" class="vizsm">pulsador</text><text x="245" y="110" text-anchor="middle" class="vizsm">masa (0 V)</text></svg>`,
    openClosed: `<svg viewBox="0 0 300 140" class="viz"><path d="M20 30H130V110H20Z" fill="none" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/><text x="75" y="76" text-anchor="middle" font-size="22">💡</text><text x="75" y="130" text-anchor="middle" class="vizsm">cerrado: pasa</text>
      <path d="M170 30H215M235 30H280V110H170Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M215 30l18 -14" stroke="currentColor" stroke-width="3"/><text x="225" y="76" text-anchor="middle" font-size="22" opacity=".35">💡</text><text x="225" y="130" text-anchor="middle" class="vizsm">abierto: no pasa nada</text></svg>`,
    short: `<svg viewBox="0 0 300 150" class="viz"><rect x="40" y="40" width="40" height="70" rx="5" fill="#2F3B52"/><path d="M60 40V20H200V130H60V110" fill="none" stroke="#FF5A1F" stroke-width="5" class="a-pulse"/>
      <text x="196" y="70" class="vizlab" style="fill:var(--err)">De + a −</text><text x="196" y="88" class="vizsm">sin freno:</text><text x="196" y="104" class="vizsm">corriente enorme</text>
      <text x="96" y="80" font-size="22" class="a-bob">🔥</text><text x="14" y="146" class="vizsm">Calor, pilas agotadas, baterías de litio que arden.</text></svg>`,
    fuse: `<svg viewBox="0 0 300 140" class="viz"><path d="M20 50H100M200 50H280" stroke="currentColor" stroke-width="3"/><rect x="100" y="34" width="100" height="32" rx="6" fill="var(--ice-soft)" stroke="currentColor" stroke-width="2"/>
      <path d="M100 50H143M157 50H200" stroke="#9AA3B2" stroke-width="2"/><g class="a-blink"><path d="M143 50H157" stroke="#9AA3B2" stroke-width="2"/></g>
      <text x="150" y="92" text-anchor="middle" class="vizlab">Fusible: un hilo fino a propósito</text><text x="150" y="110" text-anchor="middle" class="vizsm">si pasa demasiada corriente, se funde</text><text x="150" y="126" text-anchor="middle" class="vizsm">y abre el circuito antes de que algo arda</text></svg>`,
    flashFlow: schFlow('flashlight', '40,45 40,25 280,25 280,130 40,130 40,105', 300),
    dots: `<svg viewBox="0 0 300 140" class="viz"><path d="M20 60H130M75 20V100" stroke="currentColor" stroke-width="2.4"/><circle cx="75" cy="60" r="5" fill="currentColor"/><text x="75" y="124" text-anchor="middle" class="vizlab" style="fill:var(--ok)">con punto: unidos</text>
      <path d="M170 60H280M225 20V100" stroke="currentColor" stroke-width="2.4"/><text x="225" y="124" text-anchor="middle" class="vizlab" style="fill:var(--err)">sin punto: no se tocan</text></svg>`,
    conventions: `<svg viewBox="0 0 300 150" class="viz"><path d="M150 20V120" stroke="var(--muted)" stroke-dasharray="3 4"/><text x="160" y="28" class="vizsm">↑ tensión más alta arriba</text><text x="160" y="118" class="vizsm">↓ masa abajo</text>
      <path d="M20 70H120" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/><text x="20" y="62" class="vizsm">la señal va de izquierda</text><text x="20" y="90" class="vizsm">a derecha</text>
      <path d="M200 132h24M204 138h16M208 144h8M212 120v12" stroke="currentColor" stroke-width="2"/><text x="20" y="140" class="vizsm">Se lee como un desnivel.</text></svg>`,
    labels: `<svg viewBox="0 0 300 130" class="viz"><path d="M20 40H90" stroke="currentColor" stroke-width="2.4"/><path d="M90 30h40l10 10l-10 10h-40z" fill="var(--ice-soft)" stroke="currentColor" stroke-width="1.6"/><text x="112" y="45" text-anchor="middle" font-size="12" fill="currentColor">LUZ</text>
      <path d="M280 90H210" stroke="currentColor" stroke-width="2.4"/><path d="M210 80h-40l-10 10l10 10h40z" fill="var(--ice-soft)" stroke="currentColor" stroke-width="1.6"/><text x="188" y="95" text-anchor="middle" font-size="12" fill="currentColor">LUZ</text>
      <path d="M140 40Q200 40 160 90" stroke="var(--led)" stroke-width="2" stroke-dasharray="4 4" fill="none" class="a-flow-slow"/><text x="150" y="124" text-anchor="middle" class="vizsm">Mismo nombre = mismo cable, aunque no se dibuje</text></svg>`,
    xray: `<svg viewBox="0 0 300 170" class="viz"><rect x="10" y="10" width="280" height="150" rx="8" fill="#F1EEE6" stroke="#CFC8B8"/>
      <rect x="18" y="18" width="264" height="8" rx="3" fill="#B7BCC4"/><rect x="18" y="32" width="264" height="8" rx="3" fill="#B7BCC4"/><text x="286" y="25" text-anchor="end" font-size="9" fill="#E5484D">+</text><text x="286" y="40" text-anchor="end" font-size="9" fill="#3E8FCB">−</text>
      ${Array.from({ length: 10 }, (_, c) => `<rect x="${24 + c * 26}" y="50" width="14" height="44" rx="3" fill="${c === 3 ? '#F2A900' : '#B7BCC4'}"/><rect x="${24 + c * 26}" y="106" width="14" height="44" rx="3" fill="#B7BCC4"/>`).join('')}
      <rect x="18" y="97" width="264" height="6" fill="#DCD5C5"/><text x="150" y="102" text-anchor="middle" font-size="7" fill="#5B6782">ranura central</text>
      <text x="56" y="47" font-size="8" fill="#14213D">columna de 5 (a–e)</text></svg>`,
    bbErrors: `<svg viewBox="0 0 300 150" class="viz"><rect x="10" y="20" width="130" height="90" rx="6" fill="#F1EEE6" stroke="#CFC8B8"/>${[0, 1, 2, 3].map(c => `<rect x="${26 + c * 28}" y="34" width="12" height="64" rx="3" fill="${c === 1 ? '#F2A900' : '#D6D0C2'}"/>`).join('')}
      <path d="M60 50V40H60M60 90V100" stroke="#9AA3B2" stroke-width="3"/><g transform="translate(60 70) rotate(90) scale(.7)">${resBody()}</g><text x="75" y="128" text-anchor="middle" class="vizsm" style="fill:var(--err)">✗ en la misma tira</text>
      <rect x="160" y="20" width="130" height="90" rx="6" fill="#F1EEE6" stroke="#CFC8B8"/>${[0, 1, 2, 3].map(c => `<rect x="${176 + c * 28}" y="34" width="12" height="64" rx="3" fill="${c === 0 || c === 2 ? '#F2A900' : '#D6D0C2'}"/>`).join('')}
      <path d="M182 60V50H238V60" stroke="#9AA3B2" stroke-width="3" fill="none"/><g transform="translate(210 50) scale(.7)">${resBody()}</g><text x="225" y="128" text-anchor="middle" class="vizsm" style="fill:var(--ok)">✓ cada pata en su tira</text></svg>`,
    nodes: Schem.draw(SCH.flashlight, { width: 300 }).replace('</svg>', `${[[60, 25, '1'], [155, 25, '2'], [255, 25, '3'], [160, 130, '4']].map(([x, y, n]) => `<circle cx="${x}" cy="${y}" r="10" fill="var(--led)"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#14213D">${n}</text>`).join('')}</svg>`),
    check: `<svg viewBox="0 0 300 150" class="viz">${['Sin pila mientras montas', 'Un nudo, una columna', 'Repasa cada nudo con el dedo', 'Polaridad del LED: pata larga al +', 'Ahora sí: conecta la pila'].map((t, i) => `<rect x="20" y="${14 + i * 26}" width="16" height="16" rx="3" fill="var(--ok-soft)" stroke="var(--ok)"/><path d="M23 ${22 + i * 26}l4 4l7 -8" stroke="var(--ok)" stroke-width="2.5" fill="none" class="a-draw a-d${Math.min(4, i + 1)}" style="--len:20"/><text x="46" y="${27 + i * 26}" class="vizlab">${t}</text>`).join('')}</svg>`
  };

  /* ===================== CONCEPTOS ===================== */
  const C = CONCEPTS;
  const pPiece = (o = {}) => ({ sw: { label: 'Interruptor (0 abierto · 1 cerrado)', val: 0, list: [0, 1], dec: 0 }, flip: { label: 'LED (0 bien · 1 del revés)', val: 1, list: [0, 1], dec: 0 }, R: { label: 'Resistencia', val: 470, list: [0, 10, 47, 100, 220, 470, 1000, 2200, 4700, 10000], fmt: 'R' }, ...o });
  Object.assign(C, {
    ba_ledpol: { name: 'Polaridad del LED', alts: [
      { title: 'Pata larga al +', text: 'Un LED solo deja pasar la corriente en un sentido: de la pata larga (<b>ánodo</b>, +) a la corta (<b>cátodo</b>, −). El cátodo también se reconoce por el lado plano del borde. Al revés no se rompe: simplemente no luce.', img: 'led', q: mcq('Pones el LED al revés (pata larga al −). ¿Qué pasa?', ['No luce: no deja pasar la corriente en ese sentido', 'Luce igual', 'Se quema al instante', 'Luce el doble'], 'Al revés no conduce.') },
      { title: 'Pruébalo al revés', text: 'Cierra el interruptor y gira el LED. Con la pata larga hacia el + luce; con la pata larga hacia el −, nada.', tune: { viz: 'ledPiece', params: pPiece({ sw: { label: 'Interruptor (0 abierto · 1 cerrado)', val: 1, list: [0, 1], dec: 0 } }) }, q: mcq('¿Qué pata del LED va hacia el + de la pila?', ['La larga (ánodo)', 'La corta (cátodo)', 'Cualquiera', 'La del lado plano'], 'Larga = ánodo = +.') }
    ] },
    ba_switch: { name: 'Interruptor y pulsador', alts: [
      { title: 'Puente levadizo', text: 'Un interruptor no fabrica nada: abre o cierra el camino, como un puente levadizo. El <b>interruptor</b> se queda como lo dejas; el <b>pulsador</b> solo cierra mientras lo aprietas y se abre al soltarlo.', svg: S.switches, q: mcq('Un pulsador en una linterna. ¿Cuándo luce?', ['Solo mientras lo mantienes pulsado', 'Siempre', 'Nunca', 'Solo al soltarlo'], 'El pulsador vuelve solo a abierto.') },
      { title: 'Abre y cierra', text: 'Mueve el interruptor: abierto, el camino está cortado y no pasa nada en ningún punto; cerrado, la corriente da la vuelta.', tune: { viz: 'ledPiece', params: pPiece({ flip: { val: 0, list: [0, 1], fixed: true } }) }, q: mcq('Con el interruptor abierto, ¿pasa corriente por la resistencia?', ['No: el camino está cortado entero', 'Sí, un poco', 'Sí, la misma', 'Solo por la mitad'], 'Un corte en cualquier punto la para en todas partes.') }
    ] }
  });
  C.ba_ledknee = { name: 'Por qué el LED lleva resistencia', alts: [
    { title: 'Una presa que se desborda', text: 'Un LED es como una presa: por debajo de unos 2 V (en uno rojo) casi no deja pasar nada; un poco por encima, la corriente se desborda. Conectado directamente a una pila de 9 V, se quema en un instante. La resistencia en el mismo camino es la compuerta que deja pasar solo lo justo.', svg: S.whyRes, q: mcq('¿Por qué no se conecta un LED directamente a una pila de 9 V?', ['Porque la corriente se dispara y lo quema', 'Porque necesita 20 V', 'Porque no conduce sin resistencia', 'Sí se puede'], 'El LED apenas frena: hace falta un freno aparte.') },
    { title: 'Quítale el freno', text: 'Baja la resistencia poco a poco y mira la corriente. Con mucho freno, luce poco; con el justo, bien; casi sin freno, se quema.', tune: { viz: 'ledPiece', params: pPiece({ sw: { val: 1, list: [0, 1], fixed: true }, flip: { val: 0, list: [0, 1], fixed: true } }) }, q: mcq('Cambias la resistencia de un LED por otra mucho más pequeña. ¿Qué pasa?', ['Pasa mucha más corriente: puede quemarse', 'Pasa menos corriente', 'No cambia nada', 'Se apaga'], 'Menos freno, más corriente.') }
  ] };
  Object.assign(C, {
    ba_sym1: { name: 'Símbolos básicos', alts: [
      { title: 'Dibujos que se explican solos', text: 'Muchos símbolos dibujan lo que hacen: la pila, una raya larga (+) y una corta (−); el LED, un triángulo que apunta en el sentido en que deja pasar la corriente, una raya (el cátodo) y flechitas hacia fuera (emite luz); el interruptor, una palanca abierta.', symk: 'led', q: mcq('Un triángulo con una raya y flechas que salen hacia fuera es…', ['Un LED', 'Una pila', 'Una resistencia', 'Un interruptor'], 'Las flechas que salen: emite luz.') },
      { title: 'Pieza y símbolo', text: 'Recorre las piezas y compara cada una con su símbolo. Fíjate en el detalle que las distingue: la raya larga de la pila, las flechas del LED, la palanca del interruptor.', tune: { viz: 'symCard', params: { k: { label: 'Pieza', val: 1, list: [1, 2, 3, 4, 5, 6, 7], dec: 0 } } }, q: mcq('En el símbolo de la pila, ¿qué raya es el +?', ['La larga', 'La corta', 'Las dos', 'Ninguna'], 'Larga = +.') }
    ] },
    ba_short: { name: 'Cortocircuito y fusible', alts: [
      { title: 'Un atajo sin freno', text: 'Un <b>cortocircuito</b> es un camino casi sin resistencia entre los dos polos. Sin nada que frene, la corriente se dispara: los cables y la pila se calientan, y una batería de litio puede incendiarse. El <b>fusible</b> es un hilo fino a propósito que se funde y abre el circuito antes.', svg: S.short, q: mcq('Un cable toca a la vez el + y el − de una batería. ¿Qué es?', ['Un cortocircuito: peligro de calor e incendio', 'Un circuito abierto', 'Nada grave, son pocos voltios', 'Una forma de cargarla'], 'Camino sin freno entre los polos.') },
      { title: 'Provócalo sin miedo', text: 'Aquí es virtual: pon el cable de corto y mira qué pasa. Luego añade el fusible y vuelve a provocarlo.', tune: { viz: 'circuitState', params: { sw: { label: 'Interruptor (0 · 1)', val: 1, list: [0, 1], dec: 0 }, sc: { label: 'Corto (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 }, fu: { label: 'Fusible (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 } } }, q: mcq('¿Qué pasa cuando se funde un fusible?', ['El circuito se abre y deja de pasar corriente', 'Pasa más corriente', 'Se carga la pila', 'El LED brilla más'], 'Es un corte a propósito.') }
    ] }
  });
  C.ba_circuit.alts.push({ title: 'Ábrelo y ciérralo', text: 'Mueve el interruptor: la corriente necesita el bucle completo. En cuanto lo cortas en un punto, se para en todas partes.', tune: { viz: 'circuitState', params: { sw: { label: 'Interruptor (0 abierto · 1 cerrado)', val: 0, list: [0, 1], dec: 0 }, sc: { val: 0, list: [0, 1], fixed: true }, fu: { val: 0, list: [0, 1], fixed: true } } }, q: mcq('¿Dónde hay que poner un interruptor para apagar un LED?', ['En cualquier punto del bucle', 'Solo junto al +', 'Solo junto al −', 'Dentro del LED'], 'Cortes donde cortes, se para todo.') });
  Object.assign(C, {
    ba_junction: { name: 'Uniones y cruces en un esquema', alts: [
      { title: 'El punto manda', text: 'En un esquema, un <b>punto gordo</b> donde se juntan líneas es una unión: esos cables están conectados. Dos líneas que se cruzan <b>sin punto</b> no se tocan: una pasa por encima de la otra.', svg: S.dots, q: mcq('Dos cables se cruzan en un esquema sin punto. ¿Están conectados?', ['No', 'Sí', 'Solo si son del mismo color', 'Depende de la pila'], 'Sin punto no hay unión.') },
      { title: 'Pon y quita el punto', text: 'Cierra S1 y pon o quita el punto del cruce. Mira qué LEDs lucen.', tune: { viz: 'crossDot', params: { sw: { label: 'S1 (0 abierto · 1 cerrado)', val: 1, list: [0, 1], dec: 0 }, dot: { label: 'Punto en el cruce (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 } } }, q: mcq('Tres líneas se juntan en un punto gordo. ¿Qué significa?', ['Que los tres cables están unidos', 'Que hay un componente', 'Que ahí no pasa corriente', 'Que es masa'], 'Punto = unión.') }
    ] },
    ba_trace: { name: 'Seguir la corriente en un esquema', alts: [
      { title: 'Con el dedo', text: 'Pon el dedo en el + de la pila y avanza por los cables. Cada componente que atraviesas tiene que dejarte pasar (interruptor cerrado, LED en su sentido). Si llegas al − sin quedarte atascado, hay corriente.', svg: S.flashFlow, q: mcq('En la linterna, ¿qué pasa si abres S1?', ['El LED se apaga', 'Brilla más', 'La pila dura menos', 'Nada'], 'S1 está en el único camino.', { sch: 'flashlight' }) },
      { title: 'Busca el camino completo', text: 'Si hay pulsadores uno detrás de otro, hay que pulsarlos todos para pasar. Si hay dos caminos unidos por puntos, basta con que uno esté libre.', sch: 'orSw', q: mcq('Con este esquema, ¿cuándo luce el LED?', ['Con A o con B pulsado (o los dos)', 'Solo con los dos', 'Nunca', 'Siempre'], 'Los puntos crean dos caminos.', { sch: 'orSw' }) }
    ] }
  });
  C.ba_schread = { name: 'Convenciones de los esquemas', alts: [
    { title: 'Masas y etiquetas', text: 'Todos los símbolos de <b>masa</b> de un esquema son el mismo punto, aunque no se dibuje el cable que los une. Igual con las <b>etiquetas</b>: dos cables con el mismo nombre (+9 V, LUZ…) están conectados.', sch: 'ba_flashGnd', q: mcq('Tres símbolos de masa en un esquema. ¿Cuántos puntos distintos son?', ['Uno', 'Tres', 'Dos', 'Depende'], 'Todas las masas están unidas.') },
    { title: 'El orden del dibujo', text: 'Los esquemas se dibujan para leerse fácil: tensión más alta arriba y masa abajo, y la señal de izquierda a derecha. Así la corriente «baja» por la página como el agua por una ladera.', svg: S.conventions, q: mcq('¿Dónde suele dibujarse la masa?', ['Abajo', 'Arriba', 'A la izquierda', 'En el centro'], 'Lo alto arriba, la masa abajo.') },
    { title: 'Tres dibujos, un circuito', text: 'Cambia la forma de dibujarlo: con todos los cables, con masas o con etiquetas. El LED se comporta igual: el circuito es el mismo.', tune: { viz: 'gndMerge', params: { m: { label: 'Dibujo (0 cables · 1 masas · 2 etiquetas)', val: 1, list: [0, 1, 2], dec: 0 }, sw: { label: 'Interruptor', val: 1, list: [0, 1], dec: 0 } } }, q: mcq('Dos cables con la etiqueta «LUZ» en un esquema. ¿Están conectados?', ['Sí', 'No', 'Solo si se tocan', 'Solo en placas grandes'], 'Mismo nombre, mismo nudo.') }
  ] };
  C.breadboard.alts[1] = { title: 'Cada columna es un nudo', text: 'Piensa en cada columna de 5 agujeros como un nudo ya hecho. Dos patas en la misma columna quedan unidas: si son las dos patas de una resistencia, la puenteas y no hace nada. Las filas largas de los bordes reparten el + y el −.', svg: S.bbErrors, q: mcq('Pinchas las dos patas de una resistencia en la misma columna. ¿Qué pasa?', ['Queda puenteada: no hace nada', 'Funciona normal', 'Se quema la protoboard', 'Vale el doble'], 'Las dos patas están en el mismo nudo.') };
  C.breadboard.alts.push({ title: 'Mírala por dentro', text: 'Activa los rayos X y mueve las patas de la resistencia. Las tiras metálicas de dentro deciden qué queda unido.', tune: { viz: 'bbXray', params: { xr: { label: 'Rayos X (0 · 1)', val: 1, list: [0, 1], dec: 0 }, a: { label: 'Pata 1 (columna)', val: 3, min: 1, max: 10, step: 1, dec: 0 }, b: { label: 'Pata 2 (columna)', val: 3, min: 1, max: 10, step: 1, dec: 0 } } }, q: mcq('Pinchas un cable en b7 y otro en e7. ¿Están conectados?', ['Sí: misma columna, mismo lado', 'No: filas distintas', 'Solo con un puente', 'Depende del cable'], 'a–e de la misma columna = un solo nudo.') });
  C.ba_bbnodes.alts.push({ title: 'Pincha el LED', text: 'La resistencia y los cables ya están puestos. Mueve las patas del LED hasta que cada una quede en el nudo que le toca.', tune: { viz: 'bbMap', params: { A: { label: 'Ánodo (columna)', val: 3, min: 1, max: 10, step: 1, dec: 0 }, K: { label: 'Cátodo (columna)', val: 6, min: 1, max: 10, step: 1, dec: 0 } } }, q: mcq('El ánodo del LED y una pata de la resistencia comparten nudo. ¿Dónde los pinchas?', ['En la misma columna', 'En columnas contiguas', 'En la fila +', 'Da igual'], 'Mismo nudo = misma columna.') });
  C.ba_bbnodes.alts[0].svg = S.nodes;

  C.ba_circuit.alts[0].text = C.ba_circuit.alts[0].text.replace('apagan todo lo que está en serie', 'apagan todo lo que está en ese camino');
  C.ba_circuit.alts[0].q = mcq('Un LED y un interruptor abierto en el mismo camino…', ['El LED se apaga: el camino está cortado', 'El LED brilla más', 'Hay un cortocircuito', 'Brilla a medias'], 'Cualquier corte en el camino apaga todo.');
  C.ba_bbnodes.alts[1].q = mcq('Pila, resistencia y LED en un solo bucle. ¿Cuántos nudos?', ['3', '2', '6', '1'], 'Uno entre cada par de piezas vecinas.');

  /* ===================== LECCIONES ===================== */
  UNITS.push({ id: 'm1b', title: 'Tu primer circuito', desc: 'Pila, interruptor, resistencia y LED: símbolos, esquemas, cortocircuitos y la protoboard.', nodes: [
   L('b20', 'Las piezas de tu primer circuito', 'led', ['ba_ledpol', 'ba_ledknee', 'ba_switch'], [
    Q('Conectas un LED directamente a una pila de 9 V, pata larga al +, sin nada más. ¿Qué crees que pasa?', ['Brilla muchísimo un instante y se quema', 'Luce normal para siempre', 'No se enciende', 'La pila se recarga'], 'Se quema: el LED casi no frena la corriente. En esta lección verás qué pieza lo evita.', { predict: true, c: 'ba_ledknee', h: 'Piensa en qué frena la corriente si no hay nada más que el LED.' }),
    I('Tu primer circuito, una linterna, tiene cuatro piezas: una <b>pila</b>, un <b>interruptor</b>, una <b>resistencia</b> y un <b>LED</b>.', { svg: S.pieces }),
    I('Un <b>LED</b> (diodo emisor de luz) convierte corriente en luz y solo la deja pasar <b>en un sentido</b>.\nPata larga: <b>ánodo</b>, va hacia el +. Pata corta y lado plano: <b>cátodo</b>, hacia el −.', { img: 'led', more: 'Si ya le has cortado las patas, fíjate en el borde de la cápsula: el lado plano marca el cátodo. Dentro, la pieza de metal más grande suele ser el cátodo, aunque no todos los fabricantes lo hacen igual.' }),
    { t: 'tap', img: 'led', q: 'Toca la pata que va hacia el + de la pila.', a: 'anode', right: 'la pata larga (ánodo)', e: 'Larga = ánodo = +.', c: 'ba_ledpol', h: 'Mira cuál de las dos patas es más larga.' },
    { t: 'tap', img: 'led', q: 'Toca la marca del cuerpo que indica el cátodo.', a: 'flat', right: 'el lado plano del borde', e: 'El borde plano está del lado del cátodo.', c: 'ba_ledpol', h: 'Busca un borde que no sea redondo.' },
    { t: 'explore', title: 'Monta la linterna', text: 'Pila de 9 V, interruptor, resistencia y LED. Mueve los mandos y observa.', viz: 'ledPiece', params: pPiece(),
      tasks: [
        { q: 'lit', min: 1, max: 1, text: 'Enciende el LED', done: 'Interruptor cerrado y LED con la pata larga hacia el +.', hint: 'Hay dos cosas mal: el interruptor y la orientación del LED.' },
        { q: 'dim', min: 1, max: 1, text: 'Haz que brille poco', done: 'Más resistencia, menos corriente: luce menos.', hint: 'Sube la resistencia.' },
        { q: 'burnt', min: 1, max: 1, text: 'Quita casi toda la resistencia (sin miedo: es virtual)', done: 'Sin freno, la corriente se dispara y el LED se quema.' }
      ] },
    I('El LED se queda con unos 2 V y apenas frena lo que pase de ahí. Si la pila empuja más, la corriente se dispara y lo quema.\nPor eso lleva una <b>resistencia</b> en el mismo camino: es el freno.', { svg: S.whyRes, more: 'Cuánta resistencia exactamente lo aprenderás a calcular cuando conozcas la ley de Ohm. Por ahora, la linterna usa 470 Ω con una pila de 9 V.' }),
    I('El <b>interruptor</b> abre y cierra el camino y se queda como lo dejas. El <b>pulsador</b> solo cierra mientras lo aprietas.', { svg: S.switches }),
    Q('¿Qué diferencia hay entre un interruptor y un pulsador?', ['El interruptor se queda como lo dejas; el pulsador solo cierra mientras lo aprietas', 'El pulsador da más corriente', 'Son lo mismo', 'El interruptor solo sirve con LEDs'], 'Uno recuerda su posición; el otro vuelve solo.', { c: 'ba_switch', h: 'Piensa en el timbre de casa y en el interruptor de la luz.' }),
    { t: 'steps', title: 'Paso a paso', text: 'Sigue el camino de la corriente en la linterna (sentido convencional).', svg: S.path, steps: ['Sale del <b>+</b> de la pila (1)', 'Atraviesa el <b>interruptor</b> cerrado (2)', 'Pasa por la <b>resistencia</b>, que la frena (3)', 'Entra en el LED por el <b>ánodo</b>, la pata larga (4)', 'Sale por el <b>cátodo</b> (5)', 'Y vuelve al <b>−</b> de la pila (6)'], result: 'Un solo camino cerrado: si se corta en cualquier punto, se apaga' },
    Q('Pones el LED al revés (pata larga al −). ¿Qué pasa?', ['No se enciende: no deja pasar la corriente en ese sentido', 'Se enciende igual', 'Se quema', 'Brilla el doble'], 'Al revés no conduce (y no se estropea).', { c: 'ba_ledpol', h: 'El LED solo deja pasar la corriente en un sentido.' }),
    Q('¿Para qué lleva el LED una resistencia en el mismo camino?', ['Para frenar la corriente y que no se queme', 'Para que dé más luz', 'Para cambiar el color', 'No hace falta'], 'La resistencia es el freno que el LED no tiene.', { c: 'ba_ledknee', h: 'Recuerda qué pasaba en el reto al quitar la resistencia.' }),
    { t: 'order', q: 'Ordena el camino de la corriente en la linterna.', items: ['Polo + de la pila', 'Interruptor', 'Resistencia', 'Ánodo del LED', 'Cátodo del LED', 'Polo − de la pila'], e: 'Del + al −, entrando al LED por el ánodo.', c: 'ba_ledpol', h: 'Empieza en el + y termina en el −; el LED se atraviesa de ánodo a cátodo.' },
    Q('Cambias el interruptor de la linterna por un pulsador. ¿Cuándo luce el LED?', ['Solo mientras lo mantienes pulsado', 'Siempre', 'Nunca', 'Al soltarlo'], 'El pulsador se abre al soltarlo.', { c: 'ba_switch', h: '¿Qué hace un pulsador cuando dejas de apretarlo?' }),
    I('<b>Resumen</b>\n· LED: solo conduce en un sentido; pata larga (ánodo) al +.\n· Necesita una resistencia en su camino o se quema.\n· Interruptor: abre o cierra el camino; pulsador: solo mientras aprietas.')
   ]),
   L('e1', 'Símbolos básicos', 'sym', ['ba_sym1'], [
    Q('Un esquema eléctrico, ¿qué crees que dibuja?', ['Qué está conectado con qué', 'Dónde está cada pieza en la caja', 'El tamaño real de cada pieza', 'Los colores de los cables'], 'Un esquema es un mapa de conexiones: no copia la forma ni la posición de las piezas.', { predict: true, c: 'ba_sym1', h: 'Piensa en un plano de metro: ¿es fiel a las distancias?' }),
    I('Un <b>esquema</b> no dice dónde está cada pieza, sino <b>qué está conectado con qué</b>. Cada componente tiene un dibujo simple: su <b>símbolo</b>.', { svg: S.realVsSch, more: 'Es como el plano del metro: las estaciones no están a escala, pero sabes exactamente qué línea las une. Gracias a los símbolos, un esquema se entiende igual en cualquier país.' }),
    { t: 'explore', title: 'Pieza y símbolo', text: 'Recorre las piezas y mira cómo se dibuja cada una.', viz: 'symCard', params: { k: { label: 'Pieza', val: 2, list: [1, 2, 3, 4, 5, 6, 7], dec: 0 } },
      tasks: [
        { q: 'k', min: 3, max: 3, text: 'Busca el LED y fíjate en sus flechas', done: 'Flechas que salen: emite luz.', hint: 'Avanza una pieza.' },
        { q: 'k', min: 1, max: 1, text: 'Busca la pila: ¿qué raya es el +?', done: 'La raya larga es el +.' },
        { q: 'k', min: 6, max: 6, text: 'Busca la masa', done: 'El punto de 0 V; lo usarás mucho.' }
      ] },
    I('La <b>pila</b>: raya larga = +, raya corta = −. Si hay varias parejas de rayas, son varias celdas.', { symk: 'bat' }),
    { t: 'sym', k: 'bat', q: '¿Qué línea es el positivo?', o: ['La larga', 'La corta', 'Las dos', 'Ninguna'], a: 0, e: 'Larga = +.', c: 'ba_sym1', h: 'El + es la más grande de las dos.' },
    I('El <b>LED</b>: el triángulo apunta hacia donde deja pasar la corriente; la raya es el cátodo; las flechitas que salen dicen que emite luz.', { symk: 'led' }),
    { t: 'sym', k: 'led', q: '¿Qué indican las flechitas?', o: ['Que emite luz', 'Que recibe luz', 'Que es rápido', 'El sentido del cable'], a: 0, e: 'Hacia fuera: emite.', c: 'ba_sym1', h: 'Fíjate hacia dónde apuntan: ¿salen o entran?' },
    Q('¿Hacia dónde apunta el triángulo del LED en un esquema?', ['Del ánodo al cátodo: el sentido en que deja pasar la corriente', 'Hacia el + de la pila', 'Hacia donde sale la luz', 'No significa nada'], 'Es una flecha: la corriente va en ese sentido.', { symk: 'led', c: 'ba_sym1', h: 'La raya del final es el cátodo, la pata que va al −.' }),
    I('El <b>interruptor</b> es una palanca; el <b>pulsador</b>, un puente que baja al apretar; la <b>masa</b>, unas rayas que se estrechan.', { svg: S.swGnd }),
    { t: 'match', q: 'Une cada símbolo.', pairs: [['sym:res', 'Resistencia'], ['sym:bat', 'Pila'], ['sym:led', 'LED'], ['sym:lamp', 'Bombilla']], c: 'ba_sym1', h: 'Empieza por los que tienen un detalle claro: las flechas, las dos rayas, el aspa.' },
    { t: 'match', q: 'Y estos.', pairs: [['sym:push', 'Pulsador'], ['sym:gnd', 'Masa (GND)'], ['sym:sw', 'Interruptor'], ['sym:motor', 'Motor']], c: 'ba_sym1', h: 'El motor lleva una M; la masa, rayas que se estrechan.' },
    { t: 'steps', title: 'Paso a paso', text: 'Así se dibuja la linterna símbolo a símbolo.', sch: 'flashlight', steps: ['La <b>pila</b> a la izquierda, con el + (raya larga) arriba', 'Del + sale un cable al <b>interruptor S1</b>', 'Después, la <b>resistencia R1</b>', 'Luego el <b>LED D1</b>, con el triángulo apuntando hacia abajo, hacia el −', 'Y un cable de vuelta al − de la pila'], result: 'Cuatro símbolos y cuatro cables: la linterna entera' },
    Q('En el esquema de la linterna, ¿qué componente es S1?', ['El interruptor', 'La pila', 'El LED', 'La resistencia'], 'Una palanca: S de «switch», interruptor en inglés.', { sch: 'flashlight', c: 'ba_sym1', h: 'Busca el símbolo que parece una palanca.' }),
    I('<b>Resumen</b>\n· Un esquema dibuja conexiones, no posiciones.\n· Pila: raya larga = +. LED: triángulo + raya + flechas.\n· Interruptor (palanca), pulsador (puente), masa (rayas que se estrechan).')
   ]),
   L('b6', 'Abierto, cerrado y cortocircuito', 'bolt', ['ba_circuit', 'ba_short', 'ba_rint', 'ba_ledknee'], [
    Q('En la linterna, ¿qué crees que pasa si se suelta el cable que vuelve al − de la pila?', ['Se apaga: el camino queda abierto', 'Sigue encendida: la corriente ya ha llegado', 'Brilla más', 'Se quema'], 'Se apaga: la corriente necesita volver a la pila. Un corte en cualquier punto la para entera.', { predict: true, c: 'ba_circuit', h: 'Recuerda que la corriente da la vuelta completa.' }),
    { t: 'explore', title: 'Abre, cierra… y provoca un corto', text: 'Aquí puedes provocar un cortocircuito sin peligro. Mueve los mandos.', viz: 'circuitState', params: { sw: { label: 'Interruptor (0 abierto · 1 cerrado)', val: 0, list: [0, 1], dec: 0 }, sc: { label: 'Cable de corto (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 }, fu: { label: 'Fusible (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 } },
      tasks: [
        { q: 'lit', min: 1, max: 1, text: 'Enciende el LED', done: 'Circuito cerrado: la corriente da la vuelta entera.', hint: 'Cierra el interruptor.' },
        { q: 'short', min: 1, max: 1, text: 'Provoca un cortocircuito', done: 'Un cable de + a − sin nada que frene: corriente enorme y calor. El LED se apaga porque la corriente se va por el atajo.', hint: 'Pon el cable de corto.' },
        { q: 'safe', min: 1, max: 1, text: 'Protege el circuito con un fusible (con el corto puesto)', done: 'El fusible se funde y abre el circuito: ya no pasa nada.' }
      ] },
    I('Un circuito es un <b>camino cerrado</b> desde un polo de la pila, por los componentes, hasta el otro.\nSi se corta en cualquier punto (<b>circuito abierto</b>), la corriente se para en todas partes.', { svg: S.openClosed }),
    Q('Si el LED se suelta de un lado, ¿qué pasa?', ['Se apaga todo: circuito abierto', 'Sigue luciendo la mitad', 'Cortocircuito', 'La resistencia se calienta'], 'Un corte abre el circuito entero.', { sch: 'flashlight', c: 'ba_circuit', h: 'Sigue el camino con el dedo: ¿se puede volver al −?' }),
    Q('¿Dónde tiene que estar el interruptor para apagar el LED?', ['En cualquier punto del bucle', 'Solo junto al +', 'Solo junto al −', 'Dentro del LED'], 'Cortes donde cortes, se para todo.', { c: 'ba_circuit', h: 'En un solo bucle, ¿importa dónde se corte?' }),
    I('Un <b>cortocircuito</b> es un camino casi sin resistencia entre los dos polos. La corriente se dispara: cables calientes, pilas agotadas en minutos y baterías de litio que pueden arder.', { svg: S.short, more: 'Una pila AA en cortocircuito puede dar varios amperios y calentarse mucho; una batería de litio o de coche, cientos de amperios. Por eso nunca se guardan sueltas con monedas o llaves.' }),
    I('¿Y qué limita la corriente en un corto? Solo la <b>resistencia interna</b> de la pila y la de los cables. Por eso es la pila la que se calienta.', { svg: S.rint }),
    Q('¿Qué limita la corriente en un cortocircuito de una pila?', ['Solo su resistencia interna y la de los cables', 'Nada: es infinita', 'El color del cable', 'La tensión baja a cero'], 'Por eso se calientan la pila y los cables.', { c: 'ba_rint', h: 'Recuerda el freno escondido dentro de la pila.' }),
    I('El <b>fusible</b> es un hilo fino a propósito. Si pasa demasiada corriente, se funde y abre el circuito antes de que algo arda.', { svg: S.fuse }),
    Q('¿Para qué sirve un fusible?', ['Para fundirse y abrir el circuito si pasa demasiada corriente', 'Para aumentar la corriente', 'Para medir', 'Para guardar carga'], 'Un punto débil a propósito.', { c: 'ba_short', h: 'Piensa en qué le pasa a un hilo muy fino con mucha corriente.' }),
    { t: 'pick', q: '¿Cuál de estos circuitos tiene un problema grave?', o: ['ledNoRes', 'ledBasic', 'flashlight'], a: 0, e: 'Sin resistencia, el LED deja pasar una corriente enorme y se quema.', c: 'ba_ledknee', h: 'Busca el que no tiene nada que frene la corriente.' },
    Q('Un cable pelado toca a la vez el + y el − de una batería de litio. ¿Qué es?', ['Un cortocircuito: peligro de calor e incendio', 'Un circuito abierto', 'Nada grave, son pocos voltios', 'Una forma de cargarla'], 'Un camino sin freno entre los polos.', { c: 'ba_short', h: '¿Hay algo que frene la corriente en ese camino?' }),
    Q('¿Qué pasa después de que se funda un fusible?', ['El circuito queda abierto y deja de pasar corriente', 'Pasa más corriente', 'Se recarga la pila', 'El LED brilla más'], 'Hasta que lo cambies, el camino está cortado.', { c: 'ba_short', h: 'Un fusible fundido es como un cable cortado.' }),
    I('<b>Resumen</b>\n· Cerrado: la corriente da la vuelta. Abierto: un corte en cualquier punto la para entera.\n· Cortocircuito: camino sin freno entre polos → calor y peligro.\n· El fusible se funde y abre el circuito.')
   ]),
   L('e3', 'Leer esquemas', 'sym', ['ba_trace', 'ba_junction'], [
    Q('En un esquema, dos cables se cruzan sin ningún punto. ¿Crees que están conectados?', ['No', 'Sí', 'Depende del color'], 'No: sin punto, un cable solo pasa por encima del otro. Lo vas a comprobar.', { predict: true, c: 'ba_junction', h: 'Piensa en dos calles que se cruzan con un puente.' }),
    I('Para leer un esquema, <b>sigue la corriente</b> con el dedo: sal del + de la pila, atraviesa los componentes y vuelve al −. Si el camino se completa, hay corriente.', { svg: S.flashFlow }),
    { t: 'explore', title: 'El punto del cruce', text: 'El cable de D2 cruza el cable de arriba. Cierra S1 y prueba con y sin punto.', viz: 'crossDot', params: { sw: { label: 'S1 (0 abierto · 1 cerrado)', val: 0, list: [0, 1], dec: 0 }, dot: { label: 'Punto en el cruce (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 } },
      tasks: [
        { q: 'one', min: 1, max: 1, text: 'Cierra S1: ¿qué LEDs lucen?', done: 'Solo D1: el cable de D2 cruza sin punto, no está unido.', hint: 'Pon S1 a 1.' },
        { q: 'both', min: 1, max: 1, text: 'Haz que luzcan los dos', done: 'Con un punto en el cruce, los cables quedan unidos y D2 también recibe corriente.' },
        { q: 'one', min: 1, max: 1, text: 'Apaga D2 sin tocar S1', done: 'Quitando el punto, el cruce vuelve a ser solo un cruce.' }
      ] },
    I('Un <b>punto gordo</b> donde se juntan líneas es una unión. Dos líneas que se cruzan <b>sin punto</b> no se tocan.', { svg: S.dots, more: 'Para evitar dudas, muchos diseñadores no dibujan nunca cruces de cuatro caminos con punto: separan las uniones en dos «T» un poco desplazadas.' }),
    Q('Dos cables se cruzan sin punto. ¿Están conectados?', ['No', 'Sí', 'Depende del color', 'Solo los de masa'], 'Sin punto no hay unión.', { c: 'ba_junction', h: '¿Ves un punto gordo en el cruce?' }),
    { t: 'pick', q: 'Solo uno encenderá el LED sin dañarlo.', o: ['ledBasic', 'ledNoRes', 'ledReversed'], a: 0, e: 'Sin resistencia se quema; con el triángulo al revés no conduce.', c: 'ba_trace', h: 'Comprueba en cada uno la resistencia y hacia dónde apunta el triángulo del LED.' },
    Q('En la linterna, ¿qué pasa si abres S1?', ['El LED se apaga', 'Brilla más', 'La pila dura menos', 'Nada'], 'S1 está en el único camino.', { sch: 'flashlight', c: 'ba_trace', h: 'Sigue el camino con el dedo hasta S1.' }),
    { t: 'steps', title: 'Paso a paso', text: 'Lee este esquema: ¿cuándo luce el LED?', sch: 'andSw', steps: ['Sal del + de la pila', 'Llegas al pulsador <b>A</b>: solo hay camino si está pulsado', 'Después, el pulsador <b>B</b>: también tiene que estar pulsado', 'Resistencia, LED (en su sentido) y vuelta al −'], result: 'El LED solo luce con A y B pulsados a la vez' },
    Q('En ese esquema, ¿qué pasa si pulsas solo A?', ['No luce: B sigue abierto', 'Luce', 'Se quema', 'Hay un cortocircuito'], 'Los dos pulsadores están en el mismo camino.', { sch: 'andSw', c: 'ba_trace', h: 'Con el dedo: ¿puedes pasar por B sin pulsarlo?' }),
    Q('¿Y en este otro? ¿Cuándo luce el LED?', ['Con A o con B pulsado (o los dos)', 'Solo con los dos', 'Nunca', 'Siempre'], 'Los puntos crean dos caminos: basta con uno.', { sch: 'orSw', c: 'ba_trace', h: 'Busca los puntos gordos: ¿cuántos caminos hay hasta la resistencia?' }),
    Q('En un esquema hay un punto gordo donde se juntan tres líneas. ¿Qué significa?', ['Que los tres cables están unidos', 'Que hay un componente', 'Que ahí no pasa corriente', 'Que es masa'], 'Punto = unión.', { c: 'ba_junction', h: 'El punto es la señal de unión.' }),
    Q('En la linterna, ¿por qué pata entra la corriente al LED D1?', ['Por el ánodo, el lado ancho del triángulo', 'Por el cátodo, el lado de la raya', 'Por las dos', 'Por las flechas'], 'Entra por el ánodo y sale por el cátodo.', { sch: 'flashlight', c: 'ba_trace', h: 'El triángulo apunta en el sentido de la corriente.' }),
    I('<b>Resumen</b>\n· Lee siguiendo la corriente del + al −.\n· Punto gordo = unión; cruce sin punto = sin conexión.\n· Uno detrás de otro: todos tienen que dejar pasar. Dos caminos unidos por puntos: basta uno.')
   ]),
   L('e4', 'Convenciones de dibujo', 'sym', ['ba_schread'], [
    Q('Un esquema tiene cuatro símbolos de masa repartidos. ¿Cuántos puntos distintos del circuito crees que son?', ['Uno solo: todos están unidos', 'Cuatro', 'Dos', 'Depende de la pila'], 'Uno: todas las masas son el mismo punto, aunque no se dibuje el cable.', { predict: true, c: 'ba_schread', h: 'Recuerda qué es la masa: la referencia de 0 V.' }),
    I('Los esquemas siguen unas costumbres para leerse de un vistazo: <b>tensión alta arriba, masa abajo</b>, y la señal de izquierda a derecha.', { svg: S.conventions }),
    { t: 'explore', title: 'Tres dibujos, un circuito', text: 'Es la misma linterna dibujada de tres formas. Cambia el dibujo y el interruptor.', viz: 'gndMerge', params: { m: { label: 'Dibujo (0 cables · 1 masas · 2 etiquetas)', val: 0, list: [0, 1, 2], dec: 0 }, sw: { label: 'Interruptor (0 · 1)', val: 0, list: [0, 1], dec: 0 } },
      tasks: [
        { q: 'lit', min: 1, max: 1, text: 'Enciende el LED', done: 'Cerrado: luce.', hint: 'Pon el interruptor a 1.' },
        { q: 'm1lit', min: 1, max: 1, text: 'Pasa al dibujo con símbolos de masa', done: 'Sigue luciendo: las dos masas son el mismo punto, aunque falte el cable de abajo.' },
        { q: 'm2lit', min: 1, max: 1, text: 'Ahora al dibujo con etiquetas', done: 'Igual: los dos «LUZ» están unidos por su nombre.' }
      ] },
    I('Un símbolo de <b>masa</b> en cada sitio evita llenar el dibujo de cables: <b>todas las masas están unidas</b>.\nY un símbolo como «+9 V» significa «unido al + de la pila de 9 V».', { sch: 'ba_flashGnd' }),
    Q('En este esquema, ¿están unidos el − de la pila y el cátodo del LED?', ['Sí: los dos van a un símbolo de masa', 'No: no hay cable entre ellos', 'Solo si se tocan', 'Solo con el interruptor cerrado'], 'Todas las masas son el mismo punto.', { sch: 'ba_flashGnd', c: 'ba_schread', h: 'Mira adónde va cada uno: ¿qué símbolo tienen debajo?' }),
    I('Las <b>etiquetas de red</b> funcionan igual: dos cables con el mismo nombre están conectados, aunque no se dibuje la línea.', { svg: S.labels }),
    Q('Dos cables con la etiqueta «LUZ». ¿Están conectados?', ['Sí', 'No', 'Solo si se tocan', 'Solo en placas grandes'], 'Se conectan por el nombre.', { c: 'ba_schread', h: 'Mismo nombre…' }),
    Q('¿Qué significa un símbolo «+9 V» en un esquema?', ['Un punto unido al + de la alimentación de 9 V', 'Una pila de 9 V nueva', 'Que todos los cables tienen 9 V', 'Un fusible'], 'Es una etiqueta de la alimentación.', { c: 'ba_schread', h: 'Es una etiqueta: ¿con qué está unido ese punto?' }),
    { t: 'steps', title: 'Paso a paso', text: 'Redibuja la linterna con símbolos de masa.', sch: 'ba_flashGnd', steps: ['La pila aparte: su + a un símbolo «+9 V» y su − a masa', 'Arriba, otro «+9 V»: de ahí sale la corriente', 'Interruptor S1 y resistencia R1 hacia la derecha', 'LED D1 vertical, apuntando hacia abajo', 'Debajo del LED, un símbolo de masa: no hace falta dibujar el cable de vuelta'], result: 'El mismo circuito, más limpio' },
    { t: 'order', q: 'Ordena cómo dibujar la linterna con todos sus cables.', items: ['Pila a la izquierda, + arriba', 'Cable al interruptor', 'La resistencia', 'El LED, ánodo hacia la resistencia', 'Cierra hasta el −'], e: 'Del + al −, siguiendo la corriente.', c: 'ba_schread', h: 'Sigue el camino de la corriente, del + al −.' },
    Q('¿Por qué se dibuja la masa abajo y la tensión más alta arriba?', ['Para leer el esquema como un desnivel: la corriente «baja» por la página', 'Porque la masa pesa más', 'Lo exige la ley', 'Para que quepa en la hoja'], 'Es una costumbre que hace los esquemas más fáciles de leer.', { c: 'ba_schread', h: 'Recuerda la analogía de las alturas eléctricas.' }),
    I('<b>Resumen</b>\n· Tensión alta arriba, masa abajo; señal de izquierda a derecha.\n· Todas las masas son un solo punto.\n· Mismo nombre de etiqueta = mismo cable.')
   ]),
   L('e5', 'La protoboard por dentro', 'bb', ['breadboard'], [
    Q('Pinchas dos cables en dos agujeros de la misma columna de 5 (por ejemplo, a3 y d3) de una protoboard. ¿Crees que están conectados?', ['Sí: por dentro hay una tira metálica', 'No: cada agujero va por libre', 'Solo si están juntos'], 'Sí: cada columna de 5 agujeros comparte una pinza metálica.', { predict: true, c: 'breadboard', h: 'La protoboard sirve para conectar sin soldar: algo tiene que unir los agujeros.' }),
    { t: 'explore', title: 'Rayos X', text: 'Mira la protoboard por dentro y coloca una resistencia.', viz: 'bbXray', params: { xr: { label: 'Rayos X (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 }, a: { label: 'Pata 1 (columna)', val: 2, min: 1, max: 10, step: 1, dec: 0 }, b: { label: 'Pata 2 (columna)', val: 6, min: 1, max: 10, step: 1, dec: 0 } },
      tasks: [
        { q: 'xr', min: 1, max: 1, text: 'Activa los rayos X', done: 'Cada columna de 5 agujeros es una tira metálica, y las filas de arriba recorren toda la placa.', hint: 'Pon los rayos X a 1.' },
        { q: 'same', min: 1, max: 1, text: 'Pon las dos patas en la misma columna', done: 'Error típico: la tira une las dos patas y la corriente pasa por ella, no por la resistencia.' },
        { q: 'gap', min: 3, max: 3, text: 'Colócala bien, con tres columnas de separación', done: 'Así cada pata queda en su nudo.' }
      ] },
    I('Por dentro: cada <b>columna de 5</b> agujeros (a–e o f–j) es una tira metálica. Las <b>filas largas</b> de los bordes (+ y −) recorren la placa y reparten la alimentación. La <b>ranura central</b> separa las dos mitades.', { svg: S.xray }),
    { t: 'bbtap', q: 'Toca todos los agujeros conectados al marcado.', start: [3, 3], c: 'breadboard', h: 'Solo la columna de 5 del mismo lado de la ranura.' },
    { t: 'bbtap', q: 'Ahora este, en la otra mitad.', start: [6, 9], c: 'breadboard', h: 'La ranura central separa: quédate en la mitad de abajo.' },
    { t: 'bbtap', q: 'Y este, en la fila de alimentación.', start: [2, 0], c: 'breadboard', h: 'Las filas de los bordes van a lo largo, no a lo alto.' },
    I('La ranura central deja pinchar piezas con patas a los dos lados (como los chips, que verás más adelante) sin unir sus patas enfrentadas.'),
    Q('¿Para qué sirve la ranura central?', ['Para pinchar piezas con patas a los dos lados sin unirlas', 'Para ventilar', 'Para separar + y −', 'Para sujetarla'], 'Separa las columnas de arriba de las de abajo.', { c: 'breadboard', h: '¿Qué quedaría unido si la columna siguiera por debajo?' }),
    Q('Las dos patas de una resistencia en la misma columna (a y c)…', ['Quedan puenteadas: no hace nada', 'Funciona normal', 'Se quema la protoboard', 'Duplica su valor'], 'Mismo nudo: la corriente se va por la tira.', { c: 'breadboard', h: 'Recuerda el reto de los rayos X.' }),
    I('Los dos errores más típicos: las dos patas de una pieza en la misma columna, y una pata en una columna donde no hay nada más.', { svg: S.bbErrors }),
    Q('Quieres unir una pata de la resistencia con el ánodo de un LED. ¿Cómo?', ['Pinchándolas en la misma columna de 5', 'En columnas contiguas', 'Una en cada mitad', 'Una en la fila + y otra en la −'], 'Misma columna = unidas.', { c: 'breadboard', h: '¿Qué agujeros comparten tira?' }),
    Q('Algunas protoboards largas tienen las filas de alimentación cortadas por la mitad. ¿Qué haces?', ['Comprobarlo y, si hace falta, unir las dos mitades con un cable', 'Nada: siempre están unidas', 'Tirarla', 'Usar solo la mitad izquierda'], 'Suele verse porque la línea roja o azul se interrumpe.', { c: 'breadboard', h: 'Fíjate en si la línea roja o azul se corta a la mitad.' }),
    I('<b>Resumen</b>\n· Columna de 5 = un nudo. Filas de los bordes: alimentación, a lo largo.\n· La ranura separa las dos mitades.\n· Nunca las dos patas de una pieza en la misma columna.')
   ]),
   L('e6', 'Del esquema a la protoboard', 'bb', ['ba_bbnodes', 'breadboard'], [
    Q('Para pasar un esquema a la protoboard, ¿qué crees que importa?', ['Que lo que está unido en el esquema quede en la misma columna', 'Que las piezas queden en la misma posición que en el dibujo', 'Que los cables sean del mismo color', 'Que todo quede en línea recta'], 'Lo que cuenta son las conexiones, igual que en el esquema.', { predict: true, c: 'ba_bbnodes', h: 'Recuerda qué dibuja un esquema: ¿posiciones o conexiones?' }),
    I('Un <b>nudo</b> es cada punto del esquema donde se unen patas. El truco: <b>cada nudo, una columna</b>. La linterna tiene 4 nudos.', { svg: S.nodes, more: 'Para contarlos, recorre el circuito y marca cada unión entre piezas vecinas. En un solo bucle hay tantos nudos como piezas.' }),
    { t: 'explore', title: 'Pincha el LED', text: 'Resistencia y cables ya están puestos: el + entra por la columna 2 y la columna 8 va al −. Coloca las patas del LED.', viz: 'bbMap', params: { A: { label: 'Ánodo, pata larga (columna)', val: 4, min: 1, max: 10, step: 1, dec: 0 }, K: { label: 'Cátodo, pata corta (columna)', val: 7, min: 1, max: 10, step: 1, dec: 0 } },
      tasks: [
        { q: 'lit', min: 1, max: 1, text: 'Haz que luzca', done: 'Ánodo en la columna de la resistencia (nudo 2) y cátodo en la del cable al − (nudo 3).', hint: '¿En qué columnas acaban la resistencia y el cable al −?' },
        { q: 'rev', min: 1, max: 1, text: 'Ahora ponlo en los mismos nudos, pero al revés', done: 'No luce: los nudos están bien, pero el LED solo conduce en un sentido.' }
      ] },
    Q('¿Cuántos nudos tiene la linterna?', ['4', '2', '6', '1'], '+ e interruptor; interruptor y resistencia; resistencia y LED; LED y −.', { sch: 'flashlight', c: 'ba_bbnodes', h: 'Cuenta las uniones entre piezas vecinas.' }),
    Q('Una pata de la resistencia y el ánodo del LED están en el mismo nudo. En la protoboard van…', ['En la misma columna', 'En columnas contiguas', 'En la fila +', 'Da igual'], 'Mismo nudo, misma columna.', { c: 'ba_bbnodes', h: 'Nudo y columna son lo mismo.' }),
    { t: 'steps', title: 'Paso a paso', text: 'Pasa la linterna a la protoboard, nudo a nudo.', sch: 'flashlight', steps: ['<b>Nudo 1</b> (+ y S1): cable rojo de la pila a la fila +; un puente de la fila + a la columna 2, y ahí una pata de S1', '<b>Nudo 2</b> (S1 y R1): la otra pata de S1 y una pata de R1 en la columna 5', '<b>Nudo 3</b> (R1 y LED): la otra pata de R1 y el ánodo en la columna 9', '<b>Nudo 4</b> (LED y −): el cátodo en la columna 10 y un cable de ahí a la fila −; el negro de la pila, a la fila −'], result: 'Cuatro nudos, cuatro sitios: ni uno más ni uno menos' },
    { t: 'order', q: 'Ordena una buena rutina de montaje.', items: ['Desconecta la pila', 'Monta siguiendo los nudos', 'Revisa cada conexión contra el esquema', 'Conecta la pila', 'Comprueba que funciona'], e: 'Nunca montes con la pila puesta.', c: 'ba_bbnodes', h: 'Lo primero y lo último tienen que ver con la pila.' },
    Q('El LED no luce. Ves el ánodo en la columna 9 y la pata de la resistencia en la 8. ¿Qué pasa?', ['No están en el mismo nudo: el camino está abierto', 'Funciona igual: están al lado', 'Hay un cortocircuito', 'El LED está al revés'], 'Columnas distintas = nudos distintos.', { c: 'ba_bbnodes', h: '¿Las columnas contiguas están unidas por dentro?' }),
    I('Antes de conectar la pila, repasa: cada nudo del esquema en su columna, nada de más, nada de menos, y el LED en su sentido.', { svg: S.check }),
    Q('Pila, resistencia y LED en un solo bucle. ¿Cuántos nudos?', ['3', '2', '6', '4'], 'Uno entre cada par de piezas vecinas.', { c: 'ba_bbnodes', h: 'En un bucle simple hay tantos nudos como piezas.' }),
    I('<b>Resumen</b>\n· Nudo = punto de unión del esquema = una columna de la protoboard.\n· Monta sin pila, nudo a nudo, y revisa antes de conectar.\n· Columnas contiguas no están unidas.')
   ]),
   SIM('s1a', 'Reto: tu primer circuito', 'Monta pila, interruptor, resistencia y LED. El LED solo debe encenderse con el interruptor cerrado.', { battery: 9, parts: ['sw', 'res', 'led'], sch: 'flashlight', hint: 'Del + al interruptor, luego la resistencia, luego el LED (pata + hacia la resistencia) y vuelta al −. Toca el interruptor dos veces para cambiarlo.' }, 'flashlight'),
   SIM('s2', 'Reto: del esquema a la protoboard', 'Monta exactamente el esquema de la linterna.', { battery: 9, parts: ['sw', 'res', 'led'], sch: 'flashlight', hint: 'Interruptor, resistencia y LED en serie de + a −.' }, 'flashlight')
  ] });
})();
