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
    /* ---- Núcleo, reloj y aritmética ---- */
    av_core: { name: 'Arquitectura del núcleo AVR', alts: [
      { title: 'La cocina', text: 'Piensa en el chip como una cocina. La <b>Flash</b> es el recetario, la <b>SRAM</b> la despensa y los <b>32 registros</b> (R0–R31) la encimera. La <b>ALU</b> solo cocina sobre la encimera: para sumar dos variables, primero se traen de la despensa (lds), se opera (add) y se devuelve el resultado (sts). <b>SREG</b> es la libreta donde queda apuntado si el resultado fue cero, negativo o tuvo acarreo, y el permiso de interrupciones.', q: mcq('¿Dónde hace sus operaciones la ALU de un AVR?', ['Sobre los registros R0–R31', 'Directamente sobre la SRAM', 'Sobre la Flash', 'Sobre la EEPROM'], 'Arquitectura de carga y almacenamiento: los datos pasan por los registros.') },
      { title: 'Dos carreteras', text: 'En la arquitectura <b>Harvard</b> el programa (Flash) y los datos (SRAM) viajan por carreteras distintas. Mientras la CPU ejecuta una instrucción, por la otra carretera ya llega la siguiente. Por eso casi todas tardan un solo ciclo. Las cuentas se hacen en los 32 registros: un dato de la SRAM se carga, se opera y se vuelve a guardar.', q: mcq('¿Qué permite que la CPU traiga la siguiente instrucción mientras ejecuta la actual?', ['Los buses separados de programa y datos', 'Tener 32 registros', 'El cristal de 16 MHz', 'La EEPROM'], 'Es la ventaja principal de la arquitectura Harvard.') },
      { title: 'Paso a paso', text: 'x = x + 1 con x en la SRAM son tres pasos: <b>lds</b> r24, x (traer a un registro), <b>inc</b> r24 o add (operar en la ALU) y <b>sts</b> x, r24 (devolver). Los 32 registros de 8 bits están cableados a la ALU; los seis últimos se usan por parejas como punteros X, Y y Z. La Flash solo guarda el programa y las constantes.', q: mcq('Para hacer x = x + 1 con x en la SRAM, ¿qué orden sigue la CPU?', ['Cargar x en un registro, sumar en la ALU y guardarlo', 'Sumar directamente en la SRAM', 'Sumar en la Flash y copiar', 'Guardar, sumar y cargar'], 'La ALU solo opera sobre registros: carga, opera, almacena.') }
    ] },
    av_8bit: { name: 'Coste de las cuentas en 8 bits', alts: [
      { title: 'Byte a byte', text: 'La ALU del 328P trabaja con <b>8 bits</b>. Un uint8_t se suma con una instrucción; un int (16 bits) ocupa dos registros y necesita dos (add y adc, que arrastra el acarreo); un long, cuatro. Por eso conviene el tipo más pequeño que quepa. Además, no hay divisor por hardware: dividir es una rutina lenta, salvo dividir sin signo entre una potencia de 2, que es un desplazamiento (x / 16 = x &gt;&gt; 4).', q: mcq('¿Cuántas instrucciones de suma necesita un uint32_t en un AVR?', ['Cuatro: una por byte, encadenando el acarreo', 'Una', 'Dos', 'Ocho'], '4 bytes: add + adc + adc + adc.') },
      { title: 'Lo que tiene y lo que no', text: 'El hardware del 328P suma, resta y opera de 8 en 8 bits en 1 ciclo y multiplica 8 × 8 bits en 2 ciclos (mul). <b>No tiene divisor ni coma flotante</b>: x / 7, x % 10 o un float llaman a rutinas de decenas a cientos de ciclos. Un desplazamiento, en cambio, son pocas instrucciones. Y cada byte de más en el tipo multiplica las instrucciones.', q: mcq('¿Qué es más barato en un AVR para un uint16_t x?', ['x >> 3', 'x / 7', 'Pasar x a float y dividir entre 8', 'x % 10'], 'Desplazar son pocas instrucciones; dividir entre 7, float o módulo llaman a rutinas lentas.') }
    ] },
    av_wrap: { name: 'Enteros sin signo: desbordamiento y vuelta', alts: [
      { title: 'El cuentakilómetros', text: 'Un uint8_t va de 0 a 255, como un cuentakilómetros de tres cifras que pasa de 999 a 000. Al pasar de 255 vuelve a 0 y el bit que sobra va a la bandera <b>C</b> (acarreo): 200 + 100 = 300 − 256 = 44. Restando pasa lo contrario: 3 − 5 da 254. Con uint16_t lo mismo, pero módulo 65 536.', q: mcq('uint8_t a = 250; a = a + 10; ¿Cuánto vale a?', ['4', '260', '255', '0'], '260 − 256 = 4: el noveno bit se pierde (va a C).') },
      { title: 'Restar a través de la vuelta', text: 'Esa vuelta es útil: si un contador de 16 bits pasa de 65 530 a 10, la resta sin signo ahora − antes = 10 − 65 530 da 16 en uint16_t, justo las cuentas transcurridas. Funciona siempre que entre las dos lecturas haya menos de una vuelta completa. Igual con 8 bits: 200 + 100 se queda en 44 y el acarreo avisa.', q: mcq('uint16_t: antes = 65 000 y ahora = 464. ¿Cuánto vale ahora − antes?', ['1000', '−64 536', '64 536', '0'], '464 − 65 000 + 65 536 = 1000.') }
    ] },
    av_cycle: { name: 'Ciclos de reloj y tiempo de ejecución', alts: [
      { title: 'Del reloj al tiempo', text: 'Un ciclo dura 1 / f: a 16 MHz, <b>62,5 ns</b>; a 8 MHz, 125 ns; a 1 MHz, 1 µs. El tiempo de un trozo de código es ciclos / f: ciclos entre MHz da µs. 4000 ciclos a 16 MHz: 4000 / 16 = 250 µs. A 1 MHz hay 1000 ciclos en cada milisegundo.', q: mcq('Una rutina de 8000 ciclos a 16 MHz tarda…', ['500 µs', '128 ms', '500 ms', '8 µs'], '8000 / 16 MHz = 500 µs.') },
      { title: 'Contar un bucle', text: 'Suma lo que cuesta cada instrucción por las veces que se ejecuta. En ldi r24, n / dec r24 / brne: ldi una vez (1 ciclo), dec n veces (1 ciclo), brne salta n − 1 veces (2 ciclos) y no salta la última (1 ciclo). Total: 1 + n + 2·(n − 1) + 1 = <b>3n</b> ciclos. Para pasarlo a tiempo, divide entre la frecuencia.', q: mcq('Con ese bucle y n = 50, ¿cuántos ciclos?', ['150', '100', '151', '200'], '1 + 50 + 49 × 2 + 1 = 150.') },
      { title: 'Una onda por software', text: 'Si un bucle conmuta una pata cada k ciclos, un periodo completo son dos conmutaciones: 2k ciclos. sbi PINB (2 ciclos) + rjmp (2 ciclos) = 4 ciclos por conmutación, 8 por periodo: a 16 MHz, 16 / 8 = <b>2 MHz</b>. Siempre igual: frecuencia = f del reloj / ciclos por periodo.', q: mcq('Un bucle conmuta una pata cada 5 ciclos a 20 MHz. ¿Frecuencia de la onda?', ['2 MHz', '4 MHz', '1 MHz', '5 MHz'], 'Periodo = 10 ciclos: 20 / 10 = 2 MHz.') }
    ] },
    av_clksrc: { name: 'Fuentes de reloj y su precisión', alts: [
      { title: 'Errores que se acumulan', text: 'Un error relativo se convierte en tiempo multiplicando: un día tiene 86 400 s, así que un 0,5 % son 432 s, unos <b>7 minutos al día</b>; 20 ppm (0,002 %) son menos de 2 s al día. El RC interno (±10 % de fábrica, ±1 % calibrado) o el oscilador de 128 kHz del watchdog, que varía con la tensión y la temperatura, sirven para «más o menos»; para la hora, un cristal o un RTC.', q: mcq('Un oscilador con un 1 % de error, ¿cuánto se desvía en una hora?', ['36 s', '1 s', '6 min', '0,36 s'], '3600 s × 0,01 = 36 s.') },
      { title: 'Del peor al mejor', text: 'Oscilador del watchdog (128 kHz): el peor; cambia mucho con la tensión y la temperatura. <b>RC interno</b> de 8 MHz: ±10 % de fábrica, ±1 % calibrado con OSCCAL. <b>Resonador cerámico</b>: en torno al 0,5 %. <b>Cristal</b>: decenas de ppm. Para un reloj de pared, un RTC con cristal de 32 768 Hz compensado en temperatura.', q: mcq('¿Qué fuente eliges para un registrador que debe marcar la hora con menos de un minuto de error al mes?', ['Un cristal (mejor, un RTC con cristal)', 'El RC interno calibrado', 'El oscilador del watchdog', 'Un resonador cerámico'], 'Un mes son unos 2,6 millones de segundos: hace falta un error de ppm.') }
    ] },
    av_vmax: { name: 'Frecuencia máxima según la tensión', alts: [
      { title: 'Más tensión, más velocidad', text: 'Los transistores conmutan más deprisa cuanto mayor es la tensión. El 328P admite <b>20 MHz</b> de 4,5 a 5,5 V, <b>10 MHz</b> desde 2,7 V y <b>4 MHz</b> desde 1,8 V, con una recta entre esos puntos. Por eso las placas de 3,3 V van a 8 MHz y las de 5 V a 16 MHz, y con 16 MHz el BOD conviene a 4,3 V. El ATtiny85 normal pide al menos 2,7 V; la versión ATtiny85V llega a 1,8 V a 4 MHz o menos.', q: mcq('Una placa alimentada a 3,3 V…', ['Va a 8 MHz: 16 MHz estaría fuera de especificación', 'Puede ir a 20 MHz', 'Solo puede ir a 1 MHz', 'Va a 16 MHz sin problema'], 'A 3,3 V la recta da unos 13 MHz.') },
      { title: 'Calcular el mínimo', text: 'Entre 2,7 V (10 MHz) y 4,5 V (20 MHz) la frecuencia máxima sube unos 5,6 MHz por voltio. Para 16 MHz hacen falta unos <b>3,8 V</b>. Si la tensión puede bajar de ahí (pilas que se gastan, caídas), o bajas el reloj, o pones el BOD por encima: con 16 MHz, el umbral de 4,3 V.', q: mcq('Un chip a 16 MHz con pilas que bajan hasta 3 V. ¿Qué haces?', ['Bajar el reloj a 8 MHz o menos, que sí cabe a 3 V', 'Nada', 'Subir a 20 MHz', 'Quitar el BOD'], 'A 3 V el máximo es de unos 11,7 MHz.') }
    ] },
    av_fcpu: { name: 'F_CPU y los retardos calculados al compilar', alts: [
      { title: 'Una etiqueta, no un mando', text: '<b>F_CPU</b> es solo una constante que dice al compilador a qué frecuencia irá el chip. No cambia el cristal ni los fusibles. _delay_ms, millis() y los cálculos de baudios la usan para convertir tiempo en ciclos: si no coincide con el reloj real, todos los tiempos salen escalados. Y como _delay_ms(n) hace esa cuenta al compilar, necesita una n constante.', q: mcq('Compilas con F_CPU = 8 MHz pero el chip va a 16 MHz. _delay_ms(1000) dura…', ['0,5 s', '1 s', '2 s', '8 s'], 'Cuenta los ciclos de 1 s a 8 MHz, que a 16 MHz pasan en la mitad.') },
      { title: 'Calculado al compilar', text: '_delay_ms(n) convierte n en vueltas de bucle <b>al compilar</b>, usando F_CPU (que pasas con -DF_CPU=16000000UL). Por eso necesita una constante: con una variable, avr-libc da error o el retardo sale mal. Para un retardo variable, llama n veces a _delay_ms(1). Si F_CPU no es la frecuencia real, todos estos retardos salen mal.', q: mcq('¿Cómo haces un retardo de t milisegundos con t variable?', ['Un bucle que llama t veces a _delay_ms(1)', '_delay_ms(t)', 'Cambiar F_CPU en marcha', '_delay_ms(t * F_CPU)'], 'Cada _delay_ms(1) usa una constante.') }
    ] },

    /* ---- Memoria ---- */
    av_mem: { name: 'Dónde vive cada dato: Flash, SRAM y EEPROM', alts: [
      { title: 'Libro, pizarra y libreta', text: '<b>Flash</b> (32 KB): un libro impreso con el programa y las constantes; no se borra al apagar. <b>SRAM</b> (2 KB): una pizarra rápida para variables, pila y montón; se borra al apagar. <b>EEPROM</b> (1 KB): una libreta para ajustes que deben sobrevivir; lenta al escribir. Ojo: las cadenas y tablas con valor inicial se copian del libro a la pizarra al arrancar, salvo que las marques con PROGMEM o F().', q: mcq('¿Dónde guardas cuántas veces se ha encendido un aparato?', ['En la EEPROM', 'En la SRAM', 'En los registros', 'En una variable local'], 'Debe sobrevivir al apagado y cambiar a veces: EEPROM.') },
      { title: 'Constantes que ocupan RAM', text: 'Las globales con valor inicial, incluidas las cadenas "…" y las tablas const, se copian de la Flash a la SRAM al arrancar: ocupan <b>las dos memorias</b>. Con <b>PROGMEM</b> (o F("…") en Serial.print) se quedan solo en la Flash. F("Hola") ahorra 5 bytes de SRAM: 4 letras y el 0 final.', q: mcq('Una tabla const de 300 bytes sin PROGMEM…', ['Ocupa 300 bytes de Flash y otros 300 de SRAM', 'Solo ocupa Flash', 'Solo ocupa SRAM', 'Va a la EEPROM'], 'Se copia a la SRAM al arrancar, como cualquier variable con valor inicial.') },
      { title: 'Leer de la Flash', text: 'Por ser Harvard, la Flash está en otro bus. Un dato PROGMEM tiene una dirección de Flash; leerlo como si fuera RAM (tabla[i]) lee la SRAM en esa dirección: basura. Se lee con <b>pgm_read_byte(&amp;tabla[i])</b> (o pgm_read_word para 16 bits), que usa la instrucción LPM. Así las constantes grandes no gastan SRAM.', q: mcq('const uint16_t t[10] PROGMEM = {…}; ¿Cómo lees t[3]?', ['pgm_read_word(&t[3])', 't[3]', 'pgm_read_byte(t[3])', 'eeprom_read_word(&t[3])'], 'Dato de 16 bits en Flash: pgm_read_word con su dirección.') }
    ] },
    av_sram: { name: 'Pila y montón en la SRAM', alts: [
      { title: 'El mapa', text: 'La SRAM va de <b>0x0100 a 0x08FF</b>: 0x08FF − 0x0100 + 1 = 0x0800 = 2048 bytes (al contar un rango con los dos extremos, suma 1). De abajo arriba: .data y .bss (globales), el <b>montón</b> (malloc, new, String), que crece hacia arriba, espacio libre y la <b>pila</b>, que baja desde 0x08FF. Si se encuentran, se pisan sin aviso. String y malloc fragmentan el montón; una local static no va a la pila.', q: mcq('¿Cuántos bytes hay de 0x0200 a 0x02FF, ambos incluidos?', ['256', '255', '512', '200'], '0x02FF − 0x0200 + 1 = 0x100 = 256.') },
      { title: 'Lo que gasta la pila', text: 'En los 2048 bytes de SRAM (0x0100–0x08FF), la pila baja desde arriba. Cada llamada apila su dirección de retorno (2 bytes), registros y sus <b>variables locales</b>; al volver, lo libera. Si una función llama a otra, sus locales conviven. Una recursión sin fin baja hasta pisar el montón y las globales: cuelgue o reinicio. Una local <b>static</b> no va a la pila: vive con las globales y conserva su valor.', q: mcq('a() tiene un array local de 200 bytes y llama a b(), con otro de 100. Dentro de b(), ¿cuánta pila ocupan los arrays?', ['300 bytes', '200 bytes', '100 bytes', '0'], 'Los locales de a() siguen vivos mientras b() se ejecuta.') },
      { title: 'El montón se fragmenta', text: 'malloc y String reservan trozos del montón y los liberan en otro orden. Quedan huecos: con 2 KB, pronto hay memoria libre en total pero ningún hueco seguido lo bastante grande, y el montón crece hacia la pila. En programas que corren meses, mejor arrays de tamaño fijo, globales o static (no van ni al montón ni a la pila).', q: mcq('Tras horas creando y destruyendo String, malloc(100) falla aunque quedan 300 bytes libres. ¿Por qué?', ['Fragmentación: no hay 100 bytes seguidos', 'La EEPROM está llena', 'Falta volatile', 'La Flash se ha gastado'], 'Libre no es lo mismo que contiguo.') }
    ] },
    av_sections: { name: 'Secciones: .text, .data, .bss y .noinit', alts: [
      { title: 'Leer avr-size', text: '<b>text</b>: código y constantes (Flash). <b>data</b>: globales con valor inicial; ocupan Flash (el valor) y SRAM (la variable). <b>bss</b>: globales a cero, solo SRAM. Flash usada = text + data; SRAM estática = data + bss; lo que falta hasta 2048 es para pila y montón. Las variables en .noinit ni se copian ni se borran al arrancar.', q: mcq('text 3000, data 200, bss 500. ¿Flash usada y SRAM estática?', ['3200 y 700 bytes', '3000 y 500 bytes', '3700 y 200 bytes', '3500 y 700 bytes'], 'Flash = text + data; SRAM = data + bss.') },
      { title: 'Lo que hace el arranque', text: 'Antes de main(), el código de arranque copia .data de la Flash a la SRAM y pone .bss a cero. Si el IDE dice que las globales usan 1800 bytes, quedan 2048 − 1800 = 248 para pila y montón. Las variables en <b>.noinit</b> no se tocan: conservan su valor tras un reinicio por watchdog o por la pata RESET (tras un corte de alimentación, basura).', q: mcq('Las globales usan 1700 bytes. ¿Cuánta SRAM queda para pila y montón?', ['348 bytes', '1700 bytes', '2048 bytes', '300 bytes'], '2048 − 1700.') }
    ] },
    av_eeprom: { name: 'EEPROM: desgaste y escritura segura', alts: [
      { title: 'Contar escrituras', text: 'Cada celda aguanta unas <b>100 000 escrituras</b>. Vida = 100 000 × intervalo entre escrituras de esa celda. Una celda cada minuto: 100 000 min ≈ 69 días. Si repartes las escrituras entre k celdas (wear leveling), cada una se escribe k veces menos: vida × k. Y con eeprom_update_byte, si el valor no cambia, no se escribe.', q: mcq('Una escritura cada 10 min repartida entre 10 celdas. ¿Vida aproximada?', ['Unos 19 años', 'Unos 2 años', '69 días', '100 000 min'], 'Cada celda, una vez cada 100 min: 10 000 000 min ≈ 19 años.') },
      { title: 'No escribir si no hace falta', text: '<b>eeprom_update_byte</b> (EEPROM.update en Arduino) lee la celda y solo escribe si el valor cambia: no gasta vida en balde. Cada escritura tarda unos 3,3 ms; si se corta la alimentación justo entonces, ese byte puede quedar corrupto. El <b>BOD</b> detiene el chip antes de que escriba con tensión insuficiente. La vida total es 100 000 escrituras por celda.', q: mcq('Guardas el mismo ajuste cada segundo, pero casi nunca cambia. ¿Qué usas?', ['eeprom_update_byte: solo escribe cuando cambia', 'eeprom_write_byte', 'Una variable en la SRAM', 'Escribir dos veces para asegurar'], 'Si el valor es igual, no hay escritura ni desgaste.') }
    ] },

    /* ---- Patas y puertos ---- */
    av_pinmap: { name: 'Del puerto y bit al pin de Arduino', alts: [
      { title: 'Tres tramos', text: '<b>D0–D7 = PD0–PD7</b>: mismo número. <b>D8–D13 = PB0–PB5</b>: resta 8 al ir del pin al bit, suma 8 al revés. <b>A0–A5 = PC0–PC5</b>. Así, D13 es PB5, PB0 es D8 y PC3 es A3.', q: mcq('¿Qué es D12?', ['PB4', 'PD12', 'PB12', 'PC4'], 'Puerto B, 12 − 8 = 4.') },
      { title: 'Desde el registro', text: 'Si el código toca el bit n de un puerto: puerto D → Dn; puerto B → D(n + 8); puerto C → An. PORTB |= (1 &lt;&lt; PB2) actúa sobre D10; PIND &amp; (1 &lt;&lt; PD7) lee D7; PINC &amp; (1 &lt;&lt; PC1) lee A1.', q: mcq('DDRB |= (1 << PB1); ¿qué pin pasa a salida?', ['D9', 'D1', 'A1', 'D10'], 'Puerto B: 1 + 8 = 9.') }
    ] },
    av_altfn: { name: 'Funciones alternativas de las patas', alts: [
      { title: 'Cada pata, varios oficios', text: 'PD0/PD1 (D0/D1): RX/TX. PD2/PD3 (D2/D3): <b>INT0/INT1</b>. PB3/PB4/PB5 (D11–D13): MOSI/MISO/SCK, del SPI y del ISP. PC4/PC5 (A4/A5): SDA/SCL. PB6/PB7: el cristal. PB1, PB2, PB3, PD3, PD5 y PD6: salidas de temporizador (los ~). En la Nano, A6 y A7 son solo entradas analógicas: no tienen puerto digital.', q: mcq('¿En qué pin de la Uno está SDA?', ['A4 (PC4)', 'D4', 'A5', 'D2'], 'PC4 = A4 = SDA; SCL es A5.') },
      { title: 'Puerto a puerto', text: '<b>Puerto D</b>: comunicación serie (D0, D1), interrupciones externas (D2 = INT0, D3 = INT1) y PWM en D3, D5 y D6. <b>Puerto B</b>: PWM en D9–D11, SPI en D10–D13 y el cristal en PB6/PB7. <b>Puerto C</b>: entradas analógicas, I²C en A4/A5 y RESET en PC6. La Nano añade ADC6 y ADC7 (A6, A7), que solo van al conversor.', q: mcq('¿Qué patas de la Uno pierdes si usas I²C?', ['A4 y A5', 'D2 y D3', 'D0 y D1', 'D11 y D13'], 'SDA = PC4 y SCL = PC5.') }
    ] },
    av_bare: { name: 'El 328P suelto: alimentación, reloj y reset', alts: [
      { title: 'Lo mínimo para que viva', text: 'VCC (pata 7) y <b>AVCC (20)</b> a 5 V; las dos GND (8 y 22) a masa; <b>100 nF</b> pegado a cada pareja de alimentación; <b>10 kΩ</b> de RESET (1) a VCC; y, si usas cristal, el cristal entre 9 y 10 con 22 pF de cada pata a masa. AVCC alimenta el ADC y el puerto C: va conectada siempre. Primero alimentación y desacoplo, luego reset y reloj, y mide antes de programar.', q: mcq('Tu 328P en protoboard funciona, pero A0–A5 se comportan raro. ¿Qué miras primero?', ['Que AVCC (pata 20) esté conectada a VCC', 'El cristal', 'La pull-up de RESET', 'El bootloader'], 'AVCC alimenta el puerto C.') },
      { title: 'Por qué cada pieza', text: 'El desacoplo de 100 nF entrega los picos de corriente de cada flanco de reloj sin que caiga la tensión: uno por pareja VCC/GND, pegado al chip. La pull-up de RESET evita que el ruido reinicie el chip (RESET es activa a 0). Los 22 pF son la capacidad de carga que el cristal necesita para oscilar a su frecuencia. Y AVCC, aunque no uses el ADC, alimenta el puerto C.', q: mcq('El chip se reinicia al acercar la mano. ¿Qué falta probablemente?', ['La pull-up de 10 kΩ en RESET', 'Los 22 pF del cristal', 'Un condensador de 1000 µF', 'AVCC'], 'Sin pull-up firme, RESET capta ruido.') }
    ] },
    av_dip: { name: 'Numeración de patas del DIP-28', alts: [
      { title: 'Contar desde la muesca', text: 'Con la muesca a la izquierda, la pata 1 (RESET) está abajo a la izquierda y se cuenta en sentido contrario a las agujas del reloj: 1–14 por abajo y 15–28 por arriba. Patas 2–6: PD0–PD4; 11–13: PD5–PD7; 14–19: PB0–PB5; 23–28: PC0–PC5. Entre medias, VCC (7), GND (8 y 22), cristal (9, 10), AVCC (20) y AREF (21).', q: mcq('¿Qué pata del DIP-28 es PB5 (SCK, D13)?', ['19', '13', '5', '28'], 'PB0 es la 14: PB5, la 19.') },
      { title: 'Las que más usarás', text: 'Para el ISP: MOSI = pata 17 (PB3), MISO = 18 (PB4), SCK = 19 (PB5), RESET = 1, VCC = 7, GND = 8. Para cargar por serie: RXD = 2 (PD0) y TXD = 3 (PD1). El resto del puerto D sigue: PD2 = 4, PD3 = 5, PD4 = 6.', q: mcq('¿En qué pata del DIP-28 conectas el MOSI del programador?', ['17', '18', '19', '11'], 'MOSI = PB3 = pata 17.') }
    ] },
    av_ports: { name: 'DDRx, PORTx y PINx', alts: [
      { title: 'Tres preguntas por pata', text: '<b>DDRx</b>: ¿hablo o escucho? (1 = salida). <b>PORTx</b>: si hablo, ¿qué digo?; si escucho, ¿activo la pull-up? <b>PINx</b>: ¿qué estoy oyendo realmente en la pata? Una entrada se lee siempre en PINx; y escribir un 1 en un bit de PINx conmuta ese bit de PORTx.', q: mcq('DDRB bit 0 = 0 y PORTB bit 0 = 1. La pata PB0 es…', ['Una entrada con pull-up', 'Una salida a 1', 'Una salida a 0', 'Una entrada flotante'], 'DDR a 0 = entrada; PORT a 1 en una entrada = pull-up.') },
      { title: 'Leer el byte', text: 'Cada registro es un byte, un bit por pata. Escribe el valor en binario y lee de derecha a izquierda: el bit de la derecha es el 0. DDRD = 0xF0 = 0b11110000: D4–D7 son salidas y D0–D3, entradas. Para D8–D13 (PB0–PB5) como salidas: 0b00111111 = 0x3F = 63 en DDRB.', q: mcq('DDRD = 0x0F. ¿Qué pines son salidas?', ['D0–D3', 'D4–D7', 'Todos', 'Ninguno'], '0x0F = 0b00001111: los cuatro bits bajos.') },
      { title: 'El truco de PINx', text: 'PINx sirve para leer, pero en el 328P también se puede escribir: un <b>1 en un bit de PINx conmuta</b> ese bit de PORTx (los 0 no hacen nada). PINB = (1 &lt;&lt; PB5); hace parpadear D13 sin leer antes. Para saber el nivel real de una pata, lee PINx: PORTx solo dice lo que tú escribiste.', q: mcq('PORTB tiene el bit 5 a 1. Ejecutas PINB = (1 << PB5);. ¿Qué pasa?', ['El bit 5 de PORTB pasa a 0: D13 se apaga', 'Nada: PINB es de solo lectura', 'D13 se queda a 1', 'Se activa la pull-up'], 'Escribir 1 en PINx conmuta.') }
    ] },
    av_bits: { name: 'Máscaras: poner, quitar, conmutar y leer bits', alts: [
      { title: 'Tres herramientas', text: 'La máscara (1 &lt;&lt; n) vale 2ⁿ: un 1 solo en el bit n. <b>OR</b> (|=) enciende: un 1 en la máscara fuerza un 1 y un 0 deja el bit como estaba. <b>AND con la máscara negada</b> (&amp;= ~) apaga. <b>XOR</b> (^=) invierte. Las tres respetan los bits donde la máscara tiene 0; un = a secas, en cambio, sustituye el byte entero.', q: mcq('¿Qué operación pone a 1 los bits marcados y deja igual el resto?', ['OR', 'AND', 'XOR', 'Asignar la máscara con ='], 'x | 1 = 1 y x | 0 = x.') },
      { title: 'Paso a paso', text: 'PORTB = 0b00001111. Para encender el bit 5: 1 &lt;&lt; 5 = 0b00100000; OR: 0b00101111 = 0x2F. Para apagar el bit 0: ~(1 &lt;&lt; 0) = 0b11111110; AND: 0b00001110. Para conmutar el bit 1: XOR con 0b00000010. Pon siempre los dos números en binario, uno debajo del otro, y opera columna a columna.', q: mcq('0b00001111 & ~(1 << 0) = ?', ['0b00001110', '0b00001111', '0b11111110', '0b00000001'], 'La máscara negada tiene un 0 solo en el bit 0.') },
      { title: 'Construir un byte', text: 'Cada bit vale una potencia de 2: bit 0 = 1, bit 1 = 2, bit 2 = 4, bit 3 = 8… bit 7 = 128. Un byte con varios bits a 1 es la suma de sus valores, o la unión con |: (1 &lt;&lt; 3) | (1 &lt;&lt; 0) = 8 + 1 = 9 = 0x09. Así calculas también qué vale un registro cuando sabes qué bits están activos.', q: mcq('Bits 7 y 2 a 1, el resto a 0. ¿Valor?', ['132 (0x84)', '9', '72', '0x72'], '128 + 4 = 132.') }
    ] },
    av_prec: { name: 'Precedencia: paréntesis al comparar bits', alts: [
      { title: 'Paréntesis obligatorios', text: 'En C, == y != se evalúan <b>antes</b> que &amp;, | y ^. Escribe siempre los paréntesis: if ((PIND &amp; (1 &lt;&lt; PD2)) == 0). Sin ellos, la comparación se hace primero y el resultado no tiene sentido.', q: mcq('¿Cómo se evalúa a & b == 0 en C?', ['a & (b == 0)', '(a & b) == 0', 'Da error de compilación', 'a == 0'], '== tiene más prioridad que &.') },
      { title: 'Cómo lo lee el compilador', text: 'PIND &amp; (1 &lt;&lt; PD2) == 0 se lee como PIND &amp; ((1 &lt;&lt; PD2) == 0). (1 &lt;&lt; PD2) == 0 es falso, o sea 0, y PIND &amp; 0 vale siempre 0: el if nunca se cumple. Con ((PIND &amp; (1 &lt;&lt; PD2)) == 0) primero se aísla el bit y después se compara.', q: mcq('¿Qué escritura comprueba bien que el bit 3 de PINB está a 1?', ['if ((PINB & (1 << 3)) != 0)', 'if (PINB & (1 << 3) != 0)', 'if (PINB & 1 << 3 != 0)', 'if (PINB == 3)'], 'Sin paréntesis, != se evalúa antes que &.') }
    ] },
    av_input: { name: 'Entradas: pull-ups, pull-downs y niveles', alts: [
      { title: 'Quién sujeta la pata', text: 'Una entrada sin conectar flota y se lee al azar. Con <b>pull-up</b> (interna: DDR = 0 y PORT = 1, de 20 a 50 kΩ) reposa a 1 y el pulsador a masa la lleva a 0: pulsado = 0. Con <b>pull-down</b> externa y pulsador a VCC, pulsado = 1. Con el pulsador cerrado, por la pull-up circula I = VCC / R: 5 V / 50 kΩ = 100 µA. Leer PINx da las 8 patas a la vez; ~PINx convierte «pulsado = 0» en 1.', q: mcq('Pull-up interna y pulsador a masa en PB0. Sin pulsar, el bit 0 de PINB vale…', ['1', '0', 'Al azar', '2'], 'La pull-up lo sujeta a VCC.') },
      { title: 'Zonas de lectura', text: 'A 5 V, una entrada lee 0 seguro por debajo de 0,3·VCC (1,5 V) y 1 seguro por encima de 0,6·VCC (3 V); entre medias no hay garantía. PINx pasa por un sincronizador: lo que escribes en PORTx se ve en PINx un ciclo después. Con pull-up, pulsado = 0; con pull-down, pulsado = 1. ~PINB &amp; 0x0F da un 1 por cada pulsador de PB0–PB3 pulsado.', q: mcq('Alimentado a 3,3 V, ¿desde qué tensión se garantiza un 1?', ['Unos 2 V (0,6 × 3,3 V)', '3,3 V', '1 V', '2,5 V siempre'], '0,6 × 3,3 ≈ 1,98 V.') }
    ] },
    av_rmw: { name: 'Leer–modificar–escribir y atomicidad', alts: [
      { title: 'Tres pasos que se pueden cortar', text: 'PORTB |= 0x21; son tres instrucciones: in (leer), ori (modificar) y out (escribir). Si una interrupción cambia PORTB entre la lectura y la escritura, al escribir la copia vieja se borra su cambio. Lo mismo con contador++ compartido con una ISR. Remedio: desactivar las interrupciones durante esos pasos (ATOMIC_BLOCK) o usar una instrucción única (sbi, cbi, escribir en PINx).', q: mcq('¿Por qué contador++ (uint8_t) compartido con una ISR puede perder cuentas?', ['Leer, sumar y escribir son pasos separados y la ISR puede saltar en medio', 'Porque es de 8 bits', 'Porque falta F_CPU', 'No puede'], 'La ISR suma sobre un valor que main() va a sobrescribir.') },
      { title: 'Instrucciones que no se cortan', text: '<b>sbi</b> y <b>cbi</b> cambian un bit de E/S en una sola instrucción: son atómicas. Pero solo llegan a las 32 primeras direcciones de E/S: los puertos sí; TCCR1A o TIMSK1, no, y para ellos el compilador usa lds, ori, sts. Escribir PINx = máscara también es seguro: una sola escritura que conmuta sin leer antes. Todo lo demás, dentro de una sección crítica.', q: mcq('¿Cuál de estas líneas es atómica por sí sola?', ['PORTD |= (1 << 4);', 'TIMSK1 |= (1 << OCIE1A);', 'PORTD |= 0x30;', 'contador++;'], 'Un bit de PORTD con constante se compila a sbi; TIMSK1 está fuera del alcance de sbi; dos bits a la vez suelen ir con in, ori, out.') }
    ] },
    av_ardtim: { name: 'Los temporizadores que usa Arduino', alts: [
      { title: 'Quién ocupa qué', text: 'init() configura los tres antes de setup(): <b>Timer0</b> en Fast PWM con prescaler 64; su desbordamiento cuenta millis(), micros() y delay(), y da PWM en D5 y D6. <b>Timer1</b> (D9, D10) y <b>Timer2</b> (D3, D11), en Phase Correct para analogWrite. Servo se queda el Timer1 y tone() el Timer2: sus pines pierden analogWrite. digitalWrite() desconecta el PWM del pin si lo tenía.', q: mcq('Usas la librería Servo. ¿Qué pines pierden analogWrite?', ['D9 y D10', 'D5 y D6', 'D3 y D11', 'Ninguno'], 'Servo usa el Timer1.') },
      { title: 'Si tocas uno', text: 'Cambiar el prescaler del Timer0 descuadra millis(), micros() y delay(). Si te apropias del Timer1 o el Timer2, asume que Servo, tone() o el PWM de sus pines dejan de funcionar, y configúralo entero. Para una interrupción periódica, usa el Timer1 o el Timer2 y deja el Timer0 a Arduino. Por eso también digitalWrite() mira el temporizador del pin: para apagar su PWM.', q: mcq('Necesitas una interrupción periódica y millis(). ¿Qué temporizador tocas?', ['El Timer1 o el Timer2', 'El Timer0', 'Cualquiera', 'Ninguno: no se puede'], 'El Timer0 es el reloj de Arduino.') }
    ] },
    av_keymatrix: { name: 'Escanear un teclado matricial', alts: [
      { title: 'Fila a fila', text: 'Las columnas son entradas con pull-up; las filas, salidas a 1. Pones <b>una sola fila a 0</b> y lees las columnas: la que lea 0 está unida a esa fila por una tecla pulsada. Repites con cada fila. Con 4 × 4 teclas usas 8 patas. Si pulsas varias a la vez sin diodos, pueden aparecer teclas fantasma.', q: mcq('Fila 1 a 0 y las demás a 1. Lees 0 en la columna 4. ¿Tecla?', ['La de la fila 1 y la columna 4', 'Todas las de la columna 4', 'La de la fila 4 y la columna 1', 'Ninguna'], 'Solo esa tecla conecta esa fila con esa columna.') },
      { title: 'Teclas fantasma', text: 'Con tres teclas pulsadas en tres esquinas de un rectángulo, la corriente puede ir de una fila a otra pasando por dos teclas y simular la cuarta esquina. Un <b>diodo en serie con cada tecla</b> deja pasar la corriente solo en un sentido y elimina el fantasma. La lectura normal sigue igual: fila a 0, columna que lee 0 = tecla del cruce.', q: mcq('Un teclado sin diodos muestra teclas que no has pulsado al pulsar varias. ¿Por qué?', ['Caminos de corriente a través de otras teclas pulsadas', 'Pull-ups demasiado fuertes', 'Escaneo lento', 'Rebotes'], 'El diodo corta el camino de vuelta.') }
    ] },
    av_mux: { name: 'Multiplexado de displays y LEDs', alts: [
      { title: 'Por turnos', text: 'Se enciende un dígito cada vez, tan rápido que el ojo los ve todos. Con n dígitos y t por dígito, cada uno se refresca cada n·t: 4 × 2 ms = 8 ms → 125 Hz. Encendido 1/n del tiempo, su <b>brillo medio baja a 1/n</b>. El común de un dígito lleva la suma de sus segmentos (8 × 15 mA = 120 mA): necesita transistor. Apaga el dígito antes de cambiar los segmentos o verás fantasmas.', q: mcq('6 dígitos, 1 ms por dígito. ¿Frecuencia de refresco de cada uno?', ['Unos 167 Hz', '1000 Hz', '6 Hz', '60 Hz'], 'Ciclo de 6 ms: 1 / 0,006 ≈ 167 Hz.') },
      { title: 'Corrientes, fantasmas y charlieplexing', text: 'Una pata aguanta 40 mA como máximo absoluto, así que el común de un dígito entero va con transistor. Los fantasmas aparecen en el instante en que conviven segmentos viejos y dígito nuevo: apagar, cambiar, encender. Con <b>charlieplexing</b>, cada pata puede estar a 1, a 0 o en alta impedancia: n patas controlan n·(n − 1) LEDs. Refresco = 1 / (n·t) y brillo = 1/n.', q: mcq('¿Cuántos LEDs puedes controlar con 5 patas en charlieplexing?', ['20', '25', '10', '32'], '5 × 4 = 20.') }
    ] },

    /* ---- Temporizadores ---- */
    av_timer: { name: 'Prescaler: tiempo por cuenta y desbordamiento', alts: [
      { title: 'Tick a tick', text: 'El prescaler N divide el reloj: cada cuenta (tick) dura <b>N / F_CPU</b>. A 16 MHz: N = 8 → 0,5 µs; 64 → 4 µs; 256 → 16 µs. Para pasar un tiempo a cuentas, divide: 1 ms con ticks de 0,5 µs son 2000 cuentas. Y al revés: un desbordamiento son todas las cuentas del contador × la duración del tick.', q: mcq('Prescaler 64 a 16 MHz. ¿Cuántas cuentas son 2 ms?', ['500', '250', '2000', '128'], 'Tick = 4 µs: 2000 µs / 4 µs = 500.') },
      { title: 'Hasta dar la vuelta', text: 'En modo normal el contador recorre todos sus valores y se desborda: 256 cuentas el Timer0 y el Timer2, 65 536 el Timer1. Periodo = cuentas × N / F_CPU. Timer0 con N = 64: 256 × 64 / 16 MHz = <b>1,024 ms</b> (el latido de millis()). Timer1 sin prescaler: 65 536 × 62,5 ns = 4,096 ms. Para un tiempo cualquiera, cuentas = tiempo / tick.', q: mcq('Timer1 en modo normal, prescaler 8, a 16 MHz. ¿Cada cuánto se desborda?', ['32,768 ms', '4,096 ms', '0,5 µs', '262 ms'], '65 536 × 0,5 µs.') }
    ] },
    av_treg: { name: 'Registros de un temporizador', alts: [
      { title: 'Quién es quién', text: '<b>TCNTn</b>: la cuenta. <b>TCCRnA/B</b>: la configuración: modo (bits WGM, repartidos entre los dos), salidas (COM) y prescaler (CS, en TCCRnB). <b>OCRnA/B</b>: valores de comparación. <b>TIMSKn</b>: qué interrupciones están activas. <b>TIFRn</b>: banderas. El Timer0 y el Timer1 comparten el prescaler (reiniciarlo afecta a los dos); el Timer2 tiene el suyo.', q: mcq('¿En qué registro eliges el prescaler del Timer1?', ['TCCR1B (bits CS12:0)', 'TIMSK1', 'TCNT1', 'OCR1A'], 'Los bits CS están en TCCRnB.') },
      { title: 'Configúralo entero', text: 'Los bits de modo WGM están repartidos entre TCCRnA y TCCRnB, y Arduino ya los ha tocado en init(). Si haces TCCR1B |= (1 &lt;&lt; WGM12), los bits que dejó init() siguen ahí y obtienes otro modo. Asigna los registros completos: TCCR1A = 0; TCCR1B = (1 &lt;&lt; WGM12) | (1 &lt;&lt; CS12);. Recuerda que el prescaler del Timer0 y el del Timer1 son el mismo bloque.', q: mcq('Tras init() de Arduino, ¿qué deja el Timer1 en CTC con prescaler 256?', ['TCCR1A = 0; TCCR1B = (1 << WGM12) | (1 << CS12);', 'TCCR1B |= (1 << WGM12);', 'TCCR1A |= 0; TCCR1B |= (1 << CS12);', 'TIMSK1 = (1 << WGM12);'], 'Solo asignando los dos registros quitas lo que dejó init().') }
    ] },
    av_tflag: { name: 'Banderas: un 1 las borra y no acumulan', alts: [
      { title: 'Un 1 borra', text: 'Las banderas (TOVn, OCFnA… en TIFRn) se ponen a 1 solas cuando ocurre el evento. Se borran al ejecutarse su ISR o <b>escribiendo un 1</b> en ellas. Por eso TIFR1 |= (1 &lt;&lt; TOV1) es una trampa: relee las demás banderas a 1 y, al reescribirlas, también las borra. Se escribe TIFR1 = (1 &lt;&lt; TOV1). Y una bandera es un solo bit: dos eventos seguidos cuentan como uno.', q: mcq('¿Cómo borras solo OCF1A?', ['TIFR1 = (1 << OCF1A);', 'TIFR1 &= ~(1 << OCF1A);', 'TIFR1 |= (1 << OCF1A);', 'TIFR1 = 0;'], 'Un 1 en ese bit y 0 en los demás.') },
      { title: 'Un buzón con una sola carta', text: 'Una bandera recuerda <b>que</b> pasó algo, no <b>cuántas veces</b>. Si el evento se repite antes de atenderlo, el segundo se pierde. Con las interrupciones desactivadas 5 ms, el Timer0 se desborda casi 5 veces pero solo queda una bandera: millis() se retrasa. Y para vaciar el buzón a mano: escribir un 1 en la bandera.', q: mcq('Un pulso en INT0 llega tres veces mientras otra ISR tarda 1 ms. ¿Cuántas veces se ejecuta después la ISR de INT0?', ['Una', 'Tres', 'Ninguna', 'Dos'], 'La bandera solo recuerda que pasó.') }
    ] },
    av_ctc: { name: 'Modo CTC: prescaler y OCR', alts: [
      { title: 'La fórmula con números', text: 'En CTC el contador va de 0 a OCR y vuelve a 0: son OCR + 1 cuentas. <b>f = F_CPU / (N · (OCR + 1))</b>. Con N = 64 y OCR = 249: 16 000 000 / (64 × 250) = 1000 Hz. Si la patilla OC conmuta en cada coincidencia (COM = 01 y la pata como salida), su onda tiene la mitad: 500 Hz. Si escribes un OCR menor que la cuenta actual, el contador se lo salta y da la vuelta entera.', q: mcq('N = 8 y OCR1A = 1999 en CTC. ¿Frecuencia de interrupción?', ['1 kHz', '2 kHz', '500 Hz', '8 kHz'], '16 000 000 / (8 × 2000) = 1000 Hz.') },
      { title: 'Despejar OCR', text: 'Para una frecuencia f: cuentas = F_CPU / (N · f) y <b>OCR = cuentas − 1</b>. Elige un prescaler con el que las cuentas salgan enteras y quepan (256 en el Timer0 y el Timer2, 65 536 en el Timer1). 440 Hz en la patilla son 880 coincidencias por segundo: con N = 256, unas 71 cuentas → OCR = 70. La patilla conmuta sola con COM = 01 y la pata como salida.', q: mcq('Timer1 en CTC con prescaler 64. ¿OCR1A para 100 interrupciones por segundo?', ['2499', '2500', '24 999', '249'], '16 000 000 / (64 × 100) = 2500 cuentas: OCR = 2499.') },
      { title: 'El metrónomo', text: 'El <b>prescaler</b> decide cada cuántos ciclos avanza el contador; <b>OCR</b>, hasta cuánto cuenta antes de volver a 0. Más prescaler o más OCR: periodos más largos. Conmutar una patilla en cada golpe da media frecuencia. Ojo: si escribes un OCR menor que la cuenta actual, el contador se lo salta y da la vuelta entera.', q: mcq('Duplicas el prescaler y dejas OCR igual. La frecuencia de interrupción…', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Se cuadruplica'], 'Cada cuenta dura el doble.') }
    ] },
    av_pwm: { name: 'Frecuencia y resolución del PWM', alts: [
      { title: 'Frecuencia contra resolución', text: 'En Fast PWM, TOP fija las dos cosas a la vez: <b>f = F_CPU / (N · (TOP + 1))</b> y hay TOP + 1 niveles. Bajar TOP de 255 a 63 multiplica la frecuencia por 4 y deja 64 niveles (6 bits). En Phase Correct el contador sube y baja: <b>f = F_CPU / (2 · N · TOP)</b>, la mitad.', q: mcq('Fast PWM a 62,5 kHz con prescaler 1. ¿TOP?', ['255', '127', '511', '62'], '16 000 000 / 256 = 62 500 Hz.') },
      { title: 'Rápido o simétrico', text: '<b>Fast PWM</b>: sierra de 0 a TOP, 256 cuentas por periodo con TOP = 255. <b>Phase Correct</b>: sube y baja, 510 cuentas: casi la mitad de frecuencia, a cambio de pulsos centrados. Por eso, con prescaler 64, analogWrite da unos 980 Hz en D5 y D6 (Timer0, Fast) y unos 490 Hz en los demás (Timer1 y Timer2, Phase Correct).', q: mcq('Timer2 en Phase Correct de 8 bits (TOP = 255) con prescaler 64. ¿Frecuencia?', ['Unos 490 Hz', 'Unos 980 Hz', '62,5 kHz', 'Unos 245 Hz'], '16 000 000 / (64 × 510) ≈ 490 Hz.') },
      { title: 'Despejar TOP', text: 'Con TOP en ICR1 eliges cualquier frecuencia: <b>TOP = F_CPU / (N · f) − 1</b>. 50 Hz con N = 8: 16 000 000 / (8 × 50) − 1 = 39 999. Usa el prescaler más pequeño con el que TOP quepa en 16 bits: más cuentas por periodo, más resolución. 20 kHz con N = 1: TOP = 799.', q: mcq('Fast PWM con TOP en ICR1 y prescaler 1. ¿ICR1 para 40 kHz?', ['399', '400', '39 999', '199'], '16 000 000 / 40 000 = 400 cuentas: TOP = 399.') }
    ] },
    av_pwmduty: { name: 'Ciclo de trabajo y salidas del PWM', alts: [
      { title: 'Sierra y umbral', text: 'El contador sube como una sierra de 0 a TOP. Con COMnx1:0 = <b>10</b> (no invertido) la salida está a 1 hasta que el contador alcanza OCR y a 0 el resto; con <b>11</b> se invierte; con <b>00</b> la pata queda desconectada del temporizador. En Fast PWM, ciclo = (OCR + 1) / (TOP + 1): con OCR = 0 aún sale un pulso de una cuenta.', q: mcq('Fast PWM con TOP = 199 y OCR = 49. ¿Ciclo de trabajo?', ['25 %', '49 %', '20 %', '75 %'], '(OCR + 1) / (TOP + 1) = 50 / 200.') },
      { title: 'Cambios sin cortes', text: 'En los modos PWM, OCRnx tiene <b>doble búfer</b>: lo que escribes espera y se copia al empezar el periodo siguiente (en 0 en Fast PWM, en TOP en Phase Correct), así que nunca se corta un pulso a medias. Para un 0 % de verdad en Fast PWM hay que desconectar la salida (COM = 00) y poner la pata a 0, como hace analogWrite(pin, 0). COM = 10 normal, 11 invertido.', q: mcq('Fast PWM no invertido, TOP = 255, OCR = 0. ¿Qué sale?', ['Un pulso de 1 cuenta por periodo (≈ 0,4 %)', '0 % exacto', '100 %', 'Nada: la pata se desconecta'], '(0 + 1) / 256.') }
    ] },
    av_icp: { name: 'Medir tiempo con el Timer1', alts: [
      { title: 'Una foto del contador', text: 'En cada flanco de ICP1 (PB0), el hardware copia TCNT1 en <b>ICR1</b> al instante: la latencia de la ISR no afecta. Periodo = (captura nueva − anterior) × N / F_CPU, y f = 1 / periodo. La resta en uint16_t sale bien aunque el contador dé una vuelta; si el periodo supera 65 536 cuentas, cuenta desbordamientos o sube el prescaler. Si ICR1 hace de TOP (modo 14), no puede capturar.', q: mcq('Prescaler 8 a 16 MHz; entre dos capturas hay 2000 cuentas. ¿Frecuencia?', ['1 kHz', '2 kHz', '8 kHz', '500 Hz'], '2000 × 0,5 µs = 1 ms.') },
      { title: 'Capturar o contar', text: 'Dos formas de medir. Para frecuencias bajas, el <b>periodo</b>: cuentas entre dos capturas × duración de la cuenta; con más de 65 536 cuentas, suma desbordamientos. Para frecuencias altas, cuenta <b>pulsos</b> durante una ventana fija con la entrada T1 como reloj: f = pulsos / ventana; 5000 pulsos en 0,1 s son 50 kHz. ICR1 solo puede hacer un trabajo: capturar o ser TOP.', q: mcq('Cuentas 2500 pulsos en una ventana de 0,5 s. ¿Frecuencia?', ['5000 Hz', '1250 Hz', '2500 Hz', '500 Hz'], '2500 / 0,5 s.') }
    ] },

    /* ---- Interrupciones ---- */
    av_isr: { name: 'El bit I: permiso y anidamiento', alts: [
      { title: 'Tres llaves', text: 'Para que salte una interrupción hacen falta tres cosas: su <b>bandera</b> activa, su <b>habilitación local</b> (TIMSKn, EIMSK…) y el <b>permiso global</b>, el bit I de SREG (sei() lo pone a 1, cli() a 0). Al entrar en una ISR, el hardware pone I a 0, así que no se anidan; reti lo vuelve a poner a 1. ISR_NOBLOCK lo reactiva al empezar para dejar que otra la interrumpa.', q: mcq('OCF1A y OCIE1A están a 1, pero la ISR no salta. ¿Qué falta?', ['El bit I de SREG (sei())', 'Otra bandera', 'El prescaler', 'Una variable volatile'], 'Sin el permiso global no salta ninguna.') },
      { title: 'Paso a paso', text: 'Bandera activa, máscara a 1 e I = 1: la CPU <b>termina la instrucción en curso</b>, guarda la dirección de retorno en la pila, <b>pone I a 0</b> y salta al vector. Al acabar, reti recupera la dirección y pone I a 1. Mientras I = 0, las demás esperan su turno. Arduino llama a sei() en init(); en C puro te toca a ti.', q: mcq('Durante una ISR normal llega otra interrupción. ¿Qué pasa?', ['Espera a que la primera termine (I está a 0)', 'Interrumpe a la primera', 'Se pierde siempre', 'Reinicia el chip'], 'Sin ISR_NOBLOCK no hay anidamiento.') }
    ] },
    av_vector: { name: 'Vectores: causas, prioridad e ISR que faltan', alts: [
      { title: 'Una guía telefónica', text: 'Al principio de la Flash hay una tabla con una entrada por fuente (26 en el 328P, contando RESET). ISR(INT0_vect) coloca tu función en la entrada de INT0. Si dos están pendientes, gana la de <b>vector más bajo</b> (RESET, INT0, INT1, PCINT0…). Si activas una interrupción sin escribir su ISR, salta a __bad_interrupt, que vuelve al vector 0: parece un reinicio. Una ISR vacía basta para despertar.', q: mcq('Activas PCIE0 para despertar y no escribes ISR(PCINT0_vect). ¿Qué pasa al pulsar?', ['Salta a __bad_interrupt y el programa vuelve a empezar', 'Despierta y sigue normal', 'Error de compilación', 'No pasa nada'], 'Aunque esté vacía, la ISR tiene que existir.') },
      { title: 'Cada vector con su causa', text: 'INT0_vect: PD2. PCINT0/1/2_vect: patas de los puertos B, C y D. TIMERn_COMPA, _OVF y _CAPT: coincidencia, desbordamiento y captura. USART_RX_vect: byte recibido. ADC_vect: conversión terminada. WDT_vect: watchdog. El orden de la tabla es la prioridad, y un vector activado sin ISR acaba en __bad_interrupt.', q: mcq('¿Qué vector salta al terminar una conversión del ADC?', ['ADC_vect', 'ANALOG_COMP_vect', 'TIMER1_CAPT_vect', 'INT0_vect'], 'ANALOG_COMP es el comparador.') }
    ] },
    av_extint: { name: 'INT0/INT1 frente a PCINT', alts: [
      { title: 'Dos tipos', text: '<b>INT0</b> (PD2) e <b>INT1</b> (PD3) tienen vector propio y eligen el disparo en EICRA: nivel bajo, cualquier cambio, bajada o subida. Las <b>PCINT</b> están en casi todas las patas, pero agrupadas: un vector por puerto (PCINT0 = B, PCINT1 = C, PCINT2 = D), siempre por cualquier cambio. PCICR activa el grupo y PCMSKn elige las patas; la ISR averigua cuál cambió.', q: mcq('Un pulsador en A2 debe interrumpir. ¿Qué activas?', ['PCIE1 en PCICR y PCINT10 en PCMSK1', 'INT0', 'PCIE0 en PCICR', 'INT1 por flanco'], 'A2 = PC2 = PCINT10, del grupo del puerto C.') },
      { title: '¿Quién ha cambiado?', text: 'Como el vector PCINT es compartido por todo un puerto, la ISR debe averiguar qué pata cambió: guarda el valor anterior de PINx y haz <b>XOR</b> con el actual. Los bits a 1 del resultado son los que cambiaron; luego mira su nivel para saber si subió o bajó. Para dos patas del puerto B (un codificador en PB0 y PB1), un solo vector: PCINT0.', q: mcq('antes = 0b0101, ahora = 0b0110. ¿Qué bits cambiaron?', ['Los bits 0 y 1', 'Solo el bit 2', 'Los bits 1 y 2', 'Ninguno'], '0101 ^ 0110 = 0011.') }
    ] },
    av_bounce: { name: 'Rebotes de un pulsador', alts: [
      { title: 'Un muelle que vibra', text: 'Al cerrar, el contacto metálico <b>rebota</b>: durante unos milisegundos abre y cierra varias veces. Una interrupción por flanco ve cada rebote como una pulsación. Remedios: un RC (por ejemplo, 10 kΩ y 100 nF) en la entrada, o ignorar los flancos durante unos 20 ms desde el primero.', q: mcq('Tu contador por INT0 sube de 1 a 4 en cada pulsación. ¿Causa?', ['Rebotes del contacto', 'Falta volatile', 'El prescaler', 'Falta sei()'], 'Varios flancos por pulsación.') },
      { title: 'Filtro por tiempo', text: 'En software: en la ISR, guarda el instante del último flanco aceptado y descarta los que lleguen antes de unos 20 ms. O no uses interrupción: lee el pulsador cada 5–10 ms y acepta el cambio solo si se repite en varias lecturas seguidas. Sin filtro, cada pulsación cuenta varias veces.', q: mcq('Con filtro de 20 ms llegan flancos a 0, 2, 5 y 150 ms. ¿Cuántas pulsaciones cuentas?', ['2', '4', '1', '3'], 'Aceptas 0 y 150; descartas 2 y 5.') }
    ] },
    av_shared: { name: 'Variables compartidas con una ISR', alts: [
      { title: 'Dos problemas distintos', text: '<b>Visibilidad</b>: sin volatile, el compilador puede guardar la variable en un registro y no volver a leer la que cambia la ISR. <b>Atomicidad</b>: una variable de 16 o 32 bits se lee en varios pasos y la ISR puede saltar en medio. volatile arregla lo primero; ATOMIC_BLOCK(ATOMIC_RESTORESTATE), lo segundo, restaurando el estado previo en vez de forzar sei(). Un uint8_t escrito por un solo lado basta con volatile.', q: mcq('Una variable de 16 bits compartida con una ISR necesita…', ['volatile y leerla con las interrupciones desactivadas', 'Solo volatile', 'Solo ATOMIC_BLOCK', 'Nada'], 'Son dos problemas y cada uno tiene su remedio.') },
      { title: 'La lectura rota', text: 'cuenta pasa de 0x00FF a 0x0100: lees el byte bajo (0xFF), salta la ISR, lees el alto (0x01) y obtienes 0x01FF, un valor que nunca existió. Copia la variable dentro de una sección crítica <b>lo más corta posible</b> y trabaja con la copia. Lo mismo con OCR1A o TCNT1, que usan un registro temporal compartido. Y sin volatile, el bucle puede no ver nunca el cambio.', q: mcq('¿Cuál necesita ATOMIC_BLOCK para leerse en loop() si una ISR la cambia?', ['volatile uint32_t milis;', 'volatile uint8_t estado;', 'const uint16_t limite = 500;', 'uint8_t local;'], 'Cuatro bytes se leen en cuatro pasos.') }
    ] },
    av_isrcost: { name: 'Coste de una ISR: latencia y carga', alts: [
      { title: 'El timbre de casa', text: 'Estás cocinando (loop). Suena el timbre (la bandera). Terminas el gesto, abres la puerta (la ISR) y vuelves. Si te entretienes en la puerta, se quema la comida y no oyes el teléfono: mientras dura una ISR, las demás esperan y su espera se suma a su latencia. Nada de delay(), Serial ni esperas dentro: copia el dato, pon una bandera y sal. Cuantos más registros use, más push y pop en su prólogo y epílogo.', q: mcq('Una ISR que tarda demasiado…', ['Retrasa o hace perder otros eventos y frena el programa principal', 'No afecta a nada', 'Hace el programa más rápido', 'Se repite sola'], 'Mientras dura, el resto espera.') },
      { title: 'Con números', text: 'Responder cuesta al menos 4 ciclos, más el salto y el prólogo: cada registro que guarda la ISR es un push al entrar y un pop al salir (2 + 2 ciclos). <b>Carga de CPU = ciclos por ISR × veces por segundo / F_CPU</b>: 200 ciclos × 40 000/s = 8 millones, la mitad de 16 MHz. Si llega mientras corre otra ISR, espera a que acabe. Serial o delay() dentro la alargan muchísimo (y Serial puede bloquearse).', q: mcq('Una ISR de 100 ciclos salta 16 000 veces por segundo a 16 MHz. ¿Carga?', ['10 %', '1 %', '100 %', '16 %'], '1,6 millones de 16 millones.') }
    ] },
    av_ring: { name: 'Búfer circular', alts: [
      { title: 'Una noria', text: 'Un array con dos índices: la <b>cabeza</b>, donde escribe el productor, y la <b>cola</b>, donde lee el consumidor. Al llegar al final vuelven a 0. Si cabeza = cola, está vacío; por eso se deja un hueco y caben TAM − 1. Con TAM potencia de 2, la vuelta es un &amp; (TAM − 1), sin dividir. El productor guarda el dato y solo después avanza la cabeza.', q: mcq('TAM = 32. ¿Cuántos bytes caben como máximo?', ['31', '32', '33', '16'], 'Se deja un hueco para distinguir lleno de vacío.') },
      { title: 'Primero el dato, luego el índice', text: 'Cada índice lo escribe un solo lado y es de 8 bits: no hace falta desactivar interrupciones. El orden sí importa: calcula el índice siguiente, comprueba que no alcanza la cola, guarda el dato y avanza la cabeza; si avanzaras antes, el consumidor podría leer una casilla aún vacía. TAM potencia de 2 (vuelta con &amp;) y capacidad TAM − 1.', q: mcq('El productor es una ISR. ¿Orden correcto?', ['Guardar en buf[cabeza] y luego avanzar cabeza', 'Avanzar cabeza y luego guardar', 'Da igual', 'Desactivar interrupciones y guardar'], 'Publicar el índice es lo último.') }
    ] },
    av_debug: { name: 'Depurar sin depurador', alts: [
      { title: 'Una pata que chiva', text: 'Pon una pata a 1 al entrar en la zona que quieres medir y a 0 al salir. En el osciloscopio o el analizador lógico, el ancho del pulso es su duración y el <b>ciclo de trabajo</b>, el % de CPU que gasta. Cuesta un par de ciclos: casi no altera los tiempos, al contrario que Serial.print(). Úsalo dentro de un método: reproducir, trazar, cambiar una cosa cada vez.', q: mcq('El pin de traza de una ISR está a 1 el 25 % del tiempo. ¿Qué te dice?', ['Que la ISR consume un 25 % de la CPU', 'Que salta 25 veces por segundo', 'Que dura 25 µs', 'Nada'], 'Ciclo de trabajo = fracción del tiempo dentro.') },
      { title: 'Errores tímidos', text: 'Serial.print() tarda mucho y cambia los tiempos: si el fallo depende del orden o de la velocidad, puede desaparecer al añadirlo. Método: reprodúcelo de forma fiable, anota la causa del último reinicio (MCUSR), pon <b>pines de traza</b> en los puntos sospechosos, cambia una sola cosa cada vez y comprueba durante horas que el arreglo aguanta.', q: mcq('Añades un Serial.print() para depurar y el fallo desaparece. ¿Qué sospechas?', ['Un problema de tiempos o de orden entre ISR y loop()', 'Que Serial lo ha arreglado', 'Un fallo de la Flash', 'Nada: ya está arreglado'], 'El print cambia los tiempos, no arregla la causa.') }
    ] },

    /* ---- Periféricos ---- */
    av_adc: { name: 'Reloj y tiempo de conversión del ADC', alts: [
      { title: 'El reloj del ADC', text: 'El ADC necesita su propio reloj, entre <b>50 y 200 kHz</b> para dar 10 bits. Sale del reloj de la CPU con un prescaler de 2 a 128. A 16 MHz solo /128 cumple (125 kHz). Una conversión dura 13 ciclos de ADC (25 la primera tras encenderlo): 104 µs, unas 9600 muestras por segundo.', q: mcq('A 8 MHz, ¿qué prescaler da el ADC más rápido dentro de 50–200 kHz?', ['64 (125 kHz)', '128', '32', '16'], '8 MHz / 32 = 250 kHz se pasa; /64 = 125 kHz.') },
      { title: 'Con números', text: 'Tiempo = ciclos / reloj del ADC. A 16 MHz con /128: 125 kHz; 13 ciclos = 104 µs; 125 000 / 13 ≈ 9600 muestras/s. La primera tras activar ADEN, 25 ciclos = 200 µs. Con /64 serían 250 kHz: más rápido, pero fuera de 50–200 kHz y con menos resolución efectiva.', q: mcq('F_CPU = 8 MHz y prescaler 64. ¿Cuánto tarda una conversión normal?', ['104 µs', '52 µs', '200 µs', '8 µs'], '125 kHz; 13 ciclos = 104 µs.') }
    ] },
    av_adcreg: { name: 'Registros del ADC: referencia, canal y resultado', alts: [
      { title: 'ADMUX bit a bit', text: '<b>REFS1:0</b> elige la referencia: 00 AREF externa, 01 AVcc, 11 interna de 1,1 V. <b>MUX3:0</b>, el canal (0–7). <b>ADLAR</b> = 1 alinea a la izquierda: ADCH tiene los 8 bits altos. Con AVcc o 1,1 V, la pata AREF está unida por dentro a la referencia: no le conectes ninguna fuente. El resultado se lee en ADCL y luego ADCH (o con la macro ADC).', q: mcq('ADMUX = (1 << REFS1) | (1 << REFS0) | 2; ¿Qué elige?', ['Referencia interna de 1,1 V y canal ADC2', 'AVcc y canal 2', 'AREF y canal 3', 'AVcc y canal 6'], 'REFS = 11 → 1,1 V; MUX = 0010.') },
      { title: 'Leer el resultado', text: 'Los 10 bits están repartidos en ADCL y ADCH. Al leer ADCL, el hardware <b>congela</b> el resultado hasta que leas ADCH: primero ADCL, luego ADCH (la macro ADC de 16 bits lo hace bien). Si te bastan 8 bits, ADLAR = 1 y lee solo ADCH. La referencia y el canal se eligen en ADMUX; si eliges AVcc o 1,1 V, no conectes nada a AREF.', q: mcq('Lees ADCH y después ADCL. ¿Riesgo?', ['Mezclar bytes de dos conversiones distintas', 'Ninguno', 'Que se apague el ADC', 'Que cambie la referencia'], 'El bloqueo empieza al leer ADCL.') }
    ] },
    av_adcimp: { name: 'Impedancia de la fuente y muestreo', alts: [
      { title: 'Llenar una taza', text: 'Al muestrear, un condensador interno de unos 14 pF se llena desde tu fuente a través de su resistencia. Si la fuente tiene mucha resistencia, no se llena a tiempo y la lectura sale baja o arrastra el valor del canal anterior.', q: mcq('Lees un divisor de 1 MΩ y las lecturas bailan. ¿Solución?', ['Un condensador de 100 nF en la entrada o un seguidor con operacional', 'Un prescaler más rápido', 'Cambiar a AREF', 'Ninguna'], 'Hay que darle a la taza un grifo con caudal.') },
      { title: 'Con números', text: 'El muestreo dura 1,5 ciclos de ADC: unos 12 µs a 125 kHz. La hoja de datos pide fuentes de <b>10 kΩ o menos</b>. Con 100 kΩ no da tiempo, sobre todo al cambiar de canal. Remedios: un seguidor con operacional, 100 nF en la entrada (si la señal es lenta) o una lectura de descarte tras cambiar de canal.', q: mcq('Alternas dos sensores de 100 kΩ y cada lectura se parece a la del otro canal. ¿Arreglo rápido?', ['Leer dos veces tras cambiar de canal y quedarte con la segunda', 'Subir el prescaler a /2', 'Cambiar a 1,1 V', 'Usar ADLAR'], 'Más tiempo para cargar el condensador de muestreo.') }
    ] },
    av_oversample: { name: 'Sobremuestreo: bits extra', alts: [
      { title: 'Cuatro por bit', text: 'Para ganar n bits: <b>suma 4ⁿ lecturas y desplaza n bits</b> a la derecha. 1 bit: 4 lecturas; 2 bits: 16; 3 bits: 64. Necesita algo de ruido (al menos 1 LSB) para que las lecturas varíen. Si sumas 16 y divides entre 16, solo promedias: menos ruido, pero sigues con 10 bits.', q: mcq('Para pasar de 10 a 13 bits, ¿cuántas lecturas y cuánto desplazas?', ['64 lecturas y desplazar 3', '8 lecturas y desplazar 3', '64 lecturas y dividir entre 64', '16 lecturas y desplazar 2'], '4³ = 64; >> 3.') },
      { title: 'El precio', text: 'Cada bit extra multiplica por 4 las lecturas: la velocidad útil se divide entre 4ⁿ. A 9600 muestras/s, 12 bits (16 lecturas, desplazar 2) dan 600 resultados por segundo. Promediar (dividir entre el número de lecturas) quita ruido pero no añade bits: para ganarlos hay que desplazar menos.', q: mcq('A 9600 muestras/s, ¿cuántos resultados de 11 bits por segundo?', ['2400', '4800', '9600', '600'], '1 bit extra = 4 lecturas.') }
    ] },
    av_vcc: { name: 'Medir VCC con la referencia interna', alts: [
      { title: 'Regla de tres al revés', text: 'Con referencia AVcc, ADC = Vin · 1024 / VCC. Si mides la referencia interna de 1,1 V (MUX = 1110), despejas <b>VCC = 1,1 × 1024 / ADC</b>. Lectura 225: VCC ≈ 5,0 V. Sin componentes: ideal para vigilar una pila. Como la de 1,1 V varía de un chip a otro, para precisión hay que calibrarla.', q: mcq('Con referencia AVcc, la lectura de la de 1,1 V da 341. ¿VCC?', ['Unos 3,3 V', 'Unos 5 V', '1,1 V', 'Unos 0,37 V'], '1,1 × 1024 / 341 ≈ 3,30 V.') },
      { title: 'Calibrar la referencia', text: 'La de 1,1 V varía entre chips (de 1,0 a 1,2 V), así que VCC = 1,1 × 1024 / ADC puede errar un 10 %. Calibra una vez: mide VCC con un buen multímetro, calcula la referencia real = VCC × ADC / 1024 y guárdala en la EEPROM para usarla en lugar de 1,1.', q: mcq('VCC real es 5,00 V y la lectura de la referencia es 230. ¿Cuánto vale de verdad la referencia?', ['Unos 1,12 V', '1,10 V', '1,00 V', '0,23 V'], '5 × 230 / 1024 ≈ 1,123 V.') }
    ] },
    av_uart: { name: 'UBRR y error de baudios', alts: [
      { title: 'UBRR con números', text: '<b>UBRR0 = F_CPU / (16 · baudios) − 1</b>, redondeado (con U2X0 = 1, entre 8). 9600 baudios a 16 MHz: 103,17 → 103. Baudios reales: 16 000 000 / (16 × 104) = 9615. Error: +0,16 %. Lo que importa es la diferencia entre los dos extremos: no pases de un 2 % en total.', q: mcq('UBRR0 = 51 a 16 MHz, modo normal. ¿Baudios reales?', ['19 231', '19 200', '9615', '38 462'], '16 000 000 / (16 × 52).') },
      { title: 'Dos relojes que no se hablan', text: 'Emisor y receptor miden los bits con sus propios relojes. El receptor se sincroniza con el bit de inicio y muestrea en mitad de cada bit. Si los relojes difieren, al final de la trama (10 bits) el desfase se ha acumulado; medio bit sería un 5 %, y con margen para el ruido se recomienda no pasar de ±2 % en total. +2 % en uno y −2 % en otro suman 4 %: falla.', q: mcq('¿Por qué el error de baudios se acumula a lo largo de la trama?', ['Cada bit se mide desde el bit de inicio: el desfase crece bit a bit', 'Por la longitud del cable', 'Por la paridad', 'No se acumula'], 'Por eso las tramas son cortas.') },
      { title: 'Cristales que dividen exacto', text: 'El error sale de redondear UBRR. Si F_CPU / (16 · baudios) es entero, el error es 0: a 16 MHz, 31 250 o 250 000 baudios; los cristales de 14,7456 o 18,432 MHz dividen exacto todas las velocidades estándar. U2X0 = 1 (divide entre 8) da un paso más fino: 115 200 a 16 MHz pasa de −3,5 % a +2,1 %.', q: mcq('¿Qué velocidad tiene un error del 0 % a 16 MHz en modo normal?', ['250 000 baudios', '115 200', '57 600', '9600'], '16 000 000 / (16 × 250 000) = 4: UBRR0 = 3.') }
    ] },
    av_uartrate: { name: 'Cuánto tarda la comunicación serie', alts: [
      { title: '10 bits por byte', text: 'En 8N1 cada byte son <b>10 bits</b> (inicio, 8 datos y parada). Bytes por segundo = baudios / 10: 9600 → 960 B/s; 115 200 → 11 520 B/s. Un carácter a 115 200 tarda 10 / 115 200 ≈ 86,8 µs. En un tiempo t llegan baudios / 10 × t bytes: es el hueco que necesita el búfer.', q: mcq('¿Cuánto tarda un byte a 9600 baudios (8N1)?', ['Unos 1,04 ms', '104 µs', '9,6 ms', '0,83 ms'], '10 bits / 9600 ≈ 1,04 ms.') },
      { title: 'Búferes que se llenan', text: 'Si loop() tarda t en volver a leer, en ese tiempo llegan baudios / 10 × t bytes: el búfer de recepción debe tener ese hueco y algo de margen. Al enviar, Serial guarda hasta 64 bytes; si lo llenas, print() espera a que salgan: 64 bytes a 9600 baudios (640 bits) son 67 ms de loop() congelado.', q: mcq('A 38 400 baudios, ¿cuántos bytes llegan en 10 ms?', ['Unos 38', '384', 'Unos 4', '48'], '3840 B/s × 0,01 s.') }
    ] },
    av_uartreg: { name: 'USART por registros: banderas e interrupciones', alts: [
      { title: 'El tablero de banderas', text: 'UCSR0A: <b>RXC0</b> (ha llegado un byte), <b>UDRE0</b> (hueco para enviar otro), <b>FE0</b> (error de trama: el bit de parada no llegó a 1, típico de baudios distintos o ruido) y <b>DOR0</b> (desbordamiento: llegó un byte y nadie leyó el anterior a tiempo). Con interrupciones, UDRE salta mientras haya hueco: desactívala cuando no quede nada que enviar.', q: mcq('Antes de escribir en UDR0, ¿qué bandera esperas?', ['UDRE0 a 1', 'RXC0 a 1', 'FE0 a 0', 'DOR0 a 1'], 'Data Register Empty: hay hueco.') },
      { title: 'Con interrupciones', text: 'RXCIE0 llama a USART_RX_vect por cada byte recibido. UDRIE0 llama a USART_UDRE_vect mientras haya hueco, es decir, sin parar si no hay nada que enviar: desactívala cuando el búfer de envío se vacíe. Si usas Serial, el núcleo de Arduino ya define esas ISR: no puedes escribir las tuyas a la vez. FE0 y DOR0 avisan de tramas malas y bytes perdidos.', q: mcq('Activas UDRIE0 con el búfer de envío vacío. ¿Qué pasa?', ['La ISR de UDRE salta sin parar y se come la CPU', 'No salta nunca', 'Salta una vez', 'Se envía un 0'], 'UDRE está a 1 mientras haya hueco.') }
    ] },
    av_uartwire: { name: 'Conectar dos equipos serie', alts: [
      { title: 'Cruzado y con masa', text: 'Lo que uno transmite, el otro lo recibe: <b>TX con RX y RX con TX</b>, más una <b>masa común</b> (sin ella, los niveles no tienen referencia). Los dos lados, mismos baudios y formato. Si los niveles no coinciden (5 V frente a 3,3 V), adapta la línea que va hacia el de 3,3 V.', q: mcq('Unes TX con TX y RX con RX. ¿Qué pasa?', ['No se comunican: dos salidas enfrentadas y dos entradas sin señal', 'Funciona igual', 'Va el doble de rápido', 'Se invierte la polaridad'], 'Hay que cruzar.') },
      { title: 'Niveles', text: 'La Uno saca 5 V por TX. Un módulo de 3,3 V puede no tolerarlos: pon un divisor (por ejemplo, 1 kΩ en serie y 2 kΩ a masa) o un adaptador de nivel en la línea que va de la Uno al módulo. En sentido contrario, 3,3 V superan los 3 V (0,6·VCC) que la Uno necesita para un 1, aunque con poco margen. Y siempre TX con RX y masa común.', q: mcq('Divisor para bajar el TX de 5 V de la Uno a un RX de 3,3 V:', ['1 kΩ en serie y 2 kΩ a masa', '2 kΩ en serie y 1 kΩ a masa', 'Un solo 1 kΩ en serie', 'Un diodo a VCC'], '5 × 2 / 3 ≈ 3,3 V.') }
    ] },
    av_bus: { name: 'Bus SPI', alts: [
      { title: 'Dos registros en anillo', text: 'En SPI, el registro del maestro y el del esclavo forman un anillo. Cada pulso de SCK saca un bit de cada uno y lo mete en el otro: tras 8 pulsos han intercambiado sus bytes. Para leer hay que enviar algo (0xFF, por ejemplo). Varios esclavos comparten SCK, MOSI y MISO, y cada uno tiene su CS. Un 74HC595 recibe así los bits y los muestra al dar un pulso en su latch (RCLK). En maestro, SS debe ser salida.', q: mcq('¿Por qué para leer por SPI hay que escribir?', ['Cada pulso de reloj intercambia un bit en cada sentido: sin enviar no hay reloj', 'Por seguridad', 'No hace falta', 'Para despertar al esclavo'], 'El maestro solo genera reloj al enviar.') },
      { title: 'Señales, modo y velocidad', text: 'En la Uno: SCK = D13 (PB5), MISO = D12, MOSI = D11, SS = D10. SCK = F_CPU / 4, 16, 64 o 128, y SPI2X lo duplica: como mucho F_CPU / 2 = 8 MHz, 1 µs por byte. <b>Modo = CPOL × 2 + CPHA</b>. En maestro, deja SS como salida: si es entrada y baja a 0, el SPI pasa a esclavo. Cada esclavo lleva su CS, y para leer hay que enviar.', q: mcq('Un chip pide CPOL = 1 y CPHA = 1. ¿Modo?', ['3', '1', '2', '0'], '1 × 2 + 1.') }
    ] },
    av_i2c: { name: 'Bus I²C (TWI)', alts: [
      { title: 'Una reunión ordenada', text: 'En I²C todos comparten dos cables (SDA y SCL). Se habla por turnos y llamando por el nombre (la dirección de 7 bits). Las salidas son de <b>drenador abierto</b>: nadie empuja la línea a 1, lo hacen las pull-ups (4,7 kΩ típico; las internas son demasiado débiles); cada uno solo tira a 0, y así no hay cortos. El ACK es un «te he oído»: el receptor tira la línea a 0. Velocidad: f_SCL = F_CPU / (16 + 2·TWBR).', q: mcq('Si ningún dispositivo responde a una dirección…', ['El ACK queda a 1 (NACK) y el maestro lo ve en TWSR', 'El bus se rompe', 'Responde el más cercano', 'El maestro se reinicia'], 'Nadie tira de la línea: queda en 1 por la pull-up.') },
      { title: 'Por registros', text: 'Cada escritura: START, dirección + bit R/W, comprobar ACK, datos, STOP. <b>TWSR &amp; 0xF8</b> dice cómo fue: 0x08 START, 0x18 dirección con ACK, 0x20 sin ACK. La dirección de 7 bits desplazada un bit con el R/W da el byte que viaja: 0x27 → 0x4E. Velocidad con TWPS = 0: <b>TWBR = (F_CPU / f_SCL − 16) / 2</b>. Las líneas son de drenador abierto y necesitan pull-ups.', q: mcq('A 16 MHz y TWPS = 0, ¿TWBR para 100 kHz?', ['72', '80', '160', '12'], '(160 − 16) / 2 = 72.') }
    ] },
    av_acomp: { name: 'El comparador analógico', alts: [
      { title: 'Un vigilante instantáneo', text: 'Compara AIN0 (D6) con AIN1 (D7), o la referencia interna de 1,1 V con AIN1. La salida ACO cambia al momento, sin conversión, y puede lanzar una interrupción en cuanto la tensión cruza el umbral: ideal para vigilar una batería sin ocupar el ADC ni la CPU.', q: mcq('¿Qué ventaja tiene frente a leer el ADC cada segundo?', ['Avisa al instante por interrupción sin ocupar el ADC ni la CPU', 'Da 10 bits', 'Mide corriente', 'Es más preciso'], 'Solo dice mayor o menor, pero al momento.') },
      { title: 'Con un divisor', text: 'Para avisar cuando una batería baja de 4,4 V: un divisor que entregue 1,1 V justo a 4,4 V (factor 1/4) a AIN1 y la referencia interna de 1,1 V en la otra entrada. Cuando la batería cae por debajo, ACO cambia y salta la interrupción, sin leer el ADC.', q: mcq('Divisor de factor 1/4 y referencia de 1,1 V. ¿A qué tensión de batería cambia la salida?', ['4,4 V', '1,1 V', '2,2 V', '5,5 V'], '1,1 × 4.') }
    ] },

    /* ---- Energía y fiabilidad ---- */
    av_wdt: { name: 'Watchdog: reinicios y configuración', alts: [
      { title: 'Un perro guardián', text: 'El watchdog cuenta con su oscilador de 128 kHz; si no lo reinicias (wdt_reset()) antes del plazo (16 ms a 8 s), reinicia el chip. wdt_reset() va en un único punto del bucle principal que solo se alcanza si todo va bien, nunca en una ISR de temporizador. Tras un reinicio por watchdog sigue activo con 16 ms: bórralo lo primero (WDRF en MCUSR y wdt_disable()), o se reiniciará en bucle; algunos bootloaders viejos caen en ese bucle.', q: mcq('Pones wdt_reset() en la ISR de un temporizador. ¿Problema?', ['Si loop() se cuelga, la ISR lo sigue acariciando y nunca reinicia', 'Ninguno', 'Reinicia cada 16 ms', 'No compila'], 'Debe depender de que el programa principal avance.') },
      { title: 'Los bits de WDTCSR', text: '<b>WDE</b>: reinicio al expirar. <b>WDIE</b>: interrupción al expirar. <b>WDP3:0</b>: el plazo. <b>WDCE</b>: para cambiar WDE o el plazo hay que escribir WDCE y WDE a la vez y el valor nuevo en menos de 4 ciclos, así un programa descontrolado no lo apaga por accidente. El fusible WDTON lo deja siempre activo. Tras un reinicio por watchdog sigue activo: desactívalo al principio.', q: mcq('¿Qué combinación hace del watchdog un despertador sin reinicio?', ['WDIE = 1 y WDE = 0', 'WDE = 1 y WDIE = 0', 'Solo WDCE = 1', 'WDTON programado'], 'Solo interrupción.') }
    ] },
    av_sleepmode: { name: 'Modos de sueño', alts: [
      { title: 'Qué se apaga en cada uno', text: '<b>Idle</b>: solo para la CPU; temporizadores, USART y ADC siguen. <b>ADC Noise Reduction</b>: casi solo el ADC, para medir sin ruido. <b>Power-save</b>: como power-down, pero el Timer2 asíncrono (cristal de 32 768 Hz) sigue. <b>Power-down</b>: todo parado salvo el watchdog y los despertares externos. Al despertar de power-down con cristal hay que esperar unos 16 000 ciclos (1 ms a 16 MHz); con el RC interno, 6.', q: mcq('Necesitas que la USART siga recibiendo mientras la CPU descansa. ¿Modo?', ['Idle', 'Power-down', 'Power-save', 'ADC Noise Reduction'], 'Solo Idle mantiene el reloj de E/S.') },
      { title: 'La secuencia', text: 'Configura qué te despertará, apaga lo que no hace falta (ADC, comparador), elige el modo (set_sleep_mode), <b>sleep_enable()</b>, <b>sei()</b> y <b>sleep_cpu()</b> seguidos. Al despertar, sleep_disable() y vuelve a encender lo apagado. Elige el modo más profundo que conserve lo que necesitas: power-save si el Timer2 con cristal debe seguir contando.', q: mcq('¿Qué va justo antes de sleep_cpu()?', ['sleep_enable() y sei()', 'sleep_disable()', 'wdt_disable()', 'ADCSRA |= (1 << ADEN)'], 'Sin sleep_enable, la instrucción sleep no hace nada.') }
    ] },
    av_leak: { name: 'Consumo dormido: qué gasta y cómo medirlo', alts: [
      { title: 'Lo que gasta dormido', text: 'En power-down el chip (328P o ATtiny85) baja a unos <b>0,1 µA</b> con el watchdog apagado; todo lo que mides de más es algo que sigue encendido. Pueden seguir gastando: el ADC encendido (ADEN = 1, cientos de µA), el BOD (unos 20 µA; sleep_bod_disable() lo apaga mientras duerme), el watchdog (unos 4 µA), las entradas flotantes, los sensores y los LEDs. Hay que apagar cada uno.', q: mcq('Duermes en power-down y mides 250 µA. ¿Primer sospechoso?', ['El ADC encendido', 'El cristal', 'La Flash', 'La pila de la SRAM'], 'ADEN = 1 gasta aunque no convierta.') },
      { title: 'Entradas a medias y medidas', text: 'Una entrada que flota queda a media tensión: los dos transistores del buffer CMOS conducen a la vez. Fija cada pata (pull-up o salida), apaga el ADC, el BOD y los sensores entre medidas. Para medir µA, el multímetro en serie mete una caída de tensión en sus rangos bajos: al despertar, el pico puede tumbar el chip; puentéalo mientras despierta. Dormido, el chip solo debería gastar unos 0,1 µA.', q: mcq('¿Qué haces con las patas que no usas antes de dormir?', ['Pull-up interna o salida a un nivel fijo', 'Dejarlas como entradas sueltas', 'Ponerlas en PWM', 'Nada'], 'Una entrada flotante gasta.') }
    ] },
    av_wake: { name: 'Despertar del power-down', alts: [
      { title: 'Sin reloj no hay flancos', text: 'En power-down no hay reloj de E/S, así que solo despiertan: INT0/INT1 <b>por nivel bajo</b>, cualquier <b>PCINT</b>, la coincidencia de dirección TWI y el <b>watchdog</b>. Una INT0 por flanco no despierta. Un pulsador en PD3: INT1 por nivel bajo o PCINT19. El watchdog despierta cada 8 s como mucho: para periodos largos, cuenta despertares.', q: mcq('Un pulsador en D2 debe despertar al chip de power-down. ¿Configuración?', ['INT0 por nivel bajo (o PCINT18)', 'INT0 por flanco de subida', 'El Timer1 en CTC', 'La USART'], 'Las de flanco necesitan reloj.') },
      { title: 'El despertador y la carrera', text: 'El watchdog en modo interrupción despierta cada 8 s como mucho: para medir cada 10 minutos, cuentas 600 / 8 = 75 despertares. Si compruebas «¿hay trabajo?» y luego duermes, una interrupción entre medias te deja dormido sin atenderla: haz cli(), comprueba y, si no hay nada, sei() y sleep_cpu() seguidos. Y recuerda: INT0/INT1 solo despiertan por nivel bajo.', q: mcq('¿Cuántos despertares de 8 s para medir cada hora?', ['450', '60', '480', '7,5'], '3600 / 8.') }
    ] },
    av_reset: { name: 'Causas de reinicio: MCUSR', alts: [
      { title: 'La caja negra', text: '<b>MCUSR</b> guarda por qué se reinició: PORF (bit 0, encendido), EXTRF (bit 1, pata RESET), BORF (bit 2, baja tensión) y WDRF (bit 3, watchdog). Léelo al arrancar y bórralo. BORF repetido al arrancar un motor indica caídas de alimentación: alimentación separada, condensadores y masas bien llevadas.', q: mcq('MCUSR vale 0x04 al arrancar. ¿Causa?', ['Brown-out (BORF)', 'Watchdog', 'Pata RESET', 'Encendido'], 'Bit 2 = BORF.') },
      { title: 'Bits como suma', text: 'Si hay varias causas sin borrar, se suman sus bits: BORF (4) y WDRF (8) dan 12; EXTRF (2) y PORF (1) dan 3. Mira qué bits están a 1. Un BORF cada vez que algo consume mucho (un motor arrancando) significa que la tensión se hunde: separa alimentaciones y pon condensadores.', q: mcq('MCUSR = 0x09. ¿Qué causas hay?', ['Watchdog y encendido', 'Brown-out y RESET', 'Solo watchdog', 'Brown-out y encendido'], '8 + 1.') }
    ] },
    av_sleep: { name: 'Presupuesto de batería', alts: [
      { title: 'Media ponderada', text: 'Consumo medio = (I despierto × t despierto + I dormido × t dormido) / periodo. Autonomía = capacidad / consumo medio. Si duermes el 99,9 % del tiempo, casi siempre manda la corriente <b>dormido</b>.', q: mcq('10 mA durante 10 ms cada 10 s y 5 µA dormido. ¿Media aproximada?', ['15 µA', '10 mA', '5 µA', '1 mA'], '10 mA × 0,001 = 10 µA, más 5 µA.') },
      { title: 'De la media a los días', text: 'Autonomía (h) = capacidad (mAh) / corriente media (mA). 2500 mAh a 25 mA = 100 h, unos 4 días; a 25 µA = 100 000 h, unos 11 años (en la práctica manda antes la autodescarga). Cuenta con un 70–80 % de la capacidad nominal por frío y picos. Las pilas de botón tienen mucha resistencia interna: un pico de 20 mA hunde su tensión y pide un condensador grande en paralelo.', q: mcq('Una CR2032 (220 mAh) con 10 µA de media. ¿Autonomía ideal?', ['Unos 2,5 años', 'Unos 22 días', '220 horas', 'Unos 25 años'], '22 000 h ≈ 2,5 años.') },
      { title: 'Placa contra chip', text: 'Una Uno entera sigue gastando decenas de mA con el 328P dormido: el ATmega16U2 del USB, el regulador y el LED de encendido. Con 25 mA, 2500 mAh duran unos 4 días. El chip suelto en power-down gasta miles de veces menos: la media la marcan el sueño y los despertares.', q: mcq('Para un sensor a pilas que dure un año…', ['Chip suelto (o placa mínima sin LED ni regulador) en power-down', 'Una Uno en power-down', 'Una Uno con delay()', 'Una Uno con el USB conectado'], 'La placa entera es la que gasta.') }
    ] },

    /* ---- El chip fuera de la placa ---- */
    av_boot: { name: 'Bootloader y carga por serie', alts: [
      { title: 'La puerta de servicio', text: 'El <b>bootloader</b> (Optiboot, 512 bytes al final de la Flash) arranca tras un reset externo, escucha el puerto serie un instante y, si llega un programa, lo graba; si no, salta a tu código. El IDE provoca ese reset con la línea <b>DTR</b> del adaptador a través de 100 nF (auto-reset); un diodo de RESET a VCC impide que ese pulso suba RESET por encima de VCC. Sin bootloader o sin auto-reset: «not in sync».', q: mcq('Tu Arduino casero da «not in sync» y el chip es nuevo. ¿Causa más probable?', ['No tiene bootloader grabado', 'El cristal es de 16 MHz', 'Falta el LED de D13', 'AVCC está conectada'], 'Un chip de fábrica viene vacío.') },
      { title: 'Con y sin bootloader', text: 'Con bootloader cargas por USB–serie sin programador: TX del adaptador a RXD (pata 2), RX a TXD (pata 3), DTR por 100 nF a RESET. A cambio ocupa 512 bytes, retrasa el arranque tras un reset (espera por si llega un programa) y deja reprogramar por el puerto serie. Un producto terminado puede ir sin él y grabarse por ISP.', q: mcq('Al pulsar RESET, tu programa tarda un momento en arrancar. ¿Por qué?', ['El bootloader espera por si llega un programa', 'Un fallo del cristal', 'El BOD', 'La EEPROM'], 'Optiboot espera tras un reset externo.') }
    ] },
    av_fuse: { name: 'Fusibles', alts: [
      { title: 'Fusibles al revés', text: 'En los fusibles, un bit a <b>0 significa programado</b> (activo) y un 1, no programado. CKDIV8 = 0 divide el reloj entre 8; BOOTRST = 0 hace arrancar en el bootloader; EESAVE = 0 conserva la EEPROM al borrar; CKOUT = 0 saca el reloj por PB0. De fábrica: RC de 8 MHz con CKDIV8 programado, es decir, 1 MHz. Bits peligrosos: RSTDISBL y SPIEN te dejan sin ISP.', q: mcq('CKDIV8 = 0 significa…', ['Que el reloj se divide entre 8', 'Que está desactivado', 'Que el chip va a 8 MHz', 'Que arranca en el bootloader'], '0 = programado = activo.') },
      { title: 'Los tres bytes', text: '<b>Low</b>: reloj (CKSEL, SUT, CKOUT, CKDIV8). <b>High</b>: RSTDISBL, DWEN, SPIEN, WDTON, EESAVE, BOOTSZ y BOOTRST. <b>Extended</b>: BODLEVEL. Solo se graban con un programador: tu programa puede leerlos, no cambiarlos. «Grabar bootloader» del IDE graba también los fusibles de la placa elegida. Recuerda: 0 = activo.', q: mcq('Un 328P recién comprado, sin tocar los fusibles, va a…', ['1 MHz (RC de 8 MHz entre 8)', '16 MHz', '8 MHz', '20 MHz'], 'CKDIV8 viene programado.') },
      { title: 'Lo que cuesta deshacer', text: 'RSTDISBL convierte RESET en una E/S y el ISP deja de funcionar. SPIEN a 1 apaga el ISP. Los dos solo se arreglan con un programador de alta tensión. Un CKSEL de cristal sin cristal deja el chip mudo hasta que le pongas uno (o le inyectes un reloj en XTAL1): eso sí se recupera fácil. Recuerda: 0 = programado, y de fábrica el chip va a 1 MHz (CKDIV8 programado).', q: mcq('¿Qué fusible te deja sin ISP?', ['RSTDISBL programado', 'EESAVE', 'CKOUT', 'BODLEVEL'], 'Sin pata RESET no hay programación por SPI.') }
    ] },
    av_isp: { name: 'Programar por ISP', alts: [
      { title: 'Dos puertas', text: 'El <b>bootloader</b> es una puerta de servicio que abre el propio chip. El <b>ISP</b> es la puerta principal: SPI (MOSI, MISO, SCK) con RESET a 0, siempre disponible (si no tocas SPIEN ni RSTDISBL), aunque la Flash esté vacía. Al grabar por ISP se borra toda la Flash, bootloader incluido. avrdude comprueba la firma (1E 95 0F = ATmega328P).', q: mcq('Un chip nuevo sin bootloader se programa…', ['Por ISP', 'Por USB-serie', 'No se puede', 'Por I²C'], 'El ISP no necesita nada grabado.') },
      { title: 'Lo práctico', text: 'El SCK del ISP debe ser <b>menor que 1/4 del reloj del chip</b>: uno a 1 MHz necesita un ISP lento (avrdude -B). Con Arduino as ISP, 10 µF entre RESET y GND de la placa programadora para que no se reinicie al abrir el puerto. «Subir usando programador» borra el bootloader. debugWIRE (fusible DWEN) usa la pata RESET para depurar paso a paso y, mientras está activo, el ISP no funciona.', q: mcq('El ISP no responde con un chip que va a 1 MHz. ¿Qué cambias?', ['Bajar la velocidad del ISP (SCK por debajo de 250 kHz)', 'Subir VCC', 'Quitar el cristal', 'Grabar el bootloader'], 'SCK menor que 1/4 del reloj.') }
    ] },
    av_tiny: { name: 'ATtiny85 frente al 328P', alts: [
      { title: 'Un AVR en miniatura', text: 'DIP-8: pata 1 PB5/RESET, 4 GND, 8 VCC; pata 5 PB0, 6 PB1, 7 PB2, 2 PB3 y 3 PB4. 8 KB de Flash, 512 B de SRAM, ADC y dos temporizadores, pero <b>sin USART, SPI ni TWI de hardware</b>: tiene una USI genérica con la que se emulan SPI e I²C, y Serial se hace por software.', q: mcq('¿Qué periférico de hardware NO tiene el ATtiny85?', ['USART', 'ADC', 'Temporizadores', 'Watchdog'], 'La serie se hace por software.') },
      { title: 'Mismo núcleo, otros nombres', text: 'Tu C con registros funciona casi igual, pero cambian nombres: el watchdog es WDTCR y las interrupciones externas se activan en GIMSK. Lo que no tiene, se emula: SPI e I²C con la USI y una serie por software, más lenta y que ocupa la CPU. En el DIP-8, VCC es la pata 8, GND la 4 y RESET la 1.', q: mcq('Tu código del 328P usa Serial.begin(). ¿En el ATtiny85?', ['Necesitas una serie por software: no hay USART', 'Funciona igual', 'Usa la USI sin cambios', 'No se puede comunicar'], 'Sin USART de hardware.') }
    ] },

    /* ---- Herramientas ---- */
    av_tool: { name: 'avr-gcc, avr-objcopy y avrdude', alts: [
      { title: 'Cadena de montaje', text: '.c → avr-gcc → .o → enlazador → .elf → avr-objcopy → .hex → avrdude → chip. El .elf lo tiene todo (código, símbolos, depuración); el .hex es solo lo que se graba. -mmcu=atmega328p dice para qué chip compilar: registros, memorias y vectores.', q: mcq('¿Qué archivo graba avrdude en la Flash?', ['El .hex', 'El .c', 'El .o', 'El .map'], 'El .hex es la imagen de la Flash en texto.') },
      { title: 'Las opciones', text: 'En avr-gcc, <b>-mmcu</b> elige el chip. En avrdude, <b>-c</b> es el programador (arduino = bootloader de la Uno, usbasp, stk500v1 = Arduino as ISP), <b>-p</b> el chip (m328p), <b>-P</b> el puerto y <b>-U</b> la operación: flash:w:main.hex:i graba la Flash; lfuse:w:0xFF:m escribe el fusible low. El flujo: compilar a .elf, extraer .hex, grabar.', q: mcq('¿Qué opción de avrdude dice qué programador usas?', ['-c', '-p', '-U', '-P'], '-p es el chip, -P el puerto y -U la operación.') }
    ] },
    av_make: { name: 'make y las opciones de optimización', alts: [
      { title: 'Recetas con fecha', text: 'Un Makefile dice cómo se hace cada archivo y de cuáles depende. make compara fechas: solo rehace lo que es más antiguo que sus dependencias. Cambias pantalla.c → recompila pantalla.o y vuelve a enlazar. Cada orden de una receta empieza por un <b>tabulador</b> (si no, «missing separator»). En CFLAGS se pone -Os, lo normal en AVR.', q: mcq('Cambias solo main.c en un proyecto con main.c y uart.c. make…', ['Recompila main.o y vuelve a enlazar', 'Recompila todo', 'Solo enlaza', 'No hace nada'], 'uart.o no ha cambiado.') },
      { title: 'Opciones que ahorran Flash', text: '<b>-Os</b> optimiza para tamaño (lo normal en AVR y lo que usa Arduino); -O2 busca velocidad a costa de ocupar más. <b>-ffunction-sections -fdata-sections</b> ponen cada función y variable en su sección y <b>-Wl,--gc-sections</b> hace que el enlazador quite las que nadie usa. make solo recompila lo que ha cambiado, y sus órdenes van tras un tabulador.', q: mcq('Tu programa no cabe en 32 KB. ¿Qué pruebas?', ['-Os y --gc-sections con -ffunction-sections', '-O0', '-O3', '-g'], 'Tamaño y eliminar código muerto.') }
    ] },
    av_asm: { name: 'Leer ensamblador AVR', alts: [
      { title: 'Diccionario mínimo', text: '<b>ldi</b> carga una constante; <b>in/out</b> leen y escriben E/S; <b>lds/sts</b>, la SRAM; <b>sbi/cbi</b> ponen a 1 o a 0 un bit de E/S (solo E/S 0x00–0x1F); <b>sbis/sbic</b> saltan la siguiente instrucción si un bit de E/S está a 1 o a 0; <b>brne</b> salta si el último resultado no fue cero; <b>rjmp</b> salta siempre. En E/S, DDRB = 0x04, PINB = 0x03 y PORTB = 0x05.', q: mcq('¿Qué hace sbic 0x09, 2?', ['Salta la siguiente instrucción si el bit 2 de PIND está a 0', 'Pone a 0 el bit 2 de PIND', 'Salta si está a 1', 'Lee PIND entero'], 'Skip if Bit in I/O is Cleared; 0x09 es PIND.') },
      { title: 'Dos direcciones por registro', text: 'in, out, sbi y cbi usan direcciones de E/S; lds y sts, direcciones de datos, que son <b>0x20 más</b> (PORTB: 0x05 y 0x25). sbi y cbi solo llegan a las E/S 0x00–0x1F: los puertos sí, pero TCCR1B (datos 0x81) necesita lds, ori y sts. Así, sbi 0x04, 5 pone PB5 como salida (DDRB) y sbi 0x03, 5 la conmuta (PINB).', q: mcq('PORTD está en la E/S 0x0B. ¿Su dirección de datos?', ['0x2B', '0x0B', '0x4B', '0x1B'], 'Se suma 0x20.') }
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
  }, 'av_ctc');

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
  }, 'av_pinmap');

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
  }, 'av_icp');

  Gen.add('av_twbr', () => {
    const [fc, scl] = pick([[16e6, 100e3], [16e6, 400e3], [16e6, 50e3], [16e6, 200e3], [8e6, 100e3], [8e6, 50e3], [20e6, 100e3]]);
    const tw = (fc / scl - 16) / 2;
    return N(`TWI con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler 1 (TWPS = 0). ¿Qué TWBR da un SCL de ${fmt(scl / 1000)} kHz?`, tw, '', `f_SCL = F_CPU / (16 + 2 · TWBR) → TWBR = (${th(fc)} / ${th(scl)} − 16) / 2 = ${fmt(tw)}.`, 0.5);
  }, 'av_i2c');

  Gen.add('av_eeLife', () => {
    const m = pick([1, 2, 5, 10, 30, 60]), cells = pick([1, 1, 4, 16, 100]);
    const years = 100000 * m * cells / (60 * 24 * 365);
    return N(`Guardas un dato en la EEPROM cada ${m} min, repartiendo las escrituras por igual entre ${cells} ${cells === 1 ? 'celda' : 'celdas'}. Si cada celda aguanta 100 000 escrituras, ¿cuántos años dura?`, years, 'años', `Cada celda recibe una escritura cada ${m * cells} min. 100 000 × ${m * cells} min = ${th(100000 * m * cells)} min ≈ ${fmt(years, 2)} años. Repartir el desgaste (wear leveling) multiplica la vida.`, Math.max(0.01, years * 0.03));
  }, 'av_eeprom');

  Gen.add('av_cycles', () => {
    const c = pick(['ns', 'loop', 'sbi', 'us']);
    if (c === 'ns') { const f = pick([1, 4, 8, 16, 20]); return N(`A ${f} MHz, ¿cuántos nanosegundos dura un ciclo de reloj?`, 1000 / f, 'ns', `1 / ${f} MHz = ${fmt(1000 / f, 2)} ns.`, 0.5); }
    if (c === 'loop') { const n = ri(10, 250); return N(`Bucle en ensamblador: ldi r24, ${n} (1 ciclo); luego dec r24 (1 ciclo) y brne (2 ciclos si salta, 1 si no) hasta llegar a 0. ¿Cuántos ciclos en total?`, 3 * n, 'ciclos', `1 (ldi) + ${n} × 1 (dec) + ${n - 1} × 2 (brne salta) + 1 (brne no salta) = ${3 * n}.`, 0.5); }
    if (c === 'sbi') { const f = pick([8, 16, 20]); return N(`Bucle infinito “sbi PINB, 5” (2 ciclos) + “rjmp” (2 ciclos) a ${f} MHz. ¿Frecuencia de la onda en D13, en MHz?`, f / 8, 'MHz', `Cada conmutación cada 4 ciclos; un periodo son dos conmutaciones, 8 ciclos: ${f} / 8 = ${fmt(f / 8)} MHz.`, 0.01); }
    const k = pick([1000, 4000, 16000, 50000]), f = pick([8, 16]);
    return N(`Una rutina tarda ${th(k)} ciclos a ${f} MHz. ¿Cuántos µs son?`, k / f, 'µs', `${th(k)} / ${f} = ${fmt(k / f, 2)} µs.`, Math.max(0.05, k / f * 0.01));
  }, 'av_cycle');

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
 L('av1', 'Arquitectura Harvard y núcleo AVR', 'chip', ['av_core', 'av_8bit', 'av_wrap', 'av_isr'], [
  I('El cerebro de la Uno y la Nano es el <b>ATmega328P</b>, un microcontrolador AVR de <b>8 bits</b>: CPU, memorias, temporizadores, conversor A/D y comunicaciones en un solo chip.\n“8 bits” significa que la CPU suma, compara y mueve datos de byte en byte.'),
  I('<b>Arquitectura Harvard</b>: el programa (en la Flash) y los datos (en la SRAM) viajan por buses separados. Mientras la CPU ejecuta una instrucción, ya está trayendo la siguiente. Por eso casi todas tardan <b>un solo ciclo</b> de reloj.'),
  Q('¿Qué ventaja da tener buses separados para programa y datos?', ['Traer la siguiente instrucción mientras se ejecuta la actual', 'Tener más memoria RAM', 'Que la Flash no se borre al apagar', 'Gastar menos en reposo'], 'Es una tubería de dos etapas: leer y ejecutar a la vez.', { c: 'av_core' }),
  I('El núcleo tiene <b>32 registros de trabajo</b>, de R0 a R31: la “mesa” donde la ALU hace las cuentas. Para sumar dos variables de la SRAM, primero se cargan en registros, se operan y el resultado se guarda.\nLos seis últimos se usan por parejas como punteros: X (R27:R26), Y (R29:R28) y Z (R31:R30).'),
  Q('¿Cuántos registros de trabajo tiene un AVR como el 328P?', ['32', '8', '16', '256'], 'R0 a R31.', { c: 'av_core' }),
  Q('Una variable int (16 bits) en un AVR de 8 bits…', ['Ocupa dos registros y sumarla lleva dos instrucciones', 'Cabe en un registro', 'No se puede usar', 'Se guarda siempre en la EEPROM'], 'add para el byte bajo y adc (con acarreo) para el alto.', { c: 'av_8bit' }),
  I('<b>RISC</b> significa juego de instrucciones reducido: unas 130 instrucciones sencillas y rápidas. avr-gcc traduce tu C (o el C++ de Arduino) a esas instrucciones.\nEl registro <b>SREG</b> guarda las banderas del último resultado: C (acarreo), Z (cero), N (negativo), V (desbordamiento), S (signo), H (medio acarreo), T y el bit <b>I</b>, que permite las interrupciones.'),
  { t: 'match', q: 'Une cada parte del chip con su papel.', pairs: [['ALU', 'Hace sumas, restas y operaciones lógicas'], ['R0–R31', 'Operandos inmediatos de la ALU'], ['Flash', 'Guarda el programa'], ['SREG', 'Banderas y permiso de interrupciones']], c: 'av_core' },
  Q('¿Qué valor queda en a y qué bandera se activa?', ['a vale 44 y se activa el acarreo (C)', 'a vale 300', 'a vale 255 y se para', 'a vale 0 y se activa Z'], '300 no cabe en 8 bits: 300 − 256 = 44 y el bit que sobra va a C.', { code: 'uint8_t a = 200;\na = a + 100;', c: 'av_wrap' }),
  { t: 'order', q: 'Ordena lo que hace la CPU para x = x + 1 si x está en la SRAM.', items: ['Cargar x en un registro (lds)', 'Sumar 1 en la ALU', 'Guardar el registro en la SRAM (sts)'], e: 'Arquitectura de carga y almacenamiento: la ALU solo trabaja sobre registros.', c: 'av_core' },
  Q('¿Qué bit de SREG debe estar a 1 para que pueda saltar cualquier interrupción?', ['I', 'C', 'Z', 'T'], 'Es el permiso global: sei() lo pone a 1 y cli() a 0.', { c: 'av_isr' })
 ]),
 L('av2', 'Reloj, ciclos y tiempo', 'timer', ['av_cycle', 'av_clksrc', 'av_vmax', 'av_fcpu'], [
  I('El reloj marca el ritmo. En una Uno va a 16 MHz: cada ciclo dura 1 / 16 000 000 s = <b>62,5 ns</b>. La mayoría de instrucciones tarda 1 ciclo; los saltos y los accesos a memoria, de 2 a 4.'),
  Nm('¿Cuántos ns dura un ciclo a 8 MHz?', 125, 'ns', '1 / 8 000 000 s = 125 ns.', { c: 'av_cycle' }),
  I('Fuentes de reloj del 328P:\n· <b>Cristal</b> externo: preciso (errores de decenas de ppm).\n· <b>Resonador cerámico</b>: más barato, del orden del 0,5 %. La Uno R3 usa uno para el ATmega328P.\n· <b>RC interno de 8 MHz</b>: sin componentes, pero de fábrica solo garantiza ±10 % (calibrable con OSCCAL hasta ±1 %).\n· Un oscilador de 128 kHz para el watchdog.'),
  Q('Un reloj con un error del 0,5 % adelanta en un día…', ['Unos 7 minutos', 'Unos 7 segundos', 'Medio segundo', 'Nada apreciable'], '86 400 s × 0,005 = 432 s ≈ 7,2 min.', { c: 'av_clksrc' }),
  Q('Quieres un reloj de pared que no se desvíe minutos al mes. ¿Qué reloj usas?', ['Un cristal, o mejor un RTC con cristal de 32 768 Hz compensado', 'El RC interno', 'El oscilador del watchdog', 'Da igual'], 'Solo el cristal llega a segundos al mes.', { c: 'av_clksrc' }),
  I('<b>Grados de velocidad</b>: la frecuencia máxima depende de la tensión. El 328P admite hasta 20 MHz entre 4,5 y 5,5 V, hasta 10 MHz desde 2,7 V y hasta 4 MHz desde 1,8 V (entre medias, la hoja de datos da una recta).'),
  Q('Alimentas el chip a 3,3 V. ¿Lo pones a 16 MHz?', ['No: fuera de especificación; por eso las placas de 3,3 V van a 8 MHz', 'Sí, sin problema', 'Sí, pero solo con cristal', 'No: a 3,3 V solo va a 1 MHz'], 'A 3,3 V la recta da unos 13 MHz como máximo.', { c: 'av_vmax' }),
  I('El fusible <b>CKDIV8</b> divide el reloj entre 8 al arrancar: un chip nuevo sale con el RC interno de 8 MHz dividido, es decir, a <b>1 MHz</b>. En marcha puedes cambiar el divisor con el registro <b>CLKPR</b> mediante una secuencia temporizada.'),
  G('av_cycles'), G('av_cycles'),
  Nm('Un bucle de 1000 vueltas de 4 ciclos cada una. ¿Cuánto tarda a 16 MHz, en µs?', 250, 'µs', '4000 ciclos × 62,5 ns = 250 µs.', { c: 'av_cycle' }),
  Q('Cambias F_CPU en el código pero el cristal sigue siendo de 16 MHz. ¿Qué pasa?', ['delay(), millis() y los baudios calculan con un reloj que no es el real: todo sale con otra velocidad', 'Nada', 'El chip cambia de frecuencia', 'Se borra el bootloader'], 'F_CPU solo informa al compilador; no cambia el hardware.', { c: 'av_fcpu' })
 ]),
 L('av3', 'Las tres memorias', 'memory', ['av_mem', 'av_sram', 'av_eeprom'], [
  I('<b>Flash, 32 KB</b>: el programa y las constantes. No se borra al apagar; se reescribe por páginas y aguanta unos 10 000 ciclos de borrado. En la Uno, el bootloader ocupa 0,5 KB al final.'),
  I('<b>SRAM, 2 KB</b>: variables, pila y montón. Rápida, pero se pierde al apagar. Son solo <b>2048 bytes</b>: es la memoria que se acaba primero.'),
  I('<b>EEPROM, 1 KB</b>: datos que deben sobrevivir al apagado, como ajustes o calibraciones. Unos 100 000 ciclos de escritura por celda y unos 3,3 ms por byte escrito.'),
  { t: 'match', q: 'Une cada memoria con su uso.', pairs: [['Flash', 'Programa y constantes'], ['SRAM', 'Variables, pila y montón'], ['EEPROM', 'Ajustes que sobreviven al apagado'], ['R0–R31', 'Operandos de la ALU']], c: 'av_mem' },
  Q('Tu proyecto imprime muchos mensajes de texto distintos. ¿Qué memoria se agotará antes?', ['La SRAM: cada cadena literal se copia a la RAM al arrancar', 'La Flash', 'La EEPROM', 'Ninguna'], 'Las cadenas están en Flash, pero el arranque las copia a .data.', { c: 'av_mem' }),
  I('El espacio de datos del 328P:\n· 0x0000–0x001F: los 32 registros.\n· 0x0020–0x005F: 64 registros de E/S (puertos, por ejemplo).\n· 0x0060–0x00FF: E/S extendida (temporizadores, ADC…).\n· <b>0x0100–0x08FF: la SRAM</b>.'),
  Nm('¿Cuántos bytes hay de 0x0100 a 0x08FF, ambos incluidos?', 2048, 'bytes', '0x08FF − 0x0100 + 1 = 0x0800 = 2048.', { c: 'av_sram' }),
  I('Harvard “modificada”: las constantes de la Flash no se leen con un acceso normal, sino con la instrucción LPM. En C se marcan con <b>PROGMEM</b> y se leen con <b>pgm_read_byte()</b>. En Arduino, <b>F("texto")</b> deja una cadena en la Flash.'),
  Q('¿Qué falla en este código?', ['tabla[i] lee de la SRAM, no de la Flash: hay que usar pgm_read_byte(&tabla[i])', 'Nada', 'No compila', 'La tabla ocupa SRAM igualmente'], 'Con PROGMEM, la dirección es de Flash; leerla como RAM da basura.', { code: 'const uint8_t tabla[256] PROGMEM = { /* ... */ };\nuint8_t x = tabla[i];', c: 'av_mem' }),
  Q('Serial.println(F("Hola, mundo")) frente a Serial.println("Hola, mundo")…', ['Ahorra 12 bytes de SRAM (11 caracteres y el 0 final)', 'Ahorra 12 bytes de Flash', 'Imprime más rápido', 'No cambia nada'], 'La cadena se queda solo en la Flash.', { c: 'av_mem' }),
  G('av_eeLife')
 ]),
 L('av4', 'Pila, montón y variables', 'memory', ['av_sram', 'av_sections'], [
  I('Al arrancar, el código de inicio copia las variables globales con valor inicial (<b>.data</b>) de la Flash a la SRAM y pone a cero las demás (<b>.bss</b>). El IDE suma las dos cuando te dice “las variables globales usan…”.'),
  I('La <b>pila</b> empieza al final de la SRAM (RAMEND = 0x08FF) y crece hacia abajo. Cada llamada a función guarda la dirección de retorno (2 bytes), registros y variables locales. El registro <b>SP</b> apunta a su cima.'),
  I('El <b>montón</b> (heap) crece hacia arriba desde el final de .bss: ahí reservan malloc, new y la clase String. Si la pila y el montón se encuentran, se pisan los datos: cuelgues y reinicios “misteriosos”.'),
  { t: 'order', q: 'Ordena la SRAM de las direcciones bajas a las altas.', items: ['.data (globales con valor inicial)', '.bss (globales a cero)', 'Montón (crece hacia arriba)', 'Espacio libre', 'Pila (crece hacia abajo desde 0x08FF)'], e: 'Montón y pila crecen el uno hacia el otro.', c: 'av_sram' },
  Q('Una función recursiva sin fin en un AVR…', ['Agota la pila, pisa el montón y las globales y acaba colgándose o reiniciándose', 'Lanza una excepción que puedes capturar', 'El compilador la detiene', 'Se queda esperando'], 'No hay protección de memoria: nadie avisa.', { c: 'av_sram' }),
  Q('¿Por qué evitar String en un programa que funciona meses sin parar?', ['Reserva y libera memoria del montón y lo fragmenta hasta que no cabe nada', 'Es lenta', 'Ocupa mucha Flash', 'No se puede imprimir'], 'Con 2 KB, la fragmentación se nota pronto.', { c: 'av_sram' }),
  Q('procesar() llama a filtrar() y ambas declaran un array local de 300 bytes. ¿Cuánta pila usan a la vez?', ['Más de 600 bytes: casi un tercio de la SRAM', '300 bytes', 'Nada: van a la Flash', '0: se liberan al salir'], 'Las locales de las dos funciones conviven mientras filtrar() está en marcha.', { c: 'av_sram' }),
  Q('¿Qué hace static en una variable local?', ['La guarda con las globales: conserva su valor entre llamadas y no ocupa pila', 'La mete en la pila', 'La guarda en la EEPROM', 'La pone a 0 en cada llamada'], 'static uint8_t n = 0; se inicializa una sola vez.', { code: 'void contar() {\n  static uint8_t n = 0;\n  n++;\n}', c: 'av_sram' }),
  I('Truco: una variable local recién creada vive en la cima de la pila. Si restas a su dirección el final del montón, sabes cuánta RAM queda libre. Lo harás en el proyecto “cazador de RAM”.'),
  Nm('El IDE dice que las variables globales usan 1536 bytes. ¿Cuántos quedan para pila y montón?', 512, 'bytes', '2048 − 1536.', { c: 'av_sections' })
 ]),
 L('av5', 'Patillaje y mapa de pines', 'ic', ['av_pinmap', 'av_altfn', 'av_bare'], [
  I('El 328P en DIP-28 reparte sus E/S en tres <b>puertos</b>: B (PB0–PB7), C (PC0–PC6) y D (PD0–PD7). En un Arduino, PB6 y PB7 son el cristal y PC6 es RESET.'),
  I('El mapa de la Uno y la Nano:\n· <b>D0–D7 = PD0–PD7</b>\n· <b>D8–D13 = PB0–PB5</b>\n· <b>A0–A5 = PC0–PC5</b>\nAsí, el LED de la placa, D13, es el <b>bit 5 del puerto B</b>.'),
  { t: 'pin', q: '¿Qué pin de la Uno es PB0?', a: 'D8', e: 'Puerto B empieza en D8.', c: 'av_pinmap' },
  { t: 'pin', q: '¿Y PD3?', a: 'D3', e: 'En el puerto D coincide el número.', c: 'av_pinmap' },
  { t: 'pin', q: '¿Y PC2?', a: 'A2', e: 'El puerto C son las entradas analógicas.', c: 'av_pinmap' },
  G('av_pinMap'), G('av_pinMap'),
  I('Cada pata tiene funciones alternativas: PD0 y PD1 son RX y TX de la USART; PB3, PB4 y PB5 son MOSI, MISO y SCK del SPI (y del ISP); PC4 y PC5 son SDA y SCL; PB1, PB2, PB3, PD3, PD5 y PD6 son las salidas de los temporizadores: los pines ~ de PWM.'),
  { t: 'match', q: 'Une cada grupo de patas con su función alternativa.', pairs: [['PD0 y PD1', 'USART (RX y TX)'], ['PB3, PB4 y PB5', 'SPI e ISP'], ['PC4 y PC5', 'I²C (SDA y SCL)'], ['PB6 y PB7', 'Cristal (XTAL1 y XTAL2)']], c: 'av_altfn' },
  Q('¿Para qué sirve la pata AVCC (20)?', ['Alimenta el conversor A/D y el puerto C: conéctala a VCC aunque no uses el ADC', 'Es opcional', 'Es una entrada analógica más', 'Es la referencia externa'], 'Sin AVCC, el puerto C no funciona bien.', { c: 'av_bare' }),
  Q('¿Por qué A6 y A7 de la Nano no sirven como pines digitales?', ['Son ADC6 y ADC7 del encapsulado TQFP: solo entrada analógica, sin puerto digital', 'Están reservados para el USB', 'Son de 3,3 V', 'Son salidas PWM'], 'El DIP-28 de la Uno ni siquiera los tiene.', { c: 'av_altfn' })
 ]),
 SIM('av-s1', 'Reto: encuentra PB5 en la Nano', 'La Nano ejecuta el parpadeo de siempre: por dentro, digitalWrite(13, …) escribe el bit 5 de PORTB. Busca la pata PB5 en la Nano pinchada y pon ahí un LED con su resistencia hacia GND.', { arduino: 'blink', board: 'nano', parts: ['res', 'led'], code: true, hint: 'PB5 es D13: en la Nano está en la fila de arriba, en un extremo. Resistencia de 220–470 Ω en serie con el LED y el cátodo a GND.' }, 'av_pb5'),
 PRJ('av-p1', 'Proyecto: cazador de RAM', 'av_ram')
] },

{ id: 'av-m2', title: 'Puertos a golpe de registro', desc: 'DDR, PORT y PIN, operaciones de bits, entradas, velocidad, atomicidad y matrices.', nodes: [
 L('av6', 'DDRx, PORTx y PINx', 'code', ['av_ports'], [
  I('Cada puerto se controla con tres registros de 8 bits, un bit por pata:\n· <b>DDRx</b>: dirección (1 = salida, 0 = entrada).\n· <b>PORTx</b>: en una salida, el nivel; en una entrada, activa la pull-up.\n· <b>PINx</b>: lee el nivel real de las patas.'),
  Q('¿Qué hace este código?', ['Enciende el LED de D13: PB5 como salida y a 1', 'Lee el pin D13', 'Activa la pull-up de D13', 'Enciende el pin D5'], 'Bit 5 a 1 en DDRB y en PORTB.', { code: 'DDRB  = 0b00100000;\nPORTB = 0b00100000;', c: 'av_ports' }),
  { t: 'bits', q: 'Escribe DDRD para que D5, D6 y D7 sean salidas y el resto entradas.', n: 8, target: 224, e: 'Bits 7, 6 y 5: 128 + 64 + 32 = 224 = 0xE0.', c: 'av_ports' },
  I('Escribir un byte entero cambia las ocho patas a la vez, en un ciclo. Con digitalWrite irías de una en una.'),
  { t: 'match', q: 'Une cada combinación de DDR y PORT con el estado de la pata.', pairs: [['DDR 0 · PORT 0', 'Entrada flotante'], ['DDR 0 · PORT 1', 'Entrada con pull-up'], ['DDR 1 · PORT 0', 'Salida a 0 V'], ['DDR 1 · PORT 1', 'Salida a 5 V']], c: 'av_ports' },
  Q('¿Qué hace PORTD = 0xFF si DDRD = 0x00?', ['Activa las pull-ups de las ocho patas', 'Pone las ocho a 5 V como salidas', 'Nada', 'Las pone a 0'], 'En una entrada, PORT a 1 es pull-up.', { c: 'av_ports' }),
  I('Truco del 328P: escribir un <b>1 en un bit de PINx conmuta</b> ese bit de PORTx. PINB = (1 &lt;&lt; PB5); hace parpadear D13 sin leer nada antes.'),
  Q('¿Qué hace este bucle?', ['D13 cambia de estado cada 500 ms: parpadea', 'D13 se queda encendido', 'Lee D13 cada 500 ms', 'No compila: PINB es de solo lectura'], 'Escribir 1 en PINx conmuta la salida.', { code: 'DDRB |= (1 << PB5);\nfor (;;) {\n  PINB = (1 << PB5);\n  _delay_ms(500);\n}', c: 'av_ports' }),
  Q('¿Dónde lees si un pulsador en D8 está pulsado?', ['En PINB, bit 0', 'En PORTB, bit 0', 'En DDRB, bit 0', 'En PIND, bit 8'], 'D8 = PB0, y se lee en PIN.', { c: 'av_ports' }),
  Nm('Quieres D8–D13 como salidas a la vez. ¿Qué valor decimal pones en DDRB?', 63, '', 'Bits 0 a 5: 0b00111111 = 63 = 0x3F.', { c: 'av_ports' })
 ]),
 L('av7', 'Operaciones de bits', 'bin', ['av_bits', 'av_prec'], [
  I('Para tocar un bit sin alterar los demás se usan <b>máscaras</b>:\n· Poner a 1: <b>REG |= máscara</b>\n· Poner a 0: <b>REG &amp;= ~máscara</b>\n· Conmutar: <b>REG ^= máscara</b>\n· Leer: <b>REG &amp; máscara</b> (distinto de 0 si está a 1)'),
  I('La máscara se construye desplazando un 1: (1 &lt;&lt; 5) = 0b00100000 = 0x20. Explora: cambia el registro y el bit.', { tune: { viz: 'av_bits', params: bitsP(1) } }),
  TU('PORTB vale 0x2F. Elige el bit que hay que poner a 0 para que quede en 0x0F.', 'av_bits', bitsP(2, 47, true, 0), { q: 'res', min: 15, max: 15, text: 'Objetivo: PORTB = 0x0F', hint: '0x2F − 0x0F = 0x20: el bit 5.' }, 'PORTB &= ~(1 << 5); apaga solo el bit 5.', { c: 'av_bits' }),
  TU('PORTB vale 0x81. Conmuta un bit para que pase a 0x83.', 'av_bits', bitsP(3, 129, true, 0), { q: 'res', min: 131, max: 131, text: 'Objetivo: PORTB = 0x83', hint: 'La diferencia es 2 = 1 << 1.' }, 'XOR con (1 << 1).', { c: 'av_bits' }),
  G('av_mask'), G('av_mask'), G('av_mask'),
  I('Nombres en vez de números: avr/io.h define PB5 = 5, WGM12 = 3… y la macro <b>_BV(n)</b> equivale a (1 &lt;&lt; n). Así, TCCR1B |= _BV(WGM12) | _BV(CS11); se lee igual que la hoja de datos.'),
  Q('¿Por qué PORTB = (1 << PB5); puede ser un error?', ['Pone a 0 todos los demás bits de PORTB: apaga otras salidas y pull-ups', 'Es más lento que |=', 'No hace nada', 'Siempre es correcto'], 'El = sustituye el byte entero.', { c: 'av_bits' }),
  Q('¿Qué hace este if?', ['Nunca se cumple: == se evalúa antes que &, faltan paréntesis', 'Funciona bien', 'Lee el bit 0', 'Siempre se cumple'], 'Se evalúa como PIND & ((1 << PD2) == 0), es decir, PIND & 0.', { code: 'if (PIND & (1 << PD2) == 0) {\n  // pulsado\n}', c: 'av_prec' }),
  { t: 'bits', q: 'Construye la máscara (1 << 3) | (1 << 0).', n: 8, target: 9, e: '8 + 1 = 9 = 0x09.', c: 'av_bits' }
 ]),
 L('av8', 'Entradas: pull-ups y lectura en paralelo', 'chip', ['av_input'], [
  I('Una entrada CMOS sin conectar <b>flota</b>: capta ruido y se lee 0 o 1 al azar. La pull-up interna (de 20 a 50 kΩ) la sujeta a 1: DDRx a 0 y PORTx a 1.'),
  Q('Pulsador entre PD2 y GND con pull-up. Pulsado, el bit 2 de PIND vale…', ['0', '1', 'Depende del ruido', '2'], 'El pulsador lleva la pata a masa.', { c: 'av_input' }),
  I('Las entradas tienen <b>disparador Schmitt</b>. A 5 V, por debajo de 1,5 V (0,3·VCC) es un 0 seguro y por encima de 3 V (0,6·VCC), un 1 seguro. Entre medias hay histéresis: una señal lenta no hace temblar la lectura.'),
  Q('Llega una señal de 2,2 V a una entrada alimentada a 5 V. Se lee…', ['Puede leerse 0 o 1: está en la zona sin garantía', 'Siempre 1', 'Siempre 0', 'Nada: rompe la pata'], 'Ni por debajo de 1,5 V ni por encima de 3 V.', { c: 'av_input' }),
  I('Leer un byte de PINx da ocho entradas a la vez y en el mismo instante. Muy útil para codificadores rotatorios, teclados o buses paralelos.'),
  Q('Con pull-ups en PB0–PB3 y pulsadores a masa, ¿qué contiene teclas?', ['Un 1 por cada pulsador de PB0–PB3 que esté pulsado', 'El estado de PB4–PB7', 'Las pull-ups activadas', 'Pone PB0–PB3 a 0'], '~ invierte (pulsado = 1) y & 0x0F se queda con los cuatro bits bajos.', { code: 'uint8_t teclas = ~PINB & 0x0F;', c: 'av_input' }),
  I('Si la pull-up interna es demasiado débil (cables largos, entornos ruidosos), pon una externa de 4,7 a 10 kΩ. El bit <b>PUD</b> de MCUCR desactiva todas las pull-ups internas de golpe.'),
  Q('Escribes PORTB y en la instrucción siguiente lees PINB, pero no ves el cambio. ¿Por qué?', ['La entrada pasa por un sincronizador que tarda un ciclo: hace falta un nop entre medias', 'El puerto está roto', 'Falta la pull-up', 'PINB solo lee entradas'], 'La hoja de datos lo explica: la lectura llega un ciclo tarde.', { c: 'av_input' }),
  Q('Pulsador a 5 V con una pull-down externa de 10 kΩ a masa. Pulsado se lee…', ['1', '0', 'Flota', 'Nada'], 'Lógica directa: pulsado = 5 V.', { c: 'av_input' }),
  Nm('Pull-up interna de 35 kΩ a 5 V con el pulsador cerrado a masa. ¿Corriente, en µA?', 143, 'µA', '5 V / 35 kΩ ≈ 0,143 mA. Poca, pero en un aparato a pilas cuenta.', { tol: 2, c: 'av_input' })
 ]),
 L('av9', 'Velocidad y atomicidad', 'bolt', ['av_rmw', 'av_ardtim', 'av_cycle'], [
  I('digitalWrite() es cómodo, pero hace mucho: busca en tablas qué puerto y bit es el pin, apaga el PWM si lo hubiera, desactiva interrupciones y hace leer–modificar–escribir. Total: unos microsegundos, decenas de ciclos.'),
  I('PORTB |= (1 &lt;&lt; PB5); con una constante se compila a una sola instrucción, <b>sbi</b>: 2 ciclos, 125 ns. Decenas de veces más rápido.'),
  Q('¿Por qué digitalWrite() mira el temporizador del pin?', ['Para apagar el PWM de ese pin si estaba activo', 'Para medir el tiempo', 'Para ir más rápido', 'No lo mira'], 'Si no, analogWrite seguiría mandando sobre la pata.', { c: 'av_ardtim' }),
  Nm('Un bucle conmuta D13 con sbi PINB (2 ciclos) y vuelve con rjmp (2 ciclos). ¿Frecuencia de la onda a 16 MHz, en MHz?', 2, 'MHz', 'Una conmutación cada 4 ciclos; un periodo son 8 ciclos: 16 / 8 = 2 MHz.', { c: 'av_cycle' }),
  I('<b>Atomicidad</b>: una operación es atómica si no puede quedar a medias. sbi y cbi lo son. Pero PORTB |= 0x21 (dos bits) se compila a in, ori, out: si una interrupción cambia PORTB entre la lectura y la escritura, su cambio se pierde.'),
  { t: 'order', q: 'Ordena cómo se pierde el cambio de una interrupción.', items: ['main() lee PORTB en un registro', 'Salta una interrupción que pone a 1 el bit 0 de PORTB', 'main() hace el OR sobre su copia vieja', 'main() escribe la copia: el bit 0 vuelve a 0'], e: 'Leer–modificar–escribir no es atómico.', c: 'av_rmw' },
  Q('¿Cómo lo evitas?', ['Desactivando las interrupciones durante el leer–modificar–escribir, o usando sbi/cbi o PINx', 'Con delay()', 'Declarando PORTB volatile', 'Escribiendo más rápido'], 'Sección crítica corta o una instrucción atómica.', { c: 'av_rmw' }),
  Q('¿Por qué PINB = (1 << PB5) es seguro aunque haya interrupciones?', ['Es una sola escritura: conmuta los bits a 1 y no lee nada antes', 'Porque es lento', 'Porque desactiva las interrupciones', 'No es seguro'], 'No hay copia vieja que pueda pisar nada.', { c: 'av_rmw' }),
  Q('TCCR1A |= (1 << COM1A1); ¿es atómico?', ['No: TCCR1A está en la E/S extendida (0x80), donde no llega sbi; se hace con lds, ori, sts', 'Sí, siempre', 'Sí, porque es un temporizador', 'Depende del prescaler'], 'sbi y cbi solo alcanzan las primeras 32 direcciones de E/S.', { c: 'av_rmw' })
 ]),
 L('av10', 'Multiplexado y matrices', 'bus', ['av_mux', 'av_keymatrix'], [
  I('Con pocas patas puedes controlar muchas cosas si no las atiendes todas a la vez. Un teclado de 4 filas × 4 columnas se lee con 8 patas.'),
  I('<b>Escaneo</b>: pones una fila a 0 y las demás a 1; las columnas son entradas con pull-up. Si una columna lee 0, está pulsada la tecla de ese cruce. Repites con cada fila cientos de veces por segundo.'),
  Q('Con la fila 2 a 0, la columna 3 lee 0. ¿Qué tecla está pulsada?', ['La del cruce de la fila 2 y la columna 3', 'Todas las de la fila 2', 'Ninguna', 'Todas las de la columna 3'], 'Solo esa tecla une esa fila con esa columna.', { c: 'av_keymatrix' }),
  Q('Pulsas tres teclas en tres esquinas de un rectángulo y aparece una cuarta “fantasma”. ¿Solución?', ['Un diodo en serie con cada tecla', 'Más pull-ups', 'Escanear más deprisa', 'Usar menos teclas'], 'El diodo impide que la corriente vuelva por otro camino.', { c: 'av_keymatrix' }),
  I('Con displays y LEDs, el mismo truco: enciendes un dígito cada vez, tan deprisa que el ojo ve todos (persistencia de la visión). Con 4 dígitos y 1 ms por dígito, cada uno se refresca 250 veces por segundo.'),
  Nm('8 dígitos multiplexados, 2 ms por dígito. ¿Refresco de cada uno, en Hz?', 62.5, 'Hz', 'Un ciclo completo dura 16 ms: 1 / 0,016 = 62,5 Hz.', { c: 'av_mux' }),
  Q('Cada dígito está encendido 1/4 del tiempo. ¿Qué pasa con el brillo?', ['El brillo medio baja a la cuarta parte: se compensa con más corriente de pico, dentro de los límites', 'No cambia', 'Sube', 'Se apaga'], 'El ojo promedia.', { c: 'av_mux' }),
  Q('Dígito de cátodo común con 8 segmentos a 15 mA. ¿Su cátodo puede ir directo a una pata?', ['No: serían 120 mA; hace falta un transistor', 'Sí', 'Sí, con una resistencia', 'Solo a 3,3 V'], 'Una pata aguanta 40 mA como máximo absoluto.', { c: 'av_mux' }),
  I('<b>Charlieplexing</b>: aprovecha que una pata puede estar a 1, a 0 o en alta impedancia (como entrada). Con n patas controlas n·(n − 1) LEDs, uno cada vez.'),
  Nm('Con 4 patas, ¿cuántos LEDs en charlieplexing?', 12, 'LEDs', '4 × 3 = 12.', { c: 'av_mux' }),
  Q('En un display multiplexado ves segmentos tenues en el dígito equivocado. ¿Arreglo?', ['Apagar el dígito antes de cambiar los segmentos y encender el siguiente después', 'Más resistencia', 'Más tensión', 'Es inevitable'], 'Son “fantasmas” del instante en que conviven datos viejos y dígito nuevo.', { c: 'av_mux' })
 ]),
 SIM('av-s2', 'Reto: el puerto B en fila', 'El programa del barrido usa D8–D12, es decir, PB0–PB4, y espera el pulsador en D2 (PD2) con pull-up. Monta los cinco LEDs en esas patas de la Nano, cada uno con su resistencia, y el pulsador a GND.', { arduino: 'coche', board: 'nano', parts: ['res', 'led', 'push'], code: true, hint: 'D8 a D12 están seguidas en la fila de abajo de la Nano. Cada LED con su resistencia a GND. Pulsador entre D2 y GND: mantenlo pulsado para que barra.' }, 'av_portb'),
 PRJ('av-p2', 'Proyecto: dado electrónico a registro', 'av_dice'),
 PRJ('av-p3', 'Proyecto: cerradura con teclado matricial', 'av_lock')
] },

{ id: 'av-m3', title: 'Temporizadores', desc: 'Timer0, Timer1 y Timer2: prescaler, CTC, Fast PWM, Phase Correct, Input Capture y lo que Arduino hace con ellos.', nodes: [
 L('av11', 'Anatomía de un temporizador', 'timer', ['av_timer', 'av_treg', 'av_tflag'], [
  I('Un temporizador es un contador de hardware que avanza solo, sin gastar CPU. Su valor está en <b>TCNTn</b>. El 328P tiene tres: <b>Timer0</b> y <b>Timer2</b> de 8 bits (0–255) y <b>Timer1</b> de 16 bits (0–65 535).'),
  I('El <b>prescaler</b> divide el reloj antes de contar. Con los bits CSn2:0 eliges 1, 8, 64, 256 o 1024 (el Timer2 tiene además 32 y 128). Con prescaler 64 a 16 MHz, cada cuenta dura 4 µs.'),
  Nm('Prescaler 256 a 16 MHz: ¿cuánto dura una cuenta, en µs?', 16, 'µs', '256 / 16 MHz = 16 µs.', { c: 'av_timer' }),
  I('En modo <b>normal</b> cuenta hasta el máximo y vuelve a 0: es el <b>desbordamiento</b>. Se activa la bandera TOVn (en TIFRn) y, si TOIEn está a 1 en TIMSKn, salta una interrupción.'),
  G('av_ovf'), G('av_ovf'),
  { t: 'match', q: 'Une cada registro con su papel.', pairs: [['TCNTn', 'El valor del contador'], ['TCCRnB', 'Prescaler (bits CS)'], ['TIMSKn', 'Qué interrupciones están activas'], ['TIFRn', 'Banderas de lo que ha pasado']], c: 'av_treg' },
  Q('Timer1 a 16 MHz, sin prescaler, en modo normal. ¿Cada cuánto se desborda?', ['Cada 4,096 ms', 'Cada 16 µs', 'Cada segundo', 'Cada 65,5 s'], '65 536 × 62,5 ns.', { c: 'av_timer' }),
  Q('Las banderas de TIFRn se borran…', ['Escribiendo un 1 en ellas, o solas al ejecutarse su ISR', 'Escribiendo un 0', 'Leyéndolas', 'Solas cada segundo'], 'Es una rareza de los AVR: un 1 borra.', { c: 'av_tflag' }),
  Q('¿Qué problema tiene esta línea?', ['Si hay otras banderas a 1, el OR las vuelve a escribir con 1 y las borra también: usa TIFR1 = (1 << TOV1)', 'Ninguno', 'No borra nada', 'Pone TOV1 a 1'], 'Leer–modificar–escribir en un registro de banderas es una trampa.', { code: 'TIFR1 |= (1 << TOV1);', c: 'av_tflag' }),
  Q('Timer0 y Timer1 comparten…', ['El mismo prescaler: reiniciarlo afecta a los dos', 'Las mismas patas', 'El mismo contador', 'Nada'], 'El Timer2 tiene su prescaler propio.', { c: 'av_treg' })
 ]),
 L('av12', 'Modo CTC: frecuencias exactas', 'timer', ['av_ctc'], [
  I('En <b>CTC</b> (Clear Timer on Compare) el contador vuelve a 0 al alcanzar OCRnA. Con OCRnA eliges el periodo exacto:\n<b>f = F_CPU / (N · (1 + OCRnA))</b>'),
  I('Explora: el contador (azul) sube hasta OCR0A y vuelve a 0. En cada coincidencia salta la interrupción y la patilla OC0A puede conmutar (naranja).', { tune: { viz: 'av_timer', params: { N: pN(64), ocr: pOcr(124) } } }),
  TU('Consigue interrupciones a 1 kHz exactos.', 'av_timer', { N: pN(8), ocr: pOcr(100) }, { q: 'f', min: 999.9, max: 1000.1, text: 'Objetivo: 1000 Hz', hint: 'Con prescaler 64 hacen falta 250 cuentas: OCR0A = 249.' }, '16 000 000 / (64 × 250) = 1000 Hz.', { c: 'av_ctc' }),
  TU('Ahora haz sonar un La de 440 Hz en la patilla (conmutando en cada coincidencia).', 'av_timer', { N: pN(64), ocr: pOcr(200) }, { q: 'fpin', min: 437, max: 443, text: 'Objetivo: 440 Hz en la patilla', hint: 'Con prescaler 64 no llega (haría falta OCR = 283). Prueba prescaler 256 y OCR0A cerca de 70.' }, 'Prescaler 256 y OCR0A = 70 dan 440,1 Hz.', { c: 'av_ctc' }),
  G('av_ctcOcr'), G('av_ctcOcr'),
  I('Timer1 en CTC para una interrupción por segundo:', { code: '// Timer1 en CTC: interrupción cada segundo exacto\nTCCR1A = 0;\nTCCR1B = (1 << WGM12) | (1 << CS12);   // modo 4, prescaler 256\nOCR1A  = 62499;                        // 16 MHz / 256 / 62 500 = 1 Hz\nTIMSK1 = (1 << OCIE1A);\n\nISR(TIMER1_COMPA_vect) { segundos++; }' }),
  Q('¿Por qué 62 499 y no 62 500?', ['El contador va de 0 a OCR1A incluido: son OCR1A + 1 cuentas', 'Por redondeo', 'Es un error', 'Para dejar margen'], 'Del 0 al 62 499 hay 62 500 cuentas.', { c: 'av_ctc' }),
  Q('¿Qué hace falta para que OC0A (D6) conmute sola en cada coincidencia?', ['COM0A1:0 = 01 en TCCR0A y PD6 como salida en DDRD', 'Escribir en PIND dentro de la ISR', 'Nada más', 'Activar TOIE0'], 'El hardware conmuta la pata sin código.', { c: 'av_ctc' }),
  Q('En CTC escribes en OCR1A un valor menor que el TCNT1 actual. ¿Qué pasa?', ['El contador sigue hasta 65 535, da la vuelta y vuelve a empezar: un periodo larguísimo', 'Se ajusta al instante', 'Se para', 'Se reinicia el chip'], 'En CTC, OCR1A no tiene doble búfer.', { c: 'av_ctc' })
 ]),
 L('av13', 'Fast PWM y Phase Correct', 'wave', ['av_pwm', 'av_pwmduty'], [
  I('En <b>Fast PWM</b> el contador sube de 0 a TOP y vuelve a 0. En modo no invertido, la salida se pone a 1 en 0 y a 0 al coincidir con OCRnx.\n<b>f = F_CPU / (N · (TOP + 1))</b>'),
  I('Explora el Fast PWM: cambia TOP, OCR y el prescaler.', { tune: { viz: 'av_pwm', params: pwmP(0) } }),
  I('En <b>Phase Correct</b> sube hasta TOP y vuelve a bajar: la onda es simétrica y la frecuencia, la mitad.\n<b>f = F_CPU / (2 · N · TOP)</b>\nMejor para motores y puentes H.', { tune: { viz: 'av_pwm', params: pwmP(1) } }),
  TU('Consigue un PWM de 20 kHz en Fast PWM: inaudible para un motor.', 'av_pwm', pwmP(0, 255, 400, 8), { q: 'f', min: 19800, max: 20200, text: 'Objetivo: 20 kHz ± 1 %', hint: 'Prescaler 1 y TOP = 799.' }, '16 000 000 / 800 = 20 000 Hz, con 800 niveles (algo más de 9 bits).', { c: 'av_pwm' }),
  G('av_pwmFreq'), G('av_pwmFreq'),
  Q('analogWrite en los pines 5 y 6 da unos 980 Hz y en el 9, unos 490 Hz. ¿Por qué?', ['Timer0 va en Fast PWM y Timer1 en Phase Correct, los dos con prescaler 64', 'El pin 9 es más lento', 'Es aleatorio', 'Por el cristal'], 'Phase Correct divide la frecuencia entre 2 (casi exactamente: 510 cuentas frente a 256).', { c: 'av_pwm' }),
  { t: 'match', q: 'Une cada valor de COMnx1:0 en Fast PWM con su efecto.', pairs: [['00', 'Patilla desconectada del temporizador'], ['10', 'PWM no invertido'], ['11', 'PWM invertido'], ['01', 'Conmutar en coincidencia (solo en algunos modos)']], c: 'av_pwmduty' },
  Q('Fast PWM con OCR0A = 0 no da un 0 % exacto, sino…', ['Un pulso de una cuenta en cada periodo: por eso analogWrite(0) usa digitalWrite', 'Un 0 % exacto', 'Un 50 %', 'Nada'], '(0 + 1) / 256 ≈ 0,4 %.', { c: 'av_pwmduty' }),
  Q('Con TOP = 63 en lugar de 255 (mismo prescaler)…', ['La frecuencia sube ×4 y la resolución baja a 6 bits (64 niveles)', 'Todo mejora', 'Sube la resolución', 'No cambia nada'], 'Frecuencia y resolución se reparten las mismas cuentas.', { c: 'av_pwm' }),
  Q('En los modos PWM, OCRnx tiene doble búfer. Significa…', ['El valor nuevo se aplica al llegar a TOP o a 0: nunca se corta un pulso a medias', 'Que hay dos salidas', 'Que vale el doble', 'Que se puede leer dos veces'], 'Por eso cambiar el ciclo de trabajo en marcha no produce glitches.', { c: 'av_pwmduty' })
 ]),
 L('av14', 'Timer1: 16 bits, ICR1 y servos', 'timer', ['av_pwm', 'av_timer', 'av_shared'], [
  I('El Timer1 cuenta hasta 65 535 y tiene modos con TOP en <b>ICR1</b> o en OCR1A. Con TOP en ICR1, OCR1A y OCR1B quedan libres: dos salidas PWM con la misma frecuencia, D9 (OC1A) y D10 (OC1B).'),
  I('Un servo quiere un pulso de 1 a 2 ms cada 20 ms. Con prescaler 8, cada cuenta son 0,5 µs:', { code: '// Servo en D9: 50 Hz con cuentas de 0,5 µs (modo 14, TOP = ICR1)\nDDRB  |= (1 << PB1);\nTCCR1A = (1 << COM1A1) | (1 << WGM11);\nTCCR1B = (1 << WGM13) | (1 << WGM12) | (1 << CS11);  // prescaler 8\nICR1   = 39999;                                       // 20 ms\nOCR1A  = 3000;                                        // 1,5 ms: centro' }),
  Nm('¿Qué OCR1A da un pulso de 1 ms?', 2000, '', '1 ms / 0,5 µs = 2000 cuentas.', { c: 'av_timer' }),
  Nm('¿Y uno de 2 ms?', 4000, '', '2 ms / 0,5 µs.', { c: 'av_timer' }),
  TU('Ajusta el Timer1 a 50 Hz para un servo.', 'av_pwm', { N: { label: 'Prescaler', val: 1, list: [1, 8, 64], dec: 0 }, top: { label: 'TOP (ICR1)', val: 20000, min: 1000, max: 65535, step: 1, dec: 0 }, ocr: { val: 3000, fixed: true }, mode: { val: 0, fixed: true } }, { q: 'f', min: 49.8, max: 50.2, text: 'Objetivo: 50 Hz', hint: 'Prescaler 8 y TOP = 39 999, o prescaler 64 y TOP = 4999.' }, 'Con prescaler 8 tienes más resolución en el pulso.', { c: 'av_pwm' }),
  I('Acceso de 16 bits: la CPU es de 8, así que el hardware usa un registro temporal compartido. Al escribir, primero el byte alto; al leer, primero el bajo. avr-gcc lo hace solo si usas OCR1A o TCNT1 como enteros de 16 bits.'),
  Q('¿Cuándo hay que proteger con cli/sei un acceso a OCR1A desde main()?', ['Cuando alguna ISR también lee o escribe registros de 16 bits del Timer1', 'Nunca', 'Siempre que uses delay()', 'Solo en modo normal'], 'Las dos usarían el mismo registro temporal.', { c: 'av_shared' }),
  Q('Con cuentas de 0,5 µs, ¿cuántos pasos de posición hay entre 1 y 2 ms?', ['2000', '256', '1000', '20'], 'Mucho más fino que analogWrite.', { c: 'av_timer' }),
  Q('Quieres 25 kHz para un ventilador PWM de 4 hilos en D9 y D10, con prescaler 1 y modo 14.', ['ICR1 = 639', 'ICR1 = 640', 'ICR1 = 255', 'ICR1 = 25 000'], '16 000 000 / 25 000 = 640 cuentas: TOP = 639.', { c: 'av_pwm' })
 ]),
 L('av15', 'Input Capture: medir el tiempo', 'gauge', ['av_icp', 'av_wrap'], [
  I('La entrada <b>ICP1</b> (PB0, D8) copia TCNT1 en el registro <b>ICR1</b> en el instante exacto de un flanco, sin depender de cuándo responda tu código. La resolución es una cuenta: 62,5 ns sin prescaler.'),
  I('Configuración: <b>ICES1</b> elige el flanco (1 = subida). <b>ICNC1</b> activa un filtro que exige 4 muestras iguales seguidas (retrasa 4 ciclos pero elimina picos). <b>ICIE1</b> activa la interrupción TIMER1_CAPT_vect.'),
  Q('¿Por qué es más preciso que leer micros() dentro de una interrupción INT0?', ['El hardware captura el instante: la latencia de la ISR no afecta a la medida', 'Porque el código es más corto', 'Porque micros() es de 32 bits', 'No lo es'], 'La ISR puede llegar tarde; ICR1 ya tiene el valor exacto.', { c: 'av_icp' }),
  G('av_icp'), G('av_icp'),
  Q('¿Sale bien esta resta si el contador ha dado la vuelta entre dos capturas?', ['Sí: la resta sin signo da la diferencia correcta aunque haya dado una vuelta', 'No: sale negativa', 'Nunca sale bien', 'El compilador avisa'], 'Aritmética módulo 65 536: funciona mientras haya menos de una vuelta completa.', { code: 'uint16_t periodo = ahora - anterior;', c: 'av_wrap' }),
  Q('Una señal de 10 Hz con prescaler 1: el periodo son 1 600 000 cuentas. ¿Qué haces?', ['Contar desbordamientos en TIMER1_OVF_vect y sumarlos ×65 536, o usar un prescaler mayor', 'Nada', 'Usar el Timer0', 'Es imposible'], 'Extiendes el contador por software.', { c: 'av_icp' }),
  I('Para frecuencias muy altas se hace al revés: la entrada <b>T1</b> (PD5, D5) hace de reloj del Timer1 y cuentas pulsos durante una ventana fija. Funciona hasta algo menos de F_CPU / 2,5.'),
  Nm('Con una ventana de 0,1 s cuentas 12 345 pulsos. ¿Frecuencia, en Hz?', 123450, 'Hz', '12 345 / 0,1 s.', { c: 'av_icp' }),
  Q('Con ICR1 como TOP (modo 14), ¿puedes usar Input Capture?', ['No: la pata ICP1 queda desconectada', 'Sí', 'Solo con prescaler', 'Solo con ICNC1'], 'ICR1 no puede hacer dos trabajos a la vez.', { c: 'av_icp' })
 ]),
 L('av16', 'Lo que Arduino hace con tus timers', 'code', ['av_ardtim', 'av_timer', 'av_tflag', 'av_treg'], [
  I('El núcleo de Arduino configura los tres temporizadores en init(), antes de setup():\n· <b>Timer0</b>: Fast PWM, prescaler 64; su desbordamiento cuenta millis() y micros().\n· <b>Timer1</b> y <b>Timer2</b>: Phase Correct de 8 bits, prescaler 64, para analogWrite.'),
  Nm('El Timer0 se desborda cada 256 × 64 / 16 MHz. ¿Cada cuántos ms?', 1.024, 'ms', '16 384 / 16 000 000 s = 1,024 ms.', { tol: 0.002, c: 'av_timer' }),
  I('Como no es 1 ms exacto, la ISR acumula lo que sobra (0,024 ms) y de vez en cuando suma 2: millis() a veces se salta un número. micros() lee además TCNT0 y tiene una resolución de 4 µs.'),
  Q('Cambias el prescaler del Timer0 para tener un PWM más rápido en D6. ¿Efecto secundario?', ['millis(), micros() y delay() dejan de medir bien', 'Ninguno', 'D9 deja de funcionar', 'Se borra el bootloader'], 'El Timer0 es el reloj del sistema de Arduino.', { c: 'av_ardtim' }),
  { t: 'match', q: 'Une cada función de Arduino con lo que ocupa.', pairs: [['Librería Servo', 'Timer1: D9 y D10 pierden analogWrite'], ['tone()', 'Timer2: D3 y D11 pierden analogWrite'], ['millis() y delay()', 'Timer0'], ['analogWrite en D5 y D6', 'Timer0 ']], c: 'av_ardtim' },
  Q('Tienes las interrupciones desactivadas 5 ms seguidos. millis()…', ['Se retrasa: solo se recuerda un desbordamiento pendiente y los demás se pierden', 'Sigue exacto', 'Se adelanta', 'Se pone a cero'], 'Una bandera no acumula eventos.', { c: 'av_tflag' }),
  Q('Después de init(), haces esto. ¿En qué modo queda el Timer1?', ['En Fast PWM de 8 bits (modo 5), no en CTC: WGM10 sigue a 1 por lo que hizo init()', 'En CTC', 'No cambia nada', 'Se para y rompe millis()'], 'WGM13:0 = 0101. Asigna los registros completos en vez de usar |=.', { code: 'TCCR1B |= (1 << WGM12);   // "quiero CTC"', c: 'av_treg' }),
  I('Regla: si te apropias de un temporizador, configúralo entero (TCCRnA = …; TCCRnB = …;) y asume lo que dejas de tener: PWM en sus pines, Servo, tone() o millis().'),
  Q('Necesitas millis() y una interrupción periódica de 10 kHz. ¿Qué temporizador usas?', ['El Timer1 o el Timer2 en CTC: el Timer0 es de millis()', 'El Timer0 con otro prescaler', 'Cualquiera', 'No se puede'], 'Deja el Timer0 a Arduino.', { c: 'av_ardtim' }),
  Q('analogWrite(3, 128) después de llamar a tone(8, 440)…', ['No funciona como esperas: tone() ha reconfigurado el Timer2', 'Funciona perfecto', 'Suena en el pin 3', 'Para el tono'], 'D3 es OC2B, del Timer2.', { c: 'av_ardtim' })
 ]),
 SIM('av-s3', 'Reto: la salida OC1A', 'El programa del fundido escribe en OCR1A del Timer1, cuya salida es OC1A: la pata PB1. Encuentra PB1 en la Nano y pon ahí un LED con su resistencia para ver el PWM por hardware.', { arduino: 'fade', board: 'nano', parts: ['res', 'led'], code: true, hint: 'PB1 = D9. LED con 220–470 Ω a GND.' }, 'av_oc1a'),
 PRJ('av-p4', 'Proyecto: theremin de luz', 'av_theremin'),
 PRJ('av-p5', 'Proyecto: frecuencímetro de 1 Hz a 5 MHz', 'av_freq'),
 PRJ('av-p6', 'Proyecto: reloj multiplexado por Timer2', 'av_clock')
] },

{ id: 'av-m4', title: 'Interrupciones a fondo', desc: 'Vectores, ISR, volatile, secciones críticas, INT0, PCINT, latencia y búferes circulares.', nodes: [
 L('av17', 'Vectores y la ISR', 'bolt', ['av_isr', 'av_vector', 'av_ctc'], [
  I('Una <b>interrupción</b> es un salto provocado por el hardware: la CPU termina la instrucción en curso, guarda en la pila la dirección de retorno y salta a una dirección fija, el <b>vector</b>. Al final, reti vuelve donde estaba.'),
  I('La tabla de vectores está al principio de la Flash: 26 en el 328P (RESET y 25 fuentes). En avr-gcc escribes ISR(NOMBRE_vect) { … } y el compilador la coloca en su sitio.'),
  { t: 'match', q: 'Une cada vector con su causa.', pairs: [['INT0_vect', 'Flanco o nivel en PD2'], ['TIMER1_CAPT_vect', 'Captura en ICP1'], ['USART_RX_vect', 'Byte recibido'], ['ADC_vect', 'Conversión terminada']], c: 'av_vector' },
  I('Tres llaves para que salte: 1) su <b>bandera</b> se activa; 2) su <b>habilitación local</b> (TIMSKn, EIMSK…) está a 1; 3) el bit <b>I</b> de SREG está a 1 (sei()).'),
  Q('Activas OCIE1A en un programa con avr-gcc sin Arduino y no llamas a sei(). ¿Salta la ISR?', ['No: falta el permiso global (bit I)', 'Sí', 'Solo una vez', 'Solo si TCNT1 vale 0'], 'Arduino llama a sei() en init(); en C puro te toca a ti.', { c: 'av_isr' }),
  Q('Al entrar en una ISR, el bit I de SREG…', ['Se pone a 0 solo: las ISR no se anidan salvo que lo pidas', 'Sigue a 1', 'Se invierte', 'No existe'], 'reti lo vuelve a poner a 1.', { c: 'av_isr' }),
  Q('Dos interrupciones pendientes a la vez. ¿Cuál se atiende primero?', ['La de vector más bajo, que es la más prioritaria', 'La más reciente', 'La más larga', 'Al azar'], 'INT0 gana a un temporizador, por ejemplo.', { c: 'av_vector' }),
  Q('¿Qué pasa si activas una interrupción y no escribes su ISR?', ['Salta a __bad_interrupt, que por defecto vuelve al vector 0: parece un reinicio extraño', 'Nada', 'Error de compilación', 'Se ignora'], 'Puedes definir ISR(BADISR_vect) para detectarlo.', { c: 'av_vector' }),
  Q('Timer2 en CTC con interrupción a 1 kHz y esta ISR. ¿Qué ves en D13?', ['Una onda cuadrada de 500 Hz', 'Una de 1 kHz', 'D13 fijo a 1', 'Nada: falta loop()'], 'Una conmutación cada milisegundo: periodo de 2 ms.', { code: 'ISR(TIMER2_COMPA_vect) {\n  PINB = (1 << PB5);\n}', c: 'av_ctc' }),
  { t: 'order', q: 'Ordena lo que pasa al saltar una interrupción.', items: ['Se activa la bandera', 'Termina la instrucción en curso', 'Se guarda la dirección de retorno y se pone I a 0', 'Salta al vector y ejecuta la ISR', 'reti recupera la dirección y pone I a 1'], e: 'Todo esto lo hace el hardware salvo el cuerpo de tu ISR.', c: 'av_isr' }
 ]),
 L('av18', 'volatile y secciones críticas', 'shield', ['av_shared', 'av_rmw'], [
  I('El compilador optimiza: si en un bucle lees una variable que el bucle no cambia, la guarda en un registro y deja de mirarla en la RAM. Si quien la cambia es una ISR, el bucle nunca se entera.'),
  Q('¿Qué puede pasar con este código compilado con optimización?', ['Quedarse atascado para siempre: falta volatile en listo', 'Funciona siempre', 'No compila', 'Sale al instante'], 'El compilador no sabe que la ISR existe.', { code: 'bool listo = false;\nISR(INT0_vect) { listo = true; }\n\nvoid esperar() {\n  while (!listo) { }\n}', c: 'av_shared' }),
  I('<b>volatile</b> obliga a leer y escribir la variable en memoria cada vez. Úsalo en toda variable compartida entre una ISR y el programa principal. Ojo: la hace <b>visible</b>, no atómica.'),
  Q('volatile uint16_t cuenta; ¿es seguro leerla en loop() mientras una ISR la incrementa?', ['No: son dos bytes y la ISR puede saltar entre la lectura de uno y la del otro', 'Sí, por ser volatile', 'Sí, por ser uint16_t', 'Solo en Arduino'], 'Visibilidad no es atomicidad.', { c: 'av_shared' }),
  I('Lectura rota: cuenta pasa de 0x00FF a 0x0100. Lees el byte bajo (0xFF), salta la ISR, lees el alto (0x01): obtienes 0x01FF = 511, un valor que nunca existió.'),
  I('La solución es una <b>sección crítica</b>:', { code: '#include <util/atomic.h>\n\nuint16_t copia;\nATOMIC_BLOCK(ATOMIC_RESTORESTATE) {   // aquí dentro no salta ninguna ISR\n  copia = cuenta;\n}                                      // y se restaura el estado que hubiera' }),
  Q('¿Por qué ATOMIC_RESTORESTATE y no simplemente cli() … sei()?', ['Si el código ya estaba con interrupciones desactivadas, sei() las activaría por error', 'Es más rápido', 'sei() no existe', 'Es exactamente lo mismo'], 'Restaura SREG en vez de forzar I a 1.', { c: 'av_shared' }),
  Q('Una variable uint8_t que solo escribe la ISR y solo lee loop()…', ['Basta con volatile: leer un byte es atómico', 'Necesita ATOMIC_BLOCK siempre', 'No necesita nada', 'Debe ir en la EEPROM'], 'Un byte se lee en una instrucción.', { c: 'av_shared' }),
  Q('contador++ sobre un uint8_t desde loop() y también desde una ISR…', ['No es atómico: leer, sumar y escribir son tres pasos; protégelo', 'Es atómico', 'Es atómico por ser de 8 bits', 'Lo arregla volatile'], 'Mismo problema que PORTB |= …', { c: 'av_rmw' }),
  Q('Una sección crítica bien hecha es…', ['Lo más corta posible: copiar y salir', 'Larga, para ir sobre seguro', 'Con delay() dentro', 'Con Serial.print() dentro'], 'Mientras dura, ninguna interrupción puede atenderse.', { c: 'av_shared' })
 ]),
 L('av19', 'INT0, INT1 y PCINT', 'chip', ['av_extint', 'av_bits', 'av_bounce', 'av_wake', 'av_altfn'], [
  I('<b>INT0</b> (PD2, D2) e <b>INT1</b> (PD3, D3) son las interrupciones externas completas. En <b>EICRA</b> eliges el disparo con ISCn1:0 (00 nivel bajo, 01 cualquier cambio, 10 bajada, 11 subida) y en <b>EIMSK</b> las activas.'),
  { t: 'bits', q: 'EICRA: INT1 por subida (ISC11 = 1, ISC10 = 1) e INT0 por bajada (ISC01 = 1, ISC00 = 0). Bits 3 a 0: ISC11, ISC10, ISC01, ISC00.', n: 8, target: 14, e: '0b00001110 = 14.', c: 'av_bits' },
  I('Configurar INT0 por flanco de bajada:', { code: 'EICRA = (1 << ISC01);        // INT0 en flanco de bajada\nEIMSK = (1 << INT0);         // habilita INT0\nsei();\n\nISR(INT0_vect) { pulsos++; }' }),
  I('Las <b>PCINT</b> (interrupciones por cambio de pin) existen en casi todas las patas, pero agrupadas: un vector por puerto y solo avisan de que “algo ha cambiado”. <b>PCICR</b> activa el grupo (PCIE0 = puerto B, PCIE1 = C, PCIE2 = D) y <b>PCMSKn</b> elige las patas.'),
  { t: 'match', q: 'Une cada vector con sus patas.', pairs: [['PCINT0_vect', 'Puerto B (D8–D13)'], ['PCINT1_vect', 'Puerto C (A0–A5)'], ['PCINT2_vect', 'Puerto D (D0–D7)'], ['INT0_vect', 'Solo PD2']], c: 'av_extint' },
  Q('¿Qué contiene la variable cambio?', ['Los bits que han cambiado desde la última vez', 'Los bits que están a 1', 'Los bits que están a 0', 'El número de cambios'], 'XOR entre lo de ahora y lo de antes.', { code: 'ISR(PCINT0_vect) {\n  static uint8_t antes = 0xFF;\n  uint8_t ahora = PINB;\n  uint8_t cambio = ahora ^ antes;\n  antes = ahora;\n  if (cambio & (1 << PB0)) { /* PB0 ha cambiado */ }\n}', c: 'av_extint' }),
  Q('Un pulsador en INT0 por flanco cuenta tres pulsaciones cada vez. ¿Por qué?', ['Rebotes: varios flancos en pocos ms; filtra con RC o ignora flancos durante unos 20 ms', 'INT0 está roto', 'Falta volatile', 'El prescaler'], 'Un contacto mecánico rebota.', { c: 'av_bounce' }),
  Q('Para despertar de power-down, INT0 debe configurarse…', ['Por nivel bajo: las de flanco necesitan un reloj que en power-down está parado', 'Por subida', 'Por cualquier cambio', 'No puede despertar'], 'Las PCINT sí despiertan con cualquier cambio.', { c: 'av_wake' }),
  Q('Codificador rotatorio en PB0 y PB1. ¿Qué interrupción usas?', ['PCINT0, con PCINT0 y PCINT1 activados en PCMSK0', 'INT0', 'TIMER1_OVF', 'USART_RX'], 'PB0 y PB1 no tienen INT0/INT1.', { c: 'av_extint' }),
  { t: 'pin', q: '¿En qué pin de la Uno está INT1?', a: 'D3', e: 'INT1 = PD3 = D3.', c: 'av_altfn' }
 ]),
 L('av20', 'Latencia e ISR cortas', 'timer', ['av_isrcost', 'av_tflag', 'av_isr', 'av_debug'], [
  I('<b>Latencia</b>: desde que se activa la bandera hasta tu primera línea pasan al menos 4 ciclos de respuesta, el salto del vector y el <b>prólogo</b> que añade el compilador (guarda SREG y los registros que use la ISR). Fácilmente de 20 a 40 ciclos: de 1 a 3 µs a 16 MHz.'),
  Q('Llega tu interrupción mientras otra ISR está en marcha…', ['Espera a que termine: su duración se suma a tu latencia', 'Interrumpe a la otra', 'Se pierde siempre', 'Se ejecutan a la vez'], 'Sin anidamiento, van en fila.', { c: 'av_isrcost' }),
  I('Reglas de oro:\n· Nada de delay(), Serial ni bucles de espera dentro de una ISR.\n· Copia el dato, pon una bandera y sal.\n· El trabajo pesado, en loop().'),
  Q('¿Qué problema tiene esto?', ['Serial también usa interrupciones para enviar: dentro de una ISR puede bloquearse si su búfer se llena', 'Funciona perfecto', 'Es más rápido', 'No compila'], 'Además alarga muchísimo la ISR.', { code: 'ISR(INT0_vect) {\n  Serial.println("pulsado");\n}', c: 'av_isrcost' }),
  Nm('Una ISR de 200 ciclos que salta 40 000 veces por segundo. ¿Qué % de la CPU consume a 16 MHz?', 50, '%', '200 × 40 000 = 8 000 000 ciclos por segundo: la mitad.', { c: 'av_isrcost' }),
  Q('La bandera de una interrupción se activa dos veces antes de que se atienda…', ['Solo cuenta una: el segundo evento se pierde', 'Se ejecuta dos veces', 'Se acumulan en una cola', 'Se reinicia el chip'], 'Por eso las ISR deben ser cortas.', { c: 'av_tflag' }),
  I('Patrón bandera: la ISR guarda el dato en una variable volatile y pone hayDato = true; loop() lo procesa y pone hayDato = false. Si no puedes perder nada, usa un búfer circular (siguiente lección).'),
  Q('ISR_NOBLOCK sirve para…', ['Reactivar las interrupciones al empezar la ISR y dejar que otra la interrumpa', 'Bloquear todas', 'Hacerla más corta', 'Nada'], 'Útil para una ISR larga que no debe retrasar a otra urgente. Úsalo con mucho cuidado.', { c: 'av_isr' }),
  Q('¿Cómo mides con un osciloscopio cuánto dura una ISR?', ['Pones una pata a 1 al entrar y a 0 al salir y mides el pulso', 'Con millis()', 'Con Serial', 'No se puede'], 'Un pin de traza: la herramienta más útil sin depurador.', { c: 'av_debug' })
 ]),
 L('av21', 'Búferes circulares', 'memory', ['av_ring', 'av_uartrate', 'av_uartreg'], [
  I('Un <b>búfer circular</b> es un array con dos índices: la ISR escribe en la cabeza y el programa lee en la cola. Al llegar al final, cada índice vuelve a 0. La ISR nunca espera y no se pierde nada mientras haya hueco.'),
  I('Un búfer de recepción para la USART:', { code: '#define TAM 64                        // potencia de 2\nvolatile uint8_t buf[TAM];\nvolatile uint8_t cabeza = 0, cola = 0;\n\nISR(USART_RX_vect) {                  // productor\n  uint8_t c = UDR0;\n  uint8_t sig = (cabeza + 1) & (TAM - 1);\n  if (sig != cola) { buf[cabeza] = c; cabeza = sig; }   // lleno: se descarta\n}\n\nint16_t leer(void) {                  // consumidor, desde loop()\n  if (cola == cabeza) return -1;      // vacío\n  uint8_t c = buf[cola];\n  cola = (cola + 1) & (TAM - 1);\n  return c;\n}' }),
  Q('¿Por qué TAM es potencia de 2?', ['Porque & (TAM − 1) da la vuelta sin dividir: es muy rápido', 'Por estética', 'Lo exige el compilador', 'Ocupa menos'], 'La CPU no tiene divisor: el módulo sería lento.', { c: 'av_ring' }),
  Q('Con este diseño, ¿cuántos bytes caben como máximo?', ['TAM − 1: se deja un hueco para distinguir lleno de vacío', 'TAM', 'TAM + 1', 'TAM / 2'], 'Si cabeza alcanzase a cola, parecería vacío.', { c: 'av_ring' }),
  Q('¿Hace falta desactivar interrupciones en leer()?', ['No: cada índice lo escribe un solo lado y son de 8 bits (lectura atómica)', 'Sí, siempre', 'Sí, porque buf es volatile', 'Solo con TAM grande'], 'Un productor, un consumidor e índices de un byte.', { c: 'av_ring' }),
  Nm('Recibes a 115 200 baudios (8N1) y loop() tarda hasta 4 ms en volver a leer. ¿Cuántos bytes pueden llegar en ese tiempo?', 46, 'bytes', '11 520 bytes/s × 0,004 s ≈ 46.', { tol: 1, c: 'av_uartrate' }),
  Q('¿Te basta un búfer de 64 bytes en ese caso?', ['Sí, pero con poco margen: si loop() se alarga, se perderán datos', 'No, hacen falta 1024', 'Sobra muchísimo', 'Da igual el tamaño'], '63 útiles frente a 46 por ciclo.', { c: 'av_uartrate' }),
  { t: 'order', q: 'Ordena la escritura segura en la ISR de recepción.', items: ['Calcular el índice siguiente', 'Comprobar que no alcanza a la cola', 'Guardar el dato en la cabeza actual', 'Avanzar la cabeza'], e: 'El dato se guarda antes de publicarlo moviendo la cabeza.', c: 'av_ring' },
  Q('En el búfer de envío, el productor es loop() y el consumidor la ISR. Si loop() avanza la cabeza antes de guardar el dato…', ['La ISR puede saltar en medio y enviar una casilla con basura', 'No pasa nada', 'Va más rápido', 'Se pierde la cola'], 'Primero el dato, luego el índice.', { c: 'av_ring' }),
  Q('La interrupción de “registro de datos vacío” (UDRE) del envío…', ['Debe desactivarse cuando el búfer se vacía, o saltará sin parar', 'Se desactiva sola', 'Solo salta una vez', 'No existe'], 'UDRE salta mientras haya hueco, es decir, siempre que no envíes nada.', { c: 'av_uartreg' })
 ]),
 SIM('av-s4', 'Reto: la entrada INT0', 'El programa del pulsador lee D2, que es PD2: la pata de INT0. Monta el pulsador entre PD2 y GND (el programa activa la pull-up) y el LED en PB5 de la Nano.', { arduino: 'boton', board: 'nano', parts: ['push', 'res', 'led'], code: true, hint: 'PD2 = D2, en la fila de abajo de la Nano. LED con su resistencia en D13 (PB5).' }, 'av_int0'),
 PRJ('av-p7', 'Proyecto: lector de mandos infrarrojos', 'av_ir'),
 PRJ('av-p8', 'Proyecto: sintetizador de 8 bits', 'av_synth')
] },

{ id: 'av-m5', title: 'Periféricos por registros', desc: 'ADC fino, USART con interrupciones, SPI, TWI, EEPROM, comparador y watchdog.', nodes: [
 L('av22', 'El ADC por registros', 'gauge', ['av_adcreg', 'av_adc'], [
  I('El ADC del 328P es de <b>aproximaciones sucesivas</b> y 10 bits, con un multiplexor de 8 canales (6 en el DIP) y un circuito de muestreo y retención.\n<b>ADC = Vin · 1024 / Vref</b>'),
  I('<b>ADMUX</b>: REFS1:0 elige la referencia (00 AREF, 01 AVcc, 11 interna de 1,1 V); ADLAR alinea el resultado a la izquierda; MUX3:0, el canal.\n<b>ADCSRA</b>: ADEN enciende, ADSC arranca, ADIF avisa, ADIE interrumpe y ADPS2:0 es el prescaler.'),
  Q('¿Qué selecciona esta línea?', ['Referencia AVcc y canal ADC3 (A3)', 'Referencia interna y canal 3', 'AREF y canal 0', 'Canal 1 con ADLAR'], 'REFS0 = 1 → AVcc; MUX = 0011 → ADC3.', { code: 'ADMUX = (1 << REFS0) | 3;', c: 'av_adcreg' }),
  Q('Conectas 3,3 V a la pata AREF y tu código usa la referencia AVcc. ¿Qué pasa?', ['Cortocircuitas la referencia interna con tu fuente: elige AREF antes de conectar nada', 'Nada', 'Se calienta el cristal', 'Se borra la EEPROM'], 'Con AVcc o 1,1 V, AREF está unida por dentro a esa referencia.', { c: 'av_adcreg' }),
  I('El reloj del ADC sale del de la CPU con su propio prescaler (2 a 128). Para 10 bits de verdad debe estar entre <b>50 y 200 kHz</b>. Una conversión dura <b>13 ciclos de ADC</b> (25 la primera tras encenderlo).'),
  TU('Elige un prescaler que dé los 10 bits completos a 16 MHz.', 'av_adc', adcP(8), { q: 'ok', min: 1, max: 1, text: 'Objetivo: reloj del ADC entre 50 y 200 kHz', hint: '16 MHz / 128 = 125 kHz. Con /64 ya son 250 kHz.' }, 'Solo /128 cumple a 16 MHz: unas 9600 muestras por segundo.', { c: 'av_adc' }),
  G('av_adcTime'), G('av_adcTime'),
  I('Una lectura completa por registros, esperando a que termine:', { code: 'uint16_t adcLeer(uint8_t canal) {\n  ADMUX  = (1 << REFS0) | (canal & 0x0F);   // AVcc y canal\n  ADCSRA = (1 << ADEN) | (1 << ADSC) | 7;   // prescaler 128 y arranca\n  while (ADCSRA & (1 << ADSC)) ;            // ADSC vuelve a 0 al acabar\n  return ADC;                               // ADCL y ADCH en el orden correcto\n}' }),
  Q('Con ADLAR = 1 lees solo ADCH. Obtienes…', ['Los 8 bits más significativos: 8 bits de resolución con una sola lectura', 'Los 2 bits altos', 'Los 8 bits bajos', 'Nada'], 'Útil cuando 8 bits bastan y necesitas velocidad.', { c: 'av_adcreg' }),
  Q('Si lees ADCL y ADCH por separado, ¿en qué orden?', ['Primero ADCL: al leerlo, el resultado queda bloqueado hasta que leas ADCH', 'Primero ADCH', 'Da igual', 'Solo ADCH'], 'La macro ADC de 16 bits ya lo hace bien.', { c: 'av_adcreg' })
 ]),
 L('av23', 'ADC fino: ruido, sobremuestreo y sensores internos', 'gauge', ['av_oversample', 'av_vcc', 'av_adcimp'], [
  I('Fuentes de error: el ruido de la alimentación, la impedancia de la fuente (el condensador de muestreo, de unos 14 pF, quiere fuentes de 10 kΩ o menos) y la propia referencia. AVcc son los 5 V del USB: si bajan a 4,8 V, todas tus medidas se mueven un 4 %.'),
  Q('Lees un sensor de 100 kΩ de impedancia alternando canales deprisa. ¿Qué pasa?', ['Lee mal: el condensador de muestreo no se carga a tiempo; pon un seguidor o 100 nF en la entrada', 'Lee perfecto', 'Rompe el ADC', 'Siempre da 0'], 'Arrastra la tensión del canal anterior.', { c: 'av_adcimp' }),
  I('Mejoras de hardware: 100 nF entre AREF y GND, AVCC filtrado (la hoja de datos propone una bobina de 10 µH y 100 nF) y el modo de sueño <b>ADC Noise Reduction</b>, que detiene la CPU durante la conversión.'),
  I('<b>Sobremuestreo</b>: si sumas 4ⁿ lecturas y desplazas n bits a la derecha, ganas n bits de resolución, siempre que haya algo de ruido (al menos 1 LSB) que haga variar las lecturas. 16 lecturas → 12 bits.'),
  TU('Consigue 12 bits efectivos sin salir de los 10 bits de base completos.', 'av_adc', adcP(128, 0, true, false), { q: 'bits', min: 12, max: 12, text: 'Objetivo: 12 bits', hint: 'Dos bits extra: 16 lecturas por resultado.' }, '16 lecturas por resultado: unas 600 medidas de 12 bits por segundo.', { c: 'av_oversample' }),
  Nm('¿Cuántas lecturas hacen falta para ganar 3 bits?', 64, 'lecturas', '4³ = 64.', { c: 'av_oversample' }),
  Q('Sumas 16 lecturas y divides entre 16. ¿Qué consigues?', ['Menos ruido, pero sin bits extra: los descartas al dividir', 'Una lectura de 14 bits', 'Empeorar la medida', 'Lo mismo que el sobremuestreo a 12 bits'], 'Para 12 bits, divide entre 4 (desplaza 2).', { c: 'av_oversample' }),
  I('Dos canales internos:\n· <b>MUX = 1000</b>: un sensor de temperatura, con la referencia de 1,1 V. Unos 314 mV a 25 °C y aproximadamente 1 mV/°C, pero sin calibrar puede errar ±10 °C.\n· <b>MUX = 1110</b>: la propia referencia de 1,1 V.'),
  Q('¿Cómo mides la VCC del propio chip sin ningún componente?', ['Con referencia AVcc, mides la de 1,1 V interna: VCC = 1,1 × 1024 / ADC', 'Es imposible', 'Con analogRead(A6)', 'Con el sensor de temperatura'], 'Truco clásico para vigilar la batería.', { c: 'av_vcc' }),
  Nm('Con referencia AVcc, la lectura de la referencia de 1,1 V da 240. ¿VCC?', 4.693, 'V', '1,1 × 1024 / 240 ≈ 4,69 V.', { tol: 0.02, c: 'av_vcc' }),
  Q('La referencia de 1,1 V varía de un chip a otro (de 1,0 a 1,2 V). Para medidas precisas…', ['Calíbrala: mide VCC con un buen multímetro y guarda el valor real en la EEPROM', 'No hagas nada', 'Usa 5 V siempre', 'Cambia de chip'], 'Una calibración por chip.', { c: 'av_vcc' })
 ]),
 L('av24', 'USART: baudios, tramas y error', 'bus', ['av_uart', 'av_uartrate'], [
  I('La USART envía bytes en serie sin reloj compartido: los dos lados acuerdan la velocidad, en <b>baudios</b> (bits por segundo). La trama típica <b>8N1</b>: un bit de inicio (0), 8 de datos empezando por el <b>menos</b> significativo, sin paridad, y uno de parada (1).'),
  I('Explora la trama: cambia el byte y la velocidad.', { tune: { viz: 'av_uart', params: uartP() } }),
  Q('A 9600 baudios y 8N1, ¿cuántos bytes por segundo como máximo?', ['960', '9600', '1200', '1067'], '10 bits por byte.', { c: 'av_uartrate' }),
  I('El divisor:\n<b>UBRR0 = F_CPU / (16 · baudios) − 1</b>\nCon U2X0 = 1, entre 8 en lugar de 16. Como hay que redondear, los baudios reales no son exactos: aparece un <b>error</b>.'),
  G('av_ubrr'), G('av_baudErr'),
  TU('A 115 200 baudios, consigue menos de 2,5 % de error.', 'av_uart', uartP(115200, 0, true, 85), { q: 'errAbs', min: 0, max: 2.5, text: 'Objetivo: error por debajo de 2,5 %', hint: 'Prueba U2X0 = 1.' }, 'Con U2X0 = 1: UBRR0 = 16 y un +2,1 %. Es lo que hace Serial.begin(115200).', { c: 'av_uart' }),
  TU('Encuentra una velocidad con error 0 % exacto a 16 MHz.', 'av_uart', uartP(9600, 0), { q: 'errAbs', min: 0, max: 0.01, text: 'Objetivo: error 0 %', hint: 'El MIDI usa una de ellas: 31 250 baudios.' }, '31 250 (UBRR0 = 31) y 250 000 (UBRR0 = 3) dividen exacto.', { c: 'av_uart' }),
  Q('¿Por qué existen cristales de 14,7456 MHz?', ['Dividen exacto a las velocidades serie estándar: error 0 %', 'Son más baratos', 'Son más rápidos', 'Por el USB'], '14 745 600 / (16 × 9600) = 96 exactos.', { c: 'av_uart' }),
  Q('Emisor con +2 % y receptor con −2 % de error…', ['Se suman: un 4 % de diferencia y la trama falla', 'Se compensan', 'No importa', 'Funciona mejor'], 'Lo que cuenta es la diferencia entre los dos relojes.', { c: 'av_uart' })
 ]),
 L('av25', 'USART por registros e interrupciones', 'code', ['av_uartreg', 'av_uartrate', 'av_uartwire'], [
  I('Registros: <b>UDR0</b> (el dato), <b>UCSR0A</b> (banderas: RXC0 recibido, UDRE0 hueco para enviar, FE0 error de trama, DOR0 desbordamiento), <b>UCSR0B</b> (RXEN0, TXEN0 y las interrupciones) y <b>UCSR0C</b> (formato).'),
  I('Lo mínimo, sin interrupciones:', { code: 'void uartInit(void) {\n  UBRR0  = 103;                              // 9600 baudios a 16 MHz\n  UCSR0B = (1 << RXEN0) | (1 << TXEN0);\n  UCSR0C = (1 << UCSZ01) | (1 << UCSZ00);    // 8N1\n}\n\nvoid uartPut(uint8_t c) {\n  while (!(UCSR0A & (1 << UDRE0))) ;         // espera hueco\n  UDR0 = c;\n}' }),
  Q('¿Qué indica UDRE0 = 1?', ['Que el registro de envío está libre: puedes escribir otro byte', 'Que ha llegado un byte', 'Un error de trama', 'Que el cable está suelto'], 'Data Register Empty.', { c: 'av_uartreg' }),
  Q('DOR0 = 1 significa…', ['Que llegaron bytes y nadie leyó UDR0 a tiempo: se perdió alguno', 'Un error de paridad', 'Que el envío ha terminado', 'Que la velocidad es errónea'], 'Data OverRun.', { c: 'av_uartreg' }),
  Q('Ves FE0 = 1 una y otra vez. ¿Causa probable?', ['Baudios distintos en los dos extremos, o ruido en la línea', 'Que el búfer está vacío', 'Que el envío ha terminado', 'Que hay paridad par'], 'El bit de parada no llega donde se espera.', { c: 'av_uartreg' }),
  I('Con interrupciones: <b>RXCIE0</b> llama a USART_RX_vect por cada byte recibido (lo metes en un búfer circular). Para enviar, <b>UDRIE0</b> llama a USART_UDRE_vect mientras haya hueco: sacas el siguiente byte del búfer y, cuando se vacía, desactivas UDRIE0.'),
  Q('¿Por qué un Serial.print() a veces “congela” loop()?', ['Su búfer de envío (64 bytes) se llena y espera a que salgan bytes', 'Porque usa delay()', 'Por el ADC', 'Nunca pasa'], 'A 9600 baudios, 64 bytes tardan 67 ms.', { c: 'av_uartrate' }),
  Nm('¿Cuánto tarda en salir un mensaje de 64 bytes a 9600 baudios (8N1), en ms?', 66.67, 'ms', '640 bits / 9600 ≈ 66,7 ms.', { tol: 0.5, c: 'av_uartrate' }),
  { t: 'match', q: 'Une cada conexión entre la Uno y otro equipo serie.', pairs: [['TX de la Uno', 'RX del otro equipo'], ['RX de la Uno', 'TX del otro equipo'], ['GND', 'GND (masa común)'], ['Baudios', 'Iguales en los dos lados']], c: 'av_uartwire' },
  Q('Un módulo de 3,3 V va al TX de la Uno. ¿Qué haces?', ['Un divisor o un adaptador de nivel en la línea que llega al módulo: la Uno saca 5 V', 'Lo conectas directo siempre', 'Cruzas GND', 'Nada'], 'El RX del módulo podría no tolerar 5 V.', { c: 'av_uartwire' }),
  Q('Escribes tu propia ISR(USART_RX_vect) en un sketch que también usa Serial. ¿Qué pasa?', ['Choca: el núcleo ya define esa ISR al usar Serial; elige una de las dos', 'Funciona', 'Se llaman las dos', 'Basta con volatile'], 'Error de vector definido dos veces al enlazar.', { c: 'av_uartreg' })
 ]),
 L('av26', 'SPI maestro', 'bus', ['av_bus'], [
  I('<b>SPI</b>: bus síncrono de 4 hilos. El maestro genera el reloj SCK y en cada pulso sale un bit por MOSI y entra otro por MISO: un intercambio, como dos registros de desplazamiento unidos en anillo. SS (o CS) elige al esclavo, activo a 0.'),
  { t: 'match', q: 'Une cada señal SPI con su pata en la Uno.', pairs: [['SCK', 'PB5 (D13)'], ['MISO', 'PB4 (D12)'], ['MOSI', 'PB3 (D11)'], ['SS', 'PB2 (D10)']], c: 'av_bus' },
  I('<b>SPCR</b>: SPE activa, MSTR maestro, CPOL y CPHA eligen el modo (0–3), DORD el orden de bits y SPR1:0 la velocidad. <b>SPSR</b>: SPIF (fin de byte) y SPI2X (velocidad doble). <b>SPDR</b>: escribir envía; leer da lo recibido.'),
  Q('SPR1:0 = 00 y SPI2X = 1 a 16 MHz. ¿SCK?', ['8 MHz', '4 MHz', '16 MHz', '2 MHz'], 'F_CPU / 4 × 2 = F_CPU / 2.', { c: 'av_bus' }),
  Nm('¿Cuántos µs tarda un byte con SCK a 8 MHz (sin contar el código)?', 1, 'µs', '8 bits / 8 MHz.', { c: 'av_bus' }),
  Q('En modo maestro dejas PB2 (SS) como entrada y el ruido la lleva a 0. ¿Qué pasa?', ['El SPI pasa solo a esclavo (se borra MSTR) y deja de enviar', 'Nada', 'Se reinicia el chip', 'Va más rápido'], 'Pon SS como salida aunque no la uses.', { c: 'av_bus' }),
  Q('Para leer un byte de un esclavo SPI…', ['Envías un byte cualquiera (por ejemplo, 0xFF) y lees SPDR: siempre es un intercambio', 'Lees SPDR sin enviar nada', 'Pones MISO como salida', 'Usas otra línea'], 'Sin envío no hay reloj.', { c: 'av_bus' }),
  Q('Un chip pide CPOL = 0 y CPHA = 0. Es el…', ['Modo 0', 'Modo 1', 'Modo 2', 'Modo 3'], 'Modo = CPOL × 2 + CPHA.', { c: 'av_bus' }),
  I('Un byte por SPI, esperando a SPIF:', { code: 'uint8_t spiByte(uint8_t b) {\n  SPDR = b;\n  while (!(SPSR & (1 << SPIF))) ;   // 8 bits\n  return SPDR;                      // lo que llegó por MISO\n}' }),
  Q('Tres esclavos SPI en el mismo bus. ¿Qué comparten?', ['SCK, MOSI y MISO; cada uno lleva su propia línea CS', 'Todo, también CS', 'Nada', 'Cada uno su SCK'], 'CS dice a quién le toca.', { c: 'av_bus' }),
  Q('Un 74HC595 por SPI necesita además…', ['Un pulso en su RCLK (latch) para pasar los datos a las salidas', 'Una dirección', 'Una pull-up', 'Nada'], 'Desplazar y mostrar son pasos separados.', { c: 'av_bus' })
 ]),
 L('av27', 'TWI (I²C) por registros', 'bus', ['av_i2c'], [
  I('El <b>TWI</b> es el I²C de los AVR: 2 hilos, SDA (PC4, A4) y SCL (PC5, A5), con salidas en drenador abierto y <b>pull-ups</b> externas (4,7 kΩ típico). Cada esclavo tiene una dirección de 7 bits.'),
  I('Velocidad:\n<b>f_SCL = F_CPU / (16 + 2 · TWBR · 4^TWPS)</b>\nA 16 MHz con TWPS = 0: TWBR = 72 da 100 kHz y TWBR = 12, 400 kHz.'),
  G('av_twbr'),
  I('Cada paso lo lanza TWCR (escribir TWINT a 1 lo arranca) y el resultado se lee en <b>TWSR</b> enmascarando con 0xF8: 0x08 START enviado, 0x18 dirección + escritura con ACK, 0x20 sin ACK, 0x28 dato con ACK…'),
  { t: 'order', q: 'Ordena la escritura de un byte en un esclavo.', items: ['START', 'Dirección del esclavo + bit de escritura (0)', 'Comprobar el ACK', 'Enviar el dato', 'STOP'], e: 'Cada paso se confirma en TWSR.', c: 'av_i2c' },
  I('Las tres piezas básicas:', { code: 'void twiStart(void) {\n  TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN);\n  while (!(TWCR & (1 << TWINT))) ;     // espera al hardware\n}\n\nuint8_t twiEscribir(uint8_t b) {\n  TWDR = b;\n  TWCR = (1 << TWINT) | (1 << TWEN);\n  while (!(TWCR & (1 << TWINT))) ;\n  return TWSR & 0xF8;                  // código de estado\n}\n\nvoid twiStop(void) {\n  TWCR = (1 << TWINT) | (1 << TWSTO) | (1 << TWEN);\n}' }),
  Q('Tras enviar la dirección, TWSR & 0xF8 = 0x20. Significa…', ['Que nadie respondió (NACK): dirección equivocada o dispositivo sin alimentar', 'Que todo es correcto', 'Que llegó un dato', 'Que el bus está libre'], '0x18 sería el ACK.', { c: 'av_i2c' }),
  Q('Una hoja de datos dice “dirección 0x4E (escritura)” y el escáner de Arduino encuentra 0x27. ¿Contradicción?', ['No: 0x4E es 0x27 desplazado un bit con el bit R/W; Wire usa la dirección de 7 bits', 'Sí, uno está roto', 'Son dos chips distintos', 'El escáner falla'], '0x27 × 2 = 0x4E.', { c: 'av_i2c' }),
  Q('Bus I²C solo con las pull-ups internas (20–50 kΩ)…', ['Flancos de subida lentos: puede fallar a 100 kHz y casi seguro a 400 kHz', 'Va mejor', 'No cambia nada', 'Se queman las patas'], 'La capacidad del bus y una pull-up alta hacen un RC lento.', { c: 'av_i2c' }),
  Q('¿Por qué las salidas I²C son de drenador abierto?', ['Para que varios dispositivos compartan la línea sin cortocircuitos: solo tiran a 0', 'Para ir más rápido', 'Para dar 5 V', 'Por precio'], 'Si dos empujaran a niveles distintos, habría un corto.', { c: 'av_i2c' })
 ]),
 L('av28', 'EEPROM, comparador y watchdog', 'shield', ['av_eeprom', 'av_wdt', 'av_acomp'], [
  I('<b>EEPROM</b>: con avr/eeprom.h tienes eeprom_read_byte, <b>eeprom_update_byte</b> (solo escribe si cambia) y variables EEMEM. En Arduino, EEPROM.get, put y update. Cada escritura tarda unos 3,3 ms y la CPU puede seguir trabajando.'),
  Q('¿Por qué eeprom_update_byte y no eeprom_write_byte?', ['No escribe si el valor ya es igual: no gasta ciclos de vida', 'Escribe más rápido', 'Escribe dos veces', 'Borra antes'], 'Lee, compara y solo escribe si hace falta.', { c: 'av_eeprom' }),
  G('av_eeLife'),
  Q('Se corta la alimentación justo mientras escribes la EEPROM…', ['Puede corromperse ese byte; con el BOD activado, el chip se detiene antes de escribir con tensión baja', 'No pasa nada', 'Se borra toda la EEPROM', 'Se rompe el chip'], 'La hoja de datos recomienda el BOD para proteger la EEPROM.', { c: 'av_eeprom' }),
  I('<b>Comparador analógico</b>: compara AIN0 (PD6, D6) con AIN1 (PD7, D7) o con la de 1,1 V interna. ACO da el resultado y puede interrumpir o disparar la captura del Timer1 (ACIC). Responde en menos de un microsegundo, sin esperar al ADC.'),
  Q('Quieres enterarte al instante de que una batería baja de un umbral, sin ocupar el ADC.', ['Comparador analógico con la referencia de 1,1 V y un divisor', 'Leer el ADC cada segundo', 'Con INT0', 'Es imposible'], 'Y con su interrupción, sin tener que vigilarlo.', { c: 'av_acomp' }),
  I('<b>Watchdog</b>: un temporizador con su propio oscilador de 128 kHz. Si tu programa no lo “acaricia” (wdt_reset()) antes de que expire (de 16 ms a 8 s), reinicia el chip. Si el programa se cuelga, se recupera solo.'),
  I('Uso básico:', { code: '#include <avr/wdt.h>\n\nvoid setup() {\n  MCUSR = 0;                 // borra la causa del último reinicio\n  wdt_disable();             // por si venimos de un reinicio por watchdog\n  wdt_enable(WDTO_2S);       // 2 s sin wdt_reset() = reinicio\n}\n\nvoid loop() {\n  trabajo();                 // nunca debe tardar más de 2 s\n  wdt_reset();\n}' }),
  Q('Tras un reinicio por watchdog, este sigue activado con 16 ms. Si tu setup() tarda 1 s…', ['Se reinicia en bucle: desactívalo o reconfigúralo al principio de todo', 'No pasa nada', 'Se apaga solo', 'Se reinicia una sola vez'], 'Por eso se borra WDRF y se desactiva lo primero.', { c: 'av_wdt' }),
  Q('Algunos bootloaders antiguos, como el de muchas Nano clónicas…', ['Se quedan en bucle tras un reinicio por watchdog: actualiza a Optiboot', 'Lo desactivan siempre', 'No se ven afectados', 'Lo ponen a 8 s'], 'El bootloader tarda más que el plazo de 16 ms.', { c: 'av_wdt' }),
  { t: 'match', q: 'Une cada bit de WDTCSR con su papel.', pairs: [['WDE', 'Reinicio al expirar'], ['WDIE', 'Interrupción al expirar'], ['WDP3:0', 'Tiempo de espera'], ['WDCE', 'Permite cambios (secuencia temporizada)']], c: 'av_wdt' }
 ]),
 SIM('av-s5', 'Reto: el canal ADC0', 'El programa del potenciómetro lee el canal ADC0 y escribe el resultado en OCR1A. Lleva el cursor del potenciómetro a la pata PC0 (ADC0) de la Nano y el LED a OC1A (PB1).', { arduino: 'pot', board: 'nano', parts: ['pot', 'res', 'led'], code: true, hint: 'PC0 = A0 y PB1 = D9. Extremos del potenciómetro a 5V y GND.' }, 'av_adc0'),
 PRJ('av-p9', 'Proyecto: termómetro con historial en EEPROM', 'av_thermo'),
 PRJ('av-p10', 'Proyecto: osciloscopio de bolsillo', 'av_scope'),
 PRJ('av-p11', 'Proyecto: cubo LED 4×4×4 por SPI', 'av_cube'),
 PRJ('av-p12', 'Proyecto: controlador MIDI', 'av_midi')
] },

{ id: 'av-m6', title: 'Energía y fiabilidad', desc: 'Modos de sueño, despertar, BOD, reinicios y cómo hacer que unas pilas duren años.', nodes: [
 L('av29', 'Modos de sueño', 'sleep', ['av_sleepmode', 'av_leak'], [
  I('El 328P puede dormir: para los relojes que no necesitas y gasta muchísimo menos. <b>SMCR</b> elige el modo (SM2:0) y lo habilita (SE); la instrucción <b>sleep</b> lo duerme. En C: set_sleep_mode(), sleep_enable() y sleep_cpu().'),
  { t: 'match', q: 'Une cada modo con lo que sigue funcionando.', pairs: [['Idle', 'CPU parada; temporizadores, USART y ADC siguen'], ['ADC Noise Reduction', 'Casi solo el ADC: medidas limpias'], ['Power-down', 'Todo parado salvo watchdog y despertares externos'], ['Power-save', 'Como power-down, pero el Timer2 asíncrono sigue']], c: 'av_sleepmode' },
  I('Cifras típicas de la hoja de datos (3 V, 25 °C) en power-down: unos <b>0,1 µA</b> con el watchdog apagado y unos 4 µA con él encendido. Despierto a 16 MHz y 5 V, del orden de 10 mA: unas cinco órdenes de magnitud de diferencia.'),
  Q('El Timer2 con un cristal de reloj de 32 768 Hz debe seguir contando mientras duerme. ¿Modo?', ['Power-save', 'Power-down', 'Idle', 'ADC Noise Reduction'], 'Power-save mantiene el Timer2 asíncrono.', { c: 'av_sleepmode' }),
  I('<b>PRR</b> (Power Reduction Register) apaga el reloj de los periféricos que no usas, también despierto: PRADC, PRUSART0, PRSPI, PRTWI, PRTIM0, PRTIM1 y PRTIM2. Antes de dormir apaga también el ADC (ADEN = 0) y el comparador (ACD = 1).'),
  Q('Duermes en power-down pero mides 300 µA. Sospechoso habitual:', ['El ADC sigue encendido (ADEN = 1) o hay entradas flotando', 'El cristal', 'El watchdog', 'Nada: es normal'], 'El ADC encendido gasta aunque no convierta.', { c: 'av_leak' }),
  Q('¿Por qué gastan las entradas digitales que flotan?', ['El buffer de entrada queda a media tensión y conduce corriente: pon pull-ups o salidas fijas', 'Son antenas que emiten', 'Se calientan las patas', 'No gastan'], 'Las dos mitades del inversor CMOS conducen a la vez.', { c: 'av_leak' }),
  { t: 'order', q: 'Ordena la secuencia para dormir.', items: ['Configurar la fuente de despertar', 'Apagar el ADC y lo que no haga falta', 'set_sleep_mode(SLEEP_MODE_PWR_DOWN)', 'sleep_enable() y sei()', 'sleep_cpu()', 'Al despertar: sleep_disable() y restaurar'], e: 'sei() justo antes de sleep_cpu() garantiza que se duerme antes de atender la interrupción.', c: 'av_sleepmode' },
  Q('Al despertar de power-down con el cristal de 16 MHz de Arduino, el chip tarda en arrancar…', ['Unos 16 000 ciclos (1 ms) a que el cristal se estabilice; con el RC interno, solo 6 ciclos', 'Nada', 'Un segundo', 'Siempre 65 ms'], 'Lo fijan los fusibles SUT y CKSEL.', { c: 'av_sleepmode' }),
  Q('sleep_bod_disable() justo antes de dormir…', ['Apaga el detector de baja tensión mientras duerme y ahorra unos 20 µA', 'Desactiva el watchdog', 'Reinicia el chip', 'Sube el reloj'], 'Al despertar, el BOD vuelve a funcionar.', { c: 'av_leak' })
 ]),
 L('av30', 'Despertar: interrupciones y watchdog', 'sleep', ['av_wake', 'av_wdt', 'av_clksrc', 'av_vector', 'av_leak'], [
  I('Solo algunas cosas despiertan de power-down: INT0/INT1 <b>por nivel bajo</b>, cualquier PCINT, la coincidencia de dirección TWI y el watchdog. Las de flanco de INT0/INT1 necesitan reloj, y en power-down no hay.'),
  Q('Un pulsador en PD3 debe despertar al chip de power-down. Configuras…', ['INT1 por nivel bajo, o PCINT19', 'INT1 por flanco de bajada', 'El Timer1', 'La USART'], 'PD3 es INT1 y también PCINT19.', { c: 'av_wake' }),
  I('El <b>watchdog en modo interrupción</b> (WDIE = 1, WDE = 0) es un despertador: cada 16 ms a 8 s salta WDT_vect y el chip despierta. Para periodos más largos, cuentas despertares.'),
  Nm('¿Cuántos despertares de 8 s hacen falta para medir cada 10 minutos?', 75, '', '600 / 8 = 75.', { c: 'av_wake' }),
  Q('¿Qué tal es el watchdog como reloj?', ['Malo: su oscilador de 128 kHz varía con la tensión y la temperatura; para horas exactas, un RTC', 'Excelente', 'Igual que un cristal', 'Depende del prescaler'], 'Sirve para “más o menos cada 8 s”.', { c: 'av_clksrc' }),
  I('Despertador de 8 s con el watchdog:', { code: 'ISR(WDT_vect) { }                       // solo despierta\n\nvoid watchdog8s(void) {\n  cli();\n  MCUSR &= ~(1 << WDRF);\n  WDTCSR = (1 << WDCE) | (1 << WDE);     // abre la ventana de 4 ciclos\n  WDTCSR = (1 << WDIE) | (1 << WDP3) | (1 << WDP0);  // interrupción, 8 s\n  sei();\n}' }),
  Q('¿Por qué cambiar WDTCSR exige escribir WDCE y WDE juntos y el valor nuevo en 4 ciclos?', ['Para que un programa descontrolado no pueda apagar el watchdog por accidente', 'Para ir más rápido', 'Por el bootloader', 'Es opcional'], 'Una secuencia así no ocurre por casualidad.', { c: 'av_wdt' }),
  Q('Despiertas con el PCINT de un pulsador. La ISR de ese PCINT…', ['Debe existir aunque esté vacía, o el salto irá a __bad_interrupt', 'No hace falta', 'Debe ser larga', 'Debe volver a dormir'], 'Una ISR vacía basta para despertar.', { c: 'av_vector' }),
  Q('Compruebas “¿hay trabajo?”, ves que no y vas a dormir, pero la interrupción llega justo entre medias. ¿Riesgo y solución?', ['Dormir sin atenderla hasta el siguiente despertar: haz cli(), comprueba y luego sei(); sleep_cpu(); seguidos', 'Ninguno', 'Se reinicia', 'Se pierde el watchdog'], 'La instrucción que sigue a sei() se ejecuta siempre antes de cualquier interrupción.', { c: 'av_wake' }),
  { t: 'order', q: 'Ordena un ciclo de medida de un aparato a pilas.', items: ['Despertar por el watchdog', 'Encender el sensor y esperar a que se estabilice', 'Medir y guardar', 'Apagar el sensor', 'Volver a dormir'], e: 'Todo lo que no mide, apagado.', c: 'av_leak' }
 ]),
 L('av31', 'BOD, reinicios y fiabilidad', 'shield', ['av_reset', 'av_wdt', 'av_bare', 'av_vmax', 'av_sections'], [
  I('El <b>BOD</b> (Brown-Out Detector) mantiene el chip en reinicio si VCC baja de un umbral elegido con los fusibles BODLEVEL: 1,8, 2,7 o 4,3 V. Sin él, con tensión baja la CPU puede ejecutar mal y corromper la EEPROM o la Flash.'),
  Q('Chip a 16 MHz alimentado a 5 V. ¿Qué nivel de BOD tiene más sentido?', ['4,3 V: por debajo de unos 3,8 V, 16 MHz ya está fuera de especificación', '1,8 V', 'Apagado', '2,7 V, para que dure más'], 'Arduino usa 2,7 V, que es optimista para 16 MHz.', { c: 'av_vmax' }),
  I('<b>MCUSR</b> guarda la causa del último reinicio: PORF (encendido), EXTRF (pata RESET), BORF (baja tensión) y WDRF (watchdog). Léelo al arrancar y bórralo: te dice si tu sistema se reinicia “solo” y por qué. Ojo: algunos bootloaders lo borran antes de que tu programa lo vea.'),
  { t: 'bits', q: 'MCUSR tras un brown-out seguido de un reinicio por watchdog, sin borrar: BORF (bit 2) y WDRF (bit 3).', n: 8, target: 12, e: '4 + 8 = 12.', c: 'av_reset' },
  Q('Ves BORF a 1 cada vez que arranca un motor.', ['La tensión cae al arrancar el motor: alimentación separada, condensadores y masas bien llevadas', 'El watchdog está mal configurado', 'El código es lento', 'Falta volatile'], 'El pico de arranque hunde la alimentación.', { c: 'av_reset' }),
  Q('¿Dónde pones wdt_reset() para que el watchdog sea una red de seguridad de verdad?', ['En un único punto del bucle principal que solo se alcanza si todo va bien', 'En la ISR de un temporizador', 'Dentro de cada función', 'En setup()'], 'En una ISR seguiría acariciándolo aunque loop() estuviera colgado.', { c: 'av_wdt' }),
  Q('La pata RESET capta ruido y el chip se reinicia a veces. ¿Qué pones?', ['Pull-up de 10 kΩ a VCC y, si hace falta, un condensador pequeño a masa', 'Nada', 'Una resistencia de 1 MΩ en serie', 'Un LED'], 'Sin pull-up firme, RESET es una antena.', { c: 'av_bare' }),
  Q('Una variable debe sobrevivir a un reinicio por watchdog sin usar la EEPROM. ¿Dónde?', ['En la sección .noinit: el arranque no la pone a cero', 'En .data', 'En la pila', 'Es imposible'], '__attribute__((section(".noinit"))). Tras un corte de alimentación, su valor es basura.', { c: 'av_sections' }),
  Q('Desacoplo del 328P:', ['100 nF entre cada VCC/AVCC y su GND, pegados al chip', 'Uno solo para todo', '1000 µF', 'Ninguno'], 'Cada pareja de alimentación, su condensador.', { c: 'av_bare' }),
  Q('¿Qué hace el fusible WDTON?', ['Deja el watchdog siempre activado: el programa no puede apagarlo', 'Apaga el watchdog', 'Activa el BOD', 'Acelera el watchdog'], 'Para sistemas donde un cuelgue no es aceptable.', { c: 'av_wdt' })
 ]),
 L('av32', 'Presupuesto de batería', 'bat', ['av_sleep', 'av_leak'], [
  I('<b>Consumo medio</b> = (I despierto × t despierto + I dormido × t dormido) / periodo.\n<b>Autonomía</b> = capacidad / consumo medio.\nCasi siempre manda la corriente <b>dormido</b>.'),
  I('Explora: cambia cada parámetro y mira qué manda en la autonomía.', { tune: { viz: 'av_sleep', params: sleepP() } }),
  TU('Con una pila CR2032 (220 mAh), consigue más de un año.', 'av_sleep', sleepP(220), { q: 'years', min: 1, max: 1e9, text: 'Objetivo: más de 1 año', hint: 'Baja la corriente dormido a unos µA y despierta menos a menudo.' }, 'Necesitas una media por debajo de 25 µA.', { c: 'av_sleep' }),
  G('av_sleepLife'), G('av_sleepLife'),
  I('Una placa Uno no sirve para pilas: aunque el 328P duerma, el ATmega16U2 del USB, el regulador y el LED de encendido siguen gastando decenas de mA. Para pilas: chip suelto, o una placa mínima sin LED ni regulador.'),
  Q('Una Uno “dormida” gasta unos 25 mA. Con 2500 mAh dura…', ['Unos 4 días', 'Un año', 'Diez años', 'Una hora'], '2500 / 25 = 100 h.', { c: 'av_sleep' }),
  Q('Las pilas se autodescargan y rinden menos con frío y con picos de corriente. Por eso…', ['Aplica un margen: cuenta, por ejemplo, con el 70–80 % de la capacidad nominal', 'Ignóralo', 'Duplica la tensión', 'Usa más corriente'], 'La capacidad nominal es en condiciones ideales.', { c: 'av_sleep' }),
  Q('Una CR2032 tiene mucha resistencia interna. Un pico de 20 mA (un LED o una radio)…', ['Hace caer su tensión y puede provocar un brown-out: pon un condensador grande en paralelo', 'No le afecta', 'La recarga', 'Sube su tensión'], 'El condensador entrega el pico.', { c: 'av_sleep' }),
  Nm('Duerme con 3 µA y cada 8 s despierta 2 ms gastando 5 mA. ¿Corriente media, en µA?', 4.25, 'µA', '(5000 µA × 0,002 s + 3 µA × 7,998 s) / 8 s ≈ 4,25 µA.', { tol: 0.1, c: 'av_sleep' }),
  Q('Para medir µA con el multímetro en serie, cuidado con…', ['Su caída de tensión en los rangos bajos, que al despertar puede hacer caer el chip', 'Nada', 'Que mide alterna', 'Que se descalibra'], 'Puentea el multímetro mientras despierta o usa un medidor específico.', { c: 'av_leak' })
 ]),
 PRJ('av-p13', 'Proyecto: registrador a pilas que dura más de un año', 'av_logger')
] },

{ id: 'av-m7', title: 'El chip fuera de la placa', desc: 'Arduino en protoboard, fusibles, bootloader, programación ISP y el ATtiny85.', nodes: [
 L('av33', 'Arduino en protoboard', 'bb', ['av_bare', 'av_boot', 'av_fuse', 'av_dip'], [
  I('Una Uno es, en el fondo, un 328P con su reloj, su reset y su alimentación. En protoboard necesitas:\n· VCC (7) y AVCC (20) a 5 V; GND (8 y 22) a masa.\n· Cristal de 16 MHz entre las patas 9 y 10, con 22 pF de cada una a masa.\n· 10 kΩ de RESET (1) a VCC.\n· 100 nF de desacoplo en cada pareja de alimentación.'),
  { t: 'order', q: 'Ordena un montaje seguro.', items: ['Chip a caballo de la ranura, muesca a la izquierda', 'Alimentación, masas y desacoplo', 'Pull-up de RESET', 'Cristal y sus condensadores', 'Medir tensiones antes de programar'], e: 'Primero lo que da vida al chip, luego el reloj.', c: 'av_bare' },
  Q('¿Por qué conectar AVCC aunque no uses el ADC?', ['Alimenta también el puerto C: sin ella, PC0–PC5 no funcionan bien', 'Es opcional', 'Es para el cristal', 'Para el USB'], 'La hoja de datos pide AVCC conectada y cerca de VCC.', { c: 'av_bare' }),
  Q('¿Para qué sirven los dos condensadores de 22 pF del cristal?', ['Son la capacidad de carga que el cristal necesita para oscilar a su frecuencia', 'Desacoplo', 'Filtro de audio', 'Protección contra descargas'], 'El valor exacto depende del cristal; 22 pF es lo típico.', { c: 'av_bare' }),
  Q('Un 328P nuevo, de fábrica, arranca…', ['Con el RC interno de 8 MHz dividido entre 8: a 1 MHz', 'A 16 MHz con cristal', 'A 20 MHz', 'Sin reloj'], 'Hasta que cambies los fusibles, ignora el cristal.', { c: 'av_fuse' }),
  I('Para cargar por USB necesitas el bootloader grabado y un adaptador USB–serie (CH340, CP2102, FTDI) en RX/TX, más el truco del <b>auto-reset</b>: la línea DTR, a través de 100 nF, da un pulso en RESET justo antes de cargar.'),
  { t: 'match', q: 'Une cada conexión del adaptador USB–serie.', pairs: [['TX del adaptador', 'RXD, pata 2'], ['RX del adaptador', 'TXD, pata 3'], ['DTR del adaptador', '100 nF a RESET (pata 1)'], ['D13 de Arduino', 'Pata 19 (PB5)']], c: 'av_boot' },
  Q('El IDE dice “not in sync” al cargar en tu Arduino de protoboard. Primer sospechoso:', ['No hay bootloader, o falla el auto-reset (el condensador de DTR)', 'Un cristal de 8 MHz', 'AVCC', 'El LED'], 'Sin bootloader nadie responde al IDE.', { c: 'av_boot' }),
  Nm('¿En qué pata del DIP-28 está D2 (PD2)?', 4, '', 'Pata 1 RESET, 2 PD0, 3 PD1, 4 PD2.', { c: 'av_dip' }),
  Q('¿Para qué un diodo entre RESET y VCC (cátodo a VCC)?', ['Evita que el pulso de DTR a través del condensador lleve RESET por encima de VCC', 'Es obligatorio para arrancar', 'Sirve de indicador', 'Invierte el reset'], 'La Uno también lo lleva.', { c: 'av_boot' })
 ]),
 L('av34', 'Fusibles sin miedo', 'shield', ['av_fuse'], [
  I('Los <b>fusibles</b> son tres bytes de configuración que se graban por ISP y tu programa no puede cambiar: <b>low</b> (reloj), <b>high</b> (arranque y protecciones) y <b>extended</b> (BOD). Atención: un bit a <b>0 significa programado</b> (activo).'),
  { t: 'match', q: 'Une cada grupo de fusibles con lo que controla.', pairs: [['CKSEL3:0 y SUT1:0', 'Fuente de reloj y tiempo de arranque'], ['CKDIV8', 'Dividir el reloj entre 8'], ['BOOTRST y BOOTSZ', 'Si arranca en el bootloader y su tamaño'], ['BODLEVEL', 'Umbral de baja tensión']], c: 'av_fuse' },
  I('Valores de la Uno: low <b>0xFF</b> (cristal externo, sin dividir), high <b>0xDE</b> (bootloader de 512 bytes, arranca en él, ISP activado), extended <b>0xFD</b> (BOD a 2,7 V). De fábrica: 0x62, 0xD9 y 0xFF.'),
  Q('High = 0xDE = 1101 1110. El bit 0 (BOOTRST) vale 0. Significa…', ['Programado: tras un reinicio salta al bootloader', 'Desactivado', 'Borra el chip', 'BOD apagado'], '0 = activo.', { c: 'av_fuse' }),
  { t: 'bits', q: 'Fusible low para el RC interno de 8 MHz sin dividir: 0xE2. Márcalo.', n: 8, target: 226, e: '0xE2 = 1110 0010: CKDIV8 sin programar (1) y CKSEL = 0010.', c: 'av_fuse' },
  I('Fusibles peligrosos:\n· <b>RSTDISBL</b>: RESET pasa a ser una E/S y el ISP deja de funcionar.\n· <b>SPIEN</b> a 1: desactiva el ISP.\n· Un <b>CKSEL</b> de reloj externo sin reloj: el chip no arranca hasta que le des una señal de reloj.\nLos dos primeros solo se arreglan con un programador de alta tensión.'),
  Q('Grabas por error CKSEL para cristal y tu protoboard no lo tiene.', ['Pon un cristal (o inyecta un reloj en XTAL1) y podrás volver a programar por ISP', 'El chip ha muerto', 'Déjalo un día sin alimentación', 'Pulsa reset muchas veces'], 'Sin reloj no hay ISP, pero se recupera fácil.', { c: 'av_fuse' }),
  Q('La opción “Grabar bootloader” del IDE…', ['También graba los fusibles de la placa elegida: revisa siempre placa y reloj antes de pulsar', 'Es peligrosa siempre', 'No toca los fusibles', 'Borra solo la EEPROM'], 'Una placa equivocada puede dejar el chip esperando un cristal.', { c: 'av_fuse' }),
  Q('EESAVE programado (0) sirve para…', ['Conservar la EEPROM al borrar el chip por ISP', 'Proteger la Flash', 'Ahorrar energía', 'Acelerar la EEPROM'], 'Útil para no perder calibraciones al reprogramar.', { c: 'av_fuse' }),
  Q('CKOUT programado…', ['Saca el reloj del sistema por PB0 (CLKO): lo puedes ver con el osciloscopio', 'Apaga el reloj', 'Duplica la frecuencia', 'Activa el cristal'], 'Muy útil para comprobar a qué frecuencia va el chip.', { c: 'av_fuse' }),
  Q('¿Puede tu programa cambiar los fusibles?', ['No: puede leerlos, pero solo se graban con un programador', 'Sí, con un registro', 'Sí, con la EEPROM', 'Solo el bootloader'], 'Así un error de software no te deja el chip inservible.', { c: 'av_fuse' })
 ]),
 L('av35', 'Bootloader y programación ISP', 'chip', ['av_isp', 'av_boot', 'av_dip'], [
  I('El <b>bootloader</b> (Optiboot en la Uno, 512 bytes al final de la Flash) se ejecuta al reiniciar por la pata RESET, escucha el puerto serie un instante y, si llega un programa, lo graba con la instrucción SPM (autoprogramación). Si no llega nada, salta a tu código.'),
  I('<b>ISP</b> (In-System Programming) programa el chip directamente por SPI manteniendo RESET a 0: MOSI, MISO, SCK, RESET, VCC y GND. Escribe Flash, EEPROM y fusibles, no necesita bootloader… y lo borra si estaba.'),
  { t: 'match', q: 'Une cada señal ISP con su pata del DIP-28.', pairs: [['MISO', 'Pata 18 (PB4)'], ['SCK', 'Pata 19 (PB5)'], ['MOSI', 'Pata 17 (PB3)'], ['RESET', 'Pata 1 (PC6)']], c: 'av_dip' },
  Q('Cargas un programa en tu Uno con “Subir usando programador”.', ['Funciona, pero borra el bootloader: ya no podrás subir por USB hasta volver a grabarlo', 'No funciona', 'Conserva el bootloader', 'Graba solo la EEPROM'], 'El ISP borra toda la Flash antes de escribir.', { c: 'av_isp' }),
  I('Programadores: <b>USBasp</b> (barato), <b>Arduino as ISP</b> (otra Uno con el ejemplo ArduinoISP: D10 → RESET del destino, D11 → MOSI, D12 → MISO, D13 → SCK) o herramientas comerciales como el Atmel-ICE.'),
  Q('¿Para qué un condensador de 10 µF entre RESET y GND de la Uno que hace de Arduino as ISP?', ['Para que no se reinicie ella misma cuando avrdude abre el puerto', 'Para filtrar ruido', 'Para alimentar al destino', 'Para el cristal'], 'Así ignora el pulso de DTR.', { c: 'av_isp' }),
  Q('avrdude lee la firma 0x1E 0x95 0x0F. Es un…', ['ATmega328P', 'ATmega328 (sin P)', 'ATtiny85', 'ATmega2560'], 'El 328 sin P da 1E 95 14 y el ATtiny85, 1E 93 0B.', { c: 'av_isp' }),
  Q('Un chip nuevo a 1 MHz no responde por ISP. ¿Qué pruebas?', ['Bajar la velocidad del ISP: SCK debe ser menor que 1/4 del reloj del chip', 'Subir la tensión', 'Cambiar el cristal', 'Borrar la EEPROM'], 'Con avrdude, la opción -B alarga el periodo de SCK.', { c: 'av_isp' }),
  Q('Al pulsar RESET, tu programa tarda un instante en empezar. Es…', ['El bootloader esperando por si llega un programa nuevo', 'Un fallo', 'El cristal arrancando', 'El BOD'], 'Optiboot no espera tras el encendido, solo tras un reset externo.', { c: 'av_boot' }),
  Q('¿Ventaja de no llevar bootloader en un producto terminado?', ['Arranca al instante, recuperas 512 bytes y nadie lo reprograma por el puerto serie por accidente', 'Es más fácil de actualizar', 'Gasta más', 'Ninguna'], 'A cambio, para actualizar necesitas el programador.', { c: 'av_boot' })
 ]),
 L('av36', 'ATtiny85: un AVR de 8 patas', 'ic', ['av_tiny', 'av_cycle', 'av_vmax', 'av_leak', 'av_fuse'], [
  I('El <b>ATtiny85</b> es un AVR en DIP-8: 8 KB de Flash, 512 bytes de SRAM y 512 de EEPROM, hasta 6 E/S (PB0–PB5, aunque PB5 es RESET), dos temporizadores de 8 bits, ADC de 10 bits y oscilador interno de 8 MHz.'),
  { t: 'match', q: 'Une cada pata del ATtiny85.', pairs: [['Pata 1', 'PB5 / RESET'], ['Pata 4', 'GND'], ['Pata 8', 'VCC'], ['Pata 5', 'PB0 (MOSI, OC0A)']], c: 'av_tiny' },
  Q('¿Qué le falta frente al 328P?', ['USART, SPI y TWI de hardware: tiene una USI genérica con la que se emulan', 'El ADC', 'Los temporizadores', 'Las interrupciones'], 'La USI hace SPI e I²C con ayuda del software.', { c: 'av_tiny' }),
  I('Se programa por ISP (Arduino as ISP o USBasp) y, en el IDE, con un núcleo como ATTinyCore. Tu C con registros funciona casi igual, pero cambian nombres: el watchdog es <b>WDTCR</b> y las interrupciones externas se activan en <b>GIMSK</b>.'),
  Q('Tu código del 328P usa Serial. En el ATtiny85…', ['No hay USART: el núcleo ofrece una serie por software, más limitada', 'Funciona igual', 'Nunca compila', 'Va más rápido'], 'Sin hardware, todo lo hace la CPU.', { c: 'av_tiny' }),
  Q('Consumo del ATtiny85 en power-down con el watchdog apagado:', ['Del orden de 0,1 µA, como el 328P', '10 mA', '1 mA', '100 µA'], 'Ideal para pilas de botón.', { c: 'av_leak' }),
  Nm('ATtiny85 a 1 MHz: ¿cuántos ciclos de reloj hay en un milisegundo?', 1000, 'ciclos', '1 000 000 × 0,001.', { c: 'av_cycle' }),
  Q('¿Puedes alimentar un ATtiny85 a 8 MHz con una CR2032?', ['Sí, mientras la pila esté por encima de 2,7 V; para apurarla, el ATtiny85V llega a 1,8 V a 4 MHz o menos', 'No, nunca a 3 V', 'Solo a 20 MHz', 'Solo con regulador'], 'El ATtiny85 normal pide 2,7 V como mínimo.', { c: 'av_vmax' }),
  Q('Quieres usar PB5 (RESET) como E/S.', ['Fusible RSTDISBL: perderás el ISP y solo un programador de alta tensión lo recupera', 'Basta con DDRB', 'Es imposible', 'Con el bootloader'], 'Hazlo solo con el programa definitivo.', { c: 'av_fuse' })
 ]),
 SIM('av-s6', 'Reto: las patas del ISP', 'El semáforo usa D10, D11 y D12: PB2, PB3 y PB4, que son SS, MOSI y MISO, las mismas patas del ISP. Monta las tres luces en esas patas de la Nano, cada una con su resistencia.', { arduino: 'semaforo', board: 'nano', parts: ['res', 'led'], code: true, hint: 'Rojo en D12 (PB4), ámbar en D11 (PB3) y verde en D10 (PB2), cada uno con su resistencia a GND.' }, 'av_isp3'),
 PRJ('av-p14', 'Proyecto: Arduino casero en protoboard', 'av_proto'),
 PRJ('av-p15', 'Proyecto: llavero luciérnaga con ATtiny85', 'av_tiny')
] },

{ id: 'av-m8', title: 'Herramientas de profesional', desc: 'avr-gcc y avrdude sin IDE, Makefile, .map y .lst, ensamblador y depuración sin depurador.', nodes: [
 L('av37', 'avr-gcc y avrdude sin IDE', 'code', ['av_tool', 'av_fcpu', 'av_pinmap', 'av_sections'], [
  I('El IDE de Arduino esconde una cadena de herramientas: <b>avr-gcc</b> compila, <b>avr-objcopy</b> extrae el .hex y <b>avrdude</b> lo graba. Puedes usarlas tú desde la terminal, con control total.'),
  I('Las cuatro órdenes básicas:', { code: 'avr-gcc -mmcu=atmega328p -DF_CPU=16000000UL -Os -Wall -o main.elf main.c\navr-objcopy -O ihex -R .eeprom main.elf main.hex\navr-size main.elf\navrdude -c arduino -p m328p -P COM5 -b 115200 -U flash:w:main.hex:i' }),
  { t: 'order', q: 'Ordena el flujo de trabajo.', items: ['Escribir main.c', 'Compilar y enlazar en main.elf', 'Extraer main.hex', 'Grabar con avrdude', 'Comprobar que funciona'], e: 'El .elf tiene todo; el .hex, solo lo que se graba.', c: 'av_tool' },
  Q('¿Qué indica -mmcu=atmega328p?', ['Para qué chip compilar: registros, memorias y vectores', 'La velocidad', 'El puerto COM', 'El programador'], 'Con otro valor, los nombres de registros cambian.', { c: 'av_tool' }),
  Q('¿Y -DF_CPU=16000000UL?', ['Define la frecuencia para que _delay_ms y los cálculos de baudios cuadren', 'Cambia el cristal', 'Graba los fusibles', 'Nada'], 'Es solo una constante para el compilador.', { c: 'av_fcpu' }),
  { t: 'match', q: 'Une cada opción de avrdude con su significado.', pairs: [['-c arduino', 'Bootloader de la Uno'], ['-c usbasp', 'Programador USBasp'], ['-c stk500v1 -b 19200', 'Arduino as ISP'], ['-U lfuse:w:0xFF:m', 'Escribe el fusible low']], c: 'av_tool' },
  I('Un main() de AVR no tiene setup() ni loop(): inicializas y entras tú en un bucle infinito. Sin la capa de Arduino no hay millis()… a menos que lo programes con un temporizador, que ya sabes.'),
  { t: 'pin', q: '¿Qué pin de la Uno parpadea con este programa?', code: '#include <avr/io.h>\n#include <util/delay.h>\n\nint main(void) {\n  DDRB |= (1 << PB0);\n  for (;;) {\n    PINB = (1 << PB0);\n    _delay_ms(250);\n  }\n}', a: 'D8', e: 'PB0 = D8.', c: 'av_pinmap' },
  Q('_delay_ms(n) con una variable n en lugar de una constante…', ['Da error o un retardo erróneo: necesita una constante; en un bucle, llama a _delay_ms(1) n veces', 'Funciona igual', 'Es más rápido', 'Hace el retardo en segundos'], 'El retardo se calcula al compilar.', { c: 'av_fcpu' }),
  Q('¿Qué muestra avr-size?', ['Cuánto ocupan .text, .data y .bss', 'Reduce el programa', 'Graba el chip', 'Cuenta líneas de código'], 'Lo verás a fondo en la siguiente lección.', { c: 'av_sections' })
 ]),
 L('av38', 'Makefile, .map y .lst', 'code', ['av_make', 'av_sections', 'av_mem'], [
  I('Un <b>Makefile</b> guarda las órdenes y solo recompila lo que ha cambiado. Escribes make y make flash en vez de líneas larguísimas.', { code: 'MCU    = atmega328p\nCFLAGS = -mmcu=$(MCU) -DF_CPU=16000000UL -Os -Wall\nOBJ    = main.o pantalla.o\n\nmain.hex: main.elf\n\tavr-objcopy -O ihex -R .eeprom main.elf main.hex\n\nmain.elf: $(OBJ)\n\tavr-gcc -mmcu=$(MCU) -o $@ $^\n\n%.o: %.c\n\tavr-gcc $(CFLAGS) -c $< -o $@\n\nflash: main.hex\n\tavrdude -c arduino -p m328p -P COM5 -b 115200 -U flash:w:main.hex:i' }),
  Q('Cambias solo pantalla.c y ejecutas make…', ['Recompila pantalla.o y vuelve a enlazar: no toca los demás .o', 'Recompila todo', 'No hace nada', 'Borra el .hex'], 'make compara fechas de archivos.', { c: 'av_make' }),
  I('<b>avr-size</b>: text = código y constantes en Flash; data = variables con valor inicial (ocupan Flash y SRAM); bss = variables a cero (solo SRAM).\nFlash usada = text + data. SRAM estática = data + bss.'),
  Nm('avr-size: text 4210, data 86, bss 412. ¿SRAM estática?', 498, 'bytes', '86 + 412.', { c: 'av_sections' }),
  Nm('¿Y Flash usada?', 4296, 'bytes', '4210 + 86: los valores iniciales de .data también viven en la Flash.', { c: 'av_sections' }),
  I('El <b>.map</b> (con -Wl,-Map=main.map) dice dónde ha ido cada función y variable y cuánto ocupa: así encuentras quién se come la RAM. El <b>.lst</b> (avr-objdump -d -S main.elf) mezcla tu C con el ensamblador generado.'),
  Q('-ffunction-sections -fdata-sections junto con -Wl,--gc-sections…', ['Pone cada función en su sección y el enlazador elimina las que nadie usa', 'Hace el código más rápido', 'Activa la depuración', 'Rompe el bootloader'], 'Arduino lo hace por ti.', { c: 'av_make' }),
  Q('En el .map ves una tabla de 600 bytes en .data. ¿Arreglo?', ['Hacerla const y PROGMEM: pasa a la Flash y libera 600 bytes de SRAM', 'Hacerla volatile', 'Hacerla static', 'Nada'], 'Las constantes no necesitan RAM.', { c: 'av_mem' }),
  Q('-Os frente a -O2 en AVR:', ['-Os prioriza el tamaño, lo habitual con poca Flash; -O2 puede ir algo más rápido pero ocupa más', '-O2 siempre ocupa menos', 'Son iguales', '-Os desactiva la optimización'], 'Arduino compila con -Os.', { c: 'av_make' }),
  Q('En un Makefile, la línea de la orden debe empezar por…', ['Un tabulador', 'Cuatro espacios', 'Un punto y coma', 'Nada en especial'], 'El error “missing separator” suele ser esto.', { c: 'av_make' })
 ]),
 L('av39', 'Ensamblador AVR para leerlo', 'code', ['av_asm', 'av_cycle', 'av_isrcost', 'av_8bit'], [
  I('No hace falta escribir en ensamblador, pero leerlo en el .lst te dice qué hace de verdad tu C. Las más comunes: ldi (cargar constante), mov, add/sub, and/or/eor, in/out (E/S), lds/sts (SRAM), sbi/cbi (un bit de E/S), rjmp/rcall/ret y brne/breq (saltos condicionales).'),
  { t: 'match', q: 'Une cada instrucción con lo que hace.', pairs: [['ldi r24, 0x20', 'Carga 0x20 en r24'], ['out 0x05, r24', 'Escribe r24 en PORTB'], ['sbi 0x05, 5', 'Pone a 1 el bit 5 de PORTB'], ['brne bucle', 'Salta si el resultado no fue cero']], c: 'av_asm' },
  Q('¿Qué hace este fragmento a 16 MHz?', ['Pone PB5 como salida y la conmuta sin parar a 2 MHz', 'Lee PB5', 'Enciende D13 y lo deja fijo', 'Pone PB3 a 1'], '0x04 es DDRB y 0x03 es PINB: sbi en PINB conmuta. 2 + 2 ciclos por conmutación.', { code: '        sbi  0x04, 5\nbucle:  sbi  0x03, 5\n        rjmp bucle', c: 'av_asm' }),
  I('Direcciones: in, out, sbi y cbi usan direcciones de E/S (PORTB = 0x05); lds y sts, las de datos (PORTB = 0x25). Hay 0x20 de diferencia por los 32 registros que van delante.'),
  Q('TCCR1B está en la dirección de datos 0x81. ¿Se puede usar sbi con él?', ['No: sbi y cbi solo llegan a las E/S 0x00–0x1F; hace falta lds, ori, sts', 'Sí', 'Solo con cli', 'Sí, con out'], 'Por eso tocar bits de TCCR1B no es atómico.', { c: 'av_asm' }),
  Nm('ldi r24, 100 y luego dec r24 / brne bucle hasta 0. ¿Cuántos ciclos en total? (ldi 1, dec 1, brne 2 si salta y 1 si no)', 300, 'ciclos', '1 + 100 + 99 × 2 + 1 = 300.', { c: 'av_cycle' }),
  I('Convención de avr-gcc: r1 vale siempre 0 y r0 es temporal; los argumentos llegan en r24, r22… (de dos en dos, hacia abajo) y un resultado de 8 bits vuelve en r24. Una ISR empieza guardando SREG, r0 y r1: ese es el prólogo que añade latencia.'),
  Q('En el .lst de una ISR ves 12 push al principio y 12 pop al final. ¿Qué te dice?', ['Que usa muchos registros: prólogo y epílogo cuestan unos 50 ciclos; simplifícala o saca trabajo fuera', 'Que está mal compilada', 'Que es normal y no cuesta nada', 'Que tiene un bucle'], 'push y pop tardan 2 ciclos cada uno.', { c: 'av_isrcost' }),
  Q('if (PINB & 0x01) se compiló como sbis 0x03, 0. ¿Qué hace sbis?', ['Salta la siguiente instrucción si el bit 0 de PINB está a 1', 'Pone a 1 el bit', 'Lee el byte entero', 'Compara con 3'], 'Skip if Bit in I/O is Set.', { c: 'av_asm' }),
  G('av_cycles'),
  Q('¿Por qué un uint8_t suele dar código más corto que un int en AVR?', ['Las operaciones de 8 bits son una instrucción; las de 16, dos o más', 'Porque ocupa menos Flash el nombre', 'No hay diferencia', 'Porque int es float'], 'La CPU es de 8 bits.', { c: 'av_8bit' })
 ]),
 L('av40', 'Optimizar y depurar sin depurador', 'meter', ['av_debug', 'av_8bit', 'av_uartrate', 'av_isp'], [
  I('Sin depurador paso a paso, tus herramientas son: Serial (cómodo, pero lento y con efectos secundarios), <b>pines de traza</b> (una pata que sube y baja en puntos clave, medida con osciloscopio o analizador lógico) y LEDs de estado.'),
  Q('¿Por qué un Serial.print() puede hacer que un error desaparezca?', ['Cambia los tiempos del programa: el fallo dependía del orden o de la velocidad', 'Arregla la memoria', 'Reinicia el chip', 'Nunca pasa'], 'Los errores de tiempo son tímidos.', { c: 'av_debug' }),
  Nm('Cada carácter a 115 200 baudios (8N1) tarda, en µs…', 86.8, 'µs', '10 bits / 115 200 ≈ 86,8 µs.', { tol: 0.5, c: 'av_uartrate' }),
  I('Un <b>analizador lógico</b> barato de 8 canales y 24 MHz, con PulseView, decodifica UART, SPI e I²C y te enseña cuánto dura cada ISR si marcas su entrada y su salida con una pata.'),
  Q('Quieres saber qué porcentaje de CPU gasta tu ISR. Con un pin de traza…', ['Mides el ciclo de trabajo del pin: a 1 dentro de la ISR y a 0 fuera', 'Cuentas instrucciones a mano', 'Con millis()', 'Es imposible'], 'El multímetro en V⎓ incluso te da una media.', { c: 'av_debug' }),
  I('Optimiza con cabeza: primero mide. Luego: tipos pequeños (uint8_t en vez de int), evitar float y divisiones, tablas precalculadas en PROGMEM y desplazamientos en vez de multiplicar o dividir por potencias de 2.'),
  Q('Dividir un uint16_t entre 16. ¿Lo más rápido?', ['x >> 4 (el compilador lo hace solo si x no tiene signo y el divisor es constante)', 'Convertir a float y dividir', 'Llamar a una función', 'Un bucle de restas'], 'Un desplazamiento son unas pocas instrucciones.', { c: 'av_8bit' }),
  Q('El 328P multiplica 8 × 8 bits por hardware en 2 ciclos. Pero no tiene…', ['Divisor: las divisiones son rutinas de software lentas', 'Sumador', 'Registros', 'Saltos'], 'Una división de 32 bits cuesta cientos de ciclos.', { c: 'av_8bit' }),
  Q('debugWIRE en el 328P…', ['Permite depurar paso a paso por la pata RESET con una herramienta compatible, pero inutiliza el reset normal y en la Uno exige cortar una pista', 'No existe', 'Es el bootloader', 'Es el ISP'], 'Se activa con el fusible DWEN.', { c: 'av_isp' }),
  { t: 'order', q: 'Ordena un método para cazar un fallo intermitente.', items: ['Reproducirlo de forma fiable', 'Anotar síntomas y la causa del último reinicio (MCUSR)', 'Poner pines de traza en los puntos sospechosos', 'Cambiar una sola cosa cada vez', 'Comprobar que el arreglo aguanta horas'], e: 'Sin reproducirlo, no sabrás si lo has arreglado.', c: 'av_debug' }
 ]),
 PRJ('av-p16', 'Proyecto: robot siguelíneas con PID', 'av_robot'),
 PRJ('av-p17', 'Proyecto final: laboratorio de bolsillo en PCB propia', 'av_final')
] }
    ]
  });
})();
