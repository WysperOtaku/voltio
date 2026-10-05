/* Voltio · cada concepto tiene varias formas de explicarse.
   Si fallas un ejercicio, aparece la siguiente explicación y una pregunta para comprobarla. */
const mcq = (q, o, e, x = {}) => ({ t: 'mc', q, o, a: 0, e, ...x });
const CONCEPTS = {
  charge: { name: 'Carga eléctrica', alts: [
    { title: 'Como canicas en un tubo', text: 'Imagina un tubo lleno de canicas. Si empujas una por un extremo, sale otra casi al instante por el otro, aunque cada canica se mueva despacio. En un cable pasa igual: los electrones ya están ahí; la pila solo empuja la fila.', q: mcq('¿Por qué la luz se enciende al instante aunque los electrones se muevan despacio?', ['Porque el cable ya está lleno de electrones y el empuje se transmite por toda la fila', 'Porque los electrones viajan a la velocidad de la luz', 'Porque la pila lanza electrones muy rápidos', 'Porque la bombilla tiene electrones guardados'], 'Lo que viaja rápido es el empuje, no cada electrón.') },
    { title: 'Con números', text: 'La carga se mide en culombios (C). Un culombio son unos 6 trillones de electrones (6,24 × 10¹⁸). Un amperio es un culombio pasando cada segundo: <b>I = Q / t</b>.', q: mcq('Pasan 2 culombios por un cable en 1 segundo. ¿Corriente?', ['2 A', '0,5 A', '1 A', '2 V'], 'I = Q / t = 2 / 1 = 2 A.') }
  ] },
  current: { name: 'Corriente', alts: [
    { title: 'El caudal', text: 'La corriente es cuánta carga pasa por un punto cada segundo, como los litros por segundo de un río. No se “gasta”: la misma corriente que sale de la pila vuelve a ella.', q: mcq('En un circuito con una pila y una bombilla, la corriente que vuelve a la pila es…', ['La misma que sale', 'Menor, porque la bombilla la gasta', 'Cero', 'El doble'], 'La bombilla gasta energía, no corriente.') },
    { title: 'Contando coches', text: 'Si te pones en un puente de una autopista y cuentas coches por minuto, eso es “corriente de coches”. Da igual en qué punto de la carretera sin desvíos te pongas: pasan los mismos.', q: mcq('En un circuito en serie, ¿dónde es mayor la corriente?', ['Es igual en todos los puntos', 'Justo al salir de la pila', 'Antes de la resistencia', 'Después del LED'], 'Sin desvíos, por todos los puntos pasa lo mismo.') },
    { title: 'Sentido convencional', text: 'Por convenio, la corriente se dibuja saliendo del + y entrando por el −. Los electrones van al revés, pero eso no cambia ningún cálculo: todos los esquemas usan el sentido convencional.', q: mcq('En un esquema, la corriente se dibuja…', ['Del + al − por fuera de la pila', 'Del − al + por fuera de la pila', 'En ambos sentidos a la vez', 'Solo dentro de la pila'], 'Es el sentido convencional.') }
  ] },
  voltage: { name: 'Tensión', alts: [
    { title: 'Diferencia de altura', text: 'La tensión es como la diferencia de altura entre dos depósitos de agua: cuanta más diferencia, más empuje. Por eso siempre se mide <b>entre dos puntos</b>. Decir “este punto tiene 5 V” significa “5 V respecto a masa”.', q: mcq('¿Por qué un pájaro posado en un cable de alta tensión no se electrocuta?', ['Porque sus dos patas están al mismo potencial: no hay diferencia de tensión', 'Porque las plumas aíslan', 'Porque la corriente va demasiado rápido', 'Porque los pájaros no conducen'], 'Sin diferencia de tensión no hay empuje ni corriente.') },
    { title: 'Energía por carga', text: 'Un voltio significa que cada culombio que atraviesa la pila recibe un julio de energía. Una pila de 9 V da a cada carga 9 veces más energía que una de 1 V.', q: mcq('Una pila de 9 V y otra de 1,5 V. ¿Qué cambia?', ['La energía que recibe cada carga', 'El número de electrones del cable', 'La velocidad de la luz', 'El color de la corriente'], 'Tensión = energía por unidad de carga.') },
    { title: 'Masa como referencia', text: 'Igual que medimos la altura de una montaña desde el nivel del mar, en electrónica elegimos un punto de referencia llamado <b>masa</b> (GND) y le damos 0 V. Todas las demás tensiones se miden respecto a él.', q: mcq('Si un punto está a 5 V y otro a 2 V respecto a masa, ¿qué tensión hay entre ellos?', ['3 V', '7 V', '5 V', '2 V'], 'Diferencia: 5 − 2 = 3 V.') }
  ] },
  resistance: { name: 'Resistencia', alts: [
    { title: 'Tubería estrecha', text: 'Una resistencia es un estrechamiento en la tubería: con el mismo empuje, pasa menos agua. Los cables son tuberías anchas (casi sin resistencia) y la resistencia es el cuello de botella que controla el caudal.', q: mcq('Si sustituyes una resistencia por otra mayor, con la misma pila…', ['Pasa menos corriente', 'Pasa más corriente', 'Aumenta la tensión de la pila', 'Nada cambia'], 'Más estrechez, menos caudal.') },
    { title: 'Qué la determina', text: 'La resistencia de un hilo depende del material, de su longitud y de su grosor: <b>R = ρ · L / S</b>. El doble de largo, el doble de resistencia. El doble de sección, la mitad.', q: mcq('Un cable el doble de largo y del mismo grosor tiene…', ['El doble de resistencia', 'La mitad de resistencia', 'La misma resistencia', 'Cuatro veces menos'], 'R es proporcional a la longitud.') }
  ] },
  circuit: { name: 'Circuito cerrado', alts: [
    { title: 'Un camino en bucle', text: 'La corriente necesita un camino de ida y vuelta a la pila. Si se corta en cualquier punto (circuito abierto), se para en todas partes. Si encuentra un atajo sin resistencia (cortocircuito), circula muchísima corriente y algo se calienta.', q: mcq('Un cable une directamente el + y el − de una pila. ¿Qué pasa?', ['Cortocircuito: mucha corriente y calor', 'No pasa nada, no hay componentes', 'Circuito abierto', 'La pila se recarga'], 'Sin resistencia que limite, la corriente se dispara.') },
    { title: 'El interruptor', text: 'Un interruptor no “manda” la electricidad: simplemente abre o cierra el camino. Abierto = puente levantado; cerrado = puente bajado.', q: mcq('Un interruptor abierto en serie con un LED…', ['Corta el camino y el LED se apaga', 'Hace que el LED brille más', 'Provoca un cortocircuito', 'Solo afecta a la mitad del circuito'], 'En serie, cualquier corte apaga todo.') }
  ] },
  ohm: { name: 'Ley de Ohm', alts: [
    { title: 'El triángulo', text: 'Dibuja un triángulo con V arriba e I y R abajo. Tapa la magnitud que buscas: lo que queda te dice la operación. Tapando V queda I × R; tapando I queda V / R; tapando R queda V / I.', svg: '<svg viewBox="0 0 200 150" class="viz"><path d="M100 15L185 135H15Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M45 85H155M100 85V135" stroke="currentColor" stroke-width="3"/><text x="100" y="72" text-anchor="middle" font-size="30" font-weight="800" fill="currentColor">V</text><text x="70" y="122" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">I</text><text x="130" y="122" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">R</text></svg>', q: mcq('Tapando la R en el triángulo, ¿qué fórmula queda?', ['R = V / I', 'R = V × I', 'R = I / V', 'R = V − I'], 'V arriba, I abajo: V entre I.') },
    { title: 'Proporciones', text: 'Con la resistencia fija, tensión y corriente van juntas: doble de tensión, doble de corriente. Con la tensión fija, resistencia y corriente van al revés: doble de resistencia, mitad de corriente.', tune: { viz: 'ohm', params: { V: { label: 'Pila', val: 4, min: 1, max: 12, step: 1, unit: 'V', dec: 0 }, R: { label: 'Resistencia', val: 1000, fmt: 'R', min: 100, max: 10000 } } }, q: mcq('Con 1 kΩ circulan 3 mA. ¿Cuánto circula con 2 kΩ y la misma pila?', ['1,5 mA', '6 mA', '3 mA', '0,3 mA'], 'Doble resistencia, mitad de corriente.') },
    { title: 'Paso a paso con unidades', text: 'El error más común es mezclar prefijos. Receta: 1) pasa todo a V, A y Ω; 2) aplica la fórmula; 3) vuelve al prefijo cómodo. Ejemplo: 9 V entre 4,7 kΩ → 9 / 4700 = 0,0019 A = 1,9 mA.', q: mcq('5 V entre 2,2 kΩ. ¿Corriente?', ['2,27 mA', '2,27 A', '0,44 mA', '11 mA'], '5 / 2200 = 0,00227 A = 2,27 mA.') }
  ] },
  power: { name: 'Potencia', alts: [
    { title: 'Energía por segundo', text: 'La potencia es la rapidez con la que se transforma la energía. Un vatio es un julio cada segundo. Una resistencia convierte toda su potencia en calor: si es demasiada, se quema.', q: mcq('¿Qué indica la potencia nominal de una resistencia (por ejemplo ¼ W)?', ['El calor máximo que puede disipar sin dañarse', 'Su valor en ohmios', 'La tensión máxima de la pila', 'Cuánta corriente produce'], 'Por eso se elige con margen.') },
    { title: 'Tres caminos', text: 'P = V × I es la base. Si te dan I y R, sustituye V = I·R → P = I²·R. Si te dan V y R, sustituye I = V/R → P = V²/R. Elige la que use los datos que tienes.', q: mcq('Conoces la corriente y la resistencia. ¿Qué fórmula usas?', ['P = I² × R', 'P = V² / R', 'P = V / I', 'P = R / I'], 'La que solo necesita I y R.') }
  ] },
  series: { name: 'Serie', alts: [
    { title: 'Obstáculos en fila', text: 'Varias resistencias en serie son como varios estrechamientos seguidos en una tubería: el agua tiene que superarlos todos, así que se suman. Y como no hay desvíos, la corriente es la misma en todas.', q: mcq('Tres resistencias en serie de 100 Ω. ¿Total?', ['300 Ω', '33 Ω', '100 Ω', '1000 Ω'], 'Se suman.') },
    { title: 'Reparto de tensión', text: 'En serie, la tensión de la pila se reparte en proporción a cada resistencia: la más grande se queda con más voltios. Por eso un divisor de tensión funciona.', q: mcq('1 kΩ y 2 kΩ en serie con 9 V. ¿Cuál tiene más tensión?', ['La de 2 kΩ (6 V)', 'La de 1 kΩ (6 V)', 'Las dos igual', 'Ninguna'], 'La más grande se queda con la mayor parte.') }
  ] },
  parallel: { name: 'Paralelo', alts: [
    { title: 'Más carriles', text: 'Poner resistencias en paralelo es abrir más carriles en una autopista: el tráfico total fluye mejor, así que la resistencia total baja. Siempre queda por debajo de la más pequeña.', q: mcq('100 Ω en paralelo con 1 MΩ. ¿El total es…?', ['Un poco menos de 100 Ω', 'Más de 1 MΩ', 'Unos 500 kΩ', '1,0001 MΩ'], 'Por debajo de la menor.') },
    { title: 'Con conductancias', text: 'La conductancia (G = 1/R) mide lo fácil que es pasar. En paralelo, las facilidades se suman: G = G1 + G2. Luego vuelves: R = 1/G. Con dos resistencias queda el truco: R = (R1·R2) / (R1+R2).', q: mcq('200 Ω y 200 Ω en paralelo', ['100 Ω', '400 Ω', '200 Ω', '50 Ω'], 'Dos iguales: la mitad.') },
    { title: 'Misma tensión', text: 'Todo lo que está en paralelo comparte los mismos dos puntos, así que tiene la misma tensión. Por eso los enchufes de casa están en paralelo: todos reciben lo mismo.', q: mcq('Dos LEDs en paralelo conectados directamente a 3 V. ¿Qué tensión tiene cada uno?', ['3 V', '1,5 V', '6 V', 'Depende de la corriente'], 'Paralelo = misma tensión.') }
  ] },
  divider: { name: 'Divisor de tensión', alts: [
    { title: 'Una escalera', text: 'Imagina que la pila es una escalera de 9 escalones y las resistencias reparten los escalones según su tamaño. Con 2 kΩ arriba y 1 kΩ abajo, la de abajo se lleva 1 de cada 3 escalones: 3 V.', q: mcq('12 V, R1 = 3 kΩ arriba y R2 = 1 kΩ abajo. ¿Vsal?', ['3 V', '9 V', '4 V', '6 V'], 'R2 es 1/4 del total: 12/4 = 3 V.') },
    { title: 'Por qué no alimenta cosas', text: 'Si conectas una carga a la salida, queda en paralelo con R2 y la resistencia de abajo baja: la tensión cae. Un divisor sirve para dar una referencia o leer un sensor, no para alimentar.', q: mcq('Un divisor da 5 V en vacío. Le conectas un motor. ¿Qué pasa?', ['La tensión cae mucho', 'Sigue dando 5 V', 'Sube a 10 V', 'El motor gira al doble'], 'La carga cambia el divisor.') }
  ] },
  kcl: { name: 'Ley de nudos', alts: [
    { title: 'Un cruce de tuberías', text: 'En un cruce de tuberías, el agua que entra tiene que salir: no se acumula ni desaparece. Con la corriente pasa lo mismo en cualquier nudo.', q: mcq('Entran 50 mA en un nudo y salen 20 mA por una rama y 20 mA por otra. ¿Y por la tercera?', ['10 mA', '50 mA', '90 mA', '0 mA'], '50 − 20 − 20 = 10 mA.') },
    { title: 'Con signos', text: 'Cuenta como positivas las corrientes que entran y negativas las que salen: la suma siempre es cero. Si una incógnita sale negativa, es que va en sentido contrario al que supusiste.', q: mcq('Calculas una corriente de rama y te sale −5 mA. ¿Qué significa?', ['Que circula 5 mA en sentido contrario al supuesto', 'Que el circuito está mal', 'Que la corriente no existe', 'Que hay 5 mA de pérdidas'], 'El signo solo indica el sentido.') }
  ] },
  kvl: { name: 'Ley de mallas', alts: [
    { title: 'Subir y bajar una montaña', text: 'Si sales de casa, subes y bajas colinas y vuelves a casa, el desnivel total es cero. En una malla: la pila “sube” la tensión y cada componente la “baja”; al cerrar la vuelta, todo se compensa.', q: mcq('Pila de 5 V, una resistencia y un LED de 2 V. ¿Cuánto cae en la resistencia?', ['3 V', '5 V', '7 V', '2 V'], '5 − 2 = 3 V.') },
    { title: 'Compruébalo midiendo', text: 'Un truco práctico: mide la tensión de cada componente de la malla con el multímetro. Si las sumas no dan la pila, o hay un error de medida o un componente que no estás viendo (como un cable con mala conexión).', q: mcq('Mides 6 V + 2 V en una malla con una pila de 9 V. ¿Qué sospechas?', ['Que falta 1 V en alguna parte: una conexión con resistencia o un componente olvidado', 'Que Kirchhoff no se cumple aquí', 'Que la pila da 8 V exactos', 'Nada raro'], 'Kirchhoff siempre se cumple: busca dónde está el voltio que falta.') }
  ] },
  led: { name: 'LED y su resistencia', alts: [
    { title: 'Una presa que se desborda', text: 'Un LED es como una presa: por debajo de cierta tensión (≈2 V en rojo) no pasa nada; en cuanto la superas, el agua se desborda sin control. La resistencia en serie es la compuerta que limita el caudal.', q: mcq('¿Por qué no basta con dar al LED “exactamente” 2 V sin resistencia?', ['Porque un poco más de tensión dispara la corriente y lo quema', 'Porque necesita 9 V', 'Porque el LED no conduce sin resistencia', 'Sí basta'], 'Su curva es muy empinada: la resistencia lo estabiliza.') },
    { title: 'La receta en tres pasos', text: '1) Resta al voltaje de la fuente la tensión del LED: lo que queda cae en la resistencia. 2) Divide eso entre la corriente que quieres. 3) Elige el valor comercial superior.', q: mcq('5 V, LED verde de 2,1 V y 10 mA. ¿Qué resistencia comercial?', ['330 Ω', '220 Ω', '290 Ω', '510 kΩ'], '(5 − 2,1) / 0,01 = 290 Ω → 330 Ω.') }
  ] },
  rc: { name: 'Carga RC', alts: [
    { title: 'Llenar una piscina con una manguera', text: 'Un condensador es una piscina; la resistencia, el grosor de la manguera. Al principio entra mucha agua, pero cuanto más llena está, más presión hace en contra y entra más despacio. τ = R·C dice lo lento que es: manguera más fina o piscina más grande, más tiempo.', q: mcq('Si duplicas la capacidad con la misma resistencia, el tiempo de carga…', ['Se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'τ = R × C.') },
    { title: 'La regla de los 5τ', text: 'Tras 1τ está al 63 %, tras 3τ al 95 % y tras 5τ prácticamente lleno (99 %). Para calcular tiempos de retardo, piensa en múltiplos de τ.', q: mcq('τ = 0,2 s. ¿Cuánto tarda en cargarse casi del todo?', ['Alrededor de 1 s', '0,2 s', '0,04 s', '10 s'], '5 × 0,2 = 1 s.') }
  ] },
  diode: { name: 'Diodo', alts: [
    { title: 'Una válvula antirretorno', text: 'Un diodo es como la válvula de un neumático: deja entrar aire pero no salir. La flecha del símbolo indica el sentido permitido (convencional): de ánodo a cátodo.', q: mcq('En el símbolo del diodo, la corriente puede ir…', ['En el sentido de la flecha (ánodo → cátodo)', 'Contra la flecha', 'En ambos sentidos', 'En ninguno'], 'La barra es el “tope”.') },
    { title: 'El peaje de 0,7 V', text: 'Para conducir, un diodo de silicio “cobra” unos 0,6–0,7 V. Ese peaje se resta siempre de la tensión disponible para el resto del circuito.', q: mcq('Dos diodos de silicio en serie con una pila de 5 V. ¿Qué tensión queda para el resto?', ['Unos 3,6 V', '5 V', '4,3 V', '1,4 V'], '5 − 0,7 − 0,7 ≈ 3,6 V.') }
  ] },
  bjt: { name: 'Transistor', alts: [
    { title: 'Un grifo controlado', text: 'El transistor es un grifo: la corriente de base es la mano que lo abre y la de colector, el agua que pasa. Con poca mano mueves mucha agua; esa multiplicación es β.', q: mcq('β = 100. Si la base recibe 0,2 mA, ¿cuánta corriente puede pasar por el colector como mucho?', ['20 mA', '0,2 mA', '2 mA', '200 mA'], '100 × 0,2 mA.') },
    { title: 'Interruptor: cortado o saturado', text: 'Para usarlo como interruptor solo interesan dos estados: cortado (sin base, no pasa nada, Vce ≈ alimentación) y saturado (base de sobra, pasa todo lo que permite la carga, Vce ≈ 0,1–0,2 V).', q: mcq('Mides Vce = 8,9 V con una alimentación de 9 V. El transistor está…', ['Cortado', 'Saturado', 'Quemado seguro', 'En inversa'], 'Si apenas cae nada en la carga, no conduce.') }
  ] },
  binary: { name: 'Binario', alts: [
    { title: 'Como un cuentakilómetros', text: 'Un cuentakilómetros decimal pasa de 9 a 10 porque cada rueda tiene 10 cifras. En binario cada rueda solo tiene 0 y 1, así que pasa de 1 a 10 (que vale dos). Cada posición vale el doble que la de su derecha: 1, 2, 4, 8, 16…', q: mcq('¿Qué viene después de 0111 en binario?', ['1000', '0112', '1111', '0110'], '7 + 1 = 8 = 1000.') },
    { title: 'Pesos', text: 'Para leer un número binario, escribe debajo los pesos (… 8 4 2 1) y suma los de las posiciones con 1. 1010 = 8 + 2 = 10.', q: mcq('¿Cuánto vale 1100?', ['12', '3', '1100', '6'], '8 + 4.') }
  ] },
  prefix: { name: 'Prefijos', alts: [
    { title: 'La escalera de mil', text: 'Los prefijos son peldaños de 1000 en 1000: p → n → µ → m → (unidad) → k → M. Bajar un peldaño multiplica por 1000; subirlo divide entre 1000.', q: mcq('¿Cuántos µA hay en 1 mA?', ['1000', '10', '100', '0,001'], 'Un peldaño: ×1000.') },
    { title: 'Moviendo la coma', text: 'Cambiar de prefijo es mover la coma 3 posiciones: 4,7 kΩ → 4700 Ω (coma 3 a la derecha); 0,02 A → 20 mA (coma 3 a la derecha).', q: mcq('0,0047 A en mA es…', ['4,7 mA', '47 mA', '0,47 mA', '4700 mA'], 'Coma 3 posiciones a la derecha.') }
  ] },
  pow10: { name: 'Potencias de 10', alts: [
    { title: 'Contar ceros', text: '10³ = 1000 (tres ceros). 10⁻³ = 0,001 (la coma se mueve tres a la izquierda). Multiplicar potencias suma exponentes: 10³ × 10⁻⁶ = 10⁻³.', q: mcq('10⁶ × 10⁻³ = ?', ['10³', '10⁻¹⁸', '10⁹', '10⁻³'], '6 + (−3) = 3.') }
  ] },
  algebra: { name: 'Despejar', alts: [
    { title: 'La balanza', text: 'Una ecuación es una balanza equilibrada: lo que hagas a un lado, házselo al otro. Si V = I·R y quieres R, divide los dos lados entre I: V/I = R.', q: mcq('De P = V × I, despeja V', ['V = P / I', 'V = P × I', 'V = I / P', 'V = P − I'], 'Divide los dos lados entre I.') }
  ] },
  color: { name: 'Código de colores', alts: [
    { title: 'Una frase para recordarlo', text: 'Negro 0, marrón 1, rojo 2, naranja 3, amarillo 4, verde 5, azul 6, violeta 7, gris 8, blanco 9. Del oscuro al claro pasando por el arcoíris. La tercera banda dice cuántos ceros añadir.', q: mcq('Rojo, violeta, naranja', ['27 kΩ', '273 Ω', '2,7 kΩ', '270 kΩ'], '2, 7 y tres ceros: 27 000 Ω.') }
  ] },
  ac: { name: 'Corriente alterna', alts: [
    { title: 'Un columpio', text: 'La alterna es como un columpio: va y viene. La frecuencia es cuántas idas y vueltas completas hace por segundo (50 Hz en Europa). El valor eficaz (rms) es el de una continua que calentaría lo mismo: Vp/√2.', q: mcq('La red europea tiene 230 V eficaces. ¿Cuál es el pico aproximado?', ['325 V', '230 V', '163 V', '460 V'], '230 × √2 ≈ 325 V.') }
  ] },
  filter: { name: 'Filtro RC', alts: [
    { title: 'Un condensador elige frecuencias', text: 'El condensador deja pasar fácilmente las señales rápidas y bloquea las lentas. En un paso bajo RC, el condensador va a masa: “se come” lo rápido y deja pasar lo lento. La frontera es fc = 1/(2πRC).', q: mcq('En un paso bajo RC, si subes la frecuencia muy por encima de fc, la salida…', ['Baja mucho', 'Sube', 'No cambia', 'Se invierte'], 'Lo rápido se va a masa por el condensador.') }
  ] },
  log: { name: 'Logaritmos y dB', alts: [
    { title: 'Contar ceros otra vez', text: 'El logaritmo en base 10 responde a: ¿10 elevado a cuánto da este número? log(100) = 2. Los decibelios usan logaritmos porque el oído y muchos circuitos trabajan en proporciones: 20·log(×10) = 20 dB.', q: mcq('Una ganancia de ×100 en tensión son…', ['40 dB', '20 dB', '100 dB', '2 dB'], '20 · log(100) = 20 · 2.') }
  ] },
  opamp: { name: 'Amplificador operacional', alts: [
    { title: 'Las dos reglas de oro', text: 'Con realimentación negativa: 1) las entradas no consumen corriente; 2) la salida hace lo necesario para que las dos entradas tengan la misma tensión. Con eso se deducen todas las fórmulas.', q: mcq('En un seguidor de tensión (salida unida a la entrada −), si IN+ = 2 V, la salida es…', ['2 V', '0 V', 'La alimentación', '4 V'], 'La salida iguala las entradas.') }
  ] },
  ic555: { name: 'Temporizador 555', alts: [
    { title: 'Un condensador que sube y baja', text: 'Dentro del 555 hay dos comparadores que vigilan el condensador: cuando llega a 2/3 de la alimentación, lo descarga; cuando baja a 1/3, lo vuelve a cargar. La salida cambia en cada vuelta: eso es el parpadeo.', q: mcq('Si usas un condensador más grande en un 555 astable, el LED parpadea…', ['Más despacio', 'Más rápido', 'Igual', 'Deja de parpadear'], 'Más capacidad, más tiempo en cargar y descargar.') }
  ] },
  pullup: { name: 'Pull-up', alts: [
    { title: 'Un muelle', text: 'Una resistencia de pull-up es un muelle que mantiene la entrada arriba (HIGH) cuando nadie la toca. El pulsador, al cerrarse, la lleva a masa con más fuerza que el muelle: LOW.', q: mcq('Sin pull-up ni pull-down, una entrada sin conectar…', ['Lee valores al azar (flota)', 'Lee siempre LOW', 'Lee siempre HIGH', 'Se quema'], 'Por eso siempre hay que fijarla.') }
  ] },
  meter_v: { name: 'Medir tensión', alts: [
    { title: 'Mirar desde fuera', text: 'Para medir tensión no hay que tocar el circuito: el multímetro se apoya por fuera, una punta a cada lado del componente, como quien compara la altura de dos escalones. Por dentro tiene muchísima resistencia y apenas roba corriente.', q: mcq('¿Hay que abrir el circuito para medir tensión?', ['No: se mide en paralelo', 'Sí: se mide en serie', 'Solo con multímetro manual', 'Solo si es alterna'], 'Paralelo, sin desmontar nada.') }
  ] },
  meter_a: { name: 'Medir corriente', alts: [
    { title: 'Un contador en la tubería', text: 'Para contar el agua que pasa hay que cortar la tubería y meter el contador en medio: toda el agua lo atraviesa. Con la corriente igual: se abre el circuito y el multímetro va en serie, con la punta roja en mA.', q: mcq('¿Por qué es peligroso poner el multímetro en modo corriente en paralelo con una pila?', ['Porque por dentro es casi un cable y provoca un cortocircuito', 'Porque mide alterna', 'Porque marca negativo', 'No es peligroso'], 'El fusible está ahí por eso.') }
  ] },
  breadboard: { name: 'Protoboard', alts: [
    { title: 'Tiras ocultas', text: 'Debajo de cada columna de 5 agujeros hay una pinza metálica: todo lo que pinches en la misma columna (a–e) queda unido. La ranura central separa la mitad de arriba de la de abajo. Las filas largas de los bordes son la alimentación.', q: mcq('Pinchas un cable en b7 y otro en e7. ¿Están conectados?', ['Sí, misma columna y mismo lado', 'No, filas distintas', 'Solo si hay un puente', 'Depende del cable'], 'a–e de la misma columna = un solo nudo.') }
  ] },
  schematic: { name: 'Esquemas', alts: [
    { title: 'Un mapa de metro', text: 'Un esquema es como un mapa de metro: no respeta las distancias reales, solo qué está unido con qué. Dos dibujos muy distintos pueden ser el mismo circuito.', q: mcq('Dos esquemas tienen formas distintas pero las mismas conexiones. ¿Son el mismo circuito?', ['Sí', 'No', 'Solo si tienen el mismo tamaño', 'Solo si los colores coinciden'], 'Lo que importa son las conexiones.') }
  ] },
  cap: { name: 'Condensador', alts: [
    { title: 'Un depósito pequeño', text: 'Un condensador guarda carga entre dos placas. Se llena y se vacía muy rápido, y en continua, una vez lleno, no deja pasar corriente. Su capacidad (µF) es el tamaño del depósito.', q: mcq('En continua y ya cargado, un condensador se comporta como…', ['Un circuito abierto', 'Un cable', 'Una pila infinita', 'Una resistencia de 0 Ω'], 'Bloquea la continua.') }
  ] },
  logic: { name: 'Puertas lógicas', alts: [
    { title: 'Interruptores', text: 'AND son interruptores en serie (todos cerrados para que pase). OR son interruptores en paralelo (basta uno). NOT invierte. Todas las demás se construyen combinándolas.', q: mcq('Una alarma suena si la puerta está abierta O la ventana está abierta. ¿Qué puerta?', ['OR', 'AND', 'NOT', 'NAND'], 'Basta una condición.') }
  ] },
  pwm: { name: 'PWM', alts: [
    { title: 'Parpadeo muy rápido', text: 'Si enciendes y apagas una luz muy rápido, el ojo ve la media. PWM hace eso cientos de veces por segundo: con el 25 % del tiempo encendido, ves un 25 % de brillo.', q: mcq('analogWrite(pin, 255) equivale a…', ['Siempre encendido', 'Apagado', 'La mitad', '255 V'], '255 es el máximo: 100 %.') }
  ] },
  adc: { name: 'Conversión analógica', alts: [
    { title: 'Una regla con marcas', text: 'El ADC mide una tensión con una regla de marcas: la Uno tiene 1024 marcas entre 0 y 5 V (unos 4,9 mV cada una). El número que devuelve es la marca más cercana.', q: mcq('analogRead devuelve 512 en una Uno. ¿Tensión aproximada?', ['2,5 V', '5 V', '512 V', '1 V'], '512/1023 × 5 ≈ 2,5 V.') }
  ] }
};
