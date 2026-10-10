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
    if (Math.random() < 0.65) return { h: 'Calcula primero cuántas cuentas caben en un periodo (16 000 000 entre prescaler y frecuencia) y recuerda que el contador empieza en 0.', ...N(`${tn} en modo CTC con prescaler ${n} a 16 MHz. ¿Qué valor pones en ${reg} para que la interrupción salte ${th(f)} veces por segundo?`, k - 1, '', `Cuentas por periodo = 16 000 000 / (${n} × ${th(f)}) = ${th(k)}. El contador va de 0 a ${reg} incluido, así que ${reg} = ${th(k)} − 1 = ${th(k - 1)}.`, 0.5) };
    return { ...N(`${tn} en CTC a 16 MHz, prescaler ${n}, ${reg} = ${k - 1}, con la patilla OC conmutando en cada coincidencia. ¿Frecuencia de la onda cuadrada de la patilla, en Hz?`, f / 2, 'Hz', `Coincide 16 000 000 / (${n} × ${th(k)}) = ${th(f)} veces por segundo, y un periodo completo necesita dos conmutaciones: ${fmt(f / 2)} Hz.`, Math.max(0.01, f / 2 * 0.01)), h: 'Primero la frecuencia de coincidencias; luego piensa cuántas conmutaciones hacen un periodo completo.' };
  }, 'av_ctc');

  Gen.add('av_ovf', () => {
    const [tn, top] = pick([['Timer0', 256], ['Timer2', 256], ['Timer1', 65536]]);
    const n = tn === 'Timer2' ? pick([1, 8, 32, 64, 128, 256, 1024]) : pick([1, 8, 64, 256, 1024]);
    const s = top * n / FCPU;
    return { h: 'Multiplica las cuentas de una vuelta completa (256 o 65 536) por lo que dura cada cuenta (prescaler / 16 MHz).', ...N(`${tn} en modo normal a 16 MHz con prescaler ${n}. ¿Cada cuántos milisegundos se desborda?`, s * 1000, 'ms', `${th(top)} cuentas × ${n} / 16 000 000 = ${fT(s)}.${tn === 'Timer0' && n === 64 ? ' Es el desbordamiento que usa millis() en Arduino.' : ''}`, Math.max(0.0005, s * 10)) };
  }, 'av_timer');

  Gen.add('av_pwmFreq', () => {
    const c = pick(['fast8', 'pc8', 'fast16']);
    if (c === 'fast16') {
      const n = pick([1, 8, 64]), top = pick([199, 399, 639, 799, 999, 1999, 3999, 9999, 19999, 39999]);
      const f = FCPU / (n * (top + 1));
      return MC(`Timer1 en Fast PWM (modo 14, TOP = ICR1 = ${top}) con prescaler ${n} a 16 MHz. ¿Frecuencia del PWM?`, fHz(f), [fHz(FCPU / (n * top)), fHz(f / 2), fHz(f * 2), fHz(n === 1 ? f / 8 : FCPU / (top + 1))], `f = F_CPU / (N · (TOP + 1)) = 16 000 000 / (${n} × ${th(top + 1)}) = ${fHz(f)}. El +1 es porque cuenta de 0 a TOP incluido.`, { h: 'Fast PWM: F_CPU / (N · (TOP + 1)). No olvides el +1.' });
    }
    const n = pick([1, 8, 64, 256, 1024]);
    if (c === 'fast8') {
      const f = FCPU / (n * 256);
      return MC(`Timer0 en Fast PWM de 8 bits (TOP = 255) con prescaler ${n} a 16 MHz. ¿Frecuencia?`, fHz(f), [fHz(FCPU / (n * 255)), fHz(FCPU / (n * 510)), fHz(f * 2)], `f = 16 000 000 / (${n} × 256) = ${fHz(f)}.${n === 64 ? ' Es la de analogWrite en los pines 5 y 6.' : ''}`, { h: 'Fast PWM de 8 bits: 256 cuentas por periodo.' });
    }
    const f = FCPU / (n * 510);
    return MC(`Timer2 en Phase Correct de 8 bits (TOP = 255) con prescaler ${n} a 16 MHz. ¿Frecuencia?`, fHz(f), [fHz(FCPU / (n * 256)), fHz(FCPU / (n * 255)), fHz(FCPU / (n * 1020))], `Sube de 0 a 255 y baja: 510 cuentas por periodo. f = 16 000 000 / (${n} × 510) = ${fHz(f)}.${n === 64 ? ' Es la de analogWrite en los pines 3, 9, 10 y 11.' : ''}`, { h: 'Phase Correct sube y baja: cuenta 510 pasos por periodo, no 256.' });
  }, 'av_pwm');

  Gen.add('av_ubrr', () => {
    const fc = pick([16e6, 16e6, 8e6]), b = pick([2400, 4800, 9600, 19200, 31250, 38400, 57600, 115200, 250000]);
    const u2 = Math.random() < 0.4, d = u2 ? 8 : 16, u = Math.round(fc / (d * b) - 1);
    return { h: 'UBRR0 = F_CPU / (16 · baudios) − 1 (entre 8 si U2X0 = 1), y redondea al entero más cercano.', ...N(`F_CPU = ${fmt(fc / 1e6)} MHz y ${th(b)} baudios ${u2 ? 'con U2X0 = 1 (divide entre 8)' : 'en modo normal (divide entre 16)'}. ¿Qué valor va en UBRR0?`, u, '', `UBRR0 = F_CPU / (${d} × baudios) − 1 = ${fmt(fc / (d * b) - 1, 2)} → se redondea a ${u}.`, 0.5) };
  }, 'av_uart');

  Gen.add('av_baudErr', () => {
    const fc = pick([16e6, 16e6, 8e6]), b = pick([9600, 19200, 38400, 57600, 115200]);
    const u2 = Math.random() < 0.5, d = u2 ? 8 : 16, u = Math.max(0, Math.round(fc / (d * b) - 1));
    const real = fc / (d * (u + 1)), err = (real / b - 1) * 100, ae = Math.abs(err);
    return { h: 'Calcula los baudios reales con UBRR0 + 1 y compáralos con los pedidos: (reales / pedidos − 1) × 100.', ...N(`F_CPU = ${fmt(fc / 1e6)} MHz, ${th(b)} baudios ${u2 ? 'con U2X0 = 1' : 'sin U2X0'}, UBRR0 = ${u}. ¿Error de baudios en %, en valor absoluto?`, ae, '%', `Baudios reales = F_CPU / (${d} × ${u + 1}) = ${fmt(real, 1)}. Error = ${err >= 0 ? '+' : '−'}${fmt(ae, 2)} %. ${ae > 2 ? 'Demasiado: fallará a ratos.' : ae > 1 ? 'Funciona, pero con poco margen.' : 'Sin problema.'}`, Math.max(0.03, ae * 0.03)) };
  }, 'av_uart');

  Gen.add('av_adcTime', () => {
    const ps = pick([2, 4, 8, 16, 32, 64, 128]), fc = pick([16e6, 16e6, 8e6]), fa = fc / ps;
    const full = fa >= 50e3 && fa <= 200e3 ? 'Ese reloj está entre 50 y 200 kHz: 10 bits completos.' : 'Ese reloj está fuera de 50–200 kHz: perderás resolución.';
    if (Math.random() < 0.55) {
      const first = Math.random() < 0.3, cyc = first ? 25 : 13, t = cyc / fa;
      return { h: 'Reloj del ADC = F_CPU / prescaler. Luego divide los ciclos de la conversión entre ese reloj.', ...N(`ADC con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler ${ps}. ¿Cuánto tarda ${first ? 'la primera conversión tras activar ADEN (25 ciclos de ADC)' : 'una conversión normal (13 ciclos de ADC)'}, en µs?`, t * 1e6, 'µs', `Reloj del ADC = ${fHz(fa)}; ${cyc} ciclos = ${fmt(t * 1e6, 2)} µs. ${full}`, t * 1e6 * 0.01) };
    }
    const sps = fa / 13;
    return { h: 'Cada conversión son 13 ciclos del reloj del ADC: divide ese reloj entre 13.', ...N(`ADC en modo continuo (13 ciclos por conversión) con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler ${ps}. ¿Muestras por segundo?`, sps, 'muestras/s', `${fHz(fa)} / 13 = ${fmt(sps, 0)} muestras por segundo. ${full}`, sps * 0.01) };
  }, 'av_adc');

  Gen.add('av_mask', () => {
    const r = ri(0, 255), a = ri(0, 7); let b = ri(0, 7); if (b === a) b = (a + 3) & 7;
    const reg = pick(['PORTB', 'PORTD', 'DDRC', 'TIMSK1', 'ADCSRA']), m = 1 << a, m1 = 1 << ((a + 1) & 7), op = pick(['or', 'and', 'xor', 'or2']);
    let expr, res, wrong, why;
    if (op === 'or') { expr = `${reg} |= (1 << ${a});`; res = r | m; wrong = [m, r | m1, r & ~m & 255, r ^ m]; why = `La máscara es ${b8(m)}: OR pone a 1 el bit ${a} y respeta el resto.`; }
    else if (op === 'and') { expr = `${reg} &= ~(1 << ${a});`; res = r & ~m & 255; wrong = [r & m, ~m & 255, r | m, r & ~m1 & 255]; why = `~(1 << ${a}) = ${b8(~m & 255)}: AND pone a 0 solo el bit ${a}.`; }
    else if (op === 'xor') { expr = `${reg} ^= (1 << ${a});`; res = r ^ m; wrong = [r | m, r & ~m & 255, ~r & 255, r ^ m1]; why = `XOR con ${b8(m)} invierte solo el bit ${a}.`; }
    else { const mm = m | (1 << b); expr = `${reg} |= (1 << ${a}) | (1 << ${b});`; res = r | mm; wrong = [mm, r | m, r & ~mm & 255, r ^ mm]; why = `Máscara = ${b8(mm)} (${hx(mm)}). OR pone a 1 los bits ${a} y ${b}.`; }
    return MC(`${reg} vale ${hx(r)} (${b8(r)}). ¿Cuánto vale después de esta línea?`, hx(res), wrong.map(hx), `${why} Resultado: ${b8(res)} = ${hx(res)}.`, { code: expr, h: 'Escribe el registro y la máscara en binario, uno debajo del otro, y opera columna a columna.' });
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
      return MC(`En una Uno o una Nano, ¿qué puerto y bit es ${p}?`, `P${P}${bit}`, wrong, `D0–D7 = PD0–PD7, D8–D13 = PB0–PB5 y A0–A5 = PC0–PC5. ${p} es P${P}${bit}.`, { h: 'D0–D7 son el puerto D, D8–D13 el puerto B (resta 8) y A0–A5 el puerto C.' });
    }
    const wrong = [`D${bit}`, bit <= 5 ? `A${bit}` : `D${bit + 2}`, bit <= 5 ? `D${bit + 8}` : `D${bit - 2}`, `D${(bit + 9) % 14}`, `A${(bit + 1) % 6}`];
    return MC(`¿Qué pin de Arduino (Uno o Nano) es P${P}${bit}?`, p, wrong, `Puerto D → D0–D7; puerto B → D8–D13 (suma 8); puerto C → A0–A5. P${P}${bit} es ${p}.`, { h: 'Puerto D: mismo número. Puerto B: suma 8. Puerto C: pines A.' });
  }, 'av_pinmap');

  Gen.add('av_sleepLife', () => {
    const cap = pick([220, 1000, 2000, 2500]), ia = pick([3, 5, 8, 10, 15]), ta = pick([5, 10, 20, 50, 100]), T = pick([1, 2, 10, 60, 600]), is = pick([0.5, 1, 4, 5, 20]);
    const q = ia * ta / 1000 + is / 1000 * (T - ta / 1000), avg = q / T, days = cap / avg / 24;
    return { h: 'Saca primero la corriente media ponderando por el tiempo; luego capacidad / media da horas, y entre 24, días.', ...N(`Pila de ${cap} mAh. Cada ${T} s el chip despierta ${ta} ms gastando ${ia} mA, y el resto del tiempo duerme con ${fmt(is)} µA. Ignorando la autodescarga, ¿cuántos días dura?`, days, 'días', `Media = (${ia} mA × ${ta} ms + ${fmt(is)} µA × resto) / ${T} s ≈ ${fI(avg)}. ${cap} mAh / media ≈ ${fmt(cap / avg, 0)} h ≈ ${fmt(days, 0)} días.${days > 3650 ? ' En la práctica, a partir de unos años manda la autodescarga de la pila.' : ''}`, days * 0.03) };
  }, 'av_sleep');

  Gen.add('av_icp', () => {
    const combos = [];
    [1, 8, 64].forEach(n => [50, 60, 100, 440, 1000, 2500, 10000, 38000].forEach(f => { const t = Math.round(FCPU / (n * f)); if (t >= 20 && t <= 65535) combos.push([n, f, t]); }));
    const [n, , t] = pick(combos), f = FCPU / (n * t);
    return { h: 'Periodo = cuentas × (prescaler / 16 MHz). La frecuencia es la inversa del periodo.', ...N(`Timer1 a 16 MHz con prescaler ${n}. Entre dos capturas de flancos de subida, ICR1 ha avanzado ${th(t)} cuentas. ¿Frecuencia de la señal en Hz?`, f, 'Hz', `Cada cuenta dura ${fT(n / FCPU)}. Periodo = ${th(t)} × ${fT(n / FCPU)} = ${fT(t * n / FCPU)}, así que f = ${fHz(f)}.`, f * 0.01) };
  }, 'av_icp');

  Gen.add('av_twbr', () => {
    const [fc, scl] = pick([[16e6, 100e3], [16e6, 400e3], [16e6, 50e3], [16e6, 200e3], [8e6, 100e3], [8e6, 50e3], [20e6, 100e3]]);
    const tw = (fc / scl - 16) / 2;
    return { h: 'Despeja de f_SCL = F_CPU / (16 + 2 · TWBR): primero F_CPU / f_SCL, resta 16 y divide entre 2.', ...N(`TWI con F_CPU = ${fmt(fc / 1e6)} MHz y prescaler 1 (TWPS = 0). ¿Qué TWBR da un SCL de ${fmt(scl / 1000)} kHz?`, tw, '', `f_SCL = F_CPU / (16 + 2 · TWBR) → TWBR = (${th(fc)} / ${th(scl)} − 16) / 2 = ${fmt(tw)}.`, 0.5) };
  }, 'av_i2c');

  Gen.add('av_eeLife', () => {
    const m = pick([1, 2, 5, 10, 30, 60]), cells = pick([1, 1, 4, 16, 100]);
    const years = 100000 * m * cells / (60 * 24 * 365);
    return { h: 'Cada celda recibe una escritura cada (intervalo × número de celdas). Multiplica por 100 000 y pasa los minutos a años.', ...N(`Guardas un dato en la EEPROM cada ${m} min, repartiendo las escrituras por igual entre ${cells} ${cells === 1 ? 'celda' : 'celdas'}. Si cada celda aguanta 100 000 escrituras, ¿cuántos años dura?`, years, 'años', `Cada celda recibe una escritura cada ${m * cells} min. 100 000 × ${m * cells} min = ${th(100000 * m * cells)} min ≈ ${fmt(years, 2)} años. Repartir el desgaste (wear leveling) multiplica la vida.`, Math.max(0.01, years * 0.03)) };
  }, 'av_eeprom');

  Gen.add('av_cycles', () => {
    const c = pick(['ns', 'loop', 'sbi', 'us']);
    if (c === 'ns') { const f = pick([1, 4, 8, 16, 20]); return { h: 'Un ciclo dura 1 / f. Con f en MHz, 1000 / f da nanosegundos.', ...N(`A ${f} MHz, ¿cuántos nanosegundos dura un ciclo de reloj?`, 1000 / f, 'ns', `1 / ${f} MHz = ${fmt(1000 / f, 2)} ns.`, 0.5) }; }
    if (c === 'loop') { const n = ri(10, 250); return { h: 'Cuenta cada instrucción por las veces que se ejecuta: el último brne no salta y cuesta 1 ciclo.', ...N(`Bucle en ensamblador: ldi r24, ${n} (1 ciclo); luego dec r24 (1 ciclo) y brne (2 ciclos si salta, 1 si no) hasta llegar a 0. ¿Cuántos ciclos en total?`, 3 * n, 'ciclos', `1 (ldi) + ${n} × 1 (dec) + ${n - 1} × 2 (brne salta) + 1 (brne no salta) = ${3 * n}.`, 0.5) }; }
    if (c === 'sbi') { const f = pick([8, 16, 20]); return { h: 'Un periodo completo necesita dos conmutaciones: suma los ciclos de las dos.', ...N(`Bucle infinito “sbi PINB, 5” (2 ciclos) + “rjmp” (2 ciclos) a ${f} MHz. ¿Frecuencia de la onda en D13, en MHz?`, f / 8, 'MHz', `Cada conmutación cada 4 ciclos; un periodo son dos conmutaciones, 8 ciclos: ${f} / 8 = ${fmt(f / 8)} MHz.`, 0.01) }; }
    const k = pick([1000, 4000, 16000, 50000]), f = pick([8, 16]);
    return { h: 'Ciclos divididos entre MHz dan microsegundos.', ...N(`Una rutina tarda ${th(k)} ciclos a ${f} MHz. ¿Cuántos µs son?`, k / f, 'µs', `${th(k)} / ${f} = ${fmt(k / f, 2)} µs.`, Math.max(0.05, k / f * 0.01)) };
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
      calc: p => { const pc = p.mode === 1, top = Math.max(1, p.top), ocr = Math.min(p.ocr, top); const f = pc ? FCPU / (2 * p.N * top) : FCPU / (p.N * (top + 1)); const bits = Math.log2(top + 1); return { f, D: pc ? ocr / top : (ocr + 1) / (top + 1), bits, s50: Math.abs(f - 50) < 0.2 && bits >= 15 ? 1 : 0 }; },
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
      calc: p => { const d = p.u2x ? 8 : 16, ubrr = Math.max(0, Math.round(FCPU / (d * p.baud) - 1)), real = FCPU / (d * (ubrr + 1)), err = (real / p.baud - 1) * 100; return { ubrr, real, err, errAbs: Math.abs(err), bit: 1 / p.baud, frame: 10 / p.baud, u115: p.baud === 115200 && p.u2x && Math.abs(err) < 2.5 ? 1 : 0 }; },
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

  /* ===================== VISUALIZACIONES PARA TOCAR LO QUE SE EXPLICA ===================== */
  // Una fila de 8 (o n) casillas de bits, del más significativo al menos.
  const bitRow = (x, y, v, o = {}) => { const n = o.n || 8, w = o.w || 22; return Array.from({ length: n }, (_, i) => {
    const b = n - 1 - i, on = (v >> b) & 1, hl = o.hl != null && ((o.hl >> b) & 1), col = o.colf ? o.colf(b) : (o.col || 'var(--ice)');
    return `<rect x="${x + i * (w + 3)}" y="${y}" width="${w}" height="20" rx="4" fill="${on ? col : 'none'}" fill-opacity="${on ? 0.42 : 0}" stroke="${hl ? 'var(--led)' : 'var(--line)'}" stroke-width="${hl ? 2.6 : 1.4}"/><text x="${x + i * (w + 3) + w / 2}" y="${y + 14.5}" text-anchor="middle" class="vizlab">${on}</text>`;
  }).join(''); };
  const bitHead = (x, y, n = 8, w = 22, hlBit = -1) => Array.from({ length: n }, (_, i) => `<text x="${x + i * (w + 3) + w / 2}" y="${y}" text-anchor="middle" class="vizsm"${n - 1 - i === hlBit ? ' style="fill:var(--led)"' : ''}>${n - 1 - i}</text>`).join('');
  const fDur = s => s >= 86400 ? num(s / 86400, 1) + ' días' : s >= 3600 ? num(s / 3600, 1) + ' h' : s >= 60 ? num(s / 60, 1) + ' min' : s >= 1 ? num(s, 1) + ' s' : num(s * 1000, 1) + ' ms';
  const CLKS = [['RC de fábrica', 0.1, '±10 %'], ['RC calibrado', 0.01, '±1 %'], ['Resonador', 0.005, '±0,5 %'], ['Cristal', 20e-6, '±20 ppm'], ['RTC (TCXO)', 2e-6, '±2 ppm']];
  const SPANS = [['una hora', 3600], ['un día', 86400], ['un mes', 2592000]];
  const PALT = { 1: ['ICP1', 'OC1A', 'SS · OC1B', 'MOSI · OC2A', 'MISO', 'SCK · LED de la placa', 'XTAL1 (cristal)', 'XTAL2 (cristal)'], 2: ['ADC0', 'ADC1', 'ADC2', 'ADC3', 'ADC4 · SDA', 'ADC5 · SCL', 'RESET', 'no existe'], 0: ['RXD', 'TXD', 'INT0', 'INT1 · OC2B', 'XCK · T0', 'OC0B · T1', 'OC0A · AIN0', 'AIN1'] };
  const PNAME = ['D', 'B', 'C'];
  const pinCode = (port, bit) => port === 0 ? bit : port === 1 ? (bit <= 5 ? bit + 8 : -1) : (bit <= 5 ? 100 + bit : -1);
  const DIP28 = [null, 'PC6 · RESET', 'PD0 · RXD · D0', 'PD1 · TXD · D1', 'PD2 · INT0 · D2', 'PD3 · INT1 · D3', 'PD4 · D4', 'VCC', 'GND', 'PB6 · XTAL1', 'PB7 · XTAL2', 'PD5 · OC0B · D5', 'PD6 · OC0A · AIN0 · D6', 'PD7 · AIN1 · D7', 'PB0 · ICP1 · D8', 'PB1 · OC1A · D9', 'PB2 · SS · OC1B · D10', 'PB3 · MOSI · OC2A · D11', 'PB4 · MISO · D12', 'PB5 · SCK · D13', 'AVCC', 'AREF', 'GND', 'PC0 · ADC0 · A0', 'PC1 · ADC1 · A1', 'PC2 · ADC2 · A2', 'PC3 · ADC3 · A3', 'PC4 · ADC4 · SDA · A4', 'PC5 · ADC5 · SCL · A5'];
  const DIP8 = [null, 'PB5 · RESET', 'PB3 · ADC3 · XTAL1', 'PB4 · ADC2 · XTAL2', 'GND', 'PB0 · MOSI · SDA · OC0A', 'PB1 · MISO · OC0B', 'PB2 · SCK · SCL · ADC1 · INT0', 'VCC'];
  const fuseClk = (cksel, div) => { const d = div ? 1 : 8; if (cksel === 2) return [8 / d, 'RC interno de 8 MHz', 0]; if (cksel === 3) return [0.128 / d, 'RC interno de 128 kHz', 0]; if (cksel === 0) return [16 / d, 'reloj externo en XTAL1 (aquí, 16 MHz)', 1]; if (cksel === 4) return [0.032768 / d, 'cristal de baja frecuencia (32 768 Hz)', 1]; return [16 / d, cksel >= 8 ? 'cristal de bajo consumo (aquí, 16 MHz)' : 'cristal de oscilación completa (aquí, 16 MHz)', 1]; };
  const SMODES = ['Despierto', 'Idle', 'ADC Noise Reduction', 'Power-save', 'Power-down'];
  const SBLK = [['CPU', [1, 0, 0, 0, 0]], ['Timer0, Timer1, USART, SPI', [1, 1, 0, 0, 0]], ['ADC', [1, 1, 1, 0, 0]], ['Timer2 con cristal de 32 kHz', [1, 1, 1, 1, 0]], ['Watchdog (si lo activas)', [1, 1, 1, 1, 1]], ['INT0/INT1 por nivel y PCINT', [1, 1, 1, 1, 1]]];
  const WAKES = [['INT0/INT1 por flanco', [1, 0, 0]], ['INT0/INT1 por nivel bajo', [1, 1, 1]], ['PCINT (cambio de pata)', [1, 1, 1]], ['Watchdog (interrupción)', [1, 1, 1]], ['Timer2 asíncrono', [1, 1, 0]], ['USART: byte recibido', [1, 0, 0]], ['Timer1: comparación', [1, 0, 0]]];
  const COSTS = [
    [[0, '1 instrucción'], [0.3, 'mul: 2 ciclos'], [2, 'rutina: decenas de ciclos']],
    [[0.3, '2 instrucciones'], [1, 'unas pocas instrucciones'], [3, 'rutina: cientos de ciclos']],
    [[0.6, '4 instrucciones'], [2, 'rutina: decenas de ciclos'], [3, 'rutina: cientos de ciclos']],
    [[2.6, 'rutina: del orden de cien'], [2.6, 'rutina: del orden de cien'], [3, 'rutina: cientos de ciclos']]];
  const LEAKS = [['Núcleo dormido', 0.1, null], ['ADC encendido (ADEN = 1)', 200, 'adc'], ['BOD activo', 20, 'bod'], ['Watchdog', 4, 'wdt'], ['Entradas flotantes (varía mucho)', 50, 'flot']];

  Object.assign(Widgets.VIZ, {
    // La ALU suma o resta dos registros y SREG enciende sus banderas.
    av_alu: {
      calc: p => { const r = p.op ? p.x - p.k : p.x + p.k, res = ((r % 256) + 256) % 256; return { res, C: p.op ? (p.x < p.k ? 1 : 0) : (r > 255 ? 1 : 0), Z: res === 0 ? 1 : 0, N: res >> 7 }; },
      svg: (p, o) => {
        const fl = ['I', 'T', 'H', 'S', 'V', 'N', 'Z', 'C'];
        const flags = fl.map((f, i) => { const on = f === 'C' ? o.C : f === 'Z' ? o.Z : f === 'N' ? o.N : 0; return `<rect x="${58 + i * 28}" y="150" width="24" height="20" rx="4" fill="${on ? 'var(--led)' : 'none'}" fill-opacity="${on ? 0.5 : 0}" stroke="${on ? 'var(--led)' : 'var(--line)'}" stroke-width="1.6"/><text x="${70 + i * 28}" y="164" text-anchor="middle" class="vizlab">${f}</text>`; }).join('');
        const r = p.op ? p.x - p.k : p.x + p.k;
        return `<svg viewBox="0 0 300 178" class="viz">
          <text x="6" y="24" class="vizsm">r24</text>${bitRow(58, 10, p.x)}<text x="296" y="24" text-anchor="end" class="vizlab">${p.x}</text>
          <text x="6" y="52" class="vizsm">r25</text>${bitRow(58, 38, p.k)}<text x="296" y="52" text-anchor="end" class="vizlab">${p.k}</text>
          <path d="M112 64h76l-11 20h-54z" fill="var(--ice)" fill-opacity=".25" stroke="currentColor" stroke-width="1.6"/><text x="150" y="79" text-anchor="middle" class="vizsm">ALU: ${p.op ? 'sub' : 'add'}</text>
          <text x="6" y="104" class="vizsm">r24</text>${bitRow(58, 90, o.res, { col: 'var(--ok)' })}<text x="296" y="104" text-anchor="end" class="vizlab">${o.res}</text>
          <text x="58" y="134" class="vizsm">${p.x} ${p.op ? '−' : '+'} ${p.k} = ${r}${o.C ? (p.op ? ': no cabe, pide prestado (C)' : ': no cabe en 8 bits (C)') : ''}</text>
          <text x="6" y="164" class="vizsm">SREG</text>${flags}</svg>`;
      }
    },
    // Grado de velocidad: frecuencia máxima según la tensión de alimentación.
    av_speed: {
      calc: p => { const V = p.V, fmax = V < 1.8 ? 0 : V <= 2.7 ? 4 + (V - 1.8) * 6 / 0.9 : V <= 4.5 ? 10 + (V - 2.7) * 10 / 1.8 : 20; const ok = p.f <= fmax + 1e-9 ? 1 : 0; return { fmax, ok, tns: 1000 / p.f, m16: p.f === 16 && ok && V < 4 ? 1 : 0 }; },
      svg: (p, o) => {
        const X = v => 40 + (v - 1.8) / 3.7 * 245, Y = f => 140 - f / 20 * 110, col = o.ok ? 'var(--ok)' : 'var(--err)';
        return `<svg viewBox="0 0 300 188" class="viz">
          <path d="M${X(1.8)} ${Y(0)}V${Y(4)}L${X(2.7)} ${Y(10)}L${X(4.5)} ${Y(20)}H${X(5.5)}V${Y(0)}Z" fill="var(--ok)" opacity=".18"/>
          <path d="M${X(1.8)} ${Y(4)}L${X(2.7)} ${Y(10)}L${X(4.5)} ${Y(20)}H${X(5.5)}" fill="none" stroke="var(--ok)" stroke-width="2"/>
          <path d="M40 28V140H286" stroke="var(--muted)" fill="none"/>
          ${[1.8, 2.7, 3.3, 4.5, 5.5].map(v => `<text x="${X(v).toFixed(1)}" y="154" text-anchor="middle" class="vizsm">${num(v, 1)}</text>`).join('')}
          ${[4, 10, 16, 20].map(f => `<text x="35" y="${(Y(f) + 4).toFixed(1)}" text-anchor="end" class="vizsm">${f}</text>`).join('')}
          <circle cx="${X(p.V).toFixed(1)}" cy="${Y(p.f).toFixed(1)}" r="6" fill="${col}"/>
          <text x="40" y="18" class="vizlab" style="fill:${col}">${p.f} MHz a ${num(p.V, 1)} V: ${o.ok ? 'dentro de especificación' : 'fuera de especificación'}</text>
          <text x="286" y="168" text-anchor="end" class="vizsm">VCC en voltios · vertical: MHz</text>
          <text x="40" y="184" class="vizsm">Máximo a ${num(p.V, 1)} V: ${num(o.fmax, 1)} MHz · 1 ciclo = ${num(o.tns, 1)} ns</text></svg>`;
      }
    },
    // Cuánto se desvía cada fuente de reloj en una hora, un día o un mes.
    av_clk: {
      calc: p => { const e = CLKS[p.src][1] * SPANS[p.span][1]; return { e, okMes: p.span === 2 && e < 60 ? 1 : 0 }; },
      svg: (p, o) => {
        const s = SPANS[p.span][1], lx = v => 136 + 152 * Math.max(0, Math.min(1, (Math.log10(Math.max(v, 1e-2)) + 2) / 8));
        const rows = CLKS.map(([n, e, t], i) => { const y = 34 + i * 25, sel = i === p.src, v = e * s; return `<text x="6" y="${y + 4}" class="${sel ? 'vizlab' : 'vizsm'}">${n} ${t}</text><rect x="136" y="${y - 7}" width="${(lx(v) - 136).toFixed(1)}" height="12" rx="3" fill="${sel ? 'var(--led)' : 'var(--ice)'}" opacity="${sel ? 1 : 0.45}"/>`; }).join('');
        const marks = [[1, '1 s'], [60, '1 min'], [3600, '1 h'], [86400, '1 día']].map(([v, l]) => `<path d="M${lx(v).toFixed(1)} 26V152" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${lx(v).toFixed(1)}" y="164" text-anchor="middle" class="vizsm">${l}</text>`).join('');
        return `<svg viewBox="0 0 300 186" class="viz"><text x="6" y="16" class="vizlab">Error acumulado en ${SPANS[p.span][0]}</text>${marks}${rows}
          <text x="6" y="182" class="vizlab" style="fill:${o.e < 60 ? 'var(--ok)' : 'var(--err)'}">${CLKS[p.src][0]}: ${fDur(o.e)} de error en ${SPANS[p.span][0]}</text></svg>`;
      }
    },
    // F_CPU frente al reloj real: delay(1000) y los baudios salen escalados.
    av_fcpu: {
      calc: p => ({ t: p.fd / p.fr, baud: 9600 * p.fr / p.fd }),
      svg: (p, o) => {
        const X = t => 20 + 260 * (Math.log2(t) + 4) / 8, ok = Math.abs(o.t - 1) < 1e-9;
        return `<svg viewBox="0 0 300 176" class="viz">
          <text x="20" y="20" class="vizlab">F_CPU dice ${p.fd} MHz · el chip va a ${p.fr} MHz</text>
          <path d="M20 70H280" stroke="var(--muted)"/>${[[1 / 16, '1/16 s'], [0.25, '¼ s'], [1, '1 s'], [4, '4 s'], [16, '16 s']].map(([t, l]) => `<path d="M${X(t).toFixed(1)} 64v12" stroke="var(--muted)"/><text x="${X(t).toFixed(1)}" y="92" text-anchor="middle" class="vizsm">${l}</text>`).join('')}
          <path d="M${X(1).toFixed(1)} 40V64" stroke="var(--ok)" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(1).toFixed(1)}" y="36" text-anchor="middle" class="vizsm" style="fill:var(--ok)">esperado</text>
          <circle cx="${X(o.t).toFixed(1)}" cy="70" r="7" fill="${ok ? 'var(--ok)' : 'var(--err)'}"/>
          <text x="20" y="122" class="vizlab">delay(1000) dura ${o.t >= 1 ? num(o.t, 2) + ' s' : num(o.t * 1000, 1) + ' ms'}</text>
          <text x="20" y="144" class="vizlab">Serial.begin(9600) sale a ${th(Math.round(o.baud))} baudios</text>
          <text x="20" y="166" class="vizsm">${ok ? 'F_CPU coincide con el reloj real: todo cuadra' : 'Todos los tiempos salen multiplicados por ' + num(o.t, 3)}</text></svg>`;
      }
    },
    // La SRAM por dentro: globales abajo, montón que sube y pila que baja.
    av_sram: {
      calc: p => { const free = 2048 - p.g - p.h - p.s; return { free, crash: free < 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const X = b => 20 + 260 * Math.max(0, Math.min(2048, b)) / 2048, y = 56, hgt = 34;
        const ov = o.crash ? `<rect x="${X(2048 - p.s).toFixed(1)}" y="${y}" width="${(X(p.g + p.h) - X(2048 - p.s)).toFixed(1)}" height="${hgt}" fill="var(--err)" opacity=".85"/>` : '';
        return `<svg viewBox="0 0 300 170" class="viz"><text x="20" y="20" class="vizlab">SRAM: 2048 bytes</text>
          <rect x="20" y="${y}" width="260" height="${hgt}" rx="4" fill="none" stroke="var(--line)" stroke-width="1.5"/>
          <rect x="20" y="${y}" width="${(X(p.g) - 20).toFixed(1)}" height="${hgt}" fill="var(--ice)" opacity=".75"/>
          <rect x="${X(p.g).toFixed(1)}" y="${y}" width="${(X(p.g + p.h) - X(p.g)).toFixed(1)}" height="${hgt}" fill="var(--led)" opacity=".7"/>
          <rect x="${X(2048 - p.s).toFixed(1)}" y="${y}" width="${(280 - X(2048 - p.s)).toFixed(1)}" height="${hgt}" fill="var(--ok)" opacity=".7"/>${ov}
          <text x="20" y="${y - 6}" class="vizsm">0x0100</text><text x="280" y="${y - 6}" text-anchor="end" class="vizsm">0x08FF</text>
          <text x="20" y="${y + hgt + 16}" class="vizsm" style="fill:var(--ice)">■ globales</text><text x="98" y="${y + hgt + 16}" class="vizsm" style="fill:var(--led)">■ montón →</text><text x="280" y="${y + hgt + 16}" text-anchor="end" class="vizsm" style="fill:var(--ok)">← pila ■</text>
          <text x="20" y="140" class="vizlab" style="fill:${o.crash ? 'var(--err)' : 'currentColor'}">${o.crash ? '¡Choque! La pila pisa el montón y las variables' : 'Libre entre montón y pila: ' + o.free + ' bytes'}</text>
          <text x="20" y="160" class="vizsm">Nadie avisa: no hay protección de memoria</text></svg>`;
      }
    },
    // Lo que dice avr-size: Flash = text + data; SRAM estática = data + bss.
    av_size: {
      calc: p => ({ flash: p.text + p.data, sram: p.data + p.bss, free: 2048 - p.data - p.bss }),
      svg: (p, o) => {
        const F = 32256, bar = (y, segs, tot, lab) => { let x = 20, s = ''; segs.forEach(([v, c]) => { const w = 260 * Math.min(v, tot) / tot; s += `<rect x="${x.toFixed(1)}" y="${y}" width="${Math.max(0, Math.min(w, 280 - x)).toFixed(1)}" height="22" fill="${c}" opacity=".75"/>`; x += w; }); return `<text x="20" y="${y - 6}" class="vizsm">${lab}</text><rect x="20" y="${y}" width="260" height="22" rx="3" fill="none" stroke="var(--line)"/>${s}`; };
        return `<svg viewBox="0 0 300 176" class="viz">
          ${bar(28, [[p.text, 'var(--ice)'], [p.data, 'var(--led)']], F, `Flash: ${th(o.flash)} de ${th(F)} bytes (sin el bootloader)`)}
          ${bar(86, [[p.data, 'var(--led)'], [p.bss, 'var(--ok)']], 2048, `SRAM estática: ${o.sram} de 2048 bytes`)}
          <text x="20" y="128" class="vizsm" style="fill:var(--ice)">■ text</text><text x="70" y="128" class="vizsm" style="fill:var(--led)">■ data (en las dos)</text><text x="190" y="128" class="vizsm" style="fill:var(--ok)">■ bss</text>
          <text x="20" y="152" class="vizlab" style="fill:${o.free < 300 ? 'var(--err)' : 'currentColor'}">Para pila y montón quedan ${o.free} bytes</text>
          <text x="20" y="170" class="vizsm">${o.free < 300 ? 'Muy justo: riesgo de cuelgues' : 'Margen razonable'}</text></svg>`;
      }
    },
    // De puerto y bit al pin de Arduino, con sus funciones alternativas.
    av_pinmap: {
      calc: p => { const code = pinCode(p.port, p.bit); return { code, none: code < 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const rows = [1, 2, 0].map((port, r) => { const y = 30 + r * 30; return `<text x="6" y="${y + 15}" class="vizlab">PORT${PNAME[port]}</text>` + Array.from({ length: 8 }, (_, i) => { const b = 7 - i, sel = port === p.port && b === p.bit, ex = pinCode(port, b) >= 0; return `<rect x="${70 + i * 27}" y="${y}" width="24" height="22" rx="4" fill="${sel ? 'var(--led)' : ex ? 'var(--ice)' : 'none'}" fill-opacity="${sel ? 0.7 : ex ? 0.18 : 0}" stroke="${sel ? 'var(--led)' : 'var(--line)'}" stroke-width="${sel ? 2.4 : 1.2}"/><text x="${82 + i * 27}" y="${y + 15}" text-anchor="middle" class="vizsm">${b}</text>`; }).join(''); }).join('');
        const name = o.code < 0 ? 'sin pin de Arduino' : o.code >= 100 ? 'A' + (o.code - 100) : 'D' + o.code;
        return `<svg viewBox="0 0 300 172" class="viz"><text x="70" y="20" class="vizsm">bit 7 … bit 0 · azul: tiene pin en la Uno</text>${rows}
          <text x="6" y="146" class="vizbig" style="font-size:19px">P${PNAME[p.port]}${p.bit} = ${name}</text>
          <text x="6" y="166" class="vizsm">Otras funciones: ${PALT[p.port][p.bit]}</text></svg>`;
      }
    },
    // Encapsulado DIP: numeración de patas y su nombre.
    av_dip: {
      calc: p => ({ p: p.pata }),
      svg: (p) => {
        const n = p.n, half = n / 2, names = n === 28 ? DIP28 : DIP8, sp = n === 28 ? 18 : 48, w = half * sp, x0 = 150 - w / 2, yT = 52, yB = 108;
        let s = `<rect x="${x0}" y="${yT}" width="${w}" height="${yB - yT}" rx="5" fill="#2B3240" stroke="var(--muted)" stroke-width="1"/><path d="M${x0} ${(yT + yB) / 2 - 9}a9 9 0 0 1 0 18" fill="var(--line)"/>`;
        for (let k = 1; k <= n; k++) {
          const bottom = k <= half, i = bottom ? k - 1 : n - k, cx = x0 + sp / 2 + i * sp, sel = k === p.pata;
          s += `<rect x="${cx - 4}" y="${bottom ? yB : yT - 12}" width="8" height="12" fill="${sel ? 'var(--led)' : 'var(--muted)'}"/>`;
          s += `<text x="${cx}" y="${bottom ? yB + 24 : yT - 16}" text-anchor="middle" class="vizsm" style="${sel ? 'fill:var(--led);font-weight:700' : ''}">${k}</text>`;
        }
        return `<svg viewBox="0 0 300 176" class="viz"><text x="150" y="18" text-anchor="middle" class="vizsm">${n === 28 ? 'ATmega328P' : 'ATtiny85'} visto desde arriba, muesca a la izquierda</text>${s}
          <text x="150" y="156" text-anchor="middle" class="vizbig" style="font-size:16px">Pata ${p.pata}: ${names[p.pata]}</text></svg>`;
      }
    },
    // Una pata por dentro: DDR, PORT y PIN, la pull-up, el driver de salida y un pulsador a masa.
    av_pin: {
      calc: p => {
        const st = p.ddr ? (p.port ? 3 : 2) : (p.port ? 1 : 0), short = st === 3 && p.btn ? 1 : 0;
        const v = short ? -2 : st === 3 ? 5 : st === 2 ? 0 : st === 1 ? (p.btn ? 0 : 5) : (p.btn ? 0 : -1);
        const pr = v === -1 || v === -2 ? -1 : v > 2.5 ? 1 : 0;
        return { st, short, v, pr, puPress: st === 1 && p.btn ? 1 : 0, out1: st === 3 && !p.btn ? 1 : 0 };
      },
      svg: (p, o) => {
        const lab = ['Entrada flotante: lee al azar', 'Entrada con pull-up', 'Salida a 0 (0 V)', 'Salida a 1 (5 V)'][o.st];
        const reg = (y, n, v, act) => `<text x="8" y="${y + 15}" class="vizsm">${n}</text><rect x="52" y="${y}" width="24" height="22" rx="4" fill="${v === 1 ? 'var(--ice)' : 'none'}" fill-opacity=".45" stroke="${act ? 'var(--led)' : 'var(--line)'}" stroke-width="1.6"/><text x="64" y="${y + 15}" text-anchor="middle" class="vizlab">${v < 0 ? '?' : v}</text>`;
        const pu = o.st === 1, drv = p.ddr === 1, pinX = 196, pinY = 86;
        const col = o.short ? 'var(--err)' : 'currentColor';
        return `<svg viewBox="0 0 300 186" class="viz">
          ${reg(30, 'DDRx', p.ddr, 1)}${reg(62, 'PORTx', p.port, 1)}${reg(94, 'PINx', o.pr, 0)}
          <path d="M150 22V38" stroke="var(--muted)"/><text x="150" y="18" text-anchor="middle" class="vizsm">5 V</text>
          <path d="M150 38l6 4-12 6 12 6-12 6 12 6-6 4V${pinY}" fill="none" stroke="${pu ? 'var(--ok)' : 'var(--line)'}" stroke-width="2"/>
          <text x="160" y="52" class="vizsm" style="fill:${pu ? 'var(--ok)' : 'var(--muted)'}">pull-up</text>
          <path d="M98 ${pinY - 14}V${pinY + 14}L124 ${pinY}Z" fill="${drv ? 'var(--ice)' : 'none'}" fill-opacity=".4" stroke="${drv ? 'currentColor' : 'var(--line)'}" stroke-width="1.8"/>
          <path d="M124 ${pinY}H${pinX}" stroke="${col}" stroke-width="2.2"/><path d="M80 ${pinY}H98" stroke="${drv ? 'currentColor' : 'var(--line)'}" stroke-width="2"/>
          <text x="100" y="${pinY + 30}" class="vizsm">salida</text>
          <rect x="${pinX - 6}" y="${pinY - 6}" width="12" height="12" fill="var(--led)"/>
          <path d="M${pinX + 6} ${pinY}H246V100" stroke="${col}" stroke-width="2"/>
          <path d="M246 ${p.btn ? 120 : 112}l${p.btn ? 0 : 14} ${p.btn ? 0 : -10}" stroke="currentColor" stroke-width="2.4"/><path d="M246 100v6M246 124v18M238 142h16M241 147h10" stroke="currentColor" stroke-width="2"/>
          <text x="256" y="128" class="vizsm">${p.btn ? 'pulsado' : 'suelto'}</text>
          <text x="${pinX}" y="${pinY - 12}" text-anchor="middle" class="vizlab" style="fill:${col}">${o.v === -1 ? '¿? V' : o.v === -2 ? '¡corto!' : o.v + ' V'}</text>
          <text x="8" y="160" class="vizlab" style="fill:${o.short ? 'var(--err)' : 'currentColor'}">${o.short ? '¡Cortocircuito! Salida a 1 contra masa' : lab}</text>
          <text x="8" y="178" class="vizsm">${o.short ? 'Pueden pasar más de 40 mA: la pata sufre' : o.pr < 0 ? 'PINx no tiene un valor fiable' : 'PINx lee ' + o.pr}</text></svg>`;
      }
    },
    // Zonas de lectura de una entrada digital: 0 seguro, sin garantía y 1 seguro.
    av_thresh: {
      calc: p => { const vil = 0.3 * p.vcc, vih = 0.6 * p.vcc, z = p.vin > p.vcc + 0.5 ? 3 : p.vin < vil ? 0 : p.vin > vih ? 1 : 2; return { z, vil, vih, lowOne: z === 1 && p.vin < 2.1 ? 1 : 0 }; },
      svg: (p, o) => {
        const Y = v => 160 - v / 5.5 * 140, yv = Y(p.vcc);
        const zl = ['0 seguro', '1 seguro', 'sin garantía', '¡por encima de VCC!'][o.z], zc = ['var(--ice)', 'var(--ok)', 'var(--led)', 'var(--err)'][o.z];
        return `<svg viewBox="0 0 300 176" class="viz">
          <rect x="60" y="${Y(o.vil).toFixed(1)}" width="40" height="${(160 - Y(o.vil)).toFixed(1)}" fill="var(--ice)" opacity=".35"/>
          <rect x="60" y="${Y(o.vih).toFixed(1)}" width="40" height="${(Y(o.vil) - Y(o.vih)).toFixed(1)}" fill="var(--led)" opacity=".35"/>
          <rect x="60" y="${yv.toFixed(1)}" width="40" height="${(Y(o.vih) - yv).toFixed(1)}" fill="var(--ok)" opacity=".35"/>
          <rect x="60" y="20" width="40" height="140" fill="none" stroke="var(--line)"/>
          <text x="54" y="${(Y(o.vil) + 4).toFixed(1)}" text-anchor="end" class="vizsm">${num(o.vil, 2)} V</text><text x="54" y="${(Y(o.vih) + 4).toFixed(1)}" text-anchor="end" class="vizsm">${num(o.vih, 2)} V</text><text x="54" y="${(yv + 4).toFixed(1)}" text-anchor="end" class="vizsm">VCC</text>
          <path d="M52 ${Y(p.vin).toFixed(1)}H112" stroke="${zc}" stroke-width="3"/><circle cx="112" cy="${Y(p.vin).toFixed(1)}" r="5" fill="${zc}"/>
          <text x="126" y="60" class="vizlab">Entrada: ${num(p.vin, 2)} V</text>
          <text x="126" y="84" class="vizlab" style="fill:${zc}">${zl}</text>
          <text x="126" y="112" class="vizsm">0 seguro por debajo de 0,3·VCC</text><text x="126" y="128" class="vizsm">1 seguro por encima de 0,6·VCC</text><text x="126" y="144" class="vizsm">Alimentación: ${num(p.vcc, 1)} V</text></svg>`;
      }
    },
    // Leer–modificar–escribir con una interrupción en medio.
    av_race: {
      calc: p => { const lost = p.modo === 0 && (p.isr === 1 || p.isr === 2) ? 1 : 0; return { lost, val: lost ? 0x20 : 0x21, saved: p.modo !== 0 && (p.isr === 1 || p.isr === 2) ? 1 : 0 }; },
      svg: (p, o) => {
        const ins = p.modo === 0 ? ['in r24,PORTB', 'ori r24,0x20', 'out PORTB,r24'] : p.modo === 1 ? ['cli', 'in r24,PORTB', 'ori r24,0x20', 'out PORTB,r24', 'sei'] : ['sbi PORTB, 5'];
        // Hueco (0..n) donde se ejecuta la ISR, según cuándo llega y si puede entrar
        const want = p.isr, n = ins.length;
        const slot = p.modo === 0 ? want : p.modo === 1 ? (want === 0 ? 0 : want === 3 ? n : n) : (want === 0 ? 0 : 1);
        const W = 262 / (n + 1), xs = k => 20 + k * W;
        let s = '', k2 = 0;
        for (let k = 0; k <= n; k++) {
          if (k === slot) { s += `<rect x="${xs(k2).toFixed(1)}" y="96" width="${(W - 4).toFixed(1)}" height="30" rx="5" fill="var(--led)" opacity=".8"/><text x="${(xs(k2) + W / 2 - 2).toFixed(1)}" y="115" text-anchor="middle" class="vizsm" style="fill:#000">ISR: bit 0</text>`; k2++; }
          if (k < n) { s += `<rect x="${xs(k2).toFixed(1)}" y="46" width="${(W - 4).toFixed(1)}" height="30" rx="5" fill="var(--ice)" opacity=".35" stroke="var(--ice)"/><text x="${(xs(k2) + W / 2 - 2).toFixed(1)}" y="65" text-anchor="middle" class="vizsm" style="font-size:${n > 3 ? 7.5 : 8.5}px">${ins[k]}</text>`; k2++; }
        }
        const late = p.modo !== 0 && (want === 1 || want === 2);
        return `<svg viewBox="0 0 300 186" class="viz"><text x="20" y="22" class="vizlab">main(): PORTB |= 0x20 · la ISR pone el bit 0</text>
          <text x="20" y="40" class="vizsm">main()</text><text x="20" y="92" class="vizsm">interrupción</text>${s}
          <text x="20" y="148" class="vizlab" style="fill:${o.lost ? 'var(--err)' : 'var(--ok)'}">PORTB final = ${hx(o.val)} ${o.lost ? '· ¡se perdió el bit 0!' : '· no se pierde nada'}</text>
          <text x="20" y="168" class="vizsm">${late ? 'La interrupción llegó en medio, pero tuvo que esperar' : o.lost ? 'main() escribió su copia vieja encima' : 'La ISR no cayó entre leer y escribir'}</text></svg>`;
      }
    },
    // Multiplexado: un dígito cada vez, a cámara lenta, con su refresco y su brillo.
    av_mux: {
      anim: true,
      calc: p => { const hz = 1000 / (p.n * p.t); return { hz, duty: 1 / p.n, ok8: p.n === 8 && hz >= 100 ? 1 : 0 }; },
      svg: (p, o, t) => {
        const act = Math.floor(t * 2.5) % p.n, w = Math.min(32, 260 / p.n - 4);
        const dig = Array.from({ length: p.n }, (_, i) => { const x = 20 + i * (w + 4), on = i === act; return `<rect x="${x.toFixed(1)}" y="34" width="${w.toFixed(1)}" height="54" rx="5" fill="#2B3240" stroke="var(--muted)" stroke-width="1"/><text x="${(x + w / 2).toFixed(1)}" y="74" text-anchor="middle" style="font-size:${Math.min(30, w)}px;font-weight:800;fill:${on ? 'var(--led)' : 'var(--muted)'};opacity:${on ? 1 : 0.25}">${(i + 1) % 10}</text>`; }).join('');
        const flick = o.hz < 50;
        return `<svg viewBox="0 0 300 176" class="viz"><text x="20" y="22" class="vizsm">A cámara lenta: solo se enciende un dígito cada vez</text>${dig}
          ${Widgets.H.hbar(20, 116, 260, o.duty, 'var(--led)', 'Tiempo encendido de cada dígito: ' + num(o.duty * 100, 1) + ' %')}
          <text x="20" y="150" class="vizlab" style="fill:${flick ? 'var(--err)' : 'var(--ok)'}">Refresco de cada dígito: ${num(o.hz, 1)} Hz</text>
          <text x="20" y="168" class="vizsm">${flick ? 'Por debajo de unos 50 Hz se nota el parpadeo' : 'El ojo lo ve encendido fijo'}</text></svg>`;
      }
    },
    // Teclado matricial: una fila a 0 y se leen las columnas.
    av_keys: {
      calc: p => ({ r1: p.fila === 1 ? 1 : 0, r3: p.fila === 3 ? 1 : 0 }),
      svg: (p) => {
        const K = [['1', '2', '3', 'A'], ['4', '5', '6', 'B'], ['7', '8', '9', 'C'], ['*', '0', '#', 'D']], pressed = [[1, 2], [3, 0]];
        const isP = (r, c) => pressed.some(([a, b]) => a === r && b === c);
        let s = '';
        for (let r = 0; r < 4; r++) {
          const y = 34 + r * 30, act = r === p.fila;
          s += `<path d="M58 ${y}H214" stroke="${act ? 'var(--ice)' : 'var(--line)'}" stroke-width="${act ? 2.6 : 1.4}"/><text x="8" y="${y + 4}" class="vizsm" style="fill:${act ? 'var(--ice)' : 'var(--muted)'}">F${r} = ${act ? 0 : 1}</text>`;
          for (let c = 0; c < 4; c++) { const x = 80 + c * 40, hit = act && isP(r, c); s += `<rect x="${x - 13}" y="${y - 11}" width="26" height="22" rx="5" fill="${hit ? 'var(--led)' : 'none'}" fill-opacity=".7" stroke="var(--line)"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="vizlab">${hit ? K[r][c] : '·'}</text>`; }
        }
        const reads = [0, 1, 2, 3].map(c => (isP(p.fila, c) ? 0 : 1));
        s += [0, 1, 2, 3].map(c => `<path d="M${80 + c * 40} 22V146" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${80 + c * 40}" y="160" text-anchor="middle" class="vizlab" style="fill:${reads[c] ? 'var(--muted)' : 'var(--led)'}">C${c}=${reads[c]}</text>`).join('');
        return `<svg viewBox="0 0 300 180" class="viz"><text x="58" y="14" class="vizsm">Hay dos teclas pulsadas en secreto</text>${s}
          <text x="230" y="70" class="vizsm">columnas:</text><text x="230" y="86" class="vizsm">entradas</text><text x="230" y="102" class="vizsm">con pull-up</text>
          <text x="8" y="176" class="vizsm">${reads.includes(0) ? 'Una columna lee 0: tecla del cruce encontrada' : 'Ninguna columna lee 0 en esta fila'}</text></svg>`;
      }
    },
    // Temporizador en modo normal: prescaler, cuenta y desbordamiento (a cámara lenta).
    av_count: {
      anim: true, restart: true,
      calc: p => { const tick = p.N / FCPU, ovf = Math.pow(2, p.bits) * tick; return { tick, ovf, f: 1 / ovf }; },
      svg: (p, o, t) => {
        const top = Math.pow(2, p.bits), fr = (t / 2.4) % 1, cnt = Math.floor(fr * top), flag = fr < 0.12 && t > 0.3;
        return `<svg viewBox="0 0 300 178" class="viz">
          <rect x="8" y="26" width="58" height="30" rx="5" fill="none" stroke="var(--line)"/><text x="37" y="45" text-anchor="middle" class="vizsm">16 MHz</text>
          <path d="M66 41h18" stroke="currentColor" stroke-width="1.6"/><rect x="84" y="26" width="58" height="30" rx="5" fill="var(--ice)" fill-opacity=".2" stroke="var(--ice)"/><text x="113" y="45" text-anchor="middle" class="vizsm">÷ ${p.N}</text>
          <path d="M142 41h18" stroke="currentColor" stroke-width="1.6"/><rect x="160" y="26" width="80" height="30" rx="5" fill="none" stroke="currentColor"/><text x="200" y="45" text-anchor="middle" class="vizsm">TCNT (${p.bits} bits)</text>
          <rect x="250" y="26" width="42" height="30" rx="5" fill="${flag ? 'var(--led)' : 'none'}" stroke="${flag ? 'var(--led)' : 'var(--line)'}"/><text x="271" y="45" text-anchor="middle" class="vizsm">TOV</text>
          <rect x="8" y="76" width="284" height="20" rx="4" fill="none" stroke="var(--line)"/><rect x="8" y="76" width="${(284 * fr).toFixed(1)}" height="20" rx="4" fill="var(--ice)" opacity=".6"/>
          <text x="8" y="112" class="vizsm">TCNT = ${th(cnt)} de ${th(top - 1)} (a cámara lenta)</text>
          <text x="8" y="140" class="vizlab">1 cuenta = ${fT(o.tick)} · vuelta completa = ${fT(o.ovf)}</text>
          <text x="8" y="162" class="vizsm">Se desborda ${o.f >= 10 ? th(Math.round(o.f)) : num(o.f, 2)} veces por segundo</text></svg>`;
      }
    },
    // Input Capture: el hardware copia TCNT1 en ICR1 en cada flanco de subida.
    av_cap: {
      calc: p => { const cnt = FCPU / (p.N * p.f); const fits = cnt <= 65535 ? 1 : 0; return { cnt, fits, res: 1 / cnt, fits50: p.f === 50 && fits ? 1 : 0 }; },
      svg: (p, o) => {
        const P = 120, x0 = 30; let sq = `M${x0} 50`; for (let k = 0; k < 2; k++) { const a = x0 + k * P; sq += `V22H${a + P / 2}V50H${a + P}`; }
        const h = 40 * Math.min(1, o.cnt / 65536), laps = Math.floor(o.cnt / 65536);
        let saw = `M${x0} 130`; if (o.fits) { for (let k = 0; k < 2; k++) saw += `l${P} ${-h}`; } else { const n = Math.min(40, Math.ceil(o.cnt / 65536)) * 2, wseg = 2 * P / n; for (let k = 0; k < n; k++) saw += `l${wseg.toFixed(2)} -50v50`; }
        const c0 = 1000, c1 = (c0 + Math.round(o.cnt)) % 65536;
        return `<svg viewBox="0 0 300 186" class="viz"><text x="${x0}" y="14" class="vizsm">Señal en ICP1 (${fHz(p.f)})</text>
          <path d="${sq}" fill="none" stroke="var(--led)" stroke-width="2.2"/>
          <path d="M${x0} 130H${x0 + 2 * P}" stroke="var(--muted)"/><path d="${saw}" fill="none" stroke="var(--ice)" stroke-width="2"/>
          ${[0, 1, 2].map(k => `<path d="M${x0 + k * P} 50V134" stroke="var(--line)" stroke-dasharray="3 3"/><circle cx="${x0 + k * P}" cy="${o.fits ? 130 - h * k : 130}" r="4" fill="var(--led)"/>`).join('')}
          <text x="${x0}" y="74" class="vizsm">TCNT1 y las capturas en ICR1</text>
          <text x="8" y="154" class="vizlab">Cuentas por periodo: ${th(Math.round(o.cnt))}</text>
          <text x="8" y="174" class="vizsm" style="fill:${o.fits ? 'var(--ok)' : 'var(--err)'}">${o.fits ? `ICR1: ${c0} → ${c1}; la resta da el periodo` : `El contador da ${laps} vuelta${laps === 1 ? '' : 's'} completa${laps === 1 ? '' : 's'}: la resta sola no basta`}</text></svg>`;
      }
    },
    // Las tres llaves de una interrupción: bandera, habilitación local y bit I.
    av_gate: {
      calc: p => ({ fires: p.flag && p.mask && p.ibit ? 1 : 0, blockMask: p.flag && !p.mask && p.ibit ? 1 : 0 }),
      svg: (p, o) => {
        const sw = (x, on, a, b) => `<circle cx="${x}" cy="80" r="3" fill="currentColor"/><circle cx="${x + 40}" cy="80" r="3" fill="currentColor"/><path d="M${x} 80L${x + 38} ${on ? 80 : 60}" stroke="${on ? 'var(--ok)' : 'var(--err)'}" stroke-width="3" stroke-linecap="round"/><text x="${x + 20}" y="108" text-anchor="middle" class="vizlab">${a}</text><text x="${x + 20}" y="124" text-anchor="middle" class="vizsm">${b} = ${on ? 1 : 0}</text>`;
        return `<svg viewBox="0 0 300 176" class="viz"><text x="8" y="24" class="vizlab">Evento</text><path d="M8 80H24M64 80H96M136 80H168M208 80H236" stroke="currentColor" stroke-width="2"/>
          ${sw(24, p.flag, 'Bandera', 'OCF1A')}${sw(96, p.mask, 'Máscara', 'OCIE1A')}${sw(168, p.ibit, 'Permiso', 'bit I')}
          <circle cx="258" cy="80" r="20" fill="${o.fires ? 'var(--led)' : 'none'}" stroke="currentColor" stroke-width="2"/><text x="258" y="85" text-anchor="middle" class="vizlab">ISR</text>
          <text x="8" y="160" class="vizlab" style="fill:${o.fires ? 'var(--ok)' : 'var(--muted)'}">${o.fires ? '¡Salta la interrupción!' : 'No salta: falta al menos una llave'}</text></svg>`;
      }
    },
    // Una bandera es un solo bit: si llegan varios eventos con las interrupciones desactivadas, se pierden.
    av_flag: {
      calc: p => { let n = 0; for (let t = p.per; t <= 12; t += p.per) if (t > 1 && t <= 1 + p.off + 1e-9) n++; const lost = Math.max(0, n - 1); return { n, lost, ok5: p.off >= 5 && lost === 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const X = t => 16 + t / 10 * 268, a = 1, b = 1 + p.off;
        let ev = '', k = 0, first = null;
        for (let t = p.per; t <= 10 + 1e-9; t += p.per) { const inW = t > a && t <= b + 1e-9; if (inW) { k++; if (first === null) first = t; } ev += `<path d="M${X(t).toFixed(1)} 34V54" stroke="${inW ? (k === 1 ? 'var(--led)' : 'var(--err)') : 'var(--ice)'}" stroke-width="2.4"/>`; }
        const fl = first === null ? '' : `<path d="M${X(first).toFixed(1)} 106V84H${X(Math.min(10, b)).toFixed(1)}V106" fill="none" stroke="var(--led)" stroke-width="2.4"/>`;
        return `<svg viewBox="0 0 300 180" class="viz"><text x="16" y="24" class="vizsm">Eventos (cada ${num(p.per, 2)} ms)</text>${ev}
          <rect x="${X(a).toFixed(1)}" y="60" width="${(X(Math.min(10, b)) - X(a)).toFixed(1)}" height="50" fill="var(--muted)" opacity=".15"/>
          <text x="${X(a).toFixed(1)}" y="74" class="vizsm">interrupciones desactivadas ${num(p.off, 1)} ms</text>
          <path d="M16 106H284" stroke="var(--line)"/>${fl}<text x="16" y="124" class="vizsm">bandera (un solo bit)</text>
          <text x="16" y="150" class="vizlab">Eventos durante el bloqueo: ${o.n} · atendidos: ${Math.min(1, o.n)}</text>
          <text x="16" y="170" class="vizlab" style="fill:${o.lost ? 'var(--err)' : 'var(--ok)'}">${o.lost ? 'Perdidos: ' + o.lost : 'Ninguno perdido'}</text></svg>`;
      }
    },
    // Carga de CPU de una ISR y su pin de traza.
    av_irq: {
      calc: p => { const load = p.f * p.cyc / FCPU; return { load, us: p.cyc / 16, ok100: p.f === 100000 && load < 0.25 ? 1 : 0 }; },
      svg: (p, o) => {
        const per = 26, hw = Math.min(per, per * o.load); let d = 'M18 96';
        for (let k = 0; k < 10; k++) { const x = 18 + k * per; d += `H${(x + 2).toFixed(1)}V66H${(x + 2 + hw).toFixed(1)}V96`; }
        d += 'H282';
        const col = o.load >= 1 ? 'var(--err)' : o.load > 0.5 ? 'var(--led)' : 'var(--ok)';
        return `<svg viewBox="0 0 300 176" class="viz"><text x="18" y="22" class="vizlab">Pin de traza: a 1 mientras corre la ISR</text>
          <text x="18" y="44" class="vizsm">${th(p.f)} interrupciones/s · ${p.cyc} ciclos cada una (${num(o.us, 2)} µs)</text>
          <path d="${d}" fill="none" stroke="var(--led)" stroke-width="2.2"/>
          ${Widgets.H.hbar(18, 132, 264, Math.min(1, o.load), col, 'Carga de CPU: ' + num(Math.min(100, o.load * 100), 1) + ' %')}
          <text x="18" y="164" class="vizsm" style="fill:${col}">${o.load >= 1 ? '¡No da abasto! loop() no avanza y se pierden interrupciones' : 'Lo que queda es para loop()'}</text></svg>`;
      }
    },
    // Lectura rota de una variable de 16 bits que cambia una ISR.
    av_torn: {
      calc: p => { const old = p.cnt, nw = p.cnt + 1, read = p.isr && !p.atom ? ((nw & 0xFF00) | (old & 0xFF)) : old; return { read, broken: read !== old && read !== nw ? 1 : 0, fixed: p.isr && p.atom && (old & 255) === 255 ? 1 : 0 }; },
      svg: (p, o) => {
        const h4 = v => '0x' + v.toString(16).toUpperCase().padStart(4, '0');
        const row = (y, l, v, c) => `<text x="10" y="${y + 15}" class="vizsm">${l}</text><rect x="130" y="${y}" width="56" height="22" rx="4" fill="none" stroke="${c}"/><rect x="190" y="${y}" width="56" height="22" rx="4" fill="none" stroke="${c}"/><text x="158" y="${y + 15}" text-anchor="middle" class="vizlab">${h4(v).slice(2, 4)}</text><text x="218" y="${y + 15}" text-anchor="middle" class="vizlab">${h4(v).slice(4)}</text><text x="292" y="${y + 15}" text-anchor="end" class="vizsm">${v}</text>`;
        const step = p.isr ? (p.atom ? 'cli · lee bajo · lee alto · sei · ISR' : 'lee byte bajo · ISR suma 1 · lee byte alto') : 'lee bajo · lee alto (sin ISR en medio)';
        return `<svg viewBox="0 0 300 176" class="viz"><text x="130" y="18" class="vizsm">alto</text><text x="190" y="18" class="vizsm">bajo</text>
          ${row(24, 'cuenta antes', p.cnt, 'var(--line)')}${row(54, 'cuenta después', p.cnt + 1, 'var(--line)')}${row(88, 'lo que lee loop()', o.read, o.broken ? 'var(--err)' : 'var(--ok)')}
          <text x="10" y="138" class="vizsm">${step}</text>
          <text x="10" y="162" class="vizlab" style="fill:${o.broken ? 'var(--err)' : 'var(--ok)'}">${o.broken ? '¡Lectura rota! Ese valor nunca existió' : 'Lectura correcta'}</text></svg>`;
      }
    },
    // Búfer circular de recepción: lo que llega mientras loop() está ocupado.
    av_ring: {
      calc: p => { const bytes = p.baud / 10 * p.busy / 1000, cap = p.tam - 1, lost = Math.max(0, Math.ceil(bytes - cap - 1e-9)); return { bytes, cap, lost, ok115: p.baud === 115200 && p.busy >= 4 && lost === 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const n = p.tam, cx = 78, cy = 92, R = 58, fill = Math.min(o.cap, Math.ceil(o.bytes - 1e-9));
        let s = '';
        for (let i = 0; i < n; i++) { const a0 = i / n * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2, r1 = R - 16; const P = (a, r) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`; s += `<path d="M${P(a0, r1)}L${P(a0, R)}A${R} ${R} 0 0 1 ${P(a1, R)}L${P(a1, r1)}A${r1} ${r1} 0 0 0 ${P(a0, r1)}Z" fill="${i < fill ? 'var(--ice)' : 'none'}" fill-opacity=".6" stroke="var(--line)" stroke-width="${n > 32 ? 0.6 : 1}"/>`; }
        const ah = fill / n * 2 * Math.PI - Math.PI / 2;
        return `<svg viewBox="0 0 300 180" class="viz">${s}
          <path d="M${cx} ${cy}L${(cx + Math.cos(-Math.PI / 2) * (R - 20)).toFixed(1)} ${(cy + Math.sin(-Math.PI / 2) * (R - 20)).toFixed(1)}" stroke="var(--ok)" stroke-width="3"/><path d="M${cx} ${cy}L${(cx + Math.cos(ah) * (R - 20)).toFixed(1)} ${(cy + Math.sin(ah) * (R - 20)).toFixed(1)}" stroke="var(--led)" stroke-width="3"/>
          <text x="150" y="40" class="vizsm" style="fill:var(--ok)">verde: cola (lee loop)</text><text x="150" y="56" class="vizsm" style="fill:var(--led)">naranja: cabeza (escribe la ISR)</text>
          <text x="150" y="88" class="vizlab">Llegan ${num(o.bytes, 1)} bytes</text><text x="150" y="106" class="vizsm">mientras loop() está ocupado</text>
          <text x="150" y="130" class="vizlab">Caben ${o.cap} (TAM − 1)</text>
          <text x="150" y="158" class="vizlab" style="fill:${o.lost ? 'var(--err)' : 'var(--ok)'}">${o.lost ? 'Se pierden ' + o.lost + ' bytes' : 'No se pierde nada'}</text></svg>`;
      }
    },
    // El ADC convierte: ADC = Vin · 1024 / Vref y cómo se reparten los 10 bits en ADCH y ADCL.
    av_conv: {
      calc: p => { const code = Math.max(0, Math.min(1023, Math.floor(p.vin * 1024 / p.ref + 1e-9))); return { code, lsb: p.ref / 1024, sat: p.vin >= p.ref ? 1 : 0, fine: p.ref === 1.1 && code >= 455 && code <= 475 ? 1 : 0 }; },
      svg: (p, o) => {
        const H = p.adlar ? (o.code >> 2) & 255 : (o.code >> 8) & 3, Lo = p.adlar ? (o.code & 3) << 6 : o.code & 255;
        const colf = isH => b => { const src = p.adlar ? (isH ? b + 2 : b - 6) : (isH ? b + 8 : b); return src >= 8 ? 'var(--led)' : 'var(--ice)'; };
        return `<svg viewBox="0 0 300 186" class="viz">
          ${Widgets.H.hbar(16, 30, 268, Math.min(1, p.vin / p.ref), o.sat ? 'var(--err)' : 'var(--ice)', `Vin ${num(p.vin, 2)} V de Vref ${num(p.ref, 1)} V`)}
          <text x="16" y="62" class="vizbig" style="font-size:17px">ADC = ${o.code}${o.sat ? ' (saturado)' : ''}</text>
          <text x="284" y="62" text-anchor="end" class="vizsm">1 paso = ${num(o.lsb * 1000, 2)} mV</text>
          <text x="16" y="96" class="vizsm">ADCH</text>${bitRow(70, 82, H, { colf: colf(true) })}
          <text x="16" y="126" class="vizsm">ADCL</text>${bitRow(70, 112, Lo, { colf: colf(false) })}
          <text x="16" y="156" class="vizsm">ADLAR = ${p.adlar}: ${p.adlar ? 'alineado a la izquierda, ADCH tiene los 8 bits altos' : 'alineado a la derecha, ADCH solo tiene 2 bits'}</text>
          <text x="16" y="174" class="vizsm" style="fill:var(--led)">naranja: los 2 bits más altos (bits 9 y 8)</text></svg>`;
      }
    },
    // Medir la propia VCC midiendo la referencia interna de 1,1 V con referencia AVcc.
    av_vcc: {
      calc: p => { const code = Math.round(p.ref * 1024 / p.vcc), est = 1.1 * 1024 / code; return { code, est, err: est - p.vcc, errAbs: Math.abs(est - p.vcc) }; },
      svg: (p, o) => {
        const col = o.errAbs > 0.1 ? 'var(--err)' : 'var(--ok)';
        return `<svg viewBox="0 0 300 176" class="viz">
          ${Widgets.H.hbar(16, 30, 268, p.vcc / 5.5, 'var(--ok)', 'VCC real (la pila): ' + num(p.vcc, 2) + ' V')}
          ${Widgets.H.hbar(16, 72, 268, o.code / 1023, 'var(--ice)', 'Lectura de la referencia interna: ' + o.code + ' de 1023')}
          <text x="16" y="108" class="vizsm">La referencia de este chip vale de verdad ${num(p.ref, 2)} V</text>
          <text x="16" y="134" class="vizlab">VCC = 1,1 × 1024 / ${o.code} = ${num(o.est, 2)} V</text>
          <text x="16" y="160" class="vizlab" style="fill:${col}">Error de la cuenta: ${o.err >= 0 ? '+' : '−'}${num(o.errAbs, 2)} V</text></svg>`;
      }
    },
    // Dónde muestrea el receptor cada bit si su reloj no coincide con el del emisor.
    av_drift: {
      calc: p => { const e = p.e / 100, worst = 9.5 * Math.abs(e); return { worst, ok: worst <= 0.5 ? 1 : 0, abs: Math.abs(p.e) }; },
      svg: (p, o) => {
        const e = p.e / 100, w = 26, x0 = 20, lab = ['S', '0', '1', '2', '3', '4', '5', '6', '7', 'P'];
        const cells = lab.map((l, k) => `<rect x="${x0 + k * w}" y="40" width="${w}" height="40" fill="${k === 0 || k === 9 ? 'var(--line)' : 'none'}" fill-opacity=".5" stroke="var(--line)"/><text x="${x0 + k * w + w / 2}" y="96" text-anchor="middle" class="vizsm">${l}</text>`).join('');
        const marks = lab.map((_, k) => { const off = (k + 0.5) * e, x = x0 + (k + 0.5 + off) * w, bad = Math.abs(off) > 0.5; return `<path d="M${x.toFixed(1)} 34V86" stroke="${bad ? 'var(--err)' : 'var(--ok)'}" stroke-width="2.4"/>`; }).join('');
        return `<svg viewBox="0 0 300 170" class="viz"><text x="20" y="22" class="vizlab">Reloj del receptor ${p.e > 0 ? '+' : p.e < 0 ? '−' : ''}${num(Math.abs(p.e), 1)} % respecto al emisor</text>${cells}${marks}
          <text x="20" y="122" class="vizsm">Rayas: dónde mide el receptor (lo ideal: el centro)</text>
          <text x="20" y="146" class="vizlab" style="fill:${o.ok ? 'var(--ok)' : 'var(--err)'}">Desfase en el bit de parada: ${num(o.worst * 100, 0)} % de un bit</text>
          <text x="20" y="164" class="vizsm">${o.ok ? (o.worst > 0.25 ? 'Aún dentro, pero sin margen para el ruido' : 'Con margen') : 'Se sale de su bit: la trama falla'}</text></svg>`;
      }
    },
    // SPI: dos registros de desplazamiento en anillo que intercambian sus bytes.
    av_spi: {
      calc: p => { const k = p.k, m = k >= 8 ? p.s : ((p.m << k) | (p.s >> (8 - k))) & 255, s = k >= 8 ? p.m : ((p.s << k) | (p.m >> (8 - k))) & 255; return { k, mreg: m, sreg: s, swapped: k === 8 ? 1 : 0 }; },
      svg: (p, o) => {
        const k = p.k, cm = b => (b >= k ? 'var(--ice)' : 'var(--led)'), cs = b => (b >= k ? 'var(--led)' : 'var(--ice)');
        return `<svg viewBox="0 0 300 186" class="viz"><text x="10" y="20" class="vizlab">Pulsos de SCK: ${k} de 8</text>
          <text x="10" y="52" class="vizsm">Maestro</text>${bitRow(78, 38, o.mreg, { colf: cm })}
          <text x="10" y="124" class="vizsm">Esclavo</text>${bitRow(78, 110, o.sreg, { colf: cs })}
          <path d="M89 61L262 106" stroke="var(--ice)" stroke-width="1.8"/><path d="M262 106l-9 -1 3 -6z" fill="var(--ice)"/><text x="150" y="72" class="vizsm" style="fill:var(--ice)">MOSI</text>
          <path d="M89 107L262 62" stroke="var(--led)" stroke-width="1.8"/><path d="M262 62l-9 1 3 6z" fill="var(--led)"/><text x="150" y="104" class="vizsm" style="fill:var(--led)">MISO</text>
          <text x="10" y="156" class="vizsm" style="fill:var(--ice)">azul: bits del byte del maestro (${hx(p.m)})</text><text x="10" y="174" class="vizsm" style="fill:var(--led)">naranja: bits del byte del esclavo (${hx(p.s)})</text></svg>`;
      }
    },
    // I²C: subida de la línea con la pull-up y la capacidad del bus.
    av_i2c: {
      calc: p => { const tr = 0.8473 * p.R * p.C * 1e-12, lim = p.f === 400000 ? 300e-9 : 1000e-9; return { tr, ok: tr <= lim ? 1 : 0, fix400: p.f === 400000 && p.C >= 200 && tr <= lim ? 1 : 0 }; },
      svg: (p, o) => {
        const hp = 1 / (2 * p.f), tau = p.R * p.C * 1e-12, x0 = 20, W = 260, X = t => x0 + t / (2 * hp) * W, Y = v => 130 - v * 90;
        let d = `M${x0} ${Y(0)}H${X(hp).toFixed(1)}`; for (let i = 1; i <= 40; i++) { const t = hp * i / 40; d += `L${X(hp + t).toFixed(1)} ${Y(1 - Math.exp(-t / tau)).toFixed(1)}`; }
        const lim = p.f === 400000 ? 300 : 1000;
        return `<svg viewBox="0 0 300 180" class="viz"><text x="20" y="20" class="vizlab">SCL a ${p.f / 1000} kHz · pull-up ${Widgets.H.fR(p.R)} · bus ${p.C} pF</text>
          <path d="M20 ${Y(0.3)}H280M20 ${Y(0.7)}H280" stroke="var(--line)" stroke-dasharray="3 3"/><text x="280" y="${Y(0.7) - 4}" text-anchor="end" class="vizsm">70 %</text><text x="280" y="${Y(0.3) - 4}" text-anchor="end" class="vizsm">30 %</text>
          <path d="${d}" fill="none" stroke="${o.ok ? 'var(--ice)' : 'var(--err)'}" stroke-width="2.4"/>
          <text x="20" y="152" class="vizlab" style="fill:${o.ok ? 'var(--ok)' : 'var(--err)'}">Tiempo de subida: ${num(o.tr * 1e9, 0)} ns (máximo ${lim} ns)</text>
          <text x="20" y="172" class="vizsm">${o.ok ? 'Los flancos llegan a tiempo' : 'Demasiado lenta: el bus fallará'}</text></svg>`;
      }
    },
    // Comparador analógico vigilando una batería con un divisor y la referencia de 1,1 V.
    av_acomp: {
      calc: p => { const ain = p.vbat * p.k; return { ain, aco: ain < 1.1 ? 1 : 0, vth: 1.1 / p.k }; },
      svg: (p, o) => `<svg viewBox="0 0 300 176" class="viz">
        ${Widgets.H.hbar(16, 30, 268, p.vbat / 5.5, 'var(--ok)', 'Batería: ' + num(p.vbat, 2) + ' V')}
        ${Widgets.H.hbar(16, 72, 268, o.ain / 1.6, 'var(--ice)', 'AIN1 (tras el divisor ×' + num(p.k, 2) + '): ' + num(o.ain, 2) + ' V')}
        <path d="M${(16 + 268 * 1.1 / 1.6).toFixed(1)} 52V80" stroke="var(--err)" stroke-width="2" stroke-dasharray="3 2"/><text x="${(16 + 268 * 1.1 / 1.6).toFixed(1)}" y="96" text-anchor="middle" class="vizsm" style="fill:var(--err)">1,1 V</text>
        <text x="16" y="124" class="vizlab" style="fill:${o.aco ? 'var(--err)' : 'var(--ok)'}">ACO = ${o.aco}: ${o.aco ? '¡batería baja! salta la interrupción' : 'batería bien'}</text>
        <text x="16" y="150" class="vizsm">Avisa cuando la batería baja de 1,1 / ${num(p.k, 2)} = ${num(o.vth, 2)} V</text></svg>`
    },
    // Watchdog: si nadie lo reinicia antes del plazo, reinicia el chip.
    av_wdt: {
      calc: p => { const loop = p.loop / 1000; return { reset: loop > p.to ? 1 : 0, ok12: p.loop >= 1200 && p.to === 2 && loop <= p.to ? 1 : 0 }; },
      svg: (p, o) => {
        const loop = p.loop / 1000, Tw = Math.max(3 * loop, 1.3 * p.to), X = t => 16 + t / Tw * 268, Y = v => 120 - Math.min(1, v) * 76;
        let d = `M16 120`, t = 0, boom = null, it = 0;
        while (t < Tw - 1e-9 && it++ < 150) { const end = Math.min(t + loop, Tw); if (loop > p.to && t + p.to <= end) { d += `L${X(t + p.to).toFixed(1)} ${Y(1)}`; boom = t + p.to; break; } d += `L${X(end).toFixed(1)} ${Y((end - t) / p.to).toFixed(1)}`; if (end < Tw) d += `V120`; t = end; }
        return `<svg viewBox="0 0 300 176" class="viz"><text x="16" y="20" class="vizlab">Plazo ${fT(p.to)} · loop() tarda ${fT(loop)}</text>
          <path d="M16 ${Y(1)}H284" stroke="var(--err)" stroke-dasharray="4 3"/><text x="284" y="${Y(1) - 4}" text-anchor="end" class="vizsm" style="fill:var(--err)">plazo</text>
          <path d="M16 120H284" stroke="var(--muted)"/><path d="${d}" fill="none" stroke="var(--ice)" stroke-width="2.4"/>
          ${boom !== null ? `<text x="${X(boom).toFixed(1)}" y="${Y(1) - 8}" text-anchor="middle" class="vizbig" style="fill:var(--err)">✕</text>` : ''}
          <text x="16" y="146" class="vizsm">Cada bajada es un wdt_reset() al final de loop()</text>
          <text x="16" y="168" class="vizlab" style="fill:${o.reset ? 'var(--err)' : 'var(--ok)'}">${o.reset ? '¡Se acaba el plazo: el chip se reinicia!' : 'Llega a tiempo: no se reinicia'}</text></svg>`;
      }
    },
    // Qué sigue gastando un chip dormido en power-down.
    av_leak: {
      calc: p => { const I = LEAKS.reduce((s, [, i, k]) => s + (k === null || p[k] ? i : 0), 0); return { I, years: 220000 / I / 8760 }; },
      svg: (p, o) => {
        const rows = LEAKS.map(([n, i, k], r) => { const on = k === null || p[k], y = 30 + r * 22; return `<circle cx="16" cy="${y - 4}" r="5" fill="${on ? 'var(--led)' : 'none'}" stroke="var(--line)"/><text x="28" y="${y}" class="${on ? 'vizlab' : 'vizsm'}">${n}</text><text x="284" y="${y}" text-anchor="end" class="vizsm">${on ? '≈ ' + num(i, 1) + ' µA' : 'apagado'}</text>`; }).join('');
        const life = o.years > 10 ? 'más de 10 años (manda la autodescarga)' : o.years >= 1 ? num(o.years, 1) + ' años' : num(o.years * 365, 0) + ' días';
        return `<svg viewBox="0 0 300 176" class="viz"><text x="8" y="12" class="vizsm">Chip en power-down (valores orientativos)</text>${rows}
          <text x="8" y="146" class="vizlab">Total dormido: ${o.I >= 1 ? num(o.I, 1) : num(o.I, 2)} µA</text>
          <text x="8" y="166" class="vizsm">Con una CR2032 (220 mAh), solo durmiendo: ${life}</text></svg>`;
      }
    },
    // El fusible low bit a bit: 0 = programado.
    av_fuse: {
      calc: p => { const low = (p.div << 7) | (p.ckout << 6) | (p.sut << 4) | p.cksel, [mhz, , xt] = fuseClk(p.cksel, p.div); return { low, mhz, xt }; },
      svg: (p, o) => {
        const names = ['CKDIV8', 'CKOUT', 'SUT1', 'SUT0', 'CKSEL3', 'CKSEL2', 'CKSEL1', 'CKSEL0'];
        const cells = names.map((n, i) => { const b = 7 - i, v = (o.low >> b) & 1; return `<rect x="${10 + i * 35}" y="38" width="31" height="26" rx="4" fill="${v ? 'none' : 'var(--led)'}" fill-opacity=".55" stroke="var(--line)"/><text x="${25.5 + i * 35}" y="56" text-anchor="middle" class="vizlab">${v}</text><text x="${25.5 + i * 35}" y="78" text-anchor="middle" class="vizsm" style="font-size:7.5px">${n}</text>`; }).join('');
        const [mhz, desc, xt] = fuseClk(p.cksel, p.div);
        return `<svg viewBox="0 0 300 176" class="viz"><text x="10" y="24" class="vizlab">Fusible low = ${hx(o.low)} (${b8(o.low)})</text>${cells}
          <text x="10" y="100" class="vizsm" style="fill:var(--led)">naranja: bit a 0 = programado (activo)</text>
          <text x="10" y="124" class="vizlab">Reloj: ${desc}</text>
          <text x="10" y="144" class="vizlab">${p.div ? 'Sin dividir' : 'Dividido entre 8 (CKDIV8)'} → ${mhz >= 1 ? num(mhz, 3) + ' MHz' : num(mhz * 1000, 3) + ' kHz'}</text>
          <text x="10" y="166" class="vizsm">${xt ? 'Necesita su cristal o reloj externo: sin él, el chip no arranca' : 'No necesita nada externo'}${p.ckout ? '' : ' · reloj visible en PB0'}</text></svg>`;
      }
    },
    // Bucle de retardo en ensamblador: 3 ciclos por vuelta.
    av_loop: {
      calc: p => { const cyc = 3 * p.n; return { cyc, t: cyc / p.f }; },
      svg: (p, o) => {
        const rows = [['ldi r24, ' + p.n, 1, 1], ['dec r24', p.n, 1], ['brne (salta)', p.n - 1, 2], ['brne (no salta)', 1, 1]];
        const tot = o.cyc; let x = 20;
        const bars = rows.map(([n, k, c], i) => { const v = k * c, w = 260 * v / tot, s = `<rect x="${x.toFixed(1)}" y="128" width="${Math.max(0, w).toFixed(1)}" height="16" fill="${['var(--muted)', 'var(--ice)', 'var(--led)', 'var(--muted)'][i]}" opacity=".7"/>`; x += w; return s; }).join('');
        return `<svg viewBox="0 0 300 186" class="viz">${rows.map(([n, k, c], i) => `<text x="20" y="${24 + i * 22}" class="vizsm" style="font-family:monospace">${n}</text><text x="280" y="${24 + i * 22}" text-anchor="end" class="vizsm">${k} × ${c} = ${k * c} ${k * c === 1 ? 'ciclo' : 'ciclos'}</text>`).join('')}
          <text x="20" y="116" class="vizlab">Total: ${o.cyc} ciclos = 3 × ${p.n}</text>${bars}
          <text x="20" y="170" class="vizlab">A ${p.f} MHz: ${num(o.t, 3)} µs</text></svg>`;
      }
    },
    // Vida de la EEPROM repartiendo escrituras entre celdas.
    av_wear: {
      calc: p => { const years = 100000 * p.m * p.cells / 525600; return { years, ok20: p.m === 1 && years > 20 ? 1 : 0 }; },
      svg: (p, o) => {
        const lx = y => 20 + 260 * Math.max(0, Math.min(1, (Math.log10(y) + 2) / 5));
        const shown = Math.min(p.cells, 64), cells = Array.from({ length: shown }, (_, i) => `<rect x="${20 + (i % 32) * 8.2}" y="${30 + Math.floor(i / 32) * 9}" width="7" height="7" fill="var(--ice)" opacity=".8"/>`).join('');
        return `<svg viewBox="0 0 300 176" class="viz"><text x="20" y="20" class="vizsm">Celdas que se turnan: ${p.cells}${p.cells > 64 ? ' (se dibujan 64)' : ''}</text>${cells}
          <path d="M20 108H280" stroke="var(--muted)"/>${[[0.1, '1 mes'], [1, '1 año'], [10, '10 años'], [100, '100 años']].map(([y, l]) => `<path d="M${lx(y).toFixed(1)} 102v12" stroke="var(--muted)"/><text x="${lx(y).toFixed(1)}" y="128" text-anchor="middle" class="vizsm">${l}</text>`).join('')}
          <circle cx="${lx(o.years).toFixed(1)}" cy="108" r="7" fill="${o.years >= 10 ? 'var(--ok)' : o.years >= 1 ? 'var(--led)' : 'var(--err)'}"/>
          <text x="20" y="152" class="vizlab">Una escritura cada ${p.m} min → ${o.years >= 1 ? num(o.years, 1) + ' años' : num(o.years * 365, 0) + ' días'}</text>
          <text x="20" y="170" class="vizsm">Cada celda aguanta unas 100 000 escrituras</text></svg>`;
      }
    },
    // Serial.print: los primeros 64 bytes van al búfer; el resto espera a que salgan.
    av_txbuf: {
      calc: p => { const tb = 10 / p.baud, block = Math.max(0, p.n - 64) * tb * 1000, total = p.n * tb * 1000; return { block, total, ok200: p.n >= 200 && block < 15 ? 1 : 0 }; },
      svg: (p, o) => {
        const W = 268, inB = Math.min(p.n, 64), x1 = 16 + W * inB / 300, x2 = 16 + W * p.n / 300;
        return `<svg viewBox="0 0 300 170" class="viz"><text x="16" y="20" class="vizlab">Serial.print() de ${p.n} bytes a ${th(p.baud)} baudios</text>
          <rect x="16" y="34" width="${(x1 - 16).toFixed(1)}" height="24" fill="var(--ice)" opacity=".6"/><rect x="${x1.toFixed(1)}" y="34" width="${(x2 - x1).toFixed(1)}" height="24" fill="var(--led)" opacity=".7"/>
          <rect x="16" y="34" width="${W}" height="24" fill="none" stroke="var(--line)"/><path d="M${(16 + W * 64 / 300).toFixed(1)} 28V64" stroke="var(--err)" stroke-dasharray="3 2"/>
          <text x="16" y="78" class="vizsm" style="fill:var(--ice)">caben en el búfer (64)</text><text x="284" y="78" text-anchor="end" class="vizsm" style="fill:var(--led)">esperan su turno</text>
          <text x="16" y="112" class="vizlab" style="fill:${o.block > 1 ? 'var(--err)' : 'var(--ok)'}">loop() bloqueado: ${num(o.block, 1)} ms</text>
          <text x="16" y="134" class="vizsm">Todo el mensaje tarda ${num(o.total, 1)} ms en salir (10 bits por byte)</text>
          <text x="16" y="156" class="vizsm">${o.block > 1 ? 'print() espera a que haya hueco en el búfer' : 'print() vuelve al instante: la ISR envía el resto'}</text></svg>`;
      }
    },
    // Qué despierta al chip en cada modo de sueño.
    av_wake: {
      calc: p => { const w = WAKES[p.src][1][p.mode]; return { w, btnPD: p.mode === 2 && (p.src === 1 || p.src === 2) ? 1 : 0, selfPD: p.mode === 2 && p.src === 3 ? 1 : 0, usartW: p.src === 5 && w ? 1 : 0 }; },
      svg: (p, o) => {
        const cols = ['Idle', 'Power-save', 'Power-down'];
        const head = cols.map((c, j) => `<text x="${152 + j * 56}" y="18" text-anchor="middle" class="vizsm" style="font-size:9.5px;${j === p.mode ? 'fill:var(--led);font-weight:700' : ''}">${c}</text>`).join('');
        const rows = WAKES.map(([n, w], i) => { const y = 38 + i * 19, sel = i === p.src; return `${sel ? `<rect x="2" y="${y - 13}" width="296" height="18" rx="4" fill="var(--led)" opacity=".18"/>` : ''}<text x="6" y="${y}" class="${sel ? 'vizlab' : 'vizsm'}">${n}</text>` + w.map((v, j) => `<text x="${152 + j * 56}" y="${y}" text-anchor="middle" class="vizlab" style="fill:${v ? 'var(--ok)' : 'var(--err)'};opacity:${j === p.mode ? 1 : 0.45}">${v ? '✓' : '✗'}</text>`).join(''); }).join('');
        return `<svg viewBox="0 0 300 176" class="viz">${head}${rows}
          <text x="6" y="172" class="vizlab" style="fill:${o.w ? 'var(--ok)' : 'var(--err)'}">En ${cols[p.mode]}: ${o.w ? 'despierta' : 'no despierta'}</text></svg>`;
      }
    },
    // Un bajón de alimentación y el detector de baja tensión (BOD).
    av_bod: {
      calc: p => { const vmin16 = 3.78, rst = p.lvl > 0 && p.vmin < p.lvl ? 1 : 0, st = rst ? 1 : p.vmin < vmin16 ? 2 : 0; return { st, safe: p.lvl === 4.3 && p.vmin < vmin16 ? 1 : 0 }; },
      svg: (p, o) => {
        const Y = v => 150 - v / 5.5 * 130, x0 = 16, X = t => x0 + t * 268;
        const d = `M${X(0)} ${Y(5)}H${X(0.3)}L${X(0.42)} ${Y(p.vmin).toFixed(1)}L${X(0.6)} ${Y(p.vmin).toFixed(1)}L${X(0.75)} ${Y(5)}H${X(1)}`;
        const lab = ['Todo bien: la tensión no baja de lo necesario', 'Reinicio limpio por el BOD (BORF = 1)', '¡Peligro! Funciona a 16 MHz fuera de especificación'][o.st], col = ['var(--ok)', 'var(--led)', 'var(--err)'][o.st];
        return `<svg viewBox="0 0 300 186" class="viz"><text x="16" y="16" class="vizlab">VCC al arrancar un motor (chip a 16 MHz)</text>
          <path d="M16 ${Y(3.78).toFixed(1)}H284" stroke="var(--err)" stroke-dasharray="4 3"/><text x="284" y="${(Y(3.78) - 4).toFixed(1)}" text-anchor="end" class="vizsm" style="fill:var(--err)">mínimo para 16 MHz ≈ 3,8 V</text>
          ${p.lvl ? `<path d="M16 ${Y(p.lvl).toFixed(1)}H284" stroke="var(--led)" stroke-width="2"/><text x="20" y="${(Y(p.lvl) + 14).toFixed(1)}" class="vizsm" style="fill:var(--led)">BOD a ${num(p.lvl, 1)} V</text>` : `<text x="20" y="${Y(1)}" class="vizsm">BOD apagado</text>`}
          <path d="${d}" fill="none" stroke="var(--ice)" stroke-width="2.6"/>
          <text x="16" y="178" class="vizlab" style="fill:${col}">${lab}</text></svg>`;
      }
    },
    // Lo que cuesta cada operación según el tipo en un AVR de 8 bits (orden de magnitud).
    av_cost: {
      calc: p => ({ lvl: COSTS[p.tipo][p.op][0] }),
      svg: (p, o) => {
        const T = ['uint8_t', 'uint16_t', 'uint32_t', 'float'], OPS = ['a + b', 'a × b', 'a / b'];
        const rows = [0, 1, 2].map(j => { const [l, txt] = COSTS[p.tipo][j], y = 40 + j * 36, sel = j === p.op; return `<text x="10" y="${y}" class="${sel ? 'vizlab' : 'vizsm'}">${OPS[j]}</text><rect x="70" y="${y - 12}" width="${(20 + l * 60).toFixed(1)}" height="14" rx="4" fill="${l >= 2.5 ? 'var(--err)' : l >= 1.5 ? 'var(--led)' : 'var(--ok)'}" opacity="${sel ? 0.9 : 0.35}"/><text x="70" y="${y + 15}" class="${sel ? 'vizlab' : 'vizsm'}">${txt}</text>`; }).join('');
        return `<svg viewBox="0 0 300 176" class="viz"><text x="10" y="18" class="vizlab">Con ${T[p.tipo]} en un AVR de 8 bits</text>${rows}
          <text x="10" y="150" class="vizsm">Sin divisor ni coma flotante por hardware:</text><text x="10" y="166" class="vizsm">dividir y operar con float llama a rutinas de software</text></svg>`;
      }
    },
    // Modos de sueño: qué bloques siguen con reloj.
    av_smode: {
      calc: p => ({ m: p.m, usart: p.m <= 1 ? 1 : 0, t2: p.m <= 3 ? 1 : 0, usartSleep: p.m === 1 ? 1 : 0 }),
      svg: (p) => {
        const rows = SBLK.map(([n, on], i) => { const a = on[p.m], y = 40 + i * 21; return `<rect x="10" y="${y - 13}" width="280" height="18" rx="4" fill="${a ? 'var(--ok)' : 'var(--muted)'}" opacity="${a ? 0.28 : 0.08}"/><text x="18" y="${y}" class="${a ? 'vizlab' : 'vizsm'}">${n}</text><text x="284" y="${y}" text-anchor="end" class="vizsm">${a ? 'funciona' : 'parado'}</text>`; }).join('');
        return `<svg viewBox="0 0 300 176" class="viz"><text x="10" y="18" class="vizlab">Modo: ${SMODES[p.m]}</text>${rows}
          <text x="10" y="172" class="vizsm">${p.m === 4 ? 'El más profundo: solo despiertan el watchdog e INT/PCINT' : p.m === 0 ? 'Todo encendido' : 'Cuanto más abajo, más cosas paradas y menos consumo'}</text></svg>`;
      }
    }
  });

  /* ===================== PARÁMETROS DE LAS VISUALIZACIONES NUEVAS ===================== */
  const L01 = (label, val) => ({ label, val, list: [0, 1], dec: 0 });
  const pSl = (label, val, min, max, step = 1, unit = '', dec = 0) => ({ label, val, min, max, step, unit, dec });
  const fx = val => ({ val, fixed: true });

  /* ===================== MÓDULO 1 · Dentro del ATmega328P ===================== */
  const SV_HARV = `<svg viewBox="0 0 300 150" class="viz"><rect x="8" y="40" width="74" height="60" rx="8" fill="var(--ice)" fill-opacity=".2" stroke="var(--ice)"/><text x="45" y="66" text-anchor="middle" class="vizlab">Flash</text><text x="45" y="84" text-anchor="middle" class="vizsm">programa</text>
    <rect x="113" y="28" width="74" height="84" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><text x="150" y="58" text-anchor="middle" class="vizlab">CPU</text><text x="150" y="76" text-anchor="middle" class="vizsm">ALU</text><text x="150" y="92" text-anchor="middle" class="vizsm">R0–R31</text>
    <rect x="218" y="40" width="74" height="60" rx="8" fill="var(--ok)" fill-opacity=".2" stroke="var(--ok)"/><text x="255" y="66" text-anchor="middle" class="vizlab">SRAM</text><text x="255" y="84" text-anchor="middle" class="vizsm">datos</text>
    <path d="M82 62H113" stroke="var(--ice)" stroke-width="3" class="a-flow"/><path d="M187 78H218M218 62H187" stroke="var(--ok)" stroke-width="3" class="a-flow-slow"/>
    <text x="97" y="130" text-anchor="middle" class="vizsm">bus de programa</text><text x="203" y="130" text-anchor="middle" class="vizsm">bus de datos</text></svg>`;
  const SV_SREG = `<svg viewBox="0 0 300 120" class="viz"><text x="10" y="20" class="vizlab">SREG: cómo salió la última operación</text>${['I', 'T', 'H', 'S', 'V', 'N', 'Z', 'C'].map((f, i) => `<rect x="${12 + i * 35}" y="34" width="31" height="28" rx="5" fill="${'NZC'.includes(f) ? 'var(--led)' : f === 'I' ? 'var(--ice)' : 'none'}" fill-opacity=".35" stroke="var(--line)"/><text x="${27.5 + i * 35}" y="53" text-anchor="middle" class="vizlab">${f}</text>`).join('')}
    <text x="27" y="82" text-anchor="middle" class="vizsm">permiso</text><text x="292" y="82" text-anchor="end" class="vizsm">N negativo · Z cero · C acarreo</text><text x="10" y="108" class="vizsm">La CPU los consulta para decidir los if y los bucles</text></svg>`;
  const SV_MEM3 = `<svg viewBox="0 0 300 160" class="viz">
    <rect x="10" y="20" width="86" height="96" rx="8" fill="var(--ice)" fill-opacity=".22" stroke="var(--ice)"/><text x="53" y="44" text-anchor="middle" class="vizlab">Flash</text><text x="53" y="64" text-anchor="middle" class="vizbig">32 KB</text><text x="53" y="88" text-anchor="middle" class="vizsm">programa y</text><text x="53" y="102" text-anchor="middle" class="vizsm">constantes</text>
    <rect x="107" y="58" width="86" height="58" rx="8" fill="var(--led)" fill-opacity=".22" stroke="var(--led)"/><text x="150" y="78" text-anchor="middle" class="vizlab">SRAM 2 KB</text><text x="150" y="96" text-anchor="middle" class="vizsm">variables, pila</text><text x="150" y="110" text-anchor="middle" class="vizsm">y montón</text>
    <rect x="204" y="80" width="86" height="36" rx="8" fill="var(--ok)" fill-opacity=".22" stroke="var(--ok)"/><text x="247" y="96" text-anchor="middle" class="vizlab">EEPROM 1 KB</text><text x="247" y="110" text-anchor="middle" class="vizsm">ajustes</text>
    <text x="53" y="136" text-anchor="middle" class="vizsm">no se borra</text><text x="150" y="136" text-anchor="middle" class="vizsm" style="fill:var(--err)">se borra al apagar</text><text x="247" y="136" text-anchor="middle" class="vizsm">no se borra</text>
    <text x="150" y="154" text-anchor="middle" class="vizsm">La SRAM es la que se acaba primero</text></svg>`;
  const SV_SRAMMAP = `<svg viewBox="0 0 300 150" class="viz"><rect x="20" y="40" width="260" height="36" rx="4" fill="none" stroke="var(--line)" stroke-width="1.5"/>
    <rect x="20" y="40" width="40" height="36" fill="var(--ice)" opacity=".6"/><rect x="60" y="40" width="40" height="36" fill="var(--ice)" opacity=".35"/><rect x="100" y="40" width="50" height="36" fill="var(--led)" opacity=".6"/><rect x="220" y="40" width="60" height="36" fill="var(--ok)" opacity=".6"/>
    <text x="40" y="62" text-anchor="middle" class="vizsm">.data</text><text x="80" y="62" text-anchor="middle" class="vizsm">.bss</text><text x="125" y="62" text-anchor="middle" class="vizsm">montón</text><text x="185" y="62" text-anchor="middle" class="vizsm">libre</text><text x="250" y="62" text-anchor="middle" class="vizsm">pila</text>
    <path d="M152 92h26" stroke="var(--led)" stroke-width="2.5" class="a-flow"/><path d="M218 92h-26" stroke="var(--ok)" stroke-width="2.5" class="a-flow"/>
    <text x="20" y="32" class="vizsm">0x0100</text><text x="280" y="32" text-anchor="end" class="vizsm">0x08FF</text>
    <text x="20" y="120" class="vizsm">El montón sube y la pila baja:</text><text x="20" y="136" class="vizsm">si se encuentran, se pisan sin aviso.</text></svg>`;
  const SV_HEAP = `<svg viewBox="0 0 300 120" class="viz"><text x="10" y="18" class="vizsm">Montón tras horas de String y malloc</text><rect x="10" y="30" width="280" height="30" rx="4" fill="none" stroke="var(--line)"/>
    ${[[10, 40, 1], [50, 20, 0], [70, 50, 1], [120, 30, 0], [150, 40, 1], [190, 25, 0], [215, 45, 1], [260, 30, 0]].map(([x, w, u]) => `<rect x="${x}" y="30" width="${w}" height="30" fill="${u ? 'var(--led)' : 'none'}" opacity=".6" stroke="var(--line)"/>`).join('')}
    <text x="10" y="82" class="vizsm">Libre en total: 105 bytes, pero repartidos en huecos</text><text x="10" y="100" class="vizsm" style="fill:var(--err)">malloc(60) falla: no hay 60 seguidos</text></svg>`;
  const SV_HDR = `<svg viewBox="0 0 300 130" class="viz">${Array.from({ length: 14 }, (_, i) => `<rect x="${8 + i * 20.5}" y="22" width="18" height="22" rx="3" fill="${i < 8 ? 'var(--ice)' : 'var(--led)'}" fill-opacity=".35" stroke="var(--line)"/><text x="${17 + i * 20.5}" y="37" text-anchor="middle" class="vizsm">${i}</text>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<rect x="${8 + i * 20.5}" y="82" width="18" height="22" rx="3" fill="var(--ok)" fill-opacity=".35" stroke="var(--line)"/><text x="${17 + i * 20.5}" y="97" text-anchor="middle" class="vizsm">A${i}</text>`).join('')}
    <text x="8" y="62" class="vizsm" style="fill:var(--ice)">D0–D7 = PD0–PD7</text><text x="174" y="62" class="vizsm" style="fill:var(--led)">D8–D13 = PB0–PB5</text><text x="140" y="98" class="vizsm" style="fill:var(--ok)">A0–A5 = PC0–PC5</text>
    <text x="8" y="124" class="vizsm">D13 = PB5: el bit 5 del puerto B</text></svg>`;
  const SV_BARE = `<svg viewBox="0 0 300 176" class="viz"><rect x="118" y="16" width="64" height="104" rx="6" fill="#2B3240" stroke="var(--muted)" stroke-width="1"/><text x="150" y="72" text-anchor="middle" class="vizsm" style="fill:#fff">328P</text>
    <path d="M118 34H96M118 56H96M118 78H96M118 100H96M182 34H204M182 56H204M182 78H204" stroke="currentColor" stroke-width="1.6"/>
    <text x="92" y="38" text-anchor="end" class="vizsm">RESET 1</text><text x="92" y="60" text-anchor="end" class="vizsm">VCC 7</text><text x="92" y="82" text-anchor="end" class="vizsm">GND 8</text><text x="92" y="104" text-anchor="end" class="vizsm">XTAL 9 · 10</text>
    <text x="208" y="38" class="vizsm">20 AVCC</text><text x="208" y="60" class="vizsm">21 AREF</text><text x="208" y="82" class="vizsm">22 GND</text>
    <text x="150" y="140" text-anchor="middle" class="vizsm">10 kΩ de RESET a VCC · 100 nF en cada pareja</text>
    <text x="150" y="158" text-anchor="middle" class="vizsm">Cristal entre 9 y 10, con 22 pF de cada pata a masa</text></svg>`;

  const M1 = { id: 'av-m1', title: 'Dentro del ATmega328P', desc: 'Núcleo AVR, reloj, memorias, pila y el mapa de patas que hay detrás de cada pin de Arduino.', nodes: [
 L('av1', 'Arquitectura Harvard y núcleo AVR', 'chip', ['av_core', 'av_8bit', 'av_wrap', 'av_isr'], [
  Q('Escribes x = x + 1 en tu sketch. ¿Dónde crees que hace la cuenta el chip?', ['En unos registros internos pegados a la unidad de cálculo', 'Directamente en la memoria RAM', 'En la memoria Flash, donde está el programa', 'En el chip del USB'], 'La CPU solo calcula sobre sus registros: trae x de la RAM, suma y la devuelve. Vamos a verlo por dentro.', { predict: true, c: 'av_core', h: 'Piensa en una mesa de trabajo: los datos se traen a la mesa para operar con ellos.' }),
  { t: 'explore', text: 'Esta es la <b>ALU</b> del 328P con dos registros de 8 bits, r24 y r25. Debajo está <b>SREG</b>, que se enciende según cómo sale cada operación.', viz: 'av_alu', params: { x: pSl('r24', 100, 0, 255), k: pSl('r25', 20, 0, 255), op: L01('Operación (0 = suma, 1 = resta)', 0) },
    tasks: [{ q: 'C', min: 1, max: 1, text: 'Haz que la suma no quepa en 8 bits', done: 'El resultado pierde el noveno bit y la bandera <b>C</b> (acarreo) lo recuerda.', hint: 'Haz que r24 + r25 pase de 255.' },
      { q: 'Z', min: 1, max: 1, text: 'Consigue un resultado exactamente 0', done: '<b>Z</b> se enciende cuando el resultado es 0: así decide el chip los if y cuándo acaba un bucle.', hint: 'Que la suma dé justo 256, o resta dos números iguales.' },
      { q: 'N', min: 1, max: 1, text: 'Ahora enciende la bandera N', done: '<b>N</b> copia el bit 7 del resultado: en números con signo, significa negativo.', hint: 'Haz que el resultado valga 128 o más.' }] },
  I('El 328P es un microcontrolador AVR de <b>8 bits</b>: su ALU opera byte a byte. Usa <b>arquitectura Harvard</b>: el programa (Flash) y los datos (SRAM) viajan por buses separados.\nMientras ejecuta una instrucción ya trae la siguiente: por eso casi todas tardan <b>un solo ciclo</b>.', { svg: SV_HARV, more: 'AVR es una arquitectura RISC: unas 130 instrucciones sencillas que el hardware ejecuta muy deprisa. avr-gcc traduce tu C (o el C++ de Arduino) a esas instrucciones.\nSe llama Harvard «modificada» porque, con una instrucción especial (LPM), la CPU también puede leer constantes de la Flash como si fueran datos.' }),
  I('Las cuentas se hacen en <b>32 registros</b> de 8 bits (R0–R31) cableados a la ALU. Un dato de la SRAM primero se carga en un registro, se opera y se vuelve a guardar: <b>cargar, operar, guardar</b>.', { code: 'lds  r24, x     ; trae x de la SRAM a un registro\ninc  r24        ; la ALU le suma 1\nsts  x, r24     ; lo devuelve a la SRAM', more: 'Los seis últimos registros se usan por parejas como punteros para recorrer memoria: X (R27:R26), Y (R29:R28) y Z (R31:R30).' }),
  I('<b>SREG</b> guarda cómo salió la última operación: <b>C</b> (acarreo), <b>Z</b> (cero), <b>N</b> (negativo) y otras. Su bit <b>I</b> es el permiso global de interrupciones: sei() lo pone a 1 y cli() a 0.', { svg: SV_SREG, more: 'Las demás banderas: V (desbordamiento con signo), S (signo corregido), H (medio acarreo, para cuentas en BCD) y T (un bit de uso libre para algunas instrucciones).' }),
  I('Un <b>uint8_t</b> se suma con una instrucción. Un <b>int</b> (16 bits) ocupa dos registros y necesita dos: add para el byte bajo y adc, que arrastra el acarreo, para el alto. Un uint32_t, cuatro.\nY no hay divisor: dividir es una rutina lenta.', { code: 'add r24, r22   ; byte bajo\nadc r25, r23   ; byte alto + el acarreo del bajo', more: 'El 328P multiplica 8 × 8 bits por hardware en 2 ciclos, pero no tiene divisor ni coma flotante: x / 7, x % 10 o un float llaman a rutinas de decenas a cientos de ciclos. Dividir sin signo entre una potencia de 2 sí es barato: es un desplazamiento (x / 16 = x >> 4).' }),
  { t: 'steps', text: 'uint8_t a = 200; a = a + 100; ¿Qué queda en a y qué banderas se encienden?', steps: ['La cuenta de verdad: 200 + 100 = 300', 'Un byte solo llega a 255: 300 no cabe', 'Se pierde una vuelta completa de 256: 300 − 256 = <b>44</b>', 'El bit que sobra va a <b>C</b> (acarreo). 44 no es 0 (Z = 0) y su bit 7 es 0 (N = 0)'], result: 'a vale 44 y se enciende C' },
  Q('¿Dónde hace sus operaciones la ALU de un AVR?', ['Sobre los registros R0–R31', 'Directamente sobre la SRAM', 'Sobre la Flash', 'Sobre la EEPROM'], 'Arquitectura de carga y almacenamiento: los datos pasan siempre por los registros.', { c: 'av_core', h: 'Recuerda los tres pasos: cargar, operar, guardar.' }),
  Q('¿Qué ventaja da tener buses separados para programa y datos?', ['Traer la siguiente instrucción mientras se ejecuta la actual', 'Tener más memoria RAM', 'Que la Flash no se borre al apagar', 'Gastar menos en reposo'], 'Leer y ejecutar a la vez: casi todo en un ciclo.', { c: 'av_core', h: 'Piensa en dos carreteras: ¿qué pueden hacer a la vez?' }),
  Q('¿Cuánto vale a al final?', ['4', '260', '255', '0'], '260 no cabe en un byte: 260 − 256 = 4, y el bit que sobra va a C.', { code: 'uint8_t a = 250;\na = a + 10;', c: 'av_wrap', h: 'Si pasa de 255, quita una vuelta completa de 256.' }),
  Q('Sumar dos variables int (16 bits) en un AVR de 8 bits…', ['Lleva dos instrucciones: add y adc, con el acarreo', 'Lleva una instrucción', 'No se puede', 'Lleva ocho instrucciones'], 'Una por byte, encadenando el acarreo del byte bajo al alto.', { c: 'av_8bit', h: '¿Cuántos bytes tiene un int en la Uno? Una instrucción por byte.' }),
  { t: 'match', q: 'Une cada parte del chip con su papel.', pairs: [['ALU', 'Hace sumas, restas y operaciones lógicas'], ['R0–R31', 'Operandos inmediatos de la ALU'], ['Flash', 'Guarda el programa'], ['SREG', 'Banderas y permiso de interrupciones']], c: 'av_core', h: 'Empieza por la que hace las cuentas y sigue por dónde trabaja.' },
  { t: 'order', q: 'Ordena lo que hace la CPU para x = x + 1 si x está en la SRAM.', items: ['Cargar x en un registro (lds)', 'Sumar 1 en la ALU', 'Guardar el registro en la SRAM (sts)'], e: 'La ALU solo trabaja sobre registros.', c: 'av_core', h: 'La ALU no toca la SRAM: primero hay que traer el dato.' },
  Q('¿Qué bit de SREG debe estar a 1 para que pueda saltar cualquier interrupción?', ['I', 'C', 'Z', 'T'], 'Es el permiso global: sei() lo pone a 1 y cli() a 0.', { c: 'av_isr', h: 'Busca la bandera que no habla del resultado de una cuenta.' }),
  Q('¿Qué es más barato en un AVR para un uint16_t x?', ['x >> 3', 'x / 7', 'Pasar x a float y dividir entre 8', 'x % 10'], 'Desplazar son unas pocas instrucciones; dividir entre 7, el resto o un float llaman a rutinas lentas.', { c: 'av_8bit', h: 'El 328P no tiene divisor por hardware.' }),
  I('<b>Resumen</b>\n· CPU de 8 bits y arquitectura Harvard: casi todo en un ciclo.\n· Se opera en los registros R0–R31: <b>cargar, operar, guardar</b>.\n· SREG guarda C, Z, N… y el permiso de interrupciones (I).\n· Un byte da la vuelta al pasar de 255; los tipos grandes cuestan más instrucciones.')
 ]),
 L('av2', 'Reloj, ciclos y tiempo', 'timer', ['av_cycle', 'av_clksrc', 'av_vmax', 'av_fcpu'], [
  Q('Una Uno va a 16 MHz. ¿Cuánto crees que dura un ciclo de reloj?', ['62,5 ns', '16 ms', '1 µs', '16 ns'], '1 / 16 000 000 s = 62,5 ns: dieciséis millones de tics por segundo.', { predict: true, c: 'av_cycle', h: 'Un ciclo dura 1 dividido entre la frecuencia.' }),
  I('El reloj marca el ritmo: cada tic es un <b>ciclo</b> y dura <b>1 / f</b>. A 16 MHz, 62,5 ns; a 8 MHz, 125 ns; a 1 MHz, 1 µs.\nCasi todas las instrucciones tardan 1 ciclo; los saltos, 2.', { svg: `<svg viewBox="0 0 300 110" class="viz"><path d="M14 70h20V30h20v40h20V30h20v40h20V30h20v40h20V30h20v40h20V30h20v40h20V30h20v40h14" fill="none" stroke="var(--ice)" stroke-width="2.4"/><path d="M34 86h40" stroke="var(--led)" stroke-width="2"/><path d="M34 80v12M74 80v12" stroke="var(--led)" stroke-width="2"/><text x="54" y="104" text-anchor="middle" class="vizsm" style="fill:var(--led)">1 ciclo</text><text x="150" y="18" text-anchor="middle" class="vizsm">16 MHz: 16 millones de ciclos cada segundo</text><text x="200" y="104" text-anchor="middle" class="vizsm">62,5 ns cada uno</text></svg>` }),
  { t: 'steps', text: 'Una rutina tarda 4000 ciclos a 16 MHz. ¿Cuánto tiempo es?', steps: ['Un ciclo dura 1 / 16 MHz = <b>62,5 ns</b>', 'Tiempo = ciclos × duración: 4000 × 62,5 ns', '= 250 000 ns = <b>250 µs</b>', 'Atajo: ciclos entre MHz da µs → 4000 / 16 = 250 µs'], result: '250 µs' },
  Nm('¿Cuántos ns dura un ciclo a 8 MHz?', 125, 'ns', '1 / 8 000 000 s = 125 ns.', { c: 'av_cycle', h: 'Divide 1000 entre los MHz y obtienes nanosegundos.' }),
  Nm('Un bucle de 1000 vueltas de 4 ciclos cada una. ¿Cuánto tarda a 16 MHz, en µs?', 250, 'µs', '4000 ciclos / 16 = 250 µs.', { c: 'av_cycle', h: 'Primero los ciclos totales; luego divide entre 16.' }),
  G('av_cycles'),
  { t: 'explore', text: 'La frecuencia máxima depende de la tensión. Mueve la alimentación y el reloj: la zona verde es la permitida.', viz: 'av_speed', params: { V: pSl('VCC', 5, 1.8, 5.5, 0.1, 'V', 1), f: { label: 'Reloj', val: 8, list: [1, 4, 8, 10, 12, 16, 20], unit: 'MHz', dec: 0 } },
    tasks: [{ q: 'ok', min: 0, max: 0, text: 'Pon 16 MHz y baja la tensión hasta salirte de la zona verde', done: 'Con menos tensión los transistores conmutan más despacio: el chip ya no garantiza seguir ese ritmo.', hint: 'Sube el reloj a 16 MHz y baja VCC hacia 3 V.' },
      { q: 'm16', min: 1, max: 1, text: 'Busca la tensión más baja con la que 16 MHz sigue dentro', done: 'Unos 3,8 V. Por eso las placas de 3,3 V van a 8 MHz y las de 5 V, a 16 MHz.', hint: 'Con 16 MHz, sube VCC poco a poco desde 3,5 V.' }],
    more: 'Según la hoja de datos, el 328P admite hasta 20 MHz de 4,5 a 5,5 V, hasta 10 MHz desde 2,7 V y hasta 4 MHz desde 1,8 V, con una recta entre esos puntos.' },
  Q('Una placa alimentada a 3,3 V, ¿la pones a 16 MHz?', ['No: está fuera de especificación; por eso esas placas van a 8 MHz', 'Sí, sin problema', 'Sí, pero solo con cristal', 'No: a 3,3 V solo va a 1 MHz'], 'A 3,3 V la recta da unos 13 MHz como máximo.', { c: 'av_vmax', h: 'Mira dónde cae 3,3 V en la recta entre 2,7 V (10 MHz) y 4,5 V (20 MHz).' }),
  I('¿De dónde sale el reloj? Un <b>cristal</b> es muy preciso (decenas de ppm); un <b>resonador</b> cerámico, en torno al 0,5 %; el <b>RC interno</b> de 8 MHz no necesita piezas, pero de fábrica solo garantiza ±10 % (±1 % calibrado).\nEl error se acumula: mira cuánto en una hora, un día o un mes.', { tune: { viz: 'av_clk', params: { src: pSl('Fuente (0 = RC de fábrica … 4 = RTC)', 2, 0, 4), span: pSl('Plazo (0 = hora, 1 = día, 2 = mes)', 1, 0, 2) } }, more: 'ppm son partes por millón: 20 ppm = 0,002 %. La Uno R3 usa un resonador para el 328P y un cristal para el chip del USB. Para un reloj de pared, un RTC con cristal de 32 768 Hz compensado en temperatura.' }),
  TU('Elige la fuente y el plazo: que en un mes se desvíe menos de un minuto.', 'av_clk', { src: pSl('Fuente (0 = RC de fábrica … 4 = RTC)', 1, 0, 4), span: pSl('Plazo (0 = hora, 1 = día, 2 = mes)', 2, 0, 2) }, { q: 'okMes', min: 1, max: 1, text: 'Objetivo: menos de 1 min de error al mes', hint: 'Un mes son unos 2,6 millones de segundos: hacen falta errores de ppm.' }, 'Un cristal de 20 ppm se va unos 52 s al mes; un RTC compensado, unos 5 s.', { c: 'av_clksrc', h: 'Deja el plazo en «mes» y prueba las fuentes más precisas.' }),
  Q('Un reloj con un error del 0,5 % adelanta en un día…', ['Unos 7 minutos', 'Unos 7 segundos', 'Medio segundo', 'Nada apreciable'], '86 400 s × 0,005 = 432 s ≈ 7,2 min.', { c: 'av_clksrc', h: 'Multiplica los segundos de un día (86 400) por el error en tanto por uno.' }),
  I('<b>F_CPU</b> es una constante que le dice al compilador a qué frecuencia irá el chip. No cambia el reloj: delay(), millis() y los baudios la usan para convertir tiempo en ciclos. Si no coincide con el reloj real, todo sale escalado.', { tune: { viz: 'av_fcpu', params: { fd: { label: 'F_CPU', val: 16, list: [1, 8, 16], unit: 'MHz', dec: 0 }, fr: { label: 'Reloj real', val: 8, list: [1, 8, 16], unit: 'MHz', dec: 0 } } }, more: 'Un 328P recién comprado arranca con el RC interno de 8 MHz dividido entre 8 (el fusible CKDIV8): va a 1 MHz. Lo verás en el módulo de fusibles.' }),
  TU('Un chip nuevo va a 1 MHz. Cárgale un programa compilado con F_CPU = 16 MHz.', 'av_fcpu', { fd: { label: 'F_CPU', val: 8, list: [1, 8, 16], unit: 'MHz', dec: 0 }, fr: { label: 'Reloj real', val: 8, list: [1, 8, 16], unit: 'MHz', dec: 0 } }, { q: 't', min: 15.9, max: 16.1, text: 'Objetivo: reproduce ese caso y mira cuánto dura delay(1000)', hint: 'F_CPU a 16 y el reloj real a 1.' }, 'delay(1000) dura 16 s: cuenta los ciclos de 1 s a 16 MHz, que a 1 MHz pasan 16 veces más despacio.', { c: 'av_fcpu', h: 'F_CPU es lo que cree el compilador; el reloj real es el del chip.' }),
  Q('Cambias F_CPU en el código, pero el cristal sigue siendo de 16 MHz. ¿Qué pasa?', ['delay(), millis() y los baudios calculan con un reloj que no es el real', 'Nada', 'El chip cambia de frecuencia', 'Se borra el bootloader'], 'F_CPU solo informa al compilador; no cambia el hardware.', { c: 'av_fcpu', h: '¿F_CPU es un ajuste del chip o un dato para el compilador?' }),
  I('<b>Resumen</b>\n· Un ciclo dura 1 / f; <b>ciclos / MHz = µs</b>.\n· Más tensión permite más velocidad: 16 MHz pide unos 3,8 V o más.\n· Cristal ≫ resonador ≫ RC interno en precisión.\n· F_CPU debe coincidir con el reloj real.')
 ]),
 L('av3', 'Las tres memorias', 'memory', ['av_mem', 'av_eeprom'], [
  Q('Tu sketch imprime 40 mensajes distintos con Serial.println("…"). Compila, pero al arrancar se cuelga. ¿Qué memoria crees que se ha llenado?', ['La SRAM: los textos se copian ahí al arrancar', 'La Flash', 'La EEPROM', 'Ninguna: es un fallo del USB'], 'Los textos viven en la Flash, pero el arranque los copia a la SRAM, que solo tiene 2 KB.', { predict: true, c: 'av_mem', h: 'De las tres memorias, ¿cuál es la más pequeña?' }),
  { t: 'explore', text: 'Este es el informe que da el compilador. Las variables globales con valor inicial y los textos entre comillas forman <b>data</b>: se guardan en la Flash y además se copian a la SRAM.', viz: 'av_size', params: { text: fx(6000), data: pSl('Textos y globales con valor (data)', 200, 0, 1600, 10, 'B'), bss: fx(400) },
    tasks: [{ q: 'free', min: -1e9, max: 299, text: 'Añade textos hasta que queden menos de 300 bytes de SRAM', done: 'Cada texto ocupa la Flash y, además, su copia en la SRAM.', hint: 'Sube data por encima de 1350 bytes.' },
      { q: 'sram', min: 0, max: 450, text: 'Ahora sácalos de la SRAM: deja data en 50 bytes o menos', done: 'Con <b>F("…")</b> o <b>PROGMEM</b> los textos se quedan solo en la Flash.', hint: 'Baja data casi del todo.' }] },
  I('El 328P tiene tres memorias:\n· <b>Flash</b> (32 KB): el programa y las constantes.\n· <b>SRAM</b> (2 KB): variables, pila y montón; se borra al apagar.\n· <b>EEPROM</b> (1 KB): ajustes que deben sobrevivir al apagado.', { svg: SV_MEM3, more: 'La Flash se reescribe por páginas y aguanta unos 10 000 ciclos de borrado; en la Uno, el bootloader ocupa 0,5 KB al final. La EEPROM aguanta unos 100 000 por celda y tarda unos 3,3 ms en escribir cada byte.' }),
  I('Las cadenas y tablas con valor inicial se copian de la Flash a la SRAM al arrancar: ocupan <b>las dos</b>. Con <b>F("…")</b> (en Serial.print) o <b>PROGMEM</b> se quedan solo en la Flash.\nComo la Flash va por otro bus, un dato PROGMEM se lee con <b>pgm_read_byte()</b>.', { code: 'Serial.println(F("Sensor listo"));          // el texto no pasa a la SRAM\n\nconst uint8_t tabla[256] PROGMEM = { /* ... */ };\nuint8_t x = pgm_read_byte(&tabla[i]);      // leer de la Flash' }),
  { t: 'steps', text: 'Serial.println("Hola, mundo") frente a Serial.println(F("Hola, mundo")). ¿Cuánta SRAM ahorras?', steps: ['Cuenta los caracteres: «Hola, mundo» son 11', 'En C, cada cadena acaba en un byte 0: 11 + 1 = 12 bytes', 'Sin F(), esos 12 bytes se copian a la SRAM al arrancar', 'Con F(), se quedan en la Flash'], result: 'Ahorras 12 bytes de SRAM' },
  Nm('¿Cuántos bytes de SRAM ahorra F("Error de sensor")? (el texto tiene 15 caracteres)', 16, 'bytes', '15 caracteres más el 0 final.', { c: 'av_mem', h: 'No olvides el byte 0 que cierra toda cadena en C.' }),
  { t: 'match', q: 'Une cada memoria con su uso.', pairs: [['Flash', 'Programa y constantes'], ['SRAM', 'Variables, pila y montón'], ['EEPROM', 'Ajustes que sobreviven al apagado'], ['R0–R31', 'Operandos de la ALU']], c: 'av_mem', h: 'Pregúntate qué se borra al apagar y qué no.' },
  Q('Una tabla const de 300 bytes sin PROGMEM…', ['Ocupa 300 bytes de Flash y otros 300 de SRAM', 'Solo ocupa Flash', 'Solo ocupa SRAM', 'Va a la EEPROM'], 'Se copia a la SRAM al arrancar, como cualquier variable con valor inicial.', { c: 'av_mem', h: 'const no basta: ¿qué hace el arranque con los valores iniciales?' }),
  Q('¿Qué falla en este código?', ['tabla[i] lee de la SRAM, no de la Flash: hay que usar pgm_read_byte(&tabla[i])', 'Nada', 'No compila', 'La tabla ocupa SRAM igualmente'], 'Con PROGMEM, la dirección es de Flash; leerla como RAM da basura.', { code: 'const uint8_t tabla[256] PROGMEM = { /* ... */ };\nuint8_t x = tabla[i];', c: 'av_mem', h: 'La Flash va por otro bus: ¿con qué función se lee?' }),
  I('La <b>EEPROM</b> conserva los datos sin corriente, pero cada celda aguanta unas <b>100 000 escrituras</b>. Vida = 100 000 × el tiempo entre escrituras de esa celda. Si repartes las escrituras entre varias celdas, cada una dura más.', { tune: { viz: 'av_wear', params: { m: { label: 'Una escritura cada', val: 10, list: [1, 5, 10, 30, 60], unit: 'min', dec: 0 }, cells: { label: 'Celdas que se turnan', val: 1, list: [1, 4, 16, 64, 256], dec: 0 } } } }),
  TU('Escribes un dato cada minuto. Consigue que la EEPROM dure más de 20 años.', 'av_wear', { m: fx(1), cells: { label: 'Celdas que se turnan', val: 1, list: [1, 4, 16, 64, 256], dec: 0 } }, { q: 'ok20', min: 1, max: 1, text: 'Objetivo: más de 20 años escribiendo cada minuto', hint: 'Una sola celda dura 69 días: reparte entre muchas más.' }, 'Con 256 celdas, cada una se escribe cada 256 min: unos 49 años.', { c: 'av_eeprom', h: 'La vida crece en proporción al número de celdas que se turnan.' }),
  G('av_eeLife'),
  Q('¿Por qué EEPROM.update() en lugar de EEPROM.write()?', ['Solo escribe si el valor cambia: no gasta vida en balde', 'Escribe más rápido', 'Escribe dos veces para asegurar', 'Borra antes la celda'], 'Lee, compara y escribe solo si hace falta.', { c: 'av_eeprom', h: 'Lo que desgasta la celda es escribir, no leer.' }),
  I('<b>Resumen</b>\n· Flash = programa; SRAM = variables (2 KB, se acaba primero); EEPROM = ajustes.\n· Los textos y tablas con valor ocupan Flash <b>y</b> SRAM, salvo con F() o PROGMEM.\n· EEPROM: unas 100 000 escrituras por celda; escribe solo lo que cambie y reparte.')
 ]),
 L('av4', 'Pila, montón y variables', 'memory', ['av_sram', 'av_sections'], [
  Q('Una función se llama a sí misma sin parar. En tu ordenador saldría un error. ¿Y en la Uno?', ['Se cuelga o se reinicia sin avisar', 'Muestra un error por Serial', 'El compilador lo impide', 'Se detiene y espera'], 'No hay protección de memoria: la pila crece hasta pisar todo lo demás.', { predict: true, c: 'av_sram', h: '¿Quién vigila la memoria en un chip tan pequeño?' }),
  { t: 'explore', text: 'La SRAM por dentro: abajo las variables globales, encima el <b>montón</b> (malloc, String), y arriba del todo la <b>pila</b> (llamadas a funciones y variables locales).', viz: 'av_sram', params: { g: pSl('Globales', 600, 0, 1800, 10, 'B'), h: pSl('Montón (malloc, String)', 200, 0, 1500, 10, 'B'), s: pSl('Pila (llamadas y locales)', 300, 0, 1500, 10, 'B') },
    tasks: [{ q: 'crash', min: 1, max: 1, text: 'Haz crecer la pila hasta que choque con el montón', done: 'Nadie avisa: la pila pisa variables y el programa hace cosas absurdas o se reinicia.', hint: 'Sube la pila: muchas llamadas anidadas o arrays locales grandes.' },
      { q: 'free', min: 0, max: 50, text: 'Ajusta hasta dejar menos de 50 bytes libres sin chocar', done: 'Funciona… hasta que una llamada más profunda o un String más largo lo rompa.', hint: 'Baja la pila hasta que desaparezca el rojo, pero poco.' }] },
  I('La SRAM va de <b>0x0100 a 0x08FF</b>: 2048 bytes. Abajo, las globales; encima, el <b>montón</b>, que crece hacia arriba; arriba del todo, la <b>pila</b>, que crece hacia abajo. Entre los dos, el espacio libre.', { svg: SV_SRAMMAP, more: 'Por debajo de 0x0100 están los 32 registros (0x0000–0x001F) y los registros de E/S (0x0020–0x00FF). Para contar un rango con los dos extremos incluidos, resta y suma 1: 0x08FF − 0x0100 + 1 = 0x0800 = 2048.' }),
  I('Cada llamada a función apila su dirección de vuelta (2 bytes), registros y sus <b>variables locales</b>; al volver, lo libera. Si una función llama a otra, sus locales conviven.', { code: 'void b() {\n  uint8_t t[100];   // 100 bytes más en la pila\n}\nvoid a() {\n  uint8_t buf[200]; // 200 bytes en la pila\n  b();              // dentro de b(): 300 bytes a la vez\n}', more: 'Una variable local static no va a la pila: vive con las globales y conserva su valor entre llamadas.' }),
  I('El <b>montón</b> se fragmenta: malloc y String reservan trozos y los liberan en otro orden. Quedan huecos, y llega un momento en que hay memoria libre en total pero ningún hueco seguido lo bastante grande.', { svg: SV_HEAP, more: 'En programas que funcionan meses sin parar, mejor arrays de tamaño fijo, globales o static: ni montón ni sorpresas.' }),
  I('Antes de main(), el arranque copia <b>.data</b> (globales con valor inicial) de la Flash a la SRAM y pone <b>.bss</b> (globales sin valor) a cero. El IDE suma las dos: «las variables globales usan…». Lo que falta hasta 2048 es para pila y montón.', { code: 'int contador = 5;   // .data: valor en Flash y variable en SRAM\nint total;          // .bss: solo SRAM, empieza a 0\nconst char t[] PROGMEM = "hola";   // solo Flash' }),
  { t: 'steps', text: 'El IDE dice: «las variables globales usan 1536 bytes». ¿Cuánto queda para pila y montón?', steps: ['La SRAM tiene 2048 bytes', 'Las globales (.data + .bss) ocupan 1536', 'Quedan 2048 − 1536 = <b>512 bytes</b>', 'Ahí deben caber la pila en su momento más profundo y todo el montón'], result: '512 bytes, sin margen para Strings grandes' },
  Nm('El IDE dice que las globales usan 1700 bytes. ¿Cuántos quedan para pila y montón?', 348, 'bytes', '2048 − 1700.', { c: 'av_sections', h: 'Resta las globales de los 2048 bytes de la SRAM.' }),
  { t: 'order', q: 'Ordena la SRAM de las direcciones bajas a las altas.', items: ['.data (globales con valor inicial)', '.bss (globales a cero)', 'Montón (crece hacia arriba)', 'Espacio libre', 'Pila (crece hacia abajo desde 0x08FF)'], e: 'Montón y pila crecen el uno hacia el otro.', c: 'av_sram', h: 'La pila empieza en la dirección más alta.' },
  Q('procesar() llama a filtrar() y las dos declaran un array local de 300 bytes. Dentro de filtrar(), ¿cuánta pila ocupan los arrays?', ['600 bytes: casi un tercio de la SRAM', '300 bytes', 'Nada: van a la Flash', '0: se liberan al salir'], 'Los locales de procesar() siguen vivos mientras filtrar() se ejecuta.', { c: 'av_sram', h: '¿Ha terminado procesar() cuando llama a filtrar()?' }),
  Q('Tras horas creando y destruyendo String, malloc(100) falla aunque quedan 300 bytes libres. ¿Por qué?', ['Fragmentación: no hay 100 bytes seguidos', 'La EEPROM está llena', 'Falta volatile', 'La Flash se ha gastado'], 'Libre no es lo mismo que contiguo.', { c: 'av_sram', h: 'Piensa en huecos sueltos en vez de en el total.' }),
  Q('¿Qué hace static en una variable local?', ['La guarda con las globales: conserva su valor entre llamadas y no ocupa pila', 'La mete en la pila', 'La guarda en la EEPROM', 'La pone a 0 en cada llamada'], 'static uint8_t n = 0; se inicializa una sola vez.', { code: 'void contar() {\n  static uint8_t n = 0;\n  n++;\n}', c: 'av_sram', h: 'Una local normal desaparece al salir; ¿y esta?' }),
  Q('int total; es una global sin valor inicial. ¿Dónde va?', ['A .bss: solo ocupa SRAM y el arranque la pone a 0', 'A .data', 'A .text, en la Flash', 'A la EEPROM'], '.data es para las que tienen valor inicial; .bss para las demás.', { c: 'av_sections', h: '¿Hay un valor inicial que guardar en la Flash?' }),
  Nm('¿Cuántos bytes hay de 0x0200 a 0x02FF, ambos incluidos?', 256, 'bytes', '0x02FF − 0x0200 + 1 = 0x100 = 256.', { c: 'av_sram', h: 'Resta las direcciones y suma 1 porque cuentas los dos extremos.' }),
  I('<b>Resumen</b>\n· SRAM: globales abajo, montón que sube, pila que baja; si chocan, nadie avisa.\n· Las locales viven en la pila mientras su función está activa.\n· String y malloc fragmentan el montón.\n· RAM libre = 2048 − (.data + .bss). En el proyecto «cazador de RAM» la medirás en marcha.')
 ]),
 L('av5', 'Patillaje y mapa de pines', 'ic', ['av_pinmap', 'av_altfn', 'av_dip', 'av_bare'], [
  Q('digitalWrite(13, HIGH) enciende el LED de la Uno. Por dentro, el chip no sabe qué es «13». ¿Qué crees que toca en realidad?', ['Un bit de un registro de 8 bits: el bit 5 del puerto B', 'La pata número 13 del chip', 'Un programa del ordenador', 'El regulador de 5 V'], 'Las patas se agrupan en puertos de 8 bits. Vamos a ver el mapa.', { predict: true, c: 'av_pinmap', h: 'Recuerda que el chip trabaja con bytes.' }),
  { t: 'explore', text: 'El 328P agrupa sus patas en tres <b>puertos</b> de 8 bits: B, C y D. Elige puerto y bit y mira a qué pin de Arduino corresponde.', viz: 'av_pinmap', params: { port: pSl('Puerto (0 = D, 1 = B, 2 = C)', 0, 0, 2), bit: pSl('Bit', 0, 0, 7) },
    tasks: [{ q: 'code', min: 13, max: 13, text: 'Encuentra el puerto y el bit del LED de la placa (D13)', done: 'D13 es <b>PB5</b>: el bit 5 del puerto B.', hint: 'D8–D13 están en el puerto B: resta 8.' },
      { q: 'code', min: 103, max: 103, text: 'Ahora encuentra A3', done: 'A0–A5 son el puerto C: A3 es <b>PC3</b>.', hint: 'Las entradas analógicas están en el puerto C.' },
      { q: 'none', min: 1, max: 1, text: 'Busca un bit que no tenga pin de Arduino', done: 'PB6 y PB7 son el cristal y PC6 es RESET: en la Uno no salen como pines.', hint: 'Mira los bits 6 y 7 del puerto B.' }] },
  I('El mapa de la Uno y la Nano:\n· <b>D0–D7 = PD0–PD7</b> (mismo número)\n· <b>D8–D13 = PB0–PB5</b> (resta 8)\n· <b>A0–A5 = PC0–PC5</b>', { svg: SV_HDR }),
  { t: 'pin', q: '¿Qué pin de la Uno es PB0?', a: 'D8', e: 'El puerto B empieza en D8.', c: 'av_pinmap', h: 'Puerto B: suma 8 al número de bit.' },
  { t: 'pin', q: '¿Y PD3?', a: 'D3', e: 'En el puerto D coincide el número.', c: 'av_pinmap', h: 'El puerto D es el más fácil de todos.' },
  { t: 'pin', q: '¿Y PC2?', a: 'A2', e: 'El puerto C son las entradas analógicas.', c: 'av_pinmap', h: 'Puerto C: pines A.' },
  G('av_pinMap'), G('av_pinMap'),
  I('Cada pata tiene <b>funciones alternativas</b>: además de E/S, puede ser parte de un periférico. Por eso unos pines sirven para PWM, otros para I²C y otros para el puerto serie.', { code: 'PD0 · PD1        → RX · TX del puerto serie\nPD2 · PD3        → INT0 · INT1 (interrupciones)\nPB3 · PB4 · PB5  → MOSI · MISO · SCK (SPI e ISP)\nPC4 · PC5        → SDA · SCL (I²C)\nPB6 · PB7        → el cristal\nPB1 PB2 PB3 PD3 PD5 PD6 → salidas de temporizador (~)' }),
  { t: 'match', q: 'Une cada grupo de patas con su función alternativa.', pairs: [['PD0 y PD1', 'USART (RX y TX)'], ['PB3, PB4 y PB5', 'SPI e ISP'], ['PC4 y PC5', 'I²C (SDA y SCL)'], ['PB6 y PB7', 'Cristal (XTAL1 y XTAL2)']], c: 'av_altfn', h: 'El puerto C también lleva el I²C; el B, el SPI.' },
  Q('¿Por qué A6 y A7 de la Nano no sirven como pines digitales?', ['Son ADC6 y ADC7: solo van al conversor, sin puerto digital', 'Están reservados para el USB', 'Son de 3,3 V', 'Son salidas PWM'], 'Existen en el encapsulado pequeño de la Nano; el DIP-28 de la Uno ni siquiera los tiene.', { c: 'av_altfn', h: '¿Aparecen en el mapa de puertos B, C o D?' }),
  I('Suelto, el chip es un <b>DIP-28</b>. Con la muesca a la izquierda, la pata 1 está abajo a la izquierda y se cuenta en sentido contrario a las agujas del reloj: 1–14 por abajo y 15–28 por arriba.', { tune: { viz: 'av_dip', params: { pata: pSl('Pata', 1, 1, 28), n: fx(28) } } }),
  TU('Busca la pata de PB5 (SCK, D13) en el DIP-28.', 'av_dip', { pata: pSl('Pata', 1, 1, 28), n: fx(28) }, { q: 'p', min: 19, max: 19, text: 'Objetivo: la pata de PB5', hint: 'PB0 es la pata 14; sigue contando.' }, 'PB0 es la 14 y PB5, la 19.', { c: 'av_dip', h: 'El puerto B empieza en la pata 14 y sigue en orden.' }),
  I('Para funcionar solo, el chip necesita: VCC (7) y <b>AVCC (20)</b> a 5 V, las dos GND (8 y 22), 100 nF pegados a cada pareja de alimentación, 10 kΩ de RESET a VCC y, si usa cristal, el cristal con 22 pF a masa. AVCC alimenta el ADC y el puerto C: siempre conectada.', { svg: SV_BARE }),
  Q('Tu 328P en protoboard funciona, pero A0–A5 se comportan raro. ¿Qué miras primero?', ['Que AVCC (pata 20) esté conectada a VCC', 'El cristal', 'La pull-up de RESET', 'El bootloader'], 'AVCC alimenta el puerto C y el ADC.', { c: 'av_bare', h: '¿Qué pata alimenta precisamente el puerto C?' }),
  I('<b>Resumen</b>\n· D0–D7 = PD, D8–D13 = PB (resta 8), A0–A5 = PC.\n· Cada pata tiene funciones alternativas: serie, SPI, I²C, PWM, cristal.\n· DIP-28: pata 1 abajo a la izquierda, sentido antihorario.\n· AVCC siempre conectada.')
 ]),
 SIM('av-s1', 'Reto: encuentra PB5 en la Nano', 'La Nano ejecuta el parpadeo de siempre: por dentro, digitalWrite(13, …) escribe el bit 5 de PORTB. Busca la pata PB5 en la Nano pinchada y pon ahí un LED con su resistencia hacia GND.', { arduino: 'blink', board: 'nano', parts: ['res', 'led'], code: true, hint: 'PB5 es D13: en la Nano está en la fila de arriba, en un extremo. Resistencia de 220–470 Ω en serie con el LED y el cátodo a GND.' }, 'av_pb5'),
 PRJ('av-p1', 'Proyecto: cazador de RAM', 'av_ram')
], exam: [
  Q('Dos variables x e y viven en la SRAM y quieres guardar x + y en otra variable z, también en la SRAM. ¿Cuántas transferencias entre la SRAM y los registros hacen falta como mínimo?', ['Tres: cargar x, cargar y y guardar el resultado en z', 'Ninguna: la ALU suma directamente en la SRAM', 'Una: la suma se guarda sola en z', 'Dos: cargar x y guardar z'], 'La ALU solo opera sobre R0–R31: hay que traer los dos operandos (dos cargas), sumar en registros y devolver el resultado (un guardado).', { c: 'av_core', h: 'La ALU no toca la SRAM: cuenta cuántos datos tienen que entrar y salir de los registros.', l: 'av1' }),
  Q('¿Cuánto vale b al final?', ['246', '−10', '0', '10'], 'Un byte sin signo no tiene negativos: 10 − 20 = −10, que da la vuelta a −10 + 256 = 246. La bandera C recuerda que hizo falta «pedir prestado».', { code: 'uint8_t b = 10;\nb = b - 20;', c: 'av_wrap', h: 'Si baja de 0, suma una vuelta completa de 256.', l: 'av1' }),
  Q('Cambias un contador de uint8_t a uint32_t. ¿Qué le pasa a cada contador++?', ['Pasa de una instrucción a cuatro: una por byte, encadenando el acarreo', 'Nada: la ALU suma 32 bits de golpe', 'Pasa a dos instrucciones', 'Pasa a 32 instrucciones, una por bit'], 'La ALU es de 8 bits: un uint32_t son cuatro bytes, y cada uno necesita su suma con el acarreo del anterior.', { c: 'av_8bit', h: '¿Cuántos bytes tiene un uint32_t y cuántos suma la ALU de una vez?', l: 'av1' }),
  Q('Llamas a cli() al principio de una función. Aunque un periférico tenga su interrupción activada, no salta ninguna. ¿Por qué?', ['cli() pone a 0 el bit I de SREG: el permiso global', 'cli() borra la Flash', 'cli() apaga los periféricos', 'cli() pone a 0 la bandera Z'], 'El bit I es el permiso global: con I = 0 no salta ninguna interrupción hasta que sei() lo vuelva a poner a 1.', { c: 'av_isr', h: 'Busca el bit de SREG que no habla del resultado de una cuenta.', l: 'av1' }),
  Nm('Una rutina tarda 2400 ciclos. ¿Cuántos µs son a 8 MHz?', 300, 'µs', '2400 / 8 = 300 µs (cada ciclo dura 125 ns).', { c: 'av_cycle', h: 'Ciclos entre MHz da microsegundos.', l: 'av2' }),
  Nm('Un bucle tarda 5 ciclos por vuelta. ¿Cuántas vueltas da en 1 ms a 16 MHz?', 3200, 'vueltas', 'En 1 ms hay 16 000 ciclos: 16 000 / 5 = 3200 vueltas.', { c: 'av_cycle', h: 'Primero, cuántos ciclos caben en 1 ms a 16 MHz.', l: 'av2' }),
  Nm('Con la recta de la hoja de datos (10 MHz a 2,7 V y 20 MHz a 4,5 V), ¿frecuencia máxima a 3,6 V, en MHz?', 15, 'MHz', '3,6 V está a mitad de camino entre 2,7 y 4,5 V: 10 + (0,9 / 1,8) × 10 = 15 MHz.', { tol: 0.3, c: 'av_vmax', h: 'Mira qué fracción del tramo de 2,7 a 4,5 V has recorrido y súmala a 10 MHz.', l: 'av2' }),
  Q('Una placa a 5 V con un cristal de 20 MHz. ¿Está dentro de especificación?', ['Sí: de 4,5 a 5,5 V el 328P admite hasta 20 MHz', 'No: el máximo absoluto es 16 MHz', 'Solo con el RC interno', 'No: 20 MHz exige 3,3 V'], 'La Uno va a 16 MHz por costumbre, no porque sea el límite: con 4,5 V o más se permite hasta 20 MHz.', { c: 'av_vmax', h: 'Recuerda hasta dónde llega la recta con la tensión más alta.', l: 'av2' }),
  Q('Con el RC interno sin calibrar (±10 %) cronometras 10 minutos. ¿Cuánto puede equivocarse?', ['Hasta 1 minuto', 'Hasta 1 segundo', 'Hasta 6 segundos', 'Nada: el chip cuenta ciclos exactos'], '600 s × 0,1 = 60 s. Contar ciclos es exacto, pero si cada ciclo dura un 10 % de más o de menos, el tiempo también.', { c: 'av_clksrc', h: 'Pasa los 10 minutos a segundos y multiplica por el error en tanto por uno.', l: 'av2' }),
  Nm('Un cristal de ±20 ppm. ¿Cuántos segundos puede desviarse en un día como mucho?', 1.728, 's', '86 400 s × 20 / 1 000 000 = 1,728 s al día.', { tol: 0.05, c: 'av_clksrc', h: '20 ppm son 20 partes por millón de los 86 400 s de un día.', l: 'av2' }),
  TU('Un temporizador de cocina debe desviarse menos de 30 s en una hora. Elige la fuente de reloj más sencilla que lo cumpla.', 'av_clk', { src: pSl('Fuente (0 = RC de fábrica … 4 = RTC)', 0, 0, 4), span: fx(0) }, { q: 'e', min: 0, max: 30, text: 'Objetivo: menos de 30 s de error en una hora', hint: '30 s en una hora es menos de un 1 %.' }, 'El RC calibrado (±1 %) se va hasta 36 s y no llega; el resonador (±0,5 %), 18 s: basta. Un cristal sería todavía mejor.', { c: 'av_clksrc', h: 'Calcula 3600 s por el error de cada fuente.', l: 'av2' }),
  Q('Compilas con F_CPU = 1 MHz, pero el chip va a 8 MHz. En un parpadeo con delay(500), ¿cuánto dura cada fase?', ['62,5 ms: todo va 8 veces más deprisa', '4 s: todo va 8 veces más despacio', '500 ms, porque delay() mide tiempo real', '1 s'], 'delay() cuenta los ciclos que habría en 500 ms a 1 MHz (500 000), pero a 8 MHz pasan en 62,5 ms.', { c: 'av_fcpu', h: 'F_CPU dice cuántos ciclos esperar; el reloj real, lo que dura cada ciclo.', l: 'av2' }),
  Q('Una tabla global de 1500 bytes con valores iniciales (un seno precalculado), sin PROGMEM. Compila sin errores. ¿Qué riesgo tiene?', ['Ocupa 1500 de los 2048 bytes de SRAM: a la pila y al montón les queda muy poco', 'Ninguno: las tablas van a la Flash', 'Gasta la EEPROM', 'Que el programa vaya más lento'], 'Los valores viven en la Flash, pero el arranque los copia a la SRAM. Con PROGMEM y pgm_read_byte() se quedarían solo en la Flash.', { c: 'av_mem', h: 'Recuerda qué hace el arranque con las globales que tienen valor inicial.', l: 'av3' }),
  Q('¿Cuál de estas líneas no gasta nada de SRAM por el texto «Listo»?', ['Serial.println(F("Listo"));', 'Serial.println("Listo");', 'char t[] = "Listo";', 'const char t[] = "Listo";'], 'F() deja el texto en la Flash. Las otras tres acaban copiando sus 6 bytes a la SRAM al arrancar, también la const sin PROGMEM.', { c: 'av_mem', h: 'const no basta para que algo se quede en la Flash.', l: 'av3' }),
  { t: 'match', q: 'Une cada dato con la memoria donde debe vivir.', pairs: [['Tabla de seno que nunca cambia', 'Flash, con PROGMEM'], ['Calibración que debe sobrevivir al apagado', 'EEPROM'], ['Búfer que cambia cientos de veces por segundo', 'SRAM'], ['Las instrucciones de loop()', 'Flash']], c: 'av_mem', h: 'Pregúntate si cambia, cuánto cambia y si debe sobrevivir al apagado.', l: 'av3' },
  Nm('Guardas un contador en la misma celda de EEPROM cada 30 s. Con 100 000 escrituras por celda, ¿cuántos días aguanta?', 34.7, 'días', '100 000 × 30 s = 3 000 000 s; entre 86 400 s por día, unos 34,7 días.', { tol: 0.5, c: 'av_eeprom', h: 'Vida = escrituras × tiempo entre escrituras; luego pásalo a días.', l: 'av3' }),
  TU('Escribes un dato cada 5 minutos. Elige cuántas celdas se turnan para que la EEPROM dure más de 50 años.', 'av_wear', { m: fx(5), cells: { label: 'Celdas que se turnan', val: 1, list: [1, 4, 16, 64, 256], dec: 0 } }, { q: 'years', min: 50, max: 1e9, text: 'Objetivo: más de 50 años', hint: 'Una sola celda dura menos de un año.' }, 'Con 64 celdas, cada una se escribe cada 320 min: unos 61 años. Con 16 se queda en unos 15.', { c: 'av_eeprom', h: 'La vida crece en proporción al número de celdas que se turnan.', l: 'av3' }),
  Q('Guardas la posición de un mando en la EEPROM con EEPROM.update() en cada vuelta de loop(). Mientras alguien lo gira, ¿qué pasa?', ['Cada valor nuevo es una escritura real: la celda puede gastarse pronto; guarda solo cuando el valor se quede quieto', 'Nada: update() nunca desgasta la celda', 'La EEPROM se borra al reiniciar', 'update() bloquea el puerto serie'], 'update() solo se ahorra las escrituras de valores iguales. Si el valor cambia sin parar, escribe sin parar.', { c: 'av_eeprom', h: '¿Qué escrituras se ahorra update() y cuáles no?', l: 'av3' }),
  Nm('a() declara un array local de 120 bytes y llama a b(), con uno de 200, que llama a c(), con uno de 80. Dentro de c(), ¿cuántos bytes de arrays hay en la pila a la vez?', 400, 'bytes', 'Las tres funciones siguen activas: 120 + 200 + 80 = 400 bytes, sin contar direcciones de vuelta ni registros.', { c: 'av_sram', h: 'Una función que ha llamado a otra no ha terminado: sus locales siguen ahí.', l: 'av4' }),
  Nm('Una función recursiva gasta 20 bytes de pila por llamada y entre la pila y el montón quedan 600 bytes libres. ¿Cuántos niveles de llamada caben antes de que choquen?', 30, 'niveles', '600 / 20 = 30. En el siguiente, la pila pisa el montón y nadie avisa.', { c: 'av_sram', h: 'Divide el hueco libre entre lo que ocupa cada llamada.', l: 'av4' }),
  Q('¿Cuál de estas variables va a la sección .data?', ['int umbral = 512; (global)', 'int total; (global)', 'const char m[] PROGMEM = "ok";', 'int x = 3; (local de una función)'], '.data guarda las globales con valor inicial: su valor en la Flash y la variable en la SRAM. total va a .bss, la PROGMEM se queda en la Flash y la local vive en la pila.', { c: 'av_sections', h: 'Busca una global con valor inicial.', l: 'av4' }),
  { t: 'order', q: 'Ordena lo que pasa desde que se suelta RESET hasta que empieza tu código.', items: ['El chip empieza a ejecutar el código de arranque', 'Copia .data de la Flash a la SRAM', 'Pone .bss a cero', 'Llama a main() (en Arduino, después llega setup())'], e: 'Antes de main() las globales ya tienen su valor: las de .data, copiado de la Flash, y las de .bss, a cero.', c: 'av_sections', h: 'Las variables tienen que estar listas antes de que tu código las use.', l: 'av4' },
  Q('Un registrador funciona meses sin parar y monta sus mensajes con String. Al cabo de días se cuelga. ¿Qué cambio lo evita mejor?', ['Usar arrays char de tamaño fijo (globales o static) en lugar de String', 'Usar más String, pero más cortos', 'Llamar a delay() tras cada mensaje', 'Guardar los mensajes en la EEPROM'], 'String reserva y libera trozos del montón y lo fragmenta. Un array fijo no usa el montón: ocupa siempre lo mismo y no deja huecos.', { c: 'av_sram', h: '¿Qué parte de la SRAM se fragmenta y quién la usa?', l: 'av4' }),
  { t: 'pin', q: '¿Qué pin de la Uno es PB3?', a: 'D11', e: 'Puerto B: suma 8 al número de bit. PB3 = D11, que además es MOSI.', c: 'av_pinmap', h: 'D8–D13 son el puerto B.', l: 'av5' },
  { t: 'pin', q: 'Un programa escribe el bit 4 del puerto C. ¿Qué pin de la Uno cambia?', a: 'A4', e: 'El puerto C son las entradas analógicas: PC4 = A4 (también SDA del I²C).', c: 'av_pinmap', h: 'Puerto C: pines A, con el mismo número que el bit.', l: 'av5' },
  Q('Usas I²C (por ejemplo, una pantalla) y además quieres seis entradas analógicas en una Uno. ¿Problema?', ['A4 y A5 son SDA y SCL: con I²C solo te quedan A0–A3 como analógicas', 'Ninguno', 'El I²C usa D0 y D1', 'El I²C apaga el ADC'], 'PC4 y PC5 tienen el I²C como función alternativa: si el bus las usa, no pueden medir a la vez.', { c: 'av_altfn', h: 'Recuerda qué patas tienen el I²C como función alternativa.', l: 'av5' }),
  Q('Pones un pulsador en D0 y, desde entonces, cargar programas y el monitor serie fallan. ¿Por qué?', ['D0 es PD0, el RX del puerto serie que usa el USB', 'D0 no admite pulsadores', 'Falta la pull-up', 'D0 es una pata del cristal'], 'PD0 y PD1 son RX y TX del puerto serie: lo que cuelgues de ellas interfiere con la comunicación con el ordenador.', { c: 'av_altfn', h: 'Mira la función alternativa de PD0.', l: 'av5' }),
  Nm('¿En qué pata del DIP-28 está PB2 (D10)?', 16, '', 'PB0 es la 14, PB1 la 15 y PB2 la 16.', { c: 'av_dip', h: 'El puerto B empieza en la pata 14.', l: 'av5' }),
  Q('Tu 328P suelto en protoboard se reinicia solo cuando acercas la mano. ¿Qué falta?', ['La pull-up de 10 kΩ de RESET a VCC', 'El condensador de AREF', 'Un cristal más rápido', 'El bootloader'], 'RESET es activa a 0: sin una pull-up firme queda al aire y el ruido la dispara.', { c: 'av_bare', h: 'Una pata al aire capta ruido: ¿cuál reinicia el chip?', l: 'av5' })
] };

  /* ===================== MÓDULO 2 · Puertos a golpe de registro ===================== */
  const SV_PORTREG = `<svg viewBox="0 0 300 140" class="viz">${bitHead(70, 18, 8, 22, 5)}
    <text x="6" y="40" class="vizsm">DDRB</text>${bitRow(70, 26, 0x20, { hl: 0x20 })}
    <text x="6" y="70" class="vizsm">PORTB</text>${bitRow(70, 56, 0x20, { hl: 0x20, col: 'var(--led)' })}
    <text x="6" y="100" class="vizsm">PINB</text>${bitRow(70, 86, 0x20, { col: 'var(--ok)' })}
    <text x="6" y="132" class="vizsm">Bit 5 = PB5 = D13: salida (DDR) a 1 (PORT) y se lee 1 (PIN)</text></svg>`;
  const SV_GHOST = `<svg viewBox="0 0 300 130" class="viz">${[0, 1, 2].map(r => `<path d="M40 ${30 + r * 34}H190" stroke="var(--line)" stroke-width="1.6"/>`).join('')}${[0, 1, 2].map(c => `<path d="M${70 + c * 50} 14V112" stroke="var(--line)" stroke-width="1.6"/>`).join('')}
    ${[[0, 0], [0, 2], [2, 0]].map(([r, c]) => `<rect x="${58 + c * 50}" y="${19 + r * 34}" width="24" height="22" rx="5" fill="var(--led)" opacity=".75"/>`).join('')}
    <rect x="158" y="87" width="24" height="22" rx="5" fill="none" stroke="var(--err)" stroke-width="2" stroke-dasharray="4 3"/><text x="200" y="102" class="vizsm" style="fill:var(--err)">¡fantasma!</text>
    <text x="200" y="36" class="vizsm">3 pulsadas en</text><text x="200" y="52" class="vizsm">las esquinas</text><text x="10" y="126" class="vizsm">La corriente da la vuelta por las otras tres teclas</text></svg>`;

  const M2 = { id: 'av-m2', title: 'Puertos a golpe de registro', desc: 'DDR, PORT y PIN, operaciones de bits, entradas, velocidad, atomicidad y matrices.', nodes: [
 L('av6', 'DDRx, PORTx y PINx', 'code', ['av_ports'], [
  Q('Configuras una pata como entrada y escribes un 1 en su bit del registro PORT. ¿Qué crees que pasa?', ['Se activa una resistencia interna que la sujeta a 5 V', 'La pata saca 5 V como una salida', 'No pasa nada: en una entrada PORT no hace nada', 'El chip se reinicia'], 'En una entrada, PORT a 1 activa la pull-up interna. Pruébalo.', { predict: true, c: 'av_ports', h: 'Recuerda pinMode(pin, INPUT_PULLUP): algo tiene que hacer eso por dentro.' }),
  { t: 'explore', text: 'Una pata por dentro: <b>DDRx</b> elige si habla o escucha, <b>PORTx</b> qué dice (o si activa la pull-up) y <b>PINx</b> lo que se lee. Hay un pulsador a masa conectado.', viz: 'av_pin', params: { ddr: L01('DDRx (1 = salida)', 0), port: L01('PORTx', 0), btn: L01('Pulsador (1 = pulsado)', 0) },
    tasks: [{ q: 'st', min: 1, max: 1, text: 'Activa la pull-up', done: 'DDR = 0 y PORT = 1: entrada con pull-up. Sin pulsar, PINx lee 1.', hint: 'Deja DDR a 0 y pon PORT a 1.' },
      { q: 'puPress', min: 1, max: 1, text: 'Pulsa el botón con la pull-up activa', done: 'El pulsador lleva la pata a masa: PINx lee 0. Con pull-up, <b>pulsado = 0</b>.' },
      { q: 'out1', min: 1, max: 1, text: 'Suelta el botón y convierte la pata en una salida a 1', done: 'DDR = 1 y PORT = 1: la pata saca 5 V.', hint: 'DDR a 1, PORT a 1 y el pulsador suelto.' },
      { q: 'short', min: 1, max: 1, text: 'Ahora pulsa el botón con la salida a 1', done: '¡Corto! La salida empuja 5 V contra masa. Nunca pongas un pulsador a masa en una pata configurada como salida a 1.' }] },
  I('Cada puerto se controla con tres registros de 8 bits, un bit por pata:\n· <b>DDRx</b>: dirección (1 = salida, 0 = entrada).\n· <b>PORTx</b>: en una salida, el nivel; en una entrada, la pull-up.\n· <b>PINx</b>: el nivel real de las patas.', { svg: SV_PORTREG }),
  I('Escribir un registro entero cambia las <b>ocho patas a la vez</b>, en un ciclo; con digitalWrite irías de una en una. Escribe el byte en binario y lee de derecha a izquierda: el bit de la derecha es el 0.', { code: 'DDRD  = 0b11110000;   // D4–D7 salidas, D0–D3 entradas\nPORTD = 0b00001111;   // pull-ups en D0–D3, D4–D7 a 0' }),
  { t: 'steps', text: 'Quieres D8–D13 como salidas a la vez. ¿Qué valor pones en DDRB?', steps: ['D8–D13 son PB0–PB5: los bits 0 a 5', 'Un 1 en cada uno: 0b00111111', 'Suma sus valores: 1 + 2 + 4 + 8 + 16 + 32 = <b>63</b>', 'En hexadecimal: <b>0x3F</b>'], result: 'DDRB = 0x3F' },
  Q('¿Qué hace este código?', ['Enciende el LED de D13: PB5 como salida y a 1', 'Lee el pin D13', 'Activa la pull-up de D13', 'Enciende el pin D5'], 'Bit 5 a 1 en DDRB y en PORTB.', { code: 'DDRB  = 0b00100000;\nPORTB = 0b00100000;', c: 'av_ports', h: 'Busca qué bit está a 1 y en qué puerto.' }),
  { t: 'bits', q: 'Escribe DDRD para que D5, D6 y D7 sean salidas y el resto entradas.', n: 8, target: 224, e: 'Bits 7, 6 y 5: 128 + 64 + 32 = 224 = 0xE0.', c: 'av_ports', h: 'En el puerto D, el número del pin es el número del bit.' },
  { t: 'match', q: 'Une cada combinación de DDR y PORT con el estado de la pata.', pairs: [['DDR 0 · PORT 0', 'Entrada flotante'], ['DDR 0 · PORT 1', 'Entrada con pull-up'], ['DDR 1 · PORT 0', 'Salida a 0 V'], ['DDR 1 · PORT 1', 'Salida a 5 V']], c: 'av_ports', h: 'DDR decide si es entrada o salida; PORT, lo demás.' },
  Q('¿Qué hace PORTD = 0xFF si DDRD = 0x00?', ['Activa las pull-ups de las ocho patas', 'Pone las ocho a 5 V como salidas', 'Nada', 'Las pone a 0'], 'En una entrada, PORT a 1 es pull-up.', { c: 'av_ports', h: 'Con DDR a 0, todas son entradas.' }),
  I('Truco del 328P: escribir un <b>1 en un bit de PINx conmuta</b> ese bit de PORTx (los 0 no hacen nada). Así se hace parpadear una salida sin leerla antes. _delay_ms() es la espera de avr-libc, como delay().', { code: 'DDRB |= (1 << PB5);      // D13 como salida\nfor (;;) {\n  PINB = (1 << PB5);      // conmuta D13\n  _delay_ms(500);\n}' }),
  Q('¿Qué hace este bucle?', ['D13 cambia de estado cada 500 ms: parpadea', 'D13 se queda encendido', 'Lee D13 cada 500 ms', 'No compila: PINB es de solo lectura'], 'Escribir 1 en PINx conmuta la salida.', { code: 'DDRB |= (1 << PB5);\nfor (;;) {\n  PINB = (1 << PB5);\n  _delay_ms(500);\n}', c: 'av_ports', h: 'En el 328P, escribir un 1 en PINx no es leer.' }),
  Q('¿Dónde lees si un pulsador en D8 está pulsado?', ['En PINB, bit 0', 'En PORTB, bit 0', 'En DDRB, bit 0', 'En PIND, bit 8'], 'D8 = PB0, y las entradas se leen en PIN.', { c: 'av_ports', h: 'Primero el puerto y bit de D8; luego, qué registro lee.' }),
  Q('DDRD = 0x0F. ¿Qué pines son salidas?', ['D0–D3', 'D4–D7', 'Todos', 'Ninguno'], '0x0F = 0b00001111: los cuatro bits bajos.', { c: 'av_ports', h: 'Pasa 0x0F a binario.' }),
  Q('PB0 es una salida a 1, pero un cortocircuito externo la tira a 0 V. ¿Qué lee PINB en el bit 0?', ['0: PINx lee el nivel real de la pata', '1: lo que escribiste en PORTB', 'Un valor al azar', 'Da error'], 'PORTx dice lo que tú escribiste; PINx, lo que hay de verdad.', { c: 'av_ports', h: '¿Qué registro mira la pata y cuál solo recuerda tu orden?' }),
  I('<b>Resumen</b>\n· DDRx: 1 = salida. PORTx: nivel de salida o pull-up. PINx: lo que hay de verdad.\n· Un byte cambia 8 patas a la vez.\n· Escribir 1 en PINx conmuta la salida.\n· Nunca una salida a 1 contra un pulsador a masa.')
 ]),
 L('av7', 'Operaciones de bits', 'bin', ['av_bits', 'av_prec'], [
  Q('PORTB vale 0b00001111 (cuatro LEDs encendidos). Ejecutas PORTB = (1 << 5); para encender otro más. ¿Qué crees que pasa?', ['Se enciende el de PB5 y se apagan los otros cuatro', 'Se enciende PB5 y los demás siguen igual', 'No pasa nada', 'Se apagan todos'], 'El = sustituye el byte entero: solo queda el bit 5. Para tocar un bit sin alterar los demás hacen falta máscaras.', { predict: true, c: 'av_bits', h: 'Un = escribe los ocho bits a la vez.' }),
  { t: 'explore', text: 'PORTB vale 0x2F (0b00101111). Elige la operación y el bit, y mira cómo queda.', viz: 'av_bits', params: { v: fx(47), bit: pSl('Bit', 5, 0, 7), op: pSl('Operación (1 = OR, 2 = AND con ~, 3 = XOR, 4 = leer)', 1, 1, 4) },
    tasks: [{ q: 'res', min: 175, max: 175, text: 'Pon a 1 el bit 7 sin tocar los demás', done: '<b>OR</b> con (1 &lt;&lt; 7) enciende ese bit y respeta el resto.', hint: 'Operación 1 y bit 7.' },
      { q: 'res', min: 46, max: 46, text: 'Ahora pon a 0 el bit 0', done: '<b>AND con la máscara negada</b> apaga solo ese bit. (XOR también lo cambia, pero lo invierte: si ya estaba a 0, lo encendería.)', hint: 'Operación 2 y bit 0.' },
      { q: 'res', min: 0, max: 0, text: 'Lee un bit que esté a 0: el resultado debe dar 0', done: '<b>REG &amp; máscara</b> da 0 si el bit está a 0 y algo distinto de 0 si está a 1.', hint: 'Operación 4 y un bit que valga 0: el 4, el 6 o el 7.' }] },
  I('La <b>máscara</b> (1 &lt;&lt; n) es un byte con un solo 1, en el bit n.\n· Poner a 1: <b>REG |= máscara</b>\n· Poner a 0: <b>REG &amp;= ~máscara</b>\n· Conmutar: <b>REG ^= máscara</b>\n· Leer: <b>REG &amp; máscara</b>', { code: 'PORTB |=  (1 << 5);   // enciende el bit 5\nPORTB &= ~(1 << 5);   // lo apaga\nPORTB ^=  (1 << 5);   // lo invierte\nif (PINB & (1 << 0))  // ¿está a 1 el bit 0?' }),
  I('Para ver qué pasa, pon los dos bytes uno debajo del otro y opera <b>columna a columna</b>. Donde la máscara tiene 0, el bit se queda como estaba.', { code: '  0b00001111   PORTB\n| 0b00100000   (1 << 5)\n= 0b00101111   solo cambia el bit 5' }),
  { t: 'steps', text: 'PORTB = 0b00001111. Apaga el bit 0 sin tocar los demás.', steps: ['Máscara del bit 0: 1 &lt;&lt; 0 = 0b00000001', 'Niégala con ~: <b>0b11111110</b>', 'AND columna a columna: 0b00001111 &amp; 0b11111110', '= <b>0b00001110</b>: solo cambió el bit 0'], result: 'PORTB &= ~(1 << 0);' },
  TU('PORTB vale 0x2F. Elige el bit que hay que poner a 0 para que quede en 0x0F.', 'av_bits', bitsP(2, 47, true, 0), { q: 'res', min: 15, max: 15, text: 'Objetivo: PORTB = 0x0F', hint: '0x2F − 0x0F = 0x20: el bit 5.' }, 'PORTB &= ~(1 << 5); apaga solo el bit 5.', { c: 'av_bits', h: 'Compara 0x2F y 0x0F en binario: ¿qué bit sobra?' }),
  TU('PORTB vale 0x81. Conmuta un bit para que pase a 0x83.', 'av_bits', bitsP(3, 129, true, 0), { q: 'res', min: 131, max: 131, text: 'Objetivo: PORTB = 0x83', hint: 'La diferencia es 2 = 1 << 1.' }, 'XOR con (1 << 1).', { c: 'av_bits', h: '0x83 − 0x81 = 2: ¿qué bit vale 2?' }),
  G('av_mask'), G('av_mask'),
  I('Varias máscaras se unen con | y avr/io.h da nombre a cada bit: PB5 = 5, y la macro <b>_BV(n)</b> equivale a (1 &lt;&lt; n). Así el código se lee como la hoja de datos.', { code: 'DDRB |= (1 << PB0) | (1 << PB1);   // dos salidas de una vez\nPORTB |= _BV(PB5);                 // lo mismo que (1 << PB5)' }),
  { t: 'bits', q: 'Construye la máscara (1 << 3) | (1 << 0).', n: 8, target: 9, e: '8 + 1 = 9 = 0x09.', c: 'av_bits', h: 'Enciende el bit 3 y el bit 0.' },
  Q('¿Por qué PORTB = (1 << PB5); puede ser un error?', ['Pone a 0 todos los demás bits de PORTB: apaga otras salidas y pull-ups', 'Es más lento que |=', 'No hace nada', 'Siempre es correcto'], 'El = sustituye el byte entero.', { c: 'av_bits', h: '¿Qué valen los otros siete bits de (1 << PB5)?' }),
  I('Cuidado con la <b>precedencia</b>: en C, == y != se evalúan <b>antes</b> que &amp;, | y ^. Al comprobar un bit, paréntesis siempre.', { code: 'if (PIND & (1 << PD2) == 0)     // MAL: es PIND & ((1 << PD2) == 0)\nif ((PIND & (1 << PD2)) == 0)   // bien: aísla el bit y luego compara' }),
  Q('¿Qué hace este if?', ['Nunca se cumple: == se evalúa antes que &', 'Funciona bien', 'Lee el bit 0', 'Siempre se cumple'], 'Se evalúa como PIND & ((1 << PD2) == 0), es decir, PIND & 0.', { code: 'if (PIND & (1 << PD2) == 0) {\n  // pulsado\n}', c: 'av_prec', h: '¿Qué operador se evalúa primero: == o &?' }),
  Q('¿Qué escritura comprueba bien que el bit 3 de PINB está a 1?', ['if ((PINB & (1 << 3)) != 0)', 'if (PINB & (1 << 3) != 0)', 'if (PINB & 1 << 3 != 0)', 'if (PINB == 3)'], 'Sin paréntesis, != se evalúa antes que &.', { c: 'av_prec', h: 'Busca la que aísla el bit entre paréntesis antes de comparar.' }),
  I('<b>Resumen</b>\n· |= enciende, &amp;= ~ apaga, ^= conmuta y &amp; lee: solo cambian los bits de la máscara.\n· Un = a secas sustituye el byte entero.\n· Opera columna a columna en binario.\n· Paréntesis siempre al comparar bits.')
 ]),
 L('av8', 'Entradas: pull-ups y lectura en paralelo', 'chip', ['av_input'], [
  Q('Dejas una entrada sin conectar a nada y la lees diez veces seguidas. ¿Qué crees que saldrá?', ['Unos y ceros al azar', 'Siempre 0', 'Siempre 1', 'Un error'], 'Una entrada CMOS al aire capta ruido: flota.', { predict: true, c: 'av_input', h: '¿Quién fija la tensión de una pata que no toca nada?' }),
  { t: 'explore', text: 'Una entrada digital decide 0 o 1 según la tensión. Mueve la tensión y la alimentación y mira en qué zona cae.', viz: 'av_thresh', params: { vcc: { label: 'Alimentación', val: 5, list: [3.3, 5], unit: 'V', dec: 1 }, vin: pSl('Tensión en la entrada', 0.5, 0, 5.5, 0.05, 'V', 2) },
    tasks: [{ q: 'z', min: 2, max: 2, text: 'Lleva la entrada a la zona sin garantía', done: 'Entre 0,3·VCC y 0,6·VCC el chip no promete nada: puede leer 0 o 1.', hint: 'A 5 V, entre 1,5 y 3 V.' },
      { q: 'z', min: 1, max: 1, text: 'Sube hasta un 1 seguro', done: 'Por encima de 0,6·VCC: 3 V cuando el chip va a 5 V.' },
      { q: 'lowOne', min: 1, max: 1, text: 'Con 3,3 V de alimentación, consigue un 1 seguro con menos de 2,1 V', done: 'A 3,3 V basta con unos 2 V: 0,6 × 3,3 ≈ 1,98 V.', hint: 'Cambia la alimentación a 3,3 V y baja la entrada.' }],
    more: 'Las entradas del 328P tienen disparador Schmitt: el umbral de subida es algo más alto que el de bajada. Esa histéresis evita que una señal lenta o con un poco de ruido haga temblar la lectura.' },
  I('Una entrada sin conectar <b>flota</b>. La <b>pull-up</b> interna (de 20 a 50 kΩ) la sujeta a 1: DDR = 0 y PORT = 1. Con un pulsador a masa: suelto = 1, <b>pulsado = 0</b>. Con una pull-down externa y el pulsador a VCC, al revés.', { tune: { viz: 'av_pin', params: { ddr: fx(0), port: L01('PORTx (pull-up)', 1), btn: L01('Pulsador (1 = pulsado)', 0) } } }),
  I('Leer <b>PINx</b> da las ocho entradas a la vez y en el mismo instante: ideal para teclados, codificadores o buses paralelos. Con pull-ups, ~PINx convierte «pulsado = 0» en 1.', { code: 'uint8_t teclas = ~PINB & 0x0F;   // 1 por cada pulsador pulsado en PB0–PB3' }),
  { t: 'steps', text: 'Pull-ups en PB0–PB3 y pulsadores a masa. Pulsas los de PB1 y PB3. ¿Qué vale ~PINB & 0x0F?', steps: ['Suelto = 1, pulsado = 0: los bits 3–0 de PINB valen 0b0101', '~ invierte todos los bits: los bits 3–0 pasan a 0b1010', '&amp; 0x0F se queda solo con los cuatro bits bajos: 0b00001010', '= <b>10</b>: un 1 por cada pulsador pulsado (PB1 y PB3)'], result: 'teclas = 10 (0b00001010)' },
  Q('Pulsador entre PD2 y GND con pull-up. Pulsado, el bit 2 de PIND vale…', ['0', '1', 'Depende del ruido', '2'], 'El pulsador lleva la pata a masa.', { c: 'av_input', h: 'Pulsado, ¿a qué está unida la pata?' }),
  Q('Llega una señal de 2,2 V a una entrada alimentada a 5 V. Se lee…', ['Puede leerse 0 o 1: está en la zona sin garantía', 'Siempre 1', 'Siempre 0', 'Nada: rompe la pata'], 'Ni por debajo de 1,5 V ni por encima de 3 V.', { c: 'av_input', h: 'Calcula 0,3 × 5 y 0,6 × 5.' }),
  Q('Con pull-ups en PB0–PB3 y pulsadores a masa, ¿qué contiene teclas?', ['Un 1 por cada pulsador de PB0–PB3 que esté pulsado', 'El estado de PB4–PB7', 'Las pull-ups activadas', 'Pone PB0–PB3 a 0'], '~ invierte (pulsado = 1) y & 0x0F se queda con los cuatro bits bajos.', { code: 'uint8_t teclas = ~PINB & 0x0F;', c: 'av_input', h: 'Pulsado se lee 0; ¿qué hace ~ con eso?' }),
  Q('Pulsador a 5 V con una pull-down externa de 10 kΩ a masa. Pulsado se lee…', ['1', '0', 'Flota', 'Nada'], 'Lógica directa: pulsado = 5 V.', { c: 'av_input', h: 'Pulsado, la pata queda unida a 5 V.' }),
  Nm('Pull-up interna de 35 kΩ a 5 V con el pulsador cerrado a masa. ¿Corriente, en µA?', 143, 'µA', '5 V / 35 kΩ ≈ 0,143 mA. Poca, pero en un aparato a pilas cuenta.', { tol: 2, c: 'av_input', h: 'Ley de Ohm: 5 V entre 35 000 Ω, y pasa a µA.' }),
  I('Dos detalles finos. Si la pull-up interna es demasiado débil (cables largos, ruido), pon una externa de 4,7 a 10 kΩ. Y PINx pasa por un <b>sincronizador</b>: lo que escribes en PORTx se ve en PINx un ciclo después.', { code: 'PORTB |= (1 << PB0);\n__asm__ __volatile__("nop");   // un ciclo de espera\nuint8_t x = PINB;              // ahora sí refleja el cambio', more: 'El bit PUD de MCUCR desactiva todas las pull-ups internas de golpe.' }),
  Q('Escribes PORTB y en la instrucción siguiente lees PINB, pero no ves el cambio. ¿Por qué?', ['La entrada pasa por un sincronizador que tarda un ciclo: hace falta un nop entre medias', 'El puerto está roto', 'Falta la pull-up', 'PINB solo lee entradas'], 'La lectura llega un ciclo tarde.', { c: 'av_input', h: 'Piensa en el tiempo que tarda el cambio en llegar a PINx.' }),
  Q('Alimentado a 3,3 V, ¿desde qué tensión se garantiza un 1?', ['Unos 2 V (0,6 × 3,3 V)', '3,3 V', '1 V', '2,5 V siempre'], '0,6 × 3,3 ≈ 1,98 V.', { c: 'av_input', h: 'El umbral es una fracción de VCC.' }),
  I('<b>Resumen</b>\n· Una entrada al aire flota: ponle pull-up (DDR = 0, PORT = 1) o pull-down.\n· Con pull-up y pulsador a masa, pulsado = 0.\n· 0 seguro por debajo de 0,3·VCC; 1 seguro por encima de 0,6·VCC.\n· PINx lee ocho entradas a la vez.')
 ]),
 L('av9', 'Velocidad y atomicidad', 'bolt', ['av_cycle', 'av_ardtim', 'av_rmw'], [
  Q('digitalWrite() frente a escribir el registro directamente (PORTB |= …). ¿Cuánto más rápido crees que es el registro?', ['Decenas de veces', 'Igual', 'El doble', 'Más lento'], 'Una escritura directa es una instrucción de 2 ciclos; digitalWrite() hace mucho trabajo antes.', { predict: true, c: 'av_cycle', h: 'Piensa en todo lo que tiene que averiguar digitalWrite() a partir de un número de pin.' }),
  I('digitalWrite() busca en tablas qué puerto y bit es el pin, apaga el PWM si lo tenía (por eso mira el temporizador del pin), desactiva las interrupciones y lee–modifica–escribe: unos microsegundos. Un bit con una constante es <b>sbi</b>: 2 ciclos.', { code: 'digitalWrite(13, HIGH);   // decenas de ciclos\nPORTB |= (1 << PB5);      // sbi: 2 ciclos, 125 ns' }),
  { t: 'steps', text: 'Un bucle conmuta D13 con sbi PINB, 5 (2 ciclos) y vuelve con rjmp (2 ciclos). ¿Qué frecuencia sale a 16 MHz?', steps: ['sbi PINB, 5 conmuta la pata: 2 ciclos', 'rjmp vuelve al principio: 2 ciclos más', 'Una conmutación cada 4 ciclos; un periodo completo son dos conmutaciones: <b>8 ciclos</b>', '16 MHz / 8 = <b>2 MHz</b>'], result: 'Una onda cuadrada de 2 MHz' },
  Nm('El mismo bucle a 20 MHz. ¿Frecuencia de la onda, en MHz?', 2.5, 'MHz', '20 / 8 = 2,5 MHz.', { c: 'av_cycle', h: 'Un periodo son 8 ciclos: divide los MHz entre 8.' }),
  Q('¿Por qué digitalWrite() mira el temporizador del pin?', ['Para apagar el PWM de ese pin si estaba activo', 'Para medir el tiempo', 'Para ir más rápido', 'No lo mira'], 'Si no, analogWrite seguiría mandando sobre la pata.', { c: 'av_ardtim', h: 'Recuerda qué genera el PWM de analogWrite.' }),
  { t: 'explore', text: 'main() hace PORTB |= 0x20 y una interrupción pone a 1 el bit 0. Elige cuándo llega la interrupción y cómo está escrito el código de main().', viz: 'av_race', params: { modo: pSl('Código (0 = |=, 1 = con cli/sei, 2 = sbi)', 0, 0, 2), isr: pSl('Llega la ISR (0 = antes … 3 = después)', 0, 0, 3) },
    tasks: [{ q: 'lost', min: 1, max: 1, text: 'Haz que se pierda el cambio de la ISR', done: 'Si la ISR cae entre leer y escribir, main() escribe su copia vieja y borra el bit 0.', hint: 'Pon la ISR en 1 o 2: entre las instrucciones.' },
      { q: 'saved', min: 1, max: 1, text: 'Ahora protégelo sin mover la ISR', done: 'Con cli/sei la interrupción espera; con sbi no existe un «en medio».', hint: 'Cambia el código a 1 o a 2.' }] },
  I('Una operación es <b>atómica</b> si no puede quedar a medias. PORTB |= 0x21 (dos bits) son tres instrucciones: in (leer), ori (modificar) y out (escribir). Si una ISR cambia PORTB en medio, al escribir la copia vieja se borra su cambio.', { code: 'in   r24, PORTB    ; 1. leer\nori  r24, 0x21     ; 2. modificar (aquí puede saltar una ISR)\nout  PORTB, r24    ; 3. escribir la copia vieja' }),
  I('Remedios: una <b>sección crítica</b> corta (cli … sei) o una instrucción única: <b>sbi</b>/<b>cbi</b> o escribir en PINx. Ojo: sbi y cbi solo llegan a las 32 primeras direcciones de E/S: los puertos sí; los registros de los temporizadores, no.', { code: 'cli();               // nadie interrumpe\nPORTB |= 0x21;\nsei();\n\nPORTB |= (1 << PB5); // un bit con constante: sbi, atómica' }),
  { t: 'order', q: 'Ordena cómo se pierde el cambio de una interrupción.', items: ['main() lee PORTB en un registro', 'Salta una interrupción que pone a 1 el bit 0 de PORTB', 'main() hace el OR sobre su copia vieja', 'main() escribe la copia: el bit 0 vuelve a 0'], e: 'Leer–modificar–escribir no es atómico.', c: 'av_rmw', h: 'Todo empieza cuando main() guarda una copia.' },
  Q('¿Cómo evitas perder ese cambio?', ['Desactivando las interrupciones durante el leer–modificar–escribir, o usando sbi/cbi o PINx', 'Con delay()', 'Declarando PORTB volatile', 'Escribiendo más rápido'], 'Sección crítica corta o una instrucción atómica.', { c: 'av_rmw', h: 'O nadie interrumpe, o no hay «en medio».' }),
  Q('¿Por qué PINB = (1 << PB5) es seguro aunque haya interrupciones?', ['Es una sola escritura: conmuta los bits a 1 y no lee nada antes', 'Porque es lento', 'Porque desactiva las interrupciones', 'No es seguro'], 'No hay copia vieja que pueda pisar nada.', { c: 'av_rmw', h: '¿Hay algún paso de lectura?' }),
  Q('¿Cuál de estas líneas es atómica por sí sola?', ['PORTD |= (1 << 4);', 'PORTD |= 0x30;', 'contador++;', 'PORTD = PORTD + 1;'], 'Un solo bit de un puerto con constante se compila a sbi; las demás leen, operan y escriben.', { c: 'av_rmw', h: 'Busca la que se puede hacer con una sola instrucción sbi.' }),
  Q('Un registro de la E/S extendida (dirección de datos 0x80 o más) con REG |= (1 << n); ¿es atómico?', ['No: sbi no llega ahí y el compilador usa lds, ori, sts', 'Sí, siempre', 'Sí, porque es un solo bit', 'Depende del reloj'], 'sbi y cbi solo alcanzan las primeras 32 direcciones de E/S.', { c: 'av_rmw', h: '¿Hasta dónde llega sbi?' }),
  I('<b>Resumen</b>\n· Un registro con constante: 2 ciclos; digitalWrite(): decenas.\n· Leer–modificar–escribir no es atómico: una ISR en medio pierde su cambio.\n· Remedios: cli … sei, sbi/cbi o escribir en PINx.')
 ]),
 L('av10', 'Multiplexado y matrices', 'bus', ['av_keymatrix', 'av_mux'], [
  Q('Un teclado de 16 teclas. ¿Cuántas patas crees que necesitas como mínimo para leerlo con el truco de la matriz?', ['8', '16', '4', '17'], '4 filas y 4 columnas: 8 patas para 16 teclas.', { predict: true, c: 'av_keymatrix', h: 'Coloca las teclas en una cuadrícula de 4 × 4.' }),
  { t: 'explore', text: 'Teclado de 4 × 4: las filas son salidas y las columnas, entradas con pull-up. Hay dos teclas pulsadas en secreto. Elige qué fila pones a 0 y mira qué columnas leen 0.', viz: 'av_keys', params: { fila: pSl('Fila a 0', 0, 0, 3) },
    tasks: [{ q: 'r1', min: 1, max: 1, text: 'Encuentra la fila de una tecla pulsada', done: 'Con la fila 1 a 0, la columna 2 lee 0: está pulsada la tecla 6.', hint: 'Prueba filas hasta que una columna lea 0.' },
      { q: 'r3', min: 1, max: 1, text: 'Encuentra la otra', done: 'Fila 3 y columna 0: la tecla *.' }] },
  I('<b>Escaneo</b>: pones una sola fila a 0 y lees las columnas. La que lea 0 está unida a esa fila por una tecla pulsada. Repites con cada fila cientos de veces por segundo.', { code: 'for (uint8_t f = 0; f < 4; f++) {\n  PORTB = (PORTB | 0x0F) & ~(1 << f);   // solo la fila f a 0\n  _delay_us(5);                         // deja que se asiente\n  uint8_t col = (~PIND >> 4) & 0x0F;    // columnas en PD4–PD7\n  if (col) tecla(f, col);               // 1 = columna a 0\n}' }),
  I('Si pulsas tres teclas en tres esquinas de un rectángulo, la corriente puede dar la vuelta por ellas y aparece una cuarta <b>fantasma</b>. Un <b>diodo en serie con cada tecla</b> deja pasar la corriente en un solo sentido y lo evita.', { svg: SV_GHOST }),
  Q('Con la fila 2 a 0, la columna 3 lee 0. ¿Qué tecla está pulsada?', ['La del cruce de la fila 2 y la columna 3', 'Todas las de la fila 2', 'Ninguna', 'Todas las de la columna 3'], 'Solo esa tecla une esa fila con esa columna.', { c: 'av_keymatrix', h: 'Una tecla une una fila con una columna.' }),
  Q('Pulsas tres teclas en tres esquinas de un rectángulo y aparece una cuarta «fantasma». ¿Solución?', ['Un diodo en serie con cada tecla', 'Más pull-ups', 'Escanear más deprisa', 'Usar menos teclas'], 'El diodo impide que la corriente vuelva por otro camino.', { c: 'av_keymatrix', h: 'Hay que impedir que la corriente circule al revés.' }),
  I('Con displays, el mismo truco: enciendes <b>un dígito cada vez</b>, tan deprisa que el ojo los ve todos. Con n dígitos y t por dígito, cada uno se refresca cada n·t; como está encendido 1/n del tiempo, su brillo medio baja a 1/n.', { tune: { viz: 'av_mux', params: { n: pSl('Dígitos', 4, 1, 8), t: pSl('Tiempo por dígito', 2, 0.5, 10, 0.5, 'ms', 1) } } }),
  { t: 'steps', text: '4 dígitos y 2 ms por dígito. ¿Cada cuánto se refresca cada uno?', steps: ['Un ciclo completo pasa por los 4: 4 × 2 ms = 8 ms', 'Cada dígito se repite cada 8 ms', 'f = 1 / 0,008 s = <b>125 Hz</b>', 'Más de 50 Hz: el ojo no nota parpadeo'], result: '125 Hz, sin parpadeo' },
  TU('Ocho dígitos sin parpadeo: consigue al menos 100 Hz de refresco.', 'av_mux', { n: fx(8), t: pSl('Tiempo por dígito', 5, 0.5, 10, 0.5, 'ms', 1) }, { q: 'ok8', min: 1, max: 1, text: 'Objetivo: 8 dígitos a 100 Hz o más', hint: '100 Hz son 10 ms por ciclo, repartidos entre 8 dígitos.' }, 'Con 1 ms por dígito, 125 Hz; con 1,5 ms ya no llega.', { c: 'av_mux', h: 'Refresco = 1 / (n × t): con n = 8, t debe ser pequeño.' }),
  Nm('8 dígitos multiplexados, 2 ms por dígito. ¿Refresco de cada uno, en Hz?', 62.5, 'Hz', 'Un ciclo completo dura 16 ms: 1 / 0,016 = 62,5 Hz.', { c: 'av_mux', h: 'Primero el ciclo completo (n × t) y luego su inversa.' }),
  Q('Cada dígito está encendido 1/4 del tiempo. ¿Qué pasa con su brillo?', ['El brillo medio baja a la cuarta parte: se compensa con más corriente de pico, dentro de los límites', 'No cambia', 'Sube', 'Se apaga'], 'El ojo promedia.', { c: 'av_mux', h: 'El ojo ve la media de luz en el tiempo.' }),
  Q('Dígito de cátodo común con 8 segmentos a 15 mA. ¿Su cátodo puede ir directo a una pata?', ['No: serían 120 mA; hace falta un transistor', 'Sí', 'Sí, con una resistencia', 'Solo a 3,3 V'], 'Una pata aguanta 40 mA como máximo absoluto.', { c: 'av_mux', h: 'Suma las corrientes de todos los segmentos del dígito.' }),
  I('<b>Charlieplexing</b>: una pata puede estar a 1, a 0 o en alta impedancia (como entrada). Con n patas controlas n·(n − 1) LEDs, encendiendo uno cada vez.', { code: '3 patas → 3 × 2 = 6 LEDs\n4 patas → 4 × 3 = 12 LEDs\n5 patas → 5 × 4 = 20 LEDs' }),
  Nm('Con 6 patas, ¿cuántos LEDs en charlieplexing?', 30, 'LEDs', '6 × 5 = 30.', { c: 'av_mux', h: 'n × (n − 1).' }),
  Q('En un display multiplexado ves segmentos tenues en el dígito equivocado. ¿Arreglo?', ['Apagar el dígito antes de cambiar los segmentos y encender el siguiente después', 'Más resistencia', 'Más tensión', 'Es inevitable'], 'Son fantasmas del instante en que conviven datos viejos y dígito nuevo.', { c: 'av_mux', h: 'Piensa en el orden de las tres operaciones al cambiar de dígito.' }),
  I('<b>Resumen</b>\n· Matriz: una fila a 0, la columna que lee 0 marca la tecla; diodos contra fantasmas.\n· Multiplexado: refresco = 1 / (n·t) y brillo medio = 1/n.\n· El común de un dígito necesita transistor.\n· Charlieplexing: n·(n − 1) LEDs con n patas.')
 ]),
 SIM('av-s2', 'Reto: el puerto B en fila', 'El programa del barrido usa D8–D12, es decir, PB0–PB4, y espera el pulsador en D2 (PD2) con pull-up. Monta los cinco LEDs en esas patas de la Nano, cada uno con su resistencia, y el pulsador a GND.', { arduino: 'coche', board: 'nano', parts: ['res', 'led', 'push'], code: true, hint: 'D8 a D12 están seguidas en la fila de abajo de la Nano. Cada LED con su resistencia a GND. Pulsador entre D2 y GND: mantenlo pulsado para que barra.' }, 'av_portb'),
 PRJ('av-p2', 'Proyecto: dado electrónico a registro', 'av_dice'),
 PRJ('av-p3', 'Proyecto: cerradura con teclado matricial', 'av_lock')
], exam: [
  { t: 'bits', q: 'Escribe DDRB para que D9, D10 y D13 sean salidas y el resto, entradas.', n: 8, target: 38, e: 'D9 = PB1, D10 = PB2 y D13 = PB5: 2 + 4 + 32 = 38 = 0x26.', c: 'av_ports', h: 'Pasa cada pin a su bit del puerto B restando 8.', l: 'av6' },
  Q('¿Qué hacen estas dos líneas?', ['Todo el puerto D como entradas, con pull-up en D2 y D3', 'D2 y D3 como salidas a 1', 'D0–D3 como salidas', 'Nada: PORTD no hace nada en las entradas'], '0x0C = 0b00001100: bits 2 y 3. Con DDR a 0 son entradas, y PORT a 1 activa su pull-up.', { code: 'DDRD  = 0x00;\nPORTD = 0x0C;', c: 'av_ports', h: 'Pasa 0x0C a binario y recuerda qué hace PORT en una entrada.', l: 'av6' }),
  Q('PB0 y PB5 son salidas. ¿Qué hace PINB = 0x21;?', ['Conmuta PB0 y PB5 a la vez y deja el resto como estaba', 'Pone PB0 y PB5 a 1 y el resto a 0', 'Lee PB0 y PB5', 'Nada: PINB solo se lee'], 'Escribir un 1 en un bit de PINx conmuta ese bit de PORTx; los ceros no hacen nada.', { c: 'av_ports', h: '0x21 = 0b00100001. ¿Qué hace un 1 escrito en PINx?', l: 'av6' }),
  { t: 'match', q: 'Une cada tarea con el registro que tienes que tocar.', pairs: [['Hacer que D7 sea salida', 'DDRD'], ['Leer un pulsador en D9', 'PINB'], ['Activar la pull-up de A1', 'PORTC'], ['Conmutar D4 sin leerla antes', 'PIND']], c: 'av_ports', h: 'Primero el puerto de cada pin; luego, si es dirección, nivel o lectura.', l: 'av6' },
  Q('PORTD vale 0x1F. ¿Cuánto vale tras PORTD ^= 0x30;?', ['0x2F', '0x3F', '0x0F', '0x30'], 'XOR invierte los bits 4 y 5: el 4 estaba a 1 y pasa a 0; el 5 estaba a 0 y pasa a 1. 0b00011111 → 0b00101111.', { c: 'av_bits', h: 'Escribe los dos bytes en binario y opera columna a columna.', l: 'av7' }),
  { t: 'bits', q: 'PORTB vale 0b10110100. Marca cómo queda tras PORTB &= ~((1 << 2) | (1 << 7));', n: 8, target: 48, e: 'La máscara negada pone a 0 los bits 2 y 7 y respeta el resto: 0b00110000 = 48.', c: 'av_bits', h: 'Solo cambian los bits de la máscara: apágalos y copia los demás.', l: 'av7' },
  Q('¿Qué línea pone a 1 PB1 y a 0 PB2 sin tocar los demás bits?', ['PORTB = (PORTB | (1 << PB1)) & ~(1 << PB2);', 'PORTB = (1 << PB1);', 'PORTB |= (1 << PB1) | ~(1 << PB2);', 'PORTB &= (1 << PB1) & ~(1 << PB2);'], 'OR enciende PB1 y AND con la máscara negada apaga PB2. Las otras borran bits ajenos o los encienden casi todos.', { c: 'av_bits', h: 'Para encender, OR; para apagar, AND con ~.', l: 'av7' }),
  TU('PORTB vale 0x44. Elige qué bit poner a 1 con OR para que quede en 0x64.', 'av_bits', bitsP(1, 68, true, 0), { q: 'res', min: 100, max: 100, text: 'Objetivo: PORTB = 0x64', hint: 'Compara 0x44 y 0x64 en binario.' }, '0x64 − 0x44 = 0x20 = 1 << 5: PORTB |= (1 << 5);', { c: 'av_bits', h: 'La diferencia entre los dos valores es la máscara.', l: 'av7' }),
  Q('¿Qué bit comprueba en realidad este if?', ['El bit 0: != se evalúa antes que &, así que queda PINB & 1', 'El bit 2, como se quería', 'Ninguno: nunca se cumple', 'Todos los bits a la vez'], '0x04 != 0 vale 1, y PINB & 1 aísla el bit 0. Bien escrito: (PINB & 0x04) != 0.', { code: 'if (PINB & 0x04 != 0) {\n  // ¿PB2 a 1?\n}', c: 'av_prec', h: 'Resuelve primero el != y mira qué queda.', l: 'av7' }),
  Q('Un sensor alimentado a 3,3 V manda su salida a una Uno a 5 V. ¿Lee un 1 seguro?', ['Sí, pero con poco margen: el 1 seguro empieza en 3 V (0,6 × 5 V)', 'No, nunca', 'Solo con una pull-down', 'Solo si activas la pull-up'], '3,3 V supera los 3 V del umbral por solo 0,3 V. Con ruido o cables largos, mejor un adaptador de nivel.', { c: 'av_input', h: 'Calcula 0,6 × VCC de la Uno.', l: 'av8' }),
  Nm('Pull-ups en PD4–PD7 y pulsadores a masa. Pulsas los de PD4 y PD6. ¿Cuánto vale (~PIND >> 4) & 0x0F?', 5, '', 'Pulsado = 0, y ~ lo convierte en 1: quedan a 1 los bits 4 y 6. Al desplazar 4, pasan a ser los bits 0 y 2: 0b0101 = 5.', { c: 'av_input', h: 'Invierte, desplaza 4 bits a la derecha y quédate con los 4 bajos.', l: 'av8' }),
  Q('Un pulsador a masa puede quedarse pulsado horas en un aparato a pilas de 5 V. ¿Qué pull-up externa eliges?', ['10 kΩ: pulsado gasta 0,5 mA, frente a los 5 mA de una de 1 kΩ', '1 kΩ: cuanto más fuerte, mejor', '100 Ω', 'Ninguna: la entrada no consume'], 'Con el pulsador cerrado, toda la tensión cae en la pull-up: I = 5 V / R. 10 kΩ sigue siendo firme y gasta diez veces menos.', { c: 'av_input', h: 'Ley de Ohm sobre la pull-up con el pulsador cerrado.', l: 'av8' }),
  Nm('Un bucle conmuta una pata escribiendo en PINx (2 ciclos), hace un nop (1 ciclo) y vuelve con rjmp (2 ciclos). ¿Frecuencia de la onda a 16 MHz, en MHz?', 1.6, 'MHz', '5 ciclos por conmutación y 10 por periodo: 16 / 10 = 1,6 MHz.', { tol: 0.01, c: 'av_cycle', h: 'Un periodo completo son dos vueltas del bucle.', l: 'av9' }),
  Q('main() hace PORTB |= (1 << PB0) | (1 << PB1); y una ISR conmuta PB5. ¿Es seguro?', ['No: con dos bits es leer–modificar–escribir y la ISR puede perder su cambio', 'Sí: es una sola línea de C', 'Sí: PB5 no está en la máscara', 'Sí, si PORTB es volatile'], 'Con más de un bit el compilador no puede usar sbi: lee, hace OR y escribe. Si la ISR conmuta PB5 entre medias, main() escribe la copia vieja.', { c: 'av_rmw', h: 'Una línea de C no es una instrucción: ¿cuántas genera esta?', l: 'av9' }),
  Q('analogWrite(9, 100) y luego digitalWrite(9, HIGH). ¿Qué hace D9?', ['Queda fija a 1: digitalWrite desconecta el PWM del temporizador', 'Sigue con el PWM de 100', 'Mezcla los dos', 'Queda a 0'], 'Por eso digitalWrite() mira el temporizador del pin: si no, el PWM seguiría mandando sobre la pata.', { c: 'av_ardtim', h: 'Recuerda qué comprueba digitalWrite() antes de escribir.', l: 'av9' }),
  { t: 'order', q: 'Ordena una sección crítica para cambiar dos bits de PORTB sin perder el cambio de una ISR.', items: ['cli(): ninguna interrupción puede entrar', 'Leer PORTB', 'Modificar los dos bits', 'Escribir PORTB', 'sei(): se atienden las que esperaban'], e: 'Entre cli() y sei() nadie puede colarse entre leer y escribir. Lo que llegue mientras tanto, espera.', c: 'av_rmw', h: 'Primero cierra la puerta y ábrela al final.', l: 'av9' },
  Nm('Un teclado de 64 teclas en una matriz cuadrada. ¿Cuántas patas necesitas?', 16, 'patas', '8 filas × 8 columnas = 64 teclas con 8 + 8 = 16 patas.', { c: 'av_keymatrix', h: 'Coloca las 64 teclas en un cuadrado.', l: 'av10' }),
  Q('Durante el escaneo, ¿cómo deben estar las filas que no estás leyendo?', ['A 1 (o en alta impedancia), para que solo la fila activa pueda llevar una columna a 0', 'A 0, como la activa', 'Da igual', 'Como salidas PWM'], 'Si otra fila también estuviera a 0, una tecla suya pulsada bajaría la columna y la confundirías con una tecla de la fila activa.', { c: 'av_keymatrix', h: 'Una columna a 0 debe tener un único culpable posible.', l: 'av10' }),
  Q('Sin la pequeña espera tras cambiar de fila, el escaneo a veces atribuye una tecla a la fila anterior. ¿Por qué?', ['Las líneas tardan un poco en cambiar de nivel (capacidad de los cables y pull-up débil)', 'El chip lee demasiado despacio', 'Por los rebotes', 'Porque faltan diodos'], 'Una pull-up de decenas de kΩ y la capacidad del cable forman un RC: la columna tarda unos µs en volver a 1.', { c: 'av_keymatrix', h: 'Piensa en cuánto tarda una pull-up débil en subir una línea con capacidad.', l: 'av10' }),
  Nm('6 dígitos multiplexados y quieres 100 Hz de refresco. ¿Tiempo máximo por dígito, en ms?', 1.667, 'ms', 'El ciclo completo debe durar 10 ms como mucho: 10 / 6 ≈ 1,67 ms por dígito.', { tol: 0.02, c: 'av_mux', h: 'Primero el periodo de 100 Hz; luego repártelo entre los dígitos.', l: 'av10' }),
  Q('4 dígitos multiplexados: quieres el brillo que daría un segmento con 5 mA fijos. ¿Qué corriente de pico necesitas, más o menos?', ['20 mA: cada dígito luce 1/4 del tiempo', '5 mA', '1,25 mA', '80 mA'], 'El ojo promedia: 20 mA × 1/4 = 5 mA de media. Revisa que el LED y la pata aguanten ese pico.', { c: 'av_mux', h: 'Brillo medio = corriente de pico × fracción del tiempo encendido.', l: 'av10' }),
  Nm('¿Cuántas patas necesitas, como mínimo, para 20 LEDs en charlieplexing?', 5, 'patas', 'n·(n − 1): con 4 patas, 12; con 5, justo 20.', { c: 'av_mux', h: 'Prueba n = 4, 5… en n·(n − 1).', l: 'av10' }),
  TU('Seis dígitos: consigue más de 120 Hz de refresco.', 'av_mux', { n: fx(6), t: pSl('Tiempo por dígito', 5, 0.5, 10, 0.5, 'ms', 1) }, { q: 'hz', min: 120, max: 1e9, text: 'Objetivo: más de 120 Hz con 6 dígitos', hint: '120 Hz son unos 8,3 ms por ciclo, repartidos entre 6.' }, 'Con 1 ms por dígito: 1 / (6 × 1 ms) ≈ 167 Hz. Con 1,5 ms solo llegas a 111 Hz.', { c: 'av_mux', h: 'Refresco = 1 / (n × t).', l: 'av10' })
] };

  /* ===================== MÓDULO 3 · Temporizadores ===================== */
  const SV_TBLK = `<svg viewBox="0 0 300 150" class="viz">
    <rect x="6" y="20" width="56" height="30" rx="5" fill="none" stroke="var(--line)"/><text x="34" y="39" text-anchor="middle" class="vizsm">16 MHz</text>
    <path d="M62 35h14" stroke="currentColor" stroke-width="1.6"/><rect x="76" y="20" width="62" height="30" rx="5" fill="var(--ice)" fill-opacity=".2" stroke="var(--ice)"/><text x="107" y="39" text-anchor="middle" class="vizsm">prescaler</text>
    <path d="M138 35h14" stroke="currentColor" stroke-width="1.6"/><rect x="152" y="20" width="62" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="183" y="39" text-anchor="middle" class="vizlab">TCNTn</text>
    <path d="M183 50v18" stroke="currentColor" stroke-width="1.6"/><rect x="140" y="68" width="86" height="30" rx="5" fill="none" stroke="var(--err)"/><text x="183" y="87" text-anchor="middle" class="vizsm">¿coincide?</text>
    <path d="M226 83h16" stroke="currentColor" stroke-width="1.6"/><rect x="242" y="68" width="52" height="30" rx="5" fill="var(--led)" fill-opacity=".3" stroke="var(--led)"/><text x="268" y="87" text-anchor="middle" class="vizsm">bandera</text>
    <path d="M268 98v14" stroke="currentColor" stroke-width="1.6"/><text x="268" y="126" text-anchor="middle" class="vizsm">ISR o patilla</text>
    <text x="6" y="126" class="vizsm">Cuenta solo, sin gastar CPU</text><text x="6" y="142" class="vizsm">Timer0 y Timer2: 8 bits · Timer1: 16 bits</text></svg>`;
  const SV_CTC = `<svg viewBox="0 0 300 140" class="viz"><path d="M20 110H285M20 110V20" stroke="var(--muted)" fill="none"/><path d="M20 50H285" stroke="var(--err)" stroke-dasharray="5 4"/><text x="285" y="44" text-anchor="end" class="vizsm" style="fill:var(--err)">OCRnA</text>
    <path d="M20 110L80 50V110L140 50V110L200 50V110L260 50V110" fill="none" stroke="var(--ice)" stroke-width="2.4"/>
    <path d="M20 134V124H80V134H140V124H200V134H260V124" fill="none" stroke="var(--led)" stroke-width="2"/>
    <text x="24" y="18" class="vizsm">TCNT sube hasta OCR y vuelve a 0: OCR + 1 cuentas</text></svg>`;

  const M3 = { id: 'av-m3', title: 'Temporizadores', desc: 'Timer0, Timer1 y Timer2: prescaler, CTC, Fast PWM, Phase Correct, Input Capture y lo que Arduino hace con ellos.', nodes: [
 L('av11', 'Anatomía de un temporizador', 'timer', ['av_timer', 'av_treg', 'av_tflag'], [
  Q('Necesitas que algo pase exactamente cada milisegundo mientras loop() hace otras cosas. ¿Quién crees que lleva la cuenta?', ['Un contador de hardware que avanza solo, sin gastar CPU', 'Un bucle con delay(1)', 'El ordenador, por el USB', 'La EEPROM'], 'Los temporizadores cuentan solos; la CPU solo se entera cuando pasa algo.', { predict: true, c: 'av_timer', h: '¿Qué pieza podría contar sin que la CPU haga nada?' }),
  { t: 'explore', text: 'Un temporizador en modo normal: el reloj pasa por un divisor (<b>prescaler</b>) y el contador da la vuelta al llenarse. Va a cámara lenta para que lo veas.', viz: 'av_count', params: { N: { label: 'Prescaler', val: 1, list: [1, 8, 64, 256, 1024], dec: 0 }, bits: { label: 'Bits del contador', val: 8, list: [8, 16], dec: 0 } },
    tasks: [{ q: 'ovf', min: 1.02e-3, max: 1.03e-3, text: 'Consigue el latido de millis(): una vuelta cada 1,024 ms', done: '8 bits con prescaler 64: 256 × 4 µs = 1,024 ms. Es el Timer0 de Arduino.', hint: '8 bits y prescaler 64.' },
      { q: 'ovf', min: 1, max: 1e9, text: 'Consigue una vuelta de más de un segundo', done: 'Solo el contador de 16 bits con prescaler 256 o 1024: 65 536 × 16 µs ≈ 1,05 s.', hint: '16 bits y un prescaler grande.' }] },
  I('Un temporizador es un contador de hardware: su valor está en <b>TCNTn</b> y avanza solo. El 328P tiene tres: <b>Timer0</b> y <b>Timer2</b> de 8 bits (0–255) y <b>Timer1</b> de 16 bits (0–65 535). Al llegar al final da la vuelta: es el <b>desbordamiento</b>.', { svg: SV_TBLK }),
  I('El <b>prescaler</b> N divide el reloj antes de contar: cada cuenta dura <b>N / F_CPU</b>. Se elige con los bits CS: 1, 8, 64, 256 o 1024 (el Timer2 tiene además 32 y 128).', { code: 'A 16 MHz:\nN = 1    → 1 cuenta = 62,5 ns\nN = 8    → 0,5 µs\nN = 64   → 4 µs\nN = 256  → 16 µs\nN = 1024 → 64 µs' }),
  { t: 'steps', text: 'Timer0 en modo normal con prescaler 64 a 16 MHz. ¿Cada cuánto se desborda?', steps: ['Cada cuenta dura 64 / 16 MHz = <b>4 µs</b>', 'El Timer0 es de 8 bits: da la vuelta cada 256 cuentas', '256 × 4 µs = 1024 µs = <b>1,024 ms</b>', 'Es el latido con el que Arduino cuenta millis()'], result: '1,024 ms' },
  Nm('Prescaler 256 a 16 MHz: ¿cuánto dura una cuenta, en µs?', 16, 'µs', '256 / 16 MHz = 16 µs.', { c: 'av_timer', h: 'Divide el prescaler entre los MHz y obtienes µs.' }),
  G('av_ovf'),
  Q('Timer1 a 16 MHz, sin prescaler, en modo normal. ¿Cada cuánto se desborda?', ['Cada 4,096 ms', 'Cada 16 µs', 'Cada segundo', 'Cada 65,5 s'], '65 536 × 62,5 ns.', { c: 'av_timer', h: 'El Timer1 cuenta 65 536 veces por vuelta.' }),
  I('Los registros de un temporizador:\n· <b>TCNTn</b>: la cuenta. · <b>TCCRnA/B</b>: modo (bits WGM), salidas (COM) y prescaler (CS).\n· <b>OCRnA/B</b>: valores de comparación. · <b>TIMSKn</b>: qué interrupciones. · <b>TIFRn</b>: banderas.\nISR(NOMBRE_vect) es como se escribe la función que salta; la verás a fondo en el módulo 4.', { code: 'TCCR1A = 0;                // modo normal\nTCCR1B = (1 << CS11);      // prescaler 8\nTIMSK1 = (1 << TOIE1);     // interrumpe al desbordarse\n\nISR(TIMER1_OVF_vect) {     // salta cada 32,768 ms\n  vueltas++;\n}', more: 'El Timer0 y el Timer1 comparten el mismo bloque de prescaler: reiniciarlo afecta a los dos. El Timer2 tiene el suyo propio y puede funcionar con un cristal de reloj de 32 768 Hz.' }),
  { t: 'match', q: 'Une cada registro con su papel.', pairs: [['TCNTn', 'El valor del contador'], ['TCCRnB', 'Prescaler (bits CS)'], ['TIMSKn', 'Qué interrupciones están activas'], ['TIFRn', 'Banderas de lo que ha pasado']], c: 'av_treg', h: 'T de Timer + CNT (cuenta), CCR (control), MSK (máscara), IFR (banderas).' },
  Q('Timer0 y Timer1 comparten…', ['El mismo prescaler: reiniciarlo afecta a los dos', 'Las mismas patas', 'El mismo contador', 'Nada'], 'El Timer2 tiene su prescaler propio.', { c: 'av_treg', h: 'Uno de los tres temporizadores tiene su divisor aparte.' }),
  I('Al desbordarse, el hardware pone a 1 la bandera <b>TOVn</b> en TIFRn. Si su interrupción está activa, salta y la bandera se borra sola. A mano se borra… <b>escribiendo un 1</b>.', { code: 'TIFR1 = (1 << TOV1);    // borra solo TOV1\nTIFR1 |= (1 << TOV1);   // ¡trampa! relee las demás a 1 y también las borra' }),
  Q('Las banderas de TIFRn se borran…', ['Escribiendo un 1 en ellas, o solas al ejecutarse su ISR', 'Escribiendo un 0', 'Leyéndolas', 'Solas cada segundo'], 'Es una rareza de los AVR: un 1 borra.', { c: 'av_tflag', h: 'Es al revés de lo que parece.' }),
  Q('¿Qué problema tiene esta línea?', ['Si hay otras banderas a 1, el OR las vuelve a escribir con 1 y las borra también', 'Ninguno', 'No borra nada', 'Pone TOV1 a 1'], 'Usa TIFR1 = (1 << TOV1);', { code: 'TIFR1 |= (1 << TOV1);', c: 'av_tflag', h: '|= lee el registro entero y lo vuelve a escribir.' }),
  I('<b>Resumen</b>\n· Un temporizador cuenta solo: TCNTn.\n· 1 cuenta = N / F_CPU; una vuelta = 256 o 65 536 cuentas.\n· TCCRnA/B configuran, OCRn comparan, TIMSKn habilita y TIFRn guarda banderas.\n· Las banderas se borran escribiendo un 1.')
 ]),
 L('av12', 'Modo CTC: frecuencias exactas', 'timer', ['av_ctc'], [
  Q('El Timer0 con prescaler 64 da una vuelta cada 1,024 ms. Quieres exactamente 1 ms. ¿Cómo crees que se consigue?', ['Haciendo que el contador vuelva a 0 al alcanzar un valor elegido', 'Cambiando el cristal', 'Con delay(1)', 'No se puede'], 'Es el modo CTC: tú decides dónde da la vuelta.', { predict: true, c: 'av_ctc', h: '¿Y si el contador no llegase hasta 255?' }),
  { t: 'explore', text: 'Modo <b>CTC</b>: el contador (azul) sube hasta OCR0A y vuelve a 0. En cada coincidencia salta la interrupción y la patilla OC0A puede conmutar (naranja).', viz: 'av_timer', params: { N: pN(64), ocr: pOcr(124) },
    tasks: [{ q: 'f', min: 999.9, max: 1000.1, text: 'Consigue interrupciones a 1 kHz exactos', done: 'Prescaler 64 y OCR0A = 249: 16 000 000 / (64 × 250) = 1000 Hz.', hint: 'Con prescaler 64 hacen falta 250 cuentas.' },
      { q: 'fpin', min: 437, max: 443, text: 'Haz sonar un La de 440 Hz en la patilla', done: 'Prescaler 256 y OCR0A = 70: 440,1 Hz en la patilla.', hint: 'Con prescaler 64 no llega: prueba 256 y OCR0A cerca de 70.' }] },
  I('En <b>CTC</b> (Clear Timer on Compare) el contador va de 0 a OCRnA y vuelve a 0: son <b>OCR + 1</b> cuentas.\n<b>f = F_CPU / (N · (OCR + 1))</b>\nSi la patilla OC conmuta en cada coincidencia, su onda tiene la mitad de frecuencia.', { svg: SV_CTC }),
  { t: 'steps', text: 'Timer1 en CTC con prescaler 256. ¿Qué OCR1A da una interrupción por segundo?', steps: ['Cuentas por periodo = F_CPU / (N · f) = 16 000 000 / (256 × 1)', '= <b>62 500</b> cuentas', 'El contador va de 0 a OCR1A incluido: OCR1A = 62 500 − 1', 'OCR1A = <b>62 499</b>'], result: 'OCR1A = 62 499' },
  Q('¿Por qué 62 499 y no 62 500?', ['El contador va de 0 a OCR1A incluido: son OCR1A + 1 cuentas', 'Por redondeo', 'Es un error', 'Para dejar margen'], 'Del 0 al 62 499 hay 62 500 cuentas.', { c: 'av_ctc', h: 'Cuenta cuántos números hay de 0 a 3: no son 3.' }),
  G('av_ctcOcr'), G('av_ctcOcr'),
  I('El código completo de una interrupción por segundo con el Timer1:', { code: 'TCCR1A = 0;\nTCCR1B = (1 << WGM12) | (1 << CS12);   // CTC (modo 4), prescaler 256\nOCR1A  = 62499;                        // 62 500 cuentas = 1 s\nTIMSK1 = (1 << OCIE1A);                // interrupción en la coincidencia\n\nISR(TIMER1_COMPA_vect) { segundos++; }' }),
  Nm('Timer1 en CTC con prescaler 64. ¿Qué OCR1A da 100 interrupciones por segundo?', 2499, '', '16 000 000 / (64 × 100) = 2500 cuentas: OCR1A = 2499.', { c: 'av_ctc', h: 'Cuentas = F_CPU / (N · f); luego resta 1.' }),
  Q('¿Qué hace falta para que OC0A (D6) conmute sola en cada coincidencia?', ['COM0A1:0 = 01 en TCCR0A y PD6 como salida en DDRD', 'Escribir en PIND dentro de la ISR', 'Nada más', 'Activar TOIE0'], 'El hardware conmuta la pata sin código.', { c: 'av_ctc', h: 'Dos cosas: decirle al temporizador que mueva la patilla y que la pata sea salida.' }),
  Q('En CTC escribes en OCR1A un valor menor que el TCNT1 actual. ¿Qué pasa?', ['El contador sigue hasta 65 535, da la vuelta y vuelve a empezar: un periodo larguísimo', 'Se ajusta al instante', 'Se para', 'Se reinicia el chip'], 'En CTC, OCR1A no espera al periodo siguiente: el contador ya ha pasado la coincidencia.', { c: 'av_ctc', h: 'Si el contador ya está por encima, ¿cuándo volverá a coincidir?' }),
  Q('Duplicas el prescaler y dejas OCR igual. La frecuencia de interrupción…', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Se cuadruplica'], 'Cada cuenta dura el doble.', { c: 'av_ctc', h: 'Mira dónde está N en la fórmula.' }),
  I('<b>Resumen</b>\n· CTC: el contador vuelve a 0 al llegar a OCR: OCR + 1 cuentas.\n· <b>f = F_CPU / (N · (OCR + 1))</b>; la patilla conmutando da f / 2.\n· Para una f: cuentas = F_CPU / (N · f) y OCR = cuentas − 1, con un prescaler que deje cuentas enteras que quepan.')
 ]),
 L('av13', 'Fast PWM y Phase Correct', 'wave', ['av_pwm', 'av_pwmduty'], [
  Q('analogWrite() da unos 980 Hz en los pines 5 y 6, y unos 490 Hz en el 9. ¿Por qué crees que cambia?', ['Los temporizadores van en modos distintos: uno solo sube y el otro sube y baja', 'El pin 9 es más lento', 'Es aleatorio', 'Por el cristal'], 'Fast PWM cuenta en sierra; Phase Correct sube y baja y tarda casi el doble.', { predict: true, c: 'av_pwm', h: 'Si el contador también tiene que bajar, ¿cuánto dura cada periodo?' }),
  { t: 'explore', text: 'PWM por hardware: el contador (azul) y la salida (naranja). OCR fija dónde cambia la salida y TOP dónde vuelve a empezar.', viz: 'av_pwm', params: { N: pN(64), top: { label: 'TOP', val: 255, min: 15, max: 1023, step: 1, dec: 0 }, ocr: { label: 'OCR', val: 127, min: 0, max: 1023, step: 1, dec: 0 }, mode: pSl('Modo (0 = Fast, 1 = Phase Correct)', 0, 0, 1) },
    tasks: [{ q: 'f', min: 19800, max: 20200, text: 'Consigue unos 20 kHz: inaudible para un motor', done: 'Prescaler 1 y TOP ≈ 799 en Fast PWM: 16 000 000 / 800 = 20 kHz, con 800 niveles.', hint: 'Prescaler 1 y TOP cerca de 800.' },
      { q: 'D', min: 0.245, max: 0.255, text: 'Ahora pon un ciclo de trabajo del 25 %', done: 'En Fast PWM, ciclo = (OCR + 1) / (TOP + 1).', hint: 'OCR alrededor de una cuarta parte de TOP.' },
      { q: 'bits', min: 5.9, max: 6.1, text: 'Deja solo 64 niveles (6 bits)', done: 'TOP = 63: más frecuencia, menos niveles. Frecuencia y resolución se reparten las mismas cuentas.', hint: 'TOP = 63.' }] },
  I('En <b>Fast PWM</b> el contador sube de 0 a TOP y vuelve a 0 (una sierra). En modo no invertido, la salida está a 1 hasta que el contador alcanza OCR.\n<b>f = F_CPU / (N · (TOP + 1))</b>, con TOP + 1 niveles.', { code: '// Timer2 en Fast PWM de 8 bits por OC2A (D11), prescaler 1: 62,5 kHz\nDDRB  |= (1 << PB3);\nTCCR2A = (1 << COM2A1) | (1 << WGM21) | (1 << WGM20);\nTCCR2B = (1 << CS20);\nOCR2A  = 63;   // (63 + 1) / 256 = 25 %' }),
  I('En <b>Phase Correct</b> sube hasta TOP y vuelve a bajar: la onda es simétrica y la frecuencia, casi la mitad.\n<b>f = F_CPU / (2 · N · TOP)</b>\nMejor para motores y puentes H.', { tune: { viz: 'av_pwm', params: pwmP(1) } }),
  { t: 'steps', text: 'Timer2 en Phase Correct con TOP = 255 y prescaler 64. ¿Frecuencia?', steps: ['Sube de 0 a 255 y baja: 2 × 255 = <b>510 cuentas</b> por periodo', 'Cada cuenta: 64 / 16 MHz = 4 µs', 'Periodo = 510 × 4 µs = 2040 µs', 'f = 1 / 2,04 ms ≈ <b>490 Hz</b>: la de analogWrite en D3, D9, D10 y D11'], result: 'Unos 490 Hz' },
  G('av_pwmFreq'), G('av_pwmFreq'),
  Q('analogWrite en los pines 5 y 6 da unos 980 Hz y en el 9, unos 490 Hz. ¿Por qué?', ['Timer0 va en Fast PWM y Timer1 en Phase Correct, los dos con prescaler 64', 'El pin 9 es más lento', 'Es aleatorio', 'Por el cristal'], '256 cuentas por periodo frente a 510.', { c: 'av_pwm', h: 'Compara cuántas cuentas dura un periodo en cada modo.' }),
  I('Los bits <b>COMnx1:0</b> deciden la salida: <b>10</b> no invertido, <b>11</b> invertido, <b>00</b> pata desconectada. En Fast PWM, ciclo = (OCR + 1) / (TOP + 1).\nOCRnx tiene <b>doble búfer</b>: el valor nuevo espera al periodo siguiente, así nunca se corta un pulso a medias.', { code: 'COMnx1:0 = 10 → 1 hasta OCR, luego 0\nCOMnx1:0 = 11 → al revés\nCOMnx1:0 = 00 → la pata vuelve a ser E/S normal' }),
  { t: 'match', q: 'Une cada valor de COMnx1:0 en Fast PWM con su efecto.', pairs: [['00', 'Patilla desconectada del temporizador'], ['10', 'PWM no invertido'], ['11', 'PWM invertido'], ['01', 'Conmutar en coincidencia (solo en algunos modos)']], c: 'av_pwmduty', h: 'El 00 desconecta; el 11 es el «al revés» del 10.' },
  Nm('Fast PWM con TOP = 199 y OCR = 49. ¿Ciclo de trabajo, en %?', 25, '%', '(49 + 1) / (199 + 1) = 50 / 200.', { c: 'av_pwmduty', h: 'Suma 1 a OCR y a TOP antes de dividir.' }),
  Q('Fast PWM con OCR = 0 no da un 0 % exacto, sino…', ['Un pulso de una cuenta en cada periodo: por eso analogWrite(pin, 0) usa digitalWrite', 'Un 0 % exacto', 'Un 50 %', 'Nada'], '(0 + 1) / 256 ≈ 0,4 %.', { c: 'av_pwmduty', h: 'Aplica (OCR + 1) / (TOP + 1) con OCR = 0.' }),
  Q('Con TOP = 63 en lugar de 255 (mismo prescaler)…', ['La frecuencia sube ×4 y la resolución baja a 6 bits (64 niveles)', 'Todo mejora', 'Sube la resolución', 'No cambia nada'], 'Frecuencia y resolución se reparten las mismas cuentas.', { c: 'av_pwm', h: '¿Cuántas cuentas por periodo hay ahora?' }),
  Q('En los modos PWM, OCRnx tiene doble búfer. Significa…', ['El valor nuevo se aplica al empezar el periodo siguiente: nunca se corta un pulso a medias', 'Que hay dos salidas', 'Que vale el doble', 'Que se puede leer dos veces'], 'Por eso cambiar el ciclo de trabajo en marcha no produce cortes raros.', { c: 'av_pwmduty', h: '¿Cuándo se aplica lo que escribes?' }),
  I('<b>Resumen</b>\n· Fast PWM: f = F_CPU / (N · (TOP + 1)); Phase Correct: f = F_CPU / (2 · N · TOP).\n· Más TOP = más niveles y menos frecuencia.\n· Ciclo (Fast) = (OCR + 1) / (TOP + 1); COM elige normal, invertido o desconectado.')
 ]),
 L('av14', 'Timer1: 16 bits, ICR1 y servos', 'timer', ['av_pwm', 'av_timer'], [
  Q('Un servo quiere un pulso de 1 a 2 ms cada 20 ms. ¿Crees que analogWrite (8 bits a unos 490 Hz) sirve?', ['No: ni la frecuencia ni la resolución encajan; hay que configurar el Timer1', 'Sí, perfecto', 'Sí, con analogWrite(9, 1500)', 'Solo si cambias el cristal'], 'Hacen falta 50 Hz y muchos más pasos entre 1 y 2 ms: el Timer1 con TOP en ICR1.', { predict: true, c: 'av_pwm', h: '¿Cuántos ms dura un periodo a 490 Hz?' }),
  { t: 'explore', text: 'Timer1 en Fast PWM con TOP en <b>ICR1</b>: eliges la frecuencia que quieras con 16 bits. OCR1A está fijo en 3000.', viz: 'av_pwm', params: { N: { label: 'Prescaler', val: 1, list: [1, 8, 64], dec: 0 }, top: { label: 'TOP (ICR1)', val: 20000, min: 1000, max: 65535, step: 1, dec: 0 }, ocr: fx(3000), mode: fx(0) },
    tasks: [{ q: 'f', min: 49.8, max: 50.2, text: 'Ajusta el Timer1 a 50 Hz', done: 'Prescaler 8 y TOP = 39 999, o prescaler 64 y TOP = 4999.', hint: 'Prescaler 8 y TOP cerca de 40 000.' },
      { q: 's50', min: 1, max: 1, text: 'A 50 Hz, con la máxima resolución', done: 'Con prescaler 8 hay 40 000 cuentas por periodo (más de 15 bits): 2000 posiciones entre 1 y 2 ms.', hint: 'El prescaler más pequeño con el que TOP aún cabe en 16 bits.' }] },
  I('El Timer1 cuenta hasta 65 535 y tiene modos con TOP en <b>ICR1</b>: así OCR1A y OCR1B quedan libres para dos salidas con la misma frecuencia, D9 (OC1A) y D10 (OC1B).\n<b>TOP = F_CPU / (N · f) − 1</b>', { code: '// Servo en D9: 50 Hz con cuentas de 0,5 µs (modo 14, TOP = ICR1)\nDDRB  |= (1 << PB1);\nTCCR1A = (1 << COM1A1) | (1 << WGM11);\nTCCR1B = (1 << WGM13) | (1 << WGM12) | (1 << CS11);   // prescaler 8\nICR1   = 39999;                                        // 20 ms\nOCR1A  = 3000;                                         // 1,5 ms: centro' }),
  { t: 'steps', text: 'Con prescaler 8, ¿qué OCR1A da el pulso de 1,5 ms del centro del servo?', steps: ['Cada cuenta dura 8 / 16 MHz = <b>0,5 µs</b>', '1,5 ms = 1500 µs', '1500 / 0,5 = <b>3000 cuentas</b>', 'OCR1A = 3000 (el pulso dura 3001 cuentas: 1,5005 ms, de sobra para un servo)'], result: 'OCR1A ≈ 3000' },
  Nm('¿Qué OCR1A da un pulso de 1 ms?', 2000, '', '1 ms / 0,5 µs = 2000 cuentas.', { tol: 1, c: 'av_timer', h: 'Divide la duración del pulso entre lo que dura una cuenta.' }),
  Nm('¿Y uno de 2 ms?', 4000, '', '2 ms / 0,5 µs.', { tol: 1, c: 'av_timer', h: 'El doble de cuentas que para 1 ms.' }),
  Q('Con cuentas de 0,5 µs, ¿cuántos pasos de posición hay entre 1 y 2 ms?', ['2000', '256', '1000', '20'], '1 ms / 0,5 µs: mucho más fino que analogWrite.', { c: 'av_timer', h: '¿Cuántas cuentas caben en el milisegundo que va de 1 a 2 ms?' }),
  Q('Quieres 50 Hz con la máxima resolución. ¿Qué prescaler eliges?', ['8: TOP = 39 999 aún cabe en 16 bits', '1: TOP = 319 999', '64', '1024'], 'El más pequeño con el que TOP cabe en 65 535.', { c: 'av_pwm', h: 'Calcula TOP con cada prescaler y mira cuáles caben en 16 bits.' }),
  Q('Quieres 25 kHz para un ventilador PWM de 4 hilos en D9 y D10, con prescaler 1 y TOP en ICR1. ¿Qué ICR1?', ['639', '640', '255', '25 000'], '16 000 000 / 25 000 = 640 cuentas: TOP = 639.', { c: 'av_pwm', h: 'TOP = F_CPU / (N · f) − 1.' }),
  I('La CPU es de 8 bits: para leer o escribir de golpe un registro de 16 bits del Timer1 (TCNT1, OCR1A, ICR1), el hardware usa un <b>registro temporal</b> compartido. avr-gcc lo hace en el orden correcto si los usas como enteros de 16 bits.', { code: 'OCR1A = 3000;            // el compilador escribe el byte alto y luego el bajo\nuint16_t t = TCNT1;      // lee el bajo y luego el alto', more: 'Como ese registro temporal es compartido, si una ISR también toca registros de 16 bits del Timer1, el acceso desde loop() debe hacerse con las interrupciones desactivadas. Lo verás en el módulo de interrupciones.' }),
  G('av_pwmFreq'),
  I('<b>Resumen</b>\n· Con TOP en ICR1, el Timer1 da cualquier frecuencia y dos salidas (D9, D10).\n· TOP = F_CPU / (N · f) − 1; usa el prescaler más pequeño que quepa.\n· Servo: 50 Hz y pulsos de 1 a 2 ms; con prescaler 8, de 2000 a 4000 cuentas.')
 ]),
 L('av15', 'Input Capture: medir el tiempo', 'gauge', ['av_icp', 'av_wrap'], [
  Q('Quieres medir el periodo de una señal con precisión de microsegundos y lees micros() en una interrupción en cada flanco. ¿Qué crees que estropea la medida?', ['El retraso variable hasta que tu código llega a leer', 'Nada: es perfecto', 'El cable USB', 'La EEPROM'], 'Entre el flanco y tu lectura pasan unos ciclos que cambian de vez en cuando. El hardware puede hacer la foto por ti.', { predict: true, c: 'av_icp', h: 'Piensa en lo que pasa entre el flanco y la primera línea de tu ISR.' }),
  { t: 'explore', text: 'Input Capture: en cada flanco de subida de la señal, el hardware copia el contador TCNT1 en <b>ICR1</b>. Elige la señal y el prescaler.', viz: 'av_cap', params: { f: { label: 'Señal', val: 10, list: [10, 50, 100, 440, 1000, 10000, 100000], unit: 'Hz', dec: 0 }, N: { label: 'Prescaler', val: 1, list: [1, 8, 64, 256], dec: 0 } },
    tasks: [{ q: 'fits50', min: 1, max: 1, text: 'Mide 50 Hz sin que el contador dé una vuelta completa', done: 'Con prescaler 8: 40 000 cuentas por periodo. La resta de dos capturas da el periodo.', hint: 'Señal a 50 Hz y sube el prescaler.' },
      { q: 'cnt', min: 150, max: 170, text: 'Con 100 kHz y prescaler 1, mira cuántas cuentas quedan por periodo', done: 'Solo 160: la resolución empeora. Para frecuencias altas es mejor contar pulsos.', hint: 'Señal a 100 kHz y prescaler 1.' }] },
  I('La entrada <b>ICP1</b> (PB0, D8) copia TCNT1 en <b>ICR1</b> en el instante exacto del flanco: la latencia de tu ISR ya no importa.\nPeriodo = (captura nueva − anterior) × N / F_CPU.', { code: 'volatile uint16_t periodo;\n\nISR(TIMER1_CAPT_vect) {\n  static uint16_t antes;\n  uint16_t ahora = ICR1;     // la foto que hizo el hardware\n  periodo = ahora - antes;   // en cuentas\n  antes = ahora;\n}' }),
  I('Configuración: <b>ICES1</b> elige el flanco (1 = subida), <b>ICNC1</b> activa un filtro que exige 4 muestras iguales seguidas (retrasa 4 ciclos y elimina picos) e <b>ICIE1</b> activa la interrupción.', { code: 'TCCR1A = 0;\nTCCR1B = (1 << ICNC1) | (1 << ICES1) | (1 << CS11);  // filtro, subida, prescaler 8\nTIMSK1 = (1 << ICIE1);' }),
  { t: 'steps', text: 'Prescaler 8. Dos capturas seguidas valen 1000 y 3000. ¿Frecuencia de la señal?', steps: ['Cuentas entre capturas: 3000 − 1000 = <b>2000</b>', 'Cada cuenta: 8 / 16 MHz = 0,5 µs', 'Periodo = 2000 × 0,5 µs = <b>1 ms</b>', 'f = 1 / 1 ms = <b>1 kHz</b>'], result: '1 kHz' },
  G('av_icp'), G('av_icp'),
  Q('¿Sale bien esta resta si el contador ha dado la vuelta entre dos capturas?', ['Sí: la resta sin signo da la diferencia correcta si hay menos de una vuelta completa', 'No: sale negativa', 'Nunca sale bien', 'El compilador avisa'], 'Aritmética módulo 65 536.', { code: 'uint16_t periodo = ahora - antes;', c: 'av_wrap', h: 'Recuerda cómo da la vuelta un entero sin signo al restar.' }),
  Nm('uint16_t: antes = 65 000 y ahora = 464. ¿Cuánto vale ahora − antes?', 1000, 'cuentas', '464 − 65 000 + 65 536 = 1000.', { c: 'av_wrap', h: 'Si sale negativo, súmale una vuelta completa: 65 536.' }),
  Q('Una señal de 10 Hz con prescaler 1: el periodo son 1 600 000 cuentas. ¿Qué haces?', ['Contar desbordamientos y sumarlos × 65 536, o usar un prescaler mayor', 'Nada', 'Usar el Timer0', 'Es imposible'], 'Extiendes el contador por software o lo haces más lento.', { c: 'av_icp', h: '¿Cabe 1 600 000 en 16 bits?' }),
  I('Para frecuencias altas se hace al revés: la entrada <b>T1</b> (PD5, D5) hace de reloj del Timer1 y cuentas pulsos durante una ventana fija.\n<b>f = pulsos / ventana</b>. Funciona hasta algo menos de F_CPU / 2,5.', { code: 'TCCR1B = (1 << CS12) | (1 << CS11) | (1 << CS10);  // reloj externo en T1, flanco de subida\nTCNT1 = 0;\n// ...esperar una ventana exacta (por ejemplo, 0,1 s con el Timer2)...\nuint16_t pulsos = TCNT1;' }),
  Nm('Con una ventana de 0,1 s cuentas 12 345 pulsos. ¿Frecuencia, en Hz?', 123450, 'Hz', '12 345 / 0,1 s.', { c: 'av_icp', h: 'Pulsos divididos entre la duración de la ventana.' }),
  Q('Con ICR1 como TOP (modo 14), ¿puedes usar Input Capture?', ['No: ICR1 ya está ocupado como TOP', 'Sí', 'Solo con prescaler', 'Solo con ICNC1'], 'ICR1 no puede hacer dos trabajos a la vez.', { c: 'av_icp', h: '¿Qué guarda ICR1 en ese modo?' }),
  I('<b>Resumen</b>\n· ICP1 congela TCNT1 en ICR1 en cada flanco: medida exacta, sin latencia.\n· Periodo = diferencia × N / F_CPU; la resta sin signo aguanta una vuelta.\n· Señales lentas: más prescaler o contar desbordamientos. Rápidas: contar pulsos en T1.')
 ]),
 L('av16', 'Lo que Arduino hace con tus timers', 'code', ['av_ardtim', 'av_timer', 'av_tflag', 'av_treg'], [
  Q('Cambias el prescaler del Timer0 para tener un PWM más rápido en D6. ¿Qué crees que se rompe?', ['millis(), micros() y delay()', 'Nada', 'El puerto serie', 'El bootloader'], 'El Timer0 es el reloj del sistema de Arduino.', { predict: true, c: 'av_ardtim', h: '¿Qué temporizador cuenta los milisegundos?' }),
  { t: 'explore', text: 'Un evento activa su bandera cada cierto tiempo, pero las interrupciones están desactivadas un rato (cli, otra ISR larga…). Mira cuántos se atienden.', viz: 'av_flag', params: { per: { label: 'Un evento cada', val: 1, list: [0.25, 0.5, 1, 2, 5], unit: 'ms', dec: 2 }, off: pSl('Interrupciones desactivadas', 0.5, 0, 10, 0.5, 'ms', 1) },
    tasks: [{ q: 'lost', min: 3, max: 1e9, text: 'Pierde al menos 3 eventos', done: 'La bandera es un solo bit: recuerda <b>que</b> pasó algo, no <b>cuántas veces</b>. Si es el Timer0, millis() se retrasa.', hint: 'Eventos frecuentes y un bloqueo largo.' },
      { q: 'ok5', min: 1, max: 1, text: 'Bloquea 5 ms sin perder ningún evento', done: 'Solo si los eventos llegan cada 5 ms o más despacio: uno pendiente se atiende al reactivar.', hint: 'Eventos cada 5 ms.' }] },
  I('Antes de setup(), el núcleo de Arduino configura los tres temporizadores en init():\n· <b>Timer0</b>: Fast PWM, prescaler 64. Su desbordamiento cuenta millis() y micros(); PWM en D5 y D6.\n· <b>Timer1</b> (D9, D10) y <b>Timer2</b> (D3, D11): Phase Correct de 8 bits para analogWrite.', { code: 'Timer0 → millis(), micros(), delay() · PWM en D5 y D6\nTimer1 → PWM en D9 y D10 · lo usa la librería Servo\nTimer2 → PWM en D3 y D11 · lo usa tone()' }),
  { t: 'steps', text: 'El Timer0 se desborda cada 1,024 ms, pero millis() cuenta milisegundos. ¿Cómo cuadra?', steps: ['Cada desbordamiento suma 1 a millis()…', '…y guarda aparte lo que sobra: 0,024 ms', 'Cuando lo acumulado pasa de 1 ms, suma 1 extra', 'Por eso millis() a veces salta de 2 en 2; micros() lee además TCNT0 y tiene una resolución de 4 µs'], result: 'millis() es exacto a la larga, pero salta algún número' },
  Nm('El Timer0 se desborda cada 256 × 64 / 16 MHz. ¿Cada cuántos ms?', 1.024, 'ms', '16 384 / 16 000 000 s = 1,024 ms.', { tol: 0.002, c: 'av_timer', h: 'Multiplica 256 por 64 y divide entre 16 000 000.' }),
  { t: 'match', q: 'Une cada función de Arduino con lo que ocupa.', pairs: [['Librería Servo', 'Timer1: D9 y D10 pierden analogWrite'], ['tone()', 'Timer2: D3 y D11 pierden analogWrite'], ['millis() y delay()', 'Timer0'], ['analogWrite en D5 y D6', 'Timer0 ']], c: 'av_ardtim', h: 'Servo es de 16 bits; tone() usa el otro de 8 bits.' },
  Q('Necesitas millis() y una interrupción periódica de 10 kHz. ¿Qué temporizador usas?', ['El Timer1 o el Timer2 en CTC: el Timer0 es de millis()', 'El Timer0 con otro prescaler', 'Cualquiera', 'No se puede'], 'Deja el Timer0 a Arduino.', { c: 'av_ardtim', h: 'Uno de los tres no se toca si quieres millis().' }),
  Q('analogWrite(3, 128) después de llamar a tone(8, 440)…', ['No funciona como esperas: tone() ha reconfigurado el Timer2', 'Funciona perfecto', 'Suena en el pin 3', 'Para el tono'], 'D3 es OC2B, del Timer2.', { c: 'av_ardtim', h: '¿Qué temporizador genera el PWM de D3?' }),
  Q('Tienes las interrupciones desactivadas 5 ms seguidos. millis()…', ['Se retrasa: solo se recuerda un desbordamiento pendiente y los demás se pierden', 'Sigue exacto', 'Se adelanta', 'Se pone a cero'], 'Una bandera no acumula eventos.', { c: 'av_tflag', h: '¿Cuántos desbordamientos caben en 5 ms y cuántos recuerda la bandera?' }),
  I('Tras init(), los registros ya tienen bits puestos. Si usas |=, los conservas y acabas en otro modo. Si te apropias de un temporizador, <b>asigna los registros completos</b> y asume lo que pierdes: PWM en sus pines, Servo, tone() o millis().', { code: 'TCCR1B |= (1 << WGM12);    // MAL: WGM10 sigue a 1 por init(): modo 5\n\nTCCR1A = 0;                // bien: todo desde cero\nTCCR1B = (1 << WGM12) | (1 << CS12);   // CTC, prescaler 256' }),
  Q('Después de init(), haces esto. ¿En qué modo queda el Timer1?', ['En Fast PWM de 8 bits (modo 5), no en CTC: WGM10 sigue a 1 por lo que hizo init()', 'En CTC', 'No cambia nada', 'Se para y rompe millis()'], 'WGM13:0 = 0101. Asigna los registros completos.', { code: 'TCCR1B |= (1 << WGM12);   // "quiero CTC"', c: 'av_treg', h: 'Los bits WGM están repartidos entre TCCR1A y TCCR1B.' }),
  Q('¿Qué dos líneas dejan el Timer1 en CTC con prescaler 64, venga de donde venga?', ['TCCR1A = 0; TCCR1B = (1 << WGM12) | (1 << CS11) | (1 << CS10);', 'TCCR1B |= (1 << WGM12) | (1 << CS11) | (1 << CS10);', 'TCCR1A |= 0; TCCR1B |= (1 << CS11);', 'TIMSK1 = (1 << WGM12);'], 'Solo asignando los dos registros quitas lo que dejó init().', { c: 'av_treg', h: 'Busca la que no usa |= en ningún registro de configuración.' }),
  I('<b>Resumen</b>\n· Timer0 = millis(): no lo toques. Timer1 = Servo; Timer2 = tone().\n· Las banderas no acumulan: con interrupciones desactivadas mucho rato, millis() se retrasa.\n· Si te apropias de un temporizador, asigna TCCRnA y TCCRnB enteros.')
 ]),
 SIM('av-s3', 'Reto: la salida OC1A', 'El programa del fundido escribe en OCR1A del Timer1, cuya salida es OC1A: la pata PB1. Encuentra PB1 en la Nano y pon ahí un LED con su resistencia para ver el PWM por hardware.', { arduino: 'fade', board: 'nano', parts: ['res', 'led'], code: true, hint: 'PB1 = D9. LED con 220–470 Ω a GND.' }, 'av_oc1a'),
 PRJ('av-p4', 'Proyecto: theremin de luz', 'av_theremin'),
 PRJ('av-p5', 'Proyecto: frecuencímetro de 1 Hz a 5 MHz', 'av_freq'),
 PRJ('av-p6', 'Proyecto: reloj multiplexado por Timer2', 'av_clock')
], exam: [
  Nm('Timer2 en modo normal con prescaler 1024 a 16 MHz. ¿Cada cuántos ms se desborda?', 16.384, 'ms', 'Cada cuenta dura 1024 / 16 MHz = 64 µs; 256 cuentas × 64 µs = 16,384 ms.', { tol: 0.05, c: 'av_timer', h: 'Duración de una cuenta × 256.', l: 'av11' }),
  Q('Quieres que el Timer1 en modo normal se desborde cada unos 0,26 s a 16 MHz. ¿Qué prescaler?', ['64', '8', '256', '1'], '65 536 × 64 / 16 MHz ≈ 262 ms. Con 8 serían 33 ms y con 256, 1,05 s.', { c: 'av_timer', h: 'Prueba cada prescaler: 65 536 × N / 16 MHz.', l: 'av11' }),
  Q('En mitad del programa escribes TCNT1 = 0;. ¿Qué consigues?', ['Reiniciar la cuenta del Timer1: el siguiente desbordamiento tardará una vuelta completa', 'Parar el Timer1', 'Cambiar su prescaler a 1', 'Borrar sus banderas'], 'TCNTn es el propio contador: se puede leer y también escribir. El prescaler está en TCCRnB y las banderas, en TIFRn.', { c: 'av_treg', h: '¿Qué guarda TCNTn?', l: 'av11' }),
  Q('Sin interrupciones, esperas el desbordamiento del Timer1 así. ¿Qué falta para poder esperar el siguiente?', ['Borrar TOV1 con TIFR1 = (1 << TOV1);', 'TIFR1 &= ~(1 << TOV1);', 'Nada: la bandera se borra al leerla', 'Poner TCNT1 a 0'], 'Sin ISR nadie borra la bandera: sigue a 1 y el siguiente while no esperaría nada. Y se borra escribiendo un 1, no un 0.', { code: 'while (!(TIFR1 & (1 << TOV1))) ;   // espera\n// ...hacer algo...', c: 'av_tflag', h: 'Las banderas se borran al revés de lo que parece.', l: 'av11' }),
  Nm('Timer2 en CTC con prescaler 256 y OCR2A = 249. ¿Cuántas interrupciones por segundo?', 250, 'Hz', '16 000 000 / (256 × 250) = 250.', { c: 'av_ctc', h: 'f = F_CPU / (N · (OCR + 1)).', l: 'av12' }),
  Nm('Timer0 en CTC con prescaler 8 y OC0A conmutando en cada coincidencia. ¿Qué OCR0A da 10 kHz en la patilla?', 99, '', 'La patilla da f / 2: hacen falta 20 000 coincidencias por segundo. 16 000 000 / (8 × 20 000) = 100 cuentas → OCR0A = 99.', { tol: 0, c: 'av_ctc', h: 'Si la patilla conmuta, la frecuencia de coincidencias es el doble que la de la onda.', l: 'av12' }),
  Q('Quieres una interrupción por segundo con el Timer2 (8 bits) a 16 MHz. ¿Se puede en una sola vuelta del contador?', ['No: con prescaler 1024 una vuelta dura como mucho unos 16 ms; hay que contar interrupciones', 'Sí, con OCR2A = 15 624', 'Sí, con prescaler 1024 y OCR2A = 255', 'Sí, con prescaler 1'], 'En 8 bits caben 256 cuentas de 64 µs: unos 16 ms. Por ejemplo, 125 interrupciones de 8 ms hacen 1 s.', { c: 'av_ctc', h: 'Calcula la vuelta más larga posible de un contador de 8 bits.', l: 'av12' }),
  Q('¿Por qué no sirve el prescaler 1 para 50 interrupciones por segundo con el Timer1 en CTC?', ['Harían falta 320 000 cuentas, y OCR1A solo llega a 65 535', 'Porque el prescaler 1 no existe', 'Porque saldrían 25 Hz', 'Sí sirve'], '16 000 000 / 50 = 320 000. Con prescaler 8 son 40 000: OCR1A = 39 999 cabe.', { c: 'av_ctc', h: 'Calcula las cuentas por periodo y compáralas con 16 bits.', l: 'av12' }),
  TU('Haz sonar 5 kHz exactos en la patilla OC0A.', 'av_timer', { N: pN(64), ocr: pOcr(124) }, { q: 'fpin', min: 4999, max: 5001, text: 'Objetivo: 5 kHz en la patilla', hint: 'La patilla da la mitad: necesitas 10 000 coincidencias por segundo.' }, 'Prescaler 8 y OCR0A = 199, o prescaler 64 y OCR0A = 24: 10 000 coincidencias por segundo y 5 kHz en la patilla.', { c: 'av_ctc', h: 'Cuentas = F_CPU / (N · 2 · f) y OCR = cuentas − 1.', l: 'av12' }),
  Nm('Timer0 en Fast PWM de 8 bits con prescaler 8 a 16 MHz. ¿Frecuencia, en Hz?', 7812.5, 'Hz', '16 000 000 / (8 × 256) = 7812,5 Hz.', { tol: 1, c: 'av_pwm', h: 'f = F_CPU / (N · (TOP + 1)).', l: 'av13' }),
  Nm('Timer2 en Phase Correct con TOP = 255 y prescaler 8. ¿Frecuencia, en Hz?', 3921.6, 'Hz', '16 000 000 / (2 × 8 × 255) ≈ 3921,6 Hz: casi la mitad que en Fast PWM.', { tol: 2, c: 'av_pwm', h: 'En Phase Correct el periodo son 2 · TOP cuentas.', l: 'av13' }),
  Nm('Fast PWM no invertido con TOP = 255. ¿Qué OCR da un ciclo de trabajo del 75 %?', 191, '', '(OCR + 1) / 256 = 0,75 → OCR + 1 = 192 → OCR = 191.', { tol: 0, c: 'av_pwmduty', h: 'Ciclo = (OCR + 1) / (TOP + 1): despeja OCR.', l: 'av13' }),
  Q('Fast PWM con TOP = 255, OCR = 63 y salida invertida (COMnx1:0 = 11). ¿Ciclo de trabajo?', ['75 %', '25 %', '50 %', '0 %'], 'No invertido sería (63 + 1) / 256 = 25 %. Invertido es al revés: 100 − 25 = 75 %.', { c: 'av_pwmduty', h: 'Calcula el no invertido y dale la vuelta.', l: 'av13' }),
  Q('Un motor con analogWrite pita de forma molesta. ¿Qué haces?', ['Subir la frecuencia del PWM por encima de unos 20 kHz, aceptando menos resolución', 'Bajar la frecuencia a 50 Hz', 'Usar más resolución con el mismo prescaler', 'Cambiar a Phase Correct a 490 Hz'], 'Unos 490 o 980 Hz caen en pleno oído. Por encima de 20 kHz no se oye; a cambio, menos cuentas por periodo y menos niveles.', { c: 'av_pwm', h: '¿Qué frecuencias oye una persona?', l: 'av13' }),
  { t: 'match', q: 'Une cada configuración (a 16 MHz) con su frecuencia.', pairs: [['Fast PWM, 8 bits, prescaler 64', 'Unos 977 Hz'], ['Phase Correct, 8 bits, prescaler 64', 'Unos 490 Hz'], ['Fast PWM, 8 bits, prescaler 1', '62,5 kHz'], ['Fast PWM, TOP = 799, prescaler 1', '20 kHz']], c: 'av_pwm', h: 'Fast: F_CPU / (N · (TOP + 1)). Phase Correct: F_CPU / (2 · N · TOP).', l: 'av13' },
  Nm('Timer1 con TOP en ICR1 y prescaler 1. ¿Qué ICR1 da un PWM de 40 kHz?', 399, '', '16 000 000 / 40 000 = 400 cuentas: TOP = 399.', { tol: 0, c: 'av_pwm', h: 'TOP = F_CPU / (N · f) − 1.', l: 'av14' }),
  Q('Servo con el Timer1 a 50 Hz usando prescaler 64 (cuentas de 4 µs) y TOP = 4999. ¿Cuántas posiciones hay entre 1 y 2 ms?', ['250', '2000', '1000', '4999'], '1 ms / 4 µs = 250 pasos. Con prescaler 8 había 2000: más prescaler, menos resolución.', { c: 'av_timer', h: '¿Cuántas cuentas de 4 µs caben en 1 ms?', l: 'av14' }),
  Q('Con el Timer1 en modo 14 (TOP en ICR1) a 50 Hz, ¿puedes mover dos servos distintos?', ['Sí: OCR1A en D9 y OCR1B en D10 comparten los 50 Hz y cada uno tiene su propio pulso', 'No: un temporizador, un servo', 'Solo en Phase Correct', 'Solo con el Timer0'], 'ICR1 fija la frecuencia para los dos canales; OCR1A y OCR1B, cada ancho de pulso.', { c: 'av_pwm', h: '¿Qué registro fija la frecuencia y cuáles los pulsos?', l: 'av14' }),
  Nm('Input Capture con prescaler 64 (4 µs por cuenta). Dos capturas seguidas valen 10 000 y 10 250. ¿Frecuencia, en Hz?', 1000, 'Hz', '250 cuentas × 4 µs = 1 ms de periodo: 1000 Hz.', { c: 'av_icp', h: 'Resta, pasa a tiempo y haz la inversa.', l: 'av15' }),
  Nm('uint16_t: antes = 60 000 y ahora = 4464. ¿Cuánto vale ahora − antes?', 10000, 'cuentas', '4464 − 60 000 + 65 536 = 10 000: la resta sin signo da bien la diferencia aunque el contador haya dado la vuelta.', { c: 'av_wrap', h: 'Si sale negativo, suma 65 536.', l: 'av15' }),
  Q('Quieres medir una señal de 2 MHz. ¿Input Capture o contar pulsos en T1?', ['Contar pulsos en T1 durante una ventana fija: con Input Capture solo habría 8 cuentas por periodo', 'Input Capture con prescaler 1024', 'Input Capture: siempre es más preciso', 'Ninguno: es demasiado rápida'], '16 MHz / 2 MHz = 8 cuentas: una cuenta de error es un 12 %. Contando pulsos durante 10 ms tendrías 20 000.', { c: 'av_icp', h: '¿Cuántas cuentas de 62,5 ns caben en un periodo?', l: 'av15' }),
  Q('La señal que mides tiene picos de ruido muy cortos que dan capturas falsas. ¿Qué activas?', ['ICNC1: exige 4 muestras iguales seguidas antes de capturar', 'ICES1', 'Un prescaler mayor', 'TOIE1'], 'El filtro de ruido retrasa la captura 4 ciclos y descarta los picos más cortos que eso.', { c: 'av_icp', h: 'Busca el bit que filtra la entrada de captura.', l: 'av15' }),
  Q('Necesitas millis(), tone() y un PWM de 25 kHz. ¿Con qué temporizador haces el PWM?', ['Timer1, en D9 o D10', 'Timer0, en D5 o D6', 'Timer2, en D3 o D11', 'Cualquiera'], 'El Timer0 es de millis() y el Timer2 lo toma tone(): queda el Timer1.', { c: 'av_ardtim', h: 'Descarta los temporizadores que ya están ocupados.', l: 'av16' }),
  Q('Una ISR tuya tarda 3 ms y durante ese tiempo no se atiende nada más. ¿Qué le pasa a millis()?', ['Se retrasa: en 3 ms caen dos o tres desbordamientos del Timer0 y la bandera solo recuerda uno', 'Nada', 'Se adelanta', 'Se pone a cero'], 'La bandera TOV0 es un solo bit: los desbordamientos que se juntan se pierden y millis() se queda atrás.', { c: 'av_tflag', h: 'El Timer0 se desborda cada 1,024 ms.', l: 'av16' }),
  Q('Después de init(), quieres el Timer2 en CTC. ¿Qué falla en esta línea?', ['WGM20 sigue a 1 por init(): el Timer2 queda en Fast PWM (modo 3), no en CTC', 'Nada', 'WGM21 no existe', 'Para millis()'], 'init() deja el Timer2 en Phase Correct (WGM20 = 1). Con |= sumas WGM21 y sale 011: Fast PWM. Asigna TCCR2A y TCCR2B completos.', { code: 'TCCR2A |= (1 << WGM21);   // "quiero CTC"', c: 'av_treg', h: '¿Qué bits WGM deja init() a 1 en el Timer2?', l: 'av16' })
] };

  /* ===================== MÓDULO 4 · Interrupciones a fondo ===================== */
  const SV_IRQ = `<svg viewBox="0 0 300 140" class="viz"><text x="10" y="18" class="vizsm">loop()</text>
    <path d="M10 40H120" stroke="var(--ice)" stroke-width="6"/><path d="M190 40H290" stroke="var(--ice)" stroke-width="6"/>
    <path d="M120 40L132 86M178 86L190 40" stroke="var(--muted)" stroke-dasharray="3 3" fill="none"/>
    <path d="M132 86H178" stroke="var(--led)" stroke-width="6"/><text x="155" y="108" text-anchor="middle" class="vizsm">ISR</text>
    <path d="M120 22v10" stroke="var(--err)" stroke-width="2"/><text x="120" y="16" text-anchor="middle" class="vizsm" style="fill:var(--err)">bandera</text>
    <text x="40" y="70" class="vizsm">guarda la vuelta,</text><text x="40" y="84" class="vizsm">I = 0</text><text x="196" y="70" class="vizsm">reti: vuelve</text><text x="196" y="84" class="vizsm">e I = 1</text>
    <text x="10" y="132" class="vizsm">loop() se para un momento y sigue justo donde estaba</text></svg>`;
  const SV_LAT = `<svg viewBox="0 0 300 120" class="viz">${[['bandera', 0, 30, 'var(--err)'], ['≥ 4 ciclos', 30, 50, 'var(--muted)'], ['salto', 80, 30, 'var(--muted)'], ['prólogo: push', 110, 60, 'var(--led)'], ['tu código', 170, 50, 'var(--ok)'], ['pop · reti', 220, 66, 'var(--led)']].map(([t, x, w, c], i) => `<rect x="${8 + x}" y="34" width="${w - 2}" height="28" rx="4" fill="${c}" opacity=".45"/><text x="${8 + x + w / 2}" y="${i % 2 ? 82 : 26}" text-anchor="middle" class="vizsm">${t}</text>`).join('')}
    <text x="8" y="108" class="vizsm">Hasta tu primera línea: 20–40 ciclos (1–3 µs a 16 MHz)</text></svg>`;

  const M4 = { id: 'av-m4', title: 'Interrupciones a fondo', desc: 'Vectores, ISR, volatile, secciones críticas, INT0, PCINT, latencia y búferes circulares.', nodes: [
 L('av17', 'Vectores y la ISR', 'bolt', ['av_isr', 'av_vector', 'av_ctc'], [
  Q('Activas la interrupción de comparación del Timer1 (OCIE1A) en un programa en C puro, sin Arduino, y no salta nunca. ¿Qué crees que falta?', ['El permiso global de interrupciones: sei()', 'Un delay()', 'Más prescaler', 'Una variable volatile'], 'Arduino llama a sei() en init(); en C puro te toca a ti.', { predict: true, c: 'av_isr', h: 'Recuerda el bit I de SREG.' }),
  { t: 'explore', text: 'Para que salte una interrupción hacen falta tres cosas a la vez. Activa y desactiva cada una.', viz: 'av_gate', params: { flag: L01('Bandera (ha pasado el evento)', 1), mask: L01('Habilitación local (OCIE1A)', 1), ibit: L01('Permiso global (bit I)', 0) },
    tasks: [{ q: 'fires', min: 1, max: 1, text: 'Haz que salte la ISR', done: 'Bandera, habilitación local y bit I: las tres a 1.', hint: 'Falta el permiso global.' },
      { q: 'blockMask', min: 1, max: 1, text: 'Ahora impídelo sin tocar el bit I ni la bandera', done: 'Quitando la habilitación local: el evento sigue marcando su bandera, pero no interrumpe.', hint: 'Pon la habilitación local a 0.' }] },
  I('Una interrupción es un salto provocado por el hardware: la CPU <b>termina la instrucción en curso</b>, guarda en la pila la dirección de vuelta, <b>pone I a 0</b> y salta a una dirección fija, el <b>vector</b>. Al acabar, reti vuelve y pone I a 1. Por eso las ISR no se anidan.', { svg: SV_IRQ, more: 'Si quieres que una ISR larga pueda ser interrumpida por otra urgente, decláralas con ISR(…, ISR_NOBLOCK): reactiva el bit I al empezar. Úsalo con mucho cuidado.' }),
  I('Al principio de la Flash hay una <b>tabla de vectores</b>: 26 en el 328P, contando RESET. ISR(NOMBRE_vect) coloca tu función en su entrada. Si dos están pendientes a la vez, gana la de <b>vector más bajo</b>.', { code: ' 1  RESET\n 2  INT0_vect          pata PD2\n 3  INT1_vect          pata PD3\n 4  PCINT0_vect        cambios en el puerto B\n 7  WDT_vect           watchdog\n 8  TIMER2_COMPA_vect\n12  TIMER1_COMPA_vect\n14  TIMER1_OVF_vect\n19  USART_RX_vect      byte recibido\n22  ADC_vect           conversión terminada', more: 'Si activas una interrupción y no escribes su ISR, el salto va a __bad_interrupt, que por defecto vuelve al vector 0: parece un reinicio extraño. Puedes definir ISR(BADISR_vect) para detectarlo.' }),
  { t: 'steps', text: 'loop() está en marcha y el Timer2 llega a OCR2A con OCIE2A y el bit I a 1. ¿Qué pasa exactamente?', steps: ['La bandera OCF2A se pone a 1', 'La CPU termina la instrucción en curso', 'Guarda la dirección de vuelta en la pila (2 bytes) y pone I a 0', 'Salta al vector 8, que lleva a tu ISR(TIMER2_COMPA_vect); la bandera se borra sola', 'Al acabar, reti recupera la dirección, pone I a 1 y loop() sigue donde estaba'], result: 'loop() ni se entera, salvo por el tiempo que ha perdido' },
  { t: 'match', q: 'Une cada vector con su causa.', pairs: [['INT0_vect', 'Flanco o nivel en PD2'], ['TIMER1_CAPT_vect', 'Captura en ICP1'], ['USART_RX_vect', 'Byte recibido'], ['ADC_vect', 'Conversión terminada']], c: 'av_vector', h: 'El nombre de cada vector dice el periférico y el evento.' },
  Q('Al entrar en una ISR normal, el bit I de SREG…', ['Se pone a 0 solo: las ISR no se anidan salvo que lo pidas', 'Sigue a 1', 'Se invierte', 'No existe'], 'reti lo vuelve a poner a 1.', { c: 'av_isr', h: 'Piensa en por qué una ISR no interrumpe a otra.' }),
  Q('Dos interrupciones pendientes a la vez. ¿Cuál se atiende primero?', ['La de vector más bajo', 'La más reciente', 'La más larga', 'Al azar'], 'INT0 gana a un temporizador, por ejemplo.', { c: 'av_vector', h: 'El orden de la tabla es la prioridad.' }),
  Q('¿Qué pasa si activas una interrupción y no escribes su ISR?', ['Salta a __bad_interrupt, que vuelve al vector 0: parece un reinicio extraño', 'Nada', 'Error de compilación', 'Se ignora'], 'Aunque esté vacía, la ISR tiene que existir.', { c: 'av_vector', h: '¿Adónde va el salto si esa entrada de la tabla no tiene función?' }),
  Q('Timer2 en CTC con interrupción a 1 kHz y esta ISR. ¿Qué ves en D13?', ['Una onda cuadrada de 500 Hz', 'Una de 1 kHz', 'D13 fijo a 1', 'Nada: falta loop()'], 'Una conmutación cada milisegundo: periodo de 2 ms.', { code: 'ISR(TIMER2_COMPA_vect) {\n  PINB = (1 << PB5);\n}', c: 'av_ctc', h: 'Un periodo completo necesita dos conmutaciones.' }),
  { t: 'order', q: 'Ordena lo que pasa al saltar una interrupción.', items: ['Se activa la bandera', 'Termina la instrucción en curso', 'Se guarda la dirección de vuelta y se pone I a 0', 'Salta al vector y ejecuta la ISR', 'reti recupera la dirección y pone I a 1'], e: 'Todo esto lo hace el hardware salvo el cuerpo de tu ISR.', c: 'av_isr', h: 'Empieza por el evento y acaba con la vuelta.' },
  Q('Quieres que la ISR larga del Timer1 pueda ser interrumpida por la de INT0. ¿Qué haces?', ['Declararla con ISR_NOBLOCK, que reactiva I al empezar', 'Nada: ya se anidan solas', 'Bajar la prioridad del Timer1', 'Usar volatile'], 'Por defecto, I está a 0 dentro de una ISR.', { c: 'av_isr', h: 'Dentro de una ISR, el permiso global está apagado.' }),
  I('<b>Resumen</b>\n· Tres llaves: bandera, habilitación local y bit I (sei()).\n· Al saltar: guarda la vuelta, pone I a 0 y va al vector; reti vuelve.\n· Vector más bajo = más prioridad; ISR(NOMBRE_vect) para escribirla.\n· Una interrupción activa sin su ISR acaba en un falso reinicio.')
 ]),
 L('av18', 'volatile y secciones críticas', 'shield', ['av_shared', 'av_rmw'], [
  Q('Una ISR pone listo = true y loop() espera con while (!listo) {}. Compilado con optimización y sin volatile, ¿qué crees que pasa?', ['Puede quedarse esperando para siempre', 'Sale en cuanto salta la ISR', 'No compila', 'Se reinicia'], 'El compilador no sabe que la ISR existe: puede leer listo una vez y no volver a mirarla.', { predict: true, c: 'av_shared', h: '¿Sabe el compilador que alguien más cambia esa variable?' }),
  { t: 'explore', text: 'loop() lee una variable de 16 bits que una ISR incrementa. La CPU es de 8 bits: la lee en dos trozos. Elige el valor y cuándo salta la ISR.', viz: 'av_torn', params: { cnt: { label: 'cuenta antes de la ISR', val: 254, list: [254, 255, 511, 1023], dec: 0 }, isr: L01('La ISR salta entre los dos bytes', 0), atom: L01('Leer dentro de ATOMIC_BLOCK', 0) },
    tasks: [{ q: 'broken', min: 1, max: 1, text: 'Consigue una lectura rota', done: 'Con 255 → 256 lees el byte bajo viejo (0xFF) y el alto nuevo (0x01): 511, un valor que nunca existió.', hint: 'Elige 255 y haz que la ISR salte en medio.' },
      { q: 'fixed', min: 1, max: 1, text: 'Arréglala sin quitar la ISR', done: 'Dentro de la sección crítica la ISR espera a que termines de leer.', hint: 'Activa ATOMIC_BLOCK.' }] },
  I('El compilador optimiza: si en un bucle lees una variable que el bucle no cambia, la guarda en un registro y deja de mirarla en la RAM. <b>volatile</b> le obliga a leerla y escribirla en memoria cada vez.', { code: 'volatile bool listo = false;   // la cambia una ISR\n\nISR(INT0_vect) { listo = true; }\n\nvoid esperar() {\n  while (!listo) { }           // ahora sí la relee cada vez\n}' }),
  I('Ojo: volatile la hace <b>visible</b>, no <b>atómica</b>. Una variable de 16 o 32 bits se lee en varios pasos y la ISR puede saltar en medio. Cópiala dentro de una <b>sección crítica</b> lo más corta posible.', { code: '#include <util/atomic.h>\n\nuint16_t copia;\nATOMIC_BLOCK(ATOMIC_RESTORESTATE) {   // aquí no salta ninguna ISR\n  copia = cuenta;\n}                                      // y se restaura el estado anterior' }),
  { t: 'steps', text: 'cuenta (uint16_t) vale 0x00FF y una ISR le suma 1 justo mientras loop() la lee. ¿Qué lee loop()?', steps: ['loop() lee el byte bajo: <b>0xFF</b>', 'Salta la ISR: cuenta pasa a 0x0100', 'loop() lee el byte alto: <b>0x01</b>', 'Junta los dos: 0x01FF = <b>511</b>', 'Ni 255 ni 256: un valor que nunca existió'], result: 'Una lectura rota: 511' },
  Q('¿Qué puede pasar con este código compilado con optimización?', ['Quedarse atascado para siempre: falta volatile en listo', 'Funciona siempre', 'No compila', 'Sale al instante'], 'El compilador no sabe que la ISR existe.', { code: 'bool listo = false;\nISR(INT0_vect) { listo = true; }\n\nvoid esperar() {\n  while (!listo) { }\n}', c: 'av_shared', h: 'Mira cómo está declarada listo.' }),
  Q('volatile uint16_t cuenta; ¿es seguro leerla en loop() mientras una ISR la incrementa?', ['No: son dos bytes y la ISR puede saltar entre la lectura de uno y la del otro', 'Sí, por ser volatile', 'Sí, por ser uint16_t', 'Solo en Arduino'], 'Visibilidad no es atomicidad.', { c: 'av_shared', h: '¿Cuántas instrucciones hacen falta para leer dos bytes?' }),
  Q('¿Por qué ATOMIC_RESTORESTATE y no simplemente cli() … sei()?', ['Si el código ya estaba con interrupciones desactivadas, sei() las activaría por error', 'Es más rápido', 'sei() no existe', 'Es exactamente lo mismo'], 'Restaura SREG en vez de forzar I a 1.', { c: 'av_shared', h: 'Piensa en una función llamada desde un sitio donde I ya estaba a 0.' }),
  Q('Una variable uint8_t que solo escribe la ISR y solo lee loop()…', ['Basta con volatile: leer un byte es una sola instrucción', 'Necesita ATOMIC_BLOCK siempre', 'No necesita nada', 'Debe ir en la EEPROM'], 'Un byte no se puede leer a medias.', { c: 'av_shared', h: '¿Se puede leer un byte en dos trozos?' }),
  Q('¿Cuál necesita ATOMIC_BLOCK para leerse en loop() si una ISR la cambia?', ['volatile uint32_t milis;', 'volatile uint8_t estado;', 'const uint16_t limite = 500;', 'uint8_t local;'], 'Cuatro bytes se leen en cuatro pasos.', { c: 'av_shared', h: 'Busca la que tiene más de un byte y cambia una ISR.' }),
  Q('contador++ sobre un uint8_t desde loop() y también desde una ISR…', ['No es atómico: leer, sumar y escribir son tres pasos; protégelo', 'Es atómico', 'Es atómico por ser de 8 bits', 'Lo arregla volatile'], 'El mismo problema que PORTB |= …', { c: 'av_rmw', h: 'Aquí no es una lectura: es leer, modificar y escribir.' }),
  I('Lo mismo pasa con los registros de 16 bits del Timer1 (TCNT1, OCR1A, ICR1): comparten un registro temporal. Si una ISR también los toca, protege el acceso desde loop().', { code: 'ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {\n  OCR1A = nuevo;     // nadie usa el registro temporal a la vez\n}' }),
  Q('¿Cuándo hay que proteger un acceso a OCR1A desde loop()?', ['Cuando alguna ISR también lee o escribe registros de 16 bits del Timer1', 'Nunca', 'Siempre que uses delay()', 'Solo en modo normal'], 'Las dos usarían el mismo registro temporal.', { c: 'av_shared', h: '¿Qué comparten los registros de 16 bits del Timer1?' }),
  Q('Una sección crítica bien hecha es…', ['Lo más corta posible: copiar y salir', 'Larga, para ir sobre seguro', 'Con delay() dentro', 'Con Serial.print() dentro'], 'Mientras dura, ninguna interrupción puede atenderse.', { c: 'av_shared', h: '¿Qué les pasa a las demás interrupciones mientras dura?' }),
  I('<b>Resumen</b>\n· <b>volatile</b>: el compilador relee la variable cada vez (visibilidad).\n· Variables de más de un byte, o leer–modificar–escribir: sección crítica (atomicidad).\n· ATOMIC_BLOCK(ATOMIC_RESTORESTATE), y lo más corta posible: copia y sal.')
 ]),
 L('av19', 'INT0, INT1 y PCINT', 'chip', ['av_extint', 'av_bits', 'av_bounce', 'av_altfn'], [
  Q('Un codificador rotatorio en PB0 y PB1 debe interrumpir, pero attachInterrupt solo sirve en D2 y D3. ¿Crees que hay forma?', ['Sí: casi todas las patas tienen interrupción por cambio de pin (PCINT)', 'No: hay que moverlo a D2 y D3', 'Sí, con delay()', 'Solo con otra placa'], 'Las PCINT están en casi todas las patas, agrupadas por puertos.', { predict: true, c: 'av_extint', h: 'D2 y D3 son las interrupciones «completas», pero no las únicas.' }),
  { t: 'explore', text: 'Un pulsador real <b>rebota</b>: al cerrar, abre y cierra varias veces en pocos milisegundos. Una interrupción por flanco ve cada rebote. Filtra ignorando flancos durante un tiempo.', viz: 'mc_bounce', params: { T: pSl('Ignorar flancos durante', 0, 0, 40, 1, 'ms', 0) },
    tasks: [{ q: 'n', min: 3, max: 5, text: 'Prueba un filtro corto, de 2 a 5 ms', done: 'Aún cuenta de más: los rebotes duran varios milisegundos.', hint: 'Sube el filtro a 2 o 3 ms.' },
      { q: 'n', min: 2, max: 2, text: 'Encuentra un filtro que cuente solo las 2 pulsaciones reales', done: 'Unos 10–20 ms bastan: cada pulsación cuenta una vez.', hint: 'Sigue subiendo.' }] },
  I('<b>INT0</b> (PD2, D2) e <b>INT1</b> (PD3, D3) tienen vector propio. En <b>EICRA</b> eliges el disparo con los bits ISCn1:0 (00 nivel bajo, 01 cualquier cambio, 10 bajada, 11 subida) y en <b>EIMSK</b> las activas.', { code: 'EICRA = (1 << ISC01);        // INT0 en flanco de bajada (ISC01:00 = 10)\nEIMSK = (1 << INT0);         // habilita INT0\nsei();\n\nISR(INT0_vect) { pulsos++; }' }),
  { t: 'bits', q: 'EICRA: INT1 por subida (ISC11 = 1, ISC10 = 1) e INT0 por bajada (ISC01 = 1, ISC00 = 0). Bits 3 a 0: ISC11, ISC10, ISC01, ISC00.', n: 8, target: 14, e: '0b00001110 = 14.', c: 'av_bits', h: 'Enciende los bits 3, 2 y 1; el 0 queda a 0.' },
  I('Las <b>PCINT</b> están en casi todas las patas, pero agrupadas: <b>un vector por puerto</b> (PCINT0 = B, PCINT1 = C, PCINT2 = D), siempre por cualquier cambio. <b>PCICR</b> activa el grupo y <b>PCMSKn</b> elige las patas.', { code: 'PCICR  |= (1 << PCIE0);                    // grupo del puerto B\nPCMSK0 |= (1 << PCINT0) | (1 << PCINT1);   // solo PB0 y PB1\n\nISR(PCINT0_vect) { /* ¿cuál ha cambiado? */ }' }),
  I('Como el vector es compartido, la ISR debe averiguar <b>qué pata cambió</b>: guarda el valor anterior de PINx y haz XOR con el actual. Los bits a 1 del resultado son los que cambiaron.', { code: 'ISR(PCINT0_vect) {\n  static uint8_t antes = 0xFF;\n  uint8_t ahora  = PINB;\n  uint8_t cambio = ahora ^ antes;   // 1 = ha cambiado\n  antes = ahora;\n  if (cambio & (1 << PB0)) { /* PB0 ha cambiado */ }\n}' }),
  { t: 'steps', text: 'antes = 0b00000101 y ahora = 0b00000110. ¿Qué patas han cambiado y hacia dónde?', steps: ['XOR marca las diferencias: 0101 ^ 0110 = <b>0011</b>', 'Han cambiado los bits 0 y 1', 'Bit 0: ahora vale 0 → ha <b>bajado</b>', 'Bit 1: ahora vale 1 → ha <b>subido</b>'], result: 'PB0 bajó y PB1 subió' },
  { t: 'match', q: 'Une cada vector con sus patas.', pairs: [['PCINT0_vect', 'Puerto B (D8–D13)'], ['PCINT1_vect', 'Puerto C (A0–A5)'], ['PCINT2_vect', 'Puerto D (D0–D7)'], ['INT0_vect', 'Solo PD2']], c: 'av_extint', h: 'PCINT0, 1 y 2 van en el orden de los puertos B, C y D.' },
  Q('¿Qué contiene la variable cambio?', ['Los bits que han cambiado desde la última vez', 'Los bits que están a 1', 'Los bits que están a 0', 'El número de cambios'], 'XOR entre lo de ahora y lo de antes.', { code: 'uint8_t cambio = ahora ^ antes;', c: 'av_extint', h: 'XOR da 1 donde los dos bytes son distintos.' }),
  Q('Un pulsador en A2 debe interrumpir. ¿Qué activas?', ['PCIE1 en PCICR y PCINT10 en PCMSK1', 'INT0', 'PCIE0 en PCICR', 'INT1 por flanco'], 'A2 = PC2 = PCINT10, del grupo del puerto C.', { c: 'av_extint', h: 'A2 está en el puerto C: ¿qué grupo PCINT es?' }),
  Q('Codificador rotatorio en PB0 y PB1. ¿Qué interrupción usas?', ['PCINT0, con PCINT0 y PCINT1 activados en PCMSK0', 'INT0', 'TIMER1_OVF', 'USART_RX'], 'PB0 y PB1 no tienen INT0/INT1.', { c: 'av_extint', h: 'Las dos patas están en el puerto B.' }),
  Q('Tu contador por INT0 sube de 1 a 4 en cada pulsación. ¿Causa?', ['Rebotes del contacto: varios flancos por pulsación', 'Falta volatile', 'El prescaler', 'Falta sei()'], 'Filtra con un RC o ignorando flancos unos 20 ms.', { c: 'av_bounce', h: 'Un contacto mecánico no cierra limpio.' }),
  Q('Con un filtro de 20 ms llegan flancos a 0, 2, 5 y 150 ms. ¿Cuántas pulsaciones cuentas?', ['2', '4', '1', '3'], 'Aceptas 0 y 150; descartas 2 y 5.', { c: 'av_bounce', h: 'Tras aceptar un flanco, ignora los que lleguen en los 20 ms siguientes.' }),
  { t: 'pin', q: '¿En qué pin de la Uno está INT1?', a: 'D3', e: 'INT1 = PD3 = D3.', c: 'av_altfn', h: 'INT0 está en D2.' },
  I('<b>Resumen</b>\n· INT0 (D2) e INT1 (D3): vector propio y disparo a elegir en EICRA.\n· PCINT: casi todas las patas, un vector por puerto, por cualquier cambio; XOR para saber cuál cambió.\n· Un pulsador rebota: filtra unos 10–20 ms o con un RC.')
 ]),
 L('av20', 'Latencia e ISR cortas', 'timer', ['av_isrcost', 'av_tflag', 'av_isr', 'av_debug'], [
  Q('Tu ISR tarda 200 ciclos y salta 40 000 veces por segundo a 16 MHz. ¿Cuánta CPU crees que se lleva?', ['La mitad', 'Casi nada', 'Toda', 'Un 5 %'], '200 × 40 000 = 8 millones de ciclos de 16 millones.', { predict: true, c: 'av_isrcost', h: 'Multiplica ciclos por veces por segundo y compáralo con 16 millones.' }),
  { t: 'explore', text: 'Una ISR que salta muchas veces por segundo. La pata de traza está a 1 mientras corre la ISR: su ciclo de trabajo es la carga de CPU.', viz: 'av_irq', params: { f: { label: 'Interrupciones por segundo', val: 1000, list: [100, 1000, 10000, 40000, 100000], dec: 0 }, cyc: pSl('Ciclos por ISR', 100, 20, 400, 10) },
    tasks: [{ q: 'load', min: 0.5, max: 1e9, text: 'Lleva la carga por encima del 50 %', done: 'Mientras corre la ISR, loop() está parado: la mitad de la CPU se va en atenderla.', hint: 'Sube las interrupciones por segundo y los ciclos.' },
      { q: 'ok100', min: 1, max: 1, text: 'Con 100 000 por segundo, deja la carga por debajo del 25 %', done: 'Menos de 40 ciclos por ISR, contando el prólogo: hay que ser muy breve.', hint: 'Baja los ciclos por ISR.' }] },
  I('<b>Latencia</b>: de la bandera a tu primera línea pasan al menos 4 ciclos de respuesta, el salto del vector y el <b>prólogo</b> que añade el compilador (guarda SREG y los registros que usa la ISR). Si otra ISR está en marcha, además, espera a que acabe.', { svg: SV_LAT }),
  { t: 'steps', text: 'Una ISR de 200 ciclos salta 40 000 veces por segundo a 16 MHz. ¿Qué carga de CPU supone?', steps: ['Ciclos por segundo dentro de la ISR: 200 × 40 000 = <b>8 000 000</b>', 'La CPU da 16 000 000 ciclos por segundo', 'Carga = 8 000 000 / 16 000 000 = <b>50 %</b>', 'A loop() le queda la otra mitad'], result: '50 % de la CPU' },
  Nm('Una ISR de 100 ciclos salta 16 000 veces por segundo a 16 MHz. ¿Carga, en %?', 10, '%', '1,6 millones de 16 millones.', { c: 'av_isrcost', h: 'Ciclos × veces por segundo / 16 000 000, y pásalo a %.' }),
  Q('Llega tu interrupción mientras otra ISR está en marcha…', ['Espera a que termine: su duración se suma a tu latencia', 'Interrumpe a la otra', 'Se pierde siempre', 'Se ejecutan a la vez'], 'Sin anidamiento, van en fila.', { c: 'av_isrcost', h: '¿Qué vale el bit I dentro de una ISR?' }),
  I('Reglas de oro: nada de delay(), Serial ni bucles de espera dentro de una ISR. <b>Copia el dato, pon una bandera y sal</b>; el trabajo pesado, en loop().', { code: 'volatile uint16_t dato;\nvolatile bool hayDato = false;\n\nISR(TIMER1_CAPT_vect) { dato = ICR1; hayDato = true; }   // corta\n\nvoid loop() {\n  if (hayDato) { hayDato = false; procesar(dato); }   // lo pesado, aquí\n}' }),
  Q('¿Qué problema tiene esto?', ['Serial usa interrupciones para enviar: dentro de una ISR puede bloquearse si su búfer se llena, y la alarga muchísimo', 'Funciona perfecto', 'Es más rápido', 'No compila'], 'Anota el evento y deja que loop() imprima.', { code: 'ISR(INT0_vect) {\n  Serial.println("pulsado");\n}', c: 'av_isrcost', h: '¿Cómo envía Serial los bytes, y qué pasa con eso dentro de una ISR?' }),
  Q('La bandera de una interrupción se activa dos veces antes de que se atienda…', ['Solo cuenta una: el segundo evento se pierde', 'Se ejecuta dos veces', 'Se acumulan en una cola', 'Se reinicia el chip'], 'Por eso las ISR deben ser cortas.', { c: 'av_tflag', h: 'Una bandera es un solo bit.' }),
  Q('ISR_NOBLOCK sirve para…', ['Reactivar las interrupciones al empezar la ISR y dejar que otra la interrumpa', 'Bloquear todas', 'Hacerla más corta', 'Nada'], 'Útil para una ISR larga que no debe retrasar a otra urgente.', { c: 'av_isr', h: 'NOBLOCK: no bloquea a las demás.' }),
  I('Para medir cuánto dura una ISR sin depurador: pon una pata a 1 al entrar y a 0 al salir (un <b>pin de traza</b>). El ancho del pulso es su duración y el ciclo de trabajo, la carga. Cuesta un par de ciclos, al contrario que Serial.print().', { code: 'ISR(TIMER1_COMPA_vect) {\n  PORTB |= (1 << PB0);    // traza a 1\n  // ...trabajo...\n  PORTB &= ~(1 << PB0);   // traza a 0\n}' }),
  Q('¿Cómo mides con un osciloscopio cuánto dura una ISR?', ['Pones una pata a 1 al entrar y a 0 al salir y mides el pulso', 'Con millis()', 'Con Serial', 'No se puede'], 'Un pin de traza: la herramienta más útil sin depurador.', { c: 'av_debug', h: 'Necesitas algo que el osciloscopio pueda ver.' }),
  Q('El pin de traza de una ISR está a 1 el 25 % del tiempo. ¿Qué te dice?', ['Que la ISR consume un 25 % de la CPU', 'Que salta 25 veces por segundo', 'Que dura 25 µs', 'Nada'], 'Ciclo de trabajo = fracción del tiempo dentro.', { c: 'av_debug', h: 'La pata está a 1 exactamente mientras corre la ISR.' }),
  I('<b>Resumen</b>\n· Latencia: de 20 a 40 ciclos, más lo que tarde otra ISR en marcha.\n· Carga = ciclos por ISR × veces por segundo / F_CPU.\n· ISR cortas: copia, bandera y sal. Nada de delay() ni Serial.\n· Un pin de traza mide duración y carga.')
 ]),
 L('av21', 'Búferes circulares', 'memory', ['av_ring', 'av_uartrate'], [
  Q('Llegan bytes por el puerto serie mientras loop() está ocupado dibujando una pantalla. ¿Qué crees que hace Serial con ellos?', ['Los guarda una ISR en un búfer de 64 bytes hasta que los leas', 'Se pierden todos', 'Espera a que loop() termine para recibirlos', 'Los devuelve al emisor'], 'Una ISR los mete en un búfer circular; Serial.read() los saca.', { predict: true, c: 'av_ring', h: 'Piensa en lo que aprendiste de las ISR: copiar y salir.' }),
  { t: 'explore', text: 'Un búfer circular de recepción: la ISR escribe en la <b>cabeza</b> y loop() lee en la <b>cola</b>. Mira cuántos bytes llegan mientras loop() está ocupado.', viz: 'av_ring', params: { tam: { label: 'TAM', val: 16, list: [8, 16, 32, 64], dec: 0 }, baud: { label: 'Baudios', val: 9600, list: [9600, 38400, 115200], dec: 0 }, busy: pSl('loop() ocupado', 5, 0, 20, 1, 'ms') },
    tasks: [{ q: 'lost', min: 1, max: 1e9, text: 'Haz que se pierdan bytes', done: 'Si llegan más de TAM − 1 antes de que loop() lea, la ISR no tiene dónde guardarlos.', hint: 'Más baudios o más tiempo ocupado.' },
      { q: 'ok115', min: 1, max: 1, text: 'A 115 200 baudios y 4 ms ocupado, que no se pierda nada', done: 'Llegan unos 46 bytes: con TAM = 64 caben 63.', hint: 'Sube el tamaño del búfer.' }] },
  I('Un <b>búfer circular</b> es un array con dos índices: la ISR escribe en la <b>cabeza</b> y loop() lee en la <b>cola</b>. Al llegar al final, cada índice vuelve a 0. Si cabeza = cola, está vacío. La ISR nunca espera y no se pierde nada mientras haya hueco.', { code: '#define TAM 64                    // potencia de 2\nvolatile uint8_t buf[TAM];\nvolatile uint8_t cabeza = 0, cola = 0;\n\n// avanzar un índice dando la vuelta, sin dividir:\nsig = (cabeza + 1) & (TAM - 1);' }),
  I('El búfer de recepción completo. <b>UDR0</b> es el registro donde la USART deja cada byte que llega (lo verás a fondo en el módulo 5). Serial hace exactamente esto.', { code: 'ISR(USART_RX_vect) {                 // productor\n  uint8_t c = UDR0;\n  uint8_t sig = (cabeza + 1) & (TAM - 1);\n  if (sig != cola) {                 // si no está lleno…\n    buf[cabeza] = c;                 // 1.º el dato\n    cabeza = sig;                    // 2.º el índice\n  }\n}\n\nint16_t leer(void) {                 // consumidor, desde loop()\n  if (cola == cabeza) return -1;     // vacío\n  uint8_t c = buf[cola];\n  cola = (cola + 1) & (TAM - 1);\n  return c;\n}' }),
  { t: 'steps', text: 'Con TAM = 64, ¿por qué solo caben 63 bytes?', steps: ['cabeza = cola significa «vacío»', 'Si dejáramos llenar las 64 casillas, la cabeza alcanzaría otra vez a la cola', 'Entonces «lleno» y «vacío» serían iguales: imposible distinguirlos', 'Por eso se deja siempre un hueco: caben <b>TAM − 1 = 63</b>'], result: '63 bytes útiles' },
  Q('¿Por qué TAM es potencia de 2?', ['Porque & (TAM − 1) da la vuelta sin dividir: es muy rápido', 'Por estética', 'Lo exige el compilador', 'Ocupa menos'], 'La CPU no tiene divisor: el resto (%) sería lento.', { c: 'av_ring', h: 'Recuerda que el 328P no tiene divisor por hardware.' }),
  Q('TAM = 32. ¿Cuántos bytes caben como máximo?', ['31', '32', '33', '16'], 'Se deja un hueco para distinguir lleno de vacío.', { c: 'av_ring', h: 'TAM − 1.' }),
  Q('¿Hace falta desactivar interrupciones en leer()?', ['No: cada índice lo escribe un solo lado y son de 8 bits', 'Sí, siempre', 'Sí, porque buf es volatile', 'Solo con TAM grande'], 'Un productor, un consumidor e índices de un byte.', { c: 'av_ring', h: '¿Quién escribe cola y quién escribe cabeza?' }),
  { t: 'order', q: 'Ordena la escritura segura en la ISR de recepción.', items: ['Calcular el índice siguiente', 'Comprobar que no alcanza a la cola', 'Guardar el dato en la cabeza actual', 'Avanzar la cabeza'], e: 'El dato se guarda antes de publicarlo moviendo la cabeza.', c: 'av_ring', h: 'Mover la cabeza es lo que «publica» el dato: va al final.' },
  Q('En el búfer de envío, el productor es loop() y el consumidor una ISR. Si loop() avanza la cabeza antes de guardar el dato…', ['La ISR puede saltar en medio y enviar una casilla con basura', 'No pasa nada', 'Va más rápido', 'Se pierde la cola'], 'Primero el dato, luego el índice.', { c: 'av_ring', h: '¿Qué ve el consumidor en cuanto la cabeza avanza?' }),
  Nm('Recibes a 115 200 baudios (8N1) y loop() tarda hasta 4 ms en volver a leer. ¿Cuántos bytes pueden llegar en ese tiempo?', 46, 'bytes', '11 520 bytes/s × 0,004 s ≈ 46.', { tol: 1, c: 'av_uartrate', h: 'Cada byte son 10 bits: baudios / 10 da bytes por segundo.' }),
  Q('¿Te basta un búfer de 64 bytes en ese caso?', ['Sí, pero con poco margen: si loop() se alarga, se perderán datos', 'No, hacen falta 1024', 'Sobra muchísimo', 'Da igual el tamaño'], '63 útiles frente a 46 por vuelta de loop().', { c: 'av_uartrate', h: 'Compara 46 con la capacidad útil de un búfer de 64.' }),
  Nm('A 9600 baudios, ¿cuántos bytes llegan en 50 ms?', 48, 'bytes', '960 bytes/s × 0,05 s = 48.', { tol: 1, c: 'av_uartrate', h: '9600 / 10 bytes por segundo, por el tiempo en segundos.' }),
  I('<b>Resumen</b>\n· Búfer circular: la ISR escribe en la cabeza, loop() lee en la cola.\n· TAM potencia de 2 (vuelta con &amp;) y capacidad TAM − 1.\n· Primero el dato, luego el índice; sin cli() si cada índice tiene un solo dueño.\n· Tamaño: lo que llega mientras loop() está ocupado (baudios / 10 × tiempo).')
 ]),
 SIM('av-s4', 'Reto: la entrada INT0', 'El programa del pulsador lee D2, que es PD2: la pata de INT0. Monta el pulsador entre PD2 y GND (el programa activa la pull-up) y el LED en PB5 de la Nano.', { arduino: 'boton', board: 'nano', parts: ['push', 'res', 'led'], code: true, hint: 'PD2 = D2, en la fila de abajo de la Nano. LED con su resistencia en D13 (PB5).' }, 'av_int0'),
 PRJ('av-p7', 'Proyecto: lector de mandos infrarrojos', 'av_ir'),
 PRJ('av-p8', 'Proyecto: sintetizador de 8 bits', 'av_synth')
], exam: [
  Q('Activas OCIE1A y llamas a sei(), pero la bandera OCF1A estaba a 1 desde hace rato. ¿Qué pasa?', ['La ISR salta en cuanto pones sei(): la bandera pendiente se atiende al momento', 'No salta hasta la siguiente coincidencia', 'La bandera se borra sola al activar OCIE1A', 'El chip se reinicia'], 'Bandera, habilitación local y bit I a 1: se cumplen las tres llaves. Si no quieres ese salto, borra la bandera (escribiendo un 1) antes de habilitar.', { c: 'av_isr', h: 'Repasa las tres condiciones para que salte una interrupción.', l: 'av17' }),
  Q('USART_RX_vect (vector 19) y TIMER1_COMPA_vect (vector 12) están pendientes a la vez. ¿Cuál se atiende primero?', ['TIMER1_COMPA_vect', 'USART_RX_vect', 'La que llegó antes', 'Las dos a la vez'], 'Gana la de vector más bajo. Al acabar, se atiende la otra.', { c: 'av_vector', h: 'El orden de la tabla es la prioridad.', l: 'av17' }),
  Q('Activas la interrupción de comparación A del Timer2, pero escribes la ISR de la B. ¿Qué pasa en cada coincidencia con OCR2A?', ['Salta a __bad_interrupt y el chip parece reiniciarse', 'Se ejecuta la ISR de COMPB', 'No pasa nada', 'Error de compilación'], 'La entrada de COMPA está vacía: el salto acaba en __bad_interrupt, que vuelve al vector 0.', { code: 'TIMSK2 = (1 << OCIE2A);\nsei();\n\nISR(TIMER2_COMPB_vect) { ticks++; }', c: 'av_vector', h: 'Compara la interrupción activada con la ISR escrita.', l: 'av17' }),
  Nm('Timer1 en CTC con prescaler 256 y OCR1A = 31 249; su ISR conmuta D13. ¿A qué frecuencia parpadea el LED, en Hz?', 1, 'Hz', '16 000 000 / (256 × 31 250) = 2 interrupciones por segundo. Dos conmutaciones hacen un periodo: 1 Hz.', { c: 'av_ctc', h: 'Primero las interrupciones por segundo; luego, cuántas hacen un periodo.', l: 'av17' }),
  { t: 'match', q: 'Une cada vector con lo que lo dispara.', pairs: [['TIMER1_OVF_vect', 'El Timer1 da la vuelta'], ['PCINT1_vect', 'Cambia una pata del puerto C'], ['WDT_vect', 'Expira el watchdog'], ['TIMER2_COMPA_vect', 'TCNT2 alcanza OCR2A']], c: 'av_vector', h: 'El nombre de cada vector dice el periférico y el evento.', l: 'av17' },
  Q('¿Qué problema tiene este if si una ISR incrementa pulsos?', ['Lee dos bytes y la ISR puede saltar entre ellos: copia pulsos en ATOMIC_BLOCK y compara la copia', 'Ninguno: es volatile', 'Falta un delay()', 'No compila'], 'volatile obliga a leer la memoria, pero no impide que la lectura de dos bytes se parta.', { code: 'volatile uint16_t pulsos;   // la incrementa una ISR\n\nvoid loop() {\n  if (pulsos >= 1000) { /* ... */ }\n}', c: 'av_shared', h: 'Visibilidad no es atomicidad.', l: 'av18' }),
  Q('¿Cuál de estas variables necesita volatile?', ['Una bandera que pone una ISR y lee loop()', 'Una variable local de loop()', 'Una tabla const en PROGMEM', 'Un parámetro de una función normal'], 'Solo las que cambia alguien que el compilador no ve en ese código: una ISR o el hardware.', { c: 'av_shared', h: '¿Cuál cambia sin que el código de loop() lo sepa?', l: 'av18' }),
  Nm('cuenta (uint16_t) pasa de 0x02FF a 0x0300 justo entre las dos lecturas de loop(), que lee primero el byte bajo. ¿Qué valor lee, en decimal?', 1023, '', 'Byte bajo viejo (0xFF) y alto nuevo (0x03): 0x03FF = 1023. Ni 767 ni 768.', { c: 'av_shared', h: 'Junta el byte bajo de antes con el alto de después.', l: 'av18' }),
  Q('Una ISR hace estado |= 0x01 y loop() hace estado |= 0x80 sobre un volatile uint8_t. ¿Dónde está el riesgo?', ['En loop(): su leer–modificar–escribir puede pisar el bit que ponga la ISR; protégelo', 'En la ISR', 'En ninguna: un byte es atómico', 'Lo resuelve volatile'], 'Dentro de la ISR no salta nada más. En loop(), si la ISR cae entre leer y escribir, la copia vieja borra su bit.', { c: 'av_rmw', h: 'Leer un byte es atómico; leerlo, modificarlo y escribirlo, no.', l: 'av18' }),
  Q('Un pulsador en D7 debe lanzar una interrupción. ¿Qué configuras?', ['PCIE2 en PCICR y el bit 7 de PCMSK2 (PCINT23)', 'INT1 en EIMSK', 'PCIE0 en PCICR y el bit 7 de PCMSK0', 'PCIE1 en PCICR y el bit 7 de PCMSK1'], 'D7 = PD7: no tiene INT0 ni INT1, pero sí PCINT, del grupo del puerto D (PCINT2_vect).', { c: 'av_extint', h: 'D7 está en el puerto D: ¿qué grupo PCINT le toca?', l: 'av19' }),
  { t: 'bits', q: 'EICRA: INT1 por cualquier cambio (ISC11:10 = 01) e INT0 por flanco de subida (ISC01:00 = 11). Bits 3 a 0: ISC11, ISC10, ISC01, ISC00.', n: 8, target: 7, e: '0b00000111 = 7: ISC11 = 0, ISC10 = 1, ISC01 = 1 e ISC00 = 1.', c: 'av_bits', h: 'Escribe las dos parejas una detrás de otra: primero la de INT1.', l: 'av19' },
  Q('En la ISR de PCINT0, antes = 0b00001100 y ahora = 0b00000110. ¿Qué ha pasado?', ['PB1 ha subido y PB3 ha bajado', 'PB1 ha bajado y PB3 ha subido', 'Solo ha cambiado PB2', 'No ha cambiado nada'], 'XOR = 0b00001010: cambian los bits 1 y 3. El bit 1 vale ahora 1 (subió) y el 3 vale 0 (bajó). PB2 sigue a 1.', { c: 'av_extint', h: 'XOR para saber qué cambió; el valor de ahora para saber hacia dónde.', l: 'av19' }),
  Q('¿Cómo distingues en una PCINT si el flanco fue de subida o de bajada?', ['Mirando el nivel actual de la pata en la ISR: las PCINT saltan con cualquier cambio', 'Configurándolo en EICRA', 'Con PCMSK', 'No se puede'], 'Las PCINT no eligen flanco. Si ahora la pata está a 1, ha subido; si está a 0, ha bajado.', { c: 'av_extint', h: 'EICRA solo sirve para INT0 e INT1.', l: 'av19' }),
  Nm('Filtro de rebotes de 15 ms. Llegan flancos a 0, 3, 12, 40, 44 y 100 ms. ¿Cuántas pulsaciones cuentas?', 3, 'pulsaciones', 'Aceptas 0 (ignoras 3 y 12), aceptas 40 (ignoras 44) y aceptas 100: tres.', { c: 'av_bounce', h: 'Tras aceptar un flanco, ignora los que caigan en los 15 ms siguientes.', l: 'av19' }),
  Nm('Una ISR de 60 ciclos salta 50 000 veces por segundo a 16 MHz. ¿Carga de CPU, en %?', 18.75, '%', '60 × 50 000 = 3 000 000 de 16 000 000 ciclos: 18,75 %.', { tol: 0.1, c: 'av_isrcost', h: 'Ciclos por ISR × veces por segundo / F_CPU.', l: 'av20' }),
  Nm('Una ISR salta 20 000 veces por segundo y no debe pasar del 10 % de la CPU a 16 MHz. ¿Cuántos ciclos puede durar como mucho, contando el prólogo?', 80, 'ciclos', '10 % de 16 000 000 = 1 600 000 ciclos por segundo, entre 20 000 = 80 ciclos.', { c: 'av_isrcost', h: 'Presupuesto de ciclos por segundo, repartido entre las veces que salta.', l: 'av20' }),
  Q('La ISR del Timer1 calcula un filtro en float que tarda unos 2000 ciclos. ¿Qué propones?', ['Que la ISR solo guarde la muestra y ponga una bandera; el filtro, en loop()', 'Declararla volatile', 'Llamar a sei() al principio sin más', 'Añadir un delay() para que respire'], 'Mientras dura una ISR, las demás esperan. Copia, bandera y sal: lo pesado va fuera.', { c: 'av_isrcost', h: 'Recuerda la regla de oro de las ISR.', l: 'av20' }),
  Q('El pin de traza de una ISR da pulsos de 5 µs cada 50 µs. ¿Qué sabes?', ['Dura 5 µs, salta 20 000 veces por segundo y se lleva un 10 % de la CPU', 'Dura 50 µs', 'Se lleva un 50 % de la CPU', 'Salta 5000 veces por segundo'], 'Ancho = duración; un periodo de 50 µs son 20 000 por segundo; ciclo de trabajo = 5 / 50 = 10 % de carga.', { c: 'av_debug', h: 'Ancho del pulso, periodo y ciclo de trabajo.', l: 'av20' }),
  Q('Un evento llega cada 1 ms y otra ISR bloquea 2,5 ms seguidos. ¿Qué pasa con esos eventos?', ['Se juntan al menos dos y la bandera solo recuerda uno: se pierde alguno', 'Se atienden todos al acabar', 'Se reinicia el chip', 'Se acumulan en una cola de hardware'], 'Una bandera es un bit: dice «ha pasado algo», no «cuántas veces».', { c: 'av_tflag', h: '¿Cuántos eventos caben en 2,5 ms y cuántos recuerda un bit?', l: 'av20' }),
  { t: 'order', q: 'Ordena el patrón de una ISR corta que pasa un dato a loop().', items: ['La ISR copia el dato en una variable volatile', 'La ISR pone hayDato = true y sale', 'loop() ve hayDato y lo pone a false', 'loop() procesa el dato con calma'], e: 'La ISR solo anota; el trabajo pesado se hace fuera, sin retrasar otras interrupciones.', c: 'av_isrcost', h: 'Primero lo que pasa dentro de la ISR, luego lo que hace loop().', l: 'av20' },
  Nm('Búfer circular con TAM = 16, cabeza = 3 y cola = 12. ¿Cuántos bytes hay guardados?', 7, 'bytes', 'De la cola al final: 12, 13, 14 y 15 (4); y del principio a la cabeza: 0, 1 y 2 (3). Total 7, que es (3 − 12) & 15.', { c: 'av_ring', h: 'Cuenta desde la cola hasta la cabeza dando la vuelta.', l: 'av21' }),
  Q('Alguien pone TAM = 50 y avanza los índices con (i + 1) & (TAM − 1). ¿Qué pasa?', ['Los índices no dan la vuelta bien: & 49 no es una máscara de unos seguidos; TAM debe ser potencia de 2', 'Funciona igual, con 49 bytes útiles', 'Va más rápido', 'No compila'], '49 = 0b110001: de 1 se pasa a 2 & 49 = 0, y el búfer nunca sale de las dos primeras casillas. Solo con potencias de 2, TAM − 1 son todo unos.', { c: 'av_ring', h: 'Escribe 49 en binario.', l: 'av21' }),
  Nm('Recibes a 57 600 baudios (8N1) y loop() puede tardar hasta 10 ms en leer. ¿Cuántos bytes pueden llegar mientras?', 57.6, 'bytes', '57 600 / 10 = 5760 bytes por segundo × 0,01 s ≈ 58 bytes.', { tol: 1, c: 'av_uartrate', h: 'Bytes por segundo = baudios / 10.', l: 'av21' }),
  Q('En ese caso (unos 58 bytes por vuelta de loop()), ¿qué TAM eliges como mínimo?', ['64', '32', '58', '128'], 'TAM debe ser potencia de 2 y guardar al menos 58 bytes: con 64 caben 63. Justo, pero cabe; con más margen, 128.', { c: 'av_ring', h: 'Potencia de 2 y capacidad TAM − 1.', l: 'av21' })
] };

  /* ===================== MÓDULO 5 · Periféricos por registros ===================== */
  const SV_SAMP = `<svg viewBox="0 0 300 130" class="viz"><text x="10" y="18" class="vizsm">Tu sensor</text>
    <path d="M30 30v20" stroke="currentColor" stroke-width="2"/><path d="M30 50l6 4-12 6 12 6-12 6 12 6-6 4v8" fill="none" stroke="var(--led)" stroke-width="2"/><text x="44" y="70" class="vizsm" style="fill:var(--led)">R de la fuente</text>
    <path d="M30 90H130" stroke="currentColor" stroke-width="2"/><path d="M130 90l26 -12" stroke="currentColor" stroke-width="2.4"/><path d="M158 90H200" stroke="currentColor" stroke-width="2"/>
    <path d="M200 90v6M188 96h24M188 102h24M200 102v10" stroke="var(--ice)" stroke-width="2.4"/><text x="218" y="104" class="vizsm" style="fill:var(--ice)">≈ 14 pF</text>
    <text x="120" y="70" class="vizsm">muestreo</text><text x="10" y="124" class="vizsm">Para que se llene a tiempo: fuente de 10 kΩ o menos</text></svg>`;
  const SV_OD = `<svg viewBox="0 0 300 150" class="viz"><path d="M20 40H280" stroke="var(--ice)" stroke-width="2.4"/><text x="282" y="36" text-anchor="end" class="vizsm">SDA</text>
    <path d="M50 14v6l6 3-12 5 12 5-12 5 6 3v-1" fill="none" stroke="var(--led)" stroke-width="2"/><text x="64" y="26" class="vizsm" style="fill:var(--led)">pull-up 4,7 kΩ a VCC</text>
    ${[110, 210].map((x, i) => `<path d="M${x} 40V70" stroke="currentColor" stroke-width="2"/><rect x="${x - 26}" y="70" width="52" height="40" rx="5" fill="none" stroke="var(--line)"/><text x="${x}" y="88" text-anchor="middle" class="vizsm">${i ? 'esclavo' : 'maestro'}</text><text x="${x}" y="102" text-anchor="middle" class="vizsm">solo tira a 0</text><path d="M${x} 110v12M${x - 8} 122h16" stroke="currentColor" stroke-width="2"/>`).join('')}
    <text x="20" y="144" class="vizsm">Nadie empuja a 1: si dos tiran a la vez, no hay corto</text></svg>`;
  const SV_UWIRE = `<svg viewBox="0 0 300 130" class="viz"><rect x="10" y="20" width="80" height="90" rx="6" fill="none" stroke="var(--line)"/><text x="50" y="40" text-anchor="middle" class="vizlab">Uno</text>
    <rect x="210" y="20" width="80" height="90" rx="6" fill="none" stroke="var(--line)"/><text x="250" y="40" text-anchor="middle" class="vizlab">Módulo</text>
    <text x="84" y="62" text-anchor="end" class="vizsm">TX</text><text x="84" y="82" text-anchor="end" class="vizsm">RX</text><text x="84" y="102" text-anchor="end" class="vizsm">GND</text>
    <text x="216" y="62" class="vizsm">RX</text><text x="216" y="82" class="vizsm">TX</text><text x="216" y="102" class="vizsm">GND</text>
    <path d="M90 58C150 58 150 78 210 78" fill="none" stroke="var(--led)" stroke-width="2"/><path d="M90 78C150 78 150 58 210 58" fill="none" stroke="var(--ice)" stroke-width="2"/><path d="M90 98H210" stroke="currentColor" stroke-width="2"/>
    <text x="150" y="124" text-anchor="middle" class="vizsm">TX con RX, RX con TX y masa común</text></svg>`;

  const M5 = { id: 'av-m5', title: 'Periféricos por registros', desc: 'ADC fino, USART con interrupciones, SPI, TWI, EEPROM, comparador y watchdog.', nodes: [
 L('av22', 'El ADC por registros', 'gauge', ['av_adcreg', 'av_adc'], [
  Q('Con una referencia de 5 V, el ADC de 10 bits mide 2,5 V. ¿Qué número crees que da?', ['Unos 512', '2,5', '255', '1023'], 'La mitad de la referencia es la mitad de 1024.', { predict: true, c: 'av_adcreg', h: '10 bits son 1024 escalones repartidos entre 0 V y la referencia.' }),
  { t: 'explore', text: 'El ADC compara la entrada con la <b>referencia</b> y da un número de 0 a 1023. Abajo ves cómo se reparten sus 10 bits entre ADCH y ADCL.', viz: 'av_conv', params: { vin: pSl('Tensión de entrada', 1, 0, 5, 0.05, 'V', 2), ref: { label: 'Referencia', val: 5, list: [1.1, 5], unit: 'V', dec: 1 }, adlar: L01('ADLAR', 0) },
    tasks: [{ q: 'code', min: 510, max: 514, text: 'Consigue la lectura 512', done: 'ADC = Vin · 1024 / Vref: 2,5 × 1024 / 5 = 512.', hint: 'La mitad de la referencia.' },
      { q: 'sat', min: 1, max: 1, text: 'Satura el ADC', done: 'Por encima de la referencia, la lectura se queda en 1023.', hint: 'Más tensión que la referencia: prueba con la de 1,1 V.' },
      { q: 'fine', min: 1, max: 1, text: 'Con la referencia de 1,1 V, consigue una lectura entre 455 y 475', done: 'Con 1,1 V cada paso vale unos 1,07 mV: mucha más resolución para señales pequeñas, como estos 0,5 V.', hint: 'Referencia de 1,1 V y una entrada de unos 0,5 V.' }] },
  I('El ADC del 328P es de <b>aproximaciones sucesivas</b> y 10 bits, con un multiplexor de 8 canales (6 en el DIP-28).\n<b>ADC = Vin · 1024 / Vref</b>, de 0 a 1023. Cuanto menor la referencia, más fino cada paso.', { code: 'ADC = Vin · 1024 / Vref\n2,5 V con Vref = 5 V   → 512   (paso de 4,9 mV)\n0,5 V con Vref = 1,1 V → 465   (paso de 1,07 mV)' }),
  I('<b>ADMUX</b> elige referencia y canal: <b>REFS1:0</b> (00 AREF externa, 01 AVcc, 11 interna de 1,1 V), <b>ADLAR</b> (alinear a la izquierda) y <b>MUX3:0</b> (canal). Con AVcc o 1,1 V, la pata AREF está unida por dentro: no le conectes ninguna fuente.', { code: 'ADMUX = (1 << REFS0) | 3;                   // AVcc y canal ADC3 (A3)\nADMUX = (1 << REFS1) | (1 << REFS0) | 0;    // 1,1 V interna y ADC0' }),
  I('<b>ADCSRA</b> lo controla: ADEN enciende, ADSC arranca (y vuelve a 0 al acabar), ADIF avisa, ADIE interrumpe y <b>ADPS2:0</b> es su prescaler. Para 10 bits de verdad, su reloj debe estar entre <b>50 y 200 kHz</b>; una conversión dura 13 ciclos (25 la primera).', { tune: { viz: 'av_adc', params: adcP(8) } }),
  { t: 'steps', text: 'A 16 MHz, ¿qué prescaler del ADC da los 10 bits completos y cuánto tarda una conversión?', steps: ['El reloj del ADC debe estar entre 50 y 200 kHz', '16 MHz / 64 = 250 kHz: se pasa', '16 MHz / 128 = <b>125 kHz</b>: dentro', '13 ciclos / 125 kHz = <b>104 µs</b>: unas 9600 muestras por segundo'], result: 'Prescaler 128 y 104 µs' },
  TU('Elige un prescaler que dé los 10 bits completos a 16 MHz.', 'av_adc', adcP(8), { q: 'ok', min: 1, max: 1, text: 'Objetivo: reloj del ADC entre 50 y 200 kHz', hint: '16 MHz / 128 = 125 kHz. Con /64 ya son 250 kHz.' }, 'Solo /128 cumple a 16 MHz: unas 9600 muestras por segundo.', { c: 'av_adc', h: 'Divide 16 MHz entre cada prescaler y mira cuál cae entre 50 y 200 kHz.' }),
  G('av_adcTime'), G('av_adcTime'),
  Q('¿Qué selecciona esta línea?', ['Referencia AVcc y canal ADC3 (A3)', 'Referencia interna y canal 3', 'AREF y canal 0', 'Canal 1 con ADLAR'], 'REFS0 = 1 → AVcc; MUX = 0011 → ADC3.', { code: 'ADMUX = (1 << REFS0) | 3;', c: 'av_adcreg', h: 'REFS1:0 = 01 y los bits bajos son el canal.' }),
  Q('Conectas 3,3 V a la pata AREF y tu código usa la referencia AVcc. ¿Qué pasa?', ['Cortocircuitas la referencia interna con tu fuente: elige AREF antes de conectar nada', 'Nada', 'Se calienta el cristal', 'Se borra la EEPROM'], 'Con AVcc o 1,1 V, AREF está unida por dentro a esa referencia.', { c: 'av_adcreg', h: '¿Qué hay conectado por dentro a AREF cuando eliges AVcc?' }),
  I('Una lectura completa por registros, esperando a que termine:', { code: 'uint16_t adcLeer(uint8_t canal) {\n  ADMUX  = (1 << REFS0) | (canal & 0x0F);   // AVcc y canal\n  ADCSRA = (1 << ADEN) | (1 << ADSC) | 7;   // prescaler 128 y arranca\n  while (ADCSRA & (1 << ADSC)) ;            // ADSC vuelve a 0 al acabar\n  return ADC;                               // ADCL y ADCH en el orden correcto\n}' }),
  Q('Con ADLAR = 1 lees solo ADCH. Obtienes…', ['Los 8 bits más significativos: 8 bits de resolución con una sola lectura', 'Los 2 bits altos', 'Los 8 bits bajos', 'Nada'], 'Útil cuando 8 bits bastan y necesitas velocidad.', { c: 'av_adcreg', h: 'ADLAR alinea el resultado a la izquierda.' }),
  Q('Si lees ADCL y ADCH por separado, ¿en qué orden?', ['Primero ADCL: al leerlo, el resultado queda bloqueado hasta que leas ADCH', 'Primero ADCH', 'Da igual', 'Solo ADCH'], 'La macro ADC de 16 bits ya lo hace bien.', { c: 'av_adcreg', h: 'Leer uno de los dos congela el resultado.' }),
  I('<b>Resumen</b>\n· ADC = Vin · 1024 / Vref, de 0 a 1023; satura por encima de Vref.\n· ADMUX: referencia (REFS), alineación (ADLAR) y canal (MUX). Nada en AREF si usas AVcc o 1,1 V.\n· Reloj del ADC entre 50 y 200 kHz: a 16 MHz, prescaler 128 y 104 µs por conversión.')
 ]),
 L('av23', 'ADC fino: ruido, sobremuestreo y sensores internos', 'gauge', ['av_vcc', 'av_oversample', 'av_adcimp'], [
  Q('¿Crees que el chip puede medir su propia tensión de alimentación sin ningún componente externo?', ['Sí: midiendo su referencia interna de 1,1 V con AVcc como referencia', 'No: necesita un divisor', 'Solo con un regulador', 'Solo si tiene cristal'], 'Es un truco clásico para vigilar una pila. Pruébalo.', { predict: true, c: 'av_vcc', h: 'Si mides algo fijo con una regla que cambia, el número cambia con la regla.' }),
  { t: 'explore', text: 'Con referencia AVcc (la propia pila) medimos la referencia interna de 1,1 V. Cambia la tensión de la pila y mira la lectura.', viz: 'av_vcc', params: { vcc: pSl('VCC real (la pila)', 5, 2.7, 5.5, 0.05, 'V', 2), ref: { label: 'Referencia interna real', val: 1.1, list: [1, 1.1, 1.2], unit: 'V', dec: 2 } },
    tasks: [{ q: 'code', min: 301, max: 1023, text: 'Baja la pila hasta que la lectura pase de 300', done: 'Al bajar VCC, la referencia fija de 1,1 V pesa más: la lectura sube. De ahí sacas VCC.', hint: 'Baja VCC por debajo de 3,7 V.' },
      { q: 'errAbs', min: 0.3, max: 9, text: 'Prueba un chip cuya referencia vale 1,2 V de verdad: ¿cuánto se equivoca la cuenta?', done: 'Casi un 9 %: la de 1,1 V varía de un chip a otro. Por eso se calibra.', hint: 'Referencia real 1,2 V con la pila alta.' }] },
  I('Con referencia AVcc, ADC = Vin · 1024 / VCC. Si lo que mides es la referencia interna de 1,1 V (MUX = 1110), despejas:\n<b>VCC = 1,1 × 1024 / ADC</b>', { code: 'ADMUX = (1 << REFS0) | 0x0E;   // AVcc como referencia, mide la de 1,1 V\n_delay_ms(2);                  // deja que se asiente\n// ...convertir...\nfloat vcc = 1.1 * 1024 / ADC;' }),
  { t: 'steps', text: 'La lectura de la referencia de 1,1 V da 341. ¿Cuánto vale VCC?', steps: ['ADC = 1,1 · 1024 / VCC', 'Despeja: VCC = 1,1 × 1024 / ADC', '= 1126,4 / 341', '≈ <b>3,30 V</b>'], result: 'VCC ≈ 3,3 V' },
  Nm('Con referencia AVcc, la lectura de la referencia de 1,1 V da 240. ¿VCC, en V?', 4.693, 'V', '1,1 × 1024 / 240 ≈ 4,69 V.', { tol: 0.02, c: 'av_vcc', h: 'VCC = 1,1 × 1024 / lectura.' }),
  Q('La referencia de 1,1 V varía de un chip a otro (de 1,0 a 1,2 V). Para medidas precisas…', ['Calíbrala: mide VCC con un buen multímetro y guarda el valor real en la EEPROM', 'No hagas nada', 'Usa 5 V siempre', 'Cambia de chip'], 'Una calibración por chip.', { c: 'av_vcc', h: '¿Cómo averiguas cuánto vale de verdad en tu chip?' }),
  I('<b>Sobremuestreo</b>: si sumas 4ⁿ lecturas y desplazas n bits a la derecha, ganas n bits de resolución, siempre que haya algo de ruido (al menos 1 paso) que haga variar las lecturas. A cambio, salen 4ⁿ veces menos resultados por segundo.', { tune: { viz: 'av_adc', params: adcP(128, 0, true, false) } }),
  TU('Consigue 12 bits efectivos sin salir de los 10 bits de base completos.', 'av_adc', adcP(128, 0, true, false), { q: 'bits', min: 12, max: 12, text: 'Objetivo: 12 bits', hint: 'Dos bits extra: 16 lecturas por resultado.' }, '16 lecturas por resultado: unas 600 medidas de 12 bits por segundo.', { c: 'av_oversample', h: 'Cada bit extra cuesta multiplicar por 4 las lecturas.' }),
  Nm('¿Cuántas lecturas hacen falta para ganar 3 bits?', 64, 'lecturas', '4³ = 64.', { c: 'av_oversample', h: '4 elevado al número de bits extra.' }),
  Q('Sumas 16 lecturas y divides entre 16. ¿Qué consigues?', ['Menos ruido, pero sin bits extra: los descartas al dividir', 'Una lectura de 14 bits', 'Empeorar la medida', 'Lo mismo que el sobremuestreo a 12 bits'], 'Para 12 bits, divide entre 4 (desplaza 2).', { c: 'av_oversample', h: 'Compara dividir entre 16 con desplazar solo 2 bits.' }),
  I('Al muestrear, un condensador interno de unos 14 pF se carga desde tu fuente a través de su resistencia. La hoja de datos pide fuentes de <b>10 kΩ o menos</b>: con más, la lectura sale baja o arrastra el valor del canal anterior.', { svg: SV_SAMP, more: 'Remedios: un seguidor con operacional, 100 nF de la entrada a masa (si la señal es lenta) o una lectura de descarte tras cambiar de canal.' }),
  Q('Lees un sensor de 100 kΩ alternando canales deprisa. ¿Qué pasa?', ['Lee mal: el condensador de muestreo no se carga a tiempo', 'Lee perfecto', 'Rompe el ADC', 'Siempre da 0'], 'Arrastra la tensión del canal anterior. Pon un seguidor o 100 nF en la entrada.', { c: 'av_adcimp', h: 'Compara 100 kΩ con lo que pide la hoja de datos.' }),
  Q('Alternas dos sensores de 100 kΩ y cada lectura se parece a la del otro canal. ¿Arreglo rápido?', ['Leer dos veces tras cambiar de canal y quedarte con la segunda', 'Subir el prescaler a /2', 'Cambiar a 1,1 V', 'Usar ADLAR'], 'Más tiempo para cargar el condensador de muestreo.', { c: 'av_adcimp', h: 'Dale al condensador una segunda oportunidad de cargarse.' }),
  I('Menos ruido por hardware: 100 nF entre AREF y GND, AVCC filtrado (la hoja de datos propone 10 µH y 100 nF) y un modo de sueño, <b>ADC Noise Reduction</b>, que para la CPU mientras convierte (lo verás en el módulo 6). Y un canal interno más: MUX = 1000 es un sensor de temperatura, poco preciso sin calibrar.', { code: 'MUX = 1110 → referencia de 1,1 V (para medir VCC)\nMUX = 1000 → sensor de temperatura (con referencia de 1,1 V)' }),
  I('<b>Resumen</b>\n· VCC = 1,1 × 1024 / lectura de la referencia interna; calibra cada chip.\n· Sobremuestreo: 4ⁿ lecturas y desplazar n bits; necesita algo de ruido.\n· Fuentes de 10 kΩ o menos, o un seguidor, o descartar la primera lectura.')
 ]),
 L('av24', 'USART: baudios, tramas y error', 'bus', ['av_uart', 'av_uartrate'], [
  Q('Emisor y receptor serie no comparten ningún cable de reloj. ¿Cómo crees que sabe el receptor dónde empieza cada bit?', ['Se sincroniza con el flanco del bit de inicio y mide los demás con su propio reloj', 'Lee un cable de reloj escondido', 'Adivina', 'El emisor se lo dice por USB'], 'Por eso los dos deben ir a la misma velocidad: cualquier diferencia se va acumulando.', { predict: true, c: 'av_uart', h: 'Algo al principio de cada byte marca la salida.' }),
  { t: 'explore', text: 'Una trama 8N1 a la velocidad que elijas. Debajo, el divisor UBRR0 que calcula el chip y el error que sale al redondearlo.', viz: 'av_uart', params: uartP(),
    tasks: [{ q: 'errAbs', min: 0, max: 0.01, text: 'Encuentra una velocidad con error 0 % exacto', done: '31 250 (UBRR0 = 31) y 250 000 (UBRR0 = 3) dividen exacto a 16 MHz.', hint: 'El MIDI usa 31 250 baudios.' },
      { q: 'errAbs', min: 3, max: 100, text: 'Busca la velocidad estándar con más error', done: '115 200 sin U2X0: −3,5 %. Demasiado para ir fiable.', hint: 'Prueba la más rápida de las habituales.' },
      { q: 'u115', min: 1, max: 1, text: 'Arréglala con U2X0', done: 'Con U2X0 = 1 divide entre 8: +2,1 %. Es lo que hace Serial.begin(115200).', hint: 'Pon U2X0 a 1.' }] },
  I('Trama <b>8N1</b>: un bit de inicio (0), 8 de datos empezando por el <b>menos</b> significativo, sin paridad y uno de parada (1): <b>10 bits por byte</b>. En reposo, la línea está a 1.', { code: "reposo 1 | inicio 0 | b0 b1 b2 b3 b4 b5 b6 b7 | parada 1\n'A' = 65 = 0b01000001 → salen los datos 1 0 0 0 0 0 1 0" }),
  I('El divisor:\n<b>UBRR0 = F_CPU / (16 · baudios) − 1</b>, redondeado (con U2X0 = 1, entre 8 en lugar de 16). Como hay que redondear, los baudios reales no son exactos: aparece un <b>error</b>.', { code: 'UBRR0  = 103;                              // 9600 baudios a 16 MHz\nUCSR0B = (1 << RXEN0) | (1 << TXEN0);      // recibir y enviar\nUCSR0C = (1 << UCSZ01) | (1 << UCSZ00);    // 8N1' }),
  { t: 'steps', text: '9600 baudios a 16 MHz sin U2X0. ¿UBRR0 y error?', steps: ['UBRR0 = 16 000 000 / (16 × 9600) − 1 = 103,17', 'Se redondea: <b>103</b>', 'Baudios reales = 16 000 000 / (16 × 104) = <b>9615</b>', 'Error = 9615 / 9600 − 1 = <b>+0,16 %</b>: sin problema'], result: 'UBRR0 = 103, error +0,16 %' },
  G('av_ubrr'), G('av_baudErr'),
  I('El receptor mide cada bit en su centro, contando desde el bit de inicio con su propio reloj. Si va más rápido o más lento que el emisor, el desfase <b>crece bit a bit</b> y el bit de parada es el que más sufre.', { tune: { viz: 'av_drift', params: { e: pSl('Diferencia de relojes', 2, -6, 6, 0.5, '%', 1) } } }),
  TU('Busca a partir de qué diferencia el bit de parada se sale de su sitio.', 'av_drift', { e: pSl('Diferencia de relojes', 0, -6, 6, 0.5, '%', 1) }, { q: 'ok', min: 0, max: 0, text: 'Objetivo: que la muestra del bit de parada caiga fuera', hint: 'Más de un 5 % en cualquier sentido.' }, 'A partir de algo más del 5 % la trama falla; con ruido, antes. Por eso se pide no pasar del 2 % en total.', { c: 'av_uart', h: 'El desfase en el bit de parada es 9,5 veces el error.' }),
  Q('Emisor con +2 % y receptor con −2 % de error…', ['Se suman: un 4 % de diferencia y la trama falla a ratos', 'Se compensan', 'No importa', 'Funciona mejor'], 'Lo que cuenta es la diferencia entre los dos relojes.', { c: 'av_uart', h: 'Uno va rápido y el otro lento: ¿se acercan o se alejan?' }),
  Q('¿Por qué existen cristales de 14,7456 MHz?', ['Dividen exacto a las velocidades serie estándar: error 0 %', 'Son más baratos', 'Son más rápidos', 'Por el USB'], '14 745 600 / (16 × 9600) = 96 exactos.', { c: 'av_uart', h: 'Divide esa frecuencia entre 16 × 9600.' }),
  Q('A 9600 baudios y 8N1, ¿cuántos bytes por segundo como máximo?', ['960', '9600', '1200', '1067'], '10 bits por byte.', { c: 'av_uartrate', h: '¿Cuántos bits viajan por cada byte?' }),
  Nm('¿Cuánto tarda un byte a 9600 baudios (8N1), en ms?', 1.042, 'ms', '10 bits / 9600 ≈ 1,04 ms.', { tol: 0.01, c: 'av_uartrate', h: '10 bits entre los baudios da segundos.' }),
  I('<b>Resumen</b>\n· 8N1: 10 bits por byte; bytes/s = baudios / 10.\n· UBRR0 = F_CPU / (16 · baudios) − 1 (entre 8 con U2X0), redondeado.\n· El error se acumula hasta el bit de parada: no pases del 2 % entre los dos extremos.')
 ]),
 L('av25', 'USART por registros e interrupciones', 'code', ['av_uartreg', 'av_uartrate', 'av_uartwire'], [
  Q('Un Serial.print() largo a veces deja loop() congelado decenas de milisegundos. ¿Por qué crees que pasa?', ['Su búfer de envío se llena y espera a que salgan bytes', 'Por un delay() escondido', 'Por el ADC', 'Porque reinicia la placa'], 'Serial guarda hasta 64 bytes; si le das más, espera.', { predict: true, c: 'av_uartrate', h: 'Los bytes salen a la velocidad de los baudios, no a la de la CPU.' }),
  { t: 'explore', text: 'Serial.print() mete los bytes en un búfer de 64 y vuelve; una ISR los va enviando. Si el mensaje no cabe, print() espera.', viz: 'av_txbuf', params: { n: pSl('Bytes del mensaje', 40, 10, 300, 10), baud: { label: 'Baudios', val: 9600, list: [9600, 38400, 115200], dec: 0 } },
    tasks: [{ q: 'block', min: 20, max: 1e9, text: 'Haz que loop() se quede bloqueado más de 20 ms', done: 'Lo que no cabe en el búfer obliga a print() a esperar a que salgan bytes.', hint: 'Un mensaje de más de 64 bytes a 9600 baudios.' },
      { q: 'ok200', min: 1, max: 1, text: 'Imprime 200 bytes con menos de 15 ms de bloqueo', done: 'A 115 200 baudios: los 136 bytes que no caben salen en unos 12 ms.', hint: 'Sube los baudios.' }] },
  I('Los registros de la USART:\n· <b>UDR0</b>: el dato (escribir envía; leer da lo recibido).\n· <b>UCSR0A</b>: banderas. · <b>UCSR0B</b>: activar RX, TX e interrupciones. · <b>UCSR0C</b>: formato.', { code: 'void uartPut(uint8_t c) {\n  while (!(UCSR0A & (1 << UDRE0))) ;   // espera hueco\n  UDR0 = c;\n}\n\nuint8_t uartGet(void) {\n  while (!(UCSR0A & (1 << RXC0))) ;    // espera un byte\n  return UDR0;\n}' }),
  I('Las banderas de UCSR0A:\n· <b>RXC0</b>: ha llegado un byte. · <b>UDRE0</b>: hay hueco para enviar otro.\n· <b>FE0</b>: error de trama (el bit de parada no llegó a 1: baudios distintos o ruido).\n· <b>DOR0</b>: desbordamiento (llegó un byte y nadie leyó los anteriores a tiempo).', { code: 'if (UCSR0A & (1 << FE0))  { /* trama mala */ }\nif (UCSR0A & (1 << DOR0)) { /* se perdió algún byte */ }' }),
  { t: 'steps', text: 'Enviar «Hola» (4 bytes) a 9600 baudios esperando a UDRE0 en cada byte. ¿Cuánto tarda en salir?', steps: ['Cada byte son 10 bits (8N1)', '4 bytes = 40 bits', '40 / 9600 = <b>4,17 ms</b>', 'Esperando a UDRE0, loop() queda parado casi todo ese tiempo: con interrupciones, no'], result: 'Unos 4,2 ms' },
  Q('¿Qué indica UDRE0 = 1?', ['Que el registro de envío está libre: puedes escribir otro byte', 'Que ha llegado un byte', 'Un error de trama', 'Que el cable está suelto'], 'Data Register Empty.', { c: 'av_uartreg', h: 'UDR + E de «empty».' }),
  Q('DOR0 = 1 significa…', ['Que llegaron bytes y nadie leyó UDR0 a tiempo: se perdió alguno', 'Un error de paridad', 'Que el envío ha terminado', 'Que la velocidad es errónea'], 'Data OverRun.', { c: 'av_uartreg', h: 'OverRun: se han acumulado más bytes de los que caben.' }),
  Q('Ves FE0 = 1 una y otra vez. ¿Causa probable?', ['Baudios distintos en los dos extremos, o ruido en la línea', 'Que el búfer está vacío', 'Que el envío ha terminado', 'Que hay paridad par'], 'El bit de parada no llega donde se espera.', { c: 'av_uartreg', h: 'Frame Error: ¿qué hace que el bit de parada caiga mal?' }),
  I('Con interrupciones: <b>RXCIE0</b> llama a USART_RX_vect por cada byte recibido (lo metes en un búfer circular). Para enviar, <b>UDRIE0</b> llama a USART_UDRE_vect mientras haya hueco: sacas el siguiente byte del búfer y, cuando se vacía, desactivas UDRIE0.', { code: 'ISR(USART_UDRE_vect) {\n  if (txCola != txCabeza) {\n    UDR0 = txBuf[txCola];\n    txCola = (txCola + 1) & (TAM - 1);\n  } else {\n    UCSR0B &= ~(1 << UDRIE0);   // nada más que enviar: apágala\n  }\n}' }),
  Q('Activas UDRIE0 con el búfer de envío vacío y sin desactivarla nunca. ¿Qué pasa?', ['La ISR de UDRE salta sin parar y se come la CPU', 'No salta nunca', 'Salta una vez', 'Se envía un 0'], 'UDRE está a 1 mientras haya hueco, es decir, casi siempre.', { c: 'av_uartreg', h: '¿Cuándo está a 1 la bandera UDRE0?' }),
  Q('Escribes tu propia ISR(USART_RX_vect) en un sketch que también usa Serial. ¿Qué pasa?', ['Choca: el núcleo ya define esa ISR al usar Serial; elige una de las dos', 'Funciona', 'Se llaman las dos', 'Basta con volatile'], 'Error de vector definido dos veces al enlazar.', { c: 'av_uartreg', h: '¿Quién recibe los bytes de Serial por dentro?' }),
  Nm('¿Cuánto tarda en salir un mensaje de 64 bytes a 9600 baudios (8N1), en ms?', 66.67, 'ms', '640 bits / 9600 ≈ 66,7 ms.', { tol: 0.5, c: 'av_uartrate', h: 'Bytes × 10 bits entre los baudios.' }),
  I('Para conectar dos equipos serie: lo que uno transmite, el otro lo recibe. <b>TX con RX, RX con TX</b> y masa común. Si uno va a 5 V y otro a 3,3 V, adapta la línea que va hacia el de 3,3 V.', { svg: SV_UWIRE, more: 'La Uno saca 5 V por TX. Para un módulo de 3,3 V que no los tolere: un divisor (1 kΩ en serie y 2 kΩ a masa) o un adaptador de nivel. En sentido contrario, 3,3 V superan los 3 V (0,6·VCC) que la Uno necesita para un 1, aunque con poco margen.' }),
  { t: 'match', q: 'Une cada conexión entre la Uno y otro equipo serie.', pairs: [['TX de la Uno', 'RX del otro equipo'], ['RX de la Uno', 'TX del otro equipo'], ['GND', 'GND (masa común)'], ['Baudios', 'Iguales en los dos lados']], c: 'av_uartwire', h: 'Lo que uno dice, el otro lo escucha.' },
  Q('Un módulo de 3,3 V va al TX de la Uno. ¿Qué haces?', ['Un divisor o un adaptador de nivel en la línea que llega al módulo: la Uno saca 5 V', 'Lo conectas directo siempre', 'Cruzas GND', 'Nada'], 'El RX del módulo podría no tolerar 5 V.', { c: 'av_uartwire', h: '¿Qué tensión saca el TX de la Uno?' }),
  I('<b>Resumen</b>\n· UDR0 envía y recibe; UCSR0A: RXC0, UDRE0, FE0 (trama) y DOR0 (bytes perdidos).\n· Con interrupciones: RX a un búfer circular; UDRE solo mientras haya algo que enviar.\n· Serial ya usa esas ISR. Cables: TX con RX, RX con TX y masa común.')
 ]),
 L('av26', 'SPI maestro', 'bus', ['av_bus'], [
  Q('Quieres leer un byte de un sensor SPI. ¿Crees que basta con escuchar?', ['No: el maestro tiene que enviar algo para generar el reloj; leer y escribir son lo mismo', 'Sí: el sensor lo envía cuando quiere', 'Sí, si tiene pull-up', 'Solo funciona por I²C'], 'En SPI cada pulso de reloj intercambia un bit en cada sentido.', { predict: true, c: 'av_bus', h: '¿Quién genera el reloj en SPI?' }),
  { t: 'explore', text: 'SPI por dentro: el registro del maestro y el del esclavo forman un anillo. Cada pulso de <b>SCK</b> saca un bit de cada uno y lo mete en el otro.', viz: 'av_spi', params: { m: pSl('Byte del maestro', 165, 0, 255), s: pSl('Byte del esclavo', 60, 0, 255), k: pSl('Pulsos de reloj (SCK)', 0, 0, 8) },
    tasks: [{ q: 'k', min: 4, max: 4, text: 'Da 4 pulsos de reloj', done: 'A medias: cada registro tiene ahora medio byte de cada uno.' },
      { q: 'swapped', min: 1, max: 1, text: 'Termina el intercambio', done: 'Tras 8 pulsos, el maestro tiene el byte del esclavo y viceversa: SPI siempre intercambia.' }] },
  I('<b>SPI</b>: bus síncrono de 4 hilos. El maestro genera el reloj <b>SCK</b>; en cada pulso sale un bit por <b>MOSI</b> y entra otro por <b>MISO</b>. <b>SS</b> (o CS), activa a 0, elige al esclavo. Varios esclavos comparten SCK, MOSI y MISO; cada uno lleva su CS.', { code: 'SCK  = PB5 (D13)\nMISO = PB4 (D12)\nMOSI = PB3 (D11)\nSS   = PB2 (D10)   ← en maestro, déjala como salida' }),
  I('Registros: <b>SPCR</b> (SPE activa, MSTR maestro, CPOL y CPHA el modo, SPR1:0 la velocidad), <b>SPSR</b> (SPIF fin de byte, SPI2X velocidad doble) y <b>SPDR</b> (escribir envía; leer da lo recibido).', { code: 'void spiInit(void) {\n  DDRB |= (1 << PB5) | (1 << PB3) | (1 << PB2);   // SCK, MOSI y SS salidas\n  SPCR  = (1 << SPE) | (1 << MSTR);               // maestro, modo 0, F_CPU/4\n}\n\nuint8_t spiByte(uint8_t b) {\n  SPDR = b;\n  while (!(SPSR & (1 << SPIF))) ;   // 8 bits\n  return SPDR;                      // lo que llegó por MISO\n}' }),
  { t: 'steps', text: 'SPR1:0 = 00 y SPI2X = 1 a 16 MHz. ¿SCK y cuánto tarda un byte?', steps: ['SPR1:0 = 00 → SCK = F_CPU / 4 = 4 MHz', 'SPI2X duplica: <b>8 MHz</b>, el máximo (F_CPU / 2)', '8 bits / 8 MHz = <b>1 µs</b> por byte', 'Más lo que tarde tu código en esperar SPIF y cargar el siguiente'], result: '8 MHz y 1 µs por byte' },
  { t: 'match', q: 'Une cada señal SPI con su pata en la Uno.', pairs: [['SCK', 'PB5 (D13)'], ['MISO', 'PB4 (D12)'], ['MOSI', 'PB3 (D11)'], ['SS', 'PB2 (D10)']], c: 'av_bus', h: 'Van seguidas de PB2 a PB5: SS, MOSI, MISO y SCK.' },
  Nm('Con SCK a 4 MHz, ¿cuántos µs tarda un byte (sin contar el código)?', 2, 'µs', '8 bits / 4 MHz = 2 µs.', { c: 'av_bus', h: '8 bits entre la frecuencia del reloj.' }),
  Q('En modo maestro dejas PB2 (SS) como entrada y el ruido la lleva a 0. ¿Qué pasa?', ['El SPI pasa solo a esclavo (se borra MSTR) y deja de enviar', 'Nada', 'Se reinicia el chip', 'Va más rápido'], 'Pon SS como salida aunque no la uses.', { c: 'av_bus', h: 'SS a 0 significa «te han elegido como esclavo».' }),
  Q('Para leer un byte de un esclavo SPI…', ['Envías un byte cualquiera (por ejemplo, 0xFF) y lees SPDR', 'Lees SPDR sin enviar nada', 'Pones MISO como salida', 'Usas otra línea'], 'Sin envío no hay reloj.', { c: 'av_bus', h: 'Recuerda el anillo: leer y escribir ocurren a la vez.' }),
  I('El <b>modo</b> SPI dice en qué flanco se leen los bits: <b>CPOL</b> es el nivel de SCK en reposo y <b>CPHA</b> en qué flanco se muestrea. Modo = CPOL × 2 + CPHA. La hoja de datos del esclavo dice cuál usa.', { code: 'Modo 0: CPOL 0, CPHA 0  (el más común)\nModo 1: CPOL 0, CPHA 1\nModo 2: CPOL 1, CPHA 0\nModo 3: CPOL 1, CPHA 1' }),
  Q('Un chip pide CPOL = 0 y CPHA = 0. Es el…', ['Modo 0', 'Modo 1', 'Modo 2', 'Modo 3'], 'Modo = CPOL × 2 + CPHA.', { c: 'av_bus', h: 'Aplica CPOL × 2 + CPHA.' }),
  Q('Un chip pide CPOL = 1 y CPHA = 1. ¿Modo?', ['3', '1', '2', '0'], '1 × 2 + 1.', { c: 'av_bus', h: 'CPOL vale doble.' }),
  Q('Tres esclavos SPI en el mismo bus. ¿Qué comparten?', ['SCK, MOSI y MISO; cada uno lleva su propia línea CS', 'Todo, también CS', 'Nada', 'Cada uno su SCK'], 'CS dice a quién le toca.', { c: 'av_bus', h: '¿Qué línea elige con quién se habla?' }),
  Q('Un 74HC595 por SPI necesita además…', ['Un pulso en su RCLK (latch) para pasar los datos a las salidas', 'Una dirección', 'Una pull-up', 'Nada'], 'Desplazar y mostrar son pasos separados.', { c: 'av_bus', h: 'Recuerda el registro de salida del 595.' }),
  I('<b>Resumen</b>\n· SPI = dos registros en anillo: cada pulso de SCK intercambia un bit; para leer, envía.\n· SCK como mucho F_CPU / 2; un byte a 8 MHz, 1 µs.\n· Modo = CPOL × 2 + CPHA. Un CS por esclavo; SS como salida en maestro.')
 ]),
 L('av27', 'TWI (I²C) por registros', 'bus', ['av_i2c'], [
  Q('En I²C, dos dispositivos podrían intentar hablar a la vez por el mismo cable. ¿Por qué crees que no se queman?', ['Nadie empuja la línea a 1: solo tiran a 0 y una resistencia la sube', 'Porque hablan muy rápido', 'Porque llevan fusibles', 'Sí se queman a veces'], 'Salidas de drenador abierto y resistencias de pull-up.', { predict: true, c: 'av_i2c', h: 'Si nadie pone un 1 con fuerza, no puede haber un 1 contra un 0.' }),
  { t: 'explore', text: 'La línea SCL de un bus I²C sube gracias a la <b>pull-up</b>, frenada por la capacidad del bus (cables y chips). Si sube demasiado lenta, el bus falla.', viz: 'av_i2c', params: { R: { label: 'Pull-up', val: 4700, list: [1000, 2200, 4700, 10000, 47000], fmt: 'R' }, C: pSl('Capacidad del bus', 100, 50, 400, 10, 'pF'), f: { label: 'Velocidad', val: 100000, list: [100000, 400000], unit: 'Hz', dec: 0 } },
    tasks: [{ q: 'ok', min: 0, max: 0, text: 'Usa una pull-up débil, como las internas: ¿aguanta?', done: 'Con 47 kΩ la línea sube demasiado despacio: el bus falla.', hint: 'Pull-up de 47 kΩ.' },
      { q: 'fix400', min: 1, max: 1, text: 'A 400 kHz y con 200 pF de bus, haz que funcione', done: 'Hace falta una pull-up fuerte, de 1 kΩ: más velocidad o más cable piden resistencias más bajas.', hint: 'Sube a 400 kHz, 200 pF y baja la resistencia.' }] },
  I('El <b>TWI</b> es el I²C de los AVR: 2 hilos, SDA (PC4, A4) y SCL (PC5, A5), con salidas en <b>drenador abierto</b> y <b>pull-ups</b> externas (4,7 kΩ es típico). Cada esclavo tiene una dirección de 7 bits; el receptor responde con un ACK tirando la línea a 0.', { svg: SV_OD }),
  I('Velocidad:\n<b>f_SCL = F_CPU / (16 + 2 · TWBR · 4^TWPS)</b>\nA 16 MHz con TWPS = 0: TWBR = 72 da 100 kHz y TWBR = 12, 400 kHz.', { code: 'TWSR = 0;      // TWPS = 0: prescaler 1\nTWBR = 72;     // 100 kHz a 16 MHz\nTWCR = (1 << TWEN);' }),
  { t: 'steps', text: '¿Qué TWBR da 100 kHz a 16 MHz con TWPS = 0?', steps: ['f_SCL = F_CPU / (16 + 2 · TWBR)', 'Despeja: TWBR = (F_CPU / f_SCL − 16) / 2', '= (16 000 000 / 100 000 − 16) / 2 = (160 − 16) / 2', '= <b>72</b>'], result: 'TWBR = 72' },
  G('av_twbr'),
  I('Una escritura: START, dirección + bit R/W, comprobar ACK, datos, STOP. Cada paso lo lanza TWCR (escribir TWINT a 1 lo arranca) y el resultado se lee en <b>TWSR &amp; 0xF8</b>: 0x08 START enviado, 0x18 dirección con ACK, 0x20 sin ACK, 0x28 dato con ACK.', { code: 'void twiStart(void) {\n  TWCR = (1 << TWINT) | (1 << TWSTA) | (1 << TWEN);\n  while (!(TWCR & (1 << TWINT))) ;     // espera al hardware\n}\n\nuint8_t twiEscribir(uint8_t b) {\n  TWDR = b;\n  TWCR = (1 << TWINT) | (1 << TWEN);\n  while (!(TWCR & (1 << TWINT))) ;\n  return TWSR & 0xF8;                  // código de estado\n}\n\nvoid twiStop(void) {\n  TWCR = (1 << TWINT) | (1 << TWSTO) | (1 << TWEN);\n}' }),
  { t: 'order', q: 'Ordena la escritura de un byte en un esclavo.', items: ['START', 'Dirección del esclavo + bit de escritura (0)', 'Comprobar el ACK', 'Enviar el dato', 'STOP'], e: 'Cada paso se confirma en TWSR.', c: 'av_i2c', h: 'Primero llamas a alguien por su nombre; luego le hablas.' },
  Q('Tras enviar la dirección, TWSR & 0xF8 = 0x20. Significa…', ['Que nadie respondió (NACK): dirección equivocada o dispositivo sin alimentar', 'Que todo es correcto', 'Que llegó un dato', 'Que el bus está libre'], '0x18 sería el ACK.', { c: 'av_i2c', h: 'Compara con 0x18, que es «dirección con ACK».' }),
  Q('Una hoja de datos dice «dirección 0x4E (escritura)» y el escáner de Arduino encuentra 0x27. ¿Contradicción?', ['No: 0x4E es 0x27 desplazado un bit con el bit R/W; Wire usa la dirección de 7 bits', 'Sí, uno está roto', 'Son dos chips distintos', 'El escáner falla'], '0x27 × 2 = 0x4E.', { c: 'av_i2c', h: 'Desplaza 0x27 un bit a la izquierda.' }),
  Q('Bus I²C solo con las pull-ups internas (20–50 kΩ)…', ['Flancos de subida lentos: puede fallar a 100 kHz y casi seguro a 400 kHz', 'Va mejor', 'No cambia nada', 'Se queman las patas'], 'Capacidad del bus y una pull-up alta hacen un RC lento.', { c: 'av_i2c', h: 'Recuerda lo que viste al poner 47 kΩ.' }),
  Q('Si ningún dispositivo responde a una dirección, ¿qué ve el maestro?', ['El ACK queda a 1 (NACK) y lo ve en TWSR', 'El bus se rompe', 'Responde el más cercano', 'El maestro se reinicia'], 'Nadie tira de la línea: la pull-up la deja en 1.', { c: 'av_i2c', h: 'Si nadie tira a 0, ¿qué nivel queda?' }),
  I('<b>Resumen</b>\n· I²C: SDA y SCL en drenador abierto con pull-ups (4,7 kΩ; más bajas si hay más velocidad o cable).\n· f_SCL = F_CPU / (16 + 2·TWBR): 72 → 100 kHz y 12 → 400 kHz a 16 MHz.\n· START, dirección + R/W, ACK, datos y STOP; TWSR &amp; 0xF8 dice cómo fue.')
 ]),
 L('av28', 'EEPROM, comparador y watchdog', 'shield', ['av_wdt', 'av_eeprom', 'av_acomp'], [
  Q('Tu programa se cuelga una vez cada pocos días por un fallo raro de un sensor. ¿Qué crees que puede sacarlo del cuelgue sin que nadie pulse RESET?', ['Un temporizador guardián que reinicia el chip si el programa deja de avisarle', 'Un delay() más largo', 'Más RAM', 'La EEPROM'], 'Es el watchdog: si el programa no le da señales de vida a tiempo, reinicia.', { predict: true, c: 'av_wdt', h: 'Piensa en un perro guardián que espera que pases cada cierto tiempo.' }),
  { t: 'explore', text: 'El <b>watchdog</b> cuenta hacia su plazo; cada wdt_reset() al final de loop() lo pone a cero. Si llega al plazo, reinicia el chip.', viz: 'av_wdt', params: { to: { label: 'Plazo del watchdog', val: 2, list: [0.016, 0.032, 0.064, 0.125, 0.25, 0.5, 1, 2, 4, 8], unit: 's', dec: 3 }, loop: pSl('loop() tarda', 500, 10, 3000, 10, 'ms') },
    tasks: [{ q: 'reset', min: 1, max: 1, text: 'Haz que el perro muerda: que el chip se reinicie', done: 'Si loop() tarda más que el plazo, nadie llama a wdt_reset() a tiempo.', hint: 'Haz loop() más lento que el plazo.' },
      { q: 'ok12', min: 1, max: 1, text: 'Con un loop() de 1,2 s, elige el plazo más corto que no reinicia', done: '2 s: el siguiente más corto (1 s) ya no llega. Deja siempre margen, porque su oscilador no es preciso.', hint: 'Pon loop() en 1200 ms y prueba plazos.' }] },
  I('El <b>watchdog</b> es un temporizador con su propio oscilador de 128 kHz. Si el programa no lo reinicia con <b>wdt_reset()</b> antes del plazo (de 16 ms a 8 s), reinicia el chip: un cuelgue se recupera solo.', { code: '#include <avr/wdt.h>\n\nvoid setup() {\n  MCUSR = 0;                 // borra la causa del último reinicio\n  wdt_disable();             // por si venimos de un reinicio por watchdog\n  wdt_enable(WDTO_2S);       // 2 s sin wdt_reset() = reinicio\n}\n\nvoid loop() {\n  trabajo();                 // nunca debe tardar más de 2 s\n  wdt_reset();\n}' }),
  I('wdt_reset() va en <b>un único punto</b> del bucle principal que solo se alcanza si todo va bien, nunca en una ISR de temporizador. Y tras un reinicio por watchdog, sigue activo con 16 ms: hay que desactivarlo <b>lo primero</b>, o el chip se reinicia en bucle.', { code: 'WDTCSR: WDIE  WDP3  WDCE  WDE  WDP2  WDP1  WDP0\n  WDE  → reinicio al expirar\n  WDIE → interrupción al expirar\n  WDP  → el plazo\n  WDCE → permite cambiarlo (secuencia de 4 ciclos)' }),
  Q('Pones wdt_reset() en la ISR de un temporizador. ¿Problema?', ['Si loop() se cuelga, la ISR lo sigue reiniciando y el watchdog nunca actúa', 'Ninguno', 'Reinicia cada 16 ms', 'No compila'], 'Debe depender de que el programa principal avance.', { c: 'av_wdt', h: '¿Las interrupciones siguen saltando si loop() se queda atascado?' }),
  Q('Tras un reinicio por watchdog, este sigue activo con 16 ms. Si tu setup() tarda 1 s…', ['Se reinicia en bucle: desactívalo al principio de todo', 'No pasa nada', 'Se apaga solo', 'Se reinicia una sola vez'], 'Por eso se borra WDRF y se desactiva lo primero.', { c: 'av_wdt', h: 'Compara 1 s con 16 ms.' }),
  { t: 'match', q: 'Une cada bit de WDTCSR con su papel.', pairs: [['WDE', 'Reinicio al expirar'], ['WDIE', 'Interrupción al expirar'], ['WDP3:0', 'Tiempo de espera'], ['WDCE', 'Permite cambios (secuencia temporizada)']], c: 'av_wdt', h: 'E de reset (enable), IE de interrupción, P de periodo y CE de cambio.' },
  I('<b>EEPROM</b> por avr-libc: eeprom_read_byte, <b>eeprom_update_byte</b> (solo escribe si cambia) y variables EEMEM. Cada escritura tarda unos 3,3 ms. Si se corta la alimentación justo entonces, ese byte puede quedar mal; el <b>BOD</b> (detector de baja tensión, módulo 6) para el chip antes.', { code: '#include <avr/eeprom.h>\n\nuint8_t EEMEM brilloGuardado;               // vive en la EEPROM\n\nuint8_t b = eeprom_read_byte(&brilloGuardado);\neeprom_update_byte(&brilloGuardado, b);     // solo escribe si cambió' }),
  Q('¿Por qué eeprom_update_byte y no eeprom_write_byte?', ['No escribe si el valor ya es igual: no gasta vida', 'Escribe más rápido', 'Escribe dos veces', 'Borra antes'], 'Lee, compara y solo escribe si hace falta.', { c: 'av_eeprom', h: 'Lo que desgasta es escribir.' }),
  G('av_eeLife'),
  Q('Se corta la alimentación justo mientras escribes la EEPROM…', ['Ese byte puede corromperse; con el BOD activado, el chip se detiene antes de escribir con tensión baja', 'No pasa nada', 'Se borra toda la EEPROM', 'Se rompe el chip'], 'La hoja de datos recomienda el BOD para proteger la EEPROM.', { c: 'av_eeprom', h: 'Una escritura dura unos milisegundos: ¿qué pasa si la tensión cae en medio?' }),
  I('El <b>comparador analógico</b> compara AIN0 (PD6, D6) con AIN1 (PD7, D7), o la referencia de 1,1 V con AIN1. Su salida ACO cambia al instante, sin conversión, y puede lanzar una interrupción: ideal para vigilar una batería sin ocupar el ADC ni la CPU.', { tune: { viz: 'av_acomp', params: { vbat: pSl('Batería', 5, 3, 5.5, 0.05, 'V', 2), k: { label: 'Divisor', val: 0.25, list: [0.2, 0.25, 1 / 3, 0.5], dec: 2 } } } }),
  { t: 'steps', text: 'Divisor de factor 1/4 hacia AIN1 y la referencia de 1,1 V en la otra entrada. ¿A qué tensión de batería salta el aviso?', steps: ['La referencia es 1,1 V', 'El divisor entrega una cuarta parte de la batería', 'Cambia cuando batería / 4 = 1,1 V', 'Batería = 1,1 × 4 = <b>4,4 V</b>'], result: 'A 4,4 V' },
  TU('Elige el divisor para que avise cuando la batería baje de 3,3 V.', 'av_acomp', { vbat: pSl('Batería', 5, 3, 5.5, 0.05, 'V', 2), k: { label: 'Divisor', val: 0.25, list: [0.2, 0.25, 1 / 3, 0.5], dec: 2 } }, { q: 'vth', min: 3.29, max: 3.31, text: 'Objetivo: aviso a 3,3 V', hint: '3,3 V entre 1,1 V da el factor que buscas.' }, 'Un divisor de 1/3: 3,3 / 3 = 1,1 V.', { c: 'av_acomp', h: 'Umbral = 1,1 / factor del divisor.' }),
  Q('¿Qué ventaja tiene el comparador frente a leer el ADC cada segundo?', ['Avisa al instante por interrupción sin ocupar el ADC ni la CPU', 'Da 10 bits', 'Mide corriente', 'Es más preciso'], 'Solo dice mayor o menor, pero al momento.', { c: 'av_acomp', h: '¿Hace falta preguntar, o te avisa él?' }),
  I('<b>Resumen</b>\n· Watchdog: wdt_reset() en un único punto de loop(); tras un reinicio, desactívalo lo primero.\n· EEPROM: eeprom_update_byte y el BOD para no corromperla.\n· Comparador: umbral = 1,1 / factor del divisor, con aviso instantáneo.')
 ]),
 SIM('av-s5', 'Reto: el canal ADC0', 'El programa del potenciómetro lee el canal ADC0 y escribe el resultado en OCR1A. Lleva el cursor del potenciómetro a la pata PC0 (ADC0) de la Nano y el LED a OC1A (PB1).', { arduino: 'pot', board: 'nano', parts: ['pot', 'res', 'led'], code: true, hint: 'PC0 = A0 y PB1 = D9. Extremos del potenciómetro a 5V y GND.' }, 'av_adc0'),
 PRJ('av-p9', 'Proyecto: termómetro con historial en EEPROM', 'av_thermo'),
 PRJ('av-p10', 'Proyecto: osciloscopio de bolsillo', 'av_scope'),
 PRJ('av-p11', 'Proyecto: cubo LED 4×4×4 por SPI', 'av_cube'),
 PRJ('av-p12', 'Proyecto: controlador MIDI', 'av_midi')
], exam: [
  Nm('Referencia AVcc de 5 V. El ADC da 307. ¿Qué tensión hay en la entrada, en V?', 1.499, 'V', 'Vin = ADC × Vref / 1024 = 307 × 5 / 1024 ≈ 1,50 V.', { tol: 0.01, c: 'av_adcreg', h: 'Despeja Vin de ADC = Vin · 1024 / Vref.', l: 'av22' }),
  Nm('Referencia interna de 1,1 V y 0,25 V en la entrada. ¿Qué lectura da el ADC?', 232, '', '0,25 × 1024 / 1,1 ≈ 232,7: el ADC da 232 (se queda con la parte entera).', { tol: 1, c: 'av_adcreg', h: 'ADC = Vin · 1024 / Vref.', l: 'av22' }),
  Q('¿Qué configura esta línea?', ['Referencia interna de 1,1 V, resultado alineado a la izquierda y canal ADC5 (A5)', 'AVcc y canal 5', 'AREF externa y canal 0', 'Referencia de 1,1 V y canal ADC3'], 'REFS1:0 = 11 → 1,1 V; ADLAR = 1 → alineado a la izquierda; MUX = 0101 → ADC5.', { code: 'ADMUX = (1 << REFS1) | (1 << REFS0) | (1 << ADLAR) | 5;', c: 'av_adcreg', h: 'Mira los bits REFS, ADLAR y el número de canal por separado.', l: 'av22' }),
  Q('El chip va a 8 MHz. ¿Qué prescaler del ADC da los 10 bits completos lo más deprisa posible?', ['64: 125 kHz', '128: 62,5 kHz', '32: 250 kHz', '16: 500 kHz'], 'El reloj del ADC debe quedar entre 50 y 200 kHz. 8 MHz / 32 se pasa; /64 entra y es más rápido que /128.', { c: 'av_adc', h: 'Divide 8 MHz entre cada prescaler.', l: 'av22' }),
  Nm('Con el reloj del ADC a 125 kHz, ¿cuánto dura la primera conversión tras encenderlo, en µs?', 200, 'µs', 'La primera tarda 25 ciclos: 25 / 125 kHz = 200 µs. Las siguientes, 13 ciclos: 104 µs.', { c: 'av_adc', h: 'La primera conversión es más larga que las demás.', l: 'av22' }),
  Nm('Con AVcc como referencia, la lectura de la referencia interna de 1,1 V da 375. ¿VCC, en V?', 3.004, 'V', '1,1 × 1024 / 375 ≈ 3,00 V.', { tol: 0.02, c: 'av_vcc', h: 'VCC = 1,1 × 1024 / lectura.', l: 'av23' }),
  Q('Al gastarse la pila, la lectura de la referencia interna (con AVcc como referencia)…', ['Sube: la misma tensión es una fracción mayor de una referencia más pequeña', 'Baja', 'No cambia', 'Se queda en 1023'], 'La regla (VCC) encoge y lo medido (1,1 V) no: el número crece.', { c: 'av_vcc', h: 'ADC = 1,1 · 1024 / VCC: ¿qué pasa si VCC baja?', l: 'av23' }),
  Nm('¿Cuántas lecturas hacen falta por resultado para sacar 14 bits del ADC de 10?', 256, 'lecturas', '4 bits extra: 4⁴ = 256 lecturas, y luego se desplaza 4 bits a la derecha.', { c: 'av_oversample', h: '4 elevado al número de bits extra.', l: 'av23' }),
  Nm('El ADC hace 9600 muestras por segundo. Con sobremuestreo a 12 bits, ¿cuántos resultados por segundo salen?', 600, 'resultados', '12 bits = 2 extra: 16 lecturas por resultado. 9600 / 16 = 600.', { tol: 5, c: 'av_oversample', h: 'Divide las muestras entre 4ⁿ.', l: 'av23' }),
  Q('Una señal muy limpia da siempre 512 exactos, sin variar nada. ¿Te sirve el sobremuestreo?', ['No: todas las lecturas son iguales y sumarlas no aporta información', 'Sí, siempre da 2 bits más', 'Sí, si sumas más lecturas', 'Solo con ADLAR'], 'Hace falta algo de ruido (al menos un paso) para que las lecturas se repartan entre códigos vecinos y la media caiga entre ellos.', { c: 'av_oversample', h: 'Recuerda la condición que pide el sobremuestreo.', l: 'av23' }),
  Q('Mides una batería con un divisor de dos resistencias de 100 kΩ. ¿Qué haces para que el ADC lea bien?', ['Poner 100 nF de la entrada a masa (la batería cambia despacio) o usar resistencias más bajas', 'Subir el reloj del ADC con el prescaler /2', 'Usar la referencia AREF', 'Nada: 100 kΩ es perfecto'], 'Visto desde el ADC, el divisor equivale a unos 50 kΩ, más de los 10 kΩ que pide la hoja de datos. El condensador entrega la carga del muestreo.', { c: 'av_adcimp', h: 'Compara la resistencia que ve el ADC con 10 kΩ.', l: 'av23' }),
  Nm('¿Qué UBRR0 da 19 200 baudios a 16 MHz sin U2X0?', 51, '', '16 000 000 / (16 × 19 200) − 1 = 51,08 → 51.', { tol: 0, c: 'av_uart', h: 'UBRR0 = F_CPU / (16 · baudios) − 1, redondeado.', l: 'av24' }),
  Nm('Con UBRR0 = 51 a 16 MHz (sin U2X0), ¿error de los baudios respecto a 19 200, en %?', 0.16, '%', 'Reales = 16 000 000 / (16 × 52) ≈ 19 231. 19 231 / 19 200 − 1 ≈ +0,16 %.', { tol: 0.02, c: 'av_uart', h: 'Calcula los baudios reales con UBRR0 + 1 y compáralos.', l: 'av24' }),
  Q('Un 328P con el RC interno sin calibrar (±10 %) se comunica por serie con un ordenador. ¿Qué esperas?', ['Que falle a menudo: el error de su reloj puede pasar con mucho del 2 %; calíbralo o usa cristal', 'Que funcione perfecto', 'Que funcione solo a 115 200', 'Que no afecte: la USART tiene su propio reloj'], 'La USART divide el reloj del chip: si este va un 5 % rápido, los baudios también. La diferencia total aceptable ronda el 2 %.', { c: 'av_uart', h: 'Los baudios salen del reloj del chip.', l: 'av24' }),
  Q('¿En qué orden salen por la línea los 8 bits de datos de la letra C (0x43 = 0b01000011)?', ['1 1 0 0 0 0 1 0', '0 1 0 0 0 0 1 1', '1 0 0 0 0 0 1 1', '0 0 1 1 1 1 0 1'], 'Primero el menos significativo (b0) y al final b7. Delante va el bit de inicio (0) y detrás el de parada (1).', { c: 'av_uart', h: 'La trama empieza por el bit de menor peso.', l: 'av24' }),
  Nm('Un GPS envía 500 bytes por segundo en 8N1. ¿Cuántos baudios necesita como mínimo?', 5000, 'baudios', '500 × 10 bits = 5000 bits por segundo. Por eso estos módulos suelen ir a 9600.', { c: 'av_uartrate', h: 'Cada byte son 10 bits en la línea.', l: 'av24' }),
  Q('¿Qué pasa con loop() si nunca llega nada por el puerto serie?', ['Se queda bloqueada para siempre en el while', 'Lee un 0 y sigue', 'Salta una interrupción', 'Se reinicia el chip'], 'RXC0 solo se pone a 1 cuando llega un byte. Para no bloquear, comprueba RXC0 con un if o recibe por interrupción.', { code: 'void loop() {\n  while (!(UCSR0A & (1 << RXC0))) ;\n  procesar(UDR0);\n  refrescarPantalla();\n}', c: 'av_uartreg', h: '¿Cuándo sale el while?', l: 'av25' }),
  Q('Recibes sin interrupciones y ves DOR0 a 1 cuando loop() hace cálculos largos. ¿Arreglo?', ['Recibir con RXCIE0: una ISR mete cada byte en un búfer circular', 'Poner U2X0 a 0', 'Escribir en UDR0', 'Activar UDRIE0'], 'DOR0 indica que llegaron bytes y nadie leyó UDR0 a tiempo. La ISR los recoge al momento, haga lo que haga loop().', { c: 'av_uartreg', h: 'Alguien tiene que leer UDR0 enseguida, aunque loop() esté ocupada.', l: 'av25' }),
  Nm('Serial.print() de 100 bytes a 9600 baudios con el búfer de envío (64 bytes) vacío. ¿Cuánto se bloquea loop(), en ms?', 37.5, 'ms', 'Caben 64; los 36 restantes esperan a que salgan otros tantos: 36 × 10 / 9600 = 37,5 ms.', { tol: 0.5, c: 'av_uartrate', h: 'Solo bloquea lo que no cabe en el búfer.', l: 'av25' }),
  Q('Conectas TX con TX y RX con RX entre la Uno y un módulo serie. ¿Qué pasa?', ['No se entienden: dos salidas enfrentadas y dos entradas que no escuchan a nadie', 'Funciona igual', 'Solo funciona a 9600', 'Se invierten los datos'], 'Lo que uno transmite lo tiene que recibir el otro: TX con RX y RX con TX, y masa común.', { c: 'av_uartwire', h: 'Una salida debe ir a una entrada.', l: 'av25' }),
  Nm('SPI con SCK = F_CPU / 16 a 16 MHz. ¿Cuántos µs tarda un byte, sin contar el código?', 8, 'µs', 'SCK = 1 MHz: 8 bits × 1 µs = 8 µs.', { c: 'av_bus', h: 'Primero la frecuencia de SCK; luego 8 bits.', l: 'av26' }),
  { t: 'order', q: 'Ordena la lectura de 3 bytes de un sensor SPI.', items: ['Poner a 0 el CS del sensor', 'Enviar el comando de lectura con spiByte()', 'Enviar tres bytes de relleno y guardar lo que devuelve spiByte()', 'Poner a 1 el CS'], e: 'CS enmarca la operación. Para leer hay que enviar: cada byte de relleno genera los 8 pulsos de reloj que traen uno de vuelta.', c: 'av_bus', h: 'CS al principio y al final; para leer, hay que enviar.', l: 'av26' },
  Q('Una pantalla pide SPI en modo 2. ¿CPOL y CPHA?', ['CPOL = 1 y CPHA = 0', 'CPOL = 0 y CPHA = 1', 'CPOL = 1 y CPHA = 1', 'CPOL = 0 y CPHA = 0'], 'Modo = CPOL × 2 + CPHA: 2 = 1 × 2 + 0.', { c: 'av_bus', h: 'Descompón el 2 como CPOL × 2 + CPHA.', l: 'av26' }),
  Nm('¿Qué TWBR da 200 kHz a 16 MHz con TWPS = 0?', 32, '', 'TWBR = (16 000 000 / 200 000 − 16) / 2 = (80 − 16) / 2 = 32.', { tol: 0, c: 'av_i2c', h: 'TWBR = (F_CPU / f_SCL − 16) / 2.', l: 'av27' }),
  Q('Un sensor tiene la dirección de 7 bits 0x68. ¿Qué byte envías tras el START para escribirle?', ['0xD0', '0x68', '0xD1', '0x34'], 'Dirección desplazada un bit y R/W = 0 (escritura): 0x68 × 2 = 0xD0. Para leer sería 0xD1.', { c: 'av_i2c', h: 'La dirección ocupa los 7 bits altos y el bit 0 es R/W.', l: 'av27' }),
  Q('Dos sensores iguales, con la misma dirección fija, en el mismo bus I²C. ¿Qué pasa?', ['Responden a la vez y el maestro no puede distinguirlos: cambia la dirección de uno (si tiene patilla para ello) o usa otro bus', 'Funcionan sin problema', 'El bus elige uno al azar y el otro calla', 'Se queman por el cortocircuito'], 'En I²C se elige con quién se habla por la dirección. Por el drenador abierto no se quema nada, pero los datos se mezclan.', { c: 'av_i2c', h: '¿Cómo elige el maestro con quién habla?', l: 'av27' }),
  Q('loop() suele tardar 300 ms, pero una lectura lenta de un sensor puede alargarla hasta 0,9 s. ¿Qué plazo de watchdog eliges?', ['2 s: cubre el peor caso con margen', '1 s: justo por encima', '500 ms', '250 ms'], 'El plazo debe superar el peor caso, no el normal, y con margen: el oscilador del watchdog no es preciso. Con 1 s, una variación del 10 % ya reiniciaría.', { c: 'av_wdt', h: 'Fíjate en el peor caso y en la precisión del oscilador del watchdog.', l: 'av28' }),
  Nm('Divisor de factor 0,5 hacia el comparador, con la referencia de 1,1 V en la otra entrada. ¿A qué tensión de batería salta el aviso, en V?', 2.2, 'V', 'Umbral = 1,1 / 0,5 = 2,2 V.', { c: 'av_acomp', h: 'Umbral = 1,1 / factor del divisor.', l: 'av28' }),
  Nm('Un registro de 8 bytes se escribe cada minuto, rotando por toda la EEPROM (1024 bytes = 128 posiciones). Con 100 000 escrituras por celda, ¿cuántos años dura?', 24.4, 'años', 'Cada posición se escribe cada 128 min: 128 × 100 000 = 12 800 000 min ≈ 24,4 años.', { tol: 0.3, c: 'av_eeprom', h: 'Cada celda se reescribe cada vez que la rotación da una vuelta completa.', l: 'av28' })
] };

  /* ===================== MÓDULO 6 · Energía y fiabilidad ===================== */
  const SV_DECADES = `<svg viewBox="0 0 300 130" class="viz"><path d="M20 70H280" stroke="var(--muted)"/>
    ${[['0,1 µA', 0], ['1 µA', 1], ['10 µA', 2], ['100 µA', 3], ['1 mA', 4], ['10 mA', 5]].map(([l, k]) => `<path d="M${20 + k * 52} 64v12" stroke="var(--muted)"/><text x="${20 + k * 52}" y="92" text-anchor="middle" class="vizsm">${l}</text>`).join('')}
    <circle cx="20" cy="70" r="7" fill="var(--ok)"/><text x="24" y="50" class="vizsm" style="fill:var(--ok)">power-down</text>
    <circle cx="${(20 + 52 * Math.log10(40)).toFixed(1)}" cy="70" r="6" fill="var(--ice)"/><text x="${(20 + 52 * Math.log10(40)).toFixed(1)}" y="40" text-anchor="middle" class="vizsm" style="fill:var(--ice)">+ watchdog</text>
    <circle cx="280" cy="70" r="7" fill="var(--err)"/><text x="280" y="50" text-anchor="end" class="vizsm" style="fill:var(--err)">despierto</text>
    <text x="20" y="120" class="vizsm">Cada marca ×10: dormido gasta cien mil veces menos</text></svg>`;

  const M6 = { id: 'av-m6', title: 'Energía y fiabilidad', desc: 'Modos de sueño, despertar, BOD, reinicios y cómo hacer que unas pilas duren años.', nodes: [
 L('av29', 'Modos de sueño', 'sleep', ['av_sleepmode', 'av_leak'], [
  Q('Despierto a 16 MHz, el 328P gasta del orden de 10 mA. ¿Cuánto crees que puede gastar en su sueño más profundo?', ['Una décima de microamperio', '5 mA', '1 mA', 'Lo mismo: dormir no ahorra'], 'En power-down, con el watchdog apagado, unos 0,1 µA: cien mil veces menos.', { predict: true, c: 'av_leak', h: 'Si se para todo, ¿qué queda gastando?' }),
  { t: 'explore', text: 'Cada modo de sueño para más cosas. Recórrelos y mira qué sigue funcionando.', viz: 'av_smode', params: { m: pSl('Modo (0 = despierto … 4 = power-down)', 0, 0, 4) },
    tasks: [{ q: 'usartSleep', min: 1, max: 1, text: 'Duerme la CPU pero que la USART siga recibiendo', done: '<b>Idle</b>: solo para la CPU; temporizadores, USART y ADC siguen.', hint: 'El primer modo de sueño.' },
      { q: 'm', min: 3, max: 3, text: 'Para todo menos el Timer2 con su cristal de reloj', done: '<b>Power-save</b>: como power-down, pero el Timer2 asíncrono sigue contando la hora.' },
      { q: 'm', min: 4, max: 4, text: 'El sueño más profundo', done: '<b>Power-down</b>: solo el watchdog y los despertares externos (INT por nivel y PCINT).' }],
    more: 'ADC Noise Reduction para la CPU y casi todo menos el ADC: sirve para medir sin el ruido digital de la CPU.' },
  I('<b>SMCR</b> elige el modo (bits SM2:0) y lo habilita (SE); la instrucción <b>sleep</b> duerme el chip. En C, avr/sleep.h lo hace por ti.', { code: '#include <avr/sleep.h>\n\nset_sleep_mode(SLEEP_MODE_PWR_DOWN);\nsleep_enable();\nsei();\nsleep_cpu();        // aquí se duerme…\nsleep_disable();    // …y por aquí sigue al despertar' }),
  I('Cifras típicas de la hoja de datos en power-down (3 V, 25 °C): unos <b>0,1 µA</b> con el watchdog apagado y unos 4 µA con él encendido. Despierto, del orden de 10 mA: cinco órdenes de magnitud.', { svg: SV_DECADES }),
  I('Antes de dormir, apaga lo que no haga falta: el ADC (ADEN = 0), el comparador (ACD = 1) y, con <b>PRR</b>, el reloj de los periféricos que no uses. Y no dejes entradas flotando: una entrada a media tensión hace conducir su buffer.', { code: 'ADCSRA &= ~(1 << ADEN);     // ADC apagado\nACSR   |=  (1 << ACD);      // comparador apagado\nPRR     =  0xFF;            // sin reloj para ningún periférico\nsleep_bod_disable();        // BOD apagado mientras duerme (justo antes de sleep_cpu)' }),
  { t: 'steps', text: 'Quieres dormir en power-down hasta que un pulsador te despierte. ¿Qué haces, en orden?', steps: ['Configura lo que despertará: aquí, una PCINT en la pata del pulsador', 'Apaga lo que no hace falta: el ADC, el comparador…', 'set_sleep_mode(SLEEP_MODE_PWR_DOWN)', 'sleep_enable(); sei(); sleep_cpu(); seguidos', 'Al despertar: sleep_disable() y vuelve a encender lo apagado'], result: 'Dormido, gasta microamperios' },
  { t: 'match', q: 'Une cada modo con lo que sigue funcionando.', pairs: [['Idle', 'CPU parada; temporizadores, USART y ADC siguen'], ['ADC Noise Reduction', 'Casi solo el ADC: medidas limpias'], ['Power-down', 'Todo parado salvo watchdog y despertares externos'], ['Power-save', 'Como power-down, pero el Timer2 asíncrono sigue']], c: 'av_sleepmode', h: 'Ve del más ligero (Idle) al más profundo (Power-down).' },
  Q('El Timer2 con un cristal de reloj de 32 768 Hz debe seguir contando mientras duerme. ¿Modo?', ['Power-save', 'Power-down', 'Idle', 'ADC Noise Reduction'], 'Power-save mantiene el Timer2 asíncrono.', { c: 'av_sleepmode', h: 'El modo que es «power-down más el Timer2».' }),
  Q('Necesitas que la USART siga recibiendo mientras la CPU descansa. ¿Modo?', ['Idle', 'Power-down', 'Power-save', 'ADC Noise Reduction'], 'Solo Idle mantiene el reloj de E/S.', { c: 'av_sleepmode', h: 'La USART necesita el reloj de E/S.' }),
  { t: 'order', q: 'Ordena la secuencia para dormir.', items: ['Configurar la fuente de despertar', 'Apagar el ADC y lo que no haga falta', 'set_sleep_mode(SLEEP_MODE_PWR_DOWN)', 'sleep_enable() y sei()', 'sleep_cpu()', 'Al despertar: sleep_disable() y restaurar'], e: 'sei() justo antes de sleep_cpu() garantiza que se duerme antes de atender la interrupción.', c: 'av_sleepmode', h: 'Lo último antes de dormir es la propia instrucción sleep.' },
  Q('Al despertar de power-down con el cristal de 16 MHz de Arduino, el chip tarda en arrancar…', ['Unos 16 000 ciclos (1 ms) a que el cristal se estabilice; con el RC interno, solo 6', 'Nada', 'Un segundo', 'Siempre 65 ms'], 'Lo fijan los fusibles SUT y CKSEL.', { c: 'av_sleepmode', h: 'En power-down el oscilador se para: hay que volver a arrancarlo.' }),
  TU('Apaga lo que sobra hasta bajar de 1 µA dormido.', 'av_leak', { adc: L01('ADC', 1), bod: L01('BOD', 1), wdt: L01('Watchdog', 1), flot: L01('Entradas flotantes', 1) }, { q: 'I', min: 0, max: 1, text: 'Objetivo: menos de 1 µA', hint: 'Hay que apagarlo todo.' }, 'Solo el núcleo dormido: unos 0,1 µA. Si necesitas el watchdog para despertar, suma sus 4 µA.', { c: 'av_leak', h: 'Mira qué consumidor pesa más y empieza por él.' }),
  Q('Duermes en power-down pero mides 300 µA. Sospechoso habitual:', ['El ADC sigue encendido (ADEN = 1) o hay entradas flotando', 'El cristal', 'El watchdog', 'Nada: es normal'], 'El ADC encendido gasta aunque no convierta.', { c: 'av_leak', h: '¿Qué consumidor llega a cientos de µA?' }),
  Q('¿Por qué gastan las entradas digitales que flotan?', ['El buffer de entrada queda a media tensión y conduce: pon pull-ups o salidas fijas', 'Son antenas que emiten', 'Se calientan las patas', 'No gastan'], 'Las dos mitades del inversor CMOS conducen a la vez.', { c: 'av_leak', h: 'Piensa en un inversor CMOS con la entrada a mitad de camino.' }),
  Q('sleep_bod_disable() justo antes de dormir…', ['Apaga el detector de baja tensión mientras duerme y ahorra unos 20 µA', 'Desactiva el watchdog', 'Reinicia el chip', 'Sube el reloj'], 'Al despertar, el BOD vuelve a funcionar.', { c: 'av_leak', h: 'BOD: detector de baja tensión.' }),
  I('<b>Resumen</b>\n· Idle → ADC NR → power-save → power-down: cada vez más parado.\n· Power-down: unos 0,1 µA; cada cosa encendida suma (ADC, BOD, watchdog, entradas flotantes).\n· Secuencia: configurar despertar, apagar, set_sleep_mode, sleep_enable, sei y sleep_cpu.')
 ]),
 L('av30', 'Despertar: interrupciones y watchdog', 'sleep', ['av_wake', 'av_wdt', 'av_clksrc', 'av_vector', 'av_leak'], [
  Q('Configuras INT0 por flanco de bajada para que un pulsador despierte al chip de power-down. Pulsas… ¿crees que despierta?', ['No: en power-down no hay reloj para detectar flancos; hace falta nivel bajo o PCINT', 'Sí, siempre', 'Sí, pero tarda 8 s', 'Solo si el watchdog está activo'], 'Detectar un flanco necesita el reloj de E/S, que en power-down está parado.', { predict: true, c: 'av_wake', h: '¿Qué hace falta para notar un flanco?' }),
  { t: 'explore', text: 'No todo despierta al chip en todos los modos. Elige el modo y la fuente.', viz: 'av_wake', params: { mode: pSl('Modo (0 = Idle, 1 = Power-save, 2 = Power-down)', 0, 0, 2), src: pSl('Fuente', 0, 0, 6) },
    tasks: [{ q: 'btnPD', min: 1, max: 1, text: 'En power-down, elige una fuente que sirva para un pulsador', done: 'INT0/INT1 <b>por nivel bajo</b> o una <b>PCINT</b>: no necesitan reloj.', hint: 'Pon el modo 2 y busca una que tenga ✓.' },
      { q: 'selfPD', min: 1, max: 1, text: 'Ahora una que despierte de power-down sin nada externo', done: 'El <b>watchdog</b> en modo interrupción: un despertador de 16 ms a 8 s.' },
      { q: 'usartW', min: 1, max: 1, text: '¿Y si necesitas que un byte por la USART despierte al chip?', done: 'Solo en Idle: la USART necesita el reloj de E/S.', hint: 'Fuente 5 y busca el modo con ✓.' }] },
  I('Despiertan de power-down: INT0/INT1 <b>por nivel bajo</b>, cualquier <b>PCINT</b>, la coincidencia de dirección del TWI y el <b>watchdog</b>. Todo lo que necesita reloj (flancos de INT0, USART, Timer1) solo despierta desde Idle.', { code: 'EICRA = 0;                 // INT0 por nivel bajo (ISC01:00 = 00)\nEIMSK = (1 << INT0);\n\nISR(INT0_vect) {\n  EIMSK = 0;               // desactívala: mientras siga pulsado, saltaría sin parar\n}' }),
  I('El <b>watchdog en modo interrupción</b> (WDIE = 1, WDE = 0) es un despertador: cada 16 ms a 8 s salta WDT_vect y el chip despierta. Para periodos más largos, cuentas despertares.', { code: 'ISR(WDT_vect) { }                       // solo despierta\n\nvoid watchdog8s(void) {\n  cli();\n  MCUSR &= ~(1 << WDRF);\n  WDTCSR = (1 << WDCE) | (1 << WDE);     // abre la ventana de 4 ciclos\n  WDTCSR = (1 << WDIE) | (1 << WDP3) | (1 << WDP0);   // interrupción, 8 s\n  sei();\n}' }),
  { t: 'steps', text: 'Quieres medir cada 10 minutos usando el watchdog como despertador. ¿Cuántos despertares?', steps: ['El watchdog despierta cada 8 s como mucho', '10 min = 600 s', '600 / 8 = <b>75 despertares</b>', 'En 74 de ellos el programa solo suma 1 y vuelve a dormir enseguida'], result: '75 despertares por medida' },
  Nm('¿Cuántos despertares de 8 s hacen falta para medir cada hora?', 450, '', '3600 / 8 = 450.', { c: 'av_wake', h: 'Pasa la hora a segundos y divide entre 8.' }),
  Q('Un pulsador en PD3 debe despertar al chip de power-down. Configuras…', ['INT1 por nivel bajo, o PCINT19', 'INT1 por flanco de bajada', 'El Timer1', 'La USART'], 'PD3 es INT1 y también PCINT19.', { c: 'av_wake', h: 'Descarta lo que necesite reloj.' }),
  Q('¿Qué tal es el watchdog como reloj?', ['Malo: su oscilador de 128 kHz varía con la tensión y la temperatura; para horas exactas, un RTC', 'Excelente', 'Igual que un cristal', 'Depende del prescaler'], 'Sirve para «más o menos cada 8 s».', { c: 'av_clksrc', h: '¿Es un cristal o un oscilador RC?' }),
  Q('¿Por qué cambiar WDTCSR exige escribir WDCE y WDE juntos y el valor nuevo en menos de 4 ciclos?', ['Para que un programa descontrolado no pueda apagar el watchdog por accidente', 'Para ir más rápido', 'Por el bootloader', 'Es opcional'], 'Una secuencia así no ocurre por casualidad.', { c: 'av_wdt', h: '¿Contra quién protege el watchdog?' }),
  Q('Despiertas con el PCINT de un pulsador. La ISR de ese PCINT…', ['Debe existir aunque esté vacía, o el salto irá a __bad_interrupt', 'No hace falta', 'Debe ser larga', 'Debe volver a dormir'], 'Una ISR vacía basta para despertar.', { c: 'av_vector', h: '¿Qué pasa con una interrupción activa sin su ISR?' }),
  I('Una trampa: compruebas «¿hay trabajo?», ves que no y vas a dormir… pero la interrupción llega justo entre medias. Te quedas dormido sin atenderla. Remedio: cli(), comprueba y, si no hay nada, <b>sei() y sleep_cpu() seguidos</b>: la instrucción que sigue a sei() siempre se ejecuta antes de atender una interrupción.', { code: 'cli();\nif (!hayTrabajo) {\n  sleep_enable();\n  sei();          // la siguiente instrucción se ejecuta sí o sí…\n  sleep_cpu();    // …así que se duerme antes de atender la interrupción\n  sleep_disable();\n}\nsei();' }),
  Q('Compruebas «¿hay trabajo?», ves que no y vas a dormir, pero la interrupción llega justo entre medias. ¿Riesgo y solución?', ['Dormir sin atenderla: haz cli(), comprueba y luego sei(); sleep_cpu(); seguidos', 'Ninguno', 'Se reinicia', 'Se pierde el watchdog'], 'La instrucción que sigue a sei() se ejecuta siempre antes de cualquier interrupción.', { c: 'av_wake', h: 'Piensa en lo que ocurre si la interrupción cae entre el if y el sleep.' }),
  { t: 'order', q: 'Ordena un ciclo de medida de un aparato a pilas.', items: ['Despertar por el watchdog', 'Encender el sensor y esperar a que se estabilice', 'Medir y guardar', 'Apagar el sensor', 'Volver a dormir'], e: 'Todo lo que no mide, apagado.', c: 'av_leak', h: 'Despierto el menor tiempo posible, y el sensor solo cuando hace falta.' },
  I('<b>Resumen</b>\n· De power-down despiertan: INT por nivel bajo, PCINT, TWI y watchdog. Los flancos, no.\n· Watchdog con WDIE: despertador de hasta 8 s; para más, cuenta despertares.\n· Contra la carrera: cli(), comprobar y sei(); sleep_cpu(); seguidos.')
 ]),
 L('av31', 'BOD, reinicios y fiabilidad', 'shield', ['av_reset', 'av_vmax', 'av_wdt', 'av_sections', 'av_bare'], [
  Q('Tu aparato se reinicia de vez en cuando, justo al arrancar un motor. ¿Cómo crees que puedes saber la causa?', ['El chip guarda en un registro por qué se reinició la última vez', 'No hay forma', 'Mirando la EEPROM', 'Con un Serial.print en una ISR'], 'Es MCUSR: encendido, pata RESET, baja tensión o watchdog.', { predict: true, c: 'av_reset', h: 'Un registro que hace de caja negra.' }),
  { t: 'explore', text: 'Al arrancar un motor, la alimentación se hunde un instante. El <b>BOD</b> (detector de baja tensión) mantiene el chip en reinicio si VCC baja de su umbral.', viz: 'av_bod', params: { lvl: { label: 'Nivel del BOD (0 = apagado)', val: 2.7, list: [0, 1.8, 2.7, 4.3], unit: 'V', dec: 1 }, vmin: pSl('Tensión mínima del bajón', 4.6, 2, 5, 0.1, 'V', 1) },
    tasks: [{ q: 'st', min: 2, max: 2, text: 'Haz un bajón que deje el chip fuera de especificación sin reiniciarse', done: 'Con el BOD de Arduino (2,7 V), a 3 V el chip sigue funcionando a 16 MHz donde ya no está garantizado: puede ejecutar mal y estropear la EEPROM.', hint: 'Baja la tensión mínima a unos 3 V.' },
      { q: 'safe', min: 1, max: 1, text: 'Elige un BOD que convierta ese bajón en un reinicio limpio', done: 'Con 4,3 V, el chip se para antes de salir de especificación y arranca de nuevo cuando la tensión vuelve.', hint: 'El nivel más alto.' }] },
  I('El <b>BOD</b> (Brown-Out Detector) mantiene el chip en reinicio si VCC baja de un umbral elegido con los fusibles BODLEVEL: 1,8, 2,7 o 4,3 V. Sin él, con tensión baja la CPU puede ejecutar mal y corromper la EEPROM o la Flash. Con 16 MHz, lo sensato es 4,3 V.', { code: 'Umbrales del BOD:  1,8 V · 2,7 V · 4,3 V\n16 MHz necesita unos 3,8 V → BOD a 4,3 V\n8 MHz a 3,3 V      → BOD a 2,7 V' }),
  I('<b>MCUSR</b> guarda la causa del último reinicio: PORF (bit 0, encendido), EXTRF (bit 1, pata RESET), BORF (bit 2, baja tensión) y WDRF (bit 3, watchdog). Léelo al arrancar y bórralo.', { code: 'uint8_t causa = MCUSR;   // guárdalo lo primero\nMCUSR = 0;\nif (causa & (1 << BORF)) { /* la tensión se hundió */ }\nif (causa & (1 << WDRF)) { /* el watchdog nos rescató */ }', more: 'Algunos bootloaders borran MCUSR antes de que tu programa lo vea; Optiboot lo pasa en un registro. Si no ves nada, sospecha del bootloader.' }),
  { t: 'steps', text: 'Al arrancar lees MCUSR = 0x09. ¿Qué ha pasado?', steps: ['0x09 = 0b00001001', 'Bit 0 = PORF: hubo un encendido', 'Bit 3 = WDRF: hubo un reinicio por watchdog', 'Desde el último borrado: se encendió y, después, el watchdog lo reinició'], result: 'Encendido y watchdog' },
  { t: 'bits', q: 'MCUSR tras un brown-out seguido de un reinicio por watchdog, sin borrar: BORF (bit 2) y WDRF (bit 3).', n: 8, target: 12, e: '4 + 8 = 12.', c: 'av_reset', h: 'Enciende los bits 2 y 3.' },
  Q('Ves BORF a 1 cada vez que arranca un motor.', ['La tensión cae al arrancar el motor: alimentación separada, condensadores y masas bien llevadas', 'El watchdog está mal configurado', 'El código es lento', 'Falta volatile'], 'El pico de arranque hunde la alimentación.', { c: 'av_reset', h: 'BORF = baja tensión.' }),
  Q('Chip a 16 MHz alimentado a 5 V. ¿Qué nivel de BOD tiene más sentido?', ['4,3 V: por debajo de unos 3,8 V, 16 MHz ya está fuera de especificación', '1,8 V', 'Apagado', '2,7 V, para que dure más'], 'Arduino usa 2,7 V, que es optimista para 16 MHz.', { c: 'av_vmax', h: 'Recuerda cuánta tensión pide 16 MHz.' }),
  Q('¿Dónde pones wdt_reset() para que el watchdog sea una red de seguridad de verdad?', ['En un único punto del bucle principal que solo se alcanza si todo va bien', 'En la ISR de un temporizador', 'Dentro de cada función', 'En setup()'], 'En una ISR seguiría reiniciándolo aunque loop() estuviera colgado.', { c: 'av_wdt', h: 'Tiene que depender de que el programa principal avance.' }),
  Q('¿Qué hace el fusible WDTON?', ['Deja el watchdog siempre activado: el programa no puede apagarlo', 'Apaga el watchdog', 'Activa el BOD', 'Acelera el watchdog'], 'Para sistemas donde un cuelgue no es aceptable.', { c: 'av_wdt', h: 'WDT + ON.' }),
  I('Dos trucos de fiabilidad. Una variable en la sección <b>.noinit</b> no se pone a cero al arrancar: sobrevive a un reinicio por watchdog o por RESET (tras un corte de alimentación, basura). Y la pata RESET necesita su pull-up de 10 kΩ y cada pareja de alimentación su 100 nF.', { code: '// cuántas veces nos ha rescatado el watchdog, sin usar la EEPROM\nuint8_t rescates __attribute__((section(".noinit")));' }),
  Q('Una variable debe sobrevivir a un reinicio por watchdog sin usar la EEPROM. ¿Dónde?', ['En la sección .noinit: el arranque no la pone a cero', 'En .data', 'En la pila', 'Es imposible'], 'Tras un corte de alimentación, su valor es basura.', { c: 'av_sections', h: '¿Qué sección no toca el código de arranque?' }),
  Q('La pata RESET capta ruido y el chip se reinicia a veces. ¿Qué pones?', ['Pull-up de 10 kΩ a VCC y, si hace falta, un condensador pequeño a masa', 'Nada', 'Una resistencia de 1 MΩ en serie', 'Un LED'], 'Sin pull-up firme, RESET es una antena.', { c: 'av_bare', h: 'RESET es activa a 0: hay que sujetarla a 1.' }),
  Q('Desacoplo del 328P:', ['100 nF entre cada VCC/AVCC y su GND, pegados al chip', 'Uno solo para todo', '1000 µF', 'Ninguno'], 'Cada pareja de alimentación, su condensador.', { c: 'av_bare', h: 'Cerca de cada pareja de patas de alimentación.' }),
  I('<b>Resumen</b>\n· BOD: reinicio limpio si VCC baja; con 16 MHz, a 4,3 V.\n· MCUSR: PORF, EXTRF, BORF y WDRF; léelo al arrancar y bórralo.\n· wdt_reset() en un solo punto de loop(); WDTON lo deja siempre activo.\n· .noinit sobrevive a reinicios; pull-up en RESET y 100 nF por pareja.')
 ]),
 L('av32', 'Presupuesto de batería', 'bat', ['av_sleep', 'av_leak'], [
  Q('Un sensor despierta 10 ms con 10 mA cada 10 s y duerme con 100 µA. ¿Qué crees que manda en lo que dura la pila?', ['La corriente dormido: 100 µA todo el rato pesa más', 'La corriente despierto', 'Las dos igual', 'Ninguna'], 'Despierto aporta 10 mA × 0,001 = 10 µA de media; dormido, casi 100 µA.', { predict: true, c: 'av_sleep', h: 'Calcula la media de cada parte: corriente × fracción del tiempo.' }),
  { t: 'explore', text: 'Presupuesto de energía de un aparato a pilas. Cambia cada parámetro y mira qué manda en la autonomía.', viz: 'av_sleep', params: sleepP(),
    tasks: [{ q: 'years', min: 1, max: 1e9, text: 'Consigue que una CR2032 (220 mAh) dure más de un año', done: 'Hace falta una media por debajo de unos 25 µA: dormir con pocos µA y despertar poco.', hint: 'Baja la corriente dormido a unos µA y despierta menos a menudo.' },
      { q: 'fa', min: 0.5, max: 1, text: 'Ahora haz que lo que más gaste sea el rato despierto', done: 'Cuando el sueño ya gasta muy poco, manda el tiempo despierto: que sea corto y poco frecuente.', hint: 'Con el sueño muy bajo, alarga el tiempo despierto.' }] },
  I('<b>Consumo medio</b> = (I despierto × t despierto + I dormido × t dormido) / periodo.\n<b>Autonomía</b> = capacidad / consumo medio.\nSi duerme el 99,9 % del tiempo, casi siempre manda la corriente <b>dormido</b>.', { code: 'Ejemplo: 10 mA durante 10 ms cada 10 s, y 5 µA dormido\ndespierto: 10 mA × 0,001  = 10 µA de media\ndormido:   5 µA × 0,999   ≈  5 µA\nmedia ≈ 15 µA → 220 mAh / 0,015 mA ≈ 14 700 h ≈ 1,7 años' }),
  { t: 'steps', text: 'Duerme con 3 µA y cada 8 s despierta 2 ms gastando 5 mA. ¿Corriente media?', steps: ['Despierto: 5000 µA × 0,002 s = 10 µA·s', 'Dormido: 3 µA × 7,998 s ≈ 24 µA·s', 'En cada periodo de 8 s: unos 34 µA·s', 'Media = 34 / 8 ≈ <b>4,25 µA</b>'], result: 'Unos 4,25 µA' },
  Nm('Duerme con 5 µA y cada 10 s despierta 10 ms con 10 mA. ¿Corriente media, en µA?', 15, 'µA', '(10 000 × 0,01 + 5 × 9,99) / 10 ≈ 15 µA.', { tol: 0.3, c: 'av_sleep', h: 'Pasa todo a µA y segundos, suma las dos cargas y divide entre el periodo.' }),
  G('av_sleepLife'), G('av_sleepLife'),
  TU('Con una batería de 2500 mAh, consigue más de 5 años.', 'av_sleep', sleepP(2500), { q: 'years', min: 5, max: 1e9, text: 'Objetivo: más de 5 años', hint: 'La media debe quedar por debajo de unos 57 µA.' }, '2500 mAh / 5 años (43 800 h) ≈ 57 µA de media como mucho.', { c: 'av_sleep', h: 'Primero baja la corriente dormido; luego el tiempo despierto.' }),
  I('Una placa Uno no sirve para pilas: aunque el 328P duerma, el chip del USB, el regulador y el LED de encendido siguen gastando decenas de mA. Para pilas: el chip suelto o una placa mínima sin LED ni regulador.', { code: 'Uno «dormida»:   unos 25 mA  → 2500 mAh duran ~4 días\nChip suelto:     unos µA     → la misma pila, años' }),
  Q('Una Uno «dormida» gasta unos 25 mA. Con 2500 mAh dura…', ['Unos 4 días', 'Un año', 'Diez años', 'Una hora'], '2500 / 25 = 100 h.', { c: 'av_sleep', h: 'Capacidad entre corriente da horas.' }),
  Q('Las pilas se autodescargan y rinden menos con frío y con picos de corriente. Por eso…', ['Aplica un margen: cuenta con el 70–80 % de la capacidad nominal', 'Ignóralo', 'Duplica la tensión', 'Usa más corriente'], 'La capacidad nominal es en condiciones ideales.', { c: 'av_sleep', h: 'Lo que pone la pila es el mejor caso.' }),
  Q('Una CR2032 tiene mucha resistencia interna. Un pico de 20 mA (un LED o una radio)…', ['Hace caer su tensión y puede provocar un brown-out: pon un condensador grande en paralelo', 'No le afecta', 'La recarga', 'Sube su tensión'], 'El condensador entrega el pico.', { c: 'av_sleep', h: 'Ley de Ohm con la resistencia interna de la pila.' }),
  I('Para medir µA, el multímetro en serie mete una caída de tensión en sus rangos bajos: al despertar, el pico de corriente puede hacer caer el chip. Puentéalo mientras despierta o usa un medidor específico. Dormido, el chip solo debería gastar unos 0,1 µA más lo que dejes encendido.', { code: 'En el rango de µA, el multímetro tiene cientos de ohmios o más dentro (según el modelo)\nPico de 10 mA × 100 Ω = 1 V de caída → el chip puede reiniciarse' }),
  Q('Para medir µA con el multímetro en serie, cuidado con…', ['Su caída de tensión en los rangos bajos, que al despertar puede hacer caer el chip', 'Nada', 'Que mide alterna', 'Que se descalibra'], 'Puentea el multímetro mientras despierta o usa un medidor específico.', { c: 'av_leak', h: 'Un amperímetro también tiene resistencia.' }),
  I('<b>Resumen</b>\n· Media = (I·t despierto + I·t dormido) / periodo; autonomía = capacidad / media.\n· Casi siempre manda el sueño; cuando ya es mínimo, el tiempo despierto.\n· Chip suelto, margen del 70–80 % y condensador para los picos.')
 ]),
 PRJ('av-p13', 'Proyecto: registrador a pilas que dura más de un año', 'av_logger')
], exam: [
  Q('Muestreas el ADC 1000 veces por segundo con el Timer1 y quieres ahorrar energía entre muestras. ¿Qué modo de sueño usas?', ['Idle: el Timer1 necesita el reloj de E/S para seguir contando', 'Power-down', 'Power-save', 'No se puede dormir'], 'Power-save solo mantiene el Timer2 asíncrono, y power-down, nada. Idle para la CPU y deja los periféricos en marcha.', { c: 'av_sleepmode', h: '¿Qué modos dejan funcionar el Timer1?', l: 'av29' }),
  Q('Quieres que la CPU no meta ruido digital mientras el ADC convierte. ¿Qué modo de sueño?', ['ADC Noise Reduction', 'Idle', 'Power-down', 'Power-save'], 'Para la CPU y casi todo menos el ADC; el fin de la conversión despierta al chip.', { c: 'av_sleepmode', h: 'Su nombre lo dice.', l: 'av29' }),
  Q('¿Por qué no se duerme el chip con este código?', ['Falta sleep_enable(): sin SE a 1, la instrucción sleep no hace nada', 'Falta cli()', 'Power-down no existe', 'sei() lo despierta'], 'En SMCR, SM2:0 eligen el modo y SE lo habilita. set_sleep_mode() solo pone el modo.', { code: 'set_sleep_mode(SLEEP_MODE_PWR_DOWN);\nsei();\nsleep_cpu();', c: 'av_sleepmode', h: 'Mira qué hace cada una de las dos partes de SMCR.', l: 'av29' }),
  Q('Duermes en power-down con el watchdog activo para despertar y todo lo demás apagado. ¿Consumo aproximado?', ['Unos 4 µA', 'Unos 0,1 µA', 'Unos 200 µA', 'Unos 10 mA'], 'Núcleo dormido (unos 0,1 µA) más el watchdog (unos 4 µA): manda el watchdog.', { c: 'av_leak', h: 'Suma lo que sigue encendido.', l: 'av29' }),
  Q('Te dejas el ADC encendido al dormir: unos 200 µA en vez de unos 4 µA. Si el sueño es lo que manda, ¿cuánto menos dura la pila?', ['Unas 50 veces menos', 'Lo mismo', 'La mitad', 'Mil veces menos'], '204 / 4 ≈ 50: un solo bit (ADEN) puede convertir años en semanas.', { c: 'av_leak', h: 'Divide un consumo entre el otro.', l: 'av29' }),
  TU('Necesitas el watchdog para despertar. Apaga lo demás hasta bajar de 5 µA dormido.', 'av_leak', { adc: L01('ADC', 1), bod: L01('BOD', 1), wdt: fx(1), flot: L01('Entradas flotantes', 1) }, { q: 'I', min: 0, max: 5, text: 'Objetivo: menos de 5 µA con el watchdog encendido', hint: 'El watchdog se queda: apaga todo lo demás.' }, 'Núcleo (0,1 µA) más watchdog (4 µA): unos 4,1 µA. Cualquier otra cosa encendida te saca del objetivo.', { c: 'av_leak', h: 'El ADC, el BOD y las entradas flotantes suman decenas o cientos de µA.', l: 'av29' }),
  Q('Un pulsador en D8 (PB0) debe despertar al chip de power-down. ¿Qué usas?', ['Una PCINT: PCIE0 en PCICR y PCINT0 en PCMSK0', 'INT0 por flanco de bajada', 'INT1 por nivel bajo', 'El Timer1'], 'D8 no tiene INT0 ni INT1, pero cualquier PCINT despierta de power-down porque no necesita reloj.', { c: 'av_wake', h: 'Mira qué interrupciones tiene PB0.', l: 'av30' }),
  Nm('Quieres medir cada 2 minutos usando despertares del watchdog de 8 s. ¿Cuántos despertares por medida?', 15, 'despertares', '120 s / 8 s = 15.', { c: 'av_wake', h: 'Pasa los minutos a segundos y divide entre 8.', l: 'av30' }),
  Q('Cuentas 450 despertares de 8 s como «una hora» y, al cabo de un día, el aparato se ha desviado 40 minutos. ¿Por qué?', ['El oscilador de 128 kHz del watchdog no es preciso: varía con la tensión y la temperatura', 'Falta volatile en el contador', 'El BOD lo reinicia', 'El cristal de 16 MHz se ha parado'], '40 min en 24 h es un 2,8 %: normal para el oscilador del watchdog. Para horas exactas, un RTC o el Timer2 con cristal de reloj.', { c: 'av_clksrc', h: '¿De qué oscilador sale el tiempo del watchdog?', l: 'av30' }),
  Q('El Timer2 con su cristal de reloj debe despertar al chip cada segundo. ¿Desde qué modos puede hacerlo?', ['Idle y power-save, pero no power-down', 'Solo power-down', 'Desde todos', 'Solo Idle'], 'En power-down se para hasta el Timer2 asíncrono; power-save lo mantiene contando, y su interrupción despierta.', { c: 'av_wake', h: 'Recuerda en qué se diferencia power-save de power-down.', l: 'av30' }),
  { t: 'match', q: 'Une cada necesidad con una forma de despertar de power-down.', pairs: [['Un pulsador en D2', 'INT0 por nivel bajo'], ['Un pulsador en A3', 'PCINT del puerto C'], ['Medir cada minuto sin nada externo', 'Watchdog en modo interrupción'], ['Un maestro I²C te llama', 'Coincidencia de dirección del TWI']], c: 'av_wake', h: 'Todas deben funcionar sin el reloj de E/S.', l: 'av30' },
  Q('Al arrancar lees MCUSR = 0x02. ¿Qué ha pasado?', ['Alguien llevó la pata RESET a 0 (EXTRF)', 'Un encendido (PORF)', 'Una caída de tensión (BORF)', 'El watchdog (WDRF)'], '0x02 = bit 1 = EXTRF: reinicio por la pata RESET, por ejemplo el botón o el auto-reset al cargar.', { c: 'av_reset', h: 'Pasa 0x02 a binario: ¿qué bit está a 1?', l: 'av31' }),
  { t: 'bits', q: 'Marca MCUSR tras un encendido seguido de una pulsación de RESET, sin borrarlo entre medias.', n: 8, target: 3, e: 'PORF (bit 0) y EXTRF (bit 1): 1 + 2 = 3.', c: 'av_reset', h: 'Encendido y pata RESET: bits 0 y 1.', l: 'av31' },
  Q('Un aparato a 3,3 V tiene el BOD a 4,3 V. ¿Qué hace al darle alimentación?', ['No arranca nunca: VCC siempre está por debajo del umbral y el BOD lo mantiene en reinicio', 'Arranca normal', 'Arranca y se reinicia cada segundo', 'Se quema'], 'El BOD retiene el chip en reinicio mientras VCC no supere el umbral. A 3,3 V con 8 MHz, el nivel adecuado es 2,7 V.', { c: 'av_reset', h: 'Compara la alimentación con el umbral del BOD.', l: 'av31' }),
  Q('Guardas un contador de rescates en .noinit. Tras quitar y poner las pilas vale 173, sin que haya habido ningún rescate. ¿Por qué y qué haces?', ['Tras un corte de alimentación .noinit tiene basura: si MCUSR indica PORF, ponlo a 0', 'Es un fallo de la Flash', 'Falta volatile', 'El BOD lo ha cambiado'], '.noinit sobrevive a los reinicios con tensión, no a quedarse sin ella. Mira la causa del arranque para saber si su valor sirve.', { c: 'av_sections', h: '¿Qué valor tiene la SRAM recién encendida?', l: 'av31' }),
  Q('Con wdt_enable(WDTO_1S), loop() se queda esperando un sensor que no responde. ¿Qué pasa?', ['Al cabo de 1 s el watchdog reinicia el chip, y al arrancar MCUSR tendrá WDRF a 1', 'Se queda colgado para siempre', 'El watchdog espera a que acabe loop()', 'Se apaga el watchdog'], 'Es justo para lo que sirve: nadie llama a wdt_reset() a tiempo y el chip se reinicia. WDRF te dice que ha sido él.', { c: 'av_wdt', h: '¿Quién llama a wdt_reset() mientras loop() está atascada?', l: 'av31' }),
  Nm('Duerme con 2 µA y cada 60 s despierta 50 ms gastando 8 mA. ¿Corriente media, en µA?', 8.67, 'µA', 'Despierto: 8000 µA × 0,05 s = 400 µA·s. Dormido: 2 µA × 59,95 s ≈ 120 µA·s. (400 + 120) / 60 ≈ 8,67 µA.', { tol: 0.1, c: 'av_sleep', h: 'Carga de cada parte en µA·s, sumadas y divididas entre el periodo.', l: 'av32' }),
  Nm('Con una media de unos 8,67 µA y una CR2032 de 220 mAh, ¿cuántos años dura (sin margen)?', 2.9, 'años', '220 / 0,00867 ≈ 25 400 h ≈ 2,9 años. Con un margen del 70–80 %, algo más de 2 años.', { tol: 0.1, c: 'av_sleep', h: 'Capacidad entre corriente media da horas; un año son 8760 h.', l: 'av32' }),
  Q('En ese aparato (2 µA dormido; 8 mA durante 50 ms cada minuto), ¿qué mejora más la autonomía?', ['Acortar el rato despierto o despertar menos a menudo', 'Bajar el sueño a 0,1 µA', 'Usar un cristal más rápido', 'Subir la tensión'], 'Despierto aporta 400 / 60 ≈ 6,7 µA de media y dormido, unos 2 µA: manda el rato despierto.', { c: 'av_sleep', h: 'Calcula la media de cada parte por separado.', l: 'av32' }),
  Nm('Una pila de 1000 mAh y un aparato de 50 µA de media. Contando solo con el 75 % de la capacidad, ¿cuántos años dura?', 1.71, 'años', '750 mAh / 0,05 mA = 15 000 h ≈ 1,71 años.', { tol: 0.05, c: 'av_sleep', h: 'Aplica el margen a la capacidad antes de dividir.', l: 'av32' }),
  TU('Con una pila de 1000 mAh, consigue más de 3 años.', 'av_sleep', sleepP(1000), { q: 'years', min: 3, max: 1e9, text: 'Objetivo: más de 3 años', hint: 'La media debe quedar por debajo de unos 38 µA.' }, '1000 mAh / (3 × 8760 h) ≈ 38 µA de media como mucho: sueño de pocos µA y ratos despierto cortos.', { c: 'av_sleep', h: 'Primero baja la corriente dormido; luego el tiempo despierto.', l: 'av32' }),
  Q('Una Nano con el 328P en power-down sigue gastando varios mA. ¿Lo más probable?', ['El regulador, el LED de encendido y el chip USB de la placa', 'El núcleo del 328P', 'El watchdog', 'La EEPROM'], 'Dormido, el 328P baja a µA; lo demás de la placa sigue gastando. Para pilas, el chip suelto o una placa mínima.', { c: 'av_leak', h: '¿Qué hay en la placa además del 328P?', l: 'av32' })
] };

  /* ===================== MÓDULO 7 · El chip fuera de la placa ===================== */
  const SV_FLASHMAP = `<svg viewBox="0 0 300 130" class="viz"><rect x="20" y="30" width="260" height="34" rx="4" fill="none" stroke="var(--line)"/>
    <rect x="20" y="30" width="150" height="34" fill="var(--ice)" opacity=".5"/><rect x="263" y="30" width="17" height="34" fill="var(--led)" opacity=".8"/>
    <text x="95" y="51" text-anchor="middle" class="vizsm">tu programa</text><text x="216" y="51" text-anchor="middle" class="vizsm">libre</text>
    <text x="20" y="22" class="vizsm">0x0000</text><text x="280" y="22" text-anchor="end" class="vizsm">0x7FFF</text>
    <path d="M271 64v14" stroke="var(--led)"/><text x="280" y="92" text-anchor="end" class="vizsm" style="fill:var(--led)">Optiboot: 512 bytes al final</text>
    <text x="20" y="118" class="vizsm">Tras un reset arranca el bootloader y luego salta a tu programa</text></svg>`;

  const M7 = { id: 'av-m7', title: 'El chip fuera de la placa', desc: 'Arduino en protoboard, fusibles, bootloader, programación ISP y el ATtiny85.', nodes: [
 L('av33', 'Arduino en protoboard', 'bb', ['av_bare', 'av_boot', 'av_fuse', 'av_dip'], [
  Q('Compras un ATmega328P suelto, lo montas con su cristal y le das a «Subir» con un adaptador USB–serie. ¿Crees que funcionará a la primera?', ['No: un chip nuevo viene sin bootloader y a 1 MHz', 'Sí, igual que una Uno', 'Solo si es la versión DIP', 'Solo con un cable más corto'], 'Antes hay que grabarle los fusibles y el bootloader con un programador.', { predict: true, c: 'av_boot', h: '¿Quién responde al IDE cuando subes un programa por USB?' }),
  { t: 'explore', text: 'Para montar el chip en una protoboard, primero localiza sus patas clave en el DIP-28.', viz: 'av_dip', params: { pata: pSl('Pata', 14, 1, 28), n: fx(28) },
    tasks: [{ q: 'p', min: 7, max: 7, text: 'Busca VCC', done: 'VCC es la 7 y GND la 8, juntas en el lado de abajo.', hint: 'Está en la fila de abajo, cerca del centro.' },
      { q: 'p', min: 20, max: 20, text: 'Busca AVCC', done: 'AVCC (20) alimenta el ADC y el puerto C: siempre a 5 V. A su lado, AREF (21) y otra GND (22).' },
      { q: 'p', min: 9, max: 9, text: 'Busca la primera pata del cristal', done: '9 y 10 son XTAL1 y XTAL2: el cristal entre las dos, con 22 pF de cada una a masa.' },
      { q: 'p', min: 1, max: 1, text: 'Y la pata de RESET', done: 'La 1: con 10 kΩ a VCC para que el ruido no la reinicie.' }] },
  I('Una Uno es, en el fondo, un 328P con su reloj, su reset y su alimentación. En protoboard necesitas:\n· VCC (7) y AVCC (20) a 5 V; GND (8 y 22) a masa.\n· 100 nF de desacoplo en cada pareja de alimentación.\n· 10 kΩ de RESET (1) a VCC.\n· Cristal de 16 MHz entre 9 y 10, con 22 pF de cada pata a masa.', { svg: SV_BARE }),
  I('Por qué cada pieza: los <b>100 nF</b> entregan los picos de corriente de cada flanco de reloj sin que caiga la tensión; la <b>pull-up de RESET</b> evita reinicios por ruido (RESET es activa a 0); los <b>22 pF</b> son la carga que el cristal necesita para oscilar a su frecuencia.', { code: '100 nF  → pegados a 7-8 y a 20-22\n10 kΩ   → de la pata 1 a 5 V\n22 pF   → de la 9 a masa y de la 10 a masa', more: 'El valor de los condensadores del cristal depende de la capacidad de carga que pida su hoja de datos; 22 pF es lo típico para cristales de 16 MHz.' }),
  { t: 'steps', text: 'Montaje paso a paso de un 328P en protoboard.', steps: ['Chip a caballo de la ranura central, muesca a la izquierda', 'VCC (7) y AVCC (20) a 5 V; GND (8 y 22) a masa; 100 nF en cada pareja', '10 kΩ de RESET (1) a VCC', 'Cristal de 16 MHz entre 9 y 10, con 22 pF de cada pata a masa', 'Mide 5 V entre 7 y 8 y entre 20 y 22 antes de programar nada'], result: 'Listo para grabarle el bootloader' },
  { t: 'order', q: 'Ordena un montaje seguro.', items: ['Chip a caballo de la ranura, muesca a la izquierda', 'Alimentación, masas y desacoplo', 'Pull-up de RESET', 'Cristal y sus condensadores', 'Medir tensiones antes de programar'], e: 'Primero lo que da vida al chip, luego el reloj.', c: 'av_bare', h: 'Lo primero es alimentar bien; lo último, comprobar.' },
  Q('¿Por qué conectar AVCC aunque no uses el ADC?', ['Alimenta también el puerto C: sin ella, PC0–PC5 no funcionan bien', 'Es opcional', 'Es para el cristal', 'Para el USB'], 'La hoja de datos pide AVCC conectada y cerca de VCC.', { c: 'av_bare', h: '¿Qué puerto depende de AVCC?' }),
  Q('¿Para qué sirven los dos condensadores de 22 pF del cristal?', ['Son la capacidad de carga que el cristal necesita para oscilar a su frecuencia', 'Desacoplo', 'Filtro de audio', 'Protección contra descargas'], 'El valor exacto depende del cristal.', { c: 'av_bare', h: 'Van de cada pata del cristal a masa.' }),
  Q('Un 328P nuevo, de fábrica, arranca…', ['Con el RC interno de 8 MHz dividido entre 8: a 1 MHz', 'A 16 MHz con cristal', 'A 20 MHz', 'Sin reloj'], 'Hasta que cambies los fusibles, ignora el cristal.', { c: 'av_fuse', h: 'Recuerda el fusible CKDIV8.' }),
  I('Para cargar por USB necesitas el <b>bootloader</b> grabado y un adaptador USB–serie (CH340, CP2102, FTDI) en RX/TX, más el <b>auto-reset</b>: la línea DTR, a través de 100 nF, da un pulso en RESET justo antes de cargar.', { code: 'Adaptador TX  → RXD, pata 2\nAdaptador RX  → TXD, pata 3\nAdaptador DTR → 100 nF → RESET, pata 1\n5 V y GND     → 7 y 8' }),
  { t: 'match', q: 'Une cada conexión del adaptador USB–serie.', pairs: [['TX del adaptador', 'RXD, pata 2'], ['RX del adaptador', 'TXD, pata 3'], ['DTR del adaptador', '100 nF a RESET (pata 1)'], ['D13 de Arduino', 'Pata 19 (PB5)']], c: 'av_boot', h: 'TX con RX; el DTR va al reset a través del condensador.' },
  Q('El IDE dice «not in sync» al cargar en tu Arduino de protoboard. Primer sospechoso:', ['No hay bootloader, o falla el auto-reset (el condensador de DTR)', 'Un cristal de 8 MHz', 'AVCC', 'El LED'], 'Sin bootloader nadie responde al IDE.', { c: 'av_boot', h: '¿Quién tendría que contestar al IDE?' }),
  Nm('¿En qué pata del DIP-28 está D2 (PD2)?', 4, '', 'Pata 1 RESET, 2 PD0, 3 PD1, 4 PD2.', { c: 'av_dip', h: 'Después de RESET (1) vienen PD0, PD1, PD2…' }),
  Q('¿Para qué un diodo entre RESET y VCC (cátodo a VCC)?', ['Evita que el pulso de DTR a través del condensador lleve RESET por encima de VCC', 'Es obligatorio para arrancar', 'Sirve de indicador', 'Invierte el reset'], 'La Uno también lo lleva.', { c: 'av_boot', h: 'Un condensador puede empujar la tensión por encima de la alimentación.' }),
  I('<b>Resumen</b>\n· Lo mínimo: VCC y AVCC, dos GND, 100 nF por pareja, 10 kΩ en RESET y cristal con 22 pF.\n· Un chip nuevo va a 1 MHz y sin bootloader: hay que grabárselo.\n· Para cargar por USB: TX↔RX y DTR por 100 nF a RESET.')
 ]),
 L('av34', 'Fusibles sin miedo', 'shield', ['av_fuse'], [
  Q('En los fusibles del AVR, ¿qué crees que significa un bit a 0?', ['Que esa opción está activa (programada)', 'Que está apagada', 'Que el chip está roto', 'Nada'], 'Es al revés de lo habitual: 0 = programado = activo.', { predict: true, c: 'av_fuse', h: 'Los fusibles vienen de la época en que «programar» era cerrar un contacto.' }),
  { t: 'explore', text: 'El fusible <b>low</b> bit a bit. Los bits a 0 (naranja) están programados. Empieza como viene de fábrica: 0x62.', viz: 'av_fuse', params: { div: L01('CKDIV8 (0 = divide entre 8)', 0), ckout: L01('CKOUT (0 = reloj por PB0)', 1), sut: pSl('SUT1:0', 2, 0, 3), cksel: { label: 'CKSEL3:0', val: 2, list: [0, 2, 3, 4, 6, 7, 15], dec: 0 } },
    tasks: [{ q: 'low', min: 226, max: 226, text: 'Quita la división entre 8 sin tocar nada más', done: '0xE2: RC interno a 8 MHz sin dividir. Lo usan muchos Arduino caseros sin cristal.', hint: 'CKDIV8 a 1.' },
      { q: 'low', min: 255, max: 255, text: 'Configura el de la Uno: cristal y sin dividir (0xFF)', done: 'CKSEL = 1111 (cristal de 8 a 16 MHz) y SUT = 11. Sin cristal en la placa, el chip no arrancaría.', hint: 'Todos los bits a 1.' },
      { q: 'low', min: 191, max: 191, text: 'Ahora saca el reloj por PB0 para verlo con el osciloscopio', done: 'CKOUT a 0: 0xBF. Muy útil para comprobar a qué frecuencia va el chip.', hint: 'Solo cambia CKOUT.' }] },
  I('Los <b>fusibles</b> son tres bytes de configuración que se graban con un programador y tu programa no puede cambiar:\n· <b>low</b>: el reloj (CKSEL, SUT, CKOUT, CKDIV8).\n· <b>high</b>: arranque y protecciones (BOOTRST, BOOTSZ, EESAVE, WDTON, SPIEN, DWEN, RSTDISBL).\n· <b>extended</b>: el BOD (BODLEVEL).', { code: 'Fusible   bits\nlow       CKDIV8 CKOUT SUT1 SUT0 CKSEL3 CKSEL2 CKSEL1 CKSEL0\nhigh      RSTDISBL DWEN SPIEN WDTON EESAVE BOOTSZ1 BOOTSZ0 BOOTRST\nextended  ... BODLEVEL2 BODLEVEL1 BODLEVEL0' }),
  I('Valores de la Uno: low <b>0xFF</b> (cristal, sin dividir), high <b>0xDE</b> (bootloader de 512 bytes, arranca en él, ISP activado) y extended <b>0xFD</b> (BOD a 2,7 V). De fábrica: 0x62, 0xD9 y 0xFF.', { code: 'avrdude -c usbasp -p m328p -U lfuse:w:0xFF:m -U hfuse:w:0xDE:m -U efuse:w:0xFD:m' }),
  { t: 'steps', text: 'El fusible high de la Uno vale 0xDE. ¿Qué dice?', steps: ['0xDE = <b>1101 1110</b>', 'Bit 0 (BOOTRST) = 0: programado → tras un reset arranca en el bootloader', 'Bits 2 y 1 (BOOTSZ) = 11: la sección de arranque más pequeña, 512 bytes', 'Bit 5 (SPIEN) = 0: ISP activado. Bit 7 (RSTDISBL) = 1: RESET sigue siendo RESET'], result: 'Bootloader de 512 bytes, ISP activado' },
  { t: 'match', q: 'Une cada grupo de fusibles con lo que controla.', pairs: [['CKSEL3:0 y SUT1:0', 'Fuente de reloj y tiempo de arranque'], ['CKDIV8', 'Dividir el reloj entre 8'], ['BOOTRST y BOOTSZ', 'Si arranca en el bootloader y su tamaño'], ['BODLEVEL', 'Umbral de baja tensión']], c: 'av_fuse', h: 'CK = reloj, BOOT = arranque, BOD = baja tensión.' },
  { t: 'bits', q: 'Fusible low para el RC interno de 8 MHz sin dividir: 0xE2. Márcalo.', n: 8, target: 226, e: '0xE2 = 1110 0010: CKDIV8 sin programar (1), CKOUT sin programar (1), SUT = 10 y CKSEL = 0010.', c: 'av_fuse', h: '0xE = 1110 y 0x2 = 0010.' },
  Q('High = 0xDE = 1101 1110. El bit 0 (BOOTRST) vale 0. Significa…', ['Programado: tras un reinicio salta al bootloader', 'Desactivado', 'Borra el chip', 'BOD apagado'], '0 = activo.', { c: 'av_fuse', h: 'Recuerda: en los fusibles, 0 = activo.' }),
  I('Fusibles que dan miedo:\n· <b>RSTDISBL</b> programado: RESET pasa a ser una E/S y el ISP deja de funcionar.\n· <b>SPIEN</b> sin programar: desactiva el ISP.\n· Un <b>CKSEL</b> de cristal o reloj externo sin él: el chip no arranca hasta que se lo des.\nLos dos primeros solo se arreglan con un programador de alta tensión; el tercero, poniendo el cristal.', { code: 'RSTDISBL = 0 → adiós ISP (alta tensión para volver)\nSPIEN    = 1 → adiós ISP (alta tensión para volver)\nCKSEL de cristal sin cristal → pon uno o inyecta reloj en XTAL1' }),
  Q('Grabas por error CKSEL para cristal y tu protoboard no lo tiene.', ['Pon un cristal (o inyecta un reloj en XTAL1) y podrás volver a programar por ISP', 'El chip ha muerto', 'Déjalo un día sin alimentación', 'Pulsa reset muchas veces'], 'Sin reloj no hay ISP, pero se recupera fácil.', { c: 'av_fuse', h: 'El chip no está roto: le falta lo que le has dicho que use.' }),
  Q('¿Qué fusible te deja sin ISP?', ['RSTDISBL programado', 'EESAVE', 'CKOUT', 'BODLEVEL'], 'Sin pata RESET no hay programación por SPI.', { c: 'av_fuse', h: 'El ISP necesita poder mantener RESET a 0.' }),
  Q('La opción «Grabar bootloader» del IDE…', ['También graba los fusibles de la placa elegida: revisa placa y reloj antes de pulsar', 'Es peligrosa siempre', 'No toca los fusibles', 'Borra solo la EEPROM'], 'Una placa equivocada puede dejar el chip esperando un cristal.', { c: 'av_fuse', h: '¿Cómo sabe el chip a qué reloj ir tras grabar el bootloader?' }),
  Q('EESAVE programado (0) sirve para…', ['Conservar la EEPROM al borrar el chip por ISP', 'Proteger la Flash', 'Ahorrar energía', 'Acelerar la EEPROM'], 'Útil para no perder calibraciones al reprogramar.', { c: 'av_fuse', h: 'EE + SAVE.' }),
  Q('¿Puede tu programa cambiar los fusibles?', ['No: puede leerlos, pero solo se graban con un programador', 'Sí, con un registro', 'Sí, con la EEPROM', 'Solo el bootloader'], 'Así un error de software no te deja el chip inservible.', { c: 'av_fuse', h: 'Piensa en por qué sería peligroso que pudiera.' }),
  I('<b>Resumen</b>\n· Tres bytes: low (reloj), high (arranque y protecciones), extended (BOD). <b>0 = programado</b>.\n· Uno: 0xFF, 0xDE, 0xFD. De fábrica: 1 MHz (CKDIV8).\n· Cuidado con RSTDISBL y SPIEN; un CKSEL equivocado se arregla poniendo el reloj que pide.')
 ]),
 L('av35', 'Bootloader y programación ISP', 'chip', ['av_isp', 'av_boot', 'av_dip'], [
  Q('Tu Uno tiene el bootloader estropeado y ya no acepta programas por USB. ¿Crees que la has perdido?', ['No: se puede reprogramar por ISP, que no necesita bootloader', 'Sí, para siempre', 'Solo si cambias el cristal', 'Solo con otro cable USB'], 'El ISP es la puerta principal: siempre está, aunque la Flash esté vacía.', { predict: true, c: 'av_isp', h: 'El bootloader no es la única forma de escribir la Flash.' }),
  { t: 'explore', text: 'El ISP usa el SPI del chip y su pata RESET. Localiza sus señales en el DIP-28.', viz: 'av_dip', params: { pata: pSl('Pata', 7, 1, 28), n: fx(28) },
    tasks: [{ q: 'p', min: 17, max: 17, text: 'Busca MOSI', done: 'MOSI = PB3, pata 17 (D11 en la Uno).', hint: 'El puerto B empieza en la pata 14.' },
      { q: 'p', min: 18, max: 18, text: 'Busca MISO', done: 'MISO = PB4, pata 18 (D12).' },
      { q: 'p', min: 19, max: 19, text: 'Busca SCK', done: 'SCK = PB5, pata 19 (D13).' },
      { q: 'p', min: 1, max: 1, text: 'Y RESET', done: 'Con RESET a 0, el chip escucha al programador por SPI.' }] },
  I('El <b>bootloader</b> (Optiboot en la Uno, 512 bytes al final de la Flash) se ejecuta tras un reset por la pata RESET, escucha el puerto serie un instante y, si llega un programa, lo graba él mismo. Si no llega nada, salta a tu código.', { svg: SV_FLASHMAP }),
  I('El <b>ISP</b> (In-System Programming) programa el chip directamente por SPI manteniendo RESET a 0: MOSI, MISO, SCK, RESET, VCC y GND. Escribe Flash, EEPROM y fusibles, no necesita bootloader… y lo borra si estaba.', { code: 'Conector ISP de 6 patas (visto desde arriba):\n MISO  1 ● ● 2  VCC\n SCK   3 ● ● 4  MOSI\n RESET 5 ● ● 6  GND' }),
  I('Programadores: <b>USBasp</b> (barato), <b>Arduino as ISP</b> (otra Uno con el ejemplo ArduinoISP) o herramientas comerciales. avrdude comprueba primero la <b>firma</b> del chip: 1E 95 0F es un ATmega328P.', { code: 'Arduino as ISP → chip de destino\nD10 → RESET (pata 1)\nD11 → MOSI  (pata 17)\nD12 → MISO  (pata 18)\nD13 → SCK   (pata 19)\n10 µF entre RESET y GND de la Uno programadora' }),
  { t: 'steps', text: 'Grabar el bootloader en un 328P nuevo con otra Uno.', steps: ['Carga el ejemplo ArduinoISP en la Uno que hará de programador', 'Conecta D10 → RESET (1), D11 → 17, D12 → 18 y D13 → 19, más 5 V y GND', 'Pon 10 µF entre RESET y GND de la Uno programadora', 'En el IDE: programador «Arduino as ISP» y «Grabar bootloader»', 'Se graban los fusibles (16 MHz, sin dividir) y Optiboot: ya puedes cargar por USB–serie'], result: 'Chip listo para usar como una Uno' },
  { t: 'match', q: 'Une cada señal ISP con su pata del DIP-28.', pairs: [['MISO', 'Pata 18 (PB4)'], ['SCK', 'Pata 19 (PB5)'], ['MOSI', 'Pata 17 (PB3)'], ['RESET', 'Pata 1 (PC6)']], c: 'av_dip', h: 'PB3, PB4 y PB5 son las patas 17, 18 y 19.' },
  Q('Cargas un programa en tu Uno con «Subir usando programador».', ['Funciona, pero borra el bootloader: ya no podrás subir por USB hasta volver a grabarlo', 'No funciona', 'Conserva el bootloader', 'Graba solo la EEPROM'], 'El ISP borra toda la Flash antes de escribir.', { c: 'av_isp', h: '¿Qué hace el ISP con la Flash antes de escribir?' }),
  Q('¿Para qué un condensador de 10 µF entre RESET y GND de la Uno que hace de Arduino as ISP?', ['Para que no se reinicie ella misma cuando avrdude abre el puerto', 'Para filtrar ruido', 'Para alimentar al destino', 'Para el cristal'], 'Así ignora el pulso del auto-reset.', { c: 'av_isp', h: 'Recuerda qué pasa al abrir el puerto serie de una Uno.' }),
  Q('avrdude lee la firma 0x1E 0x95 0x0F. Es un…', ['ATmega328P', 'ATmega328 (sin P)', 'ATtiny85', 'ATmega2560'], 'El 328 sin P da 1E 95 14 y el ATtiny85, 1E 93 0B.', { c: 'av_isp', h: 'Es la firma de la Uno.' }),
  Q('Un chip nuevo a 1 MHz no responde por ISP. ¿Qué pruebas?', ['Bajar la velocidad del ISP: SCK debe ser menor que 1/4 del reloj del chip', 'Subir la tensión', 'Cambiar el cristal', 'Borrar la EEPROM'], 'Con avrdude, la opción -B alarga el periodo de SCK.', { c: 'av_isp', h: 'Un chip a 1 MHz no puede seguir un SCK rápido.' }),
  Q('Al pulsar RESET, tu programa tarda un instante en empezar. Es…', ['El bootloader esperando por si llega un programa nuevo', 'Un fallo', 'El cristal arrancando', 'El BOD'], 'Optiboot espera tras un reset externo.', { c: 'av_boot', h: '¿Qué se ejecuta antes que tu programa?' }),
  Q('¿Ventaja de no llevar bootloader en un producto terminado?', ['Arranca al instante, recuperas 512 bytes y nadie lo reprograma por el puerto serie por accidente', 'Es más fácil de actualizar', 'Gasta más', 'Ninguna'], 'A cambio, para actualizar necesitas el programador.', { c: 'av_boot', h: 'Piensa en lo que hace el bootloader en cada arranque.' }),
  I('<b>Resumen</b>\n· Bootloader: 512 bytes al final de la Flash; tras un reset escucha el puerto serie.\n· ISP: SPI con RESET a 0; siempre disponible (si no tocas SPIEN ni RSTDISBL) y borra la Flash.\n· Arduino as ISP: D10 → RESET, D11–D13 → MOSI, MISO, SCK y 10 µF en su RESET.')
 ]),
 L('av36', 'ATtiny85: un AVR de 8 patas', 'ic', ['av_tiny', 'av_cycle', 'av_vmax', 'av_leak', 'av_fuse'], [
  Q('Un AVR de solo 8 patas. ¿Qué crees que le falta frente al 328P?', ['Puerto serie, SPI e I²C de hardware: tiene un bloque genérico', 'El ADC', 'Los temporizadores', 'La memoria Flash'], 'Tiene una USI con la que se emulan SPI e I²C; el puerto serie se hace por software.', { predict: true, c: 'av_tiny', h: 'Con tan pocas patas, algo hay que recortar.' }),
  { t: 'explore', text: 'El ATtiny85 en DIP-8. Mismo núcleo AVR, mucho más pequeño.', viz: 'av_dip', params: { pata: pSl('Pata', 2, 1, 8), n: fx(8) },
    tasks: [{ q: 'p', min: 8, max: 8, text: 'Busca VCC', done: 'VCC es la 8 y GND la 4, en esquinas opuestas.' },
      { q: 'p', min: 5, max: 5, text: 'Busca PB0', done: 'PB0 es la pata 5: también MOSI, SDA y OC0A.' },
      { q: 'p', min: 1, max: 1, text: 'Busca RESET', done: 'PB5/RESET: usarla como E/S exige un fusible que te deja sin ISP.' }] },
  I('El <b>ATtiny85</b>: 8 KB de Flash, 512 bytes de SRAM y 512 de EEPROM, hasta 6 E/S (PB0–PB5, aunque PB5 es RESET), dos temporizadores de 8 bits, ADC de 10 bits y RC interno de 8 MHz. Sin USART, SPI ni TWI de hardware: una <b>USI</b> genérica.', { code: '             ATtiny85   ATmega328P\nFlash        8 KB       32 KB\nSRAM         512 B      2 KB\nE/S          6          23\nUSART        no         sí\nSPI / I²C    USI        sí' }),
  I('Se programa por ISP (Arduino as ISP o USBasp) y, en el IDE, con un núcleo como ATTinyCore. Tu C con registros funciona casi igual, pero cambian algunos nombres: el watchdog es <b>WDTCR</b> y las interrupciones externas se activan en <b>GIMSK</b>.', { code: '#include <avr/io.h>\n#include <util/delay.h>\n\nint main(void) {\n  DDRB |= (1 << PB0);          // pata 5 como salida\n  for (;;) {\n    PINB = (1 << PB0);         // también conmuta en el ATtiny85\n    _delay_ms(500);\n  }\n}' }),
  { t: 'steps', text: '¿Puedes alimentar un ATtiny85 a 8 MHz con una pila CR2032?', steps: ['El ATtiny85 normal funciona de 2,7 a 5,5 V, hasta 10 MHz desde 2,7 V', 'A 8 MHz le basta con 2,7 V', 'Una CR2032 da unos 3 V y baja al gastarse', 'Funciona mientras la pila esté por encima de 2,7 V; para apurarla, el ATtiny85V llega a 1,8 V a 4 MHz o menos'], result: 'Sí, hasta que la pila baje de 2,7 V' },
  { t: 'match', q: 'Une cada pata del ATtiny85.', pairs: [['Pata 1', 'PB5 / RESET'], ['Pata 4', 'GND'], ['Pata 8', 'VCC'], ['Pata 5', 'PB0 (MOSI, OC0A)']], c: 'av_tiny', h: 'VCC y GND están en esquinas opuestas.' },
  Q('¿Qué le falta al ATtiny85 frente al 328P?', ['USART, SPI y TWI de hardware: tiene una USI genérica con la que se emulan', 'El ADC', 'Los temporizadores', 'Las interrupciones'], 'La USI hace SPI e I²C con ayuda del software.', { c: 'av_tiny', h: 'Busca los periféricos de comunicación.' }),
  Q('Tu código del 328P usa Serial. En el ATtiny85…', ['No hay USART: el núcleo ofrece una serie por software, más limitada', 'Funciona igual', 'Nunca compila', 'Va más rápido'], 'Sin hardware, todo lo hace la CPU.', { c: 'av_tiny', h: '¿Tiene USART de hardware?' }),
  Q('Consumo del ATtiny85 en power-down con el watchdog apagado:', ['Del orden de 0,1 µA, como el 328P', '10 mA', '1 mA', '100 µA'], 'Ideal para pilas de botón.', { c: 'av_leak', h: 'Mismo núcleo AVR, mismo sueño profundo.' }),
  Nm('ATtiny85 a 1 MHz: ¿cuántos ciclos de reloj hay en un milisegundo?', 1000, 'ciclos', '1 000 000 × 0,001.', { c: 'av_cycle', h: 'Ciclos por segundo por la fracción de segundo.' }),
  Q('¿Puedes alimentar un ATtiny85 a 8 MHz con una CR2032?', ['Sí, mientras la pila esté por encima de 2,7 V; para apurarla, el ATtiny85V llega a 1,8 V a 4 MHz o menos', 'No, nunca a 3 V', 'Solo a 20 MHz', 'Solo con regulador'], 'El ATtiny85 normal pide 2,7 V como mínimo.', { c: 'av_vmax', h: 'Recuerda hasta dónde baja la versión normal.' }),
  Q('Quieres usar PB5 (RESET) como E/S.', ['Fusible RSTDISBL: perderás el ISP y solo un programador de alta tensión lo recupera', 'Basta con DDRB', 'Es imposible', 'Con el bootloader'], 'Hazlo solo con el programa definitivo.', { c: 'av_fuse', h: '¿Qué fusible convierte RESET en E/S?' }),
  I('<b>Resumen</b>\n· ATtiny85: 8 patas, 8 KB, mismo núcleo AVR; sin USART, SPI ni TWI de hardware (USI).\n· VCC = 8, GND = 4, RESET = 1, PB0 = 5.\n· Por ISP y con algunos registros con otro nombre (WDTCR, GIMSK).')
 ]),
 SIM('av-s6', 'Reto: las patas del ISP', 'El semáforo usa D10, D11 y D12: PB2, PB3 y PB4, que son SS, MOSI y MISO, las mismas patas del ISP. Monta las tres luces en esas patas de la Nano, cada una con su resistencia.', { arduino: 'semaforo', board: 'nano', parts: ['res', 'led'], code: true, hint: 'Rojo en D12 (PB4), ámbar en D11 (PB3) y verde en D10 (PB2), cada uno con su resistencia a GND.' }, 'av_isp3'),
 PRJ('av-p14', 'Proyecto: Arduino casero en protoboard', 'av_proto'),
 PRJ('av-p15', 'Proyecto: llavero luciérnaga con ATtiny85', 'av_tiny')
], exam: [
  Q('Tu 328P de protoboard va a usar el RC interno de 8 MHz (fusible low 0xE2). ¿Qué piezas te puedes ahorrar?', ['El cristal y sus dos condensadores de 22 pF', 'La pull-up de RESET', 'Los 100 nF de desacoplo', 'La conexión de AVCC'], 'Con el reloj interno, las patas 9 y 10 quedan libres (son PB6 y PB7). Todo lo demás sigue haciendo falta.', { c: 'av_bare', h: '¿Qué piezas solo sirven para el reloj?', l: 'av33' }),
  Q('Tu Arduino de protoboard se reinicia cada vez que conmuta un relé cercano. ¿Qué revisas primero?', ['Los 100 nF de desacoplo: que estén y pegados a cada pareja de alimentación', 'El bootloader', 'Los fusibles', 'El valor del cristal'], 'Los picos de corriente hunden la alimentación del chip si no tiene condensadores cerca que los entreguen.', { c: 'av_bare', h: '¿Qué pieza entrega los picos de corriente sin que caiga la tensión?', l: 'av33' }),
  Nm('¿En qué pata del DIP-28 está A0 (PC0)?', 23, '', 'El puerto C ocupa las patas 23 a 28: PC0 es la 23, justo después de GND (22).', { c: 'av_dip', h: 'AVCC es la 20, AREF la 21 y GND la 22.', l: 'av33' }),
  Q('Cargas por USB–serie: falla con «not in sync», pero si pulsas RESET justo al empezar, funciona. ¿Qué falla?', ['El auto-reset: el condensador de 100 nF entre DTR y RESET', 'No hay bootloader', 'El cristal', 'TX y RX están cruzados'], 'El bootloader está, porque contesta si reinicias a mano. Lo que no llega es el pulso de reset automático por DTR.', { c: 'av_boot', h: 'Pulsar RESET a mano funciona: ¿qué sustituye ese gesto?', l: 'av33' }),
  { t: 'match', q: 'Une cada pieza del Arduino de protoboard con su papel.', pairs: [['Resistencia de 10 kΩ', 'Sujetar RESET a 1'], ['Dos condensadores de 22 pF', 'Carga del cristal'], ['Condensadores de 100 nF junto al chip', 'Entregar los picos de corriente'], ['Condensador de 100 nF desde DTR', 'Reiniciar el chip al empezar a cargar']], c: 'av_bare', h: 'Piensa en para qué sirve cada una: reset, reloj, alimentación o carga por serie.', l: 'av33' },
  Q('Fusible low = 0x7F en una placa con cristal de 16 MHz. ¿Qué cambia respecto a 0xFF?', ['CKDIV8 queda programado: el chip va a 2 MHz', 'Nada', 'Saca el reloj por PB0', 'Pasa a usar el RC interno'], '0x7F = 0111 1111: solo el bit 7 (CKDIV8) está a 0, es decir, programado. 16 MHz / 8 = 2 MHz.', { c: 'av_fuse', h: 'Busca qué bit es distinto y recuerda que 0 = programado.', l: 'av34' }),
  { t: 'bits', q: 'Fusible low: RC interno de 8 MHz (CKSEL = 0010, SUT = 10), dividido entre 8 y con el reloj saliendo por PB0.', n: 8, target: 34, e: 'CKDIV8 = 0 y CKOUT = 0 (los dos programados), SUT = 10 y CKSEL = 0010: 0010 0010 = 0x22 = 34.', c: 'av_fuse', h: 'Programado = 0: CKDIV8 y CKOUT van a 0.', l: 'av34' },
  Q('Una Uno con el fusible high a 0xDF en lugar de 0xDE. ¿Qué notarás?', ['Tras un reset arranca directamente tu programa: el bootloader no se ejecuta y no puedes cargar por USB', 'Nada', 'Pierdes el ISP', 'El chip va a 1 MHz'], '0xDF solo cambia el bit 0, BOOTRST, que pasa a 1 (sin programar): el chip empieza en la dirección 0, no en el bootloader.', { c: 'av_fuse', h: '¿Qué bit separa 0xDE de 0xDF y qué hace?', l: 'av34' }),
  Q('Alguien te pasa la orden avrdude ... -U hfuse:w:0x5E:m para tu 328P. ¿La ejecutas?', ['No: 0x5E programa RSTDISBL; RESET dejaría de existir y perderías el ISP', 'Sí: es el valor de la Uno', 'Sí: solo cambia el bootloader', 'Da igual'], '0x5E = 0101 1110: igual que 0xDE salvo el bit 7 (RSTDISBL) a 0. Solo un programador de alta tensión lo deshace.', { c: 'av_fuse', h: 'Compara 0x5E con 0xDE bit a bit.', l: 'av34' }),
  Q('Grabas el bootloader con la placa «Uno» seleccionada en un chip de protoboard sin cristal. Ahora no responde ni por ISP. ¿Qué haces?', ['Poner un cristal de 16 MHz con sus 22 pF (o inyectar reloj en XTAL1) y volver a grabar los fusibles que quieras', 'Tirarlo: está muerto', 'Pulsar RESET muchas veces', 'Borrar la EEPROM'], 'Los fusibles de la Uno piden cristal: sin él no hay reloj, y sin reloj no hay ISP. Con el cristal puesto vuelve a responder.', { c: 'av_fuse', h: '¿Qué le has dicho al chip que use como reloj?', l: 'av34' }),
  Q('Programas por ISP una placa donde un sensor SPI comparte MOSI, MISO y SCK, y a veces falla. ¿Por qué?', ['El sensor puede responder en MISO o cargar las líneas: su CS debe quedar inactivo (con pull-up) mientras programas', 'El ISP no usa esas patas', 'Falta el bootloader', 'El cristal es demasiado rápido'], 'El ISP usa las mismas patas que el SPI. Un esclavo con su CS sin sujetar puede creerse elegido y hablar a la vez.', { c: 'av_isp', h: 'El ISP y el SPI comparten patas.', l: 'av35' }),
  Q('avrdude lee la firma 0x000000 y se niega a seguir. ¿Qué compruebas?', ['Cableado, alimentación del chip, que tenga reloj y la velocidad del ISP', 'Que el bootloader esté bien', 'Que la EEPROM esté vacía', 'Nada: el chip está muerto'], 'Una firma de ceros significa que el chip no contesta: sin alimentación, sin reloj, mal cableado o con un SCK demasiado rápido.', { c: 'av_isp', h: 'Antes de culpar al chip, repasa lo que necesita para contestar.', l: 'av35' }),
  Nm('Un chip va a 1 MHz y el SCK del ISP debe ser menor que 1/4 de su reloj. ¿Frecuencia máxima de SCK, en kHz?', 250, 'kHz', '1 MHz / 4 = 250 kHz; en la práctica, algo menos (con avrdude, la opción -B).', { c: 'av_isp', h: 'Divide el reloj del chip entre 4.', l: 'av35' }),
  Nm('Con Optiboot (512 bytes) en un 328P, ¿cuántos bytes de Flash quedan para tu programa?', 32256, 'bytes', '32 768 − 512 = 32 256.', { c: 'av_boot', h: 'La Flash del 328P son 32 KB = 32 768 bytes.', l: 'av35' }),
  { t: 'match', q: 'Une cada pin de la Uno que hace de Arduino as ISP con su destino en el chip.', pairs: [['D10', 'RESET (pata 1)'], ['D11', 'MOSI (pata 17)'], ['D12', 'MISO (pata 18)'], ['D13', 'SCK (pata 19)']], c: 'av_isp', h: 'D11, D12 y D13 son el SPI de la programadora; D10 controla el reset.', l: 'av35' },
  Q('Un proyecto necesita 8 entradas y salidas y un puerto serie de hardware. ¿Te sirve un ATtiny85?', ['No: tiene como mucho 6 E/S (5 sin perder RESET) y no tiene USART', 'Sí, sobra', 'Sí, con la USI como USART de hardware', 'Solo a 1 MHz'], 'El ATtiny85 recorta patas y periféricos: para eso, mejor el 328P.', { c: 'av_tiny', h: 'Cuenta sus E/S y repasa qué periféricos tiene.', l: 'av36' }),
  Q('Llevas tu código de registros del 328P al ATtiny85 y falla al compilar la línea de WDTCSR. ¿Por qué?', ['En el ATtiny85 ese registro se llama WDTCR', 'El ATtiny85 no tiene watchdog', 'Falta avr/io.h', 'WDTCSR solo existe en Arduino'], 'Mismo núcleo, pero algunos registros cambian de nombre: WDTCR para el watchdog y GIMSK para las interrupciones externas.', { c: 'av_tiny', h: 'Recuerda qué nombres cambian en el ATtiny85.', l: 'av36' }),
  Nm('ATtiny85 a 8 MHz con un bucle de 4 ciclos por vuelta. ¿Cuántas vueltas da en 1 ms?', 2000, 'vueltas', '8 MHz × 1 ms = 8000 ciclos; 8000 / 4 = 2000 vueltas.', { c: 'av_cycle', h: 'Ciclos en 1 ms entre ciclos por vuelta.', l: 'av36' }),
  Q('¿Puede un ATtiny85 ir a 16 MHz alimentado con una CR2032 (unos 3 V)?', ['No: a 3 V la recta permite unos 11–12 MHz; 16 MHz pide cerca de 3,8 V', 'Sí, sin problema', 'Sí, si duerme mucho', 'Solo con el RC interno'], 'Como el 328P: 10 MHz desde 2,7 V y 20 MHz desde 4,5 V, con una recta entre medias.', { c: 'av_vmax', h: 'Sitúa 3 V en la recta entre 2,7 V (10 MHz) y 4,5 V (20 MHz).', l: 'av36' }),
  Q('Un llavero con ATtiny85 y CR2032 duerme en power-down entre destellos y lo despierta el watchdog. Mientras duerme, ¿qué gasta más?', ['El watchdog: unos pocos µA, frente a décimas de µA del núcleo', 'El núcleo dormido', 'La EEPROM', 'El ADC, aunque esté apagado'], 'Con todo lo demás apagado, el despertador es lo que más pesa en el sueño.', { c: 'av_leak', h: '¿Qué sigue encendido para poder despertarlo?', l: 'av36' })
] };

  /* ===================== MÓDULO 8 · Herramientas de profesional ===================== */
  const SV_CHAIN = `<svg viewBox="0 0 300 150" class="viz">${[['main.c', 10, 'var(--ice)'], ['main.elf', 112, 'var(--led)'], ['main.hex', 214, 'var(--ok)']].map(([t, x, c]) => `<rect x="${x}" y="26" width="76" height="30" rx="6" fill="${c}" fill-opacity=".2" stroke="${c}"/><text x="${x + 38}" y="45" text-anchor="middle" class="vizlab">${t}</text>`).join('')}
    <path d="M86 41h26M188 41h26" stroke="currentColor" stroke-width="1.8" class="a-flow"/><text x="99" y="74" text-anchor="middle" class="vizsm">avr-gcc</text><text x="201" y="74" text-anchor="middle" class="vizsm">avr-objcopy</text>
    <path d="M252 56v34" stroke="currentColor" stroke-width="1.8" class="a-flow"/><text x="246" y="78" text-anchor="end" class="vizsm">avrdude</text>
    <rect x="214" y="90" width="76" height="30" rx="6" fill="#2B3240" stroke="var(--muted)" stroke-width="1"/><text x="252" y="109" text-anchor="middle" class="vizsm" style="fill:#fff">chip</text>
    <text x="10" y="96" class="vizsm">.elf: código, símbolos y depuración</text><text x="10" y="112" class="vizsm">.hex: solo lo que se graba</text><text x="10" y="140" class="vizsm">El IDE de Arduino hace exactamente esto por debajo</text></svg>`;

  const M8 = { id: 'av-m8', title: 'Herramientas de profesional', desc: 'avr-gcc y avrdude sin IDE, Makefile, .map y .lst, ensamblador y depuración sin depurador.', nodes: [
 L('av37', 'avr-gcc y avrdude sin IDE', 'code', ['av_tool', 'av_fcpu', 'av_pinmap', 'av_sections'], [
  Q('Al pulsar «Subir» en el IDE de Arduino, ¿crees que el IDE graba tu sketch tal cual en el chip?', ['No: lo compila con avr-gcc, extrae un .hex y lo graba con avrdude', 'Sí, tal cual', 'Lo manda a un servidor', 'Lo interpreta el chip línea a línea'], 'Detrás del botón hay una cadena de herramientas que puedes usar tú.', { predict: true, c: 'av_tool', h: 'El chip solo entiende instrucciones de máquina.' }),
  { t: 'explore', text: 'Sin IDE, la frecuencia se la dices al compilador con -DF_CPU. Si no coincide con el reloj real, los retardos calculados al compilar salen mal.', viz: 'av_fcpu', params: { fd: { label: 'F_CPU (-DF_CPU)', val: 16, list: [1, 8, 16], unit: 'MHz', dec: 0 }, fr: { label: 'Reloj real', val: 16, list: [1, 8, 16], unit: 'MHz', dec: 0 } },
    tasks: [{ q: 't', min: 0.49, max: 0.51, text: 'Compila con -DF_CPU=8000000UL para un chip a 16 MHz', done: '_delay_ms(1000) dura medio segundo: cuenta los ciclos de 8 MHz, que a 16 MHz pasan el doble de rápido.', hint: 'F_CPU a 8 y reloj real a 16.' },
      { q: 't', min: 15.9, max: 16.1, text: 'Ahora un chip nuevo de fábrica con -DF_CPU=16000000UL', done: 'Dura 16 s: el chip va a 1 MHz. Graba los fusibles o compila con 1000000UL.', hint: 'Un chip nuevo va a 1 MHz.' }] },
  I('El IDE esconde una cadena de herramientas: <b>avr-gcc</b> compila y enlaza en un .elf, <b>avr-objcopy</b> extrae el .hex y <b>avrdude</b> lo graba. Puedes usarlas tú desde la terminal, con control total.', { svg: SV_CHAIN }),
  I('Las cuatro órdenes básicas:', { code: 'avr-gcc -mmcu=atmega328p -DF_CPU=16000000UL -Os -Wall -o main.elf main.c\navr-objcopy -O ihex -R .eeprom main.elf main.hex\navr-size main.elf\navrdude -c arduino -p m328p -P COM5 -b 115200 -U flash:w:main.hex:i' }),
  { t: 'steps', text: 'Descifra la orden de avrdude de arriba.', steps: ['<b>-c arduino</b>: el programador es el bootloader de la Uno', '<b>-p m328p</b>: el chip, un ATmega328P', '<b>-P COM5 -b 115200</b>: puerto serie y velocidad del bootloader', '<b>-U flash:w:main.hex:i</b>: escribe (w) la Flash con main.hex, en formato Intel HEX (i)'], result: 'Graba main.hex por el bootloader de la Uno' },
  { t: 'order', q: 'Ordena el flujo de trabajo.', items: ['Escribir main.c', 'Compilar y enlazar en main.elf', 'Extraer main.hex', 'Grabar con avrdude', 'Comprobar que funciona'], e: 'El .elf lo tiene todo; el .hex, solo lo que se graba.', c: 'av_tool', h: 'Del código fuente al chip, pasando por el .elf y el .hex.' },
  Q('¿Qué indica -mmcu=atmega328p?', ['Para qué chip compilar: registros, memorias y vectores', 'La velocidad', 'El puerto COM', 'El programador'], 'Con otro valor, los nombres de registros cambian.', { c: 'av_tool', h: 'MCU = microcontrolador.' }),
  Q('¿Y -DF_CPU=16000000UL?', ['Define la frecuencia para que _delay_ms y los cálculos de baudios cuadren', 'Cambia el cristal', 'Graba los fusibles', 'Nada'], 'Es solo una constante para el compilador.', { c: 'av_fcpu', h: '-D define una constante.' }),
  { t: 'match', q: 'Une cada opción de avrdude con su significado.', pairs: [['-c arduino', 'Bootloader de la Uno'], ['-c usbasp', 'Programador USBasp'], ['-c stk500v1 -b 19200', 'Arduino as ISP'], ['-U lfuse:w:0xFF:m', 'Escribe el fusible low']], c: 'av_tool', h: '-c es el programador; -U, la operación.' },
  I('Un main() de AVR no tiene setup() ni loop(): inicializas y entras tú en un bucle infinito. Sin la capa de Arduino no hay millis()… salvo que lo programes con un temporizador, que ya sabes hacer.', { code: '#include <avr/io.h>\n#include <util/delay.h>\n\nint main(void) {\n  DDRB |= (1 << PB0);\n  for (;;) {\n    PINB = (1 << PB0);\n    _delay_ms(250);\n  }\n}' }),
  { t: 'pin', q: '¿Qué pin de la Uno parpadea con ese programa?', code: 'DDRB |= (1 << PB0);\nfor (;;) {\n  PINB = (1 << PB0);\n  _delay_ms(250);\n}', a: 'D8', e: 'PB0 = D8.', c: 'av_pinmap', h: 'Puerto B: suma 8 al número de bit.' },
  Q('_delay_ms(n) con una variable n en lugar de una constante…', ['Da error o un retardo erróneo: necesita una constante; en un bucle, llama a _delay_ms(1) n veces', 'Funciona igual', 'Es más rápido', 'Hace el retardo en segundos'], 'El retardo se calcula al compilar.', { c: 'av_fcpu', h: '¿Cuándo se convierte el tiempo en vueltas de bucle?' }),
  Q('¿Qué muestra avr-size?', ['Cuánto ocupan .text, .data y .bss', 'Reduce el programa', 'Graba el chip', 'Cuenta líneas de código'], 'Lo usarás a fondo en la siguiente lección.', { c: 'av_sections', h: 'Size = tamaño.' }),
  I('<b>Resumen</b>\n· .c → avr-gcc → .elf → avr-objcopy → .hex → avrdude → chip.\n· -mmcu elige el chip y -DF_CPU la frecuencia; en avrdude, -c programador, -p chip, -U operación.\n· Sin Arduino: main() con su bucle infinito.')
 ]),
 L('av38', 'Makefile, .map y .lst', 'code', ['av_make', 'av_sections', 'av_mem'], [
  Q('Tu proyecto tiene 10 archivos .c y cambias uno. ¿Crees que hace falta recompilarlos todos?', ['No: basta recompilar ese y volver a enlazar', 'Sí, siempre', 'No hace falta ni enlazar', 'Depende del cristal'], 'make compara fechas y rehace solo lo necesario.', { predict: true, c: 'av_make', h: 'Los demás .o no han cambiado.' }),
  { t: 'explore', text: 'Lo que dice avr-size de tu programa. <b>text</b>: código y constantes; <b>data</b>: globales con valor inicial; <b>bss</b>: globales a cero.', viz: 'av_size', params: { text: pSl('text', 4200, 0, 32800, 100, 'B'), data: pSl('data', 100, 0, 1000, 10, 'B'), bss: pSl('bss', 400, 0, 1500, 10, 'B') },
    tasks: [{ q: 'free', min: -1e9, max: 299, text: 'Deja menos de 300 bytes para pila y montón', done: 'data y bss gastan SRAM; text no.', hint: 'Sube data o bss.' },
      { q: 'flash', min: 32257, max: 1e9, text: 'Ahora pásate de la Flash disponible', done: 'Con el bootloader quedan 32 256 bytes; text + data no pueden pasar de ahí.', hint: 'Sube text casi al máximo.' }] },
  I('Un <b>Makefile</b> guarda las órdenes y solo recompila lo que ha cambiado: make compara las fechas de cada archivo con las de sus dependencias. Escribes make y make flash. Cada orden empieza por un <b>tabulador</b>.', { code: 'MCU    = atmega328p\nCFLAGS = -mmcu=$(MCU) -DF_CPU=16000000UL -Os -Wall\nOBJ    = main.o pantalla.o\n\nmain.hex: main.elf\n\tavr-objcopy -O ihex -R .eeprom main.elf main.hex\n\nmain.elf: $(OBJ)\n\tavr-gcc -mmcu=$(MCU) -o $@ $^\n\n%.o: %.c\n\tavr-gcc $(CFLAGS) -c $< -o $@\n\nflash: main.hex\n\tavrdude -c arduino -p m328p -P COM5 -b 115200 -U flash:w:main.hex:i' }),
  I('<b>avr-size</b>: text = código y constantes en Flash; data = variables con valor inicial (ocupan Flash y SRAM); bss = variables a cero (solo SRAM).\nFlash usada = text + data. SRAM estática = data + bss.', { code: '$ avr-size main.elf\n   text    data     bss     dec     hex filename\n   4210      86     412    4708    1264 main.elf' }),
  { t: 'steps', text: 'Con ese avr-size, ¿cuánta Flash y cuánta SRAM usa el programa?', steps: ['Flash usada = text + data = 4210 + 86 = <b>4296 bytes</b>', 'SRAM estática = data + bss = 86 + 412 = <b>498 bytes</b>', 'Para pila y montón quedan 2048 − 498 = <b>1550 bytes</b>', 'data cuenta dos veces: su valor inicial vive en la Flash y la variable, en la SRAM'], result: '4296 bytes de Flash y 498 de SRAM' },
  Nm('avr-size: text 3000, data 200, bss 500. ¿SRAM estática, en bytes?', 700, 'bytes', '200 + 500.', { c: 'av_sections', h: 'SRAM = data + bss.' }),
  Nm('¿Y Flash usada?', 3200, 'bytes', '3000 + 200: los valores iniciales de .data también viven en la Flash.', { c: 'av_sections', h: 'Flash = text + data.' }),
  Q('Cambias solo pantalla.c y ejecutas make…', ['Recompila pantalla.o y vuelve a enlazar: no toca los demás .o', 'Recompila todo', 'No hace nada', 'Borra el .hex'], 'make compara fechas de archivos.', { c: 'av_make', h: '¿Qué archivos dependen de pantalla.c?' }),
  I('El <b>.map</b> (con -Wl,-Map=main.map) dice dónde ha ido cada función y variable y cuánto ocupa: así encuentras quién se come la RAM. El <b>.lst</b> mezcla tu C con el ensamblador generado.', { code: 'avr-gcc ... -Wl,-Map=main.map -o main.elf main.c   # mapa de memoria\navr-objdump -d -S main.elf > main.lst                # C + ensamblador\n\n# para quitar lo que nadie usa:\nCFLAGS += -ffunction-sections -fdata-sections\nLDFLAGS += -Wl,--gc-sections' }),
  Q('-ffunction-sections -fdata-sections junto con -Wl,--gc-sections…', ['Pone cada función en su sección y el enlazador elimina las que nadie usa', 'Hace el código más rápido', 'Activa la depuración', 'Rompe el bootloader'], 'Arduino lo hace por ti.', { c: 'av_make', h: 'gc = recolector de basura.' }),
  Q('En el .map ves una tabla de 600 bytes en .data. ¿Arreglo?', ['Hacerla const y PROGMEM: pasa a la Flash y libera 600 bytes de SRAM', 'Hacerla volatile', 'Hacerla static', 'Nada'], 'Las constantes no necesitan RAM.', { c: 'av_mem', h: '¿Cómo se queda una tabla solo en la Flash?' }),
  Q('-Os frente a -O2 en AVR:', ['-Os prioriza el tamaño, lo habitual con poca Flash; -O2 puede ir algo más rápido pero ocupa más', '-O2 siempre ocupa menos', 'Son iguales', '-Os desactiva la optimización'], 'Arduino compila con -Os.', { c: 'av_make', h: 'La s es de size.' }),
  Q('En un Makefile, la línea de la orden debe empezar por…', ['Un tabulador', 'Cuatro espacios', 'Un punto y coma', 'Nada en especial'], 'El error «missing separator» suele ser esto.', { c: 'av_make', h: 'Espacios y tabuladores no son lo mismo para make.' }),
  I('<b>Resumen</b>\n· make rehace solo lo que ha cambiado; las órdenes, tras un tabulador.\n· avr-size: Flash = text + data; SRAM = data + bss.\n· .map dice quién ocupa qué; .lst, qué ensamblador sale; --gc-sections quita lo que sobra.')
 ]),
 L('av39', 'Ensamblador AVR para leerlo', 'code', ['av_asm', 'av_cycle', 'av_isrcost', 'av_8bit'], [
  Q('Un bucle en ensamblador hace ldi r24, 50 y luego dec r24 / brne hasta llegar a 0. ¿Cuántos ciclos crees que tarda?', ['150', '50', '100', '51'], 'Tres ciclos por vuelta: dec (1) y brne (2), salvo la última.', { predict: true, c: 'av_cycle', h: 'Cada vuelta tiene dos instrucciones y una de ellas es un salto.' }),
  { t: 'explore', text: 'El bucle de retardo más sencillo: cargar n en un registro, restarle 1 y saltar mientras no sea 0.', viz: 'av_loop', params: { n: pSl('n (valor inicial de r24)', 10, 1, 255), f: { label: 'Reloj', val: 16, list: [1, 8, 16, 20], unit: 'MHz', dec: 0 } },
    tasks: [{ q: 'cyc', min: 150, max: 150, text: 'Consigue 150 ciclos', done: 'n = 50: tres ciclos por vuelta.', hint: '150 / 3.' },
      { q: 't', min: 9.9, max: 10.1, text: 'Haz que dure unos 10 µs', done: 'A 16 MHz, n = 53 da 9,94 µs; a 20 MHz, n = 67 da 10,05 µs.', hint: '10 µs a 16 MHz son 160 ciclos.' }] },
  I('No hace falta escribir ensamblador, pero leerlo en el .lst te dice qué hace de verdad tu C. Las instrucciones más comunes:', { code: 'ldi   r24, 0x20   ; carga una constante\nmov   r24, r25    ; copia un registro\nadd / sub / and / or / eor   ; ALU\nin / out          ; leer y escribir E/S\nlds / sts         ; leer y escribir la SRAM\nsbi / cbi         ; un bit de E/S a 1 o a 0\nsbis / sbic       ; salta si un bit de E/S está a 1 / a 0\nrjmp / rcall / ret   ; saltos y llamadas\nbrne / breq       ; salta si no fue cero / si fue cero' }),
  I('Cada registro de E/S tiene dos direcciones: in, out, sbi y cbi usan la de <b>E/S</b>; lds y sts, la de <b>datos</b>, que es 0x20 más. sbi y cbi solo llegan a las E/S 0x00–0x1F: los puertos sí; TCCR1B (datos 0x81), no.', { code: '          E/S    datos\nPINB      0x03   0x23\nDDRB      0x04   0x24\nPORTB     0x05   0x25\nPIND      0x09   0x29\nTCCR1B    —      0x81   ← sin sbi: lds, ori, sts' }),
  { t: 'steps', text: 'Cuenta los ciclos del bucle con n = 50.', steps: ['ldi r24, 50: una vez, 1 ciclo', 'dec r24: 50 veces, 1 ciclo cada una = 50', 'brne salta 49 veces (2 ciclos) = 98, y la última no salta (1 ciclo)', 'Total: 1 + 50 + 98 + 1 = <b>150 ciclos</b>, es decir, 3n'], result: '150 ciclos: a 16 MHz, 9,375 µs' },
  { t: 'match', q: 'Une cada instrucción con lo que hace.', pairs: [['ldi r24, 0x20', 'Carga 0x20 en r24'], ['out 0x05, r24', 'Escribe r24 en PORTB'], ['sbi 0x05, 5', 'Pone a 1 el bit 5 de PORTB'], ['brne bucle', 'Salta si el resultado no fue cero']], c: 'av_asm', h: '0x05 es la dirección de E/S de PORTB.' },
  Q('¿Qué hace este fragmento a 16 MHz?', ['Pone PB5 como salida y la conmuta sin parar a 2 MHz', 'Lee PB5', 'Enciende D13 y lo deja fijo', 'Pone PB3 a 1'], '0x04 es DDRB y 0x03 es PINB: sbi en PINB conmuta. 4 ciclos por conmutación, 8 por periodo.', { code: '        sbi  0x04, 5\nbucle:  sbi  0x03, 5\n        rjmp bucle', c: 'av_asm', h: 'Busca qué registros son 0x04 y 0x03.' }),
  Q('TCCR1B está en la dirección de datos 0x81. ¿Se puede usar sbi con él?', ['No: sbi y cbi solo llegan a las E/S 0x00–0x1F; hace falta lds, ori, sts', 'Sí', 'Solo con cli', 'Sí, con out'], 'Por eso tocar bits de TCCR1B no es atómico.', { c: 'av_asm', h: 'Pasa 0x81 a dirección de E/S restando 0x20: ¿cabe en 0x00–0x1F?' }),
  Nm('ldi r24, 100 y luego dec r24 / brne hasta 0. ¿Cuántos ciclos en total? (ldi 1, dec 1, brne 2 si salta y 1 si no)', 300, 'ciclos', '1 + 100 + 99 × 2 + 1 = 300.', { c: 'av_cycle', h: '3 ciclos por cada unidad de n.' }),
  G('av_cycles'),
  I('Convención de avr-gcc: r1 vale siempre 0 y r0 es temporal; los argumentos llegan en r24, r22… y un resultado de 8 bits vuelve en r24. Una ISR empieza guardando lo que va a usar: ese <b>prólogo</b> es parte de su latencia.', { code: '__vector_11:          ; ISR(TIMER1_COMPA_vect)\n  push r1\n  push r0\n  in   r0, SREG\n  push r0\n  clr  r1\n  push r24            ; y un push por cada registro que use\n  ...\n  pop  r24            ; el epílogo deshace todo\n  pop  r0\n  out  SREG, r0\n  pop  r0\n  pop  r1\n  reti' }),
  Q('En el .lst de una ISR ves 12 push al principio y 12 pop al final. ¿Qué te dice?', ['Que usa muchos registros: prólogo y epílogo cuestan unos 50 ciclos; simplifícala o saca trabajo fuera', 'Que está mal compilada', 'Que es normal y no cuesta nada', 'Que tiene un bucle'], 'push y pop tardan 2 ciclos cada uno.', { c: 'av_isrcost', h: '24 instrucciones de 2 ciclos cada una.' }),
  Q('if (PINB & 0x01) se compiló como sbis 0x03, 0. ¿Qué hace sbis?', ['Salta la siguiente instrucción si el bit 0 de PINB está a 1', 'Pone a 1 el bit', 'Lee el byte entero', 'Compara con 3'], 'Skip if Bit in I/O is Set.', { c: 'av_asm', h: 'sbis: Skip if Bit Set.' }),
  Q('¿Por qué un uint8_t suele dar código más corto que un int en AVR?', ['Las operaciones de 8 bits son una instrucción; las de 16, dos o más', 'Porque ocupa menos Flash el nombre', 'No hay diferencia', 'Porque int es float'], 'La CPU es de 8 bits.', { c: 'av_8bit', h: '¿Cuántos bytes tiene cada tipo?' }),
  I('<b>Resumen</b>\n· Lee el .lst para saber qué hace de verdad tu C.\n· E/S frente a datos: 0x20 de diferencia; sbi/cbi solo hasta la E/S 0x1F.\n· Bucle dec/brne: 3n ciclos.\n· Cada push y pop de una ISR suma latencia.')
 ]),
 L('av40', 'Optimizar y depurar sin depurador', 'meter', ['av_debug', 'av_8bit', 'av_uartrate', 'av_isp'], [
  Q('Añades un Serial.print() para cazar un fallo y, de repente, el fallo desaparece. ¿Qué crees que pasa?', ['El print cambia los tiempos: el fallo depende del orden o de la velocidad', 'Serial lo ha arreglado', 'Un fallo de la Flash', 'Nada: ya está arreglado'], 'Los fallos de tiempos son tímidos: al mirarlos, cambian.', { predict: true, c: 'av_debug', h: '¿Cuánto tarda un print comparado con unas pocas instrucciones?' }),
  { t: 'explore', text: 'Antes de optimizar, entiende qué es caro en un AVR de 8 bits. Elige el tipo y la operación.', viz: 'av_cost', params: { tipo: pSl('Tipo (0 = uint8_t … 3 = float)', 1, 0, 3), op: pSl('Operación (0 = suma, 1 = producto, 2 = división)', 0, 0, 2) },
    tasks: [{ q: 'lvl', min: 3, max: 3, text: 'Encuentra una operación de cientos de ciclos', done: 'Dividir (y casi todo con float) llama a rutinas de software: cientos de ciclos.', hint: 'Prueba la división.' },
      { q: 'lvl', min: 0, max: 0, text: 'Y la más barata de todas', done: 'Sumar dos uint8_t: una instrucción, un ciclo. El tipo más pequeño que quepa es el más rápido.', hint: 'El tipo más pequeño y la operación más simple.' }] },
  I('Sin depurador paso a paso, tus herramientas son: Serial (cómodo pero lento y con efectos secundarios), <b>pines de traza</b> (una pata que sube y baja en puntos clave) y LEDs de estado. Un pin de traza cuesta 2 ciclos; un print, cientos de µs.', { code: '#define TRAZA_ON()  (PORTB |=  (1 << PB0))   // sbi: 2 ciclos\n#define TRAZA_OFF() (PORTB &= ~(1 << PB0))   // cbi: 2 ciclos\n\nTRAZA_ON();\nfiltrar();       // ¿cuánto tarda? míralo en el osciloscopio\nTRAZA_OFF();' }),
  I('Un <b>analizador lógico</b> barato de 8 canales con PulseView decodifica UART, SPI e I²C y te enseña cuánto dura cada ISR si marcas su entrada y su salida con una pata. El ciclo de trabajo de esa pata es el porcentaje de CPU.', { svg: `<svg viewBox="0 0 300 120" class="viz">${['TX', 'traza ISR', 'SCK'].map((n, i) => `<text x="8" y="${30 + i * 32}" class="vizsm">${n}</text>`).join('')}<path d="M70 26h20v-12h14v12h10v-12h30v12h40v-12h10v12h76" fill="none" stroke="var(--ice)" stroke-width="2"/><path d="M70 58h30v-12h16v12h60v-12h16v12h72" fill="none" stroke="var(--led)" stroke-width="2"/><path d="M70 90${Array.from({ length: 11 }, () => 'h9v-12h9v12').join('')}h20" fill="none" stroke="var(--ok)" stroke-width="2"/><text x="8" y="114" class="vizsm">Varias señales a la vez, en el mismo eje de tiempo</text></svg>` }),
  { t: 'steps', text: 'Un fallo aparece de vez en cuando. ¿Cómo lo cazas?', steps: ['Reprodúcelo de forma fiable, aunque tarde horas', 'Anota síntomas y la causa del último reinicio (MCUSR)', 'Pon pines de traza en los puntos sospechosos y míralos con el analizador', 'Cambia <b>una sola cosa</b> cada vez', 'Comprueba durante horas que el arreglo aguanta'], result: 'Sin reproducirlo, no sabrás si lo has arreglado' },
  Nm('Cada carácter a 115 200 baudios (8N1) tarda, en µs…', 86.8, 'µs', '10 bits / 115 200 ≈ 86,8 µs.', { tol: 0.5, c: 'av_uartrate', h: '10 bits entre los baudios.' }),
  Q('Quieres saber qué porcentaje de CPU gasta tu ISR. Con un pin de traza…', ['Mides el ciclo de trabajo del pin: a 1 dentro de la ISR y a 0 fuera', 'Cuentas instrucciones a mano', 'Con millis()', 'Es imposible'], 'El multímetro en tensión continua incluso te da una media.', { c: 'av_debug', h: 'La fracción del tiempo a 1 es la fracción de CPU.' }),
  I('Optimiza con cabeza: <b>primero mide</b>. Luego: tipos pequeños (uint8_t en vez de int), evitar float y divisiones, tablas precalculadas en PROGMEM y desplazamientos en vez de multiplicar o dividir por potencias de 2.', { code: 'uint16_t media = suma >> 4;           // en vez de suma / 16 (sin signo)\nuint8_t i;                            // en vez de int, si cabe\nconst uint8_t seno[64] PROGMEM = {…}; // en vez de sin() en float' }),
  Q('Dividir un uint16_t entre 16. ¿Lo más rápido?', ['x >> 4 (el compilador lo hace solo si x no tiene signo y el divisor es constante)', 'Convertir a float y dividir', 'Llamar a una función', 'Un bucle de restas'], 'Un desplazamiento son unas pocas instrucciones.', { c: 'av_8bit', h: '16 es una potencia de 2.' }),
  Q('El 328P multiplica 8 × 8 bits por hardware en 2 ciclos. Pero no tiene…', ['Divisor: las divisiones son rutinas de software lentas', 'Sumador', 'Registros', 'Saltos'], 'Una división de 32 bits cuesta cientos de ciclos.', { c: 'av_8bit', h: 'Recuerda la operación más cara que encontraste.' }),
  Q('debugWIRE en el 328P…', ['Permite depurar paso a paso por la pata RESET con una herramienta compatible, pero inutiliza el reset normal y en la Uno exige cortar una pista', 'No existe', 'Es el bootloader', 'Es el ISP'], 'Se activa con el fusible DWEN; mientras está activo, el ISP no funciona.', { c: 'av_isp', h: 'Usa la misma pata que el reset.' }),
  { t: 'order', q: 'Ordena un método para cazar un fallo intermitente.', items: ['Reproducirlo de forma fiable', 'Anotar síntomas y la causa del último reinicio (MCUSR)', 'Poner pines de traza en los puntos sospechosos', 'Cambiar una sola cosa cada vez', 'Comprobar que el arreglo aguanta horas'], e: 'Sin reproducirlo, no sabrás si lo has arreglado.', c: 'av_debug', h: 'Primero hay que poder verlo cuando quieras.' },
  Nm('Un mensaje de 30 caracteres a 115 200 baudios con el búfer de envío ya lleno. ¿Cuánto frena loop() como mínimo, en ms?', 2.6, 'ms', '30 × 86,8 µs ≈ 2,6 ms.', { tol: 0.05, c: 'av_uartrate', h: 'Caracteres × tiempo por carácter.' }),
  I('<b>Resumen</b>\n· Depura con pines de traza y un analizador lógico: cuestan 2 ciclos, no cientos de µs.\n· Método: reproducir, anotar, trazar, cambiar una cosa, comprobar.\n· Optimiza midiendo: tipos pequeños, sin float ni divisiones, tablas en PROGMEM y desplazamientos.')
 ]),
 PRJ('av-p16', 'Proyecto: robot siguelíneas con PID', 'av_robot'),
 PRJ('av-p17', 'Proyecto final: laboratorio de bolsillo en PCB propia', 'av_final')
], exam: [
  Q('Compilas con -mmcu=atmega328p y grabas con -p m328p, pero el chip es un ATmega168. ¿Qué pasa?', ['avrdude avisa de que la firma no coincide y no graba', 'Funciona igual', 'Se graba y va el doble de rápido', 'Se borra el chip para siempre'], 'avrdude lee la firma antes de escribir: si no es la del chip indicado, se detiene. Además, el programa estaría hecho para otro mapa de memoria.', { c: 'av_tool', h: '¿Qué comprueba avrdude antes de escribir nada?', l: 'av37' }),
  Q('Quieres grabar con un USBasp en lugar de por el bootloader de la Uno. ¿Qué cambias en la orden de avrdude?', ['El programador: -c usbasp; ya no hacen falta el puerto COM ni los baudios del bootloader', 'Solo -p', 'El formato del .hex', 'Nada'], '-c dice qué herramienta graba. El USBasp va por su propio USB y programa por ISP, no por el puerto serie.', { c: 'av_tool', h: '-c elige el programador.', l: 'av37' }),
  Q('Compilas sin -DF_CPU; util/delay.h avisa y supone 1 MHz. En una Uno a 16 MHz, ¿cuánto dura _delay_ms(1000)?', ['62,5 ms', '16 s', '1 s', '1 ms'], 'El retardo se calcula para 1 MHz: un millón de ciclos, que a 16 MHz pasan en 62,5 ms.', { c: 'av_fcpu', h: 'Ciclos calculados para 1 MHz, ejecutados a 16 MHz.', l: 'av37' }),
  { t: 'pin', q: '¿Qué pin de la Uno parpadea con este programa?', code: 'DDRD |= (1 << PD6);\nfor (;;) {\n  PIND = (1 << PD6);\n  _delay_ms(100);\n}', a: 'D6', e: 'PD6 = D6: en el puerto D coincide el número.', c: 'av_pinmap', h: 'En el puerto D, bit y pin coinciden.', l: 'av37' },
  Nm('avr-size: text 12 000, data 350 y bss 1300. ¿Cuántos bytes de SRAM quedan para pila y montón?', 398, 'bytes', 'SRAM estática = 350 + 1300 = 1650; 2048 − 1650 = 398 bytes.', { c: 'av_sections', h: 'SRAM = data + bss; réstalo de 2048.', l: 'av38' }),
  Q('Con el bootloader de 512 bytes, avr-size da text = 31 900 y data = 400. ¿Cabe el programa?', ['No: text + data = 32 300 y solo hay 32 256', 'Sí: 31 900 es menos de 32 768', 'Sí: data no ocupa Flash', 'No: bss también va a la Flash'], 'Los valores iniciales de .data también viven en la Flash. bss no ocupa Flash.', { c: 'av_sections', h: 'Flash usada = text + data.', l: 'av38' }),
  Q('main.c y pantalla.c incluyen config.h, pero tu Makefile no la declara como dependencia. Cambias config.h y ejecutas make. ¿Qué pasa?', ['make no recompila nada: el programa sale con la configuración vieja', 'Recompila todo', 'Da un error', 'Solo recompila config.h'], 'make solo sabe de las dependencias que le declaras. Añade config.h a las de main.o y pantalla.o.', { c: 'av_make', h: 'make compara fechas, pero solo de los archivos que conoce.', l: 'av38' }),
  Q('Pasas 300 bytes de textos a F() y vuelves a mirar avr-size. ¿Qué cambia?', ['data baja unos 300 bytes y libera SRAM; la Flash total (text + data) casi no cambia', 'text baja 300 bytes', 'bss baja 300 bytes', 'No cambia nada'], 'Los textos pasan de .data (Flash más copia en la SRAM) a quedarse solo en la Flash, dentro de text.', { c: 'av_mem', h: '¿En qué sección estaban los textos antes y dónde acaban?', l: 'av38' }),
  { t: 'match', q: 'Une cada declaración con su sección.', pairs: [['int umbral = 512; (global)', '.data'], ['uint8_t buffer[64]; (global)', '.bss'], ['La función loop()', '.text'], ['uint8_t rescates __attribute__((section(".noinit")));', '.noinit']], c: 'av_sections', h: 'Valor inicial, a cero, código o sin tocar al arrancar.', l: 'av38' },
  Q('¿Qué hacen estas dos instrucciones?', ['DDRB = 0x21: PB0 y PB5 salidas, el resto del puerto B entradas', 'PORTB = 0x21', 'Leen PINB', 'Ponen a 1 PB2'], '0x04 es la dirección de E/S de DDRB, y 0x21 = 0b00100001.', { code: 'ldi  r24, 0x21\nout  0x04, r24', c: 'av_asm', h: 'Busca qué registro está en la dirección de E/S 0x04.', l: 'av39' }),
  Nm('Bucle dec/brne con n = 200 a 8 MHz. ¿Cuánto tarda, en µs?', 75, 'µs', '3 × 200 = 600 ciclos; 600 / 8 = 75 µs.', { c: 'av_cycle', h: '3n ciclos, y ciclos entre MHz da µs.', l: 'av39' }),
  Q('¿Qué hace este fragmento?', ['Espera mientras PD2 esté a 1: sale cuando D2 baja a 0, por ejemplo al pulsar un botón con pull-up', 'Espera a que PD2 suba a 1', 'Pone PD2 a 1', 'Conmuta PD2'], '0x09 es PIND. sbic salta la siguiente instrucción si el bit está a 0: mientras está a 1, rjmp vuelve a mirar.', { code: 'espera: sbic 0x09, 2\n        rjmp espera', c: 'av_asm', h: 'sbic: salta si el bit está a 0. ¿Y qué registro es 0x09?', l: 'av39' }),
  Q('OCR1A está en la dirección de datos 0x88. ¿Con qué instrucción se escribe?', ['sts, con la dirección de datos: como TCCR1B, no tiene dirección de E/S', 'out 0x88', 'sbi', 'ldi'], 'Los registros de la E/S extendida solo se alcanzan con lds y sts. Por eso tocar sus bits no es atómico.', { c: 'av_asm', h: 'Recuerda cómo se llegaba a TCCR1B.', l: 'av39' }),
  Nm('Una ISR guarda y recupera 10 registros (10 push y 10 pop, de 2 ciclos cada uno) y salta 40 000 veces por segundo a 16 MHz. ¿Qué % de la CPU se va solo en esos push y pop?', 10, '%', '20 instrucciones × 2 = 40 ciclos; × 40 000 = 1 600 000 de 16 000 000: un 10 %.', { c: 'av_isrcost', h: 'Ciclos de prólogo y epílogo × veces por segundo / F_CPU.', l: 'av39' }),
  TU('Con un bucle dec/brne a 8 MHz, consigue un retardo de unos 20 µs.', 'av_loop', { n: pSl('n (valor inicial de r24)', 10, 1, 255), f: fx(8) }, { q: 't', min: 19.8, max: 20.3, text: 'Objetivo: unos 20 µs', hint: '20 µs a 8 MHz son 160 ciclos.' }, 'n = 53 da 159 ciclos (19,9 µs) y n = 54, 162 ciclos (20,25 µs).', { c: 'av_cycle', h: 'El bucle tarda 3n ciclos.', l: 'av39' }),
  Q('¿Por qué for (uint8_t i = 0; i < 100; i++) genera menos código que con int i?', ['Con uint8_t el incremento y la comparación son de 8 bits: una instrucción en vez de dos', 'Porque int es float', 'No hay diferencia', 'Porque uint8_t va a la EEPROM'], 'La CPU es de 8 bits: cada operación de 16 bits necesita una instrucción por byte.', { c: 'av_8bit', h: '¿Cuántos bytes tiene cada tipo?', l: 'av39' }),
  Q('Para depurar, metes un Serial.print() en un bucle que corre a 10 kHz y todo se vuelve lentísimo. ¿Qué usas en su lugar?', ['Un pin de traza mirado con el osciloscopio o un analizador lógico', 'Más Serial.print() a menos baudios', 'delay() entre prints', 'La EEPROM'], 'Un pin de traza cuesta 2 ciclos; un print, cientos de µs que cambian los tiempos que quieres medir.', { c: 'av_debug', h: 'Busca la herramienta que casi no altera los tiempos.', l: 'av40' }),
  Nm('Un print de 20 caracteres a 9600 baudios con el búfer de envío ya lleno. ¿Cuánto frena loop() como mínimo, en ms?', 20.8, 'ms', 'Cada carácter son 10 bits: 10 / 9600 ≈ 1,04 ms; × 20 ≈ 20,8 ms.', { tol: 0.2, c: 'av_uartrate', h: 'Tiempo por carácter × caracteres.', l: 'av40' }),
  Q('Calculas media = suma / 10 en un bucle rápido sobre uint16_t. ¿Cómo lo aceleras?', ['Promediando 8 o 16 muestras y desplazando 3 o 4 bits en lugar de dividir entre 10', 'Pasándolo a float', 'Con una variable volatile', 'Dividiendo dos veces entre 5'], 'Dividir entre 10 llama a una rutina lenta; dividir sin signo entre una potencia de 2 es un desplazamiento.', { c: 'av_8bit', h: 'El 328P no tiene divisor, pero desplazar es barato.', l: 'av40' }),
  Q('Activas debugWIRE (DWEN) en un 328P y ahora avrdude no conecta por ISP. ¿Por qué?', ['Con debugWIRE activo, la pata RESET la usa el depurador y el ISP no funciona hasta desactivarlo desde la herramienta', 'El chip se ha estropeado', 'Falta el bootloader', 'El cristal se ha parado'], 'debugWIRE va por la pata RESET, y el ISP necesita mantener RESET a 0: no pueden convivir.', { c: 'av_isp', h: '¿Qué pata usan los dos?', l: 'av40' }),
  Nm('El multímetro en tensión continua sobre el pin de traza de una ISR marca 0,6 V, con VCC = 5 V. ¿Qué % de la CPU se lleva la ISR?', 12, '%', 'El multímetro da la media: 0,6 / 5 = 0,12. La pata está a 1 el 12 % del tiempo, y esa es la carga.', { tol: 0.5, c: 'av_debug', h: 'Tensión media / VCC = fracción del tiempo a 1.', l: 'av40' }),
  Q('Un fallo aparece una vez al día. Cambias tres cosas a la vez y desaparece. ¿Qué sabes?', ['Poco: no sabes cuál de las tres lo arregló, ni si de verdad está arreglado', 'Que estaba en las tres', 'Que está arreglado para siempre', 'Que era el compilador'], 'Cambia una sola cosa cada vez y comprueba durante el tiempo suficiente (aquí, días) que el fallo no vuelve.', { c: 'av_debug', h: 'Recuerda el método para cazar fallos intermitentes.', l: 'av40' })
] };

  /* ===================== EXPLICACIONES ALTERNATIVAS VISUALES E INTERACTIVAS ===================== */
  // Una alternativa más por concepto, que se puede tocar o ver: complementa las de texto.
  const SV_PREC = `<svg viewBox="0 0 300 140" class="viz"><text x="10" y="22" class="vizlab">PIND &amp; (1 &lt;&lt; PD2) == 0</text>
    <rect x="70" y="34" width="150" height="24" rx="5" fill="var(--err)" opacity=".25"/><text x="145" y="51" text-anchor="middle" class="vizsm">(1 &lt;&lt; PD2) == 0 → 0</text>
    <text x="10" y="80" class="vizsm" style="fill:var(--err)">Lo que hace C: PIND &amp; 0 = 0 siempre</text>
    <text x="10" y="108" class="vizlab">(PIND &amp; (1 &lt;&lt; PD2)) == 0</text><rect x="8" y="114" width="150" height="6" rx="3" fill="var(--ok)" opacity=".6"/>
    <text x="10" y="136" class="vizsm" style="fill:var(--ok)">Primero se aísla el bit; luego se compara</text></svg>`;
  const SV_ARDTIM = `<svg viewBox="0 0 300 140" class="viz">${[['Timer0', 'millis(), delay() · PWM en D5 y D6', 'var(--err)'], ['Timer1', 'Servo · PWM en D9 y D10', 'var(--led)'], ['Timer2', 'tone() · PWM en D3 y D11', 'var(--ice)']].map(([t, u, c], i) => `<rect x="10" y="${14 + i * 38}" width="70" height="28" rx="5" fill="${c}" opacity=".3" stroke="${c}"/><text x="45" y="${32 + i * 38}" text-anchor="middle" class="vizlab">${t}</text><text x="90" y="${32 + i * 38}" class="vizsm">${u}</text>`).join('')}
    <text x="10" y="134" class="vizsm">Si una librería lo usa, sus pines pierden analogWrite</text></svg>`;
  const SV_VEC = `<svg viewBox="0 0 300 150" class="viz"><text x="10" y="16" class="vizsm">Principio de la Flash: la tabla de vectores</text>${[['1', 'RESET'], ['2', 'INT0'], ['3', 'INT1'], ['4', 'PCINT0'], ['…', '…'], ['12', 'TIMER1_COMPA'], ['…', '…'], ['22', 'ADC']].map(([n, v], i) => `<rect x="10" y="${22 + i * 15}" width="200" height="14" fill="${i < 3 ? 'var(--led)' : 'var(--ice)'}" opacity="${0.5 - i * 0.04}"/><text x="16" y="${33 + i * 15}" class="vizsm">${n}</text><text x="50" y="${33 + i * 15}" class="vizsm">${v}</text>`).join('')}
    <path d="M230 30V138" stroke="currentColor" stroke-width="2"/><path d="M224 40l6 -10 6 10" fill="none" stroke="currentColor" stroke-width="2"/><text x="240" y="60" class="vizsm">más</text><text x="240" y="74" class="vizsm">prioridad</text></svg>`;
  const SV_PCINT = `<svg viewBox="0 0 300 130" class="viz">${[['Puerto B · D8–D13', 'PCINT0_vect', 'PCIE0', 'PCMSK0'], ['Puerto C · A0–A5', 'PCINT1_vect', 'PCIE1', 'PCMSK1'], ['Puerto D · D0–D7', 'PCINT2_vect', 'PCIE2', 'PCMSK2']].map(([p, v, e, m], i) => `<rect x="10" y="${12 + i * 36}" width="128" height="28" rx="5" fill="var(--ice)" opacity=".25"/><text x="16" y="${30 + i * 36}" class="vizsm">${p}</text><path d="M140 ${26 + i * 36}h20" stroke="currentColor" stroke-width="1.6"/><text x="164" y="${24 + i * 36}" class="vizlab">${v}</text><text x="164" y="${37 + i * 36}" class="vizsm">${e} · ${m}</text>`).join('')}
    <text x="10" y="124" class="vizsm">Un vector por puerto: la ISR averigua qué pata cambió</text></svg>`;
  const SV_UFLAGS = `<svg viewBox="0 0 300 120" class="viz"><text x="10" y="18" class="vizlab">UCSR0A</text>${[['RXC0', 'byte nuevo', 'var(--ok)'], ['UDRE0', 'hay hueco', 'var(--ice)'], ['FE0', 'trama mala', 'var(--err)'], ['DOR0', 'perdido', 'var(--err)']].map(([n, d, c], i) => `<rect x="${10 + i * 72}" y="28" width="66" height="26" rx="5" fill="${c}" opacity=".3" stroke="${c}"/><text x="${43 + i * 72}" y="46" text-anchor="middle" class="vizlab">${n}</text><text x="${43 + i * 72}" y="72" text-anchor="middle" class="vizsm">${d}</text>`).join('')}
    <text x="10" y="104" class="vizsm">Para escribir, espera UDRE0; para leer, RXC0</text></svg>`;
  const SV_MCUSR = `<svg viewBox="0 0 300 110" class="viz"><text x="10" y="18" class="vizlab">MCUSR: la caja negra del último reinicio</text>${[['WDRF', 'watchdog', 8], ['BORF', 'baja tensión', 4], ['EXTRF', 'pata RESET', 2], ['PORF', 'encendido', 1]].map(([n, d, v], i) => `<rect x="${10 + i * 72}" y="30" width="66" height="26" rx="5" fill="var(--led)" opacity=".25" stroke="var(--led)"/><text x="${43 + i * 72}" y="48" text-anchor="middle" class="vizlab">${n}</text><text x="${43 + i * 72}" y="72" text-anchor="middle" class="vizsm">${d}</text><text x="${43 + i * 72}" y="88" text-anchor="middle" class="vizsm">vale ${v}</text>`).join('')}
    <text x="10" y="106" class="vizsm">Bits 3, 2, 1 y 0: si hay varios, se suman</text></svg>`;
  const SV_MAKE = `<svg viewBox="0 0 300 140" class="viz"><rect x="112" y="10" width="76" height="24" rx="5" fill="var(--ok)" opacity=".3" stroke="var(--ok)"/><text x="150" y="27" text-anchor="middle" class="vizsm">main.hex</text>
    <rect x="112" y="48" width="76" height="24" rx="5" fill="var(--led)" opacity=".3" stroke="var(--led)"/><text x="150" y="65" text-anchor="middle" class="vizsm">main.elf</text>
    <rect x="50" y="86" width="76" height="24" rx="5" fill="var(--ice)" opacity=".3" stroke="var(--ice)"/><text x="88" y="103" text-anchor="middle" class="vizsm">main.o</text>
    <rect x="174" y="86" width="86" height="24" rx="5" fill="none" stroke="var(--line)"/><text x="217" y="103" text-anchor="middle" class="vizsm">pantalla.o</text>
    <path d="M150 34v14M150 72L88 86M150 72l67 14" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <text x="88" y="128" text-anchor="middle" class="vizsm" style="fill:var(--ice)">main.c cambió</text><text x="217" y="128" text-anchor="middle" class="vizsm">sin cambios: no se toca</text></svg>`;

  const altV = (k, title, text, vis, q) => { if (!CONCEPTS[k]) throw new Error('concepto ' + k); CONCEPTS[k].alts.push({ title, text, ...vis, q }); };
  const tv = (viz, params) => ({ tune: { viz, params } });
  // Núcleo, reloj y memoria
  altV('av_core', 'Tócalo: la ALU', 'Mueve los dos registros y la operación. La ALU solo opera con lo que hay en los registros, y deja el resultado en uno de ellos; SREG enciende sus banderas según cómo sale.', tv('av_alu', { x: pSl('r24', 60, 0, 255), k: pSl('r25', 30, 0, 255), op: L01('Operación (0 = suma, 1 = resta)', 0) }), mcq('add r24, r25: ¿dónde queda el resultado?', ['En r24', 'En la SRAM', 'En la Flash', 'En SREG'], 'Las instrucciones de la ALU dejan el resultado en el primer registro.'));
  altV('av_8bit', 'Tócalo: qué es caro', 'Elige tipo y operación. Cuanto más grande el tipo, más instrucciones; y dividir u operar con float no tiene hardware: llama a rutinas.', tv('av_cost', { tipo: pSl('Tipo (0 = uint8_t … 3 = float)', 0, 0, 3), op: pSl('Operación (0 = suma, 1 = producto, 2 = división)', 0, 0, 2) }), mcq('¿Qué cuesta menos en un AVR?', ['Sumar dos uint8_t', 'Dividir dos uint16_t', 'Sumar dos float', 'Multiplicar dos uint32_t'], 'Una instrucción de 1 ciclo.'));
  altV('av_wrap', 'Tócalo: la vuelta del byte', 'Pon una resta cuyo resultado sería negativo, o una suma que pase de 255. El byte da la vuelta y la bandera C avisa.', tv('av_alu', { x: pSl('r24', 10, 0, 255), k: pSl('r25', 20, 0, 255), op: L01('Operación (0 = suma, 1 = resta)', 1) }), mcq('uint8_t: 10 − 20 = ?', ['246', '−10', '0', '10'], '−10 + 256 = 246.'));
  altV('av_cycle', 'Tócalo: contar ciclos', 'Un bucle dec/brne cuesta 3 ciclos por vuelta. Cambia n y el reloj, y mira cómo los ciclos se convierten en tiempo: ciclos / MHz = µs.', tv('av_loop', { n: pSl('n', 80, 1, 255), f: { label: 'Reloj', val: 8, list: [1, 8, 16, 20], unit: 'MHz', dec: 0 } }), mcq('A 8 MHz, un bucle de 3n ciclos con n = 80 tarda…', ['30 µs', '240 µs', '10 µs', '3 µs'], '240 ciclos / 8 MHz = 30 µs.'));
  altV('av_clksrc', 'Tócalo: el error que se acumula', 'Compara las fuentes de reloj en una hora, un día y un mes. Un error pequeño, multiplicado por mucho tiempo, se hace grande.', tv('av_clk', { src: pSl('Fuente (0 = RC de fábrica … 4 = RTC)', 1, 0, 4), span: pSl('Plazo (0 = hora, 1 = día, 2 = mes)', 1, 0, 2) }), mcq('Un RC calibrado (±1 %) en un día se desvía…', ['Unos 14 minutos', 'Unos 14 segundos', 'Casi 2 horas', 'Nada'], '86 400 s × 0,01 = 864 s.'));
  altV('av_vmax', 'Tócalo: la zona segura', 'Mueve la tensión y la frecuencia. Por encima de la línea verde, el chip no garantiza funcionar bien.', tv('av_speed', { V: pSl('VCC', 3.3, 1.8, 5.5, 0.1, 'V', 1), f: { label: 'Reloj', val: 8, list: [1, 4, 8, 10, 12, 16, 20], unit: 'MHz', dec: 0 } }), mcq('¿Frecuencia máxima a 2,7 V?', ['10 MHz', '20 MHz', '4 MHz', '16 MHz'], 'Es uno de los puntos de la hoja de datos.'));
  altV('av_fcpu', 'Tócalo: la etiqueta equivocada', 'Combina lo que cree el compilador (F_CPU) con el reloj real. Si no coinciden, todos los tiempos salen multiplicados por F_CPU / reloj real.', tv('av_fcpu', { fd: { label: 'F_CPU', val: 16, list: [1, 8, 16], unit: 'MHz', dec: 0 }, fr: { label: 'Reloj real', val: 8, list: [1, 8, 16], unit: 'MHz', dec: 0 } }), mcq('F_CPU = 16 MHz y el chip va a 8 MHz: delay(1000) dura…', ['2 s', '0,5 s', '1 s', '8 s'], 'Cuenta los ciclos de 1 s a 16 MHz, que a 8 MHz tardan el doble.'));
  altV('av_mem', 'Tócalo: el informe de memoria', 'Sube «data» (textos y globales con valor) y mira las dos barras: ocupa Flash y SRAM a la vez. Bájalo y es lo que consigues con F() y PROGMEM.', tv('av_size', { text: fx(6000), data: pSl('Textos y globales con valor (data)', 600, 0, 1600, 10, 'B'), bss: fx(400) }), mcq('Un texto entre comillas sin F()…', ['Ocupa Flash y SRAM', 'Solo Flash', 'Solo SRAM', 'Va a la EEPROM'], 'Su valor está en la Flash y el arranque lo copia a la SRAM.'));
  altV('av_sram', 'Tócalo: pila contra montón', 'Sube la pila y el montón hasta que se toquen. La pila crece desde arriba hacia abajo; el montón, desde las globales hacia arriba.', tv('av_sram', { g: pSl('Globales', 800, 0, 1800, 10, 'B'), h: pSl('Montón', 300, 0, 1500, 10, 'B'), s: pSl('Pila', 300, 0, 1500, 10, 'B') }), mcq('¿Hacia dónde crece la pila?', ['Hacia abajo, hacia el montón', 'Hacia arriba', 'No crece', 'Hacia la Flash'], 'Empieza en 0x08FF y baja.'));
  altV('av_sections', 'Tócalo: text, data y bss', 'Mueve las tres secciones. text solo gasta Flash; bss solo SRAM; data gasta las dos.', tv('av_size', { text: pSl('text', 4000, 0, 32000, 100, 'B'), data: pSl('data', 100, 0, 1000, 10, 'B'), bss: pSl('bss', 300, 0, 1500, 10, 'B') }), mcq('data 100 y bss 300: ¿SRAM estática?', ['400 bytes', '300 bytes', '100 bytes', '2048 bytes'], 'data + bss.'));
  altV('av_eeprom', 'Tócalo: la vida de la EEPROM', 'Cambia cada cuánto escribes y entre cuántas celdas repartes. La vida crece con las dos cosas.', tv('av_wear', { m: { label: 'Una escritura cada', val: 5, list: [1, 5, 10, 30, 60], unit: 'min', dec: 0 }, cells: { label: 'Celdas que se turnan', val: 1, list: [1, 4, 16, 64, 256], dec: 0 } }), mcq('Una escritura cada 5 min en una sola celda dura unos…', ['Casi un año', '69 días', '19 años', '5 años'], '100 000 × 5 min = 500 000 min ≈ 0,95 años.'));
  // Patas y puertos
  altV('av_pinmap', 'Tócalo: el mapa de puertos', 'Recorre puertos y bits y mira qué pin de Arduino es cada uno. El puerto D coincide; el B suma 8; el C son las A.', tv('av_pinmap', { port: pSl('Puerto (0 = D, 1 = B, 2 = C)', 0, 0, 2), bit: pSl('Bit', 6, 0, 7) }), mcq('¿Qué es PD6?', ['D6', 'D14', 'A6', 'D12'], 'En el puerto D, el número coincide.'));
  altV('av_altfn', 'Tócalo: cada pata, varios oficios', 'Recorre las patas: debajo aparece qué otras funciones tiene cada una (serie, SPI, I²C, temporizadores, cristal).', tv('av_pinmap', { port: pSl('Puerto (0 = D, 1 = B, 2 = C)', 1, 0, 2), bit: pSl('Bit', 3, 0, 7) }), mcq('¿Qué otra función tiene PB3?', ['MOSI del SPI y salida OC2A', 'SDA', 'RX', 'El cristal'], 'Es D11: SPI y PWM del Timer2.'));
  altV('av_bare', 'El dibujo del mínimo', 'Mira el esquema: alimentación por las dos parejas (VCC/GND y AVCC/GND), cada una con su 100 nF; 10 kΩ de RESET a VCC; y el cristal con un 22 pF a masa en cada pata.', { svg: SV_BARE }, mcq('¿Qué va de RESET a VCC?', ['10 kΩ', '22 pF', '100 nF', '1 MΩ'], 'Una pull-up que sujeta RESET a 1.'));
  altV('av_dip', 'Tócalo: contar patas', 'Mueve el selector: la pata 1 está abajo a la izquierda y se sigue en sentido contrario a las agujas del reloj.', tv('av_dip', { pata: pSl('Pata', 1, 1, 28), n: fx(28) }), mcq('¿Qué pata del DIP-28 es AVCC?', ['20', '7', '21', '22'], 'AVCC (20), AREF (21) y GND (22).'));
  altV('av_ports', 'Tócalo: los tres registros', 'Activa DDR y PORT y pulsa el botón. Mira qué hace la pata en cada combinación y qué lee PIN.', tv('av_pin', { ddr: L01('DDRx (1 = salida)', 1), port: L01('PORTx', 0), btn: L01('Pulsador (1 = pulsado)', 0) }), mcq('DDR = 1 y PORT = 0: la pata…', ['Es una salida a 0 V', 'Es una entrada con pull-up', 'Es una entrada flotante', 'Es una salida a 5 V'], 'DDR a 1 es salida; PORT dice el nivel.'));
  altV('av_bits', 'Tócalo: máscaras en vivo', 'Elige operación y bit sobre un registro. Fíjate en que solo cambia la casilla marcada; las demás se quedan como estaban.', tv('av_bits', { v: pSl('Registro', 5, 0, 255), bit: pSl('Bit', 1, 0, 7), op: pSl('Operación (1 = OR, 2 = AND con ~, 3 = XOR, 4 = leer)', 1, 1, 4) }), mcq('0b00000101 | 0b00000010 = ?', ['0b00000111', '0b00000000', '0b00000101', '0b00000010'], 'OR pone a 1 el bit 1 y respeta el resto.'));
  altV('av_prec', 'Cómo lo agrupa el compilador', 'Míralo dibujado: sin paréntesis, C agrupa primero la comparación y luego el &amp;. Con paréntesis, primero aíslas el bit.', { svg: SV_PREC }, mcq('¿Cuál comprueba bien que el bit 2 de PINB está a 0?', ['(PINB & 0x04) == 0', 'PINB & 0x04 == 0', 'PINB == 0x04', 'PINB & (0x04 == 0)'], 'Primero el &, entre paréntesis.'));
  altV('av_input', 'Tócalo: zonas de lectura', 'Mueve la tensión de entrada y la alimentación. Verde: 1 seguro; azul: 0 seguro; naranja: sin garantía.', tv('av_thresh', { vcc: { label: 'Alimentación', val: 5, list: [3.3, 5], unit: 'V', dec: 1 }, vin: pSl('Tensión en la entrada', 2, 0, 5.5, 0.05, 'V', 2) }), mcq('A 5 V, ¿qué se lee con 3,5 V en la entrada?', ['Un 1 seguro', 'Un 0 seguro', 'Sin garantía', 'Nada'], 'Pasa de 0,6 × 5 = 3 V.'));
  altV('av_rmw', 'Tócalo: la ISR en medio', 'Mueve el momento en que llega la interrupción y cambia cómo está escrito main(). Solo se pierde el cambio si cae entre leer y escribir, con un |= sin proteger.', tv('av_race', { modo: pSl('Código (0 = |=, 1 = con cli/sei, 2 = sbi)', 0, 0, 2), isr: pSl('Llega la ISR (0 = antes … 3 = después)', 1, 0, 3) }), mcq('¿Cuándo se pierde el cambio de la ISR con PORTB |= …?', ['Si la ISR llega entre la lectura y la escritura', 'Si llega antes de leer', 'Si llega después de escribir', 'Nunca'], 'main() escribe encima su copia vieja.'));
  altV('av_ardtim', 'El reparto de temporizadores', 'Mira el dibujo: cada temporizador da el PWM de dos pines y además tiene un dueño en Arduino. Si una librería lo usa, sus pines pierden analogWrite.', { svg: SV_ARDTIM }, mcq('tone() ocupa…', ['El Timer2: D3 y D11 pierden analogWrite', 'El Timer0', 'El Timer1', 'Ninguno'], 'Timer2 → D3 y D11.'));
  altV('av_keymatrix', 'Tócalo: escanear filas', 'Pon a 0 una fila cada vez y mira qué columna lee 0: ahí hay una tecla pulsada.', tv('av_keys', { fila: pSl('Fila a 0', 2, 0, 3) }), mcq('Con la fila 3 a 0, la columna 0 lee 0. ¿Tecla?', ['La de la fila 3 y la columna 0', 'Toda la fila 3', 'La de la fila 0 y la columna 3', 'Ninguna'], 'Solo esa tecla une esa fila con esa columna.'));
  altV('av_mux', 'Tócalo: dígitos por turnos', 'Cambia el número de dígitos y el tiempo de cada uno. Refresco = 1 / (n·t) y cada dígito luce 1/n del tiempo.', tv('av_mux', { n: pSl('Dígitos', 5, 1, 8), t: pSl('Tiempo por dígito', 4, 0.5, 10, 0.5, 'ms', 1) }), mcq('5 dígitos y 4 ms por dígito: ¿refresco?', ['50 Hz', '250 Hz', '20 Hz', '200 Hz'], '1 / (5 × 4 ms) = 50 Hz.'));
  // Temporizadores
  altV('av_timer', 'Tócalo: el contador a cámara lenta', 'Cambia el prescaler y los bits. Una cuenta dura N / 16 MHz; una vuelta, 256 o 65 536 cuentas.', tv('av_count', { N: { label: 'Prescaler', val: 1024, list: [1, 8, 64, 256, 1024], dec: 0 }, bits: { label: 'Bits del contador', val: 8, list: [8, 16], dec: 0 } }), mcq('Timer2 con prescaler 1024: ¿vuelta completa?', ['16,384 ms', '64 µs', '4,19 s', '1,024 ms'], '256 × 64 µs.'));
  altV('av_treg', 'El esquema del temporizador', 'Sigue el dibujo de izquierda a derecha: reloj, prescaler (CS en TCCRnB), contador (TCNTn), comparación (OCRnA), bandera (TIFRn) y, si TIMSKn lo permite, la ISR.', { svg: SV_TBLK }, mcq('¿Qué registro contiene la cuenta?', ['TCNTn', 'TCCRnB', 'TIMSKn', 'OCRnA'], 'CNT de «count».'));
  altV('av_tflag', 'Tócalo: el buzón de una carta', 'Cambia cada cuánto llegan eventos y cuánto tiempo están desactivadas las interrupciones. La bandera solo recuerda uno.', tv('av_flag', { per: { label: 'Un evento cada', val: 0.5, list: [0.25, 0.5, 1, 2, 5], unit: 'ms', dec: 2 }, off: pSl('Interrupciones desactivadas', 3, 0, 10, 0.5, 'ms', 1) }), mcq('Llegan 4 eventos mientras las interrupciones están desactivadas. ¿Cuántas veces se ejecuta la ISR después?', ['Una', 'Cuatro', 'Ninguna', 'Tres'], 'La bandera es un solo bit.'));
  altV('av_ctc', 'Tócalo: el metrónomo', 'Cambia prescaler y OCR y mira la frecuencia de interrupción y la de la patilla (la mitad).', tv('av_timer', { N: pN(8), ocr: pOcr(199) }), mcq('Prescaler 8 y OCR0A = 199 en CTC: ¿frecuencia de interrupción?', ['10 kHz', '5 kHz', '20 kHz', '1 kHz'], '16 000 000 / (8 × 200).'));
  altV('av_pwm', 'Tócalo: frecuencia contra niveles', 'Sube y baja TOP: la frecuencia y la resolución se reparten las mismas cuentas.', tv('av_pwm', pwmP(0, 999, 499, 8)), mcq('Fast PWM, prescaler 8 y TOP = 999: ¿frecuencia?', ['2 kHz', '1 kHz', '16 kHz', '250 Hz'], '16 000 000 / (8 × 1000).'));
  altV('av_pwmduty', 'Tócalo: la sierra y el umbral', 'Mueve OCR con TOP fijo: la salida está a 1 mientras el contador no lo alcanza. En Fast PWM, ciclo = (OCR + 1) / (TOP + 1).', tv('av_pwm', { N: pN(8), top: fx(99), ocr: { label: 'OCR', val: 49, min: 0, max: 99, step: 1, dec: 0 }, mode: fx(0) }), mcq('Fast PWM, TOP = 99 y OCR = 19: ¿ciclo de trabajo?', ['20 %', '19 %', '19,2 %', '80 %'], '20 / 100.'));
  altV('av_icp', 'Tócalo: la foto del contador', 'Cambia la señal y el prescaler: la diferencia entre dos capturas, por lo que dura una cuenta, es el periodo.', tv('av_cap', { f: { label: 'Señal', val: 1000, list: [10, 50, 100, 440, 1000, 10000, 100000], unit: 'Hz', dec: 0 }, N: { label: 'Prescaler', val: 64, list: [1, 8, 64, 256], dec: 0 } }), mcq('Prescaler 64; entre dos capturas hay 250 cuentas. ¿Frecuencia?', ['1 kHz', '250 Hz', '4 kHz', '64 Hz'], '250 × 4 µs = 1 ms.'));
  // Interrupciones
  altV('av_isr', 'Tócalo: las tres llaves', 'Activa y desactiva bandera, habilitación local y permiso global. Solo con las tres cerradas llega la corriente a la ISR.', tv('av_gate', { flag: L01('Bandera', 1), mask: L01('Habilitación local', 0), ibit: L01('Permiso global (bit I)', 1) }), mcq('Bandera a 1, habilitación local a 1 y bit I a 0: ¿salta la ISR?', ['No', 'Sí', 'Solo una vez', 'Depende del vector'], 'Falta el permiso global.'));
  altV('av_vector', 'La tabla, dibujada', 'Al principio de la Flash está la tabla de vectores. Cuanto más arriba, más prioridad: si dos esperan a la vez, gana la de número más bajo.', { svg: SV_VEC }, mcq('INT0 y TIMER1_COMPA pendientes a la vez: ¿cuál va primero?', ['INT0: su vector es más bajo', 'TIMER1_COMPA', 'Las dos a la vez', 'La más reciente'], 'Vector 2 frente a vector 12.'));
  altV('av_extint', 'Tres grupos, tres vectores', 'Mira el dibujo: cada puerto tiene un único vector PCINT, que se activa con su bit de PCICR y elige patas con su PCMSK.', { svg: SV_PCINT }, mcq('Una pata del puerto D que no sea D2 ni D3 debe interrumpir. ¿Grupo?', ['PCINT2 (PCIE2 y PCMSK2)', 'PCINT0', 'PCINT1', 'INT0'], 'Puerto D → PCINT2.'));
  altV('av_bounce', 'Tócalo: filtrar rebotes', 'Sube el tiempo durante el que se ignoran flancos y mira cuántas pulsaciones se cuentan.', tv('mc_bounce', { T: pSl('Ignorar flancos durante', 2, 0, 40, 1, 'ms', 0) }), mcq('¿Cuánto suelen durar los rebotes de un pulsador?', ['Unos milisegundos', 'Microsegundos', 'Segundos', 'No rebotan'], 'Por eso se filtran unos 10–20 ms.'));
  altV('av_shared', 'Tócalo: la lectura rota', 'Elige 255 y haz que la ISR salte entre los dos bytes: verás un valor que nunca existió. Luego protégelo con ATOMIC_BLOCK.', tv('av_torn', { cnt: { label: 'cuenta antes de la ISR', val: 255, list: [254, 255, 511, 1023], dec: 0 }, isr: L01('La ISR salta entre los dos bytes', 1), atom: L01('Leer dentro de ATOMIC_BLOCK', 0) }), mcq('¿Qué arregla volatile?', ['Que el compilador vuelva a leer la variable de la memoria', 'Que la lectura sea atómica', 'Que ocupe menos', 'Que vaya a la EEPROM'], 'Visibilidad, no atomicidad.'));
  altV('av_isrcost', 'Tócalo: la carga de una ISR', 'Cambia cuántas veces salta y cuántos ciclos dura. Carga = ciclos × veces por segundo / 16 MHz.', tv('av_irq', { f: { label: 'Interrupciones por segundo', val: 40000, list: [100, 1000, 10000, 40000, 100000], dec: 0 }, cyc: pSl('Ciclos por ISR', 100, 20, 400, 10) }), mcq('ISR de 50 ciclos, 32 000 veces por segundo a 16 MHz: ¿carga?', ['10 %', '1 %', '50 %', '32 %'], '1,6 millones de 16 millones.'));
  altV('av_ring', 'Tócalo: la noria', 'Cambia el tamaño, los baudios y cuánto tarda loop(): mira cuántos bytes llegan y si caben en las TAM − 1 casillas.', tv('av_ring', { tam: { label: 'TAM', val: 16, list: [8, 16, 32, 64], dec: 0 }, baud: { label: 'Baudios', val: 38400, list: [9600, 38400, 115200], dec: 0 }, busy: pSl('loop() ocupado', 3, 0, 20, 1, 'ms') }), mcq('TAM = 16: ¿cuántos bytes caben?', ['15', '16', '17', '8'], 'Se deja un hueco para distinguir lleno de vacío.'));
  altV('av_debug', 'Tócalo: el pin de traza', 'La pata sube al entrar en la ISR y baja al salir. Su ciclo de trabajo es el porcentaje de CPU que se lleva.', tv('av_irq', { f: { label: 'Interrupciones por segundo', val: 10000, list: [100, 1000, 10000, 40000, 100000], dec: 0 }, cyc: pSl('Ciclos por ISR', 160, 20, 400, 10) }), mcq('Un pin de traza está a 1 el 10 % del tiempo. ¿Carga de la ISR?', ['10 %', '90 %', '1 %', 'No se sabe'], 'Fracción del tiempo dentro de la ISR.'));
  // Periféricos
  altV('av_adc', 'Tócalo: el reloj del ADC', 'Cambia el prescaler y mira si el reloj del ADC cae en la zona verde (50–200 kHz) y cuántas muestras por segundo salen.', tv('av_adc', adcP(64)), mcq('A 16 MHz con prescaler 128, ¿muestras por segundo?', ['Unas 9600', '125 000', '16 000', '1000'], '125 kHz / 13 ciclos.'));
  altV('av_adcreg', 'Tócalo: la regla de tres del ADC', 'Mueve la tensión y la referencia, y activa ADLAR para ver cómo se reparten los 10 bits entre ADCH y ADCL.', tv('av_conv', { vin: pSl('Tensión de entrada', 0.55, 0, 5, 0.05, 'V', 2), ref: { label: 'Referencia', val: 1.1, list: [1.1, 5], unit: 'V', dec: 1 }, adlar: L01('ADLAR', 0) }), mcq('Vref = 1,1 V y Vin = 0,55 V: ¿lectura?', ['512', '1023', '256', '55'], 'La mitad de la referencia: 512.'));
  altV('av_adcimp', 'El dibujo del muestreo', 'Mira el esquema: tu fuente carga un condensador de unos 14 pF a través de su propia resistencia mientras el interruptor de muestreo está cerrado. Mucha resistencia, poca carga.', { svg: SV_SAMP }, mcq('¿Qué resistencia de fuente pide la hoja de datos como máximo?', ['10 kΩ', '100 kΩ', '1 MΩ', '100 Ω'], 'Con más, no se carga a tiempo.'));
  altV('av_oversample', 'Tócalo: bits por lecturas', 'Sube los bits extra: cada uno multiplica por 4 las lecturas y divide entre 4 los resultados por segundo.', tv('av_adc', adcP(128, 1, true, false)), mcq('¿Cuántas lecturas para ganar 1 bit?', ['4', '2', '8', '16'], '4¹ = 4.'));
  altV('av_vcc', 'Tócalo: medir la pila', 'Baja la pila: la referencia fija pesa más y la lectura sube. Cambia la referencia real del chip para ver por qué hay que calibrar.', tv('av_vcc', { vcc: pSl('VCC real', 3.6, 2.7, 5.5, 0.05, 'V', 2), ref: { label: 'Referencia interna real', val: 1.1, list: [1, 1.1, 1.2], unit: 'V', dec: 2 } }), mcq('Con referencia AVcc, la lectura de la de 1,1 V da 225. ¿VCC?', ['Unos 5 V', 'Unos 3,3 V', '1,1 V', 'Unos 2,25 V'], '1,1 × 1024 / 225 ≈ 5,0 V.'));
  altV('av_uart', 'Tócalo: relojes que se separan', 'Cambia la diferencia entre los relojes: las marcas del receptor se alejan del centro de cada bit, y el bit de parada es el que más se aleja.', tv('av_drift', { e: pSl('Diferencia de relojes', 3, -6, 6, 0.5, '%', 1) }), mcq('¿En qué bit es mayor el desfase?', ['En el de parada, el último', 'En el de inicio', 'En b0', 'En todos igual'], 'Se acumula bit a bit.'));
  altV('av_uartrate', 'Tócalo: lo que tarda un print', 'Cambia la longitud del mensaje y los baudios. Cada byte son 10 bits; lo que no cabe en el búfer de 64 hace esperar a print().', tv('av_txbuf', { n: pSl('Bytes del mensaje', 100, 10, 300, 10), baud: { label: 'Baudios', val: 115200, list: [9600, 38400, 115200], dec: 0 } }), mcq('¿Cuánto tarda en salir un mensaje de 100 bytes a 115 200 baudios?', ['Unos 8,7 ms', 'Unos 0,87 ms', 'Unos 87 ms', '100 ms'], '1000 bits / 115 200.'));
  altV('av_uartreg', 'Las cuatro banderas', 'Mira el dibujo: dos banderas dicen «puedes» (RXC0 para leer, UDRE0 para escribir) y dos dicen «algo fue mal» (FE0 y DOR0).', { svg: SV_UFLAGS }, mcq('¿Qué bandera avisa de que se perdió un byte recibido?', ['DOR0', 'FE0', 'UDRE0', 'RXC0'], 'Data OverRun.'));
  altV('av_uartwire', 'El cruce, dibujado', 'Sigue las líneas: el TX de uno llega al RX del otro, y al revés. La masa va directa, sin cruzar.', { svg: SV_UWIRE }, mcq('¿Hace falta unir las masas?', ['Sí: sin masa común, los niveles no tienen referencia', 'No', 'Solo a 3,3 V', 'Solo con cables largos'], 'Las tensiones se miden respecto a masa.'));
  altV('av_bus', 'Tócalo: el anillo SPI', 'Da pulsos de reloj y mira cómo los bits pasan de un registro al otro. Tras 8, se han intercambiado.', tv('av_spi', { m: pSl('Byte del maestro', 255, 0, 255), s: pSl('Byte del esclavo', 0, 0, 255), k: pSl('Pulsos de reloj', 2, 0, 8) }), mcq('Tras 8 pulsos de reloj, ¿qué tiene el maestro en su registro?', ['El byte que tenía el esclavo', 'Su propio byte', 'Ceros', 'Unos'], 'SPI siempre intercambia.'));
  altV('av_i2c', 'Tócalo: la subida de la línea', 'Cambia la pull-up, la capacidad del bus y la velocidad. La línea sube como un RC: si tarda más que el máximo, el bus falla.', tv('av_i2c', { R: { label: 'Pull-up', val: 10000, list: [1000, 2200, 4700, 10000, 47000], fmt: 'R' }, C: pSl('Capacidad del bus', 150, 50, 400, 10, 'pF'), f: { label: 'Velocidad', val: 400000, list: [100000, 400000], unit: 'Hz', dec: 0 } }), mcq('Si subes de 100 a 400 kHz, la pull-up debe ser…', ['Más baja (más fuerte)', 'Más alta', 'Igual', 'Innecesaria'], 'Hay menos tiempo para subir.'));
  altV('av_acomp', 'Tócalo: el vigilante', 'Baja la batería o cambia el divisor: el aviso salta cuando la tensión tras el divisor baja de 1,1 V.', tv('av_acomp', { vbat: pSl('Batería', 4, 3, 5.5, 0.05, 'V', 2), k: { label: 'Divisor', val: 0.5, list: [0.2, 0.25, 1 / 3, 0.5], dec: 2 } }), mcq('Divisor ×0,5 y referencia de 1,1 V: ¿umbral?', ['2,2 V', '0,55 V', '1,1 V', '4,4 V'], '1,1 / 0,5.'));
  // Energía y fiabilidad
  altV('av_wdt', 'Tócalo: el perro guardián', 'Cambia el plazo y lo que tarda loop(). Si el diente de sierra llega a la línea roja antes del wdt_reset(), el chip se reinicia.', tv('av_wdt', { to: { label: 'Plazo', val: 1, list: [0.016, 0.032, 0.064, 0.125, 0.25, 0.5, 1, 2, 4, 8], unit: 's', dec: 3 }, loop: pSl('loop() tarda', 700, 10, 3000, 10, 'ms') }), mcq('Plazo de 1 s y un loop() de 1,5 s: ¿qué pasa?', ['Se reinicia', 'Nada', 'Se para', 'Va más rápido'], 'No llega a tiempo al wdt_reset().'));
  altV('av_sleepmode', 'Tócalo: qué se apaga', 'Recorre los modos: cada uno para más bloques. Elige el más profundo que conserve lo que necesitas.', tv('av_smode', { m: pSl('Modo (0 = despierto … 4 = power-down)', 2, 0, 4) }), mcq('¿En qué modo sigue el Timer2 con su cristal pero no la USART?', ['Power-save', 'Idle', 'Power-down', 'ADC Noise Reduction'], 'Power-save = power-down + Timer2.'));
  altV('av_leak', 'Tócalo: cazar consumos', 'Enciende y apaga lo que queda vivo al dormir y mira el total. El núcleo solo gasta unos 0,1 µA: lo demás es lo que te dejaste.', tv('av_leak', { adc: L01('ADC', 0), bod: L01('BOD', 1), wdt: L01('Watchdog', 0), flot: L01('Entradas flotantes', 0) }), mcq('¿Qué suele gastar más dormido si te lo olvidas encendido?', ['El ADC', 'El núcleo', 'La Flash', 'El cristal parado'], 'Cientos de µA aunque no convierta.'));
  altV('av_wake', 'Tócalo: quién despierta', 'Elige el modo y la fuente. Lo que necesita reloj (flancos, USART, Timer1) solo despierta desde Idle.', tv('av_wake', { mode: pSl('Modo (0 = Idle, 1 = Power-save, 2 = Power-down)', 2, 0, 2), src: pSl('Fuente', 0, 0, 6) }), mcq('¿Despierta un byte por la USART al chip en power-down?', ['No: solo desde Idle', 'Sí', 'Solo por nivel', 'Solo con el watchdog'], 'La USART necesita el reloj de E/S.'));
  altV('av_reset', 'La caja negra, dibujada', 'Cada causa de reinicio tiene su bit en MCUSR. Si hay varias sin borrar, el valor es la suma de las que estén a 1.', { svg: SV_MCUSR }, mcq('MCUSR = 0x02. ¿Causa?', ['La pata RESET (EXTRF)', 'El encendido', 'Un brown-out', 'El watchdog'], 'Bit 1 = EXTRF.'));
  altV('av_sleep', 'Tócalo: el presupuesto', 'Mueve corrientes y tiempos y mira la barra: qué parte de la carga se va despierto y qué parte dormido.', tv('av_sleep', sleepP()), mcq('Media de 100 µA con una batería de 2500 mAh: ¿autonomía ideal?', ['Unos 2,9 años', 'Unos 25 días', '250 horas', 'Unos 29 años'], '2500 / 0,1 = 25 000 h.'));
  // El chip fuera de la placa y herramientas
  altV('av_boot', 'El mapa de la Flash', 'Mira el dibujo: tu programa empieza al principio de la Flash y el bootloader ocupa los últimos 512 bytes. Tras un reset, BOOTRST hace que arranque él primero.', { svg: SV_FLASHMAP }, mcq('¿Dónde vive Optiboot?', ['Al final de la Flash: 512 bytes', 'En la EEPROM', 'En la SRAM', 'Al principio de la Flash'], 'La sección de arranque está arriba.'));
  altV('av_fuse', 'Tócalo: el fusible low', 'Cambia los bits y mira el byte y el reloj que resulta. Recuerda: naranja = 0 = programado.', tv('av_fuse', { div: L01('CKDIV8 (0 = divide entre 8)', 1), ckout: L01('CKOUT (0 = reloj por PB0)', 1), sut: pSl('SUT1:0', 2, 0, 3), cksel: { label: 'CKSEL3:0', val: 2, list: [0, 2, 3, 4, 6, 7, 15], dec: 0 } }), mcq('Low = 0xE2: ¿a qué frecuencia va el chip?', ['8 MHz (RC interno sin dividir)', '1 MHz', '16 MHz', '128 kHz'], 'CKSEL = 0010 y CKDIV8 sin programar.'));
  altV('av_isp', 'Tócalo: las patas del ISP', 'Busca MOSI (17), MISO (18), SCK (19) y RESET (1). Con RESET a 0, el chip escucha al programador por esas patas.', tv('av_dip', { pata: pSl('Pata', 17, 1, 28), n: fx(28) }), mcq('¿Qué pata del DIP-28 lleva el SCK del ISP?', ['19', '17', '18', '1'], 'SCK = PB5 = pata 19.'));
  altV('av_tiny', 'Tócalo: el ATtiny85', 'Recorre sus 8 patas: VCC y GND en esquinas opuestas, RESET en la 1 y PB0–PB4 repartidas.', tv('av_dip', { pata: pSl('Pata', 1, 1, 8), n: fx(8) }), mcq('¿Qué pata del ATtiny85 es GND?', ['4', '8', '1', '5'], 'VCC es la 8 y GND la 4.'));
  altV('av_tool', 'La cadena, dibujada', 'Sigue las flechas: del .c al .elf con avr-gcc, del .elf al .hex con avr-objcopy y del .hex al chip con avrdude.', { svg: SV_CHAIN }, mcq('¿Qué herramienta convierte el .elf en .hex?', ['avr-objcopy', 'avrdude', 'avr-size', 'make'], 'objcopy copia el contenido en otro formato.'));
  altV('av_make', 'El árbol de dependencias', 'Mira el dibujo: el .hex depende del .elf, y el .elf de los .o. Si cambia main.c, make rehace main.o y todo lo que está por encima; pantalla.o se queda como estaba.', { svg: SV_MAKE }, mcq('Cambias main.c. ¿Qué se rehace?', ['main.o, main.elf y main.hex', 'Todo', 'Solo main.hex', 'Nada'], 'Lo que depende de main.c, directa o indirectamente.'));
  altV('av_asm', 'Tócalo: instrucción a instrucción', 'Mira cuánto aporta cada instrucción del bucle: ldi una vez, dec n veces, brne n − 1 veces saltando (2 ciclos) y una sin saltar (1 ciclo).', tv('av_loop', { n: pSl('n', 20, 1, 255), f: { label: 'Reloj', val: 16, list: [1, 8, 16, 20], unit: 'MHz', dec: 0 } }), mcq('¿Qué hace brne bucle?', ['Salta a bucle si el resultado anterior no fue cero', 'Salta siempre', 'Salta si fue cero', 'Pone a 0 el registro'], 'Branch if Not Equal: mira la bandera Z.'));

  TRACKS.push({
    id: 'avr',
    title: 'Arduino y AVR a fondo',
    short: 'AVR',
    desc: 'El ATmega328P registro a registro: temporizadores, interrupciones, periféricos, bajo consumo y el chip suelto en tu propia placa.',
    color: '#13A3A0',
    icon: 'chip',
    level: 'Intermedio → avanzado',
    units: [
M1,
M2,
M3,
M4,
M5,
M6,
M7,
M8
    ]
  });
})();
