/* Voltio · curso base, módulo 12: Circuitos integrados y el 555.
   Orden: qué es un integrado (k1) → alimentación y desacoplo (k3) → pull-up y pull-down (k20)
   → 555 astable (k4) → 555 monoestable (k5) → trucos del 555 (k15).
   Aquí aún NO se han visto operacionales ni comparadores como lección (k6, k7: se explica en el sitio qué
   hace un comparador), puertas lógicas, binario, reguladores ni microcontroladores. */
(() => {
  const { num, fR, fI, fV, st, resBody, flowPath, hbar } = Widgets.H;
  const sv = (h, b) => `<svg viewBox="0 0 300 ${h}" class="viz">${b}</svg>`;
  const tx = (x, y, s, c = 'vizsm', a = 'start', extra = '') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}"${extra}>${s}</text>`;
  const W = (d, col = 'currentColor', w = 2.2) => `<path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const RES = (x, y, rot = 0, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path d="M-30 0h10l3 -7l6 14l6 -14l6 14l6 -14l6 14l3 -7h10" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/></g>`;
  const CAP = (x, y, rot = 0, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path d="M-30 0h26M4 0h26M-4 -12v24M4 -12v24" stroke="currentColor" stroke-width="2.2" fill="none"/></g>`;
  const DIO = (x, y, rot = 0, sc = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path d="M-30 0h20M10 0h20M-10 -10v20l20 -10z M10 -10v20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/></g>`;
  const GND = (x, y) => W(`M${x} ${y}v8M${x - 10} ${y + 8}h20M${x - 6} ${y + 12}h12M${x - 2} ${y + 16}h4`);
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="currentColor"/>`;
  const bulb = (b, r = 10) => `<circle r="${r * 2.1}" fill="#FF3B30" opacity="${(b * 0.45).toFixed(2)}"/><circle r="${r}" fill="#FF3B30" style="filter:brightness(${(0.4 + 0.9 * b).toFixed(2)})"/>`;
  // Chip DIP visto desde arriba con la muesca a la izquierda; hl = pata resaltada; lab(i) = texto de la pata
  const dip = (x, y, n, hl, lab, w = 0) => {
    const half = n / 2, pw = 22, bw = w || half * pw + 10, bh = 54;
    let s = `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="#1f1f1f"/><path d="M${x} ${y + bh / 2 - 8}a8 8 0 0 1 0 16" fill="var(--bg)"/><circle cx="${x + 12}" cy="${y + bh - 11}" r="3" fill="#777"/>`;
    for (let i = 1; i <= n; i++) {
      const bot = i <= half, k = bot ? i - 1 : n - i, px = x + 5 + k * ((bw - 10) / half) + (bw - 10) / half / 2 - 5, py = bot ? y + bh : y - 12, on = i === hl;
      s += `<rect x="${px.toFixed(1)}" y="${py}" width="10" height="12" fill="${on ? 'var(--led)' : '#9AA3B2'}"/>` + tx(px + 5, bot ? py + 24 : py - 4, lab ? lab(i) : i, on ? 'vizlab' : 'vizsm', 'middle', on ? ' style="fill:var(--led)"' : '');
    }
    return s;
  };

  /* ================= VISUALIZACIONES ================= */
  Object.assign(Widgets.VIZ, {
    /* k1: numeración de patas */
    icPins: {
      calc: p => ({ valid: p.k <= p.n ? 1 : 0, opp: p.n + 1 - p.k, sel85: p.n == 8 && p.k == 5 ? 1 : 0, sel1414: p.n == 14 && p.k == 14 ? 1 : 0, sel1614: p.n == 16 && p.k == 14 ? 1 : 0 }),
      svg: (p, o) => {
        const bw = Math.min(250, p.n / 2 * 28 + 10), x = 150 - bw / 2;
        let s = dip(x, 60, p.n, o.valid ? p.k : 0, null, bw) + tx(x - 4, 92, 'muesca', 'vizsm', 'end');
        s += tx(150, 18, `DIP-${p.n} visto desde arriba`, 'vizlab', 'middle');
        const msg = !o.valid ? `Un DIP-${p.n} no tiene pata ${p.k}` : `Pata ${p.k}: ${p.k <= p.n / 2 ? 'fila de abajo' : 'fila de arriba'} · enfrente, la ${o.opp}`;
        return sv(170, s + tx(150, 158, msg, 'vizlab', 'middle'));
      }
    },
    /* k3: caída de la alimentación de un chip en un pico de consumo */
    decoupling: {
      calc: p => { const L = (p.C ? p.d : 200) * 1e-9, dip = L * 0.1 / 10e-9 + (p.C ? 1e-9 / (p.C * 1e-9) : 0); return { dip, bigfar: p.C == 1000 && p.d == 200 ? 1 : 0 }; },
      svg: (p, o) => {
        const cx = 226 - Math.min(200, p.d) * 0.99;
        let s = `<rect x="240" y="34" width="50" height="50" rx="4" fill="#1f1f1f"/>` + tx(265, 63, 'chip', 'vizsm', 'middle', ' style="fill:#ddd"') + W('M14 40H240M14 78H240') + tx(14, 32, '5 V desde la fuente (lejos)', 'vizsm');
        if (p.C) s += `<g transform="translate(${cx.toFixed(1)} 59) rotate(90)"><path d="M-19 0h15M4 0h15M-4 -10v20M4 -10v20" stroke="var(--ice)" stroke-width="2.4" fill="none"/></g>` + tx(cx, 100, `${p.C >= 1000 ? '1 µF' : p.C + ' nF'} a ${p.d} mm`, 'vizsm', 'middle', ' style="fill:var(--ice)"');
        else s += tx(150, 100, 'sin condensador de desacoplo', 'vizsm', 'middle', ' style="fill:var(--err)"');
        const Y = v => 122 + 48 * Math.min(v, 5) / 5, dipY = Y(Math.min(5, o.dip));
        s += W('M14 122H290', 'var(--line)', 1) + tx(14, 118, 'tensión en el chip:', 'vizsm') + `<path d="M14 122H140L146 ${dipY.toFixed(1)}L156 122H290" stroke="${o.dip > 0.5 ? 'var(--err)' : 'var(--ok)'}" stroke-width="2.4" fill="none"/>`;
        return sv(196, s + tx(150, 190, `Cae ${o.dip >= 1 ? fV(o.dip) : num(o.dip * 1000, 0) + ' mV'} en el pico de 100 mA`, 'vizlab', 'middle', o.dip > 0.5 ? ' style="fill:var(--err)"' : o.dip <= 0.05 ? ' style="fill:var(--ok)"' : ''));
      }
    },
    /* k20: entrada con o sin resistencia de pull-up / pull-down */
    pullup: {
      anim: true,
      calc: p => {
        let V, I = 0, read;
        if (p.mode == 0) { if (p.btn) { V = 0; read = 0; } else { V = NaN; read = -1; } }
        else if (p.mode == 1) { if (p.btn) { V = 0; I = 5 / p.R; read = 0; } else { V = 5; read = 1; } }
        else { if (p.btn) { V = 5; I = 5 / p.R; read = 1; } else { V = 0; read = 0; } }
        const weak = p.mode > 0 && p.R >= 1e6 ? 1 : 0;
        return { V: isNaN(V) ? -1 : V, I, read, weak, stable1: !p.btn && read === 1 ? 1 : 0, pressed0: p.mode == 1 && p.btn && read === 0 ? 1 : 0, lowI: p.mode == 1 && p.btn && I <= 0.000501 ? 1 : 0 };
      },
      svg: (p, o, t) => {
        let s = W('M20 16H200') + tx(24, 12, '+5 V', 'vizsm') + W('M20 186H200') + tx(24, 200, 'masa', 'vizsm');
        const node = 100;
        if (p.mode == 1) s += `<rect x="90" y="26" width="20" height="44" fill="var(--surface)"/>` + RES(100, 48, 90, 0.7) + W('M100 16V27M100 69V100') + tx(112, 52, fR(p.R), 'vizsm');
        if (p.mode == 2) s += `<rect x="90" y="130" width="20" height="44" fill="var(--surface)"/>` + RES(100, 152, 90, 0.7) + W('M100 100V131M100 173V186') + tx(112, 156, fR(p.R), 'vizsm');
        // pulsador: a masa (modos 0 y 1) o al + (modo 2)
        const up = p.mode == 2, by = up ? 50 : 150;
        s += W(`M60 ${up ? 16 : 186}V${up ? by - 14 : by + 14}M60 ${up ? by + 14 : by - 14}V${node}H160`) + `<circle cx="60" cy="${by - 14}" r="3" fill="currentColor"/><circle cx="60" cy="${by + 14}" r="3" fill="currentColor"/>` + W(p.btn ? `M48 ${by - 14}V${by + 14}` : `M48 ${by - 10}V${by + 10}`, p.btn ? 'var(--ok)' : 'currentColor', 3) + W(p.btn ? `M48 ${by}H60` : `M48 ${by}H40`) + tx(8, by + (up ? -22 : 30), p.btn ? 'pulsado' : 'suelto', 'vizsm');
        s += dot(100, node) + `<rect x="160" y="80" width="40" height="40" rx="4" fill="#1f1f1f"/>` + tx(180, 104, 'entrada', 'vizsm', 'middle', ' style="fill:#ddd;font-size:9px"');
        if (o.I > 0) s += flowPath(up ? 'M60 16V100H100V186' : 'M100 16V100H60V186', o.I, 0.0005);
        // lectura y traza
        const rd = o.read === -1 ? '?' : String(o.read), col = o.read === -1 ? 'var(--err)' : o.read ? 'var(--ice)' : 'var(--ok)';
        s += tx(250, 70, 'lee', 'vizsm', 'middle') + tx(250, 108, rd, 'vizbig', 'middle', ` style="font-size:36px;fill:${col}"`);
        let d = ''; for (let i = 0; i <= 60; i++) { const x = 214 + i * 1.3, v = o.read === -1 ? 2.5 + 2.2 * Math.sin(i * 0.7 + t * 9) * Math.sin(i * 0.23 + t * 3.1) : o.V; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (170 - v * 9).toFixed(1); }
        s += `<path d="M212 125H294V172H212Z" fill="none" stroke="var(--line)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.8"/>`;
        const msg = o.read === -1 ? 'Flota: lee lo que le dé el ruido' : o.weak ? 'Resistencia enorme: entrada «débil», sensible al ruido' : o.I > 0 ? `Al pulsar pasan ${fI(o.I)}` : 'Nivel fijo: sin pulsar no pasa corriente';
        return sv(214, s + tx(150, 212, msg, 'vizlab', 'middle', o.read === -1 || o.weak ? ' style="fill:var(--err)"' : ''));
      }
    },
    /* k4: el 555 por dentro, con el condensador oscilando entre 1/3 y 2/3 */
    ic555: {
      anim: true,
      calc: p => { const C = p.C * 1e-6, tH = 0.693 * (p.R1 + p.R2) * C, tL = 0.693 * p.R2 * C, T = tH + tL; return { tH, tL, T, f: 1 / T, ratio: tL / tH }; },
      svg: (p, o, t) => {
        const C = p.C * 1e-6, tc = (p.R1 + p.R2) * C, td = p.R2 * C, k = o.T < 0.8 ? 0.8 / o.T : o.T > 4 ? 4 / o.T : 1, Td = o.T * k;
        const vAt = tt => tt < o.tH ? 9 - 6 * Math.exp(-tt / tc) : 6 * Math.exp(-(tt - o.tH) / td);
        const ph = ((t % Td) / Td) * o.T, v = vAt(ph), hi = ph < o.tH;
        // bloques
        let s = `<rect x="70" y="8" width="160" height="102" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>` + tx(76, 20, '555 por dentro', 'vizsm');
        const comp = (y, lab, on) => `<path d="M100 ${y - 13}v26l24 -13z" fill="${on ? 'var(--led)' : 'none'}" stroke="currentColor" stroke-width="1.6"/>` + tx(130, y + 4, lab, 'vizsm');
        s += comp(40, 'C > 6 V?', v >= 5.95 && hi === false && ph - o.tH < o.tL * 0.06) + comp(84, 'C < 3 V?', v <= 3.05 && hi && ph < o.tH * 0.06);
        s += `<rect x="178" y="34" width="44" height="56" rx="4" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/>` + tx(200, 56, 'memoria', 'vizsm', 'middle') + tx(200, 76, hi ? 'ALTA' : 'BAJA', 'vizlab', 'middle', ` style="fill:${hi ? 'var(--ok)' : 'var(--muted)'}"`);
        s += W('M222 62H246') + `<g transform="translate(262 62)">${bulb(hi ? 1 : 0, 8)}</g>` + tx(262, 94, 'salida', 'vizsm', 'middle');
        s += tx(8, 44, 'umbral 6 V', 'vizsm') + tx(8, 88, 'disparo 3 V', 'vizsm') + tx(8, 66, `C: ${num(v, 1)} V`, 'vizlab');
        s += tx(150, 124, hi ? 'Cargando por R1 + R2 (descarga abierta)' : 'Descargando por R2 (pata 7 a masa)', 'vizsm', 'middle', ` style="fill:${hi ? 'var(--ok)' : 'var(--ice)'}"`);
        // traza
        const X = tt => 20 + 270 * tt / (2 * o.T), Y = vv => 206 - 60 * vv / 9;
        let d = ''; for (let i = 0; i <= 160; i++) { const tt = 2 * o.T * i / 160; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Y(vAt(tt % o.T)).toFixed(1); }
        s += `<path d="M20 ${Y(6)}H290M20 ${Y(3)}H290" stroke="var(--err)" stroke-dasharray="4 3"/>` + tx(292, Y(6) - 2, '2/3', 'vizsm', 'end') + tx(292, Y(3) + 10, '1/3', 'vizsm', 'end') + W('M20 146V206H290', 'currentColor', 1);
        s += `<path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.4"/><circle cx="${X(ph).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4.5" fill="var(--ice)"/>`;
        const fT = x => x >= 1 ? num(x, 2) + ' s' : num(x * 1000, 0) + ' ms';
        return sv(232, s + tx(150, 226, `alto ${fT(o.tH)} · bajo ${fT(o.tL)}${k !== 1 ? (k > 1 ? ' (a cámara lenta)' : ' (acelerado)') : ''}`, 'vizlab', 'middle'));
      }
    },
    /* k5: monoestable con disparo */
    mono: {
      anim: true, restart: true,
      calc: p => ({ t: 1.1 * p.R * p.C * 1e-6, trig: p.trig }),
      svg: (p, o, t) => {
        const run = p.trig && t < o.t, v = p.trig ? (run ? 9 * (1 - Math.exp(-t / (p.R * p.C * 1e-6))) : 0) : 0;
        let s = `<rect x="110" y="20" width="80" height="70" rx="6" fill="#1f1f1f"/>` + tx(150, 60, '555', 'vizbig', 'middle', ' style="fill:#eee"') + W('M190 55H230') + `<g transform="translate(250 55)">${bulb(run ? 1 : 0)}</g>`;
        s += W('M20 70H110') + tx(20, 62, p.trig ? 'disparo: pulsado' : 'disparo: suelto', 'vizsm', 'start', p.trig ? ' style="fill:var(--ok)"' : '');
        s += tx(150, 108, run ? `Salida ALTA: ${num(t, 1)} s de ${num(o.t, 1)} s` : p.trig ? 'Tiempo cumplido: salida baja' : 'En reposo: salida baja', 'vizlab', 'middle', run ? ' style="fill:var(--ok)"' : '');
        const Y = vv => 176 - 50 * vv / 9; s += W('M20 126V176H290', 'currentColor', 1) + `<path d="M20 ${Y(6)}H290" stroke="var(--err)" stroke-dasharray="4 3"/>` + tx(292, Y(6) - 3, '2/3 VCC: fin', 'vizsm', 'end', ' style="fill:var(--err)"');
        const span = Math.max(o.t * 1.2, 0.5), X = tt => 20 + 270 * Math.min(tt, span) / span;
        if (p.trig) { let d = ''; const tau = p.R * p.C * 1e-6; for (let i = 0; i <= 80; i++) { const tt = Math.min(t, span) * i / 80; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ' ' + Y(tt < o.t ? 9 * (1 - Math.exp(-tt / tau)) : 0).toFixed(1); } s += `<path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.4"/>`; }
        s += tx(20, 192, 'tensión del condensador', 'vizsm') + tx(290, 192, `${num(v, 1)} V`, 'vizsm', 'end');
        return sv(212, s + tx(150, 208, `t ≈ 1,1 · R · C = 1,1 × ${fR(p.R)} × ${p.C} µF = ${num(o.t, 2)} s`, 'vizlab', 'middle'));
      }
    },
    /* k15: astable con o sin el diodo en paralelo con R2 */
    astable2: {
      anim: true,
      calc: p => { const C = p.C * 1e-6, tH = 0.693 * (p.D ? p.R1 : p.R1 + p.R2) * C, tL = 0.693 * p.R2 * C, duty = tH / (tH + tL) * 100; return { tH, tL, duty, f: 1 / (tH + tL), dutyNoD: p.D ? 100 : duty, dutyD: p.D ? duty : 100 }; },
      svg: (p, o, t) => {
        const T = o.tH + o.tL, k = T < 0.6 ? 0.6 / T : 1, ph = ((t / k) % T) / T, on = ph < o.duty / 100;
        let s = '', x = 20, w = 260 / 3; let d = 'M20 90';
        for (let i = 0; i < 3; i++) { const xh = x + w * o.duty / 100; d += `V40H${xh.toFixed(1)}V90H${(x + w).toFixed(1)}`; x += w; }
        s += `<path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.6"/>` + W('M20 96H280', 'var(--line)', 1);
        s += `<path d="M20 30H${(20 + w * o.duty / 100).toFixed(1)}" stroke="var(--ok)" stroke-width="2"/>` + tx(22, 24, 'alto', 'vizsm', 'start', ' style="fill:var(--ok)"') + tx(20 + w * o.duty / 100 + 3, 104, 'bajo', 'vizsm');
        s += `<g transform="translate(150 132)">${bulb(on ? 1 : 0)}</g>` + tx(150, 170, `Ciclo de trabajo ${num(o.duty, 1)} % · ${num(o.f, 2)} Hz`, 'vizlab', 'middle');
        return sv(196, s + tx(150, 188, p.D ? 'Con diodo: alto ≈ 0,693·R1·C · bajo ≈ 0,693·R2·C' : 'Sin diodo: alto ≈ 0,693·(R1 + R2)·C · bajo ≈ 0,693·R2·C', 'vizsm', 'middle'));
      }
    }
  });

  /* ================= SVG DE LAS EXPLICACIONES ================= */
  const SVG_DIE = sv(160, `<rect x="50" y="40" width="200" height="80" rx="6" fill="#1f1f1f"/><rect x="120" y="60" width="60" height="40" fill="#6b7fa8"/><path d="M120 60h60v40h-60z" fill="url(#bbgrid)" opacity=".6"/><defs><pattern id="bbgrid" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M6 0H0V6" stroke="#cfe" stroke-width=".6" fill="none"/></pattern></defs>${[0, 1, 2, 3].map(i => `<path d="M${125 + i * 16} 60Q${110 + i * 25} 46 ${70 + i * 52} 40M${125 + i * 16} 100Q${110 + i * 25} 114 ${70 + i * 52} 120" stroke="#d4af37" stroke-width="1.2" fill="none"/>`).join('')}${[0, 1, 2, 3].map(i => `<rect x="${64 + i * 52}" y="28" width="12" height="12" fill="#9AA3B2"/><rect x="${64 + i * 52}" y="120" width="12" height="12" fill="#9AA3B2"/>`).join('')}${tx(150, 152, 'pastilla de silicio unida a las patas con hilos finos', 'vizsm', 'middle')}${tx(150, 18, 'Un integrado abierto', 'vizlab', 'middle')}`);
  const SVG_PKGS = sv(170, `<g transform="translate(10 20)"><rect x="10" y="20" width="50" height="34" rx="3" fill="#1f1f1f"/>${[0, 1, 2, 3].map(i => `<rect x="${14 + i * 12}" y="54" width="5" height="16" fill="#9AA3B2"/>`).join('')}${tx(35, 92, 'DIP', 'vizlab', 'middle')}${tx(35, 106, 'patas largas:', 'vizsm', 'middle')}${tx(35, 118, 'protoboard', 'vizsm', 'middle')}</g>
    <g transform="translate(82 20)"><rect x="10" y="28" width="46" height="22" rx="2" fill="#1f1f1f"/>${[0, 1, 2, 3].map(i => `<path d="M${16 + i * 11} 50v6h4" stroke="#9AA3B2" stroke-width="2.5" fill="none"/>`).join('')}${tx(33, 92, 'SOIC', 'vizlab', 'middle')}${tx(33, 106, 'patas en ala,', 'vizsm', 'middle')}${tx(33, 118, 'en superficie', 'vizsm', 'middle')}</g>
    <g transform="translate(152 20)"><rect x="12" y="24" width="36" height="36" rx="2" fill="#1f1f1f"/>${[0, 1, 2].map(i => `<rect x="${17 + i * 11}" y="58" width="6" height="3" fill="#9AA3B2"/>`).join('')}${tx(30, 92, 'QFN', 'vizlab', 'middle')}${tx(30, 106, 'sin patas:', 'vizsm', 'middle')}${tx(30, 118, 'pads debajo', 'vizsm', 'middle')}</g>
    <g transform="translate(220 20)"><rect x="10" y="20" width="44" height="44" rx="2" fill="#333"/>${[0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => `<circle cx="${17 + i * 10}" cy="${27 + j * 10}" r="3" fill="#bbb"/>`).join('')).join('')}${tx(32, 92, 'BGA', 'vizlab', 'middle')}${tx(32, 106, 'bolitas', 'vizsm', 'middle')}${tx(32, 118, 'debajo', 'vizsm', 'middle')}</g>${tx(150, 162, '→ más pequeños y más difíciles de soldar a mano', 'vizsm', 'middle')}`);
  const SVG_DIP8 = sv(170, dip(80, 60, 8, 1, null, 140) + `<path d="M84 136C60 136 60 136 60 104C60 40 70 40 90 40" stroke="var(--led)" stroke-width="2" fill="none" class="a-draw" style="--len:200"/>` + tx(150, 22, 'Desde arriba, muesca a la izquierda:', 'vizlab', 'middle') + tx(150, 160, '1–4 abajo (→) · 5–8 arriba (←): sentido antihorario', 'vizsm', 'middle'));
  const SVG_PWR = sv(150, dip(90, 50, 8, 0, i => ({ 4: 'GND', 8: 'VCC' })[i] || i, 120) + tx(150, 22, 'Cada chip: alimentación y masa', 'vizlab', 'middle') + tx(150, 140, 'VCC / VDD: el + · GND / VSS: la masa', 'vizsm', 'middle'));
  const SVG_LDROP = sv(160, `<path d="M20 50H90" ${st}/><g transform="translate(120 50)"><path d="M-30 0h6a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0h6" stroke="currentColor" stroke-width="2.2" fill="none"/></g><path d="M150 50H220" ${st}/><rect x="220" y="30" width="56" height="40" rx="4" fill="#1f1f1f"/>${tx(248, 54, 'chip', 'vizsm', 'middle', ' style="fill:#ddd"')}${tx(120, 34, 'el cable: unos 200 nH', 'vizsm', 'middle')}${tx(20, 42, '5 V', 'vizsm')}<path d="M20 120H130L136 150L142 120H280" stroke="var(--err)" stroke-width="2.4" fill="none"/>${tx(150, 100, 'V = L · ΔI / Δt: el cable no da el pico a tiempo', 'vizsm', 'middle')}`);
  const SVG_BYP = sv(160, `<g>${tx(75, 16, 'Bien', 'vizlab', 'middle', ' style="fill:var(--ok)"')}<rect x="60" y="40" width="50" height="50" rx="4" fill="#1f1f1f"/>${CAP(40, 65, 90, 0.6)}${W('M40 47V40H60M40 83V90H60')}${tx(75, 120, 'pegado a sus patas', 'vizsm', 'middle')}</g><g transform="translate(150 0)">${tx(75, 16, 'Mal', 'vizlab', 'middle', ' style="fill:var(--err)"')}<rect x="90" y="40" width="50" height="50" rx="4" fill="#1f1f1f"/>${CAP(14, 65, 90, 0.6)}${W('M14 47V30H90V40M14 83V100H90V90')}${tx(75, 120, 'a varios centímetros', 'vizsm', 'middle')}</g>${tx(150, 150, 'El bucle condensador–chip, cuanto más pequeño, mejor', 'vizsm', 'middle')}`);
  const SVG_FLOAT = sv(150, `<rect x="180" y="40" width="70" height="60" rx="4" fill="#1f1f1f"/>${tx(215, 74, 'entrada', 'vizsm', 'middle', ' style="fill:#ddd"')}${W('M120 70H180')}<circle cx="120" cy="70" r="4" fill="none" stroke="var(--err)" stroke-width="2"/><path d="M40 70q8 -20 16 0t16 0t16 0t16 0" stroke="var(--err)" stroke-width="1.6" fill="none" class="a-fade"/>${tx(70, 46, 'ruido', 'vizsm', 'middle', ' style="fill:var(--err)"')}${tx(215, 124, '¿0 o 1?', 'vizlab', 'middle', ' style="fill:var(--err)"')}${tx(150, 144, 'Una entrada al aire hace de antena', 'vizsm', 'middle')}`);
  const puPanel = (x, pressed) => `<g transform="translate(${x} 0)">${W('M20 20H120')}${tx(24, 16, '+5 V', 'vizsm')}<rect x="60" y="26" width="20" height="40" fill="var(--surface)"/>${RES(70, 46, 90, 0.66)}${W('M70 20V27M70 65V90H110')}${dot(70, 90)}<rect x="110" y="78" width="26" height="24" rx="3" fill="#1f1f1f"/>${W('M70 90V108M70 132V146')}<circle cx="70" cy="108" r="3" fill="currentColor"/><circle cx="70" cy="132" r="3" fill="currentColor"/>${W(pressed ? 'M58 108V132' : 'M58 112V128', pressed ? 'var(--ok)' : 'currentColor', 3)}${GND(70, 146)}${tx(70, 180, pressed ? 'pulsado: lee 0' : 'suelto: lee 1', 'vizlab', 'middle')}${pressed ? `<path d="M76 24V140" stroke="var(--led)" stroke-width="2" fill="none" class="a-flow"/>` : ''}</g>`;
  const SVG_PU = sv(186, puPanel(0, false) + puPanel(150, true));
  const SVG_PD = sv(186, `<g>${W('M20 20H120')}${tx(24, 16, '+5 V', 'vizsm')}${W('M70 20V34M70 58V90H110')}<circle cx="70" cy="34" r="3" fill="currentColor"/><circle cx="70" cy="58" r="3" fill="currentColor"/>${W('M58 38V54')}${dot(70, 90)}<rect x="110" y="78" width="26" height="24" rx="3" fill="#1f1f1f"/><rect x="60" y="104" width="20" height="40" fill="var(--surface)"/>${RES(70, 124, 90, 0.66)}${W('M70 90V105M70 143V150')}${GND(70, 150)}${tx(70, 180, 'suelto: lee 0 · pulsado: 1', 'vizlab', 'middle')}</g>${tx(160, 60, 'Pull-down:', 'vizlab')}${tx(160, 78, 'resistencia a masa', 'vizsm')}${tx(160, 94, 'y pulsador al +', 'vizsm')}${tx(160, 120, 'Lógica directa:', 'vizsm')}${tx(160, 136, 'pulsar = 1', 'vizsm')}`);
  const SVG_OD = sv(180, `${W('M20 20H280')}${tx(24, 16, '+5 V', 'vizsm')}<rect x="140" y="26" width="20" height="36" fill="var(--surface)"/>${RES(150, 44, 90, 0.6)}${tx(164, 48, 'pull-up', 'vizsm')}${W('M150 20V27M150 61V80M60 80H270')}${dot(150, 80)}${tx(274, 84, 'línea', 'vizsm')}${[70, 220].map((x, i) => `<g>${W(`M${x} 80V96`)}<circle cx="${x + 4}" cy="120" r="16" fill="none" stroke="currentColor" stroke-width="2"/>${W(`M${x - 22} 120H${x - 6}M${x - 6} 110V130M${x - 6} 114L${x + 4} 104V96M${x - 6} 126L${x + 4} 136V146`)}${GND(x + 4, 146)}${tx(x - 24, 116, 'salida ' + (i + 1), 'vizsm', 'end')}</g>`).join('')}${tx(150, 176, 'Basta una que conduzca para bajar la línea', 'vizsm', 'middle')}`);
  const SVG_555BLK = sv(200, `<rect x="40" y="10" width="220" height="150" rx="8" fill="none" stroke="currentColor" stroke-width="1.4"/>${[30, 60, 90].map(y => `<rect x="55" y="${y}" width="14" height="22" fill="var(--surface)" stroke="currentColor"/>`).join('')}${W('M62 18V30M62 52V60M62 82V90M62 112V150')}${tx(52, 46, 'R', 'vizsm', 'end')}${tx(52, 76, 'R', 'vizsm', 'end')}${tx(52, 106, 'R', 'vizsm', 'end')}${dot(62, 56)}${dot(62, 86)}${tx(74, 59, '6 V', 'vizsm')}${tx(74, 89, '3 V', 'vizsm')}
    <path d="M110 34v26l24 -13z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M110 84v26l24 -13z" fill="none" stroke="currentColor" stroke-width="1.6"/>${tx(122, 30, 'detector', 'vizsm', 'middle')}${tx(122, 80, 'detector', 'vizsm', 'middle')}<rect x="160" y="40" width="50" height="64" rx="4" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/>${tx(185, 76, 'memoria', 'vizsm', 'middle')}${W('M134 47H160M134 97H160M210 60H270')}${tx(272, 56, '3 salida', 'vizsm', 'end')}<circle cx="190" cy="134" r="12" fill="none" stroke="currentColor" stroke-width="1.6"/>${W('M185 104V122M202 134H270')}${tx(272, 130, '7 descarga', 'vizsm', 'end')}${tx(150, 180, '3 R iguales: umbrales a 1/3 y 2/3', 'vizsm', 'middle')}${tx(150, 194, 'Cada detector compara dos tensiones', 'vizsm', 'middle')}`);
  const SVG_555PINS = sv(180, dip(70, 56, 8, 0, null, 160) + tx(150, 22, 'El 555 (DIP-8), visto desde arriba', 'vizlab', 'middle') + tx(150, 148, '1 masa · 2 disparo · 3 salida · 4 reset', 'vizsm', 'middle') + tx(150, 162, '5 control · 6 umbral · 7 descarga · 8 VCC', 'vizsm', 'middle') + tx(150, 177, 'disparo < 1/3: salida alta · umbral > 2/3: baja', 'vizsm', 'middle'));
  const SVG_MONOT = sv(170, `${tx(14, 30, 'disparo', 'vizsm')}<path d="M70 26H110V44H120V26H290" stroke="var(--ice)" stroke-width="2.2" fill="none"/>${tx(14, 80, 'salida', 'vizsm')}<path d="M70 90H110V62H230V90H290" stroke="var(--led)" stroke-width="2.6" fill="none"/>${tx(14, 136, 'condensador', 'vizsm')}<path d="M70 150H110C150 112 190 112 230 108V150H290" stroke="var(--ok)" stroke-width="2.2" fill="none"/><path d="M110 108H290" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(290, 104, '2/3', 'vizsm', 'end', ' style="fill:var(--err)"')}<path d="M110 54H230" stroke="var(--muted)"/>${tx(170, 50, 't ≈ 1,1 · R · C', 'vizlab', 'middle')}`);
  const SVG_DUTY = sv(160, `<path d="M20 100V40H170V100H230V40H290" stroke="var(--led)" stroke-width="2.6" fill="none"/><path d="M20 30H170" stroke="var(--ok)" stroke-width="2"/><path d="M170 112H230" stroke="var(--ice)" stroke-width="2"/>${tx(95, 24, 'alto: 0,693 · (R1 + R2) · C', 'vizsm', 'middle')}${tx(200, 126, 'bajo: 0,693 · R2 · C', 'vizsm', 'middle')}${tx(150, 152, 'Ciclo = alto / (alto + bajo) > 50 %', 'vizlab', 'middle')}`);
  const SVG_DIODE555 = sv(170, `${W('M60 14V30M60 64V80M60 140V156')}${tx(66, 12, '+ VCC', 'vizsm')}<rect x="50" y="30" width="20" height="34" fill="var(--surface)"/>${RES(60, 47, 90, 0.6)}${tx(76, 50, 'R1', 'vizlab')}<rect x="50" y="94" width="20" height="34" fill="var(--surface)"/>${W('M60 80V94M60 128V140')}${RES(60, 111, 90, 0.6)}${tx(42, 114, 'R2', 'vizlab', 'end')}${W('M60 80H110V96M60 140H110V126')}${DIO(110, 111, 90, 0.6)}${dot(60, 80)}${dot(60, 140)}${W('M60 80H200M60 140H200')}${tx(204, 84, 'pata 7', 'vizsm')}${tx(204, 144, 'pata 6', 'vizsm')}${tx(124, 114, 'ánodo arriba', 'vizsm')}${tx(150, 166, 'Al cargar, la corriente salta R2 por el diodo', 'vizsm', 'middle')}`);
  const SVG_PWM555 = sv(160, `${W('M150 20V40')}${tx(156, 18, 'pata 7 (y R1 pequeña al +)', 'vizsm')}<rect x="80" y="70" width="140" height="22" rx="4" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>${tx(150, 85, 'potenciómetro', 'vizsm', 'middle')}${W('M150 40V58')}<path d="M144 58h12l-6 10z" fill="currentColor"/>${W('M80 81H50V110M220 81H250V110')}${DIO(50, 125, 90, 0.5)}${DIO(250, 125, -90, 0.5)}${W('M50 140V150H250V140')}${tx(150, 146, 'pata 6 y 2', 'vizsm', 'middle')}${tx(50, 64, 'carga', 'vizsm', 'middle')}${tx(250, 64, 'descarga', 'vizsm', 'middle')}`);
  const SVG_PIN5 = sv(140, `<path d="M20 110H290" stroke="var(--line)"/><path d="M20 50H290M20 80H290" stroke="var(--err)" stroke-dasharray="4 3"/><path d="M20 30H290M20 90H290" stroke="var(--ice)" stroke-dasharray="2 4"/>${tx(24, 46, '2/3 normal', 'vizsm')}${tx(24, 26, 'con más tensión en la pata 5', 'vizsm', 'start', ' style="fill:var(--ice)"')}<path d="M40 80L70 50L95 80L120 50L145 80L170 50L195 80" stroke="var(--led)" stroke-width="2.2" fill="none"/><path d="M200 90L240 30L270 90" stroke="var(--ice)" stroke-width="2.2" fill="none"/>${tx(150, 132, 'Umbrales más separados → frecuencia más baja', 'vizsm', 'middle')}`);

  /* ================= GENERADORES ================= */
  const { pick, fmt, fR: gR, MC, N } = Gen.helpers;
  Gen.add('f555b', () => {
    const R1 = pick([1000, 4700, 10000]), R2 = pick([10000, 47000, 68000, 100000]), C = pick([1, 10, 22, 47]), f = 1.44 / ((R1 + 2 * R2) * C * 1e-6);
    if (Math.random() < 0.6) return { ...N(`555 astable: R1 = ${gR(R1)}, R2 = ${gR(R2)}, C = ${C} µF. ¿Frecuencia en Hz?`, f, 'Hz', `f ≈ 1,44 / ((R1 + 2·R2)·C) = 1,44 / (${R1 + 2 * R2} × ${fmt(C * 1e-6, 6)}) ≈ ${fmt(f, 2)} Hz.`, f * 0.03), h: 'R2 cuenta dos veces; pasa C a faradios.' };
    const ft = pick([0.5, 1, 2, 5, 10]), Cd = pick([10, 22, 47]), S = 1.44 / (ft * Cd * 1e-6);
    return { ...N(`Quieres ${fmt(ft)} Hz con un 555 astable y C = ${Cd} µF. ¿Cuánto debe valer R1 + 2·R2, en kΩ?`, S / 1000, 'kΩ', `R1 + 2·R2 = 1,44 / (f · C) = 1,44 / (${fmt(ft)} × ${fmt(Cd * 1e-6, 6)}) ≈ ${fmt(S / 1000, 1)} kΩ.`, S / 1000 * 0.02), h: 'Despeja la suma de resistencias de la fórmula de la frecuencia.' };
  }, 'bb_555astable');
  Gen.add('mono555', () => {
    if (Math.random() < 0.5) { const R = pick([10000, 47000, 100000, 220000, 470000]), C = pick([10, 22, 47, 100]), t = 1.1 * R * C * 1e-6; return { ...N(`555 monoestable con R = ${gR(R)} y C = ${C} µF. ¿Duración del pulso, en s?`, t, 's', `t ≈ 1,1 · R · C = 1,1 × ${R} × ${fmt(C * 1e-6, 6)} ≈ ${fmt(t, 2)} s.`, Math.max(0.01, t * 0.02)), h: 'Multiplica 1,1 por R en ohmios y C en faradios.' }; }
    const t = pick([1, 2, 5, 10, 30]), C = pick([22, 47, 100]), R = t / (1.1 * C * 1e-6);
    return { ...N(`Quieres un pulso de ${t} s con C = ${C} µF. ¿R en kΩ?`, R / 1000, 'kΩ', `R = t / (1,1 · C) = ${t} / (1,1 × ${fmt(C * 1e-6, 6)}) ≈ ${fmt(R / 1000, 1)} kΩ.`, R / 1000 * 0.02), h: 'Despeja R: el tiempo entre 1,1 por C.' };
  }, 'bb_555mono');
  Gen.add('duty555', () => {
    const R1 = pick([1000, 4700, 10000, 22000]), R2 = pick([10000, 22000, 47000, 100000]), d = (R1 + R2) / (R1 + 2 * R2) * 100;
    return { ...MC(`555 astable clásico (sin diodo) con R1 = ${gR(R1)} y R2 = ${gR(R2)}. ¿Ciclo de trabajo?`, fmt(d, 1) + ' %', [fmt(100 - d, 1) + ' %', fmt(R1 / (R1 + R2) * 100, 1) + ' %', fmt(R2 / (R1 + R2) * 100, 1) + ' %'], `Ciclo = (R1 + R2) / (R1 + 2·R2) = ${R1 + R2} / ${R1 + 2 * R2} ≈ ${fmt(d, 1)} %.`), h: 'Alto con R1 + R2, bajo solo con R2: divide el alto entre el periodo.' };
  }, 'bb_555duty');
  Gen.add('pullupI', () => {
    const V = pick([5, 3.3]), R = pick([1000, 2200, 4700, 10000, 47000]), I = V / R;
    return { ...N(`Pull-up de ${gR(R)} a ${fmt(V)} V y pulsador a masa. Al pulsar, ¿cuánta corriente pasa, en mA?`, I * 1000, 'mA', `Al pulsar, toda la tensión cae en la resistencia: I = ${fmt(V)} / ${R} = ${fmt(I * 1000, 3)} mA. La entrada casi no consume.`, Math.max(0.002, I * 1000 * 0.02)), h: 'Al pulsar, la resistencia queda entre el + y masa: aplica Ohm.' };
  }, 'bb_pullup');

  /* ================= CONCEPTOS ================= */
  const pPU = (x = {}) => ({ mode: { label: 'Montaje (0 nada · 1 pull-up · 2 pull-down)', val: 1, list: [0, 1, 2] }, R: pR('Resistencia', 10000, 1000, 1000000), btn: { label: 'Pulsador (0 suelto · 1 pulsado)', val: 0, list: [0, 1] }, ...x });
  const p555 = (x = {}) => ({ R1: pR('R1', 10000, 1000, 100000), R2: pR('R2', 10000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47, 100], fmt: 'C' }, ...x });
  Object.assign(CONCEPTS, {
    bb_icpins: { name: 'Numerar las patas de un chip', alts: [
      { title: 'Desde la muesca, antihorario', text: 'Mira el chip desde arriba con la muesca (o el punto) a la izquierda. La pata 1 queda abajo a la izquierda; cuenta hacia la derecha por abajo, sube y vuelve por arriba de derecha a izquierda: sentido <b>antihorario</b>.', svg: SVG_DIP8, q: mcq('DIP-16 con la muesca a la izquierda. ¿Qué pata está arriba a la izquierda?', ['16', '9', '8', '1'], 'Abajo 1–8; arriba, de derecha a izquierda, 9–16.') },
      { title: 'El truco de la suma', text: 'En un DIP, la pata que está enfrente de la n es la <b>(total + 1 − n)</b>: en un DIP-14, encima de la 1 está la 14 y encima de la 7, la 8. Pruébalo:', tune: { viz: 'icPins', params: { n: { label: 'Patas', val: 14, list: [8, 14, 16], dec: 0 }, k: { label: 'Pata', val: 3, min: 1, max: 16, step: 1, dec: 0 } } }, q: mcq('DIP-8: ¿qué pata está justo enfrente de la 3?', ['6', '5', '4', '7'], '8 + 1 − 3 = 6.') }
    ] },
    bb_pkg: { name: 'Encapsulados', alts: [
      { title: 'Con o sin agujero', text: '<b>De inserción</b>: patas que atraviesan la placa; el DIP sirve en la protoboard. <b>De superficie</b>: se sueldan encima; SOIC (patas en ala), QFN (sin patas, pads debajo), BGA (bolitas debajo). Cuanto más pequeño, más difícil de soldar a mano.', svg: SVG_PKGS, q: mcq('¿Qué encapsulado pinchas directamente en una protoboard?', ['DIP', 'SOIC', 'QFN', 'BGA'], 'Sus patas, separadas 2,54 mm, encajan en los agujeros.') },
      { title: 'El mismo chip, varias cápsulas', text: 'Un mismo integrado suele venderse en varias cápsulas; la letra final de la referencia dice cuál (cambia según el fabricante). Para la protoboard busca la versión DIP; para una placa pequeña, SOIC o más pequeña.', q: mcq('Quieres montar un chip en la protoboard y solo lo encuentras en QFN. ¿Qué haces?', ['Buscar su versión DIP o una placa adaptadora', 'Pincharlo tal cual', 'Doblarle las patas', 'Soldarlo a los agujeros con cables muy finos sin más'], 'El QFN no tiene patas: necesita una placa.') }
    ] },
    bb_pwrpins: { name: 'Patas de alimentación', alts: [
      { title: 'Cada chip, su + y su masa', text: 'Todo integrado necesita alimentación: <b>VCC</b> o <b>VDD</b> (el +) y <b>GND</b> o <b>VSS</b> (la masa). La C viene de colector (chips bipolares) y la D de drenador (chips MOSFET). Están en la hoja de datos: no siempre son las esquinas.', svg: SVG_PWR, q: mcq('En un chip, ¿qué es VSS?', ['La masa', 'El +', 'La salida', 'Un reloj'], 'VDD es el + y VSS la masa en los chips CMOS.') },
      { title: 'Sin alimentación no hay nada', text: 'Error típico: montar un chip y olvidar sus patas de alimentación porque en el esquema no aparecen (a veces se dan por supuestas). Primero alimentación y masa; luego, todo lo demás.', q: mcq('Un chip no hace nada y en el esquema no ves sus patas de alimentación. ¿Qué compruebas?', ['Que VCC y GND estén conectados según su hoja', 'El color del chip', 'Que la muesca mire al norte', 'Nada: será defectuoso'], 'Muchos esquemas omiten las patas de alimentación.') }
    ] },
    bb_bypass: { name: 'Condensador de desacoplo', alts: [
      { title: 'Una reserva al lado', text: 'Un chip pide corriente a golpes. Los cables hasta la fuente tienen inductancia y no dan esos picos al instante: la tensión cae un momento y el chip puede fallar. Un <b>condensador de 100 nF pegado a sus patas</b> da esos picos. Mueve la distancia y el valor:', tune: { viz: 'decoupling', params: { d: { label: 'Distancia al chip', val: 50, list: [2, 10, 50, 200], unit: 'mm', dec: 0 }, C: { label: 'Condensador (0 = ninguno)', val: 100, list: [0, 10, 100, 1000], unit: 'nF', dec: 0 } } }, q: mcq('¿Dónde va el condensador de desacoplo de un chip?', ['Lo más cerca posible de sus patas de alimentación', 'Junto a la pila', 'En cualquier sitio de la placa', 'En la salida del chip'], 'Cerca vale más que grande.') },
      { title: 'Cada milímetro cuenta', text: 'El desacoplo solo sirve si el bucle condensador–chip es pequeño: unos 1 nH por milímetro de cable. A 5 cm hay 50 nH: un pico de 100 mA en 10 ns hace caer 0,5 V. Pegado, menos de 50 mV.', svg: SVG_BYP, q: mcq('Un circuito digital se reinicia «a veces», sobre todo al encender otra cosa. ¿Qué revisas primero?', ['La alimentación y el desacoplo de cada chip', 'El color de los cables', 'La serigrafía', 'Nada: es mala suerte'], 'Las caídas de alimentación son la causa número uno.') }
    ] },
    bb_pullup: { name: 'Resistencias pull-up y pull-down', alts: [
      { title: 'Ponle un valor por defecto', text: 'Una entrada que no está conectada a nada <b>flota</b> y lee cualquier cosa. Una <b>pull-up</b> (resistencia al +) la deja en 1 mientras nadie la toque; el pulsador a masa la baja a 0. Una <b>pull-down</b> (a masa) hace lo contrario. Pruébalo:', tune: { viz: 'pullup', params: pPU() }, q: mcq('Pull-up de 10 kΩ a 5 V y pulsador a masa. ¿Qué lee la entrada al pulsar?', ['0', '1', 'Cualquier cosa', '5'], 'El pulsador la une a masa.') },
      { title: 'Por qué una resistencia y no un cable', text: 'Si unieras la entrada al + con un cable, al pulsar harías un cortocircuito del + a masa. La resistencia deja pasar poca corriente al pulsar (5 V / 10 kΩ = 0,5 mA) y, sin pulsar, apenas nada: la entrada casi no consume. Entre 4,7 y 47 kΩ es lo habitual.', svg: SVG_PU, q: mcq('Pull-up de 4,7 kΩ a 3,3 V. ¿Corriente al pulsar?', ['Unos 0,7 mA', 'Unos 7 mA', 'Unos 0,07 mA', 'Nada'], '3,3 / 4700 ≈ 0,7 mA.') }
    ] },
    bb_opendrain: { name: 'Salidas de colector o drenador abierto', alts: [
      { title: 'Solo saben tirar hacia abajo', text: 'Una salida de <b>colector abierto</b> (o drenador abierto) es un transistor a masa: puede bajar la línea a 0, pero no subirla. Para tener un 1 hace falta una <b>pull-up</b>. Ventaja: varias salidas pueden compartir línea.', svg: SVG_OD, q: mcq('Una salida de drenador abierto sin resistencia de pull-up, cuando «suelta», da…', ['Una línea flotante: ningún 1 claro', 'Un 1 perfecto', 'Un 0', 'Un cortocircuito'], 'Nadie sube la línea.') },
      { title: 'El «o» de los ceros', text: 'Con varias salidas de colector abierto en la misma línea y una pull-up: si <b>cualquiera</b> conduce, la línea baja a 0; solo está a 1 si ninguna conduce. Así se hacen líneas de alarma compartidas, y así funcionan algunos buses que verás con los microcontroladores.', q: mcq('Tres salidas de colector abierto comparten línea con una pull-up. Una conduce y dos no. ¿La línea?', ['0', '1', 'Cortocircuito', 'Flota'], 'Basta una que conduzca para bajarla.') }
    ] },
    bb_555inside: { name: 'Cómo funciona el 555 por dentro', alts: [
      { title: 'Vigila un condensador', text: 'Dentro hay tres resistencias iguales que fijan <b>1/3 y 2/3</b> de la alimentación, dos detectores de umbral (cada uno compara dos tensiones y dice cuál es mayor), una <b>memoria</b> que recuerda la última orden y un transistor de descarga. Míralo funcionar:', tune: { viz: 'ic555', params: p555({ C: { label: 'C', val: 47, list: [1, 10, 22, 47, 100], fmt: 'C' } }) }, q: mcq('¿Entre qué tensiones oscila el condensador de un 555 alimentado a 9 V?', ['Entre 3 y 6 V', 'Entre 0 y 9 V', 'Entre 4,5 y 9 V', 'Entre 0 y 3 V'], '1/3 y 2/3 de 9 V.') },
      { title: 'Dos órdenes', text: 'Si el condensador baja de 1/3, el detector de abajo da la orden «salida alta» (y se cierra la descarga): el condensador se carga. Si sube de 2/3, el de arriba da «salida baja» (y abre la descarga a masa): se descarga. La memoria mantiene la última orden entre medias.', svg: SVG_555BLK, q: mcq('¿Qué hace un detector de umbral (comparador)?', ['Compara dos tensiones y pone su salida alta o baja según cuál es mayor', 'Amplifica una señal', 'Guarda energía', 'Genera una senoide'], 'No amplifica: solo dice «mayor» o «menor».') }
    ] },
    bb_555astable: { name: 'Frecuencia del 555 astable', alts: [
      { title: 'La fórmula', text: 'En astable, el condensador se carga por R1 + R2 y se descarga por R2. Frecuencia: <b>f ≈ 1,44 / ((R1 + 2·R2) · C)</b>, con ohmios y faradios. Más resistencia o más capacidad, más lento.', tune: { viz: 'astable', params: { R1: pR('R1', 10000, 1000, 100000), R2: pR('R2', 47000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47, 100], fmt: 'C' } } }, q: mcq('R1 = 1 kΩ, R2 = 10 kΩ y C = 10 µF. ¿Frecuencia?', ['Unos 6,9 Hz', 'Unos 13 Hz', 'Unos 0,69 Hz', 'Unos 69 Hz'], '1,44 / (21 000 × 0,00001) ≈ 6,9 Hz.') },
      { title: 'Al revés: diseñar', text: 'Para una frecuencia dada, despeja: <b>R1 + 2·R2 = 1,44 / (f · C)</b>. Para 1 Hz con 10 µF: 144 kΩ, por ejemplo R1 = 10 kΩ y R2 = 68 kΩ. Elige primero C y luego las resistencias. Error típico: contar R2 una sola vez.', svg: SVG_DUTY, q: mcq('Quieres unos 2 Hz con C = 10 µF. ¿Cuánto debe valer R1 + 2·R2?', ['72 kΩ', '144 kΩ', '288 kΩ', '7,2 kΩ'], '1,44 / (2 × 0,00001) = 72 000 Ω.') }
    ] },
    bb_555chip: { name: 'Patas y versiones del 555', alts: [
      { title: 'Para qué sirve cada pata', text: '1 masa · 2 disparo · 3 salida · 4 reset · 5 control · 6 umbral · 7 descarga · 8 VCC. El <b>disparo</b> actúa por debajo de 1/3 de VCC; el <b>reset</b> a masa para el chip, así que normalmente va a VCC; el <b>control</b>, si no se usa, lleva 10 nF a masa.', svg: SVG_555PINS, q: mcq('¿Qué pata del 555 debes unir a VCC para que funcione normalmente?', ['La 4 (reset)', 'La 2 (disparo)', 'La 3 (salida)', 'La 5 (control)'], 'Reset a masa lo para todo.') },
      { title: 'Bipolar o CMOS', text: 'El NE555 clásico (bipolar) consume unos mA y mete picos en la alimentación al conmutar: pide un buen desacoplo. Las versiones <b>CMOS</b> (TLC555, ICM7555) gastan de decenas a cientos de µA y funcionan desde unos 2 V: mejores con pilas.', q: mcq('Un 555 debe funcionar meses con pilas. ¿Qué versión eliges?', ['Una CMOS (TLC555 o ICM7555)', 'El NE555 bipolar', 'Da igual', 'Dos NE555 en paralelo'], 'La CMOS consume decenas de veces menos.') }
    ] },
    bb_555mono: { name: 'Tiempo del 555 monoestable', alts: [
      { title: 'La fórmula', text: 'En monoestable, cada disparo pone la salida alta durante <b>t ≈ 1,1 · R · C</b> (ohmios por faradios dan segundos): el tiempo que tarda el condensador en llegar a 2/3. Prueba a dispararlo:', tune: { viz: 'mono', params: { R: pR('R', 100000, 10000, 1000000), C: { label: 'C', val: 22, list: [10, 22, 47, 100], fmt: 'C' }, trig: { label: 'Disparo (0 suelto · 1 pulsado)', val: 0, list: [0, 1] } } }, q: mcq('R = 47 kΩ y C = 100 µF. ¿Duración?', ['Unos 5,2 s', 'Unos 4,7 s', 'Unos 0,52 s', 'Unos 52 s'], '1,1 × 47 000 × 0,0001 ≈ 5,2 s.') },
      { title: 'Despejar R', text: 'Para un tiempo dado: <b>R = t / (1,1 · C)</b>. 10 s con 100 µF: ≈ 91 kΩ. Los electrolíticos tienen tolerancias de ±20 %: si el tiempo importa, añade un potenciómetro para ajustarlo.', svg: SVG_MONOT, q: mcq('Quieres 2 s con 22 µF. ¿R aproximada?', ['Unos 83 kΩ', 'Unos 91 kΩ', 'Unos 8,3 kΩ', 'Unos 44 kΩ'], '2 / (1,1 × 0,000022) ≈ 82 600 Ω.') }
    ] },
    bb_555duty: { name: 'Ciclo de trabajo del 555', alts: [
      { title: 'Alto y bajo', text: 'En el astable clásico, el alto dura 0,693 · (R1 + R2) · C y el bajo 0,693 · R2 · C. Ciclo = <b>(R1 + R2) / (R1 + 2·R2)</b>: siempre por encima del 50 %. Con un diodo en paralelo con R2, el alto pasa a depender solo de R1. Pruébalo:', tune: { viz: 'astable2', params: { R1: pR('R1', 10000, 1000, 100000), R2: pR('R2', 47000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47], fmt: 'C' }, D: { label: 'Diodo (0 no · 1 sí)', val: 0, list: [0, 1] } } }, q: mcq('R1 = 1 kΩ y R2 = 10 kΩ, sin diodo. ¿Ciclo de trabajo?', ['Unos 52 %', 'Unos 48 %', 'Unos 91 %', '50 % exacto'], '11 / 21 ≈ 52 %.') },
      { title: 'El truco del diodo', text: 'Con un diodo en paralelo con R2 (ánodo en la 7, cátodo en la 6), la carga pasa por R1 y el diodo, y la descarga solo por R2: <b>alto ≈ 0,693 · R1 · C</b>, <b>bajo ≈ 0,693 · R2 · C</b>. Con R1 < R2, el ciclo baja del 50 %.', svg: SVG_DIODE555, q: mcq('Con el diodo, R1 = 4,7 kΩ, R2 = 47 kΩ y C = 10 µF. ¿Tiempo en alto?', ['Unos 33 ms', 'Unos 326 ms', 'Unos 358 ms', 'Unos 3,3 ms'], '0,693 × 4700 × 0,00001 ≈ 33 ms.') }
    ] }
  });

  /* ================= LECCIONES ================= */
  UNITS.push({ id: 'm10', title: 'Circuitos integrados y el 555', desc: 'Chips por dentro y por fuera, desacoplo, entradas que flotan y el temporizador 555 en todas sus formas.', nodes: [
    L('k1', 'Qué es un circuito integrado', 'ic', ['bb_icpins', 'bb_pkg'], [
      Q('El procesador de un móvil tiene unos 10 000 millones de transistores. Si fueran como un 2N3904 (unos 5 mm) puestos en fila, ¿cuánto medirían?', ['Más que una vuelta a la Tierra', 'Lo que una habitación', 'Lo que un campo de fútbol', 'Un metro'], '10¹⁰ × 5 mm = 50 000 km. En un chip caben en unos milímetros porque se fabrican todos a la vez sobre el silicio.', { predict: true, c: 'bb_pkg', h: 'Multiplica 10¹⁰ por 5 mm y pásalo a km.' }),
      I('Un <b>circuito integrado</b> (CI, chip) mete transistores, resistencias y condensadores fabricados juntos sobre una pastilla de silicio, dentro de una cápsula con patas. Desde unos pocos transistores (un optoacoplador doble, un ULN2003) hasta miles de millones (un procesador).', { svg: SVG_DIE, more: 'Se fabrican muchos a la vez sobre una oblea de silicio, con capas que se dibujan con luz (fotolitografía). Por eso un chip con millones de transistores puede costar unos céntimos.\nLa ventaja no es solo el tamaño: dentro de un chip los transistores son casi idénticos y están a la misma temperatura. Por eso funcionan tan bien trucos como el espejo de corriente.' }),
      I('El mismo chip se vende en varias <b>cápsulas</b> (encapsulados): <b>DIP</b> (patas que atraviesan la placa, separadas 2,54 mm: para la protoboard), <b>SOIC</b> (patas en ala, para soldar encima), <b>QFN</b> (sin patas, pads debajo) y <b>BGA</b> (bolitas debajo).', { svg: SVG_PKGS }),
      { t: 'match', q: 'Une cada encapsulado con su forma.', pairs: [['DIP', 'Patas para protoboard'], ['SOIC', 'Superficie, patas en ala'], ['QFN', 'Superficie, sin patas'], ['BGA', 'Bolitas debajo']], c: 'bb_pkg', h: 'Empieza por el que conoces de la protoboard.' },
      I('<b>Numeración</b>: mira el chip desde arriba con la <b>muesca</b> (o el punto) a la izquierda. La pata 1 está abajo a la izquierda; se cuenta hacia la derecha por abajo, se sube y se vuelve por arriba: sentido <b>antihorario</b>.', { svg: SVG_DIP8 }),
      { t: 'explore', text: 'Un chip DIP visto desde arriba. Elige el número de patas y la pata que quieres señalar.', viz: 'icPins', params: { n: { label: 'Patas', val: 8, list: [8, 14, 16], dec: 0 }, k: { label: 'Pata', val: 1, min: 1, max: 16, step: 1, dec: 0 } },
        tasks: [
          { q: 'sel85', min: 1, max: 1, text: 'En un DIP-8, señala la pata 5', done: 'Arriba a la derecha: tras la 4, se sube y se vuelve hacia la izquierda.', hint: '8 patas y pata 5.' },
          { q: 'sel1414', min: 1, max: 1, text: 'En un DIP-14, busca la pata que está justo encima de la 1', done: 'La 14. Truco: la de enfrente de la n es (total + 1 − n).', hint: 'Cambia a 14 patas y prueba las más altas.' },
          { q: 'sel1614', min: 1, max: 1, text: 'En un DIP-16, señala la que está enfrente de la 3', done: '16 + 1 − 3 = 14.', hint: 'Aplica el truco de la suma.' }
        ] },
      Q('DIP-8 con la muesca a la izquierda. ¿Dónde está la pata 1?', ['Abajo a la izquierda', 'Arriba a la izquierda', 'Abajo a la derecha', 'En el centro'], '1–4 abajo; 5–8 arriba, de derecha a izquierda.', { c: 'bb_icpins', h: 'Mira desde arriba, con la muesca a tu izquierda.' }),
      Nm('En un DIP-14, ¿qué número tiene la pata justo encima de la 1?', 14, '', 'Antihorario: sube por la 8 y vuelve hasta la 14.', { tol: 0, c: 'bb_icpins', h: 'La de enfrente de la n es total + 1 − n.' }),
      Nm('En un DIP-16, ¿qué pata está enfrente de la 5?', 12, '', '16 + 1 − 5 = 12.', { tol: 0, c: 'bb_icpins', h: 'Usa el truco de la suma.' }),
      Q('Das la vuelta a la placa y miras el chip desde abajo (la cara de las soldaduras). ¿Cómo cuentas ahora?', ['Al revés: en sentido horario', 'Igual que desde arriba', 'Empezando por la 8', 'No se puede saber'], 'Desde abajo todo está como en un espejo. Error típico al soldar.', { c: 'bb_icpins', h: 'Imagina el chip en un espejo.' }),
      Q('¿Qué encapsulado pinchas directamente en una protoboard?', ['DIP', 'SOIC', 'QFN', 'BGA'], 'Sus patas, a 2,54 mm, encajan en los agujeros.', { c: 'bb_pkg', h: 'Busca el que tiene patas largas que atraviesan.' }),
      I('<b>Resumen</b>\n· Un <b>integrado</b> mete muchos componentes en una pastilla de silicio.\n· Cápsulas: <b>DIP</b> (protoboard), SOIC, QFN, BGA.\n· Pata 1 abajo a la izquierda con la muesca a la izquierda; antihorario visto desde arriba.\n· Enfrente de la n: total + 1 − n.')
    ]),
    L('k3', 'Alimentación y desacoplo', 'ic', ['bb_pwrpins', 'bb_bypass'], [
      Q('Un chip digital cambia de estado y, durante unos nanosegundos, pide un pico de corriente. Los cables hasta la pila miden 20 cm. ¿Qué crees que le pasa a su tensión de alimentación en ese instante?', ['Cae un momento: los cables no dan el pico tan rápido', 'Sube', 'No cambia nada', 'Se invierte'], 'Los cables tienen inductancia: V = L · ΔI / Δt. Un pico muy rápido hace caer la tensión.', { predict: true, c: 'bb_bypass', h: 'Recuerda que un cable largo se comporta como una bobina pequeña (g9).' }),
      I('Todo chip tiene patas de alimentación: <b>VCC</b> o <b>VDD</b> (el +) y <b>GND</b> o <b>VSS</b> (la masa). La C viene de colector (chips bipolares) y la D de drenador (chips MOSFET). Míralas siempre en la hoja: no siempre están en las esquinas.', { svg: SVG_PWR }),
      { t: 'match', q: 'Une cada nombre con lo que es.', pairs: [['VCC', 'El + (chips bipolares)'], ['VDD', 'El + (chips MOSFET)'], ['GND', 'Masa'], ['VSS', 'Masa (chips MOSFET)']], c: 'bb_pwrpins', h: 'C de colector, D de drenador; S de fuente (source), que va a masa.' },
      I('El problema: un chip pide corriente <b>a golpes</b>, en cada cambio. Un cable de 20 cm tiene unos 200 nH: un pico de 100 mA en 10 ns hace caer <b>V = L · ΔI / Δt</b> = 2 V. El chip puede fallar o reiniciarse.', { svg: SVG_LDROP }),
      { t: 'steps', text: 'Un chip pide 100 mA durante 10 ns. Compara 100 nH de cable con un condensador de 100 nF pegado a sus patas.', steps: ['Por el cable: V = L · ΔI / Δt = 100 nH × 0,1 A / 10 ns = <b>1 V</b> de caída.', 'Carga que pide el pico: Q = I · t = 0,1 A × 10 ns = <b>1 nC</b>.', 'Si la da el condensador: ΔV = Q / C = 1 nC / 100 nF = <b>0,01 V</b>.', 'El condensador, pegado, entrega el pico; el cable lo repone después, despacio.'], result: 'Con el condensador al lado: <b>10 mV</b> en lugar de 1 V.' },
      { t: 'explore', text: 'Un chip que pide 100 mA durante 10 ns. Elige un condensador de desacoplo y a qué distancia lo pones (cuenta 1 nH por milímetro de cable).', viz: 'decoupling', params: { d: { label: 'Distancia al chip', val: 200, list: [2, 10, 50, 200], unit: 'mm', dec: 0 }, C: { label: 'Condensador (0 = ninguno)', val: 0, list: [0, 10, 100, 1000], unit: 'nF', dec: 0 } },
        tasks: [
          { q: 'dip', min: 0, max: 0.5, text: 'Consigue que la tensión caiga menos de 0,5 V', done: 'Un condensador cerca del chip da el pico sin pasar por el cable largo.', hint: 'Pon un condensador y acércalo.' },
          { q: 'dip', min: 0, max: 0.05, text: 'Ahora menos de 50 mV', done: 'Pegado (2 mm) y de 100 nF o más: así se hace en todas las placas.', hint: 'Lo más cerca posible.' },
          { q: 'bigfar', min: 1, max: 1, text: 'Prueba un condensador enorme (1 µF) lejos (200 mm)', done: 'No sirve: con 200 mm de cable, la inductancia manda. Cerca vale más que grande.', hint: '1000 nF a 200 mm.' }
        ] },
      Q('¿Dónde va el condensador de desacoplo?', ['Lo más cerca posible de las patas de alimentación del chip', 'En cualquier parte de la placa', 'Junto a la pila', 'En la salida del chip'], 'Cuanto más cerca, menos inductancia en el camino.', { c: 'bb_bypass', h: 'Recuerda lo que pasaba al alejarlo en el explorador.' }),
      Q('¿Qué valor es el típico para desacoplar cada chip?', ['100 nF cerámico (código 104)', '100 µF electrolítico', '1 pF', '10 F'], '100 nF cerámico, uno por chip, pegado a sus patas.', { c: 'bb_bypass', h: 'Es el condensador más vendido del mundo.' }),
      Q('Un circuito digital se reinicia solo «a veces». ¿Qué revisas primero?', ['La alimentación y el desacoplo', 'El color de los cables', 'La forma de la placa', 'Nada'], 'Causa número uno.', { c: 'bb_bypass', h: '¿Qué pasa si la tensión del chip cae un instante?' }),
      Q('Además de un 100 nF junto a cada chip, ¿qué se suele poner donde entra la alimentación a la placa?', ['Un condensador más grande (10–100 µF) como reserva general', 'Nada más', 'Una resistencia de 1 MΩ', 'Un LED'], 'Los pequeños dan los picos rápidos; el grande, las demandas más lentas.', { c: 'bb_bypass', h: 'Piensa en una reserva grande y varias pequeñas cerca de cada consumo.' }),
      Nm('50 nH de pista hasta el condensador y un pico de 200 mA en 20 ns. ¿Cuánto cae la tensión, en V?', 0.5, 'V', 'V = L · ΔI / Δt = 50 nH × 0,2 A / 20 ns = 0,5 V.', { tol: 0.01, c: 'bb_bypass', h: 'V = L · ΔI / Δt, con nH y ns: se cancelan los nanos.' }),
      I('<b>Resumen</b>\n· Cada chip: <b>VCC/VDD</b> (+) y <b>GND/VSS</b> (masa).\n· Los cables tienen inductancia: los picos rápidos hacen caer la tensión.\n· Un <b>100 nF</b> pegado a las patas de alimentación de cada chip, más uno grande en la entrada.')
    ]),
    L('k20', 'Entradas que flotan: pull-up y pull-down', 'res', ['bb_pullup', 'bb_opendrain'], [
      Q('Conectas la entrada de un chip a un pulsador que, al pulsar, la une a masa. Sin pulsar, la entrada no está conectada a nada. ¿Qué lee sin pulsar?', ['Cualquier cosa: cambia sola con el ruido y hasta al acercar la mano', 'Siempre «alto»', 'Siempre «bajo»', 'Da error y se apaga'], 'Una entrada sin nada conectado «flota». Hace falta darle un valor por defecto.', { predict: true, c: 'bb_pullup', h: 'Recuerda la puerta de un MOSFET al aire.' }),
      I('Muchas entradas (la de un chip digital, la puerta de un MOSFET o el disparo del 555, que verás enseguida) son de <b>alta impedancia</b>: casi no consumen corriente. Distinguen dos niveles: tensión cerca del + (<b>alto</b>, «1») o cerca de masa (<b>bajo</b>, «0»). Si no están conectadas a nada, <b>flotan</b>: hacen de antena y leen lo que les dé el ruido.', { svg: SVG_FLOAT }),
      { t: 'explore', text: 'Una entrada con un pulsador. Elige el montaje: sin resistencia, con pull-up (resistencia al +) o con pull-down (resistencia a masa; el pulsador pasa al +).', viz: 'pullup', params: { mode: { label: 'Montaje (0 nada · 1 pull-up · 2 pull-down)', val: 0, list: [0, 1, 2] }, R: pR('Resistencia', 10000, 1000, 1000000), btn: { label: 'Pulsador (0 suelto · 1 pulsado)', val: 0, list: [0, 1] } },
        tasks: [
          { q: 'stable1', min: 1, max: 1, text: 'Haz que, sin pulsar, la entrada lea 1 de forma estable', done: 'La pull-up lleva la entrada al + mientras nadie la toque.', hint: 'Montaje 1.' },
          { q: 'pressed0', min: 1, max: 1, text: 'Ahora púlsalo: que lea 0', done: 'El pulsador une la entrada a masa: pulsado = 0 (lógica «al revés»).', hint: 'Pulsador a 1.' },
          { q: 'lowI', min: 1, max: 1, text: 'Que al pulsar no pase más de 0,5 mA', done: 'Con 10 kΩ a 5 V: 0,5 mA. Más resistencia, menos consumo.', hint: 'Sube la resistencia.' },
          { q: 'weak', min: 1, max: 1, text: 'Pon una resistencia de 1 MΩ', done: 'Demasiado grande: la entrada queda «débil» y el ruido o las fugas la pueden mover. Lo habitual: 4,7–47 kΩ.', hint: 'Resistencia al máximo.' }
        ] },
      I('<b>Pull-up</b>: una resistencia de la entrada al <b>+</b> y el pulsador a <b>masa</b>. Suelto, la resistencia sube la entrada: lee 1. Pulsado, el pulsador la une a masa: lee 0, y por la resistencia pasa una corriente pequeña.', { svg: SVG_PU, more: 'Fíjate en que la lógica queda «al revés»: pulsado = 0. Es lo más habitual, porque el pulsador va a masa y los cables de masa están por todas partes.' }),
      I('<b>Pull-down</b>: al revés. La resistencia va a <b>masa</b> y el pulsador al <b>+</b>. Suelto, lee 0; pulsado, lee 1. Lógica directa.', { svg: SVG_PD }),
      { t: 'steps', text: 'Pull-up de 10 kΩ a 5 V y pulsador a masa. ¿Qué tensión tiene la entrada y cuánta corriente pasa?', steps: ['<b>Suelto</b>: la entrada casi no consume; por la resistencia no pasa corriente, así que no cae tensión en ella.', 'La entrada queda a <b>5 V</b>: lee 1.', '<b>Pulsado</b>: la entrada queda unida a masa: <b>0 V</b>, lee 0.', 'Toda la tensión cae en la resistencia: I = 5 V / 10 kΩ = <b>0,5 mA</b>.'], result: 'Suelto: 5 V, sin consumo. Pulsado: 0 V y 0,5 mA.' },
      Nm('Pull-up de 4,7 kΩ a 3,3 V. ¿Cuántos mA pasan al pulsar?', 0.70, 'mA', '3,3 / 4700 ≈ 0,70 mA.', { tol: 0.02, c: 'bb_pullup', h: 'Al pulsar, la resistencia queda entre el + y masa.' }),
      G('pullupI'),
      Q('Pull-up y pulsador a masa. ¿Qué lee la entrada con el pulsador apretado?', ['0', '1', 'Cualquier cosa', 'Depende del valor de la resistencia'], 'El pulsador la une a masa.', { c: 'bb_pullup', h: '¿A qué está unida la entrada al pulsar?' }),
      Q('¿Por qué una resistencia al + y no un cable directo?', ['Al pulsar harías un cortocircuito del + a masa', 'Porque el cable no conduce', 'Porque el cable es más caro', 'Da igual'], 'La resistencia limita la corriente al pulsar.', { c: 'bb_pullup', h: 'Piensa qué une el pulsador cuando lo aprietas.' }),
      Q('¿Qué valor eliges para una pull-up típica?', ['Unos 10 kΩ', '100 Ω', '10 MΩ', '1 Ω'], 'Con 100 Ω gastarías 50 mA al pulsar; con 10 MΩ, la entrada sería débil frente al ruido.', { c: 'bb_pullup', h: 'Ni tan pequeña que gaste mucho, ni tan grande que el ruido la mueva.' }),
      I('Algunas salidas solo saben tirar hacia abajo: un transistor a masa y nada más. Son las de <b>colector abierto</b> (o drenador abierto). Para dar un 1 necesitan una <b>pull-up</b>. A cambio, varias pueden compartir la misma línea: cualquiera puede bajarla.', { svg: SVG_OD, more: 'Lo verás en comparadores como el LM339 y, con los microcontroladores, en buses como el I²C, donde varios chips comparten dos líneas con pull-ups.' }),
      Q('Una salida de drenador abierto sin pull-up, cuando «suelta» (no conduce), da…', ['Una línea flotante: ningún 1 claro', 'Un 1 perfecto', 'Un 0', 'Un cortocircuito'], 'Nadie sube la línea.', { c: 'bb_opendrain', h: '¿Quién subiría la tensión si el transistor no conduce?' }),
      Q('Dos salidas de colector abierto comparten una línea con una pull-up. Si cualquiera conduce, la línea…', ['Baja a 0', 'Sube a 1', 'Hace cortocircuito', 'Flota'], 'Basta una que conduzca para bajarla.', { c: 'bb_opendrain', h: 'Cada salida solo puede tirar hacia masa.' }),
      Q('Ya conoces la resistencia de 10–100 kΩ entre la puerta y la fuente de un MOSFET de lado bajo. ¿Cómo se llama, ahora que sabes el término?', ['Una resistencia de pull-down', 'Una pull-up', 'Un desacoplo', 'Una resistencia de base'], 'Lleva la puerta a masa (la fuente) mientras nadie la mueve: es una pull-down.', { c: 'bb_pullup', h: '¿Hacia dónde lleva la puerta: al + o a masa?' }),
      I('<b>Resumen</b>\n· Una entrada al aire <b>flota</b>: dale un valor por defecto.\n· <b>Pull-up</b> (al +): suelto 1, pulsado 0. <b>Pull-down</b> (a masa): suelto 0, pulsado 1.\n· Unos <b>10 kΩ</b>; al pulsar pasa V / R.\n· <b>Colector/drenador abierto</b>: solo baja la línea; necesita pull-up.')
    ]),
    L('k4', 'El 555 astable', 'ic', ['bb_555inside', 'bb_555astable', 'bb_555chip'], [
      Q('Un condensador se carga a través de una resistencia. Imagina un circuito que, cuando llega a 2/3 de la pila, lo empieza a descargar, y cuando baja a 1/3, lo deja cargar otra vez. ¿Cómo será su tensión?', ['Una subida y bajada suaves, sin parar, entre 1/3 y 2/3', 'Una recta que sube siempre', 'Siempre 2/3', 'Cero'], 'Eso es el 555: vigila un condensador y lo hace oscilar entre dos umbrales.', { predict: true, c: 'bb_555inside', h: 'Recuerda la carga y descarga RC (g4).' }),
      I('El <b>555</b> (1972) es un integrado de 8 patas que vigila un condensador. Dentro: tres resistencias iguales que fijan <b>1/3 y 2/3</b> de la alimentación; dos <b>detectores de umbral</b> (comparadores: cada uno compara dos tensiones y dice cuál es mayor); una <b>memoria</b> que recuerda la última orden; y un transistor de <b>descarga</b>.', { svg: SVG_555BLK, more: 'A los detectores de umbral se les llama comparadores. Los verás a fondo, con números, tras los amplificadores operacionales. Aquí basta con saber que dicen «mayor» o «menor».' }),
      { t: 'explore', text: 'El 555 por dentro en modo astable. El punto azul recorre la tensión del condensador; se encienden los detectores cuando actúan.', viz: 'ic555', params: p555(),
        tasks: [
          { q: 'T', min: 2, max: 999, text: 'Ralentízalo: periodo de más de 2 s, para verlo bien', done: 'Al llegar a 2/3 la salida baja y empieza la descarga; al bajar a 1/3, vuelve a subir.', hint: 'Sube C o las resistencias.' },
          { q: 'ratio', min: 0, max: 0.25, text: 'Haz que el tiempo en bajo sea menos de la cuarta parte del alto', done: 'El bajo depende solo de R2; el alto, de R1 + R2. Con R1 grande frente a R2, alto mucho más largo.', hint: 'R1 grande y R2 pequeña.' }
        ] },
      I('Las patas del 555: <b>1</b> masa · <b>2</b> disparo · <b>3</b> salida · <b>4</b> reset · <b>5</b> control · <b>6</b> umbral · <b>7</b> descarga · <b>8</b> VCC. Funciona de unos 4,5 a 16 V (el NE555 clásico).', { svg: SVG_555PINS }),
      { t: 'match', q: 'Une cada pata del 555 con su función.', pairs: [['Pata 1', 'Masa'], ['Pata 8', 'Alimentación'], ['Pata 3', 'Salida'], ['Pata 4', 'Reset']], c: 'bb_555chip', h: 'Las de alimentación están en las esquinas opuestas.' },
      I('<b>Astable</b>: R1 del + a la pata 7, R2 de la 7 a la 6, la 6 unida a la 2 y C de ahí a masa. El condensador se carga por R1 + R2 hasta 2/3 y se descarga por R2 (pata 7 a masa) hasta 1/3. Sin parar:\n<b>f ≈ 1,44 / ((R1 + 2·R2) · C)</b>', { sch: 'ne555', more: 'De dónde sale: cargar de 1/3 a 2/3 tarda ln 2 · τ ≈ 0,693 · (R1 + R2) · C; descargar de 2/3 a 1/3, 0,693 · R2 · C. Periodo: 0,693 · (R1 + 2·R2) · C, y f = 1 / periodo ≈ 1,44 / ((R1 + 2·R2) · C).\nLa pata 4 va al + y la 5, con 10 nF a masa (en el reto la verás sin él: funciona, pero es menos estable).' }),
      { t: 'explore', text: 'Un 555 astable con un LED en la salida.', viz: 'astable', params: { R1: pR('R1', 1000, 1000, 100000), R2: pR('R2', 1000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47, 100], fmt: 'C' } },
        tasks: [
          { q: 'f', min: 0.85, max: 1.15, text: 'Haz que el LED parpadee una vez por segundo (1 Hz)', done: 'Con 10 µF, R1 + 2·R2 ≈ 144 kΩ: por ejemplo 10 kΩ y 68 kΩ.', hint: 'Sube R2 bastante.' },
          { q: 'f', min: 9, max: 11, text: 'Ahora unas 10 veces por segundo', done: 'Diez veces más rápido: divide C entre 10 (1 µF) y deja las resistencias.', hint: 'Prueba a cambiar C.' }
        ] },
      { t: 'steps', text: '555 astable con R1 = 1 kΩ, R2 = 68 kΩ y C = 22 µF. ¿Frecuencia?', steps: ['Fórmula: <b>f ≈ 1,44 / ((R1 + 2·R2) · C)</b>.', 'R1 + 2·R2 = 1000 + 136 000 = <b>137 000 Ω</b>.', 'Por C en faradios: 137 000 × 0,000022 = <b>3,01</b>.', 'f ≈ 1,44 / 3,01 ≈ <b>0,48 Hz</b>: un destello cada 2 s.'], result: '<b>0,48 Hz</b>.' },
      G('f555b'), G('f555b'),
      Nm('Quieres 1 Hz con C = 10 µF. ¿Cuánto debe valer R1 + 2·R2, en kΩ?', 144, 'kΩ', '1,44 / (1 × 0,00001) = 144 000 Ω = 144 kΩ.', { tol: 2, c: 'bb_555astable', h: 'Despeja la suma de resistencias de la fórmula.' }),
      Q('Unes la pata 4 (reset) a masa. ¿Qué pasa?', ['Se para el oscilador: salida baja', 'Va más rápido', 'Nada', 'Se invierte la salida'], 'Normalmente la 4 va a VCC.', { c: 'bb_555chip', h: 'Piensa qué significa «reset».' }),
      Q('Dentro del 555, ¿qué hace cada detector de umbral (comparador)?', ['Compara dos tensiones y pone su salida alta o baja según cuál es mayor', 'Amplifica la señal del condensador', 'Guarda la frecuencia', 'Genera la senoide'], 'Solo dice «mayor» o «menor».', { c: 'bb_555inside', h: 'Su nombre lo dice: detecta cuándo se pasa un umbral.' }),
      Q('¿Entre qué tensiones oscila el condensador de un 555 alimentado a 9 V?', ['Entre 3 y 6 V', 'Entre 0 y 9 V', 'Entre 4,5 y 9 V', 'Entre 0 y 3 V'], '1/3 y 2/3 de 9 V.', { c: 'bb_555inside', h: 'Calcula 1/3 y 2/3 de la alimentación.' }),
      I('<b>Resumen</b>\n· El 555 vigila un condensador con dos umbrales (1/3 y 2/3) y una memoria.\n· Patas: 1 masa, 2 disparo, 3 salida, 4 reset, 5 control, 6 umbral, 7 descarga, 8 VCC.\n· Astable: <b>f ≈ 1,44 / ((R1 + 2·R2) · C)</b>.')
    ]),
    L('k5', 'El 555 monoestable', 'ic', ['bb_555mono', 'bb_555chip'], [
      Q('Pulsas un botón un instante y quieres que una luz se quede encendida 10 s exactos. ¿Qué crees que decide esos 10 s en un 555?', ['Una resistencia y un condensador', 'Lo que dura la pulsación', 'La tensión de la pila', 'El color del LED'], 'Como en el astable, un RC: el tiempo que tarda el condensador en llegar a 2/3.', { predict: true, c: 'bb_555mono', h: 'Recuerda qué vigila el 555.' }),
      I('<b>Monoestable</b>: un solo pulso por disparo. R va del + a las patas 6 y 7 unidas, y C de ahí a masa. La pata 2 (disparo) lleva una <b>pull-up</b> y un pulsador a masa. Al pulsar, el disparo baja de 1/3: la salida sube y el condensador empieza a cargarse por R. Al llegar a 2/3, la salida baja y la pata 7 lo descarga.', { svg: SVG_MONOT }),
      { t: 'explore', text: 'Un 555 en monoestable. Pon el disparo en 1 para lanzarlo (cada cambio vuelve a empezar).', viz: 'mono', params: { R: pR('R', 10000, 10000, 1000000), C: { label: 'C', val: 10, list: [10, 22, 47, 100], fmt: 'C' }, trig: { label: 'Disparo (0 suelto · 1 pulsado)', val: 0, list: [0, 1] } },
        tasks: [
          { q: 'trig', min: 1, max: 1, text: 'Dispara el temporizador', done: 'La salida sube al instante y se queda alta mientras el condensador sube hasta 2/3.', hint: 'Disparo a 1.' },
          { q: 't', min: 4.5, max: 5.5, text: 'Consigue un pulso de unos 5 s', done: '100 kΩ y 47 µF: 1,1 × 100 000 × 0,000047 ≈ 5,2 s.', hint: 'Sube R y C.' },
          { q: 't', min: 9, max: 11.5, text: 'Ahora unos 10 s', done: '100 kΩ y 100 µF: 11 s. El doble de C, el doble de tiempo.', hint: 'Duplica C.' }
        ] },
      I('Duración del pulso: <b>t ≈ 1,1 · R · C</b> (ohmios por faradios dan segundos). Es el tiempo que tarda el condensador en cargarse de 0 a 2/3 de la alimentación.', { more: 'El 1,1 sale de ln 3 ≈ 1,0986: cargar de 0 a 2/3 a través de R tarda ln 3 · R · C.\nLos electrolíticos tienen ±20 % de tolerancia: si el tiempo importa, pon un potenciómetro en serie con R para ajustarlo.' }),
      { t: 'steps', text: 'Quieres un pulso de 5 s con un condensador de 47 µF. ¿Qué R?', steps: ['Despeja: <b>R = t / (1,1 · C)</b>.', 'Sustituye: R = 5 / (1,1 × 0,000047).', '1,1 × 0,000047 = 0,0000517.', 'R = 5 / 0,0000517 ≈ <b>96,7 kΩ</b> → 100 kΩ (unos 5,2 s).'], result: '<b>96,7 kΩ</b> → 100 kΩ comercial.' },
      Nm('R = 100 kΩ, C = 100 µF. ¿Duración en s?', 11, 's', '1,1 × 100 000 × 0,0001 = 11 s.', { tol: 0.2, c: 'bb_555mono', h: 'Pasa los µF a faradios antes de multiplicar.' }),
      Nm('Quieres 5 s con 47 µF. ¿R en kΩ?', 96.7, 'kΩ', '5 / (1,1 × 0,000047) ≈ 96 700 Ω → 100 kΩ.', { tol: 2, c: 'bb_555mono', h: 'Despeja R de t = 1,1 · R · C.' }),
      G('mono555'),
      Q('¿Qué activa el disparo del 555?', ['Un pulso bajo: la pata 2 por debajo de 1/3 de VCC', 'Un pulso alto', 'Cualquier cambio', '5 V exactos'], 'Por eso el pulsador va a masa.', { c: 'bb_555chip', h: 'Recuerda qué detector vigila la pata 2.' }),
      Q('¿Por qué la pata 2 lleva una resistencia pull-up hacia VCC?', ['Para que sin pulsar quede alta y no se dispare sola', 'Para que el pulso dure más', 'Para alimentar el 555', 'No hace falta'], 'Una entrada al aire podría bajar de 1/3 con el ruido.', { c: 'bb_pullup', h: 'Recuerda qué pasa con una entrada que flota.' }),
      Q('Mantienes el pulsador apretado más tiempo que el pulso. ¿Qué pasa?', ['La salida sigue alta mientras el disparo siga bajo', 'Se apaga a su tiempo igualmente', 'El 555 se rompe', 'La salida se invierte'], 'Mientras la orden de disparo sigue activa, la memoria no puede bajar la salida.', { c: 'bb_555mono', h: 'Piensa en las dos órdenes de la memoria y cuál sigue activa.' }),
      Q('Calculas 10 s con un electrolítico y mides 12 s. ¿Lo más probable?', ['La tolerancia del electrolítico (±20 %)', 'El 555 está roto', 'La fórmula está mal', 'La pila es de 9 V'], 'Si el tiempo importa, un potenciómetro en serie con R para ajustarlo.', { c: 'bb_555mono', h: 'Recuerda la tolerancia de los condensadores electrolíticos (g7).' }),
      I('<b>Resumen</b>\n· Monoestable: un pulso por disparo, de <b>t ≈ 1,1 · R · C</b>.\n· Disparo: pata 2 por debajo de 1/3, con pull-up y pulsador a masa.\n· Electrolíticos imprecisos: ajusta con un potenciómetro si importa.')
    ]),
    SIM('s555', 'Reto: intermitente con 555', 'Monta un 555 astable que haga parpadear un LED.', { battery: 9, parts: ['ic555', 'res', 'cap', 'led'], sch: 'ne555', hint: 'Patas 8 y 4 al +, 1 al −. R1 (10 kΩ) de + a 7; R2 (47 kΩ) de 7 a 6; une 6 con 2; 10 µF de 2 a −. Pata 3 → 470 Ω → LED → −.' }, 'blink555'),
    L('k15', 'Trucos del 555', 'ic', ['bb_555duty', 'bb_555chip'], [
      Q('En el astable clásico, el condensador se carga por R1 + R2 y se descarga solo por R2. ¿Qué dura más: el tiempo en alto o en bajo?', ['En alto, siempre', 'En bajo, siempre', 'Siempre iguales', 'Depende de la pila'], 'El alto incluye R1; el bajo, no. Por eso el ciclo de trabajo (h20) siempre pasa del 50 %.', { predict: true, c: 'bb_555duty', h: 'Compara los caminos de carga y de descarga.' }),
      { t: 'explore', text: 'Un 555 astable al que puedes añadir un diodo en paralelo con R2. Arriba, la onda de salida; abajo, el LED.', viz: 'astable2', params: { R1: pR('R1', 10000, 1000, 100000), R2: pR('R2', 10000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47], fmt: 'C' }, D: { label: 'Diodo (0 no · 1 sí)', val: 0, list: [0, 1] } },
        tasks: [
          { q: 'dutyNoD', min: 0, max: 52, text: 'Sin diodo, acércate todo lo posible al 50 % (menos del 52 %)', done: 'Con R1 pequeña frente a R2 te acercas, pero nunca bajas del 50 %.', hint: 'R1 mínima y R2 grande.' },
          { q: 'dutyD', min: 0, max: 25, text: 'Pon el diodo y consigue un ciclo por debajo del 25 %', done: 'Con el diodo, alto con R1 y bajo con R2: R1 pequeña, destellos cortos.', hint: 'Diodo 1, R1 pequeña y R2 grande.' },
          { q: 'dutyD', min: 48, max: 52, text: 'Con el diodo, consigue una onda cuadrada del 50 %', done: 'Con diodo y R1 = R2, alto y bajo iguales.', hint: 'Iguala R1 y R2.' }
        ] },
      I('En el astable clásico, alto = 0,693 · (R1 + R2) · C y bajo = 0,693 · R2 · C. Ciclo de trabajo = alto / (alto + bajo) = <b>(R1 + R2) / (R1 + 2·R2)</b>: siempre por encima del 50 %.', { svg: SVG_DUTY }),
      { t: 'steps', text: '555 astable clásico con R1 = 10 kΩ y R2 = 47 kΩ. ¿Ciclo de trabajo?', steps: ['Alto ∝ R1 + R2 = <b>57 kΩ</b>.', 'Periodo ∝ R1 + 2·R2 = <b>104 kΩ</b> (C y 0,693 se cancelan).', 'Ciclo = 57 / 104 = 0,548.', 'En porcentaje: <b>54,8 %</b>.'], result: '<b>54,8 %</b>.' },
      Nm('R1 = 10 kΩ y R2 = 47 kΩ. ¿Ciclo de trabajo en %?', 54.8, '%', '(R1 + R2) / (R1 + 2·R2) = 57 / 104.', { tol: 0.5, c: 'bb_555duty', h: 'Alto con R1 + R2; periodo con R1 + 2·R2.' }),
      I('<b>Truco del diodo</b>: un diodo en paralelo con R2, ánodo hacia la pata 7 y cátodo hacia la 6. Al cargar, la corriente pasa por R1 y el diodo, saltándose R2; al descargar, el diodo queda en inversa y solo actúa R2.\nAlto ≈ 0,693 · R1 · C; bajo ≈ 0,693 · R2 · C: <b>por debajo del 50 %</b> si R1 < R2.', { svg: SVG_DIODE555, more: 'El diodo cae unos 0,7 V, así que la carga es un poco más lenta de lo que dice la fórmula, sobre todo con alimentaciones bajas.' }),
      Nm('Con el diodo, R1 = 10 kΩ, R2 = 47 kΩ y C = 47 µF, ¿tiempo en alto aproximado, en s?', 0.33, 's', '0,693 × 10 000 × 0,000047 ≈ 0,33 s (algo más por la caída del diodo).', { tol: 0.04, c: 'bb_555duty', h: 'Con el diodo, el alto solo depende de R1.' }),
      Q('¿Y el tiempo en bajo?', ['Unos 1,5 s', 'Unos 0,33 s', 'Unos 3 s', 'Unos 0,1 s'], '0,693 × 47 kΩ × 47 µF ≈ 1,53 s.', { c: 'bb_555duty', h: 'La descarga sigue siendo solo por R2.' }),
      G('duty555'),
      I('<b>PWM con un 555</b>: sustituye R2 por un potenciómetro con dos diodos, uno para la carga y otro para la descarga (y una R1 pequeña). Al girarlo, lo que quitas de un lado lo pones en el otro: la frecuencia apenas cambia y el ciclo va de cerca de 0 a cerca del 100 %. Con un MOSFET a la salida, regula un motor o una tira de LEDs.', { svg: SVG_PWM555 }),
      Q('¿Por qué la frecuencia casi no cambia en ese PWM?', ['La suma de resistencias de carga y descarga es siempre el potenciómetro entero', 'Porque el condensador cambia', 'Porque el diodo lo compensa todo', 'Sí cambia mucho'], 'Solo cambia el reparto.', { c: 'bb_555duty', h: 'Suma la parte de carga y la de descarga del potenciómetro.' }),
      I('<b>Pata 5 (control)</b>: ahí asoman los 2/3 del divisor interno. Si le aplicas una tensión, mueves los umbrales y cambias la frecuencia: un oscilador controlado por tensión sencillo, base de sirenas y efectos de sonido. Si no la usas, 10 nF a masa.', { svg: SVG_PIN5 }),
      Q('Si no usas la pata 5, ¿qué se recomienda?', ['Un condensador de 10 nF a masa para filtrar ruido', 'Dejarla al aire siempre', 'Unirla a VCC', 'Unirla a la salida'], 'Estabiliza los umbrales.', { c: 'bb_555chip', h: 'Es una entrada sensible: ¿qué haces con el ruido?' }),
      Q('Un NE555 consume unos mA y mete picos en la alimentación al conmutar. ¿Alternativa para circuitos con pilas?', ['La versión CMOS (TLC555, ICM7555)', 'Un 555 con R1 más grande', 'Dos NE555 en paralelo', 'Ninguna: todos consumen igual'], 'Consume de decenas a cientos de µA y funciona desde unos 2 V.', { c: 'bb_555chip', h: 'Busca la versión con transistores MOSFET.' }),
      I('<b>Resumen</b>\n· Astable clásico: ciclo = (R1 + R2) / (R1 + 2·R2) > 50 %.\n· Con <b>diodo</b> en paralelo con R2: alto ∝ R1, bajo ∝ R2.\n· PWM: potenciómetro + dos diodos (frecuencia casi fija).\n· Pata 5: mueve umbrales (VCO) o 10 nF a masa. Con pilas, versión CMOS.')
    ]),
    SIM('sg4', 'Reto: 555 con ciclo menor del 50 %', 'Usa el truco del diodo para que el LED (entre la pata 3 y masa) pase encendido mucho menos tiempo que apagado.', { battery: 9, parts: ['ic555', 'res', 'cap', 'diode', 'led'], sch: 'ne555', hint: 'Como el intermitente: 8 y 4 al +, 1 al −, R1 = 10 kΩ de + a 7, R2 = 47 kΩ de 7 a 6, 2 unida a 6 y 47 µF de 2 a −. Añade el diodo en paralelo con R2: ánodo en la 7, cátodo en la 6. Pata 3 → 470 Ω → LED → −. Al terminar pulsa Comprobar: el parpadeo se mide desde ese momento, así que deja que corra 6 s y vuelve a comprobar.' }, 'duty555'),
    PRJ('p5', 'Proyecto: intermitente con 555', 'blinker555'),
    PRJ('p11', 'Proyecto: sirena y theremin con 555', 'siren555')
  ] });
})();
