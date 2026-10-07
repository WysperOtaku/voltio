/* Voltio · curso base, módulo 0: Números para electrónica.
   Sin ninguna unidad eléctrica: solo metros, gramos, segundos, litros y bytes.
   a1 enseña potencias de 10 y notación científica · a2 los prefijos (p…G) · a7 notación de ingeniería y cifras significativas. */
(() => {
  const { num } = Widgets.H;
  const { pick, ri, fmt, sup, uniq, MC, N } = Gen.helpers;
  // Número en español con separador de miles y sin errores de coma flotante
  const es = x => {
    if (x === 0) return '0';
    const a = Math.abs(x), d = Math.max(0, Math.min(15, 5 - Math.floor(Math.log10(a))));
    let s = (+x.toFixed(d)).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    let [i, f] = s.split('.');
    if (i.replace('-', '').length > 4) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (f && f.length > 4) f = f.replace(/(\d{3})(?=\d)/g, '$1 ');
    return f ? i + ',' + f : i;
  };
  const PFX = { '-12': 'p', '-9': 'n', '-6': 'µ', '-3': 'm', '0': '', '3': 'k', '6': 'M', '9': 'G' };
  const PNAME = { '-12': 'pico', '-9': 'nano', '-6': 'micro', '-3': 'mili', '0': '(unidad)', '3': 'kilo', '6': 'mega', '9': 'giga' };
  const engU = (x, u) => { let e = Math.floor(Math.log10(Math.abs(x)) / 3) * 3; e = Math.max(-12, Math.min(9, e)); let v = +(x / 10 ** e).toPrecision(3); if (v >= 1000 && e < 9) { v = +(v / 1000).toPrecision(3); e += 3; } return fmt(v, 3) + ' ' + PFX[e] + u; };
  const sci = x => { const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9); return fmt(+(x / 10 ** e).toPrecision(3), 3) + ' × 10' + sup(e); };

  /* ===================== VISUALIZACIONES ===================== */
  const SCALE = { '-10': ['⚛️', 'un átomo'], '-9': ['🧬', 'el grosor del ADN'], '-8': ['🦠', 'un virus pequeño'], '-7': ['🦠', 'el virus de la gripe'], '-6': ['🦠', 'una bacteria'], '-5': ['🩸', 'un glóbulo rojo'], '-4': ['💇', 'el grosor de un pelo'], '-3': ['⏳', 'un grano de arena'], '-2': ['💅', 'el ancho de una uña'], '-1': ['✋', 'una mano'], '0': ['🧒', 'un niño pequeño'], '1': ['🚌', 'un autobús'], '2': ['⚽', 'un campo de fútbol'], '3': ['🚶', 'un paseo de 12 minutos'], '4': ['🏙️', 'una ciudad mediana'], '5': ['🏝️', 'la isla de Mallorca'], '6': ['🗺️', 'la península ibérica'], '7': ['🌍', 'el diámetro de la Tierra'], '8': ['🌙', 'la distancia a la Luna'], '9': ['☀️', 'el diámetro del Sol'] };
  Object.assign(Widgets.VIZ, {
    // a1: el exponente decide cuántos ceros y a qué escala del mundo corresponde
    pow10: {
      calc: p => ({ n: p.n, v: 10 ** p.n }),
      svg: p => {
        const n = p.n, dec = n >= 0 ? es(10 ** n) : '0,' + ('0'.repeat(-n - 1) + '1').replace(/(\d{3})(?=\d)/g, '$1 ');
        const X = k => 20 + (k + 10) * 13.5, [ico, name] = SCALE[n] || ['', ''];
        let ticks = ''; for (let k = -10; k <= 9; k++) ticks += `<path d="M${X(k)} 128v${k % 5 ? 5 : 9}" stroke="var(--muted)" stroke-width="1.5"/>`;
        return `<svg viewBox="0 0 300 175" class="viz"><text x="20" y="38" class="vizbig" style="font-size:24px">10${sup(n)}</text>
          <text x="80" y="38" class="vizbig" style="font-size:${dec.length > 13 ? 15 : 19}px">= ${dec}</text>
          <text x="20" y="62" class="vizsm">${n > 0 ? `un 1 seguido de ${n} cero${n > 1 ? 's' : ''}` : n === 0 ? 'no multiplicas ninguna vez: vale 1' : `la coma salta ${-n} sitio${n < -1 ? 's' : ''} a la izquierda desde el 1`}</text>
          <text x="20" y="100" font-size="26">${ico}</text><text x="56" y="92" class="vizlab">10${sup(n)} m ≈ ${name}</text><text x="56" y="108" class="vizsm">${n < 0 ? 'diminuto' : n < 3 ? 'a escala humana' : 'enorme'}</text>
          <path d="M20 128H${X(9)}" stroke="currentColor" stroke-width="2"/>${ticks}
          <text x="${X(-10)}" y="150" class="vizsm" text-anchor="middle">10⁻¹⁰</text><text x="${X(0)}" y="150" class="vizsm" text-anchor="middle">1</text><text x="${X(9)}" y="150" class="vizsm" text-anchor="middle">10⁹</text>
          <circle cx="${X(n)}" cy="128" r="7" fill="var(--led)"/><text x="150" y="170" text-anchor="middle" class="vizsm">cada marca: × 10</text></svg>`;
      }
    },
    // a2: la escalera de prefijos con el mismo valor escrito en cada peldaño
    prefixLadder: {
      calc: p => { const v = p.q / 10 ** p.e; return { v, nice: v >= 1 && v < 1000 ? 1 : 0, t1: p.q === 2500 && p.e === 3 ? 1 : 0, t2: p.q === 0.0003 && p.e === -6 ? 1 : 0, t3: p.q === 0.047 && p.e === -3 ? 1 : 0 }; },
      svg: (p, o) => {
        const rungs = [9, 6, 3, 0, -3, -6, -9];
        const rows = rungs.map((e, i) => { const y = 22 + i * 21, on = e === p.e; return `<rect x="10" y="${y - 13}" width="88" height="18" rx="5" fill="${on ? 'var(--led)' : 'transparent'}" stroke="var(--line)"/><text x="20" y="${y}" class="vizlab" style="${on ? 'fill:#14213D' : ''}">${PFX[e] || '·'}</text><text x="38" y="${y}" class="vizsm" style="${on ? 'fill:#14213D' : ''}">${PNAME[e]} 10${sup(e)}</text>`; }).join('');
        const idx = rungs.indexOf(p.e), up = rungs[idx - 1], dn = rungs[idx + 1];
        const show = e => es(p.q / 10 ** e) + ' ' + PFX[e] + 'm';
        return `<svg viewBox="0 0 300 175" class="viz">${rows}
          <path d="M104 ${22 + idx * 21 - 4}H118" stroke="var(--led)" stroke-width="3"/>
          <text x="122" y="30" class="vizsm">${es(p.q)} m escrito así:</text>
          <text x="122" y="58" class="vizbig" style="font-size:${show(p.e).length > 18 ? 12 : show(p.e).length > 14 ? 15 : 20}px;fill:${o.nice ? 'var(--ok)' : 'currentColor'}">${show(p.e)}</text>
          <text x="122" y="76" class="vizsm">${o.nice ? 'cómodo: entre 1 y 999' : 'se puede, pero no es cómodo'}</text>
          ${up != null ? `<text x="122" y="104" class="vizsm">↑ ÷ 1000: ${show(up)}</text>` : ''}
          ${dn != null ? `<text x="122" y="122" class="vizsm">↓ × 1000: ${show(dn)}</text>` : ''}
          <text x="122" y="160" class="vizsm">cada peldaño: la coma salta 3</text></svg>`;
      }
    },
    // a7: el mismo número en científica, ingeniería y con prefijo
    engNot: {
      calc: p => { const m = p.q / 10 ** p.k; return { m, ok: m >= 1 && m < 1000 ? 1 : 0, t1: p.q === 0.000015 && p.k === -6 ? 1 : 0, t2: p.q === 47000 && p.k === 3 ? 1 : 0, t3: p.q === 3300000 && p.k === 6 ? 1 : 0 }; },
      svg: (p, o) => {
        const u = { 0.000015: 's', 47000: 'm', 3300000: 'B' }[p.q] || '';
        const what = { 0.000015: 'un destello de flash', 47000: 'una etapa de ciclismo', 3300000: 'una foto del móvil' }[p.q] || '';
        return `<svg viewBox="0 0 300 175" class="viz"><text x="14" y="24" class="vizsm">${what}</text>
          <text x="14" y="46" class="vizlab">Tal cual: ${es(p.q)} ${u}</text>
          <text x="14" y="72" class="vizlab">Científica: ${sci(p.q)} ${u}</text>
          <text x="14" y="98" class="vizlab" style="fill:${o.ok ? 'var(--ok)' : 'var(--err)'}">Ingeniería: ${es(o.m)} × 10${sup(p.k)} ${u} ${o.ok ? '✓' : '✗'}</text>
          <text x="14" y="116" class="vizsm">${o.ok ? 'exponente múltiplo de 3 y delante de 1 a 999' : o.m >= 1000 ? 'delante queda más de 999: sube el exponente' : 'delante queda menos de 1: baja el exponente'}</text>
          <rect x="14" y="128" width="272" height="34" rx="8" fill="${o.ok ? 'var(--ok-soft)' : 'var(--bg)'}" stroke="var(--line)"/>
          <text x="150" y="151" text-anchor="middle" class="vizbig" style="font-size:17px">${o.ok ? 'Con prefijo: ' + es(o.m) + ' ' + PFX[p.k] + u : '¿Con prefijo? Aún no'}</text></svg>`;
      }
    }
  });

  /* ===================== SVG DE LAS TARJETAS ===================== */
  const S = {
    zerosUp: `<svg viewBox="0 0 300 150" class="viz"><text x="20" y="34" class="vizlab">10¹ = 10</text><text x="20" y="62" class="vizlab">10² = 10 × 10 = 100</text><text x="20" y="90" class="vizlab">10³ = 10 × 10 × 10 = 1 000</text>
      <text x="20" y="128" class="vizbig" style="font-size:22px">1</text><g class="a-fade"><text x="36" y="128" class="vizbig" style="font-size:22px;fill:var(--led)">000</text></g><text x="90" y="128" class="vizsm">← tres ceros: 10³</text></svg>`,
    commaLeft: `<svg viewBox="0 0 300 150" class="viz"><text x="20" y="30" class="vizlab">10⁻³ = 1 ÷ 10 ÷ 10 ÷ 10</text>
      <text x="40" y="92" class="vizbig" style="font-size:28px;letter-spacing:6px">0 0 0 1</text><text x="150" y="92" class="vizbig" style="font-size:28px">→ 0,001</text>
      <path d="M118 102q-12 16 -24 0M94 102q-12 16 -24 0M70 102q-12 16 -24 0" stroke="var(--led)" stroke-width="2.4" fill="none" class="a-draw" style="--len:120"/>
      <text x="20" y="128" class="vizsm">La coma salta 3 sitios a la izquierda.</text><text x="20" y="144" class="vizsm">¡No sale un número negativo, sale uno pequeño!</text></svg>`,
    zerosJoin: `<svg viewBox="0 0 300 150" class="viz"><text x="20" y="40" class="vizbig" style="font-size:20px">1<tspan fill="var(--led)">00</tspan> × 1<tspan fill="var(--ice)">000</tspan></text>
      <text x="20" y="80" class="vizbig" style="font-size:20px">= 1<tspan fill="var(--led)">00</tspan><tspan fill="var(--ice)">000</tspan></text>
      <text x="20" y="118" class="vizlab">10² × 10³ = 10²⁺³ = 10⁵</text><text x="20" y="140" class="vizsm">Multiplicar junta los ceros: los exponentes se suman.</text></svg>`,
    sciMove: `<svg viewBox="0 0 300 150" class="viz"><text x="30" y="46" class="vizbig" style="font-size:26px;letter-spacing:4px">4 7 0 0</text>
      <path d="M118 54q-12 14 -24 0M94 54q-12 14 -24 0M70 54q-12 14 -24 0" stroke="var(--led)" stroke-width="2.4" fill="none" class="a-draw" style="--len:120"/>
      <text x="150" y="46" class="vizbig" style="font-size:22px">= 4,7 × 10³</text>
      <text x="30" y="100" class="vizlab">Una sola cifra delante de la coma (de 1 a 9)</text><text x="30" y="122" class="vizsm">Saltos a la izquierda → exponente positivo</text><text x="30" y="140" class="vizsm">Saltos a la derecha (números pequeños) → negativo</text></svg>`,
    ladder: `<svg viewBox="0 0 300 175" class="viz">${[9, 6, 3, 0, -3, -6, -9, -12].map((e, i) => `<rect x="${30 + i * 6}" y="${12 + i * 19}" width="120" height="16" rx="4" fill="${e === 0 ? 'var(--led)' : 'var(--ice-soft)'}" stroke="var(--line)"/><text x="${40 + i * 6}" y="${24 + i * 19}" class="vizlab" style="${e === 0 ? 'fill:#14213D' : ''}">${PFX[e] || '—'} ${PNAME[e]}</text><text x="${160 + i * 6}" y="${24 + i * 19}" class="vizsm">10${sup(e)}</text>`).join('')}
      <text x="226" y="60" class="vizsm">× 1000</text><path d="M240 70V30" stroke="var(--ok)" stroke-width="2.5" marker-end=""/><path d="M234 36l6 -8l6 8" stroke="var(--ok)" fill="none" stroke-width="2.5"/>
      <text x="226" y="130" class="vizsm">÷ 1000</text><path d="M240 100V140" stroke="var(--err)" stroke-width="2.5"/><path d="M234 134l6 8l6 -8" stroke="var(--err)" fill="none" stroke-width="2.5"/></svg>`,
    km: `<svg viewBox="0 0 300 140" class="viz"><text x="20" y="40" class="vizbig" style="font-size:24px">2 500 m</text><text x="170" y="40" class="vizbig" style="font-size:24px">2,5 km</text>
      <path d="M110 30H160" stroke="var(--led)" stroke-width="3" class="a-flow"/><text x="112" y="22" class="vizsm">÷ 1000</text>
      <path d="M160 58H110" stroke="var(--ice)" stroke-width="3" class="a-flow"/><text x="112" y="74" class="vizsm">× 1000</text>
      <text x="20" y="110" class="vizsm">Prefijo más grande → número más pequeño.</text><text x="20" y="128" class="vizsm">Es la misma distancia escrita de dos formas.</text></svg>`,
    engTable: `<svg viewBox="0 0 300 150" class="viz"><text x="14" y="26" class="vizsm">47 000 m se puede escribir:</text>
      <text x="14" y="54" class="vizlab">4,7 × 10⁴ m</text><text x="150" y="54" class="vizsm">científica</text>
      <text x="14" y="82" class="vizlab" style="fill:var(--ok)">47 × 10³ m</text><text x="150" y="82" class="vizsm">ingeniería (3, 6, 9…)</text>
      <text x="14" y="110" class="vizlab" style="fill:var(--ok)">47 km</text><text x="150" y="110" class="vizsm">10³ tiene nombre: kilo</text>
      <text x="14" y="138" class="vizsm">El exponente múltiplo de 3 se lee como prefijo.</text></svg>`,
    ruler: `<svg viewBox="0 0 300 150" class="viz"><rect x="20" y="70" width="260" height="34" fill="var(--ice-soft)" stroke="var(--line)"/>
      ${Array.from({ length: 27 }, (_, i) => `<path d="M${30 + i * 9.5} 70v${i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6}" stroke="currentColor" stroke-width="1"/>`).join('')}
      <text x="30" y="98" class="vizsm">0</text><text x="125" y="98" class="vizsm">1</text><text x="220" y="98" class="vizsm">2 cm</text>
      <rect x="30" y="44" width="233" height="16" rx="4" fill="var(--led)"/><path d="M263 44l16 8l-16 8z" fill="#E7D3A8"/>
      <text x="20" y="28" class="vizlab">Lápiz: 2,4 cm y un poco → «2,45 cm»</text><text x="20" y="128" class="vizsm">2 y 4 son seguras; el 5 es tu estimación.</text><text x="20" y="144" class="vizsm">3 cifras significativas: no tiene sentido dar 2,4513 cm.</text></svg>`,
    calc: `<svg viewBox="0 0 300 140" class="viz"><rect x="20" y="16" width="260" height="56" rx="10" fill="var(--board)"/>
      <text x="268" y="54" text-anchor="end" font-size="26" font-family="monospace" fill="#9BE7A8">0,333<tspan fill="#9BE7A8" opacity=".25">333333</tspan></text>
      <text x="20" y="100" class="vizsm">1,00 kg de arroz ÷ 3 tarros: la calculadora da 9 cifras,</text><text x="20" y="118" class="vizsm">pero el dato solo tiene 3 → 0,333 kg (333 g).</text></svg>`
  };

  /* ===================== CONCEPTOS ===================== */
  const C = CONCEPTS;
  C.ba_pow10.alts.push({ title: 'Muévelo tú', text: 'Mueve el exponente y fíjate en dos cosas: con n positivo aparecen ceros detrás del 1; con n negativo, ceros delante, después de «0,». Cada paso es multiplicar o dividir entre 10.', tune: { viz: 'pow10', params: { n: { label: 'Exponente n', val: 2, min: -10, max: 9, step: 1, dec: 0 } } }, q: mcq('¿Cuánto vale 10⁵?', ['100 000', '50', '10 000', '0,000 01'], 'Un 1 seguido de cinco ceros.') });
  C.ba_pow10op.alts.push({ title: 'Los ceros se juntan', text: 'Escríbelo con ceros y mira qué pasa: 100 × 1000 junta dos ceros y tres ceros en un número con cinco. Por eso 10² × 10³ = 10⁵: <b>los exponentes se suman</b>. Al dividir, los ceros se quitan: <b>se restan</b>.', svg: S.zerosJoin, q: mcq('¿Cuánto es 10⁶ ÷ 10²?', ['10⁴', '10⁸', '10³', '10¹²'], 'Un millón entre cien: se quitan dos ceros, quedan cuatro.') });
  C.ba_sci.alts.push({ title: 'Mira cómo salta la coma', text: 'Cuenta los saltos de la coma hasta dejar una sola cifra delante. Cada salto a la izquierda suma 1 al exponente; cada salto a la derecha (en números menores que 1) le resta 1.', svg: S.sciMove, q: mcq('¿Cómo se escribe 250 000 en notación científica?', ['2,5 × 10⁵', '25 × 10⁴', '2,5 × 10⁴', '2,5 × 10⁶'], 'Cinco saltos a la izquierda hasta dejar 2,5.') });
  C.ba_prefval.name = 'Qué vale cada prefijo';
  C.ba_prefval.alts = [
    { title: 'La escalera de mil', text: 'Los prefijos van de 1000 en 1000:\n<b>p</b> 10⁻¹² · <b>n</b> 10⁻⁹ · <b>µ</b> 10⁻⁶ · <b>m</b> 10⁻³ · (unidad) · <b>k</b> 10³ · <b>M</b> 10⁶ · <b>G</b> 10⁹.\nLos de debajo de la unidad la hacen más pequeña; k, M y G, más grande.', svg: S.ladder, q: mcq('¿Cuánto vale el prefijo «n»?', ['10⁻⁹', '10⁻⁶', '10⁹', '10⁻¹²'], 'Nano: mil veces menos que micro.') },
    { title: 'Mayúscula o minúscula', text: 'Los dos que más se confunden: <b>m</b> (mili) es una milésima y <b>M</b> (mega) es un millón. Entre uno y otro hay un factor de mil millones. Los prefijos grandes (M, G) van en mayúscula y los pequeños en minúscula; la excepción es k (kilo), que va en minúscula aunque multiplica.', q: mcq('¿Qué es 2 MB?', ['2 000 000 bytes', '0,002 bytes', '2000 bytes', '20 bytes'], 'M mayúscula: mega, un millón.') },
    { title: 'Con cosas de casa', text: 'Asocia cada prefijo a algo real: un <b>k</b>ilómetro andando (12 minutos), un <b>m</b>ilímetro (el grosor de una moneda de céntimo, más o menos), un <b>µ</b>m (una bacteria), un <b>n</b>m (el grosor del ADN), una foto de 3 <b>M</b>B y un móvil de 128 <b>G</b>B. Entre cada prefijo y el siguiente, un salto de 1000.', tune: { viz: 'pow10', params: { n: { label: 'Exponente n', val: -6, min: -10, max: 9, step: 1, dec: 0 } } }, q: mcq('¿Qué prefijo vale 10⁻⁶?', ['µ (micro)', 'm (mili)', 'n (nano)', 'M (mega)'], 'Micro: una millonésima.') }
  ];
  C.engnum.name = 'Notación de ingeniería';
  C.engnum.alts = [
    { title: 'Saltos de tres', text: 'La notación de ingeniería es la científica con una condición: el exponente siempre es múltiplo de 3 (…, −6, −3, 0, 3, 6, …) y delante queda un número de 1 a 999. Así cada exponente tiene su prefijo: 10⁻⁶ es µ y 10³ es k.\n0,000 047 s = 47 × 10⁻⁶ s = <b>47 µs</b>.', svg: S.engTable, q: mcq('¿Cómo se escribe 0,0022 g con prefijo?', ['2,2 mg', '2,2 µg', '22 mg', '0,22 mg'], '0,0022 = 2,2 × 10⁻³ → mili.') },
    { title: 'Grupos de tres cifras', text: 'Separa el número en grupos de tres cifras desde la coma, como en 2 200 000. Cada grupo completo es un peldaño de prefijo: dos grupos a la izquierda → mega: <b>2,2 MB</b>. Con decimales, igual: 0,000 150 s → dos grupos tras la coma → micro: <b>150 µs</b>.', q: mcq('¿Cómo se escribe 0,000 47 m con prefijo?', ['470 µm', '47 µm', '4,7 mm', '4,7 µm'], '0,000 47 = 470 × 10⁻⁶: micro.') },
    { title: 'Pruébalo', text: 'Elige un exponente múltiplo de 3 y mira qué número queda delante. Solo uno deja entre 1 y 999: ese es el bueno, y su prefijo te da la forma más cómoda.', tune: { viz: 'engNot', params: { q: { label: 'Cantidad', val: 47000, list: [0.000015, 47000, 3300000], dec: 6 }, k: { label: 'Exponente', val: 0, list: [-9, -6, -3, 0, 3, 6, 9], dec: 0 } } }, q: mcq('¿Cuál de estas está en notación de ingeniería?', ['47 × 10³ m', '4,7 × 10⁴ m', '0,47 × 10⁵ m', '470 × 10² m'], 'Solo 10³ es múltiplo de 3: 47 km.') }
  ];
  C.ba_sigfig.alts[1] = { title: 'Cifras que significan algo', text: 'Las cifras significativas dicen cuánto te fías de un número. Si pesas 250 g en una báscula de cocina, escribir 250,000 g es presumir de una precisión que no tienes. Regla práctica: da el resultado con tantas cifras como el dato menos preciso, normalmente 2 o 3.', svg: S.calc, q: mcq('Divides 10,0 cm entre 3 y la calculadora da 3,3333333 cm. ¿Cómo lo escribes?', ['3,33 cm', '3,3333333 cm', '3 cm', '3,333 cm'], 'El dato tiene tres cifras: el resultado, también.') };
  C.ba_sigfig.alts.push({ title: 'Lo que ves en la regla', text: 'Al medir con una regla, lees las cifras seguras y estimas una más. Esas son las significativas. Si añades más, te las inventas.', svg: S.ruler, q: mcq('Con una regla de milímetros mides 7,35 cm. ¿Cuántas cifras significativas tiene?', ['3', '2', '4', '1'], '7, 3 y la estimada, 5.') });
  // Nuevo: cambiar de prefijo con unidades cotidianas (el concepto «prefix» queda para las conversiones eléctricas)
  Object.assign(C, {
    ba_prefconv: { name: 'Cambiar de prefijo', alts: [
      { title: 'La coma salta de tres en tres', text: 'Cambiar de prefijo es mover la coma tres sitios por peldaño. Si el prefijo se hace <b>más grande</b> (de m a k), el número se hace <b>más pequeño</b>: 2500 m = 2,5 km. Si el prefijo baja (de k a m), el número crece: 1,5 km = 1500 m.', svg: S.km, q: mcq('3,2 km son…', ['3200 m', '0,0032 m', '32 m', '320 m'], 'De k a la unidad: × 1000.') },
      { title: 'Pasa por la unidad', text: 'Si te lías, pasa siempre por la unidad: primero a metros, gramos o segundos, y luego al prefijo que quieres. 70 µm = 70 × 10⁻⁶ m = 0,000 07 m = <b>0,07 mm</b>.', q: mcq('500 mg son…', ['0,5 g', '500 000 g', '5 g', '0,05 g'], '500 ÷ 1000 = 0,5.') },
      { title: 'Súbelo y bájalo', text: 'Elige una cantidad y sube o baja por la escalera. Cada peldaño hacia arriba divide el número entre 1000; hacia abajo, lo multiplica.', tune: { viz: 'prefixLadder', params: { q: { label: 'Cantidad', val: 2500, list: [2500, 0.047, 0.0003], dec: 4, unit: 'm' }, e: { label: 'Peldaño (exponente)', val: 0, list: [-9, -6, -3, 0, 3, 6, 9], dec: 0 } } }, q: mcq('0,25 s son…', ['250 ms', '0,000 25 ms', '25 ms', '2500 ms'], 'De s a ms bajas un peldaño: × 1000.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  const wrap = (key, h, c) => () => ({ ...Gen.make(key), h, ...(c ? { c } : {}) });
  Gen.add('baPow10', wrap('pow10', 'Al multiplicar potencias de 10, suma los exponentes con su signo.'), 'ba_pow10op');
  Gen.add('baPow10div', wrap('pow10div', 'Al dividir, resta el exponente de abajo al de arriba; restar un negativo es sumar.'), 'ba_pow10op');
  Gen.add('baSci', wrap('sci', 'Mueve la coma hasta dejar una sola cifra (de 1 a 9) delante y cuenta los saltos.'), 'ba_sci');
  Gen.add('baPrefName', wrap('prefixName', 'Recuerda la escalera: p, n, µ, m, (unidad), k, M, G; cada peldaño son tres ceros.'), 'ba_prefval');
  Gen.add('prefixDaily', () => {
    const cases = [
      () => { const v = pick([1.5, 2.4, 0.8, 12, 0.35]); return N(`${fmt(v)} km son… ¿cuántos metros?`, v * 1000, 'm', `k = × 1000 → ${fmt(v * 1000)} m.`); },
      () => { const v = pick([3500, 750, 42195, 120]); return N(`${es(v)} m son… ¿cuántos kilómetros?`, v / 1000, 'km', `De m a km subes un peldaño: ÷ 1000 → ${fmt(v / 1000, 3)} km.`); },
      () => { const v = pick([0.5, 0.25, 2, 0.08]); return N(`${fmt(v)} g son… ¿cuántos miligramos?`, v * 1000, 'mg', `De g a mg bajas un peldaño: × 1000 → ${fmt(v * 1000)} mg.`); },
      () => { const v = pick([500, 1200, 80, 2500]); return N(`${es(v)} mg son… ¿cuántos gramos?`, v / 1000, 'g', `÷ 1000 → ${fmt(v / 1000, 3)} g.`); },
      () => { const v = pick([250, 1500, 40, 3600]); return N(`${es(v)} ms son… ¿cuántos segundos?`, v / 1000, 's', `m divide entre 1000 → ${fmt(v / 1000, 3)} s.`); },
      () => { const v = pick([0.2, 1.5, 0.03, 0.75]); return N(`${fmt(v)} s son… ¿cuántos milisegundos?`, v * 1000, 'ms', `× 1000 → ${fmt(v * 1000)} ms.`); },
      () => { const v = pick([250, 330, 1500, 75]); return N(`${es(v)} mL son… ¿cuántos litros?`, v / 1000, 'L', `÷ 1000 → ${fmt(v / 1000, 3)} L.`); },
      () => { const v = pick([70, 500, 2500, 20]); return N(`${es(v)} µm son… ¿cuántos milímetros?`, v / 1000, 'mm', `De µ a m subes un peldaño: ÷ 1000 → ${fmt(v / 1000, 3)} mm.`); },
      () => { const v = pick([3, 64, 0.5, 128]); return N(`${fmt(v)} GB son… ¿cuántos megabytes? (con el giga de 1000)`, v * 1000, 'MB', `De G a M bajas un peldaño: × 1000 → ${fmt(v * 1000)} MB.`); }
    ];
    return { ...pick(cases)(), h: 'Si el prefijo se hace más grande, el número se hace más pequeño (÷ 1000 por peldaño), y al revés.' };
  }, 'ba_prefconv');
  Gen.add('engNotDaily', () => {
    if (Math.random() < 0.35) { const [s, n] = pick([['0,00470', 3], ['4,70 × 10³', 3], ['0,0022', 2], ['1,000', 4], ['3,30', 3], ['0,105', 3], ['12,5', 3], ['0,5', 1], ['2,200', 4]]); return MC(`¿Cuántas cifras significativas tiene ${s}?`, String(n), ['1', '2', '3', '4', '5'].filter(x => x !== String(n)), 'Los ceros de la izquierda no cuentan (solo colocan la coma). Los ceros finales después de la coma sí: dicen que se midió con esa precisión.', { c: 'ba_sigfig', h: 'Empieza a contar en la primera cifra que no es cero.' }); }
    const [s, v, u] = pick([['0,000047', 47e-6, 's'], ['2 200 000', 2.2e6, 'B'], ['0,0033', 3.3e-3, 'g'], ['0,00000015', 150e-9, 'm'], ['47 000', 47e3, 'm'], ['0,00012', 120e-6, 's'], ['16 000 000', 16e6, 'B'], ['0,022', 22e-3, 'L']]);
    return MC(`Escribe ${s} ${u} con el prefijo adecuado.`, engU(v, u), [engU(v * 1000, u), engU(v / 1000, u), engU(v * 10, u)], 'Notación de ingeniería: exponentes múltiplos de 3, que son justo los prefijos. Cuenta los grupos de tres cifras.', { h: 'Separa el número en grupos de tres cifras desde la coma: cada grupo es un peldaño de prefijo.' });
  }, 'engnum');

  /* ===================== LECCIONES ===================== */
  const pw = (val = 0) => ({ n: { label: 'Exponente n', val, min: -10, max: 9, step: 1, dec: 0 } });
  UNITS.push({ id: 'm0', title: 'Números para electrónica', desc: 'Potencias de 10, prefijos, notación de ingeniería y cifras significativas, con ejemplos de cada día.', nodes: [
   L('a1', 'Potencias de 10', 'bin', ['ba_pow10', 'ba_pow10op', 'ba_sci'], [
    Q('Si empiezas con un 1 y lo multiplicas por 10 seis veces seguidas, ¿qué número crees que sale?', ['1 000 000', '60', '100 000', '10 000 000'], 'Un 1 seguido de seis ceros: un millón. Eso se escribe 10⁶, y así nos ahorramos contar ceros.', { predict: true, c: 'ba_pow10', h: 'Cada vez que multiplicas por 10 aparece un cero más.' }),
    { t: 'explore', title: 'De un átomo al Sol', text: 'Mueve el exponente. Arriba ves el número escrito entero y abajo, algo del mundo que mide más o menos eso en metros.', viz: 'pow10', params: pw(0),
      tasks: [
        { q: 'n', min: -6, max: -6, text: 'Busca el tamaño de una bacteria: 0,000 001 m', done: '10⁻⁶ m: la coma salta seis sitios a la izquierda.', hint: 'Lleva el deslizador hacia los negativos y cuenta los ceros tras la coma.' },
        { q: 'n', min: 5, max: 5, text: 'Ahora la isla de Mallorca, unos 100 000 m', done: '10⁵ m: un 1 seguido de cinco ceros.', hint: 'Cuenta los ceros de 100 000.' },
        { q: 'n', min: -3, max: -3, text: '¿Qué potencia de 10 vale 0,001?', done: '10⁻³ = 0,001: el tamaño de un grano de arena.' }
      ] },
    I('<b>10ⁿ</b> («diez elevado a n») es multiplicar 1 por 10 n veces.\nCon n positivo es fácil de escribir: un 1 seguido de n ceros. 10³ = 1000.', { svg: S.zerosUp, more: 'Al número pequeño de arriba se le llama exponente.\n10¹ = 10 y 10⁰ = 1: si no multiplicas ninguna vez, te quedas con el 1 del principio.' }),
    I('Con n negativo, en vez de multiplicar, <b>divides</b> entre 10 esas veces.\n10⁻³ = 0,001: la coma salta tres sitios a la izquierda.', { svg: S.commaLeft, more: 'Un truco para leerlos: 10⁻ⁿ tiene el 1 en la posición n después de la coma. 10⁻² = 0,01 (el 1 en la segunda posición), 10⁻⁶ = 0,000 001 (en la sexta).' }),
    Q('¿Cuánto vale 10⁴?', ['10 000', '40', '1000', '0,0001'], 'Un 1 seguido de cuatro ceros.', { c: 'ba_pow10', h: 'Exponente positivo: un 1 seguido de tantos ceros como diga el exponente.' }),
    Q('¿Cuánto vale 10⁻²?', ['0,01', '−100', '0,2', '100'], 'Exponente negativo: el 1 en la segunda posición después de la coma.', { c: 'ba_pow10', h: 'Un exponente negativo no da un número negativo: mueve la coma a la izquierda.' }),
    I('Al <b>multiplicar</b> potencias de 10, los ceros se juntan: <b>se suman los exponentes</b>.\nAl <b>dividir</b>, los ceros se quitan: <b>se restan</b>. 10⁶ ÷ 10² = 10⁴.', { svg: S.zerosJoin, more: 'Con negativos funciona igual, pero cuidado con los signos: 10⁵ × 10⁻³ = 10⁵⁺⁽⁻³⁾ = 10². Y 10² ÷ 10⁻³ = 10²⁻⁽⁻³⁾ = 10⁵: restar un negativo es sumar.' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: '¿Cuánto es 3 000 000 × 0,002 sin calculadora?', steps: ['Escribe cada número como una cifra por una potencia de 10: 3 000 000 = <b>3 × 10⁶</b>', '0,002 = <b>2 × 10⁻³</b>', 'Multiplica las cifras: 3 × 2 = <b>6</b>', 'Suma los exponentes: 6 + (−3) = <b>3</b>', 'Junta las dos cosas: 6 × 10³'], result: 'Resultado: 6 × 10³ = 6000' },
    G('baPow10'),
    G('baPow10div'),
    I('La <b>notación científica</b> escribe cualquier número como una sola cifra (de 1 a 9), sus decimales y una potencia de 10.\n4700 = 4,7 × 10³ · 0,000 22 = 2,2 × 10⁻⁴', { svg: S.sciMove, more: 'Así se ve de un vistazo si un número es enorme o diminuto: basta mirar el exponente. Las calculadoras la muestran con una «E»: 4,7E3 significa 4,7 × 10³.' }),
    Q('El diámetro de la Tierra es de unos 12 700 000 m. ¿Cómo se escribe en notación científica?', ['1,27 × 10⁷ m', '127 × 10⁵ m', '1,27 × 10⁶ m', '12,7 × 10⁻⁶ m'], 'La coma salta siete sitios a la izquierda hasta dejar 1,27.', { c: 'ba_sci', h: 'Deja una sola cifra delante de la coma y cuenta cuántos saltos ha dado.' }),
    G('baSci'),
    Q('Un grano de arena mide unos 10⁻³ m y una playa, 10³ m. ¿Cuántos granos caben en fila a lo largo de la playa?', ['10⁶, un millón', '10⁰, uno', '10³, mil', '10⁻⁶'], '10³ ÷ 10⁻³ = 10³⁻⁽⁻³⁾ = 10⁶.', { c: 'ba_pow10op', h: 'Divide la playa entre el grano: resta los exponentes, con cuidado con el signo.' }),
    G('baSci'),
    I('<b>Resumen</b>\n· 10ⁿ: un 1 con n ceros; con n negativo, la coma salta a la izquierda.\n· Multiplicar: <b>sumar</b> exponentes. Dividir: <b>restar</b>.\n· Notación científica: una cifra delante de la coma × 10ⁿ.')
   ]),
   L('a2', 'Prefijos: de pico a giga', 'bin', ['ba_prefval', 'ba_prefconv'], [
    Q('Un móvil tiene 64 GB libres y cada foto ocupa unos 3 MB. ¿Cuántas fotos crees que caben?', ['Unas 20 000', 'Unas 20', 'Unas 200', 'Unos 20 millones'], 'G (giga) es mil veces M (mega): 64 GB = 64 000 MB, y 64 000 ÷ 3 ≈ 21 000 fotos. Las letras G y M son prefijos: atajos para potencias de 10.', { predict: true, c: 'ba_prefval', h: 'Piensa en cuántos MB hay en un GB.' }),
    { t: 'explore', title: 'La escalera de prefijos', text: 'Elige la cantidad y el peldaño de la escalera. A la derecha ves la misma longitud escrita con ese prefijo.', viz: 'prefixLadder', params: { q: { label: 'Cantidad', val: 2500, list: [2500, 0.047, 0.0003], dec: 4, unit: 'm' }, e: { label: 'Peldaño (exponente)', val: 0, list: [-9, -6, -3, 0, 3, 6, 9], dec: 0 } },
      tasks: [
        { q: 't1', min: 1, max: 1, text: 'Escribe 2500 m en kilómetros', done: '2,5 km: al subir al peldaño k, el número se divide entre 1000.', hint: 'Deja la cantidad en 2500 y sube al peldaño 3 (k).' },
        { q: 't2', min: 1, max: 1, text: 'Elige 0,0003 m y busca el peldaño que deja un número entre 1 y 999', done: '300 µm: al bajar dos peldaños, × 1000 × 1000.', hint: 'Prueba los peldaños negativos.' },
        { q: 't3', min: 1, max: 1, text: 'Lo mismo con 0,047 m', done: '47 mm: el grosor de un libro gordo.' }
      ] },
    I('Un <b>prefijo</b> es una potencia de 10 con nombre que se pega delante de la unidad.\nVan de mil en mil: <b>p n µ m</b> · (unidad) · <b>k M G</b>.', { svg: S.ladder, more: 'p pico 10⁻¹² · n nano 10⁻⁹ · µ micro 10⁻⁶ · m mili 10⁻³ · k kilo 10³ · M mega 10⁶ · G giga 10⁹.\nHay más (T tera, 10¹²; f femto, 10⁻¹⁵), pero estos son los que verás casi siempre. Un detalle: µ es la letra griega «mi»; si no la tienes en el teclado, a veces se escribe u.' }),
    I('Cambiar de prefijo es mover la coma <b>tres sitios por peldaño</b>.\nSi el prefijo crece, el número se encoge: 2500 m = 2,5 km. Y al revés.', { svg: S.km }),
    { t: 'match', q: 'Une cada prefijo con lo que hace.', pairs: [['k', '× 1000'], ['m', '÷ 1000'], ['µ', '÷ 1 000 000'], ['M', '× 1 000 000']], c: 'ba_prefval', h: 'Minúscula m divide; mayúscula M multiplica. µ es un peldaño por debajo de m.' },
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Una pastilla tiene 0,047 g de un ingrediente. Escríbelo en mg y en µg.', steps: ['De g a mg bajas un peldaño: <b>× 1000</b> (la coma tres sitios a la derecha)', '0,047 g = <b>47 mg</b>', 'De mg a µg, otro peldaño: × 1000', '47 mg = <b>47 000 µg</b>'], result: '0,047 g = 47 mg = 47 000 µg' },
    G('baPrefName'),
    G('prefixDaily'),
    Q('Un archivo de 5 MB y una hormiga de 5 mm. ¿Qué diferencia hay entre M y m?', ['M es mega (un millón) y m es mili (una milésima)', 'Ninguna: es la misma letra', 'M es mili y m es mega', 'M es metros y m es minutos'], 'Mayúscula o minúscula cambia el prefijo: entre mega y mili hay un factor de mil millones.', { c: 'ba_prefval', h: 'Los prefijos grandes van en mayúscula; los pequeños, en minúscula (salvo k).' }),
    Nm('1,5 km son… ¿cuántos metros?', 1500, 'm', 'k = × 1000: 1,5 × 1000 = 1500 m.', { c: 'ba_prefconv', h: 'k vale 1000: al quitar el prefijo, multiplica.' }),
    Nm('250 ms (milisegundos) son… ¿cuántos segundos?', 0.25, 's', 'm = ÷ 1000: 250 ÷ 1000 = 0,25 s.', { c: 'ba_prefconv', h: 'm divide entre 1000: la coma salta tres sitios a la izquierda.' }),
    Q('Un pelo mide unos 70 µm de grosor. ¿Cuántos milímetros son?', ['0,07 mm', '70 000 mm', '7 mm', '0,7 mm'], 'De µ a m subes un peldaño: ÷ 1000.', { c: 'ba_prefconv', h: 'De µ a m el prefijo crece: el número se hace 1000 veces más pequeño.' }),
    { t: 'order', q: 'Ordena de menor a mayor.', items: ['1 nm', '1 µm', '1 mm', '1 m', '1 km'], e: 'Cada uno es mil veces el anterior.', c: 'ba_prefval', h: 'Sigue la escalera de abajo arriba: n, µ, m, (unidad), k.' },
    G('prefixDaily'),
    I('<b>Resumen</b>\n· Prefijos de mil en mil: p, n, µ, m · k, M, G.\n· Prefijo más grande → número más pequeño (÷ 1000 por peldaño).\n· m (mili) y M (mega) no son lo mismo.')
   ]),
   L('a7', 'Notación de ingeniería y cifras significativas', 'bin', ['engnum', 'ba_sigfig'], [
    Q('¿Qué forma crees que es más útil para leer de un vistazo: 4,7 × 10⁴ m o 47 × 10³ m?', ['47 × 10³ m, porque se lee directamente 47 km', '4,7 × 10⁴ m, porque es más corta', 'Son igual de útiles'], 'Valen lo mismo, pero 10³ tiene nombre (k): 47 × 10³ m se lee 47 km sin pensar. Esa es la idea de la notación de ingeniería.', { predict: true, c: 'engnum', h: 'Piensa en qué potencias de 10 tienen un prefijo con nombre.' }),
    { t: 'explore', title: 'Busca el exponente bueno', text: 'Elige la cantidad y prueba exponentes múltiplos de 3. Solo uno deja delante un número entre 1 y 999.', viz: 'engNot', params: { q: { label: 'Cantidad', val: 0.000015, list: [0.000015, 47000, 3300000], dec: 6 }, k: { label: 'Exponente', val: 0, list: [-9, -6, -3, 0, 3, 6, 9], dec: 0 } },
      tasks: [
        { q: 't1', min: 1, max: 1, text: 'Pasa 0,000 015 s (un destello de flash) a ingeniería', done: '15 × 10⁻⁶ s = 15 µs.', hint: 'Prueba exponentes negativos hasta que delante quede entre 1 y 999.' },
        { q: 't2', min: 1, max: 1, text: 'Ahora 47 000 m', done: '47 × 10³ m = 47 km.' },
        { q: 't3', min: 1, max: 1, text: 'Y 3 300 000 B (bytes)', done: '3,3 × 10⁶ B = 3,3 MB.' }
      ] },
    I('<b>Notación de ingeniería</b>: como la científica, pero el exponente solo puede ser <b>múltiplo de 3</b> y delante queda un número de 1 a 999.\nVentaja: cada exponente es un prefijo.', { svg: S.engTable, more: 'Científica: 4,7 × 10⁴ (una cifra delante). Ingeniería: 47 × 10³ (exponente múltiplo de 3). Es el mismo número; lo que cambia es dónde dejas la coma.' }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Escribe 0,000 015 s con prefijo.', steps: ['Busca el múltiplo de 3 que deje un número de 1 a 999: con <b>10⁻⁶</b>, la coma salta 6 sitios', '0,000 015 = <b>15 × 10⁻⁶</b>', '10⁻⁶ es micro (µ)'], result: '0,000 015 s = 15 µs' },
    Q('¿Cuál está en notación de ingeniería?', ['220 × 10⁻⁶ m', '2,2 × 10⁻⁴ m', '22 × 10⁻⁵ m', '2200 × 10⁻⁷ m'], 'Exponente múltiplo de 3 y entre 1 y 999 delante: 220 µm.', { c: 'engnum', h: 'Busca el exponente que sea múltiplo de 3 y mira que delante haya de 1 a 999.' }),
    G('engNotDaily'),
    I('<b>Cifras significativas</b>: las que de verdad conoces.\nLos ceros de la izquierda no cuentan (0,0047 tiene 2). Los del final tras la coma sí: 2,50 kg dice que se pesó hasta los 10 g.', { svg: S.ruler, more: 'Los ceros entre cifras también cuentan: 1,05 tiene tres.\nCon números enteros acabados en ceros hay ambigüedad: ¿1200 tiene dos cifras o cuatro? La notación científica lo deja claro: 1,2 × 10³ tiene dos; 1,200 × 10³, cuatro.' }),
    Q('¿Cuántas cifras significativas tiene 0,0330?', ['3', '5', '2', '4'], 'Los ceros iniciales no cuentan; el cero final sí: 3, 3 y 0.', { c: 'ba_sigfig', h: 'Empieza a contar en la primera cifra que no es cero.' }),
    I('Un resultado no puede ser más preciso que sus datos.\nRegla: deja tantas cifras significativas como el <b>dato menos preciso</b>.', { svg: S.calc }),
    { t: 'steps', title: 'Ejemplo resuelto', text: 'Repartes 1,00 kg de arroz en 3 tarros iguales. ¿Cuánto va en cada uno?', steps: ['La calculadora: 1,00 ÷ 3 = 0,333333333 kg', 'El dato (1,00) tiene <b>3</b> cifras significativas', 'El 3 de los tarros es exacto: no limita', 'Redondea a 3 cifras: <b>0,333 kg</b>'], result: 'Unos 0,333 kg (333 g) por tarro' },
    Q('Mides un lápiz de 15,2 cm y lo cortas en 3 trozos iguales. La calculadora dice 5,0666667 cm. ¿Cómo lo escribes?', ['5,07 cm', '5,0666667 cm', '5 cm', '5,066 cm'], 'El dato tiene tres cifras significativas: el resultado no puede tener más.', { c: 'ba_sigfig', h: 'Cuenta las cifras significativas del dato medido y redondea a esas.' }),
    G('engNotDaily'),
    { t: 'match', q: 'Une cada cantidad con su forma con prefijo.', pairs: [['0,000 001 5 s', '1,5 µs'], ['33 000 m', '33 km'], ['0,000 000 010 m', '10 nm'], ['2 400 000 000 B', '2,4 GB']], c: 'engnum', h: 'Cuenta grupos de tres cifras desde la coma: cada grupo es un peldaño (k, M, G hacia arriba; m, µ, n hacia abajo).' },
    Q('¿Cuántas cifras significativas tiene 3,30 × 10³ g?', ['3', '2', '4', '5'], 'Solo cuentan las cifras de delante del × 10ⁿ: 3, 3 y 0.', { c: 'ba_sigfig', h: 'En notación científica, la potencia de 10 no cuenta: mira solo lo de delante.' }),
    I('<b>Resumen</b>\n· Ingeniería: exponente múltiplo de 3 y de 1 a 999 delante → se lee con prefijo.\n· Cifras significativas: desde la primera que no es cero.\n· Redondea el resultado a las cifras del dato menos preciso.')
   ])
  ] });
})();
