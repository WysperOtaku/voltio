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
 L('a7', 'Notación de ingeniería y cifras significativas', 'bin', ['engnum'], [
  I('La notación científica deja una sola cifra delante de la coma: 47 000 = 4,7 × 10⁴. La de <b>ingeniería</b> obliga a que el exponente sea múltiplo de 3: 47 × 10³.\n¿Por qué? Porque cada múltiplo de 3 tiene su prefijo: 47 × 10³ Ω = <b>47 kΩ</b>.'),
  Q('¿Cuál está en notación de ingeniería?', ['220 × 10⁻⁹ F', '2,2 × 10⁻⁷ F', '22 × 10⁻⁸ F', '2200 × 10⁻¹⁰ F'], 'Exponente múltiplo de 3 y entre 1 y 999 delante: 220 nF.'),
  G('engNot'), G('engNot'),
  I('<b>Cifras significativas</b>: las que de verdad conoces. 4,7 kΩ tiene dos; 4,70 kΩ tiene tres (dice que se midió hasta las decenas de ohmio). Los ceros de la izquierda no cuentan: 0,0047 tiene dos.'),
  Q('¿Cuántas cifras significativas tiene 0,0330?', ['3', '5', '2', '4'], 'Los ceros iniciales no cuentan; el cero final sí.'),
  I('Un resultado no puede ser más preciso que sus datos. Si la pila marca “9 V” y la resistencia es del 5 %, decir que pasan 19,148936 mA es inventarse cifras: <b>19 mA</b> basta.'),
  Q('Con una resistencia de 1 kΩ al 5 % y una pila de 9,0 V calculas 9,0 mA. ¿Qué intervalo es realista?', ['Entre unos 8,6 y 9,5 mA', 'Exactamente 9,000 mA', 'Entre 0 y 18 mA', 'Entre 8,99 y 9,01 mA'], '±5 % en la resistencia da más o menos ±5 % en la corriente.', { c: 'algebra' }),
  G('engNot'),
  Q('Un multímetro con una exactitud de ±1 % marca 4,73 V. ¿Cómo lo anotas?', ['4,73 V ± 0,05 V', '4,7300 V', '4,73 V exactos', '5 V ± 1 V'], 'El 1 % de 4,73 son unos 0,05 V.'),
  { t: 'match', q: 'Une cada valor con su forma con prefijo.', pairs: [['0,000 001 5 F', '1,5 µF'], ['33 000 Ω', '33 kΩ'], ['0,000 000 010 F', '10 nF'], ['2 400 000 000 Hz', '2,4 GHz']] }
 ]),
 L('a3', 'Despejar fórmulas', 'ohm', ['algebra'], [
  I('Casi todas las fórmulas de electrónica tienen tres letras: si conoces dos, despejas la tercera. La regla: <b>lo que hagas a un lado de la igualdad, házselo al otro</b>.\nDe V = I × R, divide los dos lados entre R → V / R = I.'),
  Q('De V = I × R, ¿qué es I?', ['V / R', 'V × R', 'R / V', 'V − R'], 'Divide los dos lados entre R.'),
  G('rearrange'), G('rearrange'), G('rearrange'),
  I('Truco de comprobación: prueba con números sencillos. Si V = I × R con I = 2 y R = 3 da 6, entonces I = V / R da 6 / 3 = 2. ✓'),
  G('rearrange'),
  Q('De P = I² × R, ¿cuánto vale I?', ['√(P / R)', 'P / R', 'P / R²', '√(P × R)'], 'Divide entre R y haz la raíz.')
 ]),
 L('a8', 'Unidades y análisis dimensional', 'bin', ['algebra'], [
  I('Las unidades no son un adorno: son una comprobación gratis. Si una fórmula debe dar amperios, las unidades de la derecha tienen que acabar siendo amperios. Se llama <b>análisis dimensional</b>.'),
  I('Equivalencias básicas:\n· 1 V = 1 J / C (energía por carga).\n· 1 A = 1 C / s.\n· 1 Ω = 1 V / A.\n· 1 W = 1 J / s = 1 V · A.\n· 1 F = 1 C / V (carga por voltio).'),
  Q('V / Ω da…', ['Amperios', 'Vatios', 'Culombios', 'Segundos'], 'Es la ley de Ohm: I = V / R.'),
  Q('V × A da…', ['Vatios', 'Ohmios', 'Julios', 'Faradios'], 'P = V · I.'),
  I('Un ejemplo con sorpresa: <b>Ω × F = s</b>. Ω = V/A y F = C/V, así que Ω · F = C/A = C / (C/s) = s. Por eso τ = R · C sale en segundos.'),
  Q('¿Qué unidad tiene L / R (henrios entre ohmios)?', ['Segundos', 'Hercios', 'Ohmios', 'Voltios'], '1 H = 1 Ω · s, así que H / Ω = s: es la constante de tiempo de una bobina con una resistencia.'),
  Q('Alguien escribe P = V / R. ¿Cómo sabes que está mal sin probar números?', ['V / R da amperios, no vatios', 'Porque falta un 2', 'Porque R no puede ir abajo', 'No se puede saber'], 'La correcta es V² / R: V · (V / R) = V · A = W.'),
  I('Truco de taller: pasa todo a unidades base (V, A, Ω, F, s) <b>antes</b> de operar y deja los prefijos para el final. Así nunca mezclas mA con A.'),
  Q('El kWh es una unidad de…', ['Energía', 'Potencia', 'Corriente', 'Tiempo'], 'Potencia × tiempo: 1 kWh = 3,6 millones de julios.'),
  Nm('¿Cuántos julios son 1 Wh?', 3600, 'J', '1 W durante 3600 s.'),
  Q('El mAh de las baterías mide…', ['Carga eléctrica', 'Energía', 'Potencia', 'Tensión'], 'Corriente × tiempo = culombios: 1 mAh = 3,6 C. Para la energía hay que multiplicar por la tensión.')
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
 ]),
 L('a9', 'Escalas logarítmicas', 'bin', ['log'], [
  I('En una escala normal, cada marca suma lo mismo: 0, 10, 20, 30. En una escala <b>logarítmica</b>, cada marca multiplica: 1, 10, 100, 1000. Cada salto ×10 se llama <b>década</b>.\nLo que se reparte por igual es el <b>logaritmo</b>: log₁₀ responde a “¿10 elevado a cuánto da este número?”. log(1000) = 3 porque 10³ = 1000.'),
  Q('En un eje logarítmico, ¿qué hay a medio camino entre 10 y 1000?', ['100', '505', '500', '50'], 'A medio camino hay el mismo factor a cada lado: ×10 y ×10.'),
  I('¿Por qué se usan? Porque en electrónica todo abarca muchas décadas: un filtro se estudia de 10 Hz a 100 kHz y un LED pasa de microamperios a decenas de miliamperios. En una escala lineal, lo pequeño quedaría aplastado contra el cero.'),
  Q('Una gráfica va de 10 Hz a 100 kHz. ¿Cuántas décadas son?', ['4', '10 000', '5', '3'], '10 → 100 → 1 k → 10 k → 100 k.'),
  I('Dentro de una década, las marcas 2, 3, 4… no están equiespaciadas: el 2 queda a un 30 % del camino y el 5 a un 70 %, porque log(2) ≈ 0,3 y log(5) ≈ 0,7.'),
  Q('En la década de 1 kHz a 10 kHz, ¿dónde queda 2 kHz?', ['A un 30 % del camino', 'Al 20 %', 'A la mitad', 'Al 90 %'], 'log(2) ≈ 0,30.'),
  I('Una recta en una gráfica log–log significa una ley de potencias. Por ejemplo, la caída de un filtro RC por encima de su frecuencia de corte: cada ×10 en frecuencia, ÷10 en amplitud.'),
  Q('En una gráfica log–log, una recta que baja una década por cada década que avanza significa…', ['Que la salida es inversamente proporcional a la frecuencia', 'Que la salida es constante', 'Que la salida sube', 'Que hay un error'], 'Pendiente −1: ×10 en f, ÷10 en la salida.'),
  G('log10'), G('log10'),
  Q('Una hoja de datos dibuja la corriente de un diodo en escala logarítmica frente a la tensión en escala lineal, y sale una recta. ¿Qué te dice?', ['Que la corriente crece de forma exponencial con la tensión', 'Que el diodo cumple la ley de Ohm', 'Que la corriente es constante', 'Que la gráfica está mal'], 'Recta en escala semilogarítmica = exponencial. Lo verás en la curva del diodo.')
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
 L('b9', 'Energía, trabajo y carga', 'bat', ['voltage'], [
  I('Mover una carga a través de una tensión es hacer <b>trabajo</b>: <b>W = Q · V</b>. Un culombio que atraviesa una pila de 9 V recibe 9 julios. Esa energía la suelta después en la resistencia (calor), en el LED (luz) o en el motor (movimiento).'),
  Q('¿Cuánta energía recibe una carga de 2 C al atravesar una pila de 1,5 V?', ['3 J', '0,75 J', '1,5 J', '2 J'], 'W = Q · V = 2 × 1,5.'),
  I('La energía por segundo es la <b>potencia</b>. Si cada segundo pasan I culombios y cada uno recibe V julios, la pila entrega V · I julios por segundo. Por eso P = V · I no es una fórmula más: es contar julios.'),
  Q('Una pila de 9 V entrega 0,1 A. ¿Cuántos julios da cada segundo?', ['0,9 J', '90 J', '9 J', '0,011 J'], 'P = V · I = 0,9 W, es decir, 0,9 J cada segundo.', { c: 'power' }),
  I('La energía de una batería sale de su carga: una pila de 9 V y 500 mAh guarda 0,5 A × 3600 s = 1800 C, y 1800 C × 9 V = <b>16 200 J</b>, unos 4,5 Wh.'),
  Nm('Una batería de 3,7 V y 2000 mAh. ¿Energía en Wh?', 7.4, 'Wh', '2 Ah × 3,7 V = 7,4 Wh.'),
  Q('Para comparar baterías de distinta tensión, ¿qué cifra sirve?', ['Los Wh (energía)', 'Los mAh (carga)', 'Los voltios', 'El tamaño'], 'Los mAh solo sirven para comparar baterías de la misma tensión.'),
  I('En física se usa también el <b>electronvoltio</b> (eV): la energía que gana un electrón al cruzar 1 V. Te sonará con los LEDs: un fotón rojo lleva unos 1,9 eV, y por eso un LED rojo necesita casi 2 V.'),
  Q('Un LED azul necesita unos 3 V y uno rojo unos 1,8 V. ¿Qué fotones llevan más energía?', ['Los azules', 'Los rojos', 'Iguales', 'Depende de la corriente'], 'Más energía por fotón exige más tensión por electrón.'),
  Q('Una batería externa de 3,7 V y 10 000 mAh viaja en avión. Las aerolíneas suelen limitar a 100 Wh sin permiso. ¿Cuántos Wh tiene?', ['37 Wh', '10 000 Wh', '3,7 Wh', '370 Wh'], '10 Ah × 3,7 V: por debajo del límite habitual.')
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
 L('b8', 'Seguridad eléctrica de verdad', 'shield', ['esafety'], [
  I('Lo que hace daño no es la tensión ni la corriente que “tiene” un enchufe, sino la <b>corriente que atraviesa tu cuerpo</b>. Según su recorrido, unos pocos miliamperios ya se notan y unas decenas pueden desordenar el ritmo del corazón (fibrilación).'),
  I('Esa corriente la pone la tensión venciendo tu resistencia: con la piel seca, decenas o cientos de kΩ; mojada o con heridas, muchísimo menos. <b>I = V / R</b> también vale para ti.'),
  Q('De mano a mano, con la piel seca, puede haber unos 100 kΩ. ¿Qué corriente pasaría con una pila de 9 V?', ['Unos 90 µA: ni lo notas', 'Unos 90 mA: mortal', '9 A', 'Ninguna: la continua no conduce'], '9 / 100 000 = 0,09 mA.', { c: 'ohm' }),
  Nm('Con la piel mojada la resistencia puede bajar a 1 kΩ. ¿Qué corriente pasaría con 230 V, en mA?', 230, 'mA', '230 / 1000 = 0,23 A: muy por encima de lo que puede matar.'),
  I('Por eso en este curso todo es de <b>baja tensión</b>: pilas, USB y adaptadores homologados. No abras aparatos conectados a la red ni fuentes de alimentación, aunque estén desenchufadas: sus condensadores pueden seguir cargados.'),
  Q('¿Qué protege a las personas en la instalación eléctrica de casa?', ['El diferencial: corta si la corriente que va no es igual a la que vuelve', 'El fusible del multímetro', 'La toma de tierra por sí sola', 'Nada'], 'El diferencial de 30 mA detecta fugas hacia tierra, por ejemplo a través de ti.'),
  I('Baja tensión no significa sin riesgo: una batería de coche o de litio en cortocircuito da cientos de amperios. Un anillo o una pulsera metálica que la puentee se pone al rojo en segundos. Quítatelos para trabajar con baterías.'),
  Q('Llevas una celda 18650 suelta en el bolsillo con las llaves. ¿Algún problema?', ['Las llaves pueden cortocircuitarla: calor e incluso fuego', 'Ninguno: solo son 3,7 V', 'Solo se descarga un poco', 'Solo si está vacía'], 'Guárdalas en un estuche o con los polos tapados.'),
  I('Condensadores: uno de 470 µF a 400 V (de una fuente de red) guarda casi 38 J y puede descargarse a través de ti mucho después de desenchufar. Se descargan con una resistencia (por ejemplo, 10 kΩ y 5 W) sujeta con pinzas aisladas, nunca con un destornillador.'),
  { t: 'order', q: 'Ordena una rutina segura antes de tocar un circuito que puede guardar energía.', items: ['Desconecta la alimentación', 'Espera unos segundos', 'Mide la tensión de los condensadores grandes', 'Descárgalos con una resistencia si hace falta', 'Vuelve a medir: 0 V', 'Trabaja'], e: 'Nunca te fíes: mide.' },
  Q('¿Por qué se recomienda acercar una sola mano a un circuito de alta tensión?', ['Para que una corriente no cruce el pecho de mano a mano', 'Para ir más rápido', 'Para sujetar la linterna', 'Por costumbre'], 'El recorrido más peligroso pasa por el corazón. Aun así, la alta tensión no es para este curso.')
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
 L('d12', 'Análisis nodal sencillo', 'node', ['kcl', 'network'], [
  I('Con Kirchhoff y Ohm se resuelve cualquier circuito de resistencias. El método más cómodo es el <b>nodal</b>: eliges la masa, das nombre a las tensiones de los nudos que no conoces y escribes en cada uno “lo que entra = lo que sale”.'),
  I('La corriente por una resistencia entre dos nudos es <b>(Va − Vb) / R</b>. Si al final te sale negativa, iba al revés: no hace falta adivinar los sentidos.'),
  Q('Entre un nudo a 7 V y otro a 3 V hay 2 kΩ. ¿Corriente?', ['2 mA, del de 7 V al de 3 V', '5 mA', '2 mA, del de 3 V al de 7 V', '3,5 mA'], '(7 − 3) / 2000.'),
  I('Ejemplo: 12 V → 1 kΩ → nudo A; 6 V → 1 kΩ → A; y de A, 1 kΩ a masa.\nNudo A: (12 − VA)/1k + (6 − VA)/1k = VA/1k → 18 = 3 · VA → <b>VA = 6 V</b>.'),
  Nm('En ese ejemplo, ¿qué corriente sale de la fuente de 6 V, en mA?', 0, 'mA', 'VA = 6 V: no hay diferencia de tensión en su resistencia, así que no pasa corriente.', { tol: 0.05 }),
  Nm('¿Y de la de 12 V, en mA?', 6, 'mA', '(12 − 6) / 1 kΩ.'),
  G('nodeV'), G('nodeV'),
  Q('Un circuito tiene 4 nudos y eliges uno como masa. ¿Cuántas ecuaciones de nudo necesitas como mucho?', ['3', '4', '1', '6'], 'Una por cada nudo cuya tensión no conoces.'),
  Q('¿Qué hace un simulador como SPICE por dentro?', ['Escribe y resuelve ecuaciones de nudos como estas', 'Prueba valores al azar', 'Mide un circuito real', 'Solo suma resistencias en serie'], 'El análisis nodal escala a miles de nudos con álgebra de matrices.'),
  Q('En el circuito real mides VA = 6,3 V cuando el cálculo dice 6 V. ¿Qué es lo más probable?', ['Las tolerancias de las resistencias o la carga del voltímetro', 'Que Kirchhoff no se cumple', 'Que el multímetro inventa', 'Un error del 50 %'], 'Un 5 % encaja con resistencias del 5 %.')
 ]),
 L('d6', 'El divisor de tensión', 'div', ['divider'], [
  I('Dos resistencias en serie forman un <b>divisor</b>:\n<b>Vsal = Vent × R2 / (R1 + R2)</b>', { tune: { viz: 'divider', params: { V: pV(9), R1: pR('R1', 1000, 100, 100000), R2: pR('R2', 1000, 100, 100000) } } }),
  TU('Consigue 3,3 V partiendo de 5 V.', 'divider', { V: { ...pV(5), fixed: true }, R1: pR('R1', 1000, 100, 100000), R2: pR('R2', 1000, 100, 100000) }, { q: 'Vout', min: 3.2, max: 3.4, text: 'Objetivo: 3,3 V ± 0,1', hint: 'R2 ≈ el doble que R1.' }, '4,7 kΩ y 10 kΩ dan 3,40 V.'),
  G('divider'), G('divider'), G('divider'),
  Q('Conectas una carga de poca resistencia a la salida. La tensión…', ['Baja', 'Sube', 'No cambia', 'Se invierte'], 'La carga queda en paralelo con R2.')
 ]),
 L('d9', 'Superposición', 'div', ['network'], [
  I('Con varias fuentes hay un atajo: la <b>superposición</b>. Calcula lo que produce cada fuente sola, con las demás “apagadas”, y suma los resultados. Funciona en cualquier circuito <b>lineal</b> (resistencias, condensadores, bobinas), no con diodos ni transistores.'),
  I('“Apagar” una fuente:\n· Pila (fuente de tensión) → se sustituye por un <b>cable</b> (0 V).\n· Fuente de corriente → se sustituye por un <b>hueco abierto</b> (0 A).'),
  Q('Al apagar una fuente de corriente para aplicar superposición, la sustituyes por…', ['Un circuito abierto', 'Un cable', 'Una resistencia de 1 kΩ', 'Otra fuente igual'], 'Una fuente de 0 A no deja pasar nada.'),
  I('Ejemplo, el mismo del análisis nodal: 12 V y 6 V llegan al nudo A, cada una por 1 kΩ, y de A sale 1 kΩ a masa.\n· Solo 12 V (la de 6 V → cable): 1 kΩ en serie con 500 Ω → VA = 12 × 500/1500 = 4 V.\n· Solo 6 V: VA = 6 × 500/1500 = 2 V.\n· Total: <b>6 V</b>.'),
  Q('¿Coincide con el análisis nodal?', ['Sí: 6 V por los dos caminos', 'No, sale el doble', 'No: la superposición solo vale para corrientes', 'Depende de la masa'], 'Dos métodos, mismo resultado: una buena forma de comprobar.'),
  Nm('Dos pilas de 9 V y 3 V llegan a un nudo, cada una por 2 kΩ, y del nudo a masa hay 1 kΩ. ¿Tensión del nudo?', 3, 'V', 'Solo 9 V: 9 × 0,667 / 2,667 = 2,25 V. Solo 3 V: 0,75 V. Suma: 3 V.', { tol: 0.03 }),
  Q('¿Puedes calcular la potencia total sumando las potencias que da cada fuente por separado?', ['No: la potencia va con el cuadrado y no se suma así', 'Sí, siempre', 'Solo en serie', 'Solo con dos fuentes'], 'Suma tensiones o corrientes y calcula la potencia al final.', { c: 'power' }),
  Q('Un circuito con un LED, ¿admite superposición?', ['No: el LED no es lineal', 'Sí, siempre', 'Solo si es rojo', 'Solo en alterna'], 'La superposición exige componentes lineales.'),
  I('Uso real: una señal de audio (alterna) montada sobre una polarización de continua. Se analiza la continua por un lado y la señal por otro, y se suman. Lo harás al polarizar transistores y operacionales.'),
  G('nodeV')
 ]),
 L('d7', 'Thévenin', 'div', ['divider'], [
  I('Cualquier circuito de fuentes y resistencias, visto desde dos puntos, equivale a <b>una fuente Vth en serie con Rth</b>.\n· Vth: tensión entre esos puntos sin carga.\n· Rth: resistencia vista con las pilas sustituidas por cables.'),
  Q('Divisor de 9 V con 1 kΩ y 1 kΩ. ¿Vth en la salida?', ['4,5 V', '9 V', '0 V', '2,25 V'], 'Sin carga, la mitad.'),
  Q('¿Y Rth? (pila → cable: R1 y R2 en paralelo)', ['500 Ω', '2 kΩ', '1 kΩ', '0 Ω'], '1 kΩ ∥ 1 kΩ.'),
  Nm('Con una carga de 500 Ω en esa salida, ¿tensión?', 2.25, 'V', 'Divisor entre Rth y la carga.'),
  Q('¿Para qué sirve en la práctica?', ['Para saber cuánto caerá una salida al conectarle una carga', 'Para colores', 'Para medir corriente', 'Solo teoría'], 'Rth dice lo “débil” que es una salida.')
 ]),
 L('d10', 'Norton y el paso de Thévenin a Norton', 'div', ['network'], [
  I('Thévenin resume una red como una pila Vth con Rth en serie. <b>Norton</b> la resume como una fuente de corriente IN con RN en paralelo. Son dos fotos del mismo objeto: desde fuera no se distinguen.'),
  I('Conversión:\n· <b>RN = Rth</b>.\n· <b>IN = Vth / Rth</b>: la corriente de cortocircuito.\n· Al revés: Vth = IN · RN, la tensión en vacío.'),
  G('norton'), G('norton'),
  Q('¿Qué es una fuente de corriente ideal?', ['Da siempre la misma corriente y ajusta su tensión a la carga', 'Da siempre la misma tensión', 'Una pila muy grande', 'Un condensador'], 'Su resistencia interna sería infinita.'),
  I('Truco de medida: mide la tensión en vacío y la corriente en cortocircuito y divide: <b>Rth = Vvacío / Icorto</b>. Solo si cortocircuitar no daña nada; si no, mide con una carga conocida.'),
  Nm('Una salida da 5 V en vacío y 4 V con una carga de 400 Ω. ¿Rth?', 100, 'Ω', 'Con carga pasan 4 / 400 = 10 mA y se pierde 1 V dentro: Rth = 1 V / 10 mA.'),
  Q('¿Cuándo es útil pensar en Norton?', ['Con cosas que se comportan como fuentes de corriente: fotodiodos, transistores en zona activa', 'Nunca', 'Solo con pilas', 'Solo en digital'], 'Un fotodiodo da una corriente proporcional a la luz casi sin importar la tensión.'),
  Q('Conviertes Vth = 9 V con Rth = 3 kΩ. ¿Norton?', ['3 mA con 3 kΩ en paralelo', '3 mA con 3 kΩ en serie', '27 mA con 3 kΩ en paralelo', '9 mA con 1 kΩ en paralelo'], 'IN = 9 / 3000.')
 ]),
 L('d11', 'Máxima transferencia de potencia', 'heat', ['network'], [
  I('Una fuente con resistencia interna Rth alimenta una carga RL. ¿Con qué RL saca más potencia? Si RL es muy pequeña, pasa mucha corriente pero cae poca tensión en ella; si es muy grande, mucha tensión pero casi sin corriente. El máximo está en medio: <b>RL = Rth</b>.'),
  Nm('Fuente de 10 V con Rth = 10 Ω y RL = 10 Ω. ¿Potencia en la carga, en W?', 2.5, 'W', 'I = 10 / 20 = 0,5 A; P = 0,5² × 10.'),
  Nm('La misma fuente con RL = 40 Ω. ¿Potencia en la carga?', 1.6, 'W', 'I = 10 / 50 = 0,2 A; P = 0,04 × 40.'),
  Nm('¿Y con RL = 2,5 Ω?', 1.6, 'W', 'I = 10 / 12,5 = 0,8 A; P = 0,64 × 2,5. Igual que con 40 Ω: el máximo está en 10 Ω.'),
  G('maxPow'), G('maxPow'),
  I('Pero con RL = Rth, la mitad de la potencia se queda dentro de la fuente: rendimiento del <b>50 %</b>. La adaptación se busca cuando la señal es débil y valiosa (antenas, sensores, micrófonos), no para alimentar cosas.'),
  Q('¿Por qué una batería no se usa con RL = Rth?', ['Porque se desperdiciaría la mitad de la energía en calor dentro de ella', 'Porque es ilegal', 'Porque daría poca tensión', 'Sí se hace siempre'], 'Para alimentar interesa el rendimiento: Rth mucho menor que RL.'),
  Q('Una antena de 50 Ω y un receptor. ¿Qué impedancia de entrada conviene?', ['50 Ω', '0 Ω', 'Infinita', '1 Ω'], 'Adaptación de impedancias: lo verás a fondo en Radio.'),
  Q('Un amplificador para altavoces de 8 Ω con uno de 4 Ω. ¿Qué puede pasar?', ['Que dé más corriente de la prevista y se caliente o se proteja', 'Nada', 'Que suene la mitad', 'Que el altavoz no funcione'], 'Los amplificadores de audio no buscan adaptación: tienen Rth muy baja y una carga mínima.')
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
 L('f8', 'Osciloscopio: disparo y acoplo', 'meter', ['scope'], [
  I('El osciloscopio captura la señal y la dibuja muchas veces por segundo. Para que la veas quieta, cada captura empieza cuando la señal cruza un <b>nivel</b> en un <b>flanco</b> concreto (subida o bajada): es el <b>disparo</b> (trigger).', { tune: { viz: 'scopeTrigger', params: { lvl: { label: 'Nivel de disparo', val: 0.5, min: -3, max: 3, step: 0.1, unit: 'V', dec: 1 }, tdiv: { label: 'Tiempo/div', val: 0.5, list: [0.05, 0.1, 0.2, 0.5, 1, 2], unit: 'ms', dec: 2 } } } }),
  TU('Consigue una imagen quieta con entre 2 y 5 ciclos en pantalla.', 'scopeTrigger', { lvl: { label: 'Nivel de disparo', val: 2.6, min: -3, max: 3, step: 0.1, unit: 'V', dec: 1 }, tdiv: { label: 'Tiempo/div', val: 2, list: [0.05, 0.1, 0.2, 0.5, 1, 2], unit: 'ms', dec: 2 } }, { q: 'ok', min: 1, max: 1, text: 'Objetivo: disparo estable y entre 2 y 5 ciclos', hint: 'Baja el nivel por debajo de 2 V y elige 0,2 o 0,5 ms/div.' }, 'Nivel dentro de la señal y una base de tiempos adecuada.'),
  Q('¿Qué pasa si el nivel de disparo está por encima del pico de la señal?', ['No dispara: la imagen corre o el aparato se queda esperando', 'Se ve más grande', 'Se invierte', 'Se mide mejor'], 'La señal nunca cruza el nivel.'),
  I('Modos de disparo:\n· <b>Auto</b>: si no hay disparo, dibuja igualmente (la imagen corre).\n· <b>Normal</b>: solo dibuja cuando dispara; si no, deja la última captura.\n· <b>Single</b>: captura una vez y se para. Ideal para sucesos únicos, como el rebote de un pulsador.'),
  Q('Quieres ver el rebote de un pulsador al apretarlo una vez. ¿Qué modo?', ['Single, disparando en el flanco de bajada', 'Auto', 'Ninguno: no se puede ver', 'Normal con el nivel fuera de la señal'], 'Una captura única del suceso.', { c: 'logic' }),
  I('<b>Acoplo</b> del canal:\n· <b>DC</b>: muestra todo, continua incluida.\n· <b>AC</b>: pone un condensador en serie y quita la continua; solo ves lo que varía.\nPara ver los 50 mV de rizado de una fuente de 12 V usa AC: en DC, con 10 mV/div, la traza se saldría de la pantalla.'),
  Q('Quieres ver el rizado pequeño de una fuente de 5 V. ¿Qué acoplo?', ['AC, y bajas los V/div', 'DC con 2 V/div', 'Da igual', 'Ninguno'], 'AC quita los 5 V fijos y puedes ampliar el rizado.'),
  Q('Con acoplo AC, una cuadrada muy lenta (1 Hz) se ve…', ['Deformada: las partes planas caen hacia cero', 'Perfecta', 'Invertida', 'Más rápida'], 'El condensador de acoplo forma un paso alto: lo muy lento no pasa bien.', { c: 'filter' }),
  Q('En un osciloscopio de sobremesa, la pinza de masa de la sonda está unida a…', ['La toma de tierra del enchufe', 'Nada', 'El positivo', 'La punta'], 'Si la conectas a un punto que no es masa en un circuito unido a la red, provocas un cortocircuito a través de la tierra. Con pilas no hay problema.', { c: 'esafety' }),
  G('period')
 ]),
 L('f9', 'Sondas, tiempos de subida y desfase', 'meter', ['scope'], [
  I('La sonda no es un simple cable: tiene capacidad y resistencia. Una sonda <b>×10</b> lleva dentro 9 MΩ que, con el 1 MΩ de la entrada del osciloscopio, dividen entre 10. Pierdes señal, pero cargas mucho menos el circuito y ganas ancho de banda.'),
  Q('Sonda ×10 y canal configurado en ×10. La pantalla marca 3 V. ¿Qué llega a la entrada del aparato?', ['0,3 V, que el osciloscopio multiplica por 10 al mostrarlo', '30 V', '3 V', '0,03 V'], 'La sonda divide y el canal lo compensa en pantalla.'),
  I('<b>Compensación</b>: la sonda ×10 tiene un condensador ajustable que debe equilibrar la capacidad de la entrada. Se ajusta con la cuadrada de 1 kHz que da el propio osciloscopio, girando el tornillo hasta que la cuadrada salga plana.'),
  { t: 'match', q: 'Une lo que ves al compensar con su diagnóstico.', pairs: [['Esquinas con picos hacia fuera', 'Sobrecompensada'], ['Esquinas redondeadas', 'Subcompensada'], ['Cuadrada plana', 'Bien compensada']] },
  I('El <b>tiempo de subida</b> (tr) es lo que tarda un flanco en ir del 10 % al 90 %. El osciloscopio también tiene el suyo: <b>tr ≈ 0,35 / ancho de banda</b>. Uno de 100 MHz no puede mostrar flancos de menos de unos 3,5 ns.'),
  G('riseT'), G('riseT'),
  I('Para medir el <b>desfase</b> entre dos señales de la misma frecuencia, mide cuánto tiempo Δt separa sus cruces por cero: <b>φ = 360° · Δt / T</b>.'),
  Nm('Dos senoides de 1 kHz; la segunda cruza cero 0,25 ms después. ¿Desfase en grados?', 90, '°', '360 × 0,25 / 1.', { c: 'impedance' }),
  Q('Mides con la sonda en ×1 un punto de alta impedancia y la señal sale más lenta de lo esperado. ¿Por qué?', ['La capacidad de la sonda en ×1 (del orden de 100 pF) forma un RC con el circuito', 'La sonda en ×1 amplifica', 'El disparo está mal', 'El acoplo es DC'], 'En ×10 la capacidad es de unos 10–15 pF: carga mucho menos.', { c: 'rc' }),
  Q('Con la pinza de masa larga (15 cm) aparecen oscilaciones en los flancos rápidos. ¿Solución?', ['Usar el muelle de masa corto en la punta', 'Una pinza más larga', 'Subir los V/div', 'Acoplo AC'], 'El cable largo es una bobina que resuena con la capacidad de la sonda.')
 ]),
 L('f10', 'La fuente de laboratorio', 'bat', ['ohm'], [
  I('Una fuente de laboratorio tiene dos mandos: <b>tensión</b> y <b>límite de corriente</b>. Trabaja en dos modos:\n· <b>CV</b> (tensión constante): la carga pide menos que el límite y la fuente da la tensión fijada.\n· <b>CC</b> (corriente constante): la carga pediría más; la fuente baja la tensión para no pasar del límite.'),
  Q('Fijas 12 V y 100 mA y conectas 1 kΩ. ¿En qué modo trabaja?', ['CV: 12 V y 12 mA', 'CC: 100 mA', 'CC: 12 mA', 'Se apaga'], '12 V / 1 kΩ = 12 mA, por debajo del límite.'),
  Nm('Fijas 12 V y 100 mA y conectas 47 Ω. ¿Qué tensión marca la fuente?', 4.7, 'V', 'A 12 V pasarían 255 mA: entra en CC y baja a 0,1 × 47 = 4,7 V.'),
  I('El límite es tu mejor amigo mientras aprendes: si hay un cortocircuito, la fuente solo da lo fijado y no se quema nada. Regla: ponlo un poco por encima de lo que esperas que consuma tu circuito.'),
  { t: 'order', q: 'Ordena cómo alimentar un montaje nuevo con la fuente.', items: ['Salida desactivada y tensión al mínimo', 'Ajusta la tensión deseada sin carga', 'Cortocircuita los bornes y ajusta el límite de corriente', 'Quita el cortocircuito y conecta el circuito', 'Activa la salida y mira la corriente'], e: 'Si la fuente entra en CC nada más encender, algo consume de más.' },
  Q('Al encender, la fuente pasa a CC y la tensión cae a 0,8 V. Esperabas 20 mA y el límite está en 50 mA. ¿Qué pasa?', ['Hay un cortocircuito o algo al revés: apaga y revisa', 'Todo normal', 'Sube el límite a 3 A', 'La fuente está rota'], 'El límite acaba de salvarte un componente.', { c: 'circuit' }),
  I('Con la fuente en CC puedes probar un LED sin resistencia: fija 3 V y 10 mA y la fuente limita la corriente. Útil para probar LEDs, pero en el circuito definitivo la resistencia sigue haciendo falta.'),
  Q('Unes en serie las dos salidas de una fuente doble (el − de una con el + de la otra). ¿Qué consigues?', ['La suma de tensiones, o ±V respecto al punto común', 'El doble de corriente', 'Nada', 'Un cortocircuito'], 'Así se alimentan operacionales con ±12 V.', { c: 'voltage' }),
  Q('¿Qué indica el amperímetro de la fuente?', ['La corriente total que sale hacia tu circuito', 'La corriente de un componente concreto', 'La tensión', 'La resistencia'], 'Para una rama concreta, multímetro en serie.', { c: 'meter_a' })
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
 L('g7', 'Tipos de condensadores', 'cap', ['cap'], [
  I('Todos son dos placas y un aislante (dieléctrico), pero el dieléctrico cambia mucho su comportamiento:\n· <b>Cerámicos</b>: pequeños, baratos, sin polaridad; de pF a decenas de µF.\n· <b>Electrolíticos de aluminio</b>: mucha capacidad barata, con polaridad.\n· <b>Tántalo</b>: compactos y estables, con polaridad.\n· <b>Película</b> (poliéster, polipropileno): precisos, para audio y filtros.'),
  { t: 'match', q: 'Une cada uso con el condensador típico.', pairs: [['100 nF de desacoplo junto a un chip', 'Cerámico'], ['1000 µF tras un rectificador', 'Electrolítico'], ['Filtro de audio preciso', 'Película'], ['Mantener un reloj durante un corte de luz', 'Supercondensador']] },
  I('Los <b>electrolíticos</b> se secan con los años y con el calor: su vida se da en horas a una temperatura (por ejemplo, 2000 h a 105 °C) y, como regla aproximada, se duplica por cada 10 °C menos. Al revés de polaridad pueden calentarse, hincharse y reventar.'),
  Q('Un electrolítico conectado al revés en una fuente de 12 V…', ['Puede calentarse, hincharse o reventar', 'Funciona igual', 'Gana capacidad', 'Se convierte en cerámico'], 'Por eso la franja − importa.'),
  Nm('Un electrolítico de 2000 h a 105 °C. Con la regla de ×2 cada 10 °C menos, ¿horas a 65 °C?', 32000, 'h', '40 °C menos son cuatro saltos: 2000 × 2⁴.'),
  I('<b>ESR</b> (resistencia serie equivalente): todo condensador real tiene una pequeña resistencia dentro. Con corrientes de rizado grandes, ESR · I² se convierte en calor. En las fuentes conmutadas se usan condensadores de baja ESR.'),
  Nm('Un condensador con 0,1 Ω de ESR soporta 2 A eficaces de rizado. ¿Potencia en calor, en W?', 0.4, 'W', 'P = I² · ESR = 4 × 0,1.', { c: 'power' }),
  I('Los <b>cerámicos de clase 2</b> (X7R, X5R, Y5V) pierden capacidad con la tensión continua aplicada y con la temperatura: un 10 µF de 6,3 V trabajando a 5 V puede quedarse en menos de la mitad. Los <b>C0G (NP0)</b> son estables, pero solo existen en valores pequeños.'),
  Q('Necesitas 22 pF muy estables para el cristal de un microcontrolador. ¿Qué eliges?', ['Cerámico C0G (NP0)', 'Electrolítico', 'Cerámico Y5V', 'Tántalo'], 'C0G apenas cambia con la tensión ni con la temperatura.'),
  Q('Circuito de 12 V. ¿Qué tensión nominal eliges para su condensador?', ['25 V', '10 V', '12 V justos', 'Da igual'], 'Deja margen para picos y envejecimiento. En cerámicos, además, más tensión nominal pierde menos capacidad.'),
  Q('Los condensadores de tántalo tienen fama de…', ['Fallar en cortocircuito, a veces con llama, si se superan sus límites', 'Ser eternos', 'No tener polaridad', 'Ser enormes'], 'Se usan con bastante margen de tensión y limitando el pico de corriente al encender.')
 ]),
 L('g8', 'Condensadores en serie, en paralelo y su energía', 'cap', ['cap'], [
  I('<b>En paralelo</b> las placas se juntan: es como un condensador con más superficie. Las capacidades <b>se suman</b>: C = C1 + C2. Todos ven la misma tensión, así que manda la menor tensión nominal.'),
  G('capSeries'),
  I('<b>En serie</b> es como separar más las placas: la capacidad baja y se calcula como las resistencias en paralelo: <b>1/C = 1/C1 + 1/C2</b>. Con dos iguales, la mitad.'),
  Nm('Dos de 10 µF en serie. ¿Capacidad total?', 5, 'µF', 'Iguales en serie: la mitad.'),
  Nm('22 µF y 47 µF en serie. ¿Total en µF?', 14.99, 'µF', '(22 × 47) / (22 + 47) ≈ 15 µF.', { tol: 0.2, c: 'parallel' }),
  Q('¿Por qué a veces se ponen dos condensadores en serie?', ['Para aguantar más tensión entre los dos', 'Para tener más capacidad', 'Para que no tengan polaridad nunca', 'No se hace nunca'], 'Se reparten la tensión (mejor con resistencias de equilibrado en paralelo con cada uno).'),
  I('Un condensador cargado guarda energía en el campo eléctrico entre sus placas: <b>E = ½ · C · V²</b>. Ojo con el cuadrado: a doble tensión, cuatro veces más energía.'),
  G('capJ'), G('capJ'),
  Q('Un flash de cámara carga un condensador a unos 300 V. ¿Por qué es peligroso abrirlo?', ['Guarda energía para una descarga dolorosa o peligrosa, incluso apagado', 'No lo es: está apagado', 'Porque la pila es grande', 'Por la luz'], 'Mide y descarga antes de tocar.', { c: 'esafety' }),
  Q('¿Por qué un condensador de 1 F y 2,7 V no sustituye a la batería de un móvil?', ['Guarda muy poca energía: ½ × 1 × 2,7² ≈ 3,6 J', 'Porque es más grande', 'Porque no se puede cargar', 'Sí la sustituye'], 'Una batería de móvil guarda decenas de miles de julios.')
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
 L('g9', 'La bobina a fondo', 'cap', ['inductor'], [
  I('Una bobina es hilo enrollado. Al pasar corriente crea un campo magnético; si la corriente cambia, el campo cambia e <b>induce una tensión</b> que se opone al cambio. Se mide con la <b>inductancia</b> L, en henrios (H); lo normal son µH y mH.\n<b>V = L · ΔI / Δt</b>'),
  Nm('Bobina de 10 mH; la corriente sube 1 A en 1 ms. ¿Tensión inducida?', 10, 'V', '0,01 × 1 / 0,001.'),
  Q('¿Qué aumenta la inductancia de una bobina?', ['Más vueltas y un núcleo de ferrita o hierro', 'Hilo más grueso', 'Menos vueltas', 'Más corriente'], 'L crece con el cuadrado del número de vueltas y con el material del núcleo.'),
  I('Con una resistencia y una pila, la corriente no sube de golpe: crece como la carga de un condensador, con <b>τ = L / R</b>. Tras 5τ ya vale V / R.', { tune: { viz: 'rlCurrent', params: { L: { label: 'L', val: 100, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, R: { label: 'R', val: 100, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' }, V: { val: 5, fixed: true } } } }),
  TU('Consigue τ = 1 ms.', 'rlCurrent', { L: { label: 'L', val: 470, list: [1, 10, 47, 100, 470, 1000], unit: 'mH', dec: 0 }, R: { label: 'R', val: 22, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' }, V: { val: 5, fixed: true } }, { q: 'tauMs', min: 0.9, max: 1.1, text: 'Objetivo: τ = 1 ms', hint: 'τ = L / R: por ejemplo 10 mH con 10 Ω.' }, '10 mH con 10 Ω, 100 mH con 100 Ω o 1 H con 1 kΩ.'),
  G('tauRL'), G('tauRL'),
  I('La bobina guarda energía en su campo magnético: <b>E = ½ · L · I²</b>. Si abres el circuito de golpe, esa energía tiene que salir por algún sitio: la tensión se dispara (cientos de voltios) hasta que salta una chispa. De ahí el diodo de rueda libre.'),
  G('coilJ'),
  I('<b>Saturación</b>: un núcleo de ferrita solo admite cierto campo. Por encima de su corriente de saturación, la inductancia se desploma y la corriente se dispara. Las bobinas de potencia dan dos corrientes: la de <b>saturación</b> y la <b>térmica</b> (la que la calienta un número de grados que indica el fabricante, a menudo 40 °C).'),
  Q('Una bobina de un convertidor pone 22 µH e Isat = 3 A. Por ella pasan picos de 4 A. ¿Qué pasa?', ['Se satura: la inductancia cae y la corriente se dispara', 'Nada', 'Da más inductancia', 'Baja la corriente'], 'Elige siempre Isat por encima del pico.'),
  Q('¿Qué tienen en común la bobina y el condensador?', ['Los dos guardan energía y tienen constante de tiempo', 'Nada', 'Los dos bloquean la continua', 'Los dos tienen polaridad'], 'El condensador se opone a los cambios de tensión; la bobina, a los de corriente.')
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
 L('h7', 'Reactancia inductiva', 'wave', ['inductor'], [
  I('En alterna la corriente cambia todo el tiempo, así que una bobina siempre se está oponiendo. Esa oposición es la <b>reactancia inductiva</b>: <b>XL = 2π · f · L</b>. Al revés que en el condensador: <b>a más frecuencia, más reactancia</b>.'),
  G('xlInd'), G('xlInd'),
  Q('En continua (f = 0), una bobina ideal se comporta como…', ['Un cable', 'Un circuito abierto', 'Un condensador', 'Una pila'], 'XL = 0: solo queda la resistencia del hilo.'),
  Q('Frecuencia ×10: XL…', ['Se multiplica por 10', 'Se divide entre 10', 'No cambia', 'Se multiplica por 100'], 'Proporcional a f.'),
  { t: 'match', q: '¿Qué hace cada uno?', pairs: [['Bobina con frecuencia alta', 'Bloquea'], ['Bobina en continua', 'Deja pasar'], ['Condensador con frecuencia alta', 'Deja pasar '], ['Condensador en continua', 'Bloquea ']] },
  Nm('¿A qué frecuencia tiene una bobina de 1 mH una reactancia de 100 Ω, en kHz?', 15.9, 'kHz', 'f = XL / (2π · L) = 100 / 0,00628 ≈ 15 900 Hz.', { tol: 0.2 }),
  I('Uso real: el <b>choque</b>. Una bobina en serie con la alimentación deja pasar la continua y frena el ruido de alta frecuencia. Los cilindros de ferrita de algunos cables hacen justo eso.'),
  Q('¿Para qué sirve el cilindro de ferrita de algunos cables?', ['Frenar el ruido de alta frecuencia sin afectar a la continua ni a lo lento', 'Dar peso', 'Subir la tensión', 'Proteger de golpes'], 'Es una bobina de una vuelta con núcleo de ferrita.'),
  Q('Una reactancia, ¿convierte energía en calor como una resistencia?', ['No: la bobina guarda la energía y la devuelve en cada ciclo', 'Sí, igual', 'Sí, el doble', 'Solo en continua'], 'Una reactancia ideal no se calienta.')
 ]),
 L('h8', 'Impedancia y fasores sin miedo', 'wave', ['impedance'], [
  I('En alterna, la tensión de una bobina va <b>90° por delante</b> de su corriente, y la de un condensador, <b>90° por detrás</b>. En una resistencia van juntas. Regla para recordarlo: <b>CIVIL</b>: en C, la I va antes que la V; en L, la V antes que la I.'),
  Q('En un condensador en alterna…', ['La corriente va 90° por delante de la tensión', 'La tensión va 90° por delante', 'Van en fase', 'Van a 180°'], 'CIVIL: en C, I antes que V.'),
  I('Por ese desfase, en un RL o un RC en serie las tensiones no se suman como números. Se dibujan como flechas (<b>fasores</b>) a 90° y se combinan como los catetos de un triángulo: <b>Z = √(R² + X²)</b>, con un desfase <b>φ = arctan(X / R)</b>.', { tune: { viz: 'zTriangle', params: { R: { label: 'R', val: 300, min: 0, max: 1000, step: 10, unit: 'Ω', dec: 0 }, X: { label: 'X (+ bobina, − condensador)', val: 400, min: -1000, max: 1000, step: 10, unit: 'Ω', dec: 0 } } } }),
  TU('Con R = 300 Ω fija, consigue una impedancia de 500 Ω.', 'zTriangle', { R: { val: 300, fixed: true }, X: { label: 'X (+ bobina, − condensador)', val: 0, min: -1000, max: 1000, step: 10, unit: 'Ω', dec: 0 } }, { q: 'Z', min: 495, max: 505, text: 'Objetivo: Z = 500 Ω', hint: '√(300² + X²) = 500 → X = ±400 Ω.' }, 'X = 400 Ω (bobina) o −400 Ω (condensador): el famoso triángulo 3-4-5.'),
  G('zSeries'), G('zSeries'),
  Nm('R = 1 kΩ en serie con un condensador; a cierta frecuencia XC = 1 kΩ. ¿Impedancia?', 1414, 'Ω', '√2 × 1000.', { tol: 5 }),
  Q('En ese circuito, con 10 V eficaces en total, ¿qué tensión cae en la resistencia?', ['Unos 7,1 V', '5 V', '10 V', '0 V'], 'I = 10 / 1414; VR = I · 1000 ≈ 7,07 V. En C caen otros 7,07 V: no suman 10 porque están desfasadas.'),
  I('Eso es justo lo que pasa en la frecuencia de corte de un filtro RC: R = XC, la salida es 1/√2 ≈ 0,707 de la entrada (−3 dB) y el desfase es de 45°.'),
  Q('¿Qué desfase hay en la frecuencia de corte de un filtro RC de primer orden?', ['45°', '90°', '0°', '180°'], 'arctan(1) = 45°.', { c: 'filter' }),
  Q('¿Por qué la impedancia de un altavoz “de 8 Ω” cambia con la frecuencia?', ['Su bobina añade una reactancia que crece con la frecuencia', 'Porque se calienta', 'No cambia', 'Por el color del cono'], 'La impedancia nominal es una referencia, no una constante.')
 ]),
 L('h9', 'Resonancia LC y factor Q', 'wave', ['resonance'], [
  I('Junta una bobina y un condensador: XL sube con la frecuencia y XC baja. A una frecuencia son iguales: la <b>frecuencia de resonancia</b>.\n2π·f·L = 1 / (2π·f·C) → <b>f₀ = 1 / (2π · √(L · C))</b>'),
  I('Un LC cargado oscila solo: el condensador se descarga a través de la bobina, la bobina mantiene la corriente y carga el condensador al revés, y vuelta a empezar, como un columpio. La resistencia hace que la oscilación se apague poco a poco.'),
  I('Juega: la curva es la corriente de un RLC en serie según la frecuencia (eje logarítmico). Mueve L y C y mira dónde cae el pico; mueve R y mira lo afilado que es.', { tune: { viz: 'lcResonance', params: { L: { label: 'L', val: 220, list: [10, 22, 47, 100, 220, 470, 1000], unit: 'µH', dec: 0 }, C: { label: 'C (variable)', val: 400, min: 10, max: 1000, step: 5, unit: 'pF', dec: 0 }, R: { label: 'R', val: 47, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' } } } }),
  TU('Sintoniza 1 MHz (onda media) con el condensador variable.', 'lcResonance', { L: { label: 'L', val: 220, list: [10, 22, 47, 100, 220, 470, 1000], unit: 'µH', dec: 0 }, C: { label: 'C (variable)', val: 400, min: 10, max: 1000, step: 5, unit: 'pF', dec: 0 }, R: { label: 'R', val: 47, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' } }, { q: 'f0', min: 950000, max: 1050000, text: 'Objetivo: f₀ = 1 MHz ± 5 %', hint: 'Con 220 µH, unos 115 pF; con 100 µH, unos 250 pF.' }, 'Así se sintoniza una radio: un condensador variable mueve f₀.'),
  G('lcRes'), G('lcRes'),
  I('El <b>factor de calidad Q</b> dice lo afilado del pico. En serie: <b>Q = XL / R</b> en resonancia. Ancho de banda (entre los puntos de −3 dB): <b>BW = f₀ / Q</b>. Q alto = selectivo: separa emisoras cercanas.'),
  TU('Consigue un ancho de banda menor de 20 kHz a 1 MHz.', 'lcResonance', { L: { val: 220, fixed: true }, C: { val: 115, fixed: true }, R: { label: 'R', val: 470, list: [10, 22, 47, 100, 220, 470, 1000], fmt: 'R' } }, { q: 'BW', min: 0, max: 20000, text: 'Objetivo: ancho de banda < 20 kHz', hint: 'Menos R → más Q → pico más estrecho.' }, 'Con 22 Ω o menos, Q pasa de 50.'),
  G('qRes'),
  Q('En resonancia serie, la corriente es…', ['Máxima: solo la limita R', 'Mínima', 'Cero', 'La misma que fuera de resonancia'], 'XL y XC se anulan.'),
  Q('En un LC en paralelo (circuito tanque), en resonancia la impedancia es…', ['Máxima (en el caso ideal, infinita)', 'Mínima', 'Cero', 'Igual a R'], 'Por eso un tanque en la carga de un amplificador solo deja ganancia cerca de f₀.'),
  Q('En resonancia serie con Q = 50 y 1 V de entrada, la tensión en el condensador puede llegar a…', ['Unos 50 V', '1 V', '0,02 V', '0 V'], 'En resonancia, VC ≈ Q · Vent. En circuitos de potencia, esa tensión puede ser peligrosa.', { c: 'esafety' })
 ]),
 L('h10', 'Filtros de segundo orden', 'wave', ['resonance'], [
  I('Un filtro RC cae 20 dB por década (primer orden). Si necesitas separar mejor, encadena dos etapas o usa un <b>RLC</b>: <b>segundo orden</b>, 40 dB por década.'),
  Q('Un paso bajo de segundo orden, una década por encima de su frecuencia de corte, atenúa unos…', ['40 dB (÷100)', '20 dB (÷10)', '3 dB', '80 dB'], 'Doble pendiente.', { c: 'log' }),
  I('Paso bajo RLC: R y L en serie, C a masa, salida en C. Cerca de f₀ el resultado depende de Q:\n· Q bajo (≈ 0,5): caída suave.\n· <b>Q ≈ 0,707</b> (Butterworth): lo más plano posible sin pico.\n· Q alto: un pico de resonancia antes de caer.'),
  Q('¿Qué Q da la respuesta más plana sin pico?', ['Unos 0,707', '10', '0,1', '100'], 'Butterworth.'),
  Q('Dos filtros RC iguales encadenados sin nada entre ellos, ¿son un buen segundo orden?', ['El segundo carga al primero: mejor con un seguidor en medio o un filtro activo', 'Perfecto', 'No filtran nada', 'Suben la señal'], 'Lo resolverás con operacionales.', { c: 'filter' }),
  { t: 'match', q: 'Une cada filtro con lo que deja pasar.', pairs: [['Paso bajo', 'Lo lento'], ['Paso alto', 'Lo rápido'], ['Paso banda', 'Una franja alrededor de f₀'], ['Banda eliminada', 'Todo menos una franja']] },
  I('Un <b>paso banda</b> es un RLC con la salida en la resistencia: solo deja pasar lo cercano a f₀, con un ancho de banda f₀ / Q. Un <b>banda eliminada</b> (notch) quita una sola frecuencia, por ejemplo el zumbido de 50 Hz.'),
  Nm('Paso banda a 10 kHz con Q = 5. ¿Ancho de banda en kHz?', 2, 'kHz', 'BW = f₀ / Q.'),
  Q('Quieres quitar el zumbido de la red de la señal de un micrófono. ¿Qué filtro?', ['Banda eliminada a 50 Hz', 'Paso alto a 10 kHz', 'Paso bajo a 50 Hz', 'Ninguno'], 'Quitas 50 Hz y dejas el resto.'),
  G('qRes')
 ]),
 L('h11', 'Potencia en alterna en dos pinceladas', 'heat', ['impedance'], [
  I('En alterna con una resistencia, P = Vrms · Irms. Pero con bobinas o condensadores la corriente va desfasada y parte de ella solo va y vuelve sin hacer trabajo. La potencia que de verdad se convierte en calor, luz o movimiento es la <b>activa</b>: <b>P = Vrms · Irms · cos φ</b>.'),
  I('Tres potencias:\n· <b>Activa</b> P (W): la útil.\n· <b>Reactiva</b> Q (var): la que va y viene.\n· <b>Aparente</b> S (VA) = Vrms · Irms: la que tienen que aguantar cables y transformadores.\nForman un triángulo: S² = P² + Q².'),
  Q('El factor de potencia (cos φ) de una resistencia pura es…', ['1', '0', '0,5', '−1'], 'Tensión y corriente en fase.'),
  G('pfPower'), G('pfPower'),
  Q('Un SAI dice “1000 VA / 600 W”. ¿Qué significa?', ['Aguanta 1000 VA de aparente pero solo 600 W de activa', 'Da 1600 W', 'Da 1000 W', 'Es lo mismo'], 'Respeta los dos límites.'),
  Nm('Un motor a 230 V consume 5 A con cos φ = 0,8. ¿Potencia aparente en VA?', 1150, 'VA', 'S = V · I = 230 × 5. La activa sería 920 W.'),
  Q('¿Por qué a la compañía eléctrica no le gusta un factor de potencia bajo?', ['Por la red circula más corriente de la necesaria para la misma potencia útil', 'Porque gastas menos', 'Porque sube la tensión', 'Da igual'], 'Más corriente, más pérdidas en los cables.'),
  I('Las fuentes conmutadas baratas consumen a picos (no senoidal) y tienen mal factor de potencia; las buenas llevan <b>PFC</b>. Todo esto se mide con un medidor de potencia de enchufe: la red no se toca.', { c: 'esafety' }),
  Q('Si multiplicas la tensión eficaz por la corriente eficaz de un aparato, ¿obtienes sus vatios reales?', ['No: obtienes VA; faltan el desfase y la forma de onda', 'Sí, siempre', 'Solo en continua', 'Solo en motores'], 'Para vatios reales hace falta un medidor de potencia.')
 ]),
 L('h6', 'Transformadores', 'bolt', ['ac'], [
  I('Dos bobinas sobre un núcleo. La relación de tensiones es la de vueltas: <b>Vs / Vp = Ns / Np</b>. Solo funciona con alterna.'),
  Nm('1000 vueltas en el primario, 50 en el secundario, 230 V. ¿Secundario?', 11.5, 'V', '230 × 50 / 1000.'),
  Q('¿Por qué no funciona con una pila?', ['Necesita una corriente que cambie para inducir tensión', 'La pila es pequeña', 'Sí funciona', 'Por la polaridad'], 'Inducción = cambio.'),
  Q('¿Qué ventaja de seguridad da?', ['Aislamiento galvánico entre la red y tu circuito', 'No se calienta', 'No pesa', 'Ninguna'], 'No hay conexión directa entre bobinas.')
 ]),
 PRJ('p16', 'Proyecto: filtro para altavoces de dos vías', 'crossover')
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
 L('i8', 'La curva del diodo y sus modelos', 'led', ['diode'], [
  I('Un diodo real no “se enciende” de golpe a 0,7 V. Su corriente crece de forma <b>exponencial</b> con la tensión: se multiplica por 10 cada 60 a 120 mV más, según el diodo. Por eso la curva parece un codo.'),
  Q('Un diodo conduce 1 mA a 0,60 V y su corriente se multiplica por 10 cada 60 mV. ¿Cuánto conduce a 0,72 V?', ['100 mA', '2 mA', '10 mA', '1 A'], 'Dos saltos de 60 mV: ×100.', { c: 'log' }),
  I('Modelos, de más simple a más fino:\n1. <b>Ideal</b>: un interruptor (0 V al conducir).\n2. <b>Caída fija</b>: 0,7 V al conducir. El que usarás casi siempre.\n3. <b>Caída + resistencia</b>: unos 0,65 V más una pequeña resistencia interna.\n4. <b>Exponencial</b> (ecuación de Shockley): el de los simuladores.'),
  Q('Calculas la corriente de un LED con 9 V y 470 Ω. ¿Qué modelo basta?', ['Caída fija (unos 2 V)', 'El exponencial completo', 'El ideal (0 V)', 'Ninguno'], 'La resistencia manda; el valor exacto de la caída importa poco.', { c: 'led' }),
  Q('¿Y con una pila de 1,5 V y un diodo de silicio con 10 Ω?', ['Ahí la caída fija se queda corta: el diodo se come casi toda la pila', 'Basta el ideal', 'Cualquiera', 'No conduce nunca'], 'Cuando la tensión disponible se parece a la caída, la curva real importa.'),
  I('La temperatura también cuenta: la caída de un diodo de silicio <b>baja unos 2 mV por cada °C</b> que sube. Es tan predecible que se usa como termómetro: muchos chips miden su temperatura así.'),
  Nm('Un diodo cae 0,65 V a 25 °C. ¿Cuánto a 75 °C (−2 mV/°C)?', 0.55, 'V', '50 °C × 2 mV = 100 mV menos.'),
  I('En inversa no es perfecto: deja pasar una <b>corriente de fuga</b> pequeña (nA en silicio, µA en Schottky) que se duplica más o menos cada 10 °C.'),
  Q('Un diodo en inversa a 125 °C comparado con 25 °C, ¿cuánta más fuga tiene, más o menos?', ['Unas 1000 veces más', 'El doble', 'La misma', 'La mitad'], '100 °C son 10 duplicaciones: 2¹⁰ ≈ 1000.'),
  Nm('Modelo de caída fija: dos diodos de silicio en serie (0,7 V cada uno) y 100 Ω con una pila de 5 V. ¿Corriente en mA?', 36, 'mA', '(5 − 1,4) / 100 = 0,036 A.', { tol: 0.5 })
 ]),
 L('i9', 'Schottky, diodos rápidos y TVS', 'led', ['diode'], [
  I('Un diodo de silicio normal (1N4007) tarda en dejar de conducir: al invertir la tensión, durante el tiempo de <b>recuperación inversa</b> (microsegundos en los lentos) conduce al revés. A 50 Hz no importa; a 100 kHz es un desastre de calor y ruido.'),
  { t: 'match', q: 'Une cada diodo con su uso típico.', pairs: [['1N4007', 'Rectificar a 50 Hz'], ['1N4148', 'Señales pequeñas y rápidas'], ['1N5819 (Schottky)', 'Fuentes conmutadas y polaridad'], ['UF4007', 'Recuperación rápida a alta tensión']] },
  I('Un <b>Schottky</b> es una unión metal–semiconductor: cae solo 0,2–0,45 V y apenas tiene recuperación inversa. A cambio, tiene más fuga en inversa y suele aguantar menos tensión.'),
  Q('Proteges la polaridad de un circuito de 3,3 V con un diodo en serie. ¿Cuál pierde menos?', ['Un Schottky (≈ 0,3 V)', 'Un 1N4007 (≈ 0,8 V)', 'Un zener', 'Un LED'], 'Con 3,3 V cada décima cuenta.'),
  Nm('Un Schottky con 0,4 V conduce 2 A. ¿Potencia disipada?', 0.8, 'W', 'P = V · I.', { c: 'power' }),
  Nm('Un 1N4007 con 1 V en las mismas condiciones. ¿Potencia?', 2, 'W', 'Más del doble de calor.', { c: 'power' }),
  Q('¿Por qué no usar siempre Schottky?', ['Más fuga en inversa, sobre todo en caliente, y menos tensión inversa', 'Son más lentos', 'Caen más tensión', 'No existen grandes'], 'En circuitos de muy bajo consumo, la fuga puede gastar más que el propio circuito.'),
  I('Diodo <b>TVS</b>: un zener robusto que absorbe picos de energía (descargas electrostáticas, picos en cables largos) en nanosegundos. Se pone en paralelo con lo que protege.'),
  Q('Las líneas de datos de un conector USB necesitan protección contra descargas electrostáticas. ¿Qué pones?', ['Diodos TVS (o una matriz de TVS) a masa', 'Un 1N4007 en serie', 'Un LED', 'Un fusible'], 'Recortan el pico antes de que llegue al chip.')
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
 L('i10', 'Recortadores, fijadores y multiplicadores', 'led', ['diode'], [
  I('Diodos y condensadores hacen trucos con señales alternas:\n· <b>Recortador</b>: corta la señal por encima o por debajo de un nivel.\n· <b>Fijador</b>: desplaza toda la señal hacia arriba o hacia abajo.\n· <b>Multiplicador</b>: suma picos para obtener más tensión continua.'),
  I('Recortador: una resistencia en serie y dos diodos en antiparalelo a masa. La salida no pasa de unos ±0,7 V. Protege entradas sensibles: si llega un pico, se lo comen los diodos.'),
  Q('Dos diodos de silicio en antiparalelo a masa, resistencia en serie y una senoide de 5 V de pico. ¿Salida?', ['Una senoide recortada a unos ±0,7 V', '±5 V', '0 V', '±10 V'], 'Cada diodo conduce en una mitad.'),
  Q('¿Y con dos zener de 3,3 V en serie, enfrentados, en lugar de los diodos?', ['Recorta a unos ±4 V (3,3 + 0,7)', '±0,7 V', '±3,3 V exactos', 'No recorta'], 'En cada mitad, un zener trabaja en inversa y el otro en directa.'),
  I('Fijador: un condensador en serie y un diodo a masa. El condensador se carga con el pico negativo y desplaza la señal hacia arriba: una senoide de ±5 V pasa a ir de unos −0,7 a +9,3 V.'),
  Q('¿Para qué sirve desplazar una señal así?', ['Para que una señal alterna quepa en una entrada que solo admite tensiones positivas', 'Para amplificarla', 'Para filtrarla', 'Para medir corriente'], 'Y es la mitad de un doblador.'),
  I('<b>Doblador de tensión</b>: un fijador seguido de un rectificador de pico. En vacío da casi <b>2 · Vp</b> menos las caídas de los diodos. Encadenando etapas (Cockcroft–Walton) se consigue ×3, ×4…, a cambio de muy poca corriente.'),
  Nm('Doblador con una entrada de 10 V de pico y diodos de 0,7 V. ¿Salida en vacío aproximada?', 18.6, 'V', '2 × 10 − 2 × 0,7.', { tol: 0.3 }),
  Q('¿Por qué los multiplicadores dan poca corriente?', ['La carga pasa de condensador en condensador una vez por ciclo; con consumo, la tensión cae mucho', 'Porque los diodos son pequeños', 'Porque es continua', 'Dan mucha corriente'], 'Se usan para tensiones altas con corrientes ínfimas.'),
  Q('¿Cómo practicas un doblador con seguridad?', ['Con baja tensión: por ejemplo, la salida cuadrada de un 555 a 9 V', 'Conectándolo a la red', 'Con un transformador de microondas', 'No se puede practicar'], 'Con un 555 a 9 V y el primer diodo unido al + (bomba de carga), obtendrás unos 15 V. La red queda fuera de este curso.', { c: 'esafety' })
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
 SIM('s8', 'Reto: regulador zener', 'Consigue entre 4,8 y 5,4 V estables con un zener y 2–40 mA por él.', { battery: 9, parts: ['res', 'zener'], sch: 'zenerReg', hint: 'Resistencia del + al cátodo (franja); ánodo al −.' }, 'zener'),
 SIM('sg1', 'Reto: protección contra polaridad invertida', 'Enciende un LED (5–25 mA) con un diodo en serie que proteja el circuito si alguien conecta la pila al revés. El ánodo del diodo, directo al + de la pila.', { battery: 9, parts: ['diode', 'res', 'led'], hint: '+ → ánodo del diodo; cátodo → 470 Ω → ánodo del LED; cátodo del LED → −. Al calcular la resistencia, resta también los 0,65 V del diodo.' }, 'polarityGuard')
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
 L('j12', 'Polarizar un amplificador con números', 'amp', ['bjt'], [
  I('Para amplificar, el transistor debe estar en zona activa y la señal tiene que poder subir y bajar sin recortarse. Eso se consigue <b>polarizando</b>: fijando una corriente de reposo con un divisor en la base y una resistencia de emisor. Así casi no depende de β.'),
  I('Receta para emisor común a 12 V:\n1. Elige Ic (por ejemplo, 1 mA).\n2. Emisor a ~1/10 de la alimentación: VE ≈ 1,2 V → <b>Re = VE / Ic</b>.\n3. Colector hacia la mitad del margen: VC ≈ 7 V → <b>Rc = (12 − VC) / Ic</b>.\n4. Base a VE + 0,65 V con un divisor que lleve unas 10 veces Ib.'),
  Nm('Con Ic = 1 mA y VE = 1,2 V, ¿Re?', 1200, 'Ω', '1,2 / 0,001 → 1,2 kΩ.'),
  Nm('Con VC = 7 V, alimentación de 12 V y 1 mA, ¿Rc?', 5000, 'Ω', '(12 − 7) / 0,001 → 4,7 o 5,1 kΩ comerciales.', { c: 'ohm' }),
  Nm('¿Qué tensión debe tener la base?', 1.85, 'V', '1,2 + 0,65.', { tol: 0.06 }),
  I('El divisor de base: con β ≈ 100, Ib ≈ 10 µA. Haz que por el divisor pasen unos 100 µA para que Ib no lo desequilibre: R1 + R2 ≈ 12 V / 100 µA = 120 kΩ, repartidos para dar 1,85 V: unos <b>100 kΩ arriba y 18 kΩ abajo</b>.', { c: 'divider' }),
  Q('¿Por qué la resistencia de emisor estabiliza el punto de trabajo?', ['Si Ic sube, sube VE, baja Vbe y el transistor se frena solo', 'Porque disipa calor', 'Porque sube la β', 'No estabiliza'], 'Es una realimentación negativa local.'),
  Nm('Ganancia aproximada sin condensador en el emisor (Rc / Re), con Rc = 4,7 kΩ y Re = 1,2 kΩ', 3.9, '', '4,7 / 1,2 ≈ 3,9 (invertida).', { tol: 0.1 }),
  I('Para más ganancia se pone un condensador en paralelo con Re: en alterna la anula y la ganancia sube hasta <b>Rc / re</b>, con re ≈ 25 mV / Ic (unos 25 Ω a 1 mA). A cambio, depende más del transistor y de la temperatura. Término medio: partir Re en dos y desacoplar solo una parte.'),
  Nm('Con Re desacoplada del todo, Ic = 1 mA y Rc = 4,7 kΩ, ¿ganancia aproximada?', 188, '', '4700 / 25 ≈ 188.', { tol: 10 }),
  Q('Con Vce en reposo de 0,3 V, ¿qué le pasa a la señal amplificada?', ['Se recorta: el transistor está casi saturado', 'Sale perfecta', 'Se amplifica más', 'Se invierte dos veces'], 'Por eso se polariza a mitad de camino.')
 ]),
 L('j6', 'MOSFET', 'npn', ['bjt'], [
  I('Un MOSFET N se controla con <b>tensión</b>: la puerta casi no consume. Entre drenador y fuente conduce con resistencia muy baja, <b>Rds(on)</b>. Ideal para cargas de amperios.', { symk: 'nmos' }),
  { t: 'match', q: 'Une cada pata con su equivalente bipolar.', pairs: [['Puerta (G)', 'Base'], ['Drenador (D)', 'Colector'], ['Fuente (S)', 'Emisor']] },
  Nm('Rds(on) = 0,05 Ω y 4 A. ¿Potencia disipada?', 0.8, 'W', 'I²·R.', { c: 'power' }),
  Q('“De nivel lógico” significa…', ['Que conduce bien con 5 V o 3,3 V en la puerta', 'Que es digital', 'Que tiene memoria', 'Que solo sirve para lógica'], 'Los normales piden 10 V.'),
  Q('¿Por qué 100 kΩ entre puerta y fuente?', ['Para que no flote y se encienda solo', 'Para amplificar', 'Para limitar la corriente', 'No se pone'], 'Una puerta al aire puede cargarse.', { c: 'pullup' })
 ]),
 L('j8', 'MOSFET a fondo', 'npn', ['mosfet'], [
  I('En un MOSFET de canal N, la puerta está aislada por una capa finísima de óxido: no entra corriente continua. Con suficiente Vgs se forma un canal entre drenador y fuente que conduce como una resistencia pequeña: <b>Rds(on)</b>.'),
  I('Tres datos de su hoja que debes mirar:\n· <b>Vgs(th)</b>: tensión a la que <b>empieza</b> a conducir (por ejemplo, 250 µA). No es la de encendido.\n· <b>Rds(on)</b> y a qué Vgs está garantizada (10 V, 4,5 V, 2,5 V…).\n· <b>Vds</b> e <b>Id</b> máximas.'),
  Q('Vgs(th) = 1–2,5 V y Rds(on) = 0,05 Ω garantizada a 10 V. Lo mueves con 3,3 V. ¿Qué esperas?', ['Que conduzca mal y se caliente: no hay Rds(on) garantizada a 3,3 V', 'Que conduzca perfecto', 'Que no conduzca nada', 'Que se queme la puerta'], 'Busca uno de nivel lógico, con Rds(on) especificada a 2,5 V o menos.'),
  { t: 'match', q: 'Une cada MOSFET con el caso para el que sirve.', pairs: [['IRLZ44N (Rds(on) a 4–5 V)', 'Arduino de 5 V'], ['AO3400 (Rds(on) a 2,5 V)', 'ESP32 de 3,3 V'], ['IRF540N (Rds(on) a 10 V)', 'Necesita un driver de 10–12 V'], ['2N7000 (unos 200 mA)', 'Cargas pequeñas']] },
  I('Conduciendo, el MOSFET es una resistencia: <b>P = I² · Rds(on)</b>. Y Rds(on) sube con la temperatura (puede ser un 50 % más a 100 °C), así que calcula con margen.'),
  Nm('Rds(on) = 0,02 Ω y 5 A. ¿Potencia?', 0.5, 'W', '25 × 0,02.', { c: 'power' }),
  Nm('Un BJT con Vce(sat) = 0,3 V y los mismos 5 A, ¿qué potencia disipa?', 1.5, 'W', 'P = Vce · I. Con corrientes grandes, el MOSFET gana.', { c: 'power' }),
  I('Todo MOSFET de potencia lleva dentro un <b>diodo de cuerpo</b> de la fuente al drenador. Conduce si el drenador baja por debajo de la fuente. Es útil en los puentes H y molesto si no lo tienes en cuenta.'),
  Q('Pones un MOSFET N con drenador y fuente cambiados para cortar una carga. ¿Qué pasa?', ['El diodo de cuerpo conduce y la carga queda siempre alimentada', 'Funciona igual', 'No conduce nunca', 'Se convierte en uno de canal P'], 'El diodo interno hace de puente.', { c: 'diode' }),
  Q('¿Por qué la puerta de un MOSFET es delicada?', ['El óxido es finísimo: pasarse de unos ±20 V entre puerta y fuente, o una descarga electrostática, lo perfora', 'Porque consume mucho', 'Porque es de cobre', 'No lo es'], 'Mira Vgs máxima en la hoja de datos y manipúlalo con cuidado.')
 ]),
 L('j9', 'Carga de puerta, drivers y lado alto', 'npn', ['mosfet'], [
  I('La puerta es un condensador (de cientos de pF a varios nF). Para encender hay que meterle una carga Qg (en nC) y para apagar, sacarla. Mientras tanto, el MOSFET está a medio conducir y disipa mucho: son las <b>pérdidas de conmutación</b>.'),
  G('gateQ'), G('gateQ'),
  I('A pocos cientos de Hz (un LED, un motor), basta un pin con 100–220 Ω en serie. A decenas de kHz hace falta un <b>driver de puerta</b>: un chip que da amperios de pico durante nanosegundos (TC4427, UCC27517…).'),
  Q('¿Para qué sirve la resistencia de 100 Ω entre el pin y la puerta?', ['Limita el pico de corriente al cargar la puerta y amortigua oscilaciones', 'Sube la tensión', 'Hace de pull-down', 'No sirve'], 'Y la de 100 kΩ entre puerta y fuente la mantiene apagada si el pin flota.'),
  I('<b>Lado bajo</b>: MOSFET N entre la carga y masa. La fuente está en masa: basta poner la puerta a unos voltios. Es lo fácil.\n<b>Lado alto</b>: el interruptor va entre el + y la carga. Con un N, la fuente sube con la carga y la puerta tendría que estar por encima de la alimentación.'),
  Q('Un MOSFET N en lado alto con 12 V. ¿Qué tensión de puerta necesita para conducir bien?', ['Unos 10 V por encima de la fuente: unos 22 V', '12 V', '5 V', '0 V'], 'Por eso existen las bombas de carga y los drivers de lado alto con condensador de arranque (bootstrap).'),
  I('Solución sencilla para el lado alto: un <b>MOSFET P</b>. Su fuente va al +, y conduce cuando la puerta está <b>por debajo</b> de la fuente (Vgs negativa). Puerta al +: apagado. Puerta hacia masa: encendido (sin pasar de su Vgs máxima).'),
  Q('MOSFET P con la fuente a 12 V. ¿Cómo lo enciendes?', ['Llevando la puerta hacia 0 V (Vgs ≈ −12 V, dentro de su máximo)', 'Puerta a 12 V', 'Puerta a 24 V', 'Dejando la puerta al aire'], 'Desde un microcontrolador: un NPN o un N pequeño tira de la puerta a masa y una resistencia la devuelve al +.'),
  Q('¿Por qué no se mueve la puerta de ese P directamente con un pin de 3,3 V?', ['El pin no puede subir la puerta a 12 V: el P nunca se apagaría', 'Porque consume mucho', 'Sí se puede', 'Porque es lento'], 'Puerta a 3,3 V con la fuente a 12 V es Vgs = −8,7 V: siempre encendido.'),
  Q('Protección contra polaridad invertida con un MOSFET P frente a un diodo:', ['El MOSFET apenas cae (I · Rds(on)) en vez de 0,7 V', 'El diodo es siempre mejor', 'Son iguales', 'El MOSFET no sirve para eso'], 'Un truco muy usado en aparatos con pilas.', { c: 'diode' })
 ]),
 L('j10', 'Disipadores y resistencia térmica', 'heat', ['thermal'], [
  I('Todo semiconductor que disipa potencia se calienta. El límite lo pone la <b>temperatura de la unión</b> (Tj), normalmente de 125 a 150 °C como máximo. Se calcula con una ley de Ohm térmica: <b>ΔT = P · Rθ</b>.'),
  I('La resistencia térmica (°C/W) dice cuántos grados sube por cada vatio:\n· <b>RθJA</b>: de la unión al aire, sin disipador.\n· <b>RθJC</b>: de la unión a la cápsula.\n· <b>RθCS</b>: de la cápsula al disipador (pasta o lámina).\n· <b>RθSA</b>: del disipador al aire.\nEn serie, se suman.'),
  Nm('TO-220 sin disipador, RθJA = 50 °C/W, 1,5 W y 25 °C de ambiente. ¿Tj?', 100, '°C', '25 + 1,5 × 50.'),
  G('tjHeat'), G('tjHeat'),
  I('Para elegir disipador: <b>RθSA ≤ (Tj objetivo − Ta) / P − RθJC − RθCS</b>. Diseña con margen: apunta a una Tj de unos 100 °C, no al máximo.'),
  Nm('Quieres Tj ≤ 100 °C con 5 W, Ta = 30 °C, RθJC = 2 °C/W y pasta de 0,5 °C/W. ¿RθSA máxima del disipador?', 11.5, '°C/W', '(100 − 30) / 5 = 14; 14 − 2 − 0,5 = 11,5.'),
  Q('La pestaña de un TO-220 suele estar unida a una pata (en el LM317, a la salida). Si atornillas dos a un mismo disipador…', ['Necesitas láminas y arandelas aislantes, o las cortocircuitas', 'No pasa nada', 'Mejor: comparten el calor', 'Basta con pintarlo'], 'La lámina añade algo de resistencia térmica, pero es obligatoria.'),
  Q('¿Qué hace la pasta térmica?', ['Rellena las rugosidades entre cápsula y disipador, que si no serían aire', 'Pega las piezas', 'Siempre aísla eléctricamente', 'Enfría por sí sola'], 'Una capa fina; más no es mejor.'),
  I('En placas SMD, el disipador es el <b>cobre</b> de la placa: encapsulados como DPAK o QFN con pad térmico echan el calor a una zona de cobre con vías a otras capas. La hoja de datos da RθJA para un área de cobre concreta.'),
  Q('Un regulador SMD se calienta demasiado. ¿Qué cambio en la PCB ayuda?', ['Más área de cobre bajo su pad, con vías térmicas a otras capas', 'Pistas más finas', 'Quitar el plano de masa', 'Poner serigrafía encima'], 'El cobre reparte el calor.')
 ]),
 L('j11', 'Fuentes y espejos de corriente', 'npn', ['bjt'], [
  I('Una fuente de corriente da la misma corriente sea cual sea la carga (dentro de un margen). Sirve para LEDs, para cargar condensadores en rampa o para polarizar amplificadores.'),
  I('Con un NPN: fija la base con un zener (o dos diodos) y pon una resistencia en el emisor. El emisor queda a Vz − 0,65 V, así que <b>Ie = (Vz − 0,65) / Re</b>. Como Ic ≈ Ie, la carga del colector recibe esa corriente aunque cambie.'),
  G('isrc'), G('isrc'),
  Q('En esa fuente, si cambias el LED del colector por dos en serie, la corriente…', ['Casi no cambia, mientras el transistor no se sature', 'Se reduce a la mitad', 'Se duplica', 'Se corta'], 'El transistor absorbe la diferencia de tensión.'),
  Q('¿Qué limita hasta dónde funciona?', ['La tensión disponible: si la carga pide más de la que queda, el transistor se satura', 'El color del LED', 'La β', 'Nada'], 'Es su margen de trabajo (compliance).'),
  I('<b>Espejo de corriente</b>: dos transistores iguales con las bases unidas, el primero conectado como diodo (colector unido a su base). La corriente que fijas en el primero se copia en el colector del segundo. Funciona bien si están a la misma temperatura: dentro de un chip son casi idénticos.'),
  Q('¿Dónde aparecen los espejos de corriente?', ['Dentro de casi todos los operacionales y chips analógicos', 'Solo en radios antiguas', 'En los relés', 'En ninguna parte'], 'Son una pieza básica del diseño de chips.'),
  I('Atajo práctico: el <b>LM317</b> con una resistencia entre OUT y ADJ es una fuente de corriente: <b>I = 1,25 V / R</b>. Ideal para LEDs de potencia.'),
  Nm('¿Qué resistencia pones en un LM317 para 350 mA (LED de 1 W)?', 3.57, 'Ω', '1,25 / 0,35 ≈ 3,6 Ω (usa 3,6 o 3,3 Ω y mide).', { tol: 0.1 }),
  Nm('¿Qué potencia disipa esa resistencia, en W?', 0.44, 'W', '1,25 V × 0,35 A: de ½ W como mínimo; mejor 1 W.', { tol: 0.02, c: 'power' })
 ]),
 L('j7', 'Cargas inductivas y puente H', 'npn', ['bjt'], [
  I('Motores, relés y solenoides son bobinas: llevan siempre un <b>diodo de rueda libre</b>. Para girar un motor en ambos sentidos se usa un <b>puente H</b>: cuatro interruptores que invierten la polaridad.'),
  Q('¿Cómo va el diodo de rueda libre?', ['En paralelo con la bobina, cátodo al +', 'En serie', 'En paralelo, ánodo al +', 'No hace falta'], 'Solo actúa con el pico.', { c: 'diode' }),
  Q('En un puente H, ¿qué pasa si cierras los dos interruptores del mismo lado?', ['Cortocircuito de la alimentación', 'Gira más rápido', 'Frena', 'Nada'], 'Chips como el DRV8833 lo impiden.')
 ]),
 SIM('s4', 'Reto: transistor interruptor', 'Usa un NPN para que el pulsador encienda el LED (5–25 mA) con menos de 2 mA de base.', { battery: 9, parts: ['push', 'res', 'npn', 'led'], sch: 'npnSwitch', hint: 'LED y resistencia del + al colector; emisor al −; pulsador → 10 kΩ → base.' }, 'npnSwitch'),
 SIM('sg2', 'Reto: regulador con transistor', 'Un zener fija la base de un NPN y el emisor alimenta un LED (seguidor de emisor): el transistor da la corriente y el zener solo pone la referencia. LED entre 5 y 25 mA y transistor sin saturar.', { battery: 9, parts: ['res', 'zener', 'npn', 'led'], hint: '+ → 1 kΩ → base, y en ese mismo punto el cátodo del zener (ánodo al −). Colector al +. Emisor → 150 Ω → LED → −. El emisor quedará a unos 4,4 V.' }, 'emitterFollower'),
 SIM('sg3', 'Reto: motor con diodo de rueda libre', 'El pulsador arranca el motor (más de 200 mA) a través de un NPN, con menos de 20 mA de base y un diodo de rueda libre en paralelo con el motor.', { battery: 9, parts: ['push', 'res', 'npn', 'motor', 'diode'], hint: 'Motor del + al colector; emisor al −. Diodo en paralelo con el motor, cátodo hacia el +. Pulsador → 1 kΩ → base. El motor pide unos 300 mA: con β = 150 necesitas más de 2 mA de base.' }, 'motorFlyback'),
 PRJ('p4', 'Proyecto: detector de oscuridad', 'dark'),
 PRJ('p10', 'Proyecto: multivibrador con dos transistores', 'multivib')
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
 L('k15', 'Trucos del 555', 'ic', ['ic555'], [
  I('En el astable clásico, el condensador se carga por R1 + R2 y se descarga solo por R2, así que el tiempo en alto (0,693 · (R1 + R2) · C) siempre es mayor que el tiempo en bajo (0,693 · R2 · C): ciclo de trabajo por encima del 50 %.'),
  Nm('R1 = 10 kΩ y R2 = 47 kΩ. ¿Ciclo de trabajo en %?', 54.8, '%', '(R1 + R2) / (R1 + 2·R2) = 57 / 104.', { tol: 0.5 }),
  I('Truco del diodo: pon un diodo en paralelo con R2, ánodo hacia la pata 7 y cátodo hacia la 6. Al cargar, la corriente pasa por R1 y el diodo, saltándose R2; al descargar, el diodo queda en inversa y solo actúa R2.\nAlto ≈ 0,693 · R1 · C; bajo ≈ 0,693 · R2 · C: <b>ciclo por debajo del 50 %</b> si R1 < R2.', { c: 'diode' }),
  Nm('Con el diodo, R1 = 10 kΩ, R2 = 47 kΩ y C = 47 µF, ¿tiempo en alto aproximado, en s?', 0.33, 's', '0,693 × 10 000 × 0,000047 ≈ 0,33 s (algo más por la caída del diodo).', { tol: 0.04 }),
  Q('¿Y el tiempo en bajo?', ['Unos 1,5 s', 'Unos 0,33 s', 'Unos 3 s', 'Unos 0,1 s'], '0,693 × 47 kΩ × 47 µF ≈ 1,53 s.'),
  I('<b>PWM con un 555</b>: sustituye R1 y R2 por un potenciómetro con dos diodos, uno para la carga y otro para la descarga. Al girarlo, lo que quitas de un lado lo pones en el otro: la frecuencia apenas cambia y el ciclo va de cerca de 0 a cerca del 100 %. Con un MOSFET a la salida, regula un motor o una tira de LEDs.'),
  Q('¿Por qué la frecuencia casi no cambia en ese PWM?', ['La suma de resistencias de carga y descarga es siempre el potenciómetro entero', 'Porque el condensador cambia', 'Porque el diodo lo compensa todo', 'Sí cambia mucho'], 'Solo cambia el reparto.'),
  I('<b>Pata 5 (control)</b>: fija los umbrales en 2/3 y 1/3 de VCC. Si le aplicas una tensión, los mueves y cambias la frecuencia: un oscilador controlado por tensión sencillo, base de sirenas y efectos de sonido.'),
  Q('Si no usas la pata 5, ¿qué se recomienda?', ['Un condensador de 10 nF a masa para filtrar ruido', 'Dejarla al aire siempre', 'Unirla a VCC', 'Unirla a la salida'], 'Estabiliza los umbrales.'),
  Q('Un NE555 consume unos mA y mete picos en la alimentación al conmutar. ¿Alternativa para circuitos con pilas?', ['La versión CMOS (TLC555, ICM7555)', 'Un 7805', 'Dos 555', 'Ninguna'], 'Consume mucho menos (de decenas a cientos de µA) y funciona desde unos 2 V.')
 ]),
 L('k6', 'Amplificadores operacionales', 'amp', ['opamp'], [
  I('Un <b>operacional</b> (LM358…) amplifica muchísimo la diferencia entre + y −. Con realimentación negativa: las entradas no consumen y la salida iguala las dos entradas.\nNo inversor: <b>G = 1 + Rf / Rg</b>.', { tune: { viz: 'opamp', params: { Vin: { label: 'Entrada', val: 0.5, min: 0, max: 2, step: 0.05, unit: 'V', dec: 2 }, Rf: pR('Rf', 10000, 1000, 100000), Rg: pR('Rg', 10000, 1000, 100000) } } }),
  TU('Consigue una ganancia de 11.', 'opamp', { Vin: { label: 'Entrada', val: 0.5, min: 0, max: 2, step: 0.05, unit: 'V', dec: 2 }, Rf: pR('Rf', 10000, 1000, 100000), Rg: pR('Rg', 10000, 1000, 100000) }, { q: 'G', min: 10.9, max: 11.1, text: 'Objetivo: ganancia 11', hint: 'Rf = 10 × Rg.' }, '1 + 10k/1k.'),
  G('gainNI'), G('gainInv'),
  Q('Un seguidor de tensión tiene ganancia…', ['1', '0', 'Infinita', '−1'], 'Refuerza sin cargar.'),
  Q('La salida de un LM358 a 9 V no pasa de…', ['Algo menos de 9 V', '18 V', 'Infinito', '5 V'], 'Satura.')
 ]),
 L('k10', 'El operacional real', 'amp', ['opamp'], [
  I('Las reglas de oro suponen un operacional ideal. Los reales tienen límites que su hoja de datos detalla:\n· <b>Tensión de offset</b>.\n· <b>Producto ganancia–ancho de banda</b> (GBW).\n· <b>Slew rate</b> (SR).\n· <b>Márgenes de entrada y salida</b> (rail-to-rail o no).'),
  I('<b>Offset</b>: aunque las dos entradas estén igual, se comporta como si hubiera unos milivoltios de diferencia (un LM358, hasta unos 7 mV). La ganancia lo amplifica: con G = 100, 5 mV de offset son 0,5 V de error a la salida.'),
  Nm('Offset de 2 mV y ganancia 1000. ¿Error en la salida, en V?', 2, 'V', '0,002 × 1000.'),
  I('<b>GBW</b>: la ganancia disponible baja con la frecuencia, y ganancia × ancho de banda ≈ constante. Un LM358 tiene alrededor de 1 MHz (según fabricante, de 0,7 a 1,1 MHz): con ganancia 100 solo llega a unos 10 kHz.'),
  G('gbwBand'), G('gbwBand'),
  I('<b>Slew rate</b>: la máxima velocidad a la que puede cambiar la salida, en V/µs. LM358: unos 0,3–0,6 V/µs; TL072: unos 13 V/µs. Si la señal pide más, se deforma en triángulos.'),
  Q('Una senoide grande de 20 kHz sale triangular de un LM358. ¿Causa más probable?', ['Slew rate insuficiente', 'Offset', 'Falta de alimentación negativa', 'Exceso de GBW'], 'La pendiente de la senoide supera la que puede dar.'),
  I('<b>Rail-to-rail</b>: un LM358 a 5 V solo saca de unos 0 a 3,5 V, y sus entradas funcionan desde masa hasta unos 3,5 V. Un rail-to-rail (MCP6002, TLV2372…) llega casi a 0 y a 5 V en entradas y salida. Con alimentación única y baja tensión, se nota mucho.'),
  Q('Alimentas un LM358 a 5 V y necesitas que su salida llegue a 4,8 V para un ADC. ¿Qué pasa?', ['No llega: se queda en unos 3,5 V; usa un rail-to-rail', 'Llega sin problema', 'Llega a 10 V', 'Se quema'], 'Mira la tensión máxima de salida (VOH) en la hoja de datos.'),
  { t: 'match', q: 'Une cada síntoma con el límite que lo causa.', pairs: [['Salida a 0,3 V con entrada a 0 V y G = 100', 'Offset'], ['Ganancia que cae a 50 kHz', 'GBW'], ['Senoide grande convertida en triángulo', 'Slew rate'], ['Salida que no pasa de 3,5 V a 5 V', 'No es rail-to-rail']] }
 ]),
 L('k11', 'Sumador y restador', 'amp', ['opamp'], [
  I('<b>Sumador inversor</b>: varias entradas, cada una con su resistencia, llegan a la entrada −; la + va a masa. Como la − se queda a 0 V (masa virtual), cada entrada aporta Vi / Ri y la salida es <b>Vsal = −Rf · (V1/R1 + V2/R2 + …)</b>.'),
  Nm('Sumador con Rf = R1 = R2 = 10 kΩ, V1 = 1 V y V2 = 2 V. ¿Vsal?', -3, 'V', '−(1 + 2). Así funcionan las mesas de mezclas.'),
  Nm('Con Rf = 10 kΩ, R1 = 10 kΩ y R2 = 5 kΩ, y V1 = V2 = 1 V, ¿Vsal?', -3, 'V', '−10k · (1/10k + 1/5k) = −(1 + 2).'),
  I('<b>Restador</b> (amplificador diferencial): cuatro resistencias. Con R1 = R3 y R2 = R4: <b>Vsal = (R2 / R1) · (V2 − V1)</b>. Amplifica la diferencia y rechaza lo que es común a las dos entradas.'),
  Nm('Restador con R2/R1 = 10, V2 = 2,05 V y V1 = 2,00 V. ¿Vsal?', 0.5, 'V', '10 × 0,05.'),
  Q('¿Para qué sirve un restador detrás de un puente de Wheatstone?', ['Para amplificar la pequeña diferencia entre sus salidas e ignorar la tensión común', 'Para sumarlas', 'Para alimentarlo', 'Para filtrarlo'], 'Los dos puntos medios están a unos 2,5 V; lo interesante son los milivoltios de diferencia.', { c: 'divider' }),
  Q('Las resistencias del restador tienen un 5 % de tolerancia. ¿Qué empeora?', ['El rechazo de la tensión común: parte de ella aparece en la salida', 'Nada', 'La alimentación', 'El offset desaparece'], 'Para medir bien se usan resistencias del 0,1 % o amplificadores de instrumentación (INA).'),
  I('Truco para alimentación única: si no tienes tensión negativa, lleva la entrada + del inversor a una referencia de media alimentación (por ejemplo, 2,5 V con un divisor y un condensador). La salida oscilará alrededor de 2,5 V en lugar de 0 V.'),
  Q('Alimentación única de 5 V, la + a 2,5 V y un inversor de ganancia −1. Con la entrada a 0 V, ¿salida?', ['5 V (2,5 + 2,5), si la salida llega', '0 V', '−2,5 V', '2,5 V'], 'Vsal = Vref − (Vent − Vref) · Rf/Ri = 2,5 + 2,5.')
 ]),
 L('k7', 'Comparadores', 'amp', ['opamp'], [
  I('Sin realimentación, el operacional es un <b>comparador</b>: si IN+ > IN−, salida alta; si no, baja. Para umbrales: luz, temperatura, batería.', { symk: 'opamp' }),
  Q('IN+ = 2,1 V, IN− = 2,5 V. ¿Salida?', ['Baja', 'Alta', 'Mitad', 'Oscila'], 'IN+ < IN−.'),
  Q('LDR en IN+ y potenciómetro en IN−. ¿El potenciómetro?', ['Ajusta el umbral', 'Alimenta', 'Ganancia', 'Mide la luz'], 'La referencia.'),
  Q('Cerca del umbral la salida “tiembla”. ¿Solución?', ['Histéresis (algo de realimentación positiva)', 'Más tensión', 'Quitar el potenciómetro', 'Ninguna'], 'Umbrales de subida y bajada distintos.')
 ]),
 L('k14', 'Schmitt trigger con números', 'amp', ['hyst'], [
  I('Un comparador sin histéresis cambia cada vez que el ruido cruza el umbral. El <b>Schmitt trigger</b> añade <b>realimentación positiva</b>: la salida empuja a la entrada + en su mismo sentido y aparecen dos umbrales, uno para subir y otro para bajar.'),
  I('Schmitt no inversor con alimentación única: la referencia Vref va a IN−; la entrada llega a IN+ por R1 y la salida vuelve a IN+ por R2.\n· Subida: <b>Vref · (R1 + R2) / R2</b>.\n· Histéresis: <b>Vcc · R1 / R2</b> (con salida rail-to-rail).\nCon Vref = Vcc / 2, los umbrales quedan centrados. Aquí Vcc = 5 V.', { tune: { viz: 'schmittHyst', params: { R1: { label: 'R1', val: 4700, list: [1000, 2200, 4700, 10000, 22000, 47000], fmt: 'R' }, R2: { label: 'R2', val: 100000, list: [10000, 22000, 47000, 100000, 220000], fmt: 'R' } } } }),
  TU('Consigue una salida limpia: 4 cambios, sin rebotes.', 'schmittHyst', { R1: { label: 'R1', val: 1000, list: [1000, 2200, 4700, 10000, 22000, 47000], fmt: 'R' }, R2: { label: 'R2', val: 220000, list: [10000, 22000, 47000, 100000, 220000], fmt: 'R' } }, { q: 'clean', min: 1, max: 1, text: 'Objetivo: salida limpia (4 cambios)', hint: 'La histéresis (5 V · R1 / R2) debe superar el ruido, unos 0,4 V pico a pico, sin que el umbral de subida pase del pico de la señal.' }, 'Por ejemplo 10 kΩ y 100 kΩ: 0,5 V de histéresis.'),
  G('schmitt'), G('schmitt'),
  Q('Aumentas R1 sin tocar R2. La histéresis…', ['Aumenta', 'Disminuye', 'No cambia', 'Desaparece'], 'H = Vcc · R1 / R2.'),
  Q('¿Cuánta histéresis conviene?', ['Algo más que el ruido pico a pico, sin pasarse para no perder sensibilidad', 'Toda la posible', 'Ninguna', '10 V siempre'], 'Es un compromiso entre limpieza y precisión.'),
  I('Hay chips con Schmitt dentro: el <b>74HC14</b> (seis inversores Schmitt) limpia señales de pulsadores y sensores lentos. Y casi todas las entradas de los microcontroladores tienen algo de histéresis.'),
  Q('Un pulsador con un RC de 10 kΩ y 1 µF produce una subida lenta. ¿Qué pones antes de la entrada lógica?', ['Un inversor Schmitt (74HC14)', 'Una NAND normal del 74HC00', 'Un LED', 'Nada'], 'Así una rampa lenta da un único flanco limpio.', { c: 'logic' }),
  Nm('Schmitt con Vcc = 5 V, R1 = 4,7 kΩ y R2 = 47 kΩ. ¿Histéresis en V?', 0.5, 'V', '5 × 4,7 / 47.')
 ]),
 L('k12', 'Integrador y derivador', 'amp', ['opamp'], [
  I('Cambia la Rf de un inversor por un condensador y tienes un <b>integrador</b>: la salida acumula la entrada en el tiempo. Con una entrada constante, la salida es una <b>rampa</b> de pendiente −Vent / (R · C).'),
  Nm('Integrador con R = 10 kΩ, C = 1 µF y 1 V a la entrada. ¿Pendiente en V/s (sin signo)?', 100, 'V/s', '1 / (10 000 × 0,000001).'),
  Q('Con esa pendiente, ¿cuánto tarda la salida en moverse 5 V?', ['50 ms', '5 s', '0,5 ms', '500 ms'], '5 / 100 = 0,05 s.'),
  I('Un integrador ideal acaba saturado por cualquier offset, porque también lo acumula. En la práctica se pone una resistencia grande en paralelo con el condensador (por ejemplo, 1 MΩ) que limita la ganancia en continua.'),
  Q('¿Qué hace un integrador con una onda cuadrada?', ['La convierte en triangular', 'La convierte en una senoide perfecta', 'La deja igual', 'La anula'], 'Cada tramo constante se convierte en una rampa.'),
  I('Al revés, condensador en la entrada y resistencia en la realimentación: <b>derivador</b>. Su salida es proporcional a lo rápido que cambia la entrada: −R · C · ΔVent/Δt. Amplifica mucho el ruido rápido, así que se le pone una resistencia en serie con el condensador.'),
  Q('¿Qué hace un derivador con una onda triangular?', ['La convierte en cuadrada', 'La hace más grande', 'La anula', 'La convierte en continua'], 'Cada rampa tiene pendiente constante.'),
  Q('En el fondo, un integrador es…', ['Un paso bajo con mucha ganancia', 'Un paso alto', 'Un comparador', 'Un oscilador'], 'Su ganancia baja 20 dB por década, como un RC.', { c: 'filter' }),
  I('Junta un integrador y un Schmitt trigger en lazo y tienes un <b>generador de funciones</b>: el Schmitt da una cuadrada, el integrador la convierte en rampa y, cuando la rampa toca un umbral, el Schmitt cambia y la rampa se da la vuelta.'),
  { t: 'order', q: 'Ordena el lazo del generador de funciones.', items: ['El Schmitt da una cuadrada', 'El integrador la convierte en rampa', 'La rampa llega a un umbral del Schmitt', 'El Schmitt cambia de estado', 'La rampa cambia de sentido'], e: 'Dos umbrales y una rampa: una triangular de amplitud fija.', c: 'hyst' }
 ]),
 L('k13', 'Filtros activos', 'amp', ['opamp'], [
  I('Un filtro RC seguido de un operacional en seguidor ya es un <b>filtro activo</b>: el operacional da una salida fuerte que no se cae al conectarle cargas, y puedes encadenar etapas sin que se afecten.'),
  Q('¿Qué ventaja da el seguidor detrás de un RC?', ['Que la carga no cambia la frecuencia de corte', 'Más atenuación', 'No necesita alimentación', 'Sube la frecuencia'], 'Salida de baja impedancia.', { c: 'filter' }),
  I('<b>Sallen-Key</b>: el filtro activo de segundo orden más usado. Dos resistencias, dos condensadores y un seguidor. En el paso bajo con R iguales: <b>f₀ = 1 / (2π · R · √(C1 · C2))</b>, y Q ≈ ½ · √(C1 / C2), siendo C1 el condensador que va a la salida.'),
  Nm('Sallen-Key paso bajo con R = 10 kΩ, C1 = 22 nF y C2 = 10 nF. ¿f₀ en Hz?', 1073, 'Hz', '1 / (2π × 10 000 × √(22 nF × 10 nF)) ≈ 1073 Hz.', { tol: 25 }),
  Q('En ese filtro, Q ≈ ½ · √(22 / 10) ≈ 0,74. ¿Qué respuesta da?', ['Casi plana, cerca de Butterworth', 'Un pico enorme', 'Una caída muy suave', 'Ninguna'], 'Butterworth es Q = 0,707.', { c: 'resonance' }),
  I('Delante del ADC de un microcontrolador se pone un <b>filtro antialiasing</b>: un paso bajo que quita lo que esté por encima de la mitad de la frecuencia de muestreo. Si no, esas frecuencias aparecen disfrazadas de frecuencias bajas que no existen.'),
  Q('Muestreas a 1000 muestras por segundo. ¿Por debajo de qué frecuencia debe quedar la señal?', ['500 Hz', '1000 Hz', '2000 Hz', '50 Hz'], 'La mitad de la frecuencia de muestreo (Nyquist).', { c: 'quant' }),
  Q('Un filtro activo con un LM358 a 200 kHz…', ['No funcionará bien: el operacional no tiene ancho de banda suficiente', 'Perfecto', 'Mejor que a 1 kHz', 'Da igual el operacional'], 'Elige un operacional con un GBW muy por encima de f₀ × ganancia.'),
  { t: 'order', q: 'Ordena una cadena típica de medida de un sensor.', items: ['Sensor', 'Amplificador (ganancia y desplazamiento)', 'Filtro paso bajo antialiasing', 'ADC del microcontrolador'], e: 'Primero se adapta la señal, luego se limpia y al final se convierte.' }
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
 SIM('sg4', 'Reto: 555 con ciclo menor del 50 %', 'Usa el truco del diodo para que el LED (entre la pata 3 y masa) pase encendido mucho menos tiempo que apagado.', { battery: 9, parts: ['ic555', 'res', 'cap', 'diode', 'led'], sch: 'ne555', hint: 'Como el intermitente: 8 y 4 al +, 1 al −, R1 = 10 kΩ de + a 7, R2 = 47 kΩ de 7 a 6, 2 unida a 6 y 47 µF de 2 a −. Añade el diodo en paralelo con R2: ánodo en la 7, cátodo en la 6. Pata 3 → 470 Ω → LED → −. Al terminar pulsa Comprobar: el parpadeo se mide desde ese momento, así que deja que corra 6 s y vuelve a comprobar.' }, 'duty555'),
 PRJ('p5', 'Proyecto: intermitente con 555', 'blinker555'),
 PRJ('p11', 'Proyecto: sirena y theremin con 555', 'siren555'),
 PRJ('p15', 'Proyecto: amplificador de audio con LM386', 'audioAmp'),
 PRJ('p12', 'Proyecto: termómetro con barra de LEDs', 'thermoBar')
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
 L('l9', 'Registros de desplazamiento: el 74HC595', 'chip', ['logic'], [
  I('Un <b>registro de desplazamiento</b> es una fila de biestables D encadenados: en cada flanco de reloj, cada uno pasa su bit al siguiente. Con 8 pulsos de reloj metes un byte, bit a bit, por un solo cable.'),
  I('El <b>74HC595</b> tiene dos registros de 8 bits:\n· El de <b>desplazamiento</b>: los bits entran por DS (pata 14) con el reloj SHCP (pata 11).\n· El de <b>salida</b>: copia el anterior de golpe con un pulso en STCP (pata 12). Así las salidas Q0–Q7 no parpadean mientras cargas.'),
  { t: 'match', q: 'Une cada pata del 74HC595 con su función.', pairs: [['DS (14)', 'Entrada de datos en serie'], ['SHCP (11)', 'Reloj de desplazamiento'], ['STCP (12)', 'Copiar a las salidas'], ['Q7S (9)', 'Salida para encadenar otro chip']] },
  { t: 'order', q: 'Ordena cómo se envía un byte.', items: ['STCP a 0', 'Pon un bit en DS', 'Da un pulso en SHCP', 'Repite con los 8 bits', 'Da un pulso en STCP: aparecen en Q0–Q7'], e: 'Mientras STCP no sube, las salidas no cambian.' },
  Q('¿Para qué sirve la pata OE (13, activa a nivel bajo)?', ['Para apagar todas las salidas a la vez (y regular el brillo con PWM)', 'Es el reloj', 'Para borrar el registro', 'Para alimentarlo'], 'Con OE a 1, las salidas quedan en alta impedancia.'),
  Q('Encadenas tres 74HC595 (Q7S de uno a DS del siguiente). ¿Cuántas salidas y cuántos pines del microcontrolador?', ['24 salidas con los mismos 3 pines', '24 salidas con 9 pines', '8 salidas con 3 pines', '3 salidas'], 'Envías 24 bits seguidos.'),
  I('Límite de corriente: cada salida da unos 6 mA garantizados (algo más en la práctica) y el chip entero tiene un máximo de unos 70 mA por VCC o GND. Ocho LEDs a 20 mA son demasiado: usa 5–8 mA por LED o drivers de potencia (TPIC6B595, ULN2803).'),
  Nm('Ocho LEDs a 8 mA encendidos a la vez. ¿Corriente total del chip en mA?', 64, 'mA', 'Justo por debajo del máximo de unos 70 mA. Mejor menos.'),
  Q('En Arduino se suele usar shiftOut(). ¿Qué hace?', ['Pone cada bit en el pin de datos y da un pulso de reloj, 8 veces', 'Lee un pin analógico', 'Espera 8 ms', 'Copia a las salidas'], 'Después hay que dar el pulso de STCP (latch).', { code: 'digitalWrite(LATCH, LOW);\nshiftOut(DATA, CLOCK, MSBFIRST, 0b10110001);\ndigitalWrite(LATCH, HIGH);' }),
  { t: 'bits', q: 'Enciende las salidas Q0, Q2 y Q7 (Q0 es el bit de menos peso).', n: 8, target: 133, e: '1 + 4 + 128 = 133.', c: 'binary' }
 ]),
 L('l12', 'Multiplexado de displays', 'chip', ['logic'], [
  I('Un display de 7 segmentos tiene 8 LEDs (siete segmentos y el punto). Cuatro dígitos serían 32 LEDs y 32 pines. El truco: unir los segmentos iguales de todos los dígitos y encender <b>un dígito cada vez</b>, muy rápido. El ojo lo ve todo encendido: persistencia de la visión.'),
  Nm('Con 4 dígitos multiplexados, ¿cuántos pines necesitas (8 de segmentos más los de dígito)?', 12, '', '8 + 4.'),
  Q('Cada dígito está encendido una cuarta parte del tiempo. ¿Qué pasa con el brillo?', ['Baja: se compensa con más corriente de pico por segmento', 'Es el mismo', 'Sube', 'Se apaga'], 'El brillo medio es corriente × fracción de tiempo.', { c: 'pwm' }),
  I('<b>Ánodo común</b>: los ánodos de cada dígito están unidos; enciendes un dígito dando + a su ánodo y un segmento poniendo su cátodo a 0. <b>Cátodo común</b>: al revés. El pin común lleva la corriente de hasta 8 segmentos: necesita un transistor.'),
  Nm('8 segmentos a 10 mA a la vez. ¿Corriente del pin común del dígito, en mA?', 80, 'mA', 'Demasiado para un pin de microcontrolador: usa un transistor.', { c: 'bjt' }),
  Q('¿Cada cuánto conviene refrescar todo el display para que no parpadee?', ['Unas 100 veces por segundo o más', 'Una vez por segundo', '10 veces por segundo', 'Da igual'], 'Por debajo de unos 50–60 Hz se nota el parpadeo, sobre todo al mover la vista.'),
  I('Puedes delegar: el <b>MAX7219</b> multiplexa hasta 8 dígitos (o una matriz de 8 × 8 LEDs) con 3 pines y regula la corriente con una sola resistencia. O usar dos 74HC595: uno para segmentos y otro para dígitos.'),
  Q('Una matriz de 8 × 8 LEDs multiplexada por filas, ¿cuántos LEDs pueden estar encendidos a la vez como máximo?', ['8 (una fila)', '64', '1', '16'], 'Una fila cada vez, ocho veces muy rápido.'),
  Q('Ves “fantasmas”: segmentos que brillan un poco donde no deben. ¿Causa típica?', ['Cambiar de dígito sin apagar antes los segmentos', 'Demasiada resistencia', 'El display está roto', 'Alimentación alta'], 'Apaga, cambia de dígito y vuelve a encender.')
 ]),
 L('l8', 'Niveles lógicos: 5 V y 3,3 V', 'chip', ['logic'], [
  I('Un chip de 5 V puede no entender 3,3 V como “1”, y uno de 3,3 V puede romperse con 5 V. Se unen con <b>adaptadores de nivel</b> o divisores.'),
  Q('Salida de 5 V de una Uno a un pin de ESP32 no tolerante:', ['Divisor o adaptador de nivel', 'Directo', 'Un LED en medio', 'Nada'], 'Te lo puedes cargar.'),
  Nm('Divisor de 5 V a ~3,3 V con R1 = 1 kΩ. ¿R2 en kΩ?', 2, 'kΩ', '5 × 2/3 ≈ 3,33 V.', { tol: 0.2, c: 'divider' }),
  Q('¿Por qué 3,3 V suele bastar en una entrada de 5 V?', ['Muchos chips de 5 V aceptan ~2,5 V como “1”', 'Siempre funciona', 'Porque es más', 'Nunca funciona'], 'Revisa VIH.')
 ]),
 L('l10', 'DAC por dentro: la escalera R-2R', 'chip', ['quant'], [
  I('Un <b>DAC</b> convierte un número en tensión. Con n bits y una referencia Vref, cada número N da <b>Vsal = Vref · N / 2ⁿ</b>: una escalera de 2ⁿ peldaños de Vref / 2ⁿ.'),
  G('r2r'), G('r2r'),
  I('La <b>escalera R-2R</b> es el DAC más sencillo: solo dos valores de resistencia, R y 2R. Cada bit conecta su 2R a Vref (1) o a masa (0), y la red reparte las contribuciones a la mitad en cada paso: el bit de más peso aporta Vref/2, el siguiente Vref/4…'),
  Q('En un R-2R de 4 bits con Vref = 5 V, ¿cuánto aporta solo el bit de más peso (1000)?', ['2,5 V', '5 V', '1,25 V', '0,3125 V'], 'Vref / 2.'),
  Nm('¿Y 0101, con la misma referencia, en V?', 1.5625, 'V', '5 × 5 / 16.', { tol: 0.01 }),
  I('Para que funcione, las resistencias deben estar bien emparejadas (1 % o mejor) y la salida no debe cargarse: se pone un seguidor con un operacional. Con 8 salidas de un microcontrolador y 16 resistencias tienes un DAC de 8 bits casero.'),
  Q('¿Por qué un seguidor a la salida del R-2R?', ['Porque la red tiene una resistencia de salida R y una carga la desequilibraría', 'Para amplificar ×10', 'Para invertir', 'No hace falta'], 'Thévenin otra vez: la escalera es una fuente con Rth = R.', { c: 'network' }),
  I('Alternativa barata: <b>PWM + filtro RC</b>. La media del PWM es un “DAC” lento. El filtro debe cortar muy por debajo de la frecuencia del PWM; si no, queda rizado.'),
  Q('PWM de 490 Hz filtrado con un RC de fc = 4,9 Hz. ¿Qué compromiso tienes?', ['Poco rizado, pero la salida tarda en cambiar', 'Mucho rizado y mucha rapidez', 'Ni rizado ni retardo', 'No funciona'], 'Dos décadas por encima de fc el RC divide entre 100, a cambio de un τ de unos 32 ms.', { c: 'filter' })
 ]),
 L('l11', 'ADC por dentro: aproximaciones sucesivas', 'chip', ['quant'], [
  I('El ADC más común en microcontroladores es el de <b>aproximaciones sucesivas</b> (SAR). Tiene un DAC interno, un comparador y un registro. Prueba los bits de uno en uno, del más alto al más bajo, como quien adivina un número preguntando “¿es mayor que…?”.'),
  { t: 'order', q: 'Ordena una conversión SAR de 3 bits de 1,8 V con Vref = 4 V.', items: ['Prueba 100 (2 V): la entrada es menor → ese bit a 0', 'Prueba 010 (1 V): la entrada es mayor → ese bit a 1', 'Prueba 011 (1,5 V): mayor → ese bit a 1', 'Resultado: 011'], e: 'Un bit por paso: n pasos para n bits.' },
  Q('Un SAR de 12 bits, ¿cuántas comparaciones necesita?', ['12', '4096', '1', '24'], 'Una por bit: por eso es rápido y barato.'),
  I('<b>Resolución</b>: 1 LSB = Vref / 2ⁿ. Todo lo que cae dentro del mismo escalón da el mismo número: es el error de <b>cuantización</b>, de hasta medio escalón o uno entero, según cómo redondee.'),
  G('adcStep'), G('adcStep'),
  I('El SAR necesita que la entrada no cambie mientras compara: un <b>muestreo y retención</b> carga un condensador interno pequeño. Si la fuente tiene mucha resistencia, no le da tiempo a cargarlo y la lectura sale baja. Muchos fabricantes piden menos de unos 10 kΩ de resistencia de fuente.'),
  Q('Lees un divisor de 1 MΩ con el ADC y las lecturas salen bajas e inestables. ¿Solución?', ['Un condensador de 100 nF del pin a masa, o un seguidor con operacional', 'Más bits', 'Otra referencia', 'Leer más rápido'], 'El condensador externo da la carga que pide el muestreo (si la señal es lenta).', { c: 'network' }),
  Q('¿Qué tipo de ADC usan las tarjetas de sonido y las básculas de precisión?', ['Sigma-delta: muchísimas muestras de 1 bit, filtradas', 'SAR de 8 bits', 'Ninguno', 'Un 555'], 'Más lento, pero con muchos bits efectivos (16–24).'),
  Q('La lectura baila ±2 LSB con la entrada quieta. ¿Qué haces primero?', ['Promediar varias lecturas y revisar el ruido de la alimentación y la referencia', 'Comprar un ADC de más bits', 'Nada', 'Bajar la referencia a 0 V'], 'Más bits no arreglan el ruido.')
 ]),
 L('l13', 'Lógica programable en dos pinceladas', 'chip', ['logic'], [
  I('Si necesitas mucha lógica a medida, en vez de llenar una placa de chips 74HC puedes usar <b>lógica programable</b>: un chip cuyas puertas y conexiones se configuran con un archivo.'),
  { t: 'match', q: 'Une cada tipo con lo que es.', pairs: [['PLD / GAL', 'Pocas puertas: sustituye un puñado de chips'], ['CPLD', 'Cientos de biestables, listo al instante'], ['FPGA', 'Miles de bloques lógicos y memoria'], ['Microcontrolador', 'Ejecuta un programa paso a paso']] },
  I('La diferencia clave: un microcontrolador hace las cosas <b>una detrás de otra</b>; una FPGA tiene circuitos reales funcionando <b>en paralelo</b>, cada uno a su ritmo. Por eso se usan para vídeo, radio definida por software o interfaces muy rápidas.'),
  Q('Necesitas contar pulsos de 100 MHz. ¿Qué eliges?', ['Una FPGA o un CPLD', 'Un Arduino con digitalRead()', 'Un 555', 'Un relé'], 'Un programa no puede leer un pin cien millones de veces por segundo.'),
  I('Se describen con lenguajes de descripción de hardware, <b>Verilog</b> o <b>VHDL</b>. No es programar: describes circuitos. Una línea como “assign y = a & b;” crea una puerta AND.'),
  Q('¿Qué crea esta línea de Verilog?', ['Una puerta AND entre a y b', 'Un bucle', 'Una variable que se incrementa', 'Un retardo'], 'Es una conexión permanente, no una instrucción que se ejecuta.', { code: 'assign y = a & b;' }),
  Q('Muchas FPGA guardan su configuración en SRAM. ¿Qué implica?', ['Al encender la cargan desde una memoria flash', 'Nunca se pueden reprogramar', 'No necesitan alimentación', 'Funcionan sin configuración'], 'Por eso las placas de FPGA llevan una flash de configuración al lado.'),
  Q('Para un semáforo con pulsador, ¿qué es más sensato?', ['Un microcontrolador: sobra velocidad y es más fácil', 'Una FPGA grande', 'Diez chips 74HC', 'Un CPLD carísimo'], 'Elige la herramienta más simple que resuelva el problema.')
 ]),
 SIM('s6a', 'Reto: puerta AND', 'Monta una AND con dos pulsadores.', { battery: 9, parts: ['push', 'res', 'led'], sch: 'andSw', hint: 'Dos pulsadores en serie con resistencia y LED.' }, 'andGate'),
 SIM('s6b', 'Reto: puerta OR', 'Monta una OR con dos pulsadores.', { battery: 9, parts: ['push', 'res', 'led'], sch: 'orSw', hint: 'Pulsadores en paralelo y, en serie, resistencia y LED.' }, 'orGate'),
 SIM('slatch', 'Reto: memoria con un 74HC00', 'Con dos NAND cruzadas, haz un biestable: un pulsador enciende el LED y se queda encendido; el otro lo apaga.', { battery: 5, parts: ['ic7400', 'push', 'res', 'led'], hint: 'Pata 14 al +, 7 al −. Patas 1 y 5 con 10 kΩ al + y un pulsador cada una a −. Cruza: salida 3 → entrada 4; salida 6 → entrada 2. LED con 470 Ω en la salida 3.' }, 'latch'),
 PRJ('p6', 'Proyecto: lógica con pulsadores', 'logic')
] },

{ id: 'm12', title: 'Microcontroladores', desc: 'Programar de verdad con Uno, Nano y ESP32: tipos, funciones, tiempos, estados, interrupciones, memoria, sensores y motores.', nodes: [
 L('n1', 'Qué es un microcontrolador', 'chip', ['mc_choose'], [
  I('Un ordenador diminuto en un chip: procesador, memoria y pines de entrada y salida. Ejecuta tu programa y lo repite sin fin.'),
  I('Dentro del chip hay:\n· <b>CPU</b>: ejecuta las instrucciones.\n· <b>Flash</b>: guarda el programa, también sin corriente.\n· <b>RAM</b>: guarda las variables mientras funciona.\n· <b>Periféricos</b>: pines digitales, convertidor analógico (ADC), temporizadores y puertos de comunicación.'),
  Q('¿En qué se diferencia de la CPU de un ordenador?', ['Lleva memoria y periféricos dentro del mismo chip y consume muy poco', 'Es mucho más rápido', 'Necesita un sistema operativo', 'No tiene memoria'], 'La CPU de un ordenador necesita memoria, discos y periféricos aparte. El microcontrolador lo integra todo para controlar cosas concretas.'),
  { t: 'match', q: 'Une cada placa.', pairs: [['Arduino Uno', 'ATmega328P, 5 V, la clásica'], ['Arduino Nano', 'El mismo chip, cabe en la protoboard'], ['ESP32', '3,3 V, WiFi y Bluetooth'], ['Raspberry Pi', 'Ordenador con Linux']] },
  I('Cómo llega tu programa al chip: lo escribes en el IDE en C++, el compilador lo traduce a código máquina y se sube por USB. Un pequeño programa de arranque (el <b>bootloader</b>) lo graba en la Flash, y la placa se reinicia y lo ejecuta.'),
  { t: 'order', q: 'Ordena lo que pasa desde que escribes el programa.', items: ['Escribes el programa en el IDE', 'Compilas (verificar)', 'Lo subes por USB', 'La placa se reinicia y ejecuta setup()', 'loop() se repite sin fin'], e: 'Si la compilación falla, nada llega a la placa.' },
  Q('Desconectas el USB y alimentas la placa con una batería. ¿Qué pasa con el programa?', ['Arranca solo: está guardado en la Flash', 'Se ha borrado', 'Hay que volver a subirlo', 'Solo funciona con el ordenador'], 'La Flash no se borra al quitar la corriente.'),
  Q('Diferencia clave al conectar cosas a un ESP32:', ['Trabaja a 3,3 V y no tolera 5 V en sus pines', 'Ninguna', 'La Uno es de 3,3 V', 'No tiene pines'], 'Niveles lógicos.', { c: 'logic' }),
  I('Los pines de la Uno: <b>D0–D13</b> digitales (los marcados con ~ admiten PWM), <b>A0–A5</b> analógicos, y los de alimentación: <b>5V</b>, <b>3V3</b>, <b>GND</b> (masa) y <b>VIN</b> (entrada de 7–12 V).'),
  { t: 'pin', q: '¿A qué pin de la placa va el cátodo (−) de un LED?', a: 'GND', e: 'Masa: el punto de 0 V de la placa.' },
  Q('¿Cuánta corriente sacar de un pin de la Uno?', ['Unos 20 mA', '2 A', '200 mA', 'Ilimitada'], 'Máximo absoluto 40 mA.'),
  Nm('LED rojo (2 V) con 220 Ω en un pin de 5 V. ¿Corriente en mA?', 13.6, 'mA', '(5 − 2) / 220 ≈ 13,6 mA: dentro de lo razonable para un pin.', { tol: 0.4, c: 'led' })
 ]),
 L('n2', 'Tu primer programa', 'chip', ['mc_flow'], [
  I('<b>setup()</b> se ejecuta una vez al arrancar; <b>loop()</b> se repite sin parar. Cada instrucción acaba en punto y coma; los bloques van entre llaves.'),
  I('El programa más famoso: hacer parpadear el LED del pin 13.', { code: 'void setup() {\n  pinMode(13, OUTPUT);     // el 13 será una salida\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);  // enciende\n  delay(500);              // espera medio segundo\n  digitalWrite(13, LOW);   // apaga\n  delay(500);\n}' }),
  Q('¿Cuántas veces se ejecuta setup()?', ['Una', 'Sin parar', 'Cada segundo', 'Nunca'], 'loop() es la que se repite.', { code: 'void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  ...\n}' }),
  Q('delay(500) significa…', ['Espera 500 ms', 'Espera 500 s', 'Repite 500 veces', 'Pin 500'], '1000 ms = 1 s.'),
  Q('Con este loop(), ¿cómo parpadea el LED?', ['200 ms encendido y 800 ms apagado: un destello por segundo', '200 ms encendido y 200 ms apagado', 'Siempre encendido', '800 ms encendido y 200 ms apagado'], 'Cada delay mantiene el estado anterior: 200 + 800 = 1000 ms por ciclo.', { code: 'void loop() {\n  digitalWrite(13, HIGH);\n  delay(200);\n  digitalWrite(13, LOW);\n  delay(800);\n}' }),
  { t: 'order', q: 'Ordena las líneas del programa de parpadeo.', items: ['void setup() {', 'pinMode(13, OUTPUT);', '}   // fin de setup()', 'void loop() {', 'digitalWrite(13, HIGH);', 'delay(500);   // encendido', 'digitalWrite(13, LOW);', 'delay(500);   // apagado', '}   // fin de loop()'], e: 'Primero se configura el pin en setup(); luego loop() enciende, espera, apaga y espera.' },
  Q('El LED se queda siempre encendido, aunque el programa compila. ¿Dónde está el fallo?', ['Falta un delay tras apagar: está apagado solo unos microsegundos', 'Falta pinMode', 'HIGH y LOW están al revés', 'delay(500) es demasiado corto'], 'Después de LOW, loop() vuelve a empezar y enciende enseguida. El ojo no ve un apagón de microsegundos.', { code: 'void loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n}' }),
  I('Detalles que dan guerra al principio:\n· Lo que va tras <b>//</b> es un comentario: el compilador lo ignora.\n· C++ distingue <b>mayúsculas y minúsculas</b>: digitalwrite no es digitalWrite.\n· Los errores de compilación suelen señalar la línea de <b>después</b> del fallo real.'),
  Q('¿Por qué no compila?', ['digitalwrite va en minúsculas: se escribe digitalWrite', 'Falta el punto y coma', 'HIGH debería ir entre comillas', 'El 13 no existe'], 'El compilador dice que digitalwrite no está declarado.', { code: 'digitalwrite(13, HIGH);' }),
  Q('¿Qué falta?', ['El punto y coma', 'Las llaves', 'Un número', 'Nada'], 'El compilador avisa.', { code: 'digitalWrite(13, HIGH)' }),
  Q('¿Qué hace esta línea?', ['Guarda el 13 con el nombre LED', 'Enciende el 13', 'Crea un LED', 'Nada'], 'Programas legibles.', { code: 'const int LED = 13;' })
 ]),
 L('n10', 'Variables y tipos', 'code', ['mc_types'], [
  I('Una <b>variable</b> es una cajita con nombre en la RAM donde el programa guarda un dato que puede cambiar.\nAl crearla indicas su <b>tipo</b> (qué guarda y cuánto ocupa), su nombre y, si quieres, un valor inicial.', { code: 'int contador = 0;         // tipo, nombre y valor inicial\ncontador = contador + 1;  // ahora vale 1' }),
  Q('¿Cuánto vale x después de estas líneas?', ['8', '5', '3', '53'], 'Primero vale 5; luego se calcula 5 + 3 y el resultado sustituye al valor anterior.', { code: 'int x = 5;\nx = x + 3;' }),
  I('Tipos más usados en la Uno y la Nano (ATmega328P):\n<b>bool</b> · 1 byte · true o false\n<b>byte</b> · 1 byte · de 0 a 255\n<b>int</b> · 2 bytes · de −32 768 a 32 767\n<b>unsigned int</b> · 2 bytes · de 0 a 65 535\n<b>long</b> · 4 bytes · unos ±2100 millones\n<b>unsigned long</b> · 4 bytes · de 0 a 4 294 967 295\n<b>float</b> · 4 bytes · con decimales, unas 6–7 cifras fiables'),
  { t: 'match', q: 'Elige el tipo más ajustado para cada dato.', pairs: [['Si un LED está encendido', 'bool'], ['Brillo para analogWrite (0–255)', 'byte'], ['Lectura de analogRead (0–1023)', 'int'], ['Lo que devuelve millis()', 'unsigned long'], ['Temperatura con decimales', 'float']] },
  I('Cada tipo tiene un rango. Si te sales, el número <b>da la vuelta</b>, como el cuentakilómetros de un coche viejo: a un byte que vale 255 le sumas 1 y pasa a valer 0. No hay aviso ni error: simplemente sale un valor equivocado.', { tune: { viz: 'mc_wrap', params: { v: { label: 'Valor que intentas guardar', val: 200, min: 0, max: 600, step: 1, unit: '', dec: 0 }, bits: { val: 8, fixed: true } } } }),
  TU('Haz que el byte acabe guardando 4 aunque intentes guardar más de 255.', 'mc_wrap', { v: { label: 'Valor que intentas guardar', val: 100, min: 0, max: 600, step: 1, unit: '', dec: 0 }, bits: { val: 8, fixed: true } }, { q: 'trick', min: 1, max: 1, text: 'Objetivo: guardar 4 intentando más de 255', hint: 'Una vuelta completa son 256.' }, '260 = 256 + 4. Con dos vueltas, 516 también da 4.'),
  Q('¿Qué imprime?', ['4', '260', '255', 'Da error al compilar'], 'Un byte solo llega a 255: 260 da la vuelta y queda 260 − 256 = 4.', { code: 'byte b = 250;\nb = b + 10;\nSerial.println(b);' }),
  G('mcOverflow'),
  I('Cuidado con <b>int</b>: en la Uno ocupa 2 bytes, pero en el ESP32, la Pico o un STM32 ocupa 4. El mismo programa puede comportarse distinto según la placa.\nPor eso el código serio usa tipos de tamaño fijo: <b>uint8_t</b> (como byte), <b>int16_t</b>, <b>uint32_t</b>…'),
  Q('En una Uno, ¿qué problema tiene esta línea?', ['40 000 no cabe en un int de la Uno (máximo 32 767)', 'Ninguno', 'Falta el punto decimal', 'int no admite números de cinco cifras escritos así'], 'Usa long o unsigned int. En un ESP32 sí cabría: allí int ocupa 4 bytes.', { code: 'int pasos = 40000;' }),
  I('¿Por qué <b>millis()</b> devuelve un <b>unsigned long</b>? Cuenta milisegundos desde el arranque y no para de crecer: un int de la Uno se desbordaría a los 33 segundos. Con 32 bits sin signo llega a 4 294 967 295 ms, unos <b>49,7 días</b>, y entonces vuelve a 0.'),
  Q('Guardas millis() en un int de la Uno. ¿Qué pasa al rato?', ['A los 32,8 s ya no cabe y aparecen valores absurdos, incluso negativos', 'Nada: millis() siempre cabe', 'La placa se reinicia', 'millis() se detiene'], 'Un int llega a 32 767. Para tiempos, siempre unsigned long.'),
  Nm('¿Cuántos bytes ocupan juntos, en la Uno, un bool, dos int y un unsigned long?', 9, 'bytes', '1 + 2 × 2 + 4 = 9 bytes.')
 ]),
 L('n11', 'Cuentas en el microcontrolador', 'code', ['mc_intmath'], [
  I('Operadores: <b>+ − * /</b> y <b>%</b> (resto). Entre números enteros, <b>/ descarta los decimales</b>: 7 / 2 da 3, no 3,5. No redondea: corta. Y <b>%</b> da lo que sobra: 7 % 2 da 1.'),
  Q('¿Cuánto vale x?', ['3', '3,8', '4', '0'], 'División entera: 19 / 5 = 3 y sobran 4. Los decimales se pierden; no se redondea a 4.', { code: 'int x = 19 / 5;' }),
  Q('¿Y r?', ['4', '3', '0', '3,8'], '19 = 5 × 3 + 4: el resto es 4.', { code: 'int r = 19 % 5;' }),
  G('mcIntDiv'), G('mcModulo'),
  I('El resto es muy útil para todo lo que se repite en ciclo:\n· <b>n % 2</b> vale 0 si n es par.\n· <b>(paso + 1) % 4</b> recorre 0, 1, 2, 3, 0, 1…\n· <b>segundos % 60</b> da los segundos dentro del minuto.', { code: 'paso = (paso + 1) % 4;   // 0, 1, 2, 3, 0, 1, 2, 3...' }),
  Q('La variable s vale 125 (segundos). ¿Qué dos expresiones dan «2 min 5 s»?', ['s / 60 y s % 60', 's % 60 y s / 60', 's / 60 y s - 60', 's * 60 y s % 60'], 'Minutos: división entera. Segundos sobrantes: el resto.'),
  I('Para tener decimales, al menos un número de la cuenta debe ser decimal. Ojo: guardar en un float no basta, porque la división entre enteros se hace antes de guardar.', { code: 'float a = 7 / 2;     // 3.0  (entera y luego a float)\nfloat b = 7.0 / 2;   // 3.5' }),
  Q('lectura vale 512. ¿Qué guarda v?', ['Unos 2,50', '0', '2', '2560'], '512 × 5.0 / 1023 ≈ 2,50. Con 5 en vez de 5.0 saldría 2; y escrito como lectura / 1023 * 5.0, saldría 0.', { code: 'int lectura = 512;\nfloat v = lectura * 5.0 / 1023;' }),
  I('<b>Precedencia</b>: como en matemáticas, * / % van antes que + −. En caso de duda, paréntesis.\nY cuidado con los resultados intermedios: en <b>60 * 1000</b> los dos números son int, y en la Uno 60 000 no cabe en un int. Escribe <b>60000UL</b> o <b>60 * 1000UL</b> (UL: unsigned long).'),
  Q('En la Uno quieres una espera de 2 minutos para usar con millis(). ¿Qué línea es correcta?', ['const unsigned long ESPERA = 2 * 60 * 1000UL;', 'const int ESPERA = 2 * 60 * 1000;', 'const byte ESPERA = 120000;', 'const float ESPERA = 2 / 60;'], 'UL obliga a hacer la multiplicación en unsigned long. 120 000 no cabe en un int ni en un byte.', { code: '// 2 min = 120 000 ms' }),
  I('Los operadores de bits trabajan con los unos y ceros de un número: <b>1 << k</b> es un 1 desplazado k posiciones (2ᵏ); <b>|</b> pone bits a 1, <b>&</b> los filtra y <b>~</b> los invierte. Los verás a fondo al programar registros, pero conviene reconocerlos ya.', { code: 'byte x = 0b00000100;\nx |= (1 << 0);    // x = 0b00000101 = 5\nx &= ~(1 << 2);   // x = 0b00000001 = 1' }),
  { t: 'bits', q: 'Enciende los bits de (1 << 6) | (1 << 1).', n: 8, target: 66, e: '64 + 2 = 66.', c: 'binary' },
  G('mcBits')
 ]),
 L('n12', 'Decisiones y bucles', 'code', ['mc_flow'], [
  I('<b>if</b> ejecuta un bloque solo si la condición es cierta; <b>else</b>, si no lo es. Comparadores: <b>==</b> igual, <b>!=</b> distinto, <b>&lt; &gt; &lt;= &gt;=</b>.\nSe combinan con <b>&&</b> (y), <b>||</b> (o) y <b>!</b> (no).', { code: 'if (temp > 30 && ventiladorLibre) {\n  digitalWrite(VENT, HIGH);\n} else {\n  digitalWrite(VENT, LOW);\n}' }),
  Q('¿Dónde está el fallo?', ['Usa = (asignar) en vez de == (comparar): x pasa a valer 5 y la condición siempre se cumple', 'Faltan llaves', 'x no puede compararse con 5', 'Falta un punto y coma tras el if'], 'Error clásico: el compilador lo acepta (como mucho avisa) y el programa hace otra cosa.', { code: 'if (x = 5) {\n  digitalWrite(13, HIGH);\n}' }),
  Q('Con t = 25, ¿qué LED se enciende?', ['El amarillo', 'El rojo', 'El verde', 'El amarillo y el verde'], 'Se comprueba en orden: 25 no es mayor que 30, pero sí que 20. En cuanto se cumple una rama, las demás se saltan.', { code: 'if (t > 30) {\n  encender(ROJO);\n} else if (t > 20) {\n  encender(AMARILLO);\n} else {\n  encender(VERDE);\n}' }),
  Q('¿Cuándo se cumple esta condición?', ['Si t es menor que 5 o mayor que 35', 'Si t está entre 5 y 35', 'Nunca', 'Siempre'], '|| se cumple con que una de las dos sea cierta: fuera del rango.', { code: 'if (t < 5 || t > 35)' }),
  I('El bucle <b>for</b> repite algo un número de veces. Tiene tres partes: inicio, condición para seguir y qué hacer al final de cada vuelta.\n<b>while</b> repite mientras su condición sea cierta.', { code: 'for (int i = 0; i < 3; i++) {\n  Serial.println(i);\n}\n// imprime 0, 1 y 2' }),
  Q('¿Cuántas veces parpadea?', ['5', '4', '6', 'Sin parar'], 'i toma 0, 1, 2, 3 y 4: cinco vueltas. Con i <= 5 serían seis.', { code: 'for (int i = 0; i < 5; i++) {\n  digitalWrite(13, HIGH); delay(200);\n  digitalWrite(13, LOW);  delay(200);\n}' }),
  Q('¿Qué imprime?', ['10 8 6 4 2', '10 8 6 4 2 0', '2 4 6 8 10', '10 9 8 7 6'], 'Empieza en 10, resta 2 en cada vuelta y para cuando i ya no es mayor que 0.', { code: 'for (int i = 10; i > 0; i -= 2) {\n  Serial.print(i);\n  Serial.print(" ");\n}' }),
  Q('¿Qué le pasa a este programa?', ['Se queda atrapado: n nunca cambia dentro del while', 'Imprime 0, 1, 2… hasta 9', 'No compila', 'Imprime una sola vez'], 'Algo dentro del while debe acabar haciendo falsa la condición. Si no, bucle infinito y la placa parece colgada.', { code: 'int n = 0;\nwhile (n < 10) {\n  Serial.println(n);\n}' }),
  I('Recuerda que <b>loop()</b> ya es un bucle infinito. Un while que espera algo (un botón, un dato) bloquea todo lo demás mientras espera, igual que delay(). Para esperar sin bloquear, usa un if y deja que loop() vuelva a pasar.'),
  { t: 'order', q: 'Ordena las líneas: el LED del 13 parpadea 3 veces al arrancar y luego se queda apagado.', items: ['void setup() {', 'pinMode(13, OUTPUT);', 'for (int i = 0; i < 3; i++) {', 'digitalWrite(13, HIGH); delay(300);', 'digitalWrite(13, LOW); delay(300);', '}   // fin del for', '}   // fin de setup()'], e: 'Primero se configura el pin; luego el bucle con su cuerpo, encendiendo antes de apagar; y se cierran las llaves de dentro hacia fuera.' },
  Q('Con el pulsador en pull-up, quieres encender un LED mientras el botón NO esté pulsado. ¿Qué condición?', ['digitalRead(2) == HIGH', 'digitalRead(2) == LOW', 'digitalRead(2) != HIGH', 'digitalRead(2) = HIGH'], 'Con pull-up, suelto se lee HIGH.', { c: 'pullup' })
 ]),
 L('n13', 'Funciones y parámetros', 'code', ['mc_func'], [
  I('Una <b>función</b> es un trozo de programa con nombre que puedes usar muchas veces. setup() y loop() son funciones, y digitalWrite() también, solo que ya viene escrita.\nCon funciones no copias y pegas código: si hay un fallo, lo arreglas en un solo sitio.'),
  I('Partes: el tipo que devuelve (<b>void</b> si no devuelve nada), el nombre, los <b>parámetros</b> entre paréntesis y el cuerpo entre llaves.', { code: 'void parpadear(int pin, int veces) {\n  for (int i = 0; i < veces; i++) {\n    digitalWrite(pin, HIGH); delay(150);\n    digitalWrite(pin, LOW);  delay(150);\n  }\n}\n\n// uso:\nparpadear(13, 3);' }),
  Q('¿Qué hace parpadear(8, 2)?', ['Dos destellos en el LED del pin 8', 'Ocho destellos en el pin 2', 'Nada: falta pinMode dentro de la función', 'Un destello de 8 ms'], 'Los valores se asignan en orden: pin = 8 y veces = 2. (pinMode se hace una vez en setup().)'),
  I('Una función puede <b>devolver</b> un resultado con <b>return</b>. El tipo escrito delante del nombre dice qué devuelve.', { code: 'float voltios(int lectura) {\n  return lectura * 5.0 / 1023;\n}\n\nfloat v = voltios(analogRead(A0));' }),
  Q('¿Qué imprime?', ['10', '7', '25', '5'], 'doble(5) devuelve 5 × 2 = 10.', { code: 'int doble(int x) {\n  return x * 2;\n}\n\nvoid loop() {\n  Serial.println(doble(5));\n}' }),
  Q('¿Dónde está el fallo?', ['Dice que devuelve int pero no tiene return', 'Sobran los paréntesis', 'Los parámetros no pueden llamarse a y b', 'Debería llamarse loop'], 'Sin return, lo que llega es basura. El compilador suele avisar: hazle caso.', { code: 'int suma(int a, int b) {\n  int s = a + b;\n}' }),
  I('<b>Ámbito</b>: una variable creada dentro de una función (<b>local</b>) solo existe ahí y se crea de nuevo en cada llamada. Una creada fuera de todas (<b>global</b>) existe siempre y la ven todas las funciones.'),
  Q('¿Qué imprime en la tercera vuelta de loop()?', ['1', '3', '0', '2'], 'n es local: se crea con 0 en cada vuelta, sube a 1 y desaparece. Para que cuente, hazla global (o static).', { code: 'void loop() {\n  int n = 0;\n  n++;\n  Serial.println(n);\n}' }),
  Q('¿Y ahora, en la tercera vuelta?', ['3', '1', '0', 'Error'], 'n es global: conserva su valor entre vueltas de loop().', { code: 'int n = 0;\n\nvoid loop() {\n  n++;\n  Serial.println(n);\n}' }),
  I('Los parámetros se pasan <b>por valor</b>: la función recibe una copia. Si cambia su copia, la variable original sigue igual. Para obtener un resultado, usa return.'),
  Q('¿Qué imprime?', ['5', '6', '0', 'Error'], 'subir() cambia su copia de x, no la variable a.', { code: 'void subir(int x) {\n  x = x + 1;\n}\n\nvoid loop() {\n  int a = 5;\n  subir(a);\n  Serial.println(a);\n}' }),
  { t: 'match', q: 'Une cada cabecera con lo que hace.', pairs: [['void encender(int pin)', 'Recibe un pin y no devuelve nada'], ['int leerMedia()', 'No recibe nada y devuelve un entero'], ['bool pulsado(int pin)', 'Devuelve verdadero o falso'], ['float aCelsius(int raw)', 'Recibe un entero y devuelve un número con decimales']] }
 ]),
 L('n3', 'Salidas digitales', 'chip', ['led'], [
  I('<b>pinMode(pin, OUTPUT)</b> convierte un pin en salida. Después, <b>digitalWrite(pin, HIGH)</b> lo conecta por dentro a 5 V y <b>LOW</b>, a 0 V. Es como un interruptor que elige entre el positivo y la masa.\nUn LED siempre con su resistencia en serie.', { code: 'pinMode(8, OUTPUT);\ndigitalWrite(8, HIGH);   // el pin 8 da 5 V' }),
  { t: 'pin', q: '¿A qué pin conectarías el LED?', code: 'void setup() {\n  pinMode(8, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(8, HIGH);\n}', a: 'D8', e: 'El número del pin.' },
  Q('Completa para que el 13 pueda encender un LED.', ['OUTPUT', 'INPUT', 'HIGH', 'LOW'], 'Salida.', { code: 'pinMode(13, ____);' }),
  Q('digitalWrite(13, HIGH) en una Uno da…', ['5 V', '0 V', '3,3 V', '9 V'], 'En ESP32, 3,3 V.'),
  { t: 'pin', q: 'La Uno trae un LED soldado en la placa. ¿En qué pin está?', a: 'D13', e: 'Por eso el programa de parpadeo usa el 13: funciona sin montar nada.' },
  I('Un LED se puede conectar de dos formas:\n· Pin → resistencia → LED → GND: se enciende con <b>HIGH</b>.\n· 5V → resistencia → LED → pin: se enciende con <b>LOW</b>, porque entonces el pin hace de masa (lógica invertida).'),
  Q('LED conectado de 5V a través de una resistencia hasta el pin 7. ¿Cuándo se enciende?', ['Con digitalWrite(7, LOW)', 'Con digitalWrite(7, HIGH)', 'Nunca', 'Siempre'], 'Con LOW hay 5 V de diferencia entre sus extremos; con HIGH, ninguna.', { c: 'voltage' }),
  G('ledR'),
  Nm('LED rojo (2 V) a 10 mA desde un pin de ESP32 (3,3 V). ¿Resistencia en Ω?', 130, 'Ω', '(3,3 − 2) / 0,01 = 130 Ω: con 3,3 V queda poco margen, por eso las resistencias son más pequeñas.', { tol: 3 }),
  Q('¿Por qué no encender 12 LEDs a 20 mA cada uno directamente desde pines de la Uno?', ['Se pasaría del límite total del chip, unos 200 mA entre todos sus pines', 'Porque solo hay 6 pines', 'Porque los LEDs se apagan entre sí', 'Sí se puede sin problema'], 'Además del límite por pin hay uno total. Para muchos LEDs: transistores, un ULN2003 o un 74HC595.', { c: 'power' }),
  Q('¿Cómo controlas un motor de 500 mA?', ['Transistor o MOSFET con diodo de rueda libre', 'Directo al pin', 'Con una resistencia', 'No se puede'], 'El pin da ~20 mA.', { c: 'bjt' })
 ]),
 SIM('s7a', 'Reto: parpadeo', 'Conecta un LED al pin 13 para que parpadee.', { arduino: 'blink', parts: ['res', 'led'], code: true, hint: 'D13 → 220 Ω → ánodo; cátodo → GND.' }, 'blink'),
 L('n14', 'Arrays: muchos pines, un bucle', 'code', ['mc_array'], [
  I('Un <b>array</b> es una fila de variables del mismo tipo bajo un solo nombre. Cada una se alcanza por su <b>índice</b>, que empieza en <b>0</b>.', { code: 'int leds[] = {8, 9, 10, 11, 12};\n// leds[0] es 8 y leds[4] es 12' }),
  Q('¿Cuánto vale leds[2]?', ['10', '9', '2', '11'], 'Índices 0, 1, 2: es el tercer elemento.', { code: 'int leds[] = {8, 9, 10, 11, 12};' }),
  I('Con un bucle for recorres el array: el mismo código sirve para 5 LEDs o para 50. Así se hacen barridos, barras de nivel o secuencias.', { code: 'const int N = 5;\nint leds[N] = {8, 9, 10, 11, 12};\n\nvoid setup() {\n  for (int i = 0; i < N; i++) pinMode(leds[i], OUTPUT);\n}' }),
  { t: 'pin', q: '¿En qué pin está el último LED que se enciende?', code: 'int leds[] = {3, 5, 6, 9, 10};\nfor (int i = 0; i < 5; i++) {\n  digitalWrite(leds[i], HIGH);\n  delay(100);\n  digitalWrite(leds[i], LOW);\n}', a: 'D10', e: 'El índice 4 es el quinto elemento: el 10.' },
  Q('¿Dónde está el fallo?', ['leds[5] no existe: el array va de 0 a 4 y se escribe en memoria ajena', 'Falta pinMode', 'El for debería empezar en 1', 'Ninguno'], 'Con <= se da una vuelta de más. C++ no comprueba los límites: lee o escribe lo que haya detrás, sin avisar.', { code: 'int leds[5] = {8, 9, 10, 11, 12};\nfor (int i = 0; i <= 5; i++) {\n  digitalWrite(leds[i], HIGH);\n}' }),
  I('Salirse de un array es de los errores más traicioneros: puede pisar otra variable y el fallo aparece lejos de su causa. Recorre siempre con <b>i &lt; N</b> y usa una constante N en vez de repetir el número a mano.'),
  Q('Un array de 20 int en la Uno, ¿cuánta RAM ocupa?', ['40 bytes', '20 bytes', '80 bytes', '2 bytes'], 'Cada int ocupa 2 bytes en la Uno: 20 × 2. Y la Uno solo tiene 2048 bytes de RAM en total.', { c: 'mc_memory' }),
  G('mcArrayBytes'),
  I('Los arrays también guardan datos: las últimas lecturas de un sensor, las notas de una melodía, los tiempos de un semáforo… Un truco clásico es el <b>buffer circular</b>: escribes en la posición i y avanzas con i = (i + 1) % N, sobrescribiendo lo más antiguo.', { code: 'lecturas[i] = analogRead(A0);\ni = (i + 1) % N;' }),
  Q('Con N = 4 e i empezando en 0, ¿en qué posición se guarda la sexta lectura?', ['1', '5', '2', '0'], 'Posiciones: 0, 1, 2, 3, 0, 1. La sexta sobrescribe la segunda.', { c: 'mc_intmath' }),
  Q('¿Qué imprime?', ['20', '4', '8', '0'], 'Suma 2 + 4 + 6 + 8 = 20.', { code: 'int v[] = {2, 4, 6, 8};\nint s = 0;\nfor (int i = 0; i < 4; i++) s += v[i];\nSerial.println(s);' }),
  { t: 'order', q: 'Ordena el cuerpo de loop() que enciende los LEDs uno tras otro (barrido).', items: ['for (int i = 0; i < N; i++) {', 'digitalWrite(leds[i], HIGH);', 'delay(120);', 'digitalWrite(leds[i], LOW);', '}'], e: 'Para cada LED: encender, esperar y apagar, todo dentro del bucle.' }
 ]),
 SIM('s7b', 'Reto: semáforo', 'Monta las tres luces en los pines del programa.', { arduino: 'semaforo', parts: ['res', 'led'], code: true, hint: 'LEDs en 12, 11 y 10, cada uno con su resistencia a GND.' }, 'traffic'),
 PRJ('p7', 'Proyecto: semáforo real', 'traffic'),
 SIM('s7e', 'Reto: barrido con la Nano', 'Ahora con una Nano pinchada en la protoboard. Conecta cinco LEDs a los pines 8 a 12 y un pulsador al 2: mientras lo mantienes pulsado, las luces barren de un lado a otro, recorriendo los pines con un bucle.', { arduino: 'coche', board: 'nano', parts: ['push', 'res', 'led'], code: true, hint: 'Cada pin (D8 a D12, en la fila de abajo de la Nano) → 220 Ω → ánodo; todos los cátodos a GND. Pulsador entre D2 y GND (usa la pull-up interna). Mantén pulsado unos segundos.' }, 'mc_sweep'),
 L('n15', 'El monitor serie: depurar de verdad', 'bus', ['mc_serial'], [
  I('Por el mismo cable USB con el que cargas el programa, la placa puede enviar texto al ordenador: es el <b>puerto serie</b>, y en el IDE lo ves en el <b>Monitor serie</b>.\nEs tu ventana al interior del programa: cuánto vale cada variable y por dónde pasa.', { code: 'void setup() {\n  Serial.begin(9600);\n  Serial.println("Arrancando");\n}' }),
  I('<b>Serial.begin(9600)</b> fija la velocidad en <b>baudios</b> (bits por segundo). El programa y el monitor deben usar la misma; si no, verás símbolos raros.\nCada carácter viaja como 10 bits (8 de datos más uno de inicio y otro de parada): a 9600 baudios, unos 960 caracteres por segundo.'),
  Q('El Monitor serie muestra «⸮⸮x⸮⸮». ¿Causa más probable?', ['Velocidades distintas en el programa y en el monitor', 'La placa está rota', 'Falta un println', 'El cable USB es demasiado corto'], 'Elige en el monitor los mismos baudios que en Serial.begin().'),
  G('mcBaud'),
  Q('¿Qué aparece en el monitor?', ['Temp: 23 C', 'Temp: t C', 'Temp:, 23 y C en tres líneas', 'Nada'], 'print escribe sin saltar de línea; println salta al final. Sin comillas se imprime el valor de la variable.', { code: 'int t = 23;\nSerial.print("Temp: ");\nSerial.print(t);\nSerial.println(" C");' }),
  I('Depurar bien es <b>observar lo que pasa</b>, no adivinar: imprime el valor de las variables clave y marca por dónde pasa el programa. Etiqueta cada dato para no confundirte.', { code: 'Serial.print("lectura=");\nSerial.print(lectura);\nSerial.print(" umbral=");\nSerial.println(umbral);' }),
  Q('Un LED no se enciende cuando debería. Pones Serial.println("dentro") dentro del if que lo enciende y nunca aparece. ¿Qué has aprendido?', ['Que la condición del if nunca se cumple: ahora imprime los valores que compara', 'Que el LED está fundido', 'Que Serial no funciona dentro de un if', 'Nada útil'], 'Has descartado medio problema en un minuto.'),
  I('La placa también puede <b>leer</b> lo que escribes en el monitor. <b>Serial.available()</b> dice cuántos caracteres esperan y <b>Serial.read()</b> saca uno.', { code: `void loop() {\n  if (Serial.available() > 0) {\n    char c = Serial.read();\n    if (c == 'e') digitalWrite(13, HIGH);\n    if (c == 'a') digitalWrite(13, LOW);\n  }\n}` }),
  Q('Envías «eae» desde el monitor. ¿Cómo queda el LED?', ['Encendido', 'Apagado', 'Parpadeando', 'Igual que antes'], 'Lee e (enciende), a (apaga) y e (enciende): manda el último.', { code: `if (Serial.available() > 0) {\n  char c = Serial.read();\n  if (c == 'e') digitalWrite(13, HIGH);\n  if (c == 'a') digitalWrite(13, LOW);\n}` }),
  I('<b>Serial.parseInt()</b> lee un número completo, como «120». Es cómodo, pero si no llega nada espera hasta 1 s: úsalo solo cuando sepas que hay datos.\nEn la Uno y la Nano, los pines <b>0 (RX) y 1 (TX)</b> los usa el USB: si usas Serial, no conectes nada en ellos.'),
  { t: 'pin', q: 'Tu programa usa Serial. ¿Qué pin no deberías usar para un LED? (elige uno)', a: ['D0', 'D1'], e: 'D0 y D1 son RX y TX del puerto serie que va al USB.' },
  Q('Abrir el Monitor serie con una Uno conectada…', ['Reinicia la placa: el programa empieza de nuevo', 'No le afecta', 'Borra el programa', 'Cambia los baudios del programa'], 'La Uno y la Nano se reinician al abrir el puerto: por eso ves otra vez el mensaje de setup().')
 ]),
 L('n16', 'Caracteres y cadenas', 'code', ['mc_serial', 'mc_types'], [
  I("Un <b>char</b> guarda un carácter, pero por dentro es un número de 1 byte según la tabla <b>ASCII</b>: 'A' es 65, 'a' es 97 y '0' es 48.\nComillas simples para un carácter: 'A'. Dobles para un texto: \"Hola\"."),
  Q('¿Qué imprime?', ['66', 'B', 'A1', '65'], 'Sumar a un char da un número: 65 + 1 = 66. Con Serial.println((char)x) verías la letra B.', { code: `char c = 'A';\nint x = c + 1;\nSerial.println(x);` }),
  Q("Llega el carácter '7' por Serial. ¿Cómo obtienes el número 7?", ["c - '0'", 'c', "c + '0'", 'c - 7'], "Las cifras van seguidas en ASCII: '7' (55) − '0' (48) = 7.", { code: `char c = Serial.read();   // ha llegado '7'` }),
  I("Un texto entre comillas dobles es un <b>array de char</b> que termina con un carácter invisible, el <b>'\\0'</b> (cero de fin). \"Hola\" ocupa 5 bytes, no 4.", { code: `char saludo[] = "Hola";   // 'H' 'o' 'l' 'a' '\\0'` }),
  Nm('¿Cuántos bytes ocupa char nombre[] = "Voltio";?', 7, 'bytes', "6 letras más el '\\0' final."),
  Q('¿Dónde está el fallo?', ['Con == se comparan direcciones de memoria, no el texto: usa strcmp()', 'Las comillas deberían ser simples', 'Falta un punto y coma', 'Ninguno'], 'Con arrays de char, strcmp(a, b) == 0 indica que son iguales. Con la clase String sí funciona ==.', { code: 'char orden[10];\n// ... se rellena con lo recibido\nif (orden == "on") {\n  digitalWrite(13, HIGH);\n}' }),
  I('Arduino también ofrece la clase <b>String</b> (con mayúscula): concatena con +, compara con == y tiene funciones como toInt() o trim(). Es cómoda, pero en placas con poca RAM, como la Uno, crear y destruir Strings sin parar puede <b>fragmentar la memoria</b> y colgar el programa tras horas funcionando.'),
  Q('¿Qué imprime?', ['T=21', 'T=', '21', 'T=+21'], 'Sumar un número a un String añade sus cifras como texto.', { code: 'String s = "T=";\ns += 21;\nSerial.println(s);' }),
  Q('Llega por Serial la orden «L1». ¿Qué hace este código con ella?', ['Enciende el LED del pin 13', 'Apaga el LED', 'Nada: compara un char con un número', 'Imprime L1'], "b - '0' convierte '1' en 1, que equivale a HIGH.", { code: `if (Serial.available() >= 2) {\n  char a = Serial.read();   // 'L'\n  char b = Serial.read();   // '1'\n  if (a == 'L') digitalWrite(13, b - '0');\n}` }),
  { t: 'match', q: 'Une cada literal con lo que es.', pairs: [["'A'", 'Un char: el número 65'], ['"A"', 'Un texto de 2 bytes'], ["'0'", 'El carácter cero: 48'], ['0', 'El número cero']] },
  Q('Para leer órdenes como «V128» (letra y número) en una Uno que debe funcionar meses, ¿qué es más robusto?', ['Leer carácter a carácter en un array de char de tamaño fijo', 'Concatenar Strings sin límite', 'Esperar con delay() a que llegue todo', 'Leer solo el primer carácter'], 'Un array fijo no fragmenta la RAM. Comprueba siempre que no te pasas de su tamaño.')
 ]),
 L('n4', 'Entradas y pull-up', 'chip', ['pullup'], [
  I('<b>digitalRead(pin)</b> devuelve HIGH o LOW según la tensión del pin. En la Uno a 5 V, por encima de unos 3 V es HIGH y por debajo de 1,5 V es LOW. En medio no está garantizado qué leerá.', { code: 'pinMode(2, INPUT);\nint estado = digitalRead(2);   // HIGH o LOW' }),
  Q('Un pin de la Uno está a 2,2 V. ¿Qué lee digitalRead()?', ['No está garantizado: es la zona indefinida', 'HIGH', 'LOW', '2,2'], 'Entre 1,5 y 3 V el chip puede leer cualquiera de los dos.', { c: 'logic' }),
  Q('Un pin en INPUT sin nada conectado. ¿Qué lee?', ['Cualquier cosa: flota y cambia con el ruido o al acercar la mano', 'Siempre LOW', 'Siempre HIGH', 'Da error'], 'Una entrada al aire es una antena: necesita una resistencia que la fije.'),
  I('Un pin de entrada sin conectar “flota”. Una <b>pull-up</b> lo mantiene en HIGH; el pulsador lo lleva a masa al pulsar. <b>INPUT_PULLUP</b> activa la interna.'),
  Q('Con INPUT_PULLUP, al pulsar se lee…', ['LOW', 'HIGH', 'Depende', '1023'], 'Lógica invertida.'),
  I('La pull-up interna de la Uno es de unos 20–50 kΩ. También se puede usar una <b>pull-down</b> externa: resistencia del pin a GND y pulsador al 5V. Así, pulsado lee HIGH, que resulta más intuitivo, a cambio de una pieza más.'),
  Nm('Pull-up externa de 10 kΩ a 5 V. Con el botón pulsado, ¿cuánta corriente pasa por ella, en mA?', 0.5, 'mA', '5 / 10 000 = 0,5 mA. Por eso las pull-up son de varios kΩ: si fueran pequeñas, gastarían mucho al pulsar.', { tol: 0.02, c: 'ohm' }),
  { t: 'match', q: 'Une cada configuración.', pairs: [['INPUT', 'Entrada sin resistencia interna'], ['INPUT_PULLUP', 'Entrada con pull-up interna'], ['OUTPUT', 'Salida'], ['Pull-down externa', 'Pulsado lee HIGH']] },
  { t: 'pin', q: '¿Dónde va la otra pata del pulsador?', code: 'pinMode(2, INPUT_PULLUP);\n// pulsador entre el pin 2 y ...', a: 'GND', e: 'A masa.' },
  Q('¿Qué hace?', ['Enciende el LED mientras se pulsa', 'Al soltar', 'Parpadea', 'Nada'], 'LOW = pulsado.', { code: 'if (digitalRead(2) == LOW) {\n  digitalWrite(13, HIGH);\n} else {\n  digitalWrite(13, LOW);\n}' })
 ]),
 SIM('s7c', 'Reto: pulsador', 'El LED del 13 se enciende solo mientras pulsas el botón del 2.', { arduino: 'boton', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D2 y GND. LED con resistencia en D13.' }, 'button'),
 L('n17', 'Rebotes y flancos', 'chip', ['mc_debounce'], [
  I('Un pulsador por dentro son dos láminas de metal. Al cerrarse <b>rebotan</b> varias veces durante unos milisegundos antes de quedarse quietas. Para ti es una pulsación; para el microcontrolador, que lee miles de veces por segundo, pueden ser muchas.\nAbajo: dos pulsaciones reales y lo que el programa acepta si ignora los cambios durante un tiempo tras cada uno.', { tune: { viz: 'mc_bounce', params: { T: { label: 'Tiempo de antirrebote', val: 0, min: 0, max: 120, step: 1, unit: 'ms', dec: 0 } } } }),
  TU('Ajusta el antirrebote para detectar exactamente las 2 pulsaciones reales.', 'mc_bounce', { T: { label: 'Tiempo de antirrebote', val: 0, min: 0, max: 120, step: 1, unit: 'ms', dec: 0 } }, { q: 'n', min: 2, max: 2, text: 'Objetivo: 2 pulsaciones detectadas', hint: 'Más largo que los rebotes, pero no tanto como para tragarse la siguiente pulsación.' }, 'Aquí vale de 8 a 58 ms. En la práctica se usan 20–50 ms.'),
  Q('Con un antirrebote de 100 ms en ese ejemplo, ¿qué pasa?', ['La segunda pulsación se pierde: el programa sigue ignorando cambios cuando llega', 'Cuenta de más', 'La placa se reinicia', 'Nada: cuanto más, mejor'], 'Hay que equilibrar: lo justo para tapar los rebotes sin perder pulsaciones rápidas.'),
  I('Dos formas de usar un botón:\n· <b>Nivel</b>: «mientras esté pulsado, haz X» (un acelerador).\n· <b>Flanco</b>: «cuando se acaba de pulsar, haz X una vez» (encender y apagar, contar, cambiar de pantalla).\nPara el flanco hay que <b>recordar la lectura anterior</b> y compararla con la actual.'),
  Q('¿Qué hace este programa si mantienes el botón pulsado 2 segundos?', ['Cambia el LED cientos de veces: al soltar queda al azar', 'Lo cambia una sola vez', 'Lo deja encendido 2 s', 'Nada'], 'Mira el nivel, no el flanco: invierte el LED en cada vuelta de loop() mientras sigue pulsado.', { code: 'void loop() {\n  if (digitalRead(2) == LOW) {\n    led = !led;\n    digitalWrite(13, led);\n  }\n}' }),
  I('Flanco con antirrebote, sin bloquear:', { code: 'bool antes = HIGH;\nunsigned long tCambio = 0;\n\nvoid loop() {\n  bool ahora = digitalRead(2);\n  if (ahora != antes && millis() - tCambio > 30) {\n    tCambio = millis();\n    if (ahora == LOW) {     // flanco de bajada: se acaba de pulsar\n      led = !led;\n      digitalWrite(13, led);\n    }\n    antes = ahora;\n  }\n}' }),
  Q('Con INPUT_PULLUP, «se acaba de pulsar» es el paso de…', ['HIGH a LOW (flanco de bajada)', 'LOW a HIGH (flanco de subida)', 'LOW a LOW', 'HIGH a HIGH'], 'Suelto lee HIGH y pulsado, LOW. Al soltar hay un flanco de subida.', { c: 'pullup' }),
  Q('En ese código, ¿para qué sirve millis() - tCambio > 30?', ['Ignora los cambios que llegan menos de 30 ms después del último aceptado: los rebotes', 'Espera 30 ms bloqueando el programa', 'Limita el brillo del LED', 'Cuenta 30 pulsaciones'], 'Sin delay(): el resto del programa sigue funcionando.'),
  Q('¿Por qué antes = ahora; va dentro del if?', ['Para que la siguiente comparación sea con el último cambio aceptado', 'Es indiferente dónde vaya', 'Para borrar la lectura', 'Porque si no, no compila'], 'Si guardaras cada lectura cruda, los rebotes ignorados se colarían en la siguiente comparación.'),
  { t: 'match', q: '¿Por nivel o por flanco?', pairs: [['Pedal de un coche de juguete', 'Nivel'], ['Encender y apagar una lámpara', 'Flanco'], ['Contar personas que pasan', 'Flanco '], ['Mantener pulsado para subir el volumen', 'Nivel ']] },
  I('También hay antirrebote por hardware: un condensador pequeño (por ejemplo, 100 nF) entre el pin y masa, junto a la resistencia de pull-up, suaviza los rebotes; un disparador Schmitt deja la señal limpia. Por software sale gratis, así que es lo más habitual.')
 ]),
 SIM('s7f', 'Reto: interruptor con un pulsador (ESP32)', 'Ahora con un ESP32, que trabaja a 3,3 V. Cada pulsación del botón del GPIO4 enciende o apaga el LED del GPIO23, y se queda así al soltar: flanco con antirrebote.', { arduino: 'mc_toggle', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Pulsador entre D4 y GND. D23 → 220 Ω → ánodo; cátodo a GND. Con 3,3 V, una de 470 Ω deja el LED muy tenue. Pulsa, suelta y vuelve a pulsar.' }, 'mc_toggle'),
 L('n5', 'Entradas analógicas', 'chip', ['adc'], [
  I('El <b>ADC</b> convierte tensión en número. Uno: 10 bits (0–1023 para 0–5 V). ESP32: 12 bits (0–4095 para 0–3,3 V).'),
  I('<b>analogRead(A0)</b> devuelve un número de 0 a 1023. Para pasarlo a voltios: <b>V = lectura × 5 / 1023</b>. En la Uno cada lectura tarda unos 0,1 ms.', { code: 'int lectura = analogRead(A0);          // 0..1023\nfloat v = lectura * 5.0 / 1023;        // 0..5 V' }),
  G('adc'), G('adc'),
  Q('Hay 2,5 V en A0 de una Uno. ¿Qué imprime?', ['Unos 511', '2,5', '1023', '255'], '2,5 / 5 × 1023 ≈ 511. analogRead devuelve el número, no los voltios.', { code: 'Serial.println(analogRead(A0));' }),
  Q('¿Cómo lees un potenciómetro?', ['Extremos a 5 V y GND, cursor a una entrada analógica', 'Los tres a GND', 'Cursor a 5 V', 'En serie con un LED'], 'Divisor ajustable.', { c: 'divider' }),
  Q('lectura vale 1023. ¿Cuánto vale p?', ['100', '1023', '10', '0'], 'map() pasa de un rango a otro con una regla de tres: el máximo de entrada da el máximo de salida.', { code: 'int p = map(lectura, 0, 1023, 0, 100);   // porcentaje' }),
  Q('¿Puedes conectar los 9 V de una pila a A0 para medirla?', ['No: la entrada no debe pasar de 5 V; usa un divisor de tensión', 'Sí, sin problema', 'Sí, si es analógica', 'Solo con el pin 13'], 'Más tensión que la alimentación puede dañar el pin. Con dos resistencias iguales, 9 V se quedan en 4,5 V.', { c: 'divider' }),
  Nm('Mides una batería con un divisor de dos resistencias iguales. Entran 7,2 V. ¿Qué lectura da analogRead en la Uno?', 737, '', 'El divisor deja 3,6 V; 3,6 / 5 × 1023 ≈ 737.', { tol: 2, c: 'divider' }),
  G('adc'),
  Nm('Resolución de la Uno: mV por paso (5 V / 1024)', 4.88, 'mV', '≈ 4,88 mV.', { tol: 0.05 })
 ]),
 L('n6', 'PWM: brillo y velocidad', 'chip', ['pwm'], [
  I('Encendiendo y apagando muy rápido, la media es intermedia: <b>PWM</b>.', { tune: { viz: 'pwm', params: { D: { label: 'Ciclo de trabajo', val: 50, min: 0, max: 100, step: 1, unit: '%', dec: 0 } } } }),
  TU('Pon el LED al 25 %.', 'pwm', { D: { label: 'Ciclo de trabajo', val: 80, min: 0, max: 100, step: 1, unit: '%', dec: 0 } }, { q: 'b', min: 0.24, max: 0.26, text: 'Objetivo: 25 %', hint: 'Ciclo del 25 %.' }, 'analogWrite(64).'),
  { t: 'pin', q: 'Elige un pin de la Uno que sirva para analogWrite.', a: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'], e: 'Los marcados con ~.' },
  I('<b>analogWrite(pin, valor)</b> recibe de 0 (siempre apagado) a 255 (siempre encendido). No da una tensión intermedia de verdad: es una onda cuadrada de unos 490 Hz (980 Hz en los pines 5 y 6) cuyo tiempo encendido cambia. El multímetro, que promedia, marca la media.', { code: 'analogWrite(9, 64);    // 25 % del tiempo a 5 V' }),
  G('pwm'),
  Q('analogWrite(9, 128) en una Uno. ¿Qué marca un multímetro en continua entre el pin 9 y GND?', ['Unos 2,5 V: la media', '5 V', '128 V', '0 V'], '128 / 255 ≈ 50 % de 5 V. Con el osciloscopio verías la cuadrada de 0 y 5 V.', { c: 'pwm' }),
  Q('¿Cuánto tarda en subir de apagado a brillo máximo?', ['Unos 1,6 s', '30 ms', '255 s', '7,6 s'], 'De 0 a 255 en saltos de 5 son 52 pasos de 30 ms: unos 1,56 s.', { code: 'for (int b = 0; b <= 255; b += 5) {\n  analogWrite(9, b);\n  delay(30);\n}' }),
  Q('¿Sirve el PWM para regular la velocidad de un motor de 12 V?', ['Sí, a través de un transistor o un driver, nunca directo al pin', 'Sí, directo al pin', 'No, solo sirve para LEDs', 'Solo con motores de 5 V'], 'El pin da la señal; el transistor conmuta la corriente del motor al mismo ritmo.', { c: 'bjt' }),
  G('pwm')
 ]),
 SIM('s7d', 'Reto: regulador de brillo', 'Controla el brillo del LED con el potenciómetro.', { arduino: 'pot', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 5V y GND, cursor a A0. LED con resistencia en el 9.' }, 'dimmer'),
 SIM('s7i', 'Reto: barra de nivel (ESP32)', 'Un potenciómetro en el GPIO34 enciende de 0 a 3 LEDs según su posición, con un array de pines y un bucle. Consigue ver los tres encendidos y los tres apagados.', { arduino: 'mc_bar', board: 'esp32', parts: ['pot', 'res', 'led'], code: true, hint: 'Potenciómetro: extremos a 3V3 y GND, cursor a D34 (solo entrada). LEDs en D25, D26 y D27, cada uno con 220 Ω a GND. Gira el cursor de un extremo al otro.' }, 'mc_bar'),
 L('n7', 'Tiempo sin bloquear: millis()', 'chip', ['mc_millis'], [
  I('delay() congela el programa. <b>millis()</b> devuelve los ms desde el arranque; comparando con el instante anterior haces varias cosas “a la vez”.'),
  Q('Problema de delay(5000) en un programa con botón:', ['5 s sin leer el botón', 'Ninguno', 'Quema el LED', 'Reinicia la placa'], 'Por eso millis().'),
  I('El parpadeo sin delay(), completo: se apunta cuándo fue el último cambio y, en cada vuelta, se mira si ya ha pasado el intervalo.', { code: 'unsigned long antes = 0;\nbool estado = false;\n\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  if (millis() - antes >= 500) {\n    antes = millis();\n    estado = !estado;\n    digitalWrite(13, estado);\n  }\n  // aquí cabe todo lo demás: botones, sensores…\n}' }),
  Nm('millis() vale 12 500 y antes vale 12 000. ¿Cuántos ms han pasado?', 500, 'ms', '12 500 − 12 000 = 500 ms: justo el intervalo, así que toca cambiar.'),
  Q('¿De qué tipo debe ser la variable antes?', ['unsigned long, el mismo que devuelve millis()', 'int', 'byte', 'float'], 'En un int de la Uno, millis() deja de caber a los 33 s.', { c: 'mc_types' }),
  Q('Quieres el LED 100 ms encendido y 900 ms apagado, sin delay(). ¿Qué cambia respecto al parpadeo simétrico?', ['El intervalo depende de si el LED está encendido o apagado', 'Nada: basta un intervalo de 500 ms', 'Hay que usar dos placas', 'No se puede con millis()'], 'Por ejemplo: intervalo = estado ? 100 : 900.'),
  Q('¿Qué hace?', ['Cambia el LED cada 500 ms sin bloquear', 'Espera 500 s', 'Apaga', 'Nada'], 'Blink sin delay.', { code: 'if (millis() - antes >= 500) {\n  antes = millis();\n  estado = !estado;\n  digitalWrite(13, estado);\n}' }),
  G('millis'),
  Q('Serial.println(valor) sirve para…', ['Ver datos en el ordenador por USB', 'Encender un LED', 'Leer un pin', 'Esperar'], 'Tu mejor herramienta de depuración.')
 ]),
 L('n18', 'Varias tareas a la vez', 'timer', ['mc_millis'], [
  I('Un microcontrolador sencillo hace una sola cosa cada vez, pero muy deprisa. El truco para que parezca que hace varias: que <b>ninguna tarea bloquee</b>. Cada una mira el reloj, hace su parte si le toca y devuelve el control enseguida.'),
  I('Patrón: cada tarea tiene su propia variable con el instante de la última vez y su propio intervalo.', { code: 'unsigned long tLed = 0, tSensor = 0;\n\nvoid loop() {\n  unsigned long ahora = millis();\n  if (ahora - tLed >= 500) {       // tarea 1: cada 500 ms\n    tLed = ahora;\n    led = !led;\n    digitalWrite(13, led);\n  }\n  if (ahora - tSensor >= 2000) {   // tarea 2: cada 2 s\n    tSensor = ahora;\n    Serial.println(analogRead(A0));\n  }\n  // tarea 3: leer el botón, en cada vuelta\n}' }),
  Q('Con ese programa, ¿cuántas veces se imprime el sensor en un minuto?', ['30', '120', '60', '2'], '60 000 ms / 2000 ms = 30.'),
  G('mcMillisTask'),
  Q('¿Cuánto tarda en reaccionar al botón (tarea 3) si ninguna tarea usa delay()?', ['Casi nada: loop() da miles de vueltas por segundo', 'Hasta 2 s', 'Hasta 500 ms', 'Nunca reacciona'], 'Cada vuelta de loop() es rapidísima porque ninguna tarea se queda esperando.'),
  Q('¿Dónde está el fallo?', ['delay(1000) bloquea: el LED ya no puede cambiar cada 200 ms', 'tLed debería ser int', 'millis() no puede usarse dos veces', 'Ninguno'], 'Una sola tarea con delay() estropea el ritmo de todas las demás.', { code: 'void loop() {\n  if (millis() - tLed >= 200) {\n    tLed = millis();\n    led = !led;\n    digitalWrite(13, led);\n  }\n  Serial.println(analogRead(A0));\n  delay(1000);\n}' }),
  I('¿Y cuando millis() llegue a su máximo y vuelva a 0, a los 49,7 días? Si comparas como <b>ahora − antes >= intervalo</b> con unsigned long, la resta sin signo también da la vuelta y el resultado sigue siendo correcto. Escrito como ahora >= antes + intervalo, falla justo en ese momento.'),
  Q('¿Qué comparación sigue funcionando cuando millis() se desborda?', ['millis() - antes >= 1000', 'millis() >= antes + 1000', 'millis() > 1000', 'millis() == antes + 1000'], 'La resta de unsigned long da la diferencia correcta aunque el contador haya pasado por cero.'),
  Q('¿Qué problema tiene millis() == antes + 1000?', ['Si alguna vuelta de loop() tarda más de 1 ms, se salta ese milisegundo exacto y no se cumple nunca', 'Ninguno', 'No compila', 'Gasta más RAM'], 'Usa siempre >=.'),
  I('Si necesitas un ritmo exacto a largo plazo, avanza el instante con <b>tLed += 500</b> en vez de tLed = ahora: así los pequeños retrasos de cada vuelta no se acumulan.'),
  Nm('Una tarea va cada 250 ms y otra cada 1000 ms. ¿Cuántas ejecuciones hay en total en 10 s?', 50, 'veces', '10 000 / 250 = 40 y 10 000 / 1000 = 10.'),
  Q('Quieres que el LED parpadee cada 100 ms solo mientras el botón esté pulsado y se apague al soltarlo. ¿Qué estructura?', ['Un if que mira el botón en cada vuelta y, dentro, la tarea de parpadeo con millis()', 'Un while que espera al botón', 'Un for con delay(100)', 'Una interrupción con delay() dentro'], 'Comprobar y seguir, nunca esperar.')
 ]),
 SIM('s7g', 'Reto: dos ritmos a la vez (ESP32)', 'Dos tareas con millis() y sin delay(): el LED del GPIO25 cambia cada 250 ms y el del GPIO26, cada segundo. Conéctalos y comprueba que cada uno lleva su ritmo.', { arduino: 'mc_multi', board: 'esp32', parts: ['res', 'led'], code: true, hint: 'D25 → 220 Ω → LED → GND, y D26 → 220 Ω → otro LED → GND. Déjalo correr unos segundos.' }, 'mc_multi'),
 L('n19', 'Máquinas de estados', 'code', ['mc_fsm'], [
  I('Muchos aparatos se comportan según <b>en qué fase están</b>: una lavadora llena, lava, aclara y centrifuga. Eso es una <b>máquina de estados</b>: una lista de estados y unas reglas, las <b>transiciones</b>, que dicen cuándo se pasa de uno a otro.'),
  I('En C++ los estados se nombran con <b>enum</b> y se reparten con <b>switch</b>. En cada vuelta de loop() solo se ejecuta el código del estado actual.', { code: 'enum Estado { REPOSO, REGANDO, ESPERA };\nEstado estado = REPOSO;\n\nvoid loop() {\n  switch (estado) {\n    case REPOSO:\n      if (sueloSeco()) { abrirValvula(); t0 = millis(); estado = REGANDO; }\n      break;\n    case REGANDO:\n      if (millis() - t0 >= 10000) { cerrarValvula(); t0 = millis(); estado = ESPERA; }\n      break;\n    case ESPERA:\n      if (millis() - t0 >= 60000) estado = REPOSO;\n      break;\n  }\n}' }),
  Q('En ese riego, con el suelo siempre seco, ¿cuánto tiempo pasa entre el inicio de un riego y el del siguiente?', ['Unos 70 s', '10 s', '60 s', '0 s'], '10 s regando más 60 s de espera antes de volver a mirar el suelo.'),
  Q('¿Qué pasa si olvidas el break de case REPOSO?', ['Al cumplirse, también se ejecuta el código de REGANDO en la misma vuelta', 'No compila', 'Nada', 'Se reinicia la placa'], 'Sin break, el switch «se cae» al case siguiente. A veces se hace a propósito; casi siempre es un fallo.'),
  { t: 'order', q: 'Ordena los estados de un microondas sencillo.', items: ['REPOSO: puerta cerrada y nada elegido', 'PROGRAMANDO: eliges el tiempo', 'CALENTANDO: cuenta atrás', 'AVISO: pita y vuelve a reposo'], e: 'Cada estado sabe a cuál pasa y cuándo.' },
  I('Ventajas: cada estado es pequeño y fácil de leer, nada bloquea (los tiempos se miden con millis) y añadir un comportamiento nuevo es añadir un estado. Dibujarla antes en papel, con círculos y flechas, ahorra horas.'),
  Q('Semáforo con pulsador de peatón: VERDE → (pulsan) → ÁMBAR → (2 s) → ROJO → (?) → VERDE. ¿Qué provoca la última transición?', ['Que pase el tiempo del paso de peatones', 'Que vuelvan a pulsar', 'Nada: ROJO es el final', 'Que se apague la placa'], 'Las transiciones pueden ser eventos (pulsar) o tiempos.'),
  Q('Estado inicial APAGADO. ¿Qué imprime la primera llamada a alPulsar()?', ['ENCENDIDO', 'APAGADO', 'Nada', 'Las dos palabras'], 'Mira el estado actual (APAGADO), pasa al otro y lo anuncia.', { code: 'enum Modo { APAGADO, ENCENDIDO };\nModo modo = APAGADO;\n\nvoid alPulsar() {\n  if (modo == APAGADO) {\n    modo = ENCENDIDO;\n    Serial.println("ENCENDIDO");\n  } else {\n    modo = APAGADO;\n    Serial.println("APAGADO");\n  }\n}' }),
  Q('Un temporizador de cocina con botón de parar. ¿Dónde está el fallo?', ['delay(5000) bloquea: durante esos 5 s el botón de parar no responde', 'tone() no puede ir dentro de un switch', 'Falta un break en CONTANDO', 'duracion debería ser byte'], 'Mide el tiempo del pitido con millis() en el propio estado SONANDO.', { code: 'case CONTANDO:\n  if (millis() - t0 >= duracion) estado = SONANDO;\n  break;\ncase SONANDO:\n  tone(8, 1000);\n  delay(5000);\n  noTone(8);\n  estado = REPOSO;\n  break;' }),
  { t: 'match', q: 'Une cada estado de un ascensor con lo que lo hace salir de él.', pairs: [['PARADO', 'Alguien llama desde otra planta'], ['SUBIENDO', 'El sensor detecta la planta destino'], ['PUERTAS_ABIERTAS', 'Pasan 5 s sin nadie en la puerta']] },
  Q('¿Para qué guardar t0 = millis() justo al cambiar de estado?', ['Para saber cuánto tiempo lleva en el estado actual', 'Para gastar menos energía', 'Porque switch lo exige', 'Para poner millis() a cero'], 'millis() − t0 es el tiempo dentro del estado.')
 ]),
 SIM('s7h', 'Reto: semáforo con peatón (ESP32)', 'Una máquina de estados: verde fijo hasta que un peatón pulsa; entonces ámbar 2 s, rojo 3 s y vuelta al verde. Monta las tres luces y el pulsador.', { arduino: 'mc_fsm', board: 'esp32', parts: ['push', 'res', 'led'], code: true, hint: 'Rojo en D25, ámbar en D26 y verde en D27, cada uno con 220 Ω a GND. Pulsador entre D4 y GND. Espera unos 5 s sin pulsar y luego pulsa.' }, 'mc_fsm'),
 L('n20', 'Interrupciones', 'bolt', ['mc_isr'], [
  I('Una <b>interrupción</b> es un aviso del hardware: el procesador deja lo que esté haciendo, ejecuta una función corta (la <b>ISR</b>, rutina de servicio) y vuelve justo donde estaba.\nComo el timbre de casa: no vas a mirar la puerta cada minuto; suena y vas.'),
  Q('¿Cuándo compensa una interrupción frente a leer el pin en loop()?', ['Con pulsos muy cortos o que no te puedes perder, como los de un encoder', 'Siempre, para cualquier botón', 'Para encender un LED', 'Para poder usar delay()'], 'Si loop() es ágil, un botón normal se lee bien sin interrupciones. Un pulso de microsegundos, no.'),
  I('En la Uno y la Nano, las interrupciones externas están en los pines <b>2 y 3</b>. En el ESP32, casi cualquier GPIO sirve.', { code: 'volatile unsigned long pulsos = 0;\n\nvoid contar() {        // la ISR: corta, sin parámetros, sin return\n  pulsos++;\n}\n\nvoid setup() {\n  pinMode(2, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(2), contar, FALLING);\n}' }),
  { t: 'pin', q: 'En una Uno, ¿qué pin elegirías para un sensor de pulsos con attachInterrupt? (elige uno)', a: ['D2', 'D3'], e: 'INT0 está en el 2 e INT1 en el 3. Los demás pines tienen interrupciones por cambio de pin, que se configuran de otra forma.' },
  { t: 'match', q: 'Une cada modo de attachInterrupt.', pairs: [['RISING', 'Al pasar de LOW a HIGH'], ['FALLING', 'Al pasar de HIGH a LOW'], ['CHANGE', 'En cualquier cambio'], ['LOW', 'Mientras esté en LOW']] },
  I('<b>volatile</b> avisa al compilador de que la variable puede cambiar «por sorpresa» en cualquier momento. Sin él, el compilador puede guardar una copia en un registro del procesador y loop() no vería nunca el cambio.'),
  Q('¿Por qué pulsos lleva volatile?', ['Porque la cambia la ISR y la lee loop(): el compilador no debe dar su valor por sabido', 'Para que ocupe menos', 'Para que sea más rápida', 'Porque es unsigned long'], 'Toda variable compartida entre una ISR y el resto del programa debe ser volatile.'),
  I('Reglas de una buena ISR:\n· <b>Corta</b>: anota lo que ha pasado y sal. El trabajo pesado, en loop().\n· Sin <b>delay()</b> ni Serial.print: se apoyan en otras interrupciones, que están en pausa mientras corre la tuya, y pueden fallar o bloquearse.\n· Dentro de la ISR, millis() no avanza.'),
  Q('¿Dónde está el fallo?', ['La ISR imprime por Serial y espera 50 ms: debe ser cortísima', 'Falta volatile en el nombre de la función', 'FALLING no existe', 'Ninguno'], 'Anota el evento en una variable volatile y deja que loop() imprima.', { code: 'void alPulsar() {     // ISR del pin 2\n  Serial.println("¡Pulsado!");\n  delay(50);\n}' }),
  I('Un detalle más: en la Uno, leer un unsigned long son 4 lecturas de 1 byte. Si la ISR lo cambia justo a mitad, lees un valor mezclado. Copia la variable con las interrupciones en pausa un instante.', { code: 'noInterrupts();\nunsigned long copia = pulsos;\ninterrupts();\nSerial.println(copia);' }),
  Q('Un anemómetro da 2 pulsos por vuelta y en 1 s cuentas 30. ¿Cuántas vueltas por segundo?', ['15', '30', '60', '2'], '30 / 2 = 15 vueltas por segundo.'),
  Q('Un pulsador con rebotes conectado a una interrupción FALLING…', ['Puede disparar la ISR varias veces por pulsación: también necesita antirrebote', 'Solo la dispara una vez', 'No la dispara nunca', 'Reinicia la placa'], 'Para el hardware, cada rebote es un flanco real.', { c: 'mc_debounce' })
 ]),
 L('n21', 'Memoria: Flash, RAM y EEPROM', 'memory', ['mc_memory'], [
  I('El ATmega328P de la Uno tiene tres memorias:\n· <b>Flash</b> (32 KB): el programa. No se borra al quitar la corriente.\n· <b>SRAM</b> (2 KB): las variables mientras funciona. Se pierde al apagar.\n· <b>EEPROM</b> (1 KB): datos que quieres conservar, como un récord o una calibración.'),
  { t: 'match', q: '¿Dónde se guarda cada cosa?', pairs: [['El código de loop()', 'Flash'], ['Un contador que cambia cada segundo', 'SRAM'], ['La puntuación máxima de un juego', 'EEPROM'], ['Un texto constante escrito con F()', 'Flash ']] },
  Q('Al compilar, el IDE dice que las variables globales usan 1890 bytes (92 %) de la memoria dinámica. ¿Qué significa?', ['Quedan unos 150 bytes de RAM para la pila y las variables locales: riesgo de cuelgues', 'El programa ocupa casi toda la Flash', 'Todo va bien', 'Hay que borrar la EEPROM'], 'La memoria dinámica es la SRAM. Las funciones necesitan RAM libre para sus variables locales mientras se ejecutan.'),
  I('Cuando se acaba la RAM no hay mensaje de error: la <b>pila</b> (variables locales, direcciones de vuelta de las funciones) crece y pisa otras variables. Síntomas: reinicios, valores absurdos y cuelgues que pasan «a veces».'),
  I('Truco barato: cada texto entre comillas se copia en la RAM al arrancar. Con <b>F()</b> se queda en la Flash y se lee desde allí.\nPara tablas grandes y constantes (una melodía, una curva de calibración) está <b>PROGMEM</b>, que también las deja en la Flash; se leen con funciones especiales como pgm_read_byte().', { code: 'Serial.println(F("Sistema listo. Pulsa A para empezar."));' }),
  Q('¿Qué línea ahorra RAM en la Uno?', ['Serial.println(F("Error de sensor"));', 'Serial.println("Error de sensor");', 'String s = "Error de sensor"; Serial.println(s);', 'char s[] = "Error de sensor"; Serial.println(s);'], 'F() deja el texto en la Flash. Las otras tres lo copian en la RAM.'),
  Q('Este programa funciona horas y luego se cuelga. ¿Sospechoso principal?', ['Crear y destruir Strings en cada vuelta puede fragmentar la poca RAM de la Uno', 'millis() se desborda a las 2 horas', 'La EEPROM se llena', 'El LED se gasta'], 'Con 2 KB, los huecos que dejan los Strings acaban impidiendo reservar memoria. Mejor arrays de char de tamaño fijo, o imprimir los datos uno a uno.', { code: 'void loop() {\n  String linea = "T=" + String(leerTemp()) + " H=" + String(leerHum());\n  Serial.println(linea);\n  delay(1000);\n}' }),
  I('La <b>EEPROM</b> conserva los datos sin corriente, pero cada celda aguanta unas <b>100 000 escrituras</b>. Lee todo lo que quieras; escribe solo cuando cambie algo. <b>EEPROM.put()</b> y <b>EEPROM.get()</b> guardan y leen variables de cualquier tipo.', { code: '#include <EEPROM.h>\n\nunsigned int record;\n\nvoid setup() {\n  EEPROM.get(0, record);     // lee 2 bytes desde la dirección 0\n}\n\nvoid nuevoRecord(unsigned int ms) {\n  record = ms;\n  EEPROM.put(0, record);     // solo reescribe los bytes que cambian\n}' }),
  Q('Guardas una lectura en la misma celda en cada vuelta de loop(), unas 1000 veces por segundo. ¿Qué pasa?', ['En menos de dos minutos superas las 100 000 escrituras de esa celda', 'Nada: la EEPROM es eterna', 'Se llena y deja de grabar', 'Se borra la Flash'], '100 000 / 1000 = 100 s. Graba solo cuando haga falta.'),
  G('mcEeprom'),
  Q('Una EEPROM sin estrenar tiene todos sus bytes a 255. ¿Qué devuelve EEPROM.get() en un unsigned int la primera vez?', ['65 535', '0', '255', 'Un error'], 'Dos bytes a 0xFF forman 0xFFFF = 65 535. Compruébalo en setup() para saber que aún no hay nada guardado.'),
  Nm('¿Cuántos float (4 bytes) caben en la EEPROM de 1 KB de la Uno?', 256, 'float', '1024 / 4 = 256.'),
  I('En el ESP32, la Pico o los STM32 la RAM es mucho mayor (cientos de KB) y la EEPROM se imita guardando en la Flash (en el ESP32, por ejemplo, con la librería Preferences). Las ideas son las mismas: la RAM se pierde al apagar y la memoria permanente se desgasta al escribir.')
 ]),
 PRJ('p20', 'Proyecto: duelo de reflejos', 'mc_reflex'),
 L('n8', 'Sensores y comunicación', 'chip', ['mc_lib'], [
  I('Muchos sensores y pantallas no dan una tensión, sino que <b>envían números</b> por unos pocos cables siguiendo un protocolo. Los tres más comunes:\n· <b>I²C</b>: SDA y SCL, muchos dispositivos con direcciones.\n· <b>SPI</b>: cuatro cables, más rápido.\n· <b>UART</b>: TX y RX.'),
  { t: 'match', q: 'Une cada bus.', pairs: [['I²C', 'SDA y SCL'], ['SPI', 'MOSI, MISO, SCK, CS'], ['UART', 'TX y RX']] },
  I('<b>I²C</b>: dos cables compartidos por todos los dispositivos. La placa llama a uno por su <b>dirección</b> (por ejemplo, 0x3C) y solo ese responde. Velocidades típicas: 100 o 400 kHz. En la Uno, SDA está en A4 y SCL en A5.'),
  Q('¿Cuántos dispositivos I²C caben en el mismo par de cables?', ['Muchos, siempre que tengan direcciones distintas', 'Solo uno', 'Dos como máximo', 'Ninguno: cada uno necesita su bus'], 'La dirección es lo que los distingue.'),
  I('<b>SPI</b>: MOSI (datos de la placa al dispositivo), MISO (al revés), SCK (reloj) y una línea <b>CS</b> por dispositivo para elegir con quién se habla. Llega a varios MHz: pantallas y tarjetas SD.\n<b>UART</b>: solo dos dispositivos, TX y RX cruzados, y los dos a la misma velocidad.'),
  Q('Tres dispositivos SPI en el mismo bus. ¿Cuántas líneas CS necesitas?', ['3, una por dispositivo', '1', '0', '6'], 'MOSI, MISO y SCK se comparten; CS es individual.'),
  Q('El TX de una placa va al… del otro', ['RX', 'TX', 'GND', 'VCC'], 'Lo que uno envía, el otro recibe.'),
  { t: 'match', q: '¿Qué bus suele usar cada módulo?', pairs: [['Pantalla OLED pequeña de 4 pines', 'I²C'], ['Lector de tarjetas microSD', 'SPI'], ['Módulo GPS', 'UART']] },
  Q('Quieres conectar un GPS por UART a una Uno, pero su único puerto serie va al USB. ¿Qué opción tienes?', ['Usar otros pines con SoftwareSerial, o una placa con más puertos serie', 'Conectarlo también a los pines 0 y 1 a la vez que el USB', 'Conectarlo a A0', 'No se puede'], 'Compartir 0 y 1 con el USB da conflictos. El ESP32 tiene varios puertos serie por hardware.'),
  Q('¿Por qué I²C necesita pull-ups?', ['Las salidas solo tiran hacia masa (colector abierto)', 'Para limitar tensión', 'Para pitar', 'No las necesita'], 'Típico 4,7 kΩ.', { c: 'pullup' })
 ]),
 L('n22', 'Librerías, clases y objetos', 'code', ['mc_lib'], [
  I('Una <b>librería</b> es código que otra persona ya escribió y probó para manejar algo concreto: un sensor, una pantalla, un servo. Te ahorra leerte la hoja de datos entera para empezar.\nSe instalan desde el <b>Gestor de librerías</b> del IDE y se incluyen con #include.'),
  { t: 'order', q: 'Ordena cómo empezar con un módulo nuevo usando una librería.', items: ['Averigua qué chip lleva el módulo (por ejemplo, BME280)', 'Instala su librería desde el Gestor de librerías', 'Abre uno de sus ejemplos (Archivo → Ejemplos)', 'Ajusta pines o dirección y súbelo tal cual', 'Cuando funcione, lleva a tu programa lo que necesites'], e: 'Empieza siempre por un ejemplo que funcione: si falla, el problema es el montaje, no tu código.' },
  I('Casi todas las librerías se usan con <b>objetos</b>. Una <b>clase</b> es el molde (por ejemplo, Servo) y cada <b>objeto</b> es una pieza hecha con ese molde (brazo, pinza). Cada objeto guarda sus propios datos y tiene sus <b>métodos</b>, que se llaman con un punto.', { code: '#include <Servo.h>\n\nServo brazo;          // un objeto de la clase Servo\nServo pinza;          // otro, independiente\n\nvoid setup() {\n  brazo.attach(9);    // método attach del objeto brazo\n  pinza.attach(10);\n}\n\nvoid loop() {\n  brazo.write(90);\n  pinza.write(20);\n}' }),
  Q('En ese código, ¿qué es Servo?', ['La clase: el molde', 'Un objeto', 'Un método', 'Un pin'], 'brazo y pinza son objetos; attach y write, métodos.'),
  Q('¿Qué hace pinza.write(20)?', ['Mueve solo el servo conectado al pin 10', 'Mueve los dos servos', 'Escribe 20 en el Monitor serie', 'Configura el pin 20'], 'Cada objeto recuerda su propio pin.'),
  I('Algunos objetos se crean con datos entre paréntesis: es el <b>constructor</b>. Por ejemplo, un sensor DHT necesita saber su pin y su modelo.', { code: '#include <DHT.h>\n\nDHT sensor(4, DHT22);   // pin 4, modelo DHT22\n\nvoid setup() {\n  sensor.begin();\n}' }),
  Q('Al compilar sale «DHT.h: No such file or directory». ¿Primera sospecha?', ['La librería no está instalada o el nombre del #include no coincide', 'El sensor está mal conectado', 'Falta Serial.begin()', 'El cable USB'], 'Es un error de compilación: el programa aún no ha llegado a la placa, así que el cableado no influye.'),
  { t: 'match', q: '¿Qué indica cada síntoma?', pairs: [['«Servo was not declared in this scope»', 'Falta el #include'], ['El sensor siempre devuelve NaN', 'Cableado, alimentación o pin'], ["«expected ';' before…»", 'Falta un punto y coma'], ['La pantalla se ilumina pero no muestra nada', 'Dirección o contraste']] },
  I('Al elegir librería: mejor la del fabricante del módulo o una muy usada, con ejemplos y actualizada. Lee su descripción: suele decir con qué placas funciona y qué <b>recursos</b> ocupa. Por ejemplo, la librería Servo usa un temporizador de la Uno y desactiva analogWrite en los pines 9 y 10.'),
  Q('Usas Servo en una Uno y un LED del pin 10 con analogWrite deja de regular el brillo. ¿Por qué?', ['Servo ocupa el temporizador que genera el PWM de los pines 9 y 10', 'El servo consume demasiado', 'El LED está al revés', 'Falta un #include'], 'Mueve el LED a otro pin PWM: 3, 5, 6 u 11.'),
  Q('Las librerías Wire (I²C) y SPI…', ['Vienen ya con el IDE: solo hay que incluirlas', 'Hay que descargarlas aparte', 'Solo funcionan en el ESP32', 'Son de pago'], 'Muchas librerías de sensores se apoyan en ellas.')
 ]),
 L('n23', 'La hoja de datos de un módulo', 'ic', ['mc_lib'], [
  I('Un <b>módulo</b> es un chip montado en una plaquita con lo necesario para usarlo: a veces un regulador, resistencias de pull-up o un adaptador de niveles. Por eso hay que leer <b>dos</b> cosas: la hoja de datos del chip y la descripción de ese módulo concreto.'),
  I('Lo primero que buscas:\n· <b>Tensión de alimentación</b> (supply voltage).\n· <b>Niveles lógicos</b>: ¿sus pines aguantan 5 V?\n· <b>Consumo</b>, midiendo y en reposo.\n· <b>Interfaz</b>: I²C (y su dirección), SPI, 1-Wire, analógica…\n· <b>Tiempos</b>: cuánto tarda en medir y cada cuánto puede leerse.'),
  Q('El chip BME280 admite como máximo 3,6 V. Tu módulo pone «VIN 3,3–5 V» y lleva un regulador. ¿Puedes alimentarlo desde el 5V de la Uno?', ['Sí: el regulador del módulo baja la tensión para el chip', 'No, nunca', 'Solo con una resistencia en serie', 'Solo con pilas'], 'Depende del módulo: los que no llevan regulador van a 3V3. Mira siempre el tuyo.', { c: 'logic' }),
  Q('Un módulo solo de 3,3 V tiene su pin de datos conectado a una salida de la Uno (5 V). ¿Riesgo?', ['Los 5 V pueden dañar ese pin del chip: usa un adaptador de niveles o un divisor', 'Ninguno', 'Que funcione más rápido', 'Que la Uno no lo lea'], 'No basta con mirar la alimentación: la tensión de los pines de datos también cuenta.', { c: 'logic' }),
  I('En I²C cada chip tiene una <b>dirección</b> de 7 bits, como 0x76. Algunos permiten elegir entre dos con un pin o un puente de soldadura: así pueden convivir dos iguales en el mismo bus. Si no sabes la dirección, un programa <b>escáner I²C</b> las prueba todas y te dice quién responde.'),
  Q('Dos módulos con la misma dirección en el mismo bus I²C…', ['Chocan: hay que cambiar la dirección de uno (si el módulo lo permite)', 'Funcionan bien', 'Suman sus lecturas', 'Se queman al instante'], 'Cada dirección solo puede tenerla un dispositivo del bus.'),
  { t: 'pin', q: 'En la Uno, ¿en qué pin va el SDA del bus I²C?', a: 'A4', e: 'SDA = A4 y SCL = A5. La Uno R3 los repite también junto al pin AREF.' },
  I('<b>Absolute Maximum Ratings</b>: límites que no debes pasar nunca, ni un instante. <b>Operating conditions</b>: donde el fabricante garantiza que funciona. Y mira las <b>condiciones</b> de cada dato: un consumo de pocos microamperios puede ser midiendo una vez por segundo, no midiendo sin parar.'),
  Q('Un sensor tarda 750 ms en completar una medida de máxima resolución. ¿Qué haces en tu programa?', ['Pedir la medida y leerla pasados 750 ms, controlando el tiempo con millis()', 'Leerlo cada 10 ms', 'Poner delay(750) en cada vuelta de loop()', 'Nada: es instantáneo'], 'Los tiempos de conversión vienen en la hoja de datos.', { c: 'mc_millis' }),
  Q('La hoja de datos del DHT22 dice que se lea como mucho cada 2 s. ¿Qué pasa si lo lees cada 100 ms?', ['Devuelve errores o repite la lectura anterior', 'Mide veinte veces mejor', 'Se calienta y se rompe', 'Nada distinto'], 'Respeta los tiempos mínimos entre medidas.'),
  { t: 'match', q: 'Une cada término de la hoja de datos.', pairs: [['Supply voltage', 'Tensión de alimentación'], ['Sleep current', 'Consumo en reposo'], ['Absolute maximum', 'Límite de rotura'], ['Accuracy', 'Exactitud de la medida']] }
 ]),
 L('n24', 'Sensores digitales típicos', 'gauge', ['mc_lib'], [
  I('Los sensores <b>analógicos</b> dan una tensión que mides con el ADC (LDR, NTC, potenciómetro). Los <b>digitales</b> llevan dentro el convertidor y la calibración y te envían el número ya hecho por un bus. Son más precisos y no hay que hacer cuentas, a cambio de usar una librería.'),
  { t: 'match', q: 'Une cada sensor con cómo se comunica.', pairs: [['BME280 (temperatura, humedad y presión)', 'I²C o SPI'], ['DHT22 (temperatura y humedad)', 'Un pin con protocolo propio'], ['DS18B20 (temperatura, sumergible)', '1-Wire'], ['HC-SR04 (distancia por ultrasonidos)', 'Un pulso de duración variable']] },
  I('<b>BME280</b> por I²C: VIN, GND, SDA y SCL. Dirección 0x76 o 0x77. Mide temperatura, humedad y presión; con la presión se puede estimar la altitud.', { code: '#include <Wire.h>\n#include <Adafruit_BME280.h>\n\nAdafruit_BME280 bme;\n\nvoid setup() {\n  Serial.begin(9600);\n  if (!bme.begin(0x76)) Serial.println(F("No encuentro el BME280"));\n}\n\nvoid loop() {\n  Serial.println(bme.readTemperature());   // en °C\n  delay(2000);\n}' }),
  Q('bme.begin(0x76) devuelve false. ¿Qué compruebas primero?', ['Cableado de SDA y SCL, alimentación y dirección (prueba 0x77 o un escáner)', 'La velocidad del Monitor serie', 'Que el LED 13 parpadee', 'Reinstalar el IDE'], 'Que begin() devuelva false es la forma de la librería de decir «nadie responde en esa dirección».'),
  I('<b>DHT22</b>: barato, con un solo pin de datos y una pull-up (unos 10 kΩ; muchos módulos ya la llevan). Lento: una lectura cada 2 s. Si la lectura falla, su librería devuelve <b>NaN</b> («no es un número»): compruébalo con isnan().'),
  Q('¿Qué hace este código si el sensor falla?', ['Avisa del error y no imprime una temperatura falsa', 'Imprime 0', 'Se cuelga', 'Imprime NaN como si fuera válido'], 'Validar las lecturas evita que un dato erróneo dispare acciones.', { code: 'float t = sensor.readTemperature();\nif (isnan(t)) {\n  Serial.println(F("Error de lectura"));\n} else {\n  Serial.println(t);\n}' }),
  I('<b>DS18B20</b>: temperatura por el bus <b>1-Wire</b>. Necesita una pull-up de 4,7 kΩ en la línea de datos y cada sensor tiene un número de serie único, así que puedes colgar varios del mismo pin. Hay versiones en cápsula metálica sumergible.'),
  I('<b>HC-SR04</b>: lanza un pulso de ultrasonidos y su pin ECHO se queda en alto lo que tarda el eco en volver. El sonido recorre unos 0,343 mm por microsegundo, y hace ida y vuelta: <b>distancia en cm ≈ µs / 58</b>. Funciona a 5 V: su ECHO necesita un divisor si va a una placa de 3,3 V.', { code: 'digitalWrite(TRIG, HIGH);\ndelayMicroseconds(10);\ndigitalWrite(TRIG, LOW);\nunsigned long us = pulseIn(ECHO, HIGH, 30000);   // 0 si no hay eco\nfloat cm = us / 58.0;' }),
  Nm('El pulso de ECHO dura 1160 µs. ¿A qué distancia está el objeto, en cm?', 20, 'cm', '1160 / 58 = 20 cm.', { tol: 0.5 }),
  Q('¿Por qué pulseIn(ECHO, HIGH, 30000) lleva ese tercer número?', ['Es un tiempo máximo: si en 30 ms no hay eco, devuelve 0 en vez de seguir esperando', 'Son los centímetros máximos', 'Es la velocidad del sonido', 'Es la frecuencia del ultrasonido'], 'Sin límite, pulseIn puede esperar hasta 1 s y bloquear el programa.', { c: 'mc_millis' }),
  Q('Para medir la temperatura del agua de una pecera, ¿qué sensor eliges?', ['Un DS18B20 sumergible', 'Un BME280', 'Un HC-SR04', 'Una LDR'], 'Encapsulado estanco y exactitud de ±0,5 °C en buena parte de su rango.')
 ]),
 PRJ('p21', 'Proyecto: estación de medida', 'mc_station'),
 L('n9', 'Motores, servos y alimentación', 'chip', ['bjt'], [
  I('· <b>Motor DC</b>: transistor o driver y su propia alimentación.\n· <b>Servo</b>: pulsos de 1–2 ms cada 20 ms.\n· <b>Paso a paso</b>: con driver.\nRegla de oro: <b>masa común</b>.'),
  Q('Motor con otra pila y transistor desde Arduino. Funciona mal. ¿Qué falta?', ['Unir las masas', 'Más código', 'Un LED', 'Nada'], 'Sin masa común no hay referencia.', { c: 'voltage' }),
  Nm('Servo a 50 Hz. ¿Periodo?', 20, 'ms', '1 / 50.', { c: 'ac' }),
  Q('¿Por qué no alimentar un motor desde el 5V de la placa?', ['Los picos de corriente reinician la placa', 'Gira al revés', 'No tiene 5 V', 'Sí se puede'], 'Fuente aparte, masa común.'),
  Nm('Un motor de 6 V y 300 mA se conmuta con un MOSFET de Rds(on) = 0,1 Ω. ¿Cuánto disipa el MOSFET, en mW?', 9, 'mW', '0,3² × 0,1 = 0,009 W = 9 mW: ni se calienta.', { tol: 0.3, c: 'power' }),
  Q('Para que un motor de corriente continua gire en los dos sentidos desde la placa necesitas…', ['Un puente H (un driver como TB6612FNG o L298N)', 'Un solo transistor', 'Cambiar el código', 'Una resistencia más grande'], 'El puente H invierte la polaridad del motor.'),
  Q('¿Qué distingue a un motor paso a paso?', ['Avanza en pasos fijos y se sabe su posición contando pasos, sin sensor', 'Gira solo hacia un lado', 'No necesita driver', 'Se controla con 1–2 ms cada 20 ms'], 'Por eso se usa en impresoras 3D y máquinas CNC.'),
  Nm('Un paso a paso típico da 200 pasos por vuelta. ¿Cuántos grados avanza en cada paso?', 1.8, '°', '360 / 200 = 1,8°.', { tol: 0.01, c: 'algebra' }),
  { t: 'match', q: '¿Qué motor elegirías?', pairs: [['Mover un brazo a 45° y dejarlo ahí', 'Servo'], ['Un ventilador', 'Motor DC'], ['Los ejes de una impresora 3D', 'Paso a paso'], ['Las ruedas de un robot que va y vuelve', 'Motor DC con puente H']] }
 ]),
 L('n25', 'Servos con la librería', 'gauge', ['mc_lib'], [
  I('Un <b>servo</b> de modelismo lleva dentro un motor, engranajes, un potenciómetro que mide el ángulo y un circuito que corrige la posición. Tú solo le dices a qué ángulo ir con un pulso cada 20 ms: hacia 1 ms es un extremo, 1,5 ms el centro y hacia 2 ms el otro extremo (varía según el modelo).'),
  Q('Los tres cables de un servo suelen ser…', ['Marrón o negro a GND, rojo a 5 V y naranja o amarillo a la señal', 'Los tres a pines digitales', 'El rojo a la señal', 'Da igual el orden'], 'Es lo más habitual, pero comprueba siempre el de tu modelo.'),
  I('La librería <b>Servo</b> genera los pulsos por ti. write() recibe el ángulo, de 0 a 180.', { code: '#include <Servo.h>\n\nServo s;\n\nvoid setup() {\n  s.attach(9);\n}\n\nvoid loop() {\n  int pot = analogRead(A0);                 // 0..1023\n  int angulo = map(pot, 0, 1023, 0, 180);\n  s.write(angulo);\n  delay(15);\n}' }),
  Q('Con el potenciómetro en la mitad (lectura 512), ¿a qué ángulo va?', ['90°', '512°', '180°', '45°'], 'map() hace una regla de tres con enteros: 512 × 180 / 1023 ≈ 90.', { c: 'mc_intmath' }),
  Nm('Un servo va de 1 ms (0°) a 2 ms (180°). ¿Qué pulso, en ms, corresponde a 45°?', 1.25, 'ms', '1 + 45/180 × 1 = 1,25 ms.', { tol: 0.01 }),
  I('Alimentación: un servo pequeño (tipo SG90) puede pedir cientos de mA al arrancar o al forzarlo. Con uno ligero y sin carga suele bastar el 5 V del USB; con dos o más, o con carga, usa una <b>fuente aparte de 5–6 V</b>, une las masas y pon un electrolítico (por ejemplo, de 470 µF) cerca del servo.'),
  Q('El servo tiembla y la placa se reinicia al moverlo. ¿Causa más probable?', ['Los picos de corriente del servo hunden la alimentación de la placa', 'Un fallo del programa', 'El servo es de 180°', 'Falta Serial.begin()'], 'Fuente aparte, masa común y un condensador cerca del servo.', { c: 'power' }),
  Q('¿Cuánto tarda aproximadamente este barrido?', ['Unos 2,7 s', '15 ms', '180 s', 'Unos 0,18 s'], '181 pasos × 15 ms ≈ 2,7 s. Cambiando el delay ajustas la velocidad del movimiento.', { code: 'for (int a = 0; a <= 180; a++) {\n  s.write(a);\n  delay(15);\n}' }),
  Q('En un servo de «rotación continua», write(90)…', ['Lo para: 90 es parado y los extremos son velocidad en cada sentido', 'Lo lleva a 90°', 'Lo hace girar a tope', 'No funciona con la librería'], 'En esos servos el pulso controla la velocidad, no la posición. Puede necesitar un ajuste fino para quedarse quieto del todo.'),
  Q('En la Uno usas Servo y además quieres regular el brillo de un LED. ¿Qué pines PWM evitas?', ['El 9 y el 10', 'El 3 y el 11', 'El 5 y el 6', 'Ninguno'], 'La librería usa el Timer1, que es el que genera el PWM de los pines 9 y 10.'),
  { t: 'pin', q: 'Con el servo en el 9, elige un pin donde analogWrite siga funcionando para el LED (elige uno).', a: ['D3', 'D5', 'D6', 'D11'], e: 'El 10 también pierde el PWM; el 3, 5, 6 y 11 usan otros temporizadores.' }
 ]),
 PRJ('p22', 'Proyecto: theremin de luz', 'mc_theremin'),
 PRJ('p23', 'Proyecto: robot que esquiva obstáculos', 'mc_robot'),
 L('n26', 'Bajo consumo', 'sleep', ['mc_sleep'], [
  I('Con pilas, cada miliamperio cuenta. Autonomía ≈ capacidad / consumo medio. Y el consumo medio depende sobre todo de <b>cuánto tiempo pasa despierto el microcontrolador</b>.'),
  I('Casi todos los microcontroladores tienen modos de <b>sueño</b>: paran el reloj del procesador y apagan lo que no hace falta, y despiertan con un temporizador, una interrupción o un pin. Dormido, el chip pasa de miliamperios a microamperios.'),
  Q('Duermes el chip de una Uno y la placa sigue gastando decenas de mA. ¿Por qué?', ['El regulador, el chip USB y el LED de encendido siguen gastando', 'El ATmega328P no sabe dormir', 'Por culpa del programa', 'Porque funciona a 5 V'], 'Para bajo consumo de verdad se usa el chip solo o placas pensadas para ello.'),
  I('Consumo medio con un ciclo de trabajo: despierto un tiempo t₁ con I₁ y dormido t₂ con I₂:\n<b>Imedia = (I₁·t₁ + I₂·t₂) / (t₁ + t₂)</b>'),
  Nm('Despierto 1 s a 20 mA y dormido 59 s a 0,1 mA. ¿Consumo medio en mA?', 0.43, 'mA', '(20 × 1 + 0,1 × 59) / 60 ≈ 0,43 mA.', { tol: 0.02 }),
  Nm('Con ese consumo y una batería de 2000 mAh, ¿cuántos días aproximadamente?', 193, 'días', '2000 / 0,43 ≈ 4650 h ≈ 193 días (en la práctica, algo menos).', { tol: 8 }),
  G('mcDuty'),
  { t: 'match', q: 'Une cada medida con lo que ahorra.', pairs: [['Quitar el LED de encendido', 'Unos mA constantes'], ['Dormir entre medidas', 'El consumo del procesador'], ['Alimentar el sensor desde un pin y apagarlo', 'El consumo en reposo del sensor'], ['Regulador de baja corriente propia', 'Lo que gasta el regulador sin carga']] },
  Q('Un ESP32 con WiFi tiene picos de cientos de mA. Para un sensor a pilas que envía un dato cada 10 minutos, lo sensato es…', ['Dormir profundamente, despertar, medir, enviar rápido y volver a dormir', 'Tener el WiFi siempre conectado', 'Esperar con delay(600000)', 'Quitar la pila entre medidas'], 'Lo que cuenta es el tiempo despierto. Lo verás a fondo en las especialidades.'),
  Q('¿Ahorra energía delay()?', ['No: el procesador sigue despierto, contando', 'Sí: duerme el chip', 'Sí: apaga los pines', 'Sí: baja la tensión'], 'Esperar no es dormir.'),
  I('Más trucos: bajar la frecuencia de reloj, desactivar periféricos que no uses (ADC, temporizadores), no dejar entradas al aire y elegir reguladores con poca corriente propia. Los detalles cambian mucho entre chips; cada especialidad los trata a fondo.'),
  Q('Un pin de entrada sin usar y al aire…', ['Puede oscilar con el ruido y aumentar el consumo: ponle pull-up o configúralo como salida', 'No consume nada', 'Ahorra energía', 'Quema el chip'], 'Las entradas flotantes conmutan sin parar.', { c: 'pullup' })
 ]),
 L('n27', 'Cómo elegir microcontrolador', 'chip', ['mc_choose'], [
  I('No hay un microcontrolador «mejor»: hay el adecuado para cada proyecto. Preguntas clave:\n· ¿Necesito <b>WiFi o Bluetooth</b>?\n· ¿Qué <b>tensión</b> usan mis módulos, 5 V o 3,3 V?\n· ¿Cuánta <b>RAM</b> y velocidad?\n· ¿Cuántos <b>pines</b> y qué periféricos (ADC, PWM, buses)?\n· ¿<b>Consumo</b>, tamaño y precio?'),
  I('<b>Uno / Nano</b> (ATmega328P): 8 bits, 16 MHz, 32 KB de Flash, 2 KB de RAM, 5 V, ADC de 10 bits. Robusta, sencilla y con miles de ejemplos.\n<b>ESP32</b> (el modelo clásico): 2 núcleos hasta 240 MHz, 520 KB de RAM, 3,3 V, WiFi y Bluetooth, ADC de 12 bits.'),
  I('<b>Raspberry Pi Pico</b> (RP2040): 2 núcleos a 133 MHz, 264 KB de RAM, 3,3 V y bloques <b>PIO</b> para inventarte protocolos. La Pico W añade WiFi.\n<b>STM32</b>: una familia enorme de 32 bits (ARM Cortex-M), desde chips mínimos hasta muy potentes, con muchos periféricos y mucho uso en la industria. Sus pines van a 3,3 V; algunos toleran 5 V (lo indica la hoja de datos).'),
  Q('Quieres un sensor que envíe datos al móvil por WiFi. ¿Qué placa?', ['ESP32', 'Arduino Uno', 'Arduino Nano', 'Un 555'], 'WiFi y Bluetooth integrados.'),
  Q('Tienes muchos módulos de 5 V y shields de Arduino. ¿Qué eliges para empezar?', ['Uno', 'ESP32', 'Pico', 'Un STM32 cualquiera'], 'Mismos niveles y compatible con los shields.', { c: 'logic' }),
  Q('Necesitas generar a la vez 8 señales con un protocolo raro y tiempos de microsegundos, sin cargar el procesador. ¿Qué te ayuda especialmente?', ['El PIO de la RP2040 (Pico)', 'La EEPROM de la Uno', 'El WiFi del ESP32', 'El 5 V de la Nano'], 'Los bloques PIO son pequeñas máquinas de estados programables pegadas a los pines.'),
  { t: 'match', q: 'Une cada placa con su punto fuerte.', pairs: [['Uno / Nano', '5 V, sencilla, mil ejemplos'], ['ESP32', 'WiFi y Bluetooth'], ['Pico (RP2040)', 'PIO y dos núcleos'], ['STM32', 'Periféricos avanzados, uso industrial']] },
  Nm('Un programa necesita un array de 1500 float. ¿Cuántos bytes de RAM ocupa?', 6000, 'bytes', '1500 × 4 = 6000 bytes: no cabe en los 2 KB de la Uno; sí en un ESP32, una Pico o muchos STM32.', { c: 'mc_memory' }),
  Q('Para pasar un proyecto de la Uno a un ESP32, ¿qué revisas antes de conectar nada?', ['Que ningún módulo meta 5 V en los pines del ESP32', 'Que el programa use int', 'Que el cable USB sea igual', 'Nada: son idénticas'], 'El ESP32 trabaja a 3,3 V.', { c: 'logic' }),
  Q('¿Por qué un int puede comportarse distinto al pasar de la Uno a un STM32?', ['En la Uno ocupa 2 bytes y en los de 32 bits, 4', 'Porque el STM32 no tiene int', 'Porque el STM32 cuenta al revés', 'No cambia nunca'], 'Usa int16_t, uint32_t… cuando el tamaño importe.', { c: 'mc_types' }),
  I('Lo que has aprendido aquí (variables, funciones, millis, estados, interrupciones, memoria, buses) sirve en <b>todos</b>. Cada especialidad entra a fondo en su terreno: los registros del AVR, el ESP32 con WiFi y tareas, la Pico y su PIO, los STM32 con sus herramientas, IoT y radio. Elige la que pida tu próximo proyecto.')
 ])
] },

{ id: 'm13', title: 'Alimentación', desc: 'Baterías, reguladores lineales y conmutados, protección.', nodes: [
 L('o1', 'Pilas y baterías', 'bat', ['power'], [
  I('Capacidad en mAh. <b>Autonomía ≈ capacidad / consumo</b>. Las de <b>litio</b> exigen respeto: nunca las cortocircuites, perfores o cargues sin un cargador con protección.', { tune: { viz: 'battery', params: { mAh: { label: 'Capacidad', val: 2000, min: 200, max: 3000, step: 100, unit: 'mAh', dec: 0 }, mA: { label: 'Consumo', val: 50, min: 5, max: 500, step: 5, unit: 'mA', dec: 0 } } } }),
  G('battLife'), G('battLife'),
  Q('Pilas iguales en paralelo…', ['Suman capacidad, misma tensión', 'Suman tensión', 'Restan', 'No se puede'], 'En serie suman voltios.'),
  MT('¿Está cargada esta pila de 9 V?', 'bat', { measure: 'V', between: ['P', 'N'], best: true, sign: true }, 'Por encima de 9 V, bien.'),
  Q('Una Li-ion se ha hinchado:', ['Dejar de usarla y reciclarla', 'Pincharla', 'Cargarla más', 'Seguir'], 'Riesgo de incendio.')
 ]),
 L('o5', 'Cargar baterías de litio', 'bat', ['libat'], [
  I('Una celda de Li-ion o LiPo se carga en dos fases:\n· <b>CC</b>: corriente constante (por ejemplo, 0,5C) mientras la tensión sube.\n· <b>CV</b>: al llegar a <b>4,2 V</b> (la mayoría; algunas, 4,35 V), la tensión se mantiene fija y la corriente va bajando.\nLa carga termina cuando la corriente cae a un 10 % aproximadamente.'),
  G('cRate'), G('cRate'),
  Q('¿Qué pasa si cargas hasta 4,4 V una celda de 4,2 V?', ['Se degrada deprisa y aumenta el riesgo de incendio', 'Guarda más energía sin problema', 'Nada', 'Se descarga'], 'Los cargadores de litio tienen una tensión final precisa (±1 %).', { c: 'esafety' }),
  I('El <b>TP4056</b> es un cargador CC/CV de una celda muy usado. La corriente se fija con una resistencia en su pata PROG: <b>I ≈ 1200 V / RPROG</b> (1,2 kΩ → 1 A). Tiene salidas para dos LEDs: cargando y terminado.'),
  Nm('¿Qué RPROG pones en un TP4056 para cargar a 400 mA?', 3000, 'Ω', '1200 / 0,4 = 3 kΩ.'),
  I('El cargador no protege la celda de todo. La <b>protección</b> (un DW01A con dos MOSFET, o un BMS) corta si:\n· La tensión baja de unos 2,5 V (descarga profunda).\n· Sube de unos 4,3 V (sobrecarga).\n· La corriente se dispara (cortocircuito).'),
  Q('Tu módulo TP4056 tiene contactos B+/B− y OUT+/OUT−. ¿Dónde conectas tu circuito?', ['En OUT+/OUT−, que pasan por la protección', 'En B+/B− directamente', 'En la entrada USB', 'Da igual'], 'B± van a la celda; OUT± están protegidas.'),
  I('<b>Varias celdas en serie</b> (2S, 3S…) necesitan un cargador de esa tensión y un BMS con <b>equilibrado</b>: si una celda se llena antes, las otras la sobrecargarían. Nunca cargues celdas en serie con un cargador de una sola celda.'),
  Q('Un pack 2S (dos celdas en serie) lleno, ¿qué tensión tiene?', ['8,4 V', '4,2 V', '7,4 V', '3,7 V'], '2 × 4,2 V; 7,4 V es la nominal.'),
  Q('La mayoría de celdas de litio…', ['No deben cargarse por debajo de 0 °C', 'Se cargan mejor bajo cero', 'Solo se cargan a más de 60 °C', 'Se cargan igual a cualquier temperatura'], 'Cargar en frío deposita litio metálico y daña la celda. Mira su hoja de datos.'),
  { t: 'order', q: 'Ordena las comprobaciones antes de cargar una celda que has recuperado.', items: ['Inspecciona: sin golpes, hinchazón ni fugas', 'Mide la tensión: por encima de unos 2,5 V', 'Busca su corriente máxima de carga en la hoja de datos', 'Carga vigilada sobre una superficie no inflamable', 'Tócala de vez en cuando: como mucho templada'], e: 'Si algo falla, recíclala.', c: 'esafety' }
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
 L('o6', 'Dimensionar un buck', 'ic', ['smps'], [
  I('Un <b>buck</b> tiene un interruptor (MOSFET), un diodo o un segundo MOSFET, una bobina y un condensador. Con el interruptor cerrado, la bobina recibe Vent − Vsal y su corriente sube; abierto, recibe −Vsal y baja. En equilibrio la tensión media en la bobina es cero, y de ahí sale <b>D = Vsal / Vent</b>.'),
  G('buckRip'),
  I('El <b>rizado de corriente</b> en la bobina: <b>ΔI = (Vent − Vsal) · D / (L · f)</b>. Se elige ΔI ≈ 20–40 % de la corriente de salida. Despejando: <b>L = (Vent − Vsal) · D / (ΔI · f)</b>.'),
  Nm('Buck de 12 V a 5 V y 2 A, a 500 kHz, con ΔI del 30 % (0,6 A). ¿L en µH?', 9.7, 'µH', 'D = 0,417; L = 7 × 0,417 / (0,6 × 500 000) ≈ 9,7 µH → 10 µH comercial.', { tol: 0.3 }),
  G('buckRip'),
  Q('¿Qué corriente de saturación debe tener esa bobina?', ['Más que el pico, 2 A + 0,3 A = 2,3 A, con margen', '2 A justos', '0,6 A', '1 A'], 'Pico = media + ΔI/2.', { c: 'inductor' }),
  I('El <b>condensador de salida</b> absorbe el rizado de corriente. El rizado de tensión depende de su capacidad y, sobre todo, de su <b>ESR</b>: ΔV ≈ ΔI · ESR más un término de la capacidad. Por eso se usan cerámicos o electrolíticos de baja ESR.'),
  Nm('ΔI = 0,6 A y un condensador con 20 mΩ de ESR. ¿Rizado aproximado debido a la ESR, en mV?', 12, 'mV', '0,6 × 0,02 = 12 mV.'),
  I('El <b>rendimiento</b> se pierde en: la Rds(on) del MOSFET (I² · R), el diodo (Vf · I mientras conduce; por eso se usa Schottky o un segundo MOSFET, la rectificación síncrona), la resistencia del hilo de la bobina y las conmutaciones.'),
  Q('¿Por qué un buck síncrono rinde más que uno con diodo cuando la salida es de 3,3 V?', ['El MOSFET cae mucho menos que los 0,3–0,5 V del Schottky', 'Porque es más grande', 'Porque conmuta más despacio', 'No rinde más'], 'Con salidas bajas, la caída del diodo es una parte grande de Vsal.', { c: 'diode' }),
  Q('En la PCB de un buck, ¿qué bucle hay que hacer lo más pequeño posible?', ['El del condensador de entrada, el MOSFET y el diodo: por ahí circulan los pulsos', 'El de la salida a la carga', 'El del LED indicador', 'Ninguno'], 'Ese bucle radia ruido. Sigue la disposición recomendada por el fabricante.')
 ]),
 L('o4', 'Protección', 'bat', ['circuit'], [
  I('· <b>Fusible</b> o <b>PTC</b>: sobrecorriente.\n· <b>Diodo en serie</b> o MOSFET: polaridad invertida.\n· <b>TVS</b>: picos.\n· Condensadores grandes: caídas.'),
  Q('Ventaja del PTC frente al fusible:', ['Se rearma al enfriarse', 'Más rápido', 'No se calienta', 'Sube la tensión'], 'Útil en USB.'),
  Q('Proteger la polaridad con un diodo cuesta…', ['≈ 0,7 V de caída', 'Nada', 'La mitad', 'Toda la corriente'], 'Con MOSFET, mucho menos.', { c: 'diode' })
 ]),
 L('o7', 'Supercondensadores y energía solar pequeña', 'bat', ['cap'], [
  I('Un <b>supercondensador</b> guarda muchísima más carga que un electrolítico (de 0,1 F a miles de F), pero a poca tensión: 2,5–3 V por celda. Se carga y descarga en segundos, aguanta cientos de miles de ciclos y no arde como el litio, aunque guarda mucha menos energía.'),
  G('capJ'),
  Q('Un supercondensador de 10 F a 2,7 V frente a una celda de litio de 2000 mAh y 3,7 V (unos 26 600 J). ¿Cuál guarda más energía?', ['La celda, con muchísima diferencia: el supercondensador, unos 36 J', 'El supercondensador', 'Los dos igual', 'Depende del color'], '½ × 10 × 2,7² ≈ 36 J.'),
  I('Al descargarse, su tensión baja (no se queda plana como en una batería). Si tu circuito necesita al menos 1,8 V, la energía útil es solo la que hay entre 2,7 V y 1,8 V: <b>½ · C · (V1² − V2²)</b>.'),
  Nm('10 F de 2,7 V a 1,8 V. ¿Energía útil en J?', 20.25, 'J', '½ × 10 × (7,29 − 3,24).', { tol: 0.2 }),
  Q('¿Para qué es ideal un supercondensador?', ['Mantener un reloj o una memoria en los cortes, o dar picos de corriente', 'Alimentar un móvil todo el día', 'Sustituir la batería de un coche eléctrico', 'Para nada'], 'Mucha potencia y muchos ciclos, poca energía.'),
  I('Una <b>placa solar</b> “de 6 V y 1 W” da su máxima potencia hacia los 6 V, con unos 170 mA, y solo a pleno sol y bien orientada; con nubes, una fracción. Se comporta casi como una fuente de corriente: la corriente depende de la luz.', { c: 'network' }),
  Q('¿Por qué no conectar una placa de 6 V directamente a una celda de litio?', ['Puede sobrecargarla: hace falta un cargador de litio (mejor con MPPT)', 'Porque no cargaría', 'Porque invierte la celda', 'Se puede sin problema'], 'Y de noche, sin un diodo, la celda se descargaría por la placa.', { c: 'libat' }),
  Nm('Un sensor gasta de media 2 mA. En invierno hay unas 3 horas útiles de sol con 100 mA. ¿Cuántos mAh entran al día, sin pérdidas?', 300, 'mAh', '100 mA × 3 h. El sensor gasta 48 mAh al día: hay margen incluso con pérdidas y días nublados.'),
  Q('¿Qué es MPPT?', ['Buscar el punto de la curva de la placa en el que da más potencia', 'Un tipo de batería', 'Un tipo de placa', 'Un fusible'], 'Seguimiento del punto de máxima potencia: el cargador ajusta la tensión a la que trabaja la placa.')
 ]),
 SIM('sg5', 'Reto: aviso de batería baja', 'Vigila la tensión del cursor del potenciómetro (tu “batería”) con un comparador y la referencia de un zener de 5,1 V: el LED se enciende cuando el cursor baja de la referencia.', { battery: 9, parts: ['pot', 'zener', 'res', 'cmp', 'led'], hint: '+ → 1 kΩ → cátodo del zener; ánodo al −. Cátodo del zener → IN+ del comparador. Potenciómetro entre + y −, cursor → IN−. VCC del comparador al +. Salida → 470 Ω → LED → −.' }, 'battMonitor'),
 PRJ('p8', 'Proyecto: fuente de 5 V', 'psu'),
 PRJ('p14', 'Proyecto: cargador USB de Li-ion con protección', 'liCharger'),
 PRJ('p13', 'Proyecto: fuente de laboratorio con LM317', 'labPsu')
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
 L('q8', 'Planos de masa y retorno de corriente', 'pcb', ['schematic'], [
  I('Toda corriente que sale por una pista <b>vuelve</b> a su origen por masa. En continua elige el camino de menor resistencia; con flancos rápidos, el de menor <b>inductancia</b>: justo por debajo de la pista de ida, en el plano de masa.'),
  Q('Una señal rápida va por la cara superior. ¿Por dónde vuelve su corriente en el plano de masa de abajo?', ['Justo por debajo de la pista', 'En línea recta hacia la fuente', 'Por el borde de la placa', 'No vuelve'], 'Así el bucle de ida y vuelta es mínimo.', { c: 'inductor' }),
  I('El área del bucle (ida + vuelta) es una antena: cuanto mayor, más radia y más ruido capta. Un plano de masa entero bajo las señales hace los bucles pequeñísimos.'),
  Q('Cortas el plano de masa con una ranura que pasa bajo una pista de reloj. ¿Qué pasa?', ['El retorno rodea la ranura: bucle grande, más emisiones y más ruido', 'Nada', 'Mejora', 'La señal se corta'], 'No cortes el plano bajo las señales.'),
  I('Analógico y digital: mejor un único plano y <b>colocar</b> bien que cortarlo en dos. La parte digital a un lado y la analógica a otro, para que las corrientes digitales no pasen por debajo de la zona analógica.'),
  Q('¿Dónde va la vía de masa de un condensador de desacoplo?', ['Pegada a su pad, para que el bucle con el chip sea mínimo', 'Lejos, da igual', 'En el borde', 'No lleva'], 'Cada milímetro cuenta.', { c: 'cap' }),
  I('Pistas de potencia: su anchura depende de la corriente y del calentamiento que aceptes. Orientación: en cobre de 35 µm, una pista exterior de 0,3–0,5 mm lleva 1 A calentándose unos 10 °C. Para valores reales, usa una calculadora basada en IPC-2221.', { c: 'thermal' }),
  Q('¿Qué ventaja tiene una placa de 4 capas con un plano de masa interior entero?', ['Retornos cortos para todo, menos ruido y rutado más fácil', 'Es más barata', 'Pesa menos', 'Ninguna'], 'En diseños rápidos o con radio, compensa.'),
  Q('La masa en estrella, ¿cuándo tiene sentido?', ['En baja frecuencia con corrientes grandes, para que no compartan tramos de masa con señales sensibles', 'Siempre en radiofrecuencia', 'Nunca', 'En lógica rápida'], 'En alta frecuencia gana el plano.')
 ]),
 L('q9', 'Alta velocidad y RF en dos pinceladas', 'antenna', ['schematic'], [
  I('A partir de cierta velocidad, una pista deja de ser “un cable” y se comporta como una <b>línea de transmisión</b>: la señal viaja a unos 15 cm por nanosegundo en FR4 y, si la pista es larga comparada con su flanco, rebota en los extremos.'),
  Q('Regla práctica: ¿cuándo hay que tratar una pista como línea de transmisión?', ['Cuando mide más de una sexta parte de lo que recorre la señal durante su flanco', 'Siempre', 'Nunca en placas pequeñas', 'Solo en continua'], 'Con flancos de 1 ns, unos 2–3 cm ya cuentan.'),
  I('Una línea tiene una <b>impedancia característica</b> Z₀, que depende del ancho de la pista, del grosor del dieléctrico y del material. En RF se usa 50 Ω; en USB, pares diferenciales de 90 Ω. El fabricante te dice qué ancho da 50 Ω con su apilado de capas.'),
  Q('Una pista de 50 Ω termina en una entrada de 50 Ω. ¿Qué pasa con la señal?', ['Se absorbe sin rebotes: está adaptada', 'Rebota entera', 'Se duplica', 'Se pierde en la pista'], 'Igual que en la máxima transferencia de potencia.', { c: 'network' }),
  I('Reglas de dos pinceladas para RF:\n· Plano de masa entero bajo las pistas de RF.\n· Pistas de RF cortas, con el ancho de 50 Ω y curvas suaves.\n· Muchas vías de masa alrededor (cosido).\n· La antena, con su zona libre de cobre: sigue la hoja de datos del módulo.'),
  Q('Un módulo ESP32 con antena impresa en la placa. ¿Dónde lo colocas?', ['Con la antena sobresaliendo del borde o sobre una zona sin cobre', 'Con un plano de masa justo debajo de la antena', 'Dentro de una caja metálica', 'Da igual'], 'El cobre bajo la antena la desintoniza.'),
  Q('¿Por qué las dos pistas de un par diferencial (USB, Ethernet) van juntas y con la misma longitud?', ['Para que el ruido les afecte igual y se cancele, y para que lleguen a la vez', 'Por estética', 'Para ahorrar cobre', 'No importa'], 'El receptor solo mira la diferencia.'),
  Q('Vas a emitir por radio con tu propio diseño. ¿Qué no puedes olvidar?', ['Usar solo bandas y potencias permitidas (como las de 433 y 868 MHz de uso libre, con sus límites) o tener licencia', 'Nada: todo está permitido', 'Usar la máxima potencia posible', 'Pintar la placa'], 'Lo verás a fondo en la especialidad de Radio.', { c: 'esafety' })
 ]),
 L('q5', 'Reglas y fabricación', 'pcb', ['schematic'], [
  I('El <b>DRC</b> comprueba separaciones, anchuras y taladros. Luego exportas <b>Gerbers</b> (una capa por archivo) y el archivo de taladros.'),
  Q('DRC: pistas a 0,1 mm y el fabricante pide 0,15 mm.', ['Separarlas', 'Ignorarlo', 'Pedir otra placa', 'Hacerlas más finas'], 'Si no, cortocircuitos.'),
  Q('¿Qué capa lleva los textos blancos?', ['Serigrafía', 'Máscara', 'Cobre', 'Taladros'], 'Silkscreen.')
 ]),
 L('q10', 'BOM, pedido, fabricación y montaje', 'pcb', ['schematic'], [
  I('La <b>BOM</b> (lista de materiales) es la receta de compra: referencia en el diseño (R1, C3…), valor, huella, fabricante, número de pieza del fabricante (MPN) y proveedor. Sin MPN, “una resistencia de 10 kΩ” puede ser cualquier cosa.'),
  Q('¿Qué columna de la BOM identifica un componente sin ambigüedad?', ['El número de pieza del fabricante (MPN)', 'El valor', 'La referencia R1', 'El color'], 'El valor y la huella no dicen tolerancia, tensión, dieléctrico…'),
  { t: 'match', q: 'Une cada archivo de fabricación con lo que contiene.', pairs: [['Gerber', 'Capas de cobre, máscara y serigrafía'], ['Taladros (Excellon)', 'Posición y diámetro de los agujeros'], ['Pick and place', 'Posición y giro de cada pieza'], ['BOM', 'Qué pieza va en cada sitio']] },
  I('Antes de pagar, revisa:\n· Los Gerbers en un visor: ¿están todas las capas y el contorno?\n· Que hay <b>existencias</b> de cada pieza y que no está obsoleta (NRND, EOL).\n· Las cantidades: un 10–20 % extra de las piezas pequeñas.'),
  Q('“NRND” en la ficha de un componente significa…', ['No recomendado para diseños nuevos', 'Nuevo', 'Sin plomo', 'Resistente al agua'], 'Busca una alternativa activa para no quedarte sin piezas.'),
  I('<b>Montaje</b>: puedes soldarla tú o pedir que el fabricante la monte (PCBA). Para eso necesita la BOM y el pick and place, y que las piezas estén en su catálogo o se las envíes. En series cortas suele compensar que monten las SMD y soldar tú los conectores.'),
  Q('Tu prototipo funciona. ¿Qué te falta antes de vender 100 unidades en España?', ['Pruebas de fabricación, documentación y cumplir la normativa aplicable (marcado CE: emisiones, seguridad…)', 'Nada', 'Solo una caja bonita', 'Subir el precio'], 'En la UE, un aparato electrónico debe cumplir las directivas aplicables antes de venderse.'),
  I('Diseña pensando en la prueba: <b>puntos de test</b> en las alimentaciones y en las señales clave, un conector para programar y LEDs de estado. Ahorran horas cuando algo falla.'),
  { t: 'order', q: 'Ordena el camino del prototipo a la serie corta.', items: ['Prototipo en protoboard', 'Esquema y PCB', 'Primera tirada pequeña y pruebas', 'Corregir errores (revisión B)', 'BOM definitiva y pedido de la serie', 'Montaje y prueba de cada unidad'], e: 'Casi ninguna placa sale perfecta a la primera: cuenta con una revisión.' }
 ]),
 L('q6', 'Soldar', 'pcb', ['schematic'], [
  I('Calienta pad y pata a la vez y aplica el estaño a la unión, no a la punta. Una buena soldadura es brillante y en cono.'),
  { t: 'order', q: 'Ordena una buena soldadura.', items: ['Limpia y estaña la punta', 'Apoya la punta en pad y pata', 'Acerca el estaño a la unión', 'Retira el estaño', 'Retira el soldador sin mover la pieza', 'Corta la pata sobrante'], e: '2–3 segundos en total.' },
  Q('Soldadura gris, rugosa, en bola:', ['Soldadura fría', 'Perfecta', 'Demasiado flux', 'Una vía'], 'Recalienta con flux.'),
  Q('Precaución imprescindible:', ['Ventilar y no respirar el humo', 'Placa alimentada', 'Tocar la punta', 'Sin soporte'], 'Gafas y lávate las manos.')
 ]),
 L('q7', 'SMD a mano', 'pcb', ['schematic'], [
  I('Los componentes de montaje superficial (SMD) se sueldan sobre pads, sin agujeros. Asustan al principio, pero 0805 y SOIC se sueldan bien a mano. Necesitas: punta fina o de bisel pequeño, <b>flux</b>, pinzas, estaño fino (0,5 mm) y buena luz o lupa.'),
  { t: 'order', q: 'Ordena cómo soldar una resistencia 0805 con soldador.', items: ['Estaña un solo pad', 'Sujeta la pieza con pinzas y funde ese pad para fijarla', 'Suelda el otro extremo', 'Retoca el primero con un poco de flux'], e: 'Fijar primero un lado evita que la pieza se mueva.' },
  I('<b>Circuitos integrados</b> (SOIC, TSSOP): fija una esquina, alinea, fija la esquina opuesta y suelda el resto. Si se forman <b>puentes</b> entre patas, flux y malla desoldadora, o arrastra la punta limpia con flux.'),
  Q('Te queda un puente de estaño entre dos patas de un SOIC. ¿Qué haces?', ['Flux y malla desoldadora (o arrastrar la punta limpia)', 'Echar más estaño', 'Cortarlo con un cúter', 'Dejarlo'], 'Con flux, el estaño prefiere los pads.'),
  I('<b>Pasta de soldar</b>: bolitas de estaño mezcladas con flux. Se pone en los pads (con plantilla o jeringa), se colocan las piezas y se funde con <b>aire caliente</b> o con una <b>placa calefactora</b>. La tensión superficial centra las piezas solas.'),
  Q('Al fundir la pasta, una resistencia se levanta por un extremo (efecto lápida). ¿Causa típica?', ['Distinta cantidad de pasta o de calor en los dos pads', 'Que la pieza es muy pequeña', 'Pasta caducada siempre', 'La placa entera estaba fría'], 'Un pad funde antes y tira de la pieza.'),
  I('Aire caliente: unos 300–350 °C, caudal bajo (para no soplar las piezas) y movimiento circular a 1–2 cm. Para retirar un chip, calienta todas sus patas por igual y levántalo cuando el estaño brille.'),
  Q('Vas a usar aire caliente cerca de un conector de plástico. ¿Qué haces?', ['Protegerlo con cinta de kapton o papel de aluminio', 'Nada', 'Subir el caudal', 'Quitarle el plástico'], 'El plástico se deforma enseguida.'),
  Q('¿Qué precaución con el flux y la pasta?', ['Ventilar, no respirar el humo y lavarse las manos (sobre todo con plomo)', 'Ninguna', 'Calentarla antes en el microondas', 'Guardarla junto a la comida'], 'Y limpia los restos de flux con alcohol isopropílico si no es de tipo “no-clean”.', { c: 'esafety' }),
  { t: 'match', q: 'Une cada encapsulado con su tamaño o paso.', pairs: [['0805', '2,0 × 1,25 mm'], ['0603', '1,6 × 0,8 mm'], ['SOIC', 'Paso de 1,27 mm'], ['TSSOP', 'Paso de 0,65 mm']] }
 ]),
 { id: 'r1', kind: 'route', title: 'Reto: rutado 1', icon: 'pcb', level: 'r1', brief: 'Une cada par de pads del mismo color sin cruzar pistas.' },
 { id: 'r2', kind: 'route', title: 'Reto: rutado 2', icon: 'pcb', level: 'r2', brief: 'Cuatro redes. Planifica antes de trazar.' },
 { id: 'r3', kind: 'route', title: 'Reto: rutado 3', icon: 'pcb', level: 'r3', brief: 'Cinco redes. Empieza por los bordes.' },
 PRJ('p9', 'Proyecto: tu primera PCB', 'pcb'),
 PRJ('p17', 'Proyecto: insignia SMD con 555', 'smdBoard')
] }
];

/* Especialidades: temarios enteros que se desbloquean al terminar el módulo de
   Microcontroladores (m12). Cada archivo de src/tracks/ añade la suya con TRACKS.push(…). */
const TRACKS = [];
