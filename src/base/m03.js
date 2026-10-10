/* Voltio · curso base, módulo 4: Serie y paralelo.
   Enseña: serie (d1), ley de mallas (d5), resistencia de un LED (d20), resistencias reales: E12, colores y SMD (g1),
   tolerancia (d21), inversos y fórmula del paralelo (a5), paralelo (d2), ley de nudos (d4), mixtos y divisor de
   corriente (d3), divisor de tensión y su carga (d6), potenciómetros y sensores resistivos (g2).
   Usa: Ohm (c1, c2), potencia (c4, c5), porcentajes (a4), cifras significativas (a7), LED (b20), esquemas (e1–e4).
   Todavía no: multímetro (m4), condensadores, Thévenin, frecuencia. */
(() => {
  const { num, fR, fI, fV, st, batt, resBody, flowPath, stackBar, BANDHEX } = Widgets.H;
  const { pick, ri, fmt, fR: gR, uniq, MC, N } = Gen.helpers;

  /* ---------- utilidades ---------- */
  const E12B = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  const e12 = (min, max) => { const o = []; for (let m = 1; m <= 1e5; m *= 10) for (const b of E12B) { const v = b * m; if (v >= min && v <= max) o.push(v); } if (min <= 1e7 && max >= 1e7) o.push(1e7); return o; };
  const pE = (label, val, min = 100, max = 10000) => ({ label, val, list: e12(min, max), fmt: 'R' });
  const yn = (label, val = 0) => ({ label, val, list: [0, 1], dec: 0 });
  const SV = (h, b) => `<svg viewBox="0 0 300 ${h}" class="viz">${b}</svg>`;
  const tx = (x, y, t, c = 'vizsm', e = '') => `<text x="${x}" y="${y}" class="${c}" ${e}>${t}</text>`;
  const mid = 'text-anchor="middle"', end = 'text-anchor="end"';
  const RES = (...k) => I('<b>Resumen</b>\n· ' + k.join('\n· '));
  const LEDC = [['rojo', '#E5484D', 2.0], ['verde', '#2EA44F', 2.2], ['azul', '#3E8FCB', 3.0]];
  const BANDN = ['negro', 'marrón', 'rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'gris', 'blanco'];
  const fmA = i => num(i * 1000, 2) + ' mA';
  const small = x => x.toPrecision(2).replace('.', ',');
  const rH = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">${resBody()}</g>`;
  const ledSym = (x, y, col = '#E5484D', on = 1, rot = 90) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-16 0h8M8 0h8" ${st}/><path d="M-8 -9v18l15 -9z" fill="${col}" fill-opacity="${(0.25 + 0.75 * on).toFixed(2)}" stroke="currentColor" stroke-width="1.6"/><path d="M7 -9v18" ${st}/></g>`;
  const glow = (x, y, col, b) => `<circle cx="${x}" cy="${y}" r="24" fill="${col}" opacity="${(b * 0.4).toFixed(2)}"/>`;
  const arrowR = (x1, y1, x2, y2, c = 'currentColor') => { const a = Math.atan2(y2 - y1, x2 - x1), L = 8; const p = s => `${(x2 - L * Math.cos(a + s)).toFixed(1)} ${(y2 - L * Math.sin(a + s)).toFixed(1)}`; return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="2"/><path d="M${x2} ${y2}L${p(-0.45)}L${p(0.45)}z" fill="${c}"/>`; };

  /* ---------- visualizaciones ---------- */
  Object.assign(Widgets.VIZ, {
    // Ley de mallas: la tensión baja escalón a escalón al recorrer la malla
    kvlLoop: {
      calc: p => {
        const vl = p.led ? 2 : 0, I = Math.max(0, (p.V - vl) / (p.R1 + p.R2)), VR1 = I * p.R1, VR2 = I * p.R2;
        const pts = [0, p.V, p.V - VR1, p.V - VR1 - vl, 0];
        return { I, VR1, VR2, VLED: vl, P: pts[p.pos], back: p.pos === 4 ? 1 : 0, led: p.led, pts };
      },
      svg: (p, o) => {
        const NP = [[40, 150], [40, 40], [150, 40], [150, 150], [40, 150]], [px, py] = NP[p.pos];
        const k = 105 / 9, X = i => 184 + i * 26, Y = v => 158 - v * k;
        const segs = ['pila', 'R1', p.led ? 'LED' : 'cable', 'R2'], dv = [o.pts[1], -o.VR1, -o.VLED, -o.VR2];
        const stair = o.pts.map((v, i) => `${X(i)},${Y(v).toFixed(1)}`).join(' ');
        return SV(200, `${flowPath('M40 40H150V150H40Z', o.I, 0.004)}${batt(40, 95, p.V)}${rH(95, 40)}${rH(95, 150)}
          ${p.led ? ledSym(150, 95) : tx(156, 98, 'cable')}
          ${tx(95, 26, 'R1 ' + fR(p.R1), 'vizsm', mid)}${tx(95, 174, 'R2 ' + fR(p.R2), 'vizsm', mid)}
          ${tx(48, 60, 'B ' + fV(o.pts[1]))}${tx(144, 60, 'C ' + fV(o.pts[2]), 'vizsm', end)}${tx(144, 138, 'D ' + fV(o.pts[3]), 'vizsm', end)}${tx(48, 138, 'A 0 V')}
          <circle cx="${px}" cy="${py}" r="8" fill="var(--led)"/>${tx(px, py + 4, 'P', 'vizlab', mid + ' style="fill:#fff"')}
          <path d="M178 158H290" stroke="var(--muted)"/><polyline points="${stair}" fill="none" stroke="var(--ice)" stroke-width="3"/>
          ${o.pts.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="${i === p.pos ? 5 : 3}" fill="${i === p.pos ? 'var(--led)' : 'var(--ice)'}"/>`).join('')}
          ${segs.map((s, i) => tx(X(i) + 13, 172, s, 'vizsm', mid) + tx(X(i) + 13, 186, (dv[i] > 0 ? '+' : dv[i] < 0 ? '−' : '') + num(Math.abs(dv[i]), 1), 'vizsm', mid)).join('')}
          ${tx(178, 22, 'Tensión respecto a A')}
          ${tx(10, 196, `P = ${fV(o.P)} · caídas: ${num(o.VR1, 1)} + ${num(o.VLED, 1)} + ${num(o.VR2, 1)} = ${num(o.VR1 + o.VLED + o.VR2, 1)} V`, 'vizlab')}`);
      }
    },
    // Resistencia de un LED: fuente, color y resistencia → corriente, reparto de tensión y potencia
    ledRes: {
      calc: p => {
        const [, , vf] = LEDC[p.col], on = p.Vs > vf, I = on ? (p.Vs - vf) / p.R : 0, VR = on ? p.Vs - vf : 0;
        return { I, VR, PR: VR * I, burnt: I > 0.03 ? 1 : 0, b: Math.min(1, I / 0.015), ok5: p.Vs === 5 && I >= 0.01 && I <= 0.02 ? 1 : 0, blue33: p.col === 2 && p.Vs === 3.3 && I >= 0.005 && I <= 0.03 ? 1 : 0 };
      },
      svg: (p, o) => {
        const [name, col, vf] = LEDC[p.col], b = o.burnt ? 0 : o.b;
        const parts = o.VR > 0 ? [[o.VR, '#F2A900', 'R ' + fV(o.VR)], [vf, col, 'LED ' + fV(vf)]] : [[p.Vs, col, 'LED: no llega a ' + fV(vf)]];
        return SV(190, `${flowPath('M60 40H240V130H60Z', o.burnt ? 0 : o.I, 0.02)}${batt(60, 85, p.Vs)}${rH(150, 40)}
          ${glow(240, 85, col, b)}${ledSym(240, 85, o.burnt ? '#3a2020' : col, b)}
          ${tx(150, 24, fR(p.R), 'vizlab', mid)}${tx(250, 120, 'LED ' + name)}
          ${stackBar(50, 158, 200, parts, p.Vs)}
          ${tx(150, 76, o.burnt ? '💨 quemado: ' + fI(o.I) : fI(o.I), 'vizbig', mid)}
          ${tx(150, 94, 'resistencia: ' + (o.PR >= 1 ? num(o.PR, 2) + ' W' : num(o.PR * 1000, 0) + ' mW') + (o.PR > 0.125 ? ' (¡ojo con ¼ W!)' : ''), 'vizsm', mid)}`);
      }
    },
    // Código de colores: tres bandas → valor
    colorRes: {
      calc: p => ({ R: (p.d1 * 10 + p.d2) * 10 ** p.m }),
      svg: (p, o) => {
        const d = [p.d1, p.d2, p.m];
        return SV(160, `<path d="M10 60h50M240 60h50" stroke="#9AA3B2" stroke-width="6" stroke-linecap="round"/>
          <path d="M60 36q0-14 18-14h20q10 0 14 8h76q4-8 14-8h20q18 0 18 14v48q0 14-18 14h-20q-10 0-14-8h-76q-4 8-14 8h-20q-18 0-18-14z" fill="#E7D3A8" stroke="#C9B183" stroke-width="2"/>
          ${d.map((x, i) => `<rect x="${88 + i * 30}" y="${i ? 30 : 22}" width="16" height="${i ? 60 : 76}" fill="${BANDHEX[x]}" ${x === 9 ? 'stroke="#bbb"' : ''}/>`).join('')}<rect x="206" y="22" width="16" height="76" fill="#C9A227"/>
          ${d.map((x, i) => tx(96 + i * 30, 116 + (i % 2) * 12, BANDN[x], 'vizsm', mid)).join('')}${tx(214, 116, 'dorado', 'vizsm', mid)}
          ${tx(150, 152, `${p.d1}${p.d2} y ${p.m} cero${p.m === 1 ? '' : 's'} → ${fR(o.R)}`, 'vizlab', mid)}`);
      }
    },
    // Tolerancia: intervalo de resistencia y de corriente
    tolBand: {
      calc: p => {
        const t = p.tol / 100, Rmin = p.R * (1 - t), Rmax = p.R * (1 + t), Inom = p.V / p.R, Imin = p.V / Rmax, Imax = p.V / Rmin;
        return { Rmin, Rmax, Rw: Rmax - Rmin, Inom, Imin, Imax, spread: Imax - Imin, ok95: p.V === 9 && p.R === 1000 && Imax <= 0.0095 ? 1 : 0 };
      },
      svg: (p, o) => {
        const line = (y, lo, hi, nom, lab, fmtv) => {
          const X = v => 30 + 240 * (v - nom * 0.85) / (nom * 0.3), f = [-0.8, 0.35, -0.2, 0.9, 0.05, -0.55, 0.6, -0.95, 0.2, -0.35];
          return `<path d="M30 ${y}H270" stroke="var(--muted)"/><rect x="${X(lo).toFixed(1)}" y="${y - 10}" width="${(X(hi) - X(lo)).toFixed(1)}" height="20" rx="6" fill="var(--ice)" opacity=".3"/>
            <path d="M${X(nom).toFixed(1)} ${y - 14}V${y + 14}" stroke="currentColor" stroke-width="2"/>
            ${lab === 'R' ? f.map((k, i) => `<circle cx="${X(nom * (1 + k * p.tol / 100)).toFixed(1)}" cy="${y}" r="3.5" fill="var(--led)" class="a-fade a-d${(i % 4) + 1}"/>`).join('') : ''}
            ${tx(X(lo).toFixed(1), y + 28, fmtv(lo), 'vizsm', mid)}${tx(X(hi).toFixed(1), y + 28, fmtv(hi), 'vizsm', mid)}`;
        };
        return SV(180, `${tx(10, 20, `Resistencia ${fR(p.R)} ±${p.tol} %: diez piezas reales`, 'vizlab')}${line(46, o.Rmin, o.Rmax, p.R, 'R', fR)}
          ${tx(10, 104, `Corriente con ${p.V} V (nominal ${fmA(o.Inom)})`, 'vizlab')}${line(130, o.Imin, o.Imax, o.Inom, 'I', fmA)}
          ${tx(150, 176, `La corriente puede variar ${num(o.spread * 1000, 2)} mA`, 'vizsm', mid)}`);
      }
    },
    // Inversos: lo que se suma en paralelo
    inverse: {
      calc: p => { const g1 = 1 / p.R1, g2 = 1 / p.R2, Req = 1 / (g1 + g2); return { Req, g1, g2, small: p.R1 === 1000 && Req < 100 ? 1 : 0, half: Math.abs(Req - p.R1 / 2) < p.R1 * 0.01 ? 1 : 0 }; },
      svg: (p, o) => {
        const s = o.g1 + o.g2, W = 150, bar = (y, w, col, lab) => `<rect x="80" y="${y}" width="${Math.max(2, w).toFixed(1)}" height="16" rx="4" fill="${col}"/>${tx(76, y + 12, lab, 'vizsm', end)}`;
        return SV(175, `${tx(10, 18, 'La «facilidad de paso» de cada rama es 1/R', 'vizlab')}
          ${bar(30, W * o.g1 / s, 'var(--led)', '1/R1')}${tx(84 + W * o.g1 / s, 43, small(o.g1))}
          ${bar(54, W * o.g2 / s, 'var(--ice)', '1/R2')}${tx(84 + W * o.g2 / s, 67, small(o.g2))}
          <rect x="80" y="84" width="${(W * o.g1 / s).toFixed(1)}" height="16" rx="4" fill="var(--led)"/><rect x="${(80 + W * o.g1 / s).toFixed(1)}" y="84" width="${(W * o.g2 / s).toFixed(1)}" height="16" rx="4" fill="var(--ice)"/>${tx(76, 96, 'suma', 'vizsm', end)}
          ${tx(150, 122, `1/R1 + 1/R2 = ${small(s)}`, 'vizlab', mid)}
          ${tx(150, 146, `Req = 1 / ${small(s)} = ${fR(o.Req)}`, 'vizbig', mid)}
          ${tx(150, 166, `R1 = ${fR(p.R1)} · R2 = ${fR(p.R2)} · la menor: ${fR(Math.min(p.R1, p.R2))}`, 'vizsm', mid)}`);
      }
    },
    // Paralelo con el cociente de corrientes
    parRatio: {
      calc: p => { const o = Widgets.VIZ.parallel.calc(p); return { ...o, ratio: o.I1 / o.I2 }; },
      svg: (p, o) => Widgets.VIZ.parallel.svg(p, o)
    },
    // Ley de nudos: lo que entra sale
    nodeSplit: {
      calc: p => { const I4 = p.I1 + p.I2 - p.I3; return { I4, inT: p.I1 + p.I2, eq: Math.abs(p.I1 + p.I2 - 0.04) < 0.0005 && Math.abs(p.I3 - I4) < 0.0005 ? 1 : 0 }; },
      svg: (p, o) => {
        const m = x => num(x * 1000, 0) + ' mA', rev = o.I4 < -1e-6;
        return SV(185, `${flowPath('M20 30L150 90', p.I1, 0.05)}${flowPath('M20 150L150 90', p.I2, 0.05)}${flowPath('M150 90L280 30', p.I3, 0.05)}
          ${flowPath(rev ? 'M280 150L150 90' : 'M150 90L280 150', Math.abs(o.I4), 0.05)}<circle cx="150" cy="90" r="8" fill="currentColor"/>
          ${tx(22, 22, 'I1 entra ' + m(p.I1), 'vizlab')}${tx(22, 172, 'I2 entra ' + m(p.I2), 'vizlab')}${tx(280, 22, 'I3 sale ' + m(p.I3), 'vizlab', end)}
          ${tx(280, 172, rev ? `I4 = −${m(-o.I4)}: ¡entra!` : 'I4 sale ' + m(o.I4), 'vizlab', end + (rev ? ' style="fill:var(--err)"' : ''))}
          ${tx(150, 118, `entra ${m(o.inT)} = sale ${m(p.I3 + Math.max(0, o.I4))}${rev ? ' (+ I4 entrando)' : ''}`, 'vizsm', mid)}`);
      }
    },
    // Circuito mixto: R1 en serie con R2 ‖ R3
    mixed: {
      calc: p => {
        const Rp = 1 / (1 / p.R2 + 1 / p.R3), Req = p.R1 + Rp, It = p.V / Req, V1 = It * p.R1, Vp = It * Rp;
        return { Rp, Req, It, V1, Vp, I2: Vp / p.R2, I3: Vp / p.R3, half: Math.abs(V1 - p.V / 2) < 0.1 ? 1 : 0, R3big: p.R3 >= 100000 ? 1 : 0 };
      },
      svg: (p, o) => SV(190, `${flowPath('M50 40H180', o.It, 0.03)}${flowPath('M50 150H250', o.It, 0.03)}${flowPath('M180 40H250V150', o.I3, 0.02)}${flowPath('M180 40V150', o.I2, 0.02)}
        <path d="M50 40V150" ${st}/>${batt(50, 95, p.V)}${rH(112, 40)}${rH(180, 95, 90)}${rH(250, 95, 90)}
        <circle cx="180" cy="40" r="4" fill="currentColor"/><circle cx="180" cy="150" r="4" fill="currentColor"/>
        ${tx(112, 24, 'R1 ' + fR(p.R1) + ' · ' + fV(o.V1), 'vizsm', mid)}
        ${tx(188, 72, 'R2 ' + fR(p.R2))}${tx(188, 126, fI(o.I2), 'vizlab')}${tx(258, 72, 'R3')}${tx(258, 84, fR(p.R3))}${tx(244, 142, fI(o.I3), 'vizlab', end)}
        ${tx(10, 176, `R2‖R3 = ${fR(o.Rp)} · total ${fR(o.Req)} · I = ${fI(o.It)}`, 'vizlab')}`)
    },
    // Divisor cargado
    divLoad: {
      calc: p => { const Vnl = 4.5, Rb = 1 / (1 / p.R + 1 / p.RL), Vl = 9 * Rb / (p.R + Rb), drop = (Vnl - Vl) / Vnl * 100; return { Vnl, Vl, drop, flag: p.RL === 10000 && drop < 5 ? 1 : 0 }; },
      svg: (p, o) => SV(200, `<path d="M50 30H150V170H50Z" ${st}/>${batt(50, 100, 9)}${rH(150, 65, 90)}${rH(150, 135, 90)}
        <path d="M150 100H230V125M230 165V170H150" ${st}/>${rH(230, 145, 90)}<circle cx="150" cy="100" r="4" fill="currentColor"/>
        ${tx(160, 60, 'R1 ' + fR(p.R))}${tx(160, 150, 'R2 ' + fR(p.R))}${tx(240, 140, 'carga')}${tx(240, 154, fR(p.RL))}
        ${tx(165, 92, 'Vsal')}
        ${tx(10, 186, `Sin carga ${fV(o.Vnl)} · con carga ${fV(o.Vl)} · baja un ${num(o.drop, 1)} %`, 'vizlab')}`)
    },
    // Potenciómetro: divisor ajustable
    potDiv: {
      calc: p => { const Rb = 10000 * p.pos / 100, Ra = 10000 - Rb; return { Rb, Ra, Vout: 5 * p.pos / 100 }; },
      svg: (p, o) => {
        const y = 150 - 110 * p.pos / 100;
        return SV(185, `<path d="M40 30H110M40 150H110M40 30V150" ${st}/>${batt(40, 90, 5)}
          <rect x="100" y="34" width="20" height="112" rx="4" fill="var(--line)"/><rect x="100" y="${y.toFixed(1)}" width="20" height="${(146 - y).toFixed(1)}" rx="4" fill="var(--ice)"/>
          <path d="M150 ${y.toFixed(1)}H124" ${st}/><path d="M124 ${y.toFixed(1)}l8 -5v10z" fill="currentColor"/><path d="M150 ${y.toFixed(1)}H190" ${st}/>
          ${tx(132, 30, 'arriba ' + fR(o.Ra))}${tx(132, 166, 'abajo ' + fR(o.Rb))}
          <g transform="translate(245 70)"><circle r="30" fill="var(--bg)" stroke="currentColor" stroke-width="2"/><path d="M0 0L${(24 * Math.cos(Math.PI * (0.75 + 1.5 * p.pos / 100))).toFixed(1)} ${(24 * Math.sin(Math.PI * (0.75 + 1.5 * p.pos / 100))).toFixed(1)}" stroke="var(--led)" stroke-width="4" stroke-linecap="round"/></g>
          ${tx(245, 124, fV(o.Vout), 'vizbig', mid)}${tx(245, 140, 'Vsal (cursor)', 'vizsm', mid)}`);
      }
    },
    // Sensores en un divisor
    sensorDiv: {
      calc: p => {
        const Rs = p.s ? 10000 * Math.exp(3950 * (1 / (p.x + 273.15) - 1 / 298.15)) : 10 ** (6 - 0.04 * p.x);
        const Vout = p.pos ? 5 * p.Rf / (p.Rf + Rs) : 5 * Rs / (p.Rf + Rs);
        return { Rs, Vout, ldrHigh: !p.s && Vout > 4 ? 1 : 0, nt25: p.s && p.x === 25 && Math.abs(Vout - 2.5) < 0.1 ? 1 : 0, riseHot: p.s && p.pos ? 1 : 0 };
      },
      svg: (p, o) => {
        const sens = (y) => `${rH(150, y, 90)}${p.s ? tx(162, y + 4, 't°', 'vizlab') : `<path d="M172 ${y - 18}l-12 10m4 0h-4v-4M180 ${y - 12}l-12 10m4 0h-4v-4" stroke="var(--led)" stroke-width="1.6" fill="none"/>`}`;
        const top = p.pos ? sens(65) : rH(150, 65, 90), bot = p.pos ? rH(150, 135, 90) : sens(135);
        const env = p.s ? `<rect x="244" y="${(120 - p.x).toFixed(1)}" width="10" height="${(p.x + 6).toFixed(1)}" rx="4" fill="var(--err)"/><rect x="243" y="18" width="12" height="110" rx="6" fill="none" stroke="currentColor"/>${tx(249, 146, p.x + ' °C', 'vizlab', mid)}`
          : `<circle cx="249" cy="60" r="${(8 + p.x / 6).toFixed(1)}" fill="var(--led)" opacity="${(0.15 + p.x / 120).toFixed(2)}"/>${tx(249, 146, 'luz ' + p.x + ' %', 'vizlab', mid)}`;
        return SV(200, `<path d="M50 30H150V170H50Z" ${st}/>${batt(50, 100, 5)}${top}${bot}<path d="M150 100H205" ${st}/><circle cx="150" cy="100" r="4" fill="currentColor"/>
          ${tx(186, 92, 'Vsal')}${env}${tx(10, 186, `${p.s ? 'NTC' : 'LDR'} = ${fR(o.Rs)} · fija ${fR(p.Rf)} · Vsal ${fV(o.Vout)}`, 'vizlab')}`);
      }
    }
  });

  /* ---------- generadores (con pista) ---------- */
  const join = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0];
  Gen.add('spSeriesR', () => {
    const rs = Array.from({ length: pick([2, 3]) }, () => pick([100, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700])), t = rs.reduce((a, b) => a + b, 0);
    return { ...N(`${join(rs.map(gR))} en serie. ¿Resistencia total en Ω?`, t, 'Ω', `En serie se suman: ${rs.join(' + ')} = ${t} Ω.`), h: 'Pasa los kΩ a ohmios (× 1000) y súmalas todas: en serie no hay atajos.' };
  }, 'series');
  Gen.add('spSeriesI', () => {
    const V = pick([5, 6, 9, 12]), [a, b] = pick([[1000, 2000], [1000, 3000], [2000, 2000], [1000, 500], [1500, 1500], [470, 1000], [2200, 1000], [220, 330], [3300, 1500]]), I = V / (a + b) * 1000;
    return { ...N(`${V} V con ${gR(a)} y ${gR(b)} en serie. ¿Qué corriente circula, en mA?`, I, 'mA', `Total ${gR(a + b)}; I = ${V} / ${a + b} = ${fmt(I, 2)} mA, la misma en las dos.`, Math.max(0.02, I * 0.01)), h: 'Primero la resistencia total (la suma); luego Ohm con ese total: I = V / Rtotal.' };
  }, 'ba_seriesI');
  Gen.add('spSeriesV', () => {
    const V = pick([6, 9, 12]), [a, b] = pick([[1000, 2000], [2000, 1000], [1000, 3000], [3000, 1000], [470, 1000], [2200, 1000], [1000, 4700], [1500, 3000]]), Vb = V * b / (a + b), f = x => fmt(x, 2) + ' V';
    return MC(`${V} V con R1 = ${gR(a)} y R2 = ${gR(b)} en serie. ¿Cuánta tensión cae en R2?`, f(Vb), [f(V * a / (a + b)), f(V / 2), f(V), f(V * b / a)], `I = ${V} / ${a + b} Ω; V2 = I · R2 = ${f(Vb)}. La mayor resistencia se queda con la mayor parte.`, { h: 'La tensión se reparte en proporción a cada resistencia: R2 se lleva R2 / (R1 + R2) de la pila.' });
  }, 'ba_seriesv');
  Gen.add('spKvl', () => {
    const k = pick(['three', 'led', 'two']), V = pick([5, 9, 12]);
    if (k === 'three') { const a = ri(1, 3), b = ri(1, V - a - 1); return { ...N(`Pila de ${V} V y tres resistencias en serie. En la primera caen ${a} V y en la segunda ${b} V. ¿Y en la tercera?`, V - a - b, 'V', `${V} − ${a} − ${b} = ${V - a - b} V: las caídas suman la pila.`), h: 'Las caídas de una malla suman la tensión de la pila: resta las que ya conoces.' }; }
    if (k === 'led') { const vf = pick([2, 2.2, 3]); const Vs = V > vf ? V : 9; return { ...N(`Pila de ${Vs} V, una resistencia y un LED que se queda ${fmt(vf)} V, en serie. ¿Cuánto cae en la resistencia?`, Vs - vf, 'V', `${Vs} − ${fmt(vf)} = ${fmt(Vs - vf)} V.`, 0.01), h: 'Recorre la malla: lo que sube la pila lo bajan entre el LED y la resistencia.' }; }
    const n = pick([2, 3]), Vs = pick([9, 12]); return { ...N(`${n} LEDs rojos de 2 V en serie con una resistencia y una pila de ${Vs} V. ¿Cuánto queda para la resistencia?`, Vs - 2 * n, 'V', `${Vs} − ${n} × 2 = ${Vs - 2 * n} V.`), h: 'Cada LED de la malla se queda su tensión: réstalas todas de la pila.' };
  }, 'ba_kvl');
  Gen.add('spLedR', () => {
    let Vs, c; do { Vs = pick([3.3, 5, 9, 12]); c = pick([['rojo', 2], ['amarillo', 2.1], ['verde', 2.2], ['azul', 3], ['blanco', 3]]); } while (Vs - c[1] < 1);
    const I = pick([0.005, 0.01, 0.015, 0.02]), R = (Vs - c[1]) / I;
    return { ...N(`Fuente de ${fmt(Vs)} V, LED ${c[0]} (${fmt(c[1])} V) y ${fmt(I * 1000)} mA. ¿Qué resistencia necesitas, en Ω?`, R, 'Ω', `R = (${fmt(Vs)} − ${fmt(c[1])}) / ${fmt(I, 3)} = ${fmt(R, 1)} Ω. Luego eliges el valor comercial siguiente hacia arriba.`, Math.max(1, R * 0.01)), h: 'Resta la tensión del LED a la de la fuente y divide entre la corriente pasada a amperios.' };
  }, 'ba_ledr');
  Gen.add('spColorRead', () => {
    const r = pick([100, 150, 220, 330, 470, 680, 1000, 1200, 1500, 2200, 3300, 3900, 4700, 5600, 6800, 10000, 22000, 47000, 100000]), s = String(r), d = [+s[0], +s[1], s.length - 2];
    return { t: 'res', bands: [BANDN[d[0]], BANDN[d[1]], BANDN[d[2]], 'dorado'], o: uniq(gR(r), [gR(r * 10), gR(r / 10), gR((d[0] * 10 + d[1]) * 10 ** (s.length - 1) + 1)]), a: 0, e: `${d[0]} y ${d[1]} son las cifras; ${BANDN[d[2]]} = ${d[2]} cero${d[2] === 1 ? '' : 's'}: ${gR(r)}.`, h: 'Empieza por el lado contrario a la banda dorada: dos cifras y luego cuántos ceros.' };
  }, 'ba_bands');
  Gen.add('spColorBuild', () => { const r = pick([100, 220, 330, 470, 680, 1000, 1500, 2200, 4700, 10000, 47000]); return { t: 'bands', q: `Pinta las bandas de ${gR(r)}.`, target: r, e: '', h: 'Escribe el valor en ohmios: las dos primeras cifras son las dos primeras bandas y los ceros que quedan, la tercera.' }; }, 'ba_bands');
  Gen.add('spESeries', () => {
    const need = pick([195, 300, 350, 160, 900, 2000, 6000, 430, 250, 1300, 467, 3100]), all = [1, 10, 100].flatMap(m => E12B.map(x => x * m * 10)), up = all.find(x => x >= need), down = all.filter(x => x < need).pop();
    return MC(`Te sale ${gR(need)} para limitar la corriente de un LED. ¿Qué valor de la serie E12 eliges?`, gR(up), [gR(down), gR(up * 10), gR(down / 10)], `El siguiente hacia arriba es ${gR(up)}: un poco más de resistencia da un poco menos de corriente, que es seguro.`, { h: 'Busca los dos valores E12 que rodean al tuyo y quédate con el de arriba.' });
  }, 'ba_eseries');
  Gen.add('spTol', () => {
    const r = pick([220, 470, 1000, 2200, 4700, 10000, 330]), t = pick([1, 5, 10]), lo = r * (1 - t / 100), hi = r * (1 + t / 100);
    return MC(`Una resistencia de ${gR(r)} ±${t} %. ¿Entre qué valores puede estar?`, `${gR(lo)} y ${gR(hi)}`, [`${gR(r - t)} y ${gR(r + t)}`, `${gR(r * (1 - t / 10))} y ${gR(r * (1 + t / 10))}`, `${gR(r)} y ${gR(hi)}`], `${t} % de ${gR(r)} son ${gR(r * t / 100)}: se restan y se suman al nominal.`, { h: 'Calcula el porcentaje del valor nominal y réstalo y súmalo.' });
  }, 'ba_tolband');
  Gen.add('spTolCur', () => {
    const V = pick([5, 9, 12]), r = pick([470, 1000, 2200]), t = pick([5, 10]), Imin = V / (r * (1 + t / 100)) * 1000, Imax = V / (r * (1 - t / 100)) * 1000, In = V / r * 1000, f = x => fmt(x, 2);
    return MC(`${V} V sobre una resistencia de ${gR(r)} ±${t} %. ¿Entre qué corrientes puede estar?`, `Entre ${f(Imin)} y ${f(Imax)} mA`, [`Exactamente ${f(In)} mA`, `Entre ${f(In * (1 - t / 50))} y ${f(In * (1 + t / 50))} mA`, `Entre ${f(In * (1 - t / 1000))} y ${f(In * (1 + t / 1000))} mA`], `La corriente máxima sale con la resistencia mínima: ${V} / ${fmt(r * (1 - t / 100), 1)} Ω; la mínima, con la máxima. Más o menos ±${t} % alrededor de ${f(In)} mA.`, { h: 'El peor caso por arriba es con la resistencia más baja posible, y al revés.' });
  }, 'ba_tolcur');
  Gen.add('spPar2', () => {
    const [a, b] = pick([[100, 100], [1000, 1000], [100, 300], [600, 300], [2200, 2200], [1000, 1500], [470, 470], [60, 30], [1000, 4000], [200, 300], [3000, 6000]]), r = a * b / (a + b);
    return { ...N(`${gR(a)} y ${gR(b)} en paralelo. ¿Resistencia total en Ω?`, r, 'Ω', `(${a} × ${b}) / (${a} + ${b}) = ${fmt(r, 1)} Ω, menor que la más pequeña.`), h: 'Producto partido por suma, en ohmios; el resultado debe salir menor que la más pequeña.' };
  }, 'parallel');
  Gen.add('spParN', () => { const r = pick([1000, 2200, 330, 100, 4700]), n = pick([2, 3, 4, 5]); return { ...N(`${n} resistencias iguales de ${gR(r)} en paralelo. ¿Total en Ω?`, r / n, 'Ω', `n iguales en paralelo: R / n = ${fmt(r / n, 1)} Ω.`), h: 'Con varias iguales en paralelo, divide el valor de una entre cuántas hay.' }; }, 'parallel');
  Gen.add('spParMC', () => { const a = pick([100, 1000, 470, 220]), b = pick([10000, 100000, 1000000]); return MC(`${gR(a)} en paralelo con ${gR(b)}. ¿El total es aproximadamente…?`, `Un poco menos de ${gR(a)}`, [`Un poco más de ${gR(b)}`, gR(a + b), `La mitad de ${gR(b)}`], 'Una resistencia muy grande en paralelo apenas añade camino: casi toda la corriente va por la pequeña.', { h: 'El total en paralelo siempre queda por debajo de la menor. ¿Cuánto aporta un camino casi cerrado?' }); }, 'parallel');
  Gen.add('spParBranch', () => {
    const V = pick([5, 6, 9, 12]); let a, b; do { a = pick([100, 200, 300, 470, 1000, 2000, 3000]); b = pick([100, 200, 300, 470, 1000, 2000, 3000]); } while (a === b);
    if (Math.random() < 0.5) return { ...N(`${V} V con ${gR(a)} y ${gR(b)} en paralelo. ¿Corriente por la de ${gR(a)}, en mA?`, V / a * 1000, 'mA', `Cada rama tiene los ${V} V: I = ${V} / ${a} = ${fmt(V / a * 1000, 2)} mA.`, Math.max(0.05, V / a * 10)), h: 'En paralelo cada rama tiene la tensión completa de la pila: aplica Ohm solo a esa rama.' };
    const It = (V / a + V / b) * 1000; return { ...N(`${V} V con ${gR(a)} y ${gR(b)} en paralelo. ¿Corriente total que sale de la pila, en mA?`, It, 'mA', `${fmt(V / a * 1000, 2)} + ${fmt(V / b * 1000, 2)} = ${fmt(It, 2)} mA.`, Math.max(0.05, It * 0.01)), h: 'Calcula la corriente de cada rama con su resistencia y súmalas.' };
  }, 'ba_curdiv');
  Gen.add('spKcl', () => {
    const k = pick(['in2', 'out2', 'sign']);
    if (k === 'in2') { const a = ri(5, 30), b = ri(5, 30); return { ...N(`A un nudo llegan ${a} mA y ${b} mA y sale una sola rama. ¿Cuánto sale por ella?`, a + b, 'mA', `${a} + ${b} = ${a + b} mA.`), h: 'Todo lo que entra en un nudo tiene que salir.' }; }
    if (k === 'out2') { const a = ri(10, 50), b = ri(2, a - 1); return { ...N(`Entran ${a} mA en un nudo. Por una salida van ${b} mA. ¿Por la otra?`, a - b, 'mA', `${a} − ${b} = ${a - b} mA.`), h: 'Lo que entra = lo que sale: resta lo que ya conoces.' }; }
    const a = ri(5, 20), b = ri(a + 2, a + 15); return MC(`Entran ${a} mA en un nudo y por una salida medida van ${b} mA. Dibujaste la tercera rama saliendo. ¿Qué pasa en ella?`, `Entran ${b - a} mA por ella (te sale −${b - a} mA)`, [`Salen ${b - a} mA`, `Salen ${a + b} mA`, 'No pasa nada: es un error'], `${a} − ${b} = −${b - a} mA: el signo menos dice que va al revés de como la dibujaste.`, { h: 'Haz la cuenta igual que siempre; si sale negativa, piensa qué significa el signo.' });
  }, 'kcl');
  Gen.add('spMixed', () => {
    const r1 = pick([100, 220, 330, 470, 1000]), [a, b] = pick([[200, 200], [1000, 1000], [2200, 2200], [300, 600], [1000, 4000], [470, 470], [3000, 6000]]), p = a * b / (a + b);
    return { ...N(`${gR(r1)} en serie con ${gR(a)} ‖ ${gR(b)} (en paralelo entre sí). ¿Resistencia total en Ω?`, r1 + p, 'Ω', `Primero el paralelo: ${fmt(p, 1)} Ω. Luego suma la de serie: ${fmt(r1 + p, 1)} Ω.`), h: 'Resuelve primero el grupo en paralelo y después súmale la que está en serie.' };
  }, 'ba_mixed');
  Gen.add('spCurDiv', () => {
    const It = pick([10, 20, 30, 60]), [a, b] = pick([[100, 200], [1000, 1000], [300, 600], [1000, 2000], [1000, 3000], [200, 600]]), i1 = It * b / (a + b);
    return { ...N(`Entran ${It} mA en dos ramas en paralelo: R1 = ${gR(a)} y R2 = ${gR(b)}. ¿Corriente por R1, en mA?`, i1, 'mA', `I1 = I · R2 / (R1 + R2) = ${It} × ${b} / ${a + b} = ${fmt(i1, 2)} mA. Por la de menor resistencia va más.`, Math.max(0.05, i1 * 0.01)), h: 'Por la rama de menor resistencia va más corriente: en la fórmula, arriba va la otra resistencia.' };
  }, 'ba_curdiv');
  Gen.add('spDiv', () => {
    const V = pick([5, 9, 12]), [a, b] = pick([[1000, 1000], [2000, 1000], [1000, 2000], [10000, 4700], [4700, 10000], [3300, 6800], [3000, 1000], [1000, 4000]]), vo = V * b / (a + b);
    return { ...N(`${V} V con R1 = ${gR(a)} (arriba) y R2 = ${gR(b)} (abajo). ¿Tensión de salida en V?`, vo, 'V', `Vsal = ${V} × ${b} / (${a} + ${b}) = ${fmt(vo, 2)} V.`, 0.03), h: 'La salida es la parte que se queda la resistencia de abajo: Vent × R2 / (R1 + R2).' };
  }, 'ba_divcalc');

  /* ---------- explicaciones alternativas ---------- */
  const tuneSeries = { viz: 'series', params: { V: pV(9, 1, 9), R1: pE('R1', 1000), R2: pE('R2', 2200) } };
  Object.assign(CONCEPTS, {
    series: { name: 'Resistencia total en serie', alts: [
      { title: 'Obstáculos en fila', text: 'Varias resistencias en serie son como varios estrechamientos seguidos en una tubería: el agua tiene que superarlos todos, así que los frenos se <b>suman</b>. 100 Ω + 220 Ω + 680 Ω = 1000 Ω.', svg: SV(110, `${[[30, 40, '100 Ω'], [80, 60, '220 Ω'], [150, 100, '680 Ω']].map(([x, w, l], i) => `<rect x="${x}" y="20" width="${w - 6}" height="22" rx="6" fill="${['var(--led)', 'var(--ice)', 'var(--ok)'][i]}"/>${tx(x + (w - 6) / 2, 36, l, 'vizsm', mid + ' style="fill:#fff"')}`).join('')}<rect x="30" y="64" width="214" height="22" rx="6" fill="currentColor" opacity=".8"/>${tx(137, 80, 'total 1000 Ω', 'vizsm', mid + ' style="fill:var(--bg)"')}`), q: mcq('Tres resistencias de 330 Ω en serie. ¿Total?', ['990 Ω', '110 Ω', '330 Ω', '3300 Ω'], 'Se suman: 3 × 330.') },
      { title: 'Todo en ohmios antes de sumar', text: 'El error típico es sumar números con prefijos distintos: 1 kΩ + 470 Ω no son 471 Ω. Pasa todo a ohmios: 1000 + 470 = <b>1470 Ω</b> (1,47 kΩ). El total en serie siempre es mayor que la mayor de ellas.', q: mcq('2,2 kΩ y 330 Ω en serie. ¿Total?', ['2530 Ω', '332,2 Ω', '2,2 kΩ', '5,5 kΩ'], '2200 + 330.') }
    ] },
    ba_seriesI: { name: 'Corriente en serie: la misma en todo', alts: [
      { title: 'Un solo camino', text: 'En serie no hay desvíos: cada carga que sale de la pila atraviesa todos los componentes. Por eso la corriente es <b>la misma en todos</b> y se calcula con el total: <b>I = V / (R1 + R2 + …)</b>. Si uno se abre, se para todo.', tune: tuneSeries, q: mcq('12 V con 1 kΩ y 3 kΩ en serie. ¿Corriente por la de 1 kΩ?', ['3 mA', '12 mA', '4 mA', '16 mA'], '12 / 4000 = 3 mA, igual en las dos.') },
      { title: 'Más resistencia, menos corriente para todos', text: 'Añadir una bombilla a una guirnalda en serie aumenta la resistencia total: baja la corriente y <b>todas</b> brillan menos. No se reparte la corriente: se reparte la tensión. Cuenta: 9 V con 1 kΩ dan 9 mA; con 1 kΩ + 2 kΩ, 3 mA por las dos.', q: mcq('Una guirnalda en serie tiene 10 bombillas y le añades 5 iguales. ¿Qué pasa?', ['Todas brillan menos: baja la corriente', 'Las nuevas brillan más', 'Nada cambia', 'Solo las nuevas brillan poco'], 'Más resistencia total, menos corriente para todas.') }
    ] },
    ba_seriesv: { name: 'Reparto de tensión en serie', alts: [
      { title: 'Cada una se lleva I × R', text: 'Como la corriente es la misma, cada resistencia se queda con <b>V = I · R</b>: la más grande, más voltios. 9 V con 1 kΩ y 2 kΩ: I = 3 mA; en la de 1 kΩ caen 3 V y en la de 2 kΩ, 6 V. Mueve los deslizadores y mira las barras.', tune: tuneSeries, q: mcq('12 V con 1 kΩ y 3 kΩ en serie. ¿Cuánto cae en la de 3 kΩ?', ['9 V', '3 V', '12 V', '4 V'], 'I = 3 mA; 3 mA × 3 kΩ = 9 V.') },
      { title: 'En proporción', text: 'Sin calcular la corriente: cada resistencia se lleva su <b>fracción del total</b>. Con 1 kΩ y 2 kΩ (3 kΩ en total), la de 2 kΩ se lleva 2 de cada 3 voltios. Si una vale el doble que otra, se lleva el doble de tensión.', q: mcq('9 V con 2 kΩ y 1 kΩ en serie. ¿Cuánto cae en la de 2 kΩ?', ['6 V', '3 V', '4,5 V', '9 V'], 'Dos tercios de 9 V.') }
    ] },
    ba_kvl: { name: 'Ley de mallas (Kirchhoff II)', alts: [
      { title: 'Subir y bajar una montaña', text: 'Si sales de casa, subes y bajas colinas y vuelves a casa, el desnivel total es cero. En una malla, la pila <b>sube</b> la tensión y cada componente la <b>baja</b> un escalón; al volver al punto de partida, todo se compensa: <b>la suma de caídas = la tensión de la pila</b>.', tune: { viz: 'kvlLoop', params: { V: { ...pV(9, 1, 9), fixed: true }, R1: pE('R1', 1000), R2: pE('R2', 1000), led: yn('LED rojo (0 no · 1 sí)', 1), pos: { label: 'Punto P', val: 2, min: 0, max: 4, step: 1, dec: 0 } } }, q: mcq('Pila de 5 V, una resistencia y un LED de 2 V en serie. ¿Cuánto cae en la resistencia?', ['3 V', '5 V', '7 V', '2 V'], '5 − 2 = 3 V.') },
      { title: 'Con números: tensiones de cada punto', text: 'Pon masa (0 V) en el − de la pila y anota la tensión de cada punto: + de la pila 12 V; tras R1, 8 V; tras el LED, 6 V; tras R2, 0 V. La caída de cada componente es la <b>diferencia</b> entre sus extremos: R1 4 V, LED 2 V, R2 6 V. Suman 12.', q: mcq('Un punto está a 9 V y el siguiente, tras una resistencia, a 5,5 V. ¿Cuánto cae en esa resistencia?', ['3,5 V', '5,5 V', '9 V', '14,5 V'], '9 − 5,5.') },
      { title: 'Si no suma, falta algo', text: 'Kirchhoff se cumple siempre. Si al sumar las caídas que conoces no llegas a la pila, hay otra caída que no has contado: otro componente, un cable fino o una conexión mala. Es una herramienta de detective.', q: mcq('Una pila de 9 V; calculas 6 V en una resistencia y 2 V en un LED. ¿Qué concluyes?', ['Falta 1 V: hay otra caída en la malla', 'Kirchhoff no se cumple aquí', 'La pila da exactamente 8 V', 'Nada raro'], 'Los voltios no desaparecen: busca dónde está el que falta.') }
    ] },
    ba_ledr: { name: 'Calcular la resistencia de un LED', alts: [
      { title: 'La receta en tres pasos', text: '1) Resta a la fuente la tensión del LED (rojo ≈ 2 V; azul o blanco ≈ 3 V): eso es lo que se queda la resistencia. 2) Divide entre la corriente en amperios: <b>R = (Vfuente − VLED) / I</b>. 3) Redondea hacia arriba al valor que tengas.', tune: { viz: 'ledRes', params: { Vs: { label: 'Fuente', val: 5, list: [3.3, 5, 9, 12], unit: 'V', dec: 1 }, col: { label: 'Color (0 rojo · 1 verde · 2 azul)', val: 0, list: [0, 1, 2], dec: 0 }, R: pE('Resistencia', 330, 10, 10000) } }, q: mcq('5 V, LED rojo (2 V) y 10 mA. ¿Resistencia?', ['300 Ω', '500 Ω', '200 Ω', '700 Ω'], '(5 − 2) / 0,01 = 300 Ω.') },
      { title: 'El error típico: olvidar el LED', text: 'Si haces 9 V / 15 mA = 600 Ω, te has olvidado de que el LED se queda su tensión. A la resistencia solo le tocan 9 − 2 = 7 V: 7 / 0,015 ≈ <b>467 Ω</b>. Con LEDs en serie, resta la suma de todas sus tensiones.', q: mcq('Dos LEDs rojos (2 V cada uno) en serie con 9 V a 10 mA. ¿Resistencia?', ['500 Ω', '900 Ω', '700 Ω', '250 Ω'], '(9 − 4) / 0,01 = 500 Ω.') }
    ] },
    ba_eseries: { name: 'Elegir el valor comercial (E12)', alts: [
      { title: 'Solo existen algunos valores', text: 'Las resistencias se fabrican en series: la <b>E12</b> tiene 12 valores por década: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68 y 82 (y esos mismos × 10, × 100…). Cada uno es un 20 % mayor que el anterior, más o menos.', svg: SV(90, `<path d="M15 50H285" stroke="var(--muted)"/>${E12B.map((v, i) => { const x = 15 + 270 * Math.log10(v / 10); return `<path d="M${x.toFixed(1)} 42V58" stroke="var(--led)" stroke-width="3"/>${tx(x.toFixed(1), i % 2 ? 76 : 34, v, 'vizsm', mid)}`; }).join('')}${tx(285, 34, '100', 'vizsm', end)}`), q: mcq('¿Cuál de estos valores pertenece a la serie E12?', ['390 Ω', '400 Ω', '350 Ω', '300 Ω'], '39 × 10 = 390.') },
      { title: 'Hacia arriba, si limita corriente', text: 'Si la resistencia limita la corriente de un LED, redondea <b>hacia arriba</b>: un poco más de resistencia da un poco menos de corriente, que es seguro; un poco menos la daría de más. Te sale 195 Ω → 220 Ω; 300 Ω → 330 Ω; 467 Ω → 470 Ω.', q: mcq('Te sale 250 Ω para un LED. ¿Qué valor E12 eliges?', ['270 Ω', '220 Ω', '2,7 kΩ', '22 Ω'], 'El siguiente hacia arriba.') }
    ] },
    ba_bands: { name: 'Leer el código de colores', alts: [
      { title: 'Diez colores, diez cifras', text: 'Negro 0, marrón 1, rojo 2, naranja 3, amarillo 4, verde 5, azul 6, violeta 7, gris 8, blanco 9: del oscuro al claro pasando por el arcoíris. Las dos primeras bandas son cifras; la tercera, <b>cuántos ceros</b> añadir.', svg: SV(70, `${BANDHEX.map((c, i) => `<rect x="${8 + i * 29}" y="8" width="25" height="30" rx="4" fill="${c}" stroke="#999"/>${tx(20 + i * 29, 56, i, 'vizlab', mid)}`).join('')}`), q: mcq('Rojo, violeta, naranja', ['27 kΩ', '273 Ω', '2,7 kΩ', '270 kΩ'], '2, 7 y tres ceros: 27 000 Ω.') },
      { title: 'Prueba a pintarla', text: 'Mueve las tres bandas y mira el valor. Fíjate en que de 4,7 kΩ (amarillo, violeta, rojo) a 470 Ω (amarillo, violeta, marrón) solo cambia la tercera: la cantidad de ceros. Empieza a leer por el lado contrario a la banda dorada.', tune: { viz: 'colorRes', params: { d1: { label: '1.ª banda', val: 4, list: [1, 2, 3, 4, 5, 6, 7, 8, 9], dec: 0 }, d2: { label: '2.ª banda', val: 7, list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], dec: 0 }, m: { label: '3.ª banda (ceros)', val: 2, list: [0, 1, 2, 3, 4, 5, 6], dec: 0 } } }, q: mcq('Amarillo, violeta, marrón, dorado', ['470 Ω', '47 Ω', '4,7 kΩ', '471 Ω'], '4, 7 y un cero.') },
      { title: 'Al revés: del valor a los colores', text: 'Escribe el valor en ohmios, separa las dos primeras cifras y cuenta los ceros que quedan. 470 Ω = 47 y un cero → amarillo, violeta, marrón. 10 kΩ = 10 000 = 10 y tres ceros → marrón, negro, naranja.', q: mcq('¿Qué bandas tiene 2,2 kΩ?', ['Rojo, rojo, rojo', 'Rojo, rojo, naranja', 'Rojo, rojo, marrón', 'Naranja, naranja, rojo'], '2200 = 22 y dos ceros.') }
    ] },
    ba_code3: { name: 'Código SMD de resistencias', alts: [
      { title: 'Dos cifras y ceros', text: 'Las resistencias SMD son tan pequeñas que llevan números: tres cifras, las dos primeras son el valor y la tercera, cuántos ceros añadir. <b>472</b> = 47 y dos ceros = 4700 Ω = 4,7 kΩ. <b>103</b> = 10 kΩ. <b>100</b> = 10 Ω (¡no 100!).', svg: SV(90, `<rect x="90" y="20" width="120" height="50" rx="4" fill="#222"/><rect x="80" y="20" width="14" height="50" fill="#bbb"/><rect x="206" y="20" width="14" height="50" fill="#bbb"/>${tx(150, 54, '472', 'vizbig', mid + ' style="fill:#eee;font-size:22px"')}${tx(150, 86, '47 · 00 → 4700 Ω', 'vizsm', mid)}`), q: mcq('Una resistencia SMD pone «103». ¿Valor?', ['10 kΩ', '103 Ω', '1 kΩ', '100 kΩ'], '10 y tres ceros.') },
      { title: 'La R es la coma', text: 'Para valores pequeños se usa la letra <b>R</b> como coma decimal: <b>4R7</b> = 4,7 Ω, <b>R10</b> = 0,1 Ω. Las de precisión (1 %) usan cuatro cifras: tres de valor y una de ceros: <b>4702</b> = 470 y dos ceros = 47 kΩ.', q: mcq('Una SMD pone «4R7». ¿Valor?', ['4,7 Ω', '47 Ω', '4,7 kΩ', '470 Ω'], 'La R hace de coma.') }
    ] },
    ba_tolband: { name: 'Tolerancia: intervalo de valores', alts: [
      { title: 'Resta y suma el porcentaje', text: 'La tolerancia dice cuánto puede apartarse la pieza de su valor nominal. Calcula ese porcentaje y réstalo y súmalo: 1 kΩ ±5 % → 5 % de 1000 = 50 Ω → entre <b>950 y 1050 Ω</b>. Cada pieza real cae en algún punto de ese intervalo.', tune: { viz: 'tolBand', params: { R: pE('Nominal', 1000), tol: { label: 'Tolerancia', val: 5, list: [1, 5, 10], unit: '%', dec: 0 }, V: { label: 'Pila', val: 9, list: [5, 9, 12], unit: 'V', dec: 0 } } }, q: mcq('Una resistencia de 2,2 kΩ ±10 %. ¿Entre qué valores puede estar?', ['1,98 kΩ y 2,42 kΩ', '2,19 kΩ y 2,21 kΩ', '2,2 kΩ y 2,42 kΩ', '1,2 kΩ y 3,2 kΩ'], '10 % de 2200 = 220 Ω.') },
      { title: 'La última banda', text: 'La banda separada indica la tolerancia: <b>dorada ±5 %</b>, <b>plateada ±10 %</b>, <b>marrón ±1 %</b>. Un ±1 % no da otro valor, da menos dispersión: 10 kΩ ±1 % está entre 9,9 y 10,1 kΩ; con ±10 %, entre 9 y 11 kΩ.', q: mcq('10 kΩ con banda dorada. ¿Qué valor es imposible para esa pieza?', ['11 kΩ', '9,6 kΩ', '10,4 kΩ', '10 kΩ'], 'Con ±5 % va de 9,5 a 10,5 kΩ.') }
    ] },
    ba_tolcur: { name: 'Tolerancia en el resultado', alts: [
      { title: 'Se arrastra al resultado', text: 'Si la resistencia puede variar un ±5 %, la corriente que calcules con ella también varía más o menos un ±5 %. Si calculas 9,0 mA, lo realista es «entre unos 8,6 y 9,5 mA». La corriente máxima sale con la resistencia <b>mínima</b>.', svg: SV(110, `${tx(10, 22, 'R: 950 · 1000 · 1050 Ω', 'vizlab')}<rect x="60" y="30" width="180" height="16" rx="6" fill="var(--ice)" opacity=".5"/><path d="M150 26V50" stroke="currentColor" stroke-width="2"/>${tx(10, 74, 'I: 9,47 · 9 · 8,57 mA (al revés)', 'vizlab')}<rect x="60" y="82" width="180" height="16" rx="6" fill="var(--led)" opacity=".5"/><path d="M150 78V102" stroke="currentColor" stroke-width="2"/>`), q: mcq('Calculas 4,0 mA con una resistencia de ±5 %. ¿Qué intervalo es realista?', ['Entre unos 3,8 y 4,2 mA', 'Exactamente 4,000 mA', 'Entre 2 y 6 mA', 'Entre 3,99 y 4,01 mA'], '5 % de 4 mA = 0,2 mA.') },
      { title: 'No presumas de cifras', text: 'La calculadora da 9 / 470 = 0,019148936 A, pero con una resistencia del 5 % solo te fías de dos cifras: escribe <b>unos 19 mA</b>. Dar más cifras de las que permiten los datos es inventar precisión.', q: mcq('9 V / 1 kΩ ±10 %. ¿Qué resultado es honesto?', ['Unos 9 mA (entre 8 y 10 mA)', '9,000 mA', '9,0000 mA exactos', '9 A'], 'Con ±10 %, una o dos cifras.') }
    ] },
    ba_inverse: { name: 'Inversos (1/x)', alts: [
      { title: 'Uno dividido entre', text: 'El inverso de un número es 1 dividido entre él: el de 4 es 0,25 y el de 0,5 es 2. Un número grande tiene un inverso pequeño y al revés. Si haces el inverso dos veces, vuelves al número de partida.', svg: SV(100, `<path d="M20 40H280" stroke="var(--muted)"/>${[[0.25, '0,25'], [0.5, '0,5'], [1, '1'], [2, '2'], [4, '4']].map(([v, l]) => { const x = 150 + 60 * Math.log2(v); return `<circle cx="${x}" cy="40" r="4" fill="var(--led)"/>${tx(x, 30, l, 'vizsm', mid)}`; }).join('')}<path d="M90 50Q150 95 270 50" fill="none" stroke="var(--ice)" stroke-width="2" class="a-flow-slow"/><path d="M120 50Q150 80 210 50" fill="none" stroke="var(--ice)" stroke-width="2" class="a-flow-slow"/>${tx(150, 92, '0,25 ↔ 4 · 0,5 ↔ 2 · 1 ↔ 1', 'vizsm', mid)}`), q: mcq('¿Inverso de 0,25?', ['4', '0,25', '−0,25', '2,5'], '1 / 0,25 = 4.') },
      { title: 'No olvides el último paso', text: 'En 1/Rt = 1/R1 + 1/R2, lo que sumas son inversos. Con 100 Ω y 100 Ω: 1/100 + 1/100 = 0,02. Eso es 1/Rt, no Rt: da la vuelta → Rt = 1 / 0,02 = <b>50 Ω</b>. El error típico es contestar 0,02.', tune: { viz: 'inverse', params: { R1: pE('R1', 100, 10, 10000), R2: pE('R2', 100, 10, 10000) } }, q: mcq('1/Rt = 1/200 + 1/200. ¿Rt?', ['100 Ω', '0,01 Ω', '400 Ω', '200 Ω'], '0,01 y luego 1 / 0,01 = 100.') }
    ] },
    parallel: { name: 'Resistencia equivalente en paralelo', alts: [
      { title: 'Más carriles', text: 'Poner resistencias en paralelo es abrir más carriles en una autopista: el tráfico total fluye mejor, así que la resistencia total <b>baja</b>. Siempre queda por debajo de la más pequeña.', svg: SV(110, `<path d="M20 30H280M20 80H280" stroke="var(--muted)" stroke-width="10" stroke-linecap="round" opacity=".35"/><path d="M20 30H280" stroke="var(--led)" stroke-width="3" class="a-flow"/><path d="M20 80H280" stroke="var(--led)" stroke-width="3" class="a-flow"/>${tx(150, 104, 'Dos caminos: pasa más con el mismo empuje', 'vizsm', mid)}`), q: mcq('100 Ω en paralelo con 1 MΩ. ¿El total es…?', ['Un poco menos de 100 Ω', 'Más de 1 MΩ', 'Unos 500 kΩ', '1,0001 MΩ'], 'Por debajo de la menor.') },
      { title: 'Producto partido por suma', text: 'Con dos resistencias: <b>Rt = (R1 × R2) / (R1 + R2)</b>. 600 Ω y 300 Ω: 180 000 / 900 = 200 Ω. Con n iguales, R / n. Comprueba siempre que el resultado es menor que la más pequeña.', tune: { viz: 'inverse', params: { R1: pE('R1', 1000, 10, 10000), R2: pE('R2', 1000, 10, 10000) } }, q: mcq('1 kΩ y 4 kΩ en paralelo', ['800 Ω', '5 kΩ', '2,5 kΩ', '1 kΩ'], '4 000 000 / 5000 = 800 Ω.') }
    ] },
    ba_partension: { name: 'Paralelo: misma tensión', alts: [
      { title: 'Misma tensión', text: 'Todo lo que está en paralelo cuelga de los mismos dos puntos, así que tiene la <b>misma tensión</b>. Por eso los enchufes de casa están en paralelo: todos reciben lo mismo y cada aparato funciona aunque desenchufes otro.', svg: SV(120, `<path d="M30 20H270M30 100H270" ${st}/>${[80, 150, 220].map(x => `<path d="M${x} 20V100" ${st}/>${rH(x, 60, 90)}${tx(x + 12, 64, '9 V', 'vizlab')}`).join('')}${tx(30, 14, '+9 V', 'vizsm')}${tx(30, 116, '0 V', 'vizsm')}`), q: mcq('Dos resistencias distintas en paralelo, conectadas a 3 V. ¿Qué tensión tiene cada una?', ['3 V', '1,5 V', '6 V', 'Depende de su valor'], 'Paralelo = misma tensión.') },
      { title: 'Mismos dos nudos', text: 'Para reconocer un paralelo, mira los extremos: si dos componentes están unidos a los <b>mismos dos nudos</b>, están en paralelo, aunque el dibujo los ponga lejos uno de otro. Si comparten solo un extremo, no.', sch: 'parallel2', q: mcq('Dos resistencias comparten un extremo, pero el otro va a nudos distintos. ¿Están en paralelo?', ['No: deben compartir los dos nudos', 'Sí', 'Solo si son iguales', 'Solo si hay una pila'], 'Paralelo = mismos dos nudos.') }
    ] },
    ba_curdiv: { name: 'Reparto de corriente en paralelo', alts: [
      { title: 'Más por el camino fácil', text: 'Cada rama tiene la tensión completa, así que lleva <b>I = V / R</b>: por la de menor resistencia va más. Y la pila da la suma de todas. Con dos ramas: <b>I1 = I · R2 / (R1 + R2)</b> (arriba va la <b>otra</b> resistencia).', tune: { viz: 'parallel', params: { V: pV(9, 1, 9), R1: pE('R1', 1000), R2: pE('R2', 2200) } }, q: mcq('Entran 30 mA en 1 kΩ en paralelo con 2 kΩ. ¿Cuánto va por la de 1 kΩ?', ['20 mA', '10 mA', '15 mA', '30 mA'], '30 × 2 / 3.') },
      { title: 'Rama a rama', text: 'Olvida las fórmulas: aplica Ohm a cada rama con la tensión de la pila y luego suma. 12 V con 1 kΩ y 3 kΩ: 12 mA + 4 mA = <b>16 mA</b> de la pila. Añadir una rama no cambia las otras; solo sube el total.', q: mcq('9 V con 1 kΩ y 3 kΩ en paralelo. ¿Corriente total?', ['12 mA', '9 mA', '2,25 mA', '3 mA'], '9 + 3 = 12 mA.') }
    ] },
    kcl: { name: 'Ley de nudos (Kirchhoff I)', alts: [
      { title: 'Un cruce de tuberías', text: 'En un cruce de tuberías, el agua que entra tiene que salir: no se acumula ni desaparece. Con la carga eléctrica pasa lo mismo en cualquier nudo: <b>lo que entra = lo que sale</b>.', tune: { viz: 'nodeSplit', params: { I1: { label: 'I1 (entra)', val: 0.03, min: 0, max: 0.04, step: 0.001, fmt: 'mA' }, I2: { label: 'I2 (entra)', val: 0.01, min: 0, max: 0.04, step: 0.001, fmt: 'mA' }, I3: { label: 'I3 (sale)', val: 0.015, min: 0, max: 0.06, step: 0.001, fmt: 'mA' } } }, q: mcq('Entran 50 mA en un nudo y salen 20 mA por una rama y 20 mA por otra. ¿Y por la tercera?', ['10 mA', '50 mA', '90 mA', '0 mA'], '50 − 20 − 20 = 10 mA.') },
      { title: 'Con signos', text: 'Cuenta como positivas las corrientes que entran y negativas las que salen: la suma siempre es cero. Si una incógnita te sale negativa, no hay error: va en sentido contrario al que dibujaste.', q: mcq('Calculas una corriente de rama y te sale −5 mA. ¿Qué significa?', ['Que circulan 5 mA en sentido contrario al supuesto', 'Que el circuito está mal', 'Que la corriente no existe', 'Que hay 5 mA de pérdidas'], 'El signo solo indica el sentido.') }
    ] },
    ba_mixed: { name: 'Reducir un circuito mixto', alts: [
      { title: 'De dentro hacia fuera', text: 'Busca un grupo que esté claramente en serie o en paralelo, sustitúyelo por su equivalente y repite hasta que quede una sola resistencia. 470 Ω en serie con (1 kΩ ‖ 1 kΩ): primero el paralelo, 500 Ω; luego la serie, <b>970 Ω</b>.', tune: { viz: 'mixed', params: { V: { ...pV(12), fixed: true }, R1: pE('R1', 470), R2: pE('R2', 1000), R3: pE('R3', 1000, 100, 1e6) } }, q: mcq('220 Ω en serie con dos de 2,2 kΩ en paralelo. ¿Total?', ['1,32 kΩ', '4,62 kΩ', '2,42 kΩ', '1,1 kΩ'], 'Paralelo 1,1 kΩ; más 220 Ω.') },
      { title: 'Y luego vuelve atrás', text: 'Con el total sacas la corriente de la pila (I = V / Rtotal). Después deshaces el camino: esa corriente cruza la parte en serie y se reparte en el paralelo. 400 Ω + (200 Ω ‖ 200 Ω) con 10 V: 10 / 500 = 20 mA en total y 10 mA por cada una de 200 Ω.', q: mcq('Dos de 1 kΩ en paralelo, en serie con 500 Ω, con 10 V. ¿Corriente total?', ['10 mA', '4 mA', '20 mA', '6,7 mA'], '500 + 500 = 1 kΩ → 10 mA.') }
    ] },
    ba_divcalc: { name: 'Calcular un divisor de tensión', alts: [
      { title: 'Una escalera', text: 'Imagina la pila como una escalera de 9 escalones que las resistencias se reparten según su tamaño. Con 2 kΩ arriba y 1 kΩ abajo, la de abajo se lleva 1 de cada 3 escalones: <b>3 V</b>. La salida es la tensión del punto medio respecto a masa.', tune: { viz: 'divider', params: { V: pV(9, 1, 9), R1: pE('R1', 2200, 100, 100000), R2: pE('R2', 1000, 100, 100000) } }, q: mcq('12 V, R1 = 3 kΩ arriba y R2 = 1 kΩ abajo. ¿Vsal?', ['3 V', '9 V', '4 V', '6 V'], 'R2 es 1/4 del total: 12 / 4.') },
      { title: 'La fórmula', text: '<b>Vsal = Vent × R2 / (R1 + R2)</b>, con R2 la resistencia de abajo (la que va a masa). Sale de la serie: I = Vent / (R1 + R2) y Vsal = I · R2. Si R1 = R2, la mitad; si R2 es mayor que R1, más de la mitad.', q: mcq('5 V con R1 = 1 kΩ arriba y R2 = 4 kΩ abajo. ¿Vsal?', ['4 V', '1 V', '1,25 V', '5 V'], '5 × 4 / 5.') }
    ] },
    ba_divload: { name: 'Cargar un divisor', alts: [
      { title: 'La carga se pone en paralelo', text: 'Lo que conectes a la salida queda <b>en paralelo con R2</b>: la parte de abajo baja y la salida cae. Un divisor sirve para dar una referencia o leer un sensor, no para alimentar aparatos.', tune: { viz: 'divLoad', params: { R: { label: 'R1 = R2', val: 10000, list: e12(1000, 1e6), fmt: 'R' }, RL: { label: 'Carga', val: 10000, list: [100, 1000, 10000, 100000, 1e6, 1e7], fmt: 'R' } } }, q: mcq('Un divisor da 5 V en vacío. Le conectas un motor. ¿Qué pasa?', ['La tensión cae mucho', 'Sigue dando 5 V', 'Sube a 10 V', 'El motor gira al doble'], 'La carga cambia el divisor.') },
      { title: 'La regla del ×10', text: 'Si la carga es mucho mayor que R2 (diez veces o más), apenas se nota. Si es parecida, sí: dos de 10 kΩ con una carga de 10 kΩ dejan la parte de abajo en 5 kΩ, y la salida cae de la mitad a un tercio.', q: mcq('Divisor de dos de 1 kΩ con 9 V. Le conectas una carga de 1 MΩ. La salida…', ['Casi no cambia: unos 4,5 V', 'Cae a la mitad', 'Sube a 9 V', 'Cae a 0 V'], '1 MΩ es mil veces R2: casi no carga.') }
    ] },
    ba_pot: { name: 'El potenciómetro como divisor', alts: [
      { title: 'Un divisor con cursor', text: 'Un potenciómetro es una resistencia fija entre sus dos extremos con un tercer contacto, el <b>cursor</b>, que se desliza por ella. Parte la resistencia en dos trozos: es un divisor ajustable de 0 V a la tensión completa.', tune: { viz: 'potDiv', params: { pos: { label: 'Cursor', val: 30, min: 0, max: 100, step: 5, unit: '%', dec: 0 } } }, q: mcq('Potenciómetro de 10 kΩ entre 5 V y masa, cursor en el centro. ¿Tensión en el cursor?', ['2,5 V', '5 V', '0 V', '10 V'], 'Mitad y mitad.') },
      { title: 'Cuenta los trozos', text: 'Si el cursor deja 2 kΩ abajo y 8 kΩ arriba (10 kΩ en total), la salida es la fracción de abajo: 2/10 de la tensión. Con 5 V, <b>1 V</b>. Girar el mando solo cambia cómo se reparten los 10 kΩ.', q: mcq('Potenciómetro de 10 kΩ con 9 V; abajo quedan 3 kΩ. ¿Vsal?', ['2,7 V', '3 V', '6,3 V', '9 V'], '9 × 3 / 10.') }
    ] },
    ba_sensordiv: { name: 'Sensores resistivos en un divisor', alts: [
      { title: 'Qué hace cada sensor', text: 'Muchos sensores son resistencias que cambian: una <b>LDR</b> baja su resistencia con la luz; una <b>NTC</b> la baja al calentarse; una PTC la sube. Para leerlos se ponen en un divisor con una resistencia fija y se mira la tensión de salida.', tune: { viz: 'sensorDiv', params: { s: yn('Sensor (0 LDR · 1 NTC)', 0), x: { label: 'Luz % o temperatura °C', val: 50, min: 0, max: 100, step: 5, dec: 0 }, Rf: pE('Fija', 10000, 1000, 100000), pos: yn('Sensor (0 abajo · 1 arriba)', 0) } }, q: mcq('Una NTC se enfría. Su resistencia…', ['Sube', 'Baja', 'No cambia', 'Se hace cero'], 'Menos temperatura, más resistencia.') },
      { title: 'Sigue el razonamiento', text: 'Dos preguntas: ¿qué hace el sensor? (LDR: menos luz, más resistencia) y ¿dónde está? Si está <b>abajo</b> y su resistencia sube, se lleva más tensión y la salida <b>sube</b>. Si está arriba, todo al revés.', q: mcq('LDR arriba y resistencia fija abajo. Al oscurecer, la salida…', ['Baja', 'Sube', 'No cambia', 'Se invierte de signo'], 'La LDR sube y se lleva más tensión; queda menos abajo.') }
    ] }
  });

  /* ---------- SVG de las tarjetas ---------- */
  const svgSerie = SV(150, `<path d="M40 30H260V120H40Z" ${st}/><path d="M40 30H260V120H40Z" fill="none" stroke="var(--led)" stroke-width="3" class="a-flow"/>${batt(40, 75, 9)}${rH(100, 30)}${rH(160, 30)}${rH(220, 30)}
    ${tx(100, 16, 'R1', 'vizsm', mid)}${tx(160, 16, 'R2', 'vizsm', mid)}${tx(220, 16, 'R3', 'vizsm', mid)}${tx(150, 145, 'Un solo camino: la misma corriente por las tres', 'vizlab', mid)}`);
  const svgSuma = SV(130, `<rect x="20" y="20" width="60" height="24" rx="6" fill="var(--led)"/>${tx(50, 37, '1 kΩ', 'vizsm', mid + ' style="fill:#fff"')}${tx(92, 37, '+', 'vizbig', mid)}
    <rect x="104" y="20" width="120" height="24" rx="6" fill="var(--ice)"/>${tx(164, 37, '2 kΩ', 'vizsm', mid + ' style="fill:#fff"')}
    <rect x="20" y="72" width="204" height="24" rx="6" fill="currentColor" opacity=".85" class="a-fade"/>${tx(122, 89, 'total 3 kΩ', 'vizsm', mid + ' style="fill:var(--bg)"')}${tx(122, 120, 'con 9 V: 9 V / 3 kΩ = 3 mA', 'vizsm', mid)}`);
  const svgMalla = SV(170, `<path d="M20 150H290" stroke="var(--muted)"/><polyline points="30,150 30,30 100,30 100,70 170,70 170,90 240,90 240,150 280,150" fill="none" stroke="var(--ice)" stroke-width="3" class="a-draw" style="stroke-dasharray:600;--len:600"/>
    ${tx(36, 24, '+9 V (pila)', 'vizlab')}${tx(135, 64, '−4 V en R1', 'vizsm', mid)}${tx(205, 84, '−2 V LED', 'vizsm', mid)}${tx(236, 122, '−3 V en R2', 'vizsm', end)}${tx(150, 166, 'Subes 9 V y bajas 4 + 2 + 3 = 9 V', 'vizlab', mid)}`);
  const svgPotenciales = SV(160, `<g transform="translate(20 0)"><path d="M40 30H200V130H40Z" ${st}/>${batt(40, 80, 12)}${rH(120, 30)}${ledSym(200, 80)}${rH(120, 130)}
    ${[[40, 30, '12 V'], [200, 30, '8 V'], [200, 130, '6 V'], [40, 130, '0 V']].map(([x, y, l]) => `<circle cx="${x}" cy="${y}" r="5" fill="var(--led)"/>${tx(x + (x > 100 ? 10 : -8), y + (y < 80 ? -8 : 18), l, 'vizlab', x > 100 ? '' : end)}`).join('')}
    ${tx(120, 16, 'R1: 12 − 8 = 4 V', 'vizsm', mid)}${tx(212, 84, 'LED: 2 V')}${tx(120, 152, 'R2: 6 − 0 = 6 V', 'vizsm', mid)}</g>`);
  const svgLedSplit = SV(150, `<path d="M40 30H250V110H40Z" ${st}/><path d="M40 30H250V110H40Z" fill="none" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/>${batt(40, 70, 9)}${rH(140, 30)}${glow(250, 70, '#E5484D', 0.8)}${ledSym(250, 70)}
    <rect x="40" y="124" width="163" height="16" rx="4" fill="#F2A900"/><rect x="203" y="124" width="47" height="16" rx="4" fill="#E5484D"/>${tx(121, 136, 'resistencia 7 V', 'vizsm', mid + ' style="fill:#fff"')}${tx(226, 136, '2 V', 'vizsm', mid + ' style="fill:#fff"')}`);
  const svgLedTabla = SV(150, `${[['rojo', '#E5484D', '≈ 2,0 V'], ['amarillo', '#E8B400', '≈ 2,1 V'], ['verde', '#2EA44F', '≈ 2,2 V*'], ['azul', '#3E8FCB', '≈ 3,0 V'], ['blanco', '#cfd6df', '≈ 3,0 V']].map(([n, c, v], i) => `<circle cx="${32 + i * 58}" cy="40" r="16" fill="${c}" stroke="#888"/>${tx(32 + i * 58, 76, n, 'vizsm', mid)}${tx(32 + i * 58, 94, v, 'vizlab', mid)}`).join('')}
    ${tx(150, 124, 'Corriente típica: 5–20 mA (10 mA suele bastar)', 'vizlab', mid)}${tx(150, 142, '* hay verdes modernos de unos 3 V: mira su ficha', 'vizsm', mid)}`);
  const svgRedondeo = SV(120, `<path d="M20 50H280" stroke="var(--muted)"/>${[[390, 40], [470, 200], [560, 260]].map(([v, x]) => `<path d="M${x} 42V58" stroke="var(--led)" stroke-width="3"/>${tx(x, 36, v + ' Ω', 'vizsm', mid)}`).join('')}
    <path d="M175 50V70" stroke="var(--err)" stroke-width="2"/>${tx(175, 84, '467 Ω calculado', 'vizsm', mid)}${arrowR(180, 64, 196, 56, 'var(--ok)')}${tx(150, 110, 'P = 7 V × 0,0149 A ≈ 0,10 W → ¼ W va bien', 'vizlab', mid)}`);
  const svgTol = SV(120, `<path d="M20 50H280" stroke="var(--muted)"/><rect x="50" y="38" width="200" height="24" rx="8" fill="var(--ice)" opacity=".3"/><path d="M150 32V68" stroke="currentColor" stroke-width="2"/>
    ${[-0.8, 0.35, -0.2, 0.9, 0.05, -0.55, 0.6, -0.95, 0.2, -0.35].map((k, i) => `<circle cx="${(150 + 100 * k).toFixed(0)}" cy="50" r="4" fill="var(--led)" class="a-fade a-d${(i % 4) + 1}"/>`).join('')}
    ${tx(50, 84, '950 Ω', 'vizsm', mid)}${tx(150, 84, '1000 Ω', 'vizsm', mid)}${tx(250, 84, '1050 Ω', 'vizsm', mid)}${tx(150, 110, '1 kΩ ±5 %: cada pieza real cae en la banda', 'vizlab', mid)}`);
  const svgCifras = SV(110, `<rect x="40" y="14" width="220" height="40" rx="8" fill="var(--line)"/>${tx(250, 42, '0,019148936', 'vizbig', end + ' style="font-size:20px"')}<path d="M110 34H255" stroke="var(--err)" stroke-width="2"/>
    ${tx(150, 80, 'Con ±5 %: «unos 19 mA»', 'vizlab', mid)}${tx(150, 100, 'Da tantas cifras como permiten los datos (2 o 3)', 'vizsm', mid)}`);
  const svgInv = SV(120, `${[0.25, 0.5, 1, 2, 4].map((v, i) => { const h = x => 8 + 11 * (Math.log2(x) + 2), x0 = 18 + i * 56; return `<rect x="${x0}" y="${80 - h(v)}" width="18" height="${h(v)}" rx="3" fill="var(--ice)"/><rect x="${x0 + 21}" y="${80 - h(1 / v)}" width="18" height="${h(1 / v)}" rx="3" fill="var(--led)"/>${tx(x0 + 20, 98, String(v).replace('.', ','), 'vizlab', mid)}${tx(x0 + 20, 114, '1/x = ' + String(1 / v).replace('.', ','), 'vizsm', mid)}`; }).join('')}`);
  const svgPar = SV(150, `<path d="M40 25H260M40 125H260M40 25V125" ${st}/>${batt(40, 75, 9)}<path d="M150 25V125M240 25V125" ${st}/>${rH(150, 75, 90)}${rH(240, 75, 90)}
    <path d="M150 25V125" stroke="var(--led)" stroke-width="3" class="a-flow" fill="none"/><path d="M240 25V125" stroke="var(--led)" stroke-width="3" class="a-flow-slow" fill="none"/>
    ${tx(160, 60, '1 kΩ')}${tx(160, 98, '9 mA', 'vizlab')}${tx(250, 60, '2 kΩ')}${tx(250, 98, '4,5 mA', 'vizlab')}${tx(60, 18, '+9 V: arriba todo está a 9 V', 'vizsm')}${tx(60, 142, '0 V: abajo todo está a 0 V', 'vizsm')}`);
  const svgNudo = SV(150, `<path d="M20 75H140" stroke="var(--led)" stroke-width="5" class="a-flow"/><path d="M140 75L270 30" stroke="var(--led)" stroke-width="3.5" class="a-flow"/><path d="M140 75L270 120" stroke="var(--led)" stroke-width="2" class="a-flow"/><circle cx="140" cy="75" r="7" fill="currentColor"/>
    ${tx(30, 66, 'entran 30 mA', 'vizlab')}${tx(270, 22, 'salen 20 mA', 'vizlab', end)}${tx(270, 142, 'salen 10 mA', 'vizlab', end)}`);
  const svgSigno = SV(130, `<path d="M20 65H140M140 65L270 20" stroke="currentColor" stroke-width="2.5"/><circle cx="140" cy="65" r="7" fill="currentColor"/>${arrowR(60, 65, 100, 65)}${arrowR(190, 48, 230, 34)}
    <path d="M140 65L270 110" stroke="var(--err)" stroke-width="2.5" stroke-dasharray="6 4"/>${arrowR(190, 82, 230, 96, 'var(--err)')}${tx(30, 56, '12 mA', 'vizlab')}${tx(270, 14, '17 mA', 'vizlab', end)}${tx(270, 126, 'I3 = 12 − 17 = −5 mA → entran 5', 'vizlab', end + ' style="fill:var(--err)"')}`);
  const svgReduce = SV(150, `<g class="a-fade">${tx(10, 22, '1) Original: 400 Ω + (200 Ω ‖ 200 Ω)', 'vizlab')}</g><g class="a-fade a-d1">${tx(10, 58, '2) El paralelo pasa a ser 100 Ω', 'vizlab')}</g><g class="a-fade a-d2">${tx(10, 94, '3) Serie: 400 + 100 = 500 Ω', 'vizlab')}</g><g class="a-fade a-d3">${tx(10, 130, '4) 10 V / 500 Ω = 20 mA de la pila', 'vizlab')}</g>
    ${[0, 1, 2, 3].map(i => `<circle cx="280" cy="${18 + 36 * i}" r="6" fill="var(--led)" class="a-fade a-d${i + 1}"/>`).join('')}`);
  const svgDiv = SV(190, `<path d="M50 20H150V170H50Z" ${st}/>${batt(50, 95, 9)}${rH(150, 60, 90)}${rH(150, 130, 90)}<path d="M150 95H220" ${st}/><circle cx="150" cy="95" r="4" fill="currentColor"/>
    ${tx(162, 56, 'R1 2 kΩ')}${tx(162, 140, 'R2 1 kΩ')}${tx(196, 88, 'Vsal = 3 V', 'vizlab')}<path d="M250 20V170" stroke="var(--muted)"/><rect x="240" y="20" width="20" height="100" fill="#F2A900" opacity=".7"/><rect x="240" y="120" width="20" height="50" fill="var(--ice)"/>
    ${tx(270, 74, '6 V')}${tx(270, 150, '3 V')}`);
  const svgCarga = SV(150, `<path d="M40 20H140V130H40Z" ${st}/>${batt(40, 75, 9)}${rH(140, 47, 90)}${rH(140, 103, 90)}<path d="M140 75H210V88M210 118V130H140" ${st}/>${rH(210, 103, 90)}
    <rect x="196" y="78" width="28" height="56" rx="6" fill="none" stroke="var(--err)" stroke-dasharray="4 3"/>${tx(232, 98, 'carga', 'vizlab')}${tx(232, 112, 'en paralelo')}${tx(232, 126, 'con R2')}${tx(150, 146, 'La parte de abajo baja → la salida cae', 'vizsm', mid)}`);
  const svgSens = SV(140, `<path d="M30 20V110H140" stroke="var(--muted)"/><path d="M40 30Q60 95 135 104" fill="none" stroke="var(--led)" stroke-width="3"/>${tx(85, 128, 'LDR: luz →', 'vizsm', mid)}${tx(36, 16, 'R', 'vizsm')}
    <path d="M160 20V110H280" stroke="var(--muted)"/><path d="M170 28Q190 95 275 104" fill="none" stroke="var(--err)" stroke-width="3"/>${tx(220, 128, 'NTC: temperatura →', 'vizsm', mid)}${tx(166, 16, 'R', 'vizsm')}`);
  const svgArribaAbajo = SV(175, `${[[70, 'sensor abajo', 1], [220, 'sensor arriba', 0]].map(([x, l, bot]) => `<path d="M${x} 20V140" ${st}/>${rH(x, 50, 90)}${rH(x, 110, 90)}<rect x="${x - 14}" y="${bot ? 88 : 28}" width="28" height="44" rx="6" fill="none" stroke="var(--led)" stroke-width="2"/><path d="M${x} 80H${x + 30}" ${st}/>${tx(x + 34, 84, 'Vsal', 'vizsm')}${tx(x, 154, l, 'vizlab', mid)}${tx(x, 170, bot ? 'su R sube → Vsal sube' : 'su R sube → Vsal baja', 'vizsm', mid)}`).join('')}`);

  /* ---------- lecciones ---------- */
  UNITS.push({ id: 'm3', title: 'Serie y paralelo', desc: 'Serie y ley de mallas, la resistencia de un LED, resistencias reales, paralelo y ley de nudos, mixtos, divisores y sensores.', nodes: [
    L('d1', 'Circuitos en serie', 'series', ['series', 'ba_seriesI', 'ba_seriesv'], [
      Q('Una guirnalda tiene tres bombillas iguales, una detrás de otra, con una pila. Añades una cuarta igual en la misma fila. ¿Qué crees que pasará?', ['Las cuatro brillarán menos que antes', 'Brillarán igual', 'La nueva brillará menos y las otras igual', 'Brillarán más'], 'Más frenos seguidos en el único camino → menos corriente para todas. Vamos a verlo con resistencias.', { predict: true, c: 'ba_seriesI', h: 'Piensa en un solo camino: si añades otro freno, ¿pasa más o menos corriente por todo el camino?' }),
      { t: 'explore', text: 'Dos resistencias <b>en serie</b>: una detrás de otra, con una pila de 9 V. La barra de abajo muestra cuánta tensión se queda cada una.', viz: 'series', params: { V: { ...pV(9, 1, 9), fixed: true }, R1: pE('R1', 1000), R2: pE('R2', 1000) },
        tasks: [
          { q: 'I', min: 0, max: 0.002, text: 'Haz que la corriente baje de 2 mA', done: 'Da igual cuál subas: las dos están en el mismo camino y frenan a todo el circuito.', hint: 'Sube cualquiera de las dos resistencias.' },
          { q: 'I', min: 0.00295, max: 0.00305, text: 'Ahora consigue 3 mA justos', done: '9 V / 3 mA = 3 kΩ: cualquier pareja que sume 3 kΩ (1,5 + 1,5; 1,2 + 1,8…) da lo mismo. Al circuito solo le importa la suma.', hint: 'Con 9 V, para 3 mA el total tiene que ser 3 kΩ: busca dos que sumen eso.' },
          { q: 'V1', min: 5.85, max: 6.15, text: 'Haz que en R1 caigan 6 V y en R2 los 3 V que quedan', done: 'R1 tiene que valer el doble que R2: la tensión se reparte en proporción a cada resistencia.', hint: 'Pon R1 el doble que R2 (por ejemplo 680 Ω y 330 Ω).' }] },
      I('En <b>serie</b> los componentes van uno detrás de otro: hay <b>un solo camino</b>. Toda la carga que sale de la pila los atraviesa todos, así que la <b>corriente es la misma</b> en todos ellos.', { svg: svgSerie, more: 'Por eso, si uno se abre (una bombilla fundida, un cable suelto), se para todo: no hay otro camino. Es lo que pasaba con las guirnaldas antiguas.\nLa corriente no «se gasta» al atravesar una resistencia: lo que sale de la pila es lo que vuelve a ella (lo viste en b3). Lo que pierde la carga al cruzar cada resistencia es tensión, energía por culombio.' }),
      I('Como hay que superar todos los frenos, <b>las resistencias se suman</b>: Rtotal = R1 + R2 + R3…\nCon la suma ya puedes usar Ohm para todo el circuito: <b>I = V / Rtotal</b>.', { svg: svgSuma, more: 'El total en serie siempre es mayor que la mayor de las resistencias. Si sumas 1 kΩ y 470 Ω, pásalo todo a ohmios: 1000 + 470 = 1470 Ω.' }),
      I('La tensión de la pila <b>se reparte</b>: cada resistencia se queda con <b>V = I · R</b>. La mayor se lleva más voltios, en proporción a su valor. Mueve los deslizadores: la suma de las dos barras siempre es la pila.', { tune: { viz: 'series', params: { V: pV(9, 1, 9), R1: pE('R1', 1000), R2: pE('R2', 2200) } } }),
      { t: 'steps', text: '9 V con R1 = 1 kΩ y R2 = 2 kΩ en serie. ¿Corriente y tensión en cada una?', steps: ['Resistencia total: <b>1 kΩ + 2 kΩ = 3 kΩ</b> = 3000 Ω', 'Corriente (Ohm con el total): I = 9 V / 3000 Ω = 0,003 A = <b>3 mA</b>, la misma en las dos', 'Tensión en R1: 0,003 A × 1000 Ω = <b>3 V</b>', 'Tensión en R2: 0,003 A × 2000 Ω = <b>6 V</b>', 'Comprueba: 3 V + 6 V = 9 V, la pila entera'], result: '3 mA; 3 V en R1 y 6 V en R2' },
      Nm('100 Ω, 220 Ω y 680 Ω en serie. ¿Resistencia total en Ω?', 1000, 'Ω', '100 + 220 + 680 = 1000 Ω.', { c: 'series', h: 'En serie se suman todas, sin más.' }),
      Nm('12 V con 1 kΩ y 3 kΩ en serie. ¿Qué corriente pasa, en mA?', 3, 'mA', 'Total 4 kΩ; 12 / 4000 = 0,003 A = 3 mA.', { c: 'ba_seriesI', h: 'Suma primero las dos resistencias y aplica Ohm con el total.' }),
      Nm('12 V con 1 kΩ y 3 kΩ en serie. ¿Cuánta tensión cae en la de 3 kΩ?', 9, 'V', 'I = 3 mA; 0,003 × 3000 = 9 V. La de 1 kΩ se queda los otros 3 V.', { c: 'ba_seriesv', h: 'Saca la corriente con el total y multiplícala por esa resistencia.' }),
      G('spSeriesR'),
      Q('Se funde una bombilla de una guirnalda en serie. ¿Qué pasa con las demás?', ['Se apagan todas', 'Solo se apaga esa', 'Las demás brillan más', 'Nada'], 'En serie hay un solo camino: si se abre en un punto, no pasa corriente por ninguno.', { c: 'ba_seriesI', h: '¿Queda algún camino para la corriente si una se abre?' }),
      G('spSeriesI'),
      Q('Dos resistencias en serie: 1 kΩ y 2,2 kΩ. ¿Cuál se calienta más?', ['La de 2,2 kΩ: misma corriente y más tensión', 'La de 1 kΩ: es más fácil de atravesar', 'Las dos igual', 'Ninguna'], 'P = V · I: con la misma corriente, la que más tensión se queda, más potencia disipa.', { c: 'ba_seriesv', h: 'La corriente es la misma en las dos: ¿cuál se queda más voltios?' }),
      G('spSeriesV'),
      RES('En serie hay <b>un solo camino</b>: la misma corriente por todo.', 'Las resistencias <b>se suman</b>: I = V / Rtotal.', 'La tensión <b>se reparte</b> en proporción: cada una se queda I · R.')
    ]),
    L('d5', 'Ley de mallas (Kirchhoff II)', 'node', ['ba_kvl'], [
      Q('Pila de 9 V con una resistencia y un LED rojo en serie. El LED se queda unos 2 V. ¿Cuánto crees que se queda la resistencia?', ['7 V', '9 V', '2 V', '11 V'], 'Lo que sube la pila lo bajan entre todos: 9 − 2 = 7 V. Es la ley de mallas.', { predict: true, c: 'ba_kvl', h: 'Los 9 V de la pila se reparten entre los dos componentes.' }),
      { t: 'explore', text: 'Recorre esta <b>malla</b> con el punto P. A la derecha ves la tensión de cada punto respecto al − de la pila (A): la pila la sube y cada componente la baja.', viz: 'kvlLoop', params: { V: { ...pV(9, 1, 9), fixed: true }, R1: pE('R1', 1000), R2: pE('R2', 2200), led: yn('LED rojo en la malla (0 no · 1 sí)'), pos: { label: 'Punto P (recorre la malla)', val: 0, min: 0, max: 4, step: 1, dec: 0 } },
        tasks: [
          { q: 'led', min: 1, max: 1, text: 'Añade el LED rojo a la malla', done: 'El LED se queda 2 V y las resistencias se reparten los 7 V restantes. La suma sigue siendo 9 V.', hint: 'Pon «LED rojo en la malla» a 1.' },
          { q: 'VR1', min: 3.45, max: 3.55, text: 'Con el LED puesto, deja 3,5 V en R1', done: 'Con R1 = R2, los 7 V que deja el LED se reparten a medias.', hint: 'Pon R1 y R2 iguales.' },
          { q: 'P', min: 3.45, max: 3.55, text: 'Lleva P al punto que está a 3,5 V', done: 'Es D, después del LED: 9 − 3,5 − 2 = 3,5 V. Desde ahí, R2 baja los últimos 3,5 V hasta 0.', hint: 'Avanza P punto a punto y mira la etiqueta de cada uno.' }] },
      I('Una <b>malla</b> es un camino cerrado. <b>Ley de mallas</b> (segunda ley de Kirchhoff): al dar la vuelta completa, <b>la suma de las caídas es igual a la tensión de la pila</b>. Lo que la pila sube, los componentes lo bajan.', { svg: svgMalla, more: 'Gustav Kirchhoff la publicó en 1845 con solo 21 años, junto con la ley de nudos que verás pronto.\nEs la conservación de la energía: cada culombio recibe 9 J en la pila (lo viste en b9) y los entrega entero por el camino, en forma de calor y luz. Al volver a la pila no le queda nada.' }),
      I('Pon <b>0 V en el − de la pila</b> (masa) y anota la tensión de cada punto. La caída de un componente es la <b>diferencia</b> entre sus dos extremos.', { svg: svgPotenciales, more: 'Así se trabaja con circuitos reales: se toma un punto de referencia (masa) y se habla de «la tensión del punto C», que es la diferencia entre C y masa. Cuando aprendas a usar el multímetro, la punta negra irá a masa y la roja recorrerá los puntos.' }),
      { t: 'steps', text: 'Pila de 12 V con R1, un LED de 2 V y R2 en serie. En R1 caen 4 V. ¿Cuánto cae en R2? Y si R2 = 1 kΩ, ¿qué corriente pasa?', steps: ['Ley de mallas: <b>12 V = V(R1) + V(LED) + V(R2)</b>', 'Sustituye lo que sabes: 12 = 4 + 2 + V(R2)', 'Despeja: V(R2) = 12 − 4 − 2 = <b>6 V</b>', 'Ohm en R2: I = 6 V / 1000 Ω = <b>6 mA</b>, la misma en toda la malla'], result: '6 V en R2 y 6 mA' },
      Nm('Pila de 9 V con tres resistencias en serie. En la primera caen 2 V y en la segunda 3 V. ¿Cuánto cae en la tercera?', 4, 'V', '9 − 2 − 3 = 4 V.', { c: 'ba_kvl', h: 'Las tres caídas tienen que sumar la pila.' }),
      Nm('En una malla, el punto B está a 9 V y el punto C, después de una resistencia, a 5,5 V (los dos respecto a masa). ¿Cuánto cae en esa resistencia?', 3.5, 'V', '9 − 5,5 = 3,5 V: la caída es la diferencia entre sus extremos.', { c: 'ba_kvl', h: 'La tensión de un componente es la resta entre las tensiones de sus dos extremos.' }),
      G('spKvl'),
      Q('Dos pilas de 1,5 V en serie alimentan dos resistencias iguales en serie. ¿Cuánto cae en cada resistencia?', ['1,5 V', '3 V', '0,75 V', '6 V'], 'Las pilas suman 3 V y las dos resistencias iguales se los reparten a medias.', { c: 'ba_kvl', h: 'Primero cuánto suben las pilas juntas; luego cómo se reparte entre dos iguales.' }),
      G('spKvl'),
      Q('Una pila de 9 V; calculas 6 V en una resistencia y 2 V en un LED, y no hay nada más en el esquema. Al montarlo, el LED brilla menos de lo esperado. ¿Qué sospechas?', ['Hay otra caída que no está en el esquema: una conexión floja o un cable malo', 'Kirchhoff no se cumple en los circuitos reales', 'La pila da más de 9 V', 'El LED necesita 9 V'], 'Las caídas tienen que sumar 9 V. Si falta 1 V, está cayendo en algún sitio que no has dibujado.', { c: 'ba_kvl', h: '6 + 2 no llega a 9. ¿Dónde puede estar el voltio que falta?' }),
      Q('Dos LEDs rojos de 2 V y una resistencia en serie con 9 V. ¿Cuánto queda para la resistencia?', ['5 V', '7 V', '9 V', '4 V'], '9 − 2 − 2 = 5 V.', { c: 'ba_kvl', h: 'Cada LED de la malla se queda sus 2 V.' }),
      RES('Una <b>malla</b> es un camino cerrado.', 'La <b>suma de caídas = la tensión de la pila</b> (Kirchhoff II).', 'Con 0 V en el − de la pila, la caída de un componente es la <b>diferencia</b> entre sus extremos.')
    ]),
    L('d20', 'La resistencia de un LED', 'led', ['ba_ledr', 'ba_kvl'], [
      Q('Quieres encender un LED rojo (se queda unos 2 V) con una pila de 9 V y que pasen unos 15 mA. ¿Qué resistencia crees que necesitas?', ['Unos 470 Ω', 'Unos 47 Ω', 'Unos 4,7 kΩ', 'Ninguna: el LED ya limita'], '(9 − 2) / 0,015 ≈ 467 Ω. Hoy aprendes la receta.', { predict: true, c: 'ba_ledr', h: 'La resistencia se queda lo que no se queda el LED; luego Ohm.' }),
      { t: 'explore', text: 'Un LED con su resistencia. Cambia la fuente, el color del LED y la resistencia. La barra muestra cómo se reparten los voltios.', viz: 'ledRes', params: { Vs: { label: 'Fuente', val: 9, list: [3.3, 5, 9, 12], unit: 'V', dec: 1 }, col: { label: 'Color del LED (0 rojo · 1 verde · 2 azul)', val: 0, list: [0, 1, 2], dec: 0 }, R: pE('Resistencia', 4700, 10, 10000) },
        tasks: [
          { q: 'I', min: 0.01, max: 0.02, text: 'Con 9 V y el LED rojo, consigue entre 10 y 20 mA', done: 'El LED se queda 2 V y la resistencia los 7 V restantes: 7 V / 470 Ω ≈ 15 mA.', hint: 'Baja la resistencia poco a poco mirando la corriente.' },
          { q: 'ok5', min: 1, max: 1, text: 'Cambia la fuente a 5 V y vuelve a dejarlo entre 10 y 20 mA', done: 'Ahora sobran 3 V: (5 − 2) / 0,015 = 200 Ω. La resistencia depende de la fuente.', hint: 'Con menos tensión sobra menos: hace falta menos resistencia.' },
          { q: 'blue33', min: 1, max: 1, text: 'Pon el LED azul a 3,3 V con al menos 5 mA (sin quemarlo)', done: 'Solo sobran 0,3 V: hace falta muy poca resistencia y cualquier variación cambia mucho la corriente. Para azules y blancos, mejor 5 V.', hint: 'El azul se queda 3 V: a la resistencia solo le tocan 0,3 V.' }] },
      I('El LED se queda su tensión (en rojo, unos 2 V) y <b>la resistencia se queda el resto</b> (ley de mallas). Con eso y Ohm:\n<b>R = (Vfuente − VLED) / I</b>', { svg: svgLedSplit, more: 'Recuerda por qué el LED necesita resistencia (lo viste en b20 y c3): por encima de su codo, un poco más de tensión dispara la corriente. Por sí solo no limita nada; quien fija la corriente es la resistencia.' }),
      I('La tensión del LED depende del <b>color</b>, y la corriente la eliges tú: entre 5 y 20 mA (10 mA suele bastar).', { svg: svgLedTabla, more: 'Son valores típicos: la tensión exacta varía entre modelos y con la corriente. Los LEDs de alto brillo lucen mucho con solo 2–5 mA. La mayoría de LEDs normales de 5 mm aguantan unos 20 mA de forma continua; no los lleves al límite.' }),
      I('Casi nunca existe el valor exacto: elige el siguiente <b>hacia arriba</b> (algo menos de corriente, más seguro). Y comprueba la <b>potencia</b> de la resistencia: P = V · I, con margen ×2 (lo viste en c5).', { svg: svgRedondeo, more: 'En la próxima lección verás qué valores se fabrican de verdad (la serie E12). Por ahora, si te sale 467 Ω y tienes 470 Ω, perfecto.' }),
      { t: 'steps', text: 'LED rojo (2 V) con una pila de 9 V a unos 15 mA. ¿Qué resistencia pones y de qué potencia?', steps: ['Lo que se queda la resistencia: 9 V − 2 V = <b>7 V</b>', 'Ohm: R = 7 V / 0,015 A = <b>467 Ω</b>', 'Redondea hacia arriba: <b>470 Ω</b>', 'Corriente real: 7 V / 470 Ω ≈ <b>14,9 mA</b>', 'Potencia: P = 7 V × 0,0149 A ≈ <b>0,10 W</b>; con margen ×2, 0,2 W: una de ¼ W vale'], result: '470 Ω de ¼ W' },
      Nm('5 V, LED rojo (2 V) y 10 mA. ¿Qué resistencia necesitas, en Ω?', 300, 'Ω', '(5 − 2) / 0,01 = 300 Ω.', { c: 'ba_ledr', h: 'Resta los 2 V del LED y divide entre 0,01 A.' }),
      Nm('12 V, LED verde (2,2 V) y 20 mA. ¿Resistencia en Ω?', 490, 'Ω', '(12 − 2,2) / 0,02 = 490 Ω.', { c: 'ba_ledr', tol: 2, h: '20 mA son 0,02 A; no olvides restar la tensión del LED.' }),
      Q('¿Por qué se redondea la resistencia de un LED hacia arriba y no hacia abajo?', ['Más resistencia da algo menos de corriente: el LED queda protegido', 'Porque los valores altos son más baratos', 'Porque así brilla más', 'Da igual hacia dónde'], 'Un poco menos de corriente casi no se nota en el brillo; un poco más acorta la vida del LED.', { c: 'ba_ledr', h: '¿Qué pasa con la corriente si la resistencia es un poco mayor?' }),
      G('spLedR'),
      Nm('Dos LEDs rojos (2 V cada uno) en serie con 9 V y 15 mA. ¿Qué resistencia, en Ω?', 333, 'Ω', '(9 − 4) / 0,015 ≈ 333 Ω. Con LEDs en serie se restan todas sus tensiones.', { c: 'ba_ledr', tol: 3, h: 'Resta las tensiones de los dos LEDs antes de dividir.' }),
      Q('Un LED rojo a 20 mA con una fuente de 24 V necesita 1,1 kΩ. ¿De qué potencia eliges la resistencia?', ['1 W: disipa 0,44 W y conviene el doble', '¼ W', '½ W justa', '5 W'], 'P = 22 V × 0,02 A = 0,44 W. Con margen ×2, casi 0,9 W: una de 1 W.', { c: 'ba_prating', h: 'Calcula P = V · I con la tensión que se queda la resistencia y deja margen ×2.' }),
      G('spLedR'),
      Q('Quieres alimentar un LED blanco (unos 3 V) con 3,3 V. ¿Qué problema tiene?', ['Sobra tan poca tensión que la corriente cambia muchísimo con pequeñas variaciones', 'Ninguno: es lo ideal', 'El LED se quema siempre', 'No se puede poner resistencia'], 'A la resistencia solo le tocan 0,3 V: cualquier variación del LED o de la fuente cambia mucho la corriente.', { c: 'ba_ledr', h: 'Calcula cuánto le queda a la resistencia.' }),
      RES('El LED se queda su tensión (rojo ≈ 2 V, azul/blanco ≈ 3 V); la resistencia, el resto.', '<b>R = (Vfuente − VLED) / I</b>, con I entre 5 y 20 mA.', 'Redondea <b>hacia arriba</b> y comprueba la <b>potencia</b> (P = V · I, margen ×2).')
    ]),
    L('g1', 'Resistencias reales', 'res', ['ba_eseries', 'ba_bands', 'ba_code3'], [
      Q('Te sale 467 Ω para un LED. En una tienda de electrónica, ¿encontrarás una resistencia de 467 Ω?', ['No: solo se fabrican ciertos valores; tomarás 470 Ω', 'Sí, hay de cualquier valor', 'Solo por encargo, a mano', 'Sí, pero solo de 1 W'], 'Las resistencias se fabrican en series de valores normalizados. Vamos a conocerlas.', { predict: true, c: 'ba_eseries', h: 'Piensa en si sería práctico fabricar todos los valores posibles.' }),
      I('Las resistencias se fabrican en <b>series normalizadas</b>. La más común, <b>E12</b>, tiene 12 valores por década:\n<b>10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82</b> (y × 10, × 100, × 1000…).', { svg: SV(90, `<path d="M15 50H285" stroke="var(--muted)"/>${E12B.map((v, i) => { const x = 15 + 270 * Math.log10(v / 10); return `<path d="M${x.toFixed(1)} 42V58" stroke="var(--led)" stroke-width="3" class="a-fade a-d${(i % 4) + 1}"/>${tx(x.toFixed(1), i % 2 ? 76 : 34, v, 'vizsm', mid)}`; }).join('')}${tx(285, 34, '100', 'vizsm', end)}`), more: 'Cada valor es más o menos un 20 % mayor que el anterior, de modo que con la tolerancia de fábrica (lo verás en d21) se cubre todo el camino de 10 a 100 sin huecos.\nHay series más finas: E24 (24 valores por década, típica en resistencias del 5 % y 1 %), E96… Y una más gruesa, E6, para piezas baratas.' }),
      { t: 'explore', text: 'Las resistencias de patas llevan su valor pintado en <b>bandas de colores</b>. Mueve las tres bandas y mira qué valor sale.', viz: 'colorRes', params: { d1: { label: '1.ª banda (cifra)', val: 1, list: [1, 2, 3, 4, 5, 6, 7, 8, 9], dec: 0 }, d2: { label: '2.ª banda (cifra)', val: 0, list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], dec: 0 }, m: { label: '3.ª banda (n.º de ceros)', val: 0, list: [0, 1, 2, 3, 4, 5, 6], dec: 0 } },
        tasks: [
          { q: 'R', min: 999, max: 1001, text: 'Pinta 1 kΩ', done: 'Marrón (1), negro (0) y rojo (2 ceros): 1000 Ω.', hint: '1 kΩ = 1000 Ω = «10» y dos ceros.' },
          { q: 'R', min: 4699, max: 4701, text: 'Ahora 4,7 kΩ', done: 'Amarillo (4), violeta (7), rojo (2 ceros): 4700 Ω.', hint: '4700 = «47» y dos ceros.' },
          { q: 'R', min: 469, max: 471, text: 'Y ahora 470 Ω, tocando una sola banda', done: 'Solo cambia la tercera: de dos ceros a uno. La tercera banda es un multiplicador.', hint: 'Las cifras son las mismas: 4 y 7. ¿Cuántos ceros quedan?' }] },
      I('<b>Código de colores</b>: cada color es una cifra. Las dos primeras bandas son cifras; la tercera, <b>cuántos ceros</b>. La cuarta, separada, es la tolerancia (dorada ±5 %): empieza a leer por el otro lado.', { svg: SV(70, `${BANDHEX.map((c, i) => `<rect x="${8 + i * 29}" y="8" width="25" height="30" rx="4" fill="${c}" stroke="#999"/>${tx(20 + i * 29, 56, i, 'vizlab', mid)}`).join('')}`), more: 'Truco: del oscuro al claro pasando por el arcoíris: negro, marrón, rojo, naranja, amarillo, verde, azul, violeta, gris y blanco.\nLas resistencias de precisión (1 %) llevan cinco bandas: tres cifras, el multiplicador y la tolerancia (marrón = ±1 %).\nSi dudas entre dos colores parecidos (rojo y naranja, marrón y rojo), lo comprobarás midiendo en el siguiente módulo.' }),
      { t: 'steps', text: 'Una resistencia tiene las bandas amarillo, violeta, rojo y dorado. ¿Cuánto vale?', steps: ['La dorada va al final: empieza por el otro lado', 'Amarillo = <b>4</b>, violeta = <b>7</b> → «47»', 'Rojo = 2 → añade <b>dos ceros</b>: 4700 Ω', 'En kΩ: <b>4,7 kΩ</b>; la dorada dice ±5 %'], result: '4,7 kΩ ±5 %' },
      G('spColorRead'),
      { t: 'bands', q: 'Pinta las bandas de 470 Ω.', target: 470, e: 'Amarillo (4), violeta (7), marrón (1 cero).', c: 'ba_bands', h: '470 = «47» y un cero.' },
      G('spColorRead'),
      I('Las resistencias <b>SMD</b> (de montaje superficial, sin patas) son diminutas y llevan números: <b>472</b> = 47 y dos ceros = 4,7 kΩ. La <b>R</b> hace de coma: <b>4R7</b> = 4,7 Ω.', { svg: SV(100, `<rect x="40" y="25" width="90" height="40" rx="4" fill="#222"/><rect x="32" y="25" width="10" height="40" fill="#bbb"/><rect x="128" y="25" width="10" height="40" fill="#bbb"/>${tx(85, 52, '472', 'vizbig', mid + ' style="fill:#eee;font-size:18px"')}${tx(85, 86, '4,7 kΩ', 'vizlab', mid)}
          <rect x="170" y="25" width="90" height="40" rx="4" fill="#222"/><rect x="162" y="25" width="10" height="40" fill="#bbb"/><rect x="258" y="25" width="10" height="40" fill="#bbb"/>${tx(215, 52, '4R7', 'vizbig', mid + ' style="fill:#eee;font-size:18px"')}${tx(215, 86, '4,7 Ω', 'vizlab', mid)}`), more: 'Tipos de resistencia: de <b>carbón</b> (baratas, ±5 %), de <b>película metálica</b> (±1 %, menos ruido: las más habituales hoy), <b>bobinadas</b> (hilo enrollado, para varios vatios) y <b>SMD</b> (para placas pequeñas).\nLas SMD de precisión usan cuatro cifras: 4702 = 470 y dos ceros = 47 kΩ.' }),
      Q('Una resistencia SMD pone «472». ¿Cuánto vale?', ['4,7 kΩ', '472 Ω', '47 kΩ', '4,72 Ω'], '47 y dos ceros: 4700 Ω.', { c: 'ba_code3', h: 'Igual que las bandas: dos cifras y luego cuántos ceros.' }),
      Q('Una resistencia SMD pone «100». ¿Cuánto vale?', ['10 Ω', '100 Ω', '1 kΩ', '1 Ω'], '10 y cero ceros: 10 Ω. Ojo, no son 100 Ω.', { c: 'ba_code3', h: 'La última cifra es la cantidad de ceros: aquí, ninguno.' }),
      G('spESeries'),
      { t: 'match', q: 'Une cada color con su cifra.', pairs: [['Marrón', '1'], ['Rojo', '2'], ['Naranja', '3'], ['Amarillo', '4'], ['Violeta', '7']], c: 'ba_bands', h: 'Recuerda el orden: negro, marrón, rojo, naranja, amarillo, verde, azul, violeta…' },
      Q('¿Cuál de estos valores pertenece a la serie E12?', ['390 Ω', '400 Ω', '350 Ω', '450 Ω'], '39 × 10 = 390. Los otros no existen en E12.', { c: 'ba_eseries', h: 'Busca un valor cuyas dos primeras cifras estén en la lista 10, 12, 15, 18, 22, 27, 33, 39, 47…' }),
      RES('Solo se fabrican valores normalizados: <b>E12</b> = 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 (× 10ⁿ).', '<b>Colores</b>: dos cifras y una banda de ceros; la dorada (±5 %) va al final.', '<b>SMD</b>: 472 = 4,7 kΩ; la R es la coma (4R7 = 4,7 Ω).')
    ]),
    L('d21', 'Tolerancia: cuánto se aleja lo real', 'res', ['ba_tolband', 'ba_tolcur'], [
      Q('Compras diez resistencias de 1 kΩ con banda dorada. Si pudieras medirlas con mucha precisión, ¿qué verías?', ['Valores distintos, todos entre 950 y 1050 Ω', 'Todas exactamente 1000 Ω', 'Valores entre 0 y 2000 Ω', 'Todas 1050 Ω'], 'Ninguna pieza es perfecta: la banda dorada promete que cada una está a menos de un 5 % de 1 kΩ.', { predict: true, c: 'ba_tolband', h: 'La banda dorada significa ±5 %. ¿Qué es el 5 % de 1000?' }),
      { t: 'explore', text: 'Los puntos son diez resistencias reales del mismo valor nominal. Abajo ves qué corriente daría cada una con la pila.', viz: 'tolBand', params: { R: pE('Valor nominal', 1000), tol: { label: 'Tolerancia', val: 10, list: [1, 5, 10], unit: '%', dec: 0 }, V: { label: 'Pila', val: 5, list: [5, 9, 12], unit: 'V', dec: 0 } },
        tasks: [
          { q: 'spread', min: 0, max: 0.00025, text: 'Consigue que la corriente varíe menos de 0,25 mA', done: 'Con ±1 % el intervalo es diez veces más estrecho que con ±10 %.', hint: 'Prueba la tolerancia más pequeña.' },
          { q: 'Rw', min: 990, max: 1010, text: 'Consigue un intervalo de resistencia de 1 kΩ de ancho', done: '10 kΩ ±5 %: 500 Ω por debajo y 500 por encima, 1 kΩ de ancho en total.', hint: 'El ancho es dos veces el porcentaje del nominal. Prueba un nominal grande con ±5 %.' },
          { q: 'ok95', min: 1, max: 1, text: 'Con 9 V y 1 kΩ, elige una tolerancia que asegure no pasar de 9,5 mA', done: 'Con ±5 %, el peor caso es 950 Ω: 9 / 950 = 9,47 mA. Con ±10 % podrías llegar a 10 mA.', hint: 'Pon 9 V y 1 kΩ, y mira la corriente máxima con cada tolerancia.' }] },
      I('La <b>tolerancia</b> dice cuánto puede apartarse una pieza de su valor nominal: <b>±5 %</b> (banda dorada), <b>±10 %</b> (plateada), <b>±1 %</b> (marrón).\nCalcula el porcentaje (a4) y réstalo y súmalo: 1 kΩ ±5 % → <b>950 a 1050 Ω</b>.', { svg: svgTol, more: 'El fabricante garantiza que cada pieza está dentro del intervalo, no que esté en el centro. Hoy las de película metálica del 1 % cuestan casi lo mismo que las del 5 %.\nLa tolerancia también existe en condensadores, pilas, LEDs… y en los instrumentos de medida.' }),
      I('La tolerancia <b>se arrastra al resultado</b>: si R puede variar un ±5 %, la corriente que calcules con ella también, más o menos ±5 %. El peor caso por arriba sale con la resistencia <b>más baja</b>.', { tune: { viz: 'tolBand', params: { R: pE('Nominal', 1000), tol: { label: 'Tolerancia', val: 5, list: [1, 5, 10], unit: '%', dec: 0 }, V: { label: 'Pila', val: 9, list: [5, 9, 12], unit: 'V', dec: 0 } } } }),
      I('Por eso <b>no tiene sentido dar muchas cifras</b> (a7): con datos del 5 %, el resultado vale con 2 o 3 cifras. «Unos 9 mA» es honesto; «9,000 mA», no.', { svg: svgCifras }),
      { t: 'steps', text: '1 kΩ ±5 % con una pila de 9 V. ¿Entre qué corrientes puede estar?', steps: ['5 % de 1000 Ω = <b>50 Ω</b>', 'La resistencia está entre <b>950 y 1050 Ω</b>', 'Corriente máxima (con la mínima R): 9 / 950 = <b>9,47 mA</b>', 'Corriente mínima (con la máxima R): 9 / 1050 = <b>8,57 mA</b>', 'Redondea con sentido: entre <b>8,6 y 9,5 mA</b> (nominal 9 mA)'], result: 'Entre unos 8,6 y 9,5 mA' },
      G('spTol'),
      Nm('Una resistencia de 470 Ω ±10 %. ¿Cuál es su valor máximo posible, en Ω?', 517, 'Ω', '10 % de 470 = 47 Ω; 470 + 47 = 517 Ω.', { c: 'ba_tolband', h: 'Calcula el 10 % de 470 y súmalo.' }),
      Nm('Una resistencia de 2,2 kΩ ±1 %. ¿Cuántos ohmios puede apartarse como mucho del nominal?', 22, 'Ω', '1 % de 2200 = 22 Ω.', { c: 'ba_tolband', h: 'Pasa 2,2 kΩ a ohmios y calcula el 1 %.' }),
      Q('Calculas 6 mA con una resistencia de ±5 %. ¿Qué intervalo es realista?', ['Entre unos 5,7 y 6,3 mA', 'Exactamente 6,000 mA', 'Entre 1 y 11 mA', 'Entre 5,99 y 6,01 mA'], '5 % de 6 mA = 0,3 mA.', { c: 'ba_tolcur', h: 'La corriente hereda más o menos el mismo porcentaje que la resistencia.' }),
      G('spTolCur'),
      Q('La calculadora da 9 V / 470 Ω = 0,019148936 A, y la resistencia es de ±5 %. ¿Cómo lo escribes?', ['Unos 19 mA', '19,148936 mA', '0,019148936 A exactos', '20 A'], 'Con un 5 % de incertidumbre, dos cifras: unos 19 mA.', { c: 'ba_sigfig', h: '¿De cuántas cifras te puedes fiar si el dato varía un 5 %?' }),
      Q('Una resistencia de 10 kΩ con banda dorada. ¿Qué valor es imposible para ella?', ['11 kΩ', '9,6 kΩ', '10,4 kΩ', '10 kΩ'], 'Con ±5 % va de 9,5 a 10,5 kΩ.', { c: 'ba_tolband', h: 'Calcula el intervalo y mira qué valor se sale.' }),
      RES('<b>Tolerancia</b>: ±1 % (marrón), ±5 % (dorada), ±10 % (plateada).', 'Intervalo: nominal <b>± el porcentaje</b>; cada pieza cae en algún punto.', 'El resultado <b>hereda</b> la tolerancia: da solo 2 o 3 cifras.')
    ]),
    SIM('s1', 'Reto: enciende un LED', 'Enciende un LED con la pila de 9 V, entre 5 y 25 mA, sin quemarlo.', { battery: 9, parts: ['res', 'led'], hint: 'Del + a una resistencia (unos 470 Ω), luego el LED y vuelta al −. Ánodo hacia el +.' }, 'ledOn'),
    L('a5', 'Inversos y la fórmula del paralelo', 'series', ['ba_inverse', 'parallel'], [
      Q('¿Cuánto crees que vale 1 / 0,5?', ['2', '0,5', '0,2', '5'], '¿Cuántas mitades caben en 1? Dos. Dividir entre un número pequeño da un número grande.', { predict: true, c: 'ba_inverse', h: 'Piensa cuántas veces cabe 0,5 en 1.' }),
      I('El <b>inverso</b> de un número es 1 dividido entre él: el de 4 es <b>0,25</b>; el de 0,5 es <b>2</b>. Un número grande tiene un inverso pequeño, y al revés.', { svg: svgInv, more: 'Si haces el inverso dos veces, vuelves al número de partida: el inverso de 0,25 es 4.\nEn la calculadora suele haber una tecla 1/x o x⁻¹.' }),
      I('En paralelo, cada rama es un camino más. Lo que se suma no son las resistencias, sino sus <b>facilidades de paso</b>, que son los inversos:\n<b>1/Rt = 1/R1 + 1/R2 + …</b>\nY al final das la vuelta: Rt = 1 / (la suma).', { tune: { viz: 'inverse', params: { R1: pE('R1', 1000, 10, 10000), R2: pE('R2', 1000, 10, 10000) } }, more: 'A 1/R se le llama conductancia y se mide en siemens (S). No hace falta que lo recuerdes: basta con la idea de «facilidad de paso».\nEl porqué físico (misma tensión y corrientes que se suman) lo verás en la siguiente lección.' }),
      { t: 'explore', text: 'Dos resistencias en paralelo. Las barras son sus inversos; el resultado es 1 / (la suma).', viz: 'inverse', params: { R1: pE('R1', 1000, 10, 10000), R2: pE('R2', 470, 10, 10000) },
        tasks: [
          { q: 'Req', min: 49, max: 51, text: 'Consigue un total de 50 Ω', done: '100 Ω ‖ 100 Ω: 1/100 + 1/100 = 0,02 → 1 / 0,02 = 50 Ω.', hint: 'Prueba dos resistencias iguales de 100 Ω.' },
          { q: 'small', min: 1, max: 1, text: 'Con R1 = 1 kΩ, consigue un total por debajo de 100 Ω', done: 'La pequeña manda: el total siempre queda por debajo de la menor.', hint: 'Pon R1 en 1 kΩ y baja R2 hasta unos 100 Ω.' },
          { q: 'half', min: 1, max: 1, text: 'Haz que el total sea justo la mitad de R1', done: 'Dos iguales en paralelo dan la mitad; tres iguales, un tercio.', hint: '¿Qué tiene que valer R2 para que las dos faciliten el paso lo mismo?' }] },
      { t: 'steps', text: '100 Ω en paralelo con 100 Ω. ¿Total?', steps: ['Inversos: 1/100 = <b>0,01</b> cada una', 'Súmalos: 0,01 + 0,01 = <b>0,02</b> (esto es 1/Rt)', 'Da la vuelta: Rt = 1 / 0,02 = <b>50 Ω</b>', 'Comprueba: 50 Ω es menor que la menor (100 Ω) ✓'], result: '50 Ω' },
      I('Dos atajos:\n· Con dos: <b>Rt = (R1 × R2) / (R1 + R2)</b>, «producto partido por suma».\n· Con n iguales: <b>Rt = R / n</b>.', { svg: SV(110, `${tx(150, 30, '600 Ω ‖ 300 Ω', 'vizlab', mid)}${tx(150, 58, '600 × 300 = 180 000', 'vizsm', mid)}${tx(150, 76, '600 + 300 = 900', 'vizsm', mid)}<path d="M80 64H220" stroke="currentColor"/>${tx(150, 102, '180 000 / 900 = 200 Ω', 'vizbig', mid)}`), more: 'El atajo de dos sale de la fórmula de los inversos: 1/R1 + 1/R2 = (R1 + R2) / (R1 · R2), y al dar la vuelta queda R1 · R2 / (R1 + R2).\nCon tres o más distintas, usa los inversos o ve juntándolas de dos en dos.' }),
      Q('¿Cuál es el inverso de 0,25?', ['4', '0,25', '−0,25', '2,5'], '1 / 0,25 = 4.', { c: 'ba_inverse', h: '¿Cuántas veces cabe 0,25 en 1?' }),
      Nm('1/Rt = 1/200 + 1/200. ¿Cuánto vale Rt, en Ω?', 100, 'Ω', '0,005 + 0,005 = 0,01; 1 / 0,01 = 100 Ω.', { c: 'ba_inverse', h: 'Suma los inversos y no olvides dar la vuelta al final.' }),
      G('spPar2'),
      Nm('1 kΩ en paralelo con 4 kΩ. ¿Total en Ω?', 800, 'Ω', '(1000 × 4000) / 5000 = 800 Ω.', { c: 'parallel', h: 'Producto partido por suma, todo en ohmios.' }),
      G('spParN'),
      Q('¿Por qué el total en paralelo es siempre menor que la resistencia más pequeña?', ['Cada rama añade un camino más para la corriente', 'Porque las resistencias se restan', 'Porque se pierde tensión', 'No siempre lo es'], 'Más caminos, más facilidad: el total baja.', { c: 'parallel', h: 'Piensa en abrir un carril más en una carretera.' }),
      G('spPar2'),
      RES('Inverso: <b>1/x</b>. Grande ↔ pequeño.', 'Paralelo: <b>1/Rt = 1/R1 + 1/R2</b> y luego das la vuelta.', 'Atajos: <b>producto / suma</b> con dos; <b>R / n</b> con n iguales. El total, siempre menor que la menor.')
    ]),
    L('d2', 'Circuitos en paralelo', 'series', ['ba_partension', 'ba_curdiv', 'parallel'], [
      Q('En casa tienes la tele encendida y enciendes además la lámpara del salón. ¿Qué le pasa a la tele?', ['Nada: sigue igual', 'Se ve más oscura', 'Se apaga', 'Se ve más brillante'], 'Los enchufes están en paralelo: cada aparato recibe la misma tensión y funciona por su cuenta.', { predict: true, c: 'ba_partension', h: 'Si encender una lámpara afectara a la tele, ¿te lo habrías notado alguna vez?' }),
      { t: 'explore', text: 'Dos resistencias <b>en paralelo</b> con una pila de 9 V. Cada rama tiene su propio camino.', viz: 'parRatio', params: { V: { ...pV(9, 1, 9), fixed: true }, R1: pE('R1', 1000), R2: pE('R2', 2200) },
        tasks: [
          { q: 'I2', min: 0.0089, max: 0.0091, text: 'Haz que por R2 pase lo mismo que por R1 (9 mA)', done: 'Misma tensión y misma resistencia → misma corriente.', hint: 'Pon R2 igual que R1.' },
          { q: 'It', min: 0.03, max: 1, text: 'Consigue que salgan más de 30 mA de la pila', done: 'Cada rama añade su corriente: lo que sale de la pila es la suma.', hint: 'Baja las dos resistencias.' },
          { q: 'ratio', min: 1.9, max: 2.1, text: 'Haz que por R1 pase el doble que por R2', done: 'Mitad de resistencia, doble de corriente: I = V / R en cada rama.', hint: 'R2 tiene que valer el doble que R1 (por ejemplo 330 Ω y 680 Ω).' }] },
      I('En <b>paralelo</b> todos los componentes cuelgan de los <b>mismos dos puntos</b>: todos tienen la <b>misma tensión</b>, la de la pila.', { svg: svgPar, more: 'Para reconocer un paralelo en un esquema, mira los dos extremos de cada componente: si van a los mismos dos nudos, están en paralelo, aunque el dibujo los ponga lejos.\nLos enchufes de casa, las luces de un coche y las regletas están en paralelo: cada aparato funciona aunque desconectes otro.' }),
      I('La corriente <b>se reparte</b>: cada rama lleva <b>I = V / R</b> (más por la de menor resistencia) y la pila da <b>la suma</b> de todas. Añadir una rama no cambia las demás: solo sube el total.', { tune: { viz: 'parallel', params: { V: pV(9, 1, 9), R1: pE('R1', 1000), R2: pE('R2', 2200) } } }),
      I('Con la corriente total puedes sacar la resistencia equivalente: <b>Req = V / Itotal</b>. Sale lo mismo que con la fórmula de a5, y siempre menor que la menor.', { svg: SV(90, `${tx(150, 30, '9 V / 13,5 mA = 667 Ω', 'vizbig', mid)}${tx(150, 56, '(1000 × 2000) / 3000 = 667 Ω ✓', 'vizlab', mid)}${tx(150, 80, 'Dos caminos frenan menos que uno solo', 'vizsm', mid)}`) }),
      { t: 'steps', text: '9 V con 1 kΩ y 2 kΩ en paralelo. ¿Corrientes y resistencia equivalente?', steps: ['Cada rama tiene <b>9 V</b>', 'Rama de 1 kΩ: 9 / 1000 = <b>9 mA</b>', 'Rama de 2 kΩ: 9 / 2000 = <b>4,5 mA</b>', 'De la pila sale la suma: <b>13,5 mA</b>', 'Equivalente: 9 V / 0,0135 A = <b>667 Ω</b> (menor que 1 kΩ ✓)'], result: '9 mA + 4,5 mA = 13,5 mA; Req ≈ 667 Ω' },
      Q('Dos resistencias distintas en paralelo con una pila de 6 V. ¿Qué tensión tiene la de 100 Ω?', ['6 V', '3 V', 'Depende de la otra', '0,06 V'], 'En paralelo todas tienen la tensión de la pila.', { c: 'ba_partension', h: '¿A qué dos puntos está conectada?' }),
      Nm('12 V con 1 kΩ y 3 kΩ en paralelo. ¿Corriente total que sale de la pila, en mA?', 16, 'mA', '12 mA + 4 mA = 16 mA.', { c: 'ba_curdiv', h: 'Ohm en cada rama con los 12 V, y luego suma.' }),
      G('spParBranch'),
      { t: 'pick', q: '¿Cuál tiene las resistencias en paralelo?', o: ['parallel2', 'series3', 'divider'], a: 0, e: 'Las dos resistencias van a los mismos dos nudos.', c: 'ba_partension', h: 'Busca el esquema en el que las dos resistencias comparten sus dos extremos.' },
      G('spParMC'),
      Q('¿Por qué los enchufes de casa están en paralelo?', ['Para que todos reciban la misma tensión y funcionen por separado', 'Para ahorrar cable', 'Para que todos lleven la misma corriente', 'Por casualidad'], 'Desenchufar uno no afecta a los demás.', { c: 'ba_partension', h: 'Piensa en qué pasaría si estuvieran en serie.' }),
      Q('A un paralelo de dos ramas conectado a una pila le añades una tercera rama. ¿Qué pasa con la corriente de las otras dos?', ['No cambia; solo aumenta el total que da la pila', 'Baja, porque se reparte entre tres', 'Sube', 'Se reparte a tercios'], 'Cada rama sigue teniendo la tensión de la pila y su propia resistencia.', { c: 'ba_curdiv', h: '¿Cambia la tensión de las otras ramas al añadir una?' }),
      G('spParBranch'),
      RES('En paralelo, <b>misma tensión</b> en todas las ramas.', 'Cada rama lleva <b>I = V / R</b>; la pila da <b>la suma</b>.', 'El equivalente (V / Itotal) es <b>menor que la menor</b>.')
    ]),
    L('d4', 'Ley de nudos (Kirchhoff I)', 'node', ['kcl'], [
      Q('Por un cable llegan 30 mA a un punto donde se divide en dos. Por una de las salidas van 10 mA. ¿Cuánto va por la otra?', ['20 mA', '30 mA', '40 mA', '10 mA'], 'La carga no se acumula en el punto ni desaparece: lo que entra sale.', { predict: true, c: 'kcl', h: 'Si entran 30 y salen 10 por un lado, ¿dónde está el resto?' }),
      { t: 'explore', text: 'Un <b>nudo</b> con dos corrientes que entran y dos que salen. Tú controlas I1, I2 e I3; I4 es la que queda.', viz: 'nodeSplit', params: { I1: { label: 'I1 (entra)', val: 0.02, min: 0, max: 0.04, step: 0.001, fmt: 'mA' }, I2: { label: 'I2 (entra)', val: 0.01, min: 0, max: 0.04, step: 0.001, fmt: 'mA' }, I3: { label: 'I3 (sale)', val: 0.01, min: 0, max: 0.06, step: 0.001, fmt: 'mA' } },
        tasks: [
          { q: 'I4', min: -0.0005, max: 0.0005, text: 'Haz que por la cuarta rama no pase nada', done: 'Si todo lo que entra ya sale por I3, a I4 no le queda nada.', hint: 'Sube I3 hasta igualar lo que entra.' },
          { q: 'I4', min: -0.0055, max: -0.0045, text: 'Ahora haz que I4 valga −5 mA', done: 'Un signo menos solo dice que esa corriente va al revés de como la dibujaste: por I4 entran 5 mA.', hint: 'Haz que salga por I3 más de lo que entra por I1 e I2.' },
          { q: 'eq', min: 1, max: 1, text: 'Deja entrar 40 mA en total y que salgan a medias', done: '40 mA entran, 20 + 20 salen. Siempre cuadra.', hint: 'I1 + I2 = 40 mA, e I3 = 20 mA.' }] },
      I('Un <b>nudo</b> es un punto donde se unen tres o más cables. <b>Ley de nudos</b> (primera de Kirchhoff): <b>lo que entra es igual a lo que sale</b>.', { svg: svgNudo, more: 'Es la conservación de la carga (b1): los electrones no se crean ni se destruyen, y en un punto de cable no se pueden acumular. Como el agua en un cruce de tuberías.' }),
      I('Al plantearlo dibujas cada corriente con una flecha, a tu elección. Si al calcular una te sale <b>negativa</b>, no hay error: va <b>al revés</b> de como la dibujaste.', { svg: svgSigno }),
      I('En un paralelo hay dos nudos: arriba la corriente de la pila se <b>divide</b> en las ramas y abajo se <b>vuelve a juntar</b>. Por eso la pila da la suma de las ramas.', { tune: { viz: 'parallel', params: { V: pV(9, 1, 9), R1: pE('R1', 1000), R2: pE('R2', 2200) } } }),
      { t: 'steps', text: 'A un nudo llegan 15 mA y 25 mA. Salen dos ramas; por una van 30 mA. ¿Y por la otra?', steps: ['Lo que entra: 15 + 25 = <b>40 mA</b>', 'Lo que sale tiene que sumar lo mismo: 30 + x = 40', 'Despeja: x = <b>10 mA</b>, saliendo'], result: '10 mA' },
      Nm('Entran 50 mA en un nudo y salen 20 mA por una rama y 20 mA por otra. ¿Cuánto sale por la tercera?', 10, 'mA', '50 − 20 − 20 = 10 mA.', { c: 'kcl', h: 'Resta de lo que entra todo lo que ya sabes que sale.' }),
      G('spKcl'),
      Q('Una corriente calculada te sale negativa. Significa…', ['Que va en sentido contrario al que supusiste', 'Que hay un error seguro', 'Que no hay corriente', 'Que esa rama genera energía'], 'El signo solo indica el sentido.', { c: 'kcl', h: '¿Elegiste tú el sentido de la flecha al dibujarla?' }),
      Q('En un nudo entran 12 mA por A. Por B salen 5 mA y por C salen 9 mA. ¿Qué pasa en la rama D?', ['Entran 2 mA por D', 'Salen 2 mA por D', 'Salen 26 mA por D', 'No pasa nada por D'], 'Salen 14 mA y solo entran 12: por D tienen que entrar los 2 que faltan.', { c: 'kcl', h: 'Compara lo que sale con lo que entra por A: ¿sobra o falta?' }),
      G('spKcl'),
      Q('Un paralelo de 9 V tiene dos ramas: una lleva 9 mA y la otra 4,5 mA. ¿Qué corriente sale de la pila?', ['13,5 mA', '9 mA', '4,5 mA', '4,5 mA (la diferencia)'], 'En el nudo de arriba la corriente de la pila se divide en las dos ramas: es su suma.', { c: 'kcl', h: 'La corriente de la pila llega a un nudo y se reparte en las ramas.' }),
      RES('<b>Nudo</b>: punto donde se unen tres o más cables.', '<b>Lo que entra = lo que sale</b> (Kirchhoff I).', 'Una corriente <b>negativa</b> va al revés de como la dibujaste.')
    ]),
    SIM('s2b', 'Reto: dos LEDs en paralelo', 'Enciende dos LEDs en paralelo, cada uno entre 5 y 25 mA.', { battery: 9, parts: ['res', 'led'], hint: 'Cada LED con su propia resistencia: dos ramas iguales entre + y −.' }, 'twoLeds'),
    L('d3', 'Circuitos mixtos', 'series', ['ba_mixed', 'ba_curdiv'], [
      Q('Una resistencia de 400 Ω en serie con dos de 200 Ω que están en paralelo entre sí. ¿Total?', ['500 Ω', '800 Ω', '133 Ω', '600 Ω'], 'Primero el paralelo (200 ‖ 200 = 100 Ω) y luego la serie: 400 + 100 = 500 Ω.', { predict: true, c: 'ba_mixed', h: '¿Qué grupo puedes simplificar primero?' }),
      { t: 'explore', text: 'R1 está en serie con el bloque R2 ‖ R3. Mira cómo cambian el total y las corrientes.', viz: 'mixed', params: { V: { ...pV(12), fixed: true }, R1: pE('R1 (serie)', 470), R2: pE('R2', 1000), R3: pE('R3', 1000, 100, 1e6) },
        tasks: [
          { q: 'Req', min: 490, max: 510, text: 'Consigue un total de 500 Ω', done: 'Por ejemplo 390 Ω + (220 ‖ 220 = 110 Ω): primero el paralelo, luego la serie.', hint: 'Elige un paralelo de dos iguales (la mitad de una) y súmale R1.' },
          { q: 'half', min: 1, max: 1, text: 'Haz que R1 se quede justo la mitad de la tensión (6 V)', done: 'R1 y el bloque en paralelo están en serie: se reparten la tensión como en d1. Si valen lo mismo, mitad y mitad.', hint: 'R1 tiene que valer lo mismo que el bloque R2 ‖ R3.' },
          { q: 'R3big', min: 1, max: 1, text: 'Sube R3 al máximo y mira qué le pasa al total', done: 'Una rama de resistencia enorme casi no lleva corriente: es como si no estuviera, y el total es casi R1 + R2.', hint: 'Lleva R3 hacia 1 MΩ.' }] },
      I('Los circuitos reales mezclan serie y paralelo. Método: <b>reduce por partes</b>. Busca un grupo claramente en serie o en paralelo, sustitúyelo por su equivalente y repite hasta que quede una sola resistencia.', { svg: svgReduce, more: 'Empieza por lo más «interior»: dos resistencias que comparten sus dos nudos (paralelo) o que van una detrás de otra sin nada que salga en medio (serie). Si un nudo entre dos resistencias tiene una tercera conexión, ya no están en serie.' }),
      I('Con el total sacas la corriente de la pila. Después <b>deshaces el camino</b>: esa corriente cruza R1 (serie) y se reparte en el paralelo. La tensión del paralelo es lo que queda tras R1 (ley de mallas).', { tune: { viz: 'mixed', params: { V: { ...pV(10), fixed: true }, R1: pE('R1', 390), R2: pE('R2', 220), R3: pE('R3', 220, 100, 1e6) } } }),
      { t: 'steps', text: '400 Ω en serie con (200 Ω ‖ 200 Ω), con 10 V. ¿Corrientes y tensiones?', steps: ['Paralelo: 200 ‖ 200 = <b>100 Ω</b>', 'Total: 400 + 100 = <b>500 Ω</b>', 'Corriente de la pila: 10 V / 500 Ω = <b>20 mA</b>', 'En R1: 0,02 × 400 = <b>8 V</b>; al paralelo le quedan 10 − 8 = <b>2 V</b>', 'Cada rama de 200 Ω: 2 V / 200 Ω = <b>10 mA</b> (10 + 10 = 20 ✓)'], result: '20 mA de la pila y 10 mA por cada rama' },
      I('<b>Divisor de corriente</b>: con dos ramas, la corriente que entra se reparte al revés que las resistencias:\n<b>I1 = I · R2 / (R1 + R2)</b>\n(arriba va la <b>otra</b> resistencia).', { svg: SV(110, `<path d="M20 55H90" stroke="var(--led)" stroke-width="5" class="a-flow"/><path d="M90 55Q130 20 270 25" fill="none" stroke="var(--led)" stroke-width="4" class="a-flow"/><path d="M90 55Q130 90 270 85" fill="none" stroke="var(--led)" stroke-width="2" class="a-flow"/>${tx(20, 46, '30 mA', 'vizlab')}${tx(270, 18, 'R1 1 kΩ: 20 mA', 'vizlab', end)}${tx(270, 104, 'R2 2 kΩ: 10 mA', 'vizlab', end)}`), more: 'Comprueba siempre con Ohm: las dos ramas tienen la misma tensión. En el ejemplo, 20 mA × 1 kΩ = 20 V y 10 mA × 2 kΩ = 20 V ✓.' }),
      Nm('220 Ω en serie con dos de 2,2 kΩ en paralelo entre sí. ¿Total en Ω?', 1320, 'Ω', 'Paralelo: 1100 Ω; más 220: 1320 Ω.', { c: 'ba_mixed', h: 'Dos iguales en paralelo dan la mitad; luego suma la de serie.' }),
      G('spMixed'),
      Nm('Entran 30 mA en dos ramas en paralelo de 1 kΩ y 2 kΩ. ¿Cuánto va por la de 1 kΩ, en mA?', 20, 'mA', '30 × 2000 / 3000 = 20 mA.', { c: 'ba_curdiv', h: 'Por la de menor resistencia va más; en la fórmula, arriba va la otra.' }),
      G('spCurDiv'),
      { t: 'order', q: 'Ordena los pasos para resolver un circuito mixto.', items: ['Busca un grupo claramente en serie o en paralelo', 'Sustitúyelo por su equivalente', 'Repite hasta tener una sola resistencia', 'Calcula la corriente de la pila con Ohm', 'Deshaz el camino para sacar las tensiones y corrientes de cada parte'], e: 'Primero se simplifica hacia dentro y luego se vuelve hacia fuera.', c: 'ba_mixed', h: 'No puedes calcular la corriente de la pila sin la resistencia total.' },
      Nm('1 kΩ en serie con (1 kΩ ‖ 1 kΩ), con 9 V. ¿Qué tensión hay en el paralelo, en V?', 3, 'V', 'Paralelo 500 Ω; total 1500 Ω; I = 6 mA; en el paralelo 6 mA × 500 Ω = 3 V.', { c: 'ba_mixed', h: 'Calcula el total, la corriente, y luego I × (el equivalente del paralelo).' }),
      G('spMixed'),
      RES('<b>Reduce por partes</b>: serie y paralelo hasta una sola resistencia.', 'Con la corriente total, <b>deshaz el camino</b>.', 'Divisor de corriente: <b>I1 = I · R2 / (R1 + R2)</b>.')
    ]),
    L('d6', 'El divisor de tensión', 'div', ['ba_divcalc', 'ba_divload'], [
      Q('Tienes 9 V y necesitas 4,5 V. Pones dos resistencias iguales en serie. ¿Qué tensión hay en el punto entre ellas, respecto al −?', ['4,5 V', '9 V', '0 V', '18 V'], 'Dos iguales se reparten la tensión a medias. Acabas de inventar el divisor de tensión.', { predict: true, c: 'ba_divcalc', h: '¿Cómo se reparten la tensión dos resistencias iguales en serie?' }),
      { t: 'explore', text: 'Dos resistencias en serie con 5 V. La salida es el punto entre ellas, medida respecto al −.', viz: 'divider', params: { V: { ...pV(5), fixed: true }, R1: pE('R1 (arriba)', 10000, 100, 100000), R2: pE('R2 (abajo)', 1000, 100, 100000) },
        tasks: [
          { q: 'Vout', min: 2.45, max: 2.55, text: 'Consigue 2,5 V', done: 'Iguales: mitad y mitad.', hint: 'Pon R1 y R2 iguales.' },
          { q: 'Vout', min: 3.2, max: 3.42, text: 'Ahora 3,3 V', done: 'R2 tiene que valer unas dos veces R1: se queda unos dos tercios.', hint: 'Haz R2 unas dos veces mayor que R1.' },
          { q: 'Vout', min: 0.95, max: 1.05, text: 'Y ahora 1 V', done: 'R2 se queda 1 de cada 5 partes: R1 ≈ 4 × R2.', hint: '1 V es la quinta parte de 5 V: R1 unas cuatro veces R2.' }] },
      I('Dos resistencias en serie forman un <b>divisor de tensión</b>: la salida es la tensión del punto medio respecto a masa, la parte que se queda <b>R2</b> (la de abajo).\n<b>Vsal = Vent × R2 / (R1 + R2)</b>', { svg: svgDiv, more: 'Es lo mismo que el reparto de tensión en serie de d1, solo que ahora te interesa el punto medio como «salida».\nSirve para sacar una tensión más pequeña que la de la pila (por ejemplo, una referencia) y, sobre todo, para leer sensores (la próxima lección).' }),
      { t: 'steps', text: '¿De dónde sale la fórmula del divisor?', steps: ['R1 y R2 están en serie: <b>I = Vent / (R1 + R2)</b>', 'La salida es lo que cae en R2: <b>Vsal = I · R2</b>', 'Sustituye I: <b>Vsal = Vent · R2 / (R1 + R2)</b>', 'Si R1 = R2 → la mitad; si R2 > R1 → más de la mitad'], result: 'Vsal = Vent × R2 / (R1 + R2)' },
      { t: 'steps', text: '12 V con R1 = 10 kΩ arriba y R2 = 4,7 kΩ abajo. ¿Vsal?', steps: ['Total: 10 + 4,7 = <b>14,7 kΩ</b>', 'Fracción de abajo: 4,7 / 14,7 ≈ <b>0,32</b>', 'Vsal = 12 V × 0,32 ≈ <b>3,84 V</b>'], result: 'Unos 3,84 V' },
      { t: 'explore', text: 'Ahora conectas algo a la salida: una <b>carga</b>. Queda en paralelo con R2. Compara la salida con y sin carga.', viz: 'divLoad', params: { R: { label: 'R1 = R2', val: 10000, list: e12(1000, 1e6), fmt: 'R' }, RL: { label: 'Carga', val: 1000, list: [100, 1000, 10000, 100000, 1e6, 1e7], fmt: 'R' } },
        tasks: [
          { q: 'drop', min: 0, max: 5, text: 'Haz que la carga baje la salida menos de un 5 %', done: 'Si la carga es mucho mayor que R2 (diez veces o más), apenas se nota.', hint: 'Sube la resistencia de la carga.' },
          { q: 'flag', min: 1, max: 1, text: 'Con una carga de 10 kΩ, cambia el divisor para que baje menos de un 5 %', done: 'Un divisor de resistencias más pequeñas aguanta mejor la carga… a cambio de gastar más corriente.', hint: 'Pon la carga en 10 kΩ y baja R1 = R2.' }] },
      I('La carga queda <b>en paralelo con R2</b>: la parte de abajo baja y la salida cae. Por eso un divisor sirve para dar una referencia o leer un sensor, <b>no para alimentar</b> aparatos.', { svg: svgCarga, more: 'Regla práctica: la carga debe ser al menos diez veces mayor que R2. Más adelante (d7, Thévenin) aprenderás a calcular exactamente cuánto cae.' }),
      Nm('9 V con R1 = 2 kΩ arriba y R2 = 1 kΩ abajo. ¿Vsal, en V?', 3, 'V', '9 × 1 / 3 = 3 V.', { c: 'ba_divcalc', h: 'La de abajo es un tercio del total.' }),
      G('spDiv'),
      Q('En el esquema, ¿entre qué dos puntos está la tensión de salida del divisor?', ['Entre la unión de R1 y R2 y el − de la pila', 'Entre los dos extremos de R1', 'Entre el + y el − de la pila', 'Entre el + de la pila y la unión'], 'La salida es la tensión del punto medio respecto a masa: lo que se queda R2.', { c: 'ba_divcalc', sch: 'divider', h: 'La salida es lo que se queda la resistencia de abajo.' }),
      G('spDiv'),
      Q('Conectas a la salida de un divisor una carga de poca resistencia. La tensión de salida…', ['Baja', 'Sube', 'No cambia', 'Se invierte'], 'La carga queda en paralelo con R2 y la parte de abajo baja.', { c: 'ba_divload', h: '¿Con cuál de las dos resistencias queda en paralelo la carga?' }),
      Q('Quieres sacar unos 3,3 V de 5 V con un divisor. ¿Qué pareja sirve?', ['R1 = 1 kΩ arriba y R2 = 2 kΩ abajo', 'R1 = 2 kΩ arriba y R2 = 1 kΩ abajo', 'Las dos de 1 kΩ', 'R1 = 1 kΩ y R2 = 10 kΩ'], '5 × 2 / 3 ≈ 3,33 V.', { c: 'ba_divcalc', h: '3,3 es unos dos tercios de 5: ¿cuál tiene que ser la grande?' }),
      RES('<b>Vsal = Vent × R2 / (R1 + R2)</b>: la parte de la de abajo.', 'Iguales → mitad; R2 mayor → más de la mitad.', 'Una <b>carga</b> en la salida la hace bajar: el divisor no sirve para alimentar.')
    ]),
    L('g2', 'Potenciómetros y sensores', 'res', ['ba_pot', 'ba_sensordiv'], [
      Q('Una LDR tiene menos resistencia cuanta más luz recibe. La pones abajo en un divisor. Al oscurecer, ¿qué crees que hace la salida?', ['Sube', 'Baja', 'No cambia', 'Se hace negativa'], 'Al oscurecer la LDR sube su resistencia y, al estar abajo, se queda más tensión.', { predict: true, c: 'ba_sensordiv', h: 'Si la de abajo se hace más grande, ¿se lleva más o menos tensión?' }),
      { t: 'explore', text: 'Un <b>potenciómetro</b> de 10 kΩ entre 5 V y masa. Gira el mando: el cursor parte la resistencia en dos trozos.', viz: 'potDiv', params: { pos: { label: 'Posición del cursor', val: 10, min: 0, max: 100, step: 5, unit: '%', dec: 0 } },
        tasks: [
          { q: 'Vout', min: 2.45, max: 2.55, text: 'Pon 2,5 V en el cursor', done: 'Cursor en el centro: mitad y mitad.', hint: 'Lleva el cursor a la mitad.' },
          { q: 'Vout', min: 3.95, max: 4.05, text: 'Ahora 4 V', done: '8 kΩ abajo y 2 kΩ arriba: la salida es 8/10 de 5 V.', hint: '4 V son los 4/5 de 5 V.' },
          { q: 'Vout', min: 4.99, max: 5, text: 'Lleva el cursor a un extremo y saca la tensión completa', done: 'De 0 V a 5 V: un potenciómetro es un divisor ajustable.', hint: 'Gíralo del todo hacia arriba.' }] },
      I('Un <b>potenciómetro</b> tiene tres patas: los dos extremos de una resistencia fija y un <b>cursor</b> que se desliza por ella. Con los extremos a la pila y a masa, el cursor da un <b>divisor ajustable</b>.', { symk: 'pot', more: 'Este es su símbolo: una resistencia con una flecha (el cursor). Los hay giratorios, deslizantes y pequeños «trimmers» que se ajustan con destornillador.\nLos lineales reparten igual a lo largo del giro; los «logarítmicos» se usan para el volumen, porque el oído percibe así.\nSi usas solo un extremo y el cursor, es una resistencia variable.' }),
      I('Muchos <b>sensores</b> son resistencias que cambian:\n· <b>LDR</b>: baja con la luz.\n· <b>NTC</b>: baja al calentarse (una PTC, al revés).\n· <b>Galga</b>: cambia un poco al estirarse.', { svg: svgSens, more: 'Una LDR típica pasa de cientos de kΩ a oscuras a unos cientos de ohmios a pleno sol. Una NTC de 10 kΩ vale 10 kΩ a 25 °C y la mitad hacia los 45 °C.\nUna resistencia sola no da una tensión que puedas leer: hay que convertir su cambio en una tensión, y eso hace el divisor.' }),
      { t: 'explore', text: 'El sensor en un divisor con una resistencia fija y 5 V. Elige el sensor, la luz o la temperatura, y dónde va el sensor.', viz: 'sensorDiv', params: { s: yn('Sensor (0 LDR · 1 NTC)'), x: { label: 'Luz en % (LDR) o temperatura en °C (NTC)', val: 80, min: 0, max: 100, step: 5, dec: 0 }, Rf: pE('Resistencia fija', 10000, 1000, 100000), pos: yn('Posición del sensor (0 abajo · 1 arriba)') },
        tasks: [
          { q: 'ldrHigh', min: 1, max: 1, text: 'Con la LDR, consigue que la salida pase de 4 V', done: 'Menos luz → LDR más grande → se lleva más tensión: la salida sube.', hint: 'Baja la luz.' },
          { q: 'nt25', min: 1, max: 1, text: 'Cambia a la NTC y consigue 2,5 V a 25 °C', done: 'A 25 °C la NTC vale 10 kΩ: con una fija igual, mitad de tensión.', hint: 'Pon 25 °C y la fija en 10 kΩ.' },
          { q: 'riseHot', min: 1, max: 1, text: 'Con la NTC, haz que la salida SUBA al calentar', done: 'Con el sensor arriba, todo al revés: la NTC baja y la fija de abajo se queda más tensión.', hint: 'Cambia la posición del sensor.' }] },
      I('Para saber si la salida sube o baja, hazte dos preguntas: ¿qué hace el sensor? y ¿dónde está? Si está <b>abajo</b> y su resistencia sube, la salida <b>sube</b>. Si está <b>arriba</b>, al revés.', { svg: svgArribaAbajo }),
      { t: 'steps', text: 'LDR abajo y 10 kΩ fija arriba, con 5 V. A media luz la LDR vale 10 kΩ; al oscurecer, 40 kΩ. ¿Qué hace la salida?', steps: ['A media luz: 5 × 10 / (10 + 10) = <b>2,5 V</b>', 'Al oscurecer: 5 × 40 / (10 + 40) = <b>4 V</b>', 'Ha subido: la LDR, que está abajo, se lleva más tensión', 'Con la LDR arriba pasaría lo contrario'], result: 'Pasa de 2,5 V a 4 V' },
      Q('Un potenciómetro de 10 kΩ entre 5 V y masa, con el cursor en el centro. ¿Tensión en el cursor?', ['2,5 V', '5 V', '0 V', '10 V'], 'Mitad de la resistencia abajo: mitad de la tensión.', { c: 'ba_pot', h: 'Es un divisor con dos trozos iguales.' }),
      Q('LDR abajo en un divisor. Al oscurecer, la salida…', ['Sube', 'Baja', 'No cambia', 'Se invierte'], 'La LDR sube y se lleva más tensión.', { c: 'ba_sensordiv', h: 'Primero: ¿qué hace la LDR con menos luz? Luego: está abajo.' }),
      Q('Una NTC al calentarse…', ['Baja su resistencia', 'La sube', 'Emite luz', 'Genera tensión'], 'Coeficiente negativo: más temperatura, menos resistencia.', { c: 'ba_sensordiv', h: 'La N de NTC viene de «negativo».' }),
      Nm('NTC de 10 kΩ arriba y fija de 10 kΩ abajo, con 5 V. Se calienta y la NTC baja a 5 kΩ. ¿Vsal, en V?', 3.33, 'V', '5 × 10 / (5 + 10) ≈ 3,33 V: ha subido.', { c: 'ba_sensordiv', tol: 0.03, h: 'La salida es la parte de la de abajo, que ahora es la fija.' }),
      Nm('Un potenciómetro de 10 kΩ con 5 V: el cursor deja 2 kΩ abajo y 8 kΩ arriba. ¿Vsal, en V?', 1, 'V', '5 × 2 / 10 = 1 V.', { c: 'ba_pot', h: 'La salida es la fracción de abajo sobre el total.' }),
      Q('¿Por qué no basta con conectar una LDR sola a la pila para «leer» la luz?', ['Hace falta convertir su resistencia en una tensión: con una fija forma un divisor', 'Porque la LDR no conduce', 'Porque se quemaría siempre', 'Sí basta'], 'Sola, la LDR tiene siempre la tensión de la pila. En un divisor, su cambio se convierte en una tensión que cambia.', { c: 'ba_sensordiv', h: '¿Qué tensión tiene la LDR si está sola entre + y −?' }),
      RES('<b>Potenciómetro</b>: divisor ajustable con cursor.', '<b>LDR</b> baja con la luz; <b>NTC</b> baja con el calor.', 'En un divisor: sensor <b>abajo</b> y su R sube → la salida <b>sube</b>; arriba, al revés.')
    ]),
    SIM('s1b', 'Reto: divisor de 3 V', 'Construye un divisor que dé entre 2,7 y 3,3 V respecto al negativo, consumiendo menos de 10 mA.', { battery: 9, parts: ['res'], hint: 'Dos resistencias en serie entre + y −; la de arriba el doble que la de abajo, de al menos unos cientos de ohmios.' }, 'divider3')
  ],
  /* ---------- examen de nivel (banco propio) ---------- */
  exam: [
    // d1 · serie
    Q('Tres resistencias en serie: 1 kΩ, 2,2 kΩ y 470 Ω. ¿Por cuál pasa más corriente?', ['Por las tres pasa la misma', 'Por la de 470 Ω', 'Por la de 2,2 kΩ', 'Depende del orden en que estén'], 'En serie hay un solo camino: la carga que atraviesa una atraviesa todas. Lo que cambia de una a otra es la tensión que se quedan.', { c: 'ba_seriesI', h: '¿Cuántos caminos tiene la corriente en un circuito en serie?', l: 'd1' }),
    Nm('9 V con R1 = 2,2 kΩ y R2 = 3,3 kΩ en serie. ¿Qué corriente pasa, en mA?', 1.64, 'mA', 'Total: 5,5 kΩ. I = 9 / 5500 = 0,001 64 A ≈ 1,64 mA.', { tol: 0.02, c: 'ba_seriesI', h: 'Suma las dos y aplica Ohm con el total.', l: 'd1' }),
    TU('Con 9 V, elige R1 y R2 para que R1 se quede unos 3 V (entre 2,85 y 3,15 V).', 'series', { V: { ...pV(9, 1, 9), fixed: true }, R1: pE('R1', 1000), R2: pE('R2', 1000) }, { q: 'V1', min: 2.85, max: 3.15, text: 'Objetivo: unos 3 V en R1', hint: 'R1 tiene que quedarse un tercio: R2 debe valer el doble.' }, 'La tensión se reparte en proporción: si R2 vale unas dos veces R1, R1 se queda un tercio de 9 V. Por ejemplo, 3,3 kΩ y 6,8 kΩ.', { c: 'ba_seriesv', h: 'En serie, cada resistencia se queda una parte proporcional a su valor.', l: 'd1' }),
    // d5 · ley de mallas
    Nm('Una malla con una pila de 12 V, un LED verde (2,2 V), un LED rojo (2 V) y una resistencia. ¿Cuánto cae en la resistencia, en V?', 7.8, 'V', '12 − 2,2 − 2 = 7,8 V. Las caídas suman la pila.', { tol: 0.05, c: 'ba_kvl', h: 'Resta a la pila lo que se queda cada LED.', l: 'd5' }),
    Q('Mides respecto a masa en una malla: antes de R1, 9 V; entre R1 y el LED, 6,5 V; entre el LED y R2, 4,5 V. ¿Cuánto cae en el LED?', ['2 V', '4,5 V', '6,5 V', '2,5 V'], 'La caída de un componente es la diferencia entre sus extremos: 6,5 − 4,5 = 2 V. En R1 caen 2,5 V y en R2, los 4,5 V restantes.', { c: 'ba_kvl', h: 'Busca las tensiones de los dos extremos del LED y réstalas.', l: 'd5' }),
    // d20 · resistencia de un LED
    Nm('Una placa da 3,3 V. Quieres un LED rojo (2 V) a 5 mA. ¿Qué resistencia necesitas, en Ω?', 260, 'Ω', '(3,3 − 2) / 0,005 = 1,3 / 0,005 = 260 Ω. Redondeando hacia arriba en E12: 270 Ω.', { c: 'ba_ledr', h: 'Resta la tensión del LED a la fuente y divide entre la corriente en amperios.', l: 'd20' }),
    Nm('5 V y un LED azul (3 V) a 10 mA. ¿Qué resistencia, en Ω?', 200, 'Ω', '(5 − 3) / 0,01 = 200 Ω.', { c: 'ba_ledr', h: 'Al azul le tocan unos 3 V; la resistencia se queda el resto.', l: 'd20' }),
    Q('LED rojo (2 V) con 12 V y una resistencia de 1 kΩ. ¿Cuánto disipa la resistencia y qué potencia eliges?', ['0,1 W: vale una de ¼ W', '1 W: hace falta una de 2 W', '0,144 W: hace falta una de 1 W', '12 W'], 'La resistencia se queda 10 V y pasan 10 mA: P = 10 × 0,01 = 0,1 W. Con margen ×2, 0,2 W < 0,25 W.', { c: 'ba_prating', h: 'Primero la tensión de la resistencia (no la de la pila), luego la corriente y P = V · I.', l: 'd20' }),
    // g1 · resistencias reales
    { t: 'res', bands: ['naranja', 'naranja', 'marrón', 'dorado'], o: ['330 Ω', '33 Ω', '3,3 kΩ', '33 kΩ'], a: 0, e: 'Naranja (3), naranja (3) y marrón (1 cero): 330 Ω ±5 %.', c: 'ba_bands', h: 'Dos cifras y luego cuántos ceros; la dorada va al final.', l: 'g1' },
    { t: 'res', bands: ['marrón', 'verde', 'naranja', 'plateado'], o: ['15 kΩ', '1,5 kΩ', '150 kΩ', '153 Ω'], a: 0, e: 'Marrón (1), verde (5) y naranja (3 ceros): 15 000 Ω = 15 kΩ. La plateada es ±10 %.', c: 'ba_bands', h: 'La tercera banda dice cuántos ceros, no es una cifra más.', l: 'g1' },
    { t: 'bands', q: 'Pinta las bandas de 2,2 kΩ.', target: 2200, e: 'Rojo (2), rojo (2) y rojo (2 ceros): 2200 Ω.', c: 'ba_bands', h: 'Pasa a ohmios: 2200 = «22» y dos ceros.', l: 'g1' },
    Q('Una resistencia SMD pone «223». ¿Cuánto vale?', ['22 kΩ', '223 Ω', '2,2 kΩ', '220 kΩ'], '22 y tres ceros: 22 000 Ω = 22 kΩ.', { c: 'ba_code3', h: 'Dos cifras y luego el número de ceros.', l: 'g1' }),
    Q('Te sale que necesitas 5 kΩ para limitar una corriente. ¿Qué valor E12 eliges para no pasarte de corriente?', ['5,6 kΩ', '4,7 kΩ', '5 kΩ', '50 kΩ'], '5 kΩ no existe en E12. Hacia arriba, 5,6 kΩ: algo menos de corriente, más seguro. 4,7 kΩ daría algo más.', { c: 'ba_eseries', h: 'Busca en la lista 10, 12, 15, 18, 22, 27, 33, 39, 47, 56… y redondea hacia arriba.', l: 'g1' }),
    // d21 · tolerancia
    Nm('Una resistencia de 680 Ω ±5 %. ¿Cuál es su valor mínimo posible, en Ω?', 646, 'Ω', '5 % de 680 = 34 Ω; 680 − 34 = 646 Ω.', { tol: 1, c: 'ba_tolband', h: 'Calcula el 5 % de 680 y réstalo.', l: 'd21' }),
    Q('12 V sobre una resistencia de 1,2 kΩ ±10 %. ¿Cuál es la corriente máxima posible?', ['Unos 11,1 mA', '10 mA', 'Unos 9,1 mA', 'Unos 11,1 A'], 'El peor caso por arriba sale con la resistencia más baja: 1200 − 120 = 1080 Ω; 12 / 1080 ≈ 11,1 mA.', { c: 'ba_tolcur', h: 'La corriente máxima sale con la resistencia mínima.', l: 'd21' }),
    Q('Una resistencia con bandas amarillo, violeta, rojo y dorado mide 4,4 kΩ con un aparato muy preciso. ¿Está dentro de su tolerancia?', ['No: con ±5 % debería estar entre unos 4,47 y 4,94 kΩ', 'Sí: está muy cerca', 'Sí: la dorada es ±10 %', 'No se puede saber sin la potencia'], 'Amarillo, violeta, rojo: 4,7 kΩ. El 5 % son 235 Ω: de 4465 a 4935 Ω. 4,4 kΩ se sale.', { c: 'ba_tolband', h: 'Lee el valor nominal, calcula el ±5 % y mira si 4,4 kΩ entra.', l: 'd21' }),
    // a5 · inversos y paralelo
    Nm('1/Rt = 1/100 + 1/400. ¿Cuánto vale Rt, en Ω?', 80, 'Ω', '0,01 + 0,0025 = 0,0125; 1 / 0,0125 = 80 Ω. Menor que la menor (100 Ω) ✓.', { c: 'ba_inverse', h: 'Suma los inversos y da la vuelta al final.', l: 'a5' }),
    Nm('Tres resistencias de 470 Ω en paralelo. ¿Total, en Ω?', 156.7, 'Ω', 'n iguales en paralelo: R / n = 470 / 3 ≈ 157 Ω.', { tol: 1, c: 'parallel', h: 'Con n iguales hay un atajo.', l: 'a5' }),
    // d2 · paralelo
    Q('Dos bombillas iguales en paralelo con una pila en buen estado. Quitas una. ¿Qué pasa con la otra?', ['Sigue igual: sigue teniendo la tensión de la pila', 'Brilla el doble', 'Se apaga', 'Brilla menos'], 'En paralelo cada rama cuelga de los mismos dos puntos. Quitar una rama solo baja la corriente total que da la pila.', { c: 'ba_partension', h: '¿Cambia la tensión entre los dos puntos de los que cuelga la otra bombilla?', l: 'd2' }),
    Nm('5 V con 100 Ω, 220 Ω y 1 kΩ en paralelo. ¿Corriente total que da la pila, en mA?', 77.7, 'mA', 'Cada rama con 5 V: 50 mA + 22,7 mA + 5 mA ≈ 77,7 mA.', { tol: 0.5, c: 'ba_curdiv', h: 'Ohm en cada rama con la tensión de la pila y suma.', l: 'd2' }),
    // d4 · ley de nudos
    Q('En un nudo, I1 = 20 mA entra, I2 = 35 mA sale e I3 = 5 mA entra. Dibujas I4 saliendo. ¿Qué valor te sale para I4?', ['−10 mA: en realidad entran 10 mA por esa rama', '10 mA, saliendo', '−60 mA', '0 mA: el nudo ya cuadra'], 'Entran 20 + 5 = 25 mA y salen 35 + I4: 25 = 35 + I4 → I4 = −10 mA. El signo dice que en realidad entran 10 mA por esa rama.', { c: 'kcl', h: 'Plantea lo que entra = lo que sale, con I4 en el lado de las que salen.', l: 'd4' }),
    Nm('Un paralelo de tres ramas: la pila da 30 mA. Dos ramas llevan 12 mA y 8 mA. ¿Cuánto lleva la tercera, en mA?', 10, 'mA', 'En el nudo de arriba, lo que llega de la pila se reparte: 30 − 12 − 8 = 10 mA.', { c: 'kcl', h: 'Lo que entra en el nudo es lo que sale por las tres ramas.', l: 'd4' }),
    // d3 · mixtos
    Nm('Dos resistencias de 1 kΩ en serie, y ese bloque en paralelo con otra de 2 kΩ. ¿Total, en Ω?', 1000, 'Ω', 'La serie: 1 + 1 = 2 kΩ. En paralelo con 2 kΩ: dos iguales, la mitad: 1 kΩ.', { c: 'ba_mixed', h: 'Reduce primero la serie y luego el paralelo.', l: 'd3' }),
    Nm('12 V; R1 = 1 kΩ en serie con dos resistencias de 2 kΩ en paralelo. ¿Cuánta corriente pasa por cada una de las de 2 kΩ, en mA?', 3, 'mA', 'Paralelo: 1 kΩ; total 2 kΩ; I = 12 / 2000 = 6 mA. Al ser iguales, se reparten a medias: 3 mA cada una.', { c: 'ba_curdiv', h: 'Total, corriente de la pila y luego el reparto en el paralelo.', l: 'd3' }),
    // d6 · divisor
    Nm('12 V con R1 = 4,7 kΩ arriba y R2 = 2,2 kΩ abajo. ¿Vsal, en V?', 3.83, 'V', '12 × 2,2 / 6,9 ≈ 3,83 V.', { tol: 0.03, c: 'ba_divcalc', h: 'La salida es la fracción de la de abajo sobre el total.', l: 'd6' }),
    TU('Con 9 V, ajusta el divisor para sacar unos 3 V (entre 2,85 y 3,15 V).', 'divider', { V: { ...pV(9), fixed: true }, R1: pE('R1 (arriba)', 10000, 100, 100000), R2: pE('R2 (abajo)', 1000, 100, 100000) }, { q: 'Vout', min: 2.85, max: 3.15, text: 'Objetivo: unos 3 V', hint: 'La de abajo tiene que quedarse un tercio.' }, 'R2 / (R1 + R2) ≈ 1/3: R1 unas dos veces R2. Por ejemplo, 6,8 kΩ arriba y 3,3 kΩ abajo dan 2,94 V.', { c: 'ba_divcalc', h: 'Vsal = Vent × R2 / (R1 + R2): ¿qué relación entre R1 y R2 da un tercio?', l: 'd6' }),
    Q('Un divisor de dos resistencias de 100 kΩ da 4,5 V con 9 V. Le conectas un aparato que equivale a 10 kΩ. ¿Qué pasa con la salida?', ['Cae mucho: la carga queda en paralelo con R2 y es diez veces más pequeña', 'Nada: sigue en 4,5 V', 'Sube', 'Solo cambia la corriente de la pila'], 'Abajo queda 100 kΩ ‖ 10 kΩ ≈ 9,1 kΩ frente a 100 kΩ arriba: la salida baja a menos de 1 V. La carga debería ser al menos diez veces mayor que R2.', { c: 'ba_divload', h: 'Compara la carga con R2: ¿es mucho mayor o mucho menor?', l: 'd6' }),
    // g2 · potenciómetros y sensores
    Q('Quieres que la salida de un divisor con una LDR suba cuando hay más luz. ¿Dónde pones la LDR?', ['Arriba: con más luz baja su resistencia y la fija de abajo se queda más tensión', 'Abajo', 'Da igual dónde', 'En paralelo con la pila'], 'Con la LDR abajo, más luz haría bajar la salida. Arriba es al revés: al bajar la de arriba, la de abajo se lleva más.', { c: 'ba_sensordiv', h: 'Pregúntate qué hace la LDR con luz y qué pasa según esté arriba o abajo.', l: 'g2' }),
    Nm('Un potenciómetro de 10 kΩ entre 9 V y masa. El cursor deja 3 kΩ hacia masa. ¿Tensión en el cursor, en V?', 2.7, 'V', '9 × 3 / 10 = 2,7 V.', { tol: 0.02, c: 'ba_pot', h: 'Es un divisor: la parte de abajo entre el total.', l: 'g2' }),
    Q('Usas un potenciómetro como resistencia variable (un extremo y el cursor) en serie con un LED para regular su brillo. ¿Qué falta?', ['Una resistencia fija en serie, para que el LED no se queme al girarlo hasta 0 Ω', 'Nada: el potenciómetro ya limita', 'Otro LED en paralelo', 'Una pila más'], 'En un extremo del giro, el potenciómetro vale casi 0 Ω y el LED se quedaría sin freno. Una fija en serie pone el mínimo.', { c: 'ba_pot', h: '¿Cuánto vale el potenciómetro en un extremo del giro?', l: 'g2' })
  ] });
})();
