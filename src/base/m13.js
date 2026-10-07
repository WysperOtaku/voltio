/* Voltio · curso base, módulo 20: Alimentación a fondo (tras la puerta de las especialidades)
   Orden: o6 (dimensionar un buck) → o7 (supercondensadores y solar) → p13.
   Usa todo el curso base: o3 (buck), g9 (bobina), i4 (rizado), j8 (Rds(on)), g8 (½ · C · V²), o5 (cargador de litio),
   d11 (máxima potencia) y n30 (PCB). */
(() => {
  const { num, st } = Widgets.H;
  const RES = (...k) => I('<b>Resumen</b>\n· ' + k.join('\n· '));
  const LS = (label, val, list, unit = '', dec = 0) => ({ label, val, list, unit, dec });
  const SL = (label, val, min, max, step, unit = '', dec = 1) => ({ label, val, min, max, step, unit, dec });

  /* ===================== VISUALIZACIONES ===================== */
  const solar = (g) => { const Isc = 0.17 * g, Voc = 7.2 + 0.35 * Math.log(g), I = V => Math.max(0, Isc * (1 - Math.exp((V - Voc) / 0.5))); return { Isc, Voc, I }; };
  Object.assign(Widgets.VIZ, {
    buckDesign: {
      anim: true,
      calc: p => { const D = p.Vout / p.Vin, dI = (p.Vin - p.Vout) * D / (p.L * 1e-6 * p.f * 1e3), ratio = dI / p.Iout; return { D: D * 100, dI, ratio, Ipk: p.Iout + dI / 2, goodRip: ratio >= 0.2 && ratio <= 0.4 ? 1 : 0, smallL: p.f === 1000 && p.L <= 4.7 && ratio <= 0.4 ? 1 : 0, d24: p.Vin === 24 && p.Vout === 3.3 ? 1 : 0 }; },
      svg: (p, o, t) => {
        const top = Math.max(3.2, o.Ipk * 1.15), Y = i => 135 - i / top * 110, D = o.D / 100, lo = p.Iout - o.dI / 2, hi = p.Iout + o.dI / 2, x0 = 30 + ((t * 20) % 80);
        let d = ''; for (let k = -1; k < 4; k++) { const x = x0 + k * 80; d += `${k < 0 ? 'M' : 'L'}${x.toFixed(1)} ${Y(Math.max(0, lo)).toFixed(1)}L${(x + 80 * D).toFixed(1)} ${Y(hi).toFixed(1)}`; } d += `L${(x0 + 320).toFixed(1)} ${Y(Math.max(0, lo)).toFixed(1)}`;
        return `<svg viewBox="0 0 300 185" class="viz"><defs><clipPath id="bdclip"><rect x="30" y="10" width="255" height="130"/></clipPath></defs><path d="M30 12V135H285" ${st} stroke-width="1.4"/>
          <path d="M30 ${Y(p.Iout).toFixed(1)}H285" stroke="var(--ok)" stroke-dasharray="5 4"/><path d="M30 ${Y(hi).toFixed(1)}H285" stroke="var(--err)" stroke-dasharray="2 4"/>
          <path d="${d}" fill="none" stroke="var(--led)" stroke-width="3" clip-path="url(#bdclip)"/>
          <text x="36" y="22" class="vizsm">corriente en la bobina · verde: media · rojo: pico</text><text x="26" y="${(Y(0) + 4).toFixed(1)}" text-anchor="end" class="vizsm">0</text>
          <text x="10" y="158" class="vizlab">D ${num(o.D, 1)} % · ΔI ${num(o.dI, 2)} A (${num(o.ratio * 100, 0)} %) · pico ${num(o.Ipk, 2)} A</text>
          <text x="10" y="176" class="vizsm">${lo < 0 ? 'El rizado es tan grande que la corriente llega a 0: bobina demasiado pequeña' : o.ratio > 0.4 ? 'Rizado grande: pico alto y más ruido' : o.ratio < 0.2 ? 'Rizado muy pequeño: bobina más grande (y cara) de lo necesario' : 'Rizado entre el 20 y el 40 %: buen compromiso'}</text></svg>`;
      }
    },
    supercapE: {
      calc: p => { const Et = 0.5 * p.C * 2.7 * 2.7, Eu = 0.5 * p.C * (2.7 * 2.7 - p.Vmin * p.Vmin), pct = Eu / Et * 100; return { Et, Eu, pct }; },
      svg: (p, o) => {
        const w = 250 * o.pct / 100;
        return `<svg viewBox="0 0 300 150" class="viz"><rect x="25" y="40" width="250" height="26" rx="5" fill="var(--line)"/><rect x="25" y="40" width="${w.toFixed(1)}" height="26" rx="5" fill="var(--ok)"/>
          <text x="25" y="32" class="vizsm">guardada: ${num(o.Et, 1)} J · verde: lo aprovechable</text>
          <path d="M25 100H275" stroke="var(--line)" stroke-width="2"/>${[0.5, 1, 1.5, 2, 2.5].map(v => `<text x="${(25 + v / 2.7 * 250).toFixed(1)}" y="116" text-anchor="middle" class="vizsm">${num(v, 1)}</text>`).join('')}
          <circle cx="${(25 + p.Vmin / 2.7 * 250).toFixed(1)}" cy="100" r="7" fill="var(--err)"/><circle cx="275" cy="100" r="7" fill="var(--ok)"/><text x="25" y="92" class="vizsm">tensión (V): de 2,7 V hasta tu mínimo (rojo)</text>
          <text x="10" y="142" class="vizlab">Útil ${num(o.Eu, 1)} J de ${num(o.Et, 1)} J · ${num(o.pct, 0)} %</text></svg>`;
      }
    },
    solarIV: {
      calc: p => {
        const s = solar(p.luz / 100); let a = 0, b = s.Voc; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (p.R * s.I(m) > m) a = m; else b = m; }
        const V = (a + b) / 2, I = s.I(V), P = V * I; let Pm = 0, Vm = 0; for (let k = 0; k <= 300; k++) { const v = s.Voc * k / 300, q = v * s.I(v); if (q > Pm) { Pm = q; Vm = v; } }
        const ratio = P / Pm; return { V, I, P, Pm, Vm, ratio, mpp20: p.luz <= 20 && ratio >= 0.95 ? 1 : 0 };
      },
      svg: (p, o) => {
        const s = solar(p.luz / 100), X = v => 35 + v / 7.5 * 245, Y = i => 135 - i / 0.19 * 115, YP = w => 135 - w / 1.0 * 115;
        let c = '', pw = ''; for (let k = 0; k <= 60; k++) { const v = s.Voc * k / 60, i = s.I(v); c += (k ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(i).toFixed(1); pw += (k ? 'L' : 'M') + X(v).toFixed(1) + ' ' + YP(v * i).toFixed(1); }
        return `<svg viewBox="0 0 300 185" class="viz"><path d="M35 12V135H285" ${st} stroke-width="1.4"/>
          <path d="${c}" fill="none" stroke="var(--ice)" stroke-width="2.5"/><path d="${pw}" fill="none" stroke="var(--led)" stroke-width="2" stroke-dasharray="5 3"/>
          <defs><clipPath id="sivclip"><rect x="35" y="28" width="250" height="108"/></clipPath></defs><path d="M35 135L${X(7.5).toFixed(1)} ${Y(7.5 / p.R).toFixed(1)}" stroke="var(--muted)" stroke-width="1" clip-path="url(#sivclip)"/>
          <circle cx="${X(o.Vm).toFixed(1)}" cy="${YP(o.Pm).toFixed(1)}" r="5" fill="none" stroke="var(--led)" stroke-width="2"/><circle cx="${X(o.V).toFixed(1)}" cy="${Y(o.I).toFixed(1)}" r="6" fill="var(--ice)"/>
          ${[0, 2, 4, 6].map(v => `<text x="${X(v).toFixed(1)}" y="148" text-anchor="middle" class="vizsm">${v} V</text>`).join('')}
          <text x="40" y="22" class="vizsm" style="fill:var(--ice)">corriente</text><text x="100" y="22" class="vizsm" style="fill:var(--led)">potencia (círculo: el máximo)</text>
          <text x="10" y="166" class="vizlab">${num(o.V, 2)} V · ${num(o.I * 1000, 0)} mA · ${num(o.P, 2)} W</text>
          <text x="10" y="181" class="vizsm">El máximo posible ahora: ${num(o.Pm, 2)} W · aprovechas el ${num(o.ratio * 100, 0)} %</text></svg>`;
      }
    }
  });

  /* ===================== GENERADORES (con pista) ===================== */
  const { pick, fmt, N } = Gen.helpers;
  Gen.add('buckL', () => { const Vin = pick([9, 12, 24]), Vo = pick([3.3, 5]), Io = pick([1, 2, 3]), f = pick([300e3, 500e3, 1e6]), r = pick([0.2, 0.3, 0.4]), D = Vo / Vin, dI = r * Io, L = (Vin - Vo) * D / (dI * f) * 1e6; return { ...N(`Buck de ${Vin} V a ${fmt(Vo)} V y ${Io} A, a ${fmt(f / 1000)} kHz, con un rizado del ${r * 100} % (${fmt(dI, 2)} A). ¿Inductancia en µH?`, L, 'µH', `D = ${fmt(D, 3)}; L = (Vent − Vsal) · D / (ΔI · f) = ${fmt(Vin - Vo, 2)} × ${fmt(D, 3)} / (${fmt(dI, 2)} × ${fmt(f)}) ≈ ${fmt(L, 2)} µH.`, Math.max(0.1, L * 0.03)), h: 'Primero D = Vsal / Vent; luego L = (Vent − Vsal) · D / (ΔI · f). Pasa los kHz a Hz.' }; }, 'bb_buck');
  Gen.add('buckRipple', () => ({ ...Gen.make('buckRip'), h: 'D = Vsal / Vent; ΔI = (Vent − Vsal) · D / (L · f), con L en henrios y f en hercios.' }), 'bb_buck');
  Gen.add('supercapUseful', () => { const C = pick([1, 5, 10, 25, 50]), [V1, V2] = pick([[2.7, 1.8], [2.7, 1.2], [2.7, 2], [5, 3], [5, 3.3], [5.4, 2.7]]), E = 0.5 * C * (V1 * V1 - V2 * V2); return { ...N(`Supercondensador de ${C} F cargado a ${fmt(V1)} V; tu circuito funciona hasta ${fmt(V2)} V. ¿Energía útil en J?`, E, 'J', `½ · C · (V1² − V2²) = ½ × ${C} × (${fmt(V1 * V1, 2)} − ${fmt(V2 * V2, 2)}) = ${fmt(E, 2)} J.`, Math.max(0.05, E * 0.02)), h: 'Eleva al cuadrado las dos tensiones, réstalas y multiplica por ½ · C.' }; }, 'bb_supercap');
  Gen.add('solarDay', () => { if (Math.random() < 0.5) { const I = pick([40, 60, 100, 150]), h = pick([2, 3, 4, 5]); return { ...N(`Una placa da ${I} mA durante ${h} horas útiles de sol al día. ¿Cuántos mAh entran al día (sin pérdidas)?`, I * h, 'mAh', `${I} mA × ${h} h = ${I * h} mAh.`, 1), h: 'mA por horas da mAh.' }; } const c = pick([0.5, 1, 2, 5]); return { ...N(`Un sensor consume de media ${fmt(c)} mA, día y noche. ¿Cuántos mAh gasta al día?`, c * 24, 'mAh', `${fmt(c)} mA × 24 h = ${fmt(c * 24)} mAh.`, 0.5), h: 'Un día tiene 24 horas: consumo medio × 24.' }; }, 'bb_solar');

  /* ===================== CONCEPTOS NUEVOS ===================== */
  Object.assign(CONCEPTS, {
    bb_supercap: { name: 'Supercondensadores: energía útil', alts: [
      { title: 'Solo cuenta la parte útil', text: 'La energía de un condensador es <b>½ · C · V²</b> y, al descargarse, su tensión baja. Si tu circuito deja de funcionar por debajo de un mínimo, solo aprovechas <b>½ · C · (V1² − V2²)</b>. Como va al cuadrado, bajar el mínimo ayuda muchísimo. Mueve el mínimo y mira la parte verde.', tune: { viz: 'supercapE', params: { C: LS('Capacidad', 10, [1, 5, 10, 25], 'F'), Vmin: SL('Tensión mínima del circuito', 1.8, 0.5, 2.5, 0.1, 'V', 1) } }, q: mcq('1 F de 5 V a 3 V. ¿Energía útil?', ['8 J', '2 J', '12,5 J', '4,5 J'], '½ × 1 × (25 − 9) = 8 J.') },
      { title: 'Potencia sí, energía poca', text: '10 F a 2,7 V guardan ½ × 10 × 7,29 ≈ 36 J; una celda de litio de 2000 mAh y 3,7 V, unos 26 600 J. Pero el supercondensador se carga en segundos, da picos de corriente enormes, aguanta cientos de miles de ciclos y no arde. Ideal para mantener un reloj en un corte o ayudar en un pico, no para alimentar algo todo el día.', q: mcq('¿Para qué es ideal un supercondensador?', ['Mantener un reloj o una memoria en un corte, o dar picos de corriente', 'Alimentar un móvil todo el día', 'Sustituir la batería de un coche eléctrico', 'Para nada'], 'Mucha potencia y muchos ciclos, poca energía.') }
    ] }
  });

  /* ===================== LECCIONES ===================== */
  UNITS.push({ id: 'm13', title: 'Alimentación a fondo', desc: 'Diseñar un convertidor buck, supercondensadores y energía solar pequeña.', nodes: [
    L('o6', 'Dimensionar un buck', 'ic', ['bb_buck', 'bb_buckreal'], [
      Q('Un buck de 12 V a 5 V conmuta a 500 kHz. Si cambias su bobina por una con la mitad de inductancia, ¿qué crees que pasa con el rizado de corriente en la bobina?', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Desaparece'], 'Con menos inductancia, la corriente sube y baja más deprisa en cada ciclo: el rizado es inversamente proporcional a L. Hoy aprenderás a elegirla.', { predict: true, c: 'bb_buck', h: 'Recuerda V = L · ΔI / Δt de g9: con menos L, ¿cuánto cambia I en el mismo tiempo?' }),
      I('Recuerda o3: con el interruptor <b>cerrado</b>, la bobina tiene Vent − Vsal y su corriente sube; <b>abierto</b>, tiene −Vsal y baja. En equilibrio, lo que sube es igual a lo que baja, y de ahí sale <b>D = Vsal / Vent</b>.', { svg: '<svg viewBox="0 0 300 120" class="viz"><path d="M20 90L70 40L120 90L170 40L220 90L270 40" fill="none" stroke="var(--led)" stroke-width="3"/><path d="M20 65H280" stroke="var(--ok)" stroke-dasharray="5 4"/><text x="45" y="30" class="vizsm">sube: Vent − Vsal</text><text x="80" y="108" class="vizsm">baja: −Vsal</text><text x="284" y="62" text-anchor="end" class="vizsm" style="fill:var(--ok)">media = Isal</text></svg>', more: 'Durante D · T la bobina sube (Vent − Vsal) · D · T / L; durante (1 − D) · T baja Vsal · (1 − D) · T / L. Igualando: (Vent − Vsal) · D = Vsal · (1 − D) → D = Vsal / Vent.' }),
      { t: 'explore', text: 'Diseña la bobina. Naranja: la corriente en la bobina; verde: la media (la corriente de salida); rojo: el pico.', viz: 'buckDesign', params: { Vin: LS('Entrada', 12, [9, 12, 24], 'V'), Vout: LS('Salida', 5, [3.3, 5], 'V', 1), Iout: LS('Corriente de salida', 2, [0.5, 1, 2], 'A', 1), f: LS('Frecuencia', 500, [150, 500, 1000], 'kHz'), L: LS('Bobina', 2.2, [2.2, 4.7, 10, 22, 47], 'µH', 1) },
        tasks: [
          { q: 'goodRip', min: 1, max: 1, text: 'Deja el rizado entre el 20 y el 40 % de la corriente de salida', done: 'Con 10 µH, unos 0,58 A: un 29 % de 2 A.', hint: 'Sube la inductancia hasta 10 µH.' },
          { q: 'smallL', min: 1, max: 1, text: 'Sube la frecuencia a 1000 kHz y busca la bobina más pequeña que lo cumpla', done: 'Al doble de frecuencia basta la mitad de inductancia: por eso los convertidores modernos conmutan rápido y usan bobinas diminutas.', hint: 'Frecuencia 1000 kHz y 4,7 µH.' },
          { q: 'd24', min: 1, max: 1, text: 'Ahora de 24 V a 3,3 V', done: 'D cae al 14 %: pulsos muy cortos. Con diferencias tan grandes, el control lo tiene más difícil.', hint: 'Entrada 24 V y salida 3,3 V.' }
        ] },
      I('Rizado de corriente en la bobina:\n<b>ΔI = (Vent − Vsal) · D / (L · f)</b>\nSe elige ΔI ≈ 20–40 % de la corriente de salida. Despejando:\n<b>L = (Vent − Vsal) · D / (ΔI · f)</b>.'),
      { t: 'steps', text: 'Buck de 12 V a 5 V y 2 A a 500 kHz, con un rizado del 30 %. ¿Qué bobina?', steps: ['D = 5 / 12 = <b>0,417</b>', 'ΔI = 30 % de 2 A = <b>0,6 A</b>', 'L = (12 − 5) × 0,417 / (0,6 × 500 000) = 2,92 / 300 000 ≈ <b>9,7 µH</b>', 'Valor comercial: <b>10 µH</b>; corriente de pico 2 + 0,6 / 2 = <b>2,3 A</b>'], result: '10 µH que aguante más de 2,3 A sin saturarse.' },
      Nm('Buck de 12 V a 5 V y 2 A, a 500 kHz, con ΔI del 30 % (0,6 A). ¿L en µH?', 9.7, 'µH', 'D = 0,417; L = 7 × 0,417 / (0,6 × 500 000) ≈ 9,7 µH → 10 µH comercial.', { tol: 0.3, c: 'bb_buck', h: 'L = (Vent − Vsal) · D / (ΔI · f); f en hercios y el resultado en henrios.' }),
      G('buckL'), G('buckRipple'),
      Q('¿Qué corriente de saturación debe aguantar esa bobina?', ['Más que el pico, 2 A + 0,3 A = 2,3 A, con margen', '2 A justos', '0,6 A', '1 A'], 'Pico = media + ΔI / 2. Si se satura, su inductancia se desploma y la corriente se dispara (g9).', { c: 'bb_buck', h: 'La bobina ve la media más la mitad del rizado.' }),
      I('El <b>condensador de salida</b> se traga el rizado de corriente. El rizado de tensión depende sobre todo de su <b>ESR</b> (i4): <b>ΔV ≈ ΔI · ESR</b>, más un término por la capacidad. Por eso se usan cerámicos o electrolíticos de baja ESR.'),
      Nm('ΔI = 0,6 A y un condensador con 20 mΩ de ESR. ¿Rizado aproximado debido a la ESR, en mV?', 12, 'mV', '0,6 × 0,02 = 0,012 V = 12 mV.', { tol: 0.3, c: 'bb_buckreal', h: 'ΔV = ΔI · ESR; pasa los mΩ a Ω.' }),
      I('<b>Pérdidas</b>: la Rds(on) del MOSFET (I² · R, j8), el diodo (Vf · I mientras conduce), el hilo de la bobina y las propias conmutaciones. Con salidas bajas, el diodo pesa mucho: el <b>buck síncrono</b> lo cambia por un segundo MOSFET que apenas cae.'),
      Q('¿Por qué un buck síncrono rinde más que uno con diodo cuando la salida es de 3,3 V?', ['El MOSFET cae mucho menos que los 0,3–0,5 V del Schottky', 'Porque es más grande', 'Porque conmuta más despacio', 'No rinde más'], 'Con salidas bajas, la caída del diodo es una parte grande de Vsal.', { c: 'bb_buckreal', h: 'Compara la caída del diodo con la tensión de salida.' }),
      I('En la <b>PCB</b> (n30), el bucle por el que circulan los pulsos rápidos (condensador de entrada → MOSFET → diodo o segundo MOSFET) debe ser lo más pequeño posible: es una antena que radia ruido. Sigue la disposición que recomienda el fabricante del chip.', { svg: '<svg viewBox="0 0 300 120" class="viz"><rect x="60" y="25" width="50" height="30" rx="4" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="85" y="44" text-anchor="middle" class="vizsm" style="fill:currentColor">C ent.</text><rect x="125" y="25" width="50" height="30" rx="4" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="150" y="44" text-anchor="middle" class="vizsm" style="fill:currentColor">MOSFET</text><rect x="125" y="70" width="50" height="30" rx="4" fill="var(--ice-soft)" stroke="var(--ice)"/><text x="150" y="89" text-anchor="middle" class="vizsm" style="fill:currentColor">diodo</text><path d="M110 40H125M150 55V70M125 85H85V55" fill="none" stroke="var(--err)" stroke-width="3" class="a-flow"/><text x="200" y="60" class="vizsm" style="fill:var(--err)">bucle crítico:</text><text x="200" y="74" class="vizsm" style="fill:var(--err)">lo más corto posible</text></svg>' }),
      Q('En la PCB de un buck, ¿qué bucle hay que hacer lo más pequeño posible?', ['El del condensador de entrada, el MOSFET y el diodo: por ahí circulan los pulsos', 'El de la salida a la carga', 'El del LED indicador', 'Ninguno'], 'Ese bucle lleva corrientes que cambian bruscamente y radia ruido.', { c: 'bb_buckreal', h: 'Busca por dónde circulan las corrientes que se cortan de golpe.' }),
      RES('<b>D = Vsal / Vent</b>; <b>ΔI = (Vent − Vsal) · D / (L · f)</b>.', 'ΔI del 20–40 %; la bobina aguanta el <b>pico</b> = Isal + ΔI / 2.', 'Rizado de tensión ≈ ΔI · ESR.', 'Síncrono para salidas bajas; bucle de entrada mínimo en la PCB.')
    ]),
    L('o7', 'Supercondensadores y energía solar pequeña', 'bat', ['bb_supercap', 'bb_solar', 'bb_libms'], [
      Q('Un supercondensador de 10 F a 2,7 V frente a una celda de litio de 2000 mAh y 3,7 V. ¿Cuál crees que guarda más energía?', ['La celda, con muchísima diferencia', 'El supercondensador: 10 F es muchísimo', 'Los dos lo mismo', 'Depende de la temperatura'], 'El supercondensador guarda unos 36 J; la celda, unos 26 600 J. Diez faradios son muchos para un condensador, pero poco frente a una batería.', { predict: true, c: 'bb_supercap', h: 'Calcula ½ · C · V² y compáralo con V · Ah · 3600.' }),
      I('Un <b>supercondensador</b> guarda muchísima más carga que un electrolítico (de 0,1 F a miles de F), pero a poca tensión: 2,5–3 V por celda. Se carga en segundos, aguanta cientos de miles de ciclos y no arde como el litio, aunque guarda mucha menos energía.', { svg: '<svg viewBox="0 0 300 110" class="viz"><rect x="30" y="30" width="70" height="50" rx="10" fill="var(--ice)"/><text x="65" y="60" text-anchor="middle" class="vizlab" style="fill:#fff">10 F</text><text x="65" y="98" text-anchor="middle" class="vizsm">36 J</text><rect x="150" y="20" width="130" height="70" rx="10" fill="var(--led)"/><text x="215" y="60" text-anchor="middle" class="vizlab" style="fill:#14213D">Li-ion 2000 mAh</text><text x="215" y="106" text-anchor="middle" class="vizsm">26 600 J</text></svg>' }),
      { t: 'steps', text: 'Compara la energía de un supercondensador de 10 F a 2,7 V con la de una celda de 2000 mAh y 3,7 V.', steps: ['Supercondensador (g8): ½ · C · V² = ½ × 10 × 2,7² = <b>36,5 J</b>', 'Celda (b9): 3,7 V × 2 Ah = 7,4 Wh', '7,4 Wh × 3600 s = <b>26 640 J</b>', 'La celda guarda unas <b>730 veces</b> más'], result: 'Mucha potencia y ciclos, poca energía: el supercondensador es otra herramienta.' },
      { t: 'explore', text: 'Al descargarse, la tensión del supercondensador baja. Solo aprovechas la energía hasta la tensión mínima que admite tu circuito.', viz: 'supercapE', params: { C: LS('Capacidad', 10, [1, 5, 10, 25], 'F'), Vmin: SL('Tensión mínima del circuito', 1.8, 0.5, 2.5, 0.1, 'V', 1) },
        tasks: [
          { q: 'pct', min: 75, max: 100, text: 'Aprovecha más del 75 % de la energía', done: 'Hace falta bajar a 1,35 V o menos: por eso se pone un boost detrás, que sigue dando tensión aunque el condensador baje.', hint: 'Baja la tensión mínima.' },
          { q: 'pct', min: 0, max: 15, text: 'Ahora un circuito que necesita 2,5 V', done: 'Solo aprovechas un 14 %: la energía va con el cuadrado de la tensión, y casi toda está en la parte alta.', hint: 'Sube la tensión mínima a 2,5 V.' }
        ] },
      I('<b>Energía útil</b> entre la tensión de carga V1 y la mínima V2:\n<b>E = ½ · C · (V1² − V2²)</b>'),
      Nm('10 F de 2,7 V a 1,8 V. ¿Energía útil en J?', 20.25, 'J', '½ × 10 × (7,29 − 3,24) = 5 × 4,05 = 20,25 J.', { tol: 0.2, c: 'bb_supercap', h: 'Resta los cuadrados de las tensiones y multiplica por ½ · C.' }),
      G('supercapUseful'),
      Q('¿Para qué es ideal un supercondensador?', ['Mantener un reloj o una memoria en los cortes, o dar picos de corriente', 'Alimentar un móvil todo el día', 'Sustituir la batería de un coche eléctrico', 'Para nada'], 'Mucha potencia y muchos ciclos, poca energía.', { c: 'bb_supercap', h: 'Piensa en lo que hace bien y en lo que le falta.' }),
      { t: 'explore', text: 'Una placa solar «de 6 V y 1 W» con una carga resistiva. Azul: su corriente según la tensión. Naranja: la potencia.', viz: 'solarIV', params: { luz: SL('Luz', 100, 10, 100, 5, '%', 0), R: { label: 'Carga', val: 5, list: [5, 10, 22, 33, 39, 47, 68, 100, 150, 220], fmt: 'R' } },
        tasks: [
          { q: 'ratio', min: 0.95, max: 1.01, text: 'A pleno sol, busca la carga que saca casi toda la potencia', done: 'En el punto de máxima potencia (unos 6 V y 155 mA): ni la tensión ni la corriente al máximo, sino el producto.', hint: 'Prueba cargas entre 33 y 47 Ω.' },
          { q: 'mpp20', min: 1, max: 1, text: 'Baja la luz al 20 % y vuelve a buscar el máximo', done: 'Con menos luz cambia la carga ideal: por eso un cargador con MPPT la busca sin parar.', hint: 'Luz al 20 % o menos y una carga mucho mayor.' }
        ] },
      I('Una placa solar se comporta casi como una <b>fuente de corriente</b> que depende de la luz. Su potencia cambia con la tensión a la que trabaja, y hay un punto que da el máximo. Un cargador con <b>MPPT</b> (seguimiento del punto de máxima potencia) ajusta esa tensión continuamente. Es pariente de la máxima transferencia de d11.'),
      Q('¿Qué es MPPT?', ['Buscar el punto de la curva de la placa en el que da más potencia', 'Un tipo de batería', 'Un tipo de placa', 'Un fusible'], 'Seguimiento del punto de máxima potencia: el cargador ajusta la tensión a la que trabaja la placa.', { c: 'bb_solar', h: 'Recuerda dónde estaba el círculo naranja.' }),
      Q('¿Por qué no conectar una placa de 6 V directamente a una celda de litio?', ['Puede sobrecargarla: hace falta un cargador de litio (mejor con MPPT)', 'Porque no cargaría', 'Porque invierte la celda', 'Se puede sin problema'], 'Y de noche, sin un diodo, la celda se descargaría a través de la placa.', { c: 'bb_libms', h: 'Recuerda la tensión máxima de una celda de litio (o5).' }),
      { t: 'steps', text: 'Un sensor con su ESP32 durmiendo gasta de media 2 mA. En invierno hay unas 3 horas útiles de sol con 100 mA. ¿Sale el balance?', steps: ['Gasto diario: 2 mA × 24 h = <b>48 mAh</b>', 'Entrada diaria: 100 mA × 3 h = <b>300 mAh</b> (sin pérdidas)', 'Con pérdidas del cargador y nubes, quizá la mitad: <b>150 mAh</b>, aún tres veces lo gastado', 'La batería cubre las rachas sin sol: 2000 mAh / 48 mAh ≈ <b>40 días</b> de reserva'], result: 'Sale, con margen: placa pequeña, celda de litio y cargador solar.' },
      Nm('Un sensor gasta de media 2 mA. En invierno hay unas 3 horas útiles de sol con 100 mA. ¿Cuántos mAh entran al día, sin pérdidas?', 300, 'mAh', '100 mA × 3 h = 300 mAh. El sensor gasta 48 mAh al día: hay margen.', { tol: 1, c: 'bb_solar', h: 'Corriente de la placa por las horas de sol.' }),
      G('solarDay'),
      RES('Supercondensador: mucha potencia y ciclos, poca energía; útil <b>½ · C · (V1² − V2²)</b>.', 'Placa solar ≈ fuente de corriente; <b>MPPT</b> busca el máximo.', 'Entre la placa y el litio, siempre un cargador.', 'Balance diario en mAh: lo que entra frente a lo que se gasta.')
    ]),
    PRJ('p13', 'Proyecto: fuente de laboratorio con LM317', 'labPsu')
  ] });
})();
