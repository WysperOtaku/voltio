/* Voltio · temario. Orden inspirado en Getting Started in Electronics (Mims),
   profundidad de The Art of Electronics e ideas prácticas de Make: Electronics.
   Todo el texto y los ejercicios son originales. */
const I = (text, x = {}) => ({ t: 'info', text, ...x });
const Q = (q, o, e, x = {}) => ({ t: 'mc', q, o, a: 0, e, ...x });
const Nm = (q, a, u, e, x = {}) => ({ t: 'num', q, a, u, e, ...x });
const G = g => ({ t: 'gen', g });
const TU = (q, viz, params, goal, e) => ({ t: 'tune', q, viz, params, goal, e });
const MT = (q, scene, task, e, x = {}) => ({ t: 'meter', q, scene, task, e, ...x });
const L = (id, title, icon, c, ex) => ({ id, kind: 'lesson', title, icon, c, ex });
const SIM = (id, title, brief, sim, checks) => ({ id, kind: 'sim', title, icon: 'sim', brief, sim, checks });
const PRJ = (id, title, project) => ({ id, kind: 'project', title, icon: 'proj', project });
const pV = (val = 9, min = 1, max = 12) => ({ label: 'Pila', val, min, max, step: 0.5, unit: 'V', dec: 1 });
const pR = (label, val, min = 10, max = 1e6) => ({ label, val, fmt: 'R', min, max });
const OHM_TRI = '<svg viewBox="0 0 200 150" class="viz"><path d="M100 15L185 135H15Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M45 85H155M100 85V135" stroke="currentColor" stroke-width="3"/><text x="100" y="72" text-anchor="middle" font-size="30" font-weight="800" fill="currentColor">V</text><text x="70" y="122" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">I</text><text x="130" y="122" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">R</text></svg>';

const UNITS = [
{ id: 'm0', title: 'Matemáticas para electrónica', desc: 'Las cuentas que usarás en cada circuito: potencias de 10, prefijos, despejar y proporciones.', nodes: [
 L('a1', 'Potencias de 10', 'bin', ['pow10'], [
  I('En electrónica conviven números enormes y diminutos: una resistencia de 1 000 000 Ω y un condensador de 0,000 000 1 F. Para no perdernos entre ceros usamos potencias de 10.\n10³ = 1000 (un 1 con tres ceros). 10⁻³ = 0,001 (la coma se mueve tres posiciones a la izquierda). 10⁰ = 1.'),
  Q('¿Cuánto vale 10⁴?', ['10 000', '40', '1000', '0,0001'], 'Un 1 seguido de cuatro ceros.'),
  Q('¿Cuánto vale 10⁻²?', ['0,01', '−100', '0,2', '100'], 'El exponente negativo mueve la coma a la izquierda.'),
  I('Multiplicar potencias de 10: <b>se suman los exponentes</b>. 10³ × 10² = 10⁵. Dividir: <b>se restan</b>. 10⁶ ÷ 10² = 10⁴.'),
  G('pow10'), G('pow10div'), G('pow10'),
  I('La notación científica escribe un número como (una cifra, decimales) × 10ⁿ. 4700 = 4,7 × 10³. 0,00022 = 2,2 × 10⁻⁴.'),
  G('sci'), G('sci')
 ]),
 L('a2', 'Prefijos: de pico a mega', 'bin', ['prefix'], [
  I('Los prefijos son atajos para potencias de 10, en saltos de 1000:\n<b>p</b> 10⁻¹² · <b>n</b> 10⁻⁹ · <b>µ</b> 10⁻⁶ · <b>m</b> 10⁻³ · <b>k</b> 10³ · <b>M</b> 10⁶.\nAsí, 4,7 kΩ = 4700 Ω y 20 mA = 0,02 A.'),
  { t: 'match', q: 'Une cada prefijo con su valor.', pairs: [['k', '× 1000'], ['m', '÷ 1000'], ['µ', '÷ 1 000 000'], ['M', '× 1 000 000']] },
  G('prefixName'), G('prefixConv'), G('prefixConv'), G('prefixConv'),
  Q('m y M se confunden mucho. ¿Qué es 1 MΩ?', ['Un millón de ohmios', 'Una milésima de ohmio', 'Mil ohmios', 'Un megavoltio'], 'M mayúscula = mega; m minúscula = mili.'),
  G('prefixConv'), G('estimate')
 ]),
 L('a3', 'Despejar fórmulas', 'ohm', ['algebra'], [
  I('Casi todas las fórmulas de electrónica tienen tres letras: si conoces dos, despejas la tercera. La regla: <b>lo que hagas a un lado de la igualdad, házselo al otro</b>.\nDe V = I × R, divide los dos lados entre R → V / R = I.'),
  Q('De V = I × R, ¿qué es I?', ['V / R', 'V × R', 'R / V', 'V − R'], 'Divide los dos lados entre R.'),
  G('rearrange'), G('rearrange'), G('rearrange'),
  I('Truco de comprobación: prueba con números sencillos. Si V = I × R con I = 2 y R = 3 da 6, entonces I = V / R da 6 / 3 = 2. ✓'),
  G('rearrange'),
  Q('De P = I² × R, ¿cuánto vale I?', ['√(P / R)', 'P / R', 'P / R²', '√(P × R)'], 'Divide entre R y haz la raíz.')
 ]),
 L('a4', 'Proporciones y porcentajes', 'div', ['algebra'], [
  I('Muchas relaciones son proporcionales: el doble de tensión da el doble de corriente; el doble de resistencia, la mitad. Reconocerlo te ahorra cálculos.'),
  Q('Con 3 V pasan 6 mA. ¿Cuánto con 9 V (misma resistencia)?', ['18 mA', '2 mA', '12 mA', '6 mA'], 'Triple de tensión, triple de corriente.'),
  Q('Con 1 kΩ pasan 8 mA. ¿Cuánto con 4 kΩ (misma pila)?', ['2 mA', '32 mA', '8 mA', '4 mA'], 'Cuatro veces más resistencia, cuatro veces menos corriente.'),
  G('proportion'), G('percent'), G('percent'),
  I('La <b>tolerancia</b> dice cuánto puede desviarse un componente de su valor. 1 kΩ al ±5 % puede valer entre 950 y 1050 Ω.'),
  G('tolerance'), G('tolerance')
 ]),
 L('a5', 'Inversos y la fórmula del paralelo', 'series', ['parallel'], [
  I('El inverso de un número es 1 dividido entre él: el de 4 es 0,25. En paralelo se suman los inversos:\n<b>1/Rt = 1/R1 + 1/R2 + …</b>'),
  Q('Inverso de 0,5', ['2', '0,5', '−0,5', '0,25'], '1 / 0,5 = 2.'),
  Nm('1/Rt = 1/100 + 1/100. ¿Rt?', 50, 'Ω', '1/Rt = 0,02 → 50 Ω.'),
  I('Con dos resistencias hay un atajo: <b>Rt = (R1 × R2) / (R1 + R2)</b>, “producto partido por suma”. Con n iguales: R / n.'),
  G('parallel2'), G('parallelN'), G('parallel2'),
  Q('¿Por qué el total en paralelo es menor que la más pequeña?', ['Cada rama añade un camino más', 'Las resistencias se restan', 'Se pierde tensión', 'No siempre lo es'], 'Más caminos, más facilidad.')
 ]),
 L('a6', 'Estimar y redondear', 'bin', ['prefix'], [
  I('Un buen técnico estima antes de calcular. Si esperas unos miliamperios y la calculadora dice 9 A, sabes que te has equivocado de prefijo.\n9 V / 470 Ω ≈ 9 / 500 ≈ 20 mA (real: 19,1 mA).'),
  G('estimate'), G('estimate'),
  Q('Estima: 12 V / 2,2 kΩ', ['Unos 5 mA', 'Unos 5 A', 'Unos 50 mA', 'Unos 0,5 mA'], '12 / 2000 ≈ 6 mA → real 5,45 mA.'),
  Q('Te sale que la resistencia de un LED disipa 40 W. ¿Qué haces?', ['Revisar las cuentas: deberían ser milivatios', 'Comprar una de 50 W', 'Usar dos LEDs', 'Nada'], 'Si el orden de magnitud no encaja, es un error de unidades.'),
  G('ohmMC')
 ])
] },

{ id: 'm1', title: 'Qué es la electricidad', desc: 'Carga, corriente, tensión y resistencia desde cero.', nodes: [
 L('b1', 'Átomos y carga eléctrica', 'bolt', ['charge'], [
  I('Toda la materia está hecha de átomos. Cada átomo tiene un núcleo con <b>protones</b> (carga positiva) y alrededor <b>electrones</b> (carga negativa). Normalmente hay los mismos de cada tipo y el átomo es neutro.\nCargas iguales se repelen; opuestas se atraen.'),
  Q('¿Qué carga tiene un electrón?', ['Negativa', 'Positiva', 'Ninguna', 'Depende del material'], 'Electrones −, protones +.'),
  Q('Dos objetos con carga negativa se acercan. ¿Qué pasa?', ['Se repelen', 'Se atraen', 'Nada', 'Se neutralizan'], 'Iguales se repelen.'),
  I('En los metales, algunos electrones están sueltos y saltan de átomo en átomo: son los <b>electrones libres</b>, y forman la corriente.\nLa carga se mide en culombios (C): un culombio son unos 6,24 × 10¹⁸ electrones.'),
  Q('¿Qué permite que el cobre conduzca?', ['Tiene electrones libres', 'Está hueco', 'Tiene protones sueltos', 'Viene cargado de fábrica'], 'Electrones poco ligados.'),
  Q('Al frotar un globo en el pelo queda cargado negativamente. ¿Qué ha ganado?', ['Electrones', 'Protones', 'Átomos', 'Neutrones'], 'Los electrones son los que se mueven.')
 ]),
 L('b2', 'Conductores, aislantes y semiconductores', 'bolt', ['resistance'], [
  I('<b>Conductores</b> (cobre, plata, aluminio, oro): muchos electrones libres.\n<b>Aislantes</b> (plástico, vidrio, goma, aire seco): casi ninguno.\n<b>Semiconductores</b> (silicio, germanio): en medio y controlables. De ellos se hacen diodos, transistores y chips.'),
  { t: 'match', q: 'Clasifica cada material.', pairs: [['Cobre', 'Conductor'], ['Goma', 'Aislante'], ['Silicio', 'Semiconductor'], ['Aluminio', 'Conductor ']] },
  Q('¿Por qué los cables llevan cobre dentro y plástico fuera?', ['El cobre conduce y el plástico protege', 'El plástico conduce mejor', 'Para que pesen menos', 'Por estética'], 'Conductor para llevar, aislante para proteger.'),
  Q('El agua del grifo…', ['Conduce por las sales disueltas: nunca juegues con electricidad cerca del agua', 'Es un aislante perfecto', 'Es un semiconductor', 'Solo conduce caliente'], 'Las sales la hacen conductora.'),
  Q('¿Qué material es la base de casi todos los chips?', ['Silicio', 'Cobre', 'Plástico', 'Oro'], 'De ahí Silicon Valley.')
 ]),
 L('b3', 'La corriente: carga en movimiento', 'bolt', ['current'], [
  I('La <b>corriente</b> es la carga que pasa por un punto cada segundo. Se mide en <b>amperios</b>: 1 A = 1 culombio por segundo.\n<b>I = Q / t</b>', { tune: { viz: 'ohm', params: { V: pV(6), R: pR('Resistencia', 470, 100, 4700) } } }),
  Q('Pasan 10 culombios en 5 segundos. ¿Corriente?', ['2 A', '50 A', '0,5 A', '10 A'], 'I = 10 / 5.', { c: 'charge' }),
  I('Los electrones avanzan despacísimo (milímetros por segundo). Pero el cable ya está lleno de ellos: cuando la pila empuja, se mueven todos a la vez y la luz se enciende al instante.'),
  Q('La luz se enciende al momento porque…', ['Todos los electrones del cable empiezan a moverse a la vez', 'Viajan a la velocidad de la luz', 'La bombilla guarda energía', 'El interruptor fabrica electrones'], 'Como una fila de canicas.', { c: 'charge' }),
  I('Por convenio, la <b>corriente convencional</b> va del + al − por fuera de la pila. Los electrones van al revés, pero todos los esquemas y fórmulas usan el sentido convencional.'),
  Q('En un esquema, la corriente sale de la pila por…', ['El polo +', 'El polo −', 'Los dos', 'Ninguno'], 'Sentido convencional.'),
  Q('¿La corriente que vuelve a la pila es menor que la que sale?', ['No, es la misma', 'Sí, la bombilla la consume', 'Sí, la mitad', 'Depende'], 'Se consume energía, no carga.'),
  G('prefixConv')
 ]),
 L('b4', 'La tensión: el empuje', 'bat', ['voltage'], [
  I('La <b>tensión</b> (diferencia de potencial, voltaje) es el empuje que mueve las cargas. Se mide en <b>voltios</b>.\nLo más importante: la tensión siempre es <b>entre dos puntos</b>.'),
  Q('¿Por qué el multímetro usa dos puntas para medir tensión?', ['Porque la tensión es una diferencia entre dos puntos', 'Por si una se rompe', 'Ida y vuelta', 'Para ir más rápido'], 'Siempre se compara un punto con otro.'),
  I('Elegimos un punto de referencia llamado <b>masa</b> o <b>GND</b> (normalmente el − de la pila) y le damos 0 V. “Este punto está a 5 V” significa “a 5 V respecto a masa”.', { symk: 'gnd' }),
  Q('A está a 9 V y B a 4 V respecto a masa. ¿Tensión entre A y B?', ['5 V', '13 V', '9 V', '4 V'], 'Diferencia: 9 − 4.'),
  I('Físicamente, la tensión es <b>energía por unidad de carga</b>: 1 V = 1 julio por culombio.'),
  Q('Dos pilas de 1,5 V en serie (+ con −) dan…', ['3 V', '1,5 V', '0 V', '2,25 V'], 'En serie se suman.'),
  Q('¿Y si pones una del revés (+ con +)?', ['Se restan: 0 V', 'Se suman: 3 V', 'Explotan', '1,5 V'], 'Una empuja contra la otra.'),
  G('kvl')
 ]),
 L('b5', 'La resistencia: el freno', 'res', ['resistance'], [
  I('La <b>resistencia</b> es la oposición al paso de la corriente. Se mide en <b>ohmios</b> (Ω). Al vencerla, la energía se convierte en calor: así funcionan estufas y tostadoras.', { symk: 'res' }),
  I('La resistencia de un hilo depende de:\n· El <b>material</b> (resistividad ρ).\n· La <b>longitud</b>: más largo, más resistencia.\n· La <b>sección</b>: más grueso, menos.\n<b>R = ρ · L / S</b>'),
  Q('2 m de cable tienen 0,1 Ω. ¿Y 6 m del mismo cable?', ['0,3 Ω', '0,03 Ω', '0,1 Ω', '0,6 Ω'], 'Proporcional a la longitud.'),
  Q('El doble de sección, mismo material y longitud…', ['La mitad de resistencia', 'El doble', 'La misma', 'Cuatro veces más'], 'Inversamente proporcional a la sección.'),
  Q('¿Por qué los cables de un horno son más gruesos que los de un cargador?', ['Llevan más corriente y deben tener poca resistencia', 'Para que no se rompan', 'Por el color', 'Por la tensión'], 'Más corriente, más sección.'),
  I('Las <b>resistencias</b> (componentes) ponen exactamente la oposición que queremos: limitar la corriente de un LED, fijar una tensión, ajustar un tiempo.'),
  G('colorRead')
 ]),
 L('b6', 'Abierto, cerrado y cortocircuito', 'bolt', ['circuit'], [
  I('Un circuito es un <b>camino cerrado</b> desde un polo de la fuente, a través de los componentes, hasta el otro. Si se corta en cualquier punto, la corriente se detiene en todas partes.', { sch: 'flashlight' }),
  Q('Si el LED se desconecta de un lado, ¿qué pasa?', ['Se apaga todo: circuito abierto', 'Sigue la mitad', 'Cortocircuito', 'La resistencia se calienta'], 'Un corte abre el circuito.', { sch: 'flashlight' }),
  I('Un <b>cortocircuito</b> es un camino casi sin resistencia entre los polos. La corriente se dispara: cables calientes, pilas agotadas en minutos o baterías de litio que se incendian. Los fusibles cortan el circuito si pasa.'),
  Q('¿Qué limita la corriente en un cortocircuito de una pila?', ['Solo su resistencia interna y la de los cables', 'Nada, es infinita', 'El color del cable', 'La tensión baja a cero'], 'Por eso se calienta.'),
  Q('¿Para qué sirve un fusible?', ['Para fundirse y abrir el circuito ante corriente excesiva', 'Para aumentar la corriente', 'Para medir', 'Para guardar carga'], 'Un punto débil a propósito.'),
  { t: 'pick', q: '¿Cuál de estos circuitos tiene un problema grave?', o: ['ledNoRes', 'ledBasic', 'flashlight'], a: 0, e: 'Sin resistencia, el LED casi cortocircuita la pila.', c: 'circuit' }
 ]),
 L('b7', 'Fuentes de energía', 'bat', ['voltage'], [
  I('Una <b>pila</b> convierte energía química en eléctrica y tiene una pequeña <b>resistencia interna</b>: cuando le pides mucha corriente, parte de su tensión se pierde dentro.'),
  Q('Una pila de 9 V marca 9,3 V en vacío y 7,5 V con un motor. ¿Por qué?', ['La corriente provoca caída en su resistencia interna', 'El motor fabrica tensión', 'El multímetro falla', 'Está rota'], 'Más gastada, más resistencia interna.'),
  I('· Pila AA: 1,5 V. · Pila cuadrada: 9 V (seis celdas de 1,5 V).\n· Li-ion: 3,7 V nominales (4,2 V llena).\n· USB: 5 V.\n· Fuente de laboratorio: tensión ajustable y límite de corriente.'),
  { t: 'match', q: 'Une cada fuente con su tensión.', pairs: [['Pila AA', '1,5 V'], ['Li-ion', '3,7 V'], ['USB', '5 V'], ['Pila cuadrada', '9 V']] },
  Q('¿Qué ventaja tiene el límite de corriente de una fuente de laboratorio?', ['Si te equivocas, evita quemar componentes', 'Da más tensión', 'Hace el circuito más rápido', 'Ninguna'], 'La mejor protección mientras aprendes.'),
  Q('Cuatro pilas AA en serie dan…', ['6 V', '1,5 V', '4 V', '3 V'], '4 × 1,5 V.')
 ]),
 SIM('s1a', 'Reto: tu primer circuito', 'Monta pila, interruptor, resistencia y LED. El LED solo debe encenderse con el interruptor cerrado.', { battery: 9, parts: ['sw', 'res', 'led'], sch: 'flashlight', hint: 'Del + al interruptor, luego la resistencia, luego el LED (pata + hacia la resistencia) y vuelta al −. Toca el interruptor dos veces para cambiarlo.' }, 'flashlight')
] },

{ id: 'm2', title: 'Ley de Ohm y potencia', desc: 'La relación que lo une todo y cómo no quemar nada.', nodes: [
 L('c1', 'La ley de Ohm, intuición', 'ohm', ['ohm'], [
  I('Si duplicas la tensión, se duplica la corriente. Si duplicas la resistencia, se reduce a la mitad. Esa es la ley de Ohm:\n<b>V = I × R</b>', { tune: { viz: 'ohm', params: { V: pV(2), R: pR('Resistencia', 1000, 100, 10000) } } }),
  TU('Consigue más de 50 mA cambiando solo la resistencia.', 'ohm', { V: { ...pV(6), fixed: true }, R: pR('Resistencia', 4700, 47, 10000) }, { q: 'I', min: 0.05, max: 10, text: 'Objetivo: más de 50 mA', hint: 'Menos resistencia, más corriente.' }, 'Con 6 V, por debajo de 120 Ω.'),
  TU('Ajusta pila y resistencia para exactamente 10 mA.', 'ohm', { V: pV(5), R: pR('Resistencia', 220, 100, 10000) }, { q: 'I', min: 0.0098, max: 0.0102, text: 'Objetivo: 10 mA', hint: 'I = V / R: por ejemplo 10 V con 1 kΩ.' }, 'Hay muchas combinaciones válidas.'),
  Q('Misma resistencia, tensión ×3. La corriente…', ['Se triplica', 'Se divide entre 3', 'No cambia', 'Se multiplica por 9'], 'Proporcional.'),
  Q('Misma pila, resistencia a la mitad. La corriente…', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'Inversamente proporcional.')
 ]),
 L('c2', 'Calcular con la ley de Ohm', 'ohm', ['ohm'], [
  I('Tres formas de la misma ley: <b>V = I × R</b> · <b>I = V / R</b> · <b>R = V / I</b>.\nReceta: 1) todo a V, A y Ω; 2) aplica; 3) vuelve a un prefijo cómodo.', { svg: OHM_TRI }),
  G('ohmV'), G('ohmI'), G('ohmR'), G('ohmMC'), G('ohmI'), G('ohmV'),
  Q('Calculas que por 1 kΩ con 5 V pasan 5 A. ¿Qué ha fallado?', ['Usaste 1 en vez de 1000 Ω', 'Nada', 'La pila es grande', 'La fórmula es I = V × R'], '5 / 1000 = 5 mA.')
 ]),
 L('c3', 'Gráficas tensión–corriente', 'ohm', ['ohm'], [
  I('Midiendo la corriente a distintas tensiones, una resistencia da una <b>recta</b> por el origen: es <b>lineal</b>. La pendiente es 1/R: más inclinada, menos resistencia.', { svg: '<svg viewBox="0 0 260 170" class="viz"><path d="M30 150H250M30 150V15" stroke="currentColor" stroke-width="2"/><path d="M30 150L230 40" stroke="#3E8FCB" stroke-width="3"/><path d="M30 150L230 100" stroke="#F2A900" stroke-width="3"/><path d="M30 150C120 149 150 146 170 130S190 40 200 15" stroke="#E5484D" stroke-width="3" fill="none"/><text x="200" y="34" font-size="11" fill="currentColor">R baja</text><text x="200" y="94" font-size="11" fill="currentColor">R alta</text><text x="150" y="30" font-size="11" fill="#E5484D">LED</text><text x="238" y="164" font-size="11" fill="currentColor">V</text><text x="12" y="20" font-size="11" fill="currentColor">I</text></svg>' }),
  Q('¿Qué recta es la resistencia más pequeña?', ['La más inclinada', 'La más plana', 'Iguales', 'La curva'], 'Con poca tensión ya pasa mucha corriente.'),
  Q('La curva del LED no es recta. Significa…', ['Que no cumple la ley de Ohm: su “resistencia” cambia', 'Que está roto', 'Que es aislante', 'Que es variable a mano'], 'Componente no lineal.'),
  Q('¿Qué tiene de peligroso esa curva?', ['Pasado el codo, un poco más de tensión dispara la corriente', 'Nunca conduce', 'Conduce en ambos sentidos', 'Nada'], 'Por eso lleva resistencia.', { c: 'led' }),
  Nm('Una recta pasa por (4 V, 2 mA). ¿Resistencia?', 2000, 'Ω', '4 / 0,002.')
 ]),
 L('c4', 'Potencia: energía por segundo', 'heat', ['power'], [
  I('La <b>potencia</b> es la rapidez con que se transforma la energía, en vatios: 1 W = 1 julio por segundo.\n<b>P = V × I</b>'),
  G('power'), G('power'),
  I('Combinando con Ohm: <b>P = I² × R</b> (si conoces I y R) y <b>P = V² / R</b> (si conoces V y R).', { tune: { viz: 'power', params: { V: pV(9), R: pR('Resistencia', 1000, 22, 10000) } } }),
  G('power'), G('power'),
  Q('Doble de corriente por la misma resistencia. Su potencia…', ['Se cuadruplica', 'Se duplica', 'No cambia', 'Baja'], 'P = I²R.')
 ]),
 L('c5', 'Elegir la potencia de una resistencia', 'heat', ['power'], [
  I('Las resistencias normales aguantan <b>¼ W</b>. Las hay de ½, 1, 5 W… Regla práctica: elige una que aguante <b>al menos el doble</b> de lo calculado.'),
  TU('Con 9 V, elige la resistencia más baja que no supere ¼ W.', 'power', { V: { ...pV(9), fixed: true }, R: pR('Resistencia', 10000, 22, 10000) }, { q: 'P', min: 0.15, max: 0.25, text: 'Objetivo: entre 0,15 y 0,25 W', hint: 'R ≥ 81 / 0,25 = 324 Ω.' }, '330 Ω: 0,245 W, en el límite.'),
  G('rating'), G('rating'), G('rating'),
  Q('Una resistencia de LED disipa 70 mW. ¿Qué potencia eliges?', ['¼ W sobra', '5 W', '1/16 W justo', 'Ninguna'], 'Más del triple de margen.')
 ]),
 L('c6', 'Energía y consumo', 'bat', ['power'], [
  I('La <b>energía</b> es potencia por tiempo. La factura cuenta <b>kWh</b>: 1000 W durante una hora. En baterías se usa mAh.'),
  G('energy'), G('energy'),
  Q('¿Qué gasta más: un LED de 10 W 10 horas o un secador de 2000 W 3 minutos?', ['Lo mismo: 100 Wh cada uno', 'El LED', 'El secador, diez veces más', 'Ninguno'], '10 × 10 = 100 Wh; 2000 × 0,05 = 100 Wh.'),
  G('battLife'), G('battLife')
 ]),
 SIM('s1', 'Reto: enciende un LED', 'Enciende un LED con la pila de 9 V, entre 5 y 25 mA, sin quemarlo.', { battery: 9, parts: ['res', 'led'], hint: 'Del + a una resistencia, luego el LED y vuelta al −. Ánodo hacia el +.' }, 'ledOn'),
 PRJ('p1', 'Proyecto: linterna LED', 'flashlight')
] },

{ id: 'm3', title: 'Análisis de circuitos', desc: 'Serie, paralelo, mixtos, Kirchhoff, divisores y Thévenin.', nodes: [
 L('d1', 'Circuitos en serie', 'series', ['series'], [
  I('En <b>serie</b>, uno detrás de otro:\n· La <b>corriente es la misma</b> en todos.\n· Las <b>resistencias se suman</b>.\n· La <b>tensión se reparte</b> en proporción a cada resistencia.', { tune: { viz: 'series', params: { V: pV(9), R1: pR('R1', 1000, 100, 10000), R2: pR('R2', 1000, 100, 10000) } } }),
  TU('Haz que en R1 caigan 6 V y en R2 3 V.', 'series', { V: { ...pV(9), fixed: true }, R1: pR('R1', 1000, 100, 10000), R2: pR('R2', 1000, 100, 10000) }, { q: 'V1', min: 5.9, max: 6.1, text: 'Objetivo: V1 = 6 V', hint: 'R1 el doble que R2.' }, 'Por ejemplo 2,2 kΩ y 1,1 kΩ.'),
  G('series'), G('series'),
  Nm('9 V con 1 kΩ y 2 kΩ en serie. ¿Corriente?', 3, 'mA', 'Rt = 3 kΩ → 3 mA.'),
  Nm('¿Cuánto cae en la de 2 kΩ?', 6, 'V', '3 mA × 2 kΩ.'),
  Q('Se funde una bombilla de una guirnalda en serie…', ['Se apagan todas', 'Solo esa', 'Las demás brillan más', 'Nada'], 'Un solo camino.')
 ]),
 L('d2', 'Circuitos en paralelo', 'series', ['parallel'], [
  I('En <b>paralelo</b>, todo comparte los mismos dos puntos:\n· La <b>tensión es la misma</b>.\n· La <b>corriente se reparte</b>: más por la rama de menor resistencia.\n· El total es <b>menor que la más pequeña</b>.', { tune: { viz: 'parallel', params: { V: pV(9), R1: pR('R1', 1000, 100, 10000), R2: pR('R2', 2200, 100, 10000) } } }),
  G('parallel2'), G('parallelN'), G('parallelMC'),
  Q('¿Por qué los enchufes de casa están en paralelo?', ['Para que todos reciban la misma tensión y funcionen por separado', 'Para ahorrar cable', 'Para igualar la corriente', 'Casualidad'], 'Desenchufar uno no afecta a los demás.'),
  G('currentDiv'),
  { t: 'pick', q: '¿Cuál tiene las resistencias en paralelo?', o: ['parallel2', 'series3', 'divider'], a: 0, e: 'Ambas a los mismos dos nudos.', c: 'parallel' }
 ]),
 L('d3', 'Circuitos mixtos', 'series', ['parallel'], [
  I('Los circuitos reales mezclan serie y paralelo. Método: <b>reduce por partes</b>. Busca grupos claramente en serie o en paralelo, sustitúyelos por su equivalente y repite.'),
  G('mixed'), G('mixed'),
  Nm('Dos de 200 Ω en paralelo, en serie con 400 Ω. Con 10 V, ¿corriente total?', 20, 'mA', 'Paralelo 100 Ω; total 500 Ω.'),
  Nm('¿Y por cada una de las de 200 Ω?', 10, 'mA', 'Iguales: mitad cada una.'),
  Q('¿Primer paso con un circuito mixto?', ['Identificar grupos en serie o paralelo y reducirlos', 'Sumar todo', 'Medir', 'Dividir la tensión entre componentes'], 'De dentro hacia fuera.')
 ]),
 L('d4', 'Ley de nudos (Kirchhoff I)', 'node', ['kcl'], [
  I('Un <b>nudo</b> une tres o más conductores. Primera ley de Kirchhoff: <b>lo que entra es igual a lo que sale</b>.', { tune: { viz: 'kcl', params: { I1: { label: 'I1', val: 0.01, min: 0, max: 0.05, step: 0.001, fmt: 'mA' }, I2: { label: 'I2', val: 0.02, min: 0, max: 0.05, step: 0.001, fmt: 'mA' } } } }),
  G('kcl'), G('kcl'),
  Q('Una corriente calculada sale negativa. Significa…', ['Que va en sentido contrario al supuesto', 'Error seguro', 'Que no hay corriente', 'Que genera energía'], 'El signo indica sentido.'),
  Nm('Llegan 15 mA y 25 mA; salen dos ramas, una con 30 mA. ¿La otra?', 10, 'mA', '40 − 30.')
 ]),
 L('d5', 'Ley de mallas (Kirchhoff II)', 'node', ['kvl'], [
  I('Una <b>malla</b> es un camino cerrado. Segunda ley: <b>las subidas de tensión igualan a las caídas</b>. La pila sube; cada componente baja.', { tune: { viz: 'series', params: { V: pV(9), R1: pR('R1', 470, 100, 10000), R2: pR('R2', 1000, 100, 10000) } } }),
  G('kvl'), G('kvl'),
  Nm('12 V; en serie R1, un LED de 2 V y R2. En R1 caen 4 V. ¿En R2?', 6, 'V', '12 − 4 − 2.'),
  Q('¿Por qué es útil al depurar un circuito real?', ['Si las tensiones medidas no suman la pila, hay algo que no ves (mala conexión)', 'Para saber la corriente sin medir', 'No es útil', 'Para elegir colores'], 'Te dice dónde buscar.')
 ]),
 L('d6', 'El divisor de tensión', 'div', ['divider'], [
  I('Dos resistencias en serie forman un <b>divisor</b>:\n<b>Vsal = Vent × R2 / (R1 + R2)</b>', { tune: { viz: 'divider', params: { V: pV(9), R1: pR('R1', 1000, 100, 100000), R2: pR('R2', 1000, 100, 100000) } } }),
  TU('Consigue 3,3 V partiendo de 5 V.', 'divider', { V: { ...pV(5), fixed: true }, R1: pR('R1', 1000, 100, 100000), R2: pR('R2', 1000, 100, 100000) }, { q: 'Vout', min: 3.2, max: 3.4, text: 'Objetivo: 3,3 V ± 0,1', hint: 'R2 ≈ el doble que R1.' }, '4,7 kΩ y 10 kΩ dan 3,40 V.'),
  G('divider'), G('divider'), G('divider'),
  Q('Conectas una carga de poca resistencia a la salida. La tensión…', ['Baja', 'Sube', 'No cambia', 'Se invierte'], 'La carga queda en paralelo con R2.')
 ]),
 L('d7', 'Thévenin', 'div', ['divider'], [
  I('Cualquier circuito de fuentes y resistencias, visto desde dos puntos, equivale a <b>una fuente Vth en serie con Rth</b>.\n· Vth: tensión entre esos puntos sin carga.\n· Rth: resistencia vista con las pilas sustituidas por cables.'),
  Q('Divisor de 9 V con 1 kΩ y 1 kΩ. ¿Vth en la salida?', ['4,5 V', '9 V', '0 V', '2,25 V'], 'Sin carga, la mitad.'),
  Q('¿Y Rth? (pila → cable: R1 y R2 en paralelo)', ['500 Ω', '2 kΩ', '1 kΩ', '0 Ω'], '1 kΩ ∥ 1 kΩ.'),
  Nm('Con una carga de 500 Ω en esa salida, ¿tensión?', 2.25, 'V', 'Divisor entre Rth y la carga.'),
  Q('¿Para qué sirve en la práctica?', ['Para saber cuánto caerá una salida al conectarle una carga', 'Para colores', 'Para medir corriente', 'Solo teoría'], 'Rth dice lo “débil” que es una salida.')
 ]),
 L('d8', 'Puente de Wheatstone', 'div', ['divider'], [
  I('Dos divisores en paralelo forman un <b>puente</b>. Si dan la misma tensión, entre sus puntos medios hay 0 V: equilibrado. Si un sensor cambia un poco, aparece una pequeña tensión fácil de medir o amplificar.'),
  Q('9 V: a la izquierda 1 kΩ/1 kΩ, a la derecha 2 kΩ/2 kΩ. ¿Tensión entre puntos medios?', ['0 V', '4,5 V', '9 V', '2,25 V'], 'Ambos 4,5 V.'),
  Q('¿Por qué un puente para sensores?', ['Detecta cambios muy pequeños alrededor de cero', 'Consume menos', 'Es bonito', 'No necesita alimentación'], 'Medir cerca de 0 V es más fácil.'),
  G('divider')
 ]),
 SIM('s1b', 'Reto: divisor de 3 V', 'Construye un divisor que dé entre 2,7 y 3,3 V respecto al negativo, consumiendo menos de 10 mA.', { battery: 9, parts: ['res'], hint: 'Dos resistencias en serie entre + y −; la de arriba el doble que la de abajo.' }, 'divider3'),
 SIM('s2b', 'Reto: dos LEDs en paralelo', 'Enciende dos LEDs en paralelo, cada uno entre 5 y 25 mA.', { battery: 9, parts: ['res', 'led'], hint: 'Cada LED con su resistencia, las dos ramas entre + y −.' }, 'twoLeds'),
 PRJ('p2', 'Proyecto: probador de continuidad', 'tester')
] },

{ id: 'm4', title: 'Esquemas y protoboard', desc: 'El idioma de los circuitos y cómo pasarlo a la mesa.', nodes: [
 L('e1', 'Símbolos básicos', 'sym', ['schematic'], [
  I('Un esquema no dice dónde está cada pieza, sino qué está conectado con qué. Cada componente tiene su símbolo.', { symk: 'res' }),
  { t: 'match', q: 'Une cada símbolo.', pairs: [['sym:res', 'Resistencia'], ['sym:bat', 'Pila'], ['sym:led', 'LED'], ['sym:cap', 'Condensador']] },
  { t: 'match', q: 'Y estos.', pairs: [['sym:diode', 'Diodo'], ['sym:push', 'Pulsador'], ['sym:gnd', 'Masa (GND)'], ['sym:sw', 'Interruptor']] },
  { t: 'sym', k: 'bat', q: '¿Qué línea es el positivo?', o: ['La larga', 'La corta', 'Las dos', 'Ninguna'], a: 0, e: 'Larga = +.', c: 'schematic' },
  { t: 'sym', k: 'led', q: '¿Qué indican las flechitas?', o: ['Que emite luz', 'Que recibe luz', 'Que es rápido', 'El sentido del cable'], a: 0, e: 'Hacia fuera: emite.', c: 'schematic' }
 ]),
 L('e2', 'Más símbolos', 'sym', ['schematic'], [
  { t: 'match', q: 'Une cada símbolo.', pairs: [['sym:npn', 'Transistor NPN'], ['sym:ldr', 'Fotorresistencia'], ['sym:pot', 'Potenciómetro'], ['sym:zener', 'Diodo zener']] },
  { t: 'match', q: 'Y estos.', pairs: [['sym:motor', 'Motor'], ['sym:fuse', 'Fusible'], ['sym:opamp', 'Amplificador operacional'], ['sym:ecap', 'Electrolítico']] },
  { t: 'sym', k: 'ecap', q: '¿Qué indica la placa curva o el +?', o: ['Que tiene polaridad', 'Que es grande', 'Que es variable', 'Que es de alterna'], a: 0, e: 'Los electrolíticos tienen + y −.', c: 'cap' },
  { t: 'sym', k: 'pot', q: '¿Qué representa la flecha?', o: ['Un cursor móvil', 'Que emite luz', 'El sentido de la corriente', 'Que está rota'], a: 0, e: 'La tercera pata es el cursor.', c: 'schematic' }
 ]),
 L('e3', 'Leer esquemas', 'sym', ['schematic'], [
  I('Sigue la corriente desde el + de la fuente, por los componentes, hasta el −. Los <b>puntos gordos</b> son uniones; dos líneas cruzadas sin punto no están conectadas.', { sch: 'flashlight' }),
  { t: 'pick', q: 'Solo uno encenderá el LED sin dañarlo.', o: ['ledBasic', 'ledNoRes', 'ledReversed'], a: 0, e: 'Sin resistencia se quema; al revés no conduce.', c: 'led' },
  Q('¿Qué pasa si abres S1?', ['El LED se apaga', 'Brilla más', 'La pila dura menos', 'Nada'], 'S1 está en serie.', { sch: 'flashlight' }),
  Q('Dos cables se cruzan sin punto. ¿Conectados?', ['No', 'Sí', 'Depende del color', 'Solo los de masa'], 'Sin punto no hay unión.'),
  Q('¿Dónde está la salida de este divisor?', ['Entre R1 y R2', 'En el +', 'En el −', 'En R1'], 'El punto medio.', { sch: 'divider' })
 ]),
 L('e4', 'Convenciones de dibujo', 'sym', ['schematic'], [
  I('· Tensión más alta arriba, masa abajo.\n· Entradas a la izquierda, salidas a la derecha.\n· En vez de un cable de masa por todo el dibujo, un símbolo de masa en cada sitio: todos están unidos.\n· Igual con +V y con las <b>etiquetas de red</b>: dos cables con el mismo nombre están conectados.', { sch: 'npnSwitch' }),
  Q('Hay cuatro símbolos de masa. ¿Cuántos puntos distintos son?', ['Uno', 'Cuatro', 'Dos', 'Depende'], 'Todos unidos.'),
  Q('Dos cables con la etiqueta “SDA”. ¿Conectados?', ['Sí', 'No', 'Solo si se tocan', 'Solo en placas grandes'], 'Conectan por nombre.'),
  { t: 'order', q: 'Ordena cómo dibujar una linterna.', items: ['Pila a la izquierda, + arriba', 'Cable al interruptor', 'La resistencia', 'El LED, ánodo hacia la resistencia', 'Cierra hasta el −'], e: 'De + a −.', c: 'schematic' }
 ]),
 L('e5', 'La protoboard por dentro', 'bb', ['breadboard'], [
  I('Una protoboard esconde tiras metálicas. En el centro, cada columna de 5 agujeros (a–e y f–j) está unida. Las filas largas de los bordes (+ y −) reparten la alimentación.'),
  { t: 'bbtap', q: 'Toca todos los agujeros conectados al marcado.', start: [3, 3], c: 'breadboard' },
  { t: 'bbtap', q: 'Ahora este, en la otra mitad.', start: [6, 9], c: 'breadboard' },
  { t: 'bbtap', q: 'Y este, en la fila de alimentación.', start: [2, 0], c: 'breadboard' },
  Q('¿Para qué sirve la ranura central?', ['Para chips sin cortocircuitar sus patas', 'Ventilar', 'Separar + y −', 'Sujetarla'], 'Un DIP va a caballo.'),
  Q('Las dos patas de una resistencia en la misma columna (a y c)…', ['Quedan puenteadas: no hace nada', 'Funciona normal', 'Se quema la protoboard', 'Duplica su valor'], 'Mismo nudo.')
 ]),
 L('e6', 'Del esquema a la protoboard', 'bb', ['breadboard'], [
  I('El truco: cada <b>nudo</b> del esquema es <b>una columna</b> de la protoboard. Numera los nudos, asigna una columna a cada uno y coloca las patas.'),
  Q('¿Cuántos nudos tiene la linterna?', ['4', '2', '6', '1'], '+/interruptor, interruptor/R, R/LED, LED/−.', { sch: 'flashlight' }),
  Q('Una pata de la resistencia y el ánodo del LED están en el mismo nudo. En la protoboard…', ['Misma columna', 'Columnas contiguas', 'Fila +', 'Da igual'], 'Mismo nudo = misma columna.'),
  { t: 'order', q: 'Ordena una buena rutina de montaje.', items: ['Desconecta la alimentación', 'Monta siguiendo los nudos', 'Revisa cada conexión contra el esquema', 'Conecta la alimentación', 'Mide tensiones clave'], e: 'Nunca montes con la pila puesta.' }
 ]),
 SIM('s2', 'Reto: del esquema a la protoboard', 'Monta exactamente el esquema de la linterna.', { battery: 9, parts: ['sw', 'res', 'led'], sch: 'flashlight', hint: 'Interruptor, resistencia y LED en serie de + a −.' }, 'flashlight')
] },

{ id: 'm5', title: 'Medir: multímetro y osciloscopio', desc: 'Medir es entender. Con un multímetro manual de verdad.', nodes: [
 L('f1', 'Conoce tu multímetro', 'meter', ['meter_v'], [
  I('Pantalla, <b>selector</b> (qué mides y en qué rango) y <b>bornes</b>: COM (punta negra siempre), VΩ (roja para tensión y resistencia) y mA / 10A (roja para corriente).\nEl tuyo es manual: el número del rango es el máximo que puede mostrar.'),
  MT('Explora: gira el selector, cambia la punta roja de borne y toca los puntos.', 'bat', null, '', { auto: false }),
  { t: 'match', q: 'Une cada borne con su uso.', pairs: [['COM', 'Punta negra, siempre'], ['VΩ', 'Tensión y resistencia'], ['mA', 'Corrientes pequeñas'], ['10A', 'Corrientes grandes']] },
  Q('En el rango 20 V, ¿lectura máxima?', ['19,99 V', '20 V exactos', '200 V', '2 V'], 'Más allá se desborda.')
 ]),
 L('f2', 'Medir tensión', 'meter', ['meter_v'], [
  I('La tensión se mide <b>en paralelo</b>: una punta a cada lado, sin desmontar nada. Selector en V⎓, roja en VΩ.'),
  MT('Mide la tensión de la pila (cualquier rango que no se desborde).', 'bat', { measure: 'V', between: ['P', 'N'] }, 'Una punta en cada polo.', { auto: false }),
  MT('Ahora con la máxima precisión.', 'bat', { measure: 'V', between: ['P', 'N'], best: true, sign: true }, 'Rango 20 V: dos decimales.', { auto: false }),
  Q('En el rango 2 V solo aparece un “1”. Significa…', ['Que supera 2 V: sube de rango', 'Que mide 1 V', 'Pila gastada', 'Fusible fundido'], 'Desbordamiento.', { c: 'meter_v' }),
  MT('¿Cuánta tensión cae en el LED? Mejor rango.', 'led', { measure: 'V', between: ['B', 'C'], best: true }, 'Rojo: 1,8–2 V.', { auto: false }),
  MT('Y en la resistencia. ¿Se cumple Kirchhoff?', 'led', { measure: 'V', between: ['A', 'B'], best: true }, '≈ 7 V + 2 V ≈ 9 V.', { auto: false, c: 'kvl' }),
  MT('Mide la salida de este divisor.', 'div', { measure: 'V', between: ['M', 'B'], best: true }, '9 × 1/3 = 3 V.', { auto: false, c: 'divider' })
 ]),
 L('f3', 'Medir corriente', 'meter', ['meter_a'], [
  I('Toda la corriente tiene que atravesar el multímetro: <b>abre el circuito</b> y mételo <b>en serie</b>. La roja pasa a <b>mA</b>, que por dentro es casi un cable con fusible.'),
  MT('El circuito tiene un corte. Mide la corriente del LED con el mejor rango.', 'ledgap', { measure: 'A', best: true }, '≈ 15 mA: rango 20m.', { auto: false }),
  Q('¿Por qué el borne mA tiene fusible?', ['Es casi un cable: un error provoca un corto', 'Para alterna', 'Para ahorrar', 'Para resistencias'], 'Te protege de ti mismo.', { c: 'meter_a' }),
  MT('Comprueba qué pasa si mides corriente en paralelo con la pila. Luego déjalo midiendo la tensión correctamente.', 'bat', { measure: 'V', between: ['P', 'N'] }, 'Al terminar con corriente, vuelve la roja a VΩ.', { auto: false, startJack: 'mA' }),
  Q('Has medido corriente y ahora quieres tensión. Lo primero…', ['Devolver la roja a VΩ', 'Girar a 10A', 'Quitar la pila', 'Nada'], 'El despiste más habitual.', { c: 'meter_a' })
 ]),
 L('f4', 'Resistencia y continuidad', 'meter', ['meter_v'], [
  I('Para medir resistencia el multímetro inyecta su propia corriente: <b>sin alimentación</b>. La <b>continuidad</b> pita con casi cero ohmios: para cables rotos y cortos.'),
  MT('Lee las bandas y mide esta resistencia con el mejor rango.', 'res', { measure: 'R', between: ['a', 'b'], best: true }, '4,7 kΩ: rango 20k.', { auto: false, val: 4700, c: 'color' }),
  MT('Mide esta otra.', 'res', { measure: 'R', between: ['a', 'b'], best: true }, '220 Ω supera 199,9: rango 2k.', { auto: false, val: 220 }),
  MT('Un cable está roto por dentro. Encuéntralo y deja las puntas en sus extremos.', 'wires3', { measure: 'cont', between: ['B1', 'B2'] }, 'Sin pitido no hay continuidad.', { auto: false }),
  Q('Mides una resistencia con la pila conectada…', ['Lectura errónea y riesgo para el multímetro', 'Lee perfecto', 'Lee el doble', 'Pita'], 'Desconecta siempre.')
 ]),
 L('f5', 'Errores de medida', 'meter', ['meter_v'], [
  I('Medir cambia lo que mides. Un voltímetro tiene ~10 MΩ dentro: en circuitos de resistencias muy altas “roba” corriente y la lectura baja. Un amperímetro añade una pequeña resistencia en serie.'),
  Q('Divisor de dos de 10 MΩ medido con un multímetro de 10 MΩ. La lectura…', ['Bastante menor de lo esperado', 'Exacta', 'El doble', 'Negativa'], 'Queda en paralelo con R2.', { c: 'divider' }),
  Q('¿Y con un divisor de 1 kΩ y 1 kΩ?', ['Casi no afecta', 'Muchísimo', 'Lo invierte', 'Lo cortocircuita'], '10 MΩ ∥ 1 kΩ ≈ 1 kΩ.'),
  Q('La pantalla oscila entre 4,98 y 5,01. El último dígito…', ['Es la resolución: ruido o cambios pequeños', 'Indica pila mala', 'Rango equivocado', 'Está roto'], 'Siempre baila un poco.'),
  Q('¿Qué indica “±0,5 % + 2 dígitos”?', ['Cuánto puede desviarse la lectura', 'Velocidad', 'Tamaño', 'Rangos'], 'Ningún instrumento es perfecto.')
 ]),
 L('f6', 'Multímetro automático', 'meter', ['meter_v'], [
  I('Un <b>autorrango</b> elige la escala: solo seleccionas V, A u Ω y muestra la unidad. Si se desborda, <b>OL</b>.\nAl completar esta lección podrás activarlo en tu perfil. Puntas y bornes siguen siendo cosa tuya.'),
  MT('Mide la salida de este regulador.', 'zener', { measure: 'V', between: ['T', 'B'] }, '≈ 5,2 V.', { auto: true }),
  MT('Mide la corriente del LED. Ojo con el borne.', 'ledgap', { measure: 'A' }, 'El autorrango no elige el borne.', { auto: true }),
  Q('¿Qué sigue siendo responsabilidad tuya?', ['Magnitud, borne y dónde van las puntas', 'Nada', 'Encenderlo', 'El rango'], 'Solo elige la escala.')
 ]),
 L('f7', 'El osciloscopio', 'meter', ['ac'], [
  I('El multímetro da un número; el <b>osciloscopio</b> dibuja la tensión en el tiempo. Imprescindible para PWM, audio, relojes.\nHorizontal: tiempo (s/div). Vertical: tensión (V/div).', { tune: { viz: 'pwm', params: { D: { label: 'Ciclo de trabajo', val: 50, min: 0, max: 100, step: 1, unit: '%', dec: 0 } } } }),
  Q('1 V/div y una cuadrada de 5 divisiones de alto. ¿Amplitud?', ['5 V', '1 V', '0,2 V', '10 V'], '5 × 1 V.'),
  Q('1 ms/div y un ciclo de 4 divisiones. ¿Frecuencia?', ['250 Hz', '4 Hz', '1000 Hz', '4000 Hz'], 'T = 4 ms.', { c: 'ac' }),
  G('period'),
  Q('¿Qué ves en el osciloscopio que no ve el multímetro?', ['La forma de la señal en el tiempo', 'La resistencia', 'El color', 'La temperatura'], 'El multímetro da una media.')
 ]),
 PRJ('p2b', 'Proyecto: mide tu linterna', 'measure')
] },

{ id: 'm6', title: 'Componentes pasivos', desc: 'Resistencias, sensores, condensadores, bobinas y relés.', nodes: [
 L('g1', 'Resistencias reales', 'res', ['color'], [
  I('Las resistencias siguen <b>series normalizadas</b>. E12: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 (y ×10, ×100…).\nTipos: carbón (baratas), película metálica (1 %), bobinadas (potencia), SMD (código numérico).'),
  { t: 'bands', q: 'Pinta las bandas de 1 kΩ. Ves el valor mientras pruebas.', target: 1000, live: true, e: 'Marrón, negro, rojo.' },
  G('colorRead'), G('colorRead'), G('colorBuild'), G('eSeries'), G('eSeries'),
  Q('Una SMD pone “472”. ¿Valor?', ['4,7 kΩ', '472 Ω', '47 kΩ', '4,72 Ω'], '47 y dos ceros.')
 ]),
 L('g2', 'Potenciómetros y sensores', 'res', ['divider'], [
  I('Un <b>potenciómetro</b> es una resistencia con cursor: un divisor ajustable.', { symk: 'pot' }),
  Q('10 kΩ entre 5 V y masa, cursor en el centro. ¿Tensión?', ['2,5 V', '5 V', '0 V', '10 V'], 'Mitad.'),
  I('Muchos sensores son resistencias variables:\n· <b>LDR</b>: baja con la luz.\n· <b>NTC</b>: baja con la temperatura.\n· <b>Galga</b>: cambia al estirarse.\nSe leen en un divisor.'),
  Q('LDR abajo en un divisor. Al oscurecer, la salida…', ['Sube', 'Baja', 'No cambia', 'Se invierte'], 'La LDR se lleva más tensión.', { c: 'divider' }),
  Q('Un NTC al calentarse…', ['Baja su resistencia', 'La sube', 'Emite luz', 'Genera tensión'], 'Coeficiente negativo.')
 ]),
 L('g3', 'El condensador', 'cap', ['cap'], [
  I('Dos placas separadas por un aislante. Acumula carga: <b>Q = C × V</b>. Capacidad en faradios; lo normal µF, nF, pF.', { symk: 'cap' }),
  { t: 'tap', img: 'ecap', q: 'Toca la pata negativa del electrolítico.', a: 'minus', right: 'la pata corta, lado de la franja', e: 'La franja con − marca el negativo.', c: 'cap' },
  Q('En continua y ya cargado, ¿cuánta corriente pasa?', ['Prácticamente ninguna', 'Mucha', 'Como una resistencia', 'Depende'], 'Bloquea la continua.'),
  G('capSeries'), G('capCode'), G('capCode'),
  Q('¿Qué indica “16 V” impreso en un condensador?', ['La máxima que soporta', 'La que genera', 'La que necesita', 'Su capacidad'], 'Elige con margen.')
 ]),
 L('g4', 'Carga y descarga RC', 'cap', ['rc'], [
  I('Cargando a través de una resistencia, la tensión sube rápido y luego cada vez más despacio. Tiempo característico: <b>τ = R × C</b>.', { tune: { viz: 'rc', params: { R: pR('R', 10000, 1000, 100000), C: { label: 'C', val: 100, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' } } } }),
  TU('Ajusta R y C para τ = 1 s.', 'rc', { R: pR('R', 1000, 1000, 100000), C: { label: 'C', val: 10, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'C' } }, { q: 'tau', min: 0.9, max: 1.1, text: 'Objetivo: τ = 1 s', hint: '10 kΩ × 100 µF.' }, '10 kΩ y 100 µF, o 100 kΩ y 10 µF.'),
  G('tau'), G('tau'), G('rcPct'), G('rcPct'),
  Q('En la descarga, tras 1τ queda…', ['El 37 %', 'El 63 %', 'Nada', 'El 50 %'], 'Pierde el 63 %.')
 ]),
 L('g5', 'Las matemáticas de la curva RC', 'cap', ['log'], [
  I('Carga: <b>Vc = V · (1 − e^(−t/τ))</b>. Descarga: <b>Vc = V · e^(−t/τ)</b>. e ≈ 2,718 aparece en todo lo que cambia en proporción a lo que le queda.'),
  G('exp'), G('exp'),
  Nm('9 V, τ = 1 s. ¿Tensión tras 1 s de carga?', 5.69, 'V', '9 × (1 − 0,368).', { tol: 0.1 }),
  Q('¿Cuánto tarda (en τ) en cargarse a la mitad?', ['Unos 0,7τ', 'τ', '0,5τ', '2τ'], 'ln 2 ≈ 0,69: aparece en la fórmula del 555.'),
  G('rcPct')
 ]),
 L('g6', 'Bobinas y relés', 'cap', ['cap'], [
  I('Una <b>bobina</b> se opone a los <b>cambios</b> de corriente y guarda energía en un campo magnético. Si cortas su corriente de golpe, genera un pico de tensión enorme.'),
  Q('¿A qué se opone una bobina?', ['A los cambios de corriente', 'A la continua', 'A la luz', 'Al calor'], 'Como un volante de inercia.'),
  I('Un <b>relé</b> es un interruptor movido por un electroimán: una bobina pequeña conmuta cargas grandes, con aislamiento entre ambos lados.'),
  Q('¿Ventaja de un relé?', ['Aísla el control de la carga y conmuta corrientes grandes', 'Más rápido que un transistor', 'No consume', 'Sin alimentación'], 'Ideal para aparatos de red, con mucho cuidado.'),
  Q('Al cortar la bobina, ¿qué protege al transistor?', ['Un diodo en paralelo con la bobina, al revés', 'Una resistencia en serie', 'Un condensador enorme', 'Nada'], 'Diodo de rueda libre.', { c: 'diode' })
 ]),
 SIM('s3', 'Reto: luz que se apaga despacio', 'El LED se enciende al pulsar y sigue al menos 1 s tras soltar.', { battery: 9, parts: ['push', 'cap', 'res', 'led'], sch: 'rcDelay', hint: 'El pulsador carga el condensador; el condensador alimenta el LED por la resistencia.' }, 'afterglow'),
 PRJ('p3', 'Proyecto: luz de cortesía', 'courtesy')
] },

{ id: 'm7', title: 'Corriente alterna', desc: 'Senoides, valor eficaz, reactancia, filtros y transformadores.', nodes: [
 L('h1', 'Matemáticas: logaritmos y dB', 'bin', ['log'], [
  I('La alterna se describe con el <b>seno</b>: v(t) = Vp · sen(2π·f·t). Para comparar señales muy distintas se usan <b>logaritmos</b>: log₁₀(1000) = 3 porque 10³ = 1000.'),
  G('log10'), G('log10'),
  I('Los <b>decibelios</b>: <b>dB = 20 · log₁₀(Vsal / Vent)</b>. ×10 = 20 dB, ×2 ≈ 6 dB, ÷2 ≈ −6 dB.'),
  G('db'), G('db'), G('db')
 ]),
 L('h2', 'Qué es la alterna', 'bolt', ['ac'], [
  I('En <b>continua</b> la corriente va siempre en el mismo sentido; en <b>alterna</b> cambia muchas veces por segundo. La red es alterna porque los transformadores cambian su tensión fácilmente.'),
  Q('¿Cuántos ciclos por segundo hace la red europea?', ['50', '230', '60', '1'], '50 Hz.'),
  I('· <b>Vp</b>: el pico. · <b>Vpp</b>: pico a pico, 2·Vp.\n· <b>Periodo T</b>: un ciclo. <b>f = 1/T</b>.'),
  G('period'), G('period'),
  Q('Senoide de 10 V de pico. ¿Vpp?', ['20 V', '10 V', '7,07 V', '5 V'], '2 × Vp.')
 ]),
 L('h3', 'Valor eficaz (rms)', 'bolt', ['ac'], [
  I('El <b>valor eficaz</b> es la continua que calentaría lo mismo. En una senoide: <b>Vrms = Vp / √2</b>. Los 230 V de casa son eficaces: el pico es unos 325 V.'),
  G('vrms'), G('vrms'),
  Q('Un multímetro en V~ mide…', ['El valor eficaz', 'El pico', 'El pico a pico', 'La frecuencia'], 'Por eso marca 230 V.'),
  Q('¿Por qué la red es peligrosa?', ['Puede hacer pasar por tu cuerpo corrientes mortales: no trabajes con ella sin formación', 'No lo es', 'Porque es continua', 'Porque los enchufes tienen mucha resistencia'], 'Bastan decenas de mA por el corazón. En este curso usamos baja tensión.')
 ]),
 L('h4', 'Reactancia del condensador', 'cap', ['filter'], [
  I('En alterna, un condensador se carga y descarga continuamente y deja pasar corriente. Su oposición es la <b>reactancia</b>: <b>Xc = 1 / (2π · f · C)</b>. A más frecuencia, menos reactancia.'),
  G('xc'), G('xc'),
  Q('Frecuencia ×2: la reactancia…', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Cero'], 'Inversa a f.'),
  Q('En continua (f = 0), la reactancia es…', ['Infinita', 'Cero', '1 Ω', 'Igual a C'], 'Bloquea la continua.', { c: 'cap' })
 ]),
 L('h5', 'Filtros RC', 'cap', ['filter'], [
  I('· <b>Paso bajo</b>: R en serie y C a masa. Deja pasar lo lento.\n· <b>Paso alto</b>: C en serie y R a masa. Deja pasar lo rápido.\nFrontera: <b>fc = 1 / (2π · R · C)</b>, donde la señal cae 3 dB.'),
  G('fc'), G('fc'),
  Q('Quitar ruido rápido de un sensor lento:', ['Paso bajo', 'Paso alto', 'Ninguno', 'Amplificador'], 'Deja pasar lo lento.'),
  Q('Condensador en serie con la entrada de un amplificador de audio:', ['Bloquea la continua y deja pasar el audio', 'Amplifica', 'Bloquea el audio', 'Nada'], 'Condensador de acoplo.'),
  Q('Por encima de fc, un paso bajo de primer orden atenúa unos…', ['20 dB por década', '3 dB en total', '100 dB', 'Nada'], 'Cada ×10 en frecuencia, ÷10 en amplitud.', { c: 'log' })
 ]),
 L('h6', 'Transformadores', 'bolt', ['ac'], [
  I('Dos bobinas sobre un núcleo. La relación de tensiones es la de vueltas: <b>Vs / Vp = Ns / Np</b>. Solo funciona con alterna.'),
  Nm('1000 vueltas en el primario, 50 en el secundario, 230 V. ¿Secundario?', 11.5, 'V', '230 × 50 / 1000.'),
  Q('¿Por qué no funciona con una pila?', ['Necesita una corriente que cambie para inducir tensión', 'La pila es pequeña', 'Sí funciona', 'Por la polaridad'], 'Inducción = cambio.'),
  Q('¿Qué ventaja de seguridad da?', ['Aislamiento galvánico entre la red y tu circuito', 'No se calienta', 'No pesa', 'Ninguna'], 'No hay conexión directa entre bobinas.')
 ])
] },

{ id: 'm8', title: 'Semiconductores y diodos', desc: 'Unión PN, diodos, rectificadores, zener y LEDs a fondo.', nodes: [
 L('i1', 'Qué es un semiconductor', 'led', ['diode'], [
  I('Silicio puro conduce mal. Con <b>dopado</b>:\n· Tipo <b>N</b>: sobran electrones.\n· Tipo <b>P</b>: faltan (“huecos”).\nUna zona P junto a una N forma una <b>unión PN</b>: el corazón de diodos y transistores.'),
  Q('¿Qué le sobra al silicio N?', ['Electrones', 'Huecos', 'Protones', 'Nada'], 'N de negativo.'),
  Q('Una unión PN conduce cuando…', ['P está más positiva que N', 'N más positiva que P', 'Siempre', 'Nunca'], 'Polarización directa.', { c: 'diode' })
 ]),
 L('i2', 'El diodo', 'led', ['diode'], [
  I('Deja pasar la corriente del <b>ánodo</b> al <b>cátodo</b> y la bloquea al revés. Para conducir “cobra” unos <b>0,6–0,7 V</b> (silicio) o 0,3 V (Schottky).', { symk: 'diode' }),
  { t: 'tap', img: 'diode', q: 'Toca el lado del cátodo.', a: 'cathode', right: 'el lado de la franja', e: 'La franja = la barra del símbolo.', c: 'diode' },
  Q('9 V, un diodo de silicio y una resistencia. ¿Tensión en la resistencia?', ['≈ 8,3 V', '9 V', '0,7 V', '0 V'], '9 − 0,7.'),
  Q('¿Para qué un diodo en serie con la alimentación?', ['Protección si conectas la pila al revés', 'Subir tensión', 'Pitar', 'Medir'], 'Al revés no conduce.'),
  Q('Si superas su tensión de ruptura inversa…', ['Conduce en inversa y puede destruirse', 'Se hace LED', 'Nada', 'Se recarga'], 'Los zener lo aprovechan.')
 ]),
 L('i3', 'Rectificadores', 'led', ['diode'], [
  I('Un diodo convierte alterna en pulsos de un solo sentido: <b>media onda</b>. Con cuatro en <b>puente</b> se aprovechan las dos mitades: <b>onda completa</b>.'),
  Q('¿Cuántos diodos tiene un puente?', ['4', '1', '2', '8'], 'En rombo.'),
  Q('¿Cuántos conducen a la vez?', ['2', '1', '4', 'Ninguno'], 'Por eso se pierden ~1,4 V.'),
  Q('Media onda con red de 50 Hz: ¿frecuencia de pulsos?', ['50 Hz', '100 Hz', '25 Hz', '0 Hz'], 'Onda completa: 100 Hz.')
 ]),
 L('i4', 'Filtrado y rizado', 'cap', ['cap'], [
  I('Un <b>condensador</b> grande tras el rectificador se carga en cada pico y alimenta la carga entre picos. Queda un <b>rizado</b>: <b>ΔV ≈ I / (f · C)</b>.'),
  Nm('100 mA, onda completa (100 Hz), 1000 µF. ¿Rizado?', 1, 'V', '0,1 / (100 × 0,001).'),
  Q('Para reducir el rizado a la mitad…', ['Duplica la capacidad', 'Duplica la corriente', 'Quita el condensador', 'Media onda'], 'ΔV ∝ 1/C.'),
  Q('¿Qué va después para una tensión perfectamente estable?', ['Un regulador', 'Otro transformador', 'Un LED', 'Un fusible'], 'Módulo de alimentación.')
 ]),
 L('i5', 'El diodo zener', 'led', ['diode'], [
  I('Un <b>zener</b> conduce en inversa a una tensión precisa. Con una resistencia en serie es un regulador sencillo.', { tune: { viz: 'zener', params: { Vin: { label: 'Entrada', val: 3, min: 0, max: 12, step: 0.1, unit: 'V' }, Vz: { label: 'Vz', val: 5.1, fixed: true } } } }),
  Nm('9 V, zener de 5,1 V, 20 mA. ¿Resistencia?', 195, 'Ω', '(9 − 5,1) / 0,02 → 220 Ω.', { tol: 3 }),
  MT('Mide la tensión regulada.', 'zener', { measure: 'V', between: ['T', 'B'], best: true }, '≈ 5,2 V.'),
  Q('¿Cómo se conecta para regular?', ['En inversa (cátodo al +) con resistencia en serie', 'En directa sin resistencia', 'En serie con la carga', 'Da igual'], 'Franja hacia el +.')
 ]),
 L('i6', 'LEDs a fondo', 'led', ['led'], [
  I('Tensión directa típica: rojo ~1,8 V, amarillo ~2,0 V, verde ~2,1 V (algunos 3 V), azul y blanco ~3,0 V. Trabajan bien entre 5 y 20 mA.', { tune: { viz: 'led', params: { V: pV(9), R: pR('Resistencia', 470, 22, 10000) } } }),
  TU('Consigue 10–20 mA sin quemarlo.', 'led', { V: pV(5), R: pR('Resistencia', 22, 10, 10000) }, { q: 'I', min: 0.01, max: 0.02, notBurnt: true, text: 'Objetivo: 10–20 mA', hint: 'R = (V − 1,8) / I.' }, 'Con 5 V, 150–330 Ω.'),
  { t: 'tap', img: 'led', q: 'Toca la pata del ánodo (+).', a: 'anode', right: 'la pata larga', e: 'Larga = ánodo.', c: 'led' },
  G('ledR'), G('ledR'), G('eSeries'),
  Q('¿Por qué no varios LEDs en paralelo con una sola resistencia?', ['Sus tensiones difieren y uno se lleva casi toda la corriente', 'Se apagan', 'Sí se puede', 'Cambian de color'], 'Una resistencia por LED.'),
  Nm('Tres LEDs rojos (1,8 V) en serie, 12 V y 15 mA. ¿Resistencia?', 440, 'Ω', '(12 − 5,4) / 0,015.', { tol: 5 })
 ]),
 L('i7', 'Fotodiodos y optoacopladores', 'led', ['diode'], [
  I('Un <b>fotodiodo</b> genera corriente con la luz. Un <b>optoacoplador</b> une LED y fototransistor en una cápsula: pasa señales con luz, sin conexión eléctrica.'),
  Q('¿Para qué un optoacoplador?', ['Pasar una señal entre circuitos aislados', 'Iluminar', 'Rectificar', 'Medir temperatura'], 'Protege al microcontrolador.'),
  Q('En el símbolo del fotodiodo, las flechas…', ['Apuntan hacia dentro', 'Hacia fuera', 'No hay', 'Circulares'], 'Recibe luz.')
 ]),
 SIM('s8', 'Reto: regulador zener', 'Consigue entre 4,8 y 5,4 V estables con un zener y 2–40 mA por él.', { battery: 9, parts: ['res', 'zener'], sch: 'zenerReg', hint: 'Resistencia del + al cátodo (franja); ánodo al −.' }, 'zener')
] },

{ id: 'm9', title: 'Transistores', desc: 'BJT y MOSFET como interruptores y amplificadores.', nodes: [
 L('j1', 'El transistor bipolar', 'npn', ['bjt'], [
  I('Un NPN tiene <b>base</b>, <b>colector</b> y <b>emisor</b>. Una corriente pequeña en la base deja pasar una mucho mayor del colector al emisor. Ganancia <b>β</b> (hFE): 100–300.', { tune: { viz: 'npn', params: { Rb: pR('Resistencia de base', 100000, 1000, 1000000), beta: { val: 150, fixed: true } } } }),
  G('beta'), G('beta'),
  { t: 'tap', img: 'npn', q: 'Cara plana hacia ti: toca la base del 2N3904.', a: 'B', right: 'la pata central', e: '2N3904: E, B, C. Otros cambian: mira la hoja de datos.', c: 'bjt' },
  Q('¿Tensión base–emisor cuando conduce?', ['≈ 0,7 V', '0 V', '5 V', 'La de la pila'], 'Unión PN.', { c: 'diode' })
 ]),
 L('j2', 'Las tres zonas', 'npn', ['bjt'], [
  I('· <b>Corte</b>: sin base, no conduce; Vce ≈ alimentación.\n· <b>Activa</b>: Ic = β·Ib; para amplificar.\n· <b>Saturación</b>: la base pide más de lo que la carga deja pasar; conduce a tope; Vce ≈ 0,1–0,2 V.'),
  TU('Haz que sature con margen: LED a tope y menos de 2 mA de base.', 'npn', { Rb: pR('Resistencia de base', 1000000, 1000, 1000000), beta: { val: 150, fixed: true } }, { q: 'Ib', min: 0.0002, max: 0.002, text: 'Objetivo: saturado con 0,2–2 mA de base', hint: 'Entre 2,2 kΩ y 22 kΩ.' }, 'Interruptor cerrado.'),
  Q('Vce = 8,9 V con 9 V. Está…', ['Cortado', 'Saturado', 'Activo a tope', 'Quemado'], 'No cae nada en la carga.'),
  MT('Este transistor está saturado. Mide Vce con el mejor rango.', 'npn', { measure: 'V', between: ['C', 'E'], best: true }, 'Décimas de voltio.'),
  Q('¿Qué zonas para encender un LED desde Arduino?', ['Corte y saturación', 'Activa', 'Ninguna', 'Inversa'], 'Así apenas se calienta.')
 ]),
 L('j3', 'Calcular la resistencia de base', 'npn', ['bjt'], [
  I('1) Corriente de la carga: Ic. 2) Ib mínima = Ic / β. 3) Multiplica por 5–10. 4) <b>Rb = (Vcontrol − 0,7) / Ib</b>.'),
  Nm('LED con 470 Ω a 9 V (LED de 2 V). ¿Ic?', 14.9, 'mA', '(9 − 2) / 470.', { tol: 0.3 }),
  Nm('Con β = 100, ¿Ib mínima?', 0.149, 'mA', '14,9 / 100.', { tol: 0.01 }),
  G('rb'), G('rb'),
  Q('¿Por qué multiplicar por 5 o 10?', ['β varía mucho entre unidades y con la temperatura', 'Para gastar más', 'Por Ohm', 'No hace falta'], 'Margen.')
 ]),
 L('j4', 'Darlington y PNP', 'npn', ['bjt'], [
  I('Un <b>Darlington</b> encadena dos transistores: β total ≈ β1 × β2, a cambio de ~1,4 V. El <b>PNP</b> conduce cuando la base está por debajo del emisor: conmuta el lado positivo.'),
  Nm('β1 = 100, β2 = 50. ¿Ganancia total?', 5000, '', '100 × 50.'),
  Q('Un PNP como interruptor va…', ['Entre el positivo y la carga', 'Entre la carga y masa', 'En paralelo con la pila', 'En la base de otro'], 'El NPN conmuta masa; el PNP, el positivo.'),
  Q('¿Qué chip agrupa siete Darlington?', ['ULN2003', '555', '7805', 'LM358'], 'Para relés y paso a paso.')
 ]),
 L('j5', 'Amplificar', 'npn', ['bjt'], [
  I('En zona activa, una pequeña variación en la base produce una gran variación en el colector. En <b>emisor común</b>, ganancia aproximada <b>−Rc / Re</b>, invertida.'),
  Nm('Rc = 4,7 kΩ y Re = 470 Ω. ¿Ganancia (valor absoluto)?', 10, '', '4700 / 470.'),
  Q('¿Por qué polarizar a mitad de camino?', ['Para que la señal suba y baje sin recortarse', 'Para que no se caliente', 'Para que sature', 'No hace falta'], 'Vce ≈ mitad.'),
  Q('Hoy, para amplificar audio se usa más…', ['Un amplificador operacional', 'Un relé', 'Un 555', 'Un zener'], 'Más fácil y predecible.')
 ]),
 L('j6', 'MOSFET', 'npn', ['bjt'], [
  I('Un MOSFET N se controla con <b>tensión</b>: la puerta casi no consume. Entre drenador y fuente conduce con resistencia muy baja, <b>Rds(on)</b>. Ideal para cargas de amperios.', { symk: 'nmos' }),
  { t: 'match', q: 'Une cada pata con su equivalente bipolar.', pairs: [['Puerta (G)', 'Base'], ['Drenador (D)', 'Colector'], ['Fuente (S)', 'Emisor']] },
  Nm('Rds(on) = 0,05 Ω y 4 A. ¿Potencia disipada?', 0.8, 'W', 'I²·R.', { c: 'power' }),
  Q('“De nivel lógico” significa…', ['Que conduce bien con 5 V o 3,3 V en la puerta', 'Que es digital', 'Que tiene memoria', 'Que solo sirve para lógica'], 'Los normales piden 10 V.'),
  Q('¿Por qué 100 kΩ entre puerta y fuente?', ['Para que no flote y se encienda solo', 'Para amplificar', 'Para limitar la corriente', 'No se pone'], 'Una puerta al aire puede cargarse.', { c: 'pullup' })
 ]),
 L('j7', 'Cargas inductivas y puente H', 'npn', ['bjt'], [
  I('Motores, relés y solenoides son bobinas: llevan siempre un <b>diodo de rueda libre</b>. Para girar un motor en ambos sentidos se usa un <b>puente H</b>: cuatro interruptores que invierten la polaridad.'),
  Q('¿Cómo va el diodo de rueda libre?', ['En paralelo con la bobina, cátodo al +', 'En serie', 'En paralelo, ánodo al +', 'No hace falta'], 'Solo actúa con el pico.', { c: 'diode' }),
  Q('En un puente H, ¿qué pasa si cierras los dos interruptores del mismo lado?', ['Cortocircuito de la alimentación', 'Gira más rápido', 'Frena', 'Nada'], 'Chips como el DRV8833 lo impiden.')
 ]),
 SIM('s4', 'Reto: transistor interruptor', 'Usa un NPN para que el pulsador encienda el LED (5–25 mA) con menos de 2 mA de base.', { battery: 9, parts: ['push', 'res', 'npn', 'led'], sch: 'npnSwitch', hint: 'LED y resistencia del + al colector; emisor al −; pulsador → 10 kΩ → base.' }, 'npnSwitch'),
 PRJ('p4', 'Proyecto: detector de oscuridad', 'dark')
] },

{ id: 'm10', title: 'Circuitos integrados', desc: 'Chips, hojas de datos, 555, operacionales, reguladores y lógica.', nodes: [
 L('k1', 'Qué es un circuito integrado', 'ic', ['schematic'], [
  I('Un <b>CI</b> contiene desde unos pocos hasta miles de millones de transistores. Encapsulados: DIP (para protoboard), SOIC, QFN, BGA.\nLas patas se numeran desde la <b>muesca o punto</b>, en sentido antihorario visto desde arriba.'),
  Q('DIP-8 con la muesca a la izquierda. ¿Pata 1?', ['Abajo a la izquierda', 'Arriba a la izquierda', 'Abajo a la derecha', 'En el centro'], '1–4 abajo; 5–8 arriba de derecha a izquierda.'),
  Nm('En un DIP-14, ¿qué número tiene la pata justo encima de la 1?', 14, '', 'Antihorario: sube por la 8 y vuelve hasta la 14.'),
  { t: 'match', q: 'Une cada encapsulado.', pairs: [['DIP', 'Patas para protoboard'], ['SOIC', 'Superficie, patas en ala'], ['QFN', 'Superficie, sin patas'], ['BGA', 'Bolitas debajo']] }
 ]),
 L('k2', 'Leer una hoja de datos', 'ic', ['schematic'], [
  I('La <b>hoja de datos</b> es el manual:\n· <b>Absolute maximum ratings</b>: no superar nunca.\n· <b>Recommended operating conditions</b>: donde funciona bien.\n· <b>Pinout</b>.\n· <b>Electrical characteristics</b>: típicos, mínimos y máximos.\n· <b>Application circuit</b>: un esquema de ejemplo.'),
  Q('“Absolute maximum 7 V” y “Recommended 2–6 V”. ¿A qué lo alimentas?', ['Entre 2 y 6 V, por ejemplo 5 V', '7 V', '6,9 V', '10 V'], 'El máximo absoluto es el límite de rotura.'),
  Q('¿Dónde miras el orden de patas de un transistor?', ['En el pinout de su hoja de datos', 'En el color', 'En otro transistor', 'Al azar'], 'Cambia entre modelos.'),
  Q('“typ.” significa…', ['Típico: no garantizado', 'Mínimo garantizado', 'Máximo', 'Un error'], 'Diseña con mínimos y máximos.')
 ]),
 L('k3', 'Alimentación y desacoplo', 'ic', ['cap'], [
  I('Todo chip necesita alimentación (VCC o VDD) y masa (GND o VSS). Y un <b>condensador de desacoplo</b> de 100 nF pegado a sus patas de alimentación: una reserva local que absorbe los picos de consumo.'),
  Q('¿Dónde va el desacoplo?', ['Lo más cerca posible de las patas de alimentación', 'En cualquier parte', 'Junto a la pila', 'En la salida'], 'Cuanto más cerca, mejor.'),
  G('capCode'),
  Q('Un circuito digital se reinicia solo “a veces”. Revisas primero…', ['Alimentación y desacoplo', 'Colores de cables', 'El código', 'Nada'], 'Causa número uno.')
 ]),
 L('k4', 'El 555 astable', 'ic', ['ic555'], [
  I('El <b>555</b> vigila un condensador con dos comparadores. En <b>astable</b> genera una onda cuadrada sin parar:\n<b>f ≈ 1,44 / ((R1 + 2·R2) · C)</b>\nPatas: 1 GND, 2 disparo, 3 salida, 4 reset, 5 control, 6 umbral, 7 descarga, 8 VCC.', { tune: { viz: 'astable', params: { R1: pR('R1', 10000, 1000, 100000), R2: pR('R2', 47000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47, 100], fmt: 'C' } } } }),
  TU('Haz que el LED parpadee una vez por segundo.', 'astable', { R1: pR('R1', 1000, 1000, 100000), R2: pR('R2', 1000, 1000, 470000), C: { label: 'C', val: 10, list: [1, 10, 22, 47, 100], fmt: 'C' } }, { q: 'f', min: 0.85, max: 1.15, text: 'Objetivo: 1 Hz ± 0,15', hint: 'Con 10 µF, R1 + 2·R2 ≈ 144 kΩ.' }, 'R1 = 10 kΩ, R2 = 68 kΩ.'),
  G('f555'), G('f555'),
  { t: 'match', q: 'Une cada pata del 555.', pairs: [['Pata 1', 'Masa'], ['Pata 8', 'Alimentación'], ['Pata 3', 'Salida'], ['Pata 4', 'Reset']] },
  Q('Pata 4 a masa…', ['Para el oscilador: salida baja', 'Lo acelera', 'Nada', 'Invierte la salida'], 'Normalmente va a VCC.')
 ]),
 L('k5', 'El 555 monoestable', 'ic', ['ic555'], [
  I('En <b>monoestable</b>, un pulso en la pata 2 pone la salida alta un tiempo fijo:\n<b>t ≈ 1,1 · R · C</b>\nPara temporizadores: una luz que se queda 30 s.'),
  Nm('R = 100 kΩ, C = 100 µF. ¿Duración?', 11, 's', '1,1 × 100 000 × 0,0001.', { tol: 0.2 }),
  Q('¿Qué activa el disparo?', ['Un pulso bajo (< 1/3 de VCC)', 'Un pulso alto', 'Cualquier cambio', '5 V exactos'], 'Pulsador a masa con pull-up.'),
  Nm('Quieres 5 s con 47 µF. ¿R en kΩ?', 96.7, 'kΩ', '5 / (1,1 × 0,000047) → 100 kΩ.', { tol: 2 })
 ]),
 L('k6', 'Amplificadores operacionales', 'amp', ['opamp'], [
  I('Un <b>operacional</b> (LM358…) amplifica muchísimo la diferencia entre + y −. Con realimentación negativa: las entradas no consumen y la salida iguala las dos entradas.\nNo inversor: <b>G = 1 + Rf / Rg</b>.', { tune: { viz: 'opamp', params: { Vin: { label: 'Entrada', val: 0.5, min: 0, max: 2, step: 0.05, unit: 'V', dec: 2 }, Rf: pR('Rf', 10000, 1000, 100000), Rg: pR('Rg', 10000, 1000, 100000) } } }),
  TU('Consigue una ganancia de 11.', 'opamp', { Vin: { label: 'Entrada', val: 0.5, min: 0, max: 2, step: 0.05, unit: 'V', dec: 2 }, Rf: pR('Rf', 10000, 1000, 100000), Rg: pR('Rg', 10000, 1000, 100000) }, { q: 'G', min: 10.9, max: 11.1, text: 'Objetivo: ganancia 11', hint: 'Rf = 10 × Rg.' }, '1 + 10k/1k.'),
  G('gainNI'), G('gainInv'),
  Q('Un seguidor de tensión tiene ganancia…', ['1', '0', 'Infinita', '−1'], 'Refuerza sin cargar.'),
  Q('La salida de un LM358 a 9 V no pasa de…', ['Algo menos de 9 V', '18 V', 'Infinito', '5 V'], 'Satura.')
 ]),
 L('k7', 'Comparadores', 'amp', ['opamp'], [
  I('Sin realimentación, el operacional es un <b>comparador</b>: si IN+ > IN−, salida alta; si no, baja. Para umbrales: luz, temperatura, batería.', { symk: 'opamp' }),
  Q('IN+ = 2,1 V, IN− = 2,5 V. ¿Salida?', ['Baja', 'Alta', 'Mitad', 'Oscila'], 'IN+ < IN−.'),
  Q('LDR en IN+ y potenciómetro en IN−. ¿El potenciómetro?', ['Ajusta el umbral', 'Alimenta', 'Ganancia', 'Mide la luz'], 'La referencia.'),
  Q('Cerca del umbral la salida “tiembla”. ¿Solución?', ['Histéresis (algo de realimentación positiva)', 'Más tensión', 'Quitar el potenciómetro', 'Ninguna'], 'Umbrales de subida y bajada distintos.')
 ]),
 L('k8', 'Reguladores integrados', 'ic', ['power'], [
  I('Un <b>7805</b> entrega 5 V estables con ~2 V de margen (entrada ≥ 7 V). Un <b>LDO</b> se conforma con 0,2–0,5 V. Lo que sobra es calor: <b>P = (Vent − Vsal) × I</b>.'),
  G('regLoss'), G('regLoss'),
  { t: 'match', q: 'Patas del 7805 (de frente, izquierda a derecha).', pairs: [['Pata 1', 'Entrada'], ['Pata 2', 'Masa'], ['Pata 3', 'Salida']] },
  Q('3,3 V desde una Li-ion (3,7–4,2 V):', ['LDO: el margen es pequeño', '7805', 'Ninguno', 'Zener de 10 V'], 'Un regulador normal pediría 5,3 V.')
 ]),
 L('k9', 'Chips lógicos y de apoyo', 'ic', ['logic'], [
  I('Familias: <b>74HC</b> (2–6 V) y <b>CD4000</b> (3–15 V).\n· <b>74HC00</b>: cuatro NAND.\n· <b>74HC595</b>: 8 salidas con 3 pines.\n· <b>CD4017</b>: 10 salidas por turnos.\n· <b>ULN2003</b>: siete drivers Darlington.'),
  { t: 'match', q: 'Une cada chip.', pairs: [['74HC00', 'Cuatro NAND'], ['74HC595', 'Más salidas con pocos pines'], ['CD4017', 'Contador de 10 salidas'], ['ULN2003', 'Drivers para cargas']] },
  Q('Un 74HC00 a 9 V…', ['Se puede dañar: máximo 6 V', 'Funciona mejor', 'Más rápido', 'Da 9 V sin problema'], 'Hoja de datos.'),
  Q('Entradas CMOS sin usar…', ['A masa o VCC, nunca al aire', 'Libres', 'Cortadas', 'Unidas a la salida'], 'Una entrada al aire flota.', { c: 'pullup' })
 ]),
 SIM('s5', 'Reto: luz nocturna automática', 'El LED se enciende a oscuras (5 % de luz) y se apaga con luz (95 %).', { battery: 9, parts: ['ldr', 'res', 'pot', 'cmp', 'led'], hint: 'R arriba y LDR abajo → IN+. Cursor del potenciómetro → IN−. VCC al +. Salida → resistencia → LED → −.' }, 'nightLight'),
 SIM('s555', 'Reto: intermitente con 555', 'Monta un 555 astable que haga parpadear un LED.', { battery: 9, parts: ['ic555', 'res', 'cap', 'led'], sch: 'ne555', hint: 'Patas 8 y 4 al +, 1 al −. R1 (10 kΩ) de + a 7; R2 (47 kΩ) de 7 a 6; une 6 con 2; 10 µF de 2 a −. Pata 3 → 470 Ω → LED → −.' }, 'blink555'),
 PRJ('p5', 'Proyecto: intermitente con 555', 'blinker555')
] },

{ id: 'm11', title: 'Electrónica digital', desc: 'Binario, puertas, Boole, memoria y niveles lógicos.', nodes: [
 L('l1', 'Sistema binario', 'bin', ['binary'], [
  I('En digital hay dos estados: 0 (baja) y 1 (alta). Con varios bits se cuentan números: cada posición vale el doble que la de su derecha.'),
  { t: 'bits', q: 'Juega: enciende bits y mira el número.', n: 8, live: true, target: -1, free: true },
  { t: 'bits', q: 'Forma el 13.', n: 8, target: 13, e: '8 + 4 + 1.', c: 'binary' },
  { t: 'bits', q: 'Ahora el 100.', n: 8, target: 100, e: '64 + 32 + 4.', c: 'binary' },
  G('bin2dec'), G('dec2bin'),
  Nm('¿Cuántos valores caben en 8 bits?', 256, '', '2⁸.')
 ]),
 L('l2', 'Hexadecimal', 'bin', ['binary'], [
  I('El <b>hexadecimal</b> usa 0–9 y A–F (A = 10 … F = 15). Cada cifra son 4 bits: un byte son dos cifras. 0xFF = 255.'),
  Q('¿Cuánto vale C?', ['12', '13', '11', '14'], 'A10 B11 C12 D13 E14 F15.'),
  G('hex'), G('hex'),
  Q('¿Cuántos bits por cifra hexadecimal?', ['4', '8', '16', '2'], '2⁴ = 16.')
 ]),
 L('l3', 'Puertas lógicas', 'gate', ['logic'], [
  I('Una AND se construye con dos pulsadores en serie: el LED solo se enciende si pulsas A <b>y</b> B.'),
  { t: 'truth', q: 'Pulsa A y B, observa el LED y completa la tabla.', gate: 'AND', sch: 'andSw', live: true, c: 'logic' },
  { t: 'truth', q: 'Dos pulsadores en paralelo. Explora y completa.', gate: 'OR', sch: 'orSw', live: true, c: 'logic' },
  { t: 'truth', q: 'NAND: una AND invertida.', gate: 'NAND', c: 'logic' },
  { t: 'truth', q: 'NOR: una OR invertida.', gate: 'NOR', c: 'logic' },
  { t: 'truth', q: 'XOR: 1 solo si son distintas.', gate: 'XOR', c: 'logic' }
 ]),
 L('l4', 'Álgebra de Boole', 'gate', ['logic'], [
  I('AND = A·B, OR = A+B, NOT = Ā.\n· A·0 = 0, A·1 = A, A+1 = 1, A+0 = A.\n· <b>De Morgan</b>: (A·B)‾ = Ā + B̄ y (A+B)‾ = Ā · B̄.'),
  Q('A · 0 =', ['0', 'A', '1', 'Ā'], 'Una AND con 0 da 0.'),
  Q('A + 1 =', ['1', 'A', '0', 'Ā'], 'Una OR con 1 da 1.'),
  Q('Por De Morgan, una NAND equivale a…', ['Una OR con entradas invertidas', 'Una AND', 'Una NOR', 'Una XOR'], '(A·B)‾ = Ā + B̄.'),
  Q('¿Por qué la NAND es universal?', ['Con solo NAND se hace cualquier puerta', 'Es la más rápida', 'No consume', 'Tiene tres entradas'], 'Un NOT es una NAND con entradas unidas.')
 ]),
 L('l5', 'Lógica combinacional', 'gate', ['logic'], [
  I('· <b>Multiplexor</b>: elige una entrada según la selección.\n· <b>Decodificador</b>: activa una de 2ⁿ salidas.\n· <b>Sumador</b>: XOR da la suma, AND el acarreo.'),
  Q('Un decodificador de 3 bits tiene…', ['8 salidas', '3', '6', '16'], '2³.'),
  Q('Semisumador: 1 + 1 da…', ['Suma 0, acarreo 1', 'Suma 1, acarreo 0', 'Suma 2', 'Suma 1, acarreo 1'], '10 en binario.'),
  Q('Multiplexor de 4 entradas: ¿líneas de selección?', ['2', '4', '1', '3'], '2² = 4.')
 ]),
 L('l6', 'Memoria: biestables', 'gate', ['logic'], [
  I('Dos NAND cruzadas forman un <b>biestable SR</b>: recuerdan un bit. Un pulso en “set” lo pone a 1 y se queda; un pulso en “reset” lo vuelve a 0.'),
  Q('Diferencia entre combinacional y secuencial:', ['La secuencial tiene memoria', 'Ninguna', 'La combinacional es lenta', 'La secuencial no usa puertas'], 'Los biestables añaden el tiempo.'),
  Q('SR con NAND: entradas activas a nivel…', ['Bajo', 'Alto', 'Medio', 'Indiferente'], 'S̄ y R̄.'),
  Q('Un biestable D captura la entrada…', ['En el flanco del reloj', 'Siempre', 'Nunca', 'Al encender'], 'Base de registros y contadores.')
 ]),
 L('l7', 'Contadores, relojes y rebotes', 'bin', ['binary'], [
  I('Biestables encadenados con un <b>reloj</b> forman contadores. Un pulsador mecánico <b>rebota</b>: varios cierres en pocos ms, y el contador cuenta de más.'),
  Q('¿Biestables para contar de 0 a 15?', ['4', '15', '8', '16'], '4 bits.'),
  Q('¿Cómo se elimina el rebote?', ['RC con Schmitt, o por software esperando unos ms', 'Pulsando fuerte', 'Más tensión', 'No se puede'], '20–50 ms bastan.'),
  G('bin2dec')
 ]),
 L('l8', 'Niveles lógicos: 5 V y 3,3 V', 'chip', ['logic'], [
  I('Un chip de 5 V puede no entender 3,3 V como “1”, y uno de 3,3 V puede romperse con 5 V. Se unen con <b>adaptadores de nivel</b> o divisores.'),
  Q('Salida de 5 V de una Uno a un pin de ESP32 no tolerante:', ['Divisor o adaptador de nivel', 'Directo', 'Un LED en medio', 'Nada'], 'Te lo puedes cargar.'),
  Nm('Divisor de 5 V a ~3,3 V con R1 = 1 kΩ. ¿R2 en kΩ?', 2, 'kΩ', '5 × 2/3 ≈ 3,33 V.', { tol: 0.2, c: 'divider' }),
  Q('¿Por qué 3,3 V suele bastar en una entrada de 5 V?', ['Muchos chips de 5 V aceptan ~2,5 V como “1”', 'Siempre funciona', 'Porque es más', 'Nunca funciona'], 'Revisa VIH.')
 ]),
 SIM('s6a', 'Reto: puerta AND', 'Monta una AND con dos pulsadores.', { battery: 9, parts: ['push', 'res', 'led'], sch: 'andSw', hint: 'Dos pulsadores en serie con resistencia y LED.' }, 'andGate'),
 SIM('s6b', 'Reto: puerta OR', 'Monta una OR con dos pulsadores.', { battery: 9, parts: ['push', 'res', 'led'], sch: 'orSw', hint: 'Pulsadores en paralelo y, en serie, resistencia y LED.' }, 'orGate'),
 SIM('slatch', 'Reto: memoria con un 74HC00', 'Con dos NAND cruzadas, haz un biestable: un pulsador enciende el LED y se queda encendido; el otro lo apaga.', { battery: 5, parts: ['ic7400', 'push', 'res', 'led'], hint: 'Pata 14 al +, 7 al −. Patas 1 y 5 con 10 kΩ al + y un pulsador cada una a −. Cruza: salida 3 → entrada 4; salida 6 → entrada 2. LED con 470 Ω en la salida 3.' }, 'latch'),
 PRJ('p6', 'Proyecto: lógica con pulsadores', 'logic')
] },

{ id: 'm12', title: 'Microcontroladores', desc: 'Uno, Nano y ESP32: programar para leer y controlar.', nodes: [
 L('n1', 'Qué es un microcontrolador', 'chip', ['adc'], [
  I('Un ordenador diminuto en un chip: procesador, memoria y pines de entrada y salida. Ejecuta tu programa y lo repite sin fin.'),
  { t: 'match', q: 'Une cada placa.', pairs: [['Arduino Uno', 'ATmega328P, 5 V, la clásica'], ['Arduino Nano', 'El mismo chip, cabe en la protoboard'], ['ESP32', '3,3 V, WiFi y Bluetooth'], ['Raspberry Pi', 'Ordenador con Linux']] },
  Q('Diferencia clave al conectar cosas a un ESP32:', ['Trabaja a 3,3 V y no tolera 5 V en sus pines', 'Ninguna', 'La Uno es de 3,3 V', 'No tiene pines'], 'Niveles lógicos.', { c: 'logic' }),
  Q('¿Cuánta corriente sacar de un pin de la Uno?', ['Unos 20 mA', '2 A', '200 mA', 'Ilimitada'], 'Máximo absoluto 40 mA.')
 ]),
 L('n2', 'Tu primer programa', 'chip', ['adc'], [
  I('<b>setup()</b> se ejecuta una vez al arrancar; <b>loop()</b> se repite sin parar. Cada instrucción acaba en punto y coma; los bloques van entre llaves.'),
  Q('¿Cuántas veces se ejecuta setup()?', ['Una', 'Sin parar', 'Cada segundo', 'Nunca'], 'loop() es la que se repite.', { code: 'void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  ...\n}' }),
  Q('delay(500) significa…', ['Espera 500 ms', 'Espera 500 s', 'Repite 500 veces', 'Pin 500'], '1000 ms = 1 s.'),
  Q('¿Qué falta?', ['El punto y coma', 'Las llaves', 'Un número', 'Nada'], 'El compilador avisa.', { code: 'digitalWrite(13, HIGH)' }),
  Q('¿Qué hace esta línea?', ['Guarda el 13 con el nombre LED', 'Enciende el 13', 'Crea un LED', 'Nada'], 'Programas legibles.', { code: 'const int LED = 13;' })
 ]),
 L('n3', 'Salidas digitales', 'chip', ['adc'], [
  { t: 'pin', q: '¿A qué pin conectarías el LED?', code: 'void setup() {\n  pinMode(8, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(8, HIGH);\n}', a: 'D8', e: 'El número del pin.' },
  Q('Completa para que el 13 pueda encender un LED.', ['OUTPUT', 'INPUT', 'HIGH', 'LOW'], 'Salida.', { code: 'pinMode(13, ____);' }),
  Q('digitalWrite(13, HIGH) en una Uno da…', ['5 V', '0 V', '3,3 V', '9 V'], 'En ESP32, 3,3 V.'),
  G('ledR'),
  Q('¿Cómo controlas un motor de 500 mA?', ['Transistor o MOSFET con diodo de rueda libre', 'Directo al pin', 'Con una resistencia', 'No se puede'], 'El pin da ~20 mA.', { c: 'bjt' })
 ]),
 L('n4', 'Entradas y pull-up', 'chip', ['pullup'], [
  I('Un pin de entrada sin conectar “flota”. Una <b>pull-up</b> lo mantiene en HIGH; el pulsador lo lleva a masa al pulsar. <b>INPUT_PULLUP</b> activa la interna.'),
  Q('Con INPUT_PULLUP, al pulsar se lee…', ['LOW', 'HIGH', 'Depende', '1023'], 'Lógica invertida.'),
  { t: 'pin', q: '¿Dónde va la otra pata del pulsador?', code: 'pinMode(2, INPUT_PULLUP);\n// pulsador entre el pin 2 y ...', a: 'GND', e: 'A masa.' },
  Q('¿Qué hace?', ['Enciende el LED mientras se pulsa', 'Al soltar', 'Parpadea', 'Nada'], 'LOW = pulsado.', { code: 'if (digitalRead(2) == LOW) {\n  digitalWrite(13, HIGH);\n} else {\n  digitalWrite(13, LOW);\n}' })
 ]),
 L('n5', 'Entradas analógicas', 'chip', ['adc'], [
  I('El <b>ADC</b> convierte tensión en número. Uno: 10 bits (0–1023 para 0–5 V). ESP32: 12 bits (0–4095 para 0–3,3 V).'),
  G('adc'), G('adc'), G('adc'),
  Q('¿Cómo lees un potenciómetro?', ['Extremos a 5 V y GND, cursor a una entrada analógica', 'Los tres a GND', 'Cursor a 5 V', 'En serie con un LED'], 'Divisor ajustable.', { c: 'divider' }),
  Nm('Resolución de la Uno: mV por paso (5 V / 1024)', 4.88, 'mV', '≈ 4,88 mV.', { tol: 0.05 })
 ]),
 L('n6', 'PWM: brillo y velocidad', 'chip', ['pwm'], [
  I('Encendiendo y apagando muy rápido, la media es intermedia: <b>PWM</b>.', { tune: { viz: 'pwm', params: { D: { label: 'Ciclo de trabajo', val: 50, min: 0, max: 100, step: 1, unit: '%', dec: 0 } } } }),
  TU('Pon el LED al 25 %.', 'pwm', { D: { label: 'Ciclo de trabajo', val: 80, min: 0, max: 100, step: 1, unit: '%', dec: 0 } }, { q: 'b', min: 0.24, max: 0.26, text: 'Objetivo: 25 %', hint: 'Ciclo del 25 %.' }, 'analogWrite(64).'),
  { t: 'pin', q: 'Elige un pin de la Uno que sirva para analogWrite.', a: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'], e: 'Los marcados con ~.' },
  G('pwm'), G('pwm')
 ]),
 L('n7', 'Tiempo sin bloquear: millis()', 'chip', ['adc'], [
  I('delay() congela el programa. <b>millis()</b> devuelve los ms desde el arranque; comparando con el instante anterior haces varias cosas “a la vez”.'),
  Q('Problema de delay(5000) en un programa con botón:', ['5 s sin leer el botón', 'Ninguno', 'Quema el LED', 'Reinicia la placa'], 'Por eso millis().'),
  Q('¿Qué hace?', ['Cambia el LED cada 500 ms sin bloquear', 'Espera 500 s', 'Apaga', 'Nada'], 'Blink sin delay.', { code: 'if (millis() - antes >= 500) {\n  antes = millis();\n  estado = !estado;\n  digitalWrite(13, estado);\n}' }),
  G('millis'),
  Q('Serial.println(valor) sirve para…', ['Ver datos en el ordenador por USB', 'Encender un LED', 'Leer un pin', 'Esperar'], 'Tu mejor herramienta de depuración.')
 ]),
 L('n8', 'Sensores y comunicación', 'chip', ['adc'], [
  I('· <b>I²C</b>: SDA y SCL, muchos dispositivos con direcciones.\n· <b>SPI</b>: cuatro cables, más rápido.\n· <b>UART</b>: TX y RX.'),
  { t: 'match', q: 'Une cada bus.', pairs: [['I²C', 'SDA y SCL'], ['SPI', 'MOSI, MISO, SCK, CS'], ['UART', 'TX y RX']] },
  Q('El TX de una placa va al… del otro', ['RX', 'TX', 'GND', 'VCC'], 'Lo que uno envía, el otro recibe.'),
  Q('¿Por qué I²C necesita pull-ups?', ['Las salidas solo tiran hacia masa (colector abierto)', 'Para limitar tensión', 'Para pitar', 'No las necesita'], 'Típico 4,7 kΩ.', { c: 'pullup' })
 ]),
 L('n9', 'Motores, servos y alimentación', 'chip', ['bjt'], [
  I('· <b>Motor DC</b>: transistor o driver y su propia alimentación.\n· <b>Servo</b>: pulsos de 1–2 ms cada 20 ms.\n· <b>Paso a paso</b>: con driver.\nRegla de oro: <b>masa común</b>.'),
  Q('Motor con otra pila y transistor desde Arduino. Funciona mal. ¿Qué falta?', ['Unir las masas', 'Más código', 'Un LED', 'Nada'], 'Sin masa común no hay referencia.', { c: 'voltage' }),
  Nm('Servo a 50 Hz. ¿Periodo?', 20, 'ms', '1 / 50.', { c: 'ac' }),
  Q('¿Por qué no alimentar un motor desde el 5V de la placa?', ['Los picos de corriente reinician la placa', 'Gira al revés', 'No tiene 5 V', 'Sí se puede'], 'Fuente aparte, masa común.')
 ]),
 SIM('s7a', 'Reto: parpadeo', 'Conecta un LED al pin 13 para que parpadee.', { arduino: 'blink', parts: ['res', 'led'], code: true, hint: 'D13 → 220 Ω → ánodo; cátodo → GND.' }, 'blink'),
 SIM('s7b', 'Reto: semáforo', 'Monta las tres luces en los pines del programa.', { arduino: 'semaforo', parts: ['res', 'led'], code: true, hint: 'LEDs en 12, 11 y 10, cada uno con su resistencia a GND.' }, 'traffic'),
 SIM('s7c', 'Reto: pulsador', 'El LED del 13 se enciende solo mientras pulsas el botón del 2.', { arduino: 'boton', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D2 y GND. LED con resistencia en D13.' }, 'button'),
 SIM('s7d', 'Reto: regulador de brillo', 'Controla el brillo del LED con el potenciómetro.', { arduino: 'pot', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 5V y GND, cursor a A0. LED con resistencia en el 9.' }, 'dimmer'),
 PRJ('p7', 'Proyecto: semáforo real', 'traffic')
] },

{ id: 'm13', title: 'Alimentación', desc: 'Baterías, reguladores lineales y conmutados, protección.', nodes: [
 L('o1', 'Pilas y baterías', 'bat', ['power'], [
  I('Capacidad en mAh. <b>Autonomía ≈ capacidad / consumo</b>. Las de <b>litio</b> exigen respeto: nunca las cortocircuites, perfores o cargues sin un cargador con protección.', { tune: { viz: 'battery', params: { mAh: { label: 'Capacidad', val: 2000, min: 200, max: 3000, step: 100, unit: 'mAh', dec: 0 }, mA: { label: 'Consumo', val: 50, min: 5, max: 500, step: 5, unit: 'mA', dec: 0 } } } }),
  G('battLife'), G('battLife'),
  Q('Pilas iguales en paralelo…', ['Suman capacidad, misma tensión', 'Suman tensión', 'Restan', 'No se puede'], 'En serie suman voltios.'),
  MT('¿Está cargada esta pila de 9 V?', 'bat', { measure: 'V', between: ['P', 'N'], best: true, sign: true }, 'Por encima de 9 V, bien.'),
  Q('Una Li-ion se ha hinchado:', ['Dejar de usarla y reciclarla', 'Pincharla', 'Cargarla más', 'Seguir'], 'Riesgo de incendio.')
 ]),
 L('o2', 'Reguladores lineales', 'ic', ['power'], [
  I('Un lineal es una resistencia que se ajusta sola para dejar caer lo que sobra. Simple y silencioso, ineficiente con mucha diferencia.'),
  G('regLoss'), G('efficiency'), G('efficiency'),
  Q('¿Cuándo necesita disipador un 7805?', ['Cuando (Vent − Vsal) × I supera ~1 W', 'Siempre', 'Nunca', 'En verano'], 'Sin disipador, poco más de 1 W.')
 ]),
 L('o3', 'Reguladores conmutados', 'ic', ['power'], [
  I('Conmutan un transistor muy rápido y suavizan con bobina y condensador: 85–95 % de eficiencia.\n· <b>Buck</b>: baja. · <b>Boost</b>: sube. · <b>Buck-boost</b>: ambas.'),
  { t: 'match', q: 'Une cada caso.', pairs: [['12 V → 5 V, 2 A', 'Buck'], ['3,7 V → 5 V', 'Boost'], ['9 V → 5 V, 20 mA, sin ruido', 'Lineal'], ['3–4,2 V → 3,3 V', 'Buck-boost o LDO']] },
  Nm('Buck al 90 % entregando 5 V y 2 A. ¿Potencia de entrada?', 11.1, 'W', '10 / 0,9.', { tol: 0.15 }),
  Q('Desventaja de los conmutados:', ['Ruido eléctrico', 'Ineficientes', 'Solo alterna', 'No hay pequeños'], 'A veces se pone un LDO detrás.')
 ]),
 L('o4', 'Protección', 'bat', ['circuit'], [
  I('· <b>Fusible</b> o <b>PTC</b>: sobrecorriente.\n· <b>Diodo en serie</b> o MOSFET: polaridad invertida.\n· <b>TVS</b>: picos.\n· Condensadores grandes: caídas.'),
  Q('Ventaja del PTC frente al fusible:', ['Se rearma al enfriarse', 'Más rápido', 'No se calienta', 'Sube la tensión'], 'Útil en USB.'),
  Q('Proteger la polaridad con un diodo cuesta…', ['≈ 0,7 V de caída', 'Nada', 'La mitad', 'Toda la corriente'], 'Con MOSFET, mucho menos.', { c: 'diode' })
 ]),
 PRJ('p8', 'Proyecto: fuente de 5 V', 'psu')
] },

{ id: 'm14', title: 'Diseño de PCB', desc: 'Del esquema a una placa fabricada y soldada.', nodes: [
 L('q1', 'Del esquema a la placa', 'pcb', ['schematic'], [
  I('Una PCB sustituye los cables por pistas de cobre. KiCad (gratuito) sigue un flujo fijo.'),
  { t: 'order', q: 'Ordena el flujo.', items: ['Dibujar el esquema', 'Asignar huellas', 'Definir el contorno', 'Colocar los componentes', 'Rutar las pistas', 'Pasar el DRC', 'Exportar Gerbers y taladros'], e: 'Así no rehaces trabajo.' },
  Q('La “netlist” es…', ['La lista de qué patas están unidas', 'Precios', 'Soldadura', 'Serigrafía'], 'Guía el rutado.')
 ]),
 L('q2', 'Huellas y encapsulados', 'pcb', ['schematic'], [
  I('La <b>huella</b> es el dibujo de los pads. THT con agujeros; SMD con pads planos.'),
  { t: 'match', q: 'Une cada encapsulado.', pairs: [['DIP-8', 'Inserción (THT)'], ['0805', 'Superficie (SMD)'], ['TO-92', 'Inserción (THT) '], ['SOT-23', 'Superficie (SMD) ']] },
  Nm('0,1 pulgadas en mm', 2.54, 'mm', 'El paso estándar.', { tol: 0.01 }),
  Q('Un 0805 mide…', ['2,0 × 1,25 mm', '8 × 5 mm', '0,8 × 0,5 mm', '80 × 50 mm'], 'Manejable para empezar en SMD.'),
  Q('Huella de transistor con patas en otro orden:', ['La placa sale bien pero no funciona', 'El fabricante lo corrige', 'Nada', 'Se suelda solo'], 'Revisa la hoja de datos.')
 ]),
 L('q3', 'Colocación', 'pcb', ['schematic'], [
  I('· Conectores en los bordes.\n· Desacoplo pegado a cada chip.\n· Agrupa por bloques.\n· Deja espacio para soldar y tornillos.'),
  Q('¿Dónde va el 100 nF de un microcontrolador?', ['Pegado a sus patas de alimentación', 'En una esquina', 'Junto al conector', 'Debajo de otra pieza'], 'Lo más cerca posible.', { c: 'cap' }),
  Q('¿Por qué separar analógico y digital?', ['Para que el ruido digital no contamine', 'Estética', 'Ahorrar cobre', 'No hace falta'], 'Audio y sensores.')
 ]),
 L('q4', 'Rutado de pistas', 'pcb', ['schematic'], [
  I('Pistas más anchas cuanta más corriente, curvas a 45°, caminos cortos, <b>plano de masa</b>. Para cruzar, una pasa a la otra cara por una <b>vía</b>.'),
  Q('Pista de un motor de 2 A:', ['Ancha', 'Fina', 'Larga en zigzag', 'Da igual'], 'Una fina se calienta.', { c: 'power' }),
  Q('¿Para qué una vía?', ['Pasar de una cara a la otra', 'Atornillar', 'Ventilar', 'Medir'], 'Agujero metalizado.'),
  Q('¿Qué da un plano de masa?', ['Retorno corto y menos ruido', 'Menos peso', 'Sustituye componentes', 'Transparencia'], 'La práctica más útil.')
 ]),
 L('q5', 'Reglas y fabricación', 'pcb', ['schematic'], [
  I('El <b>DRC</b> comprueba separaciones, anchuras y taladros. Luego exportas <b>Gerbers</b> (una capa por archivo) y el archivo de taladros.'),
  Q('DRC: pistas a 0,1 mm y el fabricante pide 0,15 mm.', ['Separarlas', 'Ignorarlo', 'Pedir otra placa', 'Hacerlas más finas'], 'Si no, cortocircuitos.'),
  Q('¿Qué capa lleva los textos blancos?', ['Serigrafía', 'Máscara', 'Cobre', 'Taladros'], 'Silkscreen.')
 ]),
 L('q6', 'Soldar', 'pcb', ['schematic'], [
  I('Calienta pad y pata a la vez y aplica el estaño a la unión, no a la punta. Una buena soldadura es brillante y en cono.'),
  { t: 'order', q: 'Ordena una buena soldadura.', items: ['Limpia y estaña la punta', 'Apoya la punta en pad y pata', 'Acerca el estaño a la unión', 'Retira el estaño', 'Retira el soldador sin mover la pieza', 'Corta la pata sobrante'], e: '2–3 segundos en total.' },
  Q('Soldadura gris, rugosa, en bola:', ['Soldadura fría', 'Perfecta', 'Demasiado flux', 'Una vía'], 'Recalienta con flux.'),
  Q('Precaución imprescindible:', ['Ventilar y no respirar el humo', 'Placa alimentada', 'Tocar la punta', 'Sin soporte'], 'Gafas y lávate las manos.')
 ]),
 { id: 'r1', kind: 'route', title: 'Reto: rutado 1', icon: 'pcb', level: 'r1', brief: 'Une cada par de pads del mismo color sin cruzar pistas.' },
 { id: 'r2', kind: 'route', title: 'Reto: rutado 2', icon: 'pcb', level: 'r2', brief: 'Cuatro redes. Planifica antes de trazar.' },
 { id: 'r3', kind: 'route', title: 'Reto: rutado 3', icon: 'pcb', level: 'r3', brief: 'Cinco redes. Empieza por los bordes.' },
 PRJ('p9', 'Proyecto: tu primera PCB', 'pcb')
] }
];
