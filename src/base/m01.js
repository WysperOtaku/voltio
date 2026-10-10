/* Voltio · curso base, módulo 1: Qué es la electricidad.
   b1 carga · b2 materiales · b3 corriente (A, mA, I = Q/t) · b4 tensión (V, masa, pilas en serie) ·
   b9 energía (J, W = Q·V, mAh, Wh) · b5 resistencia (Ω, R = ρ·L/S) · b7 pilas y fuentes (resistencia interna cualitativa).
   Aquí aún no hay ley de Ohm, ni potencia, ni LED, ni esquemas. */
(() => {
  const { num, st } = Widgets.H;
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const fOhm = r => r >= 1000 ? num(r / 1000, 2) + ' kΩ' : r >= 10 ? num(r, 1) + ' Ω' : r >= 1 ? num(r, 2) + ' Ω' : num(r, 4) + ' Ω';
  const fAmp = i => i >= 1 ? num(i, 2) + ' A' : i >= 0.001 ? num(i * 1000, 1) + ' mA' : num(i * 1e6, 0) + ' µA';
  const grp = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  /* ===================== VISUALIZACIONES ===================== */
  const cellG = (x, y, rev, w = 34, lab = '') => `<g transform="translate(${x} ${y})${rev ? ' scale(-1 1)' : ''}"><rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="4" fill="${rev ? 'var(--err)' : '#2F3B52'}"/><rect x="${w / 2}" y="-5" width="4" height="10" rx="1" fill="#C9B183"/><rect x="${w / 2 - 8}" y="-11" width="8" height="22" fill="#E5484D"/></g>${lab ? `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="9" fill="#fff">${lab}</text>` : ''}`;
  Object.assign(Widgets.VIZ, {
    // b1: dos cargas que se atraen o se repelen, más fuerte cuanto más cerca
    charges: {
      calc: p => { const F = p.s1 * p.s2 / (p.d * p.d); return { F, rep: F > 0 ? 1 : 0, att: F < 0 ? 1 : 0, strongAtt: F < 0 && p.d <= 2 ? 1 : 0, weakRep: F > 0 && p.d >= 5 ? 1 : 0 }; },
      svg: (p, o) => {
        const h = 22 + p.d * 20, x1 = 150 - h, x2 = 150 + h, m = Math.abs(o.F), L = Math.max(8, 46 * m);
        const col = s => s > 0 ? '#E5484D' : '#3E8FCB', sg = s => s > 0 ? '+' : '−';
        const arr = (x, dir) => `<path d="M${x} 80H${x + dir * L}" stroke="var(--led)" stroke-width="4"/><path d="M${x + dir * L} 72l${dir * 9} 8l${-dir * 9} 8z" fill="var(--led)"/>`;
        const out = o.rep ? arr(x1 - 26, -1) + arr(x2 + 26, 1) : arr(x1 + 26, 1) + arr(x2 - 26, -1);
        const word = m >= 0.9 ? 'muy fuerte' : m >= 0.24 ? 'fuerte' : m >= 0.1 ? 'media' : m >= 0.05 ? 'débil' : 'muy débil';
        return `<svg viewBox="0 0 300 170" class="viz"><circle cx="${x1}" cy="80" r="22" fill="${col(p.s1)}"/><text x="${x1}" y="89" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">${sg(p.s1)}</text>
          <circle cx="${x2}" cy="80" r="22" fill="${col(p.s2)}"/><text x="${x2}" y="89" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">${sg(p.s2)}</text>${out}
          <text x="150" y="28" text-anchor="middle" class="vizlab" style="font-size:15px">${o.rep ? 'Se repelen' : 'Se atraen'}</text>
          <text x="150" y="140" text-anchor="middle" class="vizsm">Fuerza: ${word} · separación ${p.d} cm</text><text x="150" y="160" text-anchor="middle" class="vizsm">${o.rep ? 'mismo signo: se empujan' : 'signos distintos: se buscan'}</text></svg>`;
      }
    },
    // b2: electrones libres que se mueven (o no) por cuatro materiales
    matFlow: {
      anim: true,
      calc: p => { const k = { 1: 1, 2: 0.08, 3: 0.01 + 0.05 * p.heat, 4: 0 }[p.mat]; const flow = Math.min(1, k * p.push / 5); return { flow, best: p.mat === 1 && flow >= 0.9 ? 1 : 0, insul: p.mat === 4 && p.push === 10 ? 1 : 0, si: p.mat === 3 && flow >= 0.3 ? 1 : 0 }; },
      svg: (p, o, t) => {
        const name = { 1: 'Cobre', 2: 'Agua del grifo', 3: 'Silicio', 4: 'Plástico' }[p.mat], fill = { 1: '#C77B3B', 2: '#7FB8E0', 3: '#5C6B7A', 4: '#E9D8A6' }[p.mat];
        const nFree = { 1: 16, 2: 5, 3: Math.round(2 + p.heat * 1.2), 4: 0 }[p.mat], v = o.flow * 70;
        let dots = ''; for (let i = 0; i < nFree; i++) { const x = 50 + ((i * 41 + t * v) % 200), y = 66 + ((i * 17) % 40); dots += `<circle cx="${x.toFixed(1)}" cy="${y}" r="3.5" fill="var(--led)"/>`; }
        let fixed = ''; for (let i = 0; i < 12; i++) { const x = 58 + (i % 6) * 36, y = 72 + Math.floor(i / 6) * 26; fixed += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#14213D" stroke-opacity=".35"/>${p.mat === 4 || p.mat === 3 ? `<circle cx="${(x + 7 * Math.cos(t * 3 + i)).toFixed(1)}" cy="${(y + 7 * Math.sin(t * 3 + i)).toFixed(1)}" r="2.5" fill="#14213D" fill-opacity=".55"/>` : ''}`; }
        const word = o.flow >= 0.9 ? 'muchísima carga' : o.flow >= 0.3 ? 'bastante' : o.flow > 0.02 ? 'muy poca' : 'nada';
        return `<svg viewBox="0 0 300 170" class="viz"><text x="150" y="24" text-anchor="middle" class="vizlab" style="font-size:15px">${name}</text>
          <rect x="44" y="52" width="212" height="70" rx="10" fill="${fill}" stroke="var(--line)"/>${fixed}${dots}
          <path d="M14 87H38" stroke="var(--led)" stroke-width="${2 + p.push / 2}"/><path d="M38 79l8 8l-8 8z" fill="var(--led)"/><text x="10" y="76" class="vizsm">empuje</text>
          ${p.heat ? `<text x="150" y="46" text-anchor="middle" class="vizsm">${'☀'.repeat(Math.min(5, Math.ceil(p.heat / 2)))} luz o calor</text>` : ''}
          <text x="150" y="146" text-anchor="middle" class="vizlab">Pasa: ${word}</text>
          <text x="150" y="163" text-anchor="middle" class="vizsm">puntos amarillos: electrones libres en movimiento</text></svg>`;
      }
    },
    // b3: cargas que cruzan un punto de control; I = Q / t
    chargeFlow: {
      anim: true,
      calc: p => { const I = p.Q / p.t; return { I, r3: p.t === 4 && Math.abs(I - 0.5) < 1e-9 ? 1 : 0 }; },
      svg: (p, o, t) => {
        const v = 15 + 40 * Math.max(0, Math.log10(o.I / 0.001)); let dots = '';
        for (let i = 0; i < 14; i++) { const x = 20 + ((i * 20 + t * v) % 280); dots += `<circle cx="${x.toFixed(1)}" cy="70" r="4.5" fill="var(--led)"/>`; }
        return `<svg viewBox="0 0 300 170" class="viz"><rect x="10" y="56" width="280" height="28" rx="14" fill="#C77B3B" opacity=".35"/>${dots}
          <path d="M150 40V100" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/><text x="150" y="34" text-anchor="middle" class="vizsm">punto de control</text>
          <text x="150" y="124" text-anchor="middle" class="vizlab">Pasan ${num(p.Q, 2)} C cada ${p.t} s</text>
          <text x="150" y="148" text-anchor="middle" class="vizbig" style="font-size:16px">I = ${num(p.Q, 2)} / ${p.t} = ${num(o.I, 3)} A</text>
          <text x="150" y="166" text-anchor="middle" class="vizsm">= ${fAmp(o.I)}${o.I >= 1 ? ' = ' + num(o.I * 1000, 0) + ' mA' : ''}</text></svg>`;
      }
    },
    // b4: la tensión entre dos puntos es la diferencia de sus «alturas» respecto a masa
    vLevels: {
      calc: p => { const vab = p.A - p.B; return { vab, same6: p.A === p.B && p.A >= 6 ? 1 : 0 }; },
      svg: (p, o) => {
        const Y = v => 140 - v * 9.5, ya = Y(p.A), yb = Y(p.B);
        let sc = ''; for (let v = 0; v <= 12; v += 3) sc += `<path d="M30 ${Y(v)}h6" stroke="var(--muted)"/><text x="26" y="${Y(v) + 4}" text-anchor="end" class="vizsm">${v}</text>`;
        const fall = o.vab !== 0 ? `<path d="M${o.vab > 0 ? 126 : 194} ${o.vab > 0 ? ya + 4 : yb + 4}C160 ${Math.min(ya, yb) + 4} 160 ${Math.max(ya, yb) - 12} ${o.vab > 0 ? 194 : 126} ${Math.max(ya, yb) - 2}" stroke="var(--ice)" stroke-width="3" fill="none" class="a-flow"/>` : '';
        return `<svg viewBox="0 0 300 175" class="viz"><path d="M36 140H290" stroke="currentColor" stroke-width="2"/><text x="292" y="156" text-anchor="end" class="vizsm">masa (0 V)</text>${sc}<text x="10" y="18" class="vizsm">V</text>
          <rect x="70" y="${ya}" width="56" height="${140 - ya}" fill="var(--ice-soft)" stroke="var(--ice)"/><path d="M70 ${ya}H126" stroke="var(--led)" stroke-width="4"/><text x="98" y="${Math.min(ya, 130) - 6}" text-anchor="middle" class="vizlab">A ${num(p.A, 1)} V</text>
          <rect x="194" y="${yb}" width="56" height="${140 - yb}" fill="var(--ice-soft)" stroke="var(--ice)"/><path d="M194 ${yb}H250" stroke="var(--led)" stroke-width="4"/><text x="222" y="${Math.min(yb, 130) - 6}" text-anchor="middle" class="vizlab">B ${num(p.B, 1)} V</text>${fall}
          <text x="150" y="172" text-anchor="middle" class="vizlab" style="fill:${o.vab < 0 ? 'var(--err)' : 'currentColor'}">Tensión entre A y B: ${num(p.A, 1)} − ${num(p.B, 1)} = ${num(o.vab, 1)} V</text></svg>`;
      }
    },
    // b5 y c1: la analogía del agua (altura = empuje, estrechez = freno, caudal = corriente)
    water: {
      anim: true,
      calc: p => { const flow = p.h / p.w; return { flow, f_w4: p.w === 4 ? flow : 0, f_h8: p.h === 8 ? flow : 0 }; },
      svg: (p, o, t) => {
        const lvl = 130 - p.h * 9.5, th = Math.max(3, 26 / p.w), v = o.flow * 55; let dots = '';
        for (let i = 0; i < 9; i++) { const x = 92 + ((i * 22 + t * v) % 170); dots += `<circle cx="${x.toFixed(1)}" cy="132" r="${Math.min(3, th / 2.6).toFixed(1)}" fill="#fff" opacity=".85"/>`; }
        return `<svg viewBox="0 0 300 175" class="viz"><rect x="20" y="20" width="70" height="120" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="22" y="${lvl}" width="66" height="${138 - lvl}" fill="var(--ice)" opacity=".75"/>
          <rect x="88" y="${132 - th / 2}" width="180" height="${th}" fill="var(--ice)"/><path d="M88 ${132 - th / 2 - 2}H268M88 ${132 + th / 2 + 2}H268" stroke="currentColor" stroke-width="1.6"/>${o.flow > 0 ? dots : ''}
          <path d="M270 132q14 4 14 26" stroke="var(--ice)" stroke-width="${Math.max(2, th * 0.7)}" fill="none" class="a-flow"/>
          <text x="55" y="14" text-anchor="middle" class="vizsm">altura ${p.h}</text><text x="178" y="${120 - th / 2}" text-anchor="middle" class="vizsm">tubo: estrechez ${p.w}</text>
          <text x="110" y="40" class="vizbig" style="font-size:16px">Caudal: ${num(o.flow * 10, 1)} L/min</text>
          <text x="110" y="62" class="vizsm">altura ≈ tensión (empuje)</text><text x="110" y="78" class="vizsm">estrechez ≈ resistencia (freno)</text><text x="110" y="94" class="vizsm">caudal ≈ corriente</text></svg>`;
      }
    },
    // b4 y b7: pilas en serie, alguna del revés y la caída por resistencia interna con carga pesada
    cells: {
      calc: p => {
        const nr = Math.min(p.rev, p.n), V = (p.n - 2 * nr) * p.v, ri = (p.v === 1.5 ? 0.15 : 0.05) * p.n;
        const I = p.load && V > 0 ? V / (2 + ri) : 0, Vb = V - I * ri;
        return { V, Vb, drop: V - Vb, v4: p.n === 4 ? V : -99, li74: p.v === 3.7 && p.n === 2 && !nr ? 1 : 0, aa9: p.v === 1.5 && p.n === 6 && !nr ? 1 : 0, dropT: p.load ? V - Vb : 0 };
      },
      svg: (p, o) => {
        const nr = Math.min(p.rev, p.n), w = 36, x0 = 150 - (p.n * (w + 6)) / 2 + w / 2;
        let cs = '', stair = '', y = 150, x = 40;
        for (let i = 0; i < p.n; i++) { const r = i < nr; cs += cellG(x0 + i * (w + 6), 40, r, w, num(p.v, 1)); const dy = (r ? -1 : 1) * p.v * 5.2; stair += `<path d="M${x} ${y}H${x + 32}V${y - dy}" stroke="${r ? 'var(--err)' : 'var(--ok)'}" stroke-width="3" fill="none"/>`; x += 32; y -= dy; }
        return `<svg viewBox="0 0 300 180" class="viz">${cs}<text x="150" y="16" text-anchor="middle" class="vizsm">+ de una con − de la siguiente${nr ? ' (la roja, del revés)' : ''}</text>
          <path d="M36 150H${Math.max(x, 60) + 6}" stroke="var(--muted)" stroke-dasharray="3 4"/>${stair}
          <text x="${Math.min(x + 12, 230)}" y="${Math.max(80, Math.min(y + 4, 150))}" class="vizbig" style="font-size:18px">${num(o.V, 1)} V</text>
          <text x="20" y="172" class="vizsm">${p.load ? (o.V > 0 ? `Con carga pesada: ${num(o.Vb, 2)} V (pierde ${num(o.drop, 2)} V dentro)` : 'Con carga pesada: sin tensión no hay nada que dar') : 'Sin nada conectado: la tensión nominal'}</text></svg>`;
      }
    },
    // b9: carga (mAh → C) y energía (J y Wh) de una batería
    energyQV: {
      calc: p => { const Q = p.mAh * 3.6, E = Q * p.V, Wh = p.mAh / 1000 * p.V; return { Q, E, Wh, t2: p.V === 3.7 && Math.abs(Wh - 7.4) < 1e-6 ? 1 : 0, t3: p.V === 7.4 && Math.abs(Wh - 7.4) < 1e-6 ? 1 : 0 }; },
      svg: (p, o) => {
        const f = Math.min(1, Math.log10(1 + o.Wh) / Math.log10(121));
        return `<svg viewBox="0 0 300 175" class="viz"><rect x="20" y="20" width="70" height="130" rx="8" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="40" y="12" width="30" height="8" rx="2" fill="currentColor"/>
          <rect x="24" y="${146 - 122 * f}" width="62" height="${122 * f}" rx="5" fill="var(--ok)" opacity=".75"/><text x="55" y="168" text-anchor="middle" class="vizsm">${num(p.V, 1)} V</text>
          <text x="104" y="34" class="vizlab">Carga: ${grp(p.mAh)} mAh</text><text x="104" y="52" class="vizsm">= ${grp(o.Q)} C (1 mAh = 3,6 C)</text>
          <text x="104" y="78" class="vizlab">Cada culombio lleva ${num(p.V, 1)} J</text>
          <text x="104" y="104" class="vizlab">Energía: ${grp(o.E)} J</text><text x="104" y="122" class="vizsm">W = Q · V</text>
          <text x="104" y="152" class="vizbig" style="font-size:19px;fill:var(--ok)">${num(o.Wh, 2)} Wh</text><text x="104" y="168" class="vizsm">1 Wh = 3600 J</text></svg>`;
      }
    },
    // b5: resistencia de un hilo según material, longitud y sección
    wire: {
      calc: p => { const rho = { 1: 0.0172, 2: 0.0282, 3: 1.1 }[p.mat], R = rho * p.L / p.S; return { R, trip: p.mat === 1 && Math.abs(p.L / p.S - 6) < 1e-9 ? 1 : 0, r5: p.L === 5 ? R : 99, nic10: p.mat === 3 ? R : 0 }; },
      svg: (p, o) => {
        const name = { 1: 'cobre', 2: 'aluminio', 3: 'nicromo' }[p.mat], col = { 1: '#C77B3B', 2: '#A9B1BB', 3: '#7A7A7A' }[p.mat];
        const len = 30 + p.L * 11.5, th = 4 + Math.sqrt(p.S) * 7, hot = p.mat === 3 && o.R > 2;
        return `<svg viewBox="0 0 300 170" class="viz"><text x="20" y="26" class="vizlab">Hilo de ${name}</text><text x="280" y="26" text-anchor="end" class="vizsm">${p.L} m · ${num(p.S, 1)} mm²</text>
          ${hot ? `<rect x="${150 - len / 2 - 4}" y="${78 - th / 2 - 6}" width="${len + 8}" height="${th + 12}" rx="10" fill="#FF6A3D" opacity=".35" class="a-pulse"/>` : ''}
          <rect x="${150 - len / 2}" y="${78 - th / 2}" width="${len}" height="${th}" rx="${th / 2}" fill="${col}"/>
          <text x="150" y="134" text-anchor="middle" class="vizbig" style="font-size:20px">R = ${fOhm(o.R)}</text>
          <text x="150" y="156" text-anchor="middle" class="vizsm">más largo → más R · más grueso → menos R</text></svg>`;
      }
    }
  });

  /* ===================== SVG DE LAS TARJETAS ===================== */
  const orbit = (r, n, cls) => `<g class="${cls}" style="transform-origin:150px 80px"><ellipse cx="150" cy="80" rx="${r}" ry="${r * 0.42}" fill="none" stroke="var(--muted)" stroke-dasharray="3 4"/>${Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n; return `<circle cx="${(150 + r * Math.cos(a)).toFixed(1)}" cy="${(80 + r * 0.42 * Math.sin(a)).toFixed(1)}" r="6" fill="#3E8FCB"/><text x="${(150 + r * Math.cos(a)).toFixed(1)}" y="${(84 + r * 0.42 * Math.sin(a)).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff">−</text>`; }).join('')}</g>`;
  const S = {
    atom: `<svg viewBox="0 0 300 165" class="viz">${orbit(110, 2, 'a-spin')}${orbit(70, 2, '')}
      <circle cx="142" cy="76" r="9" fill="#E5484D"/><circle cx="158" cy="78" r="9" fill="#E5484D"/><circle cx="150" cy="88" r="9" fill="#9AA3B2"/><circle cx="150" cy="68" r="9" fill="#9AA3B2"/>
      <text x="142" y="80" text-anchor="middle" font-size="11" fill="#fff">+</text><text x="158" y="82" text-anchor="middle" font-size="11" fill="#fff">+</text>
      <text x="10" y="150" class="vizsm">rojo: protón (+) · gris: neutrón · azul: electrón (−)</text><text x="10" y="18" class="vizsm">El núcleo es diminuto; casi todo es vacío</text></svg>`,
    forces: `<svg viewBox="0 0 300 150" class="viz"><circle cx="60" cy="40" r="16" fill="#E5484D"/><circle cx="130" cy="40" r="16" fill="#E5484D"/><text x="60" y="46" text-anchor="middle" font-size="18" fill="#fff">+</text><text x="130" y="46" text-anchor="middle" font-size="18" fill="#fff">+</text>
      <path d="M40 40H20M150 40H170" stroke="var(--led)" stroke-width="3"/><text x="186" y="45" class="vizlab">se repelen</text>
      <circle cx="60" cy="105" r="16" fill="#E5484D"/><circle cx="130" cy="105" r="16" fill="#3E8FCB"/><text x="60" y="111" text-anchor="middle" font-size="18" fill="#fff">+</text><text x="130" y="111" text-anchor="middle" font-size="18" fill="#fff">−</text>
      <path d="M80 105H96M110 105H94" stroke="var(--led)" stroke-width="3"/><text x="186" y="110" class="vizlab">se atraen</text><text x="186" y="128" class="vizsm">más cerca, más fuerza</text></svg>`,
    balloon: `<svg viewBox="0 0 300 160" class="viz"><ellipse cx="200" cy="70" rx="46" ry="56" fill="#E5484D" opacity=".85"/><path d="M200 126l-6 10h12z" fill="#E5484D"/><path d="M200 136q-10 14 4 24" stroke="var(--muted)" fill="none"/>
      <path d="M30 120q10 -60 50 -70q20 -4 30 10" stroke="#7B4A21" stroke-width="10" fill="none" stroke-linecap="round"/><text x="40" y="150" class="vizsm">pelo: pierde electrones (+)</text>
      ${[0, 1, 2].map(i => `<g class="a-drift a-d${i + 1}" style="--d:${70 - i * 6}px"><circle cx="${100 + i * 4}" cy="${58 + i * 10}" r="5" fill="#3E8FCB"/></g>`).join('')}
      <text x="200" y="66" text-anchor="middle" font-size="16" fill="#fff">− − −</text><text x="200" y="86" text-anchor="middle" font-size="16" fill="#fff">− −</text><text x="232" y="150" text-anchor="middle" class="vizsm">globo: gana (−)</text></svg>`,
    freeE: `<svg viewBox="0 0 300 145" class="viz"><rect x="10" y="30" width="280" height="70" rx="10" fill="#C77B3B" opacity=".35"/>
      ${Array.from({ length: 14 }, (_, i) => `<circle cx="${30 + (i % 7) * 40}" cy="${50 + Math.floor(i / 7) * 30}" r="8" fill="none" stroke="currentColor" stroke-opacity=".4"/>`).join('')}
      ${Array.from({ length: 6 }, (_, i) => `<g class="a-drift a-d${(i % 4) + 1}" style="--d:${30 + i * 8}px"><circle cx="${20 + i * 44}" cy="${62 + (i % 2) * 14}" r="4" fill="var(--led)"/></g>`).join('')}
      <text x="10" y="20" class="vizsm">Cobre: átomos fijos y electrones libres (amarillos)</text><text x="10" y="124" class="vizsm">Si todos avanzan hacia el mismo lado: electricidad</text><text x="10" y="138" class="vizsm">en movimiento.</text></svg>`,
    sack: `<svg viewBox="0 0 300 140" class="viz"><path d="M40 120q-14 -60 30 -80h40q44 20 30 80z" fill="#C9B183"/><path d="M70 40l20 -14l20 14" stroke="#7B4A21" stroke-width="3" fill="none"/>
      <text x="90" y="92" text-anchor="middle" class="vizbig" style="font-size:18px;fill:#14213D">1 C</text>
      <text x="160" y="56" class="vizlab">1 culombio =</text><text x="160" y="80" class="vizlab">6,24 × 10¹⁸</text><text x="160" y="100" class="vizlab">electrones</text><text x="160" y="124" class="vizsm">(como «una docena» son 12)</text></svg>`,
    copperVsPlastic: `<svg viewBox="0 0 300 160" class="viz"><text x="10" y="18" class="vizlab">Cobre (conductor)</text><rect x="10" y="26" width="280" height="40" rx="8" fill="#C77B3B" opacity=".4"/>
      ${Array.from({ length: 9 }, (_, i) => `<g class="a-drift" style="--d:30px"><circle cx="${18 + i * 30}" cy="${40 + (i % 2) * 12}" r="4" fill="var(--led)"/></g>`).join('')}
      <text x="10" y="94" class="vizlab">Plástico (aislante)</text><rect x="10" y="102" width="280" height="40" rx="8" fill="#E9D8A6"/>
      ${Array.from({ length: 9 }, (_, i) => `<circle cx="${25 + i * 30}" cy="122" r="7" fill="none" stroke="#14213D" stroke-opacity=".5"/><circle cx="${32 + i * 30}" cy="122" r="2.5" fill="#14213D" class="a-pulse"/>`).join('')}
      <text x="10" y="156" class="vizsm">En el plástico cada electrón está atado a su átomo.</text></svg>`,
    water: `<svg viewBox="0 0 300 140" class="viz"><path d="M80 20q-40 55 -40 75a40 40 0 0 0 80 0q0 -20 -40 -75z" fill="var(--ice)" opacity=".6"/>
      <text x="64" y="90" font-size="14" fill="#14213D">Na⁺</text><text x="86" y="110" font-size="14" fill="#14213D">Cl⁻</text>
      <text x="140" y="44" class="vizlab">Agua del grifo:</text><text x="140" y="64" class="vizsm">lleva sales disueltas que</text><text x="140" y="80" class="vizsm">se mueven y conducen.</text><text x="140" y="108" class="vizlab" style="fill:var(--err)">Electricidad y agua,</text><text x="140" y="126" class="vizlab" style="fill:var(--err)">nunca juntas.</text></svg>`,
    silicon: `<svg viewBox="0 0 300 150" class="viz"><rect x="20" y="40" width="160" height="60" rx="8" fill="#5C6B7A"/>
      ${Array.from({ length: 3 }, (_, i) => `<g class="a-drift" style="--d:60px"><circle cx="${40 + i * 30}" cy="${60 + i * 10}" r="4" fill="var(--led)"/></g>`).join('')}
      <g class="a-pulse"><circle cx="240" cy="40" r="16" fill="var(--led)"/></g><path d="M222 54l-24 14M240 60v18M256 54l20 14" stroke="var(--led)" stroke-width="2.5"/>
      <text x="20" y="124" class="vizsm">Silicio: conduce poco… pero con luz, calor o añadiéndole</text><text x="20" y="140" class="vizsm">otras sustancias conduce más. Se puede controlar.</text></svg>`,
    gate: `<svg viewBox="0 0 300 140" class="viz"><rect x="10" y="50" width="280" height="30" rx="15" fill="#C77B3B" opacity=".35"/>
      ${Array.from({ length: 10 }, (_, i) => `<g class="a-drift" style="--d:28px"><circle cx="${20 + i * 28}" cy="65" r="5" fill="var(--led)"/></g>`).join('')}
      <path d="M150 34V96" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/><text x="150" y="28" text-anchor="middle" class="vizsm">cuenta lo que pasa por aquí</text>
      <text x="150" y="118" text-anchor="middle" class="vizlab">Corriente = carga que pasa cada segundo</text><text x="150" y="134" text-anchor="middle" class="vizsm">como contar coches que cruzan un peaje</text></svg>`,
    iqt: `<svg viewBox="0 0 300 140" class="viz"><text x="150" y="56" text-anchor="middle" class="vizbig" style="font-size:34px">I = Q / t</text>
      <text x="60" y="96" text-anchor="middle" class="vizsm">I: corriente</text><text x="60" y="112" text-anchor="middle" class="vizlab">amperios (A)</text>
      <text x="150" y="96" text-anchor="middle" class="vizsm">Q: carga</text><text x="150" y="112" text-anchor="middle" class="vizlab">culombios (C)</text>
      <text x="240" y="96" text-anchor="middle" class="vizsm">t: tiempo</text><text x="240" y="112" text-anchor="middle" class="vizlab">segundos (s)</text><text x="150" y="134" text-anchor="middle" class="vizsm">1 A = 1 C cada segundo</text></svg>`,
    ampScale: `<svg viewBox="0 0 300 160" class="viz"><path d="M20 120H280" stroke="currentColor" stroke-width="2"/>${['1 µA', '1 mA', '1 A', '100 A'].map((l, i) => `<path d="M${30 + i * 80} 114v12" stroke="currentColor"/><text x="${30 + i * 80}" y="142" text-anchor="middle" class="vizsm">${l}</text>`).join('')}
      <text x="30" y="100" font-size="20">⌚</text><text x="16" y="70" class="vizsm">reloj: µA</text><text x="104" y="100" font-size="20">📟</text><text x="88" y="70" class="vizsm">aparatos pequeños: mA</text><text x="190" y="100" font-size="20">📱</text><text x="176" y="54" class="vizsm">móvil cargando: ~1 A</text><text x="256" y="100" font-size="20">🚗</text><text x="292" y="30" text-anchor="end" class="vizsm">arranque: cientos</text>
      <text x="20" y="156" class="vizsm">1 A = 1000 mA · 1 mA = 1000 µA</text></svg>`,
    marbles: `<svg viewBox="0 0 300 120" class="viz"><rect x="20" y="40" width="260" height="30" rx="15" fill="none" stroke="currentColor" stroke-width="2"/>
      <g class="a-drift" style="--d:28px">${Array.from({ length: 9 }, (_, i) => `<circle cx="${36 + i * 28}" cy="55" r="12" fill="var(--ice)"/>`).join('')}</g>
      <path d="M2 55H18" stroke="var(--led)" stroke-width="4"/><text x="4" y="34" class="vizsm">empujas</text><text x="232" y="34" class="vizsm">sale ya</text>
      <text x="20" y="98" class="vizsm">Cada canica avanza poco, pero el empuje llega al otro</text><text x="20" y="114" class="vizsm">extremo al instante: el tubo ya estaba lleno.</text></svg>`,
    convDir: `<svg viewBox="0 0 300 160" class="viz"><path d="M60 30H240V130H60Z" ${st}/><path d="M60 30H240V130H60Z" fill="none" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/>
      <rect x="44" y="62" width="32" height="36" rx="4" fill="#2F3B52"/><text x="60" y="58" text-anchor="middle" class="vizlab">+</text><text x="60" y="114" text-anchor="middle" class="vizlab">−</text>
      <text x="150" y="22" text-anchor="middle" class="vizsm" style="fill:var(--led)">→ corriente convencional (+ → −)</text>
      <path d="M200 112H120" stroke="var(--ice)" stroke-width="2"/><path d="M126 106l-8 6l8 6" fill="none" stroke="var(--ice)" stroke-width="2"/><text x="150" y="150" text-anchor="middle" class="vizsm" style="fill:var(--ice)">← electrones (al revés)</text>
      <text x="150" y="84" text-anchor="middle" font-size="22">💡</text></svg>`,
    loopSame: `<svg viewBox="0 0 300 150" class="viz"><path d="M60 30H240V120H60Z" fill="none" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/>
      <rect x="44" y="58" width="32" height="34" rx="4" fill="#2F3B52"/><text x="150" y="80" text-anchor="middle" font-size="22">💡</text>
      <text x="150" y="22" text-anchor="middle" class="vizlab">sale: 0,2 A</text><text x="150" y="142" text-anchor="middle" class="vizlab">vuelve: 0,2 A</text><text x="246" y="80" class="vizsm">0,2 A</text></svg>`,
    heights: `<svg viewBox="0 0 300 160" class="viz"><path d="M20 140H280" stroke="currentColor" stroke-width="2"/><text x="276" y="154" text-anchor="end" class="vizsm">masa: 0 V (el «suelo»)</text>
      <rect x="50" y="40" width="60" height="100" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="80" y="34" text-anchor="middle" class="vizlab">A: 9 V</text>
      <rect x="190" y="95" width="60" height="45" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="220" y="89" text-anchor="middle" class="vizlab">B: 4 V</text>
      <path d="M150 40V95" stroke="var(--led)" stroke-width="3"/><path d="M144 46l6 -8l6 8M144 89l6 8l6 -8" fill="none" stroke="var(--led)" stroke-width="3"/><text x="158" y="72" class="vizlab">5 V</text>
      <path d="M110 40H150M150 95H190" stroke="var(--muted)" stroke-dasharray="3 3"/></svg>`,
    gnd: `<svg viewBox="0 0 300 150" class="viz"><rect x="30" y="40" width="40" height="70" rx="5" fill="#2F3B52"/><text x="50" y="34" text-anchor="middle" class="vizlab">+</text><text x="50" y="128" text-anchor="middle" class="vizlab">−</text>
      <path d="M50 110V128M36 128h28M41 134h18M46 140h8" stroke="currentColor" stroke-width="2.2" fill="none"/><text x="80" y="140" class="vizsm">masa (GND) = 0 V</text>
      <text x="110" y="50" class="vizlab">«Este punto está a 9 V»</text><text x="110" y="68" class="vizsm">significa «9 V más que la masa».</text>
      <text x="110" y="96" class="vizsm">La masa es solo la referencia que</text><text x="110" y="112" class="vizsm">elegimos, como el nivel del mar</text><text x="110" y="128" class="vizsm">para medir alturas.</text></svg>`,
    pump: `<svg viewBox="0 0 300 160" class="viz"><rect x="40" y="30" width="50" height="110" rx="6" fill="#2F3B52"/><text x="65" y="24" text-anchor="middle" class="vizlab">+ 9 V</text><text x="65" y="156" text-anchor="middle" class="vizlab">− 0 V</text>
      <path d="M65 128V44" stroke="var(--led)" stroke-width="3" class="a-flow-slow"/><text x="100" y="70" class="vizsm">la pila «sube» cada culombio</text><text x="100" y="86" class="vizsm">9 escalones: le da 9 julios</text>
      <path d="M90 36H250V136H90" fill="none" stroke="var(--muted)" stroke-width="2"/><text x="180" y="122" text-anchor="middle" class="vizsm">fuera, la carga «baja» y</text><text x="180" y="136" text-anchor="middle" class="vizsm" dy="12">suelta esa energía</text></svg>`,
    stack: `<svg viewBox="0 0 300 150" class="viz">${cellG(70, 40, 0, 50, '1,5 V')}${cellG(130, 40, 0, 50, '1,5 V')}${cellG(190, 40, 0, 50, '1,5 V')}
      <text x="250" y="45" class="vizlab">= 4,5 V</text><path d="M40 130H80V110H120V90H160V70" stroke="var(--ok)" stroke-width="3" fill="none"/><text x="170" y="74" class="vizsm">cada pila, un escalón más</text>
      <text x="20" y="146" class="vizsm">+ de una con − de la siguiente: se suman</text></svg>`,
    apple: `<svg viewBox="0 0 300 150" class="viz"><path d="M30 130H130" stroke="currentColor" stroke-width="2"/><g class="a-bob"><circle cx="80" cy="40" r="14" fill="#E5484D"/><path d="M80 26v-8" stroke="#7B4A21" stroke-width="2"/></g>
      <path d="M110 120V44" stroke="var(--led)" stroke-width="2"/><path d="M104 50l6 -8l6 8" fill="none" stroke="var(--led)" stroke-width="2"/><text x="116" y="88" class="vizsm">1 m</text>
      <text x="150" y="56" class="vizlab">Subir una manzana</text><text x="150" y="74" class="vizlab">un metro ≈ 1 julio</text><text x="150" y="104" class="vizsm">La energía se mide en</text><text x="150" y="120" class="vizsm">julios (J).</text></svg>`,
    wqv: `<svg viewBox="0 0 300 150" class="viz"><text x="150" y="46" text-anchor="middle" class="vizbig" style="font-size:32px">W = Q · V</text>
      <text x="60" y="88" text-anchor="middle" class="vizsm">W: energía</text><text x="60" y="104" text-anchor="middle" class="vizlab">julios (J)</text><text x="150" y="88" text-anchor="middle" class="vizsm">Q: carga</text><text x="150" y="104" text-anchor="middle" class="vizlab">culombios (C)</text><text x="240" y="88" text-anchor="middle" class="vizsm">V: tensión</text><text x="240" y="104" text-anchor="middle" class="vizlab">voltios (V)</text>
      <text x="150" y="136" text-anchor="middle" class="vizsm">1 V = 1 julio por cada culombio</text></svg>`,
    mah: `<svg viewBox="0 0 300 150" class="viz"><rect x="20" y="30" width="80" height="100" rx="8" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="24" y="60" width="72" height="66" rx="5" fill="var(--ice)" opacity=".7"/>
      <text x="60" y="24" text-anchor="middle" class="vizsm">depósito de carga</text><text x="120" y="54" class="vizlab">1 mAh: 1 mA durante 1 hora</text><text x="120" y="78" class="vizsm">0,001 A × 3600 s = 3,6 C</text>
      <text x="120" y="104" class="vizlab">2000 mAh = 7200 C</text><text x="120" y="128" class="vizsm">mAh mide carga, no energía</text></svg>`,
    chain: `<svg viewBox="0 0 300 120" class="viz"><text x="30" y="60" font-size="30">🔋</text><text x="18" y="96" class="vizsm">química</text><path d="M72 50H108" stroke="var(--led)" stroke-width="3" class="a-flow"/>
      <text x="118" y="60" font-size="30">⚡</text><text x="108" y="96" class="vizsm">eléctrica</text><path d="M158 50H194" stroke="var(--led)" stroke-width="3" class="a-flow"/>
      <text x="204" y="44" font-size="22">💡🔥⚙️</text><text x="200" y="74" class="vizsm">luz, calor,</text><text x="200" y="90" class="vizsm">movimiento</text><text x="10" y="114" class="vizsm">La energía no se crea ni se pierde: cambia de forma.</text></svg>`,
    pipeRes: `<svg viewBox="0 0 300 150" class="viz"><rect x="10" y="30" width="280" height="26" fill="var(--ice)" opacity=".5"/><rect x="120" y="38" width="60" height="10" fill="var(--ice)"/><path d="M10 28H120V36H180V28H290M10 58H120V50H180V58H290" stroke="currentColor" stroke-width="2" fill="none"/>
      <text x="150" y="22" text-anchor="middle" class="vizsm">estrechamiento: frena el agua</text>
      <path d="M10 110H110" stroke="currentColor" stroke-width="2.4"/><rect x="110" y="100" width="80" height="20" rx="10" fill="#E7D3A8" stroke="#C9B183"/><path d="M190 110H290" stroke="currentColor" stroke-width="2.4"/>
      <text x="150" y="142" text-anchor="middle" class="vizsm">resistencia: frena la corriente · se mide en ohmios (Ω)</text></svg>`,
    heat: `<svg viewBox="0 0 300 145" class="viz"><path d="M40 90q15 -30 30 0t30 0t30 0t30 0t30 0t30 0" stroke="#FF6A3D" stroke-width="6" fill="none" class="a-pulse"/>
      ${[0, 1, 2, 3].map(i => `<path d="M${70 + i * 45} 56q-8 -10 0 -20t0 -20" stroke="#FF6A3D" stroke-width="2" fill="none" opacity=".7" class="a-bob a-d${i + 1}"/>`).join('')}
      <text x="20" y="122" class="vizsm">Al vencer la resistencia, la energía se convierte</text><text x="20" y="136" class="vizsm">en calor: así funciona una tostadora.</text></svg>`,
    wires: `<svg viewBox="0 0 300 160" class="viz"><rect x="20" y="24" width="120" height="8" rx="4" fill="#C77B3B"/><text x="150" y="32" class="vizsm">corto: poca R</text>
      <rect x="20" y="52" width="250" height="8" rx="4" fill="#C77B3B"/><text x="20" y="76" class="vizsm">el doble de largo → el doble de R</text>
      <rect x="20" y="92" width="120" height="18" rx="9" fill="#C77B3B"/><text x="148" y="106" class="vizsm">doble de grueso: mitad de R</text>
      <text x="20" y="140" class="vizbig" style="font-size:18px">R = ρ · L / S</text><text x="150" y="134" class="vizsm">ρ: material · L: longitud</text><text x="150" y="150" class="vizsm">S: sección (grosor)</text></svg>`,
    resistor: `<svg viewBox="0 0 300 120" class="viz"><path d="M20 50H100M200 50H280" stroke="#9AA3B2" stroke-width="5" stroke-linecap="round"/><rect x="100" y="34" width="100" height="32" rx="14" fill="#E7D3A8" stroke="#C9B183"/>
      <rect x="118" y="34" width="8" height="32" fill="#F5D10A"/><rect x="134" y="34" width="8" height="32" fill="#8A3FC9"/><rect x="150" y="34" width="8" height="32" fill="#7B4A21"/><rect x="178" y="34" width="8" height="32" fill="#C9A227"/>
      <text x="150" y="92" text-anchor="middle" class="vizlab">Una resistencia: una pieza con un valor fijo</text><text x="150" y="110" text-anchor="middle" class="vizsm">las bandas de colores dicen su valor (lo verás más adelante)</text></svg>`,
    cell: `<svg viewBox="0 0 300 160" class="viz"><rect x="40" y="30" width="70" height="110" rx="8" fill="#2F3B52"/><rect x="62" y="20" width="26" height="10" rx="2" fill="#C9B183"/>
      <rect x="50" y="44" width="22" height="86" fill="#9AA3B2" opacity=".7"/><rect x="78" y="44" width="22" height="86" fill="#7B4A21" opacity=".7"/>
      <text x="75" y="156" text-anchor="middle" class="vizsm">dos materiales + una pasta</text><text x="130" y="52" class="vizlab">Pila química</text><text x="130" y="72" class="vizsm">Una reacción química empuja</text><text x="130" y="88" class="vizsm">electrones hacia un polo.</text><text x="130" y="112" class="vizsm">La química decide la tensión:</text><text x="130" y="128" class="vizsm">alcalina 1,5 V · litio 3,7 V</text></svg>`,
    nominal: `<svg viewBox="0 0 300 170" class="viz">${[['AA / AAA', '1,5 V', 30], ['Botón CR2032', '3 V', 58], ['Litio (Li-ion)', '3,7 V', 86], ['USB', '5 V', 114], ['Pila cuadrada', '9 V', 142]].map(([n, v, y]) => `<text x="20" y="${y}" class="vizlab">${n}</text><text x="190" y="${y}" class="vizbig">${v}</text><path d="M20 ${y + 8}H280" stroke="var(--line)"/>`).join('')}
      <text x="20" y="164" class="vizsm">La pila cuadrada lleva seis celdas de 1,5 V dentro.</text></svg>`,
    rint: `<svg viewBox="0 0 300 160" class="viz"><rect x="30" y="20" width="110" height="120" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/>
      <rect x="55" y="40" width="30" height="40" rx="4" fill="#2F3B52"/><text x="70" y="36" text-anchor="middle" class="vizsm">ideal</text>
      <rect x="57" y="96" width="26" height="12" rx="6" fill="#E7D3A8" stroke="#C9B183"/><text x="92" y="106" class="vizsm">freno</text><text x="85" y="152" text-anchor="middle" class="vizsm">pila real</text>
      <text x="160" y="50" class="vizlab">Poca corriente:</text><text x="160" y="66" class="vizsm">casi no se nota el freno</text><text x="160" y="94" class="vizlab" style="fill:var(--err)">Mucha corriente:</text><text x="160" y="110" class="vizsm">parte del empuje se queda</text><text x="160" y="126" class="vizsm">dentro y la tensión baja</text></svg>`
  };

  /* ===================== CONCEPTOS ===================== */
  const C = CONCEPTS;
  C.ba_atom = { name: 'Átomos: protones y electrones', alts: [
    { title: 'Ganar o perder electrones', text: 'Un átomo tiene protones (+) en el núcleo y electrones (−) alrededor; normalmente los mismos de cada uno, así que es neutro. Los protones no se mueven de su sitio: lo que pasa de un objeto a otro son <b>electrones</b>. Quien gana electrones queda negativo; quien los pierde, positivo.', svg: S.balloon, q: mcq('Un objeto ha perdido electrones. ¿Qué carga tiene?', ['Positiva', 'Negativa', 'Ninguna', 'Depende del material'], 'Le sobran protones: positiva.') },
    { title: 'Mira el átomo', text: 'Fíjate en el dibujo: el núcleo, diminuto, tiene protones (rojos, +) y neutrones (grises, sin carga). Los electrones (azules, −) están alrededor y son los únicos que pueden escaparse.', svg: S.atom, q: mcq('¿Qué partícula no tiene carga?', ['El neutrón', 'El electrón', 'El protón', 'Ninguna: todas tienen'], 'Neutrón: neutro.') },
    { title: 'Electrones libres', text: 'En los metales, algunos electrones están poco atados y saltan de átomo en átomo: son los <b>electrones libres</b>. Por eso el cobre es tan bueno para hacer cables.', svg: S.freeE, q: mcq('¿Qué partículas pueden saltar de átomo en átomo en el cobre?', ['Electrones libres', 'Protones', 'Núcleos enteros', 'Neutrones'], 'Los protones están fijos en los núcleos.') }
  ] };
  Object.assign(C, {
    ba_qforce: { name: 'Cargas que se atraen o se repelen', alts: [
      { title: 'Iguales se empujan', text: 'Dos cargas del mismo signo se repelen; de signo contrario se atraen. Y la fuerza crece mucho al acercarlas. Dos globos frotados con el mismo pelo se separan solos: los dos son negativos.', svg: S.forces, q: mcq('Un globo negativo se acerca a otro también negativo. ¿Qué pasa?', ['Se repelen', 'Se atraen', 'Nada', 'Intercambian protones'], 'Mismo signo: se repelen.') },
      { title: 'Pruébalo', text: 'Cambia el signo de cada carga y la distancia. Mira hacia dónde apuntan las flechas y cómo crecen al acercarlas.', tune: { viz: 'charges', params: { s1: { label: 'Carga izquierda (−1 o +1)', val: 1, list: [-1, 1], dec: 0 }, s2: { label: 'Carga derecha (−1 o +1)', val: 1, list: [-1, 1], dec: 0 }, d: { label: 'Separación', val: 3, min: 1, max: 5, step: 1, dec: 0, unit: 'cm' } } }, q: mcq('Una carga + y una − se acercan. ¿Qué pasa con la fuerza?', ['Se atraen, y cada vez con más fuerza', 'Se repelen cada vez más', 'Se atraen, pero con menos fuerza', 'Nada'], 'Signos distintos se atraen; más cerca, más fuerza.') }
    ] },
    ba_coulomb: { name: 'El culombio: la unidad de carga', alts: [
      { title: 'Un saco de electrones', text: 'Un electrón tiene una carga diminuta, así que se cuentan por sacos: un <b>culombio</b> (C) son unos 6,24 × 10¹⁸ electrones, igual que una docena son 12 huevos.', svg: S.sack, q: mcq('¿Cuántos electrones hay en 2 C?', ['Unos 1,25 × 10¹⁹', 'Unos 6,24 × 10¹⁸', 'Dos', 'Unos 3,12 × 10¹⁸'], '2 × 6,24 × 10¹⁸ = 12,48 × 10¹⁸ = 1,248 × 10¹⁹.') },
      { title: 'Con potencias de 10', text: 'Para pasar de culombios a electrones multiplica por 6,24 × 10¹⁸; si hay un prefijo, suma su exponente. 1 µC = 10⁻⁶ C → 6,24 × 10¹⁸⁻⁶ = 6,24 × 10¹² electrones.', q: mcq('¿Cuántos electrones hay en 1 mC?', ['6,24 × 10¹⁵', '6,24 × 10²¹', '6,24 × 10³', '1000'], '18 + (−3) = 15.') }
    ] }
  });
  C.ba_materials.alts[0] = { title: 'Cuántos electrones libres', text: 'Todo depende de cuántos electrones libres tiene el material. <b>Conductores</b> (cobre, aluminio, plata, oro): muchísimos. <b>Aislantes</b> (plástico, goma, vidrio, aire seco): casi ninguno. <b>Semiconductores</b> (silicio): pocos, pero se puede controlar cuántos; de ellos se hacen los componentes electrónicos.', svg: S.copperVsPlastic, q: mcq('¿En qué grupo está el silicio?', ['Semiconductor', 'Conductor', 'Aislante', 'Imán'], 'Conduce a medias y se puede controlar.') };
  C.ba_materials.alts.push({ title: 'Haz pasar la carga', text: 'Elige el material y empuja. En el cobre los electrones libres corren; en el plástico ni se mueven; el silicio conduce más cuando le das luz o calor.', tune: { viz: 'matFlow', params: { mat: { label: 'Material (1 cobre · 2 agua · 3 silicio · 4 plástico)', val: 4, list: [1, 2, 3, 4], dec: 0 }, push: { label: 'Empuje', val: 8, min: 0, max: 10, step: 1, dec: 0 }, heat: { label: 'Luz o calor', val: 0, min: 0, max: 10, step: 1, dec: 0 } } }, q: mcq('¿Por qué los cables llevan cobre dentro y plástico fuera?', ['El cobre conduce y el plástico aísla y protege', 'El plástico conduce mejor', 'Para que pesen menos', 'Por estética'], 'Conductor para llevar, aislante para proteger.') });
  C.charge.alts.push({ title: 'Cuenta en el punto de control', text: 'Elige cuánta carga pasa y en cuánto tiempo. La corriente es la división: culombios entre segundos.', tune: { viz: 'chargeFlow', params: { Q: { label: 'Carga que pasa', val: 6, list: [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 6, 10, 20], dec: 2, unit: 'C' }, t: { label: 'Tiempo', val: 3, min: 1, max: 10, step: 1, dec: 0, unit: 's' } } }, q: mcq('Pasan 0,5 C cada 5 s. ¿Corriente?', ['0,1 A', '2,5 A', '10 A', '0,5 A'], '0,5 / 5 = 0,1 A = 100 mA.') });
  C.current.alts.push({ title: 'Mira el circuito entero', text: 'La carga da la vuelta completa: sale por un polo de la pila, atraviesa la bombilla y vuelve por el otro. Por cualquier punto del camino pasa la misma cantidad cada segundo. La bombilla gasta <b>energía</b>, no carga.', svg: S.loopSame, q: mcq('Salen 0,2 A de la pila. ¿Cuánto vuelve?', ['0,2 A', 'Menos, la bombilla se queda una parte', '0 A', '0,4 A'], 'Lo que sale, vuelve.') });
  C.ba_drift.alts.push({ title: 'Tubo lleno de canicas', text: 'Mira el tubo: cada canica avanza solo un poco, pero en cuanto empujas una por la izquierda sale otra por la derecha. El cable está siempre lleno de electrones; el empuje se transmite a todos a la vez.', svg: S.marbles, q: mcq('¿Qué llega casi al instante al otro extremo del cable?', ['El empuje, que mueve a todos los electrones a la vez', 'Un electrón concreto que sale de la pila', 'Los protones', 'Nada: hay que esperar'], 'Los electrones van despacio; el empuje, rapidísimo.') });
  C.ba_convdir.alts[0] = { title: 'Sentido convencional', text: 'Por convenio, la corriente se dibuja saliendo del <b>+</b> de la pila y entrando por el <b>−</b>. Los electrones van al revés, pero eso no cambia ninguna cuenta: todos los dibujos de circuitos usan el sentido convencional.', svg: S.convDir, q: mcq('En los dibujos de circuitos, la corriente va…', ['Del + al − por fuera de la pila', 'Del − al + por fuera de la pila', 'En ambos sentidos a la vez', 'Solo dentro de la pila'], 'Es el sentido convencional.') };
  Object.assign(C, {
    ba_ampconv: { name: 'Amperios, miliamperios y microamperios', alts: [
      { title: 'La escalera de mil', text: '1 A = 1000 mA y 1 mA = 1000 µA. Para pasar de A a mA multiplica por 1000 (la coma, tres sitios a la derecha); para volver, divide. 0,02 A = <b>20 mA</b>; 350 mA = <b>0,35 A</b>.', svg: S.ampScale, q: mcq('0,005 A son…', ['5 mA', '0,5 mA', '50 mA', '5000 mA'], '× 1000 → 5 mA.') },
      { title: 'Pasa por la unidad', text: 'Si te lías, pasa por el amperio: 2500 µA = 2500 × 10⁻⁶ A = 0,0025 A = <b>2,5 mA</b>. Comprobación: un prefijo más pequeño siempre lleva un número más grande.', q: mcq('2500 µA son…', ['2,5 mA', '2500 mA', '25 mA', '0,25 mA'], '÷ 1000 → 2,5 mA.') }
    ] }
  });
  C.ba_vdiff.alts[0] = { title: 'Como un desnivel', text: 'La tensión es como un desnivel: no tiene sentido decir «cuánta altura» sin decir respecto a qué. Por eso los aparatos que miden tensión tienen dos puntas, y por eso un pájaro con las dos patas en el mismo cable no nota nada. «Este punto está a 5 V» quiere decir «5 V más que la masa».', svg: S.heights, q: mcq('¿Por qué un medidor de tensión necesita dos puntas?', ['Porque mide la diferencia entre dos puntos', 'Por si una falla', 'Para que pase más carga', 'Para medir más rápido'], 'La tensión siempre compara un punto con otro.') };
  C.ba_vdiff.alts.push({ title: 'Súbelos y bájalos', text: 'Mueve las alturas de A y B. La tensión entre ellos es la resta: si están a la misma altura no hay tensión, aunque los dos estén muy altos.', tune: { viz: 'vLevels', params: { A: { label: 'Punto A', val: 9, min: 0, max: 12, step: 0.5, unit: 'V', dec: 1 }, B: { label: 'Punto B', val: 4, min: 0, max: 12, step: 0.5, unit: 'V', dec: 1 } } }, q: mcq('A y B están los dos a 12 V respecto a masa. ¿Tensión entre A y B?', ['0 V', '24 V', '12 V', '6 V'], 'Misma altura: ninguna diferencia.') });
  Object.assign(C, {
    ba_cellsum: { name: 'Pilas en serie', alts: [
      { title: 'Escalones que se apilan', text: 'Unir pilas en serie (el + de una con el − de la siguiente) es apilar escalones: las tensiones se suman. Tres pilas de 1,5 V dan 4,5 V. Si una va del revés, en vez de subir un escalón lo baja: se resta.', svg: S.stack, q: mcq('Tres pilas de 1,5 V en serie, una de ellas del revés. ¿Tensión total?', ['1,5 V', '4,5 V', '3 V', '0 V'], '1,5 + 1,5 − 1,5.') },
      { title: 'Móntalas', text: 'Añade pilas y gira alguna. Cada pila bien puesta sube un escalón; cada una del revés lo baja.', tune: { viz: 'cells', params: { n: { label: 'Pilas', val: 3, min: 1, max: 6, step: 1, dec: 0 }, v: { val: 1.5, list: [1.5, 3.7], fixed: true }, rev: { label: 'Del revés (0 o 1)', val: 0, list: [0, 1], dec: 0 }, load: { val: 0, list: [0, 1], fixed: true } } }, q: mcq('Dos celdas de litio de 3,7 V en serie dan…', ['7,4 V', '3,7 V', '0 V', '1,85 V'], 'Se suman.') }
    ] }
  });
  C.ba_wqv.alts[1] = { title: 'Una bomba que sube la carga', text: 'Piensa en la pila como una bomba que sube cada culombio una altura de V voltios. Al bajar por el resto del circuito, cada culombio suelta esa energía: V julios. Para Q culombios, <b>W = Q · V</b>.', svg: S.pump, q: mcq('Una pila de 9 V. ¿Cuánta energía recibe cada culombio que la atraviesa?', ['9 J', '1 J', '0,11 J', '18 J'], '1 V = 1 J por culombio.') };
  C.ba_wqv.alts.push({ title: 'Cambia la batería', text: 'Mueve la capacidad y la tensión: la carga solo depende de los mAh, pero la energía es carga por tensión.', tune: { viz: 'energyQV', params: { mAh: { label: 'Capacidad', val: 1000, list: [500, 1000, 2000, 3000, 5000, 10000], unit: 'mAh', dec: 0 }, V: { label: 'Tensión', val: 3.7, list: [1.2, 1.5, 3.7, 7.4, 12], unit: 'V', dec: 1 } } }, q: mcq('Misma carga y el doble de tensión. ¿Energía?', ['El doble', 'La misma', 'La mitad', 'Cuatro veces más'], 'W = Q · V: proporcional a V.') });
  Object.assign(C, {
    ba_mahc: { name: 'mAh: la carga de una batería', alts: [
      { title: 'Corriente por tiempo', text: 'Si Q = I · t, una corriente por un tiempo es una carga. <b>1 mAh</b> es 1 mA durante una hora: 0,001 A × 3600 s = <b>3,6 C</b>. Una batería de 2000 mAh guarda 7200 C.', svg: S.mah, q: mcq('¿Cuántos culombios son 1000 mAh?', ['3600 C', '1000 C', '3,6 C', '60 C'], '1 A durante 3600 s.') },
      { title: 'Un depósito', text: 'Los mAh dicen cuánta carga cabe en el depósito, no cuánta energía: para la energía falta saber a qué tensión sale esa carga. Por eso dos baterías con los mismos mAh pueden guardar energías muy distintas.', q: mcq('Una batería pone «3000 mAh». ¿Qué te dice?', ['Cuánta carga guarda', 'Cuánta energía guarda', 'Su tensión', 'Su peso'], 'mAh = corriente × tiempo = carga.') }
    ] }
  });
  C.ba_wh.alts = [
    { title: 'Carga no es energía', text: 'Los <b>mAh</b> miden carga. Los <b>Wh</b> (vatios-hora) miden energía: son una unidad más cómoda que el julio para baterías (1 Wh = 3600 J). Para pasar de carga a energía multiplica por la tensión: 2000 mAh a 3,7 V = 2 Ah × 3,7 V = <b>7,4 Wh</b>.', svg: S.mah, q: mcq('Una batería de 7,4 V y 1000 mAh. ¿Energía?', ['7,4 Wh', '1000 Wh', '0,74 Wh', '7400 Wh'], '1 Ah × 7,4 V.') },
    { title: 'Compara con Wh', text: 'Una batería de 3,7 V y 3000 mAh y otra de 12 V y 1000 mAh: ¿cuál guarda más? Por los mAh parece la primera, pero en energía la primera tiene 11,1 Wh y la segunda 12 Wh. Los mAh solo sirven para comparar baterías de la <b>misma tensión</b>; para todo lo demás, Wh.', q: mcq('¿Qué cifra usas para comparar una batería de 3,7 V con una de 12 V?', ['Los Wh', 'Los mAh', 'Los voltios', 'El peso'], 'Energía = carga × tensión.') },
    { title: 'Juega con la batería', text: 'Prueba a conseguir la misma energía con distintas tensiones: con el doble de tensión basta la mitad de mAh.', tune: { viz: 'energyQV', params: { mAh: { label: 'Capacidad', val: 2000, list: [500, 1000, 2000, 3000, 5000, 10000], unit: 'mAh', dec: 0 }, V: { label: 'Tensión', val: 3.7, list: [1.2, 1.5, 3.7, 7.4, 12], unit: 'V', dec: 1 } } }, q: mcq('¿Cuántos julios son 2 Wh?', ['7200 J', '3600 J', '120 J', '2000 J'], '2 × 3600.') }
  ];
  Object.assign(C, {
    ba_resist: { name: 'Qué es la resistencia', alts: [
      { title: 'Un tubo estrecho', text: 'La resistencia es lo que le cuesta a la corriente atravesar algo, como a un río un tubo estrecho. Con el mismo empuje, más resistencia significa menos corriente. Se mide en <b>ohmios</b> (Ω): 1 kΩ = 1000 Ω y 1 MΩ = 1 000 000 Ω.', tune: { viz: 'water', params: { h: { val: 6, min: 1, max: 10, step: 1, fixed: true }, w: { label: 'Estrechez del tubo', val: 2, min: 1, max: 10, step: 1, dec: 0 } } }, q: mcq('Con el mismo empuje, más resistencia significa…', ['Menos corriente', 'Más corriente', 'La misma corriente', 'Más tensión'], 'Más freno, menos caudal.') },
      { title: 'El freno calienta', text: 'Al vencer una resistencia, la energía se convierte en calor. Las estufas y tostadoras usan hilos con mucha resistencia a propósito; en un cable, en cambio, queremos poquísima para que no se caliente.', svg: S.heat, q: mcq('¿Qué pasa con la energía al atravesar una resistencia?', ['Se convierte en calor', 'Desaparece', 'Vuelve a la pila', 'Se convierte en carga'], 'La energía no se pierde: se transforma.') },
      { title: 'Unidades', text: 'Ω es el ohmio. Con prefijos: <b>4,7 kΩ = 4700 Ω</b>, <b>2,2 MΩ = 2 200 000 Ω</b>. Un cable tiene centésimas de ohmio; una resistencia para circuitos, de decenas de ohmios a megaohmios.', q: mcq('¿Qué es 4,7 kΩ?', ['4700 Ω', '0,0047 Ω', '47 Ω', '4 700 000 Ω'], 'k = × 1000.') }
    ] }
  });
  C.resistance.alts.push({ title: 'Estira y engorda el hilo', text: 'Cambia el material, el largo y el grosor del hilo y mira la resistencia: es proporcional a la longitud y va al revés que la sección.', tune: { viz: 'wire', params: { mat: { label: 'Material (1 cobre · 2 aluminio · 3 nicromo)', val: 1, list: [1, 2, 3], dec: 0 }, L: { label: 'Longitud', val: 4, min: 1, max: 20, step: 1, unit: 'm', dec: 0 }, S: { label: 'Sección', val: 1, list: [0.5, 1, 1.5, 2.5, 4, 6], unit: 'mm²', dec: 1 } } }, q: mcq('Mismo hilo, el triple de largo. ¿Resistencia?', ['El triple', 'Un tercio', 'La misma', 'Nueve veces más'], 'Proporcional a la longitud.') });
  Object.assign(C, {
    ba_nominal: { name: 'Tensiones de pilas y fuentes', alts: [
      { title: 'La tabla de bolsillo', text: 'AA y AAA: 1,5 V. Botón CR2032: 3 V. Celda de litio: 3,7 V (4,2 V llena). USB: 5 V. Pila cuadrada: 9 V (seis celdas de 1,5 V dentro). Lo decide la química de cada celda.', svg: S.nominal, q: mcq('¿Qué tensión da un puerto USB?', ['5 V', '230 V', '1,5 V', '12 V'], 'USB: 5 V.') },
      { title: 'Nominal no es exacta', text: 'La tensión nominal es la típica. Una alcalina nueva marca algo más de 1,5 V y baja según se gasta; una celda de litio va de unos 4,2 V llena a unos 3 V vacía, y pasa casi todo el tiempo cerca de 3,7 V.', svg: S.cell, q: mcq('Una celda de litio recién cargada marca…', ['Unos 4,2 V', '3,7 V exactos', '1,5 V', '5 V'], '4,2 V llena; 3,7 V es la nominal.') }
    ] }
  });
  C.ba_rint.alts[0] = { title: 'Un freno escondido', text: 'Dentro de una pila hay un pequeño freno: su <b>resistencia interna</b>. Si le pides poca corriente apenas se nota, pero si le pides mucha, parte del empuje se queda dentro y la tensión en los bornes baja. Y en un cortocircuito, ese freno y el de los cables son lo único que limita la corriente.', svg: S.rint, q: mcq('Una pila marca 9,3 V sin nada y 7,5 V con un motor. ¿Por qué?', ['Por su resistencia interna: con mucha corriente pierde tensión dentro', 'El motor fabrica tensión', 'El medidor falla', 'Está rota'], 'Parte del empuje se queda dentro.') };
  C.ba_rint.alts.push({ title: 'Ponle carga pesada', text: 'Activa la carga pesada y mira cuánto baja la tensión en los bornes. Con más pilas en serie también se suman sus frenos internos.', tune: { viz: 'cells', params: { n: { label: 'Pilas', val: 4, min: 1, max: 6, step: 1, dec: 0 }, v: { label: 'Tipo de pila', val: 1.5, list: [1.5, 3.7], unit: 'V', dec: 1 }, rev: { val: 0, list: [0, 1], fixed: true }, load: { label: 'Carga pesada (0 no · 1 sí)', val: 1, list: [0, 1], dec: 0 } } }, q: mcq('Al gastarse una pila, su resistencia interna…', ['Sube, y con carga da menos tensión', 'Baja', 'Desaparece', 'No cambia nunca'], 'Por eso una pila vieja «miente» si la mides sin carga.') });

  // Retoques de orden: nada de lo que se enseña más adelante en las alternativas de m1
  C.ba_materials.alts[1].text = C.ba_materials.alts[1].text.replace('para llevar la corriente', 'para llevar la electricidad').replace('los componentes que controlan la corriente', 'los componentes electrónicos');
  C.current.alts[1].q = mcq('En un circuito con una pila y una bombilla, ¿dónde pasa más carga cada segundo?', ['Igual en todos los puntos', 'Justo al salir de la pila', 'Antes de la bombilla', 'Después de la bombilla'], 'Sin desvíos, por todos los puntos pasa lo mismo.');
  C.ba_convdir.alts[1].text = C.ba_convdir.alts[1].text.replace('en esquemas, flechas y fórmulas', 'en dibujos, flechas y fórmulas');
  C.ba_wqv.alts[2].q.e = 'W = Q · V: el doble de tensión, el doble de energía.';
  C.resistance.alts[0].q.e = '0,1 Ω por metro: 5 m tienen 0,5 Ω.';
  C.resistance.alts[1].q.e = 'El doble de largo, el doble de resistencia.';
  C.resistance.alts[2].text = 'Cambia el material, el largo y el grosor del hilo y mira la resistencia: crece con la longitud y baja con la sección.';
  C.resistance.alts[2].q.e = 'El triple de largo, el triple de resistencia.';
  C.ba_rint.alts[0].text = C.ba_rint.alts[0].text.replace(' Y en un cortocircuito, ese freno y el de los cables son lo único que limita la corriente.', '');
  C.ba_rint.alts[1] = { title: 'Gastada = más resistencia', text: 'Al gastarse, la resistencia interna de una pila sube. Por eso una pila vieja puede marcar 9 V sin nada conectado y caer a 7 V en cuanto le conectas un motor: para comprobar una pila, mídela con algo conectado.', q: mcq('Una pila marca 1,5 V sin nada y 1,1 V con carga. ¿Por qué?', ['La corriente provoca caída en su resistencia interna', 'El medidor falla', 'La carga genera tensión', 'La pila es de 1,1 V'], 'Parte de la tensión se queda dentro de la pila.') };

  /* ===================== GENERADORES ===================== */
  Gen.add('chargeI', () => {
    if (Math.random() < 0.3) { const I = pick([0.5, 2, 0.1, 1.5]), t = pick([10, 20, 60, 4]); return { ...N(`Pasan ${fmt(I)} A durante ${t} s. ¿Cuánta carga ha pasado, en culombios?`, I * t, 'C', `Q = I · t = ${fmt(I)} × ${t} = ${fmt(I * t)} C.`), h: 'Si I = Q / t, entonces la carga es corriente por tiempo.' }; }
    const Q = pick([2, 6, 10, 0.5, 0.06, 0.3, 12]), t = pick([1, 2, 3, 5, 10, 60]), I = Q / t;
    if (I >= 0.1) return { ...N(`Pasan ${fmt(Q)} C en ${t} s. ¿Corriente en amperios?`, I, 'A', `I = Q / t = ${fmt(Q)} / ${t} = ${fmt(I, 3)} A.`), h: 'I = Q / t: culombios entre segundos.' };
    return { ...N(`Pasan ${fmt(Q)} C en ${t} s. ¿Corriente en miliamperios?`, I * 1000, 'mA', `I = ${fmt(Q)} / ${t} = ${fmt(I, 4)} A = ${fmt(I * 1000, 2)} mA.`), h: 'Divide culombios entre segundos y pasa los amperios a mA (× 1000).' };
  }, 'charge');
  Gen.add('prefixAmp', () => {
    const cases = [
      () => { const v = pick([0.02, 0.015, 0.25, 0.005, 0.12]); return N(`${fmt(v, 4)} A son… ¿cuántos miliamperios?`, v * 1000, 'mA', `× 1000 → ${fmt(v * 1000)} mA.`); },
      () => { const v = pick([20, 350, 4.5, 1200]); return N(`${fmt(v)} mA son… ¿cuántos amperios?`, v / 1000, 'A', `÷ 1000 → ${fmt(v / 1000, 4)} A.`); },
      () => { const v = pick([2, 0.5, 0.05, 1.5]); return N(`${fmt(v)} mA son… ¿cuántos microamperios?`, v * 1000, 'µA', `De m a µ bajas un peldaño: × 1000 → ${fmt(v * 1000)} µA.`); },
      () => { const v = pick([500, 2500, 80, 10]); return N(`${fmt(v)} µA son… ¿cuántos miliamperios?`, v / 1000, 'mA', `÷ 1000 → ${fmt(v / 1000, 3)} mA.`); }
    ];
    return { ...pick(cases)(), h: 'Entre A, mA y µA hay saltos de 1000: prefijo más pequeño, número más grande.' };
  }, 'ba_ampconv');
  Gen.add('cellsSeries', () => {
    const v = pick([1.5, 1.5, 3.7]), n = ri(2, 6), r = Math.random() < 0.4 ? ri(1, Math.floor(n / 2)) : 0, V = (n - 2 * r) * v;
    return { ...N(`${n} pilas de ${fmt(v)} V en serie${r ? `, ${r === 1 ? 'una' : r} de ellas del revés` : ', todas bien puestas'}. ¿Tensión total?`, V, 'V', r ? `Las ${n - r} bien puestas suman ${fmt((n - r) * v)} V y las ${r} del revés restan ${fmt(r * v)} V: ${fmt(V)} V.` : `${n} × ${fmt(v)} = ${fmt(V)} V.`), h: 'Suma las que van bien y resta las que van del revés.' };
  }, 'ba_cellsum');
  Gen.add('whBatt', () => {
    const mAh = pick([500, 1000, 2000, 2500, 3000, 5000, 10000]), V = pick([3.7, 7.4, 12, 1.2]), Wh = mAh / 1000 * V;
    return { ...N(`Una batería de ${fmt(V)} V y ${mAh} mAh. ¿Cuánta energía guarda, en Wh?`, Wh, 'Wh', `${fmt(mAh / 1000)} Ah × ${fmt(V)} V = ${fmt(Wh, 2)} Wh.`), h: 'Pasa los mAh a Ah (÷ 1000) y multiplica por los voltios.' };
  }, 'ba_wh');
  Gen.add('wireLen', () => {
    const L = pick([2, 5, 10]), R = pick([0.1, 0.2, 0.05, 0.4]);
    if (Math.random() < 0.6) { const k = pick([2, 3, 4, 0.5]); return { ...N(`${L} m de un cable tienen ${fmt(R)} Ω. ¿Cuántos ohmios tienen ${fmt(L * k)} m del mismo cable?`, R * k, 'Ω', `La resistencia crece con la longitud: × ${fmt(k)} → ${fmt(R * k, 3)} Ω.`), h: 'Doble de largo, doble de resistencia: busca por cuánto se multiplica la longitud.' }; }
    const k = pick([2, 4]); return { ...N(`Un cable tiene ${fmt(R)} Ω. Otro del mismo material y largo, pero con ${k} veces más sección. ¿Resistencia?`, R / k, 'Ω', `Más sección, menos resistencia: ÷ ${k} → ${fmt(R / k, 3)} Ω.`), h: 'Más grueso, menos resistencia: divide por las veces que aumenta la sección.' };
  }, 'resistance');

  /* ===================== LECCIONES ===================== */
  const cellsP = (o = {}) => ({ n: { label: 'Pilas', val: 1, min: 1, max: 6, step: 1, dec: 0 }, v: { label: 'Tipo de pila', val: 1.5, list: [1.5, 3.7], unit: 'V', dec: 1 }, rev: { label: 'Del revés (0 o 1)', val: 0, list: [0, 1], dec: 0 }, load: { label: 'Carga pesada (0 no · 1 sí)', val: 0, list: [0, 1], dec: 0 }, ...o });
  UNITS.push({ id: 'm1', title: 'Qué es la electricidad', desc: 'Carga, corriente, tensión, energía y resistencia desde cero, y qué hay dentro de una pila.', nodes: [
   L('b1', 'Átomos y carga eléctrica', 'bolt', ['ba_atom', 'ba_qforce', 'ba_coulomb'], [
    Q('Frotas un globo en el pelo y lo acercas a unos trocitos de papel. ¿Qué crees que pasa?', ['Los atrae y se le quedan pegados', 'Los empuja lejos', 'No pasa nada', 'El papel se quema'], 'El globo ha arrancado cargas de tu pelo y ahora atrae el papel. Vamos a ver qué son esas cargas.', { predict: true, c: 'ba_qforce', h: 'Piensa en qué le pasa a tu pelo después de frotar un globo.' }),
    I('Todo está hecho de <b>átomos</b>. En el centro, el núcleo, con <b>protones</b> (carga +) y neutrones (sin carga). Alrededor, los <b>electrones</b> (carga −).\nNormalmente hay tantos + como −: el átomo es neutro.', { svg: S.atom, more: 'Un átomo mide unos 10⁻¹⁰ m y su núcleo es unas 100 000 veces más pequeño: si el átomo fuera un estadio, el núcleo sería una canica en el centro.' }),
    { t: 'explore', title: 'Atracción y repulsión', text: 'Cambia el signo de cada carga y la distancia entre ellas. Mira las flechas.', viz: 'charges', params: { s1: { label: 'Carga izquierda (−1 o +1)', val: 1, list: [-1, 1], dec: 0 }, s2: { label: 'Carga derecha (−1 o +1)', val: -1, list: [-1, 1], dec: 0 }, d: { label: 'Separación', val: 5, min: 1, max: 5, step: 1, dec: 0, unit: 'cm' } },
      tasks: [
        { q: 'rep', min: 1, max: 1, text: 'Haz que se repelan', done: 'Mismo signo (+ y + o − y −): se empujan.', hint: 'Pon las dos cargas con el mismo signo.' },
        { q: 'strongAtt', min: 1, max: 1, text: 'Ahora que se atraigan con mucha fuerza', done: 'Signos distintos y muy cerca: la fuerza crece muchísimo.', hint: 'Signos distintos y acércalas.' },
        { q: 'weakRep', min: 1, max: 1, text: 'Que se repelan, pero casi sin fuerza', done: 'Lejos, la fuerza es pequeña.' }
      ] },
    I('Cargas <b>iguales se repelen</b>; <b>distintas se atraen</b>.\nY cuanto más cerca están, más fuerte es el empujón o el tirón.', { svg: S.forces }),
    Q('¿Qué carga tiene un electrón?', ['Negativa', 'Positiva', 'Ninguna', 'Depende del material'], 'Electrones −, protones +.', { c: 'ba_atom', h: 'Los del núcleo son los positivos.' }),
    Q('Dos objetos con carga negativa se acercan. ¿Qué pasa?', ['Se repelen', 'Se atraen', 'Nada', 'Se neutralizan'], 'Iguales se repelen.', { c: 'ba_qforce', h: 'Mismo signo o signo distinto: ¿cuál de los dos casos es?' }),
    I('Los protones no salen del núcleo. Lo que pasa de un objeto a otro son <b>electrones</b>.\nQuien <b>gana</b> electrones queda negativo; quien los <b>pierde</b>, positivo.', { svg: S.balloon, more: 'Por eso el globo atrae el papel: sus cargas negativas empujan los electrones del papel hacia el otro lado, y el lado más cercano queda positivo y se siente atraído.' }),
    Q('Al frotar un globo en el pelo, el globo queda negativo. ¿Qué ha ganado?', ['Electrones', 'Protones', 'Átomos enteros', 'Neutrones'], 'Los electrones son los que se mueven.', { c: 'ba_atom', h: 'Negativo = le sobra lo que es negativo.' }),
    I('En los metales, algunos electrones están poco atados y saltan de átomo en átomo: son los <b>electrones libres</b>.\nCuando todos avanzan hacia el mismo lado, tenemos electricidad en movimiento.', { svg: S.freeE }),
    I('La carga se mide en <b>culombios</b> (C). Un electrón tiene tan poca que hacen falta unos <b>6,24 × 10¹⁸</b> para juntar 1 C.', { svg: S.sack }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '¿Cuántos electrones hay en 1 µC (un microculombio)?', steps: ['1 µC = <b>10⁻⁶ C</b>', 'Cada culombio son 6,24 × 10¹⁸ electrones', 'Multiplica: 6,24 × 10¹⁸ × 10⁻⁶', 'Suma los exponentes: 18 + (−6) = <b>12</b>'], result: '6,24 × 10¹² electrones: más de seis billones' },
    Q('Un objeto ha perdido electrones. ¿Qué carga tiene?', ['Positiva', 'Negativa', 'Ninguna', 'Depende del tamaño'], 'Le sobran protones: positiva.', { c: 'ba_atom', h: 'Si se van los negativos, ¿qué queda sobrando?' }),
    Q('¿Cuántos electrones hacen falta para 2 C?', ['Unos 1,25 × 10¹⁹', 'Unos 6,24 × 10¹⁸', 'Dos', 'Unos 3,12 × 10¹⁸'], '2 × 6,24 × 10¹⁸ = 12,48 × 10¹⁸ = 1,248 × 10¹⁹.', { c: 'ba_coulomb', h: 'Cada culombio son 6,24 × 10¹⁸ electrones: multiplícalo por 2.' }),
    { t: 'match', q: '¿Qué partícula es?', pairs: [['Carga +, en el núcleo', 'Protón'], ['Carga −, alrededor', 'Electrón'], ['Sin carga, en el núcleo', 'Neutrón'], ['Salta entre átomos de un metal', 'Electrón libre']], c: 'ba_atom', h: 'Empieza por la que no tiene carga.' },
    I('<b>Resumen</b>\n· Protones (+) en el núcleo; electrones (−) alrededor.\n· Iguales se repelen, distintas se atraen; más cerca, más fuerza.\n· Lo que se mueve son electrones. La carga se mide en culombios.')
   ]),
   L('b2', 'Conductores, aislantes y semiconductores', 'bolt', ['ba_materials'], [
    Q('Una bombilla se enciende si cierras su circuito con algo. Pruebas con una moneda y con una goma de borrar. ¿Con cuál crees que se enciende?', ['Con la moneda', 'Con la goma', 'Con las dos', 'Con ninguna'], 'La moneda es de metal y está llena de electrones libres; la goma casi no tiene.', { predict: true, c: 'ba_materials', h: 'Piensa de qué están hechos los cables por dentro.' }),
    { t: 'explore', title: 'Cuatro materiales', text: 'Elige un material y empújalo. Los puntos amarillos son electrones libres en movimiento.', viz: 'matFlow', params: { mat: { label: 'Material (1 cobre · 2 agua · 3 silicio · 4 plástico)', val: 2, list: [1, 2, 3, 4], dec: 0 }, push: { label: 'Empuje', val: 5, min: 0, max: 10, step: 1, dec: 0 }, heat: { label: 'Luz o calor', val: 0, min: 0, max: 10, step: 1, dec: 0 } },
      tasks: [
        { q: 'best', min: 1, max: 1, text: 'Elige el material que mejor deja pasar la carga', done: 'El cobre: muchísimos electrones libres. Es un conductor.', hint: 'Prueba el 1.' },
        { q: 'insul', min: 1, max: 1, text: 'Empuja al máximo y consigue que no pase nada', done: 'El plástico: sus electrones están atados. Es un aislante.', hint: 'Elige el plástico y sube el empuje a 10.' },
        { q: 'si', min: 1, max: 1, text: 'Haz que el silicio conduzca bastante', done: 'Con luz o calor el silicio conduce más: se puede controlar. Es un semiconductor.', hint: 'Elige el silicio y sube la luz o el calor.' }
      ] },
    I('<b>Conductores</b> (cobre, aluminio, plata, oro): muchísimos electrones libres.\n<b>Aislantes</b> (plástico, goma, vidrio, madera seca, aire seco): casi ninguno.', { svg: S.copperVsPlastic, more: 'La plata es el mejor conductor, pero es cara; el cobre es casi igual de bueno y mucho más barato. El aluminio conduce algo peor, pero pesa poco: se usa en los grandes tendidos eléctricos. El oro no se oxida: por eso recubre algunos contactos.' }),
    { t: 'match', q: 'Clasifica cada material.', pairs: [['Cobre', 'Conductor'], ['Goma', 'Aislante'], ['Silicio', 'Semiconductor'], ['Aluminio', 'Conductor ']], c: 'ba_materials', h: 'Los metales conducen; los plásticos y gomas, no.' },
    Q('¿Por qué los cables llevan cobre dentro y plástico fuera?', ['El cobre conduce y el plástico aísla y protege', 'El plástico conduce mejor', 'Para que pesen menos', 'Por estética'], 'Conductor para llevar, aislante para proteger.', { c: 'ba_materials', h: 'Uno de los dos tiene que dejar pasar y el otro, impedirlo.' }),
    I('Ojo con el <b>agua</b>: la del grifo lleva sales disueltas que se mueven y conducen. Tu cuerpo, lleno de agua salada, también.\nElectricidad y agua, nunca juntas.', { svg: S.water }),
    Q('El agua del grifo…', ['Conduce por las sales disueltas: nunca uses aparatos eléctricos mojados', 'Es un aislante perfecto', 'Es un semiconductor', 'Solo conduce caliente'], 'Las sales la hacen conductora.', { c: 'ba_materials', h: '¿Qué lleva disuelto el agua del grifo que el agua pura no tiene?' }),
    I('Los <b>semiconductores</b>, como el silicio, están en medio: conducen poco, pero se puede <b>controlar</b> cuánto (con luz, calor o añadiéndoles otras sustancias).\nCon ellos se fabrican los componentes electrónicos que verás más adelante.', { svg: S.silicon }),
    Q('¿Qué material es la base de casi todos los componentes electrónicos modernos?', ['Silicio', 'Cobre', 'Plástico', 'Oro'], 'De ahí el nombre de Silicon Valley.', { c: 'ba_materials', h: 'Busca el semiconductor.' }),
    Q('Un material conduce poco, pero mucho más cuando le da la luz. ¿Qué es seguramente?', ['Un semiconductor', 'Un aislante', 'Un metal', 'Un plástico'], 'Conducir «a medias» y de forma controlable es lo propio de un semiconductor.', { c: 'ba_materials', h: '¿Qué tipo de material se puede controlar?' }),
    { t: 'order', q: 'Ordena de mejor a peor conductor.', items: ['Cobre', 'Agua del grifo', 'Goma'], e: 'Metal, agua con sales y aislante.', c: 'ba_materials', h: 'El metal va primero y el aislante, el último.' },
    I('<b>Resumen</b>\n· Conductor: muchos electrones libres (metales).\n· Aislante: casi ninguno (plástico, goma, vidrio).\n· Semiconductor: pocos y controlables (silicio).\n· El agua del grifo conduce: cuidado.')
   ]),
   L('b3', 'La corriente: carga en movimiento', 'bolt', ['current', 'charge', 'ba_ampconv', 'ba_drift', 'ba_convdir'], [
    Q('Enciendes una linterna. ¿Qué crees que hacen los electrones libres de sus cables?', ['Avanzan todos en la misma dirección', 'Se quedan quietos', 'Desaparecen en la bombilla', 'Saltan fuera del cable'], 'Se ponen en marcha a la vez y en la misma dirección: eso es una corriente eléctrica.', { predict: true, c: 'current', h: 'Recuerda los puntos amarillos que corrían por el cobre.' }),
    I('La <b>corriente</b> es la carga que pasa por un punto cada segundo.\nComo contar los coches que cruzan un peaje cada segundo.', { svg: S.gate }),
    { t: 'explore', title: 'El punto de control', text: 'Elige cuánta carga pasa y en cuánto tiempo. Abajo ves la corriente.', viz: 'chargeFlow', params: { Q: { label: 'Carga que pasa', val: 1, list: [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20], dec: 2, unit: 'C' }, t: { label: 'Tiempo', val: 1, min: 1, max: 10, step: 1, dec: 0, unit: 's' } },
      tasks: [
        { q: 'I', min: 1.99, max: 2.01, text: 'Consigue 2 A', done: '2 culombios cada segundo: 2 amperios.', hint: 'Por ejemplo, 10 C en 5 s.' },
        { q: 'I', min: 0.0199, max: 0.0201, text: 'Ahora 20 mA (0,02 A)', done: 'Muy poca carga por segundo: miliamperios.', hint: 'Elige una carga pequeña o un tiempo largo.' },
        { q: 'r3', min: 1, max: 1, text: 'Consigue 500 mA con un tiempo de 4 s', done: '2 C en 4 s = 0,5 A = 500 mA.' }
      ] },
    I('Su fórmula: <b>I = Q / t</b>. Se mide en <b>amperios</b> (A): 1 A es 1 culombio cada segundo.', { svg: S.iqt, more: 'La I viene del francés «intensité». Por eso también se dice «intensidad de corriente».' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Por un cable pasan 10 C en 5 s. ¿Qué corriente circula?', steps: ['Fórmula: <b>I = Q / t</b>', 'Sustituye: I = 10 C / 5 s', 'I = <b>2 A</b> (2 culombios cada segundo)', 'En miliamperios: 2 × 1000 = <b>2000 mA</b>'], result: '2 A = 2000 mA' },
    G('chargeI'),
    I('En electrónica casi siempre hay corrientes pequeñas: <b>1 mA = 0,001 A</b> y <b>1 µA = 0,000 001 A</b>.', { svg: S.ampScale }),
    G('prefixAmp'),
    Q('Los electrones de un cable avanzan a menos de un milímetro por segundo. Entonces, ¿por qué la luz se enciende al instante?', ['El cable ya está lleno de electrones y el empuje mueve a todos a la vez', 'En realidad viajan a la velocidad de la luz', 'La lámpara tenía electrones guardados', 'El interruptor fabrica electrones'], 'Lo que llega rápido es el empuje, no cada electrón.', { predict: true, c: 'ba_drift', h: 'Imagina un tubo lleno de canicas.' }),
    I('Como un tubo lleno de canicas: empujas una y sale otra por el otro lado en el acto, aunque cada una avance muy poco.', { svg: S.marbles }),
    I('Por convenio, la corriente se dibuja saliendo del <b>+</b> de la pila y volviendo por el <b>−</b>: es el <b>sentido convencional</b>.\nLos electrones van al revés, pero las cuentas salen igual.', { svg: S.convDir, more: 'El sentido se eligió hacia 1800, antes de saber que en los cables lo que se mueve son electrones (negativos). Cuando se descubrió, ya estaba todo escrito con el convenio y se quedó así.' }),
    Q('¿Por qué polo sale la corriente convencional de una pila?', ['Por el +', 'Por el −', 'Por los dos', 'Por ninguno'], 'Del + al − por fuera de la pila.', { c: 'ba_convdir', h: 'El convenio dice al revés que los electrones.' }),
    Q('¿La corriente que vuelve a la pila es menor que la que sale?', ['No, es la misma', 'Sí, la bombilla se queda una parte', 'Sí, la mitad', 'Depende'], 'La carga no se gasta: da la vuelta entera.', { c: 'current', h: 'Por cualquier punto de un camino sin desvíos pasa lo mismo.' }),
    Nm('Por un cable pasan 0,5 C cada segundo. ¿Corriente en mA?', 500, 'mA', '0,5 A × 1000 = 500 mA.', { c: 'charge', h: 'Culombios por segundo son amperios; luego pasa a mA.' }),
    G('prefixAmp'),
    I('<b>Resumen</b>\n· Corriente = carga por segundo: <b>I = Q / t</b>, en amperios.\n· 1 A = 1000 mA; 1 mA = 1000 µA.\n· La corriente no se gasta; llega al instante; se dibuja del + al −.')
   ]),
   L('b4', 'La tensión: el empuje', 'bat', ['ba_vdiff', 'ba_cellsum'], [
    Q('Un pájaro se posa en un cable de la luz y no le pasa nada. ¿Por qué crees que es?', ['Sus dos patas tocan el mismo cable: no hay diferencia de empuje entre ellas', 'Los pájaros no conducen', 'Las plumas aíslan', 'Esos cables no llevan nada'], 'La electricidad empuja de un punto a otro solo si entre ellos hay una diferencia. Eso es la tensión.', { predict: true, c: 'ba_vdiff', h: 'Fíjate en dónde están sus dos patas.' }),
    { t: 'explore', title: 'Alturas eléctricas', text: 'A y B son dos puntos de un circuito. Mueve su «altura» eléctrica respecto al suelo (la masa).', viz: 'vLevels', params: { A: { label: 'Punto A', val: 9, min: 0, max: 12, step: 0.5, unit: 'V', dec: 1 }, B: { label: 'Punto B', val: 0, min: 0, max: 12, step: 0.5, unit: 'V', dec: 1 } },
      tasks: [
        { q: 'vab', min: 5, max: 5, text: 'Consigue 5 V entre A y B', done: 'La tensión es la diferencia: A − B.', hint: 'Por ejemplo, A a 9 V y B a 4 V.' },
        { q: 'vab', min: -12, max: -0.5, text: 'Pon B más alto que A', done: 'Sale negativa: el empuje va de B hacia A.' },
        { q: 'same6', min: 1, max: 1, text: 'Pon los dos muy altos (6 V o más) pero sin tensión entre ellos', done: 'Como el pájaro: mucha altura, pero ninguna diferencia.' }
      ] },
    I('La <b>tensión</b> (o voltaje) es la diferencia de «altura eléctrica» entre dos puntos: el empuje que mueve la carga de uno a otro.\nSe mide en <b>voltios</b> (V) y siempre es <b>entre dos puntos</b>.', { svg: S.heights, more: 'También se llama diferencia de potencial: el potencial de un punto es su «altura» eléctrica. Como con las alturas, solo importa la diferencia.' }),
    I('Para no repetir «respecto a qué», elegimos un punto de referencia, la <b>masa</b> (GND), y le damos 0 V. Casi siempre es el − de la pila.', { svg: S.gnd }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'El punto A está a 9 V y el punto B a 4 V, los dos respecto a masa. ¿Qué tensión hay entre A y B?', steps: ['La tensión entre dos puntos es su <b>diferencia</b>', 'V<sub>AB</sub> = V<sub>A</sub> − V<sub>B</sub>', 'V<sub>AB</sub> = 9 − 4 = <b>5 V</b>'], result: 'Entre A y B hay 5 V (A es el más alto)' },
    Q('¿Por qué los aparatos que miden tensión tienen dos puntas?', ['Porque la tensión es una diferencia entre dos puntos', 'Por si una se rompe', 'Una para ir y otra para volver', 'Para medir más rápido'], 'Siempre se compara un punto con otro.', { c: 'ba_vdiff', h: 'La tensión nunca es de un punto solo.' }),
    Nm('A está a 12 V y B a 3,3 V respecto a masa. ¿Tensión entre A y B?', 8.7, 'V', '12 − 3,3 = 8,7 V.', { c: 'ba_vdiff', h: 'Resta: la del primer punto menos la del segundo.', tol: 0.05 }),
    I('Dentro de la pila, la química sube cada culombio de carga una «altura» de V voltios.\nEn números: <b>1 V = 1 julio por culombio</b>, la energía que recibe cada culombio (la energía la verás en la próxima lección).', { svg: S.pump }),
    { t: 'explore', title: 'Pilas en fila', text: 'Pon pilas una detrás de otra y gira alguna.', viz: 'cells', params: cellsP({ v: { val: 1.5, list: [1.5, 3.7], fixed: true }, load: { val: 0, list: [0, 1], fixed: true } }),
      tasks: [
        { q: 'V', min: 6, max: 6, text: 'Consigue 6 V', done: 'Cuatro pilas de 1,5 V: los escalones se apilan.', hint: '¿Cuántas veces cabe 1,5 en 6?' },
        { q: 'v4', min: 3, max: 3, text: 'Con 4 pilas, consigue solo 3 V', done: 'Una del revés baja un escalón en vez de subirlo: 1,5 + 1,5 + 1,5 − 1,5.', hint: 'Gira una.' },
        { q: 'V', min: 0, max: 0, text: 'Consigue 0 V con pilas puestas', done: 'Dos pilas enfrentadas: una empuja contra la otra.' }
      ] },
    I('Pilas <b>en serie</b> (el + de una con el − de la siguiente): <b>las tensiones se suman</b>.\nUna del revés <b>resta</b>.', { svg: S.stack }),
    Q('Dos pilas de 1,5 V en serie (+ con −) dan…', ['3 V', '1,5 V', '0 V', '2,25 V'], 'En serie se suman.', { c: 'ba_cellsum', h: 'Cada pila bien puesta añade su escalón.' }),
    Q('¿Y si pones una del revés (+ con +)?', ['Se restan: 0 V', 'Se suman: 3 V', 'Explotan', '1,5 V'], 'Una empuja contra la otra.', { c: 'ba_cellsum', h: 'La del revés baja un escalón.' }),
    G('cellsSeries'),
    Q('El − de una pila de 9 V está unido a masa. ¿A qué tensión está su + respecto a masa?', ['9 V', '0 V', '−9 V', '4,5 V'], 'La masa es 0 V y el + está 9 V por encima.', { c: 'ba_vdiff', h: 'Masa vale 0 V: el otro polo está a toda la tensión de la pila.' }),
    I('<b>Resumen</b>\n· Tensión = diferencia de «altura eléctrica» entre dos puntos, en voltios.\n· Masa (GND) = el punto de referencia, 0 V.\n· Pilas en serie: se suman; una del revés resta.')
   ]),
   L('b9', 'Energía, trabajo y carga', 'bat', ['ba_wqv', 'ba_mahc', 'ba_wh'], [
    Q('Una batería de 3,7 V y 3000 mAh y otra de 12 V y 1000 mAh. ¿Cuál crees que guarda más energía?', ['La de 12 V y 1000 mAh', 'La de 3000 mAh', 'Las dos igual', 'No hay forma de saberlo'], 'Por poco: 12 Wh frente a 11,1 Wh. Para saberlo hay que multiplicar carga por tensión, y eso es lo que vas a aprender.', { predict: true, c: 'ba_wh', h: 'Piensa si basta con mirar un solo número.' }),
    I('La <b>energía</b> es la capacidad de hacer algo: calentar, iluminar, mover. Se mide en <b>julios</b> (J).\nSubir una manzana un metro cuesta más o menos 1 J.', { svg: S.apple }),
    I('Cada culombio que atraviesa la pila recibe V julios; luego los suelta por el circuito.\nPara Q culombios: <b>W = Q · V</b> (W de «work», trabajo).', { svg: S.wqv }),
    Q('¿Cuánta energía reciben 2 C al atravesar una pila de 1,5 V?', ['3 J', '0,75 J', '1,5 J', '2 J'], 'W = Q · V = 2 × 1,5 = 3 J.', { c: 'ba_wqv', h: 'Multiplica los culombios por los voltios.' }),
    { t: 'explore', title: 'Dentro de una batería', text: 'Elige la capacidad (en mAh) y la tensión. Mira la carga y la energía.', viz: 'energyQV', params: { mAh: { label: 'Capacidad', val: 1000, list: [500, 1000, 2000, 3000, 5000, 10000], unit: 'mAh', dec: 0 }, V: { label: 'Tensión', val: 3.7, list: [1.2, 1.5, 3.7, 7.4, 12], unit: 'V', dec: 1 } },
      tasks: [
        { q: 'Wh', min: 10, max: 1000, text: 'Consigue una batería de más de 10 Wh', done: 'Más carga o más tensión: más energía.', hint: 'Sube cualquiera de los dos.' },
        { q: 't2', min: 1, max: 1, text: 'Consigue exactamente 7,4 Wh con 3,7 V', done: '2000 mAh × 3,7 V = 7,4 Wh.' },
        { q: 't3', min: 1, max: 1, text: 'Ahora los mismos 7,4 Wh, pero con 7,4 V', done: 'Con el doble de tensión basta la mitad de carga: 1000 mAh.' }
      ] },
    I('Los <b>mAh</b> de una batería son <b>carga</b>: corriente por tiempo.\n1 mAh = 0,001 A × 3600 s = <b>3,6 C</b>.', { svg: S.mah }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Una batería de móvil de 3,7 V y 2000 mAh. ¿Cuánta energía guarda?', steps: ['Carga: 2000 mAh = 2 Ah = 2 A durante 3600 s', 'En culombios: 2 × 3600 = <b>7200 C</b>', 'Energía: W = Q · V = 7200 × 3,7 = <b>26 640 J</b>', 'Para baterías se usa el Wh (vatio-hora): 1 Wh = 3600 J', '26 640 / 3600 = <b>7,4 Wh</b>. Atajo: Ah × V = 2 × 3,7'], result: 'Unos 26 600 J = 7,4 Wh' },
    Nm('¿Cuántos culombios son 500 mAh?', 1800, 'C', '0,5 A × 3600 s = 1800 C.', { c: 'ba_mahc', h: 'Pasa a amperios y a segundos: 0,5 A durante una hora.' }),
    Nm('Una batería de 3,7 V y 2000 mAh. ¿Energía en Wh?', 7.4, 'Wh', '2 Ah × 3,7 V = 7,4 Wh.', { c: 'ba_wh', h: 'Ah por voltios da Wh.' }),
    G('whBatt'),
    Q('Para comparar baterías de distinta tensión, ¿qué cifra sirve?', ['Los Wh (energía)', 'Los mAh (carga)', 'Los voltios', 'El tamaño'], 'Los mAh solo sirven para comparar baterías de la misma tensión.', { c: 'ba_wh', h: 'Busca la que tiene en cuenta carga y tensión a la vez.' }),
    Q('Una batería externa de 3,7 V y 10 000 mAh viaja en avión. Las aerolíneas suelen limitar a 100 Wh sin permiso. ¿Cuántos Wh tiene?', ['37 Wh', '10 000 Wh', '3,7 Wh', '370 Wh'], '10 Ah × 3,7 V = 37 Wh: por debajo del límite habitual.', { c: 'ba_wh', h: 'Pasa los mAh a Ah y multiplica por la tensión.' }),
    I('La energía no aparece ni desaparece: <b>cambia de forma</b>. La pila la saca de una reacción química y el circuito la convierte en luz, calor o movimiento.', { svg: S.chain }),
    Q('¿En qué se convierte la energía de la pila en una estufa eléctrica?', ['En calor', 'Desaparece', 'Vuelve a la pila', 'En carga'], 'Cambia de forma: aquí, en calor.', { c: 'ba_wqv', h: 'La energía nunca desaparece: ¿qué notas cerca de una estufa?' }),
    I('<b>Resumen</b>\n· Energía en julios: <b>W = Q · V</b>.\n· mAh = carga (1 mAh = 3,6 C). Wh = energía (1 Wh = 3600 J).\n· Energía de una batería: Ah × V = Wh.')
   ]),
   L('b5', 'La resistencia: el freno', 'res', ['ba_resist', 'resistance'], [
    Q('Con el mismo empuje, ¿por dónde crees que pasa más agua: por una manguera ancha o por una pajita?', ['Por la manguera ancha', 'Por la pajita', 'Igual por las dos'], 'La pajita frena más el agua. A la corriente le pasa lo mismo: hay cosas que la frenan más que otras.', { predict: true, c: 'ba_resist', h: 'Piensa en sorber un batido por una pajita fina.' }),
    { t: 'explore', title: 'Agua y tubos', text: 'El depósito empuja el agua por un tubo. Cambia lo estrecho que es.', viz: 'water', params: { h: { val: 6, min: 1, max: 10, step: 1, fixed: true }, w: { label: 'Estrechez del tubo', val: 4, min: 1, max: 10, step: 1, dec: 0 } },
      tasks: [
        { q: 'flow', min: 2.99, max: 3.01, text: 'Consigue el doble de caudal que ahora', done: 'Un tubo la mitad de estrecho deja pasar el doble.', hint: 'Ensancha el tubo.' },
        { q: 'flow', min: 0, max: 0.7, text: 'Ahora casi corta el paso', done: 'Mucha estrechez: el agua apenas pasa.' }
      ] },
    I('La <b>resistencia</b> es el freno que pone algo al paso de la corriente. Con el mismo empuje, más resistencia → menos corriente.\nSe mide en <b>ohmios</b> (Ω): 1 kΩ = 1000 Ω; 1 MΩ = 1 000 000 Ω.', { svg: S.pipeRes, more: 'El nombre viene de Georg Ohm, que en el siglo XIX midió cómo dependía la corriente del hilo que usaba.' }),
    I('Al vencer una resistencia, la energía se convierte en <b>calor</b>. Las tostadoras y estufas lo aprovechan.', { svg: S.heat }),
    Q('¿Qué es 4,7 kΩ?', ['4700 Ω', '0,0047 Ω', '47 Ω', '4 700 000 Ω'], 'k = × 1000.', { c: 'ba_resist', h: 'k vale 1000.' }),
    { t: 'explore', title: 'El hilo', text: 'Cambia el material, la longitud y el grosor del hilo.', viz: 'wire', params: { mat: { label: 'Material (1 cobre · 2 aluminio · 3 nicromo)', val: 1, list: [1, 2, 3], dec: 0 }, L: { label: 'Longitud', val: 2, min: 1, max: 20, step: 1, unit: 'm', dec: 0 }, S: { label: 'Sección', val: 1, list: [0.5, 1, 1.5, 2.5, 4, 6], unit: 'mm²', dec: 1 } },
      tasks: [
        { q: 'trip', min: 1, max: 1, text: 'Con cobre, consigue el triple de resistencia que ahora', done: 'Triple de largo (o largo y medio con la mitad de grosor): triple de resistencia.', hint: 'Prueba 6 m.' },
        { q: 'r5', min: 0, max: 0.03, text: 'Con 5 m de cable, consigue menos de 0,03 Ω', done: 'Un cable grueso apenas frena: por eso los cables de mucha corriente son gordos.', hint: 'Pon 5 m y sube la sección.' },
        { q: 'nic10', min: 9, max: 11.5, text: 'Con nicromo, consigue unos 10 Ω, como una tostadora', done: 'El nicromo frena mucho más que el cobre: ideal para calentar.' }
      ] },
    I('La resistencia de un hilo depende de tres cosas: el <b>material</b>, la <b>longitud</b> y la <b>sección</b> (el grosor).\n<b>R = ρ · L / S</b>', { svg: S.wires, more: 'ρ (la letra griega «ro») es la resistividad del material. En Ω · mm² / m: cobre 0,017; aluminio 0,028; nicromo 1,1. Un metro de cobre de 1 mm² tiene unos 0,017 Ω.' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '2 m de cable tienen 0,1 Ω. ¿Cuánto tienen 6 m del mismo cable?', steps: ['Mismo material y grosor: solo cambia la longitud', '6 m es el <b>triple</b> de 2 m', 'Triple de longitud → triple de resistencia', '0,1 × 3 = <b>0,3 Ω</b>'], result: '0,3 Ω' },
    Q('2 m de cable tienen 0,1 Ω. ¿Y 5 m del mismo cable?', ['0,25 Ω', '0,5 Ω', '0,1 Ω', '0,04 Ω'], 'Por metro, 0,05 Ω: 5 × 0,05 = 0,25 Ω.', { c: 'resistance', h: 'Calcula cuánto tiene cada metro.' }),
    Q('El doble de sección, mismo material y longitud…', ['La mitad de resistencia', 'El doble', 'La misma', 'Cuatro veces más'], 'Más grueso, menos freno.', { c: 'resistance', h: 'Un tubo más ancho frena menos.' }),
    Q('¿Por qué los cables de un horno son más gruesos que los de un cargador?', ['Llevan mucha más corriente y deben tener poca resistencia para no calentarse', 'Para que no se rompan', 'Por el color', 'Porque son más largos'], 'Más corriente, más sección.', { c: 'resistance', h: 'Recuerda qué produce la resistencia cuando pasa mucha corriente.' }),
    G('wireLen'),
    I('Las <b>resistencias</b> también son piezas: componentes con un valor fijo que ponemos a propósito para limitar la corriente donde queramos. Las usarás en tu primer circuito.', { svg: S.resistor }),
    Q('¿De qué se hace el hilo que calienta una tostadora?', ['De nicromo: frena mucho y aguanta el calor', 'De cobre, que conduce mejor', 'De plástico', 'De silicio'], 'Para calentar interesa mucha resistencia.', { c: 'resistance', h: 'Aquí se busca calentar, no llevar la corriente sin pérdidas.' }),
    I('<b>Resumen</b>\n· Resistencia = freno a la corriente, en ohmios (Ω).\n· Al vencerla, la energía se vuelve calor.\n· Más largo → más R; más grueso → menos R; depende del material.')
   ]),
   L('b7', 'Fuentes de energía', 'bat', ['ba_nominal', 'ba_cellsum', 'ba_rint'], [
    Q('Una pila de 9 V marca 9,3 V sin nada conectado. Le conectas un motor que pide mucha corriente. ¿Qué crees que marcará?', ['Algo menos, por ejemplo 7,5 V', 'Exactamente 9 V', 'Más de 9,3 V', '0 V'], 'Baja: una parte del empuje se queda dentro de la pila. Verás por qué.', { predict: true, c: 'ba_rint', h: 'Piensa si la pila es perfecta por dentro.' }),
    I('Una <b>pila</b> convierte energía química en eléctrica. La química de sus materiales decide la tensión de cada celda: alcalina 1,5 V, litio 3,7 V.', { svg: S.cell }),
    { t: 'explore', title: 'Monta tu batería', text: 'Elige el tipo de pila, cuántas pones en serie y si les pides mucha corriente.', viz: 'cells', params: cellsP(),
      tasks: [
        { q: 'li74', min: 1, max: 1, text: 'Consigue 7,4 V con celdas de litio', done: 'Dos celdas de 3,7 V: así son muchas baterías de drones y radiocontrol.', hint: 'Cambia el tipo a 3,7 V.' },
        { q: 'aa9', min: 1, max: 1, text: 'Ahora 9 V con pilas de 1,5 V', done: 'Seis de 1,5 V: justo lo que hay dentro de una pila cuadrada.' },
        { q: 'dropT', min: 1, max: 100, text: 'Con esas seis, activa la carga pesada', done: 'La tensión en los bornes cae: la resistencia interna se queda parte del empuje.' }
      ] },
    I('Tensiones que conviene saberse:', { svg: S.nominal, more: 'Las recargables de níquel (NiMH) dan 1,2 V. Una celda de litio va de unos 4,2 V llena a unos 3 V vacía.\nTambién existen las fuentes de laboratorio: aparatos que dan la tensión que elijas con un mando. Las usarás más adelante.' }),
    { t: 'match', q: 'Une cada fuente con su tensión.', pairs: [['Pila AA', '1,5 V'], ['Celda de litio', '3,7 V'], ['USB', '5 V'], ['Pila cuadrada', '9 V']], c: 'ba_nominal', h: 'La más pequeña, la AA; la cuadrada lleva seis AA en fila.' },
    Q('Cuatro pilas AA en serie dan…', ['6 V', '1,5 V', '4 V', '3 V'], '4 × 1,5 V = 6 V.', { c: 'ba_cellsum', h: 'Cada AA da 1,5 V y en serie se suman.' }),
    I('Dentro de cada pila hay un pequeño freno: su <b>resistencia interna</b>. Si le pides mucha corriente, parte del empuje se queda dentro y la tensión en los bornes baja.\nLas pilas gastadas tienen más.', { svg: S.rint }),
    Q('Una pila de 9 V marca 9,3 V sin nada y 7,5 V con un motor. ¿Por qué?', ['Con mucha corriente pierde tensión en su resistencia interna', 'El motor fabrica tensión', 'El medidor falla', 'Está rota'], 'Más corriente, más tensión perdida dentro.', { c: 'ba_rint', h: 'Recuerda el freno que hay dentro de la pila.' }),
    Q('Una pila vieja marca 1,5 V sin nada conectado, pero la linterna apenas luce. ¿Por qué?', ['Su resistencia interna ha subido: al pedirle corriente, su tensión cae', 'El medidor miente siempre', 'Las pilas viejas dan más tensión', 'La linterna está fría'], 'Por eso una pila se comprueba mejor con algo conectado.', { c: 'ba_rint', h: '¿Qué le pasa a una pila gastada cuando le pides corriente?' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Quieres unos 6 V con pilas AA. ¿Cuántas necesitas y cómo las pones?', steps: ['Cada AA da <b>1,5 V</b>', '6 / 1,5 = <b>4</b> pilas', 'En serie: el + de cada una con el − de la siguiente', 'Comprueba: 1,5 + 1,5 + 1,5 + 1,5 = 6 V'], result: 'Cuatro AA en serie' },
    G('cellsSeries'),
    Q('El puerto USB de un cargador de móvil da…', ['5 V', '230 V', '1,5 V', '12 V'], 'USB: 5 V.', { c: 'ba_nominal', h: 'Es la tensión estándar de los cargadores.' }),
    Q('Una celda de litio recién cargada marca…', ['Unos 4,2 V', '3,7 V exactos', '1,5 V', '5 V'], '4,2 V llena; 3,7 V es la tensión nominal (la típica).', { c: 'ba_nominal', h: 'La nominal es la tensión típica, no la de recién cargada.' }),
    I('<b>Resumen</b>\n· Alcalina 1,5 V · litio 3,7 V (4,2 llena) · USB 5 V · pila cuadrada 9 V.\n· En serie se suman.\n· Resistencia interna: con mucha corriente, la tensión baja (y más si la pila está gastada).')
   ])
  ],
  /* ===================== EXAMEN DE NIVEL (banco propio) ===================== */
  exam: [
   // b1 · átomos y carga
   Q('Un objeto neutro gana 3 electrones y otro objeto neutro pierde 3. Los acercas. ¿Qué pasa?', ['Se atraen: uno queda negativo y el otro positivo', 'Se repelen: los dos han cambiado igual', 'Nada: el total sigue siendo neutro', 'Se repelen solo si están muy cerca'], 'El que gana electrones queda negativo; el que los pierde, positivo. Signos distintos se atraen.', { c: 'ba_qforce', h: 'Primero decide el signo de cada objeto; luego aplica iguales/distintos.', l: 'b1' }),
   Q('Dos cargas se atraen. Si las separas el doble, ¿qué pasa?', ['Se siguen atrayendo, pero con menos fuerza', 'Pasan a repelerse', 'La fuerza se hace mayor', 'La fuerza no cambia'], 'El signo decide si se atraen o se repelen; la distancia decide cuánta fuerza. Más lejos, menos fuerza.', { c: 'ba_qforce', h: 'Separar no cambia los signos.', l: 'b1' }),
   Q('Al frotar dos objetos, ¿por qué pasan electrones de uno a otro y no protones?', ['Los protones están en el núcleo, bien sujetos; los electrones están por fuera', 'Los protones no tienen carga', 'Los electrones pesan más', 'Los protones solo se mueven en los metales'], 'Los protones forman parte del núcleo y no salen de él. Los electrones de las capas de fuera son los que se pueden arrancar.', { c: 'ba_atom', h: 'Piensa en dónde está cada partícula dentro del átomo.', l: 'b1' }),
   Nm('¿Cuántos electrones hay en 1 mC (un miliculombio)? Escribe el exponente n de 6,24 × 10ⁿ.', 15, '', '1 mC = 10⁻³ C. 6,24 × 10¹⁸ × 10⁻³ = 6,24 × 10¹⁵ electrones.', { tol: 0, c: 'ba_coulomb', h: 'Escribe el mili como potencia de 10 y suma exponentes.', l: 'b1' }),
   // b2 · materiales
   Q('El cable de una lámpara tiene la funda pelada en un punto. ¿Por qué es peligroso?', ['El cobre conduce y queda al aire: si lo tocas, la corriente puede pasar por ti', 'El cobre pierde sus electrones al aire', 'El plástico que queda empieza a conducir', 'No lo es si el cable es fino'], 'La funda de plástico es aislante y protege. Sin ella, el conductor queda accesible, y tu cuerpo, con agua salada, también conduce.', { c: 'ba_materials', h: 'Piensa en qué hace cada una de las dos partes del cable.', l: 'b2' }),
   Q('Para el mango de un destornillador de electricista, ¿qué material elegirías?', ['Goma o plástico', 'Aluminio', 'Cobre, porque es buen material', 'Madera mojada'], 'El mango tiene que aislar tu mano: un aislante como la goma o el plástico. La madera mojada conduce por el agua.', { c: 'ba_materials', h: 'El mango no debe dejar pasar la corriente.', l: 'b2' }),
   Q('¿Qué distingue de verdad a un conductor de un aislante?', ['Cuántos electrones libres tiene', 'Que el aislante no tiene electrones', 'El color del material', 'Lo que pesa'], 'Todos los materiales tienen electrones. En un aislante están atados a sus átomos; en un conductor hay muchos libres para moverse.', { c: 'ba_materials', h: 'Un aislante tiene electrones, pero algo les pasa.', l: 'b2' }),
   // b3 · corriente
   Nm('Por un cable pasan 90 C en un minuto. ¿Qué corriente circula, en mA?', 1500, 'mA', 'Un minuto son 60 s. I = Q / t = 90 / 60 = 1,5 A = 1500 mA.', { c: 'charge', h: 'Pasa el tiempo a segundos antes de dividir.', l: 'b3' }),
   Nm('Un reloj consume 2 µA. ¿Cuántos culombios gasta en 1 000 000 s (unos 11 días)?', 2, 'C', 'Si I = Q / t, la carga es corriente por tiempo: 2 × 10⁻⁶ A × 10⁶ s = 2 C.', { c: 'charge', h: 'Corriente son culombios por segundo: multiplica por los segundos.', l: 'b3' }),
   Q('¿Cuál de estas corrientes es la mayor?', ['0,05 A', '30 mA', '4 mA', '900 µA'], '0,05 A = 50 mA, más que 30 mA. 900 µA es menos de 1 mA.', { c: 'ba_ampconv', h: 'Pásalas todas a mA.', l: 'b3' }),
   Q('Si cada electrón avanza menos de un milímetro por segundo, ¿qué es lo que viaja rápido al cerrar el interruptor?', ['El empuje, que pone en marcha a la vez a todos los electrones del cable', 'Cada electrón, a la velocidad de la luz', 'Los electrones que salen de la pila', 'Nada: la lámpara tarda minutos en encender'], 'El cable ya está lleno de electrones libres. Como en el tubo de canicas, el empuje se transmite al instante aunque cada una avance poco.', { c: 'ba_drift', h: 'Recuerda el tubo lleno de canicas.', l: 'b3' }),
   Q('En un dibujo, alguien pinta la corriente saliendo del − de la pila. ¿Qué ha hecho?', ['Ha dibujado el sentido de los electrones; por convenio se dibuja del + al −', 'Está bien: es el sentido convencional', 'Ha conseguido que las cuentas salgan distintas', 'Ha descargado la pila al revés'], 'Los electrones van del − al + por fuera de la pila, pero el sentido convencional, el que se dibuja, va del + al −. Las cuentas salen igual.', { c: 'ba_convdir', h: 'El convenio es el contrario al de los electrones.', l: 'b3' }),
   // b4 · tensión
   Q('El punto A está a 3,3 V y el B a 5 V, los dos respecto a masa. ¿Cuánto vale V_AB = V_A − V_B?', ['−1,7 V', '1,7 V', '8,3 V', '−8,3 V'], '3,3 − 5 = −1,7 V. Sale negativa porque B está más alto que A: el empuje va de B hacia A.', { c: 'ba_vdiff', h: 'Resta en el orden que dice el nombre: primero A, luego B.', l: 'b4' }),
   Q('Mides 0 V entre dos puntos de un circuito. ¿Significa que los dos están a 0 V respecto a masa?', ['No: solo que están a la misma altura; podrían estar los dos a 9 V', 'Sí, siempre', 'Sí: 0 V es la masa', 'No: significa que hay un corte entre ellos'], 'La tensión es una diferencia. Dos puntos a 9 V tienen 0 V entre ellos, como las patas del pájaro en el cable.', { c: 'ba_vdiff', h: 'Recuerda el pájaro en el cable.', l: 'b4' }),
   Q('En una pila de 9 V decides llamar masa a su polo + en vez de al −. ¿A qué tensión queda el − respecto a esa masa?', ['−9 V', '9 V', '0 V', '4,5 V'], 'La masa es solo la referencia. El − sigue estando 9 V por debajo del +: respecto al +, está a −9 V.', { c: 'ba_vdiff', h: 'La diferencia entre los polos no cambia: solo cambia desde dónde mides.', l: 'b4' }),
   Q('Pones tres celdas de litio de 3,7 V en serie, pero una del revés. ¿Qué tensión tienes?', ['3,7 V', '11,1 V', '7,4 V', '0 V'], 'Dos bien puestas suman 7,4 V y la del revés resta 3,7 V: 3,7 + 3,7 − 3,7 = 3,7 V.', { c: 'ba_cellsum', h: 'Las bien puestas suman y la del revés resta.', l: 'b4' }),
   // b9 · energía y carga
   Nm('300 C atraviesan una batería de 12 V. ¿Cuánta energía reciben, en julios?', 3600, 'J', 'W = Q · V = 300 × 12 = 3600 J (justo 1 Wh).', { c: 'ba_wqv', h: 'Cada culombio recibe tantos julios como voltios tiene la batería.', l: 'b9' }),
   Nm('Una pila recargable de 1,2 V y 2500 mAh. ¿Cuánta energía guarda, en Wh?', 3, 'Wh', '2500 mAh = 2,5 Ah; 2,5 Ah × 1,2 V = 3 Wh.', { c: 'ba_wh', h: 'Pasa los mAh a Ah y multiplica por la tensión.', l: 'b9' }),
   Q('Batería A: 3,7 V y 4000 mAh. Batería B: 7,4 V y 2000 mAh. ¿Cuál guarda más energía?', ['Las dos igual: 14,8 Wh', 'A, porque tiene más mAh', 'B, porque tiene más voltios', 'No se puede saber'], 'A: 4 Ah × 3,7 V = 14,8 Wh. B: 2 Ah × 7,4 V = 14,8 Wh. Doble de tensión con mitad de carga: la misma energía.', { c: 'ba_wh', h: 'Calcula los Wh de cada una: Ah por voltios.', l: 'b9' }),
   Nm('¿Cuántos mAh son 7200 C?', 2000, 'mAh', '1 mAh = 3,6 C, así que 7200 / 3,6 = 2000 mAh.', { c: 'ba_mahc', h: 'Cada mAh son 3,6 C: divide.', l: 'b9' }),
   Q('¿Qué mide la cifra en mAh de una batería?', ['Carga: corriente por tiempo', 'Energía', 'Tensión', 'Resistencia'], 'Miliamperios por horas es carga. Para saber la energía hace falta multiplicarla por la tensión.', { c: 'ba_mahc', h: 'Mira las dos unidades que lleva dentro: mA y h.', l: 'b9' }),
   // b5 · resistencia
   Q('¿Cuántos ohmios son 2,2 MΩ?', ['2 200 000 Ω', '2200 Ω', '0,0022 Ω', '22 000 Ω'], 'M es mega: × 1 000 000. 2,2 × 10⁶ = 2 200 000 Ω.', { c: 'ba_resist', h: 'M mayúscula: mega.', l: 'b5' }),
   Q('Con el mismo empuje, cambias un hilo por otro con más resistencia. ¿Qué pasa con la corriente?', ['Disminuye', 'Aumenta', 'No cambia', 'Cambia de sentido'], 'La resistencia es el freno: con el mismo empuje, más freno deja pasar menos corriente.', { c: 'ba_resist', h: 'Recuerda la manguera y la pajita.', l: 'b5' }),
   Nm('10 m de un cable tienen 0,2 Ω. ¿Qué resistencia tienen 30 m de un cable del mismo material pero con el doble de sección?', 0.3, 'Ω', 'Triple de longitud → × 3; doble de sección → ÷ 2. 0,2 × 3 / 2 = 0,3 Ω.', { tol: 0.01, c: 'resistance', h: 'Aplica por separado el cambio de longitud y el de sección.', l: 'b5' }),
   Nm('El cobre tiene una resistividad ρ = 0,017 Ω·mm²/m. ¿Qué resistencia tienen 10 m de cable de cobre de 0,5 mm²?', 0.34, 'Ω', 'R = ρ · L / S = 0,017 × 10 / 0,5 = 0,34 Ω.', { tol: 0.01, c: 'resistance', h: 'Usa R = ρ · L / S con L en metros y S en mm².', l: 'b5' }),
   // b7 · fuentes
   Q('Una linterna usa 3 pilas AA alcalinas. Las cambias por 3 recargables de 1,2 V. ¿Qué tensión le llega?', ['3,6 V en lugar de 4,5 V', '4,5 V, igual que antes', '1,2 V', '3,7 V'], 'En serie se suman: 3 × 1,2 = 3,6 V, frente a 3 × 1,5 = 4,5 V. Por eso algunas linternas lucen algo menos con recargables.', { c: 'ba_cellsum', h: 'Suma las tensiones de las tres.', l: 'b7' }),
   Nm('Quieres unos 12 V con pilas AA alcalinas. ¿Cuántas necesitas en serie?', 8, 'pilas', '12 / 1,5 = 8 pilas en serie.', { tol: 0, c: 'ba_cellsum', h: '¿Cuántas veces cabe 1,5 V en 12 V?', l: 'b7' }),
   Q('Dos pilas marcan 1,55 V sin nada. Con la misma carga pesada, una baja a 1,45 V y la otra a 1,1 V. ¿Cuál está más gastada?', ['La que baja a 1,1 V: tiene más resistencia interna', 'La que baja a 1,45 V', 'Las dos igual: sin carga marcan lo mismo', 'No se puede saber'], 'Sin carga casi no se nota la resistencia interna. Al pedir corriente, la pila gastada pierde mucho más empuje dentro.', { c: 'ba_rint', h: 'Fíjate en cuánta tensión pierde cada una al pedirle corriente.', l: 'b7' }),
   Q('Para saber si una pila está gastada, ¿cómo es mejor medir su tensión?', ['Con algo conectado que le pida corriente', 'Sin nada conectado', 'Dándole la vuelta', 'Después de calentarla'], 'Sin carga, incluso una pila gastada marca casi su tensión nominal. Con corriente, su resistencia interna alta la delata.', { c: 'ba_rint', h: 'La resistencia interna solo se nota cuando pasa corriente.', l: 'b7' }),
   { t: 'match', q: 'Une cada fuente con su tensión típica.', pairs: [['Celda de litio llena', '4,2 V'], ['Pila de botón CR2032', '3 V'], ['Recargable de NiMH', '1,2 V'], ['Cuatro AA en serie', '6 V']], e: 'Litio: 4,2 V llena y 3,7 V nominal. Botón: 3 V. NiMH: 1,2 V. Cuatro AA: 4 × 1,5 V.', c: 'ba_nominal', h: 'La de litio llena supera su tensión nominal; la NiMH da algo menos que una alcalina.', l: 'b7' }
  ] });
})();
