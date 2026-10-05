/* Voltio · comprobaciones de los retos de simulador y proyectos reales */
const CHECKS = (() => {
  const mA = x => Math.abs(x) * 1000;
  const lit = (api, c) => api.live[c.id] && !c.burnt && mA(api.live[c.id].I) >= 5 && mA(api.live[c.id].I) <= 25;
  const noBurnt = api => ({ label: 'Ningún componente quemado', ok: !api.model.comps.some(c => c.burnt) });
  const enoughRun = (api, s = 3) => ({ label: `Deja correr la simulación al menos ${s} s`, ok: api.stats.t >= s });
  const probeLed = (out, api) => api.comps('led').some(c => !c.burnt && out[c.id] && mA(out[c.id].I) > 3);
  const ledStats = api => api.comps('led').map(c => api.stats.comps[c.id]).filter(Boolean);
  function gate(api, want) {
    if (api.comps('push').length !== 2) return [{ label: 'Usa exactamente dos pulsadores', ok: false }];
    const res = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => probeLed(api.probe(cs => { const ps = cs.filter(c => c.type === 'push'); ps[0].pressed = !!x; ps[1].pressed = !!y; }), api) ? 1 : 0);
    return [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y], i) => ({ label: `A=${x}, B=${y} → LED ${want[i] ? 'encendido' : 'apagado'}`, ok: res[i] === want[i] }));
  }
  return {
    /* --- Curso base ampliado --- */
    polarityGuard: api => {
      const d = api.comps('diode');
      if (!d.length) return [{ label: 'Usa un diodo', ok: false }];
      return [{ label: 'El ánodo del diodo va directo al + de la pila', ok: d.some(c => api.sameNode(c, 0, 'bat+')) },
        { label: 'La corriente del LED atraviesa el diodo (más de 4 mA)', ok: d.some(c => api.live[c.id] && api.live[c.id].I > 0.004) },
        { label: 'LED encendido entre 5 y 25 mA', ok: api.comps('led').some(c => lit(api, c)) }, noBurnt(api)];
    },
    emitterFollower: api => {
      const q = api.comps('npn'), z = api.comps('zener'), L = api.live;
      if (!q.length || !z.length) return [{ label: 'Usa un transistor NPN y un zener', ok: false }];
      return [{ label: 'LED encendido entre 5 y 25 mA', ok: api.comps('led').some(c => lit(api, c)) },
        { label: 'La base está unida al cátodo del zener', ok: q.some(qc => z.some(zc => qc._nodes && zc._nodes && qc._nodes[1] === zc._nodes[1])) },
        { label: 'El zener conduce en inversa con más de 1 mA', ok: z.some(c => L[c.id] && -L[c.id].V > 3 && Math.abs(L[c.id].I) > 0.001) },
        { label: 'La corriente del LED pasa por el transistor (más de 4 mA)', ok: q.some(c => L[c.id] && Math.abs(L[c.id].I) > 0.004) },
        { label: 'El transistor no está saturado: Vce mayor de 2 V', ok: q.some(c => L[c.id] && L[c.id].V > 2 && Math.abs(L[c.id].I) > 0.004) }, noBurnt(api)];
    },
    motorFlyback: api => {
      const m = api.comps('motor'), d = api.comps('diode'), q = api.comps('npn');
      if (!m.length || !d.length || !q.length) return [{ label: 'Usa motor, transistor NPN y diodo', ok: false }];
      const on = api.probe(cs => cs.forEach(c => { if (c.type === 'push') c.pressed = true; }));
      const off = api.probe(cs => cs.forEach(c => { if (c.type === 'push') c.pressed = false; }));
      const par = d.filter(dc => m.some(mc => dc._nodes && mc._nodes && ((dc._nodes[0] === mc._nodes[0] && dc._nodes[1] === mc._nodes[1]) || (dc._nodes[0] === mc._nodes[1] && dc._nodes[1] === mc._nodes[0]))));
      return [{ label: 'Pulsado: por el motor pasan más de 200 mA', ok: m.some(c => on[c.id] && Math.abs(on[c.id].I) > 0.2) },
        { label: 'Sin pulsar: el motor está parado', ok: m.every(c => !off[c.id] || Math.abs(off[c.id].I) < 0.01) },
        { label: 'Hay un diodo en paralelo con el motor', ok: par.length > 0 },
        { label: 'El diodo está en inversa (cátodo hacia el +) y no conduce con el motor en marcha', ok: par.some(c => on[c.id] && on[c.id].V < -3 && Math.abs(on[c.id].I) < 0.001) },
        { label: 'Corriente de base menor de 20 mA', ok: q.some(c => on[c.id] && Math.abs(on[c.id].ib || 0) > 1e-5 && Math.abs(on[c.id].ib) < 0.02) }];
    },
    // Los tiempos del LED se acumulan desde que se coloca, también mientras se monta (con el circuito a medias
    // puede quedarse apagado o encendido mucho rato). Por eso se miden solo con el circuito terminado: si ha
    // cambiado desde que se abrió el reto o desde la última comprobación, la medida vuelve a empezar.
    duty555: (() => {
      const last = new WeakMap();
      const sig = m => JSON.stringify([((m && m.comps) || []).map(c => [c.id, c.type, c.at, c.dir || 0, c.val, c.color, !!c.burnt]), ((m && m.wires) || []).map(w => [w.a, w.b])]);
      return api => {
        const now = sig(api.model), fresh = now !== (last.has(api) ? last.get(api) : sig(api.cfg.initial));
        last.set(api, now);
        if (fresh) api.resetStats();
        const u = api.comps('ic555').filter(c => c._nodes), d = api.comps('diode').filter(c => c._nodes), R = api.comps('res').filter(c => c._nodes);
        let gnd; api.comps().forEach(c => (c._nodes || []).forEach((n, k) => { if (gnd === undefined && api.sameNode(c, k, 'bat-')) gnd = n; }));
        const link = (a, b) => a !== undefined && b !== undefined && (a === b || R.some(r => (r._nodes[0] === a && r._nodes[1] === b) || (r._nodes[1] === a && r._nodes[0] === b)));
        const s = ledStats(api);
        return [{ label: 'Usa un 555 con el diodo en paralelo con R2: ánodo en la pata 7 y cátodo en la 6', ok: u.some(ic => d.some(x => x._nodes[0] === ic._nodes[6] && x._nodes[1] === ic._nodes[5])) },
          { label: 'El LED va de la salida (pata 3) a masa', ok: api.comps('led').some(l => l._nodes && u.some(ic => link(l._nodes[0], ic._nodes[2])) && link(l._nodes[1], gnd)) },
          { label: 'El LED parpadea solo (al menos 4 cambios)', ok: s.some(x => x.toggles >= 4) },
          { label: 'El LED pasa encendido mucho menos tiempo que apagado (ciclo claramente menor del 50 %)', ok: s.some(x => x.toggles >= 4 && x.offT > 1.5 * x.onT) }, noBurnt(api),
          fresh ? { label: 'Circuito nuevo o cambiado: el parpadeo se mide desde ahora. Déjalo correr 6 s y vuelve a comprobar', ok: false } : { label: 'Deja correr el circuito terminado al menos 6 s', ok: api.stats.t >= 6 }];
      };
    })(),
    battMonitor: api => {
      const z = api.comps('zener'), k = api.comps('cmp');
      if (!k.length || !z.length || !api.comps('pot').length) return [{ label: 'Usa comparador, zener y potenciómetro', ok: false }];
      // El tramo extremo 1 → cursor vale 10 kΩ · pos: si el extremo 1 va al +, el cursor baja al subir pos.
      const p = api.comps('pot')[0], top1 = api.sameNode(p, 0, 'bat+'), top2 = api.sameNode(p, 2, 'bat+');
      if (!top1 && !top2) return [{ label: 'Un extremo del potenciómetro va directo al + de la pila (y el otro al −)', ok: false }];
      const lowPos = top1 ? 0.99 : 0.01, highPos = top1 ? 0.01 : 0.99;
      const lo = api.probe(cs => cs.forEach(c => { if (c.type === 'pot') c.pos = lowPos; }));
      const hi = api.probe(cs => cs.forEach(c => { if (c.type === 'pot') c.pos = highPos; }));
      return [{ label: 'Cursor al mínimo (batería baja): LED encendido', ok: probeLed(lo, api) },
        { label: 'Cursor al máximo (batería llena): LED apagado', ok: !probeLed(hi, api) },
        { label: 'El zener conduce en inversa con más de 1 mA', ok: z.some(c => api.live[c.id] && -api.live[c.id].V > 3 && Math.abs(api.live[c.id].I) > 0.001) },
        { label: 'El cátodo del zener va a una entrada del comparador (la referencia)', ok: z.some(zc => k.some(c => zc._nodes && c._nodes && (zc._nodes[1] === c._nodes[0] || zc._nodes[1] === c._nodes[1]))) }, noBurnt(api)];
    },
    ledOn: api => [{ label: 'Un LED encendido entre 5 y 25 mA', ok: api.comps('led').some(c => lit(api, c)) }, noBurnt(api)],
    divider3: api => {
      const volts = []; api.comps('res').forEach(c => (c._nodes || []).forEach((n, i) => volts.push(api.pinV(c, i))));
      const ib = api.live.battery ? Math.abs(api.live.battery.I) : 1;
      return [{ label: 'Hay un punto entre 2,7 y 3,3 V respecto al −', ok: volts.some(x => x >= 2.7 && x <= 3.3) }, { label: 'La pila entrega menos de 10 mA', ok: ib < 0.01 && ib > 1e-6 }];
    },
    flashlight: api => {
      if (!api.comps('sw').length) return [{ label: 'Usa un interruptor', ok: false }];
      const off = api.probe(cs => cs.forEach(c => { if (c.type === 'sw') c.on = false; }));
      const on = api.probe(cs => cs.forEach(c => { if (c.type === 'sw') c.on = true; }));
      return [{ label: 'Con el interruptor cerrado, LED entre 5 y 25 mA', ok: api.comps('led').some(c => !c.burnt && on[c.id] && mA(on[c.id].I) >= 5 && mA(on[c.id].I) <= 25) }, { label: 'Con el interruptor abierto, LED apagado', ok: !probeLed(off, api) }, noBurnt(api)];
    },
    twoLeds: api => [{ label: 'Dos LEDs encendidos entre 5 y 25 mA', ok: api.comps('led').filter(c => lit(api, c)).length >= 2 }, noBurnt(api)],
    afterglow: api => { const s = ledStats(api); return [{ label: 'El LED se enciende al pulsar', ok: s.some(x => x.onPressed) }, { label: 'Sigue encendido 1 s o más tras soltar', ok: s.some(x => x.maxAfter >= 1) }, noBurnt(api)]; },
    npnSwitch: api => {
      if (!api.comps('npn').length) return [{ label: 'Usa un transistor NPN', ok: false }];
      const on = api.probe(cs => cs.forEach(c => { if (c.type === 'push') c.pressed = true; }));
      const off = api.probe(cs => cs.forEach(c => { if (c.type === 'push') c.pressed = false; }));
      const q = api.comps('npn')[0];
      const ib = on[q.id] ? Math.abs(on[q.id].ib || 0) : 0, ic = on[q.id] ? Math.abs(on[q.id].I) : 0;
      return [{ label: 'Pulsado: LED entre 5 y 25 mA', ok: api.comps('led').some(c => !c.burnt && on[c.id] && mA(on[c.id].I) >= 5 && mA(on[c.id].I) <= 25) }, { label: 'La corriente del LED pasa por el colector', ok: ic > 0.004 }, { label: 'Corriente de base menor de 2 mA', ok: ib > 0 && ib < 0.002 }, { label: 'Sin pulsar: LED apagado', ok: !probeLed(off, api) }];
    },
    nightLight: api => {
      if (!api.comps('ldr').length || !api.comps('cmp').length) return [{ label: 'Usa una LDR y un comparador', ok: false }];
      const dark = api.probe(cs => cs.forEach(c => { if (c.type === 'ldr') c.light = 0.05; }));
      const light = api.probe(cs => cs.forEach(c => { if (c.type === 'ldr') c.light = 0.95; }));
      return [{ label: 'A oscuras, LED encendido', ok: probeLed(dark, api) }, { label: 'Con luz, LED apagado', ok: !probeLed(light, api) }, noBurnt(api)];
    },
    /* --- m12 Microcontroladores (Nano y ESP32) --- */
    mc_sweep: api => { const s = ledStats(api); return [{ label: 'Usa cinco LEDs', ok: api.comps('led').length >= 5 }, { label: 'Con el botón pulsado, cinco LEDs se han encendido por turnos', ok: s.filter(x => x.onPressed && x.toggles >= 2).length >= 5 }, { label: 'Corriente de cada pin por debajo de 30 mA', ok: s.length >= 5 && s.every(x => x.maxI < 0.03) }, noBurnt(api)]; },
    mc_toggle: api => { const s = ledStats(api); return [{ label: 'Usa un pulsador', ok: api.comps('push').length > 0 }, { label: 'Tras soltar el botón, el LED se ha quedado encendido', ok: s.some(x => x.onReleased) }, { label: 'Lo has encendido y apagado con el botón (al menos dos cambios)', ok: s.some(x => x.toggles >= 2 && x.onReleased) }, noBurnt(api)]; },
    mc_multi: api => { const t = ledStats(api).filter(x => x.toggles >= 2).map(x => x.toggles).sort((a, b) => a - b); return [{ label: 'Dos LEDs parpadeando', ok: t.length >= 2 }, { label: 'Uno cambia al menos tres veces más a menudo que el otro', ok: t.length >= 2 && t[t.length - 1] >= 3 * t[0] }, noBurnt(api), enoughRun(api, 6)]; },
    mc_fsm: api => { const s = ledStats(api); return [{ label: 'Las tres luces se han encendido', ok: s.filter(x => x.onT > 0.5).length >= 3 }, { label: 'Sin peatón, una luz se queda fija al menos 5 s', ok: s.some(x => x.maxAfter >= 5) }, { label: 'El semáforo ha cambiado de luz al pulsar (al menos 4 cambios)', ok: s.reduce((a, x) => a + x.toggles, 0) >= 4 }, noBurnt(api)]; },
    mc_bar: api => { const s = ledStats(api); return [{ label: 'Usa un potenciómetro', ok: api.comps('pot').length > 0 }, { label: 'Has visto los tres LEDs encendidos', ok: s.filter(x => x.maxB > 0.25).length >= 3 }, { label: 'Y los tres apagados', ok: s.filter(x => x.minB < 0.1 && x.maxB > 0.25).length >= 3 }, noBurnt(api)]; },
    andGate: api => gate(api, [0, 0, 0, 1]),
    orGate: api => gate(api, [0, 1, 1, 1]),
    blink: api => { const s = ledStats(api); return [{ label: 'El LED parpadea (encendido y apagado más de 0,8 s cada uno)', ok: s.some(x => x.onT > 0.8 && x.offT > 0.8) }, { label: 'Corriente del pin por debajo de 30 mA', ok: s.length > 0 && s.every(x => x.maxI < 0.03) }, noBurnt(api), enoughRun(api, 3)]; },
    traffic: api => { const s = ledStats(api); return [{ label: 'Tres LEDs que se encienden por turnos', ok: s.filter(x => x.onT > 0.5 && x.offT > 0.5).length >= 3 }, noBurnt(api), enoughRun(api, 8)]; },
    button: api => { const s = ledStats(api); return [{ label: 'Al pulsar, el LED se enciende', ok: s.some(x => x.onPressed) }, { label: 'Sin pulsar, el LED está apagado', ok: s.some(x => x.offReleased) }, noBurnt(api)]; },
    dimmer: api => { const s = ledStats(api); return [{ label: 'El brillo ha bajado de 15 %', ok: s.some(x => x.minB < 0.15) }, { label: 'El brillo ha subido de 70 %', ok: s.some(x => x.maxB > 0.7) }, noBurnt(api)]; },
    zener: api => { const z = api.comps('zener'); return [{ label: 'Un zener entre 4,8 y 5,4 V', ok: z.some(c => api.live[c.id] && -api.live[c.id].V >= 4.8 && -api.live[c.id].V <= 5.4) }, { label: 'Corriente del zener entre 2 y 40 mA', ok: z.some(c => api.live[c.id] && mA(api.live[c.id].I) >= 2 && mA(api.live[c.id].I) <= 40) }, noBurnt(api)]; },
    blink555: api => { const s = ledStats(api); return [{ label: 'Usa un 555', ok: api.comps('ic555').length > 0 }, { label: 'El LED parpadea solo (al menos 3 cambios)', ok: s.some(x => x.toggles >= 3) }, noBurnt(api), enoughRun(api, 4)]; },
    latch: api => { const s = ledStats(api); return [{ label: 'Usa un 74HC00', ok: api.comps('ic7400').length > 0 }, { label: 'Sin pulsar nada, el LED se ha quedado encendido', ok: s.some(x => x.onReleased) }, { label: 'Sin pulsar nada, el LED se ha quedado apagado', ok: s.some(x => x.offReleased) }, noBurnt(api)]; }
  };
})();

const PROJECTS = {
  /* --- Curso base ampliado --- */
  multivib: {
    intro: 'Dos transistores que se encienden por turnos sin ningún chip: el abuelo de todos los osciladores. Verás cómo un condensador empuja la base del otro transistor por debajo de 0 V y cómo el tiempo lo marca una curva RC.',
    level: 2, hours: 3,
    skills: ['Transistor en corte y saturación', 'Carga de condensadores (τ = R·C)', 'Medir con multímetro y, si tienes, con osciloscopio'],
    bom: ['2 transistores NPN 2N3904 o BC547', '2 LEDs rojos de 5 mm', '2 resistencias de 470 Ω (colectores)', '2 resistencias de 33 kΩ (bases)', '2 condensadores electrolíticos de 22 µF y 16 V o más', 'Portapilas de 4 × AA (6 V)', 'Protoboard y cables'],
    phases: [
      { title: 'Fase 1 · Una mitad, entendida', steps: ['Coloca Q1 con la cara plana hacia ti y comprueba el orden de patas en su hoja de datos (2N3904: E, B, C; el BC547 es C, B, E).', 'Emisor de Q1 a la fila −. Del + al ánodo de un LED; del cátodo, 470 Ω hasta el colector de Q1.', 'Pon 33 kΩ del + a la base de Q1: el LED se enciende porque Q1 se satura.', 'Mide Vce de Q1 con el multímetro.'], checks: ['Con la base alimentada, el LED se enciende', 'He medido Vce por debajo de 0,3 V con Q1 saturado', 'Al quitar la resistencia de base, el LED se apaga'] },
      { title: 'Fase 2 · Cruza los condensadores', steps: ['Monta la segunda mitad igual con Q2, otro LED, 470 Ω y 33 kΩ.', 'Colector de Q1 → pata + de C1; pata − de C1 → base de Q2.', 'Colector de Q2 → pata + de C2; pata − de C2 → base de Q1.', 'Conecta las pilas: los LEDs deben alternarse solos.'], checks: ['Los dos LEDs parpadean por turnos sin tocar nada', 'He contado los parpadeos en 30 s y he calculado la frecuencia'] },
      { title: 'Fase 3 · Mide y cambia el ritmo', steps: ['Calcula cada semiperiodo: t ≈ 0,69 · Rb · C. Con 33 kΩ y 22 µF salen unos 0,5 s.', 'Cronometra 20 ciclos y compara con el cálculo.', 'Cambia un solo condensador por uno de 10 µF: el ciclo se vuelve asimétrico. Explica cuál de los LEDs está menos tiempo encendido y por qué.', 'Si tienes osciloscopio, mira la base de Q2: cae por debajo de 0 V en cada conmutación y luego sube como una curva RC.'], checks: ['El periodo medido está a menos de un 25 % del calculado', 'He conseguido un ciclo asimétrico cambiando un solo condensador', 'Sé explicar por qué la base se hace negativa'] }
    ],
    extra: ['Cambia los condensadores por 10 nF y pon un zumbador piezoeléctrico pasivo entre un colector y el +: oirás un tono de unos 2 kHz', 'Pon un potenciómetro de 100 kΩ en serie con una resistencia de base para variar el ritmo', 'Investiga por qué con 9 V o más conviene un diodo en serie con cada base: la unión base–emisor solo aguanta unos 6 V en inversa']
  },
  siren555: {
    intro: 'Un 555 que suena: primero un tono fijo, luego un theremin de luz que cambia de nota al acercar la mano y, al final, una sirena de dos tonos con un segundo 555 que modula al primero.',
    level: 2, hours: 4,
    skills: ['555 astable en audio', 'La pata 5 (control) para modular la frecuencia', 'Acoplo en alterna a un altavoz'],
    bom: ['2 × NE555 (o un NE556)', 'Altavoz de 8 Ω y 0,5 W (o zumbador piezoeléctrico pasivo)', 'Condensadores: 100 nF (×3), 10 nF, 10 µF, 47 µF y 100 µF electrolíticos (16 V)', 'Resistencias: 100 Ω, 1 kΩ, 4,7 kΩ, 10 kΩ (×3), 47 kΩ', 'LDR', 'Pila de 9 V con clip', 'Protoboard'],
    phases: [
      { title: 'Fase 1 · Un tono', steps: ['555 astable: patas 4 y 8 al +, 1 a −, 100 nF entre 8 y 1 pegado al chip y 10 nF de la pata 5 a −.', 'R1 = 1 kΩ entre + y pata 7; R2 = 10 kΩ entre 7 y 6; une 2 con 6; 100 nF de 2/6 a −.', 'Pata 3 → 100 µF (+ hacia el 555) → 100 Ω → altavoz → −. El condensador quita la continua y la resistencia limita la corriente.', 'Calcula f ≈ 1,44 / ((R1 + 2·R2) · C).'], checks: ['Suena un tono continuo', 'Mi cálculo da unos 690 Hz y una app de afinador del móvil marca esa nota con un error menor del 10 %'] },
      { title: 'Fase 2 · Theremin de luz', steps: ['Sustituye R2 por la LDR en serie con 4,7 kΩ (así la nota nunca se dispara hacia los agudos).', 'Acerca y aleja la mano: la LDR cambia de resistencia con la luz y la nota la sigue.', 'Mide la LDR con luz y tapada (sin alimentación) y calcula las dos frecuencias extremas.'], checks: ['La nota cambia al acercar la mano', 'He medido la LDR en los dos casos y he calculado el rango de frecuencias'] },
      { title: 'Fase 3 · Sirena de dos tonos', steps: ['Monta un segundo 555 lento: R1 = 10 kΩ, R2 = 47 kΩ, C = 10 µF (unos 1,4 Hz). Vuelve a poner R2 = 10 kΩ en el primero.', 'Quita el 10 nF de la pata 5 del 555 de audio y une ahí la salida del 555 lento a través de 10 kΩ.', 'Al subir y bajar la tensión de la pata 5 cambian los umbrales internos (2/3 y 1/3 de la alimentación) y con ellos la frecuencia.', 'Añade 47 µF de la pata 5 a masa: los cambios se suavizan y la sirena sube y baja en vez de saltar.'], checks: ['Se oyen dos tonos alternos, más o menos uno por segundo', 'Con 47 µF en la pata 5 el tono sube y baja de forma continua'] }
    ],
    extra: ['Añade un transistor BD139 con su resistencia de base para mover un altavoz más grande', 'Pon la LDR en la pata 5 (en un divisor) en lugar de en R2 y compara el efecto', 'Recuerda: no acerques el altavoz al oído, el 555 puede sonar muy fuerte']
  },
  thermoBar: {
    intro: 'Un termómetro sin microcontrolador: un sensor LM35, un operacional que amplifica su señal y cuatro comparadores que encienden una barra de LEDs. Todo analógico, todo calculado y medido por ti.',
    level: 3, hours: 6,
    skills: ['Amplificador no inversor con números', 'Escalera de referencias con un divisor', 'Comparadores de colector abierto (LM339)', 'Calibrar y medir errores'],
    bom: ['Sensor de temperatura LM35 (TO-92)', 'LM358 (doble operacional)', 'LM339 (cuatro comparadores)', '4 LEDs (azul, verde, amarillo y rojo) y 4 resistencias de 330 Ω', 'Resistencias: 10 kΩ, 39 kΩ, 12 kΩ, 3,9 kΩ y 3 × 1 kΩ', 'Condensadores de 100 nF (×2)', 'Alimentación de 5 V (USB o un 7805 desde 9 V)', 'Protoboard y termómetro de referencia'],
    phases: [
      { title: 'Fase 1 · El sensor', steps: ['Alimenta el LM35 a 5 V. Mira el orden de patas en su hoja de datos (en TO-92 suele ser +Vs, Vout y GND).', 'Mide Vout en el rango 2 V: el LM35 da 10 mV por °C (250 mV son 25 °C).', 'Pellizca el sensor con los dedos y observa cómo sube.'], checks: ['La lectura en mV dividida entre 10 coincide con el termómetro de referencia (±2 °C)', 'Al calentarlo con los dedos sube al menos 5 °C'] },
      { title: 'Fase 2 · Amplifica ×4,9', steps: ['Medio LM358 como no inversor: LM35 → IN+ (pata 3); 10 kΩ de IN− (pata 2) a masa; 39 kΩ de la salida (pata 1) a IN−. Pata 8 a 5 V y pata 4 a masa.', '100 nF entre las patas 8 y 4, pegado al chip.', 'El otro operacional, como seguidor a masa para que no oscile: IN+ (pata 5) a masa y salida (7) unida a IN− (6).', 'Calcula G = 1 + 39/10 = 4,9 y mide entrada y salida.'], checks: ['Salida ÷ entrada da entre 4,7 y 5,1', 'A 25 °C la salida está cerca de 1,23 V'] },
      { title: 'Fase 3 · La escalera de umbrales', steps: ['Divisor: 5 V → 12 kΩ → T4 → 1 kΩ → T3 → 1 kΩ → T2 → 1 kΩ → T1 → 3,9 kΩ → masa.', 'Calcula y mide T1…T4 (unos 1,03; 1,30; 1,56 y 1,83 V).', 'Traduce cada umbral a temperatura: T = V / (4,9 × 10 mV). Salen unos 21, 26, 32 y 37 °C.'], checks: ['Los cuatro umbrales medidos difieren menos de un 3 % de los calculados', 'He traducido cada umbral a °C'] },
      { title: 'Fase 4 · Comparadores y barra', steps: ['LM339: pata 3 a 5 V, pata 12 a masa y 100 nF entre ellas.', 'Lleva la salida del amplificador a las cuatro entradas IN− y T1…T4 a las cuatro IN+ (mira el patillaje en la hoja de datos).', 'En cada salida: 5 V → 330 Ω → ánodo del LED; cátodo → salida del comparador. Cuando la temperatura supera el umbral, la salida se va a masa y el LED se enciende.', 'Calienta el sensor con los dedos y mira cómo sube la barra.'], checks: ['Los LEDs se encienden en orden al calentar el sensor y se apagan al enfriarse', 'He comparado la barra con el termómetro de referencia en al menos dos temperaturas', 'He observado si algún LED parpadea cuando la temperatura está justo en un umbral'] }
    ],
    extra: ['Añade histéresis a cada comparador con 1 MΩ de la salida a IN+ para que no parpadee cerca del umbral', 'Sustituye la escalera alimentada por USB por una referencia de precisión (TL431 a 2,5 V): así no depende de la tensión del cargador', 'Lleva la salida del amplificador al ADC de una placa y compara lecturas']
  },
  audioAmp: {
    intro: 'Un pequeño amplificador para el móvil con el clásico LM386: ganancia ajustable, condensadores de acoplo, desacoplo y una red de Zobel para que no oscile. Lo oirás y lo medirás.',
    level: 2, hours: 4,
    skills: ['Acoplo y desacoplo en audio', 'Ganancia en dB', 'Potencia en un altavoz', 'Por qué oscila un amplificador y cómo evitarlo'],
    bom: ['LM386N-1 (DIP-8)', 'Altavoz de 8 Ω y 0,5–1 W', 'Potenciómetro logarítmico de 10 kΩ (volumen)', 'Condensadores: 220 µF, 100 µF y 10 µF (×2) electrolíticos de 16 V; 100 nF (×2) y 47 nF', 'Resistencia de 10 Ω', 'Pila de 9 V con clip', 'Cable con jack de 3,5 mm', 'Protoboard'],
    phases: [
      { title: 'Fase 1 · Ganancia 20', steps: ['LM386: pata 6 al +, patas 4 y 2 a masa. 100 µF y 100 nF entre 6 y 4, pegados al chip.', 'Volumen: extremos del potenciómetro entre la señal (punta del jack, un solo canal) y masa (manguito); cursor a la pata 3.', 'Salida (pata 5) → 220 µF (+ hacia el chip) → altavoz → masa.', 'Red de Zobel: 10 Ω en serie con 47 nF desde la pata 5 a masa.', 'Conecta la salida de auriculares del móvil con el volumen bajo y sube poco a poco.'], checks: ['Se oye la música sin zumbidos ni pitidos', 'Sin señal no se oye un silbido agudo (si lo hay, revisa desacoplo y Zobel)'] },
      { title: 'Fase 2 · Ganancia 200', steps: ['Pon 10 µF entre las patas 1 y 8 (+ hacia la pata 1): la ganancia pasa de 20 (26 dB) a 200 (46 dB).', 'Compara el volumen y el ruido de fondo con y sin ese condensador.', 'Añade 10 µF de la pata 7 a masa: mejora el rechazo al rizado de la alimentación.'], checks: ['Con 10 µF entre 1 y 8 suena mucho más fuerte con el mismo volumen', 'Sé decir cuántos dB son ×20 y ×200'] },
      { title: 'Fase 3 · Mídelo', steps: ['Pon un tono de 400 Hz con una app de generador de tonos (muchos multímetros baratos solo miden bien la alterna hasta unos 400 Hz).', 'Mide V~ en el altavoz subiendo el volumen hasta justo antes de que distorsione al oído.', 'Calcula la potencia: P = V² / 8 Ω.', 'Mide la corriente de la pila en reposo y con volumen alto.'], checks: ['He calculado la potencia máxima limpia (con 9 V, espera unos cientos de mW)', 'El consumo en reposo es de unos pocos mA', 'He comprobado que la tensión de la pila baja con volumen alto'] }
    ],
    extra: ['Conecta solo salidas de auriculares, nunca la salida de altavoz de otro amplificador', 'Monta el altavoz en una caja cerrada y compara los graves', 'Alimenta desde una Li-ion con un elevador a 9 V y escucha el ruido del conmutado']
  },
  labPsu: {
    intro: 'Tu propia fuente de laboratorio: tensión ajustable desde 1,25 V y límite de corriente seleccionable, con dos LM317 (uno como fuente de corriente y otro como regulador). Se alimenta de un adaptador de pared homologado de 15 V en continua: aquí nadie toca la red.',
    level: 4, hours: 10,
    skills: ['LM317 como regulador y como fuente de corriente', 'Disipación, resistencia térmica y disipadores', 'Diodos y condensadores de protección', 'Medir la regulación de carga'],
    bom: ['Adaptador de pared homologado de 15 V CC y al menos 1 A', '2 × LM317T (TO-220), láminas aislantes, pasta térmica y un disipador de unos 5 °C/W', 'Conmutador rotativo de 4 posiciones', 'Resistencias del límite: 2,7 Ω 1 W, 6,8 Ω ½ W, 22 Ω ¼ W y 68 Ω ¼ W', 'Resistencia de 240 Ω y potenciómetro lineal de 2,2 kΩ (mejor multivuelta)', 'Condensadores: 470 µF 25 V, 10 µF 25 V (×2) y 100 nF (×2)', '2 diodos 1N4002', 'Resistencias de prueba: 100 Ω ½ W y 22 Ω 2 W', 'Portafusibles con fusible de 1 A, interruptor, bornes de 4 mm y caja'],
    phases: [
      { title: 'Fase 1 · El regulador ajustable', steps: ['Monta solo un LM317 (de frente: ADJ, OUT, IN) alimentado por el adaptador, con 470 µF y 100 nF en la entrada.', 'R1 = 240 Ω entre OUT y ADJ; el potenciómetro de 2,2 kΩ (como resistencia variable) entre ADJ y masa.', 'Salida con 10 µF y 100 nF a masa. Gira el potenciómetro y mide.', 'Comprueba la fórmula midiendo R2 sin alimentación: Vsal = 1,25 × (1 + R2 / 240).'], checks: ['La salida va desde unos 1,25 V hasta cerca de 12 V', 'En una posición intermedia, la tensión medida coincide con la calculada (±5 %)'] },
      { title: 'Fase 2 · Protecciones y regulación de carga', steps: ['Añade 10 µF de ADJ a masa (menos rizado) y los dos 1N4002: uno de OUT a IN (cátodo hacia IN) y otro de ADJ a OUT (cátodo hacia OUT).', 'Pon la salida a 5 V y mide con carga de 100 Ω (50 mA) y de 22 Ω 2 W (unos 230 mA).', 'Calcula cuánto cae la salida, en %, entre vacío y 230 mA.', 'Calcula la potencia en el LM317, (15 − 5) × 0,23 ≈ 2,3 W, y la temperatura esperada con la resistencia térmica de tu montaje.'], checks: ['La salida cae menos de un 1 % entre vacío y 230 mA', 'He calculado la potencia y la temperatura esperada y he comprobado al tacto que el disipador se calienta'] },
      { title: 'Fase 3 · El limitador de corriente', steps: ['Delante del regulador, monta el otro LM317 como fuente de corriente: su OUT → resistencia elegida en el conmutador → nudo X; su ADJ al nudo X. El nudo X alimenta la entrada del regulador.', 'Conmutador con 2,7 Ω (≈ 460 mA), 6,8 Ω (≈ 180 mA), 22 Ω (≈ 57 mA) y 68 Ω (≈ 18 mA). Cada resistencia disipa 1,25 V × I.', 'Atornilla los dos LM317 al disipador con lámina aislante y pasta: la pestaña está unida a OUT y las dos pestañas no pueden tocarse entre sí.', 'Con el límite en 18 mA, pon el multímetro en mA directamente entre los bornes de salida: medirás la corriente de cortocircuito.', 'Con la fuente apagada, conecta un LED sin resistencia y el límite en 18 mA; enciende.'], checks: ['En cortocircuito, la corriente está a ±10 % del límite en las cuatro posiciones', 'Con el multímetro en continuidad, ninguna pestaña conecta con el disipador', 'El LED sin resistencia se enciende y no se quema'] },
      { title: 'Fase 4 · Caja y prueba larga', steps: ['Monta todo en la caja con fusible de 1 A e interruptor en la entrada de 15 V y bornes de 4 mm en la salida.', 'Rotula el conmutador con las corrientes medidas, no con las calculadas.', 'Prueba de una hora: 5 V con la carga de 22 Ω. Vigila la temperatura del disipador.', 'Deja la salida en cortocircuito con el límite máximo durante unos minutos y vigila el disipador: es el peor caso, con unos 15 V × 0,46 A ≈ 7 W repartidos entre los dos LM317.'], checks: ['Tras una hora, el disipador se puede tocar unos segundos (por debajo de unos 60 °C)', 'Los rótulos coinciden con las medidas', 'Con la caja metálica, he comprobado que no hay continuidad entre la caja y ningún borne'] }
    ],
    extra: ['Añade un voltímetro y amperímetro de panel (el amperímetro, en serie con la salida)', 'Pon un preregulador conmutado delante para perder mucho menos calor con tensiones bajas', 'Diseña la PCB en KiCad con lo aprendido en el módulo de PCB']
  },
  liCharger: {
    intro: 'Un cargador de Li-ion por USB con el módulo TP4056 con protección. Verás las fases de corriente constante y tensión constante, medirás cuándo termina y comprobarás el corte por descarga. Las baterías de litio no perdonan: nunca cargues sin vigilancia, ni celdas golpeadas, hinchadas o de origen dudoso, y trabaja sobre una superficie que no arda.',
    level: 3, hours: 5,
    skills: ['Carga CC/CV de litio', 'Programar la corriente con RPROG', 'Protección: sobrecarga, descarga profunda y cortocircuito', 'Registrar datos y leer una curva'],
    bom: ['Módulo TP4056 con protección (lleva DW01A y un doble MOSFET; tiene contactos B+/B− y OUT+/OUT−)', 'Celda Li-ion 18650 de marca conocida con portapilas', 'Cargador de móvil de 5 V y cable USB', 'Multímetro (y, si tienes, un medidor USB de corriente)', 'Resistencia de 10 Ω y 5 W', 'Opcional: resistencia SMD de 3 kΩ', 'Bandeja metálica o cerámica como superficie de trabajo'],
    phases: [
      { title: 'Fase 1 · Conoce el módulo y la celda', steps: ['Identifica en el módulo la entrada (USB o IN+/IN−), B+/B− (a la celda) y OUT+/OUT− (a tu circuito, a través de la protección).', 'Localiza la resistencia de la pata PROG del TP4056 y mídela sin alimentación: suele ser de 1,2 kΩ.', 'Calcula la corriente: I ≈ 1200 V / RPROG. Con 1,2 kΩ sale 1 A.', 'Mide la celda: si está por debajo de 2,5 V o se ve dañada, no la uses.', 'Busca en la hoja de datos de la celda su corriente máxima de carga.'], checks: ['He identificado los seis contactos del módulo', 'He medido RPROG y calculado la corriente de carga', 'Esa corriente no supera la máxima de la hoja de datos de la celda'] },
      { title: 'Fase 2 · Carga con registro', steps: ['Celda en el portapilas a B+ y B− (¡polaridad!) y todo sobre la bandeja.', 'Conecta el USB: se enciende el LED de carga (suele ser rojo).', 'Cada 10 minutos anota la tensión de la celda y la corriente (medidor USB, o multímetro en serie con B+ en el borne de 10 A).', 'Toca la celda de vez en cuando: como mucho, templada. Si se calienta, desconecta.', 'Cuando cambie el LED (suele pasar a azul o verde), anota la última corriente.'], checks: ['Tengo una tabla con al menos 10 puntos de tensión y corriente', 'Se distinguen la fase CC (corriente casi fija, tensión subiendo) y la CV (tensión fija, corriente bajando)', 'La carga terminó con la corriente cerca de 1/10 de la programada', 'La tensión final está entre 4,15 y 4,25 V'] },
      { title: 'Fase 3 · Prueba la protección', steps: ['Conecta la resistencia de 10 Ω entre OUT+ y OUT−: descarga a unos 0,4 A.', 'Mide la tensión de la celda cada 10 minutos. Para cuidarla, puedes detenerte en 3,0 V y hacer el resto con tu fuente de laboratorio en lugar de la celda, bajando despacio desde 3,7 V con el límite de corriente bajo.', 'Anota la tensión a la que OUT se corta: el DW01A corta hacia 2,4–2,5 V según la versión.', 'Conecta el USB: el módulo se rearma y vuelve a cargar.'], checks: ['He registrado la curva de descarga', 'La salida se cortó entre 2,3 y 3,0 V', 'Al conectar el USB, la salida volvió y empezó la carga'] },
      { title: 'Fase 4 · Ajusta la corriente (opcional)', steps: ['Si tu celda admite poca corriente, cambia RPROG por 3 kΩ: unos 400 mA. Es SMD: aplica lo aprendido en soldadura SMD.', 'Repite la carga y compara el tiempo total.'], checks: ['La corriente en la fase CC está a ±15 % de 1200 V / RPROG', 'He comparado el tiempo de carga con las dos corrientes'] }
    ],
    extra: ['Añade un elevador (MT3608) en OUT para sacar 5 V y hacer una batería de emergencia USB', 'Monta un aviso de batería baja con un comparador y un zener, como en el reto del módulo', 'Investiga por qué varias celdas en serie necesitan equilibrado en el BMS']
  },
  crossover: {
    intro: 'Divide la música en graves y agudos con una bobina y un condensador, como dentro de cualquier altavoz de dos vías. Calcularás los componentes con la reactancia y comprobarás con medidas y con tus oídos que funciona.',
    level: 3, hours: 4,
    skills: ['Reactancia inductiva y capacitiva aplicadas', 'Filtros de primer orden y frecuencia de cruce', 'Medir respuesta en frecuencia'],
    bom: ['Cualquier amplificador pequeño para altavoces de 4–8 Ω: un módulo PAM8403, unos altavoces de ordenador o una minicadena (más adelante, el del proyecto LM386)','2 altavoces de 8 Ω (un woofer pequeño y un tweeter; para experimentar sirven dos iguales)', 'Bobina de núcleo de aire de 0,39 o 0,47 mH (de las de filtro de altavoz)', 'Condensadores no polarizados: 4,7 µF y 2,2 µF de poliéster (o electrolíticos bipolares)', 'Resistencia de 8,2 Ω y 5 W', 'Móvil con app de generador de tonos y de analizador de espectro', 'Osciloscopio, o multímetro cuyo V~ llegue a unos kHz'],
    phases: [
      { title: 'Fase 1 · Calcula', steps: ['Prepara un amplificador pequeño que ya tengas o sea fácil de conseguir: un módulo PAM8403 de 5 V o la salida de unos altavoces de ordenador. No hace falta haber montado el del proyecto LM386: podrás usarlo cuando llegues a él.', 'Frecuencia de cruce: 3 kHz con altavoces de 8 Ω.','Condensador del agudo (paso alto): C = 1 / (2π · f · R) = 1 / (2π × 3000 × 8) ≈ 6,6 µF → 4,7 µF y 2,2 µF en paralelo (6,9 µF).', 'Bobina del grave (paso bajo): L = R / (2π · f) = 8 / (2π × 3000) ≈ 0,42 mH → vale 0,39 o 0,47 mH.', 'Haz una tabla con XL y XC a 300 Hz, 3 kHz y 10 kHz.'], checks: ['Mis C y L calculados coinciden con 6,6 µF y 0,42 mH (±5 %)', 'Tengo la tabla de reactancias a tres frecuencias'] },
      { title: 'Fase 2 · Mide los filtros con una resistencia', steps: ['Sustituye el altavoz por la resistencia de 8,2 Ω: se comporta igual a todas las frecuencias; un altavoz real no.', 'Paso alto: salida del amplificador → condensador → resistencia → masa. Luego, paso bajo con la bobina.', 'Ojo con el PAM8403 y muchos amplificadores pequeños: su salida es en puente y el borne − del altavoz no es masa. Usa los bornes + y − del canal en lugar de masa y no conectes ahí la pinza de masa del osciloscopio (mide con el multímetro, o con dos canales restando).', 'Con tonos de 300 Hz, 3 kHz y 10 kHz a volumen fijo, mide la tensión en la resistencia con y sin filtro (osciloscopio, o multímetro si su V~ llega a esas frecuencias).'], checks: ['A 3 kHz cada filtro deja entre 0,6 y 0,8 veces la tensión sin filtro (unos −3 dB)', 'A 300 Hz el paso alto atenúa claramente, y a 10 kHz lo hace el paso bajo'] },
      { title: 'Fase 3 · Con altavoces', steps: ['Woofer tras la bobina y tweeter tras el condensador, las dos ramas en paralelo a la salida del amplificador. Nunca conectes un tweeter sin su condensador: los graves lo rompen.', 'Pon música y escucha cada altavoz de cerca, tapando el otro.', 'Con la app de espectro junto a cada altavoz, barre tonos y busca dónde empieza a caer cada uno.'], checks: ['Por el tweeter apenas salen graves y por el woofer apenas agudos', 'He visto en la app que cada vía cae alrededor de 3 kHz'] }
    ],
    extra: ['Calcula un filtro de segundo orden (12 dB por octava) y compara', 'Añade un atenuador resistivo para igualar el volumen del tweeter', 'Mide la impedancia real del altavoz a varias frecuencias con una resistencia en serie: verás que no es 8 Ω constantes']
  },
  smdBoard: {
    intro: 'Lleva el intermitente del 555 a una placa diminuta con componentes SMD: plano de masa, lista de materiales con referencias reales, pedido al fabricante y montaje con pasta de soldar y aire caliente. Es el flujo de un producto de verdad, a pequeña escala.',
    level: 4, hours: 14,
    skills: ['Diseño con SMD 0805 y SOIC-8', 'Plano de masa y retorno de corriente', 'BOM, pedido y archivos de fabricación', 'Soldadura con pasta, aire caliente y soldador fino', 'Inspección y reprocesado'],
    bom: ['Ordenador con KiCad', 'TLC555 (versión CMOS, funciona a 3 V) en SOIC-8', 'Resistencias 0805: 10 kΩ, 47 kΩ y 470 Ω', 'Condensadores: 100 nF y 10 nF en 0805; 10 µF cerámico en 1206 (16 V o más)', 'LED rojo 0805', 'Portapilas CR2032 de montaje superficial y una pila CR2032', 'Pasta de soldar en jeringa y flux', 'Estación de aire caliente (o placa calefactora pequeña), pinzas finas, malla desoldadora y lupa', 'Cinta de kapton'],
    phases: [
      { title: 'Fase 1 · Esquema y huellas', steps: ['Dibuja el astable del 555 alimentado a 3 V, con el LED y 470 Ω en la pata 3.', 'Asigna huellas: SOIC-8 de 3,9 mm, 0805 para resistencias y condensadores pequeños, 1206 para el de 10 µF, LED 0805 y el portapilas.', 'Comprueba en la hoja de datos del LED cómo se marca el cátodo y repítelo en la serigrafía.', 'Calcula la frecuencia y el consumo medio esperado.'], checks: ['ERC sin errores', 'Cada símbolo lleva el número de pieza del componente concreto que vas a comprar', 'He anotado la frecuencia y el consumo esperados'] },
      { title: 'Fase 2 · Placa con plano de masa', steps: ['Placa de dos capas de unos 25 × 30 mm. Cara inferior: plano de masa entero, sin cortes.', 'El 100 nF, pegado a las patas 8 y 1 del 555, con su vía a masa junto al pad.', 'Ruta las señales arriba; rellena también la cara superior con masa y cose los dos planos con vías.', 'Pasa el DRC con las reglas de tu fabricante.'], checks: ['DRC sin errores con las reglas del fabricante', 'El plano inferior no tiene ranuras que corten el camino de retorno', 'El condensador de desacoplo está a menos de 3 mm de las patas de alimentación'] },
      { title: 'Fase 3 · BOM y pedido', steps: ['Exporta la BOM: referencia, valor, huella, fabricante, número de pieza y proveedor.', 'Pide un 20 % más de piezas pequeñas: se pierden.', 'Exporta Gerbers, taladros y, si pides plantilla (stencil), la capa de pasta.', 'Revisa todas las capas en un visor de Gerbers antes de pagar.'], checks: ['Ninguna línea de la BOM se queda sin número de pieza', 'He revisado las capas en el visor', 'Pedido hecho, con plantilla o con un plan para poner la pasta a mano'] },
      { title: 'Fase 4 · Montaje', steps: ['Fija la placa con kapton. Pon pasta en los pads: con plantilla, o con la jeringa en puntos pequeños (menos de lo que crees).', 'Coloca las piezas con pinzas; el 555, con su punto de pata 1 sobre la marca de la serigrafía.', 'Aire caliente a unos 300–350 °C con caudal bajo, en círculos, hasta que la pasta brille y las piezas se centren solas. Ventila: el flux desprende humo.', 'Revisa con lupa; los puentes entre patas se quitan con flux y malla.', 'Pon la pila y mide.'], checks: ['El LED parpadea a ±20 % de la frecuencia calculada', 'Bajo la lupa no hay puentes ni piezas levantadas por un extremo', 'He medido el consumo y lo he comparado con el estimado'] }
    ],
    extra: ['Pide un panel de diez y regálalas como insignias que parpadean', 'Calcula cuánto dura la CR2032 (unos 220 mAh) con tu consumo medido', 'Sustituye el 555 por un microcontrolador pequeño y añade un modo de bajo consumo']
  },
  measure: { sch: 'flashlight', intro: 'Coge la linterna que montaste y conviértete en detective: mide todo y comprueba la teoría.',
    bom: ['La linterna del módulo 2', 'Multímetro', 'Libreta'],
    steps: ['Mide la tensión de la pila sin carga y con el LED encendido. Anota la diferencia.', 'Mide la tensión en la resistencia y en el LED. Comprueba que suman la pila.', 'Abre el circuito y mide la corriente en serie.', 'Calcula la corriente con la ley de Ohm a partir de la tensión de la resistencia y compárala.', 'Mide la resistencia con el circuito desconectado y compárala con sus bandas.'],
    checks: ['Las tensiones suman la de la pila (±0,2 V)', 'La corriente medida y la calculada coinciden (±10 %)', 'He anotado la caída de la pila con carga', 'La resistencia medida está dentro de su tolerancia'] },
  flashlight: { sch: 'flashlight', intro: 'Tu primer circuito físico: una linterna con interruptor. Lo montarás en protoboard y lo comprobarás con el multímetro.',
    bom: ['Pila de 9 V con clip', 'Protoboard', 'LED rojo de 5 mm', 'Resistencia de 470 Ω (amarillo, violeta, marrón)', 'Interruptor deslizante o pulsador', 'Cables de puente'],
    steps: ['Coloca el LED a caballo entre dos columnas, con la pata larga a la izquierda.', 'Pon la resistencia desde la columna de la pata larga hacia otra columna libre.', 'Coloca el interruptor entre esa columna y la fila +.', 'Une la pata corta del LED a la fila −.', 'Conecta el clip: rojo a +, negro a −.', 'Acciona el interruptor.'],
    checks: ['El LED se enciende y se apaga con el interruptor', 'He medido unos 7 V en la resistencia', 'He medido entre 13 y 16 mA abriendo el circuito', 'He dibujado mi propio esquema del montaje'] },
  tester: { sch: 'ledBasic', intro: 'Un probador de continuidad casero: si hay conexión entre las dos puntas, el LED se enciende.',
    bom: ['Pila de 9 V con clip', 'LED', 'Resistencia de 470 Ω', '2 cables largos como puntas', 'Protoboard'],
    steps: ['Monta pila, resistencia y LED en serie, pero deja el circuito abierto entre el LED y el −.', 'Conecta un cable largo al cátodo del LED y otro al −: son tus puntas.', 'Junta las puntas: el LED debe encenderse.', 'Prueba con un cable, una cuchara, un papel y una mina de lápiz.'],
    checks: ['Funciona al juntar las puntas', 'He comprobado 4 materiales y anotado cuáles conducen', 'He comparado el resultado con la continuidad del multímetro'] },
  courtesy: { sch: 'rcDelay', intro: 'Como la luz del coche que se apaga despacio al cerrar la puerta: un condensador alimenta el LED después de soltar el pulsador.',
    bom: ['Pila de 9 V', 'Pulsador', 'Condensador electrolítico de 470 µF (16 V o más)', 'Resistencia de 1 kΩ', 'LED', 'Protoboard y cables'],
    steps: ['Coloca el condensador respetando la polaridad: franja hacia −.', 'Pulsador entre + y la pata positiva del condensador.', 'Desde la pata positiva, resistencia y LED hasta −.', 'Pulsa un segundo y suelta: cronometra cuánto tarda en apagarse.', 'Cambia la resistencia por una de 2,2 kΩ y repite.'],
    checks: ['El LED se apaga de forma gradual', 'He cronometrado dos resistencias distintas', 'He relacionado el tiempo con τ = R·C'] },
  dark: { sch: 'npnSwitch', intro: 'Un LED que se enciende solo cuando oscurece. Combina un divisor con LDR y un transistor.',
    bom: ['Pila de 9 V', 'LDR', 'Transistor 2N3904 o BC547', 'Resistencias: 10 kΩ (×2) y 470 Ω', 'LED', 'Protoboard'],
    steps: ['Monta el interruptor con transistor del esquema, pero sin pulsador.', 'Sustituye el pulsador por un divisor: 10 kΩ de + a la base del divisor, LDR de ahí a −.', 'Conecta el punto medio a la resistencia de base.', 'Tapa la LDR con la mano.', 'Si no se enciende, intercambia LDR y resistencia y razona por qué.'],
    checks: ['El LED se enciende al tapar la LDR', 'He medido la tensión en la base con luz y sin luz', 'He comprobado el orden de patas en la hoja de datos'] },
  blinker555: { sch: 'ne555', intro: 'El clásico: un LED que parpadea solo gracias al 555 en modo astable.',
    bom: ['Pila de 9 V', 'NE555', 'Resistencias: 10 kΩ y 47 kΩ, 470 Ω', 'Condensador de 10 µF', 'LED', 'Protoboard'],
    steps: ['Coloca el 555 a caballo de la ranura, muesca a la izquierda.', 'Pata 8 y 4 a +; pata 1 a −.', 'R1 entre + y pata 7; R2 entre pata 7 y patas 2 y 6 (unidas).', 'Condensador de patas 2/6 a −.', 'Pata 3 → 470 Ω → LED → −.', 'Calcula la frecuencia y compárala con lo que ves.'],
    checks: ['El LED parpadea', 'He calculado la frecuencia esperada', 'He cambiado R2 y he visto el cambio'] },
  logic: { sch: 'andSw', intro: 'Puertas AND y OR solo con pulsadores: la lógica antes de los chips.',
    bom: ['Pila de 9 V', '2 pulsadores', 'Resistencia de 470 Ω', 'LED', 'Protoboard'],
    steps: ['Monta el circuito AND del esquema.', 'Comprueba las cuatro combinaciones y anótalas.', 'Reorganiza los pulsadores en paralelo para hacer una OR.', 'Vuelve a comprobar las cuatro combinaciones.'],
    checks: ['Tabla AND comprobada', 'Tabla OR comprobada', 'He dibujado los dos esquemas'] },
  traffic: { sch: 'trafficLight', intro: 'Un semáforo con tres LEDs controlados por la placa Uno.',
    bom: ['Placa Uno y cable USB', 'LEDs rojo, amarillo y verde', '3 resistencias de 220 Ω', 'Protoboard y cables'],
    steps: ['Conecta GND de la placa a la fila − de la protoboard.', 'Pin 12 → 220 Ω → LED rojo → −. Igual con 11 (amarillo) y 10 (verde).', 'Carga el programa del semáforo del reto.', 'Modifica los tiempos en el código.', 'Añade un pulsador de peatón en el pin 2 (mira el reto del pulsador).'],
    checks: ['El semáforo funciona', 'He cambiado los tiempos', 'He añadido el pulsador de peatón'] },
  psu: { sch: 'zenerReg', intro: 'Una fuente de 5 V para la protoboard con un regulador 7805.',
    bom: ['Pila de 9 V o adaptador de 9–12 V', 'Regulador 7805', 'Condensadores de 0,33 µF y 0,1 µF', 'LED y 470 Ω como indicador', 'Protoboard'],
    steps: ['Coloca el 7805 de frente: entrada, masa, salida.', 'Entrada a + de la pila; masa a −.', '0,33 µF entre entrada y masa; 0,1 µF entre salida y masa.', 'Indicador: salida → 470 Ω → LED → masa.', 'Mide la salida con y sin carga.'],
    checks: ['La salida mide entre 4,8 y 5,2 V', 'He medido la temperatura del regulador con una carga', 'He comparado el resultado con el zener del reto'] },
  pcb: { sch: 'flashlight', intro: 'Diseña la linterna del módulo 1 como una PCB real en KiCad y pídela a un fabricante.',
    bom: ['Ordenador con KiCad (gratuito)', 'Los componentes de la linterna', 'Soldador, estaño y soporte', 'Gafas de protección'],
    steps: ['Crea un proyecto en KiCad y dibuja el esquema de la linterna.', 'Asigna huellas: LED de 5 mm, resistencia axial, interruptor y conector de pila.', 'Dibuja un contorno de unos 30 × 20 mm.', 'Coloca y ruta con pistas de 0,5 mm.', 'Pasa el DRC hasta que no haya errores.', 'Exporta los Gerbers y los taladros y súbelos a un fabricante.', 'Suelda y prueba.'],
    checks: ['El DRC pasa sin errores', 'He generado los Gerbers', 'He soldado la placa y funciona'] },
  /* --- m12 Microcontroladores --- */
  mc_reflex: {
    intro: 'Un duelo de reflejos para dos: tras una espera aleatoria se enciende la luz y gana quien pulse antes. Si alguien se adelanta, pierde. Es la excusa perfecta para juntar flancos, antirrebote, millis(), una máquina de estados y la EEPROM.',
    level: 2, hours: 6,
    skills: ['Máquina de estados con enum y switch', 'Detección de flancos y rebotes', 'Medir tiempos con millis()', 'Números aleatorios con random()', 'Guardar un récord en la EEPROM'],
    bom: ['Arduino Uno o Nano y cable USB', '2 pulsadores de 12 mm (uno por jugador)', 'LED blanco o amarillo (la luz de «¡ya!»)', '2 LEDs de colores (uno por jugador)', '3 resistencias de 220 Ω', 'Zumbador pasivo (opcional)', 'Protoboard y cables'],
    phases: [
      { title: 'Fase 1 · Montaje y prueba de entradas', steps: ['Une el GND de la placa a la fila − de la protoboard.', 'Pulsador del jugador A entre D2 y GND; el del jugador B entre D3 y GND (usarás la pull-up interna).', 'LED de «¡ya!»: D9 → 220 Ω → ánodo; cátodo a GND. LED de A en D10 y LED de B en D11, igual.', 'Carga el programa de prueba y abre el Monitor serie a 9600 baudios.', 'Pulsa cada botón por separado y los dos a la vez.'], checks: ['El Monitor serie muestra A=1 solo mientras pulso A, y lo mismo con B', 'Cada LED de jugador se enciende con su botón y el de «¡ya!» solo con los dos', 'He medido menos de 15 mA en cada LED'], code: `// Fase 1: prueba de entradas y salidas
const int BTN_A = 2, BTN_B = 3;
const int LED_YA = 9, LED_A = 10, LED_B = 11;

void setup() {
  Serial.begin(9600);
  pinMode(BTN_A, INPUT_PULLUP);
  pinMode(BTN_B, INPUT_PULLUP);
  pinMode(LED_YA, OUTPUT);
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
}

void loop() {
  bool a = digitalRead(BTN_A) == LOW;   // true = pulsado
  bool b = digitalRead(BTN_B) == LOW;
  digitalWrite(LED_A, a);
  digitalWrite(LED_B, b);
  digitalWrite(LED_YA, a && b);
  Serial.print(F("A=")); Serial.print(a);
  Serial.print(F(" B=")); Serial.println(b);
  delay(50);
}` },
      { title: 'Fase 2 · La máquina de estados', steps: ['Dibuja en papel los cuatro estados (ESPERA, PREPARADOS, YA, RESULTADO) y las flechas entre ellos, con lo que provoca cada una.', 'Copia el esqueleto y complétalo: en YA gana el primer flanco; en RESULTADO se enciende el LED del ganador 2 s, medidos con t y sin delay().', 'En PREPARADOS, un flanco es salida nula y gana el otro jugador. Fíjate en por qué se ignoran los primeros 300 ms.', 'Prueba diez rondas, con alguna salida nula a propósito.'], checks: ['La espera antes de «¡ya!» cambia en cada ronda (entre 1,5 y 4 s)', 'Pulsar antes de tiempo da la victoria al rival', 'Mantener el botón pulsado desde antes no cuenta como reacción', 'No hay ningún delay() en loop()'], code: `// Fase 2: esqueleto de la máquina de estados
const int BTN_A = 2, BTN_B = 3, LED_YA = 9, LED_A = 10, LED_B = 11;

enum Estado { ESPERA, PREPARADOS, YA, RESULTADO };
Estado estado = ESPERA;
unsigned long t0 = 0;        // cuándo entramos en el estado actual
unsigned long retardo = 0;   // espera aleatoria antes del «¡ya!»
bool antesA = false, antesB = false;
char ganador = '-';

void cambiar(Estado nuevo) {
  estado = nuevo;
  t0 = millis();
}

void setup() {
  Serial.begin(9600);
  pinMode(BTN_A, INPUT_PULLUP);
  pinMode(BTN_B, INPUT_PULLUP);
  pinMode(LED_YA, OUTPUT);
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
  randomSeed(analogRead(A0));   // A0 sin conectar: semilla distinta en cada arranque
}

void loop() {
  bool a = digitalRead(BTN_A) == LOW, b = digitalRead(BTN_B) == LOW;
  bool flancoA = a && !antesA, flancoB = b && !antesB;   // se acaba de pulsar
  antesA = a;
  antesB = b;
  unsigned long t = millis() - t0;                        // tiempo en este estado

  switch (estado) {
    case ESPERA:
      if (flancoA || flancoB) {
        retardo = random(1500, 4000);
        Serial.println(F("Preparados..."));
        cambiar(PREPARADOS);
      }
      break;
    case PREPARADOS:
      if (t > 300 && (flancoA || flancoB)) {   // 300 ms iniciales: rebotes al soltar
        ganador = flancoA ? 'B' : 'A';         // salida nula: gana el otro
        cambiar(RESULTADO);
      } else if (t >= retardo) {
        digitalWrite(LED_YA, HIGH);
        cambiar(YA);
      }
      break;
    case YA:
      // TU PARTE: el primero con flanco gana. Guarda 'A' o 'B' en ganador,
      // imprime su tiempo de reacción (t), apaga LED_YA y pasa a RESULTADO.
      break;
    case RESULTADO:
      // TU PARTE: LED del ganador encendido 2 s (usa t, no delay)
      // y vuelta a ESPERA con todo apagado.
      break;
  }
}` },
      { title: 'Fase 3 · Medir bien y llevar el marcador', steps: ['Imprime por Serial el tiempo de reacción del ganador en ms.', 'Añade dos contadores de victorias (byte basta) y muéstralos tras cada ronda: «A 3 – 2 B».', 'Al llegar a 5 victorias, celebra (parpadeo del LED del campeón con millis) y pon el marcador a 0.', 'Comprueba el rebote: pulsa una sola vez y mira que el marcador sube de uno en uno.'], checks: ['Los tiempos de reacción salen entre 150 y 400 ms con personas atentas', 'Una pulsación suma exactamente una victoria', 'A las 5 victorias el marcador vuelve a 0'] },
      { title: 'Fase 4 · Récord permanente en la EEPROM', steps: ['Guarda el mejor tiempo en la dirección 0 de la EEPROM con EEPROM.put() solo cuando se bata.', 'En setup(), léelo con EEPROM.get(). Si vale 65 535 (EEPROM sin estrenar), trátalo como «sin récord».', 'Si al arrancar están pulsados los dos botones, borra el récord.', 'Desconecta la placa, vuelve a conectarla y comprueba el récord.'], checks: ['El récord sobrevive a desconectar la alimentación', 'Solo se escribe en la EEPROM cuando se bate (lo he comprobado con un mensaje por Serial)', 'Arrancar con los dos botones pulsados borra el récord'], code: `#include <EEPROM.h>

const int DIR_RECORD = 0;
unsigned int record;           // mejor tiempo en ms

void cargarRecord() {
  EEPROM.get(DIR_RECORD, record);
  if (record == 0xFFFF) record = 9999;   // EEPROM sin estrenar
}

void comprobarRecord(unsigned int ms) {
  if (ms < record) {
    record = ms;
    EEPROM.put(DIR_RECORD, record);      // solo se escribe al batirlo
    Serial.print(F("¡Nuevo récord! "));
    Serial.println(record);
  }
}` }
    ],
    extra: ['Usa attachInterrupt en los pines 2 y 3 para registrar el instante exacto de cada pulsación con micros() y compara con la versión por sondeo.', 'Añade un zumbador pasivo con tone() para la salida y la victoria (ojo: en la Uno, tone() quita el PWM de los pines 3 y 11).', 'Muestra el marcador en un display de 4 dígitos TM1637 con su librería.']
  },
  mc_station: {
    intro: 'Una estación de medida de sobremesa: temperatura, humedad, presión y luz, enviadas al ordenador en formato CSV, con órdenes por el puerto serie y un registro que sobrevive a los apagones en la EEPROM.',
    level: 3, hours: 9,
    skills: ['Usar un sensor I²C con su librería', 'Escanear el bus I²C', 'Muestrear a ritmo fijo con millis()', 'Leer órdenes por el puerto serie', 'Empaquetar datos en una struct y guardarlos en la EEPROM', 'Calcular el desgaste de la EEPROM'],
    bom: ['Arduino Uno o Nano y cable USB', 'Módulo BME280 por I²C (comprueba si el tuyo acepta 5 V o solo 3,3 V)', 'LDR y resistencia de 10 kΩ', 'LED y resistencia de 220 Ω (latido)', 'Protoboard y cables', 'Un termómetro de referencia para comparar'],
    phases: [
      { title: 'Fase 1 · El sensor y el bus I²C', steps: ['Lee la descripción de tu módulo: si no lleva regulador, aliméntalo desde 3V3; si lo lleva, desde 5V.', 'Conecta VIN, GND, SDA → A4 y SCL → A5.', 'Carga el escáner I²C y anota la dirección (0x76 o 0x77 en este sensor).', 'Instala la librería Adafruit BME280 (y Adafruit Unified Sensor, que pide) y prueba su ejemplo cambiando la dirección si hace falta.'], checks: ['El escáner encuentra exactamente un dispositivo y anoto su dirección', 'La temperatura difiere menos de 1 °C de mi termómetro de referencia tras 10 min encendido', 'La presión es coherente con mi altitud (unos 12 hPa menos por cada 100 m sobre el nivel del mar)'], code: `// Escáner I²C: pregunta en todas las direcciones
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin();
  for (byte dir = 1; dir < 127; dir++) {
    Wire.beginTransmission(dir);
    if (Wire.endTransmission() == 0) {   // 0 = alguien ha respondido
      Serial.print(F("Dispositivo en 0x"));
      Serial.println(dir, HEX);
    }
  }
  Serial.println(F("Fin del escaneo"));
}

void loop() {}` },
      { title: 'Fase 2 · Muestreo a ritmo fijo y CSV', steps: ['Monta la LDR en un divisor con la de 10 kΩ y lleva el punto medio a A0.', 'Mide cada 10 s con millis() (nada de delay) e imprime una línea CSV por medida.', 'Añade un latido: el LED de D13 destella 50 ms cada 2 s como tarea independiente.', 'Copia 10 minutos de datos a una hoja de cálculo y haz una gráfica, o usa el Serial Plotter.'], checks: ['En 10 minutos salen 60 líneas (±1)', 'El latido sigue a su ritmo mientras se mide', 'Tapar la LDR cambia la columna de luz al menos un 30 %'], code: `#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;
unsigned long intervalo = 10000, tMedida = 0;

void setup() {
  Serial.begin(115200);
  if (!bme.begin(0x76)) {                 // prueba 0x77 si tu módulo usa esa
    Serial.println(F("BME280 no encontrado"));
    while (true) {}                       // sin sensor no tiene sentido seguir
  }
  Serial.println(F("ms,temp,hum,pres,luz"));   // cabecera CSV
}

void medir() {
  Serial.print(millis()); Serial.print(',');
  Serial.print(bme.readTemperature(), 2); Serial.print(',');
  Serial.print(bme.readHumidity(), 1); Serial.print(',');
  Serial.print(bme.readPressure() / 100.0, 1); Serial.print(',');   // Pa → hPa
  Serial.println(analogRead(A0));
}

void loop() {
  if (millis() - tMedida >= intervalo) {
    tMedida += intervalo;                 // ritmo estable a largo plazo
    medir();
  }
  // TU PARTE: el latido del LED, como otra tarea con millis()
  // y, en la fase 3, atenderComandos();
}` },
      { title: 'Fase 3 · Órdenes por el puerto serie', steps: ['Escribe atenderComandos() y llámala en cada vuelta de loop().', 'Órdenes: m (medir ya), i N (intervalo en segundos), v (volcar registro), b (borrar registro). Ante cualquier otra, imprime la ayuda.', 'Ignora los caracteres de fin de línea que envía el monitor.', 'Prueba órdenes válidas, inválidas y números fuera de rango.'], checks: ['«i 30» cambia el intervalo a 30 s y lo confirma', '«i 0» o «i 99999» se rechazan sin romper nada', 'Una orden desconocida muestra la ayuda'], code: `void atenderComandos() {
  if (Serial.available() == 0) return;
  char c = Serial.read();
  switch (c) {
    case 'm': medir(); break;
    case 'i': {
      long s = Serial.parseInt();          // «i 30» → 30
      if (s >= 1 && s <= 3600) intervalo = s * 1000UL;
      Serial.print(F("Intervalo (s): "));
      Serial.println(intervalo / 1000);
      break;
    }
    case 'v': /* fase 4: volcar la EEPROM */ break;
    case 'b': /* fase 4: borrar el registro */ break;
    case '\\n': case '\\r': break;         // fin de línea del monitor
    default: Serial.println(F("Ordenes: m, i <s>, v, b"));
  }
}` },
      { title: 'Fase 4 · Registro en la EEPROM', steps: ['Define la struct Registro (4 bytes) y guarda uno cada 15 minutos en un buffer circular de 255 huecos.', 'Haz la cuenta de desgaste: el índice de la dirección 0 se reescribe en cada registro. ¿Cuántos años aguanta a 1 registro cada 15 min? ¿Y a 1 cada 10 s?', 'Implementa v (vuelca los registros en orden, del más antiguo al más nuevo) y b (pone el índice a 0).', 'Desconecta la placa una hora, reconéctala y vuelca.'], checks: ['He calculado que a 15 min el índice aguanta unos 2,8 años y a 10 s, menos de 12 días', 'Tras desconectar y reconectar, «v» muestra los registros anteriores', 'Las temperaturas volcadas coinciden con las del CSV (±0,01 °C)'], code: `#include <EEPROM.h>

struct Registro {
  int16_t temp;    // centésimas de °C (2315 = 23,15 °C)
  uint8_t hum;     // % entero
  uint8_t luz;     // analogRead(A0) / 4
};

const int DIR_INDICE = 0;      // 2 bytes: siguiente hueco libre
const int DIR_DATOS = 2;
const int MAX_REG = (1024 - DIR_DATOS) / sizeof(Registro);   // 255

void guardar(const Registro &r) {
  uint16_t i;
  EEPROM.get(DIR_INDICE, i);
  if (i >= MAX_REG) i = 0;     // EEPROM nueva (0xFFFF) o vuelta completa
  EEPROM.put(DIR_DATOS + i * sizeof(Registro), r);   // put solo reescribe los bytes que cambian
  EEPROM.put(DIR_INDICE, (uint16_t)(i + 1));
}` }
    ],
    extra: ['Evita el desgaste del índice: guarda un número de secuencia en cada registro y busca el mayor al arrancar.', 'Añade una alarma: LED rojo si la humedad pasa del 70 % durante más de 5 minutos seguidos.', 'Pasa el registro a una tarjeta microSD por SPI y guarda meses de datos.']
  },
  mc_theremin: {
    intro: 'Un instrumento que se toca sin tocarlo: la sombra de tu mano sobre una LDR cambia la nota. Empezarás con un pitido continuo y acabarás con una escala musical estable, un botón de modo y un filtro que quita los temblores.',
    level: 2, hours: 5,
    skills: ['Calibrar un sensor al arrancar', 'map() y constrain()', 'Generar tonos con tone()', 'Arrays como tablas de notas', 'Media móvil con buffer circular', 'Histéresis'],
    bom: ['Arduino Uno o Nano', 'LDR y resistencia de 10 kΩ', 'Zumbador piezoeléctrico pasivo (sin oscilador interno)', 'Pulsador', 'Opcional: altavoz de 8 Ω con transistor BC337 o 2N2222 y 1 kΩ de base (nunca directo al pin)', 'Protoboard y cables'],
    phases: [
      { title: 'Fase 1 · El sensor', steps: ['Divisor: 5V → 10 kΩ → A0 → LDR → GND.', 'Imprime analogRead(A0) cada 100 ms y anota los valores con la mano lejos, a media altura y tapando la LDR.', 'Prueba con la luz del techo y con la de una ventana: el rango cambia.'], checks: ['He anotado el valor mínimo y máximo en mi mesa', 'Entre mano lejos y mano encima hay al menos 200 pasos de diferencia', 'Sé explicar por qué la lectura sube o baja al tapar la LDR'] },
      { title: 'Fase 2 · Calibración y sonido continuo', steps: ['Zumbador pasivo entre D8 y GND.', 'Calibra en setup() durante 5 s con el LED 13 encendido mientras mueves la mano.', 'Protege el map(): si el rango calibrado es muy pequeño, ensánchalo (una división entre cero no avisa).', 'Ten en cuenta que en la Uno tone() usa el Timer2: los pines 3 y 11 pierden el PWM.'], checks: ['El tono sube y baja de forma continua al mover la mano', 'Con la mano quieta, el tono no salta más de unos pocos Hz', 'Si calibro sin mover la mano, el programa no se cuelga ni hace ruidos extraños'], code: `const int SENSOR = A0, ALTAVOZ = 8, LED = 13;
int minimo = 1023, maximo = 0;

void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, HIGH);               // LED encendido = calibrando
  unsigned long inicio = millis();
  while (millis() - inicio < 5000) {     // 5 s: acerca y aleja la mano
    int v = analogRead(SENSOR);
    if (v < minimo) minimo = v;
    if (v > maximo) maximo = v;
  }
  if (maximo - minimo < 20) maximo = minimo + 20;   // evita dividir entre 0 en map()
  digitalWrite(LED, LOW);
}

void loop() {
  int v = constrain(analogRead(SENSOR), minimo, maximo);
  int f = map(v, minimo, maximo, 200, 1500);
  tone(ALTAVOZ, f);
  delay(10);
}` },
      { title: 'Fase 3 · Escala musical y botón de modo', steps: ['Guarda las notas de una escala pentatónica en un array y elige la nota con map() sobre los índices.', 'Pulsador en D2 a GND: cada pulsación (flanco, con antirrebote) alterna entre modo continuo y modo escala.', 'Añade histéresis: cambia de nota solo si la lectura se aleja claramente de la frontera entre dos notas.'], checks: ['En modo escala solo suenan notas de la tabla', 'Con la mano quieta en una frontera, la nota no tiembla entre dos', 'Una pulsación cambia el modo exactamente una vez'], code: `// La menor pentatónica, de La3 a La5 (Hz redondeados)
const int ESCALA[] = {220, 262, 294, 330, 392, 440, 523, 587, 659, 784, 880};
const int NOTAS = sizeof(ESCALA) / sizeof(ESCALA[0]);   // 11

int notaDe(int v) {
  // reparte el rango calibrado entre las notas
  int i = map(v, minimo, maximo, 0, NOTAS);
  return constrain(i, 0, NOTAS - 1);
}` },
      { title: 'Fase 4 · Suavizado', steps: ['Sustituye analogRead por la media de las últimas 8 lecturas con un buffer circular.', 'Compara por Serial la lectura cruda y la suavizada con la mano quieta.', 'Prueba con N = 4 y N = 32: ¿qué ganas y qué pierdes?'], checks: ['Con la mano quieta, la lectura suavizada varía menos de la mitad que la cruda', 'He notado que con N grande el instrumento responde más lento', 'El array no se sale de sus límites (índice siempre entre 0 y N − 1)'], code: `const int N = 8;
int lecturas[N];         // global: empieza todo a 0
int pos = 0;
long suma = 0;

int leerSuavizado() {
  suma -= lecturas[pos];               // quita la lectura más antigua
  lecturas[pos] = analogRead(SENSOR);
  suma += lecturas[pos];
  pos = (pos + 1) % N;
  return suma / N;
}` }
    ],
    extra: ['Graba una melodía en un array mientras tocas y reprodúcela con otro botón.', 'Usa un sensor de ultrasonidos HC-SR04 en vez de la LDR: el tono depende de la distancia, sin importar la luz.', 'Añade vibrato: modula la frecuencia unos pocos Hz con una tarea de millis().']
  },
  mc_robot: {
    intro: 'Un robot de dos ruedas que avanza, ve un obstáculo con ultrasonidos, gira la cabeza para mirar a los lados y escapa por el lado más despejado. Integra todo el módulo: funciones, arrays, millis(), estados, librerías, servo y alimentación separada.',
    level: 4, hours: 16,
    skills: ['Controlar dos motores con un driver TB6612FNG', 'Medir distancias con el HC-SR04', 'Servo con la librería y sus efectos en los temporizadores', 'Máquina de estados de un robot', 'Alimentación separada con masa común', 'Vigilar la batería con el ADC'],
    bom: ['Arduino Nano (o Uno)', 'Chasis 2WD con dos motorreductores TT (3–6 V) y rueda loca', 'Módulo driver TB6612FNG', 'Sensor de ultrasonidos HC-SR04', 'Microservo SG90 y soporte para el sensor', 'Portapilas de 4 × AA con interruptor (motores y servo)', 'Batería USB (power bank) para la Nano', 'Condensador electrolítico de 470 µF / 16 V', '2 resistencias de 10 kΩ', 'Protoboard pequeña y cables'],
    phases: [
      { title: 'Fase 1 · Motores y driver', steps: ['TB6612FNG: VM al + del portapilas, VCC al 5V de la Nano, todas las GND unidas (pilas, driver y Nano).', 'PWMA → D5, AIN1 → D4, AIN2 → D3, PWMB → D6, BIN1 → D8, BIN2 → D11, STBY → D12. Motores en A01/A02 y B01/B02.', 'Pon el condensador de 470 µF entre VM y GND, cerca del driver.', 'Carga la prueba con el robot en alto (ruedas al aire) y después en el suelo.', 'Si una rueda gira al revés, intercambia sus dos cables en el driver, no el código.'], checks: ['Adelante, atrás y giro sobre sí mismo funcionan en ese orden', 'Con mover(150, 150) recorre 1 m desviándose menos de 20 cm (ajusta una corrección por rueda si hace falta)', 'La Nano no se reinicia al arrancar los motores'], code: `const int PWMA = 5, AIN1 = 4, AIN2 = 3;
const int PWMB = 6, BIN1 = 8, BIN2 = 11, STBY = 12;

// vel de -255 (atrás) a 255 (adelante)
void motor(int pwm, int in1, int in2, int vel) {
  vel = constrain(vel, -255, 255);
  digitalWrite(in1, vel > 0);
  digitalWrite(in2, vel < 0);
  analogWrite(pwm, abs(vel));
}

void mover(int izq, int der) {
  motor(PWMA, AIN1, AIN2, izq);
  motor(PWMB, BIN1, BIN2, der);
}

void setup() {
  const int pines[] = {PWMA, AIN1, AIN2, PWMB, BIN1, BIN2, STBY};
  for (int p : pines) pinMode(p, OUTPUT);
  digitalWrite(STBY, HIGH);       // saca al driver del modo espera
  delay(3000);                    // tiempo para dejarlo en el suelo
  mover(150, 150);   delay(1000); // adelante
  mover(-150, -150); delay(1000); // atrás
  mover(150, -150);  delay(500);  // giro sobre sí mismo
  mover(0, 0);
}

void loop() {}` },
      { title: 'Fase 2 · Ver con ultrasonidos', steps: ['HC-SR04: VCC a 5V, GND, TRIG → A2 y ECHO → A3 (los pines analógicos también sirven como digitales).', 'Escribe distanciaCm() con un tiempo máximo en pulseIn para no bloquear.', 'Imprime la distancia a una pared a 10, 20, 50 y 100 cm medidos con cinta métrica.', 'Mide como mucho cada 60 ms: un eco tardío puede confundirse con la medida siguiente.'], checks: ['A 20 cm de una pared lisa marca entre 18 y 22 cm', 'Sin nada delante devuelve el valor de «lejos» en vez de quedarse esperando', 'He visto que los objetos blandos o inclinados dan lecturas peores'], code: `const int TRIG = A2, ECHO = A3;

int distanciaCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 25000);   // unos 4 m como máximo
  if (us == 0) return 400;                         // sin eco: lo tratamos como «lejos»
  return us / 58;
}` },
      { title: 'Fase 3 · La cabeza con servo', steps: ['Servo: marrón a GND, rojo al + de las pilas (no al 5V de la Nano), señal a D9.', 'Comprueba que los motores siguen regulando velocidad: la librería Servo quita el PWM de 9 y 10, por eso los motores van en 5 y 6.', 'Escribe mirar(angulo): mueve el servo, espera a que llegue y mide.', 'Calibra los ángulos de izquierda, centro y derecha de tu montaje.'], checks: ['El sensor mira al frente con write(90) (o el ángulo que hayas calibrado)', 'mirar(150) y mirar(30) dan la distancia correcta de cada lado', 'El PWM de los motores sigue funcionando con el servo conectado'], code: `#include <Servo.h>
Servo cuello;   // en setup(): cuello.attach(9); cuello.write(90);

int mirar(int angulo) {
  cuello.write(angulo);
  delay(300);             // el robot está parado: aquí esperar es aceptable
  return distanciaCm();
}` },
      { title: 'Fase 4 · El cerebro: máquina de estados', steps: ['Dibuja los estados AVANZAR, MIRAR, GIRAR y RETROCEDER con sus transiciones.', 'Completa RETROCEDER: atrás 500 ms y después GIRAR.', 'Ajusta la duración del giro para que sea de unos 90°.', 'Prueba 3 minutos en una habitación con muebles.'], checks: ['Frena antes de tocar una pared a velocidad normal', 'Elige el lado más despejado al menos 8 de cada 10 veces', 'En 3 minutos no se queda atascado más de una vez'], code: `enum Estado { AVANZAR, MIRAR, GIRAR, RETROCEDER };
Estado estado = AVANZAR;
unsigned long t0 = 0, tPing = 0;
int sentido = 1;                 // 1 = izquierda, -1 = derecha

void cambiar(Estado e) { estado = e; t0 = millis(); }

void loop() {
  unsigned long t = millis() - t0;
  switch (estado) {
    case AVANZAR:
      mover(160, 160);
      if (millis() - tPing >= 60) {          // el HC-SR04 pide unos 60 ms entre medidas
        tPing = millis();
        if (distanciaCm() < 25) { mover(0, 0); cambiar(MIRAR); }
      }
      break;
    case MIRAR: {
      int izq = mirar(150), der = mirar(30);
      cuello.write(90);
      if (izq < 15 && der < 15) cambiar(RETROCEDER);
      else { sentido = izq > der ? 1 : -1; cambiar(GIRAR); }
      break;
    }
    case GIRAR:
      mover(-140 * sentido, 140 * sentido);  // gira sobre sí mismo
      if (t >= 350) cambiar(AVANZAR);
      break;
    case RETROCEDER:
      // TU PARTE: atrás 500 ms y después GIRAR
      break;
  }
}` },
      { title: 'Fase 5 · Energía y batería', steps: ['Divisor de dos resistencias de 10 kΩ entre el + de las pilas y GND; el punto medio a A1.', 'Calcula la tensión: lectura × 5,0 / 1023 × 2 (la referencia es el 5V de la Nano).', 'Si baja de 4,4 V con pilas alcalinas (4,0 V con NiMH), para los motores y haz parpadear el LED 13.', 'Mide con el multímetro la corriente de los motores en marcha y con una rueda frenada con la mano (un instante).'], checks: ['Con 4 pilas nuevas mide entre 5,6 y 6,5 V y coincide con el multímetro (±0,1 V)', 'Con pilas gastadas el robot se detiene y avisa', 'He anotado la corriente en marcha y con la rueda frenada, y está dentro de lo que aguanta el driver (1,2 A continuos por canal)'] }
    ],
    extra: ['Añade dos sensores infrarrojos para seguir una línea negra en el suelo.', 'Controla el robot desde el móvil con un módulo Bluetooth o pasándolo a un ESP32.', 'Pon encoders en las ruedas y usa interrupciones para avanzar distancias exactas.']
  }
};
