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
    checks: ['El DRC pasa sin errores', 'He generado los Gerbers', 'He soldado la placa y funciona'] }
};
