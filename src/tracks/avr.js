/* Voltio · especialidad: Arduino y AVR a fondo.
   El ATmega328P registro a registro: puertos, temporizadores, interrupciones, periféricos,
   bajo consumo, el chip fuera de la placa y las herramientas de un profesional.
   Datos técnicos según la hoja de datos del ATmega328P; todo el texto y el código son originales. */
(() => {
  const FCPU = 16e6;
  const { num, st } = Widgets.H;
  const fHz = f => f >= 1e6 ? num(f / 1e6, 3) + ' MHz' : f >= 1000 ? num(f / 1000, 3) + ' kHz' : num(f, f < 10 ? 3 : 2) + ' Hz';
  const fT = s => s >= 1 ? num(s, 3) + ' s' : s >= 1e-3 ? num(s * 1e3, 3) + ' ms' : s >= 1e-6 ? num(s * 1e6, 2) + ' µs' : num(s * 1e9, 1) + ' ns';
  const hx = v => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(2, '0');
  const b8 = v => '0b' + (v >>> 0).toString(2).padStart(8, '0');
  const th = n => n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);

  /* ===================== CONCEPTOS ===================== */
  Object.assign(CONCEPTS, {
    av_core: { name: 'El núcleo AVR', alts: [
      { title: 'La cocina', text: 'Piensa en el chip como una cocina. La <b>Flash</b> es el recetario, la <b>SRAM</b> la despensa y los <b>32 registros</b> la encimera. Solo se cocina sobre la encimera: para sumar dos variables, primero se traen de la despensa (lds), se opera en la encimera (add) y se devuelve el resultado (sts).', q: mcq('¿Dónde hace sus operaciones la ALU de un AVR?', ['Sobre los registros R0–R31', 'Directamente sobre la SRAM', 'Sobre la Flash', 'Sobre la EEPROM'], 'Arquitectura de carga y almacenamiento: los datos pasan por los registros.') },
      { title: 'Con números', text: 'A 16 MHz, un ciclo dura 1 / 16 000 000 s = <b>62,5 ns</b>. Casi todas las instrucciones tardan 1 ciclo. Como la CPU es de 8 bits, una suma de 16 bits son dos instrucciones: add (byte bajo) y adc (byte alto, con el acarreo).', q: mcq('¿Cuánto tarda una suma de 16 bits (add + adc) a 16 MHz?', ['125 ns', '62,5 ns', '1 µs', '16 ns'], 'Dos instrucciones de un ciclo: 2 × 62,5 ns.') },
      { title: 'Dos carreteras', text: 'En la arquitectura <b>Harvard</b> el programa y los datos viajan por carreteras distintas. Mientras la CPU ejecuta una instrucción, por la otra carretera ya llega la siguiente desde la Flash. Por eso puede ir a una instrucción por ciclo.', q: mcq('¿Qué permite que la CPU traiga la siguiente instrucción mientras ejecuta la actual?', ['Los buses separados de programa y datos', 'Tener 32 registros', 'El cristal de 16 MHz', 'La EEPROM'], 'Es la ventaja principal de la arquitectura Harvard.') }
    ] },
    av_mem: { name: 'Memorias del AVR', alts: [
      { title: 'Libro, pizarra y libreta', text: '<b>Flash</b>: un libro impreso. Guarda el programa y las constantes y no se borra al apagar, pero reescribirlo cuesta. <b>SRAM</b>: una pizarra. Rápida, pero se borra al apagar. <b>EEPROM</b>: una libreta. Lenta al escribir y se gasta con el uso, pero conserva lo que anotas.', q: mcq('¿Dónde guardas cuántas veces se ha encendido un aparato?', ['En la EEPROM', 'En la SRAM', 'En los registros', 'En una variable local'], 'Debe sobrevivir al apagado y cambiar a veces: EEPROM.') },
      { title: 'El mapa de direcciones', text: 'La SRAM va de 0x0100 a 0x08FF. Abajo están las variables globales (.data y .bss) y, encima, el montón, que crece hacia arriba. La <b>pila</b> empieza en 0x08FF y crece hacia abajo. Si se encuentran, se pisan.', q: mcq('¿Hacia dónde crece la pila en un AVR?', ['Hacia direcciones más bajas, desde el final de la SRAM', 'Hacia arriba desde 0x0100', 'Dentro de la Flash', 'Dentro de la EEPROM'], 'Empieza en RAMEND (0x08FF) y baja con cada llamada.') },
      { title: 'Cuentas de RAM', text: 'Solo hay <b>2048 bytes</b>. Un int ocupa 2 bytes, un long 4, un float 4. Un array de 200 int son 400 bytes: casi el 20 % de toda la memoria, antes de contar la pila.', q: mcq('int lecturas[600]; ¿cuánta SRAM ocupa?', ['1200 bytes: más de la mitad de la SRAM', '600 bytes', '2400 bytes', 'Nada: va a la Flash'], 'Cada int son 2 bytes en AVR.') }
    ] },
    av_ports: { name: 'Registros de puerto', alts: [
      { title: 'Tres preguntas por pata', text: '<b>DDRx</b>: ¿hablo o escucho? (1 = salida). <b>PORTx</b>: si hablo, ¿qué digo?; si escucho, ¿activo la pull-up? <b>PINx</b>: ¿qué estoy oyendo realmente en la pata?', q: mcq('DDRB bit 0 = 0 y PORTB bit 0 = 1. La pata PB0 es…', ['Una entrada con pull-up', 'Una salida a 1', 'Una salida a 0', 'Una entrada flotante'], 'DDR a 0 = entrada; PORT a 1 en una entrada = pull-up.') },
      { title: 'El mapa de Arduino', text: 'D0–D7 son PD0–PD7: mismo número. D8–D13 son PB0–PB5: resta 8. A0–A5 son PC0–PC5. Así, D13 es PB5 y D10 es PB2.', q: mcq('¿Qué es D12?', ['PB4', 'PD12', 'PB12', 'PC4'], 'Puerto B, 12 − 8 = 4.') },
      { title: 'Leer el byte', text: 'Escribe el valor en binario y lee de derecha a izquierda: el bit de la derecha es el 0. DDRD = 0xF0 = 0b11110000: los bits 4 a 7 están a 1, así que D4–D7 son salidas y D0–D3, entradas.', q: mcq('DDRD = 0x0F. ¿Qué pines son salidas?', ['D0–D3', 'D4–D7', 'Todos', 'Ninguno'], '0x0F = 0b00001111: los cuatro bits bajos.') }
    ] },
    av_bits: { name: 'Operaciones de bits', alts: [
      { title: 'Tres herramientas', text: '<b>OR</b> (|) enciende: un 1 en la máscara fuerza un 1 y un 0 deja el bit como estaba. <b>AND con la máscara negada</b> (&amp; ~) apaga. <b>XOR</b> (^) invierte. Las tres respetan los bits donde la máscara tiene 0.', q: mcq('¿Qué operación pone a 1 los bits marcados y deja igual el resto?', ['OR', 'AND', 'XOR', 'Asignar la máscara con ='], 'x | 1 = 1 y x | 0 = x.') },
      { title: 'Paso a paso', text: 'PORTB = 0b00001111. Para encender el bit 5: 1 &lt;&lt; 5 = 0b00100000. OR: 0b00101111 = 0x2F. Para apagar el bit 0: ~(1 &lt;&lt; 0) = 0b11111110; AND: 0b00001110.', q: mcq('0b00001111 & ~(1 << 0) = ?', ['0b00001110', '0b00001111', '0b11111110', '0b00000001'], 'La máscara negada tiene un 0 solo en el bit 0.') },
      { title: 'Cuidado con la precedencia', text: 'En C, == y != se evalúan <b>antes</b> que &amp;, | y ^. Escribe siempre los paréntesis: if ((PIND &amp; (1 &lt;&lt; PD2)) == 0). Sin ellos, la comparación se hace primero y el resultado no tiene sentido.', q: mcq('¿Cómo se evalúa a & b == 0 en C?', ['a & (b == 0)', '(a & b) == 0', 'Da error de compilación', 'a == 0'], '== tiene más prioridad que &.') }
    ] },
    av_timer: { name: 'Temporizadores', alts: [
      { title: 'El metrónomo', text: 'El <b>prescaler</b> decide cada cuántos ciclos de reloj avanza el contador. <b>OCR</b> decide hasta cuánto cuenta antes de volver a empezar. Más prescaler o más OCR: periodos más largos.', q: mcq('Duplicas el prescaler y dejas OCR igual. La frecuencia de interrupción…', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Se cuadruplica'], 'Cada cuenta dura el doble.') },
      { title: 'La fórmula con números', text: '<b>f = F_CPU / (N · (OCR + 1))</b>. Con N = 64 y OCR = 249: 16 000 000 / (64 × 250) = 1000 Hz. El +1 aparece porque el contador pasa por 0, 1, …, OCR: son OCR + 1 cuentas.', q: mcq('N = 8 y OCR1A = 1999 en CTC. ¿Frecuencia?', ['1 kHz', '2 kHz', '500 Hz', '8 kHz'], '16 000 000 / (8 × 2000) = 1000 Hz.') },
      { title: 'Contar tiempo en ticks', text: 'Un tick dura N / F_CPU. Con N = 64 a 16 MHz, 4 µs; 250 ticks son 1 ms. Para cualquier tiempo: ticks = tiempo / duración de un tick.', q: mcq('Prescaler 256 a 16 MHz. ¿Cuántos ticks son 1 ms?', ['62,5', '250', '16', '1000'], 'Cada tick dura 16 µs: 1000 / 16 = 62,5. No sale entero: con ese prescaler no hay 1 ms exacto.') }
    ] },
    av_pwm: { name: 'PWM por hardware', alts: [
      { title: 'Sierra y umbral', text: 'El contador sube como una sierra de 0 a TOP. La salida está a 1 mientras el contador no ha alcanzado OCR y a 0 el resto. El ciclo de trabajo es la parte de la sierra que queda por debajo del umbral.', q: mcq('Fast PWM con TOP = 199 y OCR = 49. ¿Ciclo de trabajo?', ['25 %', '49 %', '20 %', '75 %'], '(OCR + 1) / (TOP + 1) = 50 / 200.') },
      { title: 'Frecuencia contra resolución', text: 'TOP fija las dos cosas a la vez: <b>f = F_CPU / (N · (TOP + 1))</b> y hay <b>TOP + 1</b> niveles. Reducir TOP a la mitad duplica la frecuencia y quita un bit de resolución.', q: mcq('Fast PWM a 62,5 kHz con prescaler 1. ¿TOP?', ['255', '127', '511', '62'], '16 000 000 / 256 = 62 500 Hz.') },
      { title: 'Rápido o simétrico', text: '<b>Fast PWM</b>: sierra, frecuencia máxima. <b>Phase Correct</b>: sube y baja, frecuencia mitad, pero el pulso queda centrado en el periodo y no se mueve al cambiar el ciclo de trabajo.', q: mcq('¿Por qué se prefiere Phase Correct para motores con puente H?', ['Los pulsos son simétricos y centrados: conmutaciones más limpias', 'Porque tiene el doble de frecuencia', 'Porque siempre tiene más resolución', 'Porque gasta menos batería'], 'Mitad de frecuencia a cambio de simetría.') }
    ] },
    av_isr: { name: 'Interrupciones', alts: [
      { title: 'El timbre de casa', text: 'Estás cocinando (loop). Suena el timbre (la bandera). Terminas el gesto que hacías, abres la puerta (la ISR) y vuelves. Si te entretienes en la puerta, se quema la comida y no oyes el teléfono: las ISR deben ser <b>cortas</b>.', q: mcq('Una ISR que tarda demasiado…', ['Retrasa o hace perder otros eventos y frena el programa principal', 'No afecta a nada', 'Hace el programa más rápido', 'Se repite sola'], 'Mientras dura, el resto espera.') },
      { title: 'Dos problemas distintos', text: '<b>Visibilidad</b>: sin volatile, el compilador puede no volver a leer la variable que cambia la ISR. <b>Atomicidad</b>: una variable de 16 o 32 bits se lee en varios pasos y la ISR puede saltar en medio. volatile arregla lo primero; ATOMIC_BLOCK, lo segundo.', q: mcq('Una variable de 16 bits compartida con una ISR necesita…', ['volatile y leerla con las interrupciones desactivadas', 'Solo volatile', 'Solo ATOMIC_BLOCK', 'Nada'], 'Son dos problemas y cada uno tiene su remedio.') },
      { title: 'Tres llaves', text: 'Para que salte una interrupción hacen falta tres cosas: su <b>bandera</b> activa, su <b>habilitación local</b> (en TIMSKn, EIMSK…) y el <b>permiso global</b>, el bit I de SREG (sei()).', q: mcq('OCF1A y OCIE1A están a 1, pero la ISR no salta. ¿Qué falta?', ['El bit I de SREG (sei())', 'Otra bandera', 'El prescaler', 'Una variable volatile'], 'Sin el permiso global no salta ninguna.') }
    ] },
    av_adc: { name: 'El ADC por registros', alts: [
      { title: 'Regla de tres', text: 'El ADC compara la entrada con la referencia: <b>ADC = Vin · 1024 / Vref</b>. Al revés: Vin = ADC · Vref / 1024. Con la referencia interna de 1,1 V, cada paso vale poco más de 1 mV.', q: mcq('Referencia interna de 1,1 V y lectura 512. ¿Vin?', ['0,55 V', '2,5 V', '1,1 V', '0,51 V'], '512 / 1024 es la mitad de la referencia.') },
      { title: 'El reloj del ADC', text: 'El ADC necesita su propio reloj, entre <b>50 y 200 kHz</b> para dar 10 bits. Sale del reloj de la CPU con un prescaler de 2 a 128. A 16 MHz solo /128 cumple (125 kHz): 13 ciclos = 104 µs por conversión.', q: mcq('A 8 MHz, ¿qué prescaler da el ADC más rápido dentro de 50–200 kHz?', ['64 (125 kHz)', '128', '32', '16'], '8 MHz / 32 = 250 kHz se pasa; /64 = 125 kHz.') },
      { title: 'Llenar una taza', text: 'Al muestrear, un condensador interno de unos 14 pF se llena desde tu fuente a través de su resistencia. Si la fuente tiene mucha resistencia, no se llena a tiempo y la lectura sale baja o arrastra el valor del canal anterior.', q: mcq('Lees un divisor de 1 MΩ y las lecturas bailan. ¿Solución?', ['Un condensador de 100 nF en la entrada o un seguidor con operacional', 'Un prescaler más rápido', 'Cambiar a AREF', 'Ninguna'], 'Hay que darle a la taza un grifo con caudal.') }
    ] },
    av_uart: { name: 'USART y baudios', alts: [
      { title: 'Dos relojes que no se hablan', text: 'Emisor y receptor miden los bits con sus propios relojes. El receptor se sincroniza con el bit de inicio y muestrea en mitad de cada bit. Si los relojes difieren, al final de la trama (10 bits) el desfase se ha acumulado; medio bit de desfase sería un 5 %, y con margen para el ruido se recomienda no pasar de ±2 % en total.', q: mcq('¿Por qué el error de baudios se acumula a lo largo de la trama?', ['Cada bit se mide desde el bit de inicio: el desfase crece bit a bit', 'Por la longitud del cable', 'Por la paridad', 'No se acumula'], 'Por eso las tramas son cortas.') },
      { title: 'UBRR con números', text: '9600 baudios a 16 MHz: 16 000 000 / (16 × 9600) − 1 = 103,17 → 103. Baudios reales: 16 000 000 / (16 × 104) = 9615. Error: +0,16 %.', q: mcq('UBRR0 = 51 a 16 MHz, modo normal. ¿Baudios reales?', ['19 231', '19 200', '9615', '38 462'], '16 000 000 / (16 × 52).') },
      { title: 'La trama', text: 'En reposo la línea está a 1. Un 0 (inicio) avisa. Luego van los 8 bits de datos, <b>el menos significativo primero</b>, y un 1 de parada. 8N1 = 8 datos, sin paridad, 1 de parada.', q: mcq('En 8N1, ¿cuántos bits viajan por cada byte?', ['10', '8', '9', '11'], 'Inicio + 8 datos + parada.') }
    ] },
    av_bus: { name: 'Buses SPI e I²C', alts: [
      { title: 'SPI: dos registros en anillo', text: 'En SPI, el registro del maestro y el del esclavo forman un anillo. Cada pulso de SCK saca un bit de cada uno y lo mete en el otro. Tras 8 pulsos han intercambiado sus bytes.', q: mcq('¿Por qué para leer por SPI hay que escribir?', ['Cada pulso de reloj intercambia un bit en cada sentido: sin enviar no hay reloj', 'Por seguridad', 'No hace falta', 'Para despertar al esclavo'], 'El maestro solo genera reloj al enviar.') },
      { title: 'I²C: una reunión ordenada', text: 'En I²C todos comparten dos cables. Se habla por turnos y llamando por el nombre (la dirección). Nadie empuja la línea a 1: lo hacen las pull-ups; cada uno solo puede tirar a 0. El ACK es un “te he oído”: el receptor tira la línea a 0.', q: mcq('Si ningún dispositivo responde a una dirección…', ['El ACK queda a 1 (NACK) y el maestro lo ve en TWSR', 'El bus se rompe', 'Responde el más cercano', 'El maestro se reinicia'], 'Nadie tira de la línea: queda en 1 por la pull-up.') },
      { title: 'Cuándo usar cada uno', text: 'SPI: rápido (MHz), sin direcciones, un CS por esclavo, más cables. I²C: solo dos cables y muchos dispositivos con dirección, pero lento (100–400 kHz).', q: mcq('Una pantalla a color que se refresca muchas veces por segundo va mejor por…', ['SPI', 'I²C a 100 kHz', 'UART a 9600', 'Da igual'], 'Muchos datos: el bus rápido.') }
    ] },
    av_sleep: { name: 'Bajo consumo', alts: [
      { title: 'Media ponderada', text: 'Consumo medio = (I despierto × t despierto + I dormido × t dormido) / periodo. Si duermes el 99,9 % del tiempo, casi siempre manda la corriente <b>dormido</b>.', q: mcq('10 mA durante 10 ms cada 10 s y 5 µA dormido. ¿Media aproximada?', ['15 µA', '10 mA', '5 µA', '1 mA'], '10 mA × 0,001 = 10 µA, más 5 µA.') },
      { title: 'Lo que gasta dormido', text: 'En power-down el chip baja a décimas de µA, pero pueden seguir gastando: el ADC encendido, el BOD, el watchdog, entradas flotantes, el regulador, LEDs y sensores. Hay que apagar cada uno.', q: mcq('¿Qué NO puede despertar al chip de power-down?', ['El desbordamiento del Timer1 con el reloj interno', 'El watchdog', 'Un PCINT', 'INT0 por nivel bajo'], 'En power-down el reloj de E/S está parado: el Timer1 no cuenta.') },
      { title: 'Placa contra chip', text: 'Una Uno entera sigue gastando decenas de mA con el 328P dormido: el ATmega16U2 del USB, el regulador y el LED de encendido. El chip suelto, en power-down, gasta miles de veces menos.', q: mcq('Para un sensor a pilas que dure un año…', ['Chip suelto (o placa mínima sin LED ni regulador) en power-down', 'Una Uno en power-down', 'Una Uno con delay()', 'Una Uno con el USB conectado'], 'La placa entera es la que gasta.') }
    ] },
    av_isp: { name: 'Programación y fusibles', alts: [
      { title: 'Dos puertas', text: 'El <b>bootloader</b> es una puerta de servicio que abre el propio chip: un programa que escucha el puerto serie al arrancar. El <b>ISP</b> es la puerta principal: SPI con RESET a 0, siempre disponible (si no tocas SPIEN ni RSTDISBL), aunque la Flash esté vacía.', q: mcq('Un chip nuevo sin bootloader se programa…', ['Por ISP', 'Por USB-serie', 'No se puede', 'Por I²C'], 'El ISP no necesita nada grabado.') },
      { title: 'Fusibles al revés', text: 'En los fusibles, un bit a <b>0 significa programado</b> (activo) y un 1, no programado. CKDIV8 = 0 divide el reloj entre 8; BOOTRST = 0 hace arrancar en el bootloader.', q: mcq('CKDIV8 = 0 significa…', ['Que el reloj se divide entre 8', 'Que está desactivado', 'Que el chip va a 8 MHz', 'Que arranca en el bootloader'], '0 = programado = activo.') },
      { title: 'Lo que cuesta deshacer', text: 'RSTDISBL convierte RESET en una E/S y el ISP deja de funcionar. SPIEN a 1 apaga el ISP. Un CKSEL de reloj externo sin reloj deja el chip mudo hasta que le des uno. Los dos primeros solo se arreglan con un programador de alta tensión.', q: mcq('¿Qué fusible te deja sin ISP?', ['RSTDISBL programado', 'EESAVE', 'CKOUT', 'BODLEVEL'], 'Sin pata RESET no hay modo de programación por SPI.') }
    ] },
    av_tool: { name: 'Herramientas de compilación', alts: [
      { title: 'Cadena de montaje', text: '.c → avr-gcc → .o → enlazador → .elf → avr-objcopy → .hex → avrdude → chip. El .elf lo tiene todo (código, símbolos, depuración); el .hex es solo lo que se graba.', q: mcq('¿Qué archivo graba avrdude en la Flash?', ['El .hex', 'El .c', 'El .o', 'El .map'], 'El .hex es la imagen de la Flash en texto.') },
      { title: 'Leer avr-size', text: '<b>text</b>: código y constantes. <b>data</b>: variables con valor inicial (ocupan Flash, para copiarse, y SRAM). <b>bss</b>: variables a cero (solo SRAM). SRAM estática = data + bss.', q: mcq('text 2000, data 100, bss 300. ¿SRAM estática?', ['400 bytes', '2100 bytes', '300 bytes', '2400 bytes'], 'data + bss.') },
      { title: 'El .lst como lupa', text: 'avr-objdump -d -S main.elf mezcla cada línea de C con las instrucciones que generó. Ahí ves si una operación es atómica, cuántos registros guarda una ISR o por qué un bucle es lento.', q: mcq('¿Dónde ves qué instrucciones generó el compilador para tu ISR?', ['En el listado de avr-objdump (.lst)', 'En el .hex', 'En el .eep', 'En el código fuente'], 'El .hex no se puede leer a simple vista.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const fI = mA => mA >= 1 ? fmt(mA, 2) + ' mA' : fmt(mA * 1000, 2) + ' µA';

  Gen.add('av_ctcOcr', () => {
    const t1 = Math.random() < 0.6, max = t1 ? 65536 : 256;
    const fs = [1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 4000, 5000, 8000, 10000, 20000, 40000, 50000];
    const ok = [];
    fs.forEach(f => [1, 8, 64, 256, 1024].forEach(n => { const k = FCPU / (n * f); if (Number.isInteger(k) && k <= max && k >= 4) ok.push([f, n, k]); }));
    const [f, n, k] = pick(ok);
    const tn = t1 ? 'Timer1' : 'Timer0', reg = t1 ? 'OCR1A' : 'OCR0A';
    if (Math.random() < 0.65) return N(`${tn} en modo CTC con prescaler ${n} a 16 MHz. ¿Qué valor pones en ${reg} para que la interrupción salte ${th(f)} veces por segundo?`, k - 1, '', `Cuentas por periodo = 16 000 000 / (${n} × ${th(f)}) = ${th(k)}. El contador va de 0 a ${reg} incluido, así que ${reg} = ${th(k)} − 1 = ${th(k - 1)}.`, 0.5);
    return N(`${tn} en CTC a 16 MHz, prescaler ${n}, ${reg} = ${k - 1}, con la patilla OC conmutando en cada coincidencia. ¿Frecuencia de la onda cuadrada de la patilla, en Hz?`, f / 2, 'Hz', `Coincide 16 000 000 / (${n} × ${th(k)}) = ${th(f)} veces por segundo, y un periodo completo necesita dos conmutaciones: ${fmt(f / 2)} Hz.`, Math.max(0.01, f / 2 * 0.01));
  }, 'av_timer');

  Gen.add('av_ovf', () => {
    const [tn, top] = pick([['Timer0', 256], ['Timer2', 256], ['Timer1', 65536]]);
    const n = tn === 'Timer2' ? pick([1, 8, 32, 64, 128, 256, 1024]) : pick([1, 8, 64, 256, 1024]);
    const s = top * n / FCPU;
    return N(`${tn} en modo normal a 16 MHz con prescaler ${n}. ¿Cada cuántos milisegundos se desborda?`, s * 1000, 'ms', `${th(top)} cuentas × ${n} / 16 000 000 = ${fT(s)}.${tn === 'Timer0' && n === 64 ? ' Es el desbordamiento que usa millis() en Arduino.' : ''}`, Math.max(0.0005, s * 10));
  }, 'av_timer');

  Gen.add('av_pwmFreq', () => {
    const c = pick(['fast8', 'pc8', 'fast16']);
    if (c === 'fast16') {
      const n = pick([1, 8, 64]), top = pick([199, 399, 639, 799, 999, 1999, 3999, 9999, 19999, 39999]);
      const f = FCPU / (n * (top + 1));
      return MC(`Timer1 en Fast PWM (modo 14, TOP = ICR1 = ${top}) con prescaler ${n} a 16 MHz. ¿Frecuencia del PWM?`, fHz(f), [fHz(FCPU / (n * top)), fHz(f / 2), fHz(f * 2), fHz(n === 1 ? f / 8 : FCPU / (top + 1))], `f = F_CPU / (N · (TOP + 1)) = 16 000 000 / (${n} × ${th(top + 1)}) = ${fHz(f)}. El +1 es porque cuenta de 0 a TOP incluido.`);
    }
    const n = pick([1, 8, 64, 256, 1024]);
    if (c === 'fast8') {
      const f = FCPU / (n * 256);
      return MC(`Timer0 en Fast PWM de 8 bits (TOP = 255) con prescaler ${n} a 16 MHz. ¿Frecuencia?`, fHz(f), [fHz(FCPU / (n * 255)), fHz(FCPU / (n * 510)), fHz(f * 2)], `f = 16 000 000 / (${n} × 256) = ${fHz(f)}.${n === 64 ? ' Es la de analogWrite en los pines 5 y 6.' : ''}`);
    }
    const f = FCPU / (n * 510);
    return MC(`Timer2 en Phase Correct de 8 bits (TOP = 255) con prescaler ${n} a 16 MHz. ¿Frecuencia?`, fHz(f), [fHz(FCPU / (n * 256)), fHz(FCPU / (n * 255)), fHz(FCPU / (n * 1020))], `Sube de 0 a 255 y baja: 510 cuentas por periodo. f = 16 000 000 / (${n} × 510) = ${fHz(f)}.${n === 64 ? ' Es la de analogWrite en los pines 3, 9, 10 y 11.' : ''}`);
  }, 'av_pwm');

  Gen.add('av_ubrr', () => {
    const fc = pick([16e6, 16e6, 8e6]), b = pick([2400, 4800, 9600, 19200, 31250, 38400, 57600, 115200, 250000]);
    const u2 = Math.random() < 0.4, d = u2 ? 8 : 16, u = Math.round(fc / (d * b) - 1);
    return N(`F_CPU = ${fmt(fc / 1e6)} MHz y ${th(b)} baudios ${u2 ? 'con U2X0 = 1 (divide entre 8)' : 'en modo normal (divide entre 16)'}. ¿Qué valor va en UBRR0?`, u, '', `UBRR0 = F_CPU / (${d} × baudios) − 1 = ${fmt(fc / (d * b) - 1, 2)} → se redondea a ${u}.`, 0.5);
  }, 'av_uart');

  Gen.add('av_baudErr', () => {
    const fc = pick([16e6, 16e6, 8e6]), b = pick([9600, 19200, 38400, 57600, 115200]);
    const u2 = Math.random() < 0.5, d = u2 ? 8 : 16, u = Math.max(0, Math.round(fc / (d * b) - 1));
    const real = fc / (d * (u + 1)), err = (real / b - 1) * 100, ae = Math.abs(err);
    return N(`F_CPU = ${fmt(fc / 1e6)} MHz, ${th(b)} baudios ${u2 ? 'con U2X0 = 1' : 'sin U2X0'}, UBRR0 = ${u}. ¿Error de baudios en %, en valor absoluto?`, ae, '%', `Baudios reales = F_CPU / (${d} × ${u + 1}) = ${fmt(real, 1)}. Error = ${err >= 0 ? '+' : '−'}${fmt(ae, 2)} %. ${ae > 2 ? 'Demasiado: fallará a ratos.' : ae > 1 ? 'Funciona, pero con poco margen.' : 'Sin problema.'}`, Math.max(0.03, ae * 0.03));
  }, 'av_uart');

  Gen.add('av_adcTime', () => {
    const ps = pick([2, 4, 8, 16, 32, 64, 128]), fc = pick([16e6, 16e6, 8e6]), fa = fc / ps;
    const full = fa >= 50e3 && fa <= 200e3 ? 'Ese reloj está entre 50 y 200 kHz: 10 bits completos.' : 'Ese reloj está fuera de 50–200 kHz: perderás resolución.';
    if (Math.random() < 0.55) {
      const first = Math.random() < 0.3, cyc = first ? 25 : 13, t = cyc / fa;
      return N(`ADC con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler ${ps}. ¿Cuánto tarda ${first ? 'la primera conversión tras activar ADEN (25 ciclos de ADC)' : 'una conversión normal (13 ciclos de ADC)'}, en µs?`, t * 1e6, 'µs', `Reloj del ADC = ${fHz(fa)}; ${cyc} ciclos = ${fmt(t * 1e6, 2)} µs. ${full}`, t * 1e6 * 0.01);
    }
    const sps = fa / 13;
    return N(`ADC en modo continuo (13 ciclos por conversión) con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler ${ps}. ¿Muestras por segundo?`, sps, 'muestras/s', `${fHz(fa)} / 13 = ${fmt(sps, 0)} muestras por segundo. ${full}`, sps * 0.01);
  }, 'av_adc');

  Gen.add('av_mask', () => {
    const r = ri(0, 255), a = ri(0, 7); let b = ri(0, 7); if (b === a) b = (a + 3) & 7;
    const reg = pick(['PORTB', 'PORTD', 'DDRC', 'TIMSK1', 'ADCSRA']), m = 1 << a, m1 = 1 << ((a + 1) & 7), op = pick(['or', 'and', 'xor', 'or2']);
    let expr, res, wrong, why;
    if (op === 'or') { expr = `${reg} |= (1 << ${a});`; res = r | m; wrong = [m, r | m1, r & ~m & 255, r ^ m]; why = `La máscara es ${b8(m)}: OR pone a 1 el bit ${a} y respeta el resto.`; }
    else if (op === 'and') { expr = `${reg} &= ~(1 << ${a});`; res = r & ~m & 255; wrong = [r & m, ~m & 255, r | m, r & ~m1 & 255]; why = `~(1 << ${a}) = ${b8(~m & 255)}: AND pone a 0 solo el bit ${a}.`; }
    else if (op === 'xor') { expr = `${reg} ^= (1 << ${a});`; res = r ^ m; wrong = [r | m, r & ~m & 255, ~r & 255, r ^ m1]; why = `XOR con ${b8(m)} invierte solo el bit ${a}.`; }
    else { const mm = m | (1 << b); expr = `${reg} |= (1 << ${a}) | (1 << ${b});`; res = r | mm; wrong = [mm, r | m, r & ~mm & 255, r ^ mm]; why = `Máscara = ${b8(mm)} (${hx(mm)}). OR pone a 1 los bits ${a} y ${b}.`; }
    return MC(`${reg} vale ${hx(r)} (${b8(r)}). ¿Cuánto vale después de esta línea?`, hx(res), wrong.map(hx), `${why} Resultado: ${b8(res)} = ${hx(res)}.`, { code: expr });
  }, 'av_bits');

  const PINMAP = [];
  for (let i = 0; i <= 7; i++) PINMAP.push(['D' + i, 'D', i]);
  for (let i = 8; i <= 13; i++) PINMAP.push(['D' + i, 'B', i - 8]);
  for (let i = 0; i <= 5; i++) PINMAP.push(['A' + i, 'C', i]);
  Gen.add('av_pinMap', () => {
    const [p, P, bit] = pick(PINMAP);
    const others = ['B', 'C', 'D'].filter(x => x !== P);
    if (Math.random() < 0.5) {
      const n = +p.slice(1);
      const wrong = [`P${others[0]}${bit}`, `P${others[1]}${bit}`, p[0] === 'D' && n > 7 ? `PB${n}` : `P${P}${(bit + 1) % 6}`, p[0] === 'D' && n > 7 ? `PD${n - 8}` : `P${others[0]}${(bit + 2) % 6}`];
      return MC(`En una Uno o una Nano, ¿qué puerto y bit es ${p}?`, `P${P}${bit}`, wrong, `D0–D7 = PD0–PD7, D8–D13 = PB0–PB5 y A0–A5 = PC0–PC5. ${p} es P${P}${bit}.`);
    }
    const wrong = [`D${bit}`, bit <= 5 ? `A${bit}` : `D${bit + 2}`, bit <= 5 ? `D${bit + 8}` : `D${bit - 2}`, `D${(bit + 9) % 14}`, `A${(bit + 1) % 6}`];
    return MC(`¿Qué pin de Arduino (Uno o Nano) es P${P}${bit}?`, p, wrong, `Puerto D → D0–D7; puerto B → D8–D13 (suma 8); puerto C → A0–A5. P${P}${bit} es ${p}.`);
  }, 'av_ports');

  Gen.add('av_sleepLife', () => {
    const cap = pick([220, 1000, 2000, 2500]), ia = pick([3, 5, 8, 10, 15]), ta = pick([5, 10, 20, 50, 100]), T = pick([1, 2, 10, 60, 600]), is = pick([0.5, 1, 4, 5, 20]);
    const q = ia * ta / 1000 + is / 1000 * (T - ta / 1000), avg = q / T, days = cap / avg / 24;
    return N(`Pila de ${cap} mAh. Cada ${T} s el chip despierta ${ta} ms gastando ${ia} mA, y el resto del tiempo duerme con ${fmt(is)} µA. Ignorando la autodescarga, ¿cuántos días dura?`, days, 'días', `Media = (${ia} mA × ${ta} ms + ${fmt(is)} µA × resto) / ${T} s ≈ ${fI(avg)}. ${cap} mAh / media ≈ ${fmt(cap / avg, 0)} h ≈ ${fmt(days, 0)} días.${days > 3650 ? ' En la práctica, a partir de unos años manda la autodescarga de la pila.' : ''}`, days * 0.03);
  }, 'av_sleep');

  Gen.add('av_icp', () => {
    const combos = [];
    [1, 8, 64].forEach(n => [50, 60, 100, 440, 1000, 2500, 10000, 38000].forEach(f => { const t = Math.round(FCPU / (n * f)); if (t >= 20 && t <= 65535) combos.push([n, f, t]); }));
    const [n, , t] = pick(combos), f = FCPU / (n * t);
    return N(`Timer1 a 16 MHz con prescaler ${n}. Entre dos capturas de flancos de subida, ICR1 ha avanzado ${th(t)} cuentas. ¿Frecuencia de la señal en Hz?`, f, 'Hz', `Cada cuenta dura ${fT(n / FCPU)}. Periodo = ${th(t)} × ${fT(n / FCPU)} = ${fT(t * n / FCPU)}, así que f = ${fHz(f)}.`, f * 0.01);
  }, 'av_timer');

  Gen.add('av_twbr', () => {
    const [fc, scl] = pick([[16e6, 100e3], [16e6, 400e3], [16e6, 50e3], [16e6, 200e3], [8e6, 100e3], [8e6, 50e3], [20e6, 100e3]]);
    const tw = (fc / scl - 16) / 2;
    return N(`TWI con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler 1 (TWPS = 0). ¿Qué TWBR da un SCL de ${fmt(scl / 1000)} kHz?`, tw, '', `f_SCL = F_CPU / (16 + 2 · TWBR) → TWBR = (${th(fc)} / ${th(scl)} − 16) / 2 = ${fmt(tw)}.`, 0.5);
  }, 'av_bus');

  Gen.add('av_eeLife', () => {
    const m = pick([1, 2, 5, 10, 30, 60]), cells = pick([1, 1, 4, 16, 100]);
    const years = 100000 * m * cells / (60 * 24 * 365);
    return N(`Guardas un dato en la EEPROM cada ${m} min, repartiendo las escrituras por igual entre ${cells} ${cells === 1 ? 'celda' : 'celdas'}. Si cada celda aguanta 100 000 escrituras, ¿cuántos años dura?`, years, 'años', `Cada celda recibe una escritura cada ${m * cells} min. 100 000 × ${m * cells} min = ${th(100000 * m * cells)} min ≈ ${fmt(years, 2)} años. Repartir el desgaste (wear leveling) multiplica la vida.`, Math.max(0.01, years * 0.03));
  }, 'av_mem');

  Gen.add('av_cycles', () => {
    const c = pick(['ns', 'loop', 'sbi', 'us']);
    if (c === 'ns') { const f = pick([1, 4, 8, 16, 20]); return N(`A ${f} MHz, ¿cuántos nanosegundos dura un ciclo de reloj?`, 1000 / f, 'ns', `1 / ${f} MHz = ${fmt(1000 / f, 2)} ns.`, 0.5); }
    if (c === 'loop') { const n = ri(10, 250); return N(`Bucle en ensamblador: ldi r24, ${n} (1 ciclo); luego dec r24 (1 ciclo) y brne (2 ciclos si salta, 1 si no) hasta llegar a 0. ¿Cuántos ciclos en total?`, 3 * n + 1, 'ciclos', `1 (ldi) + ${n} × 1 (dec) + ${n - 1} × 2 (brne salta) + 1 (brne no salta) = ${3 * n + 1}.`, 0.5); }
    if (c === 'sbi') { const f = pick([8, 16, 20]); return N(`Bucle infinito “sbi PINB, 5” (2 ciclos) + “rjmp” (2 ciclos) a ${f} MHz. ¿Frecuencia de la onda en D13, en MHz?`, f / 8, 'MHz', `Cada conmutación cada 4 ciclos; un periodo son dos conmutaciones, 8 ciclos: ${f} / 8 = ${fmt(f / 8)} MHz.`, 0.01); }
    const k = pick([1000, 4000, 16000, 50000]), f = pick([8, 16]);
    return N(`Una rutina tarda ${th(k)} ciclos a ${f} MHz. ¿Cuántos µs son?`, k / f, 'µs', `${th(k)} / ${f} = ${fmt(k / f, 2)} µs.`, Math.max(0.05, k / f * 0.01));
  }, 'av_core');

  /* ===================== VISUALIZACIONES ===================== */
  Object.assign(Widgets.VIZ, {
    // Un temporizador en CTC: el contador sube hasta OCR y vuelve a 0; la patilla conmuta en cada coincidencia.
    av_timer: {
      anim: true, restart: true,
      calc: p => { const f = FCPU / (p.N * (p.ocr + 1)); return { f, fpin: f / 2, tick: p.N / FCPU }; },
      svg: (p, o, t) => {
        const y0 = 112, W = 84, h = 72 * (p.ocr + 1) / 256, X = k => 20 + W * k;
        let saw = `M20 ${y0}`; for (let k = 1; k <= 3; k++) saw += `L${X(k)} ${(y0 - h).toFixed(1)}V${y0}`;
        const u = (t * 0.4) % 3, fr = u - Math.floor(u), cnt = Math.min(p.ocr, Math.floor(fr * (p.ocr + 1)));
        return `<svg viewBox="0 0 300 180" class="viz">
          <path d="M20 ${y0}H278M20 ${y0}V34" stroke="var(--muted)" stroke-width="1.2" fill="none"/>
          <path d="M20 ${y0 - 72}H278" stroke="var(--line)" stroke-dasharray="2 4"/><text x="278" y="${y0 - 76}" text-anchor="end" class="vizsm">255</text>
          <path d="M20 ${(y0 - h).toFixed(1)}H278" stroke="var(--err)" stroke-dasharray="5 4"/>
          <path d="${saw}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>
          <circle cx="${(20 + W * u).toFixed(1)}" cy="${(y0 - h * fr).toFixed(1)}" r="5" fill="var(--led)"/>
          <path d="M20 152H${X(1)}V134H${X(2)}V152H${X(3)}V134" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="24" y="${Math.max(36, y0 - h - 5).toFixed(1)}" class="vizsm" style="fill:var(--err)">OCR = ${p.ocr}</text>
          <text x="20" y="22" class="vizlab">TCNT = ${cnt} · 1 cuenta = ${fT(o.tick)}</text>
          <text x="20" y="174" class="vizlab">Interrupción ${fHz(o.f)} · patilla ${fHz(o.fpin)}</text></svg>`;
      }
    },
    // PWM por hardware: Fast PWM (sierra) o Phase Correct (triángulo), con TOP, OCR y prescaler.
    av_pwm: {
      calc: p => { const pc = p.mode === 1, top = Math.max(1, p.top), ocr = Math.min(p.ocr, top); const f = pc ? FCPU / (2 * p.N * top) : FCPU / (p.N * (top + 1)); return { f, D: pc ? ocr / top : (ocr + 1) / (top + 1), bits: Math.log2(top + 1) }; },
      svg: (p, o) => {
        const pc = p.mode === 1, top = Math.max(1, p.top), ocr = Math.min(p.ocr, top), y0 = 102, H = 62, W = 128, X = 22, hi = 130, lo = 152;
        const yo = y0 - H * ocr / top;
        let cnt = `M${X} ${y0}`, out;
        for (let k = 0; k < 2; k++) { const a = X + W * k; cnt += pc ? `L${a + W / 2} ${y0 - H}L${a + W} ${y0}` : `L${a + W} ${y0 - H}V${y0}`; }
        if (pc) { const hw = W * o.D / 2; out = `M${X} ${hi}`; for (let k = 0; k < 2; k++) { const a = X + W * k; out += `H${(a + hw).toFixed(1)}V${lo}H${(a + W - hw).toFixed(1)}V${hi}H${a + W}`; } }
        else { out = `M${X} ${lo}`; for (let k = 0; k < 2; k++) { const a = X + W * k; out += `V${hi}H${(a + W * o.D).toFixed(1)}V${lo}H${a + W}`; } }
        return `<svg viewBox="0 0 300 182" class="viz">
          <path d="M${X} ${y0}H${X + 2 * W}" stroke="var(--muted)" stroke-width="1.2"/>
          <path d="M${X} ${yo.toFixed(1)}H${X + 2 * W}" stroke="var(--err)" stroke-dasharray="5 4"/>
          <path d="${cnt}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>
          <path d="${out}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="${X}" y="22" class="vizlab">${pc ? 'Phase Correct' : 'Fast PWM'} · TOP ${top} · OCR ${ocr}</text>
          <text x="${X + 2 * W}" y="${(yo - 4).toFixed(1)}" text-anchor="end" class="vizsm" style="fill:var(--err)">OCR</text>
          <text x="${X}" y="174" class="vizlab">${fHz(o.f)} · ciclo ${num(o.D * 100, 1)} % · ${num(o.bits, 1)} bits</text></svg>`;
      }
    },
    // Trama UART 8N1 bit a bit: inicio, 8 datos (LSB primero) y parada; UBRR y error de baudios a 16 MHz.
    av_uart: {
      calc: p => { const d = p.u2x ? 8 : 16, ubrr = Math.max(0, Math.round(FCPU / (d * p.baud) - 1)), real = FCPU / (d * (ubrr + 1)), err = (real / p.baud - 1) * 100; return { ubrr, real, err, errAbs: Math.abs(err), bit: 1 / p.baud, frame: 10 / p.baud }; },
      svg: (p, o) => {
        const lv = [1, 0], lab = ['', 'S']; for (let i = 0; i < 8; i++) { lv.push((p.data >> i) & 1); lab.push('b' + i); } lv.push(1); lab.push('P');
        const X = 14, w = 24, hi = 54, lo = 92;
        let d = `M${X} ${hi}`; lv.forEach((v, i) => { d += `V${v ? hi : lo}H${X + w * (i + 1)}`; });
        const cells = lv.map((v, i) => i === 0 ? '' : `<rect x="${X + w * i}" y="${hi - 6}" width="${w}" height="${lo - hi + 12}" fill="${i === 1 || i === 10 ? 'var(--line)' : 'none'}" stroke="var(--line)" opacity=".6"/><text x="${X + w * i + w / 2}" y="${lo + 18}" text-anchor="middle" class="vizsm">${lab[i]}</text>${i >= 2 && i <= 9 ? `<text x="${X + w * i + w / 2}" y="${hi - 10}" text-anchor="middle" class="vizsm">${v}</text>` : ''}`).join('');
        const col = o.errAbs > 2 ? 'var(--err)' : o.errAbs > 1 ? 'var(--led)' : 'var(--ok)';
        return `<svg viewBox="0 0 300 186" class="viz">${cells}<path d="${d}" fill="none" stroke="var(--ice)" stroke-width="2.5"/>
          <text x="14" y="22" class="vizlab">Byte ${p.data} = ${hx(p.data)} · sale primero b0</text>
          <text x="14" y="140" class="vizlab">UBRR0 = ${o.ubrr} → ${th(Math.round(o.real))} baudios reales</text>
          <text x="14" y="158" class="vizlab" style="fill:${col}">Error ${o.err >= 0 ? '+' : '−'}${num(o.errAbs, 2)} %</text>
          <text x="14" y="177" class="vizsm">1 bit = ${fT(o.bit)} · trama 8N1 = ${fT(o.frame)}</text></svg>`;
      }
    },
    // Operaciones de bits sobre un registro de 8 bits: antes, máscara y después.
    av_bits: {
      calc: p => { const m = 1 << p.bit, res = p.op === 1 ? p.v | m : p.op === 2 ? p.v & ~m & 255 : p.op === 3 ? p.v ^ m : p.v & m; return { res, m, test: p.v & m ? 1 : 0 }; },
      svg: (p, o) => {
        const expr = p.op === 4 ? `PINB &amp; (1 &lt;&lt; ${p.bit})` : `PORTB ${['', '|=', '&amp;= ~', '^='][p.op]}(1 &lt;&lt; ${p.bit});`;
        const rows = [['Antes', p.v], [p.op === 2 ? '~Máscara' : 'Máscara', p.op === 2 ? ~o.m & 255 : o.m], [p.op === 4 ? 'Resultado' : 'Después', o.res]];
        const box = (y, v, cmp) => Array.from({ length: 8 }, (_, i) => { const b = 7 - i, bit = (v >> b) & 1, ch = cmp != null && (((cmp >> b) & 1) !== bit); return `<rect x="${70 + i * 27}" y="${y}" width="24" height="22" rx="4" fill="${bit ? 'var(--ice)' : 'none'}" fill-opacity="${bit ? 0.35 : 0}" stroke="${ch ? 'var(--led)' : 'var(--line)'}" stroke-width="${ch ? 3 : 1.5}"/><text x="${82 + i * 27}" y="${y + 16}" text-anchor="middle" class="vizlab">${bit}</text>`; }).join('');
        const head = Array.from({ length: 8 }, (_, i) => `<text x="${82 + i * 27}" y="44" text-anchor="middle" class="vizsm"${7 - i === p.bit ? ' style="fill:var(--led)"' : ''}>${7 - i}</text>`).join('');
        const foot = p.op === 4 ? `Resultado ${o.test ? '≠ 0: el bit ' + p.bit + ' está a 1' : '= 0: el bit ' + p.bit + ' está a 0'}` : `${hx(p.v)} → ${hx(o.res)} (${p.v} → ${o.res})`;
        return `<svg viewBox="0 0 300 172" class="viz"><text x="10" y="22" class="vizlab">${expr}</text>${head}
          ${rows.map(([l, v], k) => `<text x="6" y="${66 + k * 34}" class="vizsm">${l}</text>${box(50 + k * 34, v, k === 2 && p.op !== 4 ? p.v : null)}`).join('')}
          <text x="10" y="164" class="vizlab">${foot}</text></svg>`;
      }
    },
    // Reloj del ADC: prescaler, tiempo de conversión, muestras por segundo y sobremuestreo.
    av_adc: {
      calc: p => { const fa = FCPU / p.ps, n = Math.pow(4, p.ob), sps = fa / 13; return { fa, t: 13 / fa, sps, ok: fa >= 50e3 && fa <= 200e3 ? 1 : 0, n, bits: 10 + p.ob, eff: sps / n }; },
      svg: (p, o) => {
        const lx = f => 20 + 260 * (Math.log10(f) - 4) / 3, mx = lx(o.fa);
        const ticks = [[1e4, '10 kHz'], [1e5, '100 kHz'], [1e6, '1 MHz'], [1e7, '10 MHz']];
        return `<svg viewBox="0 0 300 175" class="viz">
          <rect x="${lx(5e4).toFixed(1)}" y="48" width="${(lx(2e5) - lx(5e4)).toFixed(1)}" height="30" fill="var(--ok)" opacity=".25"/>
          <path d="M20 78H280" stroke="var(--muted)" stroke-width="1.5"/>
          ${ticks.map(([f, l]) => `<path d="M${lx(f).toFixed(1)} 78v6" stroke="var(--muted)"/><text x="${lx(f).toFixed(1)}" y="96" text-anchor="${f === 1e4 ? 'start' : f === 1e7 ? 'end' : 'middle'}" class="vizsm">${l}</text>`).join('')}
          <path d="M${mx.toFixed(1)} 76l-7 -14h14z" fill="${o.ok ? 'var(--ok)' : 'var(--err)'}"/>
          <text x="${lx(1e5).toFixed(1)}" y="42" text-anchor="middle" class="vizsm">10 bits: 50–200 kHz</text>
          <text x="20" y="22" class="vizlab">Reloj del ADC: ${fHz(o.fa)} (16 MHz / ${p.ps})</text>
          <text x="20" y="122" class="vizlab" style="fill:${o.ok ? 'var(--ok)' : 'var(--err)'}">${o.ok ? '10 bits completos' : 'Fuera de rango: menos resolución'}</text>
          <text x="20" y="142" class="vizlab">Conversión ${fT(o.t)} · ${th(Math.round(o.sps))} muestras/s</text>
          <text x="20" y="162" class="vizsm">${p.ob ? `Sobremuestreo ×${o.n}: ${o.bits} bits a ${th(Math.round(o.eff))} muestras/s` : 'Sin sobremuestreo'}</text></svg>`;
      }
    },
    // Presupuesto de batería con sueño profundo.
    av_sleep: {
      calc: p => { const ta = p.ta / 1000, qa = p.ia * ta, qs = p.is / 1000 * Math.max(0, p.T - ta), avg = (qa + qs) / p.T, h = p.cap / avg; return { avg, h, days: h / 24, years: h / 8760, fa: qa / (qa + qs) }; },
      svg: (p, o) => {
        const avg = o.avg >= 1 ? num(o.avg, 2) + ' mA' : num(o.avg * 1000, 1) + ' µA';
        const life = o.years >= 1 ? num(o.years, 1) + ' años' : o.days >= 1 ? num(o.days, 1) + ' días' : num(o.h, 1) + ' h';
        const wa = Math.max(2, 260 * o.fa);
        return `<svg viewBox="0 0 300 170" class="viz">
          <text x="20" y="24" class="vizlab">Carga gastada en cada ciclo</text>
          <rect x="20" y="36" width="${wa.toFixed(1)}" height="24" rx="4" fill="var(--led)"/>
          <rect x="${(20 + wa).toFixed(1)}" y="36" width="${Math.max(0, 260 - wa).toFixed(1)}" height="24" rx="4" fill="var(--ice)" opacity=".7"/>
          <text x="20" y="78" class="vizsm">Despierto ${num(o.fa * 100, 1)} %</text><text x="280" y="78" text-anchor="end" class="vizsm">Dormido ${num(100 - o.fa * 100, 1)} %</text>
          <text x="20" y="108" class="vizlab">Consumo medio: ${avg}</text>
          <text x="150" y="140" text-anchor="middle" class="vizbig" style="font-size:20px">${life}</text>
          <text x="150" y="162" text-anchor="middle" class="vizsm">${o.years > 5 ? 'Antes mandará la autodescarga de la pila' : 'con ' + p.cap + ' mAh, sin margen'}</text></svg>`;
      }
    }
  });

  /* ===================== RETOS DEL SIMULADOR ===================== */
  const ledS = api => api.comps('led').map(c => api.stats.comps[c.id]).filter(Boolean);
  const noBurnt = api => ({ label: 'Ningún componente quemado', ok: !api.model.comps.some(c => c.burnt) });
  const ran = (api, s) => ({ label: `Deja correr la simulación al menos ${s} s`, ok: api.stats.t >= s });
  const under30 = s => ({ label: 'Todas las corrientes de pin por debajo de 30 mA', ok: s.length > 0 && s.every(x => x.maxI < 0.03) });
  Object.assign(CHECKS, {
    av_pb5: api => { const s = ledS(api); return [{ label: 'Un LED en PB5 parpadea (más de 0,8 s encendido y apagado)', ok: s.some(x => x.onT > 0.8 && x.offT > 0.8) }, under30(s), noBurnt(api), ran(api, 3)]; },
    av_portb: api => { const s = ledS(api); return [{ label: 'Cinco LEDs del puerto B se encienden por turnos', ok: s.filter(x => x.toggles >= 2).length >= 5 }, { label: 'Hay un pulsador en PD2 para arrancar el barrido', ok: api.comps('push').length > 0 }, under30(s), noBurnt(api)]; },
    av_oc1a: api => { const s = ledS(api); return [{ label: 'El LED de OC1A baja de un 15 % de brillo', ok: s.some(x => x.minB < 0.15) }, { label: 'Y sube por encima del 70 %', ok: s.some(x => x.maxB > 0.7) }, noBurnt(api), ran(api, 4)]; },
    av_int0: api => { const s = ledS(api); return [{ label: 'Al pulsar (PD2 a 0), el LED de PB5 se enciende', ok: s.some(x => x.onPressed) }, { label: 'Sin pulsar, el LED está apagado', ok: s.some(x => x.offReleased) }, noBurnt(api)]; },
    av_adc0: api => { const s = ledS(api); return [{ label: 'Con el cursor en un extremo, el brillo baja de 15 %', ok: s.some(x => x.minB < 0.15) }, { label: 'En el otro extremo, sube de 70 %', ok: s.some(x => x.maxB > 0.7) }, noBurnt(api)]; },
    av_isp3: api => { const s = ledS(api); return [{ label: 'Tres LEDs en PB2, PB3 y PB4 se encienden por turnos', ok: s.filter(x => x.onT > 0.5 && x.offT > 0.5).length >= 3 }, under30(s), noBurnt(api), ran(api, 8)]; }
  });

  /* ===================== PROYECTOS ===================== */
  Object.assign(PROJECTS, {
    av_ram: {
      intro: 'Vas a ver la memoria de tu Arduino por dentro: cuánta SRAM queda libre, dónde está la pila y qué pasa cuando choca con el montón. Provocarás el desastre a propósito para reconocerlo cuando te pase sin querer.',
      level: 2, hours: 4,
      skills: ['Leer el informe de memoria del compilador', 'Medir la SRAM libre en marcha', 'Entender la pila y el montón', 'Ahorrar RAM con F() y PROGMEM'],
      bom: ['Arduino Uno o Nano con su cable USB', 'Ordenador con el IDE de Arduino', 'Libreta para anotar las cifras'],
      phases: [
        { title: 'Fase 1 · El informe del compilador', steps: ['Compila un sketch vacío y anota las dos cifras que da el IDE: Flash usada y “variables globales”.', 'Añade un array global uint8_t lastre[500]; y úsalo en loop() (por ejemplo, lastre[millis() % 500]++) para que el compilador no lo elimine. Compila y anota.', 'Cámbialo por const uint8_t lastre[500] PROGMEM = {1}; y léelo con pgm_read_byte(). Compila otra vez.', 'Explica en la libreta a qué sección (.data, .bss o .text) ha ido el array en cada caso.'], checks: ['El array normal sube las variables globales en 500 bytes (±10)', 'Con PROGMEM la RAM vuelve a su valor y la Flash sube unos 500 bytes', 'He anotado las tres compilaciones'] },
        { title: 'Fase 2 · Medir la RAM libre en marcha', steps: ['Copia el código de la fase y ábrelo con el monitor serie a 115 200 baudios.', 'Comprueba que SP (el puntero de pila) sale cerca de 0x08FF, el final de la SRAM.', 'Compara la RAM libre impresa con 2048 menos las variables globales que dice el IDE.', 'Llama a ramLibre() desde dentro de una función con una variable local de 100 bytes y observa cuánto baja.'], checks: ['SP impreso entre 0x0880 y 0x08FF', 'La RAM libre es algo menor que la del IDE y sé explicar por qué (la pila ya ocupa algo)', 'Una variable local de 100 bytes reduce la RAM libre en unos 100 bytes'],
          code: `// Fase 2: cuánta RAM queda entre el final del montón y la cima de la pila
extern int __heap_start, *__brkval;

int ramLibre() {
  int marca;                                   // vive en la pila: su dirección es la cima
  int finMonton = (__brkval == 0) ? (int)&__heap_start : (int)__brkval;
  return (int)&marca - finMonton;
}

void setup() {
  Serial.begin(115200);
  Serial.print(F("SP = 0x"));
  Serial.println(SP, HEX);                     // registro puntero de pila
  Serial.print(F("RAM libre: "));
  Serial.println(ramLibre());
}

void loop() {}` },
        { title: 'Fase 3 · Provocar una colisión', steps: ['Antes de nada, predice: si cada nivel de recursión gasta unos 104 bytes de pila (100 del array y algo más), ¿en qué nivel se acabará la RAM libre que mediste?', 'Añade la función bajar() de la fase y llámala con bajar(1) al final de setup().', 'Observa el monitor serie hasta que deje de imprimir con sentido: basura, un cuelgue o un reinicio.', 'Repite con lastre[50] y comprueba que llega aproximadamente al doble de niveles.'], checks: ['Mi predicción acierta el nivel de fallo con ±3 niveles', 'He visto el síntoma (cuelgue, basura o reinicio) y lo he anotado', 'Con la mitad de lastre llega a unos el doble de niveles'],
          code: `// Fase 3: cada nivel se come 100 bytes de pila. Sin condición de parada.
void bajar(uint8_t nivel) {
  volatile uint8_t lastre[100];      // volatile: que el compilador no lo elimine
  lastre[0] = nivel;
  Serial.print(nivel);
  Serial.print(F(" libre="));
  Serial.println(ramLibre());
  Serial.flush();                    // que salga antes de que todo se rompa
  bajar(nivel + 1);
  lastre[1] = lastre[0];             // trabajo después de la llamada: impide convertirla en bucle
}` },
        { title: 'Fase 4 · Recuperar memoria', steps: ['Coge un sketch tuyo con muchos Serial.print("…") y mide su RAM libre.', 'Envuelve cada cadena literal con F("…").', 'Pasa las tablas constantes a PROGMEM y cambia int por uint8_t donde el valor quepa en 0–255.', 'Mide otra vez y anota los bytes recuperados.'], checks: ['He recuperado al menos 150 bytes de SRAM en un sketch real', 'El sketch sigue funcionando igual', 'Sé explicar cada byte recuperado'] }
      ],
      extra: ['“Pinta” la pila: al arrancar, rellena la RAM libre con 0xAA y, tras un rato de uso, cuenta cuántos bytes siguen intactos. Así sabes la pila máxima que has usado.', 'Crea y destruye objetos String en un bucle y mide cómo se fragmenta el montón.']
    },

    av_dice: {
      intro: 'Un dado de siete LEDs que se controla escribiendo un solo byte en el puerto D. Aprenderás a pensar en registros, a construir tablas de bits y a conseguir que el azar sea justo de verdad.',
      level: 1, hours: 4,
      skills: ['DDRD, PORTD y PIND sin digitalWrite', 'Tablas de patrones en binario', 'Máscaras para no pisar otros bits', 'Aleatoriedad con un temporizador'],
      bom: ['Arduino Uno o Nano', 'Protoboard y cables', '7 LEDs rojos de 5 mm', '7 resistencias de 330 Ω', 'Pulsador', 'Opcional: portapilas de 3 AA para usarlo sin USB'],
      phases: [
        { title: 'Fase 1 · Montaje por grupos', steps: ['Coloca los 7 LEDs como la cara de un dado: tres a la izquierda, uno en el centro y tres a la derecha.', 'Agrúpalos: centro → PD4 (D4); diagonal A (arriba izquierda y abajo derecha) → PD5; diagonal B (arriba derecha y abajo izquierda) → PD6; los dos del medio de los lados → PD7. Cada LED, con su propia resistencia de 330 Ω a masa.', 'Pulsador entre PD2 (D2) y GND.', 'Antes de programar, calcula la corriente de un pin que alimenta dos LEDs: (5 − 1,8) / 330 × 2.'], checks: ['Ningún pin alimenta más de dos LEDs', 'He calculado unos 19 mA para los pines de dos LEDs', 'Cada LED tiene su propia resistencia'] },
        { title: 'Fase 2 · Caras por registro', steps: ['Escribe en binario los cuatro bits altos de cada cara: 1 = centro; 2 = diagonal A; 3 = diagonal A + centro; 4 = las dos diagonales; 5 = las dos diagonales + centro; 6 = las dos diagonales + los del medio.', 'Pásalos a hexadecimal y compáralos con la tabla CARA del código.', 'Carga el programa y mantén pulsado: el dado “rueda”. Suelta y queda una cara.', 'Explica por qué la línea PORTD = (PORTD & 0x0F) | CARA[n] no apaga la pull-up de PD2.'], checks: ['Las seis caras se ven correctas', 'Mi tabla en binario coincide con la del código', 'Sé explicar el papel de la máscara 0x0F'],
          code: `#include <avr/io.h>
#include <util/delay.h>
// PD4 centro · PD5 diagonal A · PD6 diagonal B · PD7 pareja central
static const uint8_t CARA[6] = { 0x10, 0x20, 0x30, 0x60, 0x70, 0xE0 };

int main(void) {            // compila en el IDE (sustituye al main del núcleo) o con avr-gcc
  DDRD  = 0xF0;             // PD4..PD7 salidas; PD0..PD3 entradas
  PORTD = (1 << PD2);       // pull-up del pulsador
  uint8_t n = 0;
  for (;;) {
    if (!(PIND & (1 << PD2))) {           // pulsado: el dado rueda
      n = (n + 1) % 6;
      PORTD = (PORTD & 0x0F) | CARA[n];   // solo toca los 4 bits altos
      _delay_ms(40);
    }
  }
}` },
        { title: 'Fase 3 · Un azar que se pueda demostrar', steps: ['Pon el Timer2 a contar libre sin prescaler (TCCR2A = 0; TCCR2B = 1 << CS20;). No uses el Timer0: es el de millis() y delay().', 'Al soltar el pulsador, toma TCNT2 % 6 como resultado: depende de los microsegundos exactos de tu dedo.', 'Añade un contador por cara y envía los resultados por Serial (aquí sí puedes usar el núcleo de Arduino).', 'Haz 600 tiradas (o simúlalas pulsando con ritmo irregular) y anota cuántas veces sale cada cara.', 'Explica por qué TCNT2 % 6 favorece un poco a las caras 1–4 (256 no es múltiplo de 6) y corrígelo descartando valores de 252 a 255.'], checks: ['En 600 tiradas cada cara sale entre 75 y 125 veces', 'He corregido el sesgo del módulo y sé explicarlo', 'Los resultados se ven en el monitor serie'] },
        { title: 'Fase 4 · Animación y acabado', steps: ['Al soltar, haz que el dado gire cada vez más despacio (40, 60, 90, 140, 200 ms…) antes de quedarse en el resultado ya decidido.', 'Antirrebote: ignora cambios del pulsador durante 30 ms.', 'Apaga los LEDs tras 20 s sin tocar nada.', 'Móntalo en una placa perforada o en una caja con el portapilas.'], checks: ['El giro se desacelera de forma visible', 'Un solo toque produce una sola tirada', 'Se apaga solo tras 20 s de inactividad'] }
      ],
      extra: ['Haz dos dados con el puerto D y el B a la vez.', 'Cuando estudies el sueño profundo, haz que duerma en power-down y despierte con INT0 por nivel bajo.']
    },

    av_lock: {
      intro: 'Una cerradura electrónica con teclado de membrana 4×4: escaneo de matriz por registros, antirrebote, máquina de estados y un actuador real. Al final cambiarás la clave y la guardarás en la EEPROM.',
      level: 2, hours: 8,
      skills: ['Escaneo de una matriz de teclas', 'Antirrebote por software', 'Máquinas de estados con tiempos', 'Controlar un servo o un solenoide con seguridad'],
      bom: ['Arduino Uno o Nano', 'Teclado de membrana 4×4', 'Servo SG90 (o solenoide de 12 V con MOSFET IRLZ44N y diodo 1N4007)', 'LED verde, LED rojo y 2 resistencias de 330 Ω', 'Zumbador activo de 5 V', 'Si usas solenoide: fuente de 12 V aparte y masa común'],
      phases: [
        { title: 'Fase 1 · Leer la matriz', steps: ['Identifica las 8 patas del teclado con el multímetro en continuidad: pulsa “1” y busca qué dos patas se unen; repite con “5”, “9” y “D”.', 'Conecta filas a PD4–PD7 (D4–D7) y columnas a PB0–PB3 (D8–D11).', 'Carga tecladoInit() y tecladoLeer() de la fase y envía cada tecla por Serial.', 'Mantén una tecla pulsada: verás que se repite sin parar. Lo arreglarás en la fase 2.'], checks: ['Las 16 teclas aparecen correctamente en el monitor serie', 'He anotado qué pata es cada fila y cada columna', 'Sé explicar por qué solo una fila está a 0 en cada momento'],
          code: `// Filas en PD4..PD7 (D4..D7) como salidas; columnas en PB0..PB3 (D8..D11) con pull-up
const char TECLAS[4][4] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

void tecladoInit() {
  DDRD  |= 0xF0;              // filas: salidas
  PORTD |= 0xF0;              // en reposo, todas a 1
  DDRB  &= ~0x0F;             // columnas: entradas
  PORTB |= 0x0F;              // con pull-up interna
}

char tecladoLeer() {          // 0 si no hay ninguna tecla
  for (uint8_t f = 0; f < 4; f++) {
    PORTD = (PORTD | 0xF0) & ~(1 << (4 + f));    // solo la fila f a 0
    delayMicroseconds(5);                         // que la línea se asiente
    uint8_t col = ~PINB & 0x0F;                   // columnas a 0 = pulsadas
    if (col) {
      PORTD |= 0xF0;
      for (uint8_t c = 0; c < 4; c++) if (col & (1 << c)) return TECLAS[f][c];
    }
  }
  PORTD |= 0xF0;
  return 0;
}` },
        { title: 'Fase 2 · Antirrebote y pulsaciones limpias', steps: ['Lee el teclado cada 5 ms con millis().', 'Acepta una tecla solo si se lee igual en 4 lecturas seguidas (20 ms).', 'Genera un evento solo en el paso de “ninguna” a “una tecla”: así una pulsación larga cuenta una vez.', 'Añade un pitido corto en el zumbador con cada tecla aceptada.'], checks: ['Una pulsación larga produce una sola tecla', 'Al teclear rápido (5 teclas por segundo) no se pierde ninguna', 'Cada tecla aceptada suena una vez'] },
        { title: 'Fase 3 · La máquina de estados', steps: ['Dibuja en papel los estados: ESPERANDO, TECLEANDO, ABIERTO, BLOQUEADO.', 'Las teclas numéricas se acumulan; “#” comprueba la clave; “*” borra.', 'Si pasan 10 s sin teclas en TECLEANDO, vuelve a ESPERANDO y borra lo tecleado.', 'Tras 3 claves erróneas, BLOQUEADO durante 30 s con el LED rojo parpadeando.', 'Programa cada estado como un caso de un switch que nunca usa delay().'], checks: ['La clave correcta abre y la incorrecta no', 'El tiempo de espera de 10 s funciona', 'Tres fallos bloquean 30 s y luego se puede volver a intentar', 'Mi diagrama de estados coincide con el código'] },
        { title: 'Fase 4 · El actuador', steps: ['Opción servo: señal en D9 con Timer1 en modo 14 (como en la lección del servo); 1 ms cerrado, 2 ms abierto. Aliméntalo desde una fuente de 5 V aparte si tiembla o reinicia la placa.', 'Opción solenoide: IRLZ44N con la puerta en D9 a través de 100 Ω y 100 kΩ de puerta a masa; diodo 1N4007 en paralelo con el solenoide (cátodo al +12 V); masa común con la placa.', 'El estado ABIERTO dura 5 s y vuelve a cerrar solo.', 'Mide la corriente del actuador y comprueba que el pin nunca la lleva.'], checks: ['El cerrojo se abre 5 s y se cierra solo', 'Con solenoide: el diodo está bien orientado y el MOSFET no se calienta', 'La placa no se reinicia al mover el actuador'] },
        { title: 'Fase 5 · Cambiar la clave', steps: ['Con la puerta abierta, “A” entra en modo de cambio de clave: se teclea dos veces la nueva.', 'Guárdala en la EEPROM con EEPROM.update() junto a un byte de comprobación (por ejemplo, la suma de los dígitos).', 'Al arrancar, si el byte de comprobación no cuadra, usa una clave de fábrica.', 'Desconecta la alimentación y comprueba que la clave nueva sigue valiendo.'], checks: ['La clave nueva sobrevive a un apagado', 'Una EEPROM vacía o corrupta usa la clave de fábrica', 'Las dos tecleadas deben coincidir o no se cambia nada'] }
      ],
      extra: ['Añade diodos en serie con cada tecla y comprueba que desaparecen las teclas fantasma al pulsar tres a la vez.', 'Registra en la EEPROM los últimos 20 intentos fallidos con su instante relativo.']
    },

    av_theremin: {
      intro: 'Un instrumento que suena según la luz que le llega: tu mano sobre una LDR cambia la frecuencia que genera el Timer1 por hardware. Sin tone(): tú configuras cada bit.',
      level: 2, hours: 5,
      skills: ['Timer1 en CTC con salida por OC1A', 'Calcular OCR para cada frecuencia', 'Mapear lecturas del ADC', 'Cambios de OCR sin glitches'],
      bom: ['Arduino Uno o Nano', 'LDR y resistencia de 10 kΩ', 'Zumbador piezoeléctrico pasivo (o altavoz de 8 Ω con transistor BC337, 1 kΩ de base y 47 Ω en serie)', 'Protoboard y cables', 'Opcional: segunda LDR para el volumen'],
      phases: [
        { title: 'Fase 1 · Un tono fijo por hardware', steps: ['Conecta el piezo entre D9 (OC1A) y GND.', 'Carga el código y comprueba que suena a 400 Hz (usa una app de afinador en el móvil).', 'Calcula el OCR1A para 440 Hz con la fórmula F_CPU / (2 · 8 · f) − 1 y compruébalo con el afinador.', 'Explica por qué no hace falta ningún código en loop() para que siga sonando.'], checks: ['Suena a 400 Hz ±2 Hz según el afinador', 'He calculado y probado 440 Hz', 'Sé por qué el sonido no depende de loop()'],
          code: `void setup() {
  DDRB  |= (1 << PB1);                    // OC1A (D9) como salida
  TCCR1A = (1 << COM1A0);                 // conmuta OC1A en cada coincidencia
  TCCR1B = (1 << WGM12) | (1 << CS11);    // modo 4 (CTC, TOP = OCR1A), prescaler 8
  OCR1A  = 2499;                          // 16 MHz / (2 · 8 · 2500) = 400 Hz
}

void loop() {}` },
        { title: 'Fase 2 · La luz manda', steps: ['Monta la LDR de 5 V a A0 y la de 10 kΩ de A0 a GND.', 'Lee A0 con la mano lejos y muy cerca: anota los extremos.', 'Usa el loop de la fase, ajustando 100 y 900 a tus extremos.', 'Toca algo: verás que a veces se oye un “clic” al cambiar de nota rápido.'], checks: ['La frecuencia recorre de 200 a 2000 Hz con la mano', 'He ajustado los extremos a mi LDR', 'He oído (o no) el clic y he anotado cuándo pasa'],
          code: `void loop() {
  long luz = analogRead(A0);                     // 0..1023
  long f = map(luz, 100, 900, 200, 2000);        // ajusta 100 y 900 a tu LDR
  f = constrain(f, 200, 2000);                   // long: map puede dar negativos
  OCR1A = (F_CPU / 16) / f - 1;                  // F_CPU / (2 · 8 · f) − 1
  delay(5);
}` },
        { title: 'Fase 3 · Adiós al clic', steps: ['El clic aparece cuando escribes un OCR1A menor que el TCNT1 actual: el contador sigue hasta 65 535 y da la vuelta. Compruébalo razonando con números.', 'Solución A: activa la interrupción de coincidencia y copia el OCR1A nuevo dentro de la ISR, justo después de que el contador vuelva a 0.', 'Solución B: pasa a modo 15 (Fast PWM con TOP = OCR1A), donde OCR1A tiene doble búfer, y genera la salida en OC1B con un ciclo de trabajo del 50 % (OCR1B = OCR1A / 2). Recalcula: en este modo la frecuencia es F_CPU / (8 · (OCR1A + 1)), sin el factor 2.', 'Elige una, impleméntala y compara el sonido.'], checks: ['Sé explicar con números por qué aparecía el clic', 'Con mi solución los cambios rápidos ya no hacen clic', 'He anotado qué solución he usado y por qué'] },
        { title: 'Fase 4 · Hacerlo musical', steps: ['Crea una tabla en PROGMEM con los OCR1A de una escala (do, re, mi…) en dos octavas.', 'Cuantiza: la luz elige la nota más cercana en vez de una frecuencia continua.', 'Añade un vibrato: suma ±1 % a la frecuencia con una onda lenta (5 Hz) calculada con millis().', 'Opcional: una segunda LDR controla el volumen variando el ciclo de trabajo en modo 15.'], checks: ['Toca una escala reconocible', 'El vibrato se oye y se puede desactivar', 'La tabla está en PROGMEM y no ocupa SRAM'] }
      ],
      extra: ['Graba una melodía tocada con la mano en un array y reprodúcela.', 'Sustituye la LDR por un sensor de distancia por ultrasonidos medido con Input Capture.']
    },

    av_freq: {
      intro: 'Un frecuencímetro de verdad: mide de 1 Hz a varios MHz combinando la captura de entrada del Timer1 (frecuencias bajas, con precisión de 62,5 ns) y el conteo de pulsos con el Timer1 como contador (frecuencias altas).',
      level: 3, hours: 10,
      skills: ['Input Capture con ICR1', 'Extender un temporizador contando desbordamientos', 'Contar pulsos externos por la entrada T1', 'Calibrar contra una referencia'],
      bom: ['Arduino Uno o Nano', 'Cables y protoboard', 'Un 74HC14 (Schmitt) para acondicionar señales', 'Un NE555 con R y C para tener otra señal de prueba', 'Pantalla LCD 16×2 con adaptador I²C (opcional)', 'Si tienes: un módulo GPS con salida de 1 PPS como referencia'],
      phases: [
        { title: 'Fase 1 · Una señal de prueba conocida', steps: ['Configura el Timer2 en CTC con salida en OC2A (D11): TCCR2A = (1 << COM2A0) | (1 << WGM21); TCCR2B = (1 << CS22); OCR2A = 124.', 'Calcula la frecuencia esperada (prescaler 64 en el Timer2): debe salir 1000 Hz.', 'Une con un cable D11 y D8 (ICP1): medirás tu propia señal.', 'Mídela con el multímetro en modo Hz si lo tiene.'], checks: ['He calculado 1000 Hz para la señal de prueba', 'El multímetro (si tiene Hz) mide 1000 Hz ±1 %', 'D11 y D8 están unidos'] },
        { title: 'Fase 2 · Captura de periodo', steps: ['Carga el código de la fase con el puente D11–D8.', 'Debe imprimir 1000,0 Hz. Explica por qué sale exacto aunque el resonador de la placa tenga error (pista: los dos usan el mismo reloj).', 'Cambia OCR2A a 31 (4 kHz) y a 249 (500 Hz) y comprueba.', 'Prueba con OCR2A = 249 y prescaler 1024 en el Timer2 (unos 31 Hz): verás valores absurdos. Anota por qué (más de 65 536 cuentas por periodo).'], checks: ['Mide 1000, 4000 y 500 Hz correctamente', 'He explicado por qué la auto-medida no detecta el error del reloj', 'He visto el fallo por debajo de unos 244 Hz y sé su causa'],
          code: `volatile uint16_t ultima = 0, periodo = 0;   // en cuentas de 62,5 ns
volatile bool nueva = false;

ISR(TIMER1_CAPT_vect) {
  uint16_t ahora = ICR1;            // TCNT1 congelado en el flanco
  periodo = ahora - ultima;          // la resta sin signo absorbe una vuelta
  ultima = ahora;
  nueva = true;
}

void setup() {
  Serial.begin(115200);
  TCCR1A = 0;                                             // modo normal
  TCCR1B = (1 << ICNC1) | (1 << ICES1) | (1 << CS10);    // filtro, flanco de subida, sin prescaler
  TIMSK1 = (1 << ICIE1);
}

void loop() {
  if (nueva) {
    uint16_t p;
    noInterrupts(); p = periodo; nueva = false; interrupts();
    if (p) { Serial.print(16000000.0 / p, 1); Serial.println(F(" Hz")); }
  }
}` },
        { title: 'Fase 3 · Frecuencias bajas', steps: ['Activa también TIMER1_OVF_vect y cuenta desbordamientos en una variable de 16 bits.', 'En la captura, construye un instante de 32 bits: (desbordamientos << 16) | ICR1.', 'Cuidado con la carrera: si el desbordamiento y la captura llegan casi a la vez, comprueba TOV1 dentro de la ISR de captura y, si ICR1 es pequeño, suma el desbordamiento pendiente.', 'Mide 1 Hz, 10 Hz y 50 Hz (Timer2 a 1024 o el 555 con condensador grande).'], checks: ['Mide 1 Hz con error menor de 0,1 %', 'No aparecen lecturas absurdas tras 10 minutos', 'He resuelto la carrera entre captura y desbordamiento'] },
        { title: 'Fase 4 · Frecuencias altas por conteo', steps: ['Para más de unos 50 kHz, cambia de método: la entrada T1 (PD5, D5) hace de reloj del Timer1 (CS12:0 = 111, flanco de subida).', 'Abre una ventana de 1 s exacta con el Timer2 en CTC a 1 kHz contando 1000 interrupciones; al final lee TCNT1 más los desbordamientos.', 'Pasa la señal por una puerta del 74HC14 antes de D5 para limpiar flancos lentos.', 'El Timer2 ya está ocupado con la ventana: genera la señal de prueba con el Timer0 en D6 (OC0A, CTC, prescaler 1) aunque pierdas millis() durante la prueba, o con otra placa. OCR0A = 7 da 1 MHz; OCR0A = 0, 8 MHz… y ahí el conteo falla: el límite está por debajo de F_CPU / 2,5.', 'Programa el cambio automático: si el periodo capturado es menor de 20 µs, pasa a conteo.'], checks: ['Mide 1 MHz con ±1 Hz por conteo', 'He comprobado el límite superior y lo he anotado', 'El cambio de método es automático y sin saltos raros'] },
        { title: 'Fase 5 · Calibración y pantalla', steps: ['Compara con una referencia: la salida 1 PPS de un GPS en D8 debería medir 1,000000 Hz; tu lectura revela el error del reloj de la placa en ppm.', 'Si no tienes GPS, compara con otro instrumento o con un cristal de 32 768 Hz en un oscilador.', 'Guarda la corrección en ppm en la EEPROM y aplícala a todas las medidas.', 'Muestra la frecuencia en la LCD con 6 cifras significativas y el método usado.'], checks: ['He medido el error del reloj de mi placa en ppm', 'Tras corregir, la referencia mide dentro de ±20 ppm', 'La LCD muestra la frecuencia y el método'] }
      ],
      extra: ['Mide también el ciclo de trabajo alternando ICES1 en cada captura.', 'Usa el comparador analógico (ACIC) como entrada de captura para medir señales senoidales pequeñas.']
    },

    av_clock: {
      intro: 'Un reloj de cuatro dígitos de 7 segmentos refrescado por la interrupción del Timer2. Descubrirás lo que se desvía el reloj de una Uno y lo corregirás, primero por software y luego con un RTC.',
      level: 3, hours: 12,
      skills: ['Multiplexado de displays por interrupción', 'Tablas de segmentos en PROGMEM', 'Transistores para corrientes de dígito', 'Medir y corregir la deriva de un reloj'],
      bom: ['Arduino Nano (o Uno)', 'Display de 4 dígitos de 7 segmentos de cátodo común', '8 resistencias de 220 Ω (segmentos)', '4 transistores BC337 o 2N2222, 4 resistencias de 1 kΩ (base) y 4 de 10 kΩ (base a masa)', '2 pulsadores para ajustar la hora', 'Opcional: módulo RTC DS3231'],
      phases: [
        { title: 'Fase 1 · Montaje y cálculo de corrientes', steps: ['Segmentos a–g y punto a PD0–PD7 (D0–D7) a través de 220 Ω.', 'Cada cátodo común a un colector de un BC337; emisores a GND; bases a PC0–PC3 (A0–A3) con 1 kΩ y 10 kΩ de base a masa.', 'Calcula el pico de un dígito con los 8 segmentos encendidos: unos (5 − 2) / 220 × 8.', 'Ojo: D0 y D1 son RX y TX. Con los transistores apagados durante la carga (por las resistencias de 10 kΩ) los segmentos no cargan esas líneas; si falla la subida, desconecta los segmentos a y b mientras programas.'], checks: ['He calculado unos 110 mA de pico por dígito y por eso uso transistor', 'Cada base tiene su resistencia a masa', 'Puedo subir programas con el display conectado'] },
        { title: 'Fase 2 · El refresco por interrupción', steps: ['Carga el código de la fase con digito[] = {1, 2, 3, 4}.', 'Comprueba que se ven los cuatro dígitos sin parpadeo.', 'Cambia OCR2A para refrescar a 100 Hz por dígito y luego a 25 Hz: anota a partir de cuándo se nota el parpadeo.', 'Quita la línea que apaga los dígitos antes de cambiar segmentos y observa los “fantasmas”.'], checks: ['Se ven 1234 sin parpadeo', 'He anotado la frecuencia a la que aparece el parpadeo', 'He visto los fantasmas y sé por qué se producen'],
          code: `// Segmentos a..g + punto en PD0..PD7; dígitos (transistores) en PC0..PC3
const uint8_t SEG[10] PROGMEM = {0x3F,0x06,0x5B,0x4F,0x66,0x6D,0x7D,0x07,0x7F,0x6F};
volatile uint8_t digito[4] = {1, 2, 3, 4};
volatile uint16_t ms = 0;
volatile uint8_t segundos = 0;

ISR(TIMER2_COMPA_vect) {               // 1000 veces por segundo
  static uint8_t d = 0;
  PORTC &= ~0x0F;                      // apaga todos los dígitos: evita fantasmas
  PORTD = pgm_read_byte(&SEG[digito[d]]);
  PORTC |= (1 << d);                   // enciende solo el dígito d
  d = (d + 1) & 3;
  if (++ms == 1000) { ms = 0; segundos++; }
}

void setup() {
  DDRD = 0xFF;
  DDRC |= 0x0F;
  TCCR2A = (1 << WGM21);               // CTC
  TCCR2B = (1 << CS22);                // en el Timer2, CS22 solo = prescaler 64
  OCR2A  = 249;                        // 16 MHz / (64 · 250) = 1 kHz
  TIMSK2 = (1 << OCIE2A);
}

void loop() {
  // Tu parte: convierte los segundos en HH:MM y rellena digito[]
}` },
        { title: 'Fase 3 · Hora y ajuste', steps: ['En loop(), lee segundos de forma atómica, súmalos a minutos y horas y rellena digito[].', 'Haz parpadear el punto del segundo dígito cada segundo.', 'Dos pulsadores en PB0 y PB1 con PCINT: uno suma minutos y otro horas, con antirrebote.', 'Mantener pulsado acelera el avance tras 1 s.'], checks: ['Muestra HH:MM y el punto parpadea cada segundo', 'Los pulsadores ajustan sin saltos dobles', 'La lectura de segundos es atómica en el código'] },
        { title: 'Fase 4 · Medir la deriva', steps: ['Pon el reloj en hora con la del móvil (sincronizada por red) y déjalo 24 h.', 'Anota la diferencia en segundos y calcula el error en ppm: diferencia / 86 400 × 1 000 000.', 'Una Uno R3 usa un resonador cerámico para el ATmega328P: espera errores de cientos o miles de ppm. Una Nano con cristal suele ir mejor: compara si tienes las dos.', 'Corrige por software: cada N interrupciones, añade o quita un milisegundo según tu medida.'], checks: ['He medido la deriva en ppm tras 24 h', 'Tras la corrección, el error en 24 h baja de 2 s', 'He anotado si mi placa tiene cristal o resonador'] },
        { title: 'Fase 5 · Un RTC de verdad', steps: ['Conecta un DS3231 por I²C (A4/A5) con sus pull-ups (el módulo suele traerlas).', 'Lee la hora una vez por segundo con tu propia función TWI o con Wire.', 'Usa el Timer2 solo para refrescar el display y la hora del RTC para mostrar.', 'Deja el reloj una semana y compara.'], checks: ['El reloj sigue en hora tras desconectar la alimentación (pila del RTC)', 'Tras una semana el error es menor de 5 s', 'El refresco y la lectura del RTC no interfieren'] }
      ],
      extra: ['Ajusta el brillo variando el tiempo encendido de cada dígito dentro de la ISR, según una LDR.', 'Añade alarma con el zumbador y guárdala en la EEPROM.']
    },

    av_ir: {
      intro: 'Vas a leer cualquier mando a distancia midiendo con el Timer1 la duración de cada pulso infrarrojo, y a escribir tu propio decodificador del protocolo NEC sin librerías.',
      level: 3, hours: 8,
      skills: ['Input Capture alternando flancos', 'Analizar un protocolo a partir de tiempos', 'Máquinas de estados dentro de una ISR', 'Validar tramas con bytes complementarios'],
      bom: ['Arduino Uno o Nano', 'Receptor IR TSOP38238 (o equivalente de 38 kHz)', 'Resistencia de 100 Ω y condensador de 4,7 µF para filtrar su alimentación', 'Un mando de TV o el de un kit de Arduino', 'LEDs o un servo para la aplicación final'],
      phases: [
        { title: 'Fase 1 · Capturar tiempos crudos', steps: ['Conecta el TSOP38238 según su hoja de datos (en el TSOP382xx: 1 OUT, 2 GND, 3 VS); 100 Ω en serie con VS y 4,7 µF de VS a GND.', 'OUT a D8 (ICP1). Su salida está a 1 en reposo y baja mientras recibe la portadora de 38 kHz.', 'Carga el código de la fase, apunta con el mando y pulsa una tecla.', 'Copia la lista de duraciones en la libreta.'], checks: ['Aparece una lista de unos 67 tiempos por pulsación', 'El primer tiempo ronda los 9000 µs y el segundo los 4500 µs (si el mando es NEC)', 'Pulsaciones de la misma tecla dan listas casi iguales'],
          code: `// TSOP38238: OUT a D8 (ICP1). En reposo a 1; baja con la portadora.
const uint8_t MAXF = 80;
volatile uint16_t t[MAXF];       // instante de cada flanco, en cuentas de 0,5 µs
volatile uint8_t n = 0;

ISR(TIMER1_CAPT_vect) {
  if (n < MAXF) t[n++] = ICR1;
  TCCR1B ^= (1 << ICES1);         // el siguiente flanco será el contrario
  TIFR1 = (1 << ICF1);            // cambiar ICES1 puede activar la bandera: bórrala
}

void setup() {
  Serial.begin(115200);
  TCCR1A = 0;
  TCCR1B = (1 << ICNC1) | (1 << CS11);   // primero flanco de bajada; prescaler 8
  TIMSK1 = (1 << ICIE1);
}

void loop() {
  static uint8_t visto = 0;
  if (n && n == visto) {                 // 100 ms sin flancos nuevos: trama completa
    for (uint8_t i = 1; i < n; i++) {
      Serial.print((uint16_t)(t[i] - t[i - 1]) / 2);   // a microsegundos
      Serial.print(' ');
    }
    Serial.println();
    n = 0;
    TCCR1B &= ~(1 << ICES1);             // vuelve a esperar un flanco de bajada
  }
  visto = n;
  delay(100);
}` },
        { title: 'Fase 2 · Entender el protocolo', steps: ['En NEC: ráfaga de 9 ms, silencio de 4,5 ms y 32 bits. Cada bit es una ráfaga de unos 560 µs seguida de un silencio corto (≈560 µs, un 0) o largo (≈1690 µs, un 1).', 'Marca en tu lista qué silencios son 0 y cuáles 1.', 'Agrúpalos en 4 bytes, recordando que se envía primero el bit menos significativo de cada byte.', 'Comprueba que el byte 2 es el complemento del byte 3 (comando y comando invertido).', 'Mantén la tecla: verás la trama de repetición (9 ms + 2,25 ms + una ráfaga corta).'], checks: ['He decodificado a mano la dirección y el comando de una tecla', 'El comando y su complemento suman 0xFF', 'He identificado la trama de repetición'] },
        { title: 'Fase 3 · Decodificador en la ISR', steps: ['Convierte la ISR en una máquina de estados: INICIO (espera ~9 ms), CABECERA (4,5 ms o 2,25 ms de repetición), BITS (32 silencios), y vuelve a INICIO.', 'Acepta tiempos con tolerancia (±25 %): los mandos baratos no son exactos.', 'Ve desplazando cada bit en un uint32_t; al llegar a 32, valida los complementos y deja el código listo con una bandera volatile.', 'Si algo no cuadra, vuelve a INICIO sin dar el código por bueno.'], checks: ['Cada tecla da siempre el mismo código de 32 bits', 'Las tramas con ruido se descartan sin falsos positivos', 'La ISR no usa Serial ni bucles de espera'] },
        { title: 'Fase 4 · Aplicación', steps: ['Asigna teclas: números encienden LEDs, flechas mueven un servo, la tecla de encendido apaga todo.', 'Usa la trama de repetición para que mantener una flecha mueva el servo de forma continua.', 'Modo aprendizaje: al pulsar un botón, la siguiente tecla recibida se guarda en la EEPROM como “tecla de acción”.', 'Prueba con dos mandos distintos y documenta cuál es NEC y cuál no.'], checks: ['Controlo LEDs y servo desde el mando', 'Mantener una flecha repite la acción', 'La tecla aprendida sobrevive a un apagado'] }
      ],
      extra: ['Escribe también un emisor: un LED IR en OC2B (D3) con el Timer2 a 38 kHz, modulado por software, para clonar teclas.', 'Añade el protocolo RC5 de Philips (codificación Manchester) a tu decodificador.']
    },

    av_synth: {
      intro: 'Un sintetizador de 8 bits: el Timer1 hace de convertidor digital-analógico con PWM a 62,5 kHz, el Timer2 marca 16 000 muestras por segundo y una tabla de ondas genera el sonido. Lo tocarás con tus propios pulsadores.',
      level: 4, hours: 18,
      skills: ['PWM como DAC con filtro RC', 'Síntesis digital directa (DDS) con acumulador de fase', 'ISR de audio con tiempo garantizado', 'Envolventes y mezcla de voces en enteros'],
      bom: ['Arduino Uno o Nano', 'Resistencias de 1 kΩ y condensadores de 10 nF (filtro de dos etapas)', 'Condensador de 10 µF (desacoplo de audio)', 'Amplificador PAM8403 o LM386 y altavoz pequeño (o unos auriculares con 1 kΩ en serie)', '8 pulsadores', 'Potenciómetros de 10 kΩ para controles'],
      phases: [
        { title: 'Fase 1 · El PWM como DAC', steps: ['Configura Timer1 en Fast PWM de 8 bits sin prescaler: 16 MHz / 256 = 62,5 kHz en D9 (OC1A).', 'Monta el filtro: D9 → 1 kΩ → 10 nF a masa → 1 kΩ → 10 nF a masa → 10 µF → amplificador.', 'Calcula la frecuencia de corte de cada etapa (≈16 kHz) y comprueba que 62,5 kHz queda muy atenuado.', 'Con OCR1A fijo en 64, 128 y 192 mide la tensión continua tras el filtro.'], checks: ['Mido 1,25, 2,5 y 3,75 V (±0,15 V) para 64, 128 y 192', 'He calculado la frecuencia de corte del filtro', 'El amplificador no hace ruido con OCR1A fijo'] },
        { title: 'Fase 2 · DDS: un seno de cualquier frecuencia', steps: ['Carga el código de la fase: suena un La de 440 Hz.', 'Explica el acumulador de fase: cada muestra suma “paso” y los 8 bits altos eligen la posición en la tabla.', 'Calcula la resolución en frecuencia: 16 000 / 65 536 ≈ 0,24 Hz.', 'Mide con un pin de traza cuánto dura la ISR y qué porcentaje de CPU consume a 16 kHz.'], checks: ['Suena 440 Hz ±1 Hz según el afinador', 'He medido la duración de la ISR con el pin de traza', 'La ISR usa menos del 30 % de la CPU'],
          code: `// Seno por DDS: Timer1 = DAC PWM a 62,5 kHz; Timer2 = 16 000 muestras/s
uint8_t seno[256];                      // en RAM para empezar; luego, a PROGMEM
volatile uint16_t fase = 0, paso = 0;   // acumulador de fase de 16 bits

ISR(TIMER2_COMPA_vect) {
  fase += paso;
  OCR1A = seno[fase >> 8];              // la muestra va al "DAC"
}

void nota(float hz) {
  uint16_t p = hz * 65536.0 / 16000.0;  // paso = f · 2^16 / fs
  noInterrupts(); paso = p; interrupts();
}

void setup() {
  for (int i = 0; i < 256; i++) seno[i] = 128 + 127 * sin(2 * PI * i / 256.0);
  DDRB  |= (1 << PB1);                               // OC1A = D9
  TCCR1A = (1 << COM1A1) | (1 << WGM10);             // Fast PWM 8 bits (modo 5)
  TCCR1B = (1 << WGM12) | (1 << CS10);               // sin prescaler: 62,5 kHz
  TCCR2A = (1 << WGM21);                             // Timer2 en CTC
  TCCR2B = (1 << CS21);                              // prescaler 8
  OCR2A  = 124;                                      // 16 MHz / (8 · 125) = 16 kHz
  TIMSK2 = (1 << OCIE2A);
  nota(440.0);
}

void loop() {}` },
        { title: 'Fase 3 · Formas de onda y dos voces', steps: ['Añade tablas de diente de sierra, cuadrada y triangular (o calcúlalas sin tabla a partir de la fase).', 'Pasa las tablas a PROGMEM y léelas con pgm_read_byte.', 'Dos acumuladores de fase y dos pasos: mezcla sumando las dos muestras y dividiendo entre 2 (un desplazamiento).', 'Toca un intervalo de quinta (440 y 660 Hz) y escucha el resultado.'], checks: ['Se oyen claramente cuatro timbres distintos', 'Dos notas a la vez suenan sin distorsión por desbordamiento', 'Las tablas no ocupan SRAM'] },
        { title: 'Fase 4 · Envolvente ADSR', steps: ['Cada voz tiene un volumen de 0 a 255 que la ISR aplica multiplicando: (muestra − 128) × volumen / 256 + 128.', 'En loop(), cada milisegundo, avanza la envolvente: ataque, caída, sostenimiento y relajación.', 'Cuatro potenciómetros (A0–A3) ajustan los cuatro tiempos.', 'Comprueba que la multiplicación de 8 × 8 bits usa la instrucción mul del AVR mirando el .lst.'], checks: ['Las notas tienen ataque y relajación audibles y ajustables', 'He encontrado la instrucción mul en el listado', 'No hay clics al empezar ni al acabar una nota'] },
        { title: 'Fase 5 · Teclado y acabado', steps: ['Ocho pulsadores en PD2–PD7 y PB0–PB1… o en una matriz si quieres más notas.', 'Asignación de voces: si suenan dos y llega una tercera, roba la más antigua.', 'Añade un selector de octava y otro de forma de onda.', 'Haz una caja y graba una demostración de 30 s.'], checks: ['Se puede tocar una melodía sencilla', 'El robo de voces funciona sin notas colgadas', 'La grabación demuestra al menos dos timbres'] }
      ],
      extra: ['Recibe notas por MIDI (mira el proyecto del controlador MIDI) y conviértelo en un módulo de sonido.', 'Añade un filtro digital paso bajo de un polo con resonancia variable.']
    },

    av_thermo: {
      intro: 'Un termómetro que mide con una NTC y con el sensor interno del chip, lo muestra en una LCD I²C y guarda una semana de historial en la EEPROM sin desgastarla.',
      level: 3, hours: 10,
      skills: ['ADC por registros con promediado', 'La ecuación B de una NTC', 'Calibrar el sensor de temperatura interno', 'Registro circular en EEPROM sin desgastar ninguna celda'],
      bom: ['Arduino Uno o Nano', 'NTC de 10 kΩ (B = 3950) y resistencia de 10 kΩ al 1 %', 'Pantalla LCD 16×2 con adaptador I²C (PCF8574)', 'Pulsador', 'Termómetro de referencia (uno de cocina o de farmacia)'],
      phases: [
        { title: 'Fase 1 · NTC por registros', steps: ['Monta la NTC de 5 V a A0 y la de 10 kΩ de A0 a GND.', 'Carga adcLeer() y temperatura() y muestra el resultado por Serial cada segundo.', 'Compara con tu termómetro de referencia en la habitación y con la NTC entre los dedos.', 'Cambia el promediado de 16 a 1 muestra y anota cuánto baila la lectura.'], checks: ['La lectura coincide con la referencia ±1 °C a temperatura ambiente', 'Con 16 muestras varía menos de 0,2 °C en un minuto', 'He anotado la mejora del promediado'],
          code: `// NTC 10 kΩ (B = 3950) de 5 V a A0; 10 kΩ fija de A0 a GND
uint16_t adcLeer(uint8_t canal) {
  ADMUX  = (1 << REFS0) | (canal & 0x0F);       // referencia AVcc
  ADCSRA = (1 << ADEN) | (1 << ADSC) | 7;       // prescaler 128 y arranca
  while (ADCSRA & (1 << ADSC)) ;                // ADSC vuelve a 0 al acabar
  return ADC;
}

float temperatura() {
  uint32_t suma = 0;
  for (uint8_t i = 0; i < 16; i++) suma += adcLeer(0);
  float n = suma / 16.0;
  float rNtc = 10000.0 * (1023.0 - n) / n;           // NTC arriba, fija abajo
  float invT = 1.0 / 298.15 + log(rNtc / 10000.0) / 3950.0;
  return 1.0 / invT - 273.15;
}` },
        { title: 'Fase 2 · El sensor escondido', steps: ['Lee el canal 8 (MUX3:0 = 1000) con la referencia interna de 1,1 V (REFS1 y REFS0 a 1). Descarta la primera lectura tras cambiar de referencia.', 'Promedia 64 lecturas.', 'Anota la lectura a temperatura ambiente y, con la placa dentro de una bolsa en la nevera 20 min, otra vez.', 'Con esos dos puntos y tu referencia, calcula la pendiente y el desplazamiento; guárdalos en la EEPROM.'], checks: ['He obtenido dos puntos de calibración', 'Tras calibrar, el sensor interno coincide con la referencia ±2 °C', 'Sé por qué el sensor interno mide algo más que el aire (el chip se calienta)'] },
        { title: 'Fase 3 · La pantalla', steps: ['Conecta la LCD por I²C (SDA a A4, SCL a A5).', 'Busca su dirección con un escáner I²C (suele ser 0x27 o 0x3F) y anota cuál es.', 'Muestra temperatura de la NTC, mínima y máxima desde el arranque.', 'Actualiza la pantalla solo cuando cambie un valor visible, para no hacerla parpadear.'], checks: ['La pantalla muestra temperatura, mínima y máxima', 'He anotado la dirección I²C del módulo', 'La pantalla no parpadea'] },
        { title: 'Fase 4 · Historial en la EEPROM', steps: ['Cada 10 min guarda un byte: (temperatura + 20) × 2, que cubre de −20 a 107 °C en pasos de 0,5 °C.', 'No guardes el índice en una celda fija (se gastaría en menos de dos años). Usa un marcador: la celda siguiente a la última escrita vale siempre 0xFF.', 'Al arrancar, busca el 0xFF para saber dónde seguir.', 'Calcula la vida de la EEPROM: cada celda se escribe una vez por vuelta de 1023 registros.'], checks: ['Tras desconectar y reconectar, el registro continúa donde iba', 'He calculado la vida de la EEPROM (siglos con este esquema)', 'La EEPROM nunca se escribe más de una vez cada 10 min'] },
        { title: 'Fase 5 · Volcar y analizar', steps: ['Al mantener el pulsador 3 s, envía todo el historial por Serial en CSV (minuto, temperatura).', 'Abre el CSV en una hoja de cálculo y representa una semana.', 'Busca en la gráfica el efecto de la calefacción o del sol.', 'Añade una alarma: si baja de 5 °C, el LED parpadea.'], checks: ['He representado al menos 3 días de datos', 'El CSV se importa sin errores', 'La alarma se activa en la nevera'] }
      ],
      extra: ['Mide la propia VCC con la referencia de 1,1 V y corrige la lectura de la NTC si la alimentación varía.', 'Sustituye la NTC por dos y haz un termómetro diferencial (interior y exterior).']
    },

    av_scope: {
      intro: 'Un osciloscopio de bolsillo con el ADC a máxima velocidad: casi 77 000 muestras por segundo, disparo por flanco y base de tiempos ajustable. Muy útil para ver audio, PWM y señales lentas en tu mesa.',
      level: 4, hours: 16,
      skills: ['ADC en modo continuo con interrupción', 'Etapa de entrada con desplazamiento y protección', 'Disparo y bases de tiempos', 'Enviar datos rápido al PC o dibujarlos en una pantalla'],
      bom: ['Arduino Nano', 'Amplificador operacional MCP6002 (rail-to-rail, 5 V)', 'Resistencias de 100 kΩ (×3) y 1 kΩ', '2 diodos Schottky BAT85', 'Condensador de 100 nF', 'Pantalla OLED SSD1306 128×64 I²C o SPI (o solo el PC)', 'Pulsadores para la base de tiempos y el disparo'],
      phases: [
        { title: 'Fase 1 · Etapa de entrada', steps: ['Divisor de tres resistencias de 100 kΩ: de la entrada al nudo, del nudo a 5 V y del nudo a masa. El nudo vale (Vin + 5) / 3, así que el rango es de −5 V a +10 V.', 'Seguidor de tensión con el MCP6002 tras el nudo: el ADC ve una fuente de baja impedancia.', '1 kΩ en serie hacia A0 y dos BAT85 a 5 V y a GND para proteger el pin.', 'Mide con el multímetro el nudo con la entrada a masa (1,67 V esperados) y con 5 V (3,33 V).', 'Seguridad: nunca conectes la entrada a la red eléctrica ni a nada que no sea de baja tensión.'], checks: ['Con la entrada a 0 V el nudo marca 1,67 V ±0,05 V', 'Con 5 V marca 3,33 V ±0,05 V', 'He calculado el rango de entrada: −5 V a +10 V'] },
        { title: 'Fase 2 · Capturar a toda velocidad', steps: ['Carga capturar() y mide cuánto tarda con micros(): unos 6,7 ms para 512 muestras.', 'Calcula la frecuencia real de muestreo y compárala con 16 MHz / 16 / 13.', 'Pon un pin de traza que conmute en la ISR y mídelo con tu frecuencímetro: deberías ver unos 38 kHz (dos conmutaciones por periodo).', 'Envía el búfer por Serial y represéntalo con el trazador serie del IDE.'], checks: ['Muestreo medido entre 75 y 78 kHz', 'El pin de traza confirma la frecuencia de la ISR', 'Veo una onda conocida (el PWM del Timer2) bien dibujada'],
          code: `const uint16_t NM = 512;
volatile uint8_t muestras[NM];
volatile uint16_t idx = 0;
volatile bool lleno = false;         // bandera de 8 bits: lectura atómica

ISR(ADC_vect) {                      // salta al terminar cada conversión
  muestras[idx] = ADCH;              // con ADLAR, los 8 bits altos
  if (++idx >= NM) { ADCSRA &= ~(1 << ADIE); lleno = true; }
}

void capturar() {
  idx = 0; lleno = false;
  ADMUX  = (1 << REFS0) | (1 << ADLAR);              // AVcc, ajuste a la izquierda, ADC0
  ADCSRB = 0;                                        // disparo continuo (free running)
  DIDR0  = (1 << ADC0D);                             // sin buffer digital en A0
  ADCSRA = (1 << ADEN) | (1 << ADSC) | (1 << ADATE) | (1 << ADIE) | (1 << ADPS2);  // /16
  while (!lleno) ;                                   // ~6,7 ms
  ADCSRA = 0;
}` },
        { title: 'Fase 3 · Disparo y base de tiempos', steps: ['Disparo por flanco de subida: en el búfer, busca el primer punto donde la señal cruza el nivel de disparo hacia arriba y empieza a dibujar ahí.', 'Para que el disparo esté en mitad de la pantalla, captura de forma continua en un búfer circular y detente 256 muestras después del cruce.', 'Bases de tiempos más lentas: en vez de free running, dispara el ADC con el Timer1 (ADTS = 101, Compare B) y elige frecuencias de 1 kHz a 50 kHz. Recuerda borrar OCF1B en cada conversión o el disparo automático se detiene.', 'Muestra en el PC la escala: µs por división y V por división.'], checks: ['Una onda periódica queda quieta en pantalla', 'Hay al menos 5 bases de tiempos', 'La escala de tiempo mostrada coincide con la frecuencia conocida ±2 %'] },
        { title: 'Fase 4 · Pantalla propia', steps: ['Con una OLED I²C, usa una librería en modo de páginas (por ejemplo U8g2 con búfer de página) para no gastar 1 KB de SRAM en un búfer de pantalla completo.', 'Dibuja retícula, onda y textos de escala.', 'Comprueba con ramLibre() que te quedan al menos 200 bytes.', 'Mide el tiempo de refresco: apunta a más de 10 imágenes por segundo.'], checks: ['La onda se ve en la OLED con retícula', 'Quedan al menos 200 bytes de SRAM libres', 'Refresca más de 10 veces por segundo'] },
        { title: 'Fase 5 · Medidas automáticas', steps: ['Calcula Vmín, Vmáx, Vpp y valor medio de cada captura, corrigiendo con la ecuación de la etapa de entrada.', 'Calcula la frecuencia contando cruces del nivel medio.', 'Botón AUTO: elige base de tiempos para ver entre 2 y 5 periodos.', 'Calibra contra el multímetro con 0 V y 5 V y guarda las constantes en la EEPROM.'], checks: ['Vpp de una señal de 5 V medida con error menor de 3 %', 'La frecuencia mostrada coincide con tu frecuencímetro ±2 %', 'El botón AUTO encuentra una base adecuada para 100 Hz y para 5 kHz'] }
      ],
      extra: ['Modo XY con dos canales alternos (A0 y A1).', 'Modo de registro lento: una muestra por segundo durante horas, para ver cómo se descarga una batería.']
    },

    av_cube: {
      intro: 'Un cubo de 64 LEDs que soldarás a mano y animarás con dos registros de desplazamiento por SPI y un refresco por interrupción. Paciencia, plantilla y mucha soldadura: el resultado impresiona.',
      level: 4, hours: 25,
      skills: ['Montaje mecánico preciso con plantilla', 'SPI maestro por registros', 'Multiplexado por capas con MOSFET', 'Doble búfer y animaciones en PROGMEM'],
      bom: ['64 LEDs difusos de 3 o 5 mm del mismo lote', '2 registros de desplazamiento 74HC595', '16 resistencias de 470 Ω', '4 MOSFET 2N7000 (capas) con 100 Ω de puerta y 100 kΩ a masa', 'Arduino Nano', 'Placa perforada grande, hilo de cobre estañado o desnudo', 'Tabla de madera para la plantilla, taladro', 'Fuente de 5 V y 1 A'],
      phases: [
        { title: 'Fase 1 · Plantilla y capas', steps: ['Taladra una cuadrícula de 4 × 4 agujeros separados 25 mm en la madera, del diámetro justo para el LED.', 'Prueba todos los LEDs con una pila de 3 V antes de soldar: uno roto dentro del cubo es una pesadilla.', 'Dobla los cátodos en ángulo recto en la misma dirección y suelda los 16 cátodos de cada capa entre sí: cada capa es un “cátodo común”.', 'Comprueba cada LED de la capa con la pila antes de pasar a la siguiente.'], checks: ['Cuatro capas soldadas y los 64 LEDs probados', 'Las capas son planas y los ánodos quedan verticales y alineados', 'Ningún cortocircuito entre ánodos y cátodos (comprobado con continuidad)'] },
        { title: 'Fase 2 · Apilar y cablear', steps: ['Apila las capas soldando cada ánodo con el de la capa de abajo: quedan 16 columnas de ánodos.', 'Columnas a las salidas de los dos 74HC595 encadenados, cada una con su 470 Ω.', 'Cada capa al drenador de un 2N7000; fuentes a masa; puertas a PC0–PC3 (A0–A3).', 'Calcula: con 470 Ω cada LED lleva unos 5 mA y un 74HC595 con 8 LEDs, unos 40 mA, por debajo de su límite de 70 mA en VCC/GND.'], checks: ['16 columnas y 4 capas cableadas sin cortos', 'He comprobado la corriente total por chip en la hoja de datos del 74HC595', 'Encender una capa a mano con 5 V en la puerta funciona'] },
        { title: 'Fase 3 · SPI por registros', steps: ['Conecta MOSI (D11) a SER (pata 14) del primer 595, SCK (D13) a SRCLK (pata 11) de los dos, D10 a RCLK (pata 12) de los dos; QH′ (pata 9) del primero a SER del segundo; OE a masa y SRCLR a 5 V.', 'Carga spiInit() y spiByte() de la fase.', 'Envía 0xFFFF con la capa 0 encendida: toda la capa se ilumina.', 'Mide con el osciloscopio o un analizador lógico que SCK va a 8 MHz.'], checks: ['Puedo encender cualquier columna de una capa', 'SCK medido a 8 MHz', 'Entiendo por qué D10 debe ser salida en modo maestro'],
          code: `void spiInit() {
  DDRB |= (1 << PB2) | (1 << PB3) | (1 << PB5);   // SS (latch), MOSI y SCK: salidas
  SPCR = (1 << SPE) | (1 << MSTR);                // maestro, modo 0, F_CPU / 4
  SPSR = (1 << SPI2X);                            // ×2: 8 MHz
}

uint8_t spiByte(uint8_t b) {
  SPDR = b;
  while (!(SPSR & (1 << SPIF))) ;                 // 8 bits a 8 MHz: 1 µs
  return SPDR;
}

volatile uint16_t capa[4];                        // 16 columnas por capa

ISR(TIMER2_COMPA_vect) {                          // unas 400 veces por segundo
  static uint8_t c = 0;
  PORTC &= ~0x0F;                                 // apaga las cuatro capas
  spiByte(capa[c] >> 8);
  spiByte(capa[c] & 0xFF);
  PORTB |= (1 << PB2); PORTB &= ~(1 << PB2);      // pulso de RCLK (latch)
  PORTC |= (1 << c);                              // enciende la capa c
  c = (c + 1) & 3;
}` },
        { title: 'Fase 4 · Refresco y doble búfer', steps: ['Timer2 en CTC con prescaler 256 (CS22 y CS21) y OCR2A = 155: unos 400 Hz, 100 imágenes completas por segundo.', 'Mide con un pin de traza que la ISR dura menos de 10 µs.', 'Dibuja en un segundo array y cópialo a capa[] de golpe con las interrupciones desactivadas: así nunca se ve una imagen a medias.', 'Comprueba con la cámara del móvil a cámara lenta que no hay parpadeo apreciable.'], checks: ['El cubo se ve estable sin parpadeo', 'La ISR dura menos de 10 µs', 'Las animaciones no muestran imágenes a medias'] },
        { title: 'Fase 5 · Animaciones', steps: ['Haz al menos cinco efectos: lluvia, plano que barre, onda senoidal, cubo que crece y texto que pasa.', 'Guarda las secuencias fijas en PROGMEM.', 'Un pulsador cambia de efecto; mantenerlo 2 s activa el modo aleatorio.', 'Bonus: una serpiente 3D jugable con 6 botones.'], checks: ['Al menos 5 efectos distintos', 'Las secuencias están en PROGMEM', 'El pulsador cambia de efecto sin bloquear el refresco'] }
      ],
      extra: ['Brillo por LED con modulación por ángulo de bit (BAM): 4 niveles por LED sin cambiar el hardware.', 'Haz que reaccione a la música con un micrófono y el ADC.']
    },

    av_midi: {
      intro: 'Un controlador MIDI con pulsadores y potenciómetros que habla con sintetizadores reales o con tu ordenador. La USART a 31 250 baudios, que a 16 MHz sale con error cero.',
      level: 3, hours: 8,
      skills: ['USART por registros a una velocidad no estándar', 'El protocolo MIDI: mensajes y running status', 'Lectura de potenciómetros con histéresis', 'Entrada MIDI optoaislada con búfer circular'],
      bom: ['Arduino Uno o Nano', 'Conector DIN de 5 patas hembra', '2 resistencias de 220 Ω', '8 pulsadores y 4 potenciómetros de 10 kΩ', 'Para la entrada MIDI: optoacoplador 6N138, diodo 1N4148, resistencias de 220 Ω y 470 Ω', 'Un sintetizador con entrada MIDI o un cable USB-MIDI'],
      phases: [
        { title: 'Fase 1 · Salida MIDI por registros', steps: ['Conector DIN: pata 4 → 220 Ω → +5 V; pata 5 → 220 Ω → TX (D1); pata 2 → GND.', 'Calcula UBRR0 para 31 250 baudios: 16 000 000 / (16 × 31 250) − 1 = 31, error 0 %.', 'Carga midiInit() y notaOn(); envía una nota cada segundo, alternando nota encendida y apagada (velocidad 0).', 'No uses Serial en este programa: comparten la USART.'], checks: ['El sintetizador o el PC recibe la nota cada segundo', 'He calculado UBRR0 = 31 y el error 0 %', 'Desconecto el cable MIDI para subir programas, si hace falta'],
          code: `void midiInit(void) {
  UBRR0  = 31;                              // 16 MHz / (16 · 32) = 31 250 baudios exactos
  UCSR0A = 0;                               // sin U2X
  UCSR0B = (1 << TXEN0) | (1 << RXEN0);
  UCSR0C = (1 << UCSZ01) | (1 << UCSZ00);   // 8N1
}

void midiByte(uint8_t b) {
  while (!(UCSR0A & (1 << UDRE0))) ;        // espera hueco en el registro de envío
  UDR0 = b;
}

void notaOn(uint8_t canal, uint8_t nota, uint8_t vel) {
  midiByte(0x90 | (canal & 0x0F));          // estado: nota encendida
  midiByte(nota & 0x7F);                    // los datos MIDI son de 7 bits
  midiByte(vel & 0x7F);
}` },
        { title: 'Fase 2 · Pulsadores que tocan', steps: ['Ocho pulsadores en PD2–PD7 y PB0–PB1 con pull-up, leídos como bytes con antirrebote.', 'Al pulsar: nota encendida; al soltar: nota apagada (0x80 o 0x90 con velocidad 0).', 'Implementa running status: si el byte de estado es el mismo que el anterior, no lo repitas.', 'Mide con un analizador lógico o calcula cuánto tarda un mensaje de 3 bytes (≈0,96 ms).'], checks: ['Cada pulsador toca su nota sin notas colgadas', 'El running status reduce los bytes enviados (comprobado contando)', 'He calculado el tiempo de un mensaje'] },
        { title: 'Fase 3 · Potenciómetros como controles', steps: ['Lee 4 potenciómetros con el ADC y conviértelos a 0–127.', 'Envía un mensaje de control (0xB0, número de control, valor) solo si el valor cambia.', 'Añade histéresis: solo acepta un cambio si la lectura de 10 bits se mueve más de 6 unidades, para no enviar un chorro de mensajes por el ruido.', 'Asigna los controles a volumen, filtro, resonancia y efecto en tu sintetizador.'], checks: ['Mover un potenciómetro cambia el parámetro en el sintetizador', 'Con los potenciómetros quietos no se envía nada', 'La histéresis no hace que se pierdan los extremos 0 y 127'] },
        { title: 'Fase 4 · Entrada MIDI', steps: ['Monta la entrada optoaislada con el 6N138 según su hoja de datos: el lado MIDI con 220 Ω y el 1N4148 en antiparalelo; la salida con pull-up de 470 Ω a 5 V hacia RX (D0).', 'Activa RXCIE0 y escribe USART_RX_vect que guarde cada byte en un búfer circular de 32.', 'En loop(), interpreta los mensajes (con running status) y enciende un LED por cada nota recibida.', 'Reenvía lo que llega (función MIDI THRU) mezclado con tus pulsadores.'], checks: ['Los LEDs siguen las notas que llegan', 'No se pierden mensajes con acordes de 4 notas', 'El reenvío funciona sin mensajes cortados a la mitad'] }
      ],
      extra: ['Añade un reloj MIDI (0xF8, 24 por negra) con el Timer1 y un potenciómetro de tempo.', 'Convierte la placa en el teclado del sintetizador de 8 bits.']
    },

    av_logger: {
      intro: 'Un registrador de temperatura y humedad con el chip suelto alimentado por dos pilas AA, que mide cada 10 minutos durante más de un año. Cada microamperio cuenta, y lo vas a medir.',
      level: 4, hours: 15,
      skills: ['Chip suelto a 1 MHz y baja tensión', 'Power-down con despertar por watchdog', 'Cazar fugas de corriente', 'TWI con un sensor y una EEPROM externa'],
      bom: ['ATmega328P en DIP-28 y zócalo', 'Portapilas de 2 AA', 'Sensor BME280 o SHT31 en un módulo sin regulador ni LED (o retira el LED)', 'EEPROM I²C 24AA256 (funciona desde 1,7 V)', '2 resistencias de 10 kΩ (pull-ups I²C) y 100 nF de desacoplo', 'Programador ISP (Arduino as ISP o USBasp)', 'Adaptador USB-serie para volcar datos', 'Multímetro con rango de µA'],
      phases: [
        { title: 'Fase 1 · Chip suelto a 1 MHz', steps: ['Monta el 328P en la protoboard con 100 nF entre VCC y GND y entre AVCC y GND, y 10 kΩ de RESET a VCC.', 'Graba los fusibles para el RC interno de 8 MHz con CKDIV8 programado (1 MHz): a 1 MHz el chip funciona hasta 1,8 V, así que aprovecha las pilas hasta el final. Pon el BOD a 1,8 V.', 'Programa por ISP un parpadeo y mide la corriente con 3 V: con el LED apagado debería quedar por debajo de 1 mA.', 'Anota la corriente activa: la usarás en el presupuesto.'], checks: ['El chip parpadea a 3 V desde las pilas', 'He anotado los fusibles que he grabado y por qué', 'Corriente activa medida y anotada'] },
        { title: 'Fase 2 · Dormir de verdad', steps: ['Carga dormir8s() y un bucle que solo duerma.', 'Mide la corriente dormido con el multímetro en µA. Objetivo: menos de 6 µA (watchdog incluido).', 'Si sale más, busca la fuga: pines al aire (ponlos como entrada con pull-up o como salida a 0), ADC encendido, BOD activo, el propio sensor.', 'Cuidado: en el rango de µA el multímetro mete resistencia en serie y al despertar el chip puede caerse. Pon un cable que puentee el multímetro mientras despierta o mide solo dormido.'], checks: ['Menos de 6 µA dormido con el watchdog', 'He encontrado y anotado al menos una fuga', 'Despierta cada 8 s (comprobado con un destello de 1 ms)'],
          code: `#include <avr/sleep.h>
#include <avr/interrupt.h>

ISR(WDT_vect) { }                          // solo sirve para despertar

static void dormir8s(void) {
  cli();
  MCUSR &= ~(1 << WDRF);
  WDTCSR = (1 << WDCE) | (1 << WDE);        // secuencia temporizada: 4 ciclos para cambiarlo
  WDTCSR = (1 << WDIE) | (1 << WDP3) | (1 << WDP0);   // solo interrupción, unos 8 s
  ADCSRA &= ~(1 << ADEN);                   // el ADC encendido gasta durmiendo
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  sleep_enable();
  sleep_bod_disable();                      // BOD apagado solo mientras duerme
  sei();                                    // la instrucción tras sei se ejecuta siempre:
  sleep_cpu();                              // no se puede perder el despertar
  sleep_disable();
}` },
        { title: 'Fase 3 · Sensor y memoria por I²C', steps: ['Conecta el sensor y la 24AA256 al bus I²C con pull-ups de 10 kΩ: con un bus lento bastan y gastan menos mientras la línea está a 0.', 'Calcula TWBR para 25 kHz a 1 MHz: (1 000 000 / 25 000 − 16) / 2 = 12. Fíjate en que a 1 MHz el bus no puede pasar de 62,5 kHz (TWBR = 0).', 'Pon el sensor en modo forzado: mide una vez y vuelve a dormir solo.', 'Escribe registros de 6 bytes (minutos, temperatura y humedad) en la EEPROM externa, respetando sus páginas de 64 bytes.'], checks: ['Lee temperatura y humedad coherentes', 'Las escrituras no cruzan límites de página', 'El sensor duerme entre medidas (comprobado midiendo corriente)'] },
        { title: 'Fase 4 · El ciclo completo y el volcado', steps: ['Ciclo: despertar, contar hasta 75 despertares (10 min), medir, guardar, dormir.', 'Al arrancar con un puente en un pin, en vez de registrar, vuelca la memoria por la USART a 9600 baudios (a 1 MHz: U2X0 = 1 y UBRR0 = 12, error 0,16 %).', 'Mide la carga de un ciclo completo con el multímetro o, mejor, con una resistencia de 10 Ω en serie y el osciloscopio.', 'Calcula la autonomía con la calculadora de la lección.'], checks: ['El volcado da un CSV legible', 'He medido la duración y la corriente del despertar', 'La autonomía calculada supera 1 año con 2 AA'] },
        { title: 'Fase 5 · Prueba de campo', steps: ['Déjalo 7 días en un lugar real (balcón protegido de la lluvia, trastero, invernadero).', 'Vuelca los datos y represéntalos.', 'Mide la tensión de las pilas antes y después: compara con lo esperado.', 'Escribe un informe de una página: consumo medido, autonomía prevista, problemas encontrados.'], checks: ['7 días de datos sin huecos', 'La caída de tensión de las pilas es coherente con el consumo medido', 'He escrito el informe'] }
      ],
      extra: ['Añade la medida de la propia VCC con la referencia interna para saber cuándo cambiar las pilas.', 'Diseña una PCB para él en KiCad con un portapilas integrado.']
    },

    av_proto: {
      intro: 'Construye un Arduino desde cero en una protoboard: el chip, el cristal, el reset y el desacoplo. Le grabarás el bootloader con otra placa y lo programarás por USB-serie como si fuera una Uno.',
      level: 2, hours: 6,
      skills: ['El circuito mínimo del ATmega328P', 'Grabar fusibles y bootloader con Arduino as ISP', 'Auto-reset con DTR', 'Diagnosticar un montaje que no arranca'],
      bom: ['ATmega328P-PU (DIP-28)', 'Cristal de 16 MHz y 2 condensadores de 22 pF', '3 condensadores de 100 nF', 'Resistencia de 10 kΩ y pulsador de reset', 'Diodo 1N4148 (de RESET a VCC)', 'LED y 330 Ω', 'Fuente de 5 V (módulo de protoboard o USB)', 'Una Uno para usarla de programador', 'Condensador de 10 µF', 'Adaptador USB-serie de 5 V (CH340, CP2102 o FTDI) con DTR'],
      phases: [
        { title: 'Fase 1 · Alimentación y reset', steps: ['Coloca el chip a caballo de la ranura, muesca a la izquierda.', 'VCC (7) y AVCC (20) a +5 V; GND (8 y 22) a masa. 100 nF pegados entre 7 y 8 y entre 20 y 22.', '10 kΩ de RESET (1) a +5 V, pulsador de RESET a masa y diodo 1N4148 de RESET a +5 V (cátodo a +5 V).', 'Mide con el multímetro antes de poner nada más: 5 V en 7 y en 20, y 5 V en RESET.'], checks: ['5 V en VCC, AVCC y RESET', 'Los condensadores de desacoplo están a menos de 1 cm de sus patas', 'Al pulsar, RESET baja a 0 V'] },
        { title: 'Fase 2 · El reloj', steps: ['Cristal entre XTAL1 (9) y XTAL2 (10), con patas cortas.', 'Un 22 pF de cada pata del cristal a masa.', 'LED con 330 Ω en la pata 19 (PB5, el D13 de Arduino).', 'Ojo: un chip nuevo arranca con el RC interno a 1 MHz y no usa el cristal hasta que cambies los fusibles.'], checks: ['El cristal y sus condensadores están lo más cerca posible del chip', 'Sé por qué un chip nuevo no usa el cristal todavía', 'El LED está en la pata 19'] },
        { title: 'Fase 3 · Bootloader con Arduino as ISP', steps: ['En la Uno programadora carga el ejemplo ArduinoISP.', 'Pon 10 µF entre RESET y GND de la Uno programadora (negativo a GND).', 'Une: D10 de la Uno → RESET (pata 1); D11 → MOSI (17); D12 → MISO (18); D13 → SCK (19); 5 V y GND.', 'En el IDE elige “Arduino Uno” como placa y “Arduino as ISP” como programador; usa “Grabar bootloader”. Graba los fusibles de la Uno y Optiboot.', 'Si falla, lee la firma con avrdude -c stk500v1 -b 19200 -p m328p -P (tu puerto) -v: debe dar 1E 95 0F.'], checks: ['“Grabar bootloader” termina sin errores', 'He leído la firma 1E 95 0F', 'Tras grabar, el LED de la pata 19 da destellos al pulsar reset'] },
        { title: 'Fase 4 · Programar por USB-serie', steps: ['Adaptador: TX → RXD (pata 2), RX → TXD (pata 3), GND a masa, y DTR → 100 nF → RESET.', 'Retira las conexiones del programador ISP.', 'Elige “Arduino Uno” y el puerto del adaptador y sube el ejemplo Blink.', 'Sube un programa con Serial que imprima “hola” y compruébalo.'], checks: ['Blink sube y parpadea en la pata 19', 'El monitor serie muestra el saludo', 'El auto-reset funciona sin pulsar el botón'] },
        { title: 'Fase 5 · Diagnóstico y medidas', steps: ['Mide la corriente total con el LED apagado y compárala con la de una Uno entera ejecutando el mismo programa.', 'Quita un condensador de 22 pF y observa si sigue funcionando (y por qué no debes dejarlo así).', 'Quita la conexión de AVCC y prueba analogRead y un LED en A0: anota qué pasa.', 'Haz una tabla de “síntoma → causa” con lo que has aprendido.'], checks: ['He medido el consumo del montaje frente a una Uno', 'Mi tabla de síntomas tiene al menos 4 filas', 'He vuelto a dejar el circuito completo'] }
      ],
      extra: ['Pásalo a placa perforada con un zócalo y un conector de 6 patas para el adaptador.', 'Prueba a funcionar sin cristal con el RC interno a 8 MHz (fusible low 0xE2) y mide la precisión con tu frecuencímetro.']
    },

    av_tiny: {
      intro: 'Un llavero luciérnaga con un ATtiny85 y una pila de botón CR2032: destellos suaves solo cuando es de noche, con un consumo tan bajo que la pila dura años. Diseño a escala de microamperios.',
      level: 3, hours: 8,
      skills: ['Programar un ATtiny85 por ISP', 'Watchdog y power-down en otro AVR', 'Sensor de luz que solo consume al medir', 'PWM con el Timer0 del ATtiny85'],
      bom: ['ATtiny85 (DIP-8) y zócalo', 'Portapilas CR2032 y pila', 'LED amarillo de alta eficiencia y resistencia de 1 kΩ', 'LDR y resistencia de 100 kΩ', 'Condensador de 100 nF y uno de 10 µF', 'Arduino Uno como programador (Arduino as ISP)', 'Placa perforada pequeña y anilla de llavero'],
      phases: [
        { title: 'Fase 1 · Programar el ATtiny85', steps: ['Instala un núcleo para ATtiny (por ejemplo ATTinyCore) en el IDE.', 'Conecta la Uno con ArduinoISP: D10 → pata 1 (RESET), D11 → 5 (MOSI), D12 → 6 (MISO), D13 → 7 (SCK), 5 V → 8, GND → 4; 10 µF en el RESET de la Uno.', 'Elige ATtiny85 a 1 MHz interno y usa “Grabar bootloader” solo para grabar los fusibles (no hay bootloader).', 'Sube un parpadeo en PB0 (pata 5).'], checks: ['El LED de la pata 5 parpadea', 'Sé por qué en el ATtiny85 se programa siempre por ISP', 'He anotado los fusibles grabados'] },
        { title: 'Fase 2 · Microamperios', steps: ['Carga el programa de la fase: destello de 16 ms cada 8 s.', 'Aliméntalo con la CR2032 y mide la corriente dormido: objetivo, menos de 10 µA.', 'Calcula la media: el LED gasta (3 − 2) / 1000 ≈ 1 mA durante 16 ms cada 8 s, unos 2 µA, más el reposo.', 'Calcula la autonomía con 220 mAh y compárala con la autodescarga de la pila.'], checks: ['Menos de 10 µA dormido medidos', 'Mi cálculo de autonomía supera 2 años', 'Sé qué parte del consumo es el LED y cuál el reposo'],
          code: `#include <avr/io.h>
#include <avr/sleep.h>
#include <avr/interrupt.h>

ISR(WDT_vect) { }

static void dormir(uint8_t wdp) {          // wdp: 0..9 = de 16 ms a 8 s
  WDTCR = (1 << WDCE) | (1 << WDE);        // en el ATtiny85 se llama WDTCR
  WDTCR = (1 << WDIE) | ((wdp & 8) ? (1 << WDP3) : 0) | (wdp & 7);
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  sleep_enable();
  sei();
  sleep_cpu();
  sleep_disable();
}

int main(void) {
  DDRB = (1 << PB0);                       // LED en PB0 (pata 5) con 1 kΩ
  ADCSRA = 0;                              // ADC apagado...
  PRR = (1 << PRTIM1) | (1 << PRUSI) | (1 << PRADC);   // ...y sin reloj
  for (;;) {
    PORTB |= (1 << PB0);  dormir(0);       // destello de unos 16 ms
    PORTB &= ~(1 << PB0); dormir(9);       // unos 8 s a oscuras
  }
}` },
        { title: 'Fase 3 · Solo de noche', steps: ['LDR de PB3 (pata 2) a PB4 (pata 3) y 100 kΩ de PB4 a masa: PB3 alimenta el divisor solo cuando mides.', 'Al despertar: PB3 a 1, espera 1 ms, lee el ADC en PB4 (ADC2), PB3 a 0.', 'Si hay luz, no hagas destello y duerme más (64 s en 8 despertares).', 'Comprueba que, de día, la corriente media baja aún más.'], checks: ['De día no destella; de noche, sí', 'El divisor no consume nada mientras duerme', 'El ADC se enciende y se apaga en cada medida'] },
        { title: 'Fase 4 · Luciérnaga de verdad', steps: ['Cambia el destello fijo por un fundido: PWM en OC0A (PB0) con el Timer0, subiendo y bajando el brillo en unos 300 ms.', 'Duerme en modo Idle durante el fundido (el Timer0 sigue funcionando) y en power-down el resto.', 'Haz que el intervalo entre destellos sea pseudoaleatorio (un LFSR de 16 bits) entre 4 y 20 s.', 'Recalcula el consumo medio con el fundido.'], checks: ['El destello sube y baja suavemente', 'Los intervalos varían y no parecen regulares', 'El consumo medio sigue por debajo de 15 µA'] },
        { title: 'Fase 5 · Montaje final', steps: ['Suelda todo en una placa perforada del tamaño del portapilas.', 'Pon el 10 µF junto a la pila: la CR2032 tiene mucha resistencia interna y los picos del LED hacen caer su tensión.', 'Recuerda que el ATtiny85 normal pide un mínimo de 2,7 V; el ATtiny85V llega a 1,8 V a baja frecuencia. Anota qué versión tienes.', 'Prueba una noche completa y comprueba que la tensión de la pila apenas cambia.'], checks: ['El llavero funciona desde la CR2032 una noche entera', 'He anotado la versión del chip y su tensión mínima', 'La tensión de la pila tras una noche baja menos de 0,02 V'] }
      ],
      extra: ['Añade un pulsador por PCINT que active un modo linterna durante 10 s.', 'Diseña una PCB circular del tamaño de la pila.']
    },

    av_robot: {
      intro: 'Un robot siguelíneas con control PID: PWM de 20 kHz por hardware para los motores, sensores infrarrojos leídos con el ADC y un bucle de control a ritmo fijo. Lo ajustarás en la pista hasta que vuele.',
      level: 4, hours: 25,
      skills: ['PWM de 20 kHz con Timer1 y TOP en ICR1', 'Calibración y fusión de varios sensores', 'Control PID en un bucle de tiempo fijo', 'Registrar datos para ajustar con método'],
      bom: ['Chasis de 2 ruedas con motores de 6 V (N20 o TT) y rueda loca', 'Driver TB6612FNG', 'Barra de 5 a 8 sensores reflectivos IR analógicos (TCRT5000 o QTR-8A)', 'Arduino Nano', 'Batería: 6 pilas AA recargables (7,2 V) o 2 celdas Li-ion con placa de protección y su cargador', 'Regulador de 5 V si la placa no lo lleva', 'Interruptor, pulsador de arranque y cinta aislante negra sobre cartulina blanca para la pista'],
      phases: [
        { title: 'Fase 1 · Motores a 20 kHz', steps: ['TB6612FNG: PWMA y PWMB a D9 y D10 (OC1A y OC1B); AIN1, AIN2, BIN1 y BIN2 a cuatro pines digitales; STBY a 5 V; VM a la batería; masa común.', 'Carga motoresInit(): 20 kHz, fuera del rango audible, sin el pitido de los 490 Hz de analogWrite.', 'Prueba velocidades de 0 a 799 en los dos sentidos y anota la mínima a la que arranca cada motor.', 'Seguridad con Li-ion: placa de protección, nunca cortocircuitar, cargar con su cargador y no dejarlas cargando sin vigilancia.'], checks: ['Los motores giran en los dos sentidos sin pitido audible', 'He anotado el PWM mínimo de arranque de cada motor', 'La placa no se reinicia al arrancar los motores'],
          code: `void motoresInit() {
  DDRB  |= (1 << PB1) | (1 << PB2);                       // OC1A (D9) y OC1B (D10)
  TCCR1A = (1 << COM1A1) | (1 << COM1B1) | (1 << WGM11);
  TCCR1B = (1 << WGM13) | (1 << WGM12) | (1 << CS10);     // modo 14, sin prescaler
  ICR1   = 799;                                            // 16 MHz / 800 = 20 kHz
  OCR1A  = 0;                                              // 0..799 = 0..100 %
  OCR1B  = 0;
}` },
        { title: 'Fase 2 · Sensores calibrados', steps: ['Conecta los sensores a A0–A5 (y A6–A7 en la Nano).', 'Rutina de calibración: el robot gira sobre sí mismo 3 s y guarda el mínimo y el máximo de cada sensor.', 'Normaliza cada lectura a 0–1000 con su mínimo y máximo.', 'Guarda la calibración en la EEPROM para no repetirla cada vez.'], checks: ['Todos los sensores dan cerca de 0 en blanco y cerca de 1000 en negro', 'La calibración sobrevive a un apagado', 'Leer todos los sensores tarda menos de 1 ms'] },
        { title: 'Fase 3 · ¿Dónde está la línea?', steps: ['Calcula la posición como media ponderada: suma de (lectura × posición del sensor) / suma de lecturas, de −2000 a +2000.', 'Si ningún sensor ve la línea, recuerda hacia qué lado se perdió y devuelve el extremo.', 'Envía la posición por Serial mientras mueves el robot a mano sobre la línea.', 'Comprueba que la posición varía de forma suave, sin saltos.'], checks: ['La posición recorre de −2000 a +2000 de forma continua', 'Al perder la línea devuelve el extremo correcto', 'He representado la posición con el trazador serie'] },
        { title: 'Fase 4 · Control a ritmo fijo', steps: ['Timer2 en CTC a 200 Hz pone una bandera volatile; loop() ejecuta el control solo cuando la ve.', 'Empieza solo con P (KD = 0, KI = 0) y velocidad baja: sube KP hasta que oscile y deja la mitad.', 'Añade D hasta que deje de oscilar en las curvas.', 'Mide con un pin de traza que el control nunca tarda más de 5 ms.'], checks: ['Sigue un óvalo a velocidad baja sin salirse', 'El control se ejecuta exactamente a 200 Hz', 'He anotado los valores de KP y KD de cada prueba'],
          code: `// Se ejecuta 200 veces por segundo, cuando la ISR del Timer2 pone la bandera
float KP = 0.08, KD = 1.2, KI = 0.0;          // punto de partida: ajústalos en la pista
float integral = 0, errorPrevio = 0;

void controlar(int16_t posicion) {            // −2000..+2000; 0 = línea centrada
  float e = posicion;
  integral = constrain(integral + e, -5000, 5000);   // anti-windup sencillo
  float d = e - errorPrevio;
  errorPrevio = e;
  float u = KP * e + KI * integral + KD * d;
  int16_t base = 450;                         // velocidad de crucero (de 799)
  OCR1A = constrain(base + (int16_t)u, 0, 799);
  OCR1B = constrain(base - (int16_t)u, 0, 799);
}` },
        { title: 'Fase 5 · Ajuste fino con datos', steps: ['Registra en un búfer circular la posición y la salida de cada ciclo y vuélcalo por Serial al acabar la vuelta (o envíalo por un módulo Bluetooth HC-05).', 'Representa los datos y ajusta: menos sobreoscilación, error medio menor.', 'Añade I solo si en curvas largas se queda siempre a un lado.', 'Velocidad variable: más rápido en recta (error pequeño) y más lento en curva.'], checks: ['Tengo gráficas de al menos 3 ajustes distintos', 'El error medio en una vuelta baja al menos un 30 % respecto a la fase 4', 'El robot completa la pista a más velocidad que en la fase 4'] },
        { title: 'Fase 6 · Competición', steps: ['Construye una pista con curvas cerradas, una S y un cruce.', 'Cronometra 5 vueltas y anota la media y la mejor.', 'Pasa todo el control a enteros (posición y ganancias escaladas ×256) y comprueba si el bucle va más rápido.', 'Documenta el robot: esquema, ganancias finales y tiempos.'], checks: ['Completa 5 vueltas seguidas sin salirse', 'He comparado control con float y con enteros', 'La documentación está completa'] }
      ],
      extra: ['Añade encoders a las ruedas leídos con PCINT y cierra un PID de velocidad por rueda.', 'Detecta las marcas laterales de la pista para contar vueltas.']
    },

    av_final: {
      intro: 'El proyecto final: un laboratorio de bolsillo en tu propia PCB con un ATmega328P. Osciloscopio, frecuencímetro, generador de señales y sonda lógica en un instrumento que usarás en tu mesa durante años. Integra todo lo de la especialidad.',
      level: 5, hours: 60,
      skills: ['Especificar un producto y repartir patas y temporizadores', 'Integrar módulos en un firmware con planificador cooperativo', 'Diseñar, fabricar y poner en marcha una PCB con microcontrolador', 'Firmware profesional: Makefile, EEPROM con CRC, watchdog y bajo consumo', 'Validar un instrumento contra referencias'],
      bom: ['ATmega328P (DIP-28 con zócalo, o TQFP-32 si ya sueldas SMD)', 'Cristal de 16 MHz y 2 × 22 pF', 'Pantalla OLED SSD1306 128×64 SPI (o TFT ST7735 SPI)', 'Codificador rotatorio con pulsador y 2 pulsadores', 'MCP6002 para la entrada del osciloscopio, 74HC14 para la del frecuencímetro', 'Conector USB-C o micro-USB solo para 5 V, y conector de 6 patas para el adaptador USB-serie', 'Conector ISP de 2 × 3', 'Bornas o conectores para las sondas', 'Condensadores de 100 nF, 10 µF, resistencias variadas, diodos BAT85', 'PCB de dos capas fabricada (KiCad + fabricante)', 'Caja impresa en 3D o de plástico'],
      phases: [
        { title: 'Fase 1 · Especificación y presupuesto de recursos', steps: ['Escribe una tabla de requisitos con números: rango del osciloscopio (−5 a +10 V, 75 kS/s), rango del frecuencímetro (1 Hz a 5 MHz), frecuencias del generador (1 Hz a 100 kHz cuadrada; seno por DDS hasta 2 kHz), autonomía o alimentación.', 'Reparte los temporizadores: Timer0 para el tic del sistema (1 ms), Timer1 para captura y conteo (ICP1 en PB0, T1 en PD5), Timer2 para el generador (OC2B en PD3, porque OC2A es MOSI).', 'Reparte las 23 patas: SPI de la pantalla (PB2, PB3, PB5, más DC y RESET), ADC0 para el osciloscopio, PCINT para el codificador, USART para el PC… y comprueba que no hay choques.', 'Calcula la SRAM: búfer de 512 muestras, pantalla en modo de páginas, pila. Debe sobrar al menos un 20 %.'], checks: ['Tabla de requisitos con números y criterio de aceptación por cada uno', 'Tabla de patas y de temporizadores sin conflictos', 'Presupuesto de SRAM con al menos 20 % libre'],
          code: `/* Reparto de recursos (ejemplo: adáptalo a tu diseño)
   Timer0  tic de 1 ms (ISR de comparación A)       -> planificador
   Timer1  ICP1 = PB0 (D8)  captura de periodo       -> frecuencímetro (bajas)
           T1   = PD5 (D5)  reloj externo            -> frecuencímetro (altas)
   Timer2  OC2B = PD3 (D3)  CTC/PWM                  -> generador
   ADC0    PC0 (A0)         modo continuo             -> osciloscopio
   SPI     PB3 MOSI, PB5 SCK, PB2 CS; PB1 DC; PD4 RST -> pantalla
   PCINT2  PD6, PD7         codificador; PD2 (INT0)  -> pulsador (despertar)
   USART   PD0 RX, PD1 TX                             -> PC
   Libres: PB4 (MISO), PC1..PC5, PD... -> sonda lógica, LED de estado */` },
        { title: 'Fase 2 · Prototipo integrado en protoboard', steps: ['Reutiliza el código del frecuencímetro y del osciloscopio como módulos (.c y .h separados).', 'Escribe un planificador cooperativo: cada tarea es corta, no bloquea y se ejecuta cada cierto número de milisegundos.', 'Menú en la pantalla con el codificador: modo, escala y disparo.', 'Comprueba que cada módulo funciona igual que por separado cuando están todos activos.'], checks: ['Los cuatro modos funcionan en la protoboard', 'Ninguna tarea bloquea más de 5 ms (medido con pin de traza)', 'El código está dividido en módulos con sus cabeceras'],
          code: `// Planificador cooperativo: cada tarea es corta y nunca bloquea
#include <util/atomic.h>
#include <avr/wdt.h>

typedef struct { void (*fn)(void); uint16_t cada_ms; uint16_t ultimo; } Tarea;
static Tarea tareas[] = {
  { leerCodificador,   2, 0 },
  { medirFrecuencia, 100, 0 },
  { pintarPantalla,   40, 0 },
  { guardarAjustes, 1000, 0 },
};
volatile uint16_t ticks;            // lo incrementa la ISR del Timer0 cada 1 ms

void planificador(void) {
  for (;;) {
    uint16_t ahora;
    ATOMIC_BLOCK(ATOMIC_RESTORESTATE) { ahora = ticks; }
    for (uint8_t i = 0; i < sizeof tareas / sizeof tareas[0]; i++) {
      if ((uint16_t)(ahora - tareas[i].ultimo) >= tareas[i].cada_ms) {
        tareas[i].ultimo = ahora;
        tareas[i].fn();
      }
    }
    wdt_reset();                    // si una tarea se cuelga, el watchdog reinicia
  }
}` },
        { title: 'Fase 3 · Esquema y PCB', steps: ['Dibuja el esquema en KiCad por bloques: alimentación, microcontrolador, entrada analógica, entrada digital, generador, interfaz.', 'Reglas de PCB: desacoplo pegado a cada pata de alimentación, cristal y sus condensadores a menos de 5 mm, plano de masa continuo, zona analógica separada de la digital, AVCC con su filtro.', 'Incluye el conector ISP, el de USB-serie con DTR → 100 nF → RESET, puntos de prueba de 5 V y GND, y un LED de estado.', 'Pasa el DRC, revisa las huellas imprimiendo la placa a escala 1:1 y apoyando los componentes encima, y encarga la fabricación.'], checks: ['Esquema revisado por bloques contra el prototipo', 'DRC sin errores y huellas comprobadas a escala 1:1', 'Gerbers enviados al fabricante'] },
        { title: 'Fase 4 · Puesta en marcha', steps: ['Suelda primero solo la alimentación y mide: 5 V donde toca y nada en cortocircuito.', 'Suelda el microcontrolador, el cristal y el ISP. Lee la firma con avrdude y graba los fusibles (low 0xFF, high 0xDE, extended 0xFD o el BOD que elijas) y Optiboot.', 'Carga un parpadeo en el LED de estado y un eco por la USART.', 'Suelda el resto por bloques, probando cada uno antes de seguir.'], checks: ['Firma leída y fusibles grabados y verificados', 'Cada bloque probado por separado', 'He anotado y corregido (con puentes o cortes) cualquier fallo de la placa'] },
        { title: 'Fase 5 · Firmware profesional', steps: ['Compila sin el IDE con un Makefile: make, make flash, make lst.', 'Ajustes y calibraciones en una estructura en la EEPROM con versión y CRC-8 o CRC-16; si el CRC falla, carga valores por defecto.', 'Apagado automático: tras 5 min sin tocar nada, apaga pantalla y periféricos y duerme en power-down; despierta con INT0 por nivel bajo desde el pulsador.', 'Revisa el .map: ninguna tabla grande en SRAM. Revisa el .lst de las ISR críticas.', 'Lee MCUSR al arrancar y muestra en pantalla si el último reinicio fue por watchdog o por baja tensión.'], checks: ['make flash graba la placa sin abrir el IDE', 'Una EEPROM corrupta (cámbiale un byte) se detecta y se recupera', 'Dormido consume menos de 1 mA (con la pantalla apagada)', 'La pantalla informa de la causa del último reinicio'],
          code: `MCU     = atmega328p
F_CPU   = 16000000UL
PUERTO  = COM5
CFLAGS  = -mmcu=$(MCU) -DF_CPU=$(F_CPU) -Os -Wall -std=gnu11 -ffunction-sections -fdata-sections
LDFLAGS = -mmcu=$(MCU) -Wl,--gc-sections -Wl,-Map=main.map
OBJ     = main.o pantalla.o osciloscopio.o frecuencimetro.o generador.o ajustes.o

main.hex: main.elf
\tavr-objcopy -O ihex -R .eeprom main.elf main.hex
\tavr-size main.elf

main.elf: $(OBJ)
\tavr-gcc $(LDFLAGS) -o $@ $^

%.o: %.c
\tavr-gcc $(CFLAGS) -c $< -o $@

lst: main.elf
\tavr-objdump -d -S main.elf > main.lst

flash: main.hex
\tavrdude -c arduino -p m328p -P $(PUERTO) -b 115200 -U flash:w:main.hex:i

clean:
\trm -f *.o main.elf main.hex main.map main.lst` },
        { title: 'Fase 6 · Validación y documentación', steps: ['Mide cada requisito de la fase 1 contra una referencia (multímetro, otro osciloscopio, la salida 1 PPS de un GPS) y rellena una tabla con el resultado y el error.', 'Corrige o recalibra lo que no cumpla y repite la medida.', 'Pon la placa en su caja con etiquetas de entradas y rangos.', 'Escribe un manual de dos páginas y un registro de cambios del firmware, y publica (si quieres) el diseño bajo una licencia abierta.'], checks: ['Tabla de validación completa con todos los requisitos medidos', 'Al menos el 90 % de los requisitos se cumplen con su tolerancia', 'Instrumento en caja con manual y registro de cambios'] }
      ],
      extra: ['Añade un modo de registro de datos con marca de tiempo enviado al PC.', 'Haz una segunda versión de la PCB con todo en SMD y un cargador de Li-ion dedicado con protección.']
    }
  });

  /* ===================== PARÁMETROS DE LAS VISUALIZACIONES ===================== */
  const pN = (val = 64) => ({ label: 'Prescaler', val, list: [1, 8, 64, 256, 1024], dec: 0 });
  const pOcr = (val = 249) => ({ label: 'OCR0A', val, min: 1, max: 255, step: 1, dec: 0 });
  const pwmP = (mode, top = 255, ocr = 127, N = 64) => ({ N: pN(N), top: { label: 'TOP', val: top, min: 15, max: 1023, step: 1, dec: 0 }, ocr: { label: 'OCR', val: ocr, min: 0, max: 1023, step: 1, dec: 0 }, mode: { val: mode, fixed: true } });
  const uartP = (baud = 9600, u2x = 0, fixedBaud = false, data = 65) => ({ data: { label: 'Byte', val: data, min: 0, max: 255, step: 1, dec: 0 }, baud: fixedBaud ? { val: baud, fixed: true } : { label: 'Baudios', val: baud, list: [2400, 9600, 19200, 31250, 38400, 57600, 115200, 250000], dec: 0 }, u2x: { label: 'U2X0', val: u2x, list: [0, 1], dec: 0 } });
  const bitsP = (op, v = 47, fixedV = false, bit = 5) => ({ v: fixedV ? { val: v, fixed: true } : { label: 'Registro', val: v, min: 0, max: 255, step: 1, dec: 0 }, bit: { label: 'Bit', val: bit, min: 0, max: 7, step: 1, dec: 0 }, op: { val: op, fixed: true } });
  const adcP = (ps = 8, ob = 0, fixedPs = false, fixedOb = true) => ({ ps: fixedPs ? { val: ps, fixed: true } : { label: 'Prescaler del ADC', val: ps, list: [2, 4, 8, 16, 32, 64, 128], dec: 0 }, ob: fixedOb ? { val: ob, fixed: true } : { label: 'Bits extra', val: ob, min: 0, max: 3, step: 1, dec: 0 } });
  const sleepP = (fixedCap = null) => ({ ia: { label: 'Despierto', val: 10, min: 1, max: 20, step: 1, unit: 'mA', dec: 0 }, ta: { label: 'Tiempo despierto', val: 50, min: 1, max: 200, step: 1, unit: 'ms', dec: 0 }, T: { label: 'Despierta cada', val: 10, min: 1, max: 600, step: 1, unit: 's', dec: 0 }, is: { label: 'Dormido', val: 1000, list: [0.1, 1, 5, 20, 100, 1000, 25000], unit: 'µA', dec: 1 }, cap: fixedCap ? { val: fixedCap, fixed: true } : { label: 'Pila', val: 220, list: [220, 1000, 2500], unit: 'mAh', dec: 0 } });

  /* ===================== LA ESPECIALIDAD ===================== */
  TRACKS.push({
    id: 'avr',
    title: 'Arduino y AVR a fondo',
    short: 'AVR',
    desc: 'El ATmega328P registro a registro: temporizadores, interrupciones, periféricos, bajo consumo y el chip suelto en tu propia placa.',
    color: '#13A3A0',
    icon: 'chip',
    level: 'Intermedio → avanzado',
    units: [

{ id: 'av-m1', title: 'Dentro del ATmega328P', desc: 'Núcleo AVR, reloj, memorias, pila y el mapa de patas que hay detrás de cada pin de Arduino.', nodes: [
 L('av1', 'Arquitectura Harvard y núcleo AVR', 'chip', ['av_core'], [
  I('El cerebro de la Uno y la Nano es el <b>ATmega328P</b>, un microcontrolador AVR de <b>8 bits</b>: CPU, memorias, temporizadores, conversor A/D y comunicaciones en un solo chip.\n“8 bits” significa que la CPU suma, compara y mueve datos de byte en byte.'),
  I('<b>Arquitectura Harvard</b>: el programa (en la Flash) y los datos (en la SRAM) viajan por buses separados. Mientras la CPU ejecuta una instrucción, ya está trayendo la siguiente. Por eso casi todas tardan <b>un solo ciclo</b> de reloj.'),
  Q('¿Qué ventaja da tener buses separados para programa y datos?', ['Traer la siguiente instrucción mientras se ejecuta la actual', 'Tener más memoria RAM', 'Que la Flash no se borre al apagar', 'Gastar menos en reposo'], 'Es una tubería de dos etapas: leer y ejecutar a la vez.'),
  I('El núcleo tiene <b>32 registros de trabajo</b>, de R0 a R31: la “mesa” donde la ALU hace las cuentas. Para sumar dos variables de la SRAM, primero se cargan en registros, se operan y el resultado se guarda.\nLos seis últimos se usan por parejas como punteros: X (R27:R26), Y (R29:R28) y Z (R31:R30).'),
  Q('¿Cuántos registros de trabajo tiene un AVR como el 328P?', ['32', '8', '16', '256'], 'R0 a R31.'),
  Q('Una variable int (16 bits) en un AVR de 8 bits…', ['Ocupa dos registros y sumarla lleva dos instrucciones', 'Cabe en un registro', 'No se puede usar', 'Se guarda siempre en la EEPROM'], 'add para el byte bajo y adc (con acarreo) para el alto.'),
  I('<b>RISC</b> significa juego de instrucciones reducido: unas 130 instrucciones sencillas y rápidas. avr-gcc traduce tu C (o el C++ de Arduino) a esas instrucciones.\nEl registro <b>SREG</b> guarda las banderas del último resultado: C (acarreo), Z (cero), N (negativo), V (desbordamiento), S (signo), H (medio acarreo), T y el bit <b>I</b>, que permite las interrupciones.'),
  { t: 'match', q: 'Une cada parte del chip con su papel.', pairs: [['ALU', 'Hace sumas, restas y operaciones lógicas'], ['R0–R31', 'Operandos inmediatos de la ALU'], ['Flash', 'Guarda el programa'], ['SREG', 'Banderas y permiso de interrupciones']] },
  Q('¿Qué valor queda en a y qué bandera se activa?', ['a vale 44 y se activa el acarreo (C)', 'a vale 300', 'a vale 255 y se para', 'a vale 0 y se activa Z'], '300 no cabe en 8 bits: 300 − 256 = 44 y el bit que sobra va a C.', { code: 'uint8_t a = 200;\na = a + 100;' }),
  { t: 'order', q: 'Ordena lo que hace la CPU para x = x + 1 si x está en la SRAM.', items: ['Cargar x en un registro (lds)', 'Sumar 1 en la ALU', 'Guardar el registro en la SRAM (sts)'], e: 'Arquitectura de carga y almacenamiento: la ALU solo trabaja sobre registros.' },
  Q('¿Qué bit de SREG debe estar a 1 para que pueda saltar cualquier interrupción?', ['I', 'C', 'Z', 'T'], 'Es el permiso global: sei() lo pone a 1 y cli() a 0.', { c: 'av_isr' })
 ]),
 L('av2', 'Reloj, ciclos y tiempo', 'timer', ['av_core'], [
  I('El reloj marca el ritmo. En una Uno va a 16 MHz: cada ciclo dura 1 / 16 000 000 s = <b>62,5 ns</b>. La mayoría de instrucciones tarda 1 ciclo; los saltos y los accesos a memoria, de 2 a 4.'),
  Nm('¿Cuántos ns dura un ciclo a 8 MHz?', 125, 'ns', '1 / 8 000 000 s = 125 ns.'),
  I('Fuentes de reloj del 328P:\n· <b>Cristal</b> externo: preciso (errores de decenas de ppm).\n· <b>Resonador cerámico</b>: más barato, del orden del 0,5 %. La Uno R3 usa uno para el ATmega328P.\n· <b>RC interno de 8 MHz</b>: sin componentes, pero de fábrica solo garantiza ±10 % (calibrable con OSCCAL hasta ±1 %).\n· Un oscilador de 128 kHz para el watchdog.'),
  Q('Un reloj con un error del 0,5 % adelanta en un día…', ['Unos 7 minutos', 'Unos 7 segundos', 'Medio segundo', 'Nada apreciable'], '86 400 s × 0,005 = 432 s ≈ 7,2 min.'),
  Q('Quieres un reloj de pared que no se desvíe minutos al mes. ¿Qué reloj usas?', ['Un cristal, o mejor un RTC con cristal de 32 768 Hz compensado', 'El RC interno', 'El oscilador del watchdog', 'Da igual'], 'Solo el cristal llega a segundos al mes.'),
  I('<b>Grados de velocidad</b>: la frecuencia máxima depende de la tensión. El 328P admite hasta 20 MHz entre 4,5 y 5,5 V, hasta 10 MHz desde 2,7 V y hasta 4 MHz desde 1,8 V (entre medias, la hoja de datos da una recta).'),
  Q('Alimentas el chip a 3,3 V. ¿Lo pones a 16 MHz?', ['No: fuera de especificación; por eso las placas de 3,3 V van a 8 MHz', 'Sí, sin problema', 'Sí, pero solo con cristal', 'No: a 3,3 V solo va a 1 MHz'], 'A 3,3 V la recta da unos 13 MHz como máximo.'),
  I('El fusible <b>CKDIV8</b> divide el reloj entre 8 al arrancar: un chip nuevo sale con el RC interno de 8 MHz dividido, es decir, a <b>1 MHz</b>. En marcha puedes cambiar el divisor con el registro <b>CLKPR</b> mediante una secuencia temporizada.'),
  G('av_cycles'), G('av_cycles'),
  Nm('Un bucle de 1000 vueltas de 4 ciclos cada una. ¿Cuánto tarda a 16 MHz, en µs?', 250, 'µs', '4000 ciclos × 62,5 ns = 250 µs.'),
  Q('Cambias F_CPU en el código pero el cristal sigue siendo de 16 MHz. ¿Qué pasa?', ['delay(), millis() y los baudios calculan con un reloj que no es el real: todo sale con otra velocidad', 'Nada', 'El chip cambia de frecuencia', 'Se borra el bootloader'], 'F_CPU solo informa al compilador; no cambia el hardware.')
 ]),
 L('av3', 'Las tres memorias', 'memory', ['av_mem'], [
  I('<b>Flash, 32 KB</b>: el programa y las constantes. No se borra al apagar; se reescribe por páginas y aguanta unos 10 000 ciclos de borrado. En la Uno, el bootloader ocupa 0,5 KB al final.'),
  I('<b>SRAM, 2 KB</b>: variables, pila y montón. Rápida, pero se pierde al apagar. Son solo <b>2048 bytes</b>: es la memoria que se acaba primero.'),
  I('<b>EEPROM, 1 KB</b>: datos que deben sobrevivir al apagado, como ajustes o calibraciones. Unos 100 000 ciclos de escritura por celda y unos 3,3 ms por byte escrito.'),
  { t: 'match', q: 'Une cada memoria con su uso.', pairs: [['Flash', 'Programa y constantes'], ['SRAM', 'Variables, pila y montón'], ['EEPROM', 'Ajustes que sobreviven al apagado'], ['R0–R31', 'Operandos de la ALU']] },
  Q('Tu proyecto imprime muchos mensajes de texto distintos. ¿Qué memoria se agotará antes?', ['La SRAM: cada cadena literal se copia a la RAM al arrancar', 'La Flash', 'La EEPROM', 'Ninguna'], 'Las cadenas están en Flash, pero el arranque las copia a .data.'),
  I('El espacio de datos del 328P:\n· 0x0000–0x001F: los 32 registros.\n· 0x0020–0x005F: 64 registros de E/S (puertos, por ejemplo).\n· 0x0060–0x00FF: E/S extendida (temporizadores, ADC…).\n· <b>0x0100–0x08FF: la SRAM</b>.'),
  Nm('¿Cuántos bytes hay de 0x0100 a 0x08FF, ambos incluidos?', 2048, 'bytes', '0x08FF − 0x0100 + 1 = 0x0800 = 2048.'),
  I('Harvard “modificada”: las constantes de la Flash no se leen con un acceso normal, sino con la instrucción LPM. En C se marcan con <b>PROGMEM</b> y se leen con <b>pgm_read_byte()</b>. En Arduino, <b>F("texto")</b> deja una cadena en la Flash.'),
  Q('¿Qué falla en este código?', ['tabla[i] lee de la SRAM, no de la Flash: hay que usar pgm_read_byte(&tabla[i])', 'Nada', 'No compila', 'La tabla ocupa SRAM igualmente'], 'Con PROGMEM, la dirección es de Flash; leerla como RAM da basura.', { code: 'const uint8_t tabla[256] PROGMEM = { /* ... */ };\nuint8_t x = tabla[i];' }),
  Q('Serial.println(F("Hola, mundo")) frente a Serial.println("Hola, mundo")…', ['Ahorra 12 bytes de SRAM (11 caracteres y el 0 final)', 'Ahorra 12 bytes de Flash', 'Imprime más rápido', 'No cambia nada'], 'La cadena se queda solo en la Flash.'),
  G('av_eeLife')
 ]),
 L('av4', 'Pila, montón y variables', 'memory', ['av_mem'], [
  I('Al arrancar, el código de inicio copia las variables globales con valor inicial (<b>.data</b>) de la Flash a la SRAM y pone a cero las demás (<b>.bss</b>). El IDE suma las dos cuando te dice “las variables globales usan…”.'),
  I('La <b>pila</b> empieza al final de la SRAM (RAMEND = 0x08FF) y crece hacia abajo. Cada llamada a función guarda la dirección de retorno (2 bytes), registros y variables locales. El registro <b>SP</b> apunta a su cima.'),
  I('El <b>montón</b> (heap) crece hacia arriba desde el final de .bss: ahí reservan malloc, new y la clase String. Si la pila y el montón se encuentran, se pisan los datos: cuelgues y reinicios “misteriosos”.'),
  { t: 'order', q: 'Ordena la SRAM de las direcciones bajas a las altas.', items: ['.data (globales con valor inicial)', '.bss (globales a cero)', 'Montón (crece hacia arriba)', 'Espacio libre', 'Pila (crece hacia abajo desde 0x08FF)'], e: 'Montón y pila crecen el uno hacia el otro.' },
  Q('Una función recursiva sin fin en un AVR…', ['Agota la pila, pisa el montón y las globales y acaba colgándose o reiniciándose', 'Lanza una excepción que puedes capturar', 'El compilador la detiene', 'Se queda esperando'], 'No hay protección de memoria: nadie avisa.'),
  Q('¿Por qué evitar String en un programa que funciona meses sin parar?', ['Reserva y libera memoria del montón y lo fragmenta hasta que no cabe nada', 'Es lenta', 'Ocupa mucha Flash', 'No se puede imprimir'], 'Con 2 KB, la fragmentación se nota pronto.'),
  Q('procesar() llama a filtrar() y ambas declaran un array local de 300 bytes. ¿Cuánta pila usan a la vez?', ['Más de 600 bytes: casi un tercio de la SRAM', '300 bytes', 'Nada: van a la Flash', '0: se liberan al salir'], 'Las locales de las dos funciones conviven mientras filtrar() está en marcha.'),
  Q('¿Qué hace static en una variable local?', ['La guarda con las globales: conserva su valor entre llamadas y no ocupa pila', 'La mete en la pila', 'La guarda en la EEPROM', 'La pone a 0 en cada llamada'], 'static uint8_t n = 0; se inicializa una sola vez.', { code: 'void contar() {\n  static uint8_t n = 0;\n  n++;\n}' }),
  I('Truco: una variable local recién creada vive en la cima de la pila. Si restas a su dirección el final del montón, sabes cuánta RAM queda libre. Lo harás en el proyecto “cazador de RAM”.'),
  Nm('El IDE dice que las variables globales usan 1536 bytes. ¿Cuántos quedan para pila y montón?', 512, 'bytes', '2048 − 1536.')
 ]),
 L('av5', 'Patillaje y mapa de pines', 'ic', ['av_ports'], [
  I('El 328P en DIP-28 reparte sus E/S en tres <b>puertos</b>: B (PB0–PB7), C (PC0–PC6) y D (PD0–PD7). En un Arduino, PB6 y PB7 son el cristal y PC6 es RESET.'),
  I('El mapa de la Uno y la Nano:\n· <b>D0–D7 = PD0–PD7</b>\n· <b>D8–D13 = PB0–PB5</b>\n· <b>A0–A5 = PC0–PC5</b>\nAsí, el LED de la placa, D13, es el <b>bit 5 del puerto B</b>.'),
  { t: 'pin', q: '¿Qué pin de la Uno es PB0?', a: 'D8', e: 'Puerto B empieza en D8.', c: 'av_ports' },
  { t: 'pin', q: '¿Y PD3?', a: 'D3', e: 'En el puerto D coincide el número.', c: 'av_ports' },
  { t: 'pin', q: '¿Y PC2?', a: 'A2', e: 'El puerto C son las entradas analógicas.', c: 'av_ports' },
  G('av_pinMap'), G('av_pinMap'),
  I('Cada pata tiene funciones alternativas: PD0 y PD1 son RX y TX de la USART; PB3, PB4 y PB5 son MOSI, MISO y SCK del SPI (y del ISP); PC4 y PC5 son SDA y SCL; PB1, PB2, PB3, PD3, PD5 y PD6 son las salidas de los temporizadores: los pines ~ de PWM.'),
  { t: 'match', q: 'Une cada grupo de patas con su función alternativa.', pairs: [['PD0 y PD1', 'USART (RX y TX)'], ['PB3, PB4 y PB5', 'SPI e ISP'], ['PC4 y PC5', 'I²C (SDA y SCL)'], ['PB6 y PB7', 'Cristal (XTAL1 y XTAL2)']] },
  Q('¿Para qué sirve la pata AVCC (20)?', ['Alimenta el conversor A/D y el puerto C: conéctala a VCC aunque no uses el ADC', 'Es opcional', 'Es una entrada analógica más', 'Es la referencia externa'], 'Sin AVCC, el puerto C no funciona bien.'),
  Q('¿Por qué A6 y A7 de la Nano no sirven como pines digitales?', ['Son ADC6 y ADC7 del encapsulado TQFP: solo entrada analógica, sin puerto digital', 'Están reservados para el USB', 'Son de 3,3 V', 'Son salidas PWM'], 'El DIP-28 de la Uno ni siquiera los tiene.')
 ]),
 SIM('av-s1', 'Reto: encuentra PB5 en la Nano', 'La Nano ejecuta el parpadeo de siempre: por dentro, digitalWrite(13, …) escribe el bit 5 de PORTB. Busca la pata PB5 en la Nano pinchada y pon ahí un LED con su resistencia hacia GND.', { arduino: 'blink', board: 'nano', parts: ['res', 'led'], code: true, hint: 'PB5 es D13: en la Nano está en la fila de arriba, en un extremo. Resistencia de 220–470 Ω en serie con el LED y el cátodo a GND.' }, 'av_pb5'),
 PRJ('av-p1', 'Proyecto: cazador de RAM', 'av_ram')
] },

{ id: 'av-m2', title: 'Puertos a golpe de registro', desc: 'DDR, PORT y PIN, operaciones de bits, entradas, velocidad, atomicidad y matrices.', nodes: [
 L('av6', 'DDRx, PORTx y PINx', 'code', ['av_ports'], [
  I('Cada puerto se controla con tres registros de 8 bits, un bit por pata:\n· <b>DDRx</b>: dirección (1 = salida, 0 = entrada).\n· <b>PORTx</b>: en una salida, el nivel; en una entrada, activa la pull-up.\n· <b>PINx</b>: lee el nivel real de las patas.'),
  Q('¿Qué hace este código?', ['Enciende el LED de D13: PB5 como salida y a 1', 'Lee el pin D13', 'Activa la pull-up de D13', 'Enciende el pin D5'], 'Bit 5 a 1 en DDRB y en PORTB.', { code: 'DDRB  = 0b00100000;\nPORTB = 0b00100000;' }),
  { t: 'bits', q: 'Escribe DDRD para que D5, D6 y D7 sean salidas y el resto entradas.', n: 8, target: 224, e: 'Bits 7, 6 y 5: 128 + 64 + 32 = 224 = 0xE0.', c: 'av_ports' },
  I('Escribir un byte entero cambia las ocho patas a la vez, en un ciclo. Con digitalWrite irías de una en una.'),
  { t: 'match', q: 'Une cada combinación de DDR y PORT con el estado de la pata.', pairs: [['DDR 0 · PORT 0', 'Entrada flotante'], ['DDR 0 · PORT 1', 'Entrada con pull-up'], ['DDR 1 · PORT 0', 'Salida a 0 V'], ['DDR 1 · PORT 1', 'Salida a 5 V']] },
  Q('¿Qué hace PORTD = 0xFF si DDRD = 0x00?', ['Activa las pull-ups de las ocho patas', 'Pone las ocho a 5 V como salidas', 'Nada', 'Las pone a 0'], 'En una entrada, PORT a 1 es pull-up.'),
  I('Truco del 328P: escribir un <b>1 en un bit de PINx conmuta</b> ese bit de PORTx. PINB = (1 &lt;&lt; PB5); hace parpadear D13 sin leer nada antes.'),
  Q('¿Qué hace este bucle?', ['D13 cambia de estado cada 500 ms: parpadea', 'D13 se queda encendido', 'Lee D13 cada 500 ms', 'No compila: PINB es de solo lectura'], 'Escribir 1 en PINx conmuta la salida.', { code: 'DDRB |= (1 << PB5);\nfor (;;) {\n  PINB = (1 << PB5);\n  _delay_ms(500);\n}' }),
  Q('¿Dónde lees si un pulsador en D8 está pulsado?', ['En PINB, bit 0', 'En PORTB, bit 0', 'En DDRB, bit 0', 'En PIND, bit 8'], 'D8 = PB0, y se lee en PIN.'),
  Nm('Quieres D8–D13 como salidas a la vez. ¿Qué valor decimal pones en DDRB?', 63, '', 'Bits 0 a 5: 0b00111111 = 63 = 0x3F.')
 ]),
 L('av7', 'Operaciones de bits', 'bin', ['av_bits'], [
  I('Para tocar un bit sin alterar los demás se usan <b>máscaras</b>:\n· Poner a 1: <b>REG |= máscara</b>\n· Poner a 0: <b>REG &amp;= ~máscara</b>\n· Conmutar: <b>REG ^= máscara</b>\n· Leer: <b>REG &amp; máscara</b> (distinto de 0 si está a 1)'),
  I('La máscara se construye desplazando un 1: (1 &lt;&lt; 5) = 0b00100000 = 0x20. Explora: cambia el registro y el bit.', { tune: { viz: 'av_bits', params: bitsP(1) } }),
  TU('PORTB vale 0x2F. Elige el bit que hay que poner a 0 para que quede en 0x0F.', 'av_bits', bitsP(2, 47, true, 0), { q: 'res', min: 15, max: 15, text: 'Objetivo: PORTB = 0x0F', hint: '0x2F − 0x0F = 0x20: el bit 5.' }, 'PORTB &= ~(1 << 5); apaga solo el bit 5.'),
  TU('PORTB vale 0x81. Conmuta un bit para que pase a 0x83.', 'av_bits', bitsP(3, 129, true, 0), { q: 'res', min: 131, max: 131, text: 'Objetivo: PORTB = 0x83', hint: 'La diferencia es 2 = 1 << 1.' }, 'XOR con (1 << 1).'),
  G('av_mask'), G('av_mask'), G('av_mask'),
  I('Nombres en vez de números: avr/io.h define PB5 = 5, WGM12 = 3… y la macro <b>_BV(n)</b> equivale a (1 &lt;&lt; n). Así, TCCR1B |= _BV(WGM12) | _BV(CS11); se lee igual que la hoja de datos.'),
  Q('¿Por qué PORTB = (1 << PB5); puede ser un error?', ['Pone a 0 todos los demás bits de PORTB: apaga otras salidas y pull-ups', 'Es más lento que |=', 'No hace nada', 'Siempre es correcto'], 'El = sustituye el byte entero.'),
  Q('¿Qué hace este if?', ['Nunca se cumple: == se evalúa antes que &, faltan paréntesis', 'Funciona bien', 'Lee el bit 0', 'Siempre se cumple'], 'Se evalúa como PIND & ((1 << PD2) == 0), es decir, PIND & 0.', { code: 'if (PIND & (1 << PD2) == 0) {\n  // pulsado\n}' }),
  { t: 'bits', q: 'Construye la máscara (1 << 3) | (1 << 0).', n: 8, target: 9, e: '8 + 1 = 9 = 0x09.', c: 'av_bits' }
 ]),
 L('av8', 'Entradas: pull-ups y lectura en paralelo', 'chip', ['av_ports'], [
  I('Una entrada CMOS sin conectar <b>flota</b>: capta ruido y se lee 0 o 1 al azar. La pull-up interna (de 20 a 50 kΩ) la sujeta a 1: DDRx a 0 y PORTx a 1.'),
  Q('Pulsador entre PD2 y GND con pull-up. Pulsado, el bit 2 de PIND vale…', ['0', '1', 'Depende del ruido', '2'], 'El pulsador lleva la pata a masa.'),
  I('Las entradas tienen <b>disparador Schmitt</b>. A 5 V, por debajo de 1,5 V (0,3·VCC) es un 0 seguro y por encima de 3 V (0,6·VCC), un 1 seguro. Entre medias hay histéresis: una señal lenta no hace temblar la lectura.'),
  Q('Llega una señal de 2,2 V a una entrada alimentada a 5 V. Se lee…', ['Puede leerse 0 o 1: está en la zona sin garantía', 'Siempre 1', 'Siempre 0', 'Nada: rompe la pata'], 'Ni por debajo de 1,5 V ni por encima de 3 V.'),
  I('Leer un byte de PINx da ocho entradas a la vez y en el mismo instante. Muy útil para codificadores rotatorios, teclados o buses paralelos.'),
  Q('Con pull-ups en PB0–PB3 y pulsadores a masa, ¿qué contiene teclas?', ['Un 1 por cada pulsador de PB0–PB3 que esté pulsado', 'El estado de PB4–PB7', 'Las pull-ups activadas', 'Pone PB0–PB3 a 0'], '~ invierte (pulsado = 1) y & 0x0F se queda con los cuatro bits bajos.', { code: 'uint8_t teclas = ~PINB & 0x0F;' }),
  I('Si la pull-up interna es demasiado débil (cables largos, entornos ruidosos), pon una externa de 4,7 a 10 kΩ. El bit <b>PUD</b> de MCUCR desactiva todas las pull-ups internas de golpe.'),
  Q('Escribes PORTB y en la instrucción siguiente lees PINB, pero no ves el cambio. ¿Por qué?', ['La entrada pasa por un sincronizador que tarda un ciclo: hace falta un nop entre medias', 'El puerto está roto', 'Falta la pull-up', 'PINB solo lee entradas'], 'La hoja de datos lo explica: la lectura llega un ciclo tarde.'),
  Q('Pulsador a 5 V con una pull-down externa de 10 kΩ a masa. Pulsado se lee…', ['1', '0', 'Flota', 'Nada'], 'Lógica directa: pulsado = 5 V.'),
  Nm('Pull-up interna de 35 kΩ a 5 V con el pulsador cerrado a masa. ¿Corriente, en µA?', 143, 'µA', '5 V / 35 kΩ ≈ 0,143 mA. Poca, pero en un aparato a pilas cuenta.', { tol: 2 })
 ]),
 L('av9', 'Velocidad y atomicidad', 'bolt', ['av_ports'], [
  I('digitalWrite() es cómodo, pero hace mucho: busca en tablas qué puerto y bit es el pin, apaga el PWM si lo hubiera, desactiva interrupciones y hace leer–modificar–escribir. Total: unos microsegundos, decenas de ciclos.'),
  I('PORTB |= (1 &lt;&lt; PB5); con una constante se compila a una sola instrucción, <b>sbi</b>: 2 ciclos, 125 ns. Decenas de veces más rápido.'),
  Q('¿Por qué digitalWrite() mira el temporizador del pin?', ['Para apagar el PWM de ese pin si estaba activo', 'Para medir el tiempo', 'Para ir más rápido', 'No lo mira'], 'Si no, analogWrite seguiría mandando sobre la pata.'),
  Nm('Un bucle conmuta D13 con sbi PINB (2 ciclos) y vuelve con rjmp (2 ciclos). ¿Frecuencia de la onda a 16 MHz, en MHz?', 2, 'MHz', 'Una conmutación cada 4 ciclos; un periodo son 8 ciclos: 16 / 8 = 2 MHz.'),
  I('<b>Atomicidad</b>: una operación es atómica si no puede quedar a medias. sbi y cbi lo son. Pero PORTB |= 0x21 (dos bits) se compila a in, ori, out: si una interrupción cambia PORTB entre la lectura y la escritura, su cambio se pierde.'),
  { t: 'order', q: 'Ordena cómo se pierde el cambio de una interrupción.', items: ['main() lee PORTB en un registro', 'Salta una interrupción que pone a 1 el bit 0 de PORTB', 'main() hace el OR sobre su copia vieja', 'main() escribe la copia: el bit 0 vuelve a 0'], e: 'Leer–modificar–escribir no es atómico.', c: 'av_isr' },
  Q('¿Cómo lo evitas?', ['Desactivando las interrupciones durante el leer–modificar–escribir, o usando sbi/cbi o PINx', 'Con delay()', 'Declarando PORTB volatile', 'Escribiendo más rápido'], 'Sección crítica corta o una instrucción atómica.', { c: 'av_isr' }),
  Q('¿Por qué PINB = (1 << PB5) es seguro aunque haya interrupciones?', ['Es una sola escritura: conmuta los bits a 1 y no lee nada antes', 'Porque es lento', 'Porque desactiva las interrupciones', 'No es seguro'], 'No hay copia vieja que pueda pisar nada.'),
  Q('TCCR1A |= (1 << COM1A1); ¿es atómico?', ['No: TCCR1A está en la E/S extendida (0x80), donde no llega sbi; se hace con lds, ori, sts', 'Sí, siempre', 'Sí, porque es un temporizador', 'Depende del prescaler'], 'sbi y cbi solo alcanzan las primeras 32 direcciones de E/S.', { c: 'av_tool' })
 ]),
 L('av10', 'Multiplexado y matrices', 'bus', ['av_ports'], [
  I('Con pocas patas puedes controlar muchas cosas si no las atiendes todas a la vez. Un teclado de 4 filas × 4 columnas se lee con 8 patas.'),
  I('<b>Escaneo</b>: pones una fila a 0 y las demás a 1; las columnas son entradas con pull-up. Si una columna lee 0, está pulsada la tecla de ese cruce. Repites con cada fila cientos de veces por segundo.'),
  Q('Con la fila 2 a 0, la columna 3 lee 0. ¿Qué tecla está pulsada?', ['La del cruce de la fila 2 y la columna 3', 'Todas las de la fila 2', 'Ninguna', 'Todas las de la columna 3'], 'Solo esa tecla une esa fila con esa columna.'),
  Q('Pulsas tres teclas en tres esquinas de un rectángulo y aparece una cuarta “fantasma”. ¿Solución?', ['Un diodo en serie con cada tecla', 'Más pull-ups', 'Escanear más deprisa', 'Usar menos teclas'], 'El diodo impide que la corriente vuelva por otro camino.'),
  I('Con displays y LEDs, el mismo truco: enciendes un dígito cada vez, tan deprisa que el ojo ve todos (persistencia de la visión). Con 4 dígitos y 1 ms por dígito, cada uno se refresca 250 veces por segundo.'),
  Nm('8 dígitos multiplexados, 2 ms por dígito. ¿Refresco de cada uno, en Hz?', 62.5, 'Hz', 'Un ciclo completo dura 16 ms: 1 / 0,016 = 62,5 Hz.'),
  Q('Cada dígito está encendido 1/4 del tiempo. ¿Qué pasa con el brillo?', ['El brillo medio baja a la cuarta parte: se compensa con más corriente de pico, dentro de los límites', 'No cambia', 'Sube', 'Se apaga'], 'El ojo promedia.'),
  Q('Dígito de cátodo común con 8 segmentos a 15 mA. ¿Su cátodo puede ir directo a una pata?', ['No: serían 120 mA; hace falta un transistor', 'Sí', 'Sí, con una resistencia', 'Solo a 3,3 V'], 'Una pata aguanta 40 mA como máximo absoluto.'),
  I('<b>Charlieplexing</b>: aprovecha que una pata puede estar a 1, a 0 o en alta impedancia (como entrada). Con n patas controlas n·(n − 1) LEDs, uno cada vez.'),
  Nm('Con 4 patas, ¿cuántos LEDs en charlieplexing?', 12, 'LEDs', '4 × 3 = 12.'),
  Q('En un display multiplexado ves segmentos tenues en el dígito equivocado. ¿Arreglo?', ['Apagar el dígito antes de cambiar los segmentos y encender el siguiente después', 'Más resistencia', 'Más tensión', 'Es inevitable'], 'Son “fantasmas” del instante en que conviven datos viejos y dígito nuevo.')
 ]),
 SIM('av-s2', 'Reto: el puerto B en fila', 'El programa del barrido usa D8–D12, es decir, PB0–PB4, y espera el pulsador en D2 (PD2) con pull-up. Monta los cinco LEDs en esas patas de la Nano, cada uno con su resistencia, y el pulsador a GND.', { arduino: 'coche', board: 'nano', parts: ['res', 'led', 'push'], code: true, hint: 'D8 a D12 están seguidas en la fila de abajo de la Nano. Cada LED con su resistencia a GND. Pulsador entre D2 y GND: mantenlo pulsado para que barra.' }, 'av_portb'),
 PRJ('av-p2', 'Proyecto: dado electrónico a registro', 'av_dice'),
 PRJ('av-p3', 'Proyecto: cerradura con teclado matricial', 'av_lock')
] },

{ id: 'av-m3', title: 'Temporizadores', desc: 'Timer0, Timer1 y Timer2: prescaler, CTC, Fast PWM, Phase Correct, Input Capture y lo que Arduino hace con ellos.', nodes: [
 L('av11', 'Anatomía de un temporizador', 'timer', ['av_timer'], [
  I('Un temporizador es un contador de hardware que avanza solo, sin gastar CPU. Su valor está en <b>TCNTn</b>. El 328P tiene tres: <b>Timer0</b> y <b>Timer2</b> de 8 bits (0–255) y <b>Timer1</b> de 16 bits (0–65 535).'),
  I('El <b>prescaler</b> divide el reloj antes de contar. Con los bits CSn2:0 eliges 1, 8, 64, 256 o 1024 (el Timer2 tiene además 32 y 128). Con prescaler 64 a 16 MHz, cada cuenta dura 4 µs.'),
  Nm('Prescaler 256 a 16 MHz: ¿cuánto dura una cuenta, en µs?', 16, 'µs', '256 / 16 MHz = 16 µs.'),
  I('En modo <b>normal</b> cuenta hasta el máximo y vuelve a 0: es el <b>desbordamiento</b>. Se activa la bandera TOVn (en TIFRn) y, si TOIEn está a 1 en TIMSKn, salta una interrupción.'),
  G('av_ovf'), G('av_ovf'),
  { t: 'match', q: 'Une cada registro con su papel.', pairs: [['TCNTn', 'El valor del contador'], ['TCCRnB', 'Prescaler (bits CS)'], ['TIMSKn', 'Qué interrupciones están activas'], ['TIFRn', 'Banderas de lo que ha pasado']] },
  Q('Timer1 a 16 MHz, sin prescaler, en modo normal. ¿Cada cuánto se desborda?', ['Cada 4,096 ms', 'Cada 16 µs', 'Cada segundo', 'Cada 65,5 s'], '65 536 × 62,5 ns.'),
  Q('Las banderas de TIFRn se borran…', ['Escribiendo un 1 en ellas, o solas al ejecutarse su ISR', 'Escribiendo un 0', 'Leyéndolas', 'Solas cada segundo'], 'Es una rareza de los AVR: un 1 borra.'),
  Q('¿Qué problema tiene esta línea?', ['Si hay otras banderas a 1, el OR las vuelve a escribir con 1 y las borra también: usa TIFR1 = (1 << TOV1)', 'Ninguno', 'No borra nada', 'Pone TOV1 a 1'], 'Leer–modificar–escribir en un registro de banderas es una trampa.', { code: 'TIFR1 |= (1 << TOV1);' }),
  Q('Timer0 y Timer1 comparten…', ['El mismo prescaler: reiniciarlo afecta a los dos', 'Las mismas patas', 'El mismo contador', 'Nada'], 'El Timer2 tiene su prescaler propio.')
 ]),
 L('av12', 'Modo CTC: frecuencias exactas', 'timer', ['av_timer'], [
  I('En <b>CTC</b> (Clear Timer on Compare) el contador vuelve a 0 al alcanzar OCRnA. Con OCRnA eliges el periodo exacto:\n<b>f = F_CPU / (N · (1 + OCRnA))</b>'),
  I('Explora: el contador (azul) sube hasta OCR0A y vuelve a 0. En cada coincidencia salta la interrupción y la patilla OC0A puede conmutar (naranja).', { tune: { viz: 'av_timer', params: { N: pN(64), ocr: pOcr(124) } } }),
  TU('Consigue interrupciones a 1 kHz exactos.', 'av_timer', { N: pN(8), ocr: pOcr(100) }, { q: 'f', min: 999.9, max: 1000.1, text: 'Objetivo: 1000 Hz', hint: 'Con prescaler 64 hacen falta 250 cuentas: OCR0A = 249.' }, '16 000 000 / (64 × 250) = 1000 Hz.'),
  TU('Ahora haz sonar un La de 440 Hz en la patilla (conmutando en cada coincidencia).', 'av_timer', { N: pN(64), ocr: pOcr(200) }, { q: 'fpin', min: 437, max: 443, text: 'Objetivo: 440 Hz en la patilla', hint: 'Con prescaler 64 no llega (haría falta OCR = 283). Prueba prescaler 256 y OCR0A cerca de 70.' }, 'Prescaler 256 y OCR0A = 70 dan 440,1 Hz.'),
  G('av_ctcOcr'), G('av_ctcOcr'),
  I('Timer1 en CTC para una interrupción por segundo:', { code: '// Timer1 en CTC: interrupción cada segundo exacto\nTCCR1A = 0;\nTCCR1B = (1 << WGM12) | (1 << CS12);   // modo 4, prescaler 256\nOCR1A  = 62499;                        // 16 MHz / 256 / 62 500 = 1 Hz\nTIMSK1 = (1 << OCIE1A);\n\nISR(TIMER1_COMPA_vect) { segundos++; }' }),
  Q('¿Por qué 62 499 y no 62 500?', ['El contador va de 0 a OCR1A incluido: son OCR1A + 1 cuentas', 'Por redondeo', 'Es un error', 'Para dejar margen'], 'Del 0 al 62 499 hay 62 500 cuentas.'),
  Q('¿Qué hace falta para que OC0A (D6) conmute sola en cada coincidencia?', ['COM0A1:0 = 01 en TCCR0A y PD6 como salida en DDRD', 'Escribir en PIND dentro de la ISR', 'Nada más', 'Activar TOIE0'], 'El hardware conmuta la pata sin código.'),
  Q('En CTC escribes en OCR1A un valor menor que el TCNT1 actual. ¿Qué pasa?', ['El contador sigue hasta 65 535, da la vuelta y vuelve a empezar: un periodo larguísimo', 'Se ajusta al instante', 'Se para', 'Se reinicia el chip'], 'En CTC, OCR1A no tiene doble búfer.')
 ]),
 L('av13', 'Fast PWM y Phase Correct', 'wave', ['av_pwm'], [
  I('En <b>Fast PWM</b> el contador sube de 0 a TOP y vuelve a 0. En modo no invertido, la salida se pone a 1 en 0 y a 0 al coincidir con OCRnx.\n<b>f = F_CPU / (N · (TOP + 1))</b>'),
  I('Explora el Fast PWM: cambia TOP, OCR y el prescaler.', { tune: { viz: 'av_pwm', params: pwmP(0) } }),
  I('En <b>Phase Correct</b> sube hasta TOP y vuelve a bajar: la onda es simétrica y la frecuencia, la mitad.\n<b>f = F_CPU / (2 · N · TOP)</b>\nMejor para motores y puentes H.', { tune: { viz: 'av_pwm', params: pwmP(1) } }),
  TU('Consigue un PWM de 20 kHz en Fast PWM: inaudible para un motor.', 'av_pwm', pwmP(0, 255, 400, 8), { q: 'f', min: 19800, max: 20200, text: 'Objetivo: 20 kHz ± 1 %', hint: 'Prescaler 1 y TOP = 799.' }, '16 000 000 / 800 = 20 000 Hz, con 800 niveles (algo más de 9 bits).'),
  G('av_pwmFreq'), G('av_pwmFreq'),
  Q('analogWrite en los pines 5 y 6 da unos 980 Hz y en el 9, unos 490 Hz. ¿Por qué?', ['Timer0 va en Fast PWM y Timer1 en Phase Correct, los dos con prescaler 64', 'El pin 9 es más lento', 'Es aleatorio', 'Por el cristal'], 'Phase Correct divide la frecuencia entre 2 (casi exactamente: 510 cuentas frente a 256).'),
  { t: 'match', q: 'Une cada valor de COMnx1:0 en Fast PWM con su efecto.', pairs: [['00', 'Patilla desconectada del temporizador'], ['10', 'PWM no invertido'], ['11', 'PWM invertido'], ['01', 'Conmutar en coincidencia (solo en algunos modos)']] },
  Q('Fast PWM con OCR0A = 0 no da un 0 % exacto, sino…', ['Un pulso de una cuenta en cada periodo: por eso analogWrite(0) usa digitalWrite', 'Un 0 % exacto', 'Un 50 %', 'Nada'], '(0 + 1) / 256 ≈ 0,4 %.'),
  Q('Con TOP = 63 en lugar de 255 (mismo prescaler)…', ['La frecuencia sube ×4 y la resolución baja a 6 bits (64 niveles)', 'Todo mejora', 'Sube la resolución', 'No cambia nada'], 'Frecuencia y resolución se reparten las mismas cuentas.'),
  Q('En los modos PWM, OCRnx tiene doble búfer. Significa…', ['El valor nuevo se aplica al llegar a TOP o a 0: nunca se corta un pulso a medias', 'Que hay dos salidas', 'Que vale el doble', 'Que se puede leer dos veces'], 'Por eso cambiar el ciclo de trabajo en marcha no produce glitches.')
 ]),
 L('av14', 'Timer1: 16 bits, ICR1 y servos', 'timer', ['av_pwm'], [
  I('El Timer1 cuenta hasta 65 535 y tiene modos con TOP en <b>ICR1</b> o en OCR1A. Con TOP en ICR1, OCR1A y OCR1B quedan libres: dos salidas PWM con la misma frecuencia, D9 (OC1A) y D10 (OC1B).'),
  I('Un servo quiere un pulso de 1 a 2 ms cada 20 ms. Con prescaler 8, cada cuenta son 0,5 µs:', { code: '// Servo en D9: 50 Hz con cuentas de 0,5 µs (modo 14, TOP = ICR1)\nDDRB  |= (1 << PB1);\nTCCR1A = (1 << COM1A1) | (1 << WGM11);\nTCCR1B = (1 << WGM13) | (1 << WGM12) | (1 << CS11);  // prescaler 8\nICR1   = 39999;                                       // 20 ms\nOCR1A  = 3000;                                        // 1,5 ms: centro' }),
  Nm('¿Qué OCR1A da un pulso de 1 ms?', 2000, '', '1 ms / 0,5 µs = 2000 cuentas.'),
  Nm('¿Y uno de 2 ms?', 4000, '', '2 ms / 0,5 µs.'),
  TU('Ajusta el Timer1 a 50 Hz para un servo.', 'av_pwm', { N: { label: 'Prescaler', val: 1, list: [1, 8, 64], dec: 0 }, top: { label: 'TOP (ICR1)', val: 20000, min: 1000, max: 65535, step: 1, dec: 0 }, ocr: { val: 3000, fixed: true }, mode: { val: 0, fixed: true } }, { q: 'f', min: 49.8, max: 50.2, text: 'Objetivo: 50 Hz', hint: 'Prescaler 8 y TOP = 39 999, o prescaler 64 y TOP = 4999.' }, 'Con prescaler 8 tienes más resolución en el pulso.'),
  I('Acceso de 16 bits: la CPU es de 8, así que el hardware usa un registro temporal compartido. Al escribir, primero el byte alto; al leer, primero el bajo. avr-gcc lo hace solo si usas OCR1A o TCNT1 como enteros de 16 bits.'),
  Q('¿Cuándo hay que proteger con cli/sei un acceso a OCR1A desde main()?', ['Cuando alguna ISR también lee o escribe registros de 16 bits del Timer1', 'Nunca', 'Siempre que uses delay()', 'Solo en modo normal'], 'Las dos usarían el mismo registro temporal.', { c: 'av_isr' }),
  Q('Con cuentas de 0,5 µs, ¿cuántos pasos de posición hay entre 1 y 2 ms?', ['2000', '256', '1000', '20'], 'Mucho más fino que analogWrite.'),
  Q('Quieres 25 kHz para un ventilador PWM de 4 hilos en D9 y D10, con prescaler 1 y modo 14.', ['ICR1 = 639', 'ICR1 = 640', 'ICR1 = 255', 'ICR1 = 25 000'], '16 000 000 / 25 000 = 640 cuentas: TOP = 639.')
 ]),
 L('av15', 'Input Capture: medir el tiempo', 'gauge', ['av_timer'], [
  I('La entrada <b>ICP1</b> (PB0, D8) copia TCNT1 en el registro <b>ICR1</b> en el instante exacto de un flanco, sin depender de cuándo responda tu código. La resolución es una cuenta: 62,5 ns sin prescaler.'),
  I('Configuración: <b>ICES1</b> elige el flanco (1 = subida). <b>ICNC1</b> activa un filtro que exige 4 muestras iguales seguidas (retrasa 4 ciclos pero elimina picos). <b>ICIE1</b> activa la interrupción TIMER1_CAPT_vect.'),
  Q('¿Por qué es más preciso que leer micros() dentro de una interrupción INT0?', ['El hardware captura el instante: la latencia de la ISR no afecta a la medida', 'Porque el código es más corto', 'Porque micros() es de 32 bits', 'No lo es'], 'La ISR puede llegar tarde; ICR1 ya tiene el valor exacto.'),
  G('av_icp'), G('av_icp'),
  Q('¿Sale bien esta resta si el contador ha dado la vuelta entre dos capturas?', ['Sí: la resta sin signo da la diferencia correcta aunque haya dado una vuelta', 'No: sale negativa', 'Nunca sale bien', 'El compilador avisa'], 'Aritmética módulo 65 536: funciona mientras haya menos de una vuelta completa.', { code: 'uint16_t periodo = ahora - anterior;' }),
  Q('Una señal de 10 Hz con prescaler 1: el periodo son 1 600 000 cuentas. ¿Qué haces?', ['Contar desbordamientos en TIMER1_OVF_vect y sumarlos ×65 536, o usar un prescaler mayor', 'Nada', 'Usar el Timer0', 'Es imposible'], 'Extiendes el contador por software.'),
  I('Para frecuencias muy altas se hace al revés: la entrada <b>T1</b> (PD5, D5) hace de reloj del Timer1 y cuentas pulsos durante una ventana fija. Funciona hasta algo menos de F_CPU / 2,5.'),
  Nm('Con una ventana de 0,1 s cuentas 12 345 pulsos. ¿Frecuencia, en Hz?', 123450, 'Hz', '12 345 / 0,1 s.'),
  Q('Con ICR1 como TOP (modo 14), ¿puedes usar Input Capture?', ['No: la pata ICP1 queda desconectada', 'Sí', 'Solo con prescaler', 'Solo con ICNC1'], 'ICR1 no puede hacer dos trabajos a la vez.')
 ]),
 L('av16', 'Lo que Arduino hace con tus timers', 'code', ['av_timer'], [
  I('El núcleo de Arduino configura los tres temporizadores en init(), antes de setup():\n· <b>Timer0</b>: Fast PWM, prescaler 64; su desbordamiento cuenta millis() y micros().\n· <b>Timer1</b> y <b>Timer2</b>: Phase Correct de 8 bits, prescaler 64, para analogWrite.'),
  Nm('El Timer0 se desborda cada 256 × 64 / 16 MHz. ¿Cada cuántos ms?', 1.024, 'ms', '16 384 / 16 000 000 s = 1,024 ms.', { tol: 0.002 }),
  I('Como no es 1 ms exacto, la ISR acumula lo que sobra (0,024 ms) y de vez en cuando suma 2: millis() a veces se salta un número. micros() lee además TCNT0 y tiene una resolución de 4 µs.'),
  Q('Cambias el prescaler del Timer0 para tener un PWM más rápido en D6. ¿Efecto secundario?', ['millis(), micros() y delay() dejan de medir bien', 'Ninguno', 'D9 deja de funcionar', 'Se borra el bootloader'], 'El Timer0 es el reloj del sistema de Arduino.'),
  { t: 'match', q: 'Une cada función de Arduino con lo que ocupa.', pairs: [['Librería Servo', 'Timer1: D9 y D10 pierden analogWrite'], ['tone()', 'Timer2: D3 y D11 pierden analogWrite'], ['millis() y delay()', 'Timer0'], ['analogWrite en D5 y D6', 'Timer0 ']] },
  Q('Tienes las interrupciones desactivadas 5 ms seguidos. millis()…', ['Se retrasa: solo se recuerda un desbordamiento pendiente y los demás se pierden', 'Sigue exacto', 'Se adelanta', 'Se pone a cero'], 'Una bandera no acumula eventos.', { c: 'av_isr' }),
  Q('Después de init(), haces esto. ¿En qué modo queda el Timer1?', ['En Fast PWM de 8 bits (modo 5), no en CTC: WGM10 sigue a 1 por lo que hizo init()', 'En CTC', 'No cambia nada', 'Se para y rompe millis()'], 'WGM13:0 = 0101. Asigna los registros completos en vez de usar |=.', { code: 'TCCR1B |= (1 << WGM12);   // "quiero CTC"' }),
  I('Regla: si te apropias de un temporizador, configúralo entero (TCCRnA = …; TCCRnB = …;) y asume lo que dejas de tener: PWM en sus pines, Servo, tone() o millis().'),
  Q('Necesitas millis() y una interrupción periódica de 10 kHz. ¿Qué temporizador usas?', ['El Timer1 o el Timer2 en CTC: el Timer0 es de millis()', 'El Timer0 con otro prescaler', 'Cualquiera', 'No se puede'], 'Deja el Timer0 a Arduino.'),
  Q('analogWrite(3, 128) después de llamar a tone(8, 440)…', ['No funciona como esperas: tone() ha reconfigurado el Timer2', 'Funciona perfecto', 'Suena en el pin 3', 'Para el tono'], 'D3 es OC2B, del Timer2.')
 ]),
 SIM('av-s3', 'Reto: la salida OC1A', 'El programa del fundido escribe en OCR1A del Timer1, cuya salida es OC1A: la pata PB1. Encuentra PB1 en la Nano y pon ahí un LED con su resistencia para ver el PWM por hardware.', { arduino: 'fade', board: 'nano', parts: ['res', 'led'], code: true, hint: 'PB1 = D9. LED con 220–470 Ω a GND.' }, 'av_oc1a'),
 PRJ('av-p4', 'Proyecto: theremin de luz', 'av_theremin'),
 PRJ('av-p5', 'Proyecto: frecuencímetro de 1 Hz a 5 MHz', 'av_freq'),
 PRJ('av-p6', 'Proyecto: reloj multiplexado por Timer2', 'av_clock')
] },

{ id: 'av-m4', title: 'Interrupciones a fondo', desc: 'Vectores, ISR, volatile, secciones críticas, INT0, PCINT, latencia y búferes circulares.', nodes: [
 L('av17', 'Vectores y la ISR', 'bolt', ['av_isr'], [
  I('Una <b>interrupción</b> es un salto provocado por el hardware: la CPU termina la instrucción en curso, guarda en la pila la dirección de retorno y salta a una dirección fija, el <b>vector</b>. Al final, reti vuelve donde estaba.'),
  I('La tabla de vectores está al principio de la Flash: 26 en el 328P (RESET y 25 fuentes). En avr-gcc escribes ISR(NOMBRE_vect) { … } y el compilador la coloca en su sitio.'),
  { t: 'match', q: 'Une cada vector con su causa.', pairs: [['INT0_vect', 'Flanco o nivel en PD2'], ['TIMER1_CAPT_vect', 'Captura en ICP1'], ['USART_RX_vect', 'Byte recibido'], ['ADC_vect', 'Conversión terminada']] },
  I('Tres llaves para que salte: 1) su <b>bandera</b> se activa; 2) su <b>habilitación local</b> (TIMSKn, EIMSK…) está a 1; 3) el bit <b>I</b> de SREG está a 1 (sei()).'),
  Q('Activas OCIE1A en un programa con avr-gcc sin Arduino y no llamas a sei(). ¿Salta la ISR?', ['No: falta el permiso global (bit I)', 'Sí', 'Solo una vez', 'Solo si TCNT1 vale 0'], 'Arduino llama a sei() en init(); en C puro te toca a ti.'),
  Q('Al entrar en una ISR, el bit I de SREG…', ['Se pone a 0 solo: las ISR no se anidan salvo que lo pidas', 'Sigue a 1', 'Se invierte', 'No existe'], 'reti lo vuelve a poner a 1.'),
  Q('Dos interrupciones pendientes a la vez. ¿Cuál se atiende primero?', ['La de vector más bajo, que es la más prioritaria', 'La más reciente', 'La más larga', 'Al azar'], 'INT0 gana a un temporizador, por ejemplo.'),
  Q('¿Qué pasa si activas una interrupción y no escribes su ISR?', ['Salta a __bad_interrupt, que por defecto vuelve al vector 0: parece un reinicio extraño', 'Nada', 'Error de compilación', 'Se ignora'], 'Puedes definir ISR(BADISR_vect) para detectarlo.'),
  Q('Timer2 en CTC con interrupción a 1 kHz y esta ISR. ¿Qué ves en D13?', ['Una onda cuadrada de 500 Hz', 'Una de 1 kHz', 'D13 fijo a 1', 'Nada: falta loop()'], 'Una conmutación cada milisegundo: periodo de 2 ms.', { code: 'ISR(TIMER2_COMPA_vect) {\n  PINB = (1 << PB5);\n}' }),
  { t: 'order', q: 'Ordena lo que pasa al saltar una interrupción.', items: ['Se activa la bandera', 'Termina la instrucción en curso', 'Se guarda la dirección de retorno y se pone I a 0', 'Salta al vector y ejecuta la ISR', 'reti recupera la dirección y pone I a 1'], e: 'Todo esto lo hace el hardware salvo el cuerpo de tu ISR.' }
 ]),
 L('av18', 'volatile y secciones críticas', 'shield', ['av_isr'], [
  I('El compilador optimiza: si en un bucle lees una variable que el bucle no cambia, la guarda en un registro y deja de mirarla en la RAM. Si quien la cambia es una ISR, el bucle nunca se entera.'),
  Q('¿Qué puede pasar con este código compilado con optimización?', ['Quedarse atascado para siempre: falta volatile en listo', 'Funciona siempre', 'No compila', 'Sale al instante'], 'El compilador no sabe que la ISR existe.', { code: 'bool listo = false;\nISR(INT0_vect) { listo = true; }\n\nvoid esperar() {\n  while (!listo) { }\n}' }),
  I('<b>volatile</b> obliga a leer y escribir la variable en memoria cada vez. Úsalo en toda variable compartida entre una ISR y el programa principal. Ojo: la hace <b>visible</b>, no atómica.'),
  Q('volatile uint16_t cuenta; ¿es seguro leerla en loop() mientras una ISR la incrementa?', ['No: son dos bytes y la ISR puede saltar entre la lectura de uno y la del otro', 'Sí, por ser volatile', 'Sí, por ser uint16_t', 'Solo en Arduino'], 'Visibilidad no es atomicidad.'),
  I('Lectura rota: cuenta pasa de 0x00FF a 0x0100. Lees el byte bajo (0xFF), salta la ISR, lees el alto (0x01): obtienes 0x01FF = 511, un valor que nunca existió.'),
  I('La solución es una <b>sección crítica</b>:', { code: '#include <util/atomic.h>\n\nuint16_t copia;\nATOMIC_BLOCK(ATOMIC_RESTORESTATE) {   // aquí dentro no salta ninguna ISR\n  copia = cuenta;\n}                                      // y se restaura el estado que hubiera' }),
  Q('¿Por qué ATOMIC_RESTORESTATE y no simplemente cli() … sei()?', ['Si el código ya estaba con interrupciones desactivadas, sei() las activaría por error', 'Es más rápido', 'sei() no existe', 'Es exactamente lo mismo'], 'Restaura SREG en vez de forzar I a 1.'),
  Q('Una variable uint8_t que solo escribe la ISR y solo lee loop()…', ['Basta con volatile: leer un byte es atómico', 'Necesita ATOMIC_BLOCK siempre', 'No necesita nada', 'Debe ir en la EEPROM'], 'Un byte se lee en una instrucción.'),
  Q('contador++ sobre un uint8_t desde loop() y también desde una ISR…', ['No es atómico: leer, sumar y escribir son tres pasos; protégelo', 'Es atómico', 'Es atómico por ser de 8 bits', 'Lo arregla volatile'], 'Mismo problema que PORTB |= …'),
  Q('Una sección crítica bien hecha es…', ['Lo más corta posible: copiar y salir', 'Larga, para ir sobre seguro', 'Con delay() dentro', 'Con Serial.print() dentro'], 'Mientras dura, ninguna interrupción puede atenderse.')
 ]),
 L('av19', 'INT0, INT1 y PCINT', 'chip', ['av_isr'], [
  I('<b>INT0</b> (PD2, D2) e <b>INT1</b> (PD3, D3) son las interrupciones externas completas. En <b>EICRA</b> eliges el disparo con ISCn1:0 (00 nivel bajo, 01 cualquier cambio, 10 bajada, 11 subida) y en <b>EIMSK</b> las activas.'),
  { t: 'bits', q: 'EICRA: INT1 por subida (ISC11 = 1, ISC10 = 1) e INT0 por bajada (ISC01 = 1, ISC00 = 0). Bits 3 a 0: ISC11, ISC10, ISC01, ISC00.', n: 8, target: 14, e: '0b00001110 = 14.', c: 'av_bits' },
  I('Configurar INT0 por flanco de bajada:', { code: 'EICRA = (1 << ISC01);        // INT0 en flanco de bajada\nEIMSK = (1 << INT0);         // habilita INT0\nsei();\n\nISR(INT0_vect) { pulsos++; }' }),
  I('Las <b>PCINT</b> (interrupciones por cambio de pin) existen en casi todas las patas, pero agrupadas: un vector por puerto y solo avisan de que “algo ha cambiado”. <b>PCICR</b> activa el grupo (PCIE0 = puerto B, PCIE1 = C, PCIE2 = D) y <b>PCMSKn</b> elige las patas.'),
  { t: 'match', q: 'Une cada vector con sus patas.', pairs: [['PCINT0_vect', 'Puerto B (D8–D13)'], ['PCINT1_vect', 'Puerto C (A0–A5)'], ['PCINT2_vect', 'Puerto D (D0–D7)'], ['INT0_vect', 'Solo PD2']] },
  Q('¿Qué contiene la variable cambio?', ['Los bits que han cambiado desde la última vez', 'Los bits que están a 1', 'Los bits que están a 0', 'El número de cambios'], 'XOR entre lo de ahora y lo de antes.', { code: 'ISR(PCINT0_vect) {\n  static uint8_t antes = 0xFF;\n  uint8_t ahora = PINB;\n  uint8_t cambio = ahora ^ antes;\n  antes = ahora;\n  if (cambio & (1 << PB0)) { /* PB0 ha cambiado */ }\n}' }),
  Q('Un pulsador en INT0 por flanco cuenta tres pulsaciones cada vez. ¿Por qué?', ['Rebotes: varios flancos en pocos ms; filtra con RC o ignora flancos durante unos 20 ms', 'INT0 está roto', 'Falta volatile', 'El prescaler'], 'Un contacto mecánico rebota.'),
  Q('Para despertar de power-down, INT0 debe configurarse…', ['Por nivel bajo: las de flanco necesitan un reloj que en power-down está parado', 'Por subida', 'Por cualquier cambio', 'No puede despertar'], 'Las PCINT sí despiertan con cualquier cambio.', { c: 'av_sleep' }),
  Q('Codificador rotatorio en PB0 y PB1. ¿Qué interrupción usas?', ['PCINT0, con PCINT0 y PCINT1 activados en PCMSK0', 'INT0', 'TIMER1_OVF', 'USART_RX'], 'PB0 y PB1 no tienen INT0/INT1.'),
  { t: 'pin', q: '¿En qué pin de la Uno está INT1?', a: 'D3', e: 'INT1 = PD3 = D3.', c: 'av_ports' }
 ]),
 L('av20', 'Latencia e ISR cortas', 'timer', ['av_isr'], [
  I('<b>Latencia</b>: desde que se activa la bandera hasta tu primera línea pasan al menos 4 ciclos de respuesta, el salto del vector y el <b>prólogo</b> que añade el compilador (guarda SREG y los registros que use la ISR). Fácilmente de 20 a 40 ciclos: de 1 a 3 µs a 16 MHz.'),
  Q('Llega tu interrupción mientras otra ISR está en marcha…', ['Espera a que termine: su duración se suma a tu latencia', 'Interrumpe a la otra', 'Se pierde siempre', 'Se ejecutan a la vez'], 'Sin anidamiento, van en fila.'),
  I('Reglas de oro:\n· Nada de delay(), Serial ni bucles de espera dentro de una ISR.\n· Copia el dato, pon una bandera y sal.\n· El trabajo pesado, en loop().'),
  Q('¿Qué problema tiene esto?', ['Serial también usa interrupciones para enviar: dentro de una ISR puede bloquearse si su búfer se llena', 'Funciona perfecto', 'Es más rápido', 'No compila'], 'Además alarga muchísimo la ISR.', { code: 'ISR(INT0_vect) {\n  Serial.println("pulsado");\n}' }),
  Nm('Una ISR de 200 ciclos que salta 40 000 veces por segundo. ¿Qué % de la CPU consume a 16 MHz?', 50, '%', '200 × 40 000 = 8 000 000 ciclos por segundo: la mitad.'),
  Q('La bandera de una interrupción se activa dos veces antes de que se atienda…', ['Solo cuenta una: el segundo evento se pierde', 'Se ejecuta dos veces', 'Se acumulan en una cola', 'Se reinicia el chip'], 'Por eso las ISR deben ser cortas.'),
  I('Patrón bandera: la ISR guarda el dato en una variable volatile y pone hayDato = true; loop() lo procesa y pone hayDato = false. Si no puedes perder nada, usa un búfer circular (siguiente lección).'),
  Q('ISR_NOBLOCK sirve para…', ['Reactivar las interrupciones al empezar la ISR y dejar que otra la interrumpa', 'Bloquear todas', 'Hacerla más corta', 'Nada'], 'Útil para una ISR larga que no debe retrasar a otra urgente. Úsalo con mucho cuidado.'),
  Q('¿Cómo mides con un osciloscopio cuánto dura una ISR?', ['Pones una pata a 1 al entrar y a 0 al salir y mides el pulso', 'Con millis()', 'Con Serial', 'No se puede'], 'Un pin de traza: la herramienta más útil sin depurador.', { c: 'av_tool' })
 ]),
 L('av21', 'Búferes circulares', 'memory', ['av_isr'], [
  I('Un <b>búfer circular</b> es un array con dos índices: la ISR escribe en la cabeza y el programa lee en la cola. Al llegar al final, cada índice vuelve a 0. La ISR nunca espera y no se pierde nada mientras haya hueco.'),
  I('Un búfer de recepción para la USART:', { code: '#define TAM 64                        // potencia de 2\nvolatile uint8_t buf[TAM];\nvolatile uint8_t cabeza = 0, cola = 0;\n\nISR(USART_RX_vect) {                  // productor\n  uint8_t c = UDR0;\n  uint8_t sig = (cabeza + 1) & (TAM - 1);\n  if (sig != cola) { buf[cabeza] = c; cabeza = sig; }   // lleno: se descarta\n}\n\nint16_t leer(void) {                  // consumidor, desde loop()\n  if (cola == cabeza) return -1;      // vacío\n  uint8_t c = buf[cola];\n  cola = (cola + 1) & (TAM - 1);\n  return c;\n}' }),
  Q('¿Por qué TAM es potencia de 2?', ['Porque & (TAM − 1) da la vuelta sin dividir: es muy rápido', 'Por estética', 'Lo exige el compilador', 'Ocupa menos'], 'La CPU no tiene divisor: el módulo sería lento.'),
  Q('Con este diseño, ¿cuántos bytes caben como máximo?', ['TAM − 1: se deja un hueco para distinguir lleno de vacío', 'TAM', 'TAM + 1', 'TAM / 2'], 'Si cabeza alcanzase a cola, parecería vacío.'),
  Q('¿Hace falta desactivar interrupciones en leer()?', ['No: cada índice lo escribe un solo lado y son de 8 bits (lectura atómica)', 'Sí, siempre', 'Sí, porque buf es volatile', 'Solo con TAM grande'], 'Un productor, un consumidor e índices de un byte.'),
  Nm('Recibes a 115 200 baudios (8N1) y loop() tarda hasta 4 ms en volver a leer. ¿Cuántos bytes pueden llegar en ese tiempo?', 46, 'bytes', '11 520 bytes/s × 0,004 s ≈ 46.', { tol: 1 }),
  Q('¿Te basta un búfer de 64 bytes en ese caso?', ['Sí, pero con poco margen: si loop() se alarga, se perderán datos', 'No, hacen falta 1024', 'Sobra muchísimo', 'Da igual el tamaño'], '63 útiles frente a 46 por ciclo.'),
  { t: 'order', q: 'Ordena la escritura segura en la ISR de recepción.', items: ['Calcular el índice siguiente', 'Comprobar que no alcanza a la cola', 'Guardar el dato en la cabeza actual', 'Avanzar la cabeza'], e: 'El dato se guarda antes de publicarlo moviendo la cabeza.' },
  Q('En el búfer de envío, el productor es loop() y el consumidor la ISR. Si loop() avanza la cabeza antes de guardar el dato…', ['La ISR puede saltar en medio y enviar una casilla con basura', 'No pasa nada', 'Va más rápido', 'Se pierde la cola'], 'Primero el dato, luego el índice.'),
  Q('La interrupción de “registro de datos vacío” (UDRE) del envío…', ['Debe desactivarse cuando el búfer se vacía, o saltará sin parar', 'Se desactiva sola', 'Solo salta una vez', 'No existe'], 'UDRE salta mientras haya hueco, es decir, siempre que no envíes nada.', { c: 'av_uart' })
 ]),
 SIM('av-s4', 'Reto: la entrada INT0', 'El programa del pulsador lee D2, que es PD2: la pata de INT0. Monta el pulsador entre PD2 y GND (el programa activa la pull-up) y el LED en PB5 de la Nano.', { arduino: 'boton', board: 'nano', parts: ['push', 'res', 'led'], code: true, hint: 'PD2 = D2, en la fila de abajo de la Nano. LED con su resistencia en D13 (PB5).' }, 'av_int0'),
 PRJ('av-p7', 'Proyecto: lector de mandos infrarrojos', 'av_ir'),
 PRJ('av-p8', 'Proyecto: sintetizador de 8 bits', 'av_synth')
] },

{ id: 'av-m5', title: 'Periféricos por registros', desc: 'ADC fino, USART con interrupciones, SPI, TWI, EEPROM, comparador y watchdog.', nodes: [
 L('av22', 'El ADC por registros', 'gauge', ['av_adc'], [
  I('El ADC del 328P es de <b>aproximaciones sucesivas</b> y 10 bits, con un multiplexor de 8 canales (6 en el DIP) y un circuito de muestreo y retención.\n<b>ADC = Vin · 1024 / Vref</b>'),
  I('<b>ADMUX</b>: REFS1:0 elige la referencia (00 AREF, 01 AVcc, 11 interna de 1,1 V); ADLAR alinea el resultado a la izquierda; MUX3:0, el canal.\n<b>ADCSRA</b>: ADEN enciende, ADSC arranca, ADIF avisa, ADIE interrumpe y ADPS2:0 es el prescaler.'),
  Q('¿Qué selecciona esta línea?', ['Referencia AVcc y canal ADC3 (A3)', 'Referencia interna y canal 3', 'AREF y canal 0', 'Canal 1 con ADLAR'], 'REFS0 = 1 → AVcc; MUX = 0011 → ADC3.', { code: 'ADMUX = (1 << REFS0) | 3;' }),
  Q('Conectas 3,3 V a la pata AREF y tu código usa la referencia AVcc. ¿Qué pasa?', ['Cortocircuitas la referencia interna con tu fuente: elige AREF antes de conectar nada', 'Nada', 'Se calienta el cristal', 'Se borra la EEPROM'], 'Con AVcc o 1,1 V, AREF está unida por dentro a esa referencia.'),
  I('El reloj del ADC sale del de la CPU con su propio prescaler (2 a 128). Para 10 bits de verdad debe estar entre <b>50 y 200 kHz</b>. Una conversión dura <b>13 ciclos de ADC</b> (25 la primera tras encenderlo).'),
  TU('Elige un prescaler que dé los 10 bits completos a 16 MHz.', 'av_adc', adcP(8), { q: 'ok', min: 1, max: 1, text: 'Objetivo: reloj del ADC entre 50 y 200 kHz', hint: '16 MHz / 128 = 125 kHz. Con /64 ya son 250 kHz.' }, 'Solo /128 cumple a 16 MHz: unas 9600 muestras por segundo.'),
  G('av_adcTime'), G('av_adcTime'),
  I('Una lectura completa por registros, esperando a que termine:', { code: 'uint16_t adcLeer(uint8_t canal) {\n  ADMUX  = (1 << REFS0) | (canal & 0x0F);   // AVcc y canal\n  ADCSRA = (1 << ADEN) | (1 << ADSC) | 7;   // prescaler 128 y arranca\n  while (ADCSRA & (1 << ADSC)) ;            // ADSC vuelve a 0 al acabar\n  return ADC;                               // ADCL y ADCH en el orden correcto\n}' }),
  Q('Con ADLAR = 1 lees solo ADCH. Obtienes…', ['Los 8 bits más significativos: 8 bits de resolución con una sola lectura', 'Los 2 bits altos', 'Los 8 bits bajos', 'Nada'], 'Útil cuando 8 bits bastan y necesitas velocidad.'),
  Q('Si lees ADCL y ADCH por separado, ¿en qué orden?', ['Primero ADCL: al leerlo, el resultado queda bloqueado hasta que leas ADCH', 'Primero ADCH', 'Da igual', 'Solo ADCH'], 'La macro ADC de 16 bits ya lo hace bien.')
 ]),
 L('av23', 'ADC fino: ruido, sobremuestreo y sensores internos', 'gauge', ['av_adc'], [
  I('Fuentes de error: el ruido de la alimentación, la impedancia de la fuente (el condensador de muestreo, de unos 14 pF, quiere fuentes de 10 kΩ o menos) y la propia referencia. AVcc son los 5 V del USB: si bajan a 4,8 V, todas tus medidas se mueven un 4 %.'),
  Q('Lees un sensor de 100 kΩ de impedancia alternando canales deprisa. ¿Qué pasa?', ['Lee mal: el condensador de muestreo no se carga a tiempo; pon un seguidor o 100 nF en la entrada', 'Lee perfecto', 'Rompe el ADC', 'Siempre da 0'], 'Arrastra la tensión del canal anterior.'),
  I('Mejoras de hardware: 100 nF entre AREF y GND, AVCC filtrado (la hoja de datos propone una bobina de 10 µH y 100 nF) y el modo de sueño <b>ADC Noise Reduction</b>, que detiene la CPU durante la conversión.'),
  I('<b>Sobremuestreo</b>: si sumas 4ⁿ lecturas y desplazas n bits a la derecha, ganas n bits de resolución, siempre que haya algo de ruido (al menos 1 LSB) que haga variar las lecturas. 16 lecturas → 12 bits.'),
  TU('Consigue 12 bits efectivos sin salir de los 10 bits de base completos.', 'av_adc', adcP(128, 0, true, false), { q: 'bits', min: 12, max: 12, text: 'Objetivo: 12 bits', hint: 'Dos bits extra: 16 lecturas por resultado.' }, '16 lecturas por resultado: unas 600 medidas de 12 bits por segundo.'),
  Nm('¿Cuántas lecturas hacen falta para ganar 3 bits?', 64, 'lecturas', '4³ = 64.'),
  Q('Sumas 16 lecturas y divides entre 16. ¿Qué consigues?', ['Menos ruido, pero sin bits extra: los descartas al dividir', 'Una lectura de 14 bits', 'Empeorar la medida', 'Lo mismo que el sobremuestreo a 12 bits'], 'Para 12 bits, divide entre 4 (desplaza 2).'),
  I('Dos canales internos:\n· <b>MUX = 1000</b>: un sensor de temperatura, con la referencia de 1,1 V. Unos 314 mV a 25 °C y aproximadamente 1 mV/°C, pero sin calibrar puede errar ±10 °C.\n· <b>MUX = 1110</b>: la propia referencia de 1,1 V.'),
  Q('¿Cómo mides la VCC del propio chip sin ningún componente?', ['Con referencia AVcc, mides la de 1,1 V interna: VCC = 1,1 × 1024 / ADC', 'Es imposible', 'Con analogRead(A6)', 'Con el sensor de temperatura'], 'Truco clásico para vigilar la batería.'),
  Nm('Con referencia AVcc, la lectura de la referencia de 1,1 V da 240. ¿VCC?', 4.693, 'V', '1,1 × 1024 / 240 ≈ 4,69 V.', { tol: 0.02 }),
  Q('La referencia de 1,1 V varía de un chip a otro (de 1,0 a 1,2 V). Para medidas precisas…', ['Calíbrala: mide VCC con un buen multímetro y guarda el valor real en la EEPROM', 'No hagas nada', 'Usa 5 V siempre', 'Cambia de chip'], 'Una calibración por chip.')
 ]),
 L('av24', 'USART: baudios, tramas y error', 'bus', ['av_uart'], [
  I('La USART envía bytes en serie sin reloj compartido: los dos lados acuerdan la velocidad, en <b>baudios</b> (bits por segundo). La trama típica <b>8N1</b>: un bit de inicio (0), 8 de datos empezando por el <b>menos</b> significativo, sin paridad, y uno de parada (1).'),
  I('Explora la trama: cambia el byte y la velocidad.', { tune: { viz: 'av_uart', params: uartP() } }),
  Q('A 9600 baudios y 8N1, ¿cuántos bytes por segundo como máximo?', ['960', '9600', '1200', '1067'], '10 bits por byte.'),
  I('El divisor:\n<b>UBRR0 = F_CPU / (16 · baudios) − 1</b>\nCon U2X0 = 1, entre 8 en lugar de 16. Como hay que redondear, los baudios reales no son exactos: aparece un <b>error</b>.'),
  G('av_ubrr'), G('av_baudErr'),
  TU('A 115 200 baudios, consigue menos de 2,5 % de error.', 'av_uart', uartP(115200, 0, true, 85), { q: 'errAbs', min: 0, max: 2.5, text: 'Objetivo: error por debajo de 2,5 %', hint: 'Prueba U2X0 = 1.' }, 'Con U2X0 = 1: UBRR0 = 16 y un +2,1 %. Es lo que hace Serial.begin(115200).'),
  TU('Encuentra una velocidad con error 0 % exacto a 16 MHz.', 'av_uart', uartP(9600, 0), { q: 'errAbs', min: 0, max: 0.01, text: 'Objetivo: error 0 %', hint: 'El MIDI usa una de ellas: 31 250 baudios.' }, '31 250 (UBRR0 = 31) y 250 000 (UBRR0 = 3) dividen exacto.'),
  Q('¿Por qué existen cristales de 14,7456 MHz?', ['Dividen exacto a las velocidades serie estándar: error 0 %', 'Son más baratos', 'Son más rápidos', 'Por el USB'], '14 745 600 / (16 × 9600) = 96 exactos.'),
  Q('Emisor con +2 % y receptor con −2 % de error…', ['Se suman: un 4 % de diferencia y la trama falla', 'Se compensan', 'No importa', 'Funciona mejor'], 'Lo que cuenta es la diferencia entre los dos relojes.')
 ]),
 L('av25', 'USART por registros e interrupciones', 'code', ['av_uart'], [
  I('Registros: <b>UDR0</b> (el dato), <b>UCSR0A</b> (banderas: RXC0 recibido, UDRE0 hueco para enviar, FE0 error de trama, DOR0 desbordamiento), <b>UCSR0B</b> (RXEN0, TXEN0 y las interrupciones) y <b>UCSR0C</b> (formato).'),
  I('Lo mínimo, sin interrupciones:', { code: 'void uartInit(void) {\n  UBRR0  = 103;                              // 9600 baudios a 16 MHz\n  UCSR0B = (1 << RXEN0) | (1 << TXEN0);\n  UCSR0C = (1 << UCSZ01) | (1 << UCSZ00);    // 8N1\n}\n\nvoid uartPut(uint8_t c) {\n  while (!(UCSR0A & (1 << UDRE0))) ;         // espera hueco\n  UDR0 = c;\n}' }),
  Q('¿Qué indica UDRE0 = 1?', ['Que el registro de envío está libre: puedes escribir otro byte', 'Que ha llegado un byte', 'Un error de trama', 'Que el cable está suelto'], 'Data Register Empty.'),
  Q('DOR0 = 1 significa…', ['Que llegaron bytes y nadie leyó UDR0 a tiempo: se perdió alguno', 'Un error de paridad', 'Que el envío ha terminado', 'Que la velocidad es errónea'], 'Data OverRun.'),
  Q('Ves FE0 = 1 una y otra vez. ¿Causa probable?', ['Baudios distintos en los dos extremos, o ruido en la línea', 'Que el búfer está vacío', 'Que el envío ha terminado', 'Que hay paridad par'], 'El bit de parada no llega donde se espera.'),
  I('Con interrupciones: <b>RXCIE0</b> llama a USART_RX_vect por cada byte recibido (lo metes en un búfer circular). Para enviar, <b>UDRIE0</b> llama a USART_UDRE_vect mientras haya hueco: sacas el siguiente byte del búfer y, cuando se vacía, desactivas UDRIE0.'),
  Q('¿Por qué un Serial.print() a veces “congela” loop()?', ['Su búfer de envío (64 bytes) se llena y espera a que salgan bytes', 'Porque usa delay()', 'Por el ADC', 'Nunca pasa'], 'A 9600 baudios, 64 bytes tardan 67 ms.'),
  Nm('¿Cuánto tarda en salir un mensaje de 64 bytes a 9600 baudios (8N1), en ms?', 66.67, 'ms', '640 bits / 9600 ≈ 66,7 ms.', { tol: 0.5 }),
  { t: 'match', q: 'Une cada conexión entre la Uno y otro equipo serie.', pairs: [['TX de la Uno', 'RX del otro equipo'], ['RX de la Uno', 'TX del otro equipo'], ['GND', 'GND (masa común)'], ['Baudios', 'Iguales en los dos lados']] },
  Q('Un módulo de 3,3 V va al TX de la Uno. ¿Qué haces?', ['Un divisor o un adaptador de nivel en la línea que llega al módulo: la Uno saca 5 V', 'Lo conectas directo siempre', 'Cruzas GND', 'Nada'], 'El RX del módulo podría no tolerar 5 V.'),
  Q('Escribes tu propia ISR(USART_RX_vect) en un sketch que también usa Serial. ¿Qué pasa?', ['Choca: el núcleo ya define esa ISR al usar Serial; elige una de las dos', 'Funciona', 'Se llaman las dos', 'Basta con volatile'], 'Error de vector definido dos veces al enlazar.')
 ]),
 L('av26', 'SPI maestro', 'bus', ['av_bus'], [
  I('<b>SPI</b>: bus síncrono de 4 hilos. El maestro genera el reloj SCK y en cada pulso sale un bit por MOSI y entra otro por MISO: un intercambio, como dos registros de desplazamiento unidos en anillo. SS (o CS) elige al esclavo, activo a 0.'),
  { t: 'match', q: 'Une cada señal SPI con su pata en la Uno.', pairs: [['SCK', 'PB5 (D13)'], ['MISO', 'PB4 (D12)'], ['MOSI', 'PB3 (D11)'], ['SS', 'PB2 (D10)']] },
  I('<b>SPCR</b>: SPE activa, MSTR maestro, CPOL y CPHA eligen el modo (0–3), DORD el orden de bits y SPR1:0 la velocidad. <b>SPSR</b>: SPIF (fin de byte) y SPI2X (velocidad doble). <b>SPDR</b>: escribir envía; leer da lo recibido.'),
  Q('SPR1:0 = 00 y SPI2X = 1 a 16 MHz. ¿SCK?', ['8 MHz', '4 MHz', '16 MHz', '2 MHz'], 'F_CPU / 4 × 2 = F_CPU / 2.'),
  Nm('¿Cuántos µs tarda un byte con SCK a 8 MHz (sin contar el código)?', 1, 'µs', '8 bits / 8 MHz.'),
  Q('En modo maestro dejas PB2 (SS) como entrada y el ruido la lleva a 0. ¿Qué pasa?', ['El SPI pasa solo a esclavo (se borra MSTR) y deja de enviar', 'Nada', 'Se reinicia el chip', 'Va más rápido'], 'Pon SS como salida aunque no la uses.'),
  Q('Para leer un byte de un esclavo SPI…', ['Envías un byte cualquiera (por ejemplo, 0xFF) y lees SPDR: siempre es un intercambio', 'Lees SPDR sin enviar nada', 'Pones MISO como salida', 'Usas otra línea'], 'Sin envío no hay reloj.'),
  Q('Un chip pide CPOL = 0 y CPHA = 0. Es el…', ['Modo 0', 'Modo 1', 'Modo 2', 'Modo 3'], 'Modo = CPOL × 2 + CPHA.'),
  I('Un byte por SPI, esperando a SPIF:', { code: 'uint8_t spiByte(uint8_t b) {\n  SPDR = b;\n  while (!(SPSR & (1 << SPIF))) ;   // 8 bits\n  return SPDR;                      // lo que llegó por MISO\n}' }),
  Q('Tres esclavos SPI en el mismo bus. ¿Qué comparten?', ['SCK, MOSI y MISO; cada uno lleva su propia línea CS', 'Todo, también CS', 'Nada', 'Cada uno su SCK'], 'CS dice a quién le toca.'),
  Q('Un 74HC595 por SPI necesita además…', ['Un pulso en su RCLK (latch) para pasar los datos a las salidas', 'Una dirección', 'Una pull-up', 'Nada'], 'Desplazar y mostrar son pasos separados.')
 ]),
 L('av27', 'TWI (I²C) por registros', 'bus', ['av_bus'], [
  I('El <b>TWI</b> es el I²C de los AVR: 2 hilos, SDA (PC4, A4) y SCL (PC5, A5), con salidas en drenador abierto y <b>pull-ups</b> externas (4,7 kΩ típico). Cada esclavo tiene una dirección de 7 bits.'),
  I('Velocidad:\n<b>f_SCL = F_CPU / (16 + 2 · TWBR · 4^TWPS)</b>\nA 16 MHz con TWPS = 0: TWBR = 72 da 100 kHz y TWBR = 12, 400 kHz.'),
  G('av_twbr'),
  I('Cada paso lo lanza TWCR (escribir TWINT a 1 lo arranca) y el resultado se lee en <b>TWSR</b> enmascarando con 0xF8: 0x08 START enviado, 0x18 dirección + escritura con ACK, 0x20 sin ACK, 0x28 dato con ACK…'),
  { t: 'order', q: 'Ordena la escritura de un byte en un esclavo.', items: ['START', 'Dirección del esclavo + bit de escritura (0)', 'Comprobar el ACK', 'Enviar el dato', 'STOP'], e: 'Cada paso se confirma en TWSR.' },
  I('Las tres piezas básicas:', { code: 'void twiStart(void) {\n  TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN);\n  while (!(TWCR & (1 << TWINT))) ;     // espera al hardware\n}\n\nuint8_t twiEscribir(uint8_t b) {\n  TWDR = b;\n  TWCR = (1 << TWINT) | (1 << TWEN);\n  while (!(TWCR & (1 << TWINT))) ;\n  return TWSR & 0xF8;                  // código de estado\n}\n\nvoid twiStop(void) {\n  TWCR = (1 << TWINT) | (1 << TWSTO) | (1 << TWEN);\n}' }),
  Q('Tras enviar la dirección, TWSR & 0xF8 = 0x20. Significa…', ['Que nadie respondió (NACK): dirección equivocada o dispositivo sin alimentar', 'Que todo es correcto', 'Que llegó un dato', 'Que el bus está libre'], '0x18 sería el ACK.'),
  Q('Una hoja de datos dice “dirección 0x4E (escritura)” y el escáner de Arduino encuentra 0x27. ¿Contradicción?', ['No: 0x4E es 0x27 desplazado un bit con el bit R/W; Wire usa la dirección de 7 bits', 'Sí, uno está roto', 'Son dos chips distintos', 'El escáner falla'], '0x27 × 2 = 0x4E.'),
  Q('Bus I²C solo con las pull-ups internas (20–50 kΩ)…', ['Flancos de subida lentos: puede fallar a 100 kHz y casi seguro a 400 kHz', 'Va mejor', 'No cambia nada', 'Se queman las patas'], 'La capacidad del bus y una pull-up alta hacen un RC lento.'),
  Q('¿Por qué las salidas I²C son de drenador abierto?', ['Para que varios dispositivos compartan la línea sin cortocircuitos: solo tiran a 0', 'Para ir más rápido', 'Para dar 5 V', 'Por precio'], 'Si dos empujaran a niveles distintos, habría un corto.')
 ]),
 L('av28', 'EEPROM, comparador y watchdog', 'shield', ['av_mem'], [
  I('<b>EEPROM</b>: con avr/eeprom.h tienes eeprom_read_byte, <b>eeprom_update_byte</b> (solo escribe si cambia) y variables EEMEM. En Arduino, EEPROM.get, put y update. Cada escritura tarda unos 3,3 ms y la CPU puede seguir trabajando.'),
  Q('¿Por qué eeprom_update_byte y no eeprom_write_byte?', ['No escribe si el valor ya es igual: no gasta ciclos de vida', 'Escribe más rápido', 'Escribe dos veces', 'Borra antes'], 'Lee, compara y solo escribe si hace falta.'),
  G('av_eeLife'),
  Q('Se corta la alimentación justo mientras escribes la EEPROM…', ['Puede corromperse ese byte; con el BOD activado, el chip se detiene antes de escribir con tensión baja', 'No pasa nada', 'Se borra toda la EEPROM', 'Se rompe el chip'], 'La hoja de datos recomienda el BOD para proteger la EEPROM.'),
  I('<b>Comparador analógico</b>: compara AIN0 (PD6, D6) con AIN1 (PD7, D7) o con la de 1,1 V interna. ACO da el resultado y puede interrumpir o disparar la captura del Timer1 (ACIC). Responde en menos de un microsegundo, sin esperar al ADC.'),
  Q('Quieres enterarte al instante de que una batería baja de un umbral, sin ocupar el ADC.', ['Comparador analógico con la referencia de 1,1 V y un divisor', 'Leer el ADC cada segundo', 'Con INT0', 'Es imposible'], 'Y con su interrupción, sin tener que vigilarlo.'),
  I('<b>Watchdog</b>: un temporizador con su propio oscilador de 128 kHz. Si tu programa no lo “acaricia” (wdt_reset()) antes de que expire (de 16 ms a 8 s), reinicia el chip. Si el programa se cuelga, se recupera solo.'),
  I('Uso básico:', { code: '#include <avr/wdt.h>\n\nvoid setup() {\n  MCUSR = 0;                 // borra la causa del último reinicio\n  wdt_disable();             // por si venimos de un reinicio por watchdog\n  wdt_enable(WDTO_2S);       // 2 s sin wdt_reset() = reinicio\n}\n\nvoid loop() {\n  trabajo();                 // nunca debe tardar más de 2 s\n  wdt_reset();\n}' }),
  Q('Tras un reinicio por watchdog, este sigue activado con 16 ms. Si tu setup() tarda 1 s…', ['Se reinicia en bucle: desactívalo o reconfigúralo al principio de todo', 'No pasa nada', 'Se apaga solo', 'Se reinicia una sola vez'], 'Por eso se borra WDRF y se desactiva lo primero.'),
  Q('Algunos bootloaders antiguos, como el de muchas Nano clónicas…', ['Se quedan en bucle tras un reinicio por watchdog: actualiza a Optiboot', 'Lo desactivan siempre', 'No se ven afectados', 'Lo ponen a 8 s'], 'El bootloader tarda más que el plazo de 16 ms.'),
  { t: 'match', q: 'Une cada bit de WDTCSR con su papel.', pairs: [['WDE', 'Reinicio al expirar'], ['WDIE', 'Interrupción al expirar'], ['WDP3:0', 'Tiempo de espera'], ['WDCE', 'Permite cambios (secuencia temporizada)']] }
 ]),
 SIM('av-s5', 'Reto: el canal ADC0', 'El programa del potenciómetro lee el canal ADC0 y escribe el resultado en OCR1A. Lleva el cursor del potenciómetro a la pata PC0 (ADC0) de la Nano y el LED a OC1A (PB1).', { arduino: 'pot', board: 'nano', parts: ['pot', 'res', 'led'], code: true, hint: 'PC0 = A0 y PB1 = D9. Extremos del potenciómetro a 5V y GND.' }, 'av_adc0'),
 PRJ('av-p9', 'Proyecto: termómetro con historial en EEPROM', 'av_thermo'),
 PRJ('av-p10', 'Proyecto: osciloscopio de bolsillo', 'av_scope'),
 PRJ('av-p11', 'Proyecto: cubo LED 4×4×4 por SPI', 'av_cube'),
 PRJ('av-p12', 'Proyecto: controlador MIDI', 'av_midi')
] },

{ id: 'av-m6', title: 'Energía y fiabilidad', desc: 'Modos de sueño, despertar, BOD, reinicios y cómo hacer que unas pilas duren años.', nodes: [
 L('av29', 'Modos de sueño', 'sleep', ['av_sleep'], [
  I('El 328P puede dormir: para los relojes que no necesitas y gasta muchísimo menos. <b>SMCR</b> elige el modo (SM2:0) y lo habilita (SE); la instrucción <b>sleep</b> lo duerme. En C: set_sleep_mode(), sleep_enable() y sleep_cpu().'),
  { t: 'match', q: 'Une cada modo con lo que sigue funcionando.', pairs: [['Idle', 'CPU parada; temporizadores, USART y ADC siguen'], ['ADC Noise Reduction', 'Casi solo el ADC: medidas limpias'], ['Power-down', 'Todo parado salvo watchdog y despertares externos'], ['Power-save', 'Como power-down, pero el Timer2 asíncrono sigue']] },
  I('Cifras típicas de la hoja de datos (3 V, 25 °C) en power-down: unos <b>0,1 µA</b> con el watchdog apagado y unos 4 µA con él encendido. Despierto a 16 MHz y 5 V, del orden de 10 mA: unas cinco órdenes de magnitud de diferencia.'),
  Q('El Timer2 con un cristal de reloj de 32 768 Hz debe seguir contando mientras duerme. ¿Modo?', ['Power-save', 'Power-down', 'Idle', 'ADC Noise Reduction'], 'Power-save mantiene el Timer2 asíncrono.'),
  I('<b>PRR</b> (Power Reduction Register) apaga el reloj de los periféricos que no usas, también despierto: PRADC, PRUSART0, PRSPI, PRTWI, PRTIM0, PRTIM1 y PRTIM2. Antes de dormir apaga también el ADC (ADEN = 0) y el comparador (ACD = 1).'),
  Q('Duermes en power-down pero mides 300 µA. Sospechoso habitual:', ['El ADC sigue encendido (ADEN = 1) o hay entradas flotando', 'El cristal', 'El watchdog', 'Nada: es normal'], 'El ADC encendido gasta aunque no convierta.'),
  Q('¿Por qué gastan las entradas digitales que flotan?', ['El buffer de entrada queda a media tensión y conduce corriente: pon pull-ups o salidas fijas', 'Son antenas que emiten', 'Se calientan las patas', 'No gastan'], 'Las dos mitades del inversor CMOS conducen a la vez.'),
  { t: 'order', q: 'Ordena la secuencia para dormir.', items: ['Configurar la fuente de despertar', 'Apagar el ADC y lo que no haga falta', 'set_sleep_mode(SLEEP_MODE_PWR_DOWN)', 'sleep_enable() y sei()', 'sleep_cpu()', 'Al despertar: sleep_disable() y restaurar'], e: 'sei() justo antes de sleep_cpu() garantiza que se duerme antes de atender la interrupción.' },
  Q('Al despertar de power-down con el cristal de 16 MHz de Arduino, el chip tarda en arrancar…', ['Unos 16 000 ciclos (1 ms) a que el cristal se estabilice; con el RC interno, solo 6 ciclos', 'Nada', 'Un segundo', 'Siempre 65 ms'], 'Lo fijan los fusibles SUT y CKSEL.'),
  Q('sleep_bod_disable() justo antes de dormir…', ['Apaga el detector de baja tensión mientras duerme y ahorra unos 20 µA', 'Desactiva el watchdog', 'Reinicia el chip', 'Sube el reloj'], 'Al despertar, el BOD vuelve a funcionar.')
 ]),
 L('av30', 'Despertar: interrupciones y watchdog', 'sleep', ['av_sleep'], [
  I('Solo algunas cosas despiertan de power-down: INT0/INT1 <b>por nivel bajo</b>, cualquier PCINT, la coincidencia de dirección TWI y el watchdog. Las de flanco de INT0/INT1 necesitan reloj, y en power-down no hay.'),
  Q('Un pulsador en PD3 debe despertar al chip de power-down. Configuras…', ['INT1 por nivel bajo, o PCINT19', 'INT1 por flanco de bajada', 'El Timer1', 'La USART'], 'PD3 es INT1 y también PCINT19.'),
  I('El <b>watchdog en modo interrupción</b> (WDIE = 1, WDE = 0) es un despertador: cada 16 ms a 8 s salta WDT_vect y el chip despierta. Para periodos más largos, cuentas despertares.'),
  Nm('¿Cuántos despertares de 8 s hacen falta para medir cada 10 minutos?', 75, '', '600 / 8 = 75.'),
  Q('¿Qué tal es el watchdog como reloj?', ['Malo: su oscilador de 128 kHz varía con la tensión y la temperatura; para horas exactas, un RTC', 'Excelente', 'Igual que un cristal', 'Depende del prescaler'], 'Sirve para “más o menos cada 8 s”.'),
  I('Despertador de 8 s con el watchdog:', { code: 'ISR(WDT_vect) { }                       // solo despierta\n\nvoid watchdog8s(void) {\n  cli();\n  MCUSR &= ~(1 << WDRF);\n  WDTCSR = (1 << WDCE) | (1 << WDE);     // abre la ventana de 4 ciclos\n  WDTCSR = (1 << WDIE) | (1 << WDP3) | (1 << WDP0);  // interrupción, 8 s\n  sei();\n}' }),
  Q('¿Por qué cambiar WDTCSR exige escribir WDCE y WDE juntos y el valor nuevo en 4 ciclos?', ['Para que un programa descontrolado no pueda apagar el watchdog por accidente', 'Para ir más rápido', 'Por el bootloader', 'Es opcional'], 'Una secuencia así no ocurre por casualidad.'),
  Q('Despiertas con el PCINT de un pulsador. La ISR de ese PCINT…', ['Debe existir aunque esté vacía, o el salto irá a __bad_interrupt', 'No hace falta', 'Debe ser larga', 'Debe volver a dormir'], 'Una ISR vacía basta para despertar.', { c: 'av_isr' }),
  Q('Compruebas “¿hay trabajo?”, ves que no y vas a dormir, pero la interrupción llega justo entre medias. ¿Riesgo y solución?', ['Dormir sin atenderla hasta el siguiente despertar: haz cli(), comprueba y luego sei(); sleep_cpu(); seguidos', 'Ninguno', 'Se reinicia', 'Se pierde el watchdog'], 'La instrucción que sigue a sei() se ejecuta siempre antes de cualquier interrupción.', { c: 'av_isr' }),
  { t: 'order', q: 'Ordena un ciclo de medida de un aparato a pilas.', items: ['Despertar por el watchdog', 'Encender el sensor y esperar a que se estabilice', 'Medir y guardar', 'Apagar el sensor', 'Volver a dormir'], e: 'Todo lo que no mide, apagado.' }
 ]),
 L('av31', 'BOD, reinicios y fiabilidad', 'shield', ['av_sleep'], [
  I('El <b>BOD</b> (Brown-Out Detector) mantiene el chip en reinicio si VCC baja de un umbral elegido con los fusibles BODLEVEL: 1,8, 2,7 o 4,3 V. Sin él, con tensión baja la CPU puede ejecutar mal y corromper la EEPROM o la Flash.'),
  Q('Chip a 16 MHz alimentado a 5 V. ¿Qué nivel de BOD tiene más sentido?', ['4,3 V: por debajo de unos 3,8 V, 16 MHz ya está fuera de especificación', '1,8 V', 'Apagado', '2,7 V, para que dure más'], 'Arduino usa 2,7 V, que es optimista para 16 MHz.'),
  I('<b>MCUSR</b> guarda la causa del último reinicio: PORF (encendido), EXTRF (pata RESET), BORF (baja tensión) y WDRF (watchdog). Léelo al arrancar y bórralo: te dice si tu sistema se reinicia “solo” y por qué. Ojo: algunos bootloaders lo borran antes de que tu programa lo vea.'),
  { t: 'bits', q: 'MCUSR tras un brown-out seguido de un reinicio por watchdog, sin borrar: BORF (bit 2) y WDRF (bit 3).', n: 8, target: 12, e: '4 + 8 = 12.', c: 'av_bits' },
  Q('Ves BORF a 1 cada vez que arranca un motor.', ['La tensión cae al arrancar el motor: alimentación separada, condensadores y masas bien llevadas', 'El watchdog está mal configurado', 'El código es lento', 'Falta volatile'], 'El pico de arranque hunde la alimentación.'),
  Q('¿Dónde pones wdt_reset() para que el watchdog sea una red de seguridad de verdad?', ['En un único punto del bucle principal que solo se alcanza si todo va bien', 'En la ISR de un temporizador', 'Dentro de cada función', 'En setup()'], 'En una ISR seguiría acariciándolo aunque loop() estuviera colgado.'),
  Q('La pata RESET capta ruido y el chip se reinicia a veces. ¿Qué pones?', ['Pull-up de 10 kΩ a VCC y, si hace falta, un condensador pequeño a masa', 'Nada', 'Una resistencia de 1 MΩ en serie', 'Un LED'], 'Sin pull-up firme, RESET es una antena.'),
  Q('Una variable debe sobrevivir a un reinicio por watchdog sin usar la EEPROM. ¿Dónde?', ['En la sección .noinit: el arranque no la pone a cero', 'En .data', 'En la pila', 'Es imposible'], '__attribute__((section(".noinit"))). Tras un corte de alimentación, su valor es basura.', { c: 'av_mem' }),
  Q('Desacoplo del 328P:', ['100 nF entre cada VCC/AVCC y su GND, pegados al chip', 'Uno solo para todo', '1000 µF', 'Ninguno'], 'Cada pareja de alimentación, su condensador.'),
  Q('¿Qué hace el fusible WDTON?', ['Deja el watchdog siempre activado: el programa no puede apagarlo', 'Apaga el watchdog', 'Activa el BOD', 'Acelera el watchdog'], 'Para sistemas donde un cuelgue no es aceptable.', { c: 'av_isp' })
 ]),
 L('av32', 'Presupuesto de batería', 'bat', ['av_sleep'], [
  I('<b>Consumo medio</b> = (I despierto × t despierto + I dormido × t dormido) / periodo.\n<b>Autonomía</b> = capacidad / consumo medio.\nCasi siempre manda la corriente <b>dormido</b>.'),
  I('Explora: cambia cada parámetro y mira qué manda en la autonomía.', { tune: { viz: 'av_sleep', params: sleepP() } }),
  TU('Con una pila CR2032 (220 mAh), consigue más de un año.', 'av_sleep', sleepP(220), { q: 'years', min: 1, max: 1e9, text: 'Objetivo: más de 1 año', hint: 'Baja la corriente dormido a unos µA y despierta menos a menudo.' }, 'Necesitas una media por debajo de 25 µA.'),
  G('av_sleepLife'), G('av_sleepLife'),
  I('Una placa Uno no sirve para pilas: aunque el 328P duerma, el ATmega16U2 del USB, el regulador y el LED de encendido siguen gastando decenas de mA. Para pilas: chip suelto, o una placa mínima sin LED ni regulador.'),
  Q('Una Uno “dormida” gasta unos 25 mA. Con 2500 mAh dura…', ['Unos 4 días', 'Un año', 'Diez años', 'Una hora'], '2500 / 25 = 100 h.'),
  Q('Las pilas se autodescargan y rinden menos con frío y con picos de corriente. Por eso…', ['Aplica un margen: cuenta, por ejemplo, con el 70–80 % de la capacidad nominal', 'Ignóralo', 'Duplica la tensión', 'Usa más corriente'], 'La capacidad nominal es en condiciones ideales.'),
  Q('Una CR2032 tiene mucha resistencia interna. Un pico de 20 mA (un LED o una radio)…', ['Hace caer su tensión y puede provocar un brown-out: pon un condensador grande en paralelo', 'No le afecta', 'La recarga', 'Sube su tensión'], 'El condensador entrega el pico.'),
  Nm('Duerme con 3 µA y cada 8 s despierta 2 ms gastando 5 mA. ¿Corriente media, en µA?', 4.25, 'µA', '(5000 µA × 0,002 s + 3 µA × 7,998 s) / 8 s ≈ 4,25 µA.', { tol: 0.1 }),
  Q('Para medir µA con el multímetro en serie, cuidado con…', ['Su caída de tensión en los rangos bajos, que al despertar puede hacer caer el chip', 'Nada', 'Que mide alterna', 'Que se descalibra'], 'Puentea el multímetro mientras despierta o usa un medidor específico.')
 ]),
 PRJ('av-p13', 'Proyecto: registrador a pilas que dura más de un año', 'av_logger')
] },

{ id: 'av-m7', title: 'El chip fuera de la placa', desc: 'Arduino en protoboard, fusibles, bootloader, programación ISP y el ATtiny85.', nodes: [
 L('av33', 'Arduino en protoboard', 'bb', ['av_isp'], [
  I('Una Uno es, en el fondo, un 328P con su reloj, su reset y su alimentación. En protoboard necesitas:\n· VCC (7) y AVCC (20) a 5 V; GND (8 y 22) a masa.\n· Cristal de 16 MHz entre las patas 9 y 10, con 22 pF de cada una a masa.\n· 10 kΩ de RESET (1) a VCC.\n· 100 nF de desacoplo en cada pareja de alimentación.'),
  { t: 'order', q: 'Ordena un montaje seguro.', items: ['Chip a caballo de la ranura, muesca a la izquierda', 'Alimentación, masas y desacoplo', 'Pull-up de RESET', 'Cristal y sus condensadores', 'Medir tensiones antes de programar'], e: 'Primero lo que da vida al chip, luego el reloj.' },
  Q('¿Por qué conectar AVCC aunque no uses el ADC?', ['Alimenta también el puerto C: sin ella, PC0–PC5 no funcionan bien', 'Es opcional', 'Es para el cristal', 'Para el USB'], 'La hoja de datos pide AVCC conectada y cerca de VCC.'),
  Q('¿Para qué sirven los dos condensadores de 22 pF del cristal?', ['Son la capacidad de carga que el cristal necesita para oscilar a su frecuencia', 'Desacoplo', 'Filtro de audio', 'Protección contra descargas'], 'El valor exacto depende del cristal; 22 pF es lo típico.'),
  Q('Un 328P nuevo, de fábrica, arranca…', ['Con el RC interno de 8 MHz dividido entre 8: a 1 MHz', 'A 16 MHz con cristal', 'A 20 MHz', 'Sin reloj'], 'Hasta que cambies los fusibles, ignora el cristal.'),
  I('Para cargar por USB necesitas el bootloader grabado y un adaptador USB–serie (CH340, CP2102, FTDI) en RX/TX, más el truco del <b>auto-reset</b>: la línea DTR, a través de 100 nF, da un pulso en RESET justo antes de cargar.'),
  { t: 'match', q: 'Une cada conexión del adaptador USB–serie.', pairs: [['TX del adaptador', 'RXD, pata 2'], ['RX del adaptador', 'TXD, pata 3'], ['DTR del adaptador', '100 nF a RESET (pata 1)'], ['D13 de Arduino', 'Pata 19 (PB5)']] },
  Q('El IDE dice “not in sync” al cargar en tu Arduino de protoboard. Primer sospechoso:', ['No hay bootloader, o falla el auto-reset (el condensador de DTR)', 'Un cristal de 8 MHz', 'AVCC', 'El LED'], 'Sin bootloader nadie responde al IDE.'),
  Nm('¿En qué pata del DIP-28 está D2 (PD2)?', 4, '', 'Pata 1 RESET, 2 PD0, 3 PD1, 4 PD2.'),
  Q('¿Para qué un diodo entre RESET y VCC (cátodo a VCC)?', ['Evita que el pulso de DTR a través del condensador lleve RESET por encima de VCC', 'Es obligatorio para arrancar', 'Sirve de indicador', 'Invierte el reset'], 'La Uno también lo lleva.')
 ]),
 L('av34', 'Fusibles sin miedo', 'shield', ['av_isp'], [
  I('Los <b>fusibles</b> son tres bytes de configuración que se graban por ISP y tu programa no puede cambiar: <b>low</b> (reloj), <b>high</b> (arranque y protecciones) y <b>extended</b> (BOD). Atención: un bit a <b>0 significa programado</b> (activo).'),
  { t: 'match', q: 'Une cada grupo de fusibles con lo que controla.', pairs: [['CKSEL3:0 y SUT1:0', 'Fuente de reloj y tiempo de arranque'], ['CKDIV8', 'Dividir el reloj entre 8'], ['BOOTRST y BOOTSZ', 'Si arranca en el bootloader y su tamaño'], ['BODLEVEL', 'Umbral de baja tensión']] },
  I('Valores de la Uno: low <b>0xFF</b> (cristal externo, sin dividir), high <b>0xDE</b> (bootloader de 512 bytes, arranca en él, ISP activado), extended <b>0xFD</b> (BOD a 2,7 V). De fábrica: 0x62, 0xD9 y 0xFF.'),
  Q('High = 0xDE = 1101 1110. El bit 0 (BOOTRST) vale 0. Significa…', ['Programado: tras un reinicio salta al bootloader', 'Desactivado', 'Borra el chip', 'BOD apagado'], '0 = activo.'),
  { t: 'bits', q: 'Fusible low para el RC interno de 8 MHz sin dividir: 0xE2. Márcalo.', n: 8, target: 226, e: '0xE2 = 1110 0010: CKDIV8 sin programar (1) y CKSEL = 0010.', c: 'av_isp' },
  I('Fusibles peligrosos:\n· <b>RSTDISBL</b>: RESET pasa a ser una E/S y el ISP deja de funcionar.\n· <b>SPIEN</b> a 1: desactiva el ISP.\n· Un <b>CKSEL</b> de reloj externo sin reloj: el chip no arranca hasta que le des una señal de reloj.\nLos dos primeros solo se arreglan con un programador de alta tensión.'),
  Q('Grabas por error CKSEL para cristal y tu protoboard no lo tiene.', ['Pon un cristal (o inyecta un reloj en XTAL1) y podrás volver a programar por ISP', 'El chip ha muerto', 'Déjalo un día sin alimentación', 'Pulsa reset muchas veces'], 'Sin reloj no hay ISP, pero se recupera fácil.'),
  Q('La opción “Grabar bootloader” del IDE…', ['También graba los fusibles de la placa elegida: revisa siempre placa y reloj antes de pulsar', 'Es peligrosa siempre', 'No toca los fusibles', 'Borra solo la EEPROM'], 'Una placa equivocada puede dejar el chip esperando un cristal.'),
  Q('EESAVE programado (0) sirve para…', ['Conservar la EEPROM al borrar el chip por ISP', 'Proteger la Flash', 'Ahorrar energía', 'Acelerar la EEPROM'], 'Útil para no perder calibraciones al reprogramar.'),
  Q('CKOUT programado…', ['Saca el reloj del sistema por PB0 (CLKO): lo puedes ver con el osciloscopio', 'Apaga el reloj', 'Duplica la frecuencia', 'Activa el cristal'], 'Muy útil para comprobar a qué frecuencia va el chip.'),
  Q('¿Puede tu programa cambiar los fusibles?', ['No: puede leerlos, pero solo se graban con un programador', 'Sí, con un registro', 'Sí, con la EEPROM', 'Solo el bootloader'], 'Así un error de software no te deja el chip inservible.')
 ]),
 L('av35', 'Bootloader y programación ISP', 'chip', ['av_isp'], [
  I('El <b>bootloader</b> (Optiboot en la Uno, 512 bytes al final de la Flash) se ejecuta al reiniciar por la pata RESET, escucha el puerto serie un instante y, si llega un programa, lo graba con la instrucción SPM (autoprogramación). Si no llega nada, salta a tu código.'),
  I('<b>ISP</b> (In-System Programming) programa el chip directamente por SPI manteniendo RESET a 0: MOSI, MISO, SCK, RESET, VCC y GND. Escribe Flash, EEPROM y fusibles, no necesita bootloader… y lo borra si estaba.'),
  { t: 'match', q: 'Une cada señal ISP con su pata del DIP-28.', pairs: [['MISO', 'Pata 18 (PB4)'], ['SCK', 'Pata 19 (PB5)'], ['MOSI', 'Pata 17 (PB3)'], ['RESET', 'Pata 1 (PC6)']] },
  Q('Cargas un programa en tu Uno con “Subir usando programador”.', ['Funciona, pero borra el bootloader: ya no podrás subir por USB hasta volver a grabarlo', 'No funciona', 'Conserva el bootloader', 'Graba solo la EEPROM'], 'El ISP borra toda la Flash antes de escribir.'),
  I('Programadores: <b>USBasp</b> (barato), <b>Arduino as ISP</b> (otra Uno con el ejemplo ArduinoISP: D10 → RESET del destino, D11 → MOSI, D12 → MISO, D13 → SCK) o herramientas comerciales como el Atmel-ICE.'),
  Q('¿Para qué un condensador de 10 µF entre RESET y GND de la Uno que hace de Arduino as ISP?', ['Para que no se reinicie ella misma cuando avrdude abre el puerto', 'Para filtrar ruido', 'Para alimentar al destino', 'Para el cristal'], 'Así ignora el pulso de DTR.'),
  Q('avrdude lee la firma 0x1E 0x95 0x0F. Es un…', ['ATmega328P', 'ATmega328 (sin P)', 'ATtiny85', 'ATmega2560'], 'El 328 sin P da 1E 95 14 y el ATtiny85, 1E 93 0B.'),
  Q('Un chip nuevo a 1 MHz no responde por ISP. ¿Qué pruebas?', ['Bajar la velocidad del ISP: SCK debe ser menor que 1/4 del reloj del chip', 'Subir la tensión', 'Cambiar el cristal', 'Borrar la EEPROM'], 'Con avrdude, la opción -B alarga el periodo de SCK.'),
  Q('Al pulsar RESET, tu programa tarda un instante en empezar. Es…', ['El bootloader esperando por si llega un programa nuevo', 'Un fallo', 'El cristal arrancando', 'El BOD'], 'Optiboot no espera tras el encendido, solo tras un reset externo.'),
  Q('¿Ventaja de no llevar bootloader en un producto terminado?', ['Arranca al instante, recuperas 512 bytes y nadie lo reprograma por el puerto serie por accidente', 'Es más fácil de actualizar', 'Gasta más', 'Ninguna'], 'A cambio, para actualizar necesitas el programador.')
 ]),
 L('av36', 'ATtiny85: un AVR de 8 patas', 'ic', ['av_core'], [
  I('El <b>ATtiny85</b> es un AVR en DIP-8: 8 KB de Flash, 512 bytes de SRAM y 512 de EEPROM, hasta 6 E/S (PB0–PB5, aunque PB5 es RESET), dos temporizadores de 8 bits, ADC de 10 bits y oscilador interno de 8 MHz.'),
  { t: 'match', q: 'Une cada pata del ATtiny85.', pairs: [['Pata 1', 'PB5 / RESET'], ['Pata 4', 'GND'], ['Pata 8', 'VCC'], ['Pata 5', 'PB0 (MOSI, OC0A)']] },
  Q('¿Qué le falta frente al 328P?', ['USART, SPI y TWI de hardware: tiene una USI genérica con la que se emulan', 'El ADC', 'Los temporizadores', 'Las interrupciones'], 'La USI hace SPI e I²C con ayuda del software.'),
  I('Se programa por ISP (Arduino as ISP o USBasp) y, en el IDE, con un núcleo como ATTinyCore. Tu C con registros funciona casi igual, pero cambian nombres: el watchdog es <b>WDTCR</b> y las interrupciones externas se activan en <b>GIMSK</b>.'),
  Q('Tu código del 328P usa Serial. En el ATtiny85…', ['No hay USART: el núcleo ofrece una serie por software, más limitada', 'Funciona igual', 'Nunca compila', 'Va más rápido'], 'Sin hardware, todo lo hace la CPU.'),
  Q('Consumo del ATtiny85 en power-down con el watchdog apagado:', ['Del orden de 0,1 µA, como el 328P', '10 mA', '1 mA', '100 µA'], 'Ideal para pilas de botón.', { c: 'av_sleep' }),
  Nm('ATtiny85 a 1 MHz: ¿cuántos ciclos de reloj hay en un milisegundo?', 1000, 'ciclos', '1 000 000 × 0,001.'),
  Q('¿Puedes alimentar un ATtiny85 a 8 MHz con una CR2032?', ['Sí, mientras la pila esté por encima de 2,7 V; para apurarla, el ATtiny85V llega a 1,8 V a 4 MHz o menos', 'No, nunca a 3 V', 'Solo a 20 MHz', 'Solo con regulador'], 'El ATtiny85 normal pide 2,7 V como mínimo.'),
  Q('Quieres usar PB5 (RESET) como E/S.', ['Fusible RSTDISBL: perderás el ISP y solo un programador de alta tensión lo recupera', 'Basta con DDRB', 'Es imposible', 'Con el bootloader'], 'Hazlo solo con el programa definitivo.', { c: 'av_isp' })
 ]),
 SIM('av-s6', 'Reto: las patas del ISP', 'El semáforo usa D10, D11 y D12: PB2, PB3 y PB4, que son SS, MOSI y MISO, las mismas patas del ISP. Monta las tres luces en esas patas de la Nano, cada una con su resistencia.', { arduino: 'semaforo', board: 'nano', parts: ['res', 'led'], code: true, hint: 'Rojo en D12 (PB4), ámbar en D11 (PB3) y verde en D10 (PB2), cada uno con su resistencia a GND.' }, 'av_isp3'),
 PRJ('av-p14', 'Proyecto: Arduino casero en protoboard', 'av_proto'),
 PRJ('av-p15', 'Proyecto: llavero luciérnaga con ATtiny85', 'av_tiny')
] },

{ id: 'av-m8', title: 'Herramientas de profesional', desc: 'avr-gcc y avrdude sin IDE, Makefile, .map y .lst, ensamblador y depuración sin depurador.', nodes: [
 L('av37', 'avr-gcc y avrdude sin IDE', 'code', ['av_tool'], [
  I('El IDE de Arduino esconde una cadena de herramientas: <b>avr-gcc</b> compila, <b>avr-objcopy</b> extrae el .hex y <b>avrdude</b> lo graba. Puedes usarlas tú desde la terminal, con control total.'),
  I('Las cuatro órdenes básicas:', { code: 'avr-gcc -mmcu=atmega328p -DF_CPU=16000000UL -Os -Wall -o main.elf main.c\navr-objcopy -O ihex -R .eeprom main.elf main.hex\navr-size main.elf\navrdude -c arduino -p m328p -P COM5 -b 115200 -U flash:w:main.hex:i' }),
  { t: 'order', q: 'Ordena el flujo de trabajo.', items: ['Escribir main.c', 'Compilar y enlazar en main.elf', 'Extraer main.hex', 'Grabar con avrdude', 'Comprobar que funciona'], e: 'El .elf tiene todo; el .hex, solo lo que se graba.' },
  Q('¿Qué indica -mmcu=atmega328p?', ['Para qué chip compilar: registros, memorias y vectores', 'La velocidad', 'El puerto COM', 'El programador'], 'Con otro valor, los nombres de registros cambian.'),
  Q('¿Y -DF_CPU=16000000UL?', ['Define la frecuencia para que _delay_ms y los cálculos de baudios cuadren', 'Cambia el cristal', 'Graba los fusibles', 'Nada'], 'Es solo una constante para el compilador.'),
  { t: 'match', q: 'Une cada opción de avrdude con su significado.', pairs: [['-c arduino', 'Bootloader de la Uno'], ['-c usbasp', 'Programador USBasp'], ['-c stk500v1 -b 19200', 'Arduino as ISP'], ['-U lfuse:w:0xFF:m', 'Escribe el fusible low']] },
  I('Un main() de AVR no tiene setup() ni loop(): inicializas y entras tú en un bucle infinito. Sin la capa de Arduino no hay millis()… a menos que lo programes con un temporizador, que ya sabes.'),
  { t: 'pin', q: '¿Qué pin de la Uno parpadea con este programa?', code: '#include <avr/io.h>\n#include <util/delay.h>\n\nint main(void) {\n  DDRB |= (1 << PB0);\n  for (;;) {\n    PINB = (1 << PB0);\n    _delay_ms(250);\n  }\n}', a: 'D8', e: 'PB0 = D8.', c: 'av_ports' },
  Q('_delay_ms(n) con una variable n en lugar de una constante…', ['Da error o un retardo erróneo: necesita una constante; en un bucle, llama a _delay_ms(1) n veces', 'Funciona igual', 'Es más rápido', 'Hace el retardo en segundos'], 'El retardo se calcula al compilar.'),
  Q('¿Qué muestra avr-size?', ['Cuánto ocupan .text, .data y .bss', 'Reduce el programa', 'Graba el chip', 'Cuenta líneas de código'], 'Lo verás a fondo en la siguiente lección.')
 ]),
 L('av38', 'Makefile, .map y .lst', 'code', ['av_tool'], [
  I('Un <b>Makefile</b> guarda las órdenes y solo recompila lo que ha cambiado. Escribes make y make flash en vez de líneas larguísimas.', { code: 'MCU    = atmega328p\nCFLAGS = -mmcu=$(MCU) -DF_CPU=16000000UL -Os -Wall\nOBJ    = main.o pantalla.o\n\nmain.hex: main.elf\n\tavr-objcopy -O ihex -R .eeprom main.elf main.hex\n\nmain.elf: $(OBJ)\n\tavr-gcc -mmcu=$(MCU) -o $@ $^\n\n%.o: %.c\n\tavr-gcc $(CFLAGS) -c $< -o $@\n\nflash: main.hex\n\tavrdude -c arduino -p m328p -P COM5 -b 115200 -U flash:w:main.hex:i' }),
  Q('Cambias solo pantalla.c y ejecutas make…', ['Recompila pantalla.o y vuelve a enlazar: no toca los demás .o', 'Recompila todo', 'No hace nada', 'Borra el .hex'], 'make compara fechas de archivos.'),
  I('<b>avr-size</b>: text = código y constantes en Flash; data = variables con valor inicial (ocupan Flash y SRAM); bss = variables a cero (solo SRAM).\nFlash usada = text + data. SRAM estática = data + bss.'),
  Nm('avr-size: text 4210, data 86, bss 412. ¿SRAM estática?', 498, 'bytes', '86 + 412.'),
  Nm('¿Y Flash usada?', 4296, 'bytes', '4210 + 86: los valores iniciales de .data también viven en la Flash.'),
  I('El <b>.map</b> (con -Wl,-Map=main.map) dice dónde ha ido cada función y variable y cuánto ocupa: así encuentras quién se come la RAM. El <b>.lst</b> (avr-objdump -d -S main.elf) mezcla tu C con el ensamblador generado.'),
  Q('-ffunction-sections -fdata-sections junto con -Wl,--gc-sections…', ['Pone cada función en su sección y el enlazador elimina las que nadie usa', 'Hace el código más rápido', 'Activa la depuración', 'Rompe el bootloader'], 'Arduino lo hace por ti.'),
  Q('En el .map ves una tabla de 600 bytes en .data. ¿Arreglo?', ['Hacerla const y PROGMEM: pasa a la Flash y libera 600 bytes de SRAM', 'Hacerla volatile', 'Hacerla static', 'Nada'], 'Las constantes no necesitan RAM.', { c: 'av_mem' }),
  Q('-Os frente a -O2 en AVR:', ['-Os prioriza el tamaño, lo habitual con poca Flash; -O2 puede ir algo más rápido pero ocupa más', '-O2 siempre ocupa menos', 'Son iguales', '-Os desactiva la optimización'], 'Arduino compila con -Os.'),
  Q('En un Makefile, la línea de la orden debe empezar por…', ['Un tabulador', 'Cuatro espacios', 'Un punto y coma', 'Nada en especial'], 'El error “missing separator” suele ser esto.')
 ]),
 L('av39', 'Ensamblador AVR para leerlo', 'code', ['av_tool'], [
  I('No hace falta escribir en ensamblador, pero leerlo en el .lst te dice qué hace de verdad tu C. Las más comunes: ldi (cargar constante), mov, add/sub, and/or/eor, in/out (E/S), lds/sts (SRAM), sbi/cbi (un bit de E/S), rjmp/rcall/ret y brne/breq (saltos condicionales).'),
  { t: 'match', q: 'Une cada instrucción con lo que hace.', pairs: [['ldi r24, 0x20', 'Carga 0x20 en r24'], ['out 0x05, r24', 'Escribe r24 en PORTB'], ['sbi 0x05, 5', 'Pone a 1 el bit 5 de PORTB'], ['brne bucle', 'Salta si el resultado no fue cero']] },
  Q('¿Qué hace este fragmento a 16 MHz?', ['Pone PB5 como salida y la conmuta sin parar a 2 MHz', 'Lee PB5', 'Enciende D13 y lo deja fijo', 'Pone PB3 a 1'], '0x04 es DDRB y 0x03 es PINB: sbi en PINB conmuta. 2 + 2 ciclos por conmutación.', { code: '        sbi  0x04, 5\nbucle:  sbi  0x03, 5\n        rjmp bucle' }),
  I('Direcciones: in, out, sbi y cbi usan direcciones de E/S (PORTB = 0x05); lds y sts, las de datos (PORTB = 0x25). Hay 0x20 de diferencia por los 32 registros que van delante.'),
  Q('TCCR1B está en la dirección de datos 0x81. ¿Se puede usar sbi con él?', ['No: sbi y cbi solo llegan a las E/S 0x00–0x1F; hace falta lds, ori, sts', 'Sí', 'Solo con cli', 'Sí, con out'], 'Por eso tocar bits de TCCR1B no es atómico.'),
  Nm('ldi r24, 100 y luego dec r24 / brne bucle hasta 0. ¿Cuántos ciclos en total? (ldi 1, dec 1, brne 2 si salta y 1 si no)', 300, 'ciclos', '1 + 100 + 99 × 2 + 1 = 300.'),
  I('Convención de avr-gcc: r1 vale siempre 0 y r0 es temporal; los argumentos llegan en r24, r22… (de dos en dos, hacia abajo) y un resultado de 8 bits vuelve en r24. Una ISR empieza guardando SREG, r0 y r1: ese es el prólogo que añade latencia.'),
  Q('En el .lst de una ISR ves 12 push al principio y 12 pop al final. ¿Qué te dice?', ['Que usa muchos registros: prólogo y epílogo cuestan unos 50 ciclos; simplifícala o saca trabajo fuera', 'Que está mal compilada', 'Que es normal y no cuesta nada', 'Que tiene un bucle'], 'push y pop tardan 2 ciclos cada uno.', { c: 'av_isr' }),
  Q('if (PINB & 0x01) se compiló como sbis 0x03, 0. ¿Qué hace sbis?', ['Salta la siguiente instrucción si el bit 0 de PINB está a 1', 'Pone a 1 el bit', 'Lee el byte entero', 'Compara con 3'], 'Skip if Bit in I/O is Set.'),
  G('av_cycles'),
  Q('¿Por qué un uint8_t suele dar código más corto que un int en AVR?', ['Las operaciones de 8 bits son una instrucción; las de 16, dos o más', 'Porque ocupa menos Flash el nombre', 'No hay diferencia', 'Porque int es float'], 'La CPU es de 8 bits.', { c: 'av_core' })
 ]),
 L('av40', 'Optimizar y depurar sin depurador', 'meter', ['av_tool'], [
  I('Sin depurador paso a paso, tus herramientas son: Serial (cómodo, pero lento y con efectos secundarios), <b>pines de traza</b> (una pata que sube y baja en puntos clave, medida con osciloscopio o analizador lógico) y LEDs de estado.'),
  Q('¿Por qué un Serial.print() puede hacer que un error desaparezca?', ['Cambia los tiempos del programa: el fallo dependía del orden o de la velocidad', 'Arregla la memoria', 'Reinicia el chip', 'Nunca pasa'], 'Los errores de tiempo son tímidos.'),
  Nm('Cada carácter a 115 200 baudios (8N1) tarda, en µs…', 86.8, 'µs', '10 bits / 115 200 ≈ 86,8 µs.', { tol: 0.5 }),
  I('Un <b>analizador lógico</b> barato de 8 canales y 24 MHz, con PulseView, decodifica UART, SPI e I²C y te enseña cuánto dura cada ISR si marcas su entrada y su salida con una pata.'),
  Q('Quieres saber qué porcentaje de CPU gasta tu ISR. Con un pin de traza…', ['Mides el ciclo de trabajo del pin: a 1 dentro de la ISR y a 0 fuera', 'Cuentas instrucciones a mano', 'Con millis()', 'Es imposible'], 'El multímetro en V⎓ incluso te da una media.'),
  I('Optimiza con cabeza: primero mide. Luego: tipos pequeños (uint8_t en vez de int), evitar float y divisiones, tablas precalculadas en PROGMEM y desplazamientos en vez de multiplicar o dividir por potencias de 2.'),
  Q('Dividir un uint16_t entre 16. ¿Lo más rápido?', ['x >> 4 (el compilador lo hace solo si x no tiene signo y el divisor es constante)', 'Convertir a float y dividir', 'Llamar a una función', 'Un bucle de restas'], 'Un desplazamiento son unas pocas instrucciones.'),
  Q('El 328P multiplica 8 × 8 bits por hardware en 2 ciclos. Pero no tiene…', ['Divisor: las divisiones son rutinas de software lentas', 'Sumador', 'Registros', 'Saltos'], 'Una división de 32 bits cuesta cientos de ciclos.'),
  Q('debugWIRE en el 328P…', ['Permite depurar paso a paso por la pata RESET con una herramienta compatible, pero inutiliza el reset normal y en la Uno exige cortar una pista', 'No existe', 'Es el bootloader', 'Es el ISP'], 'Se activa con el fusible DWEN.', { c: 'av_isp' }),
  { t: 'order', q: 'Ordena un método para cazar un fallo intermitente.', items: ['Reproducirlo de forma fiable', 'Anotar síntomas y la causa del último reinicio (MCUSR)', 'Poner pines de traza en los puntos sospechosos', 'Cambiar una sola cosa cada vez', 'Comprobar que el arreglo aguanta horas'], e: 'Sin reproducirlo, no sabrás si lo has arreglado.' }
 ]),
 PRJ('av-p16', 'Proyecto: robot siguelíneas con PID', 'av_robot'),
 PRJ('av-p17', 'Proyecto final: laboratorio de bolsillo en PCB propia', 'av_final')
] }
    ]
  });
})();
