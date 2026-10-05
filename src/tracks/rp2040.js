/* Voltio · especialidad: Raspberry Pi Pico (RP2040 y RP2350).
   De Arduino a MicroPython, y de ahí al SDK en C, el PIO, el DMA, los dos núcleos, USB,
   WiFi/BLE, bajo consumo y tu propia placa. Texto, ejercicios, programas y proyectos originales. */
(() => {
  const { pick, ri, fmt, MC, N } = Gen.helpers;
  const { num } = Widgets.H;
  const fHz = f => f >= 1e6 ? num(f / 1e6, 3) + ' MHz' : f >= 1e3 ? num(f / 1e3, 2) + ' kHz' : num(f, 2) + ' Hz';

  /* ===================== CONCEPTOS ===================== */
  Object.assign(CONCEPTS, {
    rp_board: { name: 'La Pico por dentro', alts: [
      { title: 'Un chip y piezas alrededor', text: 'El RP2040 no lleva memoria flash dentro. Tu programa vive en un chip de flash <b>QSPI</b> aparte (2 MB en la Pico) y el procesador lo lee “sobre la marcha” gracias a una caché: es el <b>XIP</b>, ejecutar en el sitio.\nLa RAM (264 KB) sí está dentro, y se borra al quitar la alimentación.', q: mcq('¿Dónde se guarda tu programa en una Pico?', ['En una flash QSPI externa al RP2040', 'En una flash interna del RP2040', 'En la SRAM, y se pierde al apagar', 'En el conector USB'], 'Sin flash externa, el RP2040 solo puede arrancar en modo BOOTSEL desde su ROM.') },
      { title: 'Comparado con la Uno', text: 'ATmega328P: un núcleo de 8 bits a 16 MHz, 2 KB de RAM, 32 KB de flash, pines de 5 V.\nRP2040: <b>dos núcleos de 32 bits</b> a 133 MHz (hoy certificados hasta 200 MHz), 264 KB de RAM, 2 MB de flash en la placa, pines de <b>3,3 V</b>.\nMás potencia a cambio de tener cuidado con los niveles de tensión.', q: mcq('Al pasar de la Uno a la Pico, ¿qué tienes que vigilar sí o sí?', ['Que sus pines trabajan a 3,3 V y el RP2040 no tolera 5 V', 'Que tiene menos RAM', 'Que es más lenta', 'Que no tiene entradas analógicas'], 'Un sensor de 5 V conectado directo puede dañar el pin.') }
    ] },
    rp_power: { name: 'Alimentar la Pico', alts: [
      { title: 'Tres puertas', text: '<b>VBUS</b>: los 5 V que llegan por el USB.\n<b>VSYS</b>: la entrada del regulador de la placa; admite de 1,8 a 5,5 V.\n<b>3V3</b>: la salida regulada, para tus sensores (mejor por debajo de unos 300 mA).\nPilas o baterías: siempre a VSYS, nunca a 3V3 ni a un GPIO.', q: mcq('Quieres alimentar la Pico con tres pilas AA (unos 4,5 V). ¿Dónde las conectas?', ['A VSYS, mejor a través de un diodo Schottky', 'A 3V3', 'A cualquier GPIO', 'A ADC_VREF'], 'VSYS pasa por el regulador buck-boost; 3V3 es su salida.') },
      { title: 'El diodo que evita peleas', text: 'En la placa, VBUS llega a VSYS a través de un <b>diodo Schottky</b>. Si añades una batería a VSYS a través de otro Schottky, las dos fuentes quedan en “O”: manda la de mayor tensión y ninguna empuja corriente hacia la otra.\nSin ese diodo, el USB podría intentar cargar tus pilas alcalinas.', q: mcq('¿Para qué sirve el Schottky entre la batería y VSYS?', ['Para que USB y batería no se empujen corriente entre sí', 'Para subir la tensión', 'Para que la batería se cargue por USB', 'Para filtrar el ruido de la WiFi'], 'Es una “O” de diodos: gana la fuente más alta, con solo unos 0,3 V de caída.') }
    ] },
    rp_python: { name: 'MicroPython', alts: [
      { title: 'Bloques por sangría', text: 'En C los bloques van entre llaves. En Python los marca la <b>sangría</b>: todo lo que está más a la derecha después de una línea terminada en dos puntos (<b>:</b>) pertenece a ese if, while, for o def.\nMezclar tabuladores y espacios, o descuadrar un espacio, cambia el significado o da IndentationError.', q: mcq('¿Qué indica el final de un bloque en Python?', ['Volver a la sangría anterior', 'Una llave de cierre', 'Un punto y coma', 'La palabra end'], 'La sangría no es estética: es la sintaxis.') },
      { title: 'Interpretado y dinámico', text: 'MicroPython no se compila en tu ordenador: el intérprete que vive en la flash lee tu código y lo ejecuta. Ventajas: pruebas al instante en el REPL y no declaras tipos. Precio: va del orden de decenas de veces más lento que C y los errores aparecen <b>cuando se ejecuta la línea</b>, no antes.', q: mcq('Escribes una función con un error de nombre de variable, pero nunca la llamas. ¿Qué pasa?', ['Nada: el error solo salta cuando la función se ejecuta', 'No se carga el programa', 'La Pico se reinicia', 'El compilador lo marca en rojo'], 'Por eso hay que probar todos los caminos del código.') }
    ] },
    rp_pwmslice: { name: 'PWM por slices', alts: [
      { title: 'Parejas que comparten reloj', text: 'El RP2040 tiene <b>8 slices</b> de PWM, cada uno con dos canales (A y B). Los dos canales de un slice comparten contador, divisor y <b>wrap</b>, así que tienen la <b>misma frecuencia</b>; lo que puede ser distinto es el ciclo de trabajo.\nGPIO n → slice (n ÷ 2) mod 8; canal A si n es par, B si es impar.', q: mcq('Quieres GP2 a 50 Hz para un servo y GP3 a 1 kHz para un zumbador. ¿Se puede?', ['No: GP2 y GP3 son el mismo slice y comparten frecuencia', 'Sí, cada pin tiene su propio PWM', 'Sí, si usas duty_u16', 'Solo en la Pico W'], 'Mueve el zumbador a un pin de otro slice, por ejemplo GP4.') },
      { title: 'El contador y la regla', text: 'Cada slice tiene un contador que sube de 0 a <b>wrap</b> y vuelve a 0. La salida está alta mientras el contador es menor que el <b>nivel</b>.\nFrecuencia = clk_sys / ((wrap + 1) × divisor).\nResolución: hay wrap + 1 niveles distintos. Más frecuencia con el mismo reloj significa menos resolución.', q: mcq('clk_sys = 125 MHz, divisor 1 y wrap 999. ¿Frecuencia?', ['125 kHz', '125 MHz', '1 kHz', '125,1 kHz'], '125 000 000 / 1000 = 125 000 Hz.') }
    ] },
    rp_adc16: { name: 'ADC y read_u16', alts: [
      { title: 'Una regla de 4096 marcas, estirada', text: 'El ADC del RP2040 es de <b>12 bits</b>: 4096 valores. MicroPython lo devuelve escalado a 16 bits (0–65535) con <b>read_u16()</b> para que el mismo código sirva en otros chips.\nNo ganas precisión: el número avanza a saltos de unos 16.', q: mcq('¿Cuántos valores distintos puede dar de verdad read_u16() en un RP2040?', ['Unos 4096', '65 536', '1024', '256'], 'El escalado no inventa resolución.') },
      { title: 'De número a voltios', text: 'Con la referencia de 3,3 V: <b>V = lectura × 3,3 / 65535</b>.\nEjemplo: 32768 → 1,65 V, justo la mitad.\nSi conoces mejor la tensión real de ADC_VREF (mídela), úsala en lugar de 3,3: es la forma más sencilla de calibrar.', q: mcq('read_u16() devuelve 16384. ¿Tensión aproximada?', ['0,83 V', '1,65 V', '0,41 V', '13,2 V'], '16384 / 65535 × 3,3 ≈ 0,83 V.') }
    ] },
    rp_irq: { name: 'Interrupciones en MicroPython', alts: [
      { title: 'El timbre de la puerta', text: 'Una interrupción es un timbre: dejas lo que haces, abres, apuntas quién era y vuelves. Si te pones a charlar en la puerta, se te quema la comida.\nEn el <b>handler</b> haz lo mínimo: guarda el instante o sube una bandera. El trabajo pesado, en el bucle principal.', q: mcq('¿Qué es lo correcto dentro de un handler de Pin.irq?', ['Anotar el evento en una variable y salir', 'Actualizar la pantalla OLED', 'Esperar con sleep a que pase el rebote', 'Escribir en un fichero'], 'Rápido y sin bloquear.') },
      { title: 'Duro o blando', text: 'En el RP2040, MicroPython ejecuta por defecto los handlers de pin como “blandos”: se <b>programan</b> para correr en cuanto el intérprete pueda (unos microsegundos o más de retraso).\nCon <b>hard=True</b> corren al instante, pero <b>no pueden reservar memoria</b>: nada de crear floats, listas o cadenas. Los enteros pequeños sí valen.', q: mcq('¿Qué falla dentro de un handler con hard=True?', ['Crear objetos nuevos, como un float o una lista', 'Leer el valor de un pin', 'Sumar 1 a un entero global', 'Poner un pin a 1'], 'Si necesitas hacer algo pesado, usa micropython.schedule.') }
    ] },
    rp_async: { name: 'Multitarea cooperativa', alts: [
      { title: 'El camarero que no espera', text: 'Un buen camarero no se queda mirando cómo come un cliente: toma nota, pasa a otra mesa y vuelve. Cada <b>await</b> es ese “paso a otra mesa”.\nSi una tarea llama a time.sleep() o a un bucle largo sin await, el camarero se queda plantado y nadie más es atendido.', q: mcq('Dentro de una tarea de asyncio escribes time.sleep(1). ¿Qué ocurre?', ['Todas las tareas se congelan un segundo', 'Solo esa tarea espera', 'Da error de sintaxis', 'La Pico se reinicia'], 'Usa await asyncio.sleep(1).') },
      { title: 'Turnos voluntarios', text: 'asyncio no reparte el tiempo a la fuerza: cada tarea <b>cede</b> el turno cuando hace await. Por eso no hay condiciones de carrera entre dos líneas sin await, pero una tarea egoísta bloquea a todas.\n<b>create_task()</b> lanza una tarea; <b>asyncio.run()</b> arranca el planificador.', q: mcq('¿Cuándo cambia asyncio de una tarea a otra?', ['Solo cuando la tarea actual hace await', 'Cada milisegundo, a la fuerza', 'Cuando llega una interrupción', 'Nunca: las ejecuta en paralelo en los dos núcleos'], 'Es multitarea cooperativa, en un solo núcleo.') }
    ] },
    rp_sdk: { name: 'Compilar con el pico-sdk', alts: [
      { title: 'De main.c a UF2', text: '1) <b>CMake</b> lee CMakeLists.txt y prepara la compilación. 2) <b>arm-none-eabi-gcc</b> compila tu C y las partes del SDK que enlazas. 3) Sale un <b>.elf</b> (con símbolos, para depurar) y un <b>.uf2</b> (para arrastrar en modo BOOTSEL).', q: mcq('¿Qué fichero usas para depurar con GDB?', ['El .elf', 'El .uf2', 'CMakeLists.txt', 'El .pio'], 'El .elf conserva nombres de funciones y líneas.') },
      { title: 'Bibliotecas a la carta', text: 'El SDK está troceado en bibliotecas. Solo se compila lo que pides en <b>target_link_libraries</b>: pico_stdlib para lo básico, hardware_pwm para PWM, hardware_adc, hardware_dma, pico_multicore…\nSi usas una función y olvidas su biblioteca, el error sale al enlazar o al no encontrar la cabecera.', q: mcq('Usas pwm_set_wrap() y la compilación dice que no encuentra hardware/pwm.h. ¿Qué falta?', ['Añadir hardware_pwm a target_link_libraries', 'Reinstalar el compilador', 'Poner la Pico en BOOTSEL', 'Cambiar a MicroPython'], 'Enlazar la biblioteca también añade sus cabeceras.') }
    ] },
    rp_clock: { name: 'Relojes del RP2040', alts: [
      { title: 'Multiplicar y dividir', text: 'El cristal de la Pico da 12 MHz. Un <b>PLL</b> lo multiplica (FBDIV) hasta un VCO de 750–1600 MHz y luego lo divide dos veces (POSTDIV1 y POSTDIV2).\n12 MHz × 125 = 1500 MHz; ÷ 6 ÷ 2 = <b>125 MHz</b>.', q: mcq('FBDIV = 100, POSTDIV1 = 5, POSTDIV2 = 5. ¿Frecuencia de salida?', ['48 MHz', '1200 MHz', '240 MHz', '120 MHz'], '12 × 100 = 1200 MHz; ÷ 25 = 48 MHz: el reloj del USB.') },
      { title: 'Todo cuelga de clk_sys', text: 'Los núcleos, el bus, el DMA, el <b>PIO</b> y el <b>PWM</b> funcionan con clk_sys. Si cambias clk_sys (por ejemplo, de 125 a 200 MHz), tu PWM y tus programas PIO cambian de velocidad: hay que recalcular sus divisores.\nEl USB y el ADC usan su propio reloj de 48 MHz, que no cambia.', q: mcq('Subes clk_sys de 125 a 250 MHz sin tocar nada más. Tu PWM de 1 kHz pasa a…', ['2 kHz', '1 kHz', '500 Hz', 'Se para'], 'El contador del PWM avanza al doble de velocidad.') }
    ] },
    rp_pio: { name: 'PIO', alts: [
      { title: 'Mini procesadores de pines', text: 'Cada bloque PIO tiene <b>4 máquinas de estados</b> que ejecutan un programa diminuto (máximo 32 instrucciones por bloque) con <b>un ciclo por instrucción</b>, sin que la CPU intervenga. Hablan con la CPU por colas <b>FIFO</b>.\nResultado: protocolos con temporización exacta aunque la CPU esté ocupada.', q: mcq('¿Por qué un protocolo hecho con PIO no tiembla aunque la CPU esté ocupada?', ['Porque la máquina de estados ejecuta su programa sola, ciclo a ciclo', 'Porque desactiva las interrupciones', 'Porque usa el segundo núcleo', 'Porque va a 1 GHz'], 'La CPU solo llena y vacía las FIFO.') },
      { title: 'Contar ciclos', text: 'Todo en PIO es aritmética de ciclos: cada instrucción dura 1 ciclo más su retardo [n]. Si un bit dura 8 ciclos, la frecuencia de la máquina debe ser 8 × baudios.\n<b>Divisor = clk_sys / (baudios × ciclos por bit)</b>.', q: mcq('clk_sys = 125 MHz, 8 ciclos por bit, 9600 baudios. ¿Divisor?', ['1627,6', '13 020,8', '203,5', '0,0006'], '125 000 000 / (9600 × 8) ≈ 1627,6.') }
    ] },
    rp_dma: { name: 'DMA', alts: [
      { title: 'Una cinta transportadora', text: 'Sin DMA, la CPU es un mozo que lleva cada caja del camión al almacén: no puede hacer otra cosa. El <b>DMA</b> es una cinta transportadora: la configuras una vez (de dónde, a dónde, cuántas) y mueve los datos sola mientras la CPU calcula.', q: mcq('¿Qué gana tu programa al capturar el ADC con DMA?', ['La CPU queda libre mientras se llenan los datos', 'El ADC pasa a tener 16 bits', 'Consume el doble', 'Las muestras salen ordenadas al revés'], 'Además, el ritmo de muestreo no depende de tu bucle.') },
      { title: 'Las cinco preguntas', text: 'Para configurar un canal respondes: ¿<b>de dónde</b> lee? ¿<b>a dónde</b> escribe? ¿<b>cuántas</b> transferencias? ¿de qué <b>tamaño</b> (8, 16 o 32 bits)? ¿<b>cuándo</b> avanza (DREQ: “cuando el periférico tenga dato o hueco”)?\nY si las direcciones se incrementan o no: un periférico es una dirección fija; un búfer avanza.', q: mcq('Copias del FIFO del ADC a un búfer. ¿Qué dirección se incrementa?', ['Solo la de escritura (el búfer)', 'Solo la de lectura (el FIFO)', 'Las dos', 'Ninguna'], 'El FIFO es siempre la misma dirección.') }
    ] },
    rp_multicore: { name: 'Dos núcleos y datos compartidos', alts: [
      { title: 'Dos cocineros, un cuaderno', text: 'Dos cocineros apuntan raciones en el mismo cuaderno. Los dos leen “10”, los dos suman uno y los dos escriben “11”: se ha perdido una ración.\n“contador += 1” es en realidad <b>leer, sumar, escribir</b>. Si los dos núcleos lo hacen a la vez, se pierden incrementos: es una <b>condición de carrera</b>.', q: mcq('Dos núcleos suman 1000 veces cada uno a la misma variable sin protección. El resultado…', ['Puede ser menor que 2000', 'Siempre es 2000', 'Siempre es 1000', 'Es mayor que 2000'], 'Algunas sumas se pisan.') },
      { title: 'El cerrojo', text: 'Un <b>cerrojo</b> (spinlock o mutex) hace que solo un núcleo a la vez entre en la <b>sección crítica</b>. El otro espera.\nReglas: secciones críticas cortas, nunca esperar algo lento dentro y, si puedes, pasar mensajes por la <b>FIFO entre núcleos</b> en vez de compartir variables.', q: mcq('¿Qué NO debes hacer con un cerrojo tomado?', ['Esperar a que llegue un dato por el puerto serie', 'Sumar 1 a un contador', 'Copiar una estructura pequeña', 'Leer una variable compartida'], 'El otro núcleo se queda girando mientras esperas.') }
    ] },
    rp_usb: { name: 'USB de dispositivo', alts: [
      { title: 'Presentarse al ordenador', text: 'Al enchufar, el ordenador pregunta “¿quién eres?” y tu Pico responde con <b>descriptores</b>: fabricante (VID), producto (PID), y qué <b>clases</b> ofrece: HID (teclado, ratón), MIDI, CDC (puerto serie)…\nComo esas clases son estándar, no hace falta instalar controladores.', q: mcq('¿Por qué un macroteclado hecho con la Pico funciona sin instalar nada?', ['Porque se presenta como HID, una clase estándar', 'Porque copia el driver del teclado', 'Porque usa la WiFi', 'Porque el RP2040 lleva Windows'], 'El sistema ya trae el controlador HID.') },
      { title: 'Informes y teclas soltadas', text: 'Un teclado HID envía <b>informes</b>: un byte de modificadores (Ctrl, Mayús…) y hasta 6 teclas pulsadas a la vez. Lo que cuenta es el <b>estado</b>: si envías “C pulsada” y nunca envías “nada pulsado”, el ordenador cree que sigues apretando y repite la letra.', q: mcq('Tu macroteclado escribe “cccccccc” sin parar tras pulsar. ¿Qué falta?', ['Enviar un informe vacío al soltar', 'Más corriente en el USB', 'Antirrebote en el ordenador', 'Cambiar el PID'], 'Pulsar y soltar son dos informes.') }
    ] },
    rp_net: { name: 'Red en la Pico W', alts: [
      { title: 'Cliente y servidor', text: 'Un <b>servidor</b> espera conexiones en un puerto (el 80 para HTTP). Un <b>cliente</b> (tu navegador) se conecta, envía una petición (“GET / HTTP/1.1”) y espera una respuesta: una línea de estado, cabeceras, una línea en blanco y el contenido.', q: mcq('En una respuesta HTTP, ¿qué separa las cabeceras del contenido?', ['Una línea en blanco', 'Un punto y coma', 'Nada', 'La palabra BODY'], 'Si la olvidas, el navegador se lía.') },
      { title: 'La red es frágil', text: 'La WiFi se cae, el router reinicia y la Pico pierde la IP. Un programa serio comprueba <b>wlan.isconnected()</b>, reintenta con pausas crecientes y nunca se queda bloqueado esperando.\nY la seguridad: una Pico sin cifrado ni contraseña solo debe servir en tu red local, nunca abierta a Internet.', q: mcq('¿Qué debe hacer tu estación si la WiFi se cae de madrugada?', ['Detectarlo y reconectar sola, con reintentos espaciados', 'Esperar a que la reinicies', 'Borrar la configuración', 'Abrir un puerto en el router'], 'Robustez antes que funciones nuevas.') }
    ] },
    rp_lowpower: { name: 'Bajo consumo', alts: [
      { title: 'Media ponderada', text: 'Un sensor que despierta 1 s cada minuto pasa el 98 % del tiempo dormido. El consumo medio es:\n<b>I media = (I activa × t activa + I dormida × t dormida) / periodo</b>.\nCon 25 mA activa y 1 mA dormida: (25 × 1 + 1 × 59) / 60 = 1,4 mA. ¡Manda el consumo dormido!', q: mcq('¿Qué reduce más la media en ese ejemplo?', ['Bajar el consumo dormido', 'Bajar el consumo activo a la mitad', 'Usar un cable USB más corto', 'Subir clk_sys'], 'Bajar la dormida de 1 a 0,1 mA deja la media en unos 0,5 mA.') },
      { title: 'Qué se apaga', text: '<b>sleep</b>: la CPU para, pero los relojes siguen y despiertas con un temporizador o interrupción.\n<b>dormant</b>: se paran incluso los osciladores; casi nada consume y solo despiertas con un flanco en un pin (o un reloj externo).\nEn la placa Pico, además, consumen el regulador y el LED de alimentación… si lo hubiera: mide siempre la placa entera.', q: mcq('¿Qué te despierta del modo dormant?', ['Un flanco en un GPIO', 'Un temporizador interno normal', 'Un mensaje por USB', 'Nada: hay que desconectar la batería'], 'Con los osciladores parados no hay temporizadores.') }
    ] },
    rp_hw: { name: 'Diseñar con el RP2040', alts: [
      { title: 'Lo mínimo para arrancar', text: 'El RP2040 necesita: <b>3,3 V</b> estables (un regulador), sus <b>condensadores de desacoplo</b>, un <b>cristal de 12 MHz</b>, una <b>flash QSPI</b> y el USB con sus resistencias de 27 Ω. El núcleo de 1,1 V lo genera su propio regulador interno, con un condensador de 1 µF a la entrada y otro a la salida.', q: mcq('¿Qué pieza NO es imprescindible en tu placa mínima con RP2040?', ['Un chip WiFi', 'La flash QSPI', 'El cristal de 12 MHz (si usas USB)', 'Los condensadores de desacoplo'], 'Sin flash no hay programa; sin cristal, el USB no tiene reloj fiable.') },
      { title: 'Por qué cada pieza', text: 'El cristal da un reloj preciso: el USB exige 48 MHz exactos. La flash va pegada al chip porque el QSPI corre a decenas de MHz y las pistas largas meten errores. El botón BOOTSEL fuerza el arranque desde la ROM tirando a masa el CS de la flash. Las resistencias de 27 Ω adaptan la impedancia del USB.', q: mcq('¿Cómo funciona el botón BOOTSEL?', ['Pone a masa el CS de la flash al arrancar: la ROM cree que no hay programa y entra en modo USB', 'Borra la flash', 'Corta la alimentación', 'Cambia el cristal'], 'Por eso va entre QSPI_SS y masa, con una resistencia.') }
    ] }
  });

  /* ===================== GENERADORES ===================== */
  const FS = [125, 150, 200];
  Gen.add('rp_pwmFreq', () => {
    const fs = pick(FS), div = pick([1, 2, 4, 10, 25, 125]), wrap = pick([99, 249, 999, 1249, 4999, 9999, 65535]);
    const f = fs * 1e6 / ((wrap + 1) * div);
    return N(`PWM con clk_sys = ${fs} MHz, divisor ${div} y wrap ${wrap}. ¿Frecuencia en Hz?`, f, 'Hz', `f = clk_sys / ((wrap + 1) × div) = ${fs} MHz / (${wrap + 1} × ${div}) = ${fmt(f, 2)} Hz. El +1 sale de que el contador cuenta de 0 a wrap, ambos incluidos.`, f * 0.005 + 0.05);
  }, 'rp_pwmslice');
  Gen.add('rp_pwmWrap', () => {
    for (let k = 0; k < 60; k++) {
      const fs = pick([125, 200]), div = pick([1, 2, 5, 10, 25, 50, 125]), f = pick([50, 100, 500, 1000, 2000, 5000, 10000, 20000, 25000, 40000, 100000]);
      const w = fs * 1e6 / (f * div) - 1;
      if (Number.isInteger(w) && w >= 9 && w <= 65535) return N(`clk_sys = ${fs} MHz y divisor ${div}. ¿Qué wrap necesitas para ${fHz(f)}?`, w, '', `wrap = clk_sys / (f × div) − 1 = ${fs} 000 000 / (${f} × ${div}) − 1 = ${w}. Tendrás ${w + 1} niveles de ciclo de trabajo.`, 1);
    }
    return N('clk_sys = 125 MHz y divisor 1. ¿Qué wrap necesitas para 25 kHz?', 4999, '', '125 000 000 / 25 000 − 1 = 4999.', 1);
  }, 'rp_pwmslice');
  Gen.add('rp_pwmSlice', () => {
    const n = ri(0, 29), s = (n >> 1) & 7, ch = n & 1 ? 'B' : 'A', ot = ch === 'A' ? 'B' : 'A';
    return MC(`En un RP2040, ¿qué slice y canal de PWM usa GP${n}?`, `Slice ${s}, canal ${ch}`, [`Slice ${n >> 1}, canal ${ch}`, `Slice ${s}, canal ${ot}`, `Slice ${n % 8}, canal ${ch}`, `Slice ${(s + 1) % 8}, canal ${ch}`, `Slice ${(s + 7) % 8}, canal ${ot}`], `Slice = (${n} ÷ 2, sin decimales) módulo 8 = ${s}. Canal A si el número es par, B si es impar. Por eso GP${n} comparte frecuencia con GP${n ^ 1}.`);
  }, 'rp_pwmslice');
  Gen.add('rp_u16V', () => {
    const n = ri(800, 64000), v = n * 3.3 / 65535;
    if (Math.random() < 0.5) return N(`adc.read_u16() devuelve ${n}. Con la referencia de 3,3 V, ¿cuántos voltios son?`, v, 'V', `V = ${n} × 3,3 / 65535 = ${fmt(v, 3)} V.`, 0.01);
    return MC(`En la Pico, read_u16() da ${n}. ¿Tensión en el pin?`, fmt(v, 2) + ' V', [fmt(n * 3.3 / 4095, 2) + ' V', fmt(n * 5 / 65535, 2) + ' V', fmt(n * 3.3 / 1023, 2) + ' V', fmt(n / 65535, 2) + ' V'], `Divide entre 65535 (no entre 4095: read_u16 ya está escalado a 16 bits) y multiplica por 3,3 V, no por 5 V.`);
  }, 'rp_adc16');
  Gen.add('rp_temp', () => {
    const v = ri(680, 730) / 1000, T = 27 - (v - 0.706) / 0.001721;
    if (Math.random() < 0.5) return N(`El sensor interno da ${fmt(v, 3)} V. ¿Temperatura en °C? (T = 27 − (V − 0,706) / 0,001721)`, T, '°C', `T = 27 − (${fmt(v, 3)} − 0,706) / 0,001721 = ${fmt(T, 1)} °C. Más tensión, menos temperatura: la pendiente es negativa.`, 0.6);
    const n = Math.round(v / 3.3 * 65535), vv = n * 3.3 / 65535, TT = 27 - (vv - 0.706) / 0.001721;
    return N(`ADC(4).read_u16() devuelve ${n}. ¿Temperatura del chip en °C?`, TT, '°C', `Primero voltios: ${n} × 3,3 / 65535 = ${fmt(vv, 4)} V. Luego T = 27 − (V − 0,706) / 0,001721 = ${fmt(TT, 1)} °C.`, 0.8);
  }, 'rp_adc16');
  Gen.add('rp_pioDiv', () => {
    const fs = pick(FS), [baud, nom] = pick([[9600, ''], [19200, ''], [115200, ''], [31250, ' (MIDI)'], [250000, ' (DMX)'], [1000000, '']]), c = pick([4, 8, 10, 16]);
    const d = fs * 1e6 / (baud * c);
    return N(`clk_sys = ${fs} MHz. Un programa PIO usa ${c} ciclos por bit. ¿Qué divisor necesitas para ${baud} baudios${nom}?`, d, '', `div = ${fs} 000 000 / (${baud} × ${c}) = ${fmt(d, 2)}. El divisor del PIO admite fracciones (16 bits enteros y 8 de fracción).`, Math.max(0.02, d * 0.003));
  }, 'rp_pio');
  Gen.add('rp_pioBit', () => {
    const f = pick([1, 2, 8, 10, 12.5, 25]), c = pick([4, 5, 8, 10]);
    if (Math.random() < 0.5) return N(`Una máquina de estados PIO corre a ${fmt(f)} MHz y cada bit dura ${c} ciclos. ¿Cuánto dura un bit en ns?`, c * 1000 / f, 'ns', `Un ciclo = 1000 / ${fmt(f)} = ${fmt(1000 / f, 1)} ns; × ${c} = ${fmt(c * 1000 / f, 1)} ns.`, 1);
    return N(`Máquina PIO a ${fmt(f)} MHz, ${c} ciclos por bit. ¿Cuántos bits por segundo (en kbit/s)?`, f * 1000 / c, 'kbit/s', `${fmt(f)} MHz / ${c} = ${fmt(f * 1000 / c, 1)} kbit/s.`, 0.5);
  }, 'rp_pio');
  Gen.add('rp_wsCycles', () => {
    const [f, n] = pick([[8, 10], [6.4, 8], [12, 15], [16, 20], [4.8, 6], [9.6, 12]]);
    return N(`Un bit de WS2812 dura 1,25 µs. Si la máquina PIO corre a ${fmt(f)} MHz, ¿cuántos ciclos dura un bit?`, n, 'ciclos', `1,25 µs × ${fmt(f)} MHz = ${n} ciclos. Ese número tiene que salir entero para que el programa cuadre.`, 0.01);
  }, 'rp_pio');
  Gen.add('rp_dmaTime', () => {
    if (Math.random() < 0.6) {
      const fs = pick([10, 50, 100, 250, 500]), n = pick([256, 500, 1000, 2048, 4096, 10000]);
      return N(`El ADC muestrea a ${fs} ksps y el DMA guarda ${n} muestras. ¿Cuánto tarda en llenar el búfer (ms)?`, n / fs, 'ms', `t = ${n} / ${fs} 000 muestras/s = ${fmt(n / fs, 3)} ms. El DMA va al ritmo del ADC (DREQ), no más rápido.`, Math.max(0.01, n / fs * 0.01));
    }
    const n = pick([1024, 4096, 16384, 65536]), fs = pick([125, 150, 200]);
    return N(`Sin DREQ, un canal DMA copia ${n} palabras de 32 bits con clk_sys = ${fs} MHz. Si logra una por ciclo, ¿cuántos µs tarda?`, n / fs, 'µs', `${n} / ${fs} MHz = ${fmt(n / fs, 2)} µs. Es un mejor caso: si la CPU u otro canal usan el mismo bus, tarda algo más.`, Math.max(0.05, n / fs * 0.01));
  }, 'rp_dma');
  Gen.add('rp_pll', () => {
    const fb = ri(63, 133), p1 = ri(2, 7), p2 = ri(1, p1), f = 12 * fb / (p1 * p2);
    return N(`PLL con cristal de 12 MHz: FBDIV = ${fb}, POSTDIV1 = ${p1}, POSTDIV2 = ${p2}. ¿Frecuencia de salida en MHz?`, f, 'MHz', `VCO = 12 × ${fb} = ${12 * fb} MHz (dentro de 750–1600). Salida = ${12 * fb} / (${p1} × ${p2}) = ${fmt(f, 2)} MHz.`, Math.max(0.05, f * 0.005));
  }, 'rp_clock');
  Gen.add('rp_adcDiv', () => {
    const fs = pick([1000, 2000, 8000, 10000, 44100, 48000, 100000, 250000]), d = 48e6 / fs - 1;
    return N(`El ADC del RP2040 funciona con 48 MHz. ¿Qué valor pasas a adc_set_clkdiv() para muestrear a ${fs} muestras/s?`, d, '', `Una muestra cada (div + 1) ciclos de 48 MHz: div = 48 000 000 / ${fs} − 1 = ${fmt(d, 2)}. Por debajo de 95 no tiene sentido: una conversión ya tarda 96 ciclos (500 ksps).`, Math.max(0.5, d * 0.002));
  }, 'rp_dma');
  Gen.add('rp_avgI', () => {
    const Ia = pick([20, 25, 40, 80]), ton = pick([0.2, 0.5, 1, 2]), T = pick([60, 300, 600]), Is = pick([0.2, 0.8, 1.5]), cap = pick([1000, 2000, 2500]);
    const avg = (Ia * ton + Is * (T - ton)) / T;
    if (Math.random() < 0.5) return N(`Un nodo consume ${Ia} mA durante ${fmt(ton)} s y ${fmt(Is)} mA dormido el resto, con un ciclo de ${T} s. ¿Consumo medio en mA?`, avg, 'mA', `(${Ia} × ${fmt(ton)} + ${fmt(Is)} × ${fmt(T - ton)}) / ${T} = ${fmt(avg, 3)} mA.`, Math.max(0.005, avg * 0.02));
    const d = cap / avg / 24;
    return N(`Mismo nodo (${Ia} mA durante ${fmt(ton)} s, ${fmt(Is)} mA dormido, ciclo de ${T} s) con una batería de ${cap} mAh. ¿Cuántos días dura, en el caso ideal?`, d, 'días', `Media = ${fmt(avg, 3)} mA. ${cap} / ${fmt(avg, 3)} = ${fmt(cap / avg, 0)} h ≈ ${fmt(d, 1)} días. En la realidad, algo menos: autodescarga y caída de tensión.`, Math.max(0.5, d * 0.03));
  }, 'rp_lowpower');
  Gen.add('rp_vsys', () => {
    const V = ri(300, 520) / 100, n = Math.round(V / 3 / 3.3 * 65535), vv = n * 3.3 / 65535 * 3;
    return N(`En la Pico, ADC(3) mide VSYS a través de un divisor ÷3. read_u16() da ${n}. ¿Cuánto vale VSYS?`, vv, 'V', `En el pin: ${n} × 3,3 / 65535 = ${fmt(vv / 3, 3)} V. Por el divisor, VSYS = 3 × ${fmt(vv / 3, 3)} = ${fmt(vv, 2)} V.`, 0.03);
  }, 'rp_adc16');

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
      calc: p => race(p.d, p.lk),
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

  /* ===================== TEMARIO ===================== */
  const M1 = [
    L('rp1', 'De Arduino a la Pico', 'chip', ['rp_board'], [
      I('La <b>Raspberry Pi Pico</b> es una placa pequeña con el chip <b>RP2040</b>, diseñado por la propia Raspberry Pi.\nNo la confundas con una Raspberry Pi “de las grandes”: aquí no hay Linux ni sistema operativo. Tu programa es lo único que corre, como en la Uno.'),
      { t: 'match', q: 'Une cada chip o placa con lo que lo describe.', pairs: [['ATmega328P', '8 bits, 16 MHz, 2 KB de RAM'], ['RP2040', '2 núcleos de 32 bits, 264 KB de RAM'], ['Raspberry Pi 4', 'Ordenador con Linux'], ['ESP32', 'WiFi y Bluetooth integrados']] },
      I('Dentro del RP2040:\n· <b>Dos Cortex-M0+</b>: 133 MHz según la hoja de datos original; en 2025 Raspberry Pi certificó 200 MHz.\n· <b>264 KB de SRAM</b> en bancos y una ROM de arranque.\n· <b>30 GPIO</b>, 2 UART, 2 SPI, 2 I²C, 16 canales PWM, ADC de 12 bits, USB.\n· <b>2 bloques PIO</b>: lo que lo hace único.\n· Ninguna flash: va fuera, en la placa.'),
      Q('¿Qué NO lleva dentro el RP2040?', ['Memoria flash para el programa', 'RAM', 'Un controlador USB', 'Un ADC'], 'La flash QSPI está en la placa, al lado del chip.'),
      Q('En el nombre “RP2040”, el último 0 indica…', ['Que no lleva memoria no volátil (flash) dentro', 'Que es la primera versión', 'Que funciona a 0 V', 'Que no tiene periféricos'], 'RP · 2 núcleos · tipo 0 (M0+) · 4 (RAM: 16 KB × 2⁴ o más) · 0 KB de flash.'),
      Q('Sumas dos números de 32 bits. ¿Qué ventaja tiene un núcleo de 32 bits frente al de 8 de la Uno?', ['Lo hace en una instrucción en vez de en varias', 'Ninguna', 'Que tiene más pines', 'Que no necesita reloj'], 'El AVR tiene que encadenar cuatro sumas de 8 bits con acarreo.'),
      Nm('264 KB de RAM frente a 2 KB de la Uno. ¿Cuántas veces más?', 132, 'veces', '264 / 2 = 132.'),
      Q('¿Con qué lenguajes puedes programar la Pico?', ['MicroPython, C/C++ con el SDK oficial y otros como Arduino o Rust', 'Solo MicroPython', 'Solo C', 'Solo Scratch'], 'En esta especialidad empezarás en MicroPython y bajarás a C.'),
      I('Cuidado con las corrientes: cada GPIO da por defecto hasta unos <b>4 mA</b> dentro de especificación (se puede configurar hasta 12 mA). Para LEDs basta; para motores, relés o tiras de LEDs, siempre un transistor o un driver.'),
      Q('Quieres activar un relé de 70 mA desde un GPIO de la Pico.', ['Con un transistor o MOSFET y su diodo de rueda libre', 'Directo al pin configurado a 12 mA', 'Con una resistencia de 10 Ω en serie', 'Desde el pin 3V3_EN'], 'El GPIO solo da la señal de control.', { c: 'bjt' })
    ]),
    L('rp2', 'La familia: RP2040, RP2350 y la W', 'chip', ['rp_board'], [
      I('Cuatro placas con el mismo formato y casi el mismo pinout:\n· <b>Pico</b>: RP2040.\n· <b>Pico W</b>: RP2040 + chip de radio CYW43439 (WiFi a 2,4 GHz y Bluetooth).\n· <b>Pico 2</b>: RP2350.\n· <b>Pico 2 W</b>: RP2350 + la misma radio.'),
      I('El <b>RP2350</b> es el hermano mayor:\n· Dos <b>Cortex-M33</b> a 150 MHz con coma flotante por hardware, <b>o</b> dos núcleos <b>RISC-V Hazard3</b>: eliges al arrancar.\n· <b>520 KB</b> de SRAM, <b>3 bloques PIO</b>, 12 slices de PWM, 16 canales DMA.\n· Seguridad: arranque firmado, memoria OTP y TrustZone.'),
      { t: 'match', q: 'Une cada placa con su chip.', pairs: [['Pico', 'RP2040 sin radio'], ['Pico W', 'RP2040 con WiFi y BLE'], ['Pico 2', 'RP2350 sin radio'], ['Pico 2 W', 'RP2350 con WiFi y BLE']] },
      Q('¿Qué cambia con el LED de la placa en la Pico W?', ['Está conectado al chip de radio, no a un GPIO: en MicroPython se usa Pin(\'LED\')', 'No tiene LED', 'Es un LED RGB', 'Va al GP0'], 'En la Pico normal está en GP25; Pin(\'LED\') funciona en las dos.'),
      Q('Haces muchos cálculos con float. ¿Qué notarás en un RP2350 con Cortex-M33?', ['Van mucho más rápido: tiene unidad de coma flotante', 'Nada', 'Van más lentos', 'Que no admite float'], 'El M0+ del RP2040 emula la coma flotante con rutinas optimizadas de la ROM.'),
      Q('¿Puedes grabar en una Pico 2 el .uf2 compilado para una Pico?', ['En general no: cada chip tiene su propio firmware; usa el de tu placa', 'Sí, siempre', 'Solo si cambias el nombre del fichero', 'Solo los viernes'], 'El UF2 lleva un identificador de familia y el cargador de arranque rechaza el que no es suyo.'),
      Q('¿Qué significa poder elegir Arm o RISC-V en el RP2350?', ['El chip trae los dos tipos de núcleo y decides cuáles arrancan', 'Que la placa lleva dos chips', 'Que cambia la tensión de los pines', 'Que el RISC-V solo sirve para la WiFi'], 'Un mismo programa se compila para una u otra arquitectura.'),
      Nm('¿Cuántos KB de SRAM más tiene el RP2350 que el RP2040?', 256, 'KB', '520 − 264 = 256 KB.'),
      Q('¿Cómo se comunica el RP2040 con el chip de radio de la Pico W?', ['Por una conexión SPI usando varios de sus GPIO internos', 'Por I²C', 'No se comunica: la radio es independiente', 'Por el USB'], 'Por eso en la Pico W algunos pines internos tienen otro uso.'),
      I('Elige según el proyecto: una <b>Pico</b> basta para casi todo y es la más estudiada; la <b>W</b> si necesitas red; la <b>Pico 2</b> si quieres más RAM, más PIO o coma flotante rápida. Todo lo de esta especialidad funciona en las cuatro, con los matices que iremos viendo.')
    ]),
    L('rp3', 'El pinout y los 3,3 V', 'chip', ['rp_board'], [
      I('La Pico tiene 40 patas. La <b>pata física</b> (1–40) no es el <b>número de GPIO</b> (GP0–GP28): la pata 1 es GP0, pero la 3 es GND y la 4 es GP2.\nEn el código siempre usas el número GP. Las masas están repartidas: patas 3, 8, 13, 18, 23, 28, 38, y la 33 es AGND.'),
      Q('Pin(15) en MicroPython se refiere a…', ['GP15, esté en la pata física que esté', 'La pata física 15', 'La pata 15 contando desde abajo', 'El canal 15 del ADC'], 'La pata física de GP15 es la 20.'),
      I('Cada GPIO puede tener varias funciones (SIO, PWM, UART, I²C, SPI, PIO…), pero en <b>grupos fijos</b>: el TX de UART0 puede ir en GP0, GP12, GP16 o GP28; el SDA de I²C0 en GP0, GP4, GP8, GP12, GP16, GP20 o GP28.\nMira el pinout antes de soldar.'),
      Q('¿Qué tres GPIO del conector de la Pico pueden ser entradas analógicas?', ['GP26, GP27 y GP28', 'GP0, GP1 y GP2', 'Cualquiera', 'GP25, GP26 y GP29'], 'GP29 también es ADC, pero en la placa mide VSYS.'),
      I('Algunos GPIO no salen al conector porque la placa los usa:\n· <b>GP23</b>: modo del regulador.\n· <b>GP24</b>: detecta si hay VBUS (USB).\n· <b>GP25</b>: el LED.\n· <b>GP29</b>: VSYS / 3, en el ADC3.\nEn la Pico W cambian: el chip de radio usa parte de ellos.'),
      { t: 'match', q: 'Une cada GPIO interno de la Pico con su función.', pairs: [['GP25', 'LED de la placa'], ['GP24', 'Detecta VBUS'], ['GP29', 'VSYS / 3 en el ADC'], ['GP23', 'Modo del regulador']] },
      I('Los GPIO del <b>RP2040</b> trabajan a 3,3 V y <b>no toleran 5 V</b>: el máximo absoluto es la alimentación de E/S más 0,5 V.\nMatiz del <b>RP2350</b>: sus GPIO digitales sí toleran 5 V <b>con el chip alimentado</b>, salvo los que pueden ser ADC. Sus salidas siguen siendo de 3,3 V.'),
      Q('Conectas la salida de 5 V de un sensor a GP2 de una Pico (RP2040). ¿Qué haces antes?', ['Un divisor o un adaptador de nivel para bajar a 3,3 V', 'Nada, aguanta', 'Activar el pull-down', 'Ponerlo en GP26, que es analógico'], 'El pin puede dañarse con 5 V.', { c: 'logic' }),
      Q('¿Y si es una Pico 2 (RP2350) ya alimentada y el pin no es de ADC?', ['Sus GPIO digitales toleran 5 V, aunque sus salidas siguen siendo de 3,3 V', 'Tampoco tolera nada por encima de 3,3 V', 'Tolera 5 V incluso apagada', 'Solo tolera 5 V en GP26–GP28'], 'Con la placa sin alimentar, mejor no meter 5 V. Y los pines de ADC no son tolerantes.'),
      Q('¿Entiende un 74HCT alimentado a 5 V el “1” de 3,3 V de la Pico?', ['Sí: las entradas HCT aceptan unos 2 V como nivel alto', 'No, nunca', 'Solo con pull-down', 'Solo a 133 MHz'], 'Por eso los 74HCT/AHCT se usan como adaptadores de 3,3 a 5 V.', { c: 'logic' }),
      I('Más detalles útiles:\n· Pull-up y pull-down internos de unos <b>50–80 kΩ</b>.\n· Las entradas llevan <b>Schmitt trigger</b> activado por defecto.\n· La intensidad de salida se elige: 2, 4, 8 o 12 mA.'),
      Q('Bus I²C a 400 kHz con 20 cm de cable. ¿Bastan los pull-ups internos?', ['Mejor no: son débiles; pon 2,2–4,7 kΩ externas', 'Sí, siempre', 'No hacen falta pull-ups en I²C', 'Pon pull-downs'], 'Con pull-ups débiles los flancos de subida son demasiado lentos.', { c: 'pullup' })
    ]),
    L('rp4', 'Alimentación: VBUS, VSYS y 3V3', 'bat', ['rp_power'], [
      I('La Pico lleva un regulador <b>buck-boost</b> (sube o baja la tensión) que convierte VSYS, de <b>1,8 a 5,5 V</b>, en 3,3 V. Por eso funciona con el USB, con dos o tres pilas AA o con una sola celda de litio.'),
      { t: 'match', q: 'Une cada pata con su papel.', pairs: [['VBUS', '5 V del USB (solo con cable)'], ['VSYS', 'Entrada del regulador, 1,8–5,5 V'], ['3V3(OUT)', 'Salida de 3,3 V para periféricos'], ['3V3_EN', 'A masa apaga el regulador']] },
      Q('Una LiPo de una celda (3,0–4,2 V). ¿Dónde la conectas?', ['A VSYS: el buck-boost aprovecha todo su rango', 'A 3V3(OUT)', 'A VBUS', 'A ADC_VREF'], 'Sin olvidar un cargador con protección para recargarla.'),
      Q('Conectas una fuente de 5 V a la pata 3V3(OUT). ¿Qué pasa?', ['Superas el máximo del RP2040 y puedes destruirlo', 'Va más rápido', 'Nada: el regulador lo baja', 'Se carga la batería'], '3V3 es una salida, no una entrada para 5 V.'),
      I('USB y batería a la vez: batería → <b>Schottky</b> → VSYS. El USB ya entra por su propio diodo. Gana la fuente de más tensión y ninguna empuja corriente hacia la otra.\nPara <b>cargar</b> una LiPo, un cargador dedicado con protección; nunca la conectes directa a VBUS.'),
      Q('¿Por qué un Schottky y no un 1N4007?', ['Cae unos 0,3 V en vez de 0,7 V: aprovechas más la batería', 'Aguanta más tensión inversa', 'Es más grande', 'Da 3,3 V exactos'], 'Cada décima cuenta con pilas.', { c: 'diode' }),
      Nm('VSYS se mide en GP29 con un divisor ÷3. En el pin hay 1,45 V. ¿Cuánto vale VSYS?', 4.35, 'V', '1,45 × 3 = 4,35 V.', { tol: 0.02 }),
      G('rp_vsys'),
      I('<b>3V3(OUT)</b> puede alimentar tus sensores, pero se recomienda no pasar de unos 300 mA.\n<b>3V3_EN</b> a masa apaga el regulador (un interruptor de encendido sin cortar la batería).\n<b>RUN</b> a masa reinicia el RP2040.'),
      Q('¿Cómo reinicias la Pico sin desenchufarla?', ['Llevando RUN a masa un instante con un pulsador', 'Llevando 3V3_EN a 5 V', 'Pulsando BOOTSEL sin más', 'Uniendo VBUS y VSYS'], 'La Pico no trae botón de reset: es un añadido muy útil.'),
      Q('Tus sensores consumen 450 mA a 3,3 V. ¿Los alimentas desde 3V3(OUT)?', ['No: mejor un regulador aparte, la salida de la Pico se queda corta', 'Sí, sin problema', 'Sí, si el cable USB es bueno', 'No: aliméntalos desde VBUS directamente aunque sean de 3,3 V'], 'Sobrecargar el regulador lo calienta y baja la tensión de todo.')
    ]),
    L('rp5', 'Arranque: BOOTSEL, UF2 y flash', 'memory', ['rp_board'], [
      I('Al arrancar, la <b>ROM</b> del chip busca un programa válido en la flash. Si al encender mantienes <b>BOOTSEL</b>, la ROM no lo encuentra (el botón pone a masa el CS de la flash) y entra en modo USB: aparece una unidad llamada <b>RPI-RP2</b>.'),
      { t: 'order', q: 'Ordena cómo se graba un programa.', items: ['Mantén pulsado BOOTSEL', 'Conecta el USB', 'Suelta BOOTSEL cuando aparezca la unidad', 'Arrastra el .uf2 a la unidad', 'La placa se reinicia y ejecuta el programa'], e: 'Sin programas especiales: solo arrastrar un fichero.' },
      Q('Has arrastrado el .uf2 y la unidad desaparece. ¿Qué ha pasado?', ['Lo normal: se ha grabado y la placa se ha reiniciado', 'Se ha borrado todo', 'Hay que formatearla', 'El USB se ha roto'], 'Si el programa usa USB, ahora aparecerá como otro dispositivo.'),
      I('Un fichero <b>UF2</b> está hecho de bloques de 512 bytes. Cada bloque lleva 256 bytes de datos <b>y la dirección donde van</b>, más un identificador de la familia del chip. Así da igual en qué orden escriba el sistema operativo.'),
      Q('¿Por qué cada bloque UF2 lleva su dirección de destino?', ['Porque el sistema operativo puede escribir los bloques en cualquier orden', 'Para cifrarlo', 'Para ocupar más', 'Porque la flash es de 512 bytes'], 'Es un formato pensado para unidades USB “de mentira”.'),
      Nm('Un programa de 64 KB, a 256 bytes útiles por bloque. ¿Cuántos bloques UF2?', 256, 'bloques', '65 536 / 256 = 256 bloques.'),
      I('El código se ejecuta <b>desde la flash</b> a través de una caché (XIP). Mientras se escribe o borra la flash, <b>no se puede leer</b>: si un núcleo graba datos, el otro no puede estar ejecutando desde la flash. Las funciones muy rápidas o críticas se pueden copiar a la RAM.'),
      Q('Un núcleo borra un sector de flash mientras el otro ejecuta código desde la flash. ¿Qué pasa?', ['El otro se bloquea o falla: hay que pararlo o hacer que ejecute desde RAM', 'Nada', 'Va más rápido', 'Se borra la RAM'], 'El SDK tiene funciones para pausar el otro núcleo durante la escritura.'),
      I('Tranquilidad: el modo BOOTSEL está en la <b>ROM</b>, que no se puede borrar. Aunque tu programa cuelgue el USB, siempre puedes volver a BOOTSEL y grabar otro.\nPara borrar la flash entera (incluidos los ficheros de MicroPython) existe un UF2 de borrado total, flash_nuke. Y <b>picotool</b> da información de lo que hay grabado.'),
      Q('¿Puedes inutilizar para siempre una Pico con un programa malo?', ['No en la práctica: el modo BOOTSEL vive en la ROM y siempre responde', 'Sí, si el programa bloquea el USB', 'Sí, si borras la flash', 'Solo la Pico W'], 'Otra cosa es dañar el hardware con tensiones indebidas.'),
      Q('MicroPython guarda tus ficheros en la misma flash. ¿Cómo los borras todos de golpe?', ['Grabando el UF2 de borrado total y reinstalando MicroPython', 'Reiniciando con RUN', 'Dejándola desconectada', 'Pulsando BOOTSEL dos veces'], 'Útil cuando un main.py defectuoso no te deja trabajar.')
    ]),
    PRJ('rp-p1', 'Proyecto: lámpara RGB a pilas', 'rp_kit')
  ];

  const M2 = [
    L('rp6', 'El REPL y tu primer script', 'code', ['rp_python'], [
      I('El <b>REPL</b> (leer, evaluar, imprimir, repetir) es una consola dentro de la placa: escribes una línea tras <b>>>></b> y se ejecuta al momento. Es el multímetro del programador: pruebas un pin o una cuenta sin escribir un programa entero.'),
      Q('¿Qué muestra cada línea en el REPL?', ['3 y 3.5', '3 y 3', '4 y 3.5', '3.5 y 3.5'], '// es división entera; / siempre da float.', { code: '>>> 7 // 2\n>>> 7 / 2' }),
      { t: 'match', q: 'Une cada tecla del REPL con su efecto.', pairs: [['Ctrl+C', 'Interrumpe el programa'], ['Ctrl+D', 'Reinicio suave'], ['Tab', 'Autocompleta'], ['Flecha arriba', 'Recupera la orden anterior']] },
      I('<b>Thonny</b> es el entorno más sencillo: editor, botón de ejecutar, consola y explorador de ficheros de la placa.\nAlternativa de terminal: <b>mpremote</b>. Por ejemplo, mpremote run prueba.py ejecuta un fichero del PC sin copiarlo, y mpremote fs cp main.py :main.py lo copia a la placa.'),
      Q('¿Qué diferencia hay entre ejecutar con F5 en Thonny y guardar el programa como main.py en la placa?', ['F5 lo ejecuta ahora sin dejarlo en la placa; main.py arranca solo cada vez que se enciende', 'Ninguna', 'main.py se ejecuta en el PC', 'F5 borra la flash'], 'main.py es lo que hace autónomo tu proyecto.'),
      Q('¿Qué imprime este código en una Pico con RP2040 recién instalada?', ['La frecuencia del reloj del sistema en Hz (125000000, 200000000… según la versión)', 'La memoria libre', 'La temperatura', 'La versión de MicroPython'], 'Históricamente el RP2040 iba a 125 MHz; versiones recientes pueden usar 200 MHz. machine.freq() te lo dice y también sirve para cambiarlo.', { code: 'import machine\nprint(machine.freq())' }),
      I('Exploradores del REPL:\n· <b>dir(objeto)</b>: qué atributos y funciones tiene.\n· <b>help(\'modules\')</b>: módulos disponibles.\n· <b>gc.mem_free()</b>: RAM libre (tras import gc).'),
      Q('¿Cómo ves qué funciones tiene un objeto Pin en el REPL?', ['dir(Pin)', 'list(Pin)', 'show Pin', 'man Pin'], 'dir() es tu índice.'),
      Q('Tu programa está en un while True y quieres recuperar el REPL. ¿Qué haces?', ['Ctrl+C en la consola (o el botón Stop de Thonny)', 'Desoldar la placa', 'Reinstalar Thonny', 'Esperar a que acabe'], 'Ctrl+C lanza KeyboardInterrupt dentro del programa.'),
      Nm('¿Qué número imprime print(2 ** 10)?', 1024, '', '** es la potencia: 2¹⁰ = 1024.')
    ]),
    L('rp7', 'Variables, tipos y operaciones', 'code', ['rp_python'], [
      I('En Python no declaras tipos: x = 5 crea un entero y x = \'hola\' lo convierte en texto. Tipos básicos: <b>int</b> (sin límite de tamaño), <b>float</b>, <b>str</b>, <b>bool</b> (True/False) y <b>None</b> (nada).'),
      Q('¿Qué imprime?', ['3 1', '3.33 1', '3 0', '1 3'], '// cociente entero y % resto.', { code: 'a = 10\nb = 3\nprint(a // b, a % b)' }),
      Q('En C, un int de 32 bits desbordaría. ¿Y en MicroPython?', ['Imprime 1099511627776: los enteros crecen lo que haga falta', 'Da error de desbordamiento', 'Imprime 0', 'Imprime −1'], 'Los enteros grandes usan más memoria y van más lentos, pero no desbordan.', { code: 'x = 2 ** 40\nprint(x)' }),
      I('En el RP2040, los <b>float</b> de MicroPython son de 32 bits: unas 7 cifras significativas. Y como en cualquier lenguaje, muchos decimales no tienen representación exacta en binario: compara floats con un margen, nunca con ==.'),
      Q('¿Qué imprime?', ['False', 'True', 'Error', '0.3'], '0,1 y 0,2 no son exactos en binario: la suma no da exactamente 0,3.', { code: 'print(0.1 + 0.2 == 0.3)' }),
      Q('¿Qué imprime?', ['23.5 C', '23.456 C', '23 C', 't C'], 'Dentro de una f-string, :.1f redondea a un decimal.', { code: "t = 23.456\nprint(f'{t:.1f} C')" }),
      Q('¿Qué ocurre?', ['Un error de tipo: hay que convertir con int(v)', 'Imprime 15', 'Imprime 123', 'Imprime 12 3'], 'Python no mezcla texto y números sin que se lo pidas.', { code: "v = '12'\nprint(v + 3)" }),
      I('Operaciones de bits, igual que en C: <b>&amp;</b> (y), <b>|</b> (o), <b>^</b> (o exclusiva), <b>~</b> (negación), <b>&lt;&lt;</b> y <b>&gt;&gt;</b> (desplazamientos). Literales: 0b1010, 0xFF. Y hex(), bin() para verlos.'),
      Q('¿Qué imprime?', ['5', '160', '1010', '2'], '0b10100000 desplazado 5 a la derecha deja 0b101.', { code: 'reg = 0b1010_0000\nprint(reg >> 5)' }),
      { t: 'bits', q: 'Forma la máscara con GP0, GP2 y GP5 (bit n = GPn).', n: 8, target: 37, e: '1 + 4 + 32 = 37 = 0b100101.', c: 'rp_python' },
      Nm('¿Cuánto vale 0xFF + 1 en decimal?', 256, '', '0xFF = 255.', { c: 'binary' })
    ]),
    L('rp8', 'Decisiones y bucles', 'code', ['rp_python'], [
      I('Un if en Python: condición, <b>dos puntos</b> y bloque con sangría. Se encadenan con <b>elif</b> y <b>else</b>. Los operadores lógicos son palabras: <b>and</b>, <b>or</b>, <b>not</b>.'),
      Q('¿Qué imprime?', ['calor', 'calor y bien', 'bien', 'frío'], 'Se ejecuta solo la primera rama que se cumple.', { code: "t = 31\nif t > 30:\n    print('calor')\nelif t > 20:\n    print('bien')\nelse:\n    print('frío')" }),
      Q('¿Cuántas veces sale “fin”?', ['Una', 'Tres', 'Ninguna', 'Cuatro'], 'print(\'fin\') no tiene sangría: está fuera del bucle.', { code: "for i in range(3):\n    print(i)\nprint('fin')" }),
      I('<b>for</b> recorre cualquier secuencia: range(n) da 0…n−1; range(a, b, paso) va de a a b sin incluir b.\n<b>while</b> repite mientras se cumpla la condición. <b>break</b> sale del bucle y <b>continue</b> salta a la siguiente vuelta.'),
      Q('¿Qué valores imprime?', ['2, 5 y 8', '2, 5, 8 y 11', '3, 6 y 9', '2 y 10'], 'Empieza en 2, suma 3 y para antes de 10.', { code: 'for i in range(2, 10, 3):\n    print(i)' }),
      Q('¿Qué imprime?', ['6', '5', '4', '7'], '0 → 2 → 4 → 6; con 6 la condición ya no se cumple.', { code: 'n = 0\nwhile n < 5:\n    n += 2\nprint(n)' }),
      I('De Arduino a MicroPython: lo que pondrías en <b>setup()</b> va antes del bucle; <b>loop()</b> se convierte en <b>while True:</b>. No hay main obligatorio: el fichero se ejecuta de arriba abajo.'),
      { t: 'order', q: 'Ordena las líneas del parpadeo en MicroPython.', items: ['from machine import Pin', 'import time', 'led = Pin(15, Pin.OUT)', 'while True:', 'led.toggle()  (con sangría)', 'time.sleep_ms(500)  (con sangría)'], e: 'Imports, preparación y bucle infinito.' },
      Q('¿Qué falla?', ['Faltan los dos puntos al final del if', 'Falta un punto y coma', 'Faltan llaves', '== debería ser ='], 'SyntaxError en la línea del if.', { code: 'if boton.value() == 0\n    led.on()' }),
      Q('and, or y not de Python equivalen en C a…', ['&&, || y !', '&, | y ~', '+, * y −', 'Nada: no existen en C'], '&, | y ~ también existen en Python, pero son de bits.')
    ]),
    L('rp9', 'Funciones, listas y diccionarios', 'code', ['rp_python'], [
      I('<b>def</b> crea una función; <b>return</b> devuelve un valor (o varios, como tupla). Los parámetros pueden tener valor por defecto: def media(a, b=10).'),
      Q('¿Qué imprime?', ['7.0 5.0', '7 5', '4 6', '14 10'], 'media(4) usa b = 10; / siempre da float.', { code: 'def media(a, b=10):\n    return (a + b) / 2\nprint(media(4), media(4, 6))' }),
      I('Una <b>lista</b> guarda varios valores: v = [10, 20, 30]. Índices desde 0; v[-1] es el último; v[1:3] es una porción (de 1 a 2). Métodos: append, pop, len(v).\nLas <b>comprensiones</b> crean listas en una línea: [x * x for x in range(4)].'),
      Q('¿Qué imprime?', ['40 [20, 30]', '10 [10, 20]', '40 [20, 30, 40]', '30 [20, 30]'], 'v[-1] es el último; la porción 1:3 no incluye el 3.', { code: 'v = [10, 20, 30, 40]\nprint(v[-1], v[1:3])' }),
      Q('¿Qué imprime?', ['[0, 1, 4, 9]', '[1, 4, 9, 16]', '[0, 2, 4, 6]', '[0, 1, 2, 3]'], 'range(4) da 0, 1, 2 y 3; cada uno al cuadrado.', { code: 'cuad = [x * x for x in range(4)]\nprint(cuad)' }),
      I('Un <b>diccionario</b> asocia claves con valores: pines = {\'rojo\': 13, \'verde\': 14}. Se lee con pines[\'rojo\'] o con pines.get(\'azul\', -1), que no falla si la clave no existe. Ideal para configuración.'),
      Q('¿Qué imprime?', ['-1', 'Un error KeyError', 'None', '15'], 'get devuelve el valor por defecto si no encuentra la clave.', { code: "pines = {'rojo': 13, 'verde': 14}\nprint(pines.get('azul', -1))" }),
      Q('Al llamar a pulsado() da un error. ¿Por qué?', ['Falta global cuenta dentro de la función', 'pin no se usa', 'cuenta debería ser una lista', 'Falta return'], 'Asignar dentro de una función crea una variable local, salvo que digas global.', { code: 'cuenta = 0\ndef pulsado(pin):\n    cuenta += 1' }),
      I('Memoria: con MicroPython te quedan del orden de 150–200 KB de RAM para tus datos (míralo con gc.mem_free()). Una lista de 10 000 números gasta mucho porque cada elemento es un objeto. Para datos numéricos usa <b>array</b>: array(\'H\') guarda enteros de 16 bits seguidos, como en C.'),
      Q('Vas a guardar 10 000 lecturas del ADC. ¿Qué gasta menos RAM?', ["array('H') con enteros de 16 bits", 'Una lista de floats', 'Un diccionario con una clave por lectura', 'Una cadena de texto con comas'], 'array(\'H\') ocupa 2 bytes por lectura: unos 20 KB.'),
      Q('¿Qué devuelve esta función?', ['La tupla (mínimo, máximo)', 'Solo el mínimo', 'Un error: no se pueden devolver dos valores', 'Una lista vacía'], 'Se recoge con lo, hi = extremos(datos).', { code: 'def extremos(v):\n    return min(v), max(v)' })
    ]),
    L('rp10', 'Pines y tiempo con machine', 'chip', ['rp_python'], [
      I('<b>Pin(n, Pin.OUT)</b> crea una salida: .value(1), .on(), .off(), .toggle().\n<b>Pin(n, Pin.IN, Pin.PULL_UP)</b> crea una entrada con pull-up: .value() devuelve 0 o 1.'),
      Q('El pulsador entre GP14 y GND está pulsado. ¿Qué imprime?', ['0', '1', 'True', '3,3'], 'Con pull-up, pulsado es 0.', { code: 'from machine import Pin\nb = Pin(14, Pin.IN, Pin.PULL_UP)\nprint(b.value())', c: 'pullup' }),
      { t: 'match', q: 'Traduce de Arduino a MicroPython.', pairs: [['pinMode(13, OUTPUT)', 'led = Pin(13, Pin.OUT)'], ['digitalWrite(13, HIGH)', 'led.value(1)'], ['digitalRead(2)', 'boton.value()'], ['delay(500)', 'time.sleep_ms(500)']] },
      I('El módulo <b>time</b>: sleep(s), sleep_ms, sleep_us para esperar; <b>ticks_ms()</b> y ticks_us() para medir.\nLos ticks dan la vuelta al llegar a su máximo: resta siempre con <b>ticks_diff(nuevo, viejo)</b> y suma con <b>ticks_add</b>.'),
      Q('¿Qué hace este bucle?', ['Cambia el LED cada 250 ms sin bloquear y sin acumular retraso', 'Espera 250 s', 'Apaga el LED tras 250 ms', 'Nada: ticks_diff no existe'], 'Es el «blink sin delay» de MicroPython.', { code: 'antes = time.ticks_ms()\nwhile True:\n    if time.ticks_diff(time.ticks_ms(), antes) >= 250:\n        antes = time.ticks_add(antes, 250)\n        led.toggle()' }),
      Q('¿Por qué ticks_diff(a, b) y no a − b?', ['Porque el contador da la vuelta y ticks_diff lo tiene en cuenta', 'Porque es más rápido', 'Porque a − b da float', 'Da igual'], 'Tras la vuelta, a − b daría un número enorme o negativo.'),
      Q('¿Por qué antes = ticks_add(antes, 250) en lugar de antes = ticks_ms()?', ['Así el periodo medio es exacto aunque alguna vuelta llegue tarde', 'Es obligatorio', 'Ahorra memoria', 'Va más rápido'], 'Con ticks_ms() cada retraso se acumula.'),
      I('Ojo con la velocidad: un bucle de MicroPython que hace toggle() es <b>mucho más lento que en C</b> y además <b>tiembla</b>: el intérprete y la recogida de basura meten pausas irregulares. Para señales rápidas o exactas existen el PWM y el PIO.'),
      Q('Necesitas una señal de 1 MHz exacta. ¿Bucle con toggle()?', ['No: usa PWM o PIO', 'Sí, con sleep_us(0)', 'Sí, si quitas los print', 'Solo en el núcleo 1'], 'El hardware dedicado no depende del intérprete.'),
      Q('¿Qué hace la segunda línea?', ['Invierte el estado del LED, como toggle()', 'Lo apaga siempre', 'Da error: not no funciona con números', 'Lo enciende siempre'], 'not 0 es True (1) y not 1 es False (0).', { code: 'led = Pin(15, Pin.OUT)\nled.value(not led.value())' })
    ]),
    L('rp11', 'Errores, módulos, ficheros y main.py', 'memory', ['rp_python'], [
      I('Cuando algo falla, Python lanza una <b>excepción</b>. Si nadie la captura, el programa se detiene y muestra un <b>traceback</b>: la última línea dice el tipo de error y las de encima, dónde ocurrió. Con try/except la capturas y decides qué hacer.'),
      Q('¿Qué consigue este try?', ['Que un sensor desconectado no detenga todo el programa', 'Que el bus I²C vaya más rápido', 'Que el sensor se reinicie solo', 'Que no hagan falta pull-ups'], 'I²C sin respuesta lanza OSError.', { code: 'try:\n    datos = i2c.readfrom(0x76, 6)\nexcept OSError:\n    datos = None' }),
      Q('¿Dónde está el fallo?', ['En la línea 5 de sensor.py, dentro de leer()', 'En la línea 12 de main.py', 'En el REPL', 'En el firmware'], 'La línea más baja del traceback es donde saltó el error.', { code: 'Traceback (most recent call last):\n  File "main.py", line 12, in <module>\n  File "sensor.py", line 5, in leer\nZeroDivisionError: divide by zero' }),
      I('Un <b>módulo</b> es un fichero .py: si guardas sensor.py en la placa, haces import sensor o from sensor import leer. Las bibliotecas se suelen dejar en <b>/lib</b>. En la Pico W puedes instalarlas por red con <b>mip</b>; en la Pico normal, las copias con Thonny o mpremote.'),
      Q('¿Dónde pones ssd1306.py para poder escribir import ssd1306?', ['En la raíz de la placa o en /lib', 'En el escritorio del PC', 'Dentro de main.py', 'En la ROM'], 'MicroPython busca en esas rutas.'),
      I('Ficheros en la flash: open(\'datos.txt\', \'w\') escribe (borra lo anterior), \'a\' añade al final, \'r\' lee. Con <b>with open(…) as f:</b> se cierra solo.\nLa flash aguanta un número limitado de borrados por sector: no escribas cada pocos milisegundos durante meses.'),
      Q('¿Por qué conviene usar with open(...) as f?', ['Cierra el fichero aunque haya un error dentro del bloque', 'Lo abre más rápido', 'Lo cifra', 'Lo copia al PC'], 'Un fichero sin cerrar puede perder lo último escrito.'),
      Q('Escribes una línea en la flash cada 10 ms durante meses. ¿Riesgo?', ['Desgastar la flash, que admite un número limitado de borrados', 'Ninguno', 'Que se llene la RAM', 'Que el USB se desconecte'], 'Agrupa los datos en RAM y escribe por bloques.'),
      I('Al arrancar, MicroPython ejecuta <b>boot.py</b> (si existe) y luego <b>main.py</b>. Si main.py entra en un bucle que no te deja trabajar, Ctrl+C desde Thonny suele bastar. Truco de seguridad: que main.py no haga nada si arrancas con un botón pulsado.'),
      Q('¿Para qué sirve este principio de main.py?', ['Si arrancas con el botón pulsado, el programa termina y te deja el REPL libre', 'Apaga la placa', 'Borra la flash', 'Reinicia en bucle'], 'Una «puerta trasera» para tus proyectos autónomos.', { code: "# main.py\nfrom machine import Pin\nimport sys\nif Pin(16, Pin.IN, Pin.PULL_UP).value() == 0:\n    sys.exit()" }),
      { t: 'order', q: 'Ordena lo que pasa al encender una Pico con MicroPython.', items: ['El chip arranca desde su ROM', 'Se ejecuta el firmware de MicroPython desde la flash', 'MicroPython monta su sistema de ficheros', 'Ejecuta boot.py si existe', 'Ejecuta main.py si existe', 'Si main.py termina, queda el REPL'], e: 'Por eso main.py hace autónomo el proyecto.' }
    ]),
    PRJ('rp-p2', 'Proyecto: reloj de ajedrez', 'rp_chess')
  ];

  const M3 = [
    L('rp12', 'PWM en MicroPython', 'wave', ['rp_pwmslice'], [
      I('pwm = PWM(Pin(15)); pwm.freq(1000); pwm.duty_u16(32768) → 1 kHz al 50 %.\n<b>duty_u16</b> va de 0 a 65535 en cualquier frecuencia: MicroPython lo traduce al nivel real del slice.'),
      Q('duty_u16(16384) es un ciclo de trabajo de…', ['25 %', '16 %', '50 %', '6,25 %'], '16384 / 65536 = 0,25.', { c: 'pwm' }),
      Nm('¿Qué duty_u16 corresponde al 75 %?', 49151, '', '65535 × 0,75 ≈ 49151.', { tol: 30 }),
      I('Recuerda los <b>slices</b>: GP n usa el slice (n ÷ 2) mod 8. Los dos canales de un slice comparten frecuencia. Cambiar pwm.freq() en GP2 cambia también la de GP3.', { tune: { viz: 'rp_pwm', params: PWMP() } }),
      G('rp_pwmSlice'), G('rp_pwmSlice'),
      Q('¿Qué frecuencia tiene al final GP0?', ['1000 Hz: GP0 y GP16 son el mismo slice y el mismo canal', '50 Hz', 'Las dos a la vez', 'Da error'], 'Slice 0, canal A en los dos: además comparten ciclo de trabajo.', { code: 'a = PWM(Pin(0)); a.freq(50)\nb = PWM(Pin(16)); b.freq(1000)' }),
      I('<b>Servos</b>: 50 Hz (periodo de 20 ms) con un pulso de 1 a 2 ms. duty_u16 = pulso / 20 ms × 65535: 1 ms → 3277; 1,5 ms → 4915; 2 ms → 6554.\nTambién existe duty_ns(1_500_000), que fija el ancho del pulso en nanosegundos.'),
      Nm('Servo a 50 Hz. ¿duty_u16 para un pulso de 1,25 ms?', 4096, '', '1,25 / 20 × 65535 ≈ 4096.', { tol: 10 }),
      Q('Quieres atenuar un LED sin parpadeo visible ni zumbido audible en la bobina de un motor. ¿Frecuencia?', ['Unos 20–25 kHz', '50 Hz', '1 Hz', '125 MHz'], 'Por encima del oído humano y con buena resolución.', { c: 'pwm' }),
      Q('¿Qué hace pwm.deinit()?', ['Para el PWM y libera el pin', 'Pone el duty al 100 %', 'Reinicia la placa', 'Cambia de slice'], 'Útil para devolver el pin a otra función.')
    ]),
    L('rp13', 'El ADC y read_u16', 'gauge', ['rp_adc16'], [
      I('El ADC del RP2040 es de <b>12 bits</b> y hasta 500 000 muestras por segundo, con 4 entradas externas (GP26–GP29; en el conector, GP26–GP28) y el <b>sensor de temperatura</b> como canal 4. La referencia es ADC_VREF: en la Pico, los 3,3 V filtrados.'),
      Q('ADC(26) y ADC(0) en MicroPython…', ['Son el mismo canal: GP26 es el ADC0', 'Son distintos', 'ADC(0) es el sensor de temperatura', 'ADC(26) no existe'], 'Puedes pasar el número de canal o el pin.'),
      G('rp_u16V'), G('rp_u16V'),
      I('read_u16() escala los 12 bits a 16, así que avanza a saltos de unos 16. La resolución real es 3,3 V / 4096 ≈ 0,8 mV.\nY en la práctica el RP2040 tiene bastante menos de 12 bits efectivos: ruido y algunos errores de linealidad conocidos.'),
      Nm('¿Cuántos mV vale un paso del ADC de 12 bits con 3,3 V de referencia?', 0.806, 'mV', '3300 / 4096 ≈ 0,806 mV.', { tol: 0.01 }),
      I('Para medir mejor:\n· <b>Promedia</b> varias lecturas.\n· Pon <b>GP23 a 1</b>: el regulador pasa a modo PWM, con menos rizado (y más consumo en reposo).\n· Usa una <b>referencia externa</b> en ADC_VREF (por ejemplo, un LM4040 de 3,0 V).\n· Lleva la masa analógica a <b>AGND</b>.'),
      Q('¿Por qué poner GP23 a 1 mejora las medidas del ADC en la Pico?', ['Fuerza el regulador al modo PWM: menos rizado, a cambio de algo más de consumo', 'Activa un ADC de 16 bits', 'Apaga la WiFi', 'Sube la referencia a 5 V'], 'En modo ahorro (PFM), el regulador mete un rizado irregular.'),
      Q('Promedias 16 lecturas de un valor fijo con ruido aleatorio. El ruido baja más o menos…', ['A la cuarta parte (√16 = 4)', 'A la dieciseisava parte', 'A la mitad', 'No baja'], 'El ruido aleatorio baja con la raíz del número de muestras.'),
      I('El ADC carga un pequeño condensador en cada muestra. Con fuentes de mucha impedancia (divisores de megaohmios) no le da tiempo y lee bajo e inestable. Mantén la impedancia en unos pocos kΩ o pon un condensador de 100 nF en la entrada si la señal es lenta.'),
      Q('Divisor de 1 MΩ y 1 MΩ en una entrada ADC; la lectura sale baja e inestable. ¿Arreglo?', ['Bajar el divisor a decenas de kΩ o poner 100 nF en la entrada', 'Subirlo a 10 MΩ', 'Usar duty_u16', 'Pasar a GP15'], 'El condensador actúa como depósito para el muestreo.', { c: 'divider' }),
      G('rp_vsys')
    ]),
    L('rp14', 'El sensor de temperatura interno', 'heat', ['rp_adc16'], [
      I('El canal 4 del ADC mide una unión PN dentro del chip. Su tensión <b>baja</b> unos 1,721 mV por cada grado y vale unos 0,706 V a 27 °C:\n<b>T = 27 − (V − 0,706) / 0,001721</b>'),
      Q('Si la tensión del sensor sube, la temperatura…', ['Baja: la pendiente es negativa', 'Sube', 'No cambia', 'Depende del reloj'], 'Como en un diodo: más calor, menos tensión directa.', { c: 'diode' }),
      G('rp_temp'), G('rp_temp'),
      I('Sensibilidad: un paso del ADC (0,8 mV) equivale a casi medio grado. Y un error pequeño en la referencia se nota mucho: con ADC_VREF un 1,5 % por debajo de lo que supones, el error pasa de 6 °C.'),
      Nm('Un paso del ADC (0,806 mV) equivale a cuántos °C en este sensor?', 0.47, '°C', '0,806 / 1,721 ≈ 0,47 °C.', { tol: 0.02 }),
      Q('Tu ADC_VREF real es 3,25 V pero calculas con 3,3 V. El error en temperatura…', ['Es de varios grados: la referencia escala toda la medida', 'Es despreciable', 'Es exactamente 0,05 °C', 'No afecta porque el sensor es interno'], 'Calculas 0,717 V en vez de 0,706: unos 6 °C de error.'),
      Q('¿Qué mejorarías primero en este código?', ['Promediar varias lecturas', 'Multiplicar por 1000', 'Usar ADC(26)', 'Nada, es perfecto'], 'Una sola lectura salta medio grado arriba y abajo.', { code: 'from machine import ADC\ns = ADC(4)\nv = s.read_u16() * 3.3 / 65535\nprint(27 - (v - 0.706) / 0.001721)' }),
      I('Calibrar en un punto: compara con un termómetro fiable y guarda la diferencia. En dos puntos (frío y caliente) corriges también la pendiente.\nÚsalo para vigilar el chip; para medir el aire, un sensor externo (DS18B20, SHT31, BME280).'),
      Q('La CPU pasa de reposo a calcular al máximo. La lectura del sensor interno…', ['Sube algo: mide el silicio, que se calienta al trabajar', 'Baja', 'No cambia', 'Se vuelve negativa'], 'Por eso no es un buen termómetro ambiental.')
    ]),
    L('rp15', 'Timer e interrupciones de pin', 'timer', ['rp_irq'], [
      I('<b>Timer(period=500, mode=Timer.PERIODIC, callback=f)</b> llama a f cada 500 ms; con Timer.ONE_SHOT, una sola vez. El callback recibe el propio temporizador como argumento. En el RP2040 se basan en el contador de microsegundos del chip.'),
      Q('¿Qué hace?', ['Hace parpadear el LED cada 250 ms mientras el programa sigue con otras cosas', 'Espera 250 ms y se para', 'Bloquea el REPL', 'Da error: no se permite lambda'], 'El REPL sigue disponible mientras parpadea.', { code: "from machine import Timer, Pin\nled = Pin('LED', Pin.OUT)\nt = Timer(period=250, mode=Timer.PERIODIC,\n          callback=lambda t: led.toggle())" }),
      I('<b>pin.irq(trigger=Pin.IRQ_FALLING, handler=f)</b> llama a f(pin) en cada flanco de bajada. También IRQ_RISING, o los dos con Pin.IRQ_FALLING | Pin.IRQ_RISING.'),
      Q('Pulsador a GND con pull-up: ¿qué disparo detecta el momento de pulsar?', ['Pin.IRQ_FALLING', 'Pin.IRQ_RISING', 'Ninguno', 'Pin.IRQ_LOW_LEVEL'], 'Al pulsar, el pin cae de 1 a 0.', { c: 'pullup' }),
      I('Reglas del handler: <b>corto</b>, sin sleep, sin print largos, sin ficheros. Sube una bandera o anota el instante y deja el trabajo al bucle principal (o usa micropython.schedule).\nCon <b>hard=True</b> no puedes reservar memoria. micropython.alloc_emergency_exception_buf(100) te deja ver los errores que ocurran dentro.'),
      Q('¿Qué cambiarías en este handler?', ['Que solo suba una bandera y el bucle principal espere y dibuje', 'Subir el sleep a 500 ms', 'Usar IRQ_RISING', 'Nada, está bien'], 'Dibujar y esperar dentro del handler bloquea todo lo demás.', { code: "def pulsado(p):\n    time.sleep_ms(50)\n    oled.text('Pulsado', 0, 0)\n    oled.show()\nb.irq(trigger=Pin.IRQ_FALLING, handler=pulsado)" }),
      Q('Con hard=True, ¿qué línea dará problemas dentro del handler?', ['lecturas.append(adc.read_u16())', 'contador += 1', 'bandera = True', 'led.value(1)'], 'append puede necesitar más memoria para la lista.'),
      I('Los pulsadores <b>rebotan</b>: varios flancos en pocos milisegundos. En el handler, compara con ticks_ms (es seguro) e ignora lo que llegue demasiado pronto.'),
      Q('¿Qué hace este handler?', ['Cuenta pulsaciones exigiendo 30 ms de calma antes de cada una', 'Cuenta todos los flancos', 'Espera 30 ms', 'Nunca cuenta'], 'Como «ultimo» se actualiza en cada flanco, los rebotes reinician la espera.', { code: 'ultimo = 0\ndef pulsado(p):\n    global ultimo, cuenta\n    ahora = time.ticks_ms()\n    if time.ticks_diff(ahora, ultimo) > 30:\n        cuenta += 1\n    ultimo = ahora' }),
      Q('Un handler «blando» de MicroPython puede tardar en ejecutarse…', ['Desde microsegundos hasta milisegundos, si el intérprete está ocupado', 'Siempre 0 ns', 'Exactamente 1 ms', 'Un segundo'], 'Por ejemplo, durante una recogida de basura.'),
      Q('Necesitas medir pulsos de 2 µs con exactitud. ¿Qué usas?', ['PIO o un slice de PWM como contador, no una interrupción en Python', 'Pin.irq con hard=False', 'time.sleep_us', 'Un Timer de 1 ms'], 'La latencia de Python es mayor que el propio pulso.')
    ]),
    L('rp16', 'I²C, SPI y UART en MicroPython', 'bus', ['rp_python', 'pullup'], [
      I('El RP2040 tiene dos de cada: I2C(0) e I2C(1), SPI(0) y SPI(1), UART(0) y UART(1), cada uno en sus grupos de pines. Si te faltan, existen SoftI2C y SoftSPI por software… y el PIO.'),
      Q('¿Qué significa [118]?', ['Hay un dispositivo en la dirección 0x76', 'Hay 118 dispositivos', 'Error 118', 'La frecuencia es 118 kHz'], '118 = 0x76: por ejemplo, un BME280.', { code: 'i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400_000)\nprint(i2c.scan())\n[118]' }),
      Q('¿Funciona I2C(0, sda=Pin(6), scl=Pin(7))?', ['No: GP6 y GP7 son pines de I²C1', 'Sí, cualquier pin vale', 'Solo a 100 kHz', 'Solo en la Pico W'], 'Usa I2C(1, sda=Pin(6), scl=Pin(7)).'),
      I('Leer registros: readfrom_mem(dir, reg, n) y writeto_mem(dir, reg, bytes).\nLos bytes se convierten en números con <b>struct.unpack</b>: \'>h\' = entero de 16 bits con signo, byte alto primero; \'&lt;H\' = sin signo, byte bajo primero.'),
      Q('¿Qué indica >h?', ['Entero de 16 bits con signo, byte alto primero (big-endian)', 'Entero sin signo de 8 bits', 'Float de 32 bits', 'Texto'], 'El MPU-6050, por ejemplo, entrega así sus medidas.', { code: "b = i2c.readfrom_mem(0x68, 0x3B, 2)\nax = struct.unpack('>h', b)[0]" }),
      I('SPI: SPI(0, baudrate=10_000_000, sck=Pin(18), mosi=Pin(19), miso=Pin(16)). El <b>CS</b> lo manejas tú con un Pin normal. Funciones: write, read, write_readinto.'),
      Q('¿Por qué se baja cs antes y se sube después?', ['Para seleccionar ese chip solo durante la transacción', 'Para alimentarlo', 'Para ponerlo en modo I²C', 'No hace falta'], 'Varios chips comparten SCK, MOSI y MISO; el CS elige con quién hablas.', { code: "cs.value(0)\nspi.write(b'\\x9f')\nid = spi.read(3)\ncs.value(1)" }),
      I('UART: UART(1, baudrate=9600, tx=Pin(4), rx=Pin(5)). uart.any() dice cuántos bytes esperan; read(n), readline() y write().\nTX con RX cruzados, masa común y niveles de 3,3 V.'),
      Q('Un GPS envía frases de texto por UART a 9600 baudios. ¿Cómo lees una completa?', ['Con uart.readline() cuando uart.any() indique datos', 'Con i2c.scan()', 'Con spi.read(9600)', 'Con adc.read_u16()'], 'Cada frase termina en salto de línea.'),
      { t: 'match', q: 'Une cada bus con su rasgo.', pairs: [['I²C', 'Direcciones, dos hilos y pull-ups'], ['SPI', 'Rápido, un CS por dispositivo'], ['UART', 'Asíncrono, TX y RX cruzados'], ['1-Wire', 'Un hilo de datos y pull-up de 4,7 kΩ']] },
      Q('i2c.scan() devuelve [] con el sensor conectado. ¿Qué compruebas primero?', ['Alimentación, masa común, SDA/SCL no cruzados y pull-ups', 'La versión de Thonny', 'El duty del PWM', 'La WiFi'], 'Casi siempre es cableado.', { c: 'pullup' })
    ]),
    L('rp17', 'Multitarea con asyncio', 'timer', ['rp_async'], [
      I('<b>asyncio</b> reparte el tiempo entre tareas que se turnan. Una tarea es una función <b>async def</b>; dentro, <b>await</b> cede el turno. create_task() la lanza y asyncio.run() arranca todo.\n(En versiones antiguas el módulo se llamaba uasyncio.)'),
      Q('¿Qué pasa?', ['Los dos LEDs parpadean a ritmos distintos durante 10 s', 'Solo parpadea el primero', 'Parpadean a la vez a 200 ms', 'Da error: no se pueden crear dos tareas'], 'Cada await sleep_ms deja correr a la otra tarea.', { code: 'import asyncio\nfrom machine import Pin\n\nasync def parpadea(led, ms):\n    while True:\n        led.toggle()\n        await asyncio.sleep_ms(ms)\n\nasync def main():\n    asyncio.create_task(parpadea(Pin(14, Pin.OUT), 200))\n    asyncio.create_task(parpadea(Pin(15, Pin.OUT), 700))\n    await asyncio.sleep(10)\n\nasyncio.run(main())' }),
      Q('En ese programa, ¿qué cambia si pones time.sleep_ms(ms) en lugar de await asyncio.sleep_ms(ms)?', ['Solo correría la primera tarea: nunca cede el turno', 'Nada', 'Va más rápido', 'Las dos irían a 700 ms'], 'time.sleep bloquea todo el planificador.'),
      I('Para comunicar tareas: <b>asyncio.Event</b> (una tarea hace set(), otra espera con await ev.wait()).\nPara avisar desde una interrupción: <b>asyncio.ThreadSafeFlag</b>: el handler hace flag.set() y la tarea await flag.wait().'),
      Q('¿Cómo avisa una interrupción de pin a una tarea de asyncio?', ['Con ThreadSafeFlag: el handler hace set() y la tarea espera con await flag.wait()', 'Llamando a la tarea desde el handler', 'Con time.sleep en el handler', 'No se puede'], 'Es el puente seguro entre los dos mundos.'),
      I('Tiempos máximos: <b>await asyncio.wait_for(coro, 2)</b> lanza TimeoutError si coro tarda más de 2 s. Imprescindible con sensores que pueden no responder y con la red.'),
      Q('¿Qué falla en esta tarea?', ['No tiene ningún await: acapara la CPU y las demás tareas nunca corren', 'Falta global', 'adc no funciona en asyncio', 'Nada'], 'Añade await asyncio.sleep_ms(…) en el bucle.', { code: 'async def leer():\n    while True:\n        valor = adc.read_u16()\n        procesar(valor)' }),
      Q('¿Usa asyncio los dos núcleos?', ['No: todo corre en un núcleo, por turnos', 'Sí, reparte las tareas', 'Solo en la Pico 2', 'Solo con create_task'], 'Para el segundo núcleo está _thread (lo verás en el módulo 6).'),
      { t: 'order', q: 'Ordena el ciclo de vida de un programa con asyncio.', items: ['asyncio.run(main()) arranca el planificador', 'main crea las tareas con create_task', 'Una tarea corre hasta su siguiente await', 'El planificador elige otra tarea lista', 'Cuando main termina, asyncio.run devuelve'], e: 'Las tareas creadas viven mientras main siga.' },
      Q('¿Cuándo prefieres asyncio a un bucle con ticks_ms?', ['Cuando hay muchas cosas con ritmos distintos que esperan: botones, red, sensores', 'Para generar 1 MHz exactos', 'Nunca', 'Solo para un LED'], 'Para tiempos exactos, hardware (PWM, PIO).')
    ]),
    PRJ('rp-p3', 'Proyecto: registrador de temperatura y luz', 'rp_logger'),
    PRJ('rp-p4', 'Proyecto: cerradura con tarjetas', 'rp_lock')
  ];

  const M4 = [
    L('rp18', 'Por qué C y cómo se compila', 'code', ['rp_sdk'], [
      I('¿Por qué bajar a C? <b>Velocidad</b> (de decenas de veces más), <b>tiempos predecibles</b> y acceso completo al hardware: DMA, PIO con DMA, los dos núcleos sin límites, USB a medida. De hecho, MicroPython para la Pico está escrito en C sobre el mismo SDK.'),
      I('Herramientas: el <b>pico-sdk</b> (bibliotecas en C), <b>CMake</b> (prepara la compilación), el compilador <b>arm-none-eabi-gcc</b> (o el de RISC-V para el Hazard3), Ninja o Make, y <b>picotool</b>. La extensión oficial de Raspberry Pi Pico para VS Code los instala por ti.'),
      { t: 'order', q: 'Ordena el camino de main.c a la placa.', items: ['Escribes main.c y CMakeLists.txt', 'CMake configura el proyecto', 'El compilador genera código objeto', 'El enlazador une tu código y las bibliotecas', 'Salen el .elf y el .uf2', 'Arrastras el .uf2 o grabas el .elf con el depurador'], e: 'Cada vez que compilas, CMake solo rehace lo necesario.' },
      Q('¿Qué línea hace que printf salga por el USB?', ['pico_enable_stdio_usb(parpadeo 1)', 'pico_add_extra_outputs(parpadeo)', 'project(parpadeo C CXX ASM)', 'include(pico_sdk_import.cmake)'], 'También existe pico_enable_stdio_uart.', { code: CODE_CMAKE }),
      Q('¿Y cuál genera el .uf2 además del .elf?', ['pico_add_extra_outputs(parpadeo)', 'pico_sdk_init()', 'add_executable(parpadeo main.c)', 'target_link_libraries(parpadeo pico_stdlib)'], 'También genera .bin, .hex y el desensamblado.', { code: CODE_CMAKE }),
      I('<b>PICO_BOARD</b> le dice al SDK qué placa tienes (pico, pico_w, pico2, pico2_w): elige el chip, el tamaño de la flash y los pines especiales como el LED. Se fija al configurar, por ejemplo con -DPICO_BOARD=pico_w.'),
      Q('Compilas para pico y grabas en una Pico W: el LED de la placa no parpadea. ¿Por qué?', ['En la W el LED va al chip de radio: compila con PICO_BOARD=pico_w y usa cyw43_arch', 'El LED está roto', 'Falta stdio', 'Necesita 5 V'], 'cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1) lo enciende.'),
      { t: 'match', q: 'Une cada fichero con su uso.', pairs: [['.elf', 'Con símbolos, para depurar'], ['.uf2', 'Para arrastrar en BOOTSEL'], ['.bin', 'Imagen binaria pura'], ['.pio.h', 'Programa PIO ensamblado como cabecera']] },
      Q('¿Qué biblioteca enlazas para usar multicore_launch_core1()?', ['pico_multicore', 'hardware_pwm', 'pico_stdlib, que lo incluye todo', 'tinyusb_device'], 'pico_stdlib solo trae lo básico.'),
      Q('Un parpadeo en C ocupa decenas de KB; el firmware de MicroPython, cientos. ¿Por qué el de C es tan pequeño?', ['Solo incluye las partes del SDK que usas; MicroPython lleva el intérprete entero', 'C comprime el código', 'El de C no usa bibliotecas', 'MicroPython guarda vídeos de ejemplo'], 'El enlazador descarta lo que nadie llama.')
    ]),
    L('rp19', 'GPIO y stdio en C', 'chip', ['rp_sdk'], [
      I('El parpadeo en C con el SDK. Fíjate en que no hay setup() ni loop(): hay un main() con su propio bucle infinito.', { code: CODE_BLINK_C }),
      { t: 'match', q: 'Traduce de Arduino al pico-sdk.', pairs: [['pinMode(15, OUTPUT)', 'gpio_init(15); gpio_set_dir(15, GPIO_OUT)'], ['digitalWrite(15, HIGH)', 'gpio_put(15, 1)'], ['digitalRead(14)', 'gpio_get(14)'], ['INPUT_PULLUP', 'gpio_pull_up(14)']] },
      Q('¿Cuándo se enciende el LED de GP15?', ['Cuando el pulsador de GP14 a masa está pulsado', 'Cuando está suelto', 'Nunca', 'Siempre'], 'Pull-up: pulsado lee 0 y !0 es verdadero.', { code: 'gpio_init(14);\ngpio_set_dir(14, GPIO_IN);\ngpio_pull_up(14);\nif (!gpio_get(14)) gpio_put(15, 1);', c: 'pullup' }),
      I('<b>stdio</b>: printf, getchar y getchar_timeout_us(0), que devuelve PICO_ERROR_TIMEOUT si no hay nada (no bloquea). stdio_init_all() lo arranca.\nPor USB, el ordenador tarda un momento en reconocer el puerto: lo que imprimas en los primeros instantes se pierde.'),
      Q('Los primeros printf tras arrancar no aparecen en el monitor serie. ¿Por qué?', ['El USB aún no se ha enumerado: espera con stdio_usb_connected()', 'printf no existe en el SDK', 'El monitor serie solo lee números', 'Hay que usar Serial.print'], 'Un bucle while (!stdio_usb_connected()) sleep_ms(10); lo resuelve.'),
      I('Varios pines a la vez, en el mismo ciclo: gpio_put_masked(máscara, valor), gpio_set_mask, gpio_clr_mask y gpio_xor_mask. Escriben en el bloque SIO, el camino más rápido de la CPU a los pines.'),
      { t: 'bits', q: '¿Qué máscara pasas a gpio_set_mask para GP1, GP3 y GP4?', n: 8, target: 26, e: '2 + 8 + 16 = 26 (0b11010).', c: 'rp_sdk' },
      Q('¿Qué hace?', ['Invierte GP25 sin tocar los demás pines', 'Pone a 1 todos los pines', 'Lee GP25', 'Apaga GP25 siempre'], 'XOR con un 1 invierte ese bit.', { code: 'gpio_xor_mask(1u << 25);' }),
      I('Tiempo: sleep_ms, sleep_us, busy_wait_us y <b>time_us_64()</b>, un contador de microsegundos de 64 bits.\nPara periodos exactos: sleep_until(make_timeout_time_ms(…)) o calcular el siguiente instante absoluto.'),
      Q('¿Por qué time_us_64() no tiene el problema de desbordamiento de millis() de Arduino?', ['Con 64 bits a 1 MHz tardaría cientos de miles de años en dar la vuelta', 'Porque se reinicia cada día', 'Porque cuenta en segundos', 'Sí lo tiene, a los 49 días'], '2⁶⁴ µs son unos 585 000 años.'),
      Nm('¿Cuántos minutos tarda en dar la vuelta un contador de 32 bits de microsegundos?', 71.6, 'min', '2³² / 10⁶ = 4295 s ≈ 71,6 min.', { tol: 0.5 })
    ]),
    L('rp20', 'PWM por slices a fondo', 'wave', ['rp_pwmslice'], [
      I('Explora un slice: el contador sube de 0 a <b>wrap</b> con el reloj dividido; la salida está alta mientras el contador está por debajo del <b>nivel</b>.\nLa visualización supone clk_sys = 125 MHz, el valor clásico; en tu placa compruébalo con clock_get_hz(clk_sys).', { tune: { viz: 'rp_pwm', params: PWMP() } }),
      I('<b>f = clk_sys / ((wrap + 1) × div)</b>.\nEl divisor tiene 8 bits enteros y 4 de fracción: de 1 a 255 y 15/16, en dieciseisavos.\nEn modo <b>fase correcta</b> el contador sube y baja: la frecuencia se reduce a la mitad y los pulsos quedan centrados.'),
      TU('Con clk_sys = 125 MHz, consigue exactamente 25 kHz, la frecuencia de los ventiladores de PC.', 'rp_pwm', PWMP({ D: sl('Nivel', 30, 0, 100, 1, '%') }), { q: 'f', min: 24900, max: 25100, text: 'Objetivo: 25 kHz', hint: 'Con divisor 1: wrap = 125 000 000 / 25 000 − 1.' }, 'Divisor 1 y wrap 4999: 5000 niveles, más de 12 bits de resolución.'),
      TU('Ahora 50 Hz para un servo (clk_sys = 125 MHz).', 'rp_pwm', PWMP({ div: { label: 'Divisor', val: 4, list: [1, 2, 4, 8, 16, 25, 64, 125, 250], dec: 0 } }), { q: 'f', min: 49.5, max: 50.5, text: 'Objetivo: 50 Hz', hint: 'div × (wrap + 1) = 2 500 000.' }, 'Divisor 125 y wrap 19 999, o divisor 250 y wrap 9999.'),
      G('rp_pwmFreq'), G('rp_pwmWrap'),
      Q('Con clk_sys = 125 MHz y divisor 1, ¿qué sale por GP15?', ['125 kHz al 25 %', '1 kHz al 25 %', '125 kHz al 75 %', '125 MHz al 25 %'], '125 MHz / 1000 = 125 kHz; 250 / 1000 = 25 %.', { code: 'gpio_set_function(15, GPIO_FUNC_PWM);\nuint s = pwm_gpio_to_slice_num(15);\npwm_set_wrap(s, 999);\npwm_set_chan_level(s, PWM_CHAN_B, 250);\npwm_set_enabled(s, true);' }),
      Q('Si en ese código pusieras PWM_CHAN_A en vez de PWM_CHAN_B, ¿qué pasaría?', ['GP15 no cambiaría: es el canal B; ese nivel iría a GP14', 'Nada, es igual', 'Se duplicaría la frecuencia', 'No compilaría'], 'Impar = canal B.'),
      I('El canal <b>B</b> puede ser <b>entrada</b>: con PWM_DIV_B_HIGH el contador solo avanza mientras B está alta (mide ciclo de trabajo); con PWM_DIV_B_RISING o FALLING cuenta flancos (frecuencímetro). Solo el canal B, es decir, GPIO impares.'),
      Q('Quieres contar los pulsos de un caudalímetro con un slice. ¿En qué pin?', ['En un GPIO impar (canal B), con PWM_DIV_B_RISING', 'En cualquier GPIO par', 'En GP26 (ADC)', 'En RUN'], 'Lo usarás en el proyecto del ventilador.'),
      TU('Con la fase correcta activada y clk_sys = 125 MHz, consigue 62,5 kHz.', 'rp_pwm', PWMP({ pc: { val: 1, fixed: true } }), { q: 'f', min: 62000, max: 63000, text: 'Objetivo: 62,5 kHz en fase correcta', hint: 'En fase correcta: f = 125 MHz / (2 × (wrap + 1) × div).' }, 'Divisor 1 y wrap 999: el doble de recorrido, la mitad de frecuencia.'),
      Q('¿Por qué los controladores de motores trifásicos prefieren la fase correcta?', ['Los pulsos quedan centrados y simétricos, sin flancos coincidentes entre canales', 'Porque va al doble de frecuencia', 'Porque gasta menos memoria', 'Porque no necesita wrap'], 'Menos ruido y armónicos más limpios.')
    ]),
    L('rp21', 'Relojes del sistema', 'timer', ['rp_clock'], [
      I('Fuentes de reloj: el <b>ROSC</b> (oscilador interno, impreciso, el del arranque), el <b>XOSC</b> (cristal de 12 MHz) y dos PLL: <b>PLL_SYS</b> y <b>PLL_USB</b>.\nRelojes que salen de ellas: clk_sys, clk_peri, clk_usb (48 MHz), clk_adc (48 MHz), clk_ref y clk_rtc.'),
      I('¿A cuánto va tu Pico? Durante años, el RP2040 arrancaba a <b>125 MHz</b> (su hoja de datos original daba 133 MHz como máximo). En 2025 Raspberry Pi certificó <b>200 MHz</b> y las versiones recientes del pico-sdk usan 200 MHz por defecto; MicroPython puede variar según la versión.\nNo lo supongas: compruébalo con <b>clock_get_hz(clk_sys)</b> en C o <b>machine.freq()</b> en MicroPython, y calcula tus divisores a partir de ese valor.'),
      I('Juega con el PLL. El VCO debe quedar entre 750 y 1600 MHz.', { tune: { viz: 'rp_pll', params: PLLP() } }),
      TU('Saca 125 MHz del PLL.', 'rp_pll', PLLP(), { q: 'fok', min: 124.9, max: 125.1, text: 'Objetivo: 125 MHz con el VCO en rango', hint: '1500 MHz / 12: por ejemplo FBDIV 125, POSTDIV1 6 y POSTDIV2 2.' }, 'Fue la configuración por defecto del RP2040 durante años; las versiones recientes del SDK usan 200 MHz.'),
      TU('Ahora los 48 MHz del USB.', 'rp_pll', PLLP(), { q: 'fok', min: 47.95, max: 48.05, text: 'Objetivo: 48 MHz con el VCO en rango', hint: '1200 / 25 o 1440 / 30.' }, 'FBDIV 100 con 5 y 5, o FBDIV 120 con 6 y 5.'),
      G('rp_pll'),
      Q('¿Qué cambia de velocidad si cambias clk_sys?', ['Los núcleos, el bus, el DMA, el PIO y el PWM', 'Solo la CPU', 'El USB', 'El ADC'], 'USB y ADC tienen sus 48 MHz aparte.'),
      I('En C: <b>set_sys_clock_khz(200000, true)</b>. En MicroPython: <b>machine.freq(200_000_000)</b>.\nSubir el reloj por encima de lo especificado (overclock) suele funcionar, pero no está garantizado: puede necesitar más tensión de núcleo y una flash que aguante el reloj QSPI resultante.'),
      Q('Subes clk_sys y la placa se cuelga al ejecutar desde la flash. Sospecha principal:', ['El reloj de la flash QSPI, que sale de clk_sys, va demasiado rápido para ese chip', 'El USB', 'La RAM se llena', 'El LED'], 'Se puede aumentar el divisor del reloj de la flash.'),
      Q('¿Qué significa el true?', ['Que se detenga con un error si esa frecuencia no se puede conseguir exactamente', 'Que use el ROSC', 'Que sea temporal', 'Que active el USB'], 'Con false, devuelve false y no cambia nada.', { code: 'set_sys_clock_khz(133000, true);' }),
      I('El chip puede <b>medir sus propios relojes</b> con un frecuencímetro interno (frequency_count_khz) y <b>sacarlos por un pin</b> (por ejemplo, clk_gpout0 en GP21) para verlos en el osciloscopio.'),
      Q('¿Por qué el USB necesita su propio reloj de 48 MHz exactos?', ['El USB exige una tolerancia muy pequeña en la frecuencia', 'Para gastar menos', 'Por costumbre', 'No lo necesita'], 'Por eso un diseño con USB lleva cristal.')
    ]),
    L('rp22', 'Interrupciones y temporizadores en C', 'timer', ['rp_irq'], [
      I('<b>gpio_set_irq_enabled_with_callback(pin, GPIO_IRQ_EDGE_FALL, true, &amp;cb)</b>. Hay un solo callback por núcleo para todos los GPIO: el argumento gpio te dice cuál fue.'),
      Q('¿Por qué pulsos es volatile?', ['Para que el compilador no suponga que no cambia y la vuelva a leer de memoria en main', 'Para que sea más rápida', 'Para guardarla en la flash', 'Es obligatorio en todas las variables'], 'Sin volatile, un bucle while (pulsos == 0) podría no salir nunca.', { code: 'volatile uint32_t pulsos = 0;\nvoid cb(uint gpio, uint32_t eventos) {\n    if (gpio == 14) pulsos++;\n}\n// en main:\ngpio_set_irq_enabled_with_callback(14, GPIO_IRQ_EDGE_FALL, true, &cb);' }),
      I('Temporizadores: <b>add_repeating_timer_ms(−10, cb, NULL, &amp;t)</b>; con signo negativo, el periodo se mide de inicio a inicio. El callback devuelve true para seguir y false para parar. Para una sola vez: add_alarm_in_ms.'),
      Q('add_repeating_timer_ms(−10, …) frente a (10, …): ¿diferencia?', ['Con −10 el periodo es de inicio a inicio; con 10, desde que acaba el callback', 'Ninguna', 'Con −10 está parado', 'El negativo es en microsegundos'], 'Para muestrear a ritmo fijo, negativo.'),
      Q('¿Cuándo se detiene el temporizador?', ['Cuando el callback devuelve false, tras guardar 1000 muestras', 'Nunca', 'Tras 10 ms', 'Al llenarse la RAM'], 'return n < 1000 deja de ser verdadero al llegar a 1000.', { code: 'bool tick(struct repeating_timer *t) {\n    muestras[n++] = adc_read();\n    return n < 1000;\n}' }),
      I('Reglas en C: callback corto, sin printf (lento y puede bloquear), sin sleep. Las variables compartidas, <b>volatile</b>; y si son de más de 32 bits o varias relacionadas, léelas con las interrupciones desactivadas un instante (save_and_disable_interrupts / restore_interrupts).'),
      Q('En main lees un contador de 64 bits que la interrupción actualiza. ¿Riesgo en un Cortex-M0+?', ['Leer media variable vieja y media nueva: la lectura no es atómica; protégela', 'Ninguno', 'Que se borre la flash', 'Que el compilador la ignore'], 'El M0+ lee 32 bits de cada vez.'),
      I('Cada núcleo tiene su propio controlador de interrupciones (NVIC). Las interrupciones se atienden en el núcleo que las configuró. Puedes ajustar prioridades con irq_set_priority.'),
      Q('Llamas a gpio_set_irq_enabled_with_callback desde el núcleo 1. ¿Dónde se ejecuta el callback?', ['En el núcleo 1', 'En el núcleo 0', 'En los dos', 'En el PIO'], 'Útil para repartir trabajo.', { c: 'rp_multicore' }),
      { t: 'match', q: 'Une cada necesidad con su herramienta.', pairs: [['Pulsador a masa', 'GPIO_IRQ_EDGE_FALL'], ['Señal que sube', 'GPIO_IRQ_EDGE_RISE'], ['Algo cada 1 ms', 'add_repeating_timer_ms'], ['Una vez dentro de 5 s', 'add_alarm_in_ms']] }
    ]),
    L('rp23', 'Depurar con SWD', 'code', ['rp_sdk'], [
      I('<b>SWD</b> son dos hilos (SWCLK y SWDIO) más masa. Con un depurador (otra Pico con el firmware debugprobe, o la Raspberry Pi Debug Probe), <b>OpenOCD</b> y <b>GDB</b> puedes grabar, parar el programa, mirar variables y avanzar línea a línea.'),
      Q('¿Qué ventaja tiene depurar por SWD frente a llenar el código de printf?', ['Paras el programa donde quieras y miras variables y registros sin cambiar el código', 'Es inalámbrico', 'No necesita el .elf', 'Ninguna'], 'Y no alteras los tiempos con mensajes.'),
      { t: 'order', q: 'Ordena una sesión de depuración.', items: ['Conecta SWCLK, SWDIO y GND del depurador a la placa', 'Arranca OpenOCD con la configuración del RP2040', 'Arranca GDB con tu .elf', 'Graba con load', 'Pon un punto de ruptura y ejecuta con continue'], e: 'VS Code automatiza estos pasos.' },
      { t: 'match', q: 'Une cada orden de GDB con lo que hace.', pairs: [['break', 'Para en una línea o función'], ['next', 'Siguiente línea sin entrar en funciones'], ['step', 'Entra en la función'], ['bt', 'Muestra la pila de llamadas']] },
      I('Un error grave (puntero nulo, pila desbordada, acceso desalineado) lleva al Cortex-M0+ a <b>HardFault</b>. Parado ahí, bt te enseña la cadena de llamadas que te llevó.\nEl M0+ no admite accesos de 16 o 32 bits a direcciones desalineadas.'),
      Q('En un Cortex-M0+, ¿qué ocurre?', ['HardFault: acceso de 32 bits desalineado', 'Escribe bien', 'Escribe solo un byte', 'Error de compilación'], '&buf[1] no es múltiplo de 4.', { code: 'uint8_t buf[8];\nuint32_t *p = (uint32_t *)&buf[1];\n*p = 0x12345678;' }),
      Q('El programa se cuelga «a veces». Lo paras en GDB y está en isr_hardfault. ¿Primera orden?', ['bt, para ver la pila de llamadas', 'load', 'quit', 'continue'], 'La pila dice qué función provocó el fallo.'),
      I('Sin depurador también hay trucos: un LED de estado, <b>panic()</b> con un mensaje y, sobre todo, un <b>GPIO de depuración</b>: lo subes al entrar en una rutina y lo bajas al salir, y mides con el osciloscopio o el analizador lógico.'),
      Q('¿Cómo mides cuánto tarda tu interrupción sin depurador?', ['Subes un GPIO al entrar y lo bajas al salir, y mides el pulso', 'Con printf dentro de la interrupción', 'Contando a ojo', 'Con sleep_ms'], 'El pulso mide exactamente lo que dura.'),
      Q('¿Qué hilos mínimos conectas entre el depurador y tu placa?', ['SWCLK, SWDIO y GND', 'TX y RX', 'SDA y SCL', 'D+ y D−'], 'Opcionalmente, también una UART para la consola.')
    ]),
    PRJ('rp-p5', 'Proyecto: control de ventilador en C', 'rp_fan')
  ];

  const M5 = [
    L('rp24', 'Qué es el PIO', 'bus', ['rp_pio'], [
      I('Hay protocolos que ningún periférico fijo implementa: tiras WS2812, VGA, una tercera UART, encoders… Hacerlos moviendo pines desde la CPU («bit-banging») tiembla en cuanto la CPU hace otra cosa.\nEl <b>PIO</b> (E/S programable) es hardware que ejecuta tus propios programas de pines con temporización exacta.'),
      I('Cada <b>bloque PIO</b> tiene:\n· <b>4 máquinas de estados</b> (SM).\n· Una memoria de <b>32 instrucciones</b> compartida por las cuatro.\n· Por máquina: registros <b>X</b> e <b>Y</b>, registros de desplazamiento <b>OSR</b> (salida) e <b>ISR</b> (entrada), contador de programa, <b>FIFO</b> de envío y de recepción de 4 palabras y un divisor de reloj.\nEl RP2040 tiene 2 bloques; el RP2350, 3.'),
      Q('¿Cuántas máquinas de estados PIO tiene un RP2040 en total?', ['8', '4', '2', '12'], '2 bloques × 4.'),
      Nm('¿Y un RP2350?', 12, 'máquinas', '3 bloques × 4.'),
      Q('Cuatro máquinas del mismo bloque usan programas que suman 40 instrucciones. ¿Caben?', ['No: la memoria del bloque es de 32 instrucciones en total', 'Sí: son 32 por máquina', 'Sí, si van a menos frecuencia', 'Solo en la Pico W'], 'Si dos máquinas usan el mismo programa, lo comparten y solo ocupa una vez.'),
      I('Cada instrucción tarda <b>un ciclo</b> (más el retardo que le pongas). La máquina solo se comunica con el exterior por sus <b>pines</b>, sus <b>FIFO</b> (la CPU o el DMA las llenan y vacían) y unas <b>banderas IRQ</b>.'),
      { t: 'match', q: 'Une cada pieza con su papel.', pairs: [['TX FIFO', 'De la CPU a la máquina'], ['RX FIFO', 'De la máquina a la CPU'], ['OSR', 'Registro del que salen bits'], ['ISR', 'Registro al que entran bits']] },
      Q('¿Qué NO puede hacer una máquina PIO?', ['Multiplicar dos números', 'Esperar a que un pin cambie', 'Sacar bits por varios pines a la vez', 'Contar hacia abajo un registro'], 'Su «aritmética» se limita a restar 1, invertir y comparar.'),
      Q('Una UART extra hecha con PIO mientras la CPU calcula una FFT. ¿Tiembla la señal?', ['No: la máquina la genera sola, ciclo a ciclo', 'Sí, mucho', 'Solo si la FFT usa float', 'Se para'], 'La CPU solo tiene que mantener llena la FIFO.'),
      I('Con PIO se han hecho salidas de vídeo VGA y DVI, tarjetas SD en modo de 4 bits, un segundo puerto USB, Ethernet sencillo, motores paso a paso, lectores de encoder y buses paralelos para pantallas.')
    ]),
    L('rp25', 'Las nueve instrucciones', 'bus', ['rp_pio'], [
      I('Todo programa PIO se escribe con nueve instrucciones: <b>jmp, wait, in, out, push, pull, mov, irq y set</b>. Cada una ocupa 16 bits, e incluye 5 bits para retardo y side-set.'),
      { t: 'match', q: 'Une cada instrucción con lo que hace.', pairs: [['jmp', 'Salta, con condición opcional'], ['wait', 'Espera a un pin o a una IRQ'], ['set', 'Escribe un valor inmediato de 0 a 31'], ['mov', 'Copia entre registros']] },
      { t: 'match', q: 'Y estas cuatro.', pairs: [['out', 'Saca bits del OSR'], ['in', 'Mete bits en el ISR'], ['pull', 'Carga el OSR desde la TX FIFO'], ['push', 'Envía el ISR a la RX FIFO']] },
      I('Condiciones de jmp: siempre, <b>!x</b> (X es cero), <b>x--</b> (X no es cero; y luego le resta 1), !y, y--, <b>x!=y</b>, <b>pin</b> (un pin elegido está alto) y <b>!osre</b> (al OSR aún le quedan bits).'),
      Q('jmp(x_dec, "bucle") con X = 3 al entrar. ¿Cuántas veces salta?', ['3', '4', '2', 'Infinitas'], 'Salta con 3, 2 y 1; con 0 sigue. El cuerpo del bucle se ejecuta X + 1 veces.'),
      Q('set solo admite valores de 0 a 31. ¿Cómo cargas 1000 en X?', ['La CPU lo pone en la TX FIFO y el programa hace pull y mov(x, osr)', 'set(x, 1000)', 'Con dos set seguidos', 'No se puede'], 'Es el patrón habitual para pasar constantes.'),
      I('El <b>retardo</b> [n] añade n ciclos de espera después de la instrucción (hasta 31 si no usas side-set). Así ajustas tiempos sin gastar instrucciones.'),
      Q('Si se repite, ¿qué onda sale?', ['4 ciclos en alto y 2 en bajo', '3 en alto y 1 en bajo', '1 en alto y 1 en bajo', '4 en alto y 4 en bajo'], 'Cada instrucción dura 1 + su retardo.', { code: 'set(pins, 1) [3]\nset(pins, 0) [1]' }),
      Nm('Esa onda con la máquina a 1 MHz. ¿Frecuencia en kHz?', 166.67, 'kHz', 'Periodo de 6 ciclos = 6 µs → 166,7 kHz.', { tol: 0.5 }),
      Q('¿Qué hace este programa?', ['En cada flanco de subida del reloj (pin 1) guarda en el ISR el bit de datos (pin 0)', 'Genera una onda cuadrada', 'Cuenta hacia atrás', 'Espera para siempre'], 'Es el corazón de un receptor síncrono, como SPI.', { code: 'wrap_target()\nwait(1, pin, 1)\nin_(pins, 1)\nwait(0, pin, 1)\nwrap()' }),
      Q('mov(x, invert(null)) deja en X…', ['0xFFFFFFFF', '0', '1', 'Lo que hubiera antes en X'], 'null vale 0; invertido, todo unos.')
    ]),
    L('rp26', 'Registros, FIFOs y autopull', 'bus', ['rp_pio'], [
      I('El OSR y el ISR son de 32 bits. out(pins, n) saca n bits del OSR y in(pins, n) mete n bits en el ISR. La <b>dirección de desplazamiento</b> decide el orden: hacia la izquierda sale primero el bit alto; hacia la derecha, el bajo.'),
      Q('Un protocolo envía primero el bit menos significativo, como la UART. ¿Qué desplazamiento?', ['Hacia la derecha', 'Hacia la izquierda', 'Da igual', 'Ninguno'], 'Hacia la derecha, lo primero que sale es el bit 0.'),
      I('<b>pull</b> carga el OSR desde la TX FIFO y espera si está vacía. <b>push</b> envía el ISR y espera si la RX está llena.\nCon <b>autopull</b> y <b>autopush</b>, la máquina lo hace sola al alcanzar un umbral de bits: ahorras instrucciones y ciclos.'),
      Q('Con autopull y umbral de 8 bits, ¿cuántos out(pins, 1) hay antes de que la máquina recargue el OSR?', ['8', '32', '1', '4'], 'Al llegar al umbral, la siguiente out recarga desde la FIFO.'),
      Q('Usas sm.put() de 32 bits con autopull a 24 y desplazamiento a la izquierda. ¿Qué bits salen?', ['Los 24 de arriba: hay que desplazar el dato 8 posiciones a la izquierda', 'Los 24 de abajo', 'Los 32', 'Ninguno'], 'Por eso el driver WS2812 hace sm.put(color, 8).'),
      I('Si solo hablas en un sentido, puedes <b>unir las FIFO</b>: 8 palabras de cola en TX o en RX en lugar de 4 y 4.'),
      Q('Una captura que solo envía datos a la CPU. ¿Qué configuras?', ['Unir las FIFO en RX: 8 palabras de cola', 'Unirlas en TX', 'No usar FIFO', 'Desactivar el autopush'], 'Más margen antes de perder datos.'),
      I('Cuando una máquina espera (en un pull sin datos, un wait…), sus pines <b>conservan el último valor</b>. Diseña el programa para que se pare con los pines en el estado de reposo del protocolo.'),
      Q('Un transmisor espera datos en un pull. ¿Qué nivel deben tener sus pines en ese momento?', ['El de reposo del protocolo, por ejemplo alto en una UART', 'Da igual', 'Alta impedancia siempre', 'Bajo siempre'], 'Si no, el receptor verá un bit de inicio falso.'),
      Q('Haces sm.put(0b1011) pero por el pin solo salen ceros. ¿Qué falta?', ['Activar autopull o hacer pull() antes de sacar los bits', 'Un wrap()', 'Más frecuencia', 'Cambiar a SHIFT_LEFT'], 'Sin pull, el OSR nunca recibe el dato.', { code: '@rp2.asm_pio(out_init=rp2.PIO.OUT_LOW,\n             out_shiftdir=rp2.PIO.SHIFT_RIGHT)\ndef tx():\n    out(pins, 1)' }),
      G('rp_pioBit')
    ]),
    L('rp27', 'Side-set, retardos y divisor', 'wave', ['rp_pio'], [
      I('El <b>side-set</b> cambia hasta 5 pines a la vez que se ejecuta otra instrucción. Típico: sacar un bit de datos con out y mover el reloj en el mismo ciclo. Comparte los 5 bits con el retardo: cuantos más pines de side-set, menos retardo.'),
      Q('Declaras 2 pines de side-set. ¿Qué retardo máximo puedes poner?', ['7 ciclos: quedan 3 bits para el retardo', '31', '15', '5'], '5 − 2 = 3 bits → hasta [7].'),
      Q('Con autopull activado, ¿qué genera?', ['Un bit de datos por cada ciclo de reloj: el dato cambia con el reloj bajo y el receptor lee al subir', 'Una onda de 2 MHz sin datos', 'Nada: falta pull', 'Un PWM'], 'Es la base de una salida tipo SPI.', { code: '.side_set 1\n.wrap_target\n    out pins, 1   side 0\n    nop           side 1\n.wrap' }),
      I('El divisor de cada máquina tiene 16 bits enteros y 8 de fracción: <b>f_SM = clk_sys / div</b>, con div entre 1 y 65536. A 125 MHz, lo más lento son unos 1907 Hz.\nCon fracción, unos ciclos duran un poco más que otros: hay un temblor de un ciclo de clk_sys.'),
      G('rp_pioDiv'), G('rp_pioDiv'),
      Q('MicroPython no te deja crear una StateMachine a 1 kHz con clk_sys = 125 MHz. ¿Por qué?', ['El divisor máximo es 65536: el mínimo son unos 1907 Hz', 'Porque 1 kHz es demasiado rápido', 'Porque necesita la WiFi', 'Sí se puede'], 'Para ir más lento, alarga el programa con retardos o bucles.'),
      Q('Un divisor de 135,6 para 115 200 baudios…', ['Funciona: algunos ciclos duran un poco más, con un temblor de un ciclo de reloj', 'Es imposible', 'Se redondea a 135 exactos', 'Solo vale en C'], 'El error medio es despreciable para una UART.'),
      TU('Mira el transmisor UART ciclo a ciclo y, con clk_sys = 125 MHz, elige el divisor que da 115 200 baudios.', 'rp_pio', PIOP(), { q: 'baud', min: 114048, max: 116352, text: 'Objetivo: 115 200 baudios ± 1 %', hint: '125 000 000 / (8 × 115 200) ≈ 135,6.' }, 'Con 8 ciclos por bit, la máquina debe ir a 921,6 kHz.'),
      Q('En ese transmisor, ¿por qué out(pins, 1) lleva [6] y no [7]?', ['El jmp que sigue gasta el octavo ciclo del bit', 'Por error', 'Porque el bit 0 es más corto', 'Para dejar tiempo al pull'], '7 + 1 = 8 ciclos por bit.'),
      G('rp_pioBit')
    ]),
    L('rp28', 'PIO desde MicroPython', 'code', ['rp_pio'], [
      I('En MicroPython, un programa PIO es una función decorada con <b>@rp2.asm_pio(…)</b>. Dentro escribes las instrucciones como llamadas: set(pins, 1), out(x, 1)… El retardo va entre corchetes tras la instrucción y el side-set con .side(n).'),
      I('Un destello hecho por el PIO: a 2 kHz, cada instrucción con [31] dura 32 ciclos.', { code: "import rp2\nfrom machine import Pin\n\n@rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)\ndef destello():\n    wrap_target()\n    set(pins, 1)   [31]\n    nop()          [31]\n    set(pins, 0)   [31]\n    nop()          [31]\n    wrap()\n\nsm = rp2.StateMachine(0, destello, freq=2000, set_base=Pin(15))\nsm.active(1)" }),
      Nm('¿A qué frecuencia parpadea ese LED, en Hz?', 15.625, 'Hz', '4 × 32 = 128 ciclos; 2000 / 128 = 15,625 Hz.', { tol: 0.1 }),
      Q('¿Qué parámetro de StateMachine dice qué pin mueve set(pins, …)?', ['set_base', 'out_base', 'in_base', 'jmp_pin'], 'Cada tipo de instrucción tiene su propio mapa de pines.'),
      Q('¿Qué hace?', ['Ejecuta esa instrucción ahora mismo en la máquina, fuera de su programa', 'La añade al final del programa', 'Borra el programa', 'Para la máquina'], 'Muy útil para leer o preparar registros.', { code: 'sm.exec("set(x, 0)")' }),
      I('La tira WS2812: cada bit dura 1,25 µs y empieza en alto. Un 0 está alto poco (unos 400 ns) y un 1 está alto mucho (unos 800 ns). Ajusta el reloj y los ciclos y mira si la tira lo entendería.', { tune: { viz: 'rp_ws', params: WSP() } }),
      TU('Haz que la tira entienda los bits.', 'rp_ws', WSP(), { q: 'ok', min: 1, max: 1, text: 'Objetivo: los cuatro tiempos dentro de tolerancia', hint: 'A 8 MHz: 10 ciclos por bit, 3 en alto para el 0 y 6 para el 1.' }, 'Hay varias combinaciones válidas: la tolerancia es de ± 150 ns.'),
      Q('En este driver, ¿por qué out(x, 1) va primero?', ['Si no hay datos, la máquina espera ahí con la línea en bajo, que es el reinicio de la tira', 'Porque es más rápido', 'Por estética', 'Porque set no puede ir primero'], 'Una línea baja larga le dice a la tira que se acabó la trama.', { code: CODE_WS }),
      G('rp_wsCycles'),
      Q('¿Por qué el driver usa sm.put(color, 8)?', ['Desplaza el color 8 bits a la izquierda: con autopull a 24 y desplazamiento a la izquierda salen los 24 bits altos', 'Envía 8 colores', 'Divide entre 8', 'Pone el brillo al 8 %'], 'El segundo argumento de put es un desplazamiento.')
    ]),
    L('rp29', 'PIO desde C: pioasm', 'code', ['rp_pio'], [
      I('En C, el programa va en un fichero <b>.pio</b>. <b>pioasm</b> lo ensambla y genera una cabecera .pio.h; en CMake basta con pico_generate_pio_header(objetivo ruta/al/fichero.pio). Puedes incluir en el propio .pio una función de inicio en C.'),
      I('Un .pio con su función de arranque:', { code: '; destello.pio\n.program destello\n    set pins, 1 [31]\n    set pins, 0 [31]\n\n% c-sdk {\nstatic inline void destello_init(PIO pio, uint sm, uint off, uint pin, float div) {\n    pio_sm_config c = destello_program_get_default_config(off);\n    sm_config_set_set_pins(&c, pin, 1);\n    sm_config_set_clkdiv(&c, div);\n    pio_gpio_init(pio, pin);\n    pio_sm_set_consistent_pindirs(pio, sm, pin, 1, true);\n    pio_sm_init(pio, sm, off, &c);\n    pio_sm_set_enabled(pio, sm, true);\n}\n%}' }),
      { t: 'order', q: 'Ordena cómo se pone en marcha una máquina en C.', items: ['pio_add_program carga el programa y devuelve su posición', 'program_get_default_config crea la configuración', 'Se eligen pines, desplazamientos y divisor', 'pio_gpio_init cede los pines al PIO', 'pio_sm_init aplica la configuración', 'pio_sm_set_enabled arranca la máquina'], e: 'Es lo que hace la función de inicio del .pio.' },
      Q('Olvidas pio_gpio_init(pio, pin). ¿Qué pasa?', ['La máquina funciona pero el pin no cambia: sigue asignado a otra función', 'No compila', 'El pin se quema', 'La máquina no arranca'], 'La función del pin tiene que ser la del PIO.'),
      Q('¿Por qué pio_add_program devuelve una posición (offset)?', ['Porque varios programas comparten las 32 instrucciones y cada uno queda en un sitio', 'Para medir el tiempo', 'Es el número de la máquina', 'Es el divisor'], 'Los saltos del programa se recolocan según esa posición.'),
      I('Para hablar con la máquina: pio_sm_put_blocking y pio_sm_get_blocking (esperan), o comprobar antes con pio_sm_is_tx_fifo_full. Para no pisarte con otras bibliotecas, pide una máquina libre con pio_claim_unused_sm.'),
      Q('¿Qué significa el true?', ['Que se detenga con error si no queda ninguna máquina libre', 'Que la máquina arranque ya', 'Que use el núcleo 1', 'Que la memoria sea compartida'], 'Con false devolvería −1 y tú decides.', { code: 'uint sm = pio_claim_unused_sm(pio0, true);' }),
      Nm('destello a clk_sys = 125 MHz con divisor 62 500. ¿Frecuencia del destello en Hz?', 31.25, 'Hz', 'La máquina va a 2000 Hz; el periodo son 64 ciclos → 31,25 Hz.', { tol: 0.1 }),
      Q('¿Cuándo merece la pena C para el PIO?', ['Cuando necesitas DMA, varias máquinas sincronizadas o alimentar la FIFO más rápido de lo que puede Python', 'Nunca: MicroPython alimenta las FIFO igual de rápido', 'Solo para encender un LED', 'Cuando no existe pioasm'], 'El programa PIO es el mismo; cambia quién lo alimenta.'),
      { t: 'match', q: 'Une cada función con lo que hace.', pairs: [['pio_sm_put_blocking', 'Escribe en la TX FIFO esperando hueco'], ['pio_sm_get_blocking', 'Lee de la RX FIFO esperando dato'], ['pio_sm_exec', 'Ejecuta una instrucción suelta'], ['pio_enable_sm_mask_in_sync', 'Arranca varias máquinas a la vez']] }
    ]),
    L('rp30', 'Diseñar programas PIO', 'bus', ['rp_pio'], [
      I('Método:\n1) Dibuja la forma de onda <b>en ciclos</b>.\n2) Elige ciclos por bit.\n3) Decide <b>dónde se para</b> la máquina y con qué nivel.\n4) Escribe el programa.\n5) <b>Cuenta los ciclos</b> de cada camino.\n6) Compruébalo con un analizador lógico.'),
      I('Ejemplo completo: un transmisor UART de 6 instrucciones, 8 ciclos por bit.', { code: CODE_UART }),
      Q('En ese transmisor, ¿cuántos ciclos dura el bit de inicio?', ['8: set(pins, 0) [7]', '7', '1', '9'], 'Una instrucción más 7 de retardo.'),
      Q('Si llegan bytes seguidos, el bit de parada dura 10 ciclos y no 8. ¿Es un problema?', ['No: la parada puede durar más de un bit; el receptor solo exige un mínimo', 'Sí, el receptor falla siempre', 'Sí, cambia el baudio', 'Pierde un byte de cada dos'], 'pull y set(x, 7) ocurren con la línea en reposo, alta.'),
      I('Un receptor UART espera el flanco de bajada del bit de inicio, espera <b>medio bit</b> para colocarse en el centro y desde ahí lee cada 8 ciclos. Por eso se usan 8 ciclos por bit: da precisión para encontrar el centro.'),
      Q('¿Por qué el receptor lee en el centro de cada bit?', ['Es el punto más alejado de los flancos: tolera diferencias de reloj y flancos lentos', 'Por ahorrar ciclos', 'Porque el inicio no existe', 'Para leer dos veces'], 'Un error de baudio desplaza poco a poco el punto de lectura.'),
      I('Un <b>encoder en cuadratura</b> da dos señales, A y B, desfasadas. La secuencia 00 → 01 → 11 → 10 indica un sentido; la inversa, el otro. El PIO puede vigilar los dos pines y avisar en cada cambio sin perder ninguno.'),
      Q('Un encoder pasa de AB = 00 a 01, luego a 11 y luego vuelve a 01. ¿Qué ha hecho?', ['Avanzó dos pasos y retrocedió uno', 'Dio una vuelta', 'Nada', 'Rebotó sin moverse'], 'Las transiciones válidas solo cambian un bit cada vez.'),
      Q('En el contador de flancos del proyecto, ¿cuántos ciclos de máquina gasta como mínimo cada flanco?', ['3: dos wait y un jmp', '1', '2', '8'], 'Por eso el límite teórico ronda un tercio del reloj de la máquina.', { code: 'wrap_target()\nwait(0, pin, 0)\nwait(1, pin, 0)\njmp(x_dec, "sigue")\nlabel("sigue")\nwrap()' }),
      Q('Tu programa PIO no cabe: 34 instrucciones. ¿Qué haces?', ['Ahorrar con side-set y retardos, o repartirlo entre dos bloques PIO', 'Subir el reloj', 'Pasarlo a MicroPython', 'Nada, cabe igual'], 'Cada bloque tiene sus 32 instrucciones.'),
      Q('Dos máquinas deben arrancar alineadas al ciclo, como HSYNC y VSYNC de un VGA. ¿Cómo?', ['Habilitándolas a la vez con una máscara y sincronizándolas con IRQ del PIO', 'Arrancándolas una tras otra en Python', 'Con sleep_us entre ellas', 'No se puede'], 'Lo harás en el proyecto final.')
    ]),
    PRJ('rp-p6', 'Proyecto: tira WS2812 musical', 'rp_ledmusic'),
    PRJ('rp-p7', 'Proyecto: frecuencímetro con PIO', 'rp_freq')
  ];

  const M6 = [
    L('rp31', 'DMA: copiar sin la CPU', 'memory', ['rp_dma'], [
      I('Compara: la CPU copiando muestra a muestra frente al DMA. Cambia también la frecuencia de muestreo y el número de muestras.', { tune: { viz: 'rp_dma', params: DMAP() } }),
      I('El RP2040 tiene <b>12 canales DMA</b> (el RP2350, 16). Cada canal tiene: dirección de lectura, dirección de escritura, número de transferencias y un registro de control (tamaño de 8, 16 o 32 bits, si avanzan las direcciones, quién marca el ritmo, a quién encadena…).'),
      { t: 'match', q: 'Une cada registro o ajuste con su papel.', pairs: [['READ_ADDR', 'De dónde lee'], ['WRITE_ADDR', 'A dónde escribe'], ['TRANS_COUNT', 'Cuántas transferencias'], ['DREQ', 'Quién marca el ritmo']] },
      TU('Configura una captura de unos 4 ms que no ocupe la CPU.', 'rp_dma', DMAP(), { q: 'cap', min: 3.9, max: 4.2, text: 'Objetivo: 4 ms de captura, con DMA', hint: 'Modo DMA y, por ejemplo, 2048 muestras a 500 ksps o 1000 a 250 ksps.' }, 'Tiempo = muestras / frecuencia de muestreo.'),
      G('rp_dmaTime'), G('rp_dmaTime'),
      Q('Copias 4 KB de un búfer a otro en RAM. ¿Configuración?', ['Lectura y escritura avanzando, sin DREQ: lo más rápido posible', 'Ninguna dirección avanza', 'DREQ del ADC', 'Solo avanza la lectura'], 'Entre memorias no hay que esperar a nadie.'),
      Q('Envías un búfer a la TX FIFO de una máquina PIO. ¿Qué DREQ?', ['El de la TX FIFO de esa máquina: avanza cuando hay hueco', 'El del ADC', 'Ninguno', 'El de la UART'], 'Si no, desbordarías la FIFO.'),
      I('La cuenta es de <b>transferencias</b>, no de bytes: con transferencias de 32 bits, 1000 transferencias mueven 4000 bytes. El DMA puede hacer una lectura y una escritura por ciclo de reloj; la RAM está en bancos para que CPU y DMA choquen poco.'),
      Nm('Mueves 3000 bytes con transferencias de 32 bits. ¿TRANS_COUNT?', 750, '', '3000 / 4 = 750.'),
      Q('¿Qué pasa si la CPU y el DMA acceden al mismo banco de RAM a la vez?', ['Uno espera un ciclo: el bus arbitra', 'Se corrompe el dato', 'Se reinicia el chip', 'Nada nunca'], 'Por eso conviene repartir los búferes entre bancos en diseños exigentes.')
    ]),
    L('rp32', 'DMA en C: ADC, PIO y encadenado', 'memory', ['rp_dma'], [
      I('Captura del ADC con DMA: el ADC deja cada muestra en su FIFO y pide transferencia (DREQ_ADC); el canal lee siempre del FIFO y escribe avanzando en el búfer.', { code: 'adc_fifo_setup(true, true, 1, false, false);\nadc_set_clkdiv(0);                    // 500 ksps\nchannel_config_set_transfer_data_size(&c, DMA_SIZE_16);\nchannel_config_set_read_increment(&c, false);\nchannel_config_set_write_increment(&c, true);\nchannel_config_set_dreq(&c, DREQ_ADC);\ndma_channel_configure(ch, &c, buf, &adc_hw->fifo, N, true);\nadc_run(true);' }),
      Q('¿Qué pasaría si quitaras esta línea?', ['El DMA leería el FIFO a toda velocidad, repitiendo datos o leyendo vacío', 'Nada', 'Iría más lento', 'No compilaría'], 'El DREQ sincroniza el DMA con el periférico.', { code: 'channel_config_set_dreq(&c, DREQ_ADC);' }),
      G('rp_adcDiv'),
      I('<b>Encadenado</b>: al terminar, un canal puede arrancar otro (chain_to). En <b>ping-pong</b>, A llena el búfer 1 y arranca B; B llena el búfer 2 y arranca A. Una interrupción avisa a la CPU de cuál está listo.'),
      Q('Ping-pong: A ha llenado el búfer 1 y B está llenando el 2. ¿Qué hace la CPU?', ['Procesa el búfer 1 y deja A preparado para la siguiente vuelta', 'Espera sin hacer nada', 'Lee el búfer 2 a medio llenar', 'Apaga el ADC'], 'Tiene el tiempo de llenar un búfer para terminar.'),
      I('Un canal también puede <b>reprogramar a otro</b> escribiendo en sus registros. Escribir en ciertos alias de registro arranca el canal: así se hacen bucles infinitos o listas de bloques sin la CPU.'),
      Q('¿Qué consigue el canal de control?', ['Vuelve a apuntar el canal de datos al inicio de la tabla y lo relanza', 'Copia la tabla entera', 'Para el PIO', 'Lee el ADC'], 'Es el truco del generador de señales.', { code: 'dma_channel_configure(ch_ctrl, &cc,\n    &dma_hw->ch[ch_datos].al3_read_addr_trig,\n    &dir_tabla, 1, false);' }),
      I('<b>Anillo</b>: con channel_config_set_ring la dirección vuelve al principio cada 2ⁿ bytes. El búfer debe estar <b>alineado</b> a su tamaño.'),
      Q('Anillo de lectura de 8 bits de dirección (256 bytes). ¿Requisito del búfer?', ['Estar alineado a 256 bytes', 'Medir 8 bytes', 'Estar en la flash', 'Ninguno'], 'La vuelta se hace dejando fijos los bits altos de la dirección.'),
      Q('DMA con PIO para una tira WS2812 de 300 LEDs. ¿Qué ganas?', ['La CPU lanza la transferencia y queda libre mientras salen los 300 colores', 'Más colores', 'Menos consumo de los LEDs', 'Nada'], 'Con Python alimentando la FIFO, la CPU estaría ocupada todo ese tiempo.'),
      Nm('300 LEDs × 24 bits a 800 kbit/s. ¿Cuántos ms dura la transferencia?', 9, 'ms', '7200 bits / 800 000 = 9 ms.', { tol: 0.05 })
    ]),
    L('rp33', 'Los dos núcleos', 'chip', ['rp_multicore'], [
      I('Dos Cortex-M0+ iguales. Al arrancar, solo corre el núcleo 0; el 1 espera dormido. En C: <b>multicore_launch_core1(funcion)</b>. En MicroPython: <b>_thread.start_new_thread(funcion, args)</b>, que aún se considera experimental.'),
      I('Ejemplo: el núcleo 0 envía números al 1 por la FIFO entre núcleos.', { code: '#include <stdio.h>\n#include "pico/stdlib.h"\n#include "pico/multicore.h"\n\nvoid nucleo1(void) {\n    while (true) {\n        uint32_t v = multicore_fifo_pop_blocking();\n        printf("nucleo 1 recibe %lu\\n", v);\n    }\n}\n\nint main(void) {\n    stdio_init_all();\n    multicore_launch_core1(nucleo1);\n    for (uint32_t i = 0; ; i++) {\n        multicore_fifo_push_blocking(i);\n        sleep_ms(500);\n    }\n}' }),
      Q('¿Qué pasa si el núcleo 1 procesa más despacio de lo que el 0 envía?', ['La FIFO (8 palabras) se llena y push_blocking hace esperar al núcleo 0', 'Se pierden datos sin aviso', 'Se reinicia', 'El núcleo 1 acelera'], 'Con multicore_fifo_wready() puedes comprobar antes si hay hueco.'),
      Q('¿Qué comparten los dos núcleos?', ['Toda la RAM, la flash y los periféricos', 'Nada: cada uno tiene su memoria', 'Solo la flash', 'Solo la FIFO'], 'Por eso hay que tener cuidado con los datos compartidos.'),
      I('Repartos típicos: núcleo 0 para USB, red e interfaz; núcleo 1 para el tiempo real (control de motores, audio, generar gráficos). Cada núcleo tiene su propio controlador de interrupciones.'),
      { t: 'match', q: 'Une cada función con lo que hace.', pairs: [['multicore_launch_core1', 'Arranca una función en el núcleo 1'], ['multicore_fifo_push_blocking', 'Envía una palabra al otro núcleo'], ['multicore_fifo_pop_blocking', 'Recibe una palabra del otro núcleo'], ['get_core_num', 'Dice en qué núcleo estás']] },
      I('En MicroPython, _thread ejecuta la función en el núcleo 1. Comparte datos con <b>_thread.allocate_lock()</b>. Algunas partes de MicroPython, como la WiFi de la Pico W, suponen que todo ocurre en el núcleo 0.'),
      Q('¿Dónde corre trabajo()?', ['En el segundo núcleo, en paralelo con el programa principal', 'En el mismo núcleo, por turnos', 'En el PIO', 'En el PC'], 'A diferencia de asyncio, aquí hay paralelismo real.', { code: 'import _thread\ndef trabajo():\n    while True:\n        procesar()\n_thread.start_new_thread(trabajo, ())' }),
      Q('Un lazo de control a 1 kHz exactos mientras se sirve una web. ¿Cómo repartes?', ['Control en un núcleo con su temporizador; red y USB en el otro', 'Todo en el núcleo 0', 'El control dentro de asyncio', 'Alternando cada segundo'], 'La red tiene ráfagas impredecibles que no deben afectar al control.'),
      Q('Los dos núcleos llaman a printf a la vez en el pico-sdk. ¿Qué pasa?', ['La salida está protegida: las líneas no se mezclan a mitad, aunque el orden entre núcleos no está garantizado', 'Se cuelga', 'Solo funciona en el núcleo 0', 'Las letras se mezclan siempre'], 'El SDK protege stdout con un mutex.')
    ]),
    L('rp34', 'Carreras, cerrojos y spinlocks', 'shield', ['rp_multicore'], [
      I('Dos núcleos suman 1, dos veces cada uno, a la misma variable. Cambia cuándo empieza el núcleo 1 y mira el resultado.', { tune: { viz: 'rp_race', params: RACEP(0) } }),
      TU('Encuentra un retraso con el que se pierdan incrementos.', 'rp_race', { d: sl('Retraso del núcleo 1', 6, 0, 6, 1, 'pasos'), lk: { val: 0, fixed: true } }, { q: 'lost', min: 1, max: 4, text: 'Objetivo: que el resultado sea menor que 4', hint: 'Prueba retrasos pequeños: los dos leen el mismo valor.' }, 'Si los dos leen antes de que el otro escriba, una suma se pierde.'),
      I('Ahora con cerrojo: antes de leer, cada núcleo lo toma (T) y al escribir lo suelta (S). Si está ocupado, espera (…). Prueba todos los retrasos.', { tune: { viz: 'rp_race', params: RACEP(1) } }),
      I('El RP2040 tiene <b>32 spinlocks</b> en hardware: leer uno intenta tomarlo de forma atómica. El SDK ofrece: spin_lock_blocking (también desactiva interrupciones), <b>mutex_t</b> (para esperas más largas) y <b>critical_section_t</b>.'),
      Q('¿Qué garantiza este código?', ['Que solo un núcleo a la vez ejecuta contador++, sin interrupciones en medio', 'Que contador++ va más rápido', 'Que contador se guarda en la flash', 'Nada en un M0+'], 'Entrar y salir rodean la sección crítica.', { code: 'critical_section_t cs;\ncritical_section_init(&cs);\n// …\ncritical_section_enter_blocking(&cs);\ncontador++;\ncritical_section_exit(&cs);' }),
      Q('¿Por qué el Cortex-M0+ necesita los spinlocks del SIO para esto?', ['No tiene instrucciones atómicas de leer-modificar-escribir como otros núcleos', 'Porque es de 8 bits', 'Porque no tiene RAM', 'No los necesita'], 'El M33 del RP2350 sí tiene instrucciones exclusivas.'),
      I('<b>Interbloqueo</b>: el núcleo 0 tiene el cerrojo A y espera el B; el 1 tiene el B y espera el A. Ninguno avanza nunca. Regla: toma siempre los cerrojos en el mismo orden y mantén las secciones críticas cortas.'),
      Q('Núcleo 0 toma A y espera B; núcleo 1 toma B y espera A. ¿Qué ocurre?', ['Interbloqueo: los dos esperan para siempre', 'Uno gana al azar', 'Se liberan solos', 'Va más lento pero termina'], 'Mismo orden siempre, y el problema desaparece.'),
      Q('Alternativa sin cerrojos para pasar medidas del núcleo 1 al 0:', ['La FIFO entre núcleos o una cola con un solo escritor y un solo lector', 'Una variable global sin más', 'printf', 'Reiniciar el núcleo 1'], 'Pasar mensajes evita compartir estado.'),
      Q('¿Qué aporta with cerrojo?', ['Toma el cerrojo y lo suelta al salir del bloque, incluso si hay un error', 'Nada', 'Crea un hilo', 'Duplica total'], 'Es la forma segura en MicroPython.', { code: 'cerrojo = _thread.allocate_lock()\ndef sumar():\n    global total\n    with cerrojo:\n        total += 1' }),
      Q('Una sección crítica de 5 ms con interrupciones desactivadas. ¿Problema?', ['Retrasas 5 ms todas las interrupciones: USB, temporizadores y comunicaciones pueden fallar', 'Ninguno', 'Gasta más flash', 'Solo afecta al LED'], 'Dentro, solo lo imprescindible.')
    ]),
    PRJ('rp-p8', 'Proyecto: osciloscopio de bolsillo', 'rp_scope'),
    PRJ('rp-p9', 'Proyecto: analizador lógico', 'rp_logic'),
    PRJ('rp-p10', 'Proyecto: generador de señales', 'rp_siggen'),
    PRJ('rp-p11', 'Proyecto: robot equilibrista', 'rp_balance')
  ];

  const M7 = [
    L('rp35', 'USB nativo y TinyUSB', 'bus', ['rp_usb'], [
      I('El RP2040 tiene USB de <b>velocidad completa</b> (12 Mbit/s) y puede ser <b>dispositivo</b> o <b>anfitrión</b>. El SDK usa la biblioteca <b>TinyUSB</b>. El printf por USB que ya conoces es la clase CDC (puerto serie) montada sobre ella.'),
      { t: 'order', q: 'Ordena la enumeración USB.', items: ['Conectas el cable', 'El anfitrión reinicia el bus', 'Pide el descriptor de dispositivo (VID y PID)', 'Asigna una dirección', 'Lee la configuración y sus interfaces', 'Carga el controlador de cada clase'], e: 'Todo pasa en menos de un segundo.' },
      { t: 'match', q: 'Une cada clase USB con sus aparatos.', pairs: [['HID', 'Teclados, ratones, mandos'], ['CDC', 'Puerto serie virtual'], ['MSC', 'Unidad de almacenamiento'], ['MIDI', 'Instrumentos musicales']] },
      Q('¿Por qué hay que llamar a tud_task() constantemente?', ['TinyUSB atiende los eventos del USB dentro de esa función: si no la llamas, el dispositivo deja de responder', 'Para ahorrar energía', 'Para encender el LED', 'No hace falta'], 'Nada de bucles bloqueantes largos en el mismo hilo.'),
      Q('Tu Pico ya es un teclado con TinyUSB y además quieres printf por USB. ¿Qué necesitas?', ['Un dispositivo compuesto: HID y CDC en los mismos descriptores', 'Dos cables', 'Es imposible', 'Un segundo RP2040'], 'Un dispositivo USB puede tener varias interfaces.'),
      I('<b>VID</b> (fabricante) y <b>PID</b> (producto) identifican tu aparato. Para pruebas personales vale el de los ejemplos; para publicar o vender, no uses números ajenos: Raspberry Pi concede PID gratuitos bajo su VID para proyectos con sus chips.'),
      Q('¿Qué es el VID?', ['El identificador del fabricante, asignado por la organización USB', 'La versión del firmware', 'La velocidad', 'El número de serie'], 'El PID lo elige cada fabricante para sus productos.'),
      I('Como <b>anfitrión</b>, el RP2040 puede leer un teclado, un ratón o un mando USB (dándoles 5 V por VBUS). Con el PIO incluso se ha hecho un segundo puerto USB por software.'),
      Q('¿Qué velocidad de USB tiene el RP2040?', ['Velocidad completa: 12 Mbit/s', 'Alta velocidad: 480 Mbit/s', 'USB 3: 5 Gbit/s', 'Solo baja velocidad: 1,5 Mbit/s'], 'Suficiente para HID, MIDI, CDC y almacenamiento modesto.'),
      Q('¿Qué ventaja tiene que la Pico se presente como HID en vez de como puerto serie para un mando?', ['Funciona en cualquier sistema y programa sin instalar nada ni abrir puertos', 'Va más rápido', 'Consume menos', 'Ninguna'], 'Los juegos ya saben leer mandos HID.')
    ]),
    L('rp36', 'HID: teclado y ratón', 'code', ['rp_usb'], [
      I('El <b>descriptor de informe</b> dice al ordenador cómo son tus mensajes. El teclado estándar: 1 byte de modificadores, 1 reservado y hasta <b>6 teclas</b> a la vez. El ratón: botones y desplazamientos con signo en X, Y y rueda.'),
      { t: 'bits', q: 'Byte de modificadores: bit 0 Ctrl izq., bit 1 Mayús izq., bit 2 Alt izq., bit 3 GUI izq. Forma Ctrl + Mayús.', n: 8, target: 3, e: '1 + 2 = 3.', c: 'rp_usb' },
      Q('Ctrl + Alt + Supr. ¿Qué informe envías?', ['Modificadores Ctrl y Alt (0x05) y la tecla Supr en la lista', 'Tres informes, uno por tecla', 'Solo la tecla Supr', 'Modificador 0x07 y ninguna tecla'], 'Bit 0 (1) + bit 2 (4) = 5.'),
      Q('¿Qué hay que enviar después de este informe?', ['Un informe vacío para soltar las teclas', 'Nada', 'Un reinicio del USB', 'Otro igual'], 'Si no, el sistema cree que sigues pulsando.', { code: 'uint8_t teclas[6] = { HID_KEY_C, 0, 0, 0, 0, 0 };\ntud_hid_keyboard_report(REPORT_ID_KEYBOARD,\n                        KEYBOARD_MODIFIER_LEFTCTRL, teclas);' }),
      I('Los códigos HID son <b>posiciones de tecla</b>, no letras. El sistema operativo las traduce con su distribución: en un teclado configurado en español, la posición de la tecla «;» estadounidense produce la ñ.'),
      Q('Tu macro escribe «Hola-mundo», pero en el PC sale «Hola\'mundo». ¿Por qué?', ['HID envía posiciones de tecla y el sistema las traduce con su distribución (española frente a estadounidense)', 'Por el cable', 'Siempre faltan modificadores', 'Un error de TinyUSB'], 'Hay que construir las macros para la distribución del ordenador.'),
      I('El ratón estándar es <b>relativo</b>: cada informe mueve entre −127 y 127. Para movimientos grandes, envía varios informes. Un ratón de posición absoluta necesita su propio descriptor.'),
      Nm('Quieres mover el puntero 500 unidades a la derecha con informes de 127 como máximo. ¿Cuántos informes, como mínimo?', 4, 'informes', '500 / 127 = 3,9 → 4.'),
      Q('¿Por qué esperar a tud_hid_ready() antes de enviar?', ['El anfitrión recoge los informes cada cierto intervalo; hasta que no sale uno, no cabe otro', 'Para ahorrar batería', 'Para cifrar', 'No hace falta'], 'Si envías antes, el informe se pierde.'),
      Q('Un aparato que se hace pasar por teclado puede…', ['Escribir órdenes en el ordenador sin permiso: prueba tus macros con cuidado y no conectes USB desconocidos', 'Nada peligroso', 'Solo mover el ratón', 'Leer directamente tus contraseñas de la memoria'], 'Es un ataque real y conocido.')
    ]),
    L('rp37', 'MIDI y CDC', 'wave', ['rp_usb'], [
      I('Un mensaje MIDI: un <b>byte de estado</b> (tipo en los 4 bits altos, canal en los 4 bajos) y 1 o 2 <b>bytes de datos</b> de 7 bits.\nNote On 0x9n · Note Off 0x8n · Control Change 0xBn · Pitch bend 0xEn (14 bits en dos bytes).'),
      { t: 'match', q: 'Une cada byte de estado.', pairs: [['0x90', 'Note On, canal 1'], ['0x80', 'Note Off, canal 1'], ['0xB0', 'Control Change, canal 1'], ['0xE0', 'Pitch bend, canal 1']] },
      Q('Note On del do central (nota 60) con velocidad 100 por el canal 2. ¿Bytes?', ['0x91, 60, 100', '0x92, 60, 100', '0x90, 60, 100', '0x91, 100, 60'], 'Los canales 1–16 se numeran 0–15 en el byte.'),
      Q('¿Por qué los datos MIDI solo llegan hasta 127?', ['El bit alto distingue los bytes de estado (1) de los de datos (0)', 'Por ahorrar', 'Porque el USB es de 7 bits', 'Por el ADC'], 'Así un receptor se sincroniza aunque pierda un byte.'),
      Nm('Pasas una lectura de 12 bits (0–4095) a un valor MIDI de 0–127. ¿Cuántos bits desplazas a la derecha?', 5, 'bits', '12 − 7 = 5.'),
      I('Un potenciómetro leído con el ADC nunca está quieto: baila unas cuentas. Si envías cada cambio, inundas el bus de mensajes. Solución: <b>promediar</b> y aplicar <b>histéresis</b> (ignorar cambios pequeños respecto al último aceptado).'),
      Q('¿Qué evita la comparación con 24?', ['Que el ruido del ADC envíe mensajes constantes con el potenciómetro quieto', 'Que el valor pase de 127', 'Que se cuelgue el USB', 'Que el multiplexor se queme'], 'Es la histéresis.', { code: 'if (abs((int)v - (int)ultimo[i]) > 24) {\n    ultimo[i] = v;\n    // enviar el nuevo valor\n}' }),
      I('<b>CDC</b>: un puerto serie virtual. Con TinyUSB: tud_cdc_available, tud_cdc_read, tud_cdc_write y tud_cdc_write_flush. Ideal para configurar un aparato desde el PC.'),
      Q('En un CDC por USB pones el monitor serie a 9600 en vez de 115 200. ¿Qué pasa?', ['Nada: en CDC el baudio es simbólico y los datos van a velocidad USB', 'Salen caracteres raros', 'No conecta', 'Va 12 veces más lento'], 'El programa puede leer el baudio elegido, pero no afecta a la transmisión.'),
      Q('El MIDI clásico de 5 pines (DIN), en cambio, es una UART real. ¿A qué velocidad?', ['31 250 baudios', '9600', '115 200', '12 Mbit/s'], 'Un valor heredado de dividir 1 MHz entre 32.')
    ]),
    L('rp38', 'Pico W: WiFi en MicroPython', 'wifi', ['rp_net'], [
      I('El chip <b>CYW43439</b> da WiFi 4 a 2,4 GHz y Bluetooth. Su firmware viaja dentro del UF2 de MicroPython para la W. <b>network.WLAN(network.STA_IF)</b> se conecta a una red; con AP_IF la Pico crea su propia red.'),
      Q('¿Por qué se limita la espera a 20 s?', ['Para no quedarse colgado para siempre si la red no está', 'Porque la WiFi tarda siempre 20 s', 'Para ahorrar flash', 'Es obligatorio en España'], 'Un programa robusto nunca espera sin límite.', { code: "def conectar(espera_s=20):\n    wlan.active(True)\n    wlan.connect(SSID, CLAVE)\n    t = time.ticks_ms()\n    while not wlan.isconnected():\n        if time.ticks_diff(time.ticks_ms(), t) > espera_s * 1000:\n            return False\n        time.sleep_ms(250)\n    return True" }),
      I('<b>rp2.country(\'ES\')</b> fija el país: canales y potencias permitidos en España (en Europa se usan los canales 1 a 13).\nGuarda la clave en un fichero aparte (secretos.py) y no lo publiques nunca.'),
      Q('¿Para qué sirve rp2.country(\'ES\')?', ['Para usar los canales y potencias permitidos en España', 'Para traducir los mensajes', 'Para la hora local', 'Para el idioma de Thonny'], 'La normativa de radio cambia según el país.'),
      { t: 'match', q: 'Une cada estado de wlan.status() con su significado.', pairs: [['STAT_GOT_IP', 'Conectado y con IP'], ['STAT_WRONG_PASSWORD', 'Clave incorrecta'], ['STAT_NO_AP_FOUND', 'No encuentra la red'], ['STAT_CONNECTING', 'Conectando']] },
      Q('Tu red es solo de 5 GHz. ¿Se conecta la Pico W?', ['No: el CYW43439 solo trabaja en 2,4 GHz', 'Sí', 'Solo con antena externa', 'Solo de noche'], 'Activa la banda de 2,4 GHz en el router.'),
      I('La radio es lo que más consume de la Pico W. <b>wlan.active(False)</b> la apaga. Si tu aplicación solo envía datos de vez en cuando: conecta, envía y apaga.'),
      Q('Tras horas funcionando, la estación deja de responder aunque el código sigue. ¿Qué añades?', ['Una tarea que compruebe isconnected() y reconecte', 'Más RAM', 'Un sleep de una hora', 'Nada'], 'Los routers se reinician y las conexiones caen.'),
      I('Como cliente: <b>requests</b> para HTTP (r = requests.get(url); r.json(); r.close()), <b>ntptime</b> para la hora y <b>umqtt.simple</b> para MQTT. HTTPS es posible, pero gasta bastante RAM.'),
      Q('¿Por qué r.close()?', ['Libera el socket y su memoria: sin cerrarlo, a la larga te quedas sin RAM', 'Para apagar la WiFi', 'Para borrar los datos', 'No hace nada'], 'Cada conexión abierta ocupa recursos.', { code: "import requests\nr = requests.get('http://192.168.1.50/api')\ndatos = r.json()\nr.close()" }),
      Q('ntptime.settime() pone el reloj de la Pico en…', ['Hora UTC: la de España peninsular es UTC + 1 en invierno y UTC + 2 en verano', 'La hora de Madrid', 'La hora del router', 'Milisegundos desde 1970'], 'Suma tú la diferencia.')
    ]),
    L('rp39', 'Un servidor web con asyncio', 'cloud', ['rp_net'], [
      I('HTTP es texto. El navegador envía una petición: una línea con el método y la ruta, cabeceras y una línea en blanco. El servidor responde con una línea de estado, cabeceras, una línea en blanco y el contenido.'),
      Q('¿Qué ruta pide el navegador?', ['/led?on=1', 'Host', 'HTTP/1.1', '192.168.1.40'], 'La primera línea: método, ruta y versión.', { code: 'GET /led?on=1 HTTP/1.1\nHost: 192.168.1.40\nUser-Agent: Firefox\n' }),
      I('<b>asyncio.start_server</b> escucha en el puerto 80 de todas las interfaces y llama a atender(lector, escritor) en una tarea nueva por cada conexión. Mientras tanto, tus otras tareas (medir, vigilar la WiFi) siguen funcionando.', { code: "await asyncio.start_server(atender, '0.0.0.0', 80)" }),
      Q('¿Por qué se leen líneas hasta la vacía?', ['Para saltar las cabeceras de la petición antes de responder', 'Para leer el cuerpo de la respuesta', 'Para cerrar la WiFi', 'Por seguridad'], 'La línea vacía marca el final de las cabeceras.', { code: "peticion = await lector.readline()\nwhile (await lector.readline()) not in (b'\\r\\n', b''):\n    pass" }),
      Q('El navegador pide /favicon.ico además de /. ¿Qué haces?', ['Responder 404 a lo que no conoces', 'Dejar la conexión abierta sin responder', 'Reiniciar la Pico', 'Enviar la página principal'], 'Responder siempre y cerrar la conexión.'),
      I('Una ruta <b>/api</b> que devuelva <b>JSON</b> (json.dumps(diccionario), con Content-Type: application/json) deja que otros programas usen tus datos. Tu propia página puede pedirlos con fetch(\'/api\') cada pocos segundos y actualizarse sin recargar.'),
      Q('¿Qué ventaja tiene servir /api en JSON además de la página HTML?', ['Otros programas, o tu propia página con fetch, usan los datos sin leer HTML', 'La WiFi va más rápido', 'Ocupa siempre menos flash', 'Es obligatorio'], 'Separas datos y presentación.'),
      I('Seguridad: tu servidor no tiene cifrado ni contraseña. Úsalo <b>solo en tu red local</b>, no abras puertos del router hacia él, y nunca ejecutes nada que llegue en la URL sin validarlo.'),
      Q('Quieres encender una estufa desde la web de la Pico W cuando estás fuera de casa. ¿Abres el puerto 80 del router?', ['No: cualquiera podría controlarla; usa un servicio con autenticación y cifrado o una VPN, y protecciones en el propio aparato', 'Sí, sin problema', 'Sí, si usas el puerto 8080', 'Sí, si la página es bonita'], 'Y las cargas de red eléctrica, solo con módulos certificados.'),
      Q('Para acciones que cambian algo (encender un relé), mejor…', ['Usar POST en vez de GET, para que recargar o previsualizar un enlace no lo active', 'Usar GET siempre', 'Usar /favicon.ico', 'No responder'], 'GET debería solo consultar.'),
      { t: 'order', q: 'Ordena una respuesta HTTP.', items: ['Línea de estado: versión y 200 OK', 'Cabeceras, como Content-Type', 'Una línea en blanco', 'El cuerpo: HTML o JSON', 'Cerrar la conexión'], e: 'En la versión antigua de HTTP que usamos, cerrar la conexión marca el final del cuerpo.' }
    ]),
    L('rp40', 'Bluetooth LE en la Pico W', 'antenna', ['rp_net'], [
      I('En <b>Bluetooth LE</b>, un <b>periférico</b> (tu Pico) se anuncia y un <b>central</b> (el móvil) se conecta. Los datos se organizan en <b>servicios</b> que contienen <b>características</b>: valores que se leen, se escriben o se notifican. Cada uno tiene un UUID: de 16 bits si es estándar o de 128 si es tuyo.'),
      { t: 'match', q: 'Une cada término con su significado.', pairs: [['Periférico', 'Se anuncia y acepta conexiones'], ['Central', 'Escanea y se conecta (el móvil)'], ['Servicio', 'Agrupa características'], ['Característica', 'Un valor que se lee, escribe o notifica']] },
      Q('Tu sensor manda la temperatura cada vez que cambia, sin que el móvil pregunte. ¿Qué usa?', ['Notificaciones de una característica', 'Escrituras', 'Anuncios sin conexión siempre', 'La WiFi'], 'El central se suscribe y recibe los cambios.'),
      I('En MicroPython: el módulo <b>bluetooth</b> (bajo nivel) y la biblioteca <b>aioble</b>, más cómoda y basada en asyncio. En C, el SDK incluye la pila BTstack.\nServicio estándar de sensores ambientales: 0x181A; característica de temperatura: 0x2A6E, en centésimas de grado.'),
      Nm('La característica 0x2A6E usa centésimas de grado en un entero de 16 bits. ¿Qué entero envías para 23,57 °C?', 2357, '', '23,57 × 100 = 2357.'),
      Q('¿Qué rango cubre esa característica (entero de 16 bits con signo, en centésimas)?', ['De −327,68 a 327,67 °C', 'De 0 a 655,35 °C', 'De −128 a 127 °C', 'Sin límite'], '−32 768 a 32 767 centésimas.'),
      I('El anuncio es <b>público</b>: lo ve cualquiera cerca. No envíes datos sensibles sin emparejamiento y cifrado. Y para ahorrar batería, anunciarse cada segundo y conectar solo cuando haga falta gasta mucho menos que estar conectado siempre.'),
      Q('Para que el móvil encuentre tu Pico W, esta debe…', ['Anunciarse con su nombre o sus servicios', 'Conectarse a la WiFi', 'Escanear', 'Estar en modo BOOTSEL'], 'Sin anuncio, nadie sabe que existe.'),
      Q('¿Puede la Pico W usar WiFi y BLE a la vez?', ['Sí: comparten el CYW43439 y su antena, repartiéndose el tiempo de radio', 'No, nunca', 'Solo la Pico 2 W', 'Solo con dos antenas'], 'Cuanto más tráfico de una, menos rendimiento de la otra.'),
      Q('¿Necesitas licencia para usar BLE en España?', ['No: usa la banda de 2,4 GHz de uso libre, con límites de potencia que el módulo ya cumple', 'Sí, de radioaficionado', 'Solo a más de 10 m', 'Solo en exteriores'], 'Si modificas antenas o potencias, el equipo deja de estar homologado.')
    ]),
    PRJ('rp-p12', 'Proyecto: macroteclado USB', 'rp_macro'),
    PRJ('rp-p13', 'Proyecto: controlador MIDI', 'rp_midi'),
    PRJ('rp-p14', 'Proyecto: estación meteorológica Pico W', 'rp_meteo')
  ];

  const M8 = [
    L('rp41', 'Consumo real y modos de sueño', 'sleep', ['rp_lowpower'], [
      I('En una Pico consumen: el RP2040 (núcleos, relojes, periféricos activos), la <b>flash</b>, el <b>regulador</b> (su propio gasto y su eficiencia) y todo lo que le conectes. Antes de optimizar, <b>mide</b>.'),
      Q('Para medir el consumo de la Pico, el multímetro va en serie con…', ['La alimentación de VSYS, con el USB desconectado', 'El pin GP25', 'La línea de datos D+', 'La pata 3V3_EN'], 'Si el USB está conectado, alimenta él y no mides lo que crees.'),
      I('En MicroPython:\n· <b>machine.lightsleep(ms)</b>: para la CPU y casi todos los relojes y sigue en la línea siguiente al despertar.\n· <b>machine.deepsleep(ms)</b>: al despertar, el programa vuelve a empezar desde el principio.'),
      Q('Tras machine.deepsleep(60000), ¿dónde continúa el programa?', ['Desde el principio, como tras un reinicio: las variables se pierden', 'En la línea siguiente', 'En el REPL', 'En el núcleo 1'], 'Guarda en un fichero lo que debas recordar.'),
      I('En C (con la biblioteca de sueño de pico-extras): en <b>dormant</b> se paran hasta los osciladores. Solo despiertas con un flanco en un GPIO (o con el reloj de tiempo real si le das un reloj externo). Al despertar, hay que volver a configurar los relojes.'),
      Q('En dormant, ¿por qué no te despierta un repeating_timer?', ['Porque el temporizador depende de un reloj que se ha parado', 'Porque está desactivado por software', 'Sí te despierta', 'Porque no hay RAM'], 'Usa un flanco externo: un temporizador de bajo consumo o un sensor.'),
      I('El regulador de la Pico trabaja por defecto en modo ahorro (PFM), eficiente con poca carga. Con <b>GP23 a 1</b> pasa a PWM: menos rizado, pero gasta más en reposo.'),
      Q('Para el mínimo consumo dormido, GP23 debe estar…', ['En bajo: modo de ahorro, el de serie', 'En alto', 'Como entrada flotante', 'Da igual'], 'En alto solo cuando necesites un ADC más limpio.'),
      I('En la Pico W la radio manda: apágala con wlan.active(False) entre envíos. Conectar, enviar y apagar suele gastar mucho menos que mantener la conexión.'),
      Q('Tu nodo Pico W envía un dato cada 15 min y deja la WiFi encendida. ¿Mejora principal?', ['Apagar la radio entre envíos y dormir', 'Subir el reloj', 'Usar un cable más corto', 'Encender el LED'], 'La radio encendida pesa más que todo lo demás.'),
      { t: 'order', q: 'Ordena una estrategia de bajo consumo.', items: ['Mide el consumo de partida', 'Quita lo que sobra (LEDs, sensores siempre encendidos)', 'Duerme entre medidas', 'Acorta el tiempo despierto', 'Corta la alimentación entre ciclos si se puede', 'Mide de nuevo y compara'], e: 'Sin medidas, optimizas a ciegas.' }
    ]),
    L('rp42', 'Calcular la autonomía', 'bat', ['rp_lowpower'], [
      I('Si el aparato alterna estados, su consumo medio es la <b>media ponderada por el tiempo</b>:\nI media = (I₁ × t₁ + I₂ × t₂ + …) / periodo.\nY la autonomía ideal: capacidad (mAh) / I media (mA) = horas.'),
      G('rp_avgI'), G('rp_avgI'), G('rp_avgI'),
      I('La capacidad real depende de la química, la temperatura y la corriente. Alcalinas: pierden tensión poco a poco. LiFePO4: unos 3,2 V muy estables, válidos directamente para VSYS. Li-ion: 3,7 V nominales. Todas se autodescargan algo con el tiempo.'),
      Q('¿Por qué el regulador buck-boost de la Pico aprovecha bien las pilas?', ['Funciona con VSYS de 1,8 a 5,5 V: sigue dando 3,3 V cuando las pilas bajan', 'Porque recarga las pilas', 'Porque no consume nada', 'Porque sube a 5 V'], 'Con un LDO tendrías que tirar las pilas mucho antes.'),
      Q('El nodo consume 20 mA durante 1 ms cada segundo y 10 µA el resto. ¿Qué domina la media?', ['El tiempo despierto: aporta 20 µA de media frente a 10 µA', 'El tiempo dormido', 'Los dos igual', 'Ninguno'], '20 mA × 0,001 = 20 µA de media.'),
      Nm('Con 30 µA de media y 2000 mAh, ¿cuántos años duraría en el caso ideal?', 7.6, 'años', '2000 / 0,03 = 66 667 h ≈ 7,6 años.', { tol: 0.2 }),
      Q('¿Por qué en la práctica durará menos?', ['Autodescarga, temperatura y picos que hacen caer la tensión', 'Porque las pilas no se gastan', 'Porque la Pico se acelera sola', 'Por tener la WiFi apagada'], 'Los años calculados son un techo, no una promesa.'),
      Q('Duplicas el intervalo entre medidas (de 1 a 2 min). Si el consumo dormido es despreciable, la autonomía…', ['Casi se duplica', 'Se reduce a la mitad', 'No cambia', 'Se cuadruplica'], 'La energía por medida es la misma; haces la mitad de medidas.')
    ]),
    L('rp43', 'Tu placa con RP2040: alimentación, reloj y flash', 'pcb', ['rp_hw'], [
      I('Para hacer tu propia placa sigue la guía oficial de diseño de hardware. Lo mínimo: regulador de 3,3 V, condensadores de desacoplo, cristal de 12 MHz, flash QSPI, USB con sus resistencias, botones de BOOTSEL y RUN y un conector SWD.'),
      I('Alimentaciones del RP2040:\n· <b>IOVDD</b> (GPIO), <b>USB_VDD</b> y <b>ADC_AVDD</b>: 3,3 V.\n· <b>VREG_VIN</b>: entrada del regulador interno, que saca 1,1 V por <b>VREG_VOUT</b> hacia los pines <b>DVDD</b> del núcleo.\n· Un 100 nF por pata de alimentación y 1 µF en la entrada y la salida del regulador interno.'),
      { t: 'match', q: 'Une cada alimentación con su papel.', pairs: [['IOVDD', 'Alimentación de los GPIO (3,3 V)'], ['DVDD', 'Núcleo digital (1,1 V)'], ['VREG_VOUT', 'Salida del regulador interno'], ['ADC_AVDD', 'Alimentación del ADC']] },
      Q('¿De dónde sale el 1,1 V del núcleo?', ['Del regulador interno del RP2040, de VREG_VIN a VREG_VOUT', 'De un regulador externo obligatorio', 'Del USB directamente', 'Del cristal'], 'Solo le das 3,3 V y sus condensadores.'),
      I('El <b>cristal de 12 MHz</b> necesita condensadores de carga: C ≈ 2 × (CL − C parásita), donde CL es la carga que indica su hoja de datos. Lleva una resistencia de 1 kΩ en serie en XOUT para no excitarlo de más. Pégalo al chip y con masa debajo.', { c: 'cap' }),
      Nm('Cristal con CL = 10 pF y unos 3 pF parásitos. ¿Condensadores de carga, en pF?', 14, 'pF', '2 × (10 − 3) = 14 pF → el normalizado más cercano, 15 pF.', { tol: 0.5 }),
      I('La <b>flash QSPI</b> va pegada a sus patas: el RP2040 admite hasta 16 MB. El botón <b>BOOTSEL</b> une el CS de la flash con masa a través de 1 kΩ.'),
      Q('¿Por qué el BOOTSEL lleva 1 kΩ en serie?', ['Para no cortocircuitar el CS cuando el chip lo excita mientras pulsas', 'Para limitar la corriente de un LED', 'Para el antirrebote', 'Para subir la tensión'], 'La resistencia basta para que la ROM lea un nivel bajo al arrancar.'),
      Q('Quieres 8 MB de flash para guardar sonidos. ¿Se puede con un RP2040?', ['Sí: admite hasta 16 MB de flash QSPI', 'No: máximo 2 MB', 'Solo con un RP2350', 'Solo con una tarjeta SD'], 'Elige una flash compatible con el arranque, como la familia W25Q.'),
      Q('El cristal de tu placa está a 3 cm del chip, con pistas que cruzan otras señales. ¿Qué esperas?', ['Arranques inestables o un USB que falla: ponlo pegado y con masa debajo', 'Nada', 'Más velocidad', 'Menos consumo'], 'Las pistas largas del cristal recogen ruido y añaden capacidad.')
    ]),
    L('rp44', 'Tu placa: USB, rutado y fabricación', 'pcb', ['rp_hw'], [
      I('<b>USB</b>: D+ y D− con 27 Ω en serie cerca del chip, juntas y paralelas como par diferencial. Con conector <b>USB-C</b>, CC1 y CC2 llevan 5,1 kΩ a masa cada una: así un cargador USB-C sabe que debe dar 5 V.'),
      Q('¿Qué pasa si olvidas las 5,1 kΩ en CC1 y CC2 de un USB-C?', ['Un cargador o un cable C a C no da 5 V: la placa no enciende', 'Nada', 'El USB va más rápido', 'Se queman las de 27 Ω'], 'Con un cable A a C sí funcionaría, lo que despista mucho.'),
      I('Rutado: dos capas bastan. Plano de masa continuo, desacoplos pegados, pistas QSPI cortas, nada rápido bajo el cristal y vías de masa en el pad central del QFN.'),
      { t: 'order', q: 'Ordena la colocación de componentes.', items: ['RP2040 y las vías de su pad central', 'Flash junto a las patas QSPI', 'Cristal junto a XIN y XOUT', 'Desacoplos pegados a cada pata', 'USB con sus 27 Ω', 'Regulador y conectores en los bordes'], e: 'Primero lo crítico; los conectores, donde los quiera el usuario.' },
      I('Puesta en marcha: fuente con límite de corriente, mide 3,3 V y 1,1 V antes de nada, y conecta con BOOTSEL pulsado. Si aparece la unidad RPI-RP2, la ROM, el cristal y el USB funcionan.'),
      Q('Tu placa aparece como RPI-RP2 pero tras grabar el UF2 no arranca el programa. Sospecha principal:', ['La flash o sus pistas QSPI, o una flash no compatible con el arranque', 'El cristal', 'El USB', 'El regulador de 1,1 V'], 'El modo BOOTSEL no necesita la flash para aparecer.'),
      Q('La placa no aparece ni como RPI-RP2. ¿Qué miras primero?', ['Las tensiones (3,3 y 1,1 V), el cristal y las líneas USB', 'El programa', 'La WiFi', 'El ADC'], 'Sin esas tres cosas, la ROM no puede hablar por USB.'),
      I('Si diseñas con el <b>RP2350</b>: su regulador del núcleo es <b>conmutado</b> y necesita una <b>bobina</b> externa con un rutado cuidadoso; hay versiones de 60 y 80 patas (la B, con 48 GPIO), y trae memoria OTP y arranque seguro.'),
      Q('¿Qué componente nuevo exige el RP2350 frente al RP2040 en tu esquema?', ['Una bobina para su regulador conmutado interno', 'Un cristal de 48 MHz', 'Una flash interna', 'Un segundo conector USB'], 'Sigue al pie de la letra el diseño de referencia.'),
      Q('Para convertir tu placa en un producto, ¿qué más debes considerar?', ['Marcado CE y compatibilidad electromagnética, VID/PID propios y protección de la alimentación', 'Nada más', 'Solo el color de la placa', 'Solo el precio'], 'Un prototipo que funciona no es todavía un producto vendible.')
    ]),
    PRJ('rp-p15', 'Proyecto: termómetro a pilas de larga duración', 'rp_node'),
    PRJ('rp-p16', 'Proyecto: tu propia placa con RP2040', 'rp_ownboard'),
    PRJ('rp-p17', 'Proyecto final: consola retro VGA', 'rp_console')
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
      { id: 'rp-m1', title: 'La placa y el chip', desc: 'RP2040 y RP2350, la familia Pico, el pinout, la alimentación y el arranque por UF2.', nodes: M1 },
      { id: 'rp-m2', title: 'MicroPython desde cero', desc: 'Del C de Arduino a Python: REPL, tipos, bucles, funciones, pines, errores y ficheros.', nodes: M2 },
      { id: 'rp-m3', title: 'Periféricos en MicroPython', desc: 'PWM, ADC, sensor de temperatura, temporizadores, interrupciones, buses y asyncio.', nodes: M3 },
      { id: 'rp-m4', title: 'El SDK en C', desc: 'CMake y pico-sdk, GPIO, PWM por slices, relojes, interrupciones y depuración por SWD.', nodes: M4 },
      { id: 'rp-m5', title: 'PIO a fondo', desc: 'Las máquinas de estados que hacen único al RP2040: instrucciones, FIFOs, side-set y diseño de protocolos.', nodes: M5 },
      { id: 'rp-m6', title: 'DMA y los dos núcleos', desc: 'Mover datos sin la CPU, encadenar canales, repartir trabajo entre núcleos y evitar carreras.', nodes: M6 },
      { id: 'rp-m7', title: 'USB y conectividad', desc: 'TinyUSB: teclados, MIDI y puertos serie. Pico W: WiFi, servidor web y Bluetooth LE.', nodes: M7 },
      { id: 'rp-m8', title: 'Bajo consumo y producto', desc: 'Medir y reducir el consumo, calcular autonomías y diseñar tu propia placa con el RP2040.', nodes: M8 }
    ]
  });
})();
