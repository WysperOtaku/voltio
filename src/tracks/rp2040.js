/* Voltio · especialidad: Raspberry Pi Pico (RP2040 y RP2350).
   De Arduino a MicroPython, y de ahí al SDK en C, el PIO, el DMA, los dos núcleos, USB,
   WiFi/BLE, bajo consumo y tu propia placa. Texto, ejercicios, programas y proyectos originales. */
(() => {
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const { num } = Widgets.H;
  const fHz = f => f >= 1e6 ? num(f / 1e6, 3) + ' MHz' : f >= 1e3 ? num(f / 1e3, 2) + ' kHz' : num(f, 2) + ' Hz';

  /* ===================== CONCEPTOS ===================== */
  Object.assign(CONCEPTS, {
    /* ---------- M1 · La placa y el chip ---------- */
    rp_board: { name: 'Qué lleva el RP2040', alts: [
      { title: 'Un chip y piezas alrededor', text: 'El RP2040 lleva dentro <b>dos núcleos Cortex-M0+ de 32 bits</b>, <b>264 KB de RAM</b>, una ROM de arranque y los periféricos (USB, ADC, PWM, PIO…). Lo que <b>no</b> lleva es flash: tu programa vive en un chip QSPI aparte (2 MB en la Pico) y se lee sobre la marcha gracias a una caché (XIP).\nEl nombre lo resume: RP · 2 núcleos · 0 = tipo M0+ · 4 = cantidad de RAM · 0 = sin flash interna.', q: mcq('¿Dónde se guarda tu programa en una Pico?', ['En una flash QSPI externa al RP2040', 'En una flash interna del RP2040', 'En la SRAM, y se pierde al apagar', 'En la ROM de arranque'], 'Sin flash externa, el RP2040 solo puede arrancar en modo BOOTSEL desde su ROM.') },
      { title: 'Comparado con la Uno', text: 'ATmega328P: un núcleo de <b>8 bits</b> a 16 MHz, 2 KB de RAM, 32 KB de flash dentro del chip, pines de 5 V.\nRP2040: <b>dos núcleos de 32 bits</b> a 133 MHz (hoy certificados hasta 200 MHz), 264 KB de RAM (132 veces más), flash fuera y pines de <b>3,3 V</b>.\nUn núcleo de 32 bits suma dos números de 32 bits en una instrucción; el AVR encadena cuatro sumas de 8 bits. Y la Pico se programa en MicroPython, en C/C++ con el SDK oficial o con el entorno de Arduino.', q: mcq('¿Qué tiene el ATmega328P de la Uno que el RP2040 no tiene?', ['Memoria flash dentro del chip', 'Más RAM', 'Núcleos de 32 bits', 'Un controlador USB'], 'La Uno guarda el programa dentro del ATmega; el RP2040 lo lee de una flash externa.') }
    ] },
    rp_drive: { name: 'Corriente de un GPIO y cargas grandes', alts: [
      { title: 'El pin da la orden, no la fuerza', text: 'Un GPIO del RP2040 da unos <b>4 mA</b> por defecto, configurable hasta <b>12 mA</b>. Basta para un LED, no para un relé, un motor o una tira de LEDs.\nPara eso el pin gobierna un <b>transistor o MOSFET</b>, que conduce la corriente grande desde otra alimentación. Con cargas inductivas (relés, motores) añade un <b>diodo de rueda libre</b>.', q: mcq('Un motor pequeño consume 200 mA. ¿Cómo lo enciendes desde la Pico?', ['Con un MOSFET o transistor gobernado por el GPIO, y un diodo de rueda libre', 'Directamente del GPIO configurado a 12 mA', 'Con dos GPIO en paralelo', 'Desde la pata RUN'], 'El GPIO solo da la señal de control.') },
      { title: 'Haz las cuentas', text: 'Compara lo que pide la carga con lo que da el pin. Un relé típico pide 70–90 mA; el GPIO, 12 mA como mucho: de 6 a 8 veces menos. El pin no puede.\nCon un transistor, el GPIO solo aporta la corriente de base (o carga la puerta de un MOSFET), del orden de 1 mA.', q: mcq('Un zumbador consume 30 mA. ¿Lo conectas directo a un GPIO configurado a 12 mA?', ['No: pide más de lo que da el pin; usa un transistor', 'Sí, 30 mA es poco', 'Sí, si pones una resistencia de 10 Ω', 'Sí, con el pull-up activado'], '30 mA supera los 12 mA máximos del pin.') }
    ] },
    rp_family: { name: 'La familia Pico: RP2040, RP2350 y la W', alts: [
      { title: 'Cuatro placas, dos chips', text: '<b>Pico</b> = RP2040. <b>Pico W</b> = RP2040 + radio CYW43439 (WiFi a 2,4 GHz y Bluetooth). <b>Pico 2</b> = RP2350. <b>Pico 2 W</b> = RP2350 + la misma radio.\nEn las W, el chip principal habla con la radio por <b>SPI</b> a través de pines internos, y el LED de la placa cuelga de la radio: por eso, al programar, ese LED tiene un nombre especial.\nLas Pico 2 llevan el RP2350: más RAM, coma flotante por hardware y la opción de núcleos RISC-V, con su propio firmware.', q: mcq('¿Qué placa eliges si necesitas WiFi y coma flotante por hardware?', ['Pico 2 W', 'Pico W', 'Pico 2', 'Pico'], 'La radio la dan las W; la coma flotante, el RP2350.') },
      { title: 'Qué gana el RP2350', text: 'Frente al RP2040: núcleos <b>Cortex-M33 a 150 MHz con coma flotante</b> por hardware (o, si lo eliges al arrancar, dos núcleos <b>RISC-V</b> Hazard3), <b>520 KB</b> de SRAM (256 KB más), <b>3 bloques PIO</b> en vez de 2, más canales de PWM y DMA y funciones de seguridad.\nEs otro chip: necesita su propio firmware. El .uf2 de una Pico no vale para una Pico 2.\nY las versiones W de las dos añaden la radio, conectada por SPI, que también controla el LED de la placa.', q: mcq('Tienes el UF2 de MicroPython para Pico y una Pico 2. ¿Qué haces?', ['Descargar el UF2 específico de la Pico 2', 'Grabar el de la Pico: es el mismo', 'Renombrar el fichero', 'Grabarlo dos veces'], 'El UF2 lleva el identificador de familia del chip y la ROM rechaza el que no es suyo.') }
    ] },
    rp_pinout: { name: 'Pinout: números de GPIO y funciones', alts: [
      { title: 'Número de GPIO, no de pata', text: 'La Pico tiene 40 patas numeradas físicamente, pero en el código siempre usas el <b>número de GPIO</b>: GP15, que está en la pata 20, es el 15.\nAlgunos GPIO no salen al conector porque la placa los usa: <b>GP23</b> (modo del regulador), <b>GP24</b> (detecta VBUS), <b>GP25</b> (LED) y <b>GP29</b> (VSYS / 3 para el ADC).\nAdemás, cada periférico solo sale por ciertos GPIO: I²C0 e I²C1 se alternan por parejas.', q: mcq('En una Pico (no W), ¿a qué está conectado GP25?', ['Al LED de la placa', 'A la pata física 25', 'A la medida de VSYS', 'A nada: GP25 no existe'], 'GP25 no sale al conector: va al LED.') },
      { title: 'Funciones en grupos fijos', text: 'Cada periférico solo sale por ciertos GPIO. En I²C el patrón va por parejas que alternan: GP0–GP1 son I²C0, GP2–GP3 I²C1, GP4–GP5 I²C0, GP6–GP7 I²C1, y así sucesivamente.\nSi eliges pines del otro bloque, el periférico no los ve: cambia el número de bus o los pines. Mira el pinout antes de soldar, y recuerda que en el código se usa el número GP, no el de la pata física.', q: mcq('Un sensor lleva SDA en GP2 y SCL en GP3. ¿Qué bloque de I²C usas?', ['I²C1', 'I²C0', 'Cualquiera de los dos', 'Ninguno: GP2 no tiene I²C'], 'GP2 y GP3 están en el bloque I²C1.') }
    ] },
    rp_adcch: { name: 'Canales del ADC', alts: [
      { title: 'Cinco canales', text: 'El ADC del RP2040 tiene 5 canales: del <b>0 al 3</b> en GP26, GP27, GP28 y GP29, y el <b>4</b> conectado al sensor de temperatura interno.\nEn la Pico solo salen al conector <b>GP26–GP28</b>; GP29 mide VSYS / 3. En MicroPython (módulo 3), ADC(26) y ADC(0) son lo mismo: puedes dar el pin o el canal.', q: mcq('¿Qué mide el canal 4 del ADC?', ['El sensor de temperatura interno', 'La tensión de GP4', 'VSYS a través de GP29', 'VBUS'], 'El canal 4 no tiene pin: es el sensor del chip.') },
      { title: 'Cuenta desde GP26', text: 'Canal = número de GPIO − 26: GP26 → 0, GP27 → 1, GP28 → 2, GP29 → 3.\nNingún otro GPIO tiene ADC en el RP2040: si conectas un sensor analógico a GP15, no podrás leerlo con ADC.', q: mcq('¿Qué canal del ADC es GP28?', ['2', '28', '0', '3'], '28 − 26 = 2.') }
    ] },
    rp_levels: { name: 'Niveles de 3,3 V y 5 V', alts: [
      { title: 'El techo de los pines', text: 'Los GPIO del RP2040 trabajan a <b>3,3 V</b> y su máximo absoluto es la alimentación de E/S más 0,5 V. Una señal de 5 V puede dañarlos: bájala con un <b>divisor</b> o un <b>adaptador de nivel</b>.\nEl RP2350 es más tolerante: sus GPIO digitales aguantan 5 V <b>con el chip alimentado</b>, salvo los que pueden ser ADC. Sus salidas siguen siendo de 3,3 V.', q: mcq('Un módulo de 5 V envía datos por su TX a una Pico (RP2040). ¿Qué pones en medio?', ['Un divisor o un adaptador de nivel hacia 3,3 V', 'Nada', 'Un pull-up a 5 V', 'Un condensador de 100 nF'], 'Los 5 V superan el máximo del pin.') },
      { title: 'Hacia arriba, mira los umbrales', text: 'De 3,3 V hacia un chip de 5 V puede bastar con conectar, si su entrada acepta 3,3 V como nivel alto.\nLos <b>74HCT</b> (y AHCT) reconocen un 1 desde unos 2 V: entienden a la Pico. Un <b>74HC</b> a 5 V, en cambio, pide alrededor de 3,5 V: con 3,3 V queda en tierra de nadie.\nEn sentido contrario, de 5 V hacia un RP2040, siempre divisor o adaptador.', q: mcq('¿Entiende un 74HC (no HCT) alimentado a 5 V el 1 de 3,3 V de la Pico?', ['No es fiable: pide unos 3,5 V para un nivel alto', 'Sí, siempre', 'Sí, con un pull-down', 'Solo a baja frecuencia'], 'Por eso se usan los HCT como adaptadores de 3,3 a 5 V.') }
    ] },
    rp_i2c: { name: 'El bus I²C: pull-ups y direcciones', alts: [
      { title: 'Dos hilos y unos muelles', text: 'En I²C, SDA y SCL solo se pueden <b>bajar</b>: las suben resistencias de <b>pull-up</b>. Las internas de la Pico (50–80 kΩ) son demasiado débiles para 400 kHz o cables largos: los flancos suben despacio. Pon 2,2–4,7 kΩ externas (muchos módulos ya las traen).\nCada dispositivo responde a su <b>dirección</b> de 7 bits, y así varios comparten los dos hilos.', q: mcq('El bus funciona a 100 kHz con cables cortos pero falla a 400 kHz. ¿Qué pruebas primero?', ['Pull-ups externas más fuertes, como 2,2 kΩ', 'Quitar las pull-ups', 'Poner pull-downs', 'Alimentar el bus a 5 V'], 'Pull-ups más bajas suben los flancos más deprisa.') },
      { title: 'Diagnóstico con scan()', text: 'i2c.scan() pregunta a todas las direcciones y devuelve una lista <b>en decimal</b>: [118] es 0x76 y [60] es 0x3C.\nSi sale [], nadie contesta: revisa alimentación, masa común, SDA y SCL no intercambiados y pull-ups. Casi siempre es cableado.', q: mcq('i2c.scan() devuelve [60]. ¿Qué dirección es en hexadecimal?', ['0x3C', '0x60', '0x3A', '0x1E'], '60 = 3 × 16 + 12 = 0x3C, típica de una pantalla SSD1306.') }
    ] },
    rp_struct: { name: 'Números dentro de bytes', alts: [
      { title: 'Tamaño, signo y orden', text: 'Un sensor o un protocolo te da bytes, no números. Para leerlos necesitas tres datos: <b>cuántos bits</b> (8, 16, 32), si llevan <b>signo</b> y en qué <b>orden</b> van los bytes (big-endian: el alto primero; little-endian: el bajo primero).\nEn struct: \'>h\' = 16 bits con signo, alto primero; \'&lt;H\' = sin signo, bajo primero. Con 16 bits con signo cabe de −32 768 a 32 767.', q: mcq('¿Qué formato de struct usas para 16 bits sin signo con el byte bajo primero?', ['<H', '>h', '>H', '<h'], '< es little-endian; H mayúscula, sin signo.') },
      { title: 'Escalar a entero', text: 'Muchos protocolos envían decimales como <b>enteros escalados</b>. Si la unidad es la centésima de grado, 23,57 °C se envía como 2357; al recibir, divides entre 100. Al leer, struct.unpack(\'>h\', b) dice tamaño, signo y orden de los bytes.\nEl rango sale del tipo: con 16 bits con signo, de −32 768 a 32 767 centésimas, es decir, de −327,68 a 327,67 °C.', q: mcq('Un protocolo envía la humedad en centésimas de % en un entero de 16 bits. ¿Qué número envías para 45,2 %?', ['4520', '452', '45', '45200'], '45,2 × 100 = 4520.') }
    ] },
    rp_buses: { name: 'I²C, SPI y UART: cuál es cuál', alts: [
      { title: 'Tres formas de hablar', text: '<b>I²C</b>: dos hilos compartidos, un chip por dirección, con pull-ups.\n<b>SPI</b>: reloj, MOSI y MISO compartidos y un <b>CS</b> por chip: bajas el CS del que quieres oír, hablas y lo subes.\n<b>UART</b>: TX y RX cruzados, sin reloj, los dos extremos al mismo baudio. Los aparatos de texto (GPS, módems) envían líneas que lees con readline().', q: mcq('Tienes dos chips SPI en el mismo bus. ¿Cómo eliges con cuál hablas?', ['Bajando solo el CS de ese chip durante la transacción', 'Por su dirección, como en I²C', 'Cambiando el baudio', 'Cruzando MOSI y MISO'], 'Los chips con el CS alto ignoran el bus.') },
      { title: 'Por los síntomas', text: '¿Varios chips con dos hilos y direcciones? I²C. ¿Rápido y con un pin de selección por chip? SPI. ¿Dos hilos que se cruzan y un baudio acordado? UART.\nEn MicroPython la UART se lee sin bloquear: <b>uart.any()</b> dice cuántos bytes esperan y <b>uart.readline()</b> devuelve una línea entera cuando llega el salto de línea.', q: mcq('Un módulo envía texto terminado en salto de línea a 115 200 baudios. ¿Qué bus es y cómo lo lees?', ['UART, con readline() cuando any() indique datos', 'I²C, con scan()', 'SPI, con read(115200)', '1-Wire, con readline()'], 'El baudio delata a la UART.') }
    ] },
    rp_power: { name: 'Pines de alimentación de la Pico', alts: [
      { title: 'Cinco patas', text: '<b>VBUS</b>: los 5 V del USB, solo con cable.\n<b>VSYS</b>: entrada del regulador buck-boost, de 1,8 a 5,5 V: aquí van pilas y baterías.\n<b>3V3(OUT)</b>: la salida de 3,3 V para sensores ligeros (mejor por debajo de unos 300 mA); nunca una entrada.\n<b>3V3_EN</b> a masa apaga el regulador. <b>RUN</b> a masa reinicia el RP2040.', q: mcq('Quieres un botón de reinicio. ¿Entre qué patas lo pones?', ['Entre RUN y GND', 'Entre 3V3_EN y VSYS', 'Entre VBUS y GND', 'Entre 3V3(OUT) y VSYS'], 'RUN a masa reinicia; al soltar, arranca de nuevo.') },
      { title: 'Entrada, regulador, salida', text: 'Piensa en un grifo: VSYS es la tubería de entrada, el buck-boost es el grifo que deja salir siempre 3,3 V y 3V3(OUT) es el caño.\nComo el buck-boost <b>sube o baja</b> la tensión, aprovecha una celda de litio o pilas casi gastadas. Meter tensión por el caño (5 V en 3V3) se salta el regulador y puede destruir el chip; pedirle demasiado al caño (cientos de mA) lo calienta y hunde la tensión.\nDos patas más: RUN a masa reinicia el chip y 3V3_EN a masa apaga el regulador.', q: mcq('Alimentas la Pico con dos pilas AA (unos 3 V). ¿Dónde las conectas?', ['A VSYS: el buck-boost lo convierte en 3,3 V', 'A 3V3(OUT)', 'A VBUS', 'A un GPIO'], 'VSYS admite de 1,8 a 5,5 V.') }
    ] },
    rp_schottky: { name: 'Diodo Schottky entre batería y VSYS', alts: [
      { title: 'Gana el más alto', text: 'Para usar USB y batería a la vez, la batería entra en VSYS a través de un diodo, igual que VBUS ya lo hace en la placa. Los dos diodos forman una «O»: conduce la fuente más alta y ninguna empuja corriente hacia la otra.\nSe elige un <b>Schottky</b> porque cae unos <b>0,3 V</b>; un diodo de silicio como el 1N4007 cae unos 0,7 V.', q: mcq('¿Qué pasaría sin diodo entre la batería y VSYS al enchufar el USB?', ['El USB podría empujar corriente hacia la batería', 'Nada', 'La batería se cargaría correctamente', 'La Pico iría más rápido'], 'El diodo impide que una fuente alimente a la otra.') },
      { title: 'Cada décima cuenta', text: 'Tres pilas AA nuevas dan unos 4,5 V. Con un Schottky llegan a VSYS unos <b>4,2 V</b>; con un 1N4007, unos <b>3,8 V</b>.\nCuando las pilas se gastan, esos 0,4 V de diferencia deciden cuánto antes deja de funcionar el montaje.', q: mcq('Una LiPo a 3,4 V llega a VSYS a través de un Schottky. ¿Qué tensión ves en VSYS?', ['Unos 3,1 V', 'Unos 2,7 V', '3,4 V exactos', 'Unos 3,7 V'], '3,4 − 0,3 = 3,1 V.') }
    ] },
    rp_vsys: { name: 'Medir VSYS con el ADC', alts: [
      { title: 'El divisor ÷3', text: 'En la Pico, VSYS llega a <b>GP29</b> (canal 3 del ADC) a través de un divisor que lo <b>divide entre 3</b>, para que nunca supere los 3,3 V del ADC.\nPara saber VSYS: calcula la tensión en el pin y <b>multiplica por 3</b>. Por ejemplo, 1,40 V en el pin son 4,20 V en VSYS.', q: mcq('En GP29 mides 1,10 V. ¿Cuánto vale VSYS?', ['3,30 V', '0,37 V', '1,10 V', '4,40 V'], '1,10 × 3 = 3,30 V.') },
      { title: 'Ida y vuelta', text: 'De VSYS al pin se divide entre 3; del pin a VSYS se multiplica por 3. Ejemplos: 4,5 V en VSYS dan 1,5 V en GP29; 1,2 V en GP29 son 3,6 V de VSYS.\nOlvidar el × 3 al volver es el error típico: con 1,2 V en VSYS la Pico ni arrancaría.', q: mcq('En GP29 lees 1,4 V. ¿Cuánto vale VSYS?', ['4,2 V', '1,4 V', '0,47 V', '2,8 V'], '1,4 × 3 = 4,2 V.') }
    ] },
    rp_boot: { name: 'Arranque: BOOTSEL y UF2', alts: [
      { title: 'La ROM decide', text: 'Al encender, la <b>ROM</b> busca un programa válido en la flash. Si mantienes <b>BOOTSEL</b>, el botón pone a masa el CS de la flash, la ROM no la ve y entra en modo USB: aparece la unidad RPI-RP2.\nArrastras el .uf2, la ROM lo graba y reinicia: la unidad desaparece, y es lo normal. Como la ROM no se puede borrar, siempre puedes volver a este modo; para limpiar la flash entera existe un UF2 de borrado total.\nEl UF2 va en bloques de 256 bytes útiles, cada uno con su dirección.', q: mcq('Un main.py defectuoso no te deja trabajar y Ctrl+C no lo para. ¿Qué haces?', ['BOOTSEL, grabar el UF2 de borrado total y reinstalar MicroPython', 'Tirar la placa', 'Pulsar RUN muchas veces', 'Dejarla desconectada un día'], 'El modo BOOTSEL vive en la ROM y siempre responde.') },
      { title: 'Siempre puedes volver', text: 'La ROM del chip no se puede borrar, y es ella la que decide al arrancar. Entra en modo USB (la unidad RPI-RP2) en dos casos: si BOOTSEL está pulsado o si la flash no tiene un programa válido.\nPor eso ningún programa puede dejar la Pico inservible: BOOTSEL siempre responde.', q: mcq('Enciendes una Pico con la flash recién borrada y sin pulsar nada. ¿Qué ves?', ['La unidad RPI-RP2', 'Nada: hay que pulsar BOOTSEL', 'Un error de la ROM', 'El último programa'], 'Sin programa válido, la ROM se queda en modo USB.') }
    ] },
    rp_flash: { name: 'La flash: borrado, XIP y desgaste', alts: [
      { title: 'Borrar es lento y bloquea', text: 'La flash se borra por <b>sectores</b> (4 KB) y se escribe por páginas, y mientras lo hace <b>no se puede leer</b>. Como el programa se ejecuta desde la flash (XIP), si un núcleo graba, el otro no puede estar leyendo código de ella: hay que pausarlo o que ejecute desde la RAM.\nAdemás, cada sector aguanta un número limitado de borrados.', q: mcq('¿Por qué hay que pausar el otro núcleo mientras uno borra un sector de la flash?', ['Porque la flash no se puede leer mientras se borra, y el otro ejecuta código desde ella', 'Para ahorrar energía', 'Porque también se borra la RAM', 'No hace falta'], 'El SDK trae funciones para pausar el otro núcleo durante la escritura.') },
      { title: 'Ciclos contados', text: 'Cada sector de la flash aguanta del orden de <b>100 000 borrados</b>. Si escribes una línea cada pocos milisegundos, el sistema de ficheros borra y reescribe sectores sin parar y en semanas o meses puede agotarlos.\nSolución: acumula los datos en RAM y escríbelos por bloques, cada minuto o más.', q: mcq('Un registrador mide una vez por segundo. ¿Cómo cuidas la flash?', ['Acumular en RAM y escribir un bloque cada pocos minutos', 'Escribir cada segundo con with open', 'Abrir y cerrar el fichero en cada medida', 'Usar print en lugar de write'], 'Menos escrituras, menos borrados de sector.') }
    ] },

    /* ---------- M2 · MicroPython ---------- */
    rp_repl: { name: 'El REPL y Thonny', alts: [
      { title: 'Una consola dentro de la placa', text: 'Tras <b>>>></b> escribes una línea y la Pico la ejecuta al momento. Teclas: <b>Ctrl+C</b> interrumpe el programa en marcha, <b>Ctrl+D</b> hace un reinicio suave, <b>Tab</b> autocompleta y la <b>flecha arriba</b> recupera la orden anterior. En Thonny, el botón Stop equivale a Ctrl+C. Y para explorar: dir(objeto) o machine.freq().', q: mcq('Tu programa está en un bucle infinito. ¿Qué tecla te devuelve el >>>?', ['Ctrl+C', 'Ctrl+D', 'Tab', 'Flecha arriba'], 'Ctrl+C lanza KeyboardInterrupt dentro del programa.') },
      { title: 'Preguntar a la placa', text: 'El REPL sirve para explorar sin escribir un programa: <b>machine.freq()</b> da el reloj del sistema en Hz, <b>gc.mem_free()</b> la RAM libre (tras import gc), <b>dir(Pin)</b> qué métodos tiene un Pin y <b>help(\'modules\')</b> los módulos disponibles.\nPruebas una línea, ves el resultado y luego la pasas a tu programa. Si algo se queda en bucle, Ctrl+C te devuelve el >>>.', q: mcq('¿Qué escribes en el REPL para saber cuánta RAM queda libre?', ['import gc y luego gc.mem_free()', 'machine.freq()', 'dir(Pin)', "help('modules')"], 'machine.freq() da el reloj, no la memoria.') }
    ] },
    rp_mainpy: { name: 'boot.py, main.py y /lib', alts: [
      { title: 'Lo que arranca solo', text: 'Al encender, MicroPython monta su sistema de ficheros en la flash, ejecuta <b>boot.py</b> si existe y luego <b>main.py</b>; si main.py termina, queda el REPL.\nEjecutar con F5 en Thonny corre el programa una vez sin dejarlo en la placa: solo lo guardado como main.py arranca solo. Las bibliotecas (ssd1306.py, por ejemplo) van en la raíz o en <b>/lib</b> para que import las encuentre.', q: mcq('Desconectas la placa del PC y la alimentas con pilas. ¿Qué se ejecuta?', ['boot.py y main.py, si están guardados en la placa', 'Lo último que ejecutaste con F5', 'Nada: necesita Thonny', 'Todos los .py de la placa'], 'main.py es lo que hace autónomo un proyecto.') },
      { title: 'Una puerta de escape', text: 'Si main.py entra en un bucle que no te deja trabajar, Ctrl+C desde Thonny suele bastar. Más seguro: al principio de main.py, lee un botón y llama a <b>sys.exit()</b> si está pulsado. Así, arrancar con el botón apretado te deja el REPL libre.\nRecuerda el orden: boot.py, main.py y, si main.py termina, el REPL; las bibliotecas, en la raíz o en /lib.', q: mcq('main.py empieza con if boton.value() == 0: sys.exit() (botón a masa con pull-up). Enciendes sin pulsar. ¿Qué pasa?', ['El programa sigue con normalidad', 'Termina y queda el REPL', 'Se borra la flash', 'Da error'], 'Sin pulsar, el pull-up da 1 y la condición no se cumple.') }
    ] },
    rp_pyops: { name: 'Operadores numéricos de Python', alts: [
      { title: 'Tres divisiones y una potencia', text: '<b>/</b> siempre da float: 7 / 2 = 3.5 y 6 / 2 = 3.0.\n<b>//</b> da el cociente entero: 7 // 2 = 3. <b>%</b> da el resto: 7 % 2 = 1.\n<b>**</b> es la potencia: 2 ** 10 = 1024. Ojo: ^ no es potencia, es la o exclusiva de bits.', q: mcq('¿Qué imprime print(17 // 5, 17 % 5)?', ['3 2', '3.4 2', '3 3', '2 3'], '17 = 3 × 5 + 2.') },
      { title: 'Repartir caramelos', text: '17 caramelos entre 5 niños: cada uno recibe 17 // 5 = 3 y sobran 17 % 5 = 2. La división exacta, 17 / 5 = 3.4.\nÚtil en la placa: segundos // 60 son los minutos y segundos % 60, los segundos que quedan.', q: mcq('¿Qué imprime print(2 ** 3, 2 ^ 3)?', ['8 1', '8 8', '6 1', '8 5'], '** es potencia; ^ hace la o exclusiva: 0b10 ^ 0b11 = 0b01.') }
    ] },
    rp_pytypes: { name: 'Tipos: int, float y str', alts: [
      { title: 'Cada valor tiene su tipo', text: '<b>int</b>: enteros sin límite de tamaño (2 ** 40 no desborda, solo ocupa más).\n<b>float</b>: decimales de 32 bits en el RP2040, unas 7 cifras y no siempre exactos (16777217.0 se guarda como 16777216.0), así que compara con un margen.\n<b>str</b>: texto. \'12\' + 3 da TypeError: convierte antes con int(\'12\') o str(3). Para mostrar números, f-strings: f\'{t:.1f}\'.', q: mcq("¿Qué imprime print(int('12') + 3)?", ['15', '123', 'TypeError', '12 3'], 'int() convierte el texto en número antes de sumar.') },
      { title: 'Texto con números', text: 'Para mostrar números dentro de un texto, las <b>f-strings</b>: f\'{t:.1f} C\' pone t con un decimal, redondeado.\nPara operar con texto que contiene números, convierte primero con int() o float(). Y para comparar floats, usa abs(a − b) < 0.001 (un margen a la medida de lo que mides) en lugar de ==, porque los float no son exactos. Los int, en cambio, crecen sin desbordar.', q: mcq("¿Qué imprime print(f'{3.14159:.2f}')?", ['3.14', '3.1', '3.14159', '3'], ':.2f deja dos decimales.') }
    ] },
    rp_bits: { name: 'Bits: máscaras y desplazamientos', alts: [
      { title: 'Pesos de los bits', text: 'El bit n vale 2ⁿ: 1, 2, 4, 8, 16, 32… Una máscara con varios pines es la <b>suma de sus pesos</b>: GP1, GP3 y GP4 → 2 + 8 + 16 = 26 = 0b11010.\nEn hexadecimal cada cifra son 4 bits: 0xFF = 255, y 0xFF + 1 = 256 = 0x100.\nDesplazar a la derecha (>> n) tira los n bits de abajo, y ^ invierte los bits marcados.', q: mcq('¿Qué máscara representa GP0, GP1 y GP7?', ['131', '7', '130', '193'], '1 + 2 + 128 = 131.') },
      { title: 'Mover y combinar', text: '<b>x >> n</b> desplaza n bits a la derecha (divide entre 2ⁿ); <b>x << n</b>, a la izquierda (multiplica). <b>&amp;</b> deja solo los bits comunes, <b>|</b> los une y <b>^</b> invierte los marcados: gpio_xor_mask(1u << 25) invierte GP25 sin tocar el resto.\nPara pasar de 12 a 7 bits de resolución, desplazas 12 − 7 = 5 a la derecha.', q: mcq('¿Qué vale 0b1100_0000 >> 6?', ['3', '192', '12', '6'], 'Los dos unos bajan a las posiciones 1 y 0: 0b11 = 3.') }
    ] },
    rp_python: { name: 'Sintaxis de Python: dos puntos y sangría', alts: [
      { title: 'Bloques por sangría', text: 'En C los bloques van entre llaves. En Python los marca la <b>sangría</b>: todo lo que está más a la derecha después de una línea terminada en dos puntos (<b>:</b>) pertenece a ese if, while, for o def.\nOlvidar los dos puntos da SyntaxError; volver a la sangría anterior cierra el bloque.', q: mcq('¿Qué indica el final de un bloque en Python?', ['Volver a la sangría anterior', 'Una llave de cierre', 'Un punto y coma', 'La palabra end'], 'La sangría no es estética: es la sintaxis.') },
      { title: 'De Arduino a Python', text: 'Un programa de MicroPython se ejecuta de arriba abajo: primero los <b>import</b>, luego lo que en Arduino pondrías en setup() (crear los pines) y por último un <b>while True:</b> (con sus dos puntos) que hace de loop(). Lo que va dentro del bucle, sangrado; lo que vuelve a la izquierda ya está fuera.', q: mcq('¿Dónde va led = Pin(15, Pin.OUT) en un parpadeo?', ['Antes del while True, después de los import', 'Dentro del while True', 'Antes de los import', 'Al final, después del while'], 'Se crea una vez, como en setup().') }
    ] },
    rp_pyflow: { name: 'Seguir if, range y while', alts: [
      { title: 'Las reglas', text: '<b>range(a, b, paso)</b> empieza en a, suma paso y para antes de b: range(1, 10, 4) da 1, 5 y 9. <b>while</b> repite mientras se cumpla la condición, que se comprueba antes de cada vuelta.\nEn un if/elif/else solo se ejecuta la <b>primera</b> rama que se cumple. Las condiciones se combinan con palabras: and, or y not (en C, &&, || y !).', q: mcq('¿Qué valores da range(0, 10, 4)?', ['0, 4 y 8', '0, 4, 8 y 12', '4 y 8', '0, 4, 8 y 10'], 'El siguiente sería 12, que ya no es menor que 10.') },
      { title: 'Haz la traza', text: 'Para saber qué imprime, apunta las variables vuelta a vuelta. Con n = 1 y while n < 10: n *= 3, n vale 1, 3, 9 y 27; con 27 la condición falla y sale.\nEn un if/elif, prueba las condiciones de arriba abajo y quédate con la primera verdadera. En un for con range, escribe la lista de valores antes de empezar.', q: mcq('n = 1; while n < 10: n *= 3. ¿Cuánto vale n al salir?', ['27', '9', '10', '3'], 'Con 9 aún entra; con 27 ya no.') }
    ] },
    rp_pyfunc: { name: 'Funciones: parámetros, return y global', alts: [
      { title: 'Entradas y salidas', text: '<b>def</b> define una función. Sus parámetros pueden tener valor por defecto: con def media(a, b=10), si no pasas b, vale 10.\n<b>return</b> devuelve un valor, o varios separados por comas, que llegan como <b>tupla</b>: lo, hi = extremos(v).\nY si la función debe modificar una variable de fuera, decláralo con global.', q: mcq('def f(a, b=2): return a * b. ¿Qué da f(5)?', ['10', '5', '7', 'Error: falta b'], 'b toma su valor por defecto, 2.') },
      { title: 'Local o global', text: 'Si una función <b>asigna</b> a una variable (cuenta += 1), Python la trata como local de esa función y, como aún no tiene valor, da error. Para modificar la variable del programa, declárala con <b>global cuenta</b> al principio de la función.\nSolo leerla no lo necesita. Lo que la función entrega se devuelve con return (varios valores, como tupla), y los parámetros pueden tener valor por defecto.', q: mcq('Una función solo hace print(limite), una variable global. ¿Necesita global limite?', ['No: solo leer no lo exige', 'Sí, siempre', 'Sí, si es un número', 'No se pueden leer globales'], 'global solo hace falta para asignar.') }
    ] },
    rp_pylist: { name: 'Listas y diccionarios', alts: [
      { title: 'Índices y porciones', text: 'En una lista, los índices empiezan en 0 y los negativos cuentan desde el final: v[-1] es el último. Una porción <b>v[a:b]</b> va de a hasta b sin incluirlo: [10, 20, 30, 40][1:3] es [20, 30]. Una comprensión crea una lista en una línea: [x * 2 for x in range(3)] es [0, 2, 4].\nUn diccionario, en cambio, se consulta por clave.', q: mcq('v = [5, 6, 7, 8]. ¿Qué es v[-2]?', ['7', '6', '8', 'Un error'], '−1 es el último (8); −2, el penúltimo.') },
      { title: 'Por posición o por nombre', text: 'Una lista se consulta por <b>posición</b>; un diccionario, por <b>clave</b>: d = {\'rojo\': 13}. d[\'azul\'] da KeyError si no existe; <b>d.get(\'azul\', -1)</b> devuelve −1 sin fallar.\nPara recorrer una lista transformándola: [x * x for x in range(4)] da [0, 1, 4, 9].', q: mcq("d = {'a': 1}. ¿Qué devuelve d.get('b', 0)?", ['0', 'None', 'KeyError', '1'], 'get devuelve el valor por defecto si no encuentra la clave.') }
    ] },
    rp_pymem: { name: 'RAM en MicroPython: lista frente a array', alts: [
      { title: 'Cajas con etiqueta', text: 'Una lista guarda una referencia de 4 bytes por elemento; los enteros pequeños caben dentro de esa referencia, pero cada float es un objeto aparte de unos 16 bytes más. <b>array(\'H\')</b> guarda los números seguidos, 2 bytes cada uno, como un vector de C.\nCon 10 000 lecturas: 20 KB con array(\'H\'), unos 40 KB con una lista de enteros y unos 200 KB con una lista de float.', q: mcq("¿Cuánto ocupan, más o menos, 5000 lecturas en array('H')?", ['Unos 10 KB', 'Unos 5 KB', 'Unos 40 KB', 'Unos 160 KB'], '5000 × 2 bytes = 10 000 bytes.') },
      { title: 'Elige el tipo por el dato', text: 'En array: \'B\' = 8 bits sin signo, \'H\' = 16 bits sin signo, \'h\' = 16 bits con signo, \'f\' = float de 32 bits. Las lecturas de read_u16() (0–65535) caben justas en \'H\'.\nCon unos 150–200 KB libres, elegir bien el contenedor decide si caben tus datos.', q: mcq('Para guardar lecturas de read_u16() con el mínimo de RAM, ¿qué tipo de array?', ["'H'", "'B'", "'f'", 'Una lista normal'], "'B' no llega a 65535; 'f' gasta 4 bytes.") }
    ] },
    rp_pyerr: { name: 'Excepciones y tracebacks', alts: [
      { title: 'Leer el traceback', text: 'Cuando algo falla, Python lanza una <b>excepción</b>. Si nadie la captura, el programa se para y muestra un <b>traceback</b>: las líneas van de la llamada más externa a la más interna, y la más baja es donde saltó el error. Debajo va el tipo: ZeroDivisionError, OSError, TypeError…\nLos errores salen al ejecutar la línea, no antes. Si un fallo es previsible, captúralo con try/except; with open lo hace por ti al cerrar el fichero.', q: mcq('Un traceback acaba en «File "pantalla.py", line 8, in dibujar» y «TypeError». ¿Dónde miras?', ['La línea 8 de pantalla.py', 'La primera línea de main.py', 'El firmware', 'El REPL'], 'La línea más baja es donde ocurrió.') },
      { title: 'Capturar y seguir', text: '<b>try/except</b> te deja decidir qué hacer ante un fallo previsible: un sensor I²C desconectado lanza OSError; lo capturas, guardas None y el programa sigue.\n<b>with open(…) as f:</b> funciona como un try escondido: cierra el fichero aunque haya un error dentro, sin perder lo escrito.\nLo que no captures acaba en un traceback: la línea más baja es donde saltó.', q: mcq('¿Qué excepción capturas para que un sensor I²C que no responde no pare el programa?', ['OSError', 'ZeroDivisionError', 'KeyboardInterrupt', 'SyntaxError'], 'Los fallos de bus llegan como OSError.') }
    ] },
    rp_pullup: { name: 'Pull-up: pulsado lee 0', alts: [
      { title: 'El muelle y el botón', text: 'Con pull-up, la entrada queda en 1 mientras nadie la toca. El pulsador va a masa: al pulsarlo, el pin <b>baja a 0</b>.\nPor eso pulsado = 0 y suelto = 1, y el momento de pulsar es un <b>flanco de bajada</b> (de 1 a 0): Pin.IRQ_FALLING en MicroPython.', q: mcq('Pulsador a masa con pull-up. ¿Qué flanco marca el momento de soltarlo?', ['Subida (IRQ_RISING)', 'Bajada (IRQ_FALLING)', 'Ninguno', 'Los dos'], 'Al soltar, el pull-up devuelve el pin de 0 a 1.') },
      { title: 'Lógica invertida en el código', text: 'Como pulsado da 0, el código pregunta por el 0: if boton.value() == 0 (en C, más adelante, if (!gpio_get(14))).\nOlvidar esa inversión es el error típico: el LED se enciende justo al revés. Y el momento de pulsar es un flanco de bajada (IRQ_FALLING).', q: mcq('Con pull-up, ¿qué condición es verdadera mientras el botón está pulsado?', ['boton.value() == 0', 'boton.value() == 1', 'boton.value() > 1', 'Pin.PULL_UP == 0'], 'Pulsado lee 0.') }
    ] },
    rp_pin: { name: 'Pines digitales: de Arduino a la Pico', alts: [
      { title: 'Tabla de traducción', text: 'pinMode(15, OUTPUT) → <b>led = Pin(15, Pin.OUT)</b> en MicroPython; gpio_init(15) y gpio_set_dir(15, GPIO_OUT) en C.\ndigitalWrite(15, HIGH) → led.value(1) / gpio_put(15, 1).\ndigitalRead(14) → boton.value() / gpio_get(14).\nINPUT_PULLUP → Pin.PULL_UP / gpio_pull_up(14). delay(500) → time.sleep_ms(500) / sleep_ms(500).', q: mcq('¿Cómo se escribe digitalWrite(13, LOW) en MicroPython?', ['led.value(0)', 'led.value(LOW)', 'gpio_put(13, 0)', 'digitalWrite(led, 0)'], 'gpio_put es la versión en C.') },
      { title: 'Un objeto por pin', text: 'En MicroPython cada pin es un objeto: lo creas una vez y luego le hablas: led.on(), led.off(), led.toggle(), led.value(1).\n<b>value()</b> sin argumento lee el estado; con argumento lo escribe. Así led.value(not led.value()) invierte el LED: not 1 es False (0) y not 0 es True (1).\nEn C es igual de directo: gpio_put(15, 1) y gpio_get(14).', q: mcq('¿Qué hace led.value(1 - led.value())?', ['Invierte el LED', 'Lo apaga siempre', 'Lo enciende siempre', 'Da error'], '1 − 1 = 0 y 1 − 0 = 1.') }
    ] },
    rp_ticks: { name: 'Medir tiempo sin bloquear', alts: [
      { title: 'Mirar el reloj en vez de dormir', text: 'En lugar de sleep, guardas el instante con <b>ticks_ms()</b> y en cada vuelta preguntas si ya ha pasado el intervalo: if ticks_diff(ticks_ms(), antes) >= 250. Mientras tanto el bucle hace otras cosas.\nPara el siguiente plazo, <b>antes = ticks_add(antes, 250)</b>: así un retraso puntual no se acumula.', q: mcq('¿Qué ventaja tiene antes = ticks_add(antes, 500) frente a antes = ticks_ms()?', ['El periodo medio sigue exacto aunque una vuelta llegue tarde', 'Gasta menos RAM', 'Evita usar ticks_diff', 'Hace el bucle más rápido'], 'Con ticks_ms() cada retraso desplaza todos los siguientes.') },
      { title: 'El contador da la vuelta', text: 'ticks_ms() no crece para siempre: al llegar a su máximo vuelve a empezar. Restar a − b justo después de la vuelta da un número absurdo.\n<b>ticks_diff(nuevo, viejo)</b> hace la resta teniendo en cuenta la vuelta, y ticks_add suma igual. Usa siempre esas dos; y para el siguiente plazo, antes = ticks_add(antes, periodo), que no acumula retrasos.', q: mcq('¿Qué usas para saber cuánto ha pasado entre dos lecturas de ticks_ms()?', ['ticks_diff(nuevo, viejo)', 'nuevo − viejo', 'abs(viejo − nuevo)', 'ticks_add(nuevo, viejo)'], 'Es la única que tolera la vuelta del contador.') }
    ] },
    rp_hwtiming: { name: 'Tiempos exactos: hardware frente a software', alts: [
      { title: 'El intérprete tiembla', text: 'Un bucle de MicroPython que cambia un pin es mucho más lento que en C y, sobre todo, <b>irregular</b>: el intérprete y la recogida de basura meten pausas de microsegundos a milisegundos. Las interrupciones en Python también llegan tarde.\nPara señales rápidas o exactas, hardware: <b>PWM</b> para ondas periódicas, <b>PIO</b> para protocolos o para medir pulsos.', q: mcq('Quieres medir pulsos de 1 µs. ¿Por qué no con Pin.irq en Python?', ['La latencia del handler es mayor que el propio pulso', 'Pin.irq no detecta flancos', 'Porque gasta mucha flash', 'Sí se puede sin problema'], 'Usa PIO o un slice de PWM como contador.') },
      { title: 'Una vez configurado, va solo', text: 'El PWM y el PIO funcionan con su propio reloj, ciclo a ciclo, sin esperar a la CPU. Puedes estar calculando o atendiendo la WiFi y la señal no se mueve ni un ciclo: la CPU solo pone los parámetros o rellena una FIFO.', q: mcq('Un servo recibe PWM por hardware y tu programa se queda colgado en un bucle. ¿Qué hace el servo?', ['Sigue recibiendo el mismo pulso: el PWM no depende de la CPU', 'Se para', 'Gira sin control', 'Vuelve a 0°'], 'El slice sigue contando solo.') }
    ] },

    /* ---------- M3 · Periféricos en MicroPython ---------- */
    rp_pwmpy: { name: 'PWM en MicroPython: duty_u16', alts: [
      { title: 'Una escala de 0 a 65535', text: 'pwm = PWM(Pin(15)); pwm.freq(1000). <b>duty_u16</b> va de 0 (siempre apagado) a 65535 (siempre encendido) con cualquier frecuencia: ciclo de trabajo = duty / 65535.\n16384 es el 25 %, 32768 el 50 % y 49151 el 75 %. Para pasar de porcentaje: duty = % / 100 × 65535. Con <b>pwm.deinit()</b> paras el PWM y liberas el pin.', q: mcq('¿Qué duty_u16 da un 10 %?', ['Unos 6554', '10', 'Unos 655', '1000'], '0,10 × 65535 ≈ 6554.') },
      { title: 'Servos: pulso entre periodo', text: 'A 50 Hz el periodo es de 20 ms. Un pulso de t ms ocupa t / 20 del periodo: <b>duty = t / 20 × 65535</b>. 1 ms → 3277; 1,5 ms → 4915; 2 ms → 6554.\nEl mismo razonamiento sirve para cualquier frecuencia: fracción del periodo × 65535. Y pwm.deinit() devuelve el pin cuando ya no lo necesitas.', q: mcq('Servo a 50 Hz. ¿duty_u16 para un pulso de 1,75 ms?', ['Unos 5734', 'Unos 1147', 'Unos 3277', 'Unos 57 344'], '1,75 / 20 × 65535 ≈ 5734.') }
    ] },
    rp_pwmfreq: { name: 'Elegir la frecuencia del PWM', alts: [
      { title: 'Ni visible ni audible', text: 'Por debajo de unos 100 Hz, un LED parpadea a la vista. Entre unos cientos de Hz y unos 18 kHz, la bobina de un motor o un condensador cerámico pueden <b>pitar</b>. Por encima de <b>20 kHz</b> no se oye.\nPor eso 20–25 kHz es un buen compromiso para LEDs y motores pequeños.', q: mcq('Tu motor pita al regular su velocidad con PWM a 2 kHz. ¿Qué cambias?', ['Subir el PWM a unos 20–25 kHz', 'Bajarlo a 50 Hz', 'Subir el ciclo de trabajo', 'Poner un LED en serie'], 'Por encima de 20 kHz el oído ya no lo capta.') },
      { title: 'No subas sin límite', text: 'Más frecuencia con el mismo reloj significa <b>menos niveles</b> de ciclo de trabajo (un wrap más pequeño) y <b>más pérdidas</b> al conmutar en transistores y drivers. A 25 kHz con 125 MHz aún tienes 5000 niveles; a 1 MHz, solo 125.\nElige lo justo para no oírlo ni verlo.', q: mcq('¿Por qué no atenúas un LED con PWM a 5 MHz?', ['Perderías resolución y aumentarían las pérdidas al conmutar', 'Porque el LED se quemaría', 'Porque se oiría un pitido', 'Porque el ojo vería el parpadeo'], 'A 125 MHz, 5 MHz deja solo 25 niveles.') }
    ] },
    rp_pwmslice: { name: 'Slices y canales del PWM', alts: [
      { title: 'Parejas que comparten reloj', text: 'El RP2040 tiene <b>8 slices</b> de PWM, cada uno con dos canales (A y B). Los dos canales de un slice comparten contador, divisor y wrap, así que tienen la <b>misma frecuencia</b>; lo que puede ser distinto es el ciclo de trabajo.\nComo hay 30 GPIO y 16 canales, GPn y GP(n+16) caen en el mismo slice y canal. Regla: slice = (n ÷ 2) mod 8; canal A si n es par y B si es impar; solo B puede ser entrada.', q: mcq('Quieres GP2 a 50 Hz para un servo y GP3 a 1 kHz para un zumbador. ¿Se puede?', ['No: GP2 y GP3 son el mismo slice y comparten frecuencia', 'Sí: cada pin tiene su propio PWM', 'Sí, si usas duty_u16', 'Solo en la Pico W'], 'Mueve el zumbador a un pin de otro slice, por ejemplo GP4.') },
      { title: 'La cuenta', text: 'Slice = (n ÷ 2, sin decimales) mod 8; canal <b>A</b> si n es par, <b>B</b> si es impar.\nGP15 → 7 → slice 7, canal B. GP16 → 8 → slice 0, canal A: el mismo que GP0. Solo el canal B puede ser <b>entrada</b> (contar flancos o medir el tiempo en alto), es decir, solo los GPIO impares.', q: mcq('¿Qué slice y canal usa GP21?', ['Slice 2, canal B', 'Slice 10, canal B', 'Slice 2, canal A', 'Slice 5, canal B'], '21 ÷ 2 = 10; 10 mod 8 = 2; impar → B.') }
    ] },
    rp_pwmwrap: { name: 'Frecuencia del PWM: divisor y wrap', alts: [
      { title: 'El contador y la regla', text: 'Cada slice tiene un contador que sube de 0 a <b>wrap</b> y vuelve a 0. La salida está alta mientras el contador es menor que el <b>nivel</b>.\n<b>f = clk_sys / ((wrap + 1) × divisor)</b>; ciclo de trabajo = nivel / (wrap + 1).\nHay wrap + 1 niveles distintos: más frecuencia con el mismo reloj, menos resolución.', q: mcq('clk_sys = 125 MHz, divisor 1 y wrap 999. ¿Frecuencia?', ['125 kHz', '125 MHz', '1 kHz', '125,1 kHz'], '125 000 000 / 1000 = 125 000 Hz.') },
      { title: 'Despejar wrap', text: 'Si sabes la frecuencia que quieres: (wrap + 1) × div = clk_sys / f.\nCon divisor 1, a 125 MHz y 10 kHz: wrap + 1 = 12 500, así que wrap = 12 499. Si sale más de 65 536, sube el divisor (de 1 a 255 y 15/16). No olvides el −1: el contador cuenta de 0 a wrap, ambos incluidos.', q: mcq('clk_sys = 125 MHz y divisor 1. ¿Qué wrap da 50 kHz?', ['2499', '2500', '24 999', '249'], '125 000 000 / 50 000 = 2500; menos 1.') }
    ] },
    rp_phasecorrect: { name: 'PWM en fase correcta', alts: [
      { title: 'Sube y baja', text: 'En fase correcta el contador sube de 0 a wrap y luego <b>baja</b> a 0, en vez de saltar. Cada periodo dura el doble:\n<b>f = clk_sys / (2 × (wrap + 1) × div)</b>.\nCon 125 MHz, divisor 1 y wrap 999: 62,5 kHz en lugar de 125 kHz. A cambio, los pulsos quedan centrados, algo que agradecen los motores.', q: mcq('Fase correcta, 125 MHz, divisor 1 y wrap 4999. ¿Frecuencia?', ['12,5 kHz', '25 kHz', '6,25 kHz', '125 kHz'], '125 000 000 / (2 × 5000) = 12 500 Hz.') },
      { title: 'Pulsos centrados', text: 'Como el contador sube y baja, el pulso queda <b>centrado</b> en el periodo y crece por los dos lados al subir el ciclo de trabajo. Con varios canales, los flancos ya no coinciden todos al principio del periodo: menos picos de corriente y menos ruido. Por eso lo prefieren los controladores de motores. El precio: la frecuencia se reduce a la mitad, f = clk_sys / (2 × (wrap + 1) × div).', q: mcq('En el modo normal (no en fase correcta), ¿dónde empiezan los pulsos de todos los canales?', ['A la vez, al principio de cada periodo', 'Centrados en el periodo', 'Al final del periodo', 'Cada uno al azar'], 'Todos suben cuando el contador vuelve a 0; la fase correcta los centra.') }
    ] },
    rp_adc16: { name: 'Del ADC a voltios', alts: [
      { title: 'De número a voltios', text: 'Con la referencia de 3,3 V: <b>V = lectura × 3,3 / 65535</b>, porque read_u16() ya está escalado a 16 bits.\nEjemplo: 32768 → 1,65 V, justo la mitad. No dividas entre 4095 ni multipliques por 5 V: son los errores típicos que vienen de Arduino.', q: mcq('read_u16() devuelve 16384. ¿Tensión aproximada?', ['0,83 V', '1,65 V', '0,41 V', '13,2 V'], '16384 / 65535 × 3,3 ≈ 0,83 V.') },
      { title: 'Una regla de 4096 marcas', text: 'El ADC del RP2040 es de <b>12 bits</b>: 4096 valores. read_u16() los estira a 0–65535 y avanza a saltos de unos 16: no ganas precisión.\nUn paso real vale <b>referencia / 4096</b>: con 3,3 V, unos 0,806 mV.', q: mcq('Con una referencia de 3,0 V, ¿cuánto vale un paso del ADC de 12 bits?', ['Unos 0,73 mV', 'Unos 0,046 mV', 'Unos 0,81 mV', 'Unos 2,9 mV'], '3000 mV / 4096 ≈ 0,73 mV.') }
    ] },
    rp_adcgood: { name: 'Medidas fiables con el ADC', alts: [
      { title: 'Lista de comprobación', text: 'Para que el ADC no baile:\n· <b>Promedia</b>: el ruido aleatorio baja con la raíz del número de muestras (16 lecturas → 4 veces menos).\n· <b>GP23 a 1</b>: el regulador de la Pico pasa a PWM y mete menos rizado.\n· Fuentes de mucha impedancia: <b>100 nF</b> en la entrada o resistencias de decenas de kΩ.\n· Para no reaccionar a cada temblor, <b>histéresis</b>.', q: mcq('¿Cuántas lecturas promedias para reducir el ruido aleatorio a la mitad?', ['4', '2', '8', '16'], '√4 = 2.') },
      { title: 'Por qué baila', text: 'El ADC carga un condensador interno en cada muestra: si la fuente es de megaohmios no le da tiempo y lee bajo e inestable. El regulador de la placa en modo ahorro mete un rizado irregular. Y el propio ADC tiene ruido de unas cuentas.\nCon un potenciómetro quieto, aceptar un valor nuevo solo si se aleja del último más de un margen (histéresis) evita una lluvia de mensajes.', q: mcq('Un potenciómetro quieto da lecturas que saltan ±10 cuentas. ¿Cómo evitas enviar cambios sin parar?', ['Aceptar un valor nuevo solo si difiere del último enviado más de un margen', 'Enviar cada lectura', 'Muestrear más deprisa', 'Pasarlo a un pin digital'], 'Eso es la histéresis.') }
    ] },
    rp_tempsens: { name: 'Sensor de temperatura interno', alts: [
      { title: 'La fórmula', text: 'El canal 4 mide una unión PN del chip: unos 0,706 V a 27 °C, y <b>baja</b> 1,721 mV por grado.\n<b>T = 27 − (V − 0,706) / 0,001721</b>\nPendiente negativa: más tensión, menos temperatura. Si partes de read_u16(), primero pasa a voltios (× 3,3 / 65535).\nOjo: cada paso del ADC son casi 0,5 °C, una referencia mal supuesta da grados de error y el chip se calienta al trabajar.', q: mcq('El sensor da 0,689 V. ¿Temperatura aproximada?', ['Unos 37 °C', 'Unos 17 °C', 'Unos 27 °C', 'Unos 10 °C'], '(0,689 − 0,706) / 0,001721 ≈ −9,9; 27 + 9,9 ≈ 37 °C.') },
      { title: 'Por qué no es un termómetro fino', text: 'Un paso del ADC (0,806 mV) equivale a casi medio grado: 0,806 / 1,721 ≈ 0,47 °C. Un error en la referencia se amplifica: con ADC_VREF a 3,25 V y cálculos con 3,3 V, te equivocas en unos 6 °C.\nY mide el silicio, que se calienta al trabajar: sirve para vigilar el chip, no el aire. La fórmula: T = 27 − (V − 0,706) / 0,001721, con pendiente negativa.', q: mcq('Con una referencia de 3,0 V, un paso del ADC (0,73 mV) equivale a…', ['Unos 0,42 °C', 'Unos 1,7 °C', 'Unos 0,73 °C', 'Unos 2,4 °C'], '0,73 / 1,721 ≈ 0,42 °C.') }
    ] },
    rp_irq: { name: 'Qué hacer dentro de un handler', alts: [
      { title: 'El timbre de la puerta', text: 'Una interrupción es un timbre: dejas lo que haces, abres, apuntas quién era y vuelves. Si te pones a charlar en la puerta, se te quema la comida.\nEn el <b>handler</b> haz lo mínimo: guarda el instante o sube una bandera. Nada de sleep, pantallas ni ficheros: el trabajo pesado, en el bucle principal.\nEn MicroPython, además, los handlers blandos llegan con retraso y los duros (hard=True) no pueden crear objetos.', q: mcq('¿Qué es lo correcto dentro de un handler de Pin.irq?', ['Anotar el evento en una variable y salir', 'Actualizar la pantalla OLED', 'Esperar con sleep a que pase el rebote', 'Escribir en un fichero'], 'Rápido y sin bloquear.') },
      { title: 'Duro o blando', text: 'En el RP2040, MicroPython ejecuta por defecto los handlers de pin como <b>blandos</b>: se programan para correr en cuanto el intérprete pueda, con un retraso de microsegundos a milisegundos si está ocupado (por ejemplo, recogiendo basura).\nCon <b>hard=True</b> corren al instante, pero <b>no pueden reservar memoria</b>: nada de crear floats, listas o cadenas, ni de hacer crecer una lista con append. Los enteros pequeños sí valen. En los dos casos, el handler debe ser corto: subir una bandera y salir.', q: mcq('¿Qué falla dentro de un handler con hard=True?', ['Crear objetos nuevos, como un float o una lista', 'Leer el valor de un pin', 'Sumar 1 a un entero global', 'Poner un pin a 1'], 'Si necesitas hacer algo pesado, usa micropython.schedule.') }
    ] },
    rp_debounce: { name: 'Antirrebote por tiempo', alts: [
      { title: 'Ignorar lo que llega demasiado pronto', text: 'Un pulsador <b>rebota</b>: al cerrarse da varios flancos en pocos milisegundos. En el handler, mira ticks_ms(): si desde el último flanco han pasado más de 20–30 ms, es una pulsación nueva; si no, es rebote.\nSi actualizas el instante del último flanco con cada flanco, exiges un tiempo de calma antes de contar.', q: mcq('Un botón da 5 flancos en 3 ms al pulsarlo una vez. Con un antirrebote de 30 ms, ¿cuántas pulsaciones cuentas?', ['1', '5', '0', '3'], 'Los cuatro flancos siguientes llegan antes de 30 ms.') },
      { title: 'Por qué no sleep', text: 'La tentación es esperar con sleep_ms(50) dentro del handler, pero eso bloquea el programa en cada rebote. Comparar instantes con <b>ticks_diff</b> no espera nada: decide y sale.\nOtra opción es filtrar en hardware con un condensador junto al pulsador.', q: mcq('¿Por qué no pones time.sleep_ms(50) en el handler para el antirrebote?', ['Bloquea el programa en cada flanco; mejor comparar instantes con ticks_diff', 'Porque sleep_ms no existe', 'Porque el rebote dura segundos', 'Porque gasta flash'], 'El handler debe ser corto.') }
    ] },
    rp_timer: { name: 'Timer de MicroPython: periódico o de un disparo', alts: [
      { title: 'Que te avise el reloj', text: '<b>Timer(period=250, mode=Timer.PERIODIC, callback=f)</b> llama a f cada 250 ms mientras tu programa sigue; con <b>Timer.ONE_SHOT</b>, una sola vez. El callback recibe el propio temporizador y debe ser corto, como un handler de pin.', q: mcq('Quieres apagar un LED 10 s después de pulsar, sin bloquear. ¿Qué usas?', ['Un Timer en modo ONE_SHOT', 'Un Timer en modo PERIODIC', 'time.sleep(10)', 'Pin.IRQ_RISING'], 'Una sola vez, dentro de un tiempo.') },
      { title: 'El metrónomo y el temporizador de cocina', text: 'Un metrónomo (PERIODIC) da un golpe cada periodo sin parar; un temporizador de cocina (ONE_SHOT) suena una vez y se calla.\nLos dos trabajan solos: tu bucle sigue con lo suyo y, cuando toca, se llama a tu función. Para pararlos, t.deinit().', q: mcq('¿Cómo paras un Timer periódico que ya no necesitas?', ['t.deinit()', 'time.sleep(0)', 'Pulsando Ctrl+D', 'Esperando a que termine'], 'deinit libera el temporizador.') }
    ] },
    rp_volatile: { name: 'Variables compartidas con interrupciones', alts: [
      { title: 'volatile', text: 'Si una variable cambia dentro de una interrupción, márcala <b>volatile</b>. Sin eso, el compilador puede suponer que en main no cambia, guardarla en un registro y no volver a leerla: un while (pulsos == 0) no acabaría nunca.\nY si es de 64 bits, volatile no basta: el M0+ la lee en dos mitades.', q: mcq('Una bandera que pone a 1 una interrupción y lee main, ¿cómo la declaras?', ['volatile bool bandera;', 'static bool bandera;', 'const bool bandera;', 'bool bandera; dentro de main'], 'volatile obliga a leerla de memoria cada vez.') },
      { title: 'Lecturas a medias', text: 'El Cortex-M0+ lee 32 bits de cada vez. Un uint64_t son dos lecturas: si la interrupción lo cambia entre medias, ves una mitad vieja y otra nueva.\nPara datos de más de 32 bits, o varios relacionados, léelos con las interrupciones desactivadas un instante: save_and_disable_interrupts() y restore_interrupts(). Y márcalas volatile para que el compilador las relea.', q: mcq('¿Cuál de estas variables puede leerse a medias en main si una interrupción la actualiza?', ['Un uint64_t', 'Un uint32_t', 'Un uint8_t', 'Un bool'], 'Es la única que necesita dos lecturas.') }
    ] },
    rp_async: { name: 'Multitarea cooperativa con asyncio', alts: [
      { title: 'El camarero que no espera', text: 'Un buen camarero no se queda mirando cómo come un cliente: toma nota, pasa a otra mesa y vuelve. Cada <b>await</b> es ese «paso a otra mesa».\nSi una tarea llama a time.sleep() o hace un bucle largo sin await, el camarero se queda plantado y nadie más es atendido.\nHay un solo camarero: asyncio usa un núcleo. Para que una interrupción llame su atención, ThreadSafeFlag.', q: mcq('Dentro de una tarea de asyncio escribes time.sleep(1). ¿Qué ocurre?', ['Todas las tareas se congelan un segundo', 'Solo esa tarea espera', 'Da error de sintaxis', 'La Pico se reinicia'], 'Usa await asyncio.sleep(1).') },
      { title: 'Turnos voluntarios', text: 'asyncio no reparte el tiempo a la fuerza: cada tarea <b>cede</b> el turno cuando hace await. Todo corre en <b>un solo núcleo</b>, por turnos.\n<b>create_task()</b> lanza una tarea; <b>asyncio.run()</b> arranca el planificador. Para que una interrupción despierte a una tarea, <b>ThreadSafeFlag</b>: el handler hace set() y la tarea espera con await flag.wait().', q: mcq('¿Cuándo cambia asyncio de una tarea a otra?', ['Solo cuando la tarea actual hace await', 'Cada milisegundo, a la fuerza', 'Cuando llega cualquier interrupción', 'Nunca: las ejecuta en paralelo en los dos núcleos'], 'Es multitarea cooperativa.') }
    ] },

    /* ---------- M4 · El SDK en C ---------- */
    rp_sdk: { name: 'De main.c al UF2', alts: [
      { title: 'La cadena de compilación', text: '1) <b>CMake</b> lee CMakeLists.txt y prepara la compilación. 2) <b>arm-none-eabi-gcc</b> compila tu C y las partes del SDK que usas. 3) El <b>enlazador</b> lo une todo. 4) Salen un <b>.elf</b> (con símbolos, para depurar) y un <b>.uf2</b> (para arrastrar en modo BOOTSEL), además de .bin y .hex.', q: mcq('¿Qué fichero usas para depurar con GDB?', ['El .elf', 'El .uf2', 'CMakeLists.txt', 'El .pio'], 'El .elf conserva nombres de funciones y líneas.') },
      { title: 'Solo lo que usas', text: 'El enlazador junta tu código con las partes del SDK que llamas y <b>descarta el resto</b>. Por eso un parpadeo en C ocupa decenas de KB, mientras que el firmware de MicroPython ocupa cientos: lleva el intérprete entero.\nCada salida tiene su uso: .uf2 para BOOTSEL, .elf para el depurador, .bin como imagen pura, .pio.h para los programas PIO ensamblados.', q: mcq('¿Qué fichero arrastras a la unidad RPI-RP2?', ['El .uf2', 'El .elf', 'El .c', 'CMakeLists.txt'], 'La ROM entiende el formato UF2.') }
    ] },
    rp_cmake: { name: 'CMakeLists.txt: bibliotecas y placa', alts: [
      { title: 'Bibliotecas a la carta', text: 'El SDK está troceado en bibliotecas. Solo se compila lo que pides en <b>target_link_libraries</b>: pico_stdlib para lo básico, hardware_pwm, hardware_adc, hardware_dma, pico_multicore…\nSi usas una función y olvidas su biblioteca, el error sale al no encontrar la cabecera o al enlazar.\nOtras líneas: pico_add_extra_outputs genera el .uf2, y PICO_BOARD elige la placa (en la pico_w, el LED va a la radio).', q: mcq('Usas pwm_set_wrap() y la compilación no encuentra hardware/pwm.h. ¿Qué falta?', ['Añadir hardware_pwm a target_link_libraries', 'Reinstalar el compilador', 'Poner la Pico en BOOTSEL', 'Cambiar a MicroPython'], 'Enlazar la biblioteca también añade sus cabeceras.') },
      { title: 'Las líneas clave', text: '<b>add_executable</b> crea el programa; <b>target_link_libraries</b> añade bibliotecas; <b>pico_add_extra_outputs</b> genera .uf2, .bin y .hex además del .elf.\n<b>PICO_BOARD</b> (pico, pico_w, pico2, pico2_w) elige la placa al configurar: chip, tamaño de flash y pines especiales. En la pico_w el LED va al chip de radio y se maneja con las bibliotecas pico_cyw43_arch.', q: mcq('Compilas para una Pico 2. ¿Qué indicas al configurar?', ['-DPICO_BOARD=pico2', '-DPICO_BOARD=pico', 'Nada: se detecta al grabar', 'pico_add_extra_outputs(pico2)'], 'La placa se fija al configurar, no al grabar.') }
    ] },
    rp_stdio: { name: 'printf por USB', alts: [
      { title: 'Activarlo', text: 'En CMakeLists.txt, <b>pico_enable_stdio_usb(proyecto 1)</b> manda printf por el USB como puerto serie; <b>pico_enable_stdio_uart(proyecto 1)</b>, por la UART. En main, <b>stdio_init_all()</b> lo pone en marcha.', q: mcq('¿Qué línea de CMake manda printf por la UART?', ['pico_enable_stdio_uart(proyecto 1)', 'pico_enable_stdio_usb(proyecto 1)', 'pico_add_extra_outputs(proyecto)', 'pico_sdk_init()'], 'Hay una línea para cada salida.') },
      { title: 'El puerto tarda en aparecer', text: 'Por USB, el ordenador necesita un momento para reconocer el puerto serie tras el arranque: lo que imprimas antes se pierde.\nEspera con while (!stdio_usb_connected()) sleep_ms(10); antes de los primeros mensajes importantes.', q: mcq('Tu programa imprime «Hola» nada más arrancar y no lo ves nunca por USB. ¿Arreglo?', ['Esperar a stdio_usb_connected() antes de imprimir', 'Usar Serial.print', 'Bajar el baudio a 9600', 'Quitar stdio_init_all()'], 'El USB aún no se había enumerado.') }
    ] },
    rp_overflow: { name: 'Contadores que dan la vuelta', alts: [
      { title: 'Las cuentas', text: 'Un contador de n bits da la vuelta tras 2ⁿ cuentas. Contando microsegundos, <b>32 bits</b> son 2³² µs ≈ 4295 s ≈ <b>71,6 min</b>; <b>64 bits</b>, unos 585 000 años.\nPor eso time_us_64() no da la vuelta en la práctica, mientras que millis() de Arduino (32 bits en milisegundos) la da a los 49,7 días.', q: mcq('¿Cada cuánto da la vuelta un contador de 32 bits que cuenta milisegundos?', ['Unos 49,7 días', 'Unos 71,6 min', 'Unos 585 000 años', 'Unos 24 días'], '2³² ms ≈ 4 295 000 s ≈ 49,7 días.') },
      { title: 'Por qué importa', text: 'Si calculas «ahora − antes» con un contador que acaba de dar la vuelta, el resultado sale enorme o negativo y tu temporizador falla justo esa vez, quizá tras horas funcionando bien.\nCon 64 bits te olvidas; con 32, usa restas sin signo o funciones como ticks_diff.', q: mcq('Un contador de 16 bits que cuenta microsegundos, ¿cada cuánto da la vuelta?', ['Unos 65,5 ms', 'Unos 65,5 s', 'Unos 71,6 min', 'Unos 16 µs'], '2¹⁶ = 65 536 µs.') }
    ] },
    rp_swd: { name: 'Depurar por SWD con GDB', alts: [
      { title: 'Parar y mirar', text: '<b>SWD</b> usa dos hilos (<b>SWCLK</b> y <b>SWDIO</b>) más masa. Con un depurador (la Debug Probe u otra Pico con debugprobe), <b>OpenOCD</b> y <b>GDB</b>, cargas el .elf, pones puntos de ruptura y miras variables sin tocar el código ni alterar los tiempos con printf.\nOrden habitual: conectar, arrancar OpenOCD, abrir GDB con el .elf, load y break/continue.', q: mcq('¿Qué fichero cargas en GDB para ver nombres de funciones y líneas?', ['El .elf', 'El .uf2', 'El .bin', 'main.c'], 'El .elf lleva los símbolos.') },
      { title: 'Órdenes de GDB', text: '<b>load</b> graba; <b>break</b> pone un punto de ruptura; <b>continue</b> ejecuta hasta el siguiente; <b>next</b> avanza una línea sin entrar en funciones; <b>step</b> entra en ellas; <b>print</b> muestra una variable; <b>bt</b> enseña la pila de llamadas.\nTodo por dos hilos, SWCLK y SWDIO, más masa, y sin llenar el código de printf.', q: mcq('Estás parado en una línea que llama a leer_sensor() y quieres entrar dentro. ¿Qué orden?', ['step', 'next', 'continue', 'bt'], 'next la ejecutaría entera sin entrar.') }
    ] },
    rp_hardfault: { name: 'HardFault en el Cortex-M0+', alts: [
      { title: 'El error grave', text: 'Un acceso imposible (puntero nulo, pila desbordada o leer 32 bits en una dirección que no es múltiplo de 4) lleva al Cortex-M0+ a <b>HardFault</b> y el programa se queda en isr_hardfault.\nEl M0+ no admite accesos <b>desalineados</b> de 16 o 32 bits.', q: mcq('¿Cuál de estos accesos provoca HardFault en un M0+?', ['Leer un uint32_t en la dirección 0x20000002', 'Leer un uint8_t en 0x20000003', 'Leer un uint32_t en 0x20000004', 'Leer un uint16_t en 0x20000002'], '0x…02 no es múltiplo de 4.') },
      { title: 'Encontrar al culpable', text: 'Si lo paras en GDB y está en isr_hardfault, la primera orden es <b>bt</b>: la pila de llamadas dice qué función llegó hasta ahí. Luego revisas los punteros y la alineación de esa línea.', q: mcq('Tras un HardFault, bt muestra main → procesar → copiar_bloque. ¿Dónde buscas primero?', ['En copiar_bloque, la última función de la pila', 'En main', 'En el firmware de la ROM', 'En CMakeLists.txt'], 'La llamada más interna es donde ocurrió el acceso.') }
    ] },
    rp_dbgpin: { name: 'Medir con un GPIO de depuración', alts: [
      { title: 'Un pulso que mide', text: 'Sube un GPIO libre al entrar en una rutina y bájalo al salir. Con un osciloscopio o un analizador lógico, la <b>anchura</b> del pulso es lo que dura la rutina, y la distancia entre pulsos, cada cuánto se llama.\nCuesta un par de instrucciones y no altera los tiempos.', q: mcq('El pulso de depuración dura 12 µs y se repite cada 1 ms. ¿Qué fracción del tiempo ocupa la rutina?', ['1,2 %', '12 %', '0,12 %', '83 %'], '12 / 1000 = 0,012.') },
      { title: 'Por qué no printf', text: 'printf dentro de una interrupción tarda mucho más que la propia interrupción y puede bloquear: medirías tu medida. gpio_put es casi instantáneo, una escritura en el SIO.', q: mcq('¿Por qué no mides la duración de una interrupción con printf dentro?', ['printf tarda mucho y altera justo lo que mides', 'printf no existe en C', 'Porque siempre da HardFault', 'Porque gasta flash'], 'Un GPIO es la sonda menos invasiva.') }
    ] },
    rp_clock: { name: 'El PLL: de 12 MHz a clk_sys', alts: [
      { title: 'Multiplicar y dividir', text: 'El cristal de la Pico da 12 MHz. Un <b>PLL</b> lo multiplica (FBDIV) hasta un VCO de 750–1600 MHz y luego lo divide dos veces (POSTDIV1 y POSTDIV2, de 1 a 7 cada uno).\n12 MHz × 125 = 1500 MHz; ÷ 6 ÷ 2 = <b>125 MHz</b>.', q: mcq('FBDIV = 100, POSTDIV1 = 5, POSTDIV2 = 5. ¿Frecuencia de salida?', ['48 MHz', '1200 MHz', '240 MHz', '120 MHz'], '12 × 100 = 1200 MHz; ÷ 25 = 48 MHz: el reloj del USB.') },
      { title: 'El VCO manda', text: 'Elige primero FBDIV para que 12 × FBDIV caiga entre 750 y 1600 MHz; luego busca dos divisores cuyo producto dé tu frecuencia: <b>f = VCO / (POSTDIV1 × POSTDIV2)</b>. Conviene poner el mayor en POSTDIV1.\nEjemplo: 200 MHz = 1200 / 6 → FBDIV 100, POSTDIV1 6 y POSTDIV2 1.', q: mcq('Con FBDIV = 125 (VCO de 1500 MHz), ¿qué divisores dan 125 MHz?', ['POSTDIV1 = 6 y POSTDIV2 = 2', 'POSTDIV1 = 5 y POSTDIV2 = 2', 'POSTDIV1 = 3 y POSTDIV2 = 3', 'POSTDIV1 = 6 y POSTDIV2 = 1'], '1500 / 12 = 125.') }
    ] },
    rp_clksys: { name: 'Qué depende de clk_sys', alts: [
      { title: 'Todo cuelga de clk_sys', text: 'Los núcleos, el bus, el DMA, el <b>PIO</b> y el <b>PWM</b> funcionan con clk_sys. Si lo cambias (por ejemplo, de 125 a 200 MHz), tu PWM y tus programas PIO cambian de velocidad: hay que recalcular sus divisores.\nEl USB y el ADC usan su propio reloj de 48 MHz, que no cambia.', q: mcq('Subes clk_sys de 125 a 250 MHz sin tocar nada más. Tu PWM de 1 kHz pasa a…', ['2 kHz', '1 kHz', '500 Hz', 'Se para'], 'El contador del PWM avanza al doble de velocidad.') },
      { title: 'El USB va aparte', text: 'El USB exige <b>48 MHz</b> con una tolerancia muy estrecha, así que tiene su propio PLL (PLL_USB) y su reloj clk_usb; el ADC también usa 48 MHz.\nPor eso puedes cambiar clk_sys sin romper el USB, y por eso una placa con USB necesita un cristal: el oscilador interno (ROSC) es demasiado impreciso.', q: mcq('Bajas clk_sys a 48 MHz para ahorrar. ¿Qué le pasa al ritmo de muestreo del ADC?', ['Nada: el ADC usa su propio reloj de 48 MHz', 'Baja a la mitad', 'Se para', 'Sube'], 'clk_adc no sale de clk_sys.') }
    ] },
    rp_overclock: { name: 'Cambiar clk_sys y overclock', alts: [
      { title: 'Las funciones', text: 'En C, <b>set_sys_clock_khz(khz, obligatorio)</b>: con true, si esa frecuencia no se puede conseguir exactamente con el PLL, se detiene con un error; con false, devuelve false y no cambia nada. En MicroPython, <b>machine.freq(hz)</b>.\nSi subes mucho y se cuelga al ejecutar desde la flash, sospecha de su reloj QSPI.', q: mcq('set_sys_clock_khz(133000, false) devuelve false. ¿Qué ha pasado?', ['No se podía conseguir exacta y el reloj sigue como estaba', 'El chip se ha parado', 'Ha puesto la frecuencia más cercana', 'Ha pasado al ROSC'], 'Con false, tú decides qué hacer.') },
      { title: 'Subir tiene precio', text: 'Por encima de lo especificado (overclock) suele funcionar, pero no está garantizado. Lo primero que falla suele ser la <b>flash</b>: su reloj QSPI sale de clk_sys con un divisor y, si clk_sys sube mucho, la flash no sigue el ritmo y el programa se cuelga. Se arregla aumentando ese divisor; a veces también hace falta subir la tensión del núcleo.\nPara cambiarlo: set_sys_clock_khz(khz, true), que se detiene con error si la frecuencia no es exacta.', q: mcq('A 300 MHz, un programa que corre desde la flash se cuelga, pero uno copiado en RAM funciona. ¿Sospechoso?', ['El reloj QSPI de la flash, demasiado rápido', 'El USB', 'El ADC', 'El LED'], 'Desde RAM no se lee la flash.') }
    ] },
    rp_cores: { name: 'Repartir trabajo entre los dos núcleos', alts: [
      { title: 'Dos núcleos, todo compartido', text: 'Los dos Cortex-M0+ ven la <b>misma RAM</b>, la misma flash y los mismos periféricos. Al arrancar solo corre el núcleo 0; el 1 se lanza con multicore_launch_core1(f) en C o _thread.start_new_thread(f, ()) en MicroPython, y ejecuta f <b>en paralelo</b> de verdad.\nCada núcleo tiene su controlador de interrupciones: una interrupción se atiende en el núcleo que la configuró.', q: mcq('¿Pueden los dos núcleos leer el mismo array global?', ['Sí: comparten toda la RAM', 'No: cada uno tiene su RAM', 'Solo a través de la FIFO', 'Solo si está en la flash'], 'Por eso hay que cuidar los datos compartidos.') },
      { title: 'Quién hace qué', text: 'Reparte por tipo de trabajo: lo de <b>tiempo real</b> (control de motores, audio, muestreo) en un núcleo, con su temporizador; lo <b>impredecible</b> (USB, WiFi, interfaz) en el otro. Así una ráfaga de red no retrasa el lazo de control.\nLos recursos comunes van protegidos: en el SDK, printf usa un mutex y las líneas no se mezclan, aunque el orden entre núcleos no está garantizado. Y cada interrupción se atiende en el núcleo que la configuró.', q: mcq('Un sintetizador genera audio y atiende un menú en pantalla. ¿Cómo repartes?', ['Audio en un núcleo; pantalla y botones en el otro', 'Todo en el núcleo 0', 'El audio dentro de asyncio', 'Alternar cada segundo'], 'El audio no puede esperar a la interfaz.') }
    ] },

    /* ---------- M5 · PIO ---------- */
    rp_pio: { name: 'Arquitectura del PIO', alts: [
      { title: 'Mini procesadores de pines', text: 'Cada bloque PIO tiene <b>4 máquinas de estados</b> y una memoria de <b>32 instrucciones</b> compartida por las cuatro. El RP2040 tiene 2 bloques (8 máquinas); el RP2350, 3 (12).\nCada máquina tiene registros X e Y, el <b>OSR</b> (de él salen bits), el <b>ISR</b> (a él entran), una FIFO de envío (TX: de la CPU a la máquina) y otra de recepción (RX: de la máquina a la CPU).', q: mcq('¿Por dónde recibe una máquina PIO los datos que le manda la CPU?', ['Por la TX FIFO, que carga en el OSR', 'Por la RX FIFO', 'Por el ISR', 'Por los registros X e Y directamente'], 'TX es el sentido CPU → máquina.') },
      { title: 'Cuentas de memoria', text: 'Las 32 instrucciones son <b>por bloque</b>, no por máquina. Si dos máquinas usan el mismo programa, solo ocupa una vez.\nLos datos entran por la TX FIFO hacia el OSR y salen del ISR por la RX FIFO.\nSi no cabe: ahorra instrucciones con side-set, retardos y wrap, o reparte los programas entre bloques, cada uno con sus 32.', q: mcq('Tres programas de 12 instrucciones. ¿Caben en un solo bloque?', ['No: suman 36 y el bloque tiene 32', 'Sí: son 32 por máquina', 'Sí, si van más lentos', 'Solo en el RP2350'], 'Reparte uno a otro bloque.') }
    ] },
    rp_pioins: { name: 'Las instrucciones del PIO', alts: [
      { title: 'Nueve verbos', text: '<b>jmp</b> salta (con condición), <b>wait</b> espera a un pin o IRQ, <b>in</b> mete bits en el ISR, <b>out</b> saca bits del OSR, <b>push</b> envía el ISR a la RX FIFO, <b>pull</b> carga el OSR desde la TX FIFO, <b>mov</b> copia entre registros (pudiendo invertir), <b>irq</b> pone o espera banderas y <b>set</b> escribe un valor inmediato de 0 a 31.\nNo hay sumas ni multiplicaciones: solo restar 1 con jmp y comparar.', q: mcq('¿Qué instrucción carga el OSR con un dato que ha enviado la CPU?', ['pull', 'push', 'in', 'set'], 'push va en el otro sentido.') },
      { title: 'Trucos con pocas piezas', text: 'set solo llega a 31: para cargar 1000, la CPU lo pone en la FIFO y el programa hace <b>pull</b> y <b>mov(x, osr)</b>.\n<b>jmp(x_dec, etiqueta)</b> salta mientras X no sea 0 y luego le resta 1: con X = 3 salta 3 veces y el cuerpo se ejecuta 4.\n<b>mov(x, invert(null))</b> deja X en 0xFFFFFFFF.\nwait(1, pin, n) espera a que un pin suba e in_(pins, 1) mete su valor en el ISR.', q: mcq('jmp(y_dec, "bucle") con Y = 5 al entrar. ¿Cuántas veces se ejecuta el cuerpo del bucle?', ['6', '5', '4', 'Infinitas'], 'Salta con 5, 4, 3, 2 y 1: cinco saltos, seis pasadas.') }
    ] },
    rp_piocycles: { name: 'Contar ciclos en un programa PIO', alts: [
      { title: 'Uno más su retardo', text: 'Cada instrucción dura <b>1 ciclo más su retardo [n]</b>. Suma los ciclos de un periodo y divide la frecuencia de la máquina (clk_sys / divisor) entre ellos.\nset(pins, 1) [3] y set(pins, 0) [1] son 4 + 2 = 6 ciclos: a 1 MHz, 166,7 kHz.', q: mcq('set(pins, 1) [9] y set(pins, 0) [9] en bucle, con la máquina a 2 MHz. ¿Frecuencia?', ['100 kHz', '111 kHz', '200 kHz', '1 MHz'], '10 + 10 = 20 ciclos; 2 MHz / 20 = 100 kHz.') },
      { title: 'El salto también cuenta', text: 'jmp, wait y pull gastan su ciclo como cualquier otra. En el transmisor UART, out(pins, 1) [6] más el jmp son 8 ciclos por bit.\nDuración de un bit = ciclos / f de la máquina; bits por segundo = f / ciclos.', q: mcq('out(pins, 1) [2] seguido de jmp(x_dec, "bit"), con la máquina a 4 MHz. ¿Bits por segundo?', ['1 Mbit/s', '1,33 Mbit/s', '2 Mbit/s', '4 Mbit/s'], '3 + 1 = 4 ciclos por bit; 4 MHz / 4.') }
    ] },
    rp_pioshift: { name: 'OSR, ISR, autopull y FIFOs', alts: [
      { title: 'Dirección y umbral', text: 'out saca bits del OSR por un extremo: con desplazamiento a la <b>derecha</b> sale primero el bit 0 (como en la UART); a la <b>izquierda</b>, el bit 31.\nCon <b>autopull</b>, al gastar el umbral de bits la máquina recarga el OSR desde la FIFO sola; sin autopull hace falta un pull(), o el OSR nunca recibe el dato. Si solo hablas en un sentido, puedes unir las dos FIFO en una de 8 palabras.', q: mcq('Autopull con umbral de 16 y out(pins, 2) en bucle. ¿Cuántas out antes de recargar?', ['8', '16', '2', '32'], '16 bits / 2 por out = 8.') },
      { title: 'Alinear el dato', text: 'Si desplazas a la izquierda con un umbral de 24, salen los <b>24 bits altos</b> del OSR: un color de 24 bits hay que enviarlo desplazado 8 a la izquierda (sm.put(color, 8)).\nY si una máquina solo envía datos a la CPU, une las FIFO en RX: 8 palabras de cola en vez de 4.', q: mcq('Envías bytes con desplazamiento a la izquierda y autopull a 8. ¿Dónde pones el byte en la palabra de 32 bits?', ['En los 8 bits altos (desplazado 24)', 'En los 8 bits bajos', 'Da igual', 'Repetido cuatro veces'], 'A la izquierda, lo primero que sale es lo de arriba.') }
    ] },
    rp_piosideset: { name: 'Side-set y retardo', alts: [
      { title: 'Cinco bits compartidos', text: 'Cada instrucción tiene <b>5 bits</b> para side-set y retardo juntos. Si declaras n pines de side-set, quedan 5 − n bits para el retardo: con 1 pin, retardo máximo 15; con 2, 7; sin side-set, 31.\nA cambio, cada instrucción puede mover esos pines en el mismo ciclo en que hace otra cosa.', q: mcq('Declaras 3 pines de side-set. ¿Retardo máximo?', ['3', '7', '31', '15'], 'Quedan 2 bits: hasta 3.') },
      { title: 'Dos cosas en un ciclo', text: 'El side-set cambia pines <b>a la vez</b> que la instrucción hace otra cosa. Patrón tipo SPI: out(pins, 1).side(0) saca el dato con el reloj bajo y nop().side(1) sube el reloj para que el receptor lea. Un bit por cada ciclo de reloj, sin instrucciones extra para mover el reloj. El precio: los bits del side-set se restan de los 5 del retardo.', q: mcq('¿Qué hace .side(1) en out(pins, 1).side(1)?', ['Pone a 1 el pin de side-set en el mismo ciclo en que sale el dato', 'Añade 1 ciclo de retardo', 'Usa el bloque PIO 1', 'Saca 1 bit más'], 'El side-set no gasta instrucción propia.') }
    ] },
    rp_piodiv: { name: 'Divisor de reloj del PIO', alts: [
      { title: 'La fórmula', text: 'La máquina debe ir a baudios × ciclos por bit. Por tanto:\n<b>divisor = clk_sys / (baudios × ciclos por bit)</b>.\nA 125 MHz, con 8 ciclos por bit y 9600 baudios: 125 000 000 / 76 800 ≈ 1627,6.', q: mcq('clk_sys = 125 MHz, 8 ciclos por bit, 9600 baudios. ¿Divisor?', ['1627,6', '13 020,8', '203,5', '0,0006'], '125 000 000 / (9600 × 8) ≈ 1627,6.') },
      { title: 'Límites y fracciones', text: 'El divisor tiene 16 bits enteros y 8 de fracción: de 1 a 65 536. A 125 MHz, la máquina más lenta va a unos 1907 Hz; para ir más despacio, alarga el programa con retardos o bucles.\nUn divisor con decimales (135,6) funciona: unos ciclos duran un ciclo de clk_sys más que otros, un temblor despreciable para una UART.', q: mcq('clk_sys = 150 MHz. ¿Frecuencia mínima de una máquina PIO?', ['Unos 2289 Hz', 'Unos 1907 Hz', '150 MHz', 'Unos 586 kHz'], '150 000 000 / 65 536 ≈ 2289 Hz.') }
    ] },
    rp_pioidle: { name: 'Dónde espera la máquina PIO', alts: [
      { title: 'Los pines se quedan como estaban', text: 'Cuando una máquina espera (un pull sin datos, un wait), sus pines <b>conservan el último valor</b>. Diseña el programa para que espere con la línea en <b>reposo</b>: alta en una UART; baja en una WS2812, donde una línea baja larga es el reinicio de la tira.', q: mcq('Tu transmisor UART en PIO deja la línea baja mientras espera datos. ¿Qué ve el receptor?', ['Un bit de inicio falso o un error de trama', 'Nada raro', 'Un byte 0xFF', 'Reposo normal'], 'En UART, el reposo es alto.') },
      { title: 'Esperar en el sitio correcto', text: 'Coloca la instrucción que espera justo después de dejar los pines en reposo. En la WS2812, out(x, 1) va el primero: si no hay datos, la máquina se para ahí con la línea baja, y eso cierra la trama.', q: mcq('¿En qué estado debe quedar la línea de una WS2812 mientras la máquina espera más colores?', ['Baja', 'Alta', 'Alternando', 'En alta impedancia'], 'Bajo y quieto: la tira lo entiende como fin de trama.') }
    ] },
    rp_piompy: { name: 'PIO desde MicroPython', alts: [
      { title: 'StateMachine y sus pines', text: 'rp2.StateMachine(n, programa, freq=…, set_base=…, out_base=…, in_base=…, sideset_base=…). Cada tipo de instrucción tiene <b>su base de pines</b>: set(pins, …) mueve los de set_base; out, los de out_base; in, los de in_base. sm.active(1) arranca la máquina; sm.exec() ejecuta una instrucción suelta.', q: mcq('Tu programa usa out(pins, 1), pero solo pasaste set_base=Pin(15). ¿Qué falta?', ['out_base=Pin(15)', 'in_base=Pin(15)', 'jmp_pin=Pin(15)', 'freq=0'], 'out usa su propio mapa de pines.') },
      { title: 'Hablar con la máquina', text: '<b>sm.put(valor, desplazamiento)</b> escribe en la TX FIFO; <b>sm.get()</b> lee de la RX; <b>sm.exec(\'instrucción\')</b> ejecuta una instrucción suelta ahora mismo, fuera del programa: útil para preparar X o Y antes de arrancar. Recuerda que set(pins, …) mueve los pines de set_base.', q: mcq('¿Cómo dejas X = 0 en la máquina antes de activarla?', ['sm.exec("set(x, 0)")', 'sm.put(0)', 'sm.active(0)', 'sm.x = 0'], 'put mete el dato en la FIFO, no en X.') }
    ] },
    rp_ws2812: { name: 'Temporización de la WS2812', alts: [
      { title: 'Bits de 1,25 µs', text: 'Cada bit dura <b>1,25 µs</b> (800 kbit/s) y empieza en alto: un 0 está alto unos 400 ns y un 1 unos 800 ns, con unos ±150 ns de margen.\nCon la máquina a 8 MHz (125 ns por ciclo), un bit son 10 ciclos: 3 en alto para el 0 y 6 para el 1. <b>Ciclos por bit = 1,25 µs × f de la máquina</b>. Una tira entera tarda LEDs × 24 bits / 800 000.', q: mcq('Máquina PIO a 12,8 MHz. ¿Cuántos ciclos dura un bit WS2812?', ['16', '10', '12,8', '8'], '1,25 × 12,8 = 16.') },
      { title: 'Cuánto tarda una tira', text: 'Cada LED necesita <b>24 bits</b> (8 por color). A 800 kbit/s: <b>tiempo = LEDs × 24 / 800 000</b>. 100 LEDs = 3 ms; 300 LEDs = 9 ms.\nDespués, una línea baja de varias decenas de microsegundos marca el final de la trama. Y en PIO, cada bit de 1,25 µs son 1,25 × f ciclos de la máquina.', q: mcq('¿Cuánto tarda en enviarse una tira de 60 LEDs?', ['1,8 ms', '60 µs', '18 ms', '0,6 ms'], '60 × 24 = 1440 bits; / 800 000 = 1,8 ms.') }
    ] },
    rp_pioc: { name: 'PIO desde C con el SDK', alts: [
      { title: 'Los pasos', text: '<b>pio_add_program</b> carga el programa y devuelve su posición (offset), porque varios programas comparten las 32 instrucciones. Luego: configuración por defecto, pines, desplazamientos y divisor; <b>pio_gpio_init</b> cede cada pin al PIO (sin eso, el pin sigue con otra función); pio_sm_init aplica y pio_sm_set_enabled arranca.\n<b>pio_claim_unused_sm(pio, true)</b> pide una máquina libre y, con true, se detiene con error si no queda ninguna.', q: mcq('¿Qué devuelve pio_claim_unused_sm(pio0, false) si las cuatro máquinas están ocupadas?', ['−1', '0', 'Se detiene con un error', '4'], 'Con false, te avisa y decides tú.') },
      { title: 'Cuándo C', text: 'El programa PIO es el mismo en C y en MicroPython; cambia quién lo alimenta. C permite <b>DMA</b> hacia las FIFO, alimentarlas más rápido y arrancar varias máquinas en el mismo ciclo con <b>pio_enable_sm_mask_in_sync</b>.\npio_sm_put_blocking escribe esperando hueco; pio_sm_get_blocking lee esperando dato; pio_sm_exec ejecuta una instrucción suelta.', q: mcq('Llenas una FIFO desde C y no quieres perder datos si está llena. ¿Qué función usas?', ['pio_sm_put_blocking', 'pio_sm_get_blocking', 'pio_sm_exec', 'pio_add_program'], 'Espera hasta que haya hueco.') }
    ] },
    rp_uartproto: { name: 'La trama UART: inicio, datos y parada', alts: [
      { title: 'Inicio, datos, parada', text: 'La línea reposa en <b>alto</b>. Un byte: bit de <b>inicio</b> (bajo), 8 bits de datos empezando por el bit 0 y bit de <b>parada</b> (alto). El receptor se sincroniza con el flanco de bajada del inicio.\nLa parada puede durar más de un bit: el receptor solo exige un mínimo, así que un hueco entre bytes no es un error.', q: mcq('¿Qué nivel tiene la línea UART en reposo?', ['Alto', 'Bajo', 'Alterna', 'Alta impedancia'], 'Por eso el inicio, bajo, se distingue.') },
      { title: 'Leer en el centro', text: 'Tras el flanco del inicio, el receptor espera <b>medio bit</b> para colocarse en el centro y desde ahí muestrea cada bit entero. El centro es el punto más alejado de los flancos: tolera pequeñas diferencias de baudio y flancos lentos.', q: mcq('Receptor con 16 ciclos por bit. Tras el flanco del inicio, ¿cuántos ciclos espera hasta leer el primer bit de datos?', ['24: medio bit más un bit entero', '8', '16', '4'], '8 hasta el centro del inicio y 16 más hasta el centro del bit 0.') }
    ] },
    rp_encoder: { name: 'Encoder en cuadratura', alts: [
      { title: 'Dos señales desfasadas', text: 'Un encoder en cuadratura da dos señales, A y B, desfasadas un cuarto de periodo. En un sentido la secuencia AB es <b>00 → 01 → 11 → 10 → 00</b>; en el otro, al revés.\nCada transición válida cambia un solo bit, y según cuál cambie sabes el sentido.', q: mcq('AB pasa de 11 a 10. Si 00 → 01 → 11 → 10 es avanzar, ¿qué ha hecho?', ['Avanzar un paso', 'Retroceder un paso', 'Nada', 'Error: cambian dos bits'], '11 → 10 está en la secuencia de avance.') },
      { title: 'Sigue el círculo', text: 'Escribe la secuencia en círculo: 00, 01, 11, 10. Cada cambio hacia delante suma uno y cada cambio hacia atrás resta uno. Si cambian los dos bits a la vez (00 → 11), te has perdido un paso: por eso conviene leerlo con PIO, que no se pierde ninguno.', q: mcq('AB: 01 → 00 → 10. Si 00 → 01 → 11 → 10 es avanzar, ¿qué ha hecho?', ['Retroceder dos pasos', 'Avanzar dos pasos', 'Avanzar uno y retroceder uno', 'Nada'], '01 → 00 y 00 → 10 van los dos hacia atrás en el círculo.') }
    ] },

    /* ---------- M6 · DMA y núcleos ---------- */
    rp_dma: { name: 'Para qué sirve el DMA', alts: [
      { title: 'Una cinta transportadora', text: 'Sin DMA, la CPU es un mozo que lleva cada caja del camión al almacén: no puede hacer otra cosa. El <b>DMA</b> es una cinta transportadora: la configuras una vez (de dónde, a dónde, cuántas) y mueve los datos sola mientras la CPU calcula. Si los dos coinciden en el mismo banco de RAM, uno espera un ciclo.', q: mcq('¿Qué gana tu programa al enviar una tira de LEDs con DMA en vez de con un bucle?', ['La CPU queda libre mientras salen los datos', 'Más colores', 'Menos consumo de los LEDs', 'Nada'], 'La CPU solo lanza la transferencia.') },
      { title: 'Compartir el bus', text: 'El DMA y la CPU usan el mismo bus. La RAM del RP2040 está dividida en <b>bancos</b>: si acceden a bancos distintos, avanzan a la vez; si coinciden en el mismo, el bus <b>arbitra</b> y uno espera un ciclo. Nada se corrompe; solo se pierde algo de velocidad. Y mientras, la CPU queda libre para otras tareas.', q: mcq('¿Cómo reduces los choques entre CPU y DMA en un diseño exigente?', ['Poniendo sus datos en bancos de RAM distintos', 'Desactivando la CPU', 'Moviendo los búferes a la flash', 'Bajando clk_sys'], 'Bancos distintos, accesos simultáneos.') }
    ] },
    rp_dmacfg: { name: 'Configurar un canal DMA', alts: [
      { title: 'Las cinco preguntas', text: 'Para configurar un canal respondes: ¿<b>de dónde</b> lee (READ_ADDR)? ¿<b>a dónde</b> escribe (WRITE_ADDR)? ¿<b>cuántas</b> transferencias (TRANS_COUNT)? ¿de qué <b>tamaño</b> (8, 16 o 32 bits)? ¿<b>cuándo</b> avanza (DREQ: cuando el periférico tenga dato o hueco)?\nY qué direcciones se incrementan: un periférico es una dirección fija; un búfer avanza.', q: mcq('Copias del FIFO del ADC a un búfer. ¿Qué dirección se incrementa?', ['Solo la de escritura (el búfer)', 'Solo la de lectura (el FIFO)', 'Las dos', 'Ninguna'], 'El FIFO es siempre la misma dirección.') },
      { title: 'Transferencias, no bytes', text: 'TRANS_COUNT cuenta <b>transferencias</b> del tamaño elegido: con 32 bits, 1000 transferencias son 4000 bytes.\nEl <b>DREQ</b> marca el ritmo: sin DREQ, el canal copia tan rápido como puede (memoria a memoria); con DREQ_ADC o el de una FIFO del PIO, avanza solo cuando el periférico tiene dato o hueco. Sin él, leerías datos repetidos o desbordarías la FIFO.', q: mcq('Mueves 1024 muestras de 16 bits con transferencias de 16 bits. ¿TRANS_COUNT?', ['1024', '2048', '512', '16 384'], 'Una transferencia por muestra.') }
    ] },
    rp_dmatime: { name: 'Cuánto dura una transferencia DMA', alts: [
      { title: 'Al ritmo del periférico', text: 'Con DREQ, el DMA va al paso del periférico: <b>t = muestras / frecuencia de muestreo</b>. 2048 muestras a 500 ksps son 4,096 ms; 1000 a 250 ksps, 4 ms.', q: mcq('¿Cuánto tarda en llenarse un búfer de 5000 muestras a 100 ksps?', ['50 ms', '5 ms', '500 ms', '0,05 ms'], '5000 / 100 000 = 0,05 s.') },
      { title: 'Sin freno', text: 'Sin DREQ (memoria a memoria), el mejor caso es una transferencia por ciclo de clk_sys: <b>t = transferencias / clk_sys</b>. 4096 palabras a 125 MHz ≈ 32,8 µs. Si la CPU u otros canales usan el mismo bus, algo más.', q: mcq('8192 palabras sin DREQ a 200 MHz, una por ciclo. ¿Tiempo?', ['Unos 41 µs', 'Unos 41 ms', 'Unos 8,2 µs', 'Unos 4,1 µs'], '8192 / 200 000 000 ≈ 41 µs.') }
    ] },
    rp_adcdiv: { name: 'Frecuencia de muestreo del ADC', alts: [
      { title: 'Una muestra cada div + 1 ciclos', text: 'El ADC usa un reloj de 48 MHz. Con adc_set_clkdiv(div) toma una muestra cada div + 1 ciclos: <b>f = 48 MHz / (div + 1)</b>.\nDespejando: <b>div = 48 000 000 / f − 1</b>. Para 10 000 muestras/s, div = 4799.', q: mcq('¿Qué div necesitas para 48 000 muestras/s?', ['999', '1000', '47 999', '99'], '48 000 000 / 48 000 = 1000; menos 1.') },
      { title: 'El tope de 500 ksps', text: 'Una conversión tarda 96 ciclos de 48 MHz: el máximo son 500 000 muestras/s. Es lo que da div = 0, y cualquier div por debajo de 96 da también ese máximo, porque el ADC no puede ir más rápido.', q: mcq('¿Qué ritmo de muestreo da adc_set_clkdiv(0)?', ['500 ksps, el máximo', '48 Msps', 'Ninguno: el ADC se para', '1 ksps'], 'Cada conversión necesita 96 ciclos.') }
    ] },
    rp_dmachain: { name: 'Encadenar canales DMA', alts: [
      { title: 'Ping-pong', text: 'Dos canales se pasan el testigo con <b>chain_to</b>: A llena el búfer 1 y arranca B; B llena el 2 y arranca A. Una interrupción avisa a la CPU de qué búfer está listo; la CPU lo procesa mientras se llena el otro y deja preparado el canal que terminó.\nOtro truco: un canal de control que reprograma al de datos para repetir sin la CPU.', q: mcq('En ping-pong, ¿cuánto tiempo tiene la CPU para procesar un búfer?', ['Lo que tarda en llenarse el otro', 'Todo el que quiera', 'Un ciclo', 'Ninguno: lo procesa mientras se llena'], 'Si tarda más, el otro canal lo pisará.') },
      { title: 'Un canal que reprograma a otro', text: 'Un canal de control puede escribir en los registros de otro canal. Si escribe en un alias que dispara (como al3_read_addr_trig), lo reapunta al inicio de una tabla y lo relanza: un bucle infinito sin la CPU, ideal para un generador de señales. Con chain_to, dos canales también pueden turnarse en ping-pong.', q: mcq('El canal de datos termina la tabla y encadena al de control. ¿Qué escribe el de control?', ['La dirección de inicio de la tabla en el registro de lectura con disparo del canal de datos', 'El tamaño de la tabla en la flash', 'Un cero en el PIO', 'Nada: solo espera'], 'Así el de datos vuelve a empezar solo.') }
    ] },
    rp_dmaring: { name: 'Anillo del DMA y alineación', alts: [
      { title: 'Volver al principio sin la CPU', text: 'Con channel_config_set_ring la dirección de lectura (o de escritura) da la vuelta cada <b>2ⁿ bytes</b>: el canal recorre el mismo búfer una y otra vez.\nFunciona dejando fijos los bits altos de la dirección y variando solo los n bajos, así que el búfer debe estar <b>alineado</b> a 2ⁿ bytes.', q: mcq('Anillo con n = 10. ¿Tamaño y alineación del búfer?', ['1024 bytes, alineado a 1024', '10 bytes, sin alinear', '1024 bytes, en cualquier dirección', '10 KB, alineado a 4'], '2¹⁰ = 1024.') },
      { title: 'Por qué alineado', text: 'Un búfer de 256 bytes que empieza en 0x20000100 va hasta 0x200001FF: solo cambian los 8 bits bajos y, al dar la vuelta, vuelve a 0x20000100. Si empezara en 0x20000180, la vuelta lo llevaría a 0x20000100, fuera de tu búfer.', q: mcq('¿Cuál de estas direcciones de inicio vale para un anillo de 256 bytes?', ['0x20000400', '0x20000410', '0x20000480', '0x20000401'], 'Debe ser múltiplo de 0x100.') }
    ] },
    rp_corefifo: { name: 'La FIFO entre núcleos', alts: [
      { title: 'Un buzón de 8 cartas', text: 'El SIO tiene dos FIFO, una en cada sentido, de 32 bits: en el RP2040, de <b>8 palabras</b> (en el RP2350 son más cortas, de 4 según su hoja de datos). <b>multicore_fifo_push_blocking</b> envía y, si la FIFO está llena, espera; <b>multicore_fifo_pop_blocking</b> recibe y espera si está vacía. multicore_fifo_wready() dice si hay hueco.', q: mcq('En un RP2040, el núcleo 1 lleva un rato sin leer y el 0 hace push_blocking por novena vez. ¿Qué pasa?', ['El núcleo 0 se queda esperando hueco', 'Se pierde el dato', 'Se sobrescribe el más antiguo', 'Se reinicia el núcleo 1'], 'En el RP2040 caben 8 palabras.') },
      { title: 'Mensajes en vez de variables', text: 'Pasar datos por la FIFO evita compartir variables y, con ello, cerrojos y carreras: un solo escritor y un solo lector.\nFunciones: multicore_launch_core1 arranca el núcleo 1; push y pop envían y reciben; get_core_num dice en qué núcleo estás.', q: mcq('¿Qué función dice desde qué núcleo se está ejecutando el código?', ['get_core_num()', 'multicore_fifo_pop_blocking()', 'multicore_launch_core1()', 'multicore_fifo_wready()'], 'Devuelve 0 o 1.') }
    ] },
    rp_multicore: { name: 'Condiciones de carrera', alts: [
      { title: 'Dos cocineros, un cuaderno', text: 'Dos cocineros apuntan raciones en el mismo cuaderno. Los dos leen «10», los dos suman uno y los dos escriben «11»: se ha perdido una ración.\n«contador += 1» es en realidad <b>leer, sumar, escribir</b>. Si los dos núcleos lo hacen a la vez, se pierden incrementos: es una <b>condición de carrera</b>.', q: mcq('Dos núcleos suman 1000 veces cada uno a la misma variable sin protección. El resultado…', ['Puede ser menor que 2000', 'Siempre es 2000', 'Siempre es 1000', 'Es mayor que 2000'], 'Algunas sumas se pisan.') },
      { title: 'Paso a paso', text: 'Núcleo 0 lee 5. Núcleo 1 lee 5. Núcleo 0 suma y escribe 6. Núcleo 1 suma y escribe 6. Dos incrementos y el resultado es 6: se ha perdido uno.\nSolo pasa si las dos lecturas ocurren antes de las escrituras; por eso el fallo es raro y difícil de reproducir.', q: mcq('Núcleo 0 lee 7, suma y escribe 8. Después, el núcleo 1 lee, suma y escribe. ¿Resultado?', ['9', '8', '7', '10'], 'Sin solaparse, no se pierde nada.') }
    ] },
    rp_lock: { name: 'Cerrojos y secciones críticas', alts: [
      { title: 'El cerrojo', text: 'Un <b>cerrojo</b> hace que solo un núcleo a la vez entre en la <b>sección crítica</b>; el otro espera. En el SDK: critical_section_enter_blocking / exit (que además desactiva interrupciones) o mutex_t para esperas largas; en MicroPython, <b>with cerrojo:</b>, que lo suelta incluso si hay un error.\nEl M0+ no tiene instrucciones atómicas de leer-modificar-escribir: por eso el RP2040 trae 32 <b>spinlocks</b> en hardware en el SIO. Con varios cerrojos, tómalos siempre en el mismo orden.', q: mcq('¿Qué NO debes hacer con un cerrojo tomado?', ['Esperar a que llegue un dato por el puerto serie', 'Sumar 1 a un contador', 'Copiar una estructura pequeña', 'Leer una variable compartida'], 'El otro núcleo se queda girando mientras esperas.') },
      { title: 'Reglas de oro', text: '1) Secciones críticas <b>cortas</b>: si desactivan interrupciones, retrasan USB, temporizadores y comunicaciones.\n2) Con varios cerrojos, tómalos <b>siempre en el mismo orden</b>: si el núcleo 0 tiene A y espera B mientras el 1 tiene B y espera A, ninguno avanza (interbloqueo).\n3) Si puedes, pasa mensajes en vez de compartir. Herramientas: critical_section, mutex_t o with cerrojo en MicroPython.', q: mcq('Una rutina toma A y luego B; otra toma B y luego A. ¿Cómo evitas el interbloqueo?', ['Haciendo que las dos tomen A antes que B', 'Quitando los cerrojos', 'Añadiendo un sleep entre las dos tomas', 'Usando más núcleos'], 'El mismo orden en todas partes.') }
    ] },

    /* ---------- M7 · USB y conectividad ---------- */
    rp_usb: { name: 'Clases USB', alts: [
      { title: 'Presentarse al ordenador', text: 'Al enchufar, tu Pico dice qué <b>clases</b> ofrece: HID (teclado, ratón, mando), CDC (puerto serie), MSC (almacenamiento), MIDI (instrumentos)…\nComo son estándar, el sistema ya trae sus controladores: no hay que instalar nada. El RP2040 usa USB de velocidad completa (12 Mbit/s).', q: mcq('¿Por qué un macroteclado hecho con la Pico funciona sin instalar nada?', ['Porque se presenta como HID, una clase estándar', 'Porque copia el driver del teclado', 'Porque usa la WiFi', 'Porque el RP2040 lleva Windows'], 'El sistema ya trae el controlador HID.') },
      { title: 'Cada clase, su comportamiento', text: '<b>HID</b>: el sistema lo acepta sin preguntar, lo que es cómodo… y peligroso: un aparato que se hace pasar por teclado puede escribir órdenes.\n<b>CDC</b>: puerto serie virtual; el baudio que elijas es simbólico, los datos van a velocidad USB (12 Mbit/s en el RP2040).\n<b>MSC</b>: unidad de disco. <b>MIDI</b>: instrumentos.', q: mcq('¿Qué clase usarías para que la Pico aparezca como una unidad de disco?', ['MSC', 'HID', 'CDC', 'MIDI'], 'Mass Storage Class.') }
    ] },
    rp_usbenum: { name: 'Enumeración y descriptores USB', alts: [
      { title: 'La presentación', text: 'Al conectar, el anfitrión reinicia el bus, pide el <b>descriptor de dispositivo</b> (con VID y PID), asigna una dirección, lee la configuración con sus interfaces y carga un controlador por clase.\n<b>VID</b> identifica al fabricante (lo asigna la organización USB) y <b>PID</b>, al producto.', q: mcq('¿Qué identifica el PID?', ['El producto, dentro de un fabricante', 'El fabricante', 'La velocidad del USB', 'La clase del dispositivo'], 'El VID es el del fabricante.') },
      { title: 'Varias interfaces en un aparato', text: 'Un dispositivo puede declarar varias interfaces en su configuración: es un <b>dispositivo compuesto</b>. Todo eso lo lee el anfitrión al enumerar, empezando por el descriptor con VID (fabricante) y PID (producto). Así una Pico puede ser a la vez teclado (HID) y puerto serie (CDC), o MIDI y CDC, con un solo cable.', q: mcq('Quieres que tu controlador MIDI tenga también una consola serie. ¿Qué haces?', ['Declarar un dispositivo compuesto con MIDI y CDC', 'Usar dos cables', 'Alternar entre los dos con un botón', 'No se puede'], 'Las dos interfaces van en los mismos descriptores.') }
    ] },
    rp_tinyusb: { name: 'TinyUSB: atender el USB a tiempo', alts: [
      { title: 'El USB se atiende en tu bucle', text: 'TinyUSB no trabaja solo: procesa los eventos del USB dentro de <b>tud_task()</b>. Si tu bucle se queda bloqueado (un sleep largo, una espera activa), el anfitrión no recibe respuesta y el dispositivo falla o se desconecta. Y antes de enviar un informe HID, tud_hid_ready() dice si cabe.', q: mcq('Pones sleep_ms(2000) en el bucle principal de tu teclado USB. ¿Qué pasa?', ['El USB no se atiende durante 2 s y el dispositivo puede fallar', 'Nada', 'Escribe más rápido', 'Se reinicia la Pico'], 'Llama a tud_task() a menudo.') },
      { title: 'Esperar turno', text: 'El anfitrión recoge los informes HID a intervalos fijos. Hasta que no se ha llevado el anterior, no cabe otro: <b>tud_hid_ready()</b> te dice si puedes enviar. Si envías antes, el informe se pierde. Igual de importante: llamar a tud_task() a menudo.', q: mcq('Envías dos informes seguidos sin comprobar tud_hid_ready(). ¿Qué puede pasar?', ['Que el segundo se pierda', 'Que salgan al doble de velocidad', 'Que el primero se repita para siempre', 'Nada'], 'Comprueba antes de cada envío.') }
    ] },
    rp_hid: { name: 'Informes HID de teclado y ratón', alts: [
      { title: 'Informes y teclas soltadas', text: 'Un teclado HID envía <b>informes</b>: un byte de modificadores (Ctrl, Mayús…) y hasta 6 teclas pulsadas a la vez. Lo que cuenta es el <b>estado</b>: si envías «C pulsada» y nunca «nada pulsado», el ordenador cree que sigues apretando.\nEl ratón envía desplazamientos de −127 a 127 por informe: para 300 unidades, 3 informes (127 + 127 + 46).', q: mcq('Tu macroteclado escribe «cccccccc» sin parar tras pulsar. ¿Qué falta?', ['Enviar un informe vacío al soltar', 'Más corriente en el USB', 'Antirrebote en el ordenador', 'Cambiar el PID'], 'Pulsar y soltar son dos informes.') },
      { title: 'Bits de modificadores y posiciones', text: 'El byte de modificadores tiene un bit por tecla: bit 0 Ctrl izq. (1), bit 1 Mayús izq. (2), bit 2 Alt izq. (4), bit 3 GUI izq. (8). Ctrl + Alt = 1 + 4 = 0x05.\nLas teclas no son letras sino <b>posiciones</b>: el sistema las traduce con su distribución, así que la misma posición puede dar «-» o «\'». No olvides el informe vacío al soltar. El ratón envía desplazamientos de −127 a 127 por informe.', q: mcq('¿Qué byte de modificadores es Mayús + Alt izquierdos?', ['0x06', '0x03', '0x05', '0x0C'], '2 + 4 = 6.') }
    ] },
    rp_midi: { name: 'Mensajes MIDI', alts: [
      { title: 'Estado y datos', text: 'Un mensaje MIDI empieza con un <b>byte de estado</b>: tipo en los 4 bits altos (0x9 Note On, 0x8 Note Off, 0xB Control Change, 0xE Pitch bend) y canal en los 4 bajos (canal 1 = 0, canal 16 = 15). Le siguen bytes de datos con el bit alto a 0, de 0 a 127.\nNote On del canal 3 = 0x92.', q: mcq('Control Change por el canal 10. ¿Byte de estado?', ['0xB9', '0xBA', '0x9B', '0xB0'], 'Tipo 0xB y canal 10 − 1 = 9.') },
      { title: 'Por qué 7 bits', text: 'El bit alto distingue estados (1) de datos (0): si se pierde un byte, el receptor encuentra el siguiente estado y se resincroniza.\nEl MIDI clásico de 5 pines es una UART a <b>31 250 baudios</b> (1 MHz / 32); por USB, la clase MIDI lleva los mismos mensajes.', q: mcq('¿Es 0x85 un byte de estado o de datos?', ['De estado: Note Off del canal 6', 'De datos: 133', 'De estado: Note On del canal 5', 'De datos: velocidad 85'], 'Bit alto a 1; tipo 0x8, canal 5 + 1.') }
    ] },
    rp_wifi: { name: 'Conectar la Pico W sin colgarse', alts: [
      { title: 'Conectar con límite', text: 'wlan = network.WLAN(network.STA_IF); wlan.active(True); wlan.connect(ssid, clave). Luego espera a isconnected(), pero con un <b>tiempo máximo</b> (por ejemplo, 20 s): si la red no está, el programa no debe quedarse colgado.\n<b>wlan.status()</b> explica qué pasa: STAT_GOT_IP (conectado), STAT_CONNECTING, STAT_WRONG_PASSWORD, STAT_NO_AP_FOUND.', q: mcq('wlan.status() devuelve STAT_NO_AP_FOUND. ¿Qué compruebas?', ['El nombre de la red y que esté al alcance en 2,4 GHz', 'La contraseña', 'Nada: ya está conectado', 'El cable USB'], 'No encuentra el punto de acceso.') },
      { title: 'La red es frágil', text: 'La WiFi se cae, el router reinicia y la Pico pierde la IP. Un programa serio comprueba <b>wlan.isconnected()</b> de vez en cuando, reintenta con pausas crecientes y nunca se queda bloqueado esperando: cada intento con un tiempo máximo, y wlan.status() para saber por qué falla.', q: mcq('¿Qué debe hacer tu estación si la WiFi se cae de madrugada?', ['Detectarlo y reconectar sola, con reintentos espaciados', 'Esperar a que la reinicies', 'Borrar la configuración', 'Abrir un puerto en el router'], 'Robustez antes que funciones nuevas.') }
    ] },
    rp_netclient: { name: 'La Pico W como cliente', alts: [
      { title: 'Pedir y cerrar', text: '<b>requests.get(url)</b> devuelve una respuesta; r.json() la convierte en diccionario y <b>r.close()</b> libera el socket y su memoria. Sin cerrar, cada petición deja memoria ocupada y al cabo de horas te quedas sin RAM. HTTPS funciona, pero gasta bastante más.\nPara la hora, ntptime.settime(), que pone UTC.', q: mcq('Tu estación hace una petición cada minuto y tras unas horas da MemoryError. ¿Sospecha?', ['No cierras las respuestas con r.close()', 'La WiFi', 'El ADC', 'Demasiados print'], 'Cada respuesta abierta retiene memoria.') },
      { title: 'La hora de la red', text: '<b>ntptime.settime()</b> pone el reloj interno con la hora de un servidor NTP, en <b>UTC</b>. En España peninsular suma 1 hora en invierno y 2 en verano (en Canarias, una menos).\nPide la hora de vez en cuando: el reloj de la placa deriva. Y tras cada petición con requests, r.close().', q: mcq('Tras ntptime.settime(), la Pico marca las 10:00 en julio. ¿Qué hora es en Madrid?', ['Las 12:00', 'Las 10:00', 'Las 11:00', 'Las 09:00'], 'En verano, UTC + 2.') }
    ] },
    rp_net: { name: 'HTTP: peticiones y respuestas', alts: [
      { title: 'Cliente y servidor', text: 'Un <b>servidor</b> espera conexiones en un puerto (el 80 para HTTP). El <b>cliente</b> (tu navegador) envía una petición: una primera línea con método, ruta y versión («GET /led?on=1 HTTP/1.1»), cabeceras y una línea en blanco.\nLa respuesta: línea de estado, cabeceras, línea en blanco y contenido. A rutas desconocidas, 404; para datos, JSON; para acciones, POST en vez de GET.', q: mcq('En una respuesta HTTP, ¿qué separa las cabeceras del contenido?', ['Una línea en blanco', 'Un punto y coma', 'Nada', 'La palabra BODY'], 'Si la olvidas, el navegador se lía.') },
      { title: 'Qué responder', text: 'Tu servidor lee la primera línea (método y ruta), salta las cabeceras hasta la línea vacía y responde: «HTTP/1.0 200 OK», Content-Type (text/html o application/json), línea en blanco, cuerpo, y cierra. A las rutas que no conoces, <b>404</b>.\nUna ruta /api en JSON deja que otros programas usen los datos. GET solo debe consultar; lo que cambia algo, <b>POST</b>.', q: mcq('El navegador pide /config y tu servidor no la tiene. ¿Qué respondes?', ['HTTP/1.0 404 Not Found, y cierras', 'La página principal', 'Nada: dejas la conexión abierta', 'Reinicias la Pico'], 'Responder siempre y cerrar.') }
    ] },
    rp_netsec: { name: 'Seguridad de un servidor casero', alts: [
      { title: 'Solo en casa', text: 'Tu servidor de la Pico W no tiene cifrado ni contraseña: cualquiera que llegue a él puede usarlo. Úsalo <b>solo en tu red local</b> y no abras puertos del router hacia él. Para controlar algo desde fuera, un servicio con autenticación y cifrado o una VPN.', q: mcq('¿Qué riesgo tiene redirigir el puerto 80 del router a tu Pico W, que controla un relé?', ['Cualquiera en Internet podría accionar el relé', 'Ninguno', 'Que la WiFi vaya lenta', 'Que se borre la flash'], 'Hay robots escaneando puertos sin parar.') },
      { title: 'Defensa en el aparato', text: 'Aunque alguien entre, el aparato debe protegerse solo: límites de tiempo de encendido, termostato propio, validar todo lo que llega en la URL. Y las cargas de la red eléctrica, solo con módulos certificados.', q: mcq('Tu estufa se enciende desde la web de la Pico. ¿Qué protección pones en el propio aparato?', ['Un apagado automático por tiempo y por temperatura', 'Una página más bonita', 'Más brillo en el LED', 'Ninguna: basta la clave de la WiFi'], 'La seguridad no puede depender solo de la red.') }
    ] },
    rp_radio: { name: 'La radio de la Pico W', alts: [
      { title: 'Una radio de 2,4 GHz', text: 'El CYW43439 hace WiFi 4 y Bluetooth <b>solo en 2,4 GHz</b>: no ve redes de 5 GHz. WiFi y BLE comparten radio y antena repartiéndose el tiempo: se pueden usar a la vez, con menos rendimiento cada uno. Al ser 2,4 GHz, banda libre: sin licencia, con rp2.country(\'ES\') para los canales de aquí.', q: mcq('Tu router emite a 2,4 y a 5 GHz con nombres distintos. ¿A cuál conectas la Pico W?', ['Al de 2,4 GHz', 'Al de 5 GHz', 'A cualquiera', 'A ninguno'], 'La radio de la W no trabaja en 5 GHz.') },
      { title: 'Normativa', text: 'La banda de 2,4 GHz es de uso libre en España: no necesitas licencia, siempre que el equipo respete los límites de potencia (el módulo homologado ya lo hace). <b>rp2.country(\'ES\')</b> fija los canales y potencias permitidos aquí: en Europa, del 1 al 13.\nSi modificas antenas o potencias, deja de estar homologado. Y recuerda: solo 2,4 GHz, con WiFi y BLE compartiendo la radio.', q: mcq('¿Qué canales WiFi de 2,4 GHz se pueden usar en España?', ['Del 1 al 13', 'Del 1 al 11', 'Solo el 6', 'Del 1 al 14'], 'El 14 solo se usa en Japón y del 12 al 13 no en EE. UU.') }
    ] },
    rp_ble: { name: 'Bluetooth LE: anuncios y características', alts: [
      { title: 'Periférico y central', text: 'Tu Pico (<b>periférico</b>) se anuncia; el móvil (<b>central</b>) escanea y se conecta. Sin anuncio, nadie sabe que existes.\nLos datos van en <b>servicios</b>, que agrupan <b>características</b>: valores que se leen, se escriben o se notifican. Cada uno tiene un UUID: de 16 bits si es estándar, de 128 si es tuyo.', q: mcq('¿Quién inicia la conexión en BLE?', ['El central, tras ver el anuncio del periférico', 'El periférico', 'El router', 'Los dos a la vez'], 'El periférico solo se anuncia.') },
      { title: 'Leer o notificar', text: 'Si el móvil <b>lee</b> una característica, pregunta cuando quiere. Si quieres mandar un valor cada vez que cambie, sin esperar preguntas, usa <b>notificaciones</b>: el central se suscribe y recibe cada cambio. Ahorra radio y batería frente a preguntar sin parar.\nTodo empieza con el anuncio: el periférico se anuncia y el central (el móvil) se conecta.', q: mcq('Un pulsómetro debe mandar cada latido al móvil en cuanto ocurre. ¿Qué usa?', ['Notificaciones de una característica', 'Lecturas periódicas desde el móvil', 'El nombre del anuncio', 'Escrituras desde el móvil'], 'El periférico avisa; el móvil no pregunta.') }
    ] },

    /* ---------- M8 · Bajo consumo y producto ---------- */
    rp_sleep: { name: 'Modos de sueño', alts: [
      { title: 'Qué se apaga', text: '<b>lightsleep</b>: la CPU y casi todos los relojes se paran; despiertas con un temporizador o una interrupción.\n<b>dormant</b> (en C): se paran incluso los osciladores; casi nada consume y solo despiertas con un <b>flanco en un GPIO</b> (o un reloj externo). Como no hay reloj, ningún temporizador interno puede despertarte. Tras deepsleep, el programa empieza desde el principio.', q: mcq('¿Qué te despierta del modo dormant?', ['Un flanco en un GPIO', 'Un repeating_timer', 'Un mensaje por USB', 'Nada: hay que desconectar la batería'], 'Con los osciladores parados no hay temporizadores.') },
      { title: 'Dónde sigue el programa', text: '<b>machine.lightsleep(ms)</b>: al despertar, el programa sigue en la línea siguiente con todas sus variables.\n<b>machine.deepsleep(ms)</b>: al despertar, empieza desde el principio, como tras un reinicio: guarda en un fichero lo que debas recordar. Y en dormant (C) solo te despierta un flanco en un pin.', q: mcq('Tras machine.lightsleep(5000), ¿qué pasa con tus variables?', ['Siguen ahí: continúa en la línea siguiente', 'Se pierden', 'Se guardan solas en la flash', 'Vuelven a cero'], 'Solo deepsleep reinicia el programa.') }
    ] },
    rp_lowpower: { name: 'Reducir el consumo de la Pico', alts: [
      { title: 'Mide antes de optimizar', text: 'El multímetro va <b>en serie con VSYS</b>, con el USB desconectado (si no, alimenta el USB y no mides lo que crees). Consumen el RP2040, la flash, el regulador y lo que conectes.\nOrden: medir, quitar lo que sobra, dormir entre medidas, acortar el tiempo despierto, cortar la alimentación de lo externo y volver a medir. Los grandes consumidores: la radio y el regulador en modo PWM (GP23 a 1).', q: mcq('¿Qué es lo primero en una estrategia de bajo consumo?', ['Medir el consumo de partida', 'Cambiar de batería', 'Subir clk_sys', 'Quitar el regulador'], 'Sin medidas, optimizas a ciegas.') },
      { title: 'Los grandes consumidores', text: 'En la Pico W, la <b>radio</b> pesa más que todo lo demás: conecta, envía y apágala con wlan.active(False).\nEl regulador, en modo ahorro (<b>GP23 en bajo</b>, el de serie; en la W ese control pasa por la radio), gasta menos con poca carga; ponlo en PWM (GP23 a 1) solo cuando necesites un ADC más limpio. Y mide en serie con VSYS, con el USB desconectado.', q: mcq('¿Qué apagas primero en un nodo Pico W que envía un dato cada hora?', ['La radio WiFi entre envíos', 'El ADC', 'El segundo núcleo', 'El pull-up de un botón'], 'La radio encendida domina el consumo.') }
    ] },
    rp_avg: { name: 'Consumo medio y autonomía', alts: [
      { title: 'Media ponderada', text: 'Si el aparato alterna estados, su consumo medio es la media ponderada por el tiempo:\n<b>I media = (I activa × t activa + I dormida × t dormida) / periodo</b>.\nCon 25 mA durante 1 s y 1 mA los otros 59 s: (25 + 59) / 60 = 1,4 mA. Aquí manda el consumo dormido.', q: mcq('20 mA durante 1 ms cada segundo y 10 µA el resto. ¿Media aproximada?', ['Unos 30 µA', 'Unos 20 mA', 'Unos 10 µA', 'Unos 10 mA'], '20 mA × 0,001 = 20 µA, más 10 µA dormido.') },
      { title: 'De mAh a días', text: 'Autonomía ideal = capacidad (mAh) / consumo medio (mA), en horas. 2000 mAh / 0,5 mA = 4000 h ≈ 167 días. En la práctica, menos: autodescarga, frío y picos que hacen caer la tensión.\nSi duplicas el intervalo entre medidas y el consumo dormido es despreciable, la media baja casi a la mitad y la autonomía casi se duplica.', q: mcq('Media de 0,1 mA con una batería de 1200 mAh. ¿Autonomía ideal?', ['500 días', '12 000 días', '50 días', '120 días'], '1200 / 0,1 = 12 000 h = 500 días.') }
    ] },
    rp_hw: { name: 'Esquema mínimo con el RP2040', alts: [
      { title: 'Lo mínimo para arrancar', text: 'El RP2040 necesita: <b>3,3 V</b> estables (un regulador), sus <b>condensadores de desacoplo</b>, un <b>cristal de 12 MHz</b>, una <b>flash QSPI</b> y el USB con sus resistencias de 27 Ω. Con conector USB-C, además, 5,1 kΩ de CC1 y CC2 a masa para que el cargador dé 5 V.\nEl núcleo de 1,1 V lo genera su propio regulador interno. El RP2350 cambia esto: su regulador es conmutado y necesita una bobina.', q: mcq('¿Qué pieza NO es imprescindible en tu placa mínima con RP2040?', ['Un chip WiFi', 'La flash QSPI', 'El cristal de 12 MHz (si usas USB)', 'Los condensadores de desacoplo'], 'Sin flash no hay programa; sin cristal, el USB no tiene reloj fiable.') },
      { title: 'Las alimentaciones', text: '<b>IOVDD</b> (GPIO), <b>USB_VDD</b> y <b>ADC_AVDD</b> van a 3,3 V. El núcleo funciona a 1,1 V: <b>VREG_VIN</b> recibe 3,3 V y <b>VREG_VOUT</b> saca 1,1 V hacia los pines <b>DVDD</b>, con 1 µF a la entrada y a la salida, y 100 nF por cada pata.\nEn USB-C, 5,1 kΩ de CC1 y de CC2 a masa. Y si usas el RP2350, su regulador conmutado necesita una bobina.', q: mcq('¿A qué pines llega el 1,1 V de VREG_VOUT?', ['A DVDD, el núcleo digital', 'A IOVDD', 'A ADC_AVDD', 'A USB_VDD'], 'Los demás van a 3,3 V.') }
    ] },
    rp_crystal: { name: 'Condensadores de carga del cristal', alts: [
      { title: 'La fórmula', text: 'El cristal debe ver la capacidad de carga <b>CL</b> de su hoja de datos. Sus dos condensadores quedan en serie (C / 2) y se suma la capacidad parásita: CL = C / 2 + Cp.\nDespejando: <b>C = 2 × (CL − Cp)</b>. Con CL = 12 pF y 4 pF parásitos: C = 16 pF.', q: mcq('Cristal con CL = 18 pF y unos 3 pF parásitos. ¿Condensadores?', ['30 pF', '36 pF', '15 pF', '42 pF'], '2 × (18 − 3) = 30 pF.') },
      { title: 'El error típico', text: 'No pongas dos condensadores del valor de CL: en serie se quedan en la mitad. Y no olvides los parásitos de pistas y patas (unos pocos pF): sin restarlos, el cristal oscila un poco desplazado de su frecuencia.', q: mcq('Con CL = 10 pF pones dos condensadores de 10 pF y hay 3 pF parásitos. ¿Qué carga ve el cristal?', ['Unos 8 pF', '20 pF', '10 pF', '13 pF'], '10 / 2 + 3 = 8 pF.') }
    ] },
    rp_layout: { name: 'Colocación y rutado de tu placa', alts: [
      { title: 'Primero lo crítico', text: 'Coloca primero el RP2040 y las vías de su pad central; luego la <b>flash</b> pegada a las patas QSPI, el <b>cristal</b> junto a XIN y XOUT y los <b>desacoplos</b> pegados a cada pata; después el USB con sus 27 Ω; al final, regulador y conectores en los bordes.', q: mcq('¿Qué colocas antes, el cristal o el conector USB?', ['El cristal, pegado al chip', 'El conector USB', 'Da igual', 'Ninguno: el cristal va fuera de la placa'], 'Lo sensible, primero y cerca.') },
      { title: 'Pistas cortas y masa', text: 'Las pistas largas del cristal o de la flash recogen ruido y añaden capacidad: arranques inestables, USB que falla o errores al leer el programa. Plano de masa continuo, nada rápido bajo el cristal y pistas del cristal y QSPI lo más cortas posible.', q: mcq('La flash está a 4 cm del chip y la placa falla al ejecutar programas. ¿Qué sospechas?', ['Las pistas QSPI, demasiado largas', 'El color de la placa', 'El conector USB', 'Los botones'], 'El QSPI corre a decenas de MHz.') }
    ] },
    rp_hwflash: { name: 'Flash y BOOTSEL en tu placa', alts: [
      { title: 'Una flash compatible', text: 'El RP2040 arranca desde una flash QSPI externa de <b>hasta 16 MB</b>; usa una compatible con su ROM de arranque, como la familia W25Q, pegada a sus patas QSPI. El BOOTSEL va de su CS a masa con 1 kΩ.', q: mcq('¿Cuál es el máximo de flash QSPI que admite el RP2040?', ['16 MB', '2 MB', '4 MB', '64 MB'], 'La Pico trae 2 MB, pero el chip admite más.') },
      { title: 'El BOOTSEL con resistencia', text: 'El botón BOOTSEL une el CS de la flash (QSPI_SS) con masa a través de unos <b>1 kΩ</b>. Al arrancar, la ROM lee ese nivel bajo y entra en modo USB. La resistencia evita un cortocircuito si pulsas mientras el chip excita el CS. La flash puede ser de hasta 16 MB.', q: mcq('¿Qué hace el BOOTSEL al pulsarlo durante el arranque?', ['Baja el CS de la flash y la ROM entra en modo USB', 'Corta la alimentación', 'Borra la flash', 'Cambia el cristal'], 'Por eso va entre QSPI_SS y masa.') }
    ] },
    rp_bringup: { name: 'Puesta en marcha de tu placa', alts: [
      { title: 'De abajo arriba', text: 'Primero, fuente con límite de corriente y mide <b>3,3 V y 1,1 V</b>. Luego enchufa con BOOTSEL: si aparece <b>RPI-RP2</b>, funcionan la ROM, el cristal y el USB (este modo no necesita la flash). Después graba un UF2: si no arranca, el problema está en la <b>flash</b>, sus pistas QSPI o una flash no compatible.', q: mcq('Mides 3,3 V pero 0 V en DVDD. ¿Qué revisas?', ['El regulador interno: VREG_VIN, VREG_VOUT y sus condensadores', 'La flash', 'El programa', 'El conector USB'], 'El 1,1 V sale de VREG_VOUT.') },
      { title: 'Diagnóstico por síntomas', text: 'No aparece RPI-RP2 → tensiones, cristal o líneas USB (D+ y D−, 27 Ω).\nAparece RPI-RP2 pero el programa no arranca → flash.\nCada prueba descarta una parte: avanza en ese orden.', q: mcq('La placa no aparece como RPI-RP2 y las tensiones están bien. ¿Qué miras después?', ['El cristal y las líneas USB', 'La flash', 'El programa', 'El ADC'], 'El modo BOOTSEL no usa la flash.') }
    ] },
    rp_product: { name: 'De prototipo a producto', alts: [
      { title: 'Lo que falta', text: 'Un prototipo que funciona aún no se puede vender. En la UE necesita <b>marcado CE</b>: compatibilidad electromagnética, seguridad eléctrica y, si lleva radio, la directiva de equipos radioeléctricos. Además, <b>VID/PID</b> propios (Raspberry Pi concede PID bajo su VID para productos con sus chips) y protección de la alimentación.', q: mcq('¿Qué necesitas para vender tu placa USB en la UE?', ['Marcado CE y un VID/PID tuyo o concedido', 'Solo que funcione', 'Un logotipo', 'Nada si es de código abierto'], 'Usar el VID/PID de un ejemplo no vale para vender.') },
      { title: 'Pensar en el usuario', text: 'El usuario enchufará lo que tenga a mano: cables al revés, cargadores dudosos, descargas electrostáticas. Un producto se protege (diodos TVS en el USB, fusible rearmable, protección contra polaridad inversa) y cumple las normas de emisiones para no interferir con otros aparatos.', q: mcq('¿Qué pones en las líneas USB contra descargas electrostáticas?', ['Diodos TVS', 'Un condensador de 1000 µF', 'Un fusible de 10 A', 'Nada'], 'Absorben los picos antes de que lleguen al chip.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  // Cada ejercicio generado lleva su pista (h) para Chispa
  const NH = (h, ...a) => ({ ...N(...a), h });
  const FS = [125, 150, 200];
  Gen.add('rp_pwmFreq', () => {
    const fs = pick(FS), div = pick([1, 2, 4, 10, 25, 125]), wrap = pick([99, 249, 999, 1249, 4999, 9999, 65535]);
    const f = fs * 1e6 / ((wrap + 1) * div);
    return NH('f = clk_sys / ((wrap + 1) × divisor): no olvides el +1 ni pasar los MHz a Hz.', `PWM con clk_sys = ${fs} MHz, divisor ${div} y wrap ${wrap}. ¿Frecuencia en Hz?`, f, 'Hz', `f = clk_sys / ((wrap + 1) × div) = ${fs} MHz / (${wrap + 1} × ${div}) = ${fmt(f, 2)} Hz. El +1 sale de que el contador cuenta de 0 a wrap, ambos incluidos.`, f * 0.005 + 0.05);
  }, 'rp_pwmwrap');
  Gen.add('rp_pwmWrap', () => {
    const h = 'Despeja: wrap + 1 = clk_sys / (f × divisor), y luego resta 1.';
    for (let k = 0; k < 60; k++) {
      const fs = pick([125, 200]), div = pick([1, 2, 5, 10, 25, 50, 125]), f = pick([50, 100, 500, 1000, 2000, 5000, 10000, 20000, 25000, 40000, 100000]);
      const w = fs * 1e6 / (f * div) - 1;
      if (Number.isInteger(w) && w >= 9 && w <= 65535) return NH(h, `clk_sys = ${fs} MHz y divisor ${div}. ¿Qué wrap necesitas para ${fHz(f)}?`, w, '', `wrap = clk_sys / (f × div) − 1 = ${fs} 000 000 / (${f} × ${div}) − 1 = ${w}. Tendrás ${w + 1} niveles de ciclo de trabajo.`, 1);
    }
    return NH(h, 'clk_sys = 125 MHz y divisor 1. ¿Qué wrap necesitas para 25 kHz?', 4999, '', '125 000 000 / 25 000 − 1 = 4999.', 1);
  }, 'rp_pwmwrap');
  Gen.add('rp_pwmSlice', () => {
    const n = ri(0, 29), s = (n >> 1) & 7, ch = n & 1 ? 'B' : 'A', ot = ch === 'A' ? 'B' : 'A';
    return MC(`En un RP2040, ¿qué slice y canal de PWM usa GP${n}?`, `Slice ${s}, canal ${ch}`, [`Slice ${n >> 1}, canal ${ch}`, `Slice ${s}, canal ${ot}`, `Slice ${n % 8}, canal ${ch}`, `Slice ${(s + 1) % 8}, canal ${ch}`, `Slice ${(s + 7) % 8}, canal ${ot}`], `Slice = (${n} ÷ 2, sin decimales) módulo 8 = ${s}. Canal A si el número es par, B si es impar. Por eso GP${n} comparte frecuencia con GP${n ^ 1}.`, { h: 'Divide el número entre 2 sin decimales y quédate con el resto de dividir entre 8. Par = A, impar = B.' });
  }, 'rp_pwmslice');
  Gen.add('rp_u16V', () => {
    const n = ri(800, 64000), v = n * 3.3 / 65535, h = 'read_u16 ya va de 0 a 65535: divide entre 65535 y multiplica por 3,3 V.';
    if (Math.random() < 0.5) return NH(h, `adc.read_u16() devuelve ${n}. Con la referencia de 3,3 V, ¿cuántos voltios son?`, v, 'V', `V = ${n} × 3,3 / 65535 = ${fmt(v, 3)} V.`, 0.01);
    return MC(`En la Pico, read_u16() da ${n}. ¿Tensión en el pin?`, fmt(v, 2) + ' V', [fmt(n * 3.3 / 4095, 2) + ' V', fmt(n * 5 / 65535, 2) + ' V', fmt(n * 3.3 / 1023, 2) + ' V', fmt(n / 65535, 2) + ' V'], `Divide entre 65535 (no entre 4095: read_u16 ya está escalado a 16 bits) y multiplica por 3,3 V, no por 5 V.`, { h });
  }, 'rp_adc16');
  Gen.add('rp_temp', () => {
    const v = ri(680, 730) / 1000, T = 27 - (v - 0.706) / 0.001721;
    if (Math.random() < 0.5) return NH('Resta 0,706 V, divide entre 0,001721 y réstaselo a 27: la pendiente es negativa.', `El sensor interno da ${fmt(v, 3)} V. ¿Temperatura en °C? (T = 27 − (V − 0,706) / 0,001721)`, T, '°C', `T = 27 − (${fmt(v, 3)} − 0,706) / 0,001721 = ${fmt(T, 1)} °C. Más tensión, menos temperatura: la pendiente es negativa.`, 0.6);
    const n = Math.round(v / 3.3 * 65535), vv = n * 3.3 / 65535, TT = 27 - (vv - 0.706) / 0.001721;
    return NH('Dos pasos: primero voltios (× 3,3 / 65535) y luego la fórmula T = 27 − (V − 0,706) / 0,001721.', `ADC(4).read_u16() devuelve ${n}. ¿Temperatura del chip en °C?`, TT, '°C', `Primero voltios: ${n} × 3,3 / 65535 = ${fmt(vv, 4)} V. Luego T = 27 − (V − 0,706) / 0,001721 = ${fmt(TT, 1)} °C.`, 0.8);
  }, 'rp_tempsens');
  Gen.add('rp_pioDiv', () => {
    const fs = pick(FS), [baud, nom] = pick([[9600, ''], [19200, ''], [115200, ''], [31250, ' (MIDI)'], [250000, ' (DMX)'], [1000000, '']]), c = pick([4, 8, 10, 16]);
    const d = fs * 1e6 / (baud * c);
    return NH('La máquina debe ir a baudios × ciclos por bit: divide clk_sys (en Hz) entre ese producto.', `clk_sys = ${fs} MHz. Un programa PIO usa ${c} ciclos por bit. ¿Qué divisor necesitas para ${baud} baudios${nom}?`, d, '', `div = ${fs} 000 000 / (${baud} × ${c}) = ${fmt(d, 2)}. El divisor del PIO admite fracciones (16 bits enteros y 8 de fracción).`, Math.max(0.02, d * 0.003));
  }, 'rp_piodiv');
  Gen.add('rp_pioBit', () => {
    const f = pick([1, 2, 8, 10, 12.5, 25]), c = pick([4, 5, 8, 10]);
    if (Math.random() < 0.5) return NH('Un ciclo dura 1000 / f(MHz) ns; multiplícalo por los ciclos del bit.', `Una máquina de estados PIO corre a ${fmt(f)} MHz y cada bit dura ${c} ciclos. ¿Cuánto dura un bit en ns?`, c * 1000 / f, 'ns', `Un ciclo = 1000 / ${fmt(f)} = ${fmt(1000 / f, 1)} ns; × ${c} = ${fmt(c * 1000 / f, 1)} ns.`, 1);
    return NH('Bits por segundo = frecuencia de la máquina / ciclos por bit. Cuidado con MHz y kbit/s.', `Máquina PIO a ${fmt(f)} MHz, ${c} ciclos por bit. ¿Cuántos bits por segundo (en kbit/s)?`, f * 1000 / c, 'kbit/s', `${fmt(f)} MHz / ${c} = ${fmt(f * 1000 / c, 1)} kbit/s.`, 0.5);
  }, 'rp_piocycles');
  Gen.add('rp_wsCycles', () => {
    const [f, n] = pick([[8, 10], [6.4, 8], [12, 15], [16, 20], [4.8, 6], [9.6, 12]]);
    return NH('Ciclos = duración del bit × frecuencia: µs × MHz da ciclos directamente.', `Un bit de WS2812 dura 1,25 µs. Si la máquina PIO corre a ${fmt(f)} MHz, ¿cuántos ciclos dura un bit?`, n, 'ciclos', `1,25 µs × ${fmt(f)} MHz = ${n} ciclos. Ese número tiene que salir entero para que el programa cuadre.`, 0.01);
  }, 'rp_ws2812');
  Gen.add('rp_dmaTime', () => {
    if (Math.random() < 0.6) {
      const fs = pick([10, 50, 100, 250, 500]), n = pick([256, 500, 1000, 2048, 4096, 10000]);
      return NH('Con DREQ, el DMA va al ritmo del ADC: tiempo = muestras / muestras por segundo.', `El ADC muestrea a ${fs} ksps y el DMA guarda ${n} muestras. ¿Cuánto tarda en llenar el búfer (ms)?`, n / fs, 'ms', `t = ${n} / ${fs} 000 muestras/s = ${fmt(n / fs, 3)} ms. El DMA va al ritmo del ADC (DREQ), no más rápido.`, Math.max(0.01, n / fs * 0.01));
    }
    const n = pick([1024, 4096, 16384, 65536]), fs = pick([125, 150, 200]);
    return NH('Una transferencia por ciclo: divide las palabras entre la frecuencia en MHz y te da µs.', `Sin DREQ, un canal DMA copia ${n} palabras de 32 bits con clk_sys = ${fs} MHz. Si logra una por ciclo, ¿cuántos µs tarda?`, n / fs, 'µs', `${n} / ${fs} MHz = ${fmt(n / fs, 2)} µs. Es un mejor caso: si la CPU u otro canal usan el mismo bus, tarda algo más.`, Math.max(0.05, n / fs * 0.01));
  }, 'rp_dmatime');
  Gen.add('rp_pll', () => {
    const fb = ri(63, 133), p1 = ri(2, 7), p2 = ri(1, p1), f = 12 * fb / (p1 * p2);
    return NH('Primero el VCO (12 MHz × FBDIV) y luego divídelo entre POSTDIV1 × POSTDIV2.', `PLL con cristal de 12 MHz: FBDIV = ${fb}, POSTDIV1 = ${p1}, POSTDIV2 = ${p2}. ¿Frecuencia de salida en MHz?`, f, 'MHz', `VCO = 12 × ${fb} = ${12 * fb} MHz (dentro de 750–1600). Salida = ${12 * fb} / (${p1} × ${p2}) = ${fmt(f, 2)} MHz.`, Math.max(0.05, f * 0.005));
  }, 'rp_clock');
  Gen.add('rp_adcDiv', () => {
    const fs = pick([1000, 2000, 8000, 10000, 44100, 48000, 100000, 250000]), d = 48e6 / fs - 1;
    return NH('Una muestra cada (div + 1) ciclos de 48 MHz: div = 48 000 000 / muestras por segundo − 1.', `El ADC del RP2040 funciona con 48 MHz. ¿Qué valor pasas a adc_set_clkdiv() para muestrear a ${fs} muestras/s?`, d, '', `Una muestra cada (div + 1) ciclos de 48 MHz: div = 48 000 000 / ${fs} − 1 = ${fmt(d, 2)}. Por debajo de 95 no tiene sentido: una conversión ya tarda 96 ciclos (500 ksps).`, Math.max(0.5, d * 0.002));
  }, 'rp_adcdiv');
  Gen.add('rp_avgI', () => {
    const Ia = pick([20, 25, 40, 80]), ton = pick([0.2, 0.5, 1, 2]), T = pick([60, 300, 600]), Is = pick([0.2, 0.8, 1.5]), cap = pick([1000, 2000, 2500]);
    const avg = (Ia * ton + Is * (T - ton)) / T;
    if (Math.random() < 0.5) return NH('Media ponderada por el tiempo: (I despierto × t despierto + I dormido × t dormido) / periodo.', `Un nodo consume ${Ia} mA durante ${fmt(ton)} s y ${fmt(Is)} mA dormido el resto, con un ciclo de ${T} s. ¿Consumo medio en mA?`, avg, 'mA', `(${Ia} × ${fmt(ton)} + ${fmt(Is)} × ${fmt(T - ton)}) / ${T} = ${fmt(avg, 3)} mA.`, Math.max(0.005, avg * 0.02));
    const d = cap / avg / 24;
    return NH('Calcula primero la media; luego mAh / mA da horas, y entre 24, días.', `Mismo tipo de nodo (${Ia} mA durante ${fmt(ton)} s, ${fmt(Is)} mA dormido, ciclo de ${T} s) con una batería de ${cap} mAh. ¿Cuántos días dura, en el caso ideal?`, d, 'días', `Media = ${fmt(avg, 3)} mA. ${cap} / ${fmt(avg, 3)} = ${fmt(cap / avg, 0)} h ≈ ${fmt(d, 1)} días. En la realidad, algo menos: autodescarga y caída de tensión.`, Math.max(0.5, d * 0.03));
  }, 'rp_avg');
  Gen.add('rp_vsys', () => {
    const V = ri(300, 520) / 100, n = Math.round(V / 3 / 3.3 * 65535), vv = n * 3.3 / 65535 * 3;
    return NH('Dos pasos: voltios en el pin (× 3,3 / 65535) y luego × 3 para deshacer el divisor.', `En la Pico, ADC(3) mide VSYS a través de un divisor ÷3. read_u16() da ${n}. ¿Cuánto vale VSYS?`, vv, 'V', `En el pin: ${n} × 3,3 / 65535 = ${fmt(vv / 3, 3)} V. Por el divisor, VSYS = 3 × ${fmt(vv / 3, 3)} = ${fmt(vv, 2)} V.`, 0.03);
  }, 'rp_vsys');

  /* ===================== VISUALIZACIONES ===================== */
  // Traza ciclo a ciclo del transmisor UART en PIO que se enseña en el módulo 5
  const UART_PROG = ['pull()', 'set(x, 7)', 'set(pins, 0) [7]', 'out(pins, 1) [6]', 'jmp(x_dec, "bit")', 'set(pins, 1) [7]'];
  function uartTrace(byte) {
    const tr = []; let x = 0, osr = 0, cnt = 0, pin = 1;
    const rec = (pc, n) => { for (let i = 0; i < n; i++) tr.push({ pc, x, osr, cnt, pin }); };
    osr = byte & 255; cnt = 8; rec(0, 1);
    x = 7; rec(1, 1);
    pin = 0; rec(2, 8);
    for (let b = 0; b < 8; b++) { pin = osr & 1; osr >>= 1; cnt--; rec(3, 7); rec(4, 1); x = Math.max(0, x - 1); }
    pin = 1; rec(5, 8);
    return tr;
  }
  // Dos núcleos haciendo «contador += 1» dos veces cada uno, con o sin cerrojo
  function race(d, lk) {
    const prog = lk ? ['T', 'L', '+', 'E', 'S', 'T', 'L', '+', 'E', 'S'] : ['L', '+', 'E', 'L', '+', 'E'];
    const st = [{ pc: 0, r: 0, ev: [] }, { pc: 0, r: 0, ev: [] }], memT = [];
    let mem = 0, lock = -1, t = 0;
    while ((st[0].pc < prog.length || st[1].pc < prog.length) && t < 40) {
      for (let c = 0; c < 2; c++) {
        const s = st[c]; if (s.pc >= prog.length || (c === 1 && t < d)) continue;
        const op = prog[s.pc];
        if (op === 'T') { if (lock === -1) { lock = c; s.ev.push([t, 'T']); s.pc++; } else s.ev.push([t, '·']); continue; }
        if (op === 'S') lock = -1; else if (op === 'L') s.r = mem; else if (op === '+') s.r++; else mem = s.r;
        s.ev.push([t, op]); s.pc++;
      }
      memT.push(mem); t++;
    }
    return { final: mem, lost: 4 - mem, ev: [st[0].ev, st[1].ev], memT, T: t };
  }
  const OPCOL = { L: 'var(--ice)', '+': 'var(--muted)', E: 'var(--led)', T: 'var(--ok)', S: 'var(--ok)', '·': 'var(--err)' };
  const WS = { T0H: [250, 550], T1H: [650, 950], T0L: [700, 1000], T1L: [300, 600] };

  Object.assign(Widgets.VIZ, {
    /* PWM de un slice: divisor, wrap y nivel → frecuencia y resolución */
    rp_pwm: {
      calc: p => { const k = p.pc ? 2 : 1, f = p.fs * 1e6 / ((p.wrap + 1) * p.div * k); return { f, bits: Math.log2(p.wrap + 1), lev: Math.round(p.D / 100 * (p.wrap + 1)) }; },
      svg: (p, o) => {
        const x0 = 28, per = 125, top = 26, bot = 92, ly = bot - (bot - top) * p.D / 100, hi = 112, lo = 140, d = p.D / 100;
        let ramp = '', out = `M${x0} ${d > 0 ? hi : lo}`;
        for (let k = 0; k < 2; k++) {
          const xs = x0 + k * per;
          ramp += p.pc ? `M${xs} ${bot}L${xs + per / 2} ${top}L${xs + per} ${bot}` : `M${xs} ${bot}L${xs + per} ${top}V${bot}`;
          if (d <= 0 || d >= 1) out += `H${xs + per}`;
          else if (p.pc) out += `H${xs + per * d / 2}V${lo}H${xs + per * (1 - d / 2)}V${hi}H${xs + per}`;
          else out += `${k ? `V${hi}` : ''}H${xs + per * d}V${lo}H${xs + per}`;
        }
        return `<svg viewBox="0 0 300 200" class="viz"><text x="${x0}" y="16" class="vizsm">contador (0 → wrap${p.pc ? ' → 0' : ''})</text>
          <path d="${ramp}" fill="none" stroke="var(--ice)" stroke-width="2"/><path d="M${x0} ${ly}H278" stroke="var(--err)" stroke-dasharray="4 3"/><text x="280" y="${ly + 4}" class="vizsm" text-anchor="end" dy="-6">nivel</text>
          <path d="${out}" fill="none" stroke="var(--led)" stroke-width="3"/><text x="${x0}" y="160" class="vizsm">salida: alta mientras contador menor que nivel</text>
          <text x="${x0}" y="178" class="vizlab">f = ${fHz(o.f)} · ${num(o.bits, 1)} bits (${p.wrap + 1} niveles)</text>
          <text x="${x0}" y="194" class="vizsm" font-family="monospace">set_wrap(${p.wrap}) · clkdiv(${p.div}) · level ${o.lev}</text></svg>`;
      }
    },
    /* PLL del sistema: 12 MHz × FBDIV / (POSTDIV1 × POSTDIV2) */
    rp_pll: {
      calc: p => { const vco = 12 * p.fb, f = vco / (p.p1 * p.p2), okV = vco >= 750 && vco <= 1600; return { vco, f, okV, fok: okV ? f : 0 }; },
      svg: (p, o) => {
        const box = (x, y, w, t1, t2, col) => `<rect x="${x}" y="${y}" width="${w}" height="40" rx="8" fill="none" stroke="${col || 'currentColor'}" stroke-width="2"/><text x="${x + w / 2}" y="${y + 17}" text-anchor="middle" class="vizlab">${t1}</text><text x="${x + w / 2}" y="${y + 32}" text-anchor="middle" class="vizsm">${t2}</text>`;
        const ar = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="currentColor" stroke-width="2"/><path d="M${x2} ${y2}l-6 -4v8z" fill="currentColor"/>`;
        return `<svg viewBox="0 0 300 190" class="viz">${box(8, 14, 76, 'XOSC', '12 MHz')}${ar(84, 34, 104, 34)}${box(106, 14, 76, '× ' + p.fb, 'FBDIV')}${ar(182, 34, 202, 34)}
          ${box(204, 14, 88, 'VCO', num(o.vco, 0) + ' MHz', o.okV ? 'var(--ok)' : 'var(--err)')}
          <path d="M248 54V70H46V84" fill="none" stroke="currentColor" stroke-width="2"/><path d="M46 88l-4 -6h8z" fill="currentColor"/>
          ${box(8, 88, 76, '÷ ' + p.p1, 'POSTDIV1')}${ar(84, 108, 104, 108)}${box(106, 88, 76, '÷ ' + p.p2, 'POSTDIV2')}${ar(182, 108, 202, 108)}
          ${box(204, 88, 88, num(o.f, 2), 'MHz · clk_sys', 'var(--led)')}
          <text x="10" y="156" class="vizlab" style="fill:${o.okV ? 'currentColor' : 'var(--err)'}">${o.okV ? 'VCO dentro de 750–1600 MHz' : 'VCO fuera de rango: el PLL no engancha'}</text>
          <text x="10" y="176" class="vizsm">${p.p2 > p.p1 ? 'Consejo: pon el divisor mayor en POSTDIV1' : 'f = 12 × FBDIV / (POSTDIV1 × POSTDIV2)'}</text></svg>`;
      }
    },
    /* Máquina de estados PIO ejecutando un transmisor UART, ciclo a ciclo */
    rp_pio: {
      anim: true, restart: true,
      calc: p => ({ baud: p.fs * 1e6 / (p.div * 8), tr: uartTrace(p.b) }),
      svg: (p, o, t) => {
        const tr = o.tr, L = tr.length, c = Math.min(L - 1, Math.floor(t * 9) % (L + 14)), s = tr[c];
        const prog = UART_PROG.map((ln, i) => `${i === s.pc ? `<rect x="4" y="${12 + i * 17}" width="150" height="16" rx="4" fill="var(--led)" opacity=".35"/>` : ''}<text x="8" y="${24 + i * 17}" font-size="10.5" font-family="monospace" fill="currentColor">${i === 3 ? 'bit: ' : ''}${ln}</text>`).join('');
        let bits = '';
        for (let i = 0; i < 8; i++) { const live = i >= 8 - s.cnt, v = live ? (s.osr >> (7 - i)) & 1 : 0; bits += `<rect x="${170 + i * 15}" y="58" width="13" height="16" rx="2" fill="${live ? 'var(--ice)' : 'var(--line)'}" opacity="${live ? .9 : .5}"/><text x="${176.5 + i * 15}" y="70" text-anchor="middle" font-size="10" fill="${live ? '#fff' : 'var(--muted)'}">${live ? v : ''}</text>`; }
        let w = 'M8 ' + (tr[0].pin ? 134 : 156); const dx = 284 / L;
        for (let i = 0; i <= c; i++) w += `H${(8 + i * dx).toFixed(1)}V${tr[i].pin ? 134 : 156}H${(8 + (i + 1) * dx).toFixed(1)}`;
        return `<svg viewBox="0 0 300 200" class="viz">${prog}
          <text x="170" y="24" class="vizlab">ciclo ${c + 1} de ${L}</text><text x="170" y="44" class="vizsm">X = ${s.x} · pin = ${s.pin}</text>${bits}<text x="170" y="88" class="vizsm">OSR (sale por la derecha)</text>
          <path d="M8 156H292" stroke="var(--line)"/><path d="${w}" fill="none" stroke="var(--led)" stroke-width="2.5"/>
          <text x="8" y="174" class="vizsm">byte ${p.b} = 0b${p.b.toString(2).padStart(8, '0')} · se envía el bit 0 primero</text>
          <text x="8" y="192" class="vizlab">div ${num(p.div, 1)} → ${num(o.baud, 0)} baudios</text></svg>`;
      }
    },
    /* Temporización de bits WS2812 generada por PIO */
    rp_ws: {
      calc: p => {
        const tc = 1000 / p.f, T = p.n * tc, v = { T0H: p.h0 * tc, T1H: p.h1 * tc, T0L: T - p.h0 * tc, T1L: T - p.h1 * tc };
        const okk = {}; for (const k in WS) okk[k] = v[k] >= WS[k][0] && v[k] <= WS[k][1];
        return { ...v, T, okk, ok: Object.values(okk).every(Boolean) && p.h0 < p.n && p.h1 < p.n ? 1 : 0 };
      },
      svg: (p, o) => {
        const s = 125 / 1000, x0 = 30; // 125 px por µs
        const row = (y, th, lab) => { const xe = x0 + Math.min(o.T, 2000) * s, xf = x0 + Math.min(th, o.T) * s; return `<text x="4" y="${y - 6}" class="vizsm">${lab}</text><path d="M${x0} ${y + 24}V${y}H${xf}V${y + 24}H${xe}" fill="none" stroke="var(--led)" stroke-width="2.5"/>`; };
        const win = (y, a, b) => `<rect x="${x0 + a * s}" y="${y - 4}" width="${(b - a) * s}" height="32" fill="var(--ok)" opacity=".18"/>`;
        let ticks = ''; for (let i = 0; i <= p.n && i < 60; i++) ticks += `<path d="M${x0 + i * (1000 / p.f) * s} 128v5" stroke="var(--muted)"/>`;
        const ln = (k, x, y) => `<text x="${x}" y="${y}" class="vizsm" fill="${o.okk[k] ? 'var(--ok)' : 'var(--err)'}" style="fill:${o.okk[k] ? 'var(--ok)' : 'var(--err)'}">${k} ${num(o[k], 0)} ns ${o.okk[k] ? '✓' : '✗'} (${WS[k][0]}–${WS[k][1]})</text>`;
        return `<svg viewBox="0 0 300 200" class="viz">${win(24, WS.T0H[0], WS.T0H[1])}${win(84, WS.T1H[0], WS.T1H[1])}${row(24, o.T0H, 'bit 0')}${row(84, o.T1H, 'bit 1')}${ticks}
          <text x="${x0}" y="146" class="vizsm">marcas = ciclos de ${num(1000 / p.f, 1)} ns · bit de ${num(o.T, 0)} ns</text>
          ${ln('T0H', 4, 164)}${ln('T1H', 152, 164)}${ln('T0L', 4, 180)}${ln('T1L', 152, 180)}
          <text x="4" y="196" class="vizlab">${o.ok ? 'La tira entendería estos bits' : 'Fuera de tolerancia: colores erróneos'}</text></svg>`;
      }
    },
    /* El DMA vacía el FIFO del ADC en un búfer sin la CPU */
    rp_dma: {
      anim: true,
      calc: p => { const t = p.N / p.fs; return { t, cpu: p.m ? 0 : 100, kb: p.N * 2 / 1024, cap: p.m ? t : 0 }; },
      svg: (p, o, t) => {
        const fill = (t % 3) / 3, by = p.m ? 'DMA' : 'CPU';
        let pk = ''; for (let i = 0; i < 4; i++) { const u = (t * 0.9 + i / 4) % 1; pk += `<rect x="${82 + u * 110}" y="61" width="9" height="9" rx="2" fill="var(--ice)"/>`; }
        return `<svg viewBox="0 0 300 190" class="viz"><rect x="8" y="40" width="70" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><text x="43" y="62" text-anchor="middle" class="vizlab">ADC</text><text x="43" y="78" text-anchor="middle" class="vizsm">${p.fs} ksps</text>
          <path d="M78 65H200" stroke="var(--line)" stroke-width="10" stroke-linecap="round"/>${pk}
          <rect x="112" y="18" width="56" height="24" rx="6" fill="${p.m ? 'var(--ok)' : 'var(--err)'}" opacity=".85"/><text x="140" y="34" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${by}</text>
          <rect x="204" y="30" width="88" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="206" y="${98 - 66 * fill}" width="84" height="${66 * fill}" fill="var(--led)" opacity=".7"/><text x="248" y="118" text-anchor="middle" class="vizsm">RAM · ${num(o.kb, 1)} KB</text>
          <text x="8" y="124" class="vizsm">CPU</text>${Widgets.H.hbar(40, 134, 150, o.cpu / 100, o.cpu ? 'var(--err)' : 'var(--ok)', '')}
          <text x="196" y="134" class="vizsm">${o.cpu ? 'ocupada copiando' : 'libre para calcular'}</text>
          <text x="8" y="160" class="vizlab">${p.N} muestras en ${num(o.t, 2)} ms</text>
          <text x="8" y="178" class="vizsm">${p.m ? 'El DREQ del ADC marca el ritmo; la CPU solo espera el final' : 'Un bucle lee el FIFO muestra a muestra: no da para más'}</text></svg>`;
      }
    },
    /* Condición de carrera entre los dos núcleos */
    rp_race: {
      calc: p => { const r = race(p.d, p.lk); return { ...r, lkOk: p.lk && r.final === 4 ? 1 : 0 }; },
      svg: (p, o) => {
        const bw = Math.min(22, 236 / Math.max(1, o.T)), x0 = 56;
        const row = (ev, y) => ev.map(([t, op]) => `<rect x="${x0 + t * bw}" y="${y}" width="${bw - 2}" height="22" rx="3" fill="${OPCOL[op]}" opacity="${op === '·' ? .35 : .85}"/><text x="${x0 + t * bw + (bw - 2) / 2}" y="${y + 15}" text-anchor="middle" font-size="11" font-weight="700" fill="${op === '·' ? 'var(--err)' : '#fff'}">${op === '·' ? '…' : op}</text>`).join('');
        const mem = o.memT.map((m, t) => `<text x="${x0 + t * bw + (bw - 2) / 2}" y="${118}" text-anchor="middle" font-size="11" fill="currentColor">${m}</text>`).join('');
        return `<svg viewBox="0 0 300 200" class="viz"><text x="4" y="40" class="vizsm">núcleo 0</text><text x="4" y="78" class="vizsm">núcleo 1</text><text x="4" y="118" class="vizsm">memoria</text>
          ${row(o.ev[0], 24)}${row(o.ev[1], 62)}${mem}
          <text x="4" y="140" class="vizsm">L lee · + suma en su registro · E escribe</text>${p.lk ? '<text x="4" y="154" class="vizsm">T toma el cerrojo · S lo suelta · … espera</text>' : ''}
          <text x="4" y="170" class="vizlab" style="fill:${o.lost ? 'var(--err)' : 'var(--ok)'}">Resultado ${o.final} (esperado 4)${o.lost ? ' · se pierden ' + o.lost : ' · correcto'}</text>
          <text x="4" y="190" class="vizsm">${p.lk ? 'Con cerrojo, leer-sumar-escribir es indivisible' : 'Sin cerrojo, depende de cuándo coincidan'}</text></svg>`;
      }
    }
  });

  /* ===================== VISUALIZACIONES PARA EXPLORAR (v2) =====================
     Una por idea: el alumno mueve deslizadores y descubre la regla antes de leerla. */
  const { esc } = Widgets.H;
  const tx = (x, y, s, c = 'vizsm', a = '') => `<text x="${x}" y="${y}" class="${c}" ${a}>${s}</text>`;
  const tc = (x, y, s, col, c = 'vizsm', a = '') => `<text x="${x}" y="${y}" class="${c}" style="fill:${col}" ${a}>${s}</text>`;
  const mono = (x, y, s, col = 'currentColor', fs = 10.5, a = '') => `<text x="${x}" y="${y}" font-size="${fs}" font-family="monospace" fill="${col}" ${a}>${esc(s)}</text>`;
  const bx = (x, y, w, h, s = 'currentColor', f = 'none', r = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" stroke="${s}" stroke-width="2"/>`;
  const fl = (x, y, w, h, f, o = 1, r = 3) => `<rect x="${x}" y="${y}" width="${Math.max(0, w).toFixed(1)}" height="${h}" rx="${r}" fill="${f}" opacity="${o}"/>`;
  const ln = (d, s = 'currentColor', w = 2, a = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" ${a}/>`;
  const H2 = (v, n = 2) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
  const B8 = v => (v & 255).toString(2).padStart(8, '0');
  const SV = (h, body) => `<svg viewBox="0 0 300 ${h}" class="viz">${body}</svg>`;
  const OKC = ok => ok ? 'var(--ok)' : 'var(--err)';
  const MID = 'text-anchor="middle"', END = 'text-anchor="end"';
  const TERM = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#0A1120"/>`;
  const diode = (x, y, col = 'currentColor') => `<g transform="translate(${x} ${y})"><path d="M-7 -7L6 0L-7 7Z" fill="${col}"/><path d="M6 -7V7" stroke="${col}" stroke-width="2.5"/></g>`;
  // Ruido pseudoaleatorio fijo (siempre el mismo dibujo para los mismos ajustes)
  const RND = Array.from({ length: 240 }, (_, i) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; });
  // Pinout de la Pico: pata física de cada GPIO (0 = no sale al conector)
  const PHYS = [1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 24, 25, 26, 27, 29, 0, 0, 0, 31, 32, 34, 0];
  const PADS = (() => { const a = Array(41).fill(''); PHYS.forEach((ph, g) => { if (ph) a[ph] = 'GP' + g; }); [3, 8, 13, 18, 23, 28, 38].forEach(k => { a[k] = 'GND'; }); Object.assign(a, { 30: 'RUN', 33: 'AGND', 35: 'ADC_VREF', 36: '3V3(OUT)', 37: '3V3_EN', 39: 'VSYS', 40: 'VBUS' }); return a; })();
  const HIDDEN = { 23: 'controla el modo del regulador', 24: 'detecta si hay VBUS', 25: 'enciende el LED de la placa', 29: 'mide VSYS / 3 (ADC3)' };
  const slOf = n => `slice ${(n >> 1) & 7}, canal ${n & 1 ? 'B' : 'A'}`;

  Object.assign(Widgets.VIZ, {
    /* rp1 · ¿Puede un GPIO con esta carga? */
    rp_drivev: {
      calc: p => { const can = p.I <= p.dr; return { ok: p.tr || can ? 1 : 0, direct: !p.tr && can ? 1 : 0, viaT: p.tr && p.I >= 70 ? 1 : 0, ipin: p.tr ? 1 : p.I }; },
      svg: (p, o) => {
        const nm = { 2: 'LED pequeño', 5: 'LED', 10: 'LED', 20: 'LED potente', 30: 'zumbador', 70: 'relé', 200: 'motor' }[p.I] || 'carga';
        const X = v => 70 + 210 * Math.log10(Math.max(1, v)) / Math.log10(300), bad = !o.ok;
        return SV(200, `${bx(8, 28, 62, 52)}${tx(39, 50, 'Pico', 'vizlab', MID)}${tx(39, 68, 'GPIO', 'vizsm', MID)}
          ${p.tr ? `${ln('M70 54H126')}<g transform="translate(156 54)">${Widgets.H.npnSym()}</g>${ln('M166 24V14H240V36')}${ln('M166 94V100')}${tx(166, 112, 'GND', 'vizsm', MID)}${tx(282, 50, '+5 V', 'vizsm', END)}`
            : ln('M70 54H222', bad ? 'var(--err)' : 'currentColor', bad ? 3 : 2)}
          <circle cx="240" cy="54" r="23" fill="${bad ? 'var(--err-soft)' : 'var(--ok-soft)'}" stroke="currentColor" stroke-width="2"/>${tc(240, 58, p.I + ' mA', 'currentColor', 'vizsm', MID)}${tx(240, 92, nm, 'vizsm', MID)}
          ${tc(150, 132, bad ? 'Sobrecarga: el pin no da tanto' : p.tr ? 'El pin solo da la orden (≈ 1 mA)' : 'El pin puede con ella', OKC(!bad), 'vizlab', MID)}
          ${tx(8, 156, 'pide')}${fl(70, 146, X(p.I) - 70, 12, bad ? 'var(--err)' : 'var(--ice)')}
          ${tx(8, 178, 'pin da')}${fl(70, 168, X(p.dr) - 70, 12, 'var(--led)')}${ln(`M${X(p.dr).toFixed(1)} 140V186`, 'var(--led)', 1.5, 'stroke-dasharray="3 3"')}
          ${tx(70, 196, '1 mA')}${tx(282, 196, '300 mA (escala log.)', 'vizsm', END)}`);
      }
    },
    /* rp2 · La familia Pico */
    rp_famv: {
      calc: p => ({ code: p.chip * 2 + p.rad, ram: p.chip ? 520 : 264, sm: p.chip ? 12 : 8, fpu: p.chip, wifi: p.rad }),
      svg: (p, o) => {
        const name = ['Pico', 'Pico W', 'Pico 2', 'Pico 2 W'][o.code];
        const rows = [['Chip', p.chip ? 'RP2350' : 'RP2040'], ['Núcleos', p.chip ? '2 Cortex-M33 o 2 RISC-V' : '2 Cortex-M0+'], ['Reloj', p.chip ? '150 MHz' : '133 MHz (200 certificados)'], ['SRAM', o.ram + ' KB'], ['PIO', (p.chip ? 3 : 2) + ' bloques = ' + o.sm + ' máquinas'], ['Coma flotante', p.chip ? 'por hardware' : 'por software (más lenta)'], ['Radio', p.rad ? 'WiFi 2,4 GHz y Bluetooth' : 'no']];
        return SV(210, `<rect x="8" y="10" width="150" height="56" rx="6" fill="#1E7B3A"/><rect x="2" y="28" width="12" height="20" rx="2" fill="#9AA3B2"/>
          <rect x="62" y="22" width="32" height="32" rx="3" fill="#222"/><text x="78" y="41" font-size="7.5" fill="#ddd" ${MID}>${p.chip ? 'RP2350' : 'RP2040'}</text>
          ${p.rad ? '<rect x="112" y="20" width="30" height="24" rx="2" fill="#C9CED6"/><path d="M118 52h28" stroke="#E5C07B" stroke-width="3"/>' : ''}
          ${tx(170, 34, name, 'vizbig')}${tx(170, 52, p.rad ? 'con radio' : 'sin radio', 'vizsm')}
          ${rows.map(([k, v], i) => `${tx(8, 88 + i * 18, k)}${tc(104, 88 + i * 18, v, 'currentColor')}`).join('')}`);
      }
    },
    /* rp3 · Pinout: pata física, número de GPIO y funciones */
    rp_pinv: {
      calc: p => { const n = p.n, ph = PHYS[n]; return { phys: ph, adc: n >= 26 ? n - 26 : -1, hidden: ph ? 0 : 1, i2c: (n >> 1) & 1, slice: (n >> 1) & 7 }; },
      svg: (p, o) => {
        const n = p.n, sel = o.phys;
        const pad = k => { const top = k <= 20, x = top ? 16 + (k - 1) * 14 : 16 + (40 - k) * 14, y = top ? 44 : 84, lab = PADS[k], g = lab === 'GND' || lab === 'AGND', s = k === sel;
          return `<circle cx="${x}" cy="${y}" r="${s ? 6.5 : 4.5}" fill="${s ? 'var(--led)' : g ? '#111' : '#D7DEE8'}" stroke="${g ? '#555' : '#8A93A3'}"/>`; };
        let pads = ''; for (let k = 1; k <= 40; k++) pads += pad(k);
        const r = o.phys ? (n => { const role4 = n % 4; return [['PWM', slOf(n)], ['I²C', `I²C${(n >> 1) & 1} · ${n & 1 ? 'SCL' : 'SDA'}`], ['UART', `UART${((n + 4) >> 3) & 1} · ${['TX', 'RX', 'CTS', 'RTS'][role4]}`], ['SPI', `SPI${(n >> 3) & 1} · ${['RX', 'CSn', 'SCK', 'TX'][role4]}`], ['ADC', n >= 26 ? 'canal ' + (n - 26) : 'no']]; })(n) : [];
        return SV(206, `<rect x="6" y="32" width="290" height="64" rx="6" fill="#1E7B3A"/><rect x="0" y="54" width="10" height="20" rx="2" fill="#9AA3B2"/>${pads}
          ${tx(16, 26, 'pata 1')}${tx(282, 26, '20', 'vizsm', END)}${tx(16, 110, '40')}${tx(282, 110, 'pata 21', 'vizsm', END)}
          ${tx(8, 134, `GP${n}`, 'vizbig')}${tc(56, 134, o.phys ? `en la pata física ${o.phys}` : 'no sale al conector', o.phys ? 'currentColor' : 'var(--err)', 'vizlab')}
          ${o.phys ? r.map(([k, v], i) => `${tx(8 + (i % 2) * 146, 154 + Math.floor(i / 2) * 18, k)}${tc(46 + (i % 2) * 146, 154 + Math.floor(i / 2) * 18, v, k === 'ADC' && n >= 26 ? 'var(--ok)' : 'currentColor')}`).join('')
            : `${tx(8, 156, 'En la Pico, la placa lo usa: ' + HIDDEN[n] + '.')}${tx(8, 174, 'En la Pico W, estos pines hablan con la radio.')}`}`);
      }
    },
    /* rp4 · Alimentación: USB, batería, diodos y VSYS */
    rp_powv: {
      calc: p => {
        const vd = p.d ? 0.7 : 0.3, vb = Math.max(0, p.vb - vd), vu = p.usb ? 4.7 : 0, vsys = Math.max(vb, vu);
        const src = vsys <= 0 ? 0 : vu >= vb ? 2 : 1, on = vsys >= 1.8 && vsys <= 5.5 ? 1 : 0;
        return { vsys, src, on, onBat: on && src === 1 ? 1 : 0, adc: vsys / 3, adcNoUsb: p.usb ? -1 : vsys / 3, danger: vsys > 5.5 ? 1 : 0 };
      },
      svg: (p, o) => SV(200, `${tc(8, 30, 'USB · VBUS 5 V', p.usb ? 'var(--ok)' : 'var(--muted)', 'vizlab')}${ln('M100 26H130V64', p.usb ? 'currentColor' : 'var(--line)', 2, p.usb ? '' : 'stroke-dasharray="4 4"')}${diode(116, 26)}
        ${bx(8, 84, 52, 30, o.src === 1 ? 'var(--ok)' : 'currentColor')}${tx(34, 104, num(p.vb, 1) + ' V', 'vizlab', MID)}${tx(8, 128, 'batería')}
        ${ln('M60 99H130V64')}${diode(96, 99, p.d ? 'var(--err)' : 'currentColor')}${tx(96, 120, p.d ? 'silicio: −0,7 V' : 'Schottky: −0,3 V', 'vizsm', MID)}
        <circle cx="130" cy="64" r="4.5" fill="currentColor"/>${tc(138, 104, 'VSYS = ' + num(o.vsys, 2) + ' V', o.danger ? 'var(--err)' : 'currentColor', 'vizlab')}
        ${ln('M130 64H170')}${bx(170, 46, 70, 36, o.on ? 'var(--ok)' : 'var(--err)')}${tx(205, 61, 'buck-boost', 'vizsm', MID)}${tx(205, 75, '1,8–5,5 V', 'vizsm', MID)}
        ${ln('M240 64H292', o.on ? 'var(--ok)' : 'var(--line)', 2.5)}${tc(292, 56, o.on ? '3,3 V' : 'apagado', OKC(o.on), 'vizsm', END)}
        ${ln('M130 68V140')}${bx(112, 140, 36, 22)}${tx(130, 155, '÷ 3', 'vizlab', MID)}${tx(156, 156, 'GP29 (ADC3): ' + num(o.adc, 2) + ' V', 'vizsm')}
        ${tc(8, 190, o.danger ? 'Más de 5,5 V en VSYS: peligro' : ['Nadie alimenta: la Pico está apagada', o.on ? 'Alimenta la batería' : 'Batería: tensión insuficiente', 'Alimenta el USB; la batería no entrega nada'][o.src], OKC(o.on && !o.danger), 'vizlab')}`)
    },
    /* rp5 · Arranque: ROM, BOOTSEL y bloques UF2 */
    rp_bootv: {
      calc: p => { const usb = p.bs || !p.fl ? 1 : 0, blocks = Math.ceil(p.kb * 1024 / 256); return { usb, run: 1 - usb, usbNoBtn: usb && !p.bs ? 1 : 0, blocks, file: blocks * 512 / 1024 }; },
      svg: (p, o) => SV(196, `${bx(8, 14, 70, 40)}${tx(43, 32, 'ROM', 'vizlab', MID)}${tx(43, 46, 'al encender', 'vizsm', MID)}${ln('M78 34H100')}
        ${bx(100, 10, 104, 48, 'var(--ice)')}${tx(152, 28, '¿BOOTSEL pulsado?', 'vizsm', MID)}${tx(152, 44, '¿programa válido?', 'vizsm', MID)}
        ${tc(152, 76, p.bs ? 'BOOTSEL baja el CS de la flash' : p.fl ? 'Encuentra el programa' : 'Flash vacía: no hay programa', 'currentColor', 'vizsm', MID)}
        ${ln('M204 34H222')}${bx(222, 10, 72, 48, o.usb ? 'var(--led)' : 'var(--ok)', o.usb ? 'var(--led)' : 'var(--ok)')}
        <text x="258" y="30" font-size="11" font-weight="700" fill="#fff" ${MID}>${o.usb ? 'Unidad' : 'Ejecuta'}</text><text x="258" y="46" font-size="10" fill="#fff" ${MID}>${o.usb ? 'RPI-RP2' : 'tu programa'}</text>
        ${tx(8, 108, `Programa de ${p.kb} KB = ${o.blocks} bloques UF2`, 'vizlab')}
        ${Array.from({ length: 16 }, (_, i) => `<rect x="${8 + i * 18}" y="118" width="16" height="22" rx="2" fill="var(--ice)" opacity="${i < Math.min(16, o.blocks) ? 0.85 : 0.2}"/>`).join('')}
        ${tx(8, 158, 'Cada bloque: 512 bytes = 256 de programa +')}${tx(8, 174, 'dirección de destino + familia del chip + marcas.')}
        ${tx(8, 192, `Fichero .uf2: ${num(o.file, 0)} KB (el doble del programa)`)}`)
    },
    /* rp46 · Flash externa y caché XIP */
    rp_xipv: {
      calc: p => {
        const hit = p.w ? 1 : p.code <= 16 ? 0.99 : 16 / p.code, blocked = !p.w && p.er ? 1 : 0;
        const speed = blocked ? 0 : 100 / (hit + (1 - hit) * 10);
        return { hit: hit * 100, speed, blocked, okErase: p.er && p.w ? 1 : 0 };
      },
      svg: (p, o) => SV(200, `${bx(8, 16, 56, 36)}${tx(36, 38, 'CPU', 'vizlab', MID)}
        ${ln('M64 34H92', p.w ? 'var(--line)' : 'currentColor')}${bx(92, 12, 84, 44, p.w ? 'var(--line)' : 'var(--ice)')}${tx(134, 30, 'caché 16 KB', 'vizlab', MID)}${tx(134, 46, num(o.hit, 0) + ' % aciertos', 'vizsm', MID)}
        ${ln('M176 34H206', o.blocked ? 'var(--err)' : p.w ? 'var(--line)' : 'currentColor', 2, 'stroke-dasharray="5 3"')}${tx(191, 52, 'QSPI', 'vizsm', MID)}
        ${bx(206, 12, 86, 44, p.er ? 'var(--err)' : 'currentColor')}${tx(249, 30, 'flash', 'vizlab', MID)}${tc(249, 46, p.er ? 'borrando sector' : '2 MB, fuera', p.er ? 'var(--err)' : 'var(--muted)', 'vizsm', MID)}
        ${ln('M36 52V78', p.w ? 'var(--ok)' : 'var(--line)')}${bx(8, 78, 56, 30, p.w ? 'var(--ok)' : 'var(--line)')}${tx(36, 97, 'RAM', 'vizlab', MID)}
        ${tx(76, 92, p.w ? 'El código corre desde la RAM' : 'El código corre desde la flash')}
        ${tx(8, 132, `Código que se repite: ${p.code} KB`)}${fl(8, 138, 284, 10, 'var(--line)')}${fl(8, 138, 284 * Math.min(1, p.code / 64), 10, p.code <= 16 ? 'var(--ok)' : 'var(--led)')}${ln(`M${(8 + 284 * 16 / 64).toFixed(1)} 134V152`, 'var(--ice)', 2)}${tx(80, 162, '↑ tamaño de la caché')}
        ${tx(8, 180, 'Velocidad')}${fl(70, 171, 220, 12, 'var(--line)')}${fl(70, 171, 2.2 * o.speed, 12, o.blocked ? 'var(--err)' : 'var(--ok)')}
        ${tc(8, 197, o.blocked ? 'Parado: la flash no se lee mientras se borra' : num(o.speed, 0) + ' % (modelo simplificado)', OKC(!o.blocked), 'vizlab')}`)
    },

    /* rp6 · Las tres divisiones de Python */
    rp_opsv: {
      calc: p => { const fd = Math.floor(p.a / p.b), md = p.a % p.b; return { fd, md, is41: fd === 4 && md === 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const d = p.a / p.b, ds = Number.isInteger(d) ? d + '.0' : String(Math.round(d * 1e4) / 1e4);
        const lines = [`>>> ${p.a} / ${p.b}`, ds, `>>> ${p.a} // ${p.b}`, String(o.fd), `>>> ${p.a} % ${p.b}`, String(o.md)];
        let dots = '';
        for (let i = 0; i < p.a; i++) { const g = Math.floor(i / p.b), left = g >= o.fd; dots += `<circle cx="${178 + (i % 10) * 11}" cy="${26 + Math.floor(i / 10) * 13}" r="4.5" fill="${left ? 'var(--err)' : g % 2 ? 'var(--ice)' : 'var(--led)'}"/>`; }
        return SV(160, `${TERM(6, 8, 156, 110)}${lines.map((l, i) => mono(14, 26 + i * 16, l, i % 2 ? '#7CE0A3' : '#E8EDF5', 11)).join('')}${dots}
          ${tx(176, 90, `${p.a} en grupos de ${p.b}:`)}${tx(176, 104, `${o.fd} grupos enteros`)}${tc(176, 118, `sobran ${o.md}`, 'var(--err)')}
          ${tx(6, 142, '/ siempre da float · // cociente entero · % resto')}${tx(6, 156, 'Comprobación: ' + `${o.fd} × ${p.b} + ${o.md} = ${p.a}`)}`);
      }
    },
    /* rp7 · Bits: pesos y desplazamientos */
    rp_bitv: {
      calc: p => { const r = p.v >> p.s; return { v: p.v, r, r37: p.v === 37 ? r : -1 }; },
      svg: (p, o) => {
        const row = (v, y, col) => Array.from({ length: 8 }, (_, i) => { const b = (v >> (7 - i)) & 1; return `<rect x="${30 + i * 30}" y="${y}" width="26" height="26" rx="4" fill="${b ? col : 'var(--line)'}" opacity="${b ? 0.9 : 0.6}"/><text x="${43 + i * 30}" y="${y + 18}" font-size="13" font-weight="700" fill="${b ? '#fff' : 'var(--muted)'}" ${MID}>${b}</text>`; }).join('');
        return SV(196, `${Array.from({ length: 8 }, (_, i) => tx(43 + i * 30, 22, String(128 >> i), 'vizsm', MID)).join('')}${row(p.v, 28, 'var(--ice)')}
          ${tx(8, 72, `v = ${p.v} = ${H2(p.v)} = 0b${B8(p.v)}`, 'vizlab')}
          ${ln('M150 80V96', 'currentColor', 2)}<path d="M150 100l-5 -7h10z" fill="currentColor"/>${tx(160, 94, `>> ${p.s}: se pierden ${p.s} bits`)}
          ${row(o.r, 104, 'var(--led)')}${tx(8, 150, `v >> ${p.s} = ${o.r}`, 'vizlab')}${tx(8, 168, `Igual que ${p.v} // ${2 ** p.s} = ${Math.floor(p.v / 2 ** p.s)} (dividir entre 2^${p.s})`)}
          ${tx(8, 186, 'Bit n vale 2ⁿ: el número es la suma de los bits a 1')}`);
      }
    },
    /* rp8 · range(inicio, fin, paso) */
    rp_rangev: {
      calc: p => { const v = []; for (let i = p.a; i < p.b && v.length < 30; i += p.st) v.push(i); return { n: v.length, is159: v.join() === '1,5,9' ? 1 : 0, last: v.length ? v[v.length - 1] : -1 }; },
      svg: (p, o) => {
        const v = []; for (let i = p.a; i < p.b; i += p.st) v.push(i);
        const X = i => 18 + i * 13;
        let axis = ''; for (let i = 0; i <= 20; i++) axis += `<path d="M${X(i)} 70v6" stroke="var(--muted)"/>${i % 5 === 0 ? tx(X(i), 92, String(i), 'vizsm', MID) : ''}`;
        return SV(170, `${mono(8, 22, `for i in range(${p.a}, ${p.b}, ${p.st}):`, 'currentColor', 11.5)}${ln('M18 73H282', 'var(--line)')}${axis}
          ${v.map(i => `<circle cx="${X(i)}" cy="60" r="6" fill="var(--led)"/>`).join('')}${p.b <= 20 ? `${ln(`M${X(p.b)} 40V80`, 'var(--err)', 2, 'stroke-dasharray="3 3"')}${tc(X(p.b), 38, 'fin (no entra)', 'var(--err)', 'vizsm', MID)}` : ''}
          ${tx(8, 118, `Da ${v.length} valor${v.length === 1 ? '' : 'es'}: [${v.join(', ')}]`, 'vizlab')}
          ${tx(8, 140, 'Empieza en el inicio, suma el paso y para ANTES del fin.')}${tx(8, 158, v.length ? `El último es ${v[v.length - 1]}; el siguiente (${v[v.length - 1] + p.st}) ya no es menor que ${p.b}.` : `${p.a} no es menor que ${p.b}: el bucle no se ejecuta.`)}`);
      }
    },
    /* rp9 · Índices y porciones de una lista */
    rp_listv: {
      calc: p => { const V = [10, 20, 30, 40, 50], ok = p.i >= -5 && p.i <= 4, sl = V.slice(p.a, p.b); return { val: ok ? V[(p.i + 5) % 5] : -1, err: ok ? 0 : 1, neg50: p.i === -1 ? 1 : 0, slen: sl.length, s2030: sl.join() === '20,30' ? 1 : 0 }; },
      svg: (p, o) => {
        const V = [10, 20, 30, 40, 50], k = (p.i + 5) % 5, sl = V.slice(p.a, p.b);
        const boxes = V.map((v, j) => { const ins = j >= p.a && j < p.b; return `<rect x="${52 + j * 48}" y="40" width="42" height="34" rx="6" fill="${ins ? 'var(--ice-soft)' : 'none'}" stroke="${!o.err && j === k ? 'var(--led)' : 'currentColor'}" stroke-width="${!o.err && j === k ? 4 : 2}"/>${tx(73 + j * 48, 62, String(v), 'vizlab', MID)}${tx(73 + j * 48, 32, String(j), 'vizsm', MID)}${tx(73 + j * 48, 90, String(j - 5), 'vizsm', MID)}`; }).join('');
        return SV(170, `${mono(8, 18, 'v = [10, 20, 30, 40, 50]', 'currentColor', 11)}${tx(4, 32, 'índice')}${tx(4, 90, 'final')}${boxes}
          ${tc(8, 122, o.err ? `v[${p.i}] → IndexError: no existe` : `v[${p.i}] = ${o.val}`, o.err ? 'var(--err)' : 'currentColor', 'vizlab')}
          ${tx(8, 144, `v[${p.a}:${p.b}] = [${sl.join(', ')}]  (${sl.length} elemento${sl.length === 1 ? '' : 's'})`, 'vizlab')}
          ${tx(8, 162, 'La porción incluye el inicio y NO el final.')}`);
      }
    },
    /* rp9 · Cuánta RAM gasta guardar N números */
    rp_memv: {
      calc: p => { const bpe = [4, 20, 2, 4][p.t], kb = p.N * bpe / 1024, fits = kb < 180 ? 1 : 0; return { kb, fits, nofitF: p.t === 1 && !fits ? 1 : 0, best: p.N >= 20000 && p.t === 2 ? 1 : 0 }; },
      svg: (p, o) => {
        const names = ['lista de int', 'lista de float', "array('H')", "array('f')"], bpe = [4, 20, 2, 4][p.t], why = ['una referencia por número', '4 de referencia + 16 del float', 'seguidos, como en C', 'seguidos, como en C'][p.t];
        return SV(176, `${tx(8, 22, `${p.N} números en una ${names[p.t]}`, 'vizlab')}${tx(8, 40, `${bpe} bytes cada uno: ${why}`)}
          ${fl(8, 56, 284, 26, 'var(--line)', 1, 6)}${fl(8, 56, 284 * Math.min(1, o.kb / 180), 26, o.fits ? 'var(--ice)' : 'var(--err)', 0.9, 6)}
          <text x="150" y="74" font-size="12" font-weight="700" fill="#fff" ${MID}>${num(o.kb, 1)} KB de unos 180 libres</text>
          ${tc(8, 110, o.fits ? 'Cabe' : 'MemoryError: no cabe', OKC(o.fits), 'vizlab')}
          ${tx(8, 132, 'Los float de una lista son objetos aparte;')}${tx(8, 148, 'un array guarda solo los números, uno tras otro.')}
          ${tx(8, 168, 'RAM libre orientativa: mírala con gc.mem_free()')}`);
      }
    },
    /* rp10 · Plazos con ticks_ms() o con ticks_add() */
    rp_ticksv: {
      calc: p => ({ drift: p.m ? p.d : 20 * p.d, fixed: p.m && p.d > 0 ? 1 : 0 }),
      svg: (p, o) => {
        const sc = 270 / 5600, X = t => 16 + t * sc;
        let ideal = '', real = '';
        for (let k = 1; k <= 20; k++) { const t = k * 250, r = p.m ? t + p.d : k * (250 + p.d); ideal += `<path d="M${X(t).toFixed(1)} 44v14" stroke="var(--muted)" stroke-width="1.5"/>`; real += `<path d="M${X(r).toFixed(1)} 76v14" stroke="${p.m || !p.d ? 'var(--ok)' : 'var(--err)'}" stroke-width="2"/>`; }
        return SV(176, `${tx(8, 36, 'Instantes ideales: cada 250 ms')}${ideal}${tx(8, 104, p.m ? 'Con antes = ticks_add(antes, 250)' : 'Con antes = ticks_ms()')}${real}${ln('M16 92H288', 'var(--line)')}
          ${tx(16, 120, '0 s')}${tx(288, 120, '5 s', 'vizsm', END)}
          ${tc(8, 146, `Tras 20 cambios, va ${o.drift} ms tarde`, o.drift > p.d ? 'var(--err)' : 'var(--ok)', 'vizlab')}
          ${tx(8, 166, p.m ? 'Cada cambio llega algo tarde, pero no se acumula.' : 'Cada retraso empuja todos los plazos siguientes.')}`);
      }
    },
    /* rp10, rp19 · Un contador que da la vuelta (8 bits para verlo) */
    rp_wrapv: {
      calc: p => { const raw = p.b - p.a, td = ((p.b - p.a + 128) & 255) - 128; return { raw, td, tdWrap20: p.b < p.a && td === 20 ? 1 : 0 }; },
      svg: (p, o) => {
        const cx = 82, cy = 88, hand = (v, col, r) => { const a = v / 256 * 2 * Math.PI - Math.PI / 2; return ln(`M${cx} ${cy}L${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`, col, 3.5); };
        return SV(180, `<circle cx="${cx}" cy="${cy}" r="58" fill="none" stroke="currentColor" stroke-width="2"/>${[0, 64, 128, 192].map(v => { const a = v / 256 * 2 * Math.PI - Math.PI / 2; return tx((cx + 70 * Math.cos(a)).toFixed(1), (cy + 4 + 70 * Math.sin(a)).toFixed(1), String(v), 'vizsm', MID); }).join('')}
          ${hand(p.a, 'var(--ice)', 44)}${hand(p.b, 'var(--led)', 52)}<circle cx="${cx}" cy="${cy}" r="4" fill="currentColor"/>
          ${tc(166, 40, '● antes = ' + p.a, 'var(--ice)', 'vizlab')}${tc(166, 60, '● ahora = ' + p.b, 'var(--led)', 'vizlab')}
          ${tx(166, 90, 'ahora − antes =')}${tc(166, 108, String(o.raw), o.raw < 0 ? 'var(--err)' : 'currentColor', 'vizbig')}
          ${tx(166, 134, 'ticks_diff(ahora, antes)')}${tc(166, 152, '= ' + o.td, 'var(--ok)', 'vizbig')}
          ${tx(166, 172, '8 bits: 255 → 0')}`);
      }
    },
    /* rp11 · Desgaste de la flash al escribir ficheros */
    rp_wearv: {
      calc: p => { const perDay = 86400 / (p.iv * p.g), years = 100000 * 300 / perDay / 365; return { years, yearsAt1: p.iv === 1 ? years : -1 }; },
      svg: (p, o) => {
        const L = y => 8 + 284 * Math.max(0, Math.min(1, (Math.log10(y) + 3.5) / 6)), marks = [[1 / 365, '1 día'], [1 / 12, '1 mes'], [1, '1 año'], [10, '10 años'], [100, '100']];
        const per = 86400 / (p.iv * p.g), life = o.years >= 1 ? num(o.years, 1) + ' años' : o.years * 365 >= 1 ? num(o.years * 365, 0) + ' días' : num(o.years * 365 * 24, 0) + ' horas';
        return SV(182, `${tx(8, 22, `Mides cada ${num(p.iv, 2)} s y escribes cada ${p.g} medida${p.g > 1 ? 's' : ''}`, 'vizlab')}${tx(8, 40, `≈ ${num(per, 0)} escrituras al día`)}
          ${fl(8, 54, 284, 18, 'var(--line)', 1, 6)}${fl(8, 54, L(o.years) - 8, 18, o.years >= 10 ? 'var(--ok)' : o.years >= 1 ? 'var(--led)' : 'var(--err)', 0.9, 6)}
          ${marks.map(([y, t]) => `${ln(`M${L(y).toFixed(1)} 50V78`, 'var(--muted)', 1)}${tx(L(y).toFixed(1), 92, t, 'vizsm', MID)}`).join('')}
          ${tc(8, 118, 'La flash duraría unos ' + life, o.years >= 10 ? 'var(--ok)' : 'var(--err)', 'vizlab')}
          ${tx(8, 142, 'Modelo sencillo: cada escritura borra un sector de')}${tx(8, 158, '4 KB, el desgaste se reparte entre unos 300 y cada uno')}${tx(8, 174, 'aguanta unos 100 000 borrados.')}`);
      }
    },

    /* rp12 · duty_u16 y la forma de onda */
    rp_dutyv: {
      calc: p => { const du = Math.round(p.D * 655.35), per = 1000 / p.f, pw = per * du / 65535; return { du, pct: du / 655.35, pw, servo: p.f === 50 ? pw : -1 }; },
      svg: (p, o) => {
        const x0 = 16, w = 260, P = w / 2, d = o.du / 65535, hi = 34, lo = 84;
        let wv = `M${x0} ${d > 0 ? hi : lo}`;
        for (let k = 0; k < 2; k++) { const xs = x0 + k * P; if (d <= 0) wv += `H${xs + P}`; else if (d >= 1) wv += `H${xs + P}`; else wv += `${k ? `V${hi}` : ''}H${(xs + P * d).toFixed(1)}V${lo}H${xs + P}`; }
        const per = 1000 / p.f;
        return SV(184, `${mono(8, 18, `pwm.freq(${p.f}); pwm.duty_u16(${o.du})`, 'currentColor', 11)}${ln(wv, 'var(--led)', 3)}${ln(`M${x0} ${lo + 4}H${x0 + w}`, 'var(--line)')}
          ${tx(x0, 104, `periodo: ${num(per, 3)} ms`)}${tx(x0 + w, 104, `pulso: ${num(o.pw, 3)} ms`, 'vizsm', END)}
          <circle cx="40" cy="140" r="18" fill="var(--led)" opacity="${(0.08 + 0.92 * d).toFixed(2)}"/><circle cx="40" cy="140" r="18" fill="none" stroke="currentColor"/>
          ${tx(70, 136, `Ciclo de trabajo: ${num(o.pct, 1)} %`, 'vizlab')}${tx(70, 154, `duty_u16 = ${num(o.pct, 1)} / 100 × 65535`)}
          ${tx(8, 178, p.f === 50 ? 'A 50 Hz, un servo lee el ancho del pulso (1–2 ms)' : 'Misma escala 0–65535 con cualquier frecuencia')}`);
      }
    },
    /* rp12, rp20 · Qué pines comparten slice de PWM */
    rp_slicev: {
      calc: p => { const sa = (p.a >> 1) & 7, sb = (p.b >> 1) & 7, same = sa === sb && p.a !== p.b ? 1 : 0; return { same, sameCh: same && (p.a & 1) === (p.b & 1) ? 1 : 0, ok: !same && p.a !== p.b ? 1 : 0 }; },
      svg: (p, o) => {
        let g = '';
        for (let s = 0; s < 8; s++) {
          const x = 8 + (s % 4) * 72, y = 14 + Math.floor(s / 4) * 64;
          g += `<rect x="${x}" y="${y}" width="68" height="58" rx="6" fill="none" stroke="var(--line)" stroke-width="2"/>${tx(x + 34, y + 13, 'slice ' + s, 'vizsm', MID)}`;
          ['A', 'B'].forEach((c, ci) => { const pins = [2 * s + ci, 2 * s + ci + 16].filter(n => n <= 29); g += `<text x="${x + 6}" y="${y + 30 + ci * 16}" font-size="10.5" style="fill:var(--muted)">${c}: ${pins.map(n => `<tspan style="fill:${n === p.a ? 'var(--ice)' : n === p.b ? 'var(--led)' : 'var(--muted)'}" font-weight="${n === p.a || n === p.b ? 800 : 400}">${n}</tspan>`).join(' · ')}</text>`; });
        }
        return SV(198, `${g}${tc(8, 156, '● GP' + p.a + ' → ' + slOf(p.a), 'var(--ice)', 'vizlab')}${tc(8, 174, '● GP' + p.b + ' → ' + slOf(p.b), 'var(--led)', 'vizlab')}
          ${tc(8, 193, p.a === p.b ? 'Es el mismo pin' : o.sameCh ? 'Mismo canal: misma frecuencia Y mismo ciclo' : o.same ? 'Mismo slice: comparten frecuencia' : 'Slices distintos: frecuencias independientes', OKC(o.ok), 'vizsm')}`);
      }
    },
    /* rp13 · Del pin a read_u16 y a voltios, con ruido y promedios */
    rp_adcv: {
      calc: p => { const raw = Math.min(4095, Math.floor(p.v / 3.3 * 4096)), u16 = (raw << 4) | (raw >> 8), noise = p.nz / Math.sqrt(p.n); return { raw, u16, V: u16 * 3.3 / 65535, noise, noise20: p.nz === 20 ? noise : 99 }; },
      svg: (p, o) => {
        const y0 = 150, amp = 1.3;
        let pts = '';
        for (let i = 0; i < 70; i++) { let s = 0; for (let k = 0; k < p.n; k++) s += RND[(i * 7 + k * 13) % 240]; const v = s / p.n * p.nz * amp; pts += `${i ? 'L' : 'M'}${(8 + i * 4).toFixed(1)} ${(y0 - v).toFixed(1)}`; }
        return SV(196, `${tx(8, 20, `Pin: ${num(p.v, 2)} V`, 'vizlab')}${ln('M100 16H122')}<path d="M126 16l-6 -4v8z" fill="currentColor"/>${tx(130, 20, `ADC 12 bits: ${o.raw}`, 'vizlab')}
          ${tx(8, 42, `read_u16() = ${o.raw} × 16 ≈ ${o.u16}`, 'vizlab')}${tx(8, 62, `V = ${o.u16} × 3,3 / 65535 = ${num(o.V, 3)} V`)}
          ${fl(8, 72, 284, 10, 'var(--line)')}${fl(8, 72, 284 * o.u16 / 65535, 10, 'var(--ice)')}${tx(8, 96, '0')}${tx(292, 96, '65535', 'vizsm', END)}
          ${tx(8, 118, `Lecturas con ruido de ±${p.nz} cuentas, media de ${p.n}:`)}${ln('M8 150H288', 'var(--line)')}${ln(pts, 'var(--led)', 1.8)}
          ${tc(8, 190, `Temblor que queda: ±${num(o.noise, 1)} cuentas`, o.noise <= 5 ? 'var(--ok)' : 'currentColor', 'vizlab')}`);
      }
    },
    /* rp14 · Sensor de temperatura interno */
    rp_tempv: {
      calc: p => { const V = 0.706 - 0.001721 * (p.T - 27), u16 = Math.round(V / p.vr * 65535), Vc = u16 * 3.3 / 65535, Tc = 27 - (Vc - 0.706) / 0.001721; return { V, Tc, err: Tc - p.T, aerr: Math.abs(Tc - p.T) }; },
      svg: (p, o) => {
        const X = T => 30 + (T + 10) * 2.8, Y = V => 30 + (0.775 - V) * 580;
        return SV(196, `${ln('M30 22V126H284', 'var(--line)')}${ln(`M${X(-10)} ${Y(0.706 + 0.001721 * 37).toFixed(1)}L${X(80)} ${Y(0.706 - 0.001721 * 53).toFixed(1)}`, 'var(--ice)', 2.5)}
          <circle cx="${X(p.T).toFixed(1)}" cy="${Y(o.V).toFixed(1)}" r="6" fill="var(--led)"/>${tx(36, 20, 'V del sensor')}${tx(284, 140, 'T del chip →', 'vizsm', END)}
          ${tx(X(27).toFixed(1), 140, '27 °C', 'vizsm', MID)}${ln(`M${X(27)} 126v-4`, 'currentColor')}
          ${tx(8, 158, `Chip a ${p.T} °C → ${num(o.V, 4)} V`, 'vizlab')}${tx(8, 174, `Calculas con 3,3 V (real ${num(p.vr, 2)} V): ${num(o.Tc, 1)} °C`)}
          ${tc(8, 192, `Error: ${o.err >= 0 ? '+' : ''}${num(o.err, 1)} °C`, o.aerr > 1 ? 'var(--err)' : 'var(--ok)', 'vizlab')}`);
      }
    },
    /* rp15 · Rebotes y antirrebote por tiempo */
    rp_bouncev: {
      calc: p => { const ts = [0, 0.3, 0.5, 0.75, 1].map(f => f * p.bt); let last = -1e9, n = 0; ts.forEach(t => { if (t - last > p.db) n++; last = t; }); return { n, n10ok: p.bt === 10 && n === 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const ts = [0, 0.3, 0.5, 0.75, 1].map(f => f * p.bt), sc = 230 / 14, X = t => 40 + t * sc;
        let w = `M8 40H${X(0).toFixed(1)}`, marks = '', last = -1e9;
        ts.forEach((t, i) => { const nx = i < 4 ? ts[i + 1] : null; w += `V80${nx !== null ? `H${X((t + nx) / 2).toFixed(1)}V40H${X(nx).toFixed(1)}` : 'H292'}`; const c = t - last > p.db; last = t; marks += `<circle cx="${X(t).toFixed(1)}" cy="100" r="5" fill="${c ? 'var(--ok)' : 'var(--err)'}"/>`; });
        return SV(170, `${tx(8, 24, 'Pin con pull-up al pulsar (1 → 0) con rebotes')}${ln(w, 'var(--led)', 2.5)}${fl(X(0), 30, Math.min(250, p.db * sc), 60, 'var(--ice)', 0.15)}${marks}
          ${tx(8, 124, '● cuenta   ● ignorado (llegó antes de ' + p.db + ' ms)')}
          ${tc(8, 148, `Una pulsación contada como ${o.n}`, OKC(o.n === 1), 'vizlab')}${tx(8, 164, `Rebote de ${p.bt} ms · antirrebote de ${p.db} ms`)}`);
      }
    },
    /* rp16 · Pull-ups y flancos del bus I²C */
    rp_i2cv: {
      calc: p => { const tr = 0.8473 * p.R * p.C * 1e-3, lim = p.f === 400 ? 300 : 1000, ok = tr <= lim ? 1 : 0; return { tr, ok, ok400: p.f === 400 && ok ? 1 : 0, ok400pF: p.C === 400 && ok ? 1 : 0 }; },
      svg: (p, o) => {
        const P = 1e6 / (p.f * 1000), tau = p.R * p.C * 1e-3, sc = 260 / (2 * P), hi = 40, lo = 100;
        let d = `M16 ${lo}`;
        for (let k = 0; k < 2; k++) { const t0 = k * P; d += `L${(16 + t0 * sc).toFixed(1)} ${lo}`; for (let j = 1; j <= 24; j++) { const t = (P / 2) * j / 24, v = 1 - Math.exp(-t / tau); d += `L${(16 + (t0 + t) * sc).toFixed(1)} ${(lo - (lo - hi) * v).toFixed(1)}`; } d += `L${(16 + (t0 + P / 2) * sc + 0.5).toFixed(1)} ${lo}`; }
        return SV(190, `${tx(8, 20, `SCL a ${p.f} kHz · pull-up ${Widgets.H.fR(p.R)} · bus de ${p.C} pF`)}${ln(`M16 ${(lo - (lo - hi) * 0.7).toFixed(1)}H276`, 'var(--muted)', 1, 'stroke-dasharray="3 3"')}${tx(276, ((100 - 60 * 0.7) - 4).toFixed(1), '70 %', 'vizsm', END)}
          ${ln(d, o.ok ? 'var(--ok)' : 'var(--err)', 2.5)}${ln(`M16 ${lo + 2}H276`, 'var(--line)')}
          ${tx(8, 130, `Subida (30 → 70 %): 0,85 × R × C = ${num(o.tr, 0)} ns`, 'vizlab')}${tx(8, 148, `Máximo permitido a ${p.f} kHz: ${p.f === 400 ? 300 : 1000} ns`)}
          ${tc(8, 172, o.ok ? 'Flancos a tiempo' : 'Demasiado lento: los bits se leen mal', OKC(o.ok), 'vizlab')}${tx(8, 186, 'Bajar: lo hacen los chips. Subir: solo la resistencia.')}`);
      }
    },
    /* rp47 · La trama de una UART */
    rp_framev: {
      calc: p => ({ b: p.b, bitT: 1e6 / p.bd, frameT: 1e7 / p.bd }),
      svg: (p, o) => {
        const bits = [0, ...Array.from({ length: 8 }, (_, i) => (p.b >> i) & 1), 1], W = 25, x0 = 24, hi = 46, lo = 86;
        let w = `M4 ${hi}H${x0}`;
        bits.forEach((b, i) => { w += `V${b ? hi : lo}H${x0 + (i + 1) * W}`; });
        w += `V${hi}H296`;
        const labs = ['ini', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'par'];
        return SV(170, `${tx(8, 20, `byte ${p.b} = ${H2(p.b)} = 0b${B8(p.b)}`, 'vizlab')}${bits.map((b, i) => `<rect x="${x0 + i * W}" y="${hi - 8}" width="${W}" height="${lo - hi + 16}" fill="${i === 0 || i === 9 ? 'var(--ice)' : 'var(--led)'}" opacity=".12"/>${tx(x0 + i * W + W / 2, 112, labs[i], 'vizsm', MID)}${tx(x0 + i * W + W / 2, 32, String(b), 'vizsm', MID)}`).join('')}${ln(w, 'var(--led)', 2.5)}
          ${tx(8, 136, 'Reposo alto · inicio bajo · bit 0 primero · parada alta')}
          ${tx(8, 156, `${p.bd} bd: bit de ${num(o.bitT, 1)} µs · byte de ${o.frameT >= 1000 ? num(o.frameT / 1000, 2) + ' ms' : num(o.frameT, 0) + ' µs'}`, 'vizlab')}`);
      }
    }
  });

  // Traza de dos programas PIO pequeños, ciclo a ciclo
  function sqTrace(d1, d0) { const per = d1 + d0 + 2, tr = []; for (let c = 0; c < 40; c++) { const ph = c % per, i0 = ph < 1 + d1; tr.push({ pc: i0 ? 0 : 1, pin: i0 ? 1 : 0, k: i0 ? ph : ph - 1 - d1, d: i0 ? d1 : d0 }); } return tr; }
  function loopTrace(nx) {
    const tr = []; let x = nx, pin = 0; tr.push({ pc: 0, x, pin, k: 0 });
    for (let it = 0; it <= nx; it++) { pin = 1; tr.push({ pc: 1, x, pin, k: 0 }, { pc: 1, x, pin, k: 1 }); pin = 0; tr.push({ pc: 2, x, pin, k: 0 }); x = Math.max(0, x - 1); tr.push({ pc: 3, x, pin, k: 0 }); }
    while (tr.length < 45) tr.push({ pc: 4, x: 0, pin: 0, k: 0 });
    return tr;
  }
  const progBox = (lines, pc, y0 = 10, w = 168) => lines.map((l, i) => `${i === pc ? `<rect x="4" y="${y0 + i * 16}" width="${w}" height="15" rx="4" fill="var(--led)" opacity=".35"/>` : ''}${mono(8, y0 + 11 + i * 16, l, 'currentColor', 10.5)}`).join('');
  const cycWave = (tr, c, y, n = 24, x0 = 14, W = 11) => {
    const mk = m => { let d = `M${x0} ${tr[0].pin ? y : y + 24}`; for (let i = 0; i < m; i++) d += `V${tr[i].pin ? y : y + 24}H${(x0 + (i + 1) * W).toFixed(1)}`; return d; };
    let ticks = ''; for (let i = 0; i < n; i++) ticks += `<path d="M${(x0 + i * W).toFixed(1)} ${y + 28}v4" stroke="var(--muted)"/>`;
    return `${ln(mk(n), 'var(--line)', 2)}${ln(mk(Math.min(n, c + 1)), 'var(--led)', 2.8)}${ticks}<rect x="${(x0 + c * W).toFixed(1)}" y="${y - 6}" width="${W}" height="38" fill="var(--ice)" opacity=".25"/>`;
  };

  const HOST = (x, y, t) => `${bx(x, y, 70, 40)}${tx(x + 35, y + 25, t, 'vizlab', MID)}`;
  const BLE_HEX = v => H2(v & 255);

  Object.assign(Widgets.VIZ, {
    /* rp17 · Tareas cooperativas: time.sleep frente a await */
    rp_asyncv: {
      calc: p => {
        const bl = []; let prev = 0;
        if (!p.aw && p.blk > 0) for (let k = 1; ; k++) { const s = Math.max(300 * k, prev); if (s >= 2000) break; bl.push([s, s + p.blk]); prev = s + p.blk; }
        let maxd = 0; for (let d = 200; d < 2000; d += 200) { let a = d; bl.forEach(([s, e]) => { if (a > s && a < e) a = e; }); maxd = Math.max(maxd, a - d); }
        return { maxd, maxdSleep: p.aw ? 999 : maxd, awFull: p.aw && p.blk === 500 ? 1 : 0, bl };
      },
      svg: (p, o) => {
        const X = t => 40 + t * 0.125;
        let a = ''; for (let d = 200; d < 2000; d += 200) { let r = d; o.bl.forEach(([s, e]) => { if (r > s && r < e) r = e; }); a += `<path d="M${X(d)} 30v10" stroke="var(--muted)"/><circle cx="${X(Math.min(2000, r)).toFixed(1)}" cy="52" r="5" fill="${r > d ? 'var(--err)' : 'var(--ok)'}"/>`; }
        const b = p.aw ? Array.from({ length: 6 }, (_, k) => `<rect x="${X(300 * (k + 1))}" y="86" width="3" height="18" fill="var(--ice)"/>${p.blk ? `<rect x="${X(300 * (k + 1)) + 3}" y="92" width="${(p.blk * 0.125).toFixed(1)}" height="6" fill="var(--ice)" opacity=".3"/>` : ''}`).join('') : o.bl.map(([s, e]) => `<rect x="${X(s)}" y="86" width="${((Math.min(2000, e) - s) * 0.125).toFixed(1)}" height="18" rx="3" fill="var(--err)" opacity=".75"/>`).join('');
        return SV(176, `${tx(4, 56, 'tarea A')}${tx(4, 100, 'tarea B')}${ln('M40 66H290', 'var(--line)')}${a}${b}${ln('M40 110H290', 'var(--line)')}${tx(40, 124, '0 s')}${tx(290, 124, '2 s', 'vizsm', END)}
          ${tx(4, 22, 'A parpadea cada 200 ms (marcas grises = su hora)')}
          ${tc(4, 148, `Retraso máximo de A: ${num(o.maxd, 0)} ms`, o.maxd ? 'var(--err)' : 'var(--ok)', 'vizlab')}
          ${tx(4, 166, p.aw ? 'B espera con await: cede el turno mientras tanto' : `B espera con time.sleep_ms(${p.blk}): nadie más corre`)}`);
      }
    },
    /* rp18 · CMakeLists.txt: bibliotecas y salidas */
    rp_linkv: {
      calc: p => { const err = p.pw && !p.lk ? 1 : 0, uf2 = !err && p.xo ? 1 : 0, usb = !err && p.us ? 1 : 0; return { err, uf2, usb, usbuf2: uf2 && usb && p.pw ? 1 : 0 }; },
      svg: (p, o) => {
        const lines = ['add_executable(app main.c)', `target_link_libraries(app pico_stdlib${p.lk ? ' hardware_pwm' : ''})`, p.us ? 'pico_enable_stdio_usb(app 1)' : '# sin stdio por USB', p.xo ? 'pico_add_extra_outputs(app)' : '# sin salidas extra'];
        const st = (x, t, ok) => `${bx(x, 104, 64, 30, ok ? 'var(--ok)' : 'var(--err)')}${tx(x + 32, 123, t, 'vizsm', MID)}`;
        return SV(200, `${TERM(4, 6, 292, 74)}${lines.map((l, i) => mono(10, 22 + i * 16, l, l[0] === '#' ? '#7C8AA5' : '#E8EDF5', 10)).join('')}
          ${tx(4, 96, p.pw ? 'main.c incluye hardware/pwm.h' : 'main.c solo usa pico_stdlib')}
          ${st(4, 'compila', !o.err)}${st(78, '.elf', !o.err)}${st(152, '.uf2', o.uf2)}${st(226, 'printf USB', o.usb)}
          ${tc(4, 160, o.err ? 'Error: hardware/pwm.h no se encuentra' : 'Compila y enlaza', OKC(!o.err), 'vizlab')}
          ${tx(4, 178, o.err ? 'Enlazar la biblioteca añade también sus cabeceras.' : o.uf2 ? 'El .uf2 se arrastra en BOOTSEL; el .elf, al depurador.' : 'Sin pico_add_extra_outputs solo sale el .elf.')}
          ${tx(4, 194, o.usb ? 'printf sale por el USB (puerto serie virtual).' : 'printf no sale por el USB.')}`);
      }
    },
    /* rp19 · gpio_set_mask, gpio_clr_mask y gpio_xor_mask */
    rp_maskv: {
      calc: p => ({ r: [p.st | p.mk, p.st & ~p.mk & 255, p.st ^ p.mk][p.op] }),
      svg: (p, o) => {
        const fn = ['gpio_set_mask', 'gpio_clr_mask', 'gpio_xor_mask'][p.op];
        const leds = (v, y, lab) => `${tx(4, y + 4, lab)}${Array.from({ length: 8 }, (_, i) => { const b = (v >> (7 - i)) & 1; return `<circle cx="${88 + i * 26}" cy="${y}" r="9" fill="${b ? 'var(--led)' : 'var(--line)'}"/>`; }).join('')}`;
        return SV(186, `${Array.from({ length: 8 }, (_, i) => tx(88 + i * 26, 18, 'GP' + (7 - i), 'vizsm', MID)).join('')}
          ${leds(p.st, 38, 'antes')}${tx(4, 70, 'máscara')}${Array.from({ length: 8 }, (_, i) => { const b = (p.mk >> (7 - i)) & 1; return `<rect x="${79 + i * 26}" y="58" width="18" height="16" rx="3" fill="${b ? 'var(--ice)' : 'none'}" stroke="var(--ice)"/>`; }).join('')}
          ${leds(o.r, 100, 'después')}
          ${mono(4, 136, `${fn}(${H2(p.mk)});`, 'currentColor', 11.5)}
          ${tx(4, 158, ['set: pone a 1 los bits marcados', 'clr: pone a 0 los bits marcados', 'xor: invierte los bits marcados'][p.op] + '; el resto, igual.')}
          ${tx(4, 176, `0b${B8(p.st)} → 0b${B8(o.r)} en un solo ciclo`)}`);
      }
    },
    /* rp21 · Qué cambia al cambiar clk_sys */
    rp_clktv: {
      calc: p => ({ fpwm: 1000 * p.cs / 125, baud: 115200 * p.cs / 125, cs: p.cs }),
      svg: (p, o) => {
        const row = (y, name, val, ch) => `${tx(4, y, name)}${tc(292, y, val, ch ? 'var(--err)' : 'var(--ok)', 'vizlab', END)}`;
        return SV(180, `${bx(4, 20, 60, 34)}${tx(34, 41, 'XOSC 12', 'vizsm', MID)}${ln('M64 37H80')}${bx(80, 8, 60, 28)}${tx(110, 26, 'PLL_SYS', 'vizsm', MID)}${bx(80, 44, 60, 28)}${tx(110, 62, 'PLL_USB', 'vizsm', MID)}
          ${ln('M140 22H150')}${ln('M140 58H150')}${tx(150, 22, `clk_sys = ${p.cs} MHz`, 'vizlab')}${tx(150, 62, 'clk_usb, clk_adc: 48 MHz', 'vizsm')}
          ${tx(4, 96, 'Misma configuración, calculada para 125 MHz:')}
          ${row(118, 'PWM (div 125, wrap 999)', fHz(o.fpwm), p.cs !== 125)}${row(136, 'UART por PIO (div 135,6)', num(o.baud, 0) + ' bd', p.cs !== 125)}
          ${row(154, 'USB', '12 Mbit/s', false)}${row(172, 'ADC (div 0)', '500 ksps', false)}
          `);
      }
    },
    /* rp22 · Temporizador repetitivo: periodo positivo o negativo */
    rp_timercv: {
      calc: p => { const per = p.pd < 0 ? Math.max(10, p.cb) : 10 + p.cb; return { per, perCb: p.cb >= 1 ? per : 0, rate: 1000 / per }; },
      svg: (p, o) => {
        const X = t => 10 + t * 5.4;
        let bars = '';
        for (let k = 0, t = 0; t < 50 && k < 8; k++, t += o.per) bars += `<path d="M${X(t).toFixed(1)} 30v50" stroke="var(--ice)" stroke-width="2"/><rect x="${X(t).toFixed(1)}" y="44" width="${(p.cb * 5.4).toFixed(1)}" height="22" rx="3" fill="var(--led)" opacity=".8"/>`;
        return SV(160, `${mono(4, 18, `add_repeating_timer_ms(${p.pd}, tick, …)`, 'currentColor', 10.5)}${bars}${ln('M10 84H280', 'var(--line)')}${tx(10, 98, '0 ms')}${tx(280, 98, '50 ms', 'vizsm', END)}
          ${tx(4, 118, '| = inicio de cada llamada · bloque = lo que tarda')}
          ${tc(4, 138, `De inicio a inicio: ${num(o.per, 1)} ms (${num(o.rate, 1)} Hz)`, o.per === 10 ? 'var(--ok)' : 'var(--err)', 'vizlab')}
          ${tx(4, 154, p.pd < 0 ? 'Negativo: cuenta desde el inicio de la llamada anterior' : 'Positivo: cuenta desde que la llamada termina')}`);
      }
    },
    /* rp23 · Accesos alineados y HardFault */
    rp_alignv: {
      calc: p => { const fault = p.off % p.sz !== 0 ? 1 : 0; return { fault, ok4: p.sz === 4 && !fault ? 1 : 0, f2: p.sz === 2 && fault ? 1 : 0 }; },
      svg: (p, o) => {
        let cells = '';
        for (let i = 0; i < 12; i++) { const inA = i >= p.off && i < p.off + p.sz; cells += `<rect x="${12 + i * 23}" y="40" width="21" height="28" rx="3" fill="${inA ? (o.fault ? 'var(--err)' : 'var(--ok)') : 'var(--line)'}" opacity="${inA ? 0.85 : 0.5}"/>${tx(22.5 + i * 23, 84, (i).toString(16).toUpperCase(), 'vizsm', MID)}`; }
        let words = ''; for (let w = 0; w <= 3; w++) words += ln(`M${12 + w * 92 - 1} 32V76`, 'currentColor', 2);
        return SV(160, `${tx(4, 22, 'Bytes de la RAM desde 0x20000000 (último dígito)')}${words}${cells}
          ${mono(4, 108, `uint${p.sz * 8}_t en 0x2000000${p.off.toString(16).toUpperCase()}`, 'currentColor', 11.5)}
          ${tc(4, 132, o.fault ? 'HardFault: acceso desalineado' : 'Acceso válido', OKC(!o.fault), 'vizlab')}
          ${tx(4, 150, 'El M0+ exige: 16 bits en par, 32 bits en múltiplo de 4')}`);
      }
    },
    /* rp23 · Medir con un GPIO de depuración */
    rp_dbgv: {
      calc: p => ({ pct: p.w / p.T * 100 }),
      svg: (p, o) => {
        const sc = 260 / (2 * p.T); let d = 'M16 80';
        for (let k = 0; k < 2; k++) { const x = 16 + k * p.T * sc; d += `H${x.toFixed(1)}V40H${(x + p.w * sc).toFixed(1)}V80`; }
        d += 'H276';
        return SV(150, `${tx(4, 20, 'gpio_put(DBG, 1) al entrar · gpio_put(DBG, 0) al salir')}${ln(d, 'var(--led)', 2.5)}
          ${tx(16, 100, `pulso: ${p.w} µs`)}${tx(276, 100, `cada ${p.T} µs`, 'vizsm', END)}
          ${tc(4, 128, `La rutina ocupa el ${num(o.pct, 1)} % del tiempo`, o.pct > 50 ? 'var(--err)' : 'var(--ok)', 'vizlab')}${tx(4, 144, 'El osciloscopio mide sin alterar el programa')}`);
      }
    },

    /* rp24 · Un programa PIO, ciclo a ciclo */
    rp_piostep: {
      calc: p => { const tr = sqTrace(p.d1, p.d0), s = tr[p.c], per = p.d1 + p.d0 + 2; return { pin: s.pin, pc: s.pc, per, high: p.d1 + 1, hi6: p.d1 + 1 === 6 && per === 8 ? 1 : 0 }; },
      svg: (p, o) => {
        const tr = sqTrace(p.d1, p.d0), s = tr[p.c];
        return SV(190, `${mono(8, 18, 'wrap_target()', 'var(--muted)', 10)}${progBox([`set(pins, 1)  [${p.d1}]`, `set(pins, 0)  [${p.d0}]`], s.pc, 24)}${mono(8, 70, 'wrap()', 'var(--muted)', 10)}
          ${tx(190, 30, `ciclo ${p.c}`, 'vizlab')}${tx(190, 48, s.k === 0 ? 'ejecuta la instrucción' : `retardo ${s.k} de ${s.d}`)}${tx(190, 66, `pin = ${s.pin}`)}
          ${cycWave(tr, p.c, 92)}${tx(14, 142, '1 marca = 1 ciclo de la máquina')}
          ${tx(8, 164, `Alto ${p.d1 + 1} + bajo ${p.d0 + 1} = periodo de ${o.per} ciclos`, 'vizlab')}${tx(8, 182, 'Cada instrucción: 1 ciclo + su retardo [n]')}`);
      }
    },
    /* rp25 · Un bucle con jmp(x_dec) */
    rp_pioloop: {
      calc: p => { const tr = loopTrace(p.nx), s = tr[p.c]; let up = 0; for (let i = 1; i <= p.c; i++) if (tr[i].pin && !tr[i - 1].pin) up++; return { pulses: p.nx + 1, fin: s.pc === 4 ? 1 : 0, sofar: up, x: s.x }; },
      svg: (p, o) => {
        const tr = loopTrace(p.nx), s = tr[p.c];
        return SV(200, `${progBox([`set(x, ${p.nx})`, 'set(pins, 1)  [1]   # bucle', 'set(pins, 0)', 'jmp(x_dec, "bucle")', 'jmp("fin")          # fin'], s.pc, 6, 180)}
          ${tx(196, 22, `ciclo ${p.c}`, 'vizlab')}${tx(196, 40, `X = ${s.x}`, 'vizlab')}${tx(196, 58, `pulsos: ${o.sofar}`)}${tc(196, 76, o.fin ? 'parada en «fin»' : 'en marcha', o.fin ? 'var(--ok)' : 'var(--muted)')}
          ${cycWave(tr, Math.min(p.c, 25), 104, 26, 8, 10.6)}
          ${tx(8, 160, `X empieza en ${p.nx}: el cuerpo se repite ${p.nx + 1} veces`, 'vizlab')}${tx(8, 178, 'jmp(x_dec) salta si X no es 0 y luego le resta 1')}${tx(8, 194, 'Cada vuelta: 2 + 1 + 1 = 4 ciclos')}`);
      }
    },
    /* rp26 · El OSR: qué bit sale primero y cuándo se recarga */
    rp_osrv: {
      calc: p => {
        const w = (p.dt * 2 ** p.pos) >>> 0, seq = Array.from({ length: 8 }, (_, i) => p.dir ? (w >>> (31 - i)) & 1 : (w >>> i) & 1);
        const lsb = seq.every((b, i) => b === ((p.dt >> i) & 1)), msb = seq.every((b, i) => b === ((p.dt >> (7 - i)) & 1));
        return { lsbOk: lsb ? 1 : 0, msbOk: msb ? 1 : 0, th: p.th, zeros: seq.every(b => !b) && p.dt ? 1 : 0 };
      },
      svg: (p, o) => {
        const w = (p.dt * 2 ** p.pos) >>> 0, seq = Array.from({ length: 8 }, (_, i) => p.dir ? (w >>> (31 - i)) & 1 : (w >>> i) & 1);
        let cells = ''; for (let i = 31; i >= 0; i--) { const b = (w >>> i) & 1, x = 22 + (31 - i) * 8, dat = i >= p.pos && i < p.pos + 8; cells += `<rect x="${x}" y="40" width="7" height="22" fill="${dat ? (b ? 'var(--ice)' : 'var(--ice-soft)') : 'var(--line)'}" opacity="${dat ? 1 : 0.5}"/>`; }
        return SV(190, `${mono(8, 18, `sm.put(${p.dt}${p.pos ? ', ' + p.pos : ''})  ·  ${p.dir ? 'SHIFT_LEFT' : 'SHIFT_RIGHT'}`, 'currentColor', 10.5)}
          ${tx(22, 34, 'bit 31')}${tx(278, 34, 'bit 0', 'vizsm', END)}${cells}${p.dir ? `<path d="M18 51l-10 0" stroke="var(--led)" stroke-width="3"/><path d="M6 51l6 -5v10z" fill="var(--led)"/>` : `<path d="M280 51h10" stroke="var(--led)" stroke-width="3"/><path d="M294 51l-6 -5v10z" fill="var(--led)"/>`}
          ${tx(8, 86, 'Los 8 primeros bits que salen por el pin:')}${seq.map((b, i) => `<rect x="${8 + i * 24}" y="94" width="20" height="22" rx="3" fill="${b ? 'var(--led)' : 'var(--line)'}"/><text x="${18 + i * 24}" y="110" font-size="12" font-weight="700" fill="${b ? '#1B1300' : 'var(--muted)'}" ${MID}>${b}</text>`).join('')}
          ${tc(204, 110, o.lsbOk ? 'bit 0 primero' : o.msbOk ? 'bit 7 primero' : o.zeros ? 'solo ceros' : 'desordenado', o.lsbOk || o.msbOk ? 'var(--ok)' : 'var(--err)', 'vizlab')}
          ${tx(8, 142, `Autopull a ${p.th} bits: tras ${p.th} out(pins, 1), la siguiente`)}${tx(8, 158, 'recarga el OSR desde la TX FIFO sin instrucción pull.')}
          ${tx(8, 180, 'Datos en azul; en gris, los bits sin usar del OSR.')}`);
      }
    },
    /* rp26, rp33 · Una FIFO entre quien escribe y quien lee */
    rp_fifov: {
      calc: p => { const net = p.w - p.r; return { full: net > 0 ? 1 : 0, tfull: net > 0 ? p.dp / net : 99, dp: p.dp }; },
      svg: (p, o) => {
        const net = p.w - p.r, fill = t => Math.min(p.dp, Math.max(0, net * t)), X = t => 40 + t * 30, Y = f => 150 - f * 8;
        let d = ''; for (let t = 0; t <= 8; t += 0.25) d += `${t ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(fill(t)).toFixed(1)}`;
        const now = fill(2);
        return SV(196, `${bx(4, 14, 72, 36)}${tx(40, 30, 'escribe', 'vizsm', MID)}${tx(40, 44, p.w + ' por ms', 'vizlab', MID)}${ln('M76 32H92')}
          ${Array.from({ length: p.dp }, (_, i) => `<rect x="${94 + i * 14}" y="20" width="12" height="24" rx="2" fill="${i < now ? 'var(--ice)' : 'none'}" stroke="var(--ice)"/>`).join('')}
          ${ln(`M${94 + p.dp * 14} 32H${110 + p.dp * 14}`)}${bx(110 + p.dp * 14, 14, 72, 36)}${tx(146 + p.dp * 14, 30, 'lee', 'vizsm', MID)}${tx(146 + p.dp * 14, 44, p.r + ' por ms', 'vizlab', MID)}
          ${ln('M40 150H286', 'var(--line)')}${ln('M40 150V80', 'var(--line)')}${ln(`M40 ${Y(p.dp)}H286`, 'var(--err)', 1, 'stroke-dasharray="3 3"')}${tx(44, Y(p.dp) - 4, 'llena', 'vizsm')}
          ${ln(d, 'var(--ice)', 2.5)}${tx(40, 166, '0')}${tx(286, 166, '8 ms', 'vizsm', END)}${tx(4, 74, 'palabras')}
          ${tc(4, 188, o.full ? `Se llena en ${num(o.tfull, 2)} ms; luego quien escribe espera` : 'Nunca se llena: nadie espera', o.full ? 'var(--err)' : 'var(--ok)', 'vizlab')}`);
      }
    },
    /* rp27 · Side-set y retardo comparten 5 bits */
    rp_ssv: {
      calc: p => { const bits = p.n + (p.op && p.n ? 1 : 0); return { bits, maxd: bits <= 5 ? 2 ** (5 - bits) - 1 : -1, valid: bits <= 5 ? 1 : 0 }; },
      svg: (p, o) => {
        const bits = o.bits, f = Array.from({ length: 16 }, (_, i) => i < 3 ? ['var(--muted)', 'op'] : i < 8 ? (i - 3 < Math.min(5, bits) ? ['var(--led)', 'S'] : ['var(--ice)', 'R']) : ['var(--line)', 'a']);
        return SV(176, `${tx(4, 20, 'Una instrucción PIO = 16 bits')}${f.map(([c, l], i) => `<rect x="${8 + i * 18}" y="30" width="16" height="26" rx="3" fill="${c}"/><text x="${16 + i * 18}" y="48" font-size="10" fill="#fff" ${MID}>${l}</text>`).join('')}
          ${tx(8, 72, 'código')}${tx(62, 72, '5 bits')}${tx(152, 72, 'argumentos')}
          ${tc(8, 98, `side-set: ${bits} bit${bits === 1 ? '' : 's'}${p.op && p.n ? ' (uno marca si se usa)' : ''}`, 'var(--led)', 'vizlab')}
          ${tc(8, 118, o.valid ? `retardo: ${5 - bits} bits → hasta [${o.maxd}]` : 'No cabe: como mucho 5 bits en total', o.valid ? 'var(--ice)' : 'var(--err)', 'vizlab')}
          ${tx(8, 142, 'Cada pin de side-set se mueve en el mismo ciclo')}${tx(8, 158, 'que la instrucción, sin gastar otra instrucción.')}`);
      }
    },
    /* rp27 · Divisor de reloj de una máquina PIO */
    rp_piodivv: {
      calc: p => { const div = p.cs * 1e6 / (p.bd * p.cy), valid = div >= 1 && div <= 65536 ? 1 : 0; return { div, valid, fsm: p.cs * 1e6 / div }; },
      svg: (p, o) => {
        const L = v => 8 + 284 * Math.max(0, Math.min(1, Math.log10(v) / Math.log10(200000)));
        return SV(170, `${tx(4, 20, `máquina = ${p.bd} baudios × ${p.cy} ciclos por bit`, 'vizlab')}${tx(4, 40, `div = ${p.cs} 000 000 / (${p.bd} × ${p.cy}) = ${num(o.div, 2)}`)}
          ${fl(8, 54, 284, 14, 'var(--line)', 1, 5)}${fl(L(1), 54, L(65536) - L(1), 14, 'var(--ok)', 0.3, 5)}${ln(`M${L(Math.max(0.5, o.div)).toFixed(1)} 48V74`, OKC(o.valid), 3)}
          ${tx(8, 88, '1')}${tx(L(65536), 88, '65 536', 'vizsm', MID)}
          ${tc(4, 116, o.valid ? `Vale: la máquina va a ${fHz(o.fsm)}` : o.div < 1 ? 'Imposible: haría falta ir más rápido que clk_sys' : 'Imposible: el divisor no pasa de 65 536', OKC(o.valid), 'vizlab')}
          ${tx(4, 138, 'El divisor admite fracción (8 bits): 1627,6 vale,')}${tx(4, 154, 'con un temblor de un ciclo de clk_sys.')}`);
      }
    },
    /* rp29 · Las 32 instrucciones de un bloque PIO */
    rp_piomemv: {
      calc: p => { const total = p.a + (p.sh ? 0 : p.b) + p.c, fits = total <= 32 ? 1 : 0; return { total, fits, shareFit: p.sh && fits && p.a === 12 && p.c === 12 ? 1 : 0 }; },
      svg: (p, o) => {
        const progs = [['A', p.a, 'var(--ice)'], ...(p.sh ? [] : [['B', p.b, 'var(--led)']]), ['C', p.c, 'var(--gem)']];
        let top = 32, cells = '';
        progs.forEach(([n, len, col]) => { const off = top - len; for (let i = 0; i < len; i++) { const s = off + i; cells += `<rect x="${8 + (s + 8) * 8.4}" y="40" width="7.6" height="26" rx="1.5" fill="${s < 0 ? 'var(--err)' : col}"/>`; } top = off; });
        let y = 104; const lines = []; top = 32; progs.forEach(([n, len, col]) => { const off = top - len; lines.push(tc(8, y, `Programa ${n}: ${len} instrucciones → ${off >= 0 ? 'offset ' + off : 'no cabe'}`, off >= 0 ? col : 'var(--err)', 'vizlab')); y += 18; top = off; });
        let grid = ''; for (let s = 0; s < 32; s++) grid += `<rect x="${8 + (s + 8) * 8.4}" y="40" width="7.6" height="26" rx="1.5" fill="none" stroke="var(--line)"/>`;
        return SV(186, `${tx(76, 30, 'memoria del bloque: 0 … 31')}${grid}${cells}${tx(8, 58, 'fuera')}${tx(8, 86, `Total: ${o.total} de 32${p.sh ? ' (B usa el mismo programa que A)' : ''}`)}${lines.join('')}
          ${tc(8, 180, o.fits ? 'Caben todos' : 'No caben: pio_add_program fallaría', OKC(o.fits), 'vizlab')}`);
      }
    },
    /* rp30 · Dónde lee el receptor UART cada bit */
    rp_uartrx: {
      calc: p => { let errs = 0; for (let k = 0; k < 10; k++) { const t = (k + p.sp) * (1 + p.er / 100); if (Math.floor(t) !== k) errs++; } return { errs, center6: p.sp === 0.5 && errs > 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const W = 26, x0 = 20;
        let g = '';
        for (let k = 0; k < 10; k++) g += `<rect x="${x0 + k * W}" y="40" width="${W - 1}" height="30" fill="var(--line)" opacity="${k % 2 ? 0.35 : 0.6}"/>${tx(x0 + k * W + W / 2, 86, k === 0 ? 'ini' : k === 9 ? 'par' : 'b' + (k - 1), 'vizsm', MID)}`;
        for (let k = 0; k < 10; k++) { const t = (k + p.sp) * (1 + p.er / 100), ok = Math.floor(t) === k; g += `<path d="M${(x0 + t * W).toFixed(1)} 32V78" stroke="${ok ? 'var(--ok)' : 'var(--err)'}" stroke-width="2.5"/>`; }
        return SV(160, `${tx(4, 22, `Emisor y receptor difieren un ${num(p.er, 1)} %`)}${g}
          ${tx(4, 108, `Lee cada bit a ${num(p.sp, 1)} de su anchura (0,5 = centro)`)}
          ${tc(4, 132, o.errs ? `${o.errs} bit${o.errs > 1 ? 's' : ''} leído${o.errs > 1 ? 's' : ''} en la casilla equivocada` : 'Los 10 bits se leen bien', OKC(!o.errs), 'vizlab')}
          ${tx(4, 150, 'El error se acumula: el último bit es el más desplazado')}`);
      }
    },
    /* rp30 · Encoder en cuadratura */
    rp_encv: {
      calc: p => { const i = ((p.pos % 4) + 4) % 4, ab = [0, 1, 3, 2][i]; return { A: ab >> 1, B: ab & 1, abv: (ab >> 1) * 10 + (ab & 1) }; },
      svg: (p, o) => {
        const X = q => 20 + (q + 6) * 20;
        const wave = (bit, y) => { let d = ''; for (let q = -6; q <= 6; q++) { const i = ((q % 4) + 4) % 4, v = ([0, 1, 3, 2][i] >> bit) & 1, yy = v ? y : y + 18; d += `${q === -6 ? 'M' : 'L'}${X(q) - 10} ${yy}H${X(q) + 10}`; } return ln(d, 'var(--led)', 2.5); };
        return SV(150, `${tx(4, 30, 'A')}${wave(1, 18)}${tx(4, 70, 'B')}${wave(0, 58)}<rect x="${X(p.pos) - 10}" y="10" width="20" height="74" fill="var(--ice)" opacity=".25"/>
          ${tx(4, 108, `Posición ${p.pos}: AB = ${o.A}${o.B}`, 'vizlab')}${tx(4, 126, 'Un sentido: 00 → 01 → 11 → 10 → 00')}${tx(4, 142, 'Cada paso cambia un solo bit')}`);
      }
    },

    /* rp32 · Ritmo de muestreo del ADC según adc_set_clkdiv */
    rp_adcdivv: {
      calc: p => ({ fs: 48e6 / Math.max(96, p.dv + 1) }),
      svg: (p, o) => {
        const L = v => 8 + 284 * (Math.log10(v) - 2.5) / 3.5;
        return SV(150, `${mono(4, 20, `adc_set_clkdiv(${p.dv})`, 'currentColor', 12)}${tx(4, 42, `Una muestra cada ${Math.max(96, p.dv + 1)} ciclos de 48 MHz${p.dv + 1 < 96 ? ' (mínimo 96)' : ''}`)}
          ${fl(8, 54, 284, 16, 'var(--line)', 1, 5)}${fl(8, 54, L(o.fs) - 8, 16, 'var(--ice)', 0.9, 5)}
          ${[[1000, '1 k'], [10000, '10 k'], [100000, '100 k'], [500000, '500 k']].map(([v, t]) => `${ln(`M${L(v).toFixed(1)} 50V74`, 'var(--muted)', 1)}${tx(L(v).toFixed(1), 88, t, 'vizsm', MID)}`).join('')}
          ${tc(4, 116, `${Math.round(o.fs).toLocaleString('es-ES')} muestras por segundo`, 'currentColor', 'vizlab')}${tx(4, 136, 'f = 48 000 000 / (div + 1), como mucho 500 000')}`);
      }
    },
    /* rp45 · Ping-pong: tiempo para procesar cada búfer */
    rp_ppv: {
      calc: p => { const tfill = p.N / p.fs, ok = p.tp <= tfill ? 1 : 0; return { tfill, ok, ok6: p.tp === 6 && ok ? 1 : 0, tight: p.fs === 500 && p.N === 2048 && ok && p.tp >= 3.5 ? 1 : 0 }; },
      svg: (p, o) => {
        const span = 4 * o.tfill, sc = 236 / span, X = t => 54 + t * sc;
        let g = '';
        for (let k = 0; k < 4; k++) { const y = k % 2 ? 54 : 30; g += `<rect x="${X(k * o.tfill).toFixed(1)}" y="${y}" width="${(o.tfill * sc - 2).toFixed(1)}" height="18" rx="3" fill="${k % 2 ? 'var(--led)' : 'var(--ice)'}" opacity=".8"/>`; if (k < 3) { const s = (k + 1) * o.tfill, bad = p.tp > o.tfill; g += `<rect x="${X(s).toFixed(1)}" y="86" width="${Math.min(290 - X(s), p.tp * sc).toFixed(1)}" height="16" rx="3" fill="${bad ? 'var(--err)' : 'var(--ok)'}" opacity=".75"/>`; } }
        return SV(176, `${tx(4, 43, 'búfer 1')}${tx(4, 67, 'búfer 2')}${tx(4, 98, 'CPU')}${g}
          ${tx(4, 22, `DMA: ${p.N} muestras a ${p.fs} ksps = ${num(o.tfill, 2)} ms por búfer`)}
          ${tc(4, 128, o.ok ? 'La CPU acaba antes de que el DMA vuelva a ese búfer' : 'El DMA pisa el búfer: datos perdidos', OKC(o.ok), 'vizlab')}
          ${tx(4, 148, `Proceso de un búfer: ${num(p.tp, 1)} ms; tiempo disponible: ${num(o.tfill, 2)} ms`)}`);
      }
    },
    /* rp45 · Anillo del DMA y alineación */
    rp_ringv: {
      calc: p => { const size = 2 ** p.n, start = p.k * 64, aligned = start % size === 0 ? 1 : 0; return { aligned, al512: p.n === 9 && aligned ? 1 : 0 }; },
      svg: (p, o) => {
        const size = 2 ** p.n, start = p.k * 64, win = Math.floor(start / size) * size, sc = 280 / 2048, X = a => 10 + a * sc;
        let marks = ''; for (let a = 0; a <= 2048; a += 256) marks += `${ln(`M${X(a).toFixed(1)} 60v8`, 'var(--muted)', 1)}${a % 512 === 0 ? tx(X(a).toFixed(1), 82, '0x' + a.toString(16).toUpperCase().padStart(3, '0'), 'vizsm', MID) : ''}`;
        return SV(178, `${tx(4, 14, `Búfer de ${size} bytes en 0x20000${start.toString(16).toUpperCase().padStart(3, '0')}`, 'vizlab')}
          ${fl(X(start), 42, size * sc, 24, 'var(--ice)', 0.8)}${bx(X(win), 40, size * sc, 28, o.aligned ? 'var(--ok)' : 'var(--err)', 'none', 2)}
          ${o.aligned ? '' : `<path d="M${X(win + size).toFixed(1)} 38C${X(win + size).toFixed(1)} 22 ${X(win).toFixed(1)} 22 ${X(win).toFixed(1)} 38" fill="none" stroke="var(--err)" stroke-width="2"/>`}
          ${Array.from({ length: 9 }, (_, i) => ln(`M${X(i * 256).toFixed(1)} 70v8`, 'var(--muted)', 1)).join('')}${tx(10, 92, '0x000', 'vizsm')}${[512, 1024, 1536].map(a => tx(X(a).toFixed(1), 92, '0x' + a.toString(16).toUpperCase(), 'vizsm', MID)).join('')}
          ${tx(4, 114, `El anillo deja fijos los bits altos y gira en los ${p.n} bajos:`)}${tx(4, 130, `vuelve a 0x20000${win.toString(16).toUpperCase().padStart(3, '0')} cada ${size} bytes`)}
          ${tc(4, 154, o.aligned ? 'Alineado: la vuelta cae en tu propio inicio' : 'Desalineado: la vuelta cae fuera de tu búfer', OKC(o.aligned), 'vizlab')}
          ${tx(4, 172, 'Azul = tu búfer · recuadro = ventana del anillo')}`);
      }
    },
    /* rp33 · Lazo de control y ráfagas de WiFi en uno o dos núcleos */
    rp_coresv: {
      calc: p => {
        let jit = 0;
        if (!p.sp) for (let t = 0; t < 5; t++) { let a = t; [0.9, 2.9].forEach(s => { if (a >= s && a < s + p.br) a = s + p.br; }); jit = Math.max(jit, a - t); }
        return { jitter: jit, missed: jit > 0.8 ? 1 : 0, splitBig: p.sp && p.br >= 2 ? 1 : 0 };
      },
      svg: (p, o) => {
        const X = t => 50 + t * 48;
        const wifi = [0.9, 2.9].map(s => p.br ? `<rect x="${X(s)}" y="30" width="${(p.br * 48).toFixed(1)}" height="18" rx="3" fill="var(--led)" opacity=".85"/>` : '').join('');
        let ctl = '';
        for (let t = 0; t < 5; t++) { let a = t; if (!p.sp) [0.9, 2.9].forEach(s => { if (a >= s && a < s + p.br) a = s + p.br; }); const late = a - t > 0.8; ctl += `${ln(`M${X(t)} ${p.sp ? 62 : 26}v26`, 'var(--muted)', 1, 'stroke-dasharray="2 2"')}<rect x="${X(a).toFixed(1)}" y="${p.sp ? 66 : 30}" width="10" height="18" rx="2" fill="${late ? 'var(--err)' : a > t ? 'var(--led)' : 'var(--ice)'}" ${p.sp ? '' : 'opacity=".95"'}/>`; }
        return SV(166, `${tx(4, 43, 'núcleo 0')}${tx(4, 79, 'núcleo 1')}${ln('M50 52H292', 'var(--line)')}${ln('M50 88H292', 'var(--line)')}${wifi}${ctl}
          ${tx(50, 104, '0')}${tx(290, 104, '5 ms', 'vizsm', END)}${tx(4, 122, 'azul = control (cada 1 ms) · naranja = ráfaga de WiFi')}
          ${tc(4, 144, o.missed ? `Plazo perdido: el control llega ${num(o.jitter, 1)} ms tarde` : o.jitter ? `Control retrasado ${num(o.jitter, 1)} ms` : 'Control siempre a su hora', o.missed ? 'var(--err)' : o.jitter ? 'var(--led)' : 'var(--ok)', 'vizlab')}
          ${tx(4, 160, p.sp ? 'Cada núcleo a lo suyo: la red no toca el control' : 'Todo en el núcleo 0: la red retrasa el control')}`);
      }
    },

    /* rp35 · Enumeración USB paso a paso */
    rp_usbv: {
      calc: p => ({ s: p.s }),
      svg: (p, o) => {
        const S = [['Conectas el cable', 'La Pico activa su pull-up en D+:', '«hay un dispositivo de 12 Mbit/s»'], ['Reinicio del bus', 'El anfitrión pone D+ y D− a 0', 'durante unos milisegundos'], ['Descriptor de dispositivo', '¿Quién eres? VID (fabricante),', 'PID (producto), versión, clase'], ['Asigna una dirección', 'Desde ahora te llama por tu', 'número (de 1 a 127)'], ['Lee la configuración', 'Interfaces y endpoints:', '«soy un teclado HID»'], ['Carga el controlador', 'El sistema ya trae el', 'controlador estándar de la clase'], ['Listo', 'Aparece «teclado USB»', 'sin instalar nada']];
        const [t, a, b] = S[p.s], dir = p.s === 0 ? 1 : p.s === 2 || p.s === 4 ? 2 : 0;
        return SV(176, `${HOST(8, 20, 'PC')}${HOST(222, 20, 'Pico')}
          ${ln('M80 32H220', dir === 0 || dir === 2 ? 'var(--ice)' : 'var(--line)', 2.5)}<path d="M220 32l-7 -4v8z" fill="var(--ice)"/>
          ${ln('M220 50H80', dir >= 1 ? 'var(--led)' : 'var(--line)', 2.5)}<path d="M80 50l7 -4v8z" fill="var(--led)"/>
          ${Array.from({ length: 7 }, (_, i) => `<circle cx="${60 + i * 30}" cy="82" r="6" fill="${i <= p.s ? 'var(--ok)' : 'var(--line)'}"/>`).join('')}
          ${tx(8, 114, `${p.s + 1}. ${t}`, 'vizbig')}${tx(8, 134, a)}${tx(8, 150, b)}
          ${tx(8, 170, 'Todo pasa en menos de un segundo')}`);
      }
    },
    /* rp36 · El informe de un teclado HID */
    rp_hidv: {
      calc: p => ({ ctrlc: p.md === 1 && p.ky === 6 ? 1 : 0, cas: p.md === 5 && p.ky === 76 ? 1 : 0, empty: !p.md && !p.ky ? 1 : 0, md: p.md }),
      svg: (p, o) => {
        const KN = { 0: '—', 4: 'A', 6: 'C', 25: 'V', 76: 'Supr' }, MN = ['Ctrl', 'Mayús', 'Alt', 'GUI'];
        const mods = MN.filter((_, i) => (p.md >> i) & 1), rep = [p.md, 0, p.ky, 0, 0, 0, 0, 0];
        const seen = o.empty ? 'nada pulsado (se sueltan las teclas)' : [...mods, p.ky ? KN[p.ky] : ''].filter(Boolean).join(' + ');
        return SV(176, `${tx(4, 18, 'Informe de teclado: 8 bytes')}${rep.map((v, i) => `<rect x="${4 + i * 37}" y="26" width="34" height="28" rx="4" fill="${i === 0 ? 'var(--ice)' : i === 2 ? 'var(--led)' : 'var(--line)'}" opacity="${i === 0 || i === 2 ? 0.85 : 0.6}"/><text x="${21 + i * 37}" y="45" font-size="11" font-weight="700" fill="${i === 0 || i === 2 ? '#fff' : 'var(--muted)'}" ${MID}>${H2(v)}</text>`).join('')}
          ${tx(4, 70, 'modif.')}${tx(78, 70, 'tecla 1')}${tx(150, 70, '… hasta 6 teclas a la vez')}
          ${MN.map((m, i) => `<rect x="${4 + i * 60}" y="80" width="56" height="20" rx="4" fill="${(p.md >> i) & 1 ? 'var(--ice)' : 'none'}" stroke="var(--ice)"/><text x="${32 + i * 60}" y="94" font-size="10" fill="${(p.md >> i) & 1 ? '#fff' : 'var(--muted)'}" ${MID}>${m} (${1 << i})</text>`).join('')}
          ${tx(4, 122, `Tecla: ${KN[p.ky]} (código ${H2(p.ky)}, una POSICIÓN, no una letra)`)}
          ${tc(4, 146, 'El PC ve: ' + seen, 'currentColor', 'vizlab')}${tx(4, 166, 'Cada informe es un estado: falta el de soltar')}`);
      }
    },
    /* rp37 · Bytes de un mensaje MIDI */
    rp_midiv: {
      calc: p => ({ st: p.tp * 16 + p.ch - 1 }),
      svg: (p, o) => {
        const TN = { 8: ['Note Off', 'nota', 'velocidad'], 9: ['Note On', 'nota', 'velocidad'], 11: ['Control Change', 'controlador', 'valor'], 14: ['Pitch bend', 'parte baja', 'parte alta'] }[p.tp];
        const byte = (x, v, lab, st) => `<rect x="${x}" y="30" width="88" height="44" rx="6" fill="${st ? 'var(--ice)' : 'var(--led)'}" opacity=".85"/><text x="${x + 44}" y="50" font-size="13" font-weight="800" fill="#fff" ${MID}>${H2(v)}</text><text x="${x + 44}" y="66" font-size="9.5" font-family="monospace" fill="#fff" ${MID}>${B8(v)}</text>${tx(x + 44, 90, lab, 'vizsm', MID)}`;
        return SV(170, `${tx(4, 20, `${TN[0]} · canal ${p.ch}`, 'vizlab')}${byte(4, o.st, 'estado', 1)}${byte(104, p.d1, TN[1] + ' ' + p.d1, 0)}${byte(204, p.d2, TN[2] + ' ' + p.d2, 0)}
          ${tx(4, 114, `Estado = tipo ${H2(p.tp, 1)} arriba · canal ${p.ch} − 1 = ${p.ch - 1} abajo`)}
          ${tx(4, 132, 'El bit 7 es 1 en el estado y 0 en los datos (0–127)')}${p.tp === 14 ? tx(4, 150, `Pitch bend de 14 bits: ${p.d2} × 128 + ${p.d1} = ${p.d2 * 128 + p.d1}`) : tx(4, 150, 'Si se pierde un byte, el siguiente estado resincroniza')}`);
      }
    },
    /* rp37 · Histéresis contra el ruido del ADC */
    rp_hystv: {
      calc: p => { let last = 0, n = 0; for (let i = 0; i < 200; i++) { const v = p.nz * RND[i]; if (Math.abs(v - last) > p.th) { n++; last = v; } } return { msgs: n, quiet20: p.nz === 20 && n === 0 ? 1 : 0 }; },
      svg: (p, o) => {
        const Y = v => 70 - v * 1.6;
        let tr = '', st = '', last = 0;
        for (let i = 0; i < 200; i++) { const v = p.nz * RND[i], x = (16 + i * 1.35).toFixed(1); tr += `${i ? 'L' : 'M'}${x} ${Y(v).toFixed(1)}`; if (Math.abs(v - last) > p.th) last = v; st += `${i ? 'L' : 'M'}${x} ${Y(last).toFixed(1)}`; }
        return SV(178, `${tx(4, 18, 'Potenciómetro quieto: el ADC tiembla')}${ln(tr, 'var(--muted)', 1)}${ln(st, 'var(--led)', 2.5)}
          ${tx(4, 132, `Ruido ±${p.nz} cuentas · margen ${p.th} cuentas`)}${tc(4, 152, `Mensajes enviados en 1 s: ${o.msgs}`, o.msgs ? 'var(--err)' : 'var(--ok)', 'vizlab')}
          ${tx(4, 168, 'Solo se acepta un valor si se aleja más que el margen')}`);
      }
    },
    /* rp38 · Conectar la Pico W sin colgarse */
    rp_wifiv: {
      calc: p => { const vis = p.red && p.bd === 0, ok = vis && p.ck ? 1 : 0; return { ok, hung: !ok && p.lm === 0 ? 1 : 0, recoverPw: !p.ck && p.lm > 0 ? 1 : 0, vis: vis ? 1 : 0 }; },
      svg: (p, o) => {
        const st = !o.vis ? 'STAT_NO_AP_FOUND' : !p.ck ? 'STAT_WRONG_PASSWORD' : 'STAT_GOT_IP';
        return SV(170, `${HOST(8, 14, 'Pico W')}${HOST(222, 14, 'router')}${ln('M80 34H220', o.ok ? 'var(--ok)' : 'var(--err)', 2.5, o.ok ? '' : 'stroke-dasharray="5 5"')}
          ${tx(150, 26, p.bd ? '5 GHz' : '2,4 GHz', 'vizsm', MID)}
          ${mono(8, 82, 'wlan.status() → ' + st, o.ok ? 'var(--ok)' : 'var(--err)', 11)}
          ${tx(8, 106, !o.vis ? (p.red ? 'La radio de la W solo ve redes de 2,4 GHz' : 'La red no está al alcance') : !p.ck ? 'La red responde, pero rechaza la clave' : 'Conectada y con IP')}
          ${tc(8, 132, o.ok ? 'El programa sigue con su trabajo' : o.hung ? 'Colgado: espera para siempre a isconnected()' : `Se rinde a los ${p.lm} s y puede reintentar luego`, o.hung ? 'var(--err)' : 'var(--ok)', 'vizlab')}
          ${tx(8, 152, p.lm ? `Espera máxima: ${p.lm} s` : 'Sin límite de espera')}`);
      }
    },
    /* rp39 · Petición y respuesta HTTP */
    rp_httpv: {
      calc: p => { const code = p.rt === 2 ? 404 : (p.rt === 3) !== (p.mt === 1) ? 405 : 200; return { code, json: p.rt === 1 && code === 200 ? 1 : 0, act: p.rt === 3 && code === 200 ? 1 : 0 }; },
      svg: (p, o) => {
        const R = ['/', '/api', '/favicon.ico', '/led'][p.rt], M = p.mt ? 'POST' : 'GET';
        const res = o.code === 404 ? ['HTTP/1.0 404 Not Found', '', '(nada que servir)'] : o.code === 405 ? ['HTTP/1.0 405 Method Not Allowed', '', `(${R} no admite ${M})`] : p.rt === 1 ? ['HTTP/1.0 200 OK', 'Content-Type: application/json', '', '{"t": 21.5, "h": 48}'] : p.rt === 3 ? ['HTTP/1.0 200 OK', 'Content-Type: text/plain', '', 'LED encendido'] : ['HTTP/1.0 200 OK', 'Content-Type: text/html', '', '<h1>Estación</h1>…'];
        return SV(196, `${tx(4, 16, 'El navegador envía:')}${TERM(4, 22, 292, 52)}${[`${M} ${R} HTTP/1.1`, 'Host: 192.168.1.40', '(línea en blanco)'].map((l, i) => mono(10, 38 + i * 15, l, i === 2 ? '#7C8AA5' : '#E8EDF5', 10.5)).join('')}
          ${tx(4, 92, 'Tu Pico responde y cierra:')}${TERM(4, 98, 292, 70)}${res.map((l, i) => mono(10, 114 + i * 15, l || '(línea en blanco)', !l ? '#7C8AA5' : i === 0 ? (o.code === 200 ? '#7CE0A3' : '#FF8A8A') : '#E8EDF5', 10.5)).join('')}
          ${tx(4, 188, o.act ? 'POST cambia algo; GET solo consulta' : 'GET consulta · las acciones, con POST')}`);
      }
    },
    /* rp40 · Una temperatura dentro de dos bytes (BLE, little-endian) */
    rp_blev: {
      calc: p => { const v = Math.round(p.T * 100), u = v & 0xFFFF; return { v, neg: v < 0 ? 1 : 0, lo: u & 255, hi: u >> 8 }; },
      svg: (p, o) => {
        const u = o.v & 0xFFFF;
        return SV(170, `${tx(4, 20, `${num(p.T, 2)} °C × 100 = ${o.v} centésimas`, 'vizlab')}${mono(4, 40, `struct.pack('<h', ${o.v})`, 'currentColor', 11)}
          ${tx(4, 62, `Entero de 16 bits con signo: ${H2(u, 4)}${o.neg ? ' (complemento a dos)' : ''}`)}
          <rect x="4" y="74" width="90" height="40" rx="6" fill="var(--led)"/><text x="49" y="99" font-size="14" font-weight="800" fill="#1B1300" ${MID}>${H2(o.lo)}</text>
          <rect x="102" y="74" width="90" height="40" rx="6" fill="var(--ice)"/><text x="147" y="99" font-size="14" font-weight="800" fill="#fff" ${MID}>${H2(o.hi)}</text>
          ${tx(49, 130, 'sale primero', 'vizsm', MID)}${tx(147, 130, 'después', 'vizsm', MID)}${tx(200, 92, '< = el byte bajo')}${tx(200, 106, 'primero (BLE)')}
          ${tx(4, 156, 'Rango: de −327,68 a 327,67 °C')}`);
      }
    },
    /* rp41 · Modos de sueño: consumo y forma de despertar */
    rp_sleepv: {
      calc: p => { const I = [20, 1.5, 1][p.md] + (p.rd ? 40 : 0), wakes = p.md === 2 && p.ws === 0 ? 0 : 1; return { I, nowake: 1 - wakes, dormOk: p.md === 2 && p.ws === 1 ? 1 : 0 }; },
      svg: (p, o) => {
        const L = v => 8 + 284 * (Math.log10(v) + 0.5) / 2.7;
        const what = ['Núcleos, relojes y periféricos en marcha', 'CPU y casi todos los relojes parados', 'Parados incluso los osciladores'][p.md];
        return SV(186, `${tx(4, 20, ['Activo', 'lightsleep', 'dormant'][p.md] + (p.rd ? ' · radio encendida' : ' · radio apagada'), 'vizlab')}${tx(4, 38, what)}
          ${fl(8, 50, 284, 18, 'var(--line)', 1, 6)}${fl(8, 50, L(o.I) - 8, 18, o.I > 10 ? 'var(--err)' : o.I > 2 ? 'var(--led)' : 'var(--ok)', 0.9, 6)}
          ${[[0.5, '0,5'], [1, '1'], [10, '10'], [100, '100']].map(([v, t]) => `${ln(`M${L(v).toFixed(1)} 46V72`, 'var(--muted)', 1)}${tx(L(v).toFixed(1), 86, t, 'vizsm', MID)}`).join('')}
          ${tc(4, 110, `Consumo de la placa (mA, escala log.): ≈ ${num(o.I, 1)} mA`, 'currentColor', 'vizlab')}
          ${tc(4, 134, o.nowake ? 'No despertará nunca: sin oscilador no cuenta el temporizador' : `Despierta con ${p.ws ? 'un flanco en un GPIO' : 'un temporizador'}`, OKC(!o.nowake), 'vizlab')}
          ${tx(4, 156, 'Valores orientativos de una Pico entera (regulador y')}${tx(4, 170, 'flash incluidos). Mide siempre la tuya.')}`);
      }
    },
    /* rp42 · Consumo medio de un aparato que duerme */
    rp_avgv: {
      calc: p => { const act = p.ia * p.ta / p.T, slp = p.is * (p.T - p.ta) / p.T, avg = act + slp; return { avg, act, slp, days: 2000 / avg / 24 }; },
      svg: (p, o) => {
        const sc = 264 / (2 * p.T), X = t => 20 + t * sc, Y = I => 90 - Math.log10(I * 100 + 1) / Math.log10(8001) * 64;
        let d = `M20 ${Y(p.is).toFixed(1)}`; for (let k = 0; k < 2; k++) { const x = X(k * p.T); d += `H${x.toFixed(1)}V${Y(p.ia).toFixed(1)}H${(x + Math.max(1.5, p.ta * sc)).toFixed(1)}V${Y(p.is).toFixed(1)}`; } d += 'H284';
        const tot = o.act + o.slp;
        return SV(196, `${tx(4, 18, `${p.ia} mA durante ${num(p.ta, 1)} s cada ${p.T} s; dormido ${num(p.is, 2)} mA`)}${ln(d, 'var(--led)', 2.5)}${ln('M20 92H284', 'var(--line)')}
          ${tx(4, 116, 'Media =')}${fl(56, 106, 232 * o.act / tot, 14, 'var(--led)')}${fl(56 + 232 * o.act / tot, 106, 232 * o.slp / tot, 14, 'var(--ice)')}
          ${tc(4, 138, `despierto ${num(o.act, 3)} + dormido ${num(o.slp, 3)} = ${num(o.avg, 3)} mA`, 'currentColor', 'vizlab')}
          ${tx(4, 160, `Con 2000 mAh: 2000 / ${num(o.avg, 3)} = ${num(2000 / o.avg, 0)} h`)}
          ${tc(4, 182, `≈ ${o.days >= 365 ? num(o.days / 365, 1) + ' años' : num(o.days, 0) + ' días'} (caso ideal)`, o.days >= 365 ? 'var(--ok)' : 'currentColor', 'vizlab')}`);
      }
    },
    /* rp43 · Condensadores de carga del cristal */
    rp_xtalv: {
      calc: p => { const cle = p.c / 2 + p.cp, err = cle - p.cl, ok = Math.abs(err) <= 1 ? 1 : 0; return { cle, err, ok, ok18: p.cl === 18 && ok ? 1 : 0 }; },
      svg: (p, o) => SV(186, `<rect x="128" y="18" width="44" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>${tx(150, 36, '12 MHz', 'vizsm', MID)}
        ${ln('M60 31H128')}${ln('M172 31H240')}${ln('M60 31V58')}${ln('M240 31V58')}${ln('M48 58H72M48 66H72')}${ln('M228 58H252M228 66H252')}${ln('M60 66V84H240V66')}${tx(150, 98, 'masa', 'vizsm', MID)}
        ${tx(38, 64, p.c + ' pF', 'vizsm', END)}${tx(262, 64, p.c + ' pF', 'vizsm')}${tx(60, 24, 'XIN', 'vizsm', MID)}${tx(240, 24, 'XOUT', 'vizsm', MID)}
        ${tx(4, 122, `El cristal ve: ${p.c} / 2 + ${p.cp} parásitos = ${num(o.cle, 1)} pF`, 'vizlab')}${tx(4, 140, `Su hoja de datos pide CL = ${p.cl} pF`)}
        ${tc(4, 162, o.ok ? 'Carga correcta: oscila a su frecuencia' : `Desviado ${num(o.err, 1)} pF: oscila desplazado`, OKC(o.ok), 'vizlab')}${tx(4, 180, 'Los dos condensadores quedan en serie: valen la mitad')}`)
    },
    /* rp44 · Puesta en marcha de tu placa */
    rp_bringv: {
      calc: p => { const v33 = p.f !== 1 ? 1 : 0, v11 = p.f !== 1 && p.f !== 2 ? 1 : 0, usb = v11 && p.f !== 3 && p.f !== 4 ? 1 : 0, sym = !usb ? 1 : p.f === 5 ? 2 : 0; return { v33, v11, sym, symGood: sym === 1 && v33 && v11 ? 1 : 0 }; },
      svg: (p, o) => {
        const F = ['ninguno', 'el regulador de 3,3 V no da tensión', 'falta un condensador de VREG_VOUT', 'el cristal no oscila', 'D+ y D− cruzadas', 'la flash está mal soldada'];
        const usb = o.sym !== 1, run = o.sym === 0;
        const step = (y, t, ok, na) => `<circle cx="16" cy="${y - 4}" r="7" fill="${na ? 'var(--line)' : ok ? 'var(--ok)' : 'var(--err)'}"/>${tx(30, y, t, na ? 'vizsm' : 'vizlab')}`;
        return SV(176, `${tx(4, 18, 'Fallo escondido: ' + F[p.f])}
          ${step(46, '1. Mides 3,3 V', o.v33)}${step(70, '2. Mides 1,1 V en DVDD', o.v11, !o.v33)}${step(94, '3. Con BOOTSEL aparece RPI-RP2', usb, !o.v11)}${step(118, '4. Grabas un UF2 y arranca', run, !usb)}
          ${tc(4, 148, ['Todo bien: placa viva', 'No aparece RPI-RP2: mira tensiones, cristal y USB', 'RPI-RP2 sí, programa no: mira la flash'][o.sym], o.sym ? 'var(--err)' : 'var(--ok)', 'vizlab')}
          ${tx(4, 168, 'El modo BOOTSEL vive en la ROM: no necesita la flash')}`);
      }
    }
  });

  /* ===================== PROYECTOS ===================== */
  const C = String.raw;
  Object.assign(PROJECTS, {
    rp_kit: {
      intro: 'Tu primera Pico de verdad: instalas MicroPython, pruebas el REPL y construyes una lámpara RGB que funciona a pilas, sin ordenador, con un botón para cambiar de modo.',
      level: 1, hours: 3,
      skills: ['Flashear MicroPython por UF2', 'PWM con duty_u16', 'Alimentar por VSYS con un diodo', 'main.py y arranque autónomo'],
      bom: ['Raspberry Pi Pico, Pico W o Pico 2 con pines soldados', 'Cable micro-USB de datos (no solo de carga)', 'LED RGB de 5 mm de cátodo común', 'Resistencias: 220 Ω (rojo) y 2 × 100 Ω (verde y azul)', 'Pulsador de 6 mm', 'Portapilas de 3 × AA con cables', 'Diodo Schottky 1N5817 o 1N5819', 'Protoboard y cables', 'Multímetro'],
      phases: [
        { title: 'Fase 1 · MicroPython en la placa', steps: ['Descarga de micropython.org el .uf2 de TU placa exacta (Pico, Pico W, Pico 2…): no son intercambiables.', 'Mantén pulsado BOOTSEL, enchufa el USB y suéltalo: aparece una unidad (RPI-RP2 en el RP2040).', 'Arrastra el .uf2 a la unidad. La placa se reinicia sola y la unidad desaparece: es normal.', 'En Thonny elige el intérprete «MicroPython (Raspberry Pi Pico)» y escribe en el REPL: print(2 ** 100).', 'Ejecuta el programa de la fase y cambia el 500 por otros valores.'],
          checks: ['El REPL responde con un número de 31 cifras', 'El LED de la placa parpadea a 1 Hz (lo cronometro: 10 parpadeos en 10 s ± 1 s)', 'Sé volver al REPL con Ctrl+C y reiniciar con Ctrl+D'],
          code: C`from machine import Pin
import time

led = Pin('LED', Pin.OUT)   # en la Pico y en la Pico W
while True:
    led.toggle()
    time.sleep_ms(500)` },
        { title: 'Fase 2 · Color con PWM', steps: ['Pata larga del LED (cátodo común) a GND. Rojo → 220 Ω → GP13; verde → 100 Ω → GP14; azul → 100 Ω → GP15.', 'GP14 y GP15 son el slice 7: comparten frecuencia, y aquí da igual porque las tres van a 1 kHz.', 'Carga el código y prueba color(255, 0, 0), color(0, 255, 0) y color(255, 120, 0) desde el REPL.', 'Mide la corriente de cada color con el multímetro en serie: no debe pasar de unos 8 mA.'],
          checks: ['Los tres colores primarios se ven por separado', 'Ninguna rama consume más de 8 mA medidos', 'He conseguido un naranja y un violeta mezclando'],
          code: C`from machine import Pin, PWM

canales = [PWM(Pin(n)) for n in (13, 14, 15)]
for c in canales:
    c.freq(1000)

def color(r, g, b):          # 0..255 cada componente
    for c, v in zip(canales, (r, g, b)):
        c.duty_u16(v * 257)  # 255 × 257 = 65535` },
        { title: 'Fase 3 · Sin ordenador', steps: ['Guarda el programa en la placa con el nombre main.py (Thonny: Archivo › Guardar como › Raspberry Pi Pico).', 'Portapilas: + → ánodo del 1N5817 → cátodo (franja) → VSYS (pata 39). − → GND (pata 38).', 'Desenchufa el USB y pon las pilas: main.py debe arrancar solo.', 'Mide la corriente total en serie con las pilas y anota cuánto duraría un pack de 2000 mAh.', 'Con el USB y las pilas conectados a la vez, mide VSYS: verás que manda la fuente más alta.'],
          checks: ['La lámpara arranca sola a pilas', 'He medido la corriente total y calculado la autonomía', 'He explicado por qué el diodo evita que el USB empuje corriente a las pilas'] },
        { title: 'Fase 4 · Botón y modos', steps: ['Pulsador entre GP16 y GND con Pin.PULL_UP.', 'Escribe tres modos: color fijo, respiración (sube y baja el brillo) y arcoíris.', 'Cambia de modo al pulsar, sin usar sleep largos: mide el tiempo con time.ticks_ms() y time.ticks_diff().', 'Ignora pulsaciones que lleguen menos de 200 ms después de la anterior (antirrebote).'],
          checks: ['Cada pulsación cambia exactamente un modo', 'La respiración no se congela al pulsar', 'Tras desconectar y reconectar las pilas arranca en el primer modo'] }
      ],
      extra: ['Guarda el último modo en un fichero para recordarlo al encender.', 'Añade una LDR en GP26 y baja el brillo cuando haya poca luz.', 'Haz que el color dependa de la temperatura del sensor interno.']
    },
    rp_chess: {
      intro: 'Un reloj de ajedrez completo: dos pulsadores grandes, pantalla OLED, incremento por jugada y zumbador al caer la bandera. Es la excusa perfecta para dominar el tiempo sin bloquear y las máquinas de estados en MicroPython.',
      level: 2, hours: 8,
      skills: ['I²C y pantallas SSD1306', 'ticks_ms y ticks_diff sin bloquear', 'Máquinas de estados', 'Antirrebote por software', 'Dibujar con framebuf'],
      bom: ['Raspberry Pi Pico', 'Pantalla OLED SSD1306 de 128 × 64 por I²C (de 3,3 V)', '2 pulsadores grandes (tipo arcade) y 1 pequeño de pausa', 'Zumbador piezoeléctrico pasivo', 'Portapilas 3 × AA y diodo 1N5817', 'Caja de madera o impresa en 3D', 'Fichero ssd1306.py de micropython-lib copiado a la placa'],
      phases: [
        { title: 'Fase 1 · La pantalla', steps: ['OLED: VCC a 3V3, GND a GND, SDA a GP4 y SCL a GP5 (I²C0).', 'Copia ssd1306.py a la placa con Thonny.', 'Ejecuta i2c.scan(): debe aparecer 60 (0x3C) o 61 (0x3D).', 'Escribe tu nombre en la pantalla con oled.text() y oled.show().'],
          checks: ['i2c.scan() devuelve la dirección de la pantalla', 'Se ve texto en las dos mitades de la pantalla'],
          code: C`from machine import Pin, I2C
from ssd1306 import SSD1306_I2C

i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400_000)
print(i2c.scan())            # [60] → 0x3C
oled = SSD1306_I2C(128, 64, i2c)
oled.text('Hola, Pico', 0, 0)
oled.show()` },
        { title: 'Fase 2 · Dos relojes que no se paran', steps: ['Pulsadores de jugador en GP10 y GP11 a GND, con PULL_UP.', 'Carga el esqueleto: cada vuelta resta al jugador activo el tiempo real transcurrido.', 'Fíjate en que no hay sleep(1): si el bucle tarda más o menos, la cuenta sigue siendo exacta porque mide el tiempo.', 'Deja el reloj corriendo 10 minutos al lado del cronómetro del móvil.'],
          checks: ['Pulsar tu botón pasa el turno al rival y nunca al revés', 'Tras 10 minutos la desviación frente al móvil es menor de 1 s'],
          code: C`import time
bot = [Pin(10, Pin.IN, Pin.PULL_UP), Pin(11, Pin.IN, Pin.PULL_UP)]
resta = [5 * 60_000, 5 * 60_000]     # ms de cada jugador
turno = None                         # None = parado; 0 o 1 = a quién le corre
antes = time.ticks_ms()

def mmss(ms):
    s = max(0, ms) // 1000
    return '{:02d}:{:02d}'.format(s // 60, s % 60)

while True:
    ahora = time.ticks_ms()
    if turno is not None:
        resta[turno] -= time.ticks_diff(ahora, antes)
    antes = ahora
    for j in (0, 1):
        if bot[j].value() == 0 and turno in (None, j):
            turno = 1 - j            # pulsas el tuyo: le toca al otro
    oled.fill(0)
    oled.text(mmss(resta[0]), 8, 28)
    oled.text(mmss(resta[1]), 80, 28)
    oled.show()
    # TODO: ¿qué pasa cuando resta llega a 0?` },
        { title: 'Fase 3 · Máquina de estados y antirrebote', steps: ['Define los estados PREPARADO, CORRIENDO, PAUSA y FIN, y dibuja en papel qué evento lleva de uno a otro.', 'El botón pequeño (GP12) pausa y reanuda; una pulsación larga (más de 2 s) reinicia.', 'Antirrebote: acepta un cambio de botón solo si lleva 30 ms estable.', 'En FIN, el jugador sin tiempo parpadea y los botones no hacen nada.'],
          checks: ['He dibujado el diagrama de estados con todas sus flechas', 'Ninguna pulsación rápida cuenta doble (lo pruebo 20 veces)', 'La pulsación larga reinicia y la corta no'] },
        { title: 'Fase 4 · Incremento, sonido y cifras grandes', steps: ['Añade incremento Fischer: +2 s al jugador que termina su jugada.', 'Al caer la bandera, pita 1 s con PWM a 2 kHz en el zumbador (GP15) y apágalo con duty_u16(0).', 'Escribe una función que dibuje cifras grandes con fill_rect (por ejemplo, de 16 × 24 píxeles).', 'Menú de configuración con el botón de pausa: 3+2, 5+0, 10+5.'],
          checks: ['Tras 10 jugadas con +2 s, cada jugador ha ganado 20 s exactos', 'El zumbador suena al llegar a 00:00 y se calla solo', 'Las cifras se leen a un metro de distancia'] },
        { title: 'Fase 5 · Caja y pilas', steps: ['Guarda todo como main.py y prueba el arranque sin ordenador.', 'Monta en la caja con los pulsadores grandes a los lados.', 'Mide el consumo con la pantalla encendida y calcula las horas de juego con 3 AA de 2000 mAh.', 'Baja el contraste de la OLED (oled.contrast()) y vuelve a medir.'],
          checks: ['Funciona a pilas dentro de la caja', 'He medido el consumo con dos contrastes distintos', 'Una partida de 10 minutos completa sin fallos'] }
      ],
      extra: ['Modo Bronstein y retardo simple.', 'Sonido de aviso cuando queden 10 s.', 'Guardar las configuraciones favoritas en un fichero JSON.']
    },
    rp_logger: {
      intro: 'Un registrador autónomo que guarda temperatura y luz cada minuto en un CSV dentro de la propia flash de la Pico. Aprenderás los límites del sensor interno, a calibrar y a no estropear ficheros al cortar la alimentación.',
      level: 2, hours: 6,
      skills: ['ADC con read_u16 y promediado', 'Sensor de temperatura interno', 'Ficheros en la flash', 'Timer con bandera', 'Calibrar con una referencia'],
      bom: ['Raspberry Pi Pico', 'LDR y resistencia de 10 kΩ', 'Pulsador', 'Termómetro de referencia (de cocina o de estación)', 'Portapilas o batería USB'],
      phases: [
        { title: 'Fase 1 · Medir bien', steps: ['Divisor: 3V3 → LDR → GP26 → 10 kΩ → AGND.', 'Lee el sensor interno con ADC(4) y la LDR con ADC(26). Haz 32 lecturas y promedia.', 'Imprime las dos medidas cada segundo y tapa la LDR con la mano.', 'Pon la Pico junto al termómetro de referencia 10 minutos sin tocarla y anota la diferencia.'],
          checks: ['La lectura de luz cambia más del 50 % al tapar la LDR', 'Promediando 32 lecturas, la temperatura baila menos de 0,5 °C', 'He anotado el desfase del sensor interno frente a la referencia'],
          code: C`from machine import ADC
sensor, ldr = ADC(4), ADC(26)
K = 3.3 / 65535

def media(adc, n=32):
    s = 0
    for _ in range(n):
        s += adc.read_u16()
    return s / n

def temperatura():
    v = media(sensor) * K
    return 27 - (v - 0.706) / 0.001721` },
        { title: 'Fase 2 · El CSV', steps: ['Crea el fichero con cabecera solo si no existe (os.stat lanza OSError si no está).', 'Añade una línea por minuto: marca de tiempo de time.time() (segundos del reloj interno), temperatura corregida con tu desfase y luz en %.', 'Abre y cierra el fichero en cada escritura: si se va la luz, como mucho pierdes una línea.', 'Calcula con os.statvfs("/") cuánto espacio libre hay y cuántos días caben a unos 20 bytes por línea.'],
          checks: ['Tras 10 minutos el fichero tiene cabecera y 10 líneas', 'He calculado los días de capacidad con el espacio libre real', 'Cortar la alimentación a lo bruto no corrompe las líneas ya escritas'],
          code: C`import os, time
NOMBRE = 'datos.csv'
try:
    os.stat(NOMBRE)
except OSError:
    with open(NOMBRE, 'w') as f:
        f.write('s,temp_C,luz_pct\n')

def guardar(t, luz):
    with open(NOMBRE, 'a') as f:
        f.write('{},{:.1f},{:.0f}\n'.format(time.time(), t, luz))` },
        { title: 'Fase 3 · Temporizador y botón', steps: ['Usa un Timer periódico de 60 s cuyo callback solo ponga una bandera a True: el trabajo se hace en el bucle principal.', 'El LED de la placa da un destello corto en cada registro.', 'Un pulsador en GP16 detiene el registro y deja el LED fijo: así sabes que puedes desconectar.', 'Explica por qué no conviene escribir en el fichero dentro del callback.'],
          checks: ['Los registros salen cada 60 s ± 1 s durante una hora', 'Tras pulsar el botón no se añaden más líneas', 'El callback no contiene ni open() ni print()'] },
        { title: 'Fase 4 · Analizar los datos', steps: ['Deja el registrador 24 horas en una habitación.', 'Descarga datos.csv con Thonny o con mpremote cp :datos.csv .', 'Haz una gráfica en una hoja de cálculo con temperatura y luz.', 'Busca el amanecer y el anochecer en la curva de luz y compáralos con la hora real.'],
          checks: ['Tengo 24 horas de datos sin huecos', 'La gráfica muestra el ciclo día/noche', 'He comentado por qué la temperatura interna sube cuando la CPU trabaja más'] }
      ],
      extra: ['Sustituye el sensor interno por un DS18B20 y compara el ruido.', 'Guarda la hora real usando el RTC: machine.RTC().datetime().', 'Rota los ficheros cada día para no tener uno gigante.']
    },
    rp_lock: {
      intro: 'Una cerradura de verdad con tarjetas de 125 kHz: lector RDM6300 por UART, lista de tarjetas en la flash, tarjeta maestra para dar de alta y un cerrojo de 12 V movido por un MOSFET. Integra niveles de tensión, cargas inductivas, protocolos serie y diseño robusto.',
      level: 3, hours: 12,
      skills: ['UART y tramas con suma de comprobación', 'Adaptar 5 V a 3,3 V', 'MOSFET y diodo de rueda libre', 'Persistencia en JSON', 'Perro guardián (WDT)'],
      bom: ['Raspberry Pi Pico', 'Lector RDM6300 (125 kHz) con su antena', 'Tarjetas o llaveros EM4100', 'Cerradura de solenoide de 12 V (o un servo SG90 para la maqueta)', 'MOSFET de nivel lógico que conduzca bien con 3,3 V (IRLZ44N o AO3400 en adaptador)', 'Diodo 1N4007 o 1N5819, resistencias de 1 kΩ, 2 kΩ, 100 Ω y 100 kΩ', 'Fuente de 12 V y 2 A y convertidor buck a 5 V', 'Zumbador y LEDs verde y rojo'],
      phases: [
        { title: 'Fase 1 · Leer tramas', steps: ['El RDM6300 va a 5 V y su TX saca 5 V: pon un divisor 1 kΩ (arriba) / 2 kΩ (abajo) antes de GP1. Así llega 3,3 V.', 'Mide con el multímetro la tensión en GP1 en reposo antes de conectarlo a la Pico.', 'Configura UART0 a 9600 baudios y muestra en hexadecimal todo lo que llega al acercar una tarjeta.', 'Identifica el byte de inicio 0x02 y el de fin 0x03: cada trama tiene 14 bytes.'],
          checks: ['La tensión en el punto medio del divisor es menor de 3,4 V', 'Veo tramas de 14 bytes que empiezan por 02 y acaban en 03', 'La misma tarjeta da siempre la misma trama'],
          code: C`from machine import UART, Pin
uart = UART(0, baudrate=9600, tx=Pin(0), rx=Pin(1))

def leer_tarjeta():
    if uart.any() < 14:
        return None
    t = uart.read(14)
    if t[0] != 0x02 or t[13] != 0x03:
        uart.read()                    # desincronizado: vacía y espera otra
        return None
    txt = t[1:13].decode()             # 10 cifras de datos + 2 de suma
    x = 0
    for i in range(0, 10, 2):
        x ^= int(txt[i:i + 2], 16)     # XOR de los 5 bytes de datos
    return txt[:10] if x == int(txt[10:12], 16) else None` },
        { title: 'Fase 2 · Lista de acceso', steps: ['Guarda las tarjetas autorizadas en tarjetas.json como una lista de cadenas.', 'Define una tarjeta maestra: al pasarla, entras en modo alta durante 10 s; la siguiente tarjeta se añade (o se borra si ya estaba).', 'Ignora la misma tarjeta si vuelve a leerse antes de 2 s: el lector repite la trama mientras la tarjeta está cerca.', 'Pita distinto para acceso concedido, denegado, alta y baja.'],
          checks: ['Doy de alta y de baja una tarjeta sin tocar el ordenador', 'La lista sobrevive a un corte de alimentación', 'Mantener la tarjeta delante no abre veinte veces'] },
        { title: 'Fase 3 · El cerrojo', steps: ['MOSFET: puerta ← 100 Ω ← GP15, y 100 kΩ de puerta a fuente para que no flote. Fuente a GND; drenador al − del solenoide; + del solenoide a 12 V.', 'Diodo en paralelo con el solenoide, cátodo (franja) al +12 V.', 'Une las masas de los 12 V y de la Pico.', 'Abre 3 s y cierra. Mide la temperatura del MOSFET tras 20 aperturas seguidas.'],
          checks: ['El solenoide abre con 3,3 V en la puerta', 'El MOSFET no pasa de templado tras 20 ciclos', 'El diodo está y sé explicar qué pasaría sin él'] },
        { title: 'Fase 4 · Robustez', steps: ['Activa un perro guardián: wdt = WDT(timeout=5000) y wdt.feed() en cada vuelta del bucle.', 'Decide qué pasa si se va la luz: con este solenoide (abierto con corriente) la puerta queda cerrada, «fallo seguro» para la seguridad.', 'Guarda un registro de accesos (tarjeta y segundos desde el arranque) y limita su tamaño.', 'Prueba a desconectar el lector en marcha: el programa no debe colgarse.'],
          checks: ['Si fuerzo un bucle infinito, la placa se reinicia sola en 5 s', 'El registro no crece más del tamaño fijado', 'He documentado qué pasa sin alimentación'] },
        { title: 'Fase 5 · Instalación y límites', steps: ['Monta el lector detrás de una tapa de plástico o madera (el metal bloquea los 125 kHz) y mide la distancia de lectura.', 'Prueba el sistema con 50 pasadas y anota fallos.', 'Escribe en la documentación que las tarjetas EM4100 se copian con aparatos baratos: sirve para un taller o un armario, no como seguridad seria.'],
          checks: ['Lee a más de 3 cm a través de la tapa', 'Menos de 1 fallo en 50 pasadas', 'He documentado las limitaciones de seguridad'] }
      ],
      extra: ['Añade un teclado numérico para exigir tarjeta + PIN.', 'Cambia a un lector de 13,56 MHz (RC522 por SPI) y compara.', 'Envía el registro por WiFi con una Pico W.']
    },
    rp_fan: {
      intro: 'Controla un ventilador de PC de 4 hilos en C con el pico-sdk: PWM de 25 kHz, lectura del tacómetro con un slice en modo contador y una curva de temperatura con histéresis. Tu primer proyecto en C de verdad.',
      level: 3, hours: 8,
      skills: ['Toolchain y CMake del pico-sdk', 'PWM por slices: wrap, divisor y polaridad', 'Slice como contador de flancos', 'ADC y NTC con la ecuación beta', 'Telemetría por USB con printf'],
      bom: ['Raspberry Pi Pico', 'Ventilador de PC de 4 hilos y 12 V', 'Fuente de 12 V y convertidor buck a 5 V (para VSYS)', 'MOSFET pequeño 2N7000 o BS170', 'Resistencias: 10 kΩ (pull-up del tacómetro), 100 Ω, 10 kΩ para la NTC', 'NTC de 10 kΩ (β ≈ 3950)', 'Protoboard'],
      phases: [
        { title: 'Fase 1 · Compilar en C', steps: ['Instala la extensión oficial de Raspberry Pi Pico para VS Code (descarga el SDK y la toolchain) o el SDK a mano.', 'Crea un proyecto, compila el ejemplo de parpadeo y arrastra el .uf2.', 'Activa stdio por USB en CMakeLists.txt y haz un printf cada segundo; ábrelo con un monitor serie.', 'Localiza el .elf y el .uf2 en la carpeta build.'],
          checks: ['Compilo sin errores desde cero', 'Veo los mensajes de printf en el monitor serie', 'Sé qué hace cada línea de mi CMakeLists.txt'] },
        { title: 'Fase 2 · PWM de 25 kHz', steps: ['El pin PWM del ventilador ya tiene pull-up dentro (a 5 V o 3,3 V): no lo conectes directo a un GPIO. Usa el 2N7000 como drenador abierto: puerta ← 100 Ω ← GP16, drenador al cable azul, fuente a GND.', 'El MOSFET invierte la señal: compénsalo con pwm_set_output_polarity.', 'No supongas el reloj: el código lo lee con clock_get_hz(clk_sys) y calcula el wrap (4999 a 125 MHz, 7999 a 200 MHz) con divisor 1.', 'Prueba niveles de 0 %, 30 %, 60 % y 100 % y escucha el ventilador.'],
          checks: ['Con el osciloscopio (o el multímetro en frecuencia) mido 25 kHz ± 1 %', 'Al 100 % gira a tope y al 30 % claramente más lento', 'Las masas de 12 V y de la Pico están unidas'],
          code: C`#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"

#define PIN_PWM  16   // slice 0, canal A
#define PIN_TACH 15   // slice 7, canal B: solo el canal B puede contar

int main(void) {
    stdio_init_all();
    gpio_set_function(PIN_PWM, GPIO_FUNC_PWM);
    uint s_out = pwm_gpio_to_slice_num(PIN_PWM);
    uint32_t wrap = clock_get_hz(clk_sys) / 25000 - 1;  // 4999 a 125 MHz, 7999 a 200 MHz
    pwm_set_clkdiv(s_out, 1.0f);
    pwm_set_wrap(s_out, wrap);
    pwm_set_output_polarity(s_out, true, false);   // el MOSFET invierte el canal A
    pwm_set_chan_level(s_out, PWM_CHAN_A, (wrap + 1) / 2);   // 50 %
    pwm_set_enabled(s_out, true);

    gpio_set_function(PIN_TACH, GPIO_FUNC_PWM);
    uint s_in = pwm_gpio_to_slice_num(PIN_TACH);
    pwm_config cfg = pwm_get_default_config();
    pwm_config_set_clkdiv_mode(&cfg, PWM_DIV_B_RISING);  // cuenta flancos en B
    pwm_init(s_in, &cfg, true);

    while (true) {
        pwm_set_counter(s_in, 0);
        sleep_ms(1000);
        uint rpm = pwm_get_counter(s_in) * 60 / 2;  // 2 pulsos por vuelta
        printf("%u rpm\n", rpm);
    }
}` },
        { title: 'Fase 3 · Tacómetro', steps: ['El cable verde (tacómetro) es de colector abierto: pull-up de 10 kΩ a 3V3 (nunca a 12 V) y a GP15.', 'Añade hardware_pwm a target_link_libraries si no estaba.', 'Compara las rpm medidas con las nominales del ventilador al 100 %.', 'Haz un barrido de 0 a 100 % en pasos de 10 % y apunta las rpm: verás que por debajo de cierto valor no baja más o se para.'],
          checks: ['Al 100 % mido las rpm de la etiqueta ± 10 %', 'Tengo la tabla nivel → rpm completa', 'He encontrado el nivel mínimo al que arranca de parado'] },
        { title: 'Fase 4 · Curva de temperatura', steps: ['NTC: 3V3 → 10 kΩ → GP26 → NTC → AGND.', 'Pasa la lectura a resistencia y luego a temperatura con 1/T = 1/T0 + ln(R/R0)/β (en kelvin).', 'Curva: por debajo de 30 °C, mínimo; de 30 a 50 °C, rampa; por encima, 100 %.', 'Añade histéresis de 2 °C para que no oscile en los bordes y un mínimo que garantice que no se para.'],
          checks: ['Al calentar la NTC con los dedos el ventilador acelera', 'Cerca de 30 °C no hay cambios de régimen cada segundo', 'Si desconecto la NTC (lectura imposible), el ventilador pasa al 100 % por seguridad'] },
        { title: 'Fase 5 · Telemetría y órdenes', steps: ['Cada segundo, imprime en una línea: temperatura, nivel y rpm separados por comas.', 'Lee órdenes con getchar_timeout_us(0) sin bloquear: «a» automático, «0»–«9» nivel manual.', 'Representa los datos en una hoja de cálculo durante un calentamiento.', 'Detecta ventilador bloqueado: nivel alto y 0 rpm durante 3 s → aviso.'],
          checks: ['Cambio a manual y vuelvo a automático desde el monitor serie', 'Si sujeto las aspas (con cuidado), aparece el aviso', 'Tengo una gráfica temperatura–rpm de 10 minutos'] }
      ],
      extra: ['Controla dos ventiladores con los dos canales del mismo slice.', 'Sustituye la curva por un PI que mantenga una temperatura.', 'Mide el consumo del ventilador con un INA219 por I²C.']
    },
    rp_ledmusic: {
      intro: 'Una tira de LEDs WS2812 que baila con la música: driver propio en PIO, micrófono analógico, detector de bandas de frecuencia y efectos suaves. Mezcla temporización exacta, potencia, audio y algo de procesamiento de señal.',
      level: 3, hours: 12,
      skills: ['Programar el PIO desde MicroPython', 'Alimentar tiras de LEDs con seguridad', 'Muestrear audio con ritmo fijo', 'Algoritmo de Goertzel por bandas', 'Corrección gamma y suavizado'],
      bom: ['Raspberry Pi Pico', 'Tira WS2812B de 60 LEDs (1 m)', 'Fuente de 5 V y 4 A con conector', 'Condensador de 1000 µF y 10 V', 'Resistencia de 330 Ω para la línea de datos', 'Adaptador de nivel 74AHCT125 (o 74HCT14 usando dos puertas)', 'Módulo de micrófono con MAX4466', 'Pulsador'],
      phases: [
        { title: 'Fase 1 · Driver PIO propio', steps: ['Estudia el programa: cuatro instrucciones, 10 ciclos por bit a 8 MHz (1,25 µs).', 'Calcula tú los tiempos: alto 375 ns para un 0 y 750 ns para un 1. Compruébalos con la visualización de la lección.', 'Prueba con 8 LEDs alimentados desde VBUS antes de conectar la tira entera.', 'Haz un arcoíris que se desplace.'],
          checks: ['Los 8 LEDs muestran rojo, verde y azul en el orden pedido', 'He verificado que T0H y T1H están dentro de tolerancia', 'El arcoíris se mueve sin parpadeos'],
          code: C`import rp2
from machine import Pin

@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW, out_init=rp2.PIO.OUT_LOW,
             out_shiftdir=rp2.PIO.SHIFT_LEFT, autopull=True, pull_thresh=24)
def ws2812():
    wrap_target()
    out(x, 1)        [1]   # 2 ciclos en bajo; si no hay datos espera aquí, en bajo
    set(pins, 1)     [2]   # 3 ciclos en alto: el comienzo de todo bit
    mov(pins, x)     [2]   # 3 ciclos: alto si el bit es 1, bajo si es 0
    set(pins, 0)     [1]   # 2 ciclos en bajo
    wrap()

pin = Pin(22)
sm = rp2.StateMachine(0, ws2812, freq=8_000_000, set_base=pin, out_base=pin)
sm.active(1)

def mostrar(colores):              # lista de (r, g, b)
    for r, g, b in colores:
        sm.put((g << 16) | (r << 8) | b, 8)   # GRB en los 24 bits altos` },
        { title: 'Fase 2 · Potencia y nivel lógico', steps: ['Cada LED puede tirar unos 60 mA en blanco a tope: 60 LEDs son 3,6 A. Calcula tu fuente con margen.', 'Alimenta la tira desde la fuente de 5 V, no desde la Pico. Une masas. 1000 µF en la entrada de la tira.', 'La WS2812B a 5 V espera unos 3,5 V como «1»: los 3,3 V de la Pico van justos. Pasa los datos por el 74AHCT125 alimentado a 5 V y luego por 330 Ω.', 'Limita el brillo global por software al 30 % y mide la corriente con todos en blanco.'],
          checks: ['Con todos en blanco al 30 % la corriente medida coincide con mi cálculo ± 20 %', 'La tira no parpadea al tocar los cables de datos', 'El cable de 5 V no se calienta'] },
        { title: 'Fase 3 · Escuchar', steps: ['Micrófono MAX4466: VCC a 3V3, GND a AGND, salida a GP26. En silencio debe dar unos 1,65 V (mitad de alimentación).', 'Muestrea 128 valores a 8 kHz esperando con ticks_us para que el ritmo sea fijo.', 'Resta la media (la componente continua) y calcula el volumen como la media de los valores absolutos.', 'Haz un vúmetro: número de LEDs encendidos proporcional al volumen.'],
          checks: ['En silencio la lectura media está entre 28 000 y 37 000', 'Las 128 muestras tardan 16 ms ± 1 ms', 'El vúmetro sube al hablar cerca del micrófono'],
          code: C`import time, array
from machine import ADC
mic = ADC(26)
buf = array.array('f', [0] * 128)

def capturar(periodo_us=125):          # 8 kHz
    t = time.ticks_us()
    for i in range(len(buf)):
        while time.ticks_diff(time.ticks_us(), t) < 0:
            pass
        buf[i] = mic.read_u16()
        t = time.ticks_add(t, periodo_us)
    m = sum(buf) / len(buf)
    for i in range(len(buf)):
        buf[i] -= m                     # quita la continua` },
        { title: 'Fase 4 · Bandas con Goertzel', steps: ['Goertzel calcula la energía de UNA frecuencia con muy poco cálculo: perfecto para 8 bandas sin FFT completa.', 'Elige 8 frecuencias entre 100 Hz y 3 kHz (por debajo de la mitad de 8 kHz) y precalcula sus coeficientes.', 'Usa @micropython.native para acelerar la función y mide cuánto tarda cada bloque.', 'Asigna a cada banda un tramo de la tira y un color.'],
          checks: ['Un silbido agudo enciende las bandas altas y una voz grave las bajas', 'Un bloque completo (captura + 8 bandas + tira) tarda menos de 60 ms', 'Sé explicar por qué no puedo medir 5 kHz con fs = 8 kHz'],
          code: C`import math, micropython
FS, N = 8000, 128
FREQS = (120, 250, 400, 650, 1000, 1500, 2200, 3000)
COEF = [2 * math.cos(2 * math.pi * round(N * f / FS) / N) for f in FREQS]

@micropython.native
def energia(muestras, c):
    s1 = 0.0
    s2 = 0.0
    for x in muestras:
        s0 = x + c * s1 - s2
        s2 = s1
        s1 = s0
    return s1 * s1 + s2 * s2 - c * s1 * s2` },
        { title: 'Fase 5 · Que sea bonito', steps: ['Ataque rápido y caída lenta: nivel = max(nuevo, nivel × 0,85).', 'Escala logarítmica en las bandas: el oído percibe en decibelios.', 'Corrección gamma (por ejemplo, valor² / 255) para que los brillos bajos no parezcan iguales.', 'Botón para cambiar entre vúmetro, bandas y modo fuego.'],
          checks: ['Con música, la animación sigue el ritmo sin saltos bruscos', 'Los degradados se ven suaves en brillos bajos', 'Cambio de modo sin reiniciar'] }
      ],
      extra: ['Lleva el muestreo al segundo núcleo con _thread y compara la fluidez.', 'Usa una placa con firmware que incluya ulab y prueba su FFT.', 'Sincroniza dos tiras con dos máquinas de estados.']
    },
    rp_freq: {
      intro: 'Un frecuencímetro y tacómetro construido con dos máquinas PIO: una cuenta flancos y otra mide periodos con resolución de 16 ns. Lo validarás con el PWM de la propia Pico y lo usarás para medir las rpm de un motor sin tocarlo.',
      level: 3, hours: 8,
      skills: ['Diseñar programas PIO propios', 'Leer registros de la SM con exec()', 'Contar frente a medir periodo', 'Acondicionar señales con un Schmitt', 'Calibrar frente a una referencia'],
      bom: ['Raspberry Pi Pico', 'Pantalla OLED SSD1306', '74HC14 (Schmitt) y resistencia de 1 kΩ', 'Diodos de protección BAT54S', 'Sensor óptico reflexivo TCRT5000 y cinta reflectante', 'Motor pequeño con alimentación propia'],
      phases: [
        { title: 'Fase 1 · Contar flancos', steps: ['Puentea GP15 con GP16. Genera en GP15 un PWM conocido (por ejemplo, 1 kHz, 12 345 Hz y 100 kHz).', 'Carga el contador: X empieza en 0 y baja uno por flanco de subida.', 'Cada segundo, copia X al ISR con exec() y léelo. La diferencia entre lecturas son los hercios.', 'Explica por qué el programa usa jmp(x_dec) con el mismo destino en ambos casos.'],
          checks: ['Mide 1000 Hz, 12 345 Hz y 100 000 Hz con error de ± 1 Hz', 'He explicado cuántos ciclos de SM necesita cada flanco', 'Sigue midiendo bien con la CPU ocupada en otra cosa'],
          code: C`import rp2, time, machine
from machine import Pin

F = machine.freq()           # clk_sys real: 125 o 200 MHz según la versión

@rp2.asm_pio()
def flancos():
    wrap_target()
    wait(0, pin, 0)
    wait(1, pin, 0)
    jmp(x_dec, "sigue")      # resta 1 a X: salte o no, sigue en la línea siguiente
    label("sigue")
    wrap()

sm = rp2.StateMachine(0, flancos, freq=F, in_base=Pin(16, Pin.IN))
sm.exec("set(x, 0)")
sm.active(1)

def cuenta():
    sm.exec("mov(isr, x)")
    sm.exec("push()")
    return (-sm.get()) & 0xFFFFFFFF   # X = −n en 32 bits

antes = cuenta()
while True:
    time.sleep(1)
    ahora = cuenta()
    print((ahora - antes) & 0xFFFFFFFF, 'Hz')
    antes = ahora` },
        { title: 'Fase 2 · Medir periodos', steps: ['Con 1 s de puerta, a 3 Hz el error de ± 1 cuenta es del 33 %. Para frecuencias bajas, mide el periodo.', 'Carga la segunda máquina (SM 1): cuenta pasos de 2 ciclos mientras la señal está alta y luego mientras está baja.', 'f = clk_sys / (2 × pasos), es decir, 62 500 000 / pasos a 125 MHz. Lee clk_sys con machine.freq() en vez de suponerlo y calibra la pequeña constante de ciclos fijos con una señal conocida.', 'Elige automáticamente: por debajo de 1 kHz, periodo; por encima, cuenta.'],
          checks: ['A 3 Hz mido 3,00 Hz ± 0,01', 'A 50 kHz los dos métodos coinciden ± 0,1 %', 'He calibrado la constante de sobrecarga'],
          code: C`@rp2.asm_pio()
def periodo():
    wrap_target()
    wait(0, pin, 0)
    wait(1, pin, 0)              # flanco de subida: empieza
    mov(x, invert(null))         # X = 0xFFFFFFFF
    label("alto")
    jmp(x_dec, "sigue")          # cuenta un paso…
    label("sigue")
    jmp(pin, "alto")             # …mientras siga alta (2 ciclos por paso)
    label("bajo")
    jmp(pin, "fin")              # ha vuelto a subir: periodo completo
    jmp(x_dec, "bajo")           # sigue baja: cuenta (2 ciclos por paso)
    label("fin")
    mov(isr, invert(x))          # pasos = ~X
    push(noblock)
    wrap()

entrada = Pin(16, Pin.IN)
sm1 = rp2.StateMachine(1, periodo, freq=F, in_base=entrada, jmp_pin=entrada)
sm1.active(1)
print(F / 2 / sm1.get(), 'Hz')` },
        { title: 'Fase 3 · Entrada segura', steps: ['Entre la señal externa y el pin: 1 kΩ en serie, BAT54S a 3V3 y a GND, y un 74HC14 alimentado a 3,3 V.', 'El Schmitt limpia flancos lentos o ruidosos que harían contar de más.', 'Prueba con una señal senoidal lenta: sin Schmitt verás cuentas extra en cada cruce.', 'Nunca midas nada conectado a la red eléctrica: solo señales de baja tensión.'],
          checks: ['Con una senoide de 50 Hz de un transformador de baja tensión (a través de un divisor) mide 50 Hz estables', 'Sin el 74HC14, la misma señal da lecturas erráticas (lo he comprobado)', 'La entrada soporta 5 V sin dañar la Pico'] },
        { title: 'Fase 4 · Tacómetro y pantalla', steps: ['TCRT5000 apuntando a un disco con un trozo de cinta reflectante, salida al Schmitt.', 'Muestra en la OLED la frecuencia con 5 cifras significativas y las rpm (Hz × 60 / marcas por vuelta).', 'Actualiza la pantalla 4 veces por segundo como máximo para que se pueda leer.', 'Mide el motor a varias tensiones y haz una tabla.'],
          checks: ['Las rpm coinciden con un tacómetro de móvil o un estroboscopio ± 2 %', 'La pantalla no parpadea', 'Tabla tensión → rpm de al menos 5 puntos'] }
      ],
      extra: ['Usa un módulo GPS con salida 1PPS como puerta de tiempo exacta.', 'Añade un preescalador 74HC4040 para pasar de 100 MHz.', 'Mide el ciclo de trabajo además de la frecuencia.']
    },
    rp_scope: {
      intro: 'Un osciloscopio de bolsillo: el ADC captura a 500 000 muestras por segundo, el DMA llena el búfer sin la CPU y tú añades disparo, base de tiempos, etapa de entrada y pantalla. Es el proyecto que te enseña de verdad qué puede y qué no puede hacer el ADC del RP2040.',
      level: 4, hours: 18,
      skills: ['ADC con FIFO y DREQ', 'DMA de periférico a memoria', 'Disparo por software con pre-disparo', 'Etapa de entrada con operacional', 'Ping-pong con dos canales encadenados'],
      bom: ['Raspberry Pi Pico', 'Operacional rail-to-rail de 3,3 V (MCP6002)', 'Resistencias de precisión al 1 % y diodos BAT54S', 'Pantalla TFT ST7789 de 240 × 240 por SPI', 'Dos pulsadores y un encoder', 'Ordenador con Python, pyserial y matplotlib'],
      phases: [
        { title: 'Fase 1 · Captura con DMA', steps: ['Enlaza pico_stdlib, hardware_adc y hardware_dma.', 'Configura el FIFO del ADC con DREQ y adc_set_clkdiv(0): 48 MHz / 96 = 500 ksps.', 'El canal DMA lee siempre la misma dirección (el FIFO) y escribe avanzando en el búfer, a 16 bits.', 'En el PC, un script de Python envía una tecla, lee 1000 líneas, las pasa a voltios (× 3,3 / 4095) y las dibuja con 2 µs por muestra.'],
          checks: ['Con un potenciómetro en GP26 la gráfica es una recta al nivel correcto ± 50 mV', 'Con un PWM de 10 kHz de la propia Pico (filtrado o no) veo 5 periodos en 1000 muestras', 'La captura completa tarda 2 ms (lo mido con time_us_64)'],
          code: C`#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/dma.h"

#define N 1000
static uint16_t buf[N];

int main(void) {
    stdio_init_all();
    adc_init();
    adc_gpio_init(26);
    adc_select_input(0);
    adc_fifo_setup(true, true, 1, false, false); // FIFO, DREQ, umbral 1, sin bit de error, 12 bits
    adc_set_clkdiv(0);                            // seguidas: 500 ksps

    int ch = dma_claim_unused_channel(true);
    dma_channel_config c = dma_channel_get_default_config(ch);
    channel_config_set_transfer_data_size(&c, DMA_SIZE_16);
    channel_config_set_read_increment(&c, false);  // el FIFO no se mueve
    channel_config_set_write_increment(&c, true);  // el búfer sí
    channel_config_set_dreq(&c, DREQ_ADC);         // al ritmo del ADC

    while (true) {
        getchar();                                 // espera una orden del PC
        adc_fifo_drain();
        dma_channel_configure(ch, &c, buf, &adc_hw->fifo, N, true);
        adc_run(true);
        dma_channel_wait_for_finish_blocking(ch);
        adc_run(false);
        for (int i = 0; i < N; i++) printf("%u\n", buf[i]);
    }
}` },
        { title: 'Fase 2 · Disparo y base de tiempos', steps: ['Captura 2000 muestras y busca el primer cruce ascendente del nivel de disparo a partir de la muestra 200 (pre-disparo).', 'Envía al PC solo 1000 muestras alineadas con el disparo: la onda queda quieta entre capturas.', 'Base de tiempos con adc_set_clkdiv: 500, 100, 10 y 1 ksps. Calcula el divisor de cada una.', 'Modo único: congela la pantalla en el primer disparo.'],
          checks: ['Una onda periódica se ve quieta entre capturas', 'Las cuatro bases de tiempo dan el número de periodos esperado', 'El modo único captura un pulso de un pulsador'] },
        { title: 'Fase 3 · Etapa de entrada', steps: ['El ADC solo acepta 0–3,3 V. Diseña un atenuador ÷4 con desplazamiento de 1,65 V para medir ± 6 V (aprox.).', 'Usa el MCP6002 como seguidor detrás del divisor para que la impedancia vista por el ADC sea baja.', 'Protege con 1 kΩ en serie y BAT54S a los raíles.', 'Calibra: mide 0 V y +5 V de referencia y ajusta ganancia y desplazamiento en el software.', 'Seguridad: nunca a la red eléctrica ni a circuitos conectados a ella.'],
          checks: ['Con la entrada a masa, el trazo marca 0,00 V ± 0,05', 'Con +5 V marca 5,00 V ± 0,1 tras calibrar', 'Una entrada de 9 V no daña nada (la protección recorta)'] },
        { title: 'Fase 4 · Captura continua ping-pong', steps: ['Dos canales DMA encadenados: A llena el búfer 1 y lanza a B; B llena el búfer 2 y lanza a A.', 'Una interrupción de DMA avisa de qué búfer está completo; la CPU lo procesa mientras el otro se llena.', 'Mide cuánto tiempo de CPU te sobra por bloque a 500 ksps.', 'Explica qué pasa si tu procesado tarda más que el llenado de un búfer.'],
          checks: ['Capturo 10 s seguidos sin perder bloques (lo verifico con un contador de bloques)', 'He medido el margen de CPU por bloque', 'He provocado a propósito un desbordamiento y lo detecto'] },
        { title: 'Fase 5 · Pantalla e instrumento', steps: ['Dibuja la traza en la ST7789 por SPI, con cuadrícula y escala.', 'Medidas automáticas: Vpp, media y frecuencia por cruces por la media.', 'Encoder para base de tiempos y nivel de disparo.', 'Compara con un osciloscopio comercial o con el del instituto/taller.'],
          checks: ['La frecuencia medida de una señal de 1 kHz es 1000 Hz ± 1 %', 'La pantalla refresca al menos 10 veces por segundo', 'He documentado el ancho de banda útil (mitad de la frecuencia de muestreo como máximo teórico)'] }
      ],
      extra: ['Segundo canal alternando entradas con adc_set_round_robin.', 'Modo XY y FFT de 512 puntos.', 'Exportar capturas en CSV por USB.']
    },
    rp_logic: {
      intro: 'Un analizador lógico de 8 canales a decenas de millones de muestras por segundo: una máquina PIO toma una foto de los pines en cada ciclo y el DMA la vuelca a la RAM. Luego conviertes la captura a VCD y la abres en PulseView para decodificar I²C, SPI o UART.',
      level: 4, hours: 18,
      skills: ['Captura en paralelo con in pins', 'Autopush y FIFO unidos', 'DMA desde el FIFO de RX del PIO', 'Formato VCD y PulseView', 'Buffers 74LVC245 tolerantes a 5 V'],
      bom: ['Raspberry Pi Pico (otra Pico como generador de señales de prueba)', 'Buffer 74LVC245 (entradas tolerantes a 5 V)', 'Cables con pinzas de prueba', 'Ordenador con Python y PulseView (sigrok)'],
      phases: [
        { title: 'Fase 1 · El programa de captura', steps: ['Escribe captura.pio y añádelo con pico_generate_pio_header en CMake.', 'Desplazamiento con autopush a 32 bits: cada palabra guarda 4 muestras de 8 canales.', 'Une los FIFO (solo RX): 8 palabras de cola en lugar de 4.', 'Lee tu clk_sys con clock_get_hz(clk_sys) (125 MHz en SDK antiguos, 200 MHz en los recientes) y calcula el divisor para 1, 10 y 25 Msps.'],
          checks: ['El proyecto compila y genera captura.pio.h', 'He calculado los tres divisores', 'He calculado cuántos milisegundos caben en 200 KB a cada velocidad'],
          code: C`; captura.pio
.program captura
    wait 1 pin 0          ; disparo sencillo: espera a que el canal 0 suba
.wrap_target
    in pins, 8            ; una foto de 8 canales por ciclo
.wrap

// main.c (fragmento)
uint off = pio_add_program(pio0, &captura_program);
pio_sm_config c = captura_program_get_default_config(off);
sm_config_set_in_pins(&c, BASE);                 // GP BASE..BASE+7
sm_config_set_in_shift(&c, false, true, 32);     // izquierda, autopush, 32 bits
sm_config_set_fifo_join(&c, PIO_FIFO_JOIN_RX);
sm_config_set_clkdiv(&c, divisor);
pio_sm_init(pio0, SM, off, &c);` },
        { title: 'Fase 2 · DMA hasta la RAM', steps: ['Reserva 50 000 palabras (200 KB): 200 000 muestras.', 'Canal DMA: lee de pio0->rxf[SM] sin avanzar, escribe en el búfer avanzando, DREQ del RX de esa SM.', 'Arranca el DMA antes que la SM, luego habilita la SM y espera a que termine.', 'Envía el búfer al PC en binario (fwrite a stdout) y comprueba el tamaño recibido.'],
          checks: ['Llegan exactamente 200 000 bytes al PC', 'A 10 Msps la captura cubre 20 ms', 'Con una señal conocida de otra Pico, los flancos caen donde deben'],
          code: C`int ch = dma_claim_unused_channel(true);
dma_channel_config d = dma_channel_get_default_config(ch);   // 32 bits por defecto
channel_config_set_read_increment(&d, false);
channel_config_set_write_increment(&d, true);
channel_config_set_dreq(&d, pio_get_dreq(pio0, SM, false));  // false = RX
dma_channel_configure(ch, &d, buf, &pio0->rxf[SM], N_PALABRAS, true);
pio_sm_set_enabled(pio0, SM, true);
dma_channel_wait_for_finish_blocking(ch);` },
        { title: 'Fase 3 · De bytes a PulseView', steps: ['En el PC, separa cada palabra en 4 muestras (con desplazamiento a la izquierda, la más antigua queda en el byte alto).', 'Escribe un VCD: cabecera con la escala de tiempo y 8 señales; luego solo los instantes en que algo cambia.', 'Ábrelo en PulseView y añade un decodificador de UART o I²C.', 'Captura el bus I²C de otra Pico leyendo una pantalla y decodifica las direcciones.'],
          checks: ['PulseView abre el VCD con la escala de tiempo correcta', 'El decodificador I²C muestra la dirección 0x3C de la pantalla', 'Un UART a 115 200 baudios se decodifica sin errores a 10 Msps'] },
        { title: 'Fase 4 · Entradas y disparos', steps: ['Pon el 74LVC245 alimentado a 3,3 V entre las pinzas y la Pico: acepta 5 V en sus entradas y protege los GPIO.', 'Disparo por patrón: espera a que varios canales coincidan comparando en software sobre un búfer circular con pre-disparo.', 'Indica en el VCD dónde fue el disparo.', 'Mide el retardo del buffer con el propio analizador.'],
          checks: ['Capturo una placa de 5 V sin dañar nada', 'El disparo por patrón captura un evento que ocurre una vez cada segundo', 'Se ven datos antes del disparo'] },
        { title: 'Fase 5 · Límites honestos', steps: ['Muestrea una señal de 5 MHz a 10 y a 25 Msps y observa la diferencia en los anchos de pulso.', 'Regla práctica: muestrea al menos 4 veces la frecuencia de la señal (mejor 10).', 'Documenta canales, frecuencia máxima, profundidad de memoria y tensiones de entrada.'],
          checks: ['He visto el efecto de muestrear demasiado lento', 'Tengo una hoja de características de mi analizador', 'He decodificado un bus real de otro proyecto'] }
      ],
      extra: ['Compatibilidad con el protocolo de sigrok para capturar desde PulseView directamente.', 'Compresión por longitud de racha para capturas más largas.', '16 canales usando dos máquinas.']
    },
    rp_siggen: {
      intro: 'Un generador de funciones con un DAC R-2R de 8 bits: el PIO saca una muestra por ciclo y dos canales DMA encadenados repiten la tabla para siempre sin la CPU. Senoidal, triangular, cuadrada y diente de sierra con frecuencia ajustable.',
      level: 4, hours: 15,
      skills: ['DAC R-2R', 'out pins de 8 bits con autopull', 'DMA encadenado que se relanza solo', 'Filtro de reconstrucción y operacional', 'Calcular tablas y frecuencias'],
      bom: ['Raspberry Pi Pico', 'Resistencias al 1 %: 9 de 2 kΩ y 7 de 1 kΩ (o 10 k/20 k)', 'Operacional MCP6002', 'Condensadores para el filtro (por ejemplo 1 nF y 10 nF)', 'Encoder rotativo y pantalla OLED', 'Conector BNC o RCA de salida'],
      phases: [
        { title: 'Fase 1 · El DAC a mano', steps: ['Monta la escalera R-2R en GP0–GP7: GP7 es el bit más significativo.', 'Desde C, escribe valores fijos con gpio_put_masked(0xFF, v) y mide la salida con el multímetro.', 'Tabla: 0, 64, 128, 192, 255. Debe salir casi 3,3 × v / 256.', 'Calcula el error de cada punto y relaciónalo con la tolerancia de las resistencias.'],
          checks: ['Los 5 puntos están a menos de 30 mV de lo ideal', 'La salida es monótona: cada valor mayor da más tensión', 'He identificado el bit más significativo'] },
        { title: 'Fase 2 · PIO al DAC', steps: ['Programa de una instrucción: out pins, 8 en bucle. Autopull a 32 bits: 4 muestras por palabra.', 'Pon los 8 pines en modo PIO con pio_gpio_init y como salidas con pio_sm_set_consistent_pindirs.', 'Rellena una tabla senoidal de 256 muestras (centrada en 128) empaquetada en 64 palabras.', 'Alimenta la SM con pio_sm_put_blocking en un bucle y mira la salida en un osciloscopio.'],
          checks: ['Se ve una senoide (escalonada) en el osciloscopio', 'Con un divisor igual a clk_sys en MHz (125 a 125 MHz, 200 a 200 MHz), cada muestra dura 1 µs y la senoide sale a 3906 Hz', 'Si la CPU se entretiene, la onda se deforma: eso justifica el DMA'],
          code: C`; dac.pio
.program dac8
.wrap_target
    out pins, 8
.wrap

// main.c (fragmento)
sm_config_set_out_pins(&c, 0, 8);               // GP0..GP7
sm_config_set_out_shift(&c, true, true, 32);    // derecha: primero el byte bajo
sm_config_set_fifo_join(&c, PIO_FIFO_JOIN_TX);
for (uint i = 0; i < 8; i++) pio_gpio_init(pio0, i);
pio_sm_set_consistent_pindirs(pio0, SM, 0, 8, true);` },
        { title: 'Fase 3 · DMA infinito', steps: ['Canal de datos: de la tabla al TX FIFO, avanzando la lectura, con DREQ del TX de la SM; al terminar, encadena al canal de control.', 'Canal de control: copia una sola palabra (la dirección de la tabla) en el registro de dirección de lectura con disparo del canal de datos.', 'Así la tabla se repite sin que la CPU intervenga.', 'Comprueba que puedes poner la CPU en un bucle infinito y la onda sigue perfecta.'],
          checks: ['La onda sigue sin interrupciones con la CPU bloqueada', 'No hay saltos visibles entre una vuelta de la tabla y la siguiente', 'Sé explicar cada uno de los dos canales'],
          code: C`static uint32_t tabla[64];                 // 256 muestras de 8 bits
static uint32_t *dir_tabla = tabla;

dma_channel_config cd = dma_channel_get_default_config(ch_datos);
channel_config_set_dreq(&cd, pio_get_dreq(pio0, SM, true));
channel_config_set_chain_to(&cd, ch_ctrl);
dma_channel_configure(ch_datos, &cd, &pio0->txf[SM], tabla, 64, false);

dma_channel_config cc = dma_channel_get_default_config(ch_ctrl);
channel_config_set_read_increment(&cc, false);
channel_config_set_write_increment(&cc, false);
dma_channel_configure(ch_ctrl, &cc,
    &dma_hw->ch[ch_datos].al3_read_addr_trig,  // escribir aquí relanza el canal de datos
    &dir_tabla, 1, false);

dma_start_channel_mask(1u << ch_datos);` },
        { title: 'Fase 4 · Filtrar y amplificar', steps: ['El escalón del DAC tiene armónicos a la frecuencia de muestreo. Pon un paso bajo RC con fc bastante por debajo de ella.', 'Detrás, el MCP6002 como seguidor para poder cargar la salida.', 'Compara en tu osciloscopio la onda antes y después del filtro.', 'Calcula fc y comprueba qué pasa con una cuadrada al filtrar demasiado.'],
          checks: ['Tras el filtro la senoide se ve lisa a 1 kHz', 'La salida no cae al conectar una carga de 10 kΩ', 'He medido la atenuación de una senoide alta cerca de fc'] },
        { title: 'Fase 5 · Instrumento', steps: ['Formas: seno, triángulo, cuadrada y sierra, cada una en su tabla.', 'Frecuencia = clk_sys / divisor / muestras por periodo. Para frecuencias altas usa tablas más cortas; para bajas, más divisor.', 'Encoder para la frecuencia y botón para la forma; muestra ambos en la OLED.', 'Mide con tu frecuencímetro PIO la exactitud de 10 Hz a 50 kHz.'],
          checks: ['Las cuatro formas salen bien en el osciloscopio', 'La frecuencia mostrada coincide con la medida ± 0,5 %', 'Cambiar de forma no produce cortes largos'] }
      ],
      extra: ['DDS con acumulador de fase para resolución de milihercios.', 'Barrido de frecuencia (chirp) para medir filtros.', 'Salida de audio estéreo con dos DAC.']
    },
    rp_balance: {
      intro: 'Un robot de dos ruedas que se mantiene de pie solo. Un núcleo lee la IMU y calcula el control a 500 Hz; el PIO genera los pulsos de los motores paso a paso. Es control realimentado de verdad, con todo lo que cuesta ajustarlo.',
      level: 5, hours: 35,
      skills: ['I²C rápido y lectura de una IMU', 'Filtro complementario', 'Control PID y su ajuste', 'Pulsos de paso con PIO', 'Reparto de trabajo entre núcleos', 'Seguridad con baterías LiPo'],
      bom: ['Raspberry Pi Pico', 'IMU MPU-6050 (placa GY-521) o similar', '2 motores paso a paso NEMA 17 y 2 drivers A4988 o DRV8825', 'Batería LiPo 3S con fusible e interruptor, y su cargador balanceador', 'Convertidor buck a 5 V para VSYS', 'Chasis (contrachapado o impreso) y ruedas de 80–90 mm', 'Condensadores de 100 µF junto a cada driver'],
      phases: [
        { title: 'Fase 1 · Leer la IMU', steps: ['I²C0 a 400 kHz en GP4/GP5. Despierta el sensor escribiendo 0 en el registro 0x6B.', 'Lee 14 bytes desde 0x3B: aceleraciones, temperatura y giros, en big-endian.', 'Con el robot quieto, promedia 500 lecturas del giróscopo: ese es su desfase, réstalo siempre.', 'A ± 2 g son 16 384 cuentas por g; a ± 250 °/s, 131 cuentas por °/s.'],
          checks: ['En reposo, la aceleración vertical marca 1 g ± 0,05', 'Tras restar el desfase, el giro en reposo es menor de 0,5 °/s', 'Leo a 500 Hz sin errores de I²C durante 1 minuto'],
          code: C`#define MPU 0x68
static void mpu_init(void) {
    uint8_t despierta[] = { 0x6B, 0x00 };          // PWR_MGMT_1 = 0
    i2c_write_blocking(i2c0, MPU, despierta, 2, false);
}
static void mpu_leer(int16_t acc[3], int16_t gir[3]) {
    uint8_t reg = 0x3B, b[14];
    i2c_write_blocking(i2c0, MPU, &reg, 1, true);  // sin STOP: sigue una lectura
    i2c_read_blocking(i2c0, MPU, b, 14, false);
    for (int i = 0; i < 3; i++) {
        acc[i] = (int16_t)(b[2 * i] << 8 | b[2 * i + 1]);
        gir[i] = (int16_t)(b[8 + 2 * i] << 8 | b[9 + 2 * i]);
    }
}` },
        { title: 'Fase 2 · El ángulo', steps: ['El acelerómetro da el ángulo absoluto pero con mucho ruido; el giróscopo da un ángulo suave pero que deriva. Mézclalos.', 'Filtro complementario a 500 Hz (dt = 2 ms) con un repeating_timer o un bucle con sleep_until.', 'Imprime el ángulo e inclina el robot a mano: debe seguir sin retraso y volver a 0 al dejarlo vertical.', 'Prueba con 0,98 y 0,995 y comenta las diferencias.'],
          checks: ['El ángulo no deriva más de 1° en 5 minutos en reposo', 'Al golpear la mesa, el ángulo apenas se altera', 'El bucle cumple su periodo de 2 ms (lo mido con time_us_64)'],
          code: C`// Cada 2 ms
float acc_ang = atan2f(acc[0], acc[2]) * 57.2958f;      // grados
float gy = (gir[1] - desfase_y) / 131.0f;               // °/s
angulo = 0.98f * (angulo + gy * DT) + 0.02f * acc_ang;` },
        { title: 'Fase 3 · Motores con PIO', steps: ['Drivers: ajusta el límite de corriente con su potenciómetro antes de conectar los motores. Nunca desconectes un motor con el driver alimentado.', 'Programa PIO de pasos: la CPU deja en la FIFO el número de ciclos entre pulsos; pull noblock reutiliza el último valor si no hay uno nuevo.', 'Una SM por motor, a 1 MHz: el periodo de paso va en microsegundos.', 'Limita la aceleración: cambia la velocidad poco a poco o los motores perderán pasos.'],
          checks: ['Cada motor gira a la velocidad pedida (cuento vueltas en 10 s)', 'Invertir el sentido con el pin DIR funciona', 'Con rampas de aceleración no pierde pasos'],
          code: C`; pasos.pio  (la SM corre a 1 MHz)
.program pasos
.wrap_target
    pull noblock        ; si hay periodo nuevo lo coge; si no, OSR = X (el anterior)
    mov x, osr
    mov y, x
    set pins, 1 [7]     ; pulso STEP de 8 µs
    set pins, 0
espera:
    jmp y-- espera      ; Y + 1 µs más en bajo
.wrap` },
        { title: 'Fase 4 · PID y núcleos', steps: ['Núcleo 0: IMU, filtro y PID cada 2 ms. Núcleo 1: telemetría y órdenes. Pasa datos por la FIFO entre núcleos.', 'Salida del PID = velocidad de las ruedas. Si el ángulo supera 30°, apaga los motores (seguridad).', 'Ajuste: primero solo KP hasta que oscile, luego KD para amortiguar y por último un poco de KI.', 'Sujeta el robot con una cuerda floja por arriba durante las pruebas.'],
          checks: ['El robot se mantiene en pie 30 s en suelo liso', 'Si cae, los motores se paran solos', 'He anotado los valores de KP, KI y KD y el efecto de cada uno'] },
        { title: 'Fase 5 · Segundo lazo y mando', steps: ['Un lazo externo más lento (50 Hz) corrige la consigna de ángulo para que la velocidad media sea 0 y no se escape.', 'Añade órdenes de avanzar y girar desde el puerto serie (o por BLE con una Pico W).', 'Registra ángulo, consigna y salida y represéntalos para afinar.'],
          checks: ['Se mantiene en el sitio sin desplazarse más de 30 cm en 1 minuto', 'Avanza y gira a petición sin caerse', 'Tengo gráficas del ajuste final'] },
        { title: 'Fase 6 · Seguridad y acabado', steps: ['Fusible en la batería, interruptor general accesible y aviso de batería baja (mide su tensión con un divisor y apaga por debajo de 3,3 V por celda).', 'Carga la LiPo solo con cargador balanceador, nunca desatendida, sobre superficie no inflamable.', 'Documenta el montaje con fotos y esquema.'],
          checks: ['El aviso de batería baja funciona', 'El fusible está dimensionado y lo sé justificar', 'La documentación permite a otra persona montarlo'] }
      ],
      extra: ['Filtro de Kalman y comparación con el complementario.', 'Control por velocidad de ruedas con encoders en motores DC.', 'Seguir una línea manteniendo el equilibrio.']
    },
    rp_macro: {
      intro: 'Un macroteclado USB de 9 teclas y una rueda de volumen. El ordenador lo ve como un teclado normal: sin drivers. Atajos, macros de texto y control multimedia con TinyUSB y el pico-sdk.',
      level: 3, hours: 12,
      skills: ['TinyUSB en modo dispositivo', 'Descriptores y clases HID', 'Matriz de teclas con diodos', 'Informes de teclado y multimedia', 'Decodificar un encoder rotativo'],
      bom: ['Raspberry Pi Pico', '9 interruptores mecánicos tipo MX con sus teclas', '9 diodos 1N4148', 'Encoder rotativo EC11 con pulsador', 'Placa de montaje (impresa, contrachapado o PCB propia)', 'Cable USB'],
      phases: [
        { title: 'Fase 1 · El ejemplo HID', steps: ['Copia el ejemplo dev_hid_composite de pico-examples a una carpeta nueva y compílalo sin cambios.', 'Al enchufarlo, el sistema debe detectar un teclado y un ratón HID (míralo en el administrador de dispositivos o con lsusb).', 'Localiza en el código: la configuración de TinyUSB (tusb_config.h), los descriptores (usb_descriptors.c) y dónde se envían los informes.', 'Llama a tud_task() muy a menudo: si tu bucle se bloquea, el USB deja de responder.'],
          checks: ['El ordenador reconoce el dispositivo sin instalar nada', 'Sé dónde están el VID, el PID y el nombre del producto', 'He cambiado el nombre del producto y lo veo al enchufar'] },
        { title: 'Fase 2 · Matriz de teclas', steps: ['3 filas (GP2–GP4) como salidas en alto y 3 columnas (GP5–GP7) como entradas con pull-up.', 'Un diodo por tecla, con el cátodo (franja) hacia la fila: evita teclas fantasma al pulsar varias.', 'Escanea cada 1 ms y aplica antirrebote: una tecla cambia de estado si lleva 5 lecturas iguales.', 'Imprime la máscara de teclas para comprobar el cableado.'],
          checks: ['Cada tecla enciende su bit y solo el suyo', 'Pulsando tres teclas en L no aparece una cuarta fantasma', 'Ninguna pulsación rebota (lo pruebo 50 veces)'],
          code: C`static const uint FILAS[3] = { 2, 3, 4 };
static const uint COLS[3]  = { 5, 6, 7 };

static uint16_t escanear(void) {           // bit f*3+c = tecla pulsada
    uint16_t m = 0;
    for (int f = 0; f < 3; f++) {
        gpio_put(FILAS[f], 0);             // activa la fila
        sleep_us(5);                       // deja asentarse las líneas
        for (int c = 0; c < 3; c++)
            if (!gpio_get(COLS[c])) m |= 1u << (f * 3 + c);
        gpio_put(FILAS[f], 1);
    }
    return m;
}` },
        { title: 'Fase 3 · Atajos', steps: ['Asocia cada tecla a un atajo: Ctrl+C, Ctrl+V, Ctrl+Z, Alt+Tab…', 'Al pulsar, envía un informe con el modificador y la tecla; al soltar, un informe vacío.', 'Espera a tud_hid_ready() antes de enviar: no se puede mandar otro informe hasta que salga el anterior.', 'Macros de texto: escribe una frase enviando una tecla, luego vacío, luego la siguiente.'],
          checks: ['Los 9 atajos funcionan en el editor de texto', 'Ninguna tecla se queda «pegada»', 'Una macro escribe una frase de 20 caracteres sin perder letras'],
          code: C`static void enviar_atajo(uint8_t mod, uint8_t tecla) {
    uint8_t teclas[6] = { tecla, 0, 0, 0, 0, 0 };
    if (tud_hid_ready())
        tud_hid_keyboard_report(REPORT_ID_KEYBOARD, mod, teclas);
}
// al pulsar:  enviar_atajo(KEYBOARD_MODIFIER_LEFTCTRL, HID_KEY_C);
// al soltar:  tud_hid_keyboard_report(REPORT_ID_KEYBOARD, 0, NULL);` },
        { title: 'Fase 4 · Rueda de volumen', steps: ['El encoder da dos señales desfasadas (A y B). El orden en que cambian indica el sentido.', 'Decodifica con una tabla de transiciones de 16 entradas: descarta las transiciones imposibles (rebotes).', 'Cada paso envía un informe de control multimedia: subir o bajar volumen, y luego el informe vacío.', 'El pulsador del encoder: silencio.'],
          checks: ['Girar un paso cambia el volumen un paso, en el sentido correcto', 'Girar rápido no invierte el sentido', 'El pulsador silencia y vuelve a activar el sonido'] },
        { title: 'Fase 5 · Capas y acabado', steps: ['Mantener una tecla cambia a una segunda capa de atajos.', 'Indica la capa con el LED de la placa o con LEDs por tecla.', 'Si lo vas a publicar o vender, no uses VID/PID ajenos: Raspberry Pi concede PID gratuitos bajo su VID para proyectos con sus chips.', 'Monta la caja y prueba en Windows, Linux y macOS si puedes.'],
          checks: ['Las dos capas funcionan', 'Funciona en al menos dos sistemas operativos', 'He documentado el mapa de teclas'] }
      ],
      extra: ['LEDs WS2812 por tecla con el driver PIO del módulo 5.', 'Configuración de atajos desde el PC por un puerto CDC añadido.', 'Tu propia PCB para el teclado.']
    },
    rp_midi: {
      intro: 'Un controlador MIDI USB con 8 potenciómetros y 8 pulsadores que cualquier programa de música reconoce al enchufarlo. Multiplexor analógico, filtrado con histéresis y mensajes MIDI construidos byte a byte.',
      level: 3, hours: 12,
      skills: ['Clase MIDI de USB con TinyUSB', 'Multiplexor analógico 74HC4051', 'Filtrar potenciómetros sin temblores', 'Mensajes Control Change y Note On/Off', 'MIDI de 5 pines por UART'],
      bom: ['Raspberry Pi Pico', '8 potenciómetros lineales de 10 kΩ', 'Multiplexor 74HC4051', '8 pulsadores', 'Caja y botones de potenciómetro', 'Opcional: conector DIN de 5 pines y resistencias de 33 Ω y 10 Ω'],
      phases: [
        { title: 'Fase 1 · Dispositivo MIDI', steps: ['Parte del ejemplo midi_test de TinyUSB adaptado al pico-sdk: tusb_config.h con CFG_TUD_MIDI a 1 y sus descriptores.', 'Enlaza tinyusb_device y tinyusb_board, y llama a tud_task() en cada vuelta.', 'Envía una nota cada segundo y ábrela en un monitor MIDI o en tu programa de música.', 'Mensaje Note On: 0x90 | canal, nota, velocidad. Note Off: 0x80 | canal, nota, 0.'],
          checks: ['El programa de música ve el dispositivo sin drivers', 'Se oye (o se ve en el monitor) la nota cada segundo', 'Sé construir a mano los tres bytes de un Note On'] },
        { title: 'Fase 2 · Ocho potenciómetros, un ADC', steps: ['74HC4051 a 3,3 V: salidas de selección S0–S2 en GP10–GP12, común a GP26, entradas X0–X7 a los cursores.', 'Extremos de los potenciómetros a 3V3 y AGND.', 'Tras cambiar de canal, espera unos microsegundos a que la tensión se asiente antes de leer.', 'Muestra por el puerto serie los 8 valores.'],
          checks: ['Cada potenciómetro mueve solo su valor', 'Los extremos dan menos de 40 y más de 4050', 'Sin tocar nada, los valores bailan menos de 30 cuentas'] },
        { title: 'Fase 3 · CC sin temblores', steps: ['Promedia 8 lecturas por canal.', 'Histéresis: solo considera un cambio si supera 24 cuentas respecto al último aceptado.', 'Pasa de 12 a 7 bits (0–127) y envía Control Change solo cuando el valor cambie.', 'Asigna los CC 20 a 27 (libres en la norma) y prueba el «MIDI learn» de tu programa.'],
          checks: ['En reposo no se envía ningún mensaje (lo veo en el monitor MIDI)', 'Cada potenciómetro recorre 0 a 127 completo', 'He asignado un potenciómetro al volumen de una pista'],
          code: C`#define S0 10                          // S0..S2 en GP10..GP12
static uint16_t ultimo[8];
static uint8_t  enviado[8];

static void leer_potes(void) {
    for (uint i = 0; i < 8; i++) {
        gpio_put_masked(7u << S0, i << S0);       // canal i del multiplexor
        sleep_us(20);                             // asentamiento
        uint32_t s = 0;
        for (int k = 0; k < 8; k++) s += adc_read();
        uint16_t v = s / 8;
        if (abs((int)v - (int)ultimo[i]) > 24) {  // histéresis
            ultimo[i] = v;
            uint8_t cc = v >> 5;                  // 12 bits → 0..127
            if (cc != enviado[i] && tud_midi_mounted()) {
                uint8_t msg[3] = { 0xB0, 20 + i, cc };   // CC en el canal 1
                tud_midi_stream_write(0, msg, 3);
                enviado[i] = cc;
            }
        }
    }
}` },
        { title: 'Fase 4 · Pulsadores como notas', steps: ['8 pulsadores con antirrebote: Note On al pulsar y Note Off al soltar.', 'Un pulsador de función cambia de octava.', 'Comprueba que no se queda ninguna nota colgada al cambiar de octava con una tecla pulsada (envía el Off de la nota original).'],
          checks: ['Toco una escala en un sintetizador virtual', 'No quedan notas colgadas en ningún caso', 'El cambio de octava funciona'] },
        { title: 'Fase 5 · MIDI clásico de 5 pines', steps: ['El MIDI de cable DIN es un UART a 31 250 baudios.', 'Con 3,3 V: pin 4 del DIN a 3V3 por 33 Ω y pin 5 al TX por 10 Ω (valores de la recomendación MIDI para 3,3 V).', 'Envía los mismos mensajes por UART y por USB a la vez.', 'Pruébalo con un sintetizador o una interfaz MIDI.'],
          checks: ['Un aparato MIDI clásico responde a los potenciómetros', 'Los mensajes por USB y por DIN son idénticos (los comparo en el monitor)', 'He calculado el divisor del UART para 31 250 baudios'] }
      ],
      extra: ['Faders motorizados que siguen al programa.', 'Pantalla con el nombre de cada parámetro.', 'Modo de 14 bits (dos CC por control).']
    },
    rp_meteo: {
      intro: 'Una estación meteorológica con Pico W que sirve su propia página web en tu red: temperatura exterior, humedad y presión, gráficas de las últimas 24 horas y una API JSON. Robusta: se reconecta sola, se vigila con un perro guardián y guarda el histórico en la flash.',
      level: 3, hours: 14,
      skills: ['WiFi en MicroPython', 'Servidor HTTP con asyncio', 'Sensores 1-Wire e I²C', 'Gráficas SVG generadas en la placa', 'Programas que no se cuelgan'],
      bom: ['Raspberry Pi Pico W o Pico 2 W', 'Sonda DS18B20 estanca y resistencia de 4,7 kΩ', 'Sensor BME280 por I²C (ojo: el BMP280, parecido, no mide humedad)', 'Fuente USB de 5 V', 'Garita de protección contra la radiación (platos apilados) y caja estanca'],
      phases: [
        { title: 'Fase 1 · WiFi a prueba de fallos', steps: ['Guarda el nombre y la clave de tu red en secretos.py, que no compartirás nunca.', 'Fija el país con rp2.country(\'ES\') para usar los canales permitidos en España.', 'Conecta con espera limitada: si en 20 s no hay conexión, informa del estado y reintenta más tarde.', 'Muestra la IP obtenida y haz ping desde el ordenador.'],
          checks: ['La Pico W se conecta y responde al ping', 'Si apago el router y lo enciendo, vuelve a conectarse sola', 'secretos.py no aparece en ningún repositorio'],
          code: C`import network, rp2, time
from secretos import SSID, CLAVE

rp2.country('ES')
wlan = network.WLAN(network.STA_IF)

def conectar(espera_s=20):
    wlan.active(True)
    if wlan.isconnected():
        return True
    wlan.connect(SSID, CLAVE)
    t = time.ticks_ms()
    while not wlan.isconnected():
        if time.ticks_diff(time.ticks_ms(), t) > espera_s * 1000:
            print('Sin conexión, estado', wlan.status())
            return False
        time.sleep_ms(250)
    print('IP', wlan.ifconfig()[0])
    return True` },
        { title: 'Fase 2 · Sensores', steps: ['DS18B20: datos a GP22 con 4,7 kΩ a 3V3. MicroPython trae los módulos onewire y ds18x20.', 'La conversión a 12 bits tarda hasta 750 ms: en asyncio, espera con await, no con time.sleep.', 'BME280 en I²C0 (GP4/GP5) con un controlador de MicroPython; lee temperatura, humedad y presión.', 'Compara las dos temperaturas con la sonda y el BME280 juntos durante 30 minutos.'],
          checks: ['El DS18B20 da lecturas con 0,0625 °C de resolución', 'Las dos temperaturas difieren menos de 1 °C juntas', 'La presión está entre 950 y 1050 hPa (o la de tu altitud)'],
          code: C`import onewire, ds18x20, asyncio
from machine import Pin

ds = ds18x20.DS18X20(onewire.OneWire(Pin(22)))
sondas = ds.scan()

async def temp_exterior():
    ds.convert_temp()
    await asyncio.sleep_ms(750)        # 12 bits: hasta 750 ms
    return ds.read_temp(sondas[0])` },
        { title: 'Fase 3 · Servidor web', steps: ['asyncio.start_server atiende conexiones mientras otra tarea mide cada 60 s.', 'Ruta /: página HTML sencilla con los valores. Ruta /api: JSON para otros programas.', 'Salta las cabeceras de la petición leyendo líneas hasta la vacía.', 'Abre la IP desde el móvil conectado a la misma red.'],
          checks: ['La página carga en el móvil en menos de 1 s', '/api devuelve JSON válido (lo pego en un validador)', 'Mientras sirvo páginas, las medidas siguen saliendo cada 60 s'],
          code: C`import asyncio, json
ultimo = {}

async def atender(lector, escritor):
    peticion = await lector.readline()
    while (await lector.readline()) not in (b'\r\n', b''):
        pass                                       # salta las cabeceras
    if b'/api' in peticion:
        cuerpo, tipo = json.dumps(ultimo), 'application/json'
    else:
        cuerpo, tipo = pagina(ultimo), 'text/html; charset=utf-8'
    escritor.write('HTTP/1.0 200 OK\r\nContent-Type: {}\r\n\r\n'.format(tipo))
    escritor.write(cuerpo)
    await escritor.drain()
    escritor.close()
    await escritor.wait_closed()

async def principal():
    conectar()
    asyncio.create_task(medir())                   # escríbela tú: actualiza «ultimo»
    await asyncio.start_server(atender, '0.0.0.0', 80)
    while True:
        await asyncio.sleep(3600)

asyncio.run(principal())` },
        { title: 'Fase 4 · Histórico y gráficas', steps: ['Guarda en RAM las últimas 24 h con una medida cada 10 min (144 puntos) en un búfer circular.', 'Genera en la Pico un SVG con una polilínea: cada punto es «x,y» escalado al rango del día.', 'Una vez al día, añade el resumen (mín., máx., media) a un CSV en la flash.', 'Pon hora real con ntptime.settime() (da la hora UTC: suma la diferencia horaria tú).'],
          checks: ['La gráfica de 24 h se ve en el navegador', 'Tras reiniciar, el CSV de resúmenes conserva los días anteriores', 'La hora mostrada coincide con la real ± 1 min'] },
        { title: 'Fase 5 · Que no se cuelgue nunca', steps: ['Tarea vigía: cada 30 s comprueba wlan.isconnected() y reconecta si hace falta, con esperas crecientes.', 'Perro guardián: machine.WDT(timeout=8000) alimentado desde una tarea; si el planificador se bloquea, la placa se reinicia sola.', 'Captura excepciones en cada tarea y apúntalas en un fichero de errores con la hora.', 'Deja la estación una semana y revisa el registro.'],
          checks: ['Una semana sin intervención manual', 'El fichero de errores muestra reconexiones resueltas solas', 'Sé explicar qué haría el WDT si una tarea se quedara en un bucle sin await'] },
        { title: 'Fase 6 · Instalación', steps: ['La sonda exterior, a la sombra, a 1,5 m del suelo y dentro de una garita ventilada: al sol directo marcaría grados de más.', 'Electrónica en caja estanca con pasacables y bolsita de gel de sílice.', 'Compara tus datos con los de la estación oficial más cercana durante una semana.'],
          checks: ['La caja no tiene condensación tras una semana', 'Mis máximas difieren menos de 2 °C de la estación oficial (o explico por qué)', 'He documentado la instalación con fotos'] }
      ],
      extra: ['Pluviómetro de balancín contando pulsos con interrupción.', 'Enviar los datos a un servidor propio por MQTT.', 'Modo punto de acceso para configurar la WiFi desde el móvil.']
    },
    rp_node: {
      intro: 'Un termómetro de exterior con pantalla de tinta electrónica que dura meses con pilas. Medirás el consumo real de la Pico en cada modo, probarás lightsleep y dormant y acabarás cortando la alimentación por completo con un temporizador TPL5110: la tinta electrónica conserva la imagen sin corriente.',
      level: 4, hours: 15,
      skills: ['Medir consumos de µA a decenas de mA', 'lightsleep y dormant', 'Cortar la alimentación con un temporizador externo', 'Calcular y validar autonomía', 'Pantallas de tinta electrónica'],
      bom: ['Raspberry Pi Pico (sin W para este proyecto)', 'Pantalla de tinta electrónica de 2,13" por SPI (por ejemplo, la Pico-ePaper-2.13 de Waveshare)', 'Sensor de temperatura y humedad I²C de bajo consumo (SHT31 o BME280)', 'Módulo temporizador TPL5110', 'Portapilas 3 × AA o 2 × AA para LiFePO4 (una sola celda)', 'Multímetro con rango de µA (y, si puedes, un medidor de corriente con registro)'],
      phases: [
        { title: 'Fase 1 · Medir antes de optimizar', steps: ['Alimenta por VSYS desde las pilas y pon el multímetro en serie (el USB desconectado: si no, alimenta él).', 'Mide: bucle vacío en MicroPython, time.sleep(10), machine.lightsleep(10000) y con el LED de la placa encendido.', 'Anota cada valor en una tabla. Ojo con el rango del multímetro: su resistencia interna puede reiniciar la Pico en los picos.', 'Haz la cuenta: ¿cuánto duraría con 2000 mAh en cada modo?'],
          checks: ['Tengo una tabla con al menos 4 modos medidos', 'He comprobado que lightsleep consume claramente menos que time.sleep', 'Sé qué modo da la mayor autonomía y cuánta'] },
        { title: 'Fase 2 · Medir y mostrar', steps: ['Conecta el sensor por I²C y la pantalla por SPI según su documentación.', 'Programa: despertar, medir, actualizar la pantalla (tarda unos segundos), dormir 10 minutos.', 'Mide la corriente durante el refresco de la tinta: es el momento más caro.', 'Cronometra cuánto tiempo pasa despierta por ciclo.'],
          checks: ['La pantalla muestra temperatura, humedad y hora de la medida', 'He medido la corriente y la duración del refresco', 'Sin alimentación, la pantalla conserva la imagen'] },
        { title: 'Fase 3 · Dormir más hondo', steps: ['Con el pico-sdk y la biblioteca de sueño de pico-extras, prueba el modo dormant despertando con un flanco en un pin.', 'Genera ese flanco con un temporizador externo o un pulsador para medir.', 'Desactiva lo que no uses antes de dormir y mide otra vez la placa entera.', 'Fíjate en lo que ya no puedes bajar: el regulador de la placa y las fugas.'],
          checks: ['He medido el consumo en dormant de la placa completa', 'Despierta correctamente con el flanco', 'He identificado qué parte del consumo no depende del RP2040'] },
        { title: 'Fase 4 · Apagado total', steps: ['El TPL5110 corta la alimentación de la Pico con un MOSFET y la devuelve cuando vence su tiempo (que fijas con una resistencia, según la tabla de su hoja de datos).', 'Al terminar, la Pico pone a 1 la patilla DONE del TPL5110: este corta y espera al siguiente ciclo.', 'Ahora entre medidas el consumo es solo el del temporizador.', 'Asegúrate de que, si el programa falla, el TPL5110 vuelve a dar alimentación en el siguiente ciclo de todas formas.'],
          checks: ['Entre medidas mido menos de 1 µA (o el mínimo de mi multímetro)', 'El ciclo de 10 minutos se cumple ± 10 %', 'Un fallo provocado en el programa no deja el nodo muerto para siempre'] },
        { title: 'Fase 5 · Autonomía real', steps: ['Calcula la media: (corriente despierta × tiempo despierta + corriente apagada × resto) / periodo.', 'Elige pilas: alcalinas (pierden tensión poco a poco) o LiFePO4 (3,2 V muy planos, directos a VSYS).', 'Deja el nodo una semana y mide la tensión de las pilas cada día.', 'Extrapola la autonomía y compárala con tu cálculo.'],
          checks: ['He calculado la autonomía teórica en meses', 'He registrado una semana de tensiones de pila', 'La extrapolación y el cálculo coinciden en el orden de magnitud'] }
      ],
      extra: ['Añade una Pico W que envíe los datos una vez al día y calcula su coste en batería.', 'Panel solar pequeño con cargador para una celda LiFePO4.', 'Diseña una PCB sin regulador conmutado para bajar aún más el consumo.']
    },
    rp_ownboard: {
      intro: 'Diseña, fabrica, monta y pon en marcha tu propia placa con el RP2040: regulador, cristal, flash, USB-C, botones y conectores. Es el salto de usar placas a hacerlas, siguiendo la guía de diseño de hardware de Raspberry Pi.',
      level: 5, hours: 40,
      skills: ['Esquema completo de un microcontrolador', 'Elegir componentes con stock y huella', 'Rutado de QSPI, cristal y USB', 'Montaje SMD o PCBA', 'Puesta en marcha paso a paso'],
      bom: ['KiCad (gratuito)', 'RP2040 (QFN-56), flash QSPI W25Q16JV o mayor, cristal de 12 MHz (por ejemplo ABM8-272-T3)', 'Regulador LDO de 3,3 V y al menos 300 mA', 'Conector USB-C con dos resistencias de 5,1 kΩ en CC1 y CC2', 'Condensadores de 100 nF, 1 µF y 10 µF, resistencias de 27 Ω, 1 kΩ y 10 kΩ', 'Dos pulsadores (BOOTSEL y RUN) y LEDs', 'Fuente de laboratorio con límite de corriente', 'Si montas tú: estación de aire caliente, pasta de soldar, plantilla y lupa'],
      phases: [
        { title: 'Fase 1 · Esquema', steps: ['Alimentación: USB-C → LDO 3,3 V → IOVDD, USB_VDD, ADC_AVDD y VREG_VIN. El regulador interno da 1,1 V en VREG_VOUT, que va a los DVDD.', '100 nF en cada pata de alimentación, 1 µF en VREG_VIN y en VREG_VOUT.', 'Cristal de 12 MHz con sus condensadores de carga calculados para su CL y 1 kΩ en serie en XOUT.', 'Flash en las patas QSPI; BOOTSEL entre QSPI_SS y masa a través de 1 kΩ; RUN con pull-up y pulsador a masa.', 'USB: 27 Ω en serie en D+ y D−. Saca SWD (SWCLK, SWDIO, GND) a un conector.'],
          checks: ['El ERC de KiCad pasa sin errores', 'He revisado el esquema contra el diseño mínimo de la guía oficial pata a pata', 'Todas las patas sin usar están marcadas como no conectadas a propósito'] },
        { title: 'Fase 2 · Componentes', steps: ['Para cada componente: huella correcta, referencia exacta y stock en el fabricante o distribuidor.', 'Comprueba la carga del cristal (CL) en su hoja de datos y calcula sus condensadores teniendo en cuenta unos pocos pF parásitos.', 'Revisa la huella del QFN-56 con su pad central (va a masa) y la del USB-C.', 'Prepara la lista de materiales con referencias de fabricante.'],
          checks: ['Todas las huellas coinciden con las hojas de datos (lo he comprobado con la regla del fabricante)', 'Ningún componente está descatalogado', 'Tengo la BOM con precios'] },
        { title: 'Fase 3 · Rutado', steps: ['Coloca primero: RP2040 en el centro, flash pegada a sus patas QSPI, cristal pegado a XIN/XOUT, desacoplos a menos de 2 mm de cada pata.', 'Plano de masa continuo en la cara inferior; no lo cortes bajo el cristal ni bajo el USB.', 'D+ y D− juntas, paralelas y de igual longitud, lo más cortas posible.', 'Vías de masa abundantes en el pad central del RP2040. Pasa el DRC con las reglas del fabricante.'],
          checks: ['El DRC pasa sin errores', 'Las pistas QSPI miden menos de 15 mm', 'El cristal no tiene pistas de señal rápidas pasando por debajo'] },
        { title: 'Fase 4 · Fabricar y montar', steps: ['Encarga la PCB (2 capas basta; 4 capas mejoran el USB y el ruido).', 'Si montas tú: pasta con plantilla, componentes con pinzas y aire caliente; el QFN es lo más delicado.', 'Revisa al microscopio o con lupa: puentes entre patas del QFN, piezas giradas.', 'Antes de alimentar: mide resistencia entre 3V3 y GND (no debe ser casi cero).'],
          checks: ['No hay cortocircuito entre 3V3 y GND', 'La revisión visual no muestra puentes', 'He documentado cualquier corrección con fotos'] },
        { title: 'Fase 5 · Puesta en marcha', steps: ['Primera vez con fuente de laboratorio a 5 V y límite de 100 mA, por VBUS.', 'Mide 3V3 (3,2–3,4 V) y VREG_VOUT (1,1 V aprox.).', 'Conecta por USB con BOOTSEL pulsado: debe aparecer la unidad RPI-RP2.', 'Graba MicroPython y ejecuta un script que active cada GPIO por turnos mientras lo compruebas.'],
          checks: ['Las tensiones están en rango y el consumo es estable', 'La placa aparece como RPI-RP2 y acepta un UF2', 'Todos los GPIO pasan la prueba de salida y de entrada'] },
        { title: 'Fase 6 · Validar y publicar', steps: ['Prueba una hora a la frecuencia por defecto de tu SDK (compruébala con clock_get_hz(clk_sys)) con un programa que use los dos núcleos.', 'Mide el arranque con la flash a distintas temperaturas (de la nevera a la mano).', 'Escribe la documentación: esquema, BOM, errores encontrados y cambios para la versión 2.', 'Si la publicas, revisa las licencias de las bibliotecas de huellas que hayas usado.'],
          checks: ['Una hora de prueba sin cuelgues', 'Arranca bien en frío y en caliente', 'Tengo la lista de cambios para la siguiente revisión'] }
      ],
      extra: ['Versión con RP2350 (ojo: necesita su bobina para el regulador conmutado interno).', 'Añade un cargador de LiPo y un medidor de batería.', 'Usa tu placa en el proyecto final.']
    },
    rp_console: {
      intro: 'El proyecto final: una videoconsola retro completa. Vídeo VGA generado por el PIO, búfer de imagen servido por DMA, gráficos dibujados en el segundo núcleo, sonido PWM y mandos. Al acabar habrás usado casi todo lo que hace especial al RP2040.',
      level: 5, hours: 60,
      skills: ['Temporización VGA con varias máquinas PIO sincronizadas', 'DMA por líneas con encadenado', 'Reparto entre núcleos: lógica y dibujo', 'Audio PWM muestreado', 'Diseño de un juego completo', 'Integración, pruebas y documentación'],
      bom: ['Raspberry Pi Pico (o tu placa propia)', 'Conector VGA hembra (DB15 HD) y resistencias para el DAC de color (por ejemplo, 470 Ω, 1 kΩ y 2,2 kΩ por color)', 'Monitor con entrada VGA (o un conversor VGA a HDMI)', 'Mando de SNES (funciona a 3,3 V) o 6 pulsadores', 'Pequeño amplificador PAM8302 y altavoz de 8 Ω', 'Resistencias y condensadores para el filtro de audio'],
      phases: [
        { title: 'Fase 1 · Sincronismos VGA', steps: ['640 × 480 a 60 Hz: píxel de unos 25 MHz: clk_sys ÷ 5 a 125 MHz, o ÷ 8 a 200 MHz (comprueba el tuyo con clock_get_hz(clk_sys)). Línea: 640 visibles + 16 porche + 96 sincronía + 48 porche = 800 píxeles. Cuadro: 480 + 10 + 2 + 33 = 525 líneas. Ambas sincronías son negativas.', 'Máquina 0 (HSYNC) a 25 MHz (divisor = clk_sys / 25 MHz): 96 ciclos en bajo y 704 en alto, y lanza IRQ 0 en cada línea.', 'Máquina 1 (VSYNC): cuenta líneas esperando la IRQ 0: 2 en bajo y 523 en alto.', 'Arranca las dos a la vez con pio_enable_sm_mask_in_sync y pon 701 y 522 en sus FIFO.'],
          checks: ['El monitor detecta 640 × 480 a 60 Hz (lo dice su menú de información)', 'Con el osciloscopio, HSYNC mide 31,25 kHz y VSYNC unos 59,5 Hz', 'He explicado de dónde salen 701 y 522'],
          code: C`; vga.pio · 1 ciclo = 1 píxel (25 MHz)
.program hsync
    pull block              ; una vez: X de recarga = 701
.wrap_target
    set pins, 0 [31]        ; 32
    set pins, 0 [31]        ; 64
    set pins, 0 [30]        ; 95
    mov x, osr              ; 96 ciclos en bajo
    set pins, 1             ; empieza el tramo alto
alto:
    jmp x-- alto            ; 702 ciclos
    irq 0                   ; 1 + 702 + 1 = 704 en alto
.wrap

.program vsync
    pull block              ; Y de recarga = 522
.wrap_target
    set pins, 0
    wait 1 irq 0            ; 2 líneas de sincronía
    wait 1 irq 0
    set pins, 1
    mov y, osr
lineas:
    wait 1 irq 0
    jmp y-- lineas          ; 523 líneas en alto
.wrap` },
        { title: 'Fase 2 · Color y búfer de imagen', steps: ['Resolución interna 320 × 240 con 8 bits por píxel (RGB332): 76 800 bytes, caben en la RAM.', 'Tercera máquina (RGB): espera la señal de línea visible, saca 8 bits por píxel y mantiene cada uno 2 píxeles VGA; cada línea se manda dos veces.', 'DMA por líneas: un canal de datos y otro de control que le va dando la dirección de la siguiente línea.', 'DAC de color con resistencias ponderadas: comprueba que el máximo da unos 0,7 V sobre 75 Ω.'],
          checks: ['Se ven barras de colores estables', 'El blanco mide 0,6–0,75 V con el monitor conectado', 'La CPU queda libre: un bucle infinito en main no afecta a la imagen'] },
        { title: 'Fase 3 · Motor gráfico en el núcleo 1', steps: ['El núcleo 1 dibuja: fondo de baldosas (tiles) y sprites con transparencia.', 'Doble búfer o dibujo durante el retrazado vertical para evitar el parpadeo.', 'El núcleo 0 lleva la lógica del juego y manda órdenes al 1 por la FIFO entre núcleos.', 'Mide cuántos sprites puedes mover a 60 fps antes de perder cuadros.'],
          checks: ['Un sprite se mueve suave sin desgarros', 'He medido el máximo de sprites a 60 fps', 'No hay datos compartidos sin protección entre núcleos'] },
        { title: 'Fase 4 · Sonido', steps: ['PWM de 8 bits con wrap 255 y divisor 1: portadora de clk_sys / 256 (unos 488 kHz a 125 MHz), inaudible.', 'Cambia el nivel a 22 050 muestras/s con un temporizador del DMA o una interrupción periódica.', 'Filtro RC paso bajo y amplificador PAM8302 al altavoz.', 'Sintetiza efectos: onda cuadrada con barrido para saltos, ruido para explosiones.'],
          checks: ['Se oyen los efectos sin zumbido de la portadora', 'El sonido no se entrecorta cuando hay mucho dibujo', 'He calculado la fc de mi filtro'] },
        { title: 'Fase 5 · Mandos y juego', steps: ['Mando de SNES: impulso en LATCH, 16 impulsos en CLOCK y lees DATA en cada uno (el botón pulsado da 0).', 'Diseña un juego completo: menú, partida, puntuación, fin de partida y récord guardado en la flash.', 'Ajusta la dificultad con 3 personas que no lo hayan probado.', 'Elimina los cuelgues: prueba una hora de juego seguida.'],
          checks: ['Los 12 botones del mando se leen correctamente', 'El juego tiene principio, final y récord persistente', 'Una hora de juego sin cuelgues'] },
        { title: 'Fase 6 · Producto', steps: ['Haz el presupuesto de consumo y elige alimentación (USB o batería).', 'Pásalo a una PCB propia o a una placa perforada ordenada y una caja.', 'Escribe un manual y un vídeo corto de demostración.', 'Publica el código con una licencia libre y una lista de lo que aprendiste.'],
          checks: ['La consola funciona dentro de su caja sin el ordenador', 'Otra persona la ha montado o usado siguiendo tu manual', 'El código está publicado y documentado'] }
      ],
      extra: ['Mandos USB usando el RP2040 como anfitrión USB.', 'Modo dos jugadores con dos mandos.', 'Cargador de juegos desde una tarjeta microSD.']
    }
  });

  /* ===================== PARÁMETROS DE LAS VISUALIZACIONES ===================== */
  const sl = (label, val, min, max, step = 1, unit, dec = 0) => ({ label, val, min, max, step, unit, dec });
  const PWMP = (x = {}) => ({ fs: { val: 125, fixed: true }, div: { label: 'Divisor', val: 1, list: [1, 2, 4, 8, 16, 25, 64, 125, 250], dec: 0 }, wrap: { label: 'wrap', val: 255, list: [99, 255, 999, 1023, 4095, 4999, 9999, 19999, 65535], dec: 0 }, D: sl('Nivel', 50, 0, 100, 1, '%'), pc: sl('Fase correcta (0 no · 1 sí)', 0, 0, 1), ...x });
  const PLLP = () => ({ fb: sl('FBDIV', 100, 16, 320), p1: sl('POSTDIV1', 4, 1, 7), p2: sl('POSTDIV2', 4, 1, 7) });
  const PIOP = () => ({ fs: { val: 125, fixed: true }, b: sl('Byte a enviar', 65, 0, 255), div: { label: 'Divisor', val: 8, list: [1, 8, 33.9, 67.8, 135.6, 1627.6], dec: 1 } });
  const WSP = () => ({ f: { label: 'Reloj de la SM', val: 10, list: [4, 6.4, 8, 10, 12.8], unit: 'MHz', dec: 1 }, h0: sl('Ciclos en alto (bit 0)', 2, 1, 10), h1: sl('Ciclos en alto (bit 1)', 4, 1, 16), n: sl('Ciclos por bit', 8, 4, 20) });
  const DMAP = () => ({ fs: { label: 'Muestreo', val: 100, list: [10, 50, 100, 250, 500], unit: 'ksps', dec: 0 }, N: { label: 'Muestras', val: 1000, list: [256, 512, 1000, 2048, 4096], dec: 0 }, m: sl('Quién copia (0 CPU · 1 DMA)', 0, 0, 1) });
  const RACEP = (lk) => ({ d: sl('Retraso del núcleo 1', 0, 0, 6, 1, 'pasos'), lk: lk === undefined ? sl('Cerrojo (0 no · 1 sí)', 0, 0, 1) : { val: lk, fixed: true } });

  const CODE_BLINK_C = C`#include "pico/stdlib.h"

int main(void) {
    const uint LED = 15;
    gpio_init(LED);
    gpio_set_dir(LED, GPIO_OUT);
    while (true) {
        gpio_put(LED, 1);
        sleep_ms(250);
        gpio_put(LED, 0);
        sleep_ms(250);
    }
}`;
  const CODE_CMAKE = C`cmake_minimum_required(VERSION 3.13)
include(pico_sdk_import.cmake)
project(parpadeo C CXX ASM)
pico_sdk_init()
add_executable(parpadeo main.c)
target_link_libraries(parpadeo pico_stdlib)
pico_enable_stdio_usb(parpadeo 1)
pico_add_extra_outputs(parpadeo)`;
  const CODE_WS = C`@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW, out_init=rp2.PIO.OUT_LOW,
             out_shiftdir=rp2.PIO.SHIFT_LEFT, autopull=True, pull_thresh=24)
def ws2812():
    wrap_target()
    out(x, 1)        [1]
    set(pins, 1)     [2]
    mov(pins, x)     [2]
    set(pins, 0)     [1]
    wrap()`;
  const CODE_UART = C`@rp2.asm_pio(set_init=rp2.PIO.OUT_HIGH, out_init=rp2.PIO.OUT_HIGH,
             out_shiftdir=rp2.PIO.SHIFT_RIGHT)
def uart_tx():
    pull()                  # espera un byte (línea en reposo, alta)
    set(x, 7)               # 8 bits de datos
    set(pins, 0)      [7]   # bit de inicio: 8 ciclos
    label("bit")
    out(pins, 1)      [6]   # un bit de datos…
    jmp(x_dec, "bit")       # …+1 ciclo del salto = 8
    set(pins, 1)      [7]   # bit de parada: 8 ciclos`;

  /* ===================== DIBUJOS FIJOS =====================
     Para las tarjetas de las lecciones y para las explicaciones alternativas. */
  const blk = (x, y, w, h, t, col = 'currentColor', fs = 10.5, f = 'none') => `${bx(x, y, w, h, col, f)}<text x="${x + w / 2}" y="${y + h / 2 + fs * 0.36}" font-size="${fs}" fill="currentColor" ${MID}>${t}</text>`;
  const arr = (x1, y1, x2, y2, c = 'currentColor') => { const a = Math.atan2(y2 - y1, x2 - x1), h = (dx, dy) => `${(x2 + dx * Math.cos(a) - dy * Math.sin(a)).toFixed(1)} ${(y2 + dx * Math.sin(a) + dy * Math.cos(a)).toFixed(1)}`; return `${ln(`M${x1} ${y1}L${x2} ${y2}`, c, 2)}<path d="M${x2} ${y2}L${h(-8, -4)}L${h(-8, 4)}Z" fill="${c}"/>`; };
  const gnd = (x, y) => ln(`M${x - 9} ${y}H${x + 9}M${x - 6} ${y + 4}H${x + 6}M${x - 3} ${y + 8}H${x + 3}`, 'currentColor', 1.8);
  const res = (x, y, vert) => vert ? `<rect x="${x - 6}" y="${y - 14}" width="12" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>` : `<rect x="${x - 14}" y="${y - 6}" width="28" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>`;
  const cap = (x, y) => ln(`M${x - 9} ${y - 3}H${x + 9}M${x - 9} ${y + 3}H${x + 9}`, 'currentColor', 2);
  const term = (x, y, w, lines, fs = 10.5, lh = 15) => `${TERM(x, y, w, lines.length * lh + 10)}${lines.map((l, i) => mono(x + 8, y + 16 + i * lh, l[0], l[1] || '#E8EDF5', fs)).join('')}`;
  const sq = (pts, y, hgt, x0, sc, col = 'var(--led)', w = 2.5) => { let d = `M${x0} ${y + (pts[0][1] ? 0 : hgt)}`; pts.forEach(([t, v]) => { d += `H${(x0 + t * sc).toFixed(1)}V${y + (v ? 0 : hgt)}`; }); return ln(d, col, w); };

  const S = {
    chip: SV(190, `${bx(6, 8, 206, 150)}${tx(109, 172, 'RP2040', 'vizlab', MID)}
      ${blk(14, 16, 92, 30, '2 × Cortex-M0+')}${blk(112, 16, 92, 30, '264 KB de SRAM')}
      ${blk(14, 52, 58, 26, 'ROM')}${blk(78, 52, 58, 26, 'DMA')}${blk(142, 52, 62, 26, 'USB')}
      ${blk(14, 84, 58, 26, 'ADC')}${blk(78, 84, 58, 26, 'PWM')}${blk(142, 84, 62, 26, 'UART·I²C', 'currentColor', 9.5)}
      ${blk(14, 116, 190, 30, 'PIO: 2 bloques × 4 máquinas', 'var(--led)')}
      ${ln('M212 50H234')}${blk(234, 30, 60, 40, 'flash', 'var(--ice)')}${tx(264, 84, 'QSPI 2 MB', 'vizsm', MID)}
      ${ln('M212 120H234')}${blk(234, 104, 60, 32, '12 MHz')}${tx(264, 150, 'cristal', 'vizsm', MID)}
      ${tx(150, 186, 'La flash va fuera: el chip no lleva memoria de programa', 'vizsm', MID)}`),
    relay: SV(170, `${tx(4, 94, 'GPIO')}${ln('M36 90H70')}${res(84, 90)}${tx(84, 76, '1 kΩ', 'vizsm', MID)}${ln('M98 90H130')}
      <g transform="translate(150 90)">${Widgets.H.npnSym()}</g>${ln('M160 60V50')}<rect x="150" y="18" width="20" height="32" rx="3" fill="var(--ice-soft)" stroke="currentColor" stroke-width="2"/>${tx(146, 38, 'relé', 'vizsm', END)}
      ${ln('M160 18V8H220')}${tx(224, 12, '+5 V', 'vizsm')}${ln('M160 12H196V22')}<g transform="translate(196 34) rotate(-90)"><path d="M-7 -7L6 0L-7 7Z" fill="var(--led)"/><path d="M6 -7V7" stroke="var(--led)" stroke-width="2.5"/></g>${ln('M196 46V56H160')}
      ${tx(206, 34, 'diodo de', 'vizsm')}${tx(206, 48, 'rueda libre', 'vizsm')}${ln('M160 120V132')}${gnd(160, 134)}
      ${tx(4, 160, 'El pin da ≈ 1 mA a la base; el relé toma su corriente de +5 V')}`),
    add32: SV(150, `${tx(4, 18, 'Sumar dos números de 32 bits', 'vizlab')}${tx(4, 42, 'Uno (8 bits)')}
      ${['byte 0', 'byte 1 + ac.', 'byte 2 + ac.', 'byte 3 + ac.'].map((t, i) => blk(84 + i * 53, 28, 50, 22, t, 'var(--err)', 8.5)).join('')}
      ${tc(84, 70, '4 sumas encadenadas con acarreo', 'var(--err)')}${tx(4, 104, 'Pico (32 bits)')}${blk(84, 90, 209, 22, '32 bits de golpe', 'var(--ok)')}
      ${tc(84, 132, '1 sola suma', 'var(--ok)')}`),
    family: SV(180, `${tx(104, 18, 'sin radio', 'vizsm', MID)}${tx(214, 18, 'con WiFi y BLE', 'vizsm', MID)}${tx(4, 58, 'RP2040')}${tx(4, 130, 'RP2350')}
      ${blk(54, 28, 100, 54, 'Pico', 'currentColor', 13)}${blk(164, 28, 100, 54, 'Pico W', 'var(--ice)', 13)}${blk(54, 100, 100, 54, 'Pico 2', 'var(--led)', 13)}${blk(164, 100, 100, 54, 'Pico 2 W', 'var(--gem)', 13)}
      ${tx(4, 174, 'Mismo tamaño y casi el mismo pinout')}`),
    rp2350: SV(190, `${tx(4, 16, 'RP2040 (azul) frente a RP2350 (naranja)', 'vizlab')}
      ${[['SRAM (KB)', 264, 520, 520], ['bloques PIO', 2, 3, 3], ['slices PWM', 8, 12, 12], ['canales DMA', 12, 16, 16], ['reloj (MHz)', 133, 150, 150]].map(([t, a, b, m], i) => { const y = 34 + i * 30; return `${tx(4, y + 12, t)}${fl(90, y, 168 * a / m, 10, 'var(--ice)')}${fl(90, y + 12, 168, 10, 'var(--led)')}${tx(292, y + 10, String(a), 'vizsm', END)}${tx(292, y + 22, String(b), 'vizsm', END)}`; }).join('')}
      ${tx(4, 186, 'Y el RP2350 trae coma flotante y núcleos RISC-V')}`),
    wled: SV(130, `${blk(8, 30, 70, 40, 'RP2040')}${arr(78, 50, 128, 50)}${tx(103, 42, 'SPI', 'vizsm', MID)}${blk(130, 30, 84, 40, 'CYW43439', 'var(--ice)')}
      ${arr(214, 50, 252, 50)}<circle cx="266" cy="50" r="11" fill="var(--led)"/>${tx(266, 80, 'LED', 'vizsm', MID)}
      ${tx(4, 108, 'En la Pico, el LED está en GP25. En la W, la radio usa')}${tx(4, 124, 'esos pines y el LED cuelga de ella.')}`),
    pins4: SV(150, `<rect x="20" y="40" width="260" height="46" rx="6" fill="#1E7B3A"/>
      ${[['GP0', 1], ['GP1', 2], ['GND', 3], ['GP2', 4], ['GP3', 5], ['GP4', 6]].map(([t, k], i) => `<circle cx="${44 + i * 42}" cy="63" r="7" fill="${t === 'GND' ? '#111' : '#D7DEE8'}"/>${tx(44 + i * 42, 30, t, t === 'GND' ? 'vizsm' : 'vizlab', MID)}${tx(44 + i * 42, 104, 'pata ' + k, 'vizsm', MID)}`).join('')}
      ${tx(4, 130, 'Arriba, el nombre que usas en el código (GP2).')}${tx(4, 146, 'Abajo, la pata física: la 4 es GP2 porque la 3 es GND.')}`),
    i2cpairs: SV(160, `${tx(4, 16, 'I²C sale por parejas fijas que se alternan')}
      ${Array.from({ length: 6 }, (_, k) => { const b = k % 2, x = 8 + k * 48; return `${blk(x, 26, 44, 40, '', b ? 'var(--led)' : 'var(--ice)')}<text x="${x + 22}" y="43" font-size="9.5" fill="currentColor" ${MID}>GP${2 * k}·${2 * k + 1}</text><text x="${x + 22}" y="58" font-size="10" font-weight="700" fill="${b ? 'var(--led)' : 'var(--ice)'}" ${MID}>I²C${b}</text>`; }).join('')}
      ${tx(4, 92, 'Par = SDA, impar = SCL. Y así hasta GP27.')}${tx(4, 112, 'Fuera del conector (en la Pico):', 'vizlab')}
      ${tx(4, 130, 'GP23 regulador · GP24 VBUS · GP25 LED')}${tx(4, 146, 'GP29 mide VSYS / 3')}`),
    levels: SV(190, `${tx(4, 16, '5 V')}${ln('M24 12H40V30')}${res(40, 44, 1)}${tx(52, 48, '10 kΩ', 'vizsm')}${ln('M40 58V74H86')}${res(40, 88, 1)}${tx(52, 92, '15 kΩ', 'vizsm')}${ln('M40 74V74')}${ln('M40 102V112')}${gnd(40, 114)}
      <circle cx="40" cy="74" r="3.5" fill="currentColor"/>${tx(90, 78, 'GP2: 3,0 V', 'vizlab')}
      ${ln('M196 20V170', 'var(--line)')}${[[0, '0 V'], [2, '2'], [3.3, '3,3'], [5, '5 V']].map(([v, t]) => `${ln(`M192 ${170 - v * 30}h8`, 'var(--muted)', 1)}${tx(188, 174 - v * 30, t, 'vizsm', END)}`).join('')}
      ${fl(204, 170 - 3.8 * 30, 8, 3.8 * 30, 'var(--ok)', 0.5)}${tx(218, 44, 'máx. pin: 3,8 V', 'vizsm')}
      ${ln(`M196 ${170 - 3.5 * 30}H290`, 'var(--err)', 1.5, 'stroke-dasharray="3 3"')}${tc(218, 170 - 3.5 * 30 - 4, '74HC: 3,5 V', 'var(--err)', 'vizsm')}
      ${ln(`M196 ${170 - 2 * 30}H290`, 'var(--ok)', 1.5, 'stroke-dasharray="3 3"')}${tc(218, 170 - 2 * 30 - 4, '74HCT: 2 V', 'var(--ok)', 'vizsm')}
      ${tx(4, 150, 'Bajar 5 V: divisor')}${tx(4, 166, 'Subir 3,3 V: un HCT')}`),
    power: SV(196, `${blk(4, 10, 66, 26, 'VBUS 5 V')}${ln('M70 23H112')}${diode(92, 23)}${ln('M112 23V60')}
      ${blk(4, 70, 66, 26, 'batería')}${ln('M70 83H112V60')}${diode(92, 83)}<circle cx="112" cy="60" r="4" fill="currentColor"/>${tx(118, 54, 'VSYS', 'vizlab')}
      ${ln('M112 60H150')}${blk(150, 42, 76, 36, 'buck-boost', 'var(--ice)')}${ln('M226 60H250')}${tx(254, 64, '3V3', 'vizlab')}
      ${ln('M188 78V104')}${tx(188, 118, '3V3_EN a masa: apaga', 'vizsm', MID)}
      ${tx(4, 146, 'VSYS admite de 1,8 a 5,5 V; el regulador sube o')}${tx(4, 162, 'baja hasta 3,3 V. RUN a masa reinicia el RP2040.')}${tx(4, 182, '3V3(OUT) es una salida: nunca metas tensión por ahí.')}`),
    ordiode: SV(170, `${blk(4, 14, 76, 30, 'USB 4,7 V', 'var(--ok)')}${ln('M80 29H150V70')}${diode(118, 29, 'var(--ok)')}
      ${blk(4, 96, 76, 30, 'pila 3,7 V')}${ln('M80 111H150V70')}${diode(118, 111)}<circle cx="150" cy="70" r="4" fill="currentColor"/>${ln('M150 70H190')}${tx(194, 74, 'VSYS = 4,7 V', 'vizlab')}
      ${tc(194, 96, 'gana la más alta', 'var(--ok)')}${tc(102, 140, '✗ el USB no puede empujar corriente a la pila', 'var(--err)', 'vizsm', MID)}${tx(4, 162, 'Schottky: cae ≈ 0,3 V; uno de silicio, ≈ 0,7 V')}`),
    div3: SV(150, `${tx(4, 22, 'VSYS')}${ln('M38 18H70V30')}${res(70, 44, 1)}${tx(82, 48, '200 kΩ', 'vizsm')}${ln('M70 58V74')}${res(70, 88, 1)}${tx(82, 92, '100 kΩ', 'vizsm')}${ln('M70 102V112')}${gnd(70, 114)}
      <circle cx="70" cy="74" r="3.5" fill="currentColor"/>${ln('M70 74H150')}${tx(154, 78, 'GP29 = VSYS / 3', 'vizlab')}
      ${tx(150, 106, 'Así VSYS (hasta 5,5 V) nunca')}${tx(150, 122, 'supera los 3,3 V del ADC.')}${tx(4, 144, 'Para saber VSYS: tensión en GP29 × 3')}`),
    bootsel: SV(160, `${blk(8, 20, 84, 50, 'RP2040')}${ln('M92 45H190')}${tx(140, 38, 'QSPI_SS = CS', 'vizsm', MID)}${blk(190, 25, 80, 40, 'flash', 'var(--ice)')}
      ${ln('M140 45V78')}<circle cx="140" cy="45" r="3.5" fill="currentColor"/>${res(140, 92, 1)}${tx(152, 96, '1 kΩ', 'vizsm')}${ln('M140 106V116')}${ln('M128 116L148 108', 'var(--led)', 2.5)}${tx(156, 122, 'BOOTSEL', 'vizlab')}${ln('M140 118V128')}${gnd(140, 130)}
      ${tx(4, 154, 'Pulsado al arrancar: la ROM ve el CS bajo y entra en USB')}`),
    uf2: SV(150, `${tx(4, 18, 'Un bloque UF2 = 512 bytes', 'vizlab')}
      ${fl(4, 28, 32, 30, 'var(--ice)')}${fl(36, 28, 152, 30, 'var(--led)')}${fl(188, 28, 100, 30, 'var(--line)')}${fl(288, 28, 8, 30, 'var(--ice)')}
      ${tx(20, 74, 'cabecera', 'vizsm', MID)}<text x="112" y="48" font-size="11" fill="#1B1300" ${MID}>256 bytes de programa</text>${tx(238, 48, 'relleno', 'vizsm', MID)}${tx(292, 74, 'fin', 'vizsm', END)}
      ${tx(4, 96, 'La cabecera dice: a qué dirección de la flash van,')}${tx(4, 112, 'qué número de bloque es y la familia del chip.')}${tx(4, 136, 'Bloques = tamaño del programa / 256')}`),
    xip: SV(150, `${blk(6, 20, 54, 36, 'CPU')}${arr(60, 38, 84, 38)}${blk(86, 14, 90, 48, 'caché 16 KB', 'var(--ice)')}${arr(176, 38, 204, 38)}${tx(190, 30, 'QSPI', 'vizsm', MID)}${blk(206, 14, 88, 48, 'flash 2 MB')}
      ${tc(131, 80, 'acierto: al momento', 'var(--ok)', 'vizsm', MID)}${tc(250, 80, 'fallo: a la flash', 'var(--err)', 'vizsm', MID)}
      ${tx(4, 108, 'XIP = ejecutar en el sitio: el código se lee de la')}${tx(4, 124, 'flash sobre la marcha y la caché guarda lo reciente.')}${tx(4, 142, 'Un bucle que cabe en 16 KB va casi a toda velocidad.')}`),
    cache: SV(130, `${tx(4, 18, 'Un bucle de 4 KB que se repite: vueltas 1 a 8')}${Array.from({ length: 8 }, (_, k) => `<rect x="${8 + k * 36}" y="30" width="32" height="22" rx="3" fill="${k ? 'var(--ok)' : 'var(--err)'}" opacity=".8"/>${tx(24 + k * 36, 68, String(k + 1), 'vizsm', MID)}`).join('')}
      ${tc(4, 92, 'Vuelta 1: fallos, hay que traer el código de la flash', 'var(--err)')}${tc(4, 110, 'Siguientes: aciertos, el código ya está en la caché', 'var(--ok)')}`),
    erase: SV(160, `${tx(4, 16, 'La flash: sectores de 4 KB')}${Array.from({ length: 12 }, (_, k) => `<rect x="${8 + k * 24}" y="24" width="22" height="22" rx="2" fill="${k === 5 ? 'var(--err)' : 'var(--line)'}"/>`).join('')}${tc(129, 62, 'borrando', 'var(--err)', 'vizsm', MID)}
      ${blk(8, 76, 90, 30, 'núcleo 0: borra')}${blk(106, 76, 90, 30, 'núcleo 1: código', 'var(--err)')}${blk(204, 76, 90, 30, 'código en RAM', 'var(--ok)')}
      ${tc(151, 122, 'espera: no puede leer', 'var(--err)', 'vizsm', MID)}${tc(249, 122, 'sigue', 'var(--ok)', 'vizsm', MID)}
      ${tx(4, 148, 'Y cada sector aguanta unos 100 000 borrados.')}`),
    install: SV(110, `${blk(4, 14, 66, 30, '.uf2', 'currentColor', 10)}${arr(70, 29, 86, 29)}${blk(88, 14, 70, 30, 'BOOTSEL', 'var(--led)', 10)}${arr(158, 29, 174, 29)}${blk(176, 14, 52, 30, 'Thonny', 'currentColor', 10)}${arr(228, 29, 244, 29)}${blk(246, 14, 48, 30, '>>>', 'var(--ok)', 11)}
      ${tx(4, 66, 'El .uf2 de MicroPython para TU placa (no valen')}${tx(4, 82, 'los de otra). Thonny: intérprete «MicroPython')}${tx(4, 98, '(Raspberry Pi Pico)».')}`),
    repl: SV(160, `${term(4, 6, 292, [['>>> 1 + 1'], ['2', '#7CE0A3'], ['>>> 7 / 2'], ['3.5', '#7CE0A3'], ['>>> import machine'], ['>>> machine.freq()'], ['125000000   (o 200000000)', '#7CE0A3'], ['>>> _                  Ctrl+C: parar']], 10.5, 17)}`),
    bootseq: SV(176, `${[['ROM del chip', 'currentColor'], ['MicroPython (firmware en la flash)', 'currentColor'], ['monta el sistema de ficheros', 'currentColor'], ['boot.py, si existe', 'var(--ice)'], ['main.py, si existe', 'var(--led)'], ['REPL >>> (si main.py termina)', 'var(--ok)']].map(([t, c], i) => `${blk(30, 4 + i * 28, 240, 22, t, c, 10)}${i < 5 ? `<path d="M150 ${27 + i * 28}l-4 -1h8z" fill="currentColor"/>` : ''}`).join('')}`),
    types: SV(160, `${blk(4, 10, 92, 50, '', 'var(--ice)')}${tx(50, 28, 'int', 'vizlab', MID)}${mono(14, 48, '2 ** 40', 'currentColor', 10)}
      ${blk(104, 10, 92, 50, '', 'var(--led)')}${tx(150, 28, 'float', 'vizlab', MID)}${mono(116, 48, '23.5', 'currentColor', 10)}
      ${blk(204, 10, 92, 50, '', 'var(--gem)')}${tx(250, 28, 'str', 'vizlab', MID)}${mono(216, 48, "'12'", 'currentColor', 10)}
      ${tx(50, 76, 'sin límite', 'vizsm', MID)}${tx(150, 76, '32 bits: ~7 cifras', 'vizsm', MID)}${tx(250, 76, 'texto', 'vizsm', MID)}
      ${mono(4, 104, "'12' + 3       → TypeError", 'var(--err)', 10.5)}${mono(4, 122, "int('12') + 3  → 15", 'var(--ok)', 10.5)}${mono(4, 140, "f'{23.456:.1f}' → '23.5'", 'currentColor', 10.5)}`),
    indent: SV(150, `${fl(10, 24, 6, 36, 'var(--led)')}${mono(4, 18, 'if t > 30:', 'currentColor', 12)}${mono(24, 38, "print('calor')", 'currentColor', 12)}${mono(24, 56, 'ventilador.on()', 'currentColor', 12)}${mono(4, 80, "print('fin')", 'currentColor', 12)}
      ${tc(200, 46, '← dentro del if', 'var(--led)')}${tc(140, 80, '← fuera: siempre', 'var(--ok)')}
      ${tx(4, 112, 'Los dos puntos abren el bloque; la sangría (4')}${tx(4, 128, 'espacios) dice qué hay dentro; volver a la')}${tx(4, 144, 'izquierda lo cierra. Sin llaves.')}`),
    func: SV(150, `${tx(4, 26, 'media(4)')}${arr(60, 22, 96, 40)}${tx(18, 64, 'a = 4', 'vizsm')}${tx(18, 80, 'b = 10 (por defecto)', 'vizsm')}
      ${blk(98, 22, 140, 44, '', 'var(--ice)')}${mono(106, 40, 'def media(a, b=10):', 'currentColor', 9.5)}${mono(116, 56, 'return (a + b) / 2', 'currentColor', 9.5)}
      ${arr(238, 44, 268, 44)}${tx(272, 48, '7.0', 'vizlab')}
      ${tx(4, 112, 'Entran parámetros, sale lo que diga return.')}${tx(4, 128, 'return a, b devuelve una tupla: x, y = f()')}`),
    trace: SV(150, `${term(4, 6, 292, [['Traceback (most recent call last):'], ['  File "main.py", line 12, in <module>'], ['  File "sensor.py", line 5, in leer', '#FFB000'], ['ZeroDivisionError: divide by zero', '#FF8A8A']], 9.8, 16)}
      ${tc(4, 96, '↑ la línea más baja: donde saltó el error', 'var(--led)', 'vizsm')}${tc(4, 114, '↑ debajo, el tipo de error', 'var(--err)', 'vizsm')}${tx(4, 136, 'Arriba, quién llamó a quién hasta llegar ahí.')}`),
    pullup: SV(170, `${tx(4, 18, '3,3 V')}${ln('M40 14H60V24')}${res(60, 38, 1)}${tx(72, 42, '50–80 kΩ', 'vizsm')}${ln('M60 52V70H120')}<circle cx="60" cy="70" r="3.5" fill="currentColor"/>${tx(124, 74, 'GP14', 'vizlab')}
      ${ln('M60 70V86')}${ln('M48 96L68 88', 'var(--led)', 2.5)}${ln('M60 98V106')}${gnd(60, 108)}${tx(78, 100, 'pulsador', 'vizsm')}
      ${sq([[30, 1], [70, 0], [120, 1], [160, 1]], 124, 22, 120, 1)}${tx(124, 120, 'suelto 1', 'vizsm')}${tx(194, 160, 'pulsado 0', 'vizsm')}
      ${tc(184, 140, '↓ FALLING', 'var(--err)', 'vizsm', END)}${tc(246, 140, '↑ RISING', 'var(--ok)', 'vizsm')}`),
    pinmap: SV(170, `${tx(4, 16, 'Arduino', 'vizlab')}${tx(104, 16, 'MicroPython', 'vizlab')}${tx(206, 16, 'C (pico-sdk)', 'vizlab')}
      ${[['pinMode(OUTPUT)', 'Pin(n, Pin.OUT)', 'gpio_set_dir'], ['digitalWrite(1)', 'led.value(1)', 'gpio_put(n, 1)'], ['digitalRead()', 'b.value()', 'gpio_get(n)'], ['INPUT_PULLUP', 'Pin.PULL_UP', 'gpio_pull_up(n)'], ['delay(500)', 'sleep_ms(500)', 'sleep_ms(500)'], ['millis()', 'ticks_ms()', 'time_us_64()']].map((r, i) => r.map((t, j) => mono(4 + j * 101, 40 + i * 22, t, 'currentColor', 9)).join('')).join('')}`),
    jitter: SV(150, `${tx(4, 16, 'Bucle de MicroPython que cambia un pin')}${sq([[20, 1], [44, 0], [66, 1], [92, 0], [110, 1], [176, 0], [200, 1], [224, 0], [246, 1], [270, 0]], 26, 22, 10, 1, 'var(--err)')}
      ${tc(143, 62, 'pausa: el intérprete recoge basura', 'var(--err)', 'vizsm', MID)}${tx(4, 88, 'PWM o PIO: lo hace el hardware')}${sq([[24, 1], [48, 0], [72, 1], [96, 0], [120, 1], [144, 0], [168, 1], [192, 0], [216, 1], [240, 0], [264, 1]], 98, 22, 10, 1, 'var(--ok)')}
      ${tc(4, 142, 'Periodo exacto, haga lo que haga la CPU', 'var(--ok)', 'vizsm')}`),
    pwmfreq: SV(170, `${(() => { const X = f => 16 + 270 * Math.log10(f) / 7; return `${fl(X(1), 30, X(100) - X(1), 18, 'var(--err)', 0.35)}${fl(X(20), 54, X(20000) - X(20), 18, 'var(--led)', 0.35)}${fl(X(20000), 78, X(1e7) - X(20000), 18, 'var(--ok)', 0.35)}
      ${tx(X(1) + 4, 43, 'se ve parpadear')}${tx(X(20) + 4, 67, 'se puede oír (bobinas, cerámicos)')}${tx(X(20000) + 4, 91, 'ni se ve ni se oye')}
      ${[[1, '1 Hz'], [100, '100'], [1e3, '1 k'], [2e4, '20 k'], [1e6, '1 MHz']].map(([f, t]) => `${ln(`M${X(f).toFixed(1)} 100v6`, 'var(--muted)', 1)}${tx(X(f).toFixed(1), 118, t, 'vizsm', MID)}`).join('')}`; })()}
      ${tx(4, 142, 'Pero más frecuencia = menos niveles: a 125 MHz,')}${tx(4, 158, '25 kHz deja 5000 niveles y 1 MHz, solo 125.')}`),
    servo: SV(186, `${tx(4, 16, 'A 50 Hz: un pulso cada 20 ms (dibujo de 0 a 20 ms)')}${[[1, '1 ms → 0°'], [1.5, '1,5 ms → 90°'], [2, '2 ms → 180°']].map(([w, t], i) => { const y = 40 + i * 44; return `${tx(4, y - 6, t)}${sq([[0, 1], [w * 13, 0], [270, 0]], y, 18, 14, 1)}`; }).join('')}
      ${tx(4, 180, 'duty_u16 = pulso / 20 ms × 65535 (1,5 ms → 4915)')}`),
    u16: SV(140, `${tx(4, 18, 'El ADC da 12 bits: 0 … 4095')}${Array.from({ length: 6 }, (_, k) => `${blk(8 + k * 48, 26, 42, 24, String(k), 'var(--ice)', 11)}${tx(29 + k * 48, 70, String(k * 16), 'vizsm', MID)}`).join('')}
      ${tx(4, 96, 'Debajo, read_u16(): lo estira a 0 … 65535, de 16 en 16.')}${tx(4, 114, 'No ganas precisión: un paso real = 3,3 V / 4096')}${tx(4, 130, '≈ 0,806 mV.')}`),
    tempstep: SV(120, `${tx(4, 18, 'Un paso del ADC frente a un grado')}${Array.from({ length: 13 }, (_, k) => ln(`M${10 + k * 22} 30v${k % 2 ? 10 : 16}`, 'var(--ice)', 2)).join('')}${ln('M10 30H274', 'var(--ice)')}
      ${tx(4, 64, 'cada marca: 0,806 mV = 0,47 °C')}${tx(4, 86, 'El sensor cambia 1,721 mV por grado: dos marcas')}${tx(4, 102, 'del ADC ≈ 1 °C. No es un termómetro fino.')}`),
    irq: SV(170, `${tx(4, 18, 'Handler corto (bien)', 'vizlab')}${fl(8, 26, 284, 14, 'var(--ice)', 0.6)}${[60, 140, 220].map(x => fl(x, 22, 6, 22, 'var(--ok)')).join('')}
      ${tx(4, 64, 'apunta el evento y vuelve: el bucle sigue')}
      ${tx(4, 96, 'Handler largo (mal)', 'vizlab')}${fl(8, 104, 284, 14, 'var(--ice)', 0.6)}${fl(60, 100, 150, 22, 'var(--err)')}${tc(135, 115, 'sleep, pantalla…', '#fff', 'vizsm', MID)}
      ${tc(4, 144, 'Mientras, el bucle y otros eventos esperan o se pierden', 'var(--err)', 'vizsm')}${tx(4, 162, 'Lo pesado, en el bucle principal.')}`),
    volatile: SV(170, `${mono(4, 18, 'while (pulsos == 0);', 'currentColor', 11)}${tx(4, 38, 'Sin volatile, el compilador puede leer pulsos una')}${tx(4, 54, 'vez, guardarlo en un registro y no mirar más la RAM.')}
      ${tx(4, 86, 'Un uint64_t en un M0+ se lee en dos mitades:', 'vizlab')}${blk(8, 96, 110, 26, 'mitad baja', 'var(--ice)')}${fl(122, 96, 52, 26, 'var(--err)', 0.8)}${tc(148, 113, 'IRQ', '#fff', 'vizsm', MID)}${blk(178, 96, 110, 26, 'mitad alta', 'var(--led)')}
      ${tc(4, 144, 'Si la interrupción cambia el valor en medio, mezclas', 'var(--err)', 'vizsm')}${tc(4, 160, 'una mitad vieja y otra nueva.', 'var(--err)', 'vizsm')}`),
    sdk: SV(150, `${[['main.c +', 'CMakeLists'], ['CMake', 'configura'], ['gcc', 'compila'], ['enlazador', 'une'], ['.elf · .uf2', 'resultado']].map(([a, b], i) => `${blk(4 + i * 59, 20, 54, 44, '', i === 4 ? 'var(--ok)' : 'currentColor')}<text x="${31 + i * 59}" y="38" font-size="9.5" fill="currentColor" ${MID}>${a}</text><text x="${31 + i * 59}" y="54" font-size="9" fill="var(--muted)" ${MID}>${b}</text>${i < 4 ? `<path d="M${59 + i * 59} 42l4 -4v8z" fill="currentColor"/>` : ''}`).join('')}
      ${tx(4, 92, '.uf2: arrastrar en BOOTSEL · .elf: depurador')}${tx(4, 110, 'El enlazador solo mete las partes del SDK que')}${tx(4, 126, 'llamas: por eso un parpadeo ocupa poco.')}`),
    stdio: SV(140, `${ln('M10 50H290', 'var(--line)', 2)}${tx(10, 70, '0 ms')}${tx(290, 70, '1 s', 'vizsm', END)}
      <circle cx="30" cy="50" r="6" fill="var(--err)"/>${tc(30, 34, 'printf("Hola")', 'var(--err)', 'vizsm')}${fl(40, 44, 150, 12, 'var(--ice)', 0.4)}${tx(115, 90, 'el PC aún reconoce el puerto', 'vizsm', MID)}
      <circle cx="220" cy="50" r="6" fill="var(--ok)"/>${tc(220, 34, 'visible', 'var(--ok)', 'vizsm', MID)}
      ${mono(4, 116, 'while (!stdio_usb_connected()) sleep_ms(10);', 'currentColor', 9.5)}${tx(4, 134, 'Espera al puerto antes de los mensajes importantes')}`),
    swd: SV(150, `${blk(4, 30, 70, 50, 'PC: GDB', 'currentColor', 10)}${tx(39, 96, '+ OpenOCD', 'vizsm', MID)}${ln('M74 55H110')}${tx(92, 48, 'USB', 'vizsm', MID)}${blk(110, 30, 70, 50, 'sonda', 'var(--ice)')}
      ${ln('M180 42H220', 'var(--led)')}${ln('M180 55H220', 'var(--ice)')}${ln('M180 68H220')}${tx(200, 38, 'SWCLK', 'vizsm', MID)}${tx(200, 90, 'SWDIO · GND', 'vizsm', MID)}${blk(220, 30, 74, 50, 'Pico')}
      ${tx(4, 124, 'Paras el programa, miras variables y avanzas línea')}${tx(4, 140, 'a línea sin cambiar el código.')}`),
    qspi: SV(140, `${blk(4, 20, 74, 36, 'clk_sys', 'var(--led)')}${arr(78, 38, 104, 38)}${blk(106, 20, 50, 36, '÷ div')}${arr(156, 38, 182, 38)}${blk(184, 20, 110, 36, 'reloj de la flash')}
      ${tx(4, 80, '125 MHz ÷ 2 = 62,5 MHz: la flash va bien')}${tc(4, 98, '300 MHz ÷ 2 = 150 MHz: demasiado rápido, se cuelga', 'var(--err)')}${tc(4, 116, '300 MHz ÷ 4 = 75 MHz: vuelve a funcionar', 'var(--ok)')}
      ${tx(4, 134, 'Mira el máximo en la hoja de datos de TU flash.')}`),
    clocks: SV(176, `${blk(4, 10, 66, 28, 'ROSC', 'var(--muted)', 10)}${tx(74, 28, 'interno, impreciso', 'vizsm')}${blk(4, 64, 66, 28, 'XOSC 12 MHz', 'currentColor', 9.5)}
      ${arr(70, 78, 98, 60)}${arr(70, 78, 98, 108)}${blk(100, 44, 80, 30, 'PLL_SYS', 'var(--led)', 10)}${blk(100, 96, 80, 30, 'PLL_USB', 'var(--ice)', 10)}
      ${arr(180, 59, 204, 59)}${tx(208, 56, 'clk_sys', 'vizlab')}${tx(208, 72, 'CPU, PIO, PWM…', 'vizsm')}${arr(180, 111, 204, 111)}${tx(208, 108, 'clk_usb', 'vizlab')}${tx(208, 124, 'clk_adc: 48 MHz', 'vizsm')}
      ${tx(4, 156, 'Arranca con el ROSC; luego el SDK pasa al cristal')}${tx(4, 172, 'y a los PLL.')}`),
    pwmb: SV(140, `${tx(4, 18, 'señal')}${sq([[16, 1], [30, 0], [46, 1], [60, 0], [76, 1], [90, 0], [106, 1], [120, 0]], 26, 18, 36, 1)}${arr(166, 35, 196, 35)}${blk(198, 18, 96, 36, 'slice: cuenta', 'var(--ice)', 10)}
      ${tx(4, 76, 'Solo en GPIO impares (canal B):')}${mono(4, 96, 'PWM_DIV_B_RISING → cuenta flancos', 'currentColor', 10)}${mono(4, 114, 'PWM_DIV_B_HIGH   → mide tiempo en alto', 'currentColor', 10)}${tx(4, 134, 'frecuencia = flancos contados / tiempo')}`),
    pioblk: SV(196, `${bx(4, 6, 292, 150, 'var(--led)')}${tx(12, 22, 'Un bloque PIO', 'vizlab')}${blk(150, 12, 140, 22, 'memoria: 32 instrucciones', 'var(--led)', 9.5)}
      ${Array.from({ length: 4 }, (_, k) => `${blk(12 + k * 71, 42, 66, 70, '', 'var(--ice)')}<text x="${45 + k * 71}" y="58" font-size="10" font-weight="700" fill="currentColor" ${MID}>SM${k}</text><text x="${45 + k * 71}" y="74" font-size="9" fill="var(--muted)" ${MID}>X · Y · PC</text><text x="${45 + k * 71}" y="88" font-size="9" fill="var(--muted)" ${MID}>OSR · ISR</text><text x="${45 + k * 71}" y="102" font-size="9" fill="var(--muted)" ${MID}>divisor</text>`).join('')}
      ${tx(12, 132, 'cada SM: TX FIFO (CPU → SM) y RX FIFO (SM → CPU)')}${tx(12, 148, 'de 4 palabras, y acceso a los pines')}
      ${tx(4, 176, 'RP2040: 2 bloques (8 máquinas) · RP2350: 3 (12)')}${tx(4, 192, 'Cada instrucción: 1 ciclo + su retardo')}`),
    nine: SV(176, `${[['jmp', 'salta (con condición opcional)'], ['wait', 'espera a un pin o a una IRQ'], ['in', 'mete bits en el ISR'], ['out', 'saca bits del OSR'], ['push', 'ISR → RX FIFO (hacia la CPU)'], ['pull', 'TX FIFO → OSR (desde la CPU)'], ['mov', 'copia entre registros (puede invertir)'], ['irq', 'pone o espera banderas'], ['set', 'escribe un valor de 0 a 31']].map(([a, b], i) => `${mono(8, 16 + i * 19, a, 'var(--led)', 12)}${tx(52, 16 + i * 19, b)}`).join('')}`),
    idle: SV(176, `${tx(4, 16, 'UART en reposo: ALTA (bien)')}${sq([[40, 1], [200, 1], [212, 0], [237, 1], [290, 1]], 24, 20, 10, 1, 'var(--ok)')}${tc(206, 58, 'inicio real', 'var(--ok)', 'vizsm', MID)}
      ${tx(4, 80, 'UART esperando con la línea BAJA (mal)')}${sq([[40, 1], [52, 0], [200, 0], [290, 0]], 88, 20, 10, 1, 'var(--err)')}${tc(62, 124, '¿un inicio? el receptor se lía', 'var(--err)', 'vizsm')}
      ${tx(4, 148, 'WS2812 esperando: línea baja = fin de trama (bien)')}${tx(4, 166, 'La máquina deja los pines como estaban al esperar.')}`),
    smmap: SV(160, `${mono(4, 16, 'StateMachine(0, prog, freq=…,', 'currentColor', 10)}${[['set_base=Pin(15)', 'set(pins, …)', 'var(--led)'], ['out_base=Pin(16)', 'out(pins, …)', 'var(--ice)'], ['in_base=Pin(17)', 'in_(pins, …)', 'var(--ok)'], ['sideset_base=Pin(18)', '.side(…)', 'var(--gem)']].map(([a, b, c], i) => `${mono(16, 38 + i * 24, a, c, 10.5)}${arr(170, 34 + i * 24, 196, 34 + i * 24, c)}${mono(200, 38 + i * 24, b, c, 10.5)}`).join('')}
      ${tx(4, 140, 'Cada tipo de instrucción mueve su propio grupo de')}${tx(4, 156, 'pines. Si falta su base, esa instrucción no mueve nada.')}`),
    cyclewave: SV(150, `${tx(4, 16, 'Dibuja la onda en ciclos de la máquina')}${Array.from({ length: 25 }, (_, k) => ln(`M${10 + k * 11.2} 24V70`, 'var(--line)', 1)).join('')}
      ${sq([[0, 1], [8, 0], [16, 1], [24, 1]].map(([t, v]) => [t, v]), 30, 30, 10, 11.2)}${tx(54, 82, 'inicio: 8', 'vizsm', MID)}${tx(144, 82, 'bit 0: 8', 'vizsm', MID)}
      ${tx(4, 106, '1) onda en ciclos  2) ciclos por bit  3) dónde espera')}${tx(4, 122, '4) programa  5) cuenta cada camino  6) analizador')}`),
    dmacfg: SV(170, `${blk(4, 30, 74, 46, 'FIFO del ADC')}${tx(41, 92, 'dirección fija', 'vizsm', MID)}${arr(78, 53, 110, 53)}
      ${blk(110, 14, 88, 78, '', 'var(--ice)')}<text x="154" y="32" font-size="10.5" font-weight="700" fill="currentColor" ${MID}>canal DMA</text>${['READ_ADDR fija', 'WRITE_ADDR ++', 'TRANS_COUNT N', 'DREQ_ADC'].map((t, i) => `<text x="154" y="${48 + i * 12}" font-size="9" fill="var(--muted)" ${MID}>${t}</text>`).join('')}
      ${arr(198, 53, 222, 53)}${Array.from({ length: 6 }, (_, k) => `<rect x="${224 + k * 12}" y="40" width="10" height="26" fill="var(--led)" opacity="${k < 4 ? 0.85 : 0.25}"/>`).join('')}${tx(260, 84, 'búfer en RAM', 'vizsm', MID)}
      ${tx(4, 120, 'El ADC avisa (DREQ) cuando tiene una muestra; el')}${tx(4, 136, 'canal la copia y avanza en el búfer. La CPU no')}${tx(4, 152, 'toca nada hasta que acaban las N transferencias.')}`),
    banks: SV(150, `${tx(4, 16, 'La RAM del RP2040 está en bancos')}${['SRAM0', 'SRAM1', 'SRAM2', 'SRAM3'].map((t, i) => blk(4 + i * 62, 26, 58, 34, t, i === 0 ? 'var(--ice)' : i === 2 ? 'var(--led)' : 'currentColor', 10)).join('')}${blk(254, 26, 40, 34, '4+5', 'currentColor', 10)}
      ${tc(33, 78, 'CPU', 'var(--ice)', 'vizlab', MID)}${tc(157, 78, 'DMA', 'var(--led)', 'vizlab', MID)}
      ${tc(4, 104, 'Bancos distintos: los dos avanzan a la vez', 'var(--ok)')}${tc(4, 122, 'Mismo banco: el bus arbitra y uno espera un ciclo', 'var(--err)')}${tx(4, 140, '4 × 64 KB entrelazados + 2 × 4 KB = 264 KB')}`),
    adcdiv: SV(140, `${tx(4, 16, 'Reloj del ADC: 48 MHz (marcas grises)')}${Array.from({ length: 28 }, (_, k) => ln(`M${10 + k * 10} 26v12`, 'var(--muted)', 1)).join('')}
      ${[0, 1, 2].map(k => `<rect x="${10 + k * 92}" y="44" width="88" height="16" rx="3" fill="var(--ice)" opacity=".7"/><circle cx="${10 + k * 92}" cy="34" r="4" fill="var(--led)"/>`).join('')}
      ${tx(4, 80, 'Una muestra cada (div + 1) ciclos')}${mono(4, 100, 'f = 48 000 000 / (div + 1)', 'currentColor', 11)}${tx(4, 122, 'Una conversión tarda 96 ciclos: máximo 500 ksps')}`),
    pingpong: SV(160, `${blk(8, 14, 70, 32, 'canal A', 'var(--ice)')}${blk(8, 84, 70, 32, 'canal B', 'var(--led)')}
      ${arr(43, 46, 43, 82, 'var(--ice)')}${arr(55, 82, 55, 48, 'var(--led)')}${tx(62, 70, 'chain_to', 'vizsm')}
      ${arr(78, 30, 130, 30)}${arr(78, 100, 130, 100)}${blk(132, 14, 74, 32, 'búfer 1', 'var(--ice)')}${blk(132, 84, 74, 32, 'búfer 2', 'var(--led)')}
      ${arr(206, 30, 236, 60)}${arr(206, 100, 236, 70)}${blk(238, 46, 56, 36, 'CPU', 'var(--ok)')}${tx(266, 98, 'procesa', 'vizsm', MID)}
      ${tx(4, 144, 'Al acabar, cada canal arranca al otro y avisa a la CPU')}`),
    cores: SV(180, `${blk(20, 10, 110, 40, 'núcleo 0', 'var(--ice)')}${blk(170, 10, 110, 40, 'núcleo 1', 'var(--led)')}${tx(82, 70, 'su NVIC', 'vizsm')}${tx(232, 70, 'su NVIC', 'vizsm')}
      ${arr(130, 24, 170, 24)}${arr(170, 36, 130, 36)}${tx(150, 18, 'FIFO', 'vizsm', MID)}
      ${ln('M75 50V96M225 50V96')}${blk(8, 96, 284, 36, 'RAM, flash y periféricos: todo compartido')}
      ${tx(4, 154, 'Cada interrupción se atiende en el núcleo que la')}${tx(4, 170, 'activó. Los datos comunes necesitan cuidado.')}`),
    race: SV(170, `${tx(4, 20, 'núcleo 0')}${tx(4, 52, 'núcleo 1')}${tx(4, 84, 'memoria')}
      ${[['lee 5', 0, 0, 'var(--ice)'], ['lee 5', 1, 1, 'var(--ice)'], ['escribe 6', 2, 0, 'var(--led)'], ['escribe 6', 3, 1, 'var(--led)']].map(([t, k, r, c]) => `<rect x="${64 + k * 56}" y="${8 + r * 32}" width="52" height="22" rx="3" fill="${c}"/><text x="${90 + k * 56}" y="${23 + r * 32}" font-size="10" fill="#fff" ${MID}>${t}</text>`).join('')}
      ${['5', '5', '6', '6'].map((v, k) => tx(90 + k * 56, 84, v, 'vizlab', MID)).join('')}
      ${tc(4, 118, 'Dos sumas y el resultado es 6: se ha perdido una', 'var(--err)', 'vizlab')}${tx(4, 140, '«contador += 1» es leer, sumar y escribir: tres')}${tx(4, 156, 'pasos que el otro núcleo puede intercalar.')}`),
    deadlock: SV(160, `${blk(20, 20, 90, 34, 'núcleo 0', 'var(--ice)')}${blk(190, 20, 90, 34, 'núcleo 1', 'var(--led)')}${blk(20, 100, 90, 30, 'cerrojo A')}${blk(190, 100, 90, 30, 'cerrojo B')}
      ${arr(65, 54, 65, 98, 'var(--ok)')}${tc(70, 80, 'tiene', 'var(--ok)', 'vizsm')}${arr(235, 54, 235, 98, 'var(--ok)')}${tc(240, 80, 'tiene', 'var(--ok)', 'vizsm')}
      ${arr(110, 46, 190, 110, 'var(--err)')}${arr(190, 46, 110, 110, 'var(--err)')}${tc(150, 58, 'espera', 'var(--err)', 'vizsm', MID)}${tx(4, 152, 'Regla: todos toman los cerrojos en el mismo orden')}`),
    usbcls: SV(150, `${blk(4, 50, 60, 36, 'Pico', 'var(--led)')}${ln('M64 68H96')}${ln('M96 20V124')}
      ${[['HID', 'teclado, ratón, mando'], ['CDC', 'puerto serie virtual'], ['MSC', 'unidad de disco'], ['MIDI', 'instrumentos']].map(([a, b], i) => `${ln(`M96 ${20 + i * 34}H110`)}${blk(110, 8 + i * 34, 52, 26, a, 'var(--ice)', 10.5)}${tx(170, 25 + i * 34, b)}`).join('')}`),
    tud: SV(150, `${tx(4, 16, 'Bucle que llama a tud_task() a menudo (bien)')}${Array.from({ length: 14 }, (_, k) => fl(10 + k * 20, 26, 6, 16, 'var(--ok)')).join('')}
      ${tx(4, 70, 'Bucle con sleep_ms(2000) (mal)')}${fl(10, 80, 6, 16, 'var(--ok)')}${fl(20, 80, 250, 16, 'var(--err)', 0.7)}${tc(145, 93, 'sleep: el USB no se atiende', '#fff', 'vizsm', MID)}
      ${tx(4, 122, 'El anfitrión pregunta y nadie contesta: el')}${tx(4, 138, 'dispositivo falla o se desconecta.')}`),
    keypos: SV(130, `<rect x="20" y="20" width="60" height="60" rx="10" fill="none" stroke="currentColor" stroke-width="2.5"/>${tx(50, 46, '_  ?', 'vizlab', MID)}${tx(50, 68, "-  '", 'vizlab', MID)}
      ${tx(96, 34, 'Código HID 0x2D: una POSICIÓN')}${tx(96, 54, 'Distribución de EE. UU.: «-»')}${tx(96, 74, 'Distribución española: «\'»')}
      ${tx(4, 108, 'El sistema traduce con SU distribución de teclado:')}${tx(4, 124, 'prepara las macros para la del ordenador.')}`),
    mouse: SV(110, `${tx(4, 16, 'Mover 300 a la derecha (máx. 127 por informe)')}${arr(10, 40, 128, 40, 'var(--ice)')}${arr(130, 40, 248, 40, 'var(--ice)')}${arr(250, 40, 292, 40, 'var(--led)')}
      ${tx(69, 62, '127', 'vizsm', MID)}${tx(189, 62, '127', 'vizsm', MID)}${tx(271, 62, '46', 'vizsm', MID)}${tx(4, 92, '3 informes: el ratón estándar es relativo')}`),
    radio: SV(150, `${tx(4, 16, 'La radio de la Pico W solo trabaja en 2,4 GHz')}${Array.from({ length: 13 }, (_, k) => `<path d="M${14 + k * 11} 70Q${24 + k * 11} 30 ${34 + k * 11} 70" fill="none" stroke="var(--ok)" stroke-width="1.5"/>`).join('')}${tx(80, 86, 'canales 1–13 (Europa)', 'vizsm', MID)}
      ${fl(200, 40, 92, 30, 'var(--err)', 0.25)}${tc(246, 60, '5 GHz: no', 'var(--err)', 'vizlab', MID)}
      ${tx(4, 112, "rp2.country('ES') fija canales y potencias de aquí.")}${tx(4, 128, 'Banda libre: sin licencia, con el módulo homologado.')}${tx(4, 144, 'WiFi y BLE comparten radio y antena.')}`),
    netsec: SV(150, `${blk(4, 20, 76, 36, 'Internet', 'var(--err)')}${ln('M80 38H118', 'var(--err)', 2, 'stroke-dasharray="4 4"')}${tc(99, 30, '✗', 'var(--err)', 'vizlab', MID)}${blk(118, 20, 70, 36, 'router')}
      ${ln('M188 38H220')}${blk(220, 10, 74, 26, 'tu móvil', 'var(--ok)', 10)}${blk(220, 44, 74, 26, 'Pico W', 'var(--led)', 10)}${tx(257, 88, 'red de casa', 'vizsm', MID)}
      ${tx(4, 110, 'Sin puertos abiertos hacia la Pico: solo tu red local')}${tx(4, 126, 'llega a ella. Y el aparato se protege solo (tiempo')}${tx(4, 142, 'máximo, temperatura).')}`),
    ble: SV(176, `${blk(4, 30, 66, 36, 'Pico', 'var(--led)')}${[0, 1, 2].map(k => `<path d="M${76 + k * 8} 36q8 12 0 24" fill="none" stroke="var(--led)" stroke-width="2"/>`).join('')}${tx(4, 84, 'periférico: anuncia', 'vizsm')}
      ${blk(226, 30, 66, 36, 'móvil', 'var(--ice)')}${tx(296, 84, 'central: conecta', 'vizsm', END)}${arr(222, 48, 110, 48, 'var(--ice)')}
      ${tx(4, 108, 'Servicio 0x181A (entorno)', 'vizlab')}${ln('M14 114V150H30')}${ln('M14 132H30')}${tx(34, 136, 'característica 0x2A6E: temperatura (leer, notificar)')}${tx(34, 154, 'característica 0x2A6F: humedad')}${tx(4, 172, 'UUID de 16 bits = estándar; de 128 = tuyo')}`),
    sock: SV(150, `${ln('M30 20V110H290', 'var(--line)')}${tx(4, 18, 'RAM libre')}${tx(290, 124, 'tiempo', 'vizsm', END)}
      ${ln('M30 34H290', 'var(--ok)', 2.5)}${tc(290, 30, 'con r.close()', 'var(--ok)', 'vizsm', END)}
      ${ln('M30 34H70V48H110V62H150V76H190V90H230V104H250', 'var(--err)', 2.5)}${tc(252, 104, 'MemoryError', 'var(--err)', 'vizsm')}
      ${tx(4, 140, 'Cada respuesta sin cerrar retiene su socket y memoria')}`),
    meter: SV(150, `${blk(4, 40, 58, 34, 'pilas', 'currentColor', 10)}${ln('M62 57H96')}<circle cx="116" cy="57" r="20" class="meterc"/>${tx(116, 61, 'mA', 'vizlab', MID)}${ln('M136 57H176')}${tx(156, 50, '', 'vizsm')}${blk(176, 40, 66, 34, 'VSYS', 'var(--led)', 10)}
      ${tc(176, 28, 'USB desconectado', 'var(--err)', 'vizsm')}
      ${tx(4, 106, 'El multímetro, en serie con la alimentación. Con el')}${tx(4, 122, 'USB enchufado alimenta él y no mides lo que crees.')}${tx(4, 140, 'Empieza en la escala de mA; baja a µA al dormir.')}`),
    dormant: SV(130, `${['ROSC', 'XOSC', 'PLL', 'CPU'].map((t, i) => `${blk(4 + i * 62, 14, 56, 30, t, 'var(--muted)', 10)}${ln(`M${8 + i * 62} 18L${56 + i * 62} 40`, 'var(--err)', 2)}`).join('')}${blk(252, 14, 44, 30, 'GPIO', 'var(--ok)', 10)}
      ${tx(4, 70, 'dormant: hasta los osciladores se paran.')}${tx(4, 86, 'Ningún temporizador interno cuenta: solo un flanco')}${tx(4, 102, 'en un GPIO (o un reloj externo) lo despierta.')}${tx(4, 120, 'Al despertar hay que volver a poner los relojes.')}`),
    avg: SV(150, `${tx(4, 16, 'Corriente frente a tiempo: la media es el área')}${fl(20, 42, 30, 58, 'var(--led)', 0.8)}${fl(50, 92, 240, 8, 'var(--ice)', 0.8)}${ln('M20 100H290', 'var(--line)')}
      ${tx(56, 52, '← I activa × t', 'vizsm')}${tx(170, 86, 'I dormida × resto', 'vizsm', MID)}
      ${mono(4, 124, 'I media = (Ia·ta + Id·td) / periodo', 'currentColor', 10.5)}${mono(4, 142, 'autonomía (h) = mAh / I media (mA)', 'currentColor', 10.5)}`),
    batt: SV(170, `${tx(4, 16, 'Tensión de cada química, de vacía a llena')}${(() => { const X = v => 104 + v * 31; return `${fl(X(1.8), 24, X(5.5) - X(1.8), 100, 'var(--ok)', 0.12)}${tx(X(5.5), 164, 'zona verde: VSYS 1,8–5,5 V', 'vizsm', END)}
      ${[['3 AA alcalinas', 3.0, 4.8], ['LiFePO4', 2.8, 3.6], ['Li-ion / LiPo', 3.0, 4.2]].map(([t, a, b], i) => { const y = 34 + i * 30; return `${tx(4, y + 12, t)}${fl(X(a), y, X(b) - X(a), 14, 'var(--led)', 0.85)}${tx(X(a) - 3, y + 11, num(a, 1), 'vizsm', END)}${tx(X(b) + 3, y + 11, num(b, 1), 'vizsm')}`; }).join('')}
      ${[0, 1, 2, 3, 4, 5, 6].map(v => `${ln(`M${X(v)} 128v5`, 'var(--muted)', 1)}${tx(X(v), 148, String(v), 'vizsm', MID)}`).join('')}`; })()}
      ${tx(4, 16, '')}`),
    hw: SV(190, `${blk(4, 14, 62, 30, 'USB-C', 'currentColor', 10)}${arr(66, 29, 90, 29)}${blk(92, 14, 74, 30, 'reg. 3,3 V', 'var(--ice)', 10)}${arr(166, 29, 190, 29)}
      ${blk(190, 10, 104, 100, '', 'var(--led)')}${tx(242, 30, 'RP2040', 'vizlab', MID)}${tx(242, 50, 'IOVDD · USB_VDD', 'vizsm', MID)}${tx(242, 64, 'ADC_AVDD: 3,3 V', 'vizsm', MID)}${tx(242, 82, 'VREG → DVDD', 'vizsm', MID)}${tx(242, 96, '1,1 V interno', 'vizsm', MID)}
      ${blk(92, 60, 74, 26, 'cristal 12 MHz', 'currentColor', 9)}${ln('M166 73H190')}${blk(92, 96, 74, 26, 'flash QSPI', 'currentColor', 9.5)}${ln('M166 109H190')}
      ${blk(4, 60, 74, 26, 'BOOTSEL', 'currentColor', 9.5)}${blk(4, 96, 74, 26, 'RUN · SWD', 'currentColor', 9.5)}
      ${tx(4, 146, '+ 100 nF por pata de alimentación, 1 µF en VREG')}${tx(4, 162, '+ 27 Ω en D+ y D−; 5,1 kΩ en CC1 y CC2')}${tx(4, 180, 'Sigue la guía oficial de diseño de hardware')}`),
    vreg: SV(140, `${tx(4, 20, '3,3 V')}${ln('M40 16H90')}${blk(90, 4, 84, 26, 'VREG_VIN', 'currentColor', 10)}${ln('M60 16V40')}${cap(60, 46)}${ln('M60 50V58')}${gnd(60, 60)}${tx(48, 50, '1 µF', 'vizsm', END)}
      ${blk(90, 44, 84, 26, 'VREG_VOUT', 'var(--ice)', 10)}${ln('M174 57H200')}${tx(204, 61, '1,1 V → DVDD', 'vizlab')}${ln('M186 57V74')}${cap(186, 80)}${ln('M186 84V90')}${gnd(186, 92)}${tx(174, 84, '1 µF', 'vizsm', END)}
      ${tx(4, 120, 'El regulador del núcleo va dentro del chip: tú')}${tx(4, 136, 'solo pones sus condensadores.')}`),
    xtalr: SV(130, `${tx(4, 34, 'XOUT')}${ln('M38 30H60')}${res(74, 30)}${tx(74, 18, '1 kΩ', 'vizsm', MID)}${ln('M88 30H120')}<rect x="120" y="18" width="40" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>${tx(140, 34, '12 MHz', 'vizsm', MID)}${ln('M160 30H200')}${tx(204, 34, 'XIN', 'vizsm')}
      ${ln('M104 30V52')}${cap(104, 58)}${ln('M104 62V68')}${gnd(104, 70)}${ln('M180 30V52')}${cap(180, 58)}${ln('M180 62V68')}${gnd(180, 70)}
      ${tx(4, 104, 'La resistencia evita excitar de más el cristal.')}${tx(4, 120, 'Pegado al chip, con masa debajo y nada rápido cerca.')}`),
    layout: SV(184, `<rect x="6" y="6" width="288" height="140" rx="8" fill="#1E5F3A" opacity=".9"/>${blk(120, 50, 60, 52, 'RP2040', '#fff', 10, '#222')}
      ${blk(196, 58, 42, 34, 'flash', '#fff', 9.5, '#333')}${blk(74, 66, 34, 22, 'cristal', '#fff', 9, '#333')}${[[118, 40], [182, 40], [118, 110], [182, 110], [112, 76]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="6" fill="#C9A227"/>`).join('')}
      ${blk(8, 60, 30, 36, 'USB', '#fff', 9, '#555')}${blk(250, 20, 38, 24, 'reg.', '#fff', 9, '#333')}
      ${tx(4, 162, 'Primero el chip; flash, cristal y desacoplos pegados;')}${tx(4, 176, 'los conectores, en los bordes.')}`),
    usbc: SV(150, `${blk(4, 20, 60, 90, 'USB-C', 'currentColor', 10)}${ln('M64 40H110')}${res(124, 40)}${ln('M138 40H200')}${ln('M64 60H110')}${res(124, 60)}${ln('M138 60H200')}${tx(124, 28, '27 Ω', 'vizsm', MID)}
      ${tx(204, 44, 'D+')}${tx(204, 64, 'D−')}${blk(230, 30, 64, 40, 'RP2040', 'var(--led)', 10)}
      ${ln('M64 84H90')}${ln('M64 100H150')}${res(104, 84)}${res(164, 100)}${ln('M118 84H130V120')}${ln('M178 100H190V120')}${gnd(130, 122)}${gnd(190, 122)}${tx(72, 80, 'CC1', 'vizsm')}${tx(72, 114, 'CC2', 'vizsm')}${tx(204, 112, '5,1 kΩ', 'vizsm')}
      ${tx(4, 146, 'Sin las 5,1 kΩ, un cargador USB-C no da los 5 V')}`),
    reg2350: SV(120, `${blk(4, 20, 90, 34, 'RP2350', 'var(--led)')}${ln('M94 37H120')}${tx(108, 30, 'LX', 'vizsm', MID)}<path d="M120 37q6 -10 12 0q6 -10 12 0q6 -10 12 0" fill="none" stroke="currentColor" stroke-width="2"/>${ln('M156 37H200')}${tx(204, 41, 'DVDD', 'vizlab')}${tx(140, 62, 'bobina', 'vizsm', MID)}
      ${tx(4, 90, 'Su regulador del núcleo es conmutado: necesita')}${tx(4, 106, 'una bobina y un rutado cuidadoso.')}`),
    product: SV(150, `${[['Marcado CE (EMC, seguridad; RED si hay radio)', 1], ['VID/PID propio o concedido', 1], ['TVS en el USB contra descargas', 1], ['Fusible rearmable y protección de polaridad', 1], ['Pruebas de emisiones', 1]].map(([t], i) => `<rect x="6" y="${10 + i * 26}" width="16" height="16" rx="3" fill="none" stroke="var(--ok)" stroke-width="2"/><path d="M9 ${18 + i * 26}l4 4l7 -8" fill="none" stroke="var(--ok)" stroke-width="2"/>${tx(30, 23 + i * 26, t)}`).join('')}
      ${tx(4, 146, 'Un prototipo que funciona aún no es un producto')}`),
    turns: SV(150, `${tx(4, 18, 'Un solo núcleo, por turnos: cada await cede')}${tx(4, 48, 'A')}${tx(4, 80, 'B')}
      ${[[20, 'A'], [60, 'B'], [110, 'A'], [150, 'B'], [200, 'A'], [240, 'B']].map(([x, t]) => `<rect x="${x}" y="${t === 'A' ? 34 : 66}" width="34" height="20" rx="3" fill="${t === 'A' ? 'var(--ice)' : 'var(--led)'}"/>${tc(x + 17, t === 'A' ? 30 : 98, 'await', 'var(--muted)', 'vizsm', MID)}`).join('')}
      ${tx(4, 124, 'Si una tarea no hace await (o usa time.sleep),')}${tx(4, 140, 'las demás no corren.')}`),
    struct: SV(150, `${blk(4, 14, 50, 30, '0xFF', 'var(--ice)', 12)}${blk(58, 14, 50, 30, '0x38', 'var(--led)', 12)}${tx(118, 34, 'bytes recibidos', 'vizsm')}
      ${mono(4, 70, "'>h': 0xFF38 con signo = −200", 'var(--ok)', 11)}${mono(4, 90, "'>H': 0xFF38 sin signo = 65336", 'currentColor', 11)}${mono(4, 110, "'<h': 0x38FF con signo = 14591", 'var(--err)', 11)}
      ${tx(4, 136, '> alto primero · < bajo primero · h con signo · H sin')}`),
    buses: SV(190, `${tx(4, 16, 'I²C: 2 hilos compartidos, una dirección por chip', 'vizlab')}${ln('M10 34H200M10 46H200')}${tx(204, 38, 'SDA', 'vizsm')}${tx(204, 50, 'SCL', 'vizsm')}${blk(30, 52, 50, 18, '0x3C', 'currentColor', 9)}${blk(110, 52, 50, 18, '0x76', 'currentColor', 9)}${tx(240, 44, '+ pull-ups', 'vizsm')}
      ${tx(4, 94, 'SPI: reloj y datos compartidos, un CS por chip', 'vizlab')}${ln('M10 108H200')}${tx(204, 112, 'SCK·MOSI·MISO', 'vizsm')}${blk(30, 116, 50, 18, 'CS1', 'var(--ice)', 9)}${blk(110, 116, 50, 18, 'CS2', 'var(--led)', 9)}
      ${tx(4, 154, 'UART: TX y RX cruzados, mismo baudio', 'vizlab')}${blk(10, 162, 50, 22, 'Pico', 'currentColor', 10)}${ln('M60 168L150 180M60 180L150 168')}${blk(150, 162, 60, 22, 'GPS', 'currentColor', 10)}${tx(220, 178, 'TX ↔ RX', 'vizsm')}`),
    timer: SV(130, `${tx(4, 16, 'Timer.PERIODIC: llama a tu función cada periodo')}${Array.from({ length: 6 }, (_, k) => fl(14 + k * 48, 24, 6, 18, 'var(--ok)')).join('')}${ln('M10 44H292', 'var(--line)')}
      ${tx(4, 68, 'Timer.ONE_SHOT: una sola vez')}${fl(62, 76, 6, 18, 'var(--led)')}${ln('M10 96H292', 'var(--line)')}
      ${tx(4, 120, 'Mientras, el programa (o el REPL) sigue a lo suyo')}`),
    adv: SV(130, `${tx(4, 18, 'Anunciarse cada segundo (poco consumo)')}${Array.from({ length: 7 }, (_, k) => fl(10 + k * 40, 26, 5, 18, 'var(--ok)')).join('')}
      ${tx(4, 70, 'Conectado sin parar (más consumo)')}${Array.from({ length: 28 }, (_, k) => fl(10 + k * 10, 78, 4, 18, 'var(--led)')).join('')}
      ${tx(4, 118, 'El anuncio lo ve cualquiera cerca: nada sensible')}`)
  };

  /* Parámetros de las visualizaciones nuevas: P.nombre({ cambios }) */
  const LST = (label, val, list, unit, dec = 0) => ({ label, val, list, unit, dec });
  const P = {
    drive: (x = {}) => ({ I: LST('Carga', 70, [2, 5, 10, 20, 30, 70, 200], 'mA'), dr: LST('Fuerza del pin', 4, [2, 4, 8, 12], 'mA'), tr: sl('Con transistor (0 no · 1 sí)', 0, 0, 1), ...x }),
    fam: (x = {}) => ({ chip: sl('Chip (0 RP2040 · 1 RP2350)', 0, 0, 1), rad: sl('Radio (0 no · 1 sí)', 0, 0, 1), ...x }),
    pin: (x = {}) => ({ n: sl('GPIO', 2, 0, 29), ...x }),
    pow: (x = {}) => ({ vb: sl('Batería', 1.5, 0.5, 6, 0.1, 'V', 1), d: sl('Diodo (0 Schottky · 1 silicio)', 1, 0, 1), usb: sl('USB (0 no · 1 sí)', 0, 0, 1), ...x }),
    boot: (x = {}) => ({ bs: sl('BOOTSEL (0 suelto · 1 pulsado)', 0, 0, 1), fl: sl('Flash (0 vacía · 1 con programa)', 1, 0, 1), kb: LST('Programa', 64, [16, 32, 64, 100, 128, 256, 512], 'KB'), ...x }),
    xip: (x = {}) => ({ code: LST('Código que se repite', 48, [2, 4, 8, 16, 24, 32, 48, 64], 'KB'), w: sl('Dónde corre (0 flash · 1 RAM)', 0, 0, 1), er: sl('El otro núcleo borra la flash (0 no · 1 sí)', 0, 0, 1), ...x }),
    ops: (x = {}) => ({ a: sl('a', 17, 0, 40), b: sl('b', 5, 1, 9), ...x }),
    bit: (x = {}) => ({ v: sl('v', 12, 0, 255), s: sl('Desplazar a la derecha (>>)', 0, 0, 7), ...x }),
    range: (x = {}) => ({ a: sl('Inicio', 0, 0, 10), b: sl('Fin', 10, 0, 20), st: sl('Paso', 1, 1, 6), ...x }),
    list: (x = {}) => ({ i: sl('Índice', 1, -6, 5), a: sl('Porción: desde', 0, 0, 5), b: sl('Porción: hasta', 5, 0, 5), ...x }),
    mem: (x = {}) => ({ N: LST('Números', 5000, [1000, 5000, 10000, 20000, 50000]), t: sl("Contenedor (0 lista de int · 1 lista de float · 2 array('H') · 3 array('f'))", 0, 0, 3), ...x }),
    ticks: (x = {}) => ({ d: sl('Retraso al detectar', 0, 0, 20, 1, 'ms'), m: sl('Plazo (0 ticks_ms() · 1 ticks_add)', 0, 0, 1), ...x }),
    wrap: (x = {}) => ({ a: sl('antes', 100, 0, 255), b: sl('ahora', 130, 0, 255), ...x }),
    wear: (x = {}) => ({ iv: LST('Medir cada', 1, [0.01, 0.1, 1, 10, 60, 600], 's', 2), g: LST('Medidas por escritura', 1, [1, 10, 60]), ...x }),
    duty: (x = {}) => ({ f: LST('Frecuencia', 1000, [50, 1000, 20000], 'Hz'), D: sl('Ciclo de trabajo', 10, 0, 100, 0.5, '%', 1), ...x }),
    slice: (x = {}) => ({ a: sl('Pin A (servo)', 2, 0, 29), b: sl('Pin B (zumbador)', 6, 0, 29), ...x }),
    adc: (x = {}) => ({ v: sl('Tensión en el pin', 0.5, 0, 3.3, 0.01, 'V', 2), n: LST('Lecturas promediadas', 1, [1, 4, 16, 64]), nz: LST('Ruido', 20, [0, 5, 20], 'cuentas'), ...x }),
    temp: (x = {}) => ({ T: sl('Temperatura real del chip', 40, -10, 80, 1, '°C'), vr: LST('ADC_VREF real', 3.3, [3.2, 3.25, 3.3, 3.35], 'V', 2), ...x }),
    bounce: (x = {}) => ({ bt: LST('Rebote del pulsador', 5, [1, 3, 5, 10], 'ms'), db: sl('Antirrebote', 0, 0, 40, 1, 'ms'), ...x }),
    i2c: (x = {}) => ({ R: pR('Pull-up', 47000, 1000, 100000), C: LST('Capacidad del bus', 100, [50, 100, 200, 400], 'pF'), f: LST('Velocidad', 400, [100, 400], 'kHz'), ...x }),
    frame: (x = {}) => ({ b: sl('Byte', 65, 0, 255), bd: LST('Baudios', 115200, [9600, 115200]), ...x }),
    async: (x = {}) => ({ blk: LST('Espera dentro de B', 500, [0, 50, 200, 500], 'ms'), aw: sl('Cómo espera B (0 time.sleep · 1 await)', 0, 0, 1), ...x }),
    link: (x = {}) => ({ pw: sl('main.c usa el PWM (0 no · 1 sí)', 1, 0, 1), lk: sl('Enlaza hardware_pwm (0 no · 1 sí)', 1, 0, 1), us: sl('stdio por USB (0 no · 1 sí)', 0, 0, 1), xo: sl('pico_add_extra_outputs (0 no · 1 sí)', 1, 0, 1), ...x }),
    mask: (x = {}) => ({ st: { val: 15, fixed: true }, mk: sl('Máscara', 0, 0, 255), op: sl('Función (0 set · 1 clr · 2 xor)', 0, 0, 2), ...x }),
    clkt: (x = {}) => ({ cs: LST('clk_sys', 125, [48, 125, 133, 200], 'MHz'), ...x }),
    timerc: (x = {}) => ({ pd: LST('Periodo que pasas', 10, [-10, 10], 'ms'), cb: sl('Lo que tarda el callback', 2, 0, 5, 0.5, 'ms', 1), ...x }),
    align: (x = {}) => ({ off: sl('Dirección: 0x20000000 +', 2, 0, 8), sz: LST('Tamaño del acceso', 4, [1, 2, 4], 'bytes'), ...x }),
    dbg: (x = {}) => ({ w: sl('Pulso del GPIO', 12, 1, 60, 1, 'µs'), T: LST('Se repite cada', 100, [100, 500, 1000], 'µs'), ...x }),
    piostep: (x = {}) => ({ c: sl('Ciclo', 0, 0, 23), d1: sl('Retardo en alto [n]', 0, 0, 7), d0: sl('Retardo en bajo [n]', 0, 0, 7), ...x }),
    pioloop: (x = {}) => ({ nx: sl('X al empezar', 1, 0, 5), c: sl('Ciclo', 0, 0, 30), ...x }),
    osr: (x = {}) => ({ dt: sl('Dato', 177, 0, 255), dir: sl('Desplazamiento (0 derecha · 1 izquierda)', 1, 0, 1), pos: LST('sm.put(dato, …)', 0, [0, 24]), th: LST('Umbral de autopull', 32, [8, 16, 24, 32], 'bits'), ...x }),
    fifo: (x = {}) => ({ w: LST('Escribe', 3, [1, 2, 3, 4], 'por ms'), r: LST('Lee', 3, [0, 1, 2, 3, 4], 'por ms'), dp: LST('Capacidad', 4, [4, 8], 'palabras'), ...x }),
    ss: (x = {}) => ({ n: sl('Pines de side-set', 0, 0, 5), op: sl('Side-set opcional (0 no · 1 sí)', 0, 0, 1), ...x }),
    piodiv: (x = {}) => ({ cs: LST('clk_sys', 125, [125, 150, 200], 'MHz'), bd: LST('Baudios', 115200, [300, 1200, 9600, 31250, 115200, 1000000]), cy: LST('Ciclos por bit', 8, [4, 8, 16]), ...x }),
    piomem: (x = {}) => ({ a: sl('Programa A', 12, 1, 20, 1, 'instr.'), b: sl('Programa B', 12, 1, 20, 1, 'instr.'), c: sl('Programa C', 12, 1, 20, 1, 'instr.'), sh: sl('B es el mismo programa que A (0 no · 1 sí)', 0, 0, 1), ...x }),
    uartrx: (x = {}) => ({ er: sl('Diferencia de baudios', 3, -6, 6, 0.5, '%', 1), sp: LST('Dónde lee cada bit (0,5 = centro)', 0.9, [0.1, 0.5, 0.9], '', 1), ...x }),
    enc: (x = {}) => ({ pos: sl('Posición', 0, -6, 6, 1, 'pasos'), ...x }),
    pp: (x = {}) => ({ N: LST('Muestras por búfer', 1024, [256, 512, 1024, 2048]), fs: LST('Muestreo', 500, [50, 100, 250, 500], 'ksps'), tp: sl('Proceso de un búfer', 6, 0.5, 10, 0.5, 'ms', 1), ...x }),
    ring: (x = {}) => ({ k: sl('Inicio: 0x20000000 + k × 0x40; k', 2, 0, 16), n: LST('Bits del anillo', 8, [6, 7, 8, 9]), ...x }),
    cores: (x = {}) => ({ br: LST('Ráfaga de WiFi', 0.5, [0, 0.5, 1, 2], 'ms', 1), sp: sl('Reparto (0 todo en el núcleo 0 · 1 control en el 1)', 0, 0, 1), ...x }),
    usb: (x = {}) => ({ s: sl('Paso', 0, 0, 6), ...x }),
    hid: (x = {}) => ({ md: sl('Modificadores (suma de bits)', 2, 0, 15), ky: LST('Tecla (código HID)', 4, [0, 4, 6, 25, 76]), ...x }),
    midi: (x = {}) => ({ tp: LST('Tipo (8 Off · 9 On · 11 CC · 14 bend)', 8, [8, 9, 11, 14]), ch: sl('Canal', 1, 1, 16), d1: sl('Dato 1', 60, 0, 127), d2: sl('Dato 2', 100, 0, 127), ...x }),
    hyst: (x = {}) => ({ nz: LST('Ruido del ADC', 10, [0, 4, 10, 20], 'cuentas'), th: sl('Margen (histéresis)', 0, 0, 40, 1, 'cuentas'), ...x }),
    wifi: (x = {}) => ({ red: sl('Red al alcance (0 no · 1 sí)', 1, 0, 1), bd: sl('Banda (0 2,4 GHz · 1 5 GHz)', 1, 0, 1), ck: sl('Clave (0 mala · 1 buena)', 1, 0, 1), lm: LST('Espera máxima (0 = sin límite)', 20, [0, 10, 20], 's'), ...x }),
    http: (x = {}) => ({ rt: sl('Ruta (0 / · 1 /api · 2 /favicon.ico · 3 /led)', 0, 0, 3), mt: sl('Método (0 GET · 1 POST)', 0, 0, 1), ...x }),
    ble: (x = {}) => ({ T: sl('Temperatura', 21.5, -20, 40, 0.25, '°C', 2), ...x }),
    sleep: (x = {}) => ({ md: sl('Modo (0 activo · 1 lightsleep · 2 dormant)', 0, 0, 2), ws: sl('Despierta con (0 temporizador · 1 flanco GPIO)', 0, 0, 1), rd: sl('Radio WiFi (0 apagada · 1 encendida)', 1, 0, 1), ...x }),
    avg: (x = {}) => ({ ia: LST('Despierto', 40, [20, 40, 80], 'mA'), ta: LST('Tiempo despierto', 1, [0.1, 0.5, 1, 2], 's', 1), T: LST('Periodo', 10, [10, 60, 300, 900], 's'), is: LST('Dormido', 0.1, [0.01, 0.1, 1], 'mA', 2), ...x }),
    xtal: (x = {}) => ({ cl: LST('CL del cristal', 12, [8, 10, 12, 18, 20], 'pF'), cp: LST('Parásitos', 4, [2, 3, 4, 5], 'pF'), c: LST('Condensadores', 12, [8, 10, 12, 15, 18, 22, 27, 33], 'pF'), ...x }),
    bring: (x = {}) => ({ f: sl('Fallo escondido (0 a 5)', 0, 0, 5), ...x }),
    adcdiv: (x = {}) => ({ dv: LST('div', 0, [0, 95, 479, 999, 4799, 47999]), ...x })
  };
  const tune = (viz, params) => ({ tune: { viz, params } });

  /* ===================== CONCEPTOS NUEVOS ===================== */
  Object.assign(CONCEPTS, {
    rp_uf2: { name: 'El formato UF2: bloques y dirección', alts: [
      { title: 'Bloques con dirección', text: 'Un fichero UF2 está hecho de bloques de 512 bytes. Cada uno lleva <b>256 bytes de programa</b>, la <b>dirección</b> de la flash donde van y el identificador de la <b>familia del chip</b>.\nAsí da igual en qué orden escriba el sistema operativo los bloques. Número de bloques = tamaño del programa / 256.', q: mcq('¿Cuántos bloques UF2 tiene un programa de 128 KB?', ['512', '256', '1024', '250'], '131 072 / 256 = 512.') },
      { title: 'Un sobre por cada trozo', text: 'Imagina que envías un libro por correo en sobres sueltos: en cada sobre escribes la página que lleva. Llegue en el orden que llegue, el destinatario lo monta bien.\nEso hace UF2: cada bloque dice a qué dirección va. Y como el sobre también dice para qué chip es, la ROM de una Pico 2 no graba el UF2 de una Pico.', q: mcq('¿Por qué la ROM de una Pico 2 no graba el UF2 compilado para una Pico?', ['Cada bloque lleva el identificador de familia de otro chip', 'Porque el fichero es demasiado grande', 'Porque los bloques llegan desordenados', 'Sí lo graba sin problema'], 'Familia distinta, bloques ignorados.') },
      { title: 'Míralo', text: 'Mueve el tamaño del programa: cada bloque son 256 bytes de programa dentro de 512 de fichero. Por eso el .uf2 ocupa el doble que el programa.', ...tune('rp_bootv', P.boot()), q: mcq('Un programa de 32 KB, ¿cuánto ocupa como .uf2?', ['64 KB', '32 KB', '16 KB', '128 KB'], '128 bloques × 512 bytes = 64 KB.') }
    ] },
    rp_xip: { name: 'La caché XIP: aciertos y fallos', alts: [
      { title: 'Ejecutar en el sitio', text: 'El RP2040 no copia tu programa a la RAM: lo lee de la flash externa <b>sobre la marcha</b> (XIP, ejecutar en el sitio). Para no esperar a la flash en cada instrucción, una <b>caché de 16 KB</b> guarda lo que se ha usado hace poco.\nSi la instrucción está en la caché (acierto), va al momento; si no (fallo), hay que traerla por QSPI.', q: mcq('¿Qué pasa la primera vez que se ejecuta una función?', ['Es más lenta: hay que traerla de la flash a la caché', 'Es igual de rápida que siempre', 'Se copia entera a la RAM', 'No se puede ejecutar'], 'Las siguientes veces ya está en la caché.') },
      { title: 'La estantería y el almacén', text: 'Trabajas con una estantería pequeña al lado (la caché, 16 KB) y un almacén enorme al fondo (la flash, 2 MB). Lo que usas a menudo está en la estantería y lo coges al instante; lo demás, hay que ir a buscarlo.\nUn bucle que cabe en la estantería va rapidísimo. Uno de 40 KB obliga a ir al almacén una y otra vez.', q: mcq('Un bucle de 48 KB se repite sin parar. ¿Qué le pasa?', ['No cabe en la caché: buena parte se vuelve a leer de la flash en cada vuelta', 'Va igual que uno de 4 KB', 'Se borra de la flash', 'Da error'], 'Solo caben 16 KB a la vez.') },
      { title: 'Pruébalo', text: 'Cambia el tamaño del código que se repite y mira el porcentaje de aciertos y la velocidad. Luego pásalo a la RAM.', ...tune('rp_xipv', P.xip()), q: mcq('¿Qué haces con una rutina crítica que debe ir siempre a la misma velocidad?', ['Ejecutarla desde la RAM', 'Hacerla más larga', 'Ponerla en otro sector de la flash', 'Llamarla menos'], 'En RAM no depende de la caché ni de la flash.') }
    ] },
    rp_timerc: { name: 'Temporizadores del SDK en C', alts: [
      { title: 'Periódico o una vez', text: 'En C, <b>add_repeating_timer_ms(periodo, callback, datos, &amp;t)</b> llama al callback una y otra vez; <b>add_alarm_in_ms</b>, una sola vez.\nEl callback devuelve <b>true</b> para seguir y <b>false</b> para parar: return n &lt; 1000; se detiene tras mil llamadas.', q: mcq('Quieres apagar un LED 10 s después de pulsar, sin bloquear. ¿Qué usas en C?', ['add_alarm_in_ms', 'add_repeating_timer_ms', 'sleep_ms(10000)', 'GPIO_IRQ_EDGE_RISE'], 'Una sola vez, dentro de un tiempo: una alarma.') },
      { title: 'El signo del periodo', text: 'Con un periodo <b>negativo</b> (−10), el temporizador cuenta de inicio a inicio: ritmo fijo aunque el callback tarde. Con uno <b>positivo</b> (10), cuenta desde que el callback termina: si tarda 2 ms, el periodo real es de 12 ms.\nPara muestrear a ritmo fijo, negativo.', q: mcq('Muestreas a 1 kHz exactos con add_repeating_timer_us. ¿Qué periodo pasas?', ['−1000', '1000', '1', '−1'], 'Negativo y en microsegundos.') },
      { title: 'Pruébalo', text: 'Alarga lo que tarda el callback y compara el periodo positivo con el negativo: solo el negativo mantiene los 10 ms.', ...tune('rp_timercv', P.timerc()), q: mcq('Periodo +10 ms y un callback que tarda 3 ms. ¿Cada cuánto empieza?', ['Cada 13 ms', 'Cada 10 ms', 'Cada 7 ms', 'Cada 3 ms'], 'Cuenta desde que el callback acaba.') }
    ] }
  });

  /* ===================== UNA EXPLICACIÓN VISUAL POR CONCEPTO ===================== */
  const ALT = (k, title, text, vis, q) => { CONCEPTS[k].alts.push({ title, text, ...vis, q }); };
  ALT('rp_board', 'Míralo por dentro', 'Dentro del RP2040 hay dos núcleos, la RAM, una ROM y los periféricos. Fíjate en lo que queda <b>fuera</b> del chip: la flash con tu programa y el cristal.', { svg: S.chip }, mcq('En el dibujo, ¿qué pieza está fuera del RP2040?', ['La flash con el programa', 'La RAM', 'El PIO', 'El ADC'], 'El RP2040 no lleva memoria de programa dentro.'));
  ALT('rp_drive', 'Pruébalo', 'Elige una carga y mira lo que pide frente a lo que da el pin. Luego activa el transistor: el pin solo pone la orden.', tune('rp_drivev', P.drive()), mcq('Con el pin a 12 mA, ¿qué carga puedes conectar directamente?', ['Un LED de 10 mA', 'Un zumbador de 30 mA', 'Un relé de 70 mA', 'Un motor de 200 mA'], 'Solo lo que está por debajo de lo que da el pin.'));
  ALT('rp_family', 'Pruébalo', 'Elige chip y radio y mira qué placa sale y qué trae cada una.', tune('rp_famv', P.fam()), mcq('¿Qué placa tiene 520 KB de RAM pero no tiene radio?', ['Pico 2', 'Pico W', 'Pico', 'Pico 2 W'], 'RP2350 sin radio.'));
  ALT('rp_pinout', 'Pruébalo', 'Mueve el GPIO y mira en qué pata física está y qué funciones tiene. El número de pata y el de GPIO casi nunca coinciden.', tune('rp_pinv', P.pin()), mcq('¿En qué pata física está GP0?', ['En la 1', 'En la 0', 'En la 40', 'No sale al conector'], 'La pata 1 es GP0; la 3 ya es GND.'));
  ALT('rp_adcch', 'Pruébalo', 'Recorre los GPIO hasta encontrar los que tienen ADC. Solo GP26, GP27 y GP28 salen al conector.', tune('rp_pinv', P.pin({ n: sl('GPIO', 20, 0, 29) })), mcq('¿Qué canal del ADC es GP27?', ['1', '27', '0', '2'], '27 − 26 = 1.'));
  ALT('rp_levels', 'En un dibujo', 'A la izquierda, un divisor baja 5 V a 3,0 V para la Pico. A la derecha, los umbrales: el pin aguanta hasta 3,3 + 0,5 V, y un 74HCT entiende el 1 de la Pico, pero un 74HC a 5 V no.', { svg: S.levels }, mcq('Con 10 kΩ arriba y 15 kΩ abajo, ¿qué tensión deja el divisor desde 5 V?', ['3,0 V', '2,0 V', '3,3 V', '5,0 V'], '5 × 15 / 25 = 3,0 V.'));
  ALT('rp_i2c', 'Pruébalo', 'La pull-up es lo único que sube la línea, cargando la capacidad del bus. Cambia la resistencia y la capacidad y mira si el flanco llega a tiempo.', tune('rp_i2cv', P.i2c()), mcq('A 400 kHz con 100 pF, ¿qué pull-up eliges?', ['2,2 kΩ', '47 kΩ', '100 kΩ', 'Ninguna'], '0,85 × 2,2 kΩ × 100 pF ≈ 186 ns, menos de 300.'));
  ALT('rp_struct', 'Pruébalo', 'Mueve la temperatura y mira cómo se guarda en dos bytes: × 100, entero de 16 bits con signo y, en BLE, el byte bajo primero.', tune('rp_blev', P.ble()), mcq("¿Qué bytes envía struct.pack('<h', 300)?", ['0x2C y 0x01', '0x01 y 0x2C', '0x03 y 0x00', '0x12 y 0xC0'], '300 = 0x012C; con < va primero el bajo.'));
  ALT('rp_buses', 'En un dibujo', 'Compara los tres: I²C comparte dos hilos y elige por dirección; SPI comparte reloj y datos y elige con un CS por chip; UART cruza TX y RX y no lleva reloj.', { svg: S.buses }, mcq('¿Qué bus necesita un pin más por cada chip que añades?', ['SPI: un CS por chip', 'I²C', 'UART', 'Ninguno'], 'En I²C basta con la dirección.'));
  ALT('rp_power', 'Pruébalo', 'Cambia la batería, el diodo y el USB, y mira qué llega a VSYS, quién alimenta y si el regulador puede dar 3,3 V.', tune('rp_powv', P.pow()), mcq('¿Cuál es la tensión mínima en VSYS para que la Pico funcione?', ['Unos 1,8 V', '3,3 V', '5 V', '0,7 V'], 'El buck-boost trabaja de 1,8 a 5,5 V.'));
  ALT('rp_schottky', 'En un dibujo', 'Dos fuentes, cada una con su diodo, llegan a VSYS. Gana la de más tensión, y ningún diodo deja pasar corriente hacia atrás.', { svg: S.ordiode }, mcq('Con USB (4,7 V tras su diodo) y una LiPo a 3,7 V con su Schottky, ¿quién alimenta?', ['El USB', 'La batería', 'Los dos a medias', 'Ninguno'], '4,7 V > 3,4 V.'));
  ALT('rp_vsys', 'Pruébalo', 'Mira el divisor entre 3 y la tensión que ve GP29 mientras cambias la batería. Para volver a VSYS, multiplica por 3.', tune('rp_powv', P.pow({ vb: sl('Batería', 4, 0.5, 6, 0.1, 'V', 1), d: sl('Diodo (0 Schottky · 1 silicio)', 0, 0, 1) })), mcq('VSYS vale 4,5 V. ¿Qué ve GP29?', ['1,5 V', '4,5 V', '13,5 V', '3,3 V'], '4,5 / 3 = 1,5 V.'));
  ALT('rp_boot', 'Pruébalo', 'Pulsa BOOTSEL o vacía la flash y mira lo que decide la ROM.', tune('rp_bootv', P.boot()), mcq('Sin pulsar nada, la Pico aparece como RPI-RP2. ¿Por qué?', ['No hay un programa válido en la flash', 'El USB está roto', 'La ROM está borrada', 'Hay que formatearla'], 'Sin programa, la ROM se queda en modo USB.'));
  ALT('rp_flash', 'Pruébalo', 'Pon al otro núcleo a borrar un sector y mira qué le pasa al código que se ejecuta desde la flash. Luego pásalo a la RAM.', tune('rp_xipv', P.xip({ code: LST('Código que se repite', 8, [2, 4, 8, 16, 24, 32, 48, 64], 'KB') })), mcq('Mientras se borra un sector, ¿qué código puede seguir ejecutándose?', ['El que está en la RAM', 'El que está en la flash', 'Ninguno', 'Solo el de la caché, siempre'], 'La flash entera deja de responder mientras borra.'));
  ALT('rp_repl', 'Así se ve', 'El REPL es una conversación: escribes tras >>>, pulsas Intro y la placa contesta debajo. Ctrl+C para lo que esté en marcha.', { svg: S.repl }, mcq('Escribes 7 / 2 en el REPL. ¿Qué responde?', ['3.5', '3', '3,5 V', 'Nada hasta que lo guardes'], 'El REPL ejecuta cada línea al momento.'));
  ALT('rp_mainpy', 'El orden de arranque', 'Al encender, la ROM arranca MicroPython, que monta sus ficheros y ejecuta boot.py y main.py. Solo si main.py termina aparece el REPL.', { svg: S.bootseq }, mcq('main.py tiene un while True. ¿Cuándo verás el >>> sin pulsar nada?', ['Nunca: main.py no termina', 'Al momento', 'Tras boot.py', 'Tras un segundo'], 'Ctrl+C lo interrumpe.'));
  ALT('rp_pyops', 'Pruébalo', 'Reparte a caramelos en grupos de b: // cuenta los grupos enteros, % lo que sobra y / da la división con decimales.', tune('rp_opsv', P.ops()), mcq('¿Qué imprime print(23 // 4, 23 % 4)?', ['5 3', '5.75 3', '6 1', '5 2'], '23 = 5 × 4 + 3.'));
  ALT('rp_pytypes', 'En un dibujo', 'Tres cajas distintas: int crece sin límite, float tiene unas 7 cifras y str es texto. Para mezclarlas, conviertes con int(), float() o str().', { svg: S.types }, mcq("¿Qué imprime print(str(3) + '3')?", ['33', '6', 'TypeError', '3 3'], 'Dos textos se juntan.'));
  ALT('rp_bits', 'Pruébalo', 'Enciende bits y desplaza: cada bit vale el doble que el de su derecha y >> tira bits por la derecha.', tune('rp_bitv', P.bit()), mcq('¿Qué vale 40 >> 3?', ['5', '320', '37', '8'], '40 / 8 = 5.'));
  ALT('rp_python', 'En un dibujo', 'Los dos puntos abren un bloque y la sangría marca qué hay dentro. La primera línea que vuelve a la izquierda ya está fuera.', { svg: S.indent }, mcq("En el dibujo, si t vale 20, ¿qué se imprime?", ['fin', 'calor y fin', 'calor', 'Nada'], "Solo print('fin') está fuera del if."));
  ALT('rp_pyflow', 'Pruébalo', 'Mueve inicio, fin y paso: range empieza en el inicio, suma el paso y para antes del fin.', tune('rp_rangev', P.range()), mcq('¿Cuántos valores da range(3, 12, 3)?', ['3', '4', '12', '9'], '3, 6 y 9; el 12 ya no entra.'));
  ALT('rp_pyfunc', 'En un dibujo', 'Una función es una caja: entran parámetros (los que faltan toman su valor por defecto) y sale lo que diga return.', { svg: S.func }, mcq('def f(a, b=3): return a - b. ¿Qué da f(10)?', ['7', '13', '10', 'Error'], 'b toma su valor por defecto.'));
  ALT('rp_pylist', 'Pruébalo', 'Mueve el índice (también en negativo) y los extremos de la porción. La porción incluye el inicio y no el final.', tune('rp_listv', P.list()), mcq('v = [10, 20, 30, 40, 50]. ¿Qué es v[2:4]?', ['[30, 40]', '[20, 30]', '[30, 40, 50]', '[20, 30, 40]'], 'Desde el índice 2 hasta el 4 sin incluirlo.'));
  ALT('rp_pymem', 'Pruébalo', 'Elige cuántos números y en qué contenedor. Mira cuánto ocupa cada uno frente a la RAM libre.', tune('rp_memv', P.mem()), mcq("¿Qué contenedor gasta menos para 10 000 lecturas de 0 a 65535?", ["array('H')", 'Una lista', "array('f')", 'Una lista de float'], '2 bytes por lectura.'));
  ALT('rp_pyerr', 'Así se lee', 'Lee el traceback de abajo arriba: la última línea es el tipo de error y la de encima, dónde saltó.', { svg: S.trace }, mcq('En el dibujo, ¿en qué fichero está el fallo?', ['sensor.py, línea 5', 'main.py, línea 12', 'En el firmware', 'En el REPL'], 'La línea más baja con File.'));
  ALT('rp_pullup', 'En un dibujo', 'La resistencia de pull-up sube el pin a 1; el pulsador lo une a masa. Al pulsar cae de 1 a 0 (FALLING) y al soltar sube (RISING).', { svg: S.pullup }, mcq('¿Qué lee b.value() mientras sueltas el pulsador?', ['1', '0', 'Un valor al azar', 'Error'], 'El pull-up lo mantiene alto.'));
  ALT('rp_pin', 'En una tabla', 'Lo mismo en tres idiomas: Arduino, MicroPython y C con el SDK.', { svg: S.pinmap }, mcq('¿Cómo lees un pin en MicroPython?', ['b.value()', 'digitalRead(b)', 'gpio_get(b)', 'b.read_u16()'], 'value() sin argumento lee.'));
  ALT('rp_ticks', 'Pruébalo', 'Mete un retraso al detectar el plazo y compara las dos formas de calcular el siguiente: con ticks_ms() el error se acumula; con ticks_add, no.', tune('rp_ticksv', P.ticks()), mcq('Con antes = ticks_ms() y 5 ms de retraso en cada vuelta, ¿cuánto se desvía tras 100 cambios?', ['500 ms', '5 ms', '0 ms', '100 ms'], 'Cada vuelta suma sus 5 ms.'));
  ALT('rp_hwtiming', 'En un dibujo', 'Arriba, un bucle de Python: los periodos bailan y a veces hay una pausa larga. Abajo, el hardware: periodo exacto aunque la CPU esté ocupada.', { svg: S.jitter }, mcq('¿Qué genera una onda de 40 kHz sin temblor?', ['Un slice de PWM o una máquina PIO', 'Un bucle con toggle()', 'Un Timer de MicroPython', 'Un handler de interrupción'], 'El hardware dedicado no depende del intérprete.'));
  ALT('rp_pwmpy', 'Pruébalo', 'Mueve el ciclo de trabajo y mira duty_u16, el pulso y el brillo. A 50 Hz, el ancho del pulso es lo que lee un servo.', tune('rp_dutyv', P.duty()), mcq('¿Qué duty_u16 da un 40 %?', ['Unas 26 214', '40', 'Unas 102', '40 000'], '0,40 × 65535 ≈ 26 214.'));
  ALT('rp_pwmfreq', 'En un dibujo', 'Por debajo de unos 100 Hz se ve el parpadeo; hasta unos 20 kHz se puede oír; por encima, ni se ve ni se oye. Pero subir la frecuencia quita niveles.', { svg: S.pwmfreq }, mcq('¿Por qué no usas 2 MHz para atenuar un LED a 125 MHz?', ['Te quedarías con unos 62 niveles', 'Porque se oiría', 'Porque se vería parpadear', 'Porque quema el LED'], '125 000 000 / 2 000 000 ≈ 62.'));
  ALT('rp_pwmslice', 'Pruébalo', 'Elige dos pines y mira en qué slice y canal caen. Mismo slice: misma frecuencia.', tune('rp_slicev', P.slice()), mcq('¿Qué pin comparte slice con GP10?', ['GP11', 'GP12', 'GP9', 'GP20'], '10 y 11 son el slice 5, canales A y B.'));
  ALT('rp_pwmwrap', 'Pruébalo', 'Cambia el divisor y wrap y mira la frecuencia y los niveles: f = clk_sys / ((wrap + 1) × div).', tune('rp_pwm', PWMP()), mcq('125 MHz, divisor 125 y wrap 999. ¿Frecuencia?', ['1 kHz', '125 kHz', '1 MHz', '8 Hz'], '125 000 000 / (1000 × 125) = 1000 Hz.'));
  ALT('rp_phasecorrect', 'Pruébalo', 'Aquí el contador sube y baja: mira cómo el pulso queda centrado y la frecuencia es la mitad que en el modo normal.', tune('rp_pwm', PWMP({ pc: { val: 1, fixed: true } })), mcq('Fase correcta, 125 MHz, divisor 1 y wrap 999. ¿Frecuencia?', ['62,5 kHz', '125 kHz', '31,25 kHz', '250 kHz'], '125 000 000 / (2 × 1000).'));
  ALT('rp_adc16', 'Pruébalo', 'Mueve la tensión del pin y sigue la cadena: 12 bits del ADC, × 16 para read_u16 y vuelta a voltios con × 3,3 / 65535.', tune('rp_adcv', P.adc({ nz: LST('Ruido', 0, [0, 5, 20], 'cuentas') })), mcq('read_u16() da 49 151. ¿Tensión?', ['Unos 2,47 V', 'Unos 3,3 V', 'Unos 39,6 V', 'Unos 1,65 V'], '49 151 / 65 535 × 3,3 ≈ 2,47 V.'));
  ALT('rp_adcgood', 'Pruébalo', 'Con el potenciómetro quieto, el ADC tiembla. Sube el margen de histéresis hasta que dejen de salir mensajes.', tune('rp_hystv', P.hyst()), mcq('El ruido va de −10 a +10 cuentas. ¿Qué margen silencia los mensajes con el mando quieto?', ['Al menos 20 cuentas', '5 cuentas', '1 cuenta', '0'], 'De pico a pico son 20.'));
  ALT('rp_tempsens', 'Pruébalo', 'Cambia la temperatura y la referencia real: la tensión baja al calentarse, y una referencia mal supuesta da grados de error.', tune('rp_tempv', P.temp()), mcq('¿A qué temperatura da el sensor 0,706 V?', ['27 °C', '0 °C', '25 °C', '37 °C'], 'Es el punto de referencia de la fórmula.'));
  ALT('rp_irq', 'En un dibujo', 'Arriba, handlers cortos: el bucle apenas nota nada. Abajo, uno largo: mientras dura, todo lo demás espera.', { svg: S.irq }, mcq('¿Dónde pones el dibujo de la pantalla tras una pulsación?', ['En el bucle principal, al ver la bandera', 'Dentro del handler', 'En boot.py', 'En otro handler'], 'El handler solo avisa.'));
  ALT('rp_debounce', 'Pruébalo', 'Un pulsador rebota varias veces al cerrarse. Sube el antirrebote hasta contar una sola pulsación.', tune('rp_bouncev', P.bounce()), mcq('Los rebotes llegan con huecos de hasta 3 ms. ¿Qué antirrebote basta?', ['Más de 3 ms; en la práctica, 20–30 ms', '1 ms', '0 ms', '1 s'], 'Más que el hueco más largo entre rebotes.'));
  ALT('rp_timer', 'En un dibujo', 'Un Timer llama a tu función por su cuenta mientras el programa sigue: PERIODIC repite cada periodo y ONE_SHOT avisa una sola vez.', { svg: S.timer }, mcq('¿Qué modo usas para un aviso único dentro de 3 s?', ['Timer.ONE_SHOT', 'Timer.PERIODIC', 'Pin.IRQ_FALLING', 'time.sleep(3)'], 'Una sola vez.'));
  ALT('rp_volatile', 'En un dibujo', 'Sin volatile, el compilador puede leer la variable una vez y no volver a mirar. Y una variable de 64 bits se lee en dos mitades: una interrupción en medio las mezcla.', { svg: S.volatile }, mcq('¿Qué haces para leer bien un uint64_t que cambia una interrupción?', ['Leerlo con las interrupciones desactivadas un instante', 'Solo marcarlo volatile', 'Leerlo dos veces', 'Ponerlo en la flash'], 'volatile no hace atómica la lectura.'));
  ALT('rp_async', 'Pruébalo', 'La tarea B espera dentro de su bucle. Compara time.sleep con await y mira cuánto se retrasa el parpadeo de A.', tune('rp_asyncv', P.async()), mcq('B hace time.sleep_ms(200) en cada vuelta. ¿Qué le pasa a A?', ['Se retrasa hasta 200 ms', 'Nada', 'Va más rápido', 'Se ejecuta en el otro núcleo'], 'time.sleep no cede el turno.'));
  ALT('rp_sdk', 'En un dibujo', 'Del código a la placa: CMake prepara, gcc compila, el enlazador une y salen el .elf y el .uf2.', { svg: S.sdk }, mcq('¿Qué paso descarta las partes del SDK que no usas?', ['El enlazador', 'CMake', 'BOOTSEL', 'picotool'], 'Solo une lo que alguien llama.'));
  ALT('rp_cmake', 'Pruébalo', 'Quita la biblioteca, activa el stdio por USB o las salidas extra, y mira qué compila y qué sale.', tune('rp_linkv', P.link()), mcq('Usas adc_read() pero no enlazas hardware_adc. ¿Qué pasa?', ['No encuentra hardware/adc.h al compilar', 'Compila y el ADC lee 0', 'Funciona igual', 'Se borra la flash'], 'Enlazar la biblioteca añade sus cabeceras.'));
  ALT('rp_stdio', 'En un dibujo', 'El USB tarda un rato en aparecer como puerto serie tras el arranque: lo que imprimas antes se pierde.', { svg: S.stdio }, mcq('¿Qué haces antes del primer printf importante?', ['Esperar a stdio_usb_connected()', 'Bajar el baudio', 'Llamar a printf dos veces', 'Desactivar el USB'], 'Así el ordenador ya escucha.'));
  ALT('rp_overflow', 'Pruébalo', 'Un contador de 8 bits da la vuelta en 256. Pon «ahora» por debajo de «antes» y compara la resta normal con ticks_diff.', tune('rp_wrapv', P.wrap()), mcq('Contador de 8 bits: antes = 250, ahora = 6. ¿Cuántos pasos han pasado?', ['12', '−244', '244', '6'], '250 → 255 son 5, más 7 hasta el 6: 12.'));
  ALT('rp_swd', 'En un dibujo', 'GDB y OpenOCD en el PC, una sonda por USB y tres hilos a la Pico: SWCLK, SWDIO y GND.', { svg: S.swd }, mcq('¿Qué programa traduce las órdenes de GDB para la sonda?', ['OpenOCD', 'CMake', 'Thonny', 'picotool'], 'GDB habla con OpenOCD, y OpenOCD con la sonda.'));
  ALT('rp_hardfault', 'Pruébalo', 'Mueve la dirección y el tamaño del acceso: el M0+ exige 16 bits en direcciones pares y 32 bits en múltiplos de 4.', tune('rp_alignv', P.align()), mcq('¿Qué acceso es válido en un M0+?', ['uint32_t en 0x20000008', 'uint32_t en 0x20000006', 'uint16_t en 0x20000003', 'uint32_t en 0x20000001'], '8 es múltiplo de 4.'));
  ALT('rp_dbgpin', 'Pruébalo', 'El GPIO sube al entrar en la rutina y baja al salir. Cambia el pulso y la repetición y mira qué parte del tiempo ocupa.', tune('rp_dbgv', P.dbg()), mcq('Pulso de 50 µs cada 200 µs. ¿Qué fracción ocupa la rutina?', ['25 %', '4 %', '50 %', '75 %'], '50 / 200.'));
  ALT('rp_clock', 'Pruébalo', 'Multiplica los 12 MHz con FBDIV y divide con los dos POSTDIV. El VCO debe quedar entre 750 y 1600 MHz.', tune('rp_pll', PLLP()), mcq('FBDIV 125, POSTDIV1 5 y POSTDIV2 2. ¿Frecuencia?', ['150 MHz', '1500 MHz', '300 MHz', '125 MHz'], '1500 / 10 = 150.'));
  ALT('rp_clksys', 'Pruébalo', 'Cambia clk_sys y mira qué se mueve: el PWM y el PIO cambian de velocidad; el USB y el ADC, no.', tune('rp_clktv', P.clkt()), mcq('Un programa PIO va a 115 200 baudios con 125 MHz. Subes clk_sys a 250 MHz sin tocar el divisor. ¿Baudios?', ['230 400', '115 200', '57 600', '0'], 'La máquina va al doble.'));
  ALT('rp_overclock', 'En un dibujo', 'El reloj de la flash sale de clk_sys con un divisor. Si subes mucho clk_sys, la flash no da abasto; con un divisor mayor vuelve a ir.', { svg: S.qspi }, mcq('A 300 MHz el programa se cuelga desde la flash. ¿Qué cambias primero?', ['El divisor del reloj de la flash', 'El PLL del USB', 'El divisor del ADC', 'El LED'], 'La flash tiene una frecuencia máxima.'));
  ALT('rp_cores', 'Pruébalo', 'Un lazo de control necesita 0,2 ms cada milisegundo y la WiFi mete ráfagas. Compara tenerlo todo en un núcleo con repartirlo.', tune('rp_coresv', P.cores()), mcq('Con todo en el núcleo 0, ¿qué hace una ráfaga de WiFi de 2 ms?', ['Retrasa el control y le hace perder plazos', 'No le afecta', 'Acelera el control', 'Apaga el núcleo 1'], 'El control espera a que acabe la ráfaga.'));
  ALT('rp_pio', 'En un dibujo', 'Un bloque PIO: cuatro máquinas, cada una con sus registros, sus dos FIFO y su divisor, y una memoria de 32 instrucciones para todas.', { svg: S.pioblk }, mcq('¿Qué comparten las cuatro máquinas de un bloque?', ['La memoria de 32 instrucciones', 'Los registros X e Y', 'Las FIFO', 'El divisor de reloj'], 'Lo demás es de cada máquina.'));
  ALT('rp_pioins', 'Pruébalo', 'Cambia el valor inicial de X y avanza ciclo a ciclo: jmp(x_dec) repite el cuerpo X + 1 veces.', tune('rp_pioloop', P.pioloop()), mcq('Con X = 2 al empezar, ¿cuántos pulsos salen?', ['3', '2', '1', '4'], 'Salta con 2 y con 1: tres pasadas.'));
  ALT('rp_piocycles', 'Pruébalo', 'Avanza ciclo a ciclo y cambia los retardos: cada instrucción dura 1 ciclo más su retardo.', tune('rp_piostep', P.piostep()), mcq('set(pins, 1) [5] y set(pins, 0) [1]. ¿Periodo?', ['8 ciclos', '6 ciclos', '7 ciclos', '2 ciclos'], '6 + 2.'));
  ALT('rp_pioshift', 'Pruébalo', 'Cambia la dirección del desplazamiento y dónde colocas el dato con sm.put y mira qué bits salen primero.', tune('rp_osrv', P.osr()), mcq('SHIFT_LEFT y sm.put(dato) sin desplazar, con un dato de 8 bits. ¿Qué sale primero?', ['Ceros: el dato está abajo y sale lo de arriba', 'El bit 7 del dato', 'El bit 0 del dato', 'Nada'], 'Hay que subirlo con sm.put(dato, 24).'));
  ALT('rp_piosideset', 'Pruébalo', 'Reparte los 5 bits entre side-set y retardo y mira el retardo máximo que te queda.', tune('rp_ssv', P.ss()), mcq('Con 1 pin de side-set opcional, ¿retardo máximo?', ['7', '15', '31', '3'], '1 + 1 bit de marca = 2; quedan 3 bits.'));
  ALT('rp_piodiv', 'Pruébalo', 'Elige reloj, baudios y ciclos por bit y mira si el divisor cabe entre 1 y 65 536.', tune('rp_piodivv', P.piodiv()), mcq('125 MHz, 4 ciclos por bit y 1 Mbit/s. ¿Divisor?', ['31,25', '125', '4', '500'], '125 000 000 / 4 000 000.'));
  ALT('rp_pioidle', 'En un dibujo', 'La máquina deja los pines como estaban mientras espera. En una UART deben quedarse altos; en una WS2812, bajos.', { svg: S.idle }, mcq('Tu transmisor UART espera en un pull. ¿Qué instrucción debe ir justo antes?', ['La que deja la línea alta (bit de parada)', 'Una que la deje baja', 'Ninguna', 'Un wait'], 'Esperar en reposo.'));
  ALT('rp_piompy', 'En un dibujo', 'Cada tipo de instrucción mueve su propio grupo de pines, que eliges al crear la StateMachine.', { svg: S.smmap }, mcq('Tu programa usa in_(pins, 1). ¿Qué base necesitas?', ['in_base', 'set_base', 'out_base', 'sideset_base'], 'Cada instrucción, su base.'));
  ALT('rp_ws2812', 'Pruébalo', 'Elige el reloj de la máquina y los ciclos en alto de cada bit, y mira si los tiempos caen dentro de la tolerancia de la tira.', tune('rp_ws', WSP()), mcq('Máquina a 8 MHz. ¿Cuántos ciclos dura un bit de 1,25 µs?', ['10', '8', '12,5', '1,25'], '1,25 × 8.'));
  ALT('rp_pioc', 'Pruébalo', 'Carga programas de distinto tamaño en un bloque: cada uno queda en su offset y entre todos no pueden pasar de 32.', tune('rp_piomemv', P.piomem()), mcq('Programas de 20 y 14 instrucciones en el mismo bloque. ¿Caben?', ['No: suman 34', 'Sí: 32 por programa', 'Sí, si son iguales', 'Solo en C'], 'Las 32 son de todo el bloque.'));
  ALT('rp_uartproto', 'Pruébalo', 'Cambia la diferencia de baudios y dónde lee el receptor cada bit: leyendo en el centro aguantas más error.', tune('rp_uartrx', P.uartrx()), mcq('¿Por qué el error de baudio afecta más al bit de parada?', ['El desfase se acumula bit a bit desde el inicio', 'Porque es más corto', 'Porque es alto', 'No le afecta más'], 'Es el último en leerse.'));
  ALT('rp_encoder', 'Pruébalo', 'Mueve el encoder paso a paso: A y B cambian de uno en uno siguiendo 00, 01, 11, 10.', tune('rp_encv', P.enc()), mcq('AB pasa de 10 a 00. Si 00 → 01 → 11 → 10 es avanzar, ¿qué ha hecho?', ['Avanzar un paso', 'Retroceder un paso', 'Nada', 'Dos pasos'], '10 → 00 cierra el círculo hacia delante.'));
  ALT('rp_dma', 'Pruébalo', 'Copia las muestras con la CPU o con el DMA y mira cuánto tiempo de CPU queda libre.', tune('rp_dma', DMAP()), mcq('Con el DMA copiando del ADC, ¿qué hace la CPU?', ['Lo que quiera: está libre', 'Copiar también', 'Esperar cada muestra', 'Nada: se apaga'], 'La CPU solo lanza y recoge.'));
  ALT('rp_dmacfg', 'En un dibujo', 'Un canal típico: lee siempre de la misma dirección (el FIFO del ADC), escribe avanzando en el búfer, cuenta N transferencias y espera al DREQ del ADC.', { svg: S.dmacfg }, mcq('Copias un búfer de RAM a la TX FIFO de un PIO. ¿Qué dirección avanza?', ['La de lectura (el búfer)', 'La de escritura (la FIFO)', 'Las dos', 'Ninguna'], 'La FIFO es siempre la misma dirección.'));
  ALT('rp_dmatime', 'Pruébalo', 'Cambia muestras y frecuencia de muestreo: con DREQ, el tiempo es muestras / frecuencia.', tune('rp_dma', DMAP({ m: { val: 1, fixed: true } })), mcq('2048 muestras a 100 ksps. ¿Tiempo?', ['20,48 ms', '2,048 ms', '204,8 ms', '0,2 ms'], '2048 / 100 000 s.'));
  ALT('rp_adcdiv', 'Pruébalo', 'Elige div y mira el ritmo de muestreo: una muestra cada (div + 1) ciclos de 48 MHz, sin bajar de 96 ciclos.', tune('rp_adcdivv', P.adcdiv()), mcq('¿Qué ritmo da div = 479?', ['100 000 muestras/s', '48 000', '500 000', '479'], '48 000 000 / 480.'));
  ALT('rp_dmachain', 'Pruébalo', 'Dos búferes que se alternan: mira si tu proceso acaba antes de que el DMA vuelva a pisar el búfer.', tune('rp_ppv', P.pp()), mcq('Cada búfer tarda 5 ms en llenarse. ¿Cuánto puede tardar tu proceso de cada uno?', ['Menos de 5 ms', 'Lo que quiera', '10 ms', '2,5 ms exactos'], 'Lo que tarda en llenarse el otro.'));
  ALT('rp_dmaring', 'Pruébalo', 'Mueve el inicio del búfer y el tamaño del anillo: solo si el inicio es múltiplo del tamaño, la vuelta cae en tu propio búfer.', tune('rp_ringv', P.ring()), mcq('Anillo de 512 bytes. ¿Qué inicio vale?', ['0x20000400', '0x20000500', '0x20000100', '0x20000480'], '0x400 = 1024, múltiplo de 512.'));
  ALT('rp_corefifo', 'Pruébalo', 'Cambia lo que escribe un núcleo y lo que lee el otro: si escribe más deprisa, la FIFO se llena y el que escribe espera.', tune('rp_fifov', P.fifo({ dp: LST('Capacidad', 8, [4, 8], 'palabras') })), mcq('Escribe 2 palabras por ms y lee 1. ¿Cuándo se llena una FIFO de 8, como la del RP2040?', ['A los 8 ms', 'A los 4 ms', 'Nunca', 'Al momento'], 'Sube 1 palabra por ms.'));
  ALT('rp_multicore', 'Pruébalo', 'Cambia cuándo empieza el núcleo 1: si los dos leen antes de que el otro escriba, se pierde una suma.', tune('rp_race', RACEP(0)), mcq('¿Qué hace falta para que se pierda una suma?', ['Que los dos lean el valor antes de que el otro escriba', 'Que los dos escriban a la vez siempre', 'Que la variable sea global', 'Nada: nunca se pierde'], 'Lecturas solapadas.'));
  ALT('rp_lock', 'En un dibujo', 'Interbloqueo: cada núcleo tiene un cerrojo y espera el del otro. Nadie avanza. Se evita tomándolos siempre en el mismo orden.', { svg: S.deadlock }, mcq('¿Qué regla evita el interbloqueo con dos cerrojos?', ['Tomarlos siempre en el mismo orden', 'Tomarlos al azar', 'No soltarlos nunca', 'Usar sleep entre ellos'], 'Así nunca se cierra el círculo.'));
  ALT('rp_usb', 'En un dibujo', 'Por un solo cable, la Pico puede ser varias clases estándar: HID, CDC, MSC o MIDI. El sistema ya trae sus controladores.', { svg: S.usbcls }, mcq('¿Qué clase es un puerto serie virtual?', ['CDC', 'HID', 'MSC', 'MIDI'], 'Communications Device Class.'));
  ALT('rp_usbenum', 'Pruébalo', 'Avanza paso a paso por la enumeración: del cable al controlador cargado.', tune('rp_usbv', P.usb()), mcq('¿En qué paso lee el anfitrión el VID y el PID?', ['Al pedir el descriptor de dispositivo', 'Al asignar la dirección', 'Al cargar el controlador', 'Al conectar el cable'], 'El descriptor dice quién eres.'));
  ALT('rp_tinyusb', 'En un dibujo', 'Arriba, el bucle llama a tud_task() a menudo. Abajo, un sleep largo deja el USB sin atender.', { svg: S.tud }, mcq('¿Cómo parpadeas un LED sin dejar de atender el USB?', ['Mirando el tiempo en cada vuelta, sin sleep largos', 'Con sleep_ms(500)', 'Dentro de tud_task()', 'No se puede'], 'El bucle no debe bloquearse.'));
  ALT('rp_hid', 'Pruébalo', 'Forma el informe: suma los bits de los modificadores y elige la tecla. Recuerda el informe de soltar.', tune('rp_hidv', P.hid()), mcq('¿Qué byte de modificadores es Ctrl + Mayús + Alt (izquierdos)?', ['0x07', '0x06', '0x05', '0x0F'], '1 + 2 + 4.'));
  ALT('rp_midi', 'Pruébalo', 'Elige tipo y canal y mira el byte de estado: tipo arriba, canal − 1 abajo, y el bit 7 a 1.', tune('rp_midiv', P.midi()), mcq('Note Off del canal 16. ¿Byte de estado?', ['0x8F', '0x80', '0x90', '0xF8'], 'Tipo 8, canal 16 − 1 = 15 = F.'));
  ALT('rp_wifi', 'Pruébalo', 'Prueba red, banda, clave y espera máxima: mira el estado y si el programa sigue vivo.', tune('rp_wifiv', P.wifi()), mcq('La clave es mala y no pusiste límite de espera. ¿Qué pasa?', ['El programa se queda esperando para siempre', 'Se conecta igual', 'Prueba otra red', 'Se reinicia'], 'isconnected() nunca será True.'));
  ALT('rp_netclient', 'En un dibujo', 'Sin r.close(), cada respuesta se queda con su memoria y la RAM libre baja escalón a escalón hasta el MemoryError.', { svg: S.sock }, mcq('¿Qué evita que la RAM baje con cada petición?', ['Cerrar cada respuesta con r.close()', 'Hacer menos print', 'Usar HTTPS', 'Apagar el ADC'], 'Libera el socket.'));
  ALT('rp_net', 'Pruébalo', 'Cambia la ruta y el método y mira la petición y la respuesta completas.', tune('rp_httpv', P.http()), mcq('¿Qué cabecera dice que la respuesta es JSON?', ['Content-Type: application/json', 'Host: json', 'GET /json', 'HTTP/1.0 200 JSON'], 'El tipo de contenido va en Content-Type.'));
  ALT('rp_netsec', 'En un dibujo', 'Sin puertos abiertos en el router, desde Internet no se llega a la Pico. Solo tu red local la ve.', { svg: S.netsec }, mcq('¿Qué haces para usar tu servidor casero desde fuera con seguridad?', ['Entrar a tu red por una VPN', 'Abrir el puerto 80 en el router', 'Cambiar al puerto 8080', 'Quitar la clave del WiFi'], 'Nada abierto directamente.'));
  ALT('rp_radio', 'En un dibujo', 'La Pico W solo trabaja en 2,4 GHz (canales 1 a 13 en Europa). Las redes de 5 GHz no las ve.', { svg: S.radio }, mcq('¿Puede la Pico W crear su propia red WiFi en 5 GHz?', ['No: solo trabaja en 2,4 GHz', 'Sí', 'Solo en Canarias', 'Solo con BLE'], 'Su radio es de 2,4 GHz.'));
  ALT('rp_ble', 'En un dibujo', 'La Pico se anuncia; el móvil la ve y se conecta. Dentro, servicios con características que se leen, se escriben o se notifican.', { svg: S.ble }, mcq('¿Qué agrupa varias características?', ['Un servicio', 'Un anuncio', 'Un UUID', 'Un central'], 'Servicio → características.'));
  ALT('rp_sleep', 'Pruébalo', 'Cambia de modo y de forma de despertar: en dormant no hay oscilador, así que un temporizador no puede despertarte.', tune('rp_sleepv', P.sleep()), mcq('¿Qué modo conserva las variables al despertar en MicroPython?', ['lightsleep', 'deepsleep', 'dormant con reinicio', 'Ninguno'], 'deepsleep reinicia el programa.'));
  ALT('rp_lowpower', 'En un dibujo', 'Para medir el consumo, el multímetro va en serie con la batería que alimenta VSYS, y con el USB desconectado.', { svg: S.meter }, mcq('¿En qué escala empiezas al medir el consumo?', ['mA, y bajas a µA cuando duerma', 'µA directamente', 'Voltios', '10 A siempre'], 'Empezar alto evita fundir el fusible del multímetro.'));
  ALT('rp_avg', 'Pruébalo', 'Cambia lo que gasta despierto, cuánto tiempo, el periodo y lo que gasta dormido. Mira qué término manda en la media.', tune('rp_avgv', P.avg()), mcq('Un nodo duerme casi siempre a 0,5 mA y despierta muy poco. ¿Qué bajarías primero?', ['El consumo dormido', 'El tiempo despierto', 'La batería', 'El periodo'], 'Si domina el dormido, eso es lo que hay que bajar.'));
  ALT('rp_hw', 'En un dibujo', 'Lo mínimo: regulador de 3,3 V, desacoplos, cristal, flash, botones y USB. El 1,1 V del núcleo lo genera el propio chip.', { svg: S.hw }, mcq('¿Qué necesita el USB del RP2040 en D+ y D−?', ['Resistencias de 27 Ω en serie', 'Condensadores de 1 µF a masa', 'Pull-ups de 5,1 kΩ', 'Nada'], 'Cerca del chip.'));
  ALT('rp_crystal', 'Pruébalo', 'Elige los condensadores para que el cristal vea su carga: C / 2 + parásitos ≈ CL.', tune('rp_xtalv', P.xtal()), mcq('CL = 20 pF y 5 pF parásitos. ¿Condensadores?', ['30 pF', '20 pF', '40 pF', '15 pF'], '2 × (20 − 5) = 30.'));
  ALT('rp_layout', 'En un dibujo', 'Primero el chip; después, pegados, la flash, el cristal y los desacoplos. Los conectores, en los bordes.', { svg: S.layout }, mcq('¿Qué pistas deben ser lo más cortas posible?', ['Las del cristal y las QSPI de la flash', 'Las de los LED', 'Las del conector de pilas', 'Da igual'], 'Son las más rápidas o sensibles.'));
  ALT('rp_hwflash', 'En un dibujo', 'El BOOTSEL une el CS de la flash con masa a través de 1 kΩ: así la ROM lo ve bajo al arrancar sin crear un cortocircuito.', { svg: S.bootsel }, mcq('¿A qué señal se conecta el BOOTSEL?', ['Al CS de la flash (QSPI_SS)', 'A RUN', 'A VBUS', 'A GP25'], 'Por eso la ROM no ve la flash.'));
  ALT('rp_bringup', 'Pruébalo', 'Esconde un fallo y sigue la puesta en marcha: cada paso descarta una parte de la placa.', tune('rp_bringv', P.bring()), mcq('Aparece RPI-RP2 pero el programa no arranca. ¿Qué parte revisas?', ['La flash', 'El cristal', 'El regulador de 3,3 V', 'El USB'], 'El modo BOOTSEL no la necesita.'));
  ALT('rp_product', 'En una lista', 'Lo que separa un prototipo de un producto: normas, identificadores y protecciones.', { svg: S.product }, mcq('¿Qué directiva se añade si tu producto lleva WiFi?', ['La de equipos radioeléctricos (RED)', 'Ninguna', 'La de juguetes', 'La de baja tensión, solo'], 'La radio tiene su propia directiva.'));

  /* ===================== TEMARIO ===================== */
  // Atajos para los pasos nuevos
  const EX = (text, viz, params, tasks, x = {}) => ({ t: 'explore', text, viz, params, tasks, ...x });
  const ST = (text, steps, result, x = {}) => ({ t: 'steps', text, steps, result, ...x });
  const PQ = (q, o, e, c, h, x = {}) => Q(q, o, e, { predict: true, c, h, ...x });
  const TK = (q, min, max, text, done, hint) => ({ q, min, max, text, done, hint });

  const M1 = [
    L('rp1', 'De Arduino a la Pico', 'chip', ['rp_board', 'rp_drive'], [
      PQ('Tu Uno tiene 2 KB de RAM. El chip de la Pico cuesta parecido. ¿Cuánta RAM crees que tiene?', ['Más de cien veces más: 264 KB', 'Lo mismo: 2 KB', 'El doble: 4 KB', 'Diez veces más: 20 KB'], 'Unas 132 veces más. Y no es lo único que cambia: vamos a verlo.', 'rp_board', 'Es un chip de 32 bits mucho más moderno que el de la Uno.'),
      I('La <b>Raspberry Pi Pico</b> es una placa pequeña con el chip <b>RP2040</b>. No tiene Linux ni sistema operativo: tu programa es lo único que corre, como en la Uno.\nFíjate en el dibujo: dentro hay dos núcleos (las partes que ejecutan instrucciones), RAM y periféricos; la flash con tu programa va <b>fuera</b>.', { svg: S.chip, more: 'Las Raspberry Pi «grandes» son ordenadores con Linux. La Pico es otra cosa: un microcontrolador, como la Uno.\nEl nombre del chip se lee así: RP (Raspberry Pi) · 2 núcleos · 0 = tipo de núcleo (Cortex-M0+) · 4 = cantidad de RAM (264 KB, más de 16 KB × 2⁴) · 0 = sin flash interna.\nLa flash externa se une al chip por un bus rápido de cuatro hilos de datos, el QSPI.' }),
      { t: 'match', q: 'Une cada chip o placa con lo que lo describe.', pairs: [['ATmega328P', '8 bits, 16 MHz, 2 KB de RAM'], ['RP2040', '2 núcleos de 32 bits, 264 KB de RAM'], ['Raspberry Pi 4', 'Ordenador con Linux'], ['ESP32', 'WiFi y Bluetooth integrados']], c: 'rp_board', h: 'La Uno es de 8 bits; el único que ejecuta Linux es un ordenador.' },
      I('Un núcleo de <b>32 bits</b> suma dos números de 32 bits en una instrucción. El AVR de la Uno, de 8 bits, tiene que encadenar cuatro sumas.\nY el reloj: 16 MHz en la Uno, 133 MHz en el RP2040 (y Raspberry Pi certificó después 200 MHz).', { svg: S.add32 }),
      ST('Un long de Arduino tiene 32 bits. ¿Cuántas sumas necesita cada chip para sumar dos long?', ['Un long son 4 bytes', 'El AVR suma de 8 en 8 bits: 4 sumas, las tres últimas con acarreo', 'El Cortex-M0+ suma los 32 bits de golpe: 1 instrucción', 'Además, cada instrucción va con un reloj unas 8 veces más rápido'], 'Uno: 4 sumas · Pico: 1 suma'),
      EX('Un GPIO da poca corriente. Elige la carga, la fuerza del pin y prueba con y sin transistor.', 'rp_drivev', P.drive(), [
        TK('direct', 1, 1, 'Sin transistor, elige una carga que el pin pueda mover', 'Un LED de pocos mA cabe en lo que da el pin.', 'Baja la carga por debajo de la fuerza del pin.'),
        TK('viaT', 1, 1, 'Ahora mueve el relé de 70 mA o el motor sin pedirle más al pin', 'Con un transistor, el pin solo da la orden (≈ 1 mA) y la corriente sale de otra fuente.', 'Activa el transistor y sube la carga.')]),
      I('Cada GPIO da unos <b>4 mA</b> por defecto (se puede configurar a 2, 8 o 12 mA). Basta para un LED; para relés, motores o tiras de LEDs, el pin gobierna un <b>transistor</b>, y con cargas inductivas, un <b>diodo de rueda libre</b>.', { svg: S.relay, more: 'Es lo mismo que viste con la Uno en el curso base, con dos diferencias: la Pico trabaja a 3,3 V y da menos corriente por pin. Un MOSFET de nivel lógico que conduzca bien con 3,3 V en la puerta también vale.' }),
      Q('¿Qué NO lleva dentro el RP2040?', ['Memoria flash para el programa', 'RAM', 'Un controlador USB', 'Un ADC'], 'La flash QSPI está en la placa, al lado del chip.', { c: 'rp_board', h: 'Mira el dibujo: ¿qué estaba fuera del chip?' }),
      Nm('264 KB de RAM frente a 2 KB de la Uno. ¿Cuántas veces más?', 132, 'veces', '264 / 2 = 132.', { c: 'rp_board', h: 'Divide una cantidad entre la otra.' }),
      Q('Quieres activar un relé de 70 mA desde un GPIO de la Pico.', ['Con un transistor o MOSFET y su diodo de rueda libre', 'Directo al pin configurado a 12 mA', 'Con una resistencia de 10 Ω en serie', 'Desde el pin 3V3_EN'], 'El GPIO solo da la señal de control.', { c: 'rp_drive', h: 'Compara 70 mA con lo máximo que da un pin.' }),
      Q('Un LED rojo con su resistencia pide 3 mA. ¿Puedes conectarlo directamente a un GPIO?', ['Sí: está por debajo de lo que da el pin', 'No: siempre hace falta un transistor', 'Solo si configuras 12 mA', 'Solo en GP25'], 'Con 4 mA por defecto ya llega.', { c: 'rp_drive', h: '¿3 mA es más o menos que los 4 mA por defecto?' }),
      Q('Sumas dos números de 32 bits. ¿Qué ventaja tiene el núcleo de 32 bits?', ['Lo hace en una instrucción en vez de en varias', 'Ninguna', 'Que tiene más pines', 'Que no necesita reloj'], 'El AVR tiene que encadenar cuatro sumas de 8 bits con acarreo.', { c: 'rp_board', h: 'Piensa en el ejemplo resuelto del long.' }),
      Q('En el nombre «RP2040», el último 0 indica…', ['Que no lleva flash dentro', 'Que es la primera versión', 'Que funciona a 0 V', 'Que no tiene periféricos'], 'RP · 2 núcleos · tipo 0 (M0+) · 4 (RAM) · 0 de flash interna.', { c: 'rp_board', h: 'Cada cifra describe una parte del chip; la última, la memoria no volátil.' }),
      Q('¿Con qué lenguajes puedes programar la Pico?', ['MicroPython, C/C++ con el SDK oficial y otros como Arduino o Rust', 'Solo MicroPython', 'Solo C', 'Solo Scratch'], 'En esta especialidad empezarás en MicroPython y bajarás a C.', { c: 'rp_board', h: 'Hay varias opciones; busca la respuesta que no limita.' }),
      I('<b>Resumen</b>\n· RP2040: <b>dos núcleos de 32 bits</b>, 264 KB de RAM, periféricos y <b>PIO</b>.\n· La flash con el programa va <b>fuera</b> del chip.\n· Un GPIO da unos 4 mA (hasta 12): para cargas grandes, <b>transistor</b>.', { svg: S.chip })
    ]),
    L('rp2', 'La familia: RP2040, RP2350 y la W', 'chip', ['rp_family'], [
      PQ('Necesitas WiFi. ¿Qué crees que tiene la Pico W que no tenga la Pico?', ['Un chip de radio aparte, junto al RP2040', 'Un RP2040 distinto, con WiFi dentro', 'Una antena metida en el USB', 'Nada: es la misma placa con otro programa'], 'El RP2040 no tiene radio: la W añade un chip CYW43439 conectado por SPI.', 'rp_family', 'El RP2040 es el mismo en las dos placas.'),
      EX('Elige el chip y si lleva radio, y mira qué placa sale y qué trae.', 'rp_famv', P.fam(), [
        TK('code', 1, 1, 'Elige la placa con RP2040 y WiFi', 'Pico W: la radio va en un chip aparte, unido por SPI.', 'Activa la radio sin cambiar el chip.'),
        TK('code', 2, 2, 'Ahora la de 520 KB de RAM, sin radio', 'Pico 2: el RP2350 trae más RAM y 12 máquinas PIO.', 'Cambia el chip y quita la radio.'),
        TK('code', 3, 3, 'La que tiene coma flotante por hardware y WiFi', 'Pico 2 W: RP2350 + radio.', 'Necesitas el chip nuevo y la radio.')]),
      I('Cuatro placas con el mismo tamaño y casi el mismo pinout: dos chips (RP2040 y RP2350), con o sin radio.', { svg: S.family }),
      I('El <b>RP2350</b> es el hermano mayor: dos <b>Cortex-M33</b> a 150 MHz con <b>coma flotante por hardware</b> (o dos núcleos <b>RISC-V</b>, se elige al arrancar), 520 KB de SRAM, 3 bloques PIO y más canales.', { svg: S.rp2350, more: 'Trae además funciones de seguridad: arranque firmado, memoria OTP (se graba una vez) y TrustZone.\nEs otro chip: necesita su propio firmware. El UF2 de una Pico no vale para una Pico 2.\nLa coma flotante por hardware hace las cuentas con decimales mucho más deprisa; en el RP2040 se hacen con rutinas de software (bastante optimizadas, eso sí).' }),
      I('En las <b>W</b>, la radio usa varios pines internos del chip, y el LED de la placa cuelga de la radio, no de un GPIO normal. Por eso, al programar, ese LED tiene un nombre especial.', { svg: S.wled }),
      ST('Elige placa para una estación meteorológica con WiFi que hace muchas cuentas con decimales.', ['¿Necesita red? Sí → una W', '¿Muchos decimales? El RP2350 tiene coma flotante por hardware', 'RP2350 + radio = Pico 2 W', 'Firmware: el específico de la Pico 2 W'], 'Pico 2 W'),
      { t: 'match', q: 'Une cada placa con su chip.', pairs: [['Pico', 'RP2040 sin radio'], ['Pico W', 'RP2040 con WiFi y BLE'], ['Pico 2', 'RP2350 sin radio'], ['Pico 2 W', 'RP2350 con WiFi y BLE']], c: 'rp_family', h: 'El «2» indica el RP2350; la «W», la radio.' },
      Q('¿Qué cambia con el LED de la placa en la Pico W?', ['Está conectado al chip de radio, no a un GPIO del RP2040', 'No tiene LED', 'Es un LED RGB', 'Va al GP0'], 'En la Pico normal está en GP25.', { c: 'rp_family', h: 'Piensa en quién usa los pines internos en la W.' }),
      Q('Haces muchas cuentas con float. ¿Qué notarás en un RP2350 con Cortex-M33?', ['Van mucho más rápido: tiene unidad de coma flotante', 'Nada', 'Van más lentas', 'Que no admite float'], 'El M0+ del RP2040 hace la coma flotante con rutinas de software.', { c: 'rp_family', h: '¿Cuál de los dos chips tiene coma flotante por hardware?' }),
      Q('¿Puedes grabar en una Pico 2 el .uf2 compilado para una Pico?', ['No: cada chip tiene su firmware; usa el de tu placa', 'Sí, siempre', 'Solo si cambias el nombre del fichero', 'Solo si lo grabas dos veces'], 'El UF2 lleva un identificador de familia y el arranque rechaza el que no es suyo.', { c: 'rp_family', h: 'Son chips distintos.' }),
      Q('¿Qué significa poder elegir Arm o RISC-V en el RP2350?', ['El chip trae los dos tipos de núcleo y decides cuáles arrancan', 'Que la placa lleva dos chips', 'Que cambia la tensión de los pines', 'Que el RISC-V solo sirve para la WiFi'], 'Un mismo programa se compila para una u otra arquitectura.', { c: 'rp_family', h: 'Es una elección dentro del mismo chip.' }),
      Nm('¿Cuántos KB de SRAM más tiene el RP2350 que el RP2040?', 256, 'KB', '520 − 264 = 256 KB.', { c: 'rp_family', h: 'Resta 264 a 520.' }),
      Q('¿Cómo se comunica el RP2040 con el chip de radio de la Pico W?', ['Por una conexión SPI con varios GPIO internos', 'Por I²C', 'No se comunica: la radio va sola', 'Por el USB'], 'Por eso en la Pico W algunos pines internos tienen otro uso.', { c: 'rp_family', h: 'Es un bus rápido con reloj, que ya conoces del curso base.' }),
      I('<b>Resumen</b>\n· <b>Pico</b> = RP2040 · <b>Pico W</b> = RP2040 + radio · <b>Pico 2</b> = RP2350 · <b>Pico 2 W</b> = RP2350 + radio.\n· El RP2350 añade RAM, PIO y coma flotante por hardware.\n· Cada placa, su firmware. Todo lo de esta especialidad vale en las cuatro, con matices.', { svg: S.family })
    ]),
    L('rp3', 'El pinout y los 3,3 V', 'chip', ['rp_pinout', 'rp_levels', 'rp_adcch'], [
      PQ('En la placa, la pata número 20 está marcada como GP15. Para usarla en un programa, ¿qué número crees que escribirás?', ['15, el número de GPIO', '20, el de la pata', 'Cualquiera de los dos', '35 = 15 + 20'], 'Siempre el número de GPIO. La pata física solo sirve para encontrarlo en la placa.', 'rp_pinout', 'El código habla con el chip, no con la placa.'),
      EX('Recorre los GPIO: mira en qué pata física está cada uno y qué funciones tiene.', 'rp_pinv', P.pin(), [
        TK('phys', 20, 20, 'Busca el GPIO que está en la pata física 20', 'Es GP15: en el código usarás 15, no 20.', 'Está en la fila de arriba, al final.'),
        TK('adc', 0, 3, 'Busca un GPIO con entrada analógica (ADC)', 'Solo GP26, GP27 y GP28 en el conector; GP29 mide VSYS.', 'Están al final de la numeración.'),
        TK('hidden', 1, 1, 'Encuentra un GPIO que no salga al conector', 'GP23, GP24, GP25 y GP29 los usa la propia placa.', 'Prueba entre GP23 y GP25.')]),
      I('La Pico tiene 40 patas. La <b>pata física</b> no es el <b>número de GPIO</b>: la pata 1 es GP0, pero la 3 es GND y la 4 es GP2. En el código, siempre el número GP.', { svg: S.pins4, more: 'Las masas están repartidas para que siempre tengas una cerca: patas 3, 8, 13, 18, 23, 28 y 38, y la 33 es la masa analógica (AGND).' }),
      I('Cada GPIO tiene varias funciones (PWM, UART, I²C, SPI, PIO…), pero en <b>grupos fijos</b>: el I²C va por parejas que se alternan entre I²C0 e I²C1. Y algunos GPIO no salen: la placa los usa.', { svg: S.i2cpairs, more: 'Los demás periféricos siguen patrones parecidos: el TX de UART0 puede ir en GP0, GP12, GP16 o GP28. Mira el pinout antes de soldar: elegir mal obliga a rehacer cables.\nEn la Pico W, GP23, GP24, GP25 y GP29 hablan con la radio.' }),
      I('Los GPIO del <b>RP2040</b> trabajan a <b>3,3 V</b> y no toleran 5 V: el máximo es su alimentación más 0,5 V. Para bajar 5 V, un divisor; para subir 3,3 V a un chip de 5 V, uno que entienda 2 V como un 1 (familia HCT).', { svg: S.levels, more: 'El RP2350 es más tolerante: sus GPIO digitales aguantan 5 V con el chip alimentado, salvo los que pueden ser entradas del ADC. Sus salidas siguen siendo de 3,3 V.\nUn divisor vale para señales lentas; para señales rápidas o bidireccionales (como I²C), usa un adaptador de nivel.' }),
      ST('Un sensor de 5 V envía su salida a la Pico. Diseña un divisor.', ['Hay que pasar de 5 V a 3,3 V o algo menos', 'Divisor: V salida = 5 × R2 / (R1 + R2)', 'Con R1 = 10 kΩ y R2 = 15 kΩ: 5 × 15 / 25 = 3,0 V', '3,0 V es un 1 claro para la Pico y no pasa del máximo'], 'R1 = 10 kΩ arriba y R2 = 15 kΩ abajo'),
      Q('¿Qué tres GPIO del conector de la Pico pueden ser entradas analógicas?', ['GP26, GP27 y GP28', 'GP0, GP1 y GP2', 'Cualquiera', 'GP25, GP26 y GP29'], 'GP29 también es ADC, pero en la placa mide VSYS.', { c: 'rp_adcch', h: 'Los canales del ADC están al final de la numeración.' }),
      { t: 'match', q: 'Une cada GPIO interno de la Pico con su función.', pairs: [['GP25', 'LED de la placa'], ['GP24', 'Detecta VBUS'], ['GP29', 'VSYS / 3 en el ADC'], ['GP23', 'Modo del regulador']], c: 'rp_pinout', h: 'El 29 es el único de los cuatro con ADC.' },
      Q('Conectas la salida de 5 V de un sensor a GP2 de una Pico (RP2040). ¿Qué haces antes?', ['Un divisor o un adaptador de nivel para bajar a 3,3 V', 'Nada, aguanta', 'Activar el pull-down', 'Ponerlo en GP26, que es analógico'], 'El pin puede dañarse con 5 V.', { c: 'rp_levels', h: 'El máximo de un pin es su alimentación más 0,5 V.' }),
      Q('¿Y si es una Pico 2 (RP2350) ya alimentada y el pin no es de ADC?', ['Sus GPIO digitales toleran 5 V, aunque sus salidas siguen siendo de 3,3 V', 'Tampoco tolera nada por encima de 3,3 V', 'Tolera 5 V incluso apagada', 'Solo tolera 5 V en GP26–GP28'], 'Con la placa sin alimentar, mejor no meter 5 V. Y los pines de ADC no son tolerantes.', { c: 'rp_levels', h: 'El RP2350 cambió esto, con dos condiciones.' }),
      Q('¿Entiende un 74HCT alimentado a 5 V el 1 de 3,3 V de la Pico?', ['Sí: las entradas HCT aceptan unos 2 V como nivel alto', 'No, nunca', 'Solo con pull-down', 'Solo a 133 MHz'], 'Por eso los 74HCT se usan para pasar de 3,3 a 5 V.', { c: 'rp_levels', h: 'Mira la línea del HCT en el dibujo de niveles.' }),
      Q('¿Qué canal del ADC es GP28?', ['2', '28', '0', '3'], '28 − 26 = 2.', { c: 'rp_adcch', h: 'Resta 26 al número de GPIO.' }),
      Q('Conectas un sensor I²C a GP6 (SDA) y GP7 (SCL). ¿Qué bloque de I²C usas?', ['I²C1', 'I²C0', 'Ninguno: no tienen I²C', 'Cualquiera de los dos'], 'GP6 y GP7 son la cuarta pareja: I²C1.', { c: 'rp_pinout', h: 'Las parejas alternan: 0-1 son I²C0, 2-3 I²C1, 4-5 I²C0…' }),
      I('<b>Resumen</b>\n· En el código, el <b>número de GPIO</b>, no el de la pata.\n· Cada función sale por <b>grupos fijos</b> de pines; ADC solo en GP26–GP28.\n· <b>3,3 V</b>: nunca 5 V en un pin del RP2040.', { svg: S.pins4 })
    ]),
    L('rp4', 'Alimentación: VBUS, VSYS y 3V3', 'bat', ['rp_power', 'rp_vsys', 'rp_schottky'], [
      PQ('Quieres alimentar la Pico con dos pilas AA (unos 3 V), menos de los 3,3 V que usa el chip. ¿Funcionará?', ['Sí: su regulador también sabe subir la tensión', 'No: hacen falta al menos 3,3 V', 'Solo si las conectas a 3V3', 'Solo con el USB conectado a la vez'], 'La Pico lleva un regulador buck-boost: baja o sube la tensión de entrada hasta 3,3 V.', 'rp_power', 'Piensa en reguladores que suben la tensión.'),
      EX('Juega con la alimentación: batería, tipo de diodo y USB.', 'rp_powv', P.pow(), [
        TK('onBat', 1, 1, 'Sin USB, haz que la Pico arranque con la batería', 'VSYS necesita al menos 1,8 V; el buck-boost lo convierte en 3,3 V.', 'Sube la batería o cambia a Schottky.'),
        TK('src', 2, 2, 'Conecta el USB: ¿quién alimenta ahora?', 'Gana la fuente más alta (unos 4,7 V por VBUS) y los diodos impiden que se empujen corriente.', 'Pon el USB a 1.'),
        TK('adcNoUsb', 1.15, 1.25, 'Desconecta el USB y consigue 1,2 V en GP29', 'GP29 ve VSYS / 3: VSYS = 3,6 V.', 'Busca VSYS = 3,6 V: batería menos lo que cae en el diodo.')]),
      I('<b>VBUS</b>: los 5 V del USB. <b>VSYS</b>: la entrada del regulador, de 1,8 a 5,5 V; ahí van pilas y baterías. <b>3V3(OUT)</b>: la salida de 3,3 V para tus sensores, nunca una entrada.\nEl regulador es <b>buck-boost</b>: un conmutado que baja (buck) o sube (boost) la tensión.', { svg: S.power, more: 'Por eso funciona con el USB, con dos o tres pilas AA o con una celda de litio.\n3V3_EN a masa apaga el regulador (un interruptor de encendido sin cortar la batería). RUN a masa reinicia el RP2040: la Pico no trae botón de reset, y añadirlo es muy cómodo.\nPara 3V3(OUT) se recomienda no pasar de unos 300 mA.' }),
      I('USB y batería a la vez: la batería entra en VSYS por un <b>diodo Schottky</b>, igual que VBUS ya lo hace en la placa. Gana la fuente de más tensión y ninguna empuja corriente hacia la otra.', { svg: S.ordiode, more: 'Se elige Schottky porque cae unos 0,3 V; uno de silicio como el 1N4007 cae unos 0,7 V. Con pilas, cada décima cuenta.\nPara CARGAR una LiPo hace falta un cargador dedicado con protección: nunca la conectes directa a VBUS.' }),
      I('La placa mide su propia alimentación: VSYS llega a <b>GP29</b> a través de un divisor <b>÷3</b>, para no superar los 3,3 V del ADC. Para saber VSYS: tensión en GP29 × 3.', { svg: S.div3 }),
      ST('Una LiPo a 3,7 V entra por un Schottky. ¿Qué tensión ve GP29?', ['VSYS = 3,7 − 0,3 = 3,4 V', 'El divisor divide entre 3: 3,4 / 3 = 1,13 V en GP29', 'Comprobación al revés: 1,13 × 3 = 3,4 V'], '1,13 V en GP29 · 3,4 V en VSYS'),
      { t: 'match', q: 'Une cada pata con su papel.', pairs: [['VBUS', '5 V del USB (solo con cable)'], ['VSYS', 'Entrada del regulador, 1,8–5,5 V'], ['3V3(OUT)', 'Salida de 3,3 V para periféricos'], ['3V3_EN', 'A masa apaga el regulador']], c: 'rp_power', h: 'Sigue el camino del dibujo: entrada, regulador, salida.' },
      Q('Una LiPo de una celda (3,0–4,2 V). ¿Dónde la conectas?', ['A VSYS: el buck-boost aprovecha todo su rango', 'A 3V3(OUT)', 'A VBUS', 'A ADC_VREF'], 'Sin olvidar un cargador con protección para recargarla.', { c: 'rp_power', h: '¿Qué pata admite de 1,8 a 5,5 V?' }),
      Q('Conectas una fuente de 5 V a la pata 3V3(OUT). ¿Qué pasa?', ['Superas el máximo del RP2040 y puedes destruirlo', 'Va más rápido', 'Nada: el regulador lo baja', 'Se carga la batería'], '3V3 es una salida, no una entrada para 5 V.', { c: 'rp_power', h: 'Por 3V3(OUT) te saltas el regulador.' }),
      Q('¿Por qué un Schottky y no un 1N4007 entre la batería y VSYS?', ['Cae unos 0,3 V en vez de 0,7 V: aprovechas más la batería', 'Aguanta más tensión inversa', 'Es más grande', 'Da 3,3 V exactos'], 'Cada décima cuenta con pilas.', { c: 'rp_schottky', h: 'Compara la caída de tensión de los dos.' }),
      Nm('VSYS se mide en GP29 con un divisor ÷3. En el pin hay 1,45 V. ¿Cuánto vale VSYS?', 4.35, 'V', '1,45 × 3 = 4,35 V.', { tol: 0.02, c: 'rp_vsys', h: 'Deshaz el divisor: multiplica por 3.' }),
      Nm('Mides 1,2 V en GP29. ¿Cuántos voltios hay en VSYS?', 3.6, 'V', '1,2 × 3 = 3,6 V.', { tol: 0.02, c: 'rp_vsys', h: 'GP29 ve un tercio de VSYS.' }),
      Q('¿Cómo reinicias la Pico sin desenchufarla?', ['Llevando RUN a masa un instante con un pulsador', 'Llevando 3V3_EN a 5 V', 'Pulsando BOOTSEL sin más', 'Uniendo VBUS y VSYS'], 'La Pico no trae botón de reset: es un añadido muy útil.', { c: 'rp_power', h: 'Hay una pata que reinicia el chip al llevarla a masa.' }),
      Q('Tus sensores consumen 450 mA a 3,3 V. ¿Los alimentas desde 3V3(OUT)?', ['No: mejor un regulador aparte; la salida de la Pico se queda corta', 'Sí, sin problema', 'Sí, si el cable USB es bueno', 'No: aliméntalos desde VBUS aunque sean de 3,3 V'], 'Sobrecargar el regulador lo calienta y baja la tensión de todo.', { c: 'rp_power', h: 'Se recomienda no pasar de unos 300 mA.' }),
      I('<b>Resumen</b>\n· Pilas y baterías, a <b>VSYS</b> (1,8–5,5 V); el buck-boost da 3,3 V.\n· USB y batería a la vez: <b>Schottky</b>; gana la más alta.\n· <b>GP29</b> ve VSYS / 3: multiplica por 3.', { svg: S.power })
    ]),
    L('rp5', 'Arranque: BOOTSEL y UF2', 'memory', ['rp_boot', 'rp_uf2'], [
      PQ('Tu programa se cuelga y la placa ya no responde por USB. ¿Crees que puedes estropear la Pico para siempre con un programa?', ['No: el arranque por USB vive en una ROM que no se borra', 'Sí, si el programa bloquea el USB', 'Sí, si borra la flash', 'Solo la Pico W'], 'El modo BOOTSEL está en la ROM del chip: siempre puedes volver a él.', 'rp_boot', 'Hay una memoria del chip que ningún programa puede borrar.'),
      EX('Así decide la ROM qué hacer al encender. Prueba el botón, la flash y el tamaño del programa.', 'rp_bootv', P.boot(), [
        TK('usb', 1, 1, 'Haz que aparezca la unidad RPI-RP2', 'BOOTSEL baja el CS de la flash: la ROM no la ve y entra en modo USB.', 'Pulsa BOOTSEL.'),
        TK('usbNoBtn', 1, 1, 'Suelta BOOTSEL y consigue también la unidad', 'Con la flash vacía, la ROM tampoco encuentra programa y se queda en modo USB.', '¿Y si la flash no tiene programa?'),
        TK('blocks', 512, 512, 'Elige un programa que ocupe 512 bloques UF2', '128 KB / 256 bytes por bloque = 512 bloques.', 'Cada bloque lleva 256 bytes de programa.')]),
      I('Al encender, la <b>ROM</b> busca un programa válido en la flash. Si mantienes <b>BOOTSEL</b>, el botón pone a masa el CS de la flash, la ROM no la ve y entra en modo USB: aparece una unidad llamada <b>RPI-RP2</b>.', { svg: S.bootsel, more: 'En la Pico 2 la unidad se llama RP2350. Arrastras el .uf2, la ROM lo graba y reinicia: la unidad desaparece, y es lo normal.\nComo la ROM no se puede borrar, siempre puedes volver a este modo. Para limpiar la flash entera existe un UF2 de borrado total (flash_nuke). Y la herramienta picotool da información de lo que hay grabado.' }),
      I('Un fichero <b>UF2</b> está hecho de bloques de 512 bytes. Cada uno lleva <b>256 bytes de programa</b>, la <b>dirección</b> donde van y la <b>familia</b> del chip. Así da igual en qué orden los escriba el ordenador.', { svg: S.uf2 }),
      { t: 'order', q: 'Ordena cómo se graba un programa.', items: ['Mantén pulsado BOOTSEL', 'Conecta el USB', 'Suelta BOOTSEL cuando aparezca la unidad', 'Arrastra el .uf2 a la unidad', 'La placa se reinicia y ejecuta el programa'], e: 'Sin programas especiales: solo arrastrar un fichero.', c: 'rp_boot', h: 'El botón tiene que estar pulsado justo al encender.' },
      ST('¿Cuántos bloques tiene un programa de 100 KB y cuánto ocupa su .uf2?', ['100 KB = 102 400 bytes', 'Bloques = 102 400 / 256 = 400', 'Cada bloque ocupa 512 bytes en el fichero: 400 × 512 = 204 800 bytes', '= 200 KB: el doble que el programa'], '400 bloques · 200 KB de fichero'),
      Q('Has arrastrado el .uf2 y la unidad desaparece. ¿Qué ha pasado?', ['Lo normal: se ha grabado y la placa se ha reiniciado', 'Se ha borrado todo', 'Hay que formatearla', 'El USB se ha roto'], 'Si el programa usa USB, ahora aparecerá como otro dispositivo.', { c: 'rp_boot', h: 'Tras grabar, la ROM reinicia la placa.' }),
      Q('¿Por qué cada bloque UF2 lleva su dirección de destino?', ['Porque el ordenador puede escribir los bloques en cualquier orden', 'Para cifrarlo', 'Para ocupar más', 'Porque la flash es de 512 bytes'], 'Es un formato pensado para unidades USB «de mentira».', { c: 'rp_uf2', h: 'Piensa en sobres que llegan desordenados.' }),
      Nm('Un programa de 64 KB, a 256 bytes útiles por bloque. ¿Cuántos bloques UF2?', 256, 'bloques', '65 536 / 256 = 256 bloques.', { c: 'rp_uf2', h: 'Pasa los KB a bytes (× 1024) y divide entre 256.' }),
      Q('Grabas el UF2 de una Pico en una Pico 2. ¿Qué pasa?', ['La ROM no lo graba: los bloques son de otra familia de chip', 'Funciona igual', 'Se graba a medias y va lento', 'La Pico 2 se estropea'], 'Cada bloque dice para qué chip es.', { c: 'rp_uf2', h: 'Mira qué más lleva cada bloque además del programa.' }),
      Q('Un main.py defectuoso no te deja trabajar. ¿Cómo dejas la flash limpia?', ['BOOTSEL, el UF2 de borrado total y volver a instalar lo que quieras', 'Reiniciando con RUN', 'Dejándola desconectada un día', 'Pulsando BOOTSEL dos veces'], 'El borrado total limpia también los ficheros.', { c: 'rp_boot', h: 'El modo BOOTSEL siempre responde.' }),
      Q('Enciendes una Pico recién comprada, con la flash vacía y sin pulsar nada. ¿Qué ves en el ordenador?', ['La unidad RPI-RP2: no hay programa válido', 'Nada', 'Un puerto serie', 'Un error de la ROM'], 'Sin programa, la ROM se queda esperando por USB.', { c: 'rp_boot', h: 'Recuerda la segunda tarea de la exploración.' }),
      I('<b>Resumen</b>\n· La <b>ROM</b> decide: BOOTSEL pulsado o flash sin programa → unidad <b>RPI-RP2</b>.\n· Grabar = arrastrar un <b>.uf2</b>; la unidad desaparece al acabar.\n· UF2: bloques de 512 bytes con 256 de programa, <b>dirección</b> y <b>familia</b>.', { svg: S.uf2 })
    ]),
    L('rp46', 'La flash externa y la caché XIP', 'memory', ['rp_xip', 'rp_flash'], [
      PQ('Tu programa está en una flash externa, unida por unos pocos hilos. ¿Cómo crees que lo ejecuta el RP2040?', ['Lo lee sobre la marcha, con una caché que guarda lo usado hace poco', 'Lo copia entero a la RAM al arrancar, siempre', 'Lo ejecuta la propia flash', 'Lo pide al ordenador cada vez'], 'Se llama XIP: ejecutar en el sitio. La caché evita esperar a la flash en cada instrucción.', 'rp_xip', 'La flash tiene 2 MB y la RAM 264 KB: no siempre cabría.'),
      EX('La CPU lee el código a través de una caché de 16 KB. Cambia el tamaño del código que se repite, dónde corre y qué hace el otro núcleo.', 'rp_xipv', P.xip(), [
        TK('speed', 80, 100, 'Haz que el bucle vaya a más del 80 % de velocidad', 'Si el código cabe en la caché (o corre desde la RAM), casi no espera a la flash.', 'Que el código que se repite quepa en 16 KB.'),
        TK('blocked', 1, 1, 'Con el código en la flash, pon al otro núcleo a borrarla', 'Mientras se borra, la flash no responde: el código que vive en ella se para.', 'Código en flash y borrado activado.'),
        TK('okErase', 1, 1, 'Consigue seguir funcionando aunque se borre', 'El código copiado a la RAM no necesita la flash.', 'Cambia dónde corre el código.')]),
      I('<b>XIP</b>: el código se lee de la flash por QSPI y una <b>caché de 16 KB</b> guarda lo reciente. Si la instrucción está en la caché (acierto), va al momento; si no (fallo), hay que traerla.', { svg: S.xip, more: 'Un fallo cuesta decenas de ciclos de CPU, porque la flash está fuera y se lee por un bus de cuatro hilos. Por eso el primer paso por una función es más lento que los siguientes.\nLa caché del RP2040 es de 16 KB y asociativa de dos vías. Si te interesa el detalle, la hoja de datos lo explica en la sección del XIP.' }),
      I('Un bucle pequeño se queda en la caché tras la primera vuelta. Lo que debe ir <b>siempre</b> a la misma velocidad (una interrupción crítica, por ejemplo) se copia a la <b>RAM</b>.', { svg: S.cache }),
      I('La flash se borra por <b>sectores de 4 KB</b> y, mientras borra o escribe, <b>no se puede leer</b>. Además, cada sector aguanta del orden de <b>100 000 borrados</b>.', { svg: S.erase, more: 'Por eso, cuando un programa guarda datos en la flash, el otro núcleo debe estar pausado o ejecutando desde la RAM; el SDK de C trae funciones para hacerlo.\nY por eso no conviene escribir en la flash cada pocos milisegundos durante meses: lo verás con los ficheros de MicroPython.' }),
      ST('Un bucle de 40 KB se repite sin parar. ¿Qué parte, como mucho, puede estar en la caché?', ['La caché tiene 16 KB', '16 / 40 = 0,4', 'Como mucho un 40 % del bucle está en caché a la vez: el resto se vuelve a leer en cada vuelta', 'Arreglo: acortar la parte que se repite o pasarla a la RAM'], 'Como mucho, un 40 %'),
      Q('Un bucle de 8 KB se ejecuta un millón de veces. Tras la primera vuelta…', ['Casi todo se lee de la caché: va casi a toda velocidad', 'Cada instrucción espera a la flash', 'Se copia solo a la RAM', 'Se borra de la caché'], '8 KB caben en los 16 KB de caché.', { c: 'rp_xip', h: 'Compara 8 KB con el tamaño de la caché.' }),
      Q('Un núcleo borra un sector de flash mientras el otro ejecuta código desde la flash. ¿Qué pasa?', ['El otro se queda parado o falla: hay que pausarlo o que ejecute desde la RAM', 'Nada', 'Va más rápido', 'Se borra la RAM'], 'Mientras borra, la flash no responde a lecturas.', { c: 'rp_flash', h: '¿Se puede leer la flash mientras se borra?' }),
      Q('¿Dónde va el código que debe seguir funcionando mientras se borra la flash?', ['En la RAM', 'En la caché, que nunca se vacía', 'En la ROM', 'En otro sector de la flash'], 'La flash entera deja de responder, no solo un sector.', { c: 'rp_flash', h: 'Tiene que estar en una memoria que no sea la flash.' }),
      Q('¿Cuántas veces aguanta, más o menos, cada sector de la flash ser borrado?', ['Del orden de 100 000', 'Infinitas', 'Unas 10', 'Mil millones'], 'Mucho, pero no infinito: hay que escribir con cabeza.', { c: 'rp_flash', h: 'Es un número grande pero finito.' }),
      Q('Tras arrancar, la primera llamada a una función es más lenta que las siguientes. ¿Por qué?', ['La primera vez hay que traerla de la flash; luego está en la caché', 'La CPU se calienta', 'El USB interrumpe', 'La RAM se llena'], 'Fallo de caché la primera vez, aciertos después.', { c: 'rp_xip', h: 'Piensa en aciertos y fallos.' }),
      Nm('¿Qué porcentaje de un programa de 2 MB (2048 KB) cabe a la vez en la caché de 16 KB?', 0.78, '%', '16 / 2048 = 0,0078 → 0,78 %. Por suerte, el código que se repite suele ser pequeño.', { tol: 0.05, c: 'rp_xip', h: 'Divide 16 entre 2048 y multiplica por 100.' }),
      I('<b>Resumen</b>\n· <b>XIP</b>: el código se lee de la flash sobre la marcha, con una <b>caché de 16 KB</b>.\n· Lo crítico, en <b>RAM</b>.\n· Borrar la flash <b>bloquea</b> su lectura y la <b>desgasta</b> (≈ 100 000 borrados por sector).', { svg: S.xip })
    ])
  ];

  const M2 = [
    L('rp6', 'El REPL y tu primer script', 'code', ['rp_repl', 'rp_pyops', 'rp_mainpy'], [
      PQ('En Arduino, para probar una cuenta hay que compilar y subir un programa. En MicroPython escribes 7 / 2 en una consola de la placa y pulsas Intro. ¿Qué crees que sale?', ['3.5', '3', '3,5 V', 'Un error: falta el punto y coma'], 'Sale 3.5 al instante. Ojo: en Python, / no tira los decimales como en C.', 'rp_pyops', 'En Python, / siempre da un número con decimales.', { code: '>>> 7 / 2' }),
      I('Primero, MicroPython en la placa: descarga el <b>.uf2</b> de MicroPython para TU placa, entra en BOOTSEL y arrástralo (lo del módulo 1). Luego abre <b>Thonny</b> y elige el intérprete «MicroPython (Raspberry Pi Pico)».', { svg: S.install, more: 'Thonny es el entorno más sencillo: editor, botón de ejecutar, consola y explorador de los ficheros de la placa.\nAlternativa de terminal: mpremote. Por ejemplo, mpremote run prueba.py ejecuta un fichero del PC sin copiarlo, y mpremote fs cp main.py :main.py lo copia a la placa.' }),
      I('El <b>REPL</b> (leer, evaluar, imprimir, repetir) es una consola dentro de la placa: escribes una línea tras <b>>>></b> y se ejecuta al momento. Es el multímetro del programador.', { svg: S.repl, more: 'Teclas útiles: Ctrl+C interrumpe el programa en marcha, Ctrl+D hace un reinicio suave, Tab autocompleta y la flecha arriba recupera la orden anterior.\nPara explorar: dir(objeto) dice qué funciones tiene; help(\'modules\'), qué módulos hay; y tras import gc, gc.mem_free() da la RAM libre.' }),
      EX('Reparte a caramelos en grupos de b y mira las tres divisiones de Python.', 'rp_opsv', P.ops(), [
        TK('md', 0, 0, 'Haz que la división sea exacta: a % b = 0', 'Sin resto. Aun así, a / b da un número con .0 (por ejemplo 15 / 5 = 3.0).', 'Busca un a que sea múltiplo de b.'),
        TK('is41', 1, 1, 'Consigue cociente entero 4 y resto 1', 'a = 4 × b + 1: la división de toda la vida.', 'Por ejemplo, b = 3 y a = 13.')]),
      I('Cuatro operadores que debes distinguir. El de la potencia es <b>**</b>; ^ es otra cosa (la o exclusiva de bits).', { code: '>>> 7 / 2      # división: siempre con decimales\n3.5\n>>> 7 // 2     # cociente entero\n3\n>>> 7 % 2      # resto\n1\n>>> 2 ** 10    # potencia\n1024' }),
      ST('Pasa 135 segundos a minutos y segundos con Python.', ['Minutos enteros: 135 // 60 = 2', 'Segundos que sobran: 135 % 60 = 15', 'Comprueba: 2 × 60 + 15 = 135', 'En el REPL: print(135 // 60, 135 % 60) → 2 15'], '2 min 15 s'),
      Q('¿Qué muestra cada línea en el REPL?', ['3 y 3.5', '3 y 3', '4 y 3.5', '3.5 y 3.5'], '// es división entera; / siempre da decimales.', { code: '>>> 7 // 2\n>>> 7 / 2', c: 'rp_pyops', h: 'Una barra o dos: ¿cuál tira los decimales?' }),
      { t: 'match', q: 'Une cada tecla del REPL con su efecto.', pairs: [['Ctrl+C', 'Interrumpe el programa'], ['Ctrl+D', 'Reinicio suave'], ['Tab', 'Autocompleta'], ['Flecha arriba', 'Recupera la orden anterior']], c: 'rp_repl', h: 'La C es de «cancelar».' },
      Q('¿Qué diferencia hay entre ejecutar con F5 en Thonny y guardar el programa en la placa como main.py?', ['F5 lo ejecuta ahora sin dejarlo en la placa; main.py arranca solo cada vez que se enciende', 'Ninguna', 'main.py se ejecuta en el PC', 'F5 borra la flash'], 'main.py es lo que hace autónomo tu proyecto.', { c: 'rp_mainpy', h: 'Piensa en qué pasa al desenchufar el ordenador.' }),
      Q('¿Qué imprime este código en una Pico con RP2040?', ['La frecuencia del reloj del sistema en Hz (125000000, 200000000… según la versión)', 'La memoria libre', 'La temperatura', 'La versión de MicroPython'], 'machine.freq() te lo dice y también sirve para cambiarlo.', { code: 'import machine\nprint(machine.freq())', c: 'rp_repl', h: 'freq es de frecuencia.' }),
      Q('¿Cómo ves qué funciones tiene un objeto Pin en el REPL?', ['dir(Pin)', 'list(Pin)', 'show Pin', 'man Pin'], 'dir() es tu índice.', { c: 'rp_repl', h: 'Es una función corta, de «directorio».' }),
      Q('Tu programa está en un bucle infinito y quieres recuperar el >>>. ¿Qué haces?', ['Ctrl+C en la consola (o el botón Stop de Thonny)', 'Desoldar la placa', 'Reinstalar Thonny', 'Esperar a que acabe'], 'Ctrl+C lanza KeyboardInterrupt dentro del programa.', { c: 'rp_repl', h: 'Mira la tabla de teclas.' }),
      Nm('¿Qué número imprime print(2 ** 10)?', 1024, '', '** es la potencia: 2¹⁰ = 1024.', { c: 'rp_pyops', h: '** es «elevado a».' }),
      Nm('¿Qué imprime print(17 % 5)?', 2, '', '17 = 3 × 5 + 2: el resto es 2.', { c: 'rp_pyops', h: '% es lo que sobra al repartir.' }),
      I('<b>Resumen</b>\n· El <b>REPL</b> ejecuta cada línea al momento; Ctrl+C para.\n· <b>/</b> da decimales, <b>//</b> el cociente entero, <b>%</b> el resto y <b>**</b> la potencia.\n· Guardado como <b>main.py</b>, el programa arranca solo.', { svg: S.repl })
    ]),
    L('rp7', 'Variables, tipos y operaciones', 'code', ['rp_pytypes', 'rp_bits', 'rp_pyops'], [
      PQ('En C, un int de 32 bits se desborda si calculas 2 elevado a 40. ¿Qué crees que hace MicroPython con 2 ** 40?', ['Da el número exacto: los enteros crecen lo que haga falta', 'Se desborda igual', 'Da un error', 'Lo convierte a float y lo redondea'], 'En Python, los enteros no tienen límite: solo ocupan más memoria.', 'rp_pytypes', 'Python no fija el tamaño de los enteros.'),
      I('En Python <b>no declaras tipos</b>: el valor decide. Tipos básicos: <b>int</b>, <b>float</b>, <b>str</b> (texto), <b>bool</b> (True/False) y <b>None</b> (nada).', { code: "x = 5          # int\nx = 'hola'     # ahora es str: el tipo va con el valor\nt = 23.5       # float\nok = True      # bool\nnada = None    # «sin valor»\nprint(type(t)) # <class 'float'>" }),
      I('Los <b>int</b> no se desbordan. Los <b>float</b> de MicroPython en la Pico son de 32 bits: unas 7 cifras y no siempre exactos. Compara floats con un margen, nunca con ==.', { svg: S.types, more: 'Ejemplo de que un float de 32 bits no tiene sitio para todo: 16777217.0 == 16777216.0 da True, porque el 16 777 217 no cabe exacto y se redondea.\nPara comparar: abs(a - b) < 0.001, con un margen adecuado a lo que mides.' }),
      I('Texto y números no se mezclan solos: <b>int()</b>, <b>float()</b> y <b>str()</b> convierten. Para mostrar números, las <b>f-strings</b>.', { code: ">>> '12' + 3\nTypeError: can't convert 'int' object to str implicitly\n>>> int('12') + 3\n15\n>>> t = 23.456\n>>> f'{t:.1f} C'     # un decimal\n'23.5 C'" }),
      EX('Forma números con bits y desplázalos.', 'rp_bitv', P.bit(), [
        TK('v', 37, 37, 'Forma 37: los bits de GP0, GP2 y GP5', '1 + 4 + 32 = 37.', 'Cada bit vale el doble que el de su derecha: 1, 2, 4, 8, 16, 32…'),
        TK('r37', 4, 4, 'Sin cambiar el 37, desplaza hasta que quede 4', '37 >> 3 = 4: se tiran los tres bits de abajo (como dividir entre 8 sin decimales).', 'Ve subiendo el desplazamiento.')]),
      I('Operaciones de bits, igual que en C: <b>&amp;</b> (y), <b>|</b> (o), <b>^</b> (o exclusiva), <b>~</b> (negación), <b>&lt;&lt;</b> y <b>&gt;&gt;</b>.', { code: ">>> 0b1010_0000 >> 5\n5\n>>> 1 << 3\n8\n>>> 0b1100 & 0b1010\n8\n>>> hex(255), bin(5)\n('0xff', '0b101')" }),
      ST('Forma la máscara de GP1, GP3 y GP4 y pásala a hexadecimal.', ['Pesos: GP1 → 2, GP3 → 8, GP4 → 16', 'Suma: 2 + 8 + 16 = 26', 'En binario: 0b0001_1010', 'En hexadecimal, de 4 en 4 bits: 0001 = 1 y 1010 = A → 0x1A'], '26 = 0x1A'),
      Q('¿Qué imprime?', ['3 1', '3.33 1', '3 0', '1 3'], '// cociente entero y % resto.', { code: 'a = 10\nb = 3\nprint(a // b, a % b)', c: 'rp_pyops', h: '10 entre 3: ¿cuántas veces cabe y cuánto sobra?' }),
      Q('¿Qué imprime?', ['15', '123', 'TypeError', '12 3'], 'int() convierte el texto en número antes de sumar.', { code: "print(int('12') + 3)", c: 'rp_pytypes', h: 'Primero se convierte el texto.' }),
      Q('¿Qué imprime?', ['23.5 C', '23.456 C', '23 C', 't C'], 'Dentro de una f-string, :.1f redondea a un decimal.', { code: "t = 23.456\nprint(f'{t:.1f} C')", c: 'rp_pytypes', h: ':.1f deja un decimal.' }),
      Q('¿Qué ocurre?', ['Un TypeError: hay que convertir con int(v)', 'Imprime 15', 'Imprime 123', 'Imprime 12 3'], 'Python no mezcla texto y números sin que se lo pidas.', { code: "v = '12'\nprint(v + 3)", c: 'rp_pytypes', h: 'v está entre comillas.' }),
      Q('Tienes dos float, a y b. ¿Cuál de estas condiciones es la buena para compararlos?', ['abs(a - b) < 0.001', 'a == b', 'int(a) == int(b)', 'str(a) == str(b)'], 'Con un margen adecuado a tu medida.', { c: 'rp_pytypes', h: 'Los float no siempre son exactos.', code: 'a = medida_1()\nb = medida_2()' }),
      Q('¿Qué imprime?', ['5', '160', '1010', '2'], '0b10100000 desplazado 5 a la derecha deja 0b101.', { code: 'reg = 0b1010_0000\nprint(reg >> 5)', c: 'rp_bits', h: 'Tira 5 bits por la derecha.' }),
      { t: 'bits', q: 'Forma la máscara con GP0, GP2 y GP5 (bit n = GPn).', n: 8, target: 37, e: '1 + 4 + 32 = 37 = 0b100101.', c: 'rp_bits', h: 'Enciende los bits 0, 2 y 5.' },
      Nm('¿Cuánto vale 0xFF + 1 en decimal?', 256, '', '0xFF = 255.', { c: 'rp_bits', h: 'Pasa 0xFF a decimal primero.' }),
      I('<b>Resumen</b>\n· El tipo va con el valor: int, float, str, bool, None.\n· <b>int</b> sin límite; <b>float</b> de 32 bits: compara con margen.\n· Bits: <b>&amp; | ^ ~ &lt;&lt; &gt;&gt;</b>; bit n vale 2ⁿ.', { svg: S.types })
    ]),
    L('rp8', 'Decisiones y bucles', 'code', ['rp_pyflow', 'rp_python'], [
      PQ('¿Cuántas veces crees que sale «fin»?', ['Una', 'Tres', 'Ninguna', 'Cuatro'], "La sangría decide: print('fin') está fuera del bucle.", 'rp_python', 'Fíjate en qué líneas están más a la derecha.', { code: "for i in range(3):\n    print(i)\nprint('fin')" }),
      I('En C, los bloques van entre llaves. En Python los marca la <b>sangría</b>: lo que va después de una línea terminada en <b>dos puntos</b> y más a la derecha pertenece a ese if, for, while o def.', { svg: S.indent }),
      I('Decisiones: <b>if</b>, <b>elif</b> y <b>else</b>. Solo se ejecuta la <b>primera</b> rama que se cumple. Las condiciones se combinan con palabras: <b>and</b>, <b>or</b>, <b>not</b>.', { code: "t = 31\nif t > 30 and not manual:\n    print('calor')\nelif t > 20:\n    print('bien')\nelse:\n    print('frío')" }),
      EX('Mueve inicio, fin y paso de range() y mira los valores que da.', 'rp_rangev', P.range(), [
        TK('n', 3, 3, 'Consigue que range dé exactamente 3 valores', 'El fin nunca entra: cuenta cuántos caben antes.', 'Prueba con un fin más pequeño o un paso mayor.'),
        TK('is159', 1, 1, 'Consigue 1, 5 y 9', 'range(1, 10, 4): empieza en 1, suma 4 y para antes de 10.', 'Empieza en 1 y salta de 4 en 4.'),
        TK('n', 0, 0, 'Haz que no dé ningún valor', 'Si el inicio no es menor que el fin, el bucle no se ejecuta ni una vez.', 'Pon el inicio por encima del fin.')]),
      I('<b>for</b> recorre una secuencia; <b>while</b> repite mientras se cumpla la condición. <b>break</b> sale del bucle y <b>continue</b> salta a la siguiente vuelta.', { code: "for i in range(2, 10, 3):   # 2, 5, 8\n    print(i)\n\nn = 0\nwhile n < 5:\n    n += 2                   # 2, 4, 6\n    if n == 4:\n        continue             # salta el print\n    print(n)" }),
      I('De Arduino a MicroPython: lo de <b>setup()</b> va arriba, una vez; <b>loop()</b> se convierte en <b>while True:</b>. No hay main obligatorio: el fichero se ejecuta de arriba abajo.', { code: "from machine import Pin   # bibliotecas\nimport time\n\nled = Pin(15, Pin.OUT)   # como pinMode(15, OUTPUT)\n\nwhile True:              # como loop()\n    led.toggle()         # invierte el LED\n    time.sleep_ms(500)   # como delay(500)", more: 'Pin y time los verás en detalle en la lección de pines. Aquí fíjate en la estructura: imports, preparación y bucle con sangría.' }),
      ST('n = 1 y luego while n < 10: n *= 3. ¿Cuánto vale n al salir?', ['Empieza: n = 1; 1 < 10, entra', 'Vuelta 1: n = 3; 3 < 10, sigue', 'Vuelta 2: n = 9; 9 < 10, sigue', 'Vuelta 3: n = 27; 27 < 10 es falso: sale'], 'n = 27'),
      Q('¿Qué imprime?', ['calor', 'calor y bien', 'bien', 'frío'], 'Se ejecuta solo la primera rama que se cumple.', { code: "t = 31\nif t > 30:\n    print('calor')\nelif t > 20:\n    print('bien')\nelse:\n    print('frío')", c: 'rp_pyflow', h: '31 cumple las dos primeras; ¿cuántas ramas se ejecutan?' }),
      Q('¿Qué valores imprime?', ['2, 5 y 8', '2, 5, 8 y 11', '3, 6 y 9', '2 y 10'], 'Empieza en 2, suma 3 y para antes de 10.', { code: 'for i in range(2, 10, 3):\n    print(i)', c: 'rp_pyflow', h: 'El 10 no entra.' }),
      Q('¿Qué imprime?', ['6', '5', '4', '7'], '0 → 2 → 4 → 6; con 6 la condición ya no se cumple.', { code: 'n = 0\nwhile n < 5:\n    n += 2\nprint(n)', c: 'rp_pyflow', h: 'Apunta n en cada vuelta.' }),
      { t: 'order', q: 'Ordena las líneas del parpadeo en MicroPython.', items: ['from machine import Pin', 'import time', 'led = Pin(15, Pin.OUT)', 'while True:', 'led.toggle()  (con sangría)', 'time.sleep_ms(500)  (con sangría)'], e: 'Imports, preparación y bucle infinito.', c: 'rp_python', h: 'Primero lo que se importa, luego lo que se prepara una vez.' },
      Q('¿Qué falla?', ['Faltan los dos puntos al final del if', 'Falta un punto y coma', 'Faltan llaves', '== debería ser ='], 'SyntaxError en la línea del if.', { code: 'if boton.value() == 0\n    led.on()', c: 'rp_python', h: '¿Cómo termina una línea que abre un bloque?' }),
      Q('and, or y not de Python equivalen en C a…', ['&&, || y !', '&, | y ~', '+, * y −', 'Nada: no existen en C'], '&, | y ~ también existen en Python, pero son de bits.', { c: 'rp_pyflow', h: 'Son los operadores lógicos, no los de bits.' }),
      Q('¿Cuál es el último número que imprime?', ['3', '4', '9', '10'], 'Con i = 4, break sale antes del print.', { code: 'for i in range(10):\n    if i == 4:\n        break\n    print(i)', c: 'rp_pyflow', h: 'break sale del bucle al momento.' }),
      I('<b>Resumen</b>\n· Bloques: <b>dos puntos</b> y <b>sangría</b>.\n· if/elif/else: solo la primera rama verdadera.\n· <b>range(a, b, paso)</b> para antes de b. setup → arriba; loop → <b>while True:</b>.', { svg: S.indent })
    ]),
    L('rp9', 'Funciones, listas y diccionarios', 'code', ['rp_pyfunc', 'rp_pylist', 'rp_pymem'], [
      PQ('¿Qué crees que imprime?', ['40', '10', 'Un error: no hay índices negativos', '30'], 'Los índices negativos cuentan desde el final: v[-1] es el último.', 'rp_pylist', 'En Python, −1 significa «el último».', { code: 'v = [10, 20, 30, 40]\nprint(v[-1])' }),
      I('<b>def</b> crea una función; <b>return</b> devuelve un valor, o varios separados por comas (una tupla). Los parámetros pueden tener valor por defecto.', { svg: S.func, more: 'Para recoger varios valores: lo, hi = extremos(datos). Es lo mismo que una función de C, pero sin declarar tipos.' }),
      I('Si una función <b>asigna</b> a una variable de fuera, Python la toma por local y da error. Para modificar la del programa, decláralo con <b>global</b>. Solo leerla no lo necesita.', { code: "cuenta = 0\ndef pulsado():\n    global cuenta      # sin esta línea: error\n    cuenta += 1\n\nlimite = 10\ndef muestra():\n    print(limite)      # leer no necesita global" }),
      EX('Una lista de cinco números. Prueba índices (también negativos) y porciones.', 'rp_listv', P.list(), [
        TK('neg50', 1, 1, 'Saca el 50 con un índice negativo', 'v[-1] es siempre el último, mida lo que mida la lista.', 'Los negativos empiezan en −1.'),
        TK('err', 1, 1, 'Pide un índice que no existe', 'IndexError: con 5 elementos, de 0 a 4 o de −5 a −1.', 'Prueba con 5 o con −6.'),
        TK('s2030', 1, 1, 'Consigue la porción [20, 30]', 'v[1:3]: desde 1 hasta 3 sin incluirlo.', 'El final de la porción no entra.')]),
      I('Listas: <b>append</b> añade, <b>pop</b> quita, <b>len</b> cuenta. Las <b>comprensiones</b> crean una lista en una línea.', { code: "v = [10, 20, 30]\nv.append(40)            # [10, 20, 30, 40]\nprint(len(v), v[1:3])   # 4 [20, 30]\ncuad = [x * x for x in range(4)]   # [0, 1, 4, 9]" }),
      I('Un <b>diccionario</b> busca por <b>clave</b>, no por posición. Con <b>get</b> das un valor por defecto si la clave no existe. Ideal para configuración.', { code: "pines = {'rojo': 13, 'verde': 14}\nprint(pines['rojo'])        # 13\nprint(pines.get('azul', -1)) # -1, sin error\npines['azul'] = 15          # añade una clave" }),
      EX('¿Cuánta RAM gastan tus datos? Elige cuántos números y en qué contenedor.', 'rp_memv', P.mem(), [
        TK('nofitF', 1, 1, 'Llena la RAM con una lista de float', 'Cada float de una lista es un objeto aparte: unos 16 bytes más los 4 de la referencia.', 'Lista de float y muchos números.'),
        TK('best', 1, 1, 'Guarda 20 000 lecturas de 0 a 65535 gastando lo mínimo', "array('H'): 2 bytes por lectura, unos 39 KB.", 'Entero de 16 bits sin signo.')]),
      I("Con MicroPython te quedan unos 180 KB de RAM (míralo con gc.mem_free()). Para muchos números, <b>array</b>: guarda los valores seguidos, como un vector de C. 'H' = 16 bits sin signo, 'h' = con signo, 'f' = float.", { code: "from array import array\nlect = array('H')     # 2 bytes por número\nlect.append(52000)\nimport gc\nprint(gc.mem_free())  # RAM libre" }),
      ST('¿Cuánta RAM gastan 10 000 temperaturas en una lista de float? ¿Y en array(\'f\')?', ['Lista: cada float es un objeto de 16 bytes más una referencia de 4: unos 20 bytes', '10 000 × 20 = 200 000 bytes ≈ 195 KB: no cabe en los ~180 libres', "array('f'): 4 bytes por número → 40 000 bytes ≈ 39 KB", 'Unas cinco veces menos, y cabe de sobra'], '≈ 195 KB frente a ≈ 39 KB'),
      Q('¿Qué imprime?', ['7.0 5.0', '7 5', '4 6', '14 10'], 'media(4) usa b = 10; / siempre da decimales.', { code: 'def media(a, b=10):\n    return (a + b) / 2\nprint(media(4), media(4, 6))', c: 'rp_pyfunc', h: 'En la primera llamada, b toma su valor por defecto.' }),
      Q('Al llamar a pulsado() da un error. ¿Por qué?', ['Falta global cuenta dentro de la función', 'pin no se usa', 'cuenta debería ser una lista', 'Falta return'], 'Asignar dentro de una función crea una variable local, salvo que digas global.', { code: 'cuenta = 0\ndef pulsado(pin):\n    cuenta += 1', c: 'rp_pyfunc', h: 'La función asigna a una variable de fuera.' }),
      Q('¿Qué devuelve esta función?', ['La tupla (mínimo, máximo)', 'Solo el mínimo', 'Un error: no se pueden devolver dos valores', 'Una lista vacía'], 'Se recoge con lo, hi = extremos(datos).', { code: 'def extremos(v):\n    return min(v), max(v)', c: 'rp_pyfunc', h: 'Dos valores separados por coma.' }),
      Q('¿Qué imprime?', ['40 [20, 30]', '10 [10, 20]', '40 [20, 30, 40]', '30 [20, 30]'], 'v[-1] es el último; la porción 1:3 no incluye el 3.', { code: 'v = [10, 20, 30, 40]\nprint(v[-1], v[1:3])', c: 'rp_pylist', h: 'Negativo: desde el final. Porción: sin el último índice.' }),
      Q('¿Qué imprime?', ['[0, 1, 4, 9]', '[1, 4, 9, 16]', '[0, 2, 4, 6]', '[0, 1, 2, 3]'], 'range(4) da 0, 1, 2 y 3; cada uno al cuadrado.', { code: 'cuad = [x * x for x in range(4)]\nprint(cuad)', c: 'rp_pylist', h: 'range(4) empieza en 0.' }),
      Q('¿Qué imprime?', ['-1', 'Un error KeyError', 'None', '15'], 'get devuelve el valor por defecto si no encuentra la clave.', { code: "pines = {'rojo': 13, 'verde': 14}\nprint(pines.get('azul', -1))", c: 'rp_pylist', h: "No hay clave 'azul'." }),
      Q('Vas a guardar 10 000 lecturas del ADC (de 0 a 65535). ¿Qué gasta menos RAM?', ["array('H')", 'Una lista de float', 'Un diccionario con una clave por lectura', 'Una cadena de texto con comas'], "array('H') ocupa 2 bytes por lectura: unos 20 KB.", { c: 'rp_pymem', h: 'Busca un contenedor que guarde los números seguidos.' }),
      Nm("¿Cuántos KB ocupan 8000 lecturas en array('H')?", 15.6, 'KB', '8000 × 2 = 16 000 bytes; / 1024 ≈ 15,6 KB.', { tol: 0.3, c: 'rp_pymem', h: '2 bytes por lectura; luego pasa a KB (÷ 1024).' }),
      I("<b>Resumen</b>\n· <b>def</b> con parámetros por defecto; <b>return</b> varios valores; <b>global</b> para asignar fuera.\n· Listas por posición (v[-1], v[a:b]); diccionarios por clave (get).\n· Muchos números: <b>array</b>, no listas de float.", { svg: S.func })
    ]),
    L('rp10', 'Pines y tiempo con machine', 'chip', ['rp_pin', 'rp_pullup', 'rp_ticks', 'rp_hwtiming'], [
      PQ('Un pulsador va de GP14 a masa y activas el pull-up interno. Mientras lo pulsas, ¿qué crees que lee el pin?', ['0', '1', 'Un valor al azar', '3,3'], 'Con pull-up, suelto lee 1 y pulsado lee 0: el pulsador lo une a masa.', 'rp_pullup', 'El pulsador conecta el pin a GND.'),
      I('El módulo <b>machine</b> trae la clase <b>Pin</b>: cada pin es un objeto que creas una vez y al que luego hablas.', { code: "from machine import Pin\nled = Pin(15, Pin.OUT)            # pinMode(15, OUTPUT)\nled.value(1)                      # digitalWrite(15, HIGH)\nled.toggle()                      # invierte\nb = Pin(14, Pin.IN, Pin.PULL_UP)  # INPUT_PULLUP\nprint(b.value())                  # digitalRead(14)\nplaca = Pin('LED', Pin.OUT)       # LED de la placa (Pico y W)" }),
      I('Con <b>pull-up</b>, la entrada queda en 1 mientras nadie la toca; el pulsador la baja a 0. Pulsar es un <b>flanco de bajada</b>; soltar, uno de subida.', { svg: S.pullup }),
      I('El módulo <b>time</b>: <b>sleep_ms</b> espera (bloquea). Para medir sin bloquear, <b>ticks_ms()</b>. Resta con <b>ticks_diff(nuevo, viejo)</b> y suma con <b>ticks_add</b>: el contador da la vuelta y ellas lo tienen en cuenta.', { code: "import time\nantes = time.ticks_ms()\nwhile True:\n    if time.ticks_diff(time.ticks_ms(), antes) >= 250:\n        antes = time.ticks_add(antes, 250)\n        led.toggle()\n    # … aquí el bucle hace otras cosas" }),
      EX('El bucle llega un poco tarde a cada plazo. Compara las dos formas de calcular el siguiente.', 'rp_ticksv', P.ticks(), [
        TK('drift', 150, 1000, 'Con antes = ticks_ms(), mete un retraso de 8 ms o más', 'Cada vuelta empieza tarde y el error se acumula: 20 cambios × el retraso.', 'Sube el retraso.'),
        TK('fixed', 1, 1, 'Cambia a ticks_add sin quitar el retraso', 'Cada cambio sigue llegando un poco tarde, pero ya no se acumula.', 'Pon el plazo en 1.')]),
      EX('¿Por qué ticks_diff y no una resta? Un contador de 8 bits da la vuelta en 256: míralo.', 'rp_wrapv', P.wrap(), [
        TK('raw', -255, -1, 'Pon «ahora» por debajo de «antes», como justo tras dar la vuelta', 'La resta normal sale negativa: absurdo para un tiempo.', 'Baja «ahora» por debajo de 100.'),
        TK('tdWrap20', 1, 1, 'Consigue que ticks_diff dé 20 con el contador recién dado la vuelta', 'ticks_diff cuenta los pasos de verdad, aunque haya pasado por cero.', 'Por ejemplo: antes = 250 y ahora = 14.')]),
      ST('antes = 1000 y el periodo es 250. El bucle mira la hora en 1240, 1255 y 1262. ¿Cuándo cambia el LED y cuál es el siguiente plazo?', ['1240: ticks_diff(1240, 1000) = 240 < 250 → nada', '1255: 255 ≥ 250 → cambia el LED', 'antes = ticks_add(1000, 250) = 1250, no 1255', 'Siguiente cambio al pasar de 1500: los 5 ms de retraso no se acumulan'], 'Cambia en 1255; el siguiente plazo es 1500'),
      I('Ojo con la velocidad: un bucle de MicroPython que hace toggle() es mucho más lento que en C y además <b>tiembla</b>: el intérprete y la recogida de basura meten pausas. Para señales rápidas o exactas existen el <b>PWM</b> y el <b>PIO</b>.', { svg: S.jitter }),
      Q('El pulsador entre GP14 y GND está pulsado. ¿Qué imprime?', ['0', '1', 'True', '3,3'], 'Con pull-up, pulsado es 0.', { code: 'from machine import Pin\nb = Pin(14, Pin.IN, Pin.PULL_UP)\nprint(b.value())', c: 'rp_pullup', h: 'Pulsado = unido a masa.' }),
      { t: 'match', q: 'Traduce de Arduino a MicroPython.', pairs: [['pinMode(13, OUTPUT)', 'led = Pin(13, Pin.OUT)'], ['digitalWrite(13, HIGH)', 'led.value(1)'], ['digitalRead(2)', 'boton.value()'], ['delay(500)', 'time.sleep_ms(500)']], c: 'rp_pin', h: 'value() con argumento escribe; sin argumento, lee.' },
      Q('¿Qué hace este bucle?', ['Cambia el LED cada 250 ms sin bloquear y sin acumular retraso', 'Espera 250 s', 'Apaga el LED tras 250 ms', 'Nada: ticks_diff no existe'], 'Es el «parpadeo sin delay» de MicroPython.', { code: 'antes = time.ticks_ms()\nwhile True:\n    if time.ticks_diff(time.ticks_ms(), antes) >= 250:\n        antes = time.ticks_add(antes, 250)\n        led.toggle()', c: 'rp_ticks', h: 'No hay ningún sleep.' }),
      Q('¿Por qué ticks_diff(a, b) y no a − b?', ['Porque el contador da la vuelta y ticks_diff lo tiene en cuenta', 'Porque es más rápido', 'Porque a − b da float', 'Da igual'], 'Tras la vuelta, a − b daría un número enorme o negativo.', { c: 'rp_ticks', h: 'Recuerda el reloj de 8 bits.' }),
      Q('Necesitas una señal de 1 MHz exacta. ¿Un bucle con toggle()?', ['No: usa PWM o PIO', 'Sí, con sleep_us(0)', 'Sí, si quitas los print', 'Solo en el núcleo 1'], 'El hardware dedicado no depende del intérprete.', { c: 'rp_hwtiming', h: 'Mira el dibujo del temblor.' }),
      Q('¿Qué hace la segunda línea?', ['Invierte el estado del LED, como toggle()', 'Lo apaga siempre', 'Da error: not no funciona con números', 'Lo enciende siempre'], 'not 0 es True (1) y not 1 es False (0).', { code: 'led = Pin(15, Pin.OUT)\nled.value(not led.value())', c: 'rp_pin', h: 'Lee el valor y escribe el contrario.' }),
      I('<b>Resumen</b>\n· <b>Pin(n, Pin.OUT)</b>, <b>.value()</b>, <b>.toggle()</b>; con <b>PULL_UP</b>, pulsado = 0.\n· Tiempo sin bloquear: <b>ticks_ms</b>, <b>ticks_diff</b> y <b>ticks_add</b>.\n· Señales exactas: hardware (PWM, PIO), no bucles.', { svg: S.pinmap })
    ]),
    L('rp11', 'Errores, módulos, ficheros y main.py', 'memory', ['rp_pyerr', 'rp_mainpy', 'rp_flash'], [
      PQ('Tu programa divide entre una variable que a veces vale 0. ¿Qué crees que pasa cuando vale 0?', ['Se para y muestra un traceback con ZeroDivisionError', 'Sale 0 y sigue', 'Sale infinito', 'Se reinicia la placa'], 'Python lanza una excepción; si nadie la captura, el programa se detiene y explica dónde.', 'rp_pyerr', 'Dividir entre cero no tiene resultado.'),
      I('Si nadie captura una excepción, el programa se para y muestra un <b>traceback</b>. Léelo de abajo arriba: la última línea es el tipo de error y la de encima, dónde saltó.', { svg: S.trace }),
      I('Con <b>try/except</b> decides qué hacer ante un fallo previsible. Un sensor I²C desconectado lanza <b>OSError</b>: lo capturas y el programa sigue.', { code: "try:\n    datos = i2c.readfrom(0x76, 6)   # puede fallar\nexcept OSError:\n    datos = None                    # y seguimos\nif datos is None:\n    print('sensor no responde')", more: 'Lo verás con el bus I²C en el módulo siguiente. Aquí importa la idea: los fallos previsibles se capturan; los demás acaban en un traceback que te dice dónde mirar.' }),
      I('Un <b>módulo</b> es un fichero .py: si guardas sensor.py en la placa, haces import sensor. Las bibliotecas van en la raíz o en <b>/lib</b>.', { code: "# sensor.py (en la placa)\ndef leer():\n    return 42\n\n# main.py\nimport sensor\nprint(sensor.leer())", more: 'En la Pico W puedes instalar bibliotecas por red con mip; en la Pico normal, las copias con Thonny o mpremote.' }),
      I("Ficheros en la flash: 'w' escribe (borra lo anterior), 'a' añade al final, 'r' lee. <b>with open(…) as f:</b> cierra el fichero solo, aunque haya un error.", { code: "with open('datos.csv', 'a') as f:\n    f.write('23.5,812\\n')\nwith open('datos.csv') as f:\n    for linea in f:\n        print(linea)" }),
      EX('Escribir en la flash la desgasta. Cambia cada cuánto mides y cuántas medidas agrupas por escritura.', 'rp_wearv', P.wear(), [
        TK('years', 0, 0.05, 'Escribe cada 10 ms: ¿cuánto duraría la flash?', 'Días. Cada escritura gasta un poco la flash.', 'Pon «medir cada» al mínimo y una medida por escritura.'),
        TK('yearsAt1', 10, 1e9, 'Mide cada segundo, pero haz que dure más de 10 años', 'Agrupando 60 medidas en RAM y escribiendo una vez por minuto, cientos de veces menos borrados.', 'Agrupa medidas por escritura.')]),
      I('Al encender, MicroPython ejecuta <b>boot.py</b> (si existe) y luego <b>main.py</b>. Truco: si main.py no te deja trabajar, que no haga nada cuando arrancas con un botón pulsado.', { svg: S.bootseq }),
      ST('Diseña la escritura de un registrador que mide cada 10 s.', ['Escribir cada medida: 8640 escrituras al día', 'Agrupa 30 medidas en una lista y escribe cada 5 min: 288 al día', "Con with open('datos.csv', 'a') el fichero se cierra solo", 'Treinta veces menos desgaste; si algo falla, pierdes como mucho 5 minutos'], 'Escribir por bloques, cada pocos minutos'),
      Q('¿Qué consigue este try?', ['Que un sensor desconectado no detenga todo el programa', 'Que el bus I²C vaya más rápido', 'Que el sensor se reinicie solo', 'Que no hagan falta pull-ups'], 'Un fallo del bus llega como OSError.', { code: 'try:\n    datos = i2c.readfrom(0x76, 6)\nexcept OSError:\n    datos = None', c: 'rp_pyerr', h: '¿Qué pasa con el programa si la lectura falla?' }),
      Q('¿Dónde está el fallo?', ['En la línea 5 de sensor.py, dentro de leer()', 'En la línea 12 de main.py', 'En el REPL', 'En el firmware'], 'La línea más baja del traceback es donde saltó el error.', { code: 'Traceback (most recent call last):\n  File "main.py", line 12, in <module>\n  File "sensor.py", line 5, in leer\nZeroDivisionError: divide by zero', c: 'rp_pyerr', h: 'Lee de abajo arriba.' }),
      Q('¿Dónde pones ssd1306.py para poder escribir import ssd1306?', ['En la raíz de la placa o en /lib', 'En el escritorio del PC', 'Dentro de main.py', 'En la ROM'], 'MicroPython busca en esas rutas.', { c: 'rp_mainpy', h: 'Tiene que estar en la placa, en una ruta conocida.' }),
      Q('¿Por qué conviene usar with open(...) as f?', ['Cierra el fichero aunque haya un error dentro del bloque', 'Lo abre más rápido', 'Lo cifra', 'Lo copia al PC'], 'Un fichero sin cerrar puede perder lo último escrito.', { c: 'rp_pyerr', h: 'Piensa en qué pasa si algo falla a mitad.' }),
      Q('Escribes una línea en la flash cada 10 ms durante meses. ¿Riesgo?', ['Desgastar la flash, que admite un número limitado de borrados', 'Ninguno', 'Que se llene la RAM', 'Que el USB se desconecte'], 'Agrupa los datos en RAM y escribe por bloques.', { c: 'rp_flash', h: 'Recuerda la exploración del desgaste.' }),
      Q('¿Para qué sirve este principio de main.py?', ['Si arrancas con el botón pulsado, el programa termina y te deja el REPL libre', 'Apaga la placa', 'Borra la flash', 'Reinicia en bucle'], 'Una puerta de escape para tus proyectos autónomos.', { code: "# main.py\nfrom machine import Pin\nimport sys\nif Pin(16, Pin.IN, Pin.PULL_UP).value() == 0:\n    sys.exit()", c: 'rp_mainpy', h: 'Con pull-up, pulsado lee 0.' }),
      { t: 'order', q: 'Ordena lo que pasa al encender una Pico con MicroPython.', items: ['El chip arranca desde su ROM', 'Se ejecuta el firmware de MicroPython desde la flash', 'MicroPython monta su sistema de ficheros', 'Ejecuta boot.py si existe', 'Ejecuta main.py si existe', 'Si main.py termina, queda el REPL'], e: 'Por eso main.py hace autónomo el proyecto.', c: 'rp_mainpy', h: 'Del hardware al REPL, de abajo arriba.' },
      I('<b>Resumen</b>\n· Traceback: abajo, el tipo; encima, dónde. <b>try/except</b> para lo previsible.\n· Módulos en la raíz o en <b>/lib</b>; ficheros con <b>with open</b>.\n· La flash se desgasta: <b>agrupa</b> las escrituras. main.py arranca solo.', { svg: S.bootseq })
    ])
  ];

  const M3 = [
    L('rp12', 'PWM en MicroPython', 'wave', ['rp_pwmpy', 'rp_pwmslice', 'rp_pwmfreq'], [
      PQ('En Arduino, analogWrite va de 0 a 255. En MicroPython, duty_u16 va de 0 a 65535. Para el 50 %, ¿qué número crees que pones?', ['32768', '128', '50', '255'], 'La mitad de 65535, unos 32768. La escala es más fina, pero la idea es la misma.', 'rp_pwmpy', 'Busca la mitad de la escala.'),
      EX('Elige la frecuencia y el ciclo de trabajo, y mira duty_u16, el pulso y el brillo.', 'rp_dutyv', P.duty(), [
        TK('du', 16000, 16700, 'Consigue duty_u16 ≈ 16384 (un cuarto)', '16384 / 65535 ≈ 25 %: la escala va de 0 a 65535 con cualquier frecuencia.', 'Un cuarto del recorrido.'),
        TK('servo', 1.45, 1.55, 'A 50 Hz, consigue un pulso de 1,5 ms (servo centrado)', '1,5 / 20 = 7,5 % → duty_u16 ≈ 4915.', 'Pon 50 Hz y busca el 7,5 %.')]),
      I('Tres líneas: crear el PWM, fijar la frecuencia y el ciclo de trabajo. <b>duty_u16</b> va de 0 (apagado) a 65535 (siempre encendido); MicroPython lo traduce al hardware.', { code: "from machine import Pin, PWM\npwm = PWM(Pin(15))\npwm.freq(1000)          # 1 kHz\npwm.duty_u16(32768)     # 50 %\n# …\npwm.deinit()            # para el PWM y libera el pin" }),
      I('<b>Servos</b>: a 50 Hz (periodo de 20 ms), un pulso de 1 a 2 ms decide el ángulo. duty_u16 = pulso / 20 ms × 65535. También existe duty_ns(1_500_000), que fija el pulso en nanosegundos.', { svg: S.servo }),
      EX('El RP2040 tiene 8 «slices» de PWM, cada uno con dos canales que comparten frecuencia. Empiezas con GP2 y GP3: mira la tabla, son el mismo slice y compartirían frecuencia.', 'rp_slicev', P.slice({ b: sl('Pin B (zumbador)', 3, 0, 29) }), [
        TK('sameCh', 1, 1, 'Mueve el pin B para que comparta incluso el canal con GP2', 'GPn y GP(n+16) son el mismo canal: también comparten el ciclo de trabajo.', 'Suma 16 al pin A.'),
        TK('ok', 1, 1, 'Sepáralos: servo a 50 Hz y zumbador a 2 kHz sin pisarse', 'Slices distintos, frecuencias independientes.', 'Mueve uno a otra columna.')]),
      I('La regla: <b>slice = (n // 2) % 8</b>; canal <b>A</b> si n es par, <b>B</b> si es impar. Por eso cambiar la frecuencia de GP2 cambia también la de GP3.', { ...tune('rp_slicev', P.slice({ b: sl('Pin B', 3, 0, 29) })) }),
      ST('Un servo en GP2 a 50 Hz y un zumbador a 2 kHz. ¿Dónde pones el zumbador?', ['GP2: (2 // 2) % 8 = 1 → slice 1, canal A', 'GP3 también es slice 1 (canal B): compartiría los 50 Hz', 'GP18: (18 // 2) % 8 = 1 → también slice 1', 'GP4: (4 // 2) % 8 = 2 → slice 2, libre'], 'GP4 (o cualquier pin de otro slice)'),
      I('¿Qué frecuencia? Por debajo de unos 100 Hz se ve parpadear un LED; hasta unos 20 kHz, una bobina puede pitar. Para LEDs y motores pequeños, 20–25 kHz es un buen compromiso.', { svg: S.pwmfreq }),
      Q('duty_u16(16384) es un ciclo de trabajo de…', ['25 %', '16 %', '50 %', '6,25 %'], '16384 / 65536 = 0,25.', { c: 'rp_pwmpy', h: 'Divide entre 65536.' }),
      Nm('¿Qué duty_u16 corresponde al 75 %?', 49151, '', '65535 × 0,75 ≈ 49151.', { tol: 30, c: 'rp_pwmpy', h: 'Multiplica 65535 por 0,75.' }),
      G('rp_pwmSlice'),
      Q('¿Qué frecuencia tiene al final GP0?', ['1000 Hz: GP0 y GP16 son el mismo slice y el mismo canal', '50 Hz', 'Las dos a la vez', 'Da error'], 'Slice 0, canal A en los dos: además comparten ciclo de trabajo.', { code: 'a = PWM(Pin(0)); a.freq(50)\nb = PWM(Pin(16)); b.freq(1000)', c: 'rp_pwmslice', h: 'Calcula el slice de 0 y de 16.' }),
      Nm('Servo a 50 Hz. ¿duty_u16 para un pulso de 1,25 ms?', 4096, '', '1,25 / 20 × 65535 ≈ 4096.', { tol: 10, c: 'rp_pwmpy', h: 'Fracción del periodo (pulso / 20 ms) × 65535.' }),
      Q('Quieres atenuar un LED sin parpadeo visible ni pitido en la bobina de un motor. ¿Frecuencia?', ['Unos 20–25 kHz', '50 Hz', '1 Hz', '125 MHz'], 'Por encima del oído humano y con buena resolución.', { c: 'rp_pwmfreq', h: 'Ni visible ni audible, sin pasarte.' }),
      Q('¿Qué hace pwm.deinit()?', ['Para el PWM y libera el pin', 'Pone el duty al 100 %', 'Reinicia la placa', 'Cambia de slice'], 'Útil para devolver el pin a otra función.', { c: 'rp_pwmpy', h: 'Es lo contrario de crear el PWM.' }),
      I('<b>Resumen</b>\n· <b>PWM(Pin(n))</b>, <b>freq()</b> y <b>duty_u16</b> de 0 a 65535.\n· Servo: 50 Hz y pulsos de 1–2 ms.\n· <b>slice = (n // 2) % 8</b>: los dos canales de un slice comparten frecuencia.', { svg: S.servo })
    ]),
    PRJ('rp-p1', 'Proyecto: lámpara RGB a pilas', 'rp_kit'),
    L('rp13', 'El ADC y read_u16', 'gauge', ['rp_adc16', 'rp_adcch', 'rp_adcgood', 'rp_vsys'], [
      PQ('Un pin analógico de la Pico recibe 1,65 V, justo la mitad de 3,3 V. ¿Qué crees que devuelve read_u16()?', ['Unos 32 768', 'Unos 2048', 'Unos 512', '1,65'], 'read_u16() siempre da una escala de 0 a 65535: la mitad es unos 32 768.', 'rp_adc16', 'Mira el nombre: u16 = 16 bits sin signo.'),
      EX('Sigue la cadena del pin a los voltios, con ruido y promedios.', 'rp_adcv', P.adc(), [
        TK('u16', 32000, 33500, 'Consigue que read_u16 dé unos 32 768', '1,65 V: justo la mitad de 3,3 V.', 'Sube la tensión hasta la mitad de 3,3 V.'),
        TK('noise20', 0, 5.1, 'Con el ruido en 20 cuentas, reduce el temblor a la cuarta parte', '√16 = 4: promediar 16 lecturas divide el ruido aleatorio entre 4.', 'Promedia más lecturas.')]),
      I('El ADC del RP2040 es de <b>12 bits</b> y llega a 500 000 muestras por segundo. Canales 0–3 en GP26–GP29 (en el conector, GP26–GP28) y el 4, el sensor de temperatura.', { code: "from machine import ADC\npot = ADC(26)          # o ADC(0): el mismo canal\nn = pot.read_u16()     # 0 … 65535\nv = n * 3.3 / 65535    # voltios\nprint(n, v)" }),
      I('read_u16() <b>estira</b> los 12 bits a 16: avanza de 16 en 16 y no gana precisión. Un paso real vale 3,3 V / 4096 ≈ 0,806 mV.', { svg: S.u16, more: 'Y en la práctica el ADC del RP2040 da bastante menos de 12 bits efectivos: ruido y algunos errores de linealidad conocidos. Para medidas finas, un ADC externo.' }),
      I('Para medir mejor: <b>promedia</b>, pon <b>GP23 a 1</b> (el regulador de la Pico pasa a PWM y mete menos rizado), usa <b>AGND</b> y no conectes fuentes de mucha impedancia sin un condensador de 100 nF.', { code: "from machine import ADC, Pin\nPin(23, Pin.OUT).value(1)   # regulador en modo PWM (Pico sin W)\nadc = ADC(26)\ndef media(n=16):\n    return sum(adc.read_u16() for _ in range(n)) / n", more: 'El ADC carga un condensador interno en cada muestra: con un divisor de megaohmios no le da tiempo y lee bajo e inestable. Mantén la fuente en unos pocos kΩ o pon 100 nF en la entrada si la señal es lenta.\nEn la Pico W, el pin que controla el modo del regulador pasa por la radio: no es GP23.' }),
      ST('read_u16() da 20 000. ¿Qué tensión hay en el pin? ¿Y si fuera ADC(3), que mide VSYS?', ['V = 20 000 × 3,3 / 65 535', '= 1,007 V en el pin', 'ADC(3) ve VSYS a través de un divisor ÷3: VSYS = 3 × 1,007', '= 3,02 V'], '1,01 V en el pin · 3,02 V de VSYS'),
      Q('ADC(26) y ADC(0) en MicroPython…', ['Son el mismo canal: GP26 es el ADC0', 'Son distintos', 'ADC(0) es el sensor de temperatura', 'ADC(26) no existe'], 'Puedes pasar el número de canal o el pin.', { c: 'rp_adcch', h: 'Canal = GPIO − 26.' }),
      G('rp_u16V'),
      Nm('¿Cuántos mV vale un paso del ADC de 12 bits con 3,3 V de referencia?', 0.806, 'mV', '3300 / 4096 ≈ 0,806 mV.', { tol: 0.01, c: 'rp_adc16', h: '3300 mV entre 4096 pasos.' }),
      Q('¿Por qué poner GP23 a 1 mejora las medidas del ADC en la Pico?', ['El regulador pasa a modo PWM: menos rizado, a cambio de algo más de consumo', 'Activa un ADC de 16 bits', 'Apaga la WiFi', 'Sube la referencia a 5 V'], 'En modo ahorro, el regulador mete un rizado irregular.', { c: 'rp_adcgood', h: 'GP23 controla el modo del regulador.' }),
      Q('Promedias 16 lecturas de un valor fijo con ruido aleatorio. El ruido baja más o menos…', ['A la cuarta parte (√16 = 4)', 'A la dieciseisava parte', 'A la mitad', 'No baja'], 'El ruido aleatorio baja con la raíz del número de lecturas.', { c: 'rp_adcgood', h: 'Raíz cuadrada del número de lecturas.' }),
      Q('Divisor de 1 MΩ y 1 MΩ en una entrada del ADC; la lectura sale baja e inestable. ¿Arreglo?', ['Bajar el divisor a decenas de kΩ o poner 100 nF en la entrada', 'Subirlo a 10 MΩ', 'Usar duty_u16', 'Pasar a GP15'], 'El condensador actúa como depósito para cada muestra.', { c: 'rp_adcgood', h: 'Al ADC no le da tiempo a cargar su condensador.' }),
      G('rp_vsys'),
      Q('Conectas un sensor analógico a GP15 y ADC(15) da error. ¿Por qué?', ['GP15 no tiene ADC: solo GP26–GP29', 'Hay que usar ADC(0)', 'El sensor es de 5 V', 'Falta un pull-up'], 'En el RP2040 solo esos cuatro pines tienen entrada analógica.', { c: 'rp_adcch', h: '¿Qué GPIO tienen ADC?' }),
      I('<b>Resumen</b>\n· <b>read_u16()</b>: de 0 a 65535; <b>V = n × 3,3 / 65535</b>.\n· 12 bits reales: un paso ≈ 0,8 mV.\n· Medidas fiables: promediar, GP23 a 1, poca impedancia. VSYS: ADC(3) × 3.', { svg: S.u16 })
    ]),
    L('rp14', 'El sensor de temperatura interno', 'heat', ['rp_tempsens', 'rp_adcgood'], [
      PQ('El sensor del chip es una unión PN, como un diodo. Si el chip se calienta, ¿qué crees que hace su tensión?', ['Baja', 'Sube', 'No cambia', 'Se hace negativa'], 'Como en un diodo: más calor, menos tensión directa. Unos 1,7 mV por grado.', 'rp_tempsens', 'Recuerda lo que pasaba con el diodo y la temperatura en el curso base.'),
      EX('Cambia la temperatura real del chip y la referencia real del ADC.', 'rp_tempv', P.temp(), [
        TK('V', 0.705, 0.7075, 'Busca la temperatura a la que el sensor da 0,706 V', '27 °C: el punto de referencia de la fórmula.', 'Ve bajando la temperatura.'),
        TK('V', 0.72, 0.8, 'Haz que la tensión pase de 0,72 V', 'Hay que enfriar: pendiente negativa, más tensión = menos temperatura.', 'Baja de 19 °C.'),
        TK('aerr', 5, 100, 'Ahora cambia la referencia real: consigue más de 5 °C de error', 'Con 3,25 V reales y cuentas hechas con 3,3 V, el error ronda los 6 °C.', 'Pon la referencia en 3,25 V.')]),
      I('El canal 4 del ADC mide una unión PN del chip: unos 0,706 V a 27 °C, y baja 1,721 mV por grado.\n<b>T = 27 − (V − 0,706) / 0,001721</b>', { code: "from machine import ADC\nsensor = ADC(4)\nv = sensor.read_u16() * 3.3 / 65535\nt = 27 - (v - 0.706) / 0.001721\nprint(f'{t:.1f} C')" }),
      I('Es poco fino: un paso del ADC equivale a casi medio grado, y un error pequeño en la referencia da varios grados. Además mide el <b>silicio</b>, que se calienta al trabajar.', { svg: S.tempstep }),
      ST('read_u16() de ADC(4) da 13 900. ¿Temperatura?', ['V = 13 900 × 3,3 / 65 535 = 0,6999 V', 'V − 0,706 = −0,0061 V', '−0,0061 / 0,001721 ≈ −3,5', 'T = 27 − (−3,5) = 30,5 °C'], '≈ 30,5 °C'),
      I('Calibrar en un punto: compáralo con un termómetro fiable y guarda la diferencia. Úsalo para vigilar el chip; para el aire, un sensor externo (DS18B20, SHT31, BME280).', { code: "AJUSTE = -1.8   # medido frente a un termómetro\nt = 27 - (v - 0.706) / 0.001721 + AJUSTE", more: 'En dos puntos (frío y caliente) puedes corregir también la pendiente.' }),
      Q('Si la tensión del sensor sube, la temperatura…', ['Baja: la pendiente es negativa', 'Sube', 'No cambia', 'Depende del reloj'], 'Como en un diodo: más calor, menos tensión directa.', { c: 'rp_tempsens', h: 'Fíjate en el signo menos de la fórmula.' }),
      G('rp_temp'), G('rp_temp'),
      Nm('Un paso del ADC (0,806 mV), ¿a cuántos °C equivale en este sensor?', 0.47, '°C', '0,806 / 1,721 ≈ 0,47 °C.', { tol: 0.02, c: 'rp_tempsens', h: 'Divide el paso entre 1,721 mV por grado.' }),
      Q('Tu ADC_VREF real es 3,25 V pero calculas con 3,3 V. El error en temperatura…', ['Es de varios grados: la referencia escala toda la medida', 'Es despreciable', 'Es exactamente 0,05 °C', 'No afecta porque el sensor es interno'], 'Calculas 0,717 V en vez de 0,706: unos 6 °C de error.', { c: 'rp_tempsens', h: 'Recuerda la tercera tarea de la exploración.' }),
      Q('¿Qué mejorarías primero en este código?', ['Promediar varias lecturas', 'Multiplicar por 1000', 'Usar ADC(26)', 'Nada, es perfecto'], 'Una sola lectura salta medio grado arriba y abajo.', { code: 'from machine import ADC\ns = ADC(4)\nv = s.read_u16() * 3.3 / 65535\nprint(27 - (v - 0.706) / 0.001721)', c: 'rp_adcgood', h: 'Una sola lectura del ADC tiembla.' }),
      Q('La CPU pasa de reposo a calcular al máximo. La lectura del sensor interno…', ['Sube algo: mide el silicio, que se calienta al trabajar', 'Baja', 'No cambia', 'Se vuelve negativa'], 'Por eso no es un buen termómetro ambiental.', { c: 'rp_tempsens', h: '¿Qué está midiendo exactamente?' }),
      I('<b>Resumen</b>\n· ADC(4): <b>T = 27 − (V − 0,706) / 0,001721</b>, pendiente negativa.\n· Medio grado por paso y muy sensible a la referencia: promedia y calibra.\n· Vigila el chip; para el aire, un sensor externo.', { svg: S.tempstep })
    ]),
    L('rp15', 'Timer e interrupciones de pin', 'timer', ['rp_timer', 'rp_irq', 'rp_debounce', 'rp_pullup', 'rp_hwtiming'], [
      PQ('Quieres que un LED parpadee mientras tú escribes órdenes en el REPL. ¿Cómo crees que se puede?', ['Con un Timer que llama a una función cada cierto tiempo', 'No se puede: el REPL lo bloquea todo', 'Con un while True', 'Con dos placas'], 'Un Timer llama a tu función por su cuenta, mientras el resto sigue.', 'rp_timer', 'Algo tiene que avisar periódicamente sin que tú esperes.'),
      I('<b>Timer(period=500, mode=Timer.PERIODIC, callback=f)</b> llama a f cada 500 ms; con <b>Timer.ONE_SHOT</b>, una sola vez. El callback recibe el temporizador.', { code: "from machine import Timer, Pin\nled = Pin('LED', Pin.OUT)\nt = Timer(period=250, mode=Timer.PERIODIC,\n          callback=lambda t: led.toggle())\n# lambda: una función de una línea, sin nombre" }),
      I('<b>pin.irq(trigger=Pin.IRQ_FALLING, handler=f)</b> llama a f(pin) en cada flanco de bajada. También IRQ_RISING, o los dos juntos con |.', { code: "from machine import Pin\nb = Pin(14, Pin.IN, Pin.PULL_UP)\npulsado = False\ndef al_pulsar(p):\n    global pulsado\n    pulsado = True          # solo avisar\nb.irq(trigger=Pin.IRQ_FALLING, handler=al_pulsar)" }),
      I('Reglas del handler: <b>corto</b>, sin sleep, sin pantallas ni ficheros. Sube una bandera y deja el trabajo al bucle principal. Con <b>hard=True</b> corre al instante, pero no puede reservar memoria.', { svg: S.irq, more: 'En el RP2040, los handlers de pin de MicroPython son «blandos» por defecto: corren en cuanto el intérprete puede, con un retraso de microsegundos a milisegundos si está ocupado (por ejemplo, recogiendo basura).\nCon hard=True no puedes crear objetos: ni floats nuevos, ni listas, ni hacer crecer una lista con append. micropython.alloc_emergency_exception_buf(100) te deja ver los errores que ocurran dentro.' }),
      EX('Un pulsador rebota: varios flancos en pocos milisegundos. Ajusta el antirrebote.', 'rp_bouncev', P.bounce(), [
        TK('n', 1, 1, 'Cuenta una sola pulsación', 'Con una ventana mayor que los huecos entre rebotes, solo cuenta el primero.', 'Sube el antirrebote unos milisegundos.'),
        TK('n10ok', 1, 1, 'Ahora con un pulsador que rebota 10 ms, que siga contando 1', 'Por eso se usan 20–30 ms: cubren casi cualquier pulsador.', 'Pon el rebote en 10 ms y ajusta.')]),
      ST('Llegan flancos de bajada en 0, 2, 3, 5 y 120 ms. El handler cuenta si han pasado más de 30 ms desde el último flanco. ¿Cuántas pulsaciones cuenta?', ['0 ms: el último fue hace mucho → cuenta 1; último = 0', '2, 3 y 5 ms: menos de 30 ms desde el anterior → ignorados (último se actualiza a 5)', '120 ms: 115 ms desde el 5 → cuenta 2', 'Dos pulsaciones reales, sin rebotes'], '2 pulsaciones'),
      Q('¿Qué hace?', ['Hace parpadear el LED cada 250 ms mientras el programa sigue con otras cosas', 'Espera 250 ms y se para', 'Bloquea el REPL', 'Da error: no se permite lambda'], 'El REPL sigue disponible mientras parpadea.', { code: "from machine import Timer, Pin\nled = Pin('LED', Pin.OUT)\nt = Timer(period=250, mode=Timer.PERIODIC,\n          callback=lambda t: led.toggle())", c: 'rp_timer', h: 'PERIODIC repite.' }),
      Q('Pulsador a GND con pull-up: ¿qué disparo detecta el momento de pulsar?', ['Pin.IRQ_FALLING', 'Pin.IRQ_RISING', 'Ninguno', 'Pin.IRQ_LOW_LEVEL'], 'Al pulsar, el pin cae de 1 a 0.', { c: 'rp_pullup', h: '¿De qué nivel a qué nivel va al pulsar?' }),
      Q('¿Qué cambiarías en este handler?', ['Que solo suba una bandera y el bucle principal dibuje', 'Subir el sleep a 500 ms', 'Usar IRQ_RISING', 'Nada, está bien'], 'Dibujar y esperar dentro del handler bloquea todo lo demás.', { code: "def pulsado(p):\n    time.sleep_ms(50)\n    oled.text('Pulsado', 0, 0)\n    oled.show()\nb.irq(trigger=Pin.IRQ_FALLING, handler=pulsado)", c: 'rp_irq', h: 'Busca lo que tarda dentro del handler.' }),
      Q('Con hard=True, ¿qué línea dará problemas dentro del handler?', ['lecturas.append(adc.read_u16())', 'contador += 1', 'bandera = True', 'led.value(1)'], 'append puede necesitar más memoria para la lista.', { c: 'rp_irq', h: '¿Cuál puede necesitar memoria nueva?' }),
      Q('¿Qué hace este handler?', ['Cuenta pulsaciones exigiendo 30 ms de calma antes de cada una', 'Cuenta todos los flancos', 'Espera 30 ms', 'Nunca cuenta'], 'Como «ultimo» se actualiza en cada flanco, los rebotes reinician la espera.', { code: 'ultimo = 0\ndef pulsado(p):\n    global ultimo, cuenta\n    ahora = time.ticks_ms()\n    if time.ticks_diff(ahora, ultimo) > 30:\n        cuenta += 1\n    ultimo = ahora', c: 'rp_debounce', h: 'Sigue el ejemplo resuelto.' }),
      Q('Un handler «blando» de MicroPython puede tardar en ejecutarse…', ['Desde microsegundos hasta milisegundos, si el intérprete está ocupado', 'Siempre 0 ns', 'Exactamente 1 ms', 'Un segundo'], 'Por ejemplo, durante una recogida de basura.', { c: 'rp_irq', h: 'Corre cuando el intérprete puede.' }),
      Q('Necesitas medir pulsos de 2 µs con exactitud. ¿Qué usas?', ['PIO o un slice de PWM como contador, no una interrupción en Python', 'Pin.irq con hard=False', 'time.sleep_us', 'Un Timer de 1 ms'], 'El retraso de Python es mayor que el propio pulso.', { c: 'rp_hwtiming', h: 'Compara 2 µs con lo que tarda en llegar un handler.' }),
      Q('¿Qué modo usas para apagar un LED 10 s después de pulsar?', ['Timer.ONE_SHOT', 'Timer.PERIODIC', 'time.sleep(10) en el handler', 'Pin.IRQ_RISING'], 'Una sola vez, dentro de un tiempo.', { c: 'rp_timer', h: 'Solo tiene que ocurrir una vez.' }),
      I('<b>Resumen</b>\n· <b>Timer</b>: PERIODIC o ONE_SHOT, sin bloquear.\n· <b>pin.irq</b>: handler corto que sube una bandera; con hard=True, sin crear objetos.\n· Antirrebote: ignora lo que llega antes de 20–30 ms.', { svg: S.irq })
    ]),
    L('rp16', 'I²C en MicroPython', 'bus', ['rp_i2c', 'rp_struct', 'rp_pinout'], [
      PQ('Tu bus I²C funciona a 100 kHz, pero falla a 400 kHz con 20 cm de cable y solo las pull-ups internas. ¿Qué crees que pasa?', ['Los flancos de subida son demasiado lentos', 'El sensor nunca admite 400 kHz', 'Faltan direcciones', 'Hay que usar 5 V'], 'En I²C, la línea solo la sube la pull-up; con una débil y más capacidad de cable, sube tarde.', 'rp_i2c', '¿Quién sube las líneas en I²C?'),
      EX('La pull-up carga la capacidad del bus. Cambia resistencia, capacidad y velocidad.', 'rp_i2cv', P.i2c(), [
        TK('ok400', 1, 1, 'A 400 kHz, consigue flancos que lleguen a tiempo', 'Pull-ups más bajas cargan antes la capacidad del bus: 2,2–4,7 kΩ es lo típico.', 'Prueba con 2,2 kΩ.'),
        TK('ok400pF', 1, 1, 'Ahora con 400 pF de cable, haz que funcione', 'Con 400 pF ni 1 kΩ basta para 400 kHz: con cables largos, baja a 100 kHz.', 'Quizá haya que cambiar la velocidad.')]),
      I('El RP2040 tiene <b>I2C(0)</b> e <b>I2C(1)</b>, cada uno en sus parejas de pines. <b>scan()</b> pregunta a todas las direcciones y devuelve las que contestan, <b>en decimal</b>.', { code: "from machine import Pin, I2C\ni2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400_000)\nprint(i2c.scan())    # [118] → 0x76, un BME280\nprint(hex(118))      # '0x76'", more: 'Si scan() devuelve [], nadie contesta: revisa alimentación, masa común, SDA y SCL sin cruzar y pull-ups. Casi siempre es cableado.\nSi te faltan buses existe SoftI2C, por software… y el PIO.' }),
      I('Los sensores tienen <b>registros</b>: lees bytes de una dirección interna. Esos bytes se convierten en números con <b>struct.unpack</b>.', { code: "import struct\nb = i2c.readfrom_mem(0x68, 0x3B, 2)    # 2 bytes del registro 0x3B\nax = struct.unpack('>h', b)[0]          # 16 bits con signo, alto primero\ni2c.writeto_mem(0x68, 0x6B, b'\\x00')    # escribir un registro" }),
      I("En struct: <b>&gt;</b> = byte alto primero, <b>&lt;</b> = bajo primero; <b>h</b> = 16 bits con signo, <b>H</b> = sin signo. Elegir mal da números absurdos.", { svg: S.struct }),
      ST('Un sensor devuelve los bytes 0xFF y 0x38, alto primero y con signo. ¿Qué número es?', ['Juntos, alto primero: 0xFF38', 'Sin signo sería 65 336', 'Con signo de 16 bits: si pasa de 32 767, se le restan 65 536', '65 336 − 65 536 = −200'], "−200 (struct.unpack('>h', b) lo hace por ti)"),
      Q('¿Qué significa [118]?', ['Hay un dispositivo en la dirección 0x76', 'Hay 118 dispositivos', 'Error 118', 'La frecuencia es 118 kHz'], '118 = 0x76: por ejemplo, un BME280.', { code: 'i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400_000)\nprint(i2c.scan())\n[118]', c: 'rp_i2c', h: 'scan() da direcciones en decimal.' }),
      Q('¿Funciona I2C(0, sda=Pin(6), scl=Pin(7))?', ['No: GP6 y GP7 son pines de I²C1', 'Sí, cualquier pin vale', 'Solo a 100 kHz', 'Solo en la Pico W'], 'Usa I2C(1, sda=Pin(6), scl=Pin(7)).', { c: 'rp_pinout', h: 'Las parejas alternan entre I²C0 e I²C1.' }),
      Q('¿Qué indica >h?', ['Entero de 16 bits con signo, byte alto primero', 'Entero sin signo de 8 bits', 'Float de 32 bits', 'Texto'], 'El MPU-6050, por ejemplo, entrega así sus medidas.', { code: "b = i2c.readfrom_mem(0x68, 0x3B, 2)\nax = struct.unpack('>h', b)[0]", c: 'rp_struct', h: '> es el orden; h, el tamaño y el signo.' }),
      Q('Bus I²C a 400 kHz con 20 cm de cable. ¿Bastan los pull-ups internos?', ['Mejor no: son débiles; pon 2,2–4,7 kΩ externas', 'Sí, siempre', 'No hacen falta pull-ups en I²C', 'Pon pull-downs'], 'Las internas son de 50–80 kΩ: flancos demasiado lentos.', { c: 'rp_i2c', h: 'Recuerda la exploración con 47 kΩ.' }),
      Q('i2c.scan() devuelve [] con el sensor conectado. ¿Qué compruebas primero?', ['Alimentación, masa común, SDA/SCL no cruzados y pull-ups', 'La versión de Thonny', 'El duty del PWM', 'La WiFi'], 'Casi siempre es cableado.', { c: 'rp_i2c', h: 'Nadie contesta: empieza por lo físico.' }),
      Nm('¿Qué número decimal devuelve scan() para una pantalla en 0x3C?', 60, '', '0x3C = 3 × 16 + 12 = 60.', { c: 'rp_i2c', h: 'Pasa el hexadecimal a decimal: 3 × 16 + C.' }),
      Q('¿Qué formato de struct usas para 16 bits sin signo con el byte bajo primero?', ['<H', '>h', '>H', '<h'], '< es el bajo primero; H mayúscula, sin signo.', { c: 'rp_struct', h: 'Orden, luego tamaño y signo.' }),
      I('<b>Resumen</b>\n· <b>I2C(bus, sda, scl, freq)</b> con pines de ese bus; <b>scan()</b> en decimal.\n· Pull-ups externas de 2,2–4,7 kΩ a 400 kHz.\n· Bytes a números con <b>struct</b>: orden (&lt; &gt;), tamaño y signo.', { svg: S.struct })
    ]),
    L('rp47', 'SPI y UART en MicroPython', 'bus', ['rp_buses', 'rp_uartproto'], [
      PQ('Tienes dos chips SPI en los mismos tres hilos (SCK, MOSI y MISO). ¿Cómo crees que eliges con cuál hablas?', ['Con un pin CS distinto para cada uno', 'Por su dirección, como en I²C', 'Por el baudio', 'No se puede: un chip por bus'], 'Bajas el CS del que quieres oír; los demás, con el CS alto, ignoran el bus.', 'rp_buses', 'SPI no usa direcciones.'),
      I('Tres formas de hablar: I²C por direcciones; <b>SPI</b> con un CS por chip; <b>UART</b> con TX y RX cruzados y el mismo baudio en los dos extremos.', { svg: S.buses }),
      I('<b>SPI</b>: el CS lo manejas tú con un Pin normal. Funciones: write, read y write_readinto.', { code: "from machine import Pin, SPI\nspi = SPI(0, baudrate=10_000_000, sck=Pin(18), mosi=Pin(19), miso=Pin(16))\ncs = Pin(17, Pin.OUT, value=1)\ncs.value(0)                 # elige el chip\nspi.write(b'\\x9f')         # orden: «dime tu ID»\nid = spi.read(3)\ncs.value(1)                 # suéltalo" }),
      EX('Una UART envía cada byte con un bit de inicio, 8 de datos y uno de parada. Elige el byte y el baudio.', 'rp_framev', P.frame(), [
        TK('b', 85, 85, 'Envía 0x55 (85): mira cómo alterna la línea', '0x55 = 01010101: alterna en cada bit, empezando por el bit 0.', 'Busca el 85.'),
        TK('frameT', 1000, 1100, 'Elige el baudio para que un byte tarde algo más de 1 ms', '10 bits por byte (inicio + 8 + parada): 10 / 9600 s ≈ 1,04 ms.', 'El baudio más lento.')]),
      I('<b>UART</b>: <b>any()</b> dice cuántos bytes esperan y <b>readline()</b> devuelve una línea entera. Así lees sin quedarte bloqueado.', { code: "from machine import Pin, UART\nuart = UART(1, baudrate=9600, tx=Pin(4), rx=Pin(5))\nwhile True:\n    if uart.any():\n        linea = uart.readline()    # p. ej., una frase de un GPS\n        print(linea)\n    # … el bucle sigue con lo suyo" }),
      ST('¿Cuánto tarda en llegar una frase de GPS de 70 caracteres a 9600 baudios?', ['Cada carácter es un byte con inicio y parada: 10 bits', '70 × 10 = 700 bits', '700 / 9600 = 0,073 s', 'Unos 73 ms: por eso se lee sin bloquear, mirando any()'], '≈ 73 ms'),
      Q('¿Por qué se baja cs antes y se sube después?', ['Para elegir ese chip solo durante la transacción', 'Para alimentarlo', 'Para ponerlo en modo I²C', 'No hace falta'], 'Varios chips comparten SCK, MOSI y MISO; el CS elige con quién hablas.', { code: "cs.value(0)\nspi.write(b'\\x9f')\nid = spi.read(3)\ncs.value(1)", c: 'rp_buses', h: 'Con el CS alto, el chip ignora el bus.' }),
      Q('Un GPS envía frases de texto por UART a 9600 baudios. ¿Cómo lees una completa?', ['Con uart.readline() cuando uart.any() indique datos', 'Con i2c.scan()', 'Con spi.read(9600)', 'Con adc.read_u16()'], 'Cada frase termina en salto de línea.', { c: 'rp_buses', h: 'Quieres una línea entera de texto.' }),
      { t: 'match', q: 'Une cada bus con su rasgo.', pairs: [['I²C', 'Direcciones, dos hilos y pull-ups'], ['SPI', 'Rápido, un CS por dispositivo'], ['UART', 'Sin reloj, TX y RX cruzados'], ['1-Wire', 'Un hilo de datos y pull-up de 4,7 kΩ']], c: 'rp_buses', h: 'Solo uno de ellos elige por dirección.' },
      Q('¿Qué nivel tiene la línea UART en reposo?', ['Alto', 'Bajo', 'Alterna', 'Alta impedancia'], 'Por eso el bit de inicio, bajo, se distingue.', { c: 'rp_uartproto', h: 'Mira la línea antes del bit de inicio.' }),
      Nm('A 115 200 baudios, ¿cuántos bytes por segundo como máximo?', 11520, 'bytes/s', '10 bits por byte: 115 200 / 10 = 11 520.', { c: 'rp_uartproto', h: 'Cada byte son 10 bits en la línea.' }),
      Q('Conectas TX de la Pico con TX del módulo y RX con RX. ¿Qué pasa?', ['No se entienden: hay que cruzar TX con RX', 'Funciona igual', 'Va más rápido', 'Se queman los dos'], 'Lo que uno envía lo tiene que recibir el otro.', { c: 'rp_buses', h: 'Lo que sale por un TX tiene que entrar por un RX.' }),
      I('<b>Resumen</b>\n· <b>SPI</b>: reloj y datos compartidos, un <b>CS</b> por chip.\n· <b>UART</b>: TX↔RX, mismo baudio; reposo alto, inicio bajo, 8 datos (bit 0 primero), parada alta.\n· Lee sin bloquear: <b>any()</b> y <b>readline()</b>.', { svg: S.buses })
    ]),
    PRJ('rp-p2', 'Proyecto: reloj de ajedrez', 'rp_chess'),
    L('rp17', 'Multitarea con asyncio', 'timer', ['rp_async'], [
      PQ('Dos LEDs deben parpadear a ritmos distintos (200 y 700 ms). Con time.sleep, cada espera bloquea a la otra. ¿Qué crees que permite asyncio?', ['Que cada parpadeo espere sin bloquear al otro, por turnos', 'Ejecutarlos en dos placas', 'Que el tiempo vaya más rápido', 'Usar los dos núcleos automáticamente'], 'Cada tarea cede el turno mientras espera; todo corre en un núcleo, por turnos.', 'rp_async', 'Piensa en turnos, no en paralelo.'),
      EX('La tarea A parpadea cada 200 ms. La B espera dentro de su bucle. Compara las dos formas de esperar.', 'rp_asyncv', P.async(), [
        TK('maxdSleep', 0, 60, 'Con time.sleep, baja la espera de B hasta que A se retrase menos de 60 ms', 'Cuanto más dura un bloqueo, más se retrasan las demás tareas.', 'Baja la espera de B.'),
        TK('awFull', 1, 1, 'Ahora deja los 500 ms, pero con await', 'await asyncio.sleep_ms cede el turno: A no nota nada.', 'Cambia la forma de esperar a 1 y la espera a 500.')]),
      I('Una tarea es una función <b>async def</b>; dentro, <b>await</b> cede el turno. <b>create_task()</b> la lanza y <b>asyncio.run()</b> arranca el planificador.', { code: "import asyncio\nfrom machine import Pin\n\nasync def parpadea(led, ms):\n    while True:\n        led.toggle()\n        await asyncio.sleep_ms(ms)   # cede el turno\n\nasync def main():\n    asyncio.create_task(parpadea(Pin(14, Pin.OUT), 200))\n    asyncio.create_task(parpadea(Pin(15, Pin.OUT), 700))\n    await asyncio.sleep(10)\n\nasyncio.run(main())", more: 'En versiones antiguas de MicroPython el módulo se llamaba uasyncio.' }),
      I('Un solo camarero para varias mesas: toma nota, pasa a otra y vuelve. Cada <b>await</b> es «paso a otra mesa». Si una tarea no hace await, el camarero se queda plantado.', { svg: S.turns }),
      I('Para comunicar tareas, <b>asyncio.Event</b>. Para que una interrupción avise a una tarea, <b>ThreadSafeFlag</b>. Y para no esperar sin límite, <b>wait_for</b>.', { code: "flag = asyncio.ThreadSafeFlag()\ndef al_pulsar(p):\n    flag.set()                 # desde el handler\n\nasync def boton():\n    while True:\n        await flag.wait()      # duerme hasta el aviso\n        print('pulsado')\n\n# como mucho 2 s esperando a un sensor:\n# valor = await asyncio.wait_for(leer(), 2)" }),
      ST('A espera 200 ms y B 300 ms, las dos con await. ¿Cuándo corre cada una hasta los 600 ms?', ['t = 0: arrancan A y B; las dos hacen su trabajo y llegan al await', 't = 200: despierta A; t = 300: despierta B', 't = 400: A otra vez', 't = 600: A y B (el orden entre ellas lo decide el planificador)'], 'A en 0, 200, 400, 600 · B en 0, 300, 600'),
      Q('¿Qué pasa?', ['Los dos LEDs parpadean a ritmos distintos durante 10 s', 'Solo parpadea el primero', 'Parpadean a la vez a 200 ms', 'Da error: no se pueden crear dos tareas'], 'Cada await sleep_ms deja correr a la otra tarea.', { code: 'async def parpadea(led, ms):\n    while True:\n        led.toggle()\n        await asyncio.sleep_ms(ms)\n\nasync def main():\n    asyncio.create_task(parpadea(Pin(14, Pin.OUT), 200))\n    asyncio.create_task(parpadea(Pin(15, Pin.OUT), 700))\n    await asyncio.sleep(10)\n\nasyncio.run(main())', c: 'rp_async', h: 'Cada tarea cede el turno en su await.' }),
      Q('En ese programa, ¿qué cambia si pones time.sleep_ms(ms) en lugar de await asyncio.sleep_ms(ms)?', ['Solo correría la primera tarea: nunca cede el turno', 'Nada', 'Va más rápido', 'Las dos irían a 700 ms'], 'time.sleep bloquea todo el planificador.', { c: 'rp_async', h: 'time.sleep no tiene await.' }),
      Q('¿Cómo avisa una interrupción de pin a una tarea de asyncio?', ['Con ThreadSafeFlag: el handler hace set() y la tarea espera con await flag.wait()', 'Llamando a la tarea desde el handler', 'Con time.sleep en el handler', 'No se puede'], 'Es el puente seguro entre los dos mundos.', { c: 'rp_async', h: 'Mira la tercera tarjeta.' }),
      Q('¿Qué falla en esta tarea?', ['No tiene ningún await: acapara la CPU y las demás tareas nunca corren', 'Falta global', 'adc no funciona en asyncio', 'Nada'], 'Añade await asyncio.sleep_ms(…) en el bucle.', { code: 'async def leer():\n    while True:\n        valor = adc.read_u16()\n        procesar(valor)', c: 'rp_async', h: 'Busca dónde cede el turno.' }),
      Q('¿Usa asyncio los dos núcleos?', ['No: todo corre en un núcleo, por turnos', 'Sí, reparte las tareas', 'Solo en la Pico 2', 'Solo con create_task'], 'Para el segundo núcleo hay otra herramienta, que verás en el módulo 6.', { c: 'rp_async', h: 'Un solo camarero.' }),
      { t: 'order', q: 'Ordena el ciclo de vida de un programa con asyncio.', items: ['asyncio.run(main()) arranca el planificador', 'main crea las tareas con create_task', 'Una tarea corre hasta su siguiente await', 'El planificador elige otra tarea lista', 'Cuando main termina, asyncio.run devuelve'], e: 'Las tareas creadas viven mientras main siga.', c: 'rp_async', h: 'Primero se arranca todo; al final, main termina.' },
      Q('¿Cuándo prefieres asyncio a un bucle con ticks_ms?', ['Cuando hay muchas cosas con ritmos distintos que esperan: botones, red, sensores', 'Para generar 1 MHz exactos', 'Nunca', 'Solo para un LED'], 'Para tiempos exactos, hardware (PWM, PIO).', { c: 'rp_async', h: 'asyncio brilla cuando hay mucho que esperar.' }),
      I('<b>Resumen</b>\n· <b>async def</b> + <b>await</b>: cada espera cede el turno.\n· Un solo núcleo, por turnos: nada de time.sleep ni bucles sin await.\n· <b>ThreadSafeFlag</b> desde interrupciones; <b>wait_for</b> para no esperar sin límite.', { svg: S.turns })
    ]),
    PRJ('rp-p3', 'Proyecto: registrador de temperatura y luz', 'rp_logger'),
    PRJ('rp-p4', 'Proyecto: cerradura con tarjetas', 'rp_lock')
  ];

  const M4 = [
    L('rp18', 'Por qué C y cómo se compila', 'code', ['rp_sdk', 'rp_cmake', 'rp_stdio'], [
      PQ('El mismo parpadeo, escrito en MicroPython y en C. ¿Qué crees que ocupa más en la flash?', ['MicroPython: lleva el intérprete entero', 'El de C', 'Ocupan lo mismo', 'Ninguno ocupa flash'], 'El firmware de MicroPython ocupa cientos de KB; un parpadeo en C, unas decenas.', 'rp_sdk', 'Uno de los dos necesita un intérprete para funcionar.'),
      I('¿Por qué bajar a C? <b>Velocidad</b>, <b>tiempos predecibles</b> y acceso completo al hardware: DMA, PIO con DMA, los dos núcleos y USB a medida. De hecho, MicroPython está escrito en C sobre este mismo SDK.\nAsí es el parpadeo en C: sin setup() ni loop(), un main() con su bucle infinito.', { code: CODE_BLINK_C }),
      I('Herramientas: el <b>pico-sdk</b> (bibliotecas en C), <b>CMake</b> (prepara la compilación), el compilador <b>arm-none-eabi-gcc</b> y <b>picotool</b>. La extensión oficial de Raspberry Pi Pico para VS Code los instala por ti.', { svg: S.sdk, more: 'Para los núcleos RISC-V del RP2350 hay otro compilador. Ninja o Make ejecutan la compilación que CMake ha preparado, y cada vez solo rehacen lo necesario.' }),
      EX('Así afecta CMakeLists.txt a la compilación. Prueba a quitar y poner líneas.', 'rp_linkv', P.link(), [
        TK('err', 1, 1, 'Provoca el error: quita la biblioteca del PWM', '«hardware/pwm.h: No such file»: enlazar la biblioteca también añade sus cabeceras.', 'Pon «Enlaza hardware_pwm» a 0.'),
        TK('usbuf2', 1, 1, 'Arréglalo y consigue el .uf2 con printf por USB', 'Biblioteca enlazada, stdio por USB y salidas extra.', 'Activa las tres cosas.')]),
      I('Un CMakeLists.txt mínimo. Solo se compila lo que pides en <b>target_link_libraries</b>: pico_stdlib para lo básico; hardware_pwm, hardware_adc, pico_multicore… para lo demás.', { code: CODE_CMAKE }),
      I('<b>PICO_BOARD</b> dice qué placa tienes (pico, pico_w, pico2, pico2_w): elige el chip, el tamaño de la flash y pines especiales como el LED. Se fija al configurar.', { code: 'mkdir build && cd build\ncmake -DPICO_BOARD=pico_w ..\nmake            # o ninja\n# salen parpadeo.elf y parpadeo.uf2' }),
      ST('Quieres leer el ADC e imprimir por USB. ¿Qué tocas en CMakeLists.txt y en main?', ['Biblioteca del ADC: añade hardware_adc a target_link_libraries', 'printf por USB: pico_enable_stdio_usb(app 1)', 'El .uf2: pico_add_extra_outputs(app)', 'En main(): stdio_init_all() antes del primer printf'], 'target_link_libraries(app pico_stdlib hardware_adc) + stdio USB + salidas extra'),
      { t: 'order', q: 'Ordena el camino de main.c a la placa.', items: ['Escribes main.c y CMakeLists.txt', 'CMake configura el proyecto', 'El compilador genera código objeto', 'El enlazador une tu código y las bibliotecas', 'Salen el .elf y el .uf2', 'Arrastras el .uf2 o grabas el .elf con el depurador'], e: 'Cada vez que compilas, solo se rehace lo necesario.', c: 'rp_sdk', h: 'Mira el dibujo del proceso.' },
      Q('¿Qué línea hace que printf salga por el USB?', ['pico_enable_stdio_usb(parpadeo 1)', 'pico_add_extra_outputs(parpadeo)', 'project(parpadeo C CXX ASM)', 'include(pico_sdk_import.cmake)'], 'También existe pico_enable_stdio_uart.', { code: CODE_CMAKE, c: 'rp_stdio', h: 'Busca stdio y usb en la misma línea.' }),
      Q('¿Y cuál genera el .uf2 además del .elf?', ['pico_add_extra_outputs(parpadeo)', 'pico_sdk_init()', 'add_executable(parpadeo main.c)', 'target_link_libraries(parpadeo pico_stdlib)'], 'También genera .bin, .hex y el desensamblado.', { code: CODE_CMAKE, c: 'rp_cmake', h: '«Salidas extra».' }),
      Q('Compilas para pico y grabas en una Pico W: el LED de la placa no parpadea. ¿Por qué?', ['En la W el LED va al chip de radio: compila con PICO_BOARD=pico_w y usa cyw43_arch', 'El LED está roto', 'Falta stdio', 'Necesita 5 V'], 'cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1) lo enciende.', { c: 'rp_cmake', h: 'Recuerda dónde cuelga el LED en la W.' }),
      { t: 'match', q: 'Une cada fichero con su uso.', pairs: [['.elf', 'Con símbolos, para depurar'], ['.uf2', 'Para arrastrar en BOOTSEL'], ['.bin', 'Imagen binaria pura'], ['.pio.h', 'Programa PIO ensamblado como cabecera']], c: 'rp_sdk', h: 'El de BOOTSEL ya lo conoces.' },
      Q('¿Qué biblioteca enlazas para usar multicore_launch_core1()?', ['pico_multicore', 'hardware_pwm', 'pico_stdlib, que lo incluye todo', 'tinyusb_device'], 'pico_stdlib solo trae lo básico.', { c: 'rp_cmake', h: 'El nombre de la biblioteca se parece al de la función.' }),
      Q('¿Por qué un parpadeo en C ocupa tan poco frente al firmware de MicroPython?', ['El enlazador solo mete las partes del SDK que usas; MicroPython lleva el intérprete entero', 'C comprime el código', 'El de C no usa bibliotecas', 'MicroPython guarda vídeos de ejemplo'], 'Lo que nadie llama se descarta.', { c: 'rp_sdk', h: '¿Qué paso del proceso descarta lo que no se usa?' }),
      I('<b>Resumen</b>\n· C: velocidad y control total; mismo hardware.\n· <b>CMake → gcc → enlazador → .elf + .uf2</b>.\n· CMakeLists.txt: <b>target_link_libraries</b>, <b>pico_enable_stdio_usb</b>, <b>pico_add_extra_outputs</b> y PICO_BOARD.', { svg: S.sdk })
    ]),
    L('rp19', 'GPIO y stdio en C', 'chip', ['rp_pin', 'rp_bits', 'rp_overflow', 'rp_stdio', 'rp_pullup'], [
      PQ('En C con el SDK, ¿qué función crees que sustituye a digitalWrite(15, HIGH)?', ['gpio_put(15, 1)', 'led.value(1)', 'digitalWrite(15, 1)', 'pin15 = 1'], 'gpio_put(pin, valor). led.value(1) es MicroPython.', 'rp_pin', 'Todas las funciones de pines del SDK empiezan por gpio_.'),
      I('Un pin de salida en C: <b>gpio_init</b>, <b>gpio_set_dir</b> y <b>gpio_put</b>. Una entrada con pull-up: <b>gpio_pull_up</b> y <b>gpio_get</b>.', { code: '#include "pico/stdlib.h"\n\nint main(void) {\n    gpio_init(15); gpio_set_dir(15, GPIO_OUT);\n    gpio_init(14); gpio_set_dir(14, GPIO_IN);\n    gpio_pull_up(14);\n    while (true) {\n        gpio_put(15, !gpio_get(14));   // pulsado (0) → LED encendido\n    }\n}' }),
      I('Varios pines en el mismo ciclo: <b>gpio_set_mask</b> (pone a 1), <b>gpio_clr_mask</b> (pone a 0) y <b>gpio_xor_mask</b> (invierte). Escriben en el bloque SIO, el camino más rápido de la CPU a los pines.', { code: 'gpio_set_mask(0b0011);      // GP0 y GP1 a 1\ngpio_clr_mask(1u << 3);     // GP3 a 0\ngpio_xor_mask(1u << 25);    // invierte GP25\ngpio_put_masked(0xF0, 0x50); // escribe solo GP4–GP7' }),
      EX('Ocho LEDs en GP0–GP7 empiezan en 00001111. Elige máscara y función.', 'rp_maskv', P.mask(), [
        TK('r', 255, 255, 'Con gpio_set_mask, enciende los ocho', 'set pone a 1 los bits marcados y deja el resto como estaba.', 'Marca los bits de arriba.'),
        TK('r', 240, 240, 'Ahora invierte los ocho: de 00001111 a 11110000', 'xor con 0xFF invierte todo de golpe.', 'Función xor, máscara completa.'),
        TK('r', 7, 7, 'Apaga solo GP3', 'clr con la máscara 0x08 (o xor, sabiendo que estaba encendido).', 'GP3 vale 8.')]),
      I('<b>stdio</b>: printf y getchar. getchar_timeout_us(0) no bloquea. Por USB, el ordenador tarda en reconocer el puerto: lo que imprimes al principio se pierde.', { svg: S.stdio }),
      I('Tiempo: sleep_ms, sleep_us y <b>time_us_64()</b>, un contador de microsegundos de 64 bits. Para periodos exactos, calcula el siguiente instante absoluto.', { code: 'uint64_t siguiente = time_us_64();\nwhile (true) {\n    siguiente += 1000;                    // cada 1 ms exacto\n    hacer_algo();\n    sleep_until(from_us_since_boot(siguiente));\n}' }),
      ST('¿Cuánto tarda en dar la vuelta un contador de 32 bits que cuenta microsegundos?', ['2³² = 4 294 967 296 µs', '= 4295 s', '4295 / 60 = 71,6 min', 'Con 64 bits serían unos 585 000 años: time_us_64() no da la vuelta'], '≈ 71,6 min'),
      { t: 'match', q: 'Traduce de Arduino al pico-sdk.', pairs: [['pinMode(15, OUTPUT)', 'gpio_init(15); gpio_set_dir(15, GPIO_OUT)'], ['digitalWrite(15, HIGH)', 'gpio_put(15, 1)'], ['digitalRead(14)', 'gpio_get(14)'], ['INPUT_PULLUP', 'gpio_pull_up(14)']], c: 'rp_pin', h: 'put escribe, get lee.' },
      Q('¿Cuándo se enciende el LED de GP15?', ['Cuando el pulsador de GP14 a masa está pulsado', 'Cuando está suelto', 'Nunca', 'Siempre'], 'Pull-up: pulsado lee 0 y !0 es verdadero.', { code: 'gpio_init(14);\ngpio_set_dir(14, GPIO_IN);\ngpio_pull_up(14);\nif (!gpio_get(14)) gpio_put(15, 1);', c: 'rp_pullup', h: '¿Qué lee el pin pulsado? ¿Y qué hace el !?' }),
      Q('Los primeros printf tras arrancar no aparecen en el monitor serie. ¿Por qué?', ['El USB aún no se ha reconocido: espera con stdio_usb_connected()', 'printf no existe en el SDK', 'El monitor serie solo lee números', 'Hay que usar Serial.print'], 'Un bucle while (!stdio_usb_connected()) sleep_ms(10); lo resuelve.', { c: 'rp_stdio', h: 'El puerto tarda un poco en aparecer.' }),
      { t: 'bits', q: '¿Qué máscara pasas a gpio_set_mask para GP1, GP3 y GP4?', n: 8, target: 26, e: '2 + 8 + 16 = 26 (0b11010).', c: 'rp_bits', h: 'Enciende los bits 1, 3 y 4.' },
      Q('¿Qué hace?', ['Invierte GP25 sin tocar los demás pines', 'Pone a 1 todos los pines', 'Lee GP25', 'Apaga GP25 siempre'], 'XOR con un 1 invierte ese bit.', { code: 'gpio_xor_mask(1u << 25);', c: 'rp_bits', h: 'xor = invertir los bits marcados.' }),
      Q('¿Por qué time_us_64() no tiene el problema de desbordamiento de millis() de Arduino?', ['Con 64 bits a 1 MHz tardaría cientos de miles de años en dar la vuelta', 'Porque se reinicia cada día', 'Porque cuenta en segundos', 'Sí lo tiene, a los 49 días'], '2⁶⁴ µs son unos 585 000 años.', { c: 'rp_overflow', h: 'Mira el último paso del ejemplo resuelto.' }),
      Nm('Un contador de 16 bits que cuenta microsegundos, ¿cada cuántos milisegundos da la vuelta?', 65.536, 'ms', '2¹⁶ = 65 536 µs = 65,536 ms.', { tol: 0.1, c: 'rp_overflow', h: '2 elevado a 16, en microsegundos; luego pasa a ms.' }),
      I('<b>Resumen</b>\n· <b>gpio_init</b>, <b>gpio_set_dir</b>, <b>gpio_put</b>, <b>gpio_get</b>, <b>gpio_pull_up</b>.\n· Máscaras: set, clr y xor en un solo ciclo.\n· printf tras <b>stdio_usb_connected()</b>; <b>time_us_64()</b> no da la vuelta.', { svg: S.pinmap })
    ]),
    L('rp21', 'Relojes del sistema', 'timer', ['rp_clock', 'rp_clksys', 'rp_overclock'], [
      PQ('El cristal de la Pico es de 12 MHz, pero la CPU va a 125 MHz o más. ¿De dónde crees que salen esos megahercios?', ['Un PLL multiplica la frecuencia del cristal', 'Se los da el USB', 'El cristal vibra más rápido al calentarse', 'Hay otro cristal escondido'], 'Un PLL multiplica la frecuencia del cristal y luego la divide hasta la que quieres.', 'rp_clock', 'Hace falta algo que multiplique la frecuencia.'),
      EX('El PLL: 12 MHz × FBDIV da el VCO (debe quedar entre 750 y 1600 MHz) y luego se divide dos veces.', 'rp_pll', PLLP(), [
        TK('fok', 124.9, 125.1, 'Saca 125 MHz con el VCO en rango', '1500 MHz / 12: FBDIV 125, POSTDIV1 6 y POSTDIV2 2.', 'Prueba FBDIV 125 y divide entre 12.'),
        TK('fok', 47.95, 48.05, 'Ahora los 48 MHz que necesita el USB', 'FBDIV 100 con 5 y 5 (1200 / 25), por ejemplo.', '1200 / 25 o 1440 / 30.'),
        TK('fok', 199.9, 200.1, 'Y 200 MHz', '1200 / 6: FBDIV 100, POSTDIV1 6 y POSTDIV2 1.', 'Un VCO de 1200 MHz entre 6.')]),
      I('Fuentes de reloj: el <b>ROSC</b> (interno, impreciso, el del arranque), el <b>XOSC</b> (cristal de 12 MHz) y dos PLL: <b>PLL_SYS</b> para clk_sys y <b>PLL_USB</b> para los 48 MHz del USB y del ADC.', { svg: S.clocks }),
      I('¿A cuánto va tu Pico? El RP2040 arrancaba a <b>125 MHz</b>; tras certificarse <b>200 MHz</b>, las versiones recientes del SDK usan 200 por defecto. No lo supongas: compruébalo.', { code: 'printf("%lu Hz\\n", clock_get_hz(clk_sys));   // en C\n# en MicroPython:\n# import machine; print(machine.freq())', more: 'Calcula tus divisores (PWM, PIO) a partir del valor real. Los ejercicios de esta especialidad dicen siempre qué clk_sys suponen.' }),
      EX('Todo lo que cuelga de clk_sys cambia de velocidad con él. Cambia clk_sys y mira tu configuración.', 'rp_clktv', P.clkt(), [
        TK('fpwm', 1590, 1610, 'Sube clk_sys a 200 MHz y mira tu PWM', '1 kHz × 200/125 = 1,6 kHz: hay que recalcular el divisor.', 'Pon clk_sys a 200.'),
        TK('cs', 48, 48, 'Bájalo a 48 MHz: ¿qué les pasa al USB y al ADC?', 'Nada: tienen su propio PLL y sus 48 MHz.', 'Pon clk_sys a 48.')]),
      ST('Saca 200 MHz del PLL paso a paso.', ['El VCO debe ir de 750 a 1600 MHz: prueba FBDIV = 100 → 1200 MHz', '1200 / 200 = 6', 'Divisores: POSTDIV1 = 6 y POSTDIV2 = 1 (el mayor, primero)', 'Comprueba: 12 × 100 / (6 × 1) = 200 MHz'], 'FBDIV 100 · POSTDIV1 6 · POSTDIV2 1'),
      I('Cambiar clk_sys: <b>set_sys_clock_khz(khz, obligatorio)</b> en C o <b>machine.freq(hz)</b> en MicroPython. Por encima de lo especificado (overclock) suele ir, pero no está garantizado: lo primero que falla suele ser la <b>flash</b>.', { svg: S.qspi, more: 'Con obligatorio = true, si la frecuencia no se puede conseguir exacta con el PLL, el programa se detiene con un error; con false, la función devuelve false y no cambia nada.\nA veces también hace falta subir la tensión del núcleo. Y el chip puede medir sus propios relojes (frequency_count_khz) y sacarlos por un pin para verlos con el osciloscopio.' }),
      G('rp_pll'),
      Q('¿Qué cambia de velocidad si cambias clk_sys?', ['Los núcleos, el bus, el DMA, el PIO y el PWM', 'Solo la CPU', 'El USB', 'El ADC'], 'USB y ADC tienen sus 48 MHz aparte.', { c: 'rp_clksys', h: 'Recuerda la segunda exploración.' }),
      Q('Subes clk_sys y la placa se cuelga al ejecutar desde la flash. Sospecha principal:', ['El reloj de la flash, que sale de clk_sys, va demasiado rápido para ese chip', 'El USB', 'La RAM se llena', 'El LED'], 'Se arregla aumentando el divisor del reloj de la flash.', { c: 'rp_overclock', h: 'Mira el dibujo del reloj QSPI.' }),
      Q('¿Qué significa el true?', ['Que se detenga con un error si esa frecuencia no se puede conseguir exactamente', 'Que use el ROSC', 'Que sea temporal', 'Que active el USB'], 'Con false, devuelve false y no cambia nada.', { code: 'set_sys_clock_khz(133000, true);', c: 'rp_overclock', h: 'Es el parámetro «obligatorio».' }),
      Q('¿Por qué el USB necesita su propio reloj de 48 MHz?', ['El USB exige una frecuencia muy exacta', 'Para gastar menos', 'Por costumbre', 'No lo necesita'], 'Por eso un diseño con USB lleva cristal: el ROSC es demasiado impreciso.', { c: 'rp_clksys', h: '¿Qué tolera mal el USB?' }),
      Q('Bajas clk_sys a 48 MHz para ahorrar. ¿Qué le pasa al ritmo de muestreo del ADC?', ['Nada: el ADC usa su propio reloj de 48 MHz', 'Baja a la mitad', 'Se para', 'Sube'], 'clk_adc no sale de clk_sys.', { c: 'rp_clksys', h: 'Mira el árbol de relojes.' }),
      I('<b>Resumen</b>\n· 12 MHz × FBDIV = VCO (750–1600 MHz); ÷ POSTDIV1 ÷ POSTDIV2 = clk_sys.\n· De clk_sys cuelgan CPU, bus, DMA, PIO y PWM; USB y ADC van a 48 MHz aparte.\n· Comprueba la frecuencia real; con overclock, vigila la flash.', { svg: S.clocks })
    ]),
    L('rp20', 'PWM por slices a fondo', 'wave', ['rp_pwmwrap', 'rp_pwmslice', 'rp_phasecorrect'], [
      PQ('Un slice de PWM cuenta de 0 hasta wrap y vuelve a empezar. Si duplicas wrap sin tocar nada más, ¿qué crees que le pasa a la frecuencia?', ['Se reduce a la mitad', 'Se duplica', 'No cambia', 'Se cuadruplica'], 'Cada vuelta del contador dura el doble: la mitad de frecuencia, a cambio del doble de niveles.', 'rp_pwmwrap', 'Una vuelta más larga tarda más.'),
      EX('Un slice por dentro: el contador sube de 0 a wrap con el reloj dividido; la salida está alta mientras el contador es menor que el nivel. Supón clk_sys = 125 MHz.', 'rp_pwm', PWMP(), [
        TK('f', 24900, 25100, 'Consigue exactamente 25 kHz, la de los ventiladores de PC', 'Divisor 1 y wrap 4999: 5000 niveles, más de 12 bits.', 'Con divisor 1: wrap = 125 000 000 / 25 000 − 1.'),
        TK('f', 49.5, 50.5, 'Ahora 50 Hz para un servo', 'Divisor 125 y wrap 19 999 (o 250 y 9999): div × (wrap + 1) = 2 500 000.', 'Sube mucho el divisor.')]),
      I('<b>f = clk_sys / ((wrap + 1) × div)</b>; ciclo de trabajo = nivel / (wrap + 1). El divisor tiene 8 bits enteros y 4 de fracción: de 1 a 255 y 15/16.', { code: 'gpio_set_function(15, GPIO_FUNC_PWM);\nuint s = pwm_gpio_to_slice_num(15);   // 7\npwm_set_clkdiv(s, 1.0f);\npwm_set_wrap(s, 4999);               // 125 MHz / 5000 = 25 kHz\npwm_set_chan_level(s, PWM_CHAN_B, 1250);   // 25 %\npwm_set_enabled(s, true);' }),
      I('El canal <b>B</b> puede ser <b>entrada</b>: el contador avanza solo con los flancos del pin (frecuencímetro) o mientras está alto (mide el ciclo de trabajo). Solo en GPIO impares.', { svg: S.pwmb }),
      I('En <b>fase correcta</b>, el contador sube y baja: la frecuencia es la mitad y los pulsos quedan centrados. Mira el triángulo:', { ...tune('rp_pwm', PWMP({ pc: { val: 1, fixed: true } })), more: 'En modo normal, todos los canales suben a la vez al empezar cada periodo. Centrados, los flancos se reparten: menos picos de corriente y menos ruido. Por eso lo prefieren los controladores de motores.' }),
      ST('Un ventilador de PC quiere PWM a 25 kHz con clk_sys = 125 MHz.', ['(wrap + 1) × div = 125 000 000 / 25 000 = 5000', 'Con div = 1: wrap + 1 = 5000 → wrap = 4999', 'Cabe en 16 bits (hasta 65 535): vale', 'Resolución: 5000 niveles, más de 12 bits'], 'div 1 · wrap 4999'),
      G('rp_pwmFreq'), G('rp_pwmWrap'),
      Q('Con clk_sys = 125 MHz y divisor 1, ¿qué sale por GP15?', ['125 kHz al 25 %', '1 kHz al 25 %', '125 kHz al 75 %', '125 MHz al 25 %'], '125 MHz / 1000 = 125 kHz; 250 / 1000 = 25 %.', { code: 'gpio_set_function(15, GPIO_FUNC_PWM);\nuint s = pwm_gpio_to_slice_num(15);\npwm_set_wrap(s, 999);\npwm_set_chan_level(s, PWM_CHAN_B, 250);\npwm_set_enabled(s, true);', c: 'rp_pwmwrap', h: 'f = clk_sys / (wrap + 1); ciclo = nivel / (wrap + 1).' }),
      Q('Si en ese código pusieras PWM_CHAN_A en vez de PWM_CHAN_B, ¿qué pasaría?', ['GP15 no cambiaría: es el canal B; ese nivel iría a GP14', 'Nada, es igual', 'Se duplicaría la frecuencia', 'No compilaría'], 'Impar = canal B.', { c: 'rp_pwmslice', h: '15 es impar.' }),
      Q('Quieres contar los pulsos de un caudalímetro con un slice. ¿En qué pin?', ['En un GPIO impar (canal B), con PWM_DIV_B_RISING', 'En cualquier GPIO par', 'En GP26 (ADC)', 'En RUN'], 'Lo usarás en el proyecto del ventilador.', { c: 'rp_pwmslice', h: 'Solo el canal B puede ser entrada.' }),
      TU('Con la fase correcta activada y clk_sys = 125 MHz, consigue 62,5 kHz.', 'rp_pwm', PWMP({ pc: { val: 1, fixed: true } }), { q: 'f', min: 62000, max: 63000, text: 'Objetivo: 62,5 kHz en fase correcta', hint: 'En fase correcta: f = 125 MHz / (2 × (wrap + 1) × div).' }, 'Divisor 1 y wrap 999: el doble de recorrido, la mitad de frecuencia.', { c: 'rp_phasecorrect', h: 'En fase correcta hay un 2 más en el denominador.' }),
      Q('¿Por qué los controladores de motores prefieren la fase correcta?', ['Los pulsos quedan centrados y los flancos de los canales no coinciden', 'Porque va al doble de frecuencia', 'Porque gasta menos memoria', 'Porque no necesita wrap'], 'Menos picos de corriente y menos ruido.', { c: 'rp_phasecorrect', h: 'Piensa en dónde caen los flancos.' }),
      Nm('Con clk_sys = 200 MHz, divisor 1 y wrap 9999, ¿frecuencia en kHz?', 20, 'kHz', '200 000 000 / 10 000 = 20 000 Hz.', { tol: 0.05, c: 'rp_pwmwrap', h: 'No olvides el +1 del wrap.' }),
      I('<b>Resumen</b>\n· <b>f = clk_sys / ((wrap + 1) × div)</b>; más frecuencia, menos niveles.\n· Canal B también como entrada (solo GPIO impares).\n· Fase correcta: mitad de frecuencia, pulsos centrados.', { ...tune('rp_pwm', PWMP()) })
    ]),
    L('rp22', 'Interrupciones y temporizadores en C', 'timer', ['rp_timerc', 'rp_volatile'], [
      PQ('Una interrupción suma 1 a «pulsos» y main espera con while (pulsos == 0);. Sin volatile, ¿qué crees que puede pasar?', ['Que main no salga nunca del bucle', 'Nada: funciona igual', 'Que no compile', 'Que la interrupción no salte'], 'El compilador puede leer pulsos una vez y no volver a mirar la memoria. Lo viste en el curso base.', 'rp_volatile', 'El compilador no sabe que una interrupción cambia la variable.'),
      I('Interrupciones de pin: <b>gpio_set_irq_enabled_with_callback</b>. Hay un solo callback por núcleo para todos los GPIO: el argumento gpio dice cuál fue.', { code: 'volatile uint32_t pulsos = 0;\nvoid cb(uint gpio, uint32_t eventos) {\n    if (gpio == 14) pulsos++;\n}\n// en main:\ngpio_set_irq_enabled_with_callback(14, GPIO_IRQ_EDGE_FALL, true, &cb);' }),
      EX('Un temporizador repetitivo llama a tu callback. Cambia el signo del periodo y lo que tarda el callback.', 'rp_timercv', P.timerc(), [
        TK('perCb', 9.99, 10.01, 'Consigue 10 ms exactos de inicio a inicio sin quitar el trabajo del callback', 'Con −10, el SDK cuenta desde el inicio de la llamada anterior.', 'Prueba el periodo negativo.'),
        TK('per', 14, 16, 'Con el periodo positivo, alarga el callback hasta pasar de 14 ms reales', 'Positivo: el tiempo se cuenta desde que el callback acaba, y se suma.', 'Periodo +10 y callback largo.')]),
      I('<b>add_repeating_timer_ms(periodo, cb, datos, &amp;t)</b> repite; <b>add_alarm_in_ms</b> avisa una vez. El callback devuelve <b>true</b> para seguir y <b>false</b> para parar.', { code: 'struct repeating_timer t;\nbool tick(struct repeating_timer *rt) {\n    gpio_xor_mask(1u << 25);\n    return true;            // false para parar\n}\nadd_repeating_timer_ms(-500, tick, NULL, &t);' }),
      I('Reglas en C: callbacks cortos, sin printf ni sleep. Las variables compartidas, <b>volatile</b>; y si son de más de 32 bits, léelas con las interrupciones desactivadas un instante.', { svg: S.volatile, more: 'save_and_disable_interrupts() devuelve el estado anterior y restore_interrupts(estado) lo recupera. Que dure lo mínimo: mientras, nadie más atiende.' }),
      ST('Muestrear el ADC a 1 kHz exactos durante 1000 muestras.', ['add_repeating_timer_us con periodo −1000: de inicio a inicio, 1 ms', 'El callback guarda muestras[n++] = adc_read() (adc_read lee el ADC en C)', 'return n < 1000; → al llegar a 1000 devuelve false y se para', 'n la lee también main: márcala volatile'], 'add_repeating_timer_us(−1000, tick, NULL, &t)'),
      Q('¿Por qué pulsos es volatile?', ['Para que el compilador la vuelva a leer de memoria cada vez en main', 'Para que sea más rápida', 'Para guardarla en la flash', 'Es obligatorio en todas las variables'], 'Sin volatile, un while (pulsos == 0) podría no salir nunca.', { code: 'volatile uint32_t pulsos = 0;\nvoid cb(uint gpio, uint32_t eventos) {\n    if (gpio == 14) pulsos++;\n}', c: 'rp_volatile', h: '¿Quién cambia pulsos sin que main lo vea?' }),
      Q('add_repeating_timer_ms(−10, …) frente a (10, …): ¿diferencia?', ['Con −10 el periodo es de inicio a inicio; con 10, desde que acaba el callback', 'Ninguna', 'Con −10 está parado', 'El negativo es en microsegundos'], 'Para muestrear a ritmo fijo, negativo.', { c: 'rp_timerc', h: 'Recuerda la exploración.' }),
      Q('¿Cuándo se detiene el temporizador?', ['Cuando el callback devuelve false, tras guardar 1000 muestras', 'Nunca', 'Tras 10 ms', 'Al llenarse la RAM'], 'return n < 1000 deja de ser verdadero al llegar a 1000.', { code: 'bool tick(struct repeating_timer *t) {\n    muestras[n++] = adc_read();\n    return n < 1000;\n}', c: 'rp_timerc', h: '¿Qué devuelve el callback cuando n llega a 1000?' }),
      Q('En main lees un contador de 64 bits que actualiza una interrupción. ¿Riesgo en un Cortex-M0+?', ['Leer media variable vieja y media nueva: protégela', 'Ninguno', 'Que se borre la flash', 'Que el compilador la ignore'], 'El M0+ lee 32 bits de cada vez.', { c: 'rp_volatile', h: '64 bits son dos lecturas.' }),
      { t: 'match', q: 'Une cada necesidad con su herramienta.', pairs: [['Pulsador a masa', 'GPIO_IRQ_EDGE_FALL'], ['Señal que sube', 'GPIO_IRQ_EDGE_RISE'], ['Algo cada 1 ms', 'add_repeating_timer_ms'], ['Una vez dentro de 5 s', 'add_alarm_in_ms']], c: 'rp_timerc', h: 'Repetir o una vez; bajar o subir.' },
      Q('Una alarma para apagar un LED 10 s después de pulsar. ¿Qué función?', ['add_alarm_in_ms', 'add_repeating_timer_ms', 'sleep_ms(10000)', 'gpio_set_irq_enabled'], 'Una sola vez, sin bloquear.', { c: 'rp_timerc', h: 'Solo tiene que pasar una vez.' }),
      I('<b>Resumen</b>\n· Un callback de GPIO por núcleo; el argumento dice qué pin fue.\n· <b>add_repeating_timer</b> (negativo = ritmo fijo) y <b>add_alarm</b>; true para seguir.\n· Compartido con interrupciones: <b>volatile</b>, y 64 bits protegidos.', { svg: S.volatile })
    ]),
    L('rp23', 'Depurar con SWD', 'code', ['rp_swd', 'rp_hardfault', 'rp_dbgpin'], [
      PQ('Tu programa en C falla «a veces». Llenas el código de printf y el fallo cambia o desaparece. ¿Por qué crees que pasa?', ['printf tarda y cambia los tiempos del programa', 'printf arregla los errores', 'El USB lo desconecta', 'Nunca pasa'], 'Medir con printf altera justo lo que mides. Hay herramientas que no molestan.', 'rp_dbgpin', 'Imprimir lleva tiempo.'),
      I('<b>SWD</b> son dos hilos (SWCLK y SWDIO) más masa. Con un depurador (la Debug Probe u otra Pico con el firmware debugprobe), <b>OpenOCD</b> y <b>GDB</b>, paras el programa, miras variables y avanzas línea a línea.', { svg: S.swd }),
      { t: 'order', q: 'Ordena una sesión de depuración.', items: ['Conecta SWCLK, SWDIO y GND del depurador a la placa', 'Arranca OpenOCD con la configuración del RP2040', 'Arranca GDB con tu .elf', 'Graba con load', 'Pon un punto de ruptura y ejecuta con continue'], e: 'La extensión de VS Code automatiza estos pasos.', c: 'rp_swd', h: 'Primero los cables; GDB va al final.' },
      I('Órdenes básicas de GDB:', { code: '(gdb) load              # graba el programa\n(gdb) break leer_sensor # para al entrar en la función\n(gdb) continue          # ejecuta hasta el siguiente punto\n(gdb) next              # siguiente línea, sin entrar\n(gdb) step              # entra en la función\n(gdb) print valor       # muestra una variable\n(gdb) bt                # pila de llamadas' }),
      EX('El Cortex-M0+ no admite accesos desalineados. Mueve la dirección y el tamaño del acceso.', 'rp_alignv', P.align(), [
        TK('ok4', 1, 1, 'Sin cambiar el tamaño de 4 bytes, haz el acceso válido', 'Las direcciones de 32 bits deben ser múltiplos de 4.', 'Prueba 0, 4 u 8.'),
        TK('f2', 1, 1, 'Con 2 bytes, provoca un HardFault', '16 bits exigen dirección par: una impar falla.', 'Tamaño 2 y dirección impar.')]),
      I('Un error grave (puntero nulo, pila desbordada, acceso desalineado) lleva al M0+ a <b>HardFault</b>. Parado ahí, <b>bt</b> enseña qué llamadas te llevaron.', { code: 'uint8_t buf[8];\nuint32_t *p = (uint32_t *)&buf[1];   // dirección impar\n*p = 0x12345678;                     // HardFault en un M0+' }),
      I('Sin depurador: un <b>GPIO de depuración</b>. Súbelo al entrar en una rutina y bájalo al salir; con un osciloscopio, la anchura del pulso es lo que dura.', { ...tune('rp_dbgv', P.dbg()) }),
      ST('El pulso de depuración dura 35 µs y se repite cada 250 µs. ¿Qué parte de la CPU ocupa la rutina?', ['35 / 250 = 0,14', '14 % del tiempo dentro de la rutina', 'Queda el 86 % para lo demás', 'Si llegara a 250 µs, no quedaría nada'], '14 % ocupado'),
      Q('¿Qué ventaja tiene depurar por SWD frente a llenar el código de printf?', ['Paras donde quieras y miras variables sin cambiar el código', 'Es inalámbrico', 'No necesita el .elf', 'Ninguna'], 'Y no alteras los tiempos con mensajes.', { c: 'rp_swd', h: 'Piensa en el problema del principio.' }),
      { t: 'match', q: 'Une cada orden de GDB con lo que hace.', pairs: [['break', 'Para en una línea o función'], ['next', 'Siguiente línea sin entrar en funciones'], ['step', 'Entra en la función'], ['bt', 'Muestra la pila de llamadas']], c: 'rp_swd', h: 'step «pisa» dentro; next pasa por encima.' },
      Q('En un Cortex-M0+, ¿qué ocurre?', ['HardFault: acceso de 32 bits desalineado', 'Escribe bien', 'Escribe solo un byte', 'Error de compilación'], '&buf[1] no es múltiplo de 4.', { code: 'uint8_t buf[8];\nuint32_t *p = (uint32_t *)&buf[1];\n*p = 0x12345678;', c: 'rp_hardfault', h: '¿Es &buf[1] múltiplo de 4?' }),
      Q('El programa se cuelga «a veces». Lo paras en GDB y está en isr_hardfault. ¿Primera orden?', ['bt, para ver la pila de llamadas', 'load', 'quit', 'continue'], 'La pila dice qué función provocó el fallo.', { c: 'rp_hardfault', h: '¿Quién llamó a quién hasta llegar aquí?' }),
      Q('¿Cómo mides cuánto tarda tu interrupción sin depurador?', ['Subes un GPIO al entrar, lo bajas al salir y mides el pulso', 'Con printf dentro de la interrupción', 'Contando a ojo', 'Con sleep_ms'], 'El pulso mide exactamente lo que dura.', { c: 'rp_dbgpin', h: 'Una escritura en un pin es casi instantánea.' }),
      Q('¿Qué hilos mínimos conectas entre el depurador y tu placa?', ['SWCLK, SWDIO y GND', 'TX y RX', 'SDA y SCL', 'D+ y D−'], 'Opcionalmente, también una UART para la consola.', { c: 'rp_swd', h: 'Son dos de señal más la masa.' }),
      I('<b>Resumen</b>\n· SWD + OpenOCD + GDB: <b>break</b>, <b>next</b>, <b>step</b>, <b>print</b>, <b>bt</b>.\n· HardFault: puntero nulo, pila o acceso <b>desalineado</b>; empieza por bt.\n· Sin depurador: un <b>GPIO de depuración</b> y el osciloscopio.', { svg: S.swd })
    ]),
    PRJ('rp-p5', 'Proyecto: control de ventilador en C', 'rp_fan')
  ];

  const M5 = [
    L('rp24', 'Qué es el PIO', 'bus', ['rp_pio', 'rp_pioins', 'rp_piocycles', 'rp_hwtiming'], [
      PQ('Generas una señal moviendo un pin desde la CPU y, a la vez, la CPU hace cálculos. ¿Qué crees que le pasa a la señal?', ['Tiembla cada vez que la CPU se entretiene', 'Nada: va perfecta', 'Va más rápida', 'Se apaga'], 'Mover pines «a mano» (bit-banging) depende de que la CPU llegue a tiempo. El PIO lo resuelve.', 'rp_hwtiming', 'La CPU no puede estar en dos sitios a la vez.'),
      I('Hay protocolos que ningún periférico fijo trae: tiras WS2812, VGA, una tercera UART, encoders… Hechos desde la CPU, tiemblan. El <b>PIO</b> (E/S programable) es hardware que ejecuta <b>tus propios programas de pines</b> con temporización exacta.', { svg: S.jitter }),
      I('Cada <b>bloque PIO</b> tiene 4 <b>máquinas de estados</b> que comparten una memoria de <b>32 instrucciones</b>. Cada máquina tiene sus registros X e Y, el <b>OSR</b> (del que salen bits), el <b>ISR</b> (al que entran), dos FIFO y un divisor de reloj.', { svg: S.pioblk, more: 'Las FIFO son colas de 4 palabras de 32 bits: la TX lleva datos de la CPU a la máquina y la RX, de la máquina a la CPU. La máquina solo se comunica con el exterior por sus pines, sus FIFO y unas banderas (IRQ).\nCon el PIO se han hecho salidas de vídeo VGA y DVI, tarjetas SD de 4 bits, un segundo puerto USB, Ethernet sencillo, motores paso a paso y buses para pantallas.' }),
      I('Tu primer programa PIO, en MicroPython. El decorador <b>@rp2.asm_pio</b> marca una función como programa PIO; cada línea es una instrucción, y el número entre corchetes, un <b>retardo</b> en ciclos.', { code: "import rp2\n\n@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)\ndef onda():\n    wrap_target()          # desde aquí…\n    set(pins, 1)   [3]     # pin a 1 y espera 3 ciclos más\n    set(pins, 0)   [1]     # pin a 0 y espera 1 ciclo más\n    wrap()                 # …vuelve a wrap_target sin gastar ciclos", more: 'Cómo ponerlo en marcha en un pin lo verás en la lección de PIO desde MicroPython. Ahora importa entender qué hace cada línea y cuánto dura.' }),
      EX('Ejecuta ese programa ciclo a ciclo. Cambia los retardos y mira la onda.', 'rp_piostep', P.piostep(), [
        TK('pin', 0, 0, 'Avanza ciclo a ciclo hasta que el pin baje', 'Sin retardos, cada instrucción dura un ciclo: en el ciclo 1 se ejecuta set(pins, 0).', 'Sube el ciclo.'),
        TK('per', 8, 8, 'Ajusta los retardos para un periodo de 8 ciclos', '(1 + retardo) + (1 + retardo) = 8: por ejemplo [3] y [3].', 'Los dos retardos suman 6.'),
        TK('hi6', 1, 1, 'Ahora 6 ciclos en alto y 2 en bajo, con el mismo periodo', '[5] en alto y [1] en bajo: un 75 % de ciclo de trabajo.', 'Retardo en alto 5 y en bajo 1.')]),
      ST('set(pins, 1) [3] y set(pins, 0) [1] con la máquina a 1 MHz. ¿Frecuencia?', ['Alto: 1 + 3 = 4 ciclos', 'Bajo: 1 + 1 = 2 ciclos', 'Periodo: 6 ciclos = 6 µs a 1 MHz', 'f = 1 / 6 µs ≈ 166,7 kHz'], '≈ 166,7 kHz'),
      Q('¿Cuántas máquinas de estados PIO tiene un RP2040 en total?', ['8', '4', '2', '12'], '2 bloques × 4.', { c: 'rp_pio', h: 'Bloques por máquinas de cada bloque.' }),
      Nm('¿Y un RP2350?', 12, 'máquinas', '3 bloques × 4.', { c: 'rp_pio', h: 'El RP2350 tiene un bloque más.' }),
      Q('Cuatro máquinas del mismo bloque usan programas que suman 40 instrucciones. ¿Caben?', ['No: la memoria del bloque es de 32 instrucciones en total', 'Sí: son 32 por máquina', 'Sí, si van a menos frecuencia', 'Solo en la Pico W'], 'Si dos máquinas usan el mismo programa, lo comparten y solo ocupa una vez.', { c: 'rp_pio', h: 'Las 32 son de todo el bloque.' }),
      { t: 'match', q: 'Une cada pieza con su papel.', pairs: [['TX FIFO', 'De la CPU a la máquina'], ['RX FIFO', 'De la máquina a la CPU'], ['OSR', 'Registro del que salen bits'], ['ISR', 'Registro al que entran bits']], c: 'rp_pio', h: 'TX = transmitir hacia la máquina; O = output, I = input.' },
      Q('¿Qué NO puede hacer una máquina PIO?', ['Multiplicar dos números', 'Esperar a que un pin cambie', 'Sacar bits por varios pines a la vez', 'Contar hacia abajo un registro'], 'Su «aritmética» se limita a restar 1, invertir y comparar.', { c: 'rp_pioins', h: 'Es un procesador minúsculo.' }),
      Q('Una UART extra hecha con PIO mientras la CPU calcula sin parar. ¿Tiembla la señal?', ['No: la máquina la genera sola, ciclo a ciclo', 'Sí, mucho', 'Solo si los cálculos usan float', 'Se para'], 'La CPU solo tiene que mantener llena la FIFO.', { c: 'rp_hwtiming', h: '¿Quién mueve el pin?' }),
      Nm('set(pins, 1) [9] y set(pins, 0) [9] en bucle, con la máquina a 2 MHz. ¿Frecuencia en kHz?', 100, 'kHz', '10 + 10 = 20 ciclos; 2 MHz / 20 = 100 kHz.', { tol: 0.5, c: 'rp_piocycles', h: 'Cada instrucción: 1 + retardo.' }),
      I('<b>Resumen</b>\n· PIO: máquinas que ejecutan <b>tus programas de pines</b> sin temblar.\n· Bloque: 4 máquinas, <b>32 instrucciones</b> compartidas, FIFO y registros por máquina.\n· Cada instrucción dura <b>1 ciclo + su retardo</b>.', { svg: S.pioblk })
    ]),
    L('rp25', 'Las nueve instrucciones', 'bus', ['rp_pioins', 'rp_piocycles'], [
      PQ('jmp(x_dec, "bucle") salta mientras X no sea 0, y le resta 1. Si X empieza en 3, ¿cuántas veces crees que se ejecuta el cuerpo del bucle?', ['4', '3', '2', 'Infinitas'], 'Salta con 3, 2 y 1 (tres saltos) y con 0 sigue: el cuerpo se ejecuta X + 1 = 4 veces.', 'rp_pioins', 'Cuenta también la primera pasada, antes del primer salto.'),
      I('Todo programa PIO se escribe con <b>nueve instrucciones</b>. Cada una ocupa 16 bits, retardo incluido.', { svg: S.nine }),
      { t: 'match', q: 'Une cada instrucción con lo que hace.', pairs: [['jmp', 'Salta, con condición opcional'], ['wait', 'Espera a un pin o a una IRQ'], ['set', 'Escribe un valor inmediato de 0 a 31'], ['mov', 'Copia entre registros']], c: 'rp_pioins', h: 'set solo admite números pequeños.' },
      { t: 'match', q: 'Y estas cuatro.', pairs: [['out', 'Saca bits del OSR'], ['in', 'Mete bits en el ISR'], ['pull', 'Carga el OSR desde la TX FIFO'], ['push', 'Envía el ISR a la RX FIFO']], c: 'rp_pioins', h: 'pull trae de la CPU; push lleva a la CPU.' },
      EX('Un bucle con jmp(x_dec). Cambia el valor inicial de X y avanza ciclo a ciclo.', 'rp_pioloop', P.pioloop(), [
        TK('pulses', 4, 4, '¿Con qué X salen 4 pulsos?', 'Con X = 3: el cuerpo se repite X + 1 veces.', 'Uno más que X.'),
        TK('fin', 1, 1, 'Avanza hasta que la máquina se quede quieta en «fin»', 'Con X = 0, jmp(x_dec) ya no salta y el programa sigue hasta el final.', 'Sube el ciclo hasta el final.')]),
      I('Condiciones de <b>jmp</b>: siempre, <b>not_x</b> (X es 0), <b>x_dec</b> (X no es 0; luego le resta 1), not_y, y_dec, <b>x_not_y</b>, <b>pin</b> (un pin elegido está alto) y <b>not_osre</b> (al OSR le quedan bits).', { code: 'jmp("bucle")            # siempre\njmp(not_x, "fin")       # si X == 0\njmp(x_dec, "bucle")     # si X != 0, y luego X -= 1\njmp(pin, "alto")        # si el pin de salto está a 1\njmp(not_osre, "mas")    # si al OSR le quedan bits' }),
      I('set solo llega a 31. Para valores mayores, la CPU los pone en la FIFO y el programa hace <b>pull()</b> y <b>mov(x, osr)</b>.', { code: "pull()             # TX FIFO → OSR (espera si está vacía)\nmov(x, osr)        # X = el número que mandó la CPU\nlabel('bucle')\nset(pins, 1)\nset(pins, 0)\njmp(x_dec, 'bucle')\n\n# desde Python: sm.put(1000)" }),
      ST('La CPU envía 1000 y el programa de arriba lo usa. ¿Cuántos pulsos salen?', ['sm.put(1000) deja el número en la TX FIFO', 'pull() lo pasa al OSR y mov(x, osr) lo copia a X', 'jmp(x_dec) salta con 1000, 999… hasta 1', 'El cuerpo se ejecuta X + 1 veces'], '1001 pulsos'),
      Q('jmp(x_dec, "bucle") con X = 3 al entrar. ¿Cuántas veces SALTA?', ['3', '4', '2', 'Infinitas'], 'Salta con 3, 2 y 1; con 0 sigue.', { c: 'rp_pioins', h: 'Cuenta los saltos, no las pasadas.' }),
      Q('set solo admite valores de 0 a 31. ¿Cómo cargas 1000 en X?', ['La CPU lo pone en la TX FIFO y el programa hace pull y mov(x, osr)', 'set(x, 1000)', 'Con dos set seguidos', 'No se puede'], 'Es el patrón habitual para pasar constantes.', { c: 'rp_pioins', h: 'La CPU puede mandar números de 32 bits por la FIFO.' }),
      Q('Si se repite, ¿qué onda sale?', ['4 ciclos en alto y 2 en bajo', '3 en alto y 1 en bajo', '1 en alto y 1 en bajo', '4 en alto y 4 en bajo'], 'Cada instrucción dura 1 + su retardo.', { code: 'set(pins, 1) [3]\nset(pins, 0) [1]', c: 'rp_piocycles', h: '1 + retardo en cada una.' }),
      Nm('Esa onda con la máquina a 1 MHz. ¿Frecuencia en kHz?', 166.67, 'kHz', 'Periodo de 6 ciclos = 6 µs → 166,7 kHz.', { tol: 0.5, c: 'rp_piocycles', h: 'Periodo en ciclos; a 1 MHz, cada ciclo es 1 µs.' }),
      Q('¿Qué hace este programa?', ['En cada flanco de subida del pin 1 (reloj) guarda en el ISR el valor del pin 0 (dato)', 'Genera una onda cuadrada', 'Cuenta hacia atrás', 'Espera para siempre'], 'Es el corazón de un receptor síncrono, como SPI.', { code: 'wrap_target()\nwait(1, pin, 1)\nin_(pins, 1)\nwait(0, pin, 1)\nwrap()', c: 'rp_pioins', h: 'wait espera; in_ mete bits en el ISR.' }),
      Q('mov(x, invert(null)) deja en X…', ['0xFFFFFFFF', '0', '1', 'Lo que hubiera antes en X'], 'null vale 0; invertido, todo unos.', { c: 'rp_pioins', h: 'null es cero.' }),
      I('<b>Resumen</b>\n· Nueve instrucciones: jmp, wait, in, out, push, pull, mov, irq y set.\n· <b>jmp(x_dec)</b>: el cuerpo se repite X + 1 veces.\n· Valores grandes: la CPU los manda por la FIFO (<b>pull</b> + <b>mov</b>).', { svg: S.nine })
    ]),
    L('rp26', 'Registros, FIFOs y autopull', 'bus', ['rp_pioshift', 'rp_pioidle', 'rp_piocycles'], [
      PQ('Una UART envía primero el bit 0. Si el OSR desplaza sus bits hacia la izquierda, ¿cuál crees que sale primero?', ['El bit 31, el de arriba', 'El bit 0', 'Uno al azar', 'Salen todos a la vez'], 'Hacia la izquierda sale primero el bit alto. Para una UART hay que desplazar a la derecha.', 'rp_pioshift', 'Imagina los bits saliendo por el extremo hacia el que se desplazan.'),
      EX('El OSR tiene 32 bits. Cambia la dirección, dónde pones el dato con sm.put y el umbral de autopull.', 'rp_osrv', P.osr(), [
        TK('lsbOk', 1, 1, 'Envía el dato empezando por el bit 0, como una UART', 'Desplazando a la derecha, sale primero el bit 0.', 'Cambia la dirección.'),
        TK('msbOk', 1, 1, 'Ahora empezando por el bit 7, como una WS2812', 'A la izquierda sale primero el bit 31: hay que subir el dato con sm.put(dato, 24).', 'Izquierda y dato desplazado 24.'),
        TK('th', 8, 8, 'Haz que la máquina recargue el OSR tras cada byte', 'Umbral 8: tras 8 bits, la siguiente out recarga desde la FIFO.', 'Baja el umbral de autopull.')]),
      I('<b>out(pins, n)</b> saca n bits del OSR y <b>in_(pins, n)</b> mete n bits en el ISR. La dirección de desplazamiento y el autopull se eligen en el decorador.', { code: "@rp2.asm_pio(out_init=rp2.PIO.OUT_LOW,\n             out_shiftdir=rp2.PIO.SHIFT_RIGHT,  # sale primero el bit 0\n             autopull=True, pull_thresh=8)      # recarga cada 8 bits\ndef serie():\n    out(pins, 1)   [3]" }),
      I('<b>pull</b> carga el OSR desde la TX FIFO (y espera si está vacía); <b>push</b> envía el ISR a la RX FIFO. Con <b>autopull</b> y <b>autopush</b> lo hace la máquina sola. Si solo hablas en un sentido, puedes <b>unir las FIFO</b>: 8 palabras de cola en vez de 4.', { ...tune('rp_fifov', P.fifo({ w: LST('Escribe', 2, [1, 2, 3, 4], 'por ms'), r: LST('Lee', 1, [0, 1, 2, 3, 4], 'por ms') })) }),
      I('Mientras espera (un pull sin datos, un wait), la máquina deja sus pines <b>como estaban</b>. Diseña el programa para que se pare con la línea en <b>reposo</b>.', { svg: S.idle }),
      ST('Enviar colores de 24 bits a una WS2812, que quiere el bit alto primero.', ['Bit alto primero → desplazamiento a la izquierda', 'A la izquierda sale primero el bit 31 del OSR', 'sm.put(color, 8) sube los 24 bits del color a lo alto de la palabra', 'Autopull a 24: tras los 24 bits, recarga solo el siguiente color'], 'SHIFT_LEFT, autopull a 24 y sm.put(color, 8)'),
      Q('Un protocolo envía primero el bit menos significativo, como la UART. ¿Qué desplazamiento?', ['Hacia la derecha', 'Hacia la izquierda', 'Da igual', 'Ninguno'], 'Hacia la derecha, lo primero que sale es el bit 0.', { c: 'rp_pioshift', h: 'Recuerda la primera tarea de la exploración.' }),
      Q('Con autopull y umbral de 8 bits, ¿cuántos out(pins, 1) hay antes de que la máquina recargue el OSR?', ['8', '32', '1', '4'], 'Al llegar al umbral, la siguiente out recarga desde la FIFO.', { c: 'rp_pioshift', h: 'Umbral / bits por out.' }),
      Q('Usas sm.put() de 32 bits con autopull a 24 y desplazamiento a la izquierda. ¿Qué bits salen?', ['Los 24 de arriba: hay que desplazar el dato 8 posiciones a la izquierda', 'Los 24 de abajo', 'Los 32', 'Ninguno'], 'Por eso el driver de la WS2812 hace sm.put(color, 8).', { c: 'rp_pioshift', h: 'A la izquierda, sale primero lo de arriba.' }),
      Q('Una captura que solo envía datos a la CPU. ¿Qué configuras?', ['Unir las FIFO en RX: 8 palabras de cola', 'Unirlas en TX', 'No usar FIFO', 'Desactivar el autopush'], 'Más margen antes de perder datos.', { c: 'rp_pioshift', h: '¿En qué sentido viajan los datos?' }),
      Q('Un transmisor espera datos en un pull. ¿Qué nivel deben tener sus pines en ese momento?', ['El de reposo del protocolo, por ejemplo alto en una UART', 'Da igual', 'Alta impedancia siempre', 'Bajo siempre'], 'Si no, el receptor verá un bit de inicio falso.', { c: 'rp_pioidle', h: 'Mira el dibujo de la UART esperando.' }),
      Q('Haces sm.put(0b1011) pero por el pin solo salen ceros. ¿Qué falta?', ['Activar autopull o hacer pull() antes de sacar los bits', 'Un wrap()', 'Más frecuencia', 'Cambiar a SHIFT_LEFT'], 'Sin pull, el OSR nunca recibe el dato.', { code: '@rp2.asm_pio(out_init=rp2.PIO.OUT_LOW,\n             out_shiftdir=rp2.PIO.SHIFT_RIGHT)\ndef tx():\n    out(pins, 1)', c: 'rp_pioshift', h: '¿Cómo llega el dato de la FIFO al OSR?' }),
      G('rp_pioBit'),
      I('<b>Resumen</b>\n· OSR → out; in → ISR. Derecha: sale primero el bit 0; izquierda: el bit 31.\n· <b>autopull/autopush</b> por umbral; FIFO de 4 palabras (8 si las unes).\n· La máquina espera con los pines como estaban: déjalos en <b>reposo</b>.', { svg: S.idle })
    ]),
    L('rp27', 'Side-set, retardos y divisor', 'wave', ['rp_piosideset', 'rp_piodiv', 'rp_piocycles'], [
      PQ('Quieres sacar un bit de datos y, en el mismo ciclo, mover un pin de reloj. Con instrucciones normales serían dos. ¿Crees que el PIO puede hacerlo en una?', ['Sí: con side-set', 'No: una instrucción, un pin', 'Solo con DMA', 'Solo a baja frecuencia'], 'El side-set mueve hasta 5 pines a la vez que la instrucción hace otra cosa.', 'rp_piosideset', 'Hay unos bits de cada instrucción reservados para mover pines «de paso».'),
      I('Con <b>.side(n)</b>, cada instrucción pone los pines de side-set en el mismo ciclo. Ejemplo tipo SPI: el dato sale con el reloj bajo y el reloj sube en la instrucción siguiente.', { code: "@rp2.asm_pio(sideset_init=rp2.PIO.OUT_LOW,\n             out_init=rp2.PIO.OUT_LOW, autopull=True)\ndef tx_reloj():\n    wrap_target()\n    out(pins, 1)   .side(0)   # dato fuera, reloj abajo\n    nop()          .side(1)   # reloj arriba: el receptor lee\n    wrap()\n# StateMachine(..., out_base=Pin(16), sideset_base=Pin(17))" }),
      EX('Side-set y retardo comparten 5 bits de cada instrucción. Repártelos.', 'rp_ssv', P.ss(), [
        TK('maxd', 7, 7, 'Consigue un retardo máximo de [7]', 'Quedan 3 bits para el retardo: hasta 7.', 'Usa 2 bits para side-set.'),
        TK('maxd', 0, 0, 'Usa los 5 bits para side-set', 'Con 5 pines de side-set no queda sitio para retardos.', 'Sube los pines de side-set al máximo.')]),
      I('El reloj de cada máquina sale de clk_sys con su propio <b>divisor</b> (16 bits enteros y 8 de fracción): <b>f_máquina = clk_sys / div</b>, con div entre 1 y 65 536.', { code: "sm = rp2.StateMachine(0, onda, freq=2000, set_base=Pin(15))\n# MicroPython calcula el divisor: 125 000 000 / 2000 = 62 500\n\n# para una UART de 8 ciclos por bit:\n# div = clk_sys / (baudios × 8)" }),
      EX('Calcula el divisor de una UART hecha con PIO: elige reloj, baudios y ciclos por bit.', 'rp_piodivv', P.piodiv(), [
        TK('div', 1627, 1628.5, 'Busca 9600 baudios con 8 ciclos por bit y 125 MHz', '125 000 000 / (9600 × 8) ≈ 1627,6.', 'Baja los baudios a 9600.'),
        TK('valid', 0, 0, 'Busca una combinación imposible', 'El divisor no pasa de 65 536: para ir más lento, más ciclos por bit o retardos.', 'Prueba muy pocos baudios con pocos ciclos y reloj alto.')]),
      ST('Una UART a 115 200 baudios con 8 ciclos por bit y clk_sys = 125 MHz. ¿Divisor?', ['La máquina debe ir a 115 200 × 8 = 921 600 Hz', 'div = 125 000 000 / 921 600', '= 135,63', 'Admite fracción: unos ciclos duran un poco más; el error medio es despreciable'], 'div ≈ 135,6'),
      TU('Mira el transmisor UART ciclo a ciclo y, con clk_sys = 125 MHz, elige el divisor que da 115 200 baudios.', 'rp_pio', PIOP(), { q: 'baud', min: 114048, max: 116352, text: 'Objetivo: 115 200 baudios ± 1 %', hint: '125 000 000 / (8 × 115 200) ≈ 135,6.' }, 'Con 8 ciclos por bit, la máquina debe ir a 921,6 kHz.', { c: 'rp_piodiv', h: 'Sigue el ejemplo resuelto.' }),
      Q('Declaras 2 pines de side-set. ¿Qué retardo máximo puedes poner?', ['7 ciclos: quedan 3 bits', '31', '15', '5'], '5 − 2 = 3 bits → hasta [7].', { c: 'rp_piosideset', h: '5 bits en total; resta los del side-set.' }),
      Q('Con autopull activado, ¿qué genera?', ['Un bit de datos por cada ciclo de reloj: el dato cambia con el reloj bajo y el receptor lee al subir', 'Una onda sin datos', 'Nada: falta pull', 'Un PWM'], 'Es la base de una salida tipo SPI.', { code: 'wrap_target()\nout(pins, 1)   .side(0)\nnop()          .side(1)\nwrap()', c: 'rp_piosideset', h: '.side mueve el reloj; out saca el dato.' }),
      G('rp_pioDiv'),
      Q('MicroPython no te deja crear una StateMachine a 1 kHz con clk_sys = 125 MHz. ¿Por qué?', ['El divisor máximo es 65 536: el mínimo son unos 1907 Hz', 'Porque 1 kHz es demasiado rápido', 'Porque necesita la WiFi', 'Sí se puede'], 'Para ir más lento, alarga el programa con retardos o bucles.', { c: 'rp_piodiv', h: '125 000 000 / 65 536 ≈ ?' }),
      Q('Un divisor de 135,6 para 115 200 baudios…', ['Funciona: algunos ciclos duran un poco más, con un temblor de un ciclo de reloj', 'Es imposible', 'Se redondea a 135 exactos', 'Solo vale en C'], 'El error medio es despreciable para una UART.', { c: 'rp_piodiv', h: 'El divisor admite fracción.' }),
      Q('En ese transmisor, ¿por qué out(pins, 1) lleva [6] y no [7]?', ['El jmp que sigue gasta el octavo ciclo del bit', 'Por error', 'Porque el bit 0 es más corto', 'Para dejar tiempo al pull'], '7 + 1 = 8 ciclos por bit.', { c: 'rp_piocycles', h: 'Cuenta el ciclo del jmp.' }),
      I('<b>Resumen</b>\n· <b>Side-set</b>: mueve pines en el mismo ciclo; comparte 5 bits con el retardo.\n· <b>f_máquina = clk_sys / div</b>, div de 1 a 65 536, con fracción.\n· UART: div = clk_sys / (baudios × ciclos por bit).', { svg: S.smmap })
    ]),
    L('rp28', 'PIO desde MicroPython', 'code', ['rp_piompy', 'rp_ws2812', 'rp_piocycles', 'rp_pioidle', 'rp_pioshift'], [
      PQ('Una tira WS2812 recibe cada bit en 1,25 µs: un 0 es un pulso corto y un 1, uno largo. ¿Crees que un bucle de Python que mueve el pin podría hacerlo?', ['No: necesita precisión de décimas de microsegundo, cosa del PIO', 'Sí, con sleep_us', 'Sí, si quitas los print', 'Solo en la Pico 2'], 'Python ni llega ni es regular a esa escala. El PIO, sí.', 'rp_ws2812', 'Compara 1,25 µs con lo que tarda una línea de Python.'),
      I('<b>rp2.StateMachine</b> pone un programa en marcha: número de máquina, programa, frecuencia y los pines de cada tipo de instrucción.', { code: "import rp2\nfrom machine import Pin\n\n@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)\ndef destello():\n    wrap_target()\n    set(pins, 1)   [31]\n    nop()          [31]\n    set(pins, 0)   [31]\n    nop()          [31]\n    wrap()\n\nsm = rp2.StateMachine(0, destello, freq=2000, set_base=Pin(15))\nsm.active(1)" }),
      I('Cada tipo de instrucción mueve <b>su propio grupo</b> de pines, que eliges al crear la máquina: set_base, out_base, in_base y sideset_base.', { svg: S.smmap }),
      I('Para hablar con la máquina: <b>sm.put(valor, desplazamiento)</b> escribe en la TX FIFO; <b>sm.get()</b> lee de la RX; <b>sm.exec(\'…\')</b> ejecuta una instrucción suelta.', { code: "sm.put(1000)            # a la TX FIFO\nsm.put(color, 8)        # desplazado 8 bits a la izquierda\nvalor = sm.get()        # de la RX FIFO (espera si está vacía)\nsm.exec('set(x, 0)')    # X = 0 ahora mismo\nsm.active(0)            # parar" }),
      EX('Los bits de una WS2812: ajusta el reloj de la máquina y los ciclos de cada parte.', 'rp_ws', WSP(), [
        TK('T', 1240, 1260, 'Primero, que cada bit dure 1,25 µs', 'Ciclos por bit = 1,25 µs × frecuencia: a 8 MHz, 10 ciclos.', 'A 8 MHz, 10 ciclos por bit.'),
        TK('ok', 1, 1, 'Ahora haz que la tira entienda los bits', 'Por ejemplo 3 ciclos en alto para el 0 y 6 para el 1: dentro de ± 150 ns.', 'Un 0 ≈ 400 ns en alto; un 1 ≈ 800 ns.')]),
      I('El driver completo de la WS2812 son cuatro instrucciones. out(x, 1) va primero: si no hay datos, la máquina espera ahí con la línea baja, que la tira entiende como fin de trama.', { code: CODE_WS }),
      ST('El programa destello: cuatro instrucciones con [31] y la máquina a 2 kHz. ¿Frecuencia del LED?', ['Cada instrucción: 1 + 31 = 32 ciclos', 'Cuatro instrucciones: 128 ciclos por periodo', 'A 2000 Hz: 128 / 2000 = 0,064 s', 'f = 1 / 0,064 = 15,625 Hz'], '≈ 15,6 Hz'),
      Nm('Si subes esa máquina a 4 kHz, ¿a qué frecuencia parpadea el LED, en Hz?', 31.25, 'Hz', '4000 / 128 = 31,25 Hz.', { tol: 0.1, c: 'rp_piocycles', h: 'El periodo sigue siendo de 128 ciclos.' }),
      Q('¿Qué parámetro de StateMachine dice qué pin mueve set(pins, …)?', ['set_base', 'out_base', 'in_base', 'jmp_pin'], 'Cada tipo de instrucción tiene su propio grupo de pines.', { c: 'rp_piompy', h: 'Mira el dibujo de las bases.' }),
      Q('¿Qué hace?', ['Ejecuta esa instrucción ahora mismo en la máquina, fuera de su programa', 'La añade al final del programa', 'Borra el programa', 'Para la máquina'], 'Muy útil para leer o preparar registros.', { code: 'sm.exec("set(x, 0)")', c: 'rp_piompy', h: 'exec = ejecutar ya.' }),
      G('rp_wsCycles'),
      Q('En este driver, ¿por qué out(x, 1) va primero?', ['Si no hay datos, la máquina espera ahí con la línea en bajo, que es el fin de trama de la tira', 'Porque es más rápido', 'Por estética', 'Porque set no puede ir primero'], 'Una línea baja larga le dice a la tira que se acabó la trama.', { code: CODE_WS, c: 'rp_pioidle', h: '¿Dónde se para la máquina si la FIFO está vacía?' }),
      Q('¿Por qué el driver usa sm.put(color, 8)?', ['Desplaza el color 8 bits a la izquierda: con autopull a 24 y desplazamiento a la izquierda salen los 24 bits altos', 'Envía 8 colores', 'Divide entre 8', 'Pone el brillo al 8 %'], 'El segundo argumento de put es un desplazamiento.', { c: 'rp_pioshift', h: 'Recuerda el ejemplo resuelto de la lección de registros.' }),
      Nm('¿Cuánto tarda en enviarse una tira de 60 LEDs, en ms? (24 bits por LED a 800 kbit/s)', 1.8, 'ms', '60 × 24 = 1440 bits; / 800 000 = 1,8 ms.', { tol: 0.02, c: 'rp_ws2812', h: 'Bits totales entre bits por segundo.' }),
      I('<b>Resumen</b>\n· <b>StateMachine(n, prog, freq, …_base)</b> y <b>active(1)</b>.\n· <b>put</b>, <b>get</b> y <b>exec</b> para hablar con la máquina.\n· WS2812: bits de 1,25 µs; ciclos por bit = 1,25 µs × f.', { svg: S.smmap })
    ]),
    L('rp29', 'PIO desde C: pioasm', 'code', ['rp_pioc', 'rp_piocycles'], [
      PQ('Cargas tres programas PIO en el mismo bloque. ¿Crees que cada uno puede empezar en la instrucción 0?', ['No: comparten 32 posiciones y cada uno queda en su sitio (su offset)', 'Sí, cada máquina tiene su memoria', 'Sí, si son iguales', 'Solo en C'], 'Por eso pio_add_program devuelve dónde ha quedado cada programa.', 'rp_pioc', 'La memoria de instrucciones es del bloque.'),
      I('En C, el programa va en un fichero <b>.pio</b>, con sintaxis de ensamblador. <b>pioasm</b> lo convierte en una cabecera .pio.h; en CMake basta una línea.', { code: '; destello.pio\n.program destello\n    set pins, 1 [31]\n    set pins, 0 [31]\n\n# en CMakeLists.txt:\n# pico_generate_pio_header(app ${CMAKE_CURRENT_LIST_DIR}/destello.pio)' }),
      I('El mismo .pio puede llevar su función de arranque en C. Fíjate en los pasos: configuración, pines, divisor, ceder el pin al PIO, iniciar y arrancar.', { code: '% c-sdk {\nstatic inline void destello_init(PIO pio, uint sm, uint off, uint pin, float div) {\n    pio_sm_config c = destello_program_get_default_config(off);\n    sm_config_set_set_pins(&c, pin, 1);\n    sm_config_set_clkdiv(&c, div);\n    pio_gpio_init(pio, pin);\n    pio_sm_set_consistent_pindirs(pio, sm, pin, 1, true);\n    pio_sm_init(pio, sm, off, &c);\n    pio_sm_set_enabled(pio, sm, true);\n}\n%}' }),
      EX('Carga programas en un bloque: cada uno queda en su offset y entre todos no pueden pasar de 32.', 'rp_piomemv', P.piomem(), [
        TK('shareFit', 1, 1, 'Sin acortar ningún programa, consigue que quepan', 'Si B es el mismo programa que A, se carga una vez y lo usan las dos máquinas.', 'Haz que B sea el mismo programa que A.'),
        TK('total', 32, 32, 'Llena las 32 instrucciones justas', 'pio_add_program devuelve el offset donde quedó cada uno.', 'Ajusta los tamaños hasta sumar 32.')]),
      I('Para hablar con la máquina: <b>pio_sm_put_blocking</b> y <b>pio_sm_get_blocking</b> esperan; <b>pio_claim_unused_sm</b> pide una máquina libre para no pisarte con otras bibliotecas.', { code: 'PIO pio = pio0;\nuint off = pio_add_program(pio, &destello_program);\nuint sm = pio_claim_unused_sm(pio, true);\ndestello_init(pio, sm, off, 15, 62500.0f);\npio_sm_put_blocking(pio, sm, 1000);   // espera hueco en la TX FIFO' }),
      ST('destello.pio con clk_sys = 125 MHz y divisor 62 500. ¿Frecuencia del destello?', ['Máquina: 125 000 000 / 62 500 = 2000 Hz', 'Dos instrucciones de 32 ciclos: 64 ciclos por periodo', '2000 / 64 = 31,25 Hz', 'El LED parpadea 31,25 veces por segundo'], '31,25 Hz'),
      { t: 'order', q: 'Ordena cómo se pone en marcha una máquina en C.', items: ['pio_add_program carga el programa y devuelve su offset', 'program_get_default_config crea la configuración', 'Se eligen pines, desplazamientos y divisor', 'pio_gpio_init cede los pines al PIO', 'pio_sm_init aplica la configuración', 'pio_sm_set_enabled arranca la máquina'], e: 'Es lo que hace la función de inicio del .pio.', c: 'rp_pioc', h: 'Sigue el orden de la función destello_init.' },
      Q('Olvidas pio_gpio_init(pio, pin). ¿Qué pasa?', ['La máquina funciona pero el pin no cambia: sigue asignado a otra función', 'No compila', 'El pin se quema', 'La máquina no arranca'], 'La función del pin tiene que ser la del PIO.', { c: 'rp_pioc', h: '¿Quién controla el pin si no se lo cedes al PIO?' }),
      Q('¿Por qué pio_add_program devuelve una posición (offset)?', ['Porque varios programas comparten las 32 instrucciones y cada uno queda en un sitio', 'Para medir el tiempo', 'Es el número de la máquina', 'Es el divisor'], 'Los saltos del programa se recolocan según esa posición.', { c: 'rp_pioc', h: 'Recuerda la exploración de la memoria.' }),
      Q('¿Qué significa el true?', ['Que se detenga con un error si no queda ninguna máquina libre', 'Que la máquina arranque ya', 'Que use el núcleo 1', 'Que la memoria sea compartida'], 'Con false devolvería −1 y decidirías tú.', { code: 'uint sm = pio_claim_unused_sm(pio0, true);', c: 'rp_pioc', h: 'Es el parámetro «obligatorio».' }),
      Nm('destello a 125 MHz con divisor 31 250. ¿Frecuencia del destello, en Hz?', 62.5, 'Hz', 'Máquina a 4000 Hz; 64 ciclos por periodo → 62,5 Hz.', { tol: 0.1, c: 'rp_piocycles', h: 'Primero la frecuencia de la máquina; luego entre 64.' }),
      Q('¿Cuándo merece la pena C para el PIO?', ['Cuando necesitas DMA, varias máquinas sincronizadas o alimentar la FIFO más rápido de lo que puede Python', 'Nunca: MicroPython alimenta las FIFO igual de rápido', 'Solo para encender un LED', 'Cuando no existe pioasm'], 'El programa PIO es el mismo; cambia quién lo alimenta.', { c: 'rp_pioc', h: '¿Qué limita a MicroPython?' }),
      { t: 'match', q: 'Une cada función con lo que hace.', pairs: [['pio_sm_put_blocking', 'Escribe en la TX FIFO esperando hueco'], ['pio_sm_get_blocking', 'Lee de la RX FIFO esperando dato'], ['pio_sm_exec', 'Ejecuta una instrucción suelta'], ['pio_enable_sm_mask_in_sync', 'Arranca varias máquinas a la vez']], c: 'rp_pioc', h: 'put escribe, get lee.' },
      I('<b>Resumen</b>\n· .pio + <b>pioasm</b> → .pio.h (pico_generate_pio_header).\n· <b>pio_add_program</b> devuelve el offset; <b>pio_gpio_init</b> cede el pin; <b>pio_sm_init</b> y a correr.\n· C: DMA, máquinas sincronizadas y FIFO a toda velocidad.', { ...tune('rp_piomemv', P.piomem({ sh: sl('B es el mismo programa que A (0 no · 1 sí)', 1, 0, 1) })) })
    ]),
    L('rp30', 'Diseñar programas PIO', 'bus', ['rp_piocycles', 'rp_uartproto', 'rp_encoder', 'rp_pio', 'rp_pioc'], [
      PQ('Un receptor UART con 8 ciclos por bit ve bajar la línea (bit de inicio). ¿Cuándo crees que debe leer el primer bit de datos?', ['A bit y medio del flanco: en el centro del bit 0', 'Justo en el flanco', 'A un bit exacto', 'Al final de la trama'], 'Medio bit hasta el centro del inicio y uno entero más: 12 ciclos. Leer en el centro da margen.', 'rp_uartproto', 'El punto más seguro de un bit es el más alejado de sus flancos.'),
      I('Método: 1) dibuja la onda <b>en ciclos</b>; 2) elige ciclos por bit; 3) decide <b>dónde espera</b> la máquina y con qué nivel; 4) escribe el programa; 5) <b>cuenta los ciclos</b> de cada camino; 6) compruébalo con un analizador lógico.', { svg: S.cyclewave }),
      I('Ejemplo completo: un transmisor UART de 6 instrucciones y 8 ciclos por bit. Espera en pull() con la línea alta.', { code: CODE_UART }),
      EX('El receptor lee cada bit en un punto. Cambia la diferencia de baudios y dónde lee.', 'rp_uartrx', P.uartrx(), [
        TK('errs', 0, 0, 'Sin tocar el error de baudio, consigue leer bien los 10 bits', 'Leyendo en el centro tienes medio bit de margen a cada lado.', 'Lee en el centro (0,5).'),
        TK('center6', 1, 1, 'En el centro, ¿qué error de baudio ya no se tolera?', 'Hacia un 5 % se rompe la parada: en la práctica, los dos extremos deben ir al mismo baudio con un par de % de margen.', 'Sube la diferencia poco a poco.')]),
      I('Un <b>encoder en cuadratura</b> da dos señales, A y B, desfasadas. La secuencia 00 → 01 → 11 → 10 es un sentido; la inversa, el otro. El PIO puede vigilarlas sin perder ningún paso.', { ...tune('rp_encv', P.enc()) }),
      ST('¿Cuántos ciclos dura un byte completo en el transmisor UART?', ['pull y set(x, 7): 2 ciclos con la línea en reposo', 'Inicio: set(pins, 0) [7] = 8 ciclos', 'Datos: 8 bits × (7 + 1) = 64 ciclos', 'Parada: set(pins, 1) [7] = 8 ciclos'], '80 ciclos de trama (10 bits × 8) + 2 de preparación'),
      Q('En ese transmisor, ¿cuántos ciclos dura el bit de inicio?', ['8: set(pins, 0) [7]', '7', '1', '9'], 'Una instrucción más 7 de retardo.', { c: 'rp_piocycles', h: '1 + retardo.' }),
      Q('Si llegan bytes seguidos, el bit de parada dura 10 ciclos y no 8. ¿Es un problema?', ['No: la parada puede durar más de un bit; el receptor solo exige un mínimo', 'Sí, el receptor falla siempre', 'Sí, cambia el baudio', 'Pierde un byte de cada dos'], 'pull y set(x, 7) ocurren con la línea en reposo, alta.', { c: 'rp_uartproto', h: '¿Qué ve el receptor durante esos 2 ciclos extra?' }),
      Q('¿Por qué el receptor lee en el centro de cada bit?', ['Es el punto más alejado de los flancos: tolera diferencias de reloj y flancos lentos', 'Por ahorrar ciclos', 'Porque el inicio no existe', 'Para leer dos veces'], 'Un error de baudio desplaza poco a poco el punto de lectura.', { c: 'rp_uartproto', h: 'Recuerda la exploración.' }),
      Q('Un encoder pasa de AB = 00 a 01, luego a 11 y luego vuelve a 01. ¿Qué ha hecho?', ['Avanzó dos pasos y retrocedió uno', 'Dio una vuelta', 'Nada', 'Rebotó sin moverse'], 'Las transiciones válidas solo cambian un bit cada vez.', { c: 'rp_encoder', h: 'Sigue el círculo 00, 01, 11, 10.' }),
      Q('En este contador de flancos, ¿cuántos ciclos gasta como mínimo cada flanco?', ['3: dos wait y un jmp', '1', '2', '8'], 'Por eso el límite teórico ronda un tercio del reloj de la máquina.', { code: 'wrap_target()\nwait(0, pin, 0)\nwait(1, pin, 0)\njmp(x_dec, "sigue")\nlabel("sigue")\nwrap()', c: 'rp_piocycles', h: 'Cuenta las instrucciones del bucle.' }),
      Q('Tu programa PIO no cabe: 34 instrucciones. ¿Qué haces?', ['Ahorrar con side-set y retardos, o repartirlo entre dos bloques PIO', 'Subir el reloj', 'Pasarlo a MicroPython', 'Nada, cabe igual'], 'Cada bloque tiene sus 32 instrucciones.', { c: 'rp_pio', h: 'El límite es por bloque.' }),
      Q('Dos máquinas deben arrancar alineadas al ciclo, como HSYNC y VSYNC de un VGA. ¿Cómo?', ['Habilitándolas a la vez con una máscara y sincronizándolas con IRQ del PIO', 'Arrancándolas una tras otra en Python', 'Con sleep_us entre ellas', 'No se puede'], 'Lo harás en el proyecto final.', { c: 'rp_pioc', h: 'Hay una función que arranca varias a la vez.' }),
      Q('AB pasa de 11 a 10. Si 00 → 01 → 11 → 10 es avanzar, ¿qué ha hecho?', ['Avanzar un paso', 'Retroceder un paso', 'Nada', 'Error: cambian dos bits'], '11 → 10 está en la secuencia de avance.', { c: 'rp_encoder', h: 'Busca el par en la secuencia.' }),
      I('<b>Resumen</b>\n· Dibuja en ciclos, decide dónde espera y <b>cuenta cada camino</b>.\n· UART: reposo alto; el receptor lee en el <b>centro</b> de cada bit.\n· Encoder: 00 → 01 → 11 → 10, un bit cada vez.', { svg: S.cyclewave })
    ]),
    PRJ('rp-p6', 'Proyecto: tira WS2812 musical', 'rp_ledmusic'),
    PRJ('rp-p7', 'Proyecto: frecuencímetro con PIO', 'rp_freq')
  ];

  const M6 = [
    L('rp31', 'DMA: copiar sin la CPU', 'memory', ['rp_dma', 'rp_dmacfg', 'rp_dmatime'], [
      PQ('Guardas 2048 muestras del ADC a 500 000 por segundo. Si la CPU las copia una a una, ¿qué crees que puede hacer mientras tanto?', ['Casi nada: está ocupada copiando', 'Lo mismo que siempre', 'Calcular el doble', 'Dormir'], 'Copiar es trabajo de mozo de almacén. El DMA es una cinta transportadora que lo hace sola.', 'rp_dma', 'Alguien tiene que mover cada muestra.'),
      EX('Compara: la CPU copiando muestra a muestra frente al DMA.', 'rp_dma', DMAP(), [
        TK('cpu', 0, 0, 'Pasa la copia al DMA', 'La CPU queda libre: solo lanza la transferencia y recoge el resultado.', 'Pon «Quién copia» a 1.'),
        TK('cap', 3.9, 4.2, 'Consigue una captura de unos 4 ms con el DMA', 'Tiempo = muestras / frecuencia de muestreo: 2048 a 500 ksps o 1000 a 250 ksps.', 'Prueba 2048 muestras a 500 ksps.')]),
      I('El RP2040 tiene <b>12 canales DMA</b> (el RP2350, 16). Cada uno responde a cinco preguntas: de dónde lee, a dónde escribe, cuántas transferencias, de qué tamaño y <b>quién marca el ritmo</b> (DREQ).', { svg: S.dmacfg, more: 'Un periférico es una dirección fija (no avanza); un búfer avanza. El DREQ hace que el canal espere a que el periférico tenga dato o hueco. Sin DREQ, el canal copia tan rápido como puede: lo normal entre dos zonas de RAM.' }),
      I('La cuenta es de <b>transferencias</b>, no de bytes: con 32 bits, 1000 transferencias son 4000 bytes. La RAM está en <b>bancos</b> para que la CPU y el DMA choquen poco.', { svg: S.banks }),
      ST('¿Cuánto tarda el DMA en llenar 4096 muestras a 250 ksps, y cuántas transferencias de 16 bits hace?', ['El DREQ del ADC marca el ritmo: 250 000 por segundo', '4096 / 250 000 = 0,0164 s = 16,4 ms', 'Una transferencia por muestra: TRANS_COUNT = 4096', 'De 16 bits: 8192 bytes de RAM'], '16,4 ms · 4096 transferencias'),
      { t: 'match', q: 'Une cada registro o ajuste con su papel.', pairs: [['READ_ADDR', 'De dónde lee'], ['WRITE_ADDR', 'A dónde escribe'], ['TRANS_COUNT', 'Cuántas transferencias'], ['DREQ', 'Quién marca el ritmo']], c: 'rp_dmacfg', h: 'READ = leer, WRITE = escribir.' },
      G('rp_dmaTime'), G('rp_dmaTime'),
      Q('Copias 4 KB de un búfer a otro en RAM. ¿Configuración?', ['Lectura y escritura avanzando, sin DREQ: lo más rápido posible', 'Ninguna dirección avanza', 'DREQ del ADC', 'Solo avanza la lectura'], 'Entre memorias no hay que esperar a nadie.', { c: 'rp_dmacfg', h: 'Dos búferes avanzan; no hay periférico que marque el ritmo.' }),
      Q('Envías un búfer a la TX FIFO de una máquina PIO. ¿Qué DREQ?', ['El de la TX FIFO de esa máquina: avanza cuando hay hueco', 'El del ADC', 'Ninguno', 'El de la UART'], 'Si no, desbordarías la FIFO.', { c: 'rp_dmacfg', h: '¿Quién sabe cuándo cabe otro dato?' }),
      Nm('Mueves 3000 bytes con transferencias de 32 bits. ¿TRANS_COUNT?', 750, '', '3000 / 4 = 750.', { c: 'rp_dmacfg', h: '32 bits son 4 bytes.' }),
      Q('¿Qué pasa si la CPU y el DMA acceden al mismo banco de RAM a la vez?', ['Uno espera un ciclo: el bus arbitra', 'Se corrompe el dato', 'Se reinicia el chip', 'Nada nunca'], 'Por eso conviene repartir los búferes entre bancos en diseños exigentes.', { c: 'rp_dma', h: 'Mira el dibujo de los bancos.' }),
      Q('¿Qué ganas al enviar una tira de LEDs con DMA en vez de con un bucle?', ['La CPU queda libre mientras salen los datos', 'Más colores', 'Menos consumo de los LEDs', 'Nada'], 'La CPU solo lanza la transferencia.', { c: 'rp_dma', h: '¿Quién mueve los datos?' }),
      I('<b>Resumen</b>\n· DMA: copia sin la CPU. Cinco preguntas: lee, escribe, cuántas, tamaño y <b>DREQ</b>.\n· Periférico = dirección fija; búfer = avanza.\n· Tiempo con DREQ = <b>muestras / frecuencia</b>.', { svg: S.dmacfg })
    ]),
    L('rp32', 'DMA en C: captura del ADC', 'memory', ['rp_dmacfg', 'rp_adcdiv', 'rp_dma', 'rp_ws2812'], [
      PQ('El ADC del RP2040 llega a 500 000 muestras por segundo. Para muestrear a 10 000, ¿qué crees que haces?', ['Dividir su reloj de 48 MHz', 'Leerlo menos veces desde un bucle', 'Bajar clk_sys', 'No se puede cambiar'], 'adc_set_clkdiv: el ADC toma una muestra cada (div + 1) ciclos de 48 MHz, sin la CPU.', 'rp_adcdiv', 'El ADC tiene su propio reloj.'),
      I('Captura del ADC con DMA: el ADC deja cada muestra en su FIFO y pide transferencia (DREQ_ADC); el canal lee siempre del FIFO y escribe avanzando en el búfer.', { code: 'adc_fifo_setup(true, true, 1, false, false);\nadc_set_clkdiv(0);                      // 500 ksps\ndma_channel_config c = dma_channel_get_default_config(ch);\nchannel_config_set_transfer_data_size(&c, DMA_SIZE_16);\nchannel_config_set_read_increment(&c, false);   // FIFO fijo\nchannel_config_set_write_increment(&c, true);   // búfer avanza\nchannel_config_set_dreq(&c, DREQ_ADC);\ndma_channel_configure(ch, &c, buf, &adc_hw->fifo, N, true);\nadc_run(true);' }),
      I('<b>adc_set_clkdiv(div)</b>: una muestra cada (div + 1) ciclos de 48 MHz. Una conversión ya tarda 96 ciclos: por debajo de eso, el máximo (500 ksps).', { svg: S.adcdiv }),
      EX('Elige div y mira el ritmo de muestreo.', 'rp_adcdivv', P.adcdiv(), [
        TK('fs', 9999, 10001, 'Consigue 10 000 muestras por segundo', 'div = 48 000 000 / 10 000 − 1 = 4799.', 'Uno de los valores acaba en 99.'),
        TK('fs', 47999, 48001, 'Ahora 48 000 muestras por segundo, como el audio', 'div = 999.', '48 000 000 / 1000.')]),
      I('El DMA también alimenta el PIO: el canal escribe en la TX FIFO de la máquina y avanza al ritmo de su DREQ. Así sale una tira de 300 LEDs sin que la CPU mueva un dedo.', { code: 'dma_channel_config c = dma_channel_get_default_config(ch);\nchannel_config_set_transfer_data_size(&c, DMA_SIZE_32);\nchannel_config_set_dreq(&c, pio_get_dreq(pio0, sm, true));   // TX\ndma_channel_configure(ch, &c, &pio0->txf[sm], colores, 300, true);' }),
      ST('Captura de 1 s a 48 000 muestras por segundo con DMA: div y memoria.', ['div = 48 000 000 / 48 000 − 1 = 999', 'Muestras en 1 s: 48 000', 'De 16 bits: 96 000 bytes ≈ 94 KB', 'Cabe en los 264 KB, pero ocupa más de un tercio'], 'div 999 · ≈ 94 KB'),
      Q('¿Qué pasaría si quitaras esta línea?', ['El DMA leería el FIFO a toda velocidad, repitiendo datos o leyendo vacío', 'Nada', 'Iría más lento', 'No compilaría'], 'El DREQ sincroniza el DMA con el periférico.', { code: 'channel_config_set_dreq(&c, DREQ_ADC);', c: 'rp_dmacfg', h: '¿Quién marcaría el ritmo sin ella?' }),
      G('rp_adcDiv'),
      Q('¿Qué ritmo de muestreo da adc_set_clkdiv(0)?', ['500 ksps, el máximo', '48 Msps', 'Ninguno: el ADC se para', '1 ksps'], 'Cada conversión necesita 96 ciclos.', { c: 'rp_adcdiv', h: 'No puede ir más rápido que una conversión.' }),
      Nm('¿Qué div necesitas para 1000 muestras por segundo?', 47999, '', '48 000 000 / 1000 − 1 = 47 999.', { tol: 1, c: 'rp_adcdiv', h: 'No olvides el −1.' }),
      Q('DMA con PIO para una tira WS2812 de 300 LEDs. ¿Qué ganas?', ['La CPU lanza la transferencia y queda libre mientras salen los 300 colores', 'Más colores', 'Menos consumo de los LEDs', 'Nada'], 'Con Python alimentando la FIFO, la CPU estaría ocupada todo ese tiempo.', { c: 'rp_dma', h: '¿Quién mueve los colores?' }),
      Nm('300 LEDs × 24 bits a 800 kbit/s. ¿Cuántos ms dura la transferencia?', 9, 'ms', '7200 bits / 800 000 = 9 ms.', { tol: 0.05, c: 'rp_ws2812', h: 'Bits totales entre bits por segundo.' }),
      Q('Guardas muestras de 12 bits del ADC. ¿Qué tamaño de transferencia eliges?', ['DMA_SIZE_16', 'DMA_SIZE_8', 'DMA_SIZE_32', 'Da igual'], '12 bits no caben en 8; con 32 gastarías el doble.', { c: 'rp_dmacfg', h: 'El más pequeño en el que caben 12 bits.' }),
      I('<b>Resumen</b>\n· ADC + DMA: FIFO fijo, búfer que avanza, <b>DREQ_ADC</b> y transferencias de 16 bits.\n· <b>div = 48 MHz / f − 1</b> (máximo 500 ksps).\n· DMA a la TX FIFO del PIO, con su DREQ.', { svg: S.adcdiv })
    ]),
    L('rp45', 'DMA encadenado y en anillo', 'memory', ['rp_dmachain', 'rp_dmaring'], [
      PQ('Un canal DMA llena un búfer y tu programa lo procesa. Mientras procesas, siguen llegando muestras. ¿Dónde crees que se guardan?', ['En un segundo búfer, que llena otro canal encadenado', 'Se pierden siempre', 'En la flash', 'En la FIFO del ADC, sin límite'], 'Dos canales se turnan: mientras uno llena, procesas lo que llenó el otro (ping-pong).', 'rp_dmachain', 'Hacen falta dos búferes.'),
      EX('Dos búferes que se alternan. ¿Le da tiempo a la CPU?', 'rp_ppv', P.pp(), [
        TK('ok6', 1, 1, 'Sin cambiar los 6 ms de proceso, ajusta el búfer o el muestreo para no perder datos', 'La CPU tiene lo que tarda en llenarse el otro búfer.', 'Búferes más grandes o muestreo más lento.'),
        TK('tight', 1, 1, 'Con 500 ksps y el búfer más grande, ajusta el proceso justo por debajo del límite', '2048 / 500 000 = 4,1 ms: ese es tu presupuesto por búfer.', 'Entre 3,5 y 4 ms.')]),
      I('Con <b>chain_to</b>, al terminar, un canal arranca a otro. En <b>ping-pong</b>, A llena el búfer 1 y arranca B; B llena el 2 y arranca A. Una interrupción avisa a la CPU de cuál está listo.', { svg: S.pingpong }),
      I('Un canal también puede <b>reprogramar a otro</b>: si escribe en un alias de registro con disparo, lo reapunta y lo relanza. Un bucle infinito sin la CPU, ideal para un generador de señales.', { code: '// el canal de control escribe la dirección de la tabla\n// en el registro de lectura (con disparo) del canal de datos\ndma_channel_configure(ch_ctrl, &cc,\n    &dma_hw->ch[ch_datos].al3_read_addr_trig,\n    &dir_tabla, 1, false);' }),
      EX('Anillo: la dirección da la vuelta cada 2ⁿ bytes. Mueve el inicio del búfer y el tamaño del anillo.', 'rp_ringv', P.ring(), [
        TK('aligned', 1, 1, 'Mueve el búfer para que el anillo de 256 bytes vuelva justo a su inicio', 'El inicio debe ser múltiplo de 256: 0x…000, 0x…100, 0x…200…', 'k múltiplo de 4.'),
        TK('al512', 1, 1, 'Ahora con un anillo de 512 bytes', 'Múltiplo de 512: 0x…000, 0x…200, 0x…400…', 'Pon 9 bits y k múltiplo de 8.')]),
      I('Con <b>channel_config_set_ring</b>, la dirección de lectura (o de escritura) recorre una y otra vez el mismo búfer. Funciona dejando fijos los bits altos: el búfer debe estar <b>alineado</b> a su tamaño.', { code: 'uint8_t tabla[256] __attribute__((aligned(256)));\n// …\nchannel_config_set_ring(&c, false, 8);   // lectura, 2^8 = 256 bytes' }),
      ST('Ping-pong con búferes de 2048 muestras a 500 ksps. ¿Cuánto tiempo tiene la CPU por búfer?', ['Cada búfer tarda 2048 / 500 000 = 4,1 ms en llenarse', 'Mientras se llena uno, procesas el otro', 'Tienes unos 4,1 ms por búfer', 'Si tu proceso tarda 6 ms: búferes más grandes o muestreo más lento'], '≈ 4,1 ms por búfer'),
      Q('Ping-pong: A ha llenado el búfer 1 y B está llenando el 2. ¿Qué hace la CPU?', ['Procesa el búfer 1 y deja A preparado para la siguiente vuelta', 'Espera sin hacer nada', 'Lee el búfer 2 a medio llenar', 'Apaga el ADC'], 'Tiene el tiempo de llenar un búfer para terminar.', { c: 'rp_dmachain', h: '¿Qué búfer está completo?' }),
      Q('¿Qué consigue el canal de control?', ['Vuelve a apuntar el canal de datos al inicio de la tabla y lo relanza', 'Copia la tabla entera', 'Para el PIO', 'Lee el ADC'], 'Es el truco del generador de señales.', { code: 'dma_channel_configure(ch_ctrl, &cc,\n    &dma_hw->ch[ch_datos].al3_read_addr_trig,\n    &dir_tabla, 1, false);', c: 'rp_dmachain', h: '¿En qué registro escribe, y con disparo?' }),
      Q('Anillo de lectura de 8 bits de dirección (256 bytes). ¿Requisito del búfer?', ['Estar alineado a 256 bytes', 'Medir 8 bytes', 'Estar en la flash', 'Ninguno'], 'La vuelta se hace dejando fijos los bits altos de la dirección.', { c: 'rp_dmaring', h: 'Recuerda la exploración del anillo.' }),
      Q('¿Cuál de estas direcciones de inicio vale para un anillo de 256 bytes?', ['0x20000400', '0x20000410', '0x20000480', '0x20000401'], 'Debe ser múltiplo de 0x100.', { c: 'rp_dmaring', h: 'Los dos últimos dígitos hexadecimales deben ser 00.' }),
      Q('En ping-pong, ¿cuánto tiempo tiene la CPU para procesar un búfer?', ['Lo que tarda en llenarse el otro', 'Todo el que quiera', 'Un ciclo', 'Ninguno: lo procesa mientras se llena'], 'Si tarda más, el otro canal lo pisará.', { c: 'rp_dmachain', h: 'Mira la exploración.' }),
      Nm('Un anillo de 10 bits, ¿de cuántos bytes es?', 1024, 'bytes', '2¹⁰ = 1024.', { c: 'rp_dmaring', h: '2 elevado al número de bits.' }),
      I('<b>Resumen</b>\n· <b>chain_to</b>: ping-pong sin perder muestras; la CPU tiene lo que tarda en llenarse el otro búfer.\n· Un canal de control puede reprogramar a otro: bucles sin CPU.\n· <b>Anillo</b> de 2ⁿ bytes con el búfer <b>alineado</b> a 2ⁿ.', { svg: S.pingpong })
    ]),
    L('rp33', 'Los dos núcleos', 'chip', ['rp_cores', 'rp_corefifo'], [
      PQ('Al encender la Pico, ¿crees que los dos núcleos empiezan a ejecutar tu programa?', ['No: solo el 0; el 1 espera a que lo lances', 'Sí, los dos el mismo código', 'Sí, cada uno la mitad', 'Solo el 1'], 'El núcleo 1 duerme hasta que le das una función que ejecutar.', 'rp_cores', 'Alguien tiene que decirle al segundo qué hacer.'),
      I('Dos Cortex-M0+ iguales. El núcleo 1 se lanza con <b>multicore_launch_core1(funcion)</b> en C o <b>_thread.start_new_thread(funcion, args)</b> en MicroPython, y corre <b>en paralelo de verdad</b>.', { code: "// C\nvoid nucleo1(void) { while (true) { trabajo(); } }\nmulticore_launch_core1(nucleo1);\n\n# MicroPython (experimental)\nimport _thread\ndef trabajo():\n    while True:\n        procesar()\n_thread.start_new_thread(trabajo, ())", more: 'En MicroPython, _thread aún se considera experimental, y algunas partes (como la WiFi de la Pico W) suponen que todo ocurre en el núcleo 0.' }),
      EX('Un lazo de control necesita 0,2 ms cada milisegundo; la WiFi mete ráfagas. Compara el reparto.', 'rp_coresv', P.cores(), [
        TK('missed', 1, 1, 'Con todo en un núcleo, alarga la ráfaga hasta perder plazos', 'El control llega tarde cuando la red acapara el núcleo.', 'Sube la ráfaga.'),
        TK('splitBig', 1, 1, 'Reparte el trabajo y mantén la ráfaga grande', 'Cada núcleo a lo suyo: la red ya no toca el control.', 'Pon el control en el núcleo 1 con la ráfaga de 2 ms.')]),
      I('Los dos núcleos se pasan mensajes por una <b>FIFO</b> en cada sentido, de 8 palabras en el RP2040: push envía (y espera si está llena) y pop recibe (y espera si está vacía).', { more: 'En el RP2350 estas FIFO son más cortas: 4 palabras según su hoja de datos. Compruébalo en la hoja de datos de tu chip y no dependas del tamaño exacto: usa multicore_fifo_wready() para saber si hay hueco.', code:'#include "pico/multicore.h"\nvoid nucleo1(void) {\n    while (true) {\n        uint32_t v = multicore_fifo_pop_blocking();\n        printf("núcleo 1 recibe %lu\\n", v);\n    }\n}\nint main(void) {\n    stdio_init_all();\n    multicore_launch_core1(nucleo1);\n    for (uint32_t i = 0; ; i++) {\n        multicore_fifo_push_blocking(i);\n        sleep_ms(500);\n    }\n}' }),
      EX('Una FIFO entre núcleos: cambia lo que escribe uno y lo que lee el otro.', 'rp_fifov', P.fifo({ dp: LST('Capacidad', 8, [4, 8], 'palabras') }), [
        TK('full', 1, 1, 'Haz que el núcleo que lee vaya más despacio que el que escribe', 'La FIFO se llena y push_blocking hace esperar al que escribe.', 'Baja lo que lee.'),
        TK('tfull', 4, 4, 'Con 8 palabras (la FIFO del RP2040), haz que tarde 4 ms en llenarse', 'Sube 2 palabras por ms: 8 / 2 = 4 ms.', 'Que escriba 2 más por ms de lo que lee.')]),
      I('Los dos núcleos comparten <b>toda</b> la RAM, la flash y los periféricos. Cada uno tiene su controlador de interrupciones: una interrupción se atiende en el núcleo que la activó.', { svg: S.cores }),
      ST('Reparte: un lazo de motor a 1 kHz, un servidor web y una pantalla.', ['El lazo no puede esperar: núcleo 1, con su temporizador', 'La red tiene ráfagas impredecibles: núcleo 0', 'La pantalla tampoco es urgente: núcleo 0', 'Datos del lazo al núcleo 0 por la FIFO, sin variables compartidas'], 'Tiempo real en un núcleo; lo impredecible en el otro'),
      Q('En un RP2040, ¿qué pasa si el núcleo 1 procesa más despacio de lo que el 0 envía?', ['La FIFO (8 palabras en el RP2040) se llena y push_blocking hace esperar al núcleo 0', 'Se pierden datos sin aviso', 'Se reinicia', 'El núcleo 1 acelera'], 'Con multicore_fifo_wready() puedes comprobar antes si hay hueco.', { c: 'rp_corefifo', h: 'Recuerda la exploración de la FIFO.' }),
      Q('¿Qué comparten los dos núcleos?', ['Toda la RAM, la flash y los periféricos', 'Nada: cada uno tiene su memoria', 'Solo la flash', 'Solo la FIFO'], 'Por eso hay que tener cuidado con los datos compartidos.', { c: 'rp_cores', h: 'Mira el dibujo.' }),
      { t: 'match', q: 'Une cada función con lo que hace.', pairs: [['multicore_launch_core1', 'Arranca una función en el núcleo 1'], ['multicore_fifo_push_blocking', 'Envía una palabra al otro núcleo'], ['multicore_fifo_pop_blocking', 'Recibe una palabra del otro núcleo'], ['get_core_num', 'Dice en qué núcleo estás']], c: 'rp_corefifo', h: 'push envía, pop recibe.' },
      Q('¿Dónde corre trabajo()?', ['En el segundo núcleo, en paralelo con el programa principal', 'En el mismo núcleo, por turnos', 'En el PIO', 'En el PC'], 'A diferencia de asyncio, aquí hay paralelismo real.', { code: 'import _thread\ndef trabajo():\n    while True:\n        procesar()\n_thread.start_new_thread(trabajo, ())', c: 'rp_cores', h: '_thread usa el otro núcleo.' }),
      Q('Un lazo de control a 1 kHz exactos mientras se sirve una web. ¿Cómo repartes?', ['Control en un núcleo con su temporizador; red y USB en el otro', 'Todo en el núcleo 0', 'El control dentro de asyncio', 'Alternando cada segundo'], 'La red tiene ráfagas impredecibles que no deben afectar al control.', { c: 'rp_cores', h: 'Recuerda la primera exploración.' }),
      Q('Los dos núcleos llaman a printf a la vez en el pico-sdk. ¿Qué pasa?', ['La salida está protegida: las líneas no se mezclan a mitad, aunque el orden entre núcleos no está garantizado', 'Se cuelga', 'Solo funciona en el núcleo 0', 'Las letras se mezclan siempre'], 'El SDK protege stdout con un mutex.', { c: 'rp_cores', h: 'El SDK protege la salida estándar.' }),
      Q('Llamas a gpio_set_irq_enabled_with_callback desde el núcleo 1. ¿Dónde se ejecuta el callback?', ['En el núcleo 1', 'En el núcleo 0', 'En los dos', 'En el PIO'], 'Cada núcleo tiene su controlador de interrupciones.', { c: 'rp_cores', h: 'La interrupción es del núcleo que la activó.' }),
      I('<b>Resumen</b>\n· El núcleo 1 se lanza a mano; corre en paralelo de verdad.\n· Lo comparten todo: para pasar datos, mejor la <b>FIFO</b> (8 palabras en el RP2040; menos en el RP2350).\n· Tiempo real en un núcleo; red, USB e interfaz en el otro.', { svg: S.cores })
    ]),
    L('rp34', 'Carreras, cerrojos y spinlocks', 'shield', ['rp_multicore', 'rp_lock', 'rp_corefifo'], [
      PQ('Dos núcleos suman 1 a la misma variable, 1000 veces cada uno, sin protección. ¿Qué resultado esperas?', ['Puede salir menos de 2000', 'Siempre 2000', 'Siempre 1000', 'Más de 2000'], 'Algunas sumas se pisan: es una condición de carrera.', 'rp_multicore', 'Sumar 1 son varios pasos.'),
      EX('Dos núcleos suman 1, dos veces cada uno, a la misma variable. Cambia cuándo empieza el núcleo 1 y si usan cerrojo.', 'rp_race', { d: sl('Retraso del núcleo 1', 6, 0, 6, 1, 'pasos'), lk: sl('Cerrojo (0 no · 1 sí)', 0, 0, 1) }, [
        TK('lost', 1, 4, 'Sin cerrojo, busca un retraso con el que se pierdan sumas', 'Si los dos leen antes de que el otro escriba, una suma se pierde.', 'Prueba retrasos pequeños.'),
        TK('lkOk', 1, 1, 'Activa el cerrojo: ¿se pierde alguna suma?', 'Con cerrojo, leer-sumar-escribir es indivisible: siempre 4.', 'Pon el cerrojo a 1.')]),
      I('«contador += 1» es en realidad <b>leer, sumar y escribir</b>. Si el otro núcleo se cuela entre medias, se pierde una suma.', { svg: S.race }),
      I('Un <b>cerrojo</b> deja entrar a un solo núcleo en la <b>sección crítica</b>. El M0+ no tiene instrucciones atómicas de leer-modificar-escribir: por eso el RP2040 trae <b>32 spinlocks</b> en hardware.', { code: 'critical_section_t cs;\ncritical_section_init(&cs);\n// …\ncritical_section_enter_blocking(&cs);   // y desactiva interrupciones\ncontador++;\ncritical_section_exit(&cs);\n\n# MicroPython\ncerrojo = _thread.allocate_lock()\nwith cerrojo:\n    total += 1', more: 'El SDK ofrece también mutex_t, mejor para esperas largas, y spin_lock_blocking. Las secciones críticas deben ser cortas: si desactivan interrupciones, retrasan USB, temporizadores y comunicaciones.' }),
      I('<b>Interbloqueo</b>: el núcleo 0 tiene el cerrojo A y espera el B; el 1 tiene el B y espera el A. Nadie avanza. Regla: tomar siempre los cerrojos en el <b>mismo orden</b>.', { svg: S.deadlock }),
      ST('Los dos núcleos hacen contador += 1 con contador = 5, sin cerrojo.', ['El núcleo 0 lee 5', 'El núcleo 1 lee 5 (antes de que el 0 escriba)', 'El 0 escribe 6; el 1 escribe 6', 'Dos sumas y el resultado es 6: se ha perdido una'], 'Condición de carrera: 6 en vez de 7'),
      Q('¿Qué garantiza este código?', ['Que solo un núcleo a la vez ejecuta contador++, sin interrupciones en medio', 'Que contador++ va más rápido', 'Que contador se guarda en la flash', 'Nada en un M0+'], 'Entrar y salir rodean la sección crítica.', { code: 'critical_section_enter_blocking(&cs);\ncontador++;\ncritical_section_exit(&cs);', c: 'rp_lock', h: 'Entre enter y exit solo cabe uno.' }),
      Q('¿Por qué el Cortex-M0+ necesita los spinlocks del SIO para esto?', ['No tiene instrucciones atómicas de leer-modificar-escribir', 'Porque es de 8 bits', 'Porque no tiene RAM', 'No los necesita'], 'El M33 del RP2350 sí tiene instrucciones exclusivas.', { c: 'rp_lock', h: '¿Puede el M0+ leer y escribir de golpe?' }),
      Q('Núcleo 0 toma A y espera B; núcleo 1 toma B y espera A. ¿Qué ocurre?', ['Interbloqueo: los dos esperan para siempre', 'Uno gana al azar', 'Se liberan solos', 'Va más lento pero termina'], 'Mismo orden siempre, y el problema desaparece.', { c: 'rp_lock', h: 'Mira el dibujo.' }),
      Q('Alternativa sin cerrojos para pasar medidas del núcleo 1 al 0:', ['La FIFO entre núcleos o una cola con un solo escritor y un solo lector', 'Una variable global sin más', 'printf', 'Reiniciar el núcleo 1'], 'Pasar mensajes evita compartir estado.', { c: 'rp_corefifo', h: 'Recuerda la lección anterior.' }),
      Q('¿Qué aporta with cerrojo?', ['Toma el cerrojo y lo suelta al salir del bloque, incluso si hay un error', 'Nada', 'Crea un hilo', 'Duplica total'], 'Es la forma segura en MicroPython.', { code: 'cerrojo = _thread.allocate_lock()\ndef sumar():\n    global total\n    with cerrojo:\n        total += 1', c: 'rp_lock', h: 'Igual que with open cierra el fichero.' }),
      Q('Una sección crítica de 5 ms con interrupciones desactivadas. ¿Problema?', ['Retrasas 5 ms todas las interrupciones: USB, temporizadores y comunicaciones pueden fallar', 'Ninguno', 'Gasta más flash', 'Solo afecta al LED'], 'Dentro, solo lo imprescindible.', { c: 'rp_lock', h: '¿Qué no puede atenderse durante esos 5 ms?' }),
      Q('El núcleo 0 lee 7, suma y escribe 8. Después, el núcleo 1 lee, suma y escribe. ¿Resultado?', ['9', '8', '7', '10'], 'Sin solaparse, no se pierde nada.', { c: 'rp_multicore', h: 'El núcleo 1 lee cuando ya hay un 8.' }),
      I('<b>Resumen</b>\n· «+= 1» = leer, sumar, escribir: dos núcleos pueden pisarse.\n· Cerrojos: <b>critical_section</b>, mutex o <b>with cerrojo</b>; cortos y en el mismo orden.\n· Mejor aún: pasar mensajes (FIFO).', { svg: S.race })
    ]),
    PRJ('rp-p8', 'Proyecto: osciloscopio de bolsillo', 'rp_scope'),
    PRJ('rp-p9', 'Proyecto: analizador lógico', 'rp_logic'),
    PRJ('rp-p10', 'Proyecto: generador de señales', 'rp_siggen'),
    PRJ('rp-p11', 'Proyecto: robot equilibrista', 'rp_balance')
  ];

  const M7 = [
    L('rp35', 'USB nativo y TinyUSB', 'bus', ['rp_usb', 'rp_usbenum', 'rp_tinyusb'], [
      PQ('Conectas a tu PC una Pico programada como teclado. ¿Crees que hará falta instalar un controlador?', ['No: los teclados son una clase estándar (HID)', 'Sí, siempre', 'Solo en Windows', 'Solo si es la W'], 'El sistema ya trae los controladores de las clases estándar: HID, CDC, MSC, MIDI…', 'rp_usb', 'Piensa en cualquier teclado USB que hayas enchufado.'),
      EX('Avanza por la enumeración: lo que pasa desde que conectas el cable hasta que el PC te reconoce.', 'rp_usbv', P.usb(), [
        TK('s', 2, 2, 'Avanza hasta que el anfitrión pregunte quién eres', 'El descriptor de dispositivo trae el VID (fabricante) y el PID (producto).', 'Paso 3.'),
        TK('s', 6, 6, 'Termina la enumeración', 'El sistema carga su controlador estándar para cada clase: sin instalar nada.', 'Hasta el último paso.')]),
      I('El RP2040 tiene USB de <b>velocidad completa</b> (12 Mbit/s) y puede ser <b>dispositivo</b> o <b>anfitrión</b>. El SDK usa la biblioteca <b>TinyUSB</b>. El printf por USB que ya conoces es la clase CDC montada sobre ella.', { svg: S.usbcls, more: 'Como anfitrión, el RP2040 puede leer un teclado, un ratón o un mando USB, dándoles 5 V por VBUS. Con el PIO incluso se ha hecho un segundo puerto USB por software.' }),
      I('TinyUSB atiende el USB dentro de <b>tud_task()</b>: llámala en cada vuelta del bucle y no bloquees nunca ese bucle.', { svg: S.tud, code: 'int main(void) {\n    board_init();\n    tusb_init();\n    while (true) {\n        tud_task();     // atiende el USB\n        mi_trabajo();   // corto, sin sleep largos\n    }\n}' }),
      I('<b>VID</b> (fabricante) y <b>PID</b> (producto) identifican tu aparato. Para pruebas personales vale el de los ejemplos; para publicar o vender, no uses números ajenos: Raspberry Pi concede PID bajo su VID para productos con sus chips.', { code: 'tusb_desc_device_t const desc = {\n    .idVendor  = 0x2E8A,   // VID de Raspberry Pi\n    .idProduct = 0x000A,   // el de los ejemplos del SDK\n    // …clase, versión, número de configuraciones…\n};' }),
      ST('Tu teclado USB deja de responder cada cierto tiempo. Revisa el bucle.', ['El bucle hace sleep_ms(2000) para un parpadeo', 'Durante 2 s no se llama a tud_task()', 'El anfitrión pregunta y nadie contesta: el USB falla', 'Arreglo: parpadeo mirando el tiempo (sin sleep) y tud_task() en cada vuelta'], 'Nunca bloquees el bucle del USB'),
      { t: 'order', q: 'Ordena la enumeración USB.', items: ['Conectas el cable', 'El anfitrión reinicia el bus', 'Pide el descriptor de dispositivo (VID y PID)', 'Asigna una dirección', 'Lee la configuración y sus interfaces', 'Carga el controlador de cada clase'], e: 'Todo pasa en menos de un segundo.', c: 'rp_usbenum', h: 'Recuerda la exploración paso a paso.' },
      { t: 'match', q: 'Une cada clase USB con sus aparatos.', pairs: [['HID', 'Teclados, ratones, mandos'], ['CDC', 'Puerto serie virtual'], ['MSC', 'Unidad de almacenamiento'], ['MIDI', 'Instrumentos musicales']], c: 'rp_usb', h: 'HID = dispositivo de interfaz humana.' },
      Q('¿Por qué hay que llamar a tud_task() constantemente?', ['TinyUSB atiende los eventos del USB dentro de esa función: si no la llamas, el dispositivo deja de responder', 'Para ahorrar energía', 'Para encender el LED', 'No hace falta'], 'Nada de bucles bloqueantes largos en el mismo hilo.', { c: 'rp_tinyusb', h: 'Mira el dibujo del bucle.' }),
      Q('Tu Pico ya es un teclado con TinyUSB y además quieres printf por USB. ¿Qué necesitas?', ['Un dispositivo compuesto: HID y CDC en los mismos descriptores', 'Dos cables', 'Es imposible', 'Un segundo RP2040'], 'Un dispositivo USB puede tener varias interfaces.', { c: 'rp_usbenum', h: 'Un aparato, varias interfaces.' }),
      Q('¿Qué es el VID?', ['El identificador del fabricante, asignado por la organización USB', 'La versión del firmware', 'La velocidad', 'El número de serie'], 'El PID lo elige cada fabricante para sus productos.', { c: 'rp_usbenum', h: 'V de vendedor.' }),
      Q('¿Qué velocidad de USB tiene el RP2040?', ['Velocidad completa: 12 Mbit/s', 'Alta velocidad: 480 Mbit/s', 'USB 3: 5 Gbit/s', 'Solo baja velocidad: 1,5 Mbit/s'], 'Suficiente para HID, MIDI, CDC y almacenamiento modesto.', { c: 'rp_usb', h: 'Es USB 1.1 de velocidad completa.' }),
      Q('¿Qué ventaja tiene que un mando hecho con la Pico se presente como HID y no como puerto serie?', ['Funciona en cualquier sistema y juego sin instalar nada', 'Va más rápido', 'Consume menos', 'Ninguna'], 'Los juegos ya saben leer mandos HID.', { c: 'rp_usb', h: 'Clase estándar = controlador ya instalado.' }),
      I('<b>Resumen</b>\n· USB de 12 Mbit/s, dispositivo o anfitrión, con <b>TinyUSB</b>.\n· Enumeración: descriptor (<b>VID</b>/<b>PID</b>), dirección, configuración, controlador.\n· <b>tud_task()</b> en cada vuelta; clases estándar = sin controladores.', { svg: S.usbcls })
    ]),
    L('rp36', 'HID: teclado y ratón', 'code', ['rp_hid', 'rp_tinyusb', 'rp_usb'], [
      PQ('Tu macroteclado envía «C pulsada» al ordenador y nada más. ¿Qué crees que verá el PC?', ['Que la C sigue pulsada: «cccccc…»', 'Una sola c', 'Nada', 'Una C mayúscula'], 'Un informe HID describe el estado del teclado: hay que enviar también «nada pulsado».', 'rp_hid', 'Piensa en qué pasa si mantienes una tecla pulsada.'),
      EX('Construye el informe de un teclado: suma los bits de los modificadores y elige la tecla.', 'rp_hidv', P.hid(), [
        TK('ctrlc', 1, 1, 'Forma Ctrl + C', 'Modificadores 0x01 y la tecla C (0x06).', 'Ctrl vale 1; la C es el código 6.'),
        TK('cas', 1, 1, 'Ahora Ctrl + Alt + Supr', '1 + 4 = 0x05 y Supr (0x4C = 76).', 'Ctrl (1) + Alt (4) y la tecla 76.'),
        TK('empty', 1, 1, 'El informe de soltar', 'Todo a cero: sin él, el PC cree que sigues pulsando.', 'Modificadores 0 y ninguna tecla.')]),
      I('Un teclado HID envía <b>informes</b>: 1 byte de modificadores, 1 reservado y hasta <b>6 teclas</b> a la vez. Pulsar y soltar son dos informes.', { code: 'uint8_t teclas[6] = { HID_KEY_C, 0, 0, 0, 0, 0 };\nif (tud_hid_ready())\n    tud_hid_keyboard_report(REPORT_ID_KEYBOARD,\n                            KEYBOARD_MODIFIER_LEFTCTRL, teclas);\n// … después, el informe de soltar:\n// tud_hid_keyboard_report(REPORT_ID_KEYBOARD, 0, NULL);' }),
      I('Los códigos HID son <b>posiciones de tecla</b>, no letras. El sistema las traduce con su distribución: la misma posición da «-» en un teclado de EE. UU. y «\'» en uno español.', { svg: S.keypos }),
      I('El ratón estándar es <b>relativo</b>: cada informe mueve entre −127 y 127. Para movimientos grandes, varios informes.', { svg: S.mouse }),
      ST('Escribir «Hi» con informes HID.', ['H mayúscula: modificador Mayús (0x02) + la tecla H', 'Informe vacío: soltar', 'i minúscula: sin modificador + la tecla I', 'Informe vacío: soltar'], '4 informes: pulsar y soltar cada letra'),
      { t: 'bits', q: 'Byte de modificadores: bit 0 Ctrl izq., bit 1 Mayús izq., bit 2 Alt izq., bit 3 GUI izq. Forma Ctrl + Mayús.', n: 8, target: 3, e: '1 + 2 = 3.', c: 'rp_hid', h: 'Enciende los bits 0 y 1.' },
      Q('Ctrl + Alt + Supr. ¿Qué informe envías?', ['Modificadores Ctrl y Alt (0x05) y la tecla Supr en la lista', 'Tres informes, uno por tecla', 'Solo la tecla Supr', 'Modificador 0x07 y ninguna tecla'], 'Bit 0 (1) + bit 2 (4) = 5.', { c: 'rp_hid', h: 'Los modificadores van en su byte; Supr, en la lista de teclas.' }),
      Q('¿Qué hay que enviar después de este informe?', ['Un informe vacío para soltar las teclas', 'Nada', 'Un reinicio del USB', 'Otro igual'], 'Si no, el sistema cree que sigues pulsando.', { code: 'uint8_t teclas[6] = { HID_KEY_C, 0, 0, 0, 0, 0 };\ntud_hid_keyboard_report(REPORT_ID_KEYBOARD,\n                        KEYBOARD_MODIFIER_LEFTCTRL, teclas);', c: 'rp_hid', h: 'Pulsar y soltar son dos informes.' }),
      Q('Tu macro escribe «Hola-mundo», pero en el PC sale «Hola\'mundo». ¿Por qué?', ['HID envía posiciones de tecla y el sistema las traduce con su distribución (española frente a la de EE. UU.)', 'Por el cable', 'Siempre faltan modificadores', 'Un error de TinyUSB'], 'Hay que preparar las macros para la distribución del ordenador.', { c: 'rp_hid', h: 'Mira el dibujo de la tecla.' }),
      Nm('Quieres mover el puntero 500 unidades a la derecha con informes de 127 como máximo. ¿Cuántos informes, como mínimo?', 4, 'informes', '500 / 127 = 3,9 → 4.', { c: 'rp_hid', h: 'Divide y redondea hacia arriba.' }),
      Q('¿Por qué esperar a tud_hid_ready() antes de enviar?', ['El anfitrión recoge los informes cada cierto intervalo; hasta que no sale uno, no cabe otro', 'Para ahorrar batería', 'Para cifrar', 'No hace falta'], 'Si envías antes, el informe se pierde.', { c: 'rp_tinyusb', h: '¿Cuándo se lleva el anfitrión cada informe?' }),
      Q('Un aparato que se hace pasar por teclado puede…', ['Escribir órdenes en el ordenador sin permiso: prueba tus macros con cuidado y no conectes USB desconocidos', 'Nada peligroso', 'Solo mover el ratón', 'Leer tus contraseñas de la memoria'], 'Es un ataque real y conocido.', { c: 'rp_usb', h: 'El sistema acepta un teclado sin preguntar.' }),
      I('<b>Resumen</b>\n· Informe de teclado: modificadores (bits) + hasta 6 <b>posiciones</b> de tecla.\n· Cada pulsación necesita su informe de <b>soltar</b>; comprueba <b>tud_hid_ready()</b>.\n· Ratón relativo: −127 a 127 por informe.', { svg: S.keypos })
    ]),
    L('rp37', 'MIDI y CDC', 'wave', ['rp_midi', 'rp_usb', 'rp_adcgood', 'rp_bits'], [
      PQ('Un byte MIDI de estado lleva el tipo de mensaje y el canal. Note On es el tipo 9. ¿Cómo crees que se escribe Note On del canal 1?', ['0x90', '0x91', '0x19', '0x09'], 'Tipo en los 4 bits altos (9) y canal − 1 en los 4 bajos (0).', 'rp_midi', 'Los canales se numeran desde 0 dentro del byte.'),
      EX('Construye un mensaje MIDI: elige tipo, canal y datos.', 'rp_midiv', P.midi(), [
        TK('st', 146, 146, 'Forma Note On por el canal 3', 'Tipo 9 arriba, canal 3 − 1 = 2 abajo: 0x92.', 'Tipo 9 y canal 3.'),
        TK('st', 185, 185, 'Ahora Control Change por el canal 10', '0xB9: tipo 0xB (11) y canal 9.', 'Tipo 11 y canal 10.')]),
      I('Un mensaje MIDI: un <b>byte de estado</b> y uno o dos de <b>datos</b> de 7 bits. Por USB, la clase MIDI de TinyUSB los envía tal cual.', { code: 'uint8_t nota_on[3]  = { 0x90 | canal, 60, 100 };   // do central, velocidad 100\nuint8_t nota_off[3] = { 0x80 | canal, 60, 0 };\ntud_midi_stream_write(0, nota_on, 3);', more: 'Note On 0x9n · Note Off 0x8n · Control Change 0xBn · Pitch bend 0xEn (14 bits repartidos en dos bytes de datos). El bit alto distingue estado (1) y datos (0): si se pierde un byte, el receptor se resincroniza en el siguiente estado.\nEl MIDI clásico de 5 pines es una UART a 31 250 baudios (1 MHz / 32).' }),
      EX('Un potenciómetro quieto: el ADC tiembla unas cuentas. Ajusta el margen para no inundar el bus.', 'rp_hystv', P.hyst(), [
        TK('msgs', 0, 0, 'Con el mando quieto, deja de enviar mensajes', 'Un margen mayor que el temblor de pico a pico lo silencia.', 'Sube el margen hasta 2 × el ruido.'),
        TK('quiet20', 1, 1, 'Con un ADC más ruidoso (20 cuentas), vuelve a silenciarlo', 'Hacen falta unas 40 cuentas de margen: más ruido, más margen y menos resolución útil.', 'Ruido 20 y margen al máximo.')]),
      I('<b>CDC</b>: un puerto serie virtual por USB. Ideal para configurar el aparato desde el PC. El baudio que elijas en el monitor es simbólico: los datos van a velocidad USB.', { code: 'if (tud_cdc_available()) {\n    char buf[64];\n    uint32_t n = tud_cdc_read(buf, sizeof buf);\n    tud_cdc_write(buf, n);        // eco\n    tud_cdc_write_flush();\n}' }),
      ST('Pasa un potenciómetro (12 bits) a un valor de Control Change.', ['El ADC da 0–4095 (12 bits)', 'MIDI admite 0–127 (7 bits)', 'Desplaza 12 − 7 = 5 bits a la derecha: v >> 5', '4095 >> 5 = 127; 2048 >> 5 = 64'], 'valor = lectura >> 5'),
      { t: 'match', q: 'Une cada byte de estado.', pairs: [['0x90', 'Note On, canal 1'], ['0x80', 'Note Off, canal 1'], ['0xB0', 'Control Change, canal 1'], ['0xE0', 'Pitch bend, canal 1']], c: 'rp_midi', h: 'La cifra alta es el tipo.' },
      Q('Note On del do central (nota 60) con velocidad 100 por el canal 2. ¿Bytes?', ['0x91, 60, 100', '0x92, 60, 100', '0x90, 60, 100', '0x91, 100, 60'], 'Los canales 1–16 se escriben 0–15 en el byte.', { c: 'rp_midi', h: 'Canal 2 → 1 en el byte; primero la nota, luego la velocidad.' }),
      Q('¿Por qué los datos MIDI solo llegan hasta 127?', ['El bit alto distingue los bytes de estado (1) de los de datos (0)', 'Por ahorrar', 'Porque el USB es de 7 bits', 'Por el ADC'], 'Así un receptor se resincroniza aunque pierda un byte.', { c: 'rp_midi', h: '¿Qué bit queda reservado?' }),
      Nm('Pasas una lectura de 12 bits (0–4095) a un valor MIDI de 0–127. ¿Cuántos bits desplazas a la derecha?', 5, 'bits', '12 − 7 = 5.', { c: 'rp_bits', h: 'Bits que sobran.' }),
      Q('¿Qué evita la comparación con 24?', ['Que el ruido del ADC envíe mensajes constantes con el potenciómetro quieto', 'Que el valor pase de 127', 'Que se cuelgue el USB', 'Que el multiplexor se queme'], 'Es la histéresis.', { code: 'if (abs((int)v - (int)ultimo[i]) > 24) {\n    ultimo[i] = v;\n    // enviar el nuevo valor\n}', c: 'rp_adcgood', h: 'Recuerda la exploración del ruido.' }),
      Q('En un CDC por USB pones el monitor serie a 9600 en vez de 115 200. ¿Qué pasa?', ['Nada: en CDC el baudio es simbólico y los datos van a velocidad USB', 'Salen caracteres raros', 'No conecta', 'Va 12 veces más lento'], 'El programa puede leer el baudio elegido, pero no afecta a la transmisión.', { c: 'rp_usb', h: 'No hay una UART real de por medio.' }),
      Q('El MIDI clásico de 5 pines, en cambio, es una UART real. ¿A qué velocidad?', ['31 250 baudios', '9600', '115 200', '12 Mbit/s'], 'Un valor heredado de dividir 1 MHz entre 32.', { c: 'rp_midi', h: '1 MHz entre 32.' }),
      I('<b>Resumen</b>\n· MIDI: <b>estado</b> (tipo arriba, canal − 1 abajo) + datos de 7 bits.\n· Potenciómetros: <b>&gt;&gt; 5</b> y <b>histéresis</b> contra el ruido.\n· CDC: puerto serie virtual; su baudio es simbólico.', { ...tune('rp_midiv', P.midi({ tp: LST('Tipo (8 Off · 9 On · 11 CC · 14 bend)', 9, [8, 9, 11, 14]) })) })
    ]),
    L('rp38', 'Pico W: WiFi en MicroPython', 'wifi', ['rp_wifi', 'rp_radio', 'rp_netclient'], [
      PQ('Tu programa espera con while not wlan.isconnected(): pass y la red no existe. ¿Qué crees que pasa?', ['Se queda esperando para siempre', 'Da un error y sigue', 'Se conecta a otra red', 'Reinicia la placa'], 'Un programa robusto nunca espera sin límite.', 'rp_wifi', '¿Cuándo saldría de ese bucle?'),
      EX('Conectar la Pico W: prueba la red, la banda, la clave y el tiempo máximo de espera.', 'rp_wifiv', P.wifi(), [
        TK('ok', 1, 1, 'Conéctate', 'La radio de la W solo trabaja en 2,4 GHz.', 'Cambia la banda.'),
        TK('hung', 1, 1, 'Pon una clave mala y quita el límite de espera', 'isconnected() nunca será verdadero: el programa se queda colgado.', 'Clave 0 y espera 0.'),
        TK('recoverPw', 1, 1, 'Con la clave mala, que el programa siga vivo', 'Con un límite, se rinde, avisa y puede reintentar más tarde.', 'Pon un límite de espera.')]),
      I('El chip <b>CYW43439</b> da WiFi a 2,4 GHz y Bluetooth; su firmware va dentro del UF2 de MicroPython para la W. <b>network.WLAN(network.STA_IF)</b> se conecta a una red; siempre con <b>tiempo máximo</b>.', { code: "import network, time\nwlan = network.WLAN(network.STA_IF)\ndef conectar(espera_s=20):\n    wlan.active(True)\n    wlan.connect(SSID, CLAVE)\n    t = time.ticks_ms()\n    while not wlan.isconnected():\n        if time.ticks_diff(time.ticks_ms(), t) > espera_s * 1000:\n            return False          # se rinde\n        time.sleep_ms(250)\n    return True", more: 'wlan.status() explica qué pasa: STAT_GOT_IP (conectado), STAT_CONNECTING, STAT_WRONG_PASSWORD, STAT_NO_AP_FOUND. Con network.AP_IF, la Pico crea su propia red.\nGuarda la clave en un fichero aparte (por ejemplo secretos.py) y no lo publiques nunca.' }),
      I("<b>rp2.country('ES')</b> fija los canales y potencias de aquí (en Europa, del 1 al 13). La banda de 2,4 GHz es libre: sin licencia, con el módulo homologado. La radio es lo que más gasta: <b>wlan.active(False)</b> la apaga.", { svg: S.radio }),
      I('Como cliente: <b>requests</b> para HTTP y <b>ntptime</b> para la hora (en UTC). Cierra siempre cada respuesta.', { code: "import requests, ntptime\nr = requests.get('http://192.168.1.50/api')\ndatos = r.json()\nr.close()                # libera el socket y su memoria\nntptime.settime()        # reloj interno en UTC", more: 'HTTPS funciona, pero gasta bastante más RAM. Para MQTT existe umqtt.simple.' }),
      ST('ntptime pone las 06:30 UTC. ¿Qué hora es en Madrid y en Canarias, en enero y en julio?', ['Enero, horario de invierno: Península UTC + 1 → 07:30', 'Canarias en invierno: UTC + 0 → 06:30', 'Julio, horario de verano: Península UTC + 2 → 08:30', 'Canarias en verano: UTC + 1 → 07:30'], 'ntptime da UTC: la diferencia la sumas tú'),
      Q('¿Por qué se limita la espera a 20 s?', ['Para no quedarse colgado para siempre si la red no está', 'Porque la WiFi tarda siempre 20 s', 'Para ahorrar flash', 'Es obligatorio en España'], 'Un programa robusto nunca espera sin límite.', { code: "while not wlan.isconnected():\n    if time.ticks_diff(time.ticks_ms(), t) > espera_s * 1000:\n        return False\n    time.sleep_ms(250)", c: 'rp_wifi', h: 'Recuerda la segunda tarea de la exploración.' }),
      Q("¿Para qué sirve rp2.country('ES')?", ['Para usar los canales y potencias permitidos en España', 'Para traducir los mensajes', 'Para la hora local', 'Para el idioma de Thonny'], 'La normativa de radio cambia según el país.', { c: 'rp_radio', h: 'Tiene que ver con la radio, no con el idioma.' }),
      { t: 'match', q: 'Une cada estado de wlan.status() con su significado.', pairs: [['STAT_GOT_IP', 'Conectado y con IP'], ['STAT_WRONG_PASSWORD', 'Clave incorrecta'], ['STAT_NO_AP_FOUND', 'No encuentra la red'], ['STAT_CONNECTING', 'Conectando']], c: 'rp_wifi', h: 'AP = punto de acceso.' },
      Q('Tu red es solo de 5 GHz. ¿Se conecta la Pico W?', ['No: el CYW43439 solo trabaja en 2,4 GHz', 'Sí', 'Solo con antena externa', 'Solo de noche'], 'Activa la banda de 2,4 GHz en el router.', { c: 'rp_radio', h: 'Recuerda la primera tarea.' }),
      Q('Tras horas funcionando, la estación deja de responder aunque el código sigue. ¿Qué añades?', ['Una comprobación periódica de isconnected() que reconecte', 'Más RAM', 'Un sleep de una hora', 'Nada'], 'Los routers se reinician y las conexiones caen.', { c: 'rp_wifi', h: 'La red puede caerse en cualquier momento.' }),
      Q('¿Por qué r.close()?', ['Libera el socket y su memoria: sin cerrarlo, a la larga te quedas sin RAM', 'Para apagar la WiFi', 'Para borrar los datos', 'No hace nada'], 'Cada conexión abierta ocupa recursos.', { code: "import requests\nr = requests.get('http://192.168.1.50/api')\ndatos = r.json()\nr.close()", c: 'rp_netclient', h: '¿Qué pasa con la memoria de cada respuesta?' }),
      Q('ntptime.settime() pone el reloj de la Pico en…', ['Hora UTC: la de la España peninsular es UTC + 1 en invierno y UTC + 2 en verano', 'La hora de Madrid', 'La hora del router', 'Milisegundos desde 1970'], 'Suma tú la diferencia.', { c: 'rp_netclient', h: 'Mira el ejemplo resuelto.' }),
      I('<b>Resumen</b>\n· Conectar con <b>tiempo máximo</b> y vigilar <b>isconnected()</b>; status() explica el fallo.\n· Solo <b>2,4 GHz</b>; rp2.country(\'ES\'); apaga la radio si no la usas.\n· requests con <b>r.close()</b>; ntptime da <b>UTC</b>.', { svg: S.radio })
    ]),
    L('rp39', 'Un servidor web con asyncio', 'cloud', ['rp_net', 'rp_netsec'], [
      PQ('Tu Pico W sirve una página y el navegador pide también /favicon.ico, que no existe. Si tu servidor no responde nada, ¿qué crees que pasa?', ['El navegador se queda esperando y la conexión ocupa memoria', 'Nada', 'La página nunca carga', 'Se reinicia la Pico'], 'Responde siempre (aunque sea un 404) y cierra la conexión.', 'rp_net', 'El navegador espera una respuesta a cada petición.'),
      EX('Cambia la ruta y el método y mira la petición y la respuesta completas.', 'rp_httpv', P.http(), [
        TK('code', 404, 404, 'Pide una ruta que el servidor no tiene', '404 y cerrar: el navegador no se queda esperando.', 'Prueba /favicon.ico.'),
        TK('json', 1, 1, 'Pide los datos para otros programas', 'JSON con Content-Type: application/json.', 'La ruta /api con GET.'),
        TK('act', 1, 1, 'Enciende el LED de forma segura', 'POST: recargar la página o previsualizar un enlace no lo activa.', '/led con POST.')]),
      I('HTTP es texto. El navegador envía una petición: método, ruta y versión en la primera línea, cabeceras y una línea en blanco. El servidor responde: estado, cabeceras, línea en blanco y contenido.', { code: 'GET /led?on=1 HTTP/1.1\nHost: 192.168.1.40\nUser-Agent: Firefox\n(línea en blanco)\n\nHTTP/1.0 200 OK\nContent-Type: text/html\n(línea en blanco)\n<h1>Estación</h1>' }),
      I('<b>asyncio.start_server</b> escucha en el puerto 80 y atiende cada conexión en una tarea; mientras, tus otras tareas siguen.', { code: "async def atender(lector, escritor):\n    peticion = await lector.readline()       # b'GET / HTTP/1.1\\r\\n'\n    while (await lector.readline()) not in (b'\\r\\n', b''):\n        pass                                 # salta las cabeceras\n    escritor.write(b'HTTP/1.0 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n')\n    escritor.write(b'<h1>Hola</h1>')\n    await escritor.drain()\n    escritor.close()\n    await escritor.wait_closed()\n\nasyncio.create_task(asyncio.start_server(atender, '0.0.0.0', 80))" }),
      I('Una ruta <b>/api</b> en JSON deja que otros programas usen tus datos; tu propia página puede pedirlos con fetch(\'/api\') cada pocos segundos. Las acciones, con <b>POST</b>.', { code: "import json\ncuerpo = json.dumps({'t': 21.5, 'h': 48})\nescritor.write(b'HTTP/1.0 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n')\nescritor.write(cuerpo.encode())" }),
      I('Seguridad: tu servidor no tiene cifrado ni contraseña. Úsalo <b>solo en tu red local</b>, no abras puertos del router y no ejecutes nada que llegue en la URL sin validarlo.', { svg: S.netsec, more: 'Para controlar algo desde fuera de casa: una VPN hacia tu red o un servicio con autenticación y cifrado. Y el aparato debe protegerse solo: tiempo máximo de encendido, termostato propio. Las cargas de la red eléctrica, siempre con módulos certificados.' }),
      ST('Escribe la respuesta a GET /api.', ['Línea de estado: HTTP/1.0 200 OK', 'Cabecera: Content-Type: application/json', 'Una línea en blanco', 'Cuerpo: json.dumps({"t": 21.5}) y cerrar la conexión'], 'estado + cabeceras + línea en blanco + JSON'),
      Q('¿Qué ruta pide el navegador?', ['/led?on=1', 'Host', 'HTTP/1.1', '192.168.1.40'], 'La primera línea: método, ruta y versión.', { code: 'GET /led?on=1 HTTP/1.1\nHost: 192.168.1.40\nUser-Agent: Firefox\n', c: 'rp_net', h: 'La ruta va entre el método y la versión.' }),
      Q('¿Por qué se leen líneas hasta la vacía?', ['Para saltar las cabeceras de la petición antes de responder', 'Para leer el cuerpo de la respuesta', 'Para cerrar la WiFi', 'Por seguridad'], 'La línea vacía marca el final de las cabeceras.', { code: "peticion = await lector.readline()\nwhile (await lector.readline()) not in (b'\\r\\n', b''):\n    pass", c: 'rp_net', h: '¿Qué separa las cabeceras del resto?' }),
      Q('El navegador pide /favicon.ico además de /. ¿Qué haces?', ['Responder 404 a lo que no conoces', 'Dejar la conexión abierta sin responder', 'Reiniciar la Pico', 'Enviar la página principal'], 'Responder siempre y cerrar la conexión.', { c: 'rp_net', h: 'Recuerda la primera tarea.' }),
      Q('¿Qué ventaja tiene servir /api en JSON además de la página HTML?', ['Otros programas, o tu propia página con fetch, usan los datos sin leer HTML', 'La WiFi va más rápido', 'Ocupa siempre menos flash', 'Es obligatorio'], 'Separas datos y presentación.', { c: 'rp_net', h: '¿Quién más podría querer los datos?' }),
      Q('Quieres encender una estufa desde la web de la Pico W cuando estás fuera. ¿Abres el puerto 80 del router?', ['No: usa una VPN o un servicio con autenticación y cifrado, y protecciones en el propio aparato', 'Sí, sin problema', 'Sí, si usas el puerto 8080', 'Sí, si la página es bonita'], 'Hay robots escaneando puertos sin parar.', { c: 'rp_netsec', h: 'Mira el dibujo de la red.' }),
      Q('Para acciones que cambian algo (encender un relé), mejor…', ['POST en vez de GET, para que recargar o previsualizar un enlace no lo active', 'GET siempre', '/favicon.ico', 'No responder'], 'GET debería solo consultar.', { c: 'rp_net', h: 'Recuerda la tercera tarea.' }),
      { t: 'order', q: 'Ordena una respuesta HTTP.', items: ['Línea de estado: versión y 200 OK', 'Cabeceras, como Content-Type', 'Una línea en blanco', 'El cuerpo: HTML o JSON', 'Cerrar la conexión'], e: 'En la versión antigua de HTTP que usamos, cerrar la conexión marca el final del cuerpo.', c: 'rp_net', h: 'Igual que la petición: primera línea, cabeceras, línea en blanco.' },
      I('<b>Resumen</b>\n· HTTP es texto: primera línea, cabeceras, <b>línea en blanco</b> y cuerpo.\n· <b>start_server</b> con asyncio; responde siempre (404 si no existe) y cierra.\n· JSON en /api, acciones con <b>POST</b>, y nada abierto a Internet.', { svg: S.netsec })
    ]),
    L('rp40', 'Bluetooth LE en la Pico W', 'antenna', ['rp_ble', 'rp_struct', 'rp_radio'], [
      PQ('Quieres que el móvil reciba la temperatura cada vez que cambie, sin estar preguntando. ¿Cómo crees que se hace en BLE?', ['El móvil se suscribe y la Pico le notifica cada cambio', 'El móvil la lee cada segundo', 'Por WiFi', 'No se puede'], 'Notificaciones: el periférico avisa al central suscrito.', 'rp_ble', 'Mejor que preguntar sin parar.'),
      I('En <b>Bluetooth LE</b>, un <b>periférico</b> (tu Pico) se anuncia y un <b>central</b> (el móvil) se conecta. Los datos van en <b>servicios</b> que agrupan <b>características</b>: valores que se leen, se escriben o se notifican.', { svg: S.ble, more: 'Cada servicio y característica tiene un UUID: de 16 bits si es estándar (como 0x181A, sensores de entorno, o 0x2A6E, temperatura en centésimas de grado) o de 128 bits si es tuyo.' }),
      I('En MicroPython, la biblioteca <b>aioble</b> (basada en asyncio) lo hace cómodo. En C, el SDK trae la pila BTstack.', { code: "import aioble, bluetooth, struct, asyncio\nENTORNO = bluetooth.UUID(0x181A)\nTEMP = bluetooth.UUID(0x2A6E)\nserv = aioble.Service(ENTORNO)\ntemp = aioble.Characteristic(serv, TEMP, read=True, notify=True)\naioble.register_services(serv)\n\nasync def medir():\n    while True:\n        t = 23.57\n        temp.write(struct.pack('<h', round(t * 100)), send_update=True)\n        await asyncio.sleep(2)" }),
      EX('Una temperatura dentro de dos bytes: × 100, entero de 16 bits con signo y, en BLE, el byte bajo primero.', 'rp_blev', P.ble(), [
        TK('v', 2350, 2350, 'Codifica 23,5 °C', '23,5 × 100 = 2350 → 0x092E: se envían 0x2E y 0x09.', 'Mueve hasta 23,5.'),
        TK('neg', 1, 1, 'Prueba una temperatura bajo cero y mira los bytes', 'Complemento a dos: −5,00 °C = −500 = 0xFE0C → se envían 0x0C y 0xFE.', 'Baja de 0 °C.')]),
      I('El anuncio es <b>público</b>: lo ve cualquiera cerca. Nada sensible sin emparejamiento y cifrado. Y para la batería, anunciarse de vez en cuando gasta mucho menos que estar siempre conectado.', { svg: S.adv }),
      ST('Codifica −3,25 °C para la característica 0x2A6E.', ['× 100 → −325 centésimas', 'Entero de 16 bits con signo: 65 536 − 325 = 65 211 = 0xFEBB', "En BLE va primero el byte bajo: struct.pack('<h', −325)", 'Bytes enviados: 0xBB y 0xFE'], 'Bytes BB FE'),
      { t: 'match', q: 'Une cada término con su significado.', pairs: [['Periférico', 'Se anuncia y acepta conexiones'], ['Central', 'Escanea y se conecta (el móvil)'], ['Servicio', 'Agrupa características'], ['Característica', 'Un valor que se lee, escribe o notifica']], c: 'rp_ble', h: 'La Pico es el periférico.' },
      Q('Tu sensor manda la temperatura cada vez que cambia, sin que el móvil pregunte. ¿Qué usa?', ['Notificaciones de una característica', 'Escrituras', 'Solo anuncios, sin conexión', 'La WiFi'], 'El central se suscribe y recibe los cambios.', { c: 'rp_ble', h: 'El periférico avisa.' }),
      Nm('La característica 0x2A6E usa centésimas de grado en un entero de 16 bits. ¿Qué entero envías para 23,57 °C?', 2357, '', '23,57 × 100 = 2357.', { c: 'rp_struct', h: 'Multiplica por 100.' }),
      Q('¿Qué rango cubre esa característica (entero de 16 bits con signo, en centésimas)?', ['De −327,68 a 327,67 °C', 'De 0 a 655,35 °C', 'De −128 a 127 °C', 'Sin límite'], '−32 768 a 32 767 centésimas.', { c: 'rp_struct', h: '16 bits con signo: de −32 768 a 32 767.' }),
      Q('Para que el móvil encuentre tu Pico W, esta debe…', ['Anunciarse con su nombre o sus servicios', 'Conectarse a la WiFi', 'Escanear', 'Estar en modo BOOTSEL'], 'Sin anuncio, nadie sabe que existe.', { c: 'rp_ble', h: '¿Qué hace el periférico al principio?' }),
      Q('¿Puede la Pico W usar WiFi y BLE a la vez?', ['Sí: comparten el CYW43439 y su antena, repartiéndose el tiempo de radio', 'No, nunca', 'Solo la Pico 2 W', 'Solo con dos antenas'], 'Cuanto más tráfico de una, menos rendimiento de la otra.', { c: 'rp_radio', h: 'Una sola radio para las dos cosas.' }),
      Q('¿Necesitas licencia para usar BLE en España?', ['No: usa la banda libre de 2,4 GHz, con límites de potencia que el módulo ya cumple', 'Sí, de radioaficionado', 'Solo a más de 10 m', 'Solo en exteriores'], 'Si modificas antenas o potencias, el equipo deja de estar homologado.', { c: 'rp_radio', h: 'Es la misma banda que la WiFi.' }),
      I('<b>Resumen</b>\n· Periférico (Pico) se anuncia; central (móvil) se conecta.\n· Servicios → características: leer, escribir o <b>notificar</b>.\n· Valores en bytes con <b>struct</b> (en BLE, &lt;: el bajo primero).', { svg: S.ble })
    ]),
    PRJ('rp-p12', 'Proyecto: macroteclado USB', 'rp_macro'),
    PRJ('rp-p13', 'Proyecto: controlador MIDI', 'rp_midi'),
    PRJ('rp-p14', 'Proyecto: estación meteorológica Pico W', 'rp_meteo')
  ];

  const M8 = [
    L('rp41', 'Consumo real y modos de sueño', 'sleep', ['rp_lowpower', 'rp_sleep'], [
      PQ('Mides el consumo de tu Pico con el multímetro mientras sigue enchufada al USB. ¿Crees que mides lo que gasta?', ['No: el USB la alimenta por su lado y el multímetro no lo ve', 'Sí, exactamente', 'Sí, pero el doble', 'Solo si es la W'], 'Mide en serie con la batería que alimenta VSYS, con el USB desconectado.', 'rp_lowpower', '¿Por dónde entra la corriente si el USB está conectado?'),
      I('En una Pico consumen el RP2040, la <b>flash</b>, el <b>regulador</b> y todo lo que le conectes. Antes de optimizar, <b>mide</b>: multímetro en serie con la alimentación de VSYS.', { svg: S.meter }),
      EX('Prueba los modos de sueño y la radio. Mira el consumo y si el aparato podrá despertar.', 'rp_sleepv', P.sleep(), [
        TK('I', 0, 2, 'Baja el consumo por debajo de 2 mA', 'Radio apagada y a dormir: el consumo cae de decenas de mA a uno o dos.', 'Apaga la radio y elige un modo de sueño.'),
        TK('nowake', 1, 1, 'En dormant, elige una forma de despertar que nunca llegará', 'Sin osciladores no hay temporizador que cuente.', 'Dormant con temporizador.'),
        TK('dormOk', 1, 1, 'Arréglalo', 'En dormant solo despierta un flanco en un GPIO (o un reloj externo).', 'Despierta con un flanco.')]),
      I('En MicroPython: <b>machine.lightsleep(ms)</b> para la CPU y casi todos los relojes y sigue en la línea siguiente; <b>machine.deepsleep(ms)</b>, al despertar, empieza desde el principio.', { code: "import machine\nmachine.lightsleep(5000)   # sigue aquí, con sus variables\n# …\nmachine.deepsleep(60000)   # al despertar: como un reinicio\n# guarda en un fichero lo que debas recordar" }),
      I('En C (con la biblioteca de sueño de pico-extras) existe <b>dormant</b>: se paran hasta los osciladores. Solo un flanco en un GPIO lo despierta, y luego hay que volver a poner los relojes.', { svg: S.dormant }),
      I('El regulador de la Pico trabaja por defecto en modo ahorro, eficiente con poca carga; con GP23 a 1 pasa a PWM (menos rizado, más consumo en reposo). En la Pico W la <b>radio</b> manda: conecta, envía y apágala.', { code: "from machine import Pin\nimport network\nPin(23, Pin.OUT).value(0)        # Pico: regulador en ahorro (por defecto)\nwlan = network.WLAN(network.STA_IF)\n# … conectar, enviar …\nwlan.active(False)               # Pico W: radio apagada", more: 'En la Pico W, el control del modo del regulador no está en GP23: pasa por la radio.' }),
      ST('Plan de bajo consumo para un nodo que mide cada 10 minutos.', ['Mide el consumo de partida con el USB desconectado', 'Quita lo que sobra: LEDs y sensores encendidos entre medidas', 'Duerme entre medidas: lightsleep si debes recordar variables; deepsleep si no', 'La radio: enciende, envía y apaga. Y vuelve a medir'], 'Medir → quitar → dormir → acortar → medir'),
      Q('Para medir el consumo de la Pico, el multímetro va en serie con…', ['La alimentación de VSYS, con el USB desconectado', 'El pin GP25', 'La línea de datos D+', 'La pata 3V3_EN'], 'Si el USB está conectado, alimenta él y no mides lo que crees.', { c: 'rp_lowpower', h: 'Mira el dibujo del multímetro.' }),
      Q('Tras machine.deepsleep(60000), ¿dónde continúa el programa?', ['Desde el principio, como tras un reinicio: las variables se pierden', 'En la línea siguiente', 'En el REPL', 'En el núcleo 1'], 'Guarda en un fichero lo que debas recordar.', { c: 'rp_sleep', h: 'deep = como apagar y encender.' }),
      Q('En dormant, ¿por qué no te despierta un repeating_timer?', ['Porque el temporizador depende de un reloj que se ha parado', 'Porque está desactivado por software', 'Sí te despierta', 'Porque no hay RAM'], 'Usa un flanco externo: un temporizador de bajo consumo o un sensor.', { c: 'rp_sleep', h: 'Recuerda la segunda tarea.' }),
      Q('Para el mínimo consumo dormido en una Pico, GP23 debe estar…', ['En bajo: modo de ahorro, el de serie', 'En alto', 'Como entrada flotante', 'Da igual'], 'En alto solo cuando necesites un ADC más limpio.', { c: 'rp_lowpower', h: 'El modo PWM gasta más en reposo.' }),
      Q('Tu nodo Pico W envía un dato cada 15 min y deja la WiFi encendida. ¿Mejora principal?', ['Apagar la radio entre envíos y dormir', 'Subir el reloj', 'Usar un cable más corto', 'Encender el LED'], 'La radio encendida pesa más que todo lo demás.', { c: 'rp_lowpower', h: 'Mira la barra de consumo con la radio.' }),
      { t: 'order', q: 'Ordena una estrategia de bajo consumo.', items: ['Mide el consumo de partida', 'Quita lo que sobra (LEDs, sensores siempre encendidos)', 'Duerme entre medidas', 'Acorta el tiempo despierto', 'Corta la alimentación entre ciclos si se puede', 'Mide de nuevo y compara'], e: 'Sin medidas, optimizas a ciegas.', c: 'rp_lowpower', h: 'Empieza y termina midiendo.' },
      Q('Tras machine.lightsleep(5000), ¿qué pasa con tus variables?', ['Siguen ahí: el programa continúa en la línea siguiente', 'Se pierden', 'Se guardan solas en la flash', 'Vuelven a cero'], 'Solo deepsleep reinicia el programa.', { c: 'rp_sleep', h: 'light = sueño ligero.' }),
      I('<b>Resumen</b>\n· Mide en serie con VSYS y sin USB.\n· <b>lightsleep</b> sigue donde estaba; <b>deepsleep</b> reinicia; <b>dormant</b> solo despierta con un flanco.\n· La radio y los periféricos encendidos son los grandes consumidores.', { svg: S.dormant })
    ]),
    L('rp42', 'Calcular la autonomía', 'bat', ['rp_avg', 'rp_power'], [
      PQ('Un nodo gasta 20 mA durante 1 s cada minuto y casi nada el resto. ¿A qué crees que se parece más su consumo medio?', ['A unos 0,3 mA', 'A unos 20 mA', 'A unos 10 mA', 'A cero'], '20 mA × 1 s / 60 s ≈ 0,33 mA: lo que pesa es el tiempo, no el pico.', 'rp_avg', 'Reparte esos 20 mA a lo largo del minuto.'),
      EX('Un nodo que despierta, trabaja y duerme. Cambia cada parte y mira la media y los días con 2000 mAh.', 'rp_avgv', P.avg(), [
        TK('days', 365, 1e9, 'Consigue más de un año con 2000 mAh', 'Despierto poco y con periodos largos: la media baja de 0,23 mA.', 'Alarga el periodo y acorta el tiempo despierto.'),
        TK('days', 1826, 1e9, 'Ahora pasa de 5 años', 'Con el periodo largo, manda el consumo dormido: bajarlo de 0,1 a 0,01 mA es lo que da los años.', 'Baja el consumo dormido.')]),
      I('Si el aparato alterna estados, su consumo medio es la <b>media ponderada por el tiempo</b>. Y la autonomía ideal: capacidad / consumo medio.', { svg: S.avg }),
      I('La capacidad real depende de la química, la temperatura y la corriente. Gracias al buck-boost, la Pico aprovecha casi todo el rango de pilas y baterías.', { svg: S.batt, more: 'Alcalinas: pierden tensión poco a poco. LiFePO4: unos 3,2 V muy estables. Li-ion: 3,7 V nominales y hasta 4,2 cargada. Todas se autodescargan algo con el tiempo, y el frío reduce la capacidad.' }),
      ST('25 mA durante 0,5 s cada 5 minutos y 0,8 mA dormido, con 2000 mAh. ¿Cuántos días?', ['Despierto: 25 × 0,5 / 300 = 0,0417 mA', 'Dormido: 0,8 × 299,5 / 300 = 0,799 mA', 'Media: 0,840 mA', '2000 / 0,840 = 2381 h ≈ 99 días'], '≈ 99 días (y aquí manda el consumo dormido)'),
      G('rp_avgI'), G('rp_avgI'), G('rp_avgI'),
      Q('¿Por qué el regulador buck-boost de la Pico aprovecha bien las pilas?', ['Funciona con VSYS de 1,8 a 5,5 V: sigue dando 3,3 V cuando las pilas bajan', 'Porque recarga las pilas', 'Porque no consume nada', 'Porque sube a 5 V'], 'Con un regulador lineal tendrías que tirar las pilas mucho antes.', { c: 'rp_power', h: 'Mira el rango de VSYS en el dibujo.' }),
      Q('El nodo consume 20 mA durante 1 ms cada segundo y 10 µA el resto. ¿Qué domina la media?', ['El tiempo despierto: aporta 20 µA de media frente a 10 µA', 'El tiempo dormido', 'Los dos igual', 'Ninguno'], '20 mA × 0,001 = 20 µA de media.', { c: 'rp_avg', h: 'Calcula la aportación de cada parte.' }),
      Nm('Con 30 µA de media y 2000 mAh, ¿cuántos años duraría en el caso ideal?', 7.6, 'años', '2000 / 0,03 = 66 667 h ≈ 7,6 años.', { tol: 0.2, c: 'rp_avg', h: 'Pasa los µA a mA; luego horas y años (8760 h por año).' }),
      Q('¿Por qué en la práctica durará menos?', ['Autodescarga, temperatura y picos que hacen caer la tensión', 'Porque las pilas no se gastan', 'Porque la Pico se acelera sola', 'Por tener la WiFi apagada'], 'Los años calculados son un techo, no una promesa.', { c: 'rp_avg', h: 'La batería real no es ideal.' }),
      Q('Duplicas el intervalo entre medidas (de 1 a 2 min). Si el consumo dormido es despreciable, la autonomía…', ['Casi se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'La energía por medida es la misma; haces la mitad de medidas.', { c: 'rp_avg', h: 'Si solo gasta al despertar, ¿cuántas veces despierta ahora?' }),
      I('<b>Resumen</b>\n· <b>I media = (Ia·ta + Id·td) / periodo</b>; autonomía = mAh / mA.\n· Mira qué término manda: despierto o dormido.\n· El resultado es un techo: autodescarga, frío y picos lo recortan.', { svg: S.avg })
    ]),
    L('rp43', 'Tu placa con RP2040: alimentación, reloj y flash', 'pcb', ['rp_hw', 'rp_crystal', 'rp_hwflash', 'rp_layout'], [
      PQ('El núcleo del RP2040 funciona a 1,1 V. ¿Crees que tu placa necesita un regulador aparte para esa tensión?', ['No: el RP2040 lleva uno dentro; solo le das 3,3 V y sus condensadores', 'Sí, siempre', 'Sí, un regulador lineal de 1,1 V', 'No: el núcleo funciona a 3,3 V'], 'El regulador del núcleo va dentro del chip: de VREG_VIN a VREG_VOUT, y de ahí a DVDD.', 'rp_hw', 'Mira qué pines tiene el chip para eso.'),
      I('Para tu propia placa, sigue la guía oficial de diseño de hardware. Lo mínimo: regulador de 3,3 V, desacoplos, cristal de 12 MHz, flash QSPI, USB, botones de BOOTSEL y RUN y un conector SWD.', { svg: S.hw }),
      I('<b>IOVDD</b>, <b>USB_VDD</b> y <b>ADC_AVDD</b> van a 3,3 V. <b>VREG_VIN</b> recibe 3,3 V y <b>VREG_VOUT</b> saca 1,1 V hacia <b>DVDD</b>, con 1 µF a la entrada y a la salida y 100 nF por cada pata.', { svg: S.vreg }),
      EX('El cristal necesita condensadores de carga: los dos quedan en serie y se suman los parásitos.', 'rp_xtalv', P.xtal(), [
        TK('ok', 1, 1, 'Elige los condensadores para que el cristal vea su carga', 'C = 2 × (12 − 4) = 16 → 15 pF da 11,5 pF.', 'Prueba con 15 pF.'),
        TK('ok18', 1, 1, 'Ahora un cristal de 18 pF', 'C = 2 × (18 − 4) = 28 → 27 pF da 17,5 pF.', 'CL = 18 y busca el doble de (18 − 4).')]),
      I('El cristal de 12 MHz lleva una resistencia de 1 kΩ en serie en XOUT para no excitarlo de más, y va pegado al chip, con masa debajo.', { svg: S.xtalr }),
      I('La <b>flash QSPI</b> (hasta 16 MB) va pegada a sus patas; elige una compatible con el arranque, como la familia W25Q. El <b>BOOTSEL</b> une el CS de la flash con masa a través de 1 kΩ.', { svg: S.bootsel }),
      ST('Un cristal pide CL = 12 pF. Calcula sus condensadores de carga.', ['Parásitos de pistas y patas: unos 3–5 pF; supón 4', 'CL = C / 2 + Cp → C = 2 × (CL − Cp)', '2 × (12 − 4) = 16 pF', 'El valor normalizado más cercano: 15 pF'], '15 pF'),
      { t: 'match', q: 'Une cada alimentación con su papel.', pairs: [['IOVDD', 'Alimentación de los GPIO (3,3 V)'], ['DVDD', 'Núcleo digital (1,1 V)'], ['VREG_VOUT', 'Salida del regulador interno'], ['ADC_AVDD', 'Alimentación del ADC']], c: 'rp_hw', h: 'IO = entradas y salidas; D = digital.' },
      Q('¿Qué valor de desacoplo pones junto a cada pata de alimentación del RP2040?', ['100 nF', '100 µF', '1 pF', 'Ninguno'], 'Uno por pata, lo más cerca posible.', { c: 'rp_hw', h: 'El valor típico de desacoplo que viste en el curso base.' }),
      Nm('Cristal con CL = 10 pF y unos 3 pF parásitos. ¿Condensadores de carga, en pF?', 14, 'pF', '2 × (10 − 3) = 14 pF → el normalizado más cercano, 15 pF.', { tol: 0.5, c: 'rp_crystal', h: 'C = 2 × (CL − parásitos).' }),
      Q('¿Por qué el BOOTSEL lleva 1 kΩ en serie?', ['Para no cortocircuitar el CS cuando el chip lo excita mientras pulsas', 'Para limitar la corriente de un LED', 'Para el antirrebote', 'Para subir la tensión'], 'La resistencia basta para que la ROM lea un nivel bajo al arrancar.', { c: 'rp_hwflash', h: '¿Qué pasa si el chip pone el CS a 1 y tú lo unes a masa?' }),
      Q('Quieres 8 MB de flash para guardar sonidos. ¿Se puede con un RP2040?', ['Sí: admite hasta 16 MB de flash QSPI', 'No: máximo 2 MB', 'Solo con un RP2350', 'Solo con una tarjeta SD'], 'La Pico trae 2 MB, pero el chip admite más.', { c: 'rp_hwflash', h: 'La Pico no usa el máximo.' }),
      Q('El cristal de tu placa está a 3 cm del chip, con pistas que cruzan otras señales. ¿Qué esperas?', ['Arranques inestables o un USB que falla: ponlo pegado y con masa debajo', 'Nada', 'Más velocidad', 'Menos consumo'], 'Las pistas largas del cristal recogen ruido y añaden capacidad.', { c: 'rp_layout', h: 'El cristal es de lo más delicado de la placa.' }),
      I('<b>Resumen</b>\n· 3,3 V a IOVDD, USB_VDD y ADC_AVDD; el 1,1 V del núcleo lo hace el chip (VREG).\n· Cristal: <b>C = 2 × (CL − Cp)</b>, 1 kΩ en XOUT, pegado al chip.\n· Flash QSPI compatible (hasta 16 MB) y BOOTSEL con 1 kΩ.', { svg: S.hw })
    ]),
    L('rp44', 'Tu placa: USB, rutado y fabricación', 'pcb', ['rp_bringup', 'rp_hw', 'rp_layout', 'rp_product'], [
      PQ('Tu placa recién soldada no hace nada al enchufarla. ¿Por dónde crees que conviene empezar?', ['Midiendo las tensiones con una fuente limitada en corriente', 'Grabando otro programa', 'Cambiando el chip', 'Rehaciendo la placa'], 'De abajo arriba: tensiones, luego modo BOOTSEL, luego flash.', 'rp_bringup', 'Sin alimentación correcta, nada más importa.'),
      I('<b>USB</b>: D+ y D− con 27 Ω en serie cerca del chip, juntas y paralelas. Con conector <b>USB-C</b>, CC1 y CC2 llevan 5,1 kΩ a masa cada una: así un cargador USB-C sabe que debe dar 5 V.', { svg: S.usbc }),
      I('Rutado: dos capas bastan. Plano de masa continuo, desacoplos pegados, pistas QSPI cortas, nada rápido bajo el cristal y vías de masa en el pad central del chip.', { svg: S.layout }),
      EX('Esconde un fallo y sigue la puesta en marcha: cada paso descarta una parte.', 'rp_bringv', P.bring(), [
        TK('sym', 2, 2, 'Busca un fallo con el que SÍ aparece RPI-RP2 pero el programa no arranca', 'La flash: el modo BOOTSEL vive en la ROM y no la necesita.', 'El último fallo de la lista.'),
        TK('symGood', 1, 1, 'Ahora uno con 3,3 V y 1,1 V correctos pero sin RPI-RP2', 'El cristal o las líneas USB: lo siguiente que hay que mirar.', 'Prueba los fallos 3 y 4.')]),
      I('Si diseñas con el <b>RP2350</b>: su regulador del núcleo es <b>conmutado</b> y necesita una bobina con un rutado cuidadoso. Hay versiones de 60 y 80 patas, y trae memoria OTP y arranque seguro.', { svg: S.reg2350 }),
      ST('Hay 3,3 V y 1,1 V, aparece RPI-RP2, grabas el UF2 y no arranca. ¿Qué revisas?', ['Las tensiones están bien: regulador y VREG correctos', 'Aparece RPI-RP2: ROM, cristal y USB funcionan', 'Lo único que el modo BOOTSEL no usa es la flash', 'Revisa las soldaduras de la flash, las pistas QSPI y que sea compatible'], 'La flash'),
      Q('¿Qué pasa si olvidas las 5,1 kΩ en CC1 y CC2 de un USB-C?', ['Un cargador o un cable C a C no da 5 V: la placa no enciende', 'Nada', 'El USB va más rápido', 'Se queman las de 27 Ω'], 'Con un cable A a C sí funcionaría, lo que despista mucho.', { c: 'rp_hw', h: 'Mira el dibujo del USB-C.' }),
      { t: 'order', q: 'Ordena la colocación de componentes.', items: ['RP2040 y las vías de su pad central', 'Flash junto a las patas QSPI', 'Cristal junto a XIN y XOUT', 'Desacoplos pegados a cada pata', 'USB con sus 27 Ω', 'Regulador y conectores en los bordes'], e: 'Primero lo crítico; los conectores, donde los quiera el usuario.', c: 'rp_layout', h: 'Del centro hacia fuera.' },
      Q('Tu placa aparece como RPI-RP2 pero tras grabar el UF2 no arranca el programa. Sospecha principal:', ['La flash, sus pistas QSPI o una flash no compatible', 'El cristal', 'El USB', 'El regulador de 1,1 V'], 'El modo BOOTSEL no necesita la flash para aparecer.', { c: 'rp_bringup', h: 'Recuerda la primera tarea.' }),
      Q('La placa no aparece ni como RPI-RP2. ¿Qué miras primero?', ['Las tensiones (3,3 y 1,1 V), el cristal y las líneas USB', 'El programa', 'La WiFi', 'El ADC'], 'Sin esas tres cosas, la ROM no puede hablar por USB.', { c: 'rp_bringup', h: 'Lo que necesita la ROM para el modo USB.' }),
      Q('¿Qué componente nuevo exige el RP2350 frente al RP2040 en tu esquema?', ['Una bobina para su regulador conmutado interno', 'Un cristal de 48 MHz', 'Una flash interna', 'Un segundo conector USB'], 'Sigue al pie de la letra el diseño de referencia.', { c: 'rp_hw', h: 'Mira el dibujo del RP2350.' }),
      Q('Para convertir tu placa en un producto, ¿qué más debes considerar?', ['Marcado CE y compatibilidad electromagnética, VID/PID propios y protección de la alimentación', 'Nada más', 'Solo el color de la placa', 'Solo el precio'], 'Un prototipo que funciona no es todavía un producto vendible.', { c: 'rp_product', h: 'Normas, identificadores y protecciones.' }),
      Q('¿Qué pones en las líneas USB contra descargas electrostáticas?', ['Diodos TVS', 'Un condensador de 1000 µF', 'Un fusible de 10 A', 'Nada'], 'Absorben los picos antes de que lleguen al chip.', { c: 'rp_product', h: 'Viste estos diodos de protección en el curso base.' }),
      I('<b>Resumen</b>\n· USB: 27 Ω en D+ y D−; USB-C con 5,1 kΩ en CC1 y CC2.\n· Puesta en marcha: tensiones → <b>RPI-RP2</b> → UF2; cada paso descarta una parte.\n· Producto: CE, VID/PID y protecciones (TVS, fusible, polaridad).', { svg: S.product })
    ]),
    PRJ('rp-p15', 'Proyecto: termómetro a pilas de larga duración', 'rp_node'),
    PRJ('rp-p16', 'Proyecto: tu propia placa con RP2040', 'rp_ownboard'),
    PRJ('rp-p17', 'Proyecto final: consola retro VGA', 'rp_console')
  ];

  /* ===================== EXÁMENES DE NIVEL (bancos propios de cada módulo) ===================== */
  const XQ = (l, c, q, o, e, h, x = {}) => Q(q, o, e, { c, h, l, ...x });
  const XN = (l, c, q, a, u, e, h, x = {}) => Nm(q, a, u, e, { c, h, l, ...x });
  const XO = (l, c, q, items, e, h) => ({ t: 'order', q, items, e, c, h, l });
  const XM = (l, c, q, pairs, e, h) => ({ t: 'match', q, pairs, e, c, h, l });
  const XB = (l, c, q, target, e, h) => ({ t: 'bits', q, n: 8, target, e, c, h, l });

  const X1 = [
    XQ('rp1', 'rp_board', 'Un compañero dice que la Pico «es como una Raspberry Pi pequeña, con Linux». ¿Qué le corriges?', ['Es un microcontrolador: no hay sistema operativo y solo corre tu programa', 'Nada: lleva un Linux reducido', 'Que lleva Windows IoT', 'Que necesita un ordenador conectado para funcionar'], 'La Pico es como la Uno: un microcontrolador. Las Raspberry Pi «grandes» son ordenadores con Linux.', 'Piensa en qué se parece más la Pico: a la Uno o a un ordenador.'),
    XN('rp1', 'rp_board', 'Sumar dos números de 32 bits: el AVR de la Uno necesita 4 sumas a 16 MHz y el RP2040 una sola a 125 MHz. Contando solo esas sumas (una por ciclo), ¿cuántas veces más rápido es el RP2040?', 31.25, 'veces', 'Uno: 4 ciclos a 16 MHz. Pico: 1 ciclo a 125 MHz. 4 × 125 / 16 = 31,25 veces.', 'Multiplica la ventaja en instrucciones (4 a 1) por la del reloj (125 / 16).', { tol: 0.3 }),
    XN('rp1', 'rp_drive', 'Un LED rojo (cae 2 V) en un GPIO de 3,3 V. Quieres 3 mA, dentro de lo que da el pin. ¿Qué resistencia, en Ω?', 433, 'Ω', 'R = (3,3 − 2) / 0,003 = 433 Ω (pondrías 470 Ω, el valor normalizado cercano).', 'Ley de Ohm con la tensión que le sobra a la resistencia: 3,3 − 2.', { tol: 8 }),
    XQ('rp1', 'rp_drive', 'Una tira de LEDs de 12 V que gasta 600 mA, gobernada desde GP16. ¿Montaje correcto?', ['GP16 a la puerta de un MOSFET de nivel lógico que conmuta la tira, con su fuente de 12 V y masa común', 'La tira directa a GP16 configurado a 12 mA', 'La tira a 3V3(OUT) con una resistencia', 'GP16 directo a la tira con un diodo en serie'], 'El pin solo da la orden; la corriente y los 12 V salen de otra fuente. Las masas deben estar unidas.', 'Compara 600 mA y 12 V con lo que puede dar un GPIO.'),
    XQ('rp2', 'rp_family', 'Un mando que manda pulsaciones al móvil por Bluetooth y hace pocas cuentas. ¿Qué placa es la más sencilla que vale?', ['Pico W: RP2040 con radio', 'Pico: tiene Bluetooth por el USB', 'Pico 2: más RAM, pero sin radio', 'Ninguna: la familia Pico no tiene Bluetooth'], 'Hace falta la radio (la W). Para pocas cuentas, el RP2040 basta; la Pico 2 W también valdría.', '¿Qué letra añade la radio?'),
    XQ('rp2', 'rp_family', 'En una Pico W intentas encender el LED de la placa poniendo GP25 a 1 y no se enciende. ¿Por qué?', ['En la W el LED cuelga del chip de radio, y GP25 se usa para hablar con la radio', 'El LED de la W es de otro color', 'Hace falta poner GP25 a 0', 'La W no tiene LED'], 'En la Pico normal el LED está en GP25; en la W, los pines internos 23, 24, 25 y 29 son para la radio.', 'Recuerda quién usa los pines internos en la W.'),
    XQ('rp2', 'rp_family', 'Tu programa del RP2040 hace muchas cuentas con decimales y va justo de tiempo. ¿Qué cambio de placa ayuda más sin cambiar de lenguaje?', ['Pasar a una Pico 2: el RP2350 tiene coma flotante por hardware', 'Pasar a una Pico W', 'Ninguno: todas hacen igual los decimales', 'Usar otra Pico igual y repartir las cuentas por cable'], 'El Cortex-M33 del RP2350 hace las operaciones con float en hardware; el M0+ las hace con rutinas de software.', '¿Qué chip de la familia trae unidad de coma flotante?'),
    XQ('rp3', 'rp_pinout', 'Necesitas tres entradas analógicas y un bus I²C0. ¿Qué reparto vale?', ['Analógicas en GP26, GP27 y GP28; I²C0 en GP4 (SDA) y GP5 (SCL)', 'Analógicas en GP0, GP1 y GP2; I²C0 en GP26 y GP27', 'Analógicas en GP26, GP27 y GP28; I²C0 en GP6 y GP7', 'Analógicas en GP27, GP28 y GP29; I²C0 en GP4 y GP5'], 'Solo GP26–GP28 tienen ADC en el conector (GP29 mide VSYS). GP6 y GP7 son de I²C1.', 'Las parejas de I²C alternan 0, 1, 0, 1…; el ADC está al final de la numeración.'),
    XN('rp3', 'rp_levels', 'Divisor para una salida de 5 V: R1 = 2,2 kΩ arriba y R2 = 3,3 kΩ abajo. ¿Qué tensión llega al GPIO, en V?', 3, 'V', 'V = 5 × 3,3 / (2,2 + 3,3) = 5 × 0,6 = 3,0 V: un 1 claro y por debajo del máximo.', 'V = Ve × R2 / (R1 + R2).', { tol: 0.05 }),
    XQ('rp3', 'rp_levels', 'Un sensor analógico da de 0 a 5 V y lo quieres leer con el ADC en GP27. ¿Qué haces?', ['Un divisor que deje la señal por debajo de 3,3 V en todo su rango', 'Conectarlo directo: GP27 es analógico', 'Usar una Pico 2, que tolera 5 V en todos sus pines', 'Un 74HCT entre el sensor y el pin'], 'El pin no aguanta 5 V. Y en el RP2350 los pines con ADC tampoco son tolerantes a 5 V. Un 74HCT es digital: no sirve para una señal analógica.', 'Ser «analógico» no cambia el máximo de tensión del pin.'),
    XQ('rp3', 'rp_adcch', 'Tu programa lee el canal 1 del ADC. ¿A qué GPIO conectas el sensor?', ['GP27', 'GP1', 'GP26', 'GP28'], 'Canal = GPIO − 26: el canal 1 es GP27.', 'Suma 26 al número de canal.'),
    XN('rp4', 'rp_vsys', 'Tres pilas AA nuevas (1,6 V cada una) entran en VSYS por un Schottky de 0,3 V. ¿Qué tensión ve GP29, en V?', 1.5, 'V', 'VSYS = 3 × 1,6 − 0,3 = 4,5 V; GP29 ve un tercio: 1,5 V.', 'Primero VSYS (pilas menos el diodo); luego el divisor ÷3.', { tol: 0.02 }),
    XQ('rp4', 'rp_power', 'Quieres más autonomía y pones cuatro pilas AA nuevas en serie (unos 6,4 V) en VSYS. ¿Problema?', ['Sí: superan los 5,5 V que admite VSYS', 'No: el buck-boost lo baja todo', 'No, si quitas el USB', 'Solo si el programa usa la WiFi'], 'VSYS admite de 1,8 a 5,5 V. Con tres pilas (4,8 V nuevas) vas sobrado.', 'Compara 6,4 V con el rango de VSYS.'),
    XQ('rp4', 'rp_schottky', 'USB conectado y una LiPo de 4,0 V en VSYS a través de su Schottky. ¿Qué corriente pasa por ese diodo?', ['Ninguna: VSYS está más alto que la batería y el diodo queda en inversa', 'La del USB cargando la batería', 'La de la batería ayudando al USB', 'Un cortocircuito entre las dos fuentes'], 'Gana la fuente más alta (unos 4,7 V del USB). Por eso la batería ni se carga ni se descarga: para cargarla hace falta un cargador.', '¿Qué tensión hay a cada lado del diodo?'),
    XQ('rp4', 'rp_schottky', 'Quitas el Schottky y unes la LiPo directamente a VSYS. ¿Qué pasa al conectar el USB?', ['El USB empuja corriente sin control hacia la batería: peligroso con litio', 'Nada: VSYS reparte solo', 'La Pico va más rápido', 'Se apaga el regulador'], 'Sin diodo, las dos fuentes se enfrentan. Una LiPo solo se carga con un cargador con protección.', 'Piensa en para qué estaba el diodo.'),
    XM('rp4', 'rp_power', 'Une cada necesidad con la pata que usarías.', [['Dos pilas AA', 'VSYS'], ['Sensor de 3,3 V y 20 mA', '3V3(OUT)'], ['Interruptor que apaga el regulador', '3V3_EN a masa'], ['Botón de reset', 'RUN a masa']], 'Entrada por VSYS, salida por 3V3(OUT); 3V3_EN apaga y RUN reinicia.', 'Sigue el camino: entrada, regulador, salida y control.'),
    XQ('rp5', 'rp_uf2', '¿Por qué un .uf2 ocupa más o menos el doble que el programa que lleva?', ['Cada bloque de 512 bytes lleva solo 256 de programa; el resto es dirección, familia y relleno', 'Porque va comprimido', 'Porque lleva dos copias por seguridad', 'Porque incluye la ROM'], 'Bloques de 512 bytes con 256 útiles: el fichero mide el doble.', 'Mira qué hay dentro de cada bloque.'),
    XN('rp5', 'rp_uf2', 'Un .uf2 tiene 1000 bloques. ¿Cuántos KB de programa lleva?', 250, 'KB', '1000 × 256 = 256 000 bytes; / 1024 = 250 KB.', 'Cada bloque lleva 256 bytes de programa; luego pasa a KB.', { tol: 0.5 }),
    XQ('rp5', 'rp_boot', 'Grabas por error un programa que desactiva el USB nada más arrancar. ¿Cómo recuperas la placa?', ['Mantienes BOOTSEL al conectarla: la ROM entra en modo USB y grabas otro UF2', 'No se puede: hay que cambiar el chip', 'Pulsando RUN muchas veces', 'Esperando a que la flash se borre sola'], 'El modo BOOTSEL vive en la ROM: ningún programa puede impedirlo.', '¿Qué parte del arranque no depende de tu programa?'),
    XQ('rp46', 'rp_xip', 'Una rutina de interrupción debe responder siempre en el mismo tiempo, sea la primera vez o la milésima. ¿Dónde la pones?', ['En la RAM: así nunca espera un fallo de caché de la flash', 'En la flash, que es más rápida', 'En la ROM', 'Da igual dónde esté'], 'Desde la flash, la primera ejecución (o tras salir de la caché) espera a traer el código por QSPI.', 'Piensa en aciertos y fallos de la caché.'),
    XQ('rp46', 'rp_xip', 'Tu bucle principal ocupa unos 24 KB de código y va más lento de lo que esperabas. ¿Qué lo explica?', ['No cabe en los 16 KB de caché: en cada vuelta hay fallos y se relee la flash', 'La RAM está llena', 'El USB lo interrumpe', 'El reloj baja solo'], 'Si el código que se repite cabe en 16 KB, tras la primera vuelta todo son aciertos.', 'Compara 24 KB con el tamaño de la caché.'),
    XN('rp46', 'rp_flash', 'Guardas un dato en el mismo sector de la flash cada minuto. Si aguanta unos 100 000 borrados, ¿cuántos días dura, más o menos?', 69.4, 'días', '100 000 minutos / 1440 minutos por día ≈ 69 días. Hay que agrupar o repartir las escrituras.', 'Un borrado por minuto; un día tiene 1440 minutos.', { tol: 1 })
  ];

  const X2 = [
    XN('rp6', 'rp_pyops', '¿Qué imprime print(100 // 7 + 100 % 7)?', 16, '', '100 // 7 = 14 y 100 % 7 = 2: 14 + 2 = 16.', 'Calcula por separado el cociente entero y el resto.'),
    XQ('rp6', 'rp_pyops', '¿Qué expresión vale 0 cuando n es par?', ['n % 2', 'n // 2', 'n / 2', 'n ** 2'], 'Un número par no deja resto al dividir entre 2.', '¿Qué operador da lo que sobra?'),
    XQ('rp6', 'rp_repl', 'Montas un LED nuevo y quieres comprobar si funciona sin escribir un programa. ¿Qué haces?', ['En el REPL creas el pin y lo enciendes: se ejecuta al momento', 'Compilas un .uf2 nuevo', 'Guardas un main.py y reinicias', 'No se puede sin un programa completo'], 'El REPL ejecuta cada línea al instante: es tu banco de pruebas.', '¿Qué parte de MicroPython ejecuta una línea nada más escribirla?'),
    XQ('rp6', 'rp_mainpy', 'Guardas tu programa en la placa como parpadeo.py y la alimentas con pilas, sin el PC. ¿Qué pasa?', ['No se ejecuta: al arrancar solo se lanza main.py', 'Se ejecuta parpadeo.py', 'Se ejecutan todos los .py', 'Sale un error en la placa'], 'Guárdalo como main.py (o haz que main.py lo importe).', '¿Qué fichero arranca solo?'),
    XQ('rp7', 'rp_pytypes', '¿Qué imprime?', ["<class 'float'>", "<class 'int'>", '1', 'Un error'], 'La división / siempre da float, aunque sea exacta (1.0).', '¿Qué tipo da siempre la barra simple?', { code: 'print(type(7 / 7))' }),
    XN('rp7', 'rp_bits', '¿Qué imprime print(0b1100 | 0b0011)?', 15, '', '1100 o 0011 = 1111 = 15.', '| pone a 1 cada bit que esté a 1 en cualquiera de los dos.'),
    XN('rp7', 'rp_bits', '¿Qué imprime print((0xB4 >> 4) & 0x7)?', 3, '', '0xB4 = 1011 0100; >> 4 deja 1011 (11); & 0b111 se queda con 011 = 3.', 'Desplaza primero; luego quédate con los 3 bits de abajo.'),
    XB('rp7', 'rp_bits', 'Enciende los bits que forman 0x2C.', 44, '0x2C: 2 = 0010 y C = 1100 → 0010 1100 = 32 + 8 + 4 = 44.', 'Pasa cada cifra hexadecimal a 4 bits.'),
    XQ('rp7', 'rp_pytypes', 'Lees una temperatura de un fichero y llega como texto. Quieres sumarle 1. ¿Qué escribes?', ['float(texto) + 1', 'texto + 1', 'int(texto) + 1', 'str(texto + 1)'], "Hay que convertir el texto en número; int('23.5') fallaría por los decimales.", 'El texto tiene decimales.', { code: "texto = '23.5'" }),
    XN('rp8', 'rp_pyflow', '¿Qué imprime?', 9, '', 'continue salta los pares: se suman 1, 3 y 5 = 9.', 'range(1, 6) da 1 a 5; continue se salta la suma.', { code: 'n = 0\nfor i in range(1, 6):\n    if i % 2 == 0:\n        continue\n    n += i\nprint(n)' }),
    XQ('rp8', 'rp_pyflow', '¿Qué imprime y qué está mal?', ["Imprime 'templado': la rama t > 30 nunca se alcanza; hay que comprobarla primero", "Imprime 'calor' y 'templado'", "Imprime 'calor': está bien", 'Da error de sintaxis'], 'Solo corre la primera rama verdadera: 35 > 20 ya se cumple.', '¿Cuál es la primera condición que se cumple con 35?', { code: "t = 35\nif t > 20:\n    print('templado')\nelif t > 30:\n    print('calor')" }),
    XQ('rp8', 'rp_python', 'El LED debía parpadear tres veces, pero hace un destello raro y luego espera. ¿Por qué?', ['La espera está fuera del bucle: los tres toggle van seguidos y solo espera al final', 'toggle no existe', 'range(3) da 4 vueltas', 'Falta un punto y coma'], 'La sangría decide qué está dentro del for.', 'Fíjate en qué líneas están sangradas.', { code: 'for i in range(3):\n    led.toggle()\ntime.sleep_ms(200)' }),
    XN('rp8', 'rp_pyflow', '¿Qué imprime?', 6, '', '100 → 50 → 25 → 12 → 6 → 3 → 1: seis vueltas.', 'Apunta n y c en cada vuelta hasta que n deje de ser mayor que 1.', { code: 'n = 100\nc = 0\nwhile n > 1:\n    n //= 2\n    c += 1\nprint(c)' }),
    XQ('rp9', 'rp_pyfunc', '¿Qué imprime?', ['6 15', '6 6', '3 15', '15 6'], 'La primera llamada usa k = 2 por defecto; la segunda, k = 5.', '¿Qué vale k cuando no lo pasas?', { code: 'def escala(v, k=2):\n    return v * k\nprint(escala(3), escala(3, 5))' }),
    XQ('rp9', 'rp_pylist', '¿Qué imprime?', ['[8, 1, 9]', '[8, 1, 9, 4]', '[3, 8, 1]', '[1, 9]'], 'Desde el índice 1 hasta el último sin incluirlo.', '−1 es el último, y el final de una porción no entra.', { code: 'v = [3, 8, 1, 9, 4]\nprint(v[1:-1])' }),
    XQ('rp9', 'rp_pylist', '¿Qué imprime?', ['2000 2', '1000 2', '2000 3', 'Un error'], 'Asignar a una clave que ya existe cambia su valor; no añade otra.', '¿Cuántas claves distintas hay?', { code: "cfg = {'f': 1000, 'pin': 15}\ncfg['f'] = 2000\nprint(cfg['f'], len(cfg))" }),
    XN('rp9', 'rp_pymem', "¿Cuántas lecturas caben en 100 KB guardadas en array('f')?", 25600, 'lecturas', "100 KB = 102 400 bytes; array('f') gasta 4 bytes por número: 25 600.", 'Pasa los KB a bytes y divide entre los bytes de cada float.'),
    XQ('rp9', 'rp_pymem', 'Una lista con 10 000 temperaturas con decimales no cabe en la RAM. ¿Qué usas sin perder los decimales?', ["array('f')", "array('H')", 'Un diccionario', 'Una cadena de texto'], "array('f') guarda cada float en 4 bytes seguidos. 'H' solo guarda enteros positivos.", '¿Qué código de array es para float?'),
    XQ('rp10', 'rp_ticks', '¿Qué imprime este código?', ['Los milisegundos que ha tardado hacer_algo()', 'La hora del día', 'Siempre 0', 'Los ms desde que se encendió la placa'], 'ticks_diff da el tiempo transcurrido entre las dos lecturas.', 'Es la diferencia entre después y antes.', { code: 'inicio = time.ticks_ms()\nhacer_algo()\nprint(time.ticks_diff(time.ticks_ms(), inicio))' }),
    XN('rp10', 'rp_ticks', 'antes = 4000, periodo de 300 ms y antes = ticks_add(antes, 300) en cada cambio. El bucle detecta el plazo en 4310, 4620 y 4905. ¿Cuánto vale antes tras la tercera detección?', 4900, '', 'Cada vez se suma 300 al plazo anterior, no a la hora de detección: 4300, 4600 y 4900.', 'ticks_add suma el periodo a antes, sin mirar cuándo lo detectaste.'),
    XQ('rp10', 'rp_pullup', 'Pulsador de GP14 a masa con PULL_UP. Quieres el LED encendido solo mientras pulsas. ¿Qué línea va en el bucle?', ['led.value(not b.value())', 'led.value(b.value())', 'led.value(1)', 'b.value(led.value())'], 'Pulsado lee 0; not 0 es verdadero y enciende el LED.', '¿Qué lee el pin cuando pulsas?'),
    XQ('rp10', 'rp_hwtiming', 'Un zumbador debe dar 440 Hz exactos mientras el programa lee sensores. ¿Cómo?', ['Con PWM: el hardware genera la onda sin depender del bucle', 'Con toggle() y sleep_us en el bucle', 'Con print más rápidos', 'Con ticks_ms'], 'Un bucle de MicroPython tiembla; el PWM no.', '¿Quién genera la onda si el programa está ocupado?'),
    XQ('rp11', 'rp_pyerr', 'El sensor responde, pero n vale 0. ¿Qué pasa?', ['Salta ZeroDivisionError y el programa se para: el except solo captura OSError', 'media queda en None', 'media vale 0', 'Se reintenta la lectura'], 'Cada except captura solo el tipo de error que nombra.', '¿Qué tipo de error da dividir entre cero?', { code: 'try:\n    datos = i2c.readfrom(0x76, 6)\n    media = sum(datos) / n\nexcept OSError:\n    media = None' }),
    XQ('rp11', 'rp_pyerr', '¿Qué dice este traceback?', ['Un índice de lista fuera de rango en la línea 21 de pantalla.py', 'Un error en la línea 8 de main.py, que hay que borrar', 'Que falta el fichero pantalla.py', 'Que la RAM está llena'], 'Abajo, el tipo de error; encima, dónde saltó. main.py solo llamó a la función.', 'Léelo de abajo arriba.', { code: 'Traceback (most recent call last):\n  File "main.py", line 8, in <module>\n  File "pantalla.py", line 21, in pinta\nIndexError: list index out of range' }),
    XQ('rp11', 'rp_mainpy', 'Tu main.py hace import config y funciona desde Thonny, pero falla al arrancar la placa sola. ¿Causa más probable?', ['config.py está en el PC, no guardado en la placa (raíz o /lib)', 'main.py no puede importar nada', 'Hace falta boot.py', 'La placa necesita el USB para importar'], 'MicroPython busca los módulos en la placa.', '¿Dónde está guardado config.py?'),
    XN('rp11', 'rp_flash', 'Un registrador mide cada 5 s y agrupa 12 medidas por escritura. ¿Cuántas escrituras hace al día?', 1440, 'escrituras', '86 400 / 5 = 17 280 medidas al día; / 12 = 1440 escrituras (una por minuto).', 'Medidas al día entre medidas por escritura.')
  ];

  const X3 = [
    XN('rp12', 'rp_pwmpy', 'Servo a 50 Hz. ¿Qué duty_u16 da un pulso de 2 ms?', 6554, '', '2 / 20 = 10 %; 0,1 × 65535 ≈ 6554.', 'Fracción del periodo de 20 ms, por 65535.', { tol: 10 }),
    XQ('rp12', 'rp_pwmslice', 'Dos LEDs en GP8 y GP9 a la misma frecuencia, pero con brillos distintos. ¿Problema?', ['Ninguno: mismo slice, pero canales A y B; comparten frecuencia, no ciclo de trabajo', 'No se puede: comparten el ciclo de trabajo', 'Hay que usar GP8 y GP24', 'Solo si uno va a 50 Hz'], 'GPn y GP(n + 16) comparten canal; GP8 y GP9 son A y B del slice 4.', 'Calcula slice y canal de cada uno.'),
    XN('rp12', 'rp_pwmslice', '¿Qué slice de PWM usa GP27?', 5, '', '(27 // 2) % 8 = 13 % 8 = 5 (canal B, por ser impar).', 'slice = (n // 2) % 8.'),
    XQ('rp12', 'rp_pwmfreq', 'Un motor pequeño con PWM a 1 kHz pita mucho. ¿Qué cambias?', ['Subir la frecuencia a unos 20–25 kHz, por encima del oído', 'Bajarla a 50 Hz', 'Poner duty_u16 a 65535', 'Cambiar de slice'], 'Por debajo de unos 20 kHz, la bobina vibra y se oye.', '¿Qué frecuencias oye una persona?'),
    XN('rp13', 'rp_adc16', 'read_u16() devuelve 45 000. ¿Qué tensión hay en el pin, en V?', 2.266, 'V', '45 000 × 3,3 / 65 535 ≈ 2,27 V.', 'V = n × 3,3 / 65 535.', { tol: 0.01 }),
    XN('rp13', 'rp_vsys', 'ADC(3) da 26 000. ¿Cuánto vale VSYS, en V?', 3.93, 'V', 'En el pin: 26 000 × 3,3 / 65 535 ≈ 1,31 V. VSYS = 3 × 1,31 ≈ 3,93 V.', 'Pasa a voltios y deshaz el divisor ÷3.', { tol: 0.02 }),
    XN('rp13', 'rp_adcgood', 'Promedias 64 lecturas de una tensión fija con ruido aleatorio. ¿Entre cuánto se divide el ruido?', 8, '', '√64 = 8.', 'El ruido aleatorio baja con la raíz del número de lecturas.'),
    XQ('rp13', 'rp_adc16', 'Dos lecturas seguidas de read_u16() solo difieren en múltiplos de 16. ¿Por qué?', ['El ADC es de 12 bits y read_u16 los estira a 16: cada paso real son 16 cuentas', 'Por el ruido', 'Porque el pin es de 16 bits', 'Porque el regulador va en PWM'], 'Más cuentas no es más precisión: 4096 pasos reales.', '¿Cuántos bits tiene el ADC de verdad?'),
    XN('rp14', 'rp_tempsens', 'El sensor interno da 0,690 V. ¿Qué temperatura indica, en °C?', 36.3, '°C', 'T = 27 − (0,690 − 0,706) / 0,001721 = 27 + 9,3 ≈ 36,3 °C.', 'Usa T = 27 − (V − 0,706) / 0,001721; ojo con los signos.', { tol: 0.3 }),
    XQ('rp14', 'rp_tempsens', 'Calibraste el sensor interno a 25 °C con un ajuste fijo. A 60 °C vuelve a tener bastante error. ¿Por qué?', ['Un ajuste en un punto corrige el desplazamiento, no la pendiente: calibra en dos puntos', 'Porque a 60 °C el ADC se apaga', 'Porque el ajuste solo vale una vez', 'Porque el sensor sube con la temperatura'], 'Con dos puntos (frío y caliente) corriges también la pendiente.', 'Una recta tiene dos cosas: dónde corta y cuánto se inclina.'),
    XQ('rp14', 'rp_adcgood', 'Lees el sensor interno una sola vez por segundo y el valor salta medio grado arriba y abajo. ¿Qué mejoras primero?', ['Promediar varias lecturas en cada medida', 'Multiplicar por 1000', 'Usar ADC(26)', 'Leerlo más despacio, una vez por minuto'], 'Cada paso del ADC son casi 0,5 °C: promediar suaviza.', 'Una lectura sola tiembla.'),
    XQ('rp15', 'rp_timer', '¿Qué hace este código?', ['Al pulsar enciende el LED y lo apaga 3 s después, sin bloquear', 'Hace parpadear el LED cada 3 s', 'Espera 3 s antes de encender', 'Da error: no se crea un Timer en un handler'], 'ONE_SHOT llama a apaga una sola vez, 3000 ms después.', 'ONE_SHOT = una sola vez.', { code: "def apaga(t):\n    led.value(0)\n\ndef al_pulsar(p):\n    led.value(1)\n    Timer(period=3000, mode=Timer.ONE_SHOT, callback=apaga)\n\nb.irq(trigger=Pin.IRQ_FALLING, handler=al_pulsar)" }),
    XQ('rp15', 'rp_irq', 'Este handler se registra con hard=True y total es un float. ¿Problema?', ['Crea un float nuevo: necesita memoria, y con hard=True no se puede', 'Ninguno', 'Que 0,5 se redondea a 0', 'Que total pasa a ser int'], 'Con hard=True, solo operaciones que no reserven memoria: enteros pequeños y banderas.', '¿Qué no se puede hacer dentro de un handler duro?', { code: 'def al_pulsar(p):\n    global total\n    total += 0.5' }),
    XQ('rp15', 'rp_debounce', 'Un pulsador rebota hasta 8 ms y el usuario pulsa como mucho cada 200 ms. ¿Ventana de antirrebote razonable?', ['20–30 ms', '2 ms', '250 ms', '0 ms: el pull-up ya lo evita'], 'Mayor que el rebote y mucho menor que el tiempo entre pulsaciones reales.', 'Debe tapar los rebotes sin comerse pulsaciones.'),
    XN('rp15', 'rp_debounce', 'Flancos en 0, 4, 9, 50, 53 y 140 ms. Se cuenta si han pasado más de 30 ms desde el último flanco, y «último» se actualiza en cada flanco. ¿Cuántas pulsaciones cuenta?', 3, '', '0 cuenta; 4 y 9 no; 50 (41 ms tras el 9) cuenta; 53 no; 140 (87 ms tras el 53) cuenta: 3.', 'Mide cada flanco contra el anterior, no contra el último contado.'),
    XQ('rp15', 'rp_hwtiming', 'Cuentas los pulsos de un caudalímetro con Pin.irq en Python y a veces faltan algunos. ¿Mejor solución?', ['Contarlos con hardware: un slice de PWM como contador o el PIO', 'Un handler más largo', 'Poner time.sleep_ms en el handler', 'Usar un Timer de 1 s'], 'Los handlers de Python pueden retrasarse (por ejemplo, con la recogida de basura).', '¿Quién cuenta sin depender del intérprete?'),
    XN('rp16', 'rp_struct', "Un registro devuelve 0xFC y 0x18 (alto primero) y lo lees con struct.unpack('>h', b). ¿Qué número sale?", -1000, '', '0xFC18 = 64 536 sin signo; con signo: 64 536 − 65 536 = −1000.', 'Junta los bytes; si pasa de 32 767, réstale 65 536.'),
    XQ('rp16', 'rp_i2c', 'i2c.scan() devuelve [60, 118]. ¿Qué hay en el bus?', ['Dos dispositivos, en 0x3C y 0x76', '60 dispositivos', 'Un dispositivo con dos registros', 'Un error en el bus'], 'scan() da direcciones en decimal: 60 = 0x3C (pantalla típica) y 118 = 0x76.', 'Cada número es una dirección en decimal.'),
    XQ('rp16', 'rp_pinout', 'Quieres I²C0 y GP4 y GP5 ya están ocupados. ¿Qué pareja eliges?', ['GP0 y GP1', 'GP2 y GP3', 'GP6 y GP7', 'GP26 y GP27'], 'Las parejas alternan: 0-1 es I²C0, 2-3 I²C1, 4-5 I²C0, 6-7 I²C1… y 26-27 es I²C1.', 'Cuenta parejas desde GP0 alternando 0 y 1.'),
    XQ('rp16', 'rp_i2c', 'Dos sensores iguales, con la misma dirección fija, deben ir en la misma Pico. ¿Solución?', ['Ponerlos en buses distintos: uno en I²C0 y otro en I²C1', 'Ponerlos en el mismo bus: se reparten solos', 'Bajar la velocidad a 100 kHz', 'Quitar las pull-ups de uno'], 'En un mismo bus, cada dirección debe ser única.', 'En I²C se elige por dirección.'),
    XN('rp47', 'rp_uartproto', 'A 9600 baudios, ¿cuántos ms tarda en llegar un mensaje de 24 bytes?', 25, 'ms', '24 × 10 bits = 240 bits; 240 / 9600 = 0,025 s = 25 ms.', 'Cada byte son 10 bits en la línea.', { tol: 0.2 }),
    XQ('rp47', 'rp_buses', 'Una pantalla SPI y una tarjeta SD en el mismo bus SPI. ¿Qué hilo necesita cada una por separado?', ['Solo su CS; SCK, MOSI y MISO se comparten', 'Todos: no se pueden compartir', 'Solo su MISO', 'Ninguno: van por direcciones'], 'Con el CS alto, cada chip ignora el bus.', 'SPI no usa direcciones.'),
    XQ('rp47', 'rp_buses', 'Un módulo envía a 115 200 baudios y tu UART está a 9600. ¿Qué recibes?', ['Basura: los dos extremos deben ir al mismo baudio', 'Lo mismo, más despacio', 'Nada, ni un byte', 'Lo mismo, pero sin saltos de línea'], 'En UART no hay reloj: cada lado cronometra los bits con su baudio.', '¿Cómo sabe el receptor cuánto dura un bit?'),
    XN('rp17', 'rp_async', 'Tarea A espera 300 ms y tarea B 500 ms, las dos con await y arrancando en t = 0. Entre 0 y 1500 ms, incluidos los extremos, ¿cuántas veces despiertan las dos en el mismo instante?', 2, 'veces', 'Coinciden en los múltiplos comunes de 300 y 500: 0 y 1500 ms.', 'Busca el mínimo común múltiplo de 300 y 500.'),
    XQ('rp17', 'rp_async', 'Una tarea lee el ADC 100 veces seguidas sin ningún await (tarda 40 ms). Otra parpadea cada 10 ms. ¿Qué notas?', ['El parpadeo se retrasa hasta 40 ms cada vez que corre la lectura', 'Nada: asyncio usa los dos núcleos', 'El parpadeo va más rápido', 'La lectura se divide sola en trozos'], 'Mientras una tarea no cede el turno, las demás esperan.', 'Un solo camarero.'),
    XQ('rp17', 'rp_async', 'Un handler de pin debe despertar a una tarea de asyncio. ¿Qué pones dentro del handler?', ['flag.set() de un asyncio.ThreadSafeFlag', 'await flag.wait()', 'asyncio.run(tarea())', 'time.sleep_ms(10)'], 'La tarea espera con await flag.wait(); el handler solo avisa.', 'En el handler no se puede usar await.')
  ];

  const X4 = [
    XQ('rp18', 'rp_cmake', "Al compilar sale «hardware/adc.h: No such file or directory». ¿Qué falta?", ['Añadir hardware_adc a target_link_libraries', 'Instalar otro compilador', 'Poner PICO_BOARD=pico_w', 'Llamar a stdio_init_all()'], 'Enlazar la biblioteca también añade sus cabeceras.', '¿Qué línea de CMakeLists.txt elige las bibliotecas?'),
    XQ('rp18', 'rp_stdio', 'CMakeLists.txt tiene pico_enable_stdio_usb(app 1), pero printf no saca nada. ¿Qué falta en main()?', ['Llamar a stdio_init_all() antes del primer printf', 'Enlazar hardware_pwm', 'Usar Serial.begin', 'Nada: printf no existe en el SDK'], 'Sin stdio_init_all(), el puerto serie por USB no se pone en marcha.', 'Algo tiene que inicializar la salida estándar.'),
    XQ('rp18', 'rp_sdk', 'Cambias una línea de main.c y recompilas. ¿Por qué tarda mucho menos que la primera vez?', ['Solo se rehace lo que ha cambiado; el SDK ya compilado se reutiliza', 'Porque comprime el código', 'Porque se salta el enlazador', 'Porque no genera el .uf2'], 'La primera vez se compila todo lo que usas del SDK.', 'Make o Ninja comparan qué ha cambiado.'),
    XQ('rp18', 'rp_cmake', 'Tienes una Pico 2 W. ¿Cómo configuras el proyecto?', ['cmake -DPICO_BOARD=pico2_w ..', 'cmake -DPICO_BOARD=pico ..', 'cmake -DPICO_BOARD=pico_w ..', 'No hace falta decir la placa'], 'PICO_BOARD elige chip, flash y pines especiales como el LED.', 'El nombre junta el 2 y la W.'),
    XB('rp19', 'rp_bits', 'Máscara para gpio_put_masked que toca solo GP2, GP3, GP4 y GP5.', 60, '4 + 8 + 16 + 32 = 60 (0b0011_1100).', 'Enciende los bits 2 a 5.'),
    XN('rp19', 'rp_bits', 'Ocho LEDs en GP0–GP7 muestran 0b1010_0101 (165). Llamas a gpio_xor_mask(0x0F). ¿Qué valor muestran ahora?', 170, '', 'Se invierten los 4 bits de abajo: 0101 → 1010. Queda 1010_1010 = 170 (0xAA).', 'xor invierte solo los bits marcados en la máscara.'),
    XQ('rp19', 'rp_pullup', 'El pulsador de GP14 va a masa. El LED se enciende y apaga solo, al azar. ¿Qué falta?', ['gpio_pull_up(14): sin él, la entrada queda flotando', 'gpio_put(14, 1)', 'Un sleep_ms(10)', 'Cambiar a GP15'], 'Una entrada sin nada que la fije lee ruido.', '¿Qué fija el nivel cuando el pulsador está suelto?', { code: 'gpio_init(14);\ngpio_set_dir(14, GPIO_IN);\nwhile (true) {\n    gpio_put(15, !gpio_get(14));\n}' }),
    XN('rp19', 'rp_overflow', 'Un contador uint32_t de milisegundos (como millis() de Arduino), ¿cada cuántos días da la vuelta?', 49.7, 'días', '2³² ms = 4 294 967 s ≈ 49,7 días.', '2 elevado a 32 en ms; pásalo a segundos y luego a días (86 400 s).', { tol: 0.1 }),
    XQ('rp19', 'rp_ticks', 'hacer_algo() tarda 3 ms y el bucle es { hacer_algo(); sleep_ms(10); }. ¿Cada cuánto se repite y cómo lo harías exacto?', ['Cada 13 ms; para 10 ms exactos, sleep_until con el siguiente instante absoluto', 'Cada 10 ms exactos', 'Cada 7 ms', 'Cada 13 ms, y no se puede mejorar'], 'Esperar 10 ms después del trabajo suma su duración. Con un instante absoluto, el retraso no se acumula.', 'La espera empieza cuando acaba el trabajo.'),
    XN('rp21', 'rp_clock', 'FBDIV = 125, POSTDIV1 = 5 y POSTDIV2 = 2. ¿clk_sys en MHz?', 150, 'MHz', 'VCO = 12 × 125 = 1500 MHz (en rango); 1500 / (5 × 2) = 150 MHz.', '12 MHz × FBDIV y luego divide entre los dos POSTDIV.'),
    XQ('rp21', 'rp_clock', '¿Vale FBDIV = 50, POSTDIV1 = 2 y POSTDIV2 = 1 para sacar 300 MHz?', ['No: el VCO quedaría en 600 MHz, fuera de 750–1600 MHz', 'Sí: 600 / 2 = 300', 'Sí, si POSTDIV2 es 1', 'No: POSTDIV1 no puede ser 2'], 'La cuenta sale, pero el VCO debe estar en su rango.', 'Calcula primero el VCO.'),
    TU('Con el PLL, consigue 133 MHz con el VCO dentro de su rango.', 'rp_pll', PLLP(), { q: 'fok', min: 132.9, max: 133.1, text: 'Objetivo: clk_sys = 133 MHz', hint: '12 × 133 = 1596 MHz cabe en el VCO.' }, 'FBDIV 133 da 1596 MHz; entre 12 (6 × 2 o 4 × 3) salen 133 MHz.', { c: 'rp_clock', h: 'Busca un VCO que sea 133 por un número que puedas formar con los dos POSTDIV.', l: 'rp21' }),
    XN('rp21', 'rp_clksys', 'Calculaste un PWM de 25 kHz suponiendo clk_sys = 125 MHz, pero tu placa arranca a 200 MHz. ¿Qué frecuencia sale, en kHz?', 40, 'kHz', 'El PWM cuelga de clk_sys: 25 × 200 / 125 = 40 kHz. Hay que recalcular.', 'La frecuencia del PWM es proporcional a clk_sys.'),
    XQ('rp21', 'rp_overclock', 'set_sys_clock_khz(f, false) devuelve false. ¿Qué ha pasado?', ['Esa frecuencia no se puede conseguir exacta con el PLL y no ha cambiado nada', 'Ha cambiado y va todo bien', 'Se ha colgado la flash', 'El USB se ha desconectado'], 'Con true, en vez de devolver false, se detendría con un error.', 'false es el parámetro «obligatorio».'),
    XN('rp20', 'rp_pwmwrap', 'clk_sys = 125 MHz, divisor 4 y wrap 24 999. ¿Frecuencia del PWM, en Hz?', 1250, 'Hz', '125 000 000 / (25 000 × 4) = 1250 Hz.', 'f = clk_sys / ((wrap + 1) × div).'),
    XN('rp20', 'rp_pwmwrap', 'Necesitas PWM a 100 kHz con clk_sys = 125 MHz. ¿Cuántos niveles de ciclo de trabajo tendrás como máximo?', 1250, 'niveles', 'Con divisor 1: wrap + 1 = 125 000 000 / 100 000 = 1250 niveles.', 'Con el divisor mínimo, wrap + 1 = clk_sys / f.'),
    XN('rp20', 'rp_phasecorrect', 'En fase correcta, clk_sys = 125 MHz, divisor 1 y wrap 2499. ¿Frecuencia en kHz?', 25, 'kHz', '125 000 000 / (2 × 2500) = 25 000 Hz.', 'En fase correcta el contador sube y baja: hay un 2 más.', { tol: 0.05 }),
    XQ('rp20', 'rp_pwmslice', 'Quieres medir la frecuencia de una señal con un slice de PWM. ¿GP20 o GP21?', ['GP21: solo el canal B (GPIO impar) puede ser entrada', 'GP20: el canal A es la entrada', 'Cualquiera de los dos', 'Ninguno: el PWM no mide'], 'El contador puede avanzar con los flancos del pin B.', '¿Qué canal puede ser entrada?'),
    TU('Con clk_sys = 125 MHz y sin fase correcta, consigue un PWM de 1 kHz.', 'rp_pwm', PWMP(), { q: 'f', min: 995, max: 1005, text: 'Objetivo: 1 kHz', hint: '(wrap + 1) × div debe dar 125 000.' }, 'Por ejemplo divisor 125 y wrap 999, o divisor 25 y wrap 4999 (más niveles).', { c: 'rp_pwmwrap', h: 'Divide 125 000 000 entre 1000 y repártelo entre divisor y wrap + 1.', l: 'rp20' }),
    XQ('rp22', 'rp_volatile', 'Una interrupción pone listo = true, pero con las optimizaciones del compilador el bucle while (!listo); no termina nunca. ¿Por qué?', ['listo no es volatile: el compilador la lee una vez y no vuelve a mirar la memoria', 'La interrupción no salta con optimizaciones', 'true vale 0 en C', 'Falta un printf dentro del bucle'], 'volatile obliga a leer la variable de memoria en cada vuelta.', 'El compilador no sabe que una interrupción la cambia.'),
    XN('rp22', 'rp_timerc', 'add_repeating_timer_ms(20, …) con periodo positivo y un callback que tarda 3 ms. ¿Cada cuántos ms empieza de verdad?', 23, 'ms', 'Positivo: los 20 ms se cuentan desde que acaba el callback: 20 + 3 = 23 ms.', 'Recuerda desde dónde cuenta el periodo positivo.'),
    XQ('rp22', 'rp_timerc', 'Tu callback de GPIO se ejecuta también cuando salta la interrupción de GP16, un sensor. ¿Por qué?', ['Hay un solo callback de GPIO por núcleo: mira el argumento gpio para saber cuál fue', 'Porque GP16 está mal soldado', 'Porque los callbacks se copian solos', 'Porque falta volatile'], 'Dentro, if (gpio == 14) … else if (gpio == 16) …', '¿Cuántos callbacks de GPIO puede haber por núcleo?'),
    XQ('rp22', 'rp_timerc', 'Pones printf y sleep_ms(100) dentro del callback de un temporizador de 1 ms. ¿Qué pasa?', ['El callback dura más que el periodo: las llamadas se retrasan y bloqueas lo demás', 'Nada', 'El temporizador va más rápido', 'printf sale más ordenado'], 'Callbacks cortos: sin printf ni sleep.', 'Compara lo que dura el callback con su periodo.'),
    XN('rp23', 'rp_dbgpin', 'El GPIO de depuración marca pulsos de 120 µs que se repiten cada 1 ms. ¿Qué porcentaje de CPU ocupa la rutina?', 12, '%', '120 / 1000 = 0,12 = 12 %.', 'Anchura del pulso entre periodo.'),
    XQ('rp23', 'rp_hardfault', 'En un Cortex-M0+, ¿qué ocurre?', ['Escribe bien: 16 bits en una dirección par están alineados', 'HardFault: es desalineado', 'Escribe solo un byte', 'No compila'], 'Los accesos de 16 bits exigen dirección par; &buf[2] lo es (si buf empieza alineado).', '¿Es &buf[2] par?', { code: 'uint32_t buf32[2];\nuint8_t *buf = (uint8_t *)buf32;\nuint16_t *p = (uint16_t *)&buf[2];\n*p = 7;' }),
    XQ('rp23', 'rp_swd', 'Quieres ver cuánto vale cuenta justo al entrar en procesar(). ¿Qué órdenes de GDB usas?', ['break procesar, continue y print cuenta', 'step, step y step', 'load y quit', 'bt y load'], 'break para en la función; print muestra la variable.', 'Primero un punto de ruptura, luego ejecutar hasta él.'),
    XQ('rp23', 'rp_hardfault', 'Tras llamar muchas veces a una función recursiva, el programa acaba en HardFault. ¿Causa probable?', ['La pila se ha desbordado', 'La flash se ha gastado', 'El USB se ha desconectado', 'El reloj es demasiado lento'], 'Cada llamada ocupa pila; si no paran, se sale de su zona.', '¿Qué memoria crece con cada llamada?')
  ];

  const X5 = [
    XQ('rp24', 'rp_pio', 'Quieres con PIO tres UART extra, una salida WS2812 y un encoder en un RP2040. ¿Hay máquinas?', ['Sí: son 5 de 8, si los programas caben en las 32 instrucciones de cada bloque', 'No: solo hay 4 máquinas', 'No: cada protocolo necesita un bloque entero', 'Solo en un RP2350'], '2 bloques × 4 máquinas; reparte los programas entre los bloques.', 'Cuenta máquinas y piensa en la memoria de cada bloque.'),
    XN('rp24', 'rp_piocycles', 'set(pins, 1) [2] y set(pins, 0) [6] en bucle. ¿Ciclo de trabajo, en %?', 30, '%', 'Alto: 1 + 2 = 3 ciclos; bajo: 1 + 6 = 7; 3 / 10 = 30 %.', 'Cada instrucción dura 1 + su retardo.'),
    XQ('rp24', 'rp_hwtiming', '¿Por qué una señal VGA no se hace moviendo pines desde la CPU mientras ejecuta un juego?', ['Cualquier cálculo o interrupción la retrasa y la imagen tiembla; el PIO la genera al ciclo', 'Porque la CPU no puede escribir en los pines', 'Porque la VGA necesita 5 V', 'Sí se puede sin problemas'], 'El bit-banging depende de que la CPU llegue a tiempo, siempre.', '¿Quién mueve el pin mientras la CPU calcula?'),
    XN('rp25', 'rp_pioins', 'Un bucle cierra con jmp(x_dec, "bucle") y X vale 9 al entrar. ¿Cuántas veces se ejecuta el cuerpo?', 10, 'veces', 'Salta con 9, 8… 1 (nueve saltos) y con 0 sigue: X + 1 = 10 pasadas.', 'Cuenta la primera pasada además de los saltos.'),
    XQ('rp25', 'rp_pioins', '¿Qué hace wait(1, pin, 0)?', ['Para la máquina hasta que el pin 0 de su grupo de entrada esté a 1', 'Pone el pin 0 a 1', 'Espera 1 ciclo', 'Salta si el pin está a 0'], 'wait espera a un nivel de un pin (o a una IRQ).', 'wait no escribe nada.'),
    XN('rp25', 'rp_piocycles', '¿Cuántos ciclos dura este trozo completo, desde set(x, 3) hasta que termina el último jmp?', 17, 'ciclos', 'set(x, 3): 1 ciclo. Cada vuelta: 2 + 1 + 1 = 4 ciclos, y hay X + 1 = 4 vueltas: 16. Total 17.', 'El último jmp no salta, pero también gasta su ciclo.', { code: "set(x, 3)\nlabel('b')\nset(pins, 1) [1]\nset(pins, 0)\njmp(x_dec, 'b')" }),
    XQ('rp25', 'rp_pioins', '¿Cuál es la forma más sencilla de poner 25 en X?', ['set(x, 25): cabe en el rango de 0 a 31', 'pull() y mov(x, osr), siempre', 'mov(x, 25)', 'No se puede'], 'pull + mov solo hace falta para valores mayores de 31.', '¿Hasta qué valor llega set?'),
    XQ('rp26', 'rp_pioshift', 'Una WS2812 quiere el bit alto primero y configuras SHIFT_RIGHT. ¿Qué pasa?', ['Los bits salen al revés y los colores son incorrectos', 'Nada', 'La tira va más rápido', 'Solo cambia el brillo'], 'A la derecha sale primero el bit 0; para el bit alto primero, SHIFT_LEFT.', '¿Qué bit sale primero desplazando a la derecha?'),
    XN('rp26', 'rp_pioshift', 'Autopull con umbral de 16 bits y el programa usa out(pins, 2). ¿Cuántas out se ejecutan antes de recargar el OSR?', 8, '', '16 / 2 = 8.', 'Umbral entre bits por out.'),
    XQ('rp26', 'rp_pioidle', 'Tu transmisor tipo SPI espera en pull() con el reloj en alto, pero en tu protocolo el reloj reposa en bajo. ¿Qué pasa?', ['El receptor puede ver flancos falsos al empezar y al terminar: espera con el reloj en reposo', 'Nada: el reloj da igual mientras espera', 'La máquina no arranca', 'La FIFO se desborda'], 'Mientras espera, la máquina deja los pines como estaban.', '¿Qué nivel ve el receptor mientras la máquina espera?'),
    XQ('rp26', 'rp_pioshift', 'La CPU hace cinco sm.put() seguidos y la máquina aún no ha sacado nada de su FIFO (de 4 palabras). ¿Qué pasa con el quinto?', ['Espera hasta que la máquina haga sitio', 'Se pierde el primero', 'Se pierde el quinto sin aviso', 'La FIFO crece a 8'], 'put espera si la TX FIFO está llena. Unir las FIFO se decide al configurar, no sobre la marcha.', '¿Cuántas palabras caben en la TX FIFO?'),
    XN('rp27', 'rp_piosideset', 'Declaras 3 pines de side-set (no opcional). ¿Qué retardo máximo puedes poner, en ciclos?', 3, 'ciclos', 'Side-set y retardo comparten 5 bits: quedan 2 bits, hasta [3].', 'Resta los bits de side-set a 5 y mira el mayor número que cabe.'),
    XN('rp27', 'rp_piodiv', 'UART con PIO a 9600 baudios, 8 ciclos por bit y clk_sys = 200 MHz. ¿Divisor?', 2604.17, '', '200 000 000 / (9600 × 8) = 200 000 000 / 76 800 ≈ 2604,2.', 'div = clk_sys / (baudios × ciclos por bit).', { tol: 0.5 }),
    XN('rp27', 'rp_piodiv', 'Con clk_sys = 200 MHz, ¿cuál es la frecuencia mínima a la que puede ir una máquina PIO, en Hz?', 3052, 'Hz', '200 000 000 / 65 536 ≈ 3052 Hz. Para ir más lento, retardos o bucles.', 'Divide clk_sys entre el divisor máximo.', { tol: 2 }),
    XQ('rp27', 'rp_piosideset', '¿En qué flanco del reloj debe leer el receptor?', ['En el de bajada: el dato cambió con la subida y ya está estable', 'En el de subida, a la vez que cambia el dato', 'En los dos', 'Da igual'], 'out cambia el dato en el mismo ciclo en que el reloj sube; un ciclo después baja con el dato ya fijo.', 'Fíjate en qué cambia en cada instrucción.', { code: 'wrap_target()\nout(pins, 1)   .side(1)\nnop()          .side(0)\nwrap()' }),
    XN('rp28', 'rp_piocycles', 'El programa destello (cuatro instrucciones con [31]) en una máquina a 1000 Hz. ¿Frecuencia del LED, en Hz?', 7.8125, 'Hz', '4 × 32 = 128 ciclos por periodo; 1000 / 128 ≈ 7,81 Hz.', 'Ciclos por periodo: 4 instrucciones de 1 + 31.', { tol: 0.05 }),
    XQ('rp28', 'rp_piompy', 'Tu programa usa out(pins, 1), pero creaste la máquina solo con set_base=Pin(15). ¿Qué pasa?', ['out no mueve GP15: necesita out_base', 'Funciona igual', 'Da error de sintaxis', 'Mueve GP15 y GP16'], 'Cada tipo de instrucción tiene su propio grupo de pines.', '¿Qué base usa cada instrucción?'),
    XN('rp28', 'rp_ws2812', 'Máquina a 8 MHz con 10 ciclos por bit. ¿Cuántos ciclos en alto para un 1 de unos 750 ns?', 6, 'ciclos', 'A 8 MHz un ciclo dura 125 ns: 750 / 125 = 6 ciclos.', 'Duración de un ciclo = 1 / 8 MHz.'),
    XN('rp28', 'rp_ws2812', 'Una tira de 144 LEDs a 800 kbit/s. Sin contar la pausa de fin de trama, ¿cuántas veces por segundo se puede refrescar, como máximo?', 231.5, 'veces', '144 × 24 = 3456 bits; 3456 / 800 000 = 4,32 ms por trama → ≈ 231 por segundo.', 'Primero el tiempo de una trama.', { tol: 1.5 }),
    XQ('rp28', 'rp_piompy', 'Llamas a sm.get() y el programa se queda parado. ¿Por qué?', ['La RX FIFO está vacía: get espera hasta que la máquina haga push', 'La máquina está borrada', 'Falta sm.put()', 'get solo funciona en C'], 'get bloquea hasta que hay un dato.', '¿De dónde lee get?'),
    XQ('rp29', 'rp_pioc', 'pio_claim_unused_sm(pio0, false) devuelve −1. ¿Qué significa?', ['Que no queda ninguna máquina libre en pio0: prueba en pio1', 'Que la máquina 1 está libre', 'Que falta pio_add_program', 'Que el divisor es inválido'], 'Con false no se detiene: te devuelve −1 y decides tú.', 'false = «no es obligatorio».'),
    XN('rp29', 'rp_piocycles', 'destello.pio (dos instrucciones con [31]) con clk_sys = 200 MHz y divisor 25 000. ¿Frecuencia del destello, en Hz?', 125, 'Hz', 'Máquina: 200 000 000 / 25 000 = 8000 Hz; 64 ciclos por periodo → 125 Hz.', 'Primero la frecuencia de la máquina; luego entre los ciclos del periodo.', { tol: 0.2 }),
    XQ('rp29', 'rp_pioc', 'Dos máquinas del mismo bloque ejecutan el mismo programa. ¿Cuántas veces llamas a pio_add_program?', ['Una: las dos usan el mismo offset', 'Dos: una por máquina', 'Ninguna', 'Cuatro: una por máquina del bloque'], 'Así el programa solo ocupa una vez las 32 instrucciones.', 'La memoria de instrucciones es del bloque.'),
    XN('rp30', 'rp_uartproto', 'Un receptor PIO con 8 ciclos por bit detecta el flanco de inicio. ¿Cuántos ciclos después debe leer el bit 3 de datos (el cuarto)?', 36, 'ciclos', 'Bit 0 en el centro: 12 ciclos. Cada bit siguiente, 8 más: 12 + 3 × 8 = 36.', 'Bit y medio hasta el centro del bit 0; luego un bit por cada uno.'),
    XQ('rp30', 'rp_encoder', 'Si 00 → 01 → 11 → 10 es avanzar, ¿qué ha hecho el encoder con 00 → 10 → 11 → 01 → 00?', ['Retroceder 4 pasos', 'Avanzar 4 pasos', 'Nada', 'Avanzar 2 y retroceder 2'], 'Recorre el ciclo en sentido contrario.', 'Compara cada par con la secuencia de avance.'),
    XQ('rp30', 'rp_encoder', 'AB pasa de 00 a 11 directamente. ¿Qué indica?', ['Un salto imposible: se ha perdido un estado por leer lento o por ruido', 'Un paso adelante', 'Un paso atrás', 'Que el encoder está quieto'], 'En cuadratura solo cambia un bit en cada paso.', '¿Cuántos bits cambian a la vez?'),
    XQ('rp30', 'rp_piocycles', 'En tu transmisor, el camino del bit de inicio dura 9 ciclos y el de cada bit de datos, 8. ¿Problema?', ['Bits de distinta duración: el receptor desplaza su punto de lectura; cada camino debe durar lo mismo', 'Ninguno', 'Solo afecta al bit de parada', 'Que el divisor deja de valer'], 'Por eso se cuentan los ciclos de cada camino del programa.', 'El receptor espera bits todos iguales.')
  ];

  const X6 = [
    XN('rp31', 'rp_dmatime', 'El DMA captura 1024 muestras al ritmo del ADC a 50 000 muestras por segundo. ¿Cuántos ms tarda?', 20.48, 'ms', '1024 / 50 000 = 0,02048 s = 20,48 ms.', 'Muestras entre muestras por segundo.', { tol: 0.05 }),
    XN('rp31', 'rp_dmacfg', 'Copias 512 muestras de 16 bits con transferencias de 32 bits. ¿TRANS_COUNT?', 256, '', '512 × 2 bytes = 1024 bytes; / 4 = 256 transferencias.', 'Pasa todo a bytes y divide entre los bytes de cada transferencia.'),
    XQ('rp31', 'rp_dmacfg', 'Envías un búfer de texto a la UART con DMA. ¿Qué dirección avanza?', ['La de lectura (el búfer); la de escritura (el registro de la UART) queda fija', 'Las dos', 'Ninguna', 'Solo la de escritura'], 'Periférico = dirección fija; búfer = avanza.', '¿Cuál de los dos es un periférico?'),
    XQ('rp31', 'rp_dmacfg', 'Copias de RAM a RAM, pero dejaste puesto el DREQ del ADC. ¿Qué notas?', ['La copia va al ritmo del ADC, mucho más lenta, o se queda esperando si el ADC está parado', 'Nada', 'Va más rápida', 'Se corrompen los datos'], 'Entre memorias no hay que esperar a nadie: sin DREQ.', '¿Quién marca el ritmo con ese DREQ?'),
    XN('rp32', 'rp_adcdiv', '¿Qué div pasas a adc_set_clkdiv para 20 000 muestras por segundo?', 2399, '', '48 000 000 / 20 000 − 1 = 2399.', 'div = 48 MHz / f − 1.', { tol: 1 }),
    XN('rp32', 'rp_adcdiv', 'adc_set_clkdiv(239). ¿Cuántas muestras por segundo?', 200000, 'muestras/s', 'Una muestra cada 240 ciclos de 48 MHz: 48 000 000 / 240 = 200 000.', 'Recuerda el + 1.', { tol: 10 }),
    XQ('rp32', 'rp_adcdiv', '¿Qué ritmo da adc_set_clkdiv(50)?', ['500 000 muestras/s: por debajo de 96 ciclos va al máximo', '941 000 muestras/s', '960 000 muestras/s', 'Ninguno: es un error'], 'Una conversión necesita 96 ciclos de 48 MHz; un divisor más pequeño no la acelera.', 'Compara div + 1 con los 96 ciclos de una conversión.'),
    XN('rp32', 'rp_dmacfg', 'Captura de 0,5 s a 100 000 muestras por segundo en transferencias de 16 bits. ¿Cuántos KB de RAM?', 97.66, 'KB', '50 000 muestras × 2 bytes = 100 000 bytes; / 1024 ≈ 97,7 KB.', 'Muestras × bytes por muestra; luego a KB.', { tol: 0.5 }),
    XQ('rp32', 'rp_dmacfg', 'El DMA envía colores a la TX FIFO de la máquina de una WS2812, pero sin DREQ. ¿Qué pasa?', ['Escribe más rápido de lo que la máquina vacía la FIFO y se pierden colores', 'Nada', 'Los colores salen más brillantes', 'La máquina se para'], 'El DREQ de la TX FIFO hace que el canal espere a que haya hueco.', '¿Quién sabe cuándo cabe otro dato?'),
    XQ('rp45', 'rp_dmaring', '¿Qué dirección de inicio vale para un anillo de 512 bytes?', ['0x20001200', '0x20001100', '0x20001080', '0x20001010'], 'Debe ser múltiplo de 512 (0x200): 0x1200 = 9 × 0x200.', 'Comprueba si la dirección es múltiplo de 0x200.'),
    XN('rp45', 'rp_dmachain', 'Ping-pong con búferes de 1024 muestras a 200 000 muestras por segundo. ¿Cuántos ms tiene la CPU para procesar cada búfer?', 5.12, 'ms', 'Lo que tarda en llenarse el otro: 1024 / 200 000 = 5,12 ms.', 'Tiempo de llenar un búfer.', { tol: 0.02 }),
    XQ('rp45', 'rp_dmachain', 'En ping-pong, tu proceso tarda 7 ms y cada búfer se llena en 5 ms. ¿Qué pasa y cómo lo arreglas?', ['El DMA vuelve a llenar el búfer antes de que acabes: búferes mayores, muestreo más lento o proceso más rápido', 'Nada: el DMA espera a la CPU', 'Se para el ADC', 'Se pierde solo la primera muestra'], 'El presupuesto de la CPU es el tiempo de llenado del otro búfer.', 'Compara 7 ms con 5 ms.'),
    XQ('rp45', 'rp_dmaring', 'Un generador de señales lee una tabla de 256 bytes con anillo de lectura. ¿Qué hace la dirección al llegar al final?', ['Vuelve al inicio de la tabla sin que intervenga la CPU', 'Sigue leyendo memoria de después', 'Se para el canal', 'Salta a la flash'], 'El anillo deja fijos los bits altos de la dirección.', 'Así funciona un anillo.'),
    XN('rp45', 'rp_dmaring', 'Una tabla de 128 muestras de 32 bits recorrida con anillo. ¿Cuántos bits de anillo configuras?', 9, 'bits', '128 × 4 = 512 bytes = 2⁹.', 'Tamaño en bytes y luego qué potencia de 2 es.'),
    XQ('rp33', 'rp_cores', 'En MicroPython con una Pico W, ¿pondrías la WiFi en el núcleo 1 con _thread?', ['Mejor no: algunas partes, como la WiFi, suponen que todo ocurre en el núcleo 0', 'Sí, es lo recomendado', 'Sí, la WiFi solo funciona en el núcleo 1', 'No se puede usar _thread en la W'], '_thread es experimental: deja la red en el núcleo 0 y pon el trabajo pesado en el 1.', 'Recuerda la advertencia sobre _thread.'),
    XN('rp33', 'rp_corefifo', 'En un RP2040, el núcleo 0 escribe 6 palabras por ms y el 1 lee 2 por ms. La FIFO (8 palabras en este chip) empieza vacía. ¿En cuántos ms se llena?', 2, 'ms', 'Crece 6 − 2 = 4 palabras por ms: 8 / 4 = 2 ms.', 'Lo que entra menos lo que sale.'),
    XQ('rp33', 'rp_cores', 'Analizador lógico: el PIO y el DMA capturan, hay que comprimir los datos y enviarlos por USB. ¿Reparto razonable?', ['Comprimir en el núcleo 1 y atender el USB en el 0; la captura no necesita CPU', 'Todo en el núcleo 0', 'La captura en el núcleo 1 moviendo pines a mano', 'El USB en el PIO'], 'Cada núcleo a lo suyo; PIO + DMA trabajan sin CPU.', '¿Qué parte no necesita a ningún núcleo?'),
    XQ('rp33', 'rp_corefifo', 'El núcleo 0 llama a multicore_fifo_pop_blocking() y el núcleo 1 nunca envía nada. ¿Qué pasa?', ['El núcleo 0 se queda esperando para siempre', 'Devuelve 0', 'Devuelve −1', 'Se reinicia'], 'pop_blocking espera mientras la FIFO esté vacía.', 'blocking = espera.'),
    XN('rp34', 'rp_multicore', 'contador = 10. Sin cerrojo: el núcleo 0 lee, el 1 lee, el 0 suma y escribe, el 1 suma y escribe. ¿Valor final?', 11, '', 'Los dos leen 10 y los dos escriben 11: se pierde una suma.', 'Sigue lo que lee y escribe cada núcleo.'),
    XQ('rp34', 'rp_lock', '¿Qué puede pasar con este código?', ['Interbloqueo: cada núcleo tiene un cerrojo y espera el otro; tómalos en el mismo orden', 'Nada', 'Una suma perdida', 'Va más rápido'], 'La regla: siempre en el mismo orden (A y luego B) en los dos núcleos.', 'Mira en qué orden toma cada núcleo los cerrojos.', { code: '// núcleo 0\nlock(A); lock(B);\n// …\n\n// núcleo 1\nlock(B); lock(A);\n// …' }),
    XQ('rp34', 'rp_lock', '¿Por qué no sirve este cerrojo casero entre dos núcleos?', ['Los dos pueden leer ocupado = false antes de que ninguno lo ponga a true: es otra carrera', 'Sí sirve', 'Porque ocupado no es float', 'Porque falta un printf'], 'Comprobar y marcar son dos pasos; hace falta algo indivisible, como los spinlocks del hardware.', 'Leer y escribir son pasos separados.', { code: 'if (!ocupado) {\n    ocupado = true;\n    contador++;\n    ocupado = false;\n}' }),
    XQ('rp34', 'rp_multicore', 'Un núcleo solo escribe una variable de 32 bits y el otro solo la lee. ¿Se pierden actualizaciones como en contador += 1?', ['No: hay un solo escritor y cada lectura de 32 bits es entera; basta con volatile', 'Sí, siempre', 'Solo si es float', 'Sí: hace falta desactivar las interrupciones'], 'El problema de las sumas perdidas aparece cuando dos leen-modifican-escriben. Con 64 bits sí habría que proteger la lectura.', '¿Hay dos núcleos escribiendo?'),
    XQ('rp34', 'rp_lock', 'Necesitas proteger un recurso durante una operación de 50 ms. ¿critical_section o mutex?', ['Un mutex: sirve para esperas largas y no desactiva las interrupciones', 'critical_section: siempre es mejor', 'Ninguno', 'Desactivar las interrupciones 50 ms'], 'Una sección crítica larga retrasa USB, temporizadores y comunicaciones.', '¿Qué pasa con las interrupciones durante 50 ms?')
  ];

  const X7 = [
    XQ('rp35', 'rp_tinyusb', 'Tu bucle llama a tud_task() y luego lee un sensor que, si no responde, tarda 3 s. ¿Problema?', ['Esos 3 s nadie atiende el USB y el PC puede dar el dispositivo por perdido: limita la espera', 'Ninguno', 'El sensor va más rápido', 'Solo afecta al LED'], 'tud_task() debe llamarse en cada vuelta; nada debe bloquear el bucle.', '¿Qué deja de pasar mientras el bucle espera?'),
    XQ('rp35', 'rp_usbenum', 'Recién conectado, el dispositivo aún no tiene dirección propia en el bus. ¿Cuándo la recibe?', ['Tras dar su descriptor de dispositivo, cuando el anfitrión se la asigna', 'Antes de que el anfitrión reinicie el bus', 'Al cargar el controlador de la clase', 'Nunca: siempre usa la misma'], 'Reinicio, descriptor (VID y PID), dirección, configuración, controlador.', 'Recuerda el orden de la enumeración.'),
    XQ('rp35', 'rp_usb', 'Un registrador debe aparecer en el PC como una unidad para copiar sus ficheros CSV. ¿Qué clase USB?', ['MSC', 'HID', 'CDC', 'MIDI'], 'MSC es la clase de almacenamiento masivo.', 'Piensa en un pendrive.'),
    XQ('rp35', 'rp_usb', '¿Cómo puede el RP2040 leer un teclado USB?', ['Como anfitrión USB, dando 5 V al teclado por VBUS', 'No puede: solo es dispositivo', 'Solo por Bluetooth', 'Con el teclado en modo CDC'], 'El USB del RP2040 puede ser dispositivo o anfitrión.', 'Alguien tiene que hacer de «ordenador».'),
    XB('rp36', 'rp_hid', 'Bit 0 Ctrl izq., bit 1 Mayús izq., bit 2 Alt izq., bit 3 GUI izq. Forma Ctrl + Alt + GUI.', 13, '1 + 4 + 8 = 13.', 'Enciende los bits 0, 2 y 3.'),
    XN('rp36', 'rp_hid', 'El ratón debe moverse 300 a la izquierda y 200 hacia arriba, con informes de ±127 como máximo (x e y van en el mismo informe). ¿Cuántos informes, como mínimo?', 3, 'informes', 'x necesita 300 / 127 → 3 informes; y, 200 / 127 → 2. En el mismo informe van los dos: 3.', 'Manda el eje que más informes necesita.'),
    XQ('rp36', 'rp_hid', 'Quieres escribir «aa» y envías: «a pulsada», «a pulsada», soltar. ¿Qué sale?', ['Una sola a: el segundo informe es igual al primero y no hubo soltar entre medias', 'aa', 'aaa', 'Nada'], 'El informe describe el estado: hay que soltar entre las dos pulsaciones.', '¿Qué cambia entre el primer y el segundo informe?'),
    XQ('rp36', 'rp_tinyusb', 'Vas a enviar un informe y tud_hid_ready() es falso. ¿Qué haces?', ['Lo intentas en la siguiente vuelta del bucle, sin bloquear', 'Lo envías igual', 'Haces sleep_ms(1000)', 'Reinicias el USB'], 'El anfitrión aún no ha recogido el anterior; mientras, sigue llamando a tud_task().', 'No bloquees el bucle del USB.'),
    XQ('rp36', 'rp_hid', 'Pulsas 7 teclas normales a la vez en tu teclado HID estándar. ¿Qué pasa?', ['El informe solo tiene sitio para 6: una no puede enviarse', 'Se envían las 7', 'Se envían dos informes a la vez', 'Se reinicia el USB'], 'Informe estándar: 1 byte de modificadores, 1 reservado y 6 teclas.', '¿Cuántas teclas caben en un informe?'),
    XQ('rp37', 'rp_midi', '¿Qué mensaje es 0x8F, 64, 0?', ['Note Off por el canal 16, nota 64', 'Note On por el canal 15, nota 64', 'Control Change 64 por el canal 8', 'Note Off por el canal 15, nota 0'], 'Tipo 8 (Off) arriba; abajo F = 15, que es el canal 16.', 'La cifra baja es canal − 1.'),
    XN('rp37', 'rp_midi', '¿Cuál es el byte de estado de Control Change por el canal 12, en decimal?', 187, '', 'Tipo 0xB arriba y 12 − 1 = 11 (0xB) abajo: 0xBB = 187.', 'Arma el byte en hexadecimal y pásalo a decimal.'),
    XN('rp37', 'rp_bits', 'Un potenciómetro lee 3000 en el ADC de 12 bits. ¿Qué valor de Control Change envías con v >> 5?', 93, '', '3000 / 32 = 93,75 → 93 (el desplazamiento tira los decimales).', 'Desplazar 5 a la derecha es dividir entre 32 sin decimales.'),
    XQ('rp37', 'rp_adcgood', 'El ADC tiembla ±6 cuentas y envías v >> 5 directamente, sin histéresis. ¿Hace falta?', ['Sí: cerca del borde entre dos valores, el ruido hace saltar el resultado de uno a otro', 'No: 6 es menor que 32', 'No: >> 5 elimina el ruido', 'Solo si el canal es el 1'], 'Si la lectura está justo en un borde, basta una cuenta para cambiar de valor.', 'Piensa en una lectura justo entre dos pasos de 32.'),
    XN('rp37', 'rp_midi', 'MIDI clásico a 31 250 baudios: ¿cuántos ms tarda un mensaje de 3 bytes?', 0.96, 'ms', '3 × 10 bits = 30 bits; 30 / 31 250 = 0,00096 s = 0,96 ms.', 'Es una UART: 10 bits por byte.', { tol: 0.01 }),
    XQ('rp38', 'rp_radio', 'wlan.status() da STAT_NO_AP_FOUND con la red encendida. ¿Qué compruebas?', ['Que la red emita en 2,4 GHz y que el nombre sea el correcto', 'La clave', 'Que el USB esté conectado', 'La versión de Thonny'], 'La W no ve redes de 5 GHz. Una clave mala daría STAT_WRONG_PASSWORD.', 'No encuentra la red: ¿qué banda escucha la W?'),
    XQ('rp38', 'rp_netclient', 'Tras horas pidiendo datos cada minuto con requests, la Pico W se queda sin memoria. ¿Causa típica?', ['No cerrar las respuestas con r.close()', 'Usar la banda de 2,4 GHz', 'Poner rp2.country', 'Usar ntptime'], 'Cada respuesta sin cerrar retiene un socket y su memoria.', '¿Qué libera cada respuesta?'),
    XQ('rp38', 'rp_netclient', 'ntptime pone las 22:30 UTC del 31 de diciembre. ¿Qué hora es en Madrid?', ['23:30 del 31 de diciembre', '22:30 del 31 de diciembre', '00:30 del 1 de enero', '21:30 del 31 de diciembre'], 'En invierno, la Península está en UTC + 1.', '¿Horario de invierno o de verano?'),
    XQ('rp38', 'rp_wifi', 'Tu función conectar() devuelve False al arrancar. ¿Qué debería hacer el programa?', ['Seguir funcionando (guardar los datos) y reintentar más tarde', 'Quedarse en un bucle hasta conectar', 'Borrar la flash', 'Apagarse para siempre'], 'Un aparato robusto no depende de que la red esté siempre.', 'La red puede volver en un rato.'),
    XQ('rp39', 'rp_net', '¿Con qué línea de estado respondes a una ruta que no existe?', ['404 Not Found', '200 OK', '302 Found, hacia la portada', 'Ninguna: no respondes'], 'Responde siempre y cierra la conexión, aunque sea con un 404.', 'Es el código de «no encontrado».'),
    XQ('rp39', 'rp_net', 'Tu respuesta no lleva la línea en blanco entre las cabeceras y el HTML. ¿Qué pasa?', ['El navegador toma el HTML como más cabeceras y la página no se muestra bien', 'Nada', 'Va más rápido', 'Se cierra la WiFi'], 'La línea en blanco separa cabeceras y cuerpo.', '¿Qué marca el final de las cabeceras?'),
    XQ('rp39', 'rp_netsec', 'Tu servidor ejecuta cualquier orden que llegue en la URL (/cmd?run=…). ¿Riesgo?', ['Cualquiera en la red puede ejecutar lo que quiera: acepta solo acciones conocidas y valida lo que llega', 'Ninguno en casa', 'Solo que vaya lento', 'Que se gaste la flash'], 'Nunca ejecutes sin validar lo que llega por la red.', 'Piensa en quién puede escribir esa URL.'),
    XQ('rp39', 'rp_net', 'Tu página pide fetch(\'/api\') cada 2 s para mostrar la temperatura. ¿Qué devuelve /api?', ['Un JSON con Content-Type: application/json', 'La página HTML completa', 'Un 404', 'Nada: fetch no espera respuesta'], 'Datos en JSON; la presentación la hace la página.', 'Datos para programas, no para personas.'),
    XN('rp40', 'rp_struct', '−12,5 °C en centésimas, en un entero de 16 bits con signo. ¿Qué valor sin signo forman sus dos bytes, en decimal?', 64286, '', '−12,5 × 100 = −1250; en complemento a dos: 65 536 − 1250 = 64 286.', 'Negativo: súmale 65 536.'),
    XN('rp40', 'rp_struct', 'La característica 0x2A6E envía 0x34 y 0x08 (primero el byte bajo). ¿Qué temperatura es, en °C?', 21, '°C', '0x0834 = 2100 centésimas = 21,00 °C.', 'Junta los bytes poniendo el segundo arriba y divide entre 100.', { tol: 0.01 }),
    XQ('rp40', 'rp_ble', 'Un sensor a pilas que el móvil consulta una vez por hora. ¿Mejor estrategia de radio?', ['Anunciarse de vez en cuando y conectar solo cuando haga falta', 'Mantener la conexión siempre abierta', 'Anunciarse sin parar a máxima potencia', 'Usar la WiFi en su lugar'], 'Estar siempre conectado gasta mucho más.', '¿Qué gasta menos: anuncios espaciados o conexión permanente?'),
    XQ('rp40', 'rp_radio', 'Para ganar alcance, cambias la antena de la Pico W por una más grande soldada. ¿Problema?', ['El equipo deja de estar homologado y puedes pasarte de la potencia permitida', 'Ninguno', 'La WiFi deja de usar 2,4 GHz', 'Que necesita licencia de radioaficionado siempre'], 'La banda libre tiene límites que el módulo homologado ya cumple tal cual.', '¿Qué cambia si tocas la antena?'),
    XQ('rp40', 'rp_ble', 'El móvil lee la temperatura, pero no recibe los cambios solo. ¿Qué falta?', ['Que el móvil se suscriba a las notificaciones y que la Pico las envíe (send_update=True)', 'Que la Pico escanee', 'Conectar la WiFi', 'Cambiar el UUID cada vez'], 'Notificaciones: el central se suscribe y el periférico avisa.', '¿Cómo avisa el periférico sin que pregunten?')
  ];

  const X8 = [
    XQ('rp41', 'rp_sleep', 'Un nodo debe recordar un contador entre medidas y despertar cada minuto por tiempo. ¿lightsleep o deepsleep?', ['lightsleep: conserva las variables; con deepsleep habría que guardar el contador en un fichero', 'deepsleep: conserva las variables', 'Ninguno: hay que quedarse despierto', 'dormant con un temporizador'], 'deepsleep reinicia el programa al despertar.', '¿Cuál sigue en la línea siguiente?'),
    XQ('rp41', 'rp_sleep', 'Un pluviómetro da un pulso por cada vaciado y el nodo debe dormir lo más profundo posible entre pulsos. ¿Modo?', ['Dormant, despertando con el flanco del pulso en un GPIO', 'lightsleep con temporizador', 'Activo con un bucle', 'deepsleep de 1 ms'], 'Dormant para hasta los osciladores; un flanco en un GPIO lo despierta.', '¿Qué despierta de dormant?'),
    XQ('rp41', 'rp_lowpower', 'Pusiste GP23 a 1 para medir mejor con el ADC y lo dejas así mientras el nodo duerme. ¿Efecto?', ['Más consumo en reposo: el regulador se queda en modo PWM', 'Menos consumo', 'Ninguno', 'Que no despierta'], 'El modo de ahorro (GP23 a 0) es el eficiente con poca carga.', '¿Qué modo del regulador es mejor con poca carga?'),
    XQ('rp41', 'rp_sleep', 'Al salir de dormant, ¿qué hay que hacer antes de usar el USB o los temporizadores?', ['Volver a poner en marcha los relojes', 'Nada', 'Grabar de nuevo el UF2', 'Pulsar BOOTSEL'], 'En dormant se paran los osciladores; al despertar hay que restaurarlos.', '¿Qué se paró al entrar en dormant?'),
    XQ('rp41', 'rp_sleep', '¿Qué valores envía este programa?', ['Siempre 1: cada deepsleep reinicia el programa y n vuelve a 0', '1, 2, 3…', 'Siempre 0', 'Nada'], 'Para contar entre despertares, guarda n en un fichero.', 'Al despertar de deepsleep, ¿por dónde empieza?', { code: 'n = 0\nwhile True:\n    n += 1\n    enviar(n)\n    machine.deepsleep(60000)' }),
    XN('rp42', 'rp_avg', '40 mA durante 2 s cada 10 min y 0,05 mA el resto. ¿Consumo medio, en mA?', 0.183, 'mA', 'Despierto: 40 × 2 / 600 = 0,133. Dormido: 0,05 × 598 / 600 ≈ 0,050. Media ≈ 0,183 mA.', 'Pondera cada consumo por su tiempo dentro de los 600 s.', { tol: 0.005 }),
    XN('rp42', 'rp_avg', 'Media de 0,25 mA y una batería de 2500 mAh. ¿Cuántos días dura en el caso ideal?', 416.7, 'días', '2500 / 0,25 = 10 000 h; / 24 ≈ 417 días.', 'Capacidad entre consumo da horas; luego a días.', { tol: 2 }),
    XQ('rp42', 'rp_avg', '20 mA despierto 1 s cada 60 s y 0,2 mA dormido. ¿Qué ahorra más: acortar lo despierto a 0,5 s o bajar el dormido a 0,1 mA?', ['Acortar lo despierto: baja la media unos 0,17 mA frente a unos 0,1', 'Bajar el dormido', 'Igual', 'Ninguno cambia la media'], 'Despierto: 20 × 1 / 60 = 0,33 → 0,17 mA. Dormido: ≈ 0,20 → 0,10 mA.', 'Calcula la aportación de cada parte antes y después.'),
    TU('Ajusta el nodo para que su consumo medio quede por debajo de 0,1 mA.', 'rp_avgv', P.avg(), { q: 'avg', min: 0, max: 0.1, text: 'Objetivo: media < 0,1 mA', hint: 'Mira qué término no baja nunca de su valor.' }, 'Con 0,1 mA dormido la media nunca baja de 0,1: hay que dormir a 0,01 mA y despertar poco.', { c: 'rp_avg', h: 'El consumo dormido pone un suelo a la media.', l: 'rp42' }),
    XQ('rp42', 'rp_power', 'Dos AA alcalinas casi gastadas dan 2,0 V en total. ¿Sigue funcionando la Pico?', ['Sí: VSYS admite desde 1,8 V y el buck-boost sube a 3,3 V', 'No: hacen falta 3,3 V', 'Solo si las pasas a 3V3(OUT)', 'Solo con el USB'], 'Por eso la Pico aprovecha casi toda la carga de las pilas.', 'Mira el rango de VSYS.'),
    XN('rp42', 'rp_power', 'Tres AA directas a VSYS, sin diodo. ¿Por debajo de qué tensión por pila deja de funcionar la Pico, en V?', 0.6, 'V', 'VSYS mínimo 1,8 V entre 3 pilas: 0,6 V cada una.', 'Reparte el mínimo de VSYS entre las pilas.', { tol: 0.01 }),
    XN('rp43', 'rp_crystal', 'Cristal con CL = 16 pF y unos 4 pF de parásitos. ¿Qué condensadores de carga calculas, en pF?', 24, 'pF', 'C = 2 × (16 − 4) = 24 pF (normalizado: 22 o 27 pF; mira cuál queda más cerca de CL).', 'C = 2 × (CL − parásitos).', { tol: 0.5 }),
    XQ('rp43', 'rp_hw', 'En tu esquema unes DVDD directamente a 3,3 V en vez de a VREG_VOUT. ¿Qué pasa?', ['Superas la tensión del núcleo (1,1 V) y puedes dañar el chip', 'Nada: va más rápido', 'El regulador lo corrige', 'Solo falla el USB'], 'DVDD es el núcleo digital: recibe el 1,1 V del regulador interno.', '¿A qué tensión trabaja el núcleo?'),
    XQ('rp43', 'rp_hwflash', 'Eliges la flash para tu placa. ¿Qué criterio es imprescindible?', ['Que sea QSPI y compatible con el arranque del RP2040, como la familia W25Q', 'Que sea la más grande posible, aunque pase de 16 MB', 'Que sea paralela de 8 bits', 'Que sea una EEPROM I²C'], 'La ROM arranca desde flash QSPI compatible, hasta 16 MB.', 'El chip habla con la flash por un bus concreto.'),
    XQ('rp43', 'rp_layout', '¿Dónde van los condensadores de desacoplo de 100 nF?', ['Pegados a cada pata de alimentación, con una vía corta a masa', 'Todos juntos junto al conector USB', 'Al otro lado de la placa, lejos del chip', 'Solo uno en el regulador'], 'Cuanto más cerca de la pata, mejor filtran los picos.', 'Su trabajo es dar corriente al chip al instante.'),
    XQ('rp43', 'rp_crystal', 'Pones 33 pF a un cristal de CL = 12 pF. ¿Qué esperas?', ['Demasiada carga: oscila algo por debajo de 12 MHz o le cuesta arrancar', 'Nada', 'Oscila más rápido', 'Que el USB va mejor'], 'Con 4 pF de parásitos, 33 pF dan unos 20,5 pF de carga: muy por encima de 12.', 'Calcula la carga que ve el cristal: C / 2 + parásitos.'),
    XQ('rp44', 'rp_bringup', 'Con la fuente limitada a 100 mA, tu placa nueva consume justo 100 mA y los 3,3 V caen a 0,4 V. ¿Qué indica?', ['Un cortocircuito: puente de soldadura o componente al revés; no sigas sin encontrarlo', 'Que todo va bien', 'Que falta el programa', 'Que el cristal no oscila'], 'Por eso se alimenta con corriente limitada la primera vez.', 'La fuente está dando todo lo que puede.'),
    XO('rp44', 'rp_bringup', 'Ordena la puesta en marcha de una placa nueva.', ['Inspección visual y continuidad entre 3,3 V y masa', 'Alimentar con corriente limitada y medir 3,3 V', 'Medir 1,1 V en DVDD', 'Pulsar BOOTSEL y ver la unidad RPI-RP2', 'Grabar un parpadeo en UF2', 'Probar los periféricos uno a uno'], 'Cada paso descarta una parte antes de pasar a la siguiente.', 'De lo más básico (sin alimentar) a lo más complejo.'),
    XQ('rp44', 'rp_layout', 'Bajo las líneas USB, el plano de masa queda partido por otras pistas. ¿Riesgo?', ['La señal pierde su camino de retorno: más ruido e interferencias, y el USB puede fallar', 'Ninguno', 'Que el USB va más rápido', 'Solo estética'], 'Plano de masa continuo, sobre todo bajo señales rápidas.', '¿Por dónde vuelve la corriente de una señal rápida?'),
    XQ('rp44', 'rp_product', 'Quieres vender 50 macroteclados con el VID/PID de los ejemplos del SDK. ¿Problema?', ['Usas identificadores ajenos: pide un PID propio (Raspberry Pi los concede bajo su VID)', 'Ninguno', 'Que el USB no funciona', 'Que hace falta licencia de radio'], 'Para pruebas personales vale; para vender, identificadores propios.', '¿De quién son esos números?'),
    XQ('rp44', 'rp_hw', 'Un cargador USB-C no enciende tu placa, pero con un cable USB-A a C sí funciona. ¿Qué revisas?', ['Las resistencias de 5,1 kΩ de CC1 y CC2 a masa', 'Las de 27 Ω de D+ y D−', 'El cristal', 'La flash'], 'Sin ellas, una fuente USB-C no sabe que debe dar 5 V; un cable A a C da 5 V siempre.', '¿Qué le dice a un cargador USB-C que hay un aparato?'),
    XQ('rp44', 'rp_product', '¿Cómo proteges la placa por si alguien conecta la batería al revés?', ['Con un MOSFET o un diodo de protección de polaridad en la entrada', 'Nada: el RP2040 lo aguanta', 'Con un condensador de 1 pF', 'Con las resistencias del USB'], 'Polaridad, fusible y TVS: las protecciones de un producto.', 'Piensa en una protección de la alimentación.')
  ];

  TRACKS.push({
    id: 'rp2040',
    title: 'Raspberry Pi Pico a fondo',
    short: 'Pico',
    desc: 'De MicroPython al PIO: dos núcleos, DMA, USB, WiFi y tu propia placa con el RP2040 y el RP2350.',
    color: '#C51A4A',
    icon: 'chip',
    level: 'Intermedio → avanzado',
    units: [
      { id: 'rp-m1', title: 'La placa y el chip', desc: 'RP2040 y RP2350, la familia Pico, el pinout, la alimentación, el arranque por UF2 y la flash con su caché XIP.', nodes: M1, exam: X1 },
      { id: 'rp-m2', title: 'MicroPython desde cero', desc: 'Del C de Arduino a Python: REPL, tipos, bucles, funciones, listas, pines, tiempo, errores y ficheros.', nodes: M2, exam: X2 },
      { id: 'rp-m3', title: 'Periféricos en MicroPython', desc: 'PWM, ADC, sensor de temperatura, temporizadores, interrupciones, I²C, SPI, UART y asyncio.', nodes: M3, exam: X3 },
      { id: 'rp-m4', title: 'El SDK en C', desc: 'CMake y pico-sdk, GPIO, relojes, PWM por slices, temporizadores e interrupciones y depuración por SWD.', nodes: M4, exam: X4 },
      { id: 'rp-m5', title: 'PIO a fondo', desc: 'Las máquinas de estados que hacen único al RP2040: instrucciones, FIFOs, side-set y diseño de protocolos.', nodes: M5, exam: X5 },
      { id: 'rp-m6', title: 'DMA y los dos núcleos', desc: 'Mover datos sin la CPU, encadenar canales y anillos, repartir trabajo entre núcleos y evitar carreras.', nodes: M6, exam: X6 },
      { id: 'rp-m7', title: 'USB y conectividad', desc: 'TinyUSB: teclados, MIDI y puertos serie. Pico W: WiFi, servidor web y Bluetooth LE.', nodes: M7, exam: X7 },
      { id: 'rp-m8', title: 'Bajo consumo y producto', desc: 'Medir y reducir el consumo, calcular autonomías y diseñar tu propia placa con el RP2040.', nodes: M8, exam: X8 }
    ]
  });
})();
